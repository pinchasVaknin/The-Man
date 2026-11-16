// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: One query for everything walkable in the archipelago: the highest surface under
//         (x, z) that is not more than a small step above the feet. That tolerance is what
//         stops a player falling past an island from being snapped up onto it.
//         Fall recovery remembers the last island the player stood on and puts them back on
//         that island's checkpoint once they drop below the archipelago.
// SUMMARY: Walkable height of islands, bridges, rest platforms, Sky Harbor additions and clouds, and the
//          fall-recovery tracker. Does not move the player; the physics step does that.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { SKY_BRIDGES, SKYBOUND_ISLANDS, SKYBOUND_REGION, getSkyIsland, isInsideSkyboundRegion, type ISkyIsland } from './skyboundLayout';
import { SKY_REST_PLATFORMS } from './skyCloudRoutes';
import { skyCloudSurfaceAt } from './skyCloudSystem';
import { SKY_BOUNCE_PADS, SKY_HARBOR_SOLID_BOXES, visitSkyHarborSurfaces, type ISkyBouncePad, type ISkySolidBox } from './skyHarborLayout';
import { GARDEN_BOUNCE_PADS, GARDEN_SOLID_BOXES, visitFloatingGardenSurfaces } from './floatingGardenLayout';
import { OBSERVATORY_SOLID_BOXES, visitObservatorySurfaces } from './observatoryLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What kind of thing the feet stand on. */
export type SkySurfaceKind = 'island' | 'bridge' | 'platform' | 'cloud' | 'deck' | 'ramp' | 'stair' | 'pad';

/** Summary: A walkable surface hit. */
export interface ISkySurfaceHit {
  readonly y: number;
  readonly kind: SkySurfaceKind;
  readonly id: string;
}

/** Summary: Remembers where a player last stood in the archipelago. */
export interface ISkyFallTracker {
  lastIslandId: string | null;
}

