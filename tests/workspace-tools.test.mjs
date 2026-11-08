import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as S from '../src/sales-domain.js';
import * as C from '../src/catalog.js';
import { createCatalogState, executeCatalogCommand, catalogChanges } from '../src/catalog-admin.js';
import { renderTools, reviewQueue, renderRevisionDiff } from '../src/workspace-tools.js';

const read = name => JSON.parse(fs.readFileSync(new URL(`../data/catalog/${name}`, import.meta.url)));
const catalog = { manifest: read('manifest.json'), overview: read('overview.json'), machines: read('catalog/machines.json'), priceLines: read('catalog/price_lines.json'), narratives: read('catalog/narratives.json'), media: read('catalog/media.json'), terms: read('catalog/commercial_terms.json'), kits: read('catalog/spare_parts.json'), options: read('catalog/options.json'), baseUrl: '/source' };
const manager = { id: 'manager-test', name: 'PAC Manager', role: 'manager' };
const execute = (state, command, args) => executeCatalogCommand(state, command, args, manager);
const revision = () => { const state = createCatalogState(catalog); execute(state, 'startDraft'); return state; };
const row = (state, id = 'spare_parts_kit') => state.draft.catalog.priceLines.find(item => item.machine_id === 'r3200' && item.option_id === id);
const publish = state => { execute(state, 'reviewDraft'); execute(state, 'publishDraft'); return state.publishedCatalog; };
const workspace = () => { const state = S.seedWorkspace(catalog), deal = state.deals[0], quote = deal.quotes[1]; S.reviseQuote(deal, quote, 'Customer requested a revised configuration'); return { state, deal, quote }; };

test('catalog commands require a named authenticated Manager and leave other roles unchanged', () => {
  const state = createCatalogState(catalog), before = JSON.stringify(state);
  for (const identity of [null, { role: 'manager' }, { id: 'x', name: 'Sales', role: 'sales' }, { id: 'x', name: 'Engineer', role: 'engineering' }]) assert.throws(() => executeCatalogCommand(state, 'startDraft', {}, identity), /Manager account/);
  assert.equal(JSON.stringify(state), before);
  assert.equal(execute(state, 'startDraft').created_by.id, manager.id);
});

test('invalid catalog edits are atomic and cannot use another machine companion', () => {
  const state = revision(), before = JSON.stringify(state), item = row(state);
  for (const price_usd of [-1, null, '', Infinity, 'bad', true]) assert.throws(() => execute(state, 'saveDraft', { line: { item_id: item.item_id, price_usd } }), /nonnegative price/);
  assert.throws(() => execute(state, 'saveDraft', { line: { item_id: item.item_id, requires_option_ids: ['unknown_option'] } }), /available on this machine/);
  assert.equal(JSON.stringify(state), before);
});

test('required option rules add priced companions once and reject self references and cycles', () => {
  const state = revision(), parts = row(state), opener = row(state, 'easy_load_bag_opener');
  execute(state, 'saveDraft', { line: { item_id: parts.item_id, requires_option_ids: [opener.option_id] } });
  const before = JSON.stringify(state);
  assert.throws(() => execute(state, 'saveDraft', { line: { item_id: opener.item_id, requires_option_ids: [parts.option_id] } }), /dependency cycle/);
  assert.throws(() => execute(state, 'saveDraft', { line: { item_id: parts.item_id, requires_option_ids: [parts.option_id] } }), /itself/);
  assert.equal(JSON.stringify(state), before);
  const published = publish(state), draft = C.newDraft(published, 'r3200');
  const plan = C.planSelection(published, draft, C.getOption(published, 'r3200', parts.option_id));
  assert.equal(plan.blocked, false);
  assert.deepEqual(plan.additions.map(line => line.option_id), [parts.option_id, opener.option_id, 'seal_flattener_fingers']);
  assert.equal(plan.addedTotal, parts.price_usd + opener.price_usd + C.getOption(published, 'r3200', 'seal_flattener_fingers').price_usd);
});

test('included options remain free and remove duplicate paid selection', () => {
  const state = revision(), parts = row(state);
  execute(state, 'saveDraft', { line: { item_id: parts.item_id, included: true, price_usd: 1200 } });
  assert.equal(row(state).price_usd, 0);
  const option = state.draft.catalog.options.find(item => item.option_id === parts.option_id);
  assert.ok(option.included_on.includes('r3200'));
  assert.equal(option.priced_on.r3200, undefined);
  const published = publish(state), draft = C.newDraft(published, 'r3200');
  assert.ok(draft.included_snapshot.some(item => item.option_id === parts.option_id && item.price_usd === 0));
  assert.equal(C.planSelection(published, draft, C.getOption(published, 'r3200', parts.option_id)).blocked, true);
});

