// ============================================================================
// MODULE: World / Systems / Player Physics
// DESIGN: Player kinematic locomotion, jumping, swimming, ladder climbing, and RPG skills (SRP)
// SUMMARY: Implements 60FPS kinematic player physics, coyote time, jump buffering,
//          obstacle and building collision resolution, water buoyancy, and skill progression.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { t } from '../../locales';
import {
  DEFAULT_STARTER_OWNED_ITEM_IDS,
  type IPlayerState,
  type IPlayerInput,
  type IObstacleCylinder,
  type IRideableHorseState,
  type ICharacterSkillsState,
} from '../domain/worldTypes';
import {
  WATER_LEVEL,
  PLAYABLE_RADIUS,
  WORLD_SPAWN,
  HUNTER_LODGE_POS,
  SURVIVAL_CABIN_SPAWN,
  RIDEABLE_HORSES,
  FORTRESS_Z_OFFSET,
  CHINESE_FORTRESS_POS,
  HILL_WATCHTOWERS,
  FORTRESS_DOORS,
  SOLID_BUILDING_BOXES,
  getNearbySolidBuildingBoxes,
  pointInsideSolidBuildingBox,
  getHillWatchtowerLocalWalls,
  resolveHorizontalBoxCollision,
  FLOATING_ISLAND_STAIR_POS,
  SKY_WIND_GEYSERS,
  VOLCANO_SANCTUM_POS,
  NORDIC_FROST_SHRINE_POS,
  DESERT_PYRAMID_SANCTUARY_POS,
  getLadderById,
  findWatchtowerLadderAt,
  findLookedAtWatchtowerLadder,
} from '../domain/landmarksRegistry';
import { isInsideSouthernMine } from './dwarvenMineAndCaravanSystem';
import { isMonkDoorwayActive } from './monkTempleSystem';
import {
  groundHeightAt,
  isChineseFortressWalkableZone,
  chineseFortressStairHeightAt,
  southernCliffsidePassTrailHeightAt,
  getWaterSurfaceHeightAt,
  walkableHeightAt,
  getSurfaceBiomeAt,
  getSurfaceNormalAt,
  getNearbyWorldObstacles,
  isNavigableOceanForShip, walkableHeightValueAt } from './terrainAndBiomeSystem';
import { isSegmentBlockedBySolidBox } from '../domain/collisionWorld';
import { stepMountedHorseSteering } from './horsePhysicsSystem';
import {
  findSailableShipContainingPoint,
  findSailableShipDisembarkPoint,
  getActiveSailableShip,
  getSpawnedSailableShips,
  isEntityOnSailableShipDeck,
  placeMountOnShipDeckWithoutStacking,
  setActiveSailableShipByTier,
  stepSailableShipPhysics,
} from './sailableShipSystem';
import {
  getActiveWorldAnimals,
  getAnimalStrengthAndLevel,
  damageGroundAnimal,
  isVolcanoBossArenaLocked,
} from './boidsAndWildlifeSystem';
// #endregion

// ======================== INITIALIZERS & LEVEL QUERIES ======================== \\
// #region Initializers & Level Queries
const FZ = FORTRESS_Z_OFFSET;
const GRAVITY = 14.8;
/** Minimum stamina required after hitting 0 before sprinting is allowed again (prevents run-walk-run stutter). */
export const STAMINA_EXHAUSTION_RECOVERY_THRESHOLD = 24;

let activePlayerStateRegistry: IPlayerState | null = null;

/**
 * Summary: Returns the currently active player state instance (if initialized).
 */
export function getPlayerState(): IPlayerState | null {
  return activePlayerStateRegistry;
}

/**
 * Summary: Configures a player state for Survival Mode (waking up inside the Hunter's Lodge cabin
 * with simple clothes, bare hands, 0 gold, no weapons, and no food) vs God Mode (classic full gear).
 */
export function applyGameModeToPlayerState(state: IPlayerState, survivalMode: boolean): IPlayerState {
  state.vx = 0;
  state.vy = 0;
  state.vz = 0;
  state.onGround = true;
  state.isFlying = false;
  state.inWater = false;
  state.isSwimming = false;
  state.climbingLadderId = null;
  state.mountedHorseId = null;
  state.bowDrawn = false;
  state.bowDrawProgress = 0;
  state.openedChestIds = [];
  state.chestContentsById = {};
  state.maxHp = 100;
  state.hp = 100;
  state.maxHunger = 100;
  state.hunger = 100;
  state.maxStamina = 100;
  state.stamina = 100;
  state.staminaExhausted = false;
  state.damageFlashTimer = 0;

  if (survivalMode) {
    const cabinGround = walkableHeightAt(SURVIVAL_CABIN_SPAWN.x, SURVIVAL_CABIN_SPAWN.z);
    state.x = SURVIVAL_CABIN_SPAWN.x;
    state.y = cabinGround.height;
    state.z = SURVIVAL_CABIN_SPAWN.z;
    state.yaw = SURVIVAL_CABIN_SPAWN.yaw;
    state.pitch = SURVIVAL_CABIN_SPAWN.pitch;
    state.mountedHorseYaw = SURVIVAL_CABIN_SPAWN.yaw;
    state.currentBiome = 'cabin';
    state.equippedTool = 'unarmed';
    state.activeWeaponId = 'unarmed';
    state.equippedClothingId = 'simple_tunic';
    state.goldCoins = 0;
    state.ownedItemIds = ['unarmed', 'simple_tunic'];
    state.hotbarSlots = ['unarmed', null, null, null];
    state.favoriteIds = ['unarmed', 'simple_tunic'];
  } else {
    const ground = walkableHeightAt(WORLD_SPAWN.x, WORLD_SPAWN.z);
    state.x = WORLD_SPAWN.x;
    state.y = ground.height;
    state.z = WORLD_SPAWN.z;
    state.yaw = WORLD_SPAWN.yaw;
    state.pitch = WORLD_SPAWN.pitch;
    state.mountedHorseYaw = WORLD_SPAWN.yaw;
    state.currentBiome = 'trail';
    state.equippedTool = 'bow';
    state.activeWeaponId = 'bow';
    state.equippedClothingId = 'ranger_garb';
    state.goldCoins = 280;
    state.ownedItemIds = [...DEFAULT_STARTER_OWNED_ITEM_IDS];
    state.hotbarSlots = ['bow', 'torch', 'sword', 'unarmed'];
    state.favoriteIds = ['bow', 'torch', 'sword', 'arrow_normal', 'arrow_fire', 'arrow_wind', 'unarmed'];
  }
  return state;
}

/**
 * Summary: Steps Health (HP), Hunger, animal attack damage, and damage flash vignette per simulation tick.
 * In Survival Mode (!godMode), hunger drains at a gentle realistic pace, starvation drains HP,
 * well-fed state regenerates HP, and hostile/retaliating animal strikes deal HP damage scaled by
 * the animal's strength and level.
 */
/** Fire damage per second while the player is inside the dragon's breath cone (DR1). */
const DRAGON_FIRE_DAMAGE_PER_SECOND = 18;
/** Downward landing speed (m/s) below which a landing does no damage (about a 7 m fall). */
const FALL_DAMAGE_START_MPS = 12;
/** Landing speed (m/s) at which a fall is lethal (about a 29 m fall). */
const FALL_DAMAGE_LETHAL_MPS = 24;

