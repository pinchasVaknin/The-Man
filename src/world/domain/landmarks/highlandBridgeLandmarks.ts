// ============================================================================
// MODULE: World / Domain / Landmarks / Highland Bridge
// DESIGN: Highland watchtowers, suspension rope bridge geometry, and catenary curve math (SRP)
// SUMMARY: Exposes Hill Watchtower definitions, rope bridge spatial endpoints, sag curves,
//          and raycasting projection math for player footing on the bridge deck.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IHillWatchtowerDef } from '../worldTypes';
import { t } from '../../../locales';
// #endregion

// ======================== HIGHLAND BRIDGE CONSTANTS ======================== \\
// #region Highland Bridge Constants
/** Summary: Facing yaw angle of the high alpine suspension rope bridge spanning the gorge. */
export const HILL_BRIDGE_YAW = Math.atan2(-165.0 - -65.0, -335.0 - -172.0);

/** Summary: Precomputed cosine of the bridge orientation angle. */
export const HILL_BRIDGE_COS = Math.cos(HILL_BRIDGE_YAW);

/** Summary: Precomputed sine of the bridge orientation angle. */
export const HILL_BRIDGE_SIN = Math.sin(HILL_BRIDGE_YAW);
// #endregion

// ======================== WATCHTOWER FACTORY & DEFINITIONS ======================== \\
// #region Watchtower Factory & Definitions
/**
 * Summary: Helper factory constructing an immutable IHillWatchtowerDef with local-to-world transform.
 * Design: Precalculates ladder, standing deck, and entrance door coordinates in world space.
 */
function makeHillWatchtowerDef(
  id: string,
  doorId: string,
  name: string,
  x: number,
  z: number,
  baseY: number,
  deckY: number,
  yaw: number,
  doorSideLocalZ: 1 | -1,
  bridgeSideLocalZ: 1 | -1 | 0,
  localLadderX: number,
  localLadderZ: number,
  connectedToBridge: boolean
): IHillWatchtowerDef {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const ladderX = x + localLadderX * c + localLadderZ * s;
  const ladderZ = z - localLadderX * s + localLadderZ * c;
  const localStandX = localLadderX - Math.sign(localLadderX) * 0.52;
  const localStandZ = localLadderZ - Math.sign(localLadderZ) * 0.52;
  const standX = x + localStandX * c + localStandZ * s;
  const standZ = z - localStandX * s + localStandZ * c;

  const localDoorZ = doorSideLocalZ * 3.45;
  const doorX = x + localDoorZ * s;
  const doorZ = z + localDoorZ * c;
  const j1x = doorX - 1.15 * c;
  const j1z = doorZ + 1.15 * s;
  const j2x = doorX + 1.15 * c;
  const j2z = doorZ - 1.15 * s;
  const doorMinX = Math.min(j1x, j2x) - 0.45;
  const doorMaxX = Math.max(j1x, j2x) + 0.45;
  const doorMinZ = Math.min(j1z, j2z) - 0.45;
  const doorMaxZ = Math.max(j1z, j2z) + 0.45;

  return {
    id,
    doorId,
    name,
    x,
    z,
    baseY,
    deckY,
    halfSize: 3.6,
    yaw,
    doorSideLocalZ,
    bridgeSideLocalZ,
    localLadderX,
    localLadderZ,
    ladderX,
    ladderZ,
    standX,
    standZ,
    doorX,
    doorZ,
    doorMinX,
    doorMaxX,
    doorMinZ,
    doorMaxZ,
    isWest: localLadderX < 0,
    isSouth: localLadderZ > 0,
    connectedToBridge,
  };
}