test('included features cannot silently require an unpaid companion', () => {
  const state = revision(), parts = row(state), opener = row(state, 'easy_load_bag_opener');
  assert.throws(() => execute(state, 'saveDraft', { line: { item_id: parts.item_id, included: true, requires_option_ids: [opener.option_id] } }), /only require other included/);
  assert.equal(row(state).line_class, 'catalog_option');
  execute(state, 'saveDraft', { line: { item_id: row(state, 'seal_flattener_fingers').item_id, included: true } });
  execute(state, 'saveDraft', { line: { item_id: opener.item_id, included: true } });
  execute(state, 'saveDraft', { line: { item_id: parts.item_id, included: true, requires_option_ids: [opener.option_id] } });
  assert.equal(row(state).line_class, 'catalog_included');
  assert.throws(() => execute(state, 'saveDraft', { line: { item_id: opener.item_id, included: false, price_usd: 100 } }), /only require other included/);
});

test('base and service lines cannot be assigned companion options', () => {
  const state = revision(), base = state.draft.catalog.priceLines.find(item => item.machine_id === 'r3200' && item.line_class === 'catalog_base');
  assert.throws(() => execute(state, 'saveDraft', { line: { item_id: base.item_id, requires_option_ids: ['spare_parts_kit'] } }), /only be assigned to catalog options/);
});

test('catalog review is invalidated after every later edit; publish requires fresh review', () => {
  const state = revision();
  assert.throws(() => execute(state, 'reviewDraft'), /Make a catalog change/);
  execute(state, 'saveDraft', { line: { item_id: row(state).item_id, price_usd: 1200 } });
  assert.throws(() => execute(state, 'publishDraft'), /Review the current/);
  execute(state, 'reviewDraft');
  execute(state, 'saveDraft', { line: { item_id: row(state).item_id, price_usd: 1250 } });
  assert.equal(state.draft.review, null);
  assert.throws(() => execute(state, 'publishDraft'), /Review the current/);
  publish(state);
  assert.equal(state.draft, null);
  assert.equal(state.history[0].review.actor.id, manager.id);
});

test('publishing creates a new catalog basis with initial source provenance across revisions', () => {
  const state = revision(), source = JSON.stringify(catalog);
  const base = state.draft.catalog.priceLines.find(item => item.machine_id === 'r3200' && item.line_class === 'catalog_base');
  execute(state, 'saveDraft', { line: { item_id: base.item_id, price_usd: base.price_usd + 1000 } });
  const first = publish(state);
  assert.equal(first.machines.find(item => item.machine_id === 'r3200').base_price_usd, base.price_usd + 1000);
  assert.notEqual(first.manifest.catalog_sha256, catalog.manifest.catalog_sha256);
  assert.equal(first.manifest.origin, 'workspace_admin');
  assert.equal(first.manifest.source_catalog_hash, catalog.manifest.catalog_sha256);
  assert.equal(first.manifest.approval.actor.id, manager.id);
  execute(state, 'startDraft');
  execute(state, 'saveDraft', { line: { item_id: row(state).item_id, price_usd: 1300 } });
  const second = publish(state);
  assert.equal(second.manifest.source_run_id, catalog.manifest.run_id);
  assert.deepEqual(second.manifest.source_manifest, catalog.manifest);
  assert.equal(state.history.length, 2);
  assert.equal(JSON.stringify(catalog), source);
});

test('updated service rates keep commercial prose and numeric references consistent with provenance', () => {
  const state = revision();
  const service = state.draft.catalog.priceLines.find(item => item.machine_id === 'r3200' && item.line_class === 'service');
  execute(state, 'saveDraft', { line: { item_id: service.item_id, price_usd: 6000 } });
  const startup = state.draft.catalog.terms.find(item => item.machine_id === 'r3200').startup;
  assert.equal(startup.price_usd, 6000);
  assert.match(startup.text, /\$6,000/);
  assert.doesNotMatch(startup.text, /\$5,480/);
  assert.match(startup.text, /\$500 charge/);
  assert.equal(startup.source_reference.price_usd, 5480);
  assert.ok(startup.price_refs.every(item => item.price_usd === 6000));
});

