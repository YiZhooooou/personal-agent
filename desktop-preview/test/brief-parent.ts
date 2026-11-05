import path from 'node:path';
import {TaskService} from '../src/task-service';
const root=process.argv[2];
new TaskService(root,path.resolve(process.argv[3]||'dist-test/task-cli.cjs')).run('','','brief-watch').then(()=>console.log('BRIEF_PARENT_EXITING')).catch(error=>{console.error(error.message);process.exitCode=1;});
