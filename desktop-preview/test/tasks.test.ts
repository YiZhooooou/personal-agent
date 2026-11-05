import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TaskStore} from '../src/task-store';
import {acquireWorker} from '../src/task-worker';
import {requirePersonal} from '../src/task-service';
test('task IPC policy only allows Personal space',()=>{assert.doesNotThrow(()=>requirePersonal('personal'));assert.throws(()=>requirePersonal('work'));assert.throws(()=>requirePersonal('lab'));});
test('request keys deduplicate tasks and reject mismatched requests',()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'task-test-')));
 try{const a=s.submit('hello','event-1');assert.equal(a!.id,s.submit('hello','event-1')!.id);assert.throws(()=>s.submit('different','event-1'));assert.throws(()=>s.submit('','event-2'));assert.equal(s.list().length,1);}finally{s.close();}
});
test('results survive restart and unfinished work becomes interrupted without replay',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'task-test-'));let s=new TaskStore(root);
 const done=s.submit('done','a')!;s.claim();s.finish(String(done.id),'succeeded','saved result');
 const unfinished=s.submit('unfinished','b')!;s.claim();s.close();
 s=new TaskStore(root);try{s.recover();assert.equal(s.get(String(done.id))!.result,'saved result');assert.equal(s.get(String(unfinished.id))!.status,'interrupted');assert.equal(s.claim(),undefined);assert.throws(()=>s.finish(String(done.id),'failed',''));}finally{s.close();}
});
test('second worker cannot take ownership of the same data directory',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'task-test-'));const release=await acquireWorker(root);
 try{await assert.rejects(acquireWorker(root),/ownership unavailable/);}finally{release();}
 const next=await acquireWorker(root);next();
});
import {EventEmitter} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {execute} from '../src/task-worker';

test('old task database upgrades without losing saved results',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'task-migration-'));
 const db=new DatabaseSync(path.join(root,'tasks.sqlite3'));
 db.exec("CREATE TABLE tasks(id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,prompt TEXT NOT NULL,status TEXT NOT NULL,result TEXT NOT NULL DEFAULT '',error TEXT NOT NULL DEFAULT '',created TEXT NOT NULL,updated TEXT NOT NULL); INSERT INTO tasks VALUES('old','key','old prompt','succeeded','saved','','2026','2026')");db.close();
 const s=new TaskStore(root);try{assert.equal(s.get('old')!.result,'saved');assert.equal(s.get('old')!.cancel_requested,0);assert.equal(s.list()[0].title,'old prompt');s.cancel('old');assert.equal(s.get('old')!.status,'succeeded');}finally{s.close();}
});
test('queued cancellation prevents execution; running cancellation preserves crash progress',()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'task-cancel-')));
 try{const a=String(s.submit('queued','a').id);s.cancel(a);assert.equal(s.claim(),undefined);assert.equal(s.get(a)!.status,'cancelled');
 const b=String(s.submit('running','b').id);s.claim();s.progress(b,'partial');s.cancel(b);assert.equal(s.cancellationRequested(b),true);assert.equal(s.get(b)!.status,'cancelling');s.recover();assert.equal(s.get(b)!.result,'partial');assert.equal(s.get(b)!.status,'interrupted');}finally{s.close();}
});
class FakeCodex extends EventEmitter {
 calls:string[]=[];closed=false;interrupted=true;
 async request(method:string){this.calls.push(method);if(method==='turn/interrupt'&&this.interrupted)queueMicrotask(()=>this.emit('notification','turn/completed',{threadId:'t',turn:{status:'interrupted'}}));return {thread:{id:'t'},turn:{id:'u'}};}
 close(){this.closed=true;}
}
const tick=()=>new Promise(r=>setTimeout(r,15));
test('cancelling streaming task interrupts once and keeps partial output',async()=>{
 const c=new FakeCodex();let cancelled=false,saved='';const result=execute(c,'test','synthetic',{isCancelled:()=>cancelled,onProgress:s=>saved=s,pollMs:5});
 await tick();c.emit('notification','item/agentMessage/delta',{threadId:'t',delta:'partial'});await tick();cancelled=true;
 const r=await result;assert.equal(r.status,'cancelled');assert.equal(r.result,'partial');assert.equal(saved,'partial');assert.equal(c.calls.filter(m=>m==='turn/interrupt').length,1);assert.equal(c.listenerCount('notification'),0);
});
test('unacknowledged cancellation closes local execution after grace period',async()=>{
 const c=new FakeCodex();c.interrupted=false;let cancelled=false;const result=execute(c,'test','synthetic',{isCancelled:()=>cancelled,onProgress:()=>{},pollMs:5,cancelGraceMs:20});await tick();cancelled=true;
 const r=await result;assert.equal(r.status,'cancelled');assert.equal(r.stopWorker,true);assert.equal(c.closed,true);
});
test('completed response wins late cancellation and disconnection preserves partial text',async()=>{
 const c=new FakeCodex();c.interrupted=false;let cancelled=false;const result=execute(c,'test','synthetic',{isCancelled:()=>cancelled,onProgress:()=>{},pollMs:5});await tick();cancelled=true;await tick();c.emit('notification','turn/completed',{threadId:'t',turn:{status:'completed',items:[{type:'agentMessage',text:'done'}]}});assert.equal((await result).status,'succeeded');
 const d=new FakeCodex();const lost=execute(d,'test','synthetic',{isCancelled:()=>false,onProgress:()=>{},pollMs:5});await tick();d.emit('notification','item/agentMessage/delta',{threadId:'t',delta:'keep me'});d.emit('disconnected','test disconnect');assert.deepEqual(await lost,{status:'interrupted',result:'keep me',error:'test disconnect',stopWorker:true});
});
test('cancelled task never starts a model turn',async()=>{
 const c=new FakeCodex();assert.equal((await execute(c,'test','synthetic',{isCancelled:()=>true,onProgress:()=>{}})).status,'cancelled');assert.equal(c.calls.length,0);
});

