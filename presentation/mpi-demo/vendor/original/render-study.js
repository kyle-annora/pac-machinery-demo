import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// Review-only art direction. The shared silhouette and all existing working
// dimensions belong to the illustrative 35 Series study, not to MPI CAD.
// The published front/side views and mpi-35-reference.png establish the panel,
// plate, guard and material relationships. Small finish values are hypotheses.
export const STUDY_VIEWS = Object.freeze({
  whole: { position: [-4.38, 3.9, 9.5], target: [0.72, 1.62, 0.82] },
  detail: { position: [-3.15, 3.1, 6.8], target: [0.68, 1.5, 1.0] },
});

const finishes = Object.freeze({
  paint: { color: 0xe0e2dc, metalness: 0.08, roughness: 0.29, clearcoat: 0.38, clearcoatRoughness: 0.24 },
  shade: { color: 0xd2d6d0, metalness: 0.1, roughness: 0.33, clearcoat: 0.28, clearcoatRoughness: 0.29 },
  chrome: { color: 0xcdd3d5, metalness: 1, roughness: 0.145, envMapIntensity: 1.25, anisotropy: 0.3 },
  alloy: { color: 0xb9c0c2, metalness: 0.92, roughness: 0.27, anisotropy: 0.48 },
  steel: { color: 0x798287, metalness: 0.92, roughness: 0.32, anisotropy: 0.32 },
  table: { color: 0x657076, metalness: 0.9, roughness: 0.37, anisotropy: 0.55 },
  tank: { color: 0xb3babe, metalness: 0.94, roughness: 0.28, anisotropy: 0.45 },
  black: { color: 0x172126, metalness: 0.52, roughness: 0.31 },
  rubber: { color: 0x111719, metalness: 0, roughness: 0.88 },
  glass: { color: 0xdce4e4, metalness: 0, roughness: 0.065, opacity: 0.105, clearcoat: 1, clearcoatRoughness: 0.07, reflectivity: 0.35 },
});

export const RENDER_STUDIES = Object.freeze({
  'study-light': Object.freeze({
    id: 'study-light', background: 0xe9eceb, exposure: 1.02,
    environmentIntensity: 0.48, environmentBackground: 0x333b40,
    hemisphereIntensity: 0.16, groundLight: 0x667077,
    keyIntensity: 0.75, keyPosition: [-4, 8, 5], fillIntensity: 0.12,
    rimIntensity: 0.2, rimColor: 0xe4edf0, shadowOpacity: 0.2,
    contactOpacity: 0.43, maxRenderPixels: 3000000, finishes,
  }),
  'study-blue': Object.freeze({
    id: 'study-blue', background: 0x042c3e, exposure: 1.04,
    environmentIntensity: 0.26, environmentBackground: 0x121b21,
    hemisphereIntensity: 0.055, groundLight: 0x133541,
    keyIntensity: 1.05, keyPosition: [-5, 8, 3.5], fillIntensity: 0.035,
    rimIntensity: 1.1, rimColor: 0xc7dce7, shadowOpacity: 0.4,
    contactOpacity: 0.56, maxRenderPixels: 3000000, finishes,
  }),
});

export function renderStudyProfile(options = {}) {
  return options.presentation === 'hero' ? RENDER_STUDIES[options.finish] || null : null;
}

// Small rolled/finished edges catch light without inflating the outer envelope.
export function createRenderStudyBox(size) {
  const shortest = Math.min(...size);
  if (shortest < 0.35 || Math.max(...size) < 3) return new THREE.BoxGeometry(...size);
  return new RoundedBoxGeometry(...size, 3, Math.min(0.2, shortest * 0.12));
}

export function createRenderStudyEnvironment(renderer, profile) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(profile.environmentBackground);
  const resources = [];
  const panel = (size, position, intensity, color = 0xffffff) => {
    const geometry = new THREE.PlaneGeometry(...size);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide, toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.lookAt(0.6, 1.7, 0);
    studio.add(mesh); resources.push(geometry, material);
  };
  // Broad white cards make painted surfaces readable; narrow cards define the
  // cylindrical chrome. The cards never appear as decoration in the scene.
  panel([5, 7], [-5, 5, 5], 4.2);
  panel([1.1, 7], [6, 4, 1.5], profile.id === 'study-blue' ? 3.9 : 3.2, 0xe8eff2);
  panel([4, 2.5], [-1, 8, -1], 2.2);
  panel([1.8, 5], [0.5, 3.5, -6], profile.id === 'study-blue' ? 3.8 : 1.9, 0xdce8ed);
  panel([3.2, 4], [1, 2.5, 8], profile.id === 'study-blue' ? 1.2 : 2);
  const generator = new THREE.PMREMGenerator(renderer);
  try { return generator.fromScene(studio, 0.035); }
  finally { generator.dispose(); resources.forEach(resource => resource.dispose()); }
}

