// ============================================================================
// MODULE: World / Models / Plants / Flora GLB Tests
// DESIGN: Structural checks on the real files in public/models/plants plus encoder round trip
// SUMMARY: Checks that all 10 shipped GLBs decode into consistent high and LOD meshes with
//          textures, and covers the encoder round trip and the corrupt-file guards.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeFloraGlb, encodeFloraGlb } from './floraGlb';
import { FLORA_MODEL_FILE_NAMES, FLORA_MODEL_IDS } from './floraAssets';
import type { FloraSubmeshData } from './floraRuntime';
import { InfrastructureCorruptedException } from '../../../core/AppException';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
async function readPlantGlb(fileName: string): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`../../../../public/models/plants/${fileName}.glb`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function assertSameSubmeshes(actual: FloraSubmeshData[], expected: FloraSubmeshData[]): void {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i++) {
    assert.equal(actual[i].matId, expected[i].matId);
    assert.deepEqual(actual[i].positions, expected[i].positions);
    assert.deepEqual(actual[i].normals, expected[i].normals);
    assert.deepEqual(actual[i].uvs, expected[i].uvs);
    assert.deepEqual(actual[i].indices, expected[i].indices);
  }
}

function countTriangles(submeshes: FloraSubmeshData[]): number {
  return submeshes.reduce((sum, sub) => sum + sub.indices.length / 3, 0);
}
// #endregion

// ======================== TESTS ======================== \\
// #region Shipped Plant Files
for (const id of FLORA_MODEL_IDS) {
  test(`decodeFloraGlb_When${id}GlbIsRead_ShouldHaveConsistentHighAndLodMeshes`, async () => {
    const decoded = decodeFloraGlb(await readPlantGlb(FLORA_MODEL_FILE_NAMES[id]));

    for (const submeshes of [decoded.high, decoded.low]) {
      assert.ok(submeshes.length > 0, 'a plant has at least one submesh');
      for (const sub of submeshes) {
        const vertexCount = sub.positions.length / 3;
        assert.equal(sub.positions.length % 3, 0);
        assert.equal(sub.normals.length, sub.positions.length);
        assert.equal(sub.uvs.length, vertexCount * 2);
        assert.equal(sub.indices.length % 3, 0);
        assert.ok(sub.indices.every((index) => index < vertexCount), 'indices stay inside the vertex range');
      }
    }
    assert.ok(countTriangles(decoded.low) < countTriangles(decoded.high), 'the LOD mesh is lighter than the full mesh');
    assert.ok(Object.keys(decoded.textures).length > 0, 'a plant ships at least one texture');
  });
}
// #endregion

// #region Encoder And Guards
test('encodeFloraGlb_WhenRoundTripped_ShouldReturnTheSameSubmeshesWithoutTextures', () => {
  const submesh: FloraSubmeshData = {
    matId: 7,
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
    indices: new Uint16Array([0, 1, 2]),
  };

  const decoded = decodeFloraGlb(encodeFloraGlb({ high: [submesh], low: [submesh], textures: {} }));

  assertSameSubmeshes(decoded.high, [submesh]);
  assertSameSubmeshes(decoded.low, [submesh]);
  assert.deepEqual(decoded.textures, {});
});

test('decodeFloraGlb_WhenBytesAreNotAGlb_ShouldThrowInfrastructureCorrupted', () => {
  assert.throws(() => decodeFloraGlb(new ArrayBuffer(64)), InfrastructureCorruptedException);
});

test('decodeFloraGlb_WhenFormatMarkerIsMissing_ShouldThrowInfrastructureCorrupted', async () => {
  const bytes = new Uint8Array(await readPlantGlb('cornflower'));
  const broken = bytes.slice();
  const text = new TextDecoder().decode(broken.subarray(20, 20 + new DataView(broken.buffer).getUint32(12, true)));
  const marker = '"format":"theman-flora-model@1"';
  broken[20 + text.indexOf(marker) + marker.length - 3] = 0x58; // corrupts the extras.format value, same length

  assert.throws(() => decodeFloraGlb(broken.buffer), InfrastructureCorruptedException);
});
// #endregion