import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
test('killed worker releases ownership and CLI recovers partial output without replay',{timeout:15000},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'task-crash-'));
 const child=spawn(process.execPath,[path.resolve('dist-test/crash-worker.cjs'),root],{windowsHide:true,stdio:['ignore','ignore','ignore','ipc']});
 try{
  const [ready]=await once(child,'message');const exited=once(child,'exit');child.kill();await exited;
  const {stdout}=await promisify(execFile)(process.execPath,[path.resolve('dist-test/task-cli.cjs'),'list',root],{windowsHide:true});
  const rows=JSON.parse(stdout);assert.equal(rows[0].id,ready.id);assert.equal(rows[0].status,'interrupted');
  const s=new TaskStore(root);try{assert.equal(s.get(ready.id)!.result,'saved before crash');assert.equal(s.claim(),undefined);}finally{s.close();}
 }finally{if(child.exitCode===null)child.kill();}
});

import {executeMaster,parsePlan} from '../src/task-master';
const validPlan=JSON.stringify({tasks:[{title:'Analysis',instructions:'Analyze the goal'},{title:'Review',instructions:'Review risks'}]});
test('master validates one to three bounded text subtasks',()=>{
 assert.equal(parsePlan('```json\n'+validPlan+'\n```').length,2);
 for(const bad of ['not JSON','{}','{"tasks":[]}',JSON.stringify({tasks:[{title:'a',instructions:'x'},{title:'b',instructions:'x'.repeat(6001)}]})])assert.throws(()=>parsePlan(bad));
});
test('master persists four ordered steps and summarizes only its child results',async()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'master-success-')));const id=String(s.submit('Synthetic goal','master','master').id);s.claim();let calls=0;
 try{
  const r=await executeMaster(s,id,'Synthetic goal',async(prompt,progress)=>{calls++;const result=[validPlan,'analysis result','review result','final answer'][calls-1];progress(result);if(calls===4){assert.match(prompt,/analysis result/);assert.match(prompt,/review result/);}return {status:'succeeded',result,error:''};});
  s.finish(id,r.status,r.result,r.error);assert.equal(calls,4);assert.equal(s.get(id)!.result,'final answer');assert.deepEqual(s.steps(id).map(r=>r.status),Array(4).fill('succeeded'));assert.throws(()=>s.submit('Synthetic goal','master','text'));
 }finally{s.close();}
});
test('malformed master plan fails without child execution',async()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'master-invalid-')));const id=String(s.submit('goal','master','master').id);s.claim();let calls=0;
 try{const r=await executeMaster(s,id,'goal',async()=>{calls++;return {status:'succeeded',result:'not JSON',error:''};});s.finish(id,r.status,r.result,r.error);assert.equal(r.status,'failed');assert.equal(calls,1);assert.equal(s.steps(id).length,1);}finally{s.close();}
});
test('master cancellation stops later steps and keeps child partial result',async()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'master-cancel-')));const id=String(s.submit('goal','master','master').id);s.claim();let calls=0;
 try{const r=await executeMaster(s,id,'goal',async(_prompt,progress)=>{calls++;if(calls===1)return {status:'succeeded',result:validPlan,error:''};progress('partial child');s.cancel(id);return {status:'cancelled',result:'partial child',error:''};});s.finish(id,r.status,r.result,r.error);assert.equal(calls,2);assert.deepEqual(s.steps(id).map(r=>r.status),['succeeded','cancelled','cancelled','cancelled']);assert.equal(s.steps(id)[1].result,'partial child');}finally{s.close();}
});
test('failed child prevents summary; crash recovery preserves step output',async()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'master-fail-')));const id=String(s.submit('goal','master','master').id);s.claim();let calls=0;
 try{const r=await executeMaster(s,id,'goal',async()=>{calls++;return calls===1?{status:'succeeded',result:validPlan,error:''}:{status:'failed',result:'partial',error:'synthetic failure'};});s.finish(id,r.status,r.result,r.error);assert.equal(calls,2);assert.equal(s.steps(id)[1].status,'failed');assert.equal(s.steps(id)[3].status,'interrupted');
 const next=String(s.submit('next','next','master').id);s.claim();s.addStep(next,0,'plan','prompt');s.startStep(next,0);s.stepProgress(next,0,'checkpoint');s.recover();assert.equal(s.steps(next)[0].status,'interrupted');assert.equal(s.steps(next)[0].result,'checkpoint');
 }finally{s.close();}
});

