// ============================================================================
// MODULE: World / Domain / Monk Navigation
// DESIGN: Pure decoupled steering, predictive monk-vs-monk sidestepping, and
//         stuck-progress dynamic detour re-routing (SRP).
// SUMMARY: Prevents monks from deadlocking head-on in narrow passages, stairs,
//          or trails, and dynamically chooses an alternate clear path whenever
//          progress stalls against other monks, walls, or furniture.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { findWallDetourWaypoint, steerAroundWalls } from './wallNavigation';
import { isSegmentBlockedBySolidBox } from './collisionWorld';
// #endregion

// ======================== CONSTANTS & CONTRACTS ======================== \\
// #region Constants & Contracts
export const MONK_NAV_BODY_RADIUS = 0.58;
export const MONK_STUCK_TIME_THRESHOLD = 0.65;
export const MONK_MIN_PROGRESS_METRES = 0.16;
export const MONK_DETOUR_DURATION_SEC = 1.65;
export const MONK_LOOKAHEAD_DIST = 3.6;
export const MONK_CORRIDOR_HALF_WIDTH = 1.12;

export interface IMonkNavPeer {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly vx: number;
  readonly vz: number;
  readonly moving: boolean;
}

export interface IMonkNavMemory {
  progressX: number;
  progressZ: number;
  stuckTimer: number;
  detourX?: number;
  detourZ?: number;
  detourTimer: number;
  lastTargetKey: string;
  consecutiveStucks: number;
}

export interface IMonkSteerParams {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly targetX: number;
  readonly targetZ: number;
  readonly targetKey: string;
  readonly speed: number;
  readonly dt: number;
  readonly peers: readonly IMonkNavPeer[];
  readonly isSafe: (candX: number, candZ: number, curY: number) => boolean;
  readonly memory: IMonkNavMemory;
  readonly bodyRadius?: number;
  readonly allowSkipIfBlocked?: boolean;
}

export interface IMonkSteerResult {
  readonly nextX: number;
  readonly nextZ: number;
  readonly aimDx: number;
  readonly aimDz: number;
  readonly usedDetour: boolean;
  readonly recommendSkipWaypoint: boolean;
}

export function createMonkNavMemory(x = 0, z = 0): IMonkNavMemory {
  return {
    progressX: x,
    progressZ: z,
    stuckTimer: 0,
    detourTimer: 0,
    lastTargetKey: '',
    consecutiveStucks: 0,
  };
}
// #endregion

// ======================== STEERING & DYNAMIC REROUTING ======================== \\
// #region Steering & Dynamic Rerouting
const DETOUR_PROBE_ANGLES_RAD: readonly number[] = [
  1.57, -1.57, 1.15, -1.15, 1.95, -1.95, 0.72, -0.72, 2.38, -2.38, Math.PI,
];

function isSegmentClearForMonk(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y: number,
  isSafe: (cx: number, cz: number, curY: number) => boolean
): boolean {
  if (isSegmentBlockedBySolidBox(x0, z0, x1, z1, y + 0.8)) return false;
  const dist = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(2, Math.min(8, Math.ceil(dist / 0.5)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isSafe(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, y)) {
      return false;
    }
  }
  return true;
}

function isPointClearOfPeers(
  cx: number,
  cz: number,
  curY: number,
  peers: readonly IMonkNavPeer[],
  minClearance = 0.98
): boolean {
  for (let i = 0; i < peers.length; i++) {
    const p = peers[i];
    if (Math.abs(p.y - curY) > 1.8) continue;
    if (Math.hypot(p.x - cx, p.z - cz) < minClearance) {
      return false;
    }
  }
  return true;
}

function selectDynamicDetour(
  x: number,
  y: number,
  z: number,
  targetX: number,
  targetZ: number,
  peers: readonly IMonkNavPeer[],
  isSafe: (cx: number, cz: number, curY: number) => boolean,
  bodyRadius: number,
  attemptIdx: number
): { x: number; z: number } | null {
  const dx = targetX - x;
  const dz = targetZ - z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.25) return null;

  // 1) Try A* wall grid detour first when solid building walls obstruct the line of sight
  if (dist > 2.0 && isSegmentBlockedBySolidBox(x, z, targetX, targetZ, y + 0.8)) {
    const astar = findWallDetourWaypoint(x, z, targetX, targetZ, y + 0.8, 3, undefined, bodyRadius);
    if (
      astar &&
      Math.hypot(astar.x - x, astar.z - z) > 0.75 &&
      isSegmentClearForMonk(x, z, astar.x, astar.z, y, isSafe) &&
      isPointClearOfPeers(astar.x, astar.z, y, peers, 0.92)
    ) {
      return { x: astar.x, z: astar.z };
    }
  }

  // 2) Probe lateral arc angles using right-hand bias (flipping priority on repeat attempts)
  const baseAng = Math.atan2(dx, dz);
  const radii = [2.6, 3.6, 1.65];
  const flipOrder = attemptIdx % 2 === 1;

  for (let rIdx = 0; rIdx < radii.length; rIdx++) {
    const probeDist = radii[rIdx];
    for (let aIdx = 0; aIdx < DETOUR_PROBE_ANGLES_RAD.length; aIdx++) {
      const signedOff = flipOrder
        ? -DETOUR_PROBE_ANGLES_RAD[aIdx]
        : DETOUR_PROBE_ANGLES_RAD[aIdx];
      const ang = baseAng + signedOff;
      const cx = x + Math.sin(ang) * probeDist;
      const cz = z + Math.cos(ang) * probeDist;
      if (!isSegmentClearForMonk(x, z, cx, cz, y, isSafe)) continue;
      if (!isPointClearOfPeers(cx, cz, y, peers, 0.95)) continue;
      return { x: cx, z: cz };
    }
  }

  return null;
}

