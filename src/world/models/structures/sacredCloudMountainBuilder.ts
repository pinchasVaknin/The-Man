// ============================================================================
// MODULE: World / Models / Sacred Cloud Mountain Builder
// DESIGN: Single unified high-resolution natural sandy stepped mountain mesh,
//         carved spiral benches & slate staircases, continuous wooden perimeter fence
//         around spiral & summit rim, synced Foot & Summit Paifang gates, billowing
//         sea of clouds, round summit lotus pond with unobstructed stepping stones,
//         large existing-model Pink Blossom Tree, and relocated Bagua terrace (SRP).
// SUMMARY: Renders the Sacred Cloud Mountain at (104, -618) matching `groundHeightAt`
//          1:1 with zero cupcake caps, zero double shells, zero snow, and zero
//          protruding cliff-wall overlap onto stairs or gates.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  SACRED_CLOUD_MOUNTAIN_POS,
  CHINESE_BAGUA_PLATFORM_POS,
  SACRED_MOUNTAIN_CAIRN_MARKERS,
  SACRED_MOUNTAIN_SPIRAL_SEGMENTS,
  SACRED_LOTUS_STEPPING_STONES,
  sacredMountainApproachDistanceAt,
  sampleSacredSpiralAtS,
  teardropPoolSignedDist,
  groundHeightAt,
} from '../../terrainMath';
import { attachAnimatedWaterWaveShader } from './terrainAndWaterModel';
import { buildInstancedFloraTreeBatch, type IInstancedFloraTreePlacement } from './vegetationModels';
import { attachWindSwayShader } from '../../builders/shaderAndMaterialBuilders';
import { getFloraSubmeshes, getFloraTextureUrl } from '../plants/floraAssets';
import { spawnTempleMonk } from '../../systems/monkTempleSystem';
import { CHINESE_FORTRESS_POS, FORTRESS_Z_OFFSET } from '../../domain/landmarksRegistry';
import type { IWorldModelBuildContext } from '../types';
// #endregion

// ======================== PROCEDURAL TEXTURES ======================== \\
// #region Procedural Textures
function createCarvedLotusStoneTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size * 0.5;
  const cy = size * 0.5;

  ctx.fillStyle = '#d4cec2';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#9e9788';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 118, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#e5dfd2';
  ctx.beginPath();
  ctx.arc(cx, cy, 112, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i * Math.PI) / 4);
    ctx.fillStyle = '#dcd5c6';
    ctx.strokeStyle = '#8b8374';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(28, -55, 0, -104);
    ctx.quadraticCurveTo(-28, -55, 0, -18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = '#cfc7b5';
  ctx.strokeStyle = '#8b8374';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createYinYangBaguaTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size * 0.5;
  const cy = size * 0.5;

  ctx.fillStyle = '#ddd7ca';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#aba392';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 242, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ece7dc';
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 222, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 148, 0, Math.PI * 2);
  ctx.stroke();

  const trigrams = [
    [1, 1, 1],
    [0, 1, 1],
    [1, 0, 1],
    [0, 0, 1],
    [1, 1, 0],
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 0],
  ];

  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);

    ctx.strokeStyle = '#948b7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -148);
    ctx.lineTo(0, -222);
    ctx.stroke();

    ctx.rotate(Math.PI / 8);
    const bars = trigrams[i];
    ctx.fillStyle = '#1e2430';
    for (let b = 0; b < 3; b++) {
      const rY = -164 - b * 17;
      if (bars[b] === 1) {
        ctx.fillRect(-26, rY - 4, 52, 8);
      } else {
        ctx.fillRect(-26, rY - 4, 21, 8);
        ctx.fillRect(5, rY - 4, 21, 8);
      }
    }
    ctx.restore();
  }

  ctx.fillStyle = '#c49642';
  ctx.beginPath();
  ctx.arc(cx, cy, 138, 0, Math.PI * 2);
  ctx.fill();

  const r = 130;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#f5f2e9';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  ctx.fillStyle = '#1c212b';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(cx, cy + r);
  ctx.arc(cx, cy + r * 0.5, r * 0.5, Math.PI / 2, -Math.PI / 2, true);
  ctx.arc(cx, cy - r * 0.5, r * 0.5, Math.PI / 2, -Math.PI / 2, false);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f5f2e9';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.5, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c212b';
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.5, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c212b';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.5, r * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5f2e9';
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.5, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSoftCloudPuffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const puffs: Array<[number, number, number, number]> = [
    [128, 134, 92, 0.72],
    [88, 128, 68, 0.58],
    [168, 126, 68, 0.58],
    [128, 96, 64, 0.62],
    [110, 152, 62, 0.45],
    [152, 150, 58, 0.45],
  ];
  for (const [px, py, pr, pa] of puffs) {
    const grad = ctx.createRadialGradient(px, py, pr * 0.08, px, py, pr);
    grad.addColorStop(0.0, `rgba(255, 255, 255, ${pa})`);
    grad.addColorStop(0.45, `rgba(244, 248, 255, ${pa * 0.55})`);
    grad.addColorStop(1.0, 'rgba(235, 242, 252, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPlantTextureFromDataUrl(
  dataUrl: string,
  disposableTextures: THREE.Texture[]
): THREE.Texture {
  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.onload = () => {
      tex.image = img;
      tex.needsUpdate = true;
    };
    img.src = dataUrl;
  }
  disposableTextures.push(tex);
  return tex;
}
// #endregion

