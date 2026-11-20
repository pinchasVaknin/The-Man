// ============================================================================
// MODULE: Tooling / Animal GLB Converter
// DESIGN: One-off exporter. Builds a SkinnedMesh and AnimationClips from each animal's unpacked base64
//         data, exports them with THREE.GLTFExporter, then patches the GLB so it matches the format of
//         the first eight animals (theman-animal-model@1): asset.extras, the JPEG texture, and the
//         KHR_mesh_quantization marker for the int8 normals.
// SUMMARY: Writes public/models/animals/<name>.glb for the seven animals still packed as base64.
//          Run with: npx tsx scripts/convertClipRigAnimalsToGlb.ts
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { decodeDataUri, writeGlb } from '../src/world/models/glbContainer';
import type { IClipRigModelData } from '../src/world/models/animalModelAssets';
import { CAT_LION_EMBEDDED_PACK_B64, CAT_LION_EMBEDDED_TEXTURE_URI, unpackCatLionBundle } from '../src/world/models/animals/CatLion_Complete';
import { STAG_EMBEDDED_PACK_B64, STAG_EMBEDDED_TEXTURE_URI, unpackStagBundle } from '../src/world/models/animals/Stag_Complete';
import { DOVE_EMBEDDED_PACK_B64, DOVE_EMBEDDED_TEXTURE_URI, unpackDoveBundle } from '../src/world/models/animals/Dove_Complete';
import { HORSE_EMBEDDED_PACK_B64, HORSE_EMBEDDED_TEXTURE_URI, unpackHorseBundle } from '../src/world/models/animals/Horse_Complete';
import { DOLPHIN_PACK_B64, DOLPHIN_TEX_B64, unpackDolphinBundle } from '../src/world/models/animals/Dolphin_Complete';
import { HIPPO_PACK_B64, HIPPO_TEX_B64, unpackHippoBundle } from '../src/world/models/animals/Hippo_Complete';
import { KOIFISH_PACK_B64, KOIFISH_TEX_B64, unpackKoiFishBundle } from '../src/world/models/animals/KoiFish_Complete';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
interface IAnimalSource {
  readonly fileName: string;
  /** Name used for the nodes (for example "Stag" gives StagJoint_0 and StagMesh). */
  readonly modelName: string;
  /** Source module, read as text to get the clip names in playback order. */
  readonly moduleFile: string;
  readonly unpack: () => IClipRigModelData;
  readonly textureDataUri: string;
  /** The joint the animator moves with the baked root translation (read from each animator). */
  readonly rootMotionJoint: number;
}

const MODEL_FORMAT = 'theman-animal-model@1';
const QUANTIZATION_EXTENSION = 'KHR_mesh_quantization';
const NORMAL_QUANTUM = 127;
const GLB_HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;

const ANIMALS: readonly IAnimalSource[] = [
  { fileName: 'cat-lion', modelName: 'CatLion', moduleFile: 'CatLion_Complete.ts', unpack: () => unpackCatLionBundle(CAT_LION_EMBEDDED_PACK_B64), textureDataUri: CAT_LION_EMBEDDED_TEXTURE_URI, rootMotionJoint: 2 },
  { fileName: 'stag', modelName: 'Stag', moduleFile: 'Stag_Complete.ts', unpack: () => unpackStagBundle(STAG_EMBEDDED_PACK_B64), textureDataUri: STAG_EMBEDDED_TEXTURE_URI, rootMotionJoint: 2 },
  { fileName: 'dove', modelName: 'Dove', moduleFile: 'Dove_Complete.ts', unpack: () => unpackDoveBundle(DOVE_EMBEDDED_PACK_B64), textureDataUri: DOVE_EMBEDDED_TEXTURE_URI, rootMotionJoint: 2 },
  { fileName: 'horse', modelName: 'Horse', moduleFile: 'Horse_Complete.ts', unpack: () => unpackHorseBundle(HORSE_EMBEDDED_PACK_B64), textureDataUri: HORSE_EMBEDDED_TEXTURE_URI, rootMotionJoint: 2 },
  { fileName: 'dolphin', modelName: 'Dolphin', moduleFile: 'Dolphin_Complete.ts', unpack: () => unpackDolphinBundle(DOLPHIN_PACK_B64), textureDataUri: DOLPHIN_TEX_B64, rootMotionJoint: 0 },
  { fileName: 'hippo', modelName: 'Hippo', moduleFile: 'Hippo_Complete.ts', unpack: () => unpackHippoBundle(HIPPO_PACK_B64), textureDataUri: HIPPO_TEX_B64, rootMotionJoint: 2 },
  { fileName: 'koi-fish', modelName: 'KoiFish', moduleFile: 'KoiFish_Complete.ts', unpack: () => unpackKoiFishBundle(KOIFISH_PACK_B64), textureDataUri: KOIFISH_TEX_B64, rootMotionJoint: 2 },
];

