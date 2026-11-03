import type {DemoTodo} from './job-demo';
export function localDay(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function validDay(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function addDays(value:string,days:number){if(!validDay(value))throw new Error('无效日期');return new Date(Date.parse(value+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);}
export function pendingTodo(todo:DemoTodo){return !todo.done&&!todo.cancelled;}
export function actionableTodo(todo:DemoTodo,now=new Date()){return pendingTodo(todo)&&(!todo.dueDate||todo.dueDate<=addDays(localDay(now),2));}
export function todoDateLabel(todo:DemoTodo,now=new Date()){if(todo.cancelled)return '已取消 · '+(todo.resolution||'');if(!todo.dueDate)return todo.due;const today=localDay(now);return todo.dueDate+(todo.done?' · 已完成':todo.dueDate<today?' · 已逾期':todo.dueDate===today?' · 今天':' · 待办日期');}
