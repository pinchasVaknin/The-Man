// ============================================================================
// MODULE: Test Support / Saddle Models For Tests
// DESIGN: Single seam that makes the saddle GLB models available to node tests
// SUMMARY: Loads both saddles from public/models/equipment through the real runtime decoder,
//          reading the files from disk instead of over HTTP.
// ============================================================================

// ======================== IMPORTS ======================== \
// #region Imports
import { readFile } from 'node:fs/promises';
import { preloadAllSaddleModels, type SaddleModelId } from '../world/models/equipment/saddleAssets';
// #endregion

// ======================== PRELOAD ======================== \
// #region Preload
const MODELS_DIRECTORY = new URL('../../public/models/equipment/', import.meta.url);

async function readModelFromDisk(id: SaddleModelId): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`${id}.glb`, MODELS_DIRECTORY));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Summary: Makes both saddles available to the synchronous saddle factories in tests. */
export async function preloadSaddleModelsForTests(): Promise<void> {
  await preloadAllSaddleModels(readModelFromDisk);
}
// #endregion
