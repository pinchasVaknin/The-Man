// ============================================================================
// MODULE: World / Models / Equipment / Saddle GLB Tests
// DESIGN: Structural checks on the real files in public/models/equipment plus encoder round trip
// SUMMARY: Checks both shipped saddle GLBs decode into a consistent mesh with a texture, and covers
//          the encoder round trip and the corrupt-file guard.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeSaddleGlb, encodeSaddleGlb } from './saddleGlb';
import { SADDLE_MODEL_IDS } from './saddleAssets';
import { SADDLE_SPEC } from './Saddle_Complete';
import { WESTERN_SADDLE_SPEC } from './WesternSaddle_Complete';
import type { ISaddleModelSpec } from './saddleRuntime';
import { InfrastructureCorruptedException } from '../../../core/AppException';
// #endregion

// ======================== FIXTURES ======================== \
// #region Fixtures
const SPEC_BY_ID: Record<(typeof SADDLE_MODEL_IDS)[number], ISaddleModelSpec> = {
  saddle: SADDLE_SPEC,
  'western-saddle': WESTERN_SADDLE_SPEC,
};

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
// #region Shipped Saddle Files
for (const id of SADDLE_MODEL_IDS) {
  test(`decodeSaddleGlb_When${id}GlbIsRead_ShouldMatchItsSpecAndHaveATexture`, async () => {
    const spec = SPEC_BY_ID[id];

    const decoded = decodeSaddleGlb(await readSaddleGlb(id));

    assert.equal(decoded.mesh.positions.length, spec.vertexCount * 3);
    assert.equal(decoded.mesh.normals.length, spec.vertexCount * 3);
    assert.equal(decoded.mesh.uvs.length, spec.vertexCount * 2);
    assert.equal(decoded.mesh.indices.length, spec.indexCount);
    assert.ok(decoded.mesh.indices.every((index) => index < spec.vertexCount), 'indices stay inside the vertex range');
    assert.ok(decoded.texture.data.length > 0, 'a saddle ships a texture');
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
