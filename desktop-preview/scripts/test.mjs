import {build} from 'esbuild-wasm';
import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('dist-test',{recursive:true});
await build({entryPoints:['./test/core.test.ts'],outfile:'dist-test/core.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22',tsconfig:'tsconfig.json'});
const result=spawnSync(process.execPath,['--test','dist-test/core.test.cjs'],{stdio:'inherit',windowsHide:true});
process.exit(result.status??1);
