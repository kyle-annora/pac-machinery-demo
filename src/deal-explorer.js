/** PAC host adapter for the documented Annora iframe JSON API.
 * The vendored client and inspection validator remain unchanged. No renderer or
 * iframe application state is read; all selection/capture/restore uses commands.
 */
const CLIENT_URL = '/explorer/assets/embed-client-DZNJSvOD.js';
const INSPECTION_URL = '/explorer/assets/inspection-reference-WG_yQLtT.js';
const EXPLORER_URL = '/explorer/';
export const REFERENCE_LABEL = 'Reference assembly — not PAC CAD';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
const copy = value => JSON.parse(JSON.stringify(value));
const boundedText = (value, max = 256) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const identifier = value => boundedText(value, 128) && /^[A-Za-z0-9_.:-]+$/.test(value);
const uid = () => `evidence-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
const check = (condition, message) => { if (!condition) throw new TypeError(message); };

function safeJSON(value, depth = 0) {
  if (depth > 12) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= 120000;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.length <= 64 && value.every(item => safeJSON(item, depth + 1));
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors).length <= 64 && Reflect.ownKeys(descriptors).every(key =>
    typeof key === 'string' && !['__proto__', 'prototype', 'constructor'].includes(key) &&
    'value' in descriptors[key] && safeJSON(descriptors[key].value, depth + 1));
}

/** Defense at the host storage boundary. Runtime also applies its full normalizer. */
export function validateInspection(input) {
  check(safeJSON(input), 'The saved view must contain bounded, plain JSON.');
  check(JSON.stringify(input).length <= 131072, 'The saved view is too large.');
  check(input?.version === '1' && boundedText(input.model?.id) && boundedText(input.model?.revision), 'The saved view needs an exact model revision.');
  check(Boolean(input.view) !== Boolean(input.tour), 'The saved view needs one settled view or paused tour.');
  const pose = input.view || input.tour;
  check(boundedText(pose.selectedId) && boundedText(pose.scopeId), 'The saved view needs a selected component and assembly.');
  check(['explore', 'explode', 'operate'].includes(pose.mode), 'The saved view has an unsupported mode.');
  if (input.view) {
    check(pose.viewVersion === '0.1' && pose.coordinateFrame === 'normalized-assembly-v1', 'The saved view has an unsupported coordinate format.');
    check(pose.model?.id === input.model.id && pose.model?.revision === input.model.revision, 'The saved view has mismatched model identities.');
  }
  for (const key of ['position', 'target', 'up']) check(Array.isArray(pose.camera?.[key]) && pose.camera[key].length === 3 && pose.camera[key].every(Number.isFinite), 'The saved view needs a finite camera.');
  if (pose.operation) check(pose.operation.status === 'paused' && Number.isFinite(pose.operation.progress) && pose.operation.progress >= 0 && pose.operation.progress <= 1, 'The saved motion must be paused.');
  if (input.preview) {
    check(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(input.preview.dataUrl || ''), 'The preview must be a captured image, not a remote URL.');
    check([input.preview.width, input.preview.height].every(side => Number.isInteger(side) && side > 0 && side <= 640), 'The preview dimensions are invalid.');
  }
  return copy(input);
}

export function buildExplorerEvidence({ dealId, quoteId = null, inspection, node, state, note = '', capturedAt = new Date().toISOString() }) {
  check(identifier(dealId) && (!quoteId || identifier(quoteId)), 'A valid deal and optional quote are required.');
  const reference = validateInspection(inspection), pose = reference.view || reference.tour;
  check(node?.id === pose.selectedId && boundedText(node.title || node.label), 'The component identity does not match the captured view.');
  if (state) check(state.model?.id === reference.model.id && state.model?.revision === reference.model.revision, 'The model changed during capture. Capture the new view before attaching it.');
  check(typeof note === 'string' && note.length <= 2000 && !Number.isNaN(Date.parse(capturedAt)), 'The evidence note or capture date is invalid.');
  const partLabel = node.title || node.label;
  return {
    id: uid(), type: 'explorer', deal_id: dealId, quote_id: quoteId || null,
    title: `${partLabel} · ${pose.mode === 'operate' ? 'Paused motion' : pose.mode === 'explode' ? 'Exploded view' : 'Assembly view'}`,
    model_id: reference.model.id, model_revision: reference.model.revision,
    part_id: pose.selectedId, part_label: partLabel, captured_at: capturedAt,
    reference, note: note.trim(), source_label: REFERENCE_LABEL,
  };
}

export function explorerEmbedURL(origin, modelId = 'kinetic-01') {
  const target = new URL(EXPLORER_URL, origin);
  check(['http:', 'https:'].includes(target.protocol) && target.origin === origin, 'An exact HTTP(S) origin is required.');
  check(identifier(modelId), 'An available model identity is required.');
  target.searchParams.set('embed', '1');
  target.searchParams.set('parentOrigin', origin);
  target.searchParams.set('model', modelId);
  return target.href;
}

/** Operate enters the assembled root. Restore the chosen part before playback. */
export async function playOperationPreservingSelection(request) {
  const before = await request('getState');
  if (before.presentation?.mode !== 'operate') {
    await request('setMode', { mode: 'operate' });
    const operating = await request('getState');
    check(operating.model?.id === before.model?.id && operating.model?.revision === before.model?.revision, 'The assembly changed before playback. Choose the component again.');
    if (before.navigation?.selectedId) await request('select', { nodeId: before.navigation.selectedId });
  }
  return request('playOperation');
}

function savedMarkup(evidence, dealId) {
  const saved = evidence.filter(item => item.type === 'explorer' && item.deal_id === dealId && item.reference);
  return saved.length ? saved.map(item => `<article class="sw-evidence-item"><div><strong>${escapeHTML(item.part_label || item.title)}</strong><p>${escapeHTML(item.note || 'Saved component, camera and source pose.')}</p><small>${escapeHTML(item.source_label || REFERENCE_LABEL)}</small></div><button type="button" class="secondary" data-explorer-action="restore" data-evidence-id="${escapeHTML(item.id)}">Restore saved view</button></article>`).join('') : '<p class="sw-muted">No 3D evidence attached to this deal yet.</p>';
}

export function renderDealExplorer({ deal, quoteId = null, returnHash, evidence = deal.evidence || [] }) {
  check(identifier(deal.id), 'Choose a deal before opening the Explorer.');
  const quote = deal.quotes?.find(item => item.id === quoteId);
  const quoteStatus = quote?.working?.status || '';
  const quoteLabel = quote?.label || '';
  const target = quote ? `${quoteLabel} · Rev ${quote.working.revision} · ${quoteStatus === 'draft' ? 'Draft' : 'Issued'}` : 'Deal application · All alternatives';
  const back = quote ? `#quote/${deal.id}/${quote.id}` : `#deal/${deal.id}`;
  const publicationNote = quoteStatus === 'issued'
    ? 'New findings stay with this deal. Create a new quote revision to include them in the customer proposal.'
    : quoteStatus === 'draft'
      ? 'Review attached findings with this draft, then issue and publish a new customer proposal version.'
      : 'Findings are saved to this deal for all alternatives. Include them in a quote revision before publishing to the customer.';
  return `<section class="sw-explorer" id="deal-explorer" data-deal-id="${escapeHTML(deal.id)}" data-quote-id="${escapeHTML(quoteId || '')}" data-quote-status="${escapeHTML(quoteStatus)}" data-quote-label="${escapeHTML(quoteLabel)}">
    <header class="sw-page-heading"><div><p class="sw-explorer-customer">${escapeHTML(deal.customer || deal.number || deal.id)} · ${escapeHTML(deal.title || 'Deal application')}</p><h1>Explorer</h1><p>Inspect a component, capture a view and attach the finding to this deal.</p></div><a class="secondary" href="${escapeHTML(back)}">${quote ? 'Return to quote' : 'Back to deal'}</a></header>
    <div class="sw-explorer-target"><span>Linked to</span><strong>${escapeHTML(deal.number || deal.id)} · ${escapeHTML(target)}</strong><p>${publicationNote} Attaching a finding does not change prices.</p></div>
    <div class="sw-notice">${REFERENCE_LABEL}. PAC must supply and approve its own model.</div>
    <div class="sw-explorer-layout"><div class="sw-explorer-viewer"><iframe id="deal-explorer-frame" title="3D reference assembly for this PAC deal" src="${escapeHTML(explorerEmbedURL(globalThis.location?.origin || 'http://localhost'))}" allow="fullscreen" allowfullscreen></iframe><div class="sw-explorer-tools"><label for="deal-explorer-component">Component<select id="deal-explorer-component" disabled><option>Loading components…</option></select></label><button class="secondary" type="button" data-explorer-action="frame" disabled>Frame selection</button><button class="secondary" type="button" data-explorer-action="motion" disabled>Play one cycle</button></div></div>
    <aside class="sw-explorer-panel"><span class="eyebrow">CURRENT VIEW</span><h2 id="deal-explorer-selection">Connecting to Explorer…</h2><p id="deal-explorer-pose" class="sw-muted">Choose a component in the assembly, then inspect it from any angle.</p><p id="deal-explorer-status" role="status" aria-live="polite">Loading the reference assembly.</p><button class="primary" type="button" data-explorer-action="capture" disabled>Capture this view</button><button class="text-button" type="button" data-explorer-action="retry" hidden>Reconnect Explorer</button>
    <section id="deal-explorer-candidate" class="sw-capture-review" hidden><h3>Review before attaching</h3><div id="deal-explorer-preview"></div><p id="deal-explorer-capture-label"></p><label for="deal-explorer-note">What should the team discuss?</label><textarea id="deal-explorer-note" rows="3" maxlength="2000" placeholder="Describe the application requirement this view helps explain."></textarea><button class="primary" type="button" data-explorer-action="attach">Attach to this ${quoteId ? 'quote' : 'deal'}</button><p class="sw-muted">This saves a copy. Browsing another component will not replace it.</p></section></aside></div>
    <section class="sw-section"><div class="sw-section-heading"><div><span class="eyebrow">SAVED WITH THIS DEAL</span><h2>Attached findings</h2></div></div><p class="sw-publication-note">${publicationNote} Published proposal versions stay unchanged.</p><div id="deal-explorer-saved">${savedMarkup(evidence, deal.id)}</div></section>
  </section>`;
}

