import {memoryContext} from './project-memory';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export class TaskStore {
 db:DatabaseSync;
 constructor(public root:string){
  fs.mkdirSync(root,{recursive:true});
  this.db=new DatabaseSync(path.join(root,'tasks.sqlite3'));
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;`);
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const version=Number(this.db.prepare('PRAGMA user_version').get()!.user_version);
   if(version>8)throw new Error('Task database is newer than this application.');
   this.db.exec(`
   CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, prompt TEXT NOT NULL,
   status TEXT NOT NULL, result TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '', created TEXT NOT NULL, updated TEXT NOT NULL,
   cancel_requested INTEGER NOT NULL DEFAULT 0);`);
   if(!this.db.prepare('PRAGMA table_info(tasks)').all().some(c=>c.name==='cancel_requested'))this.db.exec('ALTER TABLE tasks ADD COLUMN cancel_requested INTEGER NOT NULL DEFAULT 0');
   if(!this.db.prepare('PRAGMA table_info(tasks)').all().some(c=>c.name==='kind'))this.db.exec("ALTER TABLE tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'");
   this.db.exec("CREATE TABLE IF NOT EXISTS task_steps(task_id TEXT NOT NULL,position INTEGER NOT NULL,title TEXT NOT NULL,prompt TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',result TEXT NOT NULL DEFAULT '',error TEXT NOT NULL DEFAULT '',PRIMARY KEY(task_id,position)); CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,handoff TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);");
   if(!this.db.prepare('PRAGMA table_info(tasks)').all().some(c=>c.name==='context_json'))this.db.exec("ALTER TABLE tasks ADD COLUMN context_json TEXT NOT NULL DEFAULT '{}'");
   this.db.exec("CREATE TABLE IF NOT EXISTS project_history(project_id TEXT NOT NULL,revision INTEGER NOT NULL,handoff TEXT NOT NULL,source TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(project_id,revision)); INSERT OR IGNORE INTO project_history SELECT id,revision,handoff,'Existing project snapshot',datetime('now') FROM projects; CREATE TABLE IF NOT EXISTS schedules(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,prompt TEXT NOT NULL,at TEXT NOT NULL,enabled INTEGER NOT NULL,last_day TEXT NOT NULL); CREATE TABLE IF NOT EXISTS project_workspaces(project_id TEXT PRIMARY KEY,root TEXT NOT NULL); CREATE TABLE IF NOT EXISTS schedule_runs(schedule_id TEXT NOT NULL,day TEXT NOT NULL,outcome TEXT NOT NULL,task_id TEXT NOT NULL,message TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(schedule_id,day)); CREATE TABLE IF NOT EXISTS schedule_run_events(id TEXT PRIMARY KEY,schedule_id TEXT NOT NULL,day TEXT NOT NULL,outcome TEXT NOT NULL,task_id TEXT NOT NULL,message TEXT NOT NULL,created TEXT NOT NULL); INSERT OR IGNORE INTO schedule_run_events SELECT schedule_id||':'||day,schedule_id,day,outcome,task_id,message,created FROM schedule_runs WHERE NOT EXISTS (SELECT 1 FROM schedule_run_events e WHERE e.schedule_id=schedule_runs.schedule_id AND e.day=schedule_runs.day); PRAGMA user_version=8; COMMIT");
  }catch(e){this.db.exec('ROLLBACK');this.db.close();throw e;}
 }
 submit(prompt:string,key:string,kind='text',projectId=''){
  const context=projectId?{...this.projectContext(projectId),memories:memoryContext(this.root,projectId,prompt)}:{};
  if(!['text','master'].includes(kind))throw new Error('Invalid task kind');
  if(!prompt.trim()||prompt.length>16000||!key.trim()||key.length>200)throw new Error('Provide a prompt (1–16000 characters) and request key (1–200 characters).');
  const id=randomUUID(),now=new Date().toISOString();
  this.db.prepare('INSERT INTO tasks(id,request_key,prompt,status,created,updated,kind,context_json) VALUES(?,?,?,\'queued\',?,?,?,?) ON CONFLICT(request_key) DO NOTHING').run(id,key,prompt,now,now,kind,JSON.stringify(context));
  const task=this.db.prepare('SELECT * FROM tasks WHERE request_key=?').get(key)!;
  if(task.prompt!==prompt||task.kind!==kind||String(JSON.parse(String(task.context_json)).projectId||'')!==projectId)throw new Error('Request key already belongs to a different prompt');return task;
 }
 get(id:string){return this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id);}
 list(){return this.db.prepare("SELECT id,request_key,substr(prompt,1,80) AS title,status,created,updated,kind,json_extract(context_json,'$.projectId') AS project_id,json_extract(context_json,'$.name') AS project_name FROM tasks ORDER BY created DESC,id").all();}
 claim(projectId=''){return this.db.prepare("UPDATE tasks SET status='running',updated=? WHERE id=(SELECT id FROM tasks WHERE status='queued' AND (?='' OR json_extract(context_json,'$.projectId')=?) ORDER BY created,id LIMIT 1) RETURNING *").get(new Date().toISOString(),projectId,projectId);}
 cancel(id:string){
  if(!this.get(id))throw new Error('Task not found');
  this.db.prepare("UPDATE tasks SET status=CASE WHEN status='queued' THEN 'cancelled' ELSE 'cancelling' END,cancel_requested=1,updated=? WHERE id=? AND status IN ('queued','running','cancelling')").run(new Date().toISOString(),id);
  return this.get(id);
 }
 cancellationRequested(id:string){return this.db.prepare('SELECT cancel_requested FROM tasks WHERE id=?').get(id)?.cancel_requested===1;}
 progress(id:string,result:string){this.db.prepare("UPDATE tasks SET result=?,updated=? WHERE id=? AND status IN ('running','cancelling')").run(result,new Date().toISOString(),id);}
 finish(id:string,status:'succeeded'|'failed'|'interrupted'|'cancelled',result:string,error=''){
  this.db.exec('BEGIN IMMEDIATE');try{
  const changed=this.db.prepare("UPDATE tasks SET status=?,result=?,error=?,updated=? WHERE id=? AND status IN ('running','cancelling')").run(status,result,error,new Date().toISOString(),id);
  if(changed.changes!==1)throw new Error('Task is not running');
  this.db.prepare("UPDATE task_steps SET status=? WHERE task_id=? AND status IN ('running','queued')").run(status==='cancelled'?'cancelled':'interrupted',id);
  this.db.exec('COMMIT');
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 setWorkspace(id:string,folder:string){
  this.projectContext(id);if(typeof folder!=='string'||!path.isAbsolute(folder))throw new Error('Absolute project folder required');
  const root=fs.realpathSync(folder);if(!fs.statSync(root).isDirectory())throw new Error('Project folder is not a directory');
  this.db.prepare('INSERT INTO project_workspaces VALUES(?,?) ON CONFLICT(project_id) DO UPDATE SET root=excluded.root').run(id,root);return this.workspace(id);
 }
 readWorkspaceFile(id:string,name:string){
  this.projectContext(id);
  if(typeof name!=='string'||!name||path.basename(name)!==name||name.includes(':')||name.startsWith('.')||name.length>200)throw new Error('Choose a visible top-level text file');
  if(!/\.(txt|md|json|ts|tsx|js|jsx|py|css|html|yml|yaml|toml|xml|csv)$/i.test(name))throw new Error('This file type is not available for text preview');
  const row=this.db.prepare('SELECT root FROM project_workspaces WHERE project_id=?').get(id);if(!row)throw new Error('Choose a project folder first');
  const root=String(row.root);if(fs.realpathSync(root)!==root)throw new Error('Project target changed');
  const file=path.join(root,name);if(fs.lstatSync(file).isSymbolicLink()||path.dirname(fs.realpathSync(file))!==root)throw new Error('Linked or outside file refused');
  const fd=fs.openSync(file,'r');try{
   const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.size>12000)throw new Error('Preview supports regular files up to 12 KB');
   const buffer=Buffer.alloc(12001);const size=fs.readSync(fd,buffer,0,buffer.length,0);if(size>12000)throw new Error('File grew beyond preview limit');
   const text=new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,size));if(text.includes('\0'))throw new Error('Binary file refused');
   return {name,text,bytes:size};
  }finally{fs.closeSync(fd);}
 }
 clearWorkspace(id:string){this.projectContext(id);this.db.prepare('DELETE FROM project_workspaces WHERE project_id=?').run(id);return {root:'',files:[]};}
 workspace(id:string){
  this.projectContext(id);const row=this.db.prepare('SELECT root FROM project_workspaces WHERE project_id=?').get(id);if(!row)return {root:'',files:[]};
  const root=String(row.root);if(fs.realpathSync(root)!==root)throw new Error('Project folder target changed; select it again');
  const files=fs.readdirSync(root,{withFileTypes:true}).filter(e=>!e.isSymbolicLink()&&!e.name.startsWith('.')&&e.name!=='node_modules').slice(0,200).map(e=>({name:e.name,directory:e.isDirectory()}));
  return {root,files};
 }
 schedules(projectId:string):Array<Record<string,unknown>>{
  this.projectContext(projectId);const now=new Date(),day=localDay(now),clock=localClock(now);return this.db.prepare('SELECT * FROM schedules WHERE project_id=? ORDER BY at,id').all(projectId).map(row=>{
   let next='';if(row.enabled){const date=new Date(now);if(String(row.last_day)>=day||String(row.at)<=clock)date.setDate(date.getDate()+1);next=localDay(date)+' '+row.at;}
   return {...row,next_check:next,time_zone:Intl.DateTimeFormat().resolvedOptions().timeZone};
  });
 }
 addSchedule(projectId:string,prompt:string,at:string,now=new Date()){
  this.projectContext(projectId);
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>16000||typeof at!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(at))throw new Error('Invalid schedule');
  const id=randomUUID(),day=localDay(now),clock=localClock(now);
  this.db.prepare('INSERT INTO schedules VALUES(?,?,?,?,1,?)').run(id,projectId,prompt,at,clock>=at?day:'');return this.schedules(projectId);
 }
 enableSchedule(id:string,enabled:boolean){
  if(typeof enabled!=='boolean')throw new Error('Invalid enabled state');
  const r=this.db.prepare('UPDATE schedules SET enabled=?,last_day=? WHERE id=?').run(enabled?1:0,localDay(new Date()),id);if(r.changes!==1)throw new Error('Schedule not found');
 }
 scheduleRuns(projectId:string){this.projectContext(projectId);return this.db.prepare('SELECT r.*,s.prompt,s.at,t.status AS task_status FROM schedule_run_events r JOIN schedules s ON s.id=r.schedule_id LEFT JOIN tasks t ON t.id=r.task_id WHERE s.project_id=? ORDER BY r.created DESC LIMIT 100').all(projectId);}
 retrySchedule(id:string,now=new Date()){
  const day=localDay(now);const run=this.db.prepare('SELECT outcome FROM schedule_runs WHERE schedule_id=? AND day=?').get(id,day);
  if(!run||!['failed','blocked'].includes(String(run.outcome)))throw new Error('Only a failed or blocked check from today can be retried');
  const changed=this.db.prepare("UPDATE schedules SET last_day='' WHERE id=? AND enabled=1 AND last_day=?").run(id,day);
  if(changed.changes!==1)throw new Error('Plan changed, disabled or already marked for retry');return {retryPending:true};
 }
 tickSchedules(now=new Date()){
  if(!Number.isFinite(now.getTime()))throw new Error('Invalid scheduler time');
  const day=localDay(now),clock=localClock(now),created:string[]=[];
  const due=this.db.prepare('SELECT id FROM schedules WHERE enabled=1 AND at<=? AND last_day<? ORDER BY at,id').all(clock,day);
  for(const candidate of due){
   this.db.exec('BEGIN IMMEDIATE');try{
    const schedule=this.db.prepare('SELECT * FROM schedules WHERE id=? AND enabled=1 AND last_day<?').get(candidate.id,day);
    if(!schedule){this.db.exec('COMMIT');continue;}
    const pending=this.db.prepare("SELECT id FROM tasks WHERE request_key LIKE ? AND status IN ('queued','running','cancelling') LIMIT 1").get('schedule:'+schedule.id+':%');
    let taskId='',outcome='queued',message='';
    if(pending){outcome='blocked';message='Previous scheduled task is still queued or running; no overlapping task created.';}
    else{const task=this.submit(String(schedule.prompt),'schedule:'+schedule.id+':'+day,'text',String(schedule.project_id));taskId=String(task.id);}
    if(schedule.last_day){const missed=Math.max(0,Math.round((Date.parse(day)-Date.parse(String(schedule.last_day)))/86400000)-1);if(missed)message+=(message?' ':'')+missed+' missed calendar day(s) were not replayed.';}
    this.db.prepare('INSERT OR REPLACE INTO schedule_runs VALUES(?,?,?,?,?,?)').run(schedule.id,day,outcome,taskId,message,now.toISOString());
    this.db.prepare('INSERT INTO schedule_run_events VALUES(?,?,?,?,?,?,?)').run(randomUUID(),schedule.id,day,outcome,taskId,message,now.toISOString());
    this.db.prepare('UPDATE schedules SET last_day=? WHERE id=?').run(day,schedule.id);this.db.exec('COMMIT');if(outcome==='queued')created.push(taskId);
   }catch(e){
    this.db.exec('ROLLBACK');
    // A broken memory runtime or project must not prevent other schedules from being checked.
    this.db.exec('BEGIN IMMEDIATE');try{
     this.db.prepare('INSERT OR REPLACE INTO schedule_runs VALUES(?,?,?,?,?,?)').run(candidate.id,day,'failed','',(e as Error).message.slice(0,1000),now.toISOString());
     this.db.prepare('INSERT INTO schedule_run_events VALUES(?,?,?,?,?,?,?)').run(randomUUID(),candidate.id,day,'failed','',(e as Error).message.slice(0,1000),now.toISOString());
     this.db.prepare('UPDATE schedules SET last_day=? WHERE id=?').run(day,candidate.id);this.db.exec('COMMIT');
    }catch(logError){this.db.exec('ROLLBACK');throw logError;}
   }
  }
  return created;
 }
 adoptTask(id:string){
  const task=this.get(id);if(!task||task.status!=='succeeded')throw new Error('Only completed tasks can become a project handoff');
  const context=JSON.parse(String(task.context_json));if(!context.projectId)throw new Error('Task has no project');
  const result=String(task.result);if(!result.trim()||result.length>7000)throw new Error('Result is empty or too long; edit the handoff manually');
  const text='Completed task: '+String(task.prompt).slice(0,500)+'\nResult:\n'+result+'\nSource task: '+id;
  return this.saveHandoff(String(context.projectId),text,Number(context.revision),'Task '+id);
 }
 projects(){return this.db.prepare('SELECT * FROM projects ORDER BY name,id').all();}
 createProject(name:string){
  if(typeof name!=='string'||!name.trim()||name.length>120)throw new Error('Invalid project name');
  const id=randomUUID();this.db.prepare("INSERT INTO projects(id,name,handoff) VALUES(?,?,'')").run(id,name.trim());this.db.prepare("INSERT INTO project_history VALUES(?,1,'','Project created',?)").run(id,new Date().toISOString());return this.projectContext(id);
 }
 projectContext(id:string){
  const p=this.db.prepare('SELECT * FROM projects WHERE id=?').get(id);if(!p)throw new Error('Project not found');
  return {projectId:String(p.id),name:String(p.name),revision:Number(p.revision),handoff:String(p.handoff),source:String(this.db.prepare('SELECT source FROM project_history WHERE project_id=? AND revision=?').get(id,p.revision)?.source||'User-saved project handoff')};
 }
 history(id:string){this.projectContext(id);return this.db.prepare('SELECT revision,handoff,source,created FROM project_history WHERE project_id=? ORDER BY revision DESC').all(id);}
 restoreHandoff(id:string,target:number,revision:number){
  if(!Number.isSafeInteger(target))throw new Error('Invalid history revision');
  const old=this.db.prepare('SELECT handoff FROM project_history WHERE project_id=? AND revision=?').get(id,target);if(!old)throw new Error('History not found');
  return this.saveHandoff(id,String(old.handoff),revision,'Restored revision '+target);
 }
 saveHandoff(id:string,text:string,revision:number,source='User-saved project handoff'){
  if(typeof text!=='string'||text.length>8000||!Number.isSafeInteger(revision))throw new Error('Invalid handoff');
  this.db.exec('BEGIN IMMEDIATE');try{
   const r=this.db.prepare('UPDATE projects SET handoff=?,revision=revision+1 WHERE id=? AND revision=?').run(text,id,revision);
   if(r.changes!==1)throw new Error('Project changed; reload before saving');
   this.db.prepare('INSERT INTO project_history VALUES(?,?,?,?,?)').run(id,revision+1,text,source,new Date().toISOString());
   this.db.exec('COMMIT');return this.projectContext(id);
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 steps(id:string){return this.db.prepare('SELECT position,title,prompt,status,result,error FROM task_steps WHERE task_id=? ORDER BY position').all(id);}
 addStep(id:string,position:number,title:string,prompt:string){this.db.prepare('INSERT INTO task_steps(task_id,position,title,prompt) VALUES(?,?,?,?)').run(id,position,title,prompt);}
 stepProgress(id:string,position:number,result:string){this.db.prepare("UPDATE task_steps SET result=? WHERE task_id=? AND position=? AND status='running'").run(result,id,position);}
 startStep(id:string,position:number){this.db.prepare("UPDATE task_steps SET status='running' WHERE task_id=? AND position=? AND status='queued'").run(id,position);}
 finishStep(id:string,position:number,status:string,result:string,error:string){this.db.prepare('UPDATE task_steps SET status=?,result=?,error=? WHERE task_id=? AND position=?').run(status,result,error,id,position);}
 recover(){
  this.db.exec('BEGIN IMMEDIATE');try{
   this.db.prepare("UPDATE task_steps SET status='interrupted' WHERE status IN ('running','queued') AND task_id IN (SELECT id FROM tasks WHERE status IN ('running','cancelling'))").run();
   const changed=this.db.prepare("UPDATE tasks SET status='interrupted',error='Worker exited before completion; partial output preserved. Inspect before resubmitting.',updated=? WHERE status IN ('running','cancelling')").run(new Date().toISOString());
   this.db.exec('COMMIT');return changed;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 close(){this.db.close();}
}

function localDay(d:Date){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function localClock(d:Date){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
