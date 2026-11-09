import test from 'node:test';
import assert from 'node:assert/strict';
import { BASIS, initialState, clone, money, quoteLines, quoteTotal, validateQuote, saveQuote, approveQuote, publishProposal, reviseQuote, addComment, publicProjection } from './domain.mjs';

const ready = () => {
  const s = initialState();
  for (const id of ['a', 'b']) { saveQuote(s, id); approveQuote(s, id); }
  return s;
};
const issued = () => { const s = ready(); publishProposal(s); return s; };

test('dated sample A/B prices reconcile with customer line items', () => {
  const s = initialState();
  assert.equal(BASIS.date, '2025-01-29');
  assert.equal(quoteTotal(s.quotes.a), 33060);
  assert.equal(quoteTotal(s.quotes.b), 40810);
  assert.equal(quoteTotal(s.quotes.b) - quoteTotal(s.quotes.a), 7750);
  assert.deepEqual(quoteLines(s.quotes.b).map(line => line.id), ['base', 'opener', 'fingers', 'training']);
  assert.equal(s.quotes.b.status, 'draft');
  assert.equal(money(null), 'Pending');
});

test('training can be removed and quantity applies only to machines and machine options', () => {
  const q = initialState().quotes.b;
  q.quantity = 2;
  assert.equal(quoteTotal(q), 76140);
  q.training = false;
  assert.equal(quoteTotal(q), 70660);
});

test('unknown engineering price can be saved but never priced at zero or approved', () => {
  const s = initialState(), q = s.quotes.b;
  q.engineering = { enabled: true, description: 'Custom loading guide', amount: null, leadWeeks: 2 };
  assert.equal(quoteTotal(q), null);
  assert.equal(quoteLines(q).at(-1).total, null);
  saveQuote(s, 'b');
  assert.equal(q.status, 'saved');
  assert.throws(() => approveQuote(s, 'b'), /Pending is not zero/);
  q.engineering.amount = 0;
  saveQuote(s, 'b'); approveQuote(s, 'b');
  assert.equal(quoteTotal(q), 40810);
});

test('engineering description and lead time must be explicit before approval', () => {
  const s = initialState();
  s.quotes.b.engineering = { enabled: true, description: '', amount: 1500, leadWeeks: null };
  saveQuote(s, 'b');
  assert.throws(() => approveQuote(s, 'b'), /Describe/);
  s.quotes.b.engineering.description = 'Loading guide'; saveQuote(s, 'b');
  assert.throws(() => approveQuote(s, 'b'), /lead time/);
});

test('opener width and companion are enforced independently of editor controls', () => {
  const s = initialState();
  s.scope.width = 9; s.quotes.b.fingers = false; saveQuote(s, 'b');
  assert(validateQuote(s, 'b').some(item => /10 inches/.test(item)));
  assert(validateQuote(s, 'b').some(item => /Flattener Fingers/.test(item)));
  assert.throws(() => approveQuote(s, 'b'), /10 inches/);
  s.scope.width = 12; saveQuote(s, 'b');
  assert.throws(() => approveQuote(s, 'b'), /Flattener Fingers/);
});

test('quote input edits invalidate a saved approval even when UI status stays approved', () => {
  const s = ready(); s.quotes.b.training = false;
  assert.throws(() => publishProposal(s), /Save the current/);
  assert.equal(s.publications.length, 0);
  saveQuote(s, 'b'); assert.equal(s.quotes.b.approvedFingerprint, null);
  assert.throws(() => publishProposal(s), /Save and approve/);
  approveQuote(s, 'b'); assert.equal(publishProposal(s).quotes.b.total, 35330);
});

test('scope edits invalidate both alternative approvals', () => {
  const s = ready(); s.scope.width = 14;
  assert.throws(() => publishProposal(s), /Save the current/);
  saveQuote(s, 'b'); approveQuote(s, 'b');
  assert.throws(() => publishProposal(s), /Standard loading/);
  saveQuote(s, 'a'); approveQuote(s, 'a');
  assert.equal(publishProposal(s).scope.width, 14);
});

test('publishing requires both alternatives to be approved, with no partial mutation', () => {
  const s = initialState(); saveQuote(s, 'b'); approveQuote(s, 'b');
  const before = clone(s);
  assert.throws(() => publishProposal(s), /Standard loading/);
  assert.deepEqual(s, before);
});

test('published snapshots are frozen and independent of mutable drafts', () => {
  const s = issued(), v1 = s.publications[0];
  assert(Object.isFrozen(v1)); assert(Object.isFrozen(v1.quotes.b.lines[0]));
  assert.throws(() => { v1.scope.width = 16; }, TypeError);
  assert.throws(() => { v1.quotes.b.lines[0].total = 1; }, TypeError);
  s.quotes.b.note = 'Attempted direct edit';
  assert.throws(() => publishProposal(s), /published quote/);
  assert.throws(() => saveQuote(s, 'b'), /read-only/);
  assert.equal(v1.quotes.b.note, '');
  assert.equal(reviseQuote(s, 'b').note, '');
});

