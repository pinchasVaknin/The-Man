// ============================================================================
// MODULE: World / Models / Animal Model Assets
// DESIGN: Asset library (cache + async loading) over GLB files read with three's GLTFLoader
// SUMMARY: Loads the animal GLB files (mesh, skeleton, texture, animation clips) after the
//          first frame, decodes them into the arrays the existing rigs and animators use,
//          and hands them out synchronously once loaded. Does not animate anything.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { InfrastructureCorruptedException } from '../../core/AppException';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Every animal model shipped as a GLB file under /models/animals/. */
export type AnimalModelId =
  | 'bear'
  | 'crocodile'
  | 'jaguar'
  | 'wolf'
  | 'rhino'
  | 'demon-dragon'
  | 'forest-dragon'
  | 'deer';

/** Summary: All model ids, in load order (the most common animals first). */
export const ANIMAL_MODEL_IDS: readonly AnimalModelId[] = [
  'deer',
  'bear',
  'wolf',
  'jaguar',
  'crocodile',
  'rhino',
  'forest-dragon',
  'demon-dragon',
];

/**
 * Summary: Decoded skinned mesh with baked clips, in the layout the clip-driven animators read.
 * Design: Clip arrays are flat: rotations are [clip][frame][joint][xyzw], root translations
 *         are [clip][frame][xyz] for the root-motion joint.
 */
export interface IClipRigModelData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly uvs: Float32Array;
  readonly skinIndices: Uint8Array;
  readonly skinWeights: Float32Array;
  readonly indices: Uint16Array;
  readonly parents: Int8Array;
  readonly restTranslations: Float32Array;
  readonly restRotations: Float32Array;
  readonly inverseBindMatrices: Float32Array;
  readonly clipDurations: Float32Array;
  readonly clipRootTranslations: Float32Array;
  readonly clipJointRotations: Float32Array;
}

/** Summary: A loaded animal model: clip-rig data or a ready skinned geometry, plus its texture. */
export interface IAnimalModelAsset {
  readonly id: AnimalModelId;
  /** Present for clip-driven models (all except the deer). */
  readonly clipRig: IClipRigModelData | null;
  /** Present for the procedurally animated deer: skinned geometry with jawStartIdx in userData. */
  readonly geometry: THREE.BufferGeometry | null;
  /** Base color texture; null where images cannot be decoded (node tests). */
  readonly texture: THREE.Texture | null;
}

/** Summary: Fetches the raw bytes of one model file. */
export type AnimalModelFetcher = (id: AnimalModelId) => Promise<ArrayBuffer>;

interface IAnimalModelExtras {
  readonly format: string;
  readonly kind: 'clip-rig' | 'procedural-rig';
  readonly jointCount?: number;
  readonly framesPerClip?: number;
  readonly rootMotionJoint?: number;
  readonly clipDurations?: readonly number[];
  readonly parents?: readonly number[];
  readonly jawStartIdx?: number;
}
// #endregion

// ======================== CONSTANTS ======================== \\
// #region Constants
const MODEL_FORMAT = 'theman-animal-model@1';
/** glTF componentType for unsigned 8-bit integers. */
const UNSIGNED_BYTE = 5121;
/** GLB file header: magic, version, length. */
const GLB_HEADER_BYTES = 12;
/** GLB chunk header: length, type. */
const GLB_CHUNK_HEADER_BYTES = 8;
// #endregion

// ======================== DECODING ======================== \\
// #region Decoding
function findSkinnedMesh(gltf: GLTF): THREE.SkinnedMesh {
  let found: THREE.SkinnedMesh | null = null;
  gltf.scene.traverse((object) => {
    if (!found && (object as THREE.SkinnedMesh).isSkinnedMesh) found = object as THREE.SkinnedMesh;
  });
  if (!found) throw new InfrastructureCorruptedException('Animal model has no skinned mesh.');
  return found;
}

/** Converts a (possibly normalized integer) attribute to floats, using the original pack's dequantization. */
function dequantize(attribute: THREE.BufferAttribute, divisor: number): Float32Array {
  const source = attribute.array;
  if (!attribute.normalized) return new Float32Array(source);
  const out = new Float32Array(source.length);
  for (let i = 0; i < source.length; i++) out[i] = source[i] / divisor;
  return out;
}

