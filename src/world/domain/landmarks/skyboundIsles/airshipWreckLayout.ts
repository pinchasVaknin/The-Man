// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles — Forgotten Airship wreck
// DESIGN: The wreck lies across the Forgotten Airship island as one walkable hull deck, raised
//         above the island deck, so the player can walk out to the bow. The navigation lever is at
//         the bow. Pulling it solves the airship-navigation puzzle, which switches on a downdraft
//         from the bow down to the Hidden Isle. The hull deck stays inside the island rim.
// SUMMARY: Hull deck, its walkable surface visitor, the navigation lever and the gated wind current.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import type { ISkyDeckRect, ISkySolidBox } from './skyHarborLayout';
import type { ISkyWindCurrent } from './skyWindSystem';
import { getSkyIsland } from './skyboundLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: The navigation lever on the bow of the wreck. */
export interface IAirshipNavigationLever {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
// #endregion

// #region Layout
const AIRSHIP = getSkyIsland('forgotten-airship')!;

/** Summary: The broken hull, a walkable deck across the island, raised above the island deck. */
export const AIRSHIP_WRECK_HULL: ISkyDeckRect = {
  id: 'airship-wreck-hull',
  minX: 830.0,
  maxX: 852.0,
  minZ: 66.0,
  maxZ: 72.0,
  y: AIRSHIP.deckY + 1.0,
};

/** Summary: The navigation lever, on the bow end of the hull. */
export const AIRSHIP_NAVIGATION_LEVER: IAirshipNavigationLever = {
  id: 'airship-navigation-lever',
  x: 831.5,
  y: AIRSHIP_WRECK_HULL.y,
  z: 69.0,
};

/** Summary: The downdraft from the bow to the Hidden Isle; runs once the lever is pulled. */
export const AIRSHIP_NAVIGATION_CURRENT: ISkyWindCurrent = {
  id: 'wind-airship-navigation',
  mode: 'downdraft',
  path: [
    { x: AIRSHIP_NAVIGATION_LEVER.x - 2.0, y: AIRSHIP_NAVIGATION_LEVER.y + 1.5, z: AIRSHIP_NAVIGATION_LEVER.z - 1.0 },
    { x: 801.0, y: 33.0, z: 58.0 },
  ],
  radius: 2.4,
  speed: 6.0,
  maxFallSpeed: 4.0,
  unlockedByPuzzle: 'airship-navigation',
};
/** Summary: The heavy crate on the stern of the hull; pushing it aside uncovers a hatch. */
export const AIRSHIP_CRATE_SIZE_M = 1.8;
/** Summary: How far (m) the crate slides along the hull once pushed. */
export const AIRSHIP_CRATE_SLIDE_M = 2.6;
const AIRSHIP_CRATE_X = 849.0;
const AIRSHIP_CRATE_Z = 66.2;

/** Summary: The crate's solid footprint while it blocks the hatch (solid until the puzzle is solved). */
export const AIRSHIP_CRATE_GATE: ISkySolidBox = {
  id: 'airship-crate-gate',
  minX: AIRSHIP_CRATE_X,
  maxX: AIRSHIP_CRATE_X + AIRSHIP_CRATE_SIZE_M,
  minZ: AIRSHIP_CRATE_Z,
  maxZ: AIRSHIP_CRATE_Z + AIRSHIP_CRATE_SIZE_M,
  minY: AIRSHIP_WRECK_HULL.y,
  maxY: AIRSHIP_WRECK_HULL.y + AIRSHIP_CRATE_SIZE_M,
};

/** Summary: Where the push is aimed: the crate's centre column, at a grip height a player on the island can reach. */
export const AIRSHIP_CRATE_PUSH_POINT = {
  id: 'airship-crate',
  x: AIRSHIP_CRATE_X + AIRSHIP_CRATE_SIZE_M / 2,
  y: AIRSHIP_WRECK_HULL.y + 0.4,
  z: AIRSHIP_CRATE_Z + AIRSHIP_CRATE_SIZE_M / 2,
};

/** Summary: The hatch chest, under the crate's place; it is only shown once the crate is pushed. */
export const AIRSHIP_HATCH_CHEST = {
  id: 'chest-sky-airship-hatch',
  x: AIRSHIP_CRATE_PUSH_POINT.x,
  y: AIRSHIP_WRECK_HULL.y,
  z: AIRSHIP_CRATE_PUSH_POINT.z,
};
/** Summary: The captain's journal, lying on the hull between the lever and the crate. */
export const AIRSHIP_JOURNAL = {
  id: 'airship-captain-journal',
  x: 837.0,
  y: AIRSHIP_WRECK_HULL.y,
  z: 69.5,
};
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Surfaces
/**
 * Summary: Reports the hull deck when the point is on it.
 * @param x Point X.
 * @param z Point Z.
 * @param visit Called with the deck height and id for the hull.
 */
export function visitAirshipWreckSurfaces(x: number, z: number, visit: (y: number, kind: 'deck', id: string) => void): void {
  const h = AIRSHIP_WRECK_HULL;
  if (x >= h.minX && x <= h.maxX && z >= h.minZ && z <= h.maxZ) visit(h.y, 'deck', h.id);
}
// #endregion
