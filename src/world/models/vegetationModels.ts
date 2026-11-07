// ============================================================================
// MODULE: World / Models / Vegetation Models
// DESIGN: Spatially sectorized instanced flora with GPU Vertex-Shader Wind & Sector LOD (SRP)
// SUMMARY: Uses embedded botanical 3D models from plants/ (PineTree, OakGreen, OakYellow,
//          AnimTree, AnimTreeWide, AnimTreeCompact, ForestBush, ForestFern, Cornflower,
//          WhiteFlower) rendered via static GPU-driven InstancedMeshes with per-instance
//          spatial wind phase, automatic in-code LOD0/LOD1 sector switching, and pooled
//          CPU FloraModel rigs exclusively for active axe hitTree() and fellTree() animations.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import type { IWeatherStateSnapshot } from '../domain/worldTypes';
import {
  WATER_LEVEL,
  SOUTHERN_MINE_POS,
  groundHeightAt,
  isInsideBearCave,
  trailFactorAt,
  hash2D,
  generateWatersideCornflowerPositions,
} from '../terrainMath';
import {
  attachWindSwayShader,
  perturbGeometryVertices,
} from '../builders/shaderAndMaterialBuilders';
import type { IWorldModelBuildContext } from './types';
import {
  FloraModel,
  FloraLODPair,
  createWoodCutRingMaterial,
  unpackFloraBundle,
  type FloraCategory,
  type FloraKey,
  type FloraQuality,
  type FloraSubmeshData,
  type FloraWindState,
  ANIMTREE_PACK_B64,
  ANIMTREE_LOD_PACK_B64,
  ANIMTREE_TEXTURES,
} from './plants/AnimTree_Complete';
import {
  ANIMTREEWIDE_PACK_B64,
  ANIMTREEWIDE_LOD_PACK_B64,
} from './plants/AnimTreeWide_Complete';
import {
  ANIMTREECOMPACT_PACK_B64,
  ANIMTREECOMPACT_LOD_PACK_B64,
} from './plants/AnimTreeCompact_Complete';
import {
  PINETREE_PACK_B64,
  PINETREE_LOD_PACK_B64,
  PINETREE_TEXTURES,
} from './plants/PineTree_Complete';
import {
  OAKGREEN_PACK_B64,
  OAKGREEN_LOD_PACK_B64,
  OAKGREEN_TEXTURES,
} from './plants/OakGreen_Complete';
import {
  OAKYELLOW_PACK_B64,
  OAKYELLOW_LOD_PACK_B64,
} from './plants/OakYellow_Complete';
import {
  FORESTBUSH_PACK_B64,
  FORESTBUSH_LOD_PACK_B64,
  FORESTBUSH_TEXTURES,
} from './plants/ForestBush_Complete';
import {
  FORESTFERN_PACK_B64,
  FORESTFERN_LOD_PACK_B64,
} from './plants/ForestFern_Complete';
import {
  CORNFLOWER_PACK_B64,
  CORNFLOWER_LOD_PACK_B64,
} from './plants/Cornflower_Complete';
import {
  WHITEFLOWER_PACK_B64,
  WHITEFLOWER_LOD_PACK_B64,
} from './plants/WhiteFlower_Complete';

export { FloraLODPair, type FloraQuality };
import {
  getActiveTreeFellingRecords,
  type ITreeFellingRecord,
} from '../systems/treeFellingSystem';
// #endregion

// ======================== CONSTANTS & HELPERS ======================== \\
// #region Constants & Helpers
const VEG_SECTOR_SIZE = 80;
const VEG_SECTOR_RADIUS = 56;
const TREE_SECTOR_MAX_DIST = 165;
const TREE_SECTOR_MAX_DIST_SW = 125;
const UNDERGROWTH_SECTOR_MAX_DIST = 85;
const UNDERGROWTH_SECTOR_MAX_DIST_SW = 62;

/** Distance thresholds (with hysteresis) for switching tree & undergrowth sectors between LOD0 (High Quality) and LOD1 (Low Quality). */
const TREE_LOD_NEAR_DIST = 62;
const TREE_LOD_FAR_DIST = 68;
const TREE_LOD_NEAR_DIST_SW = 48;
const TREE_LOD_FAR_DIST_SW = 54;
const UNDERGROWTH_LOD_NEAR_DIST = 34;
const UNDERGROWTH_LOD_FAR_DIST = 40;
const UNDERGROWTH_LOD_NEAR_DIST_SW = 26;
const UNDERGROWTH_LOD_FAR_DIST_SW = 32;

const PINE_MODEL_BASE_SCALE = 3.85;
const OAK_GREEN_MODEL_BASE_SCALE = 3.65;
const OAK_YELLOW_MODEL_BASE_SCALE = 3.45;
const ANIM_TREE_MODEL_BASE_SCALE = 3.65;
const ANIM_TREE_WIDE_MODEL_BASE_SCALE = 3.55;
const ANIM_TREE_COMPACT_MODEL_BASE_SCALE = 3.65;
const FOREST_BUSH_BASE_SCALE = 1.18;
const FOREST_FERN_BASE_SCALE = 0.88;
const CORNFLOWER_BASE_SCALE = 0.58;
const WHITE_FLOWER_BASE_SCALE = 0.58;

const TREE_CUT_Y = 0.32;

export type PlantWeatherAnimationState =
  | FloraWindState
  | 'sit'
  | 'lie'
  | 'morph_wind';

export type TreeFloraKey =
  | 'pinetree'
  | 'oakgreen'
  | 'oakyellow'
  | 'animtree'
  | 'animtree_wide'
  | 'animtree_compact';

const OAK_FLORA_VARIANTS: readonly TreeFloraKey[] = [
  'oakgreen',
  'animtree',
  'animtree_wide',
  'animtree_compact',
];

interface IFloraSpec {
  key: FloraKey;
  category: FloraCategory;
  packB64: string;
  lodPackB64: string;
  baseScale: number;
  maxY: number;
}

const FLORA_SPECS: Record<FloraKey, IFloraSpec> = {
  pinetree: {
    key: 'pinetree',
    category: 'other_trees',
    packB64: PINETREE_PACK_B64,
    lodPackB64: PINETREE_LOD_PACK_B64,
    baseScale: PINE_MODEL_BASE_SCALE,
    maxY: 4.0,
  },
  oakgreen: {
    key: 'oakgreen',
    category: 'other_trees',
    packB64: OAKGREEN_PACK_B64,
    lodPackB64: OAKGREEN_LOD_PACK_B64,
    baseScale: OAK_GREEN_MODEL_BASE_SCALE,
    maxY: 3.5,
  },
  oakyellow: {
    key: 'oakyellow',
    category: 'other_trees',
    packB64: OAKYELLOW_PACK_B64,
    lodPackB64: OAKYELLOW_LOD_PACK_B64,
    baseScale: OAK_YELLOW_MODEL_BASE_SCALE,
    maxY: 3.4,
  },
  animtree: {
    key: 'animtree',
    category: 'trees',
    packB64: ANIMTREE_PACK_B64,
    lodPackB64: ANIMTREE_LOD_PACK_B64,
    baseScale: ANIM_TREE_MODEL_BASE_SCALE,
    maxY: 3.6,
  },
  animtree_wide: {
    key: 'animtree_wide',
    category: 'trees',
    packB64: ANIMTREEWIDE_PACK_B64,
    lodPackB64: ANIMTREEWIDE_LOD_PACK_B64,
    baseScale: ANIM_TREE_WIDE_MODEL_BASE_SCALE,
    maxY: 3.3,
  },
  animtree_compact: {
    key: 'animtree_compact',
    category: 'trees',
    packB64: ANIMTREECOMPACT_PACK_B64,
    lodPackB64: ANIMTREECOMPACT_LOD_PACK_B64,
    baseScale: ANIM_TREE_COMPACT_MODEL_BASE_SCALE,
    maxY: 2.9,
  },
  forestbush: {
    key: 'forestbush',
    category: 'vegetation',
    packB64: FORESTBUSH_PACK_B64,
    lodPackB64: FORESTBUSH_LOD_PACK_B64,
    baseScale: FOREST_BUSH_BASE_SCALE,
    maxY: 1.25,
  },
  forestfern: {
    key: 'forestfern',
    category: 'vegetation',
    packB64: FORESTFERN_PACK_B64,
    lodPackB64: FORESTFERN_LOD_PACK_B64,
    baseScale: FOREST_FERN_BASE_SCALE,
    maxY: 0.85,
  },
  cornflower: {
    key: 'cornflower',
    category: 'vegetation',
    packB64: CORNFLOWER_PACK_B64,
    lodPackB64: CORNFLOWER_LOD_PACK_B64,
    baseScale: CORNFLOWER_BASE_SCALE,
    maxY: 1.15,
  },
  whiteflower: {
    key: 'whiteflower',
    category: 'vegetation',
    packB64: WHITEFLOWER_PACK_B64,
    lodPackB64: WHITEFLOWER_LOD_PACK_B64,
    baseScale: WHITE_FLOWER_BASE_SCALE,
    maxY: 1.2,
  },
};

