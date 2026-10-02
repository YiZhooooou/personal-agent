import {build} from 'esbuild-wasm';
import {mkdtempSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
await build({entryPoints:['./src/codex.ts'],outfile:'dist-test/codex.cjs',bundle:true,platform:'node',format:'cjs',target:'node22',tsconfig:'tsconfig.json'});
const {Codex}=createRequire(import.meta.url)('../dist-test/codex.cjs');
const scratch=path.resolve('../../../work');mkdirSync(scratch,{recursive:true});
const root=mkdtempSync(path.join(scratch,'pa-codex-check-'));
const c=new Codex(root);
try{
 const version=await c.start();
 const account=await c.request('account/read',{refreshToken:false});
 if(account.account!==null)throw new Error('Expected an isolated signed-out account');
 console.log(JSON.stringify({version,isolatedLogin:true,handshake:true,inferenceTested:false}));
}finally{c.close();}
