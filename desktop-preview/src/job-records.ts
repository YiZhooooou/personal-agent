import {reviseTodo,recordTodoChange} from './job-todo';
import type {TodoAction} from './job-todo';
import {prepareJobImport} from './job-import';
import {jobText as text,fieldsOf} from './job-fields';
export {canonicalJobUrl} from './job-fields';
import {buildDailyBrief} from './job-brief';
import type {BriefRequest,BriefResponse,BriefMeta,DailyBrief} from './job-brief';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import {randomUUID,createHash} from 'node:crypto';
import type {DemoJob,DemoTodo,JobDemoState,JobStage,DemoRequest} from './job-demo';
import {jobStages} from './job-demo';import {JobProfileStore} from './job-profile';import {localDay,validDay,addDays,pendingTodo} from './job-dates';
export interface JobFields{company:string;title:string;url:string;applicationUrl:string;description:string;notes:string;nextAction:string;}
export interface NewJobFields extends JobFields{stage:JobStage;appliedOn:string;evidence:string;}
export type JobRequest=(DemoRequest|{operation:'revise-todo';id:string;action:TodoAction;dueDate:string;reason:string}|{operation:'import-jobs';key:string;raw:string;source:string;selected:number[]}|{operation:'add-job';key:string;fields:NewJobFields}|{operation:'update-job';id:string;fields:JobFields}|{operation:'add-todo';id:string;title:string;dueDate:string}|{operation:'progress';id:string;stage:JobStage;appliedOn:string;evidence:string})&{revision?:number;jobId?:string};
function empty():JobDemoState{return {version:1,demo:false,revision:0,selectedId:'',jobs:[],todos:[],messages:[{id:'welcome',role:'assistant',jobId:'',text:'这里保存你的正式岗位记录，与示例完全分开。可以手动添加岗位、记录投递依据和安排跟进。目前回复仍为本地摘要，不调用 AI、不读取邮箱、不提交申请。'}]};}
const nextSteps:Record<JobStage,string>={considering:'核对岗位条件，决定是否准备申请',preparing:'准备申请材料，提交前由你审核',applied:'等待回复并按计划跟进',interview:'确认面试安排并准备材料',closed:'机会已结束；复核尚未完成的待办'};
// shortcut: one transactional aggregate; normalize/index before large histories or server-side paging.
export class JobRecordsStore{
 private db:DatabaseSync;
 constructor(private root:string){fs.mkdirSync(root,{recursive:true});this.db=new DatabaseSync(path.join(root,'job-records.sqlite3'));this.db.exec('PRAGMA busy_timeout=5000');if(!this.db.prepare("SELECT 1 FROM sqlite_master WHERE name='job_state'").get())this.db.exec('CREATE TABLE IF NOT EXISTS job_state(singleton INTEGER PRIMARY KEY CHECK(singleton=1),payload TEXT NOT NULL)');}
 close(){this.db.close();}
 private read():JobDemoState{const row=this.db.prepare('SELECT payload FROM job_state WHERE singleton=1').get();if(!row)return empty();const s=JSON.parse(String(row.payload));if(s.version!==1||s.demo!==false||!Number.isSafeInteger(s.revision)||!Array.isArray(s.jobs)||!Array.isArray(s.todos)||!Array.isArray(s.messages))throw new Error('岗位数据库格式无法读取，原记录未修改');return s;}
 previewImport(raw:unknown,source:unknown,now=new Date()){return prepareJobImport(raw,source,this.read(),now);}
 briefing(input:unknown,now=new Date()):BriefResponse{
  if(!input||typeof input!=='object')throw new Error('Invalid brief request');const r=input as BriefRequest,today=localDay(now);
  if(!['check','list','read'].includes(r.operation))throw new Error('Unsupported brief operation');
  if(!this.db.prepare("SELECT 1 FROM sqlite_master WHERE name='daily_briefs'").get())this.db.exec('CREATE TABLE IF NOT EXISTS daily_briefs(day TEXT PRIMARY KEY,payload TEXT NOT NULL,seen_at TEXT)');
  const metadata=(row:Record<string,unknown>):BriefMeta=>{const brief=JSON.parse(String(row.payload)) as DailyBrief;return {day:brief.day,createdAt:brief.createdAt,seenAt:row.seen_at?String(row.seen_at):null,counts:brief.counts};};
  if(r.operation==='list'){if(r.before!==undefined&&!validDay(r.before))throw new Error('Invalid history cursor');const rows=this.db.prepare('SELECT payload,seen_at FROM daily_briefs WHERE (? IS NULL OR day<?) ORDER BY day DESC LIMIT 21').all(r.before??null,r.before??null);const history=rows.slice(0,20).map(metadata);return {status:'history',today,history,...(rows.length>20?{nextBefore:history.at(-1)!.day}:{})};}
  this.db.exec('BEGIN IMMEDIATE');try{
   if(r.operation==='read'){if(!validDay(r.day))throw new Error('Invalid brief date');const row=this.db.prepare('SELECT payload,seen_at FROM daily_briefs WHERE day=?').get(r.day);if(!row)throw new Error('这一天没有已生成的简报');const seenAt=row.seen_at?String(row.seen_at):now.toISOString();this.db.prepare('UPDATE daily_briefs SET seen_at=? WHERE day=?').run(seenAt,r.day);const brief=JSON.parse(String(row.payload)) as DailyBrief;this.db.exec('COMMIT');return {status:'read',today,brief,meta:{...metadata(row),seenAt}};}
   const existing=this.db.prepare('SELECT payload,seen_at FROM daily_briefs WHERE day=?').get(today);if(existing){this.db.exec('COMMIT');return {status:'existing',today,meta:metadata(existing)};}
   const newest=this.db.prepare('SELECT day FROM daily_briefs ORDER BY day DESC LIMIT 1').get();if(newest&&String(newest.day)>today){this.db.exec('COMMIT');return {status:'clock-blocked',today};}
   if(now.getHours()<10){this.db.exec('COMMIT');return {status:'scheduled',today};}
   const brief=buildDailyBrief(this.read(),now);this.db.prepare('INSERT INTO daily_briefs(day,payload,seen_at) VALUES(?,?,NULL)').run(today,JSON.stringify(brief));this.db.exec('COMMIT');return {status:'created',today,meta:{day:today,createdAt:brief.createdAt,seenAt:null,counts:brief.counts}};
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 request(input:unknown,now=new Date()):JobDemoState{
  if(!input||typeof input!=='object')throw new Error('Invalid job request');const r=input as JobRequest;if(r.operation==='get')return this.read();
  this.db.exec('BEGIN IMMEDIATE');try{const state=this.read();let importHash='';if(r.operation==='import-jobs'){text(r.key,100,true);importHash=createHash('sha256').update(JSON.stringify({raw:r.raw,source:r.source,selected:r.selected})).digest('hex');this.db.exec('CREATE TABLE IF NOT EXISTS job_imports(request_key TEXT PRIMARY KEY,hash TEXT NOT NULL)');const prior=this.db.prepare('SELECT hash FROM job_imports WHERE request_key=?').get(r.key);if(prior){if(prior.hash!==importHash)throw new Error('导入标识已用于不同内容 / Import key reused with different input');this.db.exec('COMMIT');return state;}}let clean:NewJobFields|undefined;
   if(r.operation==='add-job'){const base=fieldsOf(r.fields);if(typeof r.key!=='string'||!r.key||r.key.length>100)throw new Error('Invalid creation key');if(!jobStages.includes(r.fields.stage))throw new Error('Invalid job stage');clean={...base,stage:r.fields.stage,appliedOn:text(r.fields.appliedOn,10),evidence:text(r.fields.evidence,2000)};const prior=state.jobs.find(j=>j.requestKey===r.key);if(prior){if(prior.creationHash!==createHash('sha256').update(JSON.stringify(clean)).digest('hex'))throw new Error('创建标识已用于另一条记录，请重新打开新增表单');this.db.exec('COMMIT');return state;}}
   if(r.revision!==state.revision)throw new Error('岗位记录已有更新，请重新读取；表单输入仍会保留。');const stamp=now.toISOString();
   const job=('id' in r)?state.jobs.find(j=>j.id===r.id):undefined;
   const checkUrl=(url:string,except='')=>{if(url&&state.jobs.some(j=>j.id!==except&&j.url===url))throw new Error('这个岗位链接已经存在，请搜索并打开已有记录');};
   const progress=(target:DemoJob,stage:JobStage,appliedOn:string,evidence:string)=>{
    if(!jobStages.includes(stage))throw new Error('Invalid stage');const basis=text(evidence,2000,true),day=text(appliedOn,10);if(stage==='applied'&&(!validDay(day)||day>localDay(now)))throw new Error('请填写有效的投递日期，不能晚于今天');if(day&&!validDay(day))throw new Error('投递日期格式无效');
    for(const todo of state.todos.filter(t=>t.jobId===target.id&&(t.kind==='followup'||t.kind==='review')&&pendingTodo(t))){const reason=todo.kind==='review'?'已记录新的进度依据，旧核对任务已取消':'进度记录已更新，旧跟进安排已取消';recordTodoChange(todo,'cancel',reason,now);todo.superseded=true;todo.cancelled=true;todo.resolution=reason;}
    target.history.push({at:stamp,stage,source:'用户记录：'+basis,fromStage:target.stage,previousEvidence:target.evidence,previousAppliedOn:target.appliedOn,...(stage==='applied'?{appliedOn:day}:{})});target.stage=stage;target.needsReview=false;target.evidence=basis;target.updatedAt=stamp;target.next=nextSteps[stage];if(stage==='applied'){target.appliedOn=day;state.todos.push({id:randomUUID(),jobId:target.id,title:'投递满七天：核对回复并准备跟进草稿',due:addDays(day,7),dueDate:addDays(day,7),done:false,kind:'followup',anchor:day,source:'用户记录的投递日期 + 7 天；发送由用户决定'});}
   };
   if(r.operation==='import-jobs'){
    const preview=prepareJobImport(r.raw,r.source,state,now);
    if(!Array.isArray(r.selected)||!r.selected.length||r.selected.length>200||new Set(r.selected).size!==r.selected.length||r.selected.some(n=>!Number.isSafeInteger(n)))throw new Error('请选择不重复的导入行 / Select distinct import rows');
    for(const index of r.selected){const row=preview.rows.find(v=>v.row===index);if(!row?.fields||!['ready','review'].includes(row.status))throw new Error('预览已变化或选中行不可导入，请重新预览 / Preview changed or invalid row; preview again');const f=row.fields;
     const item:DemoJob={...f,appliedOn:undefined,id:randomUUID(),stage:'considering',match:'尚未评估',reasons:['尚未运行真实匹配分析，不生成分数'],next:f.nextAction||nextSteps[f.stage],evidence:f.evidence||'用户审核导入 / Reviewed import',materials:[],history:[],createdAt:stamp,updatedAt:stamp,needsReview:row.status==='review',importSource:{batchId:r.key,row:index,source:preview.source,importedAt:stamp,reportedStage:row.reportedStage||'unknown',reportedAppliedOn:row.reportedAppliedOn||''}};
     if(f.stage!=='considering'||f.evidence)progress(item,f.stage,f.appliedOn,f.evidence);item.needsReview=row.status==='review';item.next=f.nextAction||(item.needsReview?'核对旧资料中的投递状态与日期':nextSteps[f.stage]);state.jobs.push(item);
     if((f.nextAction||item.needsReview)&&f.stage!=='closed')state.todos.push({id:randomUUID(),jobId:item.id,title:f.nextAction||item.next,due:'待安排',done:false,kind:f.nextAction?'manual':'review',source:'审核导入：'+preview.source});
    }
    if(!state.selectedId)state.selectedId=state.jobs.at(0)?.id||'';
    if(state.jobs.length>10000)throw new Error('本机原型已达一万条记录上限');this.db.prepare('INSERT INTO job_imports(request_key,hash) VALUES(?,?)').run(r.key,importHash);
   }
   else if(r.operation==='add-job'&&clean){checkUrl(clean.url);if(state.jobs.length>=10000)throw new Error('本机原型已达一万条记录上限');const item:DemoJob={...clean,appliedOn:undefined,id:randomUUID(),stage:'considering',match:'尚未评估',reasons:['尚未运行真实匹配分析，不生成分数'],next:clean.nextAction||nextSteps[clean.stage],evidence:'用户手动添加，尚未核实投递',materials:[],history:[],createdAt:stamp,updatedAt:stamp,requestKey:r.key,creationHash:createHash('sha256').update(JSON.stringify(clean)).digest('hex')};if(clean.appliedOn&&!validDay(clean.appliedOn))throw new Error('投递日期格式无效');if(clean.stage!=='considering'||clean.evidence)progress(item,clean.stage,clean.appliedOn,clean.evidence);state.jobs.push(item);state.selectedId=item.id;if(clean.nextAction&&clean.stage!=='closed')state.todos.push({id:randomUUID(),jobId:item.id,title:clean.nextAction,due:'待安排',done:false,kind:'manual',source:'用户添加岗位时指定'});}
   else if(r.operation==='update-job'){if(!job)throw new Error('岗位不存在');const f=fieldsOf(r.fields);checkUrl(f.url,job.id);Object.assign(job,{company:f.company,title:f.title,url:f.url,applicationUrl:f.applicationUrl,description:f.description,notes:f.notes,next:f.nextAction||job.next,updatedAt:stamp});}
   else if(r.operation==='progress'){if(!job)throw new Error('岗位不存在');progress(job,r.stage,r.appliedOn,r.evidence);}
   else if(r.operation==='stage'){throw new Error('正式记录更改阶段需要日期与依据，请使用进度表单');}
   else if(r.operation==='select'){if(!job)throw new Error('岗位不存在');state.selectedId=job.id;}
   else if(r.operation==='add-todo'){if(!job||job.stage==='closed')throw new Error('已结束或不存在的岗位不能新增待办');const title=text(r.title,500,true),day=text(r.dueDate,10,true);if(!validDay(day))throw new Error('请填写有效的待办日期');state.todos.push({id:randomUUID(),jobId:job.id,title,due:day,dueDate:day,done:false,kind:'manual',source:'用户手动安排'});}
   else if(r.operation==='revise-todo'){const todo=state.todos.find(t=>t.id===r.id),owner=state.jobs.find(j=>j.id===todo?.jobId);if(!todo||!owner)throw new Error('待办不存在 / Task not found');reviseTodo(todo,owner,r.action,r.dueDate,r.reason,now);}
   else if(r.operation==='todo'){const todo=state.todos.find(t=>t.id===r.id);if(!todo||todo.cancelled||typeof r.done!=='boolean')throw new Error('待办不存在或已取消');if(todo.done!==r.done)recordTodoChange(todo,r.done?'complete':'reopen','用户更新待办完成状态 / User changed completion status',now);todo.done=r.done;todo.completedAt=r.done?stamp:undefined;}
   else if(r.operation==='message'){const message=text(r.text,4000,true);if(state.messages.length>=500)throw new Error('本机摘要会话已达500条上限，未删除已有记录');const profile=new JobProfileStore(this.root).request({operation:'get'}),selected=state.jobs.find(j=>j.id===(r.jobId??state.selectedId))||null,todos=state.todos.filter(t=>t.jobId===selected?.id);state.messages.push({id:randomUUID(),role:'user',text:message,jobId:selected?.id||'',context:{profile:{revision:profile.revision,confirmed:profile.confirmed,...(profile.confirmed?{fields:profile.fields}:{})},job:selected?structuredClone(selected):null,todos:structuredClone(todos)}});state.messages.push({id:randomUUID(),role:'assistant',jobId:selected?.id||'',text:'【本地记录摘要，非 AI 回复】\n'+(selected?selected.company+' / '+selected.title+'\n下一步：'+selected.next+'\n依据：'+selected.evidence:'请先添加或选择岗位。')+'\n未完成待办：'+(todos.filter(pendingTodo).map(t=>t.title+'（'+t.due+'）').join('；')||'暂无')+'\n尚未分析职位或简历，未执行外部操作。'});}
   else throw new Error('Unsupported job operation');
   state.revision=(state.revision||0)+1;if(Buffer.byteLength(JSON.stringify(state),'utf8')>5*1024*1024)throw new Error('本机记录达到当前原型5MB上限，原记录未修改；需升级存储分页方案后再继续新增。');this.db.prepare('INSERT INTO job_state(singleton,payload) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET payload=excluded.payload').run(JSON.stringify(state));this.db.exec('COMMIT');return state;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
}
