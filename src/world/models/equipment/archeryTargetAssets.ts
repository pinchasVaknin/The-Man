// ============================================================================
// MODULE: World / Models / Equipment / Archery Target Assets
// DESIGN: Asset library (cache + async loading) over Archery target.glb via GLTFLoader,
//         matching statueAssets and characterAssets.
// SUMMARY: Downloads /models/equipment/Archery%20target.glb, parses its static mesh and
//          bounds, caches the template, and creates grounded, scaled instances on demand.
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
/** Summary: Axis-aligned bounds of the parsed archery target template in local model units. */
export interface IArcheryTargetBounds {
  readonly min: THREE.Vector3;
  readonly max: THREE.Vector3;
  readonly size: THREE.Vector3;
  readonly center: THREE.Vector3;
}

/** Summary: Decoded static archery target GLB template ready to clone into the scene. */
export interface IArcheryTargetModelAsset {
  readonly scene: THREE.Group;
  readonly bounds: IArcheryTargetBounds;
}

/** Summary: Options for instantiating an archery target mesh in the courtyard. */
export interface IArcheryTargetInstanceOptions {
  readonly scale?: number;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
}

/** Summary: Fetches the raw bytes of the Archery target GLB file. */
export type ArcheryTargetModelFetcher = () => Promise<ArrayBuffer>;

/** Summary: Relative asset filename inside /models/equipment/. */
export const ARCHERY_TARGET_FILE_NAME = 'Archery target.glb';
// #endregion

// ======================== PARSING ======================== \\
// #region Parsing
/**
 * Summary: Parses the Archery target GLB and measures its local bounding box.
 * @param bytes GLB file contents.
 * @returns The decoded template and its measured bounds.
 * @throws InfrastructureCorruptedException when the GLB contains no renderable mesh.
 */
export async function parseArcheryTargetModelGlb(
  bytes: ArrayBuffer
): Promise<IArcheryTargetModelAsset> {
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  let meshCount = 0;
  gltf.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      meshCount++;
    }
  });
  if (meshCount === 0) {
    throw new InfrastructureCorruptedException('Archery target model contains no meshes.');
  }
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  return {
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
 * Summary: Creates a grounded clone centered at X=0, Z=0 with its easel feet resting at Y=0.
 * Design: Reuses cached GPU geometries and PBR textures from the parsed template so placing all 4
 *         temple targets duplicates zero buffers in memory.
 */
export function createArcheryTargetModelInstance(
  asset: IArcheryTargetModelAsset,
  options: IArcheryTargetInstanceOptions = {}
): THREE.Group {
  const scale = options.scale ?? 1;
  const castShadow = options.castShadow ?? false;
  const receiveShadow = options.receiveShadow ?? false;

  const root = new THREE.Group();
  root.name = 'archery-target-glb';

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
let loadedAsset: IArcheryTargetModelAsset | null = null;
let pendingLoad: Promise<IArcheryTargetModelAsset> | null = null;

/** Summary: Default fetcher: GET /models/equipment/Archery%20target.glb from the app's base URL. */
export const fetchArcheryTargetModelFromServer: ArcheryTargetModelFetcher = () => {
  const encodedName = encodeURIComponent(ARCHERY_TARGET_FILE_NAME);
  return fetchAssetBytes(
    `${import.meta.env.BASE_URL}models/equipment/${encodedName}`,
    'Archery target model'
  );
};

/**
 * Summary: Loads the archery target template once; later calls share the same promise.
 * @param fetcher Byte source (the server by default; tests read from disk).
 * @throws InfrastructureCorruptedException when the download or the GLB file is invalid.
 */
export function loadArcheryTargetModel(
  fetcher: ArcheryTargetModelFetcher = fetchArcheryTargetModelFromServer
): Promise<IArcheryTargetModelAsset> {
  if (loadedAsset) return Promise.resolve(loadedAsset);
  if (pendingLoad) return pendingLoad;

  const load = fetcher()
    .then((bytes) => parseArcheryTargetModelGlb(bytes))
    .then((asset) => {
      loadedAsset = asset;
      return asset;
    });
  pendingLoad = load;
  load.catch(() => {
    pendingLoad = null;
  });
  return load;
}

/**
 * Summary: Starts downloading the archery target GLB template.
 * @param fetcher Byte source (the server by default).
 */
export function preloadArcheryTargetModel(
  fetcher?: ArcheryTargetModelFetcher
): Promise<IArcheryTargetModelAsset> {
  return loadArcheryTargetModel(fetcher);
}

/** Summary: True once the archery target GLB is loaded and ready for synchronous instantiation. */
export function isArcheryTargetModelLoaded(): boolean {
  return loadedAsset !== null;
}

/**
 * Summary: Returns the loaded archery target template for synchronous instantiation.
 * @throws InfrastructureCorruptedException when called before loading completes.
 */
export function getLoadedArcheryTargetModel(): IArcheryTargetModelAsset {
  if (!loadedAsset) {
    throw new InfrastructureCorruptedException(
      'Archery target model was used before it finished loading.'
    );
  }
  return loadedAsset;
}
// #endregion