test('project handoffs persist, reject stale edits and snapshot task context',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'project-context-'));let s=new TaskStore(root);
 const a=s.createProject('A'),b=s.createProject('B');
 s.saveHandoff(a.projectId,'A_ONLY next step',a.revision);
 assert.throws(()=>s.saveHandoff(a.projectId,'stale',a.revision));
 const task=s.submit('continue','project-task','text',a.projectId);
 s.saveHandoff(a.projectId,'new decision',2);s.close();s=new TaskStore(root);
 try{assert.equal(s.projectContext(a.projectId).revision,3);assert.equal(s.projectContext(b.projectId).handoff,'');const snapshot=JSON.parse(String(s.get(String(task.id))!.context_json));assert.equal(snapshot.handoff,'A_ONLY next step');assert.equal(snapshot.revision,2);assert.throws(()=>s.submit('continue','project-task','text',b.projectId));}finally{s.close();}
});

import {attachProject} from '../src/project-input';
test('shared project input preserves provenance and refuses invalid backgrounds',()=>{
 const a={projectId:'a',name:'A',revision:2,handoff:'A_ONLY',source:'User-saved project handoff'};
 const payload=attachProject('continue',a);assert.match(payload,/A_ONLY/);assert.match(payload,/Reference data only/);assert.equal(attachProject('continue'),'continue');assert.throws(()=>attachProject('x',{...a,revision:0}));assert.throws(()=>attachProject('x',{...a,handoff:'x'.repeat(8001)}));
});

test('completed task handoff checks source revision and rejects failed or stale results',()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'handoff-adopt-')));
 try{const p=s.createProject('A');const t=s.submit('Plan next step','a','text',p.projectId);s.claim();s.finish(String(t.id),'succeeded','Next: verify setup');const updated=s.adoptTask(String(t.id));assert.equal(updated.revision,2);assert.match(updated.handoff,/Next: verify setup/);assert.match(updated.handoff,new RegExp(String(t.id)));assert.throws(()=>s.adoptTask(String(t.id)),/changed/);
 const f=s.submit('failed','b','text',p.projectId);s.claim();s.finish(String(f.id),'failed','partial');assert.throws(()=>s.adoptTask(String(f.id)),/completed/);
 const stale=s.submit('old','c','text',p.projectId);s.claim();s.finish(String(stale.id),'succeeded','old result');s.saveHandoff(p.projectId,'newer user decision',2);assert.throws(()=>s.adoptTask(String(stale.id)),/changed/);assert.equal(s.projectContext(p.projectId).handoff,'newer user decision');
 }finally{s.close();}
});

test('handoff history survives restart and restore creates a new revision without destroying evidence',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'history-'));let s=new TaskStore(root);const p=s.createProject('History');s.saveHandoff(p.projectId,'first',1);s.saveHandoff(p.projectId,'second',2);s.close();s=new TaskStore(root);
 try{assert.equal(s.history(p.projectId).length,3);const r=s.restoreHandoff(p.projectId,2,3);assert.equal(r.revision,4);assert.equal(r.handoff,'first');assert.equal(r.source,'Restored revision 2');assert.equal(s.history(p.projectId)[1].handoff,'second');assert.throws(()=>s.restoreHandoff(p.projectId,3,3),/changed/);assert.equal(s.history(p.projectId).length,4);assert.throws(()=>s.restoreHandoff(p.projectId,99,4),/not found/);}finally{s.close();}
});
test('schema 3 projects gain a baseline history without changing their revision',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'history-migrate-'));let s=new TaskStore(root);const p=s.createProject('Old');s.saveHandoff(p.projectId,'existing handoff',1);s.db.exec('DROP TABLE project_history; PRAGMA user_version=3');s.close();s=new TaskStore(root);
 try{assert.equal(s.projectContext(p.projectId).revision,2);assert.equal(s.history(p.projectId)[0].handoff,'existing handoff');assert.equal(s.history(p.projectId).length,1);}finally{s.close();}
});

test('project-scoped queue never claims another project task',()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'scoped-queue-')));try{
 const a=s.createProject('A'),b=s.createProject('B');const x=s.submit('A task','a','text',a.projectId),y=s.submit('B task','b','text',b.projectId);
 assert.equal(s.claim(b.projectId)!.id,y.id);assert.equal(s.claim(b.projectId),undefined);assert.equal(s.get(String(x.id))!.status,'queued');assert.equal(s.list().find(t=>t.id===x.id)!.project_name,'A');assert.equal(s.claim(a.projectId)!.id,x.id);
 }finally{s.close();}
});

