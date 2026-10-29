// ============================================================================
// MODULE: World / Systems / Boids & Wildlife System
// DESIGN: Autonomous flocking birds and ground animal state machine (SRP)
// SUMMARY: Simulates 3D Reynolds boids (separation, alignment, cohesion, roosting,
//          player startling) and reactive ground animals (rabbits, squirrels, deer, sheep)
//          with night sleeping wake-up noise meters, rain shelter seeking, and hunting/looting.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import {
  WATER_LEVEL,
  PLAYABLE_RADIUS,
} from '../domain/landmarksRegistry';
import { hash2D } from '../domain/noiseAndMath';
import { groundHeightAt } from './terrainAndBiomeSystem';
import type {
  InventoryItemId,
  IPlayerState,
  IRideableHorseState,
} from '../domain/worldTypes';

export type GroundAnimalSpecies = 'rabbit' | 'squirrel' | 'deer' | 'sheep';

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
 * Summary: Reactive ground animal state (rabbits, squirrels, deer, and sheep).
 * Design: Implements a state machine ('grazing' | 'curious' | 'fleeing') with
 *         night sleeping wake-up noise meter, rain shelter seeking, and hunting/corpse looting.
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
  isFleeing?: boolean;
  fleeCooldown: number;
  isResting: boolean;
  wakeMeter: number; // 0..1 invisible noise wake-up meter while sleeping at night
  wokenUpTimer: number; // > 0 when awakened by player noise at night
  isDead?: boolean; // true when hunted/killed by arrow or sword
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
  }
}

/**
 * Summary: Marks an animal as killed (stops movement and lies on its side).
 */
