// Website-only adapter. The vendored Explorer owns its renderer and camera;
// this page uses its public iframe API and never reads its application state.
const CLIENT_URL = "/explorer/assets/embed-client-DZNJSvOD.js";
const INSPECTION_URL = "/explorer/assets/inspection-reference-WG_yQLtT.js";

export function referenceURL(origin, { branding = false, websiteSurface = false } = {}) {
  const url = new URL("/explorer/", origin);
  url.searchParams.set("embed", "1");
  url.searchParams.set("parentOrigin", origin);
  url.searchParams.set("model", "kinetic-01");
  if (branding) url.searchParams.set("branding", "pac");
  if (websiteSurface) {
    url.searchParams.set("surface", "website");
    url.searchParams.set("appearance", "dark");
  }
  return url.toString();
}

export function mountReferenceExplorer({
  onCapture,
  onBusyChange = () => {},
  onStateChange = () => {},
  onReady = () => {},
  onStatus = () => {},
  frameOnReady = false,
  branding = false,
  websiteSurface = false,
  captureMessage = 'View captured. Add your question, then choose “Add to my inquiry.” This is a reference assembly, not PAC CAD.',
  document: doc = globalThis.document,
  window: win = globalThis.window,
  loadModule = (url) => import(url),
} = {}) {
  const frame = doc.getElementById("reference-frame");
  const select = doc.getElementById("reference-component");
  const frameButton = doc.getElementById("reference-frame-button");
  const captureButton = doc.getElementById("reference-capture");
  const retryButton = doc.getElementById("reference-retry");
  const status = doc.getElementById("reference-status");
  if (!frame) {
    const cleanup = () => {};
    const unavailable = () => Promise.reject(new Error("The Explorer frame is unavailable."));
    return Object.assign(cleanup, { request: unavailable, capture: unavailable, retry: unavailable });
  }
  let disposed = false,
    connection = null,
    state = null,
    capabilities = null,
    rootNode = null;
  let clientFactory,
    normalize,
    hydrated = false,
    hydrating = false,
    busy = false,
    queued = 0,
    queue = Promise.resolve(),
    loadingModules = null;
  const nodes = new Map();
  const nodeRequests = new Map();
  const active = (client) =>
    !disposed && client && connection === client && frame.isConnected;
  const ready = () => Boolean(active(connection) && hydrated && state?.lifecycle === "ready");
  const inactiveError = () => Object.assign(
    new Error("This Explorer view is no longer open."),
    { code: "STALE_VIEW" },
  );
  const say = (message, error = false) => {
    if (disposed) return;
    if (status) {
      status.textContent = message;
      status.classList.toggle("form-error", error);
    }
    onStatus(message, error);
  };
  function update() {
    if (disposed) return;
    const usable = ready();
    if (select) select.disabled = !usable || busy || !nodes.size;
    if (frameButton) frameButton.disabled = !usable || busy;
    if (captureButton) captureButton.disabled = !usable || busy || !capabilities?.inspections?.available;
    onStateChange({
      state,
      selectedNode: nodes.get(state?.navigation?.selectedId) || null,
      rootNode,
      ready: usable,
      busy,
    });
  }
  function setBusy(next) {
    if (busy === next) return;
    busy = next;
    if (!disposed) onBusyChange(busy);
  }
  async function invoke(client, method, params = {}) {
    if (!active(client)) throw inactiveError();
    let response;
    try {
      response = await client.request(method, params);
    } catch (error) {
      if (!active(client)) throw inactiveError();
      throw error;
    }
    if (!active(client)) throw inactiveError();
    if (response.payload?.status !== "completed") {
      throw Object.assign(
        new Error(
          response.payload?.error?.message ||
            "The Explorer could not complete that action.",
        ),
        { code: response.payload?.error?.code },
      );
    }
    return response.payload.result;
  }
  async function getNode(client, nodeId) {
    if (!nodeId) return null;
    if (!active(client)) throw inactiveError();
    if (nodes.has(nodeId)) return nodes.get(nodeId);
    if (nodeRequests.has(nodeId)) return nodeRequests.get(nodeId);
    const request = invoke(client, "getNode", { nodeId }).then((node) => {
      if (!active(client)) throw inactiveError();
      if (node?.id) nodes.set(node.id, node);
      return node;
    });
    nodeRequests.set(nodeId, request);
    try {
      return await request;
    } finally {
      if (nodeRequests.get(nodeId) === request) nodeRequests.delete(nodeId);
    }
  }
  function display(next, client) {
    if (!active(client) || !next?.lifecycle) return;
    state = next;
    if (
      select && [...select.options].some(
        (option) => option.value === state.navigation?.selectedId,
      )
    )
      select.value = state.navigation.selectedId;
    if (state.lifecycle === "ready" && !hydrated && !hydrating) void hydrate(client);
    update();
    const selectedId = state.navigation?.selectedId;
    if (hydrated && selectedId && !nodes.has(selectedId)) {
      void getNode(client, selectedId).then(() => {
        if (active(client) && state.navigation?.selectedId === selectedId) update();
      }).catch((error) => {
        if (active(client) && state.navigation?.selectedId === selectedId) say(error.message, true);
      });
    }
  }
  async function hydrate(client) {
    if (hydrated || hydrating || !active(client)) return;
    hydrating = true;
    try {
      const scopeId = state.navigation.scopeId;
      const nextCapabilities = await invoke(client, "getCapabilities");
      const nextRoot = await getNode(client, scopeId);
      const children = await invoke(client, "getChildren", {
        nodeId: nextRoot.id,
      });
      if (!active(client)) return;
      capabilities = nextCapabilities;
      rootNode = nextRoot;
      for (const node of [
        rootNode,
        ...(Array.isArray(children) ? children : children.children || []),
      ])
        nodes.set(node.id, node);
      select?.replaceChildren(
        ...[...nodes.values()].map((node) => {
          const option = doc.createElement("option");
          option.value = node.id;
          option.textContent = node.title || node.label || node.id;
          return option;
        }),
      );
      if (frameOnReady) await invoke(client, "frame", { nodeId: rootNode.id });
      display(await invoke(client, "getState"), client);
      let selectedId;
      do {
        selectedId = state.navigation?.selectedId;
        await getNode(client, selectedId);
        if (!active(client)) return;
      } while (state.navigation?.selectedId !== selectedId);
      if (state.lifecycle !== "ready") throw new Error("The Explorer is not ready yet.");
      hydrated = true;
      hydrating = false;
      if (retryButton) retryButton.hidden = true;
      say(
        "Reference ready. Drag to rotate, scroll to zoom, or choose a component. Capture a view to keep with your question.",
      );
      update();
      onReady(controller);
    } catch (error) {
      if (active(client)) {
        hydrated = false;
        hydrating = false;
        say(error.message, true);
        if (retryButton) retryButton.hidden = false;
        update();
      }
    }
  }
  function connect() {
    if (disposed || !clientFactory) return;
    connection?.close();
    state = null;
    capabilities = null;
    rootNode = null;
    hydrated = false;
    hydrating = false;
    queued = 0;
    queue = Promise.resolve();
    setBusy(false);
    nodes.clear();
    nodeRequests.clear();
    const client = clientFactory({
      iframe: frame,
      origin: win.location.origin,
      window: win,
      handshakeTimeoutMs: 60000,
    });
    connection = client;
    update();
    client.subscribe((event) => {
      if (["ready", "stateChanged", "helloAck"].includes(event.type))
        display(event.payload?.state || event.payload, client);
    });
    client.ready
      .then((payload) => display(payload.state, client))
      .catch((error) => {
        if (active(client)) {
          say(
            "The reference could not connect. Retry, or continue with product photographs.",
            true,
          );
          if (retryButton) retryButton.hidden = false;
        }
      });
  }
  function enqueue(action) {
    const client = connection;
    if (disposed || (client && !active(client))) return Promise.reject(inactiveError());
    if (!ready()) return Promise.reject(Object.assign(
      new Error("The Explorer is not ready yet."), { code: "NOT_READY" },
    ));
    queued++;
    const result = queue.then(async () => {
      if (!active(client)) throw inactiveError();
      if (!ready()) throw Object.assign(new Error("The Explorer is not ready yet."), { code: "NOT_READY" });
      return action(client);
    }).catch((error) => {
      if (active(client)) say(
        error.code === "BUSY_STATE" ? "Let the view settle, then try again." : error.message,
        true,
      );
      throw error;
    }).finally(() => {
      if (active(client)) {
        queued--;
        setBusy(queued > 0);
        update();
      }
    });
    // A failed command rejects its caller, without poisoning later commands.
    queue = result.catch(() => {});
    setBusy(true);
    update();
    return result;
  }
  const request = (method, params = {}) => enqueue(async (client) => {
    const result = await invoke(client, method, params);
    if (method === "getState") display(result, client);
    return result;
  });
  const capture = () => enqueue(async (client) => {
    if (!capabilities?.inspections?.available) throw Object.assign(
      new Error("View capture is unavailable in this Explorer."), { code: "CAPTURE_UNAVAILABLE" },
    );
    say("Capturing the reference view…");
    const current = await invoke(client, "getState");
    if (current.tour?.status === "playing") await invoke(client, "pauseTour");
    if (current.operation?.status === "playing") await invoke(client, "pauseOperation");
    let result;
    // Camera damping can briefly make capture busy. Only this read is retried.
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        result = await invoke(client, "captureInspection");
        break;
      } catch (error) {
        if (error.code !== "BUSY_STATE" || attempt === 7) throw error;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
    const inspection = normalize(result.inspection);
    const pose = inspection.view || inspection.tour;
    const node = await invoke(client, "getNode", { nodeId: pose.selectedId });
    if (!active(client)) throw inactiveError();
    const item = {
      title: node.title || node.label || "Reference assembly",
      preview: inspection.preview?.dataUrl || null,
      inspection,
    };
    onCapture?.(item);
    say(captureMessage);
    return item;
  });
  const selectAction = () => void request("select", { nodeId: select.value }).catch(() => {});
  const frameAction = () => void request("frame", { nodeId: state?.navigation?.selectedId }).catch(() => {});
  const captureAction = () => void capture().catch(() => {});
  const retryAction = () => {
    if (disposed) return Promise.reject(inactiveError());
    say("Reconnecting to the reference…");
    if (clientFactory) connect();
    else return loadModules();
    return Promise.resolve();
  };
  const retryClick = () => void retryAction().catch(() => {});
  select?.addEventListener("change", selectAction);
  frameButton?.addEventListener("click", frameAction);
  captureButton?.addEventListener("click", captureAction);
  retryButton?.addEventListener("click", retryClick);
  frame.addEventListener("load", connect);
  function loadModules() {
    if (loadingModules) return loadingModules;
    loadingModules = Promise.all([loadModule(CLIENT_URL), loadModule(INSPECTION_URL)])
    .then(([client, inspections]) => {
      if (disposed) return;
      clientFactory = client.c;
      normalize = inspections.n;
      frame.src = referenceURL(win.location.origin, { branding, websiteSurface });
    })
    .catch(() => {
      say(
        "The reference module could not load. Reload this page, or continue with product photographs.",
        true,
      );
      if (!disposed && retryButton) retryButton.hidden = false;
    }).finally(() => { loadingModules = null; });
    return loadingModules;
  }
  const controller = Object.assign(() => {
    if (disposed) return;
    disposed = true;
    select?.removeEventListener("change", selectAction);
    frameButton?.removeEventListener("click", frameAction);
    captureButton?.removeEventListener("click", captureAction);
    retryButton?.removeEventListener("click", retryClick);
    frame.removeEventListener("load", connect);
    const previous = connection;
    connection = null;
    if (previous)
      previous
        .request("dispose", {}, { timeoutMs: 1000 })
        .catch(() => {})
        .finally(() => previous.close());
  }, { request, capture, retry: retryAction });
  say("Loading the interactive reference assembly…");
  update();
  void loadModules();
  return controller;
}
