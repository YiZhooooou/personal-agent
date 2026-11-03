import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {containsCredential} from './sensitive-text';
export interface JobProfileFields {targetRoles:string;locations:string;salary:string;workAuthorization:string;mustHave:string;preferences:string;resumeText:string;}
export interface JobProfile {revision:number;updatedAt:string;confirmed:boolean;fields:JobProfileFields;}
export type ProfileRequest={operation:'get'}|{operation:'save';revision:number;confirmed:boolean;fields:JobProfileFields};
export function emptyProfile():JobProfile{return {revision:0,updatedAt:'',confirmed:false,fields:{targetRoles:'',locations:'',salary:'',workAuthorization:'',mustHave:'',preferences:'',resumeText:''}};}
function validateFields(fields:unknown):JobProfileFields{
 if(!fields||typeof fields!=='object'||Array.isArray(fields))throw new Error('Invalid profile fields');
 const record=fields as Record<string,unknown>,names=Object.keys(emptyProfile().fields);
 if(Object.keys(record).some(k=>!names.includes(k)))throw new Error('Unknown profile field');
 for(const key of names){const limit=key==='resumeText'?16000:['mustHave','preferences'].includes(key)?4000:1000;if(typeof record[key]!=='string'||(record[key] as string).length>limit)throw new Error('档案字段格式不正确或超过长度限制');if(containsCredential(record[key] as string))throw new Error('请勿在求职档案中保存密码或令牌');}
 return structuredClone(fields) as JobProfileFields;
}
export class JobProfileStore {
 private file:string;
 constructor(root:string){this.file=path.join(root,'job-profile.json');}
 request(input:unknown):JobProfile{
  if(!input||typeof input!=='object')throw new Error('Invalid profile request');const r=input as ProfileRequest;let current=emptyProfile();
  if(fs.existsSync(this.file)){const saved=JSON.parse(fs.readFileSync(this.file,'utf8'));if(!Number.isSafeInteger(saved.revision)||saved.revision<1||typeof saved.confirmed!=='boolean'||typeof saved.updatedAt!=='string')throw new Error('档案记录无法读取，原文件未修改');validateFields(saved.fields);current=saved;}
  if(r.operation==='get')return structuredClone(current);
  if(r.operation!=='save'||typeof r.confirmed!=='boolean'||!Number.isSafeInteger(r.revision))throw new Error('Invalid profile save');
  if(r.revision!==current.revision)throw new Error('求职档案已有更新，请重新读取后合并修改。当前草稿未丢弃。');
  const fields=validateFields(r.fields);if(r.confirmed&&!fields.targetRoles.trim())throw new Error('确认档案前请填写目标职位');
  const next={revision:current.revision+1,updatedAt:new Date().toISOString(),confirmed:r.confirmed,fields};fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.'+randomUUID()+'.tmp';
  try{fs.writeFileSync(temp,JSON.stringify(next,null,2),{encoding:'utf8',flag:'wx'});fs.renameSync(temp,this.file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}return structuredClone(next);
 }
}
