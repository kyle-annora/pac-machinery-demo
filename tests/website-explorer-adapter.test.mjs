import test from 'node:test';
import assert from 'node:assert/strict';
import { mountReferenceExplorer } from '../website/explorer.js';

const completed = result => ({ payload: { status: 'completed', result } });
const failed = (code, message = code) => ({ payload: { status: 'failed', error: { code, message } } });
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const flush = () => new Promise(resolve => setImmediate(resolve));
async function until(predicate) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (predicate()) return;
    await flush();
  }
  assert.ok(predicate(), 'expected asynchronous adapter state');
}

class Element {
  constructor() {
    this.listeners = new Map();
    this.isConnected = true;
    this.options = [];
    this.classList = { toggle() {} };
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  dispatch(type) { for (const listener of this.listeners.get(type) || []) listener(); }
  replaceChildren(...children) { this.options = children; }
}

function fixture({ controls = false, intercept, initial = {}, frameOnReady = false } = {}) {
  const ids = new Map([['reference-frame', new Element()]]);
  if (controls) for (const id of ['reference-component', 'reference-frame-button', 'reference-capture', 'reference-retry', 'reference-status']) ids.set(id, new Element());
  const frames = ids.get('reference-frame');
  const clients = [], snapshots = [], statuses = [], captures = [], busyChanges = [], readyControllers = [];
  const nodes = {
    root: { id: 'root', title: 'Reference assembly' },
    child: { id: 'child', title: 'Drive assembly' },
    deep: { id: 'deep', title: 'Crank pin' },
  };
  const inspection = { view: { selectedId: 'deep' }, preview: { dataUrl: 'data:image/png;base64,view' } };
  const createClient = () => {
    const client = {
      index: clients.length,
      calls: [],
      closed: false,
      state: { lifecycle: 'ready', navigation: { scopeId: 'root', selectedId: 'root' }, ...structuredClone(initial) },
      subscribe(listener) { this.listener = listener; },
      emit(next) { this.state = next; this.listener({ type: 'stateChanged', payload: { state: next } }); },
      close() { this.closed = true; },
      async request(method, params = {}) {
        this.calls.push({ method, params });
        const fallback = () => {
          if (method === 'getCapabilities') return completed({ inspections: { available: true } });
          if (method === 'getNode') return completed(nodes[params.nodeId]);
          if (method === 'getChildren') return completed({ children: [nodes.child] });
          if (method === 'getState') return completed(structuredClone(this.state));
          if (method === 'captureInspection') return completed({ inspection });
          if (method === 'select') this.emit({ ...this.state, navigation: { ...this.state.navigation, selectedId: params.nodeId } });
          return completed({ method, ...params });
        };
        return intercept ? intercept({ client: this, method, params, fallback }) : fallback();
      },
    };
    client.ready = Promise.resolve({ state: client.state });
    clients.push(client);
    return client;
  };
  const controller = mountReferenceExplorer({
    document: { getElementById: id => ids.get(id), createElement: () => new Element() },
    window: { location: { origin: 'http://localhost:4361' } },
    loadModule: async url => url.includes('embed-client') ? { c: createClient } : { n: value => ({ ...value, normalized: true }) },
    frameOnReady,
    onStateChange: value => snapshots.push(value),
    onReady: value => readyControllers.push(value),
    onStatus: (message, error) => statuses.push({ message, error }),
    onCapture: item => captures.push(item),
    onBusyChange: value => busyChanges.push(value),
  });
  return {
    controller, ids, frames, clients, snapshots, statuses, captures, busyChanges, readyControllers,
    async start() {
      await until(() => frames.src);
      frames.dispatch('load');
      await until(() => readyControllers.length === 1);
      return clients[0];
    },
  };
}

test('a frame alone mounts; readiness waits for full hydration and carries its controller', async () => {
  const hydration = deferred();
  const f = fixture({ frameOnReady: true, intercept: ({ method, fallback }) => method === 'getChildren' ? hydration.promise : fallback() });
  assert.equal(typeof f.controller, 'function');
  await assert.rejects(f.controller.request('frame', { nodeId: 'root' }), { code: 'NOT_READY' });
  await until(() => f.frames.src);
  f.frames.dispatch('load');
  await until(() => f.clients[0]?.calls.some(call => call.method === 'getChildren'));
  assert.equal(f.readyControllers.length, 0);
  assert.equal(f.snapshots.at(-1).ready, false);
  hydration.resolve(completed({ children: [{ id: 'child', title: 'Drive assembly' }] }));
  await until(() => f.readyControllers.length === 1);
  assert.equal(f.readyControllers[0], f.controller);
  assert.equal(f.snapshots.at(-1).rootNode.id, 'root');
  assert.equal(f.snapshots.at(-1).selectedNode.title, 'Reference assembly');
  assert.equal(f.snapshots.at(-1).ready, true);
  assert.ok(f.clients[0].calls.some(call => call.method === 'frame' && call.params.nodeId === 'root'));
  f.controller();
});

test('camera and mode requests are serial, and host failures do not poison subsequent commands', async () => {
  const held = deferred();
  const f = fixture({ intercept: ({ method, params, fallback }) => {
    if (method === 'frame') return held.promise;
    if (method === 'setMode' && params.mode === 'invalid') return failed('INVALID_MODE', 'Choose a supported mode.');
    return fallback();
  } });
  const client = await f.start();
  const camera = f.controller.request('frame', { nodeId: 'root' });
  const mode = f.controller.request('setMode', { mode: 'operate' });
  await flush();
  assert.equal(client.calls.some(call => call.method === 'setMode'), false);
  assert.equal(f.snapshots.at(-1).busy, true);
  held.resolve(completed({ framed: true }));
  assert.deepEqual(await camera, { framed: true });
  assert.deepEqual(await mode, { method: 'setMode', mode: 'operate' });
  assert.deepEqual(f.busyChanges, [true, false]);
  await assert.rejects(f.controller.request('setMode', { mode: 'invalid' }), { code: 'INVALID_MODE', message: 'Choose a supported mode.' });
  assert.equal((await f.controller.request('playOperation')).method, 'playOperation');
  assert.equal(f.snapshots.at(-1).busy, false);
  f.controller();
});

test('deep scene selections resolve titles through the public API without replacing a newer selection', async () => {
  const deep = deferred();
  const f = fixture({ intercept: ({ method, params, fallback }) => method === 'getNode' && params.nodeId === 'deep' ? deep.promise : fallback() });
  const client = await f.start();
  client.emit({ ...client.state, navigation: { scopeId: 'root', selectedId: 'deep' } });
  assert.equal(f.snapshots.at(-1).selectedNode, null);
  client.emit({ ...client.state, navigation: { scopeId: 'root', selectedId: 'child' } });
  deep.resolve(completed({ id: 'deep', title: 'Crank pin' }));
  await flush();
  assert.equal(f.snapshots.at(-1).selectedNode.title, 'Drive assembly');
  client.emit({ ...client.state, navigation: { scopeId: 'root', selectedId: 'deep' } });
  assert.equal(f.snapshots.at(-1).selectedNode.title, 'Crank pin');
  assert.equal(client.calls.filter(call => call.method === 'getNode' && call.params.nodeId === 'deep').length, 1);
  f.controller();
});

test('capture pauses tour and operation, retries a settling camera, and returns the callback item', async () => {
  let attempts = 0;
  const f = fixture({ initial: { tour: { status: 'playing' }, operation: { status: 'playing' } }, intercept: ({ method, fallback }) => {
    if (method === 'captureInspection' && ++attempts < 3) return failed('BUSY_STATE');
    return fallback();
  } });
  const client = await f.start();
  const start = client.calls.length;
  const item = await f.controller.capture();
  assert.equal(attempts, 3);
  assert.deepEqual(client.calls.slice(start).map(call => call.method), ['getState', 'pauseTour', 'pauseOperation', 'captureInspection', 'captureInspection', 'captureInspection', 'getNode']);
  assert.equal(item, f.captures[0]);
  assert.equal(item.title, 'Crank pin');
  assert.equal(item.inspection.normalized, true);
  assert.equal(item.preview, 'data:image/png;base64,view');
  assert.equal(f.snapshots.at(-1).busy, false);
  f.controller();
});

test('capture retries are bounded and non-BUSY host failures reject immediately', async () => {
  let attempts = 0, code = 'BUSY_STATE';
  const f = fixture({ intercept: ({ method, fallback }) => {
    if (method === 'captureInspection') { attempts++; return failed(code, 'Capture was refused.'); }
    return fallback();
  } });
  await f.start();
  await assert.rejects(f.controller.capture(), { code: 'BUSY_STATE' });
  assert.equal(attempts, 8);
  code = 'CAPTURE_FAILED';
  await assert.rejects(f.controller.capture(), { code: 'CAPTURE_FAILED', message: 'Capture was refused.' });
  assert.equal(attempts, 9);
  assert.equal(f.captures.length, 0);
  assert.equal(f.snapshots.at(-1).busy, false);
  f.controller();
});

test('retry invalidates old in-flight and queued commands without changing the replacement state', async () => {
  const held = deferred();
  const f = fixture({ intercept: ({ client, method, fallback }) => client.index === 0 && method === 'frame' ? held.promise : fallback() });
  const old = await f.start();
  const camera = f.controller.request('frame', { nodeId: 'root' });
  const queued = f.controller.request('setMode', { mode: 'operate' });
  const rejectedCamera = assert.rejects(camera, { code: 'STALE_VIEW' });
  const rejectedQueued = assert.rejects(queued, { code: 'STALE_VIEW' });
  await until(() => old.calls.some(call => call.method === 'frame'));
  await f.controller.retry();
  await until(() => f.readyControllers.length === 2);
  assert.equal(old.closed, true);
  const snapshot = f.snapshots.at(-1);
  held.resolve(completed({ framed: true }));
  await Promise.all([rejectedCamera, rejectedQueued]);
  assert.equal(old.calls.some(call => call.method === 'setMode'), false);
  assert.equal(f.snapshots.at(-1), snapshot);
  assert.equal((await f.controller.request('setMode', { mode: 'explore' })).mode, 'explore');
  f.controller();
});

test('detailed page controls remain functional and disposal suppresses late capture callbacks', async () => {
  const held = deferred();
  const f = fixture({ controls: true, intercept: ({ method, fallback }) => method === 'captureInspection' ? held.promise : fallback() });
  const client = await f.start();
  const select = f.ids.get('reference-component');
  assert.deepEqual(select.options.map(option => option.value), ['root', 'child']);
  assert.equal(select.disabled, false);
  select.value = 'child';
  select.dispatch('change');
  await until(() => client.state.navigation.selectedId === 'child' && !f.snapshots.at(-1).busy);
  f.ids.get('reference-frame-button').dispatch('click');
  await until(() => client.calls.some(call => call.method === 'frame' && call.params.nodeId === 'child'));
  const capture = f.controller.capture();
  const rejected = assert.rejects(capture, { code: 'STALE_VIEW' });
  await until(() => client.calls.some(call => call.method === 'captureInspection'));
  const count = f.snapshots.length, messages = f.statuses.length;
  f.controller();
  f.controller();
  held.resolve(completed({ inspection: { view: { selectedId: 'deep' } } }));
  await rejected;
  await assert.rejects(f.controller.request('frame'), { code: 'STALE_VIEW' });
  await assert.rejects(f.controller.retry(), { code: 'STALE_VIEW' });
  assert.equal(f.captures.length, 0);
  assert.equal(f.snapshots.length, count);
  assert.equal(f.statuses.length, messages);
  assert.equal(select.listeners.get('change').size, 0);
  assert.equal(client.calls.filter(call => call.method === 'dispose').length, 1);
  assert.equal(client.closed, true);
});