const OUTPUT_DIRECTORY = new URL('../public/models/animals/', import.meta.url);
const MODULE_DIRECTORY = new URL('../src/world/models/animals/', import.meta.url);
// #endregion

// ======================== NODE POLYFILL ======================== \\
// #region FileReader Polyfill
/** GLTFExporter reads its binary Blob through FileReader, which node does not have. */
(globalThis as { FileReader?: unknown }).FileReader = class {
  public result: ArrayBuffer | null = null;
  public onloadend: (() => void) | null = null;
  public readAsArrayBuffer(blob: Blob): void {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};
// #endregion

// ======================== BUILD THE SCENE ======================== \\
// #region Build Skinned Mesh And Clips
function readClipNames(moduleFile: string): string[] {
  const source = readFileSync(new URL(moduleFile, MODULE_DIRECTORY), 'utf8');
  const block = /const CLIP_ORDER: [A-Za-z]+\[\] = \[([^\]]*)\];/.exec(source);
  if (!block) throw new Error(`No CLIP_ORDER in ${moduleFile}`);
  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function buildScene(source: IAnimalSource, rig: IClipRigModelData): { scene: THREE.Group; clips: THREE.AnimationClip[]; framesPerClip: number } {
  const jointCount = rig.parents.length;
  const clipCount = rig.clipDurations.length;
  const framesPerClip = rig.clipRootTranslations.length / 3 / clipCount;
  const clipNames = readClipNames(source.moduleFile);
  if (clipNames.length !== clipCount) throw new Error(`${source.fileName}: ${clipNames.length} clip names for ${clipCount} clips`);

  const bones: THREE.Bone[] = [];
  for (let j = 0; j < jointCount; j++) {
    const bone = new THREE.Bone();
    bone.name = `${source.modelName}Joint_${j}`;
    bone.position.fromArray(rig.restTranslations, j * 3);
    bone.quaternion.fromArray(rig.restRotations, j * 4);
    bones.push(bone);
  }
  for (let j = 0; j < jointCount; j++) {
    if (rig.parents[j] >= 0) bones[rig.parents[j]].add(bones[j]);
  }
  const scene = new THREE.Group();
  scene.name = source.modelName;
  scene.add(bones[0]);
  const skeleton = new THREE.Skeleton(bones, Array.from({ length: jointCount }, (_, j) => new THREE.Matrix4().fromArray(rig.inverseBindMatrices, j * 16)));

  // Normals go out as int8 normalized, exactly the grid they were unpacked from, so nothing is renormalized.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(rig.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(Int8Array.from(rig.normals, (n) => Math.round(n * NORMAL_QUANTUM)), 3, true));
  geometry.setAttribute('uv', new THREE.BufferAttribute(rig.uvs, 2));
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(rig.skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(rig.skinWeights, 4));
  geometry.setIndex(new THREE.BufferAttribute(rig.indices, 1));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({ name: `${source.modelName}Material`, metalness: 0, roughness: 1 }));
  mesh.name = `${source.modelName}Mesh`;
  mesh.bind(skeleton, new THREE.Matrix4());
  scene.add(mesh);

  // The animators sample frame f at time f / (frames - 1) * duration.
  const clips: THREE.AnimationClip[] = [];
  for (let c = 0; c < clipCount; c++) {
    const times = Float32Array.from({ length: framesPerClip }, (_, f) => (f / (framesPerClip - 1)) * rig.clipDurations[c]);
    const tracks: THREE.KeyframeTrack[] = [];
    for (let j = 0; j < jointCount; j++) {
      const values = new Float32Array(framesPerClip * 4);
      for (let f = 0; f < framesPerClip; f++) {
        for (let k = 0; k < 4; k++) values[f * 4 + k] = rig.clipJointRotations[((c * framesPerClip + f) * jointCount + j) * 4 + k];
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bones[j].name}.quaternion`, times, values));
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${bones[source.rootMotionJoint].name}.position`, times, rig.clipRootTranslations.slice(c * framesPerClip * 3, (c + 1) * framesPerClip * 3)));
    clips.push(new THREE.AnimationClip(clipNames[c], rig.clipDurations[c], tracks));
  }
  return { scene, clips, framesPerClip };
}
// #endregion

