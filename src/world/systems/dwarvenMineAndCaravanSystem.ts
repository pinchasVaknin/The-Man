// ============================================================================
// MODULE: World / Systems / Dwarven Mine And Caravan
// DESIGN: Deterministic daily schedule, pathing waypoints, and mine height queries (SRP)
// SUMMARY: Schedules the 8 Dwarven Miners through sunrise commute, cavern work,
//          sunset return, and hearth rest, while providing terrain elevation for mine geometry.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { DwarvenMinerCaravanState } from '../domain/worldTypes';
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

interface MinerStationConfig {
  readonly nameHe: string;
  readonly houseIdx: number;
  readonly homeOffsetX: number;
  readonly homeOffsetZ: number;
  readonly laneOffsetX: number;
  readonly workLocalX: number;
  readonly workLocalZ: number;
  readonly workYaw: number;
}

const DWARVEN_MINER_STATIONS: readonly MinerStationConfig[] = [
  // Room 1 (Central Junction Hall) ore veins
  { nameHe: 'דורין חוצב הסלע', houseIdx: 0, homeOffsetX: -1.6, homeOffsetZ: -1.4, laneOffsetX: -1.25, workLocalX: -8.2, workLocalZ: 41.5, workYaw: Math.PI / 2 },
  { nameHe: 'באלין זקן־הברזל', houseIdx: 1, homeOffsetX: 1.6, homeOffsetZ: -1.4, laneOffsetX: 1.25, workLocalX: 8.2, workLocalZ: 42.5, workYaw: -Math.PI / 2 },
  // Room 2 (West Crystal Lake Chamber) crystal veins
  { nameHe: 'דואלין מקבת־הגרניט', houseIdx: 0, homeOffsetX: -1.6, homeOffsetZ: 1.4, laneOffsetX: -1.25, workLocalX: -30.5, workLocalZ: 49.0, workYaw: Math.PI / 2 },
  { nameHe: 'גלוין להב־הזהב', houseIdx: 2, homeOffsetX: -1.6, homeOffsetZ: -1.4, laneOffsetX: 1.25, workLocalX: -30.5, workLocalZ: 56.5, workYaw: Math.PI / 2 },
  // Room 3 (East Dwarven Smelting Foundry) anvils & furnace ore
  { nameHe: 'אואין חרש־הלהבה', houseIdx: 1, homeOffsetX: 1.6, homeOffsetZ: 1.4, laneOffsetX: -1.25, workLocalX: 33.5, workLocalZ: 49.0, workYaw: -Math.PI / 2 },
  { nameHe: 'ביפור כורה־העומק', houseIdx: 3, homeOffsetX: 1.6, homeOffsetZ: -1.4, laneOffsetX: 1.25, workLocalX: 35.5, workLocalZ: 60.0, workYaw: 0 },
  // Room 4 (Deep South Royal Treasure Vault) dragon-gold veins
  { nameHe: 'בופור שומר־האוצר', houseIdx: 2, homeOffsetX: -1.6, homeOffsetZ: 1.4, laneOffsetX: -1.25, workLocalX: -9.5, workLocalZ: 88.0, workYaw: Math.PI / 2 },
  { nameHe: 'בומבור פטיש־האבן', houseIdx: 3, homeOffsetX: 1.6, homeOffsetZ: 1.4, laneOffsetX: 1.25, workLocalX: 9.5, workLocalZ: 88.0, workYaw: -Math.PI / 2 },
];
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
/**
 * Summary: Pure deterministic scheduler for the 8 LOTR-style Dwarven Miners.
 */
export function computeDwarvenMinerCaravanState(
  worldHours: number,
  dwarfIndex: number,
  animTimeSec = 0
): DwarvenMinerCaravanState {
  const idx = ((dwarfIndex % DWARVEN_MINERS_COUNT) + DWARVEN_MINERS_COUNT) % DWARVEN_MINERS_COUNT;
  const station = DWARVEN_MINER_STATIONS[idx];
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
      nameHe: station.nameHe,
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
      nameHe: station.nameHe,
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
    const reversedWaypoints = [...waypointsToMine].reverse();
    const pt = interpolateDwarvenCaravanWaypoints(reversedWaypoints, uForward);
    const isMoving = uForward > 0.001 && uForward < 0.999;
    return {
      dwarfIndex: idx,
      nameHe: station.nameHe,
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
    nameHe: station.nameHe,
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
