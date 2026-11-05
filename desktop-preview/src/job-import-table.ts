const headers:Record<string,string>={company:'company','公司':'company',title:'title','职位':'title','职位名称':'title',url:'url','岗位链接':'url','岗位来源链接':'url',applicationurl:'applicationUrl','申请链接':'applicationUrl',description:'description','职位描述':'description',notes:'notes','备注':'notes',nextaction:'nextAction','下一步':'nextAction',stage:'stage','阶段':'stage',appliedon:'appliedOn','投递日期':'appliedOn',evidence:'evidence','依据':'evidence'};
// A bounded CSV/TSV reader: quoted commas, tabs, line breaks and doubled quotes are data.
export function parseImportList(input:string):unknown{
 const text=input.replace(/^\uFEFF/,'').trim();if(text.startsWith('['))return JSON.parse(text);
 const delimiter=text.split(/\r?\n/,1)[0].includes('\t')?'\t':',';
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 const finishCell=()=>{row.push(cell);cell='';closed=false;};
 const finishRow=()=>{finishCell();if(row.some(v=>v.trim()))rows.push(row);row=[];if(rows.length>201)throw new Error('每批最多 200 条 / Maximum 200 rows');};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c===delimiter){finishCell();continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;finishRow();continue;}
  if(closed)throw new Error('引号后只能是分隔符或换行 / Unexpected text after closing quote');
  if(c==='"'){if(cell)throw new Error('字段中引号需双写 / Quote must start a field');quoted=true;}else cell+=c;
 }
 if(quoted)throw new Error('引号未闭合 / Unclosed quoted field');finishRow();
 const first=rows.shift();if(!first?.length)throw new Error('需要表头 / A header row is required');
 const keys=first.map(value=>headers[value.trim().toLowerCase()]);
 if(keys.some(key=>!key)||new Set(keys).size!==keys.length||!keys.includes('company')||!keys.includes('title'))throw new Error('表头需要 company/title 或 公司/职位；不支持未知或重复列 / Required company/title headers; unknown or duplicate columns are not supported');
 return rows.map(values=>{if(values.length>keys.length)throw new Error('某行列数超过表头 / A row has more cells than headers');return Object.fromEntries(keys.map((key,i)=>[key,values[i]??'']));});
}
export const tableExample='公司\t职位\t岗位链接\t阶段\t投递日期\t依据\t下一步\nExample Company\tSoftware Engineer\thttps://example.invalid/jobs/123\t状态不明\t\t旧对话摘要，尚未核实\t核对投递记录';
