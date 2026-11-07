import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(process.env.ROLLBAG_SOURCE || path.join(root,'data/catalog'));
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.pdf':'application/pdf','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.wasm':'application/wasm','.woff2':'font/woff2','.txt':'text/plain','.gz':'application/gzip'};
const server=http.createServer((req,res)=>{
 let url;try {url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(url==='/explorer'){res.writeHead(302,{'Location':'/explorer/'}).end();return;}
 const isExplorer=url.startsWith('/explorer/');
 const base=url.startsWith('/source/')?source:isExplorer?path.join(root,'assets/explorer'):root;
 let relative=url.startsWith('/source/')?url.slice(8):isExplorer?url.slice(10):url==='/'?'index.html':url.slice(1);
 if(!relative || relative.endsWith('/'))relative+='index.html';
 const file=path.resolve(base,relative);
 if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);});
});
fs.mkdirSync(path.join(root,'work'),{recursive:true});
let port=Number(process.env.PORT)||4317;
server.on('error',e=>{if(e.code==='EADDRINUSE'&&!process.env.PORT){port++;server.listen(port,'127.0.0.1');}else throw e;});
server.listen(port,'127.0.0.1',()=>{const url=`http://127.0.0.1:${server.address().port}`;fs.writeFileSync(path.join(root,'work/server-url.txt'),url);console.log(`PAC Rollbag demo: ${url}`);});
