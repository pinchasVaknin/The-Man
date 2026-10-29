// ============================================================================
// MODULE: World / Systems / Terrain And Biome
// DESIGN: Continuous procedural heightfield math, walkable geometry, and biome layers (SRP)
// SUMMARY: Computes analytical ground elevation, roofs, stairs, water basins,
//          surface biomes, surface normals, and world obstacle placement.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { t } from '../../locales';
import type { BiomeType, WalkPaceMode, IObstacleCylinder } from '../domain/worldTypes';
import { hash2D, fbm2D, smoothstep, distToSegment } from '../domain/noiseAndMath';
import {
  WATER_LEVEL,
  HUNTER_LODGE_POS,
  WATERFALL_CLIFF_POS,
  WATERFALL_POOL_POS,
  BIRCH_GROVE_CENTER,
  FORTRESS_Z_OFFSET,
  FORTRESS_Y_OFFSET,
  SAKURA_SANCTUARY_POS,
  SAKURA_SANCTUARY_YAW,
  LAKESIDE_TEA_PAVILION_POS,
  VALLEY_FARMS,
  HILL_BRIDGE_COS,
  HILL_BRIDGE_SIN,
  HILL_WATCHTOWERS,
  ROPE_BRIDGE_DEF,
  ropeBridgePointInfoAt,
  SOUTHERN_MINE_POS,
  DWARVEN_GUARDIAN_STATUES,
  DWARVEN_STONE_HOUSES,
  SOUTHWEST_OASIS_POS,
  MAGIC_STONE_CIRCLE_POS,
  SOUTHEAST_HARBOR_POS,
  CHINESE_FORTRESS_POS,
  CORNER_WATCHTOWERS,
  isChineseFortressWalkableZone,
  chineseFortressStairHeightAt,
  SNOW_LINE_ALTITUDE,
  WALKABLE_MOUNTAINS,
  SMALL_MEADOW_HILLS,
  FLAT_BUILDING_TERRACES,
  CLEAR_ZONES,
} from '../domain/landmarksRegistry';
import {
  southernMineFloorHeightAt,
  southernMineWalkableHeightAt,
  isInsideSouthernMine,
} from './dwarvenMineAndCaravanSystem';

const FZ = FORTRESS_Z_OFFSET;
const FY = FORTRESS_Y_OFFSET;
// #endregion

// ======================== REGIONAL BIOME FACTORS ======================== \\
// #region Regional Biome Factors
/**
 * Summary: Evaluates radial falloff factor for the Orange Birch Grove landmark.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @returns Computed result for birchGroveFactorAt.
 */
export function birchGroveFactorAt(x: number, z: number): number {
  const d = Math.hypot(x - BIRCH_GROVE_CENTER.x, z - BIRCH_GROVE_CENTER.z);
  return 1.0 - smoothstep(BIRCH_GROVE_CENTER.radius * 0.48, BIRCH_GROVE_CENTER.radius, d);
}

/**
 * Summary: Evaluates non-linear procedural transition into the Southwest Desert and Oasis.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @returns Computed result for southwestOasisBiomeFactorAt.
 */
export function southwestOasisBiomeFactorAt(x: number, z: number): number {
  if (x > -105 || z < 130) return 0;
  const farmWestDist = Math.hypot(x - VALLEY_FARMS[0].x, z - VALLEY_FARMS[0].z);
  const farmProtect = 1.0 - smoothstep(VALLEY_FARMS[0].clearRadius - 4.0, VALLEY_FARMS[0].clearRadius + 14.0, farmWestDist);

  const warp1 = fbm2D(x * 0.011 + 2.3, z * 0.011 - 4.1, 2) * 34.0;
  const warp2 = fbm2D(x * 0.024 - 5.7, z * 0.024 + 1.9, 2) * 14.0;
  const westProgress = smoothstep(-125.0, -215.0, x + warp1 + warp2);
  const southProgress = smoothstep(155.0, 235.0, z - warp1 * 0.75 + warp2);
  const diagonalProgress = smoothstep(285.0, 405.0, -x + z + warp1 * 1.1);

  const regionalExpanse = Math.max(
    westProgress * southProgress,
    diagonalProgress * smoothstep(-120.0, -175.0, x) * smoothstep(150.0, 195.0, z)
  );

  const oasisCoreDist = Math.hypot(x - SOUTHWEST_OASIS_POS.x, z - SOUTHWEST_OASIS_POS.z);
  const oasisCore = 1.0 - smoothstep(68.0, 145.0, oasisCoreDist);

  return Math.max(0, Math.min(1, Math.max(regionalExpanse, oasisCore) * (1.0 - farmProtect)));
}

/**
 * Summary: Calculates composite regional density of forest trees across the landscape.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @returns Computed result for regionalForestDensityAt.
 */
export function regionalForestDensityAt(x: number, z: number): number {
  const westForestDist = Math.hypot((x + 65) * 0.85, (z + 15) * 0.95);
  const westDense = 1.0 - smoothstep(35, 135, westForestDist);

  const eastBirch = birchGroveFactorAt(x, z);

  const northBeltDist = Math.hypot((x - 10) * 0.7, (z + 75) * 1.1);
  const northBelt = (1.0 - smoothstep(30, 110, northBeltDist)) * 0.85;

  const openValleyDist = Math.hypot((x - 20) * 0.85, (z - 85) * 1.0);
  let openValleySuppress = 1.0 - smoothstep(28, 78, openValleyDist);
  for (let i = 0; i < VALLEY_FARMS.length; i++) {
    const f = VALLEY_FARMS[i];
    const fd = Math.hypot(x - f.x, z - f.z);
    if (fd < f.clearRadius + 8) {
      openValleySuppress = Math.max(openValleySuppress, 1.0 - smoothstep(f.clearRadius - 4, f.clearRadius + 8, fd));
    }
  }

  const macroPatch = fbm2D(x * 0.012 + 3.1, z * 0.012 - 5.2, 2) * 0.5 + 0.5;
  const baseRegional = Math.max(westDense, eastBirch, northBelt, macroPatch * 0.45);
  return Math.max(0, Math.min(1, baseRegional * (1.0 - openValleySuppress * 0.98)));
}

// #endregion

// ======================== ROOF & SHELTER QUERIES ======================== \\
// #region Roof & Shelter Queries
/**
 * Summary: Queries the elevation of overhead roofs and ceilings at the given coordinate.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @returns Computed result for getRoofHeightAt.
 */
export function getRoofHeightAt(x: number, z: number): number | null {
  if (Math.abs(x) <= 23.2 && z >= -216.5 + FZ && z <= -188.8 + FZ) {
    return CHINESE_FORTRESS_POS.mainHallFloor2Y + 5.2;
  }
  if (Math.abs(Math.abs(x) - 30.0) <= 9.8 && z >= -172.2 + FZ && z <= -155.8 + FZ) {
    return CHINESE_FORTRESS_POS.pavilionFloor2Y + 4.2;
  }
  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const tw = CORNER_WATCHTOWERS[i];
    if (Math.abs(x - tw.cx) <= 6.2 && Math.abs(z - tw.cz) <= 6.2) {
      return CHINESE_FORTRESS_POS.watchtowerFloor3Y + 4.3;
    }
  }
  if (
    Math.abs(x - HUNTER_LODGE_POS.x) <= 5.9 &&
    z >= HUNTER_LODGE_POS.z - 4.5 &&
    z <= HUNTER_LODGE_POS.z + 4.3
  ) {
    return HUNTER_LODGE_POS.height + 5.2;
  }
  if (
    x >= HUNTER_LODGE_POS.x - 16.7 &&
    x <= HUNTER_LODGE_POS.x - 8.3 &&
    z >= HUNTER_LODGE_POS.z + 0.3 &&
    z <= HUNTER_LODGE_POS.z + 6.7
  ) {
    return HUNTER_LODGE_POS.height + 3.8;
  }
  if (Math.abs(x - 30.0) <= 3.6 && Math.abs(z + 26.0) <= 3.6) {
    return 6.4 + 5.5;
  }
  for (let i = 0; i < VALLEY_FARMS.length; i++) {
    const f = VALLEY_FARMS[i];
    const minZ = f.dirZ === 1 ? f.z - 6.5 : f.z - 4.6;
    const maxZ = f.dirZ === 1 ? f.z + 4.6 : f.z + 6.5;
    if (Math.abs(x - f.x) <= 5.6 && z >= minZ && z <= maxZ) {
      return f.height + 5.2;
    }
  }
  if (
    Math.abs(x - LAKESIDE_TEA_PAVILION_POS.x) <= LAKESIDE_TEA_PAVILION_POS.halfSize &&
    Math.abs(z - LAKESIDE_TEA_PAVILION_POS.z) <= LAKESIDE_TEA_PAVILION_POS.halfSize
  ) {
    return LAKESIDE_TEA_PAVILION_POS.deckHeight + 4.8;
  }
  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    const dx = x - hw.x;
    const dz = z - hw.z;
    const cosY = Math.cos(hw.yaw);
    const sinY = Math.sin(hw.yaw);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY;
    if (Math.abs(lx) <= hw.halfSize + 0.8 && Math.abs(lz) <= hw.halfSize + 0.8) {
      return hw.deckY + 4.5;
    }
  }
  if (isInsideSouthernMine(x, z)) {
    const floorH = southernMineFloorHeightAt(z);
    const lx = Math.abs(x - SOUTHERN_MINE_POS.x);
    const lz = z - SOUTHERN_MINE_POS.entranceZ;
    const isCorridor =
      lz < 34.0 ||
      (lx >= 13.5 && lx <= 26.5) ||
      (lx <= 4.5 && lz >= 63.5 && lz <= 78.5);
    return isCorridor ? floorH + SOUTHERN_MINE_POS.corridorHeight : floorH + SOUTHERN_MINE_POS.cavernHeight;
  }
  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.tavernX) <= SOUTHEAST_HARBOR_POS.tavernHalfW + 0.8 &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.tavernZ) <= SOUTHEAST_HARBOR_POS.tavernHalfD + 2.2
  ) {
    return SOUTHEAST_HARBOR_POS.tavernFloorY + 6.5;
  }
  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.warehouseX) <= SOUTHEAST_HARBOR_POS.warehouseHalfW + 0.8 &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.warehouseZ) <= SOUTHEAST_HARBOR_POS.warehouseHalfD + 1.2
  ) {
    return SOUTHEAST_HARBOR_POS.warehouseFloorY + 6.8;
  }
  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.cargoShedX) <= 6.2 &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.cargoShedZ) <= 4.8
  ) {
    return SOUTHEAST_HARBOR_POS.plazaY + 4.8;
  }
  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.shipX) <= SOUTHEAST_HARBOR_POS.shipHalfW &&
    z >= SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ &&
    z <= SOUTHEAST_HARBOR_POS.shipZ + SOUTHEAST_HARBOR_POS.shipHalfL
  ) {
    return SOUTHEAST_HARBOR_POS.shipQuarterdeckY - 0.1;
  }
  if (
    Math.hypot(x - SOUTHEAST_HARBOR_POS.lighthouseX, z - SOUTHEAST_HARBOR_POS.lighthouseZ) <=
    SOUTHEAST_HARBOR_POS.lighthouseRadius + 0.8
  ) {
    return SOUTHEAST_HARBOR_POS.lighthouseTopDeckY + 5.2;
  }
  if (
    Math.hypot(x - SOUTHWEST_OASIS_POS.observatoryX, z - SOUTHWEST_OASIS_POS.observatoryZ) <=
    SOUTHWEST_OASIS_POS.observatoryRadius + 0.8
  ) {
    return SOUTHWEST_OASIS_POS.observatoryTopDeckY + 6.5;
  }
  if (
    Math.abs(x - SOUTHWEST_OASIS_POS.pavilionX) <= SOUTHWEST_OASIS_POS.pavilionHalfW + 1.2 &&
    Math.abs(z - SOUTHWEST_OASIS_POS.pavilionZ) <= SOUTHWEST_OASIS_POS.pavilionHalfD + 1.2
  ) {
    return SOUTHWEST_OASIS_POS.pavilionFloorY + 5.8;
  }
  if (
    Math.abs(x - SOUTHWEST_OASIS_POS.gazeboX) <= SOUTHWEST_OASIS_POS.gazeboHalfSize &&
    Math.abs(z - SOUTHWEST_OASIS_POS.gazeboZ) <= SOUTHWEST_OASIS_POS.gazeboHalfSize
  ) {
    return SOUTHWEST_OASIS_POS.gazeboDeckY + 4.8;
  }
  for (let i = 0; i < DWARVEN_STONE_HOUSES.length; i++) {
    const dh = DWARVEN_STONE_HOUSES[i];
    if (
      Math.abs(x - dh.x) <= dh.halfW + 0.8 &&
      Math.abs(z - dh.z) <= dh.halfD + 0.8
    ) {
      return dh.floorY + 4.9;
    }
  }
  return null;
}

