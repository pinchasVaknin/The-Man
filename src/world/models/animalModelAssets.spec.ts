// ============================================================================
// MODULE: World / Models / Animal Model Assets Tests
// DESIGN: AAA tests for the GLB model library with an injected byte fetcher
// SUMMARY: Verifies the not-loaded guard, shared and retried loads, format checks and that
//          a loaded model decodes into the clip-rig or procedural layout.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getLoadedAnimalModel,
  isAnimalModelLoaded,
  loadAnimalModel,
  parseAnimalModelGlb,
  type AnimalModelId,
} from './animalModelAssets';
import { InfrastructureCorruptedException } from '../../core/AppException';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
(globalThis as { self?: unknown }).self ??= globalThis;

async function readModel(id: AnimalModelId): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`../../../public/models/animals/${id}.glb`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Builds a JSON-only GLB container around `json`. */
function buildGlb(json: object): ArrayBuffer {
  let text = JSON.stringify(json);
  while (text.length % 4 !== 0) text += ' ';
  const body = new TextEncoder().encode(text);
  const glb = new ArrayBuffer(12 + 8 + body.length);
  const view = new DataView(glb);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, glb.byteLength, true);
  view.setUint32(12, body.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(glb, 20).set(body);
  return glb;
}

async function withMutedTextureErrors<T>(run: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = original;
  }
}
// #endregion

// ======================== GUARD TESTS ======================== \\
// #region Guard Tests
test('getLoadedAnimalModel_WhenModelNotLoaded_ShouldThrowInfrastructureCorrupted', () => {
  // Arrange & Act & Assert
  assert.equal(isAnimalModelLoaded('wolf'), false);
  assert.throws(() => getLoadedAnimalModel('wolf'), InfrastructureCorruptedException);
});

test('parseAnimalModelGlb_WhenGlbHasNoAnimalFormat_ShouldReject', async () => {
  // Arrange
  const plain = buildGlb({ asset: { version: '2.0' } });

  // Act & Assert
  await assert.rejects(parseAnimalModelGlb('bear', plain), InfrastructureCorruptedException);
});
// #endregion

// ======================== LOADING TESTS ======================== \\
// #region Loading Tests
test('loadAnimalModel_WhenCalledTwiceConcurrently_ShouldFetchOnce', async () => {
  // Arrange
  let fetches = 0;
  const fetcher = (id: AnimalModelId) => {
    fetches++;
    return readModel(id);
  };

  // Act
  const [first, second] = await withMutedTextureErrors(() =>
    Promise.all([loadAnimalModel('rhino', fetcher), loadAnimalModel('rhino', fetcher)])
  );

  // Assert
  assert.equal(fetches, 1);
  assert.equal(first, second);
  assert.equal(getLoadedAnimalModel('rhino'), first);
});

test('loadAnimalModel_WhenFirstDownloadFails_ShouldAllowRetry', async () => {
  // Arrange
  const failing = () => Promise.reject(new Error('offline'));

  // Act
  await assert.rejects(loadAnimalModel('jaguar', failing));
  const asset = await withMutedTextureErrors(() => loadAnimalModel('jaguar', readModel));

  // Assert
  assert.equal(asset.id, 'jaguar');
});

test('parseAnimalModelGlb_WhenClipModel_ShouldDecodeRigAndThirteenClips', async () => {
  // Arrange
  const bytes = await readModel('bear');

  // Act
  const asset = await withMutedTextureErrors(() => parseAnimalModelGlb('bear', bytes));

  // Assert
  assert.ok(asset.clipRig);
  assert.equal(asset.geometry, null);
  assert.equal(asset.clipRig.clipDurations.length, 13);
  assert.equal(asset.clipRig.parents.length, 37);
  assert.equal(asset.clipRig.clipJointRotations.length, 13 * 24 * 37 * 4);
});

test('parseAnimalModelGlb_WhenDeer_ShouldDecodeSkinnedGeometryWithJawIndex', async () => {
  // Arrange
  const bytes = await readModel('deer');

  // Act
  const asset = await withMutedTextureErrors(() => parseAnimalModelGlb('deer', bytes));

  // Assert
  assert.equal(asset.clipRig, null);
  assert.ok(asset.geometry?.getAttribute('skinWeight'));
  assert.equal(typeof asset.geometry?.userData.jawStartIdx, 'number');
});
// #endregion
