// ============================================================================
// MODULE: Tooling / Character GLB Converter
// DESIGN: One-off exporter. Builds a SkinnedMesh with J0..Jn bones from each character's unpacked base64
//         data, exports it with THREE.GLTFExporter together with the character's own AnimationClips, then
//         patches the GLB: asset.extras, the WebP texture (EXT_texture_webp), the quantization marker for
//         the int8 normals, and the original normal bytes (the exporter renormalizes some of them).
// SUMMARY: Writes public/models/characters/<name>.glb for the dwarf and the monk. Run with:
//          npx tsx scripts/convertCharactersToGlb.ts
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { decodeDataUri, writeGlb } from '../src/world/models/glbContainer';
import { DWARF_TEX_B64, unpackDwarfWarriorAssetsSync, type DwarfWarriorAssets } from '../src/world/models/Characters/DwarfWarrior_Complete';
import { MONK_TEX_B64, unpackWarriorMonkAssetsSync, type WarriorMonkAssets } from '../src/world/models/Characters/WarriorMonk_Complete';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
type CharacterAssets = DwarfWarriorAssets | WarriorMonkAssets;

interface ICharacterSource {
  readonly fileName: string;
  readonly modelName: string;
  readonly assets: () => CharacterAssets;
  readonly textureDataUri: string;
}

const MODEL_FORMAT = 'theman-character-model@1';
const QUANTIZATION_EXTENSION = 'KHR_mesh_quantization';
const WEBP_EXTENSION = 'EXT_texture_webp';
const NORMAL_QUANTUM = 127;
const GLB_HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;

const CHARACTERS: readonly ICharacterSource[] = [
  { fileName: 'dwarf-warrior', modelName: 'DwarfWarrior', assets: () => unpackDwarfWarriorAssetsSync(), textureDataUri: DWARF_TEX_B64 },
  { fileName: 'warrior-monk', modelName: 'WarriorMonk', assets: () => unpackWarriorMonkAssetsSync(), textureDataUri: MONK_TEX_B64 },
];

const OUTPUT_DIRECTORY = new URL('../public/models/characters/', import.meta.url);
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
// #region Build Skinned Mesh
function buildScene(source: ICharacterSource, assets: CharacterAssets): THREE.Group {
  const jointCount = assets.parents.length;
  const bones: THREE.Bone[] = [];
  for (let j = 0; j < jointCount; j++) {
    const bone = new THREE.Bone();
    bone.name = `J${j}`;
    bone.position.fromArray(assets.restTranslations, j * 3);
    bone.quaternion.fromArray(assets.restRotations, j * 4);
    bones.push(bone);
  }
  for (let j = 0; j < jointCount; j++) {
    if (assets.parents[j] >= 0) bones[assets.parents[j]].add(bones[j]);
  }
  const scene = new THREE.Group();
  scene.name = source.modelName;
  scene.add(bones[0]);
  const skeleton = new THREE.Skeleton(bones, Array.from({ length: jointCount }, (_, j) => new THREE.Matrix4().fromArray(assets.inverseBindMatrices, j * 16)));

  const original = assets.geometry;
  const normals = original.getAttribute('normal').array as Float32Array;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(original.getAttribute('position').array as Float32Array, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(Int8Array.from(normals, (n) => Math.round(n * NORMAL_QUANTUM)), 3, true));
  geometry.setAttribute('uv', new THREE.BufferAttribute(original.getAttribute('uv').array as Float32Array, 2));
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(original.getAttribute('skinIndex').array as Uint8Array, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(original.getAttribute('skinWeight').array as Uint8Array, 4, true));
  geometry.setIndex(new THREE.BufferAttribute(original.index!.array as Uint16Array, 1));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({ name: `${source.modelName}Material`, metalness: 0, roughness: 1 }));
  mesh.name = `${source.modelName}Mesh`;
  mesh.bind(skeleton, new THREE.Matrix4());
  scene.add(mesh);
  return scene;
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

function patchExport(exported: ArrayBuffer, source: ICharacterSource, assets: CharacterAssets, clipCount: number): ArrayBuffer {
  const view = new DataView(exported);
  const jsonLength = view.getUint32(GLB_HEADER_BYTES, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(exported, GLB_HEADER_BYTES + CHUNK_HEADER_BYTES, jsonLength))) as IExportedJson;
  const binStart = GLB_HEADER_BYTES + CHUNK_HEADER_BYTES + jsonLength + CHUNK_HEADER_BYTES;
  const exportedBin = new Uint8Array(exported, binStart, view.getUint32(binStart - CHUNK_HEADER_BYTES, true));

  // Write the original int8 normals back over the exported bytes.
  const normals = assets.geometry.getAttribute('normal').array as Float32Array;
  const normalAccessor = json.accessors[json.meshes[0].primitives[0].attributes.NORMAL];
  const normalView = json.bufferViews[normalAccessor.bufferView];
  const normalStride = normalView.byteStride ?? 3;
  const normalStart = (normalView.byteOffset ?? 0) + (normalAccessor.byteOffset ?? 0);
  const exportedBinView = new Int8Array(exportedBin.buffer, exportedBin.byteOffset, exportedBin.byteLength);
  for (let v = 0; v < normals.length / 3; v++) {
    for (let k = 0; k < 3; k++) exportedBinView[normalStart + v * normalStride + k] = Math.round(normals[v * 3 + k] * NORMAL_QUANTUM);
  }

  const texture = decodeDataUri(source.textureDataUri);
  const textureOffset = (exportedBin.length + 3) & ~3;
  const bin = new Uint8Array((textureOffset + texture.data.length + 3) & ~3);
  bin.set(exportedBin);
  bin.set(texture.data, textureOffset);
  json.bufferViews.push({ buffer: 0, byteOffset: textureOffset, byteLength: texture.data.length });
  json.images = [{ bufferView: json.bufferViews.length - 1, mimeType: texture.mimeType }];
  json.textures = [{ extensions: { [WEBP_EXTENSION]: { source: 0 } } }];
  json.materials[0].pbrMetallicRoughness = { ...json.materials[0].pbrMetallicRoughness, baseColorTexture: { index: 0 } };
  json.buffers[0].byteLength = bin.length;

  const extensions = [QUANTIZATION_EXTENSION, WEBP_EXTENSION];
  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), ...extensions])];
  json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), ...extensions])];
  json.asset.extras = {
    format: MODEL_FORMAT,
    kind: 'character',
    jointCount: assets.parents.length,
    clipCount,
    parents: Array.from(assets.parents),
  };
  return writeGlb(json, bin);
}
// #endregion

// ======================== CONVERSION ======================== \\
// #region Convert Both Characters
mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
for (const source of CHARACTERS) {
  const assets = source.assets();
  const clips = Object.values(assets.clips) as THREE.AnimationClip[];
  const exported = (await new GLTFExporter().parseAsync(buildScene(source, assets), { binary: true, animations: clips })) as ArrayBuffer;
  const glb = patchExport(exported, source, assets, clips.length);
  writeFileSync(new URL(`${source.fileName}.glb`, OUTPUT_DIRECTORY), new Uint8Array(glb));
  console.log(`${source.fileName}.glb ${(glb.byteLength / 1024).toFixed(0)} KB (${assets.parents.length} joints, ${clips.length} clips)`);
}
// #endregion
