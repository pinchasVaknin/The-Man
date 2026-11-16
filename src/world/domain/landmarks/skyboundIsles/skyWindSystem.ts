// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Every current is a capsule around a polyline plus a mode. Wind never sets the
//         player's own velocity: it returns a carrier velocity (added to position, like a
//         moving platform) and an optional vertical target, so the player keeps their normal
//         air control inside the current. Streams also pull gently toward their axis, which
//         keeps a player in the tube unless they deliberately steer out.
// SUMMARY: The wind currents of the archipelago and the per-position wind query the physics
//          step applies. Holds no THREE objects; the renderer reads `SKY_WIND_CURRENTS`.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { RUINS_UPDRAFT_BASE, RUINS_UPDRAFT_TOP, STORM_VORTEX_ANCHOR } from './skyCloudRoutes';
import { GARDEN_WIND_FLOWER_SPOT } from './floatingGardenLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/**
 * Summary: How a current moves the player.
 * - `updraft`: vertical column that lifts, then pushes toward an exit point near the top.
 * - `stream`: tube along a path that carries the player end to end (horizontal or rising).
 * - `vortex`: vertical column that lifts while swirling around its axis.
 * - `downdraft`: slanted tube that caps the fall speed and drifts the player along it.
 */
export type SkyWindMode = 'updraft' | 'stream' | 'vortex' | 'downdraft';

/** Summary: A point of a current's path, in world metres. */
export interface IWindPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Summary: Static definition of one wind current. Speeds are in m/s. */
export interface ISkyWindCurrent {
  readonly id: string;
  readonly mode: SkyWindMode;
  /** Path from entry to exit; columns use two points, bottom then top. */
  readonly path: readonly IWindPoint[];
  readonly radius: number;
  /** Carry speed along a stream, lift speed of a column, drift speed of a downdraft. */
  readonly speed: number;
  /** Columns: where the player is pushed when reaching the top. */
  readonly exit?: IWindPoint;
  readonly exitSpeed?: number;
  /** Vortex: tangential swirl speed around the axis. */
  readonly swirlSpeed?: number;
  /** Downdraft: slowest allowed fall speed (a positive number). */
  readonly maxFallSpeed?: number;
  /** Number of Wind Cores needed before the current runs; undefined = always on. */
  readonly unlockedByCores?: number;
  /** When set, the current only runs while this wind flower is open. */
  readonly flowerId?: string;
}

/** Summary: A garden flower that opens when the player comes close and releases an updraft. */
export interface ISkyWindFlower {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly deckY: number;
  /** Horizontal distance (m) at which the flower opens. */
  readonly triggerRadius: number;
  /** Seconds the flower stays open after the player leaves. */
  readonly holdOpenSec: number;
}

/** Summary: What the wind does to the player at one position this frame. */
export interface IWindSample {
  readonly currentId: string;
  readonly mode: SkyWindMode;
  /** Horizontal carrier velocity, added to the player's position. */
  readonly carrierX: number;
  readonly carrierZ: number;
  /** Vertical speed the player is eased toward, or null when the wind leaves vertical alone. */
  readonly targetVy: number | null;
  /** Fall speed floor (negative number), or null. */
  readonly minVy: number | null;
}

/** Summary: The part of a moving body the wind changes (feet position and vertical speed). */
export interface IWindBody {
  x: number;
  z: number;
  vy: number;
}
// #endregion

// #region Tuning
/** Extra height (m) above a column's top where the exit push still acts. */
const COLUMN_EXIT_BAND_M = 2.5;
/** How strongly (1/s) a stream pulls a drifting player back to its axis. */
const STREAM_CENTERING_PER_SEC = 2.2;
/** How fast (1/s) vertical speed eases toward a current's target. */
const VERTICAL_EASE_PER_SEC = 8.0;
/** How fast (1/s) a too-fast fall eases toward a downdraft's cap. */
const FALL_CAP_EASE_PER_SEC = 8.0;
// #endregion

// #region Wind Flowers
/**
 * Summary: The wind flowers: two in the Sky Harbor garden (canopy perch, Windspire balcony) and one
 *          on the Floating Garden (Sky Tree high branch).
 * Design: Their columns have no exit push. A player who does not steer just hovers at the top and
 *         settles back down inside the column; only steering out drops them onto the target.
 */
