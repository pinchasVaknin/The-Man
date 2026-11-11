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
  readonly oreKind: 'gold' | 'emerald' | 'sapphire' | 'amethyst';
  readonly pairedCartIdx?: number;
  readonly cartLoadLocalX?: number;
  readonly cartLoadLocalZ?: number;
  readonly cartLoadYaw?: number;
}
type MinerStationConfig = IMinerStationConfig;

export const DWARVEN_MINER_STATIONS: readonly MinerStationConfig[] = [
  // 0: Durin — North-West Ore Pit Loop beside the Waterfall (loads Cart 0 on the bridge approach)
  {
    name: t('dwarven.miners.durin'),
    houseIdx: 0,
    homeOffsetX: -1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: -1.25,
    workLocalX: -12.0,
    workLocalZ: 52.8,
    workYaw: Math.PI,
    rockLocalX: -12.0,
    rockLocalZ: 54.3,
    rockRadius: 1.2,
    oreKind: 'gold',
    pairedCartIdx: 0,
    cartLoadLocalX: -18.5,
    cartLoadLocalZ: 61.2,
    cartLoadYaw: Math.PI,
  },
  // 1: Balin — East Golden/Amber Crystal Cluster beside the Bridge exit (loads Cart 1)
  {
    name: t('dwarven.miners.balin'),
    houseIdx: 1,
    homeOffsetX: 1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: 13.0,
    workLocalZ: 72.5,
    workYaw: -Math.PI / 2,
    rockLocalX: 15.5,
    rockLocalZ: 72.5,
    rockRadius: 2.1,
    oreKind: 'gold',
    pairedCartIdx: 1,
    cartLoadLocalX: 14.0,
    cartLoadLocalZ: 63.8,
    cartLoadYaw: 0,
  },
  // 2: Dwalin — West Amethyst Loop North Vein (loads Cart 2)
  {
    name: t('dwarven.miners.dwalin'),
    houseIdx: 0,
    homeOffsetX: -1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: -35.0,
    workLocalZ: 59.8,
    workYaw: Math.PI,
    rockLocalX: -35.0,
    rockLocalZ: 61.3,
    rockRadius: 1.25,
    oreKind: 'amethyst',
    pairedCartIdx: 2,
    cartLoadLocalX: -27.5,
    cartLoadLocalZ: 58.0,
    cartLoadYaw: Math.PI,
  },
  // 3: Gloin — West Amethyst Loop South Vein
  {
    name: t('dwarven.miners.gloin'),
    houseIdx: 2,
    homeOffsetX: -1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: -35.0,
    workLocalZ: 72.2,
    workYaw: 0,
    rockLocalX: -35.0,
    rockLocalZ: 70.7,
    rockRadius: 1.25,
    oreKind: 'amethyst',
  },
  // 4: Oin — East Crane Foot Golden Vein (loads Cart 3)
  {
    name: t('dwarven.miners.oin'),
    houseIdx: 1,
    homeOffsetX: 1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: 16.5,
    workLocalZ: 53.5,
    workYaw: -Math.PI / 2,
    rockLocalX: 18.2,
    rockLocalZ: 53.5,
    rockRadius: 1.2,
    oreKind: 'gold',
    pairedCartIdx: 3,
    cartLoadLocalX: 14.8,
    cartLoadLocalZ: 52.5,
    cartLoadYaw: Math.PI / 2,
  },
  // 5: Bifur — East Circular Loop Ore Mound (loads Cart 4)
  {
    name: t('dwarven.miners.bifur'),
    houseIdx: 3,
    homeOffsetX: 1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: 27.6,
    workLocalZ: 68.0,
    workYaw: -Math.PI / 2,
    rockLocalX: 31.0,
    rockLocalZ: 68.0,
    rockRadius: 2.6,
    oreKind: 'gold',
    pairedCartIdx: 4,
    cartLoadLocalX: 23.8,
    cartLoadLocalZ: 63.8,
    cartLoadYaw: 0,
  },
  // 6: Bofur — South-West Cavern Wall Sapphire Vein (loads Cart 5)
  {
    name: t('dwarven.miners.bofur'),
    houseIdx: 2,
    homeOffsetX: -1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: -24.5,
    workLocalZ: 84.8,
    workYaw: Math.PI,
    rockLocalX: -24.5,
    rockLocalZ: 86.3,
    rockRadius: 1.2,
    oreKind: 'sapphire',
    pairedCartIdx: 5,
    cartLoadLocalX: -22.2,
    cartLoadLocalZ: 82.0,
    cartLoadYaw: -Math.PI / 2,
  },
  // 7: Bombur — Far-East Timber Arch Emerald Vein
  {
    name: t('dwarven.miners.bombur'),
    houseIdx: 3,
    homeOffsetX: 1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: 1.25,
    workLocalX: 37.8,
    workLocalZ: 55.5,
    workYaw: -Math.PI / 2,
    rockLocalX: 39.4,
    rockLocalZ: 55.5,
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
  readonly yaw: number;
  readonly cycleDuration: number;
  readonly phaseOffset: number;
  readonly oreKind: 'gold' | 'emerald' | 'sapphire' | 'amethyst';
}

export const DWARVEN_MINECART_ROUTES: readonly IMinecartRouteConfig[] = [
  // Cart 0: Central Wooden Plank Bridge Track over the Turquoise Lagoon (x = -18.5 .. +5.5, z = 62.5)
  {
    id: 'minecart-lagoon-bridge',
    startLocalX: -18.5,
    startLocalZ: 62.5,
    endLocalX: 5.5,
    endLocalZ: 62.5,
    yaw: Math.PI / 2,
    cycleDuration: 22.0,
    phaseOffset: 0.0,
    oreKind: 'gold',
  },
  // Cart 1: East Cavern Main Track past the Golden Crystal Cluster (x = 14.0 .. 23.0, z = 62.5)
  {
    id: 'minecart-east-cavern',
    startLocalX: 14.0,
    startLocalZ: 62.5,
    endLocalX: 23.0,
    endLocalZ: 62.5,
    yaw: Math.PI / 2,
    cycleDuration: 24.0,
    phaseOffset: 0.35,
    oreKind: 'gold',
  },
  // Cart 2: West Amethyst Cavern Straight Spur (x = -27.5 .. -21.5, z = 56.8)
  {
    id: 'minecart-west-amethyst',
    startLocalX: -27.5,
    startLocalZ: 56.8,
    endLocalX: -21.5,
    endLocalZ: 56.8,
    yaw: Math.PI / 2,
    cycleDuration: 25.0,
    phaseOffset: 0.65,
    oreKind: 'amethyst',
  },
  // Cart 3: East Hoist Crane Spur Track (x = 13.5, z = 52.5 .. 60.5)
  {
    id: 'minecart-crane-spur',
    startLocalX: 13.5,
    startLocalZ: 52.5,
    endLocalX: 13.5,
    endLocalZ: 60.5,
    yaw: 0,
    cycleDuration: 21.0,
    phaseOffset: 0.18,
    oreKind: 'gold',
  },
  // Cart 4: East Circular Loop North Chord (x = 23.8 .. 35.5, z = 61.5)
  {
    id: 'minecart-east-loop',
    startLocalX: 23.8,
    startLocalZ: 61.5,
    endLocalX: 35.5,
    endLocalZ: 61.5,
    yaw: Math.PI / 2,
    cycleDuration: 23.0,
    phaseOffset: 0.52,
    oreKind: 'gold',
  },
  // Cart 5: South-West Cavern Haul Track (x = -21.0, z = 82.0 .. 66.0)
  {
    id: 'minecart-southwest-haul',
    startLocalX: -21.0,
    startLocalZ: 82.0,
    endLocalX: -21.0,
    endLocalZ: 66.0,
    yaw: 0,
    cycleDuration: 20.0,
    phaseOffset: 0.82,
    oreKind: 'sapphire',
  },
];

export function evaluateMinecartTrackState(
  cartIndex: number,
  elapsedTime: number
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
  const rawPhase = ((elapsedTime / route.cycleDuration + route.phaseOffset) % 1.0 + 1.0) % 1.0;

  let u = 0;
  let isLoadingAtStart = false;
  let loadingProgress = 0;
  let oreFillScale = 0.65;

  if (rawPhase < 0.24) {
    u = 0;
    isLoadingAtStart = true;
    loadingProgress = rawPhase / 0.24;
    oreFillScale = 0.55 + 0.6 * loadingProgress;
  } else if (rawPhase < 0.52) {
    const t = (rawPhase - 0.24) / 0.28;
    u = t * t * (3 - 2 * t);
    oreFillScale = 1.15;
  } else if (rawPhase < 0.68) {
    u = 1;
    const unloadT = (rawPhase - 0.52) / 0.16;
    oreFillScale = 1.15 - 0.6 * unloadT;
  } else {
    const t = (rawPhase - 0.68) / 0.32;
    const smoothT = t * t * (3 - 2 * t);
    u = 1 - smoothT;
    oreFillScale = 0.55;
  }

  const localX = route.startLocalX + (route.endLocalX - route.startLocalX) * u;
  const localZ = route.startLocalZ + (route.endLocalZ - route.startLocalZ) * u;
  const distFromStart = Math.hypot(localX - route.startLocalX, localZ - route.startLocalZ);
  const wheelAngle = distFromStart / 0.25;

  return {
    localX,
    localZ,
    yaw: route.yaw,
    travelProgress: u,
    isLoadingAtStart,
    loadingProgress,
    oreFillScale,
    wheelAngle,
  };
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
  const bridgeY = SOUTHERN_MINE_POS.cavernFloorY + LAGOON_BRIDGE_HEIGHT_OFFSET;
  const bridgeZ = SOUTHERN_MINE_POS.entranceZ + 62.5;

  const waypointsToMine: [number, number, number][] = [
    [homeX, homeY, homeZ],
    [doorStepX, house.terraceY, doorStepZ],
    [roadX, house.terraceY, house.z + 3.0],
    [roadX, SOUTHERN_MINE_POS.entranceFloorY, SOUTHERN_MINE_POS.entranceZ - 10.0],
    [roadX, SOUTHERN_MINE_POS.entranceFloorY, SOUTHERN_MINE_POS.shaftStartZ],
    [roadX, SOUTHERN_MINE_POS.cavernFloorY, SOUTHERN_MINE_POS.shaftEndZ + 4.5],
    [SOUTHERN_MINE_POS.x - 18.5, workY, SOUTHERN_MINE_POS.entranceZ + 42.0],
    [SOUTHERN_MINE_POS.x - 20.5, workY, SOUTHERN_MINE_POS.entranceZ + 56.0],
  ];

  if (station.workLocalX > 0) {
    // Cross the wooden plank bridge over the turquoise underground lagoon into the East Cavern
    waypointsToMine.push([SOUTHERN_MINE_POS.x - 19.5, bridgeY, bridgeZ]);
    waypointsToMine.push([SOUTHERN_MINE_POS.x + 6.5, bridgeY, bridgeZ]);
    waypointsToMine.push([SOUTHERN_MINE_POS.x + 12.0, workY, bridgeZ]);
  } else if (station.workLocalX < -25.0) {
    waypointsToMine.push([SOUTHERN_MINE_POS.x - 26.0, workY, SOUTHERN_MINE_POS.entranceZ + 58.0]);
  }
  waypointsToMine.push([workX, workY, workZ]);
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
 * Summary: Computes the sloping tunnel floor elevation at a given world Z coordinate.
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
 * Summary: Evaluates whether local mine coordinates (lx, lz) fall inside the Turquoise Underground Lagoon basin
 *          (excluding the walkable wooden plank bridge, foreground lakeside dock, and west wooden jetty).
 */
export function isInsideSouthernMineLagoonBasin(lx: number, lz: number): boolean {
  // Walkable Wooden Plank Bridge crossing the lagoon (lx in [-20.0, 6.0], lz in [60.0, 65.0])
  if (lx >= -20.0 && lx <= 6.0 && lz >= 60.0 && lz <= 65.0) {
    return false;
  }
  // Walkable Foreground Lakeside Wooden Dock (lx in [-18.0, 8.0], lz in [82.0, 90.0])
  if (lx >= -18.0 && lx <= 8.0 && lz >= 82.0 && lz <= 90.0) {
    return false;
  }
  // Walkable West Lagoon Wooden Jetty (lx in [-23.5, -16.5], lz in [67.0, 73.5])
  if (lx >= -23.5 && lx <= -16.5 && lz >= 67.0 && lz <= 73.5) {
    return false;
  }
  // Central-West Bioluminescent Turquoise Lagoon (lx in [-19.5, 5.5], lz in [44.0, 82.0])
  if (lx >= -19.5 && lx <= 5.5 && lz >= 44.0 && lz <= 82.0) {
    const normX = (lx - -7.0) / 12.5;
    const normZ = (lz - 63.0) / 19.0;
    if (Math.hypot(normX, normZ) < 1.0) {
      return true;
    }
  }
  return false;
}

/**
 * Summary: Queries the complex walkable subterranean surface height inside the mine.
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
  if (z < SOUTHERN_MINE_POS.shaftEndZ) {
    return southernMineFloorHeightAt(z);
  }
  const lx = x - SOUTHERN_MINE_POS.x;
  const lz = z - SOUTHERN_MINE_POS.entranceZ;

  // 1) North-East Cliffside Hoist Scaffolding Staircase (lx in [8.5, 12.5], lz in [49.0, 57.5])
  //    ascending from cavernFloorY (at lz = 57.5) up to catwalkY (-5.55m at lz = 49.0)
  if (lx >= 8.5 && lx <= 12.5 && lz >= SCAFFOLD_STAIR_START_LZ && lz <= SCAFFOLD_STAIR_END_LZ) {
    const tStair = Math.max(0, Math.min(1, (SCAFFOLD_STAIR_END_LZ - lz) / SCAFFOLD_STAIR_SPAN));
    const stairH =
      SOUTHERN_MINE_POS.cavernFloorY +
      tStair * (SOUTHERN_MINE_POS.catwalkY - SOUTHERN_MINE_POS.cavernFloorY);
    if (currentY === undefined || currentY <= stairH + 2.2) {
      return stairH;
    }
  }

  // 2) Elevated North-East Cliffside Hoist Platform (lx in [8.0, 24.0], lz in [37.5, 49.0]) at y = catwalkY
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

  // 3) Central Wooden Plank Bridge crossing the Turquoise Lagoon (lx in [-20.0, 6.0], lz in [60.0, 65.0])
  if (lx >= -20.0 && lx <= 6.0 && lz >= 60.0 && lz <= 65.0) {
    const endRamp =
      lx < -18.2
        ? Math.max(0, (lx - -20.0) / 1.8)
        : lx > 4.2
          ? Math.max(0, (6.0 - lx) / 1.8)
          : 1.0;
    return SOUTHERN_MINE_POS.cavernFloorY + LAGOON_BRIDGE_HEIGHT_OFFSET * endRamp;
  }

  // 4) Foreground Lakeside Wooden Dock (lx in [-18.0, 8.0], lz in [82.0, 90.0]) & West Wooden Jetty (lx in [-23.5, -16.5], lz in [67.0, 73.5])
  if (
    (lx >= -18.0 && lx <= 8.0 && lz >= 82.0 && lz <= 90.0) ||
    (lx >= -23.5 && lx <= -16.5 && lz >= 67.0 && lz <= 73.5)
  ) {
    return SOUTHERN_MINE_POS.cavernFloorY + DOCK_PIER_HEIGHT_OFFSET;
  }

  // 5) Carved 1.9m-deep Swimmable Bioluminescent Turquoise Lagoon Basin
  if (isInsideSouthernMineLagoonBasin(lx, lz)) {
    const normX = (lx - -7.0) / 12.5;
    const normZ = (lz - 63.0) / 19.0;
    const lakeRad = Math.min(1.0, Math.hypot(normX, normZ));
    const depthFactor = Math.max(0.25, Math.min(1, (1.0 - lakeRad) * 2.4));
    return SOUTHERN_MINE_POS.cavernFloorY - depthFactor * CRYSTAL_LAKE_DEPTH;
  }

  return SOUTHERN_MINE_POS.cavernFloorY;
}
// #endregion

// ======================== MINE BOUNDARY QUERIES ======================== \\
// #region Mine Boundary Queries
/**
 * Summary: Determines whether a given 3D coordinate falls within the subterranean volumes of the Southern Dwarven Mine.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @param currentY Height of the asker, to choose between stacked floors (optional).
 * @returns True inside the mine tunnels or grand cavern.
 */
export function isInsideSouthernMine(x: number, z: number, currentY?: number): boolean {
  const mineFloorY = southernMineFloorHeightAt(z);
  const ceilingMargin = z > SOUTHERN_MINE_POS.shaftEndZ - 1.0 ? 12.2 : 5.4;
  if (currentY !== undefined && currentY > mineFloorY + ceilingMargin) {
    return false;
  }
  const lx = x - SOUTHERN_MINE_POS.x;
  const lz = z - SOUTHERN_MINE_POS.entranceZ;

  // Main entrance tunnel shaft (lx in [-3.4, 3.4], lz in [-1.2, 34.5])
  if (Math.abs(lx) <= SOUTHERN_MINE_POS.tunnelHalfW && lz >= -1.2 && lz <= 34.5) {
    return true;
  }
  // Grand Subterranean Cavern (lx in [-48.0, 48.0], lz in [34.0, 95.5])
  if (Math.abs(lx) <= 48.0 && lz >= 34.0 && lz <= 95.5) {
    return true;
  }
  return false;
}
// #endregion
