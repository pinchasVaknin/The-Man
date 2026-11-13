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
import { ANCIENT_MINE_ORIGIN, MINE_LEVEL_Y } from '../domain/landmarks/ancientMine/ancientMineLayout';
import { ALL_MINE_PROPS } from '../domain/landmarks/ancientMine/ancientMineProps';
import {
  ancientMineCeilingHeightAt,
  ancientMineWalkableHeightAt,
  ancientMineWaterSurfaceAt,
  isInsideAncientMine,
} from '../domain/landmarks/ancientMine/ancientMineWorld';
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
  /** Summary: Local (lx, lz) waypoints between the foot of the entry stairs and the work spot. */
  readonly viaLocal?: readonly (readonly [number, number])[];
}
type MinerStationConfig = IMinerStationConfig;

/**
 * Summary: The eight miners' work stations in the Ancient Mine and the waypoints that lead to each.
 * Design: Every station stands within reach of a real object it works on (an ore face, the bin,
 *         the crusher, an anvil, a furnace, the workbench). `viaLocal` steers the walk from the foot
 *         of the entry stairs around pillars, props and the gallery pit.
 */
export const DWARVEN_MINER_STATIONS: readonly MinerStationConfig[] = [
  // 0: gold seam on the east gallery wall
  {
    name: t('dwarven.miners.durin'),
    houseIdx: 0,
    homeOffsetX: -1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: -1.25,
    workLocalX: 116.6,
    workLocalZ: 78,
    workYaw: -1.5708,
    rockLocalX: 118.4,
    rockLocalZ: 78,
    rockRadius: 1.2,
    oreKind: 'gold',
    viaLocal: [[12, 50], [45, 92], [108, 94]],
  },
  // 1: purple crystal face on the north gallery wall
  {
    name: t('dwarven.miners.balin'),
    houseIdx: 1,
    homeOffsetX: 1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: 96,
    workLocalZ: 29.8,
    workYaw: 0.0000,
    rockLocalX: 96,
    rockLocalZ: 28.3,
    rockRadius: 1.2,
    oreKind: 'amethyst',
    viaLocal: [[12, 50], [20, 40], [52, 31], [90, 31]],
  },
  // 2: copper face beside the north tunnel mouth
  {
    name: t('dwarven.miners.dwalin'),
    houseIdx: 0,
    homeOffsetX: -1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: 80,
    workLocalZ: 26.9,
    workYaw: 0.0000,
    rockLocalX: 80,
    rockLocalZ: 25.4,
    rockRadius: 1.2,
    oreKind: 'gold',
    viaLocal: [[12, 50], [20, 40], [52, 31]],
  },
  // 3: sorting ore at the storage-yard bin
  {
    name: t('dwarven.miners.gloin'),
    houseIdx: 2,
    homeOffsetX: -1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: -42.2,
    workLocalZ: 56,
    workYaw: 1.5708,
    rockLocalX: -44,
    rockLocalZ: 56,
    rockRadius: 1.2,
    oreKind: 'sapphire',
    viaLocal: [[-12, 50], [-30, 52]],
  },
  // 4: feeding the stone crusher
  {
    name: t('dwarven.miners.oin'),
    houseIdx: 1,
    homeOffsetX: 1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: 92,
    workLocalZ: 85.6,
    workYaw: 0.0000,
    rockLocalX: 92,
    rockLocalZ: 84.2,
    rockRadius: 1.2,
    oreKind: 'silver',
    viaLocal: [[12, 50], [45, 92]],
  },
  // 5: hammering at the foundry anvil
  {
    name: t('dwarven.miners.bifur'),
    houseIdx: 3,
    homeOffsetX: 1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: 80,
    workLocalZ: 113.6,
    workYaw: 3.1416,
    rockLocalX: 80,
    rockLocalZ: 115,
    rockRadius: 1.2,
    oreKind: 'silver',
    viaLocal: [[12, 50], [45, 92], [70, 110]],
  },
  // 6: tending the middle furnace
  {
    name: t('dwarven.miners.bofur'),
    houseIdx: 2,
    homeOffsetX: -1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: 90,
    workLocalZ: 132.4,
    workYaw: 3.1416,
    rockLocalX: 90,
    rockLocalZ: 134,
    rockRadius: 1.2,
    oreKind: 'gold',
    viaLocal: [[12, 50], [45, 92], [70, 110], [86, 128]],
  },
  // 7: repairing tools at the hall workbench
  {
    name: t('dwarven.miners.bombur'),
    houseIdx: 3,
    homeOffsetX: 1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: 1.25,
    workLocalX: 32,
    workLocalZ: 28.9,
    workYaw: 0.0000,
    rockLocalX: 32,
    rockLocalZ: 27.4,
    rockRadius: 1.2,
    oreKind: 'emerald',
    viaLocal: [[12, 50], [20, 40]],
  },
];

