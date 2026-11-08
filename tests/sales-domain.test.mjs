import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../src/catalog.js';
import * as S from '../src/sales-domain.js';
import * as E from '../src/explorer.js';

const read = name => JSON.parse(fs.readFileSync(new URL(`../data/catalog/${name}`, import.meta.url)));
const c = { manifest: read('manifest.json'), overview: read('overview.json'), machines: read('catalog/machines.json'), priceLines: read('catalog/price_lines.json'), narratives: read('catalog/narratives.json'), media: read('catalog/media.json'), terms: read('catalog/commercial_terms.json'), kits: read('catalog/spare_parts.json'), options: read('catalog/options.json'), baseUrl: '/source' };
const fixture = () => { const state = S.seedWorkspace(c); const deal = state.deals[0]; return { state, deal, a: deal.quotes[0], b: deal.quotes[1] }; };
const revise = () => { const f = fixture(); S.reviseQuote(f.deal, f.b, 'Customer requests engineering review'); return f; };
const engineering = (deal, quote) => S.saveEngineering(deal, quote, { description: 'Adjust the loading guide', reason: 'Keep mixed kits aligned', hours: 4, materials: 250 }, 'engineering');
const approve = (deal, quote) => { S.reviewQuote(c, deal, quote, 'application', 'sales'); S.reviewQuote(c, deal, quote, 'engineering', 'engineering'); S.reviewQuote(c, deal, quote, 'manager', 'manager'); };

test('demo selling-price policy preserves the catalog basis, requires a reason and renews reviews', () => {
  const { deal, b } = revise(), line = b.working.draft.lines[0], originalCatalog = JSON.stringify(c);
  approve(deal, b);
  const before = JSON.stringify(b.working);
  for (const input of [{price_usd:28580,reason:''},{price_usd:-1,reason:'Invalid amount'},{price_usd:Infinity,reason:'Invalid amount'}]) assert.throws(() => S.setLinePriceOverride(c,deal,b,line.quote_line_id,input,'sales'));
  assert.throws(() => S.setLinePriceOverride(c,deal,b,line.quote_line_id,{price_usd:27000,reason:'Requested markdown'},'sales'), /Manager access/);
  assert.throws(() => S.setLinePriceOverride(c,deal,b,line.quote_line_id,{price_usd:28580,reason:'Commercial scope'},'engineering'), /Sales or Manager/);
  assert.equal(JSON.stringify(b.working),before);
  S.setLinePriceOverride(c,deal,b,line.quote_line_id,{price_usd:28580,reason:'Commercial scope'},'sales',{id:'rep-1',name:'Test representative'});
  assert.equal(line.price_usd,27580);
  assert.equal(S.lineUnitPrice(line),28580);
  assert.equal(line.selling_price_override.catalog_price_usd,27580);
  assert.equal(line.selling_price_override.catalog_price_unit,'lump_sum');
  assert.equal(line.selling_price_override.actor.id,'rep-1');
  assert.equal(line.selling_price_history[0].previous_price_usd,27580);
  assert.equal(S.totals(b).total,41810);
  const comparison=S.compareRevisions(deal,b,0),priceChange=comparison.changes.find(item=>item.key===line.quote_line_id);
  assert.equal(comparison.totals.delta,1000);assert.equal(priceChange.before.price_usd,27580);assert.equal(priceChange.after.price_usd,28580);assert.ok(priceChange.fields.includes('price_usd'));
  assert.deepEqual(b.working.approvals,{});
  assert.equal(S.requiredReviews(c,b).manager,false);
  assert.equal(JSON.stringify(c),originalCatalog);
  assert.equal(b.revisions[0].totals.total,40810);
});

test('below-catalog override requires Manager review and customer snapshots reveal only the selling amount', () => {
  const {deal,b}=revise(),line=b.working.draft.lines[0],oldIssue=JSON.stringify(b.revisions[0]),oldProposal=JSON.stringify(deal.proposals[0]);
  S.setLinePriceOverride(c,deal,b,line.quote_line_id,{price_usd:27000,reason:'Internal negotiation rationale'},'manager',{id:'manager-1',name:'Test manager'});
  assert.equal(S.requiredReviews(c,b).manager,true);
  assert.equal(S.totals(b).total,40230);
  S.reviewQuote(c,deal,b,'application','sales');
  assert.throws(()=>S.issueQuote(c,deal,b),/Manager approval/);
  S.reviewQuote(c,deal,b,'manager','manager');
  S.issueQuote(c,deal,b);
  assert.throws(()=>S.setLinePriceOverride(c,deal,b,line.quote_line_id,{price_usd:29000,reason:'Late change'},'manager'),/issued/);
  assert.throws(()=>S.clearLinePriceOverride(c,deal,b,line.quote_line_id,{reason:'Late reset'},'sales'),/issued/);
  const published=S.publishProposal(deal),visible=S.publicProposal(deal,published.id).alternatives.find(item=>item.quote_id===b.id),publicLine=visible.lines.find(item=>item.quote_line_id===line.quote_line_id);
  assert.equal(publicLine.price_usd,27000);assert.equal(publicLine.total,27000);assert.equal(visible.totals.total,40230);
  for(const field of ['selling_price_override','selling_price_history','catalog_price_usd','source_line'])assert.equal(publicLine[field],undefined);
  assert.equal(JSON.stringify(visible).includes('Internal negotiation rationale'),false);
  assert.equal(JSON.stringify(b.revisions[0]),oldIssue);assert.equal(JSON.stringify(deal.proposals[0]),oldProposal);
  S.reviseQuote(deal,b,'Restore the standard offer');
  const nextLine=b.working.draft.lines[0];
  S.clearLinePriceOverride(c,deal,b,nextLine.quote_line_id,{reason:'Return to standard catalog offer'},'sales');
  assert.equal(nextLine.selling_price_override,undefined);assert.equal(S.lineUnitPrice(nextLine),27580);assert.equal(nextLine.selling_price_history.at(-1).action,'reset');
  assert.equal(S.totals(b).total,40810);assert.equal(S.requiredReviews(c,b).manager,false);assert.deepEqual(b.working.approvals,{});
  assert.equal(S.publicProposal(deal,published.id).alternatives.find(item=>item.quote_id===b.id).totals.total,40230);
});

test('selling prices multiply quantities and cannot target included, service, engineering or stale catalog lines', () => {
  const {deal,b}=revise();
  const q=S.addQuote(c,deal,{machine_id:'r1275_med',label:'Quantity pricing check'});
  const row=D.getPriceLines(c,q.machine_id).find(item=>item.price_unit==='each'&&S.canOverrideLinePrice(item));
  assert.ok(row);S.selectOption(c,deal,q,row,{quantity:3});
  const line=q.working.draft.lines.find(item=>item.option_id===row.option_id),baseTotal=S.totals(q).total;
  S.setLinePriceOverride(c,deal,q,line.quote_line_id,{price_usd:row.price_usd+25,reason:'Per-item commercial adjustment'},'sales');
  assert.equal(S.totals(q).total,baseTotal+75);
  S.setQuoteQuantity(c,deal,q,line.quote_line_id,4);
  assert.equal(S.totals(q).total,baseTotal+75+row.price_usd+25);
  const includedQuote=S.addQuote(c,deal,{machine_id:'r3200_fulfillment',label:'Included-feature check'}),included=includedQuote.working.draft.included_snapshot[0],service=b.working.draft.lines.find(item=>item.line_class==='service');
  assert.ok(included);assert.equal(S.canOverrideLinePrice(included),false);
  for(const [quote,item] of [[includedQuote,included],[b,service]])assert.throws(()=>S.setLinePriceOverride(c,deal,quote,item.quote_line_id,{price_usd:100,reason:'Unsupported'},'manager'),/standard catalog/);
  assert.equal(S.canOverrideLinePrice({...line,flags:[{kind:'engineering_review'}]}),false);
  assert.equal(S.canOverrideLinePrice({...line,line_class:'manual'}),false);
  const changed={...c,manifest:{...c.manifest,catalog_sha256:'changed'}};
  assert.throws(()=>S.setLinePriceOverride(changed,deal,b,b.working.draft.lines[0].quote_line_id,{price_usd:28000,reason:'Catalog changed'},'manager'),/Reconcile/);
  const injected=D.newDraft(c,'r3200');injected.lines[0].selling_price_override={price_usd:1};
  assert.throws(()=>S.importDraft(c,deal,JSON.stringify(injected)),/authorized selling-price/);
});