interface ITreeInstanceHandle {
  obstacleIndex: number;
  kind: 'pine' | 'oak' | 'birch' | 'palm' | 'acacia';
  floraKey?: TreeFloraKey;
  meshes: THREE.InstancedMesh[];
  shadowMesh: THREE.InstancedMesh;
  instanceIndex: number;
  baseMatrix: THREE.Matrix4;
  baseShadowMatrix: THREE.Matrix4;
  unitScale: number;
  isHiddenInInstancedMesh: boolean;
}

interface IPooledFloraTree {
  floraKey: TreeFloraKey;
  instance: FloraModel;
  assignedObstacleIndex: number | null;
  lastChopHits: number;
}

interface IFloraSubmeshProto {
  matId: number;
  material: THREE.MeshStandardMaterial;
  lod0Geometry: THREE.BufferGeometry;
  lod1Geometry: THREE.BufferGeometry;
  lod0Triangles: number;
  lod1Triangles: number;
}

interface IMasterFloraDriver {
  key: FloraKey;
  submeshProtos: IFloraSubmeshProto[];
  lod0TotalTriangles: number;
  lod1TotalTriangles: number;
}

interface ITreeSectorLodEntry {
  key: string;
  cx: number;
  cz: number;
  rootGroup: THREE.Group;
  lod0Group: THREE.Group;
  lod1Group: THREE.Group;
  activeLod: 0 | 1;
}

const treeInstanceRegistry = new Map<number, ITreeInstanceHandle>();
const pooledFloraTrees: IPooledFloraTree[] = [];
const masterFloraDrivers = new Map<FloraKey, IMasterFloraDriver>();
const treeSectorLodEntries: ITreeSectorLodEntry[] = [];
const undergrowthSectorLodEntries: ITreeSectorLodEntry[] = [];
const gpuFloraWindMaterials: THREE.MeshStandardMaterial[] = [];
let currentWeatherPlantAnimationState: PlantWeatherAnimationState = 'idle';
let currentGpuFloraWindStrength = 0.55;
let activeSoftwareGlMode = false;

const _zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
const _tempDummy = new THREE.Object3D();

/**
 * Pure, deterministic mapping from the current world weather state to the
 * wind animation state used across `plants/*_Complete.ts`.
 */
export function resolvePlantAnimationStateForWeather(
  weather?: Pick<IWeatherStateSnapshot, 'weatherKind' | 'windStrength'> | null
): PlantWeatherAnimationState {
  if (!weather) return 'idle';
  const wind = weather.windStrength ?? 0.35;
  switch (weather.weatherKind) {
    case 'lightning_storm':
      return wind >= 0.72 ? 'flee' : 'roar';
    case 'wind_sand':
      return wind >= 0.78 ? 'roar' : 'run';
    case 'mountain_snow':
      return 'lie';
    case 'regional_rain':
      return wind >= 0.68 ? 'trot' : 'morph_wind';
    case 'dense_fog':
      return wind < 0.36 ? 'sit' : 'idle';
    case 'clear_clouds':
    default:
      if (wind < 0.22) return 'sit';
      if (wind < 0.42) return 'idle';
      if (wind < 0.64) return 'walk';
      if (wind < 0.82) return 'morph_wind';
      return 'run';
  }
}

/**
 * Computes the effective scalar wind strength (`uFloraWindStrength`) for a resolved weather state.
 */
export function computeFloraWindStrength(
  state: PlantWeatherAnimationState,
  weather?: Pick<IWeatherStateSnapshot, 'windStrength'> | null
): number {
  const mappedState = state === 'morph_wind' ? 'trot' : state;
  const baseStrength =
    mappedState === 'calm' || mappedState === 'lie'
      ? 0.15
      : mappedState === 'idle' || mappedState === 'sit'
        ? 0.55
        : mappedState === 'walk'
          ? 1.0
          : mappedState === 'trot'
            ? 1.45
            : 2.15;
  if (weather && typeof weather.windStrength === 'number') {
    return baseStrength * (0.75 + weather.windStrength * 0.55);
  }
  return baseStrength;
}

/**
 * Applies a resolved `PlantWeatherAnimationState` and optional continuous windStrength
 * to a pooled CPU `FloraModel` instance without clobbering active chop/hit/felling states.
 */
function applyWeatherWindToFloraModel(
  model: FloraModel,
  state: PlantWeatherAnimationState,
  weather?: Pick<IWeatherStateSnapshot, 'windStrength'> | null
): void {
  const mappedState = state === 'morph_wind' ? 'trot' : state;
  if (model.chopState === 'standing') {
    model.setWindFromState(mappedState);
  }
  model.windStrength = computeFloraWindStrength(state, weather);
}

/**
 * Returns the currently active weather-driven animation state applied to world plants.
 */
export function getActiveWeatherPlantAnimationState(): PlantWeatherAnimationState {
  return currentWeatherPlantAnimationState;
}

/**
 * Returns the list of registered master `FloraKey` drivers currently active in the world.
 */
export function getRegisteredFloraSpeciesKeys(): FloraKey[] {
  return Array.from(masterFloraDrivers.keys());
}

/**
 * Returns diagnostic statistics for the GPU wind shader and automatic LOD0/LOD1 geometries.
 */
export function getFloraLodAndShaderStats(): {
  gpuWindMaterialCount: number;
  currentWindStrength: number;
  speciesTriangleCounts: Record<string, { lod0: number; lod1: number }>;
  sectorLodStates: Array<{ key: string; cx: number; cz: number; activeLod: 0 | 1 }>;
} {
  const speciesTriangleCounts: Record<string, { lod0: number; lod1: number }> = {};
  for (const [k, drv] of masterFloraDrivers.entries()) {
    speciesTriangleCounts[k] = {
      lod0: drv.lod0TotalTriangles,
      lod1: drv.lod1TotalTriangles,
    };
  }
  return {
    gpuWindMaterialCount: gpuFloraWindMaterials.length,
    currentWindStrength: currentGpuFloraWindStrength,
    speciesTriangleCounts,
    sectorLodStates: treeSectorLodEntries.map((s) => ({
      key: s.key,
      cx: s.cx,
      cz: s.cz,
      activeLod: s.activeLod,
    })),
  };
}

/**
 * Safely creates a Three.js texture from a base64 data URI in both browser and headless test environments.
 */
function createPlantTexture(
  dataUri: string,
  disposableTextures: THREE.Texture[]
): THREE.Texture {
  const tex = new THREE.Texture();
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.onload = () => {
      tex.image = img;
      tex.needsUpdate = true;
    };
    img.src = dataUri;
  }
  disposableTextures.push(tex);
  return tex;
}

/**
 * Attaches the custom `FloraModel` quadratic trunk bend + 3D per-vertex foliage flutter
 * directly to a `MeshStandardMaterial` via `onBeforeCompile`, with per-instance spatial
 * wind phase (`instanceMatrix[3].xz`) so standing vegetation animates 100% on the GPU
 * with zero CPU vertex loops and zero buffer uploads per frame.
 */