/**
 * Summary: Reads the stored skin weights straight from the GLB bytes.
 * Design: GLTFLoader renormalizes skin weights in place (on views of its binary chunk) while it
 *         builds the mesh, which rounds quantized u8 weights again; reading the untouched input
 *         bytes keeps the exact stored values.
 */
function readStoredSkinWeights(gltf: GLTF, bytes: ArrayBuffer): { readonly values: ArrayLike<number>; readonly isQuantized: boolean } {
  const json = gltf.parser.json as {
    meshes: Array<{ primitives: Array<{ attributes: Record<string, number> }> }>;
    accessors: Array<{ bufferView: number; byteOffset?: number; count: number; componentType: number }>;
    bufferViews: Array<{ byteOffset?: number }>;
  };
  const header = new DataView(bytes);
  const jsonChunkLength = header.getUint32(GLB_HEADER_BYTES, true);
  const binChunkStart = GLB_HEADER_BYTES + GLB_CHUNK_HEADER_BYTES + jsonChunkLength + GLB_CHUNK_HEADER_BYTES;
  const accessor = json.accessors[json.meshes[0].primitives[0].attributes.WEIGHTS_0];
  const start = binChunkStart + (json.bufferViews[accessor.bufferView].byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const length = accessor.count * 4;
  if (accessor.componentType === UNSIGNED_BYTE) {
    return { values: new Uint8Array(bytes.slice(start, start + length)), isQuantized: true };
  }
  return { values: new Float32Array(bytes.slice(start, start + length * 4)), isQuantized: false };
}

/**
 * Summary: Skin weights summing to 1, computed like the original packs (float64 math).
 * Design: Quantized u8 weights are divided by 255 and renormalized per vertex; float weights pass through.
 */
function decodeSkinWeights(source: ArrayLike<number>, isQuantized: boolean): Float32Array {
  if (!isQuantized) return Float32Array.from(source);
  const out = new Float32Array(source.length);
  for (let v = 0; v < source.length; v += 4) {
    const w0 = source[v] / 255.0;
    const w1 = source[v + 1] / 255.0;
    const w2 = source[v + 2] / 255.0;
    const w3 = source[v + 3] / 255.0;
    const sum = w0 + w1 + w2 + w3;
    const inv = sum > 1e-6 ? 1.0 / sum : 1.0;
    out[v] = w0 * inv;
    out[v + 1] = w1 * inv;
    out[v + 2] = w2 * inv;
    out[v + 3] = w3 * inv;
  }
  return out;
}


function decodeClipRig(
  gltf: GLTF,
  extras: IAnimalModelExtras,
  storedWeights: { readonly values: ArrayLike<number>; readonly isQuantized: boolean }
): IClipRigModelData {
  const mesh = findSkinnedMesh(gltf);
  const geometry = mesh.geometry;
  const bones = mesh.skeleton.bones;
  const jointCount = bones.length;
  const frames = extras.framesPerClip ?? 24;
  const rootJoint = extras.rootMotionJoint ?? 0;
  const clipCount = gltf.animations.length;

  const restTranslations = new Float32Array(jointCount * 3);
  const restRotations = new Float32Array(jointCount * 4);
  const inverseBindMatrices = new Float32Array(jointCount * 16);
  for (let j = 0; j < jointCount; j++) {
    bones[j].position.toArray(restTranslations, j * 3);
    bones[j].quaternion.toArray(restRotations, j * 4);
    mesh.skeleton.boneInverses[j].toArray(inverseBindMatrices, j * 16);
  }

  const boneIndexByName = new Map(bones.map((bone, index) => [bone.name, index]));
  const clipRootTranslations = new Float32Array(clipCount * frames * 3);
  const clipJointRotations = new Float32Array(clipCount * frames * jointCount * 4);
  gltf.animations.forEach((clip, c) => {
    for (const track of clip.tracks) {
      const [boneName, property] = track.name.split('.');
      const j = boneIndexByName.get(boneName);
      if (j === undefined) continue;
      if (property === 'quaternion') {
        for (let f = 0; f < frames; f++) {
          for (let k = 0; k < 4; k++) {
            clipJointRotations[((c * frames + f) * jointCount + j) * 4 + k] = track.values[f * 4 + k];
          }
        }
      } else if (property === 'position' && j === rootJoint) {
        clipRootTranslations.set(track.values.subarray(0, frames * 3), c * frames * 3);
      }
    }
  });

  const skinIndexAttribute = geometry.getAttribute('skinIndex') as THREE.BufferAttribute;
  return {
    positions: new Float32Array(geometry.getAttribute('position').array),
    normals: dequantize(geometry.getAttribute('normal') as THREE.BufferAttribute, 127),
    uvs: dequantize(geometry.getAttribute('uv') as THREE.BufferAttribute, 65535),
    skinIndices: Uint8Array.from(skinIndexAttribute.array),
    skinWeights: decodeSkinWeights(storedWeights.values, storedWeights.isQuantized),
    indices: Uint16Array.from(geometry.index?.array ?? []),
    parents: Int8Array.from(extras.parents ?? bones.map((bone) => bones.indexOf(bone.parent as THREE.Bone))),
    restTranslations,
    restRotations,
    inverseBindMatrices,
    clipDurations: Float32Array.from(extras.clipDurations ?? gltf.animations.map((clip) => clip.duration)),
    clipRootTranslations,
    clipJointRotations,
  };
}

function decodeProceduralGeometry(
  gltf: GLTF,
  extras: IAnimalModelExtras,
  storedWeights: { readonly values: ArrayLike<number>; readonly isQuantized: boolean }
): THREE.BufferGeometry {
  const source = findSkinnedMesh(gltf).geometry;
  const geometry = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'skinIndex']) {
    const attribute = source.getAttribute(name) as THREE.BufferAttribute;
    geometry.setAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize, attribute.normalized));
  }
  geometry.setAttribute(
    'skinWeight',
    new THREE.BufferAttribute(decodeSkinWeights(storedWeights.values, storedWeights.isQuantized), 4)
  );
  if (source.index) geometry.setIndex(new THREE.BufferAttribute(Uint16Array.from(source.index.array), 1));
  geometry.userData = { jawStartIdx: extras.jawStartIdx ?? 999999 };
  return geometry;
}