export function stepSurvivalVitals(
  state: IPlayerState,
  dt: number,
  isSprinting: boolean,
  godMode: boolean
): { starvedOrDied: boolean; tookDamage: boolean } {
  const maxHp = state.maxHp ?? 100;
  const maxHunger = state.maxHunger ?? 100;
  state.maxHp = maxHp;
  state.maxHunger = maxHunger;
  if (state.hp === undefined) state.hp = maxHp;
  if (state.hunger === undefined) state.hunger = maxHunger;
  if ((state.damageFlashTimer ?? 0) > 0) {
    state.damageFlashTimer = Math.max(0, (state.damageFlashTimer ?? 0) - dt * 1.45);
  }

  // If currently in the Survival Death & Rebirth cinematic sequence, step its two-stage timeline:
  // Stage 1 ('dying', 0..2.8s): Dramatic collapse & death banner overlay
  // Stage 2 ('waking', 0..3.6s): Awaken on the Hunter's Cabin bed, sit up, look left/right, and step onto the cabin floor
  if (!godMode && state.deathRespawnPhase) {
    const phase = state.deathRespawnPhase;
    phase.timer += dt;
    state.vx = 0;
    state.vy = 0;
    state.vz = 0;
    state.mountedHorseId = null;

    if (phase.stage === 'dying') {
      state.pitch = Math.max(-1.08, state.pitch - dt * 0.48);
      state.damageFlashTimer = Math.max(0.45, 1.0 - phase.timer * 0.25);
      if (phase.timer >= 2.8) {
        phase.stage = 'waking';
        phase.timer = 0;
        const bedX = HUNTER_LODGE_POS.x - 3.2;
        const bedY = HUNTER_LODGE_POS.height + 0.36;
        const bedZ = HUNTER_LODGE_POS.z + 2.4;
        state.x = bedX;
        state.y = bedY;
        state.z = bedZ;
        state.yaw = 0;
        state.pitch = 1.12;
        state.hp = maxHp;
        state.hunger = Math.round(maxHunger * 0.75);
        state.stamina = state.maxStamina ?? 100;
        state.staminaExhausted = false;
        state.damageFlashTimer = 0;
      }
      return { starvedOrDied: false, tookDamage: false };
    }

    // Stage 2: Waking up in the Hunter's Cabin Bed
    const bedX = HUNTER_LODGE_POS.x - 3.2;
    const bedY = HUNTER_LODGE_POS.height + 0.36;
    const bedZ = HUNTER_LODGE_POS.z + 2.4;
    const cabinGround = walkableHeightAt(SURVIVAL_CABIN_SPAWN.x, SURVIVAL_CABIN_SPAWN.z);

    if (phase.timer < 1.2) {
      // Blinking eyes open & sitting up from pillow
      const u = phase.timer / 1.2;
      const smoothU = u * u * (3 - 2 * u);
      state.x = bedX;
      state.y = bedY;
      state.z = bedZ;
      state.yaw = -smoothU * (Math.PI * 0.5);
      state.pitch = 1.12 * (1 - smoothU) + 0.02 * smoothU;
    } else if (phase.timer < 2.6) {
      // Sitting on the edge of the bed, looking left and right across the cabin
      const u = (phase.timer - 1.2) / 1.4;
      state.x = bedX + 0.35;
      state.y = bedY - 0.04;
      state.z = bedZ;
      state.yaw = -Math.PI * 0.5 + Math.sin(u * Math.PI * 2) * 0.58;
      state.pitch = -0.04 + Math.cos(u * Math.PI) * 0.04;
    } else if (phase.timer < 3.6) {
      // Standing up from the bed onto the cabin floor
      const u = (phase.timer - 2.6) / 1.0;
      const smoothU = u * u * (3 - 2 * u);
      state.x = (bedX + 0.35) * (1 - smoothU) + SURVIVAL_CABIN_SPAWN.x * smoothU;
      state.y = (bedY - 0.04) * (1 - smoothU) + cabinGround.height * smoothU;
      state.z = bedZ * (1 - smoothU) + SURVIVAL_CABIN_SPAWN.z * smoothU;
      state.yaw = SURVIVAL_CABIN_SPAWN.yaw;
      state.pitch = SURVIVAL_CABIN_SPAWN.pitch;
    } else {
      state.x = SURVIVAL_CABIN_SPAWN.x;
      state.y = cabinGround.height;
      state.z = SURVIVAL_CABIN_SPAWN.z;
      state.yaw = SURVIVAL_CABIN_SPAWN.yaw;
      state.pitch = SURVIVAL_CABIN_SPAWN.pitch;
      state.deathRespawnPhase = null;
      return { starvedOrDied: true, tookDamage: false };
    }
    return { starvedOrDied: false, tookDamage: false };
  }

  let tookDamage = false;
  // PL2: a hard landing hurts. Damage grows linearly from FALL_DAMAGE_START_MPS to lethal at FALL_DAMAGE_LETHAL_MPS.
  const landingSpeed = state.lastLandingSpeed ?? 0;
  state.lastLandingSpeed = 0;
  if (!godMode && landingSpeed > FALL_DAMAGE_START_MPS) {
    const fraction = Math.min(1, (landingSpeed - FALL_DAMAGE_START_MPS) / (FALL_DAMAGE_LETHAL_MPS - FALL_DAMAGE_START_MPS));
    state.hp = Math.max(0, state.hp - fraction * maxHp);
    state.damageFlashTimer = Math.max(state.damageFlashTimer ?? 0, 0.9);
    tookDamage = true;
  }
  const animals = getActiveWorldAnimals();
  const clothing = state.equippedClothingId ?? 'simple_tunic';
  const armorMitigation =
    clothing === 'imperial_armor'
      ? 0.5
      : clothing === 'ranger_garb'
        ? 0.72
        : clothing === 'elven_cloak'
          ? 0.82
          : 1.0;

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    if (a.isDead || a.isTamed || a.isSubdued || a.isMountedByPlayer) continue;
    // G11: the cooldown is counted down once, by the animal's own step (boids), not here as well.
    const canAttackPlayer =
      a.species === 'wolf' ||
      a.species === 'bear' ||
      a.species === 'jaguar' ||
      a.species === 'crocodile' ||
      a.species === 'rhino' ||
      a.species === 'hippo' ||
      a.species === 'stag' ||
      a.species === 'lion' ||
      a.species === 'dragon';
    if (!canAttackPlayer) continue;
    // Enforce vertical height check so ground predators cannot hit a flying or elevated player!
    const vertDiff = Math.abs(a.y - state.y);
    const maxVerticalReach = a.isBoss || a.species === 'dragon' ? 4.2 : 2.6;
    if (vertDiff > maxVerticalReach) continue;

    const dist = Math.hypot(a.x - state.x, a.z - state.z);
    const strikeReach =
      a.isBoss || a.species === 'dragon'
        ? 4.4
        : a.species === 'rhino' || a.species === 'hippo' || a.species === 'bear' || a.species === 'crocodile'
          ? 3.2
          : 2.6;
    if (
      dist <= strikeReach &&
      (a.aiBehavior === 'attacking' || a.aiBehavior === 'charging') &&
      (a.attackHitCooldownTimer ?? 0) <= 0 &&
      // A wall between the animal and the player blocks the hit (G4).
      !isSegmentBlockedBySolidBox(a.x, a.z, state.x, state.z, (a.y + state.y) / 2 + 0.8)
    ) {
      const { attackDamage } = getAnimalStrengthAndLevel(a);
      const blockFactor = state.swordBlocking ? 0.35 : 1.0;
      const finalDamage = Math.max(1, Math.round(attackDamage * armorMitigation * blockFactor));
      a.attackHitCooldownTimer = 1.05;
      state.damageFlashTimer = 0.9;
      tookDamage = true;
      if (!godMode) {
        state.hp = Math.max(0, state.hp - finalDamage);
      }
    }
  }

  // DR1: dragon fire breath. Inside the cone, within reach, with no wall in the line, the fire burns the player.
  if (!godMode) {
    for (let i = 0; i < animals.length; i++) {
      const d = animals[i];
      const fb = d.fireBreath;
      if (d.species !== 'dragon' || d.isDead || !fb) continue;
      const dx = state.x - fb.x;
      const dz = state.z - fb.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= 0.001 || dist > fb.range || Math.abs(state.y - d.y) > 12) continue;
      const cosToPlayer = (dx * fb.dirX + dz * fb.dirZ) / dist;
      if (cosToPlayer < Math.cos(fb.halfAngle)) continue;
      if (isSegmentBlockedBySolidBox(fb.x, fb.z, state.x, state.z, state.y + 0.9)) continue;
      state.hp = Math.max(0, state.hp - DRAGON_FIRE_DAMAGE_PER_SECOND * dt);
      state.damageFlashTimer = Math.max(state.damageFlashTimer ?? 0, 0.5);
      tookDamage = true;
    }
  }

  if (godMode) {
    state.hp = maxHp;
    state.hunger = maxHunger;
    state.deathRespawnPhase = null;
    return { starvedOrDied: false, tookDamage };
  }

  // Gentle, realistic hunger drain (~25-40 minutes for a full bar instead of 3 minutes)
  const hungerDrainRate = isSprinting && !state.staminaExhausted ? 0.085 : 0.04;
  state.hunger = Math.max(0, state.hunger - hungerDrainRate * dt);

  if (state.hunger <= 0.01) {
    state.hp = Math.max(0, state.hp - 1.2 * dt);
    state.damageFlashTimer = Math.max(state.damageFlashTimer ?? 0, 0.55);
    tookDamage = true;
  } else if (state.hunger > 60 && state.hp < maxHp && (state.damageFlashTimer ?? 0) <= 0.01) {
    state.hp = Math.min(maxHp, state.hp + 0.85 * dt);
  }

  if (state.hp <= 0) {
    state.hp = 0;
    state.vx = 0;
    state.vy = 0;
    state.vz = 0;
    state.mountedHorseId = null;
    state.deathRespawnPhase = {
      stage: 'dying',
      timer: 0,
      cause: (state.hunger ?? 100) <= 0.05 ? 'starvation' : 'combat',
    };
    return { starvedOrDied: false, tookDamage };
  }

  return { starvedOrDied: false, tookDamage };
}

/**
 * Summary: Creates and initializes default player state at the designated world spawn coordinates
 * (or inside the starting cabin when options.survivalMode is true).
 * @returns A fresh player state.
 */
export function createInitialPlayerState(options?: { survivalMode?: boolean }): IPlayerState {
  const ground = walkableHeightAt(WORLD_SPAWN.x, WORLD_SPAWN.z);
  const state: IPlayerState = {
    x: WORLD_SPAWN.x,
    y: ground.height,
    z: WORLD_SPAWN.z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: WORLD_SPAWN.yaw,
    pitch: WORLD_SPAWN.pitch,
    onGround: true,
    isFlying: false,
    lastJumpPressTime: -10,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
    bobPhase: 0,
    bobAmount: 0,
    distanceWalked: 0,
    stepCount: 0,
    inWater: false,
    isSwimming: false,
    currentBiome: 'trail',
    walkPace: 'normal',
    climbingLadderId: null,
    mountedHorseId: null,
    mountedHorseYaw: WORLD_SPAWN.yaw,
    cameraPerspective: 'third_person',
    equippedTool: 'bow',
    activeWeaponId: 'bow',
    equippedClothingId: 'ranger_garb',
    openedChestIds: [],
    chestContentsById: {},
    arrowKind: 'normal',
    goldCoins: 280,
    ownedItemIds: [
      'bow',
      'sword',
      'torch',
      'unarmed',
      'simple_tunic',
      'ranger_garb',
      'arrow_normal',
      'arrow_fire',
      'arrow_wind',
      'oak_timber',
      'cut_granite_blocks',
      'iron_ingots',
      'dwarven_gold_ore',
      'crystal_gem',
      'ancient_dwarven_horn',
      'fresh_bread_loaf',
      'red_orchard_apples',
    ],
    hotbarSlots: ['bow', 'torch', 'sword', 'unarmed'],
    favoriteIds: ['bow', 'torch', 'sword', 'arrow_normal', 'arrow_fire', 'arrow_wind', 'unarmed'],
    swordSwingProgress: 0,
    swordComboIndex: -1,
    swordHeavyAttack: false,
    swordChargeTime: 0,
    swordBlocking: false,
    swordBlockProgress: 0,
    bowZoomHeld: false,
    bowReleaseKick: 0,
    weaponSwayX: 0,
    weaponSwayY: 0,
    lastSwordHitPoint: null,
    lastSwordAirWave: null,
    dashCooldown: 0,
    dashTimer: 0,
    bowDrawn: false,
    bowDrawProgress: 0,
    arrowsShotCount: 0,
    nextArrowId: 1,
    lastArrowHitTarget: null,
    stamina: 100,
    maxStamina: 100,
    hp: 100,
    maxHp: 100,
    hunger: 100,
    maxHunger: 100,
    skills: {
      archeryLevel: 1,
      archeryXp: 0,
      archeryXpNext: 240,
      swordsmanshipLevel: 1,
      swordsmanshipXp: 0,
      swordsmanshipXpNext: 240,
      horsemanshipLevel: 1,
      horsemanshipXp: 0,
      horsemanshipXpNext: 240,
      athleticsLevel: 1,
      athleticsXp: 0,
      athleticsXpNext: 240,
      explorationLevel: 1,
      explorationXp: 0,
      explorationXpNext: 240,
      lastLevelUpSkill: null,
      lastLevelUpTitle: null,
      lastLevelUpTimer: 0,
    },
  };
  if (options?.survivalMode) {
    applyGameModeToPlayerState(state, true);
  }
  activePlayerStateRegistry = state;
  return state;
}

/**
 * Summary: Calculates the composite RPG Hero Level based on individual skill levels.
 * @param state Player state (read only).
 * @returns Hero level derived from the skill levels.
 */
export function getPlayerHeroLevel(state: IPlayerState): number {
  const s = state.skills;
  if (!s) return 1;
  const totalSkillLevels =
    s.archeryLevel +
    s.swordsmanshipLevel +
    s.horsemanshipLevel +
    s.athleticsLevel +
    s.explorationLevel;
  // Starts at Level 1 (when all 5 skills are Level 1 -> sum=5) and advances every 2 skill level-ups
  return Math.max(1, 1 + Math.floor((totalSkillLevels - 5) / 2));
}

