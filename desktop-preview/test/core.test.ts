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

import {visibleJobs} from '../src/job-view';
import {seedDemo} from '../src/job-demo';
test('large job list keeps action filtering separate from stage and searches archived records',()=>{
 const seed=seedDemo(),jobs=Array.from({length:120},(_,i)=>({...seed.jobs[i%3],id:'scale-'+i,company:'Company '+String(i).padStart(3,'0'),stage:i<100?'closed' as const:'applied' as const}));const todos=[{...seed.todos[0],jobId:'scale-101',done:false},{...seed.todos[1],jobId:'scale-5',done:false}];
 assert.equal(visibleJobs(jobs,todos,'','all','all','company').length,120);assert.deepEqual(visibleJobs(jobs,todos,'','all','action','action').map(j=>j.id),['scale-101']);assert.equal(visibleJobs(jobs,todos,'company 005','closed','all','company')[0].id,'scale-5');assert.equal(visibleJobs(jobs,todos,'missing','all','all','stage').length,0);assert.equal(jobs[0].id,'scale-0');
});

import {JobProfileStore,emptyProfile} from '../src/job-profile';
test('job profile saves independently, detects stale revisions and preserves rejected input on disk',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'profile-test-')),store=new JobProfileStore(root);fs.writeFileSync(path.join(root,'job-demo.json'),'untouched');assert.equal(store.request({operation:'get'}).revision,0);assert.equal(fs.existsSync(path.join(root,'job-profile.json')),false);const fields={...emptyProfile().fields,targetRoles:'Frontend Engineer',mustHave:'Remote',resumeText:'Synthetic resume only'};const first=store.request({operation:'save',revision:0,confirmed:true,fields});assert.equal(first.revision,1);assert.equal(new JobProfileStore(root).request({operation:'get'}).fields.mustHave,'Remote');assert.throws(()=>store.request({operation:'save',revision:0,confirmed:true,fields}),/已有更新/);assert.equal(fs.readFileSync(path.join(root,'job-demo.json'),'utf8'),'untouched');assert.equal(store.request({operation:'get'}).revision,1);
 const before=fs.readFileSync(path.join(root,'job-profile.json'),'utf8');for(const invalid of [{...fields,resumeText:'x'.repeat(16001)},{...fields,preferences:'refresh_token: synthetic-token'},{...fields,unexpected:'x'}])assert.throws(()=>store.request({operation:'save',revision:1,confirmed:true,fields:invalid}));assert.equal(fs.readFileSync(path.join(root,'job-profile.json'),'utf8'),before);
});
test('profile confirmation controls future context; prior message snapshots and original stage evidence survive',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'profile-context-')),profiles=new JobProfileStore(root),demo=new JobDemoStore(root,()=>profiles.request({operation:'get'}));let fields={...emptyProfile().fields,targetRoles:'Backend Engineer',resumeText:'Synthetic A'};profiles.request({operation:'save',revision:0,confirmed:false,fields});demo.request({operation:'message',text:'next'});assert.equal(demo.request({operation:'get'}).messages.at(-2)!.context!.profile!.fields,undefined);profiles.request({operation:'save',revision:1,confirmed:true,fields});demo.request({operation:'message',text:'next'});fields={...fields,targetRoles:'Frontend Engineer',resumeText:'Synthetic B'};profiles.request({operation:'save',revision:2,confirmed:true,fields});const prior=demo.request({operation:'get'}).messages.at(-2)!.context!.profile!;assert.equal(prior.revision,2);assert.equal(prior.fields!.targetRoles,'Backend Engineer');const original=demo.request({operation:'get'}).jobs[0].evidence;demo.request({operation:'stage',id:'northstar',stage:'closed'});const changed=demo.request({operation:'get'}).jobs[0];assert.equal(changed.history[0].previousEvidence,original);assert.equal(changed.history[0].fromStage,'interview');
});
test('invalid or unreadable profile never silently becomes an empty confirmed profile',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'profile-bad-')),store=new JobProfileStore(root);assert.throws(()=>store.request({operation:'save',revision:0,confirmed:true,fields:emptyProfile().fields}),/目标职位/);fs.writeFileSync(path.join(root,'job-profile.json'),'broken');assert.throws(()=>store.request({operation:'get'}));assert.equal(fs.readFileSync(path.join(root,'job-profile.json'),'utf8'),'broken');
});

