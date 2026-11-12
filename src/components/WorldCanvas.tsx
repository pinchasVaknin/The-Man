// ============================================================================
// MODULE: Components / World Canvas
// DESIGN: Humble UI host for WebGL rendering, pointer lock, and physics tick (SRP)
// SUMMARY: Initializes Three.js renderer, camera, solar atmosphere, dynamic weather,
//          input event listeners, audio integration, and animation loop.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import type { IObstacle } from '../world/domain/worldTypes';
import { restoreFelledTrees, type ISavedFelledTree } from '../world/systems/treeFellingSystem';
import { setPendingDeadDwarfIds } from '../world/builders/dwarvenKingdomBuilder';
import { decodeRevealedMap, mapExplorationState } from '../world/domain/mapExploration';
import { t } from '../locales';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PerfStats } from '../core/perfStats';
import { SOLID_BUILDING_BOXES } from '../world/terrainMath';
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
} from '../world/terrainMath';
import { useAppServices } from '../app/AppServicesContext';
import type {
  GameStateMode,
  ITelemetrySnapshot,
  IVirtualMoveState,
} from '../world/domain/gameShellTypes';
import { GameLoop } from '../core/gameLoop';
import { lerp, lerpAngle } from '../core/interpolation';
import type { IWildlifeSoundCallbacks } from '../world/builders/wildlifeAndFootprintsBuilder';
import type { IPlayerState } from '../world/domain/worldTypes';
import {
  getAnimalStrengthAndLevel,
  getActiveWorldBirds,
  getOrInitAnimalCorpseLoot,
  resetActiveWorldBirds,
  type ISmallAnimalState,
} from '../world/systems/boidsAndWildlifeSystem';
import { WATER_LEVEL } from '../world/domain/landmarksRegistry';
import { parseAndValidateUrlOverrides } from '../core/config';
import { createWorldScene } from '../world/builders/worldSceneBuilder';
import { NatureSoundEngine } from '../world/soundEngine';
import { applyDynamicAtmosphereToScene } from '../world/controllers/atmosphereRenderController';
import { isPlayerUnderground, setCameraUndergroundMask } from '../world/controllers/undergroundCulling';
import { createPlacedTrapSync } from '../world/controllers/placedTrapSync';
import { createPerfDebugTools } from '../world/controllers/perfDebugTools';
import { createHudFeedbackState } from '../world/domain/hudFeedbackState';
import type { ITimeAndSeasonState } from '../world/domain/timeAndSeasonState';
import { createSimulationState } from '../world/domain/simulationState';
import { createLookInputState } from '../world/domain/lookInputState';
import { createActionInputState } from '../world/domain/actionInputState';
import { createRestAndRideState } from '../world/domain/restAndRideState';
import { buildHudTelemetryInput } from '../world/controllers/hudEmitter';
import { attachInputListeners } from '../world/controllers/inputController';
import { createSimulationStep } from '../world/controllers/simulationStep';
import { createRenderFrame } from '../world/controllers/renderFrame';
import { createWorldSaveController } from '../world/controllers/worldSaveController';
import { registerWindowDebugBridge } from '../world/controllers/windowDebugController';
import {
  createAnimationFrameScheduler,
  createGpuFencePacedScheduler,
} from '../world/controllers/frameSchedulers';
import { buildTelemetrySnapshot } from '../world/controllers/hudTelemetryBuilder';
import {
  findActiveCombatDwarf,
  findNearestDeadLootableDwarf,
  getActiveDwarvenMiners,
  getOrInitDwarfCorpseLoot,
  lootDeadDwarf,
} from '../world/builders/dwarvenKingdomBuilder';
import {
  DWARVEN_RIDEABLE_MINECART_LINES,
  evaluateRideableMinecartPose,
  findNearestRideableMinecartStation,
  isInsideSouthernMine,
  setRideableMinecartVisualProgress,
  southernMineWalkableHeightAt,
  stepRideableMinecartPhysics,
} from '../world/systems/dwarvenMineAndCaravanSystem';
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
} from '../world/systems/animalTrapsSystem';
import {
  buildTrapPlacementPreviewGhost,
  type ITrapPlacementPreviewGhost,
} from '../world/models/placedTrapModels';
import {
  INVENTORY_ITEMS,
  INVENTORY_ITEM_MAP,
  type InventoryItemId,
} from '../world/domain/worldTypes';
import {
  computeTargetFov,
  createCameraPose,
  createCameraRigState,
  easeFovToward,
  stepCameraRig,
  writeTitleOrbitPose,
  type ICameraPose,
} from '../world/systems/cameraRigSystem';
import {
  advanceSleepClock,
  advanceWorldClock,
  isSleepingAllowedAt,
  PLAY_CLOCK_HOURS_PER_SECOND,
  TITLE_CLOCK_HOURS_PER_SECOND,
} from '../world/systems/worldClockSystem';
import { stepBowFeel, stepMeleeFeelAndSway } from '../world/systems/weaponFeelSystem';
import { readMovementAxes, type IMovementAxes } from '../world/controllers/movementIntent';
import { isBindingHeld, matchesKeyBinding } from '../config/keyBindingMatch';
import {
  SAVED_GAME_SETTINGS,
  formatKeyCodeLabel,
  type IGameSettingsConfig,
} from '../config/savedGameSettings';

/**
 * Summary: Props contract for top-level WorldCanvas Three.js viewport.
 * Design: Injects UI callbacks and sound engine factories for isolated testing and rendering.
 */
export interface IWorldCanvasProps {
  gameState: GameStateMode;
  muted: boolean;
  weatherToggle: WeatherToggleOption;
  gameSettings?: IGameSettingsConfig;
  onTelemetryUpdate: (snapshot: ITelemetrySnapshot) => void;
  onRequestPauseToggle: () => void;
  virtualMoveRef: React.MutableRefObject<IVirtualMoveState>;
  onRegisterGameActions?: (actions: IGameActions | null) => void;
  readonly soundEngineFactory?: () => NatureSoundEngine;
}
// #endregion

