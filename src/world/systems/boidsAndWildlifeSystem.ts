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
  SOLID_BUILDING_BOXES,
} from '../domain/landmarksRegistry';
import { hash2D } from '../domain/noiseAndMath';
import { groundHeightAt, getWorldObstacles } from './terrainAndBiomeSystem';
import type {
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
  | 'jaguar';

export type AnimalAiBehavior =
  | 'sleeping'
  | 'grazing'
  | 'wandering'
  | 'sitting'
  | 'listening'
  | 'stalking'
  | 'roaring'
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
  wingPhase: number;
  startleTimer: number; // > 0 when scattering away from player/horse
  fleeTimer: number;    // alias synced with startleTimer for backwards compatibility
  roosting: boolean;    // true when resting at night
  homeX: number;
  homeZ: number;
}
export type BoidBirdState = IBoidBirdState;

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
  stimulusX?: number;
  stimulusZ?: number;
  caveIndex?: number;
  isFleeing?: boolean;
  fleeCooldown: number;
  isResting: boolean;
  wakeMeter: number; // 0..1 invisible noise wake-up meter while sleeping at night
  wokenUpTimer: number; // > 0 when awakened by player noise at night
  hp?: number; // Current invisible health points (multi-arrow survival)
  maxHp?: number; // Maximum invisible health points for this species
  hitReactionTimer?: number; // Brief flinch/aggro timer when struck by an arrow or sword
  isDead?: boolean; // true when hunted/killed after hp reaches 0
  isLooted?: boolean; // true after player collects loot with [E]
}
export type SmallAnimalState = ISmallAnimalState;
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

/**
 * Summary: Returns the active live world ground animals registry for combat hit checks and [E] looting.
 */
export function getActiveWorldAnimals(): ISmallAnimalState[] {
  return activeWorldAnimalsRegistry;
}

/**
 * Summary: Sets the active live world ground animals registry.
 */
export function setActiveWorldAnimals(animals: ISmallAnimalState[]): void {
  activeWorldAnimalsRegistry = animals;
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
  if (isSleeping) {
    switch (species) {
      case 'deer':
        return { visionRange: 0, hearingRadius: 11.5 };
      case 'bear':
        return { visionRange: 0, hearingRadius: 10.5 };
      case 'jaguar':
        return { visionRange: 0, hearingRadius: 12.0 };
      case 'crocodile':
        return { visionRange: 0, hearingRadius: 9.5 };
      default:
        return { visionRange: 0, hearingRadius: 10.0 };
    }
  }
  switch (species) {
    case 'deer':
      return { visionRange: 20.0, hearingRadius: 23.0 };
    case 'bear':
      return { visionRange: 18.0, hearingRadius: 22.0 };
    case 'jaguar':
      return { visionRange: 22.0, hearingRadius: 24.0 };
    case 'crocodile':
      return { visionRange: 15.0, hearingRadius: 16.0 };
    case 'sheep':
      return { visionRange: 14.0, hearingRadius: 17.0 };
    default:
      return { visionRange: 14.0, hearingRadius: 18.0 };
  }
}

/**
 * Summary: Returns relative size/dominance rank for predator vs. predator/threat intimidation checks.
 */
export function getAnimalSizeRank(species: GroundAnimalSpecies): number {
  switch (species) {
    case 'bear':
      return 4;
    case 'jaguar':
      return 3;
    case 'crocodile':
      return 3;
    case 'deer':
      return 2;
    case 'sheep':
      return 2;
    default:
      return 1;
  }
}

export function isPredatorSpecies(species: GroundAnimalSpecies): boolean {
  return species === 'bear' || species === 'jaguar' || species === 'crocodile';
}
// #endregion

// ======================== HUNTING & LOOTING HELPERS ======================== \\
// #region Hunting & Looting Helpers
/**
 * Summary: Returns localized Hebrew species name for HUD prompts.
 */
export function getAnimalSpeciesNameHe(species: GroundAnimalSpecies): string {
  switch (species) {
    case 'rabbit':
      return 'ארנב';
    case 'squirrel':
      return 'סנאי';
    case 'deer':
      return 'אייל';
    case 'sheep':
      return 'כבשה';
    case 'bear':
      return 'דוב';
    case 'crocodile':
      return 'תנין';
    case 'jaguar':
      return 'יגואר';
  }
}

/**
 * Summary: Returns the deterministic loot drops and Hebrew HUD notification message for a hunted animal.
 * Design: Every animal yields meat + its specific hide type; deer also yield antlers.
 */
