import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {acquireWorker} from './task-worker';
import {JobRecordsStore} from './job-records';
export interface BriefWorkerStatus{state:'running'|'stopping'|'stopped'|'interrupted';heartbeat?:number;lastCheck?:string;result?:string;error?:string;pid?:number;}
const file=(root:string,name:string)=>path.join(root,'brief-worker-'+name);
export async function writeBriefWorkerStatus(root:string,value:BriefWorkerStatus,rename:(from:string,to:string)=>void=fs.renameSync){
 const target=file(root,'status.json'),tmp=target+'.'+randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value));
 try{for(let attempt=0;;attempt++){try{rename(tmp,target);return;}catch(error){if(!['EPERM','EACCES','EBUSY'].includes((error as NodeJS.ErrnoException).code||'')||attempt>=20)throw error;await new Promise(resolve=>setTimeout(resolve,25));}}}
 finally{fs.rmSync(tmp,{force:true});}
}

export function briefWorkerStatus(root:string):BriefWorkerStatus{
 if(!fs.existsSync(file(root,'status.json')))return {state:'stopped'};
 try{const value=JSON.parse(fs.readFileSync(file(root,'status.json'),'utf8')) as BriefWorkerStatus;
  if(!value||[value.lastCheck,value.result,value.error].some(field=>field!==undefined&&typeof field!=='string')||!['running','stopped'].includes(value.state)||!Number.isSafeInteger(value.heartbeat)||(value.state==='running'&&(!Number.isSafeInteger(value.pid)||Number(value.pid)<=0)))return {state:'interrupted',error:'Background status is invalid; restart the worker.'};
  if(value.state==='stopped')return value;
  const age=Date.now()-Number(value.heartbeat);
  if(!Number.isFinite(age)||age<0||age>=20000)return {...value,state:'interrupted'};
  return {...value,state:fs.existsSync(file(root,'stop'))?'stopping':'running'};
 }catch{return {state:'interrupted',error:'Background status is unreadable.'};}
}
export async function readBriefWorkerStatus(root:string){
 let status=briefWorkerStatus(root);
 for(let attempt=0;attempt<4&&status.error==='Background status is unreadable.';attempt++){await new Promise(resolve=>setTimeout(resolve,25));status=briefWorkerStatus(root);}
 return status;
}
export function stopBriefWorker(root:string){fs.mkdirSync(root,{recursive:true});fs.writeFileSync(file(root,'stop'),'stop');return briefWorkerStatus(root);}
export async function watchBriefs(root:string,onReady=()=>{},intervalMs=5000){
 const owner=file(root,'owner');fs.mkdirSync(owner,{recursive:true});let release:(()=>void)|undefined;
 for(let attempt=0;!release;attempt++){
  try{release=await acquireWorker(owner);}catch(e){if(briefWorkerStatus(root).state==='running'){onReady();return;}if(attempt>=24)throw e;await new Promise(r=>setTimeout(r,250));}
 }
 let store:JobRecordsStore|undefined;
 try{
  store=new JobRecordsStore(root);fs.rmSync(file(root,'stop'),{force:true});
  await writeBriefWorkerStatus(root,{state:'running',heartbeat:Date.now(),pid:process.pid});onReady();
  while(!fs.existsSync(file(root,'stop'))){
   let result='',error='';try{result=store.briefing({operation:'check'}).status;}catch(e){error=(e as Error).message;}
   await writeBriefWorkerStatus(root,{state:'running',heartbeat:Date.now(),pid:process.pid,lastCheck:new Date().toISOString(),result,error});
   await new Promise(r=>setTimeout(r,intervalMs));
  }
 }finally{try{store?.close();await writeBriefWorkerStatus(root,{state:'stopped',heartbeat:Date.now()});}finally{release();}}
}