test('bulk percentage updates paid rows and derived prices while preserving included features', () => {
  const state = revision();
  const oldPrices = new Map(state.draft.catalog.priceLines.filter(item => item.machine_id === 'r3200').map(item => [item.item_id, item.price_usd]));
  execute(state, 'saveDraft', { adjustment: { machine_id: 'r3200', percent: 10 } });
  for (const item of state.draft.catalog.priceLines.filter(item => item.machine_id === 'r3200')) {
    const old = oldPrices.get(item.item_id);
    assert.equal(item.price_usd, item.line_class !== 'catalog_included' && Number.isFinite(old) ? Math.round((old * 1.1 + Number.EPSILON) * 100) / 100 : old);
  }
  assert.equal(state.draft.catalog.terms.find(item => item.machine_id === 'r3200').startup.price_usd, 6028);
  assert.match(state.draft.catalog.terms.find(item => item.machine_id === 'r3200').startup.text, /\$6,028/);
});

test('lead time validation is atomic and semantic no-op cannot be reviewed', () => {
  const state = revision(), before = JSON.stringify(state), term = catalog.terms.find(item => item.machine_id === 'r3200').lead_time;
  assert.throws(() => execute(state, 'saveDraft', { terms: { machine_id: 'r3200', text: 'Delivery', min_weeks: 12, max_weeks: 8 } }), /valid minimum/);
  assert.equal(JSON.stringify(state), before);
  execute(state, 'saveDraft', { terms: { machine_id: 'r3200', text: term.text, min_weeks: term.min_weeks, max_weeks: term.max_weeks } });
  assert.equal(catalogChanges(state.publishedCatalog, state.draft.catalog).length, 0);
  assert.throws(() => execute(state, 'reviewDraft'), /Make a catalog change/);
  execute(state, 'saveDraft', { terms: { machine_id: 'r3200', text: '10–12 weeks after receipt of deposit.', min_weeks: 10, max_weeks: 12 } });
  assert.equal(catalogChanges(state.publishedCatalog, state.draft.catalog)[0].section, 'lead_time');
});

test('published catalog changes never rewrite issued revisions or proposals', () => {
  const { state: workspaceState, deal, quote } = workspace();
  const issuedBefore = JSON.stringify(quote.revisions), proposalsBefore = JSON.stringify(deal.proposals);
  const state = revision();
  execute(state, 'saveDraft', { line: { item_id: row(state).item_id, price_usd: 1500 } });
  const published = publish(state);
  assert.equal(JSON.stringify(workspaceState.deals[0].quotes[1].revisions), issuedBefore);
  assert.equal(JSON.stringify(deal.proposals), proposalsBefore);
  assert.ok(S.blockers(published, deal, quote).some(reason => reason.startsWith('Catalog changed')));
  assert.equal(C.getOption(published, 'r3200', 'spare_parts_kit').price_usd, 1500);
});

test('review queue distinguishes content blockers, role-specific pending reviews and issued quotes', () => {
  const { state, deal, quote } = workspace();
  S.saveEngineering(deal, quote, { description: 'Loading guide', reason: 'Product fit', hours: 2, materials: 100 }, 'engineering');
  S.updateDiscount(deal, quote, { amount: 100, reason: 'Approved scope' });
  const sales = reviewQueue(catalog, state, { role: 'sales' });
  assert.equal(sales.length, 1);
  assert.deepEqual(sales[0].pending, ['application', 'engineering', 'manager']);
  assert.deepEqual(sales[0].canReview, ['application']);
  assert.equal(sales[0].blockers.length, 0);
  assert.deepEqual(reviewQueue(catalog, state, { role: 'engineering' })[0].canReview, ['application', 'engineering']);
  assert.deepEqual(reviewQueue(catalog, state, { role: 'unknown' })[0].canReview, []);
  S.reviewQuote(catalog, deal, quote, 'application', 'sales');
  assert.deepEqual(reviewQueue(catalog, state, manager)[0].pending, ['engineering', 'manager']);
  deal.scope.application = '';
  assert.ok(reviewQueue(catalog, state, manager)[0].blockers.includes('Application description is required.'));
});

