// ============================================================================
// MODULE: World / Models / Equipment / Saddle Runtime
// DESIGN: One shared implementation parameterized by a spec (previously two near-identical files);
//         the saddle files keep only their spec and packed data
// SUMMARY: Skins a copy of a saddle mesh onto a creature's skeleton with the creature's mount
//          preset and caches the loaded mesh and texture. Holds no model data.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import { getLoadedSaddleModel, getSaddleTextureUrl, type SaddleModelId } from './saddleAssets';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
export type SaddleMountTarget = 'horse' | 'catlion' | 'stag';

export interface SaddleMountPreset {
  scale: [number, number, number];
  backY: number;
  backZ: number;
  pitchDeg: number;
  archLift: number;
  rockerLift: number;
  flankFlare: number;
  joints: [number, number, number]; // [rearSpine, midSpine, frontWithers]
}

export interface SaddleOptions {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tintHex?: number;
  wireframe?: boolean;
}

export interface UnpackedSaddleData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

/** Summary: Everything that differs between one saddle model and another. */
export interface ISaddleModelSpec {
  /** Name of the standalone saddle object; the mounted mesh is named `Mounted<name>`. */
  readonly name: string;
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly mountPresets: Record<SaddleMountTarget, SaddleMountPreset>;
  /** Used when a preset leaves a lift or flare out. */
  readonly defaultArchLift: number;
  readonly defaultRockerLift: number;
  readonly defaultFlankFlare: number;
  /** Model-space height of the seat, subtracted before the mount transform. */
  readonly seatReferenceY: number;
  /** Half the seat length along z; positions are normalized by it for the rocker and weights. */
  readonly seatHalfLengthZ: number;
  readonly roughness: number;
  readonly metalness: number;
  /** Texture color when no image can be decoded (node tests). */
  readonly fallbackColorRgb: readonly [number, number, number];
}
// #endregion

// ======================== SKINNED MESH ======================== \\
// #region Skinned Saddle Mesh
/**
 * Summary: Builds a skinned copy of the saddle fitted to a creature's back.
 * Design: Each vertex is scaled, arched, rocked and pitched by the mount preset, then weighted
 *         between the rear, mid and withers joints by its position along the seat.
 * @param data Decoded saddle.
 * @param texture Saddle texture.
 * @param skeleton The creature's skeleton to bind to.
 * @param target A creature name or an explicit preset.
 * @param spec The saddle model's spec.
 * @param options Tint, shadows, wireframe.
 */
