// ============================================================================
// MODULE: World / Models / Plants / Flora GLB Format
// DESIGN: One self-contained GLB per plant; plain glTF 2.0 with float geometry (no quantization),
//         so decoding returns exactly the arrays the runtime builds from the old base64 packs
// SUMMARY: Encodes a plant's high and LOD submeshes plus its textures into a GLB, and decodes
//          one back into FloraSubmeshData. Does not create materials or meshes; floraRuntime does.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { InfrastructureCorruptedException } from '../../../core/AppException';
import type { FloraSubmeshData } from './floraRuntime';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** Value of asset.extras.format in every plant GLB. */
export const FLORA_GLB_FORMAT = 'theman-flora-model@1';

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;
const GLB_HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
const FLOAT_COMPONENT = 5126;
const UNSIGNED_SHORT_COMPONENT = 5123;
const ARRAY_BUFFER_TARGET = 34962;
const ELEMENT_ARRAY_BUFFER_TARGET = 34963;
const WEBP_EXTENSION = 'EXT_texture_webp';
const NODE_NAME_HIGH = 'high';
const NODE_NAME_LOW = 'low';

/** Summary: A decoded texture image: the encoded file bytes and their MIME type. */
export interface IFloraTextureImage {
  readonly mimeType: string;
  readonly data: Uint8Array;
}

/** Summary: Everything one plant GLB holds. Textures are keyed by the submesh matId. */
export interface IFloraModelData {
  readonly high: FloraSubmeshData[];
  readonly low: FloraSubmeshData[];
  readonly textures: Record<number, IFloraTextureImage>;
}

interface IGltfAccessor {
  bufferView: number;
  componentType: number;
  count: number;
  type: 'SCALAR' | 'VEC2' | 'VEC3';
  min?: number[];
  max?: number[];
}

interface IGltfJson {
  asset: { version: string; generator?: string; extras?: { format?: string } };
  scene?: number;
  scenes?: Array<{ nodes: number[] }>;
  nodes: Array<{ name: string; mesh: number }>;
  meshes: Array<{ name: string; primitives: Array<{ attributes: Record<string, number>; indices: number; material: number; extras: { matId: number } }> }>;
  materials: Array<{ name: string; extras: { matId: number }; pbrMetallicRoughness: { baseColorTexture?: { index: number } } }>;
  textures?: Array<{ source?: number; extensions?: Record<string, { source: number }> }>;
  images?: Array<{ bufferView: number; mimeType: string }>;
  accessors: IGltfAccessor[];
  bufferViews: Array<{ buffer: number; byteOffset: number; byteLength: number; target?: number }>;
  buffers: Array<{ byteLength: number }>;
  extensionsUsed?: string[];
  extensionsRequired?: string[];
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Binary Builder
function alignTo4(length: number): number {
  return (length + 3) & ~3;
}

/** Collects binary parts and the buffer views that point at them. */
class BinaryBuilder {
  public readonly views: IGltfJson['bufferViews'] = [];
  private readonly parts: Uint8Array[] = [];
  private offset = 0;

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

function bytesOf(array: Float32Array | Uint16Array): Uint8Array {
  return new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
}

function minMax(values: Float32Array): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < values.length; i++) {
    const axis = i % 3;
    if (values[i] < min[axis]) min[axis] = values[i];
    if (values[i] > max[axis]) max[axis] = values[i];
  }
  return { min, max };
}

function decodeDataUri(uri: string): IFloraTextureImage {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(uri);
  if (!match) throw new InfrastructureCorruptedException('Flora texture is not a base64 data URI.');
  const binary = atob(match[2]);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
  return { mimeType: match[1], data };
}
// #endregion

// ======================== PUBLIC ENCODING ======================== \\
// #region Encode Flora GLB
/**
 * Summary: Writes a plant's high and LOD submeshes and textures into one GLB.
 * Design: Each submesh is a primitive with its matId in extras; geometry stays float32 so the
 *         round trip is bit-exact. Textures become glTF images (WebP via EXT_texture_webp).
 * @param model The plant's submeshes and its data-URI textures keyed by matId.
 * @returns The GLB file bytes.
 * @throws InfrastructureCorruptedException when a texture is not a base64 data URI.
 */