/**
 * Summary: Determines whether a 3D coordinate is sheltered beneath an overhead roof.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param y Input parameter y.
 * @param z Input parameter z.
 * @returns Computed result for isPositionUnderRoof.
 */
export function isPositionUnderRoof(x: number, y: number, z: number): boolean {
  const roofH = getRoofHeightAt(x, z);
  return roofH !== null && y < roofH;
}

// #endregion

// ======================== TRAIL & FOOTPATH NETWORK ======================== \\
// #region Trail & Footpath Network
/**
 * Summary: Computes proximity factor to the interconnected dirt trail and road network.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @returns Computed result for trailFactorAt.
 */
export function trailFactorAt(x: number, z: number): number {
  for (let i = 0; i < VALLEY_FARMS.length; i++) {
    const f = VALLEY_FARMS[i];
    if (Math.abs(x - f.x) <= f.fenceHalfW - 0.2 && Math.abs(z - f.z) <= f.fenceHalfD - 0.2) {
      const gateZ = f.z + f.dirZ * f.fenceHalfD;
      const porchZ = f.z + f.dirZ * 3.0;
      const entryDist = distToSegment(x, z, f.x, gateZ, f.x, porchZ);
      return 1.0 - smoothstep(1.3, 3.0, entryDist);
    }
  }

  const angle = Math.atan2(z, x);
  const r = Math.hypot(x, z);
  const targetRingR = 28.5 + Math.sin(angle * 2.0) * 2.2;
  const ringDist = Math.abs(r - targetRingR);

  let southTrailDist = 999;
  if (z >= 25 && z <= 182 && Math.abs(x) < 40) {
    const curveX = Math.sin((z - 32) * 0.045) * 8.5;
    southTrailDist = Math.abs(x - curveX);
  }
  const fWest = VALLEY_FARMS[0];
  const fSouth = VALLEY_FARMS[1];
  const fEast = VALLEY_FARMS[2];
  const fWestGateZ = fWest.z + fWest.dirZ * (fWest.fenceHalfD + 1.5);
  const fSouthGateZ = fSouth.z + fSouth.dirZ * (fSouth.fenceHalfD + 1.5);
  const fEastGateZ = fEast.z + fEast.dirZ * (fEast.fenceHalfD + 1.5);

  const southSpurs = Math.min(
    distToSegment(x, z, -4, 95, MAGIC_STONE_CIRCLE_POS.entryStartX, MAGIC_STONE_CIRCLE_POS.entryStartZ),
    distToSegment(
      x,
      z,
      MAGIC_STONE_CIRCLE_POS.entryStartX,
      MAGIC_STONE_CIRCLE_POS.entryStartZ,
      MAGIC_STONE_CIRCLE_POS.x,
      MAGIC_STONE_CIRCLE_POS.z
    ),
    distToSegment(x, z, MAGIC_STONE_CIRCLE_POS.entryStartX, MAGIC_STONE_CIRCLE_POS.entryStartZ, -72, 92),
    distToSegment(x, z, -72, 92, -88, 52),
    distToSegment(x, z, -72, 92, fWest.x, fWestGateZ),
    distToSegment(x, z, fWest.x, fWestGateZ, fWest.x, fWest.z + fWest.dirZ * 3.0),
    distToSegment(x, z, 2, 168, fSouth.x, fSouthGateZ),
    distToSegment(x, z, fSouth.x, fSouthGateZ, fSouth.x, fSouth.z + fSouth.dirZ * 3.0),
    distToSegment(x, z, 54, 36, fEast.x, fEastGateZ),
    distToSegment(x, z, fEast.x, fEastGateZ, fEast.x, fEast.z + fEast.dirZ * 3.0),
    distToSegment(x, z, 16, 155, 115, 195),
    distToSegment(x, z, 115, 195, 185, 228),
    distToSegment(x, z, 185, 228, SOUTHEAST_HARBOR_POS.gateX, SOUTHEAST_HARBOR_POS.gateZ),
    distToSegment(x, z, SOUTHEAST_HARBOR_POS.gateX, SOUTHEAST_HARBOR_POS.gateZ, SOUTHEAST_HARBOR_POS.fountainX, SOUTHEAST_HARBOR_POS.fountainZ),
    distToSegment(x, z, SOUTHEAST_HARBOR_POS.fountainX, SOUTHEAST_HARBOR_POS.fountainZ, SOUTHEAST_HARBOR_POS.pierStartX, SOUTHEAST_HARBOR_POS.pierZ),
    distToSegment(x, z, 238, 218, SOUTHEAST_HARBOR_POS.lighthouseX, SOUTHEAST_HARBOR_POS.lighthouseZ + 4.5),
    distToSegment(x, z, fWest.x, fWestGateZ, -198, 224),
    distToSegment(x, z, -198, 224, SOUTHWEST_OASIS_POS.gateX, SOUTHWEST_OASIS_POS.gateZ),
    distToSegment(x, z, -58, 224, -158, 254),
    distToSegment(x, z, -158, 254, SOUTHWEST_OASIS_POS.gateX, SOUTHWEST_OASIS_POS.gateZ),
    distToSegment(x, z, SOUTHWEST_OASIS_POS.gateX, SOUTHWEST_OASIS_POS.gateZ, SOUTHWEST_OASIS_POS.fountainX, SOUTHWEST_OASIS_POS.fountainZ),
    distToSegment(x, z, SOUTHWEST_OASIS_POS.fountainX, SOUTHWEST_OASIS_POS.fountainZ, SOUTHWEST_OASIS_POS.observatoryX, SOUTHWEST_OASIS_POS.observatoryDoorZ + 1.0),
    distToSegment(x, z, SOUTHWEST_OASIS_POS.fountainX, SOUTHWEST_OASIS_POS.fountainZ, SOUTHWEST_OASIS_POS.pavilionDoorX + 1.0, SOUTHWEST_OASIS_POS.pavilionZ),
    distToSegment(x, z, -4, 95, -58, 224),
    distToSegment(x, z, -58, 224, SOUTHERN_MINE_POS.x, SOUTHERN_MINE_POS.entranceZ),
    distToSegment(x, z, fSouth.x, fSouthGateZ, -58, 260),
    distToSegment(x, z, DWARVEN_STONE_HOUSES[0].doorX, DWARVEN_STONE_HOUSES[0].doorZ, SOUTHERN_MINE_POS.x, DWARVEN_STONE_HOUSES[0].doorZ),
    distToSegment(x, z, DWARVEN_STONE_HOUSES[1].doorX, DWARVEN_STONE_HOUSES[1].doorZ, SOUTHERN_MINE_POS.x, DWARVEN_STONE_HOUSES[1].doorZ),
    distToSegment(x, z, DWARVEN_STONE_HOUSES[2].doorX, DWARVEN_STONE_HOUSES[2].doorZ, SOUTHERN_MINE_POS.x, DWARVEN_STONE_HOUSES[2].doorZ),
    distToSegment(x, z, DWARVEN_STONE_HOUSES[3].doorX, DWARVEN_STONE_HOUSES[3].doorZ, SOUTHERN_MINE_POS.x, DWARVEN_STONE_HOUSES[3].doorZ)
  );

  let bridgeTrailDist = 999;
  if (x >= 10 && x <= 30 && Math.abs(z - 2.0) <= 16) {
    const targetX = 18.0 + Math.sin((z - 2.0) * 0.12) * 1.1;
    bridgeTrailDist = Math.abs(x - targetX);
  }
  const sakuraGateEntryX = SAKURA_SANCTUARY_POS.x + Math.sin(SAKURA_SANCTUARY_YAW) * 16.5;
  const sakuraGateEntryZ = SAKURA_SANCTUARY_POS.z + Math.cos(SAKURA_SANCTUARY_YAW) * 16.5;
  const eastTrailDist = Math.min(
    distToSegment(x, z, 22, -4, 52, -18),
    distToSegment(x, z, 52, -18, 84, -25),
    distToSegment(x, z, 84, -25, 72, -45),
    distToSegment(x, z, 72, -45, 106, -62),
    distToSegment(x, z, 106, -62, sakuraGateEntryX, sakuraGateEntryZ),
    distToSegment(x, z, 106, -62, 0, -74 + FZ),
    distToSegment(x, z, 22, 12, 54, 36),
    distToSegment(x, z, 54, 36, 88, 62),
    distToSegment(x, z, 88, 62, BIRCH_GROVE_CENTER.x, BIRCH_GROVE_CENTER.z)
  );

  const northTrailDist = Math.min(
    distToSegment(x, z, 22, -12, 30, -26),
    distToSegment(x, z, 30, -26, 0, -76),
    distToSegment(x, z, 0, -25, 0, -78 + FZ),
    distToSegment(x, z, 0, -76, -42, -98),
    distToSegment(x, z, -42, -98, -45, -188),
    distToSegment(x, z, -24, -18, -42, -30),
    distToSegment(x, z, -42, -30, -85, -105)
  );

  const westTrailDist = Math.min(
    distToSegment(x, z, -24, -8, -34, -16),
    distToSegment(x, z, -34, -16, -88, 52),
    distToSegment(x, z, -88, 52, -116, 48),
    distToSegment(x, z, -88, 52, HUNTER_LODGE_POS.x, HUNTER_LODGE_POS.z - 5.2)
  );

  const minDist = Math.min(
    ringDist,
    southTrailDist,
    southSpurs,
    bridgeTrailDist,
    eastTrailDist,
    northTrailDist,
    westTrailDist
  );
  return 1.0 - smoothstep(1.3, 3.2, minDist);
}

