import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store,outbound} from '../src/store';
import {Codex,cleanEnvironment,launchArgs} from '../src/codex';

function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'pa-unit-'));return {root,store:new Store(root)};}
test('drafts and language survive restart; in-flight responses become interrupted',()=>{
 const {root,store}=fixture();const c=store.chat(store.state.active!);c.draft='中文未完成';c.messages.push({id:'a',role:'assistant',text:'partial',status:'streaming'});store.state.language='en';store.save();
 const next=new Store(root);assert.equal(next.state.language,'en');assert.equal(next.chat(c.id).draft,'中文未完成');assert.equal(next.chat(c.id).messages[0].status,'interrupted');
});
test('Work context is rejected and chats cannot cross space boundaries',()=>{
 const {store}=fixture();const original=store.state.active!;store.state.space='work';const work=store.newChat();
 assert.throws(()=>outbound(work,'secret'),/Work/);assert.throws(()=>store.chat(original),/current space/);
 store.state.space='personal';store.ensureActive();assert.equal(store.state.active,original);
});
test('outbound contains only selected chat completed messages within budget',()=>{
 const {store}=fixture();const c=store.chat(store.state.active!);
 c.messages=[{id:'1',role:'user',text:'prior',status:'completed'},{id:'2',role:'assistant',text:'FAILURE_SECRET',status:'failed'}];
 const payload=JSON.parse(outbound(c,'new'));assert.equal(payload.context.length,1);assert.equal(payload.context[0].text,'prior');assert.equal(payload.userMessage,'new');
 for(let i=0;i<25;i++)c.messages.push({id:String(i+3),role:'user',text:'x'.repeat(2000),status:'completed'});
 assert.equal(JSON.parse(outbound(c,'new')).context.length,10);
 assert.throws(()=>outbound(c,'x'.repeat(16001)),/16,000/);
});
test('invalid persisted data fails without overwriting the file',()=>{
 const {root}=fixture();const p=path.join(root,'preview-state.json');fs.writeFileSync(p,'broken');assert.throws(()=>new Store(root));assert.equal(fs.readFileSync(p,'utf8'),'broken');
});
test('child environment excludes inherited API credentials, Codex session and proxies',()=>{
 const env=cleanEnvironment('C:/test',{PATH:'C:/bin',OPENAI_API_KEY:'secret',CODEX_HOME:'other',CODEX_ACCESS_TOKEN:'secret',HTTP_PROXY:'secret',NODE_OPTIONS:'--inspect'});
 assert.equal(env.OPENAI_API_KEY,undefined);assert.equal(env.CODEX_ACCESS_TOKEN,undefined);assert.equal(env.HTTP_PROXY,undefined);assert.equal(env.NODE_OPTIONS,undefined);assert.equal(env.PATH,'C:/bin');assert.match(env.CODEX_HOME!,/codex-home$/);
 const args=launchArgs().join(' ');assert.match(args,/forced_login_method="chatgpt"/);assert.match(args,/features.shell_tool=false/);assert.match(args,/features.plugins=false/);
});
test('JSON-RPC correlates fragmented replies and refuses execution approval',async()=>{
 const c=new Codex('unused');const writes:any[]=[];
 c.child={stdin:{destroyed:false,write:(line:string)=>writes.push(JSON.parse(line))}} as any;
 const promise=c.request('account/read');const id=writes[0].id;
 c.consume('{"id":'+id+',"res');c.consume('ult":{"account":null}}\n');assert.deepEqual(await promise,{account:null});
 c.consume('{"id":88,"method":"item/commandExecution/requestApproval","params":{}}\n');assert.equal(writes.at(-1).result.decision,'decline');
 c.consume('{"id":89,"method":"unknown/tool","params":{}}\n');assert.equal(writes.at(-1).error.code,-32601);
 c.child=null;
});
test('RPC timeout rejects and does not hang',async()=>{
 const c=new Codex('unused');c.child={stdin:{destroyed:false,write:()=>{}}} as any;
 await assert.rejects(c.request('test',{},20),/timed out/);c.child=null;
});
