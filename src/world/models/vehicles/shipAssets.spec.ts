import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import {
  SHIP_GLB_BASE_SCALE,
  createShipModelInstance,
  getLoadedShipModel,
  isShipModelLoaded,
  loadShipModel,
  parseShipModelGlb,
} from './shipAssets';
import { InfrastructureCorruptedException } from '../../../core/AppException';

(globalThis as { self?: unknown }).self ??= globalThis;

async function readShipModel(): Promise<ArrayBuffer> {
  const bytes = await readFile(
    new URL('../../../../public/models/vehicles/ship.glb', import.meta.url)
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

test('getLoadedShipModel_WhenNotLoaded_ShouldThrowInfrastructureCorrupted', () => {
  assert.equal(isShipModelLoaded(), false);
  assert.throws(() => getLoadedShipModel(), InfrastructureCorruptedException);
});

test('parseShipModelGlb_WhenGlbHasNoMeshes_ShouldReject', async () => {
  const emptySceneGlb = buildGlb({ asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 });
  await assert.rejects(parseShipModelGlb(emptySceneGlb), InfrastructureCorruptedException);
});

test('loadShipModel_LoadsPublicShipGlbDeduplicatesAndOrientsBowForwardWithDeckAtZero', async () => {
  let fetches = 0;
  const fetcher = () => {
    fetches++;
    return readShipModel();
  };

  const [first, second] = await withMutedTextureErrors(() =>
    Promise.all([loadShipModel(fetcher), loadShipModel(fetcher)])
  );

  assert.equal(fetches, 1);
  assert.equal(first, second);
  assert.equal(isShipModelLoaded(), true);
  assert.equal(getLoadedShipModel(), first);

  const instance = createShipModelInstance(first, { scale: SHIP_GLB_BASE_SCALE });
  instance.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(instance);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Rotated -PI/2 so ship length (~25m) runs along Z axis (bow at -Z, stern at +Z)
  assert.ok(size.z > size.x, `Expected ship length along Z (${size.z.toFixed(2)}m) > beam along X (${size.x.toFixed(2)}m)`);
  assert.ok(box.min.y < -3.0 && box.max.y > 12.0, `Expected keel below deck (y=0) and masts high above deck, got minY=${box.min.y.toFixed(2)}, maxY=${box.max.y.toFixed(2)}`);
});
