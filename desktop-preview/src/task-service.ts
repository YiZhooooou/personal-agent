import {execFile,spawn} from 'node:child_process';
import path from 'node:path';
import type {Space} from './shared';
export function requirePersonal(space:Space){if(space!=='personal')throw new Error('Background tasks are available only in Personal space.');}
export class TaskService {
 constructor(private root:string,private script:string){}
 call(command:string,args:string[]=[],input?:string):Promise<any>{
  return new Promise((resolve,reject)=>{
   const child=execFile('node.exe',[this.script,command,this.root,...args],{windowsHide:true,timeout:15000,maxBuffer:8*1024*1024},(error,stdout,stderr)=>{
    if(error){reject(new Error(stderr.trim()||error.message));return;}
    try{resolve(JSON.parse(stdout));}catch{reject(new Error('Invalid task service response'));}
   });child.stdin?.end(input);
  });
 }
 run(customCodex:string):Promise<boolean>{return new Promise((resolve,reject)=>{
  const child=spawn('node.exe',[this.script,'run',this.root,customCodex],{cwd:path.dirname(this.script),windowsHide:true,detached:true,stdio:['ignore','ignore','pipe','ipc']});
  let diagnostics='',settled=false;
  const timer=setTimeout(()=>finish(new Error('Worker startup timed out')),35000);
  function finish(error?:Error){if(settled)return;settled=true;clearTimeout(timer);if(error){child.kill();reject(error);}else{child.stderr?.destroy();child.disconnect();child.unref();resolve(true);}}
  child.stderr?.on('data',b=>{diagnostics=(diagnostics+b).slice(-2000);});
  child.on('message',m=>{if((m as {ready?:boolean})?.ready)finish();});
  child.once('error',e=>finish(e));child.once('exit',code=>{if(!settled)finish(new Error(diagnostics||`Worker exited before startup (${code})`));});
 });}
}