export function getAnimalLootDrops(species: GroundAnimalSpecies): {
  readonly itemIds: readonly InventoryItemId[];
  readonly itemLabelsHe: readonly string[];
  readonly notificationHe: string;
} {
  switch (species) {
    case 'rabbit':
      return {
        itemIds: ['raw_game_meat', 'small_hide'],
        itemLabelsHe: ['בשר', 'עור קטן'],
        notificationHe: 'נאסף שלל ציד (ארנב): בשר + עור קטן',
      };
    case 'squirrel':
      return {
        itemIds: ['raw_game_meat', 'small_hide'],
        itemLabelsHe: ['בשר', 'עור קטן'],
        notificationHe: 'נאסף שלל ציד (סנאי): בשר + עור קטן',
      };
    case 'sheep':
      return {
        itemIds: ['raw_game_meat', 'sheep_hide'],
        itemLabelsHe: ['בשר', 'צמר'],
        notificationHe: 'נאסף שלל ציד (כבשה): צמר + בשר',
      };
    case 'deer':
      return {
        itemIds: ['raw_game_meat', 'deer_hide', 'deer_antlers'],
        itemLabelsHe: ['בשר', 'עור אייל', 'קרניים'],
        notificationHe: 'נאסף שלל ציד (אייל): בשר + עור אייל + קרניים',
      };
    case 'bear':
      return {
        itemIds: ['raw_game_meat', 'deer_hide'],
        itemLabelsHe: ['בשר ציד עשיר', 'פרוות דוב עבה'],
        notificationHe: 'נאסף שלל ציד (דוב): בשר ציד + פרוות דוב עבה',
      };
    case 'crocodile':
      return {
        itemIds: ['raw_game_meat', 'deer_hide'],
        itemLabelsHe: ['בשר ציד', 'עור קשקשים משוריין'],
        notificationHe: 'נאסף שלל ציד (תנין): בשר ציד + עור קשקשים משוריין',
      };
    case 'jaguar':
      return {
        itemIds: ['raw_game_meat', 'deer_hide'],
        itemLabelsHe: ['בשר ציד', 'פרוות יגואר מנומרת'],
        notificationHe: 'נאסף שלל ציד (יגואר): בשר ציד + פרוות יגואר מנומרת',
      };
  }
}

/**
 * Summary: Returns the maximum invisible health points (`maxHp`, in arrow hits) for each species.
 * Design: Bears require many arrows (8), crocodiles (6), jaguars fewer than bears (4),
 *         deer (3), sheep (2), and small critters (1). Health is strictly internal (no UI bars).
 */
export function getAnimalMaxHp(species: GroundAnimalSpecies): number {
  switch (species) {
    case 'bear':
      return 8;
    case 'crocodile':
      return 6;
    case 'jaguar':
      return 4;
    case 'deer':
      return 3;
    case 'sheep':
      return 2;
    case 'rabbit':
    case 'squirrel':
    default:
      return 1;
  }
}

/**
 * Summary: Marks an animal as killed (stops movement and lies on its side).
 */
export function killGroundAnimal(animal: ISmallAnimalState): void {
  if (animal.isDead) return;
  animal.hp = 0;
  animal.isDead = true;
  animal.isLooted = false;
  animal.vx = 0;
  animal.vz = 0;
  animal.y = Math.max(WATER_LEVEL + 0.05, groundHeightAt(animal.x, animal.z));
  animal.isResting = false;
  animal.isSeekingShelter = false;
  animal.isFleeing = false;
  animal.aiBehavior = 'dead';
}

/**
 * Summary: Applies combat damage to an animal's invisible health (`hp`).
 *          Only kills the animal when `hp` reaches 0; otherwise triggers a realistic flee or predator charge reaction.
 */
