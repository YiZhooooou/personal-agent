import {spawn,execFileSync,type ChildProcessWithoutNullStreams} from 'node:child_process';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
export const VERSION='0.4.0-preview.2';
export const MODEL='gpt-6-astra';
export function cleanEnvironment(root:string,source:NodeJS.ProcessEnv=process.env){
 const env:NodeJS.ProcessEnv={};
 for(const key of ['SystemRoot','WINDIR','PATH','PATHEXT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','LANG'])if(source[key])env[key]=source[key];
 // Dedicated Codex-owned login store; never copy the desktop app's credentials.
 env.CODEX_HOME=path.join(root,'codex-home');
 return env;
}
export function discoverCodex(custom=''){
 const candidates:string[]=[];
 if(custom)candidates.push(custom);
 for(const dir of (process.env.PATH||'').split(path.delimiter))candidates.push(path.join(dir,'codex.exe'));
 const base=path.join(process.env.LOCALAPPDATA||'','OpenAI','Codex','bin');
 if(fs.existsSync(base))for(const d of fs.readdirSync(base).sort().reverse())candidates.push(path.join(base,d,'codex.exe'));
 return candidates.find(p=>path.isAbsolute(p)&&fs.existsSync(p)&&p.toLowerCase().endsWith('.exe'))||'';
}
const disabled=['shell_tool','unified_exec','code_mode_host','apps','plugins','browser_use','browser_use_external','computer_use','in_app_browser','image_generation','multi_agent','multi_agent_v2','memories','hooks','goals','skill_search','skill_mcp_dependency_install','tool_suggest'];
export function launchArgs(){
 const overrides=['forced_login_method="chatgpt"','model_provider="openai"','web_search="disabled"','sandbox_mode="read-only"','approval_policy="on-request"','project_doc_max_bytes=0','analytics.enabled=false','apps._default.enabled=false',...disabled.map(k=>`features.${k}=false`),'features.code_mode.enabled=false'];
 return ['app-server','--listen','stdio://',...overrides.flatMap(v=>['-c',v])];
}
export class Codex extends EventEmitter {
 child:ChildProcessWithoutNullStreams|null=null;
 private pending=new Map<number,{resolve:(r:any)=>void;reject:(e:Error)=>void;timer:NodeJS.Timeout}>();
 private seq=0;private buffer='';private ready:Promise<string>|null=null;
 constructor(public root:string){super();}
 async start(custom=''):Promise<string>{
  if(this.ready)return this.ready;
  this.ready=this.boot(custom).catch(e=>{this.close();throw e;});return this.ready;
 }
 private async boot(custom:string){
  const executable=discoverCodex(custom);if(!executable)throw new Error('Codex not found. Choose codex.exe in Settings.');
  const env=cleanEnvironment(this.root);fs.mkdirSync(env.CODEX_HOME!,{recursive:true});
  const cwd=path.join(this.root,'empty-workspace');fs.mkdirSync(cwd,{recursive:true});
  const version=execFileSync(executable,['--version'],{env,cwd,windowsHide:true,encoding:'utf8',timeout:10000}).trim();
  const proc=spawn(executable,launchArgs(),{env,cwd,windowsHide:true,stdio:'pipe'});this.child=proc;
  proc.stdout.setEncoding('utf8');proc.stdout.on('data',(s:string)=>this.consume(s));
  // Drain diagnostics without writing authentication URLs/tokens to logs.
  let startupError='';
  proc.stderr.on('data',chunk=>{if(this.pending.size&&startupError.length<2000){const lines=String(chunk).split('\n').filter(s=>/error|invalid|unknown|failed/i.test(s)&&!/(token|authorization|https?:|sk-)/i.test(s));startupError+=lines.join('\n').slice(0,1500);}});
  proc.on('error',e=>this.fail(e));
  proc.on('exit',()=>{if(this.child===proc){this.child=null;this.ready=null;this.fail(new Error(startupError||'Codex disconnected. Reconnect in Settings.'));}});
  await this.request('initialize',{clientInfo:{name:'personal_agent_preview',title:'Personal Agent Preview',version:VERSION}});
  this.write({method:'initialized',params:{}});return version;
 }
 private write(value:any){if(!this.child||this.child.stdin.destroyed)throw new Error('Codex is not connected');this.child.stdin.write(JSON.stringify(value)+'\n');}
 request(method:string,params:any={},timeout=20000):Promise<any>{
  return new Promise((resolve,reject)=>{const id=++this.seq;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`Codex request timed out: ${method}`));},timeout);this.pending.set(id,{resolve,reject,timer});try{this.write({method,params,id});}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}});
 }
 consume(chunk:string){
  this.buffer+=chunk;if(this.buffer.length>8_000_000){this.fail(new Error('Codex message exceeds safe size'));this.close();return;}
  let i:number;
  while((i=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,i);this.buffer=this.buffer.slice(i+1);if(!line.trim())continue;
   let m:any;try{m=JSON.parse(line);}catch{this.fail(new Error('Invalid Codex protocol message'));this.close();return;}
   if(m.method&&m.id!==undefined){
    // This checkpoint never approves execution, files, permissions or tool calls.
    if(m.method==='item/commandExecution/requestApproval'||m.method==='item/fileChange/requestApproval')this.write({id:m.id,result:{decision:'decline'}});
    else this.write({id:m.id,error:{code:-32601,message:'Tools and permission grants are disabled in this preview'}});
    this.emit('blocked',m.method);continue;
   }
   if(m.id!==undefined){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(new Error(String(m.error.message||'Codex request failed').slice(0,2000))):p.resolve(m.result);}continue;}
   if(m.method)this.emit('notification',m.method,m.params||{});
  }
 }
 private fail(e:Error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(e);}this.pending.clear();this.emit('disconnected',e.message);}
 close(){const p=this.child;this.child=null;this.ready=null;this.buffer='';if(p){p.stdin.end();p.kill();}this.fail(new Error('Codex stopped'));}
}
