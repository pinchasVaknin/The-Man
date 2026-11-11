// ============================================================================
// MODULE: World / Systems / Boids & Wildlife System
// DESIGN: Autonomous flocking birds and biome-specific ground animal AI state machine (SRP)
// SUMMARY: Simulates 3D Reynolds boids and autonomous ground animals (rabbits, squirrels,
//          deer, sheep, bears, crocodiles, jaguars) with sensory vision/hearing profiles,
//          deer listening/evaluating behavior, predator stalking/charging/attacking/fleeing,
//          mountain bear cave rain shelter, night wake-up meters, and hunting/looting.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import {
  WATER_LEVEL,
  PLAYABLE_RADIUS,
  WORLD_SPAWN,
  BEAR_MOUNTAIN_CAVES,
  CROCODILE_RIVER_BEND_POS,
  VOLCANO_SANCTUM_POS,
  FLOATING_BLOOMING_ISLANDS,
  SOUTHERN_DRAGON_RUINS_POS,
  SOUTHWEST_OASIS_POS,
  MURKY_SWAMP_BIOME_POS,
  SOLID_BUILDING_BOXES,
  resolveHorizontalBoxCollision,
  getNearbySolidBuildingBoxes,
} from '../domain/landmarksRegistry';
import { hash2D } from '../domain/noiseAndMath';
import { t } from '../../locales';
import {
  groundHeightAt,
  walkableHeightAt,
  getWorldObstacles,
  getNearbyWorldObstacles,
  isInsideVolcanoSanctum,
} from './terrainAndBiomeSystem';
import {
  getActiveSailableShip,
  isEntityOnSailableShipDeck,
  sailableShipDeckHeightAt,
} from './sailableShipSystem';
import { SPECIES_PROFILES } from './wildlifeSpeciesProfiles';
import {
  getActivePlacedTrapsRef,
  generateCaughtAnimalLoot,
  evaluateAnimalTrapChoice,
  TRAP_RECIPES,
  getTrapRandomGenerator,
  TRAP_RANDOM_APPROACH_PROBABILITY,
} from './animalTrapsSystem';
import type {
  IArrowProjectile,
  InventoryItemId,
  IPlayerState,
  IRideableHorseState,
} from '../domain/worldTypes';

export type GroundAnimalSpecies =
  | 'rabbit'
  | 'squirrel'
  | 'deer'
  | 'sheep'
  | 'bear'
  | 'crocodile'
  | 'jaguar'
  | 'wolf'
  | 'rhino'
  | 'lion'
  | 'stag'
  | 'dragon'
  | 'hippo'
  | 'koifish'
  | 'dolphin';

export type AnimalAiBehavior =
  | 'sleeping'
  | 'grazing'
  | 'wandering'
  | 'sitting'
  | 'listening'
  | 'stalking'
  | 'roaring'
  | 'stomping'
  | 'charging'
  | 'attacking'
  | 'fleeing'
  | 'seeking_shelter'
  | 'dead';

export interface IBirdFlockConfig {
  readonly id: number;
  readonly centerX: number;
  readonly centerZ: number;
  readonly patrolRadius: number;
  readonly cruiseAltitudeAboveGround: number;
  readonly count: number;
}

export const BIRD_FLOCK_CONFIGS: readonly IBirdFlockConfig[] = [
  { id: 0, centerX: -12, centerZ: 18, patrolRadius: 28, cruiseAltitudeAboveGround: 14, count: 12 },
  { id: 1, centerX: 48, centerZ: -24, patrolRadius: 34, cruiseAltitudeAboveGround: 16, count: 12 },
  { id: 2, centerX: -46, centerZ: -38, patrolRadius: 32, cruiseAltitudeAboveGround: 18, count: 12 },
];

/**
 * Summary: Autonomous 3D flocking bird agent state (Reynolds Boids).
 * Design: Tracks position, velocity, wing flap phase, and startled flee timer.
 */
export interface IBoidBirdState {
  id: number;
  flockId?: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw?: number;
  wingPhase: number;
  startleTimer: number; // > 0 when scattering away from player/horse
  fleeTimer: number;    // alias synced with startleTimer for backwards compatibility
  roosting: boolean;    // true when resting at night
  homeX: number;
  homeZ: number;
  level?: number;
  hp?: number;
  maxHp?: number;
  isDead?: boolean;
  isLooted?: boolean;
  hitReactionTimer?: number;
  groundState?: 'flying' | 'descending' | 'walking_to_bait' | 'eating_bait';
  groundTimer?: number;
  targetTrapId?: string;
  landingX?: number;
  landingZ?: number;
  declinedTrapIds?: Record<string, number>;
}

/**
 * Summary: Autonomous ground animal state across rural, forest, birch, shore, and mountain biomes.
 * Design: Implements an AI state machine with sensory vision/hearing ranges, deer listening evaluation,
 *         predator prey-hunting & threat-fleeing, bear cave rain sheltering, and corpse looting.
 */
export interface ISmallAnimalState {
  id: number;
  species: GroundAnimalSpecies;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hopPhase: number;
  homeX: number;
  homeZ: number;
  shelterTargetX?: number;
  shelterTargetZ?: number;
  isSeekingShelter?: boolean;
  alertLevel: 'grazing' | 'curious' | 'fleeing';
  aiBehavior?: AnimalAiBehavior;
  listenTimer?: number;
  listenCooldown?: number;
  actionTimer?: number;
  stompWarningDone?: boolean;
  roarWarningDone?: boolean;
  inWater?: boolean;
  stimulusX?: number;
  stimulusZ?: number;
  caveIndex?: number;
  isFleeing?: boolean;
  fleeCooldown: number;
  isResting: boolean;
  wakeMeter: number; // 0..1 invisible noise wake-up meter while sleeping at night
  wokenUpTimer: number; // > 0 when awakened by player noise at night or holding a grudge
  isLeashedReturning?: boolean; // true when walking back to territory after BOTH out of chase range AND out of territory
  hp?: number; // Current invisible health points (multi-arrow survival)
  maxHp?: number; // Maximum invisible health points for this species
  hitReactionTimer?: number; // Brief flinch/aggro timer when struck by an arrow or sword
  pounceHeight?: number;
  pounceDirX?: number;
  pounceDirZ?: number;
  pounceStartX?: number;
  pounceStartZ?: number;
  rhinoPhase?: 'charging' | 'overshoot_braking' | 'realigning';
  rhinoPhaseTimer?: number;
  rhinoChargeSpeed?: number;
  attackHitCooldownTimer?: number;
  level?: number;
  isDead?: boolean; // true when hunted/killed after hp reaches 0
  isLooted?: boolean; // true after player collects loot with [E]
  corpseLootItems?: InventoryItemId[]; // remaining items inside animal corpse container
  isTamed?: boolean; // true after player tames & mounts a Royal Stag or Mystical CatLion
  isMountedByPlayer?: boolean; // true while actively ridden by the player
  isBoss?: boolean; // true for the giant central Volcano Sanctum Boss CatLion
  canBeTamed?: boolean; // true only for Stags and the giant central Volcano Boss CatLion
  isSubdued?: boolean; // true when the Volcano Boss CatLion is beaten to low HP and awaits meat taming
  respawnTimer?: number; // seconds remaining before a killed animal respawns at its home territory
  trappedByBearJawTimer?: number; // > 0 while Heavy Steel Bear Trap is clamped onto bear's front paw during 4-legged roar
  bearTrapSlowTimer?: number; // > 0 while bear's movement speed is reduced by 10% for 7s after bear trap roar finishes
  treeState?: 'ground_forage' | 'running_to_tree' | 'climb_up' | 'perched' | 'climb_down' | 'canopy_leap';
  treeObstacleX?: number;
  treeObstacleZ?: number;
  treeBaseY?: number;
  treeTrunkRadius?: number;
  treeTargetHeight?: number;
  treeClimbAngle?: number;
  treeClimbPitch?: number;
  treeStateTimer?: number;
  lastTreeX?: number;
  lastTreeZ?: number;
  leapStartX?: number;
  leapStartY?: number;
  leapStartZ?: number;
  leapEndX?: number;
  leapEndY?: number;
  leapEndZ?: number;
  leapDuration?: number;
  forageTargetX?: number;
  forageTargetZ?: number;
  decisionCounter?: number;
  trapDecisionTrapId?: string;
  trapDecisionOutcome?: 'approach' | 'ignore';
  trapDecisionTimer?: number;
}

/** Time in seconds before a hunted/killed regular animal respawns at its home territory. */
export const ANIMAL_RESPAWN_DELAY_SECONDS = 45.0;

/** Base damage dealt by a standard arrow strike. */
export const BASE_ARROW_HIT_DAMAGE = 30;
// #endregion

// ======================== SHELTER TREE CANOPIES ======================== \\
// #region Shelter Tree Canopies
/**
 * Summary: Deterministic tree canopy shelter coordinates across forest, grove, and meadow biomes.
 */
export const WILDLIFE_SHELTER_TREES: ReadonlyArray<{ x: number; z: number }> = [
  { x: -48, z: 16 },
  { x: -54, z: 22 },
  { x: 40, z: -46 },
  { x: 50, z: -40 },
  { x: -27, z: 43 },
  { x: 33, z: 36 },
  { x: 14, z: 26 },
  { x: -22, z: 18 },
  { x: 28, z: -18 },
  { x: -38, z: -12 },
  { x: 64, z: 22 },
  { x: -68, z: -24 },
  { x: -106, z: 138 },
  { x: 20, z: 172 },
  { x: 128, z: 104 },
  { x: 86, z: 18 },
  { x: 108, z: -24 },
  { x: 74, z: -48 },
  { x: -115, z: 176 },
  { x: 58, z: 192 },
  { x: -148, z: 164 },
];

let activeWorldAnimalsRegistry: ISmallAnimalState[] = [];
let activeWorldBirdsRegistry: IBoidBirdState[] = [];

/**
 * Summary: Returns the active live world ground animals registry for combat hit checks and [E] looting.
 */
export function getActiveWorldAnimals(): ISmallAnimalState[] {
  return activeWorldAnimalsRegistry;
}

/**
 * Summary: Returns the active live world birds registry for bow/sword hit checks and [E] looting.
 */
export function getActiveWorldBirds(): IBoidBirdState[] {
  return activeWorldBirdsRegistry;
}

/**
 * Summary: Resets all world birds back to healthy flying state when the world is reset.
 */
export function resetActiveWorldBirds(): void {
  for (let i = 0; i < activeWorldBirdsRegistry.length; i++) {
    const b = activeWorldBirdsRegistry[i];
    const gy = Math.max(WATER_LEVEL, groundHeightAt(b.homeX, b.homeZ));
    b.x = b.homeX;
    b.z = b.homeZ;
    b.y = gy + 14 + (i % 4) * 1.4;
    b.vx = 6.5;
    b.vy = 0;
    b.vz = 3.5;
    b.isDead = false;
    b.isLooted = false;
    b.hp = b.maxHp ?? 25;
    b.groundState = 'flying';
    b.groundTimer = 0;
    b.targetTrapId = undefined;
    b.startleTimer = 0;
    b.fleeTimer = 0;
  }
}

/**
 * Summary: Computes the combat level and base melee/charge attack damage for a ground animal,
 * scaled by species strength, boss status, and individual animal level.
 */
export function getAnimalStrengthAndLevel(animal: ISmallAnimalState): {
  readonly level: number;
  readonly baseStrength: number;
  readonly attackDamage: number;
  readonly speedMultiplier: number;
  readonly defenseReduction: number;
  readonly xpRewardMultiplier: number;
  readonly threatRating: 'easy' | 'moderate' | 'dangerous' | 'deadly';
} {
  let defaultLevel = 1;
  let baseStrength = 6;
  if (animal.species === 'dragon') {
    defaultLevel = 18;
    baseStrength = 36;
  } else if (animal.species === 'lion' && animal.isBoss) {
    defaultLevel = 15;
    baseStrength = 28;
  } else if (animal.species === 'lion') {
    defaultLevel = 8;
    baseStrength = 18;
  } else if (animal.species === 'bear') {
    defaultLevel = 7;
    baseStrength = 22;
  } else if (animal.species === 'rhino') {
    defaultLevel = 7;
    baseStrength = 20;
  } else if (animal.species === 'crocodile') {
    defaultLevel = 5;
    baseStrength = 16;
  } else if (animal.species === 'stag') {
    defaultLevel = 6;
    baseStrength = 14;
  } else if (animal.species === 'jaguar') {
    defaultLevel = 5;
    baseStrength = 13;
  } else if (animal.species === 'wolf') {
    defaultLevel = 3;
    baseStrength = 10;
  } else if (animal.species === 'deer' || animal.species === 'sheep') {
    defaultLevel = 2;
    baseStrength = 4;
  } else {
    defaultLevel = 1;
    baseStrength = 2;
  }
  const level = Math.max(1, animal.level ?? defaultLevel + (animal.id % 2));
  const levelMult = 1 + (level - 1) * 0.16;
  const attackDamage = Math.round(baseStrength * levelMult);
  const speedMultiplier = 1 + Math.min(0.40, (level - 1) * 0.04);
  const defenseReduction = Math.min(0.30, (level - 1) * 0.025);
  const xpRewardMultiplier = 1 + (level - 1) * 0.25;

  let threatRating: 'easy' | 'moderate' | 'dangerous' | 'deadly' = 'easy';
  if (level >= 14 || animal.species === 'dragon' || animal.isBoss) {
    threatRating = 'deadly';
  } else if (level >= 7 || ['bear', 'rhino', 'lion'].includes(animal.species)) {
    threatRating = 'dangerous';
  } else if (level >= 4 || ['wolf', 'jaguar', 'crocodile', 'stag'].includes(animal.species)) {
    threatRating = 'moderate';
  }

  return {
    level,
    baseStrength,
    attackDamage,
    speedMultiplier,
    defenseReduction,
    xpRewardMultiplier,
    threatRating,
  };
}

// #endregion

// ======================== SENSORY & PREDATOR PROFILES ======================== \\
// #region Sensory & Predator Profiles
/**
 * Summary: Returns the vision and hearing radius for an animal based on species and sleep state.
 * Design: When sleeping (`isSleeping = true`), vision is strictly 0 (eyes closed!) and hearing
 *         radius is reduced compared to when awake.
 */
export function getAnimalSensoryProfile(
  species: GroundAnimalSpecies,
  isSleeping: boolean
): { readonly visionRange: number; readonly hearingRadius: number } {
  const profile = SPECIES_PROFILES[species];
  return isSleeping ? profile.sensesAsleep : profile.sensesAwake;
}

/**
 * Summary: Returns relative size/dominance rank for predator vs. predator/threat intimidation checks.
 */
export function getAnimalSizeRank(species: GroundAnimalSpecies, isBoss = false): number {
  if (species === 'lion' && isBoss) return 5.5;
  return SPECIES_PROFILES[species].sizeRank;
}

export function isPredatorSpecies(species: GroundAnimalSpecies): boolean {
  return SPECIES_PROFILES[species].isPredator;
}

/**
 * Summary: Natural melee standoff distance (in meters) between a predator's root center (a.x, a.z)
 *          and its target's center (preyX, preyZ). Ensures the predator's head, jaws, and front claws
 *          strike right in front of the player without the root center ever walking onto (0,0) or
 *          overshooting past the player.
 */
export function getPredatorMeleeStandoffDist(species: GroundAnimalSpecies, isBoss = false): number {
  if (species === 'lion' && isBoss) return 2.95;
  return SPECIES_PROFILES[species].meleeStandoff;
}

/**
 * Summary: Distance (in meters) at which a charging predator transitions into its active melee attack swing.
 */
export function getPredatorAttackTriggerDist(species: GroundAnimalSpecies, isBoss = false): number {
  if (species === 'lion' && isBoss) {
    return getPredatorMeleeStandoffDist(species, true) + 1.15;
  }
  return getPredatorMeleeStandoffDist(species, false) + SPECIES_PROFILES[species].attackReachBonus;
}

/**
 * Summary: Returns how deeply (in meters below WATER_LEVEL) an animal's root sinks when swimming in water,
 *          so land animals sink up to their neck/back instead of appearing to run on the surface,
 *          while crocodiles float naturally at their waterline.
 */
export function getAnimalWaterSubmergenceDepth(species: GroundAnimalSpecies): number {
  switch (species) {
    case 'rhino':
      return 1.15;
    case 'bear':
      return 1.05;
    case 'stag':
      return 1.02;
    case 'deer':
      return 0.88;
    case 'lion':
      return 0.78;
    case 'jaguar':
      return 0.68;
    case 'wolf':
      return 0.62;
    case 'sheep':
      return 0.50;
    case 'crocodile':
      return 0.24;
    case 'rabbit':
      return 0.22;
    case 'squirrel':
      return 0.18;
    case 'dragon':
      return 1.80;
    case 'hippo':
      return 0.65;
    case 'koifish':
      return 0.24;
    case 'dolphin':
      return 0.36;
  }
}

/**
 * Summary: Returns the water speed multiplier for an animal swimming in water.
 * Design: Non-aquatic land animals lose most of their speed (0.38x) when swimming,
 *         whereas semi-aquatic crocodiles/hippos and aquatic koi/dolphins maintain or increase their speed in water.
 */
export function getAnimalWaterSpeedMultiplier(species: GroundAnimalSpecies): number {
  if (species === 'crocodile') return 1.38;
  if (species === 'hippo') return 1.18;
  if (species === 'koifish') return 1.45;
  if (species === 'dolphin') return 1.65;
  return 0.38;
}
// #endregion

// ======================== HUNTING & LOOTING HELPERS ======================== \\
// #region Hunting & Looting Helpers

/**
 * Summary: Returns the localized species name for HUD prompts.
 */
export function getAnimalSpeciesName(species: GroundAnimalSpecies): string {
  return t(`wildlife.species.${species}`);
}

/**
 * Summary: Returns the deterministic loot drops and localized HUD notification for a hunted animal.
 * Design: Item labels come from the item catalog strings, so the toast always names exactly
 *         the items the player receives.
 */
const SINGLE_QUANTITY_HIDE_ITEMS: ReadonlySet<InventoryItemId> = new Set<InventoryItemId>([
  'small_hide',
  'deer_hide',
  'sheep_hide',
  'wolf_hide',
  'jaguar_hide',
  'crocodile_hide',
  'bear_hide',
  'rhino_hide',
  'rhino_horn',
]);

/**
 * Summary: Returns the quantity of a specific loot item dropped by a hunted animal.
 * Hides/pelts drop 1 piece, while bones, meat, fangs, claws, teeth, and scales drop multiple pieces (2-4).
 */
export function getAnimalLootItemQuantity(
  itemId: InventoryItemId,
  species: GroundAnimalSpecies
): number {
  if (SINGLE_QUANTITY_HIDE_ITEMS.has(itemId)) {
    return 1;
  }
  switch (itemId) {
    case 'animal_bone':
      return species === 'bear' || species === 'rhino'
        ? 4
        : species === 'deer' || species === 'crocodile' || species === 'stag'
          ? 3
          : 2;
    case 'raw_game_meat':
      return species === 'rabbit' || species === 'squirrel' || species === 'sheep' ? 2 : 3;
    case 'deer_meat':
      return 3;
    case 'bear_meat':
      return 4;
    case 'dragon_meat':
      return 4;
    case 'wolf_fang':
      return 2;
    case 'bear_claws':
      return 4;
    case 'crocodile_teeth':
      return 3;
    case 'animal_fat':
      return species === 'bear' ? 3 : 2;
    case 'deer_antlers':
      return 2;
    case 'dragon_scales':
      return 4;
    case 'dragon_claws':
      return 4;
    case 'dragon_bone':
      return 3;
    case 'dragon_horn':
      return 2;
    default:
      return 2;
  }
}

export function getAnimalLootDrops(species: GroundAnimalSpecies): {
  readonly itemIds: readonly InventoryItemId[];
  readonly itemQuantities: Readonly<Record<string, number>>;
  readonly expandedItemIds: readonly InventoryItemId[];
  readonly itemLabels: readonly string[];
  readonly notification: string;
} {
  const itemIds = SPECIES_PROFILES[species].loot;
  const itemQuantities: Record<string, number> = {};
  const expandedItemIds: InventoryItemId[] = [];
  const itemLabels = itemIds.map((itemId) => {
    const qty = getAnimalLootItemQuantity(itemId, species);
    itemQuantities[itemId] = qty;
    for (let q = 0; q < qty; q++) {
      expandedItemIds.push(itemId);
    }
    const baseName = t(`items.${itemId}.name`);
    return qty > 1 ? `${baseName} ×${qty}` : baseName;
  });
  return {
    itemIds,
    itemQuantities,
    expandedItemIds,
    itemLabels,
    notification: t('wildlife.loot_toast', {
      species: getAnimalSpeciesName(species),
      items: itemLabels.join(', '),
    }),
  };
}

/**
 * Summary: Returns the maximum health points (`maxHp`, in arrow hits) for each species,
 * scaled by animal level and boss status. Higher level creatures have significantly tougher health pools.
 */
export function getAnimalMaxHp(
  species: GroundAnimalSpecies,
  level = 1,
  isBoss = false
): number {
  if (species === 'lion' && isBoss) {
    return Math.round(360 * (1 + (Math.max(1, level) - 1) * 0.12));
  }
  const baseHp = SPECIES_PROFILES[species].maxHp;
  const levelMult = 1 + (Math.max(1, level) - 1) * 0.18;
  return Math.round(baseHp * levelMult);
}

/**
 * Summary: Marks an animal as killed (stops movement and lies on its side).
 */
export function killGroundAnimal(animal: ISmallAnimalState): void {
  if (animal.isDead || animal.isTamed || animal.isMountedByPlayer) return;
  animal.hp = 0;
  animal.isDead = true;
  animal.isLooted = false;
  animal.isSubdued = false;
  // Kings / Bosses (Volcano Boss CatLion & Southern Ruins Dragon) never respawn once slain!
  animal.respawnTimer =
    animal.isBoss || animal.species === 'dragon' ? undefined : ANIMAL_RESPAWN_DELAY_SECONDS;
  animal.vx = 0;
  animal.vz = 0;
  animal.treeClimbPitch = 0;
  if (
    animal.species === 'squirrel' &&
    animal.treeObstacleX !== undefined &&
    animal.treeObstacleZ !== undefined
  ) {
    const dx = animal.x - animal.treeObstacleX;
    const dz = animal.z - animal.treeObstacleZ;
    const d = Math.hypot(dx, dz) || 1;
    const safeDropRad = (animal.treeTrunkRadius ?? 0.42) + 0.42;
    if (d < safeDropRad) {
      animal.x = animal.treeObstacleX + (dx / d) * safeDropRad;
      animal.z = animal.treeObstacleZ + (dz / d) * safeDropRad;
    }
  }
  animal.treeState = 'ground_forage';
  if (animal.species === 'koifish') {
    animal.y = Math.min(animal.y ?? WATER_LEVEL - 0.38, WATER_LEVEL - 0.42);
  } else {
    animal.y = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(animal.x, animal.z).height);
  }
  animal.isResting = false;
  animal.isSeekingShelter = false;
  animal.isFleeing = false;
  animal.aiBehavior = 'dead';
}

/**
 * Summary: Finds the nearest live animal within very close proximity (`maxDist <= 5.5m`) and view cone,
 * for displaying overhead level badge, health bar, and combat threat rating when right next to a creature.
 */
export function findTargetedLiveAnimal(
  playerX: number,
  playerY: number,
  playerZ: number,
  playerYaw: number,
  playerPitch = 0,
  maxDist = 5.5,
  animals: readonly ISmallAnimalState[] = activeWorldAnimalsRegistry
): ISmallAnimalState | null {
  const fwdX = -Math.sin(playerYaw);
  const fwdZ = -Math.cos(playerYaw);
  let best: ISmallAnimalState | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    if (a.isDead || a.isLooted || a.isMountedByPlayer) continue;
    const dx = a.x - playerX;
    const dy = a.y - playerY;
    const dz = a.z - playerZ;
    const dist = Math.hypot(dx, dz);
    if (dist > maxDist || Math.abs(dy) > 4.5) continue;

    const dot = (dx * fwdX + dz * fwdZ) / (dist || 1);
    if (dot > 0.55 || dist <= 2.8) {
      const score = dot * 2.0 - dist / maxDist;
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
  }
  return best;
}

/**
 * Summary: Alerts all living crocodiles in the world to immediately swarm and charge the attacker
 *          whenever any crocodile is struck.
 */
export function triggerCrocodilePackAggro(
  animals: readonly ISmallAnimalState[] = activeWorldAnimalsRegistry,
  attackerX?: number,
  attackerZ?: number
): number {
  let alertedCount = 0;
  for (let i = 0; i < animals.length; i++) {
    const c = animals[i];
    if (c.isDead || c.species !== 'crocodile') continue;
    c.isResting = false;
    c.isSeekingShelter = false;
    c.isFleeing = false;
    c.fleeCooldown = 0;
    c.alertLevel = 'curious';
    c.aiBehavior = 'charging';
    c.isLeashedReturning = false;
    c.wokenUpTimer = 45.0;
    if (attackerX !== undefined && attackerZ !== undefined) {
      c.stimulusX = attackerX;
      c.stimulusZ = attackerZ;
    }
    alertedCount++;
  }
  return alertedCount;
}

/**
 * Summary: Applies combat damage to an animal's health (`hp`).
 *          - Tamed or player-mounted animals (`isTamed` / `isMountedByPlayer`) are completely immune to player damage.
 *          - Floating Island Stags (`stag`) are neutral until struck; once hit, they charge and retaliate with antler attacks!
 *          - The Giant Volcano Boss CatLion (`species === 'lion' && isBoss`) fights fiercely until reduced to <= 25% HP (`<= 90`),
 *            at which point it becomes subdued (`isSubdued = true`) so the player can either tame it with meat OR finish killing it!
 *          - Smaller Volcano CatLions (`species === 'lion' && !isBoss`) flee when their HP drops low.
 */
