import type {DemoJob,DemoTodo,JobStage} from './job-demo';
export function visibleJobs(jobs:DemoJob[],todos:DemoTodo[],query:string,stage:string,view:string,sort:string){
 const pending=new Set(todos.filter(t=>!t.done).map(t=>t.jobId)),q=query.trim().toLocaleLowerCase();
 const stages:JobStage[]=['considering','preparing','applied','interview','closed'];
 return jobs.filter(j=>(stage==='all'||j.stage===stage)&&(view!=='action'||(j.stage!=='closed'&&pending.has(j.id)))&&(!q||(j.company+' '+j.title).toLocaleLowerCase().includes(q))).sort((a,b)=>{
  const order=sort==='stage'?stages.indexOf(a.stage)-stages.indexOf(b.stage):sort==='action'?Number(pending.has(b.id))-Number(pending.has(a.id)):0;
  return order||a.company.localeCompare(b.company)||a.id.localeCompare(b.id);
 });
}
