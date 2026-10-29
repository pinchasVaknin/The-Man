// ============================================================================
// MODULE: World / Systems / Player Physics
// DESIGN: Player kinematic locomotion, jumping, swimming, ladder climbing, and RPG skills (SRP)
// SUMMARY: Implements 60FPS kinematic player physics, coyote time, jump buffering,
//          obstacle and building collision resolution, water buoyancy, and skill progression.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { t } from '../../locales';
import type {
  IPlayerState,
  IPlayerInput,
  IObstacleCylinder,
  IRideableHorseState,
  ICharacterSkillsState,
} from '../domain/worldTypes';
import {
  WATER_LEVEL,
  PLAYABLE_RADIUS,
  WORLD_SPAWN,
  RIDEABLE_HORSES,
  FORTRESS_Z_OFFSET,
  CHINESE_FORTRESS_POS,
  HILL_WATCHTOWERS,
  FORTRESS_DOORS,
  SOLID_BUILDING_BOXES,
  getLadderById,
  findWatchtowerLadderAt,
  findLookedAtWatchtowerLadder,
} from '../domain/landmarksRegistry';
import { isInsideSouthernMine } from './dwarvenMineAndCaravanSystem';
import {
  isChineseFortressWalkableZone,
  chineseFortressStairHeightAt,
  getWaterSurfaceHeightAt,
  walkableHeightAt,
  getSurfaceBiomeAt,
} from './terrainAndBiomeSystem';
import { stepMountedHorseSteering } from './horsePhysicsSystem';
// #endregion

// ======================== INITIALIZERS & LEVEL QUERIES ======================== \\
// #region Initializers & Level Queries
const FZ = FORTRESS_Z_OFFSET;

/**
 * Summary: Creates and initializes default player state at the designated world spawn coordinates.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @returns Computed result for createInitialPlayerState.
 */
