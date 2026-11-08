import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPacServer } from './server/app.mjs';

// This local service deliberately refuses a public bind with demo accounts.
const host=process.env.HOST||'127.0.0.1';
if(!['127.0.0.1','localhost','::1'].includes(host))throw new Error('The demo service must bind to loopback. Configure production identity and deployment before public hosting.');
const root=path.dirname(fileURLToPath(import.meta.url));
const {server}=createPacServer({root});
const port=Number(process.env.PORT)||4361;
server.listen(port,host,()=>{
  fs.mkdirSync(path.join(root,'work'),{recursive:true});
  const url=`http://${host==='::1'?'[::1]':host}:${server.address().port}`;
  fs.writeFileSync(path.join(root,'work/server-url.txt'),url);
  console.log(`PAC Sales Workspace: ${url}/#workspace`);
  console.log(`PAC Website: ${url}/website/`);
  console.log('SQLite persistence enabled. Local test accounts only; see server/COMMANDS.md.');
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
