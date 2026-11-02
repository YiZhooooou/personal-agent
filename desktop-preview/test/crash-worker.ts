import {TaskStore} from '../src/task-store';
import {acquireWorker} from '../src/task-worker';
async function main(){
 const root=process.argv[2];const store=new TaskStore(root);await acquireWorker(root);
 const task=store.submit('Synthetic crash recovery task','crash');store.claim();store.progress(String(task.id),'saved before crash');store.cancel(String(task.id));
 process.send?.({id:task.id});
 setInterval(()=>{},1000);
}
void main();