export function damageGroundAnimal(
  animal: ISmallAnimalState,
  damage = BASE_ARROW_HIT_DAMAGE,
  attackerX?: number,
  attackerZ?: number,
  allAnimals: readonly ISmallAnimalState[] = activeWorldAnimalsRegistry
): {
  readonly killed: boolean;
  readonly remainingHp: number;
  readonly maxHp: number;
} {
  const animalLevel = animal.level ?? 1;
  const maxHp = animal.maxHp ?? getAnimalMaxHp(animal.species, animalLevel, animal.isBoss);
  animal.maxHp = maxHp;
  if (animal.isTamed || animal.isMountedByPlayer) {
    return { killed: false, remainingHp: animal.hp ?? maxHp, maxHp };
  }
  if (animal.isDead) {
    return { killed: true, remainingHp: 0, maxHp };
  }
  const currentHp = animal.hp ?? maxHp;
  const { defenseReduction } = getAnimalStrengthAndLevel(animal);
  const effectiveDamage = Math.max(1, Math.round(damage * (1 - defenseReduction)));
  let remainingHp = Math.max(0, currentHp - effectiveDamage);

  // Giant Volcano Boss CatLion:
  // 1) Invulnerable to long-range cheese shots fired from outside the Volcano Sanctum!
  //    The hunter must enter the Volcano Sanctum corridors/chamber to damage the King CatLion.
  // 2) When reduced to <= 25% HP (<= 90 HP), enters subdued state so the player can choose
  //    to either tame it with meat [F]/[E] OR keep attacking to kill it!
  if (animal.species === 'lion' && animal.isBoss && !animal.isTamed) {
    if (
      attackerX !== undefined &&
      attackerZ !== undefined &&
      !isInsideVolcanoSanctum(attackerX, attackerZ)
    ) {
      return { killed: false, remainingHp: currentHp, maxHp };
    }
    const subdueThreshold = Math.max(60, Math.ceil(maxHp * 0.25));
    if (!animal.isSubdued && remainingHp <= subdueThreshold) {
      // First time crossing the subdue threshold: clamp at >= 30 HP so the player gets a clear chance to tame or execute it
      remainingHp = Math.max(BASE_ARROW_HIT_DAMAGE, remainingHp);
      animal.hp = remainingHp;
      animal.isSubdued = true;
      animal.hitReactionTimer = 0.45;
      animal.isResting = false;
      animal.isSeekingShelter = false;
      animal.isFleeing = false;
      animal.fleeCooldown = 0;
      animal.alertLevel = 'grazing';
      animal.aiBehavior = 'sitting';
      animal.vx = 0;
      animal.vz = 0;
      return { killed: false, remainingHp, maxHp };
    }
    if (animal.isSubdued && remainingHp > 0) {
      // Already subdued and struck again, but still has HP > 0: stays sitting until HP reaches 0
      animal.hp = remainingHp;
      animal.hitReactionTimer = 0.45;
      animal.aiBehavior = 'sitting';
      animal.vx = 0;
      animal.vz = 0;
      return { killed: false, remainingHp, maxHp };
    }
  }

  animal.hp = remainingHp;
  animal.hitReactionTimer = 0.45;

  // Striking any crocodile immediately triggers pack aggro across all crocodiles!
  if (animal.species === 'crocodile') {
    triggerCrocodilePackAggro(
      allAnimals.length > 0 ? allAnimals : [animal],
      attackerX,
      attackerZ
    );
  }

  if (remainingHp <= 0) {
    killGroundAnimal(animal);
    return { killed: true, remainingHp: 0, maxHp };
  }

  // Wounded but still alive: wake immediately, clear any leash, and remember the grudge for 45s!
  animal.isResting = false;
  animal.isSeekingShelter = false;
  animal.isLeashedReturning = false;
  animal.wokenUpTimer =
    animal.species === 'stag'
      ? 45.0
      : SPECIES_PROFILES[animal.species].woundedAlertSeconds;
  if (attackerX !== undefined && attackerZ !== undefined) {
    animal.stimulusX = attackerX;
    animal.stimulusZ = attackerZ;
  }

  // Smaller CatLions flee when their HP drops low (<= 2), whereas Stags and healthy predators charge & retaliate!
  const isLowHpSmallLion =
    animal.species === 'lion' && !animal.isBoss && remainingHp <= Math.max(1, Math.ceil(maxHp * 0.35));

  if (animal.species === 'stag' || animal.species === 'hippo') {
    animal.alertLevel = 'curious';
    animal.aiBehavior = 'charging';
    animal.isFleeing = false;
    animal.fleeCooldown = 0;
    animal.listenTimer = 0;
  } else if (
    isLowHpSmallLion ||
    !isPredatorSpecies(animal.species) ||
    (remainingHp <= 1 &&
      animal.species !== 'crocodile' &&
      animal.species !== 'dragon' &&
      !(animal.species === 'lion' && animal.isBoss))
  ) {
    animal.alertLevel = 'fleeing';
    animal.aiBehavior = 'fleeing';
    animal.isFleeing = true;
    animal.fleeCooldown = 5.5;
    animal.listenTimer = 0;
  } else {
    // Healthy bear/jaguar/crocodile/wolf/dragon/boss-lion struck from afar charges toward the hunter!
    animal.alertLevel = 'curious';
    animal.aiBehavior = 'charging';
    animal.stompWarningDone = true;
    animal.roarWarningDone = true;
    animal.isFleeing = false;
    animal.fleeCooldown = 0;
    if (animal.species === 'lion' && animal.isBoss) {
      animal.wokenUpTimer = 45.0;
    }
  }

  return { killed: false, remainingHp, maxHp };
}

/**
 * Summary: Returns true when the player is inside the Volcano Boss Chamber (r <= 28.5m)
 *          and the Boss CatLion is alive, untamed, and not yet subdued — locking the
 *          Obsidian Magma Gates at the chamber exits until the Boss is defeated or subdued!
 */
export function isVolcanoBossArenaLocked(
  playerX: number,
  playerZ: number,
  animals: readonly ISmallAnimalState[] = activeWorldAnimalsRegistry
): boolean {
  const distToCenter = Math.hypot(
    playerX - VOLCANO_SANCTUM_POS.x,
    playerZ - VOLCANO_SANCTUM_POS.z
  );
  if (distToCenter > VOLCANO_SANCTUM_POS.chamberRadius - 1.2) {
    return false;
  }
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    if (a.species === 'lion' && a.isBoss) {
      return !a.isDead && !a.isTamed && !a.isSubdued;
    }
  }
  return false;
}

/**
 * Summary: Evaluates whether the Southern Dragon at the ruins has an active combat/hunting target
 *          (either the player within range / after provoking the dragon, or a live prey animal like a deer
 *          within hunting range of the ruins). When `hasTarget` is false, the dragon must NEVER breathe fire
 *          or claw-attack at empty air, and instead cycles smoothly through flight, landing, walking, and resting.
 */
export function evaluateSouthernDragonTarget(
  dragonX: number,
  dragonZ: number,
  playerX: number,
  playerZ: number,
  animals: readonly ISmallAnimalState[] = activeWorldAnimalsRegistry,
  dragonWokenUpTimer = 0
): {
  readonly hasTarget: boolean;
  readonly targetKind: 'none' | 'player' | 'prey';
  readonly targetX: number;
  readonly targetZ: number;
  readonly distToTarget: number;
  readonly targetPrey: ISmallAnimalState | null;
} {
  const distToPlayer = Math.hypot(playerX - dragonX, playerZ - dragonZ);
  const playerIsTarget =
    distToPlayer < 38.0 || (dragonWokenUpTimer > 0 && distToPlayer < 95.0);

  let nearestPrey: ISmallAnimalState | null = null;
  let nearestPreyDist = 34.0;
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    if (a.isDead || a.species === 'dragon') continue;
    const d = Math.hypot(a.x - dragonX, a.z - dragonZ);
    if (d < nearestPreyDist) {
      nearestPreyDist = d;
      nearestPrey = a;
    }
  }

  if (
    playerIsTarget &&
    (!nearestPrey || distToPlayer <= nearestPreyDist + 6.0 || dragonWokenUpTimer > 0)
  ) {
    return {
      hasTarget: true,
      targetKind: 'player',
      targetX: playerX,
      targetZ: playerZ,
      distToTarget: distToPlayer,
      targetPrey: null,
    };
  }
  if (nearestPrey) {
    return {
      hasTarget: true,
      targetKind: 'prey',
      targetX: nearestPrey.x,
      targetZ: nearestPrey.z,
      distToTarget: nearestPreyDist,
      targetPrey: nearestPrey,
    };
  }
  return {
    hasTarget: false,
    targetKind: 'none',
    targetX: dragonX,
    targetZ: dragonZ,
    distToTarget: Infinity,
    targetPrey: null,
  };
}

/**
 * Summary: Finds the nearest dead, unlooted animal within interaction range (`maxDist`).
 */
export function findNearestDeadLootableAnimal(
  playerX: number,
  playerZ: number,
  animals: readonly ISmallAnimalState[] = activeWorldAnimalsRegistry,
  maxDist = 3.4,
  playerY?: number
): ISmallAnimalState | null {
  let best: ISmallAnimalState | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    if (!a.isDead || a.isLooted) continue;
    if (playerY !== undefined && Math.abs(a.y - playerY) > (a.species === 'dragon' ? 5.2 : 2.8)) {
      continue;
    }
    const allowedDist =
      a.species === 'dragon'
        ? Math.max(maxDist, 6.8)
        : a.species === 'lion' && a.isBoss
          ? Math.max(maxDist, 5.2)
          : maxDist;
    const d = Math.hypot(a.x - playerX, a.z - playerZ);
    if (d <= allowedDist && d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

/**
 * Summary: Loots a dead animal into the player's inventory, recovers any arrows stuck in the animal,
 *          and marks the corpse as looted.
 */
export function lootDeadAnimal(
  playerState: IPlayerState,
  animal: ISmallAnimalState,
  activeArrows?: IArrowProjectile[]
): {
  readonly ok: boolean;
  readonly species: GroundAnimalSpecies;
  readonly addedItemIds: readonly InventoryItemId[];
  readonly addedItems: readonly InventoryItemId[];
  readonly recoveredArrowCount: number;
  readonly notification: string;
} {
  if (!animal.isDead || animal.isLooted) {
    return {
      ok: false,
      species: animal.species,
      addedItemIds: [],
      addedItems: [],
      recoveredArrowCount: 0,
      notification: '',
    };
  }
  animal.isLooted = true;
  const drops = getAnimalLootDrops(animal.species);
  if (!playerState.ownedItemIds) {
    playerState.ownedItemIds = [];
  }
  const allAddedItemIds: InventoryItemId[] = [...drops.expandedItemIds];
  for (const itemId of drops.expandedItemIds) {
    playerState.ownedItemIds.push(itemId);
  }

  let recoveredArrowCount = 0;
  if (activeArrows && activeArrows.length > 0) {
    for (let i = activeArrows.length - 1; i >= 0; i--) {
      const arr = activeArrows[i];
      const isAttached =
        arr.attachedAnimalId === animal.id ||
        (arr.hitKind === 'animal' && arr.hitTargetId === String(animal.id)) ||
        (arr.stuck &&
          arr.hitKind !== 'target' &&
          arr.attachedAnimalId === undefined &&
          Math.hypot(arr.x - animal.x, arr.z - animal.z) <= 2.8);
      if (isAttached) {
        const arrowItemId: InventoryItemId =
          arr.arrowKind === 'fire'
            ? 'arrow_fire'
            : arr.arrowKind === 'wind'
              ? 'arrow_wind'
              : 'arrow_normal';
        playerState.ownedItemIds.push(arrowItemId);
        allAddedItemIds.push(arrowItemId);
        recoveredArrowCount++;
        activeArrows.splice(i, 1);
      }
    }
  }

  animal.corpseLootItems = [];
  return {
    ok: true,
    species: animal.species,
    addedItemIds: allAddedItemIds,
    addedItems: allAddedItemIds,
    recoveredArrowCount,
    notification:
      recoveredArrowCount > 0
        ? `${drops.notification} (+${recoveredArrowCount} Arrows Recovered)`
        : drops.notification,
  };
}

/**
 * Summary: Initializes (if needed) and returns the mutable array of loot items inside a dead animal's corpse container,
 *          including any arrows stuck in the animal.
 */
export function getOrInitAnimalCorpseLoot(
  animal: ISmallAnimalState,
  activeArrows?: IArrowProjectile[]
): InventoryItemId[] {
  if (!animal.corpseLootItems) {
    const drops = getAnimalLootDrops(animal.species);
    animal.corpseLootItems = [...drops.expandedItemIds];
  }
  if (activeArrows && activeArrows.length > 0) {
    for (let i = activeArrows.length - 1; i >= 0; i--) {
      const arr = activeArrows[i];
      const isAttached =
        arr.attachedAnimalId === animal.id ||
        (arr.hitKind === 'animal' && arr.hitTargetId === String(animal.id)) ||
        (arr.stuck &&
          arr.hitKind !== 'target' &&
          arr.attachedAnimalId === undefined &&
          Math.hypot(arr.x - animal.x, arr.z - animal.z) <= 2.8);
      if (isAttached) {
        const arrowItemId: InventoryItemId =
          arr.arrowKind === 'fire'
            ? 'arrow_fire'
            : arr.arrowKind === 'wind'
              ? 'arrow_wind'
              : 'arrow_normal';
        animal.corpseLootItems.push(arrowItemId);
        activeArrows.splice(i, 1);
      }
    }
  }
  return animal.corpseLootItems;
}
// #endregion

// ======================== STATE INITIALIZATION ======================== \\
// #region State Initialization
function caveLocalToWorld(caveIndex: number, lx: number, lz: number): { x: number; z: number } {
  const c = BEAR_MOUNTAIN_CAVES[caveIndex] ?? BEAR_MOUNTAIN_CAVES[0];
  const cosY = Math.cos(c.facingYaw);
  const sinY = Math.sin(c.facingYaw);
  return {
    x: Math.round((c.x + lx * cosY + lz * sinY) * 10) / 10,
    z: Math.round((c.z - lx * sinY + lz * cosY) * 10) / 10,
  };
}

function findNearestShelterPoint(
  x: number,
  z: number,
  species?: GroundAnimalSpecies,
  caveIndex?: number
): { x: number; z: number } {
  if (species === 'bear') {
    let targetCaveIndex = 0;
    let targetCave: (typeof BEAR_MOUNTAIN_CAVES)[number] = BEAR_MOUNTAIN_CAVES[0];
    if (caveIndex !== undefined && BEAR_MOUNTAIN_CAVES[caveIndex]) {
      targetCaveIndex = caveIndex;
      targetCave = BEAR_MOUNTAIN_CAVES[caveIndex];
    } else {
      let bestCaveDistSq = Infinity;
      for (let i = 0; i < BEAR_MOUNTAIN_CAVES.length; i++) {
        const c = BEAR_MOUNTAIN_CAVES[i];
        const dSq = (c.x - x) * (c.x - x) + (c.z - z) * (c.z - z);
        if (dSq < bestCaveDistSq) {
          bestCaveDistSq = dSq;
          targetCave = c;
          targetCaveIndex = i;
        }
      }
    }

    // 2-Stage Waypoint Pathing through the Mountain Cave Entrance Tunnel into the Deep Cavern:
    // Transform bear position into cave-local space (+Z is the open front entrance portal,
    // lz: -6..+5.5 is the entrance tunnel, and lz: -24..-6 is the wide inner cavern).
    const dx = x - targetCave.x;
    const dz = z - targetCave.z;
    const cosY = Math.cos(targetCave.facingYaw);
    const sinY = Math.sin(targetCave.facingYaw);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY;

    // Only head for the mouth while still outside it; once the bear is at the mouth (lz <= 13.5) it walks in.
    if (lz > 13.5 || (lz > -5.0 && Math.abs(lx) > 3.4)) {
      return { x: targetCave.entranceX, z: targetCave.entranceZ };
    }
    if (lz > -10.5) {
      return caveLocalToWorld(targetCaveIndex, 0, -11.5);
    }
    const alcoveX = lx >= 0 ? 5.2 : -5.2;
    return caveLocalToWorld(targetCaveIndex, alcoveX, -14.2);
  }

  let bestX = WILDLIFE_SHELTER_TREES[0].x;
  let bestZ = WILDLIFE_SHELTER_TREES[0].z;
  let bestDistSq = Infinity;
  for (let i = 0; i < WILDLIFE_SHELTER_TREES.length; i++) {
    const t = WILDLIFE_SHELTER_TREES[i];
    const dSq = (t.x - x) * (t.x - x) + (t.z - z) * (t.z - z);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestX = t.x + 0.85;
      bestZ = t.z + 0.65;
    }
  }
  return { x: bestX, z: bestZ };
}

/**
 * Summary: Routes a bear cleanly through the center of its mountain cave entrance tunnel
 *          whenever moving between the interior cavern and the exterior forest, preventing
 *          the bear from colliding with the interior cavern shoulder walls.
 */
function steerBearThroughCavePortal(
  bearX: number,
  bearZ: number,
  targetX: number,
  targetZ: number,
  caveIndex?: number
): { x: number; z: number } {
  let cIdx = caveIndex ?? -1;
  if (cIdx < 0 || !BEAR_MOUNTAIN_CAVES[cIdx]) {
    for (let i = 0; i < BEAR_MOUNTAIN_CAVES.length; i++) {
      const c = BEAR_MOUNTAIN_CAVES[i];
      if ((c.x - bearX) * (c.x - bearX) + (c.z - bearZ) * (c.z - bearZ) < 42 * 42) {
        cIdx = i;
        break;
      }
    }
  }
  if (cIdx < 0 || !BEAR_MOUNTAIN_CAVES[cIdx]) {
    return { x: targetX, z: targetZ };
  }
  const cave = BEAR_MOUNTAIN_CAVES[cIdx];
  const cosY = Math.cos(cave.facingYaw);
  const sinY = Math.sin(cave.facingYaw);

  const bDx = bearX - cave.x;
  const bDz = bearZ - cave.z;
  const bLx = bDx * cosY - bDz * sinY;
  const bLz = bDx * sinY + bDz * cosY;

  const tDx = targetX - cave.x;
  const tDz = targetZ - cave.z;
  const tLx = tDx * cosY - tDz * sinY;
  const tLz = tDx * sinY + tDz * cosY;

  const bearInsideCave = bLz < 3.5 && bLz > -26.0 && Math.abs(bLx) < 13.5;
  const targetOutsideCave = tLz > 3.5 || Math.abs(tLx) > 12.5 || tLz < -26.0;

  if (bearInsideCave && targetOutsideCave) {
    // Bear is inside the cavern/tunnel and wants to exit: align to centerline (lx = 0) and walk straight out the mouth!
    if (bLz < -4.2 && Math.abs(bLx) > 1.8) {
      return caveLocalToWorld(cIdx, 0, -4.5);
    }
    return caveLocalToWorld(cIdx, 0, 5.5);
  }

  const bearOutsideCave = bLz >= 4.5 || Math.abs(bLx) > 4.2;
  const targetInsideCave = tLz < -2.0 && tLz > -25.5 && Math.abs(tLx) < 12.0;
  if (bearOutsideCave && targetInsideCave) {
    // Waypoint at lz 6.5 is reached before this threshold, so the bear advances inward instead of re-targeting it forever.
    if (bLz > 7.5 || Math.abs(bLx) > 2.2) {
      return caveLocalToWorld(cIdx, 0, 6.5);
    }
    return caveLocalToWorld(cIdx, 0, -6.5);
  }

  return { x: targetX, z: targetZ };
}

/**
 * Summary: Routes the Mystical CatLion cleanly through the Volcano Sanctum's eastern
 *          obsidian entrance tunnel (z = 115.0, x: -249..-229) when moving between the
 *          inner throne chamber and the outer valley.
 */
function steerLionThroughVolcanoPortal(
  lionX: number,
  lionZ: number,
  targetX: number,
  targetZ: number
): { x: number; z: number } {
  const vx = VOLCANO_SANCTUM_POS.x;
  const vz = VOLCANO_SANCTUM_POS.z;
  const lDx = lionX - vx;
  const lDz = lionZ - vz;
  const lDist = Math.hypot(lDx, lDz);
  if (lDist > 115.0) {
    return { x: targetX, z: targetZ };
  }
  const tDx = targetX - vx;
  const tDz = targetZ - vz;
  const tDist = Math.hypot(tDx, tDz);

  // Keep untamed Boss CatLion inside its colossal 60m-diameter inner sanctum arena (radius <= 27.5m)
  if (lDist <= VOLCANO_SANCTUM_POS.chamberRadius + 1.0 && tDist > VOLCANO_SANCTUM_POS.chamberRadius - 2.2) {
    const scale = (VOLCANO_SANCTUM_POS.chamberRadius - 2.5) / (tDist || 1);
    return { x: vx + tDx * scale, z: vz + tDz * scale };
  }

  return { x: targetX, z: targetZ };
}

/**
 * Summary: Validates that an animal spawn coordinate is neither within `minSafeRadius` around the player
 *          (preventing pop-in behind the player's back) nor inside the player's forward field-of-view cone.
 */
export function isSafeAnimalSpawnPosition(
  x: number,
  z: number,
  playerX: number = WORLD_SPAWN.x,
  playerZ: number = WORLD_SPAWN.z,
  playerYaw: number = WORLD_SPAWN.yaw,
  minSafeRadius: number = 56,
  frontConeDist: number = 115
): boolean {
  const dx = x - playerX;
  const dz = z - playerZ;
  const dist = Math.hypot(dx, dz);
  if (dist < minSafeRadius) {
    return false;
  }
  if (dist < frontConeDist) {
    const lookX = Math.sin(playerYaw);
    const lookZ = Math.cos(playerYaw);
    const dot = (dx * lookX + dz * lookZ) / (dist || 1);
    if (dot > 0.38) {
      return false;
    }
  }
  return true;
}

/** Candidate spots tried per animal before giving up on relocating it (runs once at spawn). */
const SAFE_RELOCATION_MAX_ATTEMPTS = 40;

/**
 * Summary: Ensures no animal spawns within the player's safe radius or direct line of sight
 *          (e.g., when loading a custom URL `?pos=` camera/player position).
 */
export function ensureSafeOffscreenAnimalSpawns(
  animals: ISmallAnimalState[],
  playerX: number,
  playerZ: number,
  playerYaw: number
): void {
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    if (isSafeAnimalSpawnPosition(a.x, a.z, playerX, playerZ, playerYaw)) {
      continue;
    }
    // Relocate behind or beside the player's view; try wider fans and distances until a dry,
    // in-bounds spot that is also out of sight is found.
    for (let attempt = 0; attempt < SAFE_RELOCATION_MAX_ATTEMPTS; attempt++) {
      const fanOffset = (((i + attempt) % 5) - 2) * 0.38 + Math.floor(attempt / 5) * 0.21;
      const baseAngle = playerYaw + Math.PI + fanOffset;
      const safeDist = 68 + ((i + attempt) % 4) * 14 + Math.floor(attempt / 5) * 9;
      const nx = playerX + Math.sin(baseAngle) * safeDist;
      const nz = playerZ + Math.cos(baseAngle) * safeDist;
      const gy = walkableHeightAt(nx, nz).height;
      if (
        gy > WATER_LEVEL + 0.25 &&
        Math.hypot(nx, nz) < PLAYABLE_RADIUS - 25 &&
        isSafeAnimalSpawnPosition(nx, nz, playerX, playerZ, playerYaw)
      ) {
        a.x = nx;
        a.z = nz;
        a.homeX = nx;
        a.homeZ = nz;
        a.y = gy;
        break;
      }
    }
  }
}

/**
 * Summary: Creates the initial deterministic population of flocking birds (36 birds across 3 flocks).
 */
export function createInitialBoidBirds(): IBoidBirdState[] {
  const birds: IBoidBirdState[] = [];
  let id = 0;
  for (let f = 0; f < BIRD_FLOCK_CONFIGS.length; f++) {
    const cfg = BIRD_FLOCK_CONFIGS[f];
    for (let i = 0; i < cfg.count; i++) {
      const angle = (i / cfg.count) * Math.PI * 2;
      const r = cfg.patrolRadius * (0.65 + (i % 3) * 0.15);
      const hx = cfg.centerX + Math.cos(angle) * r;
      const hz = cfg.centerZ + Math.sin(angle) * r;
      const gy = Math.max(WATER_LEVEL, groundHeightAt(hx, hz));
      const speed = 7.5 + (i % 3) * 1.2;
      const tangentAngle = angle + Math.PI * 0.5;
      birds.push({
        id: id++,
        flockId: cfg.id,
        x: hx,
        y: gy + cfg.cruiseAltitudeAboveGround + (i % 4) * 1.4,
        z: hz,
        vx: Math.cos(tangentAngle) * speed,
        vy: 0,
        vz: Math.sin(tangentAngle) * speed,
        wingPhase: (id * 0.85) % (Math.PI * 2),
        startleTimer: 0,
        fleeTimer: 0,
        roosting: false,
        homeX: hx,
        homeZ: hz,
        level: 1 + (i % 3),
        hp: 25,
        maxHp: 25,
        isDead: false,
        isLooted: false,
        groundState: 'flying',
        groundTimer: 0,
      });
    }
  }
  activeWorldBirdsRegistry = birds;
  return birds;
}

/**
 * Summary: Creates the initial deterministic population of ground animals matched to their authentic biomes,
 *          strictly outside the player's safe radius and outside the initial forward view cone:
 *          - Rural valley farms & meadows: Sheep & Rabbits
 *          - Birch grove & eastern woodland: Squirrels
 *          - Deep western & southern forests: Deer & Wolves
 *          - Southwest Desert & Deep Southern Forest: Jaguars (4)
 *          - Forested mountain caves: Multiple Bears inside the cavern side alcoves & outside tunnel mouths
 *          - Dedicated Southern River Bend (`CROCODILE_RIVER_BEND_POS`): Crocodiles (5, far from populated areas)
 */
