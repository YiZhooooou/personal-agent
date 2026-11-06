import fs from 'node:fs';import path from 'node:path';
import {Codex,MODEL} from './codex';import {execute,acquireWorker} from './task-worker';
import {ASSISTANT_INSTRUCTIONS} from './job-assistant-context';
import {JobAssistantStore} from './job-assistant-store';
export function assistantError(value:unknown){
 const detail=String(value instanceof Error?value.message:value).replace(/https?:\/\/\S+|Bearer\s+\S+|sk-[A-Za-z0-9_-]+/gi,'[redacted]').slice(0,1200);
 if(/workspace routing|ENETUNREACH|ENOTFOUND|fetch failed|network|connection refused/i.test(detail))return 'Codex 连接未就绪，请在设置中检查连接后重新预览；原问题与部分回复已保留，无 API 回退 / Codex connection is unavailable; check Settings and preview again. '+detail;
 return detail;
}
export function assistantOwner(root:string){const owner=path.join(root,'job-assistant-owner');fs.mkdirSync(owner,{recursive:true});return owner;}
export async function recoverAssistant(root:string,store:JobAssistantStore){let release:(()=>void)|undefined;try{release=await acquireWorker(assistantOwner(root));}catch{return;}try{store.recover();}finally{release();}}
export async function runAssistant(root:string,id:string,customCodex='',onReady=()=>{},client?:Codex){
 const release=await acquireWorker(assistantOwner(root)),codex=client||new Codex(root);let initializing=true,store:JobAssistantStore|undefined,cancelPoll:NodeJS.Timeout|undefined;
 try{
  store=new JobAssistantStore(root);const owned=store;cancelPoll=setInterval(()=>{try{if(initializing&&owned.cancelled(id))codex.close();}catch{/* Startup failure is handled below. */}},250);
  const prepared=store.claim(id);onReady();if(!prepared)return;
  try{
   if(prepared.input.model!==MODEL||prepared.input.instructions!==ASSISTANT_INSTRUCTIONS)throw new Error('Assistant configuration changed; preview again');
   if(store.cancelled(id)){store.finish(id,'cancelled','','');return;}
   await codex.start(customCodex);const account=await codex.request('account/read',{refreshToken:false});
   if(account.account?.type!=='chatgpt')throw new Error('请在设置中使用 ChatGPT 登录；不回退付费 API / Sign in with ChatGPT in Settings; no API fallback');
   initializing=false;if(store.cancelled(id)){store.finish(id,'cancelled','','');return;}
   const result=await execute(codex,root,JSON.stringify(prepared.input),{instructions:prepared.input.instructions,isCancelled:()=>owned.cancelled(id),onProgress:text=>owned.progress(id,text)});
   store.finish(id,result.status==='succeeded'?'completed':result.status,result.result,assistantError(result.error));
  }catch(error){store.finish(id,store.cancelled(id)?'cancelled':'failed',store.preview(id).turn.output,assistantError(error));}
 }finally{clearInterval(cancelPoll);codex.close();try{store?.close();}finally{release();}}
}
