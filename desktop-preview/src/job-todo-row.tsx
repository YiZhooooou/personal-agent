import React,{useState} from 'react';
import type {DemoTodo} from './job-demo';
import type {TodoAction} from './job-todo';
import {todoDateLabel,localDay} from './job-dates';
export function JobTodoRow({todo,pending,onToggle,onRevise}:{todo:DemoTodo;pending:boolean;onToggle:(done:boolean)=>void;onRevise:(action:TodoAction,date:string,reason:string)=>Promise<boolean>}){
 const [open,setOpen]=useState(false),[action,setAction]=useState<TodoAction>(todo.cancelled?'restore':'reschedule'),[date,setDate]=useState(todo.dueDate||localDay()),[reason,setReason]=useState('');
 const names={reschedule:'改期 / Reschedule',cancel:'取消 / Cancel',restore:'恢复 / Restore'};
 return <article className="job-todo-record"><label className="record-todo"><input type="checkbox" disabled={pending||todo.cancelled} checked={todo.done} aria-label={'岗位待办：'+todo.title} onChange={e=>onToggle(e.target.checked)}/><span>{todo.title}<small>{todoDateLabel(todo)} · {todo.source}</small></span></label>
  {!todo.done&&<button disabled={pending} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'收起调整':'调整待办'}</button>}
  {open&&!todo.done&&<form className="todo-adjustment" onSubmit={e=>{e.preventDefault();void onRevise(action,action==='reschedule'?date:'',reason).then(ok=>{if(ok){setOpen(false);setReason('');}});}}>
   <label className="profile-field">操作 / Action<select aria-label={'待办操作：'+todo.title} value={action} disabled={pending} onChange={e=>setAction(e.target.value as TodoAction)}>{(todo.cancelled?['restore']:['reschedule','cancel']).map(key=><option key={key} value={key}>{names[key as TodoAction]}</option>)}</select></label>
   {action==='reschedule'&&<label className="profile-field">新日期 / New date<input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" maxLength={10} aria-label={'待办新日期：'+todo.title} required value={date} disabled={pending} onChange={e=>setDate(e.target.value)}/></label>}
   <label className="profile-field">调整原因 / Reason<textarea aria-label={'待办调整原因：'+todo.title} required maxLength={1000} value={reason} disabled={pending} onChange={e=>setReason(e.target.value)}/></label>
   <button disabled={pending||!reason.trim()} type="submit">保存调整 / Save change</button><p className="job-caption">保留原日期与原因。被新进度替代的自动跟进或已解决核对不能恢复。<br/>Original dates and reasons remain in history. Superseded follow-ups and resolved review tasks cannot be restored.</p>
  </form>}
  {!!todo.changes?.length&&<details><summary>待办调整记录 / Task history ({todo.changes.length})</summary>{todo.changes.map((change,i)=><p key={i}>{names[change.action]} · {change.previousDueDate||'未安排'} → {change.dueDate||'未安排'} · {change.reason} · {new Date(change.at).toLocaleString()}</p>)}</details>}
 </article>;
}
