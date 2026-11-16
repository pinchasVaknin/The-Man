// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Same shape as tree felling: a melee swing looks for the best deposit in reach and in
//         the aim cone. A pickaxe chips it; the third chip mines it out, gives its gems and
//         starts a regrow timer. Any other weapon only produces a hint. The caller (the combat
//         system) puts the gems into the inventory, so this module never touches the player.
// SUMMARY: Crystal deposit runtime state, the strike rule, regrowth, and the gem yield.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { CRYSTAL_DEPOSITS, type ICrystalDepositDef } from './crystalIslesLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Live state of one deposit. */
export interface ICrystalDepositRuntime {
  readonly def: ICrystalDepositDef;
  /** Pickaxe strikes taken since it last regrew. */
  chips: number;
  /** Seconds until it has regrown; 0 = ready to mine. */
  regrowSec: number;
}

/** Summary: What one swing near a deposit did. */
export interface ICrystalStrikeResult {
  /** A deposit was in reach and in front of the player. */
  readonly hit: boolean;
  /** This strike mined the deposit out. */
  readonly mined: boolean;
  /** The swing was not with a pickaxe. */
  readonly needsPickaxe: boolean;
  readonly depositId: string | null;
  /** Gems to add to the inventory (empty unless `mined`). */
  readonly gems: readonly string[];
}
// #endregion

// #region Tuning
/** Pickaxe strikes needed to mine a deposit out. */
export const CRYSTAL_CHIPS_TO_MINE = 3;
/** Seconds a mined-out deposit takes to grow back. */
export const CRYSTAL_REGROW_SEC = 300;
/** Weapons that can mine. */
export const MINING_TOOL_IDS: readonly string[] = ['dwarven_pickaxe', 'mithril_pickaxe'];
/** Reach (m) from the deposit's surface, matching the axe's tree reach. */
const STRIKE_REACH_M = 3.9;
const HEAVY_STRIKE_REACH_M = 4.4;
/** Deposits more than this far (m) off the feet height cannot be struck. */
const HEIGHT_TOLERANCE_M = 2.0;
/** Minimum cosine between the aim and the deposit direction (beyond point-blank range). */
const AIM_MIN_DOT = 0.25;
// #endregion

// ======================== MODULE STATE ======================== \\
// #region State
let deposits: ICrystalDepositRuntime[] = CRYSTAL_DEPOSITS.map((def) => ({ def, chips: 0, regrowSec: 0 }));
// #endregion

// ======================== PUBLIC API ======================== \\
// #region State Access
/** Summary: Live state of every deposit, in `CRYSTAL_DEPOSITS` order. */
export function getCrystalDeposits(): ReadonlyArray<ICrystalDepositRuntime> {
  return deposits;
}

/** Summary: Regrows every deposit at once (new world, tests). */
export function resetCrystalDeposits(): void {
  deposits = CRYSTAL_DEPOSITS.map((def) => ({ def, chips: 0, regrowSec: 0 }));
}

/**
 * Summary: Counts down regrowth.
 * @param dt Frame time in seconds.
 */
export function stepCrystalDeposits(dt: number): void {
  for (const d of deposits) {
    if (d.regrowSec > 0) d.regrowSec = Math.max(0, d.regrowSec - dt);
  }
}
// #endregion

// #region Striking
/**
 * Summary: Resolves one melee swing against the crystal deposits.
 * @param x Player feet X.
 * @param y Player feet Y.
 * @param z Player feet Z.
 * @param yaw Player yaw (forward is (-sin yaw, -cos yaw)).
 * @param weaponId The active weapon's item id.
 * @param isHeavy Heavy swings reach a little further.
 * @returns What the swing did; `hit` is false when no ready deposit was in reach.
 */
export function strikeCrystalDeposit(x: number, y: number, z: number, yaw: number, weaponId: string | undefined, isHeavy: boolean): ICrystalStrikeResult {
  const target = findStrikeTarget(x, y, z, yaw, isHeavy ? HEAVY_STRIKE_REACH_M : STRIKE_REACH_M);
  if (!target) return { hit: false, mined: false, needsPickaxe: false, depositId: null, gems: [] };
  if (!weaponId || !MINING_TOOL_IDS.includes(weaponId)) {
    return { hit: true, mined: false, needsPickaxe: true, depositId: target.def.id, gems: [] };
  }
  target.chips += 1;
  if (target.chips < CRYSTAL_CHIPS_TO_MINE) {
    return { hit: true, mined: false, needsPickaxe: false, depositId: target.def.id, gems: [] };
  }
  target.chips = 0;
  target.regrowSec = CRYSTAL_REGROW_SEC;
  return { hit: true, mined: true, needsPickaxe: false, depositId: target.def.id, gems: [...target.def.yield] };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Targeting
function findStrikeTarget(x: number, y: number, z: number, yaw: number, reach: number): ICrystalDepositRuntime | null {
  const fwdX = -Math.sin(yaw);
  const fwdZ = -Math.cos(yaw);
  let best: ICrystalDepositRuntime | null = null;
  let bestScore = Infinity;
  for (const d of deposits) {
    if (d.regrowSec > 0 || Math.abs(y - d.def.y) > HEIGHT_TOLERANCE_M) continue;
    const dx = d.def.x - x;
    const dz = d.def.z - z;
    const centreDist = Math.hypot(dx, dz);
    const surfaceDist = Math.max(0, centreDist - d.def.radius);
    if (surfaceDist > reach) continue;
    const dot = centreDist > 0.001 ? (dx * fwdX + dz * fwdZ) / centreDist : 1;
    if (centreDist > 1.35 && dot < AIM_MIN_DOT) continue;
    const score = surfaceDist - dot * 1.15;
    if (score < bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}
// #endregion
