import {containsCredential} from './sensitive-text';
export function parseFileProposal(text:string,expectedName?:string):{name:string;content:string}{
 let value:any;try{value=JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw new Error('Proposal must be valid JSON with name and content');}
 if(!value||typeof value.name!=='string'||!value.name||value.name.length>200||/[\\/:]/.test(value.name)||value.name.startsWith('.')||typeof value.content!=='string'||value.content.includes('\0')||Buffer.byteLength(value.content)>12000)throw new Error('Proposal must target one visible filename and contain UTF-8 text up to 12 KB');
 if(containsCredential(value.content))throw new Error('Possible credentials in proposed content; use placeholders without secrets');
 if(expectedName&&value.name!==expectedName)throw new Error('Proposal targeted a different file from the selected input');
 return {name:value.name,content:value.content};
}
