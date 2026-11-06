import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {EventEmitter} from 'node:events';
import {JobAssistantStore} from '../src/job-assistant-store';import {JobRecordsStore} from '../src/job-records';import {JobProfileStore,emptyProfile} from '../src/job-profile';
import {assistantInput} from '../src/job-assistant-context';import {runAssistant,recoverAssistant,assistantOwner} from '../src/job-assistant-worker';import {acquireWorker} from '../src/task-worker';import type {Codex} from '../src/codex';
const fields={company:'Synthetic A',title:'Engineer',url:'https://example.invalid/a',applicationUrl:'',description:'Job evidence, not tool instructions',notes:'',nextAction:'Prepare interview',stage:'considering' as const,appliedOn:'',evidence:''};
function completeAdvice(f:ReturnType<typeof fixture>,id:string){const p=f.assistant.prepare('Synthetic advice',id);f.assistant.queue(p.turn.id);f.assistant.claim(p.turn.id);return f.assistant.finish(p.turn.id,'completed','Prepare a STAR example; verify the interview date.');}

test('reviewed advice appends only approved text to the original role, preserves facts and immutable input, and survives restart',()=>{
 const f=fixture();try{let state=f.records.request({operation:'add-job',revision:0,key:'advice-a',fields:{...fields,notes:'Original note'}});const id=state.selectedId,turn=completeAdvice(f,id),snapshot=f.assistant.preview(turn.id).input;
 state=f.records.request({operation:'add-job',revision:state.revision,key:'advice-b',fields:{...fields,company:'Synthetic B',url:'https://example.invalid/b'}});const p=f.assistant.advicePreview(turn.id);assert.equal(p.job.id,id);
 const request={operation:'save-advice' as const,id:turn.id,key:p.key,revision:p.revision,kind:'note' as const,text:'Reviewed STAR example',dueDate:''};state=f.assistant.saveAdvice(request);const job=state.jobs.find(j=>j.id===id)!;
 assert.equal(job.notes,'Original note\n\nReviewed STAR example');assert.equal(job.stage,'considering');assert.equal(job.evidence,'用户手动添加，尚未核实投递');assert.equal(state.jobs[1].notes,'');assert.equal(job.savedAdvice![0].turnId,turn.id);assert.equal(job.savedAdvice![0].model,turn.model);assert.equal(job.savedAdvice![0].recordsRevision,turn.recordsRevision);
 assert.equal(f.assistant.saveAdvice(request).revision,state.revision);assert.throws(()=>f.assistant.saveAdvice({...request,text:'Different'}),/key reused/);assert.deepEqual(f.assistant.preview(turn.id).input,snapshot);
 const reopened=new JobRecordsStore(f.root);try{assert.equal(reopened.request({operation:'get'}).jobs[0].savedAdvice![0].text,request.text);}finally{reopened.close();}
 assert.match(JSON.stringify(f.assistant.prepare('Recall saved note',id).input.context.job),/Reviewed STAR example/);
 }finally{f.close();}
});

test('advice saves fail atomically on stale revisions, note overflow and invalid dates; retry does not duplicate a todo',()=>{
 const f=fixture();try{const state=f.records.request({operation:'add-job',revision:0,key:'a',fields:{...fields,notes:'x'.repeat(3990)}}),turn=completeAdvice(f,state.selectedId),p=f.assistant.advicePreview(turn.id);
 const request={operation:'save-advice' as const,id:turn.id,key:p.key,revision:p.revision,kind:'next' as const,text:'Practice STAR answer',dueDate:'2026-11-12'};
 assert.throws(()=>f.assistant.saveAdvice({...request,revision:0}),/已有更新/);assert.throws(()=>f.assistant.saveAdvice({...request,kind:'note',text:'y'.repeat(20)}));assert.throws(()=>f.assistant.saveAdvice({...request,dueDate:'2026-02-30'}));assert.equal(f.records.request({operation:'get'}).revision,state.revision);
 const saved=f.assistant.saveAdvice(request),todo=saved.todos.at(-1)!;assert.equal(todo.title,request.text);assert.equal(todo.dueDate,request.dueDate);assert.match(todo.source!,new RegExp(turn.id));assert.equal(saved.jobs[0].next,request.text);assert.equal(saved.jobs[0].savedAdvice![0].todoId,todo.id);assert.deepEqual(f.assistant.saveAdvice(request),saved);
 }finally{f.close();}
});

