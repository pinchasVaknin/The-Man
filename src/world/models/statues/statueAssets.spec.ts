// ============================================================================
// MODULE: World / Models / Statues / Statue Assets Tests
// DESIGN: AAA tests for the static statue GLB library with an injected byte fetcher
// SUMMARY: Verifies the not-loaded guard, empty-mesh rejection, shared concurrent loads,
//          retry after failure, and grounded instantiation of ded_king_skelton.glb.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import {
  createStatueModelInstance,
  getLoadedStatueModel,
  isStatueModelLoaded,
  loadStatueModel,
  parseStatueModelGlb,
  type StatueModelId,
} from './statueAssets';
import { InfrastructureCorruptedException } from '../../../core/AppException';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
(globalThis as { self?: unknown }).self ??= globalThis;

async function readStatueModel(id: StatueModelId): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`../../../../public/models/statues/${id}.glb`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

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
  console.error = (...args: unknown[]) => {
    if (String(args[0]).includes("Couldn't load texture")) return;
    original(...args);
  };
  try {
    return await run();
  } finally {
    console.error = original;
  }
}
// #endregion

// ======================== GUARD & PARSE TESTS ======================== \\
// #region Guard & Parse Tests
test('getLoadedStatueModel_WhenModelNotLoaded_ShouldThrowInfrastructureCorrupted', () => {
  assert.equal(isStatueModelLoaded('ded_king_skelton'), false);
  assert.throws(() => getLoadedStatueModel('ded_king_skelton'), InfrastructureCorruptedException);
});

test('parseStatueModelGlb_WhenGlbHasNoMeshes_ShouldReject', async () => {
  const emptySceneGlb = buildGlb({ asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 });

  await assert.rejects(
    parseStatueModelGlb('ded_king_skelton', emptySceneGlb),
    InfrastructureCorruptedException
  );
});
// #endregion

// ======================== LOADING & GROUNDING TESTS ======================== \\
// #region Loading & Grounding Tests
test('loadStatueModel_WhenFirstDownloadFailsThenSucceeds_ShouldRetryAndDeduplicate', async () => {
  const failing = () => Promise.reject(new Error('offline'));
  await assert.rejects(loadStatueModel('ded_king_skelton', failing));

  let fetches = 0;
  const fetcher = (id: StatueModelId) => {
    fetches++;
    return readStatueModel(id);
  };

  const [first, second] = await withMutedTextureErrors(() =>
    Promise.all([
      loadStatueModel('ded_king_skelton', fetcher),
      loadStatueModel('ded_king_skelton', fetcher),
    ])
  );

  assert.equal(fetches, 1);
  assert.equal(first, second);
  assert.equal(isStatueModelLoaded('ded_king_skelton'), true);
  assert.equal(getLoadedStatueModel('ded_king_skelton'), first);
  assert.ok(first.bounds.size.y > 0.5);

  const instance = createStatueModelInstance(first, { scale: 6.0 });
  instance.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(instance);
  assert.ok(Math.abs(box.min.y) < 1e-3, `Expected grounded min.y near 0, got ${box.min.y}`);
  assert.ok(Math.abs((box.min.x + box.max.x) * 0.5) < 1e-3, 'Expected centered X');
  assert.ok(Math.abs((box.min.z + box.max.z) * 0.5) < 1e-3, 'Expected centered Z');
  assert.ok(box.max.y > 5.0, `Expected scaled statue height > 5m, got ${box.max.y}`);
});
// #endregion
