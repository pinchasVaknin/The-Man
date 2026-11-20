// ============================================================================
// MODULE: World / Models / Characters / Character Assets
// DESIGN: Asset library (cache + async loading) over GLB files read with three's GLTFLoader, the same
//         shape as animalModelAssets and floraAssets
// SUMMARY: Loads the dwarf and monk GLBs (skinned mesh, skeleton, 11 named clips, WebP texture) and
//          hands the decoded geometry, rig arrays and animation clips out synchronously once loaded.
//          Builds no rigs or materials; DwarfWarrior_Complete and WarriorMonk_Complete do.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { InfrastructureCorruptedException } from '../../../core/AppException';
import { dequantize, findSkinnedMesh, readStoredSkinWeights } from '../animalModelAssets';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Every character model shipped as a GLB file under /models/characters/. */
export type CharacterModelId = 'dwarf-warrior' | 'warrior-monk';

/** Summary: All character ids, in load order. */
export const CHARACTER_MODEL_IDS: readonly CharacterModelId[] = ['dwarf-warrior', 'warrior-monk'];

/** Summary: A decoded character: skinned geometry, skeleton arrays, named clips and the texture. */
export interface ICharacterModelAsset {
  readonly id: CharacterModelId;
  readonly geometry: THREE.BufferGeometry;
  readonly parents: Int8Array;
  readonly restTranslations: Float32Array;
  readonly restRotations: Float32Array;
  readonly inverseBindMatrices: Float32Array;
  readonly clips: Record<string, THREE.AnimationClip>;
  /** Base color texture; null where images cannot be decoded (node tests). */
  readonly texture: THREE.Texture | null;
}

/** Summary: Fetches the raw bytes of one character GLB. */
export type CharacterModelFetcher = (id: CharacterModelId) => Promise<ArrayBuffer>;

interface ICharacterModelExtras {
  readonly format: string;
  readonly kind: 'character';
  readonly parents: readonly number[];
}
// #endregion

// ======================== CONSTANTS ======================== \\
// #region Constants
/** Value of asset.extras.format in every character GLB. */
export const CHARACTER_MODEL_FORMAT = 'theman-character-model@1';
const NORMAL_QUANTUM = 127;
const UV_QUANTUM = 65535;
// #endregion

// ======================== DECODING ======================== \\
// #region Decoding
function findTexture(scene: THREE.Object3D): THREE.Texture | null {
  let texture: THREE.Texture | null = null;
  scene.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!texture && material?.map) texture = material.map;
  });
  return texture;
}

/**
 * Summary: Parses one character GLB and decodes it for the game's rigs.
 * Design: Reads the skeleton and clips through GLTFLoader, but takes normals and skin weights from
 *         the stored bytes so they match the original packs exactly (GLTFLoader renormalizes weights in
 *         place, and the file may store normals with a byte stride).
 * @param id Model id (for error messages).
 * @param bytes GLB file contents.
 * @returns The decoded asset.
 * @throws InfrastructureCorruptedException when the file is not a character model of the known format.
 */
export async function parseCharacterModelGlb(id: CharacterModelId, bytes: ArrayBuffer): Promise<ICharacterModelAsset> {
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  const extras = (gltf.asset as { extras?: ICharacterModelExtras }).extras;
  if (!extras || extras.format !== CHARACTER_MODEL_FORMAT) {
    throw new InfrastructureCorruptedException(`Character model '${id}' has an unknown format.`);
  }
  const mesh = findSkinnedMesh(gltf);
  const source = mesh.geometry;
  const bones = mesh.skeleton.bones;

  const restTranslations = new Float32Array(bones.length * 3);
  const restRotations = new Float32Array(bones.length * 4);
  const inverseBindMatrices = new Float32Array(bones.length * 16);
  bones.forEach((bone, j) => {
    bone.position.toArray(restTranslations, j * 3);
    bone.quaternion.toArray(restRotations, j * 4);
    mesh.skeleton.boneInverses[j].toArray(inverseBindMatrices, j * 16);
  });

  const storedWeights = readStoredSkinWeights(gltf, bytes);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(source.getAttribute('position').array), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(dequantize(source.getAttribute('normal'), NORMAL_QUANTUM), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(dequantize(source.getAttribute('uv'), UV_QUANTUM), 2));
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(Uint8Array.from(source.getAttribute('skinIndex').array), 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(Uint8Array.from(storedWeights.values), 4, true));
  geometry.setIndex(new THREE.BufferAttribute(Uint16Array.from(source.index?.array ?? []), 1));
  geometry.computeBoundingSphere();

  const clips: Record<string, THREE.AnimationClip> = {};
  for (const clip of gltf.animations) clips[clip.name] = clip;

  return {
    id,
    geometry,
    parents: Int8Array.from(extras.parents),
    restTranslations,
    restRotations,
    inverseBindMatrices,
    clips,
    texture: findTexture(gltf.scene),
  };
}
// #endregion

