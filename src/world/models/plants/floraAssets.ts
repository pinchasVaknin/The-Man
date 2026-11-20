// ============================================================================
// MODULE: World / Models / Plants / Flora Assets
// DESIGN: Asset library (cache + async loading), the same shape as animalModelAssets
// SUMMARY: Downloads the plant GLBs from /models/plants, decodes them with floraGlb, and hands
//          the submeshes and texture URLs out synchronously once loaded. Builds no meshes.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { InfrastructureCorruptedException } from '../../../core/AppException';
import { decodeFloraGlb, type IFloraModelData } from './floraGlb';
import type { FloraKey, FloraQuality, FloraSubmeshData } from './floraRuntime';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** Summary: Fetches the raw bytes of one plant GLB. */
export type FloraModelFetcher = (id: FloraKey) => Promise<ArrayBuffer>;

/** Summary: Every plant, in load order (trees first: they are the biggest and most visible). */
export const FLORA_MODEL_IDS: readonly FloraKey[] = [
  'animtree',
  'animtree_wide',
  'animtree_compact',
  'pinetree',
  'oakgreen',
  'oakyellow',
  'forestbush',
  'forestfern',
  'cornflower',
  'whiteflower',
];

/** Summary: File name (without extension) of each plant under /models/plants/. */
export const FLORA_MODEL_FILE_NAMES: Readonly<Record<FloraKey, string>> = {
  animtree: 'anim-tree',
  animtree_wide: 'anim-tree-wide',
  animtree_compact: 'anim-tree-compact',
  pinetree: 'pine-tree',
  oakgreen: 'oak-green',
  oakyellow: 'oak-yellow',
  forestbush: 'forest-bush',
  forestfern: 'forest-fern',
  cornflower: 'cornflower',
  whiteflower: 'white-flower',
};
// #endregion

// ======================== LIBRARY ======================== \\
// #region Library
const loadedModels = new Map<FloraKey, IFloraModelData>();
const pendingLoads = new Map<FloraKey, Promise<IFloraModelData>>();
const textureUrls = new Map<string, string>();

/** Summary: Default fetcher: GET /models/plants/<file>.glb from the app's base URL. */
export const fetchFloraModelFromServer: FloraModelFetcher = async (id) => {
  const response = await fetch(`${import.meta.env.BASE_URL}models/plants/${FLORA_MODEL_FILE_NAMES[id]}.glb`);
  if (!response.ok) {
    throw new InfrastructureCorruptedException(`Plant model '${id}' could not be downloaded (${response.status}).`);
  }
  return response.arrayBuffer();
};

/**
 * Summary: Loads one plant once; later calls share the same promise.
 * @param id Plant to load.
 * @param fetcher Byte source (the server by default; tests read from disk).
 * @returns The decoded plant.
 * @throws InfrastructureCorruptedException when the download or the file format is wrong.
 */
export function loadFloraModel(id: FloraKey, fetcher: FloraModelFetcher = fetchFloraModelFromServer): Promise<IFloraModelData> {
  const pending = pendingLoads.get(id);
  if (pending) return pending;
  const load = fetcher(id)
    .then((bytes) => decodeFloraGlb(bytes))
    .then((model) => {
      loadedModels.set(id, model);
      return model;
    });
  pendingLoads.set(id, load);
  // A failed download may be retried by a later call.
  load.catch(() => pendingLoads.delete(id));
  return load;
}

/**
 * Summary: Starts loading every plant.
 * @param fetcher Byte source (the server by default).
 * @returns Resolves when all plants are loaded.
 */
export function preloadAllFloraModels(fetcher?: FloraModelFetcher): Promise<IFloraModelData[]> {
  return Promise.all(FLORA_MODEL_IDS.map((id) => loadFloraModel(id, fetcher)));
}

/** Summary: True once the plant is loaded and can be used synchronously. */
export function isFloraModelLoaded(id: FloraKey): boolean {
  return loadedModels.has(id);
}

function requireLoaded(id: FloraKey): IFloraModelData {
  const model = loadedModels.get(id);
  if (!model) {
    throw new InfrastructureCorruptedException(`Plant model '${id}' was used before it finished loading.`);
  }
  return model;
}

/**
 * Summary: Returns fresh copies of a plant's submeshes, like the old unpackFloraBundle did.
 * Design: Callers hand these arrays to geometries and may modify them, so the cached originals
 *         are never shared.
 * @throws InfrastructureCorruptedException when the plant was not loaded first.
 */
export function getFloraSubmeshes(id: FloraKey, quality: FloraQuality): FloraSubmeshData[] {
  const model = requireLoaded(id);
  const source = quality === 'low' ? model.low : model.high;
  return source.map((sub) => ({
    matId: sub.matId,
    positions: sub.positions.slice(),
    normals: sub.normals.slice(),
    uvs: sub.uvs.slice(),
    indices: sub.indices.slice(),
  }));
}

/**
 * Summary: Returns a URL an Image can load for one of a plant's textures.
 * Design: One object URL per plant texture, created on first use and kept for the page's life.
 * @throws InfrastructureCorruptedException when the plant was not loaded or has no such texture.
 */
export function getFloraTextureUrl(id: FloraKey, matId: number): string {
  const key = `${id}:${matId}`;
  const cached = textureUrls.get(key);
  if (cached) return cached;
  const image = requireLoaded(id).textures[matId];
  if (!image) throw new InfrastructureCorruptedException(`Plant model '${id}' has no texture for material ${matId}.`);
  const url = URL.createObjectURL(new Blob([image.data as BlobPart], { type: image.mimeType }));
  textureUrls.set(key, url);
  return url;
}
// #endregion
