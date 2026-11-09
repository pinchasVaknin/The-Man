// ============================================================================
// MODULE: World / Systems / Wildlife Species Profiles
// DESIGN: Strategy table keyed by species (Record<GroundAnimalSpecies, ...>)
// SUMMARY: Every per-species number the wildlife AI uses: senses, size rank, combat
//          distances, health, loot, movement speeds and body radius. A new species adds
//          one entry here and the compiler rejects a missing field.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { InventoryItemId } from '../domain/worldTypes';
import type { GroundAnimalSpecies } from './boidsAndWildlifeSystem';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Vision and hearing radii (meters). Vision is 0 while asleep. */
export interface ISpeciesSenses {
  readonly visionRange: number;
  readonly hearingRadius: number;
}

/**
 * Summary: Static tuning of one ground-animal species.
 * Design: Prey-only fields (graze, shelter, prey flee) and predator-only fields (charge,
 *         stalk, detect) are filled for every species so lookups never need a fallback.
 */
export interface ISpeciesProfile {
  readonly sensesAwake: ISpeciesSenses;
  readonly sensesAsleep: ISpeciesSenses;
  /** Dominance rank in predator-vs-predator intimidation checks. */
  readonly sizeRank: number;
  readonly isPredator: boolean;
  /** Pounces (jaguar, wolf) instead of a ground strike. */
  readonly pouncesOnPrey: boolean;
  /** Distance between the predator's root and its target while striking (m). */
  readonly meleeStandoff: number;
  /** Extra reach added to the standoff at which the attack swing starts (m). */
  readonly attackReachBonus: number;
  /** Hit points, counted in arrow hits. */
  readonly maxHp: number;
  /** Seconds a wounded animal stays awake and alert. */
  readonly woundedAlertSeconds: number;
  /** Items dropped when looted, in display order. */
  readonly loot: readonly InventoryItemId[];
  /** Base range at which a predator notices the player (m). */
  readonly playerDetectRange: number;
  /** Detection range once already chasing the player (m). */
  readonly playerDetectRangeWhileChasing: number;
  /** Detection range after being shot (m). */
  readonly provokedDetectRange: number;
  readonly predatorFleeSpeed: number;
  readonly chargeSpeed: number;
  readonly stalkSpeed: number;
  readonly predatorBodyRadius: number;
  readonly preyFleeSpeed: number;
  readonly shelterSpeed: number;
  /** Wander hash above this value means "stand and graze". */
  readonly grazePauseThreshold: number;
  readonly grazeSpeed: number;
  readonly grazeHopRate: number;
  readonly preyBodyRadius: number;
}
// #endregion

// ======================== DEFAULTS ======================== \\
// #region Defaults
const DEFAULT_SENSES_AWAKE: ISpeciesSenses = { visionRange: 14.0, hearingRadius: 18.0 };
const DEFAULT_SENSES_ASLEEP: ISpeciesSenses = { visionRange: 0, hearingRadius: 10.0 };

/** Values shared by most species; each entry below overrides what differs. */
const BASE_PROFILE: ISpeciesProfile = {
  sensesAwake: DEFAULT_SENSES_AWAKE,
  sensesAsleep: DEFAULT_SENSES_ASLEEP,
  sizeRank: 1,
  isPredator: false,
  pouncesOnPrey: false,
  meleeStandoff: 1.75,
  attackReachBonus: 0.65,
  maxHp: 30,
  woundedAlertSeconds: 8.0,
  loot: [],
  playerDetectRange: 16.5,
  playerDetectRangeWhileChasing: 16.5,
  provokedDetectRange: 42.0,
  predatorFleeSpeed: 5.2,
  chargeSpeed: 5.6,
  stalkSpeed: 1.9,
  predatorBodyRadius: 0.72,
  preyFleeSpeed: 5.4,
  shelterSpeed: 3.6,
  grazePauseThreshold: 0.55,
  grazeSpeed: 1.75,
  grazeHopRate: 8.5,
  preyBodyRadius: 0.38,
};
// #endregion