test('proposal-first seed has two actual catalog alternatives under one deal', () => {
  const { deal, a, b } = fixture();
  assert.equal(a.revisions[0].revision, 0); assert.equal(b.revisions[0].revision, 0);
  assert.equal(S.totals(a).total, 33060); assert.equal(S.totals(b).total, 40810);
  assert.deepEqual(b.working.draft.lines.filter(x => x.option_id).map(x => x.option_id), ['easy_load_bag_opener', 'seal_flattener_fingers']);
  assert.equal(S.publicProposal(deal).alternatives.length, 2);
  assert.ok(b.revisions[0].draft.catalog_hash);
});

test('new Mercury scenarios append fresh identities without replacing existing work', () => {
  const { state } = fixture(), previous = JSON.stringify(state.deals);
  const first = S.createDemoScenario(c, state), second = S.createDemoScenario(c, state);
  assert.equal(JSON.stringify(state.deals.slice(0, 1)), previous);
  assert.equal(state.deals.length, 3);
  assert.equal(first.number, 'PAC-2026-014');
  assert.equal(second.number, 'PAC-2026-015');
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.quotes[1].id, second.quotes[1].id);
  assert.notEqual(first.proposals[0].id, second.proposals[0].id);
  assert.notEqual(first.customer_responses[0].id, second.customer_responses[0].id);
  for (const deal of [first, second]) {
    assert.equal(deal.demo_scenario, 'pac-mercury-review-v1');
    assert.equal(deal.title, 'Hardware kit bagging');
    assert.equal(deal.customer, 'Northstar Components');
    assert.equal(deal.owner, 'Kyle Xu');
    assert.equal(deal.next_action_date, '2026-11-09');
    assert.equal(deal.quotes[0].number, `${deal.number}-Q01`);
    assert.equal(deal.quotes[1].number, `${deal.number}-Q02`);
    assert.deepEqual(deal.quotes.map(q => S.totals(q).total), [33060, 40810]);
    assert.ok(deal.quotes.every(q => q.working.status === 'issued' && q.revisions.length === 1));
    const request = deal.customer_responses[0], proposal = deal.proposals[0];
    assert.equal(request.status, 'open');
    assert.equal(request.quote_id, deal.quotes[1].id);
    assert.equal(request.revision, 0);
    assert.equal(request.proposal_id, proposal.id);
    assert.deepEqual(request.proposal_revisions, proposal.manifest);
    assert.equal(S.publicProposal(deal, proposal.id).number, deal.number);
  }
});

test('Mercury scenario survives reload and closes the request only when the revised proposal is published', () => {
  let state = { version: 1, deals: [] }, deal = S.createDemoScenario(c, state);
  const originalProposal = JSON.stringify(deal.proposals[0]);
  const originalQuote = JSON.stringify(deal.quotes[1].revisions[0]);
  const requestId = deal.customer_responses[0].id, originalProposalId = deal.proposals[0].id;
  let b = S.reviseFromResponse(deal, requestId);
  S.selectOption(c, deal, b, D.getOption(c, 'r3200', 'spare_parts_kit'));
  assert.equal(S.totals(b).total, 41940);
  assert.equal(deal.customer_responses[0].status, 'in_progress');
  state = S.migrateWorkspace(JSON.parse(JSON.stringify(state)));
  deal = state.deals[0]; b = deal.quotes[1];
  assert.equal(S.reviseFromResponse(deal, requestId), b);
  assert.equal(b.working.customer_response_id, requestId);
  assert.equal(b.working.source_proposal_id, originalProposalId);
  assert.equal(b.working.revision, 1);
  S.reviewQuote(c, deal, b, 'application', 'sales');
  assert.throws(() => S.issueQuote(c, deal, b, 'engineering'), /Sales or Manager/);
  S.issueQuote(c, deal, b, 'sales');
  assert.equal(deal.customer_responses[0].status, 'in_progress');
  const revisedProposal = S.publishProposal(deal);
  assert.equal(revisedProposal.version, 2);
  assert.equal(deal.customer_responses[0].status, 'addressed');
  assert.equal(deal.customer_responses[0].addressed_in_proposal_id, revisedProposal.id);
  assert.deepEqual(S.publicProposal(deal, revisedProposal.id).alternatives.map(a => a.totals.total), [33060, 41940]);
  assert.deepEqual(S.publicProposal(deal, originalProposalId).alternatives.map(a => a.totals.total), [33060, 40810]);
  assert.equal(JSON.stringify(deal.proposals[0]), originalProposal);
  assert.equal(JSON.stringify(b.revisions[0]), originalQuote);
  assert.equal(S.publicProposal(deal, originalProposalId).responses[0].body, 'Please add a spare parts kit to the assisted-loading option.');
});

test('an incomplete or repriced catalog cannot leave a partial demonstration deal', () => {
  const { state } = fixture(), previous = JSON.stringify(state);
  const missingTraining = { ...c, priceLines: c.priceLines.filter(row => !(row.machine_id === 'r3200' && row.line_class === 'service')) };
  assert.throws(() => S.createDemoScenario(missingTraining, state), /requires the R3200 training/);
  assert.equal(JSON.stringify(state), previous);
  const repriced = { ...c, priceLines: c.priceLines.map(row => row.machine_id === 'r3200' && row.option_id === 'spare_parts_kit' ? { ...row, price_usd: 1200 } : row) };
  assert.throws(() => S.createDemoScenario(repriced, state), /prices no longer match/);
  assert.equal(JSON.stringify(state), previous);
});

test('quote number requires a deal and a CRM reference', () => {
  const state = { version: 1, deals: [] };
  const deal = S.createDeal(state, { title: 'New project', customer: 'Illustrative customer', owner: 'Sales' });
  assert.throws(() => S.addQuote(c, deal, { machine_id: 'r3200' }), /CRM deal reference/);
  assert.equal(deal.quotes.length, 0);
  S.updateDeal(deal, { crm_id: 'DEMO-CRM-2' });
  const q = S.addQuote(c, deal, { machine_id: 'r3200', label: 'First alternative' });
  assert.ok(q.number.startsWith(deal.number));
  assert.throws(() => S.updateDeal(deal, { crm_id: '' }), /Keep a CRM/);
  assert.ok(S.blockers(c, deal, q).some(x => x.includes('Application description')));
});

test('an issued revision cannot be edited and an alternative cannot cross deals', () => {
  const { state, deal, b } = fixture();
  assert.throws(() => S.updateDiscount(deal, b, { amount: 5, reason: 'Demo' }), /Create a new revision/);
  const other = S.createDeal(state, { title: 'Other', customer: 'Other customer', owner: 'Sales', crm_id: 'OTHER' });
  assert.throws(() => S.reviseQuote(other, b), /does not belong/);
  assert.throws(() => S.addEvidence(other, { title: 'Wrong deal', quote_id: b.id }), /another quote/);
});

test('catalog draft import preserves configuration and photo but requires fresh deal reviews', () => {
  const { deal } = fixture();
  let saved = D.newDraft(c, 'r3200');
  saved = D.applySelection(saved, D.planSelection(c, saved, D.getOption(c, 'r3200', 'easy_load_bag_opener')));
  saved.requirements.application = 'Original discovery question';
  saved.reference = E.captureReference(c, 'r3200', 'machine');
  const original = JSON.stringify(saved), scope = JSON.stringify(deal.scope);
  const imported = S.importDraft(c, deal, saved, 'C · Discovery configuration');
  assert.equal(S.totals(imported).total, 35330);
  assert.equal(imported.working.imported_from_draft_id, saved.draft_id);
  assert.equal(imported.working.imported_requirements.application, 'Original discovery question');
  assert.equal(JSON.stringify(deal.scope), scope);
  assert.equal(deal.evidence[0].reference.reference_id, saved.reference.reference_id);
  assert.deepEqual(imported.working.approvals, {});
  assert.throws(() => S.issueQuote(c, deal, imported), /Application review/);
  imported.working.draft.requirements.application = 'Independent copy';
  assert.equal(JSON.stringify(saved), original);
});

