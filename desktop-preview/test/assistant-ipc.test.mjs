import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {build} from 'esbuild-wasm';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'assistant-ipc-'));
await build({entryPoints:['src/main.ts'],outfile:'dist-test/assistant-ipc-main.cjs',bundle:true,platform:'node',format:'cjs',plugins:[{name:'isolated-electron',setup(builder){
 builder.onResolve({filter:/^electron$/},()=>({path:'electron',namespace:'test-electron'}));
 builder.onLoad({filter:/.*/,namespace:'test-electron'},()=>({contents:`export const handlers=new Map();export const app={isPackaged:false,getPath:()=>${JSON.stringify(root)},setPath(){},setAppUserModelId(){},on(){},whenReady:()=>({then(){}})};export const ipcMain={handle:(name,fn)=>handlers.set(name,fn)};export class BrowserWindow{};export const dialog={},shell={};`,loader:'js'}));
 builder.onLoad({filter:/[\\/]src[\\/]main\.ts$/},async args=>({contents:await fs.readFile(args.path,'utf8')+`\nimport {handlers as testHandlers} from 'electron'; export {testHandlers}; export function setupIsolatedIpc(space){store=new Store(root);store.state.space=space;win={webContents:{mainFrame:{}}};register();return {sender:win.webContents,senderFrame:win.webContents.mainFrame};} export function setIpcSpace(space){store.state.space=space;} let isolatedLaunches=0;TaskService.prototype.run=async()=>{isolatedLaunches++;return true;};export function getLaunches(){return isolatedLaunches;}`,loader:'ts'}));
}}]});
await fs.copyFile('dist-test/task-cli.cjs','dist-test/tasks.cjs');
await build({entryPoints:['src/job-assistant-store.ts'],outfile:'dist-test/assistant-store-ipc.cjs',bundle:true,platform:'node',format:'cjs'});
const {JobAssistantStore}=await import('../dist-test/assistant-store-ipc.cjs');
const {setupIsolatedIpc,testHandlers,setIpcSpace,getLaunches}=await import('../dist-test/assistant-ipc-main.cjs');
test('actual assistant IPC rejects all Work/Lab operations and untrusted frames before touching assistant data',async()=>{
 for(const space of ['work','lab']){const event=setupIsolatedIpc(space),handler=testHandlers.get('agent:jobAssistant');for(const operation of ['prepare','preview','list','start','cancel']){const result=await handler(event,{operation,question:'Synthetic',jobId:'',id:'synthetic'});assert.equal(result.ok,false);assert.match(result.error,/Personal/);}}
 const trusted=setupIsolatedIpc('personal'),handler=testHandlers.get('agent:jobAssistant');for(const event of [{...trusted,sender:{}},{...trusted,senderFrame:{}}]){const result=await handler(event,{operation:'list'});assert.equal(result.ok,false);assert.match(result.error,/Untrusted/);}
 const files=await fs.readdir(path.join(root,'PersonalAgentPreview'));assert.equal(files.includes('job-assistant.sqlite3'),false);
});
test('actual assistant IPC does not expose internal completion/launch-failure operations',async()=>{
 const event=setupIsolatedIpc('personal'),handler=testHandlers.get('agent:jobAssistant');for(const operation of ['queue','launch-failed','finish','active']){const result=await handler(event,{operation,id:'synthetic'});assert.equal(result.ok,false);assert.match(result.error,/Unsupported/);}
 const result=await handler(event,{operation:'prepare',question:'x'.repeat(7000),jobId:''});assert.equal(result.ok,false);assert.match(result.error,/Invalid/);
});

test('sign-in changes are blocked while a Master reply is queued',async()=>{
 const event=setupIsolatedIpc('personal'),assistant=new JobAssistantStore(path.join(root,'PersonalAgentPreview'));
 try{const preview=assistant.prepare('Synthetic active reply','');assistant.queue(preview.turn.id);for(const name of ['agent:login','agent:logout']){const result=await testHandlers.get(name)(event);assert.equal(result.ok,false);assert.match(result.error,/Stop the active Master reply/);}assistant.cancel(preview.turn.id);}finally{assistant.close();}
});

test('changing to Work while start is queued cancels it before any worker launch',async()=>{
 const event=setupIsolatedIpc('personal'),assistant=new JobAssistantStore(path.join(root,'PersonalAgentPreview'));try{const preview=assistant.prepare('Synthetic space-switch race',''),before=getLaunches(),pending=testHandlers.get('agent:jobAssistant')(event,{operation:'start',id:preview.turn.id});setIpcSpace('work');const result=await pending;assert.equal(result.ok,false);assert.match(result.error,/Personal/);assert.equal(assistant.preview(preview.turn.id).turn.status,'cancelled');assert.equal(getLaunches(),before);}finally{assistant.close();}
});
test('concurrent confirmations launch one worker and never accept caller-supplied model output',async()=>{
 const event=setupIsolatedIpc('personal'),assistant=new JobAssistantStore(path.join(root,'PersonalAgentPreview'));try{const preview=assistant.prepare('Synthetic duplicate start',''),handler=testHandlers.get('agent:jobAssistant'),before=getLaunches();const results=await Promise.all([handler(event,{operation:'start',id:preview.turn.id,output:'Fake success'}),handler(event,{operation:'start',id:preview.turn.id})]);assert.ok(results.every(r=>r.ok));assert.equal(getLaunches()-before,1);assert.equal(assistant.preview(preview.turn.id).turn.output,'');assistant.cancel(preview.turn.id);}finally{assistant.close();}
});
