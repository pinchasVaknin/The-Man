// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles / Sky Harbor Pond
// DESIGN: The Sky Garden pond is a real sunken pool: the island deck has a round hole, the bed slopes from
//         ankle depth at the rim to about two meters in the middle, and the water surface sits just below
//         deck level. One set of pure functions answers the three questions the game asks of it: where is
//         the bed (walking), where is the water (wading and swimming), and what is the water column (koi).
// SUMMARY: Pond constants and height queries. Does not build meshes or move the player.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { SKY_HARBOR } from './skyboundLayout';
import { GARDEN_PONDS } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
const POND = GARDEN_PONDS[0];
/** Water surface sits this far (m) below the deck, so stepping in is a small step down. */
const WATER_BELOW_DECK_M = 0.12;
/** Water depth (m) at the rim: ankle deep. */
const RIM_DEPTH_M = 0.15;
/** Water depth (m) at the center: deep enough to swim. */
const CENTER_DEPTH_M = 2.0;
/** Shapes the slope: above 1 the shallows stay shallow longer and the middle drops faster. */
const SLOPE_EXPONENT = 1.25;
/** Feet this far (m) above or below the deck still count as being at the pond's level. */
const LEVEL_TOLERANCE_M = 4.0;

/** Summary: The Sky Harbor pond. */
export const SKY_HARBOR_POND = {
  x: POND.x,
  z: POND.z,
  radius: POND.radius,
  deckY: SKY_HARBOR.deckY,
  surfaceY: SKY_HARBOR.deckY - WATER_BELOW_DECK_M,
  rimBedY: SKY_HARBOR.deckY - WATER_BELOW_DECK_M - RIM_DEPTH_M,
  centerBedY: SKY_HARBOR.deckY - WATER_BELOW_DECK_M - CENTER_DEPTH_M,
} as const;

/** Summary: Where the water surface and the bed are at one point of the pond. */
export interface ISkyPondColumn {
  readonly surfaceY: number;
  readonly bedY: number;
}
// #endregion

// ======================== PUBLIC QUERIES ======================== \\
// #region Pond Queries
/**
 * Summary: Height of the pond bed at (x, z), or null outside the pond.
 * Design: The bed rises from the center to the rim along a smooth curve, so the player can wade in and
 *         the fish have a shallow shore to turn away from.
 */
export function skyHarborPondBedY(x: number, z: number): number | null {
  const distance = Math.hypot(x - SKY_HARBOR_POND.x, z - SKY_HARBOR_POND.z);
  if (distance > SKY_HARBOR_POND.radius) return null;
  const fromCenter = distance / SKY_HARBOR_POND.radius;
  const drop = (SKY_HARBOR_POND.rimBedY - SKY_HARBOR_POND.centerBedY) * Math.pow(1 - fromCenter, SLOPE_EXPONENT);
  return SKY_HARBOR_POND.rimBedY - drop;
}

/** Summary: True when the point is inside the pond's outline. */
export function isInsideSkyHarborPond(x: number, z: number): boolean {
  return Math.hypot(x - SKY_HARBOR_POND.x, z - SKY_HARBOR_POND.z) <= SKY_HARBOR_POND.radius;
}

/**
 * Summary: Height of the pond water surface at (x, z), or null when there is no pond water there.
 * @param currentY Feet height; a player far above or below the deck level is not in the pond.
 */
export function skyHarborPondWaterSurfaceAt(x: number, z: number, currentY?: number): number | null {
  if (!isInsideSkyHarborPond(x, z)) return null;
  if (currentY !== undefined && Math.abs(currentY - SKY_HARBOR_POND.deckY) > LEVEL_TOLERANCE_M) return null;
  return SKY_HARBOR_POND.surfaceY;
}

/** Summary: The water column at (x, z) for the koi, or null outside the pond. */
export function skyHarborPondColumnAt(x: number, z: number): ISkyPondColumn | null {
  const bedY = skyHarborPondBedY(x, z);
  return bedY === null ? null : { surfaceY: SKY_HARBOR_POND.surfaceY, bedY };
}
// #endregion