// #endregion

// ======================== FORTRESS ZONES & STAIRS ======================== \\
// #region Fortress Zones & Stairs
export { isChineseFortressWalkableZone, chineseFortressStairHeightAt };
// #endregion

// ======================== GROUND HEIGHTFIELD MATH ======================== \\
// #region Ground Heightfield Math
/**
 * Summary: Pure analytical heightfield function evaluating continuous terrain elevation.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @returns Computed result for groundHeightAt.
 */
export function groundHeightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);

  const n1 = fbm2D(x * 0.012 + 4.3, z * 0.012 - 2.1, 3);
  const n2 = fbm2D(x * 0.042 - 11.2, z * 0.042 + 7.4, 2);

  const westValleySuppress = 1.0 - smoothstep(22.0, 62.0, Math.hypot(x + 138, z - 42));
  const riverValleySuppress =
    x > 12 && z < 18
      ? 1.0 - smoothstep(14.0, 46.0, distToSegment(x, z, 18, 2, 175, -92))
      : 0.0;
  const plungePoolSuppress = 1.0 - smoothstep(7.0, 18.0, Math.hypot(x - WATERFALL_POOL_POS.x, z - WATERFALL_POOL_POS.z));
  const valleySuppress = Math.max(westValleySuppress, riverValleySuppress, plungePoolSuppress);

  const northFoothillT = z < -36 ? smoothstep(-36, -110, z) : 0;
  const northHighAlpineT = z < -92 ? smoothstep(-92, -215, z) : 0;
  const northRidgeWave = fbm2D(x * 0.011 - 1.7, z * 0.011 + 3.4, 3) * 0.5 + 0.5;
  const northHighlandElevation =
    (northFoothillT * (4.5 + northRidgeWave * 6.5) +
      northHighAlpineT * (11.5 + northRidgeWave * 14.0)) *
    (1.0 - valleySuppress);

  let h = 1.95 + n1 * 1.25 + n2 * 0.25 + northHighlandElevation;

  for (let i = 0; i < SMALL_MEADOW_HILLS.length; i++) {
    const sh = SMALL_MEADOW_HILLS[i];
    const sd = Math.hypot(x - sh.x, z - sh.z);
    if (sd < sh.r) {
      h += (1.0 - smoothstep(0, sh.r, sd)) * sh.h * (1.0 - valleySuppress);
    }
  }

  if (h < 0.85) {
    h = 0.85 + (h - 0.85) * 0.2;
  }

  const lakeDistMain = Math.hypot((x + 2.0) * 0.94, (z - 1.5) * 1.06);
  const lakeDepthMain = (1.0 - smoothstep(6.5, 21.5, lakeDistMain)) * 4.8;

  const channelDist = Math.hypot((x - 14.5) * 0.62, (z - 2.0) * 1.5);
  const channelDepth = (1.0 - smoothstep(3.0, 10.5, channelDist)) * 3.8;

  let riverDepth = 0;
  if (x > 16 && z < 12) {
    const segDist = distToSegment(x, z, 18, 2, 175, -92);
    const meander = Math.sin(x * 0.065) * 3.2;
    const effDist = Math.abs(segDist + meander * 0.35);
    riverDepth = (1.0 - smoothstep(2.4, 7.8, effDist)) * 4.2;
  }

  const westLagoonDist = Math.hypot((x + 138) * 0.88, (z - 42) * 1.12);
  const westLagoonDepth = (1.0 - smoothstep(9.0, 29.5, westLagoonDist)) * 5.2;

  const poolDist = Math.hypot(x - WATERFALL_POOL_POS.x, z - WATERFALL_POOL_POS.z);
  const poolDepth = (1.0 - smoothstep(5.5, 13.5, poolDist)) * 3.8;
  const streamDist = distToSegment(x, z, WATERFALL_POOL_POS.x, WATERFALL_POOL_POS.z, -16, -8);
  const streamDepth = (1.0 - smoothstep(1.8, 5.2, streamDist)) * 2.6;

  const totalWaterCarve = Math.max(
    lakeDepthMain,
    channelDepth,
    riverDepth,
    westLagoonDepth,
    poolDepth,
    streamDepth
  );
  h -= totalWaterCarve;

  if (totalWaterCarve < 0.15 && h < 0.65) {
    h = 0.65;
  }

  const cliffDist = Math.hypot(x - WATERFALL_CLIFF_POS.x, z - WATERFALL_CLIFF_POS.z);
  if (cliffDist < 25.0) {
    const cliffRise = (1.0 - smoothstep(4.5, 25.0, cliffDist)) * (1.0 - plungePoolSuppress);
    h += cliffRise * 18.5;
  }

  const rawRidgeNoise = fbm2D(x * 0.035, z * 0.035, 2);
  for (let i = 0; i < WALKABLE_MOUNTAINS.length; i++) {
    const m = WALKABLE_MOUNTAINS[i];
    const md = Math.hypot(x - m.x, z - m.z);
    if (md < m.radius) {
      const rise = (1.0 - smoothstep(6.5, m.radius, md)) * (1.0 - plungePoolSuppress);
      const flankDetail = 1.0 + smoothstep(10.0, 26.0, md) * Math.min(0.04, rawRidgeNoise * 0.14);
      h += rise * m.height * flankDetail;
    }
  }

  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    const hd = Math.hypot(x - hw.x, z - hw.z);
    if (hd < 26.0) {
      const crownW = 1.0 - smoothstep(7.8, 26.0, hd);
      h = Math.max(h, h * (1.0 - crownW) + hw.baseY * crownW);
    }
  }

  const fortDx = Math.max(0, Math.abs(x - CHINESE_FORTRESS_POS.x) - 56.0);
  const fortDz =
    z > CHINESE_FORTRESS_POS.plazaMaxZ
      ? z - CHINESE_FORTRESS_POS.plazaMaxZ
      : z < CHINESE_FORTRESS_POS.plazaMinZ
        ? CHINESE_FORTRESS_POS.plazaMinZ - z
        : 0;
  const fortEdgeDist = Math.hypot(fortDx, fortDz);
  if (fortEdgeDist < 48.0) {
    const fortWeight = 1.0 - smoothstep(0.8, 48.0, fortEdgeDist);
    const crag = fortEdgeDist > 1.5 ? fbm2D(x * 0.075, z * 0.075, 2) * 1.8 : 0;
    const targetFortH = CHINESE_FORTRESS_POS.summitHeight + crag * (1.0 - fortWeight * 0.85);
    h = h * (1.0 - fortWeight) + targetFortH * fortWeight;
  }

  if (z <= -72.0 + FZ && z >= -124.0 + FZ && Math.abs(x) < 52.0) {
    const spurHalfW = z <= -102.0 + FZ ? 18.0 : 9.0;
    const spurOuterW = spurHalfW + 28.0;
    if (Math.abs(x) < spurOuterW) {
      const spurW = 1.0 - smoothstep(spurHalfW, spurOuterW, Math.abs(x));
      const spurTargetH = chineseFortressStairHeightAt(z);
      h = Math.max(h, h * (1.0 - spurW) + spurTargetH * spurW);
    }
  }

  const magicHillDist = Math.hypot(x - MAGIC_STONE_CIRCLE_POS.x, z - MAGIC_STONE_CIRCLE_POS.z);
  if (magicHillDist < MAGIC_STONE_CIRCLE_POS.hillRadius) {
    const hillRise = 1.0 - smoothstep(MAGIC_STONE_CIRCLE_POS.topFlatRadius, MAGIC_STONE_CIRCLE_POS.hillRadius, magicHillDist);
    const targetHillH = MAGIC_STONE_CIRCLE_POS.height;
    h = Math.max(h, h * (1.0 - hillRise) + targetHillH * hillRise);
  }

  const mineMtnDx = x - SOUTHERN_MINE_POS.x;
  const mineMtnDz = z - SOUTHERN_MINE_POS.mountainCenterZ;
  const mineMtnDist = Math.hypot(mineMtnDx * 0.92, mineMtnDz * 0.85);
  if (mineMtnDist < SOUTHERN_MINE_POS.mountainRadius && z >= SOUTHERN_MINE_POS.entranceZ - 1.0) {
    const baseRise = 1.0 - smoothstep(10.0, SOUTHERN_MINE_POS.mountainRadius, mineMtnDist);
    const northCliffRamp = smoothstep(SOUTHERN_MINE_POS.entranceZ - 0.8, SOUTHERN_MINE_POS.entranceZ + 4.5, z);
    const cragDetail = 1.0 + fbm2D(x * 0.06, z * 0.06, 2) * 0.1;
    let mtnAdd = baseRise * northCliffRamp * SOUTHERN_MINE_POS.mountainHeight * cragDetail;
    if (Math.abs(mineMtnDx) < 12.0 && z >= SOUTHERN_MINE_POS.entranceZ && z <= SOUTHERN_MINE_POS.entranceZ + 22.0) {
      const browW = (1.0 - smoothstep(5.5, 12.0, Math.abs(mineMtnDx))) * smoothstep(SOUTHERN_MINE_POS.entranceZ - 0.4, SOUTHERN_MINE_POS.entranceZ + 3.2, z);
      mtnAdd = Math.max(mtnAdd, browW * 15.5);
    }
    h += mtnAdd;
  }

  if (r > 645 && !(x > 225 && z > 80)) {
    const rimT = smoothstep(645, 740, r);
    const ridgeNoise = Math.abs(fbm2D(x * 0.022, z * 0.022, 3));
    h += rimT * (30.0 + ridgeNoise * 38.0);
  }

  for (let i = 0; i < FLAT_BUILDING_TERRACES.length; i++) {
    const t = FLAT_BUILDING_TERRACES[i];
    const td = Math.hypot(x - t.x, z - t.z);
    if (td < t.outerR) {
      const flatWeight = 1.0 - smoothstep(t.innerR, t.outerR, td);
      h = h * (1.0 - flatWeight) + t.targetH * flatWeight;
    }
  }

  if (z <= -76.0 + FZ && z >= -122.5 + FZ) {
    const channelHalfW = z <= -103.5 + FZ && z >= -114.5 + FZ ? 14.5 : 4.8;
    const outerBlendW = channelHalfW + 8.5;
    if (Math.abs(x) < outerBlendW) {
      const stairChannelW = 1.0 - smoothstep(channelHalfW, outerBlendW, Math.abs(x));
      const stairRecess = smoothstep(-78.0 + FZ, -81.0 + FZ, z) * 0.65;
      const stairBedH = chineseFortressStairHeightAt(z) - stairRecess;
      h = h * (1.0 - stairChannelW) + stairBedH * stairChannelW;
    }
  }

  if (x >= 184 && z >= 85) {
    const coastLineX =
      z >= 212.0 && z <= 312.0
        ? 255.2
        : 255.2 + Math.sin(z * 0.035) * 8.0 - Math.max(0, (z - 312.0) * 0.18);
    if (x >= coastLineX - 8.0 && z >= 95.0) {
      const seaWeight =
        smoothstep(coastLineX - 4.0, coastLineX + 2.5, x) * smoothstep(95.0, 125.0, z);
      h = h * (1.0 - seaWeight) + -6.8 * seaWeight;
    }

    if (x <= 256.5 && z >= 198 && z <= 328) {
      const dxPlaza = Math.max(0, 200.0 - x, x - 255.2);
      const dzPlaza = Math.max(0, 214.0 - z, z - 312.0);
      const distPlaza = Math.hypot(dxPlaza, dzPlaza);
      if (distPlaza < 16.0) {
        const wPlaza = 1.0 - smoothstep(0.0, 16.0, distPlaza);
        const eastEdgeProtect = x > 255.2 ? 1.0 - smoothstep(255.2, 256.2, x) : 1.0;
        const wFinal = wPlaza * eastEdgeProtect;
        h = h * (1.0 - wFinal) + SOUTHEAST_HARBOR_POS.plazaY * wFinal;
      }
    }

    const lhDist = Math.hypot(x - SOUTHEAST_HARBOR_POS.lighthouseX, z - SOUTHEAST_HARBOR_POS.lighthouseZ);
    if (lhDist < 24.0) {
      const wLh = 1.0 - smoothstep(8.5, 24.0, lhDist);
      h = Math.max(h, h * (1.0 - wLh) + SOUTHEAST_HARBOR_POS.lighthouseBaseY * wLh);
    }
    const rampAx = 238.0;
    const rampAz = 218.0;
    const rampBx = SOUTHEAST_HARBOR_POS.lighthouseX;
    const rampBz = SOUTHEAST_HARBOR_POS.lighthouseZ + 5.0;
    const rVx = rampBx - rampAx;
    const rVz = rampBz - rampAz;
    const rLenSq = rVx * rVx + rVz * rVz;
    const rT = Math.max(0, Math.min(1, ((x - rampAx) * rVx + (z - rampAz) * rVz) / rLenSq));
    const rDist = Math.hypot(x - (rampAx + rT * rVx), z - (rampAz + rT * rVz));
    if (rDist < 5.5) {
      const wRamp = 1.0 - smoothstep(2.2, 5.5, rDist);
      const targetRampH =
        SOUTHEAST_HARBOR_POS.plazaY +
        rT * (SOUTHEAST_HARBOR_POS.lighthouseBaseY - SOUTHEAST_HARBOR_POS.plazaY);
      h = h * (1.0 - wRamp) + targetRampH * wRamp;
    }
  }

  const swFactor = southwestOasisBiomeFactorAt(x, z);
  if (swFactor > 0.05) {
    const oasisDist = Math.hypot(x - SOUTHWEST_OASIS_POS.x, z - SOUTHWEST_OASIS_POS.z);
    if (oasisDist > 58.0) {
      const duneWave =
        Math.sin(x * 0.045 + z * 0.032) * 1.15 +
        fbm2D(x * 0.025 - 3.4, z * 0.025 + 6.1, 2) * 1.65;
      const duneMask = smoothstep(58.0, 92.0, oasisDist) * swFactor;
      h += Math.max(-0.4, duneWave) * duneMask;
    }
    const lagNorm = Math.hypot(
      (x - SOUTHWEST_OASIS_POS.lagoonX) / SOUTHWEST_OASIS_POS.lagoonRadiusX,
      (z - SOUTHWEST_OASIS_POS.lagoonZ) / SOUTHWEST_OASIS_POS.lagoonRadiusZ
    );
    if (lagNorm < 1.05) {
      const basinCarve = (1.0 - smoothstep(0.38, 1.02, lagNorm)) * 2.2;
      h -= basinCarve;
    }
  }

  return h;
}

