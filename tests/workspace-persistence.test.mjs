import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { commitWorkspace, WorkspacePersistenceError } from '../src/workspace-persistence.js';
import * as S from '../src/sales-domain.js';

const read = name => JSON.parse(readFileSync(new URL(`../data/catalog/${name}`, import.meta.url)));
const catalog = {
  manifest: read('manifest.json'), overview: read('overview.json'),
  machines: read('catalog/machines.json'), priceLines: read('catalog/price_lines.json'),
  narratives: read('catalog/narratives.json'), media: read('catalog/media.json'),
  terms: read('catalog/commercial_terms.json'), kits: read('catalog/spare_parts.json'),
  options: read('catalog/options.json'), baseUrl: '/source',
};

test('successful commit persists the candidate before returning its state and command result', () => {
  const original = { version: 1, deals: [{ id: 'deal-1', title: 'Original' }] };
  let stored, receipt;
  const committed = commitWorkspace(original, candidate => {
    candidate.deals[0].title = 'Saved title';
    return candidate.deals[0];
  }, { save(serialized) { assert.equal(receipt, undefined); stored = serialized; } });
  receipt = committed;
  assert.equal(original.deals[0].title, 'Original');
  assert.notEqual(committed.state, original);
  assert.equal(committed.result, committed.state.deals[0]);
  assert.deepEqual(committed.state, JSON.parse(stored));
  assert.equal(committed.result.title, 'Saved title');
});

test('storage failure returns no receipt and retains the entire original workspace', () => {
  const original = { version: 1, deals: [{ id: 'deal-1', requests: [], activity: [] }] };
  const before = JSON.stringify(original), failure = new Error('QuotaExceededError');
  let receipt;
  assert.throws(() => {
    receipt = commitWorkspace(original, candidate => {
      candidate.deals[0].requests.push({ id: 'request-1', body: 'Change delivery' });
      candidate.deals[0].activity.push({ message: 'Request recorded' });
      return candidate.deals[0].requests[0];
    }, { save() { throw failure; } });
  }, error => error instanceof WorkspacePersistenceError && error.code === 'WORKSPACE_SAVE_FAILED' && error.cause === failure);
  assert.equal(receipt, undefined);
  assert.equal(JSON.stringify(original), before);
});

test('a command that mutates then fails validation never reaches storage', () => {
  const original = { deals: [{ status: 'draft', lines: [] }] }, before = JSON.stringify(original);
  const validation = new Error('Price is unresolved');
  let calls = 0;
  assert.throws(() => commitWorkspace(original, candidate => {
    candidate.deals[0].status = 'issued';
    candidate.deals[0].lines.push({ price: null });
    throw validation;
  }, { save() { calls++; } }), error => error === validation);
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(original), before);
});

test('candidate serialization failure does not call storage or modify the original', () => {
  const original = { deals: [] };
  let calls = 0;
  assert.throws(() => commitWorkspace(original, candidate => {
    candidate.circular = candidate;
  }, { save() { calls++; } }), WorkspacePersistenceError);
  assert.equal(calls, 0);
  assert.deepEqual(original, { deals: [] });
});

test('false and asynchronous save results cannot acknowledge a commit', () => {
  const original = { deals: [{ title: 'Original' }] };
  for (const result of [false, Promise.resolve()]) {
    assert.throws(() => commitWorkspace(original, candidate => {
      candidate.deals[0].title = 'Unsaved';
    }, { save: () => result }), WorkspacePersistenceError);
    assert.equal(original.deals[0].title, 'Original');
  }
});

test('an asynchronous command cannot trigger persistence or change the original', () => {
  const original = { deals: [] };
  let calls = 0;
  assert.throws(() => commitWorkspace(original, async candidate => {
    candidate.deals.push({ id: 'uncommitted' });
  }, { save() { calls++; } }), /complete synchronously/);
  assert.equal(calls, 0);
  assert.deepEqual(original.deals, []);
});

test('frozen issued snapshots remain protected while the working revision remains editable', () => {
  const issued = Object.freeze({ revision: 0, lines: Object.freeze([Object.freeze({ price: 100 })]) });
  const original = { deals: [{ quotes: [{ revisions: [issued], working: { revision: 1, note: '' } }] }] };
  const committed = commitWorkspace(original, candidate => {
    const quote = candidate.deals[0].quotes[0];
    assert.ok(Object.isFrozen(quote.revisions[0]));
    assert.ok(Object.isFrozen(quote.revisions[0].lines[0]));
    assert.throws(() => { quote.revisions[0].lines[0].price = 999; }, TypeError);
    quote.working.note = 'Updated draft';
    return quote;
  }, { save() {} });
  assert.equal(committed.result.working.note, 'Updated draft');
  assert.equal(original.deals[0].quotes[0].working.note, '');
  assert.equal(committed.result.revisions[0].lines[0].price, 100);
});

test('native quote issue rolls back on failed save and succeeds exactly once on explicit retry', () => {
  const original = { version: 1, deals: [] };
  const deal = S.createDeal(original, {
    title: 'Persistence validation', customer: 'Synthetic test customer', owner: 'Demo sales', crm_id: 'TEST-CRM',
    scope: { application: 'Package hardware kits', bag_dimensions: '12 × 16 in', throughput: '25 bags/min' },
  });
  const quote = S.addQuote(catalog, deal, { machine_id: 'r3200', label: 'Test configuration' });
  S.reviewQuote(catalog, deal, quote, 'application', 'sales');
  S.issueQuote(catalog, deal, quote, 'sales');
  S.reviseQuote(deal, quote, 'Customer requests a revised proposal');
  S.reviewQuote(catalog, deal, quote, 'application', 'sales');
  const before = JSON.stringify(original), historyCount = quote.revisions.length;
  const issue = candidate => {
    const nextDeal = S.findDeal(candidate, deal.id), nextQuote = S.findQuote(nextDeal, quote.id);
    return S.issueQuote(catalog, nextDeal, nextQuote, 'sales');
  };
  assert.throws(() => commitWorkspace(original, issue, { save() { throw new Error('Storage full'); } }), WorkspacePersistenceError);
  assert.equal(JSON.stringify(original), before);
  assert.equal(quote.working.status, 'draft');
  assert.equal(quote.revisions.length, historyCount);

  let stored;
  const committed = commitWorkspace(original, issue, { save(serialized) { stored = serialized; } });
  assert.equal(committed.result.working.status, 'issued');
  assert.equal(committed.result.revisions.length, historyCount + 1);
  assert.ok(Object.isFrozen(committed.result.revisions.at(-1)));
  assert.deepEqual(committed.state, JSON.parse(stored));
  let duplicateWrites = 0;
  assert.throws(() => commitWorkspace(committed.state, issue, { save() { duplicateWrites++; } }), /Create a new revision/);
  assert.equal(duplicateWrites, 0);
  assert.equal(committed.result.revisions.length, historyCount + 1);
});