export function createInitialPlayerState(): IPlayerState {
  const ground = walkableHeightAt(WORLD_SPAWN.x, WORLD_SPAWN.z);
  return {
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
    arrowKind: 'normal',
    goldCoins: 280,
    ownedItemIds: [
      'bow',
      'sword',
      'torch',
      'unarmed',
      'arrow_normal',
      'arrow_fire',
      'arrow_wind',
      'oak_timber',
      'cut_granite_blocks',
      'iron_ingots',
      'dwarven_gold_ore',
      'crystal_gem',
      'ancient_dwarven_horn',
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
}

/**
 * Summary: Calculates the composite RPG Hero Level based on individual skill levels.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param state Input parameter state.
 * @returns Computed result for getPlayerHeroLevel.
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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @returns Computed result for createInitialRideableHorses.
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
    };
  });
}
// #endregion

// ======================== HORSE SEARCH & MOUNTING ======================== \\
// #region Horse Search & Mounting
/**
 * Summary: Finds the nearest rideable horse within interaction proximity of the player.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @returns Computed result for findNearestRideableHorse.
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
  return best;
}
// #endregion

// ======================== KINEMATIC SIMULATION STEP ======================== \\
// #region Kinematic Simulation Step
/**
 * Summary: Steps player movement physics, collision handling, jumping, climbing, and swimming.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: [HOT-PATH EXCEPTION] Evaluated each frame at 60FPS; mutates player velocity and position in place.
 * Relaxed Rule: Rule 1 (in-place state mutation instead of immutable reconstruction).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.12ms per physics substep.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @returns Computed result for stepPlayerPhysics.
 */
export function stepPlayerPhysics(
  state: IPlayerState,
  input: IPlayerInput,
  obstacles: IObstacleCylinder[],
  rawDt: number,
  openDoorIds?: ReadonlySet<string>,
  horses?: IRideableHorseState[]
): { steppedFoot: boolean; landedImpact: number } {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.11);

  state.yaw += input.lookYawDelta;
  state.pitch = Math.max(-1.38, Math.min(1.38, state.pitch + input.lookPitchDelta));

  if (input.toggleMountHorseRequested && horses && horses.length > 0) {
    if (state.mountedHorseId) {
      const currentHorse = horses.find((h) => h.id === state.mountedHorseId);
      state.mountedHorseId = null;
      if (currentHorse) {
        currentHorse.speed = 0;
        const sideX = Math.cos(currentHorse.yaw) * 0.95;
        const sideZ = -Math.sin(currentHorse.yaw) * 0.95;
        state.x = currentHorse.x + sideX;
        state.z = currentHorse.z + sideZ;
        state.y = walkableHeightAt(state.x, state.z, state.y).height;
      }
    } else {
      const nearHorse = findNearestRideableHorse(state.x, state.y, state.z, horses, 3.8);
      if (nearHorse) {
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

  if (input.toggleFlyRequested) {
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

    const floorY = Math.max(walkableHeightAt(state.x, state.z, state.y).height, WATER_LEVEL - 0.5);
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
    state.bobAmount *= Math.exp(-10 * dt);
    state.currentBiome = getSurfaceBiomeAt(state.x, state.z, state.y);
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
  let paceMultiplier = 1.0;
  if (input.relaxed && !input.sprint) {
    paceMultiplier = 0.55;
    state.walkPace = 'relaxed';
  } else if (input.sprint) {
    paceMultiplier = isMountedOnHorse ? 1.62 : 1.75;
    state.walkPace = 'fast';
  } else {
    paceMultiplier = 1.0;
    state.walkPace = 'normal';
  }

  const baseWalkSpeed = isMountedOnHorse ? 9.4 : 5.0;
  const waterSlowdown = state.inWater ? 0.68 : 1.0;
  const dashMultiplier = isDashing ? (state.isSwimming ? 2.45 : 2.35) : 1.0;
  const targetSpeed = baseWalkSpeed * paceMultiplier * waterSlowdown * dashMultiplier;

  const dashDirX = moveLen > 0.05 ? moveX : fwdX;
  const dashDirZ = moveLen > 0.05 ? moveZ : fwdZ;
  const targetVx = (isDashing ? dashDirX : moveX) * targetSpeed;
  const targetVz = (isDashing ? dashDirZ : moveZ) * targetSpeed;

  const accel = isDashing ? 24.0 : state.onGround ? 15.0 : 5.5;
  const damp = 1.0 - Math.exp(-accel * dt);
  state.vx += (targetVx - state.vx) * damp;
  state.vz += (targetVz - state.vz) * damp;

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

    if (input.jumpPressed && !jumpConsumedByLadder) {
      state.jumpBufferTimer = 0.13;
    } else {
      state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
    }

    if (state.jumpBufferTimer > 0 && state.coyoteTimer > 0) {
      state.vy = isMountedOnHorse ? 7.45 : 6.25;
      state.onGround = false;
      state.coyoteTimer = 0;
      state.jumpBufferTimer = 0;
    }

    if (!input.jumpHeld && state.vy > 1.8) {
      state.vy *= 0.65;
    }

    if (!state.isSwimming) {
      const gravity = -14.8;
      state.vy += gravity * dt;
    }
  }

  let nextX = state.x + state.vx * dt;
  let nextZ = state.z + state.vz * dt;

  const playerRadius = 0.44;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const dx = nextX - obs.x;
    const dz = nextZ - obs.z;
    if (Math.abs(dx) > 2.5 || Math.abs(dz) > 2.5) continue;
    const minDist = playerRadius + obs.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist && distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const nz = dz / dist;
      nextX += nx * overlap;
      nextZ += nz * overlap;
    }
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < SOLID_BUILDING_BOXES.length; i++) {
      const box = SOLID_BUILDING_BOXES[i];
      const expMinX = box.minX - playerRadius;
      const expMaxX = box.maxX + playerRadius;
      const expMinZ = box.minZ - playerRadius;
      const expMaxZ = box.maxZ + playerRadius;
      if (nextX <= expMinX || nextX >= expMaxX || nextZ <= expMinZ || nextZ >= expMaxZ) continue;

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
      }
      if (effectiveMaxY !== undefined && state.y >= effectiveMaxY - 0.22) continue;

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

    interface ILocalBox {
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      maxY?: number;
    }
    const localWalls: ILocalBox[] = [];
    if (!onUpperDeck) {
      localWalls.push(
        { minX: -3.75, maxX: -3.25, minZ: -3.7, maxZ: 3.7, maxY: hw.baseY + 5.2 },
        { minX: 3.25, maxX: 3.75, minZ: -3.7, maxZ: 3.7, maxY: hw.baseY + 5.2 }
      );
      const backZ = -hw.doorSideLocalZ * 3.5;
      const doorZ = hw.doorSideLocalZ * 3.5;
      localWalls.push({ minX: -3.7, maxX: 3.7, minZ: backZ - 0.25, maxZ: backZ + 0.25, maxY: hw.baseY + 5.2 });
      localWalls.push(
        { minX: -3.7, maxX: -1.1, minZ: doorZ - 0.25, maxZ: doorZ + 0.25, maxY: hw.baseY + 5.2 },
        { minX: 1.1, maxX: 3.7, minZ: doorZ - 0.25, maxZ: doorZ + 0.25, maxY: hw.baseY + 5.2 }
      );
      if (!doorOpen) {
        localWalls.push({ minX: -1.1, maxX: 1.1, minZ: doorZ - 0.22, maxZ: doorZ + 0.22, maxY: hw.baseY + 3.8 });
      }
    } else {
      const pMaxY = hw.deckY + 0.96;
      localWalls.push(
        { minX: -3.65, maxX: -3.35, minZ: -3.6, maxZ: 3.6, maxY: pMaxY },
        { minX: 3.35, maxX: 3.65, minZ: -3.6, maxZ: 3.6, maxY: pMaxY }
      );
      for (const sideZ of [-1, 1] as const) {
        const zCenter = sideZ * 3.5;
        if (hw.bridgeSideLocalZ === sideZ) {
          localWalls.push(
            { minX: -3.6, maxX: -1.65, minZ: zCenter - 0.18, maxZ: zCenter + 0.18, maxY: pMaxY },
            { minX: 1.65, maxX: 3.6, minZ: zCenter - 0.18, maxZ: zCenter + 0.18, maxY: pMaxY }
          );
        } else {
          localWalls.push({ minX: -3.6, maxX: 3.6, minZ: zCenter - 0.18, maxZ: zCenter + 0.18, maxY: pMaxY });
        }
      }
    }

    let modifiedLocal = false;
    for (let w = 0; w < localWalls.length; w++) {
      const lb = localWalls[w];
      if (lb.maxY !== undefined && state.y >= lb.maxY - 0.22) continue;
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

  for (let i = 0; i < FORTRESS_DOORS.length; i++) {
    const door = FORTRESS_DOORS[i];
    if (door.id.startsWith('hill-watchtower-')) continue;
    if (openDoorIds?.has(door.id)) continue;
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
  const waterSurfaceY = getWaterSurfaceHeightAt(state.x, state.z, state.y);
  const isDeepWater =
    waterSurfaceY !== null &&
    (walkSurface.surface === 'ground' ||
      (walkSurface.surface === 'bridge' && isInsideSouthernMine(state.x, state.z, state.y))) &&
    waterSurfaceY - walkSurface.height >= 0.65;

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
    const basinFloorY = Math.max(walkSurface.height, waterSurfaceY - 2.2);

    if (state.y <= waterSurfaceY - 0.25) {
      state.isSwimming = true;
      state.bowDrawn = false;
      state.bowDrawProgress = 0;
      const buoyancy = (swimTargetY - state.y) * 18.0;
      state.vy = state.vy * Math.exp(-8.5 * dt) + buoyancy * dt;
      if (input.jumpPressed && waterSurfaceY - walkSurface.height < 1.35) {
        state.vy = 5.4;
        state.isSwimming = false;
      } else if (input.jumpHeld) {
        state.vy = Math.max(state.vy, 1.4);
      }
      state.y += state.vy * dt;
      state.y = Math.max(basinFloorY, Math.min(waterSurfaceY - 0.38, state.y));
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
    const effectiveFloorY = walkSurface.height;
    state.y += state.vy * dt;

    if (state.y <= effectiveFloorY || (wasGrounded && prevVy <= 0 && state.y - effectiveFloorY <= 0.85)) {
      if (!wasGrounded && prevVy < -2.2) {
        landedImpact = Math.min(1.0, Math.abs(prevVy) / 10.0);
      }
      state.y = effectiveFloorY;
      state.vy = 0;
      state.onGround = true;
    } else {
      state.onGround = false;
    }
    state.inWater =
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
  const maxStam = state.maxStamina ?? 100;
  let curStam = state.stamina ?? maxStam;
  if (input.sprint && horizSpeed > 1.2) {
    const drainRate = isMountedOnHorse ? 5.5 : 10.5;
    curStam = Math.max(8, curStam - drainRate * dt);
  } else if (state.bowDrawn && (state.bowDrawProgress ?? 0) > 0.65) {
    curStam = Math.max(5, curStam - 7.5 * dt);
  } else {
    curStam = Math.min(maxStam, curStam + 18.0 * dt);
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

  if (state.mountedHorseId && horses) {
    const mountedHorse = horses.find((h) => h.id === state.mountedHorseId);
    if (mountedHorse) {
      mountedHorse.x = state.x;
      mountedHorse.y = state.y;
      mountedHorse.z = state.z;
      state.mountedHorseYaw = mountedHorse.yaw;
      mountedHorse.speed = horizSpeed;
      mountedHorse.gaitPhase = state.bobPhase;
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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param state Input parameter state.
 * @param skillName Input parameter skillName.
 * @param amount Input parameter amount.
 * @returns Computed result for applySkillXpGain.
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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param state Input parameter state.
 * @param skillName Input parameter skillName.
 * @param amount Input parameter amount.
 * @returns Computed result for awardSkillXp.
 */
export function awardSkillXp(
  state: IPlayerState,
  skillName: SkillProgressionName,
  amount: number
): ISkillProgressionResult | null {
  return applySkillXpGain(state, skillName, amount);
}
// #endregion