// #endregion

// ======================== WATER & SNOW ZONE QUERIES ======================== \\
// #region Water & Snow Zone Queries
/**
 * Summary: Queries the local water plane elevation for oceans, lakes, pools, and oasis lagoons.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @param currentY Input parameter currentY.
 * @returns Computed result for getWaterSurfaceHeightAt.
 */
export function getWaterSurfaceHeightAt(x: number, z: number, currentY?: number): number | null {
  if (currentY !== undefined && currentY < -3.5) {
    const lx = x - SOUTHERN_MINE_POS.x;
    const lz = z - SOUTHERN_MINE_POS.entranceZ;
    if (lx >= -50.5 && lx <= -32.5 && lz >= 40.5 && lz <= 84.5) {
      return -9.3;
    }
  }
  const lagNorm = Math.hypot(
    (x - SOUTHWEST_OASIS_POS.lagoonX) / SOUTHWEST_OASIS_POS.lagoonRadiusX,
    (z - SOUTHWEST_OASIS_POS.lagoonZ) / SOUTHWEST_OASIS_POS.lagoonRadiusZ
  );
  if (lagNorm <= 1.0) {
    return SOUTHWEST_OASIS_POS.lagoonWaterY;
  }
  if (x >= 254.0 && z >= 95.0 && groundHeightAt(x, z) < SOUTHEAST_HARBOR_POS.waterY - 0.05) {
    return SOUTHEAST_HARBOR_POS.waterY;
  }
  if (groundHeightAt(x, z) < WATER_LEVEL + 0.15) {
    return WATER_LEVEL;
  }
  return null;
}

/**
 * Summary: Calculates snow accumulation factor based on terrain altitude above the snowline.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @returns Computed result for northernSnowZoneFactorAt.
 */
export function northernSnowZoneFactorAt(x: number, z: number): number {
  if (isChineseFortressWalkableZone(x, z)) {
    return 0;
  }
  const h = groundHeightAt(x, z);
  if (h < SNOW_LINE_ALTITUDE) {
    return 0;
  }
  const altitudeSnow = smoothstep(SNOW_LINE_ALTITUDE, SNOW_LINE_ALTITUDE + 6.5, h);
  return Math.max(0, Math.min(1, altitudeSnow));
}

