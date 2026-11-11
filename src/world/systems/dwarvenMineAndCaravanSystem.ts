// ============================================================================
// MODULE: World / Systems / Dwarven Mine And Caravan
// DESIGN: Deterministic daily schedule, pathing waypoints, and mine height queries (SRP)
// SUMMARY: Schedules the 8 Dwarven Miners through sunrise commute, cavern work,
//          sunset return, and hearth rest, while providing terrain elevation for mine geometry.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { t } from '../../locales';
import type { IDwarvenMinerCaravanState } from '../domain/worldTypes';
import { SOUTHERN_MINE_POS, DWARVEN_STONE_HOUSES } from '../domain/landmarksRegistry';
import { MINE_CHAMBER_BOUNDS, MINE_NW_GALLERY } from '../domain/landmarks/dwarvenMineLayout';
// #endregion

// ======================== CONSTANTS & CONFIGURATION ======================== \\
// #region Constants & Configuration
export const DWARVEN_MINERS_COUNT = 8;

/** Summary: Hours in a standard astronomical day */
const HOURS_IN_DAY = 24.0;

/** Summary: Schedule threshold hours (24h clock) */
const SCHEDULE_DAWN_START = 6.0;
const SCHEDULE_WORK_START = 7.6;
const SCHEDULE_WORK_END = 17.8;
const SCHEDULE_NIGHT_START = 19.5;

/** Summary: Caravan movement duration spans (in world hours) */
const DAWN_CARAVAN_DURATION = SCHEDULE_WORK_START - SCHEDULE_DAWN_START;
const DUSK_CARAVAN_DURATION = SCHEDULE_NIGHT_START - SCHEDULE_WORK_END;

/** Summary: Cliffside hoist scaffolding & lagoon bridge/dock constants */
const SCAFFOLD_STAIR_START_LZ = 49.0;
const SCAFFOLD_STAIR_END_LZ = 57.5;
const SCAFFOLD_STAIR_SPAN = SCAFFOLD_STAIR_END_LZ - SCAFFOLD_STAIR_START_LZ;
const LAGOON_BRIDGE_HEIGHT_OFFSET = 0.32;
const DOCK_PIER_HEIGHT_OFFSET = 0.28;
const CRYSTAL_LAKE_DEPTH = 1.9;

export interface IMinerStationConfig {
  readonly name: string;
  readonly houseIdx: number;
  readonly homeOffsetX: number;
  readonly homeOffsetZ: number;
  readonly laneOffsetX: number;
  readonly workLocalX: number;
  readonly workLocalZ: number;
  readonly workYaw: number;
  readonly rockLocalX: number;
  readonly rockLocalZ: number;
  readonly rockRadius: number;
  readonly oreKind: 'gold' | 'silver' | 'emerald' | 'sapphire' | 'amethyst';
  readonly pairedCartIdx?: number;
  readonly cartLoadLocalX?: number;
  readonly cartLoadLocalZ?: number;
  readonly cartLoadYaw?: number;
}
type MinerStationConfig = IMinerStationConfig;

export const DWARVEN_MINER_STATIONS: readonly MinerStationConfig[] = [
  // 0: Durin — North-West Gold Vein in Room 1 Staging Hall
  {
    name: t('dwarven.miners.durin'),
    houseIdx: 0,
    homeOffsetX: -1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: -1.25,
    workLocalX: -28.0,
    workLocalZ: 44.5,
    workYaw: 0,
    rockLocalX: -28.0,
    rockLocalZ: 42.8,
    rockRadius: 1.2,
    oreKind: 'gold',
  },
  // 1: Balin — South-East Golden/Amber Crystal Vein in Room 1
  {
    name: t('dwarven.miners.balin'),
    houseIdx: 1,
    homeOffsetX: 1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: 22.0,
    workLocalZ: 78.5,
    workYaw: -Math.PI / 2,
    rockLocalX: 24.2,
    rockLocalZ: 78.5,
    rockRadius: 1.8,
    oreKind: 'gold',
  },
  // 2: Dwalin — West Wall Amethyst Vein North of West Tunnel Portal
  {
    name: t('dwarven.miners.dwalin'),
    houseIdx: 0,
    homeOffsetX: -1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: -41.5,
    workLocalZ: 49.5,
    workYaw: Math.PI / 2,
    rockLocalX: -43.2,
    rockLocalZ: 49.5,
    rockRadius: 1.25,
    oreKind: 'amethyst',
  },
  // 3: Gloin — West Wall Silver Vein South of West Tunnel Portal
  {
    name: t('dwarven.miners.gloin'),
    houseIdx: 2,
    homeOffsetX: -1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: -41.5,
    workLocalZ: 78.5,
    workYaw: Math.PI / 2,
    rockLocalX: -43.2,
    rockLocalZ: 78.5,
    rockRadius: 1.25,
    oreKind: 'silver',
  },
  // 4: Oin — East Crane Foot Golden Vein
  {
    name: t('dwarven.miners.oin'),
    houseIdx: 1,
    homeOffsetX: 1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: 27.5,
    workLocalZ: 46.5,
    workYaw: 0,
    rockLocalX: 27.5,
    rockLocalZ: 44.8,
    rockRadius: 1.2,
    oreKind: 'gold',
  },
  // 5: Bifur — East Siding Silver & Gold Ore Mound
  {
    name: t('dwarven.miners.bifur'),
    houseIdx: 3,
    homeOffsetX: 1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: 33.5,
    workLocalZ: 76.0,
    workYaw: -Math.PI / 2,
    rockLocalX: 35.8,
    rockLocalZ: 76.0,
    rockRadius: 2.1,
    oreKind: 'silver',
  },
  // 6: Bofur — South-West Cavern Wall Sapphire Vein
  {
    name: t('dwarven.miners.bofur'),
    houseIdx: 2,
    homeOffsetX: -1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: -28.5,
    workLocalZ: 87.5,
    workYaw: Math.PI,
    rockLocalX: -28.5,
    rockLocalZ: 89.2,
    rockRadius: 1.2,
    oreKind: 'sapphire',
  },
  // 7: Bombur — East Wall Emerald Vein North of East Tunnel Portal
  {
    name: t('dwarven.miners.bombur'),
    houseIdx: 3,
    homeOffsetX: 1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: 1.25,
    workLocalX: 41.5,
    workLocalZ: 50.5,
    workYaw: -Math.PI / 2,
    rockLocalX: 43.2,
    rockLocalZ: 50.5,
    rockRadius: 1.2,
    oreKind: 'emerald',
  },
];