/**
 * Summary: Creates initial instances of rideable horses located at their respective home spawns.
 * @returns The rideable horses at their home spawns.
 */
export function createInitialRideableHorses(): IRideableHorseState[] {
  return RIDEABLE_HORSES.map((def) => {
    const walk = walkableHeightAt(def.homeX, def.homeZ);
    return {
      id: def.id,
      name: def.name,
      x: def.homeX,
      y: walk.height,
      z: def.homeZ,
      yaw: def.homeYaw,
      speed: 0,
      gaitPhase: 0,
      stamina: 100,
      maxStamina: 100,
      staminaExhausted: false,
    };
  });
}
// #endregion

// ======================== HORSE SEARCH & MOUNTING ======================== \\
// #region Horse Search & Mounting
const MEAT_ITEM_IDS = [
  'raw_game_meat',
  'deer_meat',
  'bear_meat',
  'roasted_meat',
  'dragon_meat',
] as const;

export function hasPlayerMeatForTaming(state: IPlayerState): boolean {
  const items = state.ownedItemIds;
  if (!items) return false;
  for (let i = 0; i < MEAT_ITEM_IDS.length; i++) {
    if (items.includes(MEAT_ITEM_IDS[i])) {
      return true;
    }
  }
  return false;
}

export function consumePlayerMeatForTaming(state: IPlayerState): boolean {
  const items = state.ownedItemIds;
  if (!items) return false;
  for (let i = 0; i < MEAT_ITEM_IDS.length; i++) {
    const idx = items.indexOf(MEAT_ITEM_IDS[i]);
    if (idx >= 0) {
      items.splice(idx, 1);
      return true;
    }
  }
  return false;
}

/**
 * Summary: Finds the nearest rideable horse or tameable/mounted creature within interaction proximity of the player.
 * @returns The closest horse/mount within maxDist, or null.
 */
export function findNearestRideableHorse(
  px: number,
  py: number,
  pz: number,
  horses: readonly IRideableHorseState[],
  maxDist = 3.8
): IRideableHorseState | null {
  let best: IRideableHorseState | null = null;
  let bestDist = maxDist;
  for (let i = 0; i < horses.length; i++) {
    const h = horses[i];
    if (Math.abs(py - h.y) > 2.6) continue;
    const d = Math.hypot(px - h.x, pz - h.z);
    if (d <= bestDist) {
      bestDist = d;
      best = h;
    }
  }
  const worldAnimals = getActiveWorldAnimals();
  for (let i = 0; i < worldAnimals.length; i++) {
    const a = worldAnimals[i];
    if (a.isDead || (a.species !== 'stag' && a.species !== 'lion')) continue;
    // Smaller CatLions (canBeTamed === false) can never be tamed or ridden!
    if (a.canBeTamed === false) continue;
    // The Boss CatLion can only be tamed once subdued at low HP (<= 25% maxHp), or ridden once already tamed!
    const lionSubdueThreshold = Math.max(60, Math.ceil((a.maxHp ?? 360) * 0.25));
    if (
      a.species === 'lion' &&
      !a.isTamed &&
      !a.isSubdued &&
      (a.hp ?? a.maxHp ?? 360) > lionSubdueThreshold
    ) {
      continue;
    }
    const maxAnimalDist = a.species === 'lion' && a.isBoss ? Math.max(maxDist, 4.6) : Math.max(maxDist, 4.2);
    if (Math.abs(py - a.y) > 3.2) continue;
    const d = Math.hypot(px - a.x, pz - a.z);
    if (d <= maxAnimalDist && d <= bestDist + 0.8) {
      bestDist = Math.min(bestDist, d);
      const mountId = a.species === 'stag' ? `mount-stag-${a.id}` : `mount-lion-${a.id}`;
      const mountYaw = Math.atan2(Math.sin(a.yaw - Math.PI), Math.cos(a.yaw - Math.PI));
      best = {
        id: mountId,
        name:
          a.species === 'stag'
            ? a.isTamed
              ? 'Royal Celestial Stag (Tamed)'
              : 'Tame & Ride Royal Celestial Stag'
            : a.isTamed
              ? 'Mystical Boss CatLion (Tamed)'
              : 'Feed Meat & Tame Subdued Boss CatLion [F]',
        x: a.x,
        y: a.y,
        z: a.z,
        yaw: mountYaw,
        speed: Math.hypot(a.vx, a.vz),
        gaitPhase: a.hopPhase,
      };
    }
  }

  // Check proximity to any Owned/Spawned Sailable Ship
  const spawnedShips = getSpawnedSailableShips();
  let bestShipDist = Infinity;
  for (let sIdx = 0; sIdx < spawnedShips.length; sIdx++) {
    const ship = spawnedShips[sIdx];
    const shipDist = Math.hypot(px - ship.x, pz - ship.z);
    if (shipDist <= Math.max(maxDist, 11.5) && Math.abs(py - ship.deckY) <= 4.4 && shipDist < bestShipDist) {
      const dx = px - ship.x;
      const dz = pz - ship.z;
      const lz = -dx * Math.sin(ship.yaw) + dz * Math.cos(ship.yaw);
      const horseOnDeckNearPlayer =
        best !== null &&
        isEntityOnSailableShipDeck(best.x, best.z, best.y, ship, 1.5) &&
        Math.hypot(px - best.x, pz - best.z) <= 2.6 &&
        lz < 1.2;
      if (!horseOnDeckNearPlayer) {
        bestShipDist = shipDist;
        setActiveSailableShipByTier(ship.tierId);
        best = {
          id: 'sailable-ship',
          name: ship.name,
          x: ship.x,
          y: ship.deckY + 0.55,
          z: ship.z,
          yaw: ship.yaw,
          speed: Math.abs(ship.speed),
          gaitPhase: ship.wakePhase,
        };
      }
    }
  }
  return best;
}
// #endregion

// ======================== KINEMATIC SIMULATION STEP ======================== \\
// #region Kinematic Simulation Step
/**
 * Summary: Highest top of a solid box under (x, z) that the feet are standing on or just above, or -Infinity if none.
 * Design: Accepts a top within a small step below the feet (a jump landing) and rejects tops far above (walls, fences).
 */
function highestStandableBoxTopAt(x: number, z: number, feetY: number): number {
  let best = -Infinity;
  const boxes = getNearbySolidBuildingBoxes(x, z, 1.0);
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    if (box.maxY === undefined) continue;
    if (box.maxY > feetY + 0.3 || box.maxY < feetY - 1.0) continue;
    if (!pointInsideSolidBuildingBox(x, z, 0, box)) continue;
    if (box.maxY > best) best = box.maxY;
  }
  return best;
}

/**
 * Summary: Steps player movement physics, collision handling, jumping, climbing, and swimming.
 * Note: [HOT-PATH EXCEPTION] Evaluated each frame at 60FPS; mutates player velocity and position in place.
 * Relaxed Rule: Rule 1 (in-place state mutation instead of immutable reconstruction).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.12ms per physics substep.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @returns Whether a footstep landed and the landing impact (0 when none).
 */