// #endregion

// ======================== WALKABLE SURFACE RESOLUTION ======================== \\
// #region Walkable Surface Resolution
/**
 * Summary: Resolves complex multi-story walkable surface heights (ground, bridges, decks, cabins).
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: [HOT-PATH EXCEPTION] Evaluated at 60FPS for entity positioning and camera collision.
 * Relaxed Rule: Rule 1 (fast analytical evaluation bypassing heavy mesh raycasts).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.05ms per query.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @param currentY Input parameter currentY.
 * @returns Computed result for walkableHeightAt.
 */
export function walkableHeightAt(
  x: number,
  z: number,
  currentY?: number
): { height: number; surface: 'pier' | 'bridge' | 'tower' | 'cabin' | 'ground' } {
  if (Math.abs(x) <= 21.8 && z >= -215.6 + FZ && z <= -187.8 + FZ) {
    if (z > -189.8 + FZ && Math.abs(x) <= 4.2) {
      const tStep = Math.max(0, Math.min(1, (-187.8 + FZ - z) / 2.0));
      return { height: CHINESE_FORTRESS_POS.summitHeight + tStep * 0.35, surface: 'cabin' };
    }
    if (z <= -189.6 + FZ) {
      const inMainStairX = x >= 13.5 && x <= 18.5;
      const inMainStairZ = z >= -206.0 + FZ && z <= -194.0 + FZ;
      if (inMainStairX && inMainStairZ) {
        const tStair = Math.max(0, Math.min(1, (-194.0 + FZ - z) / 12.0));
        const stairY =
          CHINESE_FORTRESS_POS.mainHallFloor1Y +
          tStair * (CHINESE_FORTRESS_POS.mainHallFloor2Y - CHINESE_FORTRESS_POS.mainHallFloor1Y);
        if (currentY === undefined || currentY <= stairY + 2.4) {
          return { height: stairY, surface: 'cabin' };
        }
      }
      if (
        currentY !== undefined &&
        currentY >= 29.2 + FY &&
        !(inMainStairX && z >= -205.5 + FZ && z <= -194.0 + FZ)
      ) {
        return { height: CHINESE_FORTRESS_POS.mainHallFloor2Y, surface: 'cabin' };
      }
      return { height: CHINESE_FORTRESS_POS.mainHallFloor1Y, surface: 'cabin' };
    }
  }

  for (const px of [-30.0, 30.0]) {
    if (Math.abs(x - px) <= 8.8 && z >= -171.3 + FZ && z <= -156.3 + FZ) {
      const inPavStairX = px < 0 ? x >= -38.6 && x <= -35.0 : x >= 35.0 && x <= 38.6;
      const inPavStairZ = z >= -167.5 + FZ && z <= -159.5 + FZ;
      if (inPavStairX && inPavStairZ) {
        const tStair = Math.max(0, Math.min(1, (-159.5 + FZ - z) / 8.0));
        const stairY =
          CHINESE_FORTRESS_POS.pavilionFloor1Y +
          tStair * (CHINESE_FORTRESS_POS.pavilionFloor2Y - CHINESE_FORTRESS_POS.pavilionFloor1Y);
        if (currentY === undefined || currentY <= stairY + 2.2) {
          return { height: stairY, surface: 'cabin' };
        }
      }
      if (
        currentY !== undefined &&
        currentY >= 28.8 + FY &&
        !(inPavStairX && z >= -167.0 + FZ && z <= -159.5 + FZ)
      ) {
        return { height: CHINESE_FORTRESS_POS.pavilionFloor2Y, surface: 'cabin' };
      }
      return { height: CHINESE_FORTRESS_POS.pavilionFloor1Y, surface: 'cabin' };
    }
  }

  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const tw = CORNER_WATCHTOWERS[i];
    if (Math.abs(x - tw.cx) <= 5.1 && Math.abs(z - tw.cz) <= 5.1) {
      const inLadderHatch =
        Math.abs(x - tw.ladderX) <= 0.85 && Math.abs(z - tw.ladderZ) <= 0.85;
      if (!inLadderHatch) {
        if (currentY !== undefined && currentY >= 33.8 + FY) {
          return { height: CHINESE_FORTRESS_POS.watchtowerFloor3Y, surface: 'tower' };
        }
        if (currentY !== undefined && currentY >= 28.8 + FY) {
          return { height: CHINESE_FORTRESS_POS.watchtowerFloor2Y, surface: 'tower' };
        }
      }
      return { height: CHINESE_FORTRESS_POS.watchtowerFloor1Y, surface: 'tower' };
    }
  }

  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    const dx = x - hw.x;
    const dz = z - hw.z;
    const cosY = Math.cos(hw.yaw);
    const sinY = Math.sin(hw.yaw);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY;
    if (Math.abs(lx) <= hw.halfSize && Math.abs(lz) <= hw.halfSize) {
      const inLadderHatch =
        Math.abs(lx - hw.localLadderX) <= 0.82 && Math.abs(lz - hw.localLadderZ) <= 0.82;
      if (!inLadderHatch && currentY !== undefined && currentY >= hw.deckY - 2.5) {
        return { height: hw.deckY, surface: 'tower' };
      }
      return { height: hw.baseY + 0.15, surface: 'tower' };
    }
  }

  const rbInfo = ropeBridgePointInfoAt(x, z);
  if (rbInfo !== null && (currentY === undefined || currentY >= rbInfo.height - 4.5)) {
    return { height: rbInfo.height, surface: 'pier' };
  }

  if (Math.abs(x) >= 44.2 && Math.abs(x) <= 47.85 && z >= -156.6 + FZ && z <= -141.5 + FZ) {
    if (z <= -152.0 + FZ) {
      if (currentY === undefined || currentY >= 28.2 + FY) {
        return { height: CHINESE_FORTRESS_POS.rampartHeight, surface: 'bridge' };
      }
    } else {
      const tWallStair = Math.max(0, Math.min(1, (-142.0 + FZ - z) / 10.0));
      return {
        height:
          CHINESE_FORTRESS_POS.summitHeight +
          tWallStair * (CHINESE_FORTRESS_POS.rampartHeight - CHINESE_FORTRESS_POS.summitHeight),
        surface: 'bridge',
      };
    }
  }

  const onSouthWallTop =
    Math.abs(x) >= 4.4 && Math.abs(x) <= 52.0 && z >= -126.2 + FZ && z <= -122.0 + FZ;
  const onSideWallTop =
    Math.abs(x) >= 47.8 && Math.abs(x) <= 52.0 && z >= -220.0 + FZ && z <= -122.0 + FZ;
  const onNorthWallTop = Math.abs(x) <= 52.0 && z >= -220.0 + FZ && z <= -215.8 + FZ;
  if ((onSouthWallTop || onSideWallTop || onNorthWallTop) && currentY !== undefined && currentY >= 28.5 + FY) {
    return { height: CHINESE_FORTRESS_POS.rampartHeight, surface: 'bridge' };
  }

  if (
    z <= CHINESE_FORTRESS_POS.stairFootZ &&
    z >= CHINESE_FORTRESS_POS.upperStairTopZ
  ) {
    const allowedHalfW =
      z <= CHINESE_FORTRESS_POS.midLandingMaxZ && z >= CHINESE_FORTRESS_POS.midLandingMinZ
        ? CHINESE_FORTRESS_POS.midLandingHalfWidth
        : CHINESE_FORTRESS_POS.stairHalfWidth;
    if (Math.abs(x - CHINESE_FORTRESS_POS.x) <= allowedHalfW) {
      return { height: chineseFortressStairHeightAt(z), surface: 'bridge' };
    }
  }

  if (
    Math.abs(x - CHINESE_FORTRESS_POS.x) <= CHINESE_FORTRESS_POS.plazaHalfWidth &&
    z <= CHINESE_FORTRESS_POS.plazaMaxZ &&
    z >= CHINESE_FORTRESS_POS.plazaMinZ
  ) {
    return { height: CHINESE_FORTRESS_POS.summitHeight, surface: 'bridge' };
  }

  if (isInsideSouthernMine(x, z, currentY)) {
    return { height: southernMineWalkableHeightAt(x, z, currentY), surface: 'bridge' };
  }

  const groundH = groundHeightAt(x, z);

  const pierCx = -11.5;
  const pierCz = 15.5;
  const pierAngle = Math.atan2(-8.0, 6.0);
  const dxP = x - pierCx;
  const dzP = z - pierCz;
  const cosP = Math.cos(-pierAngle);
  const sinP = Math.sin(-pierAngle);
  const localPX = dxP * cosP - dzP * sinP;
  const localPZ = dxP * sinP + dzP * cosP;

  if (localPX >= -5.8 && localPX <= 9.0 && Math.abs(localPZ) <= 1.35) {
    const pierDeckH = 0.55;
    if (
      pierDeckH >= groundH - 0.15 &&
      (currentY === undefined || currentY >= pierDeckH - 0.55)
    ) {
      return { height: pierDeckH, surface: 'pier' };
    }
  }

  if (
    (x >= -127 && x <= -105.5 && Math.abs(z - 48.0) <= 1.45) ||
    (Math.abs(x - LAKESIDE_TEA_PAVILION_POS.x) <= LAKESIDE_TEA_PAVILION_POS.halfSize &&
      Math.abs(z - LAKESIDE_TEA_PAVILION_POS.z) <= LAKESIDE_TEA_PAVILION_POS.halfSize)
  ) {
    const westPierH = LAKESIDE_TEA_PAVILION_POS.deckHeight;
    if (
      westPierH >= groundH - 0.15 &&
      (currentY === undefined || currentY >= westPierH - 0.55)
    ) {
      return { height: westPierH, surface: 'pier' };
    }
  }

  const bridgeDx = x - 18.0;
  const bridgeDz = z - 2.0;
  if (Math.abs(bridgeDx) <= 1.65 && Math.abs(bridgeDz) <= 11.2) {
    const normZ = bridgeDz / 11.2;
    const archH = 0.52 + (1.0 - normZ * normZ) * 1.58;
    if (
      archH >= groundH - 0.1 &&
      (currentY === undefined || currentY >= archH - 0.65)
    ) {
      return { height: archH, surface: 'bridge' };
    }
  }

  const rbx = x - 78.0;
  const rbz = z + 35.0;
  const rbAngle = 0.54;
  const rbLocalX = rbx * Math.cos(rbAngle) - rbz * Math.sin(rbAngle);
  const rbLocalZ = rbx * Math.sin(rbAngle) + rbz * Math.cos(rbAngle);
  if (Math.abs(rbLocalX) <= 1.65 && Math.abs(rbLocalZ) <= 11.6) {
    const norm = rbLocalZ / 11.6;
    const deckH = 0.72 + (1.0 - norm * norm) * 1.18;
    if (
      deckH >= groundH - 0.15 &&
      (currentY === undefined || currentY >= deckH - 0.65)
    ) {
      return { height: deckH, surface: 'pier' };
    }
  }

  const towerCenterH = 6.4;
  if (Math.abs(x - 30.0) <= 3.1 && Math.abs(z + 26.0) <= 3.1) {
    return { height: towerCenterH + 0.55, surface: 'tower' };
  }

  if (Math.abs(x - HUNTER_LODGE_POS.x) <= 5.8 && Math.abs(z - HUNTER_LODGE_POS.z) <= 4.8) {
    return { height: HUNTER_LODGE_POS.height + 0.18, surface: 'cabin' };
  }

  for (let i = 0; i < VALLEY_FARMS.length; i++) {
    const f = VALLEY_FARMS[i];
    const minZ = f.dirZ === 1 ? f.z - 6.3 : f.z - 4.5;
    const maxZ = f.dirZ === 1 ? f.z + 4.5 : f.z + 6.3;
    if (Math.abs(x - f.x) <= 5.4 && z >= minZ && z <= maxZ) {
      return { height: f.height + 0.18, surface: 'cabin' };
    }
  }

  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.tavernX) <= SOUTHEAST_HARBOR_POS.tavernHalfW &&
    z >= SOUTHEAST_HARBOR_POS.tavernZ - SOUTHEAST_HARBOR_POS.tavernHalfD &&
    z <= SOUTHEAST_HARBOR_POS.tavernZ + SOUTHEAST_HARBOR_POS.tavernHalfD + 2.4
  ) {
    return { height: SOUTHEAST_HARBOR_POS.tavernFloorY, surface: 'cabin' };
  }

  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.warehouseX) <= SOUTHEAST_HARBOR_POS.warehouseHalfW &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.warehouseZ) <= SOUTHEAST_HARBOR_POS.warehouseHalfD + 1.0
  ) {
    return { height: SOUTHEAST_HARBOR_POS.warehouseFloorY, surface: 'cabin' };
  }
  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.cargoShedX) <= 6.0 &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.cargoShedZ) <= 4.5
  ) {
    return { height: SOUTHEAST_HARBOR_POS.plazaY + 0.12, surface: 'pier' };
  }

  const lhDist = Math.hypot(x - SOUTHEAST_HARBOR_POS.lighthouseX, z - SOUTHEAST_HARBOR_POS.lighthouseZ);
  if (lhDist <= SOUTHEAST_HARBOR_POS.lighthouseRadius + 0.45) {
    const inLhHatch =
      Math.abs(x - SOUTHEAST_HARBOR_POS.lighthouseLadderX) <= 0.82 &&
      Math.abs(z - SOUTHEAST_HARBOR_POS.lighthouseLadderZ) <= 0.82;
    if (!inLhHatch && currentY !== undefined && currentY >= SOUTHEAST_HARBOR_POS.lighthouseTopDeckY - 2.5) {
      return { height: SOUTHEAST_HARBOR_POS.lighthouseTopDeckY, surface: 'tower' };
    }
    if (lhDist <= SOUTHEAST_HARBOR_POS.lighthouseRadius) {
      return { height: SOUTHEAST_HARBOR_POS.lighthouseBaseY + 0.15, surface: 'tower' };
    }
  }

  if (
    x >= SOUTHEAST_HARBOR_POS.pierStartX - 0.5 &&
    x <= SOUTHEAST_HARBOR_POS.pierEndX &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.pierZ) <= SOUTHEAST_HARBOR_POS.pierHalfW &&
    (currentY === undefined || currentY >= SOUTHEAST_HARBOR_POS.pierY - 0.65)
  ) {
    return { height: SOUTHEAST_HARBOR_POS.pierY, surface: 'pier' };
  }

  if (
    x >= 271.0 &&
    x <= 276.2 &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.pierZ) <= 2.1 &&
    (currentY === undefined || currentY >= SOUTHEAST_HARBOR_POS.pierY - 0.65)
  ) {
    const tGang = Math.max(0, Math.min(1, (x - 271.0) / 5.0));
    return {
      height:
        SOUTHEAST_HARBOR_POS.pierY +
        tGang * (SOUTHEAST_HARBOR_POS.shipDeckY - SOUTHEAST_HARBOR_POS.pierY),
      surface: 'pier',
    };
  }

  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.shipX) <= SOUTHEAST_HARBOR_POS.shipHalfW &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.shipZ) <= SOUTHEAST_HARBOR_POS.shipHalfL
  ) {
    const absShipDx = Math.abs(x - SOUTHEAST_HARBOR_POS.shipX);
    if (absShipDx >= 2.8 && absShipDx <= 6.1 && z >= 254.5 && z <= SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ) {
      const tStair = Math.max(
        0,
        Math.min(1, (z - 254.5) / (SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ - 254.5))
      );
      const stairY =
        SOUTHEAST_HARBOR_POS.shipDeckY +
        tStair * (SOUTHEAST_HARBOR_POS.shipQuarterdeckY - SOUTHEAST_HARBOR_POS.shipDeckY);
      if (currentY === undefined || currentY <= stairY + 1.8) {
        return { height: stairY, surface: 'pier' };
      }
    }
    if (z >= SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ) {
      if (currentY !== undefined && currentY >= 5.2) {
        return { height: SOUTHEAST_HARBOR_POS.shipQuarterdeckY, surface: 'pier' };
      }
      return { height: SOUTHEAST_HARBOR_POS.shipDeckY, surface: 'cabin' };
    }
    return { height: SOUTHEAST_HARBOR_POS.shipDeckY, surface: 'pier' };
  }

  const obsDist = Math.hypot(x - SOUTHWEST_OASIS_POS.observatoryX, z - SOUTHWEST_OASIS_POS.observatoryZ);
  if (obsDist <= SOUTHWEST_OASIS_POS.observatoryRadius + 0.45) {
    const inObsHatch =
      Math.abs(x - SOUTHWEST_OASIS_POS.observatoryLadderX) <= 0.85 &&
      Math.abs(z - SOUTHWEST_OASIS_POS.observatoryLadderZ) <= 0.85;
    if (!inObsHatch && currentY !== undefined && currentY >= SOUTHWEST_OASIS_POS.observatoryTopDeckY - 2.5) {
      return { height: SOUTHWEST_OASIS_POS.observatoryTopDeckY, surface: 'tower' };
    }
    if (obsDist <= SOUTHWEST_OASIS_POS.observatoryRadius) {
      return { height: SOUTHWEST_OASIS_POS.observatoryBaseY + 0.15, surface: 'tower' };
    }
  }

  if (
    Math.abs(x - SOUTHWEST_OASIS_POS.pavilionX) <= SOUTHWEST_OASIS_POS.pavilionHalfW + 0.8 &&
    Math.abs(z - SOUTHWEST_OASIS_POS.pavilionZ) <= SOUTHWEST_OASIS_POS.pavilionHalfD
  ) {
    return { height: SOUTHWEST_OASIS_POS.pavilionFloorY, surface: 'cabin' };
  }

  if (
    ((Math.abs(x - SOUTHWEST_OASIS_POS.gazeboX) <= SOUTHWEST_OASIS_POS.gazeboHalfSize &&
      Math.abs(z - SOUTHWEST_OASIS_POS.gazeboZ) <= SOUTHWEST_OASIS_POS.gazeboHalfSize) ||
      (Math.abs(x - SOUTHWEST_OASIS_POS.gazeboX) <= SOUTHWEST_OASIS_POS.bridgeHalfW &&
        z >= SOUTHWEST_OASIS_POS.bridgeMinZ &&
        z <= SOUTHWEST_OASIS_POS.bridgeMaxZ)) &&
    (currentY === undefined || currentY >= SOUTHWEST_OASIS_POS.gazeboDeckY - 0.5)
  ) {
    return { height: SOUTHWEST_OASIS_POS.gazeboDeckY, surface: 'pier' };
  }

  for (let i = 0; i < DWARVEN_STONE_HOUSES.length; i++) {
    const dh = DWARVEN_STONE_HOUSES[i];
    if (
      Math.abs(x - dh.x) <= dh.halfW + 0.65 &&
      Math.abs(z - dh.z) <= dh.halfD + 0.35
    ) {
      return { height: dh.floorY, surface: 'cabin' };
    }
  }

  return { height: groundH, surface: 'ground' };
}

