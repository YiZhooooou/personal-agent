import {JobRecordsStore} from '../src/job-records';
const store=new JobRecordsStore(process.argv[2]);
try{console.log(JSON.stringify(store.briefing({operation:'check'},new Date(process.argv[3]))));}finally{store.close();}
