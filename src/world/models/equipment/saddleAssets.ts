// ============================================================================
// MODULE: World / Models / Equipment / Saddle Assets
// DESIGN: Asset library (cache + async loading), the same shape as floraAssets and animalModelAssets
// SUMMARY: Downloads the two saddle GLBs from /models/equipment, decodes them with saddleGlb and
//          hands the mesh and a texture URL out synchronously once loaded. Builds no meshes.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { InfrastructureCorruptedException } from '../../../core/AppException';
import { decodeSaddleGlb, type ISaddleModelData } from './saddleGlb';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** Summary: Every saddle model shipped as a GLB under /models/equipment/. */
export type SaddleModelId = 'saddle' | 'western-saddle';

/** Summary: All saddle ids, in load order. */
export const SADDLE_MODEL_IDS: readonly SaddleModelId[] = ['western-saddle', 'saddle'];

/** Summary: Fetches the raw bytes of one saddle GLB. */
export type SaddleModelFetcher = (id: SaddleModelId) => Promise<ArrayBuffer>;
// #endregion

// ======================== LIBRARY ======================== \\
// #region Library
const loadedModels = new Map<SaddleModelId, ISaddleModelData>();
const pendingLoads = new Map<SaddleModelId, Promise<ISaddleModelData>>();
const textureUrls = new Map<SaddleModelId, string>();

/** Summary: Default fetcher: GET /models/equipment/<id>.glb from the app's base URL. */
export const fetchSaddleModelFromServer: SaddleModelFetcher = async (id) => {
  const response = await fetch(`${import.meta.env.BASE_URL}models/equipment/${id}.glb`);
  if (!response.ok) {
    throw new InfrastructureCorruptedException(`Saddle model '${id}' could not be downloaded (${response.status}).`);
  }
  return response.arrayBuffer();
};

/**
 * Summary: Loads one saddle once; later calls share the same promise.
 * @param id Saddle to load.
 * @param fetcher Byte source (the server by default; tests read from disk).
 * @throws InfrastructureCorruptedException when the download or the file format is wrong.
 */
export function loadSaddleModel(id: SaddleModelId, fetcher: SaddleModelFetcher = fetchSaddleModelFromServer): Promise<ISaddleModelData> {
  const pending = pendingLoads.get(id);
  if (pending) return pending;
  const load = fetcher(id)
    .then((bytes) => decodeSaddleGlb(bytes))
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
 * Summary: Starts loading every saddle.
 * @param fetcher Byte source (the server by default).
 * @returns Resolves when all saddles are loaded.
 */
export function preloadAllSaddleModels(fetcher?: SaddleModelFetcher): Promise<ISaddleModelData[]> {
  return Promise.all(SADDLE_MODEL_IDS.map((id) => loadSaddleModel(id, fetcher)));
}

/**
 * Summary: Returns a loaded saddle for the synchronous saddle factories.
 * @throws InfrastructureCorruptedException when the saddle was not loaded first.
 */
export function getLoadedSaddleModel(id: SaddleModelId): ISaddleModelData {
  const model = loadedModels.get(id);
  if (!model) {
    throw new InfrastructureCorruptedException(`Saddle model '${id}' was used before it finished loading.`);
  }
  return model;
}

/** Summary: Returns a URL an Image can load for the saddle's texture (created once, kept for the page's life). */
export function getSaddleTextureUrl(id: SaddleModelId): string {
  const cached = textureUrls.get(id);
  if (cached) return cached;
  const { texture } = getLoadedSaddleModel(id);
  const url = URL.createObjectURL(new Blob([texture.data as BlobPart], { type: texture.mimeType }));
  textureUrls.set(id, url);
  return url;
}
// #endregion
