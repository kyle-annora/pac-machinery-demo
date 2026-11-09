import * as THREE from 'three';
import { create35SeriesGeometry } from './machine-geometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HERO_STUDIO, heroStudioEnabled, createHeroStudioBox, createHeroStudioEnvironment } from './hero-studio.js';
import { STUDY_VIEWS, renderStudyProfile, createRenderStudyBox, createRenderStudyEnvironment, applyRenderStudyMaterials, addRenderStudyAreaLights, createRenderStudyShadow } from './render-study.js';

// Illustrative 35 Series study. Proportions are read from the front and side views in
// MPI's published brochure (Brochure-Model-35-0722.pdf); parts are simplified and this
// is not MPI CAD. The model is written in inches and placed in the scene at 1:40.
const INCH = 1 / 40;
const DAYLIGHT_MIN = 6, DAYLIGHT_MAX = 48, PLATEN_TOP = 30;
const PRESETS = {
  whole: { position: [-5.5, 4.4, 11.4], target: [0.72, 1.62, 0.82] },
  tooling: { position: [-3.8, 3.1, 8.3], target: [0.04, 1.26, 0.9] },
  controls: { position: [-0.9, 2.7, 8.8], target: [1.82, 1.42, 0.52] },
  injection: { position: [-7.4, 3.7, -6.6], target: [0.2, 1.36, -0.42] },
};

export const daylightAt = opening => Math.round(DAYLIGHT_MIN + (DAYLIGHT_MAX - DAYLIGHT_MIN) * Math.max(0, Math.min(1, opening)));