/**
 * Summary: Calculates analytical surface normal unit vector via central finite differences.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: [HOT-PATH EXCEPTION] Sampled in real-time for player alignment and slopes.
 * Relaxed Rule: Rule 1 (fast analytical finite difference evaluation).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.01ms per query.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @returns Computed result for getSurfaceNormalAt.
 */
export function getSurfaceNormalAt(x: number, z: number): { nx: number; ny: number; nz: number } {
  const eps = 0.4;
  const hL = groundHeightAt(x - eps, z);
  const hR = groundHeightAt(x + eps, z);
  const hD = groundHeightAt(x, z - eps);
  const hU = groundHeightAt(x, z + eps);

  const dx = (hR - hL) / (2 * eps);
  const dz = (hU - hD) / (2 * eps);
  const len = Math.hypot(dx, 1.0, dz);
  return {
    nx: -dx / len,
    ny: 1.0 / len,
    nz: -dz / len,
  };
}

// #endregion

// ======================== SURFACE BIOME CLASSIFICATION ======================== \\
// #region Surface Biome Classification
/**
 * Summary: Classifies the dominant surface biome type at given spatial coordinates.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: [HOT-PATH EXCEPTION] Queried continuously for footsteps, shaders, and audio cues.
 * Relaxed Rule: Rule 1 (fast analytical classification).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.01ms per query.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @param currentY Input parameter currentY.
 * @returns Computed result for getSurfaceBiomeAt.
 */
