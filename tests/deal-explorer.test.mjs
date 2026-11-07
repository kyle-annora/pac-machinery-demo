import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExplorerEvidence, validateInspection, explorerEmbedURL, renderDealExplorer, playOperationPreservingSelection, REFERENCE_LABEL } from '../src/deal-explorer.js';
import { c as createExplorerClient } from '../assets/explorer/assets/embed-client-DZNJSvOD.js';
import { n as normalizeInspection } from '../assets/explorer/assets/inspection-reference-WG_yQLtT.js';
import { relocateURLs } from '../scripts/build-static.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
function inspection() {
  const model = { id: 'kinetic-01', revision: 'sha256:example-revision' };
  return { version: '1', model, view: {
    viewVersion: '0.1', model: clone(model), coordinateFrame: 'normalized-assembly-v1',
    selectedId: 'kinetic-node-001', scopeId: 'kinetic-assembly', isolated: false,
    mode: 'operate', renderStyle: 'engineering', separation: 0,
    displayOptions: { appearance: 'light', grid: false, ambientOcclusion: true, featureEdges: true, hiddenEdges: false, lineWeight: 'standard' },
    operation: { clipId: 'crank-cycle', progress: .5, status: 'paused' },
    camera: { position: [2, 2, 3], target: [0, 0, 0], up: [0, 1, 0], projection: { kind: 'perspective', verticalFovDegrees: 40, zoom: 1, offsetX: 0, offsetY: 0 }, viewport: { width: 900, height: 650 } },
  }, preview: { dataUrl: 'data:image/jpeg;base64,AAAA', width: 480, height: 320 } };
}
function evidence(input = {}) {
  return buildExplorerEvidence({ dealId: 'deal-demo-1', quoteId: 'quote-demo-1', inspection: inspection(), node: { id: 'kinetic-node-001', title: 'Connecting rod' }, note: 'Check the clearance.', ...input });
}

test('actual captured reference is preserved as an independent, reloadable deal snapshot', () => {
  const source = inspection();
  normalizeInspection(source);
  const result = evidence({ inspection: source });
  assert.equal(result.deal_id, 'deal-demo-1');
  assert.equal(result.quote_id, 'quote-demo-1');
  assert.equal(result.source_label, REFERENCE_LABEL);
  assert.equal(result.part_id, source.view.selectedId);
  assert.equal(result.reference.view.operation.progress, .5);
  source.view.camera.position[0] = 99;
  assert.equal(result.reference.view.camera.position[0], 2);
  assert.deepEqual(normalizeInspection(JSON.parse(JSON.stringify(result)).reference), result.reference);
  assert.equal(result.title, 'Connecting rod · Paused motion');
});

test('capture cannot silently substitute another model revision or component', () => {
  assert.throws(() => evidence({ state: { model: { id: 'kinetic-01', revision: 'other' } } }), /model changed/);
  assert.throws(() => evidence({ node: { id: 'other-part', title: 'Connecting rod' } }), /component identity/);
  const mismatched = inspection(); mismatched.view.model.id = 'another-model';
  assert.throws(() => evidence({ inspection: mismatched }), /mismatched model identities/);
});

test('untrusted references cannot persist executable previews, non-finite geometry or accessors', () => {
  for (const dataUrl of ['javascript:alert(1)', 'https://example.com/image.png', 'data:image/svg+xml;base64,AAAA']) {
    const value = inspection(); value.preview.dataUrl = dataUrl;
    assert.throws(() => validateInspection(value), /captured image/);
  }
  const infinite = inspection(); infinite.view.camera.position[0] = Infinity;
  assert.throws(() => validateInspection(infinite), /plain JSON/);
  const accessor = inspection(); Object.defineProperty(accessor, 'surprise', { get() { throw new Error('Must not execute'); }, enumerable: true });
  assert.throws(() => validateInspection(accessor), /plain JSON/);
  const prototype = inspection(); Object.defineProperty(prototype, '__proto__', { value: {}, enumerable: true });
  assert.throws(() => validateInspection(prototype), /plain JSON/);
});

test('unsettled references and oversized notes are rejected before attach', () => {
  const moving = inspection(); moving.view.operation.status = 'playing';
  assert.throws(() => evidence({ inspection: moving }), /paused/);
  assert.throws(() => evidence({ note: 'x'.repeat(2001) }), /note/);
  assert.throws(() => evidence({ dealId: '' }), /valid deal/);
  assert.throws(() => evidence({ quoteId: 'javascript:alert(1)' }), /valid deal/);
});

test('embed URL is scoped to the exact host origin and static deployment rewrite', () => {
  const url = new URL(explorerEmbedURL('https://example.com'));
  assert.equal(url.pathname, '/explorer/');
  assert.equal(url.searchParams.get('embed'), '1');
  assert.equal(url.searchParams.get('parentOrigin'), 'https://example.com');
  assert.equal(url.searchParams.get('model'), 'kinetic-01');
  assert.throws(() => explorerEmbedURL('https://example.com/subpath'), /exact HTTP/);
  assert.throws(() => explorerEmbedURL('file:///tmp'), /exact HTTP/);
  assert.equal(relocateURLs("const url='/explorer/';", '/pac-machinery-demo/'), "const url='/pac-machinery-demo/explorer/';");
});

