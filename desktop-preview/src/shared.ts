import type {AssistantRequest,AssistantPage,AssistantPreview,AssistantTurn,AssistantSavePreview} from './job-assistant-types';
import type {ImportPreview} from './job-import';
import type {BriefWorkerStatus} from './job-brief-worker';
import type {BriefRequest,BriefResponse} from './job-brief';
import type {JobRequest} from './job-records';
import type {JobProfile,ProfileRequest} from './job-profile';
import type {DemoRequest,JobDemoState} from './job-demo';
export type Space = 'personal'|'lab'|'work';
export type Language = 'zh'|'en';
export interface Message {projectContext?:unknown;id:string; role:'user'|'assistant'; text:string; status?:'streaming'|'completed'|'failed'|'interrupted';}
export interface Chat {projectId?:string;id:string; space:Space; title:string; messages:Message[]; draft:string;}
export interface State {version:1; language:Language; theme:'light'|'dark'; mode:'chat'|'workbench'; space:Space; active:string|null; chats:Chat[]; codexPath:string;}
export interface Runtime {connected:boolean; version:string; account:'chatgpt'|'none'|'unsupported'; plan:string; quota:string; busy:boolean; error:string;}
export interface Snapshot {state:State; runtime:Runtime; dataPath:string;}
export type Result<T> = {ok:true; value:T}|{ok:false; error:string};
export interface TaskStep {position:number;title:string;status:string;result:string;error:string;}
export interface TaskRecord {project_id?:string;project_name?:string;context_json?:string;kind?:'text'|'master'|'file';steps?:TaskStep[];id:string;request_key:string;title?:string;status:string;created:string;updated:string;prompt?:string;result?:string;error?:string;}
export interface Bridge {
 jobAssistant(request:AssistantRequest):Promise<Result<AssistantPage|AssistantPreview|AssistantTurn|AssistantSavePreview|JobDemoState>>;
 jobExport():Promise<Result<{saved:boolean;count:number}>>;
 jobImportPreview(raw:string,source:string):Promise<Result<ImportPreview>>;
 jobBriefWorker(operation:'start'|'stop'|'status'):Promise<Result<BriefWorkerStatus>>;
 jobBrief(request:BriefRequest):Promise<Result<BriefResponse>>;
 jobRecords(request:JobRequest):Promise<Result<JobDemoState>>;
 jobProfile(request:ProfileRequest):Promise<Result<JobProfile>>;
 jobDemo(request:DemoRequest):Promise<Result<JobDemoState>>;
 dismissError():Promise<Result<boolean>>;
 bindProject(chatId:string,projectId:string):Promise<Result<boolean>>;
 project(request:object):Promise<Result<any>>;
 tasksList():Promise<Result<TaskRecord[]>>;
 taskGet(id:string):Promise<Result<TaskRecord>>;
 taskCancel(id:string):Promise<Result<TaskRecord>>;
 taskSubmit(prompt:string,key:string,kind?:'text'|'master',projectId?:string):Promise<Result<TaskRecord>>;
 tasksRun(projectId?:string):Promise<Result<boolean>>;
 snapshot():Promise<Result<Snapshot>>;
 preferences(p:Partial<Pick<State,'language'|'theme'|'mode'|'space'>>):Promise<Result<Snapshot>>;
 select(id:string):Promise<Result<Snapshot>>;
 newChat():Promise<Result<Snapshot>>;
 deleteChat(id:string):Promise<Result<Snapshot>>;
 draft(id:string,text:string):Promise<Result<boolean>>;
 connect():Promise<Result<Snapshot>>;
 chooseCodex():Promise<Result<Snapshot>>;
 login():Promise<Result<boolean>>;
 logout():Promise<Result<Snapshot>>;
 refresh():Promise<Result<Snapshot>>;
 send(id:string,text:string):Promise<Result<boolean>>;
 stop():Promise<Result<boolean>>;
 onChange(fn:(data:Snapshot)=>void):()=>void;
}
declare global {interface Window {agent:Bridge;}}