function attachFloraGpuWindShader(
  mat: THREE.MeshStandardMaterial,
  isFoliage: boolean,
  invMaxHeight: number,
  swayMaterials: THREE.MeshStandardMaterial[]
): void {
  const uTime = { value: 0 };
  const uWindScale = { value: 1.0 };
  const uFloraWindStrength = { value: currentGpuFloraWindStrength };
  const uFloraInvHeight = { value: invMaxHeight };

  mat.userData.uTime = uTime;
  mat.userData.uWindScale = uWindScale;
  mat.userData.uFloraWindStrength = uFloraWindStrength;
  mat.userData.uFloraInvHeight = uFloraInvHeight;
  mat.customProgramCacheKey = () => (isFoliage ? 'flora_gpu_wind_foliage' : 'flora_gpu_wind_bark');

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uFloraWindStrength = uFloraWindStrength;
    shader.uniforms.uFloraInvHeight = uFloraInvHeight;

    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uFloraWindStrength;
      uniform float uFloraInvHeight;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float floraInstPhase = 0.0;
        #ifdef USE_INSTANCING
          floraInstPhase = instanceMatrix[3].x * 0.17 + instanceMatrix[3].z * 0.23;
        #endif
        float floraT = uTime + floraInstPhase;
        float floraW = uFloraWindStrength;
        float floraHNorm = max(0.0, transformed.y * uFloraInvHeight);
        float floraBend = floraHNorm * floraHNorm;
        float floraSwayX = (sin(floraT * 1.45) * 0.055 + sin(floraT * 3.1) * 0.022) * floraW;
        float floraSwayZ = (cos(floraT * 1.15) * 0.042 + sin(floraT * 2.6) * 0.018) * floraW;
        transformed.x += floraSwayX * transformed.y * floraBend;
        transformed.z += floraSwayZ * transformed.y * floraBend;
        ${
          isFoliage
            ? `
        if (floraW > 0.01) {
          float floraPhase = transformed.x * 3.2 + transformed.z * 3.2 + transformed.y * 2.1 + floraInstPhase * 1.3;
          float floraAmp = floraW * min(1.0, floraHNorm + 0.25);
          transformed.x += sin(floraT * 4.8 + floraPhase) * 0.024 * floraAmp;
          transformed.z += cos(floraT * 4.2 + floraPhase) * 0.020 * floraAmp;
          transformed.y += sin(floraT * 5.4 + floraPhase * 1.3) * 0.012 * floraW * floraHNorm;
        }
        `
            : ''
        }
        `
      );
  };

  swayMaterials.push(mat);
  gpuFloraWindMaterials.push(mat);
}

/**
 * Builds static `BufferGeometry` directly from an unpacked High-Quality or Low-Quality (LOD) `FloraSubmeshData`
 * (welding the pre-sliced `0.318..0.322` cut seam on standing tree bark submeshes to `0.32` so standing trees have zero visible line).
 */
function buildStaticFloraSubmeshGeometry(
  sub: FloraSubmeshData,
  isTree: boolean,
  disposableGeometries: THREE.BufferGeometry[]
): { geometry: THREE.BufferGeometry; triangleCount: number } {
  const srcPos = sub.positions;
  const srcNorm = sub.normals;
  const srcUv = sub.uvs;
  const srcIndices = sub.indices;
  const isBark = sub.matId === 0 || sub.matId === 3 || sub.matId === 4;
  const totalVerts = srcPos.length / 3;

  const positions = new Float32Array(srcPos.length);
  for (let v = 0; v < totalVerts; v++) {
    const v3 = v * 3;
    const ryRaw = srcPos[v3 + 1];
    // Weld the pre-sliced 0.318..0.322 cut gap on standing bark geometry
    const ry =
      isTree && isBark && Math.abs(ryRaw - TREE_CUT_Y) < 0.0035
        ? TREE_CUT_Y
        : ryRaw;
    positions[v3] = srcPos[v3];
    positions[v3 + 1] = ry;
    positions[v3 + 2] = srcPos[v3 + 2];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(srcNorm.slice(), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(srcUv.slice(), 2));
  geo.setIndex(new THREE.BufferAttribute(srcIndices.slice(), 1));
  geo.computeBoundingSphere();
  disposableGeometries.push(geo);

  return {
    geometry: geo,
    triangleCount: Math.floor(srcIndices.length / 3),
  };
}

/**
 * Builds two sets of materials from the shared `0..7` plant textures:
 * 1. `gpuInstancedMaterials`: Equipped with `attachFloraGpuWindShader` for zero-CPU standing `InstancedMesh`es.
 * 2. `cpuPoolMaterials`: Plain `MeshStandardMaterial`s for the pooled `FloraModel` rigs used during axe hits and felling.
 */
export function buildSharedFloraMaterials(
  disposableTextures: THREE.Texture[],
  disposableMaterials: THREE.Material[],
  swayMaterials: THREE.MeshStandardMaterial[] = []
): {
  gpuInstancedMaterials: Record<number, THREE.MeshStandardMaterial>;
  cpuPoolMaterials: Record<number, THREE.Material>;
} {
  const tex0 = createPlantTexture(ANIMTREE_TEXTURES[0], disposableTextures);
  const tex1 = createPlantTexture(ANIMTREE_TEXTURES[1], disposableTextures);
  const tex2 = createPlantTexture(ANIMTREE_TEXTURES[2], disposableTextures);
  const tex3 = createPlantTexture(PINETREE_TEXTURES[3], disposableTextures);
  const tex4 = createPlantTexture(OAKGREEN_TEXTURES[4], disposableTextures);
  const tex5 = createPlantTexture(PINETREE_TEXTURES[5], disposableTextures);
  const tex6 = createPlantTexture(FORESTBUSH_TEXTURES[6], disposableTextures);

  const makeMatPair = (
    tex: THREE.Texture,
    isFoliage: boolean,
    invMaxHeight: number
  ): { gpu: THREE.MeshStandardMaterial; cpu: THREE.MeshStandardMaterial } => {
    const params: THREE.MeshStandardMaterialParameters = isFoliage
      ? {
          map: tex,
          alphaTest: 0.35,
          roughness: 0.8,
          metalness: 0.02,
          side: THREE.DoubleSide,
        }
      : {
          map: tex,
          roughness: 0.86,
          metalness: 0.02,
        };
    const gpu = new THREE.MeshStandardMaterial(params);
    const cpu = new THREE.MeshStandardMaterial(params);
    attachFloraGpuWindShader(gpu, isFoliage, invMaxHeight, swayMaterials);
    disposableMaterials.push(gpu, cpu);
    return { gpu, cpu };
  };

  const p0 = makeMatPair(tex0, false, 1 / 3.5);
  const p1 = makeMatPair(tex1, true, 1 / 3.5);
  const p2 = makeMatPair(tex2, true, 1 / 3.5);
  const p3 = makeMatPair(tex3, false, 1 / 4.0);
  const p4 = makeMatPair(tex4, false, 1 / 3.5);
  const p5 = makeMatPair(tex5, true, 1 / 3.7);
  const p6 = makeMatPair(tex6, true, 1 / 1.15);

  const mat7 = createWoodCutRingMaterial();
  if (mat7.map) {
    disposableTextures.push(mat7.map);
  }
  disposableMaterials.push(mat7);

  return {
    gpuInstancedMaterials: {
      0: p0.gpu,
      1: p1.gpu,
      2: p2.gpu,
      3: p3.gpu,
      4: p4.gpu,
      5: p5.gpu,
      6: p6.gpu,
      7: mat7,
    },
    cpuPoolMaterials: {
      0: p0.cpu,
      1: p1.cpu,
      2: p2.cpu,
      3: p3.cpu,
      4: p4.cpu,
      5: p5.cpu,
      6: p6.cpu,
      7: mat7,
    },
  };
}
// #endregion

// ======================== DYNAMIC TREE FELLING, GPU WIND & SECTOR LOD SYNC ======================== \\
// #region Dynamic Tree Felling, GPU Wind & Sector LOD Sync
function acquirePooledFloraTree(
  floraKey: TreeFloraKey,
  obstacleIndex: number
): IPooledFloraTree | null {
  for (let i = 0; i < pooledFloraTrees.length; i++) {
    const p = pooledFloraTrees[i];
    if (p.floraKey === floraKey && p.assignedObstacleIndex === obstacleIndex) {
      return p;
    }
  }
  for (let i = 0; i < pooledFloraTrees.length; i++) {
    const p = pooledFloraTrees[i];
    if (p.floraKey === floraKey && p.assignedObstacleIndex === null) {
      p.assignedObstacleIndex = obstacleIndex;
      p.lastChopHits = 0;
      p.instance.resetTree();
      applyWeatherWindToFloraModel(p.instance, currentWeatherPlantAnimationState);
      p.instance.update(0);
      p.instance.object.visible = true;
      return p;
    }
  }
  return null;
}

function hideStaticTreeInstance(handle: ITreeInstanceHandle): void {
  if (handle.isHiddenInInstancedMesh) return;
  handle.isHiddenInInstancedMesh = true;
  for (let m = 0; m < handle.meshes.length; m++) {
    handle.meshes[m].setMatrixAt(handle.instanceIndex, _zeroMatrix);
    handle.meshes[m].instanceMatrix.needsUpdate = true;
  }
  handle.shadowMesh.setMatrixAt(handle.instanceIndex, _zeroMatrix);
  handle.shadowMesh.instanceMatrix.needsUpdate = true;
}

function applyFallbackMatrixTilt(handle: ITreeInstanceHandle, rec: ITreeFellingRecord): void {
  const shake =
    rec.shakeTimer > 0 ? Math.sin(rec.shakeTimer * 44.0) * 0.045 : 0;
  const tilt = rec.fallAngleRad + shake;
  _tempDummy.position.set(rec.x, rec.y - 0.08, rec.z);
  _tempDummy.rotation.order = 'YXZ';
  _tempDummy.rotation.set(tilt, rec.fallYaw, 0);
  _tempDummy.scale.setScalar(rec.scale * handle.unitScale);
  _tempDummy.updateMatrix();
  for (let m = 0; m < handle.meshes.length; m++) {
    handle.meshes[m].setMatrixAt(handle.instanceIndex, _tempDummy.matrix);
    handle.meshes[m].instanceMatrix.needsUpdate = true;
  }
}

/**
 * Updates:
 * 1. The GPU vertex-shader wind uniform (`uFloraWindStrength`) across all standing flora materials (0 CPU vertex loops).
 * 2. Sector-level LOD0 / LOD1 visibility based on camera/player distance (`< 95m` = LOD0 full detail, `>= 103m` = LOD1 low-poly).
 * 3. Active chopped/falling/fallen trees using their pooled CPU `FloraModel` rigs (`hitTree()` & `fellTree()`).
 */
export function updateChoppableTreesVisuals(
  dt: number,
  weather?: IWeatherStateSnapshot,
  playerX = 0,
  playerZ = 0
): void {
  // 1. Update GPU wind shader uniform (standing trees & undergrowth animate 100% in GPU vertex shader)
  const targetWeatherAnimState = resolvePlantAnimationStateForWeather(weather);
  currentWeatherPlantAnimationState = targetWeatherAnimState;
  currentGpuFloraWindStrength = computeFloraWindStrength(targetWeatherAnimState, weather);

  for (let i = 0; i < gpuFloraWindMaterials.length; i++) {
    const mat = gpuFloraWindMaterials[i];
    if (mat.userData.uFloraWindStrength) {
      mat.userData.uFloraWindStrength.value = currentGpuFloraWindStrength;
    }
  }

  // 2. Switch tree and undergrowth sectors between LOD0 (near, High-Quality model) and LOD1 (far, embedded Low-Quality model) with hysteresis
  const nearDist = activeSoftwareGlMode ? TREE_LOD_NEAR_DIST_SW : TREE_LOD_NEAR_DIST;
  const farDist = activeSoftwareGlMode ? TREE_LOD_FAR_DIST_SW : TREE_LOD_FAR_DIST;
  const nearDistSq = nearDist * nearDist;
  const farDistSq = farDist * farDist;

  for (let i = 0; i < treeSectorLodEntries.length; i++) {
    const sec = treeSectorLodEntries[i];
    if (!sec.rootGroup.visible) continue;
    const dx = playerX - sec.cx;
    const dz = playerZ - sec.cz;
    const distSq = dx * dx + dz * dz;
    if (sec.activeLod === 0 && distSq >= farDistSq) {
      sec.activeLod = 1;
      sec.lod0Group.visible = false;
      sec.lod1Group.visible = true;
    } else if (sec.activeLod === 1 && distSq <= nearDistSq) {
      sec.activeLod = 0;
      sec.lod0Group.visible = true;
      sec.lod1Group.visible = false;
    }
  }

  const uNearDist = activeSoftwareGlMode
    ? UNDERGROWTH_LOD_NEAR_DIST_SW
    : UNDERGROWTH_LOD_NEAR_DIST;
  const uFarDist = activeSoftwareGlMode
    ? UNDERGROWTH_LOD_FAR_DIST_SW
    : UNDERGROWTH_LOD_FAR_DIST;
  const uNearDistSq = uNearDist * uNearDist;
  const uFarDistSq = uFarDist * uFarDist;

  for (let i = 0; i < undergrowthSectorLodEntries.length; i++) {
    const sec = undergrowthSectorLodEntries[i];
    if (!sec.rootGroup.visible) continue;
    const dx = playerX - sec.cx;
    const dz = playerZ - sec.cz;
    const distSq = dx * dx + dz * dz;
    if (sec.activeLod === 0 && distSq >= uFarDistSq) {
      sec.activeLod = 1;
      sec.lod0Group.visible = false;
      sec.lod1Group.visible = true;
    } else if (sec.activeLod === 1 && distSq <= uNearDistSq) {
      sec.activeLod = 0;
      sec.lod0Group.visible = true;
      sec.lod1Group.visible = false;
    }
  }

  // 3. Sync chopped, falling, fallen, and harvested trees (CPU FloraModel runs ONLY on the tree being chopped)
  const activeRecords = getActiveTreeFellingRecords();
  const activeIndices = new Set<number>();

  for (const rec of activeRecords.values()) {
    const handle = treeInstanceRegistry.get(rec.obstacleIndex);
    if (!handle) continue;

    if (rec.status === 'harvested') {
      hideStaticTreeInstance(handle);
      continue;
    }

    if (
      rec.status === 'chopping' ||
      rec.status === 'falling' ||
      rec.status === 'fallen'
    ) {
      activeIndices.add(rec.obstacleIndex);
      if (handle.floraKey) {
        const pooled = acquirePooledFloraTree(handle.floraKey, rec.obstacleIndex);
        if (pooled) {
          hideStaticTreeInstance(handle);
          applyWeatherWindToFloraModel(pooled.instance, targetWeatherAnimState, weather);

          pooled.instance.object.visible = true;
          pooled.instance.object.position.set(rec.x, rec.y - 0.08, rec.z);
          // FloraModel's custom vertex felling rotates the upper trunk toward local +X.
          // Rotating by (rec.fallYaw - Math.PI * 0.5) around Y aligns local +X with world (sin(fallYaw), cos(fallYaw)).
          pooled.instance.object.rotation.order = 'YXZ';
          pooled.instance.object.rotation.set(0, rec.fallYaw - Math.PI * 0.5, 0);
          pooled.instance.object.scale.setScalar(rec.scale * handle.unitScale);

          if (rec.status === 'falling' || rec.status === 'fallen') {
            if (
              pooled.instance.chopState !== 'falling' &&
              pooled.instance.chopState !== 'fallen'
            ) {
              pooled.instance.fellTree();
            }
          } else if (rec.chops !== pooled.lastChopHits) {
            pooled.lastChopHits = rec.chops;
            pooled.instance.hitTree();
          }

          pooled.instance.update(dt);
          continue;
        }
      }

      // Fallback for palm/acacia or if flora pool is full: tilt instance matrix directly
      applyFallbackMatrixTilt(handle, rec);
    }
  }

  // Release any pooled rigs whose trees have been harvested or reset
  for (let i = 0; i < pooledFloraTrees.length; i++) {
    const p = pooledFloraTrees[i];
    if (
      p.assignedObstacleIndex !== null &&
      !activeIndices.has(p.assignedObstacleIndex)
    ) {
      p.assignedObstacleIndex = null;
      p.instance.object.visible = false;
      p.instance.resetTree();
    }
  }
}
// #endregion

// ======================== BUILD VEGETATION MODELS ======================== \\
// #region Build Vegetation Models
/**
 * Summary: Constructs spatially sectorized, frustum-culled instanced forest trees (with LOD0/LOD1),
 *          bushes, ferns, waterside cornflowers & whiteflowers, boulders, palms, acacias, and swaying ground grass.
 * @param ctx Shared build context (scene, textures, disposal lists).
 */
export function buildVegetationModels(ctx: IWorldModelBuildContext): void {
  const {
    scene,
    textures,
    obstacles,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    disposableTextures,
    swayMaterials,
    distanceCulledObjects,
  } = ctx;

  activeSoftwareGlMode = isSoftwareGl;
  treeInstanceRegistry.clear();
  pooledFloraTrees.length = 0;
  masterFloraDrivers.clear();
  treeSectorLodEntries.length = 0;
  undergrowthSectorLodEntries.length = 0;
  gpuFloraWindMaterials.length = 0;

  const treeMaxDist = isSoftwareGl ? TREE_SECTOR_MAX_DIST_SW : TREE_SECTOR_MAX_DIST;
  const undergrowthMaxDist = isSoftwareGl
    ? UNDERGROWTH_SECTOR_MAX_DIST_SW
    : UNDERGROWTH_SECTOR_MAX_DIST;

  // Separate spatial sector registries for tall trees (with LOD0 + LOD1 sub-groups) vs undergrowth (also with LOD0 + LOD1 sub-groups)
  const treeSectorMap = new Map<string, ITreeSectorLodEntry>();
  const getTreeSectorLodEntry = (x: number, z: number): ITreeSectorLodEntry => {
    const gx = Math.round(x / VEG_SECTOR_SIZE);
    const gz = Math.round(z / VEG_SECTOR_SIZE);
    const key = `${gx},${gz}`;
    let entry = treeSectorMap.get(key);
    if (!entry) {
      const rootGroup = new THREE.Group();
      const lod0Group = new THREE.Group();
      const lod1Group = new THREE.Group();
      lod0Group.visible = true;
      lod1Group.visible = false;
      rootGroup.add(lod0Group, lod1Group);
      scene.add(rootGroup);

      const cx = gx * VEG_SECTOR_SIZE;
      const cz = gz * VEG_SECTOR_SIZE;
      entry = {
        key,
        cx,
        cz,
        rootGroup,
        lod0Group,
        lod1Group,
        activeLod: 0,
      };
      treeSectorMap.set(key, entry);
      treeSectorLodEntries.push(entry);
      distanceCulledObjects.push({
        obj: rootGroup,
        cx,
        cz,
        radius: VEG_SECTOR_RADIUS,
        maxDist: treeMaxDist,
      });
    }
    return entry;
  };

  const getTreeSectorRootGroup = (x: number, z: number): THREE.Group =>
    getTreeSectorLodEntry(x, z).rootGroup;

  const undergrowthSectorMap = new Map<string, ITreeSectorLodEntry>();
  const getUndergrowthSectorLodEntry = (x: number, z: number): ITreeSectorLodEntry => {
    const gx = Math.round(x / VEG_SECTOR_SIZE);
    const gz = Math.round(z / VEG_SECTOR_SIZE);
    const key = `${gx},${gz}`;
    let entry = undergrowthSectorMap.get(key);
    if (!entry) {
      const rootGroup = new THREE.Group();
      const lod0Group = new THREE.Group();
      const lod1Group = new THREE.Group();
      lod0Group.visible = true;
      lod1Group.visible = false;
      rootGroup.add(lod0Group, lod1Group);
      scene.add(rootGroup);

      const cx = gx * VEG_SECTOR_SIZE;
      const cz = gz * VEG_SECTOR_SIZE;
      entry = {
        key,
        cx,
        cz,
        rootGroup,
        lod0Group,
        lod1Group,
        activeLod: 0,
      };
      undergrowthSectorMap.set(key, entry);
      undergrowthSectorLodEntries.push(entry);
      distanceCulledObjects.push({
        obj: rootGroup,
        cx,
        cz,
        radius: VEG_SECTOR_RADIUS,
        maxDist: undergrowthMaxDist,
      });
    }
    return entry;
  };

  const getUndergrowthSectorGroup = (x: number, z: number): THREE.Group =>
    getUndergrowthSectorLodEntry(x, z).rootGroup;

  const groupBySector = <T extends { x: number; z: number }, G>(
    items: readonly T[],
    getGroupFn: (x: number, z: number) => G
  ): Map<G, T[]> => {
    const map = new Map<G, T[]>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const grp = getGroupFn(item.x, item.z);
      let list = map.get(grp);
      if (!list) {
        list = [];
        map.set(grp, list);
      }
      list.push(item);
    }
    return map;
  };

  const finalizeInstancedMesh = (
    im: THREE.InstancedMesh,
    count: number,
    castShadow: boolean,
    receiveShadow: boolean,
    parent: THREE.Object3D
  ): void => {
    im.count = count;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    im.frustumCulled = true;
    im.castShadow = castShadow && !isSoftwareGl;
    im.receiveShadow = receiveShadow && !isSoftwareGl;
    parent.add(im);
  };

  interface IIndexedObstacle {
    obstacleIndex: number;
    x: number;
    z: number;
    radius: number;
    scale: number;
    seed: number;
    kind: 'pine' | 'oak' | 'birch' | 'palm' | 'acacia' | 'boulder';
    floraKey?: TreeFloraKey;
  }

  const pines: IIndexedObstacle[] = [];
  const oaks: IIndexedObstacle[] = [];
  const birches: IIndexedObstacle[] = [];
  const palms: IIndexedObstacle[] = [];
  const acacias: IIndexedObstacle[] = [];
  const boulders: IIndexedObstacle[] = [];

  for (let idx = 0; idx < obstacles.length; idx++) {
    const o = obstacles[idx];
    if (o.kind === 'pillar') continue;
    const entry: IIndexedObstacle = {
      obstacleIndex: idx,
      x: o.x,
      z: o.z,
      radius: o.radius,
      scale: o.scale,
      seed: o.seed,
      kind: o.kind,
    };
    if (o.kind === 'pine') {
      entry.floraKey = o.treeVariant ?? 'pinetree';
      pines.push(entry);
    } else if (o.kind === 'oak') {
      // Distribute broadleaf oaks across all 4 custom broadleaf tree models
      entry.floraKey =
        o.treeVariant ?? OAK_FLORA_VARIANTS[idx % OAK_FLORA_VARIANTS.length];
      oaks.push(entry);
    } else if (o.kind === 'birch') {
      entry.floraKey = o.treeVariant ?? 'oakyellow';
      birches.push(entry);
    } else if (o.kind === 'palm') {
      palms.push(entry);
    } else if (o.kind === 'acacia') {
      acacias.push(entry);
    } else if (o.kind === 'boulder') {
      boulders.push(entry);
    }
  }

  // Broad canopy shade disc on the forest floor beneath every tall tree
  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  disposableMaterials.push(contactShadowMat);

  const shadowDiscGeo = new THREE.PlaneGeometry(5.8, 5.8);
  shadowDiscGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(shadowDiscGeo);

  // --- 1. UNPACK ALL 10 PLANT BUNDLES & BUILD STATIC GPU GEOMETRIES (LOD0 + LOD1) ---
  const { gpuInstancedMaterials, cpuPoolMaterials } = buildSharedFloraMaterials(
    disposableTextures,
    disposableMaterials,
    swayMaterials
  );
  const unpackedSubmeshesByKey = new Map<FloraKey, FloraSubmeshData[]>();

  const allFloraKeys: FloraKey[] = [
    'pinetree',
    'oakgreen',
    'oakyellow',
    'animtree',
    'animtree_wide',
    'animtree_compact',
    'forestbush',
    'forestfern',
    'cornflower',
    'whiteflower',
  ];

  for (let k = 0; k < allFloraKeys.length; k++) {
    const key = allFloraKeys[k];
    const spec = FLORA_SPECS[key];
    const isTree = spec.category !== 'vegetation';
    const lod0Submeshes = unpackFloraBundle(spec.packB64);
    const lod1Submeshes = unpackFloraBundle(spec.lodPackB64);
    unpackedSubmeshesByKey.set(key, lod0Submeshes);

    const submeshProtos: IFloraSubmeshProto[] = [];
    let lod0TotalTriangles = 0;
    let lod1TotalTriangles = 0;

    for (let m = 0; m < lod0Submeshes.length; m++) {
      const sub0 = lod0Submeshes[m];
      if (sub0.matId === 7) continue; // Wood-cut ring is only needed on chopped CPU pool instances
      const sub1 =
        lod1Submeshes.find((s) => s.matId === sub0.matId) ??
        lod1Submeshes[m] ??
        sub0;

      const lod0 = buildStaticFloraSubmeshGeometry(
        sub0,
        isTree,
        disposableGeometries
      );
      const lod1 = buildStaticFloraSubmeshGeometry(
        sub1,
        isTree,
        disposableGeometries
      );

      lod0TotalTriangles += lod0.triangleCount;
      lod1TotalTriangles += lod1.triangleCount;

      submeshProtos.push({
        matId: sub0.matId,
        material: gpuInstancedMaterials[sub0.matId],
        lod0Geometry: lod0.geometry,
        lod1Geometry: lod1.geometry,
        lod0Triangles: lod0.triangleCount,
        lod1Triangles: lod1.triangleCount,
      });
    }

    masterFloraDrivers.set(key, {
      key,
      submeshProtos,
      lod0TotalTriangles,
      lod1TotalTriangles,
    });
  }

  // Create pool of animated CPU FloraModel trees exclusively for active chopping (hitTree) & felling (fellTree + wood-cut ring)
  const treeFloraKeys: TreeFloraKey[] = [
    'pinetree',
    'oakgreen',
    'oakyellow',
    'animtree',
    'animtree_wide',
    'animtree_compact',
  ];
  const POOL_PER_TREE_VARIANT = 2;
  for (let k = 0; k < treeFloraKeys.length; k++) {
    const floraKey = treeFloraKeys[k];
    const spec = FLORA_SPECS[floraKey];
    const submeshes = unpackedSubmeshesByKey.get(floraKey)!;

    for (let i = 0; i < POOL_PER_TREE_VARIANT; i++) {
      const instance = new FloraModel(
        `${floraKey}_pool_${i}`,
        submeshes,
        cpuPoolMaterials,
        spec.baseScale
      );
      for (let m = 0; m < instance.meshes.length; m++) {
        instance.meshes[m].castShadow = false;
        instance.meshes[m].receiveShadow = !isSoftwareGl;
        disposableGeometries.push(instance.meshes[m].geometry);
      }
      instance.object.visible = false;
      scene.add(instance.object);
      pooledFloraTrees.push({
        floraKey,
        instance,
        assignedObstacleIndex: null,
        lastChopHits: 0,
      });
    }
  }

  const cullDummy = new THREE.Object3D();
  const shadowDummy = new THREE.Object3D();
  const cullTint = new THREE.Color();

  /**
   * Helper to build multi-submesh InstancedMeshes for both LOD0 (near) and LOD1 (far)
   * inside a single spatial tree sector.
   */
  const buildSectorTreeBatch = (
    sectorEntry: ITreeSectorLodEntry,
    sectorTrees: IIndexedObstacle[],
    floraKey: TreeFloraKey,
    shadowScaleFactor: number,
    tintHueBase: number,
    tintHueSpread: number,
    tintSat: number
  ): void => {
    const n = sectorTrees.length;
    if (n === 0) return;
    const driver = masterFloraDrivers.get(floraKey)!;
    const spec = FLORA_SPECS[floraKey];
    const unitScale = spec.baseScale;

    const lod0InstancedMeshes: THREE.InstancedMesh[] = [];
    const lod1InstancedMeshes: THREE.InstancedMesh[] = [];
    for (let m = 0; m < driver.submeshProtos.length; m++) {
      const proto = driver.submeshProtos[m];
      lod0InstancedMeshes.push(
        new THREE.InstancedMesh(proto.lod0Geometry, proto.material, n)
      );
      lod1InstancedMeshes.push(
        new THREE.InstancedMesh(proto.lod1Geometry, proto.material, n)
      );
    }
    const mShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);

    for (let i = 0; i < n; i++) {
      const t = sectorTrees[i];
      const gy = groundHeightAt(t.x, t.z);
      cullDummy.position.set(t.x, gy - 0.08, t.z);
      cullDummy.rotation.set(0, t.seed * Math.PI * 2, 0);
      cullDummy.scale.setScalar(t.scale * unitScale);
      cullDummy.updateMatrix();

      cullTint.setHSL(
        tintHueBase + (t.seed - 0.5) * tintHueSpread,
        tintSat,
        0.92 + (t.seed - 0.5) * 0.12
      );

      for (let m = 0; m < lod0InstancedMeshes.length; m++) {
        lod0InstancedMeshes[m].setMatrixAt(i, cullDummy.matrix);
        lod0InstancedMeshes[m].setColorAt(i, cullTint);
        lod1InstancedMeshes[m].setMatrixAt(i, cullDummy.matrix);
        lod1InstancedMeshes[m].setColorAt(i, cullTint);
      }

      shadowDummy.position.set(t.x, gy + 0.03, t.z);
      shadowDummy.rotation.set(0, 0, 0);
      shadowDummy.scale.setScalar(t.scale * shadowScaleFactor);
      shadowDummy.updateMatrix();
      mShadow.setMatrixAt(i, shadowDummy.matrix);

      treeInstanceRegistry.set(t.obstacleIndex, {
        obstacleIndex: t.obstacleIndex,
        kind: t.kind as 'pine' | 'oak' | 'birch',
        floraKey,
        meshes: [...lod0InstancedMeshes, ...lod1InstancedMeshes],
        shadowMesh: mShadow,
        instanceIndex: i,
        baseMatrix: cullDummy.matrix.clone(),
        baseShadowMatrix: shadowDummy.matrix.clone(),
        unitScale,
        isHiddenInInstancedMesh: false,
      });
    }

    for (let m = 0; m < lod0InstancedMeshes.length; m++) {
      finalizeInstancedMesh(lod0InstancedMeshes[m], n, false, true, sectorEntry.lod0Group);
      finalizeInstancedMesh(lod1InstancedMeshes[m], n, false, false, sectorEntry.lod1Group);
    }
    finalizeInstancedMesh(mShadow, n, false, false, sectorEntry.lod0Group);
  };

  // --- A. TALL FOREST PINES (Multi-submesh LOD0/LOD1 InstancedMeshes from PineTree_Complete) ---
  for (const [sectorEntry, sectorPines] of groupBySector(pines, getTreeSectorLodEntry)) {
    buildSectorTreeBatch(sectorEntry, sectorPines, 'pinetree', 1.35, 0.28, 0.03, 0.12);
  }

  // --- B. BROADLEAF FOREST TREES (OakGreen, AnimTree, AnimTreeWide, AnimTreeCompact with LOD0/LOD1) ---
  for (const [sectorEntry, sectorOaks] of groupBySector(oaks, getTreeSectorLodEntry)) {
    for (let v = 0; v < OAK_FLORA_VARIANTS.length; v++) {
      const variantKey = OAK_FLORA_VARIANTS[v];
      const variantTrees = sectorOaks.filter((o) => o.floraKey === variantKey);
      buildSectorTreeBatch(sectorEntry, variantTrees, variantKey, 1.55, 0.25, 0.04, 0.14);
    }
  }

  // --- C. GOLDEN AUTUMN TREES (Multi-submesh LOD0/LOD1 InstancedMeshes from OakYellow_Complete) ---
  for (const [sectorEntry, sectorBirches] of groupBySector(birches, getTreeSectorLodEntry)) {
    buildSectorTreeBatch(sectorEntry, sectorBirches, 'oakyellow', 1.35, 0.1, 0.04, 0.18);
  }

  // --- D. BOULDER 3-PART GEOMETRIES ---
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.barkAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.07,
    roughness: 0.88,
    metalness: 0.03,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.09,
    roughness: 0.65,
    metalness: 0.06,
  });
  const mossCapMat = new THREE.MeshStandardMaterial({
    color: 0x4a7531,
    bumpMap: textures.terrainBump,
    bumpScale: 0.07,
    roughness: 0.92,
    metalness: 0.01,
  });
  disposableMaterials.push(barkMat, rockMat, mossCapMat);

  const boulderMainGeo = new THREE.DodecahedronGeometry(0.95, 1);
  perturbGeometryVertices(boulderMainGeo, 0.22, 1.6);
  boulderMainGeo.scale(1.15, 0.78, 1.05);
  boulderMainGeo.translate(0, 0.45, 0);

  const boulderSideGeo = new THREE.DodecahedronGeometry(0.62, 1);
  perturbGeometryVertices(boulderSideGeo, 0.2, 2.0);
  boulderSideGeo.scale(1.1, 0.7, 0.95);
  boulderSideGeo.translate(0.55, 0.28, 0.25);

  const boulderMossGeo = new THREE.SphereGeometry(
    0.76,
    10,
    8,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.45
  );
  perturbGeometryVertices(boulderMossGeo, 0.12, 2.5);
  boulderMossGeo.scale(1.12, 0.65, 1.0);
  boulderMossGeo.translate(0, 0.52, 0);

  disposableGeometries.push(boulderMainGeo, boulderSideGeo, boulderMossGeo);

  for (const [sectorGrp, sectorBoulders] of groupBySector(boulders, getTreeSectorRootGroup)) {
    const n = sectorBoulders.length;
    const bMain = new THREE.InstancedMesh(boulderMainGeo, rockMat, n);
    const bSide = new THREE.InstancedMesh(boulderSideGeo, rockMat, n);
    const bMoss = new THREE.InstancedMesh(boulderMossGeo, mossCapMat, n);
    const bShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);

    for (let i = 0; i < n; i++) {
      const b = sectorBoulders[i];
      const gy = groundHeightAt(b.x, b.z);
      cullDummy.position.set(b.x, gy - 0.08, b.z);
      cullDummy.rotation.set(0, b.seed * Math.PI * 2, 0);
      cullDummy.scale.setScalar(b.scale);
      cullDummy.updateMatrix();

      bMain.setMatrixAt(i, cullDummy.matrix);
      bSide.setMatrixAt(i, cullDummy.matrix);
      bMoss.setMatrixAt(i, cullDummy.matrix);

      cullDummy.position.set(b.x, gy + 0.025, b.z);
      cullDummy.rotation.set(0, 0, 0);
      cullDummy.scale.setScalar(b.scale * 0.55);
      cullDummy.updateMatrix();
      bShadow.setMatrixAt(i, cullDummy.matrix);
    }

    finalizeInstancedMesh(bMain, n, false, true, sectorGrp);
    finalizeInstancedMesh(bSide, n, false, true, sectorGrp);
    finalizeInstancedMesh(bMoss, n, false, true, sectorGrp);
    finalizeInstancedMesh(bShadow, n, false, false, sectorGrp);
  }

  // --- E. SOUTH-WEST DESERT DATE PALMS & SAVANNA UMBRELLA ACACIAS ---
  const palmCrownMat = new THREE.MeshStandardMaterial({
    color: 0x2e6f40,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.56,
  });
  const acaciaCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x6b7f32,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.62,
  });
  attachWindSwayShader(palmCrownMat, 0.022, 1.55, swayMaterials);
  attachWindSwayShader(acaciaCanopyMat, 0.015, 1.35, swayMaterials);
  disposableMaterials.push(palmCrownMat, acaciaCanopyMat);

  const instPalmTrunkGeo = new THREE.CylinderGeometry(0.18, 0.36, 9.2, 8);
  instPalmTrunkGeo.translate(0, 4.6, 0);
  const instPalmCrownGeo = new THREE.ConeGeometry(3.4, 2.2, 7);
  perturbGeometryVertices(instPalmCrownGeo, 0.22, 1.8);
  instPalmCrownGeo.scale(1.25, 0.55, 1.25);
  instPalmCrownGeo.translate(0, 9.1, 0);
  const instPalmLowerCrownGeo = new THREE.ConeGeometry(3.8, 1.8, 7);
  perturbGeometryVertices(instPalmLowerCrownGeo, 0.22, 2.1);
  instPalmLowerCrownGeo.scale(1.3, 0.45, 1.3);
  instPalmLowerCrownGeo.rotateY(0.45);
  instPalmLowerCrownGeo.translate(0, 8.4, 0);

  const instAcaciaTrunkGeo = new THREE.CylinderGeometry(0.22, 0.44, 6.4, 8);
  instAcaciaTrunkGeo.translate(0, 3.2, 0);
  const instAcaciaBranchLGeo = new THREE.CylinderGeometry(0.1, 0.18, 3.6, 6);
  instAcaciaBranchLGeo.rotateZ(0.62);
  instAcaciaBranchLGeo.translate(-1.1, 5.8, 0);
  const instAcaciaBranchRGeo = new THREE.CylinderGeometry(0.1, 0.18, 3.6, 6);
  instAcaciaBranchRGeo.rotateZ(-0.58);
  instAcaciaBranchRGeo.translate(1.1, 6.0, 0);
  const instAcaciaTier1Geo = new THREE.CylinderGeometry(4.2, 3.2, 1.1, 9);
  perturbGeometryVertices(instAcaciaTier1Geo, 0.16, 1.4);
  instAcaciaTier1Geo.translate(-0.8, 7.1, 0.2);
  const instAcaciaTier2Geo = new THREE.CylinderGeometry(4.6, 3.5, 1.15, 9);
  perturbGeometryVertices(instAcaciaTier2Geo, 0.16, 1.6);
  instAcaciaTier2Geo.translate(0.6, 7.8, -0.2);

  disposableGeometries.push(
    instPalmTrunkGeo,
    instPalmCrownGeo,
    instPalmLowerCrownGeo,
    instAcaciaTrunkGeo,
    instAcaciaBranchLGeo,
    instAcaciaBranchRGeo,
    instAcaciaTier1Geo,
    instAcaciaTier2Geo
  );

  for (const [sectorGrp, sectorPalms] of groupBySector(palms, getTreeSectorRootGroup)) {
    const n = sectorPalms.length;
    const pTrunkIM = new THREE.InstancedMesh(instPalmTrunkGeo, barkMat, n);
    const pCrown1IM = new THREE.InstancedMesh(instPalmCrownGeo, palmCrownMat, n);
    const pCrown2IM = new THREE.InstancedMesh(instPalmLowerCrownGeo, palmCrownMat, n);
    const pShadowIM = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);
    for (let i = 0; i < n; i++) {
      const p = sectorPalms[i];
      const gy = groundHeightAt(p.x, p.z);
      cullDummy.position.set(p.x, gy - 0.1, p.z);
      cullDummy.rotation.set(0, p.seed * Math.PI * 2, 0);
      cullDummy.scale.setScalar(p.scale);
      cullDummy.updateMatrix();
      pTrunkIM.setMatrixAt(i, cullDummy.matrix);
      pCrown1IM.setMatrixAt(i, cullDummy.matrix);
      pCrown2IM.setMatrixAt(i, cullDummy.matrix);

      shadowDummy.position.set(p.x, gy + 0.03, p.z);
      shadowDummy.rotation.set(0, 0, 0);
      shadowDummy.scale.setScalar(p.scale * 1.25);
      shadowDummy.updateMatrix();
      pShadowIM.setMatrixAt(i, shadowDummy.matrix);

      treeInstanceRegistry.set(p.obstacleIndex, {
        obstacleIndex: p.obstacleIndex,
        kind: 'palm',
        meshes: [pTrunkIM, pCrown1IM, pCrown2IM],
        shadowMesh: pShadowIM,
        instanceIndex: i,
        baseMatrix: cullDummy.matrix.clone(),
        baseShadowMatrix: shadowDummy.matrix.clone(),
        unitScale: 1.0,
        isHiddenInInstancedMesh: false,
      });
    }
    finalizeInstancedMesh(pTrunkIM, n, false, true, sectorGrp);
    finalizeInstancedMesh(pCrown1IM, n, false, true, sectorGrp);
    finalizeInstancedMesh(pCrown2IM, n, false, true, sectorGrp);
    finalizeInstancedMesh(pShadowIM, n, false, false, sectorGrp);
  }

  for (const [sectorGrp, sectorAcacias] of groupBySector(acacias, getTreeSectorRootGroup)) {
    const n = sectorAcacias.length;
    const acTrunkIM = new THREE.InstancedMesh(instAcaciaTrunkGeo, barkMat, n);
    const acBrLIM = new THREE.InstancedMesh(instAcaciaBranchLGeo, barkMat, n);
    const acBrRIM = new THREE.InstancedMesh(instAcaciaBranchRGeo, barkMat, n);
    const acTier1IM = new THREE.InstancedMesh(instAcaciaTier1Geo, acaciaCanopyMat, n);
    const acTier2IM = new THREE.InstancedMesh(instAcaciaTier2Geo, acaciaCanopyMat, n);
    const acShadowIM = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);
    for (let i = 0; i < n; i++) {
      const ac = sectorAcacias[i];
      const gy = groundHeightAt(ac.x, ac.z);
      cullDummy.position.set(ac.x, gy - 0.1, ac.z);
      cullDummy.rotation.set(0, ac.seed * Math.PI * 2, 0);
      cullDummy.scale.setScalar(ac.scale);
      cullDummy.updateMatrix();
      acTrunkIM.setMatrixAt(i, cullDummy.matrix);
      acBrLIM.setMatrixAt(i, cullDummy.matrix);
      acBrRIM.setMatrixAt(i, cullDummy.matrix);
      acTier1IM.setMatrixAt(i, cullDummy.matrix);
      acTier2IM.setMatrixAt(i, cullDummy.matrix);

      shadowDummy.position.set(ac.x, gy + 0.03, ac.z);
      shadowDummy.rotation.set(0, 0, 0);
      shadowDummy.scale.setScalar(ac.scale * 1.55);
      shadowDummy.updateMatrix();
      acShadowIM.setMatrixAt(i, shadowDummy.matrix);

      treeInstanceRegistry.set(ac.obstacleIndex, {
        obstacleIndex: ac.obstacleIndex,
        kind: 'acacia',
        meshes: [acTrunkIM, acBrLIM, acBrRIM, acTier1IM, acTier2IM],
        shadowMesh: acShadowIM,
        instanceIndex: i,
        baseMatrix: cullDummy.matrix.clone(),
        baseShadowMatrix: shadowDummy.matrix.clone(),
        unitScale: 1.0,
        isHiddenInInstancedMesh: false,
      });
    }
    finalizeInstancedMesh(acTrunkIM, n, false, true, sectorGrp);
    finalizeInstancedMesh(acBrLIM, n, false, true, sectorGrp);
    finalizeInstancedMesh(acBrRIM, n, false, true, sectorGrp);
    finalizeInstancedMesh(acTier1IM, n, false, true, sectorGrp);
    finalizeInstancedMesh(acTier2IM, n, false, true, sectorGrp);
    finalizeInstancedMesh(acShadowIM, n, false, false, sectorGrp);
  }

  // --- F. BOTANICAL UNDERGROWTH (ForestBush, ForestFern) & WILDFLOWERS (Cornflower, WhiteFlower) ---
  interface IFloraSample {
    x: number;
    z: number;
    matrix: THREE.Matrix4;
  }
  const bushSamples: IFloraSample[] = [];
  const fernSamples: IFloraSample[] = [];
  const cornflowerSamples: IFloraSample[] = [];
  const whiteflowerSamples: IFloraSample[] = [];
  const fDummy = new THREE.Object3D();

  // Place ForestBushes, ForestFerns, and woodland-edge WhiteFlowers near woodland trees
  const woodlandTrees = [...pines, ...oaks, ...birches];
  const bushStride = isSoftwareGl ? 4 : 3;
  for (let i = 0; i < woodlandTrees.length; i += bushStride) {
    const t = woodlandTrees[i];
    const r1 = hash2D(i * 19 + 3, i * 41 + 7);
    const r2 = hash2D(i * 53 + 11, i * 23 + 5);
    const ang = r1 * Math.PI * 2;
    const dist = 2.4 + r2 * 4.2;
    const bx = t.x + Math.cos(ang) * dist;
    const bz = t.z + Math.sin(ang) * dist;
    const by = groundHeightAt(bx, bz);
    if (by > WATER_LEVEL + 0.35 && trailFactorAt(bx, bz) < 0.25 && isInsideBearCave(bx, bz) === null) {
      fDummy.position.set(bx, by - 0.04, bz);
      fDummy.rotation.set(0, r2 * Math.PI * 2, 0);
      fDummy.scale.setScalar((0.82 + r1 * 0.45) * FOREST_BUSH_BASE_SCALE);
      fDummy.updateMatrix();
      bushSamples.push({ x: bx, z: bz, matrix: fDummy.matrix.clone() });
    }

    const fang = ang + 2.1;
    const fdist = 1.6 + r1 * 3.2;
    const fx = t.x + Math.cos(fang) * fdist;
    const fz = t.z + Math.sin(fang) * fdist;
    const fy = groundHeightAt(fx, fz);
    if (fy > WATER_LEVEL + 0.25 && trailFactorAt(fx, fz) < 0.28 && isInsideBearCave(fx, fz) === null) {
      fDummy.position.set(fx, fy - 0.03, fz);
      fDummy.rotation.set(0, r1 * Math.PI * 2, 0);
      fDummy.scale.setScalar((0.85 + r2 * 0.45) * FOREST_FERN_BASE_SCALE);
      fDummy.updateMatrix();
      fernSamples.push({ x: fx, z: fz, matrix: fDummy.matrix.clone() });
    }

    // Place WhiteFlower clusters along sunlit glades near every 2nd woodland stride
    if (i % (bushStride * 2) === 0) {
      const wang = ang + 4.05;
      const wdist = 3.0 + r2 * 3.8;
      const wx = t.x + Math.cos(wang) * wdist;
      const wz = t.z + Math.sin(wang) * wdist;
      const wy = groundHeightAt(wx, wz);
      if (wy > WATER_LEVEL + 0.3 && trailFactorAt(wx, wz) < 0.25 && isInsideBearCave(wx, wz) === null) {
        fDummy.position.set(wx, wy - 0.02, wz);
        fDummy.rotation.set(0, (r1 + r2) * Math.PI, 0);
        fDummy.scale.setScalar((0.82 + r2 * 0.42) * WHITE_FLOWER_BASE_SCALE);
        fDummy.updateMatrix();
        whiteflowerSamples.push({ x: wx, z: wz, matrix: fDummy.matrix.clone() });
      }
    }
  }

  // Place Cornflowers & WhiteFlowers in waterside habitats (lake shores, waterfall pool, riverbanks, oasis lagoon)
  const watersideFlowers = generateWatersideCornflowerPositions(isSoftwareGl ? 150 : 280);
  for (let i = 0; i < watersideFlowers.length; i++) {
    const wf = watersideFlowers[i];
    fDummy.position.set(wf.x, wf.y, wf.z);
    fDummy.rotation.set(0, wf.yaw, 0);
    if (i % 3 === 2) {
      fDummy.scale.setScalar(wf.scale * WHITE_FLOWER_BASE_SCALE);
      fDummy.updateMatrix();
      whiteflowerSamples.push({ x: wf.x, z: wf.z, matrix: fDummy.matrix.clone() });
    } else {
      fDummy.scale.setScalar(wf.scale * CORNFLOWER_BASE_SCALE);
      fDummy.updateMatrix();
      cornflowerSamples.push({ x: wf.x, z: wf.z, matrix: fDummy.matrix.clone() });
    }
  }

  const buildUndergrowthSectorLodBatch = (
    samples: readonly IFloraSample[],
    floraKey: FloraKey
  ): void => {
    const proto = masterFloraDrivers.get(floraKey)!.submeshProtos[0];
    for (const [sectorEntry, sectorItems] of groupBySector(
      samples,
      getUndergrowthSectorLodEntry
    )) {
      const n = sectorItems.length;
      if (n === 0) continue;
      const lod0IM = new THREE.InstancedMesh(proto.lod0Geometry, proto.material, n);
      const lod1IM = new THREE.InstancedMesh(proto.lod1Geometry, proto.material, n);
      for (let i = 0; i < n; i++) {
        lod0IM.setMatrixAt(i, sectorItems[i].matrix);
        lod1IM.setMatrixAt(i, sectorItems[i].matrix);
      }
      finalizeInstancedMesh(lod0IM, n, false, false, sectorEntry.lod0Group);
      finalizeInstancedMesh(lod1IM, n, false, false, sectorEntry.lod1Group);
    }
  };

  buildUndergrowthSectorLodBatch(bushSamples, 'forestbush');
  buildUndergrowthSectorLodBatch(fernSamples, 'forestfern');
  buildUndergrowthSectorLodBatch(cornflowerSamples, 'cornflower');
  buildUndergrowthSectorLodBatch(whiteflowerSamples, 'whiteflower');

  // --- G. SWAYING MEADOW GRASS TUFTS & WATERSIDE REEDS (Sectorized with 112m distance culling) ---
  const grassCount = isSoftwareGl ? 750 : 1550;
  const grassBladeGeo = new THREE.ConeGeometry(0.055, 0.26, 4);
  grassBladeGeo.translate(0, 0.13, 0);
  disposableGeometries.push(grassBladeGeo);

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4b7d31,
    roughness: 0.75,
    metalness: 0.02,
  });
  attachWindSwayShader(grassMat, 0.05, 2.4, swayMaterials);
  disposableMaterials.push(grassMat);

  interface IGrassSample {
    x: number;
    z: number;
    matrix: THREE.Matrix4;
    color: THREE.Color;
  }
  const grassSamples: IGrassSample[] = [];
  const gDummy = new THREE.Object3D();
  const gColor = new THREE.Color();

  for (let i = 0; i < grassCount * 2 && grassSamples.length < grassCount; i++) {
    const r1 = hash2D(i * 13, i * 29);
    const r2 = hash2D(i * 47 + 9, i * 71 - 3);
    const angle = r1 * Math.PI * 2;
    const dist = 6.0 + Math.sqrt(r2) * 220.0;
    const gx = Math.cos(angle) * dist;
    const gz = Math.sin(angle) * dist;

    const gy = groundHeightAt(gx, gz);
    if (gy < WATER_LEVEL + 0.12 || gy > 13.0) continue;
    if (trailFactorAt(gx, gz) > 0.28) continue;
    if (isInsideBearCave(gx, gz) !== null) continue;
    if (
      Math.abs(gx - SOUTHERN_MINE_POS.x) < 10.5 &&
      gz > SOUTHERN_MINE_POS.entranceZ - 8.0 &&
      gz < SOUTHERN_MINE_POS.entranceZ + 20.0
    ) {
      continue;
    }

    const isShoreReed = gy < WATER_LEVEL + 0.42;
    gDummy.position.set(gx, gy - 0.02, gz);
    gDummy.rotation.set(0, r1 * Math.PI * 2, 0);
    if (isShoreReed) {
      gDummy.scale.set(0.75, 1.35 + r2 * 0.45, 0.75);
      gColor.setHex(0x5c7536);
    } else {
      gDummy.scale.set(0.85 + r1 * 0.45, 0.7 + r2 * 0.65, 0.85 + r1 * 0.45);
      gColor.setHSL(0.26 + (r1 - 0.5) * 0.06, 0.48, 0.38 + (r2 - 0.5) * 0.1);
    }
    gDummy.updateMatrix();
    grassSamples.push({
      x: gx,
      z: gz,
      matrix: gDummy.matrix.clone(),
      color: gColor.clone(),
    });
  }

  for (const [sectorGrp, sectorGrass] of groupBySector(grassSamples, getUndergrowthSectorGroup)) {
    const n = sectorGrass.length;
    const grassIM = new THREE.InstancedMesh(grassBladeGeo, grassMat, n);
    for (let i = 0; i < n; i++) {
      grassIM.setMatrixAt(i, sectorGrass[i].matrix);
      grassIM.setColorAt(i, sectorGrass[i].color);
    }
    finalizeInstancedMesh(grassIM, n, false, false, sectorGrp);
  }
}
// #endregion
