// ============================================================================
// MODULE: World / Models / Vegetation Models
// DESIGN: Spatially sectorized instanced flora, trees, boulders, and meadow grass (SRP)
// SUMMARY: Uses embedded botanical 3D models from Plants/ (PineTree, OakGreen, OakYellow,
//          ForestBush, ForestFern, Cornflower) rendered via single-prototype InstancedMeshes
//          per spatial sector with GPU hardware bone skinning driven by weather-adaptive
//          skeletal animations, plus pooled skeletal felling rigs for chopped trees.
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
  PineTree,
  PineTreeRig,
  PineTreeAnimator,
  type PineTreeState,
  unpackPineTreeBundle,
  PINE_TREE_EMBEDDED_PACK_B64,
  PINE_TREE_EMBEDDED_TEXTURE_URI,
} from './Plants/PineTree_Complete';
import {
  OakGreen,
  OakGreenRig,
  OakGreenAnimator,
  unpackOakGreenBundle,
  OAK_GREEN_EMBEDDED_PACK_B64,
  OAK_GREEN_EMBEDDED_TEXTURE_URI,
} from './Plants/OakGreen_Complete';
import {
  OakYellow,
  OakYellowRig,
  OakYellowAnimator,
  unpackOakYellowBundle,
  OAK_YELLOW_EMBEDDED_PACK_B64,
  OAK_YELLOW_EMBEDDED_TEXTURE_URI,
} from './Plants/OakYellow_Complete';
import {
  ForestBushRig,
  ForestBushAnimator,
  unpackForestBushBundle,
  FOREST_BUSH_EMBEDDED_PACK_B64,
  FOREST_BUSH_EMBEDDED_TEXTURE_URI,
} from './Plants/ForestBush_Complete';
import {
  ForestFernRig,
  ForestFernAnimator,
  unpackForestFernBundle,
  FOREST_FERN_EMBEDDED_PACK_B64,
  FOREST_FERN_EMBEDDED_TEXTURE_URI,
} from './Plants/ForestFern_Complete';
import {
  CornflowerRig,
  CornflowerAnimator,
  unpackCornflowerBundle,
  CORNFLOWER_EMBEDDED_PACK_B64,
  CORNFLOWER_EMBEDDED_TEXTURE_URI,
} from './Plants/Cornflower_Complete';
import {
  getActiveTreeFellingRecords,
  type ITreeFellingRecord,
} from '../systems/treeFellingSystem';
// #endregion

// ======================== CONSTANTS & HELPERS ======================== \\
// #region Constants & Helpers
const VEG_SECTOR_SIZE = 120;
const VEG_SECTOR_RADIUS = 88;
const TREE_SECTOR_MAX_DIST = 230;
const TREE_SECTOR_MAX_DIST_SW = 155;
const UNDERGROWTH_SECTOR_MAX_DIST = 112;
const UNDERGROWTH_SECTOR_MAX_DIST_SW = 74;

const PINE_MODEL_BASE_SCALE = 3.85;
const OAK_GREEN_MODEL_BASE_SCALE = 3.65;
const OAK_YELLOW_MODEL_BASE_SCALE = 3.45;
const FOREST_BUSH_BASE_SCALE = 1.18;
const FOREST_FERN_BASE_SCALE = 0.88;
const CORNFLOWER_BASE_SCALE = 0.58;

interface ITreeInstanceHandle {
  obstacleIndex: number;
  kind: 'pine' | 'oak' | 'birch' | 'palm' | 'acacia';
  meshes: THREE.InstancedMesh[];
  shadowMesh: THREE.InstancedMesh;
  instanceIndex: number;
  baseMatrix: THREE.Matrix4;
  baseShadowMatrix: THREE.Matrix4;
  unitScale: number;
  isHiddenInInstancedMesh: boolean;
}

interface IPooledSkeletalTree {
  species: 'pine' | 'oak' | 'birch';
  instance: PineTree | OakGreen | OakYellow;
  assignedObstacleIndex: number | null;
  lastChopHits: number;
}

interface IMasterSpeciesAnimationDriver {
  speciesKey: 'pine' | 'oak' | 'birch' | 'bush' | 'fern' | 'cornflower';
  animatorA: {
    state: PineTreeState;
    time: number;
    setState: (next: PineTreeState) => void;
    update: (dt: number) => void;
  };
  animatorB: {
    state: PineTreeState;
    time: number;
    setState: (next: PineTreeState) => void;
    update: (dt: number) => void;
  };
  skeletonA: THREE.Skeleton;
  skeletonB: THREE.Skeleton;
}

const treeInstanceRegistry = new Map<number, ITreeInstanceHandle>();
const pooledSkeletalTrees: IPooledSkeletalTree[] = [];
const masterSpeciesDrivers: IMasterSpeciesAnimationDriver[] = [];
let currentWeatherPlantAnimationState: PineTreeState = 'idle';

const _zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
const _tempDummy = new THREE.Object3D();

/**
 * Pure, deterministic mapping from the current world weather state to the built-in
 * skeletal animation clip in `Plants/*_Complete.ts`.
 */
