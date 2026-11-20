// ============================================================================
// MODULE: Test Support / Character Models For Tests
// DESIGN: Single seam that makes the character GLB models available to node tests
// SUMMARY: Loads the dwarf and the monk from public/models/characters through the real runtime decoder,
//          reading the files from disk instead of over HTTP.
// ============================================================================

// ======================== IMPORTS ======================== \
// #region Imports
import { readFile } from 'node:fs/promises';
import { preloadAllCharacterModels, type CharacterModelId } from '../world/models/Characters/characterAssets';
// #endregion

// ======================== PRELOAD ======================== \
// #region Preload
const MODELS_DIRECTORY = new URL('../../public/models/characters/', import.meta.url);

async function readModelFromDisk(id: CharacterModelId): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`${id}.glb`, MODELS_DIRECTORY));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/**
 * Summary: Makes both characters available to the synchronous rig factories in tests.
 * Design: GLTFLoader expects a browser `self`; node has no image decoder, so the loader's
 *         "Couldn't load texture" report is expected here and muted (textures fall back to one pixel).
 */
export async function preloadCharacterModelsForTests(): Promise<void> {
  const globals = globalThis as { self?: unknown };
  globals.self ??= globalThis;
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (String(args[0]).includes("Couldn't load texture")) return;
    originalError(...args);
  };
  try {
    await preloadAllCharacterModels(readModelFromDisk);
  } finally {
    console.error = originalError;
  }
}
// #endregion
