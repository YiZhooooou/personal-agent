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
  await act(async()=>ui.root.findByType('select').props.onChange({target:{value:'master'}}));
  await act(async()=>ui.root.findByType('textarea').props.onChange({target:{value:'goal'}}));
  await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('Save task')).props.onClick());
  assert.equal(submitted,true);assert.ok(ui.root.findByType('details').findAllByType('p').some(p=>p.children.includes('child evidence')));
 }finally{if(ui)await act(async()=>ui.unmount());}
});