export function damageGroundAnimal(
  animal: ISmallAnimalState,
  damage = 1,
  attackerX?: number,
  attackerZ?: number
): {
  readonly killed: boolean;
  readonly remainingHp: number;
  readonly maxHp: number;
} {
  const maxHp = animal.maxHp ?? getAnimalMaxHp(animal.species);
  animal.maxHp = maxHp;
  if (animal.isDead) {
    return { killed: true, remainingHp: 0, maxHp };
  }
  const currentHp = animal.hp ?? maxHp;
  const remainingHp = Math.max(0, currentHp - Math.max(1, damage));
  animal.hp = remainingHp;
  animal.hitReactionTimer = 0.45;

  if (remainingHp <= 0) {
    killGroundAnimal(animal);
    return { killed: true, remainingHp: 0, maxHp };
  }

  // Wounded but still alive: wake immediately and react to the attacker
  animal.isResting = false;
  animal.isSeekingShelter = false;
  animal.wokenUpTimer = 8.0;
  if (attackerX !== undefined && attackerZ !== undefined) {
    animal.stimulusX = attackerX;
    animal.stimulusZ = attackerZ;
  }

  if (!isPredatorSpecies(animal.species) || remainingHp <= 1) {
    animal.alertLevel = 'fleeing';
    animal.aiBehavior = 'fleeing';
    animal.isFleeing = true;
    animal.fleeCooldown = 4.5;
    animal.listenTimer = 0;
  } else {
    // Healthy bear/jaguar/crocodile struck from afar roars/charges toward the hunter!
    animal.alertLevel = 'curious';
    animal.aiBehavior = 'charging';
    animal.isFleeing = false;
    animal.fleeCooldown = 0;
  }

  return { killed: false, remainingHp, maxHp };
}

/**
 * Summary: Finds the nearest dead, unlooted animal within interaction range (`maxDist`).
 */
