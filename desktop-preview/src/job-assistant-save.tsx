import React,{useEffect,useRef,useState} from 'react';
import type {AssistantRequest,AssistantSavePreview} from './job-assistant-types';
import type {JobDemoState} from './job-demo';

export function JobAssistantSave({initial,call,onSaved,onClose}:{initial:AssistantSavePreview;call:<T>(r:AssistantRequest)=>Promise<T>;onSaved:(state:JobDemoState)=>void;onClose:()=>void}){
 const [preview,setPreview]=useState(initial),[kind,setKind]=useState<'note'|'next'>('note'),[text,setText]=useState(''),[day,setDay]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
 const combinedNotes=[preview.job.notes,text.trim()].filter(Boolean).join('\n\n').length;
 const box=useRef<HTMLElement>(null),first=useRef<HTMLButtonElement>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;first.current?.focus();return()=>{alive.current=false;};},[]);
 async function reload(){setPending(true);setError('');try{const fresh=await call<AssistantSavePreview>({operation:'advice-preview',id:preview.turn.id});if(alive.current)setPreview({...fresh,key:preview.key});}catch(e){if(alive.current)setError(String(e));}finally{if(alive.current)setPending(false);}}
 async function save(){setPending(true);setError('');try{const state=await call<JobDemoState>({operation:'save-advice',id:preview.turn.id,key:preview.key,revision:preview.revision,kind,text,dueDate:kind==='next'?day:''});if(alive.current){onSaved(state);onClose();}}catch(e){if(alive.current)setError(String(e));}finally{if(alive.current)setPending(false);}}
 return <div className="modal-backdrop"><section ref={box} className="modal assistant-input-review" role="dialog" aria-modal="true" aria-label="审核保存 Master 建议" onKeyDown={event=>{if(event.key==='Escape'&&!pending)onClose();if(event.key==='Tab'){const controls=Array.from(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')||[]),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}>
  <h2>审核后保存到原岗位</h2><p><strong>{preview.job.company} · {preview.job.title}</strong> · 当前记录 v{preview.revision}</p><p>只保存你下面确认的文字。备注会追加；下一步会更新摘要并新增一条待办，不取消已有安排，不改变投递阶段。仅保存本机。</p>
  <details><summary>原回复与来源</summary><p className="record-long-text">{preview.turn.output}</p><small>{preview.turn.model} · 岗位记录 v{preview.turn.recordsRevision} · 档案 v{preview.turn.profileRevision} · {preview.turn.id}</small></details>
  <details><summary>当前岗位备注与下一步</summary><p className="record-long-text">备注：{preview.job.notes||'暂无'}</p><p>下一步：{preview.job.next}</p></details>
  <label className="profile-field">保存为<select aria-label="建议保存位置" value={kind} disabled={pending} onChange={e=>setKind(e.target.value as 'note'|'next')}><option value="note">追加岗位备注</option><option value="next" disabled={preview.job.stage==='closed'}>下一步与待办</option></select></label>
  <label className="profile-field">你确认保留的文字<textarea aria-label="确认保留的建议" value={text} disabled={pending} maxLength={kind==='note'?1000:500} onChange={e=>setText(e.target.value)} placeholder="从回复中整理出需要保留的内容；不会默认保存整段回复"/></label><small>{text.length} / {kind==='note'?1000:500}{kind==='note'&&' · 追加后备注 '+combinedNotes+' / 4,000'}{kind==='note'&&combinedNotes>4000&&' · 请缩短文字或先编辑原备注'}</small>
  {kind==='next'&&<label className="profile-field">待办日期（可选）<input aria-label="建议待办日期" type="date" value={day} disabled={pending} onInput={e=>setDay(e.currentTarget.value)} onChange={e=>setDay(e.target.value)}/><small>{day?'将安排于 / Scheduled for: '+day:'未安排日期 / No date scheduled'}</small></label>}
  {error&&<p role="alert">{error} <button disabled={pending} onClick={()=>void reload()}>重新读取岗位（保留填写内容）</button></p>}
  <div className="button-row"><button ref={first} disabled={pending} onClick={onClose}>返回回复</button><button className="primary" disabled={pending||!text.trim()||text.length>(kind==='note'?1000:500)||(kind==='note'&&combinedNotes>4000)||(kind==='next'&&preview.job.stage==='closed')} onClick={()=>void save()}>{pending?'正在保存…':'确认保存到该岗位'}</button></div>
 </section></div>;
}