test('review screen has exact quote link, safe user text and no conflicting global filter attributes', () => {
  const { state, deal, quote } = workspace();
  quote.label = '<img src=x onerror=alert(1)>';
  const html = renderTools({ view: 'reviews', catalog, state, user: { role: 'sales', name: 'Kyle' }, toolsState: { selected: quote.id } });
  assert.match(html, /id="main"/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.ok(html.includes(`#quote/${deal.id}/${quote.id}/working`));
  assert.match(html, /data-tools-action="confirm-review"/);
  assert.doesNotMatch(html, /data-filter=/);
});

test('catalog administrator sees explicit draft review and publish; sales cannot write', () => {
  const state = revision();
  execute(state, 'saveDraft', { line: { item_id: row(state).item_id, price_usd: 1200 } });
  const envelope = { catalog: state.publishedCatalog, draft: state.draft, history: [], version: 3 };
  let html = renderTools({ view: 'catalog-admin', catalog, user: manager, toolsState: { catalogEnvelope: envelope, tab: 'changes' } });
  assert.match(html, /Confirm catalog review/);
  assert.match(html, /\$1,200\.00/);
  execute(state, 'reviewDraft');
  html = renderTools({ view: 'catalog-admin', catalog, user: manager, toolsState: { catalogEnvelope: { ...envelope, draft: state.draft }, tab: 'changes' } });
  assert.match(html, /Publish catalog revision/);
  const readonly = renderTools({ view: 'catalog-admin', catalog, user: { role: 'sales' }, toolsState: { catalogEnvelope: envelope, selected: row(state).item_id } });
  assert.doesNotMatch(readonly, /Save item draft|data-tools-action="publish-catalog"|Discard catalog draft/);
});

test('revision comparison renders removed configuration and prices without mutable history edits', () => {
  const { deal, quote } = workspace(), before = JSON.stringify(quote.revisions);
  S.updateDiscount(deal, quote, { amount: 100, reason: 'Commercial update' });
  const html = renderRevisionDiff({ deal, quote, fromRevision: 0 });
  assert.match(html, /Previously/);
  assert.match(html, /Commercial update/);
  assert.match(html, /−\$100\.00/);
  assert.equal(JSON.stringify(quote.revisions), before);
});

test('spare parts kit price changes preserve contents and the matching quote reference', () => {
  const state = revision(), kit = state.draft.catalog.kits.find(item => item.kit_id === 'items_included_in_level_1_spare_parts_kit_720');
  const kitRow = state.draft.catalog.priceLines.find(item => item.machine_id === 'magnum_horizontal_med' && item.price_usd === 720 && /spare[ -]?parts/i.test(item.name));
  const originalContents = JSON.stringify(kit.lines);
  execute(state, 'saveDraft', { line: { item_id: kitRow.item_id, price_usd: 800 } });
  const published = publish(state), updated = published.kits.find(item => item.kit_id === kit.kit_id);
  assert.equal(updated.price_usd, 800);
  assert.match(updated.title.text, /\$800/);
  assert.equal(updated.source_reference.price_usd, 720);
  assert.equal(JSON.stringify(updated.lines), originalContents);
  const snapshot = C.snapshotLine(published, published.priceLines.find(item => item.item_id === kitRow.item_id));
  assert.equal(snapshot.kit_id, kit.kit_id);
});

test('review queue presents returned work, exact configuration and revision evidence',()=>{
  const {state,deal,quote}=workspace();
  const option=C.getOption(catalog,'r3200','accumulating_funnel');S.selectOption(catalog,deal,quote,option,{confirm:true});
  S.submitQuoteReview(catalog,deal,quote,'engineering','sales');
  S.requestQuoteChanges(catalog,deal,quote,'engineering','Confirm the loading clearance.','engineering');
  const html=renderTools({view:'reviews',catalog,state,user:{role:'sales',name:'Sales'},toolsState:{selected:quote.id}});
  assert.match(html,/Returned to owner/);assert.match(html,/Confirm the loading clearance/);
  assert.match(html,/Configuration to review/);assert.match(html,/Accumulating Funnel/);
  assert.match(html,/Changes from Rev 0/);assert.match(html,/Resubmit review/);
  assert.match(html,/Not individually assigned/);
  const queue=reviewQueue(catalog,state,{role:'sales'});assert.equal(queue[0].returned,true);
});

test('review evidence does not add a sign to a pending engineering price',()=>{
  const {state,deal,quote}=workspace();S.saveEngineering(deal,quote,{description:'QA guide',reason:'Unpriced request'},'sales');
  const html=renderTools({view:'reviews',catalog,state,user:{role:'sales',name:'Sales'},toolsState:{selected:quote.id}});
  assert.match(html,/Price pending/);assert.doesNotMatch(html,/\+Price pending/);
});
