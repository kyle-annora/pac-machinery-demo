import { escapeHTML as e } from './model.js';
import { mountReferenceExplorer } from './explorer.js';

const icon = (name) => `<img class="icon" src="/website/assets/icons/${name}.svg" alt="" aria-hidden="true">`;
const chapters = [
  { title: 'Explore the details', copy: 'Drag to rotate. Select a part to take a closer look.' },
  { title: 'See how it moves', copy: 'See rotation turn into a back-and-forth movement.' },
  { title: 'Ask your question', copy: 'What would you like to know about your application?' },
];

export function homeInquiryReference(product, { capture = null, question = '' } = {}) {
  const note = String(question).trim().slice(0, 2000);
  return {
    productId: product.id,
    title: capture?.title || `Rollbag ${product.model}`,
    note,
    source: capture ? 'Reference assembly — not PAC CAD' : product.photoNote,
    preview: capture ? capture.preview || undefined : product.photos[0]?.url,
    ...(capture ? { inspection: capture.inspection } : { photo: product.photos[0]?.url }),
  };
}

export function renderHomeExplorer(product) {
  return `<section class="home-explorer" id="home-explorer" aria-labelledby="home-explorer-title">
    <div class="section-heading"><h2 id="home-explorer-title">A closer look. <br>A better conversation.</h2><p>Explore a mechanism in 3D, then talk with PAC about your packaging application.</p></div>
    <div class="home-explorer-shell">
      <aside class="home-guide" aria-label="Equipment exploration guide">
        <ol>${chapters.map((chapter, i) => `<li><h3><button data-home-step="${i}" id="home-step-${i}" aria-expanded="${i === 0}" aria-controls="home-chapter-${i}"><span class="home-step-number" aria-hidden="true">${i + 1}</span>${chapter.title}${icon('chevron-down')}</button></h3><div class="home-chapter" id="home-chapter-${i}" role="region" aria-labelledby="home-step-${i}" ${i ? 'hidden' : ''}><p>${chapter.copy}</p>${i === 0 ? `<p class="home-selected-part" id="home-selected-part" aria-live="polite">Whole assembly</p><button class="text-button" data-home-overview hidden>Show whole assembly</button><a href="#/products/${e(product.id)}" class="text-link" aria-label="View ${e(product.name)} product details">View Rollbag ${e(product.model)} ${icon('arrow-up-right')}</a>` : i === 1 ? `<button class="home-motion-button" data-home-motion disabled>Play motion</button>` : `<label for="home-question" class="sr-only">Your application question</label><textarea id="home-question" rows="3" maxlength="2000" placeholder="For example: How would this fit our loading process?"></textarea><p class="home-view-note" id="home-view-note">Your current 3D view will be included.</p><button class="button button-yellow" data-home-inquiry>Continue to inquiry ${icon('arrow-right')}</button><button class="text-button" data-home-without-view hidden>Continue without a 3D view</button>`}</div></li>`).join('')}</ol>
        <p class="home-scene-status" id="home-scene-status" role="status" hidden></p><button class="text-button" data-home-retry hidden>Retry 3D connection</button>
      </aside>
      <div class="home-explorer-stage">
        <section class="home-reference-view" aria-label="Interactive reference assembly">
          <div class="home-stage-meta"><strong id="home-scene-title">Crank-slider mechanism</strong><span>Reference assembly · Not PAC CAD</span></div>
          <div class="iframe-stage"><iframe id="reference-frame" title="Interactive reference mechanism — not PAC CAD" allow="fullscreen"></iframe></div>
        </section>
      </div>
    </div>
  </section>`;
}