test('daily schedules enqueue once per device date and preserve project context',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'schedule-'));let s=new TaskStore(root);const p=s.createProject('Daily');const before=new Date(2026,10,3,9,0),due=new Date(2026,10,3,10,1);
 s.addSchedule(p.projectId,'daily report','10:00',before);assert.deepEqual(s.tickSchedules(before),[]);assert.equal(s.tickSchedules(due).length,1);s.close();s=new TaskStore(root);
 try{assert.deepEqual(s.tickSchedules(due),[]);assert.equal(s.list()[0].project_id,p.projectId);const previous=s.claim()!;s.finish(String(previous.id),'succeeded','done');assert.equal(s.tickSchedules(new Date(2026,10,5,11,0)).length,1);assert.equal(s.list().length,2);const schedule=s.schedules(p.projectId)[0];s.enableSchedule(String(schedule.id),false);assert.deepEqual(s.tickSchedules(new Date(2026,10,6,11,0)),[]);assert.throws(()=>s.addSchedule(p.projectId,'x','25:00'));}finally{s.close();}
});

test('workspace registration lists local entries without leaking paths into model context',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'workspace-'));const folder=path.join(root,'repo');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'app.ts'),'synthetic');fs.mkdirSync(path.join(folder,'.git'));fs.mkdirSync(path.join(folder,'node_modules'));
 const s=new TaskStore(path.join(root,'data'));try{const a=s.createProject('A'),b=s.createProject('B');assert.throws(()=>s.setWorkspace(a.projectId,'relative'));assert.throws(()=>s.setWorkspace(a.projectId,path.join(folder,'app.ts')));s.setWorkspace(a.projectId,folder);assert.deepEqual(s.workspace(a.projectId).files.map(f=>f.name),['app.ts']);assert.equal(s.workspace(b.projectId).root,'');assert.ok(!JSON.stringify(s.projectContext(a.projectId)).includes(folder));s.clearWorkspace(a.projectId);assert.equal(s.workspace(a.projectId).root,'');assert.ok(fs.existsSync(path.join(folder,'app.ts')));}finally{s.close();}
});

test('workspace preview reads bounded UTF-8 text and rejects unsafe names and content',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'preview-'));const folder=path.join(root,'repo');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'readme.md'),'synthetic preview');fs.writeFileSync(path.join(folder,'.env'),'secret');fs.writeFileSync(path.join(folder,'large.txt'),'x'.repeat(12001));fs.writeFileSync(path.join(folder,'binary.txt'),Buffer.from([0,1,2]));fs.writeFileSync(path.join(folder,'bad.txt'),Buffer.from([255]));
 const s=new TaskStore(path.join(root,'data'));try{const p=s.createProject('Preview');s.setWorkspace(p.projectId,folder);assert.equal(s.readWorkspaceFile(p.projectId,'readme.md').text,'synthetic preview');for(const name of ['../readme.md','.env','large.txt','binary.txt','bad.txt','image.exe','x:stream.txt'])assert.throws(()=>s.readWorkspaceFile(p.projectId,name));s.clearWorkspace(p.projectId);assert.throws(()=>s.readWorkspaceFile(p.projectId,'readme.md'));}finally{s.close();}
});

import {previewChange,applyChange} from '../src/project-change';
test('reviewed single-file change applies, checks syntax, backs up and restores without overwriting later edits',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'change-'));const folder=path.join(root,'repo');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'app.js'),'const x = 1;\n');const s=new TaskStore(path.join(root,'data'));
 try{const project=s.createProject('Code');s.setWorkspace(project.projectId,folder);const task=s.submit('Change x to 2','proposal','text',project.projectId);s.claim();s.finish(String(task.id),'succeeded',JSON.stringify({name:'app.js',content:'const x = 2;\n'}));const p=previewChange(s,String(task.id));assert.equal(fs.readFileSync(path.join(folder,'app.js'),'utf8'),p.before);const applied=applyChange(s,p.id);assert.equal(applied.applied,true);assert.equal(applied.check.status,'passed');assert.throws(()=>applyChange(s,p.id));fs.writeFileSync(path.join(folder,'app.js'),'const x = 3;\n');assert.throws(()=>applyChange(s,p.id,true),/changed/);fs.writeFileSync(path.join(folder,'app.js'),p.after);applyChange(s,p.id,true);assert.equal(fs.readFileSync(path.join(folder,'app.js'),'utf8'),p.before);
 const bad=s.submit('bad','bad','text',project.projectId);s.claim();s.finish(String(bad.id),'succeeded',JSON.stringify({name:'../outside.js',content:'bad'}));assert.throws(()=>previewChange(s,String(bad.id)));
 }finally{s.close();}
});

test('interrupted replacement is reconciled and failed syntax remains reversible',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'change-recovery-'));const folder=path.join(root,'repo');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'app.js'),'const ok = 1;');const s=new TaskStore(path.join(root,'data'));
 try{const project=s.createProject('Recovery');s.setWorkspace(project.projectId,folder);const task=s.submit('proposal','recover','text',project.projectId);s.claim();s.finish(String(task.id),'succeeded',JSON.stringify({name:'app.js',content:'const = broken;'}));const p=previewChange(s,String(task.id));const applied=applyChange(s,p.id);assert.equal(applied.check.status,'failed');
 const journal=path.join(s.root,'change-proposals',p.id+'.json');const interrupted=JSON.parse(fs.readFileSync(journal,'utf8'));interrupted.state='applying';interrupted.applied=false;interrupted.used=false;fs.writeFileSync(journal,JSON.stringify(interrupted));const restored=applyChange(s,p.id,true);assert.equal(restored.state,'reverted');assert.equal(fs.readFileSync(path.join(folder,'app.js'),'utf8'),'const ok = 1;');assert.ok(restored.events.some((e:any)=>e.operation==='recovered-applied'));assert.equal(restored.check.status,'passed');
 }finally{s.close();}
});

