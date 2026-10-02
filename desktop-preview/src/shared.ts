export type Space = 'personal'|'lab'|'work';
export type Language = 'zh'|'en';
export interface Message {id:string; role:'user'|'assistant'; text:string; status?:'streaming'|'completed'|'failed'|'interrupted';}
export interface Chat {id:string; space:Space; title:string; messages:Message[]; draft:string;}
export interface State {version:1; language:Language; theme:'light'|'dark'; mode:'chat'|'workbench'; space:Space; active:string|null; chats:Chat[]; codexPath:string;}
export interface Runtime {connected:boolean; version:string; account:'chatgpt'|'none'|'unsupported'; plan:string; quota:string; busy:boolean; error:string;}
export interface Snapshot {state:State; runtime:Runtime; dataPath:string;}
export type Result<T> = {ok:true; value:T}|{ok:false; error:string};
export interface Bridge {
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
