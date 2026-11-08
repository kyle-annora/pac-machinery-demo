import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as S from '../src/sales-domain.js';
import { normalizeFeedback, renderCustomerReview } from '../src/customer-review.js';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../data/catalog/${name}`,import.meta.url)));
const catalog={manifest:read('manifest.json'),overview:read('overview.json'),machines:read('catalog/machines.json'),priceLines:read('catalog/price_lines.json'),narratives:read('catalog/narratives.json'),media:read('catalog/media.json'),terms:read('catalog/commercial_terms.json'),kits:read('catalog/spare_parts.json'),options:read('catalog/options.json'),baseUrl:'/source'};
const fixture=()=>{const deal=S.seedWorkspace(catalog).deals[0];return {deal,envelope:{proposal:S.publicProposal(deal),recipient:{name:'Northstar Buyer'}}};};

test('customer comparison separates alternative prices and prints every published configuration',()=>{
  const {envelope}=fixture(),html=renderCustomerReview(envelope);
  assert.match(html,/Their prices are not added together/);assert.match(html,/\$33,060\.00/);assert.match(html,/\$40,810\.00/);assert.doesNotMatch(html,/\$73,870\.00/);
  assert.match(html,/cr-print-all/);assert.equal((html.match(/Configuration & pricing/g)||[]).length,2);
  assert.match(html,/Commercial terms & conditions/);assert.match(html,/Freight and tax are excluded/);
  assert.doesNotMatch(html,/#deal|#workspace|#config|Back to deal|data-sw=/);
});

test('customer display stays on its published snapshot while seller revises and excludes internal fields',()=>{
  const {deal,envelope}=fixture(),before=renderCustomerReview(envelope),quote=deal.quotes[1];
  S.reviseQuote(deal,quote,'Customer change');quote.working.labor_rate=9999;
  envelope.proposal.internal_note='DO_NOT_DISCLOSE_INTERNAL_COST';envelope.proposal.crm_id='DO_NOT_DISCLOSE_CRM_ID';
  const html=renderCustomerReview(envelope);
  assert.equal(html,before);assert.doesNotMatch(html,/DO_NOT_DISCLOSE|9999/);
  const selected=renderCustomerReview(envelope,{selected:quote.id});
  assert.match(selected,/It is not an order or acceptance/);assert.match(selected,/Your feedback stays with Version 1/);
});

test('untrusted customer content is escaped and unsafe evidence previews are excluded',()=>{
  const {envelope}=fixture();envelope.recipient.name='<script>customer</script>';
  envelope.proposal.evidence=[{title:'<img onerror=alert(1)>',note:'Reference only',source_label:'Reference assembly — not approved PAC CAD',reference:{preview:{dataUrl:'javascript:alert(1)'}}}];
  const html=renderCustomerReview(envelope,{feedback:{body:'</textarea><script>attack</script>'}});
  assert.doesNotMatch(html,/<script>|<img onerror|src="javascript:/);assert.match(html,/&lt;script&gt;customer/);assert.match(html,/&lt;\/textarea&gt;/);assert.match(html,/Reference assembly — not approved PAC CAD/);
});

test('contextual feedback only anchors to a line in the selected published alternative',()=>{
  const {deal,envelope}=fixture(),[a,b]=envelope.proposal.alternatives;
  const line=b.lines.find(item=>item.option_id);
  const input={kind:'changes_requested',section:'options',quote_id:b.quote_id,line_id:line.quote_line_id,body:'Please explain the operator workflow.',author:'Forged name',proposal_id:'future-proposal',revision:99};
  const feedback=normalizeFeedback(envelope,input);
  assert.deepEqual(feedback,{quote_id:b.quote_id,kind:'changes_requested',section:'options',line_id:line.quote_line_id,body:input.body});
  assert.equal(normalizeFeedback(envelope,{...input,quote_id:a.quote_id}).line_id,'');
  assert.equal(normalizeFeedback(envelope,{...input,quote_id:'unpublished-quote'}).quote_id,'');
  assert.equal(normalizeFeedback(envelope,{...input,line_id:'draft-only-line'}).line_id,'');
  assert.equal(normalizeFeedback(envelope,{...input,section:'internal_costs'}).section,'general');
  const response=S.recordCustomerResponse(deal,{...feedback,proposal_id:envelope.proposal.proposal_id,author:envelope.recipient.name});
  assert.equal(response.revision,b.revision);assert.equal(response.line_id,line.quote_line_id);assert.equal(response.proposal_id,envelope.proposal.proposal_id);
});

test('changing the visible alternative retains an explicit discussion anchor and draft',()=>{
  const {envelope}=fixture(),[a,b]=envelope.proposal.alternatives, line=b.lines.find(item=>item.option_id);
  const feedback={quote_id:b.quote_id,kind:'question',section:'options',line_id:line.quote_line_id,body:'Could we review this option?'};
  const html=renderCustomerReview(envelope,{selected:a.quote_id,feedback});
  assert.match(html,new RegExp(`<option value="${b.quote_id}" selected>`));
  assert.match(html,new RegExp(`<option value="${line.quote_line_id}" selected>`));
  assert.match(html,new RegExp(`Your feedback stays with Version 1 and ${b.label}\\.`));
  assert.match(html,/Could we review this option\?/);
  assert.equal(normalizeFeedback(envelope,{},a.quote_id).quote_id,a.quote_id);
  assert.equal(normalizeFeedback(envelope,{quote_id:''},a.quote_id).quote_id,'');
});

test('customer discussion preserves original version and reviewer attribution across alternative tabs',()=>{
  const {deal,envelope}=fixture(),[a,b]=envelope.proposal.alternatives,line=b.lines.find(item=>item.option_id);
  const first=S.recordCustomerResponse(deal,{proposal_id:envelope.proposal.proposal_id,quote_id:b.quote_id,line_id:line.quote_line_id,section:'options',kind:'question',body:'How does loading work?',author:'Operations reviewer'});
  S.recordCustomerResponse(deal,{proposal_id:envelope.proposal.proposal_id,quote_id:a.quote_id,section:'pricing',kind:'question',body:'Can we discuss payment terms?',author:'Purchasing reviewer'});
  S.replyToResponse(deal,first.id,{role:'sales',author:'PAC representative',body:'We can review the loading workflow together.'});
  envelope.proposal=S.publicProposal(deal,envelope.proposal.proposal_id);
  const html=renderCustomerReview(envelope,{selected:a.quote_id});
  assert.match(html,/Operations reviewer/);assert.match(html,/Purchasing reviewer/);assert.match(html,/PAC representative/);
  assert.match(html,new RegExp(`Proposal V1 · ${b.label} · Rev 0 · ${line.name}`));
  assert.match(html,/How does loading work\?/);assert.match(html,/We can review the loading workflow together/);
  assert.match(html,/Review link for Northstar Buyer/);assert.match(html,/Feedback from this link is recorded as/);
  assert.doesNotMatch(html,/name="author"|name="recipient"|Verified identity|Invite teammates/);
});

test('public configuration displays schedule conditions while omitting selling-price audit details',()=>{
  const {envelope}=fixture(),a=envelope.proposal.alternatives[1];
  a.lead_time_notes=['Customer sample testing must be completed.'];
  a.special=[{description:'Custom discharge height',price:1250,lead_time:'Adds two weeks after drawing approval.'}];
  a.lines[0].selling_price_override={reason:'INTERNAL_OVERRIDE_REASON',price_usd:12345,previous_price:1};
  a.lines[0].selling_price_history=[{actor:'INTERNAL_MANAGER',reason:'INTERNAL_CHANGE_HISTORY'}];
  const html=renderCustomerReview(envelope,{selected:a.quote_id});
  assert.match(html,/Lead-time conditions/);assert.match(html,/Customer sample testing must be completed/);assert.match(html,/Adds two weeks after drawing approval/);
  assert.match(html,/Configuration defined by the quoted scope/);assert.match(html,/Shown options may differ from your quoted configuration/);
  assert.doesNotMatch(html,/INTERNAL_|selling_price_override|previous_price|12,345/);
  const line=a.lines.find(item=>item.option_id);
  assert.match(html,new RegExp(`data-review="context" data-section="options" data-id="${a.quote_id}" data-line="${line.quote_line_id}"`));
});

test('calendar follow-up dates do not move back a day for recipients west of UTC',()=>{
  const previousTimezone=process.env.TZ;
  try {
    process.env.TZ='America/Los_Angeles';
    const {envelope}=fixture();envelope.proposal.customer_decision_date='2026-11-09';
    assert.match(renderCustomerReview(envelope),/<dt>Decision target<\/dt><dd>Nov 9, 2026<\/dd>/);
  } finally {
    if(previousTimezone===undefined)delete process.env.TZ;else process.env.TZ=previousTimezone;
  }
});