import {watchSchedules,stopScheduler,schedulerStatus} from '../src/task-scheduler';
test('background scheduler has exclusive ownership, enqueues without inference and stops explicitly',{timeout:10000},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'scheduler-watch-'));const s=new TaskStore(root);const p=s.createProject('Daily');s.addSchedule(p.projectId,'synthetic daily','00:00',new Date(2000,0,1,0,0));
 let ready!:()=>void;const started=new Promise<void>(resolve=>{ready=resolve;});const watcher=watchSchedules(root,ready,15);await started;
 try{assert.equal(schedulerStatus(root).running,true);await watchSchedules(root,()=>{},15);await new Promise(r=>setTimeout(r,40));assert.equal(s.list().length,1);assert.equal(s.list()[0].status,'queued');}finally{stopScheduler(root);await watcher;s.close();}assert.equal(schedulerStatus(root).running,false);
});

test('schedule log explains overlap, missed days and isolates one project failure',()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'schedule-log-')));try{
 const a=s.createProject('A'),b=s.createProject('B');s.addSchedule(a.projectId,'A','00:00',new Date(2000,0,1));s.addSchedule(b.projectId,'B','00:00',new Date(2000,0,1));const original=s.submit.bind(s);s.submit=(prompt,key,kind,project)=>{if(project===a.projectId)throw new Error('synthetic memory unavailable');return original(prompt,key,kind,project);};
 assert.equal(s.tickSchedules(new Date(2026,10,2,12)).length,1);assert.equal(s.scheduleRuns(a.projectId)[0].outcome,'failed');assert.equal(s.scheduleRuns(b.projectId)[0].outcome,'queued');s.submit=original;
 s.tickSchedules(new Date(2026,10,4,12));const log=s.scheduleRuns(b.projectId)[0];assert.equal(log.outcome,'blocked');assert.match(String(log.message),/1 missed/);assert.equal(s.list().filter(t=>t.project_id===b.projectId).length,1);
 assert.deepEqual(s.tickSchedules(new Date(2026,10,1,12)),[]);
 }finally{s.close();}
});

test('explicit retry preserves failed attempt history and never duplicates a successful enqueue',()=>{
 const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'schedule-retry-')));try{const p=s.createProject('Retry');const [plan]=s.addSchedule(p.projectId,'report','00:00',new Date(2000,0,1));const original=s.submit.bind(s);s.submit=()=>{throw new Error('synthetic startup problem');};const now=new Date(2026,10,2,12);s.tickSchedules(now);assert.equal(s.scheduleRuns(p.projectId).length,1);s.submit=original;s.retrySchedule(String(plan.id),now);assert.equal(s.tickSchedules(new Date(2026,10,2,12,1)).length,1);assert.equal(s.scheduleRuns(p.projectId).length,2);assert.equal(s.scheduleRuns(p.projectId)[1].outcome,'failed');assert.throws(()=>s.retrySchedule(String(plan.id),now));assert.equal(s.list().length,1);}finally{s.close();}
});

test('schedule attempt history is not duplicated by database reopen',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'schedule-history-'));let s=new TaskStore(root);const p=s.createProject('History');s.addSchedule(p.projectId,'report','00:00',new Date(2000,0,1));s.tickSchedules(new Date(2026,10,2,12));s.close();s=new TaskStore(root);try{assert.equal(s.scheduleRuns(p.projectId).length,1);}finally{s.close();}
});
test('scheduler distinguishes stale heartbeat and corrupted status from stopped',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'scheduler-status-'));const file=path.join(root,'scheduler-control.json');fs.writeFileSync(file,JSON.stringify({enabled:true,heartbeat:Date.now()-60000}));assert.equal(schedulerStatus(root).state,'interrupted');fs.writeFileSync(file,'bad');assert.equal(schedulerStatus(root).state,'interrupted');
});

test('reading saved tasks does not request a write lock on an initialized database',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'db-read-lock-'));const s=new TaskStore(root);const p=s.createProject('Concurrent');const task=s.submit('read while writer active','concurrent','text',p.projectId);s.db.exec('BEGIN IMMEDIATE');
 try{const {stdout}=await promisify(execFile)(process.execPath,[path.resolve('dist-test/task-cli.cjs'),'show',root,String(task.id)],{windowsHide:true,timeout:3000,encoding:'utf8'});assert.equal(JSON.parse(stdout).id,task.id);}finally{s.db.exec('ROLLBACK');s.close();}
});

