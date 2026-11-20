// ============================================================================
// MODULE: Test Support / Flora Models For Tests
// DESIGN: Single seam that makes the plant GLB models available to node tests
// SUMMARY: Loads every plant from public/models/plants through the real runtime decoder,
//          reading the files from disk instead of over HTTP.
// ============================================================================

// ======================== IMPORTS ======================== \
// #region Imports
import { readFile } from 'node:fs/promises';
import { FLORA_MODEL_FILE_NAMES, preloadAllFloraModels } from '../world/models/plants/floraAssets';
import type { FloraKey } from '../world/models/plants/floraRuntime';
// #endregion

// ======================== PRELOAD ======================== \
// #region Preload
const MODELS_DIRECTORY = new URL('../../public/models/plants/', import.meta.url);

async function readModelFromDisk(id: FloraKey): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`${FLORA_MODEL_FILE_NAMES[id]}.glb`, MODELS_DIRECTORY));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Summary: Makes every plant available to the synchronous vegetation builders in tests. */
export async function preloadFloraModelsForTests(): Promise<void> {
  await preloadAllFloraModels(readModelFromDisk);
}
// #endregion