export function findNearestDeadLootableAnimal(
  playerX: number,
  playerZ: number,
  animals: readonly ISmallAnimalState[] = activeWorldAnimalsRegistry,
  maxDist = 3.4
): ISmallAnimalState | null {
  let best: ISmallAnimalState | null = null;
  let bestDist = maxDist;
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    if (!a.isDead || a.isLooted) continue;
    const d = Math.hypot(a.x - playerX, a.z - playerZ);
    if (d <= bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

/**
 * Summary: Loots a dead animal into the player's inventory and marks the corpse as looted.
 */
export function lootDeadAnimal(
  playerState: IPlayerState,
  animal: ISmallAnimalState
): {
  readonly ok: boolean;
  readonly species: GroundAnimalSpecies;
  readonly addedItemIds: readonly InventoryItemId[];
  readonly addedItems: readonly InventoryItemId[];
  readonly notificationHe: string;
} {
  if (!animal.isDead || animal.isLooted) {
    return {
      ok: false,
      species: animal.species,
      addedItemIds: [],
      addedItems: [],
      notificationHe: '',
    };
  }
  animal.isLooted = true;
  const drops = getAnimalLootDrops(animal.species);
  if (!playerState.ownedItemIds) {
    playerState.ownedItemIds = [];
  }
  for (const itemId of drops.itemIds) {
    if (!playerState.ownedItemIds.includes(itemId)) {
      playerState.ownedItemIds.push(itemId);
    }
  }
  return {
    ok: true,
    species: animal.species,
    addedItemIds: drops.itemIds,
    addedItems: drops.itemIds,
    notificationHe: drops.notificationHe,
  };
}
// #endregion

// ======================== STATE INITIALIZATION ======================== \\
// #region State Initialization
function findNearestShelterPoint(
  x: number,
  z: number,
  species?: GroundAnimalSpecies,
  caveIndex?: number
): { x: number; z: number } {
  if (species === 'bear') {
    let targetCave = BEAR_MOUNTAIN_CAVES[0];
    if (caveIndex !== undefined && BEAR_MOUNTAIN_CAVES[caveIndex]) {
      targetCave = BEAR_MOUNTAIN_CAVES[caveIndex];
    } else {
      let bestCaveDistSq = Infinity;
      for (let i = 0; i < BEAR_MOUNTAIN_CAVES.length; i++) {
        const c = BEAR_MOUNTAIN_CAVES[i];
        const dSq = (c.x - x) * (c.x - x) + (c.z - z) * (c.z - z);
        if (dSq < bestCaveDistSq) {
          bestCaveDistSq = dSq;
          targetCave = c;
        }
      }
    }

    // 2-Stage Waypoint Pathing into the Carved Mountain Cave ("חור בהר"):
    // Transform bear position into cave-local space (+Z is the open front entrance portal).
    // If the bear is outside the front corridor, guide it to the entrance portal first so it
    // never rams into the side or back mountain cliff walls!
    const dx = x - targetCave.x;
    const dz = z - targetCave.z;
    const cosY = Math.cos(targetCave.facingYaw);
    const sinY = Math.sin(targetCave.facingYaw);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY;

    if (Math.abs(lx) > 2.8 || lz < -1.5 || (lz > 4.8 && Math.abs(lx) > 2.1)) {
      return { x: targetCave.entranceX, z: targetCave.entranceZ };
    }
    return { x: targetCave.x, z: targetCave.z };
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
 * Summary: Validates that an animal spawn coordinate is neither within `minSafeRadius` around the player
 *          (preventing pop-in behind the player's back) nor inside the player's forward field-of-view cone.
 */
export function isSafeAnimalSpawnPosition(
  x: number,
  z: number,
  playerX = WORLD_SPAWN.x,
  playerZ = WORLD_SPAWN.z,
  playerYaw = WORLD_SPAWN.yaw,
  minSafeRadius = 56,
  frontConeDist = 115
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
    // Relocate along the opposite/flanking direction from the player's view while staying in valid terrain
    const baseAngle = playerYaw + Math.PI + ((i % 5) - 2) * 0.38;
    const safeDist = 68 + (i % 4) * 14;
    const nx = playerX + Math.sin(baseAngle) * safeDist;
    const nz = playerZ + Math.cos(baseAngle) * safeDist;
    const gy = groundHeightAt(nx, nz);
    if (gy > WATER_LEVEL + 0.25 && Math.hypot(nx, nz) < PLAYABLE_RADIUS - 25) {
      a.x = nx;
      a.z = nz;
      a.homeX = nx;
      a.homeZ = nz;
      a.y = gy;
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
      });
    }
  }
  return birds;
}

/**
 * Summary: Creates the initial deterministic population of ground animals matched to their authentic biomes,
 *          strictly outside the player's safe radius and outside the initial forward view cone:
 *          - Rural valley farms & meadows: Sheep & Rabbits
 *          - Birch grove & eastern woodland: Squirrels
 *          - Deep western & southern forests: Deer
 *          - Southwest Desert & Deep Southern Forest: Jaguars (4)
 *          - Forested mountain caves ("חור בהר"): Bears (3, linked to BEAR_MOUNTAIN_CAVES)
 *          - Dedicated Southern River Bend (`CROCODILE_RIVER_BEND_POS`): Crocodiles (5, far from populated areas)
 */
export function createInitialSmallAnimals(): ISmallAnimalState[] {
  const animals: ISmallAnimalState[] = [];
  const spawnCandidates: Array<{
    x: number;
    z: number;
    species: GroundAnimalSpecies;
    caveIndex?: number;
  }> = [
    // Rabbits in rural meadows & pastoral trails outside safe radius & view cone (8)
    { x: 68, z: 26, species: 'rabbit' },
    { x: -66, z: 18, species: 'rabbit' },
    { x: 62, z: -22, species: 'rabbit' },
    { x: -64, z: -24, species: 'rabbit' },
    { x: 74, z: 54, species: 'rabbit' },
    { x: -72, z: 58, species: 'rabbit' },
    { x: 84, z: 48, species: 'rabbit' },
    { x: -84, z: 48, species: 'rabbit' },
    // Squirrels in eastern birch grove & woodland trees (8)
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
    // Forest & Mountain Cave Brown Bears — strictly in forest regions outside their carved caves (3)
    { x: -85, z: -56, species: 'bear', caveIndex: 0 },
    { x: -164, z: -45, species: 'bear', caveIndex: 1 },
    { x: -135, z: 172, species: 'bear', caveIndex: 2 },
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
  ];

  for (let i = 0; i < spawnCandidates.length; i++) {
    const c = spawnCandidates[i];
    const gy = groundHeightAt(c.x, c.z);
    const shelter = findNearestShelterPoint(c.x, c.z, c.species, c.caveIndex);
    const maxHp = getAnimalMaxHp(c.species);
    animals.push({
      id: i,
      species: c.species,
      x: c.x,
      y: Math.max(WATER_LEVEL + 0.08, gy),
      z: c.z,
      vx: 0,
      vz: 0,
      yaw: (i * 1.37) % (Math.PI * 2),
      hopPhase: (i * 0.9) % (Math.PI * 2),
      homeX: c.x,
      homeZ: c.z,
      shelterTargetX: shelter.x,
      shelterTargetZ: shelter.z,
      isSeekingShelter: false,
      alertLevel: 'grazing',
      aiBehavior: 'grazing',
      listenTimer: 0,
      listenCooldown: 0,
      actionTimer: 0,
      caveIndex: c.caveIndex,
      isFleeing: false,
      fleeCooldown: 0,
      isResting: false,
      wakeMeter: 0,
      wokenUpTimer: 0,
      hp: maxHp,
      maxHp,
      hitReactionTimer: 0,
      isDead: false,
      isLooted: false,
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

function rotateYawSmoothlyToward(currentYaw: number, targetYaw: number, rate: number, dt: number): number {
  let diffYaw = targetYaw - currentYaw;
  while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
  while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
  return currentYaw + diffYaw * Math.min(1, dt * rate);
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

  // 1. Solid building & carved mountain cave cliff walls (SOLID_BUILDING_BOXES)
  for (let i = 0; i < SOLID_BUILDING_BOXES.length; i++) {
    const b = SOLID_BUILDING_BOXES[i];
    if (
      x + radius > b.minX &&
      x - radius < b.maxX &&
      z + radius > b.minZ &&
      z - radius < b.maxZ
    ) {
      const penLeft = x + radius - b.minX;
      const penRight = b.maxX - (x - radius);
      const penBack = z + radius - b.minZ;
      const penFront = b.maxZ - (z - radius);
      const minPen = Math.min(penLeft, penRight, penBack, penFront);
      if (minPen === penLeft) x = b.minX - radius;
      else if (minPen === penRight) x = b.maxX + radius;
      else if (minPen === penBack) z = b.minZ - radius;
      else z = b.maxZ + radius;
      hitObstacle = true;
    }
  }

  // 2. Nearby world rocks and trunks
  const obstacles = getWorldObstacles();
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
  rainIntensity = 0
): { scamperedCritterCount: number; nearestCritterDist: number } {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const isNightRest = daylightFactor < 0.35;
  const isRaining = rainIntensity > 0.15;
  let scamperedCritterCount = 0;
  let nearestCritterDist = Infinity;

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];

    // Dead animals do not move at all and remain anchored on top of the terrain!
    if (a.isDead) {
      a.vx = 0;
      a.vz = 0;
      a.y = Math.max(WATER_LEVEL + 0.05, groundHeightAt(a.x, a.z));
      a.isResting = false;
      a.isSeekingShelter = false;
      a.isFleeing = false;
      a.aiBehavior = 'dead';
      continue;
    }

    const dxP = a.x - playerX;
    const dzP = a.z - playerZ;
    const distP = Math.hypot(dxP, dzP);
    if (distP < nearestCritterDist) {
      nearestCritterDist = distP;
    }

    if (safeDt <= 0) continue;

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

    // -------------------------------------------------------------------------
    // 1. NIGHTTIME SLEEPING & INVISIBLE WAKE-UP NOISE METER
    //    When sleeping: visionRange = 0 (eyes closed!) and hearingRadius is reduced!
    // -------------------------------------------------------------------------
    if (isNightRest && (a.wokenUpTimer ?? 0) <= 0 && a.fleeCooldown <= 0) {
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
        a.vx *= 0.7;
        a.vz *= 0.7;
        continue;
      }
    } else if (!isNightRest) {
      a.wakeMeter = Math.max(0, (a.wakeMeter ?? 0) - 0.5 * safeDt);
    }

    // -------------------------------------------------------------------------
    // 2. PREDATOR AI (BEAR, JAGUAR, CROCODILE)
    //    - Bear returns to its mountain cave when raining
    //    - Flees if intimidated by a larger predator or overwhelming threat
    //    - Stalks, roars, charges, and attacks prey when hungry/alert
    // -------------------------------------------------------------------------
    if (isPredatorSpecies(a.species)) {
      const myRank = getAnimalSizeRank(a.species);
      let largerThreatX = 0;
      let largerThreatZ = 0;
      let largerThreatDist = Infinity;

      // Check if a larger predator is nearby (e.g., bear threatening jaguar/crocodile)
      for (let j = 0; j < animals.length; j++) {
        if (i === j) continue;
        const other = animals[j];
        if (other.isDead || !isPredatorSpecies(other.species)) continue;
        if (getAnimalSizeRank(other.species) > myRank) {
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
      if (isAttacking && distP < 6.5 && distP < largerThreatDist) {
        largerThreatDist = distP;
        largerThreatX = playerX;
        largerThreatZ = playerZ;
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
        const fleeSpd = a.species === 'jaguar' ? 8.8 : a.species === 'bear' ? 6.8 : 5.2;
        a.vx = (awayX / len) * fleeSpd;
        a.vz = (awayZ / len) * fleeSpd;
        a.yaw = Math.atan2(a.vx, a.vz);
        a.hopPhase += safeDt * 14.0;
        a.aiBehavior = 'fleeing';
        a.isResting = false;
        a.isSeekingShelter = false;
      } else if (a.species === 'bear' && isRaining) {
        // Bear returns to its carved mountain cave ("חור בהר") when it rains via 2-stage entrance pathing!
        const targetCave = BEAR_MOUNTAIN_CAVES[a.caveIndex ?? 0] ?? BEAR_MOUNTAIN_CAVES[0];
        const distToChamberCenter = Math.hypot(targetCave.x - a.x, targetCave.z - a.z);
        const caveWaypoint = findNearestShelterPoint(a.x, a.z, 'bear', a.caveIndex);
        a.shelterTargetX = targetCave.x;
        a.shelterTargetZ = targetCave.z;
        a.isSeekingShelter = true;

        if (distToChamberCenter > 2.2) {
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
          // Inside the carved mountain cave chamber: lie down and rest out of the rain
          a.vx *= 0.5;
          a.vz *= 0.5;
          if (Math.hypot(a.vx, a.vz) < 0.08) {
            a.vx = 0;
            a.vz = 0;
          }
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

        for (let j = 0; j < animals.length; j++) {
          if (i === j) continue;
          const other = animals[j];
          if (other.isDead || isPredatorSpecies(other.species)) continue;
          const dPrey = Math.hypot(other.x - a.x, other.z - a.z);
          if (dPrey < bestPreyDist) {
            bestPreyDist = dPrey;
            preyX = other.x;
            preyZ = other.z;
            foundPrey = true;
          }
        }

        const provokedByShot = (a.wokenUpTimer ?? 0) > 0 && (a.hp ?? a.maxHp ?? 1) < (a.maxHp ?? 1);
        const playerDetectRange = provokedByShot ? 42.0 : isPlayerSneaking ? 4.2 : 14.5;
        if (distP < playerDetectRange && distP < (provokedByShot ? 42.0 : bestPreyDist)) {
          bestPreyDist = distP;
          preyX = playerX;
          preyZ = playerZ;
          foundPrey = true;
        }

        if (foundPrey) {
          a.isResting = false;
          a.alertLevel = 'curious';
          const toPreyX = preyX - a.x;
          const toPreyZ = preyZ - a.z;
          const len = Math.hypot(toPreyX, toPreyZ) || 1;
          const targetYaw = Math.atan2(toPreyX, toPreyZ);

          if (bestPreyDist <= 2.6) {
            // Close quarters -> Attack!
            a.aiBehavior = 'attacking';
            a.vx *= 0.5;
            a.vz *= 0.5;
            a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 8.0, safeDt);
            a.hopPhase += safeDt * 12.0;
          } else if (bestPreyDist <= 11.5) {
            // Charge range -> brief roar then full charge!
            if (
              a.aiBehavior !== 'charging' &&
              a.aiBehavior !== 'roaring' &&
              a.aiBehavior !== 'attacking' &&
              (a.actionTimer ?? 0) <= 0
            ) {
              a.aiBehavior = 'roaring';
              a.actionTimer = 0.55;
              a.vx = 0;
              a.vz = 0;
              a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 7.0, safeDt);
            } else if ((a.actionTimer ?? 0) > 0 && a.aiBehavior === 'roaring') {
              a.vx *= 0.6;
              a.vz *= 0.6;
              a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 7.0, safeDt);
            } else {
              a.aiBehavior = 'charging';
              const chargeSpd =
                a.species === 'jaguar' ? 7.8 : a.species === 'bear' ? 6.2 : 4.8;
              a.vx = (toPreyX / len) * chargeSpd;
              a.vz = (toPreyZ / len) * chargeSpd;
              a.yaw = Math.atan2(a.vx, a.vz);
              a.hopPhase += safeDt * 15.0;
            }
          } else {
            // Outer detection ring -> stealthy stalk / approach
            a.aiBehavior = 'stalking';
            const stalkSpd =
              a.species === 'jaguar' ? 2.6 : a.species === 'bear' ? 2.4 : 1.9;
            a.vx = (toPreyX / len) * stalkSpd;
            a.vz = (toPreyZ / len) * stalkSpd;
            a.yaw = Math.atan2(a.vx, a.vz);
            a.hopPhase += safeDt * 7.5;
          }
        } else {
          // Autonomous predator patrol, sitting, foraging/eating, or resting
          a.alertLevel = 'grazing';
          const timeWindow = Math.floor(elapsedTime * 0.22 + a.id * 1.73);
          const seed = hash2D(a.id * 19.3, timeWindow);
          if (seed > 0.72) {
            a.isResting = false;
            a.aiBehavior = 'sitting';
            a.vx *= Math.exp(-8 * safeDt);
            a.vz *= Math.exp(-8 * safeDt);
            if (Math.hypot(a.vx, a.vz) < 0.06) {
              a.vx = 0;
              a.vz = 0;
            }
          } else if (seed > 0.46) {
            a.isResting = false;
            a.aiBehavior = 'grazing';
            a.vx *= Math.exp(-8 * safeDt);
            a.vz *= Math.exp(-8 * safeDt);
            if (Math.hypot(a.vx, a.vz) < 0.06) {
              a.vx = 0;
              a.vz = 0;
            }
          } else {
            a.isResting = false;
            a.aiBehavior = 'wandering';
            const targetAngle = (seed / 0.46) * Math.PI * 2;
            const homePullX = (a.homeX - a.x) * 0.14;
            const homePullZ = (a.homeZ - a.z) * 0.14;
            const patrolSpd = a.species === 'crocodile' ? 1.15 : 1.65;
            const desiredVx = Math.cos(targetAngle) * patrolSpd + homePullX;
            const desiredVz = Math.sin(targetAngle) * patrolSpd + homePullZ;
            const blend = Math.min(1, safeDt * 4.0);
            a.vx += (desiredVx - a.vx) * blend;
            a.vz += (desiredVz - a.vz) * blend;
            a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 4.5, safeDt);
            a.hopPhase += safeDt * 6.0;
          }
        }
      }

      const rawNextX = a.x + a.vx * safeDt;
      const rawNextZ = a.z + a.vz * safeDt;
      const bodyRadius = a.species === 'bear' ? 1.15 : a.species === 'crocodile' ? 0.95 : 0.8;
      const resolved = resolveAnimalObstacleCollision(rawNextX, rawNextZ, bodyRadius);
      const nextX = resolved.x;
      const nextZ = resolved.z;
      const nextGroundY = groundHeightAt(nextX, nextZ);
      const minAllowedY = a.species === 'crocodile' ? WATER_LEVEL - 0.35 : WATER_LEVEL + 0.15;
      if (nextGroundY > minAllowedY && Math.hypot(nextX, nextZ) < PLAYABLE_RADIUS - 15) {
        a.x = nextX;
        a.z = nextZ;
        a.y = Math.max(WATER_LEVEL + 0.02, nextGroundY);
        if (resolved.hitObstacle && (Math.abs(a.vx) > 0.1 || Math.abs(a.vz) > 0.1)) {
          a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(nextX - a.x, nextZ - a.z), 6.0, safeDt);
        }
      } else {
        a.vx = -a.vx * 0.6;
        a.vz = -a.vz * 0.6;
        a.yaw = Math.atan2(a.vx, a.vz);
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 3. HERBIVORE & SMALL WILDLIFE AI (DEER, SHEEP, RABBIT, SQUIRREL)
    //    Includes Deer upright listening/evaluating behavior before deciding
    //    whether to return to grazing or flee!
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

    // Also detect nearby predators (bears, jaguars, crocodiles)!
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
    const fleeRadius = isPlayerSneaking ? 2.5 : a.species === 'deer' ? 8.8 : 10.5;
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

    if (a.alertLevel === 'fleeing') {
      const awayX = a.x - nearestThreatX;
      const awayZ = a.z - nearestThreatZ;
      const len = Math.hypot(awayX, awayZ) || 1;
      const fleeSpeed =
        a.species === 'deer'
          ? 9.2
          : a.species === 'squirrel'
            ? 7.8
            : a.species === 'rabbit'
              ? 6.8
              : 5.4;
      a.vx = (awayX / len) * fleeSpeed;
      a.vz = (awayZ / len) * fleeSpeed;
      a.yaw = Math.atan2(a.vx, a.vz);
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
        const shelterMoveSpd = a.species === 'deer' ? 4.2 : a.species === 'sheep' ? 2.8 : 3.6;
        a.vx = (toShX / distSh) * shelterMoveSpd;
        a.vz = (toShZ / distSh) * shelterMoveSpd;
        a.yaw = Math.atan2(a.vx, a.vz);
        a.hopPhase += safeDt * 10.0;
      } else {
        // Reached shelter under tree canopy: huddle quietly out of the rain
        a.vx *= 0.65;
        a.vz *= 0.65;
        a.isResting = true;
        a.aiBehavior = 'sleeping';
      }
    } else if (a.alertLevel === 'curious' || a.aiBehavior === 'listening') {
      a.isSeekingShelter = false;
      a.isResting = false;
      a.aiBehavior = 'listening';
      a.vx *= Math.exp(-12 * safeDt);
      a.vz *= Math.exp(-12 * safeDt);
      if (Math.hypot(a.vx, a.vz) < 0.08) {
        a.vx = 0;
        a.vz = 0;
      }
      const lookX = a.stimulusX ?? nearestThreatX;
      const lookZ = a.stimulusZ ?? nearestThreatZ;
      const targetYaw = Math.atan2(lookX - a.x, lookZ - a.z);
      a.yaw = rotateYawSmoothlyToward(a.yaw, targetYaw, 4.5, safeDt);
    } else {
      a.isSeekingShelter = false;
      a.isResting = false;
      const timeWindow = Math.floor(elapsedTime * 0.28 + a.id * 1.37);
      const wanderSeed = hash2D(a.id * 13.7, timeWindow);
      const pauseThreshold = a.species === 'deer' || a.species === 'sheep' ? 0.42 : 0.55;
      const pauseMove = wanderSeed > pauseThreshold;
      if (pauseMove) {
        a.aiBehavior = 'grazing';
        a.vx *= Math.exp(-10 * safeDt);
        a.vz *= Math.exp(-10 * safeDt);
        if (Math.hypot(a.vx, a.vz) < 0.08) {
          a.vx = 0;
          a.vz = 0;
        }
      } else {
        a.aiBehavior = 'wandering';
        const targetAngle = (wanderSeed / pauseThreshold) * Math.PI * 2;
        const homePullX = (a.homeX - a.x) * 0.14;
        const homePullZ = (a.homeZ - a.z) * 0.14;
        const grazeSpeed =
          a.species === 'deer' ? 1.55 : a.species === 'sheep' ? 1.25 : 1.75;
        const desiredVx = Math.cos(targetAngle) * grazeSpeed + homePullX;
        const desiredVz = Math.sin(targetAngle) * grazeSpeed + homePullZ;
        const blend = Math.min(1, safeDt * 4.5);
        a.vx += (desiredVx - a.vx) * blend;
        a.vz += (desiredVz - a.vz) * blend;
        a.yaw = rotateYawSmoothlyToward(a.yaw, Math.atan2(a.vx, a.vz), 5.0, safeDt);
        a.hopPhase += safeDt * (a.species === 'deer' ? 6.2 : 8.5);
      }
    }

    const rawNextX = a.x + a.vx * safeDt;
    const rawNextZ = a.z + a.vz * safeDt;
    const bodyRadius = a.species === 'deer' ? 0.72 : a.species === 'sheep' ? 0.65 : 0.38;
    const resolved = resolveAnimalObstacleCollision(rawNextX, rawNextZ, bodyRadius);
    const nextX = resolved.x;
    const nextZ = resolved.z;
    const nextGroundY = groundHeightAt(nextX, nextZ);

    if (nextGroundY > WATER_LEVEL + 0.15 && Math.hypot(nextX, nextZ) < PLAYABLE_RADIUS - 15) {
      a.x = nextX;
      a.z = nextZ;
      a.y = nextGroundY;
    } else {
      a.vx = -a.vx * 0.6;
      a.vz = -a.vz * 0.6;
      a.yaw = Math.atan2(a.vx, a.vz);
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

  // --- 1. STEP FLOCKING BIRDS (3D REYNOLDS BOIDS) ---
  const perceptionRadius = 16.0;
  const separationDist = 3.8;

  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const distToPlayer = Math.hypot(b.x - playerX, b.z - playerZ);
    if (distToPlayer < nearestBirdDist) {
      nearestBirdDist = distToPlayer;
    }

    if (safeDt <= 0) continue;

    const birdStartleDist = isPlayerSneaking ? 4.5 : 14.0;
    if (
      distToPlayer < birdStartleDist &&
      (playerSpeed > (isPlayerSneaking ? 3.5 : 2.5) || bowDrawn)
    ) {
      b.startleTimer = 4.0;
      b.fleeTimer = 4.0;
      b.roosting = false;
      startledFlockCount++;
    }

    if (b.startleTimer > 0) {
      b.startleTimer = Math.max(0, b.startleTimer - safeDt);
      b.fleeTimer = b.startleTimer;
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
      if (other.roosting) continue;
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
    b.wingPhase += safeDt * (b.startleTimer > 0 ? 18.0 : 10.5);
  }

  // --- 2. STEP REACTIVE GROUND ANIMALS ---
  const animalRes = stepSmallAnimals(
    animals,
    safeDt,
    elapsedTime,
    playerX,
    playerZ,
    horses,
    daylightFactor,
    undefined,
    playerSpeed,
    isPlayerSneaking,
    isAttacking,
    rainIntensity
  );

  return {
    startledFlockCount,
    scamperedCritterCount: animalRes.scamperedCritterCount,
    nearestBirdDist,
    nearestCritterDist: animalRes.nearestCritterDist,
  };
}
// #endregion
