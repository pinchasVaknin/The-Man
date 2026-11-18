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
import { OBSERVATORY_GIANT_TELESCOPE, OBSERVATORY_TELESCOPE_PLATFORM } from './observatoryLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: A telescope mounted on the Windspire balcony or the Sky Observatory platform. */
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
/** Height (m) of the eyepiece above the floor (clears the 1.1 m platform railings cleanly). */
const EYEPIECE_HEIGHT_M = 1.92;
/** The view aims this far (m) above the target island's deck, at its landmark. */
const TARGET_LIFT_M = 4.0;
/** Moving the player further than this (m) from the telescope ends the view. */
const VIEW_LEASH_M = 2.5;
/** Movement input above this magnitude ends the view. */
const MOVE_INPUT_EXIT = 0.1;
// #endregion

// #region Telescopes
/** Summary: The two Windspire balcony telescopes on Sky Harbor plus the Giant Telescope on Sky Observatory. */
export const SKY_TELESCOPES: readonly ISkyTelescope[] = [
  ...BALCONY_TELESCOPE_SPOTS.map((spot) => ({
    id: `telescope-${spot.balconyId}`,
    balconyId: spot.balconyId,
    x: spot.x,
    y: spot.y,
    z: spot.z,
    targetIslandId: spot.targetIslandId,
    interactRadius: 2.6,
  })),
  {
    id: 'telescope-observatory-giant',
    balconyId: OBSERVATORY_TELESCOPE_PLATFORM.id,
    x: OBSERVATORY_GIANT_TELESCOPE.x,
    y: OBSERVATORY_TELESCOPE_PLATFORM.y,
    z: OBSERVATORY_GIANT_TELESCOPE.z,
    targetIslandId: 'floating-garden',
    interactRadius: 2.8,
  },
];
// #endregion

// #region Runtime Aim State
let activeTelescopeRuntime: { id: string | null; yaw: number; pitch: number } = {
  id: null,
  yaw: 0,
  pitch: 0,
};

/**
 * Summary: Updates the live runtime aim of the currently active telescope so 3D telescope models
 *          can rotate with the player's aim and clear the sightline while active.
 */
export function syncTelescopeRuntimeAim(id: string | null, yaw: number, pitch: number): void {
  activeTelescopeRuntime = { id, yaw, pitch };
}

/**
 * Summary: Reads the currently active telescope id and live yaw/pitch aim.
 */
export function getTelescopeRuntimeAim(): { readonly id: string | null; readonly yaw: number; readonly pitch: number } {
  return activeTelescopeRuntime;
}
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
 * Summary: Camera placement and default facing while looking through `scope`.
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
 * Summary: Computes the live look-at target when the player rotates a telescope with `yaw` and `pitch`.
 * Design: When `yaw === 0 && pitch === 0` (or matches `view.yaw`/`view.pitch`), returns the exact
 *         landmark `lookX/Y/Z`; otherwise projects along the player's live forward vector `(-sin yaw cos pitch, sin pitch, -cos yaw cos pitch)`.
 */
export function aimedTelescopeLookPoint(
  view: ITelescopeView,
  yaw: number,
  pitch: number
): { readonly lookX: number; readonly lookY: number; readonly lookZ: number } {
  const isUntouchedInitial =
    (yaw === 0 && pitch === 0) ||
    (Math.abs(yaw - 0.04) < 1e-6 && Math.abs(pitch - -0.04) < 1e-6) ||
    (Math.abs(yaw - view.yaw) < 1e-6 && Math.abs(pitch - view.pitch) < 1e-6);
  if (isUntouchedInitial) {
    return { lookX: view.lookX, lookY: view.lookY, lookZ: view.lookZ };
  }
  const dist = Math.hypot(view.lookX - view.eyeX, view.lookY - view.eyeY, view.lookZ - view.eyeZ) || 100;
  const clampedPitch = Math.max(-1.2, Math.min(1.2, pitch));
  const cosP = Math.cos(clampedPitch);
  const fwdX = -Math.sin(yaw) * cosP;
  const fwdY = Math.sin(clampedPitch);
  const fwdZ = -Math.cos(yaw) * cosP;
  return {
    lookX: view.eyeX + fwdX * dist,
    lookY: view.eyeY + fwdY * dist,
    lookZ: view.eyeZ + fwdZ * dist,
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
