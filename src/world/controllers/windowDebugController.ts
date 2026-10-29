// ============================================================================
// MODULE: World / Controllers / Window Debug Controller
// DESIGN: Controller pattern for deterministic window debug & testing bridges (SRP)
// SUMMARY: Exposes headless inspection hooks (`render_game_to_text`, `teleportPlayer`,
//          `drawBow`, `shootArrow`, `swingSword`, `setWorldHours`) to window for QA.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import * as THREE from 'three';
import {
  ArrowElementKind,
  IArrowProjectile,
  EquippedToolSlot,
  InventoryItemId,
  IObstacleCylinder,
  IPlayerState,
  IRideableHorseState,
  IDynamicAtmosphereState,
  WeatherCycleMode,
  IWeatherStateSnapshot,
  WeatherToggleOption,
  assignHotbarSlot,
  buyMarketItem,
  equipInventoryItem,
  findLookedAtWatchtowerLadder,
  findNearestFortressDoor,
  findNearestMarketStall,
  findNearestRideableHorse,
  getPlayerHeroLevel,
  isPositionUnderRoof,
  sellMarketItem,
  toggleFavoriteItem,
  triggerSwordSlash,
  classifySwordAttackPhase,
  walkableHeightAt,
} from '../terrainMath';
import { NatureSoundEngine } from '../soundEngine';
import { clamp, validateCoordinate, validateWorldHour } from '../../core/config';

/**
 * Summary: Dependency injection contract for registering window-level debug bridge methods.
 * Design: Injects refs, state getters, and target window to enable headless testing.
 */
export interface IWindowDebugBridgeDeps {
  playerState: IPlayerState;
  obstacles: IObstacleCylinder[];
  rideableHorses: IRideableHorseState[];
  activeArrows: IArrowProjectile[];
  openDoorIds: Set<string>;
  camera: THREE.PerspectiveCamera;
  soundEngine: NatureSoundEngine;
  gameStateRef: { current: string };
  weatherToggleRef: { current: WeatherToggleOption };
  setActiveWeatherMode: (mode: WeatherCycleMode) => void;
  setSmoothAimZoom: (val: number) => void;
  setSmoothRightClickZoom: (val: number) => void;
  fireArrowNow: (power: number) => IArrowProjectile | null;
  executeSwordSlash: (isHeavy?: boolean) => ReturnType<typeof triggerSwordSlash> | null;
  getWorldHours: () => number;
  setWorldHoursAndApply: (hours: number) => number;
  getCurrentAtmo: () => IDynamicAtmosphereState;
  getCurrentWeather: () => IWeatherStateSnapshot;
  emitHudSnapshot?: () => void;
  readonly targetWindow?: Window | Record<string, unknown>;
}
export type WindowDebugBridgeDeps = IWindowDebugBridgeDeps;
// #endregion

// ======================== CONTROLLER IMPLEMENTATION ======================== \\
// #region Controller Implementation
/**
 * Controller Pattern: Registers deterministic window debug/inspection hooks (`render_game_to_text`,
 * `teleportPlayer`, `drawBow`, `shootArrow`, `swingSword`, `setWorldHours`, etc.) for automated testing.
 * @returns Cleanup function that unbinds all registered properties from window.
 */
/**
 * Summary: Exposes browser window debug functions for teleportation, time, and combat testing.
 * Design: Validates and sanitizes all inputs defensively before updating game state refs.
 * @param deps Injected state references and target window object.
 * @returns Cleanup unbind function removing window debug hooks.
 */