test('B revision produces V2 while A and V1 remain unchanged', () => {
  const s = issued(), first = clone(s.publications[0]);
  const b = reviseQuote(s, 'b');
  assert.equal(b.revision, 1); assert.equal(b.status, 'draft');
  b.engineering = { enabled: true, description: 'Custom loading guide', amount: 1500, leadWeeks: 2 };
  saveQuote(s, 'b'); approveQuote(s, 'b');
  const second = publishProposal(s);
  assert.equal(second.version, 2); assert.equal(second.quotes.b.total, 42310);
  assert.equal(second.quotes.a.revision, 0); assert.equal(second.quotes.b.revision, 1);
  assert.deepEqual(s.publications[0], first);
  assert.equal(second.quotes.b.engineering.leadWeeks, 2);
  assert.equal(quoteTotal(second.quotes.b), 42310);
});

test('a saved engineering price or lead time edit must be reviewed again', () => {
  const s = issued(), b = reviseQuote(s, 'b');
  b.engineering = { enabled: true, description: 'Loading guide', amount: 1500, leadWeeks: 2 };
  saveQuote(s, 'b'); approveQuote(s, 'b'); b.engineering.leadWeeks = 4;
  assert.throws(() => publishProposal(s), /Save the current/);
  assert.equal(s.publications.length, 1);
});

test('repeat publish is idempotent and revision number alone cannot create a new offer', () => {
  const s = issued(), v1 = s.publications[0];
  assert.equal(publishProposal(s), v1); assert.equal(s.publications.length, 1);
  reviseQuote(s, 'b'); saveQuote(s, 'b'); approveQuote(s, 'b');
  assert.throws(() => publishProposal(s), /no customer-facing changes/);
  assert.equal(s.publications.length, 1);
});

test('public projection is an allowlist and does not leak internal record fields', () => {
  const s = ready();
  s.deal.owner = 'Private owner'; s.deal.internalMargin = 0.8;
  s.quotes.b.engineering.cost = 400; s.quotes.b.internalMargin = 0.8;
  const v = publishProposal(s), poisoned = clone(v);
  poisoned.owner = 'Private'; poisoned.customer.email = 'private@example.com';
  poisoned.quotes.b.savedSnapshot = { internal: true };
  poisoned.quotes.b.approvedFingerprint = 'secret';
  poisoned.quotes.b.engineering.internalCost = 400;
  poisoned.quotes.b.lines[0].internalCost = 10;
  const p = publicProjection(poisoned);
  const wire = JSON.stringify(p);
  for (const value of ['owner', 'email', 'savedSnapshot', 'approvedFingerprint', 'internalMargin', 'internalCost']) assert.equal(wire.includes(value), false, value);
  assert.equal(p.quotes.b.total, 40810);
  assert.deepEqual(Object.keys(p.quotes.b.engineering), ['enabled', 'description', 'leadWeeks']);
});

test('comments bind exact historical version and revision, never latest by fallback', () => {
  const s = issued();
  const v1comment = addComment(s, { version: 1, alternative: 'B', topic: 'Loading', author: 'Alex', text: 'Could we add a guide?' });
  assert.equal(v1comment.alternative, 'b'); assert.equal(v1comment.revision, 0);
  reviseQuote(s, 'b'); s.quotes.b.note = 'Guide discussion remains open.'; saveQuote(s, 'b'); approveQuote(s, 'b'); publishProposal(s);
  const v2comment = addComment(s, { version: 2, alternative: 'b', author: 'Alex', text: 'Thanks.' });
  assert.equal(v2comment.revision, 1); assert.equal(v1comment.status, 'open');
  const count = s.comments.length;
  assert.throws(() => addComment(s, { version: 99, alternative: 'b', author: 'Alex', text: 'Wrong version' }), /existing/);
  assert.throws(() => addComment(s, { alternative: 'b', author: 'Alex', text: 'Missing version' }), /existing/);
  assert.throws(() => addComment(s, { version: 2, alternative: 'c', author: 'Alex', text: 'Wrong quote' }), /alternative/);
  assert.equal(s.comments.length, count);
});

test('projecting an engineering offer retains the issued customer line without exposing raw inputs', () => {
  const s = initialState();
  s.quotes.b.engineering = { enabled: true, description: 'Guide', amount: 1500, leadWeeks: 2, internalCost: 400 };
  for (const id of ['a', 'b']) { saveQuote(s, id); approveQuote(s, id); }
  const issued = clone(publishProposal(s));
  issued.quotes.b.savedSnapshot = { private: true };
  const p = publicProjection(issued);
  assert.equal(p.quotes.b.total, 42310);
  assert.equal(p.quotes.b.lines.at(-1).total, 1500);
  assert.equal('amount' in p.quotes.b.engineering, false);
  assert.equal('savedSnapshot' in p.quotes.b, false);
});

test('state survives JSON persistence and still enforces saved approval fingerprints', () => {
  const restored = clone(ready());
  assert.equal(publishProposal(restored).version, 1);
  const again = clone(restored); again.scope.material = 'Changed';
  assert.throws(() => publishProposal(again), /published quote/);
});
