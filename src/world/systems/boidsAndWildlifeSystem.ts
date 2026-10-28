// ============================================================================
// MODULE: World / Systems / Boids And Wildlife
// DESIGN: Reynolds 3D boids flocking algorithm and reactive ground wildlife (SRP)
// SUMMARY: Simulates bird flock separation, alignment, cohesion, and altitude control,
//          as well as proximity-reactive foraging, alert, and fleeing woodland critters.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { groundHeightAt as heightAt, walkableHeightAt } from './terrainAndBiomeSystem';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
export interface BoidBirdState {
  readonly id: string;
  readonly flockId: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  bankRoll: number;
  wingPhase: number;
  fleeTimer: number;
  readonly scale: number;
}

export interface BirdFlockConfig {
  readonly flockId: number;
  readonly homeX: number;
  readonly homeZ: number;
  readonly cruiseAltitudeAboveGround: number;
  readonly patrolRadius: number;
}

export interface SmallAnimalState {
  readonly id: string;
  readonly species: 'rabbit' | 'squirrel';
  readonly homeX: number;
  readonly homeZ: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hopPhase: number;
  hopHeight: number;
  alertLevel: 'foraging' | 'alert' | 'fleeing';
  fleeCooldown: number;
  earPerk: number;
}

export interface BoidsAndWildlifeStepResult {
  readonly startledFlockCount: number;
  readonly scamperedCritterCount: number;
  readonly nearestBirdDist: number;
  readonly nearestCritterDist: number;
}

export const BIRD_FLOCK_CONFIGS: readonly BirdFlockConfig[] = [
  { flockId: 0, homeX: 12.0, homeZ: 34.0, cruiseAltitudeAboveGround: 13.5, patrolRadius: 42.0 },
  { flockId: 1, homeX: -38.0, homeZ: 56.0, cruiseAltitudeAboveGround: 15.0, patrolRadius: 48.0 },
  { flockId: 2, homeX: 55.0, homeZ: -25.0, cruiseAltitudeAboveGround: 16.5, patrolRadius: 52.0 },
  { flockId: 3, homeX: 185.0, homeZ: 215.0, cruiseAltitudeAboveGround: 14.5, patrolRadius: 46.0 },
] as const;

/** Summary: Birds instantiated per flock patrol node. */
const BIRDS_PER_FLOCK = 9;

/** Summary: Reynolds Boids flocking weights and perception radii. */
const BOID_NEIGHBOR_RADIUS = 15.5;
const BOID_SEPARATION_RADIUS = 3.8;
const BOID_SEPARATION_WEIGHT = 2.65;
const BOID_ALIGNMENT_WEIGHT = 1.35;
const BOID_COHESION_WEIGHT = 1.15;
const BOID_HOME_WEIGHT = 0.55;
const BOID_PLAYER_BASE_THREAT_RADIUS = 29.0;

/** Summary: Small wildlife interaction radii & speeds. */
const CRITTER_ALERT_RADIUS = 18.0;
const CRITTER_BASE_FLEE_RADIUS = 11.5;
const RABBIT_FLEE_SPEED = 6.8;
const SQUIRREL_FLEE_SPEED = 7.4;
const RABBIT_HOP_RATE = 14.0;
const SQUIRREL_HOP_RATE = 18.0;
const RABBIT_HOP_HEIGHT = 0.28;
const SQUIRREL_HOP_HEIGHT = 0.16;
// #endregion

// ======================== FACTORY INITIALIZERS ======================== \\
// #region Factory Initializers
/**
 * Summary: Initializes and distributes boid bird flocks across all defined patrol centers.
 */
export function createInitialBoidBirds(): BoidBirdState[] {
  const birds: BoidBirdState[] = [];

  for (let f = 0; f < BIRD_FLOCK_CONFIGS.length; f++) {
    const cfg = BIRD_FLOCK_CONFIGS[f];
    const groundY = heightAt(cfg.homeX, cfg.homeZ);

    for (let i = 0; i < BIRDS_PER_FLOCK; i++) {
      const angle = (i / BIRDS_PER_FLOCK) * Math.PI * 2 + f * 0.8;
      const dist = 3.5 + (i % 3) * 2.4;
      const bx = cfg.homeX + Math.cos(angle) * dist;
      const bz = cfg.homeZ + Math.sin(angle) * dist;
      const by = groundY + cfg.cruiseAltitudeAboveGround + (i % 3) * 0.9;
      const speed = 7.2 + (i % 3) * 0.6;
      const heading = angle + Math.PI * 0.5;
      const vx = Math.cos(heading) * speed;
      const vz = Math.sin(heading) * speed;

      birds.push({
        id: `boid-bird-${f}-${i}`,
        flockId: f,
        x: bx,
        y: by,
        z: bz,
        vx,
        vy: 0,
        vz,
        yaw: Math.atan2(vx, vz),
        pitch: 0,
        bankRoll: 0,
        wingPhase: (i * 0.9 + f * 1.3) % (Math.PI * 2),
        fleeTimer: 0,
        scale: 0.88 + (i % 3) * 0.1,
      });
    }
  }

  return birds;
}

