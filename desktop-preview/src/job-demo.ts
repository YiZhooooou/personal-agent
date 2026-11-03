import type {JobProfile,JobProfileFields} from './job-profile';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const jobStages=['considering','preparing','applied','interview','closed'] as const;
export type JobStage=typeof jobStages[number];
export interface DemoJob{id:string;company:string;title:string;stage:JobStage;match:string;reasons:string[];next:string;evidence:string;materials:string[];history:{at:string;stage:JobStage;source:string;fromStage?:JobStage;previousEvidence?:string}[];}
export interface DemoTodo{id:string;jobId:string;title:string;due:string;done:boolean;}
export interface DemoMessage{id:string;role:'user'|'assistant';text:string;jobId:string;context?:{profile?:{revision:number;confirmed:boolean;fields?:JobProfileFields};job:DemoJob|null;todos:DemoTodo[]};}
export interface JobDemoState{version:1;demo:true;selectedId:string;jobs:DemoJob[];todos:DemoTodo[];messages:DemoMessage[];}
export type DemoRequest={operation:'get'}|{operation:'select';id:string}|{operation:'stage';id:string;stage:JobStage}|{operation:'todo';id:string;done:boolean}|{operation:'message';text:string};
export function seedDemo():JobDemoState{return {version:1,demo:true,selectedId:'northstar',jobs:[
 {id:'northstar',company:'Northstar · 示例公司',title:'Software Engineer',stage:'interview',match:'优先考虑',reasons:['示例：岗位技术方向符合目标','示例：需要进一步确认工作资格要求'],next:'确认面试时间，准备项目经历',evidence:'示例邮件：收到面试邀请（非真实邮箱）',materials:['简历 A · 示例占位，尚无文件','面试邀请 · 示例记录'],history:[]},
 {id:'harbor',company:'Harbor · 示例公司',title:'Frontend Engineer',stage:'preparing',match:'部分匹配',reasons:['示例：前端经验相关','示例：薪资范围尚未确认'],next:'检查简历重点，准备申请材料',evidence:'用户添加的示例岗位；尚未提交',materials:['简历 B · 示例占位，尚无文件'],history:[]},
 {id:'cedar',company:'Cedar · 示例公司',title:'Full Stack Developer',stage:'applied',match:'待核实',reasons:['示例：尚缺完整职位描述，不生成虚假分数'],next:'准备一次跟进草稿，由用户决定是否发送',evidence:'示例申请确认；用于展示七天无回复跟进',materials:['申请确认 · 示例记录'],history:[]}
 ],todos:[{id:'t1',jobId:'northstar',title:'确认面试时间并准备自我介绍',due:'今天 · 示例',done:false},{id:'t2',jobId:'harbor',title:'检查申请材料，提交前由你审核',due:'今天 17:00 · 示例截止',done:false},{id:'t3',jobId:'cedar',title:'投递七天无回复：准备跟进草稿',due:'今天 · 示例规则',done:false}],messages:[{id:'welcome',role:'assistant',jobId:'',text:'这里是本地演示 Master。选中右侧岗位后，我会带上该岗位的阶段、资料和待办，展示下一步。示例回复由本机规则生成，不调用模型、不读取邮箱、不发送申请。'}]};}
export class JobDemoStore{
 private file:string;private state:JobDemoState;
 constructor(root:string,private profile?:()=>JobProfile){this.file=path.join(root,'job-demo.json');this.state=seedDemo();if(fs.existsSync(this.file)){const s=JSON.parse(fs.readFileSync(this.file,'utf8'));if(s.version!==1||s.demo!==true||!Array.isArray(s.jobs)||!Array.isArray(s.todos)||!Array.isArray(s.messages)||!s.jobs.some((j:DemoJob)=>j.id===s.selectedId)||s.jobs.some((j:DemoJob)=>!jobStages.includes(j.stage)))throw new Error('演示数据无法读取；原文件未覆盖。');this.state=s;}}
 request(input:unknown):JobDemoState{
  if(!input||typeof input!=='object')throw new Error('Invalid demo request');const r=input as DemoRequest;
  if(r.operation==='get')return structuredClone(this.state);
  const next=structuredClone(this.state);
  if(r.operation==='select'||r.operation==='stage'){const job=next.jobs.find(j=>j.id===r.id);if(!job)throw new Error('Unknown demo job');if(r.operation==='select')next.selectedId=job.id;else{if(!jobStages.includes(r.stage))throw new Error('Invalid job stage');if(job.stage!==r.stage){const fromStage=job.stage,previousEvidence=job.evidence;job.stage=r.stage;job.next=({considering:'核对岗位条件，再决定是否准备申请',preparing:'检查申请材料，提交前由你审核',applied:'核对投递依据并跟踪后续回复',interview:'确认面试安排并准备相关材料',closed:'此机会已结束；请复核该岗位尚未完成的待办'} as Record<JobStage,string>)[r.stage];job.history.push({at:new Date().toISOString(),stage:r.stage,source:'用户手动更正 · 演示数据',fromStage,previousEvidence});job.evidence='用户手动更正 · 演示数据；未验证真实提交';}}}
  else if(r.operation==='todo'){const todo=next.todos.find(t=>t.id===r.id);if(!todo||typeof r.done!=='boolean')throw new Error('Invalid todo');todo.done=r.done;}
  else if(r.operation==='message'){if(typeof r.text!=='string'||!r.text.trim()||r.text.length>4000)throw new Error('请输入 1–4000 字符');if(next.messages.length>=200)throw new Error('演示对话已达 200 条；不会删除已有记录。');const profile=this.profile?.();const profileInput=profile?{revision:profile.revision,confirmed:profile.confirmed,...(profile.confirmed?{fields:structuredClone(profile.fields)}:{})}:undefined;const job=next.jobs.find(j=>j.id===next.selectedId)||null,todos=next.todos.filter(t=>t.jobId===job?.id);next.messages.push({id:randomUUID(),role:'user',text:r.text.trim(),jobId:next.selectedId,context:{profile:profileInput,job:structuredClone(job),todos:structuredClone(todos)}});next.messages.push({id:randomUUID(),role:'assistant',jobId:next.selectedId,text:job?'【本地规则演示，非 AI 回复】\n当前岗位：'+job.company+' / '+job.title+'\n求职档案：'+(profile?.confirmed?'已确认 v'+profile.revision+' · 目标 '+profile.fields.targetRoles:'尚未确认，不使用草稿条件')+'\n下一步：'+job.next+'\n未完成事项：'+(todos.filter(t=>!t.done).map(t=>t.title).join('；')||'暂无')+'\n依据：'+job.evidence+'\n你的问题已记录；当前仅演示上下文关联，未生成真实材料或执行操作。':'未选择岗位。'});}
  else throw new Error('Unsupported demo operation');
  fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';fs.writeFileSync(temp,JSON.stringify(next,null,2));fs.renameSync(temp,this.file);this.state=next;return structuredClone(next);
 }
}
