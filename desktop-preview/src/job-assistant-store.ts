import {localDay} from './job-dates';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {JobRecordsStore} from './job-records';import {JobProfileStore} from './job-profile';
import {assistantInput,ASSISTANT_INSTRUCTIONS} from './job-assistant-context';import {MODEL} from './codex';
import type {AssistantTurn,AssistantPreview,AssistantInput,AssistantPage,AssistantStatus} from './job-assistant-types';
type Row=Record<string,unknown>;
export class JobAssistantStore{
 private db:DatabaseSync;
 constructor(private root:string){fs.mkdirSync(root,{recursive:true});this.db=new DatabaseSync(path.join(root,'job-assistant.sqlite3'));this.db.exec('PRAGMA busy_timeout=5000');if(!this.db.prepare("SELECT 1 FROM sqlite_master WHERE name='assistant_turns'").get())this.db.exec('CREATE TABLE IF NOT EXISTS assistant_turns(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,job_id TEXT NOT NULL,question TEXT NOT NULL,input TEXT NOT NULL,status TEXT NOT NULL,output TEXT NOT NULL DEFAULT \'\',error TEXT NOT NULL DEFAULT \'\',cancel_requested INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL,updated TEXT NOT NULL)');if(!this.db.prepare("SELECT 1 FROM sqlite_master WHERE name='assistant_status'").get())this.db.exec('CREATE INDEX IF NOT EXISTS assistant_status ON assistant_turns(status,updated)');if(!this.db.prepare("SELECT 1 FROM sqlite_master WHERE name='assistant_history'").get())this.db.exec('CREATE INDEX IF NOT EXISTS assistant_history ON assistant_turns(job_id,status,seq)');}
 close(){this.db.close();}
 private row(id:string){if(typeof id!=='string'||id.length>100)throw new Error('Invalid assistant turn');const row=this.db.prepare('SELECT * FROM assistant_turns WHERE id=?').get(id);if(!row)throw new Error('回复记录不存在 / Turn not found');return row;}
 private turn(row:Row):AssistantTurn{const input=JSON.parse(String(row.input)) as AssistantInput;return {seq:Number(row.seq),id:String(row.id),jobId:String(row.job_id),jobLabel:input.context.job?String((input.context.job as {company:string;title:string}).company)+' · '+String((input.context.job as {company:string;title:string}).title):'全局求职行动',question:String(row.question),status:row.status as AssistantStatus,output:String(row.output),error:String(row.error),cancelRequested:!!row.cancel_requested,createdAt:String(row.created),updatedAt:String(row.updated),model:input.model,recordsRevision:input.recordsRevision,profileRevision:input.profileRevision};}
 private records(){const records=new JobRecordsStore(this.root);try{return records.request({operation:'get'});}finally{records.close();}}
 preview(id:string):AssistantPreview{const row=this.row(id),input=JSON.parse(String(row.input));return {turn:this.turn(row),input,characters:String(row.input).length};}
 prepare(question:unknown,jobId:unknown,now=new Date()):AssistantPreview{
  if(typeof jobId!=='string')throw new Error('Invalid job selection');
  const history=this.db.prepare("SELECT question,output,job_id,input FROM assistant_turns WHERE status='completed' AND (job_id=? OR job_id='') ORDER BY seq DESC LIMIT 8").all(jobId).reverse().map(r=>{const job=JSON.parse(String(r.input)).context.job;return {question:String(r.question),answer:String(r.output),jobId:String(r.job_id),jobLabel:job?job.company+' · '+job.title:'Global job search'};});
  const count=Number(this.db.prepare("SELECT count(*) AS n FROM assistant_turns WHERE status='completed' AND (job_id=? OR job_id='')").get(jobId)!.n);
  const input=assistantInput(this.records(),new JobProfileStore(this.root).request({operation:'get'}),question,jobId,history,count,MODEL,now),id=randomUUID(),stamp=now.toISOString();
  this.db.prepare("INSERT INTO assistant_turns(id,job_id,question,input,status,created,updated) VALUES(?,?,?,?, 'draft',?,?)").run(id,input.jobId,input.question,JSON.stringify(input),stamp,stamp);return this.preview(id);
 }
 active(){const row=this.db.prepare("SELECT id,status FROM assistant_turns WHERE status IN ('queued','running') ORDER BY seq DESC LIMIT 1").get();return row?{id:String(row.id),status:String(row.status)}:null;}
 list(before?:number):AssistantPage{
  if(before!==undefined&&(!Number.isSafeInteger(before)||before<1))throw new Error('Invalid history cursor');
  const rows=this.db.prepare("SELECT * FROM assistant_turns WHERE status!='draft' AND (? IS NULL OR seq<?) ORDER BY seq DESC LIMIT 21").all(before??null,before??null);
  const page=rows.slice(0,20),active=this.db.prepare("SELECT * FROM assistant_turns WHERE status IN ('queued','running') ORDER BY seq DESC LIMIT 1").get();
  return {turns:page.reverse().map(r=>this.turn(r)),active:active?this.turn(active):null,...(rows.length>20?{nextBefore:Number(page[0].seq)}:{})};
 }
 queue(id:string,now=new Date()){
  this.db.exec('BEGIN IMMEDIATE');try{const row=this.row(id);if(row.status!=='draft'){this.db.exec('COMMIT');return {turn:this.turn(row),launch:false};}
   if(this.db.prepare("SELECT 1 FROM assistant_turns WHERE status IN ('queued','running')").get())throw new Error('已有 Master 回复进行中，请先完成或停止 / Finish or stop the active reply');
   const input=JSON.parse(String(row.input)) as AssistantInput,profile=new JobProfileStore(this.root).request({operation:'get'});
   if(input.localDate!==localDay(now)||input.timeZone!==Intl.DateTimeFormat().resolvedOptions().timeZone)throw new Error('日期或时区已变化，请重新预览 / Date or timezone changed; preview again');
   if(input.model!==MODEL||input.instructions!==ASSISTANT_INSTRUCTIONS)throw new Error('助理配置已变化，请重新预览 / Assistant configuration changed; preview again');
   if(input.recordsRevision!==this.records().revision||input.profileRevision!==profile.revision)throw new Error('资料在预览后有变化，请重新预览；问题仍保留 / Records changed after preview; preview again');
   this.db.prepare("UPDATE assistant_turns SET status='queued',updated=? WHERE id=?").run(now.toISOString(),id);this.db.exec('COMMIT');return {turn:this.turn(this.row(id)),launch:true};
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 launchFailed(id:string,error:string){this.db.prepare("UPDATE assistant_turns SET status='failed',error=?,updated=? WHERE id=? AND status='queued'").run(error.slice(0,1800),new Date().toISOString(),id);return this.turn(this.row(id));}
 claim(id:string){const changed=this.db.prepare("UPDATE assistant_turns SET status='running',updated=? WHERE id=? AND status='queued' AND cancel_requested=0").run(new Date().toISOString(),id);return Number(changed.changes)>0?this.preview(id):null;}
 cancel(id:string){const row=this.row(id);if(row.status==='queued'||row.status==='draft')this.db.prepare("UPDATE assistant_turns SET status='cancelled',cancel_requested=1,updated=? WHERE id=?").run(new Date().toISOString(),id);else if(row.status==='running')this.db.prepare('UPDATE assistant_turns SET cancel_requested=1 WHERE id=?').run(id);return this.turn(this.row(id));}
 cancelled(id:string){return !!this.row(id).cancel_requested;}
 progress(id:string,output:string){this.db.prepare("UPDATE assistant_turns SET output=?,updated=? WHERE id=? AND status='running'").run(output.slice(0,20000),new Date().toISOString(),id);if(output.length>20000)throw new Error('Reply exceeds 20,000 characters; partial reply saved');}
 finish(id:string,status:'completed'|'failed'|'cancelled'|'interrupted',output:string,error=''){
  if(output.length>20000){status='failed';error='Reply exceeds 20,000 characters; partial reply saved';}
  this.db.prepare("UPDATE assistant_turns SET status=?,output=?,error=?,updated=? WHERE id=? AND status IN ('queued','running')").run(status,output.slice(0,20000),error.slice(0,1800),new Date().toISOString(),id);return this.turn(this.row(id));
 }
 recover(now=new Date()){this.db.prepare("UPDATE assistant_turns SET status='interrupted',error='后台已退出；保留原输入与部分回复，请重新预览后发送 / Worker exited; input and partial reply preserved',updated=? WHERE status='running' OR (status='queued' AND updated<?)").run(now.toISOString(),new Date(now.getTime()-40000).toISOString());}
}
