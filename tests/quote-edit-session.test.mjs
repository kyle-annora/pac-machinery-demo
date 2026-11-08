import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../src/catalog.js';
import * as S from '../src/sales-domain.js';
import { quoteBasis, validQuoteEdit, stageQuoteChange, applyQuoteEdit } from '../src/quote-edit-session.js';
import { commitWorkspace, WorkspacePersistenceError } from '../src/workspace-persistence.js';

const read = name => JSON.parse(readFileSync(new URL(`../data/catalog/${name}`, import.meta.url)));
const catalog = {
  manifest: read('manifest.json'), overview: read('overview.json'),
  machines: read('catalog/machines.json'), priceLines: read('catalog/price_lines.json'),
  narratives: read('catalog/narratives.json'), media: read('catalog/media.json'),
  terms: read('catalog/commercial_terms.json'), kits: read('catalog/spare_parts.json'),
  options: read('catalog/options.json'), baseUrl: '/source',
};
const clone = value => JSON.parse(JSON.stringify(value));
const fixture = () => {
  const state = { version: 1, deals: [] };
  const deal = S.createDemoScenario(catalog, state);
  const request = deal.customer_responses[0];
  const quote = S.reviseFromResponse(deal, request.id);
  return { state, deal, quote, request };
};
const addKit = (deal, quoteId, previous = null) => stageQuoteChange(deal, quoteId, previous,
  (candidate, quote) => S.selectOption(catalog, candidate, quote, C.getOption(catalog, 'r3200', 'spare_parts_kit')));

test('adding the real spare kit stages a recoverable quote without mutating saved records', () => {
  const { state, deal, quote } = fixture(), saved = JSON.stringify(state);
  const entry = addKit(deal, quote.id);
  assert.equal(JSON.stringify(state), saved);
  assert.equal(S.totals(quote).total, 40810);
  assert.equal(S.totals(entry.working).total, 41940);
  assert.equal(entry.base, quoteBasis(quote.working));
  assert.equal(entry.dealId, deal.id);
  assert.equal(entry.quoteId, quote.id);
  const restoredState = S.migrateWorkspace(clone(state)), restoredEntry = clone(entry);
  assert.equal(validQuoteEdit(restoredState, restoredEntry), true);
  assert.equal(S.totals(restoredEntry.working).total, 41940);
  const next = stageQuoteChange(restoredState.deals[0], quote.id, restoredEntry, (_deal, nextQuote) => {
    nextQuote.working.revision_note = 'Added at the customer’s request.';
  });
  assert.equal(next.base, entry.base);
  assert.equal(restoredEntry.working.revision_note, entry.working.revision_note);
  assert.equal(next.working.revision_note, 'Added at the customer’s request.');
});

test('saving staged configuration preserves published V1 and response lineage while clearing reviews', () => {
  const { state, deal, quote, request } = fixture();
  S.reviewQuote(catalog, deal, quote, 'application', 'sales');
  const oldProposal = JSON.stringify(deal.proposals[0]);
  const oldIssued = JSON.stringify(quote.revisions[0]);
  const oldResponse = JSON.stringify(deal.customer_responses[0]);
  const entry = addKit(deal, quote.id), entryBefore = JSON.stringify(entry);
  let serialized;
  const receipt = commitWorkspace(state, candidate => applyQuoteEdit(candidate, entry), {
    save(value) { serialized = value; },
  });
  const savedDeal = receipt.state.deals[0], savedQuote = savedDeal.quotes[1];
  assert.equal(S.totals(savedQuote).total, 41940);
  assert.deepEqual(savedQuote.working.approvals, {});
  assert.ok(savedQuote.working.saved_at);
  assert.equal(savedQuote.working.customer_response_id, request.id);
  assert.equal(savedQuote.working.source_proposal_id, deal.proposals[0].id);
  assert.equal(JSON.stringify(savedDeal.proposals[0]), oldProposal);
  assert.equal(JSON.stringify(savedQuote.revisions[0]), oldIssued);
  assert.equal(JSON.stringify(savedDeal.customer_responses[0]), oldResponse);
  assert.equal(savedDeal.customer_responses[0].status, 'in_progress');
  assert.equal(S.totals(quote).total, 40810, 'the caller publishes the returned state only after persistence succeeds');
  assert.equal(JSON.stringify(entry), entryBefore, 'saving must not destroy the retryable buffer');
  assert.equal(JSON.parse(serialized).deals[0].quotes[1].working.saved_at, savedQuote.working.saved_at);
  assert.equal(S.publicProposal(savedDeal, deal.proposals[0].id).alternatives[1].totals.total, 40810);
});

