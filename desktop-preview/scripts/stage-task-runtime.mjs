import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
if(Number(process.versions.node.split('.')[0])<24)throw new Error('Build with Node 24+ for the task SQLite runtime');
for(const file of ['dist/tasks.cjs','dist/memory-service/context-service.exe'])await fs.access(file);
await fs.mkdir('dist/service-runtime',{recursive:true});const binary=await fs.readFile(process.execPath);await fs.writeFile('dist/service-runtime/node.exe',binary);await fs.writeFile('dist/service-runtime/runtime-manifest.json',JSON.stringify({node:process.versions.node,sha256:createHash('sha256').update(binary).digest('hex'),purpose:'Internal engineering validation; release notices and clean-machine acceptance pending'},null,2));
console.log('Staged task runtime '+process.versions.node);
