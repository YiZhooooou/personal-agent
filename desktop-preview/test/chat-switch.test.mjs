import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild-wasm';
import React from 'react';
import {create,act} from 'react-test-renderer';

// Exercise the actual renderer without opening Electron or accessing user data.
await build({entryPoints:['src/renderer.tsx'],outfile:'dist-test/renderer-test.cjs',bundle:true,platform:'node',format:'cjs',external:['react','react-dom/client'],loader:{'.css':'empty'},plugins:[{name:'test-entry',setup(b){b.onLoad({filter:/renderer\.tsx$/},async a=>({contents:(await fs.readFile(a.path,'utf8')).replace(/^createRoot\(.*$/m,'export {App,RenderBoundary,TasksPage};'),loader:'tsx'}));}}]});
const {App,RenderBoundary,TasksPage}=await import('../dist-test/renderer-test.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.document={documentElement:{dataset:{}}};
function frozen(value){if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;}

test('switching chats preserves content when scrollIntoView returns a Promise',async()=>{
 const state={version:1,language:'en',theme:'light',mode:'chat',space:'personal',active:'a',codexPath:'',chats:[{id:'a',space:'personal',title:'Chat A',draft:'draft A',messages:[]},{id:'b',space:'personal',title:'Chat B',draft:'draft B',messages:[{id:'m',role:'assistant',text:'Saved reply',status:'completed'}]}]};
 let listener; const snap=()=>frozen(structuredClone({state,runtime:{connected:false,version:'',account:'none',plan:'',quota:'unknown',busy:false,error:''},dataPath:'test-only'}));
 globalThis.window={agent:{snapshot:async()=>({ok:true,value:snap()}),onChange:fn=>{listener=fn;return()=>{};},select:async id=>{state.active=id;listener(snap());return {ok:true,value:snap()};}}};
 let ui;await act(async()=>{ui=create(React.createElement(App),{createNodeMock:()=>({scrollIntoView(){return Promise.resolve();}})});});
 for(const id of ['b','a','b']){
  const button=ui.root.findByProps({className:'recents'}).findAllByType('button')[id==='a'?0:1];
  await act(async()=>{button.props.onClick();});
  assert.equal(ui.root.findByType('textarea').props.value,'draft '+id.toUpperCase());
  if(id==='b')assert.equal(ui.root.findByProps({className:'message-body'}).children[0],'Saved reply');
 }
 await act(async()=>ui.unmount());
});

test('renderer exception produces a visible diagnostic instead of a blank root',async()=>{
 function Broken(){throw new Error('Synthetic chat-render failure');}
 let ui;const original=console.error;console.error=()=>{};
 try{
  await act(async()=>{ui=create(React.createElement(RenderBoundary,null,React.createElement(Broken)));});
  assert.match(ui.root.findByType('pre').children.join(''),/Synthetic chat-render failure/);
  assert.equal(ui.root.findByProps({role:'alert'}).type,'section');
  await act(async()=>ui.unmount());
 }finally{console.error=original;}
});


test('task page saves instructions, launches queue and shows persisted result',async()=>{
 let rows=[],ran=false;
 const task={id:'task-1',request_key:'key',status:'queued',prompt:'Reply OK',result:'',created:'2026-11-01T12:00:00Z',updated:'2026-11-01T12:00:00Z'};
 globalThis.window={agent:{tasksList:async()=>({ok:true,value:rows}),taskGet:async()=>({ok:true,value:{...task}}),taskSubmit:async(prompt,key)=>{assert.equal(prompt,'Reply OK');assert.ok(key);rows=[task];return {ok:true,value:task};},tasksRun:async()=>{ran=true;task.status='succeeded';task.result='OK';return {ok:true,value:true};}}};
 let ui;
 try{
  await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'personal'}));});
  await act(async()=>ui.root.findByType('textarea').props.onChange({target:{value:'Reply OK'}}));
  const button=text=>ui.root.findAllByType('button').find(b=>b.children.includes(text));
  await act(async()=>button('Save task').props.onClick());
  assert.equal(rows.length,1);
  await act(async()=>button('Run queue').props.onClick());assert.equal(ran,true);
  await act(async()=>ui.root.findByProps({className:'task-row'}).props.onClick());
  assert.ok(ui.root.findAllByType('p').some(p=>p.children.includes('OK')));
 }finally{if(ui)await act(async()=>ui.unmount());}
});
test('task page does not query or expose personal tasks in Work space',async()=>{
 globalThis.window={agent:{tasksList:()=>{throw new Error('must not read tasks');}}};
 let ui;await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'work'}));});
 assert.equal(ui.root.findAllByType('textarea').length,0);
 await act(async()=>ui.unmount());
});

test('task page shows readable titles and cancels selected task',async()=>{
 const task={id:'cancel-1',request_key:'opaque-key',title:'A readable task',status:'running',prompt:'A readable task',result:'partial output',created:'2026-11-01T12:00:00Z',updated:'2026-11-01T12:00:00Z'};
 let cancelled=false;
 globalThis.window={agent:{tasksList:async()=>({ok:true,value:[{...task}]}),taskGet:async()=>({ok:true,value:{...task}}),taskCancel:async id=>{assert.equal(id,task.id);cancelled=true;task.status='cancelling';return {ok:true,value:{...task}};}}};
 let ui;try{
  await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'personal'}));});
  const row=ui.root.findByProps({className:'task-row'});assert.equal(row.findAllByType('span')[0].children[0],'A readable task');
  await act(async()=>row.props.onClick());
  await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('Cancel task')).props.onClick());
  assert.equal(cancelled,true);assert.equal(ui.root.findAllByType('button').find(b=>b.children.includes('Cancelling…')).props.disabled,true);
  assert.ok(ui.root.findAllByType('p').some(p=>p.children.includes('partial output')));
 }finally{if(ui)await act(async()=>ui.unmount());}
});