function findTexture(gltf: GLTF): THREE.Texture | null {
  let texture: THREE.Texture | null = null;
  gltf.scene.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!texture && material?.map) texture = material.map;
  });
  return texture;
}

/**
 * Summary: Parses one animal GLB and decodes it for the game's rigs.
 * @param id Model id (for error messages).
 * @param bytes GLB file contents.
 * @returns The decoded asset.
 * @throws InfrastructureCorruptedException when the file is not an animal model of a known format.
 */
export async function parseAnimalModelGlb(id: AnimalModelId, bytes: ArrayBuffer): Promise<IAnimalModelAsset> {
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  const extras = (gltf.asset as { extras?: IAnimalModelExtras }).extras;
  if (!extras || extras.format !== MODEL_FORMAT) {
    throw new InfrastructureCorruptedException(`Animal model '${id}' has an unknown format.`);
  }
  const texture = findTexture(gltf);
  const storedWeights = readStoredSkinWeights(gltf, bytes);
  if (extras.kind === 'clip-rig') {
    return { id, clipRig: decodeClipRig(gltf, extras, storedWeights), geometry: null, texture };
  }
  return { id, clipRig: null, geometry: decodeProceduralGeometry(gltf, extras, storedWeights), texture };
}
// #endregion

// ======================== LIBRARY ======================== \\
// #region Library
const loadedAssets = new Map<AnimalModelId, IAnimalModelAsset>();
const pendingLoads = new Map<AnimalModelId, Promise<IAnimalModelAsset>>();

/** Summary: Default fetcher: GET /models/animals/<id>.glb from the app's base URL. */
export const fetchAnimalModelFromServer: AnimalModelFetcher = async (id) => {
  const response = await fetch(`${import.meta.env.BASE_URL}models/animals/${id}.glb`);
  if (!response.ok) {
    throw new InfrastructureCorruptedException(`Animal model '${id}' could not be downloaded (${response.status}).`);
  }
  return response.arrayBuffer();
};