/**
 * Summary: Initializes small reactive forest critters (woodland rabbits and red squirrels).
 */
export function createInitialSmallAnimals(): SmallAnimalState[] {
  const spots: readonly { species: 'rabbit' | 'squirrel'; x: number; z: number; yaw: number }[] = [
    // Near Spawn & Forest Trail so the player immediately encounters them while exploring
    { species: 'rabbit', x: 11.5, z: 58.0, yaw: 0.4 },
    { species: 'rabbit', x: 13.2, z: 56.5, yaw: 1.8 },
    { species: 'squirrel', x: -8.5, z: 62.0, yaw: -0.9 },
    { species: 'rabbit', x: 22.0, z: 42.0, yaw: 2.3 },
    { species: 'squirrel', x: -16.0, z: 46.0, yaw: 0.7 },
    { species: 'rabbit', x: 6.5, z: 28.0, yaw: -1.4 },
    { species: 'squirrel', x: -24.0, z: 22.0, yaw: 1.1 },
    { species: 'rabbit', x: 34.0, z: 18.0, yaw: -0.5 },
    { species: 'squirrel', x: 18.0, z: -8.0, yaw: 2.6 },
    { species: 'rabbit', x: -14.0, z: -12.0, yaw: 0.2 },
    { species: 'squirrel', x: 46.0, z: 68.0, yaw: -2.1 },
    { species: 'rabbit', x: -32.0, z: 74.0, yaw: 1.5 },
    { species: 'rabbit', x: 68.0, z: 110.0, yaw: -0.8 },
    { species: 'squirrel', x: 92.0, z: 145.0, yaw: 0.9 },
    { species: 'rabbit', x: 135.0, z: 185.0, yaw: -1.7 },
    { species: 'squirrel', x: 168.0, z: 212.0, yaw: 0.5 },
    { species: 'rabbit', x: -45.0, z: -38.0, yaw: 2.0 },
    { species: 'squirrel', x: 28.0, z: -52.0, yaw: -1.2 },
  ];

  return spots.map((s, idx) => {
    const groundY = walkableHeightAt(s.x, s.z).height;
    return {
      id: `forest-critter-${idx}`,
      species: s.species,
      homeX: s.x,
      homeZ: s.z,
      x: s.x,
      y: groundY,
      z: s.z,
      vx: 0,
      vz: 0,
      yaw: s.yaw,
      hopPhase: (idx * 1.17) % (Math.PI * 2),
      hopHeight: 0,
      alertLevel: 'foraging',
      fleeCooldown: 0,
      earPerk: 0.2,
    };
  });
}
// #endregion

// ======================== SIMULATION STEP ======================== \\
// #region Simulation Step
/**
 * Summary: Steps the Boids Flocking Algorithm for all birds and updates proximity-reactive forest animals.
 * Note: [HOT-PATH EXCEPTION] 60FPS simulation loop updating bird boid velocities and animal hops in place.
 */
