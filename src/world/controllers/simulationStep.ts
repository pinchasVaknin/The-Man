// ============================================================================
// MODULE: World / Controllers / Simulation Step
// DESIGN: The fixed-step simulation of the playing world: player, animals, combat, weather and autosave (SRP)
// SUMMARY: One simulation tick. The canvas builds the step once with the state and actions it needs, and the game loop
//          calls it every fixed step.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { isWorldPausedByMenu } from '../domain/uiPause';
import { easeWeatherSnapshot } from '../domain/weatherEase';
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
import type { IActionInputState } from '../domain/actionInputState';
import type { ILookInputState } from '../domain/lookInputState';
import type { IHudFeedbackState } from '../domain/hudFeedbackState';
import type { IRestAndRideState } from '../domain/restAndRideState';
import type { ISimulationState } from '../domain/simulationState';
import type { IDynamicAtmosphereState } from '../domain/worldTypes';
import type { IAnimatedWorldHandles } from '../proceduralModels';
import type { IObstacleCylinder } from '../domain/worldTypes';

// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: What one simulation tick reads and drives. Every value is owned by the canvas and passed in once. */
export interface ISimulationStepContext {
  readonly actionState: IActionInputState;
  readonly activeArrows: IArrowProjectile[];
  readonly applyDynamicAtmosphere: (hours: number, weather?: IWeatherStateSnapshot) => IDynamicAtmosphereState;
  readonly camera: THREE.PerspectiveCamera;
  readonly capturePreviousPlayerPose: () => void;
  readonly emitHudSnapshot: () => void;
  readonly executeSwordSlash: (isHeavy?: boolean, deferHitToStrikeWindow?: boolean) => void;
  readonly gameSettingsRef: { current: IGameSettingsConfig };
  readonly gameStateRef: { current: GameStateMode };
  readonly getEffectiveForcedWeather: () => WeatherKind | null;
  readonly getSeasonClockSeconds: () => number;
  readonly handleSwordStrikeImpactFeedback: (res: ReturnType<typeof triggerSwordSlash> | null) => void;
  readonly harvestOrPickupNearbyTrap: () => boolean;
  readonly hudFeedback: IHudFeedbackState;
  readonly keysJustPressed: Set<string>;
  readonly keysPressed: Set<string>;
  readonly obstacles: IObstacleCylinder[];
  readonly worldHandles: IAnimatedWorldHandles;
  readonly lookState: ILookInputState;
  readonly movementAxes: IMovementAxes;
  readonly openDoorIds: Set<string>;
  readonly perfStats: PerfStats;
  readonly playerState: IPlayerState;
  readonly restState: IRestAndRideState;
  readonly rideableHorses: ReturnType<typeof createInitialRideableHorses>;
  readonly saveCurrentWorld: () => void;
  readonly simulationState: ISimulationState;
  readonly soundEngine: NatureSoundEngine;
  readonly timeState: ITimeAndSeasonState;
  readonly tryBoardOrExitMinecart: () => boolean;
  readonly virtualMoveRef: { current: IVirtualMoveState };
  readonly wildlifeSoundCallbacks: IWildlifeSoundCallbacks;
  readonly worldPlacedTraps: IPlacedTrap[];
}
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/**
 * Summary: Builds the simulation tick over the given context.
 * @returns A function that advances the world by `rawDt` seconds.
 */
