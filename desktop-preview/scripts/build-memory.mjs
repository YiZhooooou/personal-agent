import {spawnSync} from 'node:child_process';
import {cp,mkdir} from 'node:fs/promises';
import path from 'node:path';
const target=path.resolve('dist/memory-service-build');
const result=spawnSync(process.env.MEMORY_BUILD_PYTHON||'python',['-m','PyInstaller','--noconfirm','--onedir','--name','context-service','--distpath',target,'--workpath',path.resolve('../.memory-build/work'),'--specpath',path.resolve('../.memory-build'),'../context_service.py'],{stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
await mkdir('dist/memory-service',{recursive:true});await cp(path.join(target,'context-service'),'dist/memory-service',{recursive:true});