export function createInitialSmallAnimals(): ISmallAnimalState[] {
  const animals: ISmallAnimalState[] = [];
  const cave0WestAlcove = caveLocalToWorld(0, -5.6, -14.0);
  const cave0EastAlcove = caveLocalToWorld(0, 5.6, -14.8);
  const cave1SideAlcove = caveLocalToWorld(1, -5.4, -14.2);
  const cave2SideAlcove = caveLocalToWorld(2, 5.4, -14.2);

  const spawnCandidates: Array<{
    x: number;
    z: number;
    species: GroundAnimalSpecies;
    caveIndex?: number;
  }> = [
    // Rabbits in rural meadows & Hunter's Lodge woods (8)
    { x: 68, z: 26, species: 'rabbit' },
    { x: -66, z: 18, species: 'rabbit' },
    { x: 62, z: -22, species: 'rabbit' },
    { x: -64, z: -24, species: 'rabbit' },
    { x: 74, z: 54, species: 'rabbit' },
    { x: -72, z: 58, species: 'rabbit' },
    { x: 84, z: 48, species: 'rabbit' },
    { x: -84, z: 48, species: 'rabbit' },
    // Squirrels in birch grove & woodland trees (11)
    { x: -68, z: 12, species: 'squirrel' },
    { x: -36, z: -24, species: 'squirrel' },
    { x: 32, z: -28, species: 'squirrel' },
    { x: 148, z: 112, species: 'squirrel' },
    { x: 162, z: 124, species: 'squirrel' },
    { x: 138, z: 98, species: 'squirrel' },
    { x: 172, z: 108, species: 'squirrel' },
    { x: 82, z: -38, species: 'squirrel' },
    { x: 96, z: -8, species: 'squirrel' },
    { x: 72, z: -12, species: 'squirrel' },
    { x: 108, z: -24, species: 'squirrel' },
    // Woodland & Southern/Western Forest Deer herd (6)
    { x: -68, z: -18, species: 'deer' },
    { x: -78, z: 24, species: 'deer' },
    { x: -124, z: 192, species: 'deer' },
    { x: -96, z: 196, species: 'deer' },
    { x: 78, z: 188, species: 'deer' },
    { x: 92, z: 196, species: 'deer' },
    // Rural Valley Grazing Sheep flock around the farms (6)
    { x: -112, z: 142, species: 'sheep' },
    { x: -108, z: 146, species: 'sheep' },
    { x: -115, z: 148, species: 'sheep' },
    { x: -96, z: 118, species: 'sheep' },
    { x: 88, z: 62, species: 'sheep' },
    { x: 98, z: 62, species: 'sheep' },
    // Forest & Mountain Cavern Brown Bears — dwelling inside the sheltered mountain cavern side alcoves & outside tunnel mouths in unpopulated areas (7)
    { x: -85, z: -56, species: 'bear', caveIndex: 0 },
    { x: cave0WestAlcove.x, z: cave0WestAlcove.z, species: 'bear', caveIndex: 0 },
    { x: cave0EastAlcove.x, z: cave0EastAlcove.z, species: 'bear', caveIndex: 0 },
    { x: -164, z: -45, species: 'bear', caveIndex: 1 },
    { x: cave1SideAlcove.x, z: cave1SideAlcove.z, species: 'bear', caveIndex: 1 },
    { x: 38, z: 274, species: 'bear', caveIndex: 2 },
    { x: cave2SideAlcove.x, z: cave2SideAlcove.z, species: 'bear', caveIndex: 2 },
    // Southern River Bend Crocodiles — strictly at the remote Southern River Lagoon (5)
    { x: CROCODILE_RIVER_BEND_POS.x - 10, z: CROCODILE_RIVER_BEND_POS.z - 7, species: 'crocodile' },
    { x: CROCODILE_RIVER_BEND_POS.x + 9, z: CROCODILE_RIVER_BEND_POS.z + 5, species: 'crocodile' },
    { x: CROCODILE_RIVER_BEND_POS.x - 4, z: CROCODILE_RIVER_BEND_POS.z + 9, species: 'crocodile' },
    { x: CROCODILE_RIVER_BEND_POS.x + 6, z: CROCODILE_RIVER_BEND_POS.z - 9, species: 'crocodile' },
    { x: CROCODILE_RIVER_BEND_POS.x - 16, z: CROCODILE_RIVER_BEND_POS.z + 1, species: 'crocodile' },
    // Jaguars — strictly in the Southwest Desert / Oasis & Deep Southern Forest, off-screen from spawn (4)
    { x: -238, z: 236, species: 'jaguar' }, // Southwest Desert dunes
    { x: -268, z: 336, species: 'jaguar' }, // Deep Southwest Desert canyon
    { x: -148, z: 228, species: 'jaguar' }, // Deep Southern Forest
    { x: -84, z: 246, species: 'jaguar' },  // Southern Forest canopy
    // Timber Wolves — roaming the deep Western & Northern pine woods (4)
    { x: -142, z: -88, species: 'wolf' },
    { x: -158, z: -112, species: 'wolf' },
    { x: -118, z: 86, species: 'wolf' },
    { x: 136, z: -118, species: 'wolf' },
    // Armored Savanna / Oasis Rhinos — roaming the Southwest desert & oasis plains (3)
    { x: -195, z: 215, species: 'rhino' },
    { x: -224, z: 262, species: 'rhino' },
    { x: -286, z: 248, species: 'rhino' },
    // Mystical CatLions — 1 Boss seated on the Volcano Sanctum Throne Dais + 6 roaming the Western Volcanic Badlands outside the colossal cone (7)
    { x: VOLCANO_SANCTUM_POS.x - 1.0, z: VOLCANO_SANCTUM_POS.z, species: 'lion' },
    { x: VOLCANO_SANCTUM_POS.entranceX + 14.0, z: VOLCANO_SANCTUM_POS.z - 9.0, species: 'lion' },
    { x: VOLCANO_SANCTUM_POS.entranceX + 14.0, z: VOLCANO_SANCTUM_POS.z + 9.0, species: 'lion' },
    { x: VOLCANO_SANCTUM_POS.x + 112.0, z: VOLCANO_SANCTUM_POS.z - 68.0, species: 'lion' },
    { x: VOLCANO_SANCTUM_POS.x + 108.0, z: VOLCANO_SANCTUM_POS.z + 72.0, species: 'lion' },
    { x: VOLCANO_SANCTUM_POS.x - 118.0, z: VOLCANO_SANCTUM_POS.z - 54.0, species: 'lion' },
    { x: VOLCANO_SANCTUM_POS.x - 16.0, z: VOLCANO_SANCTUM_POS.z - 122.0, species: 'lion' },
    // Royal Blooming Stags — roaming the 3 Large Floating Blooming Sky Islands in the East (4)
    { x: FLOATING_BLOOMING_ISLANDS[0].x, z: FLOATING_BLOOMING_ISLANDS[0].z + 7, species: 'stag' },
    { x: FLOATING_BLOOMING_ISLANDS[0].x - 11, z: FLOATING_BLOOMING_ISLANDS[0].z - 6, species: 'stag' },
    { x: FLOATING_BLOOMING_ISLANDS[1].x, z: FLOATING_BLOOMING_ISLANDS[1].z, species: 'stag' },
    { x: FLOATING_BLOOMING_ISLANDS[2].x, z: FLOATING_BLOOMING_ISLANDS[2].z, species: 'stag' },
    // Secluded Southern Pass Valley Deer beyond the Mountain Gorge Pass (2)
    { x: 96, z: 724, species: 'deer' },
    { x: 114, z: 708, species: 'deer' },
    // Nordic Frost Shrine Alpine Wolf Pack & Desert Sun Pyramid Guardians (4)
    { x: -302, z: -274, species: 'wolf' },
    { x: -336, z: -278, species: 'wolf' },
    { x: -446, z: 274, species: 'jaguar' },
    { x: -442, z: 318, species: 'rhino' },
    // Colossal Ancient Dragon Ruins Dragon (250 HP, vulnerable to arrows & sword)
    { x: SOUTHERN_DRAGON_RUINS_POS.x, z: SOUTHERN_DRAGON_RUINS_POS.z - 2, species: 'dragon' },
    // Additional Hunter's Lodge & Meadow Rabbits and Tree-Climbing Squirrels (7)
    { x: -74, z: 34, species: 'rabbit' },
    { x: -68, z: -32, species: 'rabbit' },
    { x: 64, z: -36, species: 'rabbit' },
    { x: -78, z: 54, species: 'squirrel' },
    { x: -86, z: 62, species: 'squirrel' },
    { x: -68, z: 42, species: 'squirrel' },
    { x: -58, z: 26, species: 'squirrel' },
    // Semi-Aquatic Hippopotamuses — Vast Southern Murky Swamp & Hippo Marshland south of the extended Mountain Ridge (12)
    { x: MURKY_SWAMP_BIOME_POS.x, z: MURKY_SWAMP_BIOME_POS.z, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x + 58, z: MURKY_SWAMP_BIOME_POS.z - 12, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x - 62, z: MURKY_SWAMP_BIOME_POS.z + 16, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x - 16, z: MURKY_SWAMP_BIOME_POS.z - 58, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x + 22, z: MURKY_SWAMP_BIOME_POS.z + 62, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x - 108, z: MURKY_SWAMP_BIOME_POS.z - 28, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x + 104, z: MURKY_SWAMP_BIOME_POS.z + 26, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x - 92, z: MURKY_SWAMP_BIOME_POS.z + 74, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x + 76, z: MURKY_SWAMP_BIOME_POS.z - 72, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x - 28, z: MURKY_SWAMP_BIOME_POS.z + 112, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x + 18, z: MURKY_SWAMP_BIOME_POS.z - 20, species: 'hippo' },
    { x: MURKY_SWAMP_BIOME_POS.x - 38, z: MURKY_SWAMP_BIOME_POS.z + 36, species: 'hippo' },
    // Royal Koi Fish — Western Lagoon Lake near Starting Cabin, Waterfall Plunge Pool & Southwest Oasis Lagoon (15)
    { x: -128, z: 46, species: 'koifish' },
    { x: -136, z: 38, species: 'koifish' },
    { x: -146, z: 44, species: 'koifish' },
    { x: -140, z: 29, species: 'koifish' },
    { x: -132, z: 54, species: 'koifish' },
    { x: -152, z: 36, species: 'koifish' },
    { x: -124, z: 35, species: 'koifish' },
    { x: -144, z: 52, species: 'koifish' },
    { x: -45, z: -30, species: 'koifish' },
    { x: -36, z: -34, species: 'koifish' },
    { x: -48, z: -35, species: 'koifish' },
    { x: -42, z: -28, species: 'koifish' },
    { x: -38, z: -32, species: 'koifish' },
    { x: -308, z: 316, species: 'koifish' },
    { x: -314, z: 321, species: 'koifish' },
    // Marine Bottlenose Dolphins — Southeast Harbor Bay Reef, Eastern Shipping Lane & Ruined Atlantis Waters (6)
    { x: 322, z: 248, species: 'dolphin' },
    { x: 336, z: 262, species: 'dolphin' },
    { x: 456, z: 228, species: 'dolphin' },
    { x: 474, z: 246, species: 'dolphin' },
    { x: 854, z: 406, species: 'dolphin' },
    { x: 870, z: 424, species: 'dolphin' },
  ];

  for (let i = 0; i < spawnCandidates.length; i++) {
    const c = spawnCandidates[i];
    const gy = walkableHeightAt(c.x, c.z).height;
    const shelter = findNearestShelterPoint(c.x, c.z, c.species, c.caveIndex);
    const isVolcanoSanctumMysticLion =
      c.species === 'lion' &&
      Math.hypot(c.x - VOLCANO_SANCTUM_POS.x, c.z - VOLCANO_SANCTUM_POS.z) < 10.0;
    const level = isVolcanoSanctumMysticLion
      ? 15
      : c.species === 'dragon'
        ? 18
        : c.species === 'lion'
          ? 8 + (i % 3)
          : c.species === 'bear' || c.species === 'rhino' || c.species === 'hippo'
            ? 7 + (i % 3)
            : c.species === 'crocodile' || c.species === 'stag'
              ? 5 + (i % 3)
              : c.species === 'jaguar' || c.species === 'dolphin'
                ? 4 + (i % 3)
                : c.species === 'wolf'
                  ? 3 + (i % 3)
                  : c.species === 'deer'
                    ? 2 + (i % 3)
                    : c.species === 'sheep'
                      ? 2 + (i % 2)
                      : 1 + (i % 3);
    const maxHp = getAnimalMaxHp(c.species, level, isVolcanoSanctumMysticLion);
    const waterSurfY =
      Math.hypot(c.x - SOUTHWEST_OASIS_POS.x, c.z - SOUTHWEST_OASIS_POS.z) <= 13.5
        ? SOUTHWEST_OASIS_POS.lagoonWaterY
        : WATER_LEVEL;
    const isAquaticInit =
      c.species === 'koifish' ||
      c.species === 'dolphin' ||
      (c.species === 'hippo' && gy <= waterSurfY + 0.15);
    const initY =
      c.species === 'koifish'
        ? waterSurfY - 0.38
        : c.species === 'dolphin'
          ? c.x > 650
            ? WATER_LEVEL - 1.56
            : WATER_LEVEL - 0.35
          : c.species === 'hippo' && isAquaticInit
            ? Math.max(gy, waterSurfY - 0.65)
            : Math.max(WATER_LEVEL + 0.08, gy);
    animals.push({
      id: i,
      species: c.species,
      x: c.x,
      y: initY,
      z: c.z,
      vx: 0,
      vz: 0,
      yaw: isVolcanoSanctumMysticLion ? Math.PI / 2 : (i * 1.37) % (Math.PI * 2),
      hopPhase: (i * 0.9) % (Math.PI * 2),
      homeX: c.x,
      homeZ: c.z,
      shelterTargetX: shelter.x,
      shelterTargetZ: shelter.z,
      isSeekingShelter: false,
      alertLevel: 'grazing',
      aiBehavior: isVolcanoSanctumMysticLion ? 'sitting' : 'grazing',
      listenTimer: 0,
      listenCooldown: 0,
      actionTimer: 0,
      stompWarningDone: false,
      inWater: isAquaticInit,
      caveIndex: c.caveIndex,
      isFleeing: false,
      fleeCooldown: 0,
      isResting: false,
      wakeMeter: 0,
      wokenUpTimer: 0,
      hp: maxHp,
      maxHp,
      level,
      hitReactionTimer: 0,
      isDead: false,
      isLooted: false,
      isBoss: isVolcanoSanctumMysticLion,
      canBeTamed: c.species === 'stag' || isVolcanoSanctumMysticLion,
      isSubdued: false,
    });
  }

  activeWorldAnimalsRegistry = animals;
  return animals;
}

/**
 * Summary: Creates the initial deterministic population of flocking birds and ground animals.
 */
export function createInitialWildlifeState(): {
  birds: IBoidBirdState[];
  animals: ISmallAnimalState[];
} {
  return {
    birds: createInitialBoidBirds(),
    animals: createInitialSmallAnimals(),
  };
}
// #endregion

// ======================== SIMULATION STEP ======================== \\
// #region Simulation Step
/**
 * Summary: Computes the noise rate (per second) generated by the player at a given distance.
 * Design: Crouching with Ctrl ('relaxed') drastically reduces noise so the player can sneak up
 *         on sleeping or grazing animals without waking/startling them. When `isSleepingArg` is true,
 *         hearing radius is smaller (12m instead of 20m).
 */
export function computePlayerNoiseRateAtDistance(
  playerOrDist: IPlayerState | number,
  distOrSpeed: number,
  isCrouchingArg = false,
  isAttackingArg = false,
  isSleepingArg = false
): number {
  let distToAnimal: number;
  let pSpeed: number;
  let isSneaking: boolean;
  let isSprinting: boolean;
  let isAttacking: boolean;
  let onGround = true;

  if (typeof playerOrDist === 'number') {
    distToAnimal = playerOrDist;
    pSpeed = distOrSpeed;
    isSneaking = isCrouchingArg;
    isSprinting = pSpeed > 5.0;
    isAttacking = isAttackingArg;
  } else {
    distToAnimal = distOrSpeed;
    pSpeed = Math.hypot(playerOrDist.vx, playerOrDist.vz);
    isSneaking = Boolean(playerOrDist.isCrouching || playerOrDist.walkPace === 'relaxed');
    isSprinting = Boolean(playerOrDist.walkPace === 'fast' || playerOrDist.mountedHorseId);
    isAttacking = (playerOrDist.swordSwingProgress ?? 0) > 0.05;
    onGround = playerOrDist.onGround;
  }

  const hearingRadius = isSleepingArg ? 12.0 : 20.0;
  if (distToAnimal >= hearingRadius) {
    return -0.28; // Decay wake meter when out of hearing range
  }

  if (isSneaking && !isAttacking) {
    // Stealth crouch mode (Ctrl): virtually silent unless stepping directly on the animal (< 1.8m)
    if (distToAnimal < 1.8 && pSpeed > 0.25) {
      return 0.06;
    }
    return -0.18;
  }

  const prox = Math.max(0, 1.0 - distToAnimal / hearingRadius);
  if (isAttacking && distToAnimal < 12.0) {
    return 0.95 + prox * 1.25;
  }
  if (isSprinting && pSpeed > 1.0) {
    return 0.65 + prox * 1.45;
  }
  if (pSpeed > 0.35 || !onGround) {
    return 0.28 + prox * 0.82;
  }

  // Player standing still
  return -0.25;
}

function rotateYawSmoothlyToward(
  currentYaw: number,
  targetYaw: number,
  maxRadPerSec: number,
  dt: number
): number {
  const diffYaw = Math.atan2(Math.sin(targetYaw - currentYaw), Math.cos(targetYaw - currentYaw));
  if (Math.abs(diffYaw) < 0.018) {
    return targetYaw;
  }
  const maxStep = Math.max(0, maxRadPerSec * dt);
  if (Math.abs(diffYaw) <= maxStep) {
    return targetYaw;
  }
  return currentYaw + Math.sign(diffYaw) * maxStep;
}

/**
 * Summary: Computes tactical pack-flanking angle offset for a wolf when packmates are within 32m,
 *          so wolves encircle prey from left/right flanks instead of overlapping on a single line.
 */
export function computeWolfPackFlankAngle(
  wolf: ISmallAnimalState,
  targetX: number,
  targetZ: number,
  animals: readonly ISmallAnimalState[]
): number {
  const baseAngle = Math.atan2(targetX - wolf.x, targetZ - wolf.z);
  const distToTarget = Math.hypot(targetX - wolf.x, targetZ - wolf.z);
  if (distToTarget < 3.6) {
    return baseAngle;
  }
  let packmatesNear = 0;
  let lowerIdCount = 0;
  for (let i = 0; i < animals.length; i++) {
    const other = animals[i];
    if (other.id === wolf.id || other.isDead || other.species !== 'wolf') continue;
    const d = Math.hypot(other.x - wolf.x, other.z - wolf.z);
    if (d <= 32.0) {
      packmatesNear++;
      if (other.id < wolf.id) lowerIdCount++;
    }
  }
  if (packmatesNear === 0) {
    return baseAngle;
  }
  const flankSign = lowerIdCount % 2 === 0 ? 1 : -1;
  const distScale = Math.min(1.0, (distToTarget - 3.6) / 10.0);
  return baseAngle + flankSign * 0.48 * distScale;
}

/**
 * Summary: Propagates a panic alert wave from a fleeing herbivore (`deer`, `sheep`, `rabbit`)
 *          to nearby calm herd members of the same species within 22m so herds flee together.
 */
export function propagateHerdAlert(
  panickedAnimal: ISmallAnimalState,
  threatX: number,
  threatZ: number,
  animals: ISmallAnimalState[]
): number {
  let alertedCount = 0;
  for (let i = 0; i < animals.length; i++) {
    const mate = animals[i];
    if (
      mate.id === panickedAnimal.id ||
      mate.isDead ||
      mate.species !== panickedAnimal.species ||
      mate.alertLevel === 'fleeing'
    ) {
      continue;
    }
    const d = Math.hypot(mate.x - panickedAnimal.x, mate.z - panickedAnimal.z);
    if (d <= 22.0) {
      mate.alertLevel = 'fleeing';
      mate.aiBehavior = 'fleeing';
      mate.isFleeing = true;
      mate.fleeCooldown = Math.max(mate.fleeCooldown, 2.8);
      mate.listenTimer = 0;
      mate.isResting = false;
      mate.isSeekingShelter = false;
      mate.stimulusX = threatX;
      mate.stimulusZ = threatZ;
      alertedCount++;
    }
  }
  return alertedCount;
}

/**
 * Summary: Resolves horizontal collision for an animal against solid building/cave walls (`SOLID_BUILDING_BOXES`)
 *          and world rock/tree obstacles so bears and wildlife never clip through rocks or cave walls.
 */
function resolveAnimalObstacleCollision(
  nextX: number,
  nextZ: number,
  radius: number
): { x: number; z: number; hitObstacle: boolean } {
  let x = nextX;
  let z = nextZ;
  let hitObstacle = false;

  // 1. Solid building & carved mountain cave cliff walls (O(1) spatial hash lookup via getNearbySolidBuildingBoxes)
  const nearbyBoxes = getNearbySolidBuildingBoxes(x, z, radius + 1.0);
  for (let i = 0; i < nearbyBoxes.length; i++) {
    const b = nearbyBoxes[i];
    const resolved = resolveHorizontalBoxCollision(x, z, radius, b);
    if (resolved.collided) {
      x = resolved.x;
      z = resolved.z;
      hitObstacle = true;
    }
  }

  // 2. Nearby world rocks and trunks (O(1) spatial hash lookup)
  const obstacles = getNearbyWorldObstacles(x, z, radius + 2.5);
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const minDist = obs.radius + radius;
    const dx = x - obs.x;
    const dz = z - obs.z;
    if (Math.abs(dx) >= minDist || Math.abs(dz) >= minDist) continue;
    const dist = Math.hypot(dx, dz);
    if (dist < minDist) {
      const nx = dist > 0.001 ? dx / dist : 1;
      const nz = dist > 0.001 ? dz / dist : 0;
      x = obs.x + nx * minDist;
      z = obs.z + nz * minDist;
      hitObstacle = true;
    }
  }

  return { x, z, hitObstacle };
}

/**
 * Summary: Computes the best radial escape direction toward dry land (`groundHeightAt > WATER_LEVEL + 0.25`)
 *          for a land animal that has stepped into or is swimming in water, and advances its position
 *          smoothly so no land animal ever freezes or bounces in place in water.
 */
function advanceAnimalWithWaterShoreRecovery(
  a: ISmallAnimalState,
  nextX: number,
  nextZ: number,
  hitObstacle: boolean,
  safeDt: number
): void {
  const isCroc = a.species === 'crocodile';
  const maxPlayableR = PLAYABLE_RADIUS - 15;
  const nextDistFromOrigin = Math.hypot(nextX, nextZ);

  if (nextDistFromOrigin >= maxPlayableR) {
    const inv = 1 / (nextDistFromOrigin || 1);
    const inwardSpd = Math.max(2.2, Math.hypot(a.vx, a.vz));
    a.vx = -nextX * inv * inwardSpd;
    a.vz = -nextZ * inv * inwardSpd;
    a.x = nextX * ((maxPlayableR - 0.5) * inv);
    a.z = nextZ * ((maxPlayableR - 0.5) * inv);
    a.y = Math.max(WATER_LEVEL - 0.15, walkableHeightAt(a.x, a.z).height);
    a.yaw = Math.atan2(a.vx, a.vz);
    return;
  }

  // Keep animals living on the Floating Blooming Sky Islands within their island deck rim
  if (a.y >= 18.0) {
    for (let i = 0; i < FLOATING_BLOOMING_ISLANDS.length; i++) {
      const isl = FLOATING_BLOOMING_ISLANDS[i];
      if (Math.hypot(a.homeX - isl.x, a.homeZ - isl.z) <= isl.radius + 1.0) {
        const dxIsl = nextX - isl.x;
        const dzIsl = nextZ - isl.z;
        const distIsl = Math.hypot(dxIsl, dzIsl);
        const maxSafeRad = isl.radius - 2.2;
        if (distIsl > maxSafeRad && distIsl > 0.01) {
          const clampScale = maxSafeRad / distIsl;
          nextX = isl.x + dxIsl * clampScale;
          nextZ = isl.z + dzIsl * clampScale;
          const spd = Math.max(1.5, Math.hypot(a.vx, a.vz));
          a.vx = (-dxIsl / distIsl) * spd;
          a.vz = (-dzIsl / distIsl) * spd;
        }
        a.inWater = false;
        a.x = nextX;
        a.z = nextZ;
        a.y = walkableHeightAt(a.x, a.z, a.y).height;
        if (Math.hypot(a.vx, a.vz) > 0.05) {
          a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 6.0, safeDt);
        }
        return;
      }
    }
  }

  const movedHorizontally = Math.abs(nextX - a.x) > 1e-5 || Math.abs(nextZ - a.z) > 1e-5;
  const dryLandThreshold = WATER_LEVEL + 0.12;
  if (!movedHorizontally && !isCroc && !a.inWater && a.y > dryLandThreshold) {
    return;
  }

  const nextWalkableY = walkableHeightAt(nextX, nextZ, a.y).height;
  const currentWalkableY = movedHorizontally
    ? walkableHeightAt(a.x, a.z, a.y).height
    : nextWalkableY;

  if (isCroc) {
    const inWaterNow = nextWalkableY <= dryLandThreshold || currentWalkableY <= dryLandThreshold;
    a.inWater = nextWalkableY <= dryLandThreshold;
    if (inWaterNow && (Math.abs(a.vx) > 0.05 || Math.abs(a.vz) > 0.05)) {
      const crocWaterMult = getAnimalWaterSpeedMultiplier('crocodile');
      const boostedNext = resolveAnimalObstacleCollision(
        a.x + a.vx * crocWaterMult * safeDt,
        a.z + a.vz * crocWaterMult * safeDt,
        SPECIES_PROFILES.crocodile.predatorBodyRadius
      );
      a.x = boostedNext.x;
      a.z = boostedNext.z;
      const boostedWalkableY = walkableHeightAt(a.x, a.z, a.y).height;
      a.inWater = boostedWalkableY <= dryLandThreshold;
      const waterDepth = Math.max(0, WATER_LEVEL - boostedWalkableY);
      const submerge = Math.min(waterDepth, getAnimalWaterSubmergenceDepth('crocodile'));
      a.y = Math.max(boostedWalkableY, WATER_LEVEL - submerge);
      a.hopPhase += safeDt * 4.5;
    } else {
      a.x = nextX;
      a.z = nextZ;
      const waterDepth = Math.max(0, WATER_LEVEL - nextWalkableY);
      const submerge = Math.min(waterDepth, getAnimalWaterSubmergenceDepth('crocodile'));
      a.y = Math.max(nextWalkableY, WATER_LEVEL - submerge);
    }
    if (hitObstacle && (Math.abs(a.vx) > 0.1 || Math.abs(a.vz) > 0.1)) {
      a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 6.0, safeDt);
    }
    return;
  }

  // Land animal on dry ground moving to dry ground
  if (nextWalkableY > dryLandThreshold) {
    a.inWater = false;
    a.x = nextX;
    a.z = nextZ;
    a.y = nextWalkableY;
    if (hitObstacle && (Math.abs(a.vx) > 0.1 || Math.abs(a.vz) > 0.1)) {
      a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 6.0, safeDt);
    }
    return;
  }

  // Land animal is either entering water from the shoreline or already swimming in water:
  // 1) If the animal is actively pursuing a target ('charging', 'stalking', 'attacking', 'curious')
  //    or actively fleeing from a threat ('fleeing', isFleeing, fleeCooldown > 0), DO NOT reverse
  //    its velocity back onto the shore! Let it smoothly enter the water along its intended vector
  //    at reduced swimming speed (waterMult) while gradually submerging up to its neck/back!
  // 2) Only when an unprovoked wandering/grazing animal is in deep water with no chase/flee target
  //    does it steer steadily back toward the nearest dry shore!
  a.inWater = true;
  const waterMult = getAnimalWaterSpeedMultiplier(a.species);
  const baseLandSpd = isPredatorSpecies(a.species) ? 4.9 : 4.55;
  const swimSpd = baseLandSpd * waterMult;

  const isIntentionalPursuitOrEscape =
    a.aiBehavior === 'charging' ||
    a.aiBehavior === 'stalking' ||
    a.aiBehavior === 'attacking' ||
    a.aiBehavior === 'fleeing' ||
    a.alertLevel === 'curious' ||
    a.alertLevel === 'fleeing' ||
    Boolean(a.isFleeing) ||
    a.fleeCooldown > 0;

  if (isIntentionalPursuitOrEscape) {
    const rawSpd = Math.hypot(a.vx, a.vz);
    if (rawSpd > 0.02) {
      const dirX = a.vx / rawSpd;
      const dirZ = a.vz / rawSpd;
      const cappedSwimSpd = Math.min(rawSpd * waterMult, swimSpd * 1.12);
      const effSpd = Math.max(swimSpd * 0.85, cappedSwimSpd);
      a.vx = dirX * effSpd;
      a.vz = dirZ * effSpd;
    }
  } else {
    let bestDirX = 0;
    let bestDirZ = 0;
    let bestScore = -Infinity;

    const homeDx = a.homeX - a.x;
    const homeDz = a.homeZ - a.z;
    const homeDist = Math.hypot(homeDx, homeDz);
    if (homeDist > 0.5 && groundHeightAt(a.homeX, a.homeZ) > WATER_LEVEL + 0.35) {
      bestDirX = homeDx / homeDist;
      bestDirZ = homeDz / homeDist;
      bestScore = 0.5;
    }

    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      const hNear = groundHeightAt(a.x + dx * 5.0, a.z + dz * 5.0);
      const hMid = groundHeightAt(a.x + dx * 12.0, a.z + dz * 12.0);
      const hFar = groundHeightAt(a.x + dx * 22.0, a.z + dz * 22.0);
      const dryBonus =
        (hNear > dryLandThreshold ? 4.0 : 0) +
        (hMid > dryLandThreshold ? 2.5 : 0) +
        (hFar > dryLandThreshold ? 1.5 : 0);
      const score = (hNear - currentWalkableY) * 2.2 + (hMid - currentWalkableY) * 1.4 + dryBonus;
      if (score > bestScore) {
        bestScore = score;
        bestDirX = dx;
        bestDirZ = dz;
      }
    }
    a.vx = bestDirX * swimSpd;
    a.vz = bestDirZ * swimSpd;
  }

  const swimNext = resolveAnimalObstacleCollision(
    a.x + a.vx * safeDt,
    a.z + a.vz * safeDt,
    0.45
  );
  a.x = swimNext.x;
  a.z = swimNext.z;
  const swimGroundY = walkableHeightAt(a.x, a.z, a.y).height;
  if (swimGroundY > dryLandThreshold) {
    a.inWater = false;
    a.y = swimGroundY;
  } else {
    const waterDepth = Math.max(0, WATER_LEVEL - swimGroundY);
    const maxSubmerge = getAnimalWaterSubmergenceDepth(a.species);
    const submergeDepth = Math.min(waterDepth, maxSubmerge);
    a.y = Math.max(swimGroundY, WATER_LEVEL - submergeDepth);
  }
  if (Math.hypot(a.vx, a.vz) > 0.05) {
    a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 6.5, safeDt);
  }
  a.hopPhase += safeDt * 5.2;
}

/**
 * Summary: Steps reactive and autonomous ground animals for a frame delta `dt`.
 */
