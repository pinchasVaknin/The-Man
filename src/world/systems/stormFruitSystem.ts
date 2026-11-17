// ============================================================================
// MODULE: World / Systems / Storm Fruit
// DESIGN: A held Storm Fruit is thrown along the player's aim like an arrow, but under its own
//         simple gravity. A fruit that reaches a Royal Stag calms it; a fruit that lands first is
//         lost. Thrown fruit is in flight only, so it is not saved; picked bushes are.
// SUMMARY: Spawns the throw from the player's aim, steps the fruit in flight, and calms stags.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import type { IPlayerState } from '../domain/worldTypes';
import { calmRoyalStag, type ISmallAnimalState } from './boidsAndWildlifeSystem';
import { skyboundSurfaceAt } from '../domain/landmarks/skyboundIsles/skyboundSurface';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: One Storm Fruit in flight. */
export interface IStormFruitThrow {
  readonly id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
}

/** Summary: What one step of the flight did. */
export interface IStormFruitStepResult {
  /** Stags calmed by a fruit that reached them this step. */
  readonly calmed: readonly ISmallAnimalState[];
  /** Fruit that landed or ran out of time this step, without reaching a stag. */
  readonly lost: number;
}
// #endregion

// #region Tuning
const THROW_SPEED_MPS = 14.0;
const GRAVITY_MPS2 = 9.8;
/** A fruit older than this (s) is gone, whatever it is doing. */
const MAX_FLIGHT_SEC = 6.0;
/** Distance (m) from a stag's centre, horizontally, within which a fruit calms it. */
const STAG_HIT_RADIUS_M = 1.1;
/** Height (m) above a stag's feet that the fruit must pass to hit it. */
const STAG_CHEST_M = 1.0;
const STAG_HIT_HEIGHT_M = 1.4;
// #endregion

// ======================== MODULE STATE ======================== \\
// #region State
let throws: IStormFruitThrow[] = [];
let nextThrowId = 1;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Throws
/** Summary: Fruit currently in flight, for the renderer. */
export function getStormFruitThrows(): readonly IStormFruitThrow[] {
  return throws;
}

/** Summary: Clears every fruit in flight (new world, tests). */
export function resetStormFruitThrows(): void {
  throws = [];
}

/**
 * Summary: Throws one Storm Fruit from the player's hand along the aim, and takes it from the inventory.
 * @param state The player.
 * @returns True when a fruit was thrown; false when the player has none.
 */
export function throwStormFruit(state: IPlayerState): boolean {
  const owned = state.ownedItemIds ?? [];
  const index = owned.indexOf('storm_fruit');
  if (index < 0) return false;
  owned.splice(index, 1);

  const cosP = Math.cos(state.pitch);
  const dirX = -Math.sin(state.yaw) * cosP;
  const dirY = Math.sin(state.pitch);
  const dirZ = -Math.cos(state.yaw) * cosP;
  const len = Math.hypot(dirX, dirY, dirZ) || 1;
  const nx = dirX / len;
  const ny = dirY / len;
  const nz = dirZ / len;
  throws.push({
    id: nextThrowId++,
    x: state.x + nx * 0.6,
    y: state.y + 1.4 + ny * 0.6,
    z: state.z + nz * 0.6,
    vx: nx * THROW_SPEED_MPS,
    vy: ny * THROW_SPEED_MPS,
    vz: nz * THROW_SPEED_MPS,
    age: 0,
  });
  return true;
}

/**
 * Summary: Steps every Storm Fruit in flight, calms the first Royal Stag each one reaches, and
 *          drops the fruit that land or run out of time.
 * @param dt Frame time in seconds.
 * @param animals The live wildlife.
 * @returns The stags calmed and the number of fruit lost this step.
 */
export function stepStormFruitThrows(dt: number, animals: readonly ISmallAnimalState[]): IStormFruitStepResult {
  const calmed: ISmallAnimalState[] = [];
  let lost = 0;
  const step = Math.min(Math.max(dt, 0), 0.1);
  throws = throws.filter((f) => {
    f.age += step;
    f.vy -= GRAVITY_MPS2 * step;
    f.x += f.vx * step;
    f.y += f.vy * step;
    f.z += f.vz * step;

    const stag = findStagHit(f, animals);
    if (stag) {
      if (calmRoyalStag(stag)) calmed.push(stag);
      return false;
    }
    const ground = skyboundSurfaceAt(f.x, f.z, f.y + 0.5)?.y;
    const landed = ground !== undefined && f.age > 0.05 && f.y <= ground + 0.05;
    if (landed || f.age > MAX_FLIGHT_SEC) {
      lost += 1;
      return false;
    }
    return true;
  });
  return { calmed, lost };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Hits
function findStagHit(f: IStormFruitThrow, animals: readonly ISmallAnimalState[]): ISmallAnimalState | null {
  for (const a of animals) {
    if (a.species !== 'stag' || a.isDead || a.isTamed) continue;
    if (Math.hypot(f.x - a.x, f.z - a.z) > STAG_HIT_RADIUS_M) continue;
    if (Math.abs(f.y - (a.y + STAG_CHEST_M)) > STAG_HIT_HEIGHT_M) continue;
    return a as ISmallAnimalState;
  }
  return null;
}
// #endregion
