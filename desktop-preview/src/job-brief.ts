import type {JobDemoState} from './job-demo';
import {addDays,localDay,pendingTodo} from './job-dates';
export interface BriefAction{todoId:string;jobId:string;company:string;title:string;action:string;dueDate:string;bucket:'overdue'|'today'|'soon'|'undated';kind:string;source:string;}
export interface DailyBrief{day:string;createdAt:string;timeZone:string;sourceRevision:number;counts:{overdue:number;today:number;soon:number;undated:number;followups:number;waiting:number;total:number};actions:BriefAction[];waiting:{jobId:string;company:string;title:string;appliedOn:string}[];omittedActions:number;omittedWaiting:number;source:string;notification:'not-sent';}
export interface BriefMeta{day:string;createdAt:string;seenAt:string|null;counts:DailyBrief['counts'];}
export type BriefRequest={operation:'check'}|{operation:'list';before?:string}|{operation:'read';day:string};
export interface BriefResponse{status:'created'|'existing'|'scheduled'|'clock-blocked'|'history'|'read';today:string;brief?:DailyBrief;meta?:BriefMeta;history?:BriefMeta[];nextBefore?:string;}
export function buildDailyBrief(state:JobDemoState,now=new Date()):DailyBrief{
 const day=localDay(now),soon=addDays(day,2),jobs=new Map(state.jobs.filter(j=>j.stage!=='closed').map(j=>[j.id,j]));
 const actions:BriefAction[]=state.todos.filter(t=>pendingTodo(t)&&jobs.has(t.jobId)&&(!t.dueDate||t.dueDate<=soon)).map(t=>{const job=jobs.get(t.jobId)!;return {todoId:t.id,jobId:job.id,company:job.company,title:job.title,action:t.title,dueDate:t.dueDate||'',bucket:!t.dueDate?'undated':t.dueDate<day?'overdue':t.dueDate===day?'today':'soon',kind:t.kind||'manual',source:t.source||'已保存本机待办'};});
 const rank={overdue:0,today:1,soon:2,undated:3};actions.sort((a,b)=>rank[a.bucket]-rank[b.bucket]||a.dueDate.localeCompare(b.dueDate)||a.company.localeCompare(b.company)||a.todoId.localeCompare(b.todoId));
 const waiting=state.jobs.filter(j=>j.stage==='applied').map(j=>({jobId:j.id,company:j.company,title:j.title,appliedOn:j.appliedOn||''})).sort((a,b)=>a.company.localeCompare(b.company)||a.jobId.localeCompare(b.jobId));
 const count=(bucket:BriefAction['bucket'])=>actions.filter(a=>a.bucket===bucket).length;
 return {day,createdAt:now.toISOString(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,sourceRevision:state.revision||0,counts:{overdue:count('overdue'),today:count('today'),soon:count('soon'),undated:count('undated'),followups:actions.filter(a=>a.kind==='followup').length,waiting:waiting.length,total:actions.length},actions:actions.slice(0,50),waiting:waiting.slice(0,20),omittedActions:Math.max(0,actions.length-50),omittedWaiting:Math.max(0,waiting.length-20),source:'生成时已保存的本机岗位与待办；未接入邮件，不代表已核实有无回复',notification:'not-sent'};
}
