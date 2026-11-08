import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPacServer } from '../server/app.mjs';
import * as S from '../src/sales-domain.js';
import * as C from '../src/catalog.js';
import { stageQuoteChange } from '../src/quote-edit-session.js';

async function fixture(t) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pac-service-test-'));
  const dbPath=path.join(directory,'workspace.sqlite');
  let instance=createPacServer({dbPath});
  const start=async()=>{await new Promise(resolve=>instance.server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${instance.server.address().port}`;};
  let base=await start();
  t.after(async()=>{if(instance.server.listening)await new Promise(resolve=>instance.server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});});
  const request=async(route,{method='GET',cookie,body,headers={}}={})=>{
    const response=await fetch(base+route,{method,headers:{...(cookie?{cookie}:{}),...(body!==undefined?{'content-type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const data=await response.json().catch(()=>null);return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
  };
  const login=async(role='sales')=>{const response=await request('/api/login',{method:'POST',body:{email:`${role}@pac.demo`,password:'pac-demo-2026'}});assert.equal(response.status,200);return response.cookie;};
  const command=(cookie,version,name,args={},requestId=crypto.randomUUID())=>request('/api/workspace/commands',{method:'POST',cookie,body:{command:name,args,expectedVersion:version,requestId}});
  const restart=async()=>{await new Promise(resolve=>instance.server.close(resolve));instance=createPacServer({dbPath});base=await start();};
  return {request,login,command,restart,get catalog(){return instance.catalog;},get store(){return instance.store;}};
}

test('service establishes actual sessions, enforces origin and keeps runtime files private',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/api/workspace')).status,401);
  assert.equal((await f.request('/api/login',{method:'POST',body:{email:'sales@pac.demo',password:'wrong'}})).status,401);
  const cookie=await f.login();
  const session=await f.request('/api/session',{cookie});assert.equal(session.data.user.role,'sales');assert.equal(session.data.user.id,'pac-sales');
  assert.match((await f.request('/api/login',{method:'POST',body:{email:'sales@pac.demo',password:'pac-demo-2026'}})).headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  assert.equal((await f.request('/api/logout',{method:'POST',cookie,body:{},headers:{origin:'https://attacker.example'}})).status,403);
  for(const p of ['/work/runtime/pac.sqlite','/server/app.mjs','/.git/config','/docs/product/PAC-DELIVERY-PLAN.md','/tests/service-api.test.mjs'])assert.ok([403,404].includes((await f.request(p)).status),p);
  const logout=await f.request('/api/logout',{method:'POST',cookie,body:{}});assert.equal(logout.status,200);
  assert.equal((await f.request('/api/workspace',{cookie})).status,401);
});

test('durable workspace has CAS, safe retries and survives service restart',async t=>{
  const f=await fixture(t),cookie=await f.login();
  const before=(await f.request('/api/workspace',{cookie})).data,deal=before.state.deals[0],requestId=crypto.randomUUID();
  const args={dealId:deal.id,input:{next_action:'Review the loading requirements'}};
  const saved=await f.command(cookie,before.version,'updateDeal',args,requestId);assert.equal(saved.status,200);assert.equal(saved.data.version,before.version+1);
  const retry=await f.command(cookie,before.version,'updateDeal',args,requestId);assert.equal(retry.status,200);assert.equal(retry.data.version,saved.data.version);assert.equal(retry.data.replayed,true);
  assert.equal((await f.command(cookie,before.version,'updateDeal',{dealId:deal.id,input:{title:'Stale update'}})).status,409);
  assert.equal((await f.command(cookie,saved.data.version,'updateDeal',{dealId:deal.id,input:{title:'Reused ID'}},requestId)).status,409);
  await f.restart();
  const reopened=(await f.request('/api/workspace',{cookie})).data;assert.equal(reopened.version,saved.data.version);assert.equal(reopened.state.deals[0].next_action,args.input.next_action);assert.equal(reopened.state.deals[0].title,deal.title);
});

test('server roles cannot be overridden in command arguments',async t=>{
  const f=await fixture(t),sales=await f.login(),engineering=await f.login('engineering');
  let current=(await f.request('/api/workspace',{cookie:sales})).data;
  const dealId=current.state.deals[0].id,quoteId=current.state.deals[0].quotes[1].id;
  current=(await f.command(sales,current.version,'reviseQuote',{dealId,quoteId,note:'Role verification'})).data;
  assert.equal((await f.command(sales,current.version,'setLaborRate',{dealId,quoteId,rate:1,role:'manager'})).status,403);
  assert.equal((await f.command(sales,current.version,'reviewQuote',{dealId,quoteId,kind:'manager',role:'manager'})).status,403);
  assert.equal((await f.command(engineering,current.version,'createDeal',{input:{title:'Forbidden',customer:'Example',owner:'Engineer'}})).status,403);
  const saved=await f.command(engineering,current.version,'saveEngineering',{dealId,quoteId,input:{description:'Loading adjustment',reason:'Operator access',hours:2,materials:75}});assert.equal(saved.status,200);
  const approved=await f.command(engineering,saved.data.version,'reviewQuote',{dealId,quoteId,kind:'engineering'});assert.equal(approved.status,200);assert.equal(approved.data.result.working.approvals.engineering.simulated,false);assert.equal(approved.data.result.working.approvals.engineering.actor.id,'pac-engineering');
});

test('saveQuoteEdit rebuilds catalog lines and rejects price or privileged changes',async t=>{
  const f=await fixture(t),cookie=await f.login();
  let current=(await f.request('/api/workspace',{cookie})).data;
  const dealId=current.state.deals[0].id,quoteId=current.state.deals[0].quotes[1].id;
  current=(await f.command(cookie,current.version,'reviseQuote',{dealId,quoteId,note:'Add the requested spare parts kit'})).data;
  const deal=current.state.deals[0],entry=stageQuoteChange(deal,quoteId,null,(d,q)=>S.selectOption(f.catalog,d,q,C.getOption(f.catalog,'r3200','spare_parts_kit')));
  const forged=structuredClone(entry);forged.working.draft.lines[0].price_usd=1;
  assert.equal((await f.command(cookie,current.version,'saveQuoteEdit',{entry:forged})).status,400);
  const privileged=structuredClone(entry);privileged.working.labor_rate=1;
  assert.equal((await f.command(cookie,current.version,'saveQuoteEdit',{entry:privileged})).status,400);
  const saved=await f.command(cookie,current.version,'saveQuoteEdit',{entry});assert.equal(saved.status,200);assert.equal(S.totals(saved.data.result).total,41940);assert.deepEqual(saved.data.result.working.approvals,{});
  assert.equal((await f.command(cookie,saved.data.version,'saveQuoteEdit',{entry})).status,409);
});

test('selling-price commands enforce session roles, protect editor payloads and keep published prices immutable',async t=>{
  const f=await fixture(t),sales=await f.login(),manager=await f.login('manager'),engineering=await f.login('engineering');
  let current=(await f.request('/api/workspace',{cookie:sales})).data;
  const dealId=current.state.deals[0].id,quoteId=current.state.deals[0].quotes[1].id,oldProposalId=current.state.deals[0].proposals[0].id,sourceCatalog=JSON.stringify(f.catalog);
  const quote=()=>S.findQuote(S.findDeal(current.state,dealId),quoteId),lineId=quote().working.draft.lines[0].quote_line_id;
  const act=async(name,args={},cookie=sales)=>{const response=await f.command(cookie,current.version,name,{dealId,quoteId,...args});assert.equal(response.status,200,JSON.stringify(response.data));current=response.data;return current.result;};
  const input={price_usd:28580,reason:'Internal commercial scope adjustment'};
  assert.equal((await f.command(sales,current.version,'setLinePriceOverride',{dealId,quoteId,lineId,input})).status,400);
  await act('reviseQuote',{note:'Evaluate the commercial offer'});
  await act('reviewQuote',{kind:'application'});
  const version=current.version;
  assert.equal((await f.command(engineering,version,'setLinePriceOverride',{dealId,quoteId,lineId,input})).status,403);
  assert.equal((await f.command(sales,version,'setLinePriceOverride',{dealId,quoteId,lineId,role:'manager',input:{price_usd:27000,reason:'Forged manager',role:'manager',actor:{id:'pac-manager'}}})).status,403);
  assert.equal((await f.command(sales,version,'setLinePriceOverride',{dealId,quoteId,lineId,input:{price_usd:28580,reason:''}})).status,400);
  await act('setLinePriceOverride',{lineId,input:{...input,role:'manager',actor:{id:'forged'}}});
  assert.equal(S.totals(quote()).total,41810);assert.deepEqual(quote().working.approvals,{});
  const savedOverride=quote().working.draft.lines[0].selling_price_override;
  assert.equal(savedOverride.role,'sales');assert.equal(savedOverride.actor.id,'pac-sales');
  const entry=stageQuoteChange(S.findDeal(current.state,dealId),quoteId,null,(d,q)=>S.selectOption(f.catalog,d,q,C.getOption(f.catalog,'r3200','spare_parts_kit')));
  for(const mutate of [line=>{line.selling_price_override.price_usd=1;},line=>{delete line.selling_price_override;},line=>{line.selling_price_history=[];},line=>{line.price_usd=1;}]){
    const forged=structuredClone(entry);mutate(forged.working.draft.lines[0]);
    assert.equal((await f.command(sales,current.version,'saveQuoteEdit',{entry:forged})).status,400);
  }
  const injected=structuredClone(entry);injected.working.draft.lines.at(-1).selling_price_override={price_usd:1,role:'manager',reason:'Forged'};
  assert.equal((await f.command(sales,current.version,'saveQuoteEdit',{entry:injected})).status,400);
  await act('saveQuoteEdit',{entry});
  assert.deepEqual(quote().working.draft.lines[0].selling_price_override,savedOverride);assert.equal(S.totals(quote()).total,42940);
  await act('setLinePriceOverride',{lineId,input:{price_usd:27000,reason:'Internal manager negotiation'}},manager);
  assert.equal(S.totals(quote()).total,41360);assert.equal(S.requiredReviews(f.catalog,quote()).manager,true);
  await act('reviewQuote',{kind:'application'});
  assert.equal((await f.command(sales,current.version,'issueQuote',{dealId,quoteId})).status,400);
  await act('reviewQuote',{kind:'manager'},manager);
  await act('issueQuote');
  const issued=JSON.stringify(quote().revisions.at(-1));
  const publication=await act('publishProposal',{manifest:[{quote_id:quoteId,revision:1}]});
  const share=await f.request('/api/shares',{method:'POST',cookie:sales,body:{dealId,proposalId:publication.id,recipientName:'Buyer',requestId:crypto.randomUUID()}});assert.equal(share.status,201);
  const customer=(await f.request(`/api/customer/${share.data.token}`)).data.proposal,visible=customer.alternatives[0].lines.find(line=>line.quote_line_id===lineId);
  assert.equal(visible.price_usd,27000);assert.equal(customer.alternatives[0].totals.total,41360);
  for(const field of ['selling_price_override','selling_price_history','catalog_price_usd','source_line'])assert.equal(visible[field],undefined);
  assert.equal(JSON.stringify(customer).includes('Internal manager negotiation'),false);
  assert.equal((await f.command(manager,current.version,'clearLinePriceOverride',{dealId,quoteId,lineId,input:{reason:'Late reset'}})).status,400);
  await act('reviseQuote',{note:'Return to catalog offer'});
  assert.equal((await f.command(engineering,current.version,'clearLinePriceOverride',{dealId,quoteId,lineId,input:{reason:'Unauthorized reset'}})).status,403);
  await act('clearLinePriceOverride',{lineId,input:{reason:'Restore standard offer'}});
  assert.equal(S.totals(quote()).total,41940);assert.equal(quote().working.draft.lines[0].selling_price_override,undefined);
  assert.equal(quote().working.draft.lines[0].selling_price_history.at(-1).actor.id,'pac-sales');assert.deepEqual(quote().working.approvals,{});
  assert.equal(JSON.stringify(quote().revisions.at(-1)),issued);assert.equal(JSON.stringify(f.catalog),sourceCatalog);
  assert.equal(S.publicProposal(S.findDeal(current.state,dealId),oldProposalId).alternatives[1].totals.total,40810);
  await f.restart();
  assert.equal((await f.request(`/api/customer/${share.data.token}`)).data.proposal.alternatives[0].totals.total,41360);
  const restored=(await f.request('/api/workspace',{cookie:sales})).data;
  assert.equal(S.findQuote(S.findDeal(restored.state,dealId),quoteId).working.draft.lines[0].selling_price_history.at(-1).action,'reset');
});

test('catalog reconciliation explicitly previews and resets a prior selling-price override',async t=>{
  const f=await fixture(t),cookie=await f.login();let current=(await f.request('/api/workspace',{cookie})).data;
  const dealId=current.state.deals[0].id,quoteId=current.state.deals[0].quotes[1].id,lineId=current.state.deals[0].quotes[1].working.draft.lines[0].quote_line_id;
  current=(await f.command(cookie,current.version,'reviseQuote',{dealId,quoteId,note:'Reconcile offer'})).data;
  const override=await f.command(cookie,current.version,'setLinePriceOverride',{dealId,quoteId,lineId,input:{price_usd:28580,reason:'Commercial adjustment'}});assert.equal(override.status,200);current=override.data;
  const preview=await f.request(`/api/quotes/${dealId}/${quoteId}/reprice`,{cookie});assert.equal(preview.status,200);
  assert.equal(preview.data.totalBefore,41810);assert.equal(preview.data.totalAfter,40810);
  const change=preview.data.changes.find(item=>item.lineId===lineId);assert.equal(change.kind,'override_reset');assert.equal(change.before.price,28580);assert.equal(change.after.price,27580);
  const result=await f.command(cookie,current.version,'repriceQuote',{dealId,quoteId,acceptedCatalogVersion:preview.data.catalogVersion});assert.equal(result.status,200);
  const line=result.data.result.working.draft.lines[0];assert.equal(line.selling_price_override,undefined);assert.equal(line.selling_price_history.at(-1).action,'reprice_reset');assert.deepEqual(result.data.result.working.approvals,{});
});

test('scoped customer link works without staff session and preserves version identity',async t=>{
  const f=await fixture(t),cookie=await f.login();
  let current=(await f.request('/api/workspace',{cookie})).data;
  const deal=current.state.deals[0],quote=deal.quotes[1],v1=deal.proposals[0];
  const share=await f.request('/api/shares',{method:'POST',cookie,body:{dealId:deal.id,proposalId:v1.id,recipientName:'Northstar Buyer',recipientEmail:'buyer@example.com',requestId:crypto.randomUUID()}});assert.equal(share.status,201);
  const publicRoute=`/api/customer/${share.data.token}`;
  const publicV1=(await f.request(publicRoute)).data;assert.equal(publicV1.proposal.proposal_id,v1.id);assert.equal(publicV1.proposal.alternatives[1].totals.total,40810);assert.equal(publicV1.proposal.crm_id,undefined);assert.equal(publicV1.proposal.quotes,undefined);assert.equal(JSON.stringify(publicV1).includes('labor_rate'),false);
  const feedback=await f.request(publicRoute+'/responses',{method:'POST',body:{kind:'changes_requested',body:'Please add a Spare Parts Kit.',quote_id:quote.id,author:'Forged Manager',proposal_id:'another-proposal',requestId:crypto.randomUUID()}});assert.equal(feedback.status,200);
  const response=feedback.data.proposal.responses.at(-1);assert.equal(response.author,'Northstar Buyer');assert.equal(response.proposal_id,v1.id);
  assert.equal((await f.request(publicRoute+'/responses',{method:'POST',body:{kind:'question',body:'Wrong alternative',quote_id:'foreign-quote',requestId:crypto.randomUUID()}})).status,400);
  current=(await f.request('/api/workspace',{cookie})).data;
  current=(await f.command(cookie,current.version,'reviseFromResponse',{dealId:deal.id,responseId:response.id,quoteId:quote.id})).data;
  const index=f.catalog.priceLines.findIndex(row=>row.machine_id==='r3200'&&row.option_id==='spare_parts_kit');
  current=(await f.command(cookie,current.version,'selectOption',{dealId:deal.id,quoteId:quote.id,rowIndex:index})).data;
  current=(await f.command(cookie,current.version,'reviewQuote',{dealId:deal.id,quoteId:quote.id,kind:'application'})).data;
  current=(await f.command(cookie,current.version,'issueQuote',{dealId:deal.id,quoteId:quote.id})).data;
  assert.notEqual(current.state.deals[0].status,'presented');
  current=(await f.command(cookie,current.version,'publishProposal',{dealId:deal.id,manifest:[{quote_id:quote.id,revision:1}]})).data;
  assert.equal(current.result.manifest.length,1);
  const historical=(await f.request(publicRoute)).data;assert.equal(historical.proposal.alternatives[1].totals.total,40810);assert.equal(historical.proposal.responses.at(-1).addressed_in_proposal_id,current.result.id);
  await f.restart();assert.equal((await f.request(publicRoute)).status,200);
  const listing=await f.request('/api/shares?dealId='+deal.id,{cookie});assert.equal(listing.data.shares.length,1);assert.equal(listing.data.shares[0].token,undefined);
  assert.equal((await f.request('/api/shares/'+share.data.id,{method:'DELETE',cookie})).status,200);assert.equal((await f.request(publicRoute)).status,410);
});

test('public inquiry is independent, durable, validated and idempotent',async t=>{
  const f=await fixture(t),cookie=await f.login();
  const before=(await f.request('/api/workspace',{cookie})).data;
  const input={requestId:crypto.randomUUID(),productId:'r3200',name:'Prospective Buyer',company:'Example Buyer',email:'buyer@example.com',application:'Small parts packaging',bagDimensions:'12 x 16 in',message:'Can you help us assess loading?'};
  const receipt=await f.request('/api/inquiries',{method:'POST',body:input});assert.equal(receipt.status,201);assert.equal(receipt.data.status,'received');assert.equal(receipt.data.delivered,false);
  const repeat=await f.request('/api/inquiries',{method:'POST',body:input});assert.equal(repeat.data.id,receipt.data.id);
  assert.equal((await f.request('/api/inquiries',{method:'POST',body:{...input,application:'Changed body'}})).status,409);
  assert.equal((await f.request('/api/inquiries',{method:'POST',body:{...input,requestId:crypto.randomUUID(),email:'invalid'}})).status,400);
  await f.restart();assert.equal((await f.request('/api/inquiries',{method:'POST',body:input})).data.id,receipt.data.id);
  const after=(await f.request('/api/workspace',{cookie})).data;assert.deepEqual(after.state,before.state);assert.equal(after.version,before.version);
});

test('catalog drafts require review, reject stale writers, and preserve issued quote prices',async t=>{
  const f=await fixture(t),manager=await f.login('manager'),sales=await f.login();
  const initial=(await f.request('/api/catalog',{cookie:manager})).data;
  let workspace=(await f.request('/api/workspace',{cookie:sales})).data;
  const deal=workspace.state.deals[0],oldQuote=deal.quotes[1],oldProposal=JSON.stringify(deal.proposals[0]);
  const catalogCommand=(version,command,args={})=>f.request('/api/catalog/commands',{method:'POST',cookie:manager,body:{command,args,expectedVersion:version,requestId:crypto.randomUUID()}});
  const denied=await f.request('/api/catalog/commands',{method:'POST',cookie:sales,body:{command:'startDraft',args:{},expectedVersion:initial.version,requestId:crypto.randomUUID()}});assert.equal(denied.status,403);
  let catalog=(await catalogCommand(initial.version,'startDraft',{label:'Annual 10 percent test adjustment'})).data;
  assert.equal((await catalogCommand(initial.version,'saveDraft',{adjustment:{machine_id:'r3200',percent:10}})).status,409);
  catalog=(await catalogCommand(catalog.version,'saveDraft',{adjustment:{machine_id:'r3200',percent:10}})).data;
  assert.ok(catalog.changes.length>0);
  assert.equal((await catalogCommand(catalog.version,'publishDraft')).status,400);
  catalog=(await catalogCommand(catalog.version,'reviewDraft')).data;
  catalog=(await catalogCommand(catalog.version,'saveDraft',{terms:{machine_id:'r3200',text:'Estimated 14–18 weeks after deposit.',min_weeks:14,max_weeks:18}})).data;
  assert.equal(catalog.draft.review,null);
  catalog=(await catalogCommand(catalog.version,'reviewDraft')).data;
  catalog=(await catalogCommand(catalog.version,'publishDraft')).data;
  assert.equal(catalog.draft,null);assert.equal(catalog.history.length,1);assert.notEqual(catalog.catalog.manifest.catalog_sha256,initial.catalog.manifest.catalog_sha256);
  workspace=(await f.request('/api/workspace',{cookie:sales})).data;
  assert.equal(JSON.stringify(workspace.state.deals[0].proposals[0]),oldProposal);
  assert.equal(workspace.state.deals[0].quotes[1].revisions[0].totals.total,40810);
  const added=await f.command(sales,workspace.version,'addQuote',{dealId:deal.id,input:{machine_id:'r3200',label:'Current catalog alternative'}});assert.equal(added.status,200);assert.equal(added.data.result.working.draft.lines[0].price_usd,30338);
  workspace=(await f.command(sales,added.data.version,'reviseQuote',{dealId:deal.id,quoteId:oldQuote.id,note:'Review new catalog pricing'})).data;
  const preview=await f.request(`/api/quotes/${deal.id}/${oldQuote.id}/reprice`,{cookie:sales});assert.equal(preview.status,200);assert.equal(preview.data.totalBefore,40810);assert.equal(preview.data.totalAfter,44891);assert.ok(preview.data.changes.some(item=>item.kind==='terms_changed'));
  assert.equal((await f.command(sales,workspace.version,'repriceQuote',{dealId:deal.id,quoteId:oldQuote.id,acceptedCatalogVersion:initial.version})).status,409);
  const repriced=await f.command(sales,workspace.version,'repriceQuote',{dealId:deal.id,quoteId:oldQuote.id,acceptedCatalogVersion:preview.data.catalogVersion});assert.equal(repriced.status,200);assert.equal(S.totals(repriced.data.result).total,44891);assert.equal(repriced.data.result.revisions[0].totals.total,40810);
  await f.restart();const restored=(await f.request('/api/catalog',{cookie:manager})).data;assert.equal(restored.catalog.manifest.catalog_sha256,catalog.catalog.manifest.catalog_sha256);assert.equal(restored.history.length,1);
  const websiteSource=await f.request('/source/catalog/price_lines.json');assert.equal(websiteSource.data.find(row=>row.machine_id==='r3200'&&row.line_class==='catalog_base').price_usd,27580);
});

test('website inquiry retains a bounded Explorer capture and rejects unsafe references',async t=>{
  const f=await fixture(t),preview='data:image/jpeg;base64,'+'A'.repeat(90000),model={id:'kinetic-01',revision:'sha256:test'};
  const inspection={version:'1',model,view:{viewVersion:'0.1',model,coordinateFrame:'normalized-assembly-v1',selectedId:'part-1',scopeId:'assembly-1',isolated:false,mode:'explore',renderStyle:'engineering',separation:0,operation:null,displayOptions:{appearance:'light',grid:false,ambientOcclusion:true,featureEdges:true,hiddenEdges:false,lineWeight:'standard'},camera:{position:[2,2,3],target:[0,0,0],up:[0,1,0],projection:{kind:'perspective',verticalFovDegrees:40,zoom:1,offsetX:0,offsetY:0},viewport:{width:900,height:650}}},preview:{dataUrl:preview,width:640,height:480}};
  const reference={productId:'r3200',title:'Reference view',note:'Assess loading access',source:'Reference assembly — not PAC CAD',preview,inspection};
  const input={requestId:crypto.randomUUID(),productId:'r3200',name:'Buyer',company:'Example',email:'buyer@example.com',application:'Small parts',reference};
  const receipt=await f.request('/api/inquiries',{method:'POST',body:input});assert.equal(receipt.status,201);
  const saved=JSON.parse(f.store.db.prepare('SELECT payload FROM inquiries WHERE id=?').get(receipt.data.id).payload);
  assert.equal(saved.reference.preview,preview);assert.deepEqual(saved.reference.inspection,inspection);
  for(const invalid of [{...reference,preview:'javascript:alert(1)'},{...reference,preview:'data:image/svg+xml;base64,AAAA'},{...reference,photo:'/server/app.mjs'},{...reference,internalPrice:1},{...reference,inspection:{...inspection,version:'999'}},{...reference,preview:'data:image/jpeg;base64,'+'A'.repeat(120001)}]){
    assert.equal((await f.request('/api/inquiries',{method:'POST',body:{...input,requestId:crypto.randomUUID(),reference:invalid}})).status,400);
  }
  assert.equal((await f.request('/website/assets/manrope-600.ttf')).headers.get('content-type'),'font/ttf');
});