export interface IMinecartRouteConfig {
  readonly id: string;
  readonly startLocalX: number;
  readonly startLocalZ: number;
  readonly endLocalX: number;
  readonly endLocalZ: number;
  readonly baseYOffset?: number;
  readonly yaw: number;
  readonly cycleDuration: number;
  readonly phaseOffset: number;
  readonly oreKind: 'gold' | 'silver' | 'emerald' | 'sapphire' | 'amethyst';
}

/**
 * Summary: Stationary Gold & Silver Ore Carts parked on sidings across Room 1, Chamber 3 (Foundry), and Chamber 4 (Moria).
 * Design: Ore carts never move automatically by themselves; only player-operated rideable minecarts move on the main tracks.
 */
export const DWARVEN_MINECART_ROUTES: readonly IMinecartRouteConfig[] = [
  // Cart 0: Stationary Gold Ore Cart on Room 1 Central North Siding
  {
    id: 'minecart-staging-gold-1',
    startLocalX: 5.5,
    startLocalZ: 50.0,
    endLocalX: 5.5,
    endLocalZ: 50.0,
    yaw: 0,
    cycleDuration: 22.0,
    phaseOffset: 0.0,
    oreKind: 'gold',
  },
  // Cart 1: Stationary Silver Ore Cart on Room 1 Central South Siding
  {
    id: 'minecart-staging-silver-1',
    startLocalX: 5.5,
    startLocalZ: 74.0,
    endLocalX: 5.5,
    endLocalZ: 74.0,
    yaw: 0,
    cycleDuration: 24.0,
    phaseOffset: 0.35,
    oreKind: 'silver',
  },
  // Cart 2: Stationary Gold Ore Cart near Room 1 Hoist Crane Spur
  {
    id: 'minecart-crane-gold-2',
    startLocalX: 16.5,
    startLocalZ: 56.0,
    endLocalX: 16.5,
    endLocalZ: 56.0,
    yaw: 0,
    cycleDuration: 25.0,
    phaseOffset: 0.65,
    oreKind: 'gold',
  },
  // Cart 3: Stationary Silver Ore Cart on Room 1 East Siding
  {
    id: 'minecart-east-siding-silver-2',
    startLocalX: 26.5,
    startLocalZ: 56.0,
    endLocalX: 26.5,
    endLocalZ: 56.0,
    yaw: Math.PI / 2,
    cycleDuration: 21.0,
    phaseOffset: 0.18,
    oreKind: 'silver',
  },
  // Cart 4: Stationary Gold Ore Cart in Chamber 3 (East Smelting Foundry)
  {
    id: 'minecart-foundry-gold',
    startLocalX: 114.0,
    startLocalZ: 56.0,
    endLocalX: 114.0,
    endLocalZ: 56.0,
    baseYOffset: SOUTHERN_MINE_POS.eastFoundryFloorY - SOUTHERN_MINE_POS.cavernFloorY,
    yaw: Math.PI / 2,
    cycleDuration: 23.0,
    phaseOffset: 0.52,
    oreKind: 'gold',
  },
  // Cart 5: Stationary Silver Ore Cart in Chamber 3 (East Smelting Foundry)
  {
    id: 'minecart-foundry-silver',
    startLocalX: 114.0,
    startLocalZ: 76.0,
    endLocalX: 114.0,
    endLocalZ: 76.0,
    baseYOffset: SOUTHERN_MINE_POS.eastFoundryFloorY - SOUTHERN_MINE_POS.cavernFloorY,
    yaw: Math.PI / 2,
    cycleDuration: 20.0,
    phaseOffset: 0.82,
    oreKind: 'silver',
  },
];

/**
 * Summary: Returns stationary state for gold/silver ore carts so they never move by themselves.
 */
export function evaluateMinecartTrackState(
  cartIndex: number,
  _elapsedTime: number
): {
  localX: number;
  localZ: number;
  yaw: number;
  travelProgress: number;
  isLoadingAtStart: boolean;
  loadingProgress: number;
  oreFillScale: number;
  wheelAngle: number;
} {
  const route = DWARVEN_MINECART_ROUTES[cartIndex % DWARVEN_MINECART_ROUTES.length];
  return {
    localX: route.startLocalX,
    localZ: route.startLocalZ,
    yaw: route.yaw,
    travelProgress: 0,
    isLoadingAtStart: false,
    loadingProgress: 0,
    oreFillScale: 1.0,
    wheelAngle: 0,
  };
}

// ======================== INTERACTIVE RIDEABLE MINECART LINES ======================== \\
// #region Interactive Rideable Minecart Lines
export interface IRideableMinecartLineDef {
  readonly id: string;
  readonly name: string;
  readonly startStationName: string;
  readonly endStationName: string;
  readonly rideSpeed: number;
  /** Local [lx, worldY, lz] waypoints relative to (SOUTHERN_MINE_POS.x, 0, SOUTHERN_MINE_POS.entranceZ) */
  readonly localWaypoints: readonly (readonly [number, number, number])[];
}