/**
 * Summary: Loads one model once; later calls share the same promise.
 * @param id Model to load.
 * @param fetcher Byte source (the server by default; tests read from disk).
 * @returns The decoded asset.
 */
export function loadAnimalModel(
  id: AnimalModelId,
  fetcher: AnimalModelFetcher = fetchAnimalModelFromServer
): Promise<IAnimalModelAsset> {
  const pending = pendingLoads.get(id);
  if (pending) return pending;
  const load = fetcher(id)
    .then((bytes) => parseAnimalModelGlb(id, bytes))
    .then((asset) => {
      loadedAssets.set(id, asset);
      return asset;
    });
  pendingLoads.set(id, load);
  // A failed download may be retried by a later call.
  load.catch(() => pendingLoads.delete(id));
  return load;
}

/**
 * Summary: Starts loading every animal model.
 * @param fetcher Byte source (the server by default).
 * @returns Resolves when all models are loaded.
 */
export function preloadAllAnimalModels(fetcher?: AnimalModelFetcher): Promise<IAnimalModelAsset[]> {
  return Promise.all(ANIMAL_MODEL_IDS.map((id) => loadAnimalModel(id, fetcher)));
}

/** Summary: True once the model is loaded and can be built synchronously. */
export function isAnimalModelLoaded(id: AnimalModelId): boolean {
  return loadedAssets.has(id);
}

/**
 * Summary: Returns a loaded model for the synchronous model factories.
 * @throws InfrastructureCorruptedException when the model was not loaded first.
 */
export function getLoadedAnimalModel(id: AnimalModelId): IAnimalModelAsset {
  const asset = loadedAssets.get(id);
  if (!asset) {
    throw new InfrastructureCorruptedException(`Animal model '${id}' was used before it finished loading.`);
  }
  return asset;
}
// #endregion

// ======================== MODEL FACTORY HELPERS ======================== \\
// #region Model Factory Helpers
/** Summary: Per-model texture settings, matching what each model used before the GLB move. */
export interface IAnimalTextureSettings {
  /** sRGB for most models; the dragons keep three's default (no color space). */
  readonly colorSpace?: THREE.ColorSpace;
  /** RepeatWrapping for models whose UVs span 0..2 (crocodile, rhino). */
  readonly wrap?: THREE.Wrapping;
}

/**
 * Summary: Creates a texture over the model's decoded image with the model's own settings.
 * Design: The GLB image is shared; each texture object keeps the per-model flags the animal
 *         code always used (flipY off, color space, wrapping). Without a decoded image (node
 *         tests) the texture is empty, as before.
 * @param asset Loaded model.
 * @param settings Color space and wrapping.
 * @returns A new texture.
 */
export function createAnimalTexture(asset: IAnimalModelAsset, settings: IAnimalTextureSettings): THREE.Texture {
  const texture = new THREE.Texture(asset.texture?.image ?? undefined);
  texture.flipY = false;
  if (settings.colorSpace) texture.colorSpace = settings.colorSpace;
  if (settings.wrap !== undefined) {
    texture.wrapS = settings.wrap;
    texture.wrapT = settings.wrap;
  }
  if (asset.texture?.image) texture.needsUpdate = true;
  return texture;
}

/**
 * Summary: Returns the clip-rig data of a clip-driven model.
 * @throws InfrastructureCorruptedException when the model is the procedural deer.
 */
export function requireClipRig(asset: IAnimalModelAsset): IClipRigModelData {
  if (!asset.clipRig) {
    throw new InfrastructureCorruptedException(`Animal model '${asset.id}' has no baked clips.`);
  }
  return asset.clipRig;
}

/**
 * Summary: Returns the skinned geometry of the procedurally animated deer.
 * @throws InfrastructureCorruptedException when the model is clip-driven.
 */
export function requireProceduralGeometry(asset: IAnimalModelAsset): THREE.BufferGeometry {
  if (!asset.geometry) {
    throw new InfrastructureCorruptedException(`Animal model '${asset.id}' has no procedural geometry.`);
  }
  return asset.geometry;
}
// #endregion
