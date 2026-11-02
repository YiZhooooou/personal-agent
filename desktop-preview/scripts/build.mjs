import path from 'node:path';
import {build} from 'esbuild-wasm';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/task-cli.ts'],outfile:'dist/tasks.cjs',bundle:true,platform:'node',format:'cjs',target:'node24'});
await build({absWorkingDir:process.cwd(),tsconfig:'tsconfig.json',entryPoints:[path.resolve('src/main.ts')],outfile:'dist/main.cjs',bundle:true,platform:'node',format:'cjs',external:['electron'],target:'node22'});
await build({absWorkingDir:process.cwd(),tsconfig:'tsconfig.json',entryPoints:[path.resolve('src/preload.ts')],outfile:'dist/preload.cjs',bundle:true,platform:'node',format:'cjs',external:['electron'],target:'node22'});
await build({absWorkingDir:process.cwd(),tsconfig:'tsconfig.json',entryPoints:[path.resolve('src/renderer.tsx')],outfile:'dist/renderer.js',bundle:true,platform:'browser',format:'iife',target:'chrome130',minify:process.env.PA_DIAGNOSTIC!=='1',define:{'process.env.NODE_ENV':'"production"'}});
await copyFile('src/index.html','dist/index.html');

