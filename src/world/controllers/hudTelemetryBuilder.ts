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
  findNearestFallenTree,
  findNearestMarketStall,
  findNearestWorldChest,
  getChestContents,
  getMerchantStallStock,
  getTreeDisplayName,
  resolveBestLookedAtInteraction,
  walkableHeightAt,
} from '../terrainMath';
import { WATER_LEVEL } from '../domain/landmarksRegistry';
import { findNearestRideableHorse } from '../systems/playerPhysicsSystem';
import {
  findNearestDeadLootableAnimal,
  findTargetedLiveAnimal,
  getAnimalSpeciesName,
  getAnimalStrengthAndLevel,
  getOrInitAnimalCorpseLoot,
  type ISmallAnimalState,
} from '../systems/boidsAndWildlifeSystem';
import {
  computeTrapPlacementPreview,
  findNearestPlacedTrap,
  type IPlacedTrap,
} from '../systems/animalTrapsSystem';
import {
  findNearestDeadLootableDwarf,
  findTargetedLiveDwarf,
  getOrInitDwarfCorpseLoot,
} from '../builders/dwarvenKingdomBuilder';
import { findNearestRideableMinecartStation } from '../systems/dwarvenMineAndCaravanSystem';
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
    readonly level?: number;
    readonly hp: number;
    readonly maxHp: number;
    readonly isBoss: boolean;
    readonly isSubdued?: boolean;
  } | null;
  readonly isSleepingInBed: boolean;
  readonly worldHours: number;
  readonly forcedSeason: SeasonType | 'auto';
  readonly placedTraps?: readonly IPlacedTrap[];
  readonly activeAnimals?: readonly ISmallAnimalState[];
  readonly drivingMinecart?: {
    readonly lineId: string;
    readonly lineName: string;
    readonly speed: number;
  } | null;
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
  const lookedAt = resolveBestLookedAtInteraction(
    player.x,
    player.y,
    player.z,
    player.yaw,
    player.pitch
  );
  const nearDoor = lookedAt.kind === 'door' ? lookedAt.door : null;
  const nearBed = lookedAt.kind === 'bed' ? lookedAt.bed : null;
  const nearChest = lookedAt.kind === 'chest' ? lookedAt.chest : null;
  const nearTrapWorkbench =
    lookedAt.kind === 'trap_workbench' && lookedAt.trapWorkbench
      ? {
          id: lookedAt.trapWorkbench.id,
          name: lookedAt.trapWorkbench.name,
          nameHe: lookedAt.trapWorkbench.nameHe,
        }
      : null;

  const nearTrap = input.placedTraps
    ? findNearestPlacedTrap(player.x, player.y, player.z, input.placedTraps, 3.2)
    : null;
  const nearbyPlacedTrap = nearTrap
    ? {
        id: nearTrap.id,
        kind: nearTrap.kind,
        status: nearTrap.status,
        sprung: nearTrap.status === 'sprung',
        caughtSpecies: nearTrap.caughtSpecies,
        caughtAnimalName: nearTrap.caughtAnimalName,
        caughtAnimalLevel: nearTrap.caughtAnimalLevel,
        x: nearTrap.x,
        y: nearTrap.y,
        z: nearTrap.z,
      }
    : null;

  const targetedLive = input.activeAnimals
    ? findTargetedLiveAnimal(
        player.x,
        player.y,
        player.z,
        player.yaw,
        player.pitch,
        5.5,
        input.activeAnimals
      )
    : null;
  const targetedDwarf = !targetedLive
    ? findTargetedLiveDwarf(player.x, player.y, player.z, player.yaw, player.pitch, 18.0)
    : null;
  const targetedCreature = targetedLive
    ? (() => {
        const stats = getAnimalStrengthAndLevel(targetedLive);
        return {
          id: targetedLive.id,
          species: targetedLive.species,
          speciesName: getAnimalSpeciesName(targetedLive.species),
          level: stats.level,
          hp: targetedLive.hp ?? stats.level,
          maxHp: targetedLive.maxHp ?? stats.level,
          alertLevel: targetedLive.aiBehavior ?? targetedLive.alertLevel,
          threatRating: stats.threatRating,
          isBoss: Boolean(targetedLive.isBoss),
        };
      })()
    : targetedDwarf
      ? {
          id: 9000 + targetedDwarf.id,
          species: 'dwarf_warrior',
          speciesName: `${targetedDwarf.name} (Dwarven Miner)`,
          level: targetedDwarf.level,
          hp: Math.max(0, targetedDwarf.hp),
          maxHp: Math.max(1, targetedDwarf.maxHp),
          alertLevel: targetedDwarf.isAggro ? 'attacking' : 'mining',
          threatRating: 'dangerous' as const,
          isBoss: false,
        }
      : null;

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
  const nearMarket = findNearestMarketStall(
    player.x,
    player.z,
    player.isFlying ? player.y : undefined
  );
  const nearDeadAnimal = findNearestDeadLootableAnimal(
    player.x,
    player.z,
    undefined,
    3.4,
    player.isFlying ? player.y : undefined
  );
  const nearDeadDwarf = !nearDeadAnimal
    ? findNearestDeadLootableDwarf(
        player.x,
        player.z,
        3.4,
        player.isFlying ? player.y : undefined
      )
    : null;
  const nearFallenTree = findNearestFallenTree(player.x, player.z, 4.4);
  const resolvedLootNotification =
    input.lootNotification ??
    (player.lastLootNotification && player.lastLootNotification.timer > 0
      ? player.lastLootNotification.text
      : null);
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
    equippedClothingId: player.equippedClothingId,
    arrowKind: player.arrowKind,
    hotbarSlots: player.hotbarSlots ? [...player.hotbarSlots] : undefined,
    favoriteIds: player.favoriteIds ? [...player.favoriteIds] : undefined,
    goldCoins: player.goldCoins ?? 280,
    ownedItemIds: player.ownedItemIds ? [...player.ownedItemIds] : undefined,
    nearbyMarket: nearMarket
      ? {
          id: nearMarket.id,
          name: nearMarket.name,
          stock: { ...getMerchantStallStock(player, nearMarket.id) },
        }
      : null,
    nearbyDeadAnimal: nearDeadAnimal
      ? {
          id: String(nearDeadAnimal.id),
          species: nearDeadAnimal.species,
          speciesName: getAnimalSpeciesName(nearDeadAnimal.species),
        }
      : nearDeadDwarf
        ? {
            id: `dwarf-${nearDeadDwarf.id}`,
            species: 'dwarf_warrior',
            speciesName: `${nearDeadDwarf.name}`,
          }
        : null,
    nearbyChest: nearChest
      ? {
          id: nearChest.id,
          name: nearChest.name,
          isOpened: input.openDoorIds.has(nearChest.id),
          ...(nearChest.goldCoins ? { goldCoins: nearChest.goldCoins } : {}),
          contents: [...getChestContents(player, nearChest)],
        }
      : nearDeadDwarf
        ? {
            id: `corpse-dwarf-${nearDeadDwarf.id}`,
            name: `${nearDeadDwarf.name} (Corpse)`,
            isOpened: true,
            isCorpse: true,
            goldCoins: nearDeadDwarf.goldDrop,
            contents: [...getOrInitDwarfCorpseLoot(nearDeadDwarf)],
          }
        : nearDeadAnimal && input.openDoorIds.has(`corpse-animal-${nearDeadAnimal.id}`)
          ? {
              id: `corpse-animal-${nearDeadAnimal.id}`,
              name: `${getAnimalSpeciesName(nearDeadAnimal.species)} (Corpse)`,
              isOpened: true,
              isCorpse: true,
              goldCoins: 0,
              contents: [...getOrInitAnimalCorpseLoot(nearDeadAnimal)],
            }
          : null,
    nearbyFallenTree: nearFallenTree
      ? {
          id: nearFallenTree.id,
          kind: nearFallenTree.kind,
          name: getTreeDisplayName(nearFallenTree.kind),
          woodYield: nearFallenTree.woodYield,
        }
      : null,
    activeEnemyHealthBar: input.activeEnemyHealthBar ? { ...input.activeEnemyHealthBar } : null,
    lootNotification: resolvedLootNotification,
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
    ...(nearTrapWorkbench ? { nearbyTrapWorkbench: nearTrapWorkbench } : {}),
    ...(nearbyPlacedTrap ? { nearbyPlacedTrap } : {}),
    ...(player.heldTrapItemId
      ? (() => {
          const ownedCount = (player.ownedItemIds ?? []).filter(
            (id) => id === player.heldTrapItemId
          ).length;
          if (ownedCount <= 0) return {};
          const preview = computeTrapPlacementPreview(
            input.placedTraps ?? [],
            player.heldTrapItemId,
            player.x,
            player.y,
            player.z,
            player.yaw,
            (gx, gz) => walkableHeightAt(gx, gz).height,
            WATER_LEVEL,
            player.pitch
          );
          if (!preview) return {};
          return {
            heldTrapStatus: {
              itemId: player.heldTrapItemId,
              name: preview.trapName,
              count: ownedCount,
              valid: preview.valid,
              reason: preview.reason,
            },
          };
        })()
      : {}),
    ...(targetedCreature ? { targetedCreature } : {}),
    ...(input.placedTraps
      ? {
          placedTrapsCount: input.placedTraps.length,
          sprungTrapsCount: input.placedTraps.filter((t) => t.status === 'sprung').length,
        }
      : {}),
    isSleepingInBed: input.isSleepingInBed,
    worldHours: input.worldHours,
    season: input.weather.season,
    seasonLabel: input.weather.seasonLabel,
    forcedSeason: input.forcedSeason,
    nearbyLadder: Boolean(nearLadder),
    climbingLadder: Boolean(player.climbingLadderId),
    nearbyMinecart: !input.drivingMinecart
      ? findNearestRideableMinecartStation(player.x, player.y, player.z, 4.2)
      : null,
    drivingMinecart: input.drivingMinecart ? { ...input.drivingMinecart } : null,
    stamina: player.stamina,
    maxStamina: player.maxStamina,
    staminaExhausted: Boolean(player.staminaExhausted),
    mountStamina: player.mountStamina ?? 100,
    mountMaxStamina: player.mountMaxStamina ?? 100,
    mountStaminaExhausted: Boolean(player.mountStaminaExhausted),
    hp: player.hp ?? 100,
    maxHp: player.maxHp ?? 100,
    hunger: player.hunger ?? 100,
    maxHunger: player.maxHunger ?? 100,
    damageFlashIntensity: Math.max(0, Math.min(1, player.damageFlashTimer ?? 0)),
    skills: player.skills ? { ...player.skills } : undefined,
    ...(player.deathRespawnPhase ? { deathRespawnPhase: { ...player.deathRespawnPhase } } : {}),
  };
}
// #endregion
