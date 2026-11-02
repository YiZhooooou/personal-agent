import path from 'node:path';
import {previewChange,applyChange,listChanges} from './project-change';
import {memoryCall,memoryContext} from './project-memory';
import fs from 'node:fs';
import {TaskStore} from './task-store';
import {runTasks,acquireWorker} from './task-worker';

async function main(){
 const [command,root,arg,key,projectId]=process.argv.slice(2);
 if(!root||!path.isAbsolute(root)||!['project','submit','submit-master','list','show','run','cancel'].includes(command))throw new Error('Usage: tasks <submit|submit-master|list|show|run|cancel> <absolute data directory> [prompt or task ID] [request key]');
 const store=new TaskStore(root);
 try{
  if(command==='submit'||command==='submit-master')console.log(JSON.stringify(store.submit(arg==='-'?fs.readFileSync(0,'utf8'):arg||'',key||'',command==='submit-master'?'master':'text',projectId||''),null,2));
  if(command==='project'){const r=JSON.parse(fs.readFileSync(0,'utf8'));if(r.operation==='memory'){store.projectContext(r.id);console.log(JSON.stringify(memoryCall(root,{operation:r.action,project:r.id,title:r.title,text:r.text,entity:r.entity,status:r.status,revision:r.revision})));return;}const value=r.operation==='change-list'?listChanges(store,r.taskId):r.operation==='change-preview'?previewChange(store,r.taskId):r.operation==='change-apply'?applyChange(store,r.proposalId):r.operation==='change-undo'?applyChange(store,r.proposalId,true):r.operation==='workspace-read'?store.readWorkspaceFile(r.id,r.name):r.operation==='workspace-clear'?store.clearWorkspace(r.id):r.operation==='workspace-set'?store.setWorkspace(r.id,r.folder):r.operation==='workspace'?store.workspace(r.id):r.operation==='schedules'?store.schedules(r.id):r.operation==='schedule-create'?store.addSchedule(r.id,r.text,r.at):r.operation==='schedule-enable'?(store.enableSchedule(r.scheduleId,r.enabled),true):r.operation==='input'?{...store.projectContext(r.id),memories:memoryContext(root,r.id,r.text)}:r.operation==='history'?store.history(r.id):r.operation==='restore'?store.restoreHandoff(r.id,r.target,r.revision):r.operation==='adopt'?store.adoptTask(r.taskId):r.operation==='list'?store.projects():r.operation==='create'?store.createProject(r.name):r.operation==='save'?store.saveHandoff(r.id,r.text,r.revision):r.operation==='get'?store.projectContext(r.id):null;if(value===null)throw new Error('Invalid project operation');console.log(JSON.stringify(value));}
  if(command==='list'){
   store.tickSchedules();
   let release:(()=>void)|undefined;
   try{release=await acquireWorker(root);}catch{/* A live worker owns the state, or ownership cannot be verified. */}
   if(release){try{store.recover();}finally{release();}}
   console.log(JSON.stringify(store.list(),null,2));
  }
  if(command==='show'){const task=store.get(arg||'');if(!task)throw new Error('Task not found');console.log(JSON.stringify({...task,steps:store.steps(String(task.id))},null,2));}
  if(command==='cancel')console.log(JSON.stringify(store.cancel(arg||''),null,2));
  if(command==='run'){await runTasks(store,root,arg||'',()=>{if(process.send)process.send({ready:true});},key||'');console.log(JSON.stringify(store.list(),null,2));}
 }finally{store.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