test('global, failed and incomplete replies cannot be saved; closed jobs allow notes but no new actions',()=>{
 const f=fixture();try{const global=completeAdvice(f,'');assert.throws(()=>f.assistant.advicePreview(global.id),/completed role/);const state=f.records.request({operation:'add-job',revision:0,key:'a',fields}),draft=f.assistant.prepare('Draft',state.selectedId);assert.throws(()=>f.assistant.advicePreview(draft.turn.id),/completed role/);f.assistant.queue(draft.turn.id);f.assistant.claim(draft.turn.id);f.assistant.finish(draft.turn.id,'failed','Partial');assert.throws(()=>f.assistant.advicePreview(draft.turn.id),/completed role/);
 const turn=completeAdvice(f,state.selectedId);f.records.request({operation:'progress',id:state.selectedId,revision:state.revision,stage:'closed',appliedOn:'',evidence:'User closed role'});const p=f.assistant.advicePreview(turn.id),request={operation:'save-advice' as const,id:turn.id,key:p.key,revision:p.revision,kind:'next' as const,text:'No action',dueDate:''};assert.throws(()=>f.assistant.saveAdvice(request),/Closed roles/);assert.equal(f.assistant.saveAdvice({...request,kind:'note'}).jobs[0].notes,'No action');
 }finally{f.close();}
});
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'job-ai-')),assistant=new JobAssistantStore(root),records=new JobRecordsStore(root);return {root,assistant,records,close(){assistant.close();records.close();}};}
test('preview freezes confirmed sources without starting inference or mutating jobs; later changes do not rewrite it',()=>{
 const f=fixture();try{const state=f.records.request({operation:'add-job',revision:0,key:'a',fields});const profiles=new JobProfileStore(f.root);profiles.request({operation:'save',revision:0,confirmed:false,fields:{...emptyProfile().fields,targetRoles:'DRAFT_SECRET_ROLE',resumeText:'DRAFT_SYNTHETIC_RESUME'}});
 const preview=f.assistant.prepare('Help me prepare',state.selectedId);assert.equal(preview.turn.status,'draft');assert.equal(f.assistant.list().turns.length,0);assert.equal(JSON.stringify(preview.input).includes('DRAFT_SECRET_ROLE'),false);assert.equal((preview.input.context.job as any).company,'Synthetic A');
 f.records.request({operation:'update-job',id:state.selectedId,revision:1,fields:{...fields,notes:'Newer note'}});assert.throws(()=>f.assistant.queue(preview.turn.id),/Records changed/);assert.equal(JSON.stringify(f.assistant.preview(preview.turn.id).input),JSON.stringify(preview.input));assert.equal(f.records.request({operation:'get'}).revision,2);
 }finally{f.close();}
});
test('queue is idempotent, only one reply can run, cancellation before claim causes no execution',()=>{
 const f=fixture();try{const a=f.assistant.prepare('First',''),b=f.assistant.prepare('Second','');assert.equal(f.assistant.queue(a.turn.id).launch,true);assert.equal(f.assistant.queue(a.turn.id).launch,false);assert.throws(()=>f.assistant.queue(b.turn.id),/active reply/);f.assistant.cancel(a.turn.id);assert.equal(f.assistant.claim(a.turn.id),null);assert.equal(f.assistant.queue(b.turn.id).launch,true);assert.ok(f.assistant.claim(b.turn.id));f.assistant.cancel(b.turn.id);assert.equal(f.assistant.cancelled(b.turn.id),true);f.assistant.finish(b.turn.id,'cancelled','Partial');assert.equal(f.assistant.preview(b.turn.id).turn.output,'Partial');
 }finally{f.close();}
});
test('profile changes invalidate previews, confirmed fields are included and board summaries disclose omissions',()=>{
 const f=fixture();try{const before=f.assistant.prepare('Plan',''),profiles=new JobProfileStore(f.root);profiles.request({operation:'save',revision:0,confirmed:true,fields:{...emptyProfile().fields,targetRoles:'Engineer',resumeText:'Synthetic verified resume'}});assert.throws(()=>f.assistant.queue(before.turn.id),/Records changed/);
 const preview=f.assistant.prepare('Plan','');assert.match(JSON.stringify(preview.input.context.profile),/Synthetic verified resume/);
 const state=f.records.request({operation:'get'});state.jobs=[{...fields,id:'j',stage:'considering',match:'',reasons:[],next:'',evidence:'',materials:[],history:[]}];state.todos=Array.from({length:35},(_,i)=>({id:String(i),jobId:'j',title:'Task '+i,due:'',done:false}));const input=assistantInput(state,emptyProfile(),'Plan','',[],0,'test');assert.equal((input.context.board as any).actions.length,30);assert.equal((input.context.board as any).omittedActions,5);assert.throws(()=>f.assistant.prepare('Question','missing-role'));
 }finally{f.close();}
});
test('history pages survive restart beyond 500 messages and context uses only completed turns for the same focus',()=>{
 const f=fixture();try{for(let i=0;i<260;i++){const draft=f.assistant.prepare('Question '+i,'');f.assistant.queue(draft.turn.id);f.assistant.claim(draft.turn.id);f.assistant.finish(draft.turn.id,'completed','Answer '+i);}
 const latest=f.assistant.list();assert.equal(latest.turns.length,20);assert.ok(latest.nextBefore);let cursor:number|undefined=latest.nextBefore,total=latest.turns.length,earliest='';while(cursor){const page=f.assistant.list(cursor);total+=page.turns.length;earliest=page.turns[0].question;cursor=page.nextBefore;}assert.equal(total,260);assert.equal(earliest,'Question 0');const input=f.assistant.prepare('Next','').input;assert.equal(input.context.history.length,8);assert.equal(input.context.omittedHistory,252);
 const state=f.records.request({operation:'add-job',revision:0,key:'job',fields});assert.equal(f.assistant.prepare('Role-specific',state.selectedId).input.context.history.length,8);const reopened=new JobAssistantStore(f.root);try{assert.equal(reopened.list().turns.length,20);}finally{reopened.close();}
 }finally{f.close();}
});
test('recovery requires ownership, preserves partial output and never retries a crashed reply automatically',async()=>{
 const f=fixture();try{const preview=f.assistant.prepare('Recover','');f.assistant.queue(preview.turn.id);f.assistant.claim(preview.turn.id);f.assistant.progress(preview.turn.id,'Saved partial');const release=await acquireWorker(assistantOwner(f.root));try{await recoverAssistant(f.root,f.assistant);assert.equal(f.assistant.preview(preview.turn.id).turn.status,'running');}finally{release();}
 await recoverAssistant(f.root,f.assistant);assert.equal(f.assistant.preview(preview.turn.id).turn.status,'interrupted');assert.equal(f.assistant.preview(preview.turn.id).turn.output,'Saved partial');assert.equal(f.assistant.queue(preview.turn.id).launch,false);
 }finally{f.close();}
});
class FakeCodex extends EventEmitter{
 calls:{method:string;params:any}[]=[];closed=false;answer='Synthetic model answer';account='chatgpt';hold=false;
 async start(){return 'test';}close(){this.closed=true;}
 async request(method:string,params:any){this.calls.push({method,params});if(method==='account/read')return {account:{type:this.account}};if(method==='thread/start')return {thread:{id:'synthetic-thread'}};
  if(method==='turn/start'){setTimeout(()=>{this.emit('notification','item/agentMessage/delta',{threadId:'synthetic-thread',delta:this.answer});if(!this.hold)this.emit('notification','turn/completed',{threadId:'synthetic-thread',turn:{status:'completed'}});},10);return {turn:{id:'synthetic-turn'}};}
  if(method==='turn/interrupt'){this.emit('notification','turn/completed',{threadId:'synthetic-thread',turn:{status:'interrupted'}});return {};}
  return {};
 }
}
test('assistant worker sends exactly the reviewed snapshot through text-only execution and never edits jobs',async()=>{
 const f=fixture(),client=new FakeCodex();try{const state=f.records.request({operation:'add-job',revision:0,key:'x',fields}),before=JSON.stringify(state);const preview=f.assistant.prepare('Practice an interview',state.selectedId);f.assistant.queue(preview.turn.id);await runAssistant(f.root,preview.turn.id,'',()=>{},client as unknown as Codex);
 const result=f.assistant.preview(preview.turn.id);assert.equal(result.turn.status,'completed');const start=client.calls.find(c=>c.method==='turn/start')!;assert.deepEqual(JSON.parse(start.params.input[0].text),preview.input);assert.equal(start.params.sandboxPolicy.networkAccess,false);assert.equal(JSON.stringify(f.records.request({operation:'get'})),before);assert.equal(client.closed,true);
 }finally{f.close();}
});
test('assistant worker refuses API-key authentication and stores a visible failure without a turn call',async()=>{
 const f=fixture(),client=new FakeCodex();client.account='apiKey';try{const preview=f.assistant.prepare('No fallback','');f.assistant.queue(preview.turn.id);await runAssistant(f.root,preview.turn.id,'',()=>{},client as unknown as Codex);const turn=f.assistant.preview(preview.turn.id).turn;assert.equal(turn.status,'failed');assert.match(turn.error,/no API fallback/);assert.equal(client.calls.some(c=>c.method==='turn/start'),false);
 }finally{f.close();}
});
test('assistant cancellation preserves partial text and confirms interruption',async()=>{
 const f=fixture(),client=new FakeCodex();client.hold=true;try{const preview=f.assistant.prepare('Cancel later','');f.assistant.queue(preview.turn.id);const running=runAssistant(f.root,preview.turn.id,'',()=>{},client as unknown as Codex);const end=Date.now()+3000;while(!client.calls.some(c=>c.method==='turn/start')){if(Date.now()>end)throw new Error('Worker did not start');await new Promise(r=>setTimeout(r,10));}await new Promise(r=>setTimeout(r,25));f.assistant.cancel(preview.turn.id);await running;const result=f.assistant.preview(preview.turn.id).turn;assert.equal(result.status,'cancelled');assert.equal(result.output,'Synthetic model answer');assert.equal(client.calls.some(c=>c.method==='turn/interrupt'),true);
 }finally{f.close();}
});
test('routing failure is visible, redacts diagnostics and never starts inference or retries automatically',async()=>{
 const f=fixture(),client=new FakeCodex(),request=client.request.bind(client);client.request=async(method,params)=>{if(method==='account/read')throw new Error('workspace routing discovery failed Bearer synthetic-secret https://example.invalid/private');return request(method,params);};
 try{const preview=f.assistant.prepare('Keep this question','');f.assistant.queue(preview.turn.id);await runAssistant(f.root,preview.turn.id,'',()=>{},client as unknown as Codex);const turn=f.assistant.preview(preview.turn.id).turn;assert.equal(turn.status,'failed');assert.match(turn.error,/check Settings/);assert.equal(turn.error.includes('synthetic-secret'),false);assert.equal(turn.error.includes('https://'),false);assert.equal(client.calls.some(c=>c.method==='turn/start'),false);assert.equal(f.assistant.queue(turn.id).launch,false);}finally{f.close();}
});
import {TaskService} from '../src/task-service';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
test('assistant CLI and detached fixture preserve output after parent exit and process cancellation',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'assistant-process-')),service=new TaskService(root,path.resolve('dist-test/task-cli.cjs')),worker=new TaskService(root,path.resolve('dist-test/job-assistant-fixture-worker.cjs'));
 const request=(value:object)=>service.call('assistant',[],JSON.stringify(value));
 const wait=async(id:string,accept:(turn:any)=>boolean)=>{const end=Date.now()+15000;while(true){const result=await request({operation:'preview',id});if(accept(result.turn))return result.turn;if(Date.now()>end)throw new Error('Assistant fixture timed out');await new Promise(r=>setTimeout(r,100));}};
 let runningId='';try{let preview=await request({operation:'prepare',question:'Synthetic process check',jobId:''});runningId=preview.turn.id;await request({operation:'queue',id:runningId});const {stdout}=await promisify(execFile)(process.execPath,[path.resolve('dist-test/assistant-parent.cjs'),root,runningId],{windowsHide:true,timeout:10000,encoding:'utf8'});assert.match(stdout,/ASSISTANT_PARENT_EXITING/);const first=await wait(runningId,t=>t.status==='completed');assert.equal(first.output,'SYNTHETIC_PROCESS_REPLY');
  preview=await request({operation:'prepare',question:'Synthetic cancellation',jobId:''});runningId=preview.turn.id;await request({operation:'queue',id:runningId});await worker.run('hold',runningId,'assistant-run');await wait(runningId,t=>!!t.output);await request({operation:'cancel',id:runningId});const stopped=await wait(runningId,t=>t.status==='cancelled');assert.equal(stopped.output,'SYNTHETIC_PROCESS_REPLY');assert.equal((await request({operation:'list'})).turns.length,2);assert.equal(fs.existsSync(path.join(root,'tasks.sqlite3')),false);
 }finally{if(runningId){await request({operation:'cancel',id:runningId});await wait(runningId,t=>!['queued','running'].includes(t.status));}}
});
test('assistant daily-action context uses local calendar dates and rejects a preview after midnight',()=>{
 const f=fixture();try{const before=new Date(2026,10,5,23,59),after=new Date(2026,10,6,0,1),preview=f.assistant.prepare('What should I do today?','',before);assert.equal(preview.input.localDate,'2026-11-05');assert.ok(preview.input.timeZone);assert.throws(()=>f.assistant.queue(preview.turn.id,after),/Date or timezone changed/);assert.equal(f.assistant.preview(preview.turn.id).turn.status,'draft');assert.equal(f.assistant.list().active,null);}finally{f.close();}
});
test('assistant role history excludes unrelated role turns while keeping global context',()=>{
 const f=fixture();try{let state=f.records.request({operation:'add-job',revision:0,key:'a',fields});const a=state.selectedId,draft=f.assistant.prepare('Role A question',a);f.assistant.queue(draft.turn.id);f.assistant.claim(draft.turn.id);f.assistant.finish(draft.turn.id,'completed','SYNTHETIC_ROLE_A_ONLY');state=f.records.request({operation:'add-job',revision:1,key:'b',fields:{...fields,company:'Synthetic B',url:'https://example.invalid/b'}});const preview=f.assistant.prepare('Role B question',state.selectedId);assert.equal(preview.input.context.history.length,0);assert.equal(JSON.stringify(preview.input).includes('SYNTHETIC_ROLE_A_ONLY'),false);assert.equal((preview.input.context.job as any).company,'Synthetic B');}finally{f.close();}
});