/** Summary: Alpine hill watchtowers guarding mountain passes and anchoring the suspension bridge. */
export const HILL_WATCHTOWERS: readonly IHillWatchtowerDef[] = [
  makeHillWatchtowerDef(
    'hill-watchtower-sw',
    'hill-watchtower-sw-door',
    t('landmarks.hill_watchtower_sw'),
    -65.0,
    -172.0,
    56.5,
    65.5,
    HILL_BRIDGE_YAW,
    1,
    1,
    2.25,
    2.25,
    true
  ),
  makeHillWatchtowerDef(
    'hill-watchtower-west',
    'hill-watchtower-west-door',
    t('landmarks.hill_watchtower_west'),
    -165.0,
    -335.0,
    67.5,
    76.5,
    HILL_BRIDGE_YAW,
    -1,
    -1,
    2.25,
    2.25,
    true
  ),
  makeHillWatchtowerDef(
    'hill-watchtower-east',
    'hill-watchtower-east-door',
    t('landmarks.hill_watchtower_east'),
    160.0,
    -335.0,
    64.0,
    73.0,
    -Math.PI / 2,
    1,
    0,
    2.25,
    2.25,
    false
  ),
] as const;
// #endregion

// ======================== ROPE SUSPENSION BRIDGE ======================== \\
// #region Rope Suspension Bridge
/** Summary: Spatial geometric definition of the suspension bridge across the chasm. */
export const ROPE_BRIDGE_DEF = {
  ax: -65.0,
  az: -172.0,
  ay: 65.5,
  mx: -115.0,
  mz: -253.5,
  my: 71.0,
  bx: -165.0,
  bz: -335.0,
  by: 76.5,
  halfWidth: 1.35,
  sag: 0.55,
  deckEdgeT: 3.55 / Math.hypot(-165.0 - -65.0, -335.0 - -172.0),
} as const;

/**
 * Summary: Calculates bridge deck elevation and perpendicular distance for a world coordinate.
 * Design: Projects (x, z) onto the 3D bridge line segment and applies quadratic sag parabola.
 * @param x World X coordinate.
 * @param z World Z coordinate.
 * @returns Object with deck height, lateral distance, and parametric t position, or null if off bridge.
 */
export function ropeBridgePointInfoAt(
  x: number,
  z: number
): { height: number; perpDist: number; tTotal: number } | null {
  const vx = ROPE_BRIDGE_DEF.bx - ROPE_BRIDGE_DEF.ax;
  const vz = ROPE_BRIDGE_DEF.bz - ROPE_BRIDGE_DEF.az;
  const lenSq = vx * vx + vz * vz;
  const t = ((x - ROPE_BRIDGE_DEF.ax) * vx + (z - ROPE_BRIDGE_DEF.az) * vz) / lenSq;
  const tStart = ROPE_BRIDGE_DEF.deckEdgeT;
  const tEnd = 1.0 - tStart;
  if (t < tStart - 0.003 || t > tEnd + 0.003) return null;
  const projX = ROPE_BRIDGE_DEF.ax + t * vx;
  const projZ = ROPE_BRIDGE_DEF.az + t * vz;
  const perpDist = Math.hypot(x - projX, z - projZ);
  if (perpDist > ROPE_BRIDGE_DEF.halfWidth) return null;

  let height: number;
  if (t <= 0.5) {
    const u = Math.max(0, Math.min(1, (t - tStart) / (0.5 - tStart)));
    const linearY = ROPE_BRIDGE_DEF.ay + u * (ROPE_BRIDGE_DEF.my - ROPE_BRIDGE_DEF.ay);
    height = linearY - 4 * ROPE_BRIDGE_DEF.sag * u * (1 - u);
  } else {
    const u = Math.max(0, Math.min(1, (t - 0.5) / (tEnd - 0.5)));
    const linearY = ROPE_BRIDGE_DEF.my + u * (ROPE_BRIDGE_DEF.by - ROPE_BRIDGE_DEF.my);
    height = linearY - 4 * ROPE_BRIDGE_DEF.sag * u * (1 - u);
  }
  return { height, perpDist, tTotal: t };
}
// #endregion
