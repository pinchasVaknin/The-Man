// ============================================================================
// MODULE: World / Models / Equipment / Saddle GLB Tests
// DESIGN: Equality tests: each shipped saddle GLB must decode to exactly what the packed data
//         module unpacks to today, so the data can be removed without changing a vertex
// SUMMARY: Compares both GLBs against their base64 packs (mesh arrays and texture bytes) and
//          checks the encoder round trip and the corrupt-file guards.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeSaddleGlb, encodeSaddleGlb } from './saddleGlb';
import { unpackSaddleBundle, type ISaddleModelSpec } from './saddleRuntime';
import { SADDLE_PACK_B64, SADDLE_SPEC, SADDLE_TEX_B64 } from './Saddle_Complete';
import { WESTERN_SADDLE_PACK_B64, WESTERN_SADDLE_SPEC, WESTERN_SADDLE_TEX_B64 } from './WesternSaddle_Complete';
import { InfrastructureCorruptedException } from '../../../core/AppException';
// #endregion

// ======================== FIXTURES ======================== \
// #region Fixtures
const SADDLES: ReadonlyArray<readonly [string, ISaddleModelSpec, string, string]> = [
  ['saddle', SADDLE_SPEC, SADDLE_PACK_B64, SADDLE_TEX_B64],
  ['western-saddle', WESTERN_SADDLE_SPEC, WESTERN_SADDLE_PACK_B64, WESTERN_SADDLE_TEX_B64],
];

async function readSaddleGlb(fileName: string): Promise<ArrayBuffer> {
  const bytes = await readFile(new URL(`../../../../public/models/equipment/${fileName}.glb`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function dataUriBytes(uri: string): Uint8Array {
  const binary = atob(uri.slice(uri.indexOf(',') + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
// #endregion

// ======================== TESTS ======================== \
// #region Equality With The Packed Data
for (const [fileName, spec, pack, texture] of SADDLES) {
  test(`decodeSaddleGlb_When${spec.name}GlbIsRead_ShouldEqualItsPackedDataExactly`, async () => {
    const decoded = decodeSaddleGlb(await readSaddleGlb(fileName));
    const expected = unpackSaddleBundle(pack, spec);

    assert.deepEqual(decoded.mesh.positions, expected.positions);
    assert.deepEqual(decoded.mesh.normals, expected.normals);
    assert.deepEqual(decoded.mesh.uvs, expected.uvs);
    assert.deepEqual(decoded.mesh.indices, expected.indices);
    assert.deepEqual(decoded.texture.data, dataUriBytes(texture));
    assert.equal(decoded.texture.mimeType, /^data:([^;]+);/.exec(texture)![1]);
  });
}
// #endregion

// #region Encoder And Guards
test('encodeSaddleGlb_WhenRoundTripped_ShouldReturnTheSameMeshAndTexture', () => {
  const mesh = {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
    indices: new Uint16Array([0, 1, 2]),
  };
  const textureDataUri = 'data:image/jpeg;base64,/9j/4AAQ';

  const decoded = decodeSaddleGlb(encodeSaddleGlb({ mesh, textureDataUri }));

  assert.deepEqual(decoded.mesh, mesh);
  assert.deepEqual(decoded.texture.data, dataUriBytes(textureDataUri));
});

test('decodeSaddleGlb_WhenBytesAreNotAGlb_ShouldThrowInfrastructureCorrupted', () => {
  assert.throws(() => decodeSaddleGlb(new ArrayBuffer(64)), InfrastructureCorruptedException);
});
// #endregion
