import * as THREE from 'three';
import { valueNoise2D } from './terrainMath';

export interface WorldTextureSet {
  terrainAlbedo: THREE.CanvasTexture;
  terrainBump: THREE.CanvasTexture;
  barkAlbedo: THREE.CanvasTexture;
  barkBump: THREE.CanvasTexture;
  timberAlbedo: THREE.CanvasTexture;
  rockAlbedo: THREE.CanvasTexture;
  rockBump: THREE.CanvasTexture;
  foliageBump: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function configureTexture(
  tex: THREE.CanvasTexture,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number
) {
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
}

export function createWorldTextures(renderer: THREE.WebGLRenderer): WorldTextureSet {
  const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  // 1. Terrain Albedo & Bump (Tileable 256x256 micro-detail mottled moss/grass/soil)
  const tSize = 256;
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = tSize;
  terrainCanvas.height = tSize;
  const tCtx = terrainCanvas.getContext('2d')!;

  const terrainBumpCanvas = document.createElement('canvas');
  terrainBumpCanvas.width = tSize;
  terrainBumpCanvas.height = tSize;
  const tbCtx = terrainBumpCanvas.getContext('2d')!;

  const tImg = tCtx.createImageData(tSize, tSize);
  const tbImg = tbCtx.createImageData(tSize, tSize);

  for (let y = 0; y < tSize; y++) {
    for (let x = 0; x < tSize; x++) {
      // Seamless periodic noise via sin/cos domain wrapping
      const nx = (x / tSize) * Math.PI * 2;
      const ny = (y / tSize) * Math.PI * 2;
      const n1 = valueNoise2D(Math.cos(nx) * 4 + 10, Math.sin(ny) * 4 + 10);
      const n2 = valueNoise2D(Math.sin(nx * 2) * 8 + 25, Math.cos(ny * 2) * 8 + 25);
      const fine = ((x * 73856093) ^ (y * 19349663)) & 255;
      const grain = fine / 255;

      const mix = n1 * 0.55 + n2 * 0.3 + grain * 0.15;
      // Keep neutral-bright (215..255) so vertex colors tint it accurately without darkening
      const val = Math.floor(212 + mix * 43);
      const idx = (y * tSize + x) * 4;
      tImg.data[idx] = val;
      tImg.data[idx + 1] = Math.min(255, val + 4);
      tImg.data[idx + 2] = Math.max(195, val - 6);
      tImg.data[idx + 3] = 255;

      const bumpVal = Math.floor((n2 * 0.6 + grain * 0.4) * 255);
      tbImg.data[idx] = bumpVal;
      tbImg.data[idx + 1] = bumpVal;
      tbImg.data[idx + 2] = bumpVal;
      tbImg.data[idx + 3] = 255;
    }
  }
  tCtx.putImageData(tImg, 0, 0);
  tbCtx.putImageData(tbImg, 0, 0);

  const terrainAlbedo = new THREE.CanvasTexture(terrainCanvas);
  const terrainBump = new THREE.CanvasTexture(terrainBumpCanvas);
  configureTexture(terrainAlbedo, true, 42, 42, maxAniso);
  configureTexture(terrainBump, false, 42, 42, maxAniso);

  // 2. Pine Bark & Timber Albedo + Bump (128x256 vertical ridges)
  const bW = 128;
  const bH = 256;
  const barkCanvas = document.createElement('canvas');
  barkCanvas.width = bW;
  barkCanvas.height = bH;
  const bCtx = barkCanvas.getContext('2d')!;

  const barkBumpCanvas = document.createElement('canvas');
  barkBumpCanvas.width = bW;
  barkBumpCanvas.height = bH;
  const bbCtx = barkBumpCanvas.getContext('2d')!;

  for (let y = 0; y < bH; y++) {
    for (let x = 0; x < bW; x++) {
      const ridge = Math.sin((x / bW) * Math.PI * 16 + valueNoise2D(x * 0.15, y * 0.05) * 3.0) * 0.5 + 0.5;
      const knot = valueNoise2D(x * 0.25, y * 0.08);
      const v = ridge * 0.65 + knot * 0.35;

      const r = Math.floor(82 + v * 58);
      const g = Math.floor(54 + v * 42);
      const b = Math.floor(36 + v * 28);
      bCtx.fillStyle = `rgb(${r},${g},${b})`;
      bCtx.fillRect(x, y, 1, 1);

      const bv = Math.floor(v * 255);
      bbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bbCtx.fillRect(x, y, 1, 1);
    }
  }

  const barkAlbedo = new THREE.CanvasTexture(barkCanvas);
  const barkBump = new THREE.CanvasTexture(barkBumpCanvas);
  configureTexture(barkAlbedo, true, 2, 4, maxAniso);
  configureTexture(barkBump, false, 2, 4, maxAniso);

  // 3. Weathered Timber Planks Albedo (for pier, rowboat, watchtower deck)
  const timberCanvas = document.createElement('canvas');
  timberCanvas.width = 256;
  timberCanvas.height = 256;
  const tmCtx = timberCanvas.getContext('2d')!;
  tmCtx.fillStyle = '#8b6848';
  tmCtx.fillRect(0, 0, 256, 256);

  for (let plank = 0; plank < 8; plank++) {
    const py = plank * 32;
    const shade = (plank % 2 === 0 ? 1 : -1) * 8;
    for (let y = py; y < py + 30; y++) {
      for (let x = 0; x < 256; x++) {
        const grain = valueNoise2D(x * 0.08 + plank * 7, y * 0.35);
        const r = Math.min(255, Math.max(0, Math.floor(132 + shade + grain * 36)));
        const g = Math.min(255, Math.max(0, Math.floor(98 + shade + grain * 28)));
        const b = Math.min(255, Math.max(0, Math.floor(68 + shade + grain * 20)));
        tmCtx.fillStyle = `rgb(${r},${g},${b})`;
        tmCtx.fillRect(x, y, 1, 1);
      }
    }
    // Plank seam
    tmCtx.fillStyle = '#3b2818';
    tmCtx.fillRect(0, py + 30, 256, 2);
  }
  const timberAlbedo = new THREE.CanvasTexture(timberCanvas);
  configureTexture(timberAlbedo, true, 3, 3, maxAniso);

  // 4. Granite Rock & Stone Masonry Albedo + Bump
  const rSize = 256;
  const rockCanvas = document.createElement('canvas');
  rockCanvas.width = rSize;
  rockCanvas.height = rSize;
  const rCtx = rockCanvas.getContext('2d')!;

  const rockBumpCanvas = document.createElement('canvas');
  rockBumpCanvas.width = rSize;
  rockBumpCanvas.height = rSize;
  const rbCtx = rockBumpCanvas.getContext('2d')!;

  const rImg = rCtx.createImageData(rSize, rSize);
  const rbImg = rbCtx.createImageData(rSize, rSize);

  for (let y = 0; y < rSize; y++) {
    for (let x = 0; x < rSize; x++) {
      const n1 = valueNoise2D(x * 0.09, y * 0.09);
      const n2 = valueNoise2D(x * 0.28 + 19, y * 0.28 - 11);
      const speckle = (((x * 92837111) ^ (y * 689287499)) & 255) / 255;

      const v = n1 * 0.55 + n2 * 0.3 + speckle * 0.15;
      const base = Math.floor(112 + v * 58);
      const idx = (y * rSize + x) * 4;
      rImg.data[idx] = base;
      rImg.data[idx + 1] = Math.max(0, base - 4);
      rImg.data[idx + 2] = Math.max(0, base - 10);
      rImg.data[idx + 3] = 255;

      const bv = Math.floor((n1 * 0.5 + n2 * 0.35 + speckle * 0.15) * 255);
      rbImg.data[idx] = bv;
      rbImg.data[idx + 1] = bv;
      rbImg.data[idx + 2] = bv;
      rbImg.data[idx + 3] = 255;
    }
  }
  rCtx.putImageData(rImg, 0, 0);
  rbCtx.putImageData(rbImg, 0, 0);

  const rockAlbedo = new THREE.CanvasTexture(rockCanvas);
  const rockBump = new THREE.CanvasTexture(rockBumpCanvas);
  configureTexture(rockAlbedo, true, 4, 4, maxAniso);
  configureTexture(rockBump, false, 4, 4, maxAniso);

  // 5. Foliage Micro-Relief Bump Map
  const fSize = 128;
  const fCanvas = document.createElement('canvas');
  fCanvas.width = fSize;
  fCanvas.height = fSize;
  const fCtx = fCanvas.getContext('2d')!;
  const fImg = fCtx.createImageData(fSize, fSize);
  for (let y = 0; y < fSize; y++) {
    for (let x = 0; x < fSize; x++) {
      const n = valueNoise2D(x * 0.35, y * 0.35);
      const g = (((x * 31337) ^ (y * 65537)) & 255) / 255;
      const v = Math.floor((n * 0.65 + g * 0.35) * 255);
      const idx = (y * fSize + x) * 4;
      fImg.data[idx] = v;
      fImg.data[idx + 1] = v;
      fImg.data[idx + 2] = v;
      fImg.data[idx + 3] = 255;
    }
  }
  fCtx.putImageData(fImg, 0, 0);
  const foliageBump = new THREE.CanvasTexture(fCanvas);
  configureTexture(foliageBump, false, 3, 3, maxAniso);

  // 6. Soft Radial Contact Shadow Disc Texture
  const csSize = 128;
  const csCanvas = document.createElement('canvas');
  csCanvas.width = csSize;
  csCanvas.height = csSize;
  const csCtx = csCanvas.getContext('2d')!;
  const grad = csCtx.createRadialGradient(csSize / 2, csSize / 2, 4, csSize / 2, csSize / 2, csSize / 2);
  grad.addColorStop(0, 'rgba(8, 12, 6, 0.58)');
  grad.addColorStop(0.55, 'rgba(10, 14, 8, 0.26)');
  grad.addColorStop(1, 'rgba(10, 14, 8, 0.0)');
  csCtx.fillStyle = grad;
  csCtx.fillRect(0, 0, csSize, csSize);

  const contactShadow = new THREE.CanvasTexture(csCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  return {
    terrainAlbedo,
    terrainBump,
    barkAlbedo,
    barkBump,
    timberAlbedo,
    rockAlbedo,
    rockBump,
    foliageBump,
    contactShadow,
    dispose: () => {
      terrainAlbedo.dispose();
      terrainBump.dispose();
      barkAlbedo.dispose();
      barkBump.dispose();
      timberAlbedo.dispose();
      rockAlbedo.dispose();
      rockBump.dispose();
      foliageBump.dispose();
      contactShadow.dispose();
    },
  };
}