test('task page submits master mode and displays persisted step results',async()=>{
 const task={id:'master-ui',request_key:'key',kind:'master',status:'succeeded',prompt:'goal',result:'summary',created:'2026-11-01T12:00:00Z',updated:'2026-11-01T12:00:00Z',steps:[{position:1,title:'Child analysis',status:'succeeded',result:'child evidence',error:''}]};
 let submitted=false;
 globalThis.window={agent:{tasksList:async()=>({ok:true,value:submitted?[task]:[]}),taskGet:async()=>({ok:true,value:task}),taskSubmit:async(prompt,key,kind)=>{assert.equal(kind,'master');assert.equal(prompt,'goal');submitted=true;return {ok:true,value:task};}}};
 let ui;try{
  await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'personal'}));});
  await act(async()=>ui.root.findByProps({'aria-label':'Execution mode'}).props.onChange({target:{value:'master'}}));
  await act(async()=>ui.root.findByType('textarea').props.onChange({target:{value:'goal'}}));
  await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('Save task')).props.onClick());
  assert.equal(submitted,true);assert.ok(ui.root.findByProps({className:'task-step'}).findAllByType('p').some(p=>p.children.includes('child evidence')));
 }finally{if(ui)await act(async()=>ui.unmount());}
});

test('completed project task can explicitly promote its result to handoff',async()=>{
 const task={id:'handoff-task',request_key:'key',status:'succeeded',prompt:'goal',result:'next step',context_json:'{"projectId":"p","revision":1}',created:'2026-11-01T12:00:00Z',updated:'2026-11-01T12:00:00Z'};
 let adopted=false;
 globalThis.window={agent:{tasksList:async()=>({ok:true,value:[task]}),taskGet:async()=>({ok:true,value:task}),project:async request=>{if(request.operation==='adopt'){assert.equal(request.taskId,task.id);adopted=true;return {ok:true,value:{revision:2}};}return {ok:true,value:[]};}}};
 let ui;try{await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'personal'}));});await act(async()=>ui.root.findByProps({className:'task-row'}).props.onClick());await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('Use result as project handoff')).props.onClick());assert.equal(adopted,true);assert.match(ui.root.findByProps({role:'status'}).children.join(''),/handoff saved/);}finally{if(ui)await act(async()=>ui.unmount());}
});

test('project editor saves handoff, shows history and restores with expected revision',async()=>{
 let current={projectId:'p',name:'Project',revision:1,handoff:'',source:'created'};let restored=false;
 globalThis.window={agent:{tasksList:async()=>({ok:true,value:[]}),project:async r=>{
  if(r.operation==='list')return {ok:true,value:[{id:'p',name:'Project'}]};
  if(r.operation==='get')return {ok:true,value:{...current}};
  if(r.operation==='save'){assert.equal(r.revision,1);current={...current,revision:2,handoff:r.text};}
  if(r.operation==='history')return {ok:true,value:[{revision:1,handoff:'original',source:'created',created:'test'}]};
  if(r.operation==='restore'){assert.equal(r.revision,2);assert.equal(r.target,1);restored=true;current={...current,revision:3,handoff:'original'};}
  return {ok:true,value:{...current}};
 }}};
 let ui;try{
  await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'personal'}));});
  await act(async()=>ui.root.findByProps({'aria-label':'Project'}).props.onChange({target:{value:'p'}}));
  await act(async()=>ui.root.findByProps({'aria-label':'Project handoff'}).props.onChange({target:{value:'next action'}}));
  const button=text=>ui.root.findAllByType('button').find(b=>b.children.includes(text));
  await act(async()=>button('保存交接 / Save handoff').props.onClick());assert.equal(current.handoff,'next action');
  await act(async()=>button('查看历史 / History').props.onClick());
  await act(async()=>button('恢复为新版本 / Restore as new revision').props.onClick());assert.equal(restored,true);assert.equal(ui.root.findByProps({'aria-label':'Project handoff'}).props.value,'original');
 }finally{if(ui)await act(async()=>ui.unmount());}
});

test('daily queue panel refreshes supervisor state and preserves retry action scope',async()=>{
 let retried=false;const project={projectId:'p',name:'P',revision:1,handoff:'',source:'user'};
 globalThis.window={agent:{tasksList:async()=>({ok:true,value:[]}),project:async r=>{const value=r.operation==='list'?[{id:'p',name:'P'}]:r.operation==='get'?project:r.operation==='scheduler-status'?{state:'running',running:true,timeZone:'America/New_York',lastCheck:'test'}:r.operation==='schedule-runs'?[{id:'attempt',schedule_id:'s',day:'2026-11-02',at:'09:00',outcome:'failed',message:'synthetic issue'}]:true;if(r.operation==='schedule-retry'){assert.equal(r.scheduleId,'s');retried=true;}return {ok:true,value};}}};
 let ui;try{await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'personal'}));});await act(async()=>ui.root.findByProps({'aria-label':'Project'}).props.onChange({target:{value:'p'}}));const panel=ui.root.findAllByType('details').find(d=>d.findAllByType('summary').some(s=>s.children.includes('每日入队 / Daily queue')));await act(async()=>panel.props.onToggle({currentTarget:{open:true}}));assert.ok(ui.root.findAllByType('p').some(p=>p.children.includes('synthetic issue')));await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('重试今日入队 / Retry today')).props.onClick());assert.equal(retried,true);}finally{if(ui)await act(async()=>ui.unmount());}
});
