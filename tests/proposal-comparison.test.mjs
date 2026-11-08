import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as S from '../src/sales-domain.js';
import { proposalComparison, conciseLineDescription } from '../src/proposal-comparison.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../data/catalog/${name}`,import.meta.url)));
const catalog={manifest:read('manifest.json'),overview:read('overview.json'),machines:read('catalog/machines.json'),priceLines:read('catalog/price_lines.json'),narratives:read('catalog/narratives.json'),media:read('catalog/media.json'),terms:read('catalog/commercial_terms.json'),kits:read('catalog/spare_parts.json'),options:read('catalog/options.json')};
test('published A/B comparison decomposes the actual price delta without summing alternatives',()=>{
 const deal=S.seedWorkspace(catalog).deals[0],p=S.publicProposal(deal),result=proposalComparison(p);
 assert.equal(result.alternatives[1].delta,7750);
 assert.deepEqual(result.shared.map(row=>row.label),['Rollbag R3200 Automatic Bagger','On-Site Start-Up & Training']);
 assert.deepEqual(result.differences.map(row=>row.label),['Easy Load Bag Opener','Seal Flattener Fingers']);
 assert.equal(result.alternatives[1].added.reduce((sum,line)=>sum+line.total,0),7750);
 assert.ok(result.commonPhoto);assert.match(conciseLineDescription(result.alternatives[1].added[0]),/10 in or wider.*requires Seal Flattener/);
 S.reviseQuote(deal,deal.quotes[1]);
 assert.equal(proposalComparison(S.publicProposal(deal,p.proposal_id)).alternatives[1].delta,7750);
});
test('comparison handles mixed models, repeated engineering, different quantities and discounts',()=>{
 const base={quote_id:'a',label:'Approach A',machine_id:'a',photo:{file:'a.jpg'},totals:{total:100,discount:0},lines:[{name:'Equipment A',line_class:'catalog_base',price_usd:100,quantity:1}],engineering:[]};
 const b={...base,quote_id:'b',label:'Approach B',machine_id:'b',photo:{file:'b.jpg'},lines:[{name:'Equipment B',line_class:'catalog_base',price_usd:200,quantity:1}],totals:{total:290,discount:10},engineering:[{description:'Guide',price:50},{description:'Guide',price:50}]};
 const c={...base,quote_id:'c',label:'Approach C',lines:[{...base.lines[0],quantity:2}],totals:{total:200,discount:0}};
 const result=proposalComparison({alternatives:[base,b,c]});
 assert.equal(result.commonPhoto,null);assert.equal(result.sameMachine,false);assert.equal(result.alternatives.length,3);
 assert.equal(result.differences.filter(row=>row.label==='Guide').length,2);
 assert.equal(result.alternatives[1].delta,190);assert.equal(result.alternatives[1].discount_delta,10);assert.equal(result.alternatives[2].changed.length,1);
 assert.equal(result.shared.length,0);
});
test('option media is tied to the issued selection and retained independently of later catalog changes',()=>{
 const deal=S.seedWorkspace(catalog).deals[0],p=S.publicProposal(deal),b=p.alternatives[1];
 assert.ok(b.media.some(item=>item.option_id==='easy_load_bag_opener'));
 assert.ok(b.media.every(item=>b.lines.some(line=>line.option_id===item.option_id)));
 assert.ok(b.media.every(item=>['generic_option','model_option'].includes(item.scope)));
 const before=JSON.stringify(b.media);S.reviseQuote(deal,deal.quotes[1]);
 assert.equal(JSON.stringify(S.publicProposal(deal,p.proposal_id).alternatives[1].media),before);
});
