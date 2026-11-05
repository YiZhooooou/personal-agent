import {build} from 'esbuild-wasm';
import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('dist-test',{recursive:true});
await build({entryPoints:['./test/tasks.test.ts'],outfile:'dist-test/tasks.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node24',tsconfig:'tsconfig.json'});
await build({entryPoints:['./test/core.test.ts'],outfile:'dist-test/core.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22',tsconfig:'tsconfig.json'});
await build({entryPoints:{'late-stderr-worker':'./test/late-stderr-worker.ts','brief-parent':'./test/brief-parent.ts','brief-worker':'./test/brief-worker.ts','crash-worker':'./test/crash-worker.ts','task-cli':'./src/task-cli.ts'},outdir:'dist-test',outExtension:{'.js':'.cjs'},bundle:true,platform:'node',format:'cjs',target:'node24'});
const result=spawnSync(process.execPath,['--test','dist-test/core.test.cjs','dist-test/tasks.test.cjs','test/chat-switch.test.mjs'],{stdio:'inherit',windowsHide:true});
process.exit(result.status??1);
