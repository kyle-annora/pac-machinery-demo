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

test('proposal-first seed has two actual catalog alternatives under one deal', () => {
  const { deal, a, b } = fixture();
  assert.equal(a.revisions[0].revision, 0); assert.equal(b.revisions[0].revision, 0);
  assert.equal(S.totals(a).total, 33060); assert.equal(S.totals(b).total, 40810);
  assert.deepEqual(b.working.draft.lines.filter(x => x.option_id).map(x => x.option_id), ['easy_load_bag_opener', 'seal_flattener_fingers']);
  assert.equal(S.publicProposal(deal).alternatives.length, 2);
  assert.ok(b.revisions[0].draft.catalog_hash);
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
  assert.throws(() => S.reviewQuote(c, deal, b, 'engineering', 'sales'), /Engineering review requires/);
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
  assert.throws(() => S.reviewQuote(c, deal, b, 'manager', 'sales'), /Manager demo role/);
  S.reviewQuote(c, deal, b, 'manager', 'manager');
  S.issueQuote(c, deal, b, 'manager');
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
  assert.equal(S.publicProposal(deal).alternatives[1].revision, 1);
  assert.equal(S.publicProposal(deal).alternatives[1].totals.total, 41660);
  assert.equal(b.revisions.length, 2);
  assert.throws(() => { b.revisions[0].draft.lines[0].price_usd = 1; }, TypeError);
});

test('customer projection excludes pricing internals, approvals and internal comments', () => {
  const { deal, b } = revise(); engineering(deal, b); approve(deal, b); S.issueQuote(c, deal, b);
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

test('customer preference is bound to issued terms and clears when that alternative is revised', () => {
  const { deal, a, b } = fixture();
  S.chooseAlternative(deal, b.id);
  assert.equal(deal.selected_quote_revision, 0);
  S.reviseQuote(deal, a, 'Different alternative changes'); approve(deal, a); S.issueQuote(c, deal, a);
  assert.equal(S.publicProposal(deal).selected_quote_id, b.id);
  S.reviseQuote(deal, b, 'Preferred alternative needs engineering'); engineering(deal, b);
  assert.equal(S.publicProposal(deal).selected_quote_id, b.id);
  assert.equal(S.publicProposal(deal).selected_quote_revision, 0);
  approve(deal, b); S.issueQuote(c, deal, b);
  assert.equal(deal.selected_quote_id, null);
  assert.equal(S.publicProposal(deal).selected_quote_id, null);
  assert.ok(deal.activity.some(item => /Customer preference.*cleared/.test(item.message)));
  S.chooseAlternative(deal, b.id);
  assert.equal(S.publicProposal(deal).selected_quote_revision, 1);
  delete deal.selected_quote_revision; // Legacy browser saves never imply approval of current terms.
  assert.equal(S.publicProposal(deal).selected_quote_id, null);
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
