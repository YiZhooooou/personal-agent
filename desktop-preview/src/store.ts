import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {State,Space,Chat} from './shared';
export const spaces:Space[]=['personal','lab','work'];
export class Store {
 state:State;
 constructor(public root:string) {
  fs.mkdirSync(root,{recursive:true});
  this.state={version:1,language:'zh',theme:'light',mode:'chat',space:'personal',active:null,chats:[],codexPath:''};
  const file=path.join(root,'preview-state.json');
  if(fs.existsSync(file)){
   // Fail visibly rather than overwriting unreadable existing data.
   const s=JSON.parse(fs.readFileSync(file,'utf8'));
   if(s.version!==1 || !Array.isArray(s.chats) || !spaces.includes(s.space)) throw new Error('Invalid preview data. Restore a backup; the existing file has not been changed.');
   const ids=new Set<string>();
   for(const c of s.chats){
    if(typeof c.id!=='string'||ids.has(c.id)||!spaces.includes(c.space)||typeof c.title!=='string'||typeof c.draft!=='string'||!Array.isArray(c.messages))throw new Error('Invalid conversation data');
    ids.add(c.id);
    for(const m of c.messages){if(!['user','assistant'].includes(m.role)||typeof m.text!=='string'||typeof m.id!=='string')throw new Error('Invalid message data');if(m.status==='streaming')m.status='interrupted';}
   }
   this.state={...this.state,...s};
   if(!['zh','en'].includes(this.state.language))this.state.language='zh';
   if(!['light','dark'].includes(this.state.theme))this.state.theme='light';
   if(!['chat','workbench'].includes(this.state.mode))this.state.mode='chat';
   if(typeof this.state.codexPath!=='string')this.state.codexPath='';
  }
  this.ensureActive();
 }
 save(){const file=path.join(this.root,'preview-state.json');const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(this.state,null,2));fs.renameSync(tmp,file);}
 newChat():Chat {const c:Chat={id:randomUUID(),space:this.state.space,title:'',messages:[],draft:''};this.state.chats.unshift(c);this.state.active=c.id;this.save();return c;}
 ensureActive(){if(!this.state.chats.some(c=>c.id===this.state.active&&c.space===this.state.space)){this.state.active=this.state.chats.find(c=>c.space===this.state.space)?.id??null;if(!this.state.active)this.newChat();}}
 chat(id:string){const c=this.state.chats.find(c=>c.id===id&&c.space===this.state.space);if(!c)throw new Error('Conversation does not belong to the current space');return c;}
}
export function outbound(chat:Chat,text:string){
 if(chat.space==='work')throw new Error('Work space cannot send to a cloud model');
 if(typeof text!=='string'||!text.trim()||text.length>16000)throw new Error('Message must contain 1–16,000 characters');
 const history=chat.messages.filter(m=>m.status==='completed').slice(-20);
 const selected:typeof history=[];let count=0;
 for(const m of history.reverse()){if(count+m.text.length>20000)break;count+=m.text.length;selected.unshift(m);}
 return JSON.stringify({context:selected.map(({role,text})=>({role,text})),userMessage:text});
}
