// ============================================================================
// MODULE: World / Controllers / HUD Emitter
// DESIGN: Turns the live world state into the input of the HUD telemetry builder (SRP)
// SUMMARY: Chooses what the enemy health bar shows (the animal just hit, or a dwarf fighting the player), and maps
//          the player, world and feedback state onto IHudTelemetryInput. The canvas calls it once per HUD update.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IHudTelemetryInput } from './hudTelemetryBuilder';
import type { IHudFeedbackState } from '../domain/hudFeedbackState';
import type { IMinecartRide } from '../domain/restAndRideState';
import type { IPlayerState } from '../domain/worldTypes';
import { findActiveCombatDwarf } from '../builders/dwarvenKingdomBuilder';
import { getAnimalSpeciesName, getAnimalStrengthAndLevel } from '../systems/boidsAndWildlifeSystem';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: The live state the HUD is built from. Values are read at the moment of the update. */
export interface IHudEmitSources {
  readonly player: IPlayerState;
  readonly horses: IHudTelemetryInput['horses'];
  readonly openDoorIds: IHudTelemetryInput['openDoorIds'];
  readonly atmosphere: IHudTelemetryInput['atmosphere'];
  readonly weather: IHudTelemetryInput['weather'];
  readonly colliderDebugVisible: boolean;
  readonly pointerLocked: boolean;
  readonly hudFeedback: IHudFeedbackState;
  readonly isSleepingInBed: boolean;
  readonly worldHours: number;
  readonly forcedSeason: IHudTelemetryInput['forcedSeason'];
  readonly placedTraps: IHudTelemetryInput['placedTraps'];
  readonly activeAnimals: IHudTelemetryInput['activeAnimals'];
  readonly activeMinecartRide: IMinecartRide | null;
}
// #endregion

// ======================== BUILDER ======================== \\
// #region Builder
/**
 * Summary: Builds the HUD telemetry input from the live state.
 * Design: The enemy bar shows the animal just hit while its timer runs; otherwise it shows a dwarf fighting the player.
 */
export function buildHudTelemetryInput(src: IHudEmitSources): IHudTelemetryInput {
  const { hudFeedback: feedback, player } = src;
  const hit = feedback.hitAnimal;
  const showEnemyBar =
    feedback.hitAnimalTimer > 0 && hit !== null && (!hit.isDead || feedback.hitAnimalTimer > 0.3);
  const combatDwarf = !showEnemyBar ? findActiveCombatDwarf(player.x, player.z) : null;

  let activeEnemyHealthBar: IHudTelemetryInput['activeEnemyHealthBar'] = null;
  if (showEnemyBar && hit) {
    activeEnemyHealthBar = {
      id: hit.id,
      name: hit.isBoss ? `King ${getAnimalSpeciesName(hit.species)}` : getAnimalSpeciesName(hit.species),
      level: getAnimalStrengthAndLevel(hit).level,
      hp: Math.max(0, hit.hp ?? 0),
      maxHp: Math.max(1, hit.maxHp ?? 1),
      isBoss: Boolean(hit.isBoss || hit.species === 'dragon'),
      isSubdued: Boolean(hit.isSubdued),
    };
  } else if (combatDwarf) {
    activeEnemyHealthBar = {
      id: 9000 + combatDwarf.id,
      name: `${combatDwarf.name} (Dwarven Warrior)`,
      level: combatDwarf.level,
      hp: Math.max(0, combatDwarf.hp),
      maxHp: Math.max(1, combatDwarf.maxHp),
      isBoss: false,
      isSubdued: false,
    };
  }

  const ride = src.activeMinecartRide;
  return {
    player,
    horses: src.horses,
    openDoorIds: src.openDoorIds,
    atmosphere: src.atmosphere,
    weather: src.weather,
    colliderDebugVisible: src.colliderDebugVisible,
    pointerLocked: src.pointerLocked,
    lootNotification: feedback.lootNotificationTimer > 0 ? feedback.lootNotification : null,
    arrowHitTargetName: feedback.arrowHitTimer > 0 ? feedback.arrowHitTargetName : null,
    activeEnemyHealthBar,
    isSleepingInBed: src.isSleepingInBed,
    worldHours: src.worldHours,
    forcedSeason: src.forcedSeason,
    placedTraps: src.placedTraps,
    activeAnimals: src.activeAnimals,
    drivingMinecart: ride
      ? {
          lineId: ride.lineId,
          lineName: ride.lineName,
          speed: Math.round(Math.abs(ride.velocity) * 10) / 10,
        }
      : null,
  };
}
// #endregion
