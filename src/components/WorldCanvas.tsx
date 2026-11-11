// ============================================================================
// MODULE: Components / World Canvas
// DESIGN: Humble UI host for WebGL rendering, pointer lock, and physics tick (SRP)
// SUMMARY: Initializes Three.js renderer, camera, solar atmosphere, dynamic weather,
//          input event listeners, audio integration, and animation loop.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import { t } from '../locales';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PerfStats, formatPerfStats } from '../core/perfStats';
import { auditColliderCoverage } from '../world/builders/colliderAudit';
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
  walkableHeightAt,
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
  createPlacedTrapMesh,
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
/** Steps allowed per rendered frame; capped at 2 to prevent spiral-of-death stutter when flying. */
const MAX_SIMULATION_STEPS_PER_FRAME = 2;
/** Minimum gap between two logged frame errors (ms). */
const TICK_ERROR_LOG_INTERVAL_MS = 2000;

/** World clock hour the session starts at when no ?hour= override is given (06:40, sunrise mist). */
const DEFAULT_START_WORLD_HOUR = 6.68;
const _sunVec = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

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

    const worldScene = createWorldScene(container, logger);
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
    let lastArrowHitTargetName: string | null = null;
    let lastArrowHitTimer = 0;
    let lastHitAnimal: ISmallAnimalState | null = null;
    let lastHitAnimalTimer = 0;
    let lastLootNotification: string | null = null;
    let lastLootNotificationTimer = 0;

    // Animal Trapping & Workbench Stash
    const worldPlacedTraps: IPlacedTrap[] = [];
    const worldTrapsGroup = new THREE.Group();
    worldTrapsGroup.name = 'world-placed-traps';
    scene.add(worldTrapsGroup);
    const trapMeshesMap = new Map<string, { mesh: THREE.Group; sprung: boolean }>();
    const workbenchStash: IWorkbenchStash = {
      materials: { ...DEFAULT_TRAP_WORKBENCH_STASH },
    };

    let activeTrapPlacementGhost: ITrapPlacementPreviewGhost | null = null;

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
        (gx: number, gz: number) => walkableHeightAt(gx, gz).height,
        WATER_LEVEL,
        playerState.pitch
      );
      if (!res.success || !res.placedTrap) {
        if (res.error) {
          lastLootNotification = res.error;
          lastLootNotificationTimer = 3.5;
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
      lastLootNotification =
        remainingSame > 0
          ? `Placed ${trapName}! (${remainingSame} left in hands — Left-Click to place another)`
          : `Placed ${trapName}! Wildlife will notice the bait after a short time.`;
      lastLootNotificationTimer = 4.0;
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
        lastLootNotification =
          "No traps in your inventory. Craft traps at the Trapper's Workbench in the Hunter's Cabin!";
        lastLootNotificationTimer = 3.5;
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
      isMouseBowHeld = false;
      playerState.heldTrapItemId = trapToHold;
      const trapName = INVENTORY_ITEM_MAP.get(trapToHold)?.name ?? 'Trap';
      const count = owned.filter((id) => id === trapToHold).length;
      lastLootNotification = `Holding ${trapName} (x${count}) — Aim at ground (Green = Valid, Red = Invalid) and Left-Click to place!`;
      lastLootNotificationTimer = 4.2;
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
        lastLootNotification = harvestRes.notification;
        lastLootNotificationTimer = 4.5;
        soundEngine.playFootstep('bridge', 1.2);
        const idx = worldPlacedTraps.findIndex((t) => t.id === nearTrap.id);
        if (idx !== -1) worldPlacedTraps.splice(idx, 1);
        emitHudSnapshot();
        return true;
      }
      const pickupRes = pickupPlacedTrap(nearTrap, playerState.ownedItemIds);
      const trapName = INVENTORY_ITEM_MAP.get(pickupRes.returnedTrapItem)?.name ?? 'Trap';
      lastLootNotification = `Picked up ${trapName} and returned it to your inventory.`;
      lastLootNotificationTimer = 3.0;
      soundEngine.playFootstep('bridge', 0.9);
      const idx = worldPlacedTraps.findIndex((t) => t.id === nearTrap.id);
      if (idx !== -1) worldPlacedTraps.splice(idx, 1);
      emitHudSnapshot();
      return true;
    };

    let activeWeatherMode: WeatherCycleMode = DEFAULT_WEATHER_CYCLE_MODE;
    let urlForcedWeatherKind: WeatherKind | null = null;
    // Start in Summer by default (SEASON_DURATION_SECONDS = 180.0, index 1 = 'summer').
    // Each season lasts 5 full in-game days (120 in-game hours -> 1.5 seasonal units per in-game hour).
    const SEASON_UNITS_PER_INGAME_HOUR = 180.0 / (5 * 24);
    let seasonTimeOffset = 180.0;
    let inGameHoursElapsed = 0;
    const getSeasonClockSeconds = () =>
      seasonTimeOffset + inGameHoursElapsed * SEASON_UNITS_PER_INGAME_HOUR;
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
            : walkableHeightAt(overrides.position.x, overrides.position.z).height;
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
        urlForcedWeatherKind = overrides.forcedWeatherKind;
      }
      if (overrides.seasonTimeOffset !== undefined) {
        seasonTimeOffset = overrides.seasonTimeOffset;
      }
      if (overrides.weatherMode) {
        activeWeatherMode = overrides.weatherMode;
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
        return urlForcedWeatherKind;
      }
      if (weatherToggleRef.current !== 'auto') {
        return weatherToggleRef.current;
      }
      return urlForcedWeatherKind;
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
        lastLootNotification = 'No arrows left in inventory!';
        lastLootNotificationTimer = 2.5;
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
    let pendingFlyToggle = false;
    let lastSpaceDownMs = -1000;
    let accumYawDelta = 0;
    let accumPitchDelta = 0;
    let isDraggingLook = false;
    let isMouseBowHeld = false;
    let mouseDownStartX = 0;
    let mouseDownStartY = 0;
    let mouseMovedWhileDown = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let landingDip = 0;
    let lastThunderTime = -10;
    const cameraRig = createCameraRigState();
    const movementAxes: IMovementAxes = { forward: 0, right: 0 };
    const cameraPose = createCameraPose();
    let isSwordAttackHeld = false;
    let swordHoldDuration = 0;
    let swordHeavyTriggeredDuringHold = false;

    let worldHours = urlWorldHour ?? DEFAULT_START_WORLD_HOUR;
    let forcedSeason: SeasonType | 'auto' = 'auto';
    let isSleepingInBed = false;
    let activeSleepingBed: { x: number; y: number; z: number; yaw?: number } | null = null;
    let preSleepPlayerPos: { x: number; y: number; z: number } | null = null;
    let activeMinecartRide: {
      lineId: string;
      lineName: string;
      u: number;
      velocity: number;
      wheelAngle: number;
      facingSign: 1 | -1;
    } | null = null;
    let worldSaveTimer = 0;

    function tryBoardOrExitMinecart(): boolean {
      if (activeMinecartRide) {
        activeMinecartRide = null;
        playerState.y = walkableHeightAt(playerState.x, playerState.z, playerState.y).height;
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
      activeMinecartRide = {
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
      lastLootNotification = `Driving ${line.name} — [W/S] Drive Forward/Back · [E] Exit`;
      lastLootNotificationTimer = 4.0;
      soundEngine.playFootstep('bridge', 1.2);
      emitHudSnapshot();
      return true;
    }

    // Isolate Survival vs Creative (God Mode) save slots so changes never bleed across worlds!
    let activeWorldMode: GameWorldMode =
      gameSettingsRef.current.godMode === false ? 'survival' : 'creative';
    const initialSavedWorld = loadWorldSnapshot(activeWorldMode);
    if (initialSavedWorld) {
      applyWorldSnapshotToLiveSystems(
        initialSavedWorld,
        playerState,
        rideableHorses,
        getActiveWorldAnimals(),
        openDoorIds
      );
      if (initialSavedWorld.timeOfDayHours !== undefined && urlWorldHour === null) {
        worldHours = initialSavedWorld.timeOfDayHours;
      }
    }

    const saveCurrentWorld = () => {
      if (gameStateRef.current === 'title' && !loadWorldSnapshot(activeWorldMode)) {
        return;
      }
      const snap = captureCurrentWorldSnapshot(
        activeWorldMode,
        playerState,
        rideableHorses,
        getActiveWorldAnimals(),
        openDoorIds,
        worldHours
      );
      saveWorldSnapshot(activeWorldMode, snap);
    };
    (window as unknown as { __THE_MAN_SAVE_CURRENT__?: () => void }).__THE_MAN_SAVE_CURRENT__ = saveCurrentWorld;

    /** Counts point lights in the scene (each adds per-pixel cost to every lit material). */
    function countPointLights(): number {
      let count = 0;
      scene.traverse((obj) => {
        if ((obj as THREE.PointLight).isPointLight) count++;
      });
      return count;
    }
    // Debug hooks for the performance overlay (F4) and the collider coverage audit.
    (window as unknown as { getPerfStats?: () => unknown }).getPerfStats = () => ({
      ...perfStats.snapshot(),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      programs: renderer.info.programs?.length ?? 0,
      pointLights: countPointLights(),
    });
    (window as unknown as { auditColliders?: () => unknown }).auditColliders = () =>
      auditColliderCoverage(scene, SOLID_BUILDING_BOXES);

    /** Shows or hides a small text panel with frame, render, simulation and save timings. */
    function togglePerfOverlay(): void {
      if (perfOverlay.el) {
        window.clearInterval(perfOverlay.timer);
        perfOverlay.el.remove();
        perfOverlay.el = null;
        return;
      }
      const el = document.createElement('pre');
      el.setAttribute('data-testid', 'perf-overlay');
      el.style.cssText =
        'position:fixed;top:8px;left:8px;z-index:9999;margin:0;padding:6px 8px;background:rgba(0,0,0,0.7);color:#e5e7eb;font:12px/1.4 monospace;pointer-events:none;border-radius:4px;';
      document.body.appendChild(el);
      perfOverlay.el = el;
      const refresh = () => {
        el.textContent = formatPerfStats(perfStats.snapshot(), {
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          pointLights: countPointLights(),
        });
      };
      refresh();
      perfOverlay.timer = window.setInterval(refresh, 500);
    }
    // Save when the page is hidden or closed, so a tab closed inside the autosave interval keeps its progress.
    const onPageHideSave = () => saveCurrentWorld();
    const onVisibilitySave = () => {
      if (document.visibilityState === 'hidden') saveCurrentWorld();
    };
    window.addEventListener('pagehide', onPageHideSave);
    document.addEventListener('visibilitychange', onVisibilitySave);

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

    let currentWeather = computeWeatherState(
      seasonTimeOffset,
      playerState.x,
      playerState.z,
      activeWeatherMode,
      getEffectiveForcedWeather(),
      forcedSeason === 'auto' ? null : forcedSeason
    );
    let currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);

    function handleSwordStrikeImpactFeedback(
      res: ReturnType<typeof triggerSwordSlash> | null
    ) {
      if (!res) return;
      if (res.hitAnimal) {
        const spName = getAnimalSpeciesName(res.hitAnimal.species);
        lastHitAnimal = res.hitAnimal;
        lastHitAnimalTimer = res.killedAnimal ? 1.8 : 6.0;
        lastArrowHitTargetName = res.killedAnimal
          ? t('notifications.animal_hunted', { species: spName, key: formatKeyCodeLabel(gameSettingsRef.current.keybindings.interactDoor) })
          : t('notifications.animal_hit', { species: spName });
        lastArrowHitTimer = res.killedAnimal ? 4.0 : 2.5;
        soundEngine.playArrowHit(true);
        emitHudSnapshot();
      } else if (res.hitTarget) {
        lastArrowHitTargetName = res.hitTarget.name;
        lastArrowHitTimer = 3.5;
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
          lastLootNotification = res.message;
          lastLootNotificationTimer = 4.8;
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
        isSleepingInBed = false;
        worldHours = ((Number(hours) % 24) + 24) % 24;
        currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);
        emitHudSnapshot();
      },
      onSetSeason: (season) => {
        if (gameSettingsRef.current.godMode === false) return;
        forcedSeason = season;
        currentWeather = computeWeatherState(
          getSeasonClockSeconds(),
          playerState.x,
          playerState.z,
          activeWeatherMode,
          getEffectiveForcedWeather(),
          forcedSeason === 'auto' ? null : forcedSeason
        );
        currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);
        emitHudSnapshot();
      },
      onTeleportToWorldPos: (worldX, worldZ, targetLayer) => {
        if (gameSettingsRef.current.godMode === false) return;
        isSleepingInBed = false;
        activeSleepingBed = null;
        preSleepPlayerPos = null;
        activeMinecartRide = null;
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
              ? walkableHeightAt(worldX, worldZ, groundHeightAt(worldX, worldZ)).height
              : walkableHeightAt(worldX, worldZ).height;
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
        isSleepingInBed = false;
        activeSleepingBed = null;
        preSleepPlayerPos = null;

        // 1. Persist current mode's world snapshot before switching (only if a save already exists for that mode or we were actively playing it)
        if (loadWorldSnapshot(activeWorldMode) !== null) {
          const currentSnap = captureCurrentWorldSnapshot(
            activeWorldMode,
            playerState,
            rideableHorses,
            getActiveWorldAnimals(),
            openDoorIds,
            worldHours
          );
          saveWorldSnapshot(activeWorldMode, currentSnap);
        }

        // 2. Switch world mode and restore target snapshot (or fresh baseline if no save exists)
        const targetMode: GameWorldMode = survivalMode ? 'survival' : 'creative';
        activeWorldMode = targetMode;
        const savedSnap = loadWorldSnapshot(targetMode);
        if (savedSnap) {
          applyWorldSnapshotToLiveSystems(
            savedSnap,
            playerState,
            rideableHorses,
            getActiveWorldAnimals(),
            openDoorIds
          );
          if (savedSnap.timeOfDayHours !== undefined && urlWorldHour === null) {
            worldHours = savedSnap.timeOfDayHours;
          }
        } else {
          activeArrows.length = 0;
          worldPlacedTraps.length = 0;
          playerState.heldTrapItemId = null;
          if (activeTrapPlacementGhost) {
            activeTrapPlacementGhost.group.visible = false;
          }
          for (const entry of trapMeshesMap.values()) {
            worldTrapsGroup.remove(entry.mesh);
          }
          trapMeshesMap.clear();
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
            worldHours = survivalMode ? 9 : 12;
          }
          // Immediately persist the newly created game so returning to the Main Menu shows Continue & New Game
          const freshSnap = captureCurrentWorldSnapshot(
            targetMode,
            playerState,
            rideableHorses,
            getActiveWorldAnimals(),
            openDoorIds,
            worldHours
          );
          saveWorldSnapshot(targetMode, freshSnap);
        }

        openDoorIds.delete('chest-hunter-lodge');
        if (survivalMode) {
          forcedSeason = 'auto';
          activeWeatherMode = DEFAULT_WEATHER_CYCLE_MODE;
        }
        currentWeather = computeWeatherState(
          getSeasonClockSeconds(),
          playerState.x,
          playerState.z,
          activeWeatherMode,
          getEffectiveForcedWeather(),
          forcedSeason === 'auto' ? null : forcedSeason
        );
        currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);
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
        isSleepingInBed = false;
        activeSleepingBed = null;
        preSleepPlayerPos = null;
        activeArrows.length = 0;
        worldPlacedTraps.length = 0;
        playerState.heldTrapItemId = null;
        if (activeTrapPlacementGhost) {
          activeTrapPlacementGhost.group.visible = false;
        }
        for (const entry of trapMeshesMap.values()) {
          worldTrapsGroup.remove(entry.mesh);
        }
        trapMeshesMap.clear();
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
        inGameHoursElapsed = 0;
        seasonTimeOffset = 180.0;
        if (urlWorldHour === null) {
          worldHours = resetTargetMode === 'survival' ? 9 : 12;
        }
        if (resetTargetMode === 'survival') {
          forcedSeason = 'auto';
          activeWeatherMode = DEFAULT_WEATHER_CYCLE_MODE;
        }
        currentWeather = computeWeatherState(
          getSeasonClockSeconds(),
          playerState.x,
          playerState.z,
          activeWeatherMode,
          getEffectiveForcedWeather(),
          forcedSeason === 'auto' ? null : forcedSeason
        );
        currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);
        capturePreviousPlayerPose();
        window.dispatchEvent(new CustomEvent('reset-world-minimap'));

        const message =
          mode === 'survival'
            ? 'Survival World & Map have been completely reset to a fresh state!'
            : mode === 'creative'
              ? 'Creative (God Mode) World & Map have been completely reset to a fresh state!'
              : 'Both Survival & Creative Worlds and the Map have been completely reset!';
        lastLootNotification = message;
        lastLootNotificationTimer = 4.5;
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
        lastLootNotification = `Crafted ${recipe.name}! Press [T] outdoors to place it.`;
        lastLootNotificationTimer = 4.5;
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
          activeWeatherMode = mode;
        },
        setSmoothAimZoom: (val) => {
          cameraRig.smoothAimZoom = val;
        },
        setSmoothRightClickZoom: (val) => {
          cameraRig.smoothRightClickZoom = val;
        },
        fireArrowNow,
        executeSwordSlash,
        getWorldHours: () => worldHours,
        setWorldHoursAndApply: (hours) => {
          worldHours = ((Number(hours) % 24) + 24) % 24;
          currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);
          return Number(worldHours.toFixed(2));
        },
        getCurrentAtmo: () => currentAtmo,
        getCurrentWeather: () => currentWeather,
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
                lastLootNotification = dwRes.notification;
                lastLootNotificationTimer = 4.5;
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
            lastLootNotification = res.notification;
            lastLootNotificationTimer = 4.5;
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

    // Event Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      const kb = gameSettingsRef.current.keybindings;
      // Escape always pauses as a universal fallback, next to the configurable pause key (unless an inventory/chest/market/map modal is open).
      if (matchesKeyBinding(e.code, kb.pauseGame) || e.code === 'Escape') {
        if (
          document.body.dataset.skyrimModalOpen !== 'true' &&
          document.body.dataset.worldMapModalOpen !== 'true' &&
          (gameStateRef.current === 'playing' || gameStateRef.current === 'paused')
        ) {
          onRequestPauseToggleRef.current();
        }
      }
      // While Ctrl is held (e.g. sneaking), stop Ctrl+<movement key> from firing browser shortcuts.
      if (gameStateRef.current === 'playing' && e.ctrlKey) {
        const movementKeys = [kb.moveForward, kb.moveBackward, kb.moveLeft, kb.moveRight, kb.jump];
        if (movementKeys.some((bound) => matchesKeyBinding(e.code, bound))) {
          e.preventDefault();
        }
      }
      // If Skyrim Inventory [Tab], Favorites [Q], or Full-Screen Map [M] modal is open, let the modal handle keys!
      if (
        document.body.dataset.skyrimModalOpen === 'true' ||
        document.body.dataset.worldMapModalOpen === 'true'
      ) {
        return;
      }

      // Toggle Camera Perspective between 3rd-Person Character View and 1st-Person View
      if (e.code === kb.cameraPerspective && !e.repeat && gameStateRef.current === 'playing') {
        playerState.cameraPerspective =
          playerState.cameraPerspective === 'third_person' ? 'first_person' : 'third_person';
      }
      // Deploy Animal Trap on [T] key
      if (e.code === 'KeyT' && !e.repeat && gameStateRef.current === 'playing') {
        deployTrapFromInventory();
      }
      // Toggle Visual Collider Wireframes Debug Mode on F3
      if (e.code === 'F3' && !e.repeat) {
        e.preventDefault();
        worldHandles.colliderDebugHandles.toggle();
        emitHudSnapshot();
      }
      // Performance overlay on F4
      if (e.code === 'F4' && !e.repeat) {
        e.preventDefault();
        togglePerfOverlay();
      }
      // Customizable Hotkey Slots [1], [2], [3], [4]
      if (
        (e.code === kb.hotbarSlot1 ||
          e.code === kb.hotbarSlot2 ||
          e.code === kb.hotbarSlot3 ||
          e.code === kb.hotbarSlot4) &&
        !e.repeat &&
        gameStateRef.current === 'playing'
      ) {
        const slotIdx =
          e.code === kb.hotbarSlot1
            ? 0
            : e.code === kb.hotbarSlot2
              ? 1
              : e.code === kb.hotbarSlot3
                ? 2
                : 3;
        const boundItem = playerState.hotbarSlots?.[slotIdx];
        if (boundItem) {
          if (boundItem.startsWith('trap_')) {
            deployTrapFromInventory(boundItem);
          } else {
            playerState.heldTrapItemId = null;
            equipInventoryItem(playerState, boundItem);
            soundEngine.playFootstep('trail', 1.15);
            emitHudSnapshot();
          }
        }
      }
      // Cycle Arrow Element: Normal Steel -> Fire Arrow -> Wind Storm Arrow
      if (e.code === kb.cycleArrowElement && !e.repeat && gameStateRef.current === 'playing') {
        const order: ArrowElementKind[] = ['normal', 'fire', 'wind'];
        const curr = playerState.arrowKind ?? 'normal';
        playerState.arrowKind = order[(order.indexOf(curr) + 1) % order.length];
        soundEngine.playBowDraw();
      }
      // Ranger Dash / Water Surge
      if (e.code === kb.dash && !e.repeat && gameStateRef.current === 'playing') {
        if ((playerState.dashCooldown ?? 0) <= 0.05) {
          playerState.dashTimer = 0.42;
          playerState.dashCooldown = 1.4;
          soundEngine.playFootstep(playerState.isSwimming ? 'water' : playerState.currentBiome, 1.25);
        }
      }
      // Put away held trap with [R] key
      if (
        e.code === 'KeyR' &&
        !e.repeat &&
        gameStateRef.current === 'playing' &&
        playerState.heldTrapItemId
      ) {
        e.preventDefault();
        playerState.heldTrapItemId = null;
        lastLootNotification = 'Put trap away.';
        lastLootNotificationTimer = 2.0;
        soundEngine.playFootstep('trail', 0.88);
        emitHudSnapshot();
        return;
      }
      // Cancel bow draw with [R] key (or trigger sword attack when holding a sword)
      if (
        (e.code === 'KeyR' || e.code === kb.drawOrSlash) &&
        !e.repeat &&
        gameStateRef.current === 'playing' &&
        !playerState.isSwimming
      ) {
        if (playerState.equippedTool === 'sword' && e.code === kb.drawOrSlash) {
          isSwordAttackHeld = true;
          swordHoldDuration = 0;
          swordHeavyTriggeredDuringHold = false;
        } else if (cancelBowDraw(playerState)) {
          e.preventDefault();
          isMouseBowHeld = false;
          mouseMovedWhileDown = false;
          cameraRig.smoothAimZoom = 0;
          soundEngine.playFootstep('trail', 0.85);
          emitHudSnapshot();
          return;
        }
      }
      // Detect Double-Tap Jump Key (within 500ms) to toggle Flight Mode in God Mode (disabled when mounting/dismounting a ladder!)
      if (
        e.code === kb.jump &&
        !e.repeat &&
        gameStateRef.current === 'playing' &&
        gameSettingsRef.current.godMode !== false
      ) {
        const onOrLookingAtLadder =
          Boolean(playerState.climbingLadderId) ||
          Boolean(
            findLookedAtWatchtowerLadder(
              playerState.x,
              playerState.y,
              playerState.z,
              playerState.yaw,
              playerState.pitch
            )
          );
        if (!onOrLookingAtLadder) {
          const nowMs = performance.now();
          if (nowMs - lastSpaceDownMs <= 500) {
            pendingFlyToggle = true;
            lastSpaceDownMs = -1000;
          } else {
            lastSpaceDownMs = nowMs;
          }
        }
      }
      if (!keysPressed.has(e.code)) {
        keysJustPressed.add(e.code);
      }
      keysPressed.add(e.code);
      if (gameStateRef.current === 'playing') {
        soundEngine.init();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
      const kb = gameSettingsRef.current.keybindings;
      if (e.code === kb.drawOrSlash && gameStateRef.current === 'playing') {
        if (isSwordAttackHeld) {
          isSwordAttackHeld = false;
          playerState.swordChargeTime = 0;
          if (!swordHeavyTriggeredDuringHold) {
            executeSwordSlash(false);
          }
        }
      }
    };

    const onBlurOrHide = () => {
      keysPressed.clear();
      keysJustPressed.clear();
      isDraggingLook = false;
      isMouseBowHeld = false;
      isSwordAttackHeld = false;
      playerState.bowZoomHeld = false;
    };

    let lastPointerLockExitTimeMs = -Infinity;
    const onPointerLockChange = () => {
      if (!document.pointerLockElement) {
        lastPointerLockExitTimeMs = performance.now();
      }
    };

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

    renderer.domElement.tabIndex = -1;
    const handleReacquirePointerLock = () => {
      lastPointerLockExitTimeMs = -Infinity;
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
    window.addEventListener('reacquire-pointer-lock', handleReacquirePointerLock);

    const onContextMenu = (e: MouseEvent) => {
      if (gameStateRef.current === 'playing') {
        e.preventDefault();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      soundEngine.init();
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      mouseDownStartX = e.clientX;
      mouseDownStartY = e.clientY;
      mouseMovedWhileDown = false;

      if (
        document.body.dataset.skyrimModalOpen === 'true' ||
        document.body.dataset.worldMapModalOpen === 'true'
      ) {
        return;
      }

      // When holding a trap in hands: Left-Click places it immediately (and keeps holding if more remain), Right-Click puts it away
      if (playerState.heldTrapItemId) {
        if (e.button === 0) {
          isDraggingLook = true;
          placeHeldTrapAtPreview();
          if (
            document.pointerLockElement !== renderer.domElement &&
            performance.now() - lastPointerLockExitTimeMs > 1500
          ) {
            try {
              const lockPromise = renderer.domElement.requestPointerLock?.() as
                | Promise<void>
                | undefined;
              if (lockPromise && typeof lockPromise.catch === 'function') {
                lockPromise.catch(() => {});
              }
            } catch {
              // ignore
            }
          }
          return;
        } else if (e.button === 2) {
          playerState.heldTrapItemId = null;
          lastLootNotification = 'Put trap away.';
          lastLootNotificationTimer = 2.0;
          soundEngine.playFootstep('trail', 0.88);
          emitHudSnapshot();
          return;
        }
      }

      if (e.button === 2 && !playerState.isSwimming) {
        if (playerState.equippedTool === 'sword') {
          // Right mouse button with Sword equipped raises Skyrim Horizontal Parry / Block Guard!
          playerState.swordBlocking = true;
          soundEngine.playSwordClash(true);
        } else if (!playerState.staminaExhausted) {
          // Right mouse button in Bow mode ONLY zooms the screen in closer (while stamina is not exhausted)!
          playerState.bowZoomHeld = true;
        }
      } else if (e.button === 0) {
        isDraggingLook = true;
        if (!playerState.isSwimming && playerState.equippedTool === 'sword') {
          // Left mouse button with Sword: tap for quick horizontal cleave, hold >= 0.24s for Heavy Forward Air-Cleaving Power Attack!
          isSwordAttackHeld = true;
          swordHoldDuration = 0;
          swordHeavyTriggeredDuringHold = false;
        } else if (
          !playerState.isSwimming &&
          (playerState.equippedTool ?? 'bow') === 'bow'
        ) {
          const ownsAnyBow = playerState.ownedItemIds
            ? playerState.ownedItemIds.some(
                (id) => id === 'bow' || id === 'elven_longbow' || id === 'dragonbone_bow'
              )
            : true;
          if (ownsAnyBow) {
            // Left mouse button in Bow mode draws the bow and arrow!
            isMouseBowHeld = true;
            if (!playerState.bowDrawn) {
              playerState.bowDrawn = true;
              soundEngine.playBowDraw();
            }
          }
        }
        if (
          document.pointerLockElement !== renderer.domElement &&
          performance.now() - lastPointerLockExitTimeMs > 1500
        ) {
          try {
            const lockPromise = renderer.domElement.requestPointerLock?.() as
              | Promise<void>
              | undefined;
            if (lockPromise && typeof lockPromise.catch === 'function') {
              lockPromise.catch(() => {
                // Ignore browser SecurityError cooldown when user recently exited pointer lock
              });
            }
          } catch {
            // Ignore synchronous PointerLock rejection if unsupported or blocked
          }
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      const sens = gameSettingsRef.current.mouseSensitivity ?? 1.0;
      if (document.pointerLockElement === renderer.domElement) {
        accumYawDelta -= e.movementX * 0.0022 * sens;
        accumPitchDelta -= e.movementY * 0.0022 * sens;
      } else if (isDraggingLook) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        accumYawDelta -= dx * 0.0045 * sens;
        accumPitchDelta -= dy * 0.0045 * sens;
        if (Math.hypot(e.clientX - mouseDownStartX, e.clientY - mouseDownStartY) > 16) {
          mouseMovedWhileDown = true;
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      isDraggingLook = false;
      if (e.button === 2) {
        if (playerState.swordBlocking) {
          playerState.swordBlocking = false;
        }
        if (playerState.bowZoomHeld) {
          playerState.bowZoomHeld = false;
        }
      }
      if (e.button === 0 && isSwordAttackHeld) {
        isSwordAttackHeld = false;
        playerState.swordChargeTime = 0;
        if (!swordHeavyTriggeredDuringHold && !mouseMovedWhileDown) {
          executeSwordSlash(false);
        }
      }
      if (e.button === 0 && isMouseBowHeld) {
        isMouseBowHeld = false;
        const isLocked = document.pointerLockElement === renderer.domElement;
        if (
          playerState.bowDrawn &&
          (playerState.bowDrawProgress ?? 0) >= MIN_BOW_DRAW_TO_SHOOT &&
          (isLocked || !mouseMovedWhileDown || playerState.bowDrawProgress >= 0.35)
        ) {
          fireArrowNow();
        } else {
          playerState.bowDrawn = false;
          playerState.bowDrawProgress = 0;
        }
      }
    };

    // Touch look support on mobile
    let touchLookId: number | null = null;
    let lastTouchX = 0;
    let lastTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing') return;
      soundEngine.init();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (touchLookId === null) {
          touchLookId = t.identifier;
          lastTouchX = t.clientX;
          lastTouchY = t.clientY;
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing' || touchLookId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchLookId) {
          const dx = t.clientX - lastTouchX;
          const dy = t.clientY - lastTouchY;
          lastTouchX = t.clientX;
          lastTouchY = t.clientY;
          accumYawDelta -= dx * 0.005;
          accumPitchDelta -= dy * 0.005;
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchLookId) {
          touchLookId = null;
        }
      }
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrHide);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });
    renderer.domElement.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // 8. Main Animation Loop with Software-WebGL Pacing Guard
    let elapsedTotal = 0;
    let lastHudEmitTime = 0;
    const perfStats = new PerfStats();
    const perfOverlay: { el: HTMLPreElement | null; timer: number } = { el: null, timer: 0 };

    /** Copies a computed camera pose onto the three.js camera. */
    function applyCameraPose(pose: ICameraPose) {
      camera.position.set(pose.x, pose.y, pose.z);
      if (pose.mode === 'euler') {
        _euler.set(pose.pitch, pose.yaw, pose.roll, 'YXZ');
        camera.quaternion.setFromEuler(_euler);
      } else {
        _camTargetLook.set(pose.lookX, pose.lookY, pose.lookZ);
        camera.lookAt(_camTargetLook);
      }
    }

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
    /** Interpolated copy of the player that the camera and meshes render from. */
    const renderPlayer: IPlayerState = { ...playerState };

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
    function interpolateRenderPlayer(alpha: number) {
      Object.assign(renderPlayer, playerState);
      renderPlayer.x = lerp(previousPlayerPose.x, playerState.x, alpha);
      renderPlayer.y = lerp(previousPlayerPose.y, playerState.y, alpha);
      renderPlayer.z = lerp(previousPlayerPose.z, playerState.z, alpha);
      renderPlayer.yaw = lerpAngle(previousPlayerPose.yaw, playerState.yaw, alpha);
      renderPlayer.pitch = lerp(previousPlayerPose.pitch, playerState.pitch, alpha);
      if (playerState.mountedHorseYaw !== undefined) {
        renderPlayer.mountedHorseYaw = lerpAngle(
          previousPlayerPose.mountedHorseYaw,
          playerState.mountedHorseYaw,
          alpha
        );
      }
      const bobDelta = playerState.bobPhase - previousPlayerPose.bobPhase;
      if (bobDelta >= 0 && bobDelta < Math.PI * 2) {
        renderPlayer.bobPhase = lerp(previousPlayerPose.bobPhase, playerState.bobPhase, alpha);
      }
      renderPlayer.bobAmount = lerp(previousPlayerPose.bobAmount, playerState.bobAmount, alpha);
    }

    /** Advances the game simulation by exactly one fixed step. */
    function simulateStep(rawDt: number) {
      if (gameStateRef.current === 'title') {
        elapsedTotal += rawDt;
        worldHours = advanceWorldClock(worldHours, rawDt, TITLE_CLOCK_HOURS_PER_SECOND);
        currentWeather = computeWeatherState(
          getSeasonClockSeconds(),
          camera.position.x,
          camera.position.z,
          activeWeatherMode,
          getEffectiveForcedWeather()
        );
        currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);

      } else if (gameStateRef.current === 'playing') {
        elapsedTotal += rawDt;
        capturePreviousPlayerPose();

        if (isSleepingInBed) {
          if (activeSleepingBed) {
            playerState.x = activeSleepingBed.x;
            playerState.z = activeSleepingBed.z;
            playerState.y = activeSleepingBed.y + 0.45;
            playerState.vx = 0;
            playerState.vy = 0;
            playerState.vz = 0;
          }
          const prevSleepHours = worldHours;
          const sleepClock = advanceSleepClock(worldHours, rawDt);
          worldHours = sleepClock.hours;
          const sleptHoursDelta = ((worldHours - prevSleepHours) + 24) % 24;
          inGameHoursElapsed += sleptHoursDelta;
          if (sleepClock.hasReachedMorning) {
            isSleepingInBed = false;
            playerState.pitch = 0;
            if (preSleepPlayerPos) {
              playerState.x = preSleepPlayerPos.x;
              playerState.z = preSleepPlayerPos.z;
              playerState.y = walkableHeightAt(preSleepPlayerPos.x, preSleepPlayerPos.z, preSleepPlayerPos.y).height;
            }
            activeSleepingBed = null;
            preSleepPlayerPos = null;
            playerState.stamina = playerState.maxStamina ?? 100;
            playerState.staminaExhausted = false;
            lastLootNotification = t('notifications.awoke');
            lastLootNotificationTimer = 3.5;
            emitHudSnapshot();
          }
        } else {
          worldHours = advanceWorldClock(worldHours, rawDt, PLAY_CLOCK_HOURS_PER_SECOND);
          inGameHoursElapsed += rawDt * PLAY_CLOCK_HOURS_PER_SECOND;
        }
        playerState.worldDaysElapsed = Math.floor(inGameHoursElapsed / 24);
        if (checkAndRestockMerchants(playerState, playerState.worldDaysElapsed)) {
          lastLootNotification = 'Harbor Market merchants have restocked their supplies!';
          lastLootNotificationTimer = 4.0;
        }
        currentWeather = computeWeatherState(
          getSeasonClockSeconds(),
          playerState.x,
          playerState.z,
          activeWeatherMode,
          getEffectiveForcedWeather(),
          forcedSeason === 'auto' ? null : forcedSeason
        );
        currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);

        if (
          (currentWeather.thunderTriggered || currentWeather.lightningFlash > 0.25) &&
          elapsedTotal - lastThunderTime > 2.2
        ) {
          lastThunderTime = elapsedTotal;
          soundEngine.playThunderRumble();
        }

        const kb = gameSettingsRef.current.keybindings;
        const spdMult = gameSettingsRef.current.walkSpeedMultiplier ?? 1.0;
        if (gameSettingsRef.current.godMode === false && playerState.isFlying) {
          playerState.isFlying = false;
        }
        readMovementAxes(
          keysPressed,
          kb,
          virtualMoveRef.current,
          document.body.dataset.skyrimModalOpen === 'true' ||
            document.body.dataset.worldMapModalOpen === 'true',
          movementAxes
        );
        const { forward, right } = movementAxes;
        if (isSleepingInBed && (Math.abs(forward) > 0.1 || Math.abs(right) > 0.1)) {
          isSleepingInBed = false;
          playerState.pitch = 0;
          if (preSleepPlayerPos) {
            playerState.x = preSleepPlayerPos.x;
            playerState.z = preSleepPlayerPos.z;
            playerState.y = walkableHeightAt(preSleepPlayerPos.x, preSleepPlayerPos.z, preSleepPlayerPos.y).height;
          }
          activeSleepingBed = null;
          preSleepPlayerPos = null;
        }

        // Interactive Looting of Hunted Animal, Opening Chest, Sleeping in Bed, Trapper's Workbench, Minecart Driving, OR Door Toggle when pressing interactDoor ([E])
        if (keysJustPressed.has(kb.interactDoor)) {
          if (activeMinecartRide && tryBoardOrExitMinecart()) {
            // Exited active minecart via [E]
          } else if (harvestOrPickupNearbyTrap()) {
            // Handled placed trap!
          } else {
            const nearDeadAnimal = findNearestDeadLootableAnimal(
              playerState.x,
              playerState.z
            );
            const nearDeadDwarf = !nearDeadAnimal
              ? findNearestDeadLootableDwarf(
                  playerState.x,
                  playerState.z,
                  3.4,
                  playerState.isFlying ? playerState.y : undefined
                )
              : null;
            const nearDeadBird = getActiveWorldBirds().find(
              (b) =>
                b.isDead &&
                !b.isLooted &&
                Math.hypot(b.x - playerState.x, b.z - playerState.z) <= 3.5
            );
            if (nearDeadAnimal) {
              getOrInitAnimalCorpseLoot(nearDeadAnimal, activeArrows);
              openDoorIds.add(`corpse-animal-${nearDeadAnimal.id}`);
              soundEngine.playFootstep('trail', 1.15);
              emitHudSnapshot();
              const win = window as unknown as {
                openInventoryModal?: (open?: boolean, cat?: string) => void;
              };
              win.openInventoryModal?.(true, 'chest');
            } else if (nearDeadDwarf) {
              getOrInitDwarfCorpseLoot(nearDeadDwarf, activeArrows);
              soundEngine.playFootstep('trail', 1.15);
              emitHudSnapshot();
              const win = window as unknown as {
                openInventoryModal?: (open?: boolean, cat?: string) => void;
              };
              win.openInventoryModal?.(true, 'chest');
            } else if (nearDeadBird) {
              nearDeadBird.isLooted = true;
              if (!playerState.ownedItemIds) playerState.ownedItemIds = [];
              playerState.ownedItemIds.push('raw_game_meat', 'raw_game_meat', 'animal_bone');
              awardSkillXp(playerState, 'archery', 24);
              lastLootNotification = 'Harvested Wild Dove: Raw Game Meat ×2, Animal Bone ×1';
              lastLootNotificationTimer = 4.5;
              soundEngine.playFootstep('trail', 1.18);
              emitHudSnapshot();
            } else {
              const bestInteract = resolveBestLookedAtInteraction(
                playerState.x,
                playerState.y,
                playerState.z,
                playerState.yaw,
                playerState.pitch
              );
              if (bestInteract.kind === 'trap_workbench') {
                soundEngine.playFootstep('cabin', 1.05);
                const win = window as unknown as {
                  openTrapCraftingModal?: (open?: boolean) => void;
                };
                win.openTrapCraftingModal?.(true);
              } else if (bestInteract.kind === 'chest' && bestInteract.chest) {
                const nearChest = bestInteract.chest;
                openDoorIds.add(nearChest.id);
                if (!playerState.openedChestIds) playerState.openedChestIds = [];
                if (!playerState.openedChestIds.includes(nearChest.id)) {
                  playerState.openedChestIds.push(nearChest.id);
                }
                soundEngine.playFootstep('bridge', 1.15);
                emitHudSnapshot();
                const win = window as unknown as {
                  openInventoryModal?: (open?: boolean, cat?: string) => void;
                };
                win.openInventoryModal?.(true, 'chest');
              } else if (bestInteract.kind === 'bed' && bestInteract.bed) {
                const nearBed = bestInteract.bed;
                const dangerNearby = getActiveWorldAnimals().some(
                  (a) =>
                    !a.isDead &&
                    isPredatorSpecies(a.species) &&
                    Math.hypot(a.x - playerState.x, a.z - playerState.z) < 24.0
                );
                const isNightTime = isSleepingAllowedAt(worldHours);
                if (dangerNearby) {
                  lastLootNotification = t('notifications.sleep_danger');
                  lastLootNotificationTimer = 3.2;
                  emitHudSnapshot();
                } else if (!isNightTime) {
                  lastLootNotification = t('notifications.sleep_day_only');
                  lastLootNotificationTimer = 3.2;
                  emitHudSnapshot();
                } else {
                  preSleepPlayerPos = { x: playerState.x, y: playerState.y, z: playerState.z };
                  activeSleepingBed = nearBed;
                  isSleepingInBed = true;
                  // Place player directly onto the bed mattress while sleeping!
                  playerState.x = nearBed.x;
                  playerState.z = nearBed.z;
                  playerState.y = nearBed.y + 0.45;
                  playerState.vx = 0;
                  playerState.vy = 0;
                  playerState.vz = 0;
                  if (nearBed.yaw !== undefined) {
                    playerState.yaw = nearBed.yaw;
                  }
                  // Lying on back on the bed / sleeping bag looking straight up at the ceiling!
                  playerState.pitch = 1.42;
                  lastLootNotification = t('notifications.sleeping');
                  lastLootNotificationTimer = 3.5;
                  soundEngine.playFootstep('cabin', 0.8);
                  emitHudSnapshot();
                }
              } else if (bestInteract.kind === 'door' && bestInteract.door) {
                const nearDoor = bestInteract.door;
                if (openDoorIds.has(nearDoor.id)) {
                  openDoorIds.delete(nearDoor.id);
                } else {
                  openDoorIds.add(nearDoor.id);
                }
                soundEngine.playFootstep('bridge', 0.85);
              } else {
                const nearFallenTree = findNearestFallenTree(
                  playerState.x,
                  playerState.z,
                  4.4
                );
                if (nearFallenTree) {
                  const harvestRes = harvestFallenTree(
                    playerState,
                    nearFallenTree,
                    obstacles
                  );
                  if (harvestRes.ok && harvestRes.notification) {
                    lastLootNotification = harvestRes.notification;
                    lastLootNotificationTimer = 4.2;
                    soundEngine.playFootstep('bridge', 1.12);
                    emitHudSnapshot();
                  }
                } else {
                  tryBoardOrExitMinecart();
                }
              }
            }
          }
        }

        if (
          openDoorIds.has('chest-hunter-lodge') &&
          document.body.dataset.skyrimModalOpen !== 'true'
        ) {
          openDoorIds.delete('chest-hunter-lodge');
        }

        // Virtual bow draw button on touch / HUD
        if (virtualMoveRef.current.drawBow) {
          if (!playerState.bowDrawn) {
            playerState.bowDrawn = true;
            soundEngine.playBowDraw();
          }
        }

        stepBowFeel(
          playerState,
          rawDt,
          isMouseBowHeld || Boolean(virtualMoveRef.current.drawBow)
        );

        // Update Long-Press Sword Power Attack Charge (holding Left-Click or [R] >= 0.24s triggers Heavy Forward Air-Cleaving Attack!)
        if (isSwordAttackHeld && !playerState.isSwimming && playerState.equippedTool === 'sword') {
          swordHoldDuration += rawDt;
          if (!swordHeavyTriggeredDuringHold) {
            playerState.swordChargeTime = Math.min(1.0, swordHoldDuration / 0.24);
            if (swordHoldDuration >= 0.24 && !mouseMovedWhileDown) {
              swordHeavyTriggeredDuringHold = true;
              executeSwordSlash(true);
            }
          }
        } else {
          playerState.swordChargeTime = Math.max(0, (playerState.swordChargeTime ?? 0) - rawDt * 6.0);
        }

        // Step 5-Phase Sword Slash Progress & Synchronized Phase C Active Strike Window Hit Detection
        if ((playerState.swordSwingProgress ?? 0) > 0) {
          const strikeWindowRes = stepSwordSwingCombat(playerState, obstacles, rawDt);
          if (strikeWindowRes) {
            handleSwordStrikeImpactFeedback(strikeWindowRes);
          }
        }
        const treeStepRes = stepTreeFellingSystem(rawDt, playerState, obstacles);
        if (treeStepRes.playerDamaged) {
          lastLootNotification =
            treeStepRes.notification ??
            `Crushed by falling tree! (-${treeStepRes.damageAmount} HP)`;
          lastLootNotificationTimer = 4.0;
          soundEngine.playSwordClash(true);
          emitHudSnapshot();
        }

        // Tick deployed hunting traps against wildlife
        const liveWildlife = getActiveWorldAnimals();
        const trapTickRes = tickPlacedAnimalTraps(
          worldPlacedTraps,
          liveWildlife,
          rawDt,
          inGameHoursElapsed * 3600
        );
        if (trapTickRes.bearTrapNotifications.length > 0) {
          lastLootNotification = trapTickRes.bearTrapNotifications[0];
          lastLootNotificationTimer = 4.5;
          soundEngine.playSwordClash(true);
          emitHudSnapshot();
        } else if (trapTickRes.newlySprungTraps.length > 0) {
          const sprungTrap = trapTickRes.newlySprungTraps[0];
          const trapDef = TRAP_RECIPES.find((r) => r.kind === sprungTrap.kind);
          lastLootNotification = `${trapDef?.name ?? 'Trap'} caught a Lv.${sprungTrap.caughtAnimalLevel ?? 1} ${sprungTrap.caughtAnimalName ?? 'Animal'}! Press [E] near trap to harvest.`;
          lastLootNotificationTimer = 4.5;
          soundEngine.playFootstep('bridge', 1.15);
          emitHudSnapshot();
        }
        if (playerState.lastLootNotification && playerState.lastLootNotification.timer > 0) {
          playerState.lastLootNotification.timer = Math.max(
            0,
            playerState.lastLootNotification.timer - rawDt
          );
          if (playerState.lastLootNotification.timer > 0 && lastLootNotificationTimer <= 0) {
            lastLootNotification = playerState.lastLootNotification.text;
            lastLootNotificationTimer = playerState.lastLootNotification.timer;
          }
        }
        stepMeleeFeelAndSway(playerState, {
          dt: rawDt,
          lookYawDelta: accumYawDelta,
          lookPitchDelta: accumPitchDelta,
          landingDip,
        });

        // Step active 3D Arrows in flight
        if (activeArrows.length > 0) {
          const arrowRes = stepArrowsPhysics(activeArrows, obstacles, rawDt);
          if (arrowRes.hitAnimal) {
            const spName = getAnimalSpeciesName(arrowRes.hitAnimal.species);
            playerState.lastArrowHitTarget = String(arrowRes.hitAnimal.id);
            lastHitAnimal = arrowRes.hitAnimal;
            lastHitAnimalTimer = arrowRes.killedAnimal ? 1.8 : 6.0;
            lastArrowHitTargetName = arrowRes.killedAnimal
              ? t('notifications.animal_hunted', { species: spName, key: formatKeyCodeLabel(gameSettingsRef.current.keybindings.interactDoor) })
              : t('notifications.animal_hit', { species: spName });
            lastArrowHitTimer = arrowRes.killedAnimal ? 4.0 : 2.5;
            awardSkillXp(playerState, 'archery', arrowRes.killedAnimal ? 36 : 18);
            soundEngine.playArrowHit(true);
            emitHudSnapshot();
          } else if (arrowRes.hitTarget) {
            playerState.lastArrowHitTarget = arrowRes.hitTarget.id;
            lastArrowHitTargetName = arrowRes.hitTarget.name;
            lastArrowHitTimer = 3.5;
            awardSkillXp(playerState, 'archery', 32);
            soundEngine.playArrowHit(true);
            emitHudSnapshot();
          } else if (arrowRes.hitAnySurface) {
            soundEngine.playArrowHit(false);
          }
        }
        if (lastArrowHitTimer > 0) {
          lastArrowHitTimer = Math.max(0, lastArrowHitTimer - rawDt);
        }
        if (lastHitAnimalTimer > 0) {
          lastHitAnimalTimer = Math.max(0, lastHitAnimalTimer - rawDt);
        }
        if (lastLootNotificationTimer > 0) {
          lastLootNotificationTimer = Math.max(0, lastLootNotificationTimer - rawDt);
        }

        const sprint =
          virtualMoveRef.current.sprint ||
          isBindingHeld(keysPressed, kb.sprint);

        const relaxed =
          virtualMoveRef.current.relaxed ||
          isBindingHeld(keysPressed, kb.relaxedWalk);

        const jumpPressed =
          virtualMoveRef.current.jump || keysJustPressed.has(kb.jump);
        const jumpHeld =
          virtualMoveRef.current.jump || keysPressed.has(kb.jump);
        const toggleMountHorsePressed = keysJustPressed.has(kb.mountHorse);
        if (toggleMountHorsePressed && tryBoardOrExitMinecart()) {
          // Handled rideable minecart boarding/exiting via [F]
        }

        const triggerFlyToggle = pendingFlyToggle;
        pendingFlyToggle = false;
        keysJustPressed.clear();

        const subSteps = playerState.isFlying ? 1 : Math.max(1, Math.ceil(rawDt / 0.05));
        const subDt = rawDt / subSteps;
        let anySteppedFoot = false;
        let maxLandedImpact = 0;

        playerState.isSleeping = isSleepingInBed;
        if (activeMinecartRide) {
          if (jumpPressed) {
            activeMinecartRide = null;
            playerState.y = walkableHeightAt(playerState.x, playerState.z, playerState.y).height;
            capturePreviousPlayerPose();
            soundEngine.playFootstep('bridge', 1.08);
            emitHudSnapshot();
          } else {
            const pose0 = evaluateRideableMinecartPose(
              activeMinecartRide.lineId,
              activeMinecartRide.u
            );
            const lookDot =
              -Math.sin(playerState.yaw) * Math.sin(pose0.yaw) -
              Math.cos(playerState.yaw) * Math.cos(pose0.yaw);
            if (Math.abs(lookDot) > 0.25) {
              activeMinecartRide.facingSign = lookDot >= 0 ? 1 : -1;
            }
            let throttleAlongU =
              Math.max(-1, Math.min(1, forward)) * activeMinecartRide.facingSign;
            // At track endpoints, pressing [W] (forward > 0) always drives away from the bumper down the track
            if (activeMinecartRide.u <= 0.03 && forward > 0.05 && throttleAlongU < 0) {
              activeMinecartRide.facingSign = 1;
              throttleAlongU = Math.min(1, Math.abs(forward));
            } else if (activeMinecartRide.u >= 0.97 && forward > 0.05 && throttleAlongU > 0) {
              activeMinecartRide.facingSign = -1;
              throttleAlongU = -Math.min(1, Math.abs(forward));
            }
            const stepRes = stepRideableMinecartPhysics(
              activeMinecartRide.lineId,
              activeMinecartRide.u,
              activeMinecartRide.velocity,
              activeMinecartRide.wheelAngle,
              throttleAlongU,
              rawDt
            );
            activeMinecartRide.u = stepRes.u;
            activeMinecartRide.velocity = stepRes.velocity;
            activeMinecartRide.wheelAngle = stepRes.wheelAngle;
            playerState.x = stepRes.pose.x;
            playerState.y = stepRes.pose.y + 0.55;
            playerState.z = stepRes.pose.z;
            playerState.vx = 0;
            playerState.vy = 0;
            playerState.vz = 0;
            playerState.yaw += accumYawDelta;
            playerState.pitch = Math.max(-1.35, Math.min(1.35, playerState.pitch + accumPitchDelta));
          }
        } else if (isSleepingInBed && activeSleepingBed) {
          playerState.x = activeSleepingBed.x;
          playerState.z = activeSleepingBed.z;
          playerState.y = activeSleepingBed.y + 0.45;
          playerState.vx = 0;
          playerState.vy = 0;
          playerState.vz = 0;
          playerState.yaw += accumYawDelta;
          playerState.pitch = Math.max(1.05, Math.min(1.53, playerState.pitch + accumPitchDelta));
        } else {
          const prevMountedId = playerState.mountedHorseId;
          for (let s = 0; s < subSteps; s++) {
            const prevVy = playerState.vy;
            const res = stepPlayerPhysics(
              playerState,
              {
                forward: Math.max(-1, Math.min(1, forward)) * spdMult,
                right: Math.max(-1, Math.min(1, right)) * spdMult,
                sprint,
                relaxed,
                jumpPressed: s === 0 ? jumpPressed : false,
                jumpHeld,
                toggleFlyRequested: s === 0 ? triggerFlyToggle : false,
                toggleMountHorseRequested: s === 0 ? toggleMountHorsePressed : false,
                lookYawDelta: s === 0 ? accumYawDelta : 0,
                lookPitchDelta: s === 0 ? accumPitchDelta : 0,
              },
              obstacles,
              subDt,
              openDoorIds,
              rideableHorses
            );
            if (
              s === 0 &&
              jumpPressed &&
              playerState.vy > prevVy + 2.0 &&
              (gameSettingsRef.current.jumpForceMultiplier ?? 1.0) !== 1.0
            ) {
              playerState.vy *= gameSettingsRef.current.jumpForceMultiplier ?? 1.0;
            }
            if (res.steppedFoot) anySteppedFoot = true;
            if (res.landedImpact > maxLandedImpact) maxLandedImpact = res.landedImpact;
          }
          if (prevMountedId !== playerState.mountedHorseId) {
            capturePreviousPlayerPose();
          }
          const vitalsRes = stepSurvivalVitals(
            playerState,
            rawDt,
            sprint,
            gameSettingsRef.current.godMode !== false
          );
          if (vitalsRes.starvedOrDied) {
            lastLootNotification = 'You collapsed from exhaustion and awoke inside the cabin.';
            lastLootNotificationTimer = 4.5;
            capturePreviousPlayerPose();
            emitHudSnapshot();
          }
          if (playerState.lastTameNotice) {
            if (playerState.mountedHorseId) {
              const mountMatch = playerState.mountedHorseId.match(/^mount-(?:lion|stag)-(\d+)$/);
              if (mountMatch) {
                const animId = Number(mountMatch[1]);
                const rec = recoverArrowsFromAnimal(
                  animId,
                  activeArrows,
                  playerState,
                  playerState.x,
                  playerState.z
                );
                if (rec.recoveredCount > 0 && playerState.lastTameNotice === 'tamed_boss_lion') {
                  lastLootNotification = `Fed Meat & Tamed Boss CatLion! (+${rec.recoveredCount} Arrows Recovered, Space: Attack)`;
                  playerState.lastTameNotice = null;
                  lastLootNotificationTimer = 4.5;
                  emitHudSnapshot();
                }
              }
            }
            if (playerState.lastTameNotice) {
              if (playerState.lastTameNotice === 'meat_required_for_lion') {
                lastLootNotification = 'You need Meat in your inventory to tame the subdued Boss CatLion!';
              } else if (playerState.lastTameNotice === 'tamed_boss_lion') {
                lastLootNotification = 'Fed Meat & Tamed Boss CatLion! (Space: Stationary Attack, Shift: Sprint)';
              } else if (playerState.lastTameNotice === 'tamed_stag') {
                lastLootNotification = 'Tamed & Mounted Royal Celestial Stag! (Space: Sky-Leap, Shift: Gallop)';
              }
              playerState.lastTameNotice = null;
              lastLootNotificationTimer = 4.5;
              emitHudSnapshot();
            }
          } else if (!prevMountedId && playerState.mountedHorseId) {
            const mountMatch = playerState.mountedHorseId.match(/^mount-(?:lion|stag)-(\d+)$/);
            if (mountMatch) {
              recoverArrowsFromAnimal(
                Number(mountMatch[1]),
                activeArrows,
                playerState,
                playerState.x,
                playerState.z
              );
            }
            if (playerState.mountedHorseId.startsWith('mount-stag-')) {
              lastLootNotification = 'Mounted Royal Celestial Stag! (Space: Sky-Leap, Shift: Gallop)';
              lastLootNotificationTimer = 4.2;
              emitHudSnapshot();
            } else if (playerState.mountedHorseId.startsWith('mount-lion-')) {
              lastLootNotification = 'Mounted Mystical Boss CatLion! (Space: Stationary Attack, Shift: Sprint)';
              lastLootNotificationTimer = 4.2;
              emitHudSnapshot();
            }
          }
        }
        accumYawDelta = 0;
        accumPitchDelta = 0;

        if (anySteppedFoot) {
          const pitchMod = playerState.mountedHorseId
            ? 0.72
            : playerState.isSwimming
              ? 0.85
              : playerState.walkPace === 'fast'
                ? 1.14
                : playerState.walkPace === 'relaxed'
                  ? 0.88
                  : 1.0;
          soundEngine.playFootstep(
            playerState.mountedHorseId
              ? 'trail'
              : playerState.isSwimming
                ? 'water'
                : playerState.currentBiome,
            pitchMod
          );
        }
        if (maxLandedImpact > 0.1) {
          landingDip = maxLandedImpact * 0.22;
          soundEngine.playFootstep(playerState.currentBiome, 0.82);
        }
        landingDip *= Math.exp(-12 * rawDt);

        worldHandles.simulateWildlife(
          rawDt,
          elapsedTotal,
          playerState,
          rideableHorses,
          currentAtmo.nightFactor,
          currentWeather,
          wildlifeSoundCallbacks
        );

        // Auto-close chest lid if player walked away (> 4.2m)
        if (openDoorIds.has('chest-hunter-lodge')) {
          const chest = findNearestWorldChest(playerState.x, playerState.y, playerState.z);
          if (!chest || Math.hypot(playerState.x - chest.x, playerState.z - chest.z) > 4.2) {
            openDoorIds.delete('chest-hunter-lodge');
          }
        }

        // Periodic auto-save to isolated world save slot (Survival vs Creative)
        worldSaveTimer += rawDt;
        if (worldSaveTimer >= 30) {
          worldSaveTimer = 0;
          const tSave = performance.now();
          saveCurrentWorld();
          perfStats.record('save', performance.now() - tSave);
        }
      }
    }

    /** Renders one frame from the simulation state, interpolated by `alpha`. */
    function renderFrame(frameDt: number, now: number, alpha: number) {
      soundEngine.setMuted(mutedRef.current);
      soundEngine.setPaused(gameStateRef.current !== 'playing');

      // Simulation time of the interpolated moment being drawn.
      const renderTime = elapsedTotal - (1 - alpha) * SIMULATION_STEP_SECONDS;
      if (gameStateRef.current === 'title') {
        writeTitleOrbitPose(renderTime, cameraPose);
        applyCameraPose(cameraPose);
        worldHandles.update(
          renderTime,
          camera.position.x,
          camera.position.z,
          currentAtmo.morningMistOpacity,
          currentAtmo.nightFactor,
          currentWeather,
          openDoorIds,
          rideableHorses,
          null,
          undefined,
          activeArrows,
          worldHours
        );
      } else if (gameStateRef.current === 'playing') {
        interpolateRenderPlayer(alpha);
        const underRoof = isPositionUnderRoof(renderPlayer.x, renderPlayer.y, renderPlayer.z);
        const distToBirdsFlock = Math.hypot(renderPlayer.x, renderPlayer.z - 15);
        const birdProximity = Math.max(0, Math.min(1, 1.0 - (distToBirdsFlock - 35) / 85));

        soundEngine.updateAmbient(
          frameDt,
          renderPlayer.x,
          renderPlayer.z,
          true,
          currentWeather.windStrength,
          currentWeather.rainIntensity,
          currentAtmo.isNight,
          underRoof,
          birdProximity
        );

        stepCameraRig(
          cameraRig,
          { player: renderPlayer, dt: frameDt, elapsedSeconds: renderTime, landingDip, isSleepingInBed },
          cameraPose
        );
        applyCameraPose(cameraPose);

        const camWaterY = getWaterSurfaceHeightAt(
          camera.position.x,
          camera.position.z,
          renderPlayer.y
        );
        if (camWaterY !== null && camera.position.y < camWaterY + 0.05) {
          fog.color.setHex(0x0c4a6e);
          fog.density = 0.038;
        }

        const easedFov = easeFovToward(camera.fov, computeTargetFov(cameraRig, renderPlayer), frameDt);
        if (easedFov !== null) {
          camera.fov = easedFov;
          camera.updateProjectionMatrix();
        }

        const shadowTargetX = Math.round(renderPlayer.x * 0.25) * 4;
        const shadowTargetY = renderPlayer.isFlying ? Math.min(renderPlayer.y, 12) : renderPlayer.y;
        const shadowTargetZ = Math.round(renderPlayer.z * 0.25) * 4;
        sunLight.target.position.set(shadowTargetX, shadowTargetY, shadowTargetZ);
        sunLight.position
          .copy(_sunVec)
          .multiplyScalar(85)
          .add(sunLight.target.position);

        worldHandles.update(
          renderTime,
          renderPlayer.x,
          renderPlayer.z,
          currentAtmo.morningMistOpacity,
          currentAtmo.nightFactor,
          currentWeather,
          openDoorIds,
          rideableHorses,
          renderPlayer.mountedHorseId,
          renderPlayer,
          activeArrows,
          worldHours
        );
      }

      // Synchronize 3D meshes for placed traps
      const activeTrapIds = new Set(worldPlacedTraps.map((t) => t.id));
      for (const [id, entry] of trapMeshesMap.entries()) {
        if (!activeTrapIds.has(id)) {
          worldTrapsGroup.remove(entry.mesh);
          trapMeshesMap.delete(id);
        }
      }
      for (const trap of worldPlacedTraps) {
        const isSprung = trap.status === 'sprung' || Boolean(trap.sprung);
        const existing = trapMeshesMap.get(trap.id);
        if (!existing || existing.sprung !== isSprung) {
          if (existing) {
            worldTrapsGroup.remove(existing.mesh);
          }
          const mesh = createPlacedTrapMesh(trap);
          worldTrapsGroup.add(mesh);
          trapMeshesMap.set(trap.id, { mesh, sprung: isSprung });
        }
      }

      // Synchronize 3D Green/Red Trap Placement Preview Ghost when holding a trap in hands
      if (
        gameStateRef.current === 'playing' &&
        playerState.heldTrapItemId &&
        (playerState.ownedItemIds ?? []).includes(playerState.heldTrapItemId)
      ) {
        const preview = computeTrapPlacementPreview(
          worldPlacedTraps,
          playerState.heldTrapItemId,
          renderPlayer.x,
          renderPlayer.y,
          renderPlayer.z,
          renderPlayer.yaw,
          (gx: number, gz: number) => walkableHeightAt(gx, gz).height,
          WATER_LEVEL,
          renderPlayer.pitch
        );
        if (preview) {
          if (!activeTrapPlacementGhost || activeTrapPlacementGhost.kind !== preview.kind) {
            if (activeTrapPlacementGhost) {
              worldTrapsGroup.remove(activeTrapPlacementGhost.group);
            }
            activeTrapPlacementGhost = buildTrapPlacementPreviewGhost(preview.kind);
            worldTrapsGroup.add(activeTrapPlacementGhost.group);
          }
          activeTrapPlacementGhost.group.visible = true;
          activeTrapPlacementGhost.group.position.set(preview.x, preview.y, preview.z);
          activeTrapPlacementGhost.group.rotation.y = preview.yaw;
          activeTrapPlacementGhost.setValid(preview.valid);
        } else if (activeTrapPlacementGhost) {
          activeTrapPlacementGhost.group.visible = false;
        }
      } else {
        if (activeTrapPlacementGhost) {
          activeTrapPlacementGhost.group.visible = false;
        }
        if (
          playerState.heldTrapItemId &&
          !(playerState.ownedItemIds ?? []).includes(playerState.heldTrapItemId)
        ) {
          playerState.heldTrapItemId = null;
        }
      }

      if (now - lastHudEmitTime > 100) {
        lastHudEmitTime = now;
        emitHudSnapshot();
      }

      sky.position.copy(camera.position);
      sunDiscMesh.position.copy(_sunVec).multiplyScalar(215).add(camera.position);

      renderer.render(scene, camera);
    }

    function emitHudSnapshot() {
      const showEnemyBar =
        lastHitAnimalTimer > 0 &&
        lastHitAnimal !== null &&
        (!lastHitAnimal.isDead || lastHitAnimalTimer > 0.3);
      const combatDwarf = !showEnemyBar
        ? findActiveCombatDwarf(playerState.x, playerState.z)
        : null;
      onTelemetryUpdateRef.current(
        buildTelemetrySnapshot({
          player: playerState,
          horses: rideableHorses,
          openDoorIds,
          atmosphere: currentAtmo,
          weather: currentWeather,
          colliderDebugVisible: worldHandles.colliderDebugHandles.isVisible(),
          pointerLocked: document.pointerLockElement === renderer.domElement,
          lootNotification: lastLootNotificationTimer > 0 ? lastLootNotification : null,
          arrowHitTargetName: lastArrowHitTimer > 0 ? lastArrowHitTargetName : null,
          activeEnemyHealthBar:
            showEnemyBar && lastHitAnimal
              ? {
                  id: lastHitAnimal.id,
                  name: lastHitAnimal.isBoss
                    ? `King ${getAnimalSpeciesName(lastHitAnimal.species)}`
                    : getAnimalSpeciesName(lastHitAnimal.species),
                  level: getAnimalStrengthAndLevel(lastHitAnimal).level,
                  hp: Math.max(0, lastHitAnimal.hp ?? 0),
                  maxHp: Math.max(1, lastHitAnimal.maxHp ?? 1),
                  isBoss: Boolean(lastHitAnimal.isBoss || lastHitAnimal.species === 'dragon'),
                  isSubdued: Boolean(lastHitAnimal.isSubdued),
                }
              : combatDwarf
                ? {
                    id: 9000 + combatDwarf.id,
                    name: `${combatDwarf.name} (Dwarven Warrior)`,
                    level: combatDwarf.level,
                    hp: Math.max(0, combatDwarf.hp),
                    maxHp: Math.max(1, combatDwarf.maxHp),
                    isBoss: false,
                    isSubdued: false,
                  }
                : null,
          isSleepingInBed,
          worldHours,
          forcedSeason,
          placedTraps: worldPlacedTraps,
          activeAnimals: getActiveWorldAnimals(),
          drivingMinecart: activeMinecartRide
            ? {
                lineId: activeMinecartRide.lineId,
                lineName: activeMinecartRide.lineName,
                speed: Math.round(Math.abs(activeMinecartRide.velocity) * 10) / 10,
              }
            : null,
        })
      );
    }

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

    return () => {
      gameLoop.stop();
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurOrHide);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.domElement.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('reacquire-pointer-lock', handleReacquirePointerLock);
      window.removeEventListener('pagehide', onPageHideSave);
      window.clearInterval(perfOverlay.timer);
      perfOverlay.el?.remove();
      document.removeEventListener('visibilitychange', onVisibilitySave);
      saveCurrentWorld();
      onRegisterGameActions?.(null);
      unregisterDebugBridge?.();
      soundEngine.dispose();
      worldScene.dispose();
    };
  }, [virtualMoveRef]);

  if (fatalTickError) {
    // Rethrow during render so the root ErrorBoundary logs it and shows the recovery screen.
    throw fatalTickError;
  }

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-stone-950 cursor-grab active:cursor-grabbing"
      aria-label={t('ui.canvas_aria')}
    />
  );
});
WorldCanvas.displayName = 'WorldCanvas';
// #endregion