export function applyRenderStudyMaterials(mat, track, textures, renderer) {
  for (const [name, values] of Object.entries(finishes)) {
    if (['chrome', 'alloy', 'steel', 'table', 'tank'].includes(name)) {
      mat[name] = track(new THREE.MeshPhysicalMaterial(values));
    } else mat[name].setValues(values);
  }
  // Deterministic microscopic roughness, kept below silhouette/detail scale.
  // These finish studies do not purport to specify MPI's actual paint process.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(128, 128);
  let seed = 35;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const value = 218 + (seed >>> 27);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(34, 34);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  textures.add(texture);
  for (const name of ['paint', 'shade']) {
    mat[name].roughnessMap = texture;
    mat[name].needsUpdate = true;
  }
}

function rectangle(width, height) {
  return new THREE.Shape([
    new THREE.Vector2(-width / 2, -height / 2), new THREE.Vector2(width / 2, -height / 2),
    new THREE.Vector2(width / 2, height / 2), new THREE.Vector2(-width / 2, height / 2),
  ]);
}

function hole(shape, x, y, width, height) {
  const path = new THREE.Path();
  path.moveTo(x - width / 2, y - height / 2);
  path.lineTo(x - width / 2, y + height / 2);
  path.lineTo(x + width / 2, y + height / 2);
  path.lineTo(x + width / 2, y - height / 2);
  path.closePath(); shape.holes.push(path);
}