export const SKY_WIND_FLOWERS: readonly ISkyWindFlower[] = [
  { id: 'wind-flower-perch', x: 765.0, z: -72.5, deckY: 68.0, triggerRadius: 3.0, holdOpenSec: 6.0 },
  { id: 'wind-flower-windspire', x: 785.0, z: -49.0, deckY: 68.0, triggerRadius: 3.0, holdOpenSec: 6.0 },
  { id: 'wind-flower-garden', x: GARDEN_WIND_FLOWER_SPOT.x, z: GARDEN_WIND_FLOWER_SPOT.z, deckY: 71.0, triggerRadius: 3.0, holdOpenSec: 6.0 },
];
const WIND_FLOWER_COLUMN_RADIUS_M = 1.6;
// #endregion

// #region Currents
/**
 * Summary: All wind currents of the archipelago.
 * Design: Together with the cloud routes they close the main loop: Garden -> (stream) ->
 *         Ruins -> (clouds + updraft) -> Observatory -> (descending stream) -> Crystal Isles
 *         -> (bridge) -> Sky Harbor -> (Cloud Run) -> Garden.
 */
export const SKY_WIND_CURRENTS: readonly ISkyWindCurrent[] = [
  {
    id: 'wind-garden-to-ruins',
    mode: 'stream',
    path: [
      { x: 712.0, y: 72.5, z: 34.0 },
      { x: 696.0, y: 80.0, z: -10.0 },
      { x: 692.0, y: 84.0, z: -60.0 },
      { x: 700.0, y: 84.5, z: -104.0 },
    ],
    radius: 3.0,
    speed: 9.0,
  },
  {
    id: 'wind-ruins-updraft',
    mode: 'updraft',
    path: [
      { x: RUINS_UPDRAFT_BASE.x, y: RUINS_UPDRAFT_BASE.y - 0.5, z: RUINS_UPDRAFT_BASE.z },
      { x: RUINS_UPDRAFT_BASE.x, y: RUINS_UPDRAFT_TOP.y + 2.0, z: RUINS_UPDRAFT_BASE.z },
    ],
    radius: 2.4,
    speed: 8.0,
    exit: { x: RUINS_UPDRAFT_TOP.x, y: RUINS_UPDRAFT_TOP.y, z: RUINS_UPDRAFT_TOP.z },
    exitSpeed: 4.5,
  },
  {
    id: 'wind-observatory-to-crystal',
    mode: 'stream',
    path: [
      { x: 814.0, y: 99.2, z: -104.0 },
      { x: 840.0, y: 85.0, z: -60.0 },
      { x: 866.0, y: 64.0, z: -22.0 },
    ],
    radius: 3.0,
    speed: 9.0,
  },
  {
    id: 'wind-storm-vortex',
    mode: 'vortex',
    path: [
      { x: STORM_VORTEX_ANCHOR.x, y: STORM_VORTEX_ANCHOR.y - 2.0, z: STORM_VORTEX_ANCHOR.z },
      { x: STORM_VORTEX_ANCHOR.x, y: 117.0, z: STORM_VORTEX_ANCHOR.z },
    ],
    radius: STORM_VORTEX_ANCHOR.radius,
    speed: 7.0,
    swirlSpeed: 3.0,
    exit: { x: 872.0, y: 115.0, z: -112.0 },
    exitSpeed: 4.5,
  },
  {
    id: 'wind-observatory-downdraft',
    mode: 'downdraft',
    path: [
      // Starts just below and beyond the south rim: a player standing on the deck is outside
      // it, a player who walks off the edge drops straight into it.
      { x: 800.0, y: 95.5, z: -91.0 },
      { x: 795.0, y: 69.0, z: -66.0 },
    ],
    radius: 3.0,
    speed: 3.0,
    maxFallSpeed: 3.0,
  },
  {
    id: 'wind-hidden-return',
    mode: 'stream',
    path: [
      { x: 796.0, y: 31.5, z: 52.0 },
      { x: 792.0, y: 52.0, z: 25.0 },
      { x: 788.0, y: 70.0, z: 4.0 },
    ],
    radius: 3.0,
    speed: 9.0,
  },
  {
    id: 'wind-flower-perch-updraft',
    mode: 'updraft',
    path: [
      { x: 765.0, y: 67.5, z: -72.5 },
      { x: 765.0, y: 77.0, z: -72.5 },
    ],
    radius: WIND_FLOWER_COLUMN_RADIUS_M,
    speed: 7.0,
    flowerId: 'wind-flower-perch',
  },
  {
    id: 'wind-flower-windspire-updraft',
    mode: 'updraft',
    path: [
      { x: 785.0, y: 67.5, z: -49.0 },
      { x: 785.0, y: 82.0, z: -49.0 },
    ],
    radius: WIND_FLOWER_COLUMN_RADIUS_M,
    speed: 8.0,
    flowerId: 'wind-flower-windspire',
  },
  {
    id: 'wind-flower-garden-updraft',
    mode: 'updraft',
    path: [
      { x: GARDEN_WIND_FLOWER_SPOT.x, y: 70.5, z: GARDEN_WIND_FLOWER_SPOT.z },
      { x: GARDEN_WIND_FLOWER_SPOT.x, y: GARDEN_WIND_FLOWER_SPOT.topY, z: GARDEN_WIND_FLOWER_SPOT.z },
    ],
    radius: WIND_FLOWER_COLUMN_RADIUS_M,
    speed: 8.0,
    flowerId: 'wind-flower-garden',
  },
  {
    id: 'wind-windspire-shortcut',
    mode: 'stream',
    path: [
      { x: 782.0, y: 69.5, z: -58.0 },
      { x: 795.0, y: 100.0, z: -106.0 },
    ],
    radius: 3.0,
    speed: 9.0,
    unlockedByCores: 4,
  },
];
// #endregion

