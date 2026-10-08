import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild-wasm';
import React from 'react';
import {create,act} from 'react-test-renderer';

// Exercise the actual renderer without opening Electron or accessing user data.
await build({entryPoints:['src/renderer.tsx'],outfile:'dist-test/renderer-test.cjs',bundle:true,platform:'node',format:'cjs',external:['react','react-dom/client'],loader:{'.css':'empty'},plugins:[{name:'test-entry',setup(b){b.onLoad({filter:/renderer\.tsx$/},async a=>({contents:(await fs.readFile(a.path,'utf8')).replace(/^createRoot\(.*$/m,'export {App,RenderBoundary};'),loader:'tsx'}));}}]});
const {App,RenderBoundary}=await import('../dist-test/renderer-test.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.document={documentElement:{dataset:{}}};
function frozen(value){if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;}

test('switching recent chats preserves messages and drafts across IPC snapshots',async()=>{
 const state={version:1,language:'en',theme:'light',mode:'chat',space:'personal',active:'a',codexPath:'',chats:[{id:'a',space:'personal',title:'Chat A',draft:'draft A',messages:[]},{id:'b',space:'personal',title:'Chat B',draft:'draft B',messages:[{id:'m',role:'assistant',text:'Saved reply',status:'completed'}]}]};
 let listener; const snap=()=>frozen(structuredClone({state,runtime:{connected:false,version:'',account:'none',plan:'',quota:'unknown',busy:false,error:''},dataPath:'test-only'}));
 globalThis.window={agent:{snapshot:async()=>({ok:true,value:snap()}),onChange:fn=>{listener=fn;return()=>{};},select:async id=>{state.active=id;listener(snap());return {ok:true,value:snap()};}}};
 let ui;await act(async()=>{ui=create(React.createElement(App),{createNodeMock:()=>({scrollIntoView(){}})});});
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
