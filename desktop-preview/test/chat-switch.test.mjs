import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild-wasm';
import React from 'react';
import {create,act} from 'react-test-renderer';

// Exercise the actual renderer without opening Electron or accessing user data.
await build({entryPoints:['src/renderer.tsx'],outfile:'dist-test/renderer-test.cjs',bundle:true,platform:'node',format:'cjs',external:['react','react-dom/client'],loader:{'.css':'empty'},plugins:[{name:'test-entry',setup(b){b.onLoad({filter:/renderer\.tsx$/},async a=>({contents:(await fs.readFile(a.path,'utf8')).replace(/^createRoot\(.*$/m,'export {App,RenderBoundary,TasksPage,ProjectContext,ProjectSelector,JobWorkbench};'),loader:'tsx'}));}}]});
const {App,RenderBoundary,TasksPage,ProjectContext,ProjectSelector,JobWorkbench}=await import('../dist-test/renderer-test.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.document={documentElement:{dataset:{}}};
function frozen(value){if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;}

test('switching chats preserves content when scrollIntoView returns a Promise',async()=>{
 const state={version:1,language:'en',theme:'light',mode:'chat',space:'personal',active:'a',codexPath:'',chats:[{id:'a',space:'personal',title:'Chat A',draft:'draft A',messages:[]},{id:'b',space:'personal',title:'Chat B',draft:'draft B',messages:[{id:'m',role:'assistant',text:'Saved reply',status:'completed'}]}]};
 let listener; const snap=()=>frozen(structuredClone({state,runtime:{connected:false,version:'',account:'none',plan:'',quota:'unknown',busy:false,error:''},dataPath:'test-only'}));
 globalThis.window={agent:{jobDemo:async()=>({ok:false,error:"Demo not used in legacy chat test"}),snapshot:async()=>({ok:true,value:snap()}),onChange:fn=>{listener=fn;return()=>{};},select:async id=>{state.active=id;listener(snap());return {ok:true,value:snap()};}}};
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
  await act(async()=>{ui=create(React.createElement(ProjectContext,{onSelect:()=>{}}));});
  await act(async()=>ui.root.findByProps({'aria-label':'Project'}).props.onChange({target:{value:'p'}}));
  await act(async()=>ui.root.findByProps({'aria-label':'Project handoff'}).props.onChange({target:{value:'next action'}}));
  const button=text=>ui.root.findAllByType('button').find(b=>b.children.includes(text));
  await act(async()=>button('保存交接').props.onClick());assert.equal(current.handoff,'next action');
  await act(async()=>button('查看历史').props.onClick());
  await act(async()=>button('恢复为新版本').props.onClick());assert.equal(restored,true);await act(async()=>button('交接').props.onClick());assert.equal(ui.root.findByProps({'aria-label':'Project handoff'}).props.value,'original');
 }finally{if(ui)await act(async()=>ui.unmount());}
});

test('daily queue panel refreshes supervisor state and preserves retry action scope',async()=>{
 let retried=false;const project={projectId:'p',name:'P',revision:1,handoff:'',source:'user'};
 globalThis.window={agent:{tasksList:async()=>({ok:true,value:[]}),project:async r=>{const value=r.operation==='list'?[{id:'p',name:'P'}]:r.operation==='get'?project:r.operation==='scheduler-status'?{state:'running',running:true,timeZone:'America/New_York',lastCheck:'test'}:r.operation==='schedules'?[]:r.operation==='schedule-runs'?[{id:'attempt',schedule_id:'s',day:'2026-11-02',at:'09:00',outcome:'failed',message:'synthetic issue'}]:true;if(r.operation==='schedule-retry'){assert.equal(r.scheduleId,'s');retried=true;}return {ok:true,value};}}};
 let ui;try{await act(async()=>{ui=create(React.createElement(ProjectContext,{onSelect:()=>{}}));});await act(async()=>ui.root.findByProps({'aria-label':'Project'}).props.onChange({target:{value:'p'}}));await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('计划')).props.onClick());assert.ok(ui.root.findAllByType('p').some(p=>p.children.includes('synthetic issue')));await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('重试今日入队')).props.onClick());assert.equal(retried,true);}finally{if(ui)await act(async()=>ui.unmount());}
});