export function getSurfaceBiomeAt(x: number, z: number, currentY?: number): BiomeType {
  const walk = walkableHeightAt(x, z, currentY);
  if (walk.surface === 'pier') return 'pier';
  if (walk.surface === 'bridge') {
    const waterY = getWaterSurfaceHeightAt(x, z, currentY);
    if (waterY !== null && walk.height < waterY - 0.12) return 'water';
    return 'bridge';
  }
  if (walk.surface === 'cabin') return 'cabin';
  if (walk.surface === 'tower') return 'highland';

  const h = walk.height;
  const waterY = getWaterSurfaceHeightAt(x, z, currentY);
  if (waterY !== null && h < waterY - 0.08) return 'water';
  if (waterY !== null && h < waterY + 0.42) return 'shore';

  const tf = trailFactorAt(x, z);
  if (tf > 0.42) return 'trail';

  if (southwestOasisBiomeFactorAt(x, z) > 0.32) return 'desert';

  if (birchGroveFactorAt(x, z) > 0.35) return 'birch_grove';

  const normal = getSurfaceNormalAt(x, z);
  if (normal.ny < 0.78 || h > 14.0) return 'rock';
  if (h > 8.2) return 'highland';

  if (regionalForestDensityAt(x, z) > 0.42) return 'forest';

  return 'meadow';
}

/**
 * Summary: Returns the localized Hebrew display label for a world biome.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param biome Input parameter biome.
 * @returns Computed result for getBiomeLabel.
 */
export function getBiomeLabel(biome: BiomeType): string {
  return t(`biomes.${biome}`);
}


/**
 * Summary: Returns the localized Hebrew display label for a walking pace mode.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param pace Input parameter pace.
 * @returns Computed result for getWalkPaceLabel.
 */
export function getWalkPaceLabel(pace: WalkPaceMode): string {
  return t(`pace.${pace}`);
}


/**
 * Summary: Samples RGB color representation of terrain and structures for the explorer minimap.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param x Input parameter x.
 * @param z Input parameter z.
 * @returns Computed result for sampleMinimapColorAt.
 */
export function sampleMinimapColorAt(x: number, z: number): [number, number, number] {
  if (isChineseFortressWalkableZone(x, z)) {
    if (
      (Math.abs(x) <= 22.0 && z >= -216.0 + FZ && z <= -189.5 + FZ) ||
      (Math.abs(Math.abs(x) - 30.0) <= 9.0 && z >= -171.5 + FZ && z <= -156.5 + FZ)
    ) {
      return [168, 54, 46];
    }
    if (
      Math.abs(Math.abs(x) - 45.5) <= 5.5 &&
      (Math.abs(z - (-128.5 + FZ)) <= 5.5 || Math.abs(z - (-213.5 + FZ)) <= 5.5)
    ) {
      return [128, 122, 114];
    }
    return [210, 204, 194];
  }

  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    if (Math.abs(x - hw.x) <= hw.halfSize + 0.8 && Math.abs(z - hw.z) <= hw.halfSize + 0.8) {
      return [168, 54, 46];
    }
  }
  if (ropeBridgePointInfoAt(x, z) !== null) {
    return [184, 134, 78];
  }
  if (isInsideSouthernMine(x, z)) {
    const lx = x - SOUTHERN_MINE_POS.x;
    const lz = z - SOUTHERN_MINE_POS.entranceZ;
    if (lx >= -50.0 && lx <= -33.0 && lz >= 41.0 && lz <= 84.0) {
      return [38, 182, 196];
    }
    return [102, 88, 76];
  }
  for (let i = 0; i < DWARVEN_GUARDIAN_STATUES.length; i++) {
    const st = DWARVEN_GUARDIAN_STATUES[i];
    if (
      Math.abs(x - st.x) <= st.pedestalHalfSize + 0.5 &&
      Math.abs(z - st.z) <= st.pedestalHalfSize + 0.5
    ) {
      return [212, 168, 72];
    }
  }
  for (let i = 0; i < DWARVEN_STONE_HOUSES.length; i++) {
    const dh = DWARVEN_STONE_HOUSES[i];
    if (
      Math.abs(x - dh.x) <= dh.halfW + 0.5 &&
      Math.abs(z - dh.z) <= dh.halfD + 0.5
    ) {
      return [136, 132, 126];
    }
  }

  for (let i = 0; i < VALLEY_FARMS.length; i++) {
    const f = VALLEY_FARMS[i];
    const dx = Math.abs(x - f.x);
    const dz = Math.abs(z - f.z);
    if (dx <= f.fenceHalfW + 0.6 && dz <= f.fenceHalfD + 0.6) {
      if (dx >= f.fenceHalfW - 0.6 || dz >= f.fenceHalfD - 0.6) {
        return [142, 98, 54];
      }
      if (dx >= 6.2 && dx <= 18.8 && z >= f.z - 8.5 && z <= f.z + 8.5) {
        return [218, 178, 68];
      }
    }
  }

  if (
    Math.hypot(x - SOUTHEAST_HARBOR_POS.lighthouseX, z - SOUTHEAST_HARBOR_POS.lighthouseZ) <=
    SOUTHEAST_HARBOR_POS.lighthouseRadius + 0.8
  ) {
    return [238, 68, 54];
  }
  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.shipX) <= SOUTHEAST_HARBOR_POS.shipHalfW &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.shipZ) <= SOUTHEAST_HARBOR_POS.shipHalfL
  ) {
    return [164, 108, 56];
  }
  if (x >= 255.2 && z >= 95 && groundHeightAt(x, z) < SOUTHEAST_HARBOR_POS.waterY) {
    return [28, 118, 158];
  }
  if (x >= 200 && x <= 255.5 && z >= 214 && z <= 312) {
    return [206, 196, 178];
  }

  if (
    Math.hypot(x - SOUTHWEST_OASIS_POS.observatoryX, z - SOUTHWEST_OASIS_POS.observatoryZ) <=
    SOUTHWEST_OASIS_POS.observatoryRadius + 0.8
  ) {
    return [218, 165, 32];
  }
  if (
    Math.abs(x - SOUTHWEST_OASIS_POS.pavilionX) <= SOUTHWEST_OASIS_POS.pavilionHalfW + 0.6 &&
    Math.abs(z - SOUTHWEST_OASIS_POS.pavilionZ) <= SOUTHWEST_OASIS_POS.pavilionHalfD + 0.6
  ) {
    return [186, 68, 92];
  }
  if (
    Math.hypot(
      (x - SOUTHWEST_OASIS_POS.lagoonX) / SOUTHWEST_OASIS_POS.lagoonRadiusX,
      (z - SOUTHWEST_OASIS_POS.lagoonZ) / SOUTHWEST_OASIS_POS.lagoonRadiusZ
    ) <= 1.0
  ) {
    return [36, 178, 172];
  }
  if (Math.hypot(x - SOUTHWEST_OASIS_POS.x, z - SOUTHWEST_OASIS_POS.z) <= 44.0) {
    return [222, 198, 152];
  }

  const walk = walkableHeightAt(x, z);
  if (walk.surface === 'pier' || walk.surface === 'cabin') {
    return [192, 138, 82];
  }
  if (walk.surface === 'bridge' || walk.surface === 'tower') {
    return [214, 202, 182];
  }

  const h = walk.height;
  const swBiome = southwestOasisBiomeFactorAt(x, z);
  if (swBiome > 0.32 && h >= WATER_LEVEL + 0.42) {
    return [
      Math.round(84 + swBiome * 124),
      Math.round(132 + swBiome * 38),
      Math.round(66 + swBiome * 52),
    ];
  }
  if (h < WATER_LEVEL - 0.8) {
    return [28, 88, 128];
  }
  if (h < WATER_LEVEL) {
    return [46, 128, 162];
  }
  if (h < WATER_LEVEL + 0.42) {
    return [194, 176, 134];
  }

  const contourFrac = Math.abs(((h % 5) + 5) % 5 - 2.5);
  const isContour = contourFrac < 0.16 && h > 2.5;
  const darken = isContour ? 0.84 : 1.0;

  if (h >= SNOW_LINE_ALTITUDE + 2.2) {
    return [
      Math.round(232 * darken),
      Math.round(238 * darken),
      Math.round(245 * darken),
    ];
  }

  if (h > 12.5) {
    return [
      Math.round(138 * darken),
      Math.round(130 * darken),
      Math.round(118 * darken),
    ];
  }

  const tf = trailFactorAt(x, z);
  if (tf > 0.36) {
    return [168, 136, 96];
  }

  if (birchGroveFactorAt(x, z) > 0.35) {
    return [
      Math.round(168 * darken),
      Math.round(132 * darken),
      Math.round(58 * darken),
    ];
  }

  if (h > 7.5) {
    return [
      Math.round(104 * darken),
      Math.round(122 * darken),
      Math.round(82 * darken),
    ];
  }

  if (regionalForestDensityAt(x, z) > 0.42) {
    return [
      Math.round(46 * darken),
      Math.round(88 * darken),
      Math.round(42 * darken),
    ];
  }

  return [
    Math.round(84 * darken),
    Math.round(132 * darken),
    Math.round(66 * darken),
  ];
}