test('file tasks freeze source, hide local root from model and reject stale or redirected proposals',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'file-snapshot-')),folder=path.join(root,'repo');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'app.js'),'const x=1;');fs.writeFileSync(path.join(folder,'other.js'),'const y=1;');const s=new TaskStore(path.join(root,'data'));
 try{const p=s.createProject('Files');s.setWorkspace(p.projectId,folder);const task=s.submitFile(p.projectId,'app.js','change x','snapshot');const context=JSON.parse(String(task.context_json));assert.equal(context.fileInput.text,'const x=1;');assert.deepEqual(JSON.parse(attachProject('change x',context)).projectBackground.fileInput,{name:'app.js',text:'const x=1;'});fs.writeFileSync(path.join(folder,'app.js'),'const x=9;');assert.equal(s.submitFile(p.projectId,'app.js','change x','snapshot').id,task.id);s.claim();s.finish(String(task.id),'succeeded',JSON.stringify({name:'app.js',content:'const x=2;'}));assert.throws(()=>previewChange(s,String(task.id)),/changed since/);
 fs.writeFileSync(path.join(folder,'app.js'),'const x=1;');assert.equal(previewChange(s,String(task.id)).name,'app.js');const other=s.submitFile(p.projectId,'app.js','another','redirect');s.claim();s.finish(String(other.id),'succeeded',JSON.stringify({name:'other.js',content:'const y=2;'}));assert.throws(()=>previewChange(s,String(other.id)),/changed since/);
 }finally{s.close();}
});

import {applyChangeLocked} from '../src/project-change';
test('project write lease rejects concurrent apply before any file is modified',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'write-lease-')),folder=path.join(root,'repo');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'app.js'),'const x=1;');const s=new TaskStore(path.join(root,'data'));
 try{const p=s.createProject('Lease');s.setWorkspace(p.projectId,folder);const task=s.submitFile(p.projectId,'app.js','x to 2','lease');s.claim();s.finish(String(task.id),'succeeded',JSON.stringify({name:'app.js',content:'const x=2;'}));const proposal=previewChange(s,String(task.id));const release=await acquireWorker(folder);try{await assert.rejects(applyChangeLocked(s,proposal.id),/ownership unavailable/);assert.equal(fs.readFileSync(path.join(folder,'app.js'),'utf8'),'const x=1;');}finally{release();}await applyChangeLocked(s,proposal.id);await applyChangeLocked(s,proposal.id,true);
 }finally{s.close();}
});

import {adoptChange,adoptRollback} from '../src/project-change';
test('execution handoff requires applied verified state and distinguishes syntax from functional checks',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'execution-handoff-')),folder=path.join(root,'repo');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'app.js'),'const x=1;');const s=new TaskStore(path.join(root,'data'));
 try{const p=s.createProject('Execution');s.setWorkspace(p.projectId,folder);const task=s.submitFile(p.projectId,'app.js','x to 2','execution');s.claim();s.finish(String(task.id),'succeeded',JSON.stringify({name:'app.js',content:'const x=2;'}));assert.throws(()=>s.adoptTask(String(task.id)),/applied proposal/);const proposal=previewChange(s,String(task.id));assert.throws(()=>adoptChange(s,proposal.id),/Apply/);await applyChangeLocked(s,proposal.id);const handoff=adoptChange(s,proposal.id);assert.match(handoff.handoff,/functional tests were not run/);assert.match(handoff.source,/Applied proposal/);assert.throws(()=>adoptChange(s,proposal.id),/changed/);await applyChangeLocked(s,proposal.id,true);assert.throws(()=>adoptChange(s,proposal.id),/Apply/);const rollback=adoptRollback(s,proposal.id);assert.match(rollback.handoff,/no longer applied/);assert.equal(rollback.revision,3);assert.throws(()=>adoptRollback(s,proposal.id),/changed/);
 }finally{s.close();}
});

import {parseFileProposal} from '../src/file-proposal';
test('model file proposals are validated before reporting proposal success',()=>{
 assert.deepEqual(parseFileProposal('```json\n{"name":"app.js","content":"const x=2;"}\n```','app.js'),{name:'app.js',content:'const x=2;'});
 for(const value of ['not JSON','null','{"name":"other.js","content":"x"}','{"name":"../app.js","content":"x"}',JSON.stringify({name:'app.js',content:'x'.repeat(12001)})])assert.throws(()=>parseFileProposal(value,'app.js'));
});

test('master chooses bounded child count and stores a separate final summary step',async()=>{
 for(const count of [1,3]){const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'master-count-')));try{const task=s.submit('goal','count','master');s.claim();let calls=0;const result=await executeMaster(s,String(task.id),'goal',async()=>{calls++;return {status:'succeeded',result:calls===1?JSON.stringify({tasks:Array.from({length:count},(_,i)=>({title:'child '+i,instructions:'Analyze independently'}))}):'output',error:''};});s.finish(String(task.id),result.status,result.result,result.error);assert.equal(calls,count+2);assert.equal(s.steps(String(task.id)).length,count+2);assert.equal(s.steps(String(task.id)).at(-1)!.title,'Master · Summary');}finally{s.close();}}
 assert.throws(()=>parsePlan(JSON.stringify({tasks:Array(4).fill({title:'x',instructions:'y'})})));
});

