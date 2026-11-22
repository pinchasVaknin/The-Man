// ============================================================================
// MODULE: World / Models / Equipment / Archery Target Assets Tests
// DESIGN: AAA tests for the Archery target.glb asset library with an injected byte fetcher
// SUMMARY: Verifies the not-loaded guard, empty-mesh rejection, shared concurrent loads,
//          retry after failure, and grounded scaled instantiation of Archery target.glb.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import {
  createArcheryTargetModelInstance,
  getLoadedArcheryTargetModel,
  isArcheryTargetModelLoaded,
  loadArcheryTargetModel,
  parseArcheryTargetModelGlb,
} from './archeryTargetAssets';
import { ARCHERY_TARGET_DIMENSIONS } from '../../domain/landmarks/fortressLandmarks';
import { InfrastructureCorruptedException } from '../../../core/AppException';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
(globalThis as { self?: unknown }).self ??= globalThis;

async function readArcheryTargetModel(): Promise<ArrayBuffer> {
  const bytes = await readFile(
    new URL('../../../../public/models/equipment/Archery target.glb', import.meta.url)
  );
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
test('getLoadedArcheryTargetModel_WhenModelNotLoaded_ShouldThrowInfrastructureCorrupted', () => {
  assert.equal(isArcheryTargetModelLoaded(), false);
  assert.throws(() => getLoadedArcheryTargetModel(), InfrastructureCorruptedException);
});

test('parseArcheryTargetModelGlb_WhenGlbHasNoMeshes_ShouldReject', async () => {
  const emptySceneGlb = buildGlb({ asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 });

  await assert.rejects(
    parseArcheryTargetModelGlb(emptySceneGlb),
    InfrastructureCorruptedException
  );
});
// #endregion

// ======================== LOADING & GROUNDING TESTS ======================== \\
// #region Loading & Grounding Tests
test('loadArcheryTargetModel_WhenFirstDownloadFailsThenSucceeds_ShouldRetryAndDeduplicate', async () => {
  const failing = () => Promise.reject(new Error('offline'));
  await assert.rejects(loadArcheryTargetModel(failing));

  let fetches = 0;
  const fetcher = () => {
    fetches++;
    return readArcheryTargetModel();
  };

  const [first, second] = await withMutedTextureErrors(() =>
    Promise.all([loadArcheryTargetModel(fetcher), loadArcheryTargetModel(fetcher)])
  );

  assert.equal(fetches, 1);
  assert.equal(first, second);
  assert.equal(isArcheryTargetModelLoaded(), true);
  assert.equal(getLoadedArcheryTargetModel(), first);
  assert.ok(first.bounds.size.y > 0.5);

  const instance = createArcheryTargetModelInstance(first, {
    scale: ARCHERY_TARGET_DIMENSIONS.scale,
  });
  instance.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(instance);
  assert.ok(Math.abs(box.min.y) < 1e-3, `Expected grounded min.y near 0, got ${box.min.y}`);
  assert.ok(Math.abs((box.min.x + box.max.x) * 0.5) < 1e-3, 'Expected centered X');
  assert.ok(Math.abs((box.min.z + box.max.z) * 0.5) < 1e-3, 'Expected centered Z');
  assert.ok(
    Math.abs(box.max.y - ARCHERY_TARGET_DIMENSIONS.totalHeight) < 0.05,
    `Expected scaled height ~${ARCHERY_TARGET_DIMENSIONS.totalHeight}m, got ${box.max.y}`
  );
});
// #endregion