import {JobRecordsStore,canonicalJobUrl} from '../src/job-records';
import {localDay,validDay,addDays,actionableTodo,todoDateLabel} from '../src/job-dates';
import {execFile} from 'node:child_process';
const recordFields={company:'Synthetic Company',title:'Engineer',url:'https://example.invalid/job/1',applicationUrl:'',description:'Synthetic description',notes:'Local note',nextAction:'Review role',stage:'considering' as const,appliedOn:'',evidence:''};
const recordNow=new Date(2026,10,2,12,0,0);
function recordFixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'job-records-')),store=new JobRecordsStore(root);const read=()=>store.request({operation:'get'});return {root,store,read,write:(r:object)=>store.request({...r,revision:read().revision},recordNow)};}
test('real jobs persist separately, deduplicate retry/URL and preserve edits after reopening',()=>{
 const f=recordFixture();fs.writeFileSync(path.join(f.root,'job-demo.json'),'demo sentinel');try{assert.equal(f.read().jobs.length,0);let state=f.write({operation:'add-job',key:'one',fields:recordFields});const id=state.selectedId;assert.equal(state.demo,false);assert.equal(state.jobs[0].stage,'considering');assert.equal(state.todos.length,1);assert.equal(f.store.request({operation:'add-job',revision:0,key:'one',fields:recordFields}).jobs.length,1);assert.throws(()=>f.write({operation:'add-job',key:'two',fields:{...recordFields,url:'https://example.invalid/job/1?utm_source=test#section'}}),/已经存在/);assert.throws(()=>f.write({operation:'add-job',key:'one',fields:{...recordFields,title:'Other'}}),/另一条/);state=f.write({operation:'update-job',id,fields:{...recordFields,notes:'Edited note'}});assert.equal(state.jobs[0].notes,'Edited note');assert.equal(fs.readFileSync(path.join(f.root,'job-demo.json'),'utf8'),'demo sentinel');const reopened=new JobRecordsStore(f.root);try{assert.equal(reopened.request({operation:'get'}).jobs[0].notes,'Edited note');}finally{reopened.close();}}finally{f.store.close();}
});
test('recorded application requires evidence/date and creates exactly one active seven-day follow-up',()=>{
 const f=recordFixture();try{let state=f.write({operation:'add-job',key:'one',fields:{...recordFields,nextAction:''}});const id=state.selectedId;for(const fields of [{stage:'applied',appliedOn:'2026-11-01',evidence:''},{stage:'applied',appliedOn:'2026-02-30',evidence:'User report'},{stage:'applied',appliedOn:'2026-11-03',evidence:'User report'}])assert.throws(()=>f.write({operation:'progress',id,...fields}));assert.equal(f.read().jobs[0].stage,'considering');assert.equal(f.read().todos.length,0);state=f.write({operation:'progress',id,stage:'applied',appliedOn:'2026-10-26',evidence:'User reports submission on website'});assert.equal(state.todos[0].dueDate,'2026-11-02');assert.equal(state.jobs[0].history[0].previousEvidence,'用户手动添加，尚未核实投递');const first=state.todos[0].id;state=f.write({operation:'progress',id,stage:'interview',appliedOn:'',evidence:'Interview invitation received'});assert.equal(state.todos[0].cancelled,true);assert.throws(()=>f.write({operation:'todo',id:first,done:true}),/取消/);state=f.write({operation:'progress',id,stage:'applied',appliedOn:'2026-11-02',evidence:'Resubmitted after clarification'});assert.equal(state.todos.filter(t=>t.kind==='followup'&&!t.cancelled&&!t.done).length,1);assert.equal(state.todos.at(-1)!.dueDate,'2026-11-09');assert.equal(state.jobs[0].history.at(-1)!.previousAppliedOn,'2026-10-26');}finally{f.store.close();}
});
test('local dates distinguish upcoming work, invalid calendar days and archived actions',()=>{
 assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2024-02-29'),true);assert.equal(addDays('2026-12-28',7),'2027-01-04');assert.equal(addDays('2026-03-01',7),'2026-03-08');const todo={id:'x',jobId:'j',title:'Follow up',due:'',dueDate:'2026-11-05',done:false};assert.equal(actionableTodo(todo,recordNow),false);assert.equal(actionableTodo({...todo,dueDate:'2026-11-04'},recordNow),true);assert.equal(actionableTodo({...todo,dueDate:'2026-11-01',cancelled:true},recordNow),false);assert.match(todoDateLabel({...todo,dueDate:'2026-11-01'},recordNow),/逾期/);
});
test('manual todos, completion and closed-job review survive while stale writes roll back',()=>{
 const f=recordFixture();try{let state=f.write({operation:'add-job',key:'one',fields:recordFields});const id=state.selectedId,stale=state.revision;state=f.write({operation:'add-todo',id,title:'Prepare interview',dueDate:'2026-11-02'});assert.throws(()=>f.store.request({operation:'todo',id:state.todos.at(-1)!.id,done:true,revision:stale}),/已有更新/);assert.equal(f.read().todos.at(-1)!.done,false);state=f.write({operation:'todo',id:state.todos.at(-1)!.id,done:true});assert.equal(state.todos.at(-1)!.done,true);state=f.write({operation:'progress',id,stage:'closed',appliedOn:'',evidence:'User declined'});assert.equal(visibleJobs(state.jobs,state.todos,'','all','action','action').length,0);assert.equal(state.todos[0].done,false);assert.throws(()=>f.write({operation:'add-todo',id,title:'new',dueDate:'2026-11-02'}),/已结束/);}finally{f.store.close();}
});
test('job links and descriptions are data only and reject credential-like or executable inputs',()=>{
 assert.equal(canonicalJobUrl('https://example.invalid/a?utm_source=x&id=7#top'),'https://example.invalid/a?id=7');for(const url of ['javascript:alert(1)','file:///C:/test','https://user:pass@example.invalid/a','https://example.invalid/a?token=secret'])assert.throws(()=>canonicalJobUrl(url));const f=recordFixture();try{assert.throws(()=>f.write({operation:'add-job',key:'bad',fields:{...recordFields,description:'refresh_token: synthetic-token'}}),/令牌/);assert.equal(f.read().jobs.length,0);}finally{f.store.close();}
});
test('real message inputs freeze confirmed profile and job facts without changing demo records',()=>{
 const f=recordFixture(),profiles=new JobProfileStore(f.root);try{profiles.request({operation:'save',revision:0,confirmed:true,fields:{...emptyProfile().fields,targetRoles:'Engineer'}});const job=f.write({operation:'add-job',key:'one',fields:recordFields}).jobs[0];f.write({operation:'message',text:'Show next action'});f.write({operation:'update-job',id:job.id,fields:{...recordFields,notes:'New notes'}});const message=f.read().messages.find(m=>m.role==='user')!;assert.equal(message.context!.job!.notes,'Local note');assert.equal(message.context!.profile!.revision,1);assert.equal(message.context!.profile!.fields!.targetRoles,'Engineer');assert.equal(fs.existsSync(path.join(f.root,'job-demo.json')),false);}finally{f.store.close();}
});
test('independent record service processes reject a competing stale writer without duplicate jobs',async()=>{
 const f=recordFixture();try{const run=(key:string)=>new Promise<{ok:boolean;error:string}>(resolve=>{const child=execFile(process.execPath,['dist-test/task-cli.cjs','records',f.root],{windowsHide:true},(error)=>resolve({ok:!error,error:error?.message||''}));child.stdin!.end(JSON.stringify({operation:'add-job',revision:0,key,fields:{...recordFields,url:'https://example.invalid/'+key}}));});const result=await Promise.all([run('a'),run('b')]);assert.equal(result.filter(r=>r.ok).length,1);assert.equal(f.read().jobs.length,1);assert.equal(fs.existsSync(path.join(f.root,'tasks.sqlite3')),false);assert.equal(fs.existsSync(path.join(f.root,'job-demo.json')),false);}finally{f.store.close();}
});

