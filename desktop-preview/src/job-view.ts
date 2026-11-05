import {actionableTodo,pendingTodo} from './job-dates';
import type {DemoJob,DemoTodo,JobStage} from './job-demo';
export function visibleJobs(jobs:DemoJob[],todos:DemoTodo[],query:string,stage:string,view:string,sort:string){
 const earliest=new Map<string,string>();for(const todo of todos)if(pendingTodo(todo)&&todo.dueDate&&(!earliest.has(todo.jobId)||todo.dueDate<earliest.get(todo.jobId)!))earliest.set(todo.jobId,todo.dueDate);
 const pending=new Set(todos.filter(t=>actionableTodo(t)).map(t=>t.jobId)),q=query.trim().toLocaleLowerCase();
 const stages:JobStage[]=['considering','preparing','applied','interview','closed'];
 return jobs.filter(j=>(stage==='all'||j.stage===stage)&&(view!=='review'||j.needsReview===true)&&(view!=='action'||(j.stage!=='closed'&&pending.has(j.id)))&&(!q||(j.company+' '+j.title).toLocaleLowerCase().includes(q))).sort((a,b)=>{
  const due=(id:string)=>earliest.get(id)||'9999-12-31';
  const order=sort==='deadline'?due(a.id).localeCompare(due(b.id)):sort==='stage'?stages.indexOf(a.stage)-stages.indexOf(b.stage):sort==='action'?Number(pending.has(b.id))-Number(pending.has(a.id)):0;
  return order||a.company.localeCompare(b.company)||a.id.localeCompare(b.id);
 });
}
