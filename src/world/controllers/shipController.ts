// ============================================================================
// MODULE: World / Controllers / Ships
// DESIGN: Sailable ships: buying one at the shipwright and placing a mounted ship at a chosen ocean position. Extracted from WorldCanvas (Phase 4). The canvas builds it once with the state it needs.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IPlayerState } from '../domain/worldTypes';
import type { IHudFeedbackState } from '../domain/hudFeedbackState';
import type { NatureSoundEngine } from '../soundEngine';
import { getActiveWorldAnimals } from '../systems/boidsAndWildlifeSystem';
import {
  buyOrSpawnShipFromShipwright,
  getActiveSailableShip,
  setSailableShipTransform,
} from '../systems/sailableShipSystem';
import { isNavigableOceanForShip } from '../systems/terrainAndBiomeSystem';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: What this controller reads from the canvas. Every value is owned by the canvas and passed in once. */
export interface IShipControllerContext {
  readonly capturePreviousPlayerPose: () => void;
  readonly emitHudSnapshot: () => void;
  readonly hudFeedback: IHudFeedbackState;
  readonly playerState: IPlayerState;
  readonly rideableHorses: Parameters<typeof setSailableShipTransform>[3];
  readonly soundEngine: NatureSoundEngine;
}
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/** Summary: Builds the ship functions over the given context. */
export function createShipController(ctx: IShipControllerContext) {
  const {
    capturePreviousPlayerPose,
    emitHudSnapshot,
    hudFeedback,
    playerState,
    rideableHorses,
    soundEngine,
  } = ctx;

  /** Summary: Buys (or spawns) a ship at the shipwright and reports the result to the HUD. */
  function buyShip(tierId: string, godMode: boolean): { ok: boolean; message: string } {
    const res = buyOrSpawnShipFromShipwright(playerState, tierId, godMode);
    if (res.ok) {
      soundEngine.playFootstep('bridge', 1.2);
      hudFeedback.lootNotification = res.message;
      hudFeedback.lootNotificationTimer = 4.8;
    }
    emitHudSnapshot();
    return { ok: res.ok, message: res.message };
  }

  /**
   * Summary: When the player is mounted on a sailable ship, moves the ship and the player to the
   * given ocean position. Returns true when the ship handled the move; false when the player is not
   * on a ship (the caller then places the player on foot). A target that is not ocean drops the ship mount.
   */
  function placeMountedShipAt(worldX: number, worldZ: number): boolean {
    if (!playerState.mountedHorseId?.startsWith('sailable-ship')) return false;
    if (!isNavigableOceanForShip(worldX, worldZ)) {
      playerState.mountedHorseId = null;
      return false;
    }
    setSailableShipTransform(worldX, worldZ, undefined, rideableHorses, getActiveWorldAnimals());
    const ship = getActiveSailableShip();
    const cosY = Math.cos(ship.yaw);
    const sinY = Math.sin(ship.yaw);
    const helmOffsetZ = 3.6;
    playerState.x = ship.x - sinY * helmOffsetZ;
    playerState.z = ship.z + cosY * helmOffsetZ;
    playerState.y = ship.deckY + 0.35;
    playerState.vx = 0;
    playerState.vy = 0;
    playerState.vz = 0;
    capturePreviousPlayerPose();
    emitHudSnapshot();
    return true;
  }

  return { buyShip, placeMountedShipAt };
}
// #endregion