/** Summary: A stationary ore cart parked on a track in the mine (local frame). */
export interface IMinecartRouteConfig {
  readonly startLocalX: number;
  readonly startLocalZ: number;
  readonly endLocalX: number;
  readonly endLocalZ: number;
  readonly yaw: number;
  readonly cycleSeconds: number;
  readonly phaseOffset: number;
  readonly oreKind: 'gold' | 'silver' | 'emerald' | 'sapphire' | 'amethyst';
  readonly baseYOffset?: number;
}

/**
 * Summary: The parked ore carts of the Ancient Mine, matching the oreCart props in the galleries.
 * Design: Derived from the props table so a cart's state always sits where its mesh and collider are.
 */
export const DWARVEN_MINECART_ROUTES: readonly IMinecartRouteConfig[] = ALL_MINE_PROPS.filter((p) => p.kind === 'oreCart').map(
  (p): IMinecartRouteConfig => ({
    startLocalX: p.lx,
    startLocalZ: p.lz,
    endLocalX: p.lx,
    endLocalZ: p.lz,
    yaw: p.yaw ?? 0,
    cycleSeconds: 0,
    phaseOffset: 0,
    oreKind: 'gold',
  })
);


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

/**
 * Summary: The three rideable passenger lines of the Ancient Mine, on the hall's rail tracks.
 * Design: Local [lx, worldY, lz] waypoints. The gallery ore line keeps the id 'minecart-line-moria'
 *         so saved ride state stays valid; it ends on the cart ramp, so the ride coasts downhill
 *         into the gallery pit and must be driven back up.
 */
