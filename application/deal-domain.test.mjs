import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, saveQuote, approveQuote, publishProposal, reviseQuote, clone } from './domain.mjs';
import { hydrateDealState, addFinding, markFindingStatus, updateDealDetails } from './deal-domain.mjs';

const capturedView = () => ({
  version: '1', model: { id: 'kinetic-01', revision: 'test-revision' },
  view: {
    viewVersion: '0.1', model: { id: 'kinetic-01', revision: 'test-revision' },
    coordinateFrame: 'normalized-assembly-v1', selectedId: 'slider', scopeId: 'root',
    isolated: false, mode: 'explore', renderStyle: 'engineering', separation: 0,
    displayOptions: { appearance: 'light', grid: false, ambientOcclusion: true, featureEdges: true, hiddenEdges: false, lineWeight: 'standard' },
    operation: null,
    camera: { position: [4, 4, 4], target: [0, 0, 0], up: [0, 1, 0], projection: { kind: 'perspective', verticalFovDegrees: 45, zoom: 1, offsetX: 0, offsetY: 0 }, viewport: { width: 800, height: 600 } },
  },
});
const photoInput = () => ({ kind: 'photo', title: 'Loading station', note: 'Confirm clearance for the hardware kits.', mediaKey: 'sealing', alternative: 'b' });

test('additive hydration preserves every existing domain record and remains idempotent', () => {
  const state = initialState();
  for (const id of ['a', 'b']) { saveQuote(state, id); approveQuote(state, id); }
  publishProposal(state);
  state.comments.push({ id: 'comment-1', text: 'Keep this customer request.' });
  const quotes = state.quotes, publications = state.publications, comments = state.comments;
  const before = clone({ quotes, publications, comments });
  assert.equal(hydrateDealState(state), state);
  assert.equal(state.quotes, quotes); assert.equal(state.publications, publications); assert.equal(state.comments, comments);
  assert.deepEqual({ quotes, publications, comments }, before);
  assert.deepEqual(state.findings, []); assert.equal(state.deal.followUpDate, '');
  state.deal.nextAction = 'Call Alex'; state.deal.followUpDate = '2026-11-09';
  const migrated = clone(state); hydrateDealState(state); assert.deepEqual(state, migrated);
});

test('photo findings bind to the current deal and current quote revision without configuring it', () => {
  const state = hydrateDealState(initialState());
  state.quotes.b.revision = 3;
  const before = clone({ quotes: state.quotes, scope: state.scope, publications: state.publications });
  const finding = addFinding(state, photoInput());
  assert.equal(finding.dealId, state.deal.id); assert.equal(finding.quoteId, 'b'); assert.equal(finding.quoteRevision, 3);
  assert.equal(finding.status, 'open'); assert.equal(finding.kind, 'photo'); assert.equal(finding.mediaKey, 'sealing');
  assert.equal('inspection' in finding, false);
  assert.deepEqual({ quotes: state.quotes, scope: state.scope, publications: state.publications }, before);
});

test('3D captures retain a validated model revision and independent serialized view', () => {
  const state = hydrateDealState(initialState()), inspection = capturedView();
  const finding = addFinding(state, { ...photoInput(), kind: '3d', inspection });
  inspection.model.revision = 'changed'; inspection.view.camera.position[0] = 88;
  assert.equal(finding.inspection.model.revision, 'test-revision');
  assert.deepEqual(finding.inspection.view.camera.position, [4, 4, 4]);
  assert.equal(finding.inspection.view.selectedId, 'slider');
  assert.equal(finding.quoteRevision, 0);
});

test('invalid or mismatched captures cannot create partial findings', () => {
  const state = hydrateDealState(initialState()), before = clone(state);
  assert.throws(() => addFinding(state, { ...photoInput(), kind: '3d' }), /Capture a 3D/);
  const mismatched = capturedView(); mismatched.view.model.revision = 'other';
  assert.throws(() => addFinding(state, { ...photoInput(), kind: '3d', inspection: mismatched }), /incompatible model/);
  const unsafe = capturedView(); unsafe.preview = { dataUrl: 'data:text/html;base64,AAAA', width: 400, height: 300 };
  assert.throws(() => addFinding(state, { ...photoInput(), kind: '3d', inspection: unsafe }), /preview/);
  const huge = capturedView(); huge.preview = { dataUrl: 'data:image/png;base64,' + 'A'.repeat(500_001), width: 400, height: 300 };
  assert.throws(() => addFinding(state, { ...photoInput(), kind: '3d', inspection: huge }), /bounded plain JSON/);
  assert.deepEqual(state, before);
});

test('finding input validation rejects unsupported references and empty notes atomically', () => {
  const state = hydrateDealState(initialState());
  for (const value of [{ kind: 'cad' }, { mediaKey: '../secret' }, { alternative: 'c' }, { title: ' ' }, { note: '' }, { kind: 'photo', inspection: capturedView() }]) {
    assert.throws(() => addFinding(state, { ...photoInput(), ...value }));
  }
  assert.equal(state.findings.length, 0);
});

test('findings remain internal and keep the original revision link after a new quote revision', () => {
  const state = hydrateDealState(initialState());
  for (const id of ['a', 'b']) { saveQuote(state, id); approveQuote(state, id); }
  const finding = addFinding(state, photoInput());
  const proposal = publishProposal(state);
  reviseQuote(state, 'b');
  assert.equal(finding.quoteRevision, 0); assert.equal(state.quotes.b.revision, 1);
  assert.equal('findings' in proposal, false);
  assert.equal(JSON.stringify(proposal).includes(finding.note), false);
});

test('status changes affect only the requested finding in the current deal', () => {
  const state = hydrateDealState(initialState());
  const one = addFinding(state, photoInput()), two = addFinding(state, { ...photoInput(), alternative: 'a' });
  assert.notEqual(one.id, two.id);
  assert.equal(markFindingStatus(state, one.id, 'addressed'), one);
  assert.equal(one.status, 'addressed'); assert.equal(two.status, 'open');
  markFindingStatus(state, one.id, 'open'); assert.equal(one.status, 'open');
  assert.throws(() => markFindingStatus(state, one.id, 'closed'), /open or addressed/);
  assert.throws(() => markFindingStatus(state, 'missing', 'open'), /current deal/);
  one.dealId = 'other-deal'; assert.throws(() => markFindingStatus(state, one.id, 'addressed'), /current deal/);
});

test('deal updates validate all fields before writing and preserve quote state', () => {
  const state = hydrateDealState(initialState()), beforeQuotes = clone(state.quotes);
  updateDealDetails(state, { owner: '  Jordan Lee ', nextAction: 'Review the bag samples', followUpDate: '2026-11-09' });
  assert.equal(state.deal.owner, 'Jordan Lee'); assert.equal(state.deal.followUpDate, '2026-11-09');
  const before = clone(state.deal);
  for (const value of [{ owner: '' }, { nextAction: ' ' }, { owner: 'Should not persist', followUpDate: '2026-02-30' }, { followUpDate: 'tomorrow' }]) {
    assert.throws(() => updateDealDetails(state, value)); assert.deepEqual(state.deal, before);
  }
  updateDealDetails(state, { followUpDate: '' }); assert.equal(state.deal.followUpDate, '');
  assert.deepEqual(state.quotes, beforeQuotes);
});
