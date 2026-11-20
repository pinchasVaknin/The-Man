// ============================================================================
// MODULE: World / Models / Animals / Clip-Rig GLB Tests
// DESIGN: Equality tests: each shipped GLB must decode to exactly what the animal's packed data
//         module unpacks to today, so the data can be removed without changing a vertex or a pose
// SUMMARY: Compares the seven GLBs against their base64 packs (every rig array and the texture
//          bytes) and checks the encoder round trip and the corrupt-file guards.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeClipRigGlb, encodeClipRigGlb } from './clipRigGlb';
import type { IClipRigModelData } from '../animalModelAssets';
import { InfrastructureCorruptedException } from '../../../core/AppException';
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
const ANIMALS: ReadonlyArray<readonly [string, () => IClipRigModelData, string]> = [
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

const TEXTURE_URI = 'data:image/jpeg;base64,/9j/4AAQ';

function buildTinyRig(clipJointRotations: number[]): IClipRigModelData {
  return {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
    skinIndices: new Uint8Array([0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0]),
    skinWeights: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 0.5, 0.5, 0, 0]),
    indices: new Uint16Array([0, 1, 2]),
    parents: new Int8Array([-1, 0]),
    restTranslations: new Float32Array([0, 0, 0, 0, 1, 0]),
    restRotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
    inverseBindMatrices: new Float32Array(32),
    clipDurations: new Float32Array([1]),
    clipRootTranslations: new Float32Array([0, 0, 0, 0, 0, 1]),
    clipJointRotations: new Float32Array(clipJointRotations),
  };
}

async function readAnimalGlb(fileName: string): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`../../../../public/models/animals/${fileName}.glb`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function dataUriBytes(uri: string): Uint8Array {
  const binary = atob(uri.slice(uri.indexOf(',') + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
// #endregion

// ======================== TESTS ======================== \\
// #region Equality With The Packed Data
for (const [fileName, unpack, texture] of ANIMALS) {
  test(`decodeClipRigGlb_When${fileName}GlbIsRead_ShouldEqualItsPackedDataExactly`, async () => {
    const decoded = decodeClipRigGlb(await readAnimalGlb(fileName));
    const expected = unpack();

    for (const name of RIG_ARRAYS) {
      assert.deepEqual(decoded.rig[name], expected[name], name);
    }
    assert.deepEqual(decoded.texture.data, dataUriBytes(texture));
    assert.equal(decoded.texture.mimeType, 'image/jpeg');
  });
}
// #endregion

// #region Encoder And Guards
test('encodeClipRigGlb_WhenRoundTripped_ShouldReturnTheSameRig', () => {
  const rig = buildTinyRig([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);

  const decoded = decodeClipRigGlb(encodeClipRigGlb(rig, 2, TEXTURE_URI));

  for (const name of RIG_ARRAYS) assert.deepEqual(decoded.rig[name], rig[name], name);
});

test('encodeClipRigGlb_WhenARotationIsOffTheInt16Grid_ShouldThrowInfrastructureCorrupted', () => {
  const rig = buildTinyRig([0.123456789, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);

  assert.throws(() => encodeClipRigGlb(rig, 2, TEXTURE_URI), InfrastructureCorruptedException);
});

test('decodeClipRigGlb_WhenBytesAreNotAGlb_ShouldThrowInfrastructureCorrupted', () => {
  assert.throws(() => decodeClipRigGlb(new ArrayBuffer(64)), InfrastructureCorruptedException);
});
// #endregion
