// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: One telescope per observation balcony, each fixed on one island. Looking through it
//         is a view mode on the player (`telescopeViewId`): the camera rig reads the view from
//         here, the simulation enters it on the interact key and leaves it when the player
//         presses the key again, moves, or ends up away from the telescope.
// SUMMARY: Telescope placement, the view (camera position, look target, yaw/pitch) and the
//          exit rule. Holds no THREE objects and no runtime state.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { getSkyIsland, SKY_HARBOR } from './skyboundLayout';
import { BALCONY_TELESCOPE_SPOTS } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: A balcony telescope fixed on one island. */
export interface ISkyTelescope {
  readonly id: string;
  readonly balconyId: string;
  readonly x: number;
  /** Floor height the telescope stands on. */
  readonly y: number;
  readonly z: number;
  readonly targetIslandId: string;
  readonly interactRadius: number;
}

/** Summary: Where the camera sits and what it aims at while looking through a telescope. */
export interface ITelescopeView {
  readonly eyeX: number;
  readonly eyeY: number;
  readonly eyeZ: number;
  readonly lookX: number;
  readonly lookY: number;
  readonly lookZ: number;
  /** Player yaw/pitch that face the target (the game's forward is (-sin yaw, -cos yaw)). */
  readonly yaw: number;
  readonly pitch: number;
  /** Field of view (degrees) that frames the whole target island. */
  readonly fovDeg: number;
}
// #endregion

// #region Tuning
/** Narrowest and widest telescope field of view (degrees); each view frames its island in between. */
export const TELESCOPE_MIN_FOV_DEG = 12;
export const TELESCOPE_MAX_FOV_DEG = 34;
/** Height (m) of the eyepiece above the balcony floor. */
const EYEPIECE_HEIGHT_M = 1.55;
/** The view aims this far (m) above the target island's deck, at its landmark. */
const TARGET_LIFT_M = 4.0;
/** Moving the player further than this (m) from the telescope ends the view. */
const VIEW_LEASH_M = 2.5;
/** Movement input above this magnitude ends the view. */
const MOVE_INPUT_EXIT = 0.1;

/**
 * Which island each balcony's telescope watches.
 * Design: Only islands at or a little above eye height: looking up at a high island shows
 *         nothing but the rock under its deck.
 */
const TARGET_BY_BALCONY: Record<string, string> = {
  'balcony-north': 'ancient-sky-ruins',
  'balcony-east': 'crystal-isles',
  'balcony-south-west': 'floating-garden',
};
// #endregion

// #region Telescopes
/** Summary: The three balcony telescopes. */
export const SKY_TELESCOPES: readonly ISkyTelescope[] = BALCONY_TELESCOPE_SPOTS.map((spot) => ({
  id: `telescope-${spot.balconyId}`,
  balconyId: spot.balconyId,
  x: spot.x,
  y: SKY_HARBOR.deckY,
  z: spot.z,
  targetIslandId: TARGET_BY_BALCONY[spot.balconyId] ?? SKY_HARBOR.id,
  interactRadius: 2.6,
}));
// #endregion

// ======================== PUBLIC QUERIES ======================== \\
// #region Lookup
/**
 * Summary: Finds a telescope by id.
 * @param id Telescope id.
 * @returns The telescope, or `undefined`.
 */
export function getSkyTelescope(id: string): ISkyTelescope | undefined {
  return SKY_TELESCOPES.find((t) => t.id === id);
}

/**
 * Summary: The nearest telescope within its interact radius of the feet (same floor only).
 * @param x Feet X.
 * @param y Feet Y.
 * @param z Feet Z.
 * @returns The telescope, or `null`.
 */
export function findNearestSkyTelescope(x: number, y: number, z: number): ISkyTelescope | null {
  let best: ISkyTelescope | null = null;
  let bestDist = Infinity;
  for (const scope of SKY_TELESCOPES) {
    if (Math.abs(y - scope.y) > 1.5) continue;
    const d = Math.hypot(x - scope.x, z - scope.z);
    if (d <= scope.interactRadius && d < bestDist) {
      best = scope;
      bestDist = d;
    }
  }
  return best;
}
// #endregion

// #region View
/**
 * Summary: Camera placement and facing while looking through `scope`.
 * @param scope The telescope.
 * @returns The view; a telescope whose target is unknown looks back at the hub.
 */
export function telescopeViewFor(scope: ISkyTelescope): ITelescopeView {
  const target = getSkyIsland(scope.targetIslandId) ?? SKY_HARBOR;
  const eyeX = scope.x;
  const eyeY = scope.y + EYEPIECE_HEIGHT_M;
  const eyeZ = scope.z;
  const lookX = target.x;
  const lookY = target.deckY + TARGET_LIFT_M;
  const lookZ = target.z;
  const dx = lookX - eyeX;
  const dz = lookZ - eyeZ;
  const distance = Math.hypot(dx, lookY - eyeY, dz);
  const framingDeg = (2 * Math.atan(target.radius / distance) * 180) / Math.PI;
  return {
    eyeX,
    eyeY,
    eyeZ,
    lookX,
    lookY,
    lookZ,
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(lookY - eyeY, Math.hypot(dx, dz)),
    fovDeg: Math.max(TELESCOPE_MIN_FOV_DEG, Math.min(TELESCOPE_MAX_FOV_DEG, framingDeg)),
  };
}

/**
 * Summary: Whether the player's telescope view should end this frame.
 * @param player Player position and current view id.
 * @param forwardInput Forward/back movement input (-1..1).
 * @param rightInput Strafe movement input (-1..1).
 * @returns True when the player moved, walked away, or the telescope no longer exists.
 */
export function shouldExitTelescopeView(
  player: { readonly x: number; readonly z: number; readonly telescopeViewId?: string | null },
  forwardInput: number,
  rightInput: number
): boolean {
  if (!player.telescopeViewId) return false;
  const scope = getSkyTelescope(player.telescopeViewId);
  if (!scope) return true;
  if (Math.abs(forwardInput) > MOVE_INPUT_EXIT || Math.abs(rightInput) > MOVE_INPUT_EXIT) return true;
  return Math.hypot(player.x - scope.x, player.z - scope.z) > VIEW_LEASH_M;
}
// #endregion
