import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {TaskStore} from '../src/task-store';
import {runTasks} from '../src/task-worker';
const s=new TaskStore(fs.mkdtempSync(path.join(os.tmpdir(),'master-live-')));
const id=String(s.submit('为初学者制定一个三天的 Git 学习计划，并列出三个常见错误。请简短回答。','live-master','master').id);
try{await runTasks(s,process.argv[2]);assert.equal(s.get(id)!.status,'succeeded',String(s.get(id)!.error));assert.equal(s.steps(id).length,4);assert.ok(s.steps(id).every(step=>step.status==='succeeded'));assert.ok(String(s.get(id)!.result).length>20);console.log(JSON.stringify({status:s.get(id)!.status,steps:s.steps(id).map(step=>({title:step.title,status:step.status,characters:String(step.result).length}))}));}finally{s.close();}