export function stepPlayerPhysics(
  state: IPlayerState,
  input: IPlayerInput,
  obstacles: IObstacleCylinder[],
  rawDt: number,
  openDoorIds?: ReadonlySet<string>,
  horses?: IRideableHorseState[]
): { steppedFoot: boolean; landedImpact: number } {
  activePlayerStateRegistry = state;
  const dt = Math.min(Math.max(rawDt, 0.001), 0.11);

  if (state.deathRespawnPhase) {
    return { steppedFoot: false, landedImpact: 0 };
  }

  state.yaw += input.lookYawDelta;
  state.pitch = Math.max(-1.38, Math.min(1.38, state.pitch + input.lookPitchDelta));

  if (input.toggleMountHorseRequested && horses) {
    if (state.mountedHorseId) {
      const dismountingId = state.mountedHorseId;
      const currentHorse = horses.find((h) => h.id === dismountingId);
      state.mountedHorseId = null;
      if (dismountingId === 'sailable-ship') {
        const ship = getActiveSailableShip();
        ship.speed = 0;
        const disembark = findSailableShipDisembarkPoint(ship);
        state.x = disembark.x;
        state.y = disembark.y;
        state.z = disembark.z;
        state.vx = 0;
        state.vy = 0;
        state.vz = 0;
        state.onGround = true;
      } else {
        const shipUnderPlayer =
          findSailableShipContainingPoint(state.x, state.z, state.y, 2.2) ?? getActiveSailableShip();
        const dismountingOnShip = isEntityOnSailableShipDeck(
          state.x,
          state.z,
          state.y,
          shipUnderPlayer,
          2.2
        );
        const worldAnimals = getActiveWorldAnimals();
        if (dismountingId.startsWith('mount-stag-') || dismountingId.startsWith('mount-lion-')) {
          for (let i = 0; i < worldAnimals.length; i++) {
            const a = worldAnimals[i];
            const expectedId = a.species === 'stag' ? `mount-stag-${a.id}` : `mount-lion-${a.id}`;
            if (expectedId === dismountingId) {
              a.isMountedByPlayer = false;
              a.vx = 0;
              a.vz = 0;
              if (dismountingOnShip) {
                placeMountOnShipDeckWithoutStacking(a, shipUnderPlayer, horses, worldAnimals);
              }
              a.homeX = a.x;
              a.homeZ = a.z;
            }
          }
          const vIdx = horses.findIndex((h) => h.id === dismountingId);
          if (vIdx >= 0) {
            horses.splice(vIdx, 1);
          }
        }
        if (currentHorse) {
          currentHorse.speed = 0;
          currentHorse.vy = 0;
          if (dismountingOnShip) {
            placeMountOnShipDeckWithoutStacking(currentHorse, shipUnderPlayer, horses, worldAnimals);
          }
        }
        if (dismountingOnShip) {
          const cosY = Math.cos(shipUnderPlayer.yaw);
          const sinY = Math.sin(shipUnderPlayer.yaw);
          const sideX = cosY * 0.85;
          const sideZ = -sinY * 0.85;
          state.x = Math.max(
            shipUnderPlayer.x - shipUnderPlayer.halfW + 0.6,
            Math.min(shipUnderPlayer.x + shipUnderPlayer.halfW - 0.6, state.x + sideX)
          );
          state.z = Math.max(
            shipUnderPlayer.z - shipUnderPlayer.halfL + 0.8,
            Math.min(shipUnderPlayer.z + shipUnderPlayer.halfL - 0.8, state.z + sideZ)
          );
          state.y = shipUnderPlayer.deckY + 0.15;
          state.vx = 0;
          state.vy = 0;
          state.vz = 0;
          state.onGround = true;
        } else if (currentHorse) {
          currentHorse.vy = Math.min(0, state.vy);
          const sideX = Math.cos(currentHorse.yaw) * 0.95;
          const sideZ = -Math.sin(currentHorse.yaw) * 0.95;
          state.x = currentHorse.x + sideX;
          state.z = currentHorse.z + sideZ;
          state.y = walkableHeightValueAt(state.x, state.z, state.y);
        }
      }
    } else {
      const nearHorse = findNearestRideableHorse(state.x, state.y, state.z, horses, 4.2);
      if (nearHorse) {
        let canMount = true;
        if (nearHorse.id.startsWith('mount-stag-') || nearHorse.id.startsWith('mount-lion-')) {
          const worldAnimals = getActiveWorldAnimals();
          for (let i = 0; i < worldAnimals.length; i++) {
            const a = worldAnimals[i];
            const expectedId = a.species === 'stag' ? `mount-stag-${a.id}` : `mount-lion-${a.id}`;
            if (expectedId === nearHorse.id) {
              if (a.canBeTamed === false) {
                canMount = false;
                break;
              }
              if (a.species === 'lion' && !a.isTamed) {
                const lionSubdueThreshold = Math.max(60, Math.ceil((a.maxHp ?? 360) * 0.25));
                const isWeakEnough = Boolean(
                  a.isSubdued || (a.hp ?? a.maxHp ?? 360) <= lionSubdueThreshold
                );
                if (!isWeakEnough) {
                  canMount = false;
                  break;
                }
                if (!consumePlayerMeatForTaming(state)) {
                  state.lastTameNotice = 'meat_required_for_lion';
                  canMount = false;
                  break;
                }
                state.lastTameNotice = 'tamed_boss_lion';
              } else if (a.species === 'stag' && !a.isTamed) {
                state.lastTameNotice = 'tamed_stag';
              }
              a.isTamed = true;
              a.isSubdued = false;
              a.hp = a.maxHp ?? (a.species === 'lion' ? 360 : 270);
              a.isMountedByPlayer = true;
              a.isFleeing = false;
              a.fleeCooldown = 0;
              a.wokenUpTimer = 0;
              a.alertLevel = 'grazing';
              a.aiBehavior = 'grazing';
            }
          }
          if (canMount) {
            const existing = horses.find((h) => h.id === nearHorse.id);
            if (!existing) {
              horses.push({ ...nearHorse, speed: 0, gaitPhase: 0 });
            }
          }
        }
        if (canMount) {
          state.mountedHorseId = nearHorse.id;
          state.mountedHorseYaw = nearHorse.yaw;
          state.isFlying = false;
          state.climbingLadderId = null;
          state.x = nearHorse.x;
          state.z = nearHorse.z;
          state.y = nearHorse.y;
          state.yaw = nearHorse.yaw;
          state.vx = 0;
          state.vy = 0;
          state.vz = 0;
        }
      }
    }
  }

  if (input.toggleFlyRequested) {
    // Double-space cancels all walking animations and dismounts any horse cleanly
    state.bobAmount = 0;
    state.bobPhase = 0;
    state.isCrouching = false;
    if (state.mountedHorseId && horses) {
      const dismId = state.mountedHorseId;
      const dismountedHorse = horses.find((h) => h.id === dismId);
      if (dismountedHorse) {
        dismountedHorse.speed = 0;
        dismountedHorse.vy = Math.min(0, state.vy);
      }
      if (dismId.startsWith('mount-stag-') || dismId.startsWith('mount-lion-')) {
        const worldAnimals = getActiveWorldAnimals();
        for (let i = 0; i < worldAnimals.length; i++) {
          const a = worldAnimals[i];
          const expectedId = a.species === 'stag' ? `mount-stag-${a.id}` : `mount-lion-${a.id}`;
          if (expectedId === dismId) {
            a.isMountedByPlayer = false;
            a.vx = 0;
            a.vz = 0;
            a.homeX = a.x;
            a.homeZ = a.z;
          }
        }
        const vIdx = horses.findIndex((h) => h.id === dismId);
        if (vIdx >= 0) {
          horses.splice(vIdx, 1);
        }
      }
      state.mountedHorseId = null;
    }
    state.isFlying = !state.isFlying;
    if (state.isFlying) {
      state.mountedHorseId = null;
      state.onGround = false;
      state.vy = 4.5;
      state.y += 0.6;
    } else {
      state.vy = 0;
    }
  }

  if (state.mountedHorseId?.startsWith('sailable-ship')) {
    stepSailableShipPhysics(
      state,
      input,
      dt,
      isNavigableOceanForShip,
      getActiveSailableShip(),
      horses,
      getActiveWorldAnimals()
    );
    state.currentBiome = 'pier';
    return { steppedFoot: false, landedImpact: 0 };
  }

  const activeMountedHorse =
    state.mountedHorseId && horses
      ? horses.find((h) => h.id === state.mountedHorseId) ?? null
      : null;

  let moveX = 0;
  let moveZ = 0;

  if (activeMountedHorse) {
    const currentHorseSpeed = Math.hypot(state.vx, state.vz);
    const steerResult = stepMountedHorseSteering(
      activeMountedHorse,
      state.yaw,
      input.forward,
      input.right,
      currentHorseSpeed,
      dt
    );
    state.yaw = steerResult.newRiderYaw;
    state.mountedHorseYaw = steerResult.newHorseYaw;

    const horseFwdX = -Math.sin(activeMountedHorse.yaw);
    const horseFwdZ = -Math.cos(activeMountedHorse.yaw);
    moveX = horseFwdX * input.forward;
    moveZ = horseFwdZ * input.forward;
  }

  const sinY = Math.sin(state.yaw);
  const cosY = Math.cos(state.yaw);
  const fwdX = -sinY;
  const fwdZ = -cosY;
  const rightX = cosY;
  const rightZ = -sinY;

  if (!activeMountedHorse) {
    moveX = fwdX * input.forward + rightX * input.right;
    moveZ = fwdZ * input.forward + rightZ * input.right;
    const rawMoveLen = Math.hypot(moveX, moveZ);
    if (rawMoveLen > 1.0) {
      moveX /= rawMoveLen;
      moveZ /= rawMoveLen;
    }
  }
  const moveLen = Math.hypot(moveX, moveZ);

  if (state.isFlying) {
    const flySpeed = input.sprint ? 34.0 : 18.0;
    state.walkPace = input.sprint ? 'fast' : 'normal';

    const targetVx = moveX * flySpeed;
    const targetVz = moveZ * flySpeed;
    let targetVy = 0;
    if (Math.abs(input.forward) > 0.1) {
      targetVy += Math.sin(state.pitch) * input.forward * flySpeed * 0.65;
    }
    if (input.jumpHeld) targetVy += 13.0;
    if (input.relaxed) targetVy -= 13.0;

    const damp = 1.0 - Math.exp(-10.0 * dt);
    state.vx += (targetVx - state.vx) * damp;
    state.vz += (targetVz - state.vz) * damp;
    state.vy += (targetVy - state.vy) * damp;

    let nextX = state.x + state.vx * dt;
    let nextZ = state.z + state.vz * dt;
    const distFromCenter = Math.hypot(nextX, nextZ);
    if (distFromCenter > PLAYABLE_RADIUS) {
      const scaleBack = PLAYABLE_RADIUS / distFromCenter;
      nextX *= scaleBack;
      nextZ *= scaleBack;
    }

    const stepDist = Math.hypot(nextX - state.x, nextZ - state.z);
    state.x = nextX;
    state.z = nextZ;
    state.distanceWalked += stepDist;
    state.y += state.vy * dt;

    const baseGroundY = groundHeightAt(state.x, state.z);
    const floorY =
      state.y > 76.0 || (state.y > baseGroundY + 18.0 && state.x < 280.0)
        ? Math.max(baseGroundY, WATER_LEVEL - 0.5)
        : Math.max(walkableHeightValueAt(state.x, state.z, state.y), WATER_LEVEL - 0.5);
    if (state.y < floorY + 0.15 && input.relaxed) {
      state.y = floorY;
      state.vy = 0;
      state.isFlying = false;
      state.onGround = true;
    } else if (state.y < floorY + 0.3) {
      state.y = floorY + 0.3;
      if (state.vy < 0) state.vy = 0;
    }
    state.y = Math.min(state.y, 165.0);
    state.bobAmount = 0;
    state.bobPhase = 0;
    state.isCrouching = false;
    state.currentBiome = getSurfaceBiomeAt(state.x, state.z, state.y);

    // Ensure any unmounted horses (e.g. dismounted in mid-air via double-space) fall back to the ground!
    if (horses) {
      for (let i = 0; i < horses.length; i++) {
        const h = horses[i];
        if (h.id === state.mountedHorseId) continue;
        const horseFloorY = walkableHeightValueAt(h.x, h.z, h.y);
        if (h.y > horseFloorY + 0.001 || (h.vy ?? 0) !== 0) {
          const nextVy = (h.vy ?? 0) - GRAVITY * dt;
          const nextY = h.y + nextVy * dt;
          if (nextY <= horseFloorY) {
            h.y = horseFloorY;
            h.vy = 0;
          } else {
            h.y = nextY;
            h.vy = nextVy;
          }
        } else {
          h.y = horseFloorY;
          h.vy = 0;
        }
        if (h.speed > 0.001) {
          h.speed *= Math.exp(-8.0 * dt);
          if (h.speed < 0.01) h.speed = 0;
        }
      }
    }

    return { steppedFoot: false, landedImpact: 0 };
  }

  if (state.dashCooldown && state.dashCooldown > 0) {
    state.dashCooldown = Math.max(0, state.dashCooldown - dt);
  }
  const isDashing = Boolean(state.dashTimer && state.dashTimer > 0);
  if (state.dashTimer && state.dashTimer > 0) {
    state.dashTimer = Math.max(0, state.dashTimer - dt);
  }

  const isMountedOnHorse = Boolean(state.mountedHorseId);
  const isMountedOnStag = Boolean(state.mountedHorseId?.startsWith('mount-stag-'));
  const isMountedOnLion = Boolean(state.mountedHorseId?.startsWith('mount-lion-'));
  const activeMountedEntity =
    isMountedOnHorse && horses
      ? (horses.find((h) => h.id === state.mountedHorseId) ?? null)
      : null;

  const maxStamForSprint = state.maxStamina ?? 100;
  const curStamForSprint = state.stamina ?? maxStamForSprint;
  const recoveryGate = Math.min(STAMINA_EXHAUSTION_RECOVERY_THRESHOLD, maxStamForSprint * 0.25);
  if (curStamForSprint <= 0.5) {
    state.staminaExhausted = true;
  } else if (state.staminaExhausted && curStamForSprint >= recoveryGate) {
    state.staminaExhausted = false;
  }

  const mountMaxStam = activeMountedEntity?.maxStamina ?? state.mountMaxStamina ?? 100;
  let curMountStam = activeMountedEntity?.stamina ?? state.mountStamina ?? mountMaxStam;
  let mountExhausted = Boolean(
    activeMountedEntity?.staminaExhausted ?? state.mountStaminaExhausted
  );
  const mountRecoveryGate = Math.min(STAMINA_EXHAUSTION_RECOVERY_THRESHOLD, mountMaxStam * 0.25);
  if (curMountStam <= 0.5) {
    mountExhausted = true;
  } else if (mountExhausted && curMountStam >= mountRecoveryGate) {
    mountExhausted = false;
  }

  const canSprint = isMountedOnHorse
    ? !mountExhausted && curMountStam > 0.5
    : !state.staminaExhausted && curStamForSprint > 0.5;

  let paceMultiplier = 1.0;
  if (input.relaxed && !input.sprint) {
    paceMultiplier = isMountedOnHorse ? 0.55 : 0.45;
    state.walkPace = 'relaxed';
    state.isCrouching = !isMountedOnHorse && !state.isSwimming;
  } else if (input.sprint && canSprint) {
    paceMultiplier = isMountedOnLion
      ? 1.58
      : isMountedOnStag
        ? 1.68
        : isMountedOnHorse
          ? 1.70
          : 1.75;
    state.walkPace = 'fast';
    state.isCrouching = false;
  } else {
    paceMultiplier = 1.0;
    state.walkPace = 'normal';
    state.isCrouching = false;
  }

  // Elevated mount speed hierarchy:
  // 1) Royal Stag ('mount-stag-') fastest (10.2 normal, ~17.1 gallop)
  // 2) Horse ('horse-') fast pace (9.2 normal, ~15.6 gallop) - clearly swifter than human on foot!
  // 3) Boss CatLion ('mount-lion-') heavy predator mount (7.8 normal, ~12.3 run)
  // 4) Unmounted human (5.0 normal, 8.75 sprint)
  const baseWalkSpeed = isMountedOnStag
    ? 10.2
    : isMountedOnHorse && !isMountedOnLion
      ? 9.2
      : isMountedOnLion
        ? 7.8
        : 5.0;
  const waterSlowdown = state.inWater ? 0.68 : 1.0;
  const dashMultiplier = isDashing ? (state.isSwimming ? 2.45 : isMountedOnHorse ? 1.45 : 2.35) : 1.0;
  const targetSpeed = baseWalkSpeed * paceMultiplier * waterSlowdown * dashMultiplier;

  const dashDirX = moveLen > 0.05 ? moveX : fwdX;
  const dashDirZ = moveLen > 0.05 ? moveZ : fwdZ;
  const targetVx = (isDashing ? dashDirX : moveX) * targetSpeed;
  const targetVz = (isDashing ? dashDirZ : moveZ) * targetSpeed;

  const accel = isDashing ? 24.0 : state.onGround ? 15.0 : isMountedOnHorse ? 6.5 : 5.5;
  const damp = 1.0 - Math.exp(-accel * dt);
  state.vx += (targetVx - state.vx) * damp;
  state.vz += (targetVz - state.vz) * damp;
  if (isMountedOnHorse && !state.onGround && !state.isSwimming && state.vy < -10.5) {
    // Only apply horizontal air-drag during deep cliff free-falls (vy < -10.5) so normal jumps keep their full forward momentum!
    const cliffFallDrag = Math.exp(-1.85 * dt);
    state.vx *= cliffFallDrag;
    state.vz *= cliffFallDrag;
  }

  const nearbyLadderAtPos = findWatchtowerLadderAt(state.x, state.z);
  const lookedAtLadder = findLookedAtWatchtowerLadder(state.x, state.y, state.z, state.yaw, state.pitch);

  let jumpConsumedByLadder = false;
  if (input.jumpPressed) {
    if (state.climbingLadderId) {
      const prevLadder = getLadderById(state.climbingLadderId);
      state.climbingLadderId = null;
      state.vy = 0;
      jumpConsumedByLadder = true;
      if (prevLadder) {
        for (let fIdx = 0; fIdx < prevLadder.floors.length; fIdx++) {
          if (Math.abs(state.y - prevLadder.floors[fIdx]) < 0.95) {
            state.y = prevLadder.floors[fIdx];
            break;
          }
        }
        const awayX = prevLadder.standX - prevLadder.ladderX;
        const awayZ = prevLadder.standZ - prevLadder.ladderZ;
        const awayLen = Math.hypot(awayX, awayZ) || 1;
        state.x = prevLadder.standX + (awayX / awayLen) * 0.45;
        state.z = prevLadder.standZ + (awayZ / awayLen) * 0.45;
      }
    } else {
      const mountTarget = lookedAtLadder ?? nearbyLadderAtPos;
      if (
        mountTarget &&
        state.y >= mountTarget.minY - 0.6 &&
        state.y <= mountTarget.maxY + 1.2
      ) {
        state.climbingLadderId = mountTarget.id;
        state.vx = 0;
        state.vz = 0;
        state.vy = 0;
        state.x = mountTarget.standX;
        state.z = mountTarget.standZ;
        state.y = Math.max(mountTarget.minY, Math.min(mountTarget.maxY, state.y));
        jumpConsumedByLadder = true;
      }
    }
  }

  let activeLadder = getLadderById(state.climbingLadderId);
  if (activeLadder && input.forward > 0.15) {
    const toLadX = activeLadder.ladderX - activeLadder.standX;
    const toLadZ = activeLadder.ladderZ - activeLadder.standZ;
    const toLadLen = Math.hypot(toLadX, toLadZ) || 1;
    const gazeDot = (toLadX * fwdX + toLadZ * fwdZ) / toLadLen;
    if (gazeDot < 0.15) {
      for (let fIdx = 0; fIdx < activeLadder.floors.length; fIdx++) {
        if (Math.abs(state.y - activeLadder.floors[fIdx]) < 0.95) {
          state.y = activeLadder.floors[fIdx];
          break;
        }
      }
      state.climbingLadderId = null;
      activeLadder = null;
      state.vx = fwdX * targetSpeed;
      state.vz = fwdZ * targetSpeed;
    }
  }

  const onLadderVolume = activeLadder !== null;

  if (onLadderVolume && activeLadder) {
    let climbVy = 0;
    if (Math.abs(input.forward) > 0.08) {
      climbVy = input.forward * 5.4;
    } else if (input.relaxed) {
      climbVy = -5.4;
    }

    state.x += (activeLadder.standX - state.x) * Math.min(1, 16.0 * dt);
    state.z += (activeLadder.standZ - state.z) * Math.min(1, 16.0 * dt);
    state.vx = 0;
    state.vz = 0;
    state.vy = climbVy;
    state.onGround = true;
    state.coyoteTimer = 0.11;
    state.jumpBufferTimer = 0;
  } else {
    if (state.onGround) {
      state.coyoteTimer = 0.11;
    } else {
      state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
    }

    if (isMountedOnLion) {
      // Boss CatLion cannot jump — pressing Space triggers a full 24-frame stationary attack in place!
      state.jumpBufferTimer = 0;
      const worldAnimals = getActiveWorldAnimals();
      for (let aIdx = 0; aIdx < worldAnimals.length; aIdx++) {
        const a = worldAnimals[aIdx];
        if (`mount-lion-${a.id}` === state.mountedHorseId) {
          if ((a.actionTimer ?? 0) > 0.12 && a.aiBehavior === 'attacking') {
            state.vx = 0;
            state.vz = 0;
          }
          break;
        }
      }
      if (input.jumpPressed && !jumpConsumedByLadder) {
        state.vx = 0;
        state.vz = 0;
        const mountYaw = activeMountedHorse ? activeMountedHorse.yaw : state.yaw;
        const strikeFwdX = -Math.sin(mountYaw);
        const strikeFwdZ = -Math.cos(mountYaw);
        for (let aIdx = 0; aIdx < worldAnimals.length; aIdx++) {
          const a = worldAnimals[aIdx];
          if (`mount-lion-${a.id}` === state.mountedHorseId) {
            a.aiBehavior = 'attacking';
            a.actionTimer = 0.96;
            a.vx = 0;
            a.vz = 0;
          } else if (!a.isDead && !a.isLooted && !a.isTamed && !a.isMountedByPlayer) {
            const dxA = a.x - state.x;
            const dzA = a.z - state.z;
            const distA = Math.hypot(dxA, dzA);
            if (distA <= 5.5) {
              const dotFwd = (dxA * strikeFwdX + dzA * strikeFwdZ) / (distA || 1);
              if (dotFwd >= 0.12 || distA <= 2.8) {
                damageGroundAnimal(a, 65, state.x, state.z);
              }
            }
          }
        }
      }
    } else if (input.jumpPressed && !jumpConsumedByLadder) {
      state.jumpBufferTimer = 0.13;
    } else {
      state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
    }

    if (!isMountedOnLion && state.jumpBufferTimer > 0 && state.coyoteTimer > 0) {
      let geyserBoostVy = 0;
      for (let g = 0; g < SKY_WIND_GEYSERS.length; g++) {
        const geyser = SKY_WIND_GEYSERS[g];
        if (
          Math.hypot(state.x - geyser.x, state.z - geyser.z) <= geyser.radius &&
          Math.abs(state.y - geyser.y) <= 1.8
        ) {
          geyserBoostVy = geyser.boostVy;
          break;
        }
      }
      const mountJumpVy = isMountedOnStag ? 8.8 : isMountedOnHorse ? 7.2 : 6.25;
      state.vy = geyserBoostVy > 0 ? geyserBoostVy : mountJumpVy;
      if (isMountedOnStag && geyserBoostVy === 0) {
        // Give the Royal Stag a graceful forward leap carry on takeoff instead of braking in mid-air!
        state.vx *= 1.12;
        state.vz *= 1.12;
      }
      state.onGround = false;
      state.coyoteTimer = 0;
      state.jumpBufferTimer = 0;
    }

    if (!input.jumpHeld && state.vy > 1.8 && state.vy < 8.5) {
      state.vy *= 0.65;
    }

    if (!state.isSwimming) {
      const effectiveGravity =
        isMountedOnHorse && !state.onGround
          ? state.vy >= 0
            ? GRAVITY * 1.12
            : 21.5
          : GRAVITY;
      state.vy -= effectiveGravity * dt;
    }
  }

  // Sky-Waterfall Hydro-Elevator: stepping into the central Sky-Waterfall column at (165, -35)
  // while holding Jump or pressing forward levitates the player up the 65m waterfall to y=68.0m.
  const distToSkyWaterfall = Math.hypot(
    state.x - FLOATING_ISLAND_STAIR_POS.waterfallX,
    state.z - FLOATING_ISLAND_STAIR_POS.waterfallZ
  );
  const inSkyWaterfallUpdraft =
    distToSkyWaterfall <= FLOATING_ISLAND_STAIR_POS.waterfallRadius + 0.35 &&
    state.y < FLOATING_ISLAND_STAIR_POS.topY + 0.4 &&
    (input.jumpHeld || input.jumpPressed || input.forward > 0.1);
  if (inSkyWaterfallUpdraft) {
    state.vy = 15.5;
    state.onGround = false;
    state.isSwimming = false;
    if (state.y >= FLOATING_ISLAND_STAIR_POS.topY - 1.5) {
      state.vx = Math.max(state.vx, 4.8);
    }
  }

  let nextX = state.x + state.vx * dt;
  let nextZ = state.z + state.vz * dt;

  const playerRadius = 0.44;
  let highestBoulderTopY = -Infinity;

  const candidateObstacles =
    obstacles.length > 500 ? getNearbyWorldObstacles(nextX, nextZ, 3.0) : obstacles;
  // Pushes the point out of the nearby round obstacles (trees, rocks, pillars), against the current nextX/nextZ.
  const resolveAgainstCylinders = (): void => {
  for (let i = 0; i < candidateObstacles.length; i++) {
    const obs = candidateObstacles[i];
    const dx = nextX - obs.x;
    const dz = nextZ - obs.z;
    if (Math.abs(dx) > 2.5 || Math.abs(dz) > 2.5) continue;
    const minDist = playerRadius + obs.radius;
    const distSq = dx * dx + dz * dz;

    if (obs.kind === 'boulder') {
      const boulderTopY = groundHeightAt(obs.x, obs.z) + Math.min(1.35, obs.radius * 0.85);
      if (state.y >= boulderTopY - 0.58) {
        if (distSq <= (obs.radius + 0.28) * (obs.radius + 0.28)) {
          if (boulderTopY > highestBoulderTopY) {
            highestBoulderTopY = boulderTopY;
          }
        }
        continue;
      }
    }

    if (distSq < minDist * minDist && distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const nz = dz / dist;
      nextX += nx * overlap;
      nextZ += nz * overlap;
    }
  }
  };

  // H5, axis by axis: the X move is resolved against the round obstacles with Z held, then the Z move from the resolved X.
  {
    const targetZ = nextZ;
    nextZ = state.z;
    resolveAgainstCylinders();
    nextZ = targetZ;
    resolveAgainstCylinders();
  }

  if (!onLadderVolume) {
    // Pushes the point out of the nearby solid boxes (two passes), against the current nextX/nextZ.
    const resolveAgainstBoxes = (): void => {
    for (let pass = 0; pass < 2; pass++) {
      // Only boxes near the player can collide; the query returns them in SOLID_BUILDING_BOXES order.
      const nearbyBoxes = getNearbySolidBuildingBoxes(nextX, nextZ, playerRadius + 3.0);
      for (let i = 0; i < nearbyBoxes.length; i++) {
        const box = nearbyBoxes[i];
        if (!box.yaw) {
          const expMinX = box.minX - playerRadius;
          const expMaxX = box.maxX + playerRadius;
          const expMinZ = box.minZ - playerRadius;
          const expMaxZ = box.maxZ + playerRadius;
          if (nextX <= expMinX || nextX >= expMaxX || nextZ <= expMinZ || nextZ >= expMaxZ) continue;
        }

        if (box.minY !== undefined && state.y + 1.55 < box.minY) continue;
        let effectiveMaxY = box.maxY;
        if (
          box.id === 'fortress-stair-rail-west-lower' ||
          box.id === 'fortress-stair-rail-east-lower' ||
          box.id === 'fortress-stair-rail-west-upper' ||
          box.id === 'fortress-stair-rail-east-upper'
        ) {
          effectiveMaxY = chineseFortressStairHeightAt(nextZ) + 0.98;
        } else if (
          box.id === 'rampart-stair-side-fence-west' ||
          box.id === 'rampart-stair-side-fence-east'
        ) {
          const tStair = Math.max(
            0,
            Math.min(
              1,
              (CHINESE_FORTRESS_POS.rampartStairFootZ - nextZ) /
                (CHINESE_FORTRESS_POS.rampartStairFootZ - CHINESE_FORTRESS_POS.rampartStairTopZ)
            )
          );
          const stairY =
            CHINESE_FORTRESS_POS.summitHeight +
            tStair * (CHINESE_FORTRESS_POS.rampartHeight - CHINESE_FORTRESS_POS.summitHeight);
          effectiveMaxY = stairY + 0.95;
        } else if (box.id.startsWith('southern-cliff-pass-guardrail')) {
          effectiveMaxY = southernCliffsidePassTrailHeightAt(nextZ) + 1.25;
        } else if (box.id.startsWith('southern-cliff-pass-mountain-wall')) {
          effectiveMaxY = southernCliffsidePassTrailHeightAt(nextZ) + 3.6;
        } else if (
          box.id.startsWith('galleon-port-stair-side-') ||
          box.id.startsWith('galleon-stbd-stair-side-')
        ) {
          const tGalleonStair = Math.max(0, Math.min(1, (nextZ - 254.5) / 5.0));
          effectiveMaxY = 3.65 + tGalleonStair * 3.0;
        }
        const stepClearance =
          box.id.startsWith('harbor-amphitheater-stage-') ||
          box.id.startsWith('harbor-amphitheater-tier-')
            ? 0.62
            : 0.28;
        if (effectiveMaxY !== undefined && state.y >= effectiveMaxY - stepClearance) continue;

        const resolved = resolveHorizontalBoxCollision(nextX, nextZ, playerRadius, box);
        if (resolved.collided) {
          nextX = resolved.x;
          nextZ = resolved.z;
        }
      }
    }
    };

    // H5, axis by axis: the X move is resolved against the boxes with Z held at its old value, then the Z move
    // is resolved from the resolved X. A diagonal walk into a wall therefore slides along it instead of being pinned
    // by the shallowest push-out of the combined move.
    const targetZ = nextZ;
    nextZ = state.z;
    resolveAgainstBoxes();
    nextZ = targetZ;
    resolveAgainstBoxes();

    for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
      const hw = HILL_WATCHTOWERS[i];
      const dx = nextX - hw.x;
      const dz = nextZ - hw.z;
      if (dx * dx + dz * dz > 64.0) continue;
      const cosN = Math.cos(hw.yaw);
      const sinN = Math.sin(hw.yaw);
      let lx = dx * cosN - dz * sinN;
      let lz = dx * sinN + dz * cosN;
      const doorOpen = Boolean(openDoorIds?.has(hw.doorId));
      const onUpperDeck = state.y >= hw.deckY - 1.2;

      const localWalls = getHillWatchtowerLocalWalls(hw, onUpperDeck, doorOpen);

      let modifiedLocal = false;
      for (let w = 0; w < localWalls.length; w++) {
        const lb = localWalls[w];
        if (lb.maxY !== undefined && state.y >= lb.maxY - 0.28) continue;
        const eMinX = lb.minX - playerRadius;
        const eMaxX = lb.maxX + playerRadius;
        const eMinZ = lb.minZ - playerRadius;
        const eMaxZ = lb.maxZ + playerRadius;
        if (lx <= eMinX || lx >= eMaxX || lz <= eMinZ || lz >= eMaxZ) continue;
        const pL = lx - eMinX;
        const pR = eMaxX - lx;
        const pB = lz - eMinZ;
        const pF = eMaxZ - lz;
        const mP = Math.min(pL, pR, pB, pF);
        if (mP === pL) lx = eMinX;
        else if (mP === pR) lx = eMaxX;
        else if (mP === pB) lz = eMinZ;
        else lz = eMaxZ;
        modifiedLocal = true;
      }
      if (modifiedLocal) {
        const cosP = Math.cos(hw.yaw);
        const sinP = Math.sin(hw.yaw);
        nextX = hw.x + lx * cosP + lz * sinP;
        nextZ = hw.z - lx * sinP + lz * cosP;
      }
    }
  }

  for (let i = 0; i < FORTRESS_DOORS.length; i++) {
    const door = FORTRESS_DOORS[i];
    if (door.id.startsWith('hill-watchtower-')) continue;
    if (openDoorIds?.has(door.id) || isMonkDoorwayActive(door.id)) continue;
    if (state.y >= door.y + 3.6 || state.y + 1.6 < door.y) continue;
    const expMinX = door.minX - playerRadius;
    const expMaxX = door.maxX + playerRadius;
    const expMinZ = door.minZ - playerRadius;
    const expMaxZ = door.maxZ + playerRadius;
    if (nextX > expMinX && nextX < expMaxX && nextZ > expMinZ && nextZ < expMaxZ) {
      const penLeft = nextX - expMinX;
      const penRight = expMaxX - nextX;
      const penBack = nextZ - expMinZ;
      const penFront = expMaxZ - nextZ;
      const minPen = Math.min(penLeft, penRight, penBack, penFront);
      if (minPen === penLeft) nextX = expMinX;
      else if (minPen === penRight) nextX = expMaxX;
      else if (minPen === penBack) nextZ = expMinZ;
      else nextZ = expMaxZ;
    }
  }

  const inStaircaseOrLandingCorridor = isChineseFortressWalkableZone(nextX, nextZ);
  const alreadyOnUpperCitadel = state.y >= CHINESE_FORTRESS_POS.summitHeight - 1.5;

  if (!inStaircaseOrLandingCorridor && !alreadyOnUpperCitadel) {
    const cliffMinX = -54.0 - playerRadius;
    const cliffMaxX = 54.0 + playerRadius;
    const cliffMinZ = -222.0 + FZ - playerRadius;
    const cliffMaxZ = -121.8 + FZ + playerRadius;
    if (nextX > cliffMinX && nextX < cliffMaxX && nextZ > cliffMinZ && nextZ < cliffMaxZ) {
      const penLeft = nextX - cliffMinX;
      const penRight = cliffMaxX - nextX;
      const penNorth = nextZ - cliffMinZ;
      const penSouth = cliffMaxZ - nextZ;
      const minPen = Math.min(penLeft, penRight, penNorth, penSouth);
      if (minPen === penLeft) nextX = cliffMinX;
      else if (minPen === penRight) nextX = cliffMaxX;
      else if (minPen === penNorth) nextZ = cliffMinZ;
      else nextZ = cliffMaxZ;
    }
  }

  // Volcano Boss Arena Lock: once the player steps inside the 60m-diameter Boss Chamber while the
  // King CatLion is alive, untamed, and not yet subdued, the Obsidian Magma Gates lock the exits!
  if (!state.isFlying && isVolcanoBossArenaLocked(state.x, state.z)) {
    const vDx = nextX - VOLCANO_SANCTUM_POS.x;
    const vDz = nextZ - VOLCANO_SANCTUM_POS.z;
    const vDist = Math.hypot(vDx, vDz);
    const lockRadius = VOLCANO_SANCTUM_POS.chamberRadius - 1.4;
    if (vDist > lockRadius && vDist > 0.001) {
      nextX = VOLCANO_SANCTUM_POS.x + (vDx / vDist) * lockRadius;
      nextZ = VOLCANO_SANCTUM_POS.z + (vDz / vDist) * lockRadius;
    }
  }

  // Prevent side-collision snap-up & block climbing overly steep mountain slopes (> 38.7 deg, normal.ny < 0.78),
  // while never blocking a swimming/wading player on underwater seabed slopes when approaching dry land!
  if (!state.isFlying && !onLadderVolume) {
    const currFloor = walkableHeightAt(state.x, state.z, state.y);
    const isSwimmingOrWading = Boolean(
      state.isSwimming ||
        state.inWater ||
        (currFloor.height <= WATER_LEVEL + 0.55 &&
          getWaterSurfaceHeightAt(state.x, state.z, state.y) !== null)
    );
    const maxStepUp = isSwimmingOrWading ? 1.15 : 0.56;
    const refPlayerY = isSwimmingOrWading ? Math.max(state.y, WATER_LEVEL + 0.35) : state.y;

    const isBlockedMoveTo = (tx: number, tz: number): boolean => {
      const floor = walkableHeightAt(tx, tz, state.y);
      if (floor.height - refPlayerY > maxStepUp) {
        return true;
      }
      // Enforce steep slope climbing limit only when moving uphill on dry land above shoreline level
      if (
        !isSwimmingOrWading &&
        floor.surface === 'ground' &&
        floor.height > WATER_LEVEL + 0.65 &&
        floor.height > currFloor.height + 0.008
      ) {
        const horizStep = Math.hypot(tx - state.x, tz - state.z);
        const stepGrade = horizStep > 1e-4 ? (floor.height - currFloor.height) / horizStep : 0;
        const surfNorm = getSurfaceNormalAt(tx, tz);
        if (surfNorm.ny < 0.78 || stepGrade > 0.80) {
          return true;
        }
      }
      return false;
    };

    if (isBlockedMoveTo(nextX, nextZ)) {
      const xOk = !isBlockedMoveTo(nextX, state.z);
      const zOk = !isBlockedMoveTo(state.x, nextZ);
      if (xOk && !zOk) {
        nextZ = state.z;
      } else if (zOk && !xOk) {
        nextX = state.x;
      } else if (xOk && zOk) {
        if (Math.abs(nextX - state.x) >= Math.abs(nextZ - state.z)) {
          nextZ = state.z;
        } else {
          nextX = state.x;
        }
      } else {
        nextX = state.x;
        nextZ = state.z;
      }
    }
  }

  const distFromCenter = Math.hypot(nextX, nextZ);
  if (distFromCenter > PLAYABLE_RADIUS) {
    const scaleBack = PLAYABLE_RADIUS / distFromCenter;
    nextX *= scaleBack;
    nextZ *= scaleBack;
  }

  const dxMoved = nextX - state.x;
  const dzMoved = nextZ - state.z;
  const stepDist = Math.hypot(dxMoved, dzMoved);

  state.x = nextX;
  state.z = nextZ;
  state.distanceWalked += stepDist;

  const wasGrounded = state.onGround;
  const walkSurface = walkableHeightAt(state.x, state.z, state.y);
  // Standing on top of a solid box (table, crate, cart, bed): its top is a floor when the feet are within a small step of it.
  const highestBoxTopY = highestStandableBoxTopAt(state.x, state.z, state.y);
  const standingOnBoulder = highestBoulderTopY > walkSurface.height;
  const baseFloorY = Math.max(walkSurface.height, highestBoxTopY);
  const effectiveWalkHeight = standingOnBoulder ? highestBoulderTopY : baseFloorY;
  const waterSurfaceY = getWaterSurfaceHeightAt(state.x, state.z, state.y);
  const isDeepWater =
    !inSkyWaterfallUpdraft &&
    !standingOnBoulder &&
    waterSurfaceY !== null &&
    (walkSurface.surface === 'ground' ||
      (walkSurface.surface === 'bridge' && isInsideSouthernMine(state.x, state.z, state.y))) &&
    waterSurfaceY - effectiveWalkHeight >= 0.65;

  let landedImpact = 0;
  const prevVy = state.vy;

  if (onLadderVolume && activeLadder) {
    state.y += state.vy * dt;
    state.y = Math.max(activeLadder.minY, Math.min(activeLadder.maxY + 0.05, state.y));
    state.onGround = true;
    state.isSwimming = false;
    state.inWater = false;
  } else if (isDeepWater && waterSurfaceY !== null && !state.mountedHorseId) {
    const swimTargetY = waterSurfaceY - 0.95;
    const basinFloorY = effectiveWalkHeight + 0.15;

    if (state.y <= waterSurfaceY - 0.25) {
      state.isSwimming = true;
      state.bowDrawn = false;
      state.bowDrawProgress = 0;

      const isPitchDiving = input.forward > 0.1 && state.pitch < -0.24;
      const isPitchAscending =
        input.forward > 0.1 && state.pitch > 0.24 && state.y < swimTargetY - 0.1;
      const wantsDive = input.relaxed || isPitchDiving;
      const wantsAscend = input.jumpHeld || isPitchAscending;

      if (
        input.jumpPressed &&
        state.y >= swimTargetY - 0.35 &&
        waterSurfaceY - effectiveWalkHeight < 1.35
      ) {
        state.vy = 5.4;
        state.isSwimming = false;
      } else if (wantsDive) {
        const diveRate = input.relaxed
          ? -3.8
          : Math.min(-1.8, Math.sin(state.pitch) * (input.sprint ? 5.2 : 3.8));
        state.vy = state.vy * Math.exp(-8.0 * dt) + (diveRate - state.vy) * (1 - Math.exp(-10.0 * dt));
      } else if (wantsAscend) {
        const ascendRate = input.jumpHeld
          ? 3.8
          : Math.max(1.8, Math.sin(state.pitch) * (input.sprint ? 5.2 : 3.8));
        state.vy =
          state.vy * Math.exp(-8.0 * dt) + (ascendRate - state.vy) * (1 - Math.exp(-10.0 * dt));
      } else if (state.y >= swimTargetY - 0.35) {
        const buoyancy = (swimTargetY - state.y) * 18.0;
        state.vy = state.vy * Math.exp(-8.5 * dt) + buoyancy * dt;
      } else {
        // Submerged underwater: maintain chosen depth with very gentle upward drift
        const deepBuoyancy = (swimTargetY - state.y) * 0.35;
        state.vy = state.vy * Math.exp(-7.5 * dt) + deepBuoyancy * dt;
      }

      state.y += state.vy * dt;
      const maxSwimY = state.isSwimming ? waterSurfaceY - 0.38 : waterSurfaceY + 2.0;
      state.y = Math.max(basinFloorY, Math.min(maxSwimY, state.y));
      state.onGround = true;
      state.coyoteTimer = 0.12;
      state.inWater = true;
    } else {
      state.y += state.vy * dt;
      if (state.y <= swimTargetY) {
        state.y = swimTargetY;
        state.vy = 0;
        state.isSwimming = true;
        state.bowDrawn = false;
        state.bowDrawProgress = 0;
        state.onGround = true;
        state.inWater = true;
      } else {
        state.isSwimming = false;
        state.inWater = state.y < waterSurfaceY;
        state.onGround = false;
      }
    }
  } else {
    state.isSwimming = false;
    const effectiveFloorY = effectiveWalkHeight;
    state.y += state.vy * dt;

    if (state.y <= effectiveFloorY || (wasGrounded && prevVy <= 0 && state.y - effectiveFloorY <= 0.85)) {
      if (!wasGrounded && prevVy < -2.2) {
        landedImpact = Math.min(1.0, Math.abs(prevVy) / 10.0);
        state.lastLandingSpeed = Math.max(state.lastLandingSpeed ?? 0, Math.abs(prevVy));
      }
      state.y = effectiveFloorY;
      state.vy = 0;
      state.onGround = true;
    } else {
      state.onGround = false;
    }
    state.inWater =
      !standingOnBoulder &&
      waterSurfaceY !== null &&
      walkSurface.surface === 'ground' &&
      state.y < waterSurfaceY - 0.08;
  }

  state.currentBiome = getSurfaceBiomeAt(state.x, state.z, state.y);

  let steppedFoot = false;
  const horizSpeed = Math.hypot(state.vx, state.vz);
  if ((state.onGround || state.isSwimming) && horizSpeed > 0.22) {
    const isHorseGallop = isMountedOnHorse && horizSpeed > 6.8;
    const strideFreq = state.isSwimming
      ? 1.65
      : isHorseGallop
        ? 1.12
        : isMountedOnHorse
          ? 1.45
          : state.walkPace === 'fast'
            ? 2.15
            : state.walkPace === 'relaxed'
              ? 1.55
              : 1.85;
    const prevCycle = Math.floor(state.bobPhase / Math.PI);
    state.bobPhase += stepDist * strideFreq;
    const nextCycle = Math.floor(state.bobPhase / Math.PI);
    if (nextCycle > prevCycle) {
      state.stepCount += 1;
      steppedFoot = true;
    }
    const targetBob = Math.min(1.0, horizSpeed / 5.0);
    state.bobAmount += (targetBob - state.bobAmount) * (1.0 - Math.exp(-10 * dt));
  } else if (state.isSwimming) {
    state.bobPhase += dt * 2.2;
    state.bobAmount += (0.28 - state.bobAmount) * (1.0 - Math.exp(-6 * dt));
  } else {
    state.bobAmount *= Math.exp(-10 * dt);
  }

  // Stamina & RPG Skill Progression
  // Strict Mount Stamina Hierarchy (when mounted, sprinting drains ONLY the mount's stamina, never the player's!):
  // 1) Boss CatLion ('mount-lion-') has the MOST stamina (slowest drain: 4.2 / sec)
  // 2) Royal Stag ('mount-stag-') has MEDIUM stamina (drain: 9.5 / sec)
  // 3) Horse ('horse-') has the LEAST stamina (fastest drain: 16.5 / sec)
  if (isMountedOnHorse) {
    if (input.sprint && canSprint && horizSpeed > 1.2) {
      const mountDrainRate = isMountedOnLion
        ? 4.2
        : isMountedOnStag
          ? 8.5
          : 11.0;
      curMountStam = Math.max(0, curMountStam - mountDrainRate * dt);
      if (curMountStam <= 0.5) {
        curMountStam = 0;
        mountExhausted = true;
      }
    } else {
      const mountRegenRate = input.sprint && !mountExhausted ? 4.0 : 15.0;
      curMountStam = Math.min(mountMaxStam, curMountStam + mountRegenRate * dt);
      if (mountExhausted && curMountStam >= mountRecoveryGate) {
        mountExhausted = false;
      }
    }
    state.mountStamina = curMountStam;
    state.mountMaxStamina = mountMaxStam;
    state.mountStaminaExhausted = mountExhausted;
    if (activeMountedEntity) {
      activeMountedEntity.stamina = curMountStam;
      activeMountedEntity.maxStamina = mountMaxStam;
      activeMountedEntity.staminaExhausted = mountExhausted;
    }
  } else {
    state.mountStamina = undefined;
    state.mountMaxStamina = undefined;
    state.mountStaminaExhausted = undefined;
  }

  // Player's own stamina: drains ONLY when sprinting on foot OR holding right-click bow zoom (`bowZoomHeld`).
  // Drawing an arrow (`bowDrawn`) without holding right-click zoom does NOT drain stamina!
  const maxStam = state.maxStamina ?? 100;
  let curStam = state.stamina ?? maxStam;
  if (!isMountedOnHorse && input.sprint && canSprint && horizSpeed > 1.2) {
    const drainRate = 11.5;
    curStam = Math.max(0, curStam - drainRate * dt);
    if (curStam <= 0.5) {
      curStam = 0;
      state.staminaExhausted = true;
    }
  } else if (!state.staminaExhausted && Boolean(state.bowZoomHeld)) {
    const bowZoomDrainRate = 11.0;
    curStam = Math.max(0, curStam - bowZoomDrainRate * dt);
    if (curStam <= 0.5) {
      curStam = 0;
      state.staminaExhausted = true;
      state.bowZoomHeld = false;
    }
  } else {
    if (state.staminaExhausted) {
      state.bowZoomHeld = false;
    }
    const inNordicHotSpring =
      Math.hypot(state.x - NORDIC_FROST_SHRINE_POS.x, state.z - NORDIC_FROST_SHRINE_POS.z) <=
      NORDIC_FROST_SHRINE_POS.poolRadius + 2.5;
    const onSunPyramidAltar =
      Math.hypot(state.x - DESERT_PYRAMID_SANCTUARY_POS.x, state.z - DESERT_PYRAMID_SANCTUARY_POS.z) <=
        6.5 && state.y >= DESERT_PYRAMID_SANCTUARY_POS.topY - 0.5;
    const sanctuaryBonusRegen = inNordicHotSpring || onSunPyramidAltar ? 28.0 : 0.0;
    const regenRate =
      (!isMountedOnHorse && input.sprint && !state.staminaExhausted ? 3.5 : 16.0) +
      sanctuaryBonusRegen;
    curStam = Math.min(maxStam, curStam + regenRate * dt);
    if (
      state.staminaExhausted &&
      curStam >= Math.min(STAMINA_EXHAUSTION_RECOVERY_THRESHOLD, maxStam * 0.25)
    ) {
      state.staminaExhausted = false;
    }
  }
  state.stamina = curStam;

  if (state.skills) {
    if (state.skills.lastLevelUpTimer && state.skills.lastLevelUpTimer > 0) {
      state.skills.lastLevelUpTimer = Math.max(0, state.skills.lastLevelUpTimer - dt);
      if (state.skills.lastLevelUpTimer === 0) {
        state.skills.lastLevelUpSkill = null;
        state.skills.lastLevelUpTitle = null;
      }
    }
    if (stepDist > 0.01) {
      if (isMountedOnHorse) {
        awardSkillXp(state, 'horsemanship', stepDist * 0.45);
      } else if (input.sprint || state.isSwimming || state.climbingLadderId) {
        awardSkillXp(state, 'athletics', stepDist * 0.12);
      }
      if (isInsideSouthernMine(state.x, state.z)) {
        awardSkillXp(state, 'exploration', stepDist * 0.18);
      }
    }
  }

  if (horses) {
    for (let i = 0; i < horses.length; i++) {
      const h = horses[i];
      if (h.id === state.mountedHorseId) {
        h.x = state.x;
        h.y = state.y;
        h.z = state.z;
        h.vy = state.vy;
        state.mountedHorseYaw = h.yaw;
        h.speed = horizSpeed;
        h.gaitPhase = state.bobPhase;
        if (h.id.startsWith('mount-stag-') || h.id.startsWith('mount-lion-')) {
          const worldAnimals = getActiveWorldAnimals();
          for (let aIdx = 0; aIdx < worldAnimals.length; aIdx++) {
            const a = worldAnimals[aIdx];
            const expectedId = a.species === 'stag' ? `mount-stag-${a.id}` : `mount-lion-${a.id}`;
            if (expectedId === h.id) {
              a.x = state.x;
              a.y = state.y;
              a.z = state.z;
              a.vx = state.vx;
              a.vz = state.vz;
              a.yaw = Math.atan2(Math.sin(h.yaw + Math.PI), Math.cos(h.yaw + Math.PI));
              a.inWater = state.inWater;
              a.isMountedByPlayer = true;
              a.isTamed = true;
            }
          }
        }
      } else {
        const horseFloorY = walkableHeightValueAt(h.x, h.z, h.y);
        if (h.y > horseFloorY + 0.001 || (h.vy ?? 0) !== 0) {
          const nextVy = (h.vy ?? 0) - GRAVITY * dt;
          const nextY = h.y + nextVy * dt;
          if (nextY <= horseFloorY) {
            h.y = horseFloorY;
            h.vy = 0;
          } else {
            h.y = nextY;
            h.vy = nextVy;
          }
        } else {
          h.y = horseFloorY;
          h.vy = 0;
        }
        if (h.speed > 0.001) {
          h.speed *= Math.exp(-8.0 * dt);
          if (h.speed < 0.01) h.speed = 0;
        }
        // Regenerate resting unmounted horse stamina
        const hMaxStam = h.maxStamina ?? 100;
        const hCurStam = h.stamina ?? hMaxStam;
        if (hCurStam < hMaxStam) {
          h.stamina = Math.min(hMaxStam, hCurStam + 16.0 * dt);
          if (h.staminaExhausted && h.stamina >= Math.min(STAMINA_EXHAUSTION_RECOVERY_THRESHOLD, hMaxStam * 0.25)) {
            h.staminaExhausted = false;
          }
        }
      }
    }
  }

  return { steppedFoot, landedImpact };
}
// #endregion