test('invalid catalog imports are rejected before adding an alternative', () => {
  const { deal } = fixture(), saved = D.newDraft(c, 'r3200');
  const count = deal.quotes.length;
  const old = structuredClone(saved); old.catalog_hash = 'old-hash';
  assert.throws(() => S.importDraft(c, deal, old), /Reconcile/);
  const tampered = structuredClone(saved); tampered.lines[0].price_usd = 1;
  assert.throws(() => S.importDraft(c, deal, tampered), /saved price line/);
  const pending = structuredClone(saved); pending.pending_requests = [{ name: 'Unpriced feature' }];
  assert.throws(() => S.importDraft(c, deal, pending), /pending catalog requests/);
  assert.equal(deal.quotes.length, count);
});

test('catalog dependency survives quote workflow and cannot be removed first', () => {
  const { deal, b } = revise();
  const companion = b.working.draft.lines.find(x => x.option_id === 'seal_flattener_fingers');
  assert.throws(() => S.removeOption(c, deal, b, companion.quote_line_id), /Required by/);
  const wrongMachine = D.getOption(c, 'r1275_med', 'seal_flattener_fingers');
  assert.throws(() => S.selectOption(c, deal, b, wrongMachine), /does not belong/);
  const ambiguous = D.getOption(c, 'r3200', 'sato_305_dpi_printhead_upgrade');
  assert.throws(() => S.selectOption(c, deal, b, ambiguous), /PAC confirmation/);
  assert.equal(S.totals(b).total, 40810);
});

test('Hybrid-only option cannot be selected or issued for a plain R3200', () => {
  const { deal, a } = fixture(); S.reviseQuote(deal, a, 'Check compatibility');
  const row = D.getOption(c, 'r3200', 'adjustable_hole_punch');
  assert.throws(() => S.selectOption(c, deal, a, row), /Hybrid models only.*not confirmed/);
  assert.ok(!a.working.draft.lines.some(line => line.option_id === row.option_id));
  // A legacy saved draft from the previous implementation must also be blocked.
  a.working.draft = D.applySelection(a.working.draft, D.planSelection(c, a.working.draft, row));
  const line = a.working.draft.lines.find(line => line.option_id === row.option_id);
  line.flags = []; // Removing the local warning cannot bypass the source restriction.
  assert.ok(S.blockers(c, deal, a).some(reason => reason.includes('Hybrid models only')));
  assert.throws(() => S.reviewQuote(c, deal, a, 'application', 'sales'), /Hybrid models only/);
  assert.throws(() => S.issueQuote(c, deal, a), /Hybrid models only/);
  assert.throws(() => S.importDraft(c, deal, a.working.draft), /Hybrid models only/);
});

test('source-confirmed Hybrid model may quote the Hybrid-only option', () => {
  const { deal } = fixture();
  const q = S.addQuote(c, deal, { machine_id: 'r3200_hs_hybrid', label: 'Hybrid alternative' });
  const row = D.getOption(c, q.machine_id, 'adjustable_hole_punch');
  assert.deepEqual(S.catalogRestrictions(c, q.machine_id, row), []);
  S.selectOption(c, deal, q, row); approve(deal, q); S.issueQuote(c, deal, q);
  S.publishProposal(deal);
  const item = S.publicProposal(deal).alternatives.find(alt => alt.quote_id === q.id).lines.find(line => line.option_id === row.option_id);
  assert.deepEqual(item.conditions, ['Hybrid models only']);
});

test('unrecognized model restrictions remain blocked rather than guessed from model names', () => {
  const row = { ...D.getOption(c, 'r3200', 'foot_switch'), flags: [{ kind: 'models_only', evidence: 'Validated configurations only' }] };
  const restrictions = S.catalogRestrictions(c, 'r3200', row);
  assert.equal(restrictions.length, 1);
  assert.match(restrictions[0], /PAC confirmation is required/);
});

test('source option lead-time conditions survive issued customer projection', () => {
  const { deal } = fixture();
  const q = S.addQuote(c, deal, { machine_id: 'r1285_med', label: 'Medical printing alternative' });
  const row = D.getOption(c, q.machine_id, '406_dpi_print_resolution');
  S.selectOption(c, deal, q, row); approve(deal, q); S.issueQuote(c, deal, q);
  S.publishProposal(deal);
  const alt = S.publicProposal(deal).alternatives.find(item => item.quote_id === q.id);
  const line = alt.lines.find(item => item.option_id === row.option_id);
  assert.deepEqual(line.lead_time_notes, ['adds 2-3 weeks to lead time']);
  assert.ok(line.conditions.includes('adds 2-3 weeks to lead time'));
  assert.ok(line.review_reasons.includes('adds 2-3 weeks to lead time'));
  assert.ok(alt.lead_time_notes.some(note => note.includes('406 dpi') && note.includes('adds 2-3 weeks')));
  assert.equal(line.flags.find(flag => flag.kind === 'lead_time').evidence, 'adds 2-3 weeks to lead time');
  assert.ok(!JSON.stringify(line.flags).includes('evidence_line_id'));
});

test('engineering customization cannot become detached from its selected option', () => {
  const { deal, b } = revise();
  const item = S.saveEngineering(deal, b, { description: 'Adapt assisted loading', reason: 'Different kit shape', option_id: 'easy_load_bag_opener' }, 'sales');
  const option = b.working.draft.lines.find(line => line.option_id === 'easy_load_bag_opener');
  assert.throws(() => S.removeOption(c, deal, b, option.quote_line_id), /engineering requirement attached/);
  S.removeEngineering(deal, b, item.id);
  S.removeOption(c, deal, b, option.quote_line_id);
  assert.ok(!b.working.draft.lines.some(line => line.option_id === 'easy_load_bag_opener'));
});

test('sales can request engineering but cannot price it or approve engineering', () => {
  const { deal, b } = revise();
  const item = S.saveEngineering(deal, b, { description: 'Loading guide', reason: 'Support mixed kits' }, 'sales');
  assert.equal(item.hours, null); assert.equal(S.totals(b).pending, 1);
  assert.equal(S.totals(b).total, 40810);
  assert.throws(() => S.issueQuote(c, deal, b), /pricing is incomplete/);
  assert.throws(() => S.saveEngineering(deal, b, { ...item, hours: 4, materials: 250 }, 'sales'), /Engineering or Manager/);
  assert.throws(() => S.reviewQuote(c, deal, b, 'engineering', 'sales'), /Engineering or Manager access/);
  S.saveEngineering(deal, b, { ...item, hours: 4, materials: 250 }, 'engineering');
  assert.equal(S.totals(b).engineering, 850);
  S.saveEngineering(deal, b, { id: item.id, description: 'Updated loading guide', reason: 'Keep kits aligned' }, 'sales');
  assert.equal(S.totals(b).engineering, 850);
});

test('one configurable assumed labor rate is applied and rejects invalid money', () => {
  const { deal, b } = revise(); engineering(deal, b);
  assert.equal(S.totals(b).engineering, 850);
  S.setLaborRate(deal, b, 200, 'engineering');
  assert.equal(S.totals(b).engineering, 1050);
  for (const invalid of [-1, Infinity, NaN, '', null]) assert.throws(() => S.setLaborRate(deal, b, invalid, 'engineering'), /finite, nonnegative/);
  assert.throws(() => S.setLaborRate(deal, b, 150, 'sales'), /Only the Engineering/);
  assert.throws(() => S.saveEngineering(deal, b, { description: 'Change', reason: 'Test', hours: -1, materials: 1 }, 'engineering'), /Labor hours/);
  assert.throws(() => S.saveEngineering(deal, b, { description: 'Change', reason: '', hours: 1, materials: 1 }, 'engineering'), /Why the change/);
});

