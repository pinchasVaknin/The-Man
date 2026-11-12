// ============================================================================
// MODULE: World / Controllers / Render Frame
// DESIGN: Draws one frame from the simulation state, interpolated between fixed steps (SRP)
// SUMMARY: The camera, the interpolated player, the world meshes and the trap placement ghost. The canvas builds the
//          renderer once with the objects it needs, and the game loop calls it every frame.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { nearestWaterDistance } from '../domain/waterProximity';
import type { ICameraRigState } from '../systems/cameraRigSystem';
import type { IPlacedTrapSync } from './placedTrapSync';
import type { IRestAndRideState } from '../domain/restAndRideState';
import type { ISimulationState } from '../domain/simulationState';
import type { IAnimatedWorldHandles } from '../proceduralModels';
import { t } from '../../locales';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PerfStats } from '../../core/perfStats';
import { SOLID_BUILDING_BOXES } from '../terrainMath';
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
import { useAppServices } from '../../app/AppServicesContext';
import type {
  GameStateMode,
  ITelemetrySnapshot,
  IVirtualMoveState,
} from '../domain/gameShellTypes';
import { GameLoop } from '../../core/gameLoop';
import { lerp, lerpAngle } from '../../core/interpolation';
import type { IWildlifeSoundCallbacks } from '../builders/wildlifeAndFootprintsBuilder';
import type { IPlayerState } from '../domain/worldTypes';
import {
  getAnimalStrengthAndLevel,
  getActiveWorldBirds,
  getOrInitAnimalCorpseLoot,
  resetActiveWorldBirds,
  type ISmallAnimalState,
} from '../systems/boidsAndWildlifeSystem';
import { WATER_LEVEL } from '../domain/landmarksRegistry';
import { parseAndValidateUrlOverrides } from '../../core/config';
import { createWorldScene } from '../builders/worldSceneBuilder';
import { NatureSoundEngine } from '../soundEngine';
import { applyDynamicAtmosphereToScene } from '../controllers/atmosphereRenderController';
import { isPlayerUnderground, setCameraUndergroundMask } from '../controllers/undergroundCulling';
import { createPlacedTrapSync } from '../controllers/placedTrapSync';
import { createPerfDebugTools } from '../controllers/perfDebugTools';
import { createHudFeedbackState } from '../domain/hudFeedbackState';
import type { ITimeAndSeasonState } from '../domain/timeAndSeasonState';
import { createSimulationState } from '../domain/simulationState';
import { createLookInputState } from '../domain/lookInputState';
import { createActionInputState } from '../domain/actionInputState';
import { createRestAndRideState } from '../domain/restAndRideState';
import { buildHudTelemetryInput } from '../controllers/hudEmitter';
import { attachInputListeners } from '../controllers/inputController';
import { createSimulationStep } from '../controllers/simulationStep';
import { registerWindowDebugBridge } from '../controllers/windowDebugController';
import {
  createAnimationFrameScheduler,
  createGpuFencePacedScheduler,
} from '../controllers/frameSchedulers';
import { buildTelemetrySnapshot } from '../controllers/hudTelemetryBuilder';
import {
  findActiveCombatDwarf,
  findNearestDeadLootableDwarf,
  getActiveDwarvenMiners,
  getOrInitDwarfCorpseLoot,
  lootDeadDwarf,
} from '../builders/dwarvenKingdomBuilder';
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
  buildTrapPlacementPreviewGhost,
  type ITrapPlacementPreviewGhost,
} from '../models/placedTrapModels';
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
import { readMovementAxes, type IMovementAxes } from '../controllers/movementIntent';
import { isBindingHeld, matchesKeyBinding } from '../../config/keyBindingMatch';
import {
  SAVED_GAME_SETTINGS,
  formatKeyCodeLabel,
  type IGameSettingsConfig,
} from '../../config/savedGameSettings';

// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: What one rendered frame reads and drives. Every value is owned by the canvas and passed in once. */
export interface IRenderFrameContext {
  readonly camera: THREE.PerspectiveCamera;
  readonly cameraPose: ICameraPose;
  readonly cameraRig: ICameraRigState;
  readonly fog: THREE.FogExp2;
  readonly gameStateRef: { current: GameStateMode };
  readonly mutedRef: { current: boolean };
  readonly openDoorIds: Set<string>;
  readonly previousPlayerPose: IPreviousPlayerPose;
  readonly renderer: THREE.WebGLRenderer;
  readonly rideableHorses: ReturnType<typeof createInitialRideableHorses>;
  readonly scene: THREE.Scene;
  readonly sky: THREE.Object3D;
  readonly sunDiscMesh: THREE.Object3D;
  readonly sunLight: THREE.DirectionalLight;
  readonly activeArrows: IArrowProjectile[];
  readonly placedTrapSync: IPlacedTrapSync;
  readonly playerState: IPlayerState;
  readonly restState: IRestAndRideState;
  readonly simulationState: ISimulationState;
  readonly soundEngine: NatureSoundEngine;
  readonly timeState: ITimeAndSeasonState;
  readonly trapGhost: { current: ITrapPlacementPreviewGhost | null };
  readonly stepSeconds: number;
  readonly worldHandles: IAnimatedWorldHandles;
  readonly worldPlacedTraps: IPlacedTrap[];
  readonly worldTrapsGroup: THREE.Group;
  readonly emitHudSnapshot: () => void;
}

/** Summary: The player pose captured at the start of the latest simulation step, for render interpolation. */
export interface IPreviousPlayerPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  mountedHorseYaw: number;
  bobPhase: number;
  bobAmount: number;
}
// #endregion

