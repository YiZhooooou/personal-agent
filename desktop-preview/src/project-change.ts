import fs from 'node:fs';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';import {spawnSync} from 'node:child_process';import type {TaskStore} from './task-store';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
function journal(file:string,value:any){const tmp=file+'.'+randomUUID()+'.tmp';const fd=fs.openSync(tmp,'wx');try{fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,file);}
function locate(store:TaskStore,id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid proposal ID');return path.join(store.root,'change-proposals',id+'.json');}
function event(p:any,operation:string){p.events??=[];p.events.push({operation,at:new Date().toISOString()});}
export function previewChange(store:TaskStore,taskId:string){
 const task=store.get(taskId);if(!task||task.status!=='succeeded')throw new Error('Choose a completed proposal task');
 const context=JSON.parse(String(task.context_json));if(!context.projectId)throw new Error('Proposal requires a project');
 const proposal=JSON.parse(String(task.result).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
 if(!proposal||typeof proposal.name!=='string'||typeof proposal.content!=='string'||proposal.content.includes('\0')||Buffer.byteLength(proposal.content)>12000)throw new Error('Expected JSON with name and content (up to 12 KB)');
 const before=store.readWorkspaceFile(context.projectId,proposal.name),workspace=store.workspace(context.projectId);
 const p={id:randomUUID(),projectId:context.projectId,root:workspace.root,name:before.name,before:before.text,after:proposal.content,expected:hash(before.text),taskId,state:'ready',applied:false,used:false,events:[]};event(p,'review-created');
 fs.mkdirSync(path.join(store.root,'change-proposals'),{recursive:true});journal(locate(store,p.id),p);return p;
}
export function listChanges(store:TaskStore,taskId:string){
 if(!store.get(taskId))throw new Error('Task not found');const dir=path.join(store.root,'change-proposals');if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir).filter(f=>/^[a-f0-9-]{36}\.json$/.test(f)).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))).filter(p=>p.taskId===taskId).sort((a,b)=>String(a.events?.[0]?.at||'').localeCompare(String(b.events?.[0]?.at||'')));
}
export function applyChange(store:TaskStore,id:string,undo=false){
 const file=locate(store,id),p=JSON.parse(fs.readFileSync(file,'utf8'));
 if(store.workspace(p.projectId).root!==p.root)throw new Error('Project folder changed');
 const current=store.readWorkspaceFile(p.projectId,p.name);
 // Reconcile a crash between atomic file replacement and the final journal write.
 if(p.state==='applying'||p.state==='reverting'){
  if(hash(current.text)===hash(p.after)){p.applied=true;p.used=true;p.state='applied';}
  else if(hash(current.text)===hash(p.before)){p.applied=false;p.state=p.state==='reverting'?'reverted':'ready';}
  else throw new Error('Interrupted operation conflicts with current file; inspect the retained backup');
  event(p,'recovered-'+p.state);journal(file,p);
 }
 if(undo?!p.applied:p.used)throw new Error(undo?'Proposal has not been applied':'Proposal already applied');
 if(hash(current.text)!==hash(undo?p.after:p.before))throw new Error('File changed since review; create a new proposal');
 const target=path.join(p.root,p.name),backup=path.join(path.dirname(file),id+'.backup');
 if(!undo){if(!fs.existsSync(backup))fs.copyFileSync(target,backup,fs.constants.COPYFILE_EXCL);else if(hash(new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(backup)))!==hash(p.before))throw new Error('Backup mismatch');}
 else if(!fs.existsSync(backup))throw new Error('Backup missing');
 p.state=undo?'reverting':'applying';event(p,p.state);journal(file,p);
 const stage=path.join(p.root,'.personal-agent-'+randomUUID()+'.tmp');
 try{
  fs.copyFileSync(undo?backup:target,stage,fs.constants.COPYFILE_EXCL);if(!undo)fs.writeFileSync(stage,p.after,'utf8');
  const fd=fs.openSync(stage,'r+');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  if(hash(store.readWorkspaceFile(p.projectId,p.name).text)!==hash(undo?p.after:p.before))throw new Error('File changed during apply');
  fs.renameSync(stage,target);
 }finally{if(fs.existsSync(stage))fs.unlinkSync(stage);}
 let check={status:'not-run',output:'Only JavaScript syntax checking is available.'};
 if(/\.(js|mjs|cjs)$/i.test(p.name)){
  const r=spawnSync(process.execPath,['--check',target],{env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP},windowsHide:true,encoding:'utf8',timeout:10000,maxBuffer:100000});
  check={status:r.status===0?'passed':'failed',output:String(r.stderr||r.error?.message||'').slice(0,4000)};
 }
 p.applied=!undo;p.used=true;p.state=undo?'reverted':'applied';p.check=check;event(p,p.state);journal(file,p);return p;
}