test('reviews bind to exact commercial content and scope, including direct changes', () => {
  const { deal, b } = revise(); engineering(deal, b); approve(deal, b);
  assert.deepEqual(S.blockers(c, deal, b), []);
  S.updateScope(deal, { throughput: '30 bags/min' });
  assert.ok(S.blockers(c, deal, b).some(x => x.includes('Application review')));
  assert.ok(S.blockers(c, deal, b).some(x => x.includes('Engineering approval')));
  approve(deal, b);
  // Even a bypassing in-memory edit cannot reuse an approval's content fingerprint.
  b.working.engineering[0].materials += 1;
  assert.ok(S.blockers(c, deal, b).some(x => x.includes('Engineering approval')));
});

test('discount and special-order lead time need Manager approval', () => {
  const { deal, b } = revise();
  assert.throws(() => S.saveSpecial(deal, b, { description: 'Special finish', price: 300, lead_time: '' }), /lead time/);
  S.saveSpecial(deal, b, { description: 'Special finish', price: 300, lead_time: 'Adds 2 weeks; PAC confirmation required' });
  S.updateDiscount(deal, b, { amount: 100, reason: 'Demonstration commercial adjustment' });
  assert.equal(S.totals(b).total, 41010);
  S.reviewQuote(c, deal, b, 'application', 'sales');
  assert.throws(() => S.issueQuote(c, deal, b), /Manager approval/);
  assert.throws(() => S.reviewQuote(c, deal, b, 'manager', 'sales'), /Manager access/);
  S.reviewQuote(c, deal, b, 'manager', 'manager');
  S.issueQuote(c, deal, b, 'manager');
  S.publishProposal(deal);
  const alt = S.publicProposal(deal).alternatives[1];
  assert.equal(alt.special[0].lead_time, 'Adds 2 weeks; PAC confirmation required');
  assert.equal(alt.totals.total, 41010);
});

test('Rev 1 preserves Rev 0 exactly and draft edits stay out of proposal', () => {
  const { deal, b } = fixture(), original = JSON.stringify(b.revisions[0]);
  S.reviseQuote(deal, b, 'Change requested'); engineering(deal, b);
  assert.equal(S.publicProposal(deal).alternatives[1].totals.total, 40810);
  assert.equal(S.publicProposal(deal).alternatives[1].revision, 0);
  approve(deal, b); S.issueQuote(c, deal, b);
  assert.equal(JSON.stringify(b.revisions[0]), original);
  assert.equal(S.publicProposal(deal).alternatives[1].revision, 0, 'quote issue must not replace the published proposal');
  S.publishProposal(deal);
  assert.equal(S.publicProposal(deal).alternatives[1].revision, 1);
  assert.equal(S.publicProposal(deal).alternatives[1].totals.total, 41660);
  assert.equal(b.revisions.length, 2);
  assert.throws(() => { b.revisions[0].draft.lines[0].price_usd = 1; }, TypeError);
});

test('customer projection excludes pricing internals, approvals and internal comments', () => {
  const { deal, b } = revise(); engineering(deal, b); approve(deal, b); S.issueQuote(c, deal, b);
  S.publishProposal(deal);
  S.addComment(deal, { body: 'Internal negotiation note', author: 'Sales', quote_id: b.id, revision: 1, visibility: 'internal' });
  S.addComment(deal, { body: 'Please explain the guide', author: 'Customer', quote_id: b.id, revision: 1 });
  const output = JSON.stringify(S.publicProposal(deal));
  for (const value of ['"hours"', '"materials"', '"labor_rate"', '"approvals"', '"fingerprint"', 'Internal negotiation note', 'Keep mixed kits aligned']) assert.ok(!output.includes(value), value);
  assert.ok(output.includes('Please explain the guide'));
  assert.ok(output.includes('"price":850'));
});

test('customer comments bind to issued revision and remain after next issue', () => {
  const { deal, b } = revise();
  assert.throws(() => S.addComment(deal, { body: 'Draft?', quote_id: b.id, revision: 1 }), /issued revision/);
  const comment = S.addComment(deal, { body: 'Review original option', quote_id: b.id, revision: 0 });
  approve(deal, b); S.issueQuote(c, deal, b);
  assert.equal(comment.revision, 0);
  assert.equal(S.publicProposal(deal).comments.find(x => x.id === comment.id).revision, 0);
  assert.throws(() => S.addComment(deal, { body: '', quote_id: b.id, revision: 1 }), /Comment is required/);
});

test('customer preference stays on the proposal it reviewed and is not inherited by a new proposal', () => {
  const { deal, a, b } = fixture();
  const v1 = deal.proposals[0].id;
  S.chooseAlternative(deal, b.id);
  assert.equal(deal.selected_quote_revision, 0);
  S.reviseQuote(deal, a, 'Different alternative changes'); approve(deal, a); S.issueQuote(c, deal, a);
  assert.equal(S.publicProposal(deal).selected_quote_id, b.id);
  S.reviseQuote(deal, b, 'Preferred alternative needs engineering'); engineering(deal, b);
  assert.equal(S.publicProposal(deal).selected_quote_id, b.id);
  assert.equal(S.publicProposal(deal).selected_quote_revision, 0);
  approve(deal, b); S.issueQuote(c, deal, b);
  assert.equal(deal.selected_quote_id, null);
  assert.equal(S.publicProposal(deal, v1).selected_quote_id, b.id);
  assert.equal(S.publicProposal(deal, v1).selected_quote_revision, 0);
  assert.ok(deal.activity.some(item => /Customer preference.*cleared/.test(item.message)));
  S.publishProposal(deal);
  assert.equal(S.publicProposal(deal).selected_quote_id, null);
  S.chooseAlternative(deal, b.id);
  assert.equal(S.publicProposal(deal).selected_quote_revision, 1);
  assert.equal(S.publicProposal(deal, v1).selected_quote_revision, 0);
});

test('Explorer evidence stays in one deal and snapshots follow the reviewed revision', () => {
  const { deal, b } = revise(); approve(deal, b);
  const input = { type: 'explorer', deal_id: deal.id, quote_id: b.id, title: 'Connecting rod · saved view', model_id: 'kinetic-01', model_revision: 'sha256:demo-model', part_id: 'rod', part_label: 'Connecting rod', reference: { camera: { position: [1, 2, 3] }, component: 'rod' } };
  const saved = S.addEvidence(deal, input);
  input.reference.camera.position[0] = 99;
  assert.equal(saved.reference.camera.position[0], 1);
  assert.equal(S.publicProposal(deal).evidence.length, 0);
  assert.ok(S.blockers(c, deal, b).some(x => x.includes('Application review')));
  approve(deal, b); S.issueQuote(c, deal, b);
  S.publishProposal(deal);
  assert.equal(S.publicProposal(deal).alternatives[1].evidence[0].id, saved.id);
  assert.equal(S.publicProposal(deal).alternatives[0].evidence.length, 0);
  assert.equal(S.publicProposal(deal).evidence[0].source_label, 'Reference assembly — not PAC CAD');
  assert.throws(() => S.addEvidence(deal, { ...input, deal_id: 'different' }), /another deal/);
  assert.throws(() => S.addEvidence(deal, saved), /already attached/);
});

test('browser JSON reload retains alternatives, approvals, evidence, comments and next action', () => {
  const { state, deal, b } = revise(); engineering(deal, b); approve(deal, b);
  S.updateDeal(deal, { next_action: 'Review custom loading guide', status: 'review', owner: 'Demo sales owner' });
  const restored = JSON.parse(JSON.stringify(state));
  const d = S.findDeal(restored, deal.id), q = S.findQuote(d, b.id);
  assert.deepEqual(S.blockers(c, d, q), []);
  S.issueQuote(c, d, q);
  S.publishProposal(d);
  S.chooseAlternative(d, q.id);
  assert.equal(d.next_action, 'Review custom loading guide');
  assert.equal(d.selected_quote_id, b.id);
  assert.equal(d.quotes.length, 2); assert.equal(q.revisions.length, 2);
  assert.equal(q.revisions[0].totals.total, 40810); assert.equal(q.revisions[1].totals.total, 41660);
  assert.equal(state.deals[0].quotes[1].revisions.length, 1);
});