export function registerWindowDebugBridge(deps: IWindowDebugBridgeDeps): () => void {
  const {
    playerState,
    rideableHorses,
    activeArrows,
    openDoorIds,
    camera,
    soundEngine,
    gameStateRef,
    weatherToggleRef,
    setActiveWeatherMode,
    setSmoothAimZoom,
    setSmoothRightClickZoom,
    fireArrowNow,
    executeSwordSlash,
    getWorldHours,
    setWorldHoursAndApply,
    getCurrentAtmo,
    getCurrentWeather,
    emitHudSnapshot,
  } = deps;

  const win = (deps.targetWindow ?? (typeof window !== 'undefined' ? window : (globalThis as unknown as Window))) as Record<string, unknown>;
  const registeredKeys: string[] = [];

  const bind = (key: string, fn: unknown) => {
    win[key] = fn;
    registeredKeys.push(key);
  };

  const VALID_WEATHER_TOGGLES = new Set<WeatherToggleOption>([
    'auto',
    'regional_rain',
    'dense_fog',
    'lightning_storm',
    'clear_clouds',
  ]);

  bind('setWeatherCycleMode', (mode: unknown) => {
    if (mode === 'seasonal' || mode === 'turbo_test') {
      setActiveWeatherMode(mode);
      return true;
    }
    return false;
  });

  bind('setWeatherOverride', (kind: unknown) => {
    if (typeof kind === 'string' && VALID_WEATHER_TOGGLES.has(kind as WeatherToggleOption)) {
      weatherToggleRef.current = kind as WeatherToggleOption;
      return true;
    }
    return false;
  });

  bind('teleportPlayer', (x?: unknown, z?: unknown, yaw?: unknown, y?: unknown, pitch?: unknown) => {
    if (x !== undefined && (!Number.isFinite(x) || typeof x !== 'number')) return false;
    if (z !== undefined && (!Number.isFinite(z) || typeof z !== 'number')) return false;
    if (y !== undefined && (!Number.isFinite(y) || typeof y !== 'number')) return false;
    if (yaw !== undefined && (!Number.isFinite(yaw) || typeof yaw !== 'number')) return false;
    if (pitch !== undefined && (!Number.isFinite(pitch) || typeof pitch !== 'number')) return false;

    const targetX = x !== undefined ? validateCoordinate(x as number) : playerState.x;
    const targetZ = z !== undefined ? validateCoordinate(z as number) : playerState.z;

    if (playerState.mountedHorseId && Math.hypot(targetX - playerState.x, targetZ - playerState.z) > 12) {
      playerState.mountedHorseId = null;
    }
    playerState.x = targetX;
    playerState.z = targetZ;

    playerState.y =
      y !== undefined
        ? clamp(y as number, -100, 500)
        : walkableHeightAt(playerState.x, playerState.z, playerState.y).height;

    playerState.vx = 0;
    playerState.vy = 0;
    playerState.vz = 0;
    playerState.climbingLadderId = null;
    if (yaw !== undefined) playerState.yaw = yaw as number;
    if (pitch !== undefined) playerState.pitch = clamp(pitch as number, -Math.PI / 2, Math.PI / 2);
    emitHudSnapshot?.();
    return true;
  });

  bind('drawBow', (progress: unknown = 1.0) => {
    if (playerState.isSwimming) return 0;
    const validProgress =
      typeof progress === 'number' && Number.isFinite(progress) ? clamp(progress, 0, 1) : 1.0;
    playerState.equippedTool = 'bow';
    playerState.bowDrawn = true;
    playerState.bowDrawProgress = validProgress;
    setSmoothAimZoom(validProgress > 0 ? 1.0 : 0.0);
    soundEngine.playBowDraw();
    emitHudSnapshot?.();
    return playerState.bowDrawProgress;
  });

  bind('shootArrow', (power: unknown = 1.0) => {
    const validPower =
      typeof power === 'number' && Number.isFinite(power) ? clamp(power, 0.1, 1.0) : 1.0;
    return fireArrowNow(validPower);
  });

  const VALID_TOOLS = new Set<EquippedToolSlot>(['bow', 'sword', 'torch', 'unarmed']);
  bind('setEquippedTool', (tool: unknown) => {
    if (typeof tool !== 'string' || !VALID_TOOLS.has(tool as EquippedToolSlot)) {
      return null;
    }
    playerState.equippedTool = tool as EquippedToolSlot;
    if (tool !== 'bow') {
      playerState.bowDrawn = false;
      playerState.bowDrawProgress = 0;
    }
    emitHudSnapshot?.();
    return playerState.equippedTool;
  });

  bind('cycleArrowKind', () => {
    const order: ArrowElementKind[] = ['normal', 'fire', 'wind'];
    const curr = playerState.arrowKind ?? 'normal';
    const next = order[(order.indexOf(curr) + 1) % order.length];
    playerState.arrowKind = next;
    soundEngine.playBowDraw();
    emitHudSnapshot?.();
    return next;
  });

  bind('equipItem', (itemId: InventoryItemId) => {
    equipInventoryItem(playerState, itemId);
    soundEngine.playFootstep('trail', 1.15);
    emitHudSnapshot?.();
    return {
      equippedTool: playerState.equippedTool,
      arrowKind: playerState.arrowKind,
    };
  });

  bind('assignHotbar', (slotIndex: unknown, itemId: unknown) => {
    if (typeof slotIndex !== 'number' || !Number.isFinite(slotIndex) || slotIndex < 0 || slotIndex > 3) {
      return [...(playerState.hotbarSlots ?? [])];
    }
    if (typeof itemId !== 'string') {
      return [...(playerState.hotbarSlots ?? [])];
    }
    assignHotbarSlot(playerState, slotIndex as 0 | 1 | 2 | 3, itemId as InventoryItemId);
    emitHudSnapshot?.();
    return [...(playerState.hotbarSlots ?? [])];
  });

  bind('toggleFavorite', (itemId: InventoryItemId) => {
    toggleFavoriteItem(playerState, itemId);
    emitHudSnapshot?.();
    return [...(playerState.favoriteIds ?? [])];
  });

  bind('buyItem', (itemId: InventoryItemId) => {
    const res = buyMarketItem(playerState, itemId);
    if (res.ok) {
      soundEngine.playFootstep('trail', 1.22);
    }
    emitHudSnapshot?.();
    return res;
  });

  bind('sellItem', (itemId: InventoryItemId) => {
    const res = sellMarketItem(playerState, itemId);
    if (res.ok) {
      soundEngine.playFootstep('trail', 0.95);
    }
    emitHudSnapshot?.();
    return res;
  });

  bind('swingSword', (isHeavy = false) => {
    playerState.swordDebugFreezeProgress = null;
    return executeSwordSlash(Boolean(isHeavy)) ?? false;
  });

  bind('setSwordSwingDebugPose', (
    progress: unknown,
    comboIndex: unknown = 0,
    isHeavy: unknown = false
  ) => {
    const validProg =
      progress === null
        ? null
        : typeof progress === 'number' && Number.isFinite(progress)
          ? clamp(progress, 0, 1)
          : 0;
    const validCombo =
      typeof comboIndex === 'number' && Number.isFinite(comboIndex)
        ? clamp(Math.floor(comboIndex), 0, 2)
        : 0;
    playerState.equippedTool = 'sword';
    playerState.bowDrawn = false;
    playerState.bowDrawProgress = 0;
    playerState.swordComboIndex = validCombo;
    playerState.swordHeavyAttack = Boolean(isHeavy);
    playerState.swordDebugFreezeProgress = validProg;
    playerState.swordSwingProgress = validProg ?? 0;
    return classifySwordAttackPhase(playerState.swordSwingProgress ?? 0);
  });

  bind('setBowZoom', (active = true) => {
    if (playerState.isSwimming) return false;
    playerState.equippedTool = 'bow';
    playerState.bowZoomHeld = Boolean(active);
    setSmoothRightClickZoom(active ? 1.0 : 0.0);
    return playerState.bowZoomHeld;
  });

  bind('blockSword', (active = true) => {
    if (playerState.isSwimming) return false;
    playerState.equippedTool = 'sword';
    playerState.bowDrawn = false;
    playerState.bowDrawProgress = 0;
    playerState.swordBlocking = active;
    playerState.swordBlockProgress = active ? 1.0 : 0.0;
    if (active) soundEngine.playSwordClash(true);
    return playerState.swordBlocking;
  });

  bind('triggerDash', () => {
    if ((playerState.dashCooldown ?? 0) <= 0.05) {
      playerState.dashTimer = 0.42;
      playerState.dashCooldown = 1.4;
      soundEngine.playFootstep(
        playerState.isSwimming ? 'water' : playerState.currentBiome,
        1.25
      );
      return true;
    }
    return false;
  });

  bind('toggleCameraPerspective', () => {
    playerState.cameraPerspective =
      playerState.cameraPerspective === 'third_person' ? 'first_person' : 'third_person';
    return playerState.cameraPerspective;
  });

  bind('setWorldHours', (hours: unknown) => {
    if (typeof hours !== 'number' || !Number.isFinite(hours)) {
      return getWorldHours();
    }
    const validHours = validateWorldHour(hours);
    return setWorldHoursAndApply(validHours);
  });

  bind('getPlayerState', () => {
    const worldHours = getWorldHours();
    return {
      ...playerState,
      worldHours: Number(worldHours.toFixed(2)),
      activeArrowsCount: activeArrows.length,
      stuckArrowsCount: activeArrows.filter((a) => a.stuck).length,
    };
  });

  bind('render_game_to_text', () => {
    const worldHours = getWorldHours();
    const currentAtmo = getCurrentAtmo();
    const currentWeather = getCurrentWeather();
    const nearDoor = findNearestFortressDoor(
      playerState.x,
      playerState.y,
      playerState.z,
      playerState.yaw,
      playerState.pitch
    );
    const nearLadder = findLookedAtWatchtowerLadder(
      playerState.x,
      playerState.y,
      playerState.z,
      playerState.yaw,
      playerState.pitch
    );
    const nearHorse = !playerState.mountedHorseId
      ? findNearestRideableHorse(playerState.x, playerState.y, playerState.z, rideableHorses)
      : null;
    const nearMarket = findNearestMarketStall(playerState.x, playerState.z);
    return JSON.stringify({
      mode: gameStateRef.current,
      x: Number(playerState.x.toFixed(2)),
      y: Number(playerState.y.toFixed(2)),
      z: Number(playerState.z.toFixed(2)),
      yaw: Number(playerState.yaw.toFixed(2)),
      pitch: Number(playerState.pitch.toFixed(2)),
      biome: playerState.currentBiome,
      isFlying: playerState.isFlying,
      isSwimming: playerState.isSwimming,
      inWater: playerState.inWater,
      cameraPerspective: playerState.cameraPerspective,
      equippedTool: playerState.equippedTool,
      activeWeaponId: playerState.activeWeaponId ?? 'bow',
      arrowKind: playerState.arrowKind,
      hotbarSlots: playerState.hotbarSlots,
      favoriteIds: playerState.favoriteIds,
      goldCoins: playerState.goldCoins ?? 280,
      ownedItemIds: playerState.ownedItemIds ?? [],
      heroLevel: getPlayerHeroLevel(playerState),
      nearbyMarket: nearMarket ? { id: nearMarket.id, name: nearMarket.name } : null,
      swordSwingProgress: Number((playerState.swordSwingProgress ?? 0).toFixed(2)),
      swordAttackPhase: classifySwordAttackPhase(playerState.swordSwingProgress ?? 0).phase,
      swordStrikePending: Boolean(playerState.swordStrikePending),
      swordComboIndex: playerState.swordComboIndex ?? 0,
      swordHeavyAttack: Boolean(playerState.swordHeavyAttack),
      swordBlocking: Boolean(playerState.swordBlocking),
      swordBlockProgress: Number((playerState.swordBlockProgress ?? 0).toFixed(2)),
      bowZoomHeld: Boolean(playerState.bowZoomHeld),
      cameraFov: Number(camera.fov.toFixed(1)),
      bowDrawn: playerState.bowDrawn,
      bowDrawProgress: Number(playerState.bowDrawProgress.toFixed(2)),
      arrowsShotCount: playerState.arrowsShotCount,
      lastArrowHitTarget: playerState.lastArrowHitTarget,
      activeArrowsCount: activeArrows.length,
      walkPace: playerState.walkPace,
      mountedHorseId: playerState.mountedHorseId,
      nearbyHorse: nearHorse ? { id: nearHorse.id, name: nearHorse.name } : null,
      worldHours: Number(worldHours.toFixed(2)),
      timeString: currentAtmo.timeString,
      phaseLabel: currentAtmo.phaseLabel,
      isNight: currentAtmo.isNight,
      weatherMode: currentWeather.mode,
      weatherToggle: weatherToggleRef.current,
      season: currentWeather.season,
      weatherKind: currentWeather.weatherKind,
      weatherLabel: currentWeather.weatherLabel,
      wetness: Number(currentWeather.wetness.toFixed(2)),
      fogIntensity: Number(currentWeather.fogIntensity.toFixed(2)),
      nearbyDoor: nearDoor
        ? {
            id: nearDoor.id,
            buildingName: nearDoor.buildingName,
            isOpen: openDoorIds.has(nearDoor.id),
          }
        : null,
      nearbyLadder: Boolean(nearLadder),
      climbingLadder: Boolean(playerState.climbingLadderId),
      underRoof: isPositionUnderRoof(playerState.x, playerState.y, playerState.z),
      openDoors: Array.from(openDoorIds),
    });
  });

  return () => {
    for (const key of registeredKeys) {
      delete win[key];
    }
  };
}
// #endregion
