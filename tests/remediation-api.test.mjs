import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createPacServer } from '../server/app.mjs';
import * as S from '../src/sales-domain.js';
import * as C from '../src/catalog.js';
import { stageQuoteChange } from '../src/quote-edit-session.js';
import { proposalComparison } from '../src/proposal-comparison.js';

// Each test owns a disposable database and random loopback port. No request is
// sent to the interactive 4361 demo or its saved customer/proposal records.
async function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pac-remediation-test-'));
  const dbPath = path.join(directory, 'workspace.sqlite');
  let instance = createPacServer({ dbPath });
  const start = async () => {
    await new Promise(resolve => instance.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${instance.server.address().port}`;
  };
  let base = await start();
  t.after(async () => {
    if (instance.server.listening) await new Promise(resolve => instance.server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const request = async (route, { method = 'GET', cookie, body } = {}) => {
    const response = await fetch(base + route, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json().catch(() => null), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const login = async role => {
    const response = await request('/api/login', { method: 'POST', body: { email: `${role}@pac.demo`, password: 'pac-demo-2026' } });
    assert.equal(response.status, 200);
    return response.cookie;
  };
  const command = (cookie, version, name, args = {}, requestId = randomUUID()) => request('/api/workspace/commands', {
    method: 'POST', cookie, body: { command: name, args, expectedVersion: version, requestId },
  });
  const restart = async () => {
    await new Promise(resolve => instance.server.close(resolve));
    instance = createPacServer({ dbPath });
    base = await start();
  };
  return { request, login, command, restart, get catalog() { return instance.catalog; }, get store() { return instance.store; } };
}

async function editingScenario(t) {
  const f = await fixture(t);
  const sales = await f.login('sales'), engineering = await f.login('engineering'), manager = await f.login('manager');
  let current = (await f.request('/api/workspace', { cookie: sales })).data;
  const dealId = current.state.deals[0].id, quoteId = current.state.deals[0].quotes[1].id;
  const act = async (command, args = {}, cookie = sales, requestId) => {
    const result = await f.command(cookie, current.version, command, { dealId, quoteId, ...args }, requestId);
    assert.equal(result.status, 200, `${command}: ${JSON.stringify(result.data)}`);
    current = result.data;
    return current.result;
  };
  await act('reviseQuote', { note: 'Isolated remediation acceptance fixture' });
  return {
    f, sales, engineering, manager, dealId, quoteId, act,
    get current() { return current; },
    get deal() { return S.findDeal(current.state, dealId); },
    get quote() { return S.findQuote(S.findDeal(current.state, dealId), quoteId); },
    async reload() { current = (await f.request('/api/workspace', { cookie: sales })).data; return current; },
  };
}

async function pricedEngineering(s) {
  const item = await s.act('saveEngineering', { input: { description: 'Acceptance fixture: loading clearance', reason: 'Check operator access in the illustrative application.' } });
  await s.act('saveEngineering', { input: { id: item.id, description: item.description, reason: item.reason, hours: 2, materials: 75 } }, s.engineering);
}

test('remediation API enforces review roles and rejects client actor/role escalation', async t => {
  const s = await editingScenario(t);
  await pricedEngineering(s);
  const bad = async (cookie, name, args) => {
    const response = await s.f.command(cookie, s.current.version, name, { dealId: s.dealId, quoteId: s.quoteId, ...args });
    assert.equal(response.status, 403, JSON.stringify(response.data));
    assert.equal(response.data.error?.code || response.data.code, 'FORBIDDEN');
  };
  await bad(s.sales, 'requestQuoteChanges', { kind: 'engineering', reason: 'Forged authority', role: 'manager', identity: { id: 'pac-manager' } });
  await bad(s.sales, 'reviewQuote', { kind: 'engineering', role: 'engineering' });
  await bad(s.engineering, 'requestQuoteChanges', { kind: 'manager', reason: 'Forged commercial authority', role: 'manager' });
  await bad(s.engineering, 'submitQuoteReview', { kind: 'engineering', role: 'sales' });
  await bad(s.engineering, 'updateScope', { input: { application: 'Unauthorized scope replacement' }, role: 'sales' });
  await s.act('submitQuoteReview', { kind: 'engineering', note: 'Review the loading clearance.', role: 'manager', identity: { id: 'forged' } });
  const pending = S.reviewStatus(s.deal, s.quote, 'engineering');
  assert.equal(pending.requested_by.id, 'pac-sales');
  assert.equal(pending.requested_by.role, 'sales');
  assert.equal(pending.assigned_role, 'engineering');
  const invalidKind = await s.f.command(s.manager, s.current.version, 'requestQuoteChanges', { dealId: s.dealId, quoteId: s.quoteId, kind: 'admin', reason: 'Invalid review' });
  assert.equal(invalidKind.status, 400);
});

test('returned review requires a reason and explicit sales resubmission; retries are idempotent', async t => {
  const s = await editingScenario(t);
  await pricedEngineering(s);
  await s.act('submitQuoteReview', { kind: 'engineering', note: 'Initial handoff' });
  for (const reason of ['', '   ', 'x'.repeat(2001)]) {
    const invalid = await s.f.command(s.engineering, s.current.version, 'requestQuoteChanges', { dealId: s.dealId, quoteId: s.quoteId, kind: 'engineering', reason });
    assert.equal(invalid.status, 400);
  }
  const requestId = randomUUID(), version = s.current.version;
  const args = { dealId: s.dealId, quoteId: s.quoteId, kind: 'engineering', reason: 'Please specify the required clearance.' };
  await s.act('requestQuoteChanges', args, s.engineering, requestId);
  const historyLength = s.quote.review_history.length;
  const replay = await s.f.command(s.engineering, version, 'requestQuoteChanges', args, requestId);
  assert.equal(replay.status, 200);
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.version, s.current.version);
  assert.equal(replay.data.result.review_history.length, historyLength);
  const reused = await s.f.command(s.engineering, s.current.version, 'requestQuoteChanges', { ...args, reason: 'Different request payload' }, requestId);
  assert.equal(reused.status, 409);
  let rejected = await s.f.command(s.engineering, s.current.version, 'reviewQuote', { dealId: s.dealId, quoteId: s.quoteId, kind: 'engineering' });
  assert.equal(rejected.status, 400);
  assert.match(JSON.stringify(rejected.data), /resubmit/i);
  assert.equal((await s.f.command(s.sales, s.current.version, 'issueQuote', { dealId: s.dealId, quoteId: s.quoteId })).status, 400);
  await s.f.restart();
  await s.reload();
  assert.equal(S.reviewStatus(s.deal, s.quote, 'engineering').status, 'changes_requested');
  assert.equal(S.reviewStatus(s.deal, s.quote, 'engineering').reason, args.reason);
  const replayAfterRestart = await s.f.command(s.engineering, version, 'requestQuoteChanges', args, requestId);
  assert.equal(replayAfterRestart.status, 200);
  assert.equal(replayAfterRestart.data.replayed, true);
  assert.equal(replayAfterRestart.data.version, s.current.version);
  assert.equal(replayAfterRestart.data.result.review_history.length, historyLength);
  await s.act('submitQuoteReview', { kind: 'engineering', note: 'Clearance confirmed for the test application.' });
  await s.act('reviewQuote', { kind: 'engineering', identity: { id: 'forged' } }, s.engineering);
  assert.equal(S.reviewStatus(s.deal, s.quote, 'engineering').status, 'approved');
  assert.equal(s.quote.working.approvals.engineering.actor.id, 'pac-engineering');
});

test('scope changes after a pending or approved submission require resubmission before approval', async t => {
  const s = await editingScenario(t);
  await pricedEngineering(s);
  await s.act('submitQuoteReview', { kind: 'engineering' });
  await s.act('updateScope', { input: { application: 'Revised illustrative product loading application.' } });
  assert.equal(S.reviewStatus(s.deal, s.quote, 'engineering').status, 'needs_resubmission');
  let rejected = await s.f.command(s.engineering, s.current.version, 'reviewQuote', { dealId: s.dealId, quoteId: s.quoteId, kind: 'engineering' });
  assert.equal(rejected.status, 400);
  await s.act('submitQuoteReview', { kind: 'engineering' });
  await s.act('reviewQuote', { kind: 'engineering' }, s.engineering);
  await s.act('updateScope', { input: { bag_dimensions: '14 × 18 in' } });
  assert.equal(s.quote.working.approvals.engineering, undefined);
  assert.equal(S.reviewStatus(s.deal, s.quote, 'engineering').status, 'needs_resubmission');
  rejected = await s.f.command(s.engineering, s.current.version, 'reviewQuote', { dealId: s.dealId, quoteId: s.quoteId, kind: 'engineering' });
  assert.equal(rejected.status, 400);
  assert.match(JSON.stringify(rejected.data), /resubmit/i);
});

test('legacy direct approval remains compatible but cannot bypass a later returned review', async t => {
  const s = await editingScenario(t);
  await pricedEngineering(s);
  assert.equal(S.reviewStatus(s.deal, s.quote, 'engineering').status, 'not_requested');
  await s.act('reviewQuote', { kind: 'engineering' }, s.engineering);
  assert.equal(s.quote.working.review_requests.engineering.explicit_submission, false);
  await s.act('updateScope', { input: { notes: 'Illustrative legacy path; PAC policy is not asserted.' } });
  assert.equal(S.reviewStatus(s.deal, s.quote, 'engineering').status, 'not_requested');
  await s.act('reviewQuote', { kind: 'engineering' }, s.engineering);
  await s.act('requestQuoteChanges', { kind: 'engineering', reason: 'Reconfirm the loading detail.' }, s.engineering);
  assert.equal((await s.f.command(s.engineering, s.current.version, 'reviewQuote', { dealId: s.dealId, quoteId: s.quoteId, kind: 'engineering' })).status, 400);
  await s.act('submitQuoteReview', { kind: 'engineering' });
  await s.act('reviewQuote', { kind: 'engineering' }, s.engineering);
  assert.equal(s.quote.working.review_requests.engineering.explicit_submission, true);
  await s.act('reviewQuote', { kind: 'application' });
  const previousRevision = JSON.stringify(s.quote.revisions[0]);
  await s.act('issueQuote');
  const issuedRevision = JSON.stringify(s.quote.revisions.at(-1));
  assert.equal(s.quote.revisions.at(-1).review_requests.engineering.explicit_submission, true);
  await s.act('reviseQuote', { note: 'A new draft must not inherit completed approval authority.' });
  assert.deepEqual(s.quote.working.approvals, {});
  assert.equal(S.reviewStatus(s.deal, s.quote, 'engineering').status, 'not_requested');
  assert.equal(JSON.stringify(s.quote.revisions[0]), previousRevision);
  assert.equal(JSON.stringify(s.quote.revisions.at(-1)), issuedRevision);
  assert.equal((await s.f.command(s.sales, s.current.version, 'issueQuote', { dealId: s.dealId, quoteId: s.quoteId })).status, 400);
});

test('configuration payload cannot forge or erase review handoff and cannot bypass required companions', async t => {
  const s = await editingScenario(t);
  await pricedEngineering(s);
  await s.act('submitQuoteReview', { kind: 'engineering' });
  await s.act('requestQuoteChanges', { kind: 'engineering', reason: 'Operator detail needs confirmation.' }, s.engineering);
  const protectedRequests = structuredClone(s.quote.working.review_requests);
  const history = structuredClone(s.quote.review_history);
  const entry = stageQuoteChange(s.deal, s.quoteId, null, (deal, quote) => S.selectOption(s.f.catalog, deal, quote, C.getOption(s.f.catalog, 'r3200', 'spare_parts_kit')));
  for (const alteredRequests of [{}, { engineering: { status: 'approved', reviewer: { id: 'forged' }, fingerprint: 'forged' } }]) {
    const forged = structuredClone(entry);
    forged.working.review_requests = alteredRequests;
    forged.working.approvals = { engineering: { fingerprint: 'forged', actor: { id: 'pac-engineering' } } };
    const response = await s.f.command(s.sales, s.current.version, 'saveQuoteEdit', { entry: forged });
    assert.ok([200, 400].includes(response.status), JSON.stringify(response.data));
    await s.reload();
    assert.deepEqual(s.quote.working.review_requests, protectedRequests);
    assert.deepEqual(s.quote.review_history, history);
    assert.deepEqual(s.quote.working.approvals, {});
    assert.equal(S.reviewStatus(s.deal, s.quote, 'engineering').status, 'changes_requested');
    // A legitimate first save may make this old editor stale. Use its new basis
    // for the second independent forgery while keeping the same safe selection.
    if (response.status === 200) {
      const fresh = stageQuoteChange(s.deal, s.quoteId, null, () => {});
      Object.assign(entry, fresh);
    }
  }
  const missing = stageQuoteChange(s.deal, s.quoteId, null, () => {});
  missing.working.draft.lines = missing.working.draft.lines.filter(line => line.option_id !== 'seal_flattener_fingers');
  assert.equal((await s.f.command(s.sales, s.current.version, 'saveQuoteEdit', { entry: missing })).status, 400);
  assert.equal((await s.f.command(s.engineering, s.current.version, 'reviewQuote', { dealId: s.dealId, quoteId: s.quoteId, kind: 'engineering' })).status, 400);
});

test('an editor staged before a review handoff cannot overwrite the newer saved review state', async t => {
  const s = await editingScenario(t);
  const entry = stageQuoteChange(s.deal, s.quoteId, null, (deal, quote) => S.selectOption(s.f.catalog, deal, quote, C.getOption(s.f.catalog, 'r3200', 'spare_parts_kit')));
  await s.act('submitQuoteReview', { kind: 'application', note: 'Review exact saved content.' });
  const before = structuredClone(s.quote.working.review_requests);
  const response = await s.f.command(s.sales, s.current.version, 'saveQuoteEdit', { entry });
  assert.equal(response.status, 409);
  await s.reload();
  assert.deepEqual(s.quote.working.review_requests, before);
  assert.equal(s.quote.working.draft.lines.some(line => line.option_id === 'spare_parts_kit'), false);
});

test('customer decisions publish as fixed public fields; old stored internal fields stay private and immutable', async t => {
  const f = await fixture(t), sales = await f.login('sales');
  let current = (await f.request('/api/workspace', { cookie: sales })).data;
  const dealId = current.state.deals[0].id, oldId = current.state.deals[0].proposals[0].id;
  // Emulate a pre-remediation persisted proposal, including an unknown internal
  // field. This fixture never changes any local interactive demo database.
  const legacy = structuredClone(current.state);
  Object.assign(legacy.deals[0].proposals[0].snapshot, { next_action: 'INTERNAL-LEGACY-SENTINEL', next_action_date: '2099-01-02', crm_id: 'INTERNAL-CRM-SENTINEL', internal_sales_note: 'INTERNAL-NOTE-SENTINEL' });
  delete legacy.deals[0].proposals[0].snapshot.customer_next_decision;
  delete legacy.deals[0].proposals[0].snapshot.customer_decision_date;
  f.store.db.prepare('UPDATE workspace SET state=? WHERE id=1').run(JSON.stringify(legacy));
  const legacyStored = JSON.stringify(legacy.deals[0].proposals[0]);
  const share = async proposalId => {
    const response = await f.request('/api/shares', { method: 'POST', cookie: sales, body: { dealId, proposalId, recipientName: 'Isolated acceptance buyer', requestId: randomUUID() } });
    assert.equal(response.status, 201);
    return `/api/customer/${response.data.token}`;
  };
  const oldRoute = await share(oldId);
  const before = (await f.request(oldRoute)).data.proposal;
  assert.equal(before.customer_next_decision, '');
  assert.equal(before.customer_decision_date, '');
  for (const key of ['next_action', 'next_action_date', 'crm_id', 'internal_sales_note']) assert.equal(before[key], undefined);
  assert.equal(/INTERNAL-(LEGACY|CRM|NOTE)-SENTINEL/.test(JSON.stringify(before)), false);
  const act = async (name, args) => {
    const response = await f.command(sales, current.version, name, { dealId, ...args });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    current = response.data;
    return current.result;
  };
  await act('updateDeal', { input: { next_action: 'INTERNAL-CURRENT-SENTINEL', next_action_date: '2099-02-03', customer_next_decision: 'Compare the loading approaches with PAC.', customer_decision_date: '2026-11-20' } });
  const publication = await act('publishProposal');
  const publishedRoute = await share(publication.id);
  const published = (await f.request(publishedRoute)).data.proposal;
  assert.equal(published.customer_next_decision, 'Compare the loading approaches with PAC.');
  assert.equal(published.customer_decision_date, '2026-11-20');
  assert.equal(JSON.stringify(published).includes('INTERNAL-CURRENT-SENTINEL'), false);
  assert.deepEqual(published.alternatives.map(a => a.totals.total), [33060, 40810]);
  await act('updateDeal', { input: { customer_next_decision: 'Later unpublished decision.', customer_decision_date: '2026-12-01', next_action: 'Different internal follow-up' } });
  await f.restart();
  assert.deepEqual((await f.request(publishedRoute)).data.proposal, published);
  assert.deepEqual((await f.request(oldRoute)).data.proposal, before);
  const stored = (await f.request('/api/workspace', { cookie: sales })).data;
  assert.equal(JSON.stringify(stored.state.deals[0].proposals[0]), legacyStored);
  assert.equal(stored.state.deals[0].customer_next_decision, 'Later unpublished decision.');
});

test('customer field editing cannot replace protected state and validates bounded copy/date format', async t => {
  const s = await editingScenario(t);
  const proposals = JSON.stringify(s.deal.proposals), scope = JSON.stringify(s.deal.scope);
  await s.act('updateDeal', { input: { customer_next_decision: 'Confirm your preferred loading approach.', customer_decision_date: '2026-11-30', quotes: [], proposals: [], scope: { application: 'Forged scope' }, review_requests: { application: { status: 'approved' } } } });
  assert.equal(JSON.stringify(s.deal.proposals), proposals);
  assert.equal(JSON.stringify(s.deal.scope), scope);
  assert.equal(s.deal.review_requests, undefined);
  assert.equal(s.deal.quotes.length, 2);
  for (const input of [{ customer_next_decision: 'x'.repeat(2001) }, ...['tomorrow', '2026-99-99', '2026-02-29', '2026-04-31', '2026-11-00', '2026-11-30T00:00:00Z'].map(customer_decision_date => ({ customer_decision_date }))]) {
    assert.equal((await s.f.command(s.sales, s.current.version, 'updateDeal', { dealId: s.dealId, input })).status, 400);
  }
  await s.reload();
  assert.equal(s.deal.customer_decision_date, '2026-11-30');
  assert.equal(s.deal.customer_next_decision, 'Confirm your preferred loading approach.');
});

test('createDeal validates the same customer fields before committing and accepts an actual leap day', async t => {
  const f = await fixture(t), sales = await f.login('sales');
  const current = (await f.request('/api/workspace', { cookie: sales })).data;
  const input = { title: 'Isolated calendar case', customer: 'Illustrative buyer', owner: 'PAC sales', customer_next_decision: 'Review the application together.' };
  for (const invalid of [{ customer_next_decision: 'x'.repeat(2001) }, ...['2026-02-29', '2026-04-31', '2026-13-01', '2026-11-08T12:00:00Z'].map(customer_decision_date => ({ customer_decision_date }))]) {
    const response = await f.command(sales, current.version, 'createDeal', { input: { ...input, ...invalid } });
    assert.equal(response.status, 400, JSON.stringify(response.data));
  }
  const afterInvalid = (await f.request('/api/workspace', { cookie: sales })).data;
  assert.equal(afterInvalid.version, current.version);
  assert.deepEqual(afterInvalid.state, current.state);
  const created = await f.command(sales, current.version, 'createDeal', { input: { ...input, customer_decision_date: '2028-02-29' } });
  assert.equal(created.status, 200);
  assert.equal(created.data.result.customer_decision_date, '2028-02-29');
  const cleared = await f.command(sales, created.data.version, 'updateDeal', { dealId: created.data.result.id, input: { customer_next_decision: '', customer_decision_date: '' } });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.data.result.customer_next_decision, '');
  assert.equal(cleared.data.result.customer_decision_date, '');
});

test('proposal comparison explains original A/B delta without treating shared training as an extra', async t => {
  const f = await fixture(t), sales = await f.login('sales');
  const workspace = (await f.request('/api/workspace', { cookie: sales })).data;
  const deal = workspace.state.deals[0], proposal = S.publicProposal(deal, deal.proposals[0].id), before = JSON.stringify(proposal);
  const comparison = proposalComparison(proposal), assisted = comparison.alternatives[1];
  assert.equal(comparison.shared.length, 2);
  assert.ok(comparison.shared.some(row => /training/i.test(row.label)));
  assert.equal(assisted.delta, 7750);
  assert.deepEqual(assisted.added.map(line => line.total ?? line.price_usd * line.quantity), [6035, 1715]);
  assert.equal(assisted.added.some(line => /training/i.test(line.name)), false);
  assert.equal(comparison.alternatives[0].delta, 0);
  assert.equal(JSON.stringify(proposal), before);
});

test('proposal comparison retains repeated engineering scope and reports discounts and removals separately', () => {
  const base = { machine_id: 'test-machine', lines: [{ name: 'Base', line_class: 'catalog_base', quantity: 1, price_usd: 100, total: 100 }], special: [], photo: null };
  const input = { alternatives: [
    { ...base, quote_id: 'a', label: 'A', engineering: [{ description: 'Fixture', price: 10 }, { description: 'Fixture', price: 20 }], totals: { total: 130, discount: 0 } },
    { ...base, quote_id: 'b', label: 'B', engineering: [{ description: 'Fixture', price: 10 }], totals: { total: 105, discount: 5 } },
  ] };
  const comparison = proposalComparison(input), b = comparison.alternatives[1];
  assert.equal(comparison.shared.length, 2);
  assert.equal(comparison.differences.length, 1);
  assert.equal(b.removed.length, 1);
  assert.equal(b.removed[0].price, 20);
  assert.equal(b.delta, -25);
  assert.equal(b.discount_delta, 5);
});