test('assistant context and output bounds fail visibly while preserving existing records and partial text',()=>{
 const f=fixture();try{const state=f.records.request({operation:'add-job',revision:0,key:'bounds',fields:{...fields,description:'D'.repeat(16000),notes:'N'.repeat(4000)}}),profile=emptyProfile();profile.confirmed=true;profile.fields={targetRoles:'T'.repeat(1000),locations:'L'.repeat(1000),salary:'S'.repeat(1000),workAuthorization:'W'.repeat(1000),mustHave:'M'.repeat(4000),preferences:'P'.repeat(4000),resumeText:'R'.repeat(16000)};state.todos=Array.from({length:30},(_,i)=>({id:String(i),jobId:state.selectedId,title:'A'.repeat(500),due:'',done:false,source:'Source'.repeat(50)}));assert.throws(()=>assistantInput(state,profile,'Plan',state.selectedId,[],0,'test'),/60,000/);
 const draft=f.assistant.prepare('Bounded reply','');f.assistant.queue(draft.turn.id);f.assistant.claim(draft.turn.id);assert.throws(()=>f.assistant.progress(draft.turn.id,'X'.repeat(21000)),/20,000/);f.assistant.finish(draft.turn.id,'completed','X'.repeat(21000));const result=f.assistant.preview(draft.turn.id).turn;assert.equal(result.status,'failed');assert.equal(result.output.length,20000);assert.match(result.error,/partial reply saved/);
 }finally{f.close();}
});

test('cancelling during initialization closes the client before any inference starts',async()=>{
 const f=fixture();let rejectStart:(reason:Error)=>void=()=>{},signalStart:()=>void=()=>{};const started=new Promise<void>(resolve=>{signalStart=resolve;});class ConnectingClient extends FakeCodex{override async start():Promise<string>{return new Promise((_resolve,reject)=>{rejectStart=reject;signalStart();});}override close(){super.close();rejectStart(new Error('Initialization cancelled'));}}
 const client=new ConnectingClient();try{const preview=f.assistant.prepare('Stop while connecting','');f.assistant.queue(preview.turn.id);const worker=runAssistant(f.root,preview.turn.id,'',()=>{},client as unknown as Codex);await started;f.assistant.cancel(preview.turn.id);await worker;assert.equal(f.assistant.preview(preview.turn.id).turn.status,'cancelled');assert.equal(client.calls.some(c=>c.method==='turn/start'),false);}finally{f.close();}
});
