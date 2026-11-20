// ============================================================================
// MODULE: World / Models / Animals / Animal GLB Equality Tests
// DESIGN: Each of the seven new animal GLBs is read by the runtime decoder (parseAnimalModelGlb) and
//         must equal what the animal's base64 pack unpacks to today, array by array
// SUMMARY: Proves the move from base64 to GLB changes no vertex, weight, joint or baked pose, and that
//          the JPEG texture bytes are the same. Removed together with the base64 data modules.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseAnimalModelGlb, type AnimalModelId, type IClipRigModelData } from '../animalModelAssets';
import { readGlb } from '../glbContainer';
import { CAT_LION_EMBEDDED_PACK_B64, CAT_LION_EMBEDDED_TEXTURE_URI, unpackCatLionBundle } from './CatLion_Complete';
import { STAG_EMBEDDED_PACK_B64, STAG_EMBEDDED_TEXTURE_URI, unpackStagBundle } from './Stag_Complete';
import { DOVE_EMBEDDED_PACK_B64, DOVE_EMBEDDED_TEXTURE_URI, unpackDoveBundle } from './Dove_Complete';
import { HORSE_EMBEDDED_PACK_B64, HORSE_EMBEDDED_TEXTURE_URI, unpackHorseBundle } from './Horse_Complete';
import { DOLPHIN_PACK_B64, DOLPHIN_TEX_B64, unpackDolphinBundle } from './Dolphin_Complete';
import { HIPPO_PACK_B64, HIPPO_TEX_B64, unpackHippoBundle } from './Hippo_Complete';
import { KOIFISH_PACK_B64, KOIFISH_TEX_B64, unpackKoiFishBundle } from './KoiFish_Complete';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
(globalThis as { self?: unknown }).self ??= globalThis;

const ANIMALS: ReadonlyArray<readonly [AnimalModelId, () => IClipRigModelData, string]> = [
  ['cat-lion', () => unpackCatLionBundle(CAT_LION_EMBEDDED_PACK_B64), CAT_LION_EMBEDDED_TEXTURE_URI],
  ['stag', () => unpackStagBundle(STAG_EMBEDDED_PACK_B64), STAG_EMBEDDED_TEXTURE_URI],
  ['dove', () => unpackDoveBundle(DOVE_EMBEDDED_PACK_B64), DOVE_EMBEDDED_TEXTURE_URI],
  ['horse', () => unpackHorseBundle(HORSE_EMBEDDED_PACK_B64), HORSE_EMBEDDED_TEXTURE_URI],
  ['dolphin', () => unpackDolphinBundle(DOLPHIN_PACK_B64), DOLPHIN_TEX_B64],
  ['hippo', () => unpackHippoBundle(HIPPO_PACK_B64), HIPPO_TEX_B64],
  ['koi-fish', () => unpackKoiFishBundle(KOIFISH_PACK_B64), KOIFISH_TEX_B64],
];

const RIG_ARRAYS = [
  'positions', 'normals', 'uvs', 'skinIndices', 'skinWeights', 'indices', 'parents',
  'restTranslations', 'restRotations', 'inverseBindMatrices', 'clipDurations', 'clipRootTranslations', 'clipJointRotations',
] as const;

async function readAnimalGlb(id: string): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`../../../../public/models/animals/${id}.glb`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function dataUriBytes(uri: string): Uint8Array {
  const binary = atob(uri.slice(uri.indexOf(',') + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * Compares two number arrays value by value. Negative and positive zero count as equal: the loader
 * can turn a stored -0 into 0 in a few inverse-bind-matrix entries, which changes no skinning result.
 */
function assertSameNumbers(actual: ArrayLike<number>, expected: ArrayLike<number>, name: string): void {
  assert.equal(actual.length, expected.length, `${name}: length`);
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) assert.fail(`${name}[${i}]: ${actual[i]} !== ${expected[i]}`);
  }
}

/** Runs `action` with the loader's "Couldn't load texture" report muted: node has no image decoder. */
async function withoutTextureDecodeNoise<T>(action: () => Promise<T>): Promise<T> {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (String(args[0]).includes("Couldn't load texture")) return;
    originalError(...args);
  };
  try {
    return await action();
  } finally {
    console.error = originalError;
  }
}
// #endregion

// ======================== TESTS ======================== \\
// #region Equality With The Packed Data
for (const [id, unpack, textureUri] of ANIMALS) {
  test(`parseAnimalModelGlb_When${id}GlbIsRead_ShouldEqualItsPackedDataExactly`, async () => {
    const bytes = await readAnimalGlb(id);

    const asset = await withoutTextureDecodeNoise(() => parseAnimalModelGlb(id, bytes));

    const expected = unpack();
    assert.ok(asset.clipRig, 'a clip-driven animal decodes to a clip rig');
    for (const name of RIG_ARRAYS) {
      assertSameNumbers(asset.clipRig[name], expected[name], name);
    }
    const glb = readGlb(bytes, 'Animal model');
    const json = glb.json as { images: Array<{ bufferView: number; mimeType: string }>; bufferViews: Array<{ byteOffset: number; byteLength: number }> };
    assert.equal(json.images[0].mimeType, 'image/jpeg');
    assert.deepEqual(new Uint8Array(glb.viewBytes(json.bufferViews[json.images[0].bufferView] as never)), dataUriBytes(textureUri));
  });
}
// #endregion
