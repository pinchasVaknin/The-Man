// ============================================================================
// MODULE: World / Controllers / Inventory and traps
// DESIGN: Inventory and traps: placing a held trap, deploying one from inventory, and taking one back. Extracted from WorldCanvas (Phase 4). The canvas builds it once with the state it needs.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IObstacle } from '../domain/worldTypes';
import { restoreFelledTrees, type ISavedFelledTree } from '../systems/treeFellingSystem';
import { decodeRevealedMap, mapExplorationState } from '../domain/mapExploration';
import { t } from '../../locales';
import {
  WeatherKind,
  WeatherCycleMode,
  WeatherToggleOption,
  SeasonType,
  IWeatherStateSnapshot,
  ArrowElementKind,
  IArrowProjectile,
  DEFAULT_WEATHER_CYCLE_MODE,
  MIN_BOW_DRAW_TO_SHOOT,
  createInitialPlayerState,
  applyGameModeToPlayerState,
  equipInventoryItem,
  assignHotbarSlot,
  toggleFavoriteItem,
  createInitialRideableHorses,
  stepPlayerPhysics,
  stepSurvivalVitals,
  awardSkillXp,
  spawnArrowProjectile,
  stepArrowsPhysics,
  computeWeatherState,
  groundHeightAt,
  walkableHeightValueAt,
  getWaterSurfaceHeightAt,
  isPositionUnderRoof,
  findNearestFortressDoor,
  findNearestBed,
  findNearestWorldChest,
  resolveBestLookedAtInteraction,
  findLookedAtWatchtowerLadder,
  findNearestDeadLootableAnimal,
  lootDeadAnimal,
  takeItemFromWorldChest,
  storeItemInWorldChest,
  takeAllFromWorldChest,
  storeAllUnequippedInWorldChest,
  getAnimalSpeciesName,
  getActiveWorldAnimals,
  ensureSafeOffscreenAnimalSpawns,
  isPredatorSpecies,
  triggerSwordSlash,
  stepSwordSwingCombat,
  recoverArrowsFromAnimal,
  consumeArrowFromInventory,
  getArrowItemIdForKind,
  checkAndRestockMerchants,
  buyMarketItem,
  sellMarketItem,
  isNavigableOceanForShip,
  setSailableShipTransform,
  getActiveSailableShip,
  configureSailableShipsForGameMode,
  buyOrSpawnShipFromShipwright,
  IGameActions,
  GameWorldMode,
  saveWorldSnapshot,
  loadWorldSnapshot,
  clearWorldSave,
  captureCurrentWorldSnapshot,
  applyWorldSnapshotToLiveSystems,
  getDefaultWorldBaseline,
  resetLiveWorldToFreshBaseline,
  cancelBowDraw,
  findNearestFallenTree,
  harvestFallenTree,
  resetTreeFellingSystem,
  stepTreeFellingSystem,
  getTreeDisplayName,
} from '../terrainMath';
import type {
  GameStateMode,
  ITelemetrySnapshot,
  IVirtualMoveState,
} from '../domain/gameShellTypes';
import type { IPlayerState } from '../domain/worldTypes';
import {
  getAnimalStrengthAndLevel,
  getActiveWorldBirds,
  getOrInitAnimalCorpseLoot,
  resetActiveWorldBirds,
  type ISmallAnimalState,
} from '../systems/boidsAndWildlifeSystem';
import { WATER_LEVEL } from '../domain/landmarksRegistry';
import { NatureSoundEngine } from '../soundEngine';
import { createHudFeedbackState } from '../domain/hudFeedbackState';
import type { ITimeAndSeasonState } from '../domain/timeAndSeasonState';
import { createSimulationState } from '../domain/simulationState';
import { createLookInputState } from '../domain/lookInputState';
import { createActionInputState } from '../domain/actionInputState';
import { createRestAndRideState } from '../domain/restAndRideState';
import {
  DWARVEN_RIDEABLE_MINECART_LINES,
  evaluateRideableMinecartPose,
  findNearestRideableMinecartStation,
  isInsideSouthernMine,
  setRideableMinecartVisualProgress,
  southernMineWalkableHeightAt,
  stepRideableMinecartPhysics,
} from '../systems/dwarvenMineAndCaravanSystem';
import {
  type IPlacedTrap,
  type IWorkbenchStash,
  DEFAULT_TRAP_WORKBENCH_STASH,
  TRAP_RECIPES,
  computeTrapPlacementPreview,
  placeTrapOnGround,
  craftTrapAtWorkbench,
  tickPlacedAnimalTraps,
  findNearestPlacedTrap,
  harvestPlacedTrap,
  pickupPlacedTrap,
} from '../systems/animalTrapsSystem';
import {
  INVENTORY_ITEMS,
  INVENTORY_ITEM_MAP,
  type InventoryItemId,
} from '../domain/worldTypes';
import {
  computeTargetFov,
  createCameraPose,
  createCameraRigState,
  easeFovToward,
  stepCameraRig,
  writeTitleOrbitPose,
  type ICameraPose,
} from '../systems/cameraRigSystem';
import {
  advanceSleepClock,
  advanceWorldClock,
  isSleepingAllowedAt,
  PLAY_CLOCK_HOURS_PER_SECOND,
  TITLE_CLOCK_HOURS_PER_SECOND,
} from '../systems/worldClockSystem';
import { stepBowFeel, stepMeleeFeelAndSway } from '../systems/weaponFeelSystem';

// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: What this controller reads from the canvas. Every value is owned by the canvas and passed in once. */
export interface ITrapControllerContext {
  readonly actionState: import("C:/Users/pinch/Documents/MyCode/projects/TheMan/src/world/domain/actionInputState").IActionInputState;
  readonly emitHudSnapshot: () => void;
  readonly hudFeedback: import("C:/Users/pinch/Documents/MyCode/projects/TheMan/src/world/domain/hudFeedbackState").IHudFeedbackState;
  readonly playerState: import("C:/Users/pinch/Documents/MyCode/projects/TheMan/src/world/domain/worldTypes").IPlayerState;
  readonly soundEngine: import("C:/Users/pinch/Documents/MyCode/projects/TheMan/src/world/soundEngine").NatureSoundEngine;
  readonly worldPlacedTraps: import("C:/Users/pinch/Documents/MyCode/projects/TheMan/src/world/systems/animalTrapsSystem").IPlacedTrap[];
}
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/** Summary: Builds the inventory and traps functions over the given context. */
export function createTrapController(ctx: ITrapControllerContext) {
  const {
    actionState,
    emitHudSnapshot,
    hudFeedback,
    playerState,
    soundEngine,
    worldPlacedTraps,
  } = ctx;

const placeHeldTrapAtPreview = (): boolean => {
    const heldTrap = playerState.heldTrapItemId;
    if (!heldTrap) return false;
    const owned = playerState.ownedItemIds ?? [];
    if (!owned.includes(heldTrap)) {
      playerState.heldTrapItemId = null;
      emitHudSnapshot();
      return false;
    }
    const res = placeTrapOnGround(
      worldPlacedTraps,
      heldTrap,
      playerState.x,
      playerState.y,
      playerState.z,
      playerState.yaw,
      (gx: number, gz: number) => walkableHeightValueAt(gx, gz),
      WATER_LEVEL,
      playerState.pitch
    );
    if (!res.success || !res.placedTrap) {
      if (res.error) {
        hudFeedback.lootNotification = res.error;
        hudFeedback.lootNotificationTimer = 3.5;
        soundEngine.playSwordClash(false);
        emitHudSnapshot();
      }
      return true;
    }
    worldPlacedTraps.push(res.placedTrap);
    const itemIdx = owned.indexOf(heldTrap);
    if (itemIdx !== -1) {
      owned.splice(itemIdx, 1);
    }
    const remainingSame = owned.filter((id) => id === heldTrap).length;
    if (remainingSame <= 0) {
      playerState.heldTrapItemId = null;
    }
    const trapName = INVENTORY_ITEM_MAP.get(heldTrap)?.name ?? 'Trap';
    hudFeedback.lootNotification =
      remainingSame > 0
        ? `Placed ${trapName}! (${remainingSame} left in hands — Left-Click to place another)`
        : `Placed ${trapName}! Wildlife will notice the bait after a short time.`;
    hudFeedback.lootNotificationTimer = 4.0;
    soundEngine.playFootstep('cabin', 0.95);
    emitHudSnapshot();
    return true;
  };

const deployTrapFromInventory = (
    specificTrapItem?: InventoryItemId,
    forceHoldInHands = false
  ) => {
    const owned = playerState.ownedItemIds ?? [];
    const trapOrder: InventoryItemId[] = [
      'trap_cage_small',
      'trap_snare',
      'trap_bear_jaw',
      'trap_net',
      'trap_fish',
    ];
    const trapToHold =
      specificTrapItem && owned.includes(specificTrapItem)
        ? specificTrapItem
        : trapOrder.find((id) => owned.includes(id));
    if (!trapToHold) {
      playerState.heldTrapItemId = null;
      hudFeedback.lootNotification =
        "No traps in your inventory. Craft traps at the Trapper's Workbench in the Hunter's Cabin!";
      hudFeedback.lootNotificationTimer = 3.5;
      emitHudSnapshot();
      return;
    }

    const win = window as unknown as {
      openInventoryModal?: (open?: boolean, cat?: string) => void;
    };
    const wasModalOpen = document.body.dataset.skyrimModalOpen === 'true';
    if (wasModalOpen) {
      win.openInventoryModal?.(false);
    }

    // If already holding this trap outdoors (and not just selecting from Inventory), pressing [T] places it immediately
    if (
      !forceHoldInHands &&
      !wasModalOpen &&
      playerState.heldTrapItemId === trapToHold
    ) {
      placeHeldTrapAtPreview();
      return;
    }

    cancelBowDraw(playerState);
    actionState.isMouseBowHeld = false;
    playerState.heldTrapItemId = trapToHold;
    const trapName = INVENTORY_ITEM_MAP.get(trapToHold)?.name ?? 'Trap';
    const count = owned.filter((id) => id === trapToHold).length;
    hudFeedback.lootNotification = `Holding ${trapName} (x${count}) — Aim at ground (Green = Valid, Red = Invalid) and Left-Click to place!`;
    hudFeedback.lootNotificationTimer = 4.2;
    soundEngine.playFootstep('trail', 1.12);
    emitHudSnapshot();
  };

const harvestOrPickupNearbyTrap = (): boolean => {
    const nearTrap = findNearestPlacedTrap(
      playerState.x,
      playerState.y,
      playerState.z,
      worldPlacedTraps,
      3.5
    );
    if (!nearTrap) return false;
    if (!playerState.ownedItemIds) playerState.ownedItemIds = [];
    const isSprung = nearTrap.status === 'sprung' || Boolean(nearTrap.sprung);
    if (isSprung) {
      const harvestRes = harvestPlacedTrap(nearTrap, playerState.ownedItemIds);
      awardSkillXp(playerState, 'archery', harvestRes.xpGained);
      hudFeedback.lootNotification = harvestRes.notification;
      hudFeedback.lootNotificationTimer = 4.5;
      soundEngine.playFootstep('bridge', 1.2);
      const idx = worldPlacedTraps.findIndex((t) => t.id === nearTrap.id);
      if (idx !== -1) worldPlacedTraps.splice(idx, 1);
      emitHudSnapshot();
      return true;
    }
    const pickupRes = pickupPlacedTrap(nearTrap, playerState.ownedItemIds);
    const trapName = INVENTORY_ITEM_MAP.get(pickupRes.returnedTrapItem)?.name ?? 'Trap';
    hudFeedback.lootNotification = `Picked up ${trapName} and returned it to your inventory.`;
    hudFeedback.lootNotificationTimer = 3.0;
    soundEngine.playFootstep('bridge', 0.9);
    const idx = worldPlacedTraps.findIndex((t) => t.id === nearTrap.id);
    if (idx !== -1) worldPlacedTraps.splice(idx, 1);
    emitHudSnapshot();
    return true;
  };

  return { placeHeldTrapAtPreview, deployTrapFromInventory, harvestOrPickupNearbyTrap };
}
// #endregion