export function createMachineExplorer(host, callbacks = {}) {
  // Presentation changes are opt-in. The sales-page camera, data and saved views keep their defaults.
  const hero = callbacks.presentation === 'hero';
  const studio = heroStudioEnabled(callbacks);
  const study = renderStudyProfile(callbacks);
  let studyView = callbacks.studyView === 'detail' ? 'detail' : 'whole';
  let disposed = false, active = true, frame = 0, last = 0, playing = false, turning = false;
  let opening = 1, cycle = 0, focus = 'whole', transition = null, annotations = [];
  let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = study ? study.exposure : studio ? HERO_STUDIO.exposure : hero ? 1.12 : 1;
  if (study) scene.background = new THREE.Color(study.background);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = study ? THREE.VSMShadowMap : studio ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const labelLayer = document.createElement('div');
  labelLayer.className = 'machine-explorer__labels';
  labelLayer.setAttribute('aria-hidden', 'true');
  host.appendChild(labelLayer);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);
  camera.position.fromArray(study ? STUDY_VIEWS[studyView].position : PRESETS.whole.position);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.fromArray(study ? STUDY_VIEWS[studyView].target : PRESETS.whole.target);
  controls.enablePan = false;
  controls.enableZoom = false; // Scrolling the sales page must not zoom the machine.
  controls.minPolarAngle = 0.24;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.rotateSpeed = 0.6;
  controls.update();

  let environment;
  if (study) environment = createRenderStudyEnvironment(renderer, study);
  else if (studio) environment = createHeroStudioEnvironment(renderer);
  else {
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.04);
    room.dispose(); pmrem.dispose();
  }
  scene.environment = environment.texture;
  scene.environmentIntensity = study ? study.environmentIntensity : studio ? HERO_STUDIO.environmentIntensity : hero ? 0.92 : 0.72;
  scene.add(new THREE.HemisphereLight(0xffffff, study ? study.groundLight : studio ? 0x586977 : 0xb7bdbf, study ? study.hemisphereIntensity : studio ? HERO_STUDIO.hemisphereIntensity : 0.9));
  const key = new THREE.DirectionalLight(0xffffff, study ? study.keyIntensity : studio ? HERO_STUDIO.keyIntensity : 2.5);
  key.position.fromArray(study ? study.keyPosition : [-5, 10, 7]); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 });
  key.shadow.normalBias = 0.02;
  key.shadow.bias = -0.0002;
  key.shadow.radius = study ? 6 : 5;
  if (study) {
    Object.assign(key.shadow.camera, { left: -4.2, right: 4.2, top: 5.2, bottom: -3.2 });
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.blurSamples = 12;
    key.shadow.normalBias = 0.009;
    key.shadow.bias = -0.00012;
  }
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8eef2, study ? study.fillIntensity : studio ? HERO_STUDIO.fillIntensity : 0.8);
  fill.position.set(6, 5, -5); scene.add(fill);
  if (hero) {
    const rim = new THREE.DirectionalLight(study ? study.rimColor : studio ? 0xdcecf5 : 0xa8dcf3, study ? study.rimIntensity : studio ? HERO_STUDIO.rimIntensity : 2.2);
    rim.position.set(2, 6, -6); scene.add(rim);
  }

  if (study) addRenderStudyAreaLights(scene, study);

  const track = value => { materials.add(value); return value; };
  const standard = (color, options = {}) => track(new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, ...options }));
  const mat = {
    paint: track(new THREE.MeshPhysicalMaterial({ color: 0xdcddd5, roughness: 0.5, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.45 })),
    shade: track(new THREE.MeshPhysicalMaterial({ color: 0xcfd0c8, roughness: 0.55, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.5 })),
    chrome: standard(0xdde1e3, { metalness: 0.98, roughness: 0.16 }),
    alloy: standard(0xc1c6c9, { metalness: 0.72, roughness: 0.36 }),
    steel: standard(0x8d9396, { metalness: 0.78, roughness: 0.38 }),
    table: standard(0x70777a, { metalness: 0.62, roughness: 0.44 }),
    tank: standard(0xcfd3d5, { metalness: 0.88, roughness: 0.3 }),
    black: standard(0x232628, { metalness: 0.5, roughness: 0.32 }),
    rubber: standard(0x141617, { metalness: 0, roughness: 0.72 }),
    brass: standard(0xb9964c, { metalness: 0.85, roughness: 0.34 }),
    stop: standard(0xb3261e, { roughness: 0.42 }),
    go: standard(0x2f8f5b, { roughness: 0.42 }),
    glass: track(new THREE.MeshPhysicalMaterial({ color: 0xd5e4ea, transparent: true, opacity: 0.13, depthWrite: false, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 })),
  };
  if (studio) for (const [name, finish] of Object.entries(HERO_STUDIO.finishes)) mat[name].setValues(finish);
  if (study) applyRenderStudyMaterials(mat, track, textures, renderer);
  const inkLine = track(new THREE.LineBasicMaterial({ color: 0x25292c, transparent: true, opacity: 0.34 }));
  const focusLine = track(new THREE.LineBasicMaterial({ color: 0x0a7fb0, transparent: true, opacity: 0.95 }));
  const dimLine = track(new THREE.LineBasicMaterial({ color: 0x0a7fb0, transparent: true, opacity: 0.95, depthTest: false }));

  const root = new THREE.Group(); root.scale.setScalar(INCH); scene.add(root);
  const machine = new THREE.Group(); root.add(machine);
  const add = (geometry, material, parent, position, edges = true) => {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.castShadow = material !== mat.glass; object.receiveShadow = material !== mat.glass;
    if (edges && !studio && !study) {
      const outline = new THREE.EdgesGeometry(geometry, 32); geometries.add(outline);
      object.add(new THREE.LineSegments(outline, inkLine));
    }
    parent.add(object); return object;
  };
  const box = (parent, position, size, material = mat.paint, edges = true) => add(study && material !== mat.glass ? createRenderStudyBox(size) : studio && material !== mat.glass ? createHeroStudioBox(size) : new THREE.BoxGeometry(...size), material, parent, position, edges);
  const rod = (parent, position, radius, length, material = mat.chrome, axis = 'y', edges = false) => {
    const object = add(new THREE.CylinderGeometry(radius, radius, length, 40), material, parent, position, edges);
    if (axis === 'x') object.rotation.z = Math.PI / 2;
    if (axis === 'z') object.rotation.x = Math.PI / 2;
    return object;
  };
  const tube = (parent, points, radius = 0.85, material = mat.rubber) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 60, radius, 12), material, parent, [0, 0, 0], false);

  // Ground: a soft contact shadow and a one-foot grid, so the size of the press reads at once.
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), track(new THREE.ShadowMaterial({ opacity: study ? study.shadowOpacity : 0.34 })));
  geometries.add(shadow.geometry); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.002; shadow.receiveShadow = true; scene.add(shadow);
  // A soft contact shade, so the machine stands on the floor instead of floating over it.
  const contactCanvas = document.createElement('canvas'); contactCanvas.width = contactCanvas.height = 256;
  const contactPaint = contactCanvas.getContext('2d'), contactGradient = contactPaint.createRadialGradient(128, 128, 18, 128, 128, 128);
  contactGradient.addColorStop(0, hero ? 'rgba(0,0,0,.72)' : 'rgba(28,32,34,.42)'); contactGradient.addColorStop(0.6, hero ? 'rgba(0,0,0,.28)' : 'rgba(28,32,34,.18)'); contactGradient.addColorStop(1, hero ? 'rgba(0,0,0,0)' : 'rgba(28,32,34,0)');
  contactPaint.fillStyle = contactGradient; contactPaint.fillRect(0, 0, 256, 256);
  const contactTexture = new THREE.CanvasTexture(contactCanvas); textures.add(contactTexture);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(hero ? 4.8 : 6.8, hero ? 4.3 : 6.6), track(new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false })));
  geometries.add(contact.geometry); contact.rotation.x = -Math.PI / 2; contact.position.set(hero ? 0.72 : 0.95, 0.002, hero ? 0.9 : 0.42); scene.add(contact);
  if (study) {
    contact.visible = false;
    shadow.visible = false;
  }
  const gridPoints = [];
  for (let n = -24; n <= 28; n += 1) gridPoints.push(n / 3.3333, 0, -24 / 3.3333, n / 3.3333, 0, 28 / 3.3333);
  for (let n = -24; n <= 28; n += 1) gridPoints.push(-24 / 3.3333, 0, n / 3.3333, 28 / 3.3333, 0, n / 3.3333);
  const gridGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
  geometries.add(gridGeometry);
  const grid = new THREE.LineSegments(gridGeometry, track(new THREE.LineBasicMaterial({ color: 0x9fa7a9, transparent: true, opacity: 0.16 })));
  scene.add(grid);
  grid.visible = !hero;

  const { moving, tooling, panel, rear, door, screen } = create35SeriesGeometry({ add, box, rod, tube, mat, track, geometries, study, machine });

  // Six-foot figure: flat, so it is read as a scale mark and not as a modelled person.
  const figureShape = new THREE.Shape();
  figureShape.moveTo(-3.4, 0); figureShape.lineTo(-2.5, 33); figureShape.lineTo(-7.2, 35); figureShape.lineTo(-9.5, 55);
  figureShape.quadraticCurveTo(-9, 60, -4.6, 60.5); figureShape.lineTo(-1.9, 62); figureShape.lineTo(1.9, 62); figureShape.lineTo(4.6, 60.5);
  figureShape.quadraticCurveTo(9, 60, 9.5, 55); figureShape.lineTo(7.2, 35); figureShape.lineTo(2.5, 33); figureShape.lineTo(3.4, 0);
  figureShape.lineTo(0.8, 0); figureShape.lineTo(0, 31); figureShape.lineTo(-0.8, 0); figureShape.closePath();
  const figureMaterial = track(new THREE.MeshBasicMaterial({ color: 0x8b9497, transparent: true, opacity: 0.46, side: THREE.DoubleSide }));
  const figure = new THREE.Group(); figure.position.set(-78, 0, 30); root.add(figure);
  const figureBody = new THREE.Mesh(new THREE.ShapeGeometry(figureShape), figureMaterial); geometries.add(figureBody.geometry);
  const figureHead = new THREE.Mesh(new THREE.CircleGeometry(4, 32), figureMaterial); geometries.add(figureHead.geometry); figureHead.position.y = 67.5;
  figure.add(figureBody, figureHead);

  // Dimension lines carry MPI's published numbers; labels are placed by the host.
  const line = (parent, points, material = dimLine) => {
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3)); geometries.add(geometry);
    const segments = new THREE.LineSegments(geometry, material); segments.renderOrder = 10; parent.add(segments); return segments;
  };
  const dimensions = { whole: new THREE.Group(), tooling: new THREE.Group() };
  Object.values(dimensions).forEach(group => machine.add(group));
  line(dimensions.whole, [[-46, 0.2, 26], [-46, 148, 26], [-49, 0.2, 26], [-43, 0.2, 26], [-49, 148, 26], [-43, 148, 26], [-43, 148, 26], [-9, 148, 0]]);
  line(dimensions.whole, [[-32, 0.2, 90], [125, 0.2, 90], [-32, 0.2, 87], [-32, 0.2, 93], [125, 0.2, 87], [125, 0.2, 93], [-32, 0.2, 87], [-32, 0.2, 30], [125, 0.2, 87], [125, 0.2, 8]]);
  const daylightDim = line(dimensions.tooling, [[-38, PLATEN_TOP, 28], [-38, 78, 28], [-41, PLATEN_TOP, 28], [-35, PLATEN_TOP, 28], [-41, 78, 28], [-35, 78, 28]]);
  line(dimensions.tooling, [[-24, 30.25, -24], [24, 30.25, -24], [24, 30.25, -24], [24, 30.25, 24], [24, 30.25, 24], [-24, 30.25, 24], [-24, 30.25, 24], [-24, 30.25, -24]]);

  const studyShadow = study ? createRenderStudyShadow(renderer, scene, root, study) : null;

  let pendingAssets = 2;
  const loader = new THREE.TextureLoader();
  const loadTexture = (src, apply) => loader.load(src, texture => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; textures.add(texture); apply(texture); invalidate();
    pendingAssets -= 1;
    if (!pendingAssets) callbacks.onAssetsReady?.();
  });
  loadTexture('/assets/mpi-control-interface.webp', texture => { screen.material.map = texture; screen.material.color.set(0xffffff); screen.material.needsUpdate = true; });
  loadTexture('/assets/mpi-logo.png', texture => {
    const ratio = texture.image.height / texture.image.width, geometry = new THREE.PlaneGeometry(24, 24 * ratio); geometries.add(geometry);
    const logo = new THREE.Mesh(geometry, track(new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false })));
    logo.position.set(85, 78.5, study ? 24.57 : 24.85); door.parent.add(logo);
  });

  const outlines = {};
  for (const [id, group] of Object.entries({ tooling, controls: panel, injection: rear })) {
    outlines[id] = [];
    group.traverse(object => {
      if (!object.isMesh || object.geometry === screen.geometry) return;
      // The presentation bevel has no hard edges at this threshold. Preserve
      // the same inspection envelope when a customer deliberately selects it.
      const bounds = object.geometry.parameters;
      const focusShape = (study || studio) && object.geometry.type === 'RoundedBoxGeometry' ? new THREE.BoxGeometry(bounds.width, bounds.height, bounds.depth) : object.geometry;
      const geometry = new THREE.EdgesGeometry(focusShape, 36); geometries.add(geometry);
      if (focusShape !== object.geometry) focusShape.dispose();
      const lines = new THREE.LineSegments(geometry, focusLine); lines.visible = false;
      object.add(lines); outlines[id].push(lines);
    });
  }
  function highlight() {
    Object.entries(outlines).forEach(([id, lines]) => lines.forEach(item => { item.visible = focus === id; }));
    Object.entries(dimensions).forEach(([id, group]) => { group.visible = focus === id && !callbacks.plain; });
    figure.visible = focus === 'whole' && !hero;
    placeLabels();
  }
  const anchor = new THREE.Vector3();
  function placeLabels() {
    const width = host.clientWidth, height = host.clientHeight;
    machine.updateWorldMatrix(true, false);
    for (const item of annotations) {
      const show = item.focus === focus;
      item.node.hidden = !show;
      if (!show) continue;
      if (item.live === 'daylight') item.node.textContent = `Daylight ${daylightAt(opening)} in`;
      const point = item.live === 'daylight' ? [item.anchor[0], PLATEN_TOP + daylightAt(opening) / 2, item.anchor[2]] : item.anchor;
      anchor.set(...point).applyMatrix4(machine.matrixWorld).project(camera);
      const x = (anchor.x + 1) / 2 * width, y = (1 - anchor.y) / 2 * height;
      const behind = anchor.z > 1 || x < 0 || x > width || y < 0 || y > height;
      item.node.style.visibility = behind ? 'hidden' : 'visible';
      const w = item.node.offsetWidth, h = item.node.offsetHeight, side = item.node.dataset.side;
      const left = THREE.MathUtils.clamp(side === 'left' ? x - w - 10 : side === 'right' ? x + 10 : x - w / 2, 6, Math.max(6, width - w - 6));
      const top = THREE.MathUtils.clamp(side === 'above' ? y - h - 10 : side === 'below' ? y + 8 : y - h / 2, 6, Math.max(6, height - h - 6));
      item.node.style.transform = `translate(${Math.round(left)}px,${Math.round(top)}px)`;
    }
  }
  function setAnnotations(list = []) {
    annotations.forEach(item => item.node.remove());
    annotations = list.map(item => {
      const node = document.createElement('span');
      node.className = 'machine-explorer__label'; node.dataset.side = item.side || 'right'; node.textContent = item.text || '';
      labelLayer.appendChild(node);
      return { ...item, node };
    });
    placeLabels(); invalidate();
  }
  function pose(value) {
    opening = Math.max(0, Math.min(1, value));
    const daylight = DAYLIGHT_MIN + (DAYLIGHT_MAX - DAYLIGHT_MIN) * opening;
    moving.position.y = PLATEN_TOP + daylight;
    const position = daylightDim.geometry.attributes.position, top = PLATEN_TOP + daylight;
    position.setY(1, top); position.setY(4, top); position.setY(5, top); position.needsUpdate = true;
  }
  function capture() { return { focus, opening, ...(study ? { studyView } : {}), camera: { position: camera.position.toArray(), target: controls.target.toArray() } }; }
  function emit() { callbacks.onViewChange?.(capture()); }
  function invalidate() { if (!disposed && active && !frame) frame = requestAnimationFrame(draw); }
  let firstFrame = true;
  function draw(now) {
    frame = 0;
    if (disposed || !active) return;
    const delta = Math.min(last ? (now - last) / 1000 : 0, 0.05); last = now;
    if (transition) {
      const k = 1 - Math.exp(-delta * 7);
      camera.position.lerp(transition.position, k); controls.target.lerp(transition.target, k); controls.update();
      if (camera.position.distanceTo(transition.position) < 0.005 && controls.target.distanceTo(transition.target) < 0.005) {
        camera.position.copy(transition.position); controls.target.copy(transition.target); transition = null; controls.update(); emit();
      }
    }
    if (playing) {
      cycle = Math.min(1, cycle + delta / 5);
      pose(0.5 + 0.5 * Math.cos(cycle * Math.PI * 2));
      if (cycle >= 1) { playing = false; callbacks.onPlaybackChange?.(false); emit(); }
    }
    if (turning && !transition && !reduced) {
      const offset = camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.16);
      camera.position.copy(controls.target).add(offset); controls.update();
    }
    figure.rotation.y = Math.atan2(camera.position.x - figure.position.x * INCH, camera.position.z - figure.position.z * INCH);
    studyShadow?.update();
    renderer.render(scene, camera);
    placeLabels();
    if (firstFrame) {
      firstFrame = false;
      callbacks.onFirstFrame?.();
    }
    if (playing || transition || (turning && !reduced)) invalidate();
  }
  function setStudyView(id, immediate = true) {
    if (!study || !STUDY_VIEWS[id]) return;
    studyView = id; focus = 'whole'; highlight();
    const preset = STUDY_VIEWS[id];
    transition = { position: new THREE.Vector3(...preset.position), target: new THREE.Vector3(...preset.target) };
    if (immediate) { camera.position.copy(transition.position); controls.target.copy(transition.target); transition = null; controls.update(); emit(); }
    callbacks.onFocusChange?.(focus); invalidate();
  }
  function setFocus(id, immediate = reduced) {
    if (study && id === 'whole') { setStudyView('whole', immediate); return; }
    if (!PRESETS[id]) return;
    focus = id; highlight();
    const preset = hero && id === 'tooling' ? { position: [-4.6, 3.9, 10.8], target: [0.65, 1.8, 0.95] } : PRESETS[id];
    transition = { position: new THREE.Vector3(...preset.position), target: new THREE.Vector3(...preset.target) };
    if (immediate) { camera.position.copy(transition.position); controls.target.copy(transition.target); transition = null; controls.update(); emit(); }
    callbacks.onFocusChange?.(focus); invalidate();
  }
  function stop() { playing = false; callbacks.onPlaybackChange?.(false); }
  function setOpening(value) { stop(); pose(value); invalidate(); emit(); }
  function play() { if (!hero) transition = null; cycle = 0; pose(1); playing = true; callbacks.onPlaybackChange?.(true); last = 0; invalidate(); }
  function pause() { stop(); transition = null; emit(); }
  function restore(view) {
    stop(); transition = null; focus = view.focus;
    if (study && STUDY_VIEWS[view.studyView]) studyView = view.studyView;
    pose(view.opening); highlight();
    camera.position.fromArray(view.camera.position); controls.target.fromArray(view.camera.target); controls.update();
    callbacks.onFocusChange?.(focus); invalidate(); emit();
  }
  function orbit(horizontal, vertical) {
    transition = null;
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta += horizontal; spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, 0.24, Math.PI / 2 - 0.03);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update(); invalidate(); emit();
  }
  function setProportions({ width = 1, height = 1 } = {}) { machine.scale.set(width, height, width); studyShadow?.invalidate(); invalidate(); }
  function setAutoTurn(value) { turning = Boolean(value); last = 0; invalidate(); }
  function resize() {
    const width = host.clientWidth || 400, height = host.clientHeight || 360;
    if (study || studio) renderer.setPixelRatio(Math.min(2, Math.sqrt((study ? study.maxRenderPixels : HERO_STUDIO.maxRenderPixels) / (width * height))));
    renderer.setSize(width, height); camera.aspect = width / height;
    camera.fov = hero ? (width / height < 1.05 ? 32 : 25) : (width / height < 1.05 ? 31 : 26);
    camera.updateProjectionMatrix(); invalidate();
  }
  function onStart() { transition = null; turning = false; callbacks.onInteract?.(); }
  function onEnd() { emit(); }
  function onContextLost(event) { event.preventDefault(); stop(); callbacks.onError?.('The 3D view was interrupted. Reload the study; the equipment information remains available.'); }
  controls.addEventListener('change', invalidate); controls.addEventListener('start', onStart); controls.addEventListener('end', onEnd);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  const observer = new ResizeObserver(resize); observer.observe(host);
  pose(1); highlight(); resize();
  return { capture, setFocus, setStudyView, setOpening, play, pause, restore, orbit, setAnnotations, setProportions, setAutoTurn,
    reset() { stop(); pose(1); if (study) setStudyView('whole'); else setFocus('whole'); },
    setActive(value) { active = value; last = 0; if (!active) { stop(); if (frame) cancelAnimationFrame(frame); frame = 0; } else invalidate(); },
    setReducedMotion(value) { reduced = value; if (value) pause(); },
    dispose() {
      disposed = true; if (frame) cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(m => m.dispose()); textures.forEach(texture => texture.dispose());
      studyShadow?.dispose();
      environment.dispose(); key.shadow.map?.dispose(); key.shadow.mapPass?.dispose(); renderer.dispose(); renderer.domElement.remove(); labelLayer.remove();
    },
  };
}
