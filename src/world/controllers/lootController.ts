// ============================================================================
// MODULE: World / Controllers / Loot
// DESIGN: Looting dead animals and dwarves: taking items from animal corpse chests and looting the nearest dead creature. Extracted from WorldCanvas (Phase 4). The canvas builds it once with the state it needs.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IArrowProjectile, IPlayerState, InventoryItemId } from '../domain/worldTypes';
import type { IHudFeedbackState } from '../domain/hudFeedbackState';
import type { NatureSoundEngine } from '../soundEngine';
import {
  findNearestDeadLootableAnimal,
  getActiveWorldAnimals,
  getOrInitAnimalCorpseLoot,
  lootDeadAnimal,
} from '../systems/boidsAndWildlifeSystem';
import {
  findNearestDeadLootableDwarf,
  getActiveDwarvenMiners,
  lootDeadDwarf,
} from '../builders/dwarvenKingdomBuilder';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: What this controller reads from the canvas. Every value is owned by the canvas and passed in once. */
export interface ILootControllerContext {
  readonly activeArrows: IArrowProjectile[];
  readonly emitHudSnapshot: () => void;
  readonly hudFeedback: IHudFeedbackState;
  readonly playerState: IPlayerState;
  readonly soundEngine: NatureSoundEngine;
}
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/** Summary: Builds the loot functions over the given context. */
export function createLootController(ctx: ILootControllerContext) {
  const {
    activeArrows,
    emitHudSnapshot,
    hudFeedback,
    playerState,
    soundEngine,
  } = ctx;

  /** Summary: Takes up to `quantity` of one item from an animal corpse chest (chestId "corpse-animal-<id>"). */
  function takeFromAnimalCorpse(chestId: string, itemId: InventoryItemId, quantity: number): void {
    const animId = Number(chestId.replace('corpse-animal-', ''));
    const anim = getActiveWorldAnimals().find((a) => a.id === animId);
    if (anim && anim.isDead && !anim.isLooted) {
      const lootList = getOrInitAnimalCorpseLoot(anim, activeArrows);
      if (!playerState.ownedItemIds) playerState.ownedItemIds = [];
      if (!playerState.favoriteIds) playerState.favoriteIds = [];
      const maxTake = Math.max(1, Math.floor(quantity || 1));
      for (let i = 0; i < maxTake; i++) {
        const idx = lootList.indexOf(itemId);
        if (idx === -1) break;
        lootList.splice(idx, 1);
        playerState.ownedItemIds.push(itemId);
        if (!playerState.favoriteIds.includes(itemId)) {
          playerState.favoriteIds.push(itemId);
        }
      }
      if (lootList.length === 0) {
        anim.isLooted = true;
      }
      soundEngine.playFootstep('trail', 1.15);
      emitHudSnapshot();
    }
  }

  /** Summary: Takes everything from an animal corpse chest. Returns how many items were taken (0 if none). */
  function takeAllFromAnimalCorpse(chestId: string): number {
    const animId = Number(chestId.replace('corpse-animal-', ''));
    const anim = getActiveWorldAnimals().find((a) => a.id === animId);
    if (anim && anim.isDead && !anim.isLooted) {
      const lootList = getOrInitAnimalCorpseLoot(anim, activeArrows);
      const takenCount = lootList.length;
      if (!playerState.ownedItemIds) playerState.ownedItemIds = [];
      if (!playerState.favoriteIds) playerState.favoriteIds = [];
      for (const itemId of lootList) {
        playerState.ownedItemIds.push(itemId);
        if (!playerState.favoriteIds.includes(itemId)) {
          playerState.favoriteIds.push(itemId);
        }
      }
      lootList.length = 0;
      anim.isLooted = true;
      if (takenCount > 0) {
        soundEngine.playFootstep('trail', 1.18);
      }
      emitHudSnapshot();
      return takenCount;
    }
    return 0;
  }

  /** Summary: Loots the nearest dead animal, or else the nearest dead dwarf in reach. Reports the result to the HUD. */
  function lootNearestDeadCreature() {
    const dead = findNearestDeadLootableAnimal(playerState.x, playerState.z);
    if (!dead) {
      const deadDwarf = findNearestDeadLootableDwarf(
        playerState.x,
        playerState.z,
        3.4,
        playerState.isFlying ? playerState.y : undefined
      );
      if (deadDwarf) {
        const dwRes = lootDeadDwarf(playerState, deadDwarf, activeArrows);
        if (dwRes.looted && dwRes.notification) {
          hudFeedback.lootNotification = dwRes.notification;
          hudFeedback.lootNotificationTimer = 4.5;
          soundEngine.playFootstep('trail', 1.15);
          emitHudSnapshot();
        }
        return {
          looted: dwRes.looted,
          recoveredArrowCount: dwRes.recoveredArrows,
          notification: dwRes.notification,
        };
      }
      return { looted: false, notification: null };
    }
    const res = lootDeadAnimal(playerState, dead, activeArrows);
    if (res.addedItems.length > 0 && res.notification) {
      hudFeedback.lootNotification = res.notification;
      hudFeedback.lootNotificationTimer = 4.5;
      soundEngine.playFootstep('trail', 1.15);
      emitHudSnapshot();
    }
    return {
      looted: res.addedItems.length > 0,
      recoveredArrowCount: res.recoveredArrowCount,
      notification: res.notification,
    };
  }

  return { takeFromAnimalCorpse, takeAllFromAnimalCorpse, lootNearestDeadCreature };
}
// #endregion
