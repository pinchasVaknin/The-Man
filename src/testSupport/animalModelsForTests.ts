// ============================================================================
// MODULE: Test Support / Animal Models For Tests
// DESIGN: Single seam that makes the animal GLB models available to node tests
// SUMMARY: Loads every animal model from public/models/animals through the real runtime
//          decoder, reading the files from disk instead of over HTTP.
// ============================================================================

// ======================== IMPORTS ======================== \\
// #region Imports
import { readFile } from 'node:fs/promises';
import { preloadAllAnimalModels, type AnimalModelId } from '../world/models/animalModelAssets';
// #endregion

// ======================== PRELOAD ======================== \\
// #region Preload
const MODELS_DIRECTORY = new URL('../../public/models/animals/', import.meta.url);

async function readModelFromDisk(id: AnimalModelId): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`${id}.glb`, MODELS_DIRECTORY));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/**
 * Summary: Makes every animal model available to synchronous model factories in tests.
 * Design: GLTFLoader expects a browser `self`; node has no image decoder, so the loader's
 *         "Couldn't load texture" report is expected here and muted (textures stay empty).
 */
export async function preloadAnimalModelsForTests(): Promise<void> {
  const globals = globalThis as { self?: unknown };
  globals.self ??= globalThis;
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (String(args[0]).includes("Couldn't load texture")) return;
    originalError(...args);
  };
  try {
    await preloadAllAnimalModels(readModelFromDisk);
  } finally {
    console.error = originalError;
  }
}
// #endregion