test('catalog changes and missing mandatory information prevent issue', () => {
  const { deal, b } = revise(); approve(deal, b);
  const updatedCatalog = { ...c, manifest: { ...c.manifest, catalog_sha256: 'new catalog' } };
  assert.throws(() => S.issueQuote(updatedCatalog, deal, b), /Catalog changed/);
  S.updateScope(deal, { bag_dimensions: '' });
  assert.throws(() => S.reviewQuote(c, deal, b, 'application', 'sales'), /bag dimensions/);
});

test('published proposal V1 stays byte-identical while quote revisions and V2 are issued', () => {
  const { deal, b } = fixture(), v1 = deal.proposals[0], original = JSON.stringify(v1);
  S.reviseQuote(deal, b, 'Request a guide'); engineering(deal, b); approve(deal, b);
  S.issueQuote(c, deal, b);
  assert.equal(deal.proposals.length, 1);
  assert.equal(S.publicProposal(deal).proposal_id, v1.id);
  assert.equal(S.publicProposal(deal, v1.id).alternatives[1].totals.total, 40810);
  const v2 = S.publishProposal(deal);
  assert.equal(v2.version, 2);
  assert.notEqual(v1.id, v2.id);
  assert.equal(JSON.stringify(v1), original);
  assert.deepEqual(v1.manifest.map(ref => ref.revision), [0, 0]);
  assert.deepEqual(v2.manifest.map(ref => ref.revision), [0, 1]);
  assert.equal(S.publicProposal(deal, v2.id).alternatives[1].totals.total, 41660);
  assert.equal(S.publicProposal(deal, v1.id).alternatives[1].totals.total, 40810);
  assert.equal(S.publishProposal(deal), v2, 'repeat publication must not create duplicate versions');
  assert.equal(deal.proposals.length, 2);
  assert.throws(() => { v1.snapshot.alternatives[1].totals.total = 1; }, TypeError);
  const customerCopy = S.publicProposal(deal, v1.id);
  customerCopy.alternatives[1].totals.total = 1;
  assert.equal(S.publicProposal(deal, v1.id).alternatives[1].totals.total, 40810);
  assert.throws(() => S.publicProposal(deal, 'missing-proposal'), /does not belong/);
});

test('new deals have no implicit proposal and cannot publish unissued work', () => {
  const state = { version: 1, deals: [] }, deal = S.createDeal(state, { title: 'New application', customer: 'Demo buyer', crm_id: 'DEMO-NEW' });
  S.addQuote(c, deal, { machine_id: 'r3200' });
  assert.deepEqual(S.publicProposal(deal).alternatives, []);
  assert.equal(S.publicProposal(deal).proposal_id, null);
  assert.throws(() => S.publicProposal(deal, 'old'), /does not belong/);
  assert.throws(() => S.publishProposal(deal), /Issue at least one/);
  assert.equal(deal.proposals.length, 0);
});

test('customer decision details are frozen and can be deliberately republished without repricing', () => {
  const { deal } = fixture(), v1 = deal.proposals[0], old = S.publicProposal(deal, v1.id);
  S.updateDeal(deal, { owner: 'New demo owner', customer_next_decision: 'Review the revised application', customer_decision_date: '2026-11-16' });
  assert.equal(S.publicProposal(deal, v1.id).owner, old.owner);
  assert.equal(S.publicProposal(deal, v1.id).customer_next_decision, old.customer_next_decision);
  assert.equal(S.publicProposal(deal, v1.id).customer_decision_date, old.customer_decision_date);
  const v2 = S.publishProposal(deal);
  assert.equal(v2.version, 2);
  assert.deepEqual(v2.manifest, v1.manifest);
  assert.equal(S.publicProposal(deal, v2.id).owner, 'New demo owner');
  assert.equal(S.publicProposal(deal, v2.id).customer_decision_date, '2026-11-16');
  assert.equal(S.publishProposal(deal).id, v2.id);
});

test('migration preserves old work and unattributed comments without inventing historical proposal versions', () => {
  const { state, deal, b } = fixture();
  S.reviseQuote(deal, b, 'Legacy quote revision'); approve(deal, b); S.issueQuote(c, deal, b);
  const legacy = JSON.parse(JSON.stringify(state)), old = legacy.deals[0];
  delete old.proposals; delete old.customer_responses; delete old.proposal_selections;
  old.comments.forEach(comment => { delete comment.proposal_id; });
  old.selected_quote_id = b.id; old.selected_quote_revision = 0;
  const before = JSON.stringify(legacy), originalComment = JSON.stringify(old.comments[0]);
  const migrated = S.migrateWorkspace(legacy), restored = migrated.deals[0];
  assert.equal(JSON.stringify(legacy), before, 'migration must not mutate its source');
  assert.equal(restored.proposals.length, 1);
  assert.equal(restored.proposals[0].origin, 'legacy_import');
  assert.deepEqual(restored.proposals[0].manifest.map(ref => ref.revision), [0, 1]);
  assert.equal(JSON.stringify(restored.comments[0]), originalComment);
  assert.equal(S.publicProposal(restored).comments.length, 0, 'unattributed old comments stay in seller history');
  assert.equal(S.publicProposal(restored).selected_quote_id, null, 'old preference cannot accept a newer quote');
  assert.equal(restored.selected_quote_revision, 0, 'preserve legacy metadata for seller history');
  assert.equal(JSON.stringify(S.migrateWorkspace(migrated)), JSON.stringify(migrated));
  assert.throws(() => { restored.quotes[1].revisions[0].draft.lines[0].price_usd = 1; }, TypeError);
  assert.throws(() => { restored.proposals[0].manifest[0].revision = 99; }, TypeError);
  assert.throws(() => { restored.comments[0].body = 'overwrite'; }, TypeError);
});

test('reload preserves explicit proposals and customer discussion identities', () => {
  const { state, deal, b } = fixture(), v1 = deal.proposals[0];
  const response = S.recordCustomerResponse(deal, { proposal_id: v1.id, quote_id: b.id, kind: 'changes_requested', body: 'Add a custom guide', author: 'Demo buyer' });
  S.reviseFromResponse(deal, response.id);
  engineering(deal, b); approve(deal, b); S.issueQuote(c, deal, b); S.publishProposal(deal);
  const before = JSON.stringify(state), reloaded = S.migrateWorkspace(JSON.parse(before)), d = reloaded.deals[0];
  assert.deepEqual(d.proposals, deal.proposals);
  assert.deepEqual(d.customer_responses, deal.customer_responses);
  assert.equal(S.publicProposal(d, v1.id).responses[0].body, 'Add a custom guide');
  assert.equal(S.publicProposal(d).responses.length, 0);
  assert.equal(d.customer_responses[0].addressed_in_proposal_id, d.proposals[1].id);
  assert.throws(() => { d.customer_responses[0].body = 'changed'; }, TypeError);
});

