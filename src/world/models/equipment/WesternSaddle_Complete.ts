// ============================================================================
// MODULE: World / Models / Equipment / WesternSaddle Data
// DESIGN: Spec only; the mesh comes from the GLB (saddleAssets), skinning and caching are in saddleRuntime.ts
// SUMMARY: The WesternSaddle model: its mount presets per creature, vertex counts and fit constants,
//          and the factories that mount it. Holds no mesh data; does not deform anything itself.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import {
  createSaddleAccessors,
  type ISaddleModelSpec,
  type SaddleMountPreset,
  type SaddleMountTarget,
  type SaddleOptions,
} from './saddleRuntime';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
export type WesternSaddleMountTarget = SaddleMountTarget;
export type WesternSaddleMountPreset = SaddleMountPreset;
export type WesternSaddleOptions = SaddleOptions;

export const WESTERN_SADDLE_MOUNT_PRESETS: Record<SaddleMountTarget, SaddleMountPreset> = {
  horse: {
    scale: [1.28, 0.94, 1.02],
    backY: 1.334,
    backZ: -0.17,
    pitchDeg: -1.5,
    archLift: 0.118,
    rockerLift: 0.032,
    flankFlare: 0.065,
    joints: [8, 19, 22],
  },
  catlion: {
    scale: [1.42, 0.94, 0.96],
    backY: 1.034,
    backZ: -0.16,
    pitchDeg: -5.0,
    archLift: 0.115,
    rockerLift: 0.026,
    flankFlare: 0.095,
    joints: [3, 4, 5],
  },
  stag: {
    scale: [0.86, 0.68, 0.72],
    backY: 0.974,
    backZ: -0.16,
    pitchDeg: -2.5,
    archLift: 0.078,
    rockerLift: 0.022,
    flankFlare: 0.045,
    joints: [4, 5, 6],
  },
};

export const WESTERN_SADDLE_SPEC: ISaddleModelSpec = {
  name: 'WesternSaddle',
  vertexCount: 6724,
  indexCount: 24876,
  mountPresets: WESTERN_SADDLE_MOUNT_PRESETS,
  defaultArchLift: 0.115,
  defaultRockerLift: 0.030,
  defaultFlankFlare: 0.065,
  seatReferenceY: 0.798,
  seatHalfLengthZ: 0.34,
  roughness: 0.72,
  metalness: 0.12,
  fallbackColorRgb: [140, 92, 52],
};
// #endregion

// ======================== PUBLIC WESTERNSADDLE ======================== \\
// #region Ready WesternSaddle
const accessors = createSaddleAccessors(WESTERN_SADDLE_SPEC, 'western-saddle');

/** Summary: Creates a standalone WesternSaddle (animation lab, catalog) from the cached data. */
export const createReadyWesternSaddle = accessors.createReadySaddle;

/** Summary: Skins a WesternSaddle onto a creature's skeleton and adds it to the creature. */
export const mountReadyWesternSaddleOnCreature = accessors.mountReadySaddleOnCreature;
// #endregion
