import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKSPACE_STEPS, workspaceAt, assertWorkspaceStep, createAlternatives,
  customerPublication, quotePlanningWeeks, quoteTotal, quoteLines,
} from './scenario.mjs';
import { clone, saveQuote, approveQuote, publishProposal, reviseQuote, validateQuote } from '../application/domain.mjs';

const issuedState = () => clone(workspaceAt('A24').state);

test('every checkpoint is deterministic, passes postconditions and uses stable audit identities', () => {
  for (const id of WORKSPACE_STEPS) {
    const first = workspaceAt(id), again = workspaceAt(id);
    assert.deepEqual(first, again, id);
    assert.equal(assertWorkspaceStep(first), true, id);
    assert.equal(new Set(first.state.meta.events.map(e => e.id)).size, first.state.meta.events.length, id);
  }
  assert.throws(() => workspaceAt('A01'), /Unknown Workspace step/);
  assert.throws(() => workspaceAt('B99'), /Unknown Workspace step/);
});

test('required information blocks quote creation rather than silently filling unknowns', () => {
  const r = workspaceAt('A08');
  assert.equal(r.state.scope.width, null);
  assert.equal(r.state.scope.length, null);
  assert.equal(r.state.meta.quotesCreated, false);
  assert.equal(r.expectedBlock.code, 'MISSING_REQUIRED');
  const s = clone(r.state), before = clone(s);
  assert.throws(() => createAlternatives(s), /bag width and length/);
  assert.deepEqual(s, before);
  const clarified = workspaceAt('A09');
  assert.equal(clarified.state.meta.clarification.suggested.width, 12);
  assert.equal(clarified.state.scope.width, null);
  assert.equal(workspaceAt('A10').state.scope.width, 12);
  assert.equal(workspaceAt('A10').state.meta.quotesCreated, false);
  assert.equal(workspaceAt('A11').state.meta.quotesCreated, true);
});

test('opener dependency blocks actual approval and resolves with the required fingers', () => {
  const blocked = workspaceAt('A12');
  assert.equal(quoteTotal(blocked.state.quotes.b), 39095);
  assert.equal(blocked.expectedBlock.code, 'OPTION_DEPENDENCY');
  assert.throws(() => approveQuote(blocked.state, 'b'), /Flattener Fingers/);
  const complete = workspaceAt('A13');
  assert.equal(quoteTotal(complete.state.quotes.b), 40810);
  assert.equal(complete.state.quotes.b.status, 'draft');
  assert.deepEqual(quoteLines(complete.state.quotes.b).filter(l => l.id === 'training').map(l => [l.quantity, l.total]), [[1, 5480]]);
});

test('price visibility is a view preference and never changes commercial values', () => {
  const hidden = workspaceAt('A14'), visible = workspaceAt('A15');
  assert.equal(hidden.state.meta.priceVisible, false);
  assert.equal(visible.state.meta.priceVisible, true);
  assert.deepEqual(hidden.state.quotes, visible.state.quotes);
  assert.deepEqual(hidden.state.publications, visible.state.publications);
});

test('save, approvals and publication are distinct operations and actor records bind exact revisions', () => {
  const saved = workspaceAt('A16').state;
  assert.equal(saved.quotes.a.status, 'saved');
  assert.equal(saved.quotes.b.status, 'saved');
  assert.equal(saved.meta.approvalRecords.length, 0);
  assert.throws(() => publishProposal(saved), /Save and approve/);
  const aApproved = workspaceAt('A18').state;
  assert.equal(aApproved.quotes.a.status, 'approved');
  assert.equal(aApproved.quotes.b.status, 'saved');
  assert.throws(() => publishProposal(aApproved), /Assisted loading/);
  assert.deepEqual(aApproved.meta.approvalRecords.map(a => [a.quoteId,a.revision,a.actor]), [['a',0,'Demo reviewer']]);
  const approved = workspaceAt('A19').state;
  assert.equal(approved.publications.length, 0);
  const issued = workspaceAt('A20').state;
  assert.equal(issued.publications.length, 1);
  assert.equal(issued.publications[0].resourceManifest[0].href, './documents/quote-v1.pdf');
});

test('saved engineering uncertainty remains pending and cannot be approved', () => {
  const {state:s,expectedBlock} = workspaceAt('B07');
  assert.equal(s.quotes.b.status, 'saved');
  assert.equal(quoteTotal(s.quotes.b), null);
  assert.equal(quotePlanningWeeks(s.quotes.b), null);
  assert.equal(expectedBlock.code, 'ENGINEERING_INCOMPLETE');
  assert.throws(() => approveQuote(s, 'b'), /labor hours/);
  assert.equal(s.publications[0].quotes.b.total, 40810);
  assert.equal(s.publications[0].quotes.b.engineering.enabled, false);
});

