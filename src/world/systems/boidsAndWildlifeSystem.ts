import { groundHeightAt as heightAt, walkableHeightAt } from './terrainAndBiomeSystem';

/**
 * Boids Flocking & Proximity-Reactive Forest Wildlife System (`boidsAndWildlifeSystem.ts`)
 *
 * Implements:
 * 1. Reynolds Boids Algorithm for Bird Flocks:
 *    - Separation: steer to avoid crowding local flockmates
 *    - Alignment: steer towards the average heading of local flockmates
 *    - Cohesion: steer to move toward the average position (center of mass) of local flockmates
 *    - Home Orbit & Altitude Bounds: gentle attraction to patrol zones and safe flight altitudes above terrain
 *    - Player Proximity Evade/Scatter: when the player (or horse) approaches within `fleeRadius` (28m),
 *      birds startle, climb rapidly, and scatter away in organized flock waves, returning audio trigger events.
 * 2. Proximity-Reactive Small Forest Animals (Woodland Rabbits & Red Bush Squirrels):
 *    - Idle/foraging behavior when player is distant (`> 18m`)
 *    - Alert ear-perk & head-turn toward player at medium proximity (`11m - 18m`)
 *    - Rapid darting/hopping escape away from player at close proximity (`< 11m`), with audio trigger events.
 */

export interface BoidBirdState {
  id: string;
  flockId: number;
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
  scale: number;
}

export interface BirdFlockConfig {
  flockId: number;
  homeX: number;
  homeZ: number;
  cruiseAltitudeAboveGround: number;
  patrolRadius: number;
}

export interface SmallAnimalState {
  id: string;
  species: 'rabbit' | 'squirrel';
  homeX: number;
  homeZ: number;
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
  startledFlockCount: number;
  scamperedCritterCount: number;
  nearestBirdDist: number;
  nearestCritterDist: number;
}

export const BIRD_FLOCK_CONFIGS: readonly BirdFlockConfig[] = [
  { flockId: 0, homeX: 12.0, homeZ: 34.0, cruiseAltitudeAboveGround: 13.5, patrolRadius: 42.0 },
  { flockId: 1, homeX: -38.0, homeZ: 56.0, cruiseAltitudeAboveGround: 15.0, patrolRadius: 48.0 },
  { flockId: 2, homeX: 55.0, homeZ: -25.0, cruiseAltitudeAboveGround: 16.5, patrolRadius: 52.0 },
  { flockId: 3, homeX: 185.0, homeZ: 215.0, cruiseAltitudeAboveGround: 14.5, patrolRadius: 46.0 },
] as const;

export function createInitialBoidBirds(): BoidBirdState[] {
  const birds: BoidBirdState[] = [];
  const birdsPerFlock = 9;

  for (let f = 0; f < BIRD_FLOCK_CONFIGS.length; f++) {
    const cfg = BIRD_FLOCK_CONFIGS[f];
    const groundY = heightAt(cfg.homeX, cfg.homeZ);
    for (let i = 0; i < birdsPerFlock; i++) {
      const angle = (i / birdsPerFlock) * Math.PI * 2 + f * 0.8;
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

export function createInitialSmallAnimals(): SmallAnimalState[] {
  const spots: ReadonlyArray<{ species: 'rabbit' | 'squirrel'; x: number; z: number; yaw: number }> = [
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

/**
 * Steps the Boids Flocking Algorithm for all birds and updates proximity-reactive forest animals.
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

  // Boids Tuning Parameters
  const neighborRadius = 15.5;
  const separationRadius = 3.8;
  const separationWeight = 2.65;
  const alignmentWeight = 1.35;
  const cohesionWeight = 1.15;
  const homeWeight = 0.55;
  const playerThreatRadius = 29.0 + Math.min(12.0, playerSpeed * 1.1);

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

      if (dist > 0.001 && dist < neighborRadius) {
        neighborCount++;
        alignX += other.vx;
        alignY += other.vy;
        alignZ += other.vz;
        cohX += other.x;
        cohY += other.y;
        cohZ += other.z;

        if (dist < separationRadius) {
          const inv = (separationRadius - dist) / (dist * separationRadius);
          sepX += dx * inv;
          sepY += dy * inv;
          sepZ += dz * inv;
        }
      }
    }

    let ax = sepX * separationWeight;
    let ay = sepY * separationWeight;
    let az = sepZ * separationWeight;

    if (neighborCount > 0) {
      alignX /= neighborCount;
      alignY /= neighborCount;
      alignZ /= neighborCount;
      ax += (alignX - b.vx) * alignmentWeight * 0.35;
      ay += (alignY - b.vy) * alignmentWeight * 0.35;
      az += (alignZ - b.vz) * alignmentWeight * 0.35;

      cohX = cohX / neighborCount - b.x;
      cohY = cohY / neighborCount - b.y;
      cohZ = cohZ / neighborCount - b.z;
      ax += cohX * cohesionWeight * 0.28;
      ay += cohY * cohesionWeight * 0.28;
      az += cohZ * cohesionWeight * 0.28;
    }

    // Gentle attraction to flock patrol zone + tangential cruise
    const toHomeX = cfg.homeX - b.x;
    const toHomeZ = cfg.homeZ - b.z;
    const distFromHome = Math.hypot(toHomeX, toHomeZ);
    if (distFromHome > cfg.patrolRadius) {
      const pull = (distFromHome - cfg.patrolRadius) * 0.14 * homeWeight;
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

  // Step Small Forest Animals (Rabbits & Squirrels)
  const alertRadius = 18.0;
  const fleeRadius = 11.5 + Math.min(5.0, playerSpeed * 0.65);

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
      const fleeSpeed = a.species === 'rabbit' ? 6.8 : 7.4;
      const targetYaw = Math.atan2(dx / safeDist, dz / safeDist);
      a.yaw = targetYaw;
      a.vx = (dx / safeDist) * fleeSpeed;
      a.vz = (dz / safeDist) * fleeSpeed;
    } else if (a.fleeCooldown > 0) {
      a.fleeCooldown = Math.max(0, a.fleeCooldown - dt);
      a.alertLevel = 'fleeing';
      a.vx *= Math.exp(-2.2 * dt);
      a.vz *= Math.exp(-2.2 * dt);
    } else if (dist < alertRadius) {
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
      const hopRate = a.species === 'rabbit' ? 14.0 : 18.0;
      a.hopPhase = (a.hopPhase + dt * hopRate) % (Math.PI * 2);
      a.hopHeight = Math.max(0, Math.sin(a.hopPhase)) * (a.species === 'rabbit' ? 0.28 : 0.16);
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