/** Summary: Where to put a fallen player back. */
export interface ISkyCheckpoint {
  readonly islandId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
// #endregion

// #region Tuning
/** Feet may be at most this far (m) below a surface and still land on it. */
const LANDING_TOLERANCE_M = 1.5;
/** Respawned feet are put this far (m) above the checkpoint deck. */
const RESPAWN_LIFT_M = 0.05;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Surface Query
/**
 * Summary: The walkable archipelago surface under (x, z).
 * @param x World X.
 * @param z World Z.
 * @param currentY Feet height. Surfaces more than 1.5 m above it are ignored; when omitted,
 *                 the highest surface is returned.
 * @returns The surface, or `null` when nothing of the archipelago is under the point.
 */
export function skyboundSurfaceAt(x: number, z: number, currentY?: number): ISkySurfaceHit | null {
  if (!isInsideSkyboundRegion(x, z)) return null;
  let best: ISkySurfaceHit | null = null;
  const consider = (y: number, kind: SkySurfaceKind, id: string): void => {
    if (currentY !== undefined && currentY < y - LANDING_TOLERANCE_M) return;
    if (best === null || y > best.y) best = { y, kind, id };
  };

  for (let i = 0; i < SKYBOUND_ISLANDS.length; i++) {
    const isl = SKYBOUND_ISLANDS[i];
    if (Math.hypot(x - isl.x, z - isl.z) <= isl.radius) consider(isl.deckY, 'island', isl.id);
  }
  for (let i = 0; i < SKY_BRIDGES.length; i++) {
    const br = SKY_BRIDGES[i];
    const sx = br.bx - br.ax;
    const sz = br.bz - br.az;
    const lenSq = sx * sx + sz * sz;
    const u = ((x - br.ax) * sx + (z - br.az) * sz) / lenSq;
    if (u < 0 || u > 1) continue;
    if (Math.hypot(x - (br.ax + sx * u), z - (br.az + sz * u)) <= br.halfWidth) {
      consider(br.ay + (br.by - br.ay) * u, 'bridge', br.id);
    }
  }
  for (let i = 0; i < SKY_REST_PLATFORMS.length; i++) {
    const p = SKY_REST_PLATFORMS[i];
    if (Math.hypot(x - p.x, z - p.z) <= p.radius) consider(p.y, 'platform', p.id);
  }
  visitSkyHarborSurfaces(x, z, consider);
  visitFloatingGardenSurfaces(x, z, consider);
  visitObservatorySurfaces(x, z, consider);
  const cloud = skyCloudSurfaceAt(x, z, currentY);
  if (cloud !== null) consider(cloud.y, 'cloud', cloud.cloud.def.id);
  return best;
}
// #endregion

// #region Bounce Pads And Solids
/** Summary: Every bounce mushroom of the archipelago (Sky Harbor garden and Floating Garden). */
export const SKYBOUND_BOUNCE_PADS: readonly ISkyBouncePad[] = [...SKY_BOUNCE_PADS, ...GARDEN_BOUNCE_PADS];

/** Summary: Every solid box of the archipelago's structures, props and railings. */
export const SKYBOUND_SOLID_BOXES: readonly ISkySolidBox[] = [...SKY_HARBOR_SOLID_BOXES, ...GARDEN_SOLID_BOXES, ...OBSERVATORY_SOLID_BOXES];

/**
 * Summary: The bounce mushroom cap the feet are resting on, if any.
 * @param x Feet X.
 * @param y Feet Y.
 * @param z Feet Z.
 * @returns The pad, or `null`.
 */
export function skyBouncePadAt(x: number, y: number, z: number): ISkyBouncePad | null {
  for (const p of SKYBOUND_BOUNCE_PADS) {
    if (Math.hypot(x - p.x, z - p.z) <= p.radius && Math.abs(y - p.topY) <= 0.6) return p;
  }
  return null;
}
// #endregion

// #region Fall Recovery
/**
 * Summary: Creates an empty fall tracker.
 */
export function createSkyFallTracker(): ISkyFallTracker {
  return { lastIslandId: null };
}

/**
 * Summary: Updates the tracker for this frame and says whether the player must be put back.
 * Design: Standing on any archipelago surface records the nearest island (by rim distance),
 *         so falling off a cloud returns the player to the island the route started near.
 *         Standing on ordinary ground clears the tracker, so a player who walked down the
 *         waterfall climb is never teleported.
 * @param tracker The tracker to update.
 * @param x Feet X.
 * @param y Feet Y.
 * @param z Feet Z.
 * @param grounded Whether the player is standing on something this frame.
 * @param standingOnSky Whether that something is an archipelago surface.
 * @returns The checkpoint to move the player to, or `null` when nothing should happen.
 */
export function updateSkyFallRecovery(
  tracker: ISkyFallTracker,
  x: number,
  y: number,
  z: number,
  grounded: boolean,
  standingOnSky: boolean
): ISkyCheckpoint | null {
  if (grounded) {
    tracker.lastIslandId = standingOnSky ? nearestIsland(x, z).id : null;
    return null;
  }
  if (tracker.lastIslandId === null || y >= SKYBOUND_REGION.fallRecoveryY) return null;
  const isl = getSkyIsland(tracker.lastIslandId);
  tracker.lastIslandId = null;
  if (!isl) return null;
  return { islandId: isl.id, x: isl.checkpoint.x, y: isl.deckY + RESPAWN_LIFT_M, z: isl.checkpoint.z };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Helpers
function nearestIsland(x: number, z: number): ISkyIsland {
  let best = SKYBOUND_ISLANDS[0];
  let bestDist = Infinity;
  for (let i = 0; i < SKYBOUND_ISLANDS.length; i++) {
    const isl = SKYBOUND_ISLANDS[i];
    const rimDist = Math.hypot(x - isl.x, z - isl.z) - isl.radius;
    if (rimDist < bestDist) {
      bestDist = rimDist;
      best = isl;
    }
  }
  return best;
}
// #endregion