export function resolvePlantAnimationStateForWeather(
  weather?: Pick<IWeatherStateSnapshot, 'weatherKind' | 'windStrength'> | null
): PineTreeState {
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
 * Returns the currently active weather-driven skeletal animation state applied to world plants.
 */
export function getActiveWeatherPlantAnimationState(): PineTreeState {
  return currentWeatherPlantAnimationState;
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
 * Builds an optimized, vertex-compacted BufferGeometry from unpacked plant bundle data,
 * stripping microscopic sub-centimeter triangles (`area < minTriangleArea`) to cut GPU
 * vertex/fragment load by ~50% while preserving `aPlantSkinIndex` and `aPlantSkinWeight`
 * for GPU instanced skeletal animation.
 */
function buildOptimizedSkinnedPlantGeometry(
  data: {
    positions: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    skinIndices: Uint8Array;
    skinWeights: Float32Array;
    indices: Uint16Array;
  },
  minTriangleArea: number,
  disposableGeometries: THREE.BufferGeometry[]
): THREE.BufferGeometry {
  const srcPos = data.positions;
  const srcNorm = data.normals;
  const srcUv = data.uvs;
  const srcSkinIdx = data.skinIndices;
  const srcSkinW = data.skinWeights;
  const srcIndices = data.indices;

  const keptTriIndices: number[] = [];
  const oldToNewVert = new Int32Array(srcPos.length / 3).fill(-1);
  let newVertCount = 0;

  for (let i = 0; i < srcIndices.length; i += 3) {
    const a = srcIndices[i];
    const b = srcIndices[i + 1];
    const c = srcIndices[i + 2];
    if (minTriangleArea > 0) {
      const ax = srcPos[a * 3];
      const ay = srcPos[a * 3 + 1];
      const az = srcPos[a * 3 + 2];
      const bx = srcPos[b * 3] - ax;
      const by = srcPos[b * 3 + 1] - ay;
      const bz = srcPos[b * 3 + 2] - az;
      const cx = srcPos[c * 3] - ax;
      const cy = srcPos[c * 3 + 1] - ay;
      const cz = srcPos[c * 3 + 2] - az;
      const nx = by * cz - bz * cy;
      const ny = bz * cx - bx * cz;
      const nz = bx * cy - by * cx;
      const area = 0.5 * Math.hypot(nx, ny, nz);
      if (area < minTriangleArea) continue;
    }

    if (oldToNewVert[a] === -1) oldToNewVert[a] = newVertCount++;
    if (oldToNewVert[b] === -1) oldToNewVert[b] = newVertCount++;
    if (oldToNewVert[c] === -1) oldToNewVert[c] = newVertCount++;
    keptTriIndices.push(oldToNewVert[a], oldToNewVert[b], oldToNewVert[c]);
  }

  const positions = new Float32Array(newVertCount * 3);
  const normals = new Float32Array(newVertCount * 3);
  const uvs = new Float32Array(newVertCount * 2);
  const skinIndicesFloat = new Float32Array(newVertCount * 4);
  const skinWeights = new Float32Array(newVertCount * 4);

  const totalSrcVerts = srcPos.length / 3;
  for (let oldV = 0; oldV < totalSrcVerts; oldV++) {
    const newV = oldToNewVert[oldV];
    if (newV === -1) continue;
    positions[newV * 3] = srcPos[oldV * 3];
    positions[newV * 3 + 1] = srcPos[oldV * 3 + 1];
    positions[newV * 3 + 2] = srcPos[oldV * 3 + 2];

    normals[newV * 3] = srcNorm[oldV * 3];
    normals[newV * 3 + 1] = srcNorm[oldV * 3 + 1];
    normals[newV * 3 + 2] = srcNorm[oldV * 3 + 2];

    uvs[newV * 2] = srcUv[oldV * 2];
    uvs[newV * 2 + 1] = srcUv[oldV * 2 + 1];

    skinIndicesFloat[newV * 4] = srcSkinIdx[oldV * 4];
    skinIndicesFloat[newV * 4 + 1] = srcSkinIdx[oldV * 4 + 1];
    skinIndicesFloat[newV * 4 + 2] = srcSkinIdx[oldV * 4 + 2];
    skinIndicesFloat[newV * 4 + 3] = srcSkinIdx[oldV * 4 + 3];

    skinWeights[newV * 4] = srcSkinW[oldV * 4];
    skinWeights[newV * 4 + 1] = srcSkinW[oldV * 4 + 1];
    skinWeights[newV * 4 + 2] = srcSkinW[oldV * 4 + 2];
    skinWeights[newV * 4 + 3] = srcSkinW[oldV * 4 + 3];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('aPlantSkinIndex', new THREE.BufferAttribute(skinIndicesFloat, 4));
  geo.setAttribute('aPlantSkinWeight', new THREE.BufferAttribute(skinWeights, 4));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(keptTriIndices), 1));
  geo.computeBoundingSphere();
  disposableGeometries.push(geo);
  return geo;
}

/**
 * Attaches GPU hardware 25-bone skeletal skinning (`uPlantBonesA`, `uPlantBonesB`)
 * with per-instance spatial phase blending to an instanced plant `MeshStandardMaterial`.
 */
function attachPlantSkeletalAnimationShader(
  material: THREE.MeshStandardMaterial,
  skeletonA: THREE.Skeleton,
  skeletonB: THREE.Skeleton,
  swayMaterials: THREE.MeshStandardMaterial[]
): void {
  const uTime = { value: 0 };
  const uWindScale = { value: 1.0 };
  const uPlantBonesA = { value: skeletonA.boneMatrices };
  const uPlantBonesB = { value: skeletonB.boneMatrices };
  material.userData.uTime = uTime;
  material.userData.uWindScale = uWindScale;
  material.userData.uPlantBonesA = uPlantBonesA;
  material.userData.uPlantBonesB = uPlantBonesB;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uWindScale = uWindScale;
    shader.uniforms.uPlantBonesA = uPlantBonesA;
    shader.uniforms.uPlantBonesB = uPlantBonesB;

    shader.vertexShader =
      `
      attribute vec4 aPlantSkinIndex;
      attribute vec4 aPlantSkinWeight;
      uniform mat4 uPlantBonesA[25];
      uniform mat4 uPlantBonesB[25];
      uniform float uTime;
      uniform float uWindScale;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float plantInstancePhase = 0.0;
        #ifdef USE_INSTANCING
          plantInstancePhase = 0.5 + 0.5 * sin(instanceMatrix[3].x * 0.23 + instanceMatrix[3].z * 0.37);
        #endif
        int pb0 = int(aPlantSkinIndex.x + 0.5);
        int pb1 = int(aPlantSkinIndex.y + 0.5);
        int pb2 = int(aPlantSkinIndex.z + 0.5);
        int pb3 = int(aPlantSkinIndex.w + 0.5);
        mat4 plantMatA =
          aPlantSkinWeight.x * uPlantBonesA[pb0] +
          aPlantSkinWeight.y * uPlantBonesA[pb1] +
          aPlantSkinWeight.z * uPlantBonesA[pb2] +
          aPlantSkinWeight.w * uPlantBonesA[pb3];
        mat4 plantMatB =
          aPlantSkinWeight.x * uPlantBonesB[pb0] +
          aPlantSkinWeight.y * uPlantBonesB[pb1] +
          aPlantSkinWeight.z * uPlantBonesB[pb2] +
          aPlantSkinWeight.w * uPlantBonesB[pb3];
        vec3 skinnedA = (plantMatA * vec4(transformed, 1.0)).xyz;
        vec3 skinnedB = (plantMatB * vec4(transformed, 1.0)).xyz;
        transformed = mix(skinnedA, skinnedB, plantInstancePhase);
        `
      );
  };

  swayMaterials.push(material);
}
// #endregion

