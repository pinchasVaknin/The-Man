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
import {
  ARRAY_BUFFER_TARGET,
  BinaryBuilder,
  ELEMENT_ARRAY_BUFFER_TARGET,
  FLOAT_COMPONENT,
  UNSIGNED_SHORT_COMPONENT,
  bytesOf,
  decodeDataUri,
  minMax,
  readGlb,
  writeGlb,
  type IGltfAccessor,
  type IGltfBufferView,
  type ITextureImage,
} from '../glbContainer';
import type { FloraSubmeshData } from './floraRuntime';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** Value of asset.extras.format in every plant GLB. */
export const FLORA_GLB_FORMAT = 'theman-flora-model@1';

const WEBP_EXTENSION = 'EXT_texture_webp';
const NODE_NAME_HIGH = 'high';
const NODE_NAME_LOW = 'low';

/** Summary: A decoded texture image: the encoded file bytes and their MIME type. */
export type IFloraTextureImage = ITextureImage;

/** Summary: Everything one plant GLB holds. Textures are keyed by the submesh matId. */
export interface IFloraModelData {
  readonly high: FloraSubmeshData[];
  readonly low: FloraSubmeshData[];
  readonly textures: Record<number, IFloraTextureImage>;
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
  bufferViews: IGltfBufferView[];
  buffers: Array<{ byteLength: number }>;
  extensionsUsed?: string[];
  extensionsRequired?: string[];
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
  return writeGlb(json, bin);
}
// #endregion

// ======================== PUBLIC DECODING ======================== \\
// #region Decode Flora GLB
/**
 * Summary: Reads a plant GLB back into submesh arrays and texture images.
 * @param bytes The GLB file bytes.
 * @returns High and LOD submeshes, plus texture images keyed by matId.
 * @throws InfrastructureCorruptedException when the container or the format marker is wrong.
 */
export function decodeFloraGlb(bytes: ArrayBuffer): IFloraModelData {
  const { json: rawJson, viewBytes } = readGlb(bytes, 'Plant model');
  const json = rawJson as IGltfJson;
  if (json.asset?.extras?.format !== FLORA_GLB_FORMAT) {
    throw new InfrastructureCorruptedException(`Plant model format is not ${FLORA_GLB_FORMAT}.`);
  }

  const readFloats = (accessorIndex: number): Float32Array => new Float32Array(viewBytes(json.bufferViews[json.accessors[accessorIndex].bufferView]));
  const readIndices = (accessorIndex: number): Uint16Array => new Uint16Array(viewBytes(json.bufferViews[json.accessors[accessorIndex].bufferView]));
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
    textures[material.extras.matId] = { mimeType: image.mimeType, data: new Uint8Array(viewBytes(json.bufferViews[image.bufferView])) };
  }
  return { high: readMesh(NODE_NAME_HIGH), low: readMesh(NODE_NAME_LOW), textures };
}
// #endregion
