import * as THREE from 'three';
import {
  ArrowElementKind,
  ArrowProjectile,
  EquippedToolSlot,
  InventoryItemId,
  ObstacleCylinder,
  PlayerState,
  RideableHorseState,
  SolarAtmosphere,
  WeatherCycleMode,
  WeatherStateSnapshot,
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

export interface WindowDebugBridgeDeps {
  playerState: PlayerState;
  obstacles: ObstacleCylinder[];
  rideableHorses: RideableHorseState[];
  activeArrows: ArrowProjectile[];
  openDoorIds: Set<string>;
  camera: THREE.PerspectiveCamera;
  soundEngine: NatureSoundEngine;
  gameStateRef: { current: string };
  weatherToggleRef: { current: WeatherToggleOption };
  setActiveWeatherMode: (mode: WeatherCycleMode) => void;
  setSmoothAimZoom: (val: number) => void;
  setSmoothRightClickZoom: (val: number) => void;
  fireArrowNow: (power: number) => ArrowProjectile | null;
  executeSwordSlash: (isHeavy?: boolean) => ReturnType<typeof triggerSwordSlash> | null;
  getWorldHours: () => number;
  setWorldHoursAndApply: (hours: number) => number;
  getCurrentAtmo: () => SolarAtmosphere;
  getCurrentWeather: () => WeatherStateSnapshot;
  emitHudSnapshot?: () => void;
}

/**
 * Controller Pattern: Registers deterministic window debug/inspection hooks (`render_game_to_text`,
 * `teleportPlayer`, `drawBow`, `shootArrow`, `swingSword`, `setWorldHours`, etc.) for automated testing.
 */
export function registerWindowDebugBridge(deps: WindowDebugBridgeDeps): void {
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

  const win = window as unknown as Record<string, unknown>;

  win.setWeatherCycleMode = (mode: WeatherCycleMode) => {
    setActiveWeatherMode(mode);
  };

  win.setWeatherOverride = (kind: WeatherToggleOption) => {
    weatherToggleRef.current = kind;
  };

  win.teleportPlayer = (x?: number, z?: number, yaw?: number, y?: number, pitch?: number) => {
    if (x !== undefined && z !== undefined) {
      if (playerState.mountedHorseId && Math.hypot(x - playerState.x, z - playerState.z) > 12) {
        playerState.mountedHorseId = null;
      }
      playerState.x = x;
      playerState.z = z;
    } else {
      if (x !== undefined) playerState.x = x;
      if (z !== undefined) playerState.z = z;
    }
    playerState.y =
      y !== undefined ? y : walkableHeightAt(playerState.x, playerState.z, playerState.y).height;
    playerState.vx = 0;
    playerState.vy = 0;
    playerState.vz = 0;
    playerState.climbingLadderId = null;
    if (yaw !== undefined) playerState.yaw = yaw;
    if (pitch !== undefined) playerState.pitch = pitch;
    emitHudSnapshot?.();
  };

  win.drawBow = (progress = 1.0) => {
    if (playerState.isSwimming) return 0;
    playerState.equippedTool = 'bow';
    playerState.bowDrawn = true;
    playerState.bowDrawProgress = Math.max(0, Math.min(1, progress));
    setSmoothAimZoom(playerState.bowDrawProgress > 0 ? 1.0 : 0.0);
    soundEngine.playBowDraw();
    emitHudSnapshot?.();
    return playerState.bowDrawProgress;
  };

  win.shootArrow = (power = 1.0) => {
    return fireArrowNow(power);
  };

  win.setEquippedTool = (tool: EquippedToolSlot) => {
    playerState.equippedTool = tool;
    if (tool !== 'bow') {
      playerState.bowDrawn = false;
      playerState.bowDrawProgress = 0;
    }
    emitHudSnapshot?.();
    return playerState.equippedTool;
  };

  win.cycleArrowKind = () => {
    const order: ArrowElementKind[] = ['normal', 'fire', 'wind'];
    const curr = playerState.arrowKind ?? 'normal';
    const next = order[(order.indexOf(curr) + 1) % order.length];
    playerState.arrowKind = next;
    soundEngine.playBowDraw();
    emitHudSnapshot?.();
    return next;
  };

  win.equipItem = (itemId: InventoryItemId) => {
    equipInventoryItem(playerState, itemId);
    soundEngine.playFootstep('trail', 1.15);
    emitHudSnapshot?.();
    return {
      equippedTool: playerState.equippedTool,
      arrowKind: playerState.arrowKind,
    };
  };

  win.assignHotbar = (slotIndex: number, itemId: InventoryItemId) => {
    assignHotbarSlot(playerState, slotIndex as 0 | 1 | 2 | 3, itemId);
    emitHudSnapshot?.();
    return [...(playerState.hotbarSlots ?? [])];
  };

  win.toggleFavorite = (itemId: InventoryItemId) => {
    toggleFavoriteItem(playerState, itemId);
    emitHudSnapshot?.();
    return [...(playerState.favoriteIds ?? [])];
  };

  win.buyItem = (itemId: InventoryItemId) => {
    const res = buyMarketItem(playerState, itemId);
    if (res.ok) {
      soundEngine.playFootstep('trail', 1.22);
    }
    emitHudSnapshot?.();
    return res;
  };

  win.sellItem = (itemId: InventoryItemId) => {
    const res = sellMarketItem(playerState, itemId);
    if (res.ok) {
      soundEngine.playFootstep('trail', 0.95);
    }
    emitHudSnapshot?.();
    return res;
  };

  win.swingSword = (isHeavy = false) => {
    playerState.swordDebugFreezeProgress = null;
    return executeSwordSlash(Boolean(isHeavy)) ?? false;
  };

  win.setSwordSwingDebugPose = (
    progress: number | null,
    comboIndex = 0,
    isHeavy = false
  ) => {
    playerState.equippedTool = 'sword';
    playerState.bowDrawn = false;
    playerState.bowDrawProgress = 0;
    playerState.swordComboIndex = comboIndex;
    playerState.swordHeavyAttack = Boolean(isHeavy);
    playerState.swordDebugFreezeProgress = progress;
    playerState.swordSwingProgress = progress ?? 0;
    return classifySwordAttackPhase(playerState.swordSwingProgress);
  };

  win.setBowZoom = (active = true) => {
    if (playerState.isSwimming) return false;
    playerState.equippedTool = 'bow';
    playerState.bowZoomHeld = Boolean(active);
    setSmoothRightClickZoom(active ? 1.0 : 0.0);
    return playerState.bowZoomHeld;
  };

  win.blockSword = (active = true) => {
    if (playerState.isSwimming) return false;
    playerState.equippedTool = 'sword';
    playerState.bowDrawn = false;
    playerState.bowDrawProgress = 0;
    playerState.swordBlocking = active;
    playerState.swordBlockProgress = active ? 1.0 : 0.0;
    if (active) soundEngine.playSwordClash(true);
    return playerState.swordBlocking;
  };

  win.triggerDash = () => {
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
  };

  win.toggleCameraPerspective = () => {
    playerState.cameraPerspective =
      playerState.cameraPerspective === 'third_person' ? 'first_person' : 'third_person';
    return playerState.cameraPerspective;
  };

  win.setWorldHours = (hours: number) => {
    return setWorldHoursAndApply(hours);
  };

  win.getPlayerState = () => {
    const worldHours = getWorldHours();
    return {
      ...playerState,
      worldHours: Number(worldHours.toFixed(2)),
      activeArrowsCount: activeArrows.length,
      stuckArrowsCount: activeArrows.filter((a) => a.stuck).length,
    };
  };

  win.render_game_to_text = () => {
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
      nearbyMarket: nearMarket ? { id: nearMarket.id, nameHe: nearMarket.nameHe } : null,
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
      nearbyHorse: nearHorse ? { id: nearHorse.id, nameHe: nearHorse.nameHe } : null,
      worldHours: Number(worldHours.toFixed(2)),
      timeString: currentAtmo.timeString,
      phaseLabelHe: currentAtmo.phaseLabelHe,
      isNight: currentAtmo.isNight,
      weatherMode: currentWeather.mode,
      weatherToggle: weatherToggleRef.current,
      season: currentWeather.season,
      weatherKind: currentWeather.weatherKind,
      weatherLabelHe: currentWeather.weatherLabelHe,
      wetness: Number(currentWeather.wetness.toFixed(2)),
      fogIntensity: Number(currentWeather.fogIntensity.toFixed(2)),
      nearbyDoor: nearDoor
        ? {
            id: nearDoor.id,
            buildingNameHe: nearDoor.buildingNameHe,
            isOpen: openDoorIds.has(nearDoor.id),
          }
        : null,
      nearbyLadder: Boolean(nearLadder),
      climbingLadder: Boolean(playerState.climbingLadderId),
      underRoof: isPositionUnderRoof(playerState.x, playerState.y, playerState.z),
      openDoors: Array.from(openDoorIds),
    });
  };
}