// ======================== GEOMETRY HELPERS ======================== \\
// #region Geometry Helpers
function smoothstepLocal(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Summary: Builds ONE continuous high-resolution (0.75m radial) Polar Terrain Mesh covering r = 0..86m
 *          using `groundHeightAt(wx, wz)` directly — smoothly carving flat terraced benches along the
 *          2-turn spiral, rising naturally between turns up to the grassy/sandy summit and round pond.
 */
function buildNaturalMountainTerrainGeometry(isSoftwareGl: boolean): THREE.BufferGeometry {
  const cx = SACRED_CLOUD_MOUNTAIN_POS.x;
  const cz = SACRED_CLOUD_MOUNTAIN_POS.z;
  const maxR = 90.0;
  const rings = isSoftwareGl ? 96 : 120;
  const segs = isSoftwareGl ? 112 : 144;

  const positions: number[] = [];
  const uvs: number[] = [];
  const radii: number[] = [];
  const worldXs: number[] = [];
  const worldZs: number[] = [];
  const indices: number[] = [];

  for (let ir = 0; ir <= rings; ir++) {
    const r = (ir / rings) * maxR;
    for (let is = 0; is <= segs; is++) {
      const ang = (is / segs) * Math.PI * 2.0;
      const lx = Math.cos(ang) * r;
      const lz = Math.sin(ang) * r;
      const wx = cx + lx;
      const wz = cz + lz;
      const y = groundHeightAt(wx, wz);

      positions.push(lx, y, lz);
      // Match the exact 220m world-space UV scale used by terrainAndWaterModel chunks
      uvs.push(lx / 220.0 + 0.5, lz / 220.0 + 0.5);
      radii.push(r);
      worldXs.push(wx);
      worldZs.push(wz);
    }
  }

  const rowStride = segs + 1;
  for (let ir = 0; ir < rings; ir++) {
    for (let is = 0; is < segs; is++) {
      const a = ir * rowStride + is;
      const b = a + 1;
      const c = a + rowStride;
      const d = c + 1;
      // Winding ordered for +Y upward normals across the entire polar disc & mountain slopes
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const posAttr = geo.attributes.position;
  const normalAttr = geo.attributes.normal;
  const vertCount = posAttr.count;
  const colors = new Float32Array(vertCount * 3);

  const cMeadow = new THREE.Color(0x52823a);
  const cLushGrass = new THREE.Color(0x639842);
  const cWarmSand = new THREE.Color(0xcfb17b);
  const cOchreSand = new THREE.Color(0xb68d58);
  const cSteepEarth = new THREE.Color(0x88643e);
  const cTrailEarth = new THREE.Color(0x9a7852);
  const cShoreSand = new THREE.Color(0xdcc791);
  const cPoolBed = new THREE.Color(0xc2aa72);
  const cSnowTrail = new THREE.Color(0xeaf2fa);
  const tmp = new THREE.Color();

  for (let i = 0; i < vertCount; i++) {
    const r = radii[i];
    const wx = worldXs[i];
    const wz = worldZs[i];
    const y = posAttr.getY(i);
    const ny = normalAttr.getY(i);
    const lx = wx - cx;
    const lz = wz - cz;
    const theta = Math.atan2(lz, lx);
    const micro = 0.5 + 0.5 * Math.sin(wx * 0.24 + wz * 0.19);

    const onPostGateShelf = theta >= 0.80 && theta <= 2.02 && r <= 24.5;
    if (r <= SACRED_CLOUD_MOUNTAIN_POS.summitRadius + 0.45 || onPostGateShelf) {
      // Natural grassy summit plateau & warm post-gate arrival shelf with sandy pond shore
      tmp.copy(cMeadow).lerp(cLushGrass, micro);
      const pDist = teardropPoolSignedDist(wx, wz);
      if (pDist < 0.0) {
        tmp.copy(cPoolBed);
      } else if (pDist <= 2.35) {
        const sandW = 1.0 - smoothstepLocal(0.35, 2.35, pDist);
        tmp.lerp(cShoreSand, sandW);
      }
      if (onPostGateShelf && r > SACRED_CLOUD_MOUNTAIN_POS.summitRadius - 1.2) {
        const shelfSandW = smoothstepLocal(
          SACRED_CLOUD_MOUNTAIN_POS.summitRadius - 1.2,
          SACRED_CLOUD_MOUNTAIN_POS.summitRadius + 2.5,
          r
        );
        tmp.lerp(cTrailEarth, shelfSandW * 0.65);
      }
      // Subtle earthen path right through Summit Paifang arrival
      if (Math.abs(lx + 3.8) < 3.4 && lz >= 12.0 && lz <= 23.0) {
        const entryFade = smoothstepLocal(12.0, 15.0, lz);
        tmp.lerp(cTrailEarth, entryFade * 0.68);
      }
    } else {
      // Natural golden-ochre sandy mountain slopes + stepped flat earthen benches + meadow skirt blend
      tmp.copy(cWarmSand).lerp(cOchreSand, micro * 0.65);

      // Steeper sand/earth cuts between spiral turns get richer warm earth shading
      if (ny < 0.85) {
        const slopeW = smoothstepLocal(0.85, 0.42, ny);
        tmp.lerp(cSteepEarth, slopeW * 0.78);
      } else if (y > SACRED_CLOUD_MOUNTAIN_POS.footY + 0.6 && y < SACRED_CLOUD_MOUNTAIN_POS.summitY - 0.3) {
        // Flat carved spiral terrace benches have packed earthen path tint
        tmp.lerp(cTrailEarth, 0.52);
      }

      // Outer foothill skirt (r = 72..90m) fades cleanly into the surrounding green grass & bright snowy approach trail
      if (r > SACRED_CLOUD_MOUNTAIN_POS.footHullRadius - 1.5) {
        const outerGrassW = smoothstepLocal(
          SACRED_CLOUD_MOUNTAIN_POS.footHullRadius - 1.5,
          85.5,
          r
        );
        const appD = sacredMountainApproachDistanceAt(wx, wz).dist;
        const snowTrailW = 1.0 - smoothstepLocal(1.3, 3.2, appD);
        tmp.lerp(cMeadow, outerGrassW);
        if (snowTrailW > 0.02) {
          tmp.lerp(cSnowTrail, snowTrailW * 0.92 * smoothstepLocal(SACRED_CLOUD_MOUNTAIN_POS.footHullRadius - 0.5, SACRED_CLOUD_MOUNTAIN_POS.footHullRadius + 3.5, r));
        }
      }
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Summary: Builds a majestic Pink Blossom Tree directly from the existing `AnimTreeWide_Complete`
 *          botanical tree bundle in `plants/`, keeping real trunk bark and converting leaf canopies
 *          into sunlit Sakura pink blossom clusters.
 */
function buildExistingModelPinkBlossomTree(
  ctx: IWorldModelBuildContext,
  scale: number
): THREE.Group {
  const { disposableGeometries, disposableMaterials, disposableTextures, swayMaterials } = ctx;
  const submeshes = getFloraSubmeshes('animtree_wide', 'high');

  const barkTex = createPlantTextureFromDataUrl(getFloraTextureUrl('animtree', 0), disposableTextures);
  const leafTex1 = createPlantTextureFromDataUrl(getFloraTextureUrl('animtree', 1), disposableTextures);
  const leafTex2 = createPlantTextureFromDataUrl(getFloraTextureUrl('animtree', 2), disposableTextures);

  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    roughness: 0.88,
    metalness: 0.02,
  });

  const makeSakuraLeafMat = (tex: THREE.Texture, tintHex: number): THREE.MeshStandardMaterial => {
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.34,
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    attachWindSwayShader(mat, 0.06, 1.8, swayMaterials);
    const prevCompile = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      if (prevCompile) prevCompile(shader, renderer);
      shader.uniforms.uSakuraColor = { value: new THREE.Color(tintHex) };
      shader.fragmentShader = `uniform vec3 uSakuraColor;\n${shader.fragmentShader}`.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv );
          float lum = dot(sampledDiffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 petalShade = uSakuraColor * (0.68 + 0.58 * lum);
          diffuseColor *= vec4(petalShade, sampledDiffuseColor.a);
        #endif`
      );
    };
    return mat;
  };

  const leafMat1 = makeSakuraLeafMat(leafTex1, 0xffa8cc);
  const leafMat2 = makeSakuraLeafMat(leafTex2, 0xffc6df);
  disposableMaterials.push(barkMat, leafMat1, leafMat2);

  const treeGroup = new THREE.Group();
  for (const sub of submeshes) {
    if (sub.matId === 7) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(sub.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(sub.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(sub.uvs, 2));
    geo.setIndex(new THREE.Uint32BufferAttribute(sub.indices, 1));
    disposableGeometries.push(geo);

    const mat = sub.matId === 0 ? barkMat : sub.matId === 1 ? leafMat1 : leafMat2;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !ctx.isSoftwareGl;
    mesh.receiveShadow = !ctx.isSoftwareGl;
    treeGroup.add(mesh);
  }
  treeGroup.scale.setScalar(scale);
  return treeGroup;
}
// #endregion

// ======================== SACRED CLOUD MOUNTAIN BUILDER ======================== \\
// #region Sacred Cloud Mountain Builder
export interface ISacredCloudMountainBuildResult {
  readonly updateSacredCloudMountain: (elapsedTime: number, playerX: number, playerZ: number) => void;
}

/**
 * Summary: Builds the unified Sacred Cloud Mountain, synced Foot & Summit Paifang gates,
 *          carved slate stairs, continuous spiral & summit wooden fences, swirling sea of clouds,
 *          round Lotus Pond with unobstructed East stepping stones, large Pink Blossom Tree,
 *          grounded foothill trees, trail cairns, and the relocated Chinese Bagua Platform.
 */
export function buildSacredCloudMountainModel(
  ctx: IWorldModelBuildContext
): ISacredCloudMountainBuildResult {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    disposableTextures,
    animatedWaterMaterials,
    lanternLights,
    distanceCulledObjects,
    swayMaterials,
  } = ctx;

  const cx = SACRED_CLOUD_MOUNTAIN_POS.x;
  const cz = SACRED_CLOUD_MOUNTAIN_POS.z;
  const summitY = SACRED_CLOUD_MOUNTAIN_POS.summitY;

  // Shared Textures & Materials
  const baguaTex = createYinYangBaguaTexture();
  const lotusStoneTex = createCarvedLotusStoneTexture();
  const cloudPuffTex = createSoftCloudPuffTexture();
  disposableTextures.push(baguaTex, lotusStoneTex, cloudPuffTex);

  const mountainTerrainMat = new THREE.MeshStandardMaterial({
    map: textures.terrainAlbedo,
    bumpMap: textures.terrainBump,
    bumpScale: 0.06,
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
  });
  const slateStepMat = new THREE.MeshStandardMaterial({
    color: 0x3b434d,
    map: textures.rockAlbedo,
    roughness: 0.84,
    metalness: 0.08,
  });
  const rusticLogMat = new THREE.MeshStandardMaterial({
    color: 0x6f523a,
    map: textures.timberAlbedo,
    roughness: 0.88,
    metalness: 0.04,
  });
  const darkWoodRailMat = new THREE.MeshStandardMaterial({
    color: 0x4b2f1c,
    map: textures.timberAlbedo,
    roughness: 0.72,
    metalness: 0.06,
  });
  const warmCedarDeckMat = new THREE.MeshStandardMaterial({
    color: 0xc2935b,
    map: textures.timberAlbedo,
    roughness: 0.68,
    metalness: 0.05,
  });
  const graniteTrimMat = new THREE.MeshStandardMaterial({
    color: 0xcac3b5,
    map: textures.rockAlbedo,
    roughness: 0.76,
    metalness: 0.05,
  });
  const shoreBoulderMat = new THREE.MeshStandardMaterial({
    color: 0x857f74,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.06,
    roughness: 0.88,
    metalness: 0.04,
  });
  const lotusStoneTopMat = new THREE.MeshStandardMaterial({
    map: lotusStoneTex,
    roughness: 0.62,
    metalness: 0.05,
  });
  const lotusPetalMat = new THREE.MeshStandardMaterial({
    color: 0xf7f1e8,
    roughness: 0.52,
    metalness: 0.04,
  });
  const crimsonLacquerMat = new THREE.MeshStandardMaterial({
    color: 0xa61d1d,
    roughness: 0.48,
    metalness: 0.14,
  });
  const roofSlateMat = new THREE.MeshStandardMaterial({
    color: 0x262f3b,
    roughness: 0.62,
    metalness: 0.18,
  });
  const bronzeGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd4a438,
    roughness: 0.36,
    metalness: 0.74,
  });
  const antiqueBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x6c5838,
    roughness: 0.42,
    metalness: 0.68,
  });
  const cairnStoneMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    roughness: 0.9,
  });
  const flagRedMat = new THREE.MeshStandardMaterial({
    color: 0xc91e1e,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  const baguaDiscMat = new THREE.MeshStandardMaterial({
    map: baguaTex,
    roughness: 0.45,
    metalness: 0.08,
  });
  const lanternGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffe4a0,
  });
  const sakuraPetalMat = new THREE.MeshStandardMaterial({
    color: 0xffb7d5,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const poolWaterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a8e99,
    roughness: 0.08,
    metalness: 0.06,
    transmission: 0.25,
    transparent: true,
    opacity: 0.88,
    reflectivity: 0.88,
  });
  attachAnimatedWaterWaveShader(poolWaterMat, 0.012, 0.04, animatedWaterMaterials);
  const cloudBillboardMat = new THREE.MeshBasicMaterial({
    map: cloudPuffTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
    color: 0xf4f7fc,
  });
  const mistWispMat = new THREE.MeshBasicMaterial({
    map: cloudPuffTex,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
    color: 0xfff8eb,
  });

  disposableMaterials.push(
    mountainTerrainMat,
    slateStepMat,
    rusticLogMat,
    darkWoodRailMat,
    warmCedarDeckMat,
    graniteTrimMat,
    shoreBoulderMat,
    lotusStoneTopMat,
    lotusPetalMat,
    crimsonLacquerMat,
    roofSlateMat,
    bronzeGoldMat,
    antiqueBronzeMat,
    cairnStoneMat,
    flagRedMat,
    baguaDiscMat,
    lanternGlowMat,
    sakuraPetalMat,
    poolWaterMat,
    cloudBillboardMat,
    mistWispMat
  );

  // ============================================================================
  // GROUP 1: Approach Trail Cairns & Crimson Fortress Triangular Flags
  // ============================================================================
  const cairnGroup = new THREE.Group();
  cairnGroup.name = 'sacred-mountain-cairns';
  const animatedFlags: Array<{ mesh: THREE.Mesh; baseYaw: number; phase: number }> = [];

  const stoneSphereGeo = new THREE.DodecahedronGeometry(0.24, 1);
  const staffGeo = new THREE.CylinderGeometry(0.028, 0.036, 1.48, 6);
  const pennantShape = new THREE.Shape();
  pennantShape.moveTo(0, 0.16);
  pennantShape.lineTo(0.56, 0.0);
  pennantShape.lineTo(0, -0.16);
  pennantShape.closePath();
  const pennantGeo = new THREE.ShapeGeometry(pennantShape);
  disposableGeometries.push(stoneSphereGeo, staffGeo, pennantGeo);

  for (let i = 0; i < SACRED_MOUNTAIN_CAIRN_MARKERS.length; i++) {
    const mk = SACRED_MOUNTAIN_CAIRN_MARKERS[i];
    const gy = groundHeightAt(mk.x, mk.z);
    const holder = new THREE.Group();
    holder.position.set(mk.x, gy, mk.z);

    const stackSpecs: Array<[number, number, number, number, number, number]> = [
      [-0.14, 0.14, 0.08, 1.15, 0.72, 1.05],
      [0.14, 0.14, -0.09, 1.05, 0.68, 1.1],
      [-0.02, 0.14, -0.15, 0.95, 0.65, 0.95],
      [0.02, 0.34, 0.01, 0.85, 0.62, 0.85],
      [0.0, 0.51, 0.0, 0.64, 0.54, 0.64],
    ];
    for (const [sx, sy, sz, rx, ry, rz] of stackSpecs) {
      const stone = new THREE.Mesh(stoneSphereGeo, cairnStoneMat);
      stone.position.set(sx, sy, sz);
      stone.scale.set(rx, ry, rz);
      stone.rotation.set(mk.seed * 1.4, sx * 4.0, sz * 4.0);
      holder.add(stone);
    }

    const pole = new THREE.Mesh(staffGeo, rusticLogMat);
    pole.position.set(0, 0.96, 0);
    holder.add(pole);

    const flag = new THREE.Mesh(pennantGeo, flagRedMat);
    flag.position.set(0, 1.5, 0);
    flag.rotation.y = mk.flagYaw;
    holder.add(flag);
    animatedFlags.push({ mesh: flag, baseYaw: mk.flagYaw, phase: i * 0.9 });

    cairnGroup.add(holder);
  }
  scene.add(cairnGroup);
  distanceCulledObjects.push({
    obj: cairnGroup,
    cx: 76.0,
    cz: -468.0,
    radius: 260.0,
    maxDist: 380.0,
  });

  // ============================================================================
  // GROUP 2: Unified Sandy Stepped Mountain, Slate Stairs, Wooden Fence & Summit
  // ============================================================================
  const mountainGroup = new THREE.Group();
  mountainGroup.name = 'sacred-cloud-mountain';
  mountainGroup.position.set(cx, 0, cz);

  // 2A) Single Unified High-Res Polar Mountain Terrain Mesh (matches groundHeightAt 1:1)
  const terrainGeo = buildNaturalMountainTerrainGeometry(isSoftwareGl);
  disposableGeometries.push(terrainGeo);
  const mountainTerrainMesh = new THREE.Mesh(terrainGeo, mountainTerrainMat);
  mountainTerrainMesh.castShadow = !isSoftwareGl;
  mountainTerrainMesh.receiveShadow = true;
  mountainGroup.add(mountainTerrainMesh);

  // 2B) Synced Foot Gateway Archway straddling s = 0 squarely on level 30.8m threshold
  const footSample = sampleSacredSpiralAtS(0);
  const footGateGroup = new THREE.Group();
  footGateGroup.position.set(
    footSample.x - cx,
    SACRED_CLOUD_MOUNTAIN_POS.footY,
    footSample.z - cz
  );
  footGateGroup.rotation.y = footSample.tangentYaw;

  const footPillarGeo = new THREE.CylinderGeometry(0.24, 0.3, 4.8, 8);
  const footBeamGeo = new THREE.BoxGeometry(6.4, 0.36, 0.46);
  const footRoofGeo = new THREE.BoxGeometry(7.3, 0.28, 1.38);
  disposableGeometries.push(footPillarGeo, footBeamGeo, footRoofGeo);
  for (const px of [-2.7, 2.7]) {
    const p = new THREE.Mesh(footPillarGeo, crimsonLacquerMat);
    p.position.set(px, 2.35, 0);
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.45, 8),
      graniteTrimMat
    );
    plinth.position.set(px, 0.2, 0);
    disposableGeometries.push(plinth.geometry);
    footGateGroup.add(p, plinth);
  }
  const fBeam = new THREE.Mesh(footBeamGeo, crimsonLacquerMat);
  fBeam.position.set(0, 4.2, 0);
  const fRoof = new THREE.Mesh(footRoofGeo, roofSlateMat);
  fRoof.position.set(0, 4.75, 0);
  footGateGroup.add(fBeam, fRoof);
  mountainGroup.add(footGateGroup);

  // 2C) Alternating Carved Slate Stairs, Rustic Spiral Guardrail & Summit Rim Wooden Fence
  const stepSlabGeo = new THREE.BoxGeometry(4.0, 0.24, 0.85);
  const postGeo = new THREE.CylinderGeometry(0.085, 0.1, 1.15, 7);
  const railBarGeo = new THREE.CylinderGeometry(0.052, 0.055, 1.0, 6);
  railBarGeo.rotateX(Math.PI * 0.5);
  disposableGeometries.push(stepSlabGeo, postGeo, railBarGeo);

  const stairStepTransforms: THREE.Matrix4[] = [];
  const logPostTransforms: THREE.Matrix4[] = [];
  const logRailTransforms: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();

  const pushFenceSegment = (a: THREE.Vector3, b: THREE.Vector3): void => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const span = a.distanceTo(b);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    const horiz = Math.max(0.01, Math.hypot(b.x - a.x, b.z - a.z));
    const pitch = -Math.atan2(b.y - a.y, horiz);

    for (const hOff of [0.46, 0.88]) {
      dummy.position.set(mid.x, mid.y + hOff, mid.z);
      dummy.rotation.set(pitch, yaw, 0, 'YXZ');
      dummy.scale.set(1, 1, span * 1.03);
      dummy.updateMatrix();
      logRailTransforms.push(dummy.matrix.clone());
    }
  };

  for (let segIdx = 0; segIdx < SACRED_MOUNTAIN_SPIRAL_SEGMENTS.length; segIdx++) {
    const seg = SACRED_MOUNTAIN_SPIRAL_SEGMENTS[segIdx];
    const isStair = seg.kind === 'stair';

    if (isStair) {
      const steps = seg.stepCount;
      for (let st = 0; st < steps; st++) {
        const s = seg.sStart + ((st + 0.5) / steps) * (seg.sEnd - seg.sStart);
        const sp = sampleSacredSpiralAtS(s);
        // Sits squarely atop the carved flat spiral bench (top at sp.y + 0.03)
        dummy.position.set(sp.x - cx, sp.y - 0.09, sp.z - cz);
        dummy.rotation.set(0, sp.tangentYaw, 0, 'YXZ');
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        stairStepTransforms.push(dummy.matrix.clone());
      }
    }

    const railSegEnd = Math.min(seg.sEnd, 0.985);
    if (seg.sStart < 0.985) {
      const railSteps = isStair ? 10 : 6;
      const sides = isStair ? [1, -1] : [1];
      for (const side of sides) {
        let prevPostPos: THREE.Vector3 | null = null;
        for (let k = 0; k <= railSteps; k++) {
          const s = seg.sStart + (k / railSteps) * (railSegEnd - seg.sStart);
          const sp = sampleSacredSpiralAtS(s);
          const radialOffset =
            side * (side > 0 ? SACRED_CLOUD_MOUNTAIN_POS.pathHalfWidth : SACRED_CLOUD_MOUNTAIN_POS.pathHalfWidth - 0.16);
          const rx = sp.x - cx + Math.cos(sp.theta) * radialOffset;
          const rz = sp.z - cz + Math.sin(sp.theta) * radialOffset;
          const py = sp.y + 0.48;

          dummy.position.set(rx, py, rz);
          dummy.rotation.set(0, sp.tangentYaw, 0, 'YXZ');
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          logPostTransforms.push(dummy.matrix.clone());

          const curPos = new THREE.Vector3(rx, sp.y, rz);
          if (prevPostPos) {
            pushFenceSegment(prevPostPos, curPos);
          }
          prevPostPos = curPos;
        }
      }
    }

    // Scenic stone lanterns tucked cleanly on the inner edge of landings
    const transSp = sampleSacredSpiralAtS(seg.sEnd);
    if (segIdx < SACRED_MOUNTAIN_SPIRAL_SEGMENTS.length - 2) {
      const innerX = transSp.x - cx - Math.cos(transSp.theta) * 1.95;
      const innerZ = transSp.z - cz - Math.sin(transSp.theta) * 1.95;
      const lanternPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 1.35, 6),
        graniteTrimMat
      );
      lanternPost.position.set(innerX, transSp.y + 0.65, innerZ);
      const lanternHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.38, 0.42),
        lanternGlowMat
      );
      lanternHead.position.set(innerX, transSp.y + 1.46, innerZ);
      const lanternCap = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.28, 4),
        roofSlateMat
      );
      lanternCap.position.set(innerX, transSp.y + 1.76, innerZ);
      lanternCap.rotation.y = Math.PI * 0.25;
      mountainGroup.add(lanternPost, lanternHead, lanternCap);
      disposableGeometries.push(lanternPost.geometry, lanternHead.geometry, lanternCap.geometry);

      if (segIdx % 2 === 0 && !isSoftwareGl) {
        const pl = new THREE.PointLight(0xffcf7a, 0, 14.0, 1.5);
        pl.position.set(innerX, transSp.y + 1.5, innerZ);
        pl.userData.baseIntensity = 2.6;
        mountainGroup.add(pl);
        lanternLights.push(pl);
      }
    }
  }

  const stepInst = new THREE.InstancedMesh(stepSlabGeo, slateStepMat, stairStepTransforms.length);
  for (let i = 0; i < stairStepTransforms.length; i++) stepInst.setMatrixAt(i, stairStepTransforms[i]);
  stepInst.instanceMatrix.needsUpdate = true;

  const postInst = new THREE.InstancedMesh(postGeo, rusticLogMat, logPostTransforms.length);
  for (let i = 0; i < logPostTransforms.length; i++) postInst.setMatrixAt(i, logPostTransforms[i]);
  postInst.instanceMatrix.needsUpdate = true;

  const railInst = new THREE.InstancedMesh(railBarGeo, rusticLogMat, logRailTransforms.length);
  for (let i = 0; i < logRailTransforms.length; i++) railInst.setMatrixAt(i, logRailTransforms[i]);
  railInst.instanceMatrix.needsUpdate = true;

  mountainGroup.add(stepInst, postInst, railInst);

  // ============================================================================
  // 2D) Billowing Sea of Clouds (y = 66..85m) surrounding the wide mountain waist
  // ============================================================================
  const cloudGroup = new THREE.Group();
  cloudGroup.name = 'sacred-mountain-cloud-sea';
  const cloudPuffGeo = new THREE.PlaneGeometry(1, 1);
  disposableGeometries.push(cloudPuffGeo);
  const cloudPuffs: Array<{
    mesh: THREE.Mesh;
    baseAng: number;
    radius: number;
    baseY: number;
    speed: number;
  }> = [];

  const cloudLayers = isSoftwareGl ? 2 : 3;
  const puffsPerLayer = isSoftwareGl ? 14 : 22;
  for (let ly = 0; ly < cloudLayers; ly++) {
    const layerY = SACRED_CLOUD_MOUNTAIN_POS.cloudBaseY + ly * 7.8;
    const minR = 44.0 + ly * 4.5;
    const maxR = 82.0 + ly * 8.0;
    for (let k = 0; k < puffsPerLayer; k++) {
      const ang = (k / puffsPerLayer) * Math.PI * 2.0 + ly * 0.41;
      const rad = minR + ((k * 37 + ly * 19) % 100) * 0.01 * (maxR - minR);
      const puff = new THREE.Mesh(cloudPuffGeo, cloudBillboardMat);
      const wScale = 28.0 + ((k * 13) % 18);
      const hScale = 13.0 + ((k * 7) % 8);
      puff.scale.set(wScale, hScale, 1);
      puff.position.set(Math.cos(ang) * rad, layerY, Math.sin(ang) * rad);
      cloudGroup.add(puff);
      cloudPuffs.push({
        mesh: puff,
        baseAng: ang,
        radius: rad,
        baseY: layerY,
        speed: 0.008 + (ly % 2 === 0 ? 0.004 : -0.003),
      });
    }
  }
  mountainGroup.add(cloudGroup);

  // ============================================================================
  // 2E) Grounded Existing Foothill Trees along Wide Lower Mountain Skirt (Zero Floating!)
  // ============================================================================
  const foothillTreeGroup = new THREE.Group();
  foothillTreeGroup.name = 'sacred-mountain-foothill-trees';
  const foothillPlacements: IInstancedFloraTreePlacement[] = [];
  const treeVariants = ['pinetree', 'oakgreen', 'animtree_wide', 'animtree_compact'] as const;

  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2.0 + 0.15;
    if (Math.sin(ang) > 0.72 && Math.abs(Math.cos(ang)) < 0.65) continue;
    const rad = 78.0 + ((i * 7) % 11);
    const tx = cx + Math.cos(ang) * rad;
    const tz = cz + Math.sin(ang) * rad;
    const ty = groundHeightAt(tx, tz);
    foothillPlacements.push({
      x: tx,
      y: ty - 0.12,
      z: tz,
      scale: 0.92 + (i % 4) * 0.14,
      floraKey: treeVariants[i % treeVariants.length],
    });
  }
  buildInstancedFloraTreeBatch(ctx, foothillTreeGroup, foothillPlacements);
  scene.add(foothillTreeGroup);

  // ============================================================================
  // 2F) Natural Summit Sanctuary: Grass Blades, Large Pink Tree, Synced Paifang & Round Pond
  // ============================================================================
  const summitGrassGeo = new THREE.ConeGeometry(0.06, 0.28, 4);
  summitGrassGeo.translate(0, 0.14, 0);
  const summitGrassMat = new THREE.MeshStandardMaterial({
    color: 0x528836,
    roughness: 0.78,
    metalness: 0.02,
  });
  attachWindSwayShader(summitGrassMat, 0.05, 2.2, swayMaterials);
  disposableGeometries.push(summitGrassGeo);
  disposableMaterials.push(summitGrassMat);

  const grassPositions: Array<[number, number, number]> = [];
  for (let i = 0; i < 240 && grassPositions.length < 130; i++) {
    const rFrac = Math.sqrt(((i * 53 + 17) % 100) / 100);
    const rad = 2.0 + rFrac * (SACRED_CLOUD_MOUNTAIN_POS.summitRadius - 2.6);
    const ang = (i * 2.39996) % (Math.PI * 2);
    const lx = Math.cos(ang) * rad;
    const lz = Math.sin(ang) * rad;
    if (teardropPoolSignedDist(cx + lx, cz + lz) < 2.15) continue;
    if (Math.abs(lx) < 3.2 && lz > 9.0) continue;
    grassPositions.push([lx, summitY, lz]);
  }
  const summitGrassIM = new THREE.InstancedMesh(summitGrassGeo, summitGrassMat, grassPositions.length);
  const gCol = new THREE.Color();
  for (let i = 0; i < grassPositions.length; i++) {
    const [gx, gy, gz] = grassPositions[i];
    dummy.position.set(gx, gy - 0.02, gz);
    dummy.rotation.set(0, i * 1.1, 0);
    dummy.scale.set(0.9 + (i % 3) * 0.25, 0.8 + (i % 4) * 0.28, 0.9);
    dummy.updateMatrix();
    summitGrassIM.setMatrixAt(i, dummy.matrix);
    gCol.setHSL(0.27 + (i % 5) * 0.012, 0.48, 0.4 + (i % 3) * 0.05);
    summitGrassIM.setColorAt(i, gCol);
  }
  summitGrassIM.instanceMatrix.needsUpdate = true;
  if (summitGrassIM.instanceColor) summitGrassIM.instanceColor.needsUpdate = true;
  mountainGroup.add(summitGrassIM);

  // Large Pink Cherry Blossom Tree using existing AnimTreeWide_Complete model (East/NE meadow)
  const sakuraTree = buildExistingModelPinkBlossomTree(ctx, 5.4);
  sakuraTree.position.set(
    SACRED_CLOUD_MOUNTAIN_POS.summitTreeX - cx,
    summitY - 0.08,
    SACRED_CLOUD_MOUNTAIN_POS.summitTreeZ - cz
  );
  sakuraTree.rotation.y = 0.65;
  mountainGroup.add(sakuraTree);

  // Fallen pink blossom petals scattered gently beneath the Pink Tree
  const fallenPetalGeo = new THREE.CircleGeometry(0.11, 5);
  fallenPetalGeo.rotateX(-Math.PI * 0.5);
  disposableGeometries.push(fallenPetalGeo);
  const petalIM = new THREE.InstancedMesh(fallenPetalGeo, sakuraPetalMat, 42);
  for (let i = 0; i < 42; i++) {
    const pa = i * 2.4;
    const pr = 1.1 + ((i * 19) % 100) * 0.045;
    const px = SACRED_CLOUD_MOUNTAIN_POS.summitTreeX - cx + Math.cos(pa) * pr;
    const pz = SACRED_CLOUD_MOUNTAIN_POS.summitTreeZ - cz + Math.sin(pa) * pr;
    dummy.position.set(px, summitY + 0.03, pz);
    dummy.rotation.set(0, pa, 0);
    dummy.scale.setScalar(0.8 + (i % 3) * 0.3);
    dummy.updateMatrix();
    petalIM.setMatrixAt(i, dummy.matrix);
  }
  petalIM.instanceMatrix.needsUpdate = true;
  mountainGroup.add(petalIM);

  // Crimson & Gold Paifang Moon-Gate synced directly at s = 0.985 arrival terrace (sumSample)
  const sumSample = sampleSacredSpiralAtS(0.985);
  const paifangGroup = new THREE.Group();
  paifangGroup.position.set(sumSample.x - cx, summitY, sumSample.z - cz);
  paifangGroup.rotation.y = sumSample.tangentYaw;

  const pColGeo = new THREE.CylinderGeometry(0.28, 0.34, 5.2, 10);
  const pCrossGeo = new THREE.BoxGeometry(7.0, 0.44, 0.55);
  const pRoofMainGeo = new THREE.BoxGeometry(8.1, 0.34, 1.85);
  const pRoofTopGeo = new THREE.BoxGeometry(4.8, 0.3, 1.45);
  disposableGeometries.push(pColGeo, pCrossGeo, pRoofMainGeo, pRoofTopGeo);
  for (const px of [-2.55, 2.55]) {
    const col = new THREE.Mesh(pColGeo, crimsonLacquerMat);
    col.position.set(px, 2.6, 0);
    const goldBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.5, 0.45, 10),
      graniteTrimMat
    );
    goldBase.position.set(px, 0.22, 0);
    disposableGeometries.push(goldBase.geometry);
    paifangGroup.add(col, goldBase);
  }
  const pBeam1 = new THREE.Mesh(pCrossGeo, crimsonLacquerMat);
  pBeam1.position.set(0, 4.35, 0);
  const pPlaque = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.18), bronzeGoldMat);
  pPlaque.position.set(0, 4.45, 0);
  const pRoof1 = new THREE.Mesh(pRoofMainGeo, roofSlateMat);
  pRoof1.position.set(0, 4.95, 0);
  const pRoof2 = new THREE.Mesh(pRoofTopGeo, roofSlateMat);
  pRoof2.position.set(0, 5.55, 0);
  disposableGeometries.push(pPlaque.geometry);
  paifangGroup.add(pBeam1, pPlaque, pRoof1, pRoof2);
  mountainGroup.add(paifangGroup);

  // Small Bronze Incense Censer along entry walk
  const censerGroup = new THREE.Group();
  censerGroup.position.set(
    SACRED_CLOUD_MOUNTAIN_POS.incenseCenserX - cx,
    summitY,
    SACRED_CLOUD_MOUNTAIN_POS.incenseCenserZ - cz
  );
  const cBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.4, 0.62, 12), antiqueBronzeMat);
  cBowl.position.y = 0.74;
  const cPed = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.44, 0.44, 8), graniteTrimMat);
  cPed.position.y = 0.22;
  const cEmber = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 10), lanternGlowMat);
  cEmber.position.y = 1.04;
  disposableGeometries.push(cBowl.geometry, cPed.geometry, cEmber.geometry);
  censerGroup.add(cPed, cBowl, cEmber);
  mountainGroup.add(censerGroup);

  // Clean Round Sacred Lotus Pond (upward +Y CircleGeometry matching teardropPoolSignedDist 1:1)
  const poolLocalX = SACRED_CLOUD_MOUNTAIN_POS.poolCx - cx;
  const poolLocalZ = SACRED_CLOUD_MOUNTAIN_POS.poolCz - cz;
  const poolGroup = new THREE.Group();
  poolGroup.position.set(poolLocalX, 0, poolLocalZ);

  const waterGeo = new THREE.CircleGeometry(SACRED_CLOUD_MOUNTAIN_POS.poolRadius + 0.08, 48);
  waterGeo.rotateX(-Math.PI * 0.5);
  disposableGeometries.push(waterGeo);
  const poolWaterMesh = new THREE.Mesh(waterGeo, poolWaterMat);
  poolWaterMesh.position.y = SACRED_CLOUD_MOUNTAIN_POS.poolWaterY + 0.02;
  poolGroup.add(poolWaterMesh);

  // Low natural shoreline rocks around pond perimeter, KEEPING East stepping-stone entry (ang ~ 0) OPEN!
  const shoreStoneGeo = new THREE.DodecahedronGeometry(0.4, 1);
  disposableGeometries.push(shoreStoneGeo);
  const rimRockCount = 28;
  for (let i = 0; i < rimRockCount; i++) {
    const ang = (i / rimRockCount) * Math.PI * 2.0;
    const normAng = Math.atan2(Math.sin(ang), Math.cos(ang));
    // Leave clean unobstructed sandy entry path on East shore (+X, normAng near 0)
    if (Math.abs(normAng) < 0.45) continue;
    const rx = Math.cos(ang) * (SACRED_CLOUD_MOUNTAIN_POS.poolRadius + 0.24);
    const rz = Math.sin(ang) * (SACRED_CLOUD_MOUNTAIN_POS.poolRadius + 0.24);
    const stone = new THREE.Mesh(shoreStoneGeo, shoreBoulderMat);
    stone.position.set(rx, summitY + 0.04, rz);
    stone.scale.set(1.25 + (i % 3) * 0.22, 0.45, 1.05 + (i % 2) * 0.22);
    stone.rotation.y = ang + 0.35;
    poolGroup.add(stone);
  }
  mountainGroup.add(poolGroup);

  // Warm drifting mist wisps over the Round Lotus Pond
  const poolMistPuffs: Array<{ mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }> = [];
  const mistCount = isSoftwareGl ? 5 : 8;
  for (let m = 0; m < mistCount; m++) {
    const mx = poolLocalX + Math.cos(m * 1.4) * 2.8;
    const mz = poolLocalZ + Math.sin(m * 1.1) * 2.8;
    const wisp = new THREE.Mesh(cloudPuffGeo, mistWispMat);
    wisp.scale.set(4.0 + (m % 3) * 1.0, 1.9, 1);
    wisp.position.set(mx, summitY + 0.42 + (m % 2) * 0.2, mz);
    mountainGroup.add(wisp);
    poolMistPuffs.push({ mesh: wisp, baseX: mx, baseZ: mz, phase: m * 0.85 });
  }

  // Unobstructed East-Entry Lotus Stepping Discs & Sleek Outward-Flared Carved Lotus Dais
  const petalBladeGeo = new THREE.SphereGeometry(0.42, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);
  petalBladeGeo.scale(1.15, 0.72, 0.34);
  disposableGeometries.push(petalBladeGeo);

  for (let s = 0; s < SACRED_LOTUS_STEPPING_STONES.length; s++) {
    const st = SACRED_LOTUS_STEPPING_STONES[s];
    const discMaterials = [graniteTrimMat, lotusStoneTopMat, graniteTrimMat];
    const discGeo = new THREE.CylinderGeometry(st.radius, st.radius * 1.1, 0.72, 24);
    disposableGeometries.push(discGeo);
    const stoneHolder = new THREE.Group();
    stoneHolder.position.set(st.x - cx, st.topY - 0.36, st.z - cz);

    const discMesh = new THREE.Mesh(discGeo, discMaterials);
    discMesh.receiveShadow = true;
    stoneHolder.add(discMesh);

    // Wide graceful outward-opening carved lotus petals around Central Lotus Dais (keeping +X arrival gap clean)
    if (st.radius > 1.5) {
      const innerPetalCount = 16;
      for (let p = 0; p < innerPetalCount; p++) {
        const ang = (p / innerPetalCount) * Math.PI * 2.0;
        const normAng = Math.atan2(Math.sin(ang), Math.cos(ang));
        if (Math.abs(normAng) < 0.38) continue;
        const pet = new THREE.Mesh(petalBladeGeo, lotusPetalMat);
        pet.position.set(Math.cos(ang) * (st.radius + 0.18), 0.16, Math.sin(ang) * (st.radius + 0.18));
        pet.rotation.order = 'YXZ';
        pet.rotation.y = -ang + Math.PI * 0.5;
        pet.rotation.x = 1.08;
        stoneHolder.add(pet);
      }
      const outerPetalCount = 16;
      for (let p = 0; p < outerPetalCount; p++) {
        const ang = ((p + 0.5) / outerPetalCount) * Math.PI * 2.0;
        const normAng = Math.atan2(Math.sin(ang), Math.cos(ang));
        if (Math.abs(normAng) < 0.38) continue;
        const pet = new THREE.Mesh(petalBladeGeo, graniteTrimMat);
        pet.position.set(Math.cos(ang) * (st.radius + 0.42), 0.08, Math.sin(ang) * (st.radius + 0.42));
        pet.scale.setScalar(1.12);
        pet.rotation.order = 'YXZ';
        pet.rotation.y = -ang + Math.PI * 0.5;
        pet.rotation.x = 1.24;
        stoneHolder.add(pet);
      }
    }
    mountainGroup.add(stoneHolder);
  }

  // Summit Warm Sunset Lantern Glows
  if (!isSoftwareGl) {
    for (const [lx, ly, lz, intensity] of [
      [sumSample.x - cx - 2.6, summitY + 2.5, sumSample.z - cz, 4.2],
      [sumSample.x - cx + 2.6, summitY + 2.5, sumSample.z - cz, 4.2],
      [SACRED_CLOUD_MOUNTAIN_POS.summitTreeX - cx, summitY + 3.8, SACRED_CLOUD_MOUNTAIN_POS.summitTreeZ - cz, 4.5],
      [poolLocalX, summitY + 2.2, poolLocalZ, 3.8],
    ] as const) {
      const pl = new THREE.PointLight(0xffcf7a, 0, 24.0, 1.4);
      pl.position.set(lx, ly, lz);
      pl.userData.baseIntensity = intensity;
      mountainGroup.add(pl);
      lanternLights.push(pl);
    }
  }

  scene.add(mountainGroup);
  distanceCulledObjects.push({
    obj: mountainGroup,
    cx,
    cz,
    radius: 100.0,
    maxDist: 680.0,
  });

  // ============================================================================
  // GROUP 3: Relocated Octagonal Yin-Yang Bagua Platform in Chinese/Monks Area (76, -234)
  // ============================================================================
  const baguaWorldGroup = new THREE.Group();
  baguaWorldGroup.name = 'chinese-bagua-platform';
  baguaWorldGroup.position.set(
    CHINESE_BAGUA_PLATFORM_POS.x,
    CHINESE_BAGUA_PLATFORM_POS.deckY,
    CHINESE_BAGUA_PLATFORM_POS.z
  );

  const pierHeight = CHINESE_BAGUA_PLATFORM_POS.deckY - CHINESE_BAGUA_PLATFORM_POS.baseY + 0.8;
  const pierGeo = new THREE.CylinderGeometry(
    CHINESE_BAGUA_PLATFORM_POS.radius - 0.15,
    CHINESE_BAGUA_PLATFORM_POS.radius + 0.45,
    pierHeight,
    8
  );
  pierGeo.rotateY(Math.PI / 8);
  const octGeo = new THREE.CylinderGeometry(
    CHINESE_BAGUA_PLATFORM_POS.radius,
    CHINESE_BAGUA_PLATFORM_POS.radius + 0.25,
    0.45,
    8
  );
  octGeo.rotateY(Math.PI / 8);
  disposableGeometries.push(pierGeo, octGeo);

  const pierMesh = new THREE.Mesh(pierGeo, graniteTrimMat);
  pierMesh.position.y = -0.45 - pierHeight * 0.5;
  pierMesh.receiveShadow = true;
  const octMesh = new THREE.Mesh(octGeo, warmCedarDeckMat);
  octMesh.position.y = -0.225;
  octMesh.receiveShadow = true;
  baguaWorldGroup.add(pierMesh, octMesh);

  const plinth1Geo = new THREE.CylinderGeometry(3.38, 3.5, 0.17, 8);
  plinth1Geo.rotateY(Math.PI / 8);
  const plinth2Geo = new THREE.CylinderGeometry(2.94, 3.04, 0.17, 8);
  plinth2Geo.rotateY(Math.PI / 8);
  const discTopGeo = new THREE.CylinderGeometry(2.82, 2.82, 0.05, 32);
  disposableGeometries.push(plinth1Geo, plinth2Geo, discTopGeo);

  const plinth1 = new THREE.Mesh(plinth1Geo, darkWoodRailMat);
  plinth1.position.y = 0.085;
  const plinth2 = new THREE.Mesh(plinth2Geo, graniteTrimMat);
  plinth2.position.y = 0.255;
  const baguaDisc = new THREE.Mesh(discTopGeo, baguaDiscMat);
  baguaDisc.position.y = 0.345;
  baguaWorldGroup.add(plinth1, plinth2, baguaDisc);

  const octR = CHINESE_BAGUA_PLATFORM_POS.radius - 0.14;
  const railSpan = octR * Math.sin(Math.PI / 8) * 1.95;
  const octTopRailGeo = new THREE.BoxGeometry(0.14, 0.12, railSpan);
  const octPostGeo = new THREE.BoxGeometry(0.18, 1.05, 0.18);
  const xBraceGeo = new THREE.BoxGeometry(0.08, 0.08, 1.18);
  disposableGeometries.push(octTopRailGeo, octPostGeo, xBraceGeo);

  for (let side = 0; side < 8; side++) {
    const ang = (side * Math.PI) / 4;
    const vAng = ang + Math.PI / 8;
    const post = new THREE.Mesh(octPostGeo, darkWoodRailMat);
    post.position.set(Math.cos(vAng) * octR, 0.52, Math.sin(vAng) * octR);
    baguaWorldGroup.add(post);

    if (side === 3) continue;
    const midDist = octR * Math.cos(Math.PI / 8);
    const sideYaw = Math.atan2(-Math.sin(ang), Math.cos(ang));
    const railSide = new THREE.Group();
    railSide.position.set(Math.cos(ang) * midDist, 0, Math.sin(ang) * midDist);
    railSide.rotation.y = sideYaw;

    const topB = new THREE.Mesh(octTopRailGeo, darkWoodRailMat);
    topB.position.y = 0.96;
    const botB = new THREE.Mesh(octTopRailGeo, darkWoodRailMat);
    botB.position.y = 0.18;
    railSide.add(topB, botB);

    for (const zOff of [-railSpan * 0.31, 0, railSpan * 0.31]) {
      const b1 = new THREE.Mesh(xBraceGeo, darkWoodRailMat);
      b1.position.set(0, 0.57, zOff);
      b1.rotation.x = 0.72;
      const b2 = new THREE.Mesh(xBraceGeo, darkWoodRailMat);
      b2.position.set(0, 0.57, zOff);
      b2.rotation.x = -0.72;
      railSide.add(b1, b2);
    }
    baguaWorldGroup.add(railSide);
  }

  const swDirX = -Math.SQRT1_2;
  const swDirZ = Math.SQRT1_2;
  const swRightX = -swDirZ;
  const swRightZ = swDirX;
  const swYaw = Math.atan2(swDirX, swDirZ);

  const baguaCheekUpperGeo = new THREE.BoxGeometry(0.32, 1.02, 1.55);
  const baguaCheekLowerGeo = new THREE.BoxGeometry(0.32, 0.6, 1.74);
  const baguaLanternBaseGeo = new THREE.BoxGeometry(0.56, 0.45, 0.56);
  const baguaLanternCageGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const baguaLanternCapGeo = new THREE.ConeGeometry(0.46, 0.28, 4);
  baguaLanternCapGeo.rotateY(Math.PI / 4);
  disposableGeometries.push(
    baguaCheekUpperGeo,
    baguaCheekLowerGeo,
    baguaLanternBaseGeo,
    baguaLanternCageGeo,
    baguaLanternCapGeo
  );

  for (let s = 0; s < 5; s++) {
    const along = 5.74 + s * 0.62;
    const stepTopY = -0.02 - s * 0.24;
    const stepH = stepTopY - -1.19;
    const stepGeo = new THREE.BoxGeometry(3.2, stepH, 0.6);
    disposableGeometries.push(stepGeo);
    const stMesh = new THREE.Mesh(stepGeo, slateStepMat);
    stMesh.position.set(swDirX * along, -1.19 + stepH * 0.5, swDirZ * along);
    stMesh.rotation.y = swYaw;
    stMesh.castShadow = !isSoftwareGl;
    stMesh.receiveShadow = !isSoftwareGl;
    baguaWorldGroup.add(stMesh);
  }

  for (const sideSign of [-1, 1] as const) {
    const pxOff = swRightX * sideSign * 1.78;
    const pzOff = swRightZ * sideSign * 1.78;

    const cheekUpper = new THREE.Mesh(baguaCheekUpperGeo, graniteTrimMat);
    cheekUpper.position.set(swDirX * 6.22 + pxOff, -0.69, swDirZ * 6.22 + pzOff);
    cheekUpper.rotation.y = swYaw;

    const cheekLower = new THREE.Mesh(baguaCheekLowerGeo, graniteTrimMat);
    cheekLower.position.set(swDirX * 7.89 + pxOff, -0.9, swDirZ * 7.89 + pzOff);
    cheekLower.rotation.y = swYaw;
    baguaWorldGroup.add(cheekUpper, cheekLower);

    const postX = swDirX * 8.48 + pxOff;
    const postZ = swDirZ * 8.48 + pzOff;
    const lBase = new THREE.Mesh(baguaLanternBaseGeo, graniteTrimMat);
    lBase.position.set(postX, -0.375, postZ);
    lBase.rotation.y = swYaw;
    const lCage = new THREE.Mesh(baguaLanternCageGeo, lanternGlowMat);
    lCage.position.set(postX, 0.06, postZ);
    lCage.rotation.y = swYaw;
    const lCap = new THREE.Mesh(baguaLanternCapGeo, roofSlateMat);
    lCap.position.set(postX, 0.41, postZ);
    lCap.rotation.y = swYaw;
    baguaWorldGroup.add(lBase, lCage, lCap);
  }

  const stele = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.55, 0.28), graniteTrimMat);
  stele.position.set(3.8, 0.78, -2.4);
  stele.rotation.y = -0.5;
  disposableGeometries.push(stele.geometry);
  baguaWorldGroup.add(stele);

  // Two Cedar Meditation / Rest Benches atop the octagonal outer Bagua deck for resting sparrers & spectators
  const baguaBenchSeatGeo = new THREE.BoxGeometry(1.55, 0.11, 0.56);
  const baguaBenchLegGeo = new THREE.BoxGeometry(0.12, 0.36, 0.48);
  disposableGeometries.push(baguaBenchSeatGeo, baguaBenchLegGeo);
  for (const [bx, bz, byaw] of [
    [-3.45, -3.45, Math.PI / 4],
    [3.45, 3.45, -3 * Math.PI / 4],
  ] as const) {
    const benchGrp = new THREE.Group();
    benchGrp.position.set(bx, 0, bz);
    benchGrp.rotation.y = byaw;
    const seat = new THREE.Mesh(baguaBenchSeatGeo, warmCedarDeckMat);
    seat.position.y = 0.41;
    seat.castShadow = !isSoftwareGl;
    seat.receiveShadow = !isSoftwareGl;
    benchGrp.add(seat);
    for (const lx of [-0.58, 0.58]) {
      const leg = new THREE.Mesh(baguaBenchLegGeo, darkWoodRailMat);
      leg.position.set(lx, 0.18, 0);
      benchGrp.add(leg);
    }
    baguaWorldGroup.add(benchGrp);
  }

  if (!isSoftwareGl) {
    const baguaLight = new THREE.PointLight(0xffcf7a, 0, 20.0, 1.4);
    baguaLight.position.set(0, 2.6, 0);
    baguaLight.userData.baseIntensity = 4.2;
    baguaWorldGroup.add(baguaLight);
    lanternLights.push(baguaLight);
  }

  scene.add(baguaWorldGroup);
  distanceCulledObjects.push({
    obj: baguaWorldGroup,
    cx: CHINESE_BAGUA_PLATFORM_POS.x,
    cz: CHINESE_BAGUA_PLATFORM_POS.z,
    radius: 18.0,
    maxDist: 280.0,
  });

  // Spawn 2 sparring WarriorMonks face-to-face atop the relocated Yin-Yang Bagua disc (they walk back to Fortress 2F beds to sleep at night)
  const baguaSparY = CHINESE_BAGUA_PLATFORM_POS.deckY + 0.37;
  const FZ = FORTRESS_Z_OFFSET;
  const fortSummitY = CHINESE_FORTRESS_POS.summitHeight;
  const pavFloor1Y = CHINESE_FORTRESS_POS.pavilionFloor1Y;
  const pavFloor2Y = CHINESE_FORTRESS_POS.pavilionFloor2Y;
  const bedTop2Y = pavFloor2Y + 0.38;
  const baguaToFortressTrail: ReadonlyArray<readonly [number, number, number]> = [
    [CHINESE_BAGUA_PLATFORM_POS.x - 4.0, CHINESE_BAGUA_PLATFORM_POS.deckY, CHINESE_BAGUA_PLATFORM_POS.z + 4.0],
    [CHINESE_BAGUA_PLATFORM_POS.x - 5.8, CHINESE_BAGUA_PLATFORM_POS.baseY, CHINESE_BAGUA_PLATFORM_POS.z + 5.8],
    [-310.0, 34.0, -269.0],
    [-310.0, 31.2, -255.0],
    [-285.0, groundHeightAt(-285.0, -255.0), -255.0],
    [-240.0, groundHeightAt(-240.0, -225.0), -225.0],
    [-195.0, groundHeightAt(-195.0, -195.0), -195.0],
    [-135.0, groundHeightAt(-135.0, -205.0), -205.0],
    [-80.0, groundHeightAt(-80.0, -220.0), -220.0],
    [-35.0, groundHeightAt(-35.0, -235.0), -235.0],
    [0.0, CHINESE_FORTRESS_POS.stairBaseHeight, CHINESE_FORTRESS_POS.stairFootZ + 2.0],
    [0.0, CHINESE_FORTRESS_POS.midLandingHeight, CHINESE_FORTRESS_POS.stairMidZ - 1.2],
    [0.0, fortSummitY, -135.0 + FZ],
  ];
  const makeBaguaNightSleepRoute = (
    startX: number,
    startZ: number,
    isWest: boolean,
    bedX: number,
    bedZ: number
  ): ReadonlyArray<readonly [number, number, number]> => {
    const sideSign = isWest ? -1 : 1;
    return [
      [startX, baguaSparY, startZ],
      ...baguaToFortressTrail,
      [sideSign * 30.0, fortSummitY, -153.5 + FZ],
      [sideSign * 30.0, pavFloor1Y, -158.0 + FZ],
      [sideSign * 36.9, pavFloor1Y, -159.0 + FZ],
      [sideSign * 36.9, pavFloor2Y, -168.4 + FZ],
      [sideSign * 34.2, pavFloor2Y, -168.4 + FZ],
      [bedX, pavFloor2Y, -167.8 + FZ],
      [bedX, bedTop2Y, bedZ],
    ];
  };

  spawnTempleMonk({
    id: 'bagua_spar_west',
    role: 'bagua_sparring',
    partnerId: 'bagua_spar_east',
    restBenchX: CHINESE_BAGUA_PLATFORM_POS.x - 3.45,
    restBenchY: CHINESE_BAGUA_PLATFORM_POS.deckY,
    restBenchZ: CHINESE_BAGUA_PLATFORM_POS.z - 3.45,
    restBenchYaw: Math.PI / 4,
    parent: scene,
    homeX: CHINESE_BAGUA_PLATFORM_POS.x - 1.55,
    homeY: baguaSparY,
    homeZ: CHINESE_BAGUA_PLATFORM_POS.z,
    baseYaw: Math.PI / 2,
    phaseOffset: 0.4,
    bedX: -22.38,
    bedY: bedTop2Y,
    bedZ: -164.65 + FZ,
    bedYaw: -Math.PI / 2,
    sleepRoute: makeBaguaNightSleepRoute(
      CHINESE_BAGUA_PLATFORM_POS.x - 1.55,
      CHINESE_BAGUA_PLATFORM_POS.z,
      true,
      -22.38,
      -164.65 + FZ
    ),
    weaponVisible: true,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
  });
  spawnTempleMonk({
    id: 'bagua_spar_east',
    role: 'bagua_sparring',
    partnerId: 'bagua_spar_west',
    restBenchX: CHINESE_BAGUA_PLATFORM_POS.x + 3.45,
    restBenchY: CHINESE_BAGUA_PLATFORM_POS.deckY,
    restBenchZ: CHINESE_BAGUA_PLATFORM_POS.z + 3.45,
    restBenchYaw: -3 * Math.PI / 4,
    parent: scene,
    homeX: CHINESE_BAGUA_PLATFORM_POS.x + 1.55,
    homeY: baguaSparY,
    homeZ: CHINESE_BAGUA_PLATFORM_POS.z,
    baseYaw: -Math.PI / 2,
    phaseOffset: 1.9,
    bedX: 22.38,
    bedY: bedTop2Y,
    bedZ: -162.7 + FZ,
    bedYaw: Math.PI / 2,
    sleepRoute: makeBaguaNightSleepRoute(
      CHINESE_BAGUA_PLATFORM_POS.x + 1.55,
      CHINESE_BAGUA_PLATFORM_POS.z,
      false,
      22.38,
      -162.7 + FZ
    ),
    weaponVisible: true,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
  });

  // Gentle atmospheric animation (cloud sea drift, cairn flags, pool mist)
  const updateSacredCloudMountain = (
    elapsedTime: number,
    playerX: number,
    playerZ: number
  ): void => {
    for (let i = 0; i < animatedFlags.length; i++) {
      const f = animatedFlags[i];
      f.mesh.rotation.y = f.baseYaw + Math.sin(elapsedTime * 3.8 + f.phase) * 0.24;
    }

    if (mountainGroup.visible) {
      for (let i = 0; i < cloudPuffs.length; i++) {
        const cp = cloudPuffs[i];
        const ang = cp.baseAng + elapsedTime * cp.speed;
        const px = Math.cos(ang) * cp.radius;
        const pz = Math.sin(ang) * cp.radius;
        cp.mesh.position.set(
          px,
          cp.baseY + Math.sin(elapsedTime * 0.45 + i * 0.7) * 0.85,
          pz
        );
        cp.mesh.rotation.y = Math.atan2(playerX - (cx + px), playerZ - (cz + pz));
      }

      for (let i = 0; i < poolMistPuffs.length; i++) {
        const mp = poolMistPuffs[i];
        mp.mesh.position.y = summitY + 0.44 + ((elapsedTime * 0.28 + mp.phase) % 1.35);
        mp.mesh.position.x = mp.baseX + Math.sin(elapsedTime * 0.6 + mp.phase) * 0.65;
        mp.mesh.rotation.y = Math.atan2(playerX - (cx + mp.baseX), playerZ - (cz + mp.baseZ));
      }
    }
  };

  return { updateSacredCloudMountain };
}
// #endregion
