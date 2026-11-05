import {parseImportList} from './job-import-table';
import type {JobDemoState} from './job-demo';
import {jobStages} from './job-demo';
import type {NewJobFields} from './job-records';
import {fieldsOf,jobText} from './job-fields';
import {validDay,localDay} from './job-dates';
export interface ImportRow{row:number;status:'ready'|'review'|'duplicate'|'error';company:string;title:string;message:string;fields?:NewJobFields;reportedStage?:string;reportedAppliedOn?:string;}
export interface ImportPreview{revision:number;source:string;rows:ImportRow[];}

// Imported text is evidence only. This parser never opens URLs or follows instructions.
export function prepareJobImport(raw:unknown,source:unknown,state:JobDemoState,now=new Date()):ImportPreview{
 const input=jobText(raw,500000,true),label=jobText(source,200,true);let values:unknown;
 try{values=parseImportList(input);}catch(e){throw new Error('清单无法读取 / Cannot read list: '+(e as Error).message);}
 if(!Array.isArray(values)||!values.length||values.length>200)throw new Error('每批需要 1–200 条记录。Import 1–200 rows per batch.');
 const links=new Map<string,string>(),sources=new Map<string,string>(),names=new Set<string>();
 const name=(company:string,title:string)=>company.toLocaleLowerCase()+'\n'+title.toLocaleLowerCase();
 for(const j of state.jobs){if(j.url)sources.set(j.url,'已有岗位 / Existing job: '+j.company+' · '+j.title);for(const url of [j.url,j.applicationUrl])if(url)links.set(url,'已有岗位 / Existing job: '+j.company+' · '+j.title);names.add(name(j.company,j.title));}
 const rows:ImportRow[]=values.map((value,index)=>{
  const row:ImportRow={row:index+1,status:'error',company:'',title:'',message:''};
  try{
   if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('每条记录必须是对象 / Each row must be an object');
   const v=value as Record<string,unknown>,allowed=['company','title','url','applicationUrl','description','notes','nextAction','stage','appliedOn','evidence'];
   if(Object.keys(v).some(key=>!allowed.includes(key)))throw new Error('含未知字段，请参考格式示例 / Unknown field; check the format example');
   row.company=jobText(v.company,200,true);row.title=jobText(v.title,200,true);
   const base=fieldsOf(Object.fromEntries(allowed.slice(0,7).map(key=>[key,v[key]??''])));row.company=base.company;row.title=base.title;
   const reportedStage=jobText(v.stage??'unknown',30)||'unknown',stage=({'待考虑':'considering','准备中':'preparing','已投递':'applied','面试':'interview','结束':'closed','状态不明':'unknown'} as Record<string,string>)[reportedStage]||reportedStage.toLowerCase(),day=jobText(v.appliedOn??'',10),evidence=jobText(v.evidence??'',2000);
   if(stage!=='unknown'&&!jobStages.includes(stage as any))throw new Error('阶段需为 considering/preparing/applied/interview/closed/unknown');
   if(day&&!validDay(day))throw new Error('投递日期无效 / Invalid application date');
   const uncertain=stage==='unknown'||(stage!=='considering'&&!evidence)||(stage==='applied'&&(!day||day>localDay(now)));
   row.reportedStage=reportedStage;row.reportedAppliedOn=day;
   row.fields={...base,stage:uncertain?'considering':stage as NewJobFields['stage'],appliedOn:uncertain?'':day,evidence:uncertain?'导入资料待核对 / Imported record needs review'+(evidence?' · '+evidence:''):evidence};
   const urls=[base.url,base.applicationUrl].filter(Boolean),duplicate=base.url?sources.get(base.url):undefined,sharedLink=urls.map(url=>links.get(url)).find(Boolean);
   if(duplicate){row.status='duplicate';row.message=duplicate;return row;}
   const similar=names.has(name(base.company,base.title));
   row.status=uncertain||similar||sharedLink?'review':'ready';row.message=uncertain?'状态依据不完整，先保存为待考虑并标记待核对 / Incomplete evidence; save as considering, review required':sharedLink?'共享申请入口或跨来源链接，请核对是否同一岗位 / Shared application or cross-source link; check whether this is the same role':similar?'同公司同职位可能重复，请人工核对 / Similar company and role; review before saving':'可导入 / Ready to import';
   if(base.url)sources.set(base.url,'本批第 '+row.row+' 行 / Earlier batch row '+row.row);for(const url of urls)links.set(url,'本批第 '+row.row+' 行 / Earlier batch row '+row.row);names.add(name(base.company,base.title));
  }catch(e){row.message=(e as Error).message;}
  return row;
 });
 return {revision:state.revision||0,source:label,rows};
}