// ======================== PATCH THE EXPORT ======================== \\
// #region Patch Exported GLB
interface IExportedJson {
  asset: { extras?: unknown };
  meshes: Array<{ primitives: Array<{ attributes: Record<string, number> }> }>;
  accessors: Array<Record<string, unknown> & { bufferView: number; byteOffset?: number }>;
  bufferViews: Array<Record<string, unknown> & { byteOffset?: number; byteStride?: number }>;
  buffers: Array<{ byteLength: number }>;
  materials: Array<{ pbrMetallicRoughness?: Record<string, unknown> }>;
  images?: unknown[];
  textures?: unknown[];
  extensionsUsed?: string[];
  extensionsRequired?: string[];
}

/** Adds asset.extras, the JPEG texture and the quantization marker to GLTFExporter's output. */
function patchExport(exported: ArrayBuffer, source: IAnimalSource, rig: IClipRigModelData, framesPerClip: number): ArrayBuffer {
  const view = new DataView(exported);
  const jsonLength = view.getUint32(GLB_HEADER_BYTES, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(exported, GLB_HEADER_BYTES + CHUNK_HEADER_BYTES, jsonLength))) as IExportedJson;
  const binStart = GLB_HEADER_BYTES + CHUNK_HEADER_BYTES + jsonLength + CHUNK_HEADER_BYTES;
  const exportedBin = new Uint8Array(exported, binStart, view.getUint32(binStart - CHUNK_HEADER_BYTES, true));

  // GLTFExporter renormalizes int8 normals whose length drifts from 1 (a few percent of them), which would
  // change them by one step. Write the original int8 values back over the exported bytes.
  const normalAccessor = json.accessors[json.meshes[0].primitives[0].attributes.NORMAL];
  const normalView = json.bufferViews[normalAccessor.bufferView];
  const normalStride = normalView.byteStride ?? 3;
  const normalStart = (normalView.byteOffset ?? 0) + (normalAccessor.byteOffset ?? 0);
  const vertexCount = rig.normals.length / 3;
  const exportedBinView = new Int8Array(exportedBin.buffer, exportedBin.byteOffset, exportedBin.byteLength);
  for (let v = 0; v < vertexCount; v++) {
    for (let k = 0; k < 3; k++) exportedBinView[normalStart + v * normalStride + k] = Math.round(rig.normals[v * 3 + k] * NORMAL_QUANTUM);
  }

  const texture = decodeDataUri(source.textureDataUri);
  const textureOffset = (exportedBin.length + 3) & ~3;
  const bin = new Uint8Array((textureOffset + texture.data.length + 3) & ~3);
  bin.set(exportedBin);
  bin.set(texture.data, textureOffset);
  json.bufferViews.push({ buffer: 0, byteOffset: textureOffset, byteLength: texture.data.length });
  json.images = [{ bufferView: json.bufferViews.length - 1, mimeType: texture.mimeType }];
  json.textures = [{ source: 0 }];
  json.materials[0].pbrMetallicRoughness = { ...json.materials[0].pbrMetallicRoughness, baseColorTexture: { index: 0 } };
  json.buffers[0].byteLength = bin.length;

  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), QUANTIZATION_EXTENSION])];
  json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), QUANTIZATION_EXTENSION])];
  json.asset.extras = {
    format: MODEL_FORMAT,
    kind: 'clip-rig',
    jointCount: rig.parents.length,
    clipCount: rig.clipDurations.length,
    framesPerClip,
    rootMotionJoint: source.rootMotionJoint,
    clipDurations: Array.from(rig.clipDurations),
    parents: Array.from(rig.parents),
  };
  return writeGlb(json, bin);
}
// #endregion

// ======================== CONVERSION ======================== \\
// #region Convert All Animals
mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
for (const source of ANIMALS) {
  const rig = source.unpack();
  const { scene, clips, framesPerClip } = buildScene(source, rig);
  const exported = (await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips })) as ArrayBuffer;
  const glb = patchExport(exported, source, rig, framesPerClip);
  writeFileSync(new URL(`${source.fileName}.glb`, OUTPUT_DIRECTORY), new Uint8Array(glb));
  console.log(`${source.fileName}.glb ${(glb.byteLength / 1024).toFixed(0)} KB (${rig.parents.length} joints, ${clips.length} clips x ${framesPerClip} frames, root joint ${source.rootMotionJoint})`);
}
// #endregion
