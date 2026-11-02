import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
export function memoryCall(root:string,request:object){
 const executable=path.join(__dirname,'memory-service','context-service.exe');
 if(!fs.existsSync(executable))throw new Error('Project memory runtime is missing. Rebuild the memory service.');
 const raw=execFileSync(executable,[path.join(root,'project-memory')],{input:JSON.stringify(request),encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:2*1024*1024});
 const r=JSON.parse(raw);if(!r.ok)throw new Error(r.error);return r.value;
}
export function memoryContext(root:string,project:string,text:string){
 if(!fs.existsSync(path.join(root,'project-memory',project,'memory.sqlite3')))return null;
 return memoryCall(root,{operation:'context',project,text});
}
