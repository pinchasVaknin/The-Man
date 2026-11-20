// ============================================================================
// MODULE: World / Models / Equipment / Saddle GLB Format
// DESIGN: One self-contained GLB per saddle; plain glTF 2.0, one mesh, float geometry, the
//         texture as a glTF image; same container as the plant files (glbContainer)
// SUMMARY: Encodes an unpacked saddle and its texture into a GLB and decodes one back. Does not
//          deform or skin the saddle; saddleRuntime does.
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
import type { UnpackedSaddleData } from './saddleRuntime';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** Value of asset.extras.format in every saddle GLB. */
export const SADDLE_GLB_FORMAT = 'theman-saddle-model@1';

/** Summary: Everything one saddle GLB holds. */
export interface ISaddleModelData {
  readonly mesh: UnpackedSaddleData;
  readonly texture: ITextureImage;
}

interface ISaddleGltfJson {
  asset: { version: string; generator?: string; extras?: { format?: string } };
  scene?: number;
  scenes?: Array<{ nodes: number[] }>;
  nodes: Array<{ name: string; mesh: number }>;
  meshes: Array<{ name: string; primitives: Array<{ attributes: Record<string, number>; indices: number; material: number }> }>;
  materials: Array<{ name: string; pbrMetallicRoughness: { baseColorTexture: { index: number } } }>;
  textures: Array<{ source: number }>;
  images: Array<{ bufferView: number; mimeType: string }>;
  accessors: IGltfAccessor[];
  bufferViews: IGltfBufferView[];
  buffers: Array<{ byteLength: number }>;
}
// #endregion

// ======================== PUBLIC ENCODING ======================== \\
// #region Encode Saddle GLB
/**
 * Summary: Writes an unpacked saddle and its texture into one GLB.
 * @param model The saddle's mesh arrays and its texture as a base64 data URI.
 * @returns The GLB file bytes.
 * @throws InfrastructureCorruptedException when the texture is not a base64 data URI.
 */
export function encodeSaddleGlb(model: { readonly mesh: UnpackedSaddleData; readonly textureDataUri: string }): ArrayBuffer {
  const binary = new BinaryBuilder();
  const image = decodeDataUri(model.textureDataUri);
  const imageView = binary.addView(image.data);
  const { positions, normals, uvs, indices } = model.mesh;
  const accessors: IGltfAccessor[] = [];
  const addAccessor = (view: number, componentType: number, count: number, type: IGltfAccessor['type'], bounds?: { min: number[]; max: number[] }): number => {
    accessors.push({ bufferView: view, componentType, count, type, ...(bounds ?? {}) });
    return accessors.length - 1;
  };
  const position = addAccessor(binary.addView(bytesOf(positions), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, positions.length / 3, 'VEC3', minMax(positions));
  const normal = addAccessor(binary.addView(bytesOf(normals), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, normals.length / 3, 'VEC3');
  const uv = addAccessor(binary.addView(bytesOf(uvs), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, uvs.length / 2, 'VEC2');
  const index = addAccessor(binary.addView(bytesOf(indices), ELEMENT_ARRAY_BUFFER_TARGET), UNSIGNED_SHORT_COMPONENT, indices.length, 'SCALAR');

  const bin = binary.toBytes();
  const json: ISaddleGltfJson = {
    asset: { version: '2.0', generator: SADDLE_GLB_FORMAT, extras: { format: SADDLE_GLB_FORMAT } },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'saddle', mesh: 0 }],
    meshes: [{ name: 'saddle', primitives: [{ attributes: { POSITION: position, NORMAL: normal, TEXCOORD_0: uv }, indices: index, material: 0 }] }],
    materials: [{ name: 'saddle', pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    textures: [{ source: 0 }],
    images: [{ bufferView: imageView, mimeType: image.mimeType }],
    accessors,
    bufferViews: binary.views,
    buffers: [{ byteLength: bin.byteLength }],
  };
  return writeGlb(json, bin);
}
// #endregion

// ======================== PUBLIC DECODING ======================== \\
// #region Decode Saddle GLB
/**
 * Summary: Reads a saddle GLB back into mesh arrays and the texture image.
 * @param bytes The GLB file bytes.
 * @throws InfrastructureCorruptedException when the container or the format marker is wrong.
 */
export function decodeSaddleGlb(bytes: ArrayBuffer): ISaddleModelData {
  const { json: rawJson, viewBytes } = readGlb(bytes, 'Saddle model');
  const json = rawJson as ISaddleGltfJson;
  if (json.asset?.extras?.format !== SADDLE_GLB_FORMAT) {
    throw new InfrastructureCorruptedException(`Saddle model format is not ${SADDLE_GLB_FORMAT}.`);
  }
  const viewOf = (accessorIndex: number): ArrayBuffer => viewBytes(json.bufferViews[json.accessors[accessorIndex].bufferView]);
  const primitive = json.meshes[0].primitives[0];
  const image = json.images[json.textures[json.materials[primitive.material].pbrMetallicRoughness.baseColorTexture.index].source];
  return {
    mesh: {
      positions: new Float32Array(viewOf(primitive.attributes.POSITION)),
      normals: new Float32Array(viewOf(primitive.attributes.NORMAL)),
      uvs: new Float32Array(viewOf(primitive.attributes.TEXCOORD_0)),
      indices: new Uint16Array(viewOf(primitive.indices)),
    },
    texture: { mimeType: image.mimeType, data: new Uint8Array(viewBytes(json.bufferViews[image.bufferView])) },
  };
}
// #endregion
