import React,{useEffect,useRef,useState} from 'react';
import {briefSummaries} from './job-brief';
import type {BriefRequest,BriefResponse,BriefMeta,DailyBrief} from './job-brief';
export function JobBriefPanel({enabled,onSelect,disabled=false}:{enabled:boolean;disabled?:boolean;onSelect:(id:string)=>void}){
 const [status,setStatus]=useState<BriefResponse|null>(null),[brief,setBrief]=useState<DailyBrief|null>(null),[history,setHistory]=useState<BriefMeta[]>([]),[historyOpen,setHistoryOpen]=useState(false),[next,setNext]=useState<string|undefined>(),[error,setError]=useState(''),[pending,setPending]=useState(false),[language,setLanguage]=useState('both');
 const inFlight=useRef(false),active=useRef(enabled);
 async function run(request:BriefRequest){
  if(inFlight.current||!active.current)return;inFlight.current=true;setPending(true);
  try{const r=await window.agent.jobBrief(request);if(!r.ok)throw new Error(r.error);if(!active.current)return;setError('');
   if(request.operation==='list'){setHistory(previous=>request.before?[...previous,...r.value.history||[]]:r.value.history||[]);setNext(r.value.nextBefore);setHistoryOpen(true);}
   else if(request.operation==='read'){setBrief(r.value.brief||null);setHistory(h=>h.map(m=>m.day===request.day?r.value.meta!:m));setStatus(current=>current&&current.today===request.day?{...current,meta:r.value.meta}:current);}
   else setStatus(r.value);
  }catch(e){if(active.current)setError(String(e));}finally{inFlight.current=false;if(active.current)setPending(false);}
 }
 useEffect(()=>{active.current=enabled;if(!enabled){setPending(false);return;}void run({operation:'check'});const timer=setInterval(()=>void run({operation:'check'}),60000);return()=>{active.current=false;clearInterval(timer);};},[enabled]);
 if(!enabled)return null;
 const t=(zh:string,en:string)=>language==='en'?en:zh;
 const today=status?.meta,counts=today?.counts,summaries=brief?briefSummaries(brief):null;
 const buckets={overdue:t('逾期','Overdue'),today:t('今天','Today'),soon:t('未来两天','Next two days'),undated:t('待安排','Unscheduled')};
 return <section className="job-brief" lang={language==='en'?'en':undefined}>
  <div className="job-section-title"><h2>{t('每日简报','Daily brief')}</h2><span>{t('本机规则汇总 · 未发送通知','Local rule-based summary · No notification sent')}</span></div>
  <label className="brief-language">简报语言 / Brief language <select aria-label="简报语言 / Brief language" value={language} onChange={e=>setLanguage(e.target.value)}><option value="both">中英双语 / Both</option><option value="zh">中文</option><option value="en">English</option></select></label>
  {error&&<p role="alert">{t('读取失败，原始错误：','Unable to load. Original error: ')}{error}</p>}
  {!status&&!error&&<p>{t('正在检查今日简报…',"Checking today's brief…")}</p>}
  {status?.status==='scheduled'&&<p>{t('今天 10:00 后生成；错过后下次打开补生成当天一份.','Generated after 10:00 local time. If missed, reopening generates one brief for today only.')}</p>}
  {status?.status==='clock-blocked'&&<p>{t('电脑日期早于已有简报，暂不补生成旧日期。请核对本机时间.','The system date is earlier than a stored brief. Earlier dates will not be backfilled; check the local clock.')}</p>}
  {counts&&<p>{today!.day} · {t('逾期','Overdue')} {counts.overdue} · {t('今天','Today')} {counts.today} · {t('临近','Upcoming')} {counts.soon} · {t('待安排日期','Unscheduled')} {counts.undated} · {today!.seenAt?t('已查看','Read'):t('未查看','Unread')}</p>}
  <div className="brief-controls">
   {today&&<button disabled={pending||disabled} onClick={()=>void run({operation:'read',day:today.day})}>{t('查看今日简报',"View today's brief")}</button>}
   <button disabled={pending||disabled} onClick={()=>void run({operation:'check'})}>{t('检查今日简报',"Check today's brief")}</button>
   <button disabled={pending||disabled} onClick={()=>void run({operation:'list'})}>{t('简报历史','Brief history')}</button>
  </div>
  {historyOpen&&<div className="brief-history"><button onClick={()=>setHistoryOpen(false)}>{t('收起历史','Hide history')}</button>
   {!history.length&&<p>{t('暂无已生成简报.','No briefs have been generated yet.')}</p>}
   {history.map(m=><button key={m.day} disabled={pending||disabled} onClick={()=>void run({operation:'read',day:m.day})}>{m.day} · {m.counts.total} {t('项行动',m.counts.total===1?'action':'actions')} · {m.seenAt?t('已查看','Read'):t('未查看','Unread')}</button>)}
   {next&&<button disabled={pending||disabled} onClick={()=>void run({operation:'list',before:next})}>{t('更早简报','Earlier briefs')}</button>}
  </div>}
  {brief&&summaries&&<div className="brief-detail">
   <div className="job-section-title"><h3>{brief.day} {t('的简报快照','brief snapshot')}</h3><button onClick={()=>setBrief(null)}>{t('收起简报','Hide brief')}</button></div>
   <p className="job-caption">{t('生成于','Generated at')} {new Date(brief.createdAt).toLocaleString(language==='en'?'en':undefined,{timeZone:brief.timeZone,...(language==='en'?{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'} as const:{})})} · {brief.timeZone} · {t('岗位记录版本','Record revision')} {brief.sourceRevision}. {t('这是生成时快照，最新进展以看板为准.','This is a frozen snapshot. Check the board for the latest progress.')}</p>
   {language!=='en'&&<div className="brief-summary" lang="zh-CN"><h4>中文简报</h4><p>{summaries.zh}</p></div>}
   {language!=='zh'&&<div className="brief-summary" lang="en"><h4>English brief</h4><p>{summaries.en}</p></div>}
   <p className="job-caption">{t('公司名、职位、待办和依据保留录入原文，不自动翻译或上传.','Company names, roles, task titles and evidence are shown in their saved language. They are not automatically translated or uploaded.')}</p>
   {!brief.actions.length&&<p>{t('生成时没有逾期、今天、未来两天或未安排日期的行动.','There were no overdue, current, upcoming or undated actions at generation.')}</p>}
   <ol>{brief.actions.map(a=><li key={a.todoId}><button disabled={pending||disabled} onClick={()=>onSelect(a.jobId)}>{a.company} · {a.title}</button><p>{a.action} · {a.dueDate||t('未安排日期','No date set')} · {buckets[a.bucket]}</p><small>{t('原始依据：','Original evidence: ')}{a.source}</small></li>)}</ol>
   {brief.omittedActions>0&&<p>{t('还有','Another')} {brief.omittedActions} {t('项未展开，请到看板查询.','actions are omitted here. Find them on the board.')}</p>}
   <details><summary>{t('已投递待核对','Submitted roles to check')} ({brief.counts.waiting})</summary><p className="job-caption">{t('未接入邮箱，不能据此判断没有收到回复.','Email is not connected. These records do not establish whether replies have arrived.')}</p>
    {brief.waiting.map(j=><p key={j.jobId}><button disabled={pending||disabled} onClick={()=>onSelect(j.jobId)}>{j.company} · {j.title}</button> · {j.appliedOn||t('投递日期未记录','Submission date not recorded')}</p>)}
    {brief.omittedWaiting>0&&<p>{t('另有','Another')} {brief.omittedWaiting} {t('项请到看板查询.','roles can be found on the board.')}</p>}
   </details>
  </div>}
 </section>;
}
