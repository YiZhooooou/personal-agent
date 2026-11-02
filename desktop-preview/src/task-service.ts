import {execFile,spawn} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import type {Space} from './shared';
export function taskServiceError(diagnostics:string,fallback:string){
 const detail=diagnostics.split('\n').filter(line=>!line.includes('ExperimentalWarning: SQLite')&&!line.includes('Use `node --trace-warnings')).join('\n').trim();
 if(/database is locked/i.test(detail))return '数据库正忙，请稍后重试。Database is busy; please retry.';
 if(/Worker ownership unavailable/i.test(detail))return '已有后台队列正在执行，请稍后再运行。A queue worker is already active.';
 return detail||fallback;
}
export function requirePersonal(space:Space){if(space!=='personal')throw new Error('Background tasks are available only in Personal space.');}
export class TaskService {
 constructor(private root:string,private script:string,private requireBundled=false){}
 runtime(){const bundled=path.join(path.dirname(this.script),'node.exe');if(fs.existsSync(bundled))return bundled;if(this.requireBundled)throw new Error('Bundled task runtime is missing; reinstall the complete app directory.');return 'node.exe';}
 call(command:string,args:string[]=[],input?:string):Promise<any>{
  return new Promise((resolve,reject)=>{
   const child=execFile(this.runtime(),[this.script,command,this.root,...args],{windowsHide:true,timeout:15000,maxBuffer:8*1024*1024},(error,stdout,stderr)=>{
    if(error){reject(new Error(taskServiceError(stderr,error.message)));return;}
    try{resolve(JSON.parse(stdout));}catch{reject(new Error('Invalid task service response'));}
   });child.stdin?.end(input);
  });
 }
 run(customCodex:string,projectId='',command='run'):Promise<boolean>{return new Promise((resolve,reject)=>{
  const child=spawn(this.runtime(),[this.script,command,this.root,customCodex,projectId],{cwd:path.dirname(this.script),windowsHide:true,detached:true,stdio:['ignore','ignore','pipe','ipc']});
  let diagnostics='',settled=false;
  const timer=setTimeout(()=>finish(new Error('Worker startup timed out')),35000);
  function finish(error?:Error){if(settled)return;settled=true;clearTimeout(timer);if(error){child.kill();reject(error);}else{child.stderr?.destroy();child.disconnect();child.unref();resolve(true);}}
  child.stderr?.on('data',b=>{diagnostics=(diagnostics+b).slice(-2000);});
  child.on('message',m=>{if((m as {ready?:boolean})?.ready)finish();});
  child.once('error',e=>finish(e));child.once('exit',code=>{if(!settled)finish(new Error(taskServiceError(diagnostics,`Worker exited before startup (${code})`)));});
 });}
}
