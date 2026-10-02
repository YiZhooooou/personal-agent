import {contextBridge,ipcRenderer} from 'electron';
import type {Bridge,Snapshot} from './shared';
const invoke=(name:string,...args:unknown[])=>ipcRenderer.invoke('agent:'+name,...args);
const bridge:Bridge={
 snapshot:()=>invoke('snapshot'),preferences:p=>invoke('preferences',p),select:id=>invoke('select',id),newChat:()=>invoke('newChat'),deleteChat:id=>invoke('deleteChat',id),draft:(id,text)=>invoke('draft',id,text),connect:()=>invoke('connect'),chooseCodex:()=>invoke('chooseCodex'),login:()=>invoke('login'),logout:()=>invoke('logout'),refresh:()=>invoke('refresh'),send:(id,text)=>invoke('send',id,text),stop:()=>invoke('stop'),
 onChange:fn=>{const listener=(_e:Electron.IpcRendererEvent,data:Snapshot)=>fn(data);ipcRenderer.on('agent:changed',listener);return()=>ipcRenderer.removeListener('agent:changed',listener);}
};
contextBridge.exposeInMainWorld('agent',bridge);