// ======================== PROFILE TABLE ======================== \\
// #region Profile Table
/** Summary: Tuning for every ground-animal species. */
export const SPECIES_PROFILES: Readonly<Record<GroundAnimalSpecies, ISpeciesProfile>> = {
  rabbit: {
    ...BASE_PROFILE,
    loot: ['raw_game_meat', 'small_hide'],
    preyFleeSpeed: 6.8,
  },
  squirrel: {
    ...BASE_PROFILE,
    loot: ['raw_game_meat', 'small_hide'],
    preyFleeSpeed: 7.8,
  },
  deer: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 20.0, hearingRadius: 23.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 11.5 },
    sizeRank: 2,
    maxHp: 90,
    loot: ['deer_meat', 'deer_hide', 'deer_antlers', 'animal_bone'],
    preyFleeSpeed: 9.2,
    shelterSpeed: 4.2,
    grazePauseThreshold: 0.42,
    grazeSpeed: 1.55,
    grazeHopRate: 6.2,
    preyBodyRadius: 0.72,
  },
  sheep: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 14.0, hearingRadius: 17.0 },
    sizeRank: 2,
    maxHp: 60,
    loot: ['raw_game_meat', 'sheep_hide', 'animal_bone'],
    shelterSpeed: 2.8,
    grazePauseThreshold: 0.42,
    grazeSpeed: 1.25,
    preyBodyRadius: 0.65,
  },
  bear: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 22.5, hearingRadius: 24.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 10.5 },
    sizeRank: 4,
    isPredator: true,
    meleeStandoff: 2.45,
    maxHp: 240,
    loot: ['bear_meat', 'bear_hide', 'bear_claws', 'animal_fat', 'animal_bone'],
    playerDetectRange: 22.0,
    playerDetectRangeWhileChasing: 22.0,
    predatorFleeSpeed: 6.8,
    chargeSpeed: 6.6,
    stalkSpeed: 2.4,
    predatorBodyRadius: 1.45,
  },
  crocodile: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 15.0, hearingRadius: 16.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 9.5 },
    sizeRank: 3.5,
    isPredator: true,
    meleeStandoff: 2.65,
    // Lunges forward once it thinks it is close enough (~4.35 m).
    attackReachBonus: 1.7,
    maxHp: 180,
    woundedAlertSeconds: 14.0,
    loot: ['raw_game_meat', 'crocodile_hide', 'crocodile_teeth', 'animal_bone'],
    playerDetectRange: 18.0,
    playerDetectRangeWhileChasing: 32.0,
    provokedDetectRange: 60.0,
    predatorBodyRadius: 1.25,
  },
  jaguar: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 22.0, hearingRadius: 24.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 12.0 },
    sizeRank: 3,
    isPredator: true,
    pouncesOnPrey: true,
    meleeStandoff: 1.8,
    maxHp: 120,
    loot: ['raw_game_meat', 'jaguar_hide', 'wolf_fang', 'animal_bone'],
    predatorFleeSpeed: 8.8,
    chargeSpeed: 8.2,
    stalkSpeed: 2.6,
    predatorBodyRadius: 0.8,
  },
  wolf: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 21.0, hearingRadius: 24.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 12.0 },
    sizeRank: 2.5,
    isPredator: true,
    pouncesOnPrey: true,
    maxHp: 90,
    loot: ['raw_game_meat', 'wolf_hide', 'wolf_fang', 'animal_bone'],
    predatorFleeSpeed: 8.2,
    chargeSpeed: 7.6,
    stalkSpeed: 2.5,
  },
  rhino: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 19.5, hearingRadius: 22.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 11.0 },
    sizeRank: 4,
    isPredator: true,
    meleeStandoff: 2.4,
    maxHp: 210,
    loot: ['raw_game_meat', 'rhino_hide', 'rhino_horn', 'animal_fat', 'animal_bone'],
    playerDetectRange: 19.5,
    playerDetectRangeWhileChasing: 19.5,
    predatorFleeSpeed: 8.0,
    predatorBodyRadius: 1.4,
  },
  lion: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 22.0, hearingRadius: 24.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 12.0 },
    sizeRank: 3.2,
    isPredator: true,
    pouncesOnPrey: true,
    meleeStandoff: 1.85,
    maxHp: 150,
    loot: ['raw_game_meat', 'jaguar_hide', 'wolf_fang', 'animal_bone'],
    predatorFleeSpeed: 8.6,
    chargeSpeed: 8.0,
    stalkSpeed: 2.5,
    predatorBodyRadius: 0.85,
  },
  stag: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 22.0, hearingRadius: 24.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 12.0 },
    sizeRank: 3.5,
    maxHp: 270,
    meleeStandoff: 2.2,
    attackReachBonus: 0.95,
    chargeSpeed: 8.6,
    stalkSpeed: 4.2,
    loot: ['deer_meat', 'deer_hide', 'deer_antlers', 'animal_bone'],
    preyFleeSpeed: 9.4,
    shelterSpeed: 4.3,
    grazePauseThreshold: 0.42,
    grazeSpeed: 1.6,
    grazeHopRate: 6.0,
    preyBodyRadius: 0.95,
  },
  dragon: {
    ...BASE_PROFILE,
    sizeRank: 10,
    isPredator: true,
    maxHp: 7500,
    woundedAlertSeconds: 18.0,
    loot: ['dragon_meat', 'dragon_scales', 'dragon_horn', 'dragon_claws', 'dragon_bone'],
  },
  hippo: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 24.0, hearingRadius: 22.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 11.0 },
    sizeRank: 4.5,
    isPredator: false,
    maxHp: 280,
    meleeStandoff: 2.35,
    attackReachBonus: 1.55,
    woundedAlertSeconds: 20.0,
    playerDetectRange: 14.5,
    playerDetectRangeWhileChasing: 28.0,
    provokedDetectRange: 46.0,
    chargeSpeed: 6.4,
    stalkSpeed: 2.4,
    preyFleeSpeed: 5.2,
    predatorFleeSpeed: 5.2,
    shelterSpeed: 2.2,
    grazePauseThreshold: 0.56,
    grazeSpeed: 1.35,
    grazeHopRate: 4.8,
    predatorBodyRadius: 0.95,
    preyBodyRadius: 0.95,
    loot: ['raw_game_meat', 'raw_game_meat', 'animal_fat', 'animal_bone'],
  },
  koifish: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 16.0, hearingRadius: 14.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 8.0 },
    sizeRank: 1,
    isPredator: false,
    maxHp: 45,
    woundedAlertSeconds: 8.0,
    preyFleeSpeed: 4.8,
    predatorFleeSpeed: 4.8,
    chargeSpeed: 3.6,
    stalkSpeed: 1.8,
    grazePauseThreshold: 0.82,
    grazeSpeed: 1.65,
    grazeHopRate: 8.5,
    shelterSpeed: 2.4,
    predatorBodyRadius: 0.28,
    preyBodyRadius: 0.28,
    loot: ['raw_game_meat', 'animal_fat'],
  },
  dolphin: {
    ...BASE_PROFILE,
    sensesAwake: { visionRange: 32.0, hearingRadius: 30.0 },
    sensesAsleep: { visionRange: 0, hearingRadius: 15.0 },
    sizeRank: 3,
    isPredator: false,
    maxHp: 180,
    woundedAlertSeconds: 14.0,
    preyFleeSpeed: 8.2,
    predatorFleeSpeed: 8.2,
    chargeSpeed: 7.4,
    stalkSpeed: 3.8,
    grazePauseThreshold: 0.88,
    grazeSpeed: 4.2,
    grazeHopRate: 9.5,
    shelterSpeed: 4.8,
    predatorBodyRadius: 0.62,
    preyBodyRadius: 0.62,
    loot: ['raw_game_meat', 'animal_fat', 'animal_bone'],
  },
};
// #endregion