test('explicit message job prevents a different persisted selection from changing its context',()=>{
 const f=recordFixture();try{const first=f.write({operation:'add-job',key:'a',fields:recordFields}).selectedId;f.write({operation:'add-job',key:'b',fields:{...recordFields,title:'Other role',url:'https://example.invalid/job/other'}});const state=f.write({operation:'message',jobId:first,text:'Show selected role'});const message=state.messages.find(m=>m.role==='user')!;assert.equal(message.context!.job!.id,first);assert.equal(message.jobId,first);}finally{f.store.close();}
});

import {buildDailyBrief} from '../src/job-brief';
test('daily brief separates deadline buckets and excludes completed, cancelled and ended-job actions',()=>{
 const state=seedDemo();state.demo=false;state.revision=12;state.jobs[0].stage='applied';state.jobs[1].stage='closed';const base={id:'',jobId:state.jobs[0].id,title:'Action',due:'',done:false};state.todos=[{...base,id:'over',dueDate:'2026-11-01',kind:'followup'},{...base,id:'today',dueDate:'2026-11-02'},{...base,id:'soon',dueDate:'2026-11-04'},{...base,id:'later',dueDate:'2026-11-05'},{...base,id:'undated'},{...base,id:'done',dueDate:'2026-11-01',done:true},{...base,id:'cancelled',dueDate:'2026-11-01',cancelled:true},{...base,id:'ended',jobId:state.jobs[1].id,dueDate:'2026-11-01'}];const brief=buildDailyBrief(state,new Date(2026,10,2,10));assert.equal(brief.sourceRevision,12);assert.deepEqual(brief.actions.map(a=>a.todoId),['over','today','soon','undated']);assert.deepEqual([brief.counts.overdue,brief.counts.today,brief.counts.soon,brief.counts.undated,brief.counts.followups],[1,1,1,1,1]);assert.equal(brief.notification,'not-sent');state.todos[0].title='Edited';assert.equal(brief.actions[0].action,'Action');
});
test('brief starts at ten, never regenerates that day and read receipt is separate from its frozen payload',()=>{
 const f=recordFixture();try{f.write({operation:'add-job',key:'one',fields:recordFields});const revision=f.read().revision;assert.equal(f.store.briefing({operation:'check'},new Date(2026,10,2,9,59)).status,'scheduled');const created=f.store.briefing({operation:'check'},new Date(2026,10,2,10));assert.equal(created.status,'created');assert.equal(created.meta!.seenAt,null);assert.equal(f.read().revision,revision);f.write({operation:'todo',id:f.read().todos[0].id,done:true});const existing=f.store.briefing({operation:'check'},new Date(2026,10,2,23));assert.equal(existing.status,'existing');assert.equal(existing.meta!.counts.total,1);assert.equal(existing.meta!.createdAt,created.meta!.createdAt);const read=f.store.briefing({operation:'read',day:'2026-11-02'},new Date(2026,10,2,23,10));assert.equal(read.brief!.sourceRevision,revision);assert.equal(read.brief!.actions[0].action,'Review role');const again=f.store.briefing({operation:'read',day:'2026-11-02'},new Date(2026,10,2,23,20));assert.equal(again.meta!.seenAt,read.meta!.seenAt);assert.deepEqual(again.brief,read.brief);const next=new JobRecordsStore(f.root);try{assert.equal(next.briefing({operation:'check'},new Date(2026,10,2,23,30)).status,'existing');}finally{next.close();}}finally{f.store.close();}
});
test('missed days catch up today only; clock rollback never invents old daily briefs',()=>{
 const f=recordFixture();try{f.store.briefing({operation:'check'},new Date(2026,10,2,10));f.store.briefing({operation:'check'},new Date(2026,10,5,18));const history=f.store.briefing({operation:'list'}).history!;assert.deepEqual(history.map(h=>h.day),['2026-11-05','2026-11-02']);assert.equal(f.store.briefing({operation:'check'},new Date(2026,10,4,18)).status,'clock-blocked');assert.equal(f.store.briefing({operation:'list'}).history!.length,2);assert.throws(()=>f.store.briefing({operation:'read',day:'2026-11-03'}),/没有/);}finally{f.store.close();}
});
test('brief history pages without deleting evidence and action snapshots stay bounded',()=>{
 const f=recordFixture();try{for(let day=1;day<=23;day++)f.store.briefing({operation:'check'},new Date(2026,9,day,10));const first=f.store.briefing({operation:'list'});assert.equal(first.history!.length,20);assert.equal(first.nextBefore,'2026-10-04');const last=f.store.briefing({operation:'list',before:first.nextBefore});assert.equal(last.history!.length,3);assert.equal(last.nextBefore,undefined);assert.throws(()=>f.store.briefing({operation:'list',before:'not-a-date'}));const state=seedDemo();state.todos=Array.from({length:70},(_,i)=>({...state.todos[0],id:'todo-'+i}));const bounded=buildDailyBrief(state,new Date(2026,10,2,10));assert.equal(bounded.actions.length,50);assert.equal(bounded.omittedActions,20);assert.equal(bounded.counts.total,70);}finally{f.store.close();}
});
test('two independent daily checks create one immutable brief with no lost or duplicate history',async()=>{
 const f=recordFixture();try{const run=()=>new Promise<any>((resolve,reject)=>execFile(process.execPath,['dist-test/brief-worker.cjs',f.root,'2026-11-02T10:00:00'],{windowsHide:true},(error,stdout)=>error?reject(error):resolve(JSON.parse(stdout))));const result=await Promise.all([run(),run()]);assert.equal(result.filter(r=>r.status==='created').length,1);assert.equal(result.filter(r=>r.status==='existing').length,1);assert.equal(f.store.briefing({operation:'list'}).history!.length,1);assert.equal(f.read().revision,0);}finally{f.store.close();}
});
