// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Storm Fruit grows on a few bushes on Storm Island, around the royal stag herd. Walking
//         into a bush picks one fruit, and that bush then stays bare until it has regrown. The
//         bush state is kept here and saved with the world; the caller puts the fruit into the
//         inventory, so this module never touches the player.
// SUMMARY: Storm Fruit bush definitions, picking by touch, regrowth, and save/restore.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import type { InventoryItemId } from '../../worldTypes';
import { STORM_ISLAND } from './skyboundLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: One fruit bush on Storm Island. */
export interface IStormFruitBush {
  readonly id: string;
  readonly x: number;
  /** Deck height of Storm Island at the bush. */
  readonly y: number;
  readonly z: number;
}

/** Summary: Live state of one bush: seconds until it has regrown (0 = fruit ready). */
export interface IStormFruitBushState {
  readonly id: string;
  readonly regrowSec: number;
}
// #endregion

// #region Tuning
/** Seconds a picked bush takes to grow its fruit back. */
export const STORM_FRUIT_REGROW_SEC = 120;
/** Horizontal reach (m) from the player's axis to a bush for picking. */
const PICK_RADIUS_M = 1.3;
/** Largest height difference (m) between the player's feet and the bush for picking. */
const PICK_HEIGHT_M = 2.0;
// #endregion

// #region Definitions
/** Summary: The four bushes, all on the deck of Storm Island within reach of the herd. */
export const STORM_FRUIT_BUSHES: readonly IStormFruitBush[] = [
  { id: 'storm-fruit-bush-0', x: 889.0, y: STORM_ISLAND.deckY, z: -101.5 },
  { id: 'storm-fruit-bush-1', x: 872.0, y: STORM_ISLAND.deckY, z: -121.0 },
  { id: 'storm-fruit-bush-2', x: 895.0, y: STORM_ISLAND.deckY, z: -122.0 },
  { id: 'storm-fruit-bush-3', x: 899.0, y: STORM_ISLAND.deckY, z: -108.0 },
];
// #endregion

// ======================== MODULE STATE ======================== \\
// #region State
const regrowSecById = new Map<string, number>();
// #endregion

// ======================== PUBLIC API ======================== \\
// #region State Access
/** Summary: Seconds until a bush has regrown (0 when its fruit is ready). */
export function getStormFruitRegrowSec(id: string): number {
  return regrowSecById.get(id) ?? 0;
}

/** Summary: Whether a bush currently has fruit to pick. */
export function isStormFruitReady(id: string): boolean {
  return getStormFruitRegrowSec(id) <= 0;
}

/** Summary: Every bush is ready again (new world, tests). */
export function resetStormFruit(): void {
  regrowSecById.clear();
}

/**
 * Summary: Counts down the regrowth of every picked bush.
 * @param dt Frame time in seconds.
 */
export function stepStormFruitRegrowth(dt: number): void {
  for (const [id, sec] of regrowSecById) {
    const left = sec - dt;
    if (left <= 0) regrowSecById.delete(id);
    else regrowSecById.set(id, left);
  }
}

/** Summary: The bushes still growing their fruit, for the save file. */
export function exportStormFruitState(): IStormFruitBushState[] {
  return [...regrowSecById].map(([id, regrowSec]) => ({ id, regrowSec }));
}

/**
 * Summary: Restores the bush state from a save file; unknown ids are dropped.
 * @param saved Saved bushes, or undefined for an older save without Storm Fruit.
 */
export function importStormFruitState(saved: readonly IStormFruitBushState[] | undefined): void {
  regrowSecById.clear();
  if (!Array.isArray(saved)) return;
  const known = new Set(STORM_FRUIT_BUSHES.map((b) => b.id));
  for (const entry of saved) {
    if (!known.has(entry.id)) continue;
    const sec = Number(entry.regrowSec);
    if (Number.isFinite(sec) && sec > 0) regrowSecById.set(entry.id, Math.min(sec, STORM_FRUIT_REGROW_SEC));
  }
}
// #endregion

// #region Picking
/**
 * Summary: Picks the fruit of every ready bush the player is touching.
 * @param x Player feet X.
 * @param feetY Player feet Y.
 * @param z Player feet Z.
 * @returns The number of fruit picked by this call (0 when no ready bush is in reach).
 */
export function pickStormFruitAt(x: number, feetY: number, z: number): number {
  let picked = 0;
  for (const bush of STORM_FRUIT_BUSHES) {
    if (!isStormFruitReady(bush.id)) continue;
    if (Math.abs(feetY - bush.y) > PICK_HEIGHT_M) continue;
    if (Math.hypot(x - bush.x, z - bush.z) > PICK_RADIUS_M) continue;
    regrowSecById.set(bush.id, STORM_FRUIT_REGROW_SEC);
    picked += 1;
  }
  return picked;
}

/** Summary: The item id a picked bush yields. */
export const STORM_FRUIT_ITEM: InventoryItemId = 'storm_fruit';
// #endregion
