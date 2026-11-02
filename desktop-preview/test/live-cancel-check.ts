import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {TaskStore} from '../src/task-store';
import {runTasks} from '../src/task-worker';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'pa-live-cancel-'));
const store=new TaskStore(root);
const id=String(store.submit('Write 150 numbered software testing tips, each with two sentences. This is a synthetic cancellation test.','synthetic-cancel').id);
const nextId=String(store.submit('Reply exactly QUEUE_CONTINUES','synthetic-next').id);
let requested=false;
const poll=setInterval(()=>{const t=store.get(id);if(!requested&&String(t?.result||'').length>80){store.cancel(id);requested=true;}},200);
try{
 await runTasks(store,process.argv[2]);
 const t=store.get(id)!;assert.equal(requested,true);assert.equal(t.status,'cancelled');assert.ok(String(t.result).length>80);
 assert.equal(store.get(nextId)!.status,'succeeded');assert.equal(String(store.get(nextId)!.result).trim(),'QUEUE_CONTINUES');
 console.log(JSON.stringify({nextTask:store.get(nextId)!.status,check:'real cancellation',status:t.status,partialCharacters:String(t.result).length,temporaryDatabase:root}));
}finally{clearInterval(poll);store.close();}
