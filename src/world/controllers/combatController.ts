// ============================================================================
// MODULE: World / Controllers / Combat
// DESIGN: Combat: sword slash, sword strike feedback and the bow shot. Extracted from WorldCanvas (Phase 4). The canvas builds it once with the state it needs.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IObstacle } from '../domain/worldTypes';
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
import { WATER_LEVEL } from '../domain/landmarksRegistry';
import { NatureSoundEngine } from '../soundEngine';
import { createHudFeedbackState } from '../domain/hudFeedbackState';
import type { ITimeAndSeasonState } from '../domain/timeAndSeasonState';
import { createSimulationState } from '../domain/simulationState';
import { createLookInputState } from '../domain/lookInputState';
import { createActionInputState } from '../domain/actionInputState';
import { createRestAndRideState } from '../domain/restAndRideState';
import {
  INVENTORY_ITEMS,
  INVENTORY_ITEM_MAP,
  type InventoryItemId,
} from '../domain/worldTypes';
import {
  SAVED_GAME_SETTINGS,
  formatKeyCodeLabel,
  type IGameSettingsConfig,
} from '../../config/savedGameSettings';

// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: What this controller reads from the canvas. Every value is owned by the canvas and passed in once. */
export interface ICombatControllerContext {
  readonly activeArrows: import('../domain/worldTypes').IArrowProjectile[];
  readonly emitHudSnapshot: () => void;
  readonly hudFeedback: import('../domain/hudFeedbackState').IHudFeedbackState;
  readonly obstacles: import('../domain/worldTypes').IObstacleCylinder[];
  readonly playerState: import('../domain/worldTypes').IPlayerState;
  readonly gameSettingsRef: { current: IGameSettingsConfig };
  readonly soundEngine: import('../soundEngine').NatureSoundEngine;
}
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/** Summary: Builds the combat functions over the given context. */
export function createCombatController(ctx: ICombatControllerContext) {
  const {
    activeArrows,
    emitHudSnapshot,
    hudFeedback,
    obstacles,
    playerState,
    soundEngine,
    gameSettingsRef,
  } = ctx;

function handleSwordStrikeImpactFeedback(
    res: ReturnType<typeof triggerSwordSlash> | null
  ) {
    if (!res) return;
    if (res.hitAnimal) {
      const spName = getAnimalSpeciesName(res.hitAnimal.species);
      hudFeedback.hitAnimal = res.hitAnimal;
      hudFeedback.hitAnimalTimer = res.killedAnimal ? 1.8 : 6.0;
      hudFeedback.arrowHitTargetName = res.killedAnimal
        ? t('notifications.animal_hunted', { species: spName, key: formatKeyCodeLabel(gameSettingsRef.current.keybindings.interactDoor) })
        : t('notifications.animal_hit', { species: spName });
      hudFeedback.arrowHitTimer = res.killedAnimal ? 4.0 : 2.5;
      soundEngine.playArrowHit(true);
      emitHudSnapshot();
    } else if (res.hitTarget) {
      hudFeedback.arrowHitTargetName = res.hitTarget.name;
      hudFeedback.arrowHitTimer = 3.5;
      soundEngine.playArrowHit(true);
      emitHudSnapshot();
    } else if (res.hitAnySurface) {
      soundEngine.playSwordClash(false);
    }
  }

function executeSwordSlash(isHeavy = false, deferHitToStrikeWindow = true) {
    if (playerState.isSwimming) return null;
    const res = triggerSwordSlash(
      playerState,
      obstacles,
      isHeavy,
      deferHitToStrikeWindow
    );
    soundEngine.playSwordSwing(res.comboIndex, isHeavy);
    if (!deferHitToStrikeWindow) {
      handleSwordStrikeImpactFeedback(res);
    }
    return res;
  }

function fireArrowNow(powerOverride?: number) {
    if (playerState.isSwimming) return null;
    const currentDraw = playerState.bowDrawProgress ?? 0;
    if (powerOverride === undefined && currentDraw < MIN_BOW_DRAW_TO_SHOOT) {
      playerState.bowDrawn = false;
      playerState.bowDrawProgress = 0;
      return null;
    }
    const activeArrowItem = getArrowItemIdForKind(playerState.arrowKind ?? 'normal');
    const hasArrowInInventory = (playerState.ownedItemIds ?? []).includes(activeArrowItem);
    if (!hasArrowInInventory && gameSettingsRef.current.godMode === false) {
      playerState.bowDrawn = false;
      playerState.bowDrawProgress = 0;
      hudFeedback.lootNotification = 'No arrows left in inventory!';
      hudFeedback.lootNotificationTimer = 2.5;
      emitHudSnapshot();
      return null;
    }
    if (hasArrowInInventory) {
      consumeArrowFromInventory(playerState);
    }
    playerState.equippedTool = 'bow';
    const pwr =
      powerOverride !== undefined
        ? Math.max(MIN_BOW_DRAW_TO_SHOOT, Math.min(1.0, powerOverride))
        : Math.max(MIN_BOW_DRAW_TO_SHOOT, Math.min(1.0, currentDraw));
    const arrow = spawnArrowProjectile(playerState, pwr);
    activeArrows.push(arrow);
    if (activeArrows.length > 28) {
      activeArrows.shift();
    }
    playerState.arrowsShotCount += 1;
    playerState.bowDrawn = false;
    playerState.bowDrawProgress = 0;
    playerState.bowReleaseKick = 1.0;
    soundEngine.playArrowShoot(pwr);
    emitHudSnapshot();
    return arrow;
  }

  return { handleSwordStrikeImpactFeedback, executeSwordSlash, fireArrowNow };
}
// #endregion
