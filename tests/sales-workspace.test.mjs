import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as S from '../src/sales-domain.js';

const read = name => JSON.parse(readFileSync(new URL(`../data/catalog/${name}`, import.meta.url)));
const catalog = {manifest:read('manifest.json'),overview:read('overview.json'),machines:read('catalog/machines.json'),priceLines:read('catalog/price_lines.json'),narratives:read('catalog/narratives.json'),media:read('catalog/media.json'),terms:read('catalog/commercial_terms.json'),kits:read('catalog/spare_parts.json'),options:read('catalog/options.json'),baseUrl:'/source'};
const STORE='pac.rollbag.sales.v1', FORMS='pac.rollbag.sales.form-edits.v1';
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
      form.elements.push({name:attrs.name,type:attrs.type||'text',disabled:'disabled' in attrs,get value(){return value;},set value(next){value=options&&!options.some(option=>option.value===String(next))?'':String(next);}});
    }
    return form;
  });
}
async function setup(t,{engineering=false,storage,revise=true}={}) {
  const initial=S.seedWorkspace(catalog),deal=initial.deals[0],quote=deal.quotes[1];
  if(revise)S.reviseQuote(deal,quote);
  const item=engineering?S.saveEngineering(deal,quote,{description:'Loading guide',reason:'Mixed kits',hours:4,materials:250},'engineering'):null;
  const saved=storage||new Map([[STORE,JSON.stringify(initial)]]);
  const originals=Object.fromEntries(['localStorage','document','FormData','location'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  if(!cleanupRegistered.has(t)){cleanupRegistered.add(t);t.after(()=>{for(const [key,descriptor] of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});}
  let html='',forms=[],buttons=[],listeners={},route=['quote',deal.id,quote.id];
  const main={querySelectorAll:selector=>selector==='form[data-sales-form]'?forms:[],addEventListener:(name,fn)=>{listeners[name]=fn;}};
  const notice={hidden:true,querySelector:()=>({textContent:''})};
  globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
  globalThis.location={hash:`#quote/${deal.id}/${quote.id}`};
  globalThis.document={querySelector:selector=>selector==='.sales-main'?main:selector==='[data-sales-action="issue"]'?buttons.find(button=>button.dataset.salesAction==='issue'):null,querySelectorAll:selector=>selector==='.sales-main form[data-sales-form]'?forms:selector==='[data-sales-action="review"]'?buttons.filter(button=>button.dataset.salesAction==='review'):[],getElementById:id=>id==='winter-unsaved-note'?notice:null};
  globalThis.FormData=class {constructor(form){this.entries=form.elements.filter(field=>!field.disabled).map(field=>[field.name,field.value]);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}};
  const UI=await import(`../src/sales-workspace.js?controller-test=${++sequence}`);
  const render=()=>{html=UI.render(...route);forms=parseForms(html);buttons=[...html.matchAll(/<button\b([^>]*)>/g)].map(([,head])=>{const attrs=attributes(head);return {dataset:dataset(attrs),disabled:'disabled' in attrs};});listeners={};UI.afterRender();};
  UI.init(catalog,{render});render();
  const h={UI,saved,dealId:deal.id,quoteId:quote.id,itemId:item?.id,get html(){return html;},get quote(){return UI.getWorkspace().deals[0].quotes[1];},get pending(){return JSON.parse(saved.get(FORMS)||'[]');},go(...next){route=next;render();},form(name,itemId){const form=forms.find(form=>form.dataset.salesForm===name&&(itemId===undefined||form.dataset.item===itemId));assert.ok(form,`rendered ${name} form ${itemId??''}`);return form;},fill(form,values){for(const [name,value] of Object.entries(values)){const field=form.elements.find(field=>field.name===name);assert.ok(field,`rendered field ${name}`);field.value=value;}listeners.input({target:{closest:()=>form}});},value(form,name){return form.elements.find(field=>field.name===name)?.value;},change(name,value){UI.handleChange({target:{closest:()=>({dataset:{salesChange:name},value,checked:value})}});},click(name,details={}){const button=buttons.find(button=>button.dataset.salesAction===name&&Object.entries(details).every(([key,value])=>button.dataset[key]===value));assert.ok(button,`rendered action ${name}`);UI.handleClick({preventDefault(){},target:{closest:()=>button}});},submit(form){UI.handleSubmit({preventDefault(){},target:{closest:()=>form}});}};
  return h;
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
  assert.equal(h.pending.length,2);h.click('remove-engineering',{item:h.itemId});
  assert.equal(h.quote.working.engineering.length,0);assert.equal(h.pending.length,0);
  h.click('quote-tab',{tab:'review'});h.click('review',{review:'engineering'});
  assert.ok(h.quote.working.approvals.engineering);assert.doesNotMatch(h.html,/Save or discard the unapplied quote and deal form edits/);
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
  assert.ok(h.html.includes(`href="#quote/${h.dealId}/${h.quoteId}" >Configure & review`));
  h.go('workspace');assert.equal(h.UI.currentDealId(),h.dealId);assert.equal(h.UI.currentQuoteId(),h.quoteId);
  const reloaded=await setup(t,{storage:h.saved});reloaded.go('workspace');assert.equal(reloaded.UI.currentQuoteId(),h.quoteId);
  reloaded.go('quote',h.dealId);assert.ok(reloaded.html.includes(`value="${h.quoteId}" selected`));
});

test('a retained customer comment remains attached to its original issued revision after a new issue',async t=>{
  const h=await setup(t,{revise:false});h.go('present',h.dealId);h.click('proposal-alternative',{alternative:h.quoteId});
  h.fill(h.form('comment'),{body:'Question about the original configuration'});
  const workspace=h.UI.getWorkspace(),deal=workspace.deals[0],quote=deal.quotes[1];S.reviseQuote(deal,quote);S.reviewQuote(catalog,deal,quote,'application','sales');S.issueQuote(catalog,deal,quote,'sales');h.saved.set(STORE,JSON.stringify(workspace));
  const reloaded=await setup(t,{storage:h.saved});reloaded.go('present',h.dealId);reloaded.click('proposal-alternative',{alternative:h.quoteId});
  assert.equal(reloaded.value(reloaded.form('comment'),'body'),'Question about the original configuration');assert.equal(reloaded.value(reloaded.form('comment'),'quote_ref'),`${h.quoteId}|0`);
  reloaded.submit(reloaded.form('comment'));const comment=reloaded.UI.getWorkspace().deals[0].comments.at(-1);assert.equal(comment.quote_id,h.quoteId);assert.equal(comment.revision,0);assert.equal(reloaded.pending.length,0);
});
