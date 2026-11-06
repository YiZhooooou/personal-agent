import {EventEmitter} from 'node:events';
import {runAssistant} from '../src/job-assistant-worker';import type {Codex} from '../src/codex';
const root=process.argv[3],mode=process.argv[4],id=process.argv[5];
class FixtureClient extends EventEmitter{
 async start(){return 'fixture-only';}close(){}
 async request(method:string){
  if(method==='account/read')return {account:{type:'chatgpt'}};
  if(method==='thread/start')return {thread:{id:'fixture'}};
  if(method==='turn/start'){setTimeout(()=>this.emit('notification','item/agentMessage/delta',{threadId:'fixture',delta:'SYNTHETIC_PROCESS_REPLY'}),100);if(mode!=='hold')setTimeout(()=>this.emit('notification','turn/completed',{threadId:'fixture',turn:{status:'completed'}}),1200);return {turn:{id:'turn'}};}
  if(method==='turn/interrupt'){this.emit('notification','turn/completed',{threadId:'fixture',turn:{status:'interrupted'}});return {};}
  return {};
 }
}
runAssistant(root,id,'',()=>process.send?.({ready:true}),new FixtureClient() as unknown as Codex).catch(error=>{console.error(error.message);process.exitCode=1;});