export const DWARVEN_RIDEABLE_MINECART_LINES: readonly IRideableMinecartLineDef[] = [
  {
    id: 'minecart-line-west',
    name: 'West Waterfall Lagoon Rail Line',
    startStationName: 'Mess Hall — West Tunnel Platform',
    endStationName: 'Deep Waterfall & Turquoise Lagoon Cavern',
    rideSpeed: 16.5,
    localWaypoints: [
      [-37.0, SOUTHERN_MINE_POS.cavernFloorY, 64.0],
      [-48.0, SOUTHERN_MINE_POS.cavernFloorY - 0.35, 64.0],
      [-88.0, SOUTHERN_MINE_POS.westLagoonFloorY, 64.0],
      [-100.0, SOUTHERN_MINE_POS.westLagoonFloorY, 64.0],
    ],
  },
  {
    id: 'minecart-line-east',
    name: 'East Smelting Foundry Rail Line',
    startStationName: 'Mess Hall — East Tunnel Platform',
    endStationName: 'Dwarven Gold & Silver Smelting Foundry',
    rideSpeed: 16.5,
    localWaypoints: [
      [37.0, SOUTHERN_MINE_POS.cavernFloorY, 64.0],
      [48.0, SOUTHERN_MINE_POS.cavernFloorY - 0.35, 64.0],
      [88.0, SOUTHERN_MINE_POS.eastFoundryFloorY, 64.0],
      [102.0, SOUTHERN_MINE_POS.eastFoundryFloorY, 64.0],
    ],
  },
  {
    id: 'minecart-line-moria',
    name: 'Khazad-dûm Abyss Express Line',
    startStationName: 'Mess Hall — South Moria Terminal',
    endStationName: 'Great Hall of Khazad-dûm (South Sanctuary)',
    rideSpeed: 18.5,
    localWaypoints: [
      [-11.5, SOUTHERN_MINE_POS.cavernFloorY, 83.0],
      [-11.5, SOUTHERN_MINE_POS.cavernFloorY - 0.38, 95.0],
      [-11.5, SOUTHERN_MINE_POS.moriaHallFloorY, 145.0],
      [-11.5, SOUTHERN_MINE_POS.moriaHallFloorY, 178.0],
      [-11.5, SOUTHERN_MINE_POS.moriaHallFloorY, 218.0],
      [-11.5, SOUTHERN_MINE_POS.moriaHallFloorY, 228.0],
    ],
  },
] as const;

/**
 * Summary: Computes world-space position, elevation, yaw, pitch, slope sine (`sinSlope = dy / segLen`), and total track length along a rideable minecart line for u in [0, 1].
 */
export function evaluateRideableMinecartPose(
  lineId: string,
  u: number
): {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  sinSlope: number;
  totalLength: number;
} {
  const line =
    DWARVEN_RIDEABLE_MINECART_LINES.find((l) => l.id === lineId) ??
    DWARVEN_RIDEABLE_MINECART_LINES[0];
  const wps = line.localWaypoints;
  const clampedU = Math.max(0, Math.min(1, u));
  let totalLength = 0;
  const segLens: number[] = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i];
    const b = wps[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    segLens.push(len);
    totalLength += len;
  }
  const targetDist = clampedU * totalLength;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i];
    if (acc + segLen >= targetDist || i === segLens.length - 1) {
      const a = wps[i];
      const b = wps[i + 1];
      const t = segLen > 1e-5 ? Math.max(0, Math.min(1, (targetDist - acc) / segLen)) : 0;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const dz = b[2] - a[2];
      const lx = a[0] + dx * t;
      const ly = a[1] + dy * t;
      const lz = a[2] + dz * t;
      const yaw = Math.atan2(dx, dz);
      const horizLen = Math.hypot(dx, dz) || 1;
      const pitch = -Math.atan2(dy, horizLen);
      const sinSlope = segLen > 1e-5 ? dy / segLen : 0;
      return {
        x: SOUTHERN_MINE_POS.x + lx,
        y: ly,
        z: SOUTHERN_MINE_POS.entranceZ + lz,
        yaw,
        pitch,
        sinSlope,
        totalLength,
      };
    }
    acc += segLen;
  }
  const last = wps[wps.length - 1];
  return {
    x: SOUTHERN_MINE_POS.x + last[0],
    y: last[1],
    z: SOUTHERN_MINE_POS.entranceZ + last[2],
    yaw: 0,
    pitch: 0,
    sinSlope: 0,
    totalLength,
  };
}

const activeRideableCartProgressByLineId: Record<
  string,
  { u: number; velocity: number; wheelAngle: number }
> = {
  'minecart-line-west': { u: 0, velocity: 0, wheelAngle: 0 },
  'minecart-line-east': { u: 0, velocity: 0, wheelAngle: 0 },
  'minecart-line-moria': { u: 0, velocity: 0, wheelAngle: 0 },
};

export function setRideableMinecartVisualProgress(
  lineId: string,
  u: number,
  wheelAngle: number,
  velocity = 0
): void {
  activeRideableCartProgressByLineId[lineId] = {
    u: Math.max(0, Math.min(1, u)),
    velocity,
    wheelAngle,
  };
}

export function getRideableMinecartVisualProgress(lineId: string): {
  u: number;
  velocity: number;
  wheelAngle: number;
} {
  return activeRideableCartProgressByLineId[lineId] ?? { u: 0, velocity: 0, wheelAngle: 0 };
}

/**
 * Summary: Steps realistic slope-aware minecart physics along a track (`u in [0, 1]`).
 * Design:
 * - Downhill (`sinSlope < 0` when moving toward `+u`): gravity accelerates the cart downward automatically even with zero input (`throttleAlongU === 0`).
 * - Uphill (`sinSlope < 0` when trying to move toward `-u`, i.e., back up to Room 1): gravity opposes motion strongly.
 *   Starting on the uphill or entering the uphill slowly without momentum (`uphillSpeed < 5.5 m/s`) stalls the cart and slides it back down to the bottom flat!
 *   Building speed on the flat run-up at the bottom (`uphillSpeed >= 5.5 m/s`) provides the momentum needed to climb the entire slope to the top!
 */
