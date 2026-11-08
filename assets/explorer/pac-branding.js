// Compatibility adapter for the pinned vendor build in vendor/annora-explorer.
// Nameplates are real scene children: camera perspective, occlusion, separation,
// captures and the existing resource disposal all apply to them.
import { A as AssemblyScene } from './assets/model-validation-CKFAPtwu.js';
import { a as Mesh, P as PlaneGeometry, M as MeshBasicMaterial,
  a9 as CanvasTexture, aa as SRGBColorSpace } from './assets/three-C6FFAWLA.js';

const LOGO_URL = '/assets/pac-machinery-logo.png';
const installed = Symbol.for('pac.explorer.nameplates');

async function loadLogo(signal) {
  const response = await fetch(LOGO_URL, { signal });
  if (!response.ok) throw new Error('PAC logo could not load.');
  return createImageBitmap(await response.blob());
}

function nameplateTexture(image, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 224;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const width = 920, height = width * image.height / image.width;
  context.drawImage(image, 52, (208 - height) / 2, width, height);
  context.fillStyle = '#f6ac12';
  context.fillRect(0, 208, canvas.width, 16);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function attachPlate(scene, parent, texture, { width, position, rotation = 0 }) {
  if (!parent) return;
  const material = new MeshBasicMaterial({ map: texture, toneMapped: false,
    transparent: true, polygonOffset: true, polygonOffsetFactor: -1,
    polygonOffsetUnits: -1 });
  const plate = new Mesh(new PlaneGeometry(width, width * 224 / 1024), material);
  plate.name = 'PAC Machinery · illustrative brand nameplate';
  plate.position.set(...position);
  plate.rotation.x = rotation;
  // Preserve the viewer's fade/isolation and technical-view behavior.
  plate.onBeforeRender = () => {
    material.opacity = scene.renderStyle === 'engineering' ? parent.material.opacity : 0;
    material.depthWrite = parent.material.depthWrite && material.opacity > .98;
  };
  parent.add(plate);
}

export function installPacBranding() {
  const prototype = AssemblyScene.prototype;
  if (prototype[installed]) return;
  prototype[installed] = true;
  const originalLoad = prototype.load;
  prototype.load = async function (...args) {
    const result = await originalLoad.apply(this, args);
    if (this.disposed || this.model.id !== 'kinetic-01') return result;
    let image;
    try {
      image = await loadLogo(this.abort.signal);
      if (this.disposed || this.abort.signal.aborted) return result;
      const texture = nameplateTexture(image, this.renderer);
      attachPlate(this, this.meshes.get('Deck_|_brushed_insert'), texture,
        { width: .095, position: [0, .00215, .063], rotation: -Math.PI / 2 });
      this.invalidate();
    } catch (error) {
      // Branding failure must not remove the usable equipment reference.
      if (!this.disposed) console.warn('PAC nameplate unavailable:', error.message);
    } finally {
      image?.close();
    }
    return result;
  };
}
