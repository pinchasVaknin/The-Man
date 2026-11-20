// ============================================================================
// MODULE: World / Models / Animals / Clip-Rig GLB Format
// DESIGN: One GLB per animal. The bind-pose mesh is plain glTF (viewable, with its texture); the
//         rig and baked clips ride along as extra binary views listed in asset.extras. Same
//         container as plants and saddles (glbContainer). Quantized sources stay lossless:
//         rotations are stored as the int16 they came from and divided on decode.
// SUMMARY: Encodes a clip-driven animal (mesh, skin, skeleton, baked clips, texture) into a GLB and
//          decodes one back into the arrays the animators read. Does not animate or build meshes.
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
import type { IClipRigModelData } from '../animalModelAssets';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** Value of asset.extras.format in every clip-rig animal GLB. */
export const CLIP_RIG_GLB_FORMAT = 'theman-clip-rig-model@1';

const UNSIGNED_BYTE_COMPONENT = 5121;
/** The baked rotations were authored as int16 / 32767. */
const ROTATION_QUANTUM = 32767;

/** Summary: Everything one clip-rig animal GLB holds. */
export interface IClipRigGlbData {
  readonly rig: IClipRigModelData;
  readonly texture: ITextureImage;
}

/** Buffer views (by index) of the rig arrays that have no glTF equivalent. */
interface IClipRigViews {
  readonly parents: number;
  readonly restTranslations: number;
  readonly restRotations: number;
  readonly inverseBindMatrices: number;
  readonly clipDurations: number;
  readonly clipRootTranslations: number;
  readonly clipJointRotations: number;
}

interface IClipRigExtras {
  format: string;
  kind: 'clip-rig';
  jointCount: number;
  clipCount: number;
  framesPerClip: number;
  views: IClipRigViews;
}