export function stepSmallAnimals(
  animals: ISmallAnimalState[],
  dt: number,
  elapsedTime: number,
  playerX: number,
  playerZ: number,
  horses: readonly IRideableHorseState[] = [],
  daylightFactor = 1.0,
  _soundCallbacks?: unknown,
  playerSpeed = 0,
  isPlayerSneaking = false,
  isAttacking = false,
  rainIntensity = 0,
  playerStateRef?: IPlayerState
): { scamperedCritterCount: number; nearestCritterDist: number } {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const isNightRest = daylightFactor < 0.35;
  const isRaining = rainIntensity > 0.15;
  let scamperedCritterCount = 0;
  let nearestCritterDist = Infinity;

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];

    // Dead animals stay anchored on top of the terrain (while dead fish sink into the water!). Kings/Bosses NEVER respawn, while regular animals respawn after their timer when the player is outside their territory!
    if (a.isDead) {
      if (a.aiBehavior !== 'dead' || a.vx !== 0 || a.vz !== 0) {
        a.vx = 0;
        a.vz = 0;
        if (a.species !== 'koifish') {
          a.y = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(a.x, a.z, a.y).height);
        }
        a.isResting = false;
        a.isSeekingShelter = false;
        a.isFleeing = false;
        a.aiBehavior = 'dead';
      }
      if (a.species === 'koifish') {
        const lakeBedY = Math.max(groundHeightAt(a.x, a.z) + 0.14, WATER_LEVEL - 1.15);
        a.y = Math.max(lakeBedY, (a.y ?? WATER_LEVEL - 0.38) - Math.max(0.016, dt) * 0.65);
      }
      if (a.isBoss || a.species === 'dragon') {
        a.respawnTimer = undefined;
        continue;
      }
      if (dt > 0) {
        a.respawnTimer = (a.respawnTimer ?? ANIMAL_RESPAWN_DELAY_SECONDS) - Math.max(0, dt);
        const toHomeDx = a.homeX - playerX;
        const toHomeDz = a.homeZ - playerZ;
        const distPlayerToHome = Math.hypot(toHomeDx, toHomeDz);
        const distPlayerToCorpse = Math.hypot(a.x - playerX, a.z - playerZ);
        let canRespawnOffscreen = distPlayerToHome > 38.0 && distPlayerToCorpse > 38.0;
        if (playerStateRef) {
          // Respawn once the player is outside the animal's territory/radius (> 62m) and either not staring directly at a close spawn spot or > 125m away!
          const lookX = -Math.sin(playerStateRef.yaw);
          const lookZ = -Math.cos(playerStateRef.yaw);
          const dot =
            distPlayerToHome > 0.001
              ? (toHomeDx * lookX + toHomeDz * lookZ) / distPlayerToHome
              : 1.0;
          canRespawnOffscreen =
            distPlayerToHome > 62.0 &&
            distPlayerToCorpse > 56.0 &&
            (dot < 0.35 || distPlayerToHome > 125.0);
        }
        if (a.respawnTimer <= 0 && canRespawnOffscreen) {
          const homeWalk = walkableHeightAt(a.homeX, a.homeZ);
          a.x = a.homeX;
          a.z = a.homeZ;
          const isAquaticOrSemiAquatic =
            a.species === 'hippo' ||
            a.species === 'crocodile' ||
            a.species === 'koifish' ||
            a.species === 'dolphin';
          if (isAquaticOrSemiAquatic && homeWalk.height <= WATER_LEVEL + 0.15) {
            a.inWater = true;
            const depth = Math.max(0, WATER_LEVEL - homeWalk.height);
            const submerge = Math.min(depth, getAnimalWaterSubmergenceDepth(a.species));
            a.y = Math.max(homeWalk.height, WATER_LEVEL - submerge);
          } else {
            a.inWater = false;
            a.y = Math.max(WATER_LEVEL + 0.08, homeWalk.height);
          }
          a.vx = 0;
          a.vz = 0;
          a.isDead = false;
          a.isLooted = false;
          a.isSubdued = false;
          a.maxHp = a.maxHp ?? getAnimalMaxHp(a.species);
          a.hp = a.maxHp;
          a.respawnTimer = undefined;
          a.wokenUpTimer = 0;
          a.hitReactionTimer = 0;
          a.fleeCooldown = 0;
          a.roarWarningDone = false;
          a.stompWarningDone = false;
          a.trappedByBearJawTimer = 0;
          a.bearTrapSlowTimer = 0;
          a.alertLevel = 'grazing';
          a.aiBehavior = 'grazing';
        }
      }
      continue;
    }

    const dxP = a.x - playerX;
    const dzP = a.z - playerZ;
    const distP = Math.hypot(dxP, dzP);
    if (distP < nearestCritterDist) {
      nearestCritterDist = distP;
    }

    if (safeDt <= 0) continue;

    // Logic Culling (Sleep State): completely freeze simulation for any animal outside the 180m fog/active radius
    // until the player approaches its radius again.
    if (playerStateRef && distP > 180.0 && !a.isMountedByPlayer) {
      continue;
    }

    const prevActionTimer = a.actionTimer ?? 0;
    if ((a.wokenUpTimer ?? 0) > 0) {
      a.wokenUpTimer = Math.max(0, (a.wokenUpTimer ?? 0) - safeDt);
    }
    if ((a.hitReactionTimer ?? 0) > 0) {
      a.hitReactionTimer = Math.max(0, (a.hitReactionTimer ?? 0) - safeDt);
    }
    if ((a.listenCooldown ?? 0) > 0) {
      a.listenCooldown = Math.max(0, (a.listenCooldown ?? 0) - safeDt);
    }
    if ((a.actionTimer ?? 0) > 0) {
      a.actionTimer = Math.max(0, (a.actionTimer ?? 0) - safeDt);
    }
    if ((a.attackHitCooldownTimer ?? 0) > 0) {
      a.attackHitCooldownTimer = Math.max(0, (a.attackHitCooldownTimer ?? 0) - safeDt);
    }
    if ((a.bearTrapSlowTimer ?? 0) > 0) {
      a.bearTrapSlowTimer = Math.max(0, (a.bearTrapSlowTimer ?? 0) - safeDt);
    }

    // Heavy Steel Bear Trap (`trap_bear_jaw`) clamped to Bear's front paw:
    // Bear stops in place and plays its 4-legged roar animation (`aiBehavior = 'roaring'`) for 2.4s.
    // Once the roar animation finishes, the trap disappears and the bear immediately resumes chasing with -10% speed for 7s!
    if ((a.trappedByBearJawTimer ?? 0) > 0) {
      a.trappedByBearJawTimer = Math.max(0, (a.trappedByBearJawTimer ?? 0) - safeDt);
      a.isResting = false;
      a.isSeekingShelter = false;
      a.isFleeing = false;
      a.fleeCooldown = 0;
      a.alertLevel = 'curious';
      a.pounceHeight = 0;
      a.vx = 0;
      a.vz = 0;
      if ((a.trappedByBearJawTimer ?? 0) > 0) {
        a.aiBehavior = 'roaring';
        a.actionTimer = a.trappedByBearJawTimer;
        if (distP > 0.35) {
          const toPlayerYaw = Math.atan2(playerX - a.x, playerZ - a.z);
          a.yaw = rotateYawSmoothlyToward(a.yaw, toPlayerYaw, 4.0, safeDt);
        }
        continue;
      } else {
        // Roar finished -> trap vanishes from paw and bear resumes chasing the player!
        a.aiBehavior = 'charging';
        a.actionTimer = 0;
        a.roarWarningDone = true;
        a.stompWarningDone = true;
        a.wokenUpTimer = 22.0;
        a.stimulusX = playerX;
        a.stimulusZ = playerZ;
      }
    }

    // The Southern Ruins Dragon's 3D flight/landing/resting/fire-breathing trajectory is driven by sanctuaryAndDragonModels.ts
    if (a.species === 'dragon') {
      continue;
    }

    // If this animal (Royal Stag or Mystical CatLion) is currently mounted by the player,
    // its position, velocity, and yaw are driven directly by stepPlayerPhysics!
    if (a.isMountedByPlayer) {
      a.isResting = false;
      a.isFleeing = false;
      a.fleeCooldown = 0;
      a.alertLevel = 'grazing';
      a.pounceHeight = 0;
      const spd = Math.hypot(a.vx, a.vz);
      // Note: a.actionTimer was already decremented once above (line 1567) — do NOT double-decrement it here!
      if ((a.actionTimer ?? 0) > 0 && a.aiBehavior === 'attacking') {
        a.vx = 0;
        a.vz = 0;
      } else {
        a.aiBehavior = spd > 3.2 ? 'charging' : spd > 0.2 ? 'wandering' : 'grazing';
      }
      a.hopPhase += safeDt * Math.max(4.0, spd * 1.8);
      continue;
    }

    // Keep any animal standing on the Sailable Ship deck safely aboard during the voyage!
    const activeShip = getActiveSailableShip();
    if (isEntityOnSailableShipDeck(a.x, a.z, a.y, activeShip, 1.35)) {
      a.isResting = false;
      a.isFleeing = false;
      a.fleeCooldown = 0;
      a.alertLevel = 'grazing';
      a.aiBehavior = 'grazing';
      a.pounceHeight = 0;
      a.vx = 0;
      a.vz = 0;
      a.inWater = false;
      a.y = sailableShipDeckHeightAt(a.x, a.z, a.y, activeShip) ?? activeShip.deckY;
      a.homeX = a.x;
      a.homeZ = a.z;
      continue;
    }

    // If this animal has been tamed by the player (unmounted Royal Stag or Mystical CatLion companion),
    // it wanders, grazes, and rests peacefully around its current territory without staring at or attacking the player!
    if (a.isTamed) {
      a.isResting = false;
      a.isFleeing = false;
      a.fleeCooldown = 0;
      a.alertLevel = 'grazing';
      a.pounceHeight = 0;
      const timeWindow = Math.floor(elapsedTime * 0.14 + a.id * 1.53);
      const wanderSeed = hash2D(a.id * 17.3, timeWindow);
      if (wanderSeed > 0.62) {
        a.aiBehavior = a.species === 'lion' && wanderSeed > 0.82 ? 'sitting' : 'grazing';
        a.vx = 0;
        a.vz = 0;
      } else {
        a.aiBehavior = 'wandering';
        const targetAngle = (wanderSeed / 0.62) * Math.PI * 2;
        const homePullX = (a.homeX - a.x) * 0.14;
        const homePullZ = (a.homeZ - a.z) * 0.14;
        const roamSpd = a.species === 'lion' ? 1.85 : 1.75;
        const desiredVx = Math.cos(targetAngle) * roamSpd + homePullX;
        const desiredVz = Math.sin(targetAngle) * roamSpd + homePullZ;
        const blend = Math.min(1, safeDt * 4.0);
        a.vx += (desiredVx - a.vx) * blend;
        a.vz += (desiredVz - a.vz) * blend;
        if (Math.hypot(a.vx, a.vz) > 0.08) {
          a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 4.2, safeDt);
        }
        a.hopPhase += safeDt * 6.0;
        const rawNextX = a.x + a.vx * safeDt;
        const rawNextZ = a.z + a.vz * safeDt;
        const bodyRadius = a.species === 'lion' && a.isBoss ? 1.65 : 0.75;
        const resolved = resolveAnimalObstacleCollision(rawNextX, rawNextZ, bodyRadius);
        advanceAnimalWithWaterShoreRecovery(a, resolved.x, resolved.z, resolved.hitObstacle, safeDt);
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 1. NIGHTTIME SLEEPING & INVISIBLE WAKE-UP NOISE METER
    //    When sleeping: visionRange = 0 (eyes closed!) and hearingRadius is reduced!
    // -------------------------------------------------------------------------
    if (
      isNightRest &&
      a.species !== 'koifish' &&
      a.species !== 'dolphin' &&
      (a.wokenUpTimer ?? 0) <= 0 &&
      a.fleeCooldown <= 0
    ) {
      const sleepSensory = getAnimalSensoryProfile(a.species, true);
      // Check noise from player or nearby predator within reduced sleeping hearing radius
      let sleepNoiseRate = -0.28;
      if (distP < sleepSensory.hearingRadius) {
        sleepNoiseRate = computePlayerNoiseRateAtDistance(
          distP,
          playerSpeed,
          isPlayerSneaking,
          isAttacking,
          true
        );
      }
      // Also check if an awake moving predator is making noise within sleeping hearing range
      let predatorNearSleepX = playerX;
      let predatorNearSleepZ = playerZ;
      for (let j = 0; j < animals.length; j++) {
        if (i === j) continue;
        const other = animals[j];
        if (other.isDead || !isPredatorSpecies(other.species)) continue;
        const dPred = Math.hypot(a.x - other.x, a.z - other.z);
        const predSpd = Math.hypot(other.vx, other.vz);
        if (dPred < sleepSensory.hearingRadius && predSpd > 0.6 && !isPredatorSpecies(a.species)) {
          const predNoise = 0.55 + (1 - dPred / sleepSensory.hearingRadius) * 0.9;
          if (predNoise > sleepNoiseRate) {
            sleepNoiseRate = predNoise;
            predatorNearSleepX = other.x;
            predatorNearSleepZ = other.z;
          }
        }
      }

      const nextWake = Math.max(0, Math.min(1, (a.wakeMeter ?? 0) + sleepNoiseRate * safeDt));
      a.wakeMeter = nextWake;

      if (nextWake >= 1.0) {
        // Woken up by excessive noise!
        a.isResting = false;
        a.wokenUpTimer = 8.0;
        a.alertLevel = 'fleeing';
        a.aiBehavior = 'fleeing';
        a.isFleeing = true;
        a.fleeCooldown = 4.5;
        a.stimulusX = predatorNearSleepX;
        a.stimulusZ = predatorNearSleepZ;
        scamperedCritterCount++;
      } else {
        // Eyes closed (vision = 0), still sleeping peacefully
        a.isResting = true;
        a.isSeekingShelter = false;
        a.alertLevel = 'grazing';
        a.aiBehavior = 'sleeping';
        a.isFleeing = false;
        a.vx = 0;
        a.vz = 0;
        a.pounceHeight = 0;
        continue;
      }
    } else if (!isNightRest) {
      a.wakeMeter = Math.max(0, (a.wakeMeter ?? 0) - 0.5 * safeDt);
    }

    // -------------------------------------------------------------------------
    // 2. PREDATOR AI (BEAR, JAGUAR, CROCODILE, WOLF, RHINO)
    //    - Zero ground sliding: stationary animations ('roaring', 'stomping', 'sitting',
    //      'grazing', 'sleeping', and Bear/Crocodile 'attacking') strictly hold vx = 0, vz = 0.
    //    - Wolf & Jaguar Forward Pounce Leap ('attacking'): leaps forward along a locked
    //      airborne arc (pounceHeight > 0) up to 1.55m from launch; hits if target doesn't
    //      dodge, misses cleanly and lands with vx = 0, vz = 0 if target retreats/dodges.
    //    - Rhino High-Momentum Charge: accelerates to high speed, cannot brake during its
    //      running horn-gore attack, has restricted turning radius at high speed so it tries
    //      to turn when dodged, overshoots, decelerates/brakes, turns around, and charges again.
    // -------------------------------------------------------------------------
    // If the Giant Volcano Boss CatLion has been beaten down to low HP (isSubdued),
    // it does NOT flee and does NOT attack — it sits subdued waiting for the player to feed it meat and tame it with [F]!
    if (
      a.species === 'lion' &&
      a.isBoss &&
      !a.isTamed &&
      (a.isSubdued || (a.hp ?? a.maxHp ?? 360) <= Math.max(60, Math.ceil((a.maxHp ?? 360) * 0.25)))
    ) {
      a.isSubdued = true;
      a.isResting = false;
      a.isSeekingShelter = false;
      a.isFleeing = false;
      a.fleeCooldown = 0;
      a.alertLevel = 'grazing';
      a.aiBehavior = 'sitting';
      a.pounceHeight = 0;
      a.vx = 0;
      a.vz = 0;
      if (distP < 14.0 && distP > 0.4) {
        const toPlayerYaw = Math.atan2(playerX - a.x, playerZ - a.z);
        a.yaw = rotateYawSmoothlyToward(a.yaw, toPlayerYaw, 3.5, safeDt);
      }
      continue;
    }

    if (isPredatorSpecies(a.species)) {
      const myRank = getAnimalSizeRank(a.species, a.isBoss);
      let largerThreatX = 0;
      let largerThreatZ = 0;
      let largerThreatDist = Infinity;

      // Check if a larger predator is nearby (e.g., bear threatening jaguar/crocodile/wolf)
      for (let j = 0; j < animals.length; j++) {
        if (i === j) continue;
        const other = animals[j];
        if (other.isDead || !isPredatorSpecies(other.species)) continue;
        if (getAnimalSizeRank(other.species, other.isBoss) > myRank) {
          const dOther = Math.hypot(a.x - other.x, a.z - other.z);
          if (dOther < 14.5 && dOther < largerThreatDist) {
            largerThreatDist = dOther;
            largerThreatX = other.x;
            largerThreatZ = other.z;
          }
        }
      }

      // Check if overwhelmed by a charging horse or heavy player weapon strike
      for (let h = 0; h < horses.length; h++) {
        const hr = horses[h];
        if (hr.speed > 6.0) {
          const dH = Math.hypot(a.x - hr.x, a.z - hr.z);
          if (dH < 11.5 && dH < largerThreatDist) {
            largerThreatDist = dH;
            largerThreatX = hr.x;
            largerThreatZ = hr.z;
          }
        }
      }
      if (!isPredatorSpecies(a.species) && isAttacking && distP < 6.5 && distP < largerThreatDist) {
        largerThreatDist = distP;
        largerThreatX = playerX;
        largerThreatZ = playerZ;
      }

      // Smaller Volcano CatLions (!isBoss) flee when their HP drops low (<= 2) like regular animals!
      if (
        a.species === 'lion' &&
        !a.isBoss &&
        (a.hp ?? a.maxHp ?? 5) <= Math.max(1, Math.ceil((a.maxHp ?? 5) * 0.35)) &&
        distP < 22.0
      ) {
        largerThreatDist = distP;
        largerThreatX = playerX;
        largerThreatZ = playerZ;
      }
      // The Giant Volcano Boss CatLion never flees!
      if (a.species === 'lion' && a.isBoss) {
        largerThreatDist = Infinity;
        a.fleeCooldown = 0;
        a.isFleeing = false;
      }

      if (largerThreatDist < Infinity) {
        if (a.alertLevel !== 'fleeing') {
          scamperedCritterCount++;
        }
        a.alertLevel = 'fleeing';
        a.aiBehavior = 'fleeing';
        a.isFleeing = true;
        a.fleeCooldown = 3.6;
        a.isResting = false;
        a.isSeekingShelter = false;
        a.pounceHeight = 0;
        a.stimulusX = largerThreatX;
        a.stimulusZ = largerThreatZ;
      } else if (a.fleeCooldown > 0) {
        a.fleeCooldown = Math.max(0, a.fleeCooldown - safeDt);
        if (a.fleeCooldown <= 0) {
          a.isFleeing = false;
          a.alertLevel = 'grazing';
        }
      }

      if (a.alertLevel === 'fleeing' && a.fleeCooldown > 0) {
        const tx = a.stimulusX ?? playerX;
        const tz = a.stimulusZ ?? playerZ;
        const awayX = a.x - tx;
        const awayZ = a.z - tz;
        const len = Math.hypot(awayX, awayZ) || 1;
        const fleeSpd = SPECIES_PROFILES[a.species].predatorFleeSpeed;
        a.vx = (awayX / len) * fleeSpd;
        a.vz = (awayZ / len) * fleeSpd;
        a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 7.5, safeDt);
        a.hopPhase += safeDt * 14.0;
        a.aiBehavior = 'fleeing';
        a.isResting = false;
        a.isSeekingShelter = false;
        a.pounceHeight = 0;
      } else if (a.species === 'bear' && isRaining) {
        // Bear returns through the mountain tunnel into its deep cavern when it rains!
        const caveIdx = a.caveIndex ?? 0;
        const deepChamberPos = caveLocalToWorld(caveIdx, 0, -15.0);
        const distToChamberCenter = Math.hypot(deepChamberPos.x - a.x, deepChamberPos.z - a.z);
        const caveWaypoint = findNearestShelterPoint(a.x, a.z, 'bear', caveIdx);
        a.shelterTargetX = deepChamberPos.x;
        a.shelterTargetZ = deepChamberPos.z;
        a.isSeekingShelter = true;
        a.pounceHeight = 0;

        if (distToChamberCenter > 3.2) {
          a.isResting = false;
          a.alertLevel = 'grazing';
          a.aiBehavior = 'seeking_shelter';
          const toWpX = caveWaypoint.x - a.x;
          const toWpZ = caveWaypoint.z - a.z;
          const distWp = Math.hypot(toWpX, toWpZ) || 1;
          const caveSpd = 4.4;
          a.vx = (toWpX / distWp) * caveSpd;
          a.vz = (toWpZ / distWp) * caveSpd;
          a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 6.5, safeDt);
          a.hopPhase += safeDt * 9.0;
        } else {
          // Inside the mountain cavern chamber: lie down and rest out of the rain (zero sliding)
          a.vx = 0;
          a.vz = 0;
          a.isResting = true;
          a.alertLevel = 'grazing';
          a.aiBehavior = 'sleeping';
        }
      } else {
        // Predator scans for prey (deer, sheep, rabbits, squirrels, or non-sneaking player)
        a.isSeekingShelter = false;
        const sensory = getAnimalSensoryProfile(a.species, false);
        let preyX = 0;
        let preyZ = 0;
        let bestPreyDist = sensory.visionRange;
        let foundPrey = false;
        let preyIsPlayer = false;

        for (let j = 0; j < animals.length; j++) {
          if (i === j) continue;
          const other = animals[j];
          if (other.isDead || isPredatorSpecies(other.species)) continue;
          if (
            a.species === 'crocodile' &&
            Math.hypot(other.x - a.homeX, other.z - a.homeZ) > 22.0
          ) {
            continue;
          }
          const dPrey = Math.hypot(other.x - a.x, other.z - a.z);
          if (dPrey < bestPreyDist) {
            bestPreyDist = dPrey;
            preyX = other.x;
            preyZ = other.z;
            foundPrey = true;
            preyIsPlayer = false;
          }
        }

        const isBossLion = a.species === 'lion' && Boolean(a.isBoss);
        const playerDistToVolcanoCenter = isBossLion
          ? Math.hypot(playerX - VOLCANO_SANCTUM_POS.x, playerZ - VOLCANO_SANCTUM_POS.z)
          : Infinity;
        const playerInBossChamber =
          isBossLion && playerDistToVolcanoCenter <= VOLCANO_SANCTUM_POS.chamberRadius;
        const playerInVolcanoSanctum =
          isBossLion && Boolean(isInsideVolcanoSanctum(playerX, playerZ));

        // Universal Predator Dual-Condition Territory Leash & Grudge Memory Rule:
        // A creature ONLY stops chasing (`a.isLeashedReturning = true`) when BOTH:
        //   1) The player has moved far outside the creature's large chase range (`distP > 54.0`)
        //   2) AND the creature itself is outside its home territory (`animalDistFromHome > territoryRadius`) AND the player is outside its territory (`!playerInsideCreatureTerritory`).
        // When it stops chasing and walks back to its territory, it RETAINS `a.wokenUpTimer` (45s grudge memory)
        // so if the player returns to the area or comes within 42m during that time, it immediately resumes attacking!
        const animalDistFromHome = Math.hypot(a.x - a.homeX, a.z - a.homeZ);
        const playerDistFromHome = Math.hypot(playerX - a.homeX, playerZ - a.homeZ);
        const territoryRadius = a.species === 'crocodile' ? 42.0 : 48.0;
        const chaseRange = 54.0;
        const reaggroRange = 42.0;
        const playerInsideCreatureTerritory =
          playerDistFromHome <= territoryRadius ||
          (a.species === 'bear' && a.caveIndex !== undefined && playerDistFromHome <= 52.0) ||
          playerInBossChamber ||
          (isBossLion && playerInVolcanoSanctum);

        if (!a.isLeashedReturning) {
          if (
            !playerInsideCreatureTerritory &&
            animalDistFromHome > territoryRadius &&
            distP > chaseRange
          ) {
            a.isLeashedReturning = true;
            a.wokenUpTimer = Math.max(a.wokenUpTimer ?? 0, 45.0);
            a.alertLevel = 'grazing';
            a.stimulusX = undefined;
            a.stimulusZ = undefined;
          }
        } else {
          // Creature is walking back home with a grudge: if player returns to territory or within 42m, immediately resume chasing!
          if (playerInsideCreatureTerritory || distP <= reaggroRange) {
            a.isLeashedReturning = false;
            a.wokenUpTimer = Math.max(a.wokenUpTimer ?? 0, 45.0);
          } else if (animalDistFromHome <= 6.0 && (a.wokenUpTimer ?? 0) <= 0) {
            a.isLeashedReturning = false;
          }
        }

        const isCreatureLeashedOutOfTerritory = Boolean(a.isLeashedReturning);

        const provokedByShot =
          !isCreatureLeashedOutOfTerritory &&
          (a.wokenUpTimer ?? 0) > 0 &&
          ((a.hp ?? a.maxHp ?? 1) < (a.maxHp ?? 1) || a.species === 'crocodile');
        const alreadyChasingPlayer = !isCreatureLeashedOutOfTerritory && a.alertLevel === 'curious';
        const basePlayerDetectRange = alreadyChasingPlayer
          ? SPECIES_PROFILES[a.species].playerDetectRangeWhileChasing
          : SPECIES_PROFILES[a.species].playerDetectRange;
        const maxProvokedRange = SPECIES_PROFILES[a.species].provokedDetectRange;
        const playerDetectRange =
          playerInBossChamber || (isBossLion && provokedByShot && playerInVolcanoSanctum)
            ? 95.0
            : provokedByShot
              ? maxProvokedRange
              : isPlayerSneaking
                ? 4.2
                : basePlayerDetectRange;
        const playerRidingMysticalLion = Boolean(
          playerStateRef?.mountedHorseId?.startsWith('mount-lion-')
        );
        const playerVertDiff = playerStateRef !== null && playerStateRef !== undefined ? Math.abs(playerStateRef.y - a.y) : 0;
        const canReachPlayerVertically = playerVertDiff <= (isBossLion ? 5.2 : 3.4);
        if (
          !isCreatureLeashedOutOfTerritory &&
          !playerRidingMysticalLion &&
          canReachPlayerVertically &&
          (!isBossLion || playerInBossChamber || (provokedByShot && playerInVolcanoSanctum)) &&
          distP < playerDetectRange &&
          distP <= (provokedByShot || playerInBossChamber ? 95.0 : bestPreyDist)
        ) {
          bestPreyDist = distP;
          preyX = playerX;
          preyZ = playerZ;
          foundPrey = true;
          preyIsPlayer = true;
        }

        // FULL ANIMATION COMMITMENT RULE:
        // If a predator has started an attack ('attacking') or stationary threat action ('roaring', 'stomping'),
        // it CANNOT cancel or interrupt the animation mid-way (even if prey moves out of range),
        // and it CANNOT begin moving until the full animation finishes and transitions to a locomotion state!
        const hasActiveCommittedAction =
          !isCreatureLeashedOutOfTerritory &&
          (a.actionTimer ?? 0) > 0 &&
          (a.aiBehavior === 'attacking' || a.aiBehavior === 'roaring' || a.aiBehavior === 'stomping');

        if (!foundPrey && hasActiveCommittedAction) {
          foundPrey = true;
          preyX = a.stimulusX ?? playerX;
          preyZ = a.stimulusZ ?? playerZ;
          bestPreyDist = Math.hypot(preyX - a.x, preyZ - a.z);
        }

        if (foundPrey) {
          a.isResting = false;
          a.alertLevel = 'curious';
          a.stimulusX = preyX;
          a.stimulusZ = preyZ;
          const steeredTarget =
            a.species === 'bear'
              ? steerBearThroughCavePortal(a.x, a.z, preyX, preyZ, a.caveIndex)
              : a.species === 'lion'
                ? steerLionThroughVolcanoPortal(a.x, a.z, preyX, preyZ)
                : { x: preyX, z: preyZ };
          const toPreyX = steeredTarget.x - a.x;
          const toPreyZ = steeredTarget.z - a.z;
          const len = Math.hypot(toPreyX, toPreyZ) || 1;
          const targetYaw = Math.atan2(toPreyX, toPreyZ);
          const standoffDist = getPredatorMeleeStandoffDist(a.species, a.isBoss);
          const attackTriggerDist = getPredatorAttackTriggerDist(a.species, a.isBoss);

          // -----------------------------------------------------------------
          // A. RHINO COMBAT:
          //    1) If already in a stationary 'attacking' animation (actionTimer > 0), finish the full
          //       stationary attack animation in place (vx = 0, vz = 0) before moving!
          //    2) If running ('charging' with rhinoChargeSpeed > 3.2) and prey is in range:
          //       DO NOT switch to 'attacking' clip — keep running ('charging') toward/through the player
          //       and let the running charge impact deal damage!
          //    3) If NOT running (rhinoChargeSpeed <= 3.2) and prey is within attackTriggerDist:
          //       Perform stationary 'attacking' in place (vx = 0, vz = 0) without moving!
          // -----------------------------------------------------------------
          if (a.species === 'rhino') {
            a.pounceHeight = 0;
            if ((a.rhinoPhaseTimer ?? 0) > 0) {
              a.rhinoPhaseTimer = Math.max(0, (a.rhinoPhaseTimer ?? 0) - safeDt);
            }

            if (a.aiBehavior === 'attacking' && (a.actionTimer ?? 0) > 0) {
              // Stationary Rhino attack in progress: must complete full animation without moving!
              a.vx = 0;
              a.vz = 0;
              a.rhinoChargeSpeed = 0;
              if (bestPreyDist > 0.35) {
                a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 3.2, safeDt);
              }
              if (
                preyIsPlayer &&
                playerStateRef &&
                prevActionTimer > 0.42 &&
                (a.actionTimer ?? 0) <= 0.42 &&
                bestPreyDist <= standoffDist + 0.95
              ) {
                playerStateRef.stamina = Math.max(0, (playerStateRef.stamina ?? 100) - 16);
                playerStateRef.vx += (toPreyX / len) * 3.6;
                playerStateRef.vz += (toPreyZ / len) * 3.6;
              }
            } else if ((a.rhinoChargeSpeed ?? 0) <= 3.2 && bestPreyDist <= attackTriggerDist) {
              // Rhino is NOT running and player is within melee range -> stationary attack in place!
              a.aiBehavior = 'attacking';
              a.actionTimer = 0.85;
              a.vx = 0;
              a.vz = 0;
              a.rhinoChargeSpeed = 0;
              if (bestPreyDist > 0.35) {
                a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 3.6, safeDt);
              }
            } else {
              const phase = a.rhinoPhase ?? 'charging';

              if (phase === 'overshoot_braking') {
                // Rhino missed/overshot target: tries to turn slowly while heavy momentum skids/decelerates it forward
                const curSpd = Math.max(1.25, (a.rhinoChargeSpeed ?? 6.8) - 7.6 * safeDt);
                a.rhinoChargeSpeed = curSpd;
                a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 1.05, safeDt);
                a.vx = Math.sin(a.yaw) * curSpd;
                a.vz = Math.cos(a.yaw) * curSpd;
                a.aiBehavior = curSpd > 3.2 ? 'charging' : 'wandering';
                a.hopPhase += safeDt * (curSpd * 1.8);
                if (curSpd <= 1.35 || (a.rhinoPhaseTimer ?? 0) <= 0) {
                  a.rhinoPhase = 'realigning';
                  a.rhinoPhaseTimer = 1.25;
                }
              } else if (phase === 'realigning') {
                // Rhino has braked after overshooting: pivots on walking feet to line up a new charge
                a.rhinoChargeSpeed = 1.35;
                a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 3.4, safeDt);
                a.vx = Math.sin(a.yaw) * 1.35;
                a.vz = Math.cos(a.yaw) * 1.35;
                a.aiBehavior = 'wandering';
                a.hopPhase += safeDt * 6.5;
                const angleDiff = Math.abs(Math.atan2(Math.sin(targetYaw - a.yaw), Math.cos(targetYaw - a.yaw)));
                if (angleDiff < 0.26 || (a.rhinoPhaseTimer ?? 0) <= 0) {
                  a.rhinoPhase = 'charging';
                  a.rhinoPhaseTimer = 0;
                }
              } else {
                // 'charging' phase: Rhino is running toward target!
                // If target is in range while running, Rhino simply continues running ('charging') and that running impact deals damage!
                const curSpd = Math.min(9.5, Math.max(3.4, (a.rhinoChargeSpeed ?? 3.4) + 7.2 * safeDt));
                a.rhinoChargeSpeed = curSpd;
                const turnRate = curSpd > 4.2 ? 0.88 : 2.8;
                a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, turnRate, safeDt);
                const fwdX = Math.sin(a.yaw);
                const fwdZ = Math.cos(a.yaw);
                const cosToPrey = (toPreyX * fwdX + toPreyZ * fwdZ) / len;

                a.aiBehavior = 'charging';
                let stepSpd = curSpd;
                if (cosToPrey > 0.84 && bestPreyDist <= standoffDist + 0.15) {
                  stepSpd = Math.min(curSpd, Math.max(0, bestPreyDist - standoffDist) / Math.max(safeDt, 0.016));
                }
                a.vx = fwdX * stepSpd;
                a.vz = fwdZ * stepSpd;
                a.hopPhase += safeDt * 16.0;

                // Running impact damage when charging Rhino reaches target
                if (
                  bestPreyDist <= standoffDist + 1.05 &&
                  cosToPrey > 0.42 &&
                  (a.attackHitCooldownTimer ?? 0) <= 0
                ) {
                  a.attackHitCooldownTimer = 0.85;
                  if (preyIsPlayer && playerStateRef) {
                    playerStateRef.stamina = Math.max(0, (playerStateRef.stamina ?? 100) - 18);
                    playerStateRef.vx += fwdX * 4.5;
                    playerStateRef.vz += fwdZ * 4.5;
                  }
                  a.rhinoPhase = 'overshoot_braking';
                  a.rhinoPhaseTimer = 1.05;
                } else if (curSpd > 4.5 && cosToPrey < 0.42 && bestPreyDist < 9.5) {
                  // Target sidestepped/dodged the charging Rhino! Rhino tries to turn, fails, and enters overshoot braking
                  a.rhinoPhase = 'overshoot_braking';
                  a.rhinoPhaseTimer = 1.15;
                }
              }
            }
          } else {
            // -----------------------------------------------------------------
            // B. BEAR, CROCODILE, WOLF & JAGUAR COMBAT & PROGRESSION
            //    - Once an attack ('attacking') or stationary warning ('roaring', 'stomping') starts,
            //      it is 100% committed until actionTimer reaches 0 (even if prey backs away).
            //    - Crocodile pushes/lunges itself forward during its bite strike when it thinks it is close enough!
            // -----------------------------------------------------------------
            const chargeSpd = SPECIES_PROFILES[a.species].chargeSpeed;

            const isCommittedAttack = a.aiBehavior === 'attacking' && (a.actionTimer ?? 0) > 0;
            const isCommittedStationaryWarning =
              (a.aiBehavior === 'roaring' || a.aiBehavior === 'stomping') && (a.actionTimer ?? 0) > 0;

            if (isCommittedAttack || (!isCommittedStationaryWarning && bestPreyDist <= attackTriggerDist)) {
              const isPouncer = SPECIES_PROFILES[a.species].pouncesOnPrey;

              if (isPouncer) {
                // WOLF & JAGUAR FORWARD POUNCE LEAP (0.68s active cycle — no post-attack freeze!):
                // Locks trajectory at launch and leaps through the air (pounceHeight > 0).
                if (a.aiBehavior !== 'attacking' || (a.actionTimer ?? 0) <= 0) {
                  a.aiBehavior = 'attacking';
                  a.actionTimer = 0.68;
                  a.pounceDirX = toPreyX / len;
                  a.pounceDirZ = toPreyZ / len;
                  a.pounceStartX = a.x;
                  a.pounceStartZ = a.z;
                }

                const timer = a.actionTimer ?? 0;
                const pDirX = a.pounceDirX ?? toPreyX / len;
                const pDirZ = a.pounceDirZ ?? toPreyZ / len;
                const distFromLaunch = Math.hypot(
                  a.x - (a.pounceStartX ?? a.x),
                  a.z - (a.pounceStartZ ?? a.z)
                );
                const maxPounceReach = 1.65;
                const gap = bestPreyDist - standoffDist;

                if (timer > 0.16) {
                  // Airborne pounce phase (0.68 -> 0.16)
                  const leapProgress = Math.max(0, Math.min(1, (0.68 - timer) / 0.52));
                  a.pounceHeight = Math.sin(leapProgress * Math.PI) * 0.56;

                  if (gap > 0.04 && distFromLaunch < maxPounceReach) {
                    const remLaunchBudget = Math.max(0, maxPounceReach - distFromLaunch);
                    const maxAllowedStep = Math.min(gap, remLaunchBudget) / Math.max(safeDt, 0.016);
                    const leapSpd = Math.min(chargeSpd * 1.05, maxAllowedStep);
                    a.vx = pDirX * leapSpd;
                    a.vz = pDirZ * leapSpd;
                  } else {
                    a.vx = 0;
                    a.vz = 0;
                  }
                } else {
                  // Grounded landing completion (0.16 -> 0): strictly vx = 0, vz = 0 until transitioning to locomotion!
                  a.pounceHeight = 0;
                  a.vx = 0;
                  a.vz = 0;
                }

                if (bestPreyDist > 0.35) {
                  a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 3.8, safeDt);
                }
                a.hopPhase += safeDt * 14.0;

                // Pounce hits ONLY if player did not dodge/retreat out of pounce landing range!
                if (
                  preyIsPlayer &&
                  playerStateRef &&
                  prevActionTimer > 0.34 &&
                  timer <= 0.34 &&
                  bestPreyDist <= standoffDist + 0.65
                ) {
                  playerStateRef.stamina = Math.max(0, (playerStateRef.stamina ?? 100) - 12);
                  playerStateRef.vx += pDirX * 2.6;
                  playerStateRef.vz += pDirZ * 2.6;
                }

                // Immediately transition to locomotion ('charging') as soon as the 0.68s pounce finishes so it never freezes!
                if (timer <= 0.02) {
                  a.pounceHeight = 0;
                  a.actionTimer = 0;
                  if (bestPreyDist <= attackTriggerDist) {
                    a.aiBehavior = 'attacking';
                  } else {
                    a.aiBehavior = 'charging';
                    const maxChargeNoOvershoot =
                      Math.max(0, bestPreyDist - standoffDist) / Math.max(safeDt, 0.016);
                    const effChargeSpd = Math.min(chargeSpd, maxChargeNoOvershoot);
                    a.vx = (toPreyX / len) * effChargeSpd;
                    a.vz = (toPreyZ / len) * effChargeSpd;
                  }
                }
              } else if (a.species === 'crocodile') {
                // CROCODILE FORWARD LUNGE STRIKE:
                // When the crocodile thinks it is close enough (<= 4.35m), it pushes itself forward
                // with a powerful jaw-snap lunge along its launch direction and delivers a heavy bite!
                if (a.aiBehavior !== 'attacking' || (a.actionTimer ?? 0) <= 0) {
                  a.aiBehavior = 'attacking';
                  a.actionTimer = 0.86;
                  a.pounceDirX = toPreyX / len;
                  a.pounceDirZ = toPreyZ / len;
                  a.pounceStartX = a.x;
                  a.pounceStartZ = a.z;
                }
                a.pounceHeight = 0;
                const timer = a.actionTimer ?? 0;
                const lungeDirX = a.pounceDirX ?? toPreyX / len;
                const lungeDirZ = a.pounceDirZ ?? toPreyZ / len;
                const distFromLaunch = Math.hypot(
                  a.x - (a.pounceStartX ?? a.x),
                  a.z - (a.pounceStartZ ?? a.z)
                );
                const maxLungeReach = 1.95;
                const gapToPrey = bestPreyDist - standoffDist * 0.82;

                if (timer > 0.24 && distFromLaunch < maxLungeReach && gapToPrey > 0.05) {
                  const remLunge = Math.max(0, maxLungeReach - distFromLaunch);
                  const maxStepSpd = Math.min(Math.max(0.8, gapToPrey), remLunge) / Math.max(safeDt, 0.016);
                  const lungeSpd = Math.min(6.4, maxStepSpd);
                  a.vx = lungeDirX * lungeSpd;
                  a.vz = lungeDirZ * lungeSpd;
                } else {
                  a.vx = 0;
                  a.vz = 0;
                }

                if (bestPreyDist > 0.35) {
                  a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 4.2, safeDt);
                }
                a.hopPhase += safeDt * 13.0;

                if (
                  preyIsPlayer &&
                  playerStateRef &&
                  prevActionTimer > 0.38 &&
                  timer <= 0.38 &&
                  bestPreyDist <= standoffDist + 0.95
                ) {
                  playerStateRef.stamina = Math.max(0, (playerStateRef.stamina ?? 100) - 15);
                  playerStateRef.vx += lungeDirX * 3.2;
                  playerStateRef.vz += lungeDirZ * 3.2;
                }

                if (timer <= 0.02) {
                  a.actionTimer = 0;
                  if (bestPreyDist <= attackTriggerDist) {
                    a.aiBehavior = 'attacking';
                  } else {
                    a.aiBehavior = 'charging';
                    const maxChargeNoOvershoot =
                      Math.max(0, bestPreyDist - standoffDist) / Math.max(safeDt, 0.016);
                    const effChargeSpd = Math.min(chargeSpd, maxChargeNoOvershoot);
                    a.vx = (toPreyX / len) * effChargeSpd;
                    a.vz = (toPreyZ / len) * effChargeSpd;
                  }
                }
              } else {
                // BEAR & CAT-LION STATIONARY ATTACK:
                // Committed 100% to completing the full attack animation in place (vx = 0, vz = 0).
                // Cannot move until actionTimer finishes and aiBehavior switches to a movement animation!
                if (a.aiBehavior !== 'attacking' || (a.actionTimer ?? 0) <= 0) {
                  a.aiBehavior = 'attacking';
                  a.actionTimer = a.species === 'lion' ? 0.96 : 0.78;
                }
                a.pounceHeight = 0;
                a.vx = 0;
                a.vz = 0;
                if (bestPreyDist > 0.35) {
                  a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 3.6, safeDt);
                }

                if (
                  preyIsPlayer &&
                  playerStateRef &&
                  prevActionTimer > 0.40 &&
                  (a.actionTimer ?? 0) <= 0.40 &&
                  bestPreyDist <= standoffDist + 0.85
                ) {
                  playerStateRef.stamina = Math.max(0, (playerStateRef.stamina ?? 100) - 14);
                  playerStateRef.vx += (toPreyX / len) * 2.8;
                  playerStateRef.vz += (toPreyZ / len) * 2.8;
                }

                if ((a.actionTimer ?? 0) <= 0.02) {
                  a.actionTimer = 0;
                  if (bestPreyDist > attackTriggerDist) {
                    a.aiBehavior = 'charging';
                    const maxChargeNoOvershoot =
                      Math.max(0, bestPreyDist - standoffDist) / Math.max(safeDt, 0.016);
                    const effChargeSpd = Math.min(chargeSpd, maxChargeNoOvershoot);
                    a.vx = (toPreyX / len) * effChargeSpd;
                    a.vz = (toPreyZ / len) * effChargeSpd;
                    a.hopPhase += safeDt * 15.0;
                  }
                }
              }
            } else if (isCommittedStationaryWarning) {
              // Complete full 'roaring' or 'stomping' animation in place (vx = 0, vz = 0) before moving!
              a.pounceHeight = 0;
              a.vx = 0;
              a.vz = 0;
              if ((a.actionTimer ?? 0) <= 0.12 && a.aiBehavior === 'stomping') {
                a.stompWarningDone = true;
              }
              a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 5.2, safeDt);
            } else if (a.species === 'bear' && !provokedByShot) {
              // BEAR 2-STAGE THREAT PROGRESSION (strictly zero ground sliding during roar & stomp, and never loops roar infinitely!):
              a.pounceHeight = 0;
              if (bestPreyDist > 13.5 && !a.roarWarningDone) {
                a.aiBehavior = 'roaring';
                a.roarWarningDone = true;
                a.actionTimer = 0.75;
                a.stompWarningDone = false;
                a.vx = 0;
                a.vz = 0;
                a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 5.0, safeDt);
              } else if (bestPreyDist > 11.5) {
                a.aiBehavior = 'stalking';
                const stalkSpd = 2.6;
                a.vx = (toPreyX / len) * stalkSpd;
                a.vz = (toPreyZ / len) * stalkSpd;
                a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 5.2, safeDt);
                a.hopPhase += safeDt * 7.5;
              } else if (!a.stompWarningDone) {
                a.aiBehavior = 'stomping';
                a.stompWarningDone = true;
                a.actionTimer = 0.85;
                a.vx = 0;
                a.vz = 0;
                a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 5.6, safeDt);
              } else {
                a.aiBehavior = 'charging';
                const maxChargeNoOvershoot =
                  Math.max(0, bestPreyDist - standoffDist) / Math.max(safeDt, 0.016);
                const effChargeSpd = Math.min(chargeSpd, maxChargeNoOvershoot);
                a.vx = (toPreyX / len) * effChargeSpd;
                a.vz = (toPreyZ / len) * effChargeSpd;
                a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 6.2, safeDt);
                a.hopPhase += safeDt * 15.0;
              }
            } else if (bestPreyDist <= 11.5 || provokedByShot || isBossLion) {
              a.pounceHeight = 0;
              a.aiBehavior = 'charging';
              const maxChargeNoOvershoot =
                Math.max(0, bestPreyDist - standoffDist) / Math.max(safeDt, 0.016);
              const effChargeSpd = Math.min(chargeSpd, maxChargeNoOvershoot);
              const moveAngle =
                a.species === 'wolf'
                  ? computeWolfPackFlankAngle(a, steeredTarget.x, steeredTarget.z, animals)
                  : targetYaw;
              a.vx = Math.sin(moveAngle) * effChargeSpd;
              a.vz = Math.cos(moveAngle) * effChargeSpd;
              a.yaw = rotateYawSmoothlyToward(a.yaw, moveAngle, 6.2, safeDt);
              a.hopPhase += safeDt * 15.0;
            } else {
              // Outer detection ring -> stealthy stalk / approach (with wolf pack flanking)
              a.pounceHeight = 0;
              a.aiBehavior = 'stalking';
              const stalkSpd = SPECIES_PROFILES[a.species].stalkSpeed;
              const stalkAngle =
                a.species === 'wolf'
                  ? computeWolfPackFlankAngle(a, steeredTarget.x, steeredTarget.z, animals)
                  : targetYaw;
              a.vx = Math.sin(stalkAngle) * stalkSpd;
              a.vz = Math.cos(stalkAngle) * stalkSpd;
              a.yaw = rotateYawSmoothlyToward(a.yaw, stalkAngle, 5.0, safeDt);
              a.hopPhase += safeDt * 7.5;
            }
          }
        } else {
          // Autonomous predator patrol, baited trap investigation (when player/prey not detected),
          // sitting, foraging/eating, or returning to river home
          a.alertLevel = 'grazing';
          a.stompWarningDone = false;
          a.roarWarningDone = false;
          a.pounceHeight = 0;
          a.rhinoPhase = 'charging';
          a.rhinoChargeSpeed = 0;

          // If no player or live prey is detected, check if this predator notices a placed trap in range
          // and randomly decides whether to investigate the meat bait ('approach') or ignore it ('ignore')
          let luredByPredatorTrap: { x: number; z: number; dist: number } | null = null;
          const placedPredTraps = getActivePlacedTrapsRef();
          if (placedPredTraps.length > 0 && (a.trappedByBearJawTimer ?? 0) <= 0) {
            for (let tIdx = 0; tIdx < placedPredTraps.length; tIdx++) {
              const tr = placedPredTraps[tIdx];
              if (tr.status !== 'armed') continue;
              const recipe = TRAP_RECIPES.find((r) => r.kind === tr.kind);
              if (!recipe || !recipe.targetSpecies.includes(a.species)) continue;
              const dTrap = Math.hypot(tr.x - a.x, tr.z - a.z);
              if (dTrap <= recipe.attractRadius) {
                const choice = evaluateAnimalTrapChoice(a, tr, safeDt);
                if (
                  choice === 'approach' &&
                  (!luredByPredatorTrap || dTrap < luredByPredatorTrap.dist)
                ) {
                  luredByPredatorTrap = { x: tr.x, z: tr.z, dist: dTrap };
                }
              }
            }
          }

          // If a crocodile is out of prey range and away from its river water home, return smoothly to the water!
          const distFromHome = Math.hypot(a.homeX - a.x, a.homeZ - a.z);
          const isVolcanoSanctumLion =
            a.species === 'lion' &&
            Math.hypot(a.homeX - VOLCANO_SANCTUM_POS.x, a.homeZ - VOLCANO_SANCTUM_POS.z) < 10.0;
          if (luredByPredatorTrap && !isVolcanoSanctumLion) {
            a.isResting = false;
            a.aiBehavior = 'stalking';
            const steeredTrap =
              a.species === 'bear'
                ? steerBearThroughCavePortal(
                    a.x,
                    a.z,
                    luredByPredatorTrap.x,
                    luredByPredatorTrap.z,
                    a.caveIndex
                  )
                : { x: luredByPredatorTrap.x, z: luredByPredatorTrap.z };
            const toTrapX = steeredTrap.x - a.x;
            const toTrapZ = steeredTrap.z - a.z;
            const dTrapSteer = Math.hypot(toTrapX, toTrapZ) || 1;
            const stalkSpd = SPECIES_PROFILES[a.species].stalkSpeed;
            a.vx = (toTrapX / dTrapSteer) * stalkSpd;
            a.vz = (toTrapZ / dTrapSteer) * stalkSpd;
            a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 5.0, safeDt);
            a.hopPhase += safeDt * 7.5;
          } else if (isVolcanoSanctumLion) {
            if (distFromHome > 2.2) {
              a.isResting = false;
              a.aiBehavior = 'wandering';
              const steeredHome = steerLionThroughVolcanoPortal(a.x, a.z, a.homeX, a.homeZ);
              const toHomeX = steeredHome.x - a.x;
              const toHomeZ = steeredHome.z - a.z;
              const dHome = Math.hypot(toHomeX, toHomeZ) || 1;
              a.vx = (toHomeX / dHome) * 2.6;
              a.vz = (toHomeZ / dHome) * 2.6;
              a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 5.0, safeDt);
              a.hopPhase += safeDt * 7.5;
            } else {
              // Seated majestically on the Volcano Sanctum Throne Dais facing the entrance (+X)!
              a.isResting = false;
              a.aiBehavior = 'sitting';
              a.vx = 0;
              a.vz = 0;
              a.yaw = rotateYawSmoothlyToward(a.yaw, Math.PI / 2, 4.0, safeDt);
            }
          } else if (distFromHome > (a.species === 'crocodile' ? 4.5 : 14.0)) {
            a.isResting = false;
            a.aiBehavior = 'wandering';
            const steeredHome =
              a.species === 'bear'
                ? steerBearThroughCavePortal(a.x, a.z, a.homeX, a.homeZ, a.caveIndex)
                : { x: a.homeX, z: a.homeZ };
            const toHomeX = steeredHome.x - a.x;
            const toHomeZ = steeredHome.z - a.z;
            const dHome = Math.hypot(toHomeX, toHomeZ) || 1;
            const returnSpd = a.species === 'crocodile' ? 3.2 : 3.4;
            a.vx = (toHomeX / dHome) * returnSpd;
            a.vz = (toHomeZ / dHome) * returnSpd;
            a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 5.5, safeDt);
            a.hopPhase += safeDt * 9.0;
          } else {
            const timeWindow = Math.floor(elapsedTime * 0.06 + a.id * 1.73);
            const seed = hash2D(a.id * 19.3, timeWindow);
            if (seed > 0.78) {
              a.isResting = false;
              a.aiBehavior = 'sitting';
              a.vx = 0;
              a.vz = 0;
            } else if (seed > 0.58) {
              a.isResting = false;
              a.aiBehavior = 'grazing';
              a.vx = 0;
              a.vz = 0;
            } else {
              a.isResting = false;
              let patrolGoalX = a.homeX + Math.cos((seed / 0.58) * Math.PI * 2) * 14.0;
              let patrolGoalZ = a.homeZ + Math.sin((seed / 0.58) * Math.PI * 2) * 14.0;
              if (a.species === 'bear' && a.caveIndex !== undefined && BEAR_MOUNTAIN_CAVES[a.caveIndex]) {
                // Bears alternate their patrol between the outer forest apron (lz = +14) and inner cavern (lz = -13)
                // and steer cleanly through the cave portal so they freely walk in and out of the cave!
                const patrolOut = seed < 0.34;
                const rawGoal = patrolOut
                  ? caveLocalToWorld(a.caveIndex, ((a.id % 3) - 1) * 4.5, 14.0)
                  : caveLocalToWorld(a.caveIndex, ((a.id % 2) === 0 ? -4.2 : 4.2), -13.0);
                const rawDistToGoal = Math.hypot(rawGoal.x - a.x, rawGoal.z - a.z);
                if (rawDistToGoal < 1.85) {
                  patrolGoalX = a.x;
                  patrolGoalZ = a.z;
                } else {
                  const steered = steerBearThroughCavePortal(a.x, a.z, rawGoal.x, rawGoal.z, a.caveIndex);
                  patrolGoalX = steered.x;
                  patrolGoalZ = steered.z;
                }
              }
              const toGoalX = patrolGoalX - a.x;
              const toGoalZ = patrolGoalZ - a.z;
              const distGoal = Math.hypot(toGoalX, toGoalZ);
              if (distGoal < 1.65) {
                // Reached patrol destination: settle calmly into foraging/idle instead of oscillating over goal!
                a.aiBehavior = 'grazing';
                a.vx = 0;
                a.vz = 0;
              } else {
                a.aiBehavior = 'wandering';
                const patrolSpd = a.species === 'crocodile' ? 1.15 : 1.75;
                const desiredVx = (toGoalX / distGoal) * patrolSpd;
                const desiredVz = (toGoalZ / distGoal) * patrolSpd;
                const blend = Math.min(1, safeDt * 4.5);
                a.vx += (desiredVx - a.vx) * blend;
                a.vz += (desiredVz - a.vz) * blend;
                a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 4.2, safeDt);
                a.hopPhase += safeDt * 6.0;
              }
            }
          }
        }
      }

      // Apply 10% speed reduction for 7 seconds after a Bear Trap (`trap_bear_jaw`) finishes its roar on a Bear
      if (a.species === 'bear' && (a.bearTrapSlowTimer ?? 0) > 0) {
        a.vx *= 0.90;
        a.vz *= 0.90;
      }

      if (Math.abs(a.vx) > 1e-4 || Math.abs(a.vz) > 1e-4 || a.inWater || a.y <= WATER_LEVEL + 0.15) {
        const rawNextX = a.x + a.vx * safeDt;
        const rawNextZ = a.z + a.vz * safeDt;
        const bodyRadius =
          a.species === 'lion' && a.isBoss ? 1.65 : SPECIES_PROFILES[a.species].predatorBodyRadius;
        const resolved = resolveAnimalObstacleCollision(rawNextX, rawNextZ, bodyRadius);
        advanceAnimalWithWaterShoreRecovery(a, resolved.x, resolved.z, resolved.hitObstacle, safeDt);
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 2B. ROYAL FLOATING-ISLAND STAG AI:
    //     - Neutral by default: never flees from the player and never attacks unprovoked.
    //     - When shot or slashed by the player (wokenUpTimer > 0 && hp < maxHp), it charges
    //       and retaliates with powerful antler-gore attack animations!
    // -------------------------------------------------------------------------
    if (a.species === 'stag') {
      const stagDistFromHome = Math.hypot(a.x - a.homeX, a.z - a.homeZ);
      const playerDistFromStagHome = Math.hypot(playerX - a.homeX, playerZ - a.homeZ);
      if (!a.isLeashedReturning) {
        if (playerDistFromStagHome > 42.0 && stagDistFromHome > 38.0 && distP > 48.0) {
          a.isLeashedReturning = true;
          a.wokenUpTimer = Math.max(a.wokenUpTimer ?? 0, 45.0);
          a.alertLevel = 'grazing';
        }
      } else if (playerDistFromStagHome <= 38.0 || distP <= 38.0) {
        a.isLeashedReturning = false;
      }
      const isStagLeashedOut = Boolean(a.isLeashedReturning);
      const isProvokedStag =
        !a.isTamed &&
        !isStagLeashedOut &&
        (a.wokenUpTimer ?? 0) > 0 &&
        (a.hp ?? a.maxHp ?? 9) < (a.maxHp ?? 9);

      if (isProvokedStag) {
        a.isResting = false;
        a.isSeekingShelter = false;
        a.isFleeing = false;
        a.fleeCooldown = 0;
        a.alertLevel = 'curious';

        const toPlayerX = playerX - a.x;
        const toPlayerZ = playerZ - a.z;
        const dPlayer = Math.hypot(toPlayerX, toPlayerZ) || 1;
        const targetYaw = Math.atan2(toPlayerX, toPlayerZ);
        const standoffDist = SPECIES_PROFILES.stag.meleeStandoff;
        const attackTriggerDist = standoffDist + SPECIES_PROFILES.stag.attackReachBonus;
        const isCommittedAttack = a.aiBehavior === 'attacking' && (a.actionTimer ?? 0) > 0.02;

        if (isCommittedAttack || dPlayer <= attackTriggerDist) {
          if (a.aiBehavior !== 'attacking' || (a.actionTimer ?? 0) <= 0) {
            a.aiBehavior = 'attacking';
            a.actionTimer = 0.88;
          }
          a.vx = 0;
          a.vz = 0;
          if (dPlayer > 0.35) {
            a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 5.2, safeDt);
          }

          if (
            playerStateRef &&
            prevActionTimer > 0.44 &&
            (a.actionTimer ?? 0) <= 0.44 &&
            dPlayer <= attackTriggerDist + 0.65
          ) {
            playerStateRef.stamina = Math.max(0, (playerStateRef.stamina ?? 100) - 22);
            playerStateRef.vx += (toPlayerX / dPlayer) * 4.2;
            playerStateRef.vz += (toPlayerZ / dPlayer) * 4.2;
          }

          if ((a.actionTimer ?? 0) <= 0.02 && dPlayer > attackTriggerDist) {
            a.aiBehavior = 'charging';
            a.actionTimer = 0;
          }
        } else {
          a.aiBehavior = 'charging';
          const chargeSpd = SPECIES_PROFILES.stag.chargeSpeed;
          const maxChargeNoOvershoot =
            Math.max(0, dPlayer - standoffDist) / Math.max(safeDt, 0.016);
          const effChargeSpd = Math.min(chargeSpd, maxChargeNoOvershoot);
          a.vx = (toPlayerX / dPlayer) * effChargeSpd;
          a.vz = (toPlayerZ / dPlayer) * effChargeSpd;
          a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 6.5, safeDt);
          a.hopPhase += safeDt * 15.0;
        }

        const rawNextX = a.x + a.vx * safeDt;
        const rawNextZ = a.z + a.vz * safeDt;
        const bodyRadius = SPECIES_PROFILES.stag.preyBodyRadius;
        const resolved = resolveAnimalObstacleCollision(rawNextX, rawNextZ, bodyRadius);
        advanceAnimalWithWaterShoreRecovery(a, resolved.x, resolved.z, resolved.hitObstacle, safeDt);
        continue;
      }

      // Unprovoked Stag: 100% neutral on the Floating Sky Islands (never flees, never attacks)
      a.alertLevel = 'grazing';
      a.isFleeing = false;
      a.fleeCooldown = 0;
      a.listenTimer = 0;
      a.isSeekingShelter = false;
      a.isResting = false;
      const timeWindow = Math.floor(elapsedTime * 0.28 + a.id * 1.37);
      const wanderSeed = hash2D(a.id * 13.7, timeWindow);
      const pauseThreshold = SPECIES_PROFILES.stag.grazePauseThreshold;
      if (stagDistFromHome > 10.0) {
        a.aiBehavior = 'wandering';
        const returnSpd = 2.8;
        a.vx = ((a.homeX - a.x) / stagDistFromHome) * returnSpd;
        a.vz = ((a.homeZ - a.z) / stagDistFromHome) * returnSpd;
        a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 5.0, safeDt);
        a.hopPhase += safeDt * SPECIES_PROFILES.stag.grazeHopRate;
      } else if (wanderSeed > pauseThreshold) {
        a.aiBehavior = 'grazing';
        a.vx = 0;
        a.vz = 0;
      } else {
        a.aiBehavior = 'wandering';
        const targetAngle = (wanderSeed / pauseThreshold) * Math.PI * 2;
        const homePullX = (a.homeX - a.x) * 0.18;
        const homePullZ = (a.homeZ - a.z) * 0.18;
        const grazeSpeed = SPECIES_PROFILES.stag.grazeSpeed;
        const desiredVx = Math.cos(targetAngle) * grazeSpeed + homePullX;
        const desiredVz = Math.sin(targetAngle) * grazeSpeed + homePullZ;
        const blend = Math.min(1, safeDt * 4.5);
        a.vx += (desiredVx - a.vx) * blend;
        a.vz += (desiredVz - a.vz) * blend;
        a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 5.0, safeDt);
        a.hopPhase += safeDt * SPECIES_PROFILES.stag.grazeHopRate;
      }
      const rawNextX = a.x + a.vx * safeDt;
      const rawNextZ = a.z + a.vz * safeDt;
      const bodyRadius = SPECIES_PROFILES.stag.preyBodyRadius;
      const resolved = resolveAnimalObstacleCollision(rawNextX, rawNextZ, bodyRadius);
      advanceAnimalWithWaterShoreRecovery(a, resolved.x, resolved.z, resolved.hitObstacle, safeDt);
      continue;
    }

    // -------------------------------------------------------------------------
    // 2C. SEMI-AQUATIC OASIS & RIVER HIPPO AI ('hippo'):
    //     - Wallows in the Southwest Oasis Lagoon and Southern River Wetland shallows,
    //       and grazes reeds along the muddy banks.
    //     - When the player approaches within 13.5m, performs a wide tusk-yawn warning ('roaring').
    //     - When provoked or approached within 8.5m, charges and delivers a crushing jaw lunge ('attacking')!
    // -------------------------------------------------------------------------
    if (a.species === 'hippo') {
      const localWaterY =
        Math.hypot(a.x - SOUTHWEST_OASIS_POS.x, a.z - SOUTHWEST_OASIS_POS.z) <= 13.5
          ? SOUTHWEST_OASIS_POS.lagoonWaterY
          : WATER_LEVEL;
      const toPlayerX = playerX - a.x;
      const toPlayerZ = playerZ - a.z;
      const dPlayer = Math.hypot(toPlayerX, toPlayerZ) || 1;
      const hippoDistFromHome = Math.hypot(a.x - a.homeX, a.z - a.homeZ);
      const playerDistFromHome = Math.hypot(playerX - a.homeX, playerZ - a.homeZ);
      const hippoTerritoryRadius = 65.0;
      const hippoDisengageDist = 42.0;

      // Territory Leash & Provoked Pursuit Rule:
      // 1) When attacked from ANY distance ((a.wokenUpTimer ?? 0) > 0), the hippo immediately aggros
      //    and chases the player relentlessly until the player has BOTH exited the hippo's territory
      //    (playerDistFromHome > hippoTerritoryRadius) AND moved far away from the hippo (dPlayer > hippoDisengageDist).
      // 2) Once the player is outside BOTH the territory AND the proximity range, the hippo disengages
      //    (isLeashedReturning = true) and runs back to its home territory (a.homeX, a.homeZ).
      if (a.isLeashedReturning) {
        if (hippoDistFromHome <= 6.5) {
          a.isLeashedReturning = false;
        }
      } else if ((a.wokenUpTimer ?? 0) > 0) {
        if (playerDistFromHome > hippoTerritoryRadius && dPlayer > hippoDisengageDist) {
          a.wokenUpTimer = 0;
          a.actionTimer = 0;
          a.aiBehavior = 'wandering';
          a.alertLevel = 'grazing';
          a.isLeashedReturning = true;
        } else {
          // Keep grudge active while actively pursuing the player
          a.wokenUpTimer = Math.max(a.wokenUpTimer ?? 0, 18.0);
        }
      } else if (hippoDistFromHome > hippoTerritoryRadius && dPlayer > hippoDisengageDist) {
        a.actionTimer = 0;
        a.aiBehavior = 'wandering';
        a.alertLevel = 'grazing';
        a.isLeashedReturning = true;
      }

      const isProvokedHippo = !a.isLeashedReturning && (a.wokenUpTimer ?? 0) > 0;
      const warnRadius = isPlayerSneaking ? 8.5 : 15.0;
      const chargeRadius = isPlayerSneaking ? 5.5 : 10.5;
      const standoffDist = SPECIES_PROFILES.hippo.meleeStandoff;
      const attackTriggerDist = standoffDist + SPECIES_PROFILES.hippo.attackReachBonus;
      const targetYaw = Math.atan2(toPlayerX, toPlayerZ);
      const isCommittedAttack =
        !a.isLeashedReturning &&
        a.aiBehavior === 'attacking' &&
        (a.actionTimer ?? 0) > 0.02 &&
        (isProvokedHippo || dPlayer <= hippoDisengageDist);
      const isCommittedYawn =
        !a.isLeashedReturning &&
        a.aiBehavior === 'roaring' &&
        (a.actionTimer ?? 0) > 0.02 &&
        dPlayer <= warnRadius + 4.0;

      if (!a.isLeashedReturning && (isCommittedAttack || isProvokedHippo || dPlayer <= chargeRadius)) {
        a.isResting = false;
        a.isSeekingShelter = false;
        a.isFleeing = false;
        a.alertLevel = 'curious';
        a.wokenUpTimer = Math.max(a.wokenUpTimer ?? 0, 18.0);
        if (isCommittedAttack || dPlayer <= attackTriggerDist) {
          if (a.aiBehavior !== 'attacking' || (a.actionTimer ?? 0) <= 0) {
            a.aiBehavior = 'attacking';
            a.actionTimer = 1.25;
          }
          // Hippo keeps running/charging forward while executing its leg-moving attack whenever the player backs away,
          // while strictly maintaining a 2.65m body gap so the player camera never enters inside the Hippo's 3D body!
          const chargeSpd = SPECIES_PROFILES.hippo.chargeSpeed;
          const minBodyGap = standoffDist;
          const maxStepNoOverlap = Math.max(0, dPlayer - minBodyGap) / Math.max(safeDt, 0.016);
          const attackMoveSpd = dPlayer > minBodyGap ? Math.min(chargeSpd, maxStepNoOverlap) : 0;
          if (dPlayer > 0.35) {
            a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 5.8, safeDt);
          }
          a.vx = (toPlayerX / dPlayer) * attackMoveSpd;
          a.vz = (toPlayerZ / dPlayer) * attackMoveSpd;
          a.hopPhase += safeDt * 14.5;
          if (
            playerStateRef &&
            prevActionTimer > 0.62 &&
            (a.actionTimer ?? 0) <= 0.62 &&
            dPlayer <= attackTriggerDist + 1.25
          ) {
            playerStateRef.stamina = Math.max(0, (playerStateRef.stamina ?? 100) - 24);
            playerStateRef.vx += (toPlayerX / dPlayer) * 4.4;
            playerStateRef.vz += (toPlayerZ / dPlayer) * 4.4;
          }
          if ((a.actionTimer ?? 0) <= 0.02 && dPlayer > attackTriggerDist) {
            a.aiBehavior = 'charging';
            a.actionTimer = 0;
          }
        } else {
          a.aiBehavior = 'charging';
          const chargeSpd = SPECIES_PROFILES.hippo.chargeSpeed;
          const maxChargeNoOvershoot =
            Math.max(0, dPlayer - standoffDist) / Math.max(safeDt, 0.016);
          const effChargeSpd = Math.min(chargeSpd, maxChargeNoOvershoot);
          a.vx = (toPlayerX / dPlayer) * effChargeSpd;
          a.vz = (toPlayerZ / dPlayer) * effChargeSpd;
          a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 5.8, safeDt);
          a.hopPhase += safeDt * 13.0;
        }
      } else if (!a.isLeashedReturning && (isCommittedYawn || dPlayer <= warnRadius)) {
        // Territorial tusk-yawn warning display in place!
        a.isResting = false;
        a.alertLevel = 'curious';
        if (a.aiBehavior !== 'roaring' || (a.actionTimer ?? 0) <= 0) {
          a.aiBehavior = 'roaring';
          a.actionTimer = 1.15;
        }
        a.vx = 0;
        a.vz = 0;
        a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 4.2, safeDt);
      } else if (a.isLeashedReturning || hippoDistFromHome > 6.5) {
        // Run back to lagoon/marsh home territory when leashed, or stroll back when idle outside home core
        a.alertLevel = 'grazing';
        a.isResting = false;
        a.aiBehavior = a.isLeashedReturning ? 'charging' : 'wandering';
        const returnSpd = a.isLeashedReturning ? 6.2 : 2.6;
        a.vx = ((a.homeX - a.x) / (hippoDistFromHome || 1)) * returnSpd;
        a.vz = ((a.homeZ - a.z) / (hippoDistFromHome || 1)) * returnSpd;
        a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 5.2, safeDt);
        a.hopPhase += safeDt * (a.isLeashedReturning ? 12.5 : 7.5);
      } else {
        // Peaceful amphibious lagoon/river wallowing, sleeping ('lie'), and reed grazing
        a.alertLevel = 'grazing';
        const timeWindow = Math.floor(elapsedTime * 0.004 + a.id * 1.43);
        const seed = hash2D(a.id * 17.1, timeWindow);
        if (isNightRest || seed > 0.62) {
          a.isResting = true;
          a.aiBehavior = 'sleeping';
          a.vx = 0;
          a.vz = 0;
        } else if (seed > 0.36) {
          a.isResting = false;
          a.aiBehavior = 'grazing';
          a.vx = 0;
          a.vz = 0;
        } else {
          a.isResting = false;
          a.aiBehavior = 'wandering';
          const targetAng = (seed / 0.36) * Math.PI * 2;
          const goalX = a.homeX + Math.cos(targetAng) * 6.5;
          const goalZ = a.homeZ + Math.sin(targetAng) * 6.5;
          const toGoalX = goalX - a.x;
          const toGoalZ = goalZ - a.z;
          const dGoal = Math.hypot(toGoalX, toGoalZ);
          if (dGoal < 1.1) {
            a.aiBehavior = 'grazing';
            a.vx = 0;
            a.vz = 0;
          } else {
            const spd = SPECIES_PROFILES.hippo.grazeSpeed;
            const desiredVx = (toGoalX / dGoal) * spd;
            const desiredVz = (toGoalZ / dGoal) * spd;
            const blend = Math.min(1, safeDt * 4.0);
            a.vx += (desiredVx - a.vx) * blend;
            a.vz += (desiredVz - a.vz) * blend;
            a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 3.8, safeDt);
            a.hopPhase += safeDt * SPECIES_PROFILES.hippo.grazeHopRate;
          }
        }
      }

      const rawNextX = a.x + a.vx * safeDt;
      const rawNextZ = a.z + a.vz * safeDt;
      const resolved = resolveAnimalObstacleCollision(
        rawNextX,
        rawNextZ,
        SPECIES_PROFILES.hippo.preyBodyRadius
      );
      a.x = resolved.x;
      a.z = resolved.z;

      // Hard physical body separation between Hippo and Player so the player/camera can NEVER enter inside the Hippo's 3D body!
      if (playerStateRef) {
        const sepDx = playerStateRef.x - a.x;
        const sepDz = playerStateRef.z - a.z;
        const sepDist = Math.hypot(sepDx, sepDz);
        const minPlayerGap = 2.55;
        if (sepDist < minPlayerGap) {
          const nx = sepDist > 0.001 ? sepDx / sepDist : Math.sin(a.yaw);
          const nz = sepDist > 0.001 ? sepDz / sepDist : Math.cos(a.yaw);
          const overlap = minPlayerGap - sepDist;
          a.x -= nx * overlap * 0.45;
          a.z -= nz * overlap * 0.45;
          playerStateRef.x += nx * overlap * 0.55;
          playerStateRef.z += nz * overlap * 0.55;
        }
      }

      const nextGroundY = walkableHeightAt(a.x, a.z, a.y).height;
      if (nextGroundY <= localWaterY + 0.15) {
        a.inWater = true;
        const depth = Math.max(0, localWaterY - nextGroundY);
        const submerge = Math.min(depth, getAnimalWaterSubmergenceDepth('hippo'));
        a.y = Math.max(nextGroundY, localWaterY - submerge);
      } else {
        a.inWater = false;
        a.y = nextGroundY;
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 2D. AQUATIC KOI FISH AI ('koifish'):
    //     - Swims underwater in schools in the Western Lagoon Lake, Central Lake,
    //       Waterfall Plunge Pool, and Southwest Oasis Lagoon.
    //     - Sleeps underwater at night (`localWaterY - 0.65`) and darts away when startled.
    // -------------------------------------------------------------------------
    if (a.species === 'koifish') {
      const localWaterY =
        Math.hypot(a.homeX - SOUTHWEST_OASIS_POS.x, a.homeZ - SOUTHWEST_OASIS_POS.z) <= 13.5
          ? SOUTHWEST_OASIS_POS.lagoonWaterY
          : WATER_LEVEL;
      a.inWater = true;
      a.isSeekingShelter = false;
      a.pounceHeight = 0;

      const startleDist = isPlayerSneaking ? 2.5 : 7.5;
      if (distP < startleDist && (playerSpeed > 0.25 || isAttacking)) {
        if (a.alertLevel !== 'fleeing') {
          scamperedCritterCount++;
        }
        a.isResting = false;
        a.wokenUpTimer = 8.0;
        a.alertLevel = 'fleeing';
        a.aiBehavior = 'fleeing';
        a.isFleeing = true;
        a.fleeCooldown = 2.6;
      } else if (a.fleeCooldown > 0) {
        a.fleeCooldown = Math.max(0, a.fleeCooldown - safeDt);
        if (a.fleeCooldown <= 0) {
          a.isFleeing = false;
          a.alertLevel = 'grazing';
        }
      }

      // Nighttime underwater sleeping for lake fish:
      if (isNightRest && a.alertLevel !== 'fleeing' && (a.wokenUpTimer ?? 0) <= 0) {
        a.isResting = true;
        a.aiBehavior = 'sleeping';
        a.vx = 0;
        a.vz = 0;
        const sleepTargetY = Math.max(groundHeightAt(a.x, a.z) + 0.16, localWaterY - 0.65);
        a.y += (sleepTargetY - (a.y ?? sleepTargetY)) * Math.min(1, safeDt * 3.0);
        continue;
      }
      a.isResting = false;

      // Check if an armed Woven Fish Trap ('trap_fish') is in range in the same pond/lagoon
      let chosenFishTrap: { x: number; z: number; dist: number } | null = null;
      const placedTraps = getActivePlacedTrapsRef();
      if (placedTraps.length > 0 && a.alertLevel !== 'fleeing' && distP >= startleDist) {
        for (let tIdx = 0; tIdx < placedTraps.length; tIdx++) {
          const tr = placedTraps[tIdx];
          if (tr.status !== 'armed' || tr.kind !== 'trap_fish') continue;
          const dTrap = Math.hypot(tr.x - a.x, tr.z - a.z);
          if (dTrap <= 30.0) {
            const choice = evaluateAnimalTrapChoice(a, tr, safeDt);
            if (choice === 'approach' && (!chosenFishTrap || dTrap < chosenFishTrap.dist)) {
              chosenFishTrap = { x: tr.x, z: tr.z, dist: dTrap };
            }
          }
        }
      }

      // 1. Boids Schooling (Separation, Alignment, Cohesion) with fellow Koi in the same pond
      let sepX = 0;
      let sepZ = 0;
      let alignSin = 0;
      let alignCos = 0;
      let cohX = 0;
      let cohZ = 0;
      let neighborCount = 0;
      for (let j = 0; j < animals.length; j++) {
        if (j === i) continue;
        const other = animals[j];
        if (other.species !== 'koifish' || other.isDead) continue;
        const dx = a.x - other.x;
        const dz = a.z - other.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < 9.5) {
          if (d < 1.45) {
            const repulse = (1.45 - d) / 1.45;
            sepX += (dx / d) * repulse * 2.1;
            sepZ += (dz / d) * repulse * 2.1;
          }
          alignSin += Math.sin(other.yaw);
          alignCos += Math.cos(other.yaw);
          cohX += other.x;
          cohZ += other.z;
          neighborCount++;
        }
      }

      let desiredDirX = Math.sin(a.yaw);
      let desiredDirZ = Math.cos(a.yaw);
      let targetSwimSpd = SPECIES_PROFILES.koifish.grazeSpeed;
      let maxTurnRate = 3.6;

      if (a.alertLevel === 'fleeing') {
        a.aiBehavior = 'fleeing';
        const awayX = a.x - playerX;
        const awayZ = a.z - playerZ;
        const awayLen = Math.hypot(awayX, awayZ) || 1;
        const homePullX = (a.homeX - a.x) * 0.22;
        const homePullZ = (a.homeZ - a.z) * 0.22;
        desiredDirX = awayX / awayLen + homePullX + sepX * 0.6;
        desiredDirZ = awayZ / awayLen + homePullZ + sepZ * 0.6;
        targetSwimSpd = SPECIES_PROFILES.koifish.preyFleeSpeed;
        maxTurnRate = 7.5;
      } else if (chosenFishTrap) {
        a.alertLevel = 'curious';
        a.aiBehavior = 'wandering';
        desiredDirX = chosenFishTrap.x - a.x + sepX * 0.35;
        desiredDirZ = chosenFishTrap.z - a.z + sepZ * 0.35;
        targetSwimSpd = 1.65;
        maxTurnRate = 4.8;
      } else {
        a.alertLevel = 'grazing';
        // Determine whether this fish belongs to the large Western Lagoon Lake (-138, 42) near the starting cabin,
        // the Central Lake (-2, 1.5), or a smaller pond/lagoon, so lake fish roam across the ENTIRE lake!
        const inWestLagoonLake = Math.hypot(a.homeX - -138.0, a.homeZ - 42.0) <= 28.0;
        const inCentralLake = Math.hypot(a.homeX - -2.0, a.homeZ - 1.5) <= 22.0;
        const basinCenterX = inWestLagoonLake ? -138.0 : inCentralLake ? -2.0 : a.homeX;
        const basinCenterZ = inWestLagoonLake ? 42.0 : inCentralLake ? 1.5 : a.homeZ;
        const patrolRadX = inWestLagoonLake ? 16.5 : inCentralLake ? 12.5 : 4.2;
        const patrolRadZ = inWestLagoonLake ? 14.0 : inCentralLake ? 11.5 : 3.8;
        const maxBasinRadius = inWestLagoonLake ? 21.0 : inCentralLake ? 15.5 : 4.8;

        // Smooth figure-8 / wandering school current across the entire lake basin
        const schoolPhase = elapsedTime * 0.24 + a.id * 1.15;
        const patrolTargetX =
          basinCenterX +
          Math.cos(schoolPhase) * patrolRadX * (0.65 + 0.35 * Math.sin(schoolPhase * 0.43 + a.id));
        const patrolTargetZ =
          basinCenterZ +
          Math.sin(schoolPhase * 0.78) * patrolRadZ * (0.65 + 0.35 * Math.cos(schoolPhase * 0.37 + a.id));
        let steerX = (patrolTargetX - a.x) * 0.45 + sepX * 1.35;
        let steerZ = (patrolTargetZ - a.z) * 0.45 + sepZ * 1.35;

        if (neighborCount > 0) {
          const avgCohX = cohX / neighborCount - a.x;
          const avgCohZ = cohZ / neighborCount - a.z;
          steerX += (alignSin / neighborCount) * 0.85 + avgCohX * 0.22;
          steerZ += (alignCos / neighborCount) * 0.85 + avgCohZ * 0.22;
        }

        // Keep fish gently within their lake/pond basin radius without hard perimeter clamping
        const distBasinNow = Math.hypot(a.x - basinCenterX, a.z - basinCenterZ);
        if (distBasinNow > maxBasinRadius) {
          const pullStrength = (distBasinNow - maxBasinRadius) * 0.65;
          steerX += ((basinCenterX - a.x) / distBasinNow) * pullStrength;
          steerZ += ((basinCenterZ - a.z) / distBasinNow) * pullStrength;
        }

        desiredDirX = steerX;
        desiredDirZ = steerZ;

        // Burst-and-coast fish swimming rhythm (energetic tail kick followed by calm glide)
        const glideCycle = (elapsedTime * 0.85 + a.id * 2.17) % 6.0;
        if (glideCycle < 1.35) {
          // Tail-kick burst
          const burstPulse = Math.sin((glideCycle / 1.35) * Math.PI);
          targetSwimSpd = SPECIES_PROFILES.koifish.grazeSpeed * (1.15 + burstPulse * 0.55);
          a.aiBehavior = 'wandering';
        } else if (glideCycle > 4.6 && glideCycle < 5.5) {
          // Gentle surface nibble
          targetSwimSpd = SPECIES_PROFILES.koifish.grazeSpeed * 0.62;
          a.aiBehavior = 'grazing';
        } else {
          // Calm cruise
          targetSwimSpd = SPECIES_PROFILES.koifish.grazeSpeed * 0.92;
          a.aiBehavior = 'wandering';
        }
      }

      let desiredYaw =
        Math.hypot(desiredDirX, desiredDirZ) > 0.001
          ? Math.atan2(desiredDirX, desiredDirZ)
          : a.yaw;

      // 2. Shoreline & Shallow-Water Avoidance Feelers (keep fish inside deep water channel)
      const feelerDist = 1.65;
      const minSafeDepth = 0.22;
      const aheadX = a.x + Math.sin(desiredYaw) * feelerDist;
      const aheadZ = a.z + Math.cos(desiredYaw) * feelerDist;
      const aheadDepth = localWaterY - walkableHeightAt(aheadX, aheadZ).height;
      if (aheadDepth < minSafeDepth) {
        let bestFeelerYaw = Math.atan2(a.homeX - a.x, a.homeZ - a.z);
        let bestDepth = -999;
        const feelerOffsets = [-0.75, 0.75, -1.45, 1.45, Math.PI];
        for (let f = 0; f < feelerOffsets.length; f++) {
          const testYaw = desiredYaw + feelerOffsets[f];
          const tx = a.x + Math.sin(testYaw) * feelerDist;
          const tz = a.z + Math.cos(testYaw) * feelerDist;
          const dWater = localWaterY - walkableHeightAt(tx, tz).height;
          if (dWater > bestDepth) {
            bestDepth = dWater;
            bestFeelerYaw = testYaw;
          }
        }
        desiredYaw = bestFeelerYaw;
        maxTurnRate = Math.max(maxTurnRate, 6.2);
      }

      // 3. Strictly align velocity with body heading so fish always swim nose-first (never sideways)
      a.yaw = rotateYawSmoothlyToward(a.yaw, desiredYaw, maxTurnRate, safeDt);
      const prevSpeed = Math.hypot(a.vx, a.vz) || targetSwimSpd;
      const smoothSpeed = prevSpeed + (targetSwimSpd - prevSpeed) * Math.min(1, safeDt * 5.0);
      a.vx = Math.sin(a.yaw) * smoothSpeed;
      a.vz = Math.cos(a.yaw) * smoothSpeed;
      a.hopPhase += safeDt * (3.5 + smoothSpeed * 3.8);

      let nextX = a.x + a.vx * safeDt;
      let nextZ = a.z + a.vz * safeDt;
      const nextDepth = localWaterY - walkableHeightAt(nextX, nextZ).height;
      if (nextDepth < 0.14) {
        // Turn smoothly toward home water center if shoreline reached
        const toHomeYaw = Math.atan2(a.homeX - a.x, a.homeZ - a.z);
        a.yaw = rotateYawSmoothlyToward(a.yaw, toHomeYaw, 8.5, safeDt);
        a.vx = Math.sin(a.yaw) * smoothSpeed * 0.65;
        a.vz = Math.cos(a.yaw) * smoothSpeed * 0.65;
        nextX = a.x + a.vx * safeDt;
        nextZ = a.z + a.vz * safeDt;
      }

      a.x = nextX;
      a.z = nextZ;
      const nibbleOffset = a.aiBehavior === 'grazing' ? 0.04 : 0;
      const minBedY = groundHeightAt(a.x, a.z) + 0.16;
      a.y = Math.max(
        minBedY,
        localWaterY -
          0.38 +
          nibbleOffset +
          Math.sin(elapsedTime * 2.1 + a.id * 1.3) * 0.025
      );
      continue;
    }

    // -------------------------------------------------------------------------
    // 2E. MARINE OCEAN DOLPHIN POD AI ('dolphin'):
    //     - Swims in pods through the Southeast Harbor Bay, Eastern Ocean Shipping Lane,
    //       and Ruined Atlantis Coastal Waters.
    //     - Accompanies the player/ship when nearby and periodically performs acrobatic
    //       parabolic wave leaps ('pounceHeight > 0') above the ocean swells!
    // -------------------------------------------------------------------------
    if (a.species === 'dolphin') {
      a.inWater = true;
      a.isResting = false;
      a.isSeekingShelter = false;

      const isPlayerNearby = distP < 36.0;
      a.alertLevel = isPlayerNearby ? 'curious' : 'grazing';
      const podRate = isPlayerNearby ? 0.58 : 0.38;
      const orbitAng = elapsedTime * podRate + a.id * 1.05;
      const rx = 18.0 + (a.id % 2) * 5.5;
      const rz = 12.5 + (a.id % 3) * 4.0;
      const targetX = a.homeX + Math.cos(orbitAng) * rx;
      const targetZ = a.homeZ + Math.sin(orbitAng * 0.85) * rz;
      const dx = targetX - a.x;
      const dz = targetZ - a.z;
      const d = Math.hypot(dx, dz) || 1;
      const swimSpd = isPlayerNearby
        ? SPECIES_PROFILES.dolphin.chargeSpeed * 0.78
        : SPECIES_PROFILES.dolphin.grazeSpeed;
      const desiredVx = (dx / d) * swimSpd;
      const desiredVz = (dz / d) * swimSpd;
      const blend = Math.min(1, safeDt * 4.5);
      a.vx += (desiredVx - a.vx) * blend;
      a.vz += (desiredVz - a.vz) * blend;
      a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 5.2, safeDt);
      a.hopPhase += safeDt * SPECIES_PROFILES.dolphin.grazeHopRate;

      // Periodic parabolic ocean wave leap (every ~9.5 seconds, staggered across pod members)
      const leapCycle = (elapsedTime + a.id * 3.17) % 9.5;
      if (leapCycle < 1.15) {
        const leapPhase = leapCycle / 1.15;
        a.pounceHeight = Math.sin(leapPhase * Math.PI) * 1.75;
        a.aiBehavior = 'charging';
      } else {
        a.pounceHeight = 0;
        a.aiBehavior = isPlayerNearby ? 'stalking' : 'wandering';
      }

      const nextX = a.x + a.vx * safeDt;
      const nextZ = a.z + a.vz * safeDt;
      const seabedY = groundHeightAt(nextX, nextZ);
      if (seabedY <= WATER_LEVEL - 0.35) {
        a.x = nextX;
        a.z = nextZ;
      } else {
        // Steer back toward deeper pod home water if approaching shallow beach
        const toHomeX = a.homeX - a.x;
        const toHomeZ = a.homeZ - a.z;
        const dHome = Math.hypot(toHomeX, toHomeZ) || 1;
        a.vx = (toHomeX / dHome) * swimSpd;
        a.vz = (toHomeZ / dHome) * swimSpd;
        a.x += a.vx * safeDt;
        a.z += a.vz * safeDt;
        a.yaw = Math.atan2(a.vx, a.vz);
      }
      const baseDolphinSwimY = a.x > 650 ? WATER_LEVEL - 1.56 : WATER_LEVEL - 0.36;
      a.y = baseDolphinSwimY + Math.sin(elapsedTime * 2.1 + a.id) * 0.06;
      continue;
    }

    // -------------------------------------------------------------------------
    // 3. HERBIVORE & SMALL WILDLIFE AI (DEER, SHEEP, RABBIT, SQUIRREL)
    //    First evaluate player/predator threats so prey ALWAYS react to seeing
    //    the player (e.g., rabbit/squirrel flees), then evaluate range-based
    //    random trap choice when safe!
    // -------------------------------------------------------------------------
    let nearestThreatX = playerX;
    let nearestThreatZ = playerZ;
    let minThreatDist = distP;
    let threatIsPredatorOrCharging = false;

    for (let h = 0; h < horses.length; h++) {
      const hr = horses[h];
      if (hr.speed > 1.5) {
        const dH = Math.hypot(a.x - hr.x, a.z - hr.z);
        if (dH < minThreatDist) {
          minThreatDist = dH;
          nearestThreatX = hr.x;
          nearestThreatZ = hr.z;
          if (hr.speed > 4.0) threatIsPredatorOrCharging = true;
        }
      }
    }

    // Also detect nearby predators (bears, jaguars, crocodiles, wolves)!
    for (let j = 0; j < animals.length; j++) {
      if (i === j) continue;
      const other = animals[j];
      if (other.isDead || !isPredatorSpecies(other.species)) continue;
      const dPred = Math.hypot(a.x - other.x, a.z - other.z);
      if (dPred < minThreatDist) {
        minThreatDist = dPred;
        nearestThreatX = other.x;
        nearestThreatZ = other.z;
        threatIsPredatorOrCharging = true;
      }
    }

    const awakeSensory = getAnimalSensoryProfile(a.species, false);
    const fleeRadius =
      isPlayerSneaking ? 2.5 : a.species === 'deer' ? 8.8 : 10.5;
    const playerNoiseRate = computePlayerNoiseRateAtDistance(
      distP,
      playerSpeed,
      isPlayerSneaking,
      isAttacking,
      false
    );
    const playerAudibleOrVisible =
      playerNoiseRate > 0 ||
      (distP < (isPlayerSneaking ? 6.5 : awakeSensory.visionRange) && playerSpeed > 0.15);

    const immediateDanger =
      (minThreatDist < fleeRadius &&
        (!isPlayerSneaking || playerSpeed > 0.35 || minThreatDist < 1.9 || threatIsPredatorOrCharging)) ||
      (threatIsPredatorOrCharging && minThreatDist < 11.8) ||
      (isAttacking && distP < 12.5);

    if (immediateDanger) {
      if (a.alertLevel !== 'fleeing') {
        scamperedCritterCount++;
      }
      a.alertLevel = 'fleeing';
      a.aiBehavior = 'fleeing';
      a.isFleeing = true;
      a.fleeCooldown = 3.4;
      a.listenTimer = 0;
      a.isResting = false;
      a.isSeekingShelter = false;
      scamperedCritterCount += propagateHerdAlert(a, nearestThreatX, nearestThreatZ, animals);
    } else if (a.fleeCooldown > 0) {
      a.fleeCooldown = Math.max(0, a.fleeCooldown - safeDt);
      if (a.fleeCooldown <= 0) {
        a.isFleeing = false;
        a.alertLevel = 'grazing';
        a.aiBehavior = 'grazing';
      } else {
        a.isFleeing = true;
        a.aiBehavior = 'fleeing';
      }
    } else if (a.species === 'deer') {
      // DEER SPECIFIC AI: Stand upright to listen when hearing noise or seeing movement,
      // then decide based on incoming sensory info whether to flee or return to grazing!
      const stimulusDetected =
        (threatIsPredatorOrCharging && minThreatDist < awakeSensory.hearingRadius) ||
        (playerAudibleOrVisible && distP < awakeSensory.hearingRadius);

      if ((a.listenTimer ?? 0) > 0) {
        // Currently listening & evaluating the stimulus
        a.listenTimer = Math.max(0, (a.listenTimer ?? 0) - safeDt);
        a.alertLevel = 'curious';
        a.aiBehavior = 'listening';
        a.isFleeing = false;
        a.stimulusX = nearestThreatX;
        a.stimulusZ = nearestThreatZ;

        // While listening, if threat approaches rapidly or makes loud noise -> FLEE!
        const loudThreatWhileListening =
          (threatIsPredatorOrCharging && minThreatDist < 15.0) ||
          playerNoiseRate > 0.55 ||
          (playerSpeed > 3.2 && distP < 15.5);

        if (loudThreatWhileListening) {
          scamperedCritterCount++;
          a.alertLevel = 'fleeing';
          a.aiBehavior = 'fleeing';
          a.isFleeing = true;
          a.fleeCooldown = 3.5;
          a.listenTimer = 0;
        } else if ((a.listenTimer ?? 0) <= 0) {
          // Finished listening and no dangerous escalation -> return to grazing!
          a.alertLevel = 'grazing';
          a.aiBehavior = 'grazing';
          a.listenCooldown = 3.2;
        }
      } else if (stimulusDetected && (a.listenCooldown ?? 0) <= 0) {
        // Enter upright listening posture to evaluate the sound/sight!
        a.alertLevel = 'curious';
        a.aiBehavior = 'listening';
        a.listenTimer = 1.65;
        a.isFleeing = false;
        a.stimulusX = nearestThreatX;
        a.stimulusZ = nearestThreatZ;
      } else {
        a.alertLevel = 'grazing';
        a.isFleeing = false;
      }
    } else {
      const curiousRadius =
        a.species === 'sheep'
          ? isPlayerSneaking || playerSpeed < 0.8
            ? fleeRadius
            : fleeRadius + 2.5
          : isPlayerSneaking
            ? 6.5
            : 16.5;
      if (minThreatDist < curiousRadius) {
        a.alertLevel = 'curious';
        a.aiBehavior = 'listening';
        a.isFleeing = false;
        a.stimulusX = nearestThreatX;
        a.stimulusZ = nearestThreatZ;
      } else {
        a.alertLevel = 'grazing';
        a.isFleeing = false;
      }
    }

    // -------------------------------------------------------------------------
    // RANGE-BASED RANDOM TRAP CHOICE FOR SMALL WILDLIFE (RABBIT & SQUIRREL):
    // - Only evaluated when traps exist in the world.
    // - If the animal sees the player nearby (within visionRange = 14.0m when standing,
    //   or 4.5m when sneaking), it prioritizes fleeing from the player instead of approaching!
    // - When calm/safe and inside a trap's attractRadius, the animal randomly decides
    //   via evaluateAnimalTrapChoice whether to approach the trap or ignore it.
    // -------------------------------------------------------------------------
    if ((a.species === 'rabbit' || a.species === 'squirrel') && !isRaining) {
      const placedTraps = getActivePlacedTrapsRef();
      if (placedTraps.length > 0) {
        const playerVisibleDist = isPlayerSneaking ? 4.5 : awakeSensory.visionRange;
        let anyTrapInRange = false;
        let nearestChosenTrap: { x: number; z: number; dist: number } | null = null;
        for (let tIdx = 0; tIdx < placedTraps.length; tIdx++) {
          const tr = placedTraps[tIdx];
          if (tr.status !== 'armed') continue;
          const recipe = TRAP_RECIPES.find((r) => r.kind === tr.kind);
          if (!recipe || !recipe.targetSpecies.includes(a.species)) continue;
          const dTrap = Math.hypot(tr.x - a.x, tr.z - a.z);
          if (dTrap <= recipe.attractRadius) {
            anyTrapInRange = true;
            if (a.alertLevel !== 'fleeing' && !a.isFleeing && distP >= playerVisibleDist) {
              const choice = evaluateAnimalTrapChoice(a, tr, safeDt);
              if (choice === 'approach' && (!nearestChosenTrap || dTrap < nearestChosenTrap.dist)) {
                nearestChosenTrap = { x: tr.x, z: tr.z, dist: dTrap };
              }
            }
          }
        }

        // If a trap is in range but the rabbit/squirrel sees the player nearby, it flees from the player!
        if (anyTrapInRange && distP < playerVisibleDist && a.alertLevel !== 'fleeing') {
          scamperedCritterCount++;
          a.alertLevel = 'fleeing';
          a.aiBehavior = 'fleeing';
          a.isFleeing = true;
          a.fleeCooldown = 3.4;
          a.isResting = false;
          a.isSeekingShelter = false;
        } else if (nearestChosenTrap && nearestChosenTrap.dist > 0.05 && a.alertLevel !== 'fleeing') {
          a.isResting = false;
          a.isSeekingShelter = false;
          // If this is a squirrel currently up on a tree trunk, make it climb down the trunk first!
          if (
            a.species === 'squirrel' &&
            (a.treeState === 'perched' || a.treeState === 'climb_up' || a.treeState === 'canopy_leap')
          ) {
            a.treeState = 'climb_down';
          }
          // Walk cautiously along the ground toward the chosen trap once on the ground
          if (
            a.species !== 'squirrel' ||
            !a.treeState ||
            a.treeState === 'ground_forage' ||
            a.treeState === 'running_to_tree'
          ) {
            a.treeState = 'ground_forage';
            a.treeClimbPitch = 0;
            a.alertLevel = 'curious';
            a.aiBehavior = 'wandering';
            const lureSpd = 1.65;
            const baseAng = Math.atan2(nearestChosenTrap.x - a.x, nearestChosenTrap.z - a.z);
            const weave = nearestChosenTrap.dist > 2.2 ? Math.sin(elapsedTime * 1.9 + a.id) * 0.12 : 0;
            const moveAng = baseAng + weave;
            a.vx = Math.sin(moveAng) * lureSpd;
            a.vz = Math.cos(moveAng) * lureSpd;
            a.yaw = rotateYawSmoothlyToward(a.yaw, moveAng, 6.5, safeDt);
            a.hopPhase += safeDt * 9.5;
            const rawNextX = a.x + a.vx * safeDt;
            const rawNextZ = a.z + a.vz * safeDt;
            const bodyRadius = SPECIES_PROFILES[a.species].preyBodyRadius;
            const resolved = resolveAnimalObstacleCollision(rawNextX, rawNextZ, bodyRadius);
            advanceAnimalWithWaterShoreRecovery(a, resolved.x, resolved.z, resolved.hitObstacle, safeDt);
            continue;
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // SMART TREE-CLIMBING & FORAGING SQUIRREL AI
    // Squirrels dynamically climb real woodland tree trunks straight up into the
    // canopy branches, perch steadily without spinning in place, leap across
    // adjacent canopies, forage on the forest floor, and scramble up the nearest
    // tree when startled!
    // -------------------------------------------------------------------------
    if (a.species === 'squirrel') {
      const findCandidateTrees = (searchRad: number) => {
        const obs = getNearbyWorldObstacles(a.x, a.z, searchRad);
        const trees: Array<{
          x: number;
          z: number;
          baseY: number;
          trunkRad: number;
          maxPerchH: number;
          dist: number;
        }> = [];
        for (let oIdx = 0; oIdx < obs.length; oIdx++) {
          const o = obs[oIdx];
          if (o.kind !== 'pine' && o.kind !== 'oak' && o.kind !== 'birch') continue;
          if ((o.radius ?? 0) <= 0.08) continue;
          const by = groundHeightAt(o.x, o.z);
          if (by <= WATER_LEVEL + 0.35) continue;
          const sc = o.scale ?? 1.0;
          const trRad = Math.max(0.28, (o.radius ?? 0.42) * 0.85);
          const maxH = (o.kind === 'pine' ? 4.2 : 3.4) * sc;
          trees.push({
            x: o.x,
            z: o.z,
            baseY: by - 0.05,
            trunkRad: trRad,
            maxPerchH: Math.max(2.2, Math.min(4.8, maxH)),
            dist: Math.hypot(o.x - a.x, o.z - a.z),
          });
        }
        trees.sort((t1, t2) => t1.dist - t2.dist);
        return trees;
      };

      // Initialize squirrel state on first tick near a real tree
      if (!a.treeState) {
        a.decisionCounter = a.id * 5;
        const initTrees = findCandidateTrees(24.0);
        if (initTrees.length > 0 && a.id % 2 === 0) {
          const t0 = initTrees[0];
          const ang = (a.id * 1.7) % (Math.PI * 2);
          const perchH = 1.85 + hash2D(a.id, 31) * (t0.maxPerchH - 1.85);
          a.treeState = 'perched';
          a.treeObstacleX = t0.x;
          a.treeObstacleZ = t0.z;
          a.treeBaseY = t0.baseY;
          a.treeTrunkRadius = t0.trunkRad;
          a.treeTargetHeight = perchH;
          a.treeClimbAngle = ang;
          a.treeClimbPitch = -Math.PI * 0.38;
          a.treeStateTimer = 2.0 + hash2D(a.id, 47) * 2.8;
          a.x = t0.x + Math.cos(ang) * t0.trunkRad;
          a.z = t0.z + Math.sin(ang) * t0.trunkRad;
          a.y = t0.baseY + perchH;
          a.yaw = Math.atan2(-Math.cos(ang), -Math.sin(ang));
        } else {
          a.treeState = 'ground_forage';
          a.treeClimbPitch = 0;
          a.treeStateTimer = 1.8 + hash2D(a.id, 59) * 2.2;
        }
      }

      // If startled/fleeing while on the ground, bolt toward the safest nearby tree trunk and climb up!
      if (a.alertLevel === 'fleeing') {
        if (a.treeState === 'ground_forage' || a.treeState === 'running_to_tree') {
          const fleeTrees = findCandidateTrees(18.0);
          const awayX = a.x - nearestThreatX;
          const awayZ = a.z - nearestThreatZ;
          const awayLen = Math.hypot(awayX, awayZ) || 1;
          let bestEscapeTree = fleeTrees[0];
          let bestScore = -Infinity;
          for (let tIdx = 0; tIdx < fleeTrees.length; tIdx++) {
            const ft = fleeTrees[tIdx];
            const toTreeX = ft.x - a.x;
            const toTreeZ = ft.z - a.z;
            const toTreeLen = Math.max(0.1, ft.dist);
            const alignAway = (toTreeX * awayX + toTreeZ * awayZ) / (toTreeLen * awayLen);
            const score = alignAway * 2.5 - ft.dist * 0.18;
            if (score > bestScore) {
              bestScore = score;
              bestEscapeTree = ft;
            }
          }
          if (bestEscapeTree && bestEscapeTree.dist <= 16.0) {
            a.treeObstacleX = bestEscapeTree.x;
            a.treeObstacleZ = bestEscapeTree.z;
            a.treeBaseY = bestEscapeTree.baseY;
            a.treeTrunkRadius = bestEscapeTree.trunkRad;
            a.treeTargetHeight = bestEscapeTree.maxPerchH;
            if (bestEscapeTree.dist <= bestEscapeTree.trunkRad + 0.48) {
              a.treeState = 'climb_up';
              a.treeClimbAngle = Math.atan2(a.z - bestEscapeTree.z, a.x - bestEscapeTree.x);
              a.vx = 0;
              a.vz = 0;
            } else {
              a.treeState = 'running_to_tree';
              a.treeClimbPitch = 0;
              const dx = bestEscapeTree.x - a.x;
              const dz = bestEscapeTree.z - a.z;
              const d = Math.hypot(dx, dz) || 1;
              const fleeSpd = SPECIES_PROFILES.squirrel.preyFleeSpeed;
              a.vx = (dx / d) * fleeSpd;
              a.vz = (dz / d) * fleeSpd;
              a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 10.0, safeDt);
              a.hopPhase += safeDt * 18.0;
              const nextX = a.x + a.vx * safeDt;
              const nextZ = a.z + a.vz * safeDt;
              if (Math.hypot(bestEscapeTree.x - nextX, bestEscapeTree.z - nextZ) <= bestEscapeTree.trunkRad + 0.48) {
                a.treeState = 'climb_up';
                a.treeClimbAngle = Math.atan2(nextZ - bestEscapeTree.z, nextX - bestEscapeTree.x);
                a.vx = 0;
                a.vz = 0;
              } else {
                a.x = nextX;
                a.z = nextZ;
                a.y = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(a.x, a.z).height);
              }
              continue;
            }
          }
        } else if (a.treeState === 'climb_down') {
          // If startled while climbing down, immediately reverse and climb back up to the high canopy!
          a.treeState = 'climb_up';
          a.treeTargetHeight = Math.max(a.treeTargetHeight ?? 3.2, 3.6);
        } else if (a.treeState === 'perched' && a.treeObstacleX !== undefined && a.treeObstacleZ !== undefined) {
          // Only climb higher if currently perched low on the trunk; once at top perch height, stay perched without resetting to climb_up!
          const baseY = a.treeBaseY ?? groundHeightAt(a.treeObstacleX, a.treeObstacleZ);
          const escapeH = Math.max(a.treeTargetHeight ?? 3.2, 3.4);
          if (a.y < baseY + escapeH - 0.12) {
            a.treeTargetHeight = escapeH;
            a.treeState = 'climb_up';
          }
        }
      }

      // Execute vertical tree states ('climb_up', 'perched', 'canopy_leap', 'climb_down')
      if (
        a.treeState === 'climb_up' &&
        a.treeObstacleX !== undefined &&
        a.treeObstacleZ !== undefined
      ) {
        const baseY = a.treeBaseY ?? groundHeightAt(a.treeObstacleX, a.treeObstacleZ);
        const trunkRad = a.treeTrunkRadius ?? 0.36;
        const targetH = a.treeTargetHeight ?? 3.2;
        const climbSpd = a.alertLevel === 'fleeing' ? 3.2 : 2.1;
        const climbAng = a.treeClimbAngle ?? 0;
        a.y = Math.min(baseY + targetH, a.y + climbSpd * safeDt);
        a.x = a.treeObstacleX + Math.cos(climbAng) * trunkRad;
        a.z = a.treeObstacleZ + Math.sin(climbAng) * trunkRad;
        a.vx = 0;
        a.vz = 0;
        a.treeClimbPitch = -Math.PI * 0.42;
        a.yaw = Math.atan2(-Math.cos(climbAng), -Math.sin(climbAng));
        a.hopPhase += safeDt * 15.0;
        if (a.y >= baseY + targetH - 0.04) {
          a.y = baseY + targetH;
          a.treeState = 'perched';
          a.decisionCounter = (a.decisionCounter ?? 0) + 1;
          a.treeStateTimer = 2.4 + hash2D(a.decisionCounter, a.id + 19) * 3.2;
        }
        continue;
      }

      if (
        a.treeState === 'perched' &&
        a.treeObstacleX !== undefined &&
        a.treeObstacleZ !== undefined
      ) {
        const trunkRad = a.treeTrunkRadius ?? 0.36;
        const baseAng = a.treeClimbAngle ?? 0;
        // Hold steady on the bark without oscillating yaw or spinning around the trunk
        a.x = a.treeObstacleX + Math.cos(baseAng) * trunkRad;
        a.z = a.treeObstacleZ + Math.sin(baseAng) * trunkRad;
        a.vx = 0;
        a.vz = 0;
        a.treeClimbPitch = -Math.PI * 0.36;
        a.yaw = Math.atan2(-Math.cos(baseAng), -Math.sin(baseAng));
        a.treeStateTimer = (a.treeStateTimer ?? 2.5) - safeDt;
        if (a.treeStateTimer <= 0) {
          a.decisionCounter = (a.decisionCounter ?? 0) + 1;
          const dc = a.decisionCounter;
          const nearbyTrees = findCandidateTrees(14.0).filter(
            (t) =>
              Math.hypot(t.x - a.treeObstacleX!, t.z - a.treeObstacleZ!) > 2.2 &&
              (a.lastTreeX === undefined || Math.hypot(t.x - a.lastTreeX, t.z - a.lastTreeZ!) > 1.5)
          );
          if (a.alertLevel === 'fleeing' || minThreatDist < 11.5) {
            // While danger is near the base of the tree, either leap across canopies away from danger or stay perched high up!
            const safeNextTree = nearbyTrees.find(
              (t) =>
                t.dist <= 8.5 &&
                Math.hypot(t.x - nearestThreatX, t.z - nearestThreatZ) >
                  Math.hypot(a.treeObstacleX! - nearestThreatX, a.treeObstacleZ! - nearestThreatZ) + 1.0
            );
            if (safeNextTree) {
              const landAng = Math.atan2(a.z - safeNextTree.z, a.x - safeNextTree.x);
              const nextPerchH = Math.max(2.6, safeNextTree.maxPerchH * 0.85);
              a.lastTreeX = a.treeObstacleX;
              a.lastTreeZ = a.treeObstacleZ;
              a.leapStartX = a.x;
              a.leapStartY = a.y;
              a.leapStartZ = a.z;
              a.leapEndX = safeNextTree.x + Math.cos(landAng) * safeNextTree.trunkRad;
              a.leapEndY = safeNextTree.baseY + nextPerchH;
              a.leapEndZ = safeNextTree.z + Math.sin(landAng) * safeNextTree.trunkRad;
              a.treeObstacleX = safeNextTree.x;
              a.treeObstacleZ = safeNextTree.z;
              a.treeBaseY = safeNextTree.baseY;
              a.treeTrunkRadius = safeNextTree.trunkRad;
              a.treeTargetHeight = nextPerchH;
              a.treeClimbAngle = landAng;
              a.leapDuration = Math.max(0.55, Math.min(0.95, safeNextTree.dist * 0.11));
              a.treeStateTimer = a.leapDuration;
              a.treeState = 'canopy_leap';
            } else {
              a.treeStateTimer = 2.0;
            }
          } else if (nearbyTrees.length > 0 && nearbyTrees[0].dist <= 8.5 && dc % 2 === 0) {
            // Agile canopy leap to a neighboring tree!
            const pickIdx = dc % Math.min(3, nearbyTrees.length);
            const nextTree = nearbyTrees[pickIdx];
            const landAng = Math.atan2(a.z - nextTree.z, a.x - nextTree.x);
            const nextPerchH = 1.85 + hash2D(dc, a.id + 71) * (nextTree.maxPerchH - 1.85);
            a.lastTreeX = a.treeObstacleX;
            a.lastTreeZ = a.treeObstacleZ;
            a.leapStartX = a.x;
            a.leapStartY = a.y;
            a.leapStartZ = a.z;
            a.leapEndX = nextTree.x + Math.cos(landAng) * nextTree.trunkRad;
            a.leapEndY = nextTree.baseY + nextPerchH;
            a.leapEndZ = nextTree.z + Math.sin(landAng) * nextTree.trunkRad;
            a.treeObstacleX = nextTree.x;
            a.treeObstacleZ = nextTree.z;
            a.treeBaseY = nextTree.baseY;
            a.treeTrunkRadius = nextTree.trunkRad;
            a.treeTargetHeight = nextPerchH;
            a.treeClimbAngle = landAng;
            a.leapDuration = Math.max(0.55, Math.min(0.95, nextTree.dist * 0.11));
            a.treeStateTimer = a.leapDuration;
            a.treeState = 'canopy_leap';
          } else {
            // Climb down the trunk to forage on the ground
            a.treeState = 'climb_down';
          }
        }
        continue;
      }

      if (a.treeState === 'canopy_leap') {
        const dur = Math.max(0.2, a.leapDuration ?? 0.75);
        a.treeStateTimer = Math.max(0, (a.treeStateTimer ?? dur) - safeDt);
        const p = 1.0 - (a.treeStateTimer ?? 0) / dur;
        const sx = a.leapStartX ?? a.x;
        const sy = a.leapStartY ?? a.y;
        const sz = a.leapStartZ ?? a.z;
        const ex = a.leapEndX ?? a.x;
        const ey = a.leapEndY ?? a.y;
        const ez = a.leapEndZ ?? a.z;
        a.x = sx + (ex - sx) * p;
        a.z = sz + (ez - sz) * p;
        a.y = sy + (ey - sy) * p + Math.sin(p * Math.PI) * 1.35;
        a.vx = 0;
        a.vz = 0;
        a.treeClimbPitch = (p - 0.5) * 0.85;
        a.yaw = Math.atan2(ex - sx, ez - sz);
        a.hopPhase += safeDt * 18.0;
        if (p >= 1.0) {
          a.treeState = 'perched';
          a.treeStateTimer = 2.2 + hash2D(a.decisionCounter ?? 1, a.id + 53) * 2.8;
        }
        continue;
      }

      if (
        a.treeState === 'climb_down' &&
        a.treeObstacleX !== undefined &&
        a.treeObstacleZ !== undefined
      ) {
        const baseY = a.treeBaseY ?? groundHeightAt(a.treeObstacleX, a.treeObstacleZ);
        const trunkRad = a.treeTrunkRadius ?? 0.36;
        const climbAng = a.treeClimbAngle ?? 0;
        a.y = Math.max(baseY + 0.1, a.y - 2.25 * safeDt);
        a.x = a.treeObstacleX + Math.cos(climbAng) * trunkRad;
        a.z = a.treeObstacleZ + Math.sin(climbAng) * trunkRad;
        a.vx = 0;
        a.vz = 0;
        a.treeClimbPitch = Math.PI * 0.42;
        a.yaw = Math.atan2(Math.cos(climbAng), Math.sin(climbAng));
        a.hopPhase += safeDt * 15.0;
        if (a.y <= baseY + 0.14) {
          // Step cleanly onto the forest floor outside the trunk collider and pick a smart foraging target
          const outAng = climbAng + (hash2D(a.decisionCounter ?? 1, a.id) - 0.5) * 0.9;
          const stepOut = trunkRad + 0.52;
          a.lastTreeX = a.treeObstacleX;
          a.lastTreeZ = a.treeObstacleZ;
          a.x = a.treeObstacleX + Math.cos(outAng) * stepOut;
          a.z = a.treeObstacleZ + Math.sin(outAng) * stepOut;
          a.y = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(a.x, a.z).height);
          a.treeClimbPitch = 0;
          a.treeState = 'ground_forage';
          a.decisionCounter = (a.decisionCounter ?? 0) + 1;
          const forageDist = 3.2 + hash2D(a.decisionCounter, a.id + 83) * 5.2;
          a.forageTargetX = a.x + Math.cos(outAng) * forageDist;
          a.forageTargetZ = a.z + Math.sin(outAng) * forageDist;
          a.treeStateTimer = 3.2 + hash2D(a.decisionCounter, a.id + 97) * 3.0;
        }
        continue;
      }

      if (
        a.treeState === 'running_to_tree' &&
        a.treeObstacleX !== undefined &&
        a.treeObstacleZ !== undefined &&
        a.alertLevel !== 'fleeing'
      ) {
        a.treeClimbPitch = 0;
        a.treeStateTimer = (a.treeStateTimer ?? 4.0) - safeDt;
        const dx = a.treeObstacleX - a.x;
        const dz = a.treeObstacleZ - a.z;
        const distToTrunk = Math.hypot(dx, dz);
        const trunkRad = a.treeTrunkRadius ?? 0.36;
        if (distToTrunk <= trunkRad + 0.48) {
          a.treeState = 'climb_up';
          a.treeClimbAngle = Math.atan2(a.z - a.treeObstacleZ, a.x - a.treeObstacleX);
          a.vx = 0;
          a.vz = 0;
          continue;
        }
        if ((a.treeStateTimer ?? 0) <= 0) {
          a.treeState = 'ground_forage';
          a.treeStateTimer = 2.5;
          continue;
        }
        const runSpd = 2.85;
        a.vx = (dx / (distToTrunk || 1)) * runSpd;
        a.vz = (dz / (distToTrunk || 1)) * runSpd;
        a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 7.5, safeDt);
        a.hopPhase += safeDt * 13.5;
        a.x += a.vx * safeDt;
        a.z += a.vz * safeDt;
        a.y = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(a.x, a.z).height);
        continue;
      }

      // Ground foraging state ('ground_forage') when calm:
      if (a.alertLevel !== 'fleeing' && !isRaining) {
        a.treeClimbPitch = 0;
        a.treeStateTimer = (a.treeStateTimer ?? 3.0) - safeDt;
        if (a.treeStateTimer <= 0) {
          a.decisionCounter = (a.decisionCounter ?? 0) + 1;
          const dc = a.decisionCounter;
          // Every 2nd ground decision, pick a varied nearby tree (not the last tree!) and go climb it
          const candidateTrees = findCandidateTrees(24.0).filter(
            (t) =>
              a.lastTreeX === undefined ||
              Math.hypot(t.x - a.lastTreeX, t.z - a.lastTreeZ!) > 1.5
          );
          if (candidateTrees.length > 0 && dc % 2 === 0) {
            const pickIdx = dc % Math.min(4, candidateTrees.length);
            const chosenTree = candidateTrees[pickIdx];
            a.treeObstacleX = chosenTree.x;
            a.treeObstacleZ = chosenTree.z;
            a.treeBaseY = chosenTree.baseY;
            a.treeTrunkRadius = chosenTree.trunkRad;
            a.treeTargetHeight = 1.85 + hash2D(dc, a.id + 41) * (chosenTree.maxPerchH - 1.85);
            a.treeStateTimer = 4.5;
            a.treeState = 'running_to_tree';
            continue;
          } else {
            // Pick a fresh ground foraging waypoint around the meadow/forest
            const baseAng = hash2D(dc * 11, a.id + 23) * Math.PI * 2;
            const dist = 2.8 + hash2D(dc * 17, a.id + 61) * 5.5;
            a.forageTargetX = a.homeX + Math.cos(baseAng) * dist;
            a.forageTargetZ = a.homeZ + Math.sin(baseAng) * dist;
            a.treeStateTimer = 2.6 + hash2D(dc, a.id + 89) * 2.8;
          }
        }

        const nibbleWave = Math.sin(elapsedTime * 2.3 + a.id * 1.4);
        const fx = a.forageTargetX ?? a.homeX;
        const fz = a.forageTargetZ ?? a.homeZ;
        const df = Math.hypot(fx - a.x, fz - a.z);
        if (nibbleWave > 0.35 || df < 0.45) {
          // Pause to nibble an acorn & look around
          a.aiBehavior = 'grazing';
          a.vx = 0;
          a.vz = 0;
        } else {
          a.aiBehavior = 'wandering';
          const dirAng = Math.atan2(fx - a.x, fz - a.z);
          const spd = SPECIES_PROFILES.squirrel.grazeSpeed;
          a.vx = Math.sin(dirAng) * spd;
          a.vz = Math.cos(dirAng) * spd;
          a.yaw = rotateYawSmoothlyToward(a.yaw, dirAng, 6.5, safeDt);
          a.hopPhase += safeDt * SPECIES_PROFILES.squirrel.grazeHopRate;
          const rawNextX = a.x + a.vx * safeDt;
          const rawNextZ = a.z + a.vz * safeDt;
          const resolved = resolveAnimalObstacleCollision(
            rawNextX,
            rawNextZ,
            SPECIES_PROFILES.squirrel.preyBodyRadius
          );
          if (resolved.hitObstacle) {
            a.treeStateTimer = 0;
          }
          advanceAnimalWithWaterShoreRecovery(a, resolved.x, resolved.z, resolved.hitObstacle, safeDt);
        }
        continue;
      }
    }

    if (a.alertLevel === 'fleeing') {
      a.treeClimbPitch = 0;
      const awayX = a.x - nearestThreatX;
      const awayZ = a.z - nearestThreatZ;
      const len = Math.hypot(awayX, awayZ) || 1;
      const fleeSpeed = SPECIES_PROFILES[a.species].preyFleeSpeed;
      a.vx = (awayX / len) * fleeSpeed;
      a.vz = (awayZ / len) * fleeSpeed;
      a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 8.0, safeDt);
      a.hopPhase += safeDt * 18.0;
      a.aiBehavior = 'fleeing';
      a.isResting = false;
      a.isSeekingShelter = false;
    } else if (isRaining) {
      // Rain Shelter Behavior: animals seek cover under the nearest tree canopy!
      a.isSeekingShelter = true;
      a.aiBehavior = 'seeking_shelter';
      if (a.shelterTargetX === undefined || a.shelterTargetZ === undefined) {
        const sh = findNearestShelterPoint(a.x, a.z, a.species, a.caveIndex);
        a.shelterTargetX = sh.x;
        a.shelterTargetZ = sh.z;
      }
      const toShX = a.shelterTargetX - a.x;
      const toShZ = a.shelterTargetZ - a.z;
      const distSh = Math.hypot(toShX, toShZ);
      if (distSh > 1.15) {
        a.isResting = false;
        const shelterMoveSpd = SPECIES_PROFILES[a.species].shelterSpeed;
        a.vx = (toShX / distSh) * shelterMoveSpd;
        a.vz = (toShZ / distSh) * shelterMoveSpd;
        a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 6.5, safeDt);
        a.hopPhase += safeDt * 10.0;
      } else {
        // Reached shelter under tree canopy: huddle quietly out of the rain (zero sliding)
        a.vx = 0;
        a.vz = 0;
        a.isResting = true;
        a.aiBehavior = 'sleeping';
      }
    } else if (a.alertLevel === 'curious' || a.aiBehavior === 'listening') {
      a.isSeekingShelter = false;
      a.isResting = false;
      a.aiBehavior = 'listening';
      a.vx = 0;
      a.vz = 0;
      const lookX = a.stimulusX ?? nearestThreatX;
      const lookZ = a.stimulusZ ?? nearestThreatZ;
      const targetYaw = Math.atan2(lookX - a.x, lookZ - a.z);
      a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 4.5, safeDt);
    } else {
      a.isSeekingShelter = false;
      a.isResting = false;
      const timeWindow = Math.floor(elapsedTime * 0.28 + a.id * 1.37);
      const wanderSeed = hash2D(a.id * 13.7, timeWindow);
      const pauseThreshold = SPECIES_PROFILES[a.species].grazePauseThreshold;
      const pauseMove = wanderSeed > pauseThreshold;
      if (pauseMove) {
        a.aiBehavior = 'grazing';
        a.vx = 0;
        a.vz = 0;
      } else {
        a.aiBehavior = 'wandering';
        const targetAngle = (wanderSeed / pauseThreshold) * Math.PI * 2;
        const homePullX = (a.homeX - a.x) * 0.14;
        const homePullZ = (a.homeZ - a.z) * 0.14;
        const grazeSpeed = SPECIES_PROFILES[a.species].grazeSpeed;
        const desiredVx = Math.cos(targetAngle) * grazeSpeed + homePullX;
        const desiredVz = Math.sin(targetAngle) * grazeSpeed + homePullZ;
        const blend = Math.min(1, safeDt * 4.5);
        a.vx += (desiredVx - a.vx) * blend;
        a.vz += (desiredVz - a.vz) * blend;
        a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 5.0, safeDt);
        a.hopPhase += safeDt * SPECIES_PROFILES[a.species].grazeHopRate;
      }
    }

    if (Math.abs(a.vx) > 1e-4 || Math.abs(a.vz) > 1e-4 || a.inWater || a.y <= WATER_LEVEL + 0.15) {
      const rawNextX = a.x + a.vx * safeDt;
      const rawNextZ = a.z + a.vz * safeDt;
      const bodyRadius = SPECIES_PROFILES[a.species].preyBodyRadius;
      const resolved = resolveAnimalObstacleCollision(rawNextX, rawNextZ, bodyRadius);
      advanceAnimalWithWaterShoreRecovery(a, resolved.x, resolved.z, resolved.hitObstacle, safeDt);
    }
  }

  return { scamperedCritterCount, nearestCritterDist };
}

