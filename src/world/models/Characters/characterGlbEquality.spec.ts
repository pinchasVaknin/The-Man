// ============================================================================
// MODULE: World / Models / Characters / Character GLB Equality Tests
// DESIGN: Each character GLB is read by the runtime decoder (parseCharacterModelGlb) and must equal what
//         the character's base64 pack unpacks to today: geometry, rig arrays and every animation track
// SUMMARY: Proves the move from base64 to GLB changes no vertex, weight, joint or keyframe, and that the
//          WebP texture bytes are the same. Removed together with the base64 data modules.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type * as THREE from 'three';
import { parseCharacterModelGlb, type CharacterModelId } from './characterAssets';
import { readGlb } from '../glbContainer';
import { DWARF_TEX_B64, unpackDwarfWarriorAssetsSync } from './DwarfWarrior_Complete';
import { MONK_TEX_B64, unpackWarriorMonkAssetsSync } from './WarriorMonk_Complete';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
(globalThis as { self?: unknown }).self ??= globalThis;

interface IExpectedAssets {
  readonly geometry: THREE.BufferGeometry;
  readonly parents: Int8Array;
  readonly restTranslations: Float32Array;
  readonly restRotations: Float32Array;
  readonly inverseBindMatrices: Float32Array;
  readonly clips: Record<string, THREE.AnimationClip>;
}

const CHARACTERS: ReadonlyArray<readonly [CharacterModelId, () => IExpectedAssets, string]> = [
  ['dwarf-warrior', () => unpackDwarfWarriorAssetsSync(), DWARF_TEX_B64],
  ['warrior-monk', () => unpackWarriorMonkAssetsSync(), MONK_TEX_B64],
];

const ATTRIBUTES = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'] as const;

async function readCharacterGlb(id: string): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`../../../../public/models/characters/${id}.glb`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function dataUriBytes(uri: string): Uint8Array {
  const binary = atob(uri.slice(uri.indexOf(',') + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Compares number arrays value by value; negative and positive zero count as equal. */
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
for (const [id, unpack, textureUri] of CHARACTERS) {
  test(`parseCharacterModelGlb_When${id}GlbIsRead_ShouldEqualItsPackedDataExactly`, async () => {
    const bytes = await readCharacterGlb(id);

    const asset = await withoutTextureDecodeNoise(() => parseCharacterModelGlb(id, bytes));

    const expected = unpack();
    for (const name of ATTRIBUTES) {
      const actualAttribute = asset.geometry.getAttribute(name);
      const expectedAttribute = expected.geometry.getAttribute(name);
      assertSameNumbers(actualAttribute.array, expectedAttribute.array, `geometry ${name}`);
      assert.equal(actualAttribute.normalized, expectedAttribute.normalized, `geometry ${name} normalized flag`);
    }
    assertSameNumbers(asset.geometry.index!.array, expected.geometry.index!.array, 'geometry index');
    for (const name of ['parents', 'restTranslations', 'restRotations', 'inverseBindMatrices'] as const) {
      assertSameNumbers(asset[name], expected[name], name);
    }

    assert.deepEqual(Object.keys(asset.clips), Object.keys(expected.clips), 'clip names and order');
    for (const [clipName, expectedClip] of Object.entries(expected.clips)) {
      const actualClip = asset.clips[clipName];
      assert.equal(actualClip.duration, expectedClip.duration, `${clipName} duration`);
      assert.equal(actualClip.tracks.length, expectedClip.tracks.length, `${clipName} track count`);
      const actualTracks = new Map(actualClip.tracks.map((track) => [track.name, track]));
      for (const expectedTrack of expectedClip.tracks) {
        const actualTrack = actualTracks.get(expectedTrack.name);
        assert.ok(actualTrack, `${clipName}: track ${expectedTrack.name} exists`);
        assertSameNumbers(actualTrack.times, expectedTrack.times, `${clipName} ${expectedTrack.name} times`);
        assertSameNumbers(actualTrack.values, expectedTrack.values, `${clipName} ${expectedTrack.name} values`);
      }
    }

    const glb = readGlb(bytes, 'Character model');
    const json = glb.json as { images: Array<{ bufferView: number; mimeType: string }>; bufferViews: Array<{ byteOffset: number; byteLength: number }> };
    assert.equal(json.images[0].mimeType, 'image/webp');
    assert.deepEqual(new Uint8Array(glb.viewBytes(json.bufferViews[json.images[0].bufferView] as never)), dataUriBytes(textureUri));
  });
}
// #endregion