test('engineering estimate and selling price are separate and saved assumptions require reapproval', () => {
  const s = clone(workspaceAt('B10').state), e = s.quotes.b.engineering;
  assert.equal(e.laborHours * e.laborRate + e.materials, e.estimate);
  e.amount = 700; // Different commercial price is valid; no implied cost=price rule.
  saveQuote(s, 'b'); approveQuote(s, 'b');
  assert.equal(quoteTotal(s.quotes.b), 41510);
  e.laborRate = 125;
  assert.throws(() => publishProposal(s), /Recalculate|Save the current/);
  e.estimate = 600;
  assert.throws(() => publishProposal(s), /Save the current/);
  saveQuote(s, 'b');
  assert.throws(() => publishProposal(s), /Save and approve/);
  approveQuote(s, 'b');
  assert.equal(publishProposal(s).quotes.b.total, 41510);
});

test('unknown, mismatched or missing estimate inputs are enforced below the UI', () => {
  for (const [field, value] of [['reason',''],['laborHours',null],['laborRate',null],['materials',null],['estimate',499]]) {
    const s = clone(workspaceAt('B09').state);
    s.quotes.b.engineering[field] = value;
    saveQuote(s, 'b');
    assert.throws(() => approveQuote(s, 'b'), Error, field);
  }
  const s = clone(workspaceAt('B11').state);
  s.quotes.b.baseLeadWeeks = 9;
  assert.throws(() => publishProposal(s), /Save the current/);
  assert(validateQuote(s, 'b').some(message => /approval is out of date/.test(message)));
});

test('B revision preserves issued V1, A Rev0, sample timing and exact document bindings', () => {
  const v1 = workspaceAt('A20').state.publications[0];
  const record = workspaceAt('B12'), s = record.state, v2 = s.publications[1];
  assert.deepEqual(s.publications[0], v1);
  assert.equal(v2.quotes.a.revision, 0);
  assert.equal(v2.quotes.a.total, 33060);
  assert.equal(v2.quotes.b.revision, 1);
  assert.equal(v2.quotes.b.total, 41310);
  assert.equal(v1.quotes.b.planningLeadWeeks, 6);
  assert.equal(v2.quotes.b.planningLeadWeeks, 7);
  assert.equal(v2.resourceManifest[0].href, './documents/quote-v2.pdf');
  assert.deepEqual(v2.resourceManifest[0].totals, {a:33060,b:41310});
  assert(Object.isFrozen(v1));
  assert(Object.isFrozen(v1.resourceManifest));
  assert.throws(() => { v1.resourceManifest[0].totals.b = 1; }, TypeError);
  assert.equal(workspaceAt('B15').view.version, 1);
});

test('customer question and finding remain contextual through publication; response is explicit', () => {
  const pub = workspaceAt('B12').state;
  assert.equal(pub.comments.length, 1);
  assert.equal(pub.findings.length, 1);
  assert.equal(pub.comments[0].reply, undefined);
  assert.deepEqual([pub.comments[0].version,pub.comments[0].alternative,pub.comments[0].revision], [1,'b',0]);
  assert.deepEqual([pub.findings[0].questionId,pub.findings[0].proposalVersion,pub.findings[0].quoteRevision], ['C1',1,0]);
  const replied = workspaceAt('B13').state;
  assert.equal(replied.comments[0].replyVersion, 2);
  assert.equal(replied.comments[0].revision, 0);
  assert.equal(replied.comments[0].status, 'replied');
  assert.equal(replied.meta.lastContact.recordId, 'R1');
  assert.equal(replied.meta.waitingOn, 'Customer sample-review confirmation');
});

test('customer publication excludes internal costs, approval records, findings and drafts', () => {
  const record = workspaceAt('B14'), p = customerPublication(record, 2), wire = JSON.stringify(p);
  assert.equal(p.quotes.b.total, 41310);
  assert.equal(p.quotes.b.engineering.leadWeeks, 1);
  for (const key of ['laborHours','laborRate','materials','estimate','reason','approvedFingerprint','savedSnapshot','findings','approvalRecords','lastContact']) assert.equal(wire.includes(`"${key}"`), false, key);
  assert.equal(Object.isFrozen(p.quotes.b), true);
  assert.throws(() => customerPublication(record, 99), /available published/);
});

test('final checkpoint is follow-up, never acceptance, signature, payment or Website integration', () => {
  const final = workspaceAt('B16'), s = final.state;
  assert.equal(s.deal.stage, 'Awaiting customer');
  assert.equal(s.deal.followUpDate, '2026-11-12');
  assert.equal(s.meta.lastContact.channel, 'Proposal reply');
  assert.equal(s.deal.crmConnection, null);
  assert.equal('inquiryId' in s.deal, false);
  assert.equal('acceptedAt' in s, false);
  assert.equal('payment' in s, false);
  assert.equal('signature' in s, false);
  assert.equal(assertWorkspaceStep(clone(final)), true);
});

test('checkpoint verifier rejects drift rather than letting Next advertise incorrect success', () => {
  const wrong = clone(workspaceAt('B12'));
  wrong.state.publications[0].quotes.b.total = 41310;
  assert.throws(() => assertWorkspaceStep(wrong), /original V1/);
  const duplicate = clone(workspaceAt('B13'));
  duplicate.state.comments.push(clone(duplicate.state.comments[0]));
  assert.throws(() => assertWorkspaceStep(duplicate), /duplicated/);
});
