// ============================================================================
// MODULE: World / Controllers / HUD Telemetry Builder
// DESIGN: Pure mapping from world state to the HUD telemetry contract (SRP)
// SUMMARY: Builds the ITelemetrySnapshot the React HUD renders: player vitals, nearby
//          interactables (door, ladder, horse, market, bed, dead animal), time of day,
//          weather and inventory. Reads world queries only; mutates nothing.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ITelemetrySnapshot } from '../domain/gameShellTypes';
import type {
  IPlayerState,
  IRideableHorseState,
  IWeatherStateSnapshot,
  SeasonType,
} from '../domain/worldTypes';
import {
  findLookedAtWatchtowerLadder,
  findNearestBed,
  findNearestFortressDoor,
  findNearestMarketStall,
} from '../terrainMath';
import { findNearestRideableHorse } from '../systems/playerPhysicsSystem';
import { findNearestDeadLootableAnimal, getAnimalSpeciesName } from '../systems/boidsAndWildlifeSystem';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/**
 * Summary: Everything the HUD snapshot is derived from.
 * Design: Timed notifications arrive already resolved (null once their timer ran out).
 */
export interface IHudTelemetryInput {
  readonly player: IPlayerState;
  readonly horses: readonly IRideableHorseState[];
  readonly openDoorIds: ReadonlySet<string>;
  readonly atmosphere: {
    readonly timeString: string;
    readonly phaseLabel: string;
    readonly sunElevationDeg: number;
  };
  readonly weather: IWeatherStateSnapshot;
  readonly colliderDebugVisible: boolean;
  readonly pointerLocked: boolean;
  readonly lootNotification: string | null;
  readonly arrowHitTargetName: string | null;
  readonly activeEnemyHealthBar?: {
    readonly id: number;
    readonly name: string;
    readonly hp: number;
    readonly maxHp: number;
    readonly isBoss: boolean;
    readonly isSubdued?: boolean;
  } | null;
  readonly isSleepingInBed: boolean;
  readonly worldHours: number;
  readonly forcedSeason: SeasonType | 'auto';
}
// #endregion

// ======================== BUILDER ======================== \\
// #region Builder
/**
 * Summary: Builds the HUD telemetry snapshot for the current frame.
 * Design: Arrays and the skills record are copied so the HUD never holds live world state.
 */
export function buildTelemetrySnapshot(input: IHudTelemetryInput): ITelemetrySnapshot {
  const { player } = input;
  const normYaw = ((((player.yaw * 180) / Math.PI) % 360) + 360) % 360;
  const nearDoor = findNearestFortressDoor(
    player.x,
    player.y,
    player.z,
    player.yaw,
    player.pitch
  );
  const nearLadder = findLookedAtWatchtowerLadder(
    player.x,
    player.y,
    player.z,
    player.yaw,
    player.pitch
  );
  const nearHorse = !player.mountedHorseId
    ? findNearestRideableHorse(player.x, player.y, player.z, input.horses)
    : null;
  const nearMarket = findNearestMarketStall(player.x, player.z);
  const nearDeadAnimal = findNearestDeadLootableAnimal(player.x, player.z);
  const nearBed = findNearestBed(player.x, player.y, player.z);
  return {
    x: player.x,
    y: player.y,
    z: player.z,
    yawDeg: normYaw,
    distanceWalked: player.distanceWalked,
    stepCount: player.stepCount,
    biome: player.currentBiome,
    walkPace: player.walkPace,
    isFlying: player.isFlying,
    isSwimming: player.isSwimming,
    isCrouching: Boolean(player.isCrouching),
    colliderDebugVisible: input.colliderDebugVisible,
    cameraPerspective: player.cameraPerspective,
    equippedTool: player.equippedTool,
    activeWeaponId: player.activeWeaponId,
    arrowKind: player.arrowKind,
    hotbarSlots: player.hotbarSlots ? [...player.hotbarSlots] : undefined,
    favoriteIds: player.favoriteIds ? [...player.favoriteIds] : undefined,
    goldCoins: player.goldCoins ?? 280,
    ownedItemIds: player.ownedItemIds ? [...player.ownedItemIds] : undefined,
    nearbyMarket: nearMarket ? { id: nearMarket.id, name: nearMarket.name } : null,
    nearbyDeadAnimal: nearDeadAnimal
      ? {
          id: String(nearDeadAnimal.id),
          species: nearDeadAnimal.species,
          speciesName: getAnimalSpeciesName(nearDeadAnimal.species),
        }
      : null,
    activeEnemyHealthBar: input.activeEnemyHealthBar ? { ...input.activeEnemyHealthBar } : null,
    lootNotification: input.lootNotification,
    swordSwingProgress: player.swordSwingProgress,
    dashCooldown: player.dashCooldown,
    bowDrawn: player.bowDrawn,
    bowDrawProgress: player.bowDrawProgress,
    arrowsShotCount: player.arrowsShotCount,
    lastArrowHitTarget: player.lastArrowHitTarget,
    lastArrowHitTargetName: input.arrowHitTargetName,
    timeString: input.atmosphere.timeString,
    phaseLabel: input.atmosphere.phaseLabel,
    sunElevationDeg: input.atmosphere.sunElevationDeg,
    pointerLocked: input.pointerLocked,
    weatherKind: input.weather.weatherKind,
    weatherLabel: input.weather.weatherLabel,
    wetness: input.weather.wetness,
    mountedHorseId: player.mountedHorseId,
    nearbyHorse: nearHorse
      ? {
          id: nearHorse.id,
          name: nearHorse.name,
        }
      : null,
    nearbyDoor: nearDoor
      ? {
          id: nearDoor.id,
          buildingName: nearDoor.buildingName,
          isOpen: input.openDoorIds.has(nearDoor.id),
        }
      : null,
    nearbyBed: nearBed
      ? {
          id: nearBed.id,
          name: nearBed.name,
        }
      : null,
    isSleepingInBed: input.isSleepingInBed,
    worldHours: input.worldHours,
    season: input.weather.season,
    seasonLabel: input.weather.seasonLabel,
    forcedSeason: input.forcedSeason,
    nearbyLadder: Boolean(nearLadder),
    climbingLadder: Boolean(player.climbingLadderId),
    stamina: player.stamina,
    maxStamina: player.maxStamina,
    skills: player.skills ? { ...player.skills } : undefined,
  };
}
// #endregion