// ======================== SKILL PROGRESSION & EXPERIENCE ======================== \\
// #region Skill Progression & Experience
/**
 * Summary: Skill progression name.
 * Design: Standard type implementing domain specifications and behavioral contracts.
 */
export type SkillProgressionName =
  | 'archery'
  | 'swordsmanship'
  | 'horsemanship'
  | 'athletics'
  | 'exploration';

interface ISkillAccessor {
  getLevel: (s: ICharacterSkillsState) => number;
  setLevel: (s: ICharacterSkillsState, v: number) => void;
  getXp: (s: ICharacterSkillsState) => number;
  setXp: (s: ICharacterSkillsState, v: number) => void;
  getXpNext: (s: ICharacterSkillsState) => number;
  setXpNext: (s: ICharacterSkillsState, v: number) => void;
}

const SKILL_ACCESSORS: Readonly<Record<SkillProgressionName, ISkillAccessor>> = Object.freeze({
  archery: {
    getLevel: (s) => s.archeryLevel,
    setLevel: (s, v) => { s.archeryLevel = v; },
    getXp: (s) => s.archeryXp,
    setXp: (s, v) => { s.archeryXp = v; },
    getXpNext: (s) => s.archeryXpNext,
    setXpNext: (s, v) => { s.archeryXpNext = v; },
  },
  swordsmanship: {
    getLevel: (s) => s.swordsmanshipLevel,
    setLevel: (s, v) => { s.swordsmanshipLevel = v; },
    getXp: (s) => s.swordsmanshipXp,
    setXp: (s, v) => { s.swordsmanshipXp = v; },
    getXpNext: (s) => s.swordsmanshipXpNext,
    setXpNext: (s, v) => { s.swordsmanshipXpNext = v; },
  },
  horsemanship: {
    getLevel: (s) => s.horsemanshipLevel,
    setLevel: (s, v) => { s.horsemanshipLevel = v; },
    getXp: (s) => s.horsemanshipXp,
    setXp: (s, v) => { s.horsemanshipXp = v; },
    getXpNext: (s) => s.horsemanshipXpNext,
    setXpNext: (s, v) => { s.horsemanshipXpNext = v; },
  },
  athletics: {
    getLevel: (s) => s.athleticsLevel,
    setLevel: (s, v) => { s.athleticsLevel = v; },
    getXp: (s) => s.athleticsXp,
    setXp: (s, v) => { s.athleticsXp = v; },
    getXpNext: (s) => s.athleticsXpNext,
    setXpNext: (s, v) => { s.athleticsXpNext = v; },
  },
  exploration: {
    getLevel: (s) => s.explorationLevel,
    setLevel: (s, v) => { s.explorationLevel = v; },
    getXp: (s) => s.explorationXp,
    setXp: (s, v) => { s.explorationXp = v; },
    getXpNext: (s) => s.explorationXpNext,
    setXpNext: (s, v) => { s.explorationXpNext = v; },
  },
});

