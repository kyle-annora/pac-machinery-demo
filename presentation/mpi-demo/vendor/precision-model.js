/* Isolated adapter of original/complex-graphic-machine.js. See MODEL-SOURCES.md. */
import * as THREE from 'three';
import { create35SeriesGeometry } from './original/machine-geometry.js';
import { createRenderStudyBox } from './original/render-study.js';
import { createPrecisionMaterials, addPrecisionStructure } from './original/precision-machine-finish.js';

// Reuse the complete existing illustrative machine. The original flat treatment
// stays available; the isolated precision treatment only changes surface rendering.
const PALETTES = {
  paint: ['#e2e8e7', '#f3f6f4', '#bac8cc'],
  shade: ['#cfdbde', '#e7eeee', '#9eb3bc'],
  chrome: ['#d8e3e6', '#f3f6f4', '#9eb3bc'],
  alloy: ['#c6d4d8', '#e7eeee', '#9eb3bc'],
  steel: ['#718992', '#a2b5bc', '#536e79'],
  table: ['#718992', '#a2b5bc', '#536e79'],
  tank: ['#cfdbde', '#e7eeee', '#9eb3bc'],
  black: ['#304650', '#4f6872', '#233943'],
  rubber: ['#233943', '#3e5661', '#1d3039'],
  brass: ['#8a9290', '#b9bfba', '#607173'],
  stop: ['#ae3933', '#ae3933', '#872e2a'],
  go: ['#398569', '#398569', '#2c6a53'],
  glass: ['#c6d4d8', '#e7eeee', '#9eb3bc'],
};

export function createComplexGraphicMachine({ onChange, treatment = 'flat' } = {}) {
  const group = new THREE.Group();
  group.name = 'Complete 35 Series geometry — rendering study';
  const machine = new THREE.Group();
  group.add(machine);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const roles = new Map();
  let disposed = false;
  const track = (material) => {
    materials.add(material);
    return material;
  };
  const mat = Object.fromEntries(
    Object.entries(PALETTES).map(([name, palette]) => {
      const material = track(new THREE.MeshBasicMaterial({ color: palette[0], toneMapped: false }));
      roles.set(material, name);
      return [name, material];
    }),
  );
  const add = (geometry, material, parent, position) => {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    parent.add(object);
    return object;
  };
  const box = (parent, position, size, material = mat.paint) =>
    add(
      material === mat.glass ? new THREE.BoxGeometry(...size) : createRenderStudyBox(size),
      material,
      parent,
      position,
    );
  const rod = (parent, position, radius, length, material = mat.chrome, axis = 'y') => {
    const object = add(
      new THREE.CylinderGeometry(radius, radius, length, 40),
      material,
      parent,
      position,
    );
    if (axis === 'x') object.rotation.z = Math.PI / 2;
    if (axis === 'z') object.rotation.x = Math.PI / 2;
    return object;
  };
  const tube = (parent, points, radius = 0.85, material = mat.rubber) =>
    add(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        60,
        radius,
        12,
      ),
      material,
      parent,
      [0, 0, 0],
    );
  const { moving, tooling, panel, rear, screen, door } = create35SeriesGeometry({
    add,
    box,
    rod,
    tube,
    mat,
    track,
    geometries,
    study: true,
    machine,
  });
  moving.position.y = 78;

  const flatMaterials = new Map();
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  const normal = new THREE.Vector3(),
    edge = new THREE.Vector3();
  const precision = treatment === 'precision';
  const precisionMaterials = precision ? createPrecisionMaterials(track) : null;
  machine.traverse((object) => {
    if (!object.isMesh) return;
    const role = roles.get(object.material) || 'shade';
    const glass = role === 'glass';
    if (precision) {
      object.material = precisionMaterials[role];
      object.userData.finishRole = role;
      return;
    }
    if (!flatMaterials.has(role)) {
      flatMaterials.set(
        role,
        track(
          new THREE.MeshBasicMaterial({
            vertexColors: true,
            toneMapped: false,
            transparent: glass,
            opacity: glass ? 0.08 : 1,
            depthWrite: !glass,
          }),
        ),
      );
    }
    // Face classification is deterministic in model coordinates. Rotation changes
    // the view, never a simulated light or highlight. Original vertices stay put.
    const original = object.geometry;
    const geometry = original.index ? original.toNonIndexed() : original;
    if (geometry !== original) {
      geometries.delete(original);
      original.dispose();
      geometries.add(geometry);
    }
    const positions = geometry.getAttribute('position');
    const palette = PALETTES[role].map((hex) => new THREE.Color(hex));
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i += 3) {
      a.fromBufferAttribute(positions, i);
      b.fromBufferAttribute(positions, i + 1);
      c.fromBufferAttribute(positions, i + 2);
      normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
      const color = palette[normal.y > 0.5 ? 1 : normal.z > 0.25 ? 0 : 2];
      for (let vertex = i; vertex < i + 3; vertex++) color.toArray(colors, vertex * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    object.geometry = geometry;
    object.material = flatMaterials.get(role);
  });
  // Retain the existing real MPI control image and logo as two bounded surface
  // graphics; neither supplies lighting, new specifications or invented controls.
  screen.material = track(new THREE.MeshBasicMaterial({ color: '#159ac2', toneMapped: false }));
  machine.scale.setScalar(0.03);
  group.updateMatrixWorld(true);
  const initial = new THREE.Box3().setFromObject(machine);
  const center = initial.getCenter(new THREE.Vector3());
  machine.position.set(-center.x, -initial.min.y, -center.z);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  if (precision) addPrecisionStructure(machine, geometries, track);

  const loadTexture = (src, apply) =>
    new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve('unavailable');
        return;
      }
      const texture = new THREE.TextureLoader().load(
        src,
        (loaded) => {
          if (disposed) {
            loaded.dispose();
            resolve('disposed');
            return;
          }
          loaded.colorSpace = THREE.SRGBColorSpace;
          apply(loaded);
          onChange?.();
          resolve('ready');
        },
        undefined,
        () => reject(new Error('MPI model texture could not be loaded: ' + src)),
      );
      textures.add(texture);
    });
  const ready = Promise.all([
    loadTexture(new URL('./assets/mpi-control-interface.webp', import.meta.url).href, (texture) => {
      screen.material.map = texture;
      screen.material.color.set('#ffffff');
      screen.material.needsUpdate = true;
    }),
    loadTexture(new URL('./assets/mpi-logo.png', import.meta.url).href, (texture) => {
      const geometry = new THREE.PlaneGeometry(
        24,
        (24 * texture.image.height) / texture.image.width,
      );
      geometries.add(geometry);
      const logo = new THREE.Mesh(
        geometry,
        track(
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            toneMapped: false,
            depthWrite: false,
          }),
        ),
      );
      logo.name = 'Original MPI mark';
      logo.position.set(85, 78.5, 24.57);
      door.parent.add(logo);
    }),
  ]);
  return {
    group,
    machine,
    moving,
    areas: { tooling, controls: panel, injection: rear },
    bounds,
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      group.clear();
    },
  };
}