test('customer change request connects exact original proposal to its revised quote and new proposal', () => {
  const { deal, b } = fixture(), v1 = deal.proposals[0];
  const response = S.recordCustomerResponse(deal, { proposal_id: v1.id, quote_id: b.id, kind: 'changes_requested', body: 'Add a guide while retaining the other equipment.', author: 'Demo buyer', owner: 'Internal sales owner' });
  const original = { body: response.body, proposal_id: response.proposal_id, revision: response.revision, at: response.at };
  assert.equal(response.status, 'open');
  const revised = S.reviseFromResponse(deal, response.id);
  assert.equal(revised.id, b.id);
  assert.equal(revised.working.customer_response_id, response.id);
  assert.equal(revised.working.source_proposal_id, v1.id);
  assert.equal(revised.working.revision, 1);
  assert.equal(deal.customer_responses[0].status, 'in_progress');
  assert.equal(S.reviseFromResponse(deal, response.id), revised, 'repeat start returns the existing linked draft');
  assert.equal(deal.customer_responses[0].revision_links.length, 1);
  const beforeUnchangedPublication = S.publishProposal(deal);
  assert.equal(beforeUnchangedPublication.id, v1.id);
  assert.equal(deal.customer_responses[0].status, 'in_progress');
  engineering(deal, b); approve(deal, b); S.issueQuote(c, deal, b);
  assert.equal(deal.customer_responses[0].status, 'in_progress', 'quote issue alone does not address customer proposal');
  const v2 = S.publishProposal(deal), addressed = deal.customer_responses[0];
  assert.equal(addressed.status, 'addressed');
  assert.equal(addressed.addressed_in_proposal_id, v2.id);
  for (const [key, value] of Object.entries(original)) assert.equal(addressed[key], value);
  assert.deepEqual(addressed.revision_links, [{ quote_id: b.id, revision: 1, based_on_revision: 0 }]);
  const publicRequest = S.publicProposal(deal, v1.id).responses[0];
  assert.equal(publicRequest.addressed_in_proposal_id, v2.id);
  assert.ok(!('owner' in publicRequest));
  assert.equal(S.publicProposal(deal, v2.id).responses.length, 0);
  assert.throws(() => S.reviseFromResponse(deal, response.id), /already has a revised proposal/);
});

test('a request-linked issued revision must be published before another revision can bypass it', () => {
  const { deal, b } = fixture(), v1 = deal.proposals[0];
  const response = S.recordCustomerResponse(deal, { proposal_id: v1.id, quote_id: b.id, kind: 'changes_requested', body: 'Revise the loading guide' });
  S.reviseFromResponse(deal, response.id);
  engineering(deal, b); approve(deal, b); S.issueQuote(c, deal, b);
  const before = JSON.stringify(deal);
  assert.throws(() => S.reviseQuote(deal, b, 'A second change before publication'), /Publish the issued revision linked to this customer request/);
  assert.equal(JSON.stringify(deal), before, 'the rejected revision must not mutate the deal or request');
  assert.equal(b.working.revision, 1);
  assert.equal(deal.customer_responses[0].status, 'in_progress');
  const v2 = S.publishProposal(deal);
  assert.equal(v2.manifest.find(ref => ref.quote_id === b.id).revision, 1);
  assert.equal(deal.customer_responses[0].status, 'addressed');
  assert.equal(deal.customer_responses[0].addressed_in_proposal_id, v2.id);
  S.reviseQuote(deal, b, 'A later change after publication');
  assert.equal(b.working.revision, 2);
  assert.equal(b.working.status, 'draft');
  assert.equal(deal.customer_responses[0].addressed_in_proposal_id, v2.id);
});

test('response validation rejects foreign proposal, stale basis and unintended alternatives before mutation', () => {
  const { state, deal, a, b } = fixture(), v1 = deal.proposals[0];
  const other = S.createDeal(state, { title: 'Other', customer: 'Other demo customer', crm_id: 'OTHER' });
  assert.throws(() => S.recordCustomerResponse(other, { proposal_id: v1.id, kind: 'question', body: 'Question' }), /does not belong/);
  assert.throws(() => S.recordCustomerResponse(deal, { proposal_id: v1.id, quote_id: 'missing', kind: 'question', body: 'Question' }), /included/);
  assert.throws(() => S.recordCustomerResponse(deal, { proposal_id: v1.id, quote_id: b.id, revision: 99, kind: 'question', body: 'Question' }), /revision shown/);
  assert.throws(() => S.recordCustomerResponse(deal, { proposal_id: v1.id, kind: 'approve', body: 'Question' }), /question or a change/);
  assert.throws(() => S.recordCustomerResponse(deal, { proposal_id: v1.id, kind: 'question', body: '  ' }), /required/);
  assert.equal(deal.customer_responses.length, 0);
  const question = S.recordCustomerResponse(deal, { proposal_id: v1.id, kind: 'question', body: 'How is the machine loaded?' });
  assert.throws(() => S.reviseFromResponse(deal, question.id, b.id), /question does not request/);
  const request = S.recordCustomerResponse(deal, { proposal_id: v1.id, quote_id: b.id, kind: 'changes_requested', body: 'Change the guide' });
  assert.throws(() => S.reviseFromResponse(deal, request.id, a.id), /alternative named/);
  S.reviseQuote(deal, b, 'Another change was already issued'); approve(deal, b); S.issueQuote(c, deal, b);
  const before = JSON.stringify(deal);
  assert.throws(() => S.reviseFromResponse(deal, request.id), /earlier quote revision/);
  assert.equal(JSON.stringify(deal), before);
});

test('general requests require an explicit included alternative and do not overwrite another draft', () => {
  const { deal, b } = fixture(), proposal = deal.proposals[0];
  const request = S.recordCustomerResponse(deal, { proposal_id: proposal.id, kind: 'changes_requested', body: 'Clarify the configuration' });
  assert.throws(() => S.reviseFromResponse(deal, request.id), /Choose an alternative/);
  S.reviseQuote(deal, b, 'An unrelated draft');
  const before = JSON.stringify(deal);
  assert.throws(() => S.reviseFromResponse(deal, request.id, b.id), /Finish the current draft/);
  assert.equal(JSON.stringify(deal), before);
});

test('customer comments and preferences retain their displayed proposal basis', () => {
  const { deal, b } = fixture(), v1 = deal.proposals[0];
  S.reviseQuote(deal, b, 'New configuration'); approve(deal, b); S.issueQuote(c, deal, b);
  const v2 = S.publishProposal(deal);
  const comment = S.addComment(deal, { proposal_id: v1.id, quote_id: b.id, revision: 0, body: 'This refers to the original version.' });
  assert.equal(comment.proposal_id, v1.id);
  assert.ok(S.publicProposal(deal, v1.id).comments.some(item => item.id === comment.id));
  assert.ok(!S.publicProposal(deal, v2.id).comments.some(item => item.id === comment.id));
  assert.throws(() => S.addComment(deal, { proposal_id: v1.id, quote_id: b.id, revision: 1, body: 'Wrong version' }), /revision in this proposal/);
  S.chooseAlternative(deal, b.id, v1.id);
  assert.equal(S.publicProposal(deal, v1.id).selected_quote_revision, 0);
  assert.equal(S.publicProposal(deal, v2.id).selected_quote_id, null);
});

test('retained legacy comment can recover its old quote basis without inventing a proposal version', () => {
  const { state, deal, b } = fixture();
  S.reviseQuote(deal, b, 'A newer legacy revision'); approve(deal, b); S.issueQuote(c, deal, b);
  const legacy = JSON.parse(JSON.stringify(state));
  delete legacy.deals[0].proposals;
  const restored = S.migrateWorkspace(legacy).deals[0], imported = restored.proposals[0];
  assert.equal(imported.manifest.find(ref => ref.quote_id === b.id).revision, 1);
  assert.throws(() => S.addComment(restored, { quote_id: b.id, revision: 0, body: 'Retained question about the original guide' }), /Publish this issued revision/);
  const comment = S.recoverLegacyComment(restored, { quote_id: b.id, revision: '0', body: 'Retained question about the original guide', author: 'Demo buyer' });
  assert.equal(comment.quote_id, b.id);
  assert.equal(comment.revision, 0);
  assert.equal(comment.proposal_id, null);
  assert.equal(comment.origin, 'recovered_legacy_draft');
  assert.deepEqual(comment.proposal_revisions, [{ quote_id: b.id, revision: 0 }]);
  assert.equal(restored.comments.at(-1), comment);
  assert.equal(restored.proposals.length, 1);
  assert.ok(!S.publicProposal(restored, imported.id).comments.some(item => item.id === comment.id));
  assert.throws(() => { comment.body = 'Changed'; }, TypeError);
  assert.throws(() => { comment.proposal_revisions[0].revision = 1; }, TypeError);
  assert.equal(S.migrateWorkspace({ version: 1, deals: [restored] }).deals[0].comments.at(-1).body, comment.body);
});

