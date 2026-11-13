// ============================================================================
// MODULE: World / Systems / Mine Lava Hazard
// DESIGN: One pure rule called from the survival vitals step, next to fall damage.
// SUMMARY: When the player sinks into the Dragon Forge lava pool, it costs a quarter of max
//          health (none in god mode) and returns the player to the forge entrance, so the
//          stepping-stone route can be retried. Does not draw effects or play sounds.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import type { IPlayerState } from '../domain/worldTypes';
import { ANCIENT_MINE_ORIGIN, MINE_LEVEL_Y } from '../domain/landmarks/ancientMine/ancientMineLayout';
import { sampleAncientMineFloor } from '../domain/landmarks/ancientMine/ancientMineFloor';
import { ANCIENT_MINE_LAVA_RESPAWN } from '../domain/landmarks/ancientMine/ancientMineWorld';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
/** Summary: Share of max health one fall into the lava costs. */
export const LAVA_DAMAGE_FRACTION = 0.25;

/** Summary: Feet this far above the lava surface still count as touching it, meters. */
const LAVA_CONTACT_MARGIN = 0.15;

/** Summary: How long the damage flash shows after a lava fall, seconds. */
const LAVA_FLASH_SECONDS = 1.2;

/** Summary: Facing after the return: toward the pool and the treasure (south, +z). */
const RESPAWN_YAW = Math.PI;
// #endregion

// ======================== PUBLIC HAZARD ======================== \\
// #region Apply Lava Hazard
/**
 * Summary: Applies lava contact for this step, if any.
 * Design: Cheap early-out on height before the floor query, since this runs every frame.
 * @param state Player state; moved, slowed and hurt on contact.
 * @param godMode When true, the player is returned without losing health.
 * @returns True when the player touched the lava this step.
 */
export function applyMineLavaHazard(state: IPlayerState, godMode: boolean): boolean {
  if (state.y > MINE_LEVEL_Y.lavaSurface + LAVA_CONTACT_MARGIN) return false;
  const sample = sampleAncientMineFloor(state.x - ANCIENT_MINE_ORIGIN.x, state.z - ANCIENT_MINE_ORIGIN.z, state.y);
  if (sample === null || sample.material !== 'lava') return false;

  if (!godMode) {
    const maxHp = state.maxHp ?? 100;
    state.hp = Math.max(0, (state.hp ?? maxHp) - maxHp * LAVA_DAMAGE_FRACTION);
  }
  state.damageFlashTimer = Math.max(state.damageFlashTimer ?? 0, LAVA_FLASH_SECONDS);
  state.x = ANCIENT_MINE_LAVA_RESPAWN.x;
  state.y = ANCIENT_MINE_LAVA_RESPAWN.y;
  state.z = ANCIENT_MINE_LAVA_RESPAWN.z;
  state.vx = 0;
  state.vy = 0;
  state.vz = 0;
  state.yaw = RESPAWN_YAW;
  state.lastLandingSpeed = 0;
  return true;
}
// #endregion