// ======================== CONSTANTS ======================== \\
// #region Constants
const _sunVec = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/**
 * Summary: Builds the frame renderer over the given context.
 * @returns A function that draws one frame: `frameDt` seconds since the last frame, `now` in milliseconds, `alpha` the
 *          interpolation factor between the last two simulation steps.
 */
export function createRenderFrame(ctx: IRenderFrameContext): (frameDt: number, now: number, alpha: number) => void {
  const {
    camera,
    cameraPose,
    cameraRig,
    fog,
    gameStateRef,
    mutedRef,
    openDoorIds,
    previousPlayerPose,
    renderer,
    rideableHorses,
    scene,
    sky,
    sunDiscMesh,
    sunLight,
    stepSeconds,
    activeArrows,
    placedTrapSync,
    playerState,
    restState,
    simulationState,
    soundEngine,
    timeState,
    trapGhost,
    worldHandles,
    worldPlacedTraps,
    worldTrapsGroup,
    emitHudSnapshot,
  } = ctx;

  /** Interpolated copy of the player that the camera and meshes render from. */
  const renderPlayer: IPlayerState = { ...playerState };
  let lastHudEmitTime = 0;
  /** Distance to the nearest water, refreshed every quarter second (SND1). */
  let waterSampleTimer = 0;
  let cachedWaterDistance = 40;

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

  return function renderFrame(frameDt: number, now: number, alpha: number): void {
    soundEngine.setMuted(mutedRef.current);
    soundEngine.setPaused(gameStateRef.current !== 'playing');

    // Simulation time of the interpolated moment being drawn.
    const renderTime = simulationState.elapsedTotal - (1 - alpha) * stepSeconds;
    _sunVec.set(
      simulationState.currentAtmo.sunDirX,
      simulationState.currentAtmo.sunDirY,
      simulationState.currentAtmo.sunDirZ
    );
    if (gameStateRef.current === 'title') {
      writeTitleOrbitPose(renderTime, cameraPose);
      applyCameraPose(cameraPose);
      worldHandles.update(
        renderTime,
        camera.position.x,
        camera.position.z,
        simulationState.currentAtmo.morningMistOpacity,
        simulationState.currentAtmo.nightFactor,
        simulationState.currentWeather,
        openDoorIds,
        rideableHorses,
        null,
        undefined,
        activeArrows,
        timeState.worldHours
      );
    } else if (gameStateRef.current === 'playing') {
      interpolateRenderPlayer(alpha);
      const underRoof = isPositionUnderRoof(renderPlayer.x, renderPlayer.y, renderPlayer.z);
      const distToBirdsFlock = Math.hypot(renderPlayer.x, renderPlayer.z - 15);
      const birdProximity = Math.max(0, Math.min(1, 1.0 - (distToBirdsFlock - 35) / 85));

      // SND1: the nearest water is sampled every quarter second; it changes slowly as the player moves.
      waterSampleTimer -= frameDt;
      if (waterSampleTimer <= 0) {
        waterSampleTimer = 0.25;
        cachedWaterDistance = nearestWaterDistance(
          { waterSurfaceAt: (x, z) => getWaterSurfaceHeightAt(x, z), groundAt: (x, z) => walkableHeightValueAt(x, z) },
          renderPlayer.x,
          renderPlayer.z,
          40
        );
      }
      soundEngine.updateAmbient(
        frameDt,
        renderPlayer.x,
        renderPlayer.z,
        true,
        simulationState.currentWeather.windStrength,
        simulationState.currentWeather.rainIntensity,
        simulationState.currentAtmo.isNight,
        underRoof,
        birdProximity,
        cachedWaterDistance
      );

      stepCameraRig(
        cameraRig,
        { player: renderPlayer, dt: frameDt, elapsedSeconds: renderTime, landingDip: simulationState.landingDip, isSleepingInBed: restState.isSleepingInBed },
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
        simulationState.currentAtmo.morningMistOpacity,
        simulationState.currentAtmo.nightFactor,
        simulationState.currentWeather,
        openDoorIds,
        rideableHorses,
        renderPlayer.mountedHorseId,
        renderPlayer,
        activeArrows,
        timeState.worldHours
      );
    }

    // Synchronize 3D meshes for placed traps (owned by placedTrapSync).
    placedTrapSync.sync(worldPlacedTraps);

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
        (gx: number, gz: number) => walkableHeightValueAt(gx, gz),
        WATER_LEVEL,
        renderPlayer.pitch
      );
      if (preview) {
        if (!trapGhost.current || trapGhost.current.kind !== preview.kind) {
          if (trapGhost.current) {
            worldTrapsGroup.remove(trapGhost.current.group);
          }
          trapGhost.current = buildTrapPlacementPreviewGhost(preview.kind);
          worldTrapsGroup.add(trapGhost.current.group);
        }
        trapGhost.current.group.visible = true;
        trapGhost.current.group.position.set(preview.x, preview.y, preview.z);
        trapGhost.current.group.rotation.y = preview.yaw;
        trapGhost.current.setValid(preview.valid);
      } else if (trapGhost.current) {
        trapGhost.current.group.visible = false;
      }
    } else {
      if (trapGhost.current) {
        trapGhost.current.group.visible = false;
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

    setCameraUndergroundMask(camera, isPlayerUnderground(playerState.x, playerState.y, playerState.z));
    renderer.render(scene, camera);
  };
}
// #endregion
