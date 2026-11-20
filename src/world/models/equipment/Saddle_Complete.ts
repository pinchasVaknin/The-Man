// ============================================================================
// MODULE: World / Models / Equipment / Saddle Data
// DESIGN: Spec only; the mesh comes from the GLB (saddleAssets), skinning and caching are in saddleRuntime.ts
// SUMMARY: The Saddle model: its mount presets per creature, vertex counts and fit constants,
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
export type { SaddleMountPreset, SaddleMountTarget, SaddleOptions };

export const SADDLE_MOUNT_PRESETS: Record<SaddleMountTarget, SaddleMountPreset> = {
  horse: {
    scale: [1.20, 0.92, 0.82],
    backY: 1.326,
    backZ: -0.17,
    pitchDeg: -1.0,
    archLift: 0.068,
    rockerLift: 0.028,
    flankFlare: 0.055,
    joints: [8, 19, 22],
  },
  catlion: {
    scale: [1.34, 1.05, 0.78],
    backY: 1.028,
    backZ: -0.16,
    pitchDeg: -5.0,
    archLift: 0.065,
    rockerLift: 0.022,
    flankFlare: 0.085,
    joints: [3, 4, 5],
  },
  stag: {
    scale: [0.78, 0.70, 0.58],
    backY: 0.968,
    backZ: -0.16,
    pitchDeg: -2.5,
    archLift: 0.042,
    rockerLift: 0.020,
    flankFlare: 0.040,
    joints: [4, 5, 6],
  },
};

export const SADDLE_SPEC: ISaddleModelSpec = {
  name: 'Saddle',
  vertexCount: 1941,
  indexCount: 7290,
  mountPresets: SADDLE_MOUNT_PRESETS,
  defaultArchLift: 0.065,
  defaultRockerLift: 0.025,
  defaultFlankFlare: 0.055,
  seatReferenceY: 0.743,
  seatHalfLengthZ: 0.45,
  roughness: 0.76,
  metalness: 0.08,
  fallbackColorRgb: [122, 80, 48],
};
// #endregion

// ======================== PUBLIC SADDLE ======================== \\
// #region Ready Saddle
const accessors = createSaddleAccessors(SADDLE_SPEC, 'saddle');

/** Summary: Creates a standalone Saddle (animation lab, catalog) from the cached data. */
export const createReadySaddle = accessors.createReadySaddle;

/** Summary: Skins a Saddle onto a creature's skeleton and adds it to the creature. */
export const mountReadySaddleOnCreature = accessors.mountReadySaddleOnCreature;
// #endregion