test('legacy comment recovery rejects missing, foreign, draft and invalid quote references without mutation', () => {
  const { deal, b } = revise(), before = JSON.stringify(deal);
  for (const input of [
    { revision: 0, body: 'Question' },
    { quote_id: 'other-deal-quote', revision: 0, body: 'Question' },
    { quote_id: b.id, revision: 1, body: 'Draft question' },
    { quote_id: b.id, revision: '', body: 'Question' },
    { quote_id: b.id, revision: 0.5, body: 'Question' },
    { quote_id: b.id, revision: 0, body: '' },
    { quote_id: b.id, revision: 0, body: 'a'.repeat(10001) },
  ]) assert.throws(() => S.recoverLegacyComment(deal, input));
  assert.equal(JSON.stringify(deal), before);
});

test('proposal composition publishes chosen alternatives and exact historical issued revisions', () => {
  const { deal, a, b } = revise();
  const original = JSON.stringify(deal.proposals[0]);
  S.selectOption(c, deal, b, D.getOption(c, 'r3200', 'spare_parts_kit'));
  approve(deal, b); S.issueQuote(c, deal, b);
  const selected = [{ quote_id: b.id, revision: 0 }];
  const composed = S.publishProposal(deal, selected);
  assert.equal(composed.snapshot.alternatives.length, 1);
  assert.equal(composed.snapshot.alternatives[0].totals.total, 40810);
  assert.equal(S.publishProposal(deal, selected), composed);
  const newest = S.publishProposal(deal, [{ quote_id: b.id, revision: 1 }, { quote_id: a.id, revision: 0 }]);
  assert.deepEqual(newest.manifest.map(item => item.quote_id), [b.id, a.id]);
  assert.deepEqual(newest.snapshot.alternatives.map(item => item.totals.total), [41940, 33060]);
  assert.equal(JSON.stringify(deal.proposals[0]), original);
  selected[0].revision = 999;
  assert.equal(composed.manifest[0].revision, 0, 'caller selection cannot mutate a published manifest');
});

test('proposal composition rejects duplicate, foreign, empty and unissued selections atomically', () => {
  const { deal, b } = revise(), before = JSON.stringify(deal);
  for (const selection of [[], null, {}, [{ quote_id: b.id, revision: 1 }], [{ quote_id: 'foreign', revision: 0 }], [{ quote_id: b.id, revision: '0' }], [{ quote_id: b.id, revision: 0 }, { quote_id: b.id, revision: 0 }]]) {
    assert.throws(() => S.publishProposal(deal, selection));
    assert.equal(JSON.stringify(deal), before);
  }
});

test('a customer request is addressed only when its revised alternative is explicitly published', () => {
  const { deal, a, b } = fixture();
  const response = S.recordCustomerResponse(deal, { proposal_id: deal.proposals[0].id, quote_id: b.id, kind: 'changes_requested', body: 'Add spares.' });
  S.reviseFromResponse(deal, response.id);
  S.selectOption(c, deal, b, D.getOption(c, 'r3200', 'spare_parts_kit'));
  approve(deal, b); S.issueQuote(c, deal, b);
  S.publishProposal(deal, [{ quote_id: a.id, revision: 0 }]);
  assert.equal(deal.customer_responses[0].status, 'in_progress');
  const v3 = S.publishProposal(deal, [{ quote_id: b.id, revision: 1 }]);
  assert.equal(deal.customer_responses[0].addressed_in_proposal_id, v3.id);
});

test('issue and publish do not fabricate a presentation event', () => {
  const { deal, b } = revise();
  const issuer = { id: 'sales-user', name: 'Sales representative' };
  S.reviewQuote(c, deal, b, 'application', 'sales', issuer);
  assert.equal(b.working.approvals.application.simulated, false);
  assert.deepEqual(b.working.approvals.application.actor, { ...issuer, role: 'sales' });
  S.issueQuote(c, deal, b, 'sales', issuer);
  assert.equal(deal.status, 'quoted');
  assert.equal(b.revisions.at(-1).issued_by_actor.id, issuer.id);
  const proposal = S.publishProposal(deal);
  assert.equal(deal.status, 'quoted');
  assert.throws(() => S.markProposalPresented(deal, proposal.id, { actor: 'Engineering', role: 'engineering' }), /Sales or Manager/);
  assert.throws(() => S.markProposalPresented(deal, 'other-proposal', { actor: issuer.name }), /does not belong/);
  const event = S.markProposalPresented(deal, proposal.id, { actor: issuer.name, role: 'sales' });
  assert.equal(deal.status, 'presented');
  assert.equal(event.proposal_id, proposal.id);
  assert.equal(deal.proposal_presentations[0].author, issuer.name);
  assert.ok(Object.isFrozen(event));
});

test('revision comparison includes removals, engineering, terms, scope and pending estimates', () => {
  const { deal, b } = revise();
  const opener = b.working.draft.lines.find(line => line.option_id === 'easy_load_bag_opener');
  S.removeOption(c, deal, b, opener.quote_line_id);
  const requirement = S.saveEngineering(deal, b, { description: 'Custom guide', reason: 'Narrow kit' });
  S.saveSpecial(deal, b, { description: 'Extended support', price: 300, lead_time: 'Two additional weeks' });
  S.updateScope(deal, { notes: 'Confirmed bag material.' });
  b.working.draft.terms_snapshot.delivery = { text: 'Confirm production slot.' };
  const diff = S.compareRevisions(deal, b, 0);
  assert.equal(diff.has_changes, true);
  assert.ok(diff.changes.some(item => item.key === opener.quote_line_id && item.kind === 'removed'));
  for (const section of ['engineering', 'special_orders', 'application', 'commercial']) assert.ok(diff.changes.some(item => item.section === section));
  assert.equal(diff.totals.delta, null, 'a pending estimate cannot appear as a complete price change');
  S.saveEngineering(deal, b, { ...requirement, hours: 2, materials: 50 }, 'engineering');
  assert.equal(S.compareRevisions(deal, b, 0).totals.delta, S.totals(b).total - 40810);
  assert.equal(S.compareRevisions(deal, b, 0, 0).has_changes, false);
  assert.throws(() => S.compareRevisions(deal, b, 99), /does not belong/);
});

test('revision comparison identifies quantity and amount changes on a catalog per-item option', () => {
  const { deal } = fixture();
  const quote = S.addQuote(c, deal, { machine_id: 'r1275_med', label: 'Medical alternative' });
  const row = D.getOption(c, 'r1275_med', 'sorting_table_dividers');
  S.selectOption(c, deal, quote, row);
  approve(deal, quote); S.issueQuote(c, deal, quote);
  S.reviseQuote(deal, quote, 'Add a second divider');
  const line = quote.working.draft.lines.find(item => item.option_id === row.option_id);
  S.setQuoteQuantity(c, deal, quote, line.quote_line_id, 2);
  const diff = S.compareRevisions(deal, quote, 0);
  assert.ok(diff.changes.some(item => item.key === line.quote_line_id && item.fields.includes('quantity')));
  assert.equal(diff.totals.delta, row.price_usd);
});

test('duplicate and rename preserve original published history and require new reviews', () => {
  const { deal, b } = fixture(), historical = JSON.stringify(deal.proposals[0]);
  const copied = S.duplicateQuote(c, deal, b, { label: 'Alternative C' });
  assert.equal(copied.working.status, 'draft');
  assert.equal(copied.working.revision, 0);
  assert.equal(copied.revisions.length, 0);
  assert.deepEqual(copied.working.approvals, {});
  assert.equal(S.totals(copied).total, 40810);
  assert.notEqual(copied.working.draft.draft_id, b.working.draft.draft_id);
  assert.notEqual(copied.working.draft.lines[0].quote_line_id, b.working.draft.lines[0].quote_line_id);
  assert.ok(S.blockers(c, deal, copied).some(item => item.includes('Application review')));
  S.reviewQuote(c, deal, copied, 'application', 'sales');
  S.renameQuote(deal, copied, 'Reviewed loading alternative');
  assert.deepEqual(copied.working.approvals, {});
  S.renameQuote(deal, b, 'Updated display name');
  assert.equal(JSON.stringify(deal.proposals[0]), historical);
  assert.notEqual(b.revisions[0].label, b.label);
  assert.throws(() => S.duplicateQuote(c, deal, b, {}, 'engineering'), /Sales or Manager/);
});

