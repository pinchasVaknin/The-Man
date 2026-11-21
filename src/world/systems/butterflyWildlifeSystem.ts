// ============================================================================
// MODULE: World / Systems / Butterfly Wildlife
// DESIGN: Pure, deterministic simulation of the meadow butterflies (no THREE). Each butterfly keeps a home,
//         flutters on a lissajous path around it, rests at night, and can be killed by a sword or arrow
//         (it stays gone until the next morning). Butterflies are indifferent to people (FLYER_PROFILES):
//         walking or running next to one changes nothing; only a direct hit does.
// SUMMARY: createInitialButterflies(), stepButterflies(), hitButterflyNear(), plus a registry for combat.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \
// #region Imports & Dependencies
import { hash2D } from '../domain/noiseAndMath';
import { groundHeightAt } from './terrainAndBiomeSystem';
import { WATER_LEVEL } from '../domain/landmarksRegistry';
// #endregion

// ======================== CONTRACTS ======================== \
// #region Contracts
/** Summary: One meadow butterfly. */
export interface IButterflyState {
  readonly id: number;
  readonly colorIndex: number;
  readonly homeX: number;
  readonly homeZ: number;
  readonly phase: number;
  readonly speed: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** True while resting at night or after being hit; the butterfly is not drawn. */
  hidden: boolean;
  isDead: boolean;
}

export const BUTTERFLY_COUNT = 18;
const MEADOW_CENTER_Z = 18;
const NIGHT_REST_DAYLIGHT = 0.35;
const RESPAWN_DAYLIGHT = 0.6;
// #endregion

// ======================== REGISTRY ======================== \
// #region Registry
let activeButterflies: IButterflyState[] = [];

/** Summary: The live butterflies, for combat hit checks. */
export function getActiveWorldButterflies(): IButterflyState[] {
  return activeButterflies;
}
// #endregion

// ======================== SIMULATION ======================== \
// #region Simulation
/** Summary: Creates the deterministic meadow population around the spawn meadow. */
export function createInitialButterflies(): IButterflyState[] {
  const list: IButterflyState[] = [];
  for (let i = 0; i < BUTTERFLY_COUNT; i++) {
    const homeX = (hash2D(i, 41) - 0.5) * 36;
    const homeZ = (hash2D(i, 47) - 0.5) * 36 + MEADOW_CENTER_Z;
    list.push({
      id: i,
      colorIndex: i % 3,
      homeX,
      homeZ,
      phase: i * 0.85,
      speed: 0.65 + hash2D(i, 53) * 0.5,
      x: homeX,
      y: Math.max(WATER_LEVEL + 0.3, groundHeightAt(homeX, homeZ)) + 1.2,
      z: homeZ,
      yaw: 0,
      hidden: false,
      isDead: false,
    });
  }
  activeButterflies = list;
  return list;
}

/**
 * Summary: Advances every butterfly by one frame.
 * @param daylightFactor 0 at night, 1 at noon: butterflies rest below NIGHT_REST_DAYLIGHT and revive above RESPAWN_DAYLIGHT.
 */
export function stepButterflies(butterflies: IButterflyState[], elapsedTime: number, daylightFactor: number): void {
  const resting = daylightFactor < NIGHT_REST_DAYLIGHT;
  for (const b of butterflies) {
    if (b.isDead && daylightFactor >= RESPAWN_DAYLIGHT) b.isDead = false;
    b.hidden = b.isDead || resting;
    if (b.hidden) continue;
    const t = elapsedTime * b.speed + b.phase;
    b.x = b.homeX + Math.sin(t) * 4.5;
    b.z = b.homeZ + Math.cos(t * 0.8) * 4.5;
    b.y = Math.max(WATER_LEVEL + 0.3, groundHeightAt(b.x, b.z)) + 1.2 + Math.sin(t * 2.5) * 0.65;
    b.yaw = Math.atan2(Math.cos(t), -Math.sin(t * 0.8) * 0.8);
  }
}

/**
 * Summary: Kills the first living butterfly within reach of a strike point.
 * @returns True when a butterfly was hit.
 */
export function hitButterflyNear(x: number, y: number, z: number, horizontalReach: number, verticalReach: number): boolean {
  for (const b of activeButterflies) {
    if (b.isDead || b.hidden) continue;
    if (Math.hypot(x - b.x, z - b.z) <= horizontalReach && Math.abs(y - b.y) <= verticalReach) {
      b.isDead = true;
      b.hidden = true;
      return true;
    }
  }
  return false;
}
// #endregion