test('stale commercial changes reject both further staging and save without overwriting the newer quote', () => {
  const { state, deal, quote } = fixture(), entry = addKit(deal, quote.id);
  S.updateDiscount(deal, quote, { amount: 100, reason: 'Separately saved concession' });
  const saved = JSON.stringify(state), buffered = JSON.stringify(entry);
  assert.throws(() => stageQuoteChange(deal, quote.id, entry, () => {}), /changed since you started editing/);
  let saves = 0;
  assert.throws(() => commitWorkspace(state, candidate => applyQuoteEdit(candidate, entry), {
    save() { saves++; },
  }), /changed in another view/);
  assert.equal(saves, 0);
  assert.equal(JSON.stringify(state), saved);
  assert.equal(JSON.stringify(entry), buffered);
});

for (const change of ['evidence', 'scope']) {
  test(`${change} updates survive a staged save and cannot resurrect an earlier approval`, () => {
    const { state, deal, quote } = fixture();
    S.reviewQuote(catalog, deal, quote, 'application', 'sales');
    const entry = stageQuoteChange(deal, quote.id, null, (_deal, nextQuote) => {
      nextQuote.working.revision_note = 'Customer request remains in progress.';
    });
    assert.ok(entry.working.approvals.application, 'buffer intentionally predates the review invalidation');
    let evidence;
    if (change === 'evidence') evidence = S.addEvidence(deal, { type: 'photo', quote_id: quote.id, title: 'Additional application reference' });
    else S.updateScope(deal, { notes: 'Customer clarified product samples during editing.' });
    assert.deepEqual(quote.working.approvals, {});
    const receipt = commitWorkspace(state, candidate => applyQuoteEdit(candidate, entry), { save() {} });
    const savedDeal = receipt.state.deals[0], savedQuote = savedDeal.quotes[1];
    assert.deepEqual(savedQuote.working.approvals, {});
    assert.ok(S.blockers(catalog, savedDeal, savedQuote).includes('Application review is required for this revision.'));
    if (evidence) assert.equal(savedDeal.evidence[0].id, evidence.id);
    else assert.equal(savedDeal.scope.notes, 'Customer clarified product samples during editing.');
    assert.equal(savedQuote.working.revision_note, 'Customer request remains in progress.');
  });
}

test('failed persistence leaves the saved quote and editor intact for an explicit retry', () => {
  const { state, deal, quote } = fixture(), entry = addKit(deal, quote.id);
  const before = JSON.stringify(state), buffered = JSON.stringify(entry);
  assert.throws(() => commitWorkspace(state, candidate => applyQuoteEdit(candidate, entry), {
    save() { throw new Error('Storage unavailable'); },
  }), WorkspacePersistenceError);
  assert.equal(JSON.stringify(state), before);
  assert.equal(JSON.stringify(entry), buffered);
  assert.equal(validQuoteEdit(state, entry), true);
  const receipt = commitWorkspace(state, candidate => applyQuoteEdit(candidate, entry), { save() {} });
  assert.equal(S.totals(receipt.result).total, 41940);
  assert.equal(S.totals(quote).total, 40810);
});

test('restored editor buffers reject issued, mismatched, missing and foreign revision targets', () => {
  const { state, deal, quote } = fixture(), entry = addKit(deal, quote.id);
  assert.equal(validQuoteEdit(state, { ...entry, version: 2 }), false);
  assert.equal(validQuoteEdit(state, { ...entry, dealId: 'another-deal' }), false);
  assert.equal(validQuoteEdit(state, { ...entry, quoteId: 'another-quote' }), false);
  assert.equal(validQuoteEdit(state, { ...entry, working: { ...entry.working, revision: 2 } }), false);
  assert.equal(validQuoteEdit(state, { ...entry, working: { ...entry.working, status: 'issued' } }), false);
  assert.equal(validQuoteEdit(state, { ...entry, working: { ...entry.working, engineering: null } }), false);
  S.reviewQuote(catalog, deal, quote, 'application', 'sales');
  S.issueQuote(catalog, deal, quote, 'sales');
  assert.equal(validQuoteEdit(state, entry), false);
  assert.throws(() => applyQuoteEdit(state, entry), /no longer matches an editable quote revision/);
  assert.throws(() => stageQuoteChange(deal, quote.id, null, () => {}), /Create a draft revision/);
});