// ======================== TEXTURE ======================== \
// #region Character Texture
/**
 * Summary: Creates a texture over the model's decoded image, with the flags the characters always used.
 * Design: Without a decoded image (node tests) the texture is a single pixel of `fallbackRgb`, as before.
 * @param asset Loaded character.
 * @param fallbackRgb Pixel color when no image can be decoded.
 */
export function createCharacterTexture(asset: ICharacterModelAsset, fallbackRgb: readonly [number, number, number]): THREE.Texture {
  const image = asset.texture?.image;
  if (!image) {
    const fallback = new THREE.DataTexture(new Uint8Array([fallbackRgb[0], fallbackRgb[1], fallbackRgb[2], 255]), 1, 1);
    fallback.flipY = false;
    fallback.colorSpace = THREE.SRGBColorSpace;
    fallback.needsUpdate = true;
    return fallback;
  }
  const texture = new THREE.Texture(image);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
// #endregion

// ======================== LIBRARY ======================== \\
// #region Library
const loadedAssets = new Map<CharacterModelId, ICharacterModelAsset>();
const pendingLoads = new Map<CharacterModelId, Promise<ICharacterModelAsset>>();

/** Summary: Default fetcher: GET /models/characters/<id>.glb from the app's base URL. */
export const fetchCharacterModelFromServer: CharacterModelFetcher = async (id) => {
  const response = await fetch(`${import.meta.env.BASE_URL}models/characters/${id}.glb`);
  if (!response.ok) {
    throw new InfrastructureCorruptedException(`Character model '${id}' could not be downloaded (${response.status}).`);
  }
  return response.arrayBuffer();
};

/**
 * Summary: Loads one character once; later calls share the same promise.
 * @param id Character to load.
 * @param fetcher Byte source (the server by default; tests read from disk).
 * @throws InfrastructureCorruptedException when the download or the file format is wrong.
 */
export function loadCharacterModel(id: CharacterModelId, fetcher: CharacterModelFetcher = fetchCharacterModelFromServer): Promise<ICharacterModelAsset> {
  const pending = pendingLoads.get(id);
  if (pending) return pending;
  const load = fetcher(id)
    .then((bytes) => parseCharacterModelGlb(id, bytes))
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
 * Summary: Starts loading every character.
 * @param fetcher Byte source (the server by default).
 * @returns Resolves when all characters are loaded.
 */
export function preloadAllCharacterModels(fetcher?: CharacterModelFetcher): Promise<ICharacterModelAsset[]> {
  return Promise.all(CHARACTER_MODEL_IDS.map((id) => loadCharacterModel(id, fetcher)));
}

/**
 * Summary: Returns a loaded character for the synchronous rig factories.
 * @throws InfrastructureCorruptedException when the character was not loaded first.
 */
export function getLoadedCharacterModel(id: CharacterModelId): ICharacterModelAsset {
  const asset = loadedAssets.get(id);
  if (!asset) {
    throw new InfrastructureCorruptedException(`Character model '${id}' was used before it finished loading.`);
  }
  return asset;
}
// #endregion