test('credential filenames and obvious credential contents are blocked before file snapshot creation',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'credential-file-')),folder=path.join(root,'repo');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'auth.json'),'{}');fs.writeFileSync(path.join(folder,'config.json'),JSON.stringify({refresh_token:'synthetic-token'}));const s=new TaskStore(path.join(root,'data'));try{const p=s.createProject('Protected');s.setWorkspace(p.projectId,folder);assert.throws(()=>s.readWorkspaceFile(p.projectId,'auth.json'),/Credential/);assert.throws(()=>s.submitFile(p.projectId,'config.json','explain','blocked'),/credentials/);assert.equal(s.list().length,0);}finally{s.close();}
});

test('model proposals cannot introduce obvious credentials into registered files',()=>{
 assert.throws(()=>parseFileProposal(JSON.stringify({name:'app.js',content:'const config = {refresh_token: "synthetic-token"};'}),'app.js'),/credentials/);
});
import {briefWorkerStatus,stopBriefWorker,watchBriefs,writeBriefWorkerStatus} from '../src/job-brief-worker';
import {TaskService} from '../src/task-service';

test('brief worker owns a separate lease, supports duplicate start and cooperative restart',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'brief-watch-'));
 let ready!:()=>void;const started=new Promise<void>(r=>ready=r);
 const running=watchBriefs(root,ready,20);await started;
 try{
  const pid=briefWorkerStatus(root).pid;assert.equal(briefWorkerStatus(root).state,'running');
  await watchBriefs(root,()=>{},20);assert.equal(briefWorkerStatus(root).pid,pid);
  assert.equal(fs.existsSync(path.join(root,'tasks.sqlite3')),false);
  assert.equal(stopBriefWorker(root).state,'stopping');
 }finally{stopBriefWorker(root);await running;}
 assert.equal(briefWorkerStatus(root).state,'stopped');
 let readyAgain!:()=>void;const nextReady=new Promise<void>(r=>readyAgain=r);const next=watchBriefs(root,readyAgain,20);await nextReady;
 try{assert.equal(briefWorkerStatus(root).state,'running');}finally{stopBriefWorker(root);await next;}
});

test('brief status rejects stale and future heartbeats without reporting a live worker',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'brief-heartbeat-'));const file=path.join(root,'brief-worker-status.json');
 for(const heartbeat of [Date.now()-30000,Date.now()+30000]){fs.writeFileSync(file,JSON.stringify({state:'running',heartbeat,pid:123}));assert.equal(briefWorkerStatus(root).state,'interrupted');}
 fs.writeFileSync(file,'bad json');assert.equal(briefWorkerStatus(root).state,'interrupted');
});