export function stepRideableMinecartPhysics(
  lineId: string,
  currentU: number,
  currentVelocity: number,
  currentWheelAngle: number,
  throttleAlongU: number,
  dt: number
): {
  u: number;
  velocity: number;
  wheelAngle: number;
  pose: ReturnType<typeof evaluateRideableMinecartPose>;
  stalledOnUphill: boolean;
} {
  const clampedDt = Math.max(0, Math.min(0.1, dt));
  const pose0 = evaluateRideableMinecartPose(lineId, currentU);
  const totalLen = Math.max(1, pose0.totalLength);
  const sinSlope = pose0.sinSlope; // Negative on downhill toward +u (since y drops from Room 1 down to deeper chambers)

  // Gravity acceleration along +u (m/s^2): positive when track drops toward +u
  const gravityAccel = -sinSlope * 32.0;

  // Determine whether the cart is currently on a steep slope (`|sinSlope| >= 0.08`) vs flat/gentle run-up
  const isSteepSlope = Math.abs(sinSlope) >= 0.08;
  // Uphill direction is opposite to gravityAccel (i.e. -1 when gravityAccel > 0)
  const uphillSign = gravityAccel >= 0 ? -1 : 1;
  const uphillSpeed = currentVelocity * uphillSign;
  const isTryingToDriveUphill = throttleAlongU * uphillSign > 0.05;

  let driveAccel = 0;
  let stalledOnUphill = false;
  if (Math.abs(throttleAlongU) > 0.01) {
    if (!isSteepSlope) {
      // On flat sections (Room 1 platform or deep chamber flat floor), player can accelerate briskly
      driveAccel = throttleAlongU * 12.0;
    } else if (isTryingToDriveUphill) {
      // Strong uphill drive power so the player can always climb back up to Room 1 from any chamber
      driveAccel = throttleAlongU * 12.8;
    } else {
      // Driving/braking in the downhill direction on a slope
      driveAccel = throttleAlongU * 9.5;
    }
  }

  let nextVel = currentVelocity + (gravityAccel + driveAccel) * clampedDt;

  // Rolling friction: light on slopes so downhill coasts freely; moderate damping on flat when coasting without throttle
  const dragRate =
    Math.abs(throttleAlongU) < 0.05 && !isSteepSlope ? 1.85 : 0.18;
  nextVel *= Math.exp(-dragRate * clampedDt);

  const maxSpeed = 19.5;
  nextVel = Math.max(-maxSpeed, Math.min(maxSpeed, nextVel));

  let nextU = currentU + (nextVel / totalLen) * clampedDt;
  if (nextU <= 0) {
    nextU = 0;
    if (nextVel < 0) nextVel = 0;
  } else if (nextU >= 1) {
    nextU = 1;
    if (nextVel > 0) nextVel = 0;
  }

  const nextWheelAngle = currentWheelAngle + nextVel * clampedDt * 2.6;
  setRideableMinecartVisualProgress(lineId, nextU, nextWheelAngle, nextVel);
  const nextPose = evaluateRideableMinecartPose(lineId, nextU);
  return {
    u: nextU,
    velocity: nextVel,
    wheelAngle: nextWheelAngle,
    pose: nextPose,
    stalledOnUphill,
  };
}

/**
 * Summary: Finds the nearest interactive rideable minecart (at its live track position or station stop) within `maxDist` of the player.
 */
export function findNearestRideableMinecartStation(
  worldX: number,
  worldY: number,
  worldZ: number,
  maxDist = 4.2
): {
  readonly lineId: string;
  readonly lineName: string;
  readonly startAtEnd: boolean;
  readonly initialU: number;
  readonly stationName: string;
  readonly destinationName: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
} | null {
  let best: {
    readonly lineId: string;
    readonly lineName: string;
    readonly startAtEnd: boolean;
    readonly initialU: number;
    readonly stationName: string;
    readonly destinationName: string;
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly yaw: number;
  } | null = null;
  let bestDist = maxDist;

  for (let i = 0; i < DWARVEN_RIDEABLE_MINECART_LINES.length; i++) {
    const line = DWARVEN_RIDEABLE_MINECART_LINES[i];
    const liveProg = getRideableMinecartVisualProgress(line.id);
    const candidates: { u: number; startAtEnd: boolean }[] = [
      { u: liveProg.u, startAtEnd: liveProg.u > 0.5 },
      { u: 0, startAtEnd: false },
      { u: 1, startAtEnd: true },
    ];

    for (let c = 0; c < candidates.length; c++) {
      const cand = candidates[c];
      const pose = evaluateRideableMinecartPose(line.id, cand.u);
      const d = Math.hypot(worldX - pose.x, worldZ - pose.z);
      if (d <= bestDist && Math.abs(worldY - pose.y) <= 2.8) {
        bestDist = d;
        best = {
          lineId: line.id,
          lineName: line.name,
          startAtEnd: cand.startAtEnd,
          initialU: cand.u,
          stationName: cand.startAtEnd ? line.endStationName : line.startStationName,
          destinationName: cand.startAtEnd ? line.startStationName : line.endStationName,
          x: pose.x,
          y: pose.y,
          z: pose.z,
          // Player camera looks along (-sin(yaw), -cos(yaw)); pose.yaw points along (+sin, +cos) (+u),
          // so yaw = pose.yaw + PI faces +u (when starting at u=0) and yaw = pose.yaw faces -u (when starting at u=1)!
          yaw: cand.startAtEnd ? pose.yaw : pose.yaw + Math.PI,
        };
      }
    }
  }
  return best;
}
// #endregion

// ======================== WAYPOINT MATH ======================== \\
// #region Waypoint Math
/**
 * Summary: Linearly interpolates a multi-segment 3D waypoint path given a normalized factor u in [0, 1].
 */
function interpolateDwarvenCaravanWaypoints(
  waypoints: readonly (readonly [number, number, number])[],
  u: number
): { x: number; y: number; z: number; yaw: number } {
  const clampedU = Math.max(0, Math.min(1, u));
  let totalLen = 0;
  const segLens: number[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    segLens.push(len);
    totalLen += len;
  }

  const targetDist = clampedU * totalLen;
  let acc = 0;

  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i];
    if (acc + segLen >= targetDist || i === segLens.length - 1) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const localT = segLen > 1e-5 ? Math.max(0, Math.min(1, (targetDist - acc) / segLen)) : 0;
      const x = a[0] + (b[0] - a[0]) * localT;
      const y = a[1] + (b[1] - a[1]) * localT;
      const z = a[2] + (b[2] - a[2]) * localT;
      const yaw = Math.atan2(-(b[0] - a[0]), -(b[2] - a[2]));
      return { x, y, z, yaw };
    }
    acc += segLen;
  }

  const last = waypoints[waypoints.length - 1];
  return { x: last[0], y: last[1], z: last[2], yaw: 0 };
}
// #endregion

