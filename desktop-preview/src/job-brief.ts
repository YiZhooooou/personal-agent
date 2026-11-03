import type {JobDemoState} from './job-demo';
import {addDays,localDay,pendingTodo} from './job-dates';
export interface BriefAction{todoId:string;jobId:string;company:string;title:string;action:string;dueDate:string;bucket:'overdue'|'today'|'soon'|'undated';kind:string;source:string;}
export interface DailyBrief{summary?:{zh:string;en:string};day:string;createdAt:string;timeZone:string;sourceRevision:number;counts:{overdue:number;today:number;soon:number;undated:number;followups:number;waiting:number;total:number};actions:BriefAction[];waiting:{jobId:string;company:string;title:string;appliedOn:string}[];omittedActions:number;omittedWaiting:number;source:string;notification:'not-sent';}
export interface BriefMeta{day:string;createdAt:string;seenAt:string|null;counts:DailyBrief['counts'];}
export type BriefRequest={operation:'check'}|{operation:'list';before?:string}|{operation:'read';day:string};
export interface BriefResponse{status:'created'|'existing'|'scheduled'|'clock-blocked'|'history'|'read';today:string;brief?:DailyBrief;meta?:BriefMeta;history?:BriefMeta[];nextBefore?:string;}
export function buildDailyBrief(state:JobDemoState,now=new Date()):DailyBrief{
 const day=localDay(now),soon=addDays(day,2),jobs=new Map(state.jobs.filter(j=>j.stage!=='closed').map(j=>[j.id,j]));
 const actions:BriefAction[]=state.todos.filter(t=>pendingTodo(t)&&jobs.has(t.jobId)&&(!t.dueDate||t.dueDate<=soon)).map(t=>{const job=jobs.get(t.jobId)!;return {todoId:t.id,jobId:job.id,company:job.company,title:job.title,action:t.title,dueDate:t.dueDate||'',bucket:!t.dueDate?'undated':t.dueDate<day?'overdue':t.dueDate===day?'today':'soon',kind:t.kind||'manual',source:t.source||'已保存本机待办'};});
 const rank={overdue:0,today:1,soon:2,undated:3};actions.sort((a,b)=>rank[a.bucket]-rank[b.bucket]||a.dueDate.localeCompare(b.dueDate)||a.company.localeCompare(b.company)||a.todoId.localeCompare(b.todoId));
 const waiting=state.jobs.filter(j=>j.stage==='applied').map(j=>({jobId:j.id,company:j.company,title:j.title,appliedOn:j.appliedOn||''})).sort((a,b)=>a.company.localeCompare(b.company)||a.jobId.localeCompare(b.jobId));
 const count=(bucket:BriefAction['bucket'])=>actions.filter(a=>a.bucket===bucket).length;
 const brief:DailyBrief={day,createdAt:now.toISOString(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,sourceRevision:state.revision||0,counts:{overdue:count('overdue'),today:count('today'),soon:count('soon'),undated:count('undated'),followups:actions.filter(a=>a.kind==='followup').length,waiting:waiting.length,total:actions.length},actions:actions.slice(0,50),waiting:waiting.slice(0,20),omittedActions:Math.max(0,actions.length-50),omittedWaiting:Math.max(0,waiting.length-20),source:'生成时已保存的本机岗位与待办；未接入邮件，不代表已核实有无回复',notification:'not-sent'};
 brief.summary=briefSummaries(brief);return brief;
}

// Legacy snapshots gain a display-only English view; their stored facts stay unchanged.
export function briefSummaries(brief:DailyBrief):{zh:string;en:string}{
 if(brief.summary)return {zh:brief.summary.zh,en:brief.summary.en};
 const c=brief.counts;
 return {
  zh:`${brief.day} 求职简报：共 ${c.total} 项行动，其中逾期 ${c.overdue} 项、今天 ${c.today} 项、未来两天 ${c.soon} 项、未安排日期 ${c.undated} 项。其中需要核对的跟进 ${c.followups} 项。标记为已投递、待核对状态的岗位 ${c.waiting} 个。依据生成时的本机记录版本 ${brief.sourceRevision}，不是当前实时状态；未读取邮箱、未调用 AI、未发送通知。`,
  en:`Job-search brief for ${brief.day}. This snapshot contains ${c.total} action item${c.total===1?'':'s'}: ${c.overdue} overdue, ${c.today} due today, ${c.soon} due in the next two days, and ${c.undated} without a scheduled date. Follow-up checks among these actions: ${c.followups}. Roles marked as submitted whose status needs checking: ${c.waiting}. Based on saved local records at revision ${brief.sourceRevision}, not the live state. No email was read, no AI was called, and no notification was sent.`
 };
}