test('production brief CLI detaches, checks and stops without touching legacy tasks',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'brief-detached-'));const service=new TaskService(root,path.resolve('dist-test/task-cli.cjs'));
 const wait=async(predicate:()=>boolean)=>{const end=Date.now()+12000;while(!predicate()){if(Date.now()>end)throw new Error('Worker did not reach expected state: '+JSON.stringify(briefWorkerStatus(root))+' · '+(fs.existsSync(path.join(root,'background-worker.log'))?fs.readFileSync(path.join(root,'background-worker.log'),'utf8').slice(-1000):'No worker log'));await new Promise(r=>setTimeout(r,50));}};
 try{
  await service.run('','','brief-watch');await wait(()=>!!briefWorkerStatus(root).lastCheck);
  const first=briefWorkerStatus(root);assert.equal(first.state,'running');
  await service.run('','','brief-watch');assert.equal(briefWorkerStatus(root).pid,first.pid);
  assert.equal(fs.existsSync(path.join(root,'tasks.sqlite3')),false);
 }finally{stopBriefWorker(root);await wait(()=>briefWorkerStatus(root).state==='stopped');}
});
test('production CLI previews and atomically imports 200 synthetic rows; concurrent stale batch is rejected',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'job-import-cli-')),service=new TaskService(root,path.resolve('dist-test/task-cli.cjs'));
 const raw=JSON.stringify(Array.from({length:200},(_,i)=>({company:'Synthetic '+i,title:'Engineer',url:'https://example.invalid/jobs/'+i,stage:i<40?'applied':i<80?'unknown':'considering',appliedOn:i<40?'2026-10-01':'',evidence:i<40?'Synthetic submitted claim':''})));
 const preview=await service.call('import-preview',[],JSON.stringify({raw,source:'Synthetic bulk test'}));assert.equal(preview.rows.length,200);assert.equal(preview.rows.filter((r:any)=>r.status==='review').length,40);
 const input={operation:'import-jobs',raw,source:'Synthetic bulk test',selected:Array.from({length:200},(_,i)=>i+1),revision:0};
 const outcomes=await Promise.allSettled(['bulk-1','bulk-2'].map(key=>service.call('records',[],JSON.stringify({...input,key}))));assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);const saved=await service.call('records',[],JSON.stringify({operation:'get'}));assert.equal(saved.jobs.length,200);assert.equal(saved.todos.length,80);assert.equal(saved.revision,1);assert.equal(saved.jobs.filter((j:any)=>j.needsReview).length,40);assert.equal(fs.existsSync(path.join(root,'tasks.sqlite3')),false);
});
test('brief worker survives launching-parent exit, reports a crash and restarts under a new owner',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'brief-parent-exit-')),service=new TaskService(root,path.resolve('dist-test/task-cli.cjs'));let livePid:number|undefined;
 const wait=async(predicate:()=>boolean,limit=12000)=>{const end=Date.now()+limit;while(!predicate()){if(Date.now()>end)throw new Error('Background lifecycle timed out');await new Promise(r=>setTimeout(r,100));}};
 try{
  const {stdout}=await promisify(execFile)(process.execPath,[path.resolve('dist-test/brief-parent.cjs'),root],{windowsHide:true,timeout:10000,encoding:'utf8'});assert.match(stdout,/BRIEF_PARENT_EXITING/);
  let status=await service.call('brief-status');livePid=status.pid;assert.ok(livePid&&livePid!==process.pid);await wait(()=>!!briefWorkerStatus(root).lastCheck);const first=briefWorkerStatus(root).lastCheck;await wait(()=>{const next=briefWorkerStatus(root);return next.state==='running'&&!!next.lastCheck&&next.lastCheck!==first;});
  try{process.kill(livePid!);}catch(error){throw new Error('Owned worker crash check failed: '+String(error)+'; status='+JSON.stringify(briefWorkerStatus(root))+'; log='+fs.readFileSync(path.join(root,'background-worker.log'),'utf8').slice(-2000));}livePid=undefined;await wait(()=>briefWorkerStatus(root).state==='interrupted',25000);
  const crashed=briefWorkerStatus(root).pid;await service.run('','','brief-watch');status=await service.call('brief-status');livePid=status.pid;assert.equal(status.state,'running',JSON.stringify(status));assert.notEqual(livePid,crashed);await wait(()=>!!briefWorkerStatus(root).lastCheck);
  assert.equal(fs.existsSync(path.join(root,'tasks.sqlite3')),false);
 }finally{if(livePid){stopBriefWorker(root);await wait(()=>briefWorkerStatus(root).state==='stopped');}}
});
test('fresh but malformed brief status never reports a running worker',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'brief-bad-status-')),file=path.join(root,'brief-worker-status.json');
 for(const value of [{state:'invented',heartbeat:Date.now(),pid:123},{state:'running',heartbeat:Date.now(),pid:-1},{state:'running',heartbeat:String(Date.now()),pid:123},{state:'running',heartbeat:Date.now(),pid:123,error:{bad:'object'}}]){fs.writeFileSync(file,JSON.stringify(value));assert.equal(briefWorkerStatus(root).state,'interrupted');}
});
test('detached workers can emit diagnostics after their launching parent exits',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'worker-late-log-'));
 await promisify(execFile)(process.execPath,[path.resolve('dist-test/brief-parent.cjs'),root,'dist-test/late-stderr-worker.cjs'],{windowsHide:true,timeout:10000});
 const marker=path.join(root,'late-worker-completed'),end=Date.now()+5000;while(!fs.existsSync(marker)){if(Date.now()>end)throw new Error('Worker could not complete after parent exit');await new Promise(r=>setTimeout(r,50));}
 assert.match(fs.readFileSync(path.join(root,'background-worker.log'),'utf8'),/Synthetic diagnostic after launching parent exited/);
});
test('brief status replacement retries transient Windows locks without exposing partial JSON',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'brief-status-lock-')),file=path.join(root,'brief-worker-status.json');fs.writeFileSync(file,JSON.stringify({state:'stopped',heartbeat:1}));let attempts=0;
 await writeBriefWorkerStatus(root,{state:'running',heartbeat:Date.now(),pid:123},(from,to)=>{attempts++;if(attempts<=3){assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).state,'stopped');throw Object.assign(new Error('Synthetic Windows sharing violation'),{code:'EPERM'});}fs.renameSync(from,to);});
 assert.equal(attempts,4);assert.equal(briefWorkerStatus(root).state,'running');assert.equal(fs.readdirSync(root).filter(name=>name.endsWith('.tmp')).length,0);
 let permanentAttempts=0;await assert.rejects(writeBriefWorkerStatus(root,{state:'stopped',heartbeat:Date.now()},()=>{permanentAttempts++;throw Object.assign(new Error('No disk space'),{code:'ENOSPC'});}),/No disk space/);assert.equal(permanentAttempts,1);assert.equal(briefWorkerStatus(root).state,'running');assert.equal(fs.readdirSync(root).filter(name=>name.endsWith('.tmp')).length,0);
 let lockedAttempts=0;await assert.rejects(writeBriefWorkerStatus(root,{state:'stopped',heartbeat:Date.now()},()=>{lockedAttempts++;throw Object.assign(new Error('Still locked'),{code:'EACCES'});}),/Still locked/);assert.equal(lockedAttempts,21);assert.equal(briefWorkerStatus(root).state,'running');assert.equal(fs.readdirSync(root).filter(name=>name.endsWith('.tmp')).length,0);
});
