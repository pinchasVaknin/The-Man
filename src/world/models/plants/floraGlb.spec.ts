// ============================================================================
// MODULE: World / Models / Plants / Flora GLB Tests
// DESIGN: Equality tests: every shipped plant GLB must decode to exactly what the packed data
//         modules unpack to today, so the data modules can be removed without changing a vertex
// SUMMARY: Compares all 10 GLBs against their base64 packs (high, LOD, textures) and checks the
//          encoder round trip and the corrupt-file guards.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeFloraGlb, encodeFloraGlb } from './floraGlb';
import { unpackFloraBundle, type FloraSubmeshData } from './floraRuntime';
import { InfrastructureCorruptedException } from '../../../core/AppException';
import * as animTree from './AnimTree_Complete';
import * as animTreeCompact from './AnimTreeCompact_Complete';
import * as animTreeWide from './AnimTreeWide_Complete';
import * as cornflower from './Cornflower_Complete';
import * as forestBush from './ForestBush_Complete';
import * as forestFern from './ForestFern_Complete';
import * as oakGreen from './OakGreen_Complete';
import * as oakYellow from './OakYellow_Complete';
import * as pineTree from './PineTree_Complete';
import * as whiteFlower from './WhiteFlower_Complete';
// #endregion

// ======================== FIXTURES ======================== \
// #region Fixtures
const PLANTS: ReadonlyArray<readonly [string, string, Record<string, unknown>]> = [
  ['anim-tree', 'ANIMTREE', animTree],
  ['anim-tree-wide', 'ANIMTREEWIDE', animTreeWide],
  ['anim-tree-compact', 'ANIMTREECOMPACT', animTreeCompact],
  ['pine-tree', 'PINETREE', pineTree],
  ['oak-green', 'OAKGREEN', oakGreen],
  ['oak-yellow', 'OAKYELLOW', oakYellow],
  ['forest-bush', 'FORESTBUSH', forestBush],
  ['forest-fern', 'FORESTFERN', forestFern],
  ['cornflower', 'CORNFLOWER', cornflower],
  ['white-flower', 'WHITEFLOWER', whiteFlower],
];

async function readPlantGlb(fileName: string): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`../../../../public/models/plants/${fileName}.glb`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function dataUriBytes(uri: string): Uint8Array {
  const binary = atob(uri.slice(uri.indexOf(',') + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
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
// #endregion

// ======================== TESTS ======================== \
// #region Equality With The Packed Data
for (const [fileName, prefix, data] of PLANTS) {
  test(`decodeFloraGlb_When${prefix}GlbIsRead_ShouldEqualItsPackedDataExactly`, async () => {
    const decoded = decodeFloraGlb(await readPlantGlb(fileName));

    assertSameSubmeshes(decoded.high, unpackFloraBundle(data[`${prefix}_PACK_B64`] as string));
    assertSameSubmeshes(decoded.low, unpackFloraBundle(data[`${prefix}_LOD_PACK_B64`] as string));

    const textures = data[`${prefix}_TEXTURES`] as Record<number, string>;
    assert.deepEqual(Object.keys(decoded.textures).sort(), Object.keys(textures).sort());
    for (const [matId, uri] of Object.entries(textures)) {
      assert.deepEqual(decoded.textures[Number(matId)].data, dataUriBytes(uri));
      assert.equal(decoded.textures[Number(matId)].mimeType, /^data:([^;]+);/.exec(uri)![1]);
    }
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
