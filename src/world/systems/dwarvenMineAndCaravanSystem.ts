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

/** Summary: Catwalk vertical & depth constants */
const CATWALK_STAIR_START_LZ = 35.5;
const CATWALK_STAIR_END_LZ = 44.5;
const CATWALK_STAIR_SPAN = CATWALK_STAIR_END_LZ - CATWALK_STAIR_START_LZ;
const DOCK_PIER_HEIGHT_OFFSET = 0.14;
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
  // Room 1 (Central Junction Hall) West & East rock wall ore veins + Minecart loading
  {
    name: t('dwarven.miners.durin'),
    houseIdx: 0,
    homeOffsetX: -1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: -1.25,
    workLocalX: -11.4,
    workLocalZ: 41.5,
    workYaw: Math.PI / 2,
    rockLocalX: -12.75,
    rockLocalZ: 41.5,
    rockRadius: 1.15,
    oreKind: 'gold',
    pairedCartIdx: 0,
    cartLoadLocalX: -1.15,
    cartLoadLocalZ: 41.5,
    cartLoadYaw: -Math.PI / 2,
  },
  {
    name: t('dwarven.miners.balin'),
    houseIdx: 1,
    homeOffsetX: 1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: 11.4,
    workLocalZ: 42.5,
    workYaw: -Math.PI / 2,
    rockLocalX: 12.75,
    rockLocalZ: 42.5,
    rockRadius: 1.15,
    oreKind: 'emerald',
    pairedCartIdx: 1,
    cartLoadLocalX: 8.5,
    cartLoadLocalZ: 47.75,
    cartLoadYaw: Math.PI,
  },
  // Room 2 (West Crystal Lake Chamber) East rock partition sapphire & amethyst veins
  {
    name: t('dwarven.miners.dwalin'),
    houseIdx: 0,
    homeOffsetX: -1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: -27.8,
    workLocalZ: 41.5,
    workYaw: -Math.PI / 2,
    rockLocalX: -26.5,
    rockLocalZ: 41.5,
    rockRadius: 1.15,
    oreKind: 'sapphire',
    pairedCartIdx: 2,
    cartLoadLocalX: -28.0,
    cartLoadLocalZ: 47.75,
    cartLoadYaw: Math.PI,
  },
  {
    name: t('dwarven.miners.gloin'),
    houseIdx: 2,
    homeOffsetX: -1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: -27.8,
    workLocalZ: 56.5,
    workYaw: -Math.PI / 2,
    rockLocalX: -26.5,
    rockLocalZ: 56.5,
    rockRadius: 1.15,
    oreKind: 'amethyst',
  },
  // Room 3 (East Dwarven Smelting Foundry) West rock wall vein & Blast-Furnace ore boulder
  {
    name: t('dwarven.miners.oin'),
    houseIdx: 1,
    homeOffsetX: 1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: 27.8,
    workLocalZ: 42.5,
    workYaw: Math.PI / 2,
    rockLocalX: 26.5,
    rockLocalZ: 42.5,
    rockRadius: 1.15,
    oreKind: 'gold',
    pairedCartIdx: 3,
    cartLoadLocalX: 31.3,
    cartLoadLocalZ: 43.5,
    cartLoadYaw: -Math.PI / 2,
  },
  {
    name: t('dwarven.miners.bifur'),
    houseIdx: 3,
    homeOffsetX: 1.6,
    homeOffsetZ: -1.4,
    laneOffsetX: 1.25,
    workLocalX: 38.2,
    workLocalZ: 64.5,
    workYaw: -Math.PI / 2,
    rockLocalX: 39.6,
    rockLocalZ: 64.5,
    rockRadius: 1.25,
    oreKind: 'gold',
    pairedCartIdx: 4,
    cartLoadLocalX: 33.7,
    cartLoadLocalZ: 65.5,
    cartLoadYaw: Math.PI / 2,
  },
  // Room 4 (Deep South Royal Treasure Vault) West & East dragon-gold wall veins
  {
    name: t('dwarven.miners.bofur'),
    houseIdx: 2,
    homeOffsetX: -1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: -1.25,
    workLocalX: -13.8,
    workLocalZ: 88.0,
    workYaw: Math.PI / 2,
    rockLocalX: -15.15,
    rockLocalZ: 88.0,
    rockRadius: 1.2,
    oreKind: 'gold',
    pairedCartIdx: 5,
    cartLoadLocalX: -1.15,
    cartLoadLocalZ: 88.0,
    cartLoadYaw: -Math.PI / 2,
  },
  {
    name: t('dwarven.miners.bombur'),
    houseIdx: 3,
    homeOffsetX: 1.6,
    homeOffsetZ: 1.4,
    laneOffsetX: 1.25,
    workLocalX: 13.8,
    workLocalZ: 88.0,
    workYaw: -Math.PI / 2,
    rockLocalX: 15.15,
    rockLocalZ: 88.0,
    rockRadius: 1.2,
    oreKind: 'sapphire',
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
  // Cart 0: Room 1 North Central Track (loads from Durin at z=41.5, hauls South to z=57.5)
  {
    id: 'minecart-central-north',
    startLocalX: 0,
    startLocalZ: 41.5,
    endLocalX: 0,
    endLocalZ: 57.5,
    yaw: 0,
    cycleDuration: 22.0,
    phaseOffset: 0.0,
    oreKind: 'gold',
  },
  // Cart 1: East Cross-Corridor Track (loads from Balin at x=8.5, z=49.0, hauls East into Room 3 Foundry at x=28.5, z=49.0)
  {
    id: 'minecart-east-corridor',
    startLocalX: 8.5,
    startLocalZ: 49.0,
    endLocalX: 28.5,
    endLocalZ: 49.0,
    yaw: Math.PI / 2,
    cycleDuration: 24.0,
    phaseOffset: 0.35,
    oreKind: 'emerald',
  },
  // Cart 2: West Cross-Corridor Track (loads from Dwalin at x=-28.0, z=49.0, hauls East into Room 1 at x=-8.5, z=49.0)
  {
    id: 'minecart-west-corridor',
    startLocalX: -28.0,
    startLocalZ: 49.0,
    endLocalX: -8.5,
    endLocalZ: 49.0,
    yaw: Math.PI / 2,
    cycleDuration: 25.0,
    phaseOffset: 0.65,
    oreKind: 'sapphire',
  },
  // Cart 3: Room 3 Foundry North Track (loads from Oin at x=32.5, z=43.5, hauls South to Blast Furnace 1 at x=32.5, z=58.5)
  {
    id: 'minecart-foundry-north',
    startLocalX: 32.5,
    startLocalZ: 43.5,
    endLocalX: 32.5,
    endLocalZ: 58.5,
    yaw: 0,
    cycleDuration: 21.0,
    phaseOffset: 0.18,
    oreKind: 'gold',
  },
  // Cart 4: Room 3 Foundry South Track (loads from Bifur at x=32.5, z=65.5, hauls South to Blast Furnace 2 at x=32.5, z=84.5)
  {
    id: 'minecart-foundry-south',
    startLocalX: 32.5,
    startLocalZ: 65.5,
    endLocalX: 32.5,
    endLocalZ: 84.5,
    yaw: 0,
    cycleDuration: 23.0,
    phaseOffset: 0.52,
    oreKind: 'emerald',
  },
  // Cart 5: Deep South Vault Track (loads from Bofur at x=0, z=88.0, hauls North/South to Royal Treasury at x=0, z=98.5)
  {
    id: 'minecart-vault-south',
    startLocalX: 0,
    startLocalZ: 88.0,
    endLocalX: 0,
    endLocalZ: 98.5,
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

  // Phase breakdown:
  // [0.00 .. 0.24]: Parked at start station while Dwarf loads ore into the cart
  // [0.24 .. 0.52]: Rolling smoothly along iron rails from start -> end
  // [0.52 .. 0.68]: Parked at end station unloading into smelter/vault
  // [0.68 .. 1.00]: Rolling smoothly back along iron rails from end -> start
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
  const midCorridorZ = SOUTHERN_MINE_POS.entranceZ + 49.0;

  const waypointsToMine: [number, number, number][] = [
    [homeX, homeY, homeZ],
    [doorStepX, house.terraceY, doorStepZ],
    [roadX, house.terraceY, house.z + 3.0],
    [roadX, SOUTHERN_MINE_POS.entranceFloorY, SOUTHERN_MINE_POS.entranceZ - 10.0],
    [roadX, SOUTHERN_MINE_POS.entranceFloorY, SOUTHERN_MINE_POS.shaftStartZ],
    [roadX, SOUTHERN_MINE_POS.cavernFloorY, SOUTHERN_MINE_POS.shaftEndZ + 4.0],
  ];

  if (Math.abs(station.workLocalX) > 20.0) {
    waypointsToMine.push([roadX, workY, midCorridorZ]);
    waypointsToMine.push([
      SOUTHERN_MINE_POS.x + Math.sign(station.workLocalX) * 29.0,
      workY,
      midCorridorZ,
    ]);
  } else if (station.workLocalZ > 70.0) {
    waypointsToMine.push([SOUTHERN_MINE_POS.x + station.laneOffsetX * 0.8, workY, SOUTHERN_MINE_POS.entranceZ + 78.5]);
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

  // 1) Room 1 Walkable Timber Staircase ascending from cavernFloorY to catwalkY along lx in [-12.5, -9.3]
  if (lx >= -12.5 && lx <= -9.3 && lz >= CATWALK_STAIR_START_LZ && lz <= CATWALK_STAIR_END_LZ) {
    const tStair = Math.max(0, Math.min(1, (lz - CATWALK_STAIR_START_LZ) / CATWALK_STAIR_SPAN));
    const stairH =
      SOUTHERN_MINE_POS.cavernFloorY +
      tStair * (SOUTHERN_MINE_POS.catwalkY - SOUTHERN_MINE_POS.cavernFloorY);
    if (currentY === undefined || currentY <= stairH + 2.2) {
      return stairH;
    }
  }

  // 2) Room 1 Elevated Timber Catwalk Ring & Cross-Bridge at y = catwalkY
  const onWestCatwalk = lx >= -13.6 && lx <= -9.0 && lz >= 44.5 && lz <= 63.0;
  const onSouthBridge = lx >= -13.6 && lx <= 13.6 && lz >= 58.5 && lz <= 63.0;
  const onEastCatwalk = lx >= 9.0 && lx <= 13.6 && lz >= 44.5 && lz <= 63.0;
  if (
    (onWestCatwalk || onSouthBridge || onEastCatwalk) &&
    currentY !== undefined &&
    currentY >= SOUTHERN_MINE_POS.catwalkY - 1.6
  ) {
    return SOUTHERN_MINE_POS.catwalkY;
  }

  // 3) Room 2 (West Chamber): Miner's Wooden Dock Pier jutting over the Underground Crystal Lake
  if (lx >= -39.5 && lx <= -31.5 && lz >= 61.5 && lz <= 66.5) {
    return SOUTHERN_MINE_POS.cavernFloorY + DOCK_PIER_HEIGHT_OFFSET;
  }

  // 4) Room 2 (West Chamber): Carved 1.9m-deep Swimmable Bioluminescent Crystal Lake Basin
  if (lx >= -50.0 && lx <= -33.0 && lz >= 41.0 && lz <= 84.0) {
    const lakeNormX = (lx - -41.5) / 8.5;
    const lakeNormZ = (lz - 62.5) / 21.5;
    const lakeRad = Math.hypot(lakeNormX, lakeNormZ);
    if (lakeRad < 1.0) {
      const depthFactor = Math.max(0, Math.min(1, (1.0 - lakeRad) * 2.2));
      return SOUTHERN_MINE_POS.cavernFloorY - depthFactor * CRYSTAL_LAKE_DEPTH;
    }
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
 * @returns True inside the mine tunnels or halls.
 */
export function isInsideSouthernMine(x: number, z: number, currentY?: number): boolean {
  const mineFloorY = southernMineFloorHeightAt(z);
  const ceilingMargin = z > SOUTHERN_MINE_POS.shaftEndZ - 1.0 ? 11.8 : 5.2;
  if (currentY !== undefined && currentY > mineFloorY + ceilingMargin) {
    return false;
  }
  const lx = x - SOUTHERN_MINE_POS.x;
  const lz = z - SOUTHERN_MINE_POS.entranceZ;

  // Main entrance tunnel
  if (Math.abs(lx) <= SOUTHERN_MINE_POS.tunnelHalfW && lz >= -1.2 && lz <= 34.5) {
    return true;
  }
  // Room 1 (Central Junction Hall)
  if (Math.abs(lx) <= 14.0 && lz >= 34.0 && lz <= 64.0) {
    return true;
  }
  // Connector to West Room 2
  if (lx >= -26.5 && lx <= -13.5 && lz >= 45.0 && lz <= 53.0) {
    return true;
  }
  // Room 2 (West Crystal Lake Chamber)
  if (lx >= -52.0 && lx <= -26.0 && lz >= 36.0 && lz <= 96.0) {
    return true;
  }
  // Connector to East Room 3
  if (lx >= 13.5 && lx <= 26.5 && lz >= 45.0 && lz <= 53.0) {
    return true;
  }
  // Room 3 (East Dwarven Smelting Foundry)
  if (lx >= 26.0 && lx <= 52.0 && lz >= 36.0 && lz <= 96.0) {
    return true;
  }
  // Deep South connector shaft
  if (Math.abs(lx) <= 4.5 && lz >= 63.5 && lz <= 78.5) {
    return true;
  }
  // Guard towers before Treasury
  if (
    ((lx >= -26.5 && lx <= -15.5) || (lx >= 15.5 && lx <= 26.5)) &&
    lz >= 85.0 &&
    lz <= 93.0
  ) {
    return true;
  }
  // Room 4 (Deep South Royal Treasure Vault)
  if (Math.abs(lx) <= 16.0 && lz >= 78.0 && lz <= 110.0) {
    return true;
  }
  return false;
}
// #endregion