export function createSimulationStep(ctx: ISimulationStepContext): (rawDt: number) => void {
  const {
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
    saveCurrentWorld,
    simulationState,
    soundEngine,
    timeState,
    tryBoardOrExitMinecart,
    virtualMoveRef,
    wildlifeSoundCallbacks,
    worldPlacedTraps,
  } = ctx;

  return function simulateStep(rawDt: number): void {
      // UI2: the world holds still while an inventory, trade or map menu is open.
      if (gameStateRef.current === 'playing' && isWorldPausedByMenu(document.body.dataset)) return;

      if (gameStateRef.current === 'title') {
        simulationState.elapsedTotal += rawDt;
        timeState.worldHours = advanceWorldClock(timeState.worldHours, rawDt, TITLE_CLOCK_HOURS_PER_SECOND);
        simulationState.currentWeather = easeWeatherSnapshot(
          simulationState.currentWeather,
          computeWeatherState(
          getSeasonClockSeconds(),
          camera.position.x,
          camera.position.z,
          timeState.activeWeatherMode,
          getEffectiveForcedWeather()
          ),
          rawDt
        );
        simulationState.currentAtmo = applyDynamicAtmosphere(timeState.worldHours, simulationState.currentWeather);

      } else if (gameStateRef.current === 'playing') {
        simulationState.elapsedTotal += rawDt;
        capturePreviousPlayerPose();

        if (restState.isSleepingInBed) {
          if (restState.activeSleepingBed) {
            playerState.x = restState.activeSleepingBed.x;
            playerState.z = restState.activeSleepingBed.z;
            playerState.y = restState.activeSleepingBed.y + 0.45;
            playerState.vx = 0;
            playerState.vy = 0;
            playerState.vz = 0;
          }
          const prevSleepHours = timeState.worldHours;
          const sleepClock = advanceSleepClock(timeState.worldHours, rawDt);
          timeState.worldHours = sleepClock.hours;
          const sleptHoursDelta = ((timeState.worldHours - prevSleepHours) + 24) % 24;
          timeState.inGameHoursElapsed += sleptHoursDelta;
          if (sleepClock.hasReachedMorning) {
            restState.isSleepingInBed = false;
            playerState.pitch = 0;
            if (restState.preSleepPlayerPos) {
              playerState.x = restState.preSleepPlayerPos.x;
              playerState.z = restState.preSleepPlayerPos.z;
              playerState.y = walkableHeightValueAt(restState.preSleepPlayerPos.x, restState.preSleepPlayerPos.z, restState.preSleepPlayerPos.y);
            }
            restState.activeSleepingBed = null;
            restState.preSleepPlayerPos = null;
            playerState.stamina = playerState.maxStamina ?? 100;
            playerState.staminaExhausted = false;
            hudFeedback.lootNotification = t('notifications.awoke');
            hudFeedback.lootNotificationTimer = 3.5;
            emitHudSnapshot();
          }
        } else {
          timeState.worldHours = advanceWorldClock(timeState.worldHours, rawDt, PLAY_CLOCK_HOURS_PER_SECOND);
          timeState.inGameHoursElapsed += rawDt * PLAY_CLOCK_HOURS_PER_SECOND;
        }
        playerState.worldDaysElapsed = Math.floor(timeState.inGameHoursElapsed / 24);
        if (checkAndRestockMerchants(playerState, playerState.worldDaysElapsed)) {
          hudFeedback.lootNotification = 'Harbor Market merchants have restocked their supplies!';
          hudFeedback.lootNotificationTimer = 4.0;
        }
        simulationState.currentWeather = easeWeatherSnapshot(
          simulationState.currentWeather,
          computeWeatherState(
          getSeasonClockSeconds(),
          playerState.x,
          playerState.z,
          timeState.activeWeatherMode,
          getEffectiveForcedWeather(),
          timeState.forcedSeason === 'auto' ? null : timeState.forcedSeason
          ),
          rawDt
        );
        simulationState.currentAtmo = applyDynamicAtmosphere(timeState.worldHours, simulationState.currentWeather);

        if (
          (simulationState.currentWeather.thunderTriggered || simulationState.currentWeather.lightningFlash > 0.25) &&
          simulationState.elapsedTotal - simulationState.lastThunderTime > 2.2
        ) {
          simulationState.lastThunderTime = simulationState.elapsedTotal;
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
        if (restState.isSleepingInBed && (Math.abs(forward) > 0.1 || Math.abs(right) > 0.1)) {
          restState.isSleepingInBed = false;
          playerState.pitch = 0;
          if (restState.preSleepPlayerPos) {
            playerState.x = restState.preSleepPlayerPos.x;
            playerState.z = restState.preSleepPlayerPos.z;
            playerState.y = walkableHeightValueAt(restState.preSleepPlayerPos.x, restState.preSleepPlayerPos.z, restState.preSleepPlayerPos.y);
          }
          restState.activeSleepingBed = null;
          restState.preSleepPlayerPos = null;
        }

        // Interactive Looting of Hunted Animal, Opening Chest, Sleeping in Bed, Trapper's Workbench, Minecart Driving, OR Door Toggle when pressing interactDoor ([E])
        if (keysJustPressed.has(kb.interactDoor)) {
          if (restState.activeMinecartRide && tryBoardOrExitMinecart()) {
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
              hudFeedback.lootNotification = 'Harvested Wild Dove: Raw Game Meat ×2, Animal Bone ×1';
              hudFeedback.lootNotificationTimer = 4.5;
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
                const isNightTime = isSleepingAllowedAt(timeState.worldHours);
                if (dangerNearby) {
                  hudFeedback.lootNotification = t('notifications.sleep_danger');
                  hudFeedback.lootNotificationTimer = 3.2;
                  emitHudSnapshot();
                } else if (!isNightTime) {
                  hudFeedback.lootNotification = t('notifications.sleep_day_only');
                  hudFeedback.lootNotificationTimer = 3.2;
                  emitHudSnapshot();
                } else {
                  restState.preSleepPlayerPos = { x: playerState.x, y: playerState.y, z: playerState.z };
                  restState.activeSleepingBed = nearBed;
                  restState.isSleepingInBed = true;
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
                  hudFeedback.lootNotification = t('notifications.sleeping');
                  hudFeedback.lootNotificationTimer = 3.5;
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
                    hudFeedback.lootNotification = harvestRes.notification;
                    hudFeedback.lootNotificationTimer = 4.2;
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
          actionState.isMouseBowHeld || Boolean(virtualMoveRef.current.drawBow)
        );

        // Update Long-Press Sword Power Attack Charge (holding Left-Click or [R] >= 0.24s triggers Heavy Forward Air-Cleaving Attack!)
        if (actionState.isSwordAttackHeld && !playerState.isSwimming && playerState.equippedTool === 'sword') {
          actionState.swordHoldDuration += rawDt;
          if (!actionState.swordHeavyTriggeredDuringHold) {
            playerState.swordChargeTime = Math.min(1.0, actionState.swordHoldDuration / 0.24);
            if (actionState.swordHoldDuration >= 0.24 && !lookState.mouseMovedWhileDown) {
              actionState.swordHeavyTriggeredDuringHold = true;
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
          hudFeedback.lootNotification =
            treeStepRes.notification ??
            `Crushed by falling tree! (-${treeStepRes.damageAmount} HP)`;
          hudFeedback.lootNotificationTimer = 4.0;
          soundEngine.playSwordClash(true);
          emitHudSnapshot();
        }

        // Tick deployed hunting traps against wildlife
        const liveWildlife = getActiveWorldAnimals();
        const trapTickRes = tickPlacedAnimalTraps(
          worldPlacedTraps,
          liveWildlife,
          rawDt,
          timeState.inGameHoursElapsed * 3600
        );
        if (trapTickRes.bearTrapNotifications.length > 0) {
          hudFeedback.lootNotification = trapTickRes.bearTrapNotifications[0];
          hudFeedback.lootNotificationTimer = 4.5;
          soundEngine.playSwordClash(true);
          emitHudSnapshot();
        } else if (trapTickRes.newlySprungTraps.length > 0) {
          const sprungTrap = trapTickRes.newlySprungTraps[0];
          const trapDef = TRAP_RECIPES.find((r) => r.kind === sprungTrap.kind);
          hudFeedback.lootNotification = `${trapDef?.name ?? 'Trap'} caught a Lv.${sprungTrap.caughtAnimalLevel ?? 1} ${sprungTrap.caughtAnimalName ?? 'Animal'}! Press [E] near trap to harvest.`;
          hudFeedback.lootNotificationTimer = 4.5;
          soundEngine.playFootstep('bridge', 1.15);
          emitHudSnapshot();
        }
        if (playerState.lastLootNotification && playerState.lastLootNotification.timer > 0) {
          playerState.lastLootNotification.timer = Math.max(
            0,
            playerState.lastLootNotification.timer - rawDt
          );
          if (playerState.lastLootNotification.timer > 0 && hudFeedback.lootNotificationTimer <= 0) {
            hudFeedback.lootNotification = playerState.lastLootNotification.text;
            hudFeedback.lootNotificationTimer = playerState.lastLootNotification.timer;
          }
        }
        stepMeleeFeelAndSway(playerState, {
          dt: rawDt,
          lookYawDelta: lookState.accumYawDelta,
          lookPitchDelta: lookState.accumPitchDelta,
          landingDip: simulationState.landingDip,
        });

        // Step active 3D Arrows in flight
        if (activeArrows.length > 0) {
          const arrowRes = stepArrowsPhysics(activeArrows, obstacles, rawDt);
          if (arrowRes.hitAnimal) {
            const spName = getAnimalSpeciesName(arrowRes.hitAnimal.species);
            playerState.lastArrowHitTarget = String(arrowRes.hitAnimal.id);
            hudFeedback.hitAnimal = arrowRes.hitAnimal;
            hudFeedback.hitAnimalTimer = arrowRes.killedAnimal ? 1.8 : 6.0;
            hudFeedback.arrowHitTargetName = arrowRes.killedAnimal
              ? t('notifications.animal_hunted', { species: spName, key: formatKeyCodeLabel(gameSettingsRef.current.keybindings.interactDoor) })
              : t('notifications.animal_hit', { species: spName });
            hudFeedback.arrowHitTimer = arrowRes.killedAnimal ? 4.0 : 2.5;
            awardSkillXp(playerState, 'archery', arrowRes.killedAnimal ? 36 : 18);
            soundEngine.playArrowHit(true);
            emitHudSnapshot();
          } else if (arrowRes.hitTarget) {
            playerState.lastArrowHitTarget = arrowRes.hitTarget.id;
            hudFeedback.arrowHitTargetName = arrowRes.hitTarget.name;
            hudFeedback.arrowHitTimer = 3.5;
            awardSkillXp(playerState, 'archery', 32);
            soundEngine.playArrowHit(true);
            emitHudSnapshot();
          } else if (arrowRes.hitAnySurface) {
            soundEngine.playArrowHit(false);
          }
        }
        if (hudFeedback.arrowHitTimer > 0) {
          hudFeedback.arrowHitTimer = Math.max(0, hudFeedback.arrowHitTimer - rawDt);
        }
        if (hudFeedback.hitAnimalTimer > 0) {
          hudFeedback.hitAnimalTimer = Math.max(0, hudFeedback.hitAnimalTimer - rawDt);
        }
        if (hudFeedback.lootNotificationTimer > 0) {
          hudFeedback.lootNotificationTimer = Math.max(0, hudFeedback.lootNotificationTimer - rawDt);
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

        const triggerFlyToggle = actionState.pendingFlyToggle;
        actionState.pendingFlyToggle = false;
        keysJustPressed.clear();

        const subSteps = playerState.isFlying ? 1 : Math.max(1, Math.ceil(rawDt / 0.05));
        const subDt = rawDt / subSteps;
        let anySteppedFoot = false;
        let maxLandedImpact = 0;

        playerState.isSleeping = restState.isSleepingInBed;
        if (restState.activeMinecartRide) {
          if (jumpPressed) {
            restState.activeMinecartRide = null;
            playerState.y = walkableHeightValueAt(playerState.x, playerState.z, playerState.y);
            capturePreviousPlayerPose();
            soundEngine.playFootstep('bridge', 1.08);
            emitHudSnapshot();
          } else {
            const pose0 = evaluateRideableMinecartPose(
              restState.activeMinecartRide.lineId,
              restState.activeMinecartRide.u
            );
            const lookDot =
              -Math.sin(playerState.yaw) * Math.sin(pose0.yaw) -
              Math.cos(playerState.yaw) * Math.cos(pose0.yaw);
            if (Math.abs(lookDot) > 0.25) {
              restState.activeMinecartRide.facingSign = lookDot >= 0 ? 1 : -1;
            }
            let throttleAlongU =
              Math.max(-1, Math.min(1, forward)) * restState.activeMinecartRide.facingSign;
            // At track endpoints, pressing [W] (forward > 0) always drives away from the bumper down the track
            if (restState.activeMinecartRide.u <= 0.03 && forward > 0.05 && throttleAlongU < 0) {
              restState.activeMinecartRide.facingSign = 1;
              throttleAlongU = Math.min(1, Math.abs(forward));
            } else if (restState.activeMinecartRide.u >= 0.97 && forward > 0.05 && throttleAlongU > 0) {
              restState.activeMinecartRide.facingSign = -1;
              throttleAlongU = -Math.min(1, Math.abs(forward));
            }
            const stepRes = stepRideableMinecartPhysics(
              restState.activeMinecartRide.lineId,
              restState.activeMinecartRide.u,
              restState.activeMinecartRide.velocity,
              restState.activeMinecartRide.wheelAngle,
              throttleAlongU,
              rawDt
            );
            restState.activeMinecartRide.u = stepRes.u;
            restState.activeMinecartRide.velocity = stepRes.velocity;
            restState.activeMinecartRide.wheelAngle = stepRes.wheelAngle;
            playerState.x = stepRes.pose.x;
            playerState.y = stepRes.pose.y + 0.55;
            playerState.z = stepRes.pose.z;
            playerState.vx = 0;
            playerState.vy = 0;
            playerState.vz = 0;
            playerState.yaw += lookState.accumYawDelta;
            playerState.pitch = Math.max(-1.35, Math.min(1.35, playerState.pitch + lookState.accumPitchDelta));
          }
        } else if (restState.isSleepingInBed && restState.activeSleepingBed) {
          playerState.x = restState.activeSleepingBed.x;
          playerState.z = restState.activeSleepingBed.z;
          playerState.y = restState.activeSleepingBed.y + 0.45;
          playerState.vx = 0;
          playerState.vy = 0;
          playerState.vz = 0;
          playerState.yaw += lookState.accumYawDelta;
          playerState.pitch = Math.max(1.05, Math.min(1.53, playerState.pitch + lookState.accumPitchDelta));
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
                lookYawDelta: s === 0 ? lookState.accumYawDelta : 0,
                lookPitchDelta: s === 0 ? lookState.accumPitchDelta : 0,
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
            hudFeedback.lootNotification = 'You collapsed from exhaustion and awoke inside the cabin.';
            hudFeedback.lootNotificationTimer = 4.5;
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
                  hudFeedback.lootNotification = `Fed Meat & Tamed Boss CatLion! (+${rec.recoveredCount} Arrows Recovered, Space: Attack)`;
                  playerState.lastTameNotice = null;
                  hudFeedback.lootNotificationTimer = 4.5;
                  emitHudSnapshot();
                }
              }
            }
            if (playerState.lastTameNotice) {
              if (playerState.lastTameNotice === 'meat_required_for_lion') {
                hudFeedback.lootNotification = 'You need Meat in your inventory to tame the subdued Boss CatLion!';
              } else if (playerState.lastTameNotice === 'tamed_boss_lion') {
                hudFeedback.lootNotification = 'Fed Meat & Tamed Boss CatLion! (Space: Stationary Attack, Shift: Sprint)';
              } else if (playerState.lastTameNotice === 'tamed_stag') {
                hudFeedback.lootNotification = 'Tamed & Mounted Royal Celestial Stag! (Space: Sky-Leap, Shift: Gallop)';
              }
              playerState.lastTameNotice = null;
              hudFeedback.lootNotificationTimer = 4.5;
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
              hudFeedback.lootNotification = 'Mounted Royal Celestial Stag! (Space: Sky-Leap, Shift: Gallop)';
              hudFeedback.lootNotificationTimer = 4.2;
              emitHudSnapshot();
            } else if (playerState.mountedHorseId.startsWith('mount-lion-')) {
              hudFeedback.lootNotification = 'Mounted Mystical Boss CatLion! (Space: Stationary Attack, Shift: Sprint)';
              hudFeedback.lootNotificationTimer = 4.2;
              emitHudSnapshot();
            }
          }
        }
        lookState.accumYawDelta = 0;
        lookState.accumPitchDelta = 0;

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
          simulationState.landingDip = maxLandedImpact * 0.22;
          soundEngine.playFootstep(playerState.currentBiome, 0.82);
        }
        simulationState.landingDip *= Math.exp(-12 * rawDt);

        worldHandles.simulateWildlife(
          rawDt,
          simulationState.elapsedTotal,
          playerState,
          rideableHorses,
          simulationState.currentAtmo.nightFactor,
          simulationState.currentWeather,
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
        simulationState.worldSaveTimer += rawDt;
        if (simulationState.worldSaveTimer >= 30) {
          simulationState.worldSaveTimer = 0;
          const tSave = performance.now();
          saveCurrentWorld();
          perfStats.record('save', performance.now() - tSave);
        }
      }
  };
}
// #endregion