test('view only offers evidence from the current deal and escapes customer text', () => {
  const foreign = evidence({ dealId: 'foreign-deal' }); foreign.part_label = 'Foreign secret';
  const local = evidence();
  const photo = { ...local, type: 'photo', title: 'PAC product photo', part_label: 'Not a 3D reference' };
  const html = renderDealExplorer({ deal: { id: 'deal-demo-1', number: 'D-001', title: '<script>unsafe</script>', evidence: [foreign, local, photo] }, returnHash: 'javascript:alert(1)' });
  assert.ok(!html.includes('Foreign secret'));
  assert.ok(!html.includes('<script>unsafe</script>'));
  assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
  assert.ok(html.includes('href="#deal/deal-demo-1"'));
  assert.ok(html.includes('Restore saved view'));
  assert.ok(html.includes(REFERENCE_LABEL));
  assert.ok(!html.includes('Not a 3D reference'));
});

test('starting motion from exploration retains the selected component for capture', async () => {
  const state = { model: { id: 'kinetic-01', revision: 'one' }, presentation: { mode: 'explore' }, navigation: { selectedId: 'connecting-rod' }, operation: { status: 'paused' } };
  const request = async (method, params) => {
    if (method === 'getState') return clone(state);
    if (method === 'setMode') { state.presentation.mode = params.mode; state.navigation.selectedId = 'assembly'; }
    if (method === 'select') state.navigation.selectedId = params.nodeId;
    if (method === 'playOperation') { if (state.presentation.mode !== 'operate') state.navigation.selectedId = 'assembly'; state.operation.status = 'playing'; }
  };
  await playOperationPreservingSelection(request);
  assert.equal(state.presentation.mode, 'operate');
  assert.equal(state.operation.status, 'playing');
  assert.equal(state.navigation.selectedId, 'connecting-rod');
});

test('a changed assembly is not given a stale component selection or started', async () => {
  const state = { model: { id: 'kinetic-01', revision: 'one' }, presentation: { mode: 'explore' }, navigation: { selectedId: 'connecting-rod' } };
  let played = false, selected = false;
  const request = async method => {
    if (method === 'getState') return clone(state);
    if (method === 'setMode') state.model.revision = 'new';
    if (method === 'select') selected = true;
    if (method === 'playOperation') played = true;
  };
  await assert.rejects(playOperationPreservingSelection(request), /assembly changed/);
  assert.equal(played, false); assert.equal(selected, false);
});

function transportHarness() {
  const listeners = new Set(), outbound = [], peer = { postMessage(data, targetOrigin) { outbound.push({ data, targetOrigin }); } };
  const win = { addEventListener(type, handler) { if (type === 'message') listeners.add(handler); }, removeEventListener(type, handler) { listeners.delete(handler); } };
  const client = createExplorerClient({ iframe: { contentWindow: peer }, origin: 'https://pac.example', window: win, retryMs: 100000, handshakeTimeoutMs: 100000 });
  const protocolVersion = 'annora.explorer/0.1-draft';
  const send = (data, extras = {}) => { for (const handler of listeners) handler({ origin: 'https://pac.example', source: peer, data: { protocolVersion, ...data }, ...extras }); };
  const hello = { type: 'helloAck', nonce: outbound[0].data.nonce, sessionId: 'session-one', instanceId: 'instance-one', payload: { state: { lifecycle: 'ready' } } };
  return { client, outbound, peer, send, hello, listeners };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('vendored public client ignores wrong origin, frame and handshake nonce', async () => {
  const h = transportHarness(); let ready = false; h.client.ready.then(() => { ready = true; });
  try {
    h.send(h.hello, { origin: 'https://attacker.example' });
    h.send(h.hello, { source: {} });
    h.send({ ...h.hello, nonce: 'other-nonce' });
    await tick(); assert.equal(ready, false);
    h.send(h.hello); await h.client.ready; assert.equal(ready, true);
    assert.equal(h.outbound[0].targetOrigin, 'https://pac.example');
  } finally { h.client.close(); }
});

test('vendored public client binds command replies to the live session and renderer instance', async () => {
  const h = transportHarness();
  try {
    h.send(h.hello); await h.client.ready;
    let completed = false;
    const request = h.client.request('captureInspection').then(result => { completed = true; return result; });
    await tick(); const command = h.outbound.at(-1).data;
    const reply = { type: 'commandResult', requestId: command.requestId, sessionId: 'session-one', instanceId: 'instance-one', payload: { status: 'completed', result: { inspection: inspection() } } };
    h.send({ ...reply, sessionId: 'retired-session' });
    h.send({ ...reply, instanceId: 'retired-renderer' });
    await tick(); assert.equal(completed, false);
    h.send(reply); const result = await request;
    assert.equal(result.payload.result.inspection.view.selectedId, 'kinetic-node-001');
    h.client.close(); assert.equal(h.listeners.size, 0);
  } finally { h.client.close(); }
});