export function mountHomeExplorer({ product, onContinue, document: doc = globalThis.document, mountReference = mountReferenceExplorer }) {
  const host = doc.getElementById('home-explorer');
  if (!host) return () => {};
  const inquiry = host.querySelector('[data-home-inquiry]');
  const motion = host.querySelector('[data-home-motion]');
  const overview = host.querySelector('[data-home-overview]');
  const fallback = host.querySelector('[data-home-without-view]');
  const retry = host.querySelector('[data-home-retry]');
  const status = doc.getElementById('home-scene-status');
  let controller = null, disposed = false, started = false, observer = null;
  let currentChapter = 0, ready = false, busy = false, handingOff = false;
  let rootNode = null, state = null, selectedNode = null, intent = 0, actions = Promise.resolve();
  const handlers = [];
  const listen = (element, event, callback) => {
    if (!element) return;
    element.addEventListener(event, callback);
    handlers.push(() => element.removeEventListener(event, callback));
  };
  function say(message = '', error = false) {
    if (disposed) return;
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle('form-error', error);
  }
  function updateControls() {
    if (disposed) return;
    inquiry.disabled = handingOff || busy;
    motion.disabled = !ready || handingOff;
    motion.setAttribute('aria-disabled', String(!ready || busy || handingOff));
    motion.textContent = state?.operation?.status === 'playing' ? 'Pause motion' : 'Play motion';
    overview.hidden = !selectedNode || selectedNode.id === rootNode?.id;
    overview.disabled = !ready || busy || handingOff;
    host.querySelectorAll('[data-home-step]').forEach(button => { button.disabled = handingOff; });
    doc.getElementById('home-view-note').textContent = ready
      ? 'Your current 3D view will be included.'
      : 'You can continue with your question while 3D loads.';
  }
  function run(action) {
    const id = ++intent;
    actions = actions.catch(() => {}).then(async () => {
      if (disposed || !ready || id !== intent) return;
      const current = () => !disposed && id === intent;
      say();
      retry.hidden = true;
      await action(current);
    }).catch(error => { if (!disposed && id === intent) say(error.message, true); });
    return actions;
  }
  async function applyChapter(current) {
    if (currentChapter === 1) {
      const selectedId = state?.navigation?.selectedId;
      if (state?.presentation?.mode !== 'operate') {
        await controller.request('setMode', {mode: 'operate'});
        if (!current()) return;
        if (selectedId) await controller.request('select', {nodeId: selectedId});
      }
      if (current()) await controller.request('playOperation');
    } else {
      if (state?.operation?.status === 'playing') await controller.request('pauseOperation');
      if (!current()) return;
      // Asking a question preserves the exact pose; only the details step changes mode.
      if (currentChapter === 0 && state?.presentation?.mode !== 'explore') {
        const selectedId = state?.navigation?.selectedId;
        await controller.request('setMode', {mode: 'explore'});
        if (current() && selectedId) await controller.request('select', {nodeId: selectedId});
      }
    }
  }
  const startReference = () => {
    if (disposed || started) return;
    started = true;
    observer?.disconnect();
    controller = mountReference({ document: doc, frameOnReady: true, branding: true, websiteSurface: true,
      onReady: (connected) => {
        if (disposed) return;
        controller = connected;
        ready = true;
        retry.hidden = true;
        say();
        updateControls();
        if (currentChapter !== 0) void run(applyChapter);
      },
      onStateChange: (next) => {
        if (disposed) return;
        ({state, rootNode, selectedNode, ready, busy} = next);
        const title = selectedNode?.title || selectedNode?.label || 'Whole assembly';
        doc.getElementById('home-selected-part').textContent = selectedNode?.id === rootNode?.id ? 'Whole assembly' : title;
        doc.getElementById('home-scene-title').textContent = selectedNode?.title || selectedNode?.label || 'Crank-slider mechanism';
        updateControls();
      },
      onStatus: (message, error) => {
        if (disposed) return;
        if (error) {
          say(message, true);
          retry.hidden = ready;
        } else if (!ready) say('Loading 3D…');
        else if (!handingOff) say();
      },
    });
  };
  const setChapter = (index) => {
    if (disposed || handingOff || !Number.isInteger(index) || index < 0 || index > 2) return;
    const changed = currentChapter !== index;
    currentChapter = index;
    host.querySelectorAll('[data-home-step]').forEach((button) => {
      const selected = Number(button.dataset.homeStep) === index;
      button.setAttribute('aria-expanded', String(selected));
      doc.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
    });
    startReference();
    if (changed && ready) void run(applyChapter);
  };
  host.querySelectorAll('[data-home-step]').forEach(button => listen(button, 'click', () => setChapter(Number(button.dataset.homeStep))));
  listen(motion, 'click', () => {
    if (busy) return;
    void run(async () => {
      await controller.request(state?.operation?.status === 'playing' ? 'pauseOperation' : 'playOperation');
    });
  });
  listen(overview, 'click', () => void run(async (current) => {
    await controller.request('select', {nodeId: rootNode.id});
    if (current()) await controller.request('frame', {nodeId: rootNode.id});
  }));
  listen(retry, 'click', () => { retry.hidden = true; controller?.retry(); });
  async function continueInquiry(withView) {
    if (disposed || handingOff) return;
    handingOff = true;
    updateControls();
    fallback.hidden = true;
    try {
      let capture = null;
      if (withView && ready) {
        say('Keeping this view with your question…');
        await actions;
        if (disposed) return;
        capture = await controller.capture();
      }
      if (!disposed) onContinue(homeInquiryReference(product, { capture, question: doc.getElementById('home-question').value }));
    } catch {
      if (!disposed) {
        say('This view could not be attached. Try again, or continue with your question only.', true);
        fallback.hidden = false;
      }
    } finally {
      handingOff = false;
      updateControls();
    }
  }
  listen(inquiry, 'click', () => void continueInquiry(true));
  listen(fallback, 'click', () => void continueInquiry(false));
  const Observer = doc.defaultView?.IntersectionObserver;
  if (Observer) {
    observer = new Observer((entries) => { if (entries.some(entry => entry.isIntersecting)) startReference(); }, {rootMargin: '200px'});
    observer.observe(host);
  } else startReference();
  updateControls();
  return () => {
    disposed = true;
    intent++;
    observer?.disconnect();
    handlers.forEach(remove => remove());
    controller?.();
    controller = null;
  };
}