export interface IBoidsWildlifeStepResult {
  readonly startledFlockCount: number;
  readonly scamperedCritterCount: number;
  readonly nearestBirdDist: number;
  readonly nearestCritterDist: number;
}

/**
 * Summary: Steps autonomous bird boids and reactive ground animals.
 * Supports both the full simulation signature and the unit-test signature.
 */
export function stepBoidsAndWildlife(
  arg1: number | IBoidBirdState[],
  arg2: number | ISmallAnimalState[],
  arg3: IBoidBirdState[] | number,
  arg4: ISmallAnimalState[] | number,
  arg5: IPlayerState | number,
  arg6: readonly IRideableHorseState[] | number = [],
  arg7 = 1.0,
  arg8 = 0
): IBoidsWildlifeStepResult {
  let dt: number;
  let elapsedTime: number;
  let birds: IBoidBirdState[];
  let animals: ISmallAnimalState[];
  let playerX: number;
  let playerZ: number;
  let playerSpeed: number;
  let isPlayerSneaking: boolean;
  let isAttacking: boolean;
  let bowDrawn: boolean;
  let horses: readonly IRideableHorseState[];
  let daylightFactor: number;
  let rainIntensity: number;
  let playerStateRef: IPlayerState | undefined;

  if (Array.isArray(arg1)) {
    // Legacy test signature: (birds, animals, playerX, playerY, playerZ, playerSpeed, dt)
    birds = arg1;
    animals = arg2 as ISmallAnimalState[];
    playerX = arg3 as number;
    playerZ = arg5 as number;
    playerSpeed = typeof arg6 === 'number' ? arg6 : 0;
    dt = arg7;
    elapsedTime = 10.0;
    isPlayerSneaking = false;
    isAttacking = false;
    bowDrawn = false;
    horses = [];
    daylightFactor = 1.0;
    rainIntensity = 0;
  } else {
    // Runtime signature: (dt, elapsedTime, birds, animals, playerState, horses, daylightFactor, rainIntensity)
    dt = arg1;
    elapsedTime = arg2 as number;
    birds = arg3 as IBoidBirdState[];
    animals = arg4 as ISmallAnimalState[];
    const ps = arg5 as IPlayerState;
    playerStateRef = ps;
    playerX = ps.x;
    playerZ = ps.z;
    playerSpeed = Math.hypot(ps.vx, ps.vz);
    isPlayerSneaking = Boolean(ps.isCrouching || ps.walkPace === 'relaxed');
    isAttacking = (ps.swordSwingProgress ?? 0) > 0.05;
    bowDrawn = Boolean(ps.bowDrawn);
    horses = Array.isArray(arg6) ? arg6 : [];
    daylightFactor = arg7;
    rainIntensity = arg8;
  }

  const safeDt = Math.max(0, Math.min(0.1, dt));
  const isNightRest = daylightFactor < 0.35;
  let startledFlockCount = 0;
  let nearestBirdDist = Infinity;

  // --- 1. STEP FLOCKING BIRDS (3D REYNOLDS BOIDS + RANGE-BASED RANDOM TRAP CHOICE) ---
  activeWorldBirdsRegistry = birds;
  const perceptionRadius = 16.0;
  const separationDist = 3.8;
  const placedTraps = getActivePlacedTrapsRef();
  const birdStartleDist = isPlayerSneaking ? 4.5 : 14.0;

  // Range-based random trap choice for armed Baited Bird Net Traps (`trap_net`):
  // Any bird flying within the trap's attractRadius (when the player is not standing right at the trap)
  // makes a random choice whether to glide down to the bait or ignore it (no timer!).
  for (let tIdx = 0; tIdx < placedTraps.length; tIdx++) {
    const trap = placedTraps[tIdx];
    if (trap.status !== 'armed' || trap.kind !== 'trap_net') continue;
    const playerDistToTrap = Math.hypot(playerX - trap.x, playerZ - trap.z);
    if (playerDistToTrap < birdStartleDist) continue;

    let assignedBird: IBoidBirdState | null = null;
    for (let bIdx = 0; bIdx < birds.length; bIdx++) {
      const candidate = birds[bIdx];
      if (!candidate.isDead && !candidate.isLooted && candidate.targetTrapId === trap.id) {
        assignedBird = candidate;
        break;
      }
    }
    if (!assignedBird) {
      const attractRad = TRAP_RECIPES.find((r) => r.kind === 'trap_net')?.attractRadius ?? 42.0;
      const rng = getTrapRandomGenerator();
      for (let bIdx = 0; bIdx < birds.length; bIdx++) {
        const candidate = birds[bIdx];
        if (candidate.isDead || candidate.isLooted || candidate.targetTrapId || candidate.startleTimer > 0) {
          continue;
        }
        const d = Math.hypot(candidate.x - trap.x, candidate.z - trap.z);
        if (d > attractRad) continue;
        if (!candidate.declinedTrapIds) candidate.declinedTrapIds = {};
        const retryTimer = candidate.declinedTrapIds[trap.id] ?? 0;
        if (retryTimer > 0) {
          candidate.declinedTrapIds[trap.id] = Math.max(0, retryTimer - safeDt);
          continue;
        }
        if (rng() < TRAP_RANDOM_APPROACH_PROBABILITY) {
          const landAngle = (candidate.id * 1.618) % (Math.PI * 2);
          const landRadius = 4.4;
          candidate.targetTrapId = trap.id;
          candidate.groundState = 'descending';
          candidate.groundTimer = 0;
          candidate.landingX = trap.x + Math.cos(landAngle) * landRadius;
          candidate.landingZ = trap.z + Math.sin(landAngle) * landRadius;
          break;
        } else {
          candidate.declinedTrapIds[trap.id] = 14.0;
        }
      }
    }
  }

  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    if (b.isLooted) continue;

    if ((b.hitReactionTimer ?? 0) > 0 && safeDt > 0) {
      b.hitReactionTimer = Math.max(0, (b.hitReactionTimer ?? 0) - safeDt);
    }

    // Dead birds rest on the ground waiting to be looted with [E]
    if (b.isDead) {
      b.vx = 0;
      b.vy = 0;
      b.vz = 0;
      b.y = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(b.x, b.z).height);
      continue;
    }

    const distToPlayer = Math.hypot(b.x - playerX, b.z - playerZ);
    if (distToPlayer < nearestBirdDist) {
      nearestBirdDist = distToPlayer;
    }

    if (safeDt <= 0) continue;

    // Logic Culling (Sleep State): completely freeze simulation for bird boids outside the 180m active radius
    if (playerStateRef && distToPlayer > 180.0 && !b.targetTrapId) {
      continue;
    }

    // Check player startle FIRST so a bird descending or walking to a trap flees if it sees the player!
    if (
      distToPlayer < birdStartleDist &&
      (Boolean(b.targetTrapId) ||
        playerSpeed > (isPlayerSneaking ? 3.5 : 2.5) ||
        bowDrawn ||
        isAttacking)
    ) {
      b.targetTrapId = undefined;
      b.startleTimer = 4.0;
      b.fleeTimer = 4.0;
      b.roosting = false;
      b.groundState = 'flying';
      startledFlockCount++;
    }

    if (b.startleTimer > 0) {
      b.startleTimer = Math.max(0, b.startleTimer - safeDt);
      b.fleeTimer = b.startleTimer;
    }

    // Check if this bird is lured by an armed Baited Bird Net Trap (`trap_net`):
    // 1. Glides down from the sky and lands ~4.4m away from the trap
    // 2. Walks cautiously on the ground (`'walking_to_bait'` -> `'walk'` animation) toward the grain/berry bait
    // 3. Pecks at the food bait (`'eating_bait'` -> `'eat'` animation) for 2.2s, then triggers the net trap!
    if (b.targetTrapId) {
      const targetTrap = placedTraps.find(
        (t) => t.id === b.targetTrapId && t.status === 'armed' && t.kind === 'trap_net'
      );
      if (!targetTrap || Math.hypot(playerX - targetTrap.x, playerZ - targetTrap.z) < birdStartleDist) {
        b.targetTrapId = undefined;
        b.groundState = 'flying';
        if (targetTrap) {
          b.startleTimer = 4.0;
          b.fleeTimer = 4.0;
        }
      } else {
        const landX = b.landingX ?? targetTrap.x + 4.4;
        const landZ = b.landingZ ?? targetTrap.z;
        const landGroundY = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(landX, landZ).height);

        if (b.groundState === 'descending' || !b.groundState || b.groundState === 'flying') {
          b.groundState = 'descending';
          const dx = landX - b.x;
          const dy = landGroundY - b.y;
          const dz = landZ - b.z;
          const dist3D = Math.hypot(dx, dy, dz);
          if (dist3D <= 0.45) {
            b.x = landX;
            b.y = landGroundY;
            b.z = landZ;
            b.vy = 0;
            b.groundState = 'walking_to_bait';
          } else {
            const swoopSpd = 4.8;
            b.vx = (dx / dist3D) * swoopSpd;
            b.vy = (dy / dist3D) * swoopSpd;
            b.vz = (dz / dist3D) * swoopSpd;
            b.x += b.vx * safeDt;
            b.y += b.vy * safeDt;
            b.z += b.vz * safeDt;
            b.yaw = Math.atan2(b.vx, b.vz);
            b.wingPhase += safeDt * 10.5;
          }
          continue;
        }

        if (b.groundState === 'walking_to_bait') {
          const dx = targetTrap.x - b.x;
          const dz = targetTrap.z - b.z;
          const dist2D = Math.hypot(dx, dz);
          const groundHere = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(b.x, b.z).height);
          b.y = groundHere;
          b.vy = 0;
          if (dist2D <= 0.42) {
            b.x = targetTrap.x;
            b.z = targetTrap.z;
            b.vx = 0;
            b.vz = 0;
            b.groundState = 'eating_bait';
            b.groundTimer = 2.2;
          } else {
            const walkSpd = 1.25;
            b.vx = (dx / dist2D) * walkSpd;
            b.vz = (dz / dist2D) * walkSpd;
            b.x += b.vx * safeDt;
            b.z += b.vz * safeDt;
            b.y = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(b.x, b.z).height);
            b.yaw = Math.atan2(b.vx, b.vz);
            b.wingPhase += safeDt * 8.5;
          }
          continue;
        }

        if (b.groundState === 'eating_bait') {
          b.vx = 0;
          b.vy = 0;
          b.vz = 0;
          b.x = targetTrap.x;
          b.z = targetTrap.z;
          b.y = Math.max(WATER_LEVEL + 0.05, walkableHeightAt(b.x, b.z).height);
          b.wingPhase += safeDt * 6.0;
          b.groundTimer = (b.groundTimer ?? 2.2) - safeDt;
          if ((b.groundTimer ?? 0) <= 0) {
            const birdLevel = b.level ?? 1;
            targetTrap.status = 'sprung';
            targetTrap.sprung = true;
            targetTrap.notifiedSprung = false; // tickPlacedAnimalTraps will emit the sprung notification
            targetTrap.caughtSpecies = 'dove';
            targetTrap.caughtAnimalLevel = birdLevel;
            targetTrap.caughtAnimalName = 'Wild Dove';
            targetTrap.loot = generateCaughtAnimalLoot('dove', birdLevel, 'trap_net');
            targetTrap.xp = Math.round(38 * (1 + (birdLevel - 1) * 0.25));
            b.isDead = true;
            b.isLooted = true;
            b.targetTrapId = undefined;
          }
          continue;
        }
      }
    }

    // Periodic natural ground foraging for select flock birds (land, walk on ground, and eat seeds when calm)
    if (
      !isNightRest &&
      b.startleTimer <= 0 &&
      distToPlayer > birdStartleDist + 2.0 &&
      b.id % 6 === 0
    ) {
      const cycle = (elapsedTime + b.id * 7.3) % 32.0;
      const forageGroundY = walkableHeightAt(b.x, b.z).height;
      if (cycle < 14.0 && forageGroundY > WATER_LEVEL + 0.4) {
        if (b.y > forageGroundY + 0.35) {
          b.groundState = 'descending';
          b.vx = Math.cos(b.id) * 2.4;
          b.vz = Math.sin(b.id) * 2.4;
          b.vy = -4.8;
          b.x += b.vx * safeDt;
          b.z += b.vz * safeDt;
          b.y = Math.max(forageGroundY, b.y + b.vy * safeDt);
          b.yaw = Math.atan2(b.vx, b.vz);
          b.wingPhase += safeDt * 10.0;
          continue;
        } else if (cycle < 9.0) {
          b.groundState = 'walking_to_bait';
          const walkAng = b.id * 1.7 + Math.floor(elapsedTime * 0.25);
          b.vx = Math.cos(walkAng) * 1.4;
          b.vz = Math.sin(walkAng) * 1.4;
          b.vy = 0;
          b.x += b.vx * safeDt;
          b.z += b.vz * safeDt;
          b.y = Math.max(WATER_LEVEL + 0.1, walkableHeightAt(b.x, b.z).height);
          b.yaw = Math.atan2(b.vx, b.vz);
          b.wingPhase += safeDt * 8.0;
          continue;
        } else {
          b.groundState = 'eating_bait';
          b.vx = 0;
          b.vy = 0;
          b.vz = 0;
          b.y = Math.max(WATER_LEVEL + 0.1, walkableHeightAt(b.x, b.z).height);
          b.wingPhase += safeDt * 5.0;
          continue;
        }
      } else {
        b.groundState = 'flying';
      }
    } else {
      b.groundState = 'flying';
    }

    b.roosting = isNightRest && b.startleTimer <= 0;

    if (b.roosting) {
      const targetY = Math.max(WATER_LEVEL + 2.0, groundHeightAt(b.homeX, b.homeZ) + 4.5);
      b.x += (b.homeX - b.x) * Math.min(1, safeDt * 1.5);
      b.z += (b.homeZ - b.z) * Math.min(1, safeDt * 1.5);
      b.y += (targetY - b.y) * Math.min(1, safeDt * 2.0);
      b.vx *= 0.85;
      b.vy *= 0.85;
      b.vz *= 0.85;
      b.wingPhase += safeDt * 1.5;
      continue;
    }

    let sepX = 0, sepY = 0, sepZ = 0;
    let alignX = 0, alignY = 0, alignZ = 0;
    let cohX = 0, cohY = 0, cohZ = 0;
    let neighbors = 0;

    for (let j = 0; j < birds.length; j++) {
      if (i === j) continue;
      const other = birds[j];
      if (other.roosting || other.isDead || other.groundState !== 'flying') continue;
      const dx = other.x - b.x;
      const dy = other.y - b.y;
      const dz = other.z - b.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 0.001 && dist < perceptionRadius) {
        neighbors++;
        alignX += other.vx;
        alignY += other.vy;
        alignZ += other.vz;
        cohX += other.x;
        cohY += other.y;
        cohZ += other.z;
        if (dist < separationDist) {
          const inv = (separationDist - dist) / (dist * separationDist);
          sepX -= dx * inv;
          sepY -= dy * inv;
          sepZ -= dz * inv;
        }
      }
    }

    let steerX = sepX * 6.5;
    let steerY = sepY * 5.0;
    let steerZ = sepZ * 6.5;

    if (neighbors > 0) {
      alignX /= neighbors;
      alignY /= neighbors;
      alignZ /= neighbors;
      steerX += (alignX - b.vx) * 1.4;
      steerY += (alignY - b.vy) * 1.2;
      steerZ += (alignZ - b.vz) * 1.4;

      cohX = cohX / neighbors - b.x;
      cohY = cohY / neighbors - b.y;
      cohZ = cohZ / neighbors - b.z;
      steerX += cohX * 0.45;
      steerY += cohY * 0.35;
      steerZ += cohZ * 0.45;
    }

    steerX += (b.homeX - b.x) * 0.08;
    steerZ += (b.homeZ - b.z) * 0.08;

    if (b.startleTimer > 0) {
      steerY += 6.0;
      if (distToPlayer > 0.01) {
        const awayX = (b.x - playerX) / distToPlayer;
        const awayZ = (b.z - playerZ) / distToPlayer;
        steerX += awayX * 18.0;
        steerZ += awayZ * 18.0;
      }
    }

    const groundY = Math.max(WATER_LEVEL, groundHeightAt(b.x, b.z));
    const minFlightY = groundY + 9.0;
    const maxFlightY = groundY + 28.0;
    if (b.y < minFlightY) {
      steerY += (minFlightY - b.y) * 4.5;
    } else if (b.y > maxFlightY) {
      steerY -= (b.y - maxFlightY) * 3.0;
    }

    b.vx += steerX * safeDt;
    b.vy += steerY * safeDt;
    b.vz += steerZ * safeDt;

    const maxSpeed = b.startleTimer > 0 ? 14.5 : 9.5;
    const minSpeed = 5.5;
    const spd = Math.hypot(b.vx, b.vy, b.vz);
    if (spd > maxSpeed) {
      const s = maxSpeed / spd;
      b.vx *= s;
      b.vy *= s;
      b.vz *= s;
    } else if (spd < minSpeed && spd > 0.001) {
      const s = minSpeed / spd;
      b.vx *= s;
      b.vy *= s;
      b.vz *= s;
    }

    b.x += b.vx * safeDt;
    b.y += b.vy * safeDt;
    b.z += b.vz * safeDt;
    b.yaw = Math.atan2(b.vx, b.vz);
    b.wingPhase += safeDt * (b.startleTimer > 0 ? 18.0 : 10.5);
  }

  // --- 2. STEP REACTIVE GROUND ANIMALS ---
  const animalRes = stepSmallAnimals(
    animals,
    dt,
    elapsedTime,
    playerX,
    playerZ,
    horses,
    daylightFactor,
    undefined,
    playerSpeed,
    isPlayerSneaking,
    isAttacking,
    rainIntensity,
    playerStateRef
  );

  return {
    startledFlockCount,
    scamperedCritterCount: animalRes.scamperedCritterCount,
    nearestBirdDist,
    nearestCritterDist: animalRes.nearestCritterDist,
  };
}
// #endregion