interface IClipRigGltfJson {
  asset: { version: string; generator?: string; extras: IClipRigExtras };
  scene: number;
  scenes: Array<{ nodes: number[] }>;
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
// #region Encode Clip-Rig GLB
/**
 * Summary: Writes a clip-driven animal into one GLB.
 * Design: Geometry and weights stay float32 (exact). Rotations are the dominant array, so they are
 *         stored as int16 and divided by 32767 on decode, which reproduces the source floats.
 * @param model The animal's decoded arrays.
 * @param framesPerClip Frames in every baked clip.
 * @param textureDataUri The animal's JPEG texture as a base64 data URI.
 * @returns The GLB file bytes.
 * @throws InfrastructureCorruptedException when the texture is not a base64 data URI or a rotation is not on the int16 grid.
 */
export function encodeClipRigGlb(model: IClipRigModelData, framesPerClip: number, textureDataUri: string): ArrayBuffer {
  const binary = new BinaryBuilder();
  const image = decodeDataUri(textureDataUri);
  const imageView = binary.addView(image.data);
  const accessors: IGltfAccessor[] = [];
  const addAccessor = (view: number, componentType: number, count: number, type: IGltfAccessor['type'] | 'VEC4', bounds?: { min: number[]; max: number[] }): number => {
    accessors.push({ bufferView: view, componentType, count, type: type as IGltfAccessor['type'], ...(bounds ?? {}) });
    return accessors.length - 1;
  };

  const vertexCount = model.positions.length / 3;
  const attributes = {
    POSITION: addAccessor(binary.addView(bytesOf(model.positions), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, vertexCount, 'VEC3', minMax(model.positions)),
    NORMAL: addAccessor(binary.addView(bytesOf(model.normals), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, vertexCount, 'VEC3'),
    TEXCOORD_0: addAccessor(binary.addView(bytesOf(model.uvs), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, vertexCount, 'VEC2'),
    JOINTS_0: addAccessor(binary.addView(model.skinIndices, ARRAY_BUFFER_TARGET), UNSIGNED_BYTE_COMPONENT, vertexCount, 'VEC4'),
    WEIGHTS_0: addAccessor(binary.addView(new Uint8Array(model.skinWeights.buffer, model.skinWeights.byteOffset, model.skinWeights.byteLength), ARRAY_BUFFER_TARGET), FLOAT_COMPONENT, vertexCount, 'VEC4'),
  };
  const indices = addAccessor(binary.addView(bytesOf(model.indices), ELEMENT_ARRAY_BUFFER_TARGET), UNSIGNED_SHORT_COMPONENT, model.indices.length, 'SCALAR');

  const rotations = new Int16Array(model.clipJointRotations.length);
  for (let i = 0; i < rotations.length; i++) {
    const quantized = Math.round(model.clipJointRotations[i] * ROTATION_QUANTUM);
    if (Math.fround(quantized / ROTATION_QUANTUM) !== model.clipJointRotations[i]) {
      throw new InfrastructureCorruptedException('A baked rotation is not on the int16 grid.');
    }
    rotations[i] = quantized;
  }
  const rawView = (bytes: Uint8Array): number => binary.addView(bytes);
  const views: IClipRigViews = {
    parents: rawView(new Uint8Array(model.parents.buffer, model.parents.byteOffset, model.parents.byteLength)),
    restTranslations: rawView(bytesOf(model.restTranslations)),
    restRotations: rawView(bytesOf(model.restRotations)),
    inverseBindMatrices: rawView(bytesOf(model.inverseBindMatrices)),
    clipDurations: rawView(bytesOf(model.clipDurations)),
    clipRootTranslations: rawView(bytesOf(model.clipRootTranslations)),
    clipJointRotations: rawView(new Uint8Array(rotations.buffer)),
  };

  const bin = binary.toBytes();
  const json: IClipRigGltfJson = {
    asset: {
      version: '2.0',
      generator: CLIP_RIG_GLB_FORMAT,
      extras: {
        format: CLIP_RIG_GLB_FORMAT,
        kind: 'clip-rig',
        jointCount: model.parents.length,
        clipCount: model.clipDurations.length,
        framesPerClip,
        views,
      },
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'bindPose', mesh: 0 }],
    meshes: [{ name: 'bindPose', primitives: [{ attributes, indices, material: 0 }] }],
    materials: [{ name: 'animal', pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
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
// #region Decode Clip-Rig GLB
/**
 * Summary: Reads a clip-rig animal GLB back into the arrays the animators read, plus the texture image.
 * @param bytes The GLB file bytes.
 * @throws InfrastructureCorruptedException when the container or the format marker is wrong.
 */
export function decodeClipRigGlb(bytes: ArrayBuffer): IClipRigGlbData {
  const { json: rawJson, viewBytes } = readGlb(bytes, 'Animal model');
  const json = rawJson as IClipRigGltfJson;
  const extras = json.asset?.extras;
  if (extras?.format !== CLIP_RIG_GLB_FORMAT) {
    throw new InfrastructureCorruptedException(`Animal model format is not ${CLIP_RIG_GLB_FORMAT}.`);
  }
  const viewOf = (index: number): ArrayBuffer => viewBytes(json.bufferViews[index]);
  const accessorView = (index: number): ArrayBuffer => viewOf(json.accessors[index].bufferView);
  const primitive = json.meshes[0].primitives[0];

  const rotationsI16 = new Int16Array(viewOf(extras.views.clipJointRotations));
  const clipJointRotations = new Float32Array(rotationsI16.length);
  for (let i = 0; i < rotationsI16.length; i++) clipJointRotations[i] = rotationsI16[i] / ROTATION_QUANTUM;

  const image = json.images[json.textures[json.materials[primitive.material].pbrMetallicRoughness.baseColorTexture.index].source];
  return {
    rig: {
      positions: new Float32Array(accessorView(primitive.attributes.POSITION)),
      normals: new Float32Array(accessorView(primitive.attributes.NORMAL)),
      uvs: new Float32Array(accessorView(primitive.attributes.TEXCOORD_0)),
      skinIndices: new Uint8Array(accessorView(primitive.attributes.JOINTS_0)),
      skinWeights: new Float32Array(accessorView(primitive.attributes.WEIGHTS_0)),
      indices: new Uint16Array(accessorView(primitive.indices)),
      parents: new Int8Array(viewOf(extras.views.parents)),
      restTranslations: new Float32Array(viewOf(extras.views.restTranslations)),
      restRotations: new Float32Array(viewOf(extras.views.restRotations)),
      inverseBindMatrices: new Float32Array(viewOf(extras.views.inverseBindMatrices)),
      clipDurations: new Float32Array(viewOf(extras.views.clipDurations)),
      clipRootTranslations: new Float32Array(viewOf(extras.views.clipRootTranslations)),
      clipJointRotations,
    },
    texture: { mimeType: image.mimeType, data: new Uint8Array(viewOf(image.bufferView)) },
  };
}
// #endregion
