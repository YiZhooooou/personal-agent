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

import {JobDemoStore} from '../src/job-demo';
test('job demo persists independent records and binds messages to the selected job without rewriting history',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'job-demo-'));fs.writeFileSync(path.join(root,'preview-state.json'),'legacy sentinel');const demo=new JobDemoStore(root);demo.request({operation:'message',text:'下一步？'});demo.request({operation:'select',id:'harbor'});demo.request({operation:'stage',id:'harbor',stage:'interview'});demo.request({operation:'todo',id:'t2',done:true});demo.request({operation:'message',text:'准备面试'});const state=new JobDemoStore(root).request({operation:'get'});
 assert.equal(state.selectedId,'harbor');assert.equal(state.jobs.find(j=>j.id==='harbor')!.stage,'interview');assert.equal(state.todos.find(t=>t.id==='t2')!.done,true);const sent=state.messages.filter(m=>m.role==='user');assert.equal(sent[0].context!.job!.id,'northstar');assert.equal(sent[1].context!.job!.id,'harbor');assert.equal(sent[1].context!.job!.history.length,1);assert.match(state.messages.at(-1)!.text,/非 AI 回复/);assert.equal(fs.readFileSync(path.join(root,'preview-state.json'),'utf8'),'legacy sentinel');
 const copy=demo.request({operation:'get'});copy.jobs[0].stage='closed';assert.equal(demo.request({operation:'get'}).jobs[0].stage,'interview');
});
test('invalid demo writes and damaged demo data do not overwrite saved records',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'job-demo-invalid-')),demo=new JobDemoStore(root);demo.request({operation:'select',id:'harbor'});const file=path.join(root,'job-demo.json'),before=fs.readFileSync(file,'utf8');
 for(const input of [{operation:'stage',id:'harbor',stage:'submitted-by-bot'},{operation:'todo',id:'t2',done:'yes'},{operation:'message',text:' '},{operation:'select',id:'unknown'},{operation:'reset'}])assert.throws(()=>demo.request(input));assert.equal(fs.readFileSync(file,'utf8'),before);fs.writeFileSync(file,'broken');assert.throws(()=>new JobDemoStore(root));assert.equal(fs.readFileSync(file,'utf8'),'broken');
});
