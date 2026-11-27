// ============================================================================
// MODULE: World / Models / Structures / Dragon Realm Assets
// DESIGN: Async GLB + Draco asset loader & template cache for the Dragon Mirror
//         Statue, Skeleton Dragon, and Hydra Dragon models (SRP)
// SUMMARY: Downloads and decodes user-provided GLBs (with local WASM Draco support),
//          measures bounds, caches templates, and instantiates grounded clones.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { InfrastructureCorruptedException } from '../../../core/AppException';
import { fetchAssetBytes } from '../fetchAssetBytes';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
export type DragonRealmModelId = 'dragon_mirror_statue' | 'skeleton_dragon' | 'hydra_dragon';

export const DRAGON_REALM_MODEL_PATHS: Readonly<Record<DragonRealmModelId, string>> = {
  dragon_mirror_statue: 'models/structures/fantasy dragon 3d model lowpoly.glb',
  skeleton_dragon: 'models/animals/dragon skeletal 3d model lowpoly.glb',
  hydra_dragon: 'models/animals/hydra dragon 3d model.glb',
};

export const DRAGON_REALM_MODEL_IDS: readonly DragonRealmModelId[] = [
  'dragon_mirror_statue',
  'skeleton_dragon',
  'hydra_dragon',
];

export interface IDragonRealmModelBounds {
  readonly min: THREE.Vector3;
  readonly max: THREE.Vector3;
  readonly size: THREE.Vector3;
  readonly center: THREE.Vector3;
}

export interface IDragonRealmModelAsset {
  readonly id: DragonRealmModelId;
  readonly scene: THREE.Group;
  readonly bounds: IDragonRealmModelBounds;
}

export interface IDragonRealmInstanceOptions {
  readonly scale?: number;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
  readonly yawOffset?: number;
}

export type DragonRealmModelFetcher = (id: DragonRealmModelId) => Promise<ArrayBuffer>;
// #endregion

// ======================== DRACO LOADER SETUP ======================== \\
// #region Draco Loader Setup
let sharedDracoLoader: DRACOLoader | null = null;

function getDracoLoader(): DRACOLoader {
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath(`${import.meta.env.BASE_URL}draco/gltf/`);
  }
  return sharedDracoLoader;
}
// #endregion

// ======================== PARSING & INSTANCING ======================== \\
// #region Parsing & Instancing
export async function parseDragonRealmModelGlb(
  id: DragonRealmModelId,
  bytes: ArrayBuffer
): Promise<IDragonRealmModelAsset> {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(getDracoLoader());
  const gltf = await loader.parseAsync(bytes, '');

  let meshCount = 0;
  gltf.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      meshCount++;
      mesh.frustumCulled = true;
    }
  });
  if (meshCount === 0) {
    throw new InfrastructureCorruptedException(`Dragon realm model '${id}' contains no meshes.`);
  }

  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  return {
    id,
    scene: gltf.scene,
    bounds: {
      min: box.min.clone(),
      max: box.max.clone(),
      size,
      center,
    },
  };
}

/**
 * Summary: Creates a grounded clone centered at (X=0, Z=0) with its base resting cleanly at Y=0.
 */
export function createDragonRealmModelInstance(
  asset: IDragonRealmModelAsset,
  options: IDragonRealmInstanceOptions = {}
): THREE.Group {
  const scale = options.scale ?? 1;
  const castShadow = options.castShadow ?? false;
  const receiveShadow = options.receiveShadow ?? false;
  const yawOffset = options.yawOffset ?? 0;

  const root = new THREE.Group();
  root.name = `dragon-realm-model-${asset.id}`;

  const pivot = new THREE.Group();
  if (yawOffset !== 0) {
    pivot.rotation.y = yawOffset;
  }

  const clone = asset.scene.clone(true);
  clone.position.set(
    -asset.bounds.center.x,
    -asset.bounds.min.y,
    -asset.bounds.center.z
  );
  clone.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
    }
  });

  pivot.add(clone);
  root.add(pivot);
  root.scale.setScalar(scale);
  return root;
}
// #endregion

// ======================== LIBRARY CACHE ======================== \\
// #region Library Cache
const loadedAssets = new Map<DragonRealmModelId, IDragonRealmModelAsset>();
const pendingLoads = new Map<DragonRealmModelId, Promise<IDragonRealmModelAsset>>();

export const fetchDragonRealmModelFromServer: DragonRealmModelFetcher = (id) => {
  const relPath = DRAGON_REALM_MODEL_PATHS[id];
  const encoded = relPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return fetchAssetBytes(`${import.meta.env.BASE_URL}${encoded}`, `Dragon realm model '${id}'`);
};

export function loadDragonRealmModel(
  id: DragonRealmModelId,
  fetcher: DragonRealmModelFetcher = fetchDragonRealmModelFromServer
): Promise<IDragonRealmModelAsset> {
  const cached = loadedAssets.get(id);
  if (cached) return Promise.resolve(cached);
  const pending = pendingLoads.get(id);
  if (pending) return pending;

  const load = fetcher(id)
    .then((bytes) => parseDragonRealmModelGlb(id, bytes))
    .then((asset) => {
      loadedAssets.set(id, asset);
      return asset;
    });
  pendingLoads.set(id, load);
  load.catch(() => pendingLoads.delete(id));
  return load;
}

export function preloadDragonRealmModels(
  fetcher?: DragonRealmModelFetcher
): Promise<IDragonRealmModelAsset[]> {
  return Promise.all(DRAGON_REALM_MODEL_IDS.map((id) => loadDragonRealmModel(id, fetcher)));
}

export function isDragonRealmModelLoaded(id: DragonRealmModelId): boolean {
  return loadedAssets.has(id);
}

export function getLoadedDragonRealmModel(id: DragonRealmModelId): IDragonRealmModelAsset {
  const asset = loadedAssets.get(id);
  if (!asset) {
    throw new InfrastructureCorruptedException(
      `Dragon realm model '${id}' was used before it finished loading.`
    );
  }
  return asset;
}
// #endregion