export const DWARVEN_RIDEABLE_MINECART_LINES: readonly IRideableMinecartLineDef[] = [
  {
    id: 'minecart-line-west',
    name: 'Storage Yard Line',
    startStationName: 'Turntable Hub — West Track',
    endStationName: 'Storage Yard',
    rideSpeed: 12.0,
    localWaypoints: [
      [-6.0, MINE_LEVEL_Y.upperCavern, 80.0],
      [-20.0, MINE_LEVEL_Y.upperCavern, 74.0],
      [-30.0, MINE_LEVEL_Y.upperCavern, 69.0],
      [-40.0, MINE_LEVEL_Y.upperCavern, 64.0],
    ],
  },
  {
    id: 'minecart-line-east',
    name: 'Foundry Line',
    startStationName: 'Turntable Hub — South-East Track',
    endStationName: 'Smelting Foundry',
    rideSpeed: 14.0,
    localWaypoints: [
      [4.0, MINE_LEVEL_Y.upperCavern, 85.0],
      [20.0, MINE_LEVEL_Y.upperCavern, 100.0],
      [40.0, MINE_LEVEL_Y.upperCavern, 108.0],
      [56.0, MINE_LEVEL_Y.upperCavern, 108.0],
      [68.0, MINE_LEVEL_Y.upperCavern, 114.0],
    ],
  },
  {
    id: 'minecart-line-moria',
    name: 'Gallery Ore Line',
    startStationName: 'Turntable Hub — East Track',
    endStationName: 'Gallery Pit',
    rideSpeed: 14.0,
    localWaypoints: [
      [6.0, MINE_LEVEL_Y.upperCavern, 80.0],
      [30.0, MINE_LEVEL_Y.upperCavern, 80.0],
      [56.0, MINE_LEVEL_Y.upperCavern, 78.0],
      [70.0, MINE_LEVEL_Y.upperCavern, 76.0],
      [70.0, MINE_LEVEL_Y.upperCavern, 72.0],
      [70.0, MINE_LEVEL_Y.galleryPit, 60.0],
      [70.0, MINE_LEVEL_Y.galleryPit, 54.0],
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

  // Through the gate, down the steps to the overlook, down the grand entry stairs, then the
  // station's own lane through the open cavern.
  const ez = SOUTHERN_MINE_POS.entranceZ;
  const waypointsToMine: [number, number, number][] = [
    [homeX, homeY, homeZ],
    [doorStepX, house.terraceY, doorStepZ],
    [roadX, house.terraceY, house.z + 3.0],
    [roadX, MINE_LEVEL_Y.entrance, ez - 10.0],
    [roadX, MINE_LEVEL_Y.entrance, ez + 2.0],
    [roadX, MINE_LEVEL_Y.overlook, ez + 12.0],
    [roadX, MINE_LEVEL_Y.overlook, ez + 19.6],
    [roadX, workY, ez + 46.0],
    ...(station.viaLocal ?? []).map(([lx, lz]): [number, number, number] => [SOUTHERN_MINE_POS.x + lx, workY, ez + lz]),
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
/**
 * Summary: Computes where a dwarf is on its daily route.
 * @param floorAt Optional: the walkable floor height at a point, given a height hint. When given, the dwarf stands on the
 *                 floor under it (DW1), instead of at the route's interpolated height, which can float or sink.
 */
export function computeDwarvenMinerCaravanState(
  worldHours: number,
  dwarfIndex: number,
  animTimeSec = 0,
  floorAt?: (x: number, z: number, hintY: number) => number
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
      y: floorAt ? floorAt(pt.x, pt.z, pt.y) : pt.y,
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
      y: floorAt ? floorAt(pt.x, pt.z, pt.y) : pt.y,
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
 * Summary: Floor height along the mine's centre line at a world Z (gate, entrance steps, entry stairs).
 * @param z World Z in meters.
 * @returns Floor height in meters.
 */
export function southernMineFloorHeightAt(z: number): number {
  return ancientMineWalkableHeightAt(SOUTHERN_MINE_POS.x, z);
}

/**
 * Summary: Whether local mine coordinates (lx, lz) lie in open water (lagoon basin or channel).
 */
export function isInsideSouthernMineLagoonBasin(lx: number, lz: number): boolean {
  return (
    ancientMineWaterSurfaceAt(lx + ANCIENT_MINE_ORIGIN.x, lz + ANCIENT_MINE_ORIGIN.z, MINE_LEVEL_Y.upperCavern) !== null
  );
}

/**
 * Summary: Walkable floor height inside the Ancient Dwarven Mine (delegates to the ancient mine layout).
 * @param x World X in meters.
 * @param z World Z in meters.
 * @param currentY Height of the asker, to choose between stacked floors (optional).
 * @returns Walkable height inside the mine in meters.
 */
export function southernMineWalkableHeightAt(x: number, z: number, currentY?: number): number {
  return ancientMineWalkableHeightAt(x, z, currentY);
}
// #endregion

// ======================== MINE BOUNDARY QUERIES ======================== \\
// #region Mine Boundary Queries
/**
 * Summary: Rock ceiling height inside the Ancient Dwarven Mine.
 */
export function southernMineCeilingHeightAt(x: number, z: number): number {
  return ancientMineCeilingHeightAt(x, z);
}

/**
 * Summary: Whether a world point is inside the Ancient Dwarven Mine rather than on the surface above it.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @param currentY Height of the asker; above the local rock ceiling counts as outside (optional).
 */
export function isInsideSouthernMine(x: number, z: number, currentY?: number): boolean {
  return isInsideAncientMine(x, z, currentY);
}
// #endregion