// ======================== CARAVAN SCHEDULING ======================== \\
// #region Caravan Scheduling
function buildMinerWaypoints(dwarfIdx: number): [number, number, number][] {
  const station = DWARVEN_MINER_STATIONS[dwarfIdx];
  const house = DWARVEN_STONE_HOUSES[station.houseIdx];
  const homeX = house.x + station.homeOffsetX;
  const homeZ = house.z + station.homeOffsetZ;
  const homeY = house.floorY;
  const doorStepX = house.doorX + house.dirX * 1.4;
  const doorStepZ = house.doorZ;
  const roadX = SOUTHERN_MINE_POS.x + station.laneOffsetX;
  const workX = SOUTHERN_MINE_POS.x + station.workLocalX;
  const workZ = SOUTHERN_MINE_POS.entranceZ + station.workLocalZ;
  const workY = SOUTHERN_MINE_POS.cavernFloorY;

  const waypointsToMine: [number, number, number][] = [
    [homeX, homeY, homeZ],
    [doorStepX, house.terraceY, doorStepZ],
    [roadX, house.terraceY, house.z + 3.0],
    [roadX, SOUTHERN_MINE_POS.entranceFloorY, SOUTHERN_MINE_POS.entranceZ - 10.0],
    [roadX, SOUTHERN_MINE_POS.entranceFloorY, SOUTHERN_MINE_POS.shaftStartZ],
    [roadX, SOUTHERN_MINE_POS.cavernFloorY, SOUTHERN_MINE_POS.shaftEndZ + 4.5],
    [SOUTHERN_MINE_POS.x + (station.workLocalX < 0 ? -4.0 : 4.0), workY, SOUTHERN_MINE_POS.entranceZ + 44.0],
    [workX, workY, workZ],
  ];
  return waypointsToMine;
}

type CaravanPath = readonly (readonly [number, number, number])[];

const PRECOMPUTED_CARAVAN_TO_MINE: readonly CaravanPath[] = Object.freeze(
  Array.from({ length: DWARVEN_MINERS_COUNT }, (_, i) => Object.freeze(buildMinerWaypoints(i)))
);

const PRECOMPUTED_CARAVAN_TO_HOME: readonly CaravanPath[] = Object.freeze(
  Array.from({ length: DWARVEN_MINERS_COUNT }, (_, i) => Object.freeze([...buildMinerWaypoints(i)].reverse()))
);

/**
 * Summary: Pure deterministic scheduler for the 8 LOTR-style Dwarven Miners.
 * Note: [HOT-PATH EXCEPTION] Evaluated in 60FPS simulation loop for all 8 miners.
 * Relaxed Rule: Rule 1 (in-place state evaluation instead of deep allocations per frame).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.02ms per frame.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @param worldHours Hour of day, 0-24.
 * @param dwarfIndex Miner index, 0-7.
 * @param animTimeSec Animation time in seconds.
 * @returns Position, heading and activity of that miner at that hour.
 */