// ======================== MODULE STATE ======================== \\
// #region Progression State
let activatedWindCores = 0;
/** Seconds each wind flower stays open; 0 = closed. */
const flowerOpenSec = new Map<string, number>();
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Activation
/**
 * Summary: Tells the wind system how many Wind Cores are active (progression hook).
 * @param count Number of activated cores, 0 or more.
 */
export function setActivatedWindCoreCount(count: number): void {
  activatedWindCores = Math.max(0, Math.floor(count));
}

/**
 * Summary: Whether a current is running right now.
 * @param current The current definition.
 */
export function isWindCurrentActive(current: ISkyWindCurrent): boolean {
  if (current.flowerId !== undefined && (flowerOpenSec.get(current.flowerId) ?? 0) <= 0) return false;
  return current.unlockedByCores === undefined || activatedWindCores >= current.unlockedByCores;
}

/**
 * Summary: Opens wind flowers the player is standing next to and lets the others close.
 * @param dt Frame time in seconds.
 * @param playerX Feet X.
 * @param playerY Feet Y.
 * @param playerZ Feet Z.
 */
export function stepSkyWindFlowers(dt: number, playerX: number, playerY: number, playerZ: number): void {
  for (const flower of SKY_WIND_FLOWERS) {
    const near =
      Math.hypot(playerX - flower.x, playerZ - flower.z) <= flower.triggerRadius &&
      Math.abs(playerY - flower.deckY) <= 3.0;
    const left = flowerOpenSec.get(flower.id) ?? 0;
    flowerOpenSec.set(flower.id, near ? flower.holdOpenSec : Math.max(0, left - dt));
  }
}

/**
 * Summary: How open a wind flower is, for the renderer: 1 = open, 0 = closed.
 * @param id Flower id.
 */
export function getWindFlowerOpenness(id: string): number {
  return Math.min(1, (flowerOpenSec.get(id) ?? 0) / 1.0);
}

/** Summary: Closes every wind flower (used by tests and world reset). */
export function resetSkyWindFlowers(): void {
  flowerOpenSec.clear();
}
// #endregion

// #region Wind Query
/**
 * Summary: The wind acting on a player whose feet are at (x, y, z).
 * Design: The first active current that contains the point wins; currents are authored
 *         not to overlap, so order only matters at their very ends.
 * @param x Feet X.
 * @param y Feet Y.
 * @param z Feet Z.
 * @param elapsedSec Shared clock in seconds (reserved for gusting currents).
 * @returns The wind sample, or `null` outside every active current.
 */
export function sampleSkyWindAt(x: number, y: number, z: number, elapsedSec: number): IWindSample | null {
  void elapsedSec;
  for (let i = 0; i < SKY_WIND_CURRENTS.length; i++) {
    const current = SKY_WIND_CURRENTS[i];
    if (!isWindCurrentActive(current)) continue;
    const sample =
      current.mode === 'updraft' || current.mode === 'vortex'
        ? sampleColumn(current, x, y, z)
        : sampleTube(current, x, y, z);
    if (sample !== null) return sample;
  }
  return null;
}
// #endregion

// #region Wind Application
/**
 * Summary: Applies one frame of wind to a body, after gravity has been applied.
 * Design: Shared by the player physics and the traversal tests so both move the same way.
 *         Currents with a vertical target cancel this frame's gravity first, so their lift
 *         speed is the speed the player actually rises at.
 * @param body Feet position and vertical speed; mutated.
 * @param sample The wind at the body, from `sampleSkyWindAt`.
 * @param dt Frame time in seconds.
 * @param gravity Gravity in m/s^2 that was applied this frame.
 */