/**
 * Summary: I skill progression result.
 * Design: Standard interface implementing domain specifications and behavioral contracts.
 */
export interface ISkillProgressionResult {
  readonly leveledUp: boolean;
  readonly skillTitle: string;
  readonly newLevel: number;
}

/**
 * Summary: Core reusable helper applying XP gain and computing level-ups for RPG attributes.
 * @param state Player state; updated in place.
 * @param skillName Skill to award.
 * @param amount Experience points to add.
 * @returns Level-up details when the skill leveled up, otherwise null.
 */
export function applySkillXpGain(
  state: IPlayerState,
  skillName: SkillProgressionName,
  amount: number
): ISkillProgressionResult | null {
  if (!state.skills || amount <= 0) return null;
  const s = state.skills;
  const accessor = SKILL_ACCESSORS[skillName];
  if (!accessor) return null;

  const currentXp = accessor.getXp(s) + amount;
  const currentXpNext = accessor.getXpNext(s);
  let currentLevel = accessor.getLevel(s);

  accessor.setXp(s, currentXp);

  if (currentXp >= currentXpNext) {
    accessor.setXp(s, currentXp - currentXpNext);
    currentLevel += 1;
    accessor.setLevel(s, currentLevel);
    accessor.setXpNext(s, Math.round(currentXpNext * 1.45 + 90));

    if (skillName === 'athletics') {
      state.maxStamina = (state.maxStamina ?? 100) + 10;
      state.stamina = state.maxStamina;
    }

    state.goldCoins = (state.goldCoins ?? 280) + 35;
    s.lastLevelUpSkill = skillName;
    const skillTitle = t(`skills.${skillName}`);
    s.lastLevelUpTitle = t('skills.level_up_title', { title: skillTitle, level: currentLevel });
    s.lastLevelUpTimer = 4.0;
    return { leveledUp: true, skillTitle, newLevel: currentLevel };
  }

  return null;
}

/**
 * Summary: Awards RPG skill experience points and handles level-up thresholds and stat bonuses.
 * @param state Player state; updated in place.
 * @param skillName Skill to award.
 * @param amount Experience points to add.
 * @returns Level-up details when the skill leveled up, otherwise null.
 */
export function awardSkillXp(
  state: IPlayerState,
  skillName: SkillProgressionName,
  amount: number
): ISkillProgressionResult | null {
  return applySkillXpGain(state, skillName, amount);
}
// #endregion