/** Mount once after the fragment is inserted; invoke cleanup before route teardown. */
export function mountDealExplorer({ dealId, quoteId = null, evidence = [], onEvidence, onError = () => {}, document: doc = globalThis.document, window: win = globalThis.window }) {
  const root = doc?.getElementById('deal-explorer'), frame = doc?.getElementById('deal-explorer-frame');
  if (!root || !frame) return () => {};
  check(root.dataset.dealId === dealId && (root.dataset.quoteId || null) === (quoteId || null), 'The Explorer must be mounted for its displayed deal.');
  let disposed = false, connection = null, state = null, capabilities = null, normalizer = null, clientFactory = null, generation = 0, hydrated = false, candidate = null, busy = false, pendingRestore = null;
  const saved = evidence.filter(item => item.type === 'explorer' && item.deal_id === dealId).map(copy), nodes = new Map(), pendingNames = new Set();
  const element = id => root.querySelector(`#${id}`);
  const status = (text, failure = false) => { const target = element('deal-explorer-status'); if (target) { target.textContent = text; target.classList.toggle('sw-error', failure); } };
  const button = action => root.querySelector(`[data-explorer-action="${action}"]`);
  const active = client => !disposed && connection === client && root.isConnected;
  function updateControls() {
    const ready = state?.lifecycle === 'ready' && !busy;
    for (const action of ['capture', 'frame', 'motion']) button(action).disabled = !ready || (action === 'capture' && !capabilities?.inspections?.available) || (action === 'motion' && !capabilities?.operation?.enabled);
    element('deal-explorer-component').disabled = !ready || !nodes.size;
    button('attach').disabled = busy || !candidate;
  }
  async function invoke(client, method, params = {}) {
    const result = await client.request(method, params);
    if (!active(client)) throw new Error('The Explorer view changed before the action completed.');
    if (result.payload?.status !== 'completed') throw Object.assign(new Error(result.payload?.error?.message || 'The view changed before this action completed.'), { code: result.payload?.error?.code });
    return result.payload.result;
  }
  function display(next, client) {
    if (!active(client) || !next?.lifecycle) return;
    if (state?.model && next.model && (state.model.id !== next.model.id || state.model.revision !== next.model.revision)) {
      hydrated = false; capabilities = null; nodes.clear(); pendingNames.clear();
    }
    state = next;
    const id = state.navigation?.selectedId;
    const node = nodes.get(id);
    element('deal-explorer-selection').textContent = node?.title || node?.label || (state.lifecycle === 'ready' ? 'Selected component' : 'Loading reference assembly…');
    const mode = state.presentation?.mode;
    element('deal-explorer-pose').textContent = state.lifecycle === 'ready' ? `${mode === 'operate' ? 'Operate' : mode === 'explode' ? 'Exploded' : 'Explore'} view${mode === 'operate' && Number.isFinite(state.operation?.progress) ? ` · ${Math.round(state.operation.progress * 100)}% of cycle · ${state.operation.status}` : ''}` : 'The model and its component list are loading.';
    if (state.lifecycle === 'ready' && id && !node && !pendingNames.has(id)) {
      pendingNames.add(id);
      invoke(client, 'getNode', { nodeId: id }).then(value => { if (active(client)) { nodes.set(value.id, value); display(state, client); } }).catch(() => {}).finally(() => pendingNames.delete(id));
    }
    if ([...element('deal-explorer-component').options].some(option => option.value === id)) element('deal-explorer-component').value = id;
    if (state.lifecycle === 'ready' && !hydrated) void hydrate(client);
    updateControls();
  }
  async function hydrate(client) {
    if (!active(client) || hydrated) return;
    hydrated = true;
    try {
      capabilities = await invoke(client, 'getCapabilities');
      const rootNode = await invoke(client, 'getNode', { nodeId: state.navigation.scopeId });
      const children = await invoke(client, 'getChildren', { nodeId: rootNode.id });
      for (const node of [rootNode, ...(Array.isArray(children) ? children : children.children || [])]) nodes.set(node.id, node);
      const select = element('deal-explorer-component');
      select.replaceChildren(...[...nodes.values()].map(node => { const option = doc.createElement('option'); option.value = node.id; option.textContent = node.title || node.label || node.id; return option; }));
      status('Ready. Choose a component, inspect it, then capture a view.');
      button('retry').hidden = true;
      display(await invoke(client, 'getState'), client);
      if (pendingRestore) {
        const item = pendingRestore; pendingRestore = null;
        await restore(client, item);
      }
    } catch (error) { if (active(client)) { hydrated = false; status(error.message, true); button('retry').hidden = false; onError(error); } }
  }
  function connect() {
    if (disposed || !clientFactory) return;
    connection?.close(); hydrated = false; state = null; capabilities = null; nodes.clear(); pendingNames.clear();
    const client = clientFactory({ iframe: frame, origin: win.location.origin, window: win, handshakeTimeoutMs: 60000 });
    connection = client; const current = ++generation; updateControls();
    client.subscribe(event => { if (!active(client)) return; if (['ready', 'stateChanged', 'helloAck'].includes(event.type)) display(event.payload?.state || event.payload, client); });
    client.ready.then(payload => { if (active(client) && current === generation) display(payload.state, client); }).catch(error => { if (active(client)) { status(error.message, true); button('retry').hidden = false; onError(error); } });
  }
  async function capture(client) {
    let current = await invoke(client, 'getState');
    if (current.tour?.status === 'playing') await invoke(client, 'pauseTour');
    if (current.operation?.status === 'playing') await invoke(client, 'pauseOperation');
    let captured;
    // Only retry capture, never a mutation. Camera damping may need a few frames.
    for (let attempt = 0; attempt < 8; attempt++) {
      try { captured = await invoke(client, 'captureInspection'); break; }
      catch (error) { if (error.code !== 'BUSY_STATE' || attempt === 7) throw error; await new Promise(resolve => setTimeout(resolve, 150)); }
    }
    const inspection = normalizer(captured.inspection), pose = inspection.view || inspection.tour;
    const node = await invoke(client, 'getNode', { nodeId: pose.selectedId });
    current = await invoke(client, 'getState');
    candidate = buildExplorerEvidence({ dealId, quoteId, inspection, node, state: current });
    element('deal-explorer-candidate').hidden = false;
    const preview = element('deal-explorer-preview'); preview.replaceChildren();
    if (inspection.preview) { const image = doc.createElement('img'); image.src = inspection.preview.dataUrl; image.alt = `Captured ${node.title || node.label} reference view`; preview.append(image); }
    else { const text = doc.createElement('p'); text.textContent = 'Preview unavailable. The component, camera and source pose are captured.'; preview.append(text); }
    element('deal-explorer-capture-label').textContent = `${candidate.title} · ${REFERENCE_LABEL}`;
    element('deal-explorer-note').value = '';
    button('attach').textContent = `Attach to this ${quoteId ? 'quote' : 'deal'}`;
    status('View captured. Add the requirement, then attach this reference.');
  }
  async function restore(client, item) {
    const inspection = normalizer(validateInspection(item.reference));
    if (state.model?.id !== inspection.model.id || state.model?.revision !== inspection.model.revision) throw new Error('This saved view belongs to another model revision. Its original reference is retained; no substitute view was loaded.');
    await invoke(client, 'restoreInspection', { inspection });
    display(await invoke(client, 'getState'), client);
    status(`Restored ${item.part_label || item.title}. The saved camera and source pose are restored with playback paused.`);
  }
  async function perform(action, target) {
    if (busy) return;
    if (action === 'retry') { status('Reconnecting to Explorer…'); connect(); return; }
    const client = connection;
    if (!client || state?.lifecycle !== 'ready') { status('Wait for the reference assembly to finish loading.', true); return; }
    busy = true; updateControls();
    try {
      if (action === 'capture') await capture(client);
      if (action === 'frame') await invoke(client, 'frame', { nodeId: state.navigation.selectedId });
      if (action === 'motion') { await playOperationPreservingSelection((method, params) => invoke(client, method, params)); status('Playing one authored cycle with your component selected. Capture pauses motion before saving the view.'); }
      if (action === 'select') await invoke(client, 'select', { nodeId: target.value });
      if (action === 'attach') {
        if (!candidate) throw new Error('Capture a view before attaching it.');
        const input = { ...copy(candidate), note: element('deal-explorer-note').value.trim() };
        const result = await onEvidence(input);
        if (!active(client)) return;
        saved.push(copy(result || input)); candidate = null;
        element('deal-explorer-saved').innerHTML = savedMarkup(saved, dealId);
        button('attach').textContent = 'Attached';
        status(quoteId ? `Reference saved to this deal and ${root.dataset.quoteLabel || 'this quote'}. ${root.dataset.quoteStatus === 'issued' ? 'Create a new quote revision to include this finding.' : 'Review this finding with the draft before issue.'} Published proposals stay unchanged.` : 'Reference saved to this deal for all alternatives. Include it in a quote revision before publishing to the customer. Published proposals stay unchanged.');
      }
      if (action === 'restore') {
        const item = saved.find(entry => entry.id === target.dataset.evidenceId && entry.deal_id === dealId);
        if (!item) throw new Error('This reference does not belong to the current deal.');
        const inspection = normalizer(validateInspection(item.reference));
        if (state.model?.id !== inspection.model.id) {
          pendingRestore = item;
          frame.src = explorerEmbedURL(win.location.origin, inspection.model.id);
          status('Loading the saved reference assembly. Its exact model revision will be checked before restoration.');
        } else await restore(client, item);
      }
    } catch (error) { if (active(client)) { status(error.code === 'BUSY_STATE' ? 'Pause playback and let the view settle, then capture again.' : error.message, true); onError(error); } }
    finally { busy = false; if (!disposed && root.isConnected) updateControls(); }
  }
  const click = event => { const target = event.target.closest('[data-explorer-action]'); if (!target || !root.contains(target)) return; event.preventDefault(); void perform(target.dataset.explorerAction, target); };
  const change = event => { if (event.target.id === 'deal-explorer-component') void perform('select', event.target); };
  root.addEventListener('click', click); root.addEventListener('change', change); frame.addEventListener('load', connect);
  Promise.all([import(CLIENT_URL), import(INSPECTION_URL)]).then(([client, inspections]) => { if (disposed) return; clientFactory = client.c; normalizer = inspections.n; connect(); }).catch(error => { if (!disposed) { status('The Explorer connection module could not load. Reload this page to retry.', true); onError(error); } });
  return () => {
    disposed = true; ++generation; root.removeEventListener('click', click); root.removeEventListener('change', change); frame.removeEventListener('load', connect);
    const previous = connection; connection = null;
    if (previous) previous.request('dispose', {}, { timeoutMs: 1000 }).catch(() => {}).finally(() => previous.close());
  };
}