export function stepBoidsAndWildlife(
  birds: BoidBirdState[],
  animals: SmallAnimalState[],
  playerX: number,
  playerY: number,
  playerZ: number,
  playerSpeed: number,
  rawDt: number
): BoidsAndWildlifeStepResult {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
  let startledFlockCount = 0;
  let scamperedCritterCount = 0;
  let nearestBirdDist = Infinity;
  let nearestCritterDist = Infinity;

  const playerThreatRadius = BOID_PLAYER_BASE_THREAT_RADIUS + Math.min(12.0, playerSpeed * 1.1);

  // 1. Step Reynolds Boids Birds
  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const cfg = BIRD_FLOCK_CONFIGS[b.flockId] ?? BIRD_FLOCK_CONFIGS[0];

    let sepX = 0;
    let sepY = 0;
    let sepZ = 0;
    let alignX = 0;
    let alignY = 0;
    let alignZ = 0;
    let cohX = 0;
    let cohY = 0;
    let cohZ = 0;
    let neighborCount = 0;

    for (let j = 0; j < birds.length; j++) {
      if (i === j) continue;
      const other = birds[j];
      if (other.flockId !== b.flockId) continue;

      const dx = b.x - other.x;
      const dy = b.y - other.y;
      const dz = b.z - other.z;
      const dist = Math.hypot(dx, dy, dz);

      if (dist > 0.001 && dist < BOID_NEIGHBOR_RADIUS) {
        neighborCount++;
        alignX += other.vx;
        alignY += other.vy;
        alignZ += other.vz;
        cohX += other.x;
        cohY += other.y;
        cohZ += other.z;

        if (dist < BOID_SEPARATION_RADIUS) {
          const inv = (BOID_SEPARATION_RADIUS - dist) / (dist * BOID_SEPARATION_RADIUS);
          sepX += dx * inv;
          sepY += dy * inv;
          sepZ += dz * inv;
        }
      }
    }

    let ax = sepX * BOID_SEPARATION_WEIGHT;
    let ay = sepY * BOID_SEPARATION_WEIGHT;
    let az = sepZ * BOID_SEPARATION_WEIGHT;

    if (neighborCount > 0) {
      alignX /= neighborCount;
      alignY /= neighborCount;
      alignZ /= neighborCount;
      ax += (alignX - b.vx) * BOID_ALIGNMENT_WEIGHT * 0.35;
      ay += (alignY - b.vy) * BOID_ALIGNMENT_WEIGHT * 0.35;
      az += (alignZ - b.vz) * BOID_ALIGNMENT_WEIGHT * 0.35;

      cohX = cohX / neighborCount - b.x;
      cohY = cohY / neighborCount - b.y;
      cohZ = cohZ / neighborCount - b.z;
      ax += cohX * BOID_COHESION_WEIGHT * 0.28;
      ay += cohY * BOID_COHESION_WEIGHT * 0.28;
      az += cohZ * BOID_COHESION_WEIGHT * 0.28;
    }

    // Gentle attraction to flock patrol zone + tangential cruise
    const toHomeX = cfg.homeX - b.x;
    const toHomeZ = cfg.homeZ - b.z;
    const distFromHome = Math.hypot(toHomeX, toHomeZ);
    if (distFromHome > cfg.patrolRadius) {
      const pull = (distFromHome - cfg.patrolRadius) * 0.14 * BOID_HOME_WEIGHT;
      ax += (toHomeX / distFromHome) * pull;
      az += (toHomeZ / distFromHome) * pull;
    } else if (distFromHome > 1.0) {
      // Gentle swirling air current around home
      const tangX = -toHomeZ / distFromHome;
      const tangZ = toHomeX / distFromHome;
      ax += tangX * 1.4;
      az += tangZ * 1.4;
    }

    // Player Proximity Threat Detection & Organized Scatter
    const dxPlayer = b.x - playerX;
    const dyPlayer = b.y - (playerY + 1.5);
    const dzPlayer = b.z - playerZ;
    const distToPlayer3D = Math.hypot(dxPlayer, dyPlayer, dzPlayer);
    const distToPlayerHoriz = Math.hypot(dxPlayer, dzPlayer);
    if (distToPlayer3D < nearestBirdDist) {
      nearestBirdDist = distToPlayer3D;
    }

    const wasFleeing = b.fleeTimer > 0;
    if (distToPlayerHoriz < playerThreatRadius && Math.abs(dyPlayer) < 24.0) {
      if (!wasFleeing) {
        startledFlockCount++;
      }
      b.fleeTimer = Math.max(b.fleeTimer, 3.2);
      const urgency = 1.0 - Math.min(1.0, distToPlayerHoriz / playerThreatRadius);
      const safeHoriz = Math.max(0.5, distToPlayerHoriz);
      const evadeStrength = 18.0 + urgency * 22.0;
      ax += (dxPlayer / safeHoriz) * evadeStrength;
      az += (dzPlayer / safeHoriz) * evadeStrength;
      ay += (5.5 + urgency * 8.0); // Climb upward when startled
    } else if (b.fleeTimer > 0) {
      b.fleeTimer = Math.max(0, b.fleeTimer - dt);
    }

    // Altitude regulation above terrain
    const groundY = heightAt(b.x, b.z);
    const targetAlt = groundY + cfg.cruiseAltitudeAboveGround + (b.fleeTimer > 0 ? 5.5 : 0);
    ay += (targetAlt - b.y) * 1.65;
    if (b.y < groundY + 5.0) {
      ay += (groundY + 5.0 - b.y) * 8.0;
    }

    const prevYaw = b.yaw;
    b.vx += ax * dt;
    b.vy += ay * dt;
    b.vz += az * dt;

    // Clamp airspeed between min cruise and startled sprint speed
    const minSpeed = b.fleeTimer > 0 ? 10.5 : 6.2;
    const maxSpeed = b.fleeTimer > 0 ? 16.5 : 9.4;
    const speed = Math.hypot(b.vx, b.vy, b.vz);
    if (speed > maxSpeed) {
      const s = maxSpeed / speed;
      b.vx *= s;
      b.vy *= s;
      b.vz *= s;
    } else if (speed < minSpeed && speed > 0.001) {
      const s = minSpeed / speed;
      b.vx *= s;
      b.vy *= s;
      b.vz *= s;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;

    const horizSpeed = Math.hypot(b.vx, b.vz);
    if (horizSpeed > 0.1) {
      b.yaw = Math.atan2(b.vx, b.vz);
    }
    b.pitch = Math.max(-0.55, Math.min(0.55, -Math.atan2(b.vy, Math.max(0.5, horizSpeed))));

    const yawDelta = Math.atan2(Math.sin(b.yaw - prevYaw), Math.cos(b.yaw - prevYaw));
    const targetBank = Math.max(-0.68, Math.min(0.68, -yawDelta / Math.max(0.005, dt) * 0.22));
    b.bankRoll += (targetBank - b.bankRoll) * (1 - Math.exp(-8 * dt));

    const flapFreq = b.fleeTimer > 0 ? 18.5 : b.vy > 0.4 ? 13.5 : 8.5;
    b.wingPhase = (b.wingPhase + dt * flapFreq) % (Math.PI * 2);
  }

  // 2. Step Small Forest Animals (Rabbits & Squirrels)
  const fleeRadius = CRITTER_BASE_FLEE_RADIUS + Math.min(5.0, playerSpeed * 0.65);

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const dx = a.x - playerX;
    const dz = a.z - playerZ;
    const dist = Math.hypot(dx, dz);
    if (dist < nearestCritterDist) {
      nearestCritterDist = dist;
    }

    if (dist < fleeRadius) {
      if (a.alertLevel !== 'fleeing' && a.fleeCooldown <= 0.1) {
        scamperedCritterCount++;
      }
      a.alertLevel = 'fleeing';
      a.fleeCooldown = 2.4;
      a.earPerk = 1.0;

      const safeDist = Math.max(0.25, dist);
      const fleeSpeed = a.species === 'rabbit' ? RABBIT_FLEE_SPEED : SQUIRREL_FLEE_SPEED;
      const targetYaw = Math.atan2(dx / safeDist, dz / safeDist);
      a.yaw = targetYaw;
      a.vx = (dx / safeDist) * fleeSpeed;
      a.vz = (dz / safeDist) * fleeSpeed;
    } else if (a.fleeCooldown > 0) {
      a.fleeCooldown = Math.max(0, a.fleeCooldown - dt);
      a.alertLevel = 'fleeing';
      a.vx *= Math.exp(-2.2 * dt);
      a.vz *= Math.exp(-2.2 * dt);
    } else if (dist < CRITTER_ALERT_RADIUS) {
      a.alertLevel = 'alert';
      a.earPerk += (0.95 - a.earPerk) * (1 - Math.exp(-8 * dt));
      a.vx *= Math.exp(-6 * dt);
      a.vz *= Math.exp(-6 * dt);
      // Look toward player alertly
      a.yaw = Math.atan2(-dx, -dz);
    } else {
      a.alertLevel = 'foraging';
      a.earPerk += (0.25 - a.earPerk) * (1 - Math.exp(-4 * dt));
      // Gentle wander around home
      const toHomeX = a.homeX - a.x;
      const toHomeZ = a.homeZ - a.z;
      const homeDist = Math.hypot(toHomeX, toHomeZ);
      if (homeDist > 9.0) {
        a.yaw = Math.atan2(toHomeX, toHomeZ);
        a.vx = (toHomeX / homeDist) * 1.35;
        a.vz = (toHomeZ / homeDist) * 1.35;
      } else {
        a.vx *= Math.exp(-5 * dt);
        a.vz *= Math.exp(-5 * dt);
      }
    }

    const moveSpeed = Math.hypot(a.vx, a.vz);
    if (moveSpeed > 0.08) {
      a.x += a.vx * dt;
      a.z += a.vz * dt;
      const hopRate = a.species === 'rabbit' ? RABBIT_HOP_RATE : SQUIRREL_HOP_RATE;
      a.hopPhase = (a.hopPhase + dt * hopRate) % (Math.PI * 2);
      a.hopHeight = Math.max(0, Math.sin(a.hopPhase)) * (a.species === 'rabbit' ? RABBIT_HOP_HEIGHT : SQUIRREL_HOP_HEIGHT);
    } else {
      a.hopPhase = (a.hopPhase + dt * 2.5) % (Math.PI * 2);
      a.hopHeight *= Math.exp(-10 * dt);
    }

    const groundY = walkableHeightAt(a.x, a.z, a.y).height;
    a.y = groundY + a.hopHeight;
  }

  return {
    startledFlockCount,
    scamperedCritterCount,
    nearestBirdDist,
    nearestCritterDist,
  };
}
// #endregion