export function encodeFloraGlb(model: {
  readonly high: readonly FloraSubmeshData[];
  readonly low: readonly FloraSubmeshData[];
  readonly textures: Readonly<Record<number, string>>;
}): ArrayBuffer {
  const binary = new BinaryBuilder();
  const json: IGltfJson = {
    asset: { version: '2.0', generator: FLORA_GLB_FORMAT, extras: { format: FLORA_GLB_FORMAT } },
    scene: 0,
    scenes: [{ nodes: [0, 1] }],
    nodes: [
      { name: NODE_NAME_HIGH, mesh: 0 },
      { name: NODE_NAME_LOW, mesh: 1 },
    ],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: binary.views,
    buffers: [{ byteLength: 0 }],
  };

  const matIds = [...new Set([...model.high, ...model.low].map((sub) => sub.matId))].sort((a, b) => a - b);
  const textureIndexByMatId = new Map<number, number>();
  let usesWebp = false;
  for (const matId of matIds) {
    const uri = model.textures[matId];
    if (uri !== undefined) {
      const image = decodeDataUri(uri);
      const source = (json.images ??= []).push({ bufferView: binary.addView(image.data), mimeType: image.mimeType }) - 1;
      const isWebp = image.mimeType === 'image/webp';
      usesWebp ||= isWebp;
      (json.textures ??= []).push(isWebp ? { extensions: { [WEBP_EXTENSION]: { source } } } : { source });
      textureIndexByMatId.set(matId, json.textures.length - 1);
    }
    const textureIndex = textureIndexByMatId.get(matId);
    json.materials.push({
      name: `material_${matId}`,
      extras: { matId },
      pbrMetallicRoughness: textureIndex === undefined ? {} : { baseColorTexture: { index: textureIndex } },
    });
  }
  if (usesWebp) {
    json.extensionsUsed = [WEBP_EXTENSION];
    json.extensionsRequired = [WEBP_EXTENSION];
  }

  const addAccessor = (view: number, componentType: number, count: number, type: IGltfAccessor['type'], bounds?: { min: number[]; max: number[] }): number => {
    json.accessors.push({ bufferView: view, componentType, count, type, ...(bounds ?? {}) });
    return json.accessors.length - 1;
  };

  for (const [name, submeshes] of [[NODE_NAME_HIGH, model.high], [NODE_NAME_LOW, model.low]] as const) {
    json.meshes.push({
      name,
      primitives: submeshes.map((sub) => ({
        attributes: {
          POSITION: addAccessor(binary.addView(bytesOf(sub.positions), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, sub.positions.length / 3, 'VEC3', minMax(sub.positions)),
          NORMAL: addAccessor(binary.addView(bytesOf(sub.normals), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, sub.normals.length / 3, 'VEC3'),
          TEXCOORD_0: addAccessor(binary.addView(bytesOf(sub.uvs), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, sub.uvs.length / 2, 'VEC2'),
        },
        indices: addAccessor(binary.addView(bytesOf(sub.indices), ELEMENT_ARRAY_BUFFER_TARGET), UNSIGNED_SHORT_COMPONENT, sub.indices.length, 'SCALAR'),
        material: matIds.indexOf(sub.matId),
        extras: { matId: sub.matId },
      })),
    });
  }

  const bin = binary.toBytes();
  json.buffers[0].byteLength = bin.byteLength;
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
// #endregion

// ======================== PUBLIC DECODING ======================== \\
// #region Decode Flora GLB
/**
 * Summary: Reads a plant GLB back into submesh arrays and texture images.
 * Design: Parses the GLB container directly instead of using GLTFLoader, so no image decoding
 *         or renormalization happens and the arrays are exactly what was stored.
 * @param bytes The GLB file bytes.
 * @returns High and LOD submeshes, plus texture images keyed by matId.
 * @throws InfrastructureCorruptedException when the container or the format marker is wrong.
 */
export function decodeFloraGlb(bytes: ArrayBuffer): IFloraModelData {
  const view = new DataView(bytes);
  if (bytes.byteLength < GLB_HEADER_BYTES + CHUNK_HEADER_BYTES || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new InfrastructureCorruptedException('Plant model is not a GLB file.');
  }
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== JSON_CHUNK_TYPE) throw new InfrastructureCorruptedException('Plant model has no JSON chunk.');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonLength))) as IGltfJson;
  if (json.asset?.extras?.format !== FLORA_GLB_FORMAT) {
    throw new InfrastructureCorruptedException(`Plant model format is not ${FLORA_GLB_FORMAT}.`);
  }
  const binHeader = 20 + jsonLength;
  if (view.getUint32(binHeader + 4, true) !== BIN_CHUNK_TYPE) throw new InfrastructureCorruptedException('Plant model has no binary chunk.');
  const binStart = binHeader + CHUNK_HEADER_BYTES;

  const viewBytes = (viewIndex: number): ArrayBuffer => {
    const entry = json.bufferViews[viewIndex];
    return bytes.slice(binStart + entry.byteOffset, binStart + entry.byteOffset + entry.byteLength);
  };
  const readFloats = (accessorIndex: number): Float32Array => new Float32Array(viewBytes(json.accessors[accessorIndex].bufferView));
  const readIndices = (accessorIndex: number): Uint16Array => new Uint16Array(viewBytes(json.accessors[accessorIndex].bufferView));
  const readMesh = (nodeName: string): FloraSubmeshData[] => {
    const node = json.nodes.find((candidate) => candidate.name === nodeName);
    if (!node) throw new InfrastructureCorruptedException(`Plant model has no "${nodeName}" mesh.`);
    return json.meshes[node.mesh].primitives.map((primitive) => ({
      matId: primitive.extras.matId,
      positions: readFloats(primitive.attributes.POSITION),
      normals: readFloats(primitive.attributes.NORMAL),
      uvs: readFloats(primitive.attributes.TEXCOORD_0),
      indices: readIndices(primitive.indices),
    }));
  };

  const textures: Record<number, IFloraTextureImage> = {};
  for (const material of json.materials) {
    const textureIndex = material.pbrMetallicRoughness.baseColorTexture?.index;
    if (textureIndex === undefined) continue;
    const texture = json.textures![textureIndex];
    const source = texture.source ?? texture.extensions?.[WEBP_EXTENSION]?.source;
    const image = json.images![source!];
    textures[material.extras.matId] = { mimeType: image.mimeType, data: new Uint8Array(viewBytes(image.bufferView)) };
  }
  return { high: readMesh(NODE_NAME_HIGH), low: readMesh(NODE_NAME_LOW), textures };
}
// #endregion