export function killGroundAnimal(animal: ISmallAnimalState): void {
  if (animal.isDead) return;
  animal.isDead = true;
  animal.isLooted = false;
  animal.vx = 0;
  animal.vz = 0;
  animal.y = Math.max(WATER_LEVEL + 0.05, groundHeightAt(animal.x, animal.z));
  animal.isResting = false;
  animal.isSeekingShelter = false;
  animal.isFleeing = false;
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
function findNearestShelterPoint(x: number, z: number): { x: number; z: number } {
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
 * Summary: Creates the initial deterministic population of ground animals (rabbits, squirrels, deer, sheep).
 */
export function createInitialSmallAnimals(): ISmallAnimalState[] {
  const animals: ISmallAnimalState[] = [];
  const spawnCandidates: Array<{ x: number; z: number; species: GroundAnimalSpecies }> = [
    // Rabbits in meadows & trails (10)
    { x: 14, z: 26, species: 'rabbit' },
    { x: -22, z: 18, species: 'rabbit' },
    { x: 28, z: -18, species: 'rabbit' },
    { x: -38, z: -12, species: 'rabbit' },
    { x: 46, z: 34, species: 'rabbit' },
    { x: -52, z: 32, species: 'rabbit' },
    { x: 12, z: -48, species: 'rabbit' },
    { x: -18, z: -42, species: 'rabbit' },
    { x: 64, z: 22, species: 'rabbit' },
    { x: -68, z: -24, species: 'rabbit' },
    // Squirrels in eastern birch grove & woodland (8)
    { x: 72, z: -12, species: 'squirrel' },
    { x: 86, z: 18, species: 'squirrel' },
    { x: 96, z: -8, species: 'squirrel' },
    { x: 108, z: -24, species: 'squirrel' },
    { x: 82, z: -38, species: 'squirrel' },
    { x: 115, z: 8, species: 'squirrel' },
    { x: 62, z: -28, species: 'squirrel' },
    { x: 74, z: -48, species: 'squirrel' },
    // Forest Deer herd (6)
    { x: -48, z: 18, species: 'deer' },
    { x: -54, z: 24, species: 'deer' },
    { x: 42, z: -48, species: 'deer' },
    { x: 48, z: -42, species: 'deer' },
    { x: -25, z: 45, species: 'deer' },
    { x: 35, z: 38, species: 'deer' },
    // Valley Grazing Sheep flock (6)
    { x: -112, z: 142, species: 'sheep' },
    { x: -108, z: 146, species: 'sheep' },
    { x: -115, z: 148, species: 'sheep' },
    { x: 24, z: 178, species: 'sheep' },
    { x: 28, z: 182, species: 'sheep' },
    { x: 132, z: 108, species: 'sheep' },
  ];

  for (let i = 0; i < spawnCandidates.length; i++) {
    const c = spawnCandidates[i];
    const gy = groundHeightAt(c.x, c.z);
    const shelter = findNearestShelterPoint(c.x, c.z);
    animals.push({
      id: i,
      species: c.species,
      x: c.x,
      y: Math.max(WATER_LEVEL + 0.2, gy),
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
      isFleeing: false,
      fleeCooldown: 0,
      isResting: false,
      wakeMeter: 0,
      wokenUpTimer: 0,
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
 *         on sleeping or grazing animals without waking/startling them.
 */
export function computePlayerNoiseRateAtDistance(
  playerOrDist: IPlayerState | number,
  distOrSpeed: number,
  isCrouchingArg = false,
  isAttackingArg = false
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

  const hearingRadius = 20.0;
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

/**
 * Summary: Steps reactive ground animals for a frame delta `dt`.
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

    // Check mounted/nearby galloping horse threat
    let nearestThreatX = playerX;
    let nearestThreatZ = playerZ;
    let minThreatDist = distP;
    for (let h = 0; h < horses.length; h++) {
      const hr = horses[h];
      if (hr.speed > 1.5) {
        const dH = Math.hypot(a.x - hr.x, a.z - hr.z);
        if (dH < minThreatDist) {
          minThreatDist = dH;
          nearestThreatX = hr.x;
          nearestThreatZ = hr.z;
        }
      }
    }

    // Nighttime Sleeping & Invisible Wake-Up Noise Meter (`מד התעוררות בלתי נראה`)
    if (isNightRest && (a.wokenUpTimer ?? 0) <= 0 && a.fleeCooldown <= 0) {
      const noiseRate = computePlayerNoiseRateAtDistance(
        distP,
        playerSpeed,
        isPlayerSneaking,
        isAttacking
      );
      const nextWake = Math.max(0, Math.min(1, (a.wakeMeter ?? 0) + noiseRate * safeDt));
      a.wakeMeter = nextWake;

      if (nextWake >= 1.0) {
        // Too much noise around the sleeping animal -> wakes up and flees!
        a.isResting = false;
        a.wokenUpTimer = 8.0;
        a.alertLevel = 'fleeing';
        a.isFleeing = true;
        a.fleeCooldown = 4.5;
        scamperedCritterCount++;
      } else {
        // Still sleeping peacefully
        a.isResting = true;
        a.isSeekingShelter = false;
        a.alertLevel = 'grazing';
        a.isFleeing = false;
        a.vx *= 0.7;
        a.vz *= 0.7;
        continue;
      }
    } else if (!isNightRest) {
      a.wakeMeter = Math.max(0, (a.wakeMeter ?? 0) - 0.5 * safeDt);
    }

    // Daytime / Awakened threat detection (respecting Ctrl stealth crouch!)
    const fleeRadius = isPlayerSneaking ? 2.6 : a.species === 'deer' ? 13.5 : 10.5;
    const curiousRadius = isPlayerSneaking ? 6.5 : 18.0;

    if (
      minThreatDist < fleeRadius &&
      (!isPlayerSneaking || playerSpeed > 0.35 || minThreatDist < 1.9)
    ) {
      if (a.alertLevel !== 'fleeing') {
        scamperedCritterCount++;
      }
      a.alertLevel = 'fleeing';
      a.isFleeing = true;
      a.fleeCooldown = 3.2;
      a.isResting = false;
      a.isSeekingShelter = false;
    } else if (a.fleeCooldown > 0) {
      a.fleeCooldown = Math.max(0, a.fleeCooldown - safeDt);
      if (a.fleeCooldown <= 0) {
        a.alertLevel = minThreatDist < curiousRadius ? 'curious' : 'grazing';
        a.isFleeing = false;
      } else {
        a.isFleeing = true;
      }
    } else if (minThreatDist < curiousRadius) {
      a.alertLevel = 'curious';
      a.isFleeing = false;
    } else {
      a.alertLevel = 'grazing';
      a.isFleeing = false;
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
      a.isResting = false;
      a.isSeekingShelter = false;
    } else if (isRaining) {
      // Rain Shelter Behavior: animals seek cover under the nearest tree canopy!
      a.isSeekingShelter = true;
      if (a.shelterTargetX === undefined || a.shelterTargetZ === undefined) {
        const sh = findNearestShelterPoint(a.x, a.z);
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
      }
    } else if (a.alertLevel === 'curious') {
      a.isSeekingShelter = false;
      a.isResting = false;
      a.vx *= 0.8;
      a.vz *= 0.8;
      a.yaw = Math.atan2(playerX - a.x, playerZ - a.z);
      a.hopPhase += safeDt * 3.0;
    } else {
      a.isSeekingShelter = false;
      a.isResting = false;
      const wanderSeed = hash2D(a.id * 13.7, Math.floor(elapsedTime * 0.45));
      const pauseMove = wanderSeed > 0.55;
      if (pauseMove) {
        a.vx *= 0.82;
        a.vz *= 0.82;
        a.hopPhase += safeDt * 2.0;
      } else {
        const targetAngle = wanderSeed * Math.PI * 2;
        const homePullX = (a.homeX - a.x) * 0.15;
        const homePullZ = (a.homeZ - a.z) * 0.15;
        const grazeSpeed =
          a.species === 'deer' ? 1.85 : a.species === 'sheep' ? 1.35 : 1.75;
        a.vx = Math.cos(targetAngle) * grazeSpeed + homePullX;
        a.vz = Math.sin(targetAngle) * grazeSpeed + homePullZ;
        a.yaw = Math.atan2(a.vx, a.vz);
        a.hopPhase += safeDt * 8.5;
      }
    }

    const nextX = a.x + a.vx * safeDt;
    const nextZ = a.z + a.vz * safeDt;
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