test('history refreshes stale project revision after a task promotes its result',async()=>{
 let revision=2;globalThis.window={agent:{tasksList:async()=>({ok:true,value:[]}),project:async r=>({ok:true,value:r.operation==='list'?[{id:'p',name:'P'}]:r.operation==='get'?{projectId:'p',revision,handoff:'v'+revision,source:'user'}:r.operation==='history'?[{revision:3,handoff:'v3',source:'task'},{revision:2,handoff:'v2',source:'user'}]:true})}};
 let ui;try{await act(async()=>{ui=create(React.createElement(ProjectContext,{onSelect:()=>{}}));});await act(async()=>ui.root.findByProps({'aria-label':'Project'}).props.onChange({target:{value:'p'}}));revision=3;await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('查看历史')).props.onClick());const restore=ui.root.findAllByType('button').filter(b=>b.children.includes('恢复为新版本'));assert.equal(restore[0].props.disabled,true);assert.equal(restore[1].props.disabled,false);await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('交接')).props.onClick());assert.equal(ui.root.findByProps({'aria-label':'Project handoff'}).props.value,'v3');}finally{if(ui)await act(async()=>ui.unmount());}
});

test('memory management starts with saved cards and reveals editor only on request',async()=>{
 const project={projectId:'p',name:'P',revision:1,handoff:'',source:'user'};globalThis.window={agent:{project:async r=>({ok:true,value:r.operation==='list'?[{id:'p',name:'P'}]:r.operation==='get'?project:r.operation==='memory'?[{id:'m',entity:'e',data:{body:'saved convention',status:'confirmed'}}]:true})}};
 let ui;try{await act(async()=>{ui=create(React.createElement(ProjectContext,{onSelect:()=>{}}));});await act(async()=>ui.root.findByProps({'aria-label':'Project'}).props.onChange({target:{value:'p'}}));await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('记忆')).props.onClick());assert.equal(ui.root.findAllByProps({'aria-label':'Project memory'}).length,0);assert.ok(ui.root.findByProps({className:'memory-card'}));await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('新增记忆')).props.onClick());assert.equal(ui.root.findAllByProps({'aria-label':'Project memory'}).length,1);}finally{if(ui)await act(async()=>ui.unmount());}
});
test('file task mode submits selected filename and goal without manual JSON prompting',async()=>{
 let submitted=false;globalThis.window={agent:{tasksList:async()=>({ok:true,value:[]}),project:async r=>{if(r.operation==='list')return {ok:true,value:[{id:'p',name:'P'}]};assert.equal(r.operation,'file-task');assert.equal(r.id,'p');assert.equal(r.name,'app.js');assert.equal(r.text,'Change answer to 2');submitted=true;return {ok:true,value:{id:'file',status:'queued',prompt:r.text}};}}};
 let ui;try{await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'personal'}));});await act(async()=>ui.root.findByProps({'aria-label':'Project'}).props.onChange({target:{value:'p'}}));await act(async()=>ui.root.findByProps({'aria-label':'Execution mode'}).props.onChange({target:{value:'file'}}));await act(async()=>ui.root.findByProps({'aria-label':'Proposal filename'}).props.onChange({target:{value:'app.js'}}));await act(async()=>ui.root.findByProps({id:'task-prompt'}).props.onChange({target:{value:'Change answer to 2'}}));await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('Save task')).props.onClick());assert.equal(submitted,true);}finally{if(ui)await act(async()=>ui.unmount());}
});
test('task composition can be restored after navigating to project management',async()=>{
 globalThis.window={agent:{tasksList:async()=>({ok:true,value:[]}),project:async()=>({ok:true,value:[{id:'p',name:'P'}]})}};let saved;
 let ui;try{await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'personal',onCompositionChange:value=>{saved=value;}}));});await act(async()=>ui.root.findByProps({id:'task-prompt'}).props.onChange({target:{value:'Do not lose this draft'}}));await act(async()=>ui.unmount());await act(async()=>{ui=create(React.createElement(TasksPage,{language:'en',space:'personal',initialComposition:saved}));});assert.equal(ui.root.findByProps({id:'task-prompt'}).props.value,'Do not lose this draft');}finally{if(ui)await act(async()=>ui.unmount());}
});

