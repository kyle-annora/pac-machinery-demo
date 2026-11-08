import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import * as S from '../src/sales-domain.js';
import { openStore, hash, DEMO_ACCOUNTS } from './store.mjs';
import { runCommand, previewReprice } from './commands.mjs';
import { createCatalogStore } from './catalog-store.mjs';
import * as catalogHelpers from '../src/catalog-admin.js';
import { n as normalizeInspection } from '../assets/explorer/assets/inspection-reference-WG_yQLtT.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clone = value => JSON.parse(JSON.stringify(value));
const fail = (status,code,message) => { throw Object.assign(new Error(message),{status,code}); };
const text = (value,max=10000) => { if(value==null)return '';if(typeof value!=='string'||value.length>max)fail(400,'INVALID_INPUT',`Text must be at most ${max} characters.`);return value.trim(); };
const required = (value,label,max=10000) => { const out=text(value,max);if(!out)fail(400,'INVALID_INPUT',`${label} is required.`);return out; };
const key = value => { if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(value))fail(400,'REQUEST_ID_REQUIRED','Supply a unique requestId of 8–128 letters, digits, underscores or hyphens.');return value; };
const now = () => new Date().toISOString();
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.pdf':'application/pdf','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.wasm':'application/wasm','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.gz':'application/gzip','.mp4':'video/mp4','.webm':'video/webm'};
const sessionCookie = value => `pac_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${value ? 43200 : 0}`;

export function loadCatalog(catalogRoot) {
  const read = name => JSON.parse(fs.readFileSync(path.join(catalogRoot,name),'utf8'));
  const catalog={manifest:read('manifest.json'),overview:read('overview.json'),machines:read('catalog/machines.json'),priceLines:read('catalog/price_lines.json'),narratives:read('catalog/narratives.json'),media:read('catalog/media.json'),terms:read('catalog/commercial_terms.json'),kits:read('catalog/spare_parts.json'),options:read('catalog/options.json'),baseUrl:'/source'};
  if(catalog.manifest.status!=='passed'||!catalog.manifest.signed_off)throw new Error('A signed-off catalog is required.');
  return catalog;
}
function json(res,status,value,headers={}) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers});res.end(JSON.stringify(value));}
function cookie(req) {return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('pac_session='))?.slice(12)||'';}
async function body(req,max=6*1024*1024) {
  if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'JSON_REQUIRED','Send application/json.');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>max)fail(413,'BODY_TOO_LARGE','This request is too large.');chunks.push(chunk);}
  let result;try{result=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{fail(400,'INVALID_JSON','The request body is not valid JSON.');}
  if(!result||typeof result!=='object'||Array.isArray(result))fail(400,'INVALID_JSON','Send a JSON object.');
  return result;
}
function trustedRequest(req) {
  const host=req.headers.host||'';
  if(!/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i.test(host))fail(403,'LOCAL_ONLY','This development service accepts loopback hosts only.');
  const origin=req.headers.origin;
  if(origin&&origin!==`http://${host}`&&origin!==`https://${host}`)fail(403,'ORIGIN_REJECTED','Use the same-origin application to make this request.');
  if(req.headers['sec-fetch-site']==='cross-site')fail(403,'ORIGIN_REJECTED','Cross-site API requests are not allowed.');
}
function jsonResult(value){return value===undefined?null:clone(value);}
function inquiryReference(value,catalog) {
  const fields=['productId','title','note','source','preview','photo','inspection'];
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(field=>!fields.includes(field))||JSON.stringify(value).length>300000)fail(400,'INVALID_INPUT','The product reference is invalid or too large.');
  const result={productId:required(value.productId,'Reference product',150),title:text(value.title,300),note:text(value.note,10000),source:text(value.source,500)};
  if(!catalog.machines.some(m=>m.machine_id===result.productId))fail(400,'INVALID_INPUT','Choose a reference product from this catalog.');
  const localPhotos=new Set(catalog.media.flatMap(m=>[m.file,m.converted_file]).filter(Boolean).map(file=>'/source/'+file));
  for(const field of ['preview','photo'])if(value[field]!=null){
    const image=text(value[field],120000);
    if(!localPhotos.has(image)&&!(field==='preview'&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)))fail(400,'INVALID_INPUT','Reference images must be source photographs or a bounded captured image.');
    result[field]=image;
  }
  if(value.inspection!=null){try{result.inspection=normalizeInspection(value.inspection);}catch(error){fail(400,'INVALID_INPUT',error.message);}}
  return result;
}

