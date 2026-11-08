import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceService, ServiceError, requestJSON, loginMarkup } from '../src/workspace-service.js';

const envelope = (version=1) => ({state:{deals:[{id:'deal-1',title:`Saved ${version}`}]},version,user:{id:'pac-sales',role:'sales'}});
const response = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});

test('an uncertain network outcome retries the same mutation identity without replacing acknowledged state',async t=>{
  const calls=[],initial=envelope(),service=new WorkspaceService(initial);
  t.mock.method(globalThis,'fetch',async(path,options)=>{calls.push({path,options,payload:JSON.parse(options.body)});if(calls.length===1)throw new TypeError('connection lost');return response(envelope(2));});
  await assert.rejects(service.command('updateDeal',{dealId:'deal-1',input:{title:'New'}}),error=>error instanceof ServiceError&&error.status===0&&/retained/.test(error.message));
  assert.equal(service.state,initial.state);assert.equal(service.version,1);
  await service.command('updateDeal',{dealId:'deal-1',input:{title:'New'}});
  assert.deepEqual(calls[1].payload,calls[0].payload);assert.equal(calls[0].payload.expectedVersion,1);
  assert.equal(service.version,2);assert.equal(service.state.deals[0].title,'Saved 2');
  assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.headers['Content-Type'],'application/json');
});

test('version conflicts retain saved state and require a fresh version before a new mutation',async t=>{
  const service=new WorkspaceService(envelope(4)),calls=[];
  t.mock.method(globalThis,'fetch',async(path,options)=>{
    if(options.method==='GET')return response(envelope(7));
    calls.push(JSON.parse(options.body));return calls.length===1?response({error:{code:'VERSION_CONFLICT',message:'Reload before reconciling retained edits.'}},409):response(envelope(8));
  });
  const args={dealId:'deal-1',input:{title:'Reconciled'}};
  await assert.rejects(service.command('updateDeal',args),error=>error.status===409&&error.code==='VERSION_CONFLICT');
  assert.equal(service.version,4);assert.equal(service.state.deals[0].title,'Saved 4');
  await service.refresh();await service.command('updateDeal',args);
  assert.equal(calls[1].expectedVersion,7);assert.notEqual(calls[1].requestId,calls[0].requestId);assert.equal(service.version,8);
});

test('HTTP and malformed service failures are surfaced without inventing success',async t=>{
  t.mock.method(globalThis,'fetch',async()=>response({error:{message:'Manager access required.',code:'FORBIDDEN'}},403));
  await assert.rejects(requestJSON('/api/catalog/commands',{method:'POST',body:{}}),error=>error.status===403&&error.code==='FORBIDDEN'&&error.message==='Manager access required.');
  globalThis.fetch=async()=>new Response('<html>Static host</html>',{status:404});
  await assert.rejects(requestJSON('/api/session'),error=>error.status===404&&/unreadable/.test(error.message));
});

test('local test authentication is disclosed and untrusted account labels are escaped',()=>{
  const html=loginMarkup({mode:'local-demo',accounts:[{email:'sales@pac.demo',name:'<script>unsafe</script>'}]},'<img onerror=alert(1)>');
  assert.match(html,/PAC SSO is not connected/);assert.match(html,/Local test accounts/);
  assert.doesNotMatch(html,/<script>|<img onerror/);assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(loginMarkup({mode:'production',accounts:[]}),/pac-demo-2026/);
});
