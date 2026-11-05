import type {JobDemoState} from './job-demo';
// A portable job list, not a backup of tasks, messages, profile or audit history.
export function exportJobList(state:JobDemoState){
 if(state.demo)throw new Error('请切换到我的岗位 / Export real records only');
 return JSON.stringify(state.jobs.map(j=>({company:j.company,title:j.title,url:j.url||'',applicationUrl:j.applicationUrl||'',description:j.description||'',notes:j.notes||'',nextAction:j.next,stage:j.needsReview?'unknown':j.stage,appliedOn:j.appliedOn||j.importSource?.reportedAppliedOn||'',evidence:j.evidence})),null,2)+'\n';
}
