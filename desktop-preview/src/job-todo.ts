import type {DemoJob,DemoTodo} from './job-demo';
import {jobText} from './job-fields';
import {validDay} from './job-dates';
export type TodoAction='reschedule'|'cancel'|'restore';
export function recordTodoChange(todo:DemoTodo,action:TodoAction|'complete'|'reopen',reason:string,now:Date,dueDate=todo.dueDate||''){
 todo.changes??=[];todo.changes.push({at:now.toISOString(),action,reason,previousDueDate:todo.dueDate||'',dueDate});
}
export function todoRestoreBlock(todo:DemoTodo,job:DemoJob):string{
  if(todo.superseded||['进度记录已更新，旧跟进安排已取消','已记录新的进度依据，旧核对任务已取消'].includes(todo.resolution||''))return '旧待办已被新进度替代，请创建新的待办 / This task was superseded; create a new task';
  if(!todo.cancelled||job.stage==='closed')return '此待办不能恢复 / This task cannot be restored';
  if(todo.kind==='followup'&&(job.stage!=='applied'||job.appliedOn!==todo.anchor))return '旧跟进已被新进度替代，请创建新的待办 / This follow-up was superseded; create a new task';
  if(todo.kind==='review'&&!job.needsReview)return '此核对事项已解决，请创建新的待办 / This review was resolved; create a new task';
 return '';
}
export function reviseTodo(todo:DemoTodo,job:DemoJob,action:TodoAction,date:unknown,basis:unknown,now:Date){
 const reason=jobText(basis,1000,true);
 if(!['reschedule','cancel','restore'].includes(action))throw new Error('Unsupported todo action');
 if(action==='restore'){
  const blocked=todoRestoreBlock(todo,job);if(blocked)throw new Error(blocked);
  recordTodoChange(todo,action,reason,now);todo.cancelled=false;todo.resolution=reason;return;
 }
 if(todo.cancelled||todo.done)throw new Error('请先恢复或重新打开待办 / Restore or reopen this task first');
 if(action==='reschedule'){
  if(job.stage==='closed')throw new Error('已结束岗位不能改期待办 / Cannot reschedule a closed role');
  const day=jobText(date,10,true);if(!validDay(day))throw new Error('请填写 YYYY-MM-DD 日期 / Enter a valid YYYY-MM-DD date');
  recordTodoChange(todo,action,reason,now,day);todo.dueDate=day;todo.due=day;
 }else{recordTodoChange(todo,action,reason,now);todo.cancelled=true;todo.resolution=reason;}
}