export function createSkinnedSaddleMesh(
  data: UnpackedSaddleData,
  texture: THREE.Texture,
  skeleton: THREE.Skeleton,
  target: SaddleMountTarget | SaddleMountPreset,
  spec: ISaddleModelSpec,
  options: SaddleOptions = {},
): THREE.SkinnedMesh {
  const preset = typeof target === 'string' ? spec.mountPresets[target] : target;
  const [sx, sy, sz] = preset.scale;
  const pitchRad = THREE.MathUtils.degToRad(preset.pitchDeg);
  const cosP = Math.cos(pitchRad);
  const sinP = Math.sin(pitchRad);
  const [jRear, jMid, jFront] = preset.joints;
  const archLift = preset.archLift ?? spec.defaultArchLift;
  const rockerLift = preset.rockerLift ?? spec.defaultRockerLift;
  const flankFlare = preset.flankFlare ?? spec.defaultFlankFlare;
  const { vertexCount, seatReferenceY, seatHalfLengthZ } = spec;

  const pos = new Float32Array(vertexCount * 3);
  const skinIndices = new Uint8Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);

  for (let i = 0; i < vertexCount; i++) {
    const i3 = i * 3;
    const i4 = i * 4;
    const x = data.positions[i3];
    const y = data.positions[i3 + 1];
    const z = data.positions[i3 + 2];

    const yRel = y - seatReferenceY;
    const ux = Math.min(1.35, Math.abs(x) / 0.22);
    const uz = Math.min(1.25, Math.abs(z) / seatHalfLengthZ);
    const wUpper = Math.max(0.0, Math.min(1.0, (yRel + 0.35) / 0.35));
    const wFlank = Math.max(0.0, Math.min(1.0, (0.15 - yRel) / 0.35)) * Math.max(0.0, Math.min(1.0, (yRel + 0.78) / 0.20));
    const xSgn = x >= 0 ? 1.0 : -1.0;

    const x1 = x * sx + xSgn * flankFlare * Math.pow(ux, 1.1) * wFlank;
    const y1 = yRel * sy + archLift * Math.pow(ux, 1.5) * wUpper + rockerLift * (uz * uz) * wUpper;
    const z1 = z * sz;
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;

    pos[i3] = x1;
    pos[i3 + 1] = preset.backY + y2;
    pos[i3 + 2] = preset.backZ + z2;

    const u = Math.max(-1.0, Math.min(1.0, z / seatHalfLengthZ));
    let wRear = 0.0;
    let wFront = 0.0;
    if (u < 0) {
      wRear = Math.min(0.65, -u * 0.65);
    } else {
      wFront = Math.min(0.65, u * 0.65);
    }
    const wMid = 1.0 - wRear - wFront;

    skinIndices[i4] = jMid;
    skinIndices[i4 + 1] = jFront;
    skinIndices[i4 + 2] = jRear;
    skinIndices[i4 + 3] = 0;

    skinWeights[i4] = wMid;
    skinWeights[i4 + 1] = wFront;
    skinWeights[i4 + 2] = wRear;
    skinWeights[i4 + 3] = 0.0;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(data.normals.slice(), 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
  geom.setAttribute('skinIndex', new THREE.Uint8BufferAttribute(skinIndices, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geom.setIndex(new THREE.BufferAttribute(data.indices, 1));

  texture.flipY = false;
  texture.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    color: options.tintHex ?? 0xffffff,
    roughness: spec.roughness,
    metalness: spec.metalness,
    side: THREE.DoubleSide,
    wireframe: options.wireframe ?? false,
  });

  const mesh = new THREE.SkinnedMesh(geom, mat);
  mesh.name = `Mounted${spec.name}`;
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  mesh.frustumCulled = false;
  mesh.bind(skeleton, new THREE.Matrix4());
  return mesh;
}
// #endregion

// ======================== STANDALONE SADDLE ======================== \\
// #region Standalone Saddle
/** Summary: A saddle shown on its own (animation lab, catalog), not skinned to a creature. */
export class Saddle {
  public readonly object: THREE.Group;
  public readonly mesh: THREE.Mesh;

  constructor(
    public readonly data: UnpackedSaddleData,
    public readonly texture: THREE.Texture,
    private readonly spec: ISaddleModelSpec,
    options: SaddleOptions = {},
  ) {
    this.object = new THREE.Group();
    this.object.name = spec.name;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geom.setIndex(new THREE.BufferAttribute(data.indices, 1));

    texture.flipY = false;
    texture.needsUpdate = true;

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      color: options.tintHex ?? 0xffffff,
      roughness: spec.roughness,
      metalness: spec.metalness,
      side: THREE.DoubleSide,
      wireframe: options.wireframe ?? false,
    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.castShadow = options.castShadow ?? true;
    this.mesh.receiveShadow = options.receiveShadow ?? true;
    this.object.add(this.mesh);
    this.object.scale.setScalar(options.scale ?? 1.0);
  }

  public mountOnCreature(
    creature: { object: THREE.Group; rig: { skeleton: THREE.Skeleton } },
    target: SaddleMountTarget | SaddleMountPreset,
    options: SaddleOptions = {},
  ): THREE.SkinnedMesh {
    const skinnedSaddle = createSkinnedSaddleMesh(this.data, this.texture, creature.rig.skeleton, target, this.spec, options);
    creature.object.add(skinnedSaddle);
    return skinnedSaddle;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
// #endregion

// ======================== ASSET CACHE ======================== \\
// #region Saddle Asset Cache
/**
 * Summary: Creates the lazy, cached accessors one saddle model needs.
 * Design: Reads the loaded GLB data on first use (the model must be loaded first) and builds the
 *         texture once. Without an `Image` (node tests) the texture is a single fallback-colored pixel.
 * @param spec The saddle model's spec.
 * @param modelId Which saddle GLB this model reads (see saddleAssets).
 */
export function createSaddleAccessors(spec: ISaddleModelSpec, modelId: SaddleModelId): {
  createReadySaddle: (options?: SaddleOptions) => Saddle;
  mountReadySaddleOnCreature: (
    creature: { object: THREE.Group; rig: { skeleton: THREE.Skeleton } },
    target: SaddleMountTarget | SaddleMountPreset,
    options?: SaddleOptions,
  ) => THREE.SkinnedMesh;
} {
  let cachedData: UnpackedSaddleData | null = null;
  let cachedTexture: THREE.Texture | null = null;

  const getAssets = (): { data: UnpackedSaddleData; texture: THREE.Texture } => {
    cachedData ??= getLoadedSaddleModel(modelId).mesh;
    if (!cachedTexture) {
      if (typeof Image !== 'undefined') {
        const img = new Image();
        img.src = getSaddleTextureUrl(modelId);
        const tex = new THREE.Texture(img);
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        img.onload = () => {
          tex.needsUpdate = true;
        };
        cachedTexture = tex;
      } else {
        const [r, g, b] = spec.fallbackColorRgb;
        const tex = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
        tex.flipY = false;
        tex.needsUpdate = true;
        cachedTexture = tex;
      }
    }
    return { data: cachedData, texture: cachedTexture };
  };

  return {
    createReadySaddle: (options = {}) => {
      const { data, texture } = getAssets();
      return new Saddle(data, texture, spec, options);
    },
    mountReadySaddleOnCreature: (creature, target, options = {}) => {
      const { data, texture } = getAssets();
      const skinnedSaddle = createSkinnedSaddleMesh(data, texture, creature.rig.skeleton, target, spec, options);
      creature.object.add(skinnedSaddle);
      return skinnedSaddle;
    },
  };
}
// #endregion
