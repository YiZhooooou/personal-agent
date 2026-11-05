import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[3];
process.send?.({ready:true});
setTimeout(()=>{console.error('Synthetic diagnostic after launching parent exited');fs.writeFileSync(path.join(root,'late-worker-completed'),'ok');},1000);
