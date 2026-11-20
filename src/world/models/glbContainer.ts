// ============================================================================
// MODULE: World / Models / GLB Container
// DESIGN: Format-agnostic helpers for the GLB files the project writes itself (plants, saddles):
//         a binary builder, the GLB header and chunk layout, and data-URI decoding
// SUMMARY: Turns a glTF JSON object plus a binary blob into GLB bytes and back. Knows nothing about
//          meshes or materials; each model format builds its own JSON on top of it.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { InfrastructureCorruptedException } from '../../core/AppException';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;
const GLB_HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;

/** glTF accessor component types and buffer targets used by the project's formats. */
export const FLOAT_COMPONENT = 5126;
export const UNSIGNED_SHORT_COMPONENT = 5123;
export const ARRAY_BUFFER_TARGET = 34962;
export const ELEMENT_ARRAY_BUFFER_TARGET = 34963;

export interface IGltfBufferView {
  buffer: number;
  byteOffset: number;
  byteLength: number;
  target?: number;
}

export interface IGltfAccessor {
  bufferView: number;
  componentType: number;
  count: number;
  type: 'SCALAR' | 'VEC2' | 'VEC3';
  min?: number[];
  max?: number[];
}

/** Summary: A texture image: the encoded file bytes and their MIME type. */
export interface ITextureImage {
  readonly mimeType: string;
  readonly data: Uint8Array;
}

/** Summary: The parsed parts of a GLB file. */
export interface IReadGlb {
  readonly json: unknown;
  /** Reads the bytes of one buffer view out of the binary chunk. */
  readonly viewBytes: (bufferView: IGltfBufferView) => ArrayBuffer;
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Alignment
function alignTo4(length: number): number {
  return (length + 3) & ~3;
}
// #endregion

// ======================== BINARY BUILDER ======================== \\
// #region Binary Builder
/** Summary: Collects binary parts (each padded to 4 bytes) and the buffer views that point at them. */
export class BinaryBuilder {
  public readonly views: IGltfBufferView[] = [];
  private readonly parts: Uint8Array[] = [];
  private offset = 0;

  /** Adds a part and returns the index of its new buffer view. */
  public addView(bytes: Uint8Array, target?: number): number {
    const padded = new Uint8Array(alignTo4(bytes.byteLength));
    padded.set(bytes);
    this.views.push({ buffer: 0, byteOffset: this.offset, byteLength: bytes.byteLength, ...(target === undefined ? {} : { target }) });
    this.parts.push(padded);
    this.offset += padded.byteLength;
    return this.views.length - 1;
  }

  public toBytes(): Uint8Array {
    const out = new Uint8Array(this.offset);
    let at = 0;
    for (const part of this.parts) {
      out.set(part, at);
      at += part.byteLength;
    }
    return out;
  }
}

/** Summary: Views a typed array's memory as bytes, without copying. */
export function bytesOf(array: Float32Array | Uint16Array): Uint8Array {
  return new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
}

/** Summary: Per-axis minimum and maximum of a flat xyz array (glTF requires them on POSITION). */
export function minMax(values: Float32Array): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < values.length; i++) {
    const axis = i % 3;
    if (values[i] < min[axis]) min[axis] = values[i];
    if (values[i] > max[axis]) max[axis] = values[i];
  }
  return { min, max };
}

/**
 * Summary: Decodes a base64 data URI into image bytes.
 * @throws InfrastructureCorruptedException when the string is not a base64 data URI.
 */
export function decodeDataUri(uri: string): ITextureImage {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(uri);
  if (!match) throw new InfrastructureCorruptedException('Texture is not a base64 data URI.');
  const binary = atob(match[2]);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
  return { mimeType: match[1], data };
}
// #endregion

// ======================== GLB CONTAINER ======================== \\
// #region Write And Read GLB
/** Summary: Wraps a glTF JSON object and a binary blob into GLB bytes. */
export function writeGlb(json: object, bin: Uint8Array): ArrayBuffer {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadded = new Uint8Array(alignTo4(jsonBytes.byteLength)).fill(0x20);
  jsonPadded.set(jsonBytes);

  const total = GLB_HEADER_BYTES + CHUNK_HEADER_BYTES + jsonPadded.byteLength + CHUNK_HEADER_BYTES + bin.byteLength;
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, GLB_VERSION, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonPadded.byteLength, true);
  view.setUint32(16, JSON_CHUNK_TYPE, true);
  new Uint8Array(out, 20, jsonPadded.byteLength).set(jsonPadded);
  const binHeader = 20 + jsonPadded.byteLength;
  view.setUint32(binHeader, bin.byteLength, true);
  view.setUint32(binHeader + 4, BIN_CHUNK_TYPE, true);
  new Uint8Array(out, binHeader + CHUNK_HEADER_BYTES, bin.byteLength).set(bin);
  return out;
}

/**
 * Summary: Splits GLB bytes into the glTF JSON and a reader for the binary chunk.
 * Design: Parses the container directly instead of using GLTFLoader, so no image decoding or
 *         renormalization happens and arrays come back exactly as stored.
 * @param bytes The GLB file bytes.
 * @param label What the file should be, for error messages (for example "Plant model").
 * @throws InfrastructureCorruptedException when the container is malformed.
 */
export function readGlb(bytes: ArrayBuffer, label: string): IReadGlb {
  const view = new DataView(bytes);
  if (bytes.byteLength < GLB_HEADER_BYTES + CHUNK_HEADER_BYTES || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new InfrastructureCorruptedException(`${label} is not a GLB file.`);
  }
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== JSON_CHUNK_TYPE) throw new InfrastructureCorruptedException(`${label} has no JSON chunk.`);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonLength))) as unknown;
  const binHeader = 20 + jsonLength;
  if (view.getUint32(binHeader + 4, true) !== BIN_CHUNK_TYPE) throw new InfrastructureCorruptedException(`${label} has no binary chunk.`);
  const binStart = binHeader + CHUNK_HEADER_BYTES;
  return {
    json,
    viewBytes: (entry) => bytes.slice(binStart + entry.byteOffset, binStart + entry.byteOffset + entry.byteLength),
  };
}
// #endregion
