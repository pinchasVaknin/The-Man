// ============================================================================
// MODULE: World / Models / Vehicles / Ship Assets
// DESIGN: Asset library (cache + async loading) over ship.glb via GLTFLoader,
//         matching archeryTargetAssets and statueAssets.
// SUMMARY: Downloads /models/vehicles/ship.glb, parses its static mesh and
//          hull/deck bounds, caches the template, and produces bow-forward (-Z),
//          deck-aligned, scaled instances on demand.
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
/** Summary: Axis-aligned bounds of the parsed ship template in raw GLB units. */
export interface IShipModelBounds {
  readonly min: THREE.Vector3;
  readonly max: THREE.Vector3;
  readonly size: THREE.Vector3;
  readonly center: THREE.Vector3;
}

/** Summary: Decoded ship GLB template ready to clone into the world. */
export interface IShipModelAsset {
  readonly scene: THREE.Group;
  readonly bounds: IShipModelBounds;
}

/** Summary: Options for instantiating a scaled, deck-aligned ship hull/rigging clone. */
export interface IShipModelInstanceOptions {
  readonly scale?: number;
  readonly deckAlignFractionY?: number;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
}

/** Summary: Fetches the raw bytes of the ship GLB file. */
export type ShipModelFetcher = () => Promise<ArrayBuffer>;

/** Summary: Asset filename inside /models/vehicles/. */
export const SHIP_MODEL_FILE_NAME = 'ship.glb';

/**
 * Summary: Baseline uniform scale converting raw unit-normalized ship.glb (~0.98m long)
 *          to match SAILABLE_SHIP_INITIAL_POS dimensions (~25m overall length).
 */
export const SHIP_GLB_BASE_SCALE = 25.5;

/**
 * Summary: Measured local Y of main deck surface inside raw unit ship.glb (median ~0.175).
 */
export const SHIP_GLB_DECK_FRACTION_Y = 0.175;
// #endregion

// ======================== PARSING ======================== \\
// #region Parsing
/**
 * Summary: Parses the ship GLB and measures its local bounding box.
 * @param bytes GLB file contents.
 * @returns Decoded template and measured bounds.
 * @throws InfrastructureCorruptedException when the GLB contains no renderable mesh.
 */
export async function parseShipModelGlb(bytes: ArrayBuffer): Promise<IShipModelAsset> {
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  let meshCount = 0;
  gltf.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      meshCount++;
    }
  });
  if (meshCount === 0) {
    throw new InfrastructureCorruptedException('Ship model contains no meshes.');
  }

  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const deckOffsetY = box.min.y + size.y * SHIP_GLB_DECK_FRACTION_Y;
  const smooth01 = (e0: number, e1: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };

  // Raise overhanging aft spanker boom & lower sail hem smoothly upward (+2.55m) above the 2F helm sightline
  // while leaving the hull, quarterdeck, stern railing (by <= 3.1m), and main masts untouched.
  gltf.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    let modified = false;
    for (let i = 0; i < pos.count; i++) {
      const bx = -(pos.getZ(i) - center.z) * SHIP_GLB_BASE_SCALE;
      const by = (pos.getY(i) - deckOffsetY) * SHIP_GLB_BASE_SCALE;
      const bz = (pos.getX(i) - center.x) * SHIP_GLB_BASE_SCALE;
      if (bz > 4.35 && by > 3.12 && Math.abs(bx) < 1.45) {
        const aftW = smooth01(4.35, 6.1, bz);
        const heightW = smooth01(3.12, 3.55, by);
        const centerW = 1.0 - smooth01(0.95, 1.45, Math.abs(bx));
        const liftW = aftW * heightW * centerW;
        if (liftW > 0.0001) {
          pos.setY(i, pos.getY(i) + (2.55 * liftW) / SHIP_GLB_BASE_SCALE);
          modified = true;
        }
      }
    }
    if (modified) {
      pos.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    }
  });

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
 * Summary: Creates a ship clone oriented with bow toward -Z (`rotation.y = -PI/2` from raw -X bow),
 *          centered horizontally at X=0, Z=0, and shifted vertically so its main deck sits at Y=0.
 */
export function createShipModelInstance(
  asset: IShipModelAsset,
  options: IShipModelInstanceOptions = {}
): THREE.Group {
  const scale = options.scale ?? SHIP_GLB_BASE_SCALE;
  const deckFracY = options.deckAlignFractionY ?? SHIP_GLB_DECK_FRACTION_Y;
  const castShadow = options.castShadow ?? false;
  const receiveShadow = options.receiveShadow ?? false;

  const root = new THREE.Group();
  root.name = 'ship-glb';

  // Rotate -90 deg around Y so the raw -X narrow bow aims along -Z (local forward in sailableShipSystem)
  const yawPivot = new THREE.Group();
  yawPivot.rotation.y = -Math.PI / 2;

  const clone = asset.scene.clone(true);
  const deckOffsetY = asset.bounds.min.y + asset.bounds.size.y * deckFracY;
  clone.position.set(
    -asset.bounds.center.x,
    -deckOffsetY,
    -asset.bounds.center.z
  );
  clone.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
    }
  });

  yawPivot.add(clone);
  root.add(yawPivot);
  root.scale.setScalar(scale);
  return root;
}
// #endregion

// ======================== LIBRARY ======================== \\
// #region Library
let loadedShipAsset: IShipModelAsset | null = null;
let pendingShipLoad: Promise<IShipModelAsset> | null = null;

/** Summary: Default fetcher: GET /models/vehicles/ship.glb from the app's base URL. */
export const fetchShipModelFromServer: ShipModelFetcher = () => {
  return fetchAssetBytes(
    `${import.meta.env.BASE_URL}models/vehicles/${SHIP_MODEL_FILE_NAME}`,
    'Ship model'
  );
};

/**
 * Summary: Loads the ship GLB template once; subsequent calls share the cached promise.
 * @param fetcher Byte source (the server by default; unit tests read from disk).
 * @throws InfrastructureCorruptedException when download or parsing fails.
 */
export function loadShipModel(
  fetcher: ShipModelFetcher = fetchShipModelFromServer
): Promise<IShipModelAsset> {
  if (loadedShipAsset) return Promise.resolve(loadedShipAsset);
  if (pendingShipLoad) return pendingShipLoad;

  const load = fetcher()
    .then((bytes) => parseShipModelGlb(bytes))
    .then((asset) => {
      loadedShipAsset = asset;
      return asset;
    });
  pendingShipLoad = load;
  load.catch(() => {
    pendingShipLoad = null;
  });
  return load;
}

/**
 * Summary: Starts preloading the ship GLB template during application bootstrap.
 */
export function preloadShipModel(fetcher?: ShipModelFetcher): Promise<IShipModelAsset> {
  return loadShipModel(fetcher);
}

/** Summary: True once the ship GLB template has finished loading. */
export function isShipModelLoaded(): boolean {
  return loadedShipAsset !== null;
}

/**
 * Summary: Returns the loaded ship GLB template synchronously.
 * @throws InfrastructureCorruptedException when accessed before loading completes.
 */
export function getLoadedShipModel(): IShipModelAsset {
  if (!loadedShipAsset) {
    throw new InfrastructureCorruptedException('Ship model was used before it finished loading.');
  }
  return loadedShipAsset;
}
// #endregion
