import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// A bounded hero treatment, not an MPI paint or engineering specification.
// Preserve the complete geometry; give large white planes quiet volume and
// reserve graphite definition for structural transitions, not every triangle.
export function createPrecisionMaterials(track) {
  const roles = {
    paint: ['#e9edeb', 0.64],
    shade: ['#dce4e4', 0.67],
    chrome: ['#b9cbd0', 0.43],
    alloy: ['#c1cfd2', 0.57],
    steel: ['#596c74', 0.66],
    table: ['#85989e', 0.71],
    tank: ['#c2ced0', 0.62],
    black: ['#293d46', 0.74],
    rubber: ['#23353c', 0.86],
    brass: ['#8c9796', 0.7],
    stop: ['#ad3e36', 0.75],
    go: ['#3a826b', 0.75],
    glass: ['#d3e3e8', 0.8],
  };
  return Object.fromEntries(
    Object.entries(roles).map(([role, [color, roughness]]) => [
      role,
      track(
        new THREE.MeshStandardMaterial({
          color,
          roughness,
          metalness: 0,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
          transparent: role === 'glass',
          opacity: role === 'glass' ? 0.055 : 1,
          depthWrite: role !== 'glass',
        }),
      ),
    ]),
  );
}

export function addPrecisionLighting(scene) {
  // Broad emitters give the white body volume without hard diagonal cast bands.
  // The only ground shading is the cached local contact footprint below.
  RectAreaLightUniformsLib.init();
  scene.add(new THREE.HemisphereLight(0xf5f8fa, 0x74878e, 1.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(-4, 8, 6);
  scene.add(key);
  const softbox = new THREE.RectAreaLight(0xffffff, 4.5, 4.5, 6);
  softbox.position.set(-3.5, 5, 5.5);
  softbox.lookAt(0, 2, 0);
  scene.add(softbox);
  const fill = new THREE.DirectionalLight(0xdcecf4, 0.3);
  fill.position.set(4, 3, -4);
  scene.add(fill);
}

export function addPrecisionStructure(machine, geometries, track) {
  const lineMaterial = track(
    new THREE.LineBasicMaterial({
      color: 0x425e6a,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const meshes = [];
  machine.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });
  for (const object of meshes) {
    if (!['paint', 'shade', 'alloy', 'table'].includes(object.userData.finishRole)) continue;
    const geometry = object.geometry;
    if (!['BoxGeometry', 'RoundedBoxGeometry', 'ExtrudeGeometry'].includes(geometry.type)) continue;
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    // Omit fasteners, narrow guard rails and other sub-pixel detail.
    if ([size.x, size.y, size.z].sort((a, b) => b - a)[1] < 6) continue;
    // A continuous edge on the existing box envelope avoids tracing every
    // micro-bevel segment. The original mesh and its envelope stay untouched.
    let source = geometry;
    if (geometry.type === 'BoxGeometry') {
      source = new THREE.BoxGeometry(size.x, size.y, size.z);
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      source.translate(center.x, center.y, center.z);
    }
    const edges = new THREE.EdgesGeometry(source, 35);
    if (source !== geometry) source.dispose();
    geometries.add(edges);
    const lines = new THREE.LineSegments(edges, lineMaterial);
    lines.name = 'Restrained structural edges';
    object.add(lines);
  }
}

// Reuses the existing geometry-depth/blur approach from render-study.js, with
// a bounds-derived frame for this centered hero model and an alpha-only floor.
// Cached once, with no idle GPU work and no opaque ground over the MPI map.
export function createPrecisionContact(renderer, scene, root, bounds) {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const width = size.x + 1.2,
    depth = size.z + 1.2;
  const target = new THREE.WebGLRenderTarget(512, 512, { depthBuffer: true });
  const intermediate = new THREE.WebGLRenderTarget(512, 512, { depthBuffer: false });
  const camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    depth / 2,
    -depth / 2,
    0.001,
    size.y + 1,
  );
  camera.position.set(center.x, bounds.min.y - 0.04, center.z);
  camera.up.set(0, 0, 1);
  camera.lookAt(center.x, center.y, center.z);
  const depthMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { floorY: { value: bounds.min.y } },
    vertexShader: `varying float h;
      uniform float floorY;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        h = world.y - floorY;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `varying float h;
      void main() {
        float contact = pow(1.0 - smoothstep(0.0, 0.95, max(h, 0.0)), 1.7);
        gl_FragColor = vec4(0.0, 0.0, 0.0, contact * 0.5);
      }`,
  });
  const horizontal = new THREE.ShaderMaterial(HorizontalBlurShader);
  const vertical = new THREE.ShaderMaterial(VerticalBlurShader);
  horizontal.uniforms = THREE.UniformsUtils.clone(HorizontalBlurShader.uniforms);
  vertical.uniforms = THREE.UniformsUtils.clone(VerticalBlurShader.uniforms);
  horizontal.uniforms.h.value = 2.5 / 512;
  vertical.uniforms.v.value = 2.5 / 512;
  const quad = new FullScreenQuad(horizontal);
  const planeGeometry = new THREE.PlaneGeometry(width, depth);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: target.texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = Math.PI / 2;
  plane.position.set(center.x, bounds.min.y - 0.012, center.z);
  scene.add(plane);
  let dirty = true;
  return {
    update() {
      if (!dirty) return;
      dirty = false;
      const background = scene.background,
        override = scene.overrideMaterial;
      const oldTarget = renderer.getRenderTarget(),
        shadows = renderer.shadowMap.enabled;
      const clear = renderer.getClearColor(new THREE.Color()),
        alpha = renderer.getClearAlpha();
      const hidden = [];
      scene.children.forEach((object) => {
        if (object !== root && object.visible) {
          hidden.push(object);
          object.visible = false;
        }
      });
      root.traverse((object) => {
        if ((object.isLine || (object.isMesh && object.material.transparent)) && object.visible) {
          hidden.push(object);
          object.visible = false;
        }
      });
      try {
        scene.background = null;
        scene.overrideMaterial = depthMaterial;
        renderer.shadowMap.enabled = false;
        renderer.setClearColor(0x000000, 0);
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(scene, camera);
        horizontal.uniforms.tDiffuse.value = target.texture;
        quad.material = horizontal;
        renderer.setRenderTarget(intermediate);
        renderer.clear();
        quad.render(renderer);
        vertical.uniforms.tDiffuse.value = intermediate.texture;
        quad.material = vertical;
        renderer.setRenderTarget(target);
        renderer.clear();
        quad.render(renderer);
      } finally {
        hidden.forEach((object) => {
          object.visible = true;
        });
        scene.background = background;
        scene.overrideMaterial = override;
        renderer.shadowMap.enabled = shadows;
        renderer.setClearColor(clear, alpha);
        renderer.setRenderTarget(oldTarget);
      }
    },
    dispose() {
      plane.removeFromParent();
      planeGeometry.dispose();
      planeMaterial.dispose();
      target.dispose();
      intermediate.dispose();
      depthMaterial.dispose();
      horizontal.dispose();
      vertical.dispose();
      quad.dispose();
    },
  };
}
