import path from 'node:path';import {TaskService} from '../src/task-service';
new TaskService(process.argv[2],path.resolve('dist-test/job-assistant-fixture-worker.cjs')).run('done',process.argv[3],'assistant-run').then(()=>console.log('ASSISTANT_PARENT_EXITING')).catch(error=>{console.error(error.message);process.exitCode=1;});
