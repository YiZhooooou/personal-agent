import path from 'node:path';
import fs from 'node:fs';
import {TaskStore} from './task-store';
import {runTasks,acquireWorker} from './task-worker';

async function main(){
 const [command,root,arg,key]=process.argv.slice(2);
 if(!root||!path.isAbsolute(root)||!['submit','submit-master','list','show','run','cancel'].includes(command))throw new Error('Usage: tasks <submit|submit-master|list|show|run|cancel> <absolute data directory> [prompt or task ID] [request key]');
 const store=new TaskStore(root);
 try{
  if(command==='submit'||command==='submit-master')console.log(JSON.stringify(store.submit(arg==='-'?fs.readFileSync(0,'utf8'):arg||'',key||'',command==='submit-master'?'master':'text'),null,2));
  if(command==='list'){
   let release:(()=>void)|undefined;
   try{release=await acquireWorker(root);}catch{/* A live worker owns the state, or ownership cannot be verified. */}
   if(release){try{store.recover();}finally{release();}}
   console.log(JSON.stringify(store.list(),null,2));
  }
  if(command==='show'){const task=store.get(arg||'');if(!task)throw new Error('Task not found');console.log(JSON.stringify({...task,steps:store.steps(String(task.id))},null,2));}
  if(command==='cancel')console.log(JSON.stringify(store.cancel(arg||''),null,2));
  if(command==='run'){await runTasks(store,root,arg||'',()=>{if(process.send)process.send({ready:true});});console.log(JSON.stringify(store.list(),null,2));}
 }finally{store.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
