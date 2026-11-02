import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export class TaskStore {
 db:DatabaseSync;
 constructor(root:string){
  fs.mkdirSync(root,{recursive:true});
  this.db=new DatabaseSync(path.join(root,'tasks.sqlite3'));
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;`);
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const version=Number(this.db.prepare('PRAGMA user_version').get()!.user_version);
   if(version>2)throw new Error('Task database is newer than this application.');
   this.db.exec(`
   CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, prompt TEXT NOT NULL,
   status TEXT NOT NULL, result TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '', created TEXT NOT NULL, updated TEXT NOT NULL,
   cancel_requested INTEGER NOT NULL DEFAULT 0);`);
   if(!this.db.prepare('PRAGMA table_info(tasks)').all().some(c=>c.name==='cancel_requested'))this.db.exec('ALTER TABLE tasks ADD COLUMN cancel_requested INTEGER NOT NULL DEFAULT 0');
   if(!this.db.prepare('PRAGMA table_info(tasks)').all().some(c=>c.name==='kind'))this.db.exec("ALTER TABLE tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'");
   this.db.exec("CREATE TABLE IF NOT EXISTS task_steps(task_id TEXT NOT NULL,position INTEGER NOT NULL,title TEXT NOT NULL,prompt TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',result TEXT NOT NULL DEFAULT '',error TEXT NOT NULL DEFAULT '',PRIMARY KEY(task_id,position)); PRAGMA user_version=2; COMMIT");
  }catch(e){this.db.exec('ROLLBACK');this.db.close();throw e;}
 }
 submit(prompt:string,key:string,kind='text'){
  if(!['text','master'].includes(kind))throw new Error('Invalid task kind');
  if(!prompt.trim()||prompt.length>16000||!key.trim()||key.length>200)throw new Error('Provide a prompt (1–16000 characters) and request key (1–200 characters).');
  const id=randomUUID(),now=new Date().toISOString();
  this.db.prepare('INSERT INTO tasks(id,request_key,prompt,status,created,updated,kind) VALUES(?,?,?,\'queued\',?,?,?) ON CONFLICT(request_key) DO NOTHING').run(id,key,prompt,now,now,kind);
  const task=this.db.prepare('SELECT * FROM tasks WHERE request_key=?').get(key)!;
  if(task.prompt!==prompt||task.kind!==kind)throw new Error('Request key already belongs to a different prompt');return task;
 }
 get(id:string){return this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id);}
 list(){return this.db.prepare('SELECT id,request_key,substr(prompt,1,80) AS title,status,created,updated,kind FROM tasks ORDER BY created DESC,id').all();}
 claim(){return this.db.prepare("UPDATE tasks SET status='running',updated=? WHERE id=(SELECT id FROM tasks WHERE status='queued' ORDER BY created,id LIMIT 1) RETURNING *").get(new Date().toISOString());}
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
