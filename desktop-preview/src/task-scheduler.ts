import {randomUUID} from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import {TaskStore} from './task-store';import {acquireWorker} from './task-worker';
function control(root:string){return path.join(root,'scheduler-control.json');}
function write(root:string,value:object){const file=control(root),tmp=file+'.'+randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value));fs.renameSync(tmp,file);}
export function stopScheduler(root:string){fs.writeFileSync(path.join(root,'scheduler-stop'),'stop');return schedulerStatus(root);}
export function schedulerStatus(root:string){
 const file=control(root);if(!fs.existsSync(file))return {enabled:false,running:false,state:'stopped'};
 let value:any;try{value=JSON.parse(fs.readFileSync(file,'utf8'));}catch{return {enabled:false,running:false,state:'interrupted',error:'Scheduler status is unreadable; inspect or restart the supervisor.'};}
 const stopping=fs.existsSync(path.join(root,'scheduler-stop'));
 const fresh=Date.now()-Number(value.heartbeat)<20000;
 return {...value,enabled:!stopping&&value.enabled===true,running:!stopping&&value.enabled===true&&fresh,state:!value.enabled?'stopped':stopping?'stopping':fresh?'running':'interrupted'};
}
export async function watchSchedules(root:string,onReady=()=>{},intervalMs=5000){
 const lock=path.join(root,'scheduler-owner');fs.mkdirSync(lock,{recursive:true});let release:(()=>void)|undefined;
 for(let attempt=0;!release;attempt++){
  try{release=await acquireWorker(lock);}catch(e){if(schedulerStatus(root).running){onReady();return;}if(attempt>=24)throw e;await new Promise(r=>setTimeout(r,250));}
 }
 const store=new TaskStore(root),startedAt=new Date().toISOString();
 try{
  const stop=path.join(root,'scheduler-stop');if(fs.existsSync(stop))fs.unlinkSync(stop);
  write(root,{enabled:true,heartbeat:Date.now(),startedAt,pid:process.pid,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,error:''});onReady();
  while(schedulerStatus(root).enabled){
   let error='',queued=0;
   try{queued=store.tickSchedules().length;}catch(e){error=(e as Error).message;}
   if(!schedulerStatus(root).enabled)break;
   write(root,{enabled:true,heartbeat:Date.now(),startedAt,pid:process.pid,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,lastCheck:new Date().toISOString(),queuedLastCheck:queued,error});
   await new Promise(r=>setTimeout(r,intervalMs));
  }
 }finally{store.close();try{write(root,{enabled:false,heartbeat:Date.now(),startedAt,stoppedAt:new Date().toISOString()});}finally{release();}}
}