// ======================== WORLD CANVAS COMPONENT ======================== \\
// #region World Canvas Component
// Reusable scratch vectors outside render loop (Zero GC)
/**
 * Consecutive failed frames (about 1 s at 60 FPS) after which the frame loop stops and the
 * error is handed to the error boundary instead of failing silently every frame.
 */
const MAX_CONSECUTIVE_TICK_FAILURES = 60;
/** Longest frame delta accepted per rendered frame (seconds, per "Fix Your Timestep"). */
const MAX_FRAME_SECONDS = 0.05;
/** Fixed simulation step: 60 Hz. */
const SIMULATION_STEP_SECONDS = 1 / 60;
const _sunVec = new THREE.Vector3();
/** Steps allowed per rendered frame; capped at 2 to prevent spiral-of-death stutter when flying. */
const MAX_SIMULATION_STEPS_PER_FRAME = 2;
/** Minimum gap between two logged frame errors (ms). */
const TICK_ERROR_LOG_INTERVAL_MS = 2000;

/** World clock hour the session starts at when no ?hour= override is given (06:40, sunrise mist). */
const DEFAULT_START_WORLD_HOUR = 6.68;

export const WorldCanvas = React.memo<IWorldCanvasProps>(({
  gameState,
  muted,
  weatherToggle,
  gameSettings = SAVED_GAME_SETTINGS,
  onTelemetryUpdate,
  onRequestPauseToggle,
  virtualMoveRef,
  onRegisterGameActions,
  soundEngineFactory,
}) => {
  const appServices = useAppServices();
  const { logger } = appServices;
  const createSoundEngine = soundEngineFactory ?? appServices.createSoundEngine;
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [fatalTickError, setFatalTickError] = useState<Error | null>(null);
  // Current world-build stage while the world is loading (null when ready).
  const [loadingStage, setLoadingStage] = useState<string | null>(null);

  const gameStateRef = useRef<GameStateMode>(gameState);
  const mutedRef = useRef<boolean>(muted);
  const weatherToggleRef = useRef<WeatherToggleOption>(weatherToggle);
  const gameSettingsRef = useRef<IGameSettingsConfig>(gameSettings);
  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  const onRequestPauseToggleRef = useRef(onRequestPauseToggle);

  useEffect(() => {
    gameStateRef.current = gameState;
    if (gameState !== 'playing' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, [gameState]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    weatherToggleRef.current = weatherToggle;
  }, [weatherToggle]);

  useEffect(() => {
    gameSettingsRef.current = gameSettings;
  }, [gameSettings]);

  useEffect(() => {
    onTelemetryUpdateRef.current = onTelemetryUpdate;
    onRequestPauseToggleRef.current = onRequestPauseToggle;
  }, [onTelemetryUpdate, onRequestPauseToggle]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    let cancelled = false;
    let teardown: (() => void) | undefined;
    const startWorld = async (): Promise<void> => {
    const worldScene = await createWorldScene(container, logger, (stage) => setLoadingStage(stage));
    if (cancelled) return;
    setLoadingStage(null);
    const {
      isSoftwareGl,
      renderer,
      scene,
      fog,
      bgColor,
      camera,
      sky,
      sunDiscMesh,
      sunDiscMat,
      sunLight,
      hemiLight,
      obstacles,
      worldHandles,
    } = worldScene;

    // 7. Player State, Rideable Horses, Active Arrows & Input Tracking
    const initialSurvivalMode = gameSettingsRef.current.godMode === false;
    const playerState = createInitialPlayerState({
      survivalMode: initialSurvivalMode,
    });
    configureSailableShipsForGameMode(initialSurvivalMode);
    playerState.cameraPerspective = gameSettingsRef.current.defaultCameraPerspective;
    const rideableHorses = createInitialRideableHorses();
    const activeArrows: IArrowProjectile[] = [];
    // HUD feedback after hits and loot (world/domain/hudFeedbackState).
    const hudFeedback = createHudFeedbackState();

    // Animal Trapping & Workbench Stash
    const worldPlacedTraps: IPlacedTrap[] = [];
    const worldTrapsGroup = new THREE.Group();
    worldTrapsGroup.name = 'world-placed-traps';
    scene.add(worldTrapsGroup);
    const placedTrapSync = createPlacedTrapSync(worldTrapsGroup);
    const workbenchStash: IWorkbenchStash = {
      materials: { ...DEFAULT_TRAP_WORKBENCH_STASH },
    };

    const trapGhost: { current: ITrapPlacementPreviewGhost | null } = { current: null };

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

    // Time, season and weather state (world/domain/timeAndSeasonState).
    const timeState: ITimeAndSeasonState = {
      worldHours: DEFAULT_START_WORLD_HOUR,
      seasonTimeOffset: 180.0,
      inGameHoursElapsed: 0,
      forcedSeason: 'auto',
      activeWeatherMode: DEFAULT_WEATHER_CYCLE_MODE,
      urlForcedWeatherKind: null,
    };
    // Start in Summer by default (SEASON_DURATION_SECONDS = 180.0, index 1 = 'summer').
    // Each season lasts 5 full in-game days (120 in-game hours -> 1.5 seasonal units per in-game hour).
    const SEASON_UNITS_PER_INGAME_HOUR = 180.0 / (5 * 24);
    const getSeasonClockSeconds = () =>
      timeState.seasonTimeOffset + timeState.inGameHoursElapsed * SEASON_UNITS_PER_INGAME_HOUR;
    let urlWorldHour: number | null = null;

    // Optional URL parameters validated via centralized core/config
    if (typeof window !== 'undefined') {
      const overrides = parseAndValidateUrlOverrides(window.location.search);
      if (overrides.position) {
        playerState.x = overrides.position.x;
        playerState.z = overrides.position.z;
        playerState.y =
          overrides.position.y !== undefined
            ? overrides.position.y
            : walkableHeightValueAt(overrides.position.x, overrides.position.z);
        if (overrides.position.yaw !== undefined) {
          playerState.yaw = overrides.position.yaw;
        }
        if (overrides.position.pitch !== undefined) {
          playerState.pitch = overrides.position.pitch;
        }
        // Animals were placed for the default spawn; keep them out of sight of the custom start.
        ensureSafeOffscreenAnimalSpawns(getActiveWorldAnimals(), playerState.x, playerState.z, playerState.yaw);
      }
      if (overrides.cameraPerspective) {
        playerState.cameraPerspective = overrides.cameraPerspective;
      }
      if (overrides.forcedWeatherKind !== undefined) {
        timeState.urlForcedWeatherKind = overrides.forcedWeatherKind;
      }
      if (overrides.seasonTimeOffset !== undefined) {
        timeState.seasonTimeOffset = overrides.seasonTimeOffset;
      }
      if (overrides.weatherMode) {
        timeState.activeWeatherMode = overrides.weatherMode;
      }
      if (overrides.worldHour !== undefined) {
        urlWorldHour = overrides.worldHour;
      }
      (window as unknown as {
        __THE_MAN_TELEPORT__?: (x: number, y: number, z: number, yaw?: number, pitch?: number) => void;
      }).__THE_MAN_TELEPORT__ = (x: number, y: number, z: number, yaw?: number, pitch?: number) => {
        playerState.x = x;
        playerState.y = y;
        playerState.z = z;
        playerState.vx = 0;
        playerState.vy = 0;
        playerState.vz = 0;
        if (yaw !== undefined) playerState.yaw = yaw;
        if (pitch !== undefined) playerState.pitch = pitch;
        capturePreviousPlayerPose();
      };
    }

    function getEffectiveForcedWeather(): WeatherKind | null {
      if (gameSettingsRef.current.godMode === false) {
        return timeState.urlForcedWeatherKind;
      }
      if (weatherToggleRef.current !== 'auto') {
        return weatherToggleRef.current;
      }
      return timeState.urlForcedWeatherKind;
    }

    const soundEngine = createSoundEngine();

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

    const keysPressed = new Set<string>();
    const keysJustPressed = new Set<string>();
    const openDoorIds = new Set<string>();
    if (typeof window !== 'undefined') {
      const odParam = new URLSearchParams(window.location.search).get('openDoors');
      if (odParam === 'all') {
        openDoorIds.add('main-hall-door');
        openDoorIds.add('west-pavilion-door');
        openDoorIds.add('east-pavilion-door');
        openDoorIds.add('sw-watchtower-door');
        openDoorIds.add('se-watchtower-door');
        openDoorIds.add('nw-watchtower-door');
        openDoorIds.add('ne-watchtower-door');
        openDoorIds.add('hunter-lodge-door');
        openDoorIds.add('farm-west-door');
        openDoorIds.add('farm-south-door');
        openDoorIds.add('farm-east-door');
        openDoorIds.add('hill-watchtower-sw-door');
        openDoorIds.add('hill-watchtower-west-door');
        openDoorIds.add('hill-watchtower-east-door');
        openDoorIds.add('harbor-tavern-door');
        openDoorIds.add('harbor-warehouse-door');
        openDoorIds.add('harbor-lighthouse-door');
        openDoorIds.add('galleon-captain-door');
        openDoorIds.add('sw-observatory-door');
        openDoorIds.add('sw-alchemist-door');
      }
    }
    // Action input (sword, bow, flight, pointer lock), world/domain/actionInputState.
    const actionState = createActionInputState();
    // Look input (mouse drag and touch), world/domain/lookInputState.
    const lookState = createLookInputState();
    const cameraRig = createCameraRigState();
    const movementAxes: IMovementAxes = { forward: 0, right: 0 };
    const cameraPose = createCameraPose();

    timeState.worldHours = urlWorldHour ?? DEFAULT_START_WORLD_HOUR;
    // Rest and minecart ride state, world/domain/restAndRideState.
    const restState = createRestAndRideState();

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

    // Isolate Survival vs Creative (God Mode) save slots so changes never bleed across worlds!
    let activeWorldMode: GameWorldMode =
      gameSettingsRef.current.godMode === false ? 'survival' : 'creative';
    const initialSavedWorld = loadWorldSnapshot(activeWorldMode);
    // S4: the explored map comes back with the save (or starts unexplored).
    setExploredMapFromSave(initialSavedWorld);
    restoreWorldStateFromSave(initialSavedWorld, timeState, worldPlacedTraps, obstacles);
    if (initialSavedWorld) {
      applyWorldSnapshotToLiveSystems(
        initialSavedWorld,
        playerState,
        rideableHorses,
        getActiveWorldAnimals(),
        openDoorIds
      );
      if (initialSavedWorld.timeOfDayHours !== undefined && urlWorldHour === null) {
        timeState.worldHours = initialSavedWorld.timeOfDayHours;
      }
      if (initialSavedWorld.inGameHoursElapsed !== undefined) {
        timeState.inGameHoursElapsed = initialSavedWorld.inGameHoursElapsed;
      }
    }

    // Saves the world on demand, on page hide (so a tab closed inside the autosave interval keeps its progress) and
    // on the autosave timer. The save reads the mode through a getter, since the mode changes when the player switches.
    const worldSave = createWorldSaveController({
      getWorldMode: () => activeWorldMode,
      gameStateRef,
      getActiveWorldAnimals,
      openDoorIds,
      playerState,
      rideableHorses,
      timeState,
      worldPlacedTraps,
    });
    (window as unknown as { __THE_MAN_SAVE_CURRENT__?: () => void }).__THE_MAN_SAVE_CURRENT__ = worldSave.save;
    const detachWorldSaveListeners = worldSave.attachPageListeners();

    function applyDynamicAtmosphere(hours: number, weather?: IWeatherStateSnapshot) {
      return applyDynamicAtmosphereToScene(
        {
          scene,
          renderer,
          sky,
          sunDiscMesh,
          sunDiscMat,
          sunLight,
          hemiLight,
          fog,
          bgColor,
          sunVec: _sunVec,
          waterMaterial: worldHandles.waterMaterial,
          lanternLights: worldHandles.lanternLights,
        },
        hours,
        weather,
        { x: playerState.x, y: playerState.y, z: playerState.z }
      );
    }

    const initialWeather = computeWeatherState(
      timeState.seasonTimeOffset,
      playerState.x,
      playerState.z,
      timeState.activeWeatherMode,
      getEffectiveForcedWeather(),
      timeState.forcedSeason === 'auto' ? null : timeState.forcedSeason
    );
    // Simulation state (world/domain/simulationState): weather, atmosphere, and the timers the step advances.
    const simulationState = createSimulationState({
      weather: initialWeather,
      atmosphere: applyDynamicAtmosphere(timeState.worldHours, initialWeather),
    });

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

    const gameActions: IGameActions = {
      onEquipItem: (itemId) => {
        if (itemId.startsWith('trap_')) {
          deployTrapFromInventory(itemId, true);
          return;
        }
        playerState.heldTrapItemId = null;
        equipInventoryItem(playerState, itemId);
        soundEngine.playFootstep('trail', 1.15);
        emitHudSnapshot();
      },
      onBuyItem: (itemId, quantity = 1) => {
        const res = buyMarketItem(playerState, itemId, quantity);
        if (res.isSuccess) {
          soundEngine.playFootstep('trail', 1.22);
        }
        emitHudSnapshot();
        return res;
      },
      onSellItem: (itemId) => {
        const res = sellMarketItem(playerState, itemId);
        if (res.isSuccess) {
          soundEngine.playFootstep('trail', 0.95);
        }
        emitHudSnapshot();
        return res;
      },
      onTakeChestItem: (chestId, itemId, quantity = 1) => {
        if (chestId.startsWith('corpse-dwarf-')) {
          const dwarfId = Number(chestId.replace('corpse-dwarf-', ''));
          const dwarf = getActiveDwarvenMiners().find((d) => d.id === dwarfId);
          if (dwarf && dwarf.isDead && !dwarf.isLooted) {
            const lootList = getOrInitDwarfCorpseLoot(dwarf, activeArrows);
            if ((itemId as string) === '__gold_coins__') {
              const g = Math.max(0, dwarf.goldDrop || 0);
              if (g > 0) {
                playerState.goldCoins = (playerState.goldCoins ?? 280) + g;
                dwarf.goldDrop = 0;
              }
            } else {
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
            }
            if ((dwarf.goldDrop ?? 0) <= 0 && lootList.length === 0) {
              dwarf.isLooted = true;
            }
            soundEngine.playFootstep('trail', 1.15);
            emitHudSnapshot();
          }
          return;
        }
        if (chestId.startsWith('corpse-animal-')) {
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
          return;
        }
        const chest = findNearestWorldChest(playerState.x, playerState.y, playerState.z);
        if (chest && chest.id === chestId) {
          openDoorIds.add(chest.id);
          takeItemFromWorldChest(playerState, chest, itemId, quantity);
          soundEngine.playFootstep('trail', 1.15);
          emitHudSnapshot();
        }
      },
      onStoreChestItem: (chestId, itemId, quantity = 1) => {
        if (chestId.startsWith('corpse-')) return;
        const chest = findNearestWorldChest(playerState.x, playerState.y, playerState.z);
        if (chest && chest.id === chestId) {
          openDoorIds.add(chest.id);
          storeItemInWorldChest(playerState, chest, itemId, quantity);
          soundEngine.playFootstep('trail', 0.95);
          emitHudSnapshot();
        }
      },
      onTakeAllChestItems: (chestId) => {
        if (chestId.startsWith('corpse-dwarf-')) {
          const dwarfId = Number(chestId.replace('corpse-dwarf-', ''));
          const dwarf = getActiveDwarvenMiners().find((d) => d.id === dwarfId);
          if (dwarf && dwarf.isDead && !dwarf.isLooted) {
            const res = lootDeadDwarf(playerState, dwarf, activeArrows);
            const totalTaken = res.addedItems.length + (res.goldAdded > 0 ? 1 : 0);
            if (totalTaken > 0) {
              soundEngine.playFootstep('trail', 1.18);
            }
            emitHudSnapshot();
            return totalTaken;
          }
          return 0;
        }
        if (chestId.startsWith('corpse-animal-')) {
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
        const chest = findNearestWorldChest(playerState.x, playerState.y, playerState.z);
        if (chest && chest.id === chestId) {
          openDoorIds.add(chest.id);
          const res = takeAllFromWorldChest(playerState, chest);
          if (res.takenCount > 0) {
            soundEngine.playFootstep('trail', 1.18);
          }
          emitHudSnapshot();
          return res.takenCount;
        }
        return 0;
      },
      onStoreAllChestItems: (chestId) => {
        const chest = findNearestWorldChest(playerState.x, playerState.y, playerState.z);
        if (chest && chest.id === chestId) {
          openDoorIds.add(chest.id);
          const res = storeAllUnequippedInWorldChest(playerState, chest);
          if (res.storedCount > 0) {
            soundEngine.playFootstep('trail', 0.92);
          }
          emitHudSnapshot();
          return res.storedCount;
        }
        return 0;
      },
      onBuyShip: (tierId) => {
        const godMode = gameSettingsRef.current.godMode !== false;
        const res = buyOrSpawnShipFromShipwright(playerState, tierId, godMode);
        if (res.ok) {
          soundEngine.playFootstep('bridge', 1.2);
          hudFeedback.lootNotification = res.message;
          hudFeedback.lootNotificationTimer = 4.8;
        }
        emitHudSnapshot();
        return { ok: res.ok, message: res.message };
      },
      onOpenChest: (chestId) => {
        openDoorIds.add(chestId);
        if (!playerState.openedChestIds) playerState.openedChestIds = [];
        if (!playerState.openedChestIds.includes(chestId)) {
          playerState.openedChestIds.push(chestId);
        }
        soundEngine.playFootstep('bridge', 1.15);
        emitHudSnapshot();
      },
      onAssignHotbar: (slotIndex, itemId) => {
        assignHotbarSlot(playerState, slotIndex as 0 | 1 | 2 | 3, itemId);
        emitHudSnapshot();
      },
      onToggleFavorite: (itemId) => {
        toggleFavoriteItem(playerState, itemId);
        emitHudSnapshot();
      },
      onSetWorldHours: (hours) => {
        if (gameSettingsRef.current.godMode === false) return;
        restState.isSleepingInBed = false;
        timeState.worldHours = ((Number(hours) % 24) + 24) % 24;
        simulationState.currentAtmo = applyDynamicAtmosphere(timeState.worldHours, simulationState.currentWeather);
        emitHudSnapshot();
      },
      onSetSeason: (season) => {
        if (gameSettingsRef.current.godMode === false) return;
        timeState.forcedSeason = season;
        simulationState.currentWeather = computeWeatherState(
          getSeasonClockSeconds(),
          playerState.x,
          playerState.z,
          timeState.activeWeatherMode,
          getEffectiveForcedWeather(),
          timeState.forcedSeason === 'auto' ? null : timeState.forcedSeason
        );
        simulationState.currentAtmo = applyDynamicAtmosphere(timeState.worldHours, simulationState.currentWeather);
        emitHudSnapshot();
      },
      onTeleportToWorldPos: (worldX, worldZ, targetLayer) => {
        if (gameSettingsRef.current.godMode === false) return;
        restState.isSleepingInBed = false;
        restState.activeSleepingBed = null;
        restState.preSleepPlayerPos = null;
        restState.activeMinecartRide = null;
        if (playerState.mountedHorseId?.startsWith('sailable-ship')) {
          if (isNavigableOceanForShip(worldX, worldZ)) {
            setSailableShipTransform(
              worldX,
              worldZ,
              undefined,
              rideableHorses,
              getActiveWorldAnimals()
            );
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
            return;
          }
          playerState.mountedHorseId = null;
        }
        const targetY =
          targetLayer === 'mine' && isInsideSouthernMine(worldX, worldZ)
            ? southernMineWalkableHeightAt(worldX, worldZ)
            : targetLayer === 'surface'
              ? walkableHeightValueAt(worldX, worldZ, groundHeightAt(worldX, worldZ))
              : walkableHeightValueAt(worldX, worldZ);
        playerState.x = worldX;
        playerState.z = worldZ;
        playerState.y = targetY;
        playerState.vx = 0;
        playerState.vy = 0;
        playerState.vz = 0;
        if (playerState.mountedHorseId) {
          const mountedHorse = rideableHorses.find((h) => h.id === playerState.mountedHorseId);
          if (mountedHorse) {
            mountedHorse.x = worldX;
            mountedHorse.z = worldZ;
            mountedHorse.y = targetY;
            mountedHorse.speed = 0;
          } else {
            const mAnim = getActiveWorldAnimals().find(
              (a) =>
                `mount-stag-${a.id}` === playerState.mountedHorseId ||
                `mount-lion-${a.id}` === playerState.mountedHorseId
            );
            if (mAnim) {
              mAnim.x = worldX;
              mAnim.z = worldZ;
              mAnim.y = targetY;
              mAnim.vx = 0;
              mAnim.vz = 0;
            }
          }
        }
        capturePreviousPlayerPose();
        emitHudSnapshot();
      },
      onApplyGameMode: (survivalMode) => {
        restState.isSleepingInBed = false;
        restState.activeSleepingBed = null;
        restState.preSleepPlayerPos = null;

        // 1. Persist current mode's world snapshot before switching (only if a save already exists for that mode or we were actively playing it)
        if (loadWorldSnapshot(activeWorldMode) !== null) {
          const currentSnap = captureCurrentWorldSnapshot(
            activeWorldMode,
            playerState,
            rideableHorses,
            getActiveWorldAnimals(),
            openDoorIds,
            timeState.worldHours
          );
          saveWorldSnapshot(activeWorldMode, currentSnap);
        }

        // 2. Switch world mode and restore target snapshot (or fresh baseline if no save exists)
        const targetMode: GameWorldMode = survivalMode ? 'survival' : 'creative';
        activeWorldMode = targetMode;
        const savedSnap = loadWorldSnapshot(targetMode);
        setExploredMapFromSave(savedSnap);
        restoreWorldStateFromSave(savedSnap, timeState, worldPlacedTraps, obstacles);
        if (savedSnap) {
          applyWorldSnapshotToLiveSystems(
            savedSnap,
            playerState,
            rideableHorses,
            getActiveWorldAnimals(),
            openDoorIds
          );
          if (savedSnap.timeOfDayHours !== undefined && urlWorldHour === null) {
            timeState.worldHours = savedSnap.timeOfDayHours;
          }
        } else {
          activeArrows.length = 0;
          worldPlacedTraps.length = 0;
          playerState.heldTrapItemId = null;
          if (trapGhost.current) {
            trapGhost.current.group.visible = false;
          }
          placedTrapSync.clear();
          workbenchStash.materials = { ...DEFAULT_TRAP_WORKBENCH_STASH };
          resetTreeFellingSystem(obstacles);
          resetLiveWorldToFreshBaseline(
            targetMode,
            playerState,
            rideableHorses,
            getActiveWorldAnimals(),
            openDoorIds
          );
          if (urlWorldHour === null) {
            timeState.worldHours = survivalMode ? 9 : 12;
          }
          // Immediately persist the newly created game so returning to the Main Menu shows Continue & New Game
          const freshSnap = captureCurrentWorldSnapshot(
            targetMode,
            playerState,
            rideableHorses,
            getActiveWorldAnimals(),
            openDoorIds,
            timeState.worldHours
          );
          saveWorldSnapshot(targetMode, freshSnap);
        }

        openDoorIds.delete('chest-hunter-lodge');
        if (survivalMode) {
          timeState.forcedSeason = 'auto';
          timeState.activeWeatherMode = DEFAULT_WEATHER_CYCLE_MODE;
        }
        simulationState.currentWeather = computeWeatherState(
          getSeasonClockSeconds(),
          playerState.x,
          playerState.z,
          timeState.activeWeatherMode,
          getEffectiveForcedWeather(),
          timeState.forcedSeason === 'auto' ? null : timeState.forcedSeason
        );
        simulationState.currentAtmo = applyDynamicAtmosphere(timeState.worldHours, simulationState.currentWeather);
        capturePreviousPlayerPose();
        emitHudSnapshot();
      },
      onResetWorld: (mode) => {
        if (mode === 'survival' || mode === 'both') {
          clearWorldSave('survival');
        }
        if (mode === 'creative' || mode === 'both') {
          clearWorldSave('creative');
        }

        const resetTargetMode: GameWorldMode =
          mode === 'both' ? activeWorldMode : mode;
        activeWorldMode = resetTargetMode;

        // Always reset ALL live world entities and subsystems (monks, traps, birds, animals, horses, trees, arrows, doors/chests)
        restState.isSleepingInBed = false;
        restState.activeSleepingBed = null;
        restState.preSleepPlayerPos = null;
        activeArrows.length = 0;
        worldPlacedTraps.length = 0;
        playerState.heldTrapItemId = null;
        if (trapGhost.current) {
          trapGhost.current.group.visible = false;
        }
        placedTrapSync.clear();
        workbenchStash.materials = { ...DEFAULT_TRAP_WORKBENCH_STASH };
        resetActiveWorldBirds();
        resetLiveWorldToFreshBaseline(
          resetTargetMode,
          playerState,
          rideableHorses,
          getActiveWorldAnimals(),
          openDoorIds
        );
        resetTreeFellingSystem(obstacles);
        timeState.inGameHoursElapsed = 0;
        timeState.seasonTimeOffset = 180.0;
        if (urlWorldHour === null) {
          timeState.worldHours = resetTargetMode === 'survival' ? 9 : 12;
        }
        if (resetTargetMode === 'survival') {
          timeState.forcedSeason = 'auto';
          timeState.activeWeatherMode = DEFAULT_WEATHER_CYCLE_MODE;
        }
        simulationState.currentWeather = computeWeatherState(
          getSeasonClockSeconds(),
          playerState.x,
          playerState.z,
          timeState.activeWeatherMode,
          getEffectiveForcedWeather(),
          timeState.forcedSeason === 'auto' ? null : timeState.forcedSeason
        );
        simulationState.currentAtmo = applyDynamicAtmosphere(timeState.worldHours, simulationState.currentWeather);
        capturePreviousPlayerPose();
        window.dispatchEvent(new CustomEvent('reset-world-minimap'));

        const message =
          mode === 'survival'
            ? 'Survival World & Map have been completely reset to a fresh state!'
            : mode === 'creative'
              ? 'Creative (God Mode) World & Map have been completely reset to a fresh state!'
              : 'Both Survival & Creative Worlds and the Map have been completely reset!';
        hudFeedback.lootNotification = message;
        hudFeedback.lootNotificationTimer = 4.5;
        emitHudSnapshot();
        return { ok: true, message };
      },
      onCloseChest: (chestId) => {
        openDoorIds.delete(chestId);
        emitHudSnapshot();
      },
      onResumeGameControl: () => {
        openDoorIds.delete('chest-hunter-lodge');
        handleReacquirePointerLock();
        emitHudSnapshot();
      },
      onCraftTrap: (recipeId) => {
        const recipe = TRAP_RECIPES.find((r) => r.kind === recipeId || r.itemId === recipeId);
        if (!recipe) return;
        const craftRes = craftTrapAtWorkbench(
          recipe.kind,
          playerState.ownedItemIds ?? [],
          workbenchStash.materials
        );
        if (!craftRes.success) return;
        playerState.ownedItemIds = craftRes.updatedPlayerItems;
        workbenchStash.materials = craftRes.updatedWorkbenchStash;
        awardSkillXp(playerState, 'archery', 35);
        hudFeedback.lootNotification = `Crafted ${recipe.name}! Press [T] outdoors to place it.`;
        hudFeedback.lootNotificationTimer = 4.5;
        soundEngine.playFootstep('bridge', 1.1);
        emitHudSnapshot();
      },
      onDeployTrap: () => {
        deployTrapFromInventory();
      },
      onHarvestNearbyTrap: () => {
        harvestOrPickupNearbyTrap();
      },
      onDepositWorkbenchMaterial: (itemId, count) => {
        if (!playerState.ownedItemIds) playerState.ownedItemIds = [];
        let transferred = 0;
        for (let i = playerState.ownedItemIds.length - 1; i >= 0 && transferred < count; i--) {
          if (playerState.ownedItemIds[i] === itemId) {
            playerState.ownedItemIds.splice(i, 1);
            transferred++;
          }
        }
        if (transferred > 0) {
          workbenchStash.materials[itemId] = (workbenchStash.materials[itemId] ?? 0) + transferred;
          emitHudSnapshot();
        }
      },
      onWithdrawWorkbenchMaterial: (itemId, count) => {
        if (!playerState.ownedItemIds) playerState.ownedItemIds = [];
        const inStash = workbenchStash.materials[itemId] ?? 0;
        const transfer = Math.min(inStash, count);
        if (transfer > 0) {
          workbenchStash.materials[itemId] = inStash - transfer;
          if (workbenchStash.materials[itemId]! <= 0) delete workbenchStash.materials[itemId];
          for (let i = 0; i < transfer; i++) {
            playerState.ownedItemIds.push(itemId);
          }
          emitHudSnapshot();
        }
      },
      onDepositAllWorkbenchMaterials: () => {
        if (!playerState.ownedItemIds) playerState.ownedItemIds = [];
        const craftableMats = new Set<InventoryItemId>([
          'oak_timber',
          'twine_fiber',
          'iron_ingots',
          'wild_berries',
          'grain_seeds',
          'raw_game_meat',
          'small_hide',
          'animal_bone',
          'animal_fat',
        ]);
        for (let i = playerState.ownedItemIds.length - 1; i >= 0; i--) {
          const itemId = playerState.ownedItemIds[i];
          if (craftableMats.has(itemId)) {
            workbenchStash.materials[itemId] = (workbenchStash.materials[itemId] ?? 0) + 1;
            playerState.ownedItemIds.splice(i, 1);
          }
        }
        emitHudSnapshot();
      },
      onTakeAllFromWorkbenchStash: () => {
        if (!playerState.ownedItemIds) playerState.ownedItemIds = [];
        for (const [id, count] of Object.entries(workbenchStash.materials)) {
          const itemId = id as InventoryItemId;
          if (count && count > 0) {
            for (let i = 0; i < count; i++) {
              playerState.ownedItemIds.push(itemId);
            }
            delete workbenchStash.materials[itemId];
          }
        }
        emitHudSnapshot();
      },
      onOpenTrapWorkbench: () => {
        const win = window as unknown as { openTrapCraftingModal?: (open?: boolean) => void };
        win.openTrapCraftingModal?.(true);
      },
      onCloseTrapWorkbench: () => {
        const win = window as unknown as { openTrapCraftingModal?: (open?: boolean) => void };
        win.openTrapCraftingModal?.(false);
        handleReacquirePointerLock();
      },
    };
    // Expose helpers for modal access
    const winRef = window as unknown as {
      getWorkbenchStash?: () => IWorkbenchStash;
      getPlacedTraps?: () => IPlacedTrap[];
    };
    winRef.getWorkbenchStash = () => workbenchStash;
    winRef.getPlacedTraps = () => worldPlacedTraps;

    onRegisterGameActions?.(gameActions);

    let unregisterDebugBridge: (() => void) | undefined;
    if (import.meta.env.DEV) {
      unregisterDebugBridge = registerWindowDebugBridge({
        playerState,
        obstacles,
        rideableHorses,
        activeArrows,
        openDoorIds,
        camera,
        soundEngine,
        gameStateRef,
        weatherToggleRef,
        setActiveWeatherMode: (mode) => {
          timeState.activeWeatherMode = mode;
        },
        setSmoothAimZoom: (val) => {
          cameraRig.smoothAimZoom = val;
        },
        setSmoothRightClickZoom: (val) => {
          cameraRig.smoothRightClickZoom = val;
        },
        fireArrowNow,
        executeSwordSlash,
        getWorldHours: () => timeState.worldHours,
        setWorldHoursAndApply: (hours) => {
          timeState.worldHours = ((Number(hours) % 24) + 24) % 24;
          simulationState.currentAtmo = applyDynamicAtmosphere(timeState.worldHours, simulationState.currentWeather);
          return Number(timeState.worldHours.toFixed(2));
        },
        getCurrentAtmo: () => simulationState.currentAtmo,
        getCurrentWeather: () => simulationState.currentWeather,
        toggleColliderDebug: (visible?: boolean) =>
          worldHandles.colliderDebugHandles.toggle(visible),
        isColliderDebugVisible: () => worldHandles.colliderDebugHandles.isVisible(),
        triggerLootNearbyAnimal: () => {
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
        },
        emitHudSnapshot,
      });
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 8. Main Animation Loop with Software-WebGL Pacing Guard
    const perfStats = new PerfStats();
    const perfDebug = createPerfDebugTools({ renderer, scene, perfStats, colliders: SOLID_BUILDING_BOXES });

    const requestPointerLockSafely = () => {
      if (
        gameStateRef.current !== 'playing' ||
        document.body.dataset.skyrimModalOpen === 'true' ||
        document.body.dataset.worldMapModalOpen === 'true'
      ) {
        return;
      }
      try {
        if (renderer.domElement && document.pointerLockElement !== renderer.domElement) {
          const lockPromise = renderer.domElement.requestPointerLock?.() as
            | Promise<void>
            | undefined;
          if (lockPromise && typeof lockPromise.catch === 'function') {
            lockPromise.catch(() => {});
          }
        }
      } catch {
        // ignore
      }
    };

    const handleReacquirePointerLock = () => {
      actionState.lastPointerLockExitTimeMs = -Infinity;
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== renderer.domElement
      ) {
        document.activeElement.blur();
      }
      renderer.domElement.focus?.({ preventScroll: true });
      requestPointerLockSafely();
      requestAnimationFrame(() => {
        renderer.domElement.focus?.({ preventScroll: true });
        requestPointerLockSafely();
      });
    };
    const detachInputListeners = attachInputListeners({
      camera,
      worldHandles,
      container,
      renderer,
      playerState,
      lookState,
      actionState,
      hudFeedback,
      keysPressed,
      keysJustPressed,
      cameraRig,
      soundEngine,
      perfDebug,
      gameSettingsRef,
      gameStateRef,
      onRequestPauseToggleRef,
      deployTrapFromInventory,
      emitHudSnapshot,
      executeSwordSlash,
      fireArrowNow,
      placeHeldTrapAtPreview,
      requestPointerLockSafely,
      handleReacquirePointerLock,
    });


    /** Copies a computed camera pose onto the three.js camera. */

    const wildlifeSoundCallbacks: IWildlifeSoundCallbacks = {
      onBirdFlockStartled: (dist) => {
        soundEngine.playBirdFlockStartle(dist);
      },
      onCritterScampered: (dist) => {
        soundEngine.playCritterScamper(dist);
      },
    };

    /** Player pose at the start of the latest simulation step, for render interpolation. */
    const previousPlayerPose = {
      x: playerState.x,
      y: playerState.y,
      z: playerState.z,
      yaw: playerState.yaw,
      pitch: playerState.pitch,
      mountedHorseYaw: playerState.mountedHorseYaw ?? playerState.yaw,
      bobPhase: playerState.bobPhase,
      bobAmount: playerState.bobAmount,
    };

    function capturePreviousPlayerPose() {
      previousPlayerPose.x = playerState.x;
      previousPlayerPose.y = playerState.y;
      previousPlayerPose.z = playerState.z;
      previousPlayerPose.yaw = playerState.yaw;
      previousPlayerPose.pitch = playerState.pitch;
      previousPlayerPose.mountedHorseYaw = playerState.mountedHorseYaw ?? playerState.yaw;
      previousPlayerPose.bobPhase = playerState.bobPhase;
      previousPlayerPose.bobAmount = playerState.bobAmount;
    }

    /** Fills renderPlayer with the live state, blending the pose between the last two steps. */

    /** Advances the game simulation by exactly one fixed step. */

    /** Renders one frame from the simulation state, interpolated by `alpha`. */

    function emitHudSnapshot() {
      onTelemetryUpdateRef.current(
        buildTelemetrySnapshot(
          buildHudTelemetryInput({
            player: playerState,
            horses: rideableHorses,
            openDoorIds,
            atmosphere: simulationState.currentAtmo,
            weather: simulationState.currentWeather,
            colliderDebugVisible: worldHandles.colliderDebugHandles.isVisible(),
            pointerLocked: document.pointerLockElement === renderer.domElement,
            hudFeedback,
            isSleepingInBed: restState.isSleepingInBed,
            worldHours: timeState.worldHours,
            forcedSeason: timeState.forcedSeason,
            placedTraps: worldPlacedTraps,
            activeAnimals: getActiveWorldAnimals(),
            activeMinecartRide: restState.activeMinecartRide,
          })
        )
      );
    }

    const renderFrame = createRenderFrame({
      activeArrows,
      camera,
      cameraPose,
      cameraRig,
      emitHudSnapshot,
      fog,
      gameStateRef,
      mutedRef,
      openDoorIds,
      placedTrapSync,
      playerState,
      previousPlayerPose,
      renderer,
      rideableHorses,
      restState,
      scene,
      simulationState,
      sky,
      soundEngine,
      sunDiscMesh,
      stepSeconds: SIMULATION_STEP_SECONDS,
      sunLight,
      timeState,
      trapGhost,
      worldHandles,
      worldPlacedTraps,
      worldTrapsGroup,
    });

    const simulateStep = createSimulationStep({
      actionState,
      activeArrows,
      applyDynamicAtmosphere,
      camera,
      capturePreviousPlayerPose,
      emitHudSnapshot,
      executeSwordSlash,
      gameSettingsRef,
      gameStateRef,
      getEffectiveForcedWeather,
      getSeasonClockSeconds,
      handleSwordStrikeImpactFeedback,
      harvestOrPickupNearbyTrap,
      hudFeedback,
      keysJustPressed,
      keysPressed,
      obstacles,
      worldHandles,
      lookState,
      movementAxes,
      openDoorIds,
      perfStats,
      playerState,
      restState,
      rideableHorses,
      saveCurrentWorld: worldSave.save,
      simulationState,
      soundEngine,
      timeState,
      tryBoardOrExitMinecart,
      virtualMoveRef,
      wildlifeSoundCallbacks,
      worldPlacedTraps,
    });

    const gameLoop = new GameLoop({
      scheduler: isSoftwareGl
        ? createGpuFencePacedScheduler(renderer.getContext() as WebGL2RenderingContext)
        : createAnimationFrameScheduler(),
      now: () => performance.now(),
      logger,
      maxConsecutiveFailures: MAX_CONSECUTIVE_TICK_FAILURES,
      maxFrameSeconds: MAX_FRAME_SECONDS,
      errorLogIntervalMs: TICK_ERROR_LOG_INTERVAL_MS,
      fixedStep: {
        stepSeconds: SIMULATION_STEP_SECONDS,
        maxStepsPerFrame: MAX_SIMULATION_STEPS_PER_FRAME,
        onStep: (stepSeconds: number) => {
          const t0 = performance.now();
          simulateStep(stepSeconds);
          perfStats.record('sim', performance.now() - t0);
        },
      },
      onFrame: (frameDt: number, now: number, alpha: number) => {
        perfStats.record('frame', frameDt * 1000);
        const t0 = performance.now();
        renderFrame(frameDt, now, alpha);
        perfStats.record('render', performance.now() - t0);
      },
      onFatalError: setFatalTickError,
    });
    gameLoop.start();

    teardown = () => {
      gameLoop.stop();
      detachInputListeners();
      detachWorldSaveListeners();
      perfDebug.dispose();
      worldSave.save();
      onRegisterGameActions?.(null);
      unregisterDebugBridge?.();
      soundEngine.dispose();
      worldScene.dispose();
    };
    };
    void startWorld();
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [virtualMoveRef]);

  if (fatalTickError) {
    // Rethrow during render so the root ErrorBoundary logs it and shows the recovery screen.
    throw fatalTickError;
  }

  return (
    <>
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-stone-950 cursor-grab active:cursor-grabbing"
      aria-label={t('ui.canvas_aria')}
    />
    {loadingStage ? (
      <div role="status" data-stage={loadingStage} className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-2 w-40 overflow-hidden rounded bg-stone-800"><div className="h-full w-1/2 animate-pulse bg-amber-600/70" /></div>
      </div>
    ) : null}
    </>
  );
});
WorldCanvas.displayName = 'WorldCanvas';
// #endregion

/**
 * Summary: Sets the shared explored map from a save (S4). A fresh world, or a save without one, starts unexplored.
 */
function setExploredMapFromSave(snap: { revealedMap?: string } | null | undefined): void {
  mapExplorationState.revealed = decodeRevealedMap(snap?.revealedMap);
  window.dispatchEvent(new Event('map-exploration-loaded'));
}

/**
 * Summary: Restores the placed traps and the season offset from a save (S2).
 */
function restoreWorldStateFromSave(
  snap: { placedTraps?: IPlacedTrap[]; seasonTimeOffset?: number; felledTrees?: ISavedFelledTree[]; deadDwarfIds?: number[] } | null | undefined,
  timeState: { seasonTimeOffset: number },
  worldPlacedTraps: IPlacedTrap[],
  obstacles: IObstacle[]
): void {
  restoreFelledTrees(snap?.felledTrees ?? [], obstacles);
  setPendingDeadDwarfIds(snap?.deadDwarfIds ?? []);
  worldPlacedTraps.length = 0;
  if (snap?.placedTraps) worldPlacedTraps.push(...snap.placedTraps);
  if (snap?.seasonTimeOffset !== undefined) timeState.seasonTimeOffset = snap.seasonTimeOffset;
}
