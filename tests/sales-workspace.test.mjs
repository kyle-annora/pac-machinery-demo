import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as S from '../src/sales-domain.js';
import * as Shell from '../src/workbench.js';

const read = name => JSON.parse(readFileSync(new URL(`../data/catalog/${name}`, import.meta.url)));
const catalog = {manifest:read('manifest.json'),overview:read('overview.json'),machines:read('catalog/machines.json'),priceLines:read('catalog/price_lines.json'),narratives:read('catalog/narratives.json'),media:read('catalog/media.json'),terms:read('catalog/commercial_terms.json'),kits:read('catalog/spare_parts.json'),options:read('catalog/options.json'),baseUrl:'/source'};
const STORE='pac.rollbag.sales.v1', FORMS='pac.rollbag.sales.form-edits.v1', QUOTE_EDITS='pac.rollbag.sales.quote-edits.v1';
let sequence=0;
const cleanupRegistered=new WeakSet();

// A controller harness, not a layout/browser substitute. Fields come from the
// actual rendered forms; only FormData, event delivery and DOM lookup are stubbed.
const decode = value => String(value??'').replace(/&(amp|lt|gt|quot|#39);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[key]));
function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,decode(value??'')]));
}
function dataset(attrs) {return Object.fromEntries(Object.entries(attrs).filter(([key])=>key.startsWith('data-')).map(([key,value])=>[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value]));}
function parseForms(html) {
  return [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)].map(([,head,body])=>{
    const form={dataset:dataset(attributes(head)),elements:[]};
    for(const match of body.matchAll(/<input\b([^>]*)>|<textarea\b([^>]*)>([\s\S]*?)<\/textarea>|<select\b([^>]*)>([\s\S]*?)<\/select>/g)) {
      const attrs=attributes(match[1]??match[2]??match[4]);
      if(!attrs.name)continue;
      const options=match[5]===undefined?null:[...match[5].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(([,head,text])=>{const option=attributes(head);return {value:option.value??decode(text),selected:'selected' in option};});
      let value=options?(options.find(option=>option.selected)||options[0])?.value??'':match[3]!==undefined?decode(match[3]):attrs.value??'';
      form.elements.push({name:attrs.name,type:attrs.type||'text',disabled:'disabled' in attrs,checked:'checked' in attrs,get value(){return value;},set value(next){value=options&&!options.some(option=>option.value===String(next))?'':String(next);}});
    }
    return form;
  });
}
async function setup(t,{engineering=false,storage,revise=true,connected=false}={}) {
  const initial=S.seedWorkspace(catalog),deal=initial.deals[0],quote=deal.quotes[1];
  if(revise)S.reviseQuote(deal,quote);
  const item=engineering?S.saveEngineering(deal,quote,{description:'Loading guide',reason:'Mixed kits',hours:4,materials:250},'engineering'):null;
  const saved=storage||new Map([[STORE,JSON.stringify(initial)]]);
  const originals=Object.fromEntries(['localStorage','document','FormData','location'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  if(!cleanupRegistered.has(t)){cleanupRegistered.add(t);t.after(()=>{for(const [key,descriptor] of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});}
  let html='',forms=[],buttons=[],listeners={},route=['quote',deal.id,quote.id],failSaves=false;
  const notifications=[];
  const main={querySelectorAll:selector=>selector==='form[data-sales-form]'?forms:[],addEventListener:(name,fn)=>{listeners[name]=fn;}};
  const notice={hidden:true,querySelector:()=>({textContent:''})};
  globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>{if(failSaves&&key===STORE)throw new Error('Storage quota exceeded');return saved.set(key,value);}};
  globalThis.location={hash:`#quote/${deal.id}/${quote.id}`};
  globalThis.document={querySelector:selector=>selector==='.sales-main'?main:selector==='[data-sales-action="issue"]'?buttons.find(button=>button.dataset.salesAction==='issue'):null,querySelectorAll:selector=>selector==='.sales-main form[data-sales-form]'?forms:selector==='[data-sales-action="review"]'?buttons.filter(button=>button.dataset.salesAction==='review'):[],getElementById:id=>id==='pac-unsaved-note'?notice:null};
  globalThis.FormData=class {constructor(form){this.entries=form.elements.filter(field=>!field.disabled&&(field.type!=='checkbox'||field.checked)).map(field=>[field.name,field.value]);}get(name){return this.entries.find(([key])=>key===name)?.[1]??null;}getAll(name){return this.entries.filter(([key])=>key===name).map(([,value])=>value);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}};
  const UI=await import(`../src/sales-workspace.js?controller-test=${++sequence}`);
  const render=()=>{html=UI.render(...route);forms=parseForms(html);buttons=[...html.matchAll(/<button\b([^>]*)>/g)].map(([,head])=>{const attrs=attributes(head);return {dataset:dataset(attrs),disabled:'disabled' in attrs};});listeners={};UI.afterRender();};
  let remoteState=structuredClone(initial);
  const service=connected?{state:remoteState,user:{id:'qa-sales',name:'QA Sales',role:'sales'},async command(command,args){
    await new Promise(resolve=>setTimeout(resolve,0));
    const candidate=structuredClone(remoteState),d=S.findDeal(candidate,args.dealId),q=S.findQuote(d,args.quoteId);
    if(!['setLinePriceOverride','clearLinePriceOverride'].includes(command))throw new Error('Unexpected test command');
    const result=S[command](catalog,d,q,args.lineId,args.input,'sales');remoteState=candidate;return {state:structuredClone(remoteState),result};
  }}:null;
  UI.init(catalog,{render,toast:message=>notifications.push(message),...(service?{service}:{})});render();
  const h={UI,saved,dealId:deal.id,quoteId:quote.id,itemId:item?.id,get html(){return html;},get quote(){return UI.getWorkspace().deals[0].quotes[1];},get pending(){return JSON.parse(saved.get(FORMS)||'[]');},go(...next){route=next;render();},form(name,itemId){const form=forms.find(form=>form.dataset.salesForm===name&&(itemId===undefined||form.dataset.item===itemId));assert.ok(form,`rendered ${name} form ${itemId??''}`);return form;},fill(form,values){for(const [name,value] of Object.entries(values)){const field=form.elements.find(field=>field.name===name);assert.ok(field,`rendered field ${name}`);field.value=value;}listeners.input({target:{closest:()=>form}});},value(form,name){return form.elements.find(field=>field.name===name)?.value;},change(name,value){UI.handleChange({target:{closest:()=>({dataset:{salesChange:name},value,checked:value})}});},click(name,details={}){const button=buttons.find(button=>button.dataset.salesAction===name&&Object.entries(details).every(([key,value])=>button.dataset[key]===value));assert.ok(button,`rendered action ${name}`);UI.handleClick({preventDefault(){},target:{closest:()=>button}});},submit(form){UI.handleSubmit({preventDefault(){},target:{closest:()=>form}});}};
  h.button=(name,details={})=>buttons.find(button=>button.dataset.salesAction===name&&Object.entries(details).every(([key,value])=>button.dataset[key]===value));
  h.quoteEdits=()=>JSON.parse(saved.get(QUOTE_EDITS)||'[]');
  h.setSaveFailure=value=>{failSaves=value;};h.notifications=notifications;
  return h;
}

function stageSpareKit(h) {
  const row=catalog.priceLines.findIndex(line=>line.machine_id==='r3200'&&line.option_id==='spare_parts_kit');
  assert.ok(row>=0,'the R3200 spare kit is available in the real catalog');
  h.click('open-options');h.click('select-option',{row:String(row)});
  return h.quoteEdits().find(([id])=>id===h.quoteId)?.[1];
}

test('unapplied engineering edits survive tabs and block review/issue without changing snapshots',async t=>{
  const h=await setup(t,{engineering:true}),snapshot=JSON.stringify(h.quote.revisions);
  h.change('role','engineering');h.click('quote-tab',{tab:'engineering'});
  h.fill(h.form('engineering',h.itemId),{hours:'6',materials:'375'});
  h.click('quote-tab',{tab:'review'});h.click('review',{review:'engineering'});
  assert.match(h.html,/Save or discard the unapplied quote and deal form edits/);
  assert.ok(!h.quote.working.approvals.engineering);
  h.click('issue');assert.match(h.html,/Save or discard the unapplied quote and deal form edits/);
  assert.equal(h.quote.working.status,'draft');assert.equal(JSON.stringify(h.quote.revisions),snapshot);
  h.click('quote-tab',{tab:'engineering'});assert.equal(h.value(h.form('engineering',h.itemId),'materials'),'375');
  h.submit(h.form('engineering',h.itemId));assert.equal(h.pending.length,0);assert.equal(h.quote.working.engineering[0].materials,375);
  h.click('quote-tab',{tab:'review'});h.click('review',{review:'engineering'});assert.ok(h.quote.working.approvals.engineering);
});

test('removing an edited engineering item clears its pending copies across roles',async t=>{
  const h=await setup(t,{engineering:true});h.click('quote-tab',{tab:'engineering'});
  h.fill(h.form('engineering',h.itemId),{description:'Sales draft'});
  h.change('role','engineering');h.fill(h.form('engineering',h.itemId),{materials:'999'});
  assert.equal(h.pending.length,2);h.change('role','sales');h.click('remove-engineering',{item:h.itemId});
  assert.equal(h.quote.working.engineering.length,0);assert.equal(h.pending.length,0);
  h.click('quote-tab',{tab:'review'});
  assert.equal(h.button('review',{review:'engineering'}),undefined);assert.match(h.html,/Not required/);
  assert.doesNotMatch(h.html,/Save or discard the unapplied quote and deal form edits/);
});

test('a standard R3200 spare-kit revision needs only application review before issue',async t=>{
  const h=await setup(t);stageSpareKit(h);h.click('save-quote');h.click('quote-tab',{tab:'review'});
  assert.ok(h.button('review',{review:'application'}));
  assert.equal(h.button('review',{review:'engineering'}),undefined);assert.equal(h.button('review',{review:'manager'}),undefined);
  assert.equal((h.html.match(/>Not required<\/span>/g)||[]).length,2);
  assert.equal(h.button('issue').disabled,true);h.click('review',{review:'application'});
  assert.match(h.html,/All required reviews are complete/);assert.equal(h.button('issue').disabled,false);
  h.click('issue');assert.equal(h.quote.working.status,'issued');assert.equal(h.quote.revisions.at(-1).totals.total,41940);
});

test('an engineering catalog option and discount expose only role-appropriate required approvals',async t=>{
  const h=await setup(t),row=catalog.priceLines.findIndex(line=>line.machine_id==='r3200'&&line.option_id==='accumulating_funnel');
  h.click('open-options');h.click('select-option',{row:String(row)});h.click('confirm-selection');
  h.click('quote-tab',{tab:'review'});
  assert.equal(h.button('review',{review:'application'}).disabled,true,'a staged catalog change cannot be approved');
  h.change('role','engineering');assert.equal(h.button('review',{review:'engineering'}).disabled,true);
  h.change('role','sales');h.click('save-quote');
  h.click('quote-tab',{tab:'terms'});h.fill(h.form('discount'),{amount:'100',reason:'Demonstration commercial adjustment'});h.submit(h.form('discount'));
  h.click('quote-tab',{tab:'review'});
  assert.match(h.html,/Engineering or Manager role required/);assert.match(h.html,/>Manager role required</);
  assert.equal(h.button('review',{review:'engineering'}),undefined);assert.equal(h.button('review',{review:'manager'}),undefined);
  h.click('review',{review:'application'});assert.equal(h.button('issue').disabled,true);
  h.change('role','engineering');assert.ok(h.button('review',{review:'engineering'}));assert.equal(h.button('review',{review:'manager'}),undefined);
  h.click('review',{review:'engineering'});assert.equal(h.button('issue').disabled,true);
  h.change('role','manager');assert.ok(h.button('review',{review:'manager'}));h.click('review',{review:'manager'});
  assert.equal(h.button('issue').disabled,false);h.click('issue');assert.equal(h.quote.working.status,'issued');
});

test('hidden prices retain existing-item numeric edits through partial save and reload',async t=>{
  const h=await setup(t,{engineering:true});h.change('role','engineering');h.click('quote-tab',{tab:'engineering'});
  h.fill(h.form('engineering',h.itemId),{materials:'999'});h.change('prices',false);
  h.fill(h.form('engineering',h.itemId),{description:'Updated scope'});h.submit(h.form('engineering',h.itemId));
  assert.equal(h.quote.working.engineering[0].materials,250);assert.equal(h.pending[0][1].values.materials,'999');
  const reloaded=await setup(t,{storage:h.saved});reloaded.change('role','engineering');reloaded.click('quote-tab',{tab:'engineering'});
  assert.equal(reloaded.value(reloaded.form('engineering',h.itemId),'materials'),'999');
  reloaded.submit(reloaded.form('engineering',h.itemId));assert.equal(reloaded.quote.working.engineering.length,1);assert.equal(reloaded.quote.working.engineering[0].materials,999);assert.equal(reloaded.pending.length,0);
});

test('a new priced engineering form cannot create an unpriced duplicate while prices are hidden',async t=>{
  const h=await setup(t);h.change('role','engineering');h.click('quote-tab',{tab:'engineering'});
  h.fill(h.form('engineering'),{description:'New guide',reason:'Mixed kits',hours:'4',materials:'250'});h.change('prices',false);h.submit(h.form('engineering'));
  assert.equal(h.quote.working.engineering.length,0);assert.match(h.html,/Show prices before adding a new engineering requirement/);
  h.change('prices',true);assert.equal(h.value(h.form('engineering'),'materials'),'250');h.submit(h.form('engineering'));
  assert.equal(h.quote.working.engineering.length,1);assert.equal(h.quote.working.engineering[0].materials,250);assert.equal(h.pending.length,0);
});

test('selected alternative remains current through Deal, Hub and reload',async t=>{
  const h=await setup(t);h.go('deal',h.dealId);
  const shell=Shell.render({view:"deal",body:h.html,deals:h.UI.getWorkspace().deals,dealId:h.UI.currentDealId(),quoteId:h.UI.currentQuoteId()});
  assert.match(shell,new RegExp(`href="#quote/${h.dealId}/${h.quoteId}/working">Continue quote`));
  h.go('workspace');assert.equal(h.UI.currentDealId(),h.dealId);assert.equal(h.UI.currentQuoteId(),h.quoteId);
  const reloaded=await setup(t,{storage:h.saved});reloaded.go('workspace');assert.equal(reloaded.UI.currentQuoteId(),h.quoteId);
  reloaded.go('quote',h.dealId);assert.equal(reloaded.UI.currentQuoteId(),h.quoteId);
  reloaded.click('quote-tab',{tab:'review'});assert.ok(reloaded.html.includes(`value="${h.quoteId}" selected`));
});

test('customer proposal returns to the displayed alternative in the same deal',async t=>{
  const h=await setup(t,{revise:false}),deal=h.UI.getWorkspace().deals[0],published=deal.proposals[0];
  h.go('present',h.dealId,published.id);h.click('proposal-alternative',{alternative:h.quoteId});
  const header=h.html.match(/<header class="pac-proposal-header[^>]*>([\s\S]*?)<\/header>/)?.[1]||'';
  assert.match(header,/Sales presentation/);
  const back=[...header.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].find(([,head])=>attributes(head).href===`#deal/${h.dealId}/${h.quoteId}`);
  assert.ok(back,'the return link retains the displayed deal and alternative');
  assert.equal(decode(back[2].replace(/<[^>]*>/g,'')).trim(),'Back to deal');
  assert.match(header,new RegExp(`href="#present/${h.dealId}/${published.id}"[^>]*>[\\s\\S]*?<img`));
  assert.doesNotMatch(header,/href="#demo"/,'the customer logo must not switch to a different demonstration deal');
  assert.equal(h.value(h.form('comment'),'quote_ref'),`${h.quoteId}|0`);
  h.go('deal',h.dealId,h.quoteId);
  assert.equal(h.UI.currentDealId(),h.dealId);assert.equal(h.UI.currentQuoteId(),h.quoteId);
  assert.match(h.html,new RegExp(`data-quote="${h.quoteId}"[^>]*aria-pressed="true"`));
});

test('the legacy customer URL resolves the latest published version while fixed links preserve history',async t=>{
  const state=S.seedWorkspace(catalog),deal=state.deals[0],quote=deal.quotes[1],first=deal.proposals[0],firstSnapshot=JSON.stringify(first);
  S.reviseQuote(deal,quote);
  S.selectOption(catalog,deal,quote,catalog.priceLines.find(line=>line.machine_id==='r3200'&&line.option_id==='spare_parts_kit'));
  S.reviewQuote(catalog,deal,quote,'application','sales');S.issueQuote(catalog,deal,quote);const latest=S.publishProposal(deal);
  const storage=new Map([[STORE,JSON.stringify(state)]]),h=await setup(t,{storage});
  h.go('present',deal.id);h.click('proposal-alternative',{alternative:quote.id});
  assert.match(h.html,/Proposal V2/);assert.equal(h.value(h.form('comment'),'proposal_id'),latest.id);
  assert.equal(h.value(h.form('comment'),'quote_ref'),`${quote.id}|1`);assert.match(h.html,/\$41,940\.00/);
  h.go('present',deal.id,first.id);
  assert.match(h.html,/Proposal V1/);assert.equal(h.value(h.form('comment'),'proposal_id'),first.id);
  assert.equal(h.value(h.form('comment'),'quote_ref'),`${quote.id}|0`);assert.match(h.html,/\$40,810\.00/);
  assert.doesNotMatch(h.html,/\$41,940\.00/);
  assert.equal(JSON.stringify(h.UI.getWorkspace().deals[0].proposals[0]),firstSnapshot);
});

test('Explorer has one contextual return and relies on the shell for deal navigation',async t=>{
  const h=await setup(t);h.go('deal-explorer',h.dealId,h.quoteId);
  assert.doesNotMatch(h.html,/class="sales-tabs"|class="sales-breadcrumbs"/);
  const target=`#quote/${h.dealId}/${h.quoteId}`;
  assert.equal([...h.html.matchAll(new RegExp(`href="${target}(?:/working)?"`,'g'))].length,1);
  assert.match(h.html,/Return to quote/);assert.doesNotMatch(h.html,/Continue the quote/);
  assert.match(h.html,new RegExp(`data-deal-id="${h.dealId}" data-quote-id="${h.quoteId}"`));
  const shell=Shell.render({view:'deal-explorer',body:h.html,deals:h.UI.getWorkspace().deals,dealId:h.dealId,quoteId:h.quoteId});
  assert.equal([...shell.matchAll(/aria-label="Breadcrumb"/g)].length,1);
});

test('a retained customer comment remains attached to its original issued revision after a new issue',async t=>{
  const h=await setup(t,{revise:false});h.go('present',h.dealId);h.click('proposal-alternative',{alternative:h.quoteId});
  h.fill(h.form('comment'),{body:'Question about the original configuration'});
  const workspace=h.UI.getWorkspace(),deal=workspace.deals[0],quote=deal.quotes[1];S.reviseQuote(deal,quote);S.reviewQuote(catalog,deal,quote,'application','sales');S.issueQuote(catalog,deal,quote,'sales');h.saved.set(STORE,JSON.stringify(workspace));
  const reloaded=await setup(t,{storage:h.saved});reloaded.go('present',h.dealId);reloaded.click('proposal-alternative',{alternative:h.quoteId});
  assert.equal(reloaded.value(reloaded.form('comment'),'body'),'Question about the original configuration');assert.equal(reloaded.value(reloaded.form('comment'),'quote_ref'),`${h.quoteId}|0`);
  reloaded.submit(reloaded.form('comment'));const comment=reloaded.UI.getWorkspace().deals[0].customer_responses.at(-1);assert.equal(comment.body,'Question about the original configuration');assert.equal(comment.quote_id,h.quoteId);assert.equal(comment.revision,0);assert.equal(reloaded.pending.length,0);
});

test('failed form save preserves committed state, retained input and route; retry commits once',async t=>{
  const h=await setup(t,{engineering:true});h.change('role','engineering');h.click('quote-tab',{tab:'engineering'});
  const before=h.saved.get(STORE),route=location.hash;
  h.fill(h.form('engineering',h.itemId),{materials:'777'});h.setSaveFailure(true);h.submit(h.form('engineering',h.itemId));
  assert.equal(h.saved.get(STORE),before);assert.equal(h.quote.working.engineering[0].materials,250);
  assert.equal(h.value(h.form('engineering',h.itemId),'materials'),'777');assert.equal(h.pending.length,1);
  assert.equal(location.hash,route);assert.equal(h.notifications.length,0);assert.match(h.html,/Changes could not be saved/);
  h.setSaveFailure(false);h.submit(h.form('engineering',h.itemId));
  assert.equal(h.quote.working.engineering.length,1);assert.equal(h.quote.working.engineering[0].materials,777);assert.equal(h.pending.length,0);
  assert.equal(h.notifications.filter(n=>n==='Engineering requirement saved.').length,1);
  const reloaded=await setup(t,{storage:h.saved});assert.equal(reloaded.quote.working.engineering[0].materials,777);
});

test('catalog selection remains staged through reload until an explicit quote save',async t=>{
  const h=await setup(t),before=h.saved.get(STORE),history=JSON.stringify(h.quote.revisions),proposals=JSON.stringify(h.UI.getWorkspace().deals[0].proposals);
  const entry=stageSpareKit(h);
  assert.ok(entry,'selecting a catalog option creates a recoverable editor');
  assert.equal(S.totals(entry.working).total,41940);assert.equal(S.totals(h.quote).total,40810);
  assert.equal(h.saved.get(STORE),before);assert.match(h.html,/Unsaved changes/);assert.match(h.html,/\$41,940/);
  const quantity=attributes(h.html.match(/<input\b([^>]*id="mw-line-quantity"[^>]*)>/)?.[1]||'');
  assert.ok('disabled' in quantity,'the catalog prices this spare kit as a fixed lump sum');
  assert.equal(quantity.value,'1');
  const reloaded=await setup(t,{storage:h.saved});
  assert.equal(S.totals(reloaded.quote).total,40810);assert.match(reloaded.html,/Unsaved changes/);assert.match(reloaded.html,/\$41,940/);
  assert.equal(reloaded.button('save-quote').disabled,false);reloaded.click('save-quote');
  assert.equal(S.totals(reloaded.quote).total,41940);assert.equal(reloaded.quoteEdits().length,0);assert.deepEqual(reloaded.quote.working.approvals,{});
  assert.equal(JSON.stringify(reloaded.quote.revisions),history);assert.equal(JSON.stringify(reloaded.UI.getWorkspace().deals[0].proposals),proposals);
  assert.equal(reloaded.button('save-quote').disabled,true);assert.doesNotMatch(reloaded.html,/Unsaved changes/);
  const savedAgain=await setup(t,{storage:reloaded.saved});assert.equal(S.totals(savedAgain.quote).total,41940);assert.equal(savedAgain.quoteEdits().length,0);
});

test('a failed quote save retains its editor and committed state, then a single retry applies it once',async t=>{
  const h=await setup(t);stageSpareKit(h);
  const before=h.saved.get(STORE),editor=h.saved.get(QUOTE_EDITS),route=location.hash,activityCount=h.UI.getWorkspace().deals[0].activity.length;
  h.notifications.length=0;h.setSaveFailure(true);h.click('save-quote');
  assert.equal(h.saved.get(STORE),before);assert.equal(S.totals(h.quote).total,40810);assert.equal(h.saved.get(QUOTE_EDITS),editor);
  assert.equal(location.hash,route);assert.equal(h.notifications.length,0);assert.match(h.html,/Changes could not be saved/);assert.match(h.html,/Unsaved changes/);
  assert.equal(h.button('save-quote').disabled,false);h.setSaveFailure(false);h.click('save-quote');
  assert.equal(S.totals(h.quote).total,41940);assert.equal(h.quoteEdits().length,0);
  assert.equal(h.UI.getWorkspace().deals[0].activity.length,activityCount+1);
  assert.equal(h.notifications.filter(message=>message==='Quote saved. Review this revision when ready.').length,1);
  const after=h.saved.get(STORE);h.click('save-quote');
  assert.equal(h.saved.get(STORE),after);assert.equal(h.UI.getWorkspace().deals[0].activity.length,activityCount+1);
  assert.equal(h.notifications.filter(message=>message==='Quote saved. Review this revision when ready.').length,1);
});

test('unsaved catalog changes disable review and cannot be reviewed or issued through secondary actions',async t=>{
  const h=await setup(t);stageSpareKit(h);
  const before=h.saved.get(STORE),editor=h.saved.get(QUOTE_EDITS),history=JSON.stringify(h.quote.revisions);
  assert.equal(h.button('quote-tab',{tab:'review',slot:'header'}).disabled,true);
  h.click('quote-tab',{tab:'review',slot:'tab'});h.click('review',{review:'application'});
  assert.match(h.html,/Save or discard the configuration changes before review or issue/);assert.deepEqual(h.quote.working.approvals,{});
  h.click('issue');assert.match(h.html,/Save or discard the configuration changes before review or issue/);
  assert.equal(h.quote.working.status,'draft');assert.equal(JSON.stringify(h.quote.revisions),history);
  assert.equal(h.saved.get(STORE),before);assert.equal(h.saved.get(QUOTE_EDITS),editor);
});

test('the same quote editor survives Explorer, Deal and workspace navigation without publishing changes',async t=>{
  const h=await setup(t);stageSpareKit(h);
  const before=h.saved.get(STORE),editor=h.saved.get(QUOTE_EDITS);
  h.go('deal-explorer',h.dealId,h.quoteId);
  assert.match(h.html,new RegExp(`data-deal-id="${h.dealId}" data-quote-id="${h.quoteId}"`));
  assert.match(h.html,new RegExp(`href="#quote/${h.dealId}/${h.quoteId}">Return to quote`));
  assert.equal(h.UI.currentDealId(),h.dealId);assert.equal(h.UI.currentQuoteId(),h.quoteId);
  h.go('deal',h.dealId);assert.match(h.html,/Unsaved changes/);assert.match(h.html,/\$41,940/);
  h.go('workspace');assert.equal(h.UI.currentDealId(),h.dealId);assert.equal(h.UI.currentQuoteId(),h.quoteId);
  h.go('quote',h.dealId,h.quoteId);assert.match(h.html,/Unsaved changes/);assert.match(h.html,/\$41,940/);
  assert.equal(h.saved.get(STORE),before);assert.equal(h.saved.get(QUOTE_EDITS),editor);assert.equal(S.totals(h.quote).total,40810);
  h.click('save-quote');assert.equal(S.totals(h.quote).total,41940);assert.equal(h.quoteEdits().length,0);
});

test('the nested Explore link keeps native navigation instead of selecting its containing quote row',async t=>{
  const h=await setup(t);stageSpareKit(h);
  const link=[...h.html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([,head,text])=>({...attributes(head),text})).find(link=>link.href===`#deal-explorer/${h.dealId}/${h.quoteId}`&&link.text.startsWith('Explore '));
  assert.ok(link,'the base-machine row includes an Explorer link');
  const row=h.button('select-line',{line:h.quote.working.draft.lines[0].quote_line_id});
  const before=h.html,editor=h.saved.get(QUOTE_EDITS);let prevented=false;
  const handled=h.UI.handleClick({preventDefault(){prevented=true;},target:{closest(selector){
    if(selector==='a[href]')return link;
    if(selector==='a[data-sales-action]')return null;
    if(selector==='[data-sales-action]')return row;
    return null;
  }}});
  assert.equal(handled,false);assert.equal(prevented,false);assert.equal(h.html,before);assert.equal(h.saved.get(QUOTE_EDITS),editor);
});

test('failed issue cannot expose an issued revision or update a published proposal',async t=>{
  const h=await setup(t);h.click('quote-tab',{tab:'review'});h.click('review',{review:'application'});
  const before=h.saved.get(STORE),proposal=JSON.stringify(h.UI.getWorkspace().deals[0].proposals);
  h.notifications.length=0;h.setSaveFailure(true);h.click('issue');
  assert.equal(h.quote.working.status,'draft');assert.equal(h.quote.revisions.length,1);assert.equal(h.saved.get(STORE),before);
  assert.equal(JSON.stringify(h.UI.getWorkspace().deals[0].proposals),proposal);assert.equal(h.notifications.length,0);
  h.setSaveFailure(false);h.click('issue');assert.equal(h.quote.revisions.length,2);
  assert.equal(JSON.stringify(h.UI.getWorkspace().deals[0].proposals),proposal);
});

test('customer request, saved revision and explicit proposal publication preserve historical UI and print identity',async t=>{
  const h=await setup(t,{revise:false});const v1=h.UI.getWorkspace().deals[0].proposals[0];
  h.go('present',h.dealId,v1.id);h.click('proposal-alternative',{alternative:h.quoteId});
  h.fill(h.form('comment'),{kind:'changes_requested',body:'Please add an application guide to assisted loading.'});h.submit(h.form('comment'));
  const response=h.UI.getWorkspace().deals[0].customer_responses[0];assert.equal(response.proposal_id,v1.id);
  h.go('deal',h.dealId);h.click('revise-response',{response:response.id,targetQuote:h.quoteId});
  assert.equal(h.quote.working.revision,1);h.go('quote',h.dealId,h.quoteId);h.click('quote-tab',{tab:'review'});h.click('review',{review:'application'});h.click('issue');
  h.go('deal',h.dealId);const before=h.saved.get(STORE),route=location.hash;h.notifications.length=0;h.setSaveFailure(true);h.click('publish-proposal');assert.match(h.html,/Prepare customer proposal/);h.submit(h.form('compose-proposal'));
  assert.equal(h.saved.get(STORE),before);assert.equal(location.hash,route);assert.equal(h.UI.getWorkspace().deals[0].proposals.length,1);assert.equal(h.notifications.length,0);
  h.setSaveFailure(false);h.submit(h.form('compose-proposal'));const deal=h.UI.getWorkspace().deals[0],v2=deal.proposals[1];
  assert.equal(deal.customer_responses[0].addressed_in_proposal_id,v2.id);assert.deepEqual(deal.proposals[0],v1);
  h.go('present',h.dealId,v1.id);assert.match(h.html,/Proposal V1/);assert.match(h.html,/Historical version/);
  assert.equal(h.value(h.form('comment'),'proposal_id'),v1.id);assert.equal(h.value(h.form('comment'),'quote_ref'),`${h.quoteId}|0`);
  assert.match(h.html,/Revised proposal available/);assert.ok(h.html.includes(`#present/${h.dealId}/${v2.id}`));
  assert.doesNotMatch(h.html,/PAC-D-001-Q02 · Rev 1/);
  h.go('present',h.dealId,v2.id);assert.match(h.html,/Proposal V2/);assert.equal(h.value(h.form('comment'),'quote_ref'),`${h.quoteId}|1`);
  h.go('present',h.dealId,'unknown-proposal');assert.match(h.html,/could not be opened/);assert.doesNotMatch(h.html,/Send feedback/);
});

test('same-deal route navigation dismisses the proposal composer without publishing',async t=>{
  const h=await setup(t,{revise:false});
  const proposals=JSON.stringify(h.UI.getWorkspace().deals[0].proposals);
  h.go('deal',h.dealId);h.click('publish-proposal');
  assert.match(h.html,/Prepare customer proposal/);
  h.go('deal',h.dealId);
  assert.match(h.html,/Prepare customer proposal/,'same-route redraw keeps the composer open');
  h.go('quote',h.dealId,h.quoteId);
  assert.doesNotMatch(h.html,/Prepare customer proposal/);
  assert.match(h.html,/This issued revision is read-only/);
  assert.equal(JSON.stringify(h.UI.getWorkspace().deals[0].proposals),proposals);
  h.go('deal',h.dealId);h.click('publish-proposal');
  h.go('deal-explorer',h.dealId,h.quoteId);
  assert.doesNotMatch(h.html,/Prepare customer proposal/);
  assert.match(h.html,/Explore/);
  assert.equal(JSON.stringify(h.UI.getWorkspace().deals[0].proposals),proposals);
});

test('a quote save error does not follow navigation to another context and retained edits survive',async t=>{
  const h=await setup(t);stageSpareKit(h);h.setSaveFailure(true);h.click('save-quote');
  assert.match(h.html,/Change not saved/);
  const retained=h.saved.get(QUOTE_EDITS);
  h.go('deal',h.dealId);
  assert.doesNotMatch(h.html,/Change not saved/);
  assert.equal(h.saved.get(QUOTE_EDITS),retained);
  h.go('quote',h.dealId,h.quoteId);assert.match(h.html,/Unsaved changes/);
  assert.equal(S.totals(h.quote).total,40810);
});

test('feedback drafts remain separate between published proposal versions',async t=>{
  const h=await setup(t,{revise:false});const original=h.UI.getWorkspace(),deal=original.deals[0],quote=deal.quotes[1],v1=deal.proposals[0];
  S.reviseQuote(deal,quote);S.reviewQuote(catalog,deal,quote,'application','sales');S.issueQuote(catalog,deal,quote);const v2=S.publishProposal(deal);h.saved.set(STORE,JSON.stringify(original));
  const ready=await setup(t,{storage:h.saved});ready.go('present',h.dealId,v1.id);ready.click('proposal-alternative',{alternative:h.quoteId});ready.fill(ready.form('comment'),{body:'Question on V1'});
  ready.go('present',h.dealId,v2.id);assert.equal(ready.value(ready.form('comment'),'body'),'');ready.fill(ready.form('comment'),{body:'Question on V2'});
  ready.go('present',h.dealId,v1.id);assert.equal(ready.value(ready.form('comment'),'body'),'Question on V1');
  const reloaded=await setup(t,{storage:ready.saved});reloaded.go('present',h.dealId,v2.id);reloaded.click('proposal-alternative',{alternative:h.quoteId});assert.equal(reloaded.value(reloaded.form('comment'),'body'),'Question on V2');
  reloaded.click('discard-form-edits');reloaded.go('present',h.dealId,v1.id);assert.equal(reloaded.value(reloaded.form('comment'),'body'),'Question on V1');
});

test('unmatched legacy feedback remains editable in seller recovery without leaking into customer proposals',async t=>{
  const initial=S.seedWorkspace(catalog),deal=initial.deals[0],quote=deal.quotes[1];
  S.reviseQuote(deal,quote);S.reviewQuote(catalog,deal,quote,'application','sales');S.issueQuote(catalog,deal,quote);
  delete deal.proposals;delete deal.proposal_selections;delete deal.customer_responses;
  const key=`comment|${deal.id}|||new|shared|${quote.id}`;
  const entry={key,name:'comment',dealId:deal.id,quoteId:'',revision:null,itemId:null,values:{author:'Legacy reviewer',body:'Unsent question on the original quote',quote_ref:`${quote.id}|0`}};
  const saved=new Map([[STORE,JSON.stringify(initial)],[FORMS,JSON.stringify([[key,entry]])]]);
  const h=await setup(t,{storage:saved});h.go('present',deal.id);assert.doesNotMatch(h.html,/Unsent question on the original quote|Recovered feedback drafts/);
  h.go('workspace');assert.equal(h.value(h.form('comment'),'body'),entry.values.body);
  h.go('deal',deal.id);assert.equal(h.value(h.form('comment'),'body'),entry.values.body);assert.equal(h.pending.length,1);
  h.setSaveFailure(true);h.submit(h.form('comment'));assert.equal(h.value(h.form('comment'),'body'),entry.values.body);assert.equal(h.pending.length,1);
  h.setSaveFailure(false);h.submit(h.form('comment'));const recovered=h.UI.getWorkspace().deals[0].comments.at(-1);
  assert.equal(recovered.body,entry.values.body);assert.equal(recovered.revision,0);assert.equal(recovered.proposal_id,null);assert.equal(recovered.origin,'recovered_legacy_draft');assert.equal(h.pending.length,0);
  assert.equal(saved.get(`${STORE}.before-proposals`),JSON.stringify(initial));
});

test('revision URLs open their exact saved revision and a successful revise leaves that history route',async t=>{
  const h=await setup(t);h.click('quote-tab',{tab:'review'});h.click('review',{review:'application'});h.click('issue');
  h.go('quote',h.dealId,h.quoteId,'0');assert.match(h.html,/Rev 0 · Issued/);assert.doesNotMatch(h.html,/Rev 1 · Issued/);
  h.click('quote-tab',{tab:'configuration'});assert.match(h.html,/This issued revision is read-only/);assert.equal(h.button('save-quote'),undefined);
  h.go('quote',h.dealId,h.quoteId,'working');h.click('revise');assert.equal(location.hash,`#quote/${h.dealId}/${h.quoteId}/working`);assert.equal(h.quote.working.revision,2);
  h.go('quote',h.dealId,h.quoteId,'99');assert.match(h.html,/This quote revision was not found/);
});

test('a deal without an issued proposal has no customer feedback form and malformed legacy drafts cannot crash recovery',async t=>{
  const initial=S.seedWorkspace(catalog),empty=S.createDeal(initial,{title:'New opportunity',customer:'Demo customer',owner:'Sales'});
  const key=`comment|${empty.id}|||new|shared|compare`;
  const saved=new Map([[STORE,JSON.stringify(initial)],[FORMS,JSON.stringify([[key,{key,name:'comment',dealId:empty.id,quoteId:'',revision:null,values:{body:'Unassociated draft',quote_ref:''}}]])]]);
  const h=await setup(t,{storage:saved});h.go('present',empty.id);assert.doesNotMatch(h.html,/data-sales-form="comment"/);assert.match(h.html,/Publish a proposal before requesting customer feedback/);
  assert.doesNotThrow(()=>h.go('workspace'));assert.doesNotMatch(h.html,/Unassociated draft/);
});

test('unreadable workspace recovery exports original bytes and never overwrites retained form storage',async t=>{
  const raw='{unreadable workspace',forms='[["original",{"values":{"body":"Keep this draft"}}]]';
  const saved=new Map([[STORE,raw],[FORMS,forms]]),h=await setup(t,{storage:saved});
  h.go('deal',h.dealId);h.click('deal-details');h.fill(h.form('deal-details'),{owner:'Unsaved sample owner'});h.submit(h.form('deal-details'));
  assert.equal(saved.get(STORE),raw);assert.equal(saved.get(FORMS),forms);assert.match(h.html,/has not been overwritten/);
  let exported;const originalCreate=URL.createObjectURL;t.after(()=>{URL.createObjectURL=originalCreate;});
  URL.createObjectURL=blob=>{exported=blob;return originalCreate(blob);};document.createElement=()=>({click(){}});
  h.go('workspace');h.click('export-workspace');const bundle=JSON.parse(await exported.text());
  assert.equal(bundle.original_saved_workspace,raw);assert.equal(bundle.original_form_edits,forms);assert.equal(bundle.format,'pac-workspace-recovery-v1');
});

// These are saved-document fixtures, not mutations of a running issued quote.
// Unique sentences let the tests check every commercial section independently
// from the renderer's term-comparison implementation.
function printFixture() {
  const state=JSON.parse(JSON.stringify(S.seedWorkspace(catalog))),deal=state.deals[0],proposal=deal.proposals[0];
  const sentences={
    lead:'Frozen delivery estimate: 12–16 weeks.',validity:'Frozen validity: sixty calendar days.',
    payment:'Frozen payment: deposit & balance on shipment.',delivery:'Frozen delivery basis: FOB fixture factory.',
    shipment:'Frozen shipment: customer-appointed carrier.',warranty:'Frozen standard warranty: one year.',
    conditions:'Frozen warranty condition: approved consumables only.',application:'Frozen application condition: sample testing required.',
    fat:'Frozen acceptance test: one factory day.',financing:'Frozen financing: contact the sales team.',
    startup:'Frozen start-up condition: site ready before arrival.',
  };
  const terms={lead_time:{text:sentences.lead,min_weeks:12,max_weeks:16},quote_valid_days:{text:sentences.validity},payment_terms:{text:sentences.payment},delivery_terms:{text:sentences.delivery},shipment:{text:sentences.shipment},warranty:{standard:{line_text:sentences.warranty},terms:{text:sentences.conditions}},project_specifications:{text:sentences.application},fat:{text:sentences.fat},financing:{text:sentences.financing},startup:{text:sentences.startup}};
  for(const alternative of proposal.snapshot.alternatives)alternative.terms=JSON.parse(JSON.stringify(terms));
  return {state,deal,proposal,sentences};
}
function printedProposal(html) {
  const marker='<div class="pac-print-proposal">',at=html.indexOf(marker);
  assert.ok(at>=0,'the customer surface includes a dedicated print projection');
  return html.slice(at+marker.length);
}
function assertPrintedQuoteContent(print,proposal) {
  const documents=[...print.matchAll(/<article class="sales-panel sales-quote-document">([\s\S]*?)<\/article>/g)].map(match=>decode(match[1]));
  assert.equal(documents.length,proposal.snapshot.alternatives.length,'every published alternative retains its detailed quote');
  const currency=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
  for(const alternative of proposal.snapshot.alternatives){
    const identity=`${alternative.number} · Rev ${alternative.revision}`;
    const document=documents.find(value=>value.includes(identity));
    assert.ok(document,`printed quote identifies ${identity}`);
    assert.ok(document.includes(currency(alternative.totals.total)),`printed total for ${identity}`);
    for(const line of alternative.lines){
      assert.ok(document.includes(line.name),`printed line ${line.name}`);
      assert.ok(document.includes(currency(line.price_usd)),`printed unit price for ${line.name}`);
      assert.ok(document.includes(currency(line.total??line.quantity*line.price_usd)),`printed amount for ${line.name}`);
    }
  }
}
const occurrences=(source,text)=>source.split(text).length-1;

test('print shares identical frozen commercial terms once while retaining historical quote content',async t=>{
  const fixture=printFixture(),{state,deal,proposal,sentences}=fixture;
  const newer=JSON.parse(JSON.stringify(proposal));newer.id='proposal-later-print-fixture';newer.version=proposal.version+1;
  for(const alternative of newer.snapshot.alternatives)alternative.terms.payment_terms.text='NEWER PROPOSAL PAYMENT — must not leak into history';
  deal.proposals.push(newer);
  const saved=new Map([[STORE,JSON.stringify(state)]]),h=await setup(t,{storage:saved}),before=saved.get(STORE);
  assert.deepEqual(h.UI.getWorkspace().deals[0].proposals,deal.proposals,'loading preserves the frozen proposal fixtures');
  h.go('present',deal.id,proposal.id);
  const print=printedProposal(h.html),text=decode(print);
  assert.equal(occurrences(print,'class="pac-print-common-terms"'),1);
  for(const sentence of Object.values(sentences))assert.equal(occurrences(text,sentence),1,`exact frozen term appears once: ${sentence}`);
  const shared=decode(print.match(/<section class="pac-print-common-terms">([\s\S]*?)<\/section>/)?.[1]||'');
  for(const alternative of proposal.snapshot.alternatives)assert.ok(shared.includes(`${alternative.number} · Rev ${alternative.revision}`),'shared terms identify each covered quote revision');
  assertPrintedQuoteContent(print,proposal);
  assert.doesNotMatch(print,/NEWER PROPOSAL PAYMENT/);
  assert.equal(saved.get(STORE),before,'printing does not rewrite either published snapshot');
});

test('different frozen commercial terms remain beside their own printed quote',async t=>{
  const {state,deal,proposal,sentences}=printFixture(),changed='Alternative B frozen payment: balance before shipment.';
  proposal.snapshot.alternatives[1].terms.payment_terms.text=changed;
  const saved=new Map([[STORE,JSON.stringify(state)]]),h=await setup(t,{storage:saved}),before=saved.get(STORE);
  assert.deepEqual(h.UI.getWorkspace().deals[0].proposals,deal.proposals,'loading preserves the frozen proposal fixtures');
  h.go('present',deal.id,proposal.id);
  const print=printedProposal(h.html),text=decode(print);
  assert.doesNotMatch(print,/class="pac-print-common-terms"/);
  assert.equal(occurrences(text,sentences.payment),1);assert.equal(occurrences(text,changed),1);
  for(const [key,sentence] of Object.entries(sentences))if(key!=='payment')assert.equal(occurrences(text,sentence),2,`each quote retains ${key}`);
  const documents=[...print.matchAll(/<article class="sales-panel sales-quote-document">([\s\S]*?)<\/article>/g)].map(match=>decode(match[1]));
  assert.ok(documents[0].includes(sentences.payment));assert.ok(!documents[0].includes(changed));
  assert.ok(documents[1].includes(changed));assert.ok(!documents[1].includes(sentences.payment));
  assertPrintedQuoteContent(print,proposal);assert.equal(saved.get(STORE),before);
});

test('identical term records are not shared when only one printed quote includes service conditions',async t=>{
  const {state,deal,proposal,sentences}=printFixture(),withoutService=proposal.snapshot.alternatives[1];
  withoutService.lines=withoutService.lines.filter(line=>line.line_class!=='service');
  // Keep the test snapshot arithmetically coherent after removing its service.
  const subtotal=withoutService.lines.reduce((sum,line)=>sum+(line.total??line.quantity*line.price_usd),0);
  withoutService.totals={...withoutService.totals,subtotal,total:subtotal-withoutService.totals.discount};
  assert.ok(proposal.snapshot.alternatives[0].lines.some(line=>line.line_class==='service'));
  assert.deepEqual(proposal.snapshot.alternatives[0].terms,withoutService.terms);
  const saved=new Map([[STORE,JSON.stringify(state)]]),h=await setup(t,{storage:saved}),before=saved.get(STORE);
  assert.deepEqual(h.UI.getWorkspace().deals[0].proposals,deal.proposals,'loading preserves the frozen proposal fixtures');
  h.go('present',deal.id,proposal.id);
  const print=printedProposal(h.html),text=decode(print);
  assert.doesNotMatch(print,/class="pac-print-common-terms"/);
  assert.equal(occurrences(text,sentences.startup),1,'service conditions print only for the alternative that includes service');
  for(const [key,sentence] of Object.entries(sentences))if(key!=='startup')assert.equal(occurrences(text,sentence),2);
  const documents=[...print.matchAll(/<article class="sales-panel sales-quote-document">([\s\S]*?)<\/article>/g)].map(match=>decode(match[1]));
  assert.ok(documents[0].includes(sentences.startup));assert.ok(!documents[1].includes(sentences.startup));
  assertPrintedQuoteContent(print,proposal);assert.equal(saved.get(STORE),before);
});


test('selling-price drafts survive hiding prices and failed save, then require fresh review',async t=>{
  const h=await setup(t),lineId=h.quote.working.draft.lines[0].quote_line_id;
  const catalogPrice=h.quote.working.draft.lines[0].price_usd,history=JSON.stringify(h.quote.revisions);
  h.click('select-line',{line:lineId});
  h.fill(h.form('line-price'),{price_usd:String(catalogPrice+500),reason:'Application-specific commercial allowance of $500'});
  assert.equal(h.pending.some(([,entry])=>entry.name==='line-price'),true);
  h.change('prices',false);
  assert.match(h.html,/Published proposals keep their issued prices/);assert.doesNotMatch(h.html,/\$[0-9]/);assert.equal(h.value(h.form('line-price'),'reason'),'');
  h.submit(h.form('line-price'));assert.match(h.html,/Show prices before applying/);
  assert.equal(S.lineUnitPrice(h.quote.working.draft.lines[0]),catalogPrice);
  h.change('prices',true);assert.equal(h.value(h.form('line-price'),'price_usd'),String(catalogPrice+500));
  h.setSaveFailure(true);h.submit(h.form('line-price'));assert.equal(S.lineUnitPrice(h.quote.working.draft.lines[0]),catalogPrice);
  assert.equal(h.value(h.form('line-price'),'reason'),'Application-specific commercial allowance of $500');
  h.setSaveFailure(false);h.submit(h.form('line-price'));
  assert.equal(S.lineUnitPrice(h.quote.working.draft.lines[0]),catalogPrice+500);
  assert.equal(h.quote.working.draft.lines[0].price_usd,catalogPrice);
  assert.deepEqual(h.quote.working.approvals,{});assert.equal(JSON.stringify(h.quote.revisions),history);
  assert.equal(h.pending.some(([,entry])=>entry.name==='line-price'),false);
  h.fill(h.form('reset-line-price'),{reason:'Restore standard pricing after review'});h.submit(h.form('reset-line-price'));
  assert.equal(S.lineUnitPrice(h.quote.working.draft.lines[0]),catalogPrice);assert.equal(JSON.stringify(h.quote.revisions),history);
});

test('below-catalog prices reject Sales and require Manager review after authorized save',async t=>{
  const h=await setup(t),lineId=h.quote.working.draft.lines[0].quote_line_id;
  const catalogPrice=h.quote.working.draft.lines[0].price_usd;
  h.click('select-line',{line:lineId});h.fill(h.form('line-price'),{price_usd:String(catalogPrice-500),reason:'Approved commercial concession'});h.submit(h.form('line-price'));
  assert.equal(S.lineUnitPrice(h.quote.working.draft.lines[0]),catalogPrice);
  h.change('role','manager');h.submit(h.form('line-price'));
  assert.equal(S.lineUnitPrice(h.quote.working.draft.lines[0]),catalogPrice-500);
  assert.match(h.html,/Manager approval is required/);
  h.click('quote-tab',{tab:'review',slot:'tab'});h.click('review',{review:'application'});h.click('issue');
  assert.equal(h.quote.working.status,'draft');h.click('review',{review:'manager'});h.click('issue');
  assert.equal(h.quote.working.status,'issued');assert.equal(h.quote.revisions.at(-1).totals.total,40310);
});


test('connected form save clears the recreated pending form after the asynchronous response',async t=>{
  const h=await setup(t,{connected:true}),lineId=h.quote.working.draft.lines[0].quote_line_id;
  const basis=h.quote.working.draft.lines[0].price_usd;
  h.click('select-line',{line:lineId});h.fill(h.form('line-price'),{price_usd:String(basis+500),reason:'Connected save regression'});
  h.submit(h.form('line-price'));
  assert.match(h.html,/Saving changes/);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(S.lineUnitPrice(h.quote.working.draft.lines[0]),basis+500);
  assert.equal(h.button('quote-tab',{tab:'review',slot:'header'}).disabled,false);
  assert.doesNotMatch(h.html,/Unsaved work/);assert.match(h.html,/class="pac-unsaved-note no-print" hidden/);
  assert.equal(h.value(h.form('line-price'),'reason'),'');
});


test('hidden prices also redact commercial terms and retained discount reasons',async t=>{
  const h=await setup(t);h.click('quote-tab',{tab:'terms',slot:'tab'});
  h.fill(h.form('discount'),{amount:'500',reason:'Concession of $500 for this scope'});h.change('prices',false);
  assert.doesNotMatch(h.html,/\$[0-9]/);assert.equal(h.value(h.form('discount'),'reason'),'');
  h.change('prices',true);assert.equal(h.value(h.form('discount'),'amount'),'500');assert.equal(h.value(h.form('discount'),'reason'),'Concession of $500 for this scope');
});


test('seller discussion names the exact published line behind customer feedback',async t=>{
  const initial=S.seedWorkspace(catalog),deal=initial.deals[0],quote=deal.quotes[1];
  const line=quote.revisions[0].draft.lines.find(line=>line.option_id==='easy_load_bag_opener');
  S.recordCustomerResponse(deal,{proposal_id:deal.proposals[0].id,quote_id:quote.id,kind:'question',author:'QA buyer',body:'Please clarify this item.',section:'options',line_id:line.quote_line_id});
  const h=await setup(t,{storage:new Map([[STORE,JSON.stringify(initial)]]),revise:false});
  h.go('deal',deal.id,quote.id);h.click('deal-tab',{tab:'discussion'});
  assert.match(h.html,/About: Configuration item · Easy Load Bag Opener/);
  assert.match(h.html,/Proposal V1/);assert.match(h.html,/Rev 0/);
});

test('returned engineering review retains its reason, requires resubmission and preserves issued revisions',async t=>{
  const h=await setup(t,{engineering:true}),before=JSON.stringify(h.quote.revisions);
  h.click('quote-tab',{tab:'review'});
  h.click('submit-review',{review:'engineering'});
  h.change('role','engineering');
  const form=h.form('return-review','engineering');
  h.fill(form,{reason:'Confirm the product guide dimensions with the customer.'});
  h.submit(form);
  assert.match(h.html,/Confirm the product guide dimensions with the customer/);
  assert.equal(h.button('review',{review:'engineering'}).disabled,true);
  assert.equal(h.quote.working.review_requests.engineering.status,'changes_requested');
  h.change('role','sales');
  assert.match(h.html,/Resubmit for review/);
  h.click('submit-review',{review:'engineering'});
  assert.equal(h.quote.working.review_requests.engineering.status,'pending');
  h.change('role','engineering');h.click('review',{review:'engineering'});
  assert.ok(h.quote.working.approvals.engineering);
  assert.equal(JSON.stringify(h.quote.revisions),before);
});

test('catalog-triggered engineering remains visible without custom engineering requests',async t=>{
  const h=await setup(t);
  const row=catalog.priceLines.findIndex(line=>line.machine_id==='r3200'&&line.option_id==='accumulating_funnel');
  h.click('open-options');h.click('select-option',{row:String(row)});h.click('confirm-selection',{row:String(row)});h.click('save-quote');
  h.click('quote-tab',{tab:'engineering'});
  assert.equal(h.quote.working.engineering.length,0);
  assert.match(h.html,/Catalog conditions/);assert.match(h.html,/Accumulating Funnel/);
  assert.match(h.html,/Custom engineering requests/);
  assert.doesNotMatch(h.html,/Switch the demo role/);
});

test('catalog-led new deal keeps the original browser draft and resumes with the new deal selected',async t=>{
  const h=await setup(t),draft=structuredClone(h.quote.working.draft),original=JSON.stringify(draft);
  h.UI.startDealForCatalog(draft);h.go('workspace');
  const form=h.form('new-deal');
  h.fill(form,{title:'Migration review',customer:'Recovery test',owner:'Sales reviewer',crm_id:'CRM-RECOVERY',application:'Pack samples',bag_dimensions:'12 x 16 in',throughput:'25'});
  h.submit(form);
  const deal=h.UI.getWorkspace().deals.at(-1);
  assert.equal(h.UI.currentDealId(),deal.id);
  assert.equal(globalThis.location.hash,'#catalog-start/r3200');
  assert.equal(JSON.stringify(draft),original);
  await h.UI.attachCatalogDraft(draft,deal.id,'Recovered machine');
  assert.equal(h.UI.getWorkspace().deals.at(-1).quotes.length,1);
  assert.equal(h.UI.getWorkspace().deals.at(-1).quotes[0].working.status,'draft');
  assert.equal(JSON.stringify(draft),original);
});

test('publication preview shows customer decision while keeping internal follow-up private',async t=>{
  const h=await setup(t,{revise:false});h.go('deal',h.dealId);h.click('deal-details');
  const form=h.form('deal-details');
  h.fill(form,{next_action:'INTERNAL QA TASK',next_action_date:'2026-11-20',customer_next_decision:'Confirm preferred loading approach',customer_decision_date:'2026-11-18'});h.submit(form);
  h.click('deal-details');h.click('publish-proposal');
  assert.match(h.html,/Confirm preferred loading approach/);
  assert.match(h.html,/Nov 18, 2026/);
  assert.doesNotMatch(h.html,/INTERNAL QA TASK/);
});

test('a special-order item can be edited in place while hidden prices and issued scope stay preserved',async t=>{
  const h=await setup(t),issued=JSON.stringify(h.quote.revisions);
  h.click('quote-tab',{tab:'special'});let form=h.form('special');
  h.fill(form,{description:'QA special guide',price:'1250',lead_time:'Adds one week after drawing approval'});h.submit(form);
  const item=h.quote.working.special[0];assert.ok(item.id);
  form=h.form('special',item.id);h.fill(form,{description:'QA revised guide',price:'1400',lead_time:'Adds two weeks after drawing approval'});h.submit(form);
  assert.equal(h.quote.working.special.length,1);assert.equal(h.quote.working.special[0].id,item.id);assert.equal(h.quote.working.special[0].price,1400);
  h.change('prices',false);form=h.form('special',item.id);h.fill(form,{lead_time:'Two weeks after final sample approval'});h.submit(form);
  assert.equal(h.quote.working.special[0].price,1400);assert.equal(h.quote.working.special[0].lead_time,'Two weeks after final sample approval');
  assert.equal(JSON.stringify(h.quote.revisions),issued);
});

test('Engineering can inspect a draft without being offered sales configuration edits',async t=>{
  const h=await setup(t,{engineering:true});h.change('role','engineering');
  assert.equal(h.button('open-options'),undefined);assert.equal(h.button('remove-option'),undefined);assert.equal(h.button('save-quote'),undefined);
  assert.doesNotMatch(h.html,/id="mw-revision-note"/);assert.match(h.html,/Configuration is read-only for Engineering/);
  h.click('quote-tab',{tab:'engineering'});assert.ok(h.form('engineering',h.itemId));assert.equal(h.button('remove-engineering'),undefined);
});

test('unpriced engineering may be submitted but cannot be approved from the quote workspace',async t=>{
  const h=await setup(t);h.click('quote-tab',{tab:'engineering'});
  const form=h.form('engineering');h.fill(form,{description:'QA custom guide',reason:'Guide must fit the sample'});h.submit(form);
  h.click('quote-tab',{tab:'review'});
  assert.equal(h.button('review',{review:'application'}).disabled,true);
  assert.equal(h.button('submit-review',{review:'engineering'}).disabled,false);
  assert.match(h.html,/Engineering or catalog pricing is incomplete/);
});