// ======================== DYNAMIC TREE FELLING & WEATHER VISUAL SYNC ======================== \\
// #region Dynamic Tree Felling & Weather Visual Sync
function acquirePooledRig(
  species: 'pine' | 'oak' | 'birch',
  obstacleIndex: number
): IPooledSkeletalTree | null {
  for (let i = 0; i < pooledSkeletalTrees.length; i++) {
    const p = pooledSkeletalTrees[i];
    if (p.species === species && p.assignedObstacleIndex === obstacleIndex) {
      return p;
    }
  }
  for (let i = 0; i < pooledSkeletalTrees.length; i++) {
    const p = pooledSkeletalTrees[i];
    if (p.species === species && p.assignedObstacleIndex === null) {
      p.assignedObstacleIndex = obstacleIndex;
      p.lastChopHits = 0;
      p.instance.setState(currentWeatherPlantAnimationState);
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
 * Updates the shared weather-adaptive plant skeletal animations across all instanced
 * plant species (`PineTree`, `OakGreen`, `OakYellow`, `ForestBush`, `ForestFern`, `Cornflower`)
 * AND synchronizes chopped/falling/fallen/harvested trees with their pooled rigs.
 */
export function updateChoppableTreesVisuals(
  dt: number,
  weather?: IWeatherStateSnapshot
): void {
  // 1. Adapt all 6 plant species' master skeletal animators to the current weather state
  const targetWeatherAnimState = resolvePlantAnimationStateForWeather(weather);
  currentWeatherPlantAnimationState = targetWeatherAnimState;
  const windStrength = weather?.windStrength ?? 0.35;
  const animDt = dt * (0.78 + windStrength * 0.62);

  for (let i = 0; i < masterSpeciesDrivers.length; i++) {
    const drv = masterSpeciesDrivers[i];
    if (drv.animatorA.state !== targetWeatherAnimState) {
      drv.animatorA.setState(targetWeatherAnimState);
    }
    if (drv.animatorB.state !== targetWeatherAnimState) {
      drv.animatorB.setState(targetWeatherAnimState);
    }
    drv.animatorA.update(animDt);
    drv.animatorB.update(animDt);
    drv.skeletonA.update();
    drv.skeletonB.update();
  }

  // 2. Sync chopped, falling, fallen, and harvested trees
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
      if (rec.kind === 'pine' || rec.kind === 'oak' || rec.kind === 'birch') {
        const pooled = acquirePooledRig(rec.kind, rec.obstacleIndex);
        if (pooled) {
          hideStaticTreeInstance(handle);
          const baseScale =
            rec.kind === 'pine'
              ? PINE_MODEL_BASE_SCALE
              : rec.kind === 'oak'
                ? OAK_GREEN_MODEL_BASE_SCALE
                : OAK_YELLOW_MODEL_BASE_SCALE;

          const shakeAngle =
            rec.shakeTimer > 0
              ? Math.sin(rec.shakeTimer * 48.0) * 0.055 * (rec.shakeTimer / 0.38)
              : 0;

          pooled.instance.object.visible = true;
          pooled.instance.object.position.set(rec.x, rec.y - 0.08, rec.z);
          pooled.instance.object.rotation.order = 'YXZ';
          pooled.instance.object.rotation.set(shakeAngle, rec.fallYaw, 0);
          pooled.instance.object.scale.setScalar(rec.scale * baseScale);

          if (rec.status === 'falling' || rec.status === 'fallen') {
            if (pooled.instance.getState() !== 'death') {
              pooled.instance.setState('death');
            }
          } else if (rec.chops !== pooled.lastChopHits) {
            pooled.lastChopHits = rec.chops;
            pooled.instance.setState('attack');
          }

          pooled.instance.update(dt);
          continue;
        }
      }

      // Fallback for palm/acacia or if skeletal pool is full: tilt instance matrix directly
      applyFallbackMatrixTilt(handle, rec);
    }
  }

  // Release any pooled rigs whose trees have been harvested or reset
  for (let i = 0; i < pooledSkeletalTrees.length; i++) {
    const p = pooledSkeletalTrees[i];
    if (
      p.assignedObstacleIndex !== null &&
      !activeIndices.has(p.assignedObstacleIndex)
    ) {
      p.assignedObstacleIndex = null;
      p.instance.object.visible = false;
    }
  }
}
// #endregion

// ======================== BUILD VEGETATION MODELS ======================== \\
// #region Build Vegetation Models
/**
 * Summary: Constructs spatially sectorized, frustum-culled instanced forest trees, bushes,
 *          ferns, waterside cornflowers, boulders, palms, acacias, and swaying ground grass.
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

  treeInstanceRegistry.clear();
  pooledSkeletalTrees.length = 0;
  masterSpeciesDrivers.length = 0;

  const treeMaxDist = isSoftwareGl ? TREE_SECTOR_MAX_DIST_SW : TREE_SECTOR_MAX_DIST;
  const undergrowthMaxDist = isSoftwareGl
    ? UNDERGROWTH_SECTOR_MAX_DIST_SW
    : UNDERGROWTH_SECTOR_MAX_DIST;

  // Separate spatial sector registries for tall trees (230m range) vs small undergrowth/grass (112m range)
  const treeSectorGroups = new Map<string, THREE.Group>();
  const getTreeSectorGroup = (x: number, z: number): THREE.Group => {
    const gx = Math.round(x / VEG_SECTOR_SIZE);
    const gz = Math.round(z / VEG_SECTOR_SIZE);
    const key = `${gx},${gz}`;
    let grp = treeSectorGroups.get(key);
    if (!grp) {
      grp = new THREE.Group();
      scene.add(grp);
      treeSectorGroups.set(key, grp);
      distanceCulledObjects.push({
        obj: grp,
        cx: gx * VEG_SECTOR_SIZE,
        cz: gz * VEG_SECTOR_SIZE,
        radius: VEG_SECTOR_RADIUS,
        maxDist: treeMaxDist,
      });
    }
    return grp;
  };

  const undergrowthSectorGroups = new Map<string, THREE.Group>();
  const getUndergrowthSectorGroup = (x: number, z: number): THREE.Group => {
    const gx = Math.round(x / VEG_SECTOR_SIZE);
    const gz = Math.round(z / VEG_SECTOR_SIZE);
    const key = `${gx},${gz}`;
    let grp = undergrowthSectorGroups.get(key);
    if (!grp) {
      grp = new THREE.Group();
      scene.add(grp);
      undergrowthSectorGroups.set(key, grp);
      distanceCulledObjects.push({
        obj: grp,
        cx: gx * VEG_SECTOR_SIZE,
        cz: gz * VEG_SECTOR_SIZE,
        radius: VEG_SECTOR_RADIUS,
        maxDist: undergrowthMaxDist,
      });
    }
    return grp;
  };

  const groupBySector = <T extends { x: number; z: number }>(
    items: readonly T[],
    getGroupFn: (x: number, z: number) => THREE.Group
  ): Map<THREE.Group, T[]> => {
    const map = new Map<THREE.Group, T[]>();
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
    if (o.kind === 'pine') pines.push(entry);
    else if (o.kind === 'oak') oaks.push(entry);
    else if (o.kind === 'birch') birches.push(entry);
    else if (o.kind === 'palm') palms.push(entry);
    else if (o.kind === 'acacia') acacias.push(entry);
    else if (o.kind === 'boulder') boulders.push(entry);
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

  // --- 1. UNPACK SINGLE PROTOTYPE GEOMETRY, RIG & MATERIAL PER PLANT SPECIES ---
  const pineData = unpackPineTreeBundle(PINE_TREE_EMBEDDED_PACK_B64);
  const oakGreenData = unpackOakGreenBundle(OAK_GREEN_EMBEDDED_PACK_B64);
  const oakYellowData = unpackOakYellowBundle(OAK_YELLOW_EMBEDDED_PACK_B64);
  const forestBushData = unpackForestBushBundle(FOREST_BUSH_EMBEDDED_PACK_B64);
  const forestFernData = unpackForestFernBundle(FOREST_FERN_EMBEDDED_PACK_B64);
  const cornflowerData = unpackCornflowerBundle(CORNFLOWER_EMBEDDED_PACK_B64);

  const pineTex = createPlantTexture(PINE_TREE_EMBEDDED_TEXTURE_URI, disposableTextures);
  const oakGreenTex = createPlantTexture(OAK_GREEN_EMBEDDED_TEXTURE_URI, disposableTextures);
  const oakYellowTex = createPlantTexture(OAK_YELLOW_EMBEDDED_TEXTURE_URI, disposableTextures);
  const forestBushTex = createPlantTexture(FOREST_BUSH_EMBEDDED_TEXTURE_URI, disposableTextures);
  const forestFernTex = createPlantTexture(FOREST_FERN_EMBEDDED_TEXTURE_URI, disposableTextures);
  const cornflowerTex = createPlantTexture(CORNFLOWER_EMBEDDED_TEXTURE_URI, disposableTextures);

  // Build optimized skinned geometries (stripping microscopic sub-centimeter triangles while keeping skinning weights)
  const pineSkinnedGeo = buildOptimizedSkinnedPlantGeometry(
    pineData,
    isSoftwareGl ? 0.0012 : 0.0008,
    disposableGeometries
  );
  const oakGreenSkinnedGeo = buildOptimizedSkinnedPlantGeometry(
    oakGreenData,
    isSoftwareGl ? 0.0009 : 0.0005,
    disposableGeometries
  );
  const oakYellowSkinnedGeo = buildOptimizedSkinnedPlantGeometry(
    oakYellowData,
    isSoftwareGl ? 0.0009 : 0.0005,
    disposableGeometries
  );
  const forestBushSkinnedGeo = buildOptimizedSkinnedPlantGeometry(
    forestBushData,
    0,
    disposableGeometries
  );
  const forestFernSkinnedGeo = buildOptimizedSkinnedPlantGeometry(
    forestFernData,
    0,
    disposableGeometries
  );
  const cornflowerSkinnedGeo = buildOptimizedSkinnedPlantGeometry(
    cornflowerData,
    0,
    disposableGeometries
  );

  // Create 1 pair of master skeletal animators per species (phase A + phase B offset by 1.6s)
  const registerMasterDriver = (
    speciesKey: IMasterSpeciesAnimationDriver['speciesKey'],
    rigA: { skeleton: THREE.Skeleton },
    animA: IMasterSpeciesAnimationDriver['animatorA'],
    rigB: { skeleton: THREE.Skeleton },
    animB: IMasterSpeciesAnimationDriver['animatorB']
  ): IMasterSpeciesAnimationDriver => {
    animA.setState('idle');
    animB.setState('idle');
    animB.time = 1.6;
    animA.update(0);
    animB.update(0);
    rigA.skeleton.update();
    rigB.skeleton.update();
    const driver: IMasterSpeciesAnimationDriver = {
      speciesKey,
      animatorA: animA,
      animatorB: animB,
      skeletonA: rigA.skeleton,
      skeletonB: rigB.skeleton,
    };
    masterSpeciesDrivers.push(driver);
    return driver;
  };

  const pineRigA = new PineTreeRig(pineData);
  const pineRigB = new PineTreeRig(pineData);
  const pineDriver = registerMasterDriver(
    'pine',
    pineRigA,
    new PineTreeAnimator(pineRigA, pineData),
    pineRigB,
    new PineTreeAnimator(pineRigB, pineData)
  );

  const oakGreenRigA = new OakGreenRig(oakGreenData);
  const oakGreenRigB = new OakGreenRig(oakGreenData);
  const oakGreenDriver = registerMasterDriver(
    'oak',
    oakGreenRigA,
    new OakGreenAnimator(oakGreenRigA, oakGreenData),
    oakGreenRigB,
    new OakGreenAnimator(oakGreenRigB, oakGreenData)
  );

  const oakYellowRigA = new OakYellowRig(oakYellowData);
  const oakYellowRigB = new OakYellowRig(oakYellowData);
  const oakYellowDriver = registerMasterDriver(
    'birch',
    oakYellowRigA,
    new OakYellowAnimator(oakYellowRigA, oakYellowData),
    oakYellowRigB,
    new OakYellowAnimator(oakYellowRigB, oakYellowData)
  );

  const bushRigA = new ForestBushRig(forestBushData);
  const bushRigB = new ForestBushRig(forestBushData);
  const bushDriver = registerMasterDriver(
    'bush',
    bushRigA,
    new ForestBushAnimator(bushRigA, forestBushData),
    bushRigB,
    new ForestBushAnimator(bushRigB, forestBushData)
  );

  const fernRigA = new ForestFernRig(forestFernData);
  const fernRigB = new ForestFernRig(forestFernData);
  const fernDriver = registerMasterDriver(
    'fern',
    fernRigA,
    new ForestFernAnimator(fernRigA, forestFernData),
    fernRigB,
    new ForestFernAnimator(fernRigB, forestFernData)
  );

  const flowerRigA = new CornflowerRig(cornflowerData);
  const flowerRigB = new CornflowerRig(cornflowerData);
  const flowerDriver = registerMasterDriver(
    'cornflower',
    flowerRigA,
    new CornflowerAnimator(flowerRigA, cornflowerData),
    flowerRigB,
    new CornflowerAnimator(flowerRigB, cornflowerData)
  );

  const pinePlantMat = new THREE.MeshStandardMaterial({
    map: pineTex,
    alphaTest: 0.35,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const oakGreenPlantMat = new THREE.MeshStandardMaterial({
    map: oakGreenTex,
    alphaTest: 0.35,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const oakYellowPlantMat = new THREE.MeshStandardMaterial({
    map: oakYellowTex,
    alphaTest: 0.35,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const forestBushPlantMat = new THREE.MeshStandardMaterial({
    map: forestBushTex,
    alphaTest: 0.35,
    roughness: 0.84,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const forestFernPlantMat = new THREE.MeshStandardMaterial({
    map: forestFernTex,
    alphaTest: 0.35,
    roughness: 0.8,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const cornflowerPlantMat = new THREE.MeshStandardMaterial({
    map: cornflowerTex,
    alphaTest: 0.35,
    roughness: 0.78,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  attachPlantSkeletalAnimationShader(
    pinePlantMat,
    pineDriver.skeletonA,
    pineDriver.skeletonB,
    swayMaterials
  );
  attachPlantSkeletalAnimationShader(
    oakGreenPlantMat,
    oakGreenDriver.skeletonA,
    oakGreenDriver.skeletonB,
    swayMaterials
  );
  attachPlantSkeletalAnimationShader(
    oakYellowPlantMat,
    oakYellowDriver.skeletonA,
    oakYellowDriver.skeletonB,
    swayMaterials
  );
  attachPlantSkeletalAnimationShader(
    forestBushPlantMat,
    bushDriver.skeletonA,
    bushDriver.skeletonB,
    swayMaterials
  );
  attachPlantSkeletalAnimationShader(
    forestFernPlantMat,
    fernDriver.skeletonA,
    fernDriver.skeletonB,
    swayMaterials
  );
  attachPlantSkeletalAnimationShader(
    cornflowerPlantMat,
    flowerDriver.skeletonA,
    flowerDriver.skeletonB,
    swayMaterials
  );

  disposableMaterials.push(
    pinePlantMat,
    oakGreenPlantMat,
    oakYellowPlantMat,
    forestBushPlantMat,
    forestFernPlantMat,
    cornflowerPlantMat
  );

  // Create small pool of animated skeletal trees for active chopping & felling animations
  const POOL_PER_SPECIES = 3;
  for (let i = 0; i < POOL_PER_SPECIES; i++) {
    const pRig = new PineTree(pineData, pineTex, {
      scale: PINE_MODEL_BASE_SCALE,
      castShadow: false,
      receiveShadow: !isSoftwareGl,
    });
    pRig.object.visible = false;
    scene.add(pRig.object);
    pooledSkeletalTrees.push({
      species: 'pine',
      instance: pRig,
      assignedObstacleIndex: null,
      lastChopHits: 0,
    });

    const ogRig = new OakGreen(oakGreenData, oakGreenTex, {
      scale: OAK_GREEN_MODEL_BASE_SCALE,
      castShadow: false,
      receiveShadow: !isSoftwareGl,
    });
    ogRig.object.visible = false;
    scene.add(ogRig.object);
    pooledSkeletalTrees.push({
      species: 'oak',
      instance: ogRig,
      assignedObstacleIndex: null,
      lastChopHits: 0,
    });

    const oyRig = new OakYellow(oakYellowData, oakYellowTex, {
      scale: OAK_YELLOW_MODEL_BASE_SCALE,
      castShadow: false,
      receiveShadow: !isSoftwareGl,
    });
    oyRig.object.visible = false;
    scene.add(oyRig.object);
    pooledSkeletalTrees.push({
      species: 'birch',
      instance: oyRig,
      assignedObstacleIndex: null,
      lastChopHits: 0,
    });
  }

  const cullDummy = new THREE.Object3D();
  const shadowDummy = new THREE.Object3D();
  const cullTint = new THREE.Color();

  // --- A. TALL FOREST PINES (Single Skinned InstancedMesh per sector from PineTree_Complete) ---
  for (const [sectorGrp, sectorPines] of groupBySector(pines, getTreeSectorGroup)) {
    const n = sectorPines.length;
    const mPine = new THREE.InstancedMesh(pineSkinnedGeo, pinePlantMat, n);
    const mShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);

    for (let i = 0; i < n; i++) {
      const p = sectorPines[i];
      const gy = groundHeightAt(p.x, p.z);
      cullDummy.position.set(p.x, gy - 0.08, p.z);
      cullDummy.rotation.set(
        (p.seed - 0.5) * 0.04,
        p.seed * Math.PI * 2,
        (p.seed - 0.5) * 0.04
      );
      cullDummy.scale.setScalar(p.scale * PINE_MODEL_BASE_SCALE);
      cullDummy.updateMatrix();
      mPine.setMatrixAt(i, cullDummy.matrix);

      cullTint.setHSL(
        0.28 + (p.seed - 0.5) * 0.03,
        0.12,
        0.92 + (p.seed - 0.5) * 0.12
      );
      mPine.setColorAt(i, cullTint);

      shadowDummy.position.set(p.x, gy + 0.03, p.z);
      shadowDummy.rotation.set(0, 0, 0);
      shadowDummy.scale.setScalar(p.scale * 1.35);
      shadowDummy.updateMatrix();
      mShadow.setMatrixAt(i, shadowDummy.matrix);

      treeInstanceRegistry.set(p.obstacleIndex, {
        obstacleIndex: p.obstacleIndex,
        kind: 'pine',
        meshes: [mPine],
        shadowMesh: mShadow,
        instanceIndex: i,
        baseMatrix: cullDummy.matrix.clone(),
        baseShadowMatrix: shadowDummy.matrix.clone(),
        unitScale: PINE_MODEL_BASE_SCALE,
        isHiddenInInstancedMesh: false,
      });
    }

    finalizeInstancedMesh(mPine, n, false, true, sectorGrp);
    finalizeInstancedMesh(mShadow, n, false, false, sectorGrp);
  }

  // --- B. MATURE GREEN OAKS (Single Skinned InstancedMesh per sector from OakGreen_Complete) ---
  for (const [sectorGrp, sectorOaks] of groupBySector(oaks, getTreeSectorGroup)) {
    const n = sectorOaks.length;
    const oMesh = new THREE.InstancedMesh(oakGreenSkinnedGeo, oakGreenPlantMat, n);
    const oShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);

    for (let i = 0; i < n; i++) {
      const o = sectorOaks[i];
      const gy = groundHeightAt(o.x, o.z);
      cullDummy.position.set(o.x, gy - 0.08, o.z);
      cullDummy.rotation.set(0, o.seed * Math.PI * 2, 0);
      cullDummy.scale.setScalar(o.scale * OAK_GREEN_MODEL_BASE_SCALE);
      cullDummy.updateMatrix();
      oMesh.setMatrixAt(i, cullDummy.matrix);

      cullTint.setHSL(
        0.25 + (o.seed - 0.5) * 0.04,
        0.14,
        0.92 + (o.seed - 0.5) * 0.12
      );
      oMesh.setColorAt(i, cullTint);

      shadowDummy.position.set(o.x, gy + 0.03, o.z);
      shadowDummy.rotation.set(0, 0, 0);
      shadowDummy.scale.setScalar(o.scale * 1.55);
      shadowDummy.updateMatrix();
      oShadow.setMatrixAt(i, shadowDummy.matrix);

      treeInstanceRegistry.set(o.obstacleIndex, {
        obstacleIndex: o.obstacleIndex,
        kind: 'oak',
        meshes: [oMesh],
        shadowMesh: oShadow,
        instanceIndex: i,
        baseMatrix: cullDummy.matrix.clone(),
        baseShadowMatrix: shadowDummy.matrix.clone(),
        unitScale: OAK_GREEN_MODEL_BASE_SCALE,
        isHiddenInInstancedMesh: false,
      });
    }

    finalizeInstancedMesh(oMesh, n, false, true, sectorGrp);
    finalizeInstancedMesh(oShadow, n, false, false, sectorGrp);
  }

  // --- C. GOLDEN AUTUMN TREES (Single Skinned InstancedMesh per sector from OakYellow_Complete) ---
  for (const [sectorGrp, sectorBirches] of groupBySector(birches, getTreeSectorGroup)) {
    const n = sectorBirches.length;
    const brMesh = new THREE.InstancedMesh(oakYellowSkinnedGeo, oakYellowPlantMat, n);
    const brShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);

    for (let i = 0; i < n; i++) {
      const br = sectorBirches[i];
      const gy = groundHeightAt(br.x, br.z);
      cullDummy.position.set(br.x, gy - 0.08, br.z);
      cullDummy.rotation.set(0, br.seed * Math.PI * 2, 0);
      cullDummy.scale.setScalar(br.scale * OAK_YELLOW_MODEL_BASE_SCALE);
      cullDummy.updateMatrix();
      brMesh.setMatrixAt(i, cullDummy.matrix);

      cullTint.setHSL(
        0.1 + (br.seed - 0.5) * 0.04,
        0.18,
        0.92 + (br.seed - 0.5) * 0.12
      );
      brMesh.setColorAt(i, cullTint);

      shadowDummy.position.set(br.x, gy + 0.03, br.z);
      shadowDummy.rotation.set(0, 0, 0);
      shadowDummy.scale.setScalar(br.scale * 1.35);
      shadowDummy.updateMatrix();
      brShadow.setMatrixAt(i, shadowDummy.matrix);

      treeInstanceRegistry.set(br.obstacleIndex, {
        obstacleIndex: br.obstacleIndex,
        kind: 'birch',
        meshes: [brMesh],
        shadowMesh: brShadow,
        instanceIndex: i,
        baseMatrix: cullDummy.matrix.clone(),
        baseShadowMatrix: shadowDummy.matrix.clone(),
        unitScale: OAK_YELLOW_MODEL_BASE_SCALE,
        isHiddenInInstancedMesh: false,
      });
    }

    finalizeInstancedMesh(brMesh, n, false, true, sectorGrp);
    finalizeInstancedMesh(brShadow, n, false, false, sectorGrp);
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

  for (const [sectorGrp, sectorBoulders] of groupBySector(boulders, getTreeSectorGroup)) {
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

  for (const [sectorGrp, sectorPalms] of groupBySector(palms, getTreeSectorGroup)) {
    const n = sectorPalms.length;
    const pTrunkIM = new THREE.InstancedMesh(instPalmTrunkGeo, barkMat, n);
    const pCrown1IM = new THREE.InstancedMesh(instPalmCrownGeo, palmCrownMat, n);
    const pCrown2IM = new THREE.InstancedMesh(instPalmLowerCrownGeo, palmCrownMat, n);
    const pShadowIM = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);
    for (let i = 0; i < n; i++) {
      const p = sectorPalms[i];
      const gy = groundHeightAt(p.x, p.z);
      cullDummy.position.set(p.x, gy - 0.1, p.z);
      cullDummy.rotation.set((p.seed - 0.5) * 0.12, p.seed * Math.PI * 2, (p.seed - 0.5) * 0.12);
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

  for (const [sectorGrp, sectorAcacias] of groupBySector(acacias, getTreeSectorGroup)) {
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

  // --- F. BOTANICAL UNDERGROWTH & WATERSIDE CORNFLOWER WILDFLOWERS ---
  interface IFloraSample {
    x: number;
    z: number;
    matrix: THREE.Matrix4;
  }
  const bushSamples: IFloraSample[] = [];
  const fernSamples: IFloraSample[] = [];
  const cornflowerSamples: IFloraSample[] = [];
  const fDummy = new THREE.Object3D();

  // Place ForestBushes and ForestFerns near woodland trees
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
  }

  // Place Cornflowers strictly in waterside habitats (lake shores, waterfall pool, riverbanks, oasis lagoon)
  const watersideFlowers = generateWatersideCornflowerPositions(isSoftwareGl ? 150 : 280);
  for (let i = 0; i < watersideFlowers.length; i++) {
    const wf = watersideFlowers[i];
    fDummy.position.set(wf.x, wf.y, wf.z);
    fDummy.rotation.set(0, wf.yaw, 0);
    fDummy.scale.setScalar(wf.scale * CORNFLOWER_BASE_SCALE);
    fDummy.updateMatrix();
    cornflowerSamples.push({ x: wf.x, z: wf.z, matrix: fDummy.matrix.clone() });
  }

  for (const [sectorGrp, sectorBushes] of groupBySector(bushSamples, getUndergrowthSectorGroup)) {
    const n = sectorBushes.length;
    const bushIM = new THREE.InstancedMesh(forestBushSkinnedGeo, forestBushPlantMat, n);
    for (let i = 0; i < n; i++) {
      bushIM.setMatrixAt(i, sectorBushes[i].matrix);
    }
    finalizeInstancedMesh(bushIM, n, false, false, sectorGrp);
  }

  for (const [sectorGrp, sectorFerns] of groupBySector(fernSamples, getUndergrowthSectorGroup)) {
    const n = sectorFerns.length;
    const fernIM = new THREE.InstancedMesh(forestFernSkinnedGeo, forestFernPlantMat, n);
    for (let i = 0; i < n; i++) {
      fernIM.setMatrixAt(i, sectorFerns[i].matrix);
    }
    finalizeInstancedMesh(fernIM, n, false, false, sectorGrp);
  }

  for (const [sectorGrp, sectorFlowers] of groupBySector(cornflowerSamples, getUndergrowthSectorGroup)) {
    const n = sectorFlowers.length;
    const flowerIM = new THREE.InstancedMesh(cornflowerSkinnedGeo, cornflowerPlantMat, n);
    for (let i = 0; i < n; i++) {
      flowerIM.setMatrixAt(i, sectorFlowers[i].matrix);
    }
    finalizeInstancedMesh(flowerIM, n, false, false, sectorGrp);
  }

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