export function applySkyWind(body: IWindBody, sample: IWindSample, dt: number, gravity: number): void {
  if (sample.targetVy !== null) {
    body.vy += gravity * dt;
    body.vy += (sample.targetVy - body.vy) * (1 - Math.exp(-VERTICAL_EASE_PER_SEC * dt));
  }
  if (sample.minVy !== null && body.vy < sample.minVy) {
    body.vy += (sample.minVy - body.vy) * (1 - Math.exp(-FALL_CAP_EASE_PER_SEC * dt));
  }
  body.x += sample.carrierX * dt;
  body.z += sample.carrierZ * dt;
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Column Currents
function sampleColumn(current: ISkyWindCurrent, x: number, y: number, z: number): IWindSample | null {
  const base = current.path[0];
  const top = current.path[current.path.length - 1];
  const dx = x - base.x;
  const dz = z - base.z;
  const dist = Math.hypot(dx, dz);
  if (dist > current.radius || y < base.y || y > top.y + COLUMN_EXIT_BAND_M) return null;

  let carrierX = 0;
  let carrierZ = 0;
  if (current.mode === 'vortex' && current.swirlSpeed && dist > 0.05) {
    carrierX = (-dz / dist) * current.swirlSpeed;
    carrierZ = (dx / dist) * current.swirlSpeed;
  }
  const nearTop = y >= top.y - COLUMN_EXIT_BAND_M;
  if (nearTop && current.exit && current.exitSpeed) {
    const ex = current.exit.x - x;
    const ez = current.exit.z - z;
    const elen = Math.hypot(ex, ez) || 1;
    carrierX = (ex / elen) * current.exitSpeed;
    carrierZ = (ez / elen) * current.exitSpeed;
  }
  return {
    currentId: current.id,
    mode: current.mode,
    carrierX,
    carrierZ,
    targetVy: y < top.y ? current.speed : null,
    minVy: null,
  };
}
// #endregion

// #region Tube Currents
function sampleTube(current: ISkyWindCurrent, x: number, y: number, z: number): IWindSample | null {
  const hit = closestPointOnPath(current.path, x, y, z);
  // Past the far end the current releases the player, who then lands on the target deck.
  if (hit.dist > current.radius || hit.beyondEnd) return null;
  const { tx, ty, tz } = hit;
  const pull = STREAM_CENTERING_PER_SEC;

  if (current.mode === 'downdraft') {
    const maxFall = current.maxFallSpeed ?? current.speed;
    // Drift along the tube at the pace that matches the capped fall, so the player stays inside.
    const alongSpeed = Math.abs(ty) > 0.05 ? maxFall / Math.abs(ty) : current.speed;
    return {
      currentId: current.id,
      mode: current.mode,
      carrierX: tx * alongSpeed + (hit.px - x) * pull,
      carrierZ: tz * alongSpeed + (hit.pz - z) * pull,
      targetVy: null,
      minVy: -maxFall,
    };
  }

  return {
    currentId: current.id,
    mode: current.mode,
    carrierX: tx * current.speed + (hit.px - x) * pull,
    carrierZ: tz * current.speed + (hit.pz - z) * pull,
    targetVy: ty * current.speed + (hit.py - y) * pull,
    minVy: null,
  };
}

/** Closest point on a polyline, its distance, the unit tangent of that segment and whether the point lies past the last point. */
function closestPointOnPath(
  path: readonly IWindPoint[],
  x: number,
  y: number,
  z: number
): { px: number; py: number; pz: number; dist: number; tx: number; ty: number; tz: number; beyondEnd: boolean } {
  let best = { px: path[0].x, py: path[0].y, pz: path[0].z, dist: Infinity, tx: 0, ty: 0, tz: 0, beyondEnd: false };
  const lastSegment = path.length - 2;
  for (let s = 0; s < path.length - 1; s++) {
    const a = path[s];
    const b = path[s + 1];
    const sx = b.x - a.x;
    const sy = b.y - a.y;
    const sz = b.z - a.z;
    const lenSq = sx * sx + sy * sy + sz * sz;
    const rawU = lenSq > 1e-9 ? ((x - a.x) * sx + (y - a.y) * sy + (z - a.z) * sz) / lenSq : 0;
    const u = Math.max(0, Math.min(1, rawU));
    const px = a.x + sx * u;
    const py = a.y + sy * u;
    const pz = a.z + sz * u;
    const dist = Math.hypot(x - px, y - py, z - pz);
    if (dist < best.dist) {
      const len = Math.sqrt(lenSq) || 1;
      best = { px, py, pz, dist, tx: sx / len, ty: sy / len, tz: sz / len, beyondEnd: s === lastSegment && rawU >= 1 };
    }
  }
  return best;
}
// #endregion
