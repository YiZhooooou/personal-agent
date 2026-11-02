import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';

const require=createRequire(import.meta.url);
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
const electronDist=path.resolve(process.env.ELECTRON_DIST||pkg.build.electronDist);
const actual=(await fs.readFile(path.join(electronDist,'version'),'utf8')).trim();
if(actual!==pkg.devDependencies.electron)throw new Error(`Electron runtime ${actual} differs from pinned ${pkg.devDependencies.electron}; install the pinned runtime before packaging`);
function run(script,args=[]){const result=spawnSync(process.execPath,[script,...args],{stdio:'inherit',windowsHide:true});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);}
run(process.env.npm_execpath,['run','build']);
run('scripts/stage-task-runtime.mjs');
run(process.env.BUILDER_CLI||require.resolve('electron-builder/cli.js'),['--win','dir',`--config.electronVersion=${actual}`,`--config.electronDist=${electronDist}`,...process.argv.slice(2)]);
