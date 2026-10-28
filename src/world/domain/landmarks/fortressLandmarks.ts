// ============================================================================
// MODULE: World / Domain / Landmarks / Chinese Fortress
// DESIGN: Mountain summit Chinese Imperial Fortress and ramparts (SRP)
// SUMMARY: Exposes coordinates, elevation offsets, corner watchtowers, and archery
//          targets for the northern mountain Chinese fortress.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ArcheryTargetDef, CornerWatchtowerDef } from '../worldTypes';
// #endregion

// ======================== GLOBAL FORTRESS OFFSETS ======================== \\
// #region Global Fortress Offsets
/** Summary: Global Z axis translation offset for the northern mountain fortress. */
export const FORTRESS_Z_OFFSET = -170;

/** Summary: Global Y axis elevation offset for the fortress mountain platform. */
export const FORTRESS_Y_OFFSET = 16.0;

const FZ = FORTRESS_Z_OFFSET;
const FY = FORTRESS_Y_OFFSET;
// #endregion

// ======================== FORTRESS SPATIAL STRUCTURES ======================== \\
// #region Fortress Spatial Structures
/** Summary: Spatial parameters for stairs, gateways, halls, pavilions, and courtyards. */
export const CHINESE_FORTRESS_POS = {
  x: 0,
  z: -171 + FZ,
  stairFootZ: -78 + FZ,
  stairMidZ: -104 + FZ,
  stairBaseHeight: 9.0 + FY,
  midLandingMinZ: -114 + FZ,
  midLandingMaxZ: -104 + FZ,
  midLandingHalfWidth: 14.5,
  midLandingHeight: 22.0 + FY,
  lowerGateZ: -104.8 + FZ,
  upperStairFootZ: -114 + FZ,
  upperStairTopZ: -122 + FZ,
  stairTopZ: -122 + FZ,
  upperGateZ: -122.4 + FZ,
  summitHeight: 26.0 + FY,
  rampartHeight: 31.2 + FY,
  rampartStairFootZ: -142.0 + FZ,
  rampartStairTopZ: -152.0 + FZ,
  rampartLandingMinZ: -156.6 + FZ,
  mainHallFloor1Y: 26.35 + FY,
  mainHallFloor2Y: 32.2 + FY,
  pavilionFloor1Y: 26.3 + FY,
  pavilionFloor2Y: 31.4 + FY,
  watchtowerFloor1Y: 26.25 + FY,
  watchtowerFloor2Y: 31.2 + FY,
  watchtowerFloor3Y: 36.0 + FY,
  stairHalfWidth: 3.85,
  plazaHalfWidth: 52.0,
  plazaMinZ: -220.0 + FZ,
  plazaMaxZ: -122.0 + FZ,
} as const;

/** Summary: 4 Corner watchtowers defending the perimeter ramparts of the mountain fortress. */
export const CORNER_WATCHTOWERS: readonly CornerWatchtowerDef[] = [
  {
    id: 'sw-watchtower',
    doorId: 'sw-watchtower-door',
    nameHe: 'מגדל הפינה הדרום־מערבי',
    cx: -45.5,
    cz: -128.5 + FZ,
    doorX: -45.5,
    doorZ: -134.0 + FZ,
    ladderX: -41.2,
    ladderZ: -132.8 + FZ,
    isWest: true,
    isSouth: true,
  },
  {
    id: 'se-watchtower',
    doorId: 'se-watchtower-door',
    nameHe: 'מגדל הפינה הדרום־מזרחי',
    cx: 45.5,
    cz: -128.5 + FZ,
    doorX: 45.5,
    doorZ: -134.0 + FZ,
    ladderX: 41.2,
    ladderZ: -132.8 + FZ,
    isWest: false,
    isSouth: true,
  },
  {
    id: 'nw-watchtower',
    doorId: 'nw-watchtower-door',
    nameHe: 'מגדל הפינה הצפון־מערבי',
    cx: -45.5,
    cz: -213.5 + FZ,
    doorX: -45.5,
    doorZ: -208.0 + FZ,
    ladderX: -41.2,
    ladderZ: -209.2 + FZ,
    isWest: true,
    isSouth: false,
  },
  {
    id: 'ne-watchtower',
    doorId: 'ne-watchtower-door',
    nameHe: 'מגדל הפינה הצפון־מזרחי',
    cx: 45.5,
    cz: -213.5 + FZ,
    doorX: 45.5,
    doorZ: -208.0 + FZ,
    ladderX: 41.2,
    ladderZ: -209.2 + FZ,
    isWest: false,
    isSouth: false,
  },
] as const;

/** Summary: Archery training targets positioned in the fortress courtyard for practice. */
export const ARCHERY_TARGETS: readonly ArcheryTargetDef[] = [
  {
    id: 'target-fortress-hall-nw-outer',
    nameHe: 'מטרת ההיכל הקיסרי — מערב חיצוני',
    x: -18.0,
    z: -182.0 + FZ,
    yaw: 0.0,
    bullseyeRadius: 0.95,
  },
  {
    id: 'target-fortress-hall-nw-inner',
    nameHe: 'מטרת ההיכל הקיסרי — מערב פנימי',
    x: -12.5,
    z: -182.0 + FZ,
    yaw: 0.0,
    bullseyeRadius: 0.95,
  },
  {
    id: 'target-fortress-hall-ne-inner',
    nameHe: 'מטרת ההיכל הקיסרי — מזרח פנימי',
    x: 12.5,
    z: -182.0 + FZ,
    yaw: 0.0,
    bullseyeRadius: 0.95,
  },
  {
    id: 'target-fortress-hall-ne-outer',
    nameHe: 'מטרת ההיכל הקיסרי — מזרח חיצוני',
    x: 18.0,
    z: -182.0 + FZ,
    yaw: 0.0,
    bullseyeRadius: 0.95,
  },
] as const;
// #endregion
