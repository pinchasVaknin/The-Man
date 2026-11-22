// ============================================================================
// MODULE: World / Models / Statues / Statue Assets
// DESIGN: Asset library (cache + async loading) over static statue GLBs via GLTFLoader,
//         matching the shape of animalModelAssets and characterAssets.
// SUMMARY: Downloads statue GLBs from /models/statues/, parses their static meshes and bounds,
//          caches templates, and creates grounded, scaled instances on demand.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { InfrastructureCorruptedException } from '../../../core/AppException';
import { fetchAssetBytes } from '../fetchAssetBytes';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Every static statue model shipped as a GLB file under /models/statues/. */
export type StatueModelId = 'ded_king_skelton';

/** Summary: All statue ids, in load order. */
export const STATUE_MODEL_IDS: readonly StatueModelId[] = ['ded_king_skelton'];

/** Summary: Axis-aligned bounds of a parsed statue template in local model units. */
export interface IStatueBounds {
  readonly min: THREE.Vector3;
  readonly max: THREE.Vector3;
  readonly size: THREE.Vector3;
  readonly center: THREE.Vector3;
}

/** Summary: A decoded static statue template ready to be cloned into the scene. */
export interface IStatueModelAsset {
  readonly id: StatueModelId;
  readonly scene: THREE.Group;
  readonly bounds: IStatueBounds;
}

/** Summary: Options for instantiating a loaded statue into a scene. */
export interface IStatueInstanceOptions {
  readonly scale?: number;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
}

/** Summary: Fetches the raw bytes of one statue GLB. */
export type StatueModelFetcher = (id: StatueModelId) => Promise<ArrayBuffer>;
// #endregion

// ======================== PARSING ======================== \\
// #region Parsing
/**
 * Summary: Parses one static statue GLB and measures its local bounding box.
 * @param id Statue id (for error messages).
 * @param bytes GLB file contents.
 * @returns The decoded statue template and its measured bounds.
 * @throws InfrastructureCorruptedException when the GLB contains no renderable mesh.
 */
export async function parseStatueModelGlb(
  id: StatueModelId,
  bytes: ArrayBuffer
): Promise<IStatueModelAsset> {
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  let meshCount = 0;
  gltf.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      meshCount++;
    }
  });
  if (meshCount === 0) {
    throw new InfrastructureCorruptedException(`Statue model '${id}' contains no meshes.`);
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
// #endregion

// ======================== INSTANCE FACTORY ======================== \\
// #region Instance Factory
/**
 * Summary: Creates a grounded clone of a loaded statue asset centered at X=0, Z=0 with its base at Y=0.
 * Design: Reuses the cached geometries and materials from the template so multiple placements or
 *         repeated lookups do not duplicate large vertex buffers in memory.
 */
export function createStatueModelInstance(
  asset: IStatueModelAsset,
  options: IStatueInstanceOptions = {}
): THREE.Group {
  const scale = options.scale ?? 1;
  const castShadow = options.castShadow ?? false;
  const receiveShadow = options.receiveShadow ?? false;

  const root = new THREE.Group();
  root.name = `statue-${asset.id}`;

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

  root.add(clone);
  root.scale.setScalar(scale);
  return root;
}
// #endregion

// ======================== LIBRARY ======================== \\
// #region Library
const loadedAssets = new Map<StatueModelId, IStatueModelAsset>();
const pendingLoads = new Map<StatueModelId, Promise<IStatueModelAsset>>();

/** Summary: Default fetcher: GET /models/statues/<id>.glb from the app's base URL. */
export const fetchStatueModelFromServer: StatueModelFetcher = (id) =>
  fetchAssetBytes(`${import.meta.env.BASE_URL}models/statues/${id}.glb`, `Statue model '${id}'`);

/**
 * Summary: Loads one statue once; later calls share the same promise.
 * @param id Statue to load.
 * @param fetcher Byte source (the server by default; tests read from disk).
 * @throws InfrastructureCorruptedException when the download or the GLB file is invalid.
 */
export function loadStatueModel(
  id: StatueModelId,
  fetcher: StatueModelFetcher = fetchStatueModelFromServer
): Promise<IStatueModelAsset> {
  const cached = loadedAssets.get(id);
  if (cached) return Promise.resolve(cached);
  const pending = pendingLoads.get(id);
  if (pending) return pending;

  const load = fetcher(id)
    .then((bytes) => parseStatueModelGlb(id, bytes))
    .then((asset) => {
      loadedAssets.set(id, asset);
      return asset;
    });
  pendingLoads.set(id, load);
  load.catch(() => pendingLoads.delete(id));
  return load;
}

/**
 * Summary: Starts loading every statue model.
 * @param fetcher Byte source (the server by default).
 */
export function preloadAllStatueModels(
  fetcher?: StatueModelFetcher
): Promise<IStatueModelAsset[]> {
  return Promise.all(STATUE_MODEL_IDS.map((id) => loadStatueModel(id, fetcher)));
}

/** Summary: True once the statue is loaded and can be instantiated synchronously. */
export function isStatueModelLoaded(id: StatueModelId): boolean {
  return loadedAssets.has(id);
}

/**
 * Summary: Returns a loaded statue template for synchronous instantiation.
 * @throws InfrastructureCorruptedException when the statue was not loaded first.
 */
export function getLoadedStatueModel(id: StatueModelId): IStatueModelAsset {
  const asset = loadedAssets.get(id);
  if (!asset) {
    throw new InfrastructureCorruptedException(
      `Statue model '${id}' was used before it finished loading.`
    );
  }
  return asset;
}
// #endregion
