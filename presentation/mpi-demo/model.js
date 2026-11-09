import {
  THREE, OrbitControls, createComplexGraphicMachine,
  addPrecisionLighting, createPrecisionContact,
} from './vendor/mpi35.bundle.js';

// This adapter controls an existing MPI Website study. It does not invent CAD,
// component identity, fit checks, an inquiry, or any commercial record.
const MODEL = 'mpi-35-series-illustrative-20261109';
const AREAS = ['whole', 'tooling', 'controls', 'injection'];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finiteVector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

/** The host owns the clock: call update(seconds) from its animation loop. */
export async function createDemoModel(container, { onInteraction, onError } = {}) {
  if (!container?.appendChild) throw new Error('A model container is required.');
  let destroyed = false, paused = true, transition = null, focus = 'whole', opening = 1;
  let dirty = true, interacting = false, span = 5.9, minimumWidth = 5.5;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f2f1);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Interactive illustrative MPI 35 Series study. Not engineering CAD.');
  container.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 100);
  camera.position.set(-6.8, 5.1, 10);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2.04, 0);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.enableZoom = true;
  controls.minZoom = 0.75;
  controls.maxZoom = 2.5;
  controls.minPolarAngle = 0.32;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.rotateSpeed = 0.55;
  controls.update();
  addPrecisionLighting(scene);
  const model = createComplexGraphicMachine({ treatment: 'precision', onChange: () => { dirty = true; } });
  scene.add(model.group);
  const contact = createPrecisionContact(renderer, scene, model.group, model.bounds);

  function assertActive() { if (destroyed) throw new Error('The model has been disposed.'); }
  function draw() {
    if (destroyed || !dirty || !container.clientWidth || !container.clientHeight) return;
    dirty = false;
    contact.update();
    renderer.render(scene, camera);
  }
  function projection() {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    const aspect = width / height;
    const visibleHeight = Math.max(span, minimumWidth / aspect);
    camera.left = -visibleHeight * aspect / 2;
    camera.right = visibleHeight * aspect / 2;
    camera.top = visibleHeight / 2;
    camera.bottom = -visibleHeight / 2;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  function resize() {
    if (destroyed) return;
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2500000 / (width * height))));
    renderer.setSize(width, height, false);
    projection();
    draw();
  }
  function sourcePoint(point) {
    model.group.updateMatrixWorld(true);
    return model.machine.localToWorld(new THREE.Vector3(...point));
  }
  function preset(area) {
    if (area === 'whole') return { position: new THREE.Vector3(-6.8, 5.1, 10), target: new THREE.Vector3(0, 2.04, 0), span: 5.9, width: 5.5 };
    // Targets point to the unchanged source geometry; these are presentation
    // cameras, never claims about installation or operator clearance.
    const spec = {
      tooling: { target: [0, 52, 31], offset: [-5.4, 3.0, 10], span: 3.15, width: 3.6 },
      controls: { target: [70, 66, 26], offset: [-1.4, 1.6, 9], span: 2.3, width: 2.4 },
      injection: { target: [0, 67, -40], offset: [-7.2, 3.1, -8], span: 3.5, width: 3.0 },
    }[area];
    const target = sourcePoint(spec.target);
    return { target, position: target.clone().add(new THREE.Vector3(...spec.offset)), span: spec.span, width: spec.width };
  }
  function frame(area, { duration = 1.2 } = {}) {
    assertActive();
    if (!AREAS.includes(area)) throw new Error('Unknown MPI inspection area.');
    if (!Number.isFinite(duration) || duration < 0) throw new Error('Frame duration must be a nonnegative number.');
    focus = area;
    const next = preset(area);
    const previousZoom = camera.zoom;
    transition = {
      start: camera.position.clone(), targetStart: controls.target.clone(),
      spanStart: span, widthStart: minimumWidth, zoomStart: previousZoom,
      ...next, elapsed: 0, duration: Math.min(10, duration),
    };
    if (!duration) commitFrame(1);
    dirty = true;
    draw();
  }
  function commitFrame(progress) {
    const motion = transition;
    if (!motion) return;
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(motion.start, motion.position, eased);
    controls.target.lerpVectors(motion.targetStart, motion.target, eased);
    span = THREE.MathUtils.lerp(motion.spanStart, motion.span, eased);
    minimumWidth = THREE.MathUtils.lerp(motion.widthStart, motion.width, eased);
    camera.zoom = THREE.MathUtils.lerp(motion.zoomStart, 1, eased);
    projection();
    controls.update();
    if (progress >= 1) transition = null;
    dirty = true;
  }
  function setOpening(value) {
    assertActive();
    if (!Number.isFinite(value)) throw new Error('Opening must be finite.');
    opening = clamp(value, 0, 1);
    // Identical source presentation mapping: platen top 30, daylight 6…48 in.
    model.moving.position.y = 30 + 6 + 42 * opening;
    dirty = true;
  }
  function capture() {
    assertActive();
    if (transition || interacting) throw new Error('Pause and settle the model before saving a view.');
    return { version: 1, model: MODEL, focus, opening, span, minimumWidth, camera: {
      position: camera.position.toArray(), target: controls.target.toArray(), zoom: camera.zoom,
    } };
  }
  function restore(state) {
    assertActive();
    if (!state || state.version !== 1 || state.model !== MODEL || !AREAS.includes(state.focus)
      || !Number.isFinite(state.opening) || state.opening < 0 || state.opening > 1
      || !Number.isFinite(state.span) || state.span < 1 || state.span > 10
      || !Number.isFinite(state.minimumWidth) || state.minimumWidth < 1 || state.minimumWidth > 10
      || !finiteVector(state.camera?.position) || !finiteVector(state.camera?.target)
      || !Number.isFinite(state.camera?.zoom) || state.camera.zoom < 0.75 || state.camera.zoom > 2.5) {
      throw new Error('This view does not belong to the current MPI demonstration model.');
    }
    transition = null;
    focus = state.focus;
    setOpening(state.opening);
    span = state.span;
    minimumWidth = state.minimumWidth;
    camera.position.fromArray(state.camera.position);
    controls.target.fromArray(state.camera.target);
    camera.zoom = state.camera.zoom;
    projection();
    controls.update();
    dirty = true;
    draw();
  }
  function orbit(horizontal, vertical = 0) {
    assertActive();
    if (![horizontal, vertical].every(Number.isFinite)) throw new Error('Orbit values must be finite.');
    if (paused || transition || interacting) return;
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta += horizontal;
    spherical.phi = clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
    dirty = true;
  }
  function update(dt) {
    if (destroyed) return;
    if (!paused && transition) {
      transition.elapsed += clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
      commitFrame(Math.min(1, transition.elapsed / transition.duration));
    }
    draw();
  }
  function reset() {
    assertActive();
    transition = null;
    setOpening(1);
    frame('whole', { duration: 0 });
  }
  function manualStart() {
    interacting = true;
    paused = true;
    transition = null;
    onInteraction?.();
  }
  function manualEnd() { interacting = false; dirty = true; draw(); }
  function changed() { dirty = true; draw(); }
  function contextLost(event) {
    event.preventDefault();
    paused = true;
    transition = null;
    onError?.('The 3D view was interrupted. Reload this demonstration or return to the pitch.');
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    observer.disconnect();
    controls.removeEventListener('start', manualStart);
    controls.removeEventListener('end', manualEnd);
    controls.removeEventListener('change', changed);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    controls.dispose();
    contact.dispose();
    model.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    scene.clear();
  }
  controls.addEventListener('start', manualStart);
  controls.addEventListener('end', manualEnd);
  controls.addEventListener('change', changed);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  try {
    await model.ready;
    reset();
    resize();
    draw();
  } catch (error) {
    destroy();
    throw error;
  }
  return {
    ready: true, frame, setOpening,
    setPaused(value) { paused = Boolean(value); },
    update, capture, restore, reset, destroy, orbit,
    isSettled: () => !transition && !interacting,
  };
}