/**
 * Summary: Computes one movement step toward (targetX, targetZ) with predictive
 *          monk-to-monk right-hand passing, wall avoidance, and stuck progress
 *          detour recalculation.
 */
export function stepMonkWalkWithRerouting(params: IMonkSteerParams): IMonkSteerResult {
  const {
    x,
    y,
    z,
    targetX,
    targetZ,
    targetKey,
    speed,
    dt,
    peers,
    isSafe,
    memory,
    bodyRadius = MONK_NAV_BODY_RADIUS,
    allowSkipIfBlocked = false,
  } = params;

  if (memory.lastTargetKey !== targetKey) {
    memory.lastTargetKey = targetKey;
    memory.progressX = x;
    memory.progressZ = z;
    memory.stuckTimer = 0;
    memory.detourTimer = 0;
    memory.detourX = undefined;
    memory.detourZ = undefined;
    memory.consecutiveStucks = 0;
  }

  // Monitor actual progress since last check anchor; trigger detour when stalled
  const movedFromAnchor = Math.hypot(x - memory.progressX, z - memory.progressZ);
  let recommendSkipWaypoint = false;
  if (movedFromAnchor >= MONK_MIN_PROGRESS_METRES) {
    memory.progressX = x;
    memory.progressZ = z;
    memory.stuckTimer = 0;
    memory.consecutiveStucks = 0;
  } else {
    memory.stuckTimer += dt;
    if (memory.stuckTimer >= MONK_STUCK_TIME_THRESHOLD) {
      memory.stuckTimer = 0;
      memory.consecutiveStucks += 1;
      const detour = selectDynamicDetour(
        x,
        y,
        z,
        targetX,
        targetZ,
        peers,
        isSafe,
        bodyRadius,
        memory.consecutiveStucks - 1
      );
      if (detour) {
        memory.detourX = detour.x;
        memory.detourZ = detour.z;
        memory.detourTimer = MONK_DETOUR_DURATION_SEC;
      }
      if (allowSkipIfBlocked && memory.consecutiveStucks >= 2) {
        recommendSkipWaypoint = true;
      }
    }
  }

  let steerX = targetX;
  let steerZ = targetZ;
  let usedDetour = false;

  if (
    memory.detourTimer > 0 &&
    memory.detourX !== undefined &&
    memory.detourZ !== undefined
  ) {
    memory.detourTimer = Math.max(0, memory.detourTimer - dt);
    const distToDetour = Math.hypot(memory.detourX - x, memory.detourZ - z);
    if (distToDetour <= 0.45 || memory.detourTimer <= 0) {
      memory.detourTimer = 0;
      memory.detourX = undefined;
      memory.detourZ = undefined;
    } else {
      steerX = memory.detourX;
      steerZ = memory.detourZ;
      usedDetour = true;
    }
  }

  if (!usedDetour) {
    const directDist = Math.hypot(targetX - x, targetZ - z);
    if (directDist > 1.25 && isSegmentBlockedBySolidBox(x, z, targetX, targetZ, y + 0.8)) {
      const wallDetour = steerAroundWalls(x, z, targetX, targetZ, y + 0.8, bodyRadius);
      if (wallDetour && Math.hypot(wallDetour.x - x, wallDetour.z - z) > 0.35) {
        steerX = wallDetour.x;
        steerZ = wallDetour.z;
      }
    }
  }

  const rawDx = steerX - x;
  const rawDz = steerZ - z;
  const rawDist = Math.hypot(rawDx, rawDz);
  if (rawDist <= 0.001) {
    return {
      nextX: x,
      nextZ: z,
      aimDx: targetX - x,
      aimDz: targetZ - z,
      usedDetour,
      recommendSkipWaypoint,
    };
  }

  const dirX = rawDx / rawDist;
  const dirZ = rawDz / rawDist;
  // Right-hand perpendicular vector in Three.js XZ (forward +Z -> right is -X = (-dirZ, dirX))
  const rightX = -dirZ;
  const rightZ = dirX;

  // Predictive peer collision avoidance: detect stationary or oncoming monks ahead in our lane
  let lateralPush = 0;
  let nearestForward = MONK_LOOKAHEAD_DIST + 1.0;
  for (let i = 0; i < peers.length; i++) {
    const p = peers[i];
    if (Math.abs(p.y - y) > 1.8) continue;
    const relX = p.x - x;
    const relZ = p.z - z;
    const dPeer = Math.hypot(relX, relZ);
    if (dPeer < 0.05 || dPeer > MONK_LOOKAHEAD_DIST) continue;

    const fwd = relX * dirX + relZ * dirZ;
    if (fwd < 0.05 || fwd > MONK_LOOKAHEAD_DIST) continue;

    const lat = relX * rightX + relZ * rightZ;
    if (Math.abs(lat) > MONK_CORRIDOR_HALF_WIDTH) continue;

    if (fwd < nearestForward) {
      nearestForward = fwd;
      const peerSpeed = Math.hypot(p.vx, p.vz);
      const oncoming = p.moving && peerSpeed > 0.1 && (p.vx * dirX + p.vz * dirZ) < 0.25 * peerSpeed;
      const urgency = 1.0 - fwd / MONK_LOOKAHEAD_DIST;
      // Two oncoming walkers always apply consistent right-hand bias (+1) so they pass opposite sides;
      // stationary obstacle picks the clearer side.
      let sideSign = 1;
      if (!oncoming && Math.abs(lat) > 0.08) {
        sideSign = lat > 0 ? -1 : 1;
      }
      lateralPush = sideSign * (0.55 + urgency * 0.95);
    }
  }

  let moveDirX = dirX;
  let moveDirZ = dirZ;
  if (Math.abs(lateralPush) > 0.01) {
    const blendX = dirX + rightX * lateralPush;
    const blendZ = dirZ + rightZ * lateralPush;
    const bLen = Math.hypot(blendX, blendZ) || 1;
    const probeX = x + (blendX / bLen) * Math.min(1.1, speed * dt + 0.55);
    const probeZ = z + (blendZ / bLen) * Math.min(1.1, speed * dt + 0.55);
    if (isSafe(probeX, probeZ, y) && !isSegmentBlockedBySolidBox(x, z, probeX, probeZ, y + 0.8)) {
      moveDirX = blendX / bLen;
      moveDirZ = blendZ / bLen;
    } else {
      // Try opposite lateral side if preferred side hits a wall or cliff ledge
      const flipX = dirX - rightX * lateralPush;
      const flipZ = dirZ - rightZ * lateralPush;
      const fLen = Math.hypot(flipX, flipZ) || 1;
      const flipProbeX = x + (flipX / fLen) * Math.min(1.1, speed * dt + 0.55);
      const flipProbeZ = z + (flipZ / fLen) * Math.min(1.1, speed * dt + 0.55);
      if (isSafe(flipProbeX, flipProbeZ, y) && !isSegmentBlockedBySolidBox(x, z, flipProbeX, flipProbeZ, y + 0.8)) {
        moveDirX = flipX / fLen;
        moveDirZ = flipZ / fLen;
      }
    }
  }

  const step = Math.min(rawDist, speed * dt);
  const candX = x + moveDirX * step;
  const candZ = z + moveDirZ * step;

  // Verify step does not walk straight into a solid box or off an elevated ledge
  if (isSafe(candX, candZ, y) && !isSegmentBlockedBySolidBox(x, z, candX, candZ, y + 0.8)) {
    return {
      nextX: candX,
      nextZ: candZ,
      aimDx: moveDirX,
      aimDz: moveDirZ,
      usedDetour,
      recommendSkipWaypoint,
    };
  }

  // Fallback component-wise slide when full vector touches a wall or edge (skip zero-displacement no-ops)
  if (
    Math.abs(candX - x) > 1e-4 &&
    isSafe(candX, z, y) &&
    !isSegmentBlockedBySolidBox(x, z, candX, z, y + 0.8)
  ) {
    return {
      nextX: candX,
      nextZ: z,
      aimDx: moveDirX,
      aimDz: 0,
      usedDetour,
      recommendSkipWaypoint,
    };
  }
  if (
    Math.abs(candZ - z) > 1e-4 &&
    isSafe(x, candZ, y) &&
    !isSegmentBlockedBySolidBox(x, z, x, candZ, y + 0.8)
  ) {
    return {
      nextX: x,
      nextZ: candZ,
      aimDx: 0,
      aimDz: moveDirZ,
      usedDetour,
      recommendSkipWaypoint,
    };
  }

  // Completely pinned on direct vector: immediately try lateral detour nudge if none active
  const emergency = selectDynamicDetour(x, y, z, targetX, targetZ, peers, isSafe, bodyRadius, memory.consecutiveStucks);
  if (emergency) {
    memory.detourX = emergency.x;
    memory.detourZ = emergency.z;
    memory.detourTimer = MONK_DETOUR_DURATION_SEC;
    const edx = emergency.x - x;
    const edz = emergency.z - z;
    const eLen = Math.hypot(edx, edz) || 1;
    const eStep = Math.min(eLen, speed * dt);
    return {
      nextX: x + (edx / eLen) * eStep,
      nextZ: z + (edz / eLen) * eStep,
      aimDx: edx / eLen,
      aimDz: edz / eLen,
      usedDetour: true,
      recommendSkipWaypoint,
    };
  }

  return {
    nextX: x,
    nextZ: z,
    aimDx: dirX,
    aimDz: dirZ,
    usedDetour,
    recommendSkipWaypoint,
  };
}
// #endregion