test('memory search and pagination preserve access to older saved records',async()=>{
 const project={projectId:'p',name:'P',revision:1,handoff:'',source:'user'};const rows=Array.from({length:25},(_,i)=>({id:'r'+i,entity:'e'+i,data:{title:'Record '+i,body:'Convention '+i,status:'confirmed'}}));globalThis.window={agent:{project:async r=>({ok:true,value:r.operation==='list'?[{id:'p',name:'P'}]:r.operation==='get'?project:rows})}};
 let ui;try{await act(async()=>{ui=create(React.createElement(ProjectContext,{onSelect:()=>{}}));});await act(async()=>ui.root.findByProps({'aria-label':'Project'}).props.onChange({target:{value:'p'}}));await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('记忆')).props.onClick());assert.equal(ui.root.findAllByProps({className:'memory-card'}).length,20);await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('显示更多记忆')).props.onClick());assert.equal(ui.root.findAllByProps({className:'memory-card'}).length,25);await act(async()=>ui.root.findByProps({'aria-label':'Search memories'}).props.onChange({target:{value:'Convention 24'}}));assert.equal(ui.root.findAllByProps({className:'memory-card'}).length,1);}finally{if(ui)await act(async()=>ui.unmount());}
});

await build({entryPoints:['src/job-demo.ts'],outfile:'dist-test/job-demo.cjs',bundle:true,platform:'node',format:'cjs'});
const {JobDemoStore}=await import('../dist-test/job-demo.cjs');
test('job workbench selection, stage correction and todo completion update one local source of truth',async()=>{
 const os=await import('node:os');const path=await import('node:path');const root=await fs.mkdtemp(path.join(os.tmpdir(),'job-ui-'));const demo=new JobDemoStore(root);let calls=0;globalThis.window={agent:{jobDemo:async request=>{calls++;return {ok:true,value:demo.request(request)};}}};let ui;
 await act(async()=>{ui=create(React.createElement(JobWorkbench,{space:'personal'}),{createNodeMock:()=>({scrollIntoView(){return Promise.resolve();}})});});
 const card=ui.root.findAllByProps({className:'job-card'}).find(c=>c.findByType('strong').children.join('').includes('Harbor'));await act(async()=>card.props.onClick());assert.match(ui.root.findByProps({className:'job-context'}).findByType('strong').children.join(''),/Harbor/);
 await act(async()=>ui.root.findByProps({'aria-label':'更正岗位阶段'}).props.onChange({target:{value:'interview'}}));assert.equal(demo.request({operation:'get'}).jobs[1].stage,'interview');
 await act(async()=>ui.root.findByProps({'aria-label':'完成：检查申请材料，提交前由你审核'}).props.onChange({target:{checked:true}}));assert.equal(demo.request({operation:'get'}).todos[1].done,true);
 await act(async()=>ui.root.findByType('textarea').props.onChange({target:{value:'下一步？'}}));await act(async()=>ui.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(demo.request({operation:'get'}).messages.at(-2).context.job.id,'harbor');await act(async()=>ui.unmount());
 const before=calls;await act(async()=>{ui=create(React.createElement(JobWorkbench,{space:'work'}));});assert.equal(calls,before);assert.equal(ui.root.findAllByType('textarea').length,0);await act(async()=>ui.unmount());
});

test('failed job save retains the last saved state and clears earlier success feedback',async()=>{
 const os=await import('node:os'),path=await import('node:path');const root=await fs.mkdtemp(path.join(os.tmpdir(),'job-failure-ui-')),demo=new JobDemoStore(root);let fail=false;globalThis.window={agent:{jobDemo:async request=>fail?{ok:false,error:'Synthetic save failure'}:{ok:true,value:demo.request(request)}}};let ui;await act(async()=>{ui=create(React.createElement(JobWorkbench,{space:'personal'}),{createNodeMock:()=>({scrollIntoView(){}})});});
 const label='完成：确认面试时间并准备自我介绍';await act(async()=>ui.root.findByProps({'aria-label':label}).props.onChange({target:{checked:true}}));assert.equal(ui.root.findAllByProps({role:'status'}).length,1);fail=true;await act(async()=>ui.root.findByProps({'aria-label':label}).props.onChange({target:{checked:false}}));assert.equal(ui.root.findByProps({'aria-label':label}).props.checked,true);assert.equal(ui.root.findAllByProps({role:'status'}).length,0);assert.match(ui.root.findByProps({role:'alert'}).children.join(''),/Synthetic save failure/);fail=false;await act(async()=>ui.root.findByProps({'aria-label':label}).props.onChange({target:{checked:false}}));assert.equal(ui.root.findByProps({'aria-label':label}).props.checked,false);await act(async()=>ui.unmount());
});