test('contact edits validate before changing the deal and preserve historical proposals', () => {
  const { deal } = fixture(), history = JSON.stringify(deal.proposals);
  S.updateContacts(deal, [{ name: 'Taylor Buyer', email: 'Taylor@Example.com', title: 'Operations' }]);
  assert.equal(deal.contacts[0].email, 'taylor@example.com');
  const saved = JSON.stringify(deal);
  for (const contacts of [[{ name: '', email: 'buyer@example.com' }], [{ name: 'Buyer', email: 'not-an-email' }], [{ id: 'foreign-contact', name: 'Buyer' }], [{ name: 'A', email: 'same@example.com' }, { name: 'B', email: 'same@example.com' }]]) {
    assert.throws(() => S.updateContacts(deal, contacts));
    assert.equal(JSON.stringify(deal), saved);
  }
  S.updateContacts(deal, [{ ...deal.contacts[0], phone: '555-0100' }]);
  assert.equal(JSON.stringify(deal.proposals), history);
});

test('customer replies and resolution retain original feedback identity and stay in its proposal', () => {
  const { deal, b } = fixture(), proposal = deal.proposals[0];
  const response = S.recordCustomerResponse(deal, { proposal_id: proposal.id, quote_id: b.id, kind: 'question', body: 'What is included?', author: 'Taylor', section: 'options', line_id: b.revisions[0].draft.lines[0].quote_line_id });
  const original = JSON.stringify(response);
  const reply = S.replyToResponse(deal, response.id, { body: 'The included features appear under the base machine.', author: 'PAC sales', role: 'sales' });
  assert.equal(reply.replies.length, 1);
  assert.equal(JSON.stringify(response), original);
  assert.throws(() => S.setResponseStatus(deal, response.id, { status: 'resolved', reason: 'Explained', author: 'Engineer', role: 'engineering' }), /Sales or Manager/);
  S.setResponseStatus(deal, response.id, { status: 'resolved', reason: 'Included features explained.', author: 'PAC sales', role: 'sales' });
  S.setResponseStatus(deal, response.id, { status: 'open', reason: 'Buyer has a follow-up.', author: 'PAC sales', role: 'sales' });
  const actual = deal.customer_responses[0], visible = S.publicProposal(deal, proposal.id).responses[0];
  assert.equal(actual.status_history.length, 2);
  assert.equal(actual.body, response.body);
  assert.equal(actual.proposal_id, response.proposal_id);
  assert.equal(actual.revision, 0);
  assert.equal(visible.replies[0].body, reply.replies[0].body);
  assert.equal(visible.section, 'options');
  assert.ok(!('owner' in visible));
  assert.ok(!('role' in visible.replies[0]));
  assert.throws(() => S.replyToResponse(deal, 'foreign-response', { body: 'Reply', author: 'PAC', role: 'sales' }), /does not belong/);
});

test('feedback anchors and request closing cannot bypass quote revision publication', () => {
  const { deal, b } = fixture(), proposal = deal.proposals[0];
  const input = { proposal_id: proposal.id, quote_id: b.id, kind: 'changes_requested', body: 'Add spares.' };
  assert.throws(() => S.recordCustomerResponse(deal, { ...input, line_id: 'foreign-line' }), /line included/);
  assert.throws(() => S.recordCustomerResponse(deal, { ...input, section: 'internal-costs' }), /valid proposal section/);
  const response = S.recordCustomerResponse(deal, input);
  assert.throws(() => S.setResponseStatus(deal, response.id, { status: 'resolved', reason: 'Done', author: 'PAC sales', role: 'sales' }), /Publish a revised proposal/);
  S.setResponseStatus(deal, response.id, { status: 'declined', reason: 'Application fit needs discussion.', author: 'PAC sales', role: 'sales' });
  assert.throws(() => S.reviseFromResponse(deal, response.id), /Reopen/);
  S.setResponseStatus(deal, response.id, { status: 'open', reason: 'Buyer confirmed application.', author: 'PAC sales', role: 'sales' });
  S.reviseFromResponse(deal, response.id);
  assert.throws(() => S.setResponseStatus(deal, response.id, { status: 'resolved', reason: 'Done', author: 'PAC sales', role: 'sales' }), /Publish the revision linked/);
});

test('customer next decisions are separately published and old internal follow-ups never enter public projection', () => {
  const {deal} = fixture();
  // Simulate a previously persisted proposal without changing its commercial data.
  const legacy = JSON.parse(JSON.stringify(deal.proposals[0]));
  legacy.snapshot.next_action = 'INTERNAL_ONLY_CALL_MANAGER';
  legacy.snapshot.next_action_date = '2026-12-01';
  legacy.snapshot.crm_id = 'INTERNAL_CRM';
  delete legacy.snapshot.customer_next_decision;
  deal.proposals[0] = legacy;
  const before = JSON.stringify(legacy);
  let visible = S.publicProposal(deal,legacy.id);
  assert.equal(visible.customer_next_decision,'');
  assert.equal(visible.next_action,undefined);
  assert.equal(visible.next_action_date,undefined);
  assert.equal(visible.crm_id,undefined);
  assert.equal(JSON.stringify(visible).includes('INTERNAL_'),false);
  S.updateDeal(deal,{next_action:'INTERNAL_FOLLOWUP',customer_next_decision:'Confirm the loading approach with PAC.',customer_decision_date:'2026-11-20'});
  const published=S.publishProposal(deal);
  visible=S.publicProposal(deal,published.id);
  assert.equal(visible.customer_next_decision,'Confirm the loading approach with PAC.');
  assert.equal(visible.customer_decision_date,'2026-11-20');
  S.updateDeal(deal,{customer_next_decision:'Another decision for a later version.'});
  assert.equal(S.publicProposal(deal,published.id).customer_next_decision,visible.customer_next_decision);
  assert.equal(JSON.stringify(legacy),before);
  assert.deepEqual(visible.alternatives,legacy.snapshot.alternatives);
});

test('review return, resubmission and stale submission retain authorization and historical decisions', () => {
  const {deal,b}=revise();engineering(deal,b);
  const rep={id:'rep',name:'PAC representative'}, engineer={id:'engineer',name:'PAC engineer'};
  S.submitQuoteReview(c,deal,b,'engineering','sales',rep,'Please confirm the loading guide.');
  assert.equal(S.reviewStatus(deal,b,'engineering').status,'pending');
  assert.throws(()=>S.requestQuoteChanges(c,deal,b,'engineering','Needs dimensions','sales',rep),/Engineering or Manager/);
  assert.throws(()=>S.requestQuoteChanges(c,deal,b,'engineering','','engineering',engineer),/Reason/);
  S.requestQuoteChanges(c,deal,b,'engineering','Add the required guide dimensions.','engineering',engineer);
  assert.equal(S.reviewStatus(deal,b,'engineering').status,'changes_requested');
  assert.throws(()=>S.reviewQuote(c,deal,b,'engineering','engineering',engineer),/resubmit/);
  assert.throws(()=>S.submitQuoteReview(c,deal,b,'engineering','engineering',engineer),/Sales or Manager/);
  S.submitQuoteReview(c,deal,b,'engineering','sales',rep,'Dimensions now included.');
  S.updateScope(deal,{notes:'Guide dimensions confirmed with the application team.'});
  assert.equal(S.reviewStatus(deal,b,'engineering').status,'needs_resubmission');
  assert.throws(()=>S.reviewQuote(c,deal,b,'engineering','engineering',engineer),/resubmit/);
  S.submitQuoteReview(c,deal,b,'engineering','sales',rep,'Updated scope ready.');
  S.reviewQuote(c,deal,b,'engineering','engineering',engineer);
  assert.equal(S.reviewStatus(deal,b,'engineering').status,'approved');
  assert.equal(b.review_history.filter(event=>event.status==='changes_requested')[0].reason,'Add the required guide dimensions.');
  assert.equal(b.review_history.at(-1).reviewer.id,'engineer');
  assert.equal(b.revisions[0].totals.total,40810);
});
