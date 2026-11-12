// ============================================================================
// MODULE: World / Controllers / Vehicles
// DESIGN: Vehicles: boarding and leaving a minecart. Extracted from WorldCanvas (Phase 4). The canvas builds it once with the state it needs.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IObstacle } from '../domain/worldTypes';
import { decodeRevealedMap, mapExplorationState } from '../domain/mapExploration';
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
  DWARVEN_RIDEABLE_MINECART_LINES,
  evaluateRideableMinecartPose,
  findNearestRideableMinecartStation,
  isInsideSouthernMine,
  setRideableMinecartVisualProgress,
  southernMineWalkableHeightAt,
  stepRideableMinecartPhysics,
} from '../systems/dwarvenMineAndCaravanSystem';
import {
  INVENTORY_ITEMS,
  INVENTORY_ITEM_MAP,
  type InventoryItemId,
} from '../domain/worldTypes';

// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: What this controller reads from the canvas. Every value is owned by the canvas and passed in once. */
export interface IVehicleControllerContext {
  readonly capturePreviousPlayerPose: () => void;
  readonly emitHudSnapshot: () => void;
  readonly hudFeedback: import('../domain/hudFeedbackState').IHudFeedbackState;
  readonly playerState: import('../domain/worldTypes').IPlayerState;
  readonly restState: import('../domain/restAndRideState').IRestAndRideState;
  readonly soundEngine: import('../soundEngine').NatureSoundEngine;
}
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/** Summary: Builds the vehicles functions over the given context. */
export function createVehicleController(ctx: IVehicleControllerContext) {
  const {
    capturePreviousPlayerPose,
    emitHudSnapshot,
    hudFeedback,
    playerState,
    restState,
    soundEngine,
  } = ctx;

function tryBoardOrExitMinecart(): boolean {
    if (restState.activeMinecartRide) {
      restState.activeMinecartRide = null;
      playerState.y = walkableHeightValueAt(playerState.x, playerState.z, playerState.y);
      capturePreviousPlayerPose();
      soundEngine.playFootstep('bridge', 1.05);
      emitHudSnapshot();
      return true;
    }
    const station = findNearestRideableMinecartStation(
      playerState.x,
      playerState.y,
      playerState.z,
      4.2
    );
    if (!station) return false;
    const line = DWARVEN_RIDEABLE_MINECART_LINES.find((l) => l.id === station.lineId);
    if (!line) return false;
    const startU = station.initialU;
    const pose = evaluateRideableMinecartPose(line.id, startU);
    const initialFacingSign: 1 | -1 = station.startAtEnd ? -1 : 1;
    restState.activeMinecartRide = {
      lineId: line.id,
      lineName: line.name,
      u: startU,
      velocity: 0,
      wheelAngle: 0,
      facingSign: initialFacingSign,
    };
    setRideableMinecartVisualProgress(line.id, startU, 0);
    playerState.x = pose.x;
    playerState.y = pose.y + 0.55;
    playerState.z = pose.z;
    playerState.yaw = station.startAtEnd ? pose.yaw : pose.yaw + Math.PI;
    playerState.pitch = -0.08;
    playerState.vx = 0;
    playerState.vy = 0;
    playerState.vz = 0;
    capturePreviousPlayerPose();
    hudFeedback.lootNotification = `Driving ${line.name} — [W/S] Drive Forward/Back · [E] Exit`;
    hudFeedback.lootNotificationTimer = 4.0;
    soundEngine.playFootstep('bridge', 1.2);
    emitHudSnapshot();
    return true;
  }

  return { tryBoardOrExitMinecart };
}
// #endregion
