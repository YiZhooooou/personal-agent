import fs from 'node:fs';
import {attachProject} from './project-input';
import type {EventEmitter} from 'node:events';
import path from 'node:path';
import {TaskStore} from './task-store';
import {executeMaster} from './task-master';
import {Codex,MODEL} from './codex';
import net from 'node:net';
import {createHash} from 'node:crypto';

export async function acquireWorker(root:string):Promise<()=>void>{
 // The OS releases a named pipe after a crash; no stale lock file can race a new worker.
 if(process.platform!=='win32')throw new Error('This task worker currently supports Windows only.');
 const id=createHash('sha256').update(fs.realpathSync(root).toLowerCase()).digest('hex');
 const server=net.createServer(socket=>socket.destroy());
 return new Promise((resolve,reject)=>{
  server.once('error',e=>reject(new Error(`Worker ownership unavailable: ${e.message}`)));
  server.listen('\\\\.\\pipe\\personal-agent-task-'+id,()=>resolve(()=>{server.close();}));
 });
}

type ExecutionResult={status:'succeeded'|'failed'|'interrupted'|'cancelled';result:string;error:string;stopWorker?:boolean};
type ExecutionHooks={isCancelled:()=>boolean;onProgress:(text:string)=>void;pollMs?:number;limitMs?:number;cancelGraceMs?:number};
export async function execute(c:Pick<Codex,'request'|'close'> & Pick<EventEmitter,'on'|'off'>,root:string,prompt:string,hooks:ExecutionHooks):Promise<ExecutionResult>{
 if(hooks.isCancelled())return {status:'cancelled',result:'',error:''};
 const started=await c.request('thread/start',{model:MODEL,modelProvider:'openai',cwd:path.join(root,'empty-workspace'),ephemeral:true,approvalPolicy:'on-request',sandbox:'read-only',baseInstructions:'Complete the supplied text task. No tools or external actions are available. Do not claim to have performed actions.',config:{project_doc_max_bytes:0,web_search:'disabled'}});
 if(hooks.isCancelled())return {status:'cancelled',result:'',error:''};
 return new Promise(resolve=>{
  let result='',turnId='',cancelSent=false,settled=false,lastSaved='',lastSave=0;
  let grace:NodeJS.Timeout|undefined;
  const cleanup=()=>{clearTimeout(timer);clearTimeout(grace);clearInterval(poll);c.off('notification',notification);c.off('disconnected',disconnected);};
  const finish=(status:ExecutionResult['status'],error='',stopWorker=false)=>{
   if(settled)return;settled=true;cleanup();
   resolve({status,result,error,stopWorker});if(stopWorker)c.close();
  };
  const fail=(error:Error)=>finish('interrupted',error.message,true);
  const cancel=()=>{
   if(settled||cancelSent||!turnId||!hooks.isCancelled())return;
   cancelSent=true;
   grace=setTimeout(()=>finish('cancelled','Stopped the local execution process after cancellation timeout.',true),hooks.cancelGraceMs??10000);
   c.request('turn/interrupt',{threadId:started.thread.id,turnId}).catch(e=>finish('interrupted','Cancellation could not be confirmed: '+e.message,true));
  };
  const disconnected=(message:string)=>finish('interrupted',message,true);
  const notification=(method:string,p:any)=>{
   if(p.threadId!==started.thread.id)return;
   if(method==='turn/started'){turnId=p.turn.id;try{cancel();}catch(e){fail(e as Error);}}
   if(method==='item/agentMessage/delta')result+=p.delta;
   if(method==='turn/completed'){
    if(!result)result=(p.turn.items||[]).filter((i:any)=>i.type==='agentMessage').map((i:any)=>i.text||'').join('\n');
    // A completed response wins a late cancellation request; do not mislabel it as cancelled.
    finish(p.turn.status==='completed'?'succeeded':p.turn.status==='interrupted'?(cancelSent?'cancelled':'interrupted'):'failed',p.turn.error?.message||'');
   }
  };
  const timer=setTimeout(()=>finish('interrupted','Task exceeded execution time limit; partial output preserved.',true),hooks.limitMs??180000);
  const poll=setInterval(()=>{try{
   if(result!==lastSaved&&Date.now()-lastSave>=1000){hooks.onProgress(result);lastSaved=result;lastSave=Date.now();}
   cancel();
  }catch(e){fail(e as Error);}},hooks.pollMs??250);
  c.on('notification',notification);c.on('disconnected',disconnected);
  c.request('turn/start',{threadId:started.thread.id,input:[{type:'text',text:prompt}],model:MODEL,effort:'low',sandboxPolicy:{type:'readOnly',networkAccess:false}},30000).then(r=>{if(!settled){turnId=r.turn.id;cancel();}}).catch(fail);
 });
}

export async function runTasks(store:TaskStore,root:string,customCodex='',onReady=()=>{},projectId=''){
 let unlock:(()=>void)|undefined;
 for(let attempt=0;!unlock;attempt++){
  try{unlock=await acquireWorker(root);}catch(e){if(attempt>=4)throw e;await new Promise(r=>setTimeout(r,100));}
 }
 const c=new Codex(root);
 try{
  store.recover();
  await c.start(customCodex);
  const account=await c.request('account/read',{refreshToken:false});
  if(account.account?.type!=='chatgpt')throw new Error('Sign in to this data directory with the desktop test first. Queued tasks were preserved.');
  onReady();
  for(let task=store.claim(projectId);task;task=store.claim(projectId)){
   try{
    const id=String(task.id);
    const context=JSON.parse(String(task.context_json||'{}'));
    const goal=attachProject(String(task.prompt),context.projectId?context:null);
    const run=(prompt:string,onProgress:(text:string)=>void)=>execute(c,root,prompt,{isCancelled:()=>store.cancellationRequested(id),onProgress});
    const r=task.kind==='master'?await executeMaster(store,id,goal,run):await run(goal,text=>store.progress(id,text));
    store.finish(id,r.status,r.result,r.error);if(r.stopWorker)break;
   }
   catch(e){const id=String(task.id);store.finish(id,'interrupted',String(store.get(id)?.result||''),String((e as Error).message));throw e;}
  }
 }finally{c.close();unlock();}
}