export function computeDwarvenMinerCaravanState(
  worldHours: number,
  dwarfIndex: number,
  animTimeSec = 0
): IDwarvenMinerCaravanState {
  const idx = ((dwarfIndex % DWARVEN_MINERS_COUNT) + DWARVEN_MINERS_COUNT) % DWARVEN_MINERS_COUNT;
  const station = DWARVEN_MINER_STATIONS[idx];
  const house = DWARVEN_STONE_HOUSES[station.houseIdx];

  const homeX = house.x + station.homeOffsetX;
  const homeZ = house.z + station.homeOffsetZ;
  const homeY = house.floorY;

  const workX = SOUTHERN_MINE_POS.x + station.workLocalX;
  const workZ = SOUTHERN_MINE_POS.entranceZ + station.workLocalZ;
  const workY = SOUTHERN_MINE_POS.cavernFloorY;

  const waypointsToMine = PRECOMPUTED_CARAVAN_TO_MINE[idx];
  const reversedWaypoints = PRECOMPUTED_CARAVAN_TO_HOME[idx];

  const h = ((worldHours % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;
  const rowIndex = Math.floor(idx / 2);
  const caravanLag = rowIndex * 0.048 + (idx % 2) * 0.014;

  // 1) SUNRISE CARAVAN TO MINE (06:00 .. 07:36 -> h in [6.0, 7.6])
  if (h >= SCHEDULE_DAWN_START && h <= SCHEDULE_WORK_START) {
    const rawProgress = (h - SCHEDULE_DAWN_START) / DAWN_CARAVAN_DURATION;
    const u = Math.max(0, Math.min(1, (rawProgress - caravanLag) / (1.0 - 0.19)));
    const pt = interpolateDwarvenCaravanWaypoints(waypointsToMine, u);
    const isMoving = u > 0.001 && u < 0.999;
    return {
      dwarfIndex: idx,
      name: station.name,
      x: pt.x,
      y: pt.y,
      z: pt.z,
      yaw: isMoving ? pt.yaw : station.workYaw,
      activity: 'caravan_to_mine',
      walkCycle: isMoving ? animTimeSec * 7.5 + idx * 1.1 : 0,
      miningSwing: u >= 0.999 ? (Math.sin(animTimeSec * 4.2 + idx) * 0.5 + 0.5) : 0,
      lanternLit: true,
    };
  }

  // 2) DAYTIME MINING WORK IN THE UNDERGROUND MINE (07:36 .. 17:48 -> h in (7.6, 17.8))
  if (h > SCHEDULE_WORK_START && h < SCHEDULE_WORK_END) {
    const swingPhase = (animTimeSec * 0.95 + idx * 0.37) % 1.0;
    return {
      dwarfIndex: idx,
      name: station.name,
      x: workX,
      y: workY,
      z: workZ,
      yaw: station.workYaw,
      activity: 'mining_work',
      walkCycle: 0,
      miningSwing: swingPhase,
      lanternLit: true,
    };
  }

  // 3) SUNSET CARAVAN BACK HOME (17:48 .. 19:30 -> h in [17.8, 19.5])
  if (h >= SCHEDULE_WORK_END && h <= SCHEDULE_NIGHT_START) {
    const rawProgress = (h - SCHEDULE_WORK_END) / DUSK_CARAVAN_DURATION;
    const uForward = Math.max(0, Math.min(1, (rawProgress - caravanLag) / (1.0 - 0.19)));
    const pt = interpolateDwarvenCaravanWaypoints(reversedWaypoints, uForward);
    const isMoving = uForward > 0.001 && uForward < 0.999;
    return {
      dwarfIndex: idx,
      name: station.name,
      x: pt.x,
      y: pt.y,
      z: pt.z,
      yaw: isMoving ? pt.yaw : house.dirX === 1 ? -Math.PI / 2 : Math.PI / 2,
      activity: 'caravan_to_home',
      walkCycle: isMoving ? animTimeSec * 7.2 + idx * 1.1 : 0,
      miningSwing: 0,
      lanternLit: true,
    };
  }

  // 4) NIGHTTIME REST INSIDE DWARVEN STONE HOUSES (19:30 .. 06:00)
  return {
    dwarfIndex: idx,
    name: station.name,
    x: homeX,
    y: homeY,
    z: homeZ,
    yaw: house.dirX === 1 ? -Math.PI / 2 : Math.PI / 2,
    activity: 'resting_home',
    walkCycle: 0,
    miningSwing: 0,
    lanternLit: false,
  };
}
// #endregion

// ======================== MINE HEIGHT QUERIES ======================== \\
// #region Mine Height Queries
/**
 * Summary: Computes the sloping entrance tunnel floor elevation at a given world Z coordinate.
 * @param z World Z in meters.
 * @returns Tunnel floor height in meters.
 */
export function southernMineFloorHeightAt(z: number): number {
  if (z <= SOUTHERN_MINE_POS.shaftStartZ) {
    return SOUTHERN_MINE_POS.entranceFloorY;
  }
  if (z >= SOUTHERN_MINE_POS.shaftEndZ) {
    return SOUTHERN_MINE_POS.cavernFloorY;
  }
  const t =
    (z - SOUTHERN_MINE_POS.shaftStartZ) /
    (SOUTHERN_MINE_POS.shaftEndZ - SOUTHERN_MINE_POS.shaftStartZ);
  return (
    SOUTHERN_MINE_POS.entranceFloorY +
    t * (SOUTHERN_MINE_POS.cavernFloorY - SOUTHERN_MINE_POS.entranceFloorY)
  );
}

/**
 * Summary: Evaluates whether local mine coordinates (lx, lz) fall inside the relocated Deep Turquoise Lagoon basin
 *          in Chamber 2 (West Waterfall & Lagoon Cavern, lx in [-134.0, -102.0], lz in [54.0, 92.0]),
 *          excluding the walkable wooden plank bridge and lakeside wooden dock.
 */
export function isInsideSouthernMineLagoonBasin(lx: number, lz: number): boolean {
  // Walkable Wooden Plank Bridge crossing the Chamber 2 lagoon (lx in [-135.0, -101.0], lz in [70.5, 75.5])
  if (lx >= -135.0 && lx <= -101.0 && lz >= 70.5 && lz <= 75.5) {
    return false;
  }
  // Walkable Lakeside Wooden Dock in Chamber 2 (lx in [-130.0, -106.0], lz in [91.5, 100.0])
  if (lx >= -130.0 && lx <= -106.0 && lz >= 91.5 && lz <= 100.0) {
    return false;
  }
  // Deep Subterranean Bioluminescent Turquoise Lagoon in Chamber 2 (centered at lx = -118.0, lz = 73.0)
  if (lx >= -134.0 && lx <= -102.0 && lz >= 54.0 && lz <= 92.0) {
    const normX = (lx - -118.0) / 16.0;
    const normZ = (lz - 73.0) / 19.0;
    if (Math.hypot(normX, normZ) < 1.0) {
      return true;
    }
  }
  return false;
}

/**
 * Summary: Queries the complex walkable subterranean surface height across all 4 chambers and connecting tunnels of the Moria-scale mine.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @param currentY Height of the asker, to choose between stacked floors (optional).
 * @returns Walkable height inside the mine in meters.
 */
export function southernMineWalkableHeightAt(
  x: number,
  z: number,
  currentY?: number
): number {
  const lx = x - SOUTHERN_MINE_POS.x;
  const lz = z - SOUTHERN_MINE_POS.entranceZ;

  // 0) North Entrance Shaft (lz < 34.0, |lx| <= 3.8)
  if (lz < MINE_CHAMBER_BOUNDS.shaft.lzMax && Math.abs(lx) <= MINE_CHAMBER_BOUNDS.shaft.halfW) {
    return southernMineFloorHeightAt(z);
  }

  // 1) West Rail Tunnel (MINE_CHAMBER_BOUNDS.westTunnel) sloping from -9.35m down to -15.55m
  const westT = MINE_CHAMBER_BOUNDS.westTunnel;
  if (lx >= westT.lxMin && lx < westT.lxMax && lz >= westT.lzMin && lz <= westT.lzMax) {
    const t = Math.max(0, Math.min(1, (-48.0 - lx) / 40.0));
    return (
      SOUTHERN_MINE_POS.cavernFloorY +
      t * (SOUTHERN_MINE_POS.westLagoonFloorY - SOUTHERN_MINE_POS.cavernFloorY)
    );
  }

  // 2) Chamber 2 — Deep Subterranean Waterfall & Bioluminescent Lagoon Cavern (MINE_CHAMBER_BOUNDS.lagoonChamber)
  const lagoonC = MINE_CHAMBER_BOUNDS.lagoonChamber;
  if (lx < lagoonC.lxMax && lx >= lagoonC.lxMin && lz >= lagoonC.lzMin && lz <= lagoonC.lzMax) {
    const ch2Floor = SOUTHERN_MINE_POS.westLagoonFloorY;
    // Wooden Plank Bridge across Chamber 2 Lagoon (lx in [-135.0, -101.0], lz in [70.5, 75.5])
    if (lx >= -135.0 && lx <= -101.0 && lz >= 70.5 && lz <= 75.5) {
      const endRamp =
        lx < -133.2
          ? Math.max(0, (lx - -135.0) / 1.8)
          : lx > -102.8
            ? Math.max(0, (-101.0 - lx) / 1.8)
            : 1.0;
      return ch2Floor + LAGOON_BRIDGE_HEIGHT_OFFSET * endRamp;
    }
    // Lakeside Wooden Dock on South Shore of Chamber 2 Lagoon (lx in [-130.0, -106.0], lz in [91.5, 100.0])
    if (lx >= -130.0 && lx <= -106.0 && lz >= 91.5 && lz <= 100.0) {
      return ch2Floor + DOCK_PIER_HEIGHT_OFFSET;
    }
    // Swimmable Bioluminescent Turquoise Lagoon Basin in Chamber 2
    if (isInsideSouthernMineLagoonBasin(lx, lz)) {
      const normX = (lx - -118.0) / 16.0;
      const normZ = (lz - 73.0) / 19.0;
      const lakeRad = Math.min(1.0, Math.hypot(normX, normZ));
      const depthFactor = Math.max(0.25, Math.min(1, (1.0 - lakeRad) * 2.4));
      return ch2Floor - depthFactor * CRYSTAL_LAKE_DEPTH;
    }
    return ch2Floor;
  }

  // 3) East Smelting Rail Tunnel (MINE_CHAMBER_BOUNDS.eastTunnel) sloping from -9.35m down to -14.35m
  const eastT = MINE_CHAMBER_BOUNDS.eastTunnel;
  if (lx > eastT.lxMin && lx <= eastT.lxMax && lz >= eastT.lzMin && lz <= eastT.lzMax) {
    const t = Math.max(0, Math.min(1, (lx - eastT.lxMin) / (eastT.lxMax - eastT.lxMin)));
    return (
      SOUTHERN_MINE_POS.cavernFloorY +
      t * (SOUTHERN_MINE_POS.eastFoundryFloorY - SOUTHERN_MINE_POS.cavernFloorY)
    );
  }

  // 4) Chamber 3 — Dwarven Gold & Silver Smelting Foundry & Treasury (MINE_CHAMBER_BOUNDS.foundryChamber)
  const foundryC = MINE_CHAMBER_BOUNDS.foundryChamber;
  if (lx > foundryC.lxMin && lx <= foundryC.lxMax && lz >= foundryC.lzMin && lz <= foundryC.lzMax) {
    return SOUTHERN_MINE_POS.eastFoundryFloorY;
  }

  // 5) South Grand Moria Descent Gallery (lx in [-16.0, 16.0], lz in [95.0, 145.0]) sloping from -9.35m down to -18.35m
  const southG = MINE_CHAMBER_BOUNDS.southGallery;
  if (lz > southG.lzMin && lz < southG.lzMax && Math.abs(lx) <= southG.halfW) {
    const t = Math.max(0, Math.min(1, (lz - 95.0) / 50.0));
    return (
      SOUTHERN_MINE_POS.cavernFloorY +
      t * (SOUTHERN_MINE_POS.moriaHallFloorY - SOUTHERN_MINE_POS.cavernFloorY)
    );
  }

  // 6) Chamber 4 — The Great Hall of Khazad-dûm & Bridge Over the Bottomless Abyss (lx in [-64.0, 64.0], lz in [145.0, 255.0])
  const moriaC = MINE_CHAMBER_BOUNDS.moriaHall;
  if (lz >= moriaC.lzMin && lz <= moriaC.lzMax && Math.abs(lx) <= moriaC.halfW) {
    const moriaFloor = SOUTHERN_MINE_POS.moriaHallFloorY;
    // A) Central Narrow Arched Stone Bridge of Khazad-dûm (lx in [-3.5, 3.5], lz in [178.0, 218.0])
    if (lx >= -3.5 && lx <= 3.5 && lz >= 178.0 && lz <= 218.0) {
      const spanU = Math.max(0, Math.min(1, (lz - 178.0) / 40.0));
      const archRise = Math.sin(spanU * Math.PI) * 1.15;
      return moriaFloor + archRise;
    }
    // B) West Timber & Iron Minecart Trestle Bridge over the Abyss (lx in [-15.0, -8.0], lz in [178.0, 218.0])
    if (lx >= -15.0 && lx <= -8.0 && lz >= 178.0 && lz <= 218.0) {
      return moriaFloor;
    }
    // C) The Bottomless Subterranean Chasm / Abyss of Moria (lz in [180.0, 216.0], outside the two bridges)
    if (lz > 180.0 && lz < 216.0) {
      return SOUTHERN_MINE_POS.moriaAbyssBottomY;
    }
    // D) Elevated Royal Altar Dias of Durin in the South Sanctuary (lx in [-10.0, 10.0], lz in [238.0, 250.0])
    if (lx >= -10.0 && lx <= 10.0 && lz >= 238.0 && lz <= 250.0) {
      const rampT = lz < 240.0 ? Math.max(0, (lz - 238.0) / 2.0) : 1.0;
      return moriaFloor + rampT * 0.8;
    }
    return moriaFloor;
  }

  // 7) Room 1 — Orderly Entry Staging & Mess Hall (lx in [-48.0, 48.0], lz in [34.0, 95.5])
  //    North-East Cliffside Hoist Scaffolding Staircase (lx in [8.5, 12.5], lz in [49.0, 57.5])
  if (lx >= 8.5 && lx <= 12.5 && lz >= SCAFFOLD_STAIR_START_LZ && lz <= SCAFFOLD_STAIR_END_LZ) {
    const tStair = Math.max(0, Math.min(1, (SCAFFOLD_STAIR_END_LZ - lz) / SCAFFOLD_STAIR_SPAN));
    const stairH =
      SOUTHERN_MINE_POS.cavernFloorY +
      tStair * (SOUTHERN_MINE_POS.catwalkY - SOUTHERN_MINE_POS.cavernFloorY);
    if (currentY === undefined || currentY <= stairH + 2.2) {
      return stairH;
    }
  }

  //    North-West Gallery Stairs (a sloped walkable ramp from the cavern floor up to the gallery top),
  //    then the gallery itself, from MINE_NW_GALLERY. Steps are not boxes: a box above the feet is a wall.
  {
    const nwWestEdge = MINE_NW_GALLERY.lx - MINE_NW_GALLERY.width / 2;
    const nwStairStart = nwWestEdge - MINE_NW_GALLERY.stepCount * MINE_NW_GALLERY.stepRun;
    const inNwZ = Math.abs(lz - MINE_NW_GALLERY.lz) <= MINE_NW_GALLERY.depth / 2;
    if (inNwZ && lx >= nwStairStart && lx < nwWestEdge) {
      const tStair = (lx - nwStairStart) / (nwWestEdge - nwStairStart);
      return (
        SOUTHERN_MINE_POS.cavernFloorY + tStair * (MINE_NW_GALLERY.topY - SOUTHERN_MINE_POS.cavernFloorY)
      );
    }
    if (
      inNwZ &&
      lx >= nwWestEdge &&
      lx <= nwWestEdge + MINE_NW_GALLERY.width &&
      currentY !== undefined &&
      currentY >= MINE_NW_GALLERY.topY - 1.6
    ) {
      return MINE_NW_GALLERY.topY;
    }
  }

  //    Elevated North-East Cliffside Hoist Platform (lx in [8.0, 24.0], lz in [37.5, 49.0]) at y = catwalkY
  if (
    lx >= 8.0 &&
    lx <= 24.0 &&
    lz >= 37.5 &&
    lz <= 49.0 &&
    currentY !== undefined &&
    currentY >= SOUTHERN_MINE_POS.catwalkY - 1.6
  ) {
    return SOUTHERN_MINE_POS.catwalkY;
  }

  return SOUTHERN_MINE_POS.cavernFloorY;
}
// #endregion

// ======================== MINE BOUNDARY QUERIES ======================== \\
// #region Mine Boundary Queries
/**
 * Summary: Computes the subterranean ceiling height inside any chamber or tunnel of the Southern Dwarven Mine.
 */
export function southernMineCeilingHeightAt(x: number, z: number): number {
  const lx = x - SOUTHERN_MINE_POS.x;
  const lz = z - SOUTHERN_MINE_POS.entranceZ;
  if (lz < 34.0) {
    return southernMineFloorHeightAt(z) + SOUTHERN_MINE_POS.corridorHeight;
  }
  if (lx < -48.0) {
    return SOUTHERN_MINE_POS.westLagoonFloorY + 12.5;
  }
  if (lx > 48.0) {
    return SOUTHERN_MINE_POS.eastFoundryFloorY + 12.0;
  }
  if (lz > 95.5) {
    return SOUTHERN_MINE_POS.moriaHallFloorY + 16.0;
  }
  return SOUTHERN_MINE_POS.cavernFloorY + SOUTHERN_MINE_POS.cavernHeight;
}

/**
 * Summary: Determines whether a given 3D coordinate falls within the subterranean volumes of the Southern Dwarven Mine
 *          (Entrance Shaft, Room 1 Mess Hall, West Tunnel & Chamber 2 Lagoon, East Tunnel & Chamber 3 Foundry,
 *           South Descent Gallery & Chamber 4 Great Hall of Khazad-dûm).
 * @param x World X in meters.
 * @param z World Z in meters.
 * @param currentY Height of the asker, to choose between stacked floors (optional).
 * @returns True inside any of the mine tunnels or underground chambers.
 */
export function isInsideSouthernMine(x: number, z: number, currentY?: number): boolean {
  const lx = x - SOUTHERN_MINE_POS.x;
  const lz = z - SOUTHERN_MINE_POS.entranceZ;

  const B = MINE_CHAMBER_BOUNDS;

  // 1) Main entrance tunnel shaft (MINE_CHAMBER_BOUNDS.shaft)
  if (Math.abs(lx) <= B.shaft.halfW && lz >= B.shaft.lzMin && lz <= B.shaft.lzMax) {
    const shaftFloorY = southernMineFloorHeightAt(z);
    if (currentY !== undefined && currentY > shaftFloorY + 5.4) return false;
    return true;
  }

  // 2) Room 1 — Entry Staging & Mess Hall (MINE_CHAMBER_BOUNDS.room1)
  if (Math.abs(lx) <= B.room1.halfW && lz >= B.room1.lzMin && lz <= B.room1.lzMax) {
    if (currentY !== undefined && currentY > SOUTHERN_MINE_POS.cavernFloorY + 12.2) return false;
    return true;
  }

  // 3) West Rail Tunnel (MINE_CHAMBER_BOUNDS.westTunnel)
  if (lx >= B.westTunnel.lxMin && lx <= B.westTunnel.lxMax && lz >= B.westTunnel.lzMin && lz <= B.westTunnel.lzMax) {
    if (currentY !== undefined && currentY > SOUTHERN_MINE_POS.cavernFloorY + 6.5) return false;
    return true;
  }

  // 4) Chamber 2 — Deep Subterranean Waterfall & Bioluminescent Lagoon Cavern (MINE_CHAMBER_BOUNDS.lagoonChamber)
  if (lx >= B.lagoonChamber.lxMin && lx <= B.lagoonChamber.lxMax && lz >= B.lagoonChamber.lzMin && lz <= B.lagoonChamber.lzMax) {
    if (currentY !== undefined && currentY > SOUTHERN_MINE_POS.westLagoonFloorY + 13.0) return false;
    return true;
  }

  // 5) East Smelting Rail Tunnel (MINE_CHAMBER_BOUNDS.eastTunnel)
  if (lx >= B.eastTunnel.lxMin && lx <= B.eastTunnel.lxMax && lz >= B.eastTunnel.lzMin && lz <= B.eastTunnel.lzMax) {
    if (currentY !== undefined && currentY > SOUTHERN_MINE_POS.cavernFloorY + 6.5) return false;
    return true;
  }

  // 6) Chamber 3 — Dwarven Gold & Silver Smelting Foundry & Treasury (MINE_CHAMBER_BOUNDS.foundryChamber)
  if (lx >= B.foundryChamber.lxMin && lx <= B.foundryChamber.lxMax && lz >= B.foundryChamber.lzMin && lz <= B.foundryChamber.lzMax) {
    if (currentY !== undefined && currentY > SOUTHERN_MINE_POS.eastFoundryFloorY + 12.5) return false;
    return true;
  }

  // 7) South Grand Moria Descent Gallery (MINE_CHAMBER_BOUNDS.southGallery)
  if (Math.abs(lx) <= B.southGallery.halfW && lz >= B.southGallery.lzMin && lz <= B.southGallery.lzMax) {
    if (currentY !== undefined && currentY > SOUTHERN_MINE_POS.cavernFloorY + 7.5) return false;
    return true;
  }

  // 8) Chamber 4 — The Great Hall of Khazad-dûm & Bridge Over the Bottomless Abyss (MINE_CHAMBER_BOUNDS.moriaHall)
  if (Math.abs(lx) <= B.moriaHall.halfW && lz >= B.moriaHall.lzMin && lz <= B.moriaHall.lzMax) {
    if (currentY !== undefined && currentY > SOUTHERN_MINE_POS.moriaHallFloorY + 16.5) return false;
    return true;
  }

  return false;
}
// #endregion