export function createPacServer({root=ROOT,catalogRoot=process.env.ROLLBAG_SOURCE||path.join(root,'data/catalog'),dbPath=process.env.PAC_DB_PATH||path.join(root,'work/runtime/pac.sqlite'),demoPassword=process.env.PAC_DEMO_PASSWORD||'pac-demo-2026'}={}) {
  const sourceCatalog=loadCatalog(catalogRoot),store=openStore(dbPath,sourceCatalog,demoPassword),db=store.db;
  const catalogStore=createCatalogStore(store,sourceCatalog,catalogHelpers);
  let catalog=catalogStore.project().catalog;
  const loginAttempts=new Map(), writeRates=new Map();
  function throttle(key,limit=60){const time=Date.now(),previous=writeRates.get(key),entry=previous&&previous.until>time?previous:{count:0,until:time+60000};entry.count++;writeRates.set(key,entry);if(entry.count>limit)fail(429,'RATE_LIMITED','Too many submissions. Wait a minute before trying again.');if(writeRates.size>5000)for(const [id,item] of writeRates)if(item.until<=time)writeRates.delete(id);}
  function user(req){const result=store.session(cookie(req));if(!result)fail(401,'AUTH_REQUIRED','Sign in to the sales workspace.');return result;}
  function seller(req){const result=user(req);if(!['sales','manager'].includes(result.role))fail(403,'FORBIDDEN','Sales or Manager access is required.');return result;}
  function existingRequest(actor,id,payloadHash){const found=db.prepare('SELECT * FROM requests WHERE actor=? AND request_id=?').get(actor,id);if(found&&found.payload_hash!==payloadHash)fail(409,'REQUEST_REUSED','This requestId was already used for another operation.');return found?JSON.parse(found.result):null;}
  function recordRequest(actor,id,payloadHash,result){db.prepare('INSERT INTO requests VALUES(?,?,?,?,?)').run(actor,id,payloadHash,JSON.stringify(result),now());}
  function workspaceMutation(actor,requestId,payload,fn,expectedVersion=null){
    const id=key(requestId),digest=hash(JSON.stringify(payload));
    return store.transaction(()=>{
      const replay=existingRequest(actor,id,digest),current=store.workspace();
      if(replay)return {...current,result:replay.result,replayed:true};
      if(expectedVersion!==null&&(!Number.isInteger(expectedVersion)||expectedVersion!==current.version))fail(409,'VERSION_CONFLICT','The workspace changed. Reload it before reconciling your retained edits.');
      const result=jsonResult(fn(current.state));
      const version=store.writeWorkspace(current.state,current.version);
      recordRequest(actor,id,digest,{result});
      return {state:current.state,version,result};
    });
  }
  function shareFor(token){
    if(!/^[A-Za-z0-9_-]{40,128}$/.test(token))fail(404,'SHARE_NOT_FOUND','This proposal link is unavailable.');
    const share=db.prepare('SELECT * FROM shares WHERE token_hash=?').get(hash(token));
    if(!share)fail(404,'SHARE_NOT_FOUND','This proposal link is unavailable.');
    if(share.revoked_at)fail(410,'SHARE_REVOKED','This proposal link was revoked. Contact your PAC representative.');
    if(share.expires_at<=Date.now())fail(410,'SHARE_EXPIRED','This proposal link has expired. Contact your PAC representative.');
    return share;
  }
  function publicView(share){
    const {state}=store.workspace(),deal=S.findDeal(state,share.deal_id);
    if(!deal)fail(404,'SHARE_NOT_FOUND','This proposal is unavailable.');
    return {proposal:S.publicProposal(deal,share.proposal_id),recipient:{name:share.recipient_name,email:share.recipient_email},share:{id:share.id,expiresAt:new Date(share.expires_at).toISOString(),createdAt:share.created_at}};
  }
  async function api(req,res,url){
    trustedRequest(req);
    const pathname=url.pathname,method=req.method;
    if(pathname==='/api/health'&&method==='GET')return json(res,200,{ok:true,service:'pac-workspace',mode:'local-demo',persistence:'sqlite',websiteIndependent:true});
    if(pathname==='/api/session'&&method==='GET')return json(res,200,{user:store.session(cookie(req)),mode:'local-demo',accounts:DEMO_ACCOUNTS});
    if(pathname==='/api/login'&&method==='POST'){
      const input=await body(req,8192),address=req.socket.remoteAddress||'local',prior=loginAttempts.get(address);
      if(prior&&prior.until>Date.now()&&prior.count>=15)fail(429,'RATE_LIMITED','Too many sign-in attempts. Try again in a minute.');
      const identity=store.authenticate(text(input.email,254),text(input.password,1024));
      if(!identity){loginAttempts.set(address,{count:prior&&prior.until>Date.now()?prior.count+1:1,until:Date.now()+60000});fail(401,'INVALID_CREDENTIALS','The email or password is incorrect.');}
      loginAttempts.delete(address);
      return json(res,200,{user:identity,mode:'local-demo'},{'Set-Cookie':sessionCookie(store.createSession(identity))});
    }
    if(pathname==='/api/logout'&&method==='POST'){await body(req,1024);db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(cookie(req)));return json(res,200,{ok:true},{'Set-Cookie':sessionCookie('')});}
    if(pathname==='/api/catalog'&&method==='GET'){user(req);return json(res,200,catalogStore.project());}
    if(pathname==='/api/catalog/commands'&&method==='POST'){
      const identity=user(req),input=await body(req,65536);
      const result=catalogStore.command(input,identity);catalog=result.catalog;
      return json(res,200,result);
    }
    const reprice=pathname.match(/^\/api\/quotes\/([^/]+)\/([^/]+)\/reprice$/);
    if(reprice&&method==='GET'){
      seller(req);const {working,...preview}=previewReprice(catalog,store.workspace().state,reprice[1],reprice[2],catalogStore.read().version);
      return json(res,200,preview);
    }
    if(pathname==='/api/workspace'&&method==='GET'){const identity=user(req);return json(res,200,{...store.workspace(),user:identity});}
    if(pathname==='/api/workspace/commands'&&method==='POST'){
      const identity=user(req),input=await body(req);
      const command=required(input.command,'Command',80),args=input.args||{};
      if(!Number.isInteger(input.expectedVersion))fail(400,'VERSION_REQUIRED','Include the workspace expectedVersion.');
      const result=workspaceMutation(identity.id,input.requestId,{command,args},state=>runCommand(catalog,state,command,args,identity,{catalogVersion:catalogStore.read().version}),input.expectedVersion);
      return json(res,200,{...result,user:identity});
    }
    if(pathname==='/api/shares'&&method==='GET'){
      seller(req);const dealId=required(url.searchParams.get('dealId'),'Deal',150);
      const shares=db.prepare('SELECT id,deal_id,proposal_id,recipient_name,recipient_email,created_at,expires_at,revoked_at FROM shares WHERE deal_id=? ORDER BY created_at DESC').all(dealId);
      return json(res,200,{shares:shares.map(s=>({id:s.id,dealId:s.deal_id,proposalId:s.proposal_id,recipientName:s.recipient_name,recipientEmail:s.recipient_email,createdAt:s.created_at,expiresAt:new Date(s.expires_at).toISOString(),revokedAt:s.revoked_at}))});
    }
    if(pathname==='/api/shares'&&method==='POST'){
      const identity=seller(req),input=await body(req,8192),requestId=key(input.requestId);
      const clean={dealId:required(input.dealId,'Deal',150),proposalId:required(input.proposalId,'Proposal',150),recipientName:required(input.recipientName,'Recipient name',150),recipientEmail:text(input.recipientEmail,254),expiresInDays:input.expiresInDays??30};
      if(!Number.isFinite(clean.expiresInDays)||clean.expiresInDays<=0||clean.expiresInDays>90)fail(400,'INVALID_INPUT','Choose an expiry between 0 and 90 days.');
      if(clean.recipientEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.recipientEmail))fail(400,'INVALID_INPUT','Enter a valid recipient email.');
      const result=store.transaction(()=>{
        const actor=`share:${identity.id}`,digest=hash(JSON.stringify(clean)),replay=existingRequest(actor,requestId,digest);if(replay)return replay;
        const deal=S.findDeal(store.workspace().state,clean.dealId);if(!deal)fail(404,'NOT_FOUND','Deal not found.');S.publicProposal(deal,clean.proposalId);
        const id=randomUUID(),token=randomBytes(32).toString('base64url'),createdAt=now(),expiresAt=Date.now()+clean.expiresInDays*86400000;
        db.prepare('INSERT INTO shares VALUES(?,?,?,?,?,?,?,?,?,NULL)').run(id,hash(token),deal.id,clean.proposalId,clean.recipientName,clean.recipientEmail,identity.id,createdAt,expiresAt);
        const value={id,token,url:`/review.html#${token}`,dealId:deal.id,proposalId:clean.proposalId,recipientName:clean.recipientName,recipientEmail:clean.recipientEmail,expiresAt:new Date(expiresAt).toISOString(),createdAt};
        recordRequest(actor,requestId,digest,value);return value;
      });
      return json(res,201,result);
    }
    const revoke=pathname.match(/^\/api\/shares\/([^/]+)$/);
    if(revoke&&method==='DELETE'){seller(req);const updated=db.prepare('UPDATE shares SET revoked_at=? WHERE id=?').run(now(),revoke[1]);if(!updated.changes)fail(404,'NOT_FOUND','Share link not found.');return json(res,200,{ok:true});}
    const customer=pathname.match(/^\/api\/customer\/([A-Za-z0-9_-]+)(?:\/(responses|preference))?$/);
    if(customer){
      const share=shareFor(customer[1]);
      if(method==='GET'&&!customer[2])return json(res,200,publicView(share));
      if(method==='POST'&&customer[2]){
        throttle(`customer:${share.id}`);
        const input=await body(req,32768),kind=customer[2],args=kind==='responses'?{kind:input.kind,body:required(input.body,'Response',10000),...(input.section?{section:text(input.section,50)}:{}),...(input.line_id?{line_id:text(input.line_id,150)}:{}),...(input.quote_id?{quote_id:text(input.quote_id,150)}:{})}:{quoteId:required(input.quoteId,'Alternative',150)};
        workspaceMutation(`customer:${share.id}`,input.requestId,{kind,args},state=>{
          // Revalidate access inside the mutation, then bind to the issued share.
          shareFor(customer[1]);const deal=S.findDeal(state,share.deal_id);
          if(kind==='responses')return S.recordCustomerResponse(deal,{...args,proposal_id:share.proposal_id,author:share.recipient_name});
          S.chooseAlternative(deal,args.quoteId,share.proposal_id);return {quoteId:args.quoteId};
        });
        return json(res,200,publicView(share));
      }
    }
    if(pathname==='/api/inquiries'&&method==='POST'){
      throttle(`inquiry:${req.socket.remoteAddress}`);
      const input=await body(req,512*1024),requestId=key(input.requestId);
      const clean={name:required(input.name,'Name',150),company:required(input.company,'Company',200),email:required(input.email,'Email',254),application:required(input.application,'Application',10000),productId:text(input.productId,150),phone:text(input.phone,80),bagDimensions:text(input.bagDimensions,200),targetThroughput:text(input.targetThroughput,200),loadingMethod:text(input.loadingMethod,200),message:text(input.message,10000)};
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email))fail(400,'INVALID_INPUT','Enter a valid email address.');
      if(clean.productId&&!catalog.machines.some(m=>m.machine_id===clean.productId))fail(400,'INVALID_INPUT','Choose a product from this catalog.');
      if(input.reference!=null)clean.reference=inquiryReference(input.reference,sourceCatalog);
      const digest=hash(JSON.stringify(clean));
      const receipt=store.transaction(()=>{
        const previous=db.prepare('SELECT payload_hash,receipt FROM inquiries WHERE request_id=?').get(requestId);
        if(previous){if(previous.payload_hash!==digest)fail(409,'REQUEST_REUSED','This inquiry requestId was already used for different content.');return JSON.parse(previous.receipt);}
        const id=randomUUID(),receivedAt=now(),reference=`PAC-INQ-${id.slice(0,8).toUpperCase()}`;
        const value={id,reference,status:'received',delivered:false,receivedAt,message:'Your inquiry was saved in this demonstration. It has not been emailed to PAC.'};
        db.prepare('INSERT INTO inquiries VALUES(?,?,?,?,?,?)').run(id,requestId,digest,JSON.stringify(clean),JSON.stringify(value),receivedAt);
        return value;
      });
      return json(res,201,receipt);
    }
    fail(404,'NOT_FOUND','This API route does not exist.');
  }
  async function staticFile(req,res,url){
    if(!['GET','HEAD'].includes(req.method))fail(405,'METHOD_NOT_ALLOWED','Use GET for public files.');
    let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{fail(400,'INVALID_PATH','Invalid path.');}
    if(pathname.includes('\0')||pathname.split('/').some(part=>part==='..'||part.startsWith('.')))fail(403,'FORBIDDEN','This path is not public.');
    if(pathname==='/website'||pathname==='/explorer'){res.writeHead(302,{Location:`${pathname}/`});res.end();return;}
    let base=root,relative=pathname.slice(1)||'index.html';
    if(pathname.startsWith('/source/')){base=catalogRoot;relative=pathname.slice(8);}
    else if(pathname.startsWith('/explorer/')){base=path.join(root,'assets/explorer');relative=pathname.slice(10);}
    else if(!['index.html','review.html','favicon.ico','robots.txt','sitemap.xml'].includes(relative)&&!['src','assets','website'].includes(relative.split('/')[0])&&!relative.startsWith('data/catalog/'))fail(404,'NOT_FOUND','Page not found.');
    if(!relative||relative.endsWith('/'))relative+='index.html';
    const file=path.resolve(base,relative),resolvedBase=fs.realpathSync(base);
    if(!file.startsWith(path.resolve(base)+path.sep))fail(403,'FORBIDDEN','This path is not public.');
    let actual,stat;try{actual=fs.realpathSync(file);stat=fs.statSync(actual);}catch{fail(404,'NOT_FOUND','Page not found.');}
    if(!actual.startsWith(resolvedBase+path.sep)||!stat.isFile())fail(403,'FORBIDDEN','This path is not public.');
    res.writeHead(200,{'Content-Type':MIME[path.extname(actual)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    if(req.method==='HEAD'){res.end();return;}fs.createReadStream(actual).pipe(res);
  }
  const server=http.createServer(async(req,res)=>{
    try{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(url.pathname.startsWith('/api/'))await api(req,res,url);else await staticFile(req,res,url);}
    catch(error){if(res.headersSent){res.end();return;}const internal=String(error.code||'').startsWith('ERR_SQLITE')||['ENOENT','EACCES','SQLITE_ERROR'].includes(error.code);const status=error.status||(internal?500:400);json(res,status,{error:{code:internal?'SERVICE_ERROR':error.code||'VALIDATION_FAILED',message:status>=500?'The service could not complete this request. Try again.':error.message}});}
  });
  server.on('close',()=>store.close());
  return {server,store,get catalog(){return catalog;},catalogStore,dbPath};
}