// The former raised strips become shallow recesses within the same 60 x 50
// plate envelope. Their visual depth is illustrative, not an extra dimension.
export function addRenderStudyPlaten({ add, box, mat }, parent) {
  const group = new THREE.Group(); group.position.set(0, 27.75, 0); parent.add(group);
  box(group, [0, -0.325, 0], [60, 3.85, 50], mat.shade, false);
  const surface = rectangle(60, 50);
  for (const x of [-16, 0, 16]) hole(surface, x, 0, 1.1, 48);
  const geometry = new THREE.ExtrudeGeometry(surface, { depth: 0.65, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, 1.6, 0);
  add(geometry, mat.shade, group, [0, 0, 0], false);
  for (const x of [-16, 0, 16]) box(group, [x, 1.615, 0], [1.08, 0.02, 47.98], mat.black, false);
  return group;
}

// Rebuild only the already-modelled cabinet: a folded shell with an inset door,
// separate plinth cover, and genuinely open vent slots backed by a dark cavity.
export function addRenderStudyCabinet({ add, box, mat }, machine, panel) {
  box(machine, [66.5, 15.8, 0.55], [68, 28.4, 46.5]);
  box(machine, [66.5, 62, 0.55], [68, 64, 45.1]);
  const fascia = rectangle(68, 64);
  hole(fascia, 78.5 - 66.5, 59 - 62, 37.45, 50.45);
  for (const y of [34, 37, 40, 43, 46, 49]) hole(fascia, 47 - 66.5, y - 62, 18, 0.7);
  add(new THREE.ExtrudeGeometry(fascia, { depth: 0.9, bevelEnabled: false }), mat.paint, machine, [66.5, 62, 23.1], false);
  box(machine, [47, 41.5, 23.15], [19, 17, 0.025], mat.black, false);
  // Door perimeter exposes the recessed seam, with no drawn contour overlay.
  box(panel, [78.5, 59, 23.15], [37.43, 50.43, 0.03], mat.black, false);
  const door = box(panel, [78.5, 59, 24.15], [37, 50, 0.8], mat.shade, false);
  box(machine, [71, 15.8, 24.05], [54.35, 22.35, 0.08], mat.black, false);
  box(machine, [71, 15.8, 24.4], [54, 22, 0.6], mat.shade, false);
  return door;
}

export function addRenderStudyDetails({ box, mat }, machine, moving, toolingFaces) {
  // Existing layered bolsters and guard extrusions gain material separation.
  box(machine, [0, 25.47, 0], [59.7, 0.08, 49.7], mat.black, false);
  box(moving, [0, 0.92, 0], [57.8, 0.06, 45.8], mat.black, false);
  for (const face of toolingFaces) {
    // A dark joint at the existing table's perimeter and a slim bright lip.
    box(face, [0, -0.93, 0], [51.8, 0.07, 23.2], mat.black, false);
    for (const x of [-25.65, 25.65]) box(face, [x, 0.93, 0], [0.24, 0.08, 23.1], mat.alloy, false);
  }
  // The source photo's extrusion channels are recessed in appearance using a
  // dark core between the existing frame edges, not extra guard structure.
  for (const x of [-32.5, 0, 32.5]) box(machine, [x, 56.5, 25.605], [0.28, 50.3, 0.015], mat.steel, false);
  for (const y of [30.8, 83]) box(machine, [0, y, 25.605], [63.3, 0.28, 0.015], mat.steel, false);
}

/** Nearby broad emitters give flat painted panels an actual lighting gradient. */
export function addRenderStudyAreaLights(scene, profile) {
  RectAreaLightUniformsLib.init();
  const blue = profile.id === 'study-blue';
  const light = (color, intensity, width, height, position, target) => {
    const emitter = new THREE.RectAreaLight(color, intensity, width, height);
    emitter.position.set(...position); emitter.lookAt(...target); scene.add(emitter);
  };
  light(0xfffaf1, blue ? 7.2 : 5.2, 3.4, 5.5, [-2.8, 4.6, 3.8], [0.4, 1.4, 0.3]);
  light(0xe5eef2, blue ? 0.65 : 2.1, 1.8, 4, [4.5, 2.8, 3.5], [1, 1.5, 0]);
  light(0xe1edf4, blue ? 8 : 2.7, 1.2, 4.5, [3.8, 3.5, -2.8], [0.6, 1.5, 0.4]);
}

/**
 * A cached, geometry-derived contact shadow, rendered from the floor upward.
 * Two Gaussian passes soften its real footprint. It is baked once for a fixed
 * model and refreshed only for an explicit proportion change, not every frame.
 * The moving platen stays above the fixed base and does not change that footprint.
 */
export function createRenderStudyShadow(renderer, scene, root, profile) {
  const target = new THREE.WebGLRenderTarget(512, 512, { depthBuffer: true });
  const intermediate = new THREE.WebGLRenderTarget(512, 512, { depthBuffer: false });
  const camera = new THREE.OrthographicCamera(-3.5, 3.5, 3.5, -3.5, 0.01, 4.4);
  camera.position.set(1.1, -0.04, 0.7); camera.up.set(0, 0, 1); camera.lookAt(1.1, 1, 0.7);
  const depth = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { strength: { value: profile.id === 'study-blue' ? 0.68 : 0.54 } },
    vertexShader: `varying float vHeight;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vHeight = world.y;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `varying float vHeight; uniform float strength;
      void main() {
        float shade = pow(1.0 - smoothstep(0.0, 1.55, max(vHeight, 0.0)), 1.6);
        gl_FragColor = vec4(0.0, 0.0, 0.0, shade * strength);
      }`,
  });
  const horizontal = new THREE.ShaderMaterial(HorizontalBlurShader);
  const vertical = new THREE.ShaderMaterial(VerticalBlurShader);
  horizontal.uniforms = THREE.UniformsUtils.clone(HorizontalBlurShader.uniforms);
  vertical.uniforms = THREE.UniformsUtils.clone(VerticalBlurShader.uniforms);
  horizontal.uniforms.h.value = 1.4 / 512;
  vertical.uniforms.v.value = 1.4 / 512;
  const quad = new FullScreenQuad(horizontal);
  const geometry = new THREE.PlaneGeometry(7, 7);
  const material = new THREE.MeshBasicMaterial({
    map: target.texture, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = Math.PI / 2; plane.position.set(1.1, 0.003, 0.7); scene.add(plane);
  let dirty = true;
  return {
    invalidate() { dirty = true; },
    update() {
      if (!dirty) return;
      dirty = false;
      const background = scene.background, override = scene.overrideMaterial;
      const oldTarget = renderer.getRenderTarget(), shadows = renderer.shadowMap.enabled;
      const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
      const hidden = [];
      scene.children.forEach(object => {
        if (object !== root && object.visible) { hidden.push(object); object.visible = false; }
      });
      root.traverse(object => {
        if (object.isMesh && object.material.transparent && object.visible) { hidden.push(object); object.visible = false; }
      });
      try {
        scene.background = null; scene.overrideMaterial = depth;
        renderer.shadowMap.enabled = false;
        renderer.setClearColor(0x000000, 0);
        renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);
        horizontal.uniforms.tDiffuse.value = target.texture; quad.material = horizontal;
        renderer.setRenderTarget(intermediate); renderer.clear(); quad.render(renderer);
        vertical.uniforms.tDiffuse.value = intermediate.texture; quad.material = vertical;
        renderer.setRenderTarget(target); renderer.clear(); quad.render(renderer);
      } finally {
        hidden.forEach(object => { object.visible = true; });
        scene.background = background; scene.overrideMaterial = override;
        renderer.shadowMap.enabled = shadows; renderer.setClearColor(clear, alpha);
        renderer.setRenderTarget(oldTarget);
      }
    },
    dispose() {
      plane.removeFromParent(); geometry.dispose(); material.dispose();
      target.dispose(); intermediate.dispose(); depth.dispose(); horizontal.dispose(); vertical.dispose(); quad.dispose();
    },
  };
}