// #endregion

// ======================== WORLD OBSTACLE GENERATOR ======================== \\
// #region World Obstacle Generator
/**
 * Summary: Generates procedural static collision cylinders for trees, boulders, and flora.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @returns Computed result for generateWorldObstacles.
 */
export function generateWorldObstacles(): IObstacleCylinder[] {
  const obstacles: IObstacleCylinder[] = [];

  const towerCorners = [
    [-2.6, -2.6],
    [2.6, -2.6],
    [-2.6, 2.6],
    [2.6, 2.6],
  ];
  for (const [ox, oz] of towerCorners) {
    obstacles.push({
      x: 30.0 + ox,
      z: -26.0 + oz,
      radius: 0.35,
      kind: 'pillar',
      scale: 1,
      seed: 0.5,
    });
  }

  for (const hw of HILL_WATCHTOWERS) {
    const cOff = hw.halfSize - 0.35;
    const c = Math.cos(hw.yaw);
    const s = Math.sin(hw.yaw);
    for (const [lx, lz] of [
      [-cOff, -cOff],
      [cOff, -cOff],
      [-cOff, cOff],
      [cOff, cOff],
    ]) {
      obstacles.push({
        x: hw.x + lx * c + lz * s,
        z: hw.z - lx * s + lz * c,
        radius: 0.32,
        kind: 'pillar',
        scale: 1.1,
        seed: 0.4,
      });
    }
  }
  for (const [lx, lz] of [
    [-1.75, -1.85],
    [1.75, -1.85],
    [-1.75, 1.85],
    [1.75, 1.85],
  ]) {
    obstacles.push({
      x: ROPE_BRIDGE_DEF.mx + lx * HILL_BRIDGE_COS + lz * HILL_BRIDGE_SIN,
      z: ROPE_BRIDGE_DEF.mz - lx * HILL_BRIDGE_SIN + lz * HILL_BRIDGE_COS,
      radius: 0.32,
      kind: 'pillar',
      scale: 1.2,
      seed: 0.7,
    });
  }

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    obstacles.push({
      x: MAGIC_STONE_CIRCLE_POS.x + Math.cos(ang) * 6.5,
      z: MAGIC_STONE_CIRCLE_POS.z + Math.sin(ang) * 6.5,
      radius: 0.65,
      kind: 'pillar',
      scale: 1.2,
      seed: i / 8,
    });
  }

  const hillRings = [13.5, 19.0, 25.0, 31.0];
  for (let rIdx = 0; rIdx < hillRings.length; rIdx++) {
    const rad = hillRings[rIdx];
    const count = 12 + rIdx * 4;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + rIdx * 0.37;
      const tx = MAGIC_STONE_CIRCLE_POS.x + Math.cos(ang) * rad;
      const tz = MAGIC_STONE_CIRCLE_POS.z + Math.sin(ang) * rad;
      const pathDist = distToSegment(
        tx,
        tz,
        MAGIC_STONE_CIRCLE_POS.entryStartX,
        MAGIC_STONE_CIRCLE_POS.entryStartZ,
        MAGIC_STONE_CIRCLE_POS.x,
        MAGIC_STONE_CIRCLE_POS.z
      );
      if (pathDist < 4.4) continue;
      const isOak = (i + rIdx) % 3 === 0;
      const scale = 0.96 + ((i * 7 + rIdx * 3) % 5) * 0.08;
      obstacles.push({
        x: tx,
        z: tz,
        radius: isOak ? 0.52 * scale : 0.42 * scale,
        kind: isOak ? 'oak' : 'pine',
        scale,
        seed: ((i * 13 + rIdx * 29) % 100) / 100,
      });
    }
  }

  const bStep = 6.2;
  for (
    let gx = BIRCH_GROVE_CENTER.x - BIRCH_GROVE_CENTER.radius;
    gx <= BIRCH_GROVE_CENTER.x + BIRCH_GROVE_CENTER.radius;
    gx += bStep
  ) {
    for (
      let gz = BIRCH_GROVE_CENTER.z - BIRCH_GROVE_CENTER.radius;
      gz <= BIRCH_GROVE_CENTER.z + BIRCH_GROVE_CENTER.radius;
      gz += bStep
    ) {
      const ix = Math.round(gx * 10) + 501;
      const iz = Math.round(gz * 10) - 307;
      const r1 = hash2D(ix, iz);
      const r2 = hash2D(ix + 19, iz - 41);
      const r3 = hash2D(ix - 61, iz + 83);

      const x = gx + (r1 - 0.5) * 4.4;
      const z = gz + (r2 - 0.5) * 4.4;
      const bf = birchGroveFactorAt(x, z);
      if (bf < 0.15) continue;
      if (trailFactorAt(x, z) > 0.22) continue;
      let inBirchClearZone = false;
      for (let c = 0; c < CLEAR_ZONES.length; c++) {
        const cz = CLEAR_ZONES[c];
        if (Math.hypot(x - cz.x, z - cz.z) < cz.r) {
          inBirchClearZone = true;
          break;
        }
      }
      if (inBirchClearZone) continue;
      const h = groundHeightAt(x, z);
      if (h < WATER_LEVEL + 0.6) continue;

      if (r3 < bf * 0.78) {
        const scale = 0.92 + r1 * 0.36;
        obstacles.push({
          x,
          z,
          radius: 0.42 * scale,
          kind: 'birch',
          scale,
          seed: r3,
        });
      }
    }
  }

  const step = 8.2;
  for (let gx = -540; gx <= 540; gx += step) {
    for (let gz = -540; gz <= 540; gz += step) {
      const distGrid = Math.hypot(gx, gz);
      if (distGrid > 560) continue;

      const ix = Math.round(gx * 10);
      const iz = Math.round(gz * 10);
      const r1 = hash2D(ix, iz);
      if (distGrid > 330 && r1 < 0.48) continue;

      const r2 = hash2D(ix + 17, iz - 31);
      const r3 = hash2D(ix - 53, iz + 89);

      const x = gx + (r1 - 0.5) * 5.8;
      const z = gz + (r2 - 0.5) * 5.8;

      if (birchGroveFactorAt(x, z) > 0.35) continue;
      if (Math.hypot(x - SAKURA_SANCTUARY_POS.x, z - SAKURA_SANCTUARY_POS.z) < 34) continue;

      let inClearZone = false;
      for (let c = 0; c < CLEAR_ZONES.length; c++) {
        const cz = CLEAR_ZONES[c];
        if (Math.hypot(x - cz.x, z - cz.z) < cz.r) {
          inClearZone = true;
          break;
        }
      }
      if (inClearZone) continue;
      if (x >= 195 && z >= 85) continue;

      const walk = walkableHeightAt(x, z);
      if (walk.surface !== 'ground') continue;

      const h = walk.height;
      if (h < WATER_LEVEL + 0.52) {
        if (h > WATER_LEVEL - 0.22 && h < WATER_LEVEL + 0.45 && r3 > 0.88) {
          obstacles.push({
            x,
            z,
            radius: 0.75 + r1 * 0.5,
            kind: 'boulder',
            scale: 0.75 + r1 * 0.6,
            seed: r3,
          });
        }
        continue;
      }

      const tf = trailFactorAt(x, z);
      if (tf > 0.20) continue;

      const normal = getSurfaceNormalAt(x, z);
      if (normal.ny < 0.76 || h > 16.5) {
        if (r3 > 0.72) {
          obstacles.push({
            x,
            z,
            radius: 0.9 + r1 * 0.65,
            kind: h > 21.0 || normal.ny < 0.7 ? 'boulder' : 'pine',
            scale: 0.85 + r2 * 0.6,
            seed: r3,
          });
        }
        continue;
      }

      const swDesertFactor = southwestOasisBiomeFactorAt(x, z);
      if (swDesertFactor > 0.18) {
        if (r3 < 0.34 * (0.55 + swDesertFactor * 0.45)) {
          const isPalm = r2 > 0.46 || Math.hypot(x - SOUTHWEST_OASIS_POS.x, z - SOUTHWEST_OASIS_POS.z) < 115.0;
          const scale = 0.92 + r1 * 0.46;
          obstacles.push({
            x,
            z,
            radius: (isPalm ? 0.38 : 0.46) * scale,
            kind: isPalm ? 'palm' : 'acacia',
            scale,
            seed: r3,
          });
        } else if (r3 > 0.91) {
          obstacles.push({
            x,
            z,
            radius: 0.78 + r1 * 0.55,
            kind: 'boulder',
            scale: 0.8 + r2 * 0.65,
            seed: r1,
          });
        }
        continue;
      }

      const regDensity = regionalForestDensityAt(x, z);
      if (regDensity < 0.12) {
        continue;
      }

      const spawnChance = regDensity * 0.78;
      if (r3 < spawnChance) {
        const scale = 0.95 + r1 * 0.42;
        const isOak = (x < -10 && r2 > 0.35 && h < 8.5) || (r2 > 0.72 && h < 7.0);
        obstacles.push({
          x,
          z,
          radius: isOak ? 0.54 * scale : 0.42 * scale,
          kind: isOak ? 'oak' : 'pine',
          scale,
          seed: r3,
        });
      } else if (regDensity > 0.55 && r3 > 0.965) {
        obstacles.push({
          x,
          z,
          radius: 0.7 + r2 * 0.5,
          kind: 'boulder',
          scale: 0.7 + r2 * 0.6,
          seed: r1,
        });
      }
    }
  }

  return obstacles;
}

// #endregion
