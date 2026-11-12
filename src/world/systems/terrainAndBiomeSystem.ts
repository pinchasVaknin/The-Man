// ============================================================================
// MODULE: World / Systems / Terrain And Biome
// DESIGN: Continuous procedural heightfield math, walkable geometry, and biome layers (SRP)
// SUMMARY: Computes analytical ground elevation, roofs, stairs, water basins,
//          surface biomes, surface normals, and world obstacle placement.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { t } from '../../locales';
import type { BiomeType, IObstacleCylinder } from '../domain/worldTypes';
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
  BEAR_MOUNTAIN_CAVES,
  SOUTHERN_RIVER_WAYPOINTS,
  SOUTHERN_RIVER_SWAMP_BRANCH_WAYPOINTS,
  SOUTHERN_RIVER_BRIDGE_POS,
  CROCODILE_RIVER_BEND_POS,
  MURKY_SWAMP_BIOME_POS,
  VOLCANO_SANCTUM_POS,
  RUINED_ATLANTIS_POS,
  FLOATING_BLOOMING_ISLANDS,
  FLOATING_ISLAND_STAIR_POS,
  SOUTHERN_DRAGON_RUINS_POS,
  DESERT_DRAGON_PASS_POS,
  NORDIC_FROST_SHRINE_POS,
  DESERT_PYRAMID_SANCTUARY_POS,
  SMUGGLER_ISLAND_POS,
  southernRiverBridgeHeightAt,
  floatingBloomingIslandHeightAt,
  desertPyramidHeightAt,
  FLAT_BUILDING_TERRACES,
  CLEAR_ZONES,
} from '../domain/landmarksRegistry';
import {
  southernMineCeilingHeightAt,
  southernMineWalkableHeightAt,
  isInsideSouthernMine,
  isInsideSouthernMineLagoonBasin,
  DWARVEN_RIDEABLE_MINECART_LINES,
  DWARVEN_MINECART_ROUTES,
} from './dwarvenMineAndCaravanSystem';
import {
  getActiveSailableShip,
  sailableShipDeckHeightAt,
} from './sailableShipSystem';

const FZ = FORTRESS_Z_OFFSET;
const FY = FORTRESS_Y_OFFSET;
// #endregion

// ======================== REGIONAL BIOME FACTORS ======================== \\
// #region Regional Biome Factors
/**
 * Summary: Evaluates radial falloff factor for the Orange Birch Grove landmark.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns 1 inside the birch grove, fading to 0 at its edge.
 */
export function birchGroveFactorAt(x: number, z: number): number {
  const d = Math.hypot(x - BIRCH_GROVE_CENTER.x, z - BIRCH_GROVE_CENTER.z);
  if (d > BIRCH_GROVE_CENTER.radius + 18.0) return 0;
  const warp = d > 22.0 ? fbm2D(x * 0.035 + 1.7, z * 0.035 - 2.9, 2) * 14.0 : 0;
  return 1.0 - smoothstep(BIRCH_GROVE_CENTER.radius * 0.45, BIRCH_GROVE_CENTER.radius, d + warp);
}

/**
 * Summary: Computes the continuous North-to-South organic Eastern Sea coastline X coordinate for a given Z.
 * Design: Creates natural bays, headlands, and sandy coves from z = -900 to z = +900 while pinning
 *         the Harbor Quay (z in 212..312) to x = 255.2 and aligning river mouths.
 */
export function easternCoastlineXAt(z: number): number {
  const wave1 = Math.sin(z * 0.0105 + 0.4) * 22.0;
  const wave2 = Math.cos(z * 0.024 - 1.1) * 11.5;
  const wave3 = Math.sin(z * 0.052 + 2.2) * 5.0;
  const noiseShift = fbm2D(z * 0.0075 + 1.9, z * 0.0045 - 3.1, 2) * 18.0;
  const naturalCoastX = 264.0 + wave1 + wave2 + wave3 + noiseShift;

  // Keep Harbor Quay & Lighthouse headland exact across z in [205, 320]
  const harborPin =
    smoothstep(182.0, 210.0, z) * (1.0 - smoothstep(314.0, 342.0, z));
  // Keep Southern River lower estuary mouth aligned around z = 785
  const southMouthPin =
    smoothstep(752.0, 774.0, z) * (1.0 - smoothstep(794.0, 818.0, z));

  const pinnedHarborX =
    naturalCoastX * (1.0 - harborPin) + 255.2 * harborPin;
  return pinnedHarborX * (1.0 - southMouthPin) + 256.0 * southMouthPin;
}

/**
 * Summary: Scenic offshore rocky islands dotting the continuous Eastern Sea.
 */
const EASTERN_SEA_ISLANDS = [
  { x: 348.0, z: -265.0, r: 24.0, h: 6.4 },
  { x: 376.0, z: -105.0, r: 20.0, h: 5.2 },
  { x: 358.0, z: 435.0, r: 25.0, h: 6.8 },
  { x: 372.0, z: 665.0, r: 21.0, h: 5.5 },
] as const;

/**
 * Summary: Evaluates non-linear multi-stage transition into the Southwest Savanna, Terracotta Canyons,
 *          Golden Desert Oasis, and the far-southwest Dragon Ruins basin (-540, 540).
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns 0 in central meadow, 0.1..0.45 in Golden Savanna, 0.45..0.75 in Terracotta Steppe, 0.75..1.0 in Deep Desert.
 */
export function southwestOasisBiomeFactorAt(x: number, z: number): number {
  if (x > -75 || z < 85) return 0;
  const farmWestDist = Math.hypot(x - VALLEY_FARMS[0].x, z - VALLEY_FARMS[0].z);
  const farmProtect =
    1.0 - smoothstep(VALLEY_FARMS[0].clearRadius - 4.0, VALLEY_FARMS[0].clearRadius + 14.0, farmWestDist);

  const warp1 = fbm2D(x * 0.011 + 2.3, z * 0.011 - 4.1, 2) * 34.0;
  const warp2 = fbm2D(x * 0.024 - 5.7, z * 0.024 + 1.9, 2) * 14.0;

  // Outer Savanna & Dry Steppe ecotone belt starting gently from (-95, 115)
  const savannaWest = smoothstep(-85.0, -210.0, x + warp1 * 0.85);
  const savannaSouth = smoothstep(95.0, 225.0, z - warp1 * 0.65);
  const savannaBuffer = savannaWest * savannaSouth * 0.42;

  const westProgress = smoothstep(-125.0, -215.0, x + warp1 + warp2);
  const southProgress = smoothstep(155.0, 235.0, z - warp1 * 0.75 + warp2);
  const diagonalProgress = smoothstep(285.0, 405.0, -x + z + warp1 * 1.1);

  const regionalExpanse = Math.max(
    savannaBuffer,
    westProgress * southProgress,
    diagonalProgress * smoothstep(-120.0, -175.0, x) * smoothstep(150.0, 195.0, z)
  );

  const oasisCoreDist = Math.hypot(x - SOUTHWEST_OASIS_POS.x, z - SOUTHWEST_OASIS_POS.z);
  const oasisCore = 1.0 - smoothstep(68.0, 145.0, oasisCoreDist);

  // Far-Southwest Desert Basin & Dragon Ruins Sanctuary (-540, 540) + Ancient Sun Pyramid (-475, 295)
  const dragonRuinsDist = Math.hypot(
    x - SOUTHERN_DRAGON_RUINS_POS.x,
    z - SOUTHERN_DRAGON_RUINS_POS.z
  );
  const dragonDesertCore = 1.0 - smoothstep(140.0, 260.0, dragonRuinsDist);
  const pyramidDist = Math.hypot(
    x - DESERT_PYRAMID_SANCTUARY_POS.x,
    z - DESERT_PYRAMID_SANCTUARY_POS.z
  );
  const pyramidDesertCore = 1.0 - smoothstep(105.0, 210.0, pyramidDist);

  const swampSuppress = murkySwampBiomeFactorAt(x, z);

  return Math.max(
    0,
    Math.min(
      1,
      Math.max(regionalExpanse, oasisCore, dragonDesertCore, pyramidDesertCore) *
        (1.0 - farmProtect) *
        (1.0 - swampSuppress * 0.96)
    )
  );
}

/**
 * Summary: Evaluates radial transition factor for the Murky Swamp & Hippo Marshland Biome (-175, 435).
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns 0 outside the swamp, ramping smoothly to 1 inside the marshland basin.
 */
/**
 * Summary: Share of the terrain at (x, z) that a flat building terrace leaves to the terrace itself.
 * Design: 0 inside a terrace's flat core, 1 outside every terrace. Broad basins (the Murky Swamp)
 *         multiply their blend by this so they never overwrite a terrace footprint built on top of them.
 */
function terraceKeepAt(x: number, z: number): number {
  let keep = 1.0;
  for (let i = 0; i < FLAT_BUILDING_TERRACES.length; i++) {
    const t = FLAT_BUILDING_TERRACES[i];
    const td = Math.hypot(x - t.x, z - t.z);
    if (td < t.outerR) {
      keep = Math.min(keep, 1.0 - (1.0 - smoothstep(t.innerR, t.outerR, td)));
    }
  }
  return keep;
}

export function murkySwampBiomeFactorAt(x: number, z: number): number {
  const dx = x - MURKY_SWAMP_BIOME_POS.x;
  const dz = z - MURKY_SWAMP_BIOME_POS.z;
  if (Math.abs(dx) > MURKY_SWAMP_BIOME_POS.outerRadius + 24.0 || Math.abs(dz) > MURKY_SWAMP_BIOME_POS.outerRadius + 24.0) {
    return 0;
  }
  const d = Math.hypot(dx * 0.95, dz * 1.04);
  if (d > MURKY_SWAMP_BIOME_POS.outerRadius + 20.0) return 0;
  const warp = fbm2D(x * 0.028 + 3.7, z * 0.028 - 2.1, 2) * 14.0;
  const radial = 1.0 - smoothstep(MURKY_SWAMP_BIOME_POS.innerRadius * 0.55, MURKY_SWAMP_BIOME_POS.outerRadius, d + warp);
  // Keep the swamp factor at 0 across the Southern Dwarven Mine mountain footprint so the underground cavern roof never pokes out
  const distToMine = Math.hypot(x - SOUTHERN_MINE_POS.x, z - SOUTHERN_MINE_POS.z);
  const mineClearance = smoothstep(52.0, 68.0, distToMine);
  return radial * mineClearance;
}

/**
 * Summary: Evaluates gradual multi-stage transition into the Western Basalt Foothills, Scorched Ashlands,
 *          and Volcano Sanctum at VOLCANO_SANCTUM_POS (-620, 115).
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns 0 outside the foothills, 0.1..0.45 in Basalt Foothills, 0.45..1.0 in Scorched Ashlands & Volcano.
 */
export function volcanicBadlandsFactorAt(x: number, z: number): number {
  const dx = x - VOLCANO_SANCTUM_POS.x;
  const dz = z - VOLCANO_SANCTUM_POS.z;
  if (Math.abs(dx) > 365.0 || Math.abs(dz) > 365.0) return 0;
  const dist = Math.hypot(dx * 0.94, dz * 1.02);
  if (dist > 350.0) return 0;
  const warp = fbm2D(x * 0.016 + 4.7, z * 0.016 - 3.2, 2) * 34.0;
  const coreAsh = 1.0 - smoothstep(125.0, 245.0, dist + warp * 0.8);
  const outerFoothills = (1.0 - smoothstep(185.0, 335.0, dist + warp)) * 0.46;
  return Math.max(coreAsh, outerFoothills);
}

/**
 * Summary: Evaluates the gradual Northern Taiga-to-Frost-Tundra ecotone transition before the Alpine Snowline.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns 0 in temperate meadows, rising smoothly to 1 in sub-alpine northern tundra.
 */
export function northernTundraFactorAt(x: number, z: number): number {
  if (z > -38.0 || isChineseFortressWalkableZone(x, z)) return 0;
  const warp = fbm2D(x * 0.015 - 2.1, z * 0.015 + 4.3, 2) * 24.0;
  const latFactor = smoothstep(-45.0, -155.0, z + warp);
  const h = groundHeightAt(x, z);
  const altFactor = smoothstep(6.8, SNOW_LINE_ALTITUDE, h);
  return Math.max(0, Math.min(1, latFactor * (0.38 + 0.62 * altFactor)));
}

/**
 * Summary: Computes the walkable elevation along the Southern Cliffside Mountain Pass Trail
 *          carved into the mountainside west of the Southern River Gorge (x in 94.8..101.4, z in 512..682).
 * Design: Rises smoothly from valley floor (2.15m at z=512) up to an elevated cliffside bench (11.4m at z=556..638)
 *         high above the Crocodile River Gorge, then descends smoothly back to 2.15m at z=682.
 */
export function southernCliffsidePassTrailHeightAt(z: number): number {
  if (z <= 512.0 || z >= 682.0) return 2.15;
  const northClimb = smoothstep(512.0, 556.0, z);
  const southDescent = 1.0 - smoothstep(638.0, 682.0, z);
  const passArch = Math.sin(Math.max(0, Math.min(1, (z - 550.0) / 94.0)) * Math.PI) * 1.15;
  return 2.15 + northClimb * southDescent * (9.25 + passArch);
}

/**
 * Summary: Calculates composite regional density of forest trees across the landscape.
 * Design: Contrasts the open pastoral farming valley against deep unbuilt northern, western, and southern forests.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns Relative tree density at the point (0 = no forest).
 */
export function regionalForestDensityAt(x: number, z: number): number {
  const westForestDist = Math.hypot((x + 95) * 0.72, (z + 10) * 0.82);
  const westDense = 1.0 - smoothstep(48, 148, westForestDist);

  const southWestForestDist = Math.hypot((x + 112) * 0.68, (z - 218) * 0.72);
  const southWestDense = (1.0 - smoothstep(46, 126, southWestForestDist)) * 0.96;

  const southEastForestDist = Math.hypot((x - 82) * 0.74, (z - 208) * 0.78);
  const southEastDense = (1.0 - smoothstep(46, 118, southEastForestDist)) * 0.95;

  const deepSouthRiverForestDist = Math.hypot((x - 65) * 0.45, (z - 395) * 0.55);
  const deepSouthDense = (1.0 - smoothstep(65, 185, deepSouthRiverForestDist)) * 0.94;

  const eastBirch = birchGroveFactorAt(x, z);

  const northBeltDist = Math.hypot((x - 10) * 0.7, (z + 75) * 1.1);
  const northBelt = (1.0 - smoothstep(30, 110, northBeltDist)) * 0.88;

  // Keep the rural agricultural valley pastoral and open around the farms & central meadow corridor
  const openValleyDist = Math.hypot((x - 4) * 0.95, (z - 115) * 0.65);
  let openValleySuppress = 1.0 - smoothstep(28, 64, openValleyDist);
  for (let i = 0; i < VALLEY_FARMS.length; i++) {
    const f = VALLEY_FARMS[i];
    const fd = Math.hypot(x - f.x, z - f.z);
    if (fd < f.clearRadius + 8) {
      openValleySuppress = Math.max(
        openValleySuppress,
        1.0 - smoothstep(f.clearRadius - 6, f.clearRadius + 8, fd)
      );
    }
  }

  // Keep Southern Mine entrance plaza clear of dense forest
  const mineEntranceDist = Math.hypot(x - SOUTHERN_MINE_POS.x, z - (SOUTHERN_MINE_POS.entranceZ - 8));
  if (mineEntranceDist < 34) {
    openValleySuppress = Math.max(openValleySuppress, 1.0 - smoothstep(18, 34, mineEntranceDist));
  }

  // Suppress green forest inside the Western Volcanic Badlands
  const volBadlands = volcanicBadlandsFactorAt(x, z);
  if (volBadlands > 0.05) {
    openValleySuppress = Math.max(openValleySuppress, Math.min(1.0, volBadlands * 1.25));
  }

  const macroPatch = fbm2D(x * 0.012 + 3.1, z * 0.012 - 5.2, 2) * 0.5 + 0.5;
  const baseRegional = Math.max(
    westDense,
    southWestDense,
    southEastDense,
    deepSouthDense,
    eastBirch,
    northBelt,
    macroPatch * 0.45
  );
  return Math.max(0, Math.min(1, baseRegional * (1.0 - openValleySuppress * 0.98)));
}

/**
 * Summary: Computes minimum distance from (x, z) to the Southern River centerline segments,
 *          including the fork after the Mountain Gorge Pass that branches both to the Sea and into the Hippo Swamp.
 */
export function southernRiverDistanceAt(x: number, z: number): number {
  if (x < -340 || x > 285 || z < 310 || z > 1040) return 999;
  let minD = 999;
  for (let i = 0; i < SOUTHERN_RIVER_WAYPOINTS.length - 1; i++) {
    const a = SOUTHERN_RIVER_WAYPOINTS[i];
    const b = SOUTHERN_RIVER_WAYPOINTS[i + 1];
    const d = distToSegment(x, z, a.x, a.z, b.x, b.z);
    if (d < minD) minD = d;
  }
  for (let i = 0; i < SOUTHERN_RIVER_SWAMP_BRANCH_WAYPOINTS.length - 1; i++) {
    const a = SOUTHERN_RIVER_SWAMP_BRANCH_WAYPOINTS[i];
    const b = SOUTHERN_RIVER_SWAMP_BRANCH_WAYPOINTS[i + 1];
    const d = distToSegment(x, z, a.x, a.z, b.x, b.z);
    if (d < minD) minD = d;
  }
  return minD;
}

// #endregion

// ======================== ROOF & SHELTER QUERIES ======================== \\
// #region Roof & Shelter Queries
/**
 * Summary: Checks if world coordinates (x, z, currentY) are inside a Bear Mountain Cave's
 *          entrance tunnel (lz: -6.2..+5.8, |lx| <= 4.4) or spacious subterranean cavern
 *          (lz: -25.0..-5.0, width 20.4m).
 */
export function isInsideBearCave(
  x: number,
  z: number,
  currentY?: number
): {
  cave: (typeof BEAR_MOUNTAIN_CAVES)[number];
  floorY: number;
  ceilingY: number;
  inTunnel: boolean;
  inCavern: boolean;
  lx: number;
  lz: number;
} | null {
  for (let i = 0; i < BEAR_MOUNTAIN_CAVES.length; i++) {
    const cave = BEAR_MOUNTAIN_CAVES[i];
    const dx = x - cave.x;
    const dz = z - cave.z;
    if (Math.abs(dx) > 32.0 || Math.abs(dz) > 32.0) continue;

    const sinY = Math.sin(cave.facingYaw);
    const cosY = Math.cos(cave.facingYaw);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY; // +lz points out of tunnel mouth, -lz goes deep into the mountain

    // 1. Sheltered Entrance Tunnel & Portal Threshold: lz in [-8.5, +11.2], width 9.7m (|lx| <= 4.85), arched ceiling 4.85m high
    //    Wide enough to cover the entire collision corridor (|lx| <= 3.8) plus third-person camera shoulder offset!
    const inTunnel = lz >= -8.5 && lz <= 11.2 && Math.abs(lx) <= 4.85;
    // 2. Spacious Subterranean Cavern inside the mountain: centered at (lx=0, lz=-15.0), rx=11.4m, rz=10.6m
    const cavNormSq = (lx / 11.4) * (lx / 11.4) + ((lz + 15.0) / 10.6) * ((lz + 15.0) / 10.6);
    const inCavern = lz <= -4.5 && lz >= -25.4 && cavNormSq <= 1.0;

    if (inTunnel || inCavern) {
      const tunnelCeiling = cave.floorY + 4.85 - 0.05 * lx * lx;
      const cavernCeiling = cave.floorY + 6.6 - 1.4 * Math.min(1.0, cavNormSq);
      const ceilingY =
        inCavern && !inTunnel
          ? cavernCeiling
          : inTunnel && !inCavern
            ? tunnelCeiling
            : Math.max(tunnelCeiling, cavernCeiling);

      // Entities high above the cave ceiling are walking on the exterior mountain peak above the cave
      if (currentY !== undefined && currentY > ceilingY + 2.2) {
        return null;
      }
      return { cave, floorY: cave.floorY, ceilingY, inTunnel, inCavern, lx, lz };
    }
  }
  return null;
}

/**
 * Summary: Checks if world coordinates (x, z, currentY) are inside the Colossal Volcano Sanctum's
 *          3 cardinal baffled obsidian entrance corridors (East +X, North -Z, South +Z)
 *          or inner 60m-diameter subterranean magma boss chamber.
 */
export function isInsideVolcanoSanctum(
  x: number,
  z: number,
  currentY?: number
): {
  floorY: number;
  ceilingY: number;
  inTunnel: boolean;
  inChamber: boolean;
} | null {
  const dx = x - VOLCANO_SANCTUM_POS.x;
  const dz = z - VOLCANO_SANCTUM_POS.z;
  if (Math.abs(dx) > 98.0 || Math.abs(dz) > 98.0) return null;

  const isInsideCardinalCorridor = (along: number, perp: number): boolean => {
    if (along < 26.0 || along > 96.5) return false;
    const absPerp = Math.abs(perp);
    const allowedHalfW = along >= 45.0 && along <= 69.0 ? 11.4 : 5.2;
    return absPerp <= allowedHalfW;
  };

  // 3 Cardinal Entrance Corridors: East (+dx), North (-dz), South (+dz)
  const inEastTunnel = isInsideCardinalCorridor(dx, dz);
  const inNorthTunnel = isInsideCardinalCorridor(-dz, dx);
  const inSouthTunnel = isInsideCardinalCorridor(dz, dx);
  const inTunnel = inEastTunnel || inNorthTunnel || inSouthTunnel;

  // Colossal Inner Volcanic Boss Chamber: centered at (-620, 115), radius 30.0m (60m diameter)
  const chamberDist = Math.hypot(dx, dz);
  const inChamber = chamberDist <= VOLCANO_SANCTUM_POS.chamberRadius;

  if (!inTunnel && !inChamber) return null;

  // Raised central throne dais at (-621, 115) for the King CatLion
  const daisDist = Math.hypot(x - (VOLCANO_SANCTUM_POS.x - 1.0), z - VOLCANO_SANCTUM_POS.z);
  const daisBlend = inChamber ? 1.0 - smoothstep(4.5, 7.2, daisDist) : 0.0;
  const floorY =
    VOLCANO_SANCTUM_POS.floorY +
    daisBlend * (VOLCANO_SANCTUM_POS.daisY - VOLCANO_SANCTUM_POS.floorY);

  const tunnelCeiling = VOLCANO_SANCTUM_POS.floorY + 9.6;
  const chamberCeiling =
    VOLCANO_SANCTUM_POS.floorY +
    21.5 -
    3.6 * Math.min(1, (chamberDist / VOLCANO_SANCTUM_POS.chamberRadius) ** 2);
  const ceilingY = inChamber ? chamberCeiling : tunnelCeiling;

  if (currentY !== undefined && currentY > ceilingY + 2.5) {
    return null;
  }
  return { floorY, ceilingY, inTunnel, inChamber };
}

/**
 * Summary: Queries the elevation of overhead roofs and ceilings at the given coordinate.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns Height of the roof above the point in meters, or null in the open.
 */
export function getRoofHeightAt(x: number, z: number): number | null {
  const bearCave = isInsideBearCave(x, z);
  if (bearCave && bearCave.lz <= 6.2) {
    return bearCave.ceilingY;
  }
  const volcano = isInsideVolcanoSanctum(x, z);
  if (volcano && Math.hypot(x - VOLCANO_SANCTUM_POS.x, z - VOLCANO_SANCTUM_POS.z) <= 95.5) {
    return volcano.ceilingY;
  }
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
    return southernMineCeilingHeightAt(x, z);
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
 * @param x World X in meters.
 * @param y World Y (height) in meters.
 * @param z World Z in meters.
 * @returns True under a roof or ceiling.
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
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns 1 on a trail centre line, fading to 0 away from it.
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
    distToSegment(x, z, DWARVEN_STONE_HOUSES[3].doorX, DWARVEN_STONE_HOUSES[3].doorZ, SOUTHERN_MINE_POS.x, DWARVEN_STONE_HOUSES[3].doorZ),
    distToSegment(x, z, 185, 228, 196, 336),
    distToSegment(x, z, 196, 336, 204, 378),
    distToSegment(x, z, 204, 378, 152, 378),
    distToSegment(x, z, 152, 378, 96, 428),
    distToSegment(x, z, 96, 428, 98.2, 512),
    distToSegment(x, z, 98.2, 512, 98.2, 600),
    distToSegment(x, z, 98.2, 600, 98.2, 682),
    distToSegment(x, z, 98.2, 682, 105, 715),
    // Southwest Desert Caravan Trail through the Narrow Mountain Pass into the Dragon Ruins (-540, 540)
    distToSegment(
      x,
      z,
      SOUTHWEST_OASIS_POS.fountainX,
      SOUTHWEST_OASIS_POS.fountainZ,
      -362.0,
      358.0
    ),
    distToSegment(
      x,
      z,
      -362.0,
      358.0,
      DESERT_DRAGON_PASS_POS.entryX,
      DESERT_DRAGON_PASS_POS.entryZ
    ),
    distToSegment(
      x,
      z,
      DESERT_DRAGON_PASS_POS.entryX,
      DESERT_DRAGON_PASS_POS.entryZ,
      DESERT_DRAGON_PASS_POS.gorgeX,
      DESERT_DRAGON_PASS_POS.gorgeZ
    ),
    distToSegment(
      x,
      z,
      DESERT_DRAGON_PASS_POS.gorgeX,
      DESERT_DRAGON_PASS_POS.gorgeZ,
      DESERT_DRAGON_PASS_POS.exitX,
      DESERT_DRAGON_PASS_POS.exitZ
    ),
    distToSegment(
      x,
      z,
      DESERT_DRAGON_PASS_POS.exitX,
      DESERT_DRAGON_PASS_POS.exitZ,
      SOUTHERN_DRAGON_RUINS_POS.x,
      SOUTHERN_DRAGON_RUINS_POS.z - 36.0
    ),
    // Western Desert Caravan Trail connecting Desert Oasis (-310, 300) -> Ancient Sun Pyramid Plaza (-445, 295) -> Dragon Canyon Pass (-405, 405)
    distToSegment(
      x,
      z,
      SOUTHWEST_OASIS_POS.fountainX,
      SOUTHWEST_OASIS_POS.fountainZ,
      DESERT_PYRAMID_SANCTUARY_POS.rampMaxX + 4.0,
      DESERT_PYRAMID_SANCTUARY_POS.z
    ),
    distToSegment(
      x,
      z,
      DESERT_PYRAMID_SANCTUARY_POS.rampMaxX + 4.0,
      DESERT_PYRAMID_SANCTUARY_POS.z,
      DESERT_DRAGON_PASS_POS.entryX,
      DESERT_DRAGON_PASS_POS.entryZ
    )
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
    distToSegment(x, z, -42, -30, -85, -105),
    distToSegment(x, z, -85, -105, -195, -195),
    distToSegment(x, z, -195, -195, NORDIC_FROST_SHRINE_POS.x, NORDIC_FROST_SHRINE_POS.z + 14.0)
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
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns Terrain height in meters.
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
    const segDist = Math.min(
      distToSegment(x, z, 18, 2, 175, -92),
      distToSegment(x, z, 175, -92, 272, -138)
    );
    const meander = Math.sin(x * 0.065) * 3.2;
    const effDist = Math.abs(segDist + meander * 0.35);
    riverDepth = (1.0 - smoothstep(2.4, 8.2, effDist)) * 4.2;
  }

  const westLagoonDist = Math.hypot((x + 138) * 0.88, (z - 42) * 1.12);
  const westLagoonDepth = (1.0 - smoothstep(9.0, 29.5, westLagoonDist)) * 5.2;

  const poolDist = Math.hypot(x - WATERFALL_POOL_POS.x, z - WATERFALL_POOL_POS.z);
  const poolDepth = (1.0 - smoothstep(5.5, 13.5, poolDist)) * 3.8;
  const streamDist = distToSegment(x, z, WATERFALL_POOL_POS.x, WATERFALL_POOL_POS.z, -16, -8);
  const streamDepth = (1.0 - smoothstep(1.8, 5.2, streamDist)) * 2.6;

  // Southern River flowing from the Sea at (256, 330) south-southwest through the Grand Bridge (178, 378),
  // into the Crocodile River Bend Lagoon at (132, 475), south through the Mountain Gorge Pass (118, 545..655),
  // and splitting after the Mountain Gorge Ridge into:
  //   1) East-Southeast branch back to the Sea at (258, 785)
  //   2) West-Central branch flowing south of the extended mountain ridge into the vast Hippo Swamp at (-95, 785)
  let southRiverDepth = 0;
  if (x >= -340 && x <= 285 && z >= 315 && z <= 1040) {
    const sDist = southernRiverDistanceAt(x, z);
    const bridgeKeepStraight =
      Math.abs(z - SOUTHERN_RIVER_BRIDGE_POS.z) < 22.0
        ? smoothstep(22.0, 8.0, Math.abs(z - SOUTHERN_RIVER_BRIDGE_POS.z))
        : 0;
    const gorgeKeepStraight =
      z >= 525.0 && z <= 670.0
        ? smoothstep(525.0, 545.0, z) * (1.0 - smoothstep(650.0, 670.0, z))
        : 0;
    const straightWeight = Math.max(bridgeKeepStraight, gorgeKeepStraight);
    const meander = Math.sin(z * 0.055 + x * 0.03) * 2.4 * (1.0 - straightWeight);
    const effSouthDist = Math.abs(sDist + meander * 0.4);
    southRiverDepth = (1.0 - smoothstep(5.0, 11.8, effSouthDist)) * 5.2;

    // Crocodile River Bend Lagoon & Basking Mudbanks at (132, 475)
    const bendDist = Math.hypot(
      x - CROCODILE_RIVER_BEND_POS.x,
      z - CROCODILE_RIVER_BEND_POS.z
    );
    if (bendDist < CROCODILE_RIVER_BEND_POS.radius + 8.0) {
      const lagoonCarve = (1.0 - smoothstep(14.0, CROCODILE_RIVER_BEND_POS.radius + 4.0, bendDist)) * 3.4;
      southRiverDepth = Math.max(southRiverDepth, lagoonCarve);
    }
  }

  const totalWaterCarve = Math.max(
    lakeDepthMain,
    channelDepth,
    riverDepth,
    westLagoonDepth,
    poolDepth,
    streamDepth,
    southRiverDepth
  );
  h -= totalWaterCarve;

  // Sculpt low basking mudbanks/sandbars inside the Crocodile River Bend so crocodiles can bask just above water
  if (x >= 96 && x <= 168 && z >= 442 && z <= 508) {
    const bank1Dist = Math.hypot((x - 122.0) * 0.9, (z - 468.0) * 1.1);
    const bank2Dist = Math.hypot((x - 141.0) * 1.0, (z - 480.0) * 0.9);
    const bankW = Math.max(
      1.0 - smoothstep(3.8, 9.2, bank1Dist),
      1.0 - smoothstep(3.8, 9.2, bank2Dist)
    );
    if (bankW > 0.01) {
      h = h * (1.0 - bankW) + 0.24 * bankW;
    }
  }

  if (totalWaterCarve < 0.15 && h < 0.65) {
    h = 0.65;
  }

  const cliffDist = Math.hypot(x - WATERFALL_CLIFF_POS.x, z - WATERFALL_CLIFF_POS.z);
  if (cliffDist < 25.0) {
    const cliffRise = (1.0 - smoothstep(4.5, 25.0, cliffDist)) * (1.0 - plungePoolSuppress);
    h += cliffRise * 18.5;
  }

  // Suppress mountain flank rise inside the Southern Mountain Gorge channel & riverside pass (x: 92..136, z: 515..685)
  let gorgeCanyonSuppress = 0;
  if (x >= 80 && x <= 152 && z >= 510 && z <= 690) {
    const distFromGorgeAxis = Math.abs(x - 112.0);
    const zInGorge = smoothstep(510.0, 540.0, z) * (1.0 - smoothstep(660.0, 690.0, z));
    gorgeCanyonSuppress = (1.0 - smoothstep(14.5, 28.0, distFromGorgeAxis)) * zInGorge;
  }

  const rawRidgeNoise = fbm2D(x * 0.035, z * 0.035, 2);
  for (let i = 0; i < WALKABLE_MOUNTAINS.length; i++) {
    const m = WALKABLE_MOUNTAINS[i];
    const md = Math.hypot(x - m.x, z - m.z);
    if (md < m.radius) {
      const rise = (1.0 - smoothstep(6.5, m.radius, md)) * (1.0 - Math.max(plungePoolSuppress, gorgeCanyonSuppress));
      const flankDetail = 1.0 + smoothstep(10.0, 26.0, md) * Math.min(0.04, rawRidgeNoise * 0.14);
      h += rise * m.height * flankDetail;
    }
  }

  // Impassable Southern Mountain Barrier Ranges flanking the Southern River Gorge:
  // 1) Eastern Mountain Range: Continuous high, steep alpine ridge from the East bank of the Southern River (x = 131)
  //    all the way East to the Sea coastline (x = 262) along z ≈ 535..665.
  if (x >= 125.0 && x <= 265.0 && z >= 522.0 && z <= 676.0) {
    const eastRidgeAxisZ = 598.0 + Math.sin((x - 130.0) * 0.045) * 6.0;
    const distFromEastAxis = Math.abs(z - eastRidgeAxisZ);
    const xEnvelope =
      smoothstep(126.5, 141.0, x) * (1.0 - smoothstep(246.0, 260.0, x));
    const zEnvelope = 1.0 - smoothstep(14.0, 62.0, distFromEastAxis);
    const eastBarrierW = xEnvelope * zEnvelope;
    if (eastBarrierW > 0.005) {
      const crag =
        Math.abs(fbm2D(x * 0.048 + 3.1, z * 0.048 - 2.7, 3)) * 9.5 +
        Math.sin(x * 0.11 + z * 0.09) * 2.2;
      const targetEastMtnH = 4.0 + Math.pow(eastBarrierW, 0.78) * (49.0 + crag);
      h = Math.max(h, targetEastMtnH);
    }
  }

  // 2) Extended Western Gorge Mountain Ridge: Continuous craggy mountain ridge running West from the
  //    Cliffside Mountain Pass Trail (x = 94.5) all the way across the central-south border (x = 88..-260, z ≈ 592..610),
  //    bounding the vast southern Hippo Marshland on its northern side!
  if (x >= -315.0 && x <= 102.0 && z >= 522.0 && z <= 685.0) {
    const warpZ = Math.sin(x * 0.042) * 12.0 + fbm2D(x * 0.025 + 1.4, z * 0.025 - 2.1, 2) * 18.0;
    const warpedZ = z + warpZ * (x < 68.0 ? 1.0 : 0.0);
    const barrierDist = Math.min(
      distToSegment(x, warpedZ, 88.0, 596.0, -18.0, 610.0),
      distToSegment(x, warpedZ, -18.0, 610.0, -145.0, 604.0),
      distToSegment(x, warpedZ, -145.0, 604.0, -260.0, 592.0)
    );
    // Keep the east end of the Western Range sharply bounded at x <= 94.8 right beside the Cliffside Pass Trail!
    const trailSideCutoff = x > 84.0 ? 1.0 - smoothstep(84.0, 94.8, x) : 1.0;
    const westTaper = 1.0 - smoothstep(-235.0, -305.0, x);
    const westBarrierW = (1.0 - smoothstep(14.0, 58.0, barrierDist)) * trailSideCutoff * westTaper;
    if (westBarrierW > 0.005) {
      const crag =
        Math.abs(fbm2D(x * 0.046 - 4.2, z * 0.046 + 1.9, 3)) * 10.5 +
        Math.cos(x * 0.095 - z * 0.085) * 2.4;
      const targetWestMtnH = 4.0 + Math.pow(westBarrierW, 0.76) * (49.0 + crag);
      h = Math.max(h, targetWestMtnH);
    }
  }

  // 3) Elevated Cliffside Mountain Pass Trail carved into the mountainside above the West bank of the Southern River Gorge
  //    Walkable bench: x in [94.8, 101.4], z in [512.0, 682.0], rising smoothly to 11.4m and descending back to 2.15m.
  if (x >= 91.5 && x <= 105.0 && z >= 510.0 && z <= 684.0) {
    const passTargetH = southernCliffsidePassTrailHeightAt(z);
    const zBlend = smoothstep(510.0, 518.0, z) * (1.0 - smoothstep(676.0, 684.0, z));
    // Flat bench between x = 94.8 (mountain rock wall) and x = 101.4 (cliffside guardrail fence)
    const benchDist =
      x < 94.8 ? 94.8 - x : x > 101.4 ? x - 101.4 : 0.0;
    const benchW = (1.0 - smoothstep(0.0, 3.0, benchDist)) * zBlend;
    if (benchW > 0.005) {
      h = h * (1.0 - benchW) + passTargetH * benchW;
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

  if (r > 1020 && x <= 220) {
    const rimT = smoothstep(1020, 1100, r);
    const ridgeNoise = Math.abs(fbm2D(x * 0.022, z * 0.022, 3));
    h += rimT * (30.0 + ridgeNoise * 38.0);
  }

  // 4) High Desert-End Mountain Barrier & Narrow Canyon Pass shielding the Dragon Ruins (-540, 540)
  //    Towers 46..56m high between the Desert Oasis (-310, 300) and the Dragon Ruins (-540, 540),
  //    with a walkable narrow canyon gorge along (-405, 405) -> (-455, 455) -> (-498, 492) -> (-540, 503).
  if (x <= -320.0 && x >= -760.0 && z >= 320.0 && z <= 760.0) {
    const dRx = x - SOUTHERN_DRAGON_RUINS_POS.x;
    const dRz = z - SOUTHERN_DRAGON_RUINS_POS.z;
    const rawRuinsDist = Math.hypot(dRx, dRz);
    const ridgeWarp =
      rawRuinsDist > 64.0
        ? fbm2D(x * 0.022 + 4.1, z * 0.022 - 1.8, 2) * 26.0 +
          Math.sin(x * 0.045 + z * 0.038) * 9.0
        : 0.0;
    const warpedRuinsDist = rawRuinsDist + ridgeWarp;

    if (rawRuinsDist >= 60.0 && warpedRuinsDist <= 182.0) {
      // Mountain range peaks around warped radius ~108m around the Dragon Ruins
      const innerClimb = smoothstep(62.0, 90.0, rawRuinsDist);
      const outerSlope = 1.0 - smoothstep(122.0, 178.0, warpedRuinsDist);
      const ringProfile = innerClimb * outerSlope;

      // Distance to the Narrow Canyon Pass centerline cutting through the northeastern mountain barrier
      const passSeg1 = distToSegment(
        x,
        z,
        DESERT_DRAGON_PASS_POS.entryX,
        DESERT_DRAGON_PASS_POS.entryZ,
        DESERT_DRAGON_PASS_POS.gorgeX,
        DESERT_DRAGON_PASS_POS.gorgeZ
      );
      const passSeg2 = distToSegment(
        x,
        z,
        DESERT_DRAGON_PASS_POS.gorgeX,
        DESERT_DRAGON_PASS_POS.gorgeZ,
        DESERT_DRAGON_PASS_POS.exitX,
        DESERT_DRAGON_PASS_POS.exitZ
      );
      const passSeg3 = distToSegment(
        x,
        z,
        DESERT_DRAGON_PASS_POS.exitX,
        DESERT_DRAGON_PASS_POS.exitZ,
        SOUTHERN_DRAGON_RUINS_POS.x,
        SOUTHERN_DRAGON_RUINS_POS.z - 36.0
      );
      const passDist = Math.min(passSeg1, passSeg2, passSeg3);

      // Keep the narrow pass floor (~13m wide) completely flat & walkable while sheer canyon walls tower on both sides
      const canyonWallRise = smoothstep(
        DESERT_DRAGON_PASS_POS.halfWidth - 0.6,
        DESERT_DRAGON_PASS_POS.halfWidth + 11.5,
        passDist
      );
      const passFloorFlatten =
        1.0 -
        smoothstep(
          DESERT_DRAGON_PASS_POS.halfWidth - 0.4,
          DESERT_DRAGON_PASS_POS.halfWidth + 5.5,
          passDist
        );

      const desertCrag =
        Math.abs(fbm2D(x * 0.044 + 2.7, z * 0.044 - 3.5, 3)) * 11.0 +
        Math.sin(x * 0.09 - z * 0.08) * 2.5;
      const barrierMtnH =
        SOUTHERN_DRAGON_RUINS_POS.height +
        Math.pow(ringProfile * canyonWallRise, 0.78) * (47.5 + desertCrag);
      h = Math.max(h, barrierMtnH);

      if (passFloorFlatten > 0.005) {
        const passTargetH = SOUTHERN_DRAGON_RUINS_POS.height + 0.12 * Math.sin(passDist * 0.3);
        h = h * (1.0 - passFloorFlatten) + passTargetH * passFloorFlatten;
      }
    }
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

  // Continuous North-to-South Eastern Coastline, Sandy Beaches, Shoals, Offshore Islands & Deep Ocean
  if (x >= 184) {
    const coastLineX = easternCoastlineXAt(z);
    if (x >= coastLineX - 18.0) {
      // Sculpt the Sky-Waterfall lower island at (715, -35) with a flat inner sanctuary (r <= 22m at 3.25m),
      // a gentle 16m-wide walkable shoreline beach (r = 22..38m sloping from 3.25m down to 0.55m wading depth, ny >= 0.96),
      // and a submerged outer reef (r = 38..56m sloping from 0.55m down to the deep ocean floor).
      const skyStairDist = Math.hypot(
        x - (FLOATING_ISLAND_STAIR_POS.waterfallX - 5.0),
        z - FLOATING_ISLAND_STAIR_POS.z
      );
      const skyStairProtect = 1.0 - smoothstep(22.0, 56.0, skyStairDist);

      // Gentle sandy beach transition just inland of coastLineX, then shallow shoals & deep ocean
      const beachSlope =
        smoothstep(coastLineX - 18.0, coastLineX - 3.5, x) *
        (1.0 - smoothstep(coastLineX - 3.5, coastLineX + 1.5, x));
      if (beachSlope > 0.01 && (z < 208.0 || z > 316.0)) {
        const sandyBeachH = 0.48 + (coastLineX - x) * 0.045;
        h = h * (1.0 - beachSlope * 0.72 * (1.0 - skyStairProtect)) +
          sandyBeachH * (beachSlope * 0.72 * (1.0 - skyStairProtect));
      }

      const seaWeight =
        smoothstep(coastLineX - 4.0, coastLineX + 2.5, x) * (1.0 - skyStairProtect);
      if (seaWeight > 0.001) {
        const deepOceanExtra = smoothstep(coastLineX + 18.0, coastLineX + 125.0, x) * -2.8;
        const targetSeaFloor = -6.8 + deepOceanExtra;
        h = h * (1.0 - seaWeight) + targetSeaFloor * seaWeight;
      }

      if (skyStairDist < 56.0) {
        const deepOceanExtra = smoothstep(coastLineX + 18.0, coastLineX + 125.0, x) * -2.8;
        const targetSeaFloor = -6.8 + deepOceanExtra;
        let islandTargetH: number;
        if (skyStairDist <= 22.0) {
          islandTargetH = 3.25;
        } else if (skyStairDist <= 38.0) {
          const shoreT = smoothstep(22.0, 38.0, skyStairDist);
          islandTargetH = 3.25 * (1.0 - shoreT) + 0.55 * shoreT;
        } else {
          const reefT = smoothstep(38.0, 56.0, skyStairDist);
          islandTargetH = 0.55 * (1.0 - reefT) + targetSeaFloor * reefT;
        }
        h = h * (1.0 - skyStairProtect) + islandTargetH * skyStairProtect;
      }

      // Sculpt natural rocky coastal islands in the Eastern Sea + Mid-Ocean Corsair Smuggler Cove Island (540, 185)
      for (let i = 0; i < EASTERN_SEA_ISLANDS.length; i++) {
        const isl = EASTERN_SEA_ISLANDS[i];
        const dIsl = Math.hypot(x - isl.x, z - isl.z);
        if (dIsl < isl.r + 14.0) {
          const islW = 1.0 - smoothstep(isl.r * 0.38, isl.r + 14.0, dIsl);
          const islCrag = fbm2D(x * 0.08 + i * 2.1, z * 0.08 - i * 1.7, 2) * 1.1;
          const islH = -2.5 + islW * (isl.h + 2.5 + islCrag);
          h = Math.max(h, islH);
        }
      }
      const smugglerDist = Math.hypot(x - SMUGGLER_ISLAND_POS.x, z - SMUGGLER_ISLAND_POS.z);
      if (smugglerDist < SMUGGLER_ISLAND_POS.radius + 14.0) {
        const smugglerFlatW = 1.0 - smoothstep(22.0, SMUGGLER_ISLAND_POS.radius, smugglerDist);
        const smugglerSlopeW = 1.0 - smoothstep(SMUGGLER_ISLAND_POS.radius, SMUGGLER_ISLAND_POS.radius + 14.0, smugglerDist);
        const smugglerTargetH =
          -4.5 + smugglerSlopeW * (SMUGGLER_ISLAND_POS.deckY + 4.5);
        h = Math.max(h, smugglerFlatW > 0.85 ? SMUGGLER_ISLAND_POS.deckY : smugglerTargetH);
      }
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
    const dragonDist = Math.hypot(
      x - SOUTHERN_DRAGON_RUINS_POS.x,
      z - SOUTHERN_DRAGON_RUINS_POS.z
    );
    const pyramidDist = Math.hypot(
      x - (DESERT_PYRAMID_SANCTUARY_POS.x + 8.0),
      z - DESERT_PYRAMID_SANCTUARY_POS.z
    );
    const passDist = Math.min(
      distToSegment(
        x,
        z,
        DESERT_DRAGON_PASS_POS.entryX,
        DESERT_DRAGON_PASS_POS.entryZ,
        DESERT_DRAGON_PASS_POS.gorgeX,
        DESERT_DRAGON_PASS_POS.gorgeZ
      ),
      distToSegment(
        x,
        z,
        DESERT_DRAGON_PASS_POS.gorgeX,
        DESERT_DRAGON_PASS_POS.gorgeZ,
        DESERT_DRAGON_PASS_POS.exitX,
        DESERT_DRAGON_PASS_POS.exitZ
      )
    );
    if (oasisDist > 58.0 && dragonDist > 68.0 && pyramidDist > 48.0 && passDist > 14.0) {
      const duneWave =
        Math.sin(x * 0.045 + z * 0.032) * 1.15 +
        fbm2D(x * 0.025 - 3.4, z * 0.025 + 6.1, 2) * 1.65;
      const duneMask =
        smoothstep(58.0, 92.0, oasisDist) *
        smoothstep(68.0, 96.0, dragonDist) *
        smoothstep(48.0, 72.0, pyramidDist) *
        smoothstep(14.0, 26.0, passDist) *
        swFactor;
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

  // Vast Murky Swamp & Hippo Marshland Basin (-95, 790) south of the extended Mountain Ridge:
  // interwoven shallow water channels, 10 large hippo wallow lagoons, shoreline reed shelves, and mossy peat hummock islands
  const swampF = murkySwampBiomeFactorAt(x, z);
  if (swampF > 0.01) {
    const sx = x - MURKY_SWAMP_BIOME_POS.x;
    const sz = z - MURKY_SWAMP_BIOME_POS.z;
    const rawChannelWave =
      Math.sin(sx * 0.058 + Math.cos(sz * 0.052) * 1.65) * 0.52 +
      Math.cos(sz * 0.062 - Math.sin(sx * 0.048) * 1.55) * 0.48 +
      fbm2D(x * 0.034 + 4.1, z * 0.034 - 1.8, 2) * 0.42;

    // 10 expansive hippo wallow lagoons spread across the giant marshland basin
    const d0 = Math.hypot(sx * 0.92, sz * 1.04);
    const d1 = Math.hypot(sx - 58.0, sz + 12.0);
    const d2 = Math.hypot(sx + 62.0, sz - 16.0);
    const d3 = Math.hypot(sx + 16.0, sz + 58.0);
    const d4 = Math.hypot(sx - 22.0, sz - 62.0);
    const d5 = Math.hypot(sx + 108.0, sz + 28.0);
    const d6 = Math.hypot(sx - 104.0, sz - 26.0);
    const d7 = Math.hypot(sx + 92.0, sz - 74.0);
    const d8 = Math.hypot(sx - 76.0, sz + 72.0);
    const d9 = Math.hypot(sx + 28.0, sz - 112.0);

    const w0 = 1.0 - smoothstep(14.0, 32.0, d0);
    const w1 = 1.0 - smoothstep(12.0, 28.0, d1);
    const w2 = 1.0 - smoothstep(13.0, 30.0, d2);
    const w3 = 1.0 - smoothstep(11.0, 26.0, d3);
    const w4 = 1.0 - smoothstep(12.0, 28.0, d4);
    const w5 = 1.0 - smoothstep(11.0, 26.0, d5);
    const w6 = 1.0 - smoothstep(11.0, 26.0, d6);
    const w7 = 1.0 - smoothstep(10.0, 25.0, d7);
    const w8 = 1.0 - smoothstep(10.0, 25.0, d8);
    const w9 = 1.0 - smoothstep(11.0, 27.0, d9);

    const poolSuppress = Math.max(w0, w1, w2, w3, w4, w5, w6, w7, w8, w9);

    // Shoreline reed rings around each lagoon (creates natural +0.05..+0.32m shallow shelves for cattails, bulrushes & logs)
    const minLagoonDist = Math.min(d0, d1, d2, d3, d4, d5, d6, d7, d8, d9);
    const shoreRingBoost =
      smoothstep(18.0, 27.0, minLagoonDist) * (1.0 - smoothstep(30.0, 44.0, minLagoonDist)) * 0.34;

    const channelWave = rawChannelWave * (1.0 - poolSuppress * 0.92);
    const poolCarve = Math.max(
      w0 * 0.92,
      w1 * 0.85,
      w2 * 0.88,
      w3 * 0.82,
      w4 * 0.84,
      w5 * 0.8,
      w6 * 0.8,
      w7 * 0.78,
      w8 * 0.78,
      w9 * 0.82
    );
    const swampTargetH = WATER_LEVEL - 0.12 + channelWave + shoreRingBoost - poolCarve;
    const blendW = smoothstep(0.02, 0.45, swampF) * terraceKeepAt(x, z);
    h = h * (1.0 - blendW) + swampTargetH * blendW;
  }

  // Mountain Bear Caves: tall natural mountain peak rising over the subterranean tunnel & cavern,
  // with a flat forest clearing outside the tunnel portal mouth (lz >= 2.0) and craggy cliff shoulders.
  // Evaluated last so nearby farm terraces or desert dunes never create a step at the cave entrance!
  for (let i = 0; i < BEAR_MOUNTAIN_CAVES.length; i++) {
    const cave = BEAR_MOUNTAIN_CAVES[i];
    const dx = x - cave.x;
    const dz = z - cave.z;
    if (Math.abs(dx) > 62.0 || Math.abs(dz) > 62.0) continue;
    const sinY = Math.sin(cave.facingYaw);
    const cosY = Math.cos(cave.facingYaw);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY;

    // 1) Flatten the natural approach clearing and tunnel threshold (lz: -2.5 .. +25.0)
    //    No drop-off at lz = 2..4 so the terrain floor stays 100% level at cave.floorY right into the tunnel!
    if (lz >= -2.5 && lz <= 25.0 && Math.abs(lx) < 18.0) {
      const gladeDist = Math.hypot(lx * 0.82, Math.max(0, lz - 9.5) * 0.85);
      if (gladeDist < 17.5) {
        const wGlade = 1.0 - smoothstep(8.2, 17.5, gladeDist);
        h = h * (1.0 - wGlade) + cave.floorY * wGlade;
      }
    }

    // 2) Raise a massive, craggy mountain massif over the tunnel & subterranean cavern (lz < 3.2)
    //    Uses a wide inner plateau (15.5m) so the subterranean chamber ceiling is always deeply buried inside solid mountain rock
    const mtnDist = Math.hypot(lx * 0.82, (lz + 13.5) * 0.78);
    if (mtnDist < 43.0 && lz < 3.2) {
      const radialWeight = 1.0 - smoothstep(14.5, 43.0, mtnDist);
      const frontCliffRamp = smoothstep(3.2, -0.8, lz);
      const mtnRise = radialWeight * frontCliffRamp;
      const crag =
        fbm2D(x * 0.065 + i * 3.1, z * 0.065 - i * 2.3, 2) * 2.8 +
        Math.sin(x * 0.14 + z * 0.11) * 1.1;
      const targetMtnH = cave.floorY + mtnRise * (27.5 + crag);
      h = Math.max(h, targetMtnH);
    }

    // 3) Natural flanking rock cliff shoulders framing the portal clearing (|lx| in 5.4..18.5, lz in 1.0..12.5)
    const absLx = Math.abs(lx);
    if (absLx > 5.4 && absLx < 19.0 && lz >= 1.0 && lz <= 12.5) {
      const sideShoulderW =
        smoothstep(5.4, 8.2, absLx) *
        (1.0 - smoothstep(12.0, 19.0, absLx)) *
        (1.0 - smoothstep(4.2, 12.5, lz));
      const shoulderH = cave.floorY + sideShoulderW * 11.5;
      h = Math.max(h, shoulderH);
    }
  }

  // Colossal Western Volcano Sanctum Massif, Caldera & Surrounding Volcanic Badlands (centered at VOLCANO_SANCTUM_POS: -620, 115)
  const vDx = x - VOLCANO_SANCTUM_POS.x;
  const vDz = z - VOLCANO_SANCTUM_POS.z;
  if (Math.abs(vDx) <= 265.0 && Math.abs(vDz) <= 265.0) {
    const vDist = Math.hypot(vDx, vDz);
    // 0) Sculpt undulating scorched basalt badlands & low jagged ash ridges across the outer volcanic zone (r = 98..250m)
    if (vDist > 96.0 && vDist < 250.0) {
      const inEastApproach = vDx > 65.0 && Math.abs(vDz) < 22.0 ? smoothstep(12.0, 22.0, Math.abs(vDz)) : 1.0;
      const inNorthApproach = vDz < -65.0 && Math.abs(vDx) < 22.0 ? smoothstep(12.0, 22.0, Math.abs(vDx)) : 1.0;
      const inSouthApproach = vDz > 65.0 && Math.abs(vDx) < 22.0 ? smoothstep(12.0, 22.0, Math.abs(vDx)) : 1.0;
      const badlandsW =
        smoothstep(96.0, 115.0, vDist) *
        (1.0 - smoothstep(185.0, 250.0, vDist)) *
        Math.min(inEastApproach, inNorthApproach, inSouthApproach);
      if (badlandsW > 0.01) {
        const ridgeWave =
          Math.abs(Math.sin(vDx * 0.055 + vDz * 0.042)) * 2.1 +
          fbm2D(x * 0.038 + 2.4, z * 0.038 - 1.9, 2) * 1.65;
        h = h * (1.0 - badlandsW * 0.45) + (VOLCANO_SANCTUM_POS.floorY + ridgeWave) * (badlandsW * 0.45);
      }
    }

    if (Math.abs(vDx) <= 125.0 && Math.abs(vDz) <= 125.0) {
      // 1) Flatten the 3 cardinal approach causeways & portal thresholds (East +X, North -Z, South +Z)
      if (vDx >= 24.0 && vDx <= 118.0 && Math.abs(vDz) < 18.0) {
        const causewayW = (1.0 - smoothstep(7.5, 17.5, Math.abs(vDz))) * (1.0 - smoothstep(96.0, 118.0, vDx));
        h = h * (1.0 - causewayW) + VOLCANO_SANCTUM_POS.floorY * causewayW;
      }
      if (vDz <= -24.0 && vDz >= -118.0 && Math.abs(vDx) < 18.0) {
        const causewayW = (1.0 - smoothstep(7.5, 17.5, Math.abs(vDx))) * (1.0 - smoothstep(96.0, 118.0, -vDz));
        h = h * (1.0 - causewayW) + VOLCANO_SANCTUM_POS.floorY * causewayW;
      }
      if (vDz >= 24.0 && vDz <= 118.0 && Math.abs(vDx) < 18.0) {
        const causewayW = (1.0 - smoothstep(7.5, 17.5, Math.abs(vDx))) * (1.0 - smoothstep(96.0, 118.0, vDz));
        h = h * (1.0 - causewayW) + VOLCANO_SANCTUM_POS.floorY * causewayW;
      }

      // 2) Raise the colossal volcanic cone (outerRadius = 105m, craterRimY = 74.0m) with caldera rim at r = 34.0m
      if (vDist < VOLCANO_SANCTUM_POS.outerRadius) {
        const inEastPortalMouth = vDx > 86.0 && Math.abs(vDz) < 5.0;
        const inNorthPortalMouth = vDz < -86.0 && Math.abs(vDx) < 5.0;
        const inSouthPortalMouth = vDz > 86.0 && Math.abs(vDx) < 5.0;
        if (!inEastPortalMouth && !inNorthPortalMouth && !inSouthPortalMouth) {
          const eastPortalRamp =
            vDx > 68.0 && Math.abs(vDz) < 8.8 ? smoothstep(88.0, 72.0, vDx) : 1.0;
          const northPortalRamp =
            vDz < -68.0 && Math.abs(vDx) < 8.8 ? smoothstep(88.0, 72.0, -vDz) : 1.0;
          const southPortalRamp =
            vDz > 68.0 && Math.abs(vDx) < 8.8 ? smoothstep(88.0, 72.0, vDz) : 1.0;
          const portalRamp = Math.min(eastPortalRamp, northPortalRamp, southPortalRamp);

          const vAng = Math.atan2(vDz, vDx);
          const rimRadius = 34.0;
          let coneProfile: number;
          if (vDist >= rimRadius) {
            // Steep stratovolcano slope rising from r = 105m up to the caldera rim at r = 34m
            const tSlope = 1.0 - (vDist - rimRadius) / (VOLCANO_SANCTUM_POS.outerRadius - rimRadius);
            coneProfile = Math.pow(Math.max(0, Math.min(1, tSlope)), 1.15);
          } else {
            // Deep summit caldera bowl dipping inside r < 34m while remaining high above the 24.7m inner chamber ceiling
            const tCrater = vDist / rimRadius;
            coneProfile = 0.78 + 0.22 * (tCrater * tCrater);
          }
          const radialRidge =
            vDist > rimRadius && vDist < 98.0
              ? Math.sin(vAng * 9.0 + vDist * 0.06) * 2.6 * Math.sin(((vDist - rimRadius) / (98.0 - rimRadius)) * Math.PI)
              : 0.0;
          const vCrag = fbm2D(x * 0.065 + 5.2, z * 0.065 - 3.7, 2) * 3.8 + radialRidge;
          const targetVolcanoH =
            VOLCANO_SANCTUM_POS.floorY +
            portalRamp * coneProfile * (VOLCANO_SANCTUM_POS.craterRimY - VOLCANO_SANCTUM_POS.floorY + vCrag);
          h = Math.max(h, targetVolcanoH);
        }
      }
    }
  }

  // Monumental Ruined Atlantis Sunken Ring & Central Boss Arena Sanctuary in the Deep Eastern Ocean (980, 420)
  // Note: Walkable marble floors (y = 2.15m) are provided by walkableHeightAt() and 3D marble meshes in atlantisGroup,
  // while the terrain mesh forms the submerged turquoise lagoon shoal (-1.35m) beneath the animated ocean water.
  const atDx = x - RUINED_ATLANTIS_POS.x;
  const atDz = z - RUINED_ATLANTIS_POS.z;
  if (Math.abs(atDx) <= 108.0 && Math.abs(atDz) <= 108.0) {
    const atDist = Math.hypot(atDx, atDz);
    if (atDist < 94.0) {
      const shoalW = 1.0 - smoothstep(74.0, 94.0, atDist);
      h = h * (1.0 - shoalW) + -1.35 * shoalW;
    }
  }

  // Nordic Frost Giant Shrine & Geothermal Hot Springs Basin at (-320, -290)
  const nfDx = x - NORDIC_FROST_SHRINE_POS.x;
  const nfDz = z - NORDIC_FROST_SHRINE_POS.z;
  if (Math.abs(nfDx) <= 22.0 && Math.abs(nfDz) <= 22.0) {
    const nfDist = Math.hypot(nfDx, nfDz);
    if (nfDist < NORDIC_FROST_SHRINE_POS.poolRadius + 1.5) {
      const poolCarve = 1.0 - smoothstep(NORDIC_FROST_SHRINE_POS.poolRadius - 2.2, NORDIC_FROST_SHRINE_POS.poolRadius + 0.8, nfDist);
      h = h * (1.0 - poolCarve) + NORDIC_FROST_SHRINE_POS.poolFloorY * poolCarve;
    }
    // Raised Northern Rune Altar Dais at (x: -320, z: -306.5)
    const altarDist = Math.hypot(nfDx, z - (NORDIC_FROST_SHRINE_POS.z - 16.5));
    if (altarDist < 6.2) {
      const altarW = 1.0 - smoothstep(3.8, 6.2, altarDist);
      h = h * (1.0 - altarW) + NORDIC_FROST_SHRINE_POS.altarDaisY * altarW;
    }
  }

  return h;
}

/**
 * Summary: Checks whether an ocean coordinate (x, z) is deep/clear enough for the Sailable Ship to navigate.
 */
export function isNavigableOceanForShip(x: number, z: number): boolean {
  // Keep clear of the Harbor Pier & moored Imperial Galleon
  if (x <= 275.0 && Math.abs(z - SOUTHEAST_HARBOR_POS.pierZ) <= 6.8) {
    return false;
  }
  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.shipX) <= SOUTHEAST_HARBOR_POS.shipHalfW + 3.8 &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.shipZ) <= SOUTHEAST_HARBOR_POS.shipHalfL + 3.8
  ) {
    return false;
  }
  // Keep clear of Smuggler Island & its Western Docking Pier while allowing mooring right off dockMinX (x ≈ 493)
  const smDist = Math.hypot(x - SMUGGLER_ISLAND_POS.x, z - SMUGGLER_ISLAND_POS.z);
  if (smDist <= SMUGGLER_ISLAND_POS.radius + 4.0) {
    return false;
  }
  if (
    x >= SMUGGLER_ISLAND_POS.dockMinX - 3.5 &&
    x <= SMUGGLER_ISLAND_POS.x &&
    Math.abs(z - SMUGGLER_ISLAND_POS.dockZ) <= SMUGGLER_ISLAND_POS.dockHalfWidthZ + 4.2
  ) {
    return false;
  }
  // Keep clear of the solid Ruined Atlantis Western Dock & Outer Ring while allowing docking right at dockX - 4.5m (x ≈ 881.5)
  const atDx = x - RUINED_ATLANTIS_POS.x;
  const atDz = z - RUINED_ATLANTIS_POS.z;
  const atDist = Math.hypot(atDx, atDz);
  if (atDist <= RUINED_ATLANTIS_POS.outerRingRadius + 10.5) {
    return false;
  }
  if (
    x >= RUINED_ATLANTIS_POS.dockX - 3.5 &&
    x <= RUINED_ATLANTIS_POS.x &&
    Math.abs(atDz) <= 9.2
  ) {
    return false;
  }
  return groundHeightAt(x, z) < WATER_LEVEL + 0.45;
}
// #endregion

// ======================== WATER & SNOW ZONE QUERIES ======================== \\
// #region Water & Snow Zone Queries
/**
 * Summary: Queries the local water plane elevation for oceans, lakes, pools, and oasis lagoons.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @param currentY Height of the asker, to choose between stacked floors (optional).
 * @returns Water surface height in meters, or null where there is no water.
 */
export function getWaterSurfaceHeightAt(x: number, z: number, currentY?: number): number | null {
  const lx = x - SOUTHERN_MINE_POS.x;
  const lz = z - SOUTHERN_MINE_POS.entranceZ;
  if (currentY !== undefined && currentY < -8.0) {
    const onMineBridgeOrDock =
      (lx >= -135.0 && lx <= -101.0 && lz >= 70.5 && lz <= 75.5) ||
      (lx >= -130.0 && lx <= -106.0 && lz >= 91.5 && lz <= 100.0);
    if (!onMineBridgeOrDock && isInsideSouthernMineLagoonBasin(lx, lz)) {
      return SOUTHERN_MINE_POS.westLagoonWaterY;
    }
  }
  if (isInsideSouthernMine(x, z, currentY)) {
    return null;
  }
  const lagNorm = Math.hypot(
    (x - SOUTHWEST_OASIS_POS.lagoonX) / SOUTHWEST_OASIS_POS.lagoonRadiusX,
    (z - SOUTHWEST_OASIS_POS.lagoonZ) / SOUTHWEST_OASIS_POS.lagoonRadiusZ
  );
  if (lagNorm <= 1.0) {
    return SOUTHWEST_OASIS_POS.lagoonWaterY;
  }
  const coastLineX = easternCoastlineXAt(z);
  if (x >= coastLineX - 2.0 && groundHeightAt(x, z) < SOUTHEAST_HARBOR_POS.waterY - 0.05) {
    return SOUTHEAST_HARBOR_POS.waterY;
  }
  if (groundHeightAt(x, z) < WATER_LEVEL + 0.15) {
    return WATER_LEVEL;
  }
  return null;
}

/**
 * Summary: Calculates snow accumulation factor based on northern latitude and terrain altitude above the snowline.
 * Design: Restricts snow strictly to the Northern Alpine region (z < -40) and modulates the snowline
 *         with mountain-ridge noise in the far north so valleys show Tundra/Taiga while peaks are snow-capped.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns Snow cover from 0 (none) to 1 (full).
 */
export function northernSnowZoneFactorAt(x: number, z: number): number {
  if (z >= -40.0 || isChineseFortressWalkableZone(x, z)) {
    return 0;
  }
  const h = groundHeightAt(x, z);
  if (h < SNOW_LINE_ALTITUDE) {
    return 0;
  }

  // Evaluate mountain peak prominence from WALKABLE_MOUNTAINS + procedural North-West Alpine Peaks
  let peakProminence = 0;
  for (let i = 0; i < WALKABLE_MOUNTAINS.length; i++) {
    const m = WALKABLE_MOUNTAINS[i];
    if (m.z < -40.0) {
      const d = Math.hypot(x - m.x, z - m.z);
      if (d < m.radius * 0.92) {
        peakProminence = Math.max(
          peakProminence,
          1.0 - smoothstep(m.radius * 0.35, m.radius * 0.88, d)
        );
      }
    }
  }

  // Procedural Alpine Range peaks in the North-West & Far-North (matching the reference fantasy map)
  const nwAlpineFavor = smoothstep(-20.0, -280.0, x) * smoothstep(-110.0, -240.0, z);
  const ridgeWave1 = Math.sin(x * 0.032 + z * 0.024) * Math.cos(x * 0.019 - z * 0.031);
  const ridgeWave2 = fbm2D(x * 0.018 + 2.3, z * 0.018 - 3.7, 3);
  const alpinePeakCluster = smoothstep(
    0.22 - nwAlpineFavor * 0.14,
    0.58 - nwAlpineFavor * 0.12,
    ridgeWave1 * 0.55 + ridgeWave2 * 0.65
  );
  peakProminence = Math.max(peakProminence, alpinePeakCluster);

  const localSnowLine = SNOW_LINE_ALTITUDE + (1.0 - peakProminence) * 18.5;
  if (h < localSnowLine) {
    return 0;
  }
  const latFade = smoothstep(-40.0, -95.0, z);
  const altitudeSnow = smoothstep(localSnowLine, localSnowLine + 5.5, h);
  return Math.max(0, Math.min(1, altitudeSnow * latFade * (0.35 + 0.65 * peakProminence)));
}

// #endregion

// ======================== WALKABLE SURFACE RESOLUTION ======================== \\
// #region Walkable Surface Resolution
/**
 * Summary: Resolves complex multi-story walkable surface heights (ground, bridges, decks, cabins).
 * Note: [HOT-PATH EXCEPTION] Evaluated at 60FPS for entity positioning and camera collision.
 * Relaxed Rule: Rule 1 (fast analytical evaluation bypassing heavy mesh raycasts).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.05ms per query.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @param currentY Height of the asker, to choose between stacked floors (optional).
 * @returns The walkable height and the surface kind at that point.
 */
/** Summary: Surface kinds that walkableHeightAt can report. */
export type TWalkableSurface = 'pier' | 'bridge' | 'tower' | 'cabin' | 'ground';

/** Summary: A height sample. Pass one in as `out` to avoid allocating a new object per query. */
export interface IWalkableHeightSample {
  height: number;
  surface: TWalkableSurface;
}

/**
 * Summary: Writes a height sample into `out` (or a new object when none is given) and returns it.
 */
function writeWalkableSample(
  out: IWalkableHeightSample | undefined,
  height: number,
  surface: TWalkableSurface
): IWalkableHeightSample {
  const sample = out ?? { height, surface };
  sample.height = height;
  sample.surface = surface;
  return sample;
}

/** Reused by walkableHeightValueAt. Safe because the value is read before the next query. */
const walkableHeightScratch: IWalkableHeightSample = { height: 0, surface: 'ground' };

/**
 * Summary: Returns only the walkable height at a point, without allocating a sample object.
 * Use this in per-frame code that reads `.height` and discards the rest.
 */
export function walkableHeightValueAt(x: number, z: number, currentY?: number): number {
  return walkableHeightAt(x, z, currentY, walkableHeightScratch).height;
}

export function walkableHeightAt(
  x: number,
  z: number,
  currentY?: number,
  out?: IWalkableHeightSample
): IWalkableHeightSample {
  if (Math.abs(x) <= 21.8 && z >= -215.6 + FZ && z <= -187.8 + FZ) {
    if (z > -189.8 + FZ && Math.abs(x) <= 4.2) {
      const tStep = Math.max(0, Math.min(1, (-187.8 + FZ - z) / 2.0));
      return writeWalkableSample(out, CHINESE_FORTRESS_POS.summitHeight + tStep * 0.35, 'cabin');
    }
    if (z <= -189.6 + FZ) {
      const inMainStairX = x >= 13.55 && x <= 18.5;
      const inMainStairZ = z >= -206.6 + FZ && z <= -193.5 + FZ;
      if (inMainStairX && inMainStairZ) {
        const tStair = Math.max(0, Math.min(1, (-194.0 + FZ - z) / 12.0));
        const stairY =
          CHINESE_FORTRESS_POS.mainHallFloor1Y +
          tStair * (CHINESE_FORTRESS_POS.mainHallFloor2Y - CHINESE_FORTRESS_POS.mainHallFloor1Y);
        if (currentY === undefined || (currentY >= stairY - 1.15 && currentY <= stairY + 2.6)) {
          return writeWalkableSample(out, stairY, 'cabin');
        }
      }
      if (
        currentY !== undefined &&
        currentY >= 29.0 + FY &&
        !(inMainStairX && z >= -205.5 + FZ && z <= -194.0 + FZ)
      ) {
        return writeWalkableSample(out, CHINESE_FORTRESS_POS.mainHallFloor2Y, 'cabin');
      }
      return writeWalkableSample(out, CHINESE_FORTRESS_POS.mainHallFloor1Y, 'cabin');
    }
  }

  for (const px of [-30.0, 30.0]) {
    if (Math.abs(x - px) <= 8.8 && z >= -171.3 + FZ && z <= -155.8 + FZ) {
      if (z > -156.5 + FZ && Math.abs(x - px) <= 1.8) {
        const tStep = Math.max(0, Math.min(1, (-155.8 + FZ - z) / 0.7));
        return writeWalkableSample(out, CHINESE_FORTRESS_POS.summitHeight + tStep * (CHINESE_FORTRESS_POS.pavilionFloor1Y - CHINESE_FORTRESS_POS.summitHeight), 'cabin');
      }
      const inPavStairX = px < 0 ? x >= -38.6 && x <= -35.15 : x >= 35.15 && x <= 38.6;
      const inPavStairZ = z >= -168.0 + FZ && z <= -159.0 + FZ;
      if (inPavStairX && inPavStairZ) {
        const tStair = Math.max(0, Math.min(1, (-159.5 + FZ - z) / 8.0));
        const stairY =
          CHINESE_FORTRESS_POS.pavilionFloor1Y +
          tStair * (CHINESE_FORTRESS_POS.pavilionFloor2Y - CHINESE_FORTRESS_POS.pavilionFloor1Y);
        if (currentY === undefined || (currentY >= stairY - 1.15 && currentY <= stairY + 2.5)) {
          return writeWalkableSample(out, stairY, 'cabin');
        }
      }
      if (
        currentY !== undefined &&
        currentY >= 28.6 + FY &&
        !(inPavStairX && z >= -167.0 + FZ && z <= -159.5 + FZ)
      ) {
        return writeWalkableSample(out, CHINESE_FORTRESS_POS.pavilionFloor2Y, 'cabin');
      }
      return writeWalkableSample(out, CHINESE_FORTRESS_POS.pavilionFloor1Y, 'cabin');
    }
  }

  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const tw = CORNER_WATCHTOWERS[i];
    if (Math.abs(x - tw.cx) <= 5.2 && Math.abs(z - tw.cz) <= 5.2) {
      const inLadderHatch =
        Math.abs(x - tw.ladderX) <= 0.52 && Math.abs(z - tw.ladderZ) <= 0.52;
      if (!inLadderHatch) {
        if (currentY !== undefined && currentY >= 33.8 + FY) {
          return writeWalkableSample(out, CHINESE_FORTRESS_POS.watchtowerFloor3Y, 'tower');
        }
        if (currentY !== undefined && currentY >= 28.0 + FY) {
          return writeWalkableSample(out, CHINESE_FORTRESS_POS.watchtowerFloor2Y, 'tower');
        }
      }
      return writeWalkableSample(out, CHINESE_FORTRESS_POS.watchtowerFloor1Y, 'tower');
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
        return writeWalkableSample(out, hw.deckY, 'tower');
      }
      return writeWalkableSample(out, hw.baseY + 0.15, 'tower');
    }
  }

  const rbInfo = ropeBridgePointInfoAt(x, z);
  if (rbInfo !== null && (currentY === undefined || currentY >= rbInfo.height - 4.5)) {
    return writeWalkableSample(out, rbInfo.height, 'pier');
  }

  if (Math.abs(x) >= 44.1 && Math.abs(x) <= 48.0 && z >= -156.8 + FZ && z <= -141.2 + FZ) {
    if (z <= -152.0 + FZ) {
      if (currentY === undefined || currentY >= 28.0 + FY) {
        return writeWalkableSample(out, CHINESE_FORTRESS_POS.rampartHeight, 'bridge');
      }
    } else {
      const tWallStair = Math.max(0, Math.min(1, (-142.0 + FZ - z) / 10.0));
      const wallStairY =
        CHINESE_FORTRESS_POS.summitHeight +
        tWallStair * (CHINESE_FORTRESS_POS.rampartHeight - CHINESE_FORTRESS_POS.summitHeight);
      if (currentY === undefined || (currentY >= wallStairY - 1.15 && currentY <= wallStairY + 2.5)) {
        return writeWalkableSample(out, wallStairY, 'bridge');
      }
    }
  }

  const onSouthWallTop =
    Math.abs(x) >= 4.2 && Math.abs(x) <= 52.2 && z >= -126.5 + FZ && z <= -121.8 + FZ;
  const onSideWallTop =
    Math.abs(x) >= 47.4 && Math.abs(x) <= 52.2 && z >= -220.2 + FZ && z <= -121.8 + FZ;
  const onNorthWallTop = Math.abs(x) <= 52.2 && z >= -220.2 + FZ && z <= -215.5 + FZ;
  if ((onSouthWallTop || onSideWallTop || onNorthWallTop) && (currentY === undefined || currentY >= 28.0 + FY)) {
    return writeWalkableSample(out, CHINESE_FORTRESS_POS.rampartHeight, 'bridge');
  }

  if (
    z <= CHINESE_FORTRESS_POS.stairFootZ + 0.6 &&
    z >= CHINESE_FORTRESS_POS.upperStairTopZ - 0.6
  ) {
    const allowedHalfW =
      z <= CHINESE_FORTRESS_POS.midLandingMaxZ + 0.4 && z >= CHINESE_FORTRESS_POS.midLandingMinZ - 0.4
        ? CHINESE_FORTRESS_POS.midLandingHalfWidth
        : CHINESE_FORTRESS_POS.stairHalfWidth;
    if (Math.abs(x - CHINESE_FORTRESS_POS.x) <= allowedHalfW) {
      const fortStairY = chineseFortressStairHeightAt(z);
      if (currentY === undefined || currentY >= fortStairY - 1.2) {
        return writeWalkableSample(out, fortStairY, 'bridge');
      }
    }
  }

  if (
    Math.abs(x - CHINESE_FORTRESS_POS.x) <= CHINESE_FORTRESS_POS.plazaHalfWidth &&
    z <= CHINESE_FORTRESS_POS.plazaMaxZ &&
    z >= CHINESE_FORTRESS_POS.plazaMinZ
  ) {
    if (currentY === undefined || currentY >= CHINESE_FORTRESS_POS.summitHeight - 1.5) {
      return writeWalkableSample(out, CHINESE_FORTRESS_POS.summitHeight, 'bridge');
    }
  }

  if (isInsideSouthernMine(x, z, currentY)) {
    return writeWalkableSample(out, southernMineWalkableHeightAt(x, z, currentY), 'bridge');
  }

  const bearCave = isInsideBearCave(x, z, currentY);
  if (bearCave) {
    return writeWalkableSample(out, bearCave.floorY, 'cabin');
  }

  const volcanoSanctum = isInsideVolcanoSanctum(x, z, currentY);
  if (volcanoSanctum) {
    return writeWalkableSample(out, volcanoSanctum.floorY, 'cabin');
  }

  const floatingIslandY = floatingBloomingIslandHeightAt(x, z, currentY);
  if (floatingIslandY !== null) {
    return writeWalkableSample(out, floatingIslandY, 'bridge');
  }

  const groundH = groundHeightAt(x, z);

  // Starting wooden dock at (-11.5, 15.5) with rotation.y = Math.atan2(-8.0, 6.0):
  // Inverse world-to-local transform uses +pierAngle so the walkable box aligns 100% with the visual planks.
  const pierCx = -11.5;
  const pierCz = 15.5;
  const pierAngle = Math.atan2(-8.0, 6.0);
  const dxP = x - pierCx;
  const dzP = z - pierCz;
  const cosP = Math.cos(pierAngle);
  const sinP = Math.sin(pierAngle);
  const localPX = dxP * cosP - dzP * sinP;
  const localPZ = dxP * sinP + dzP * cosP;

  if (localPX >= -8.4 && localPX <= 9.2 && Math.abs(localPZ) <= 1.55) {
    const pierDeckH = Math.max(0.55, groundH);
    if (currentY === undefined || currentY >= 0.55 - 0.85) {
      return writeWalkableSample(out, pierDeckH, 'pier');
    }
  }

  // Moored wooden rowboat beside the starting lake pier at (-6.5, 10.2)
  const rbDx = x - -6.5;
  const rbDz = z - 10.2;
  const cosBoat = Math.cos(0.65);
  const sinBoat = Math.sin(0.65);
  const localBoatX = rbDx * cosBoat - rbDz * sinBoat;
  const localBoatZ = rbDx * sinBoat + rbDz * cosBoat;
  if (Math.abs(localBoatX) <= 1.45 && Math.abs(localBoatZ) <= 0.68) {
    if (currentY === undefined || currentY >= -0.35) {
      return writeWalkableSample(out, 0.35, 'pier');
    }
  }

  if (
    (x >= -127.0 && x <= -104.8 && Math.abs(z - 48.0) <= 1.65) ||
    (Math.abs(x - LAKESIDE_TEA_PAVILION_POS.x) <= LAKESIDE_TEA_PAVILION_POS.halfSize + 0.25 &&
      Math.abs(z - LAKESIDE_TEA_PAVILION_POS.z) <= LAKESIDE_TEA_PAVILION_POS.halfSize + 0.25)
  ) {
    const westPierH = Math.max(LAKESIDE_TEA_PAVILION_POS.deckHeight, groundH);
    if (currentY === undefined || currentY >= LAKESIDE_TEA_PAVILION_POS.deckHeight - 0.85) {
      return writeWalkableSample(out, westPierH, 'pier');
    }
  }

  const bridgeDx = x - 18.0;
  const bridgeDz = z - 2.0;
  if (Math.abs(bridgeDx) <= 1.75 && Math.abs(bridgeDz) <= 11.4) {
    const normZ = Math.max(-1, Math.min(1, bridgeDz / 11.2));
    const archH = Math.max(groundH, 0.52 + (1.0 - normZ * normZ) * 1.58);
    if (currentY === undefined || currentY >= archH - 0.85) {
      return writeWalkableSample(out, archH, 'bridge');
    }
  }

  const rbx = x - 78.0;
  const rbz = z + 35.0;
  const rbAngle = 0.54;
  const rbLocalX = rbx * Math.cos(rbAngle) - rbz * Math.sin(rbAngle);
  const rbLocalZ = rbx * Math.sin(rbAngle) + rbz * Math.cos(rbAngle);
  if (Math.abs(rbLocalX) <= 1.75 && Math.abs(rbLocalZ) <= 11.8) {
    const norm = Math.max(-1, Math.min(1, rbLocalZ / 11.6));
    const deckH = Math.max(groundH, 0.72 + (1.0 - norm * norm) * 1.18);
    if (currentY === undefined || currentY >= deckH - 0.85) {
      return writeWalkableSample(out, deckH, 'pier');
    }
  }

  // Grand Southern River Bridge (3-Arch Stone & Timber Viaduct at (178, 378))
  if (
    x >= SOUTHERN_RIVER_BRIDGE_POS.minX - 0.5 &&
    x <= SOUTHERN_RIVER_BRIDGE_POS.maxX + 0.5 &&
    Math.abs(z - SOUTHERN_RIVER_BRIDGE_POS.z) <= SOUTHERN_RIVER_BRIDGE_POS.halfWidthZ
  ) {
    const sBridgeH = Math.max(groundH, southernRiverBridgeHeightAt(x));
    if (currentY === undefined || currentY >= sBridgeH - 0.85) {
      return writeWalkableSample(out, sBridgeH, 'bridge');
    }
  }

  const towerCenterH = 6.4;
  if (Math.abs(x - 30.0) <= 3.1 && Math.abs(z + 26.0) <= 3.1) {
    return writeWalkableSample(out, towerCenterH + 0.55, 'tower');
  }

  if (Math.abs(x - HUNTER_LODGE_POS.x) <= 5.8 && Math.abs(z - HUNTER_LODGE_POS.z) <= 4.8) {
    return writeWalkableSample(out, HUNTER_LODGE_POS.height + 0.18, 'cabin');
  }

  for (let i = 0; i < VALLEY_FARMS.length; i++) {
    const f = VALLEY_FARMS[i];
    const minZ = f.dirZ === 1 ? f.z - 6.3 : f.z - 4.5;
    const maxZ = f.dirZ === 1 ? f.z + 4.5 : f.z + 6.3;
    if (Math.abs(x - f.x) <= 5.4 && z >= minZ && z <= maxZ) {
      return writeWalkableSample(out, f.height + 0.18, 'cabin');
    }
  }

  // Climbable Harbor Fountain (232, 252) stepped outer rim and basin
  const harborFountainDist = Math.hypot(x - 232.0, z - 252.0);
  if (harborFountainDist <= 4.25 && harborFountainDist > 0.72) {
    const fTopY = harborFountainDist <= 2.3 ? SOUTHEAST_HARBOR_POS.plazaY + 1.02 : SOUTHEAST_HARBOR_POS.plazaY + 0.54;
    if (currentY === undefined || currentY >= fTopY - 0.82) {
      return writeWalkableSample(out, fTopY, 'pier');
    }
  }

  // Harbor Marble Amphitheater (at 226.0, 294.0): circular stage (r <= 6.68m) and 5 stepped semicircular bench tiers (r in 6.975..15.25m)
  const amphDx = x - 226.0;
  const amphDz = z - 294.0;
  const amphR = Math.hypot(amphDx, amphDz);
  if (amphR <= 6.68) {
    const stageTopY = SOUTHEAST_HARBOR_POS.plazaY + 0.36;
    if (currentY === undefined || currentY >= stageTopY - 0.85) {
      return writeWalkableSample(out, stageTopY, 'pier');
    }
  } else if (amphR >= 6.975 && amphR <= 15.25 && amphDz >= -0.2) {
    const amphAng = Math.atan2(amphDx, amphDz);
    if (Math.abs(amphAng) <= Math.PI * 0.46) {
      const tier = Math.min(4, Math.max(0, Math.floor((amphR - 6.975) / 1.65)));
      const tierTopY = SOUTHEAST_HARBOR_POS.plazaY + 0.55 + tier * 0.56;
      if (currentY === undefined || currentY >= tierTopY - 0.95) {
        return writeWalkableSample(out, tierTopY, 'pier');
      }
    }
  }

  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.tavernX) <= SOUTHEAST_HARBOR_POS.tavernHalfW &&
    z >= SOUTHEAST_HARBOR_POS.tavernZ - SOUTHEAST_HARBOR_POS.tavernHalfD &&
    z <= SOUTHEAST_HARBOR_POS.tavernZ + SOUTHEAST_HARBOR_POS.tavernHalfD + 2.4
  ) {
    return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.tavernFloorY, 'cabin');
  }

  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.warehouseX) <= SOUTHEAST_HARBOR_POS.warehouseHalfW &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.warehouseZ) <= SOUTHEAST_HARBOR_POS.warehouseHalfD + 1.0
  ) {
    return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.warehouseFloorY, 'cabin');
  }
  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.cargoShedX) <= 6.0 &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.cargoShedZ) <= 4.5
  ) {
    return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.plazaY + 0.12, 'pier');
  }

  const lhDist = Math.hypot(x - SOUTHEAST_HARBOR_POS.lighthouseX, z - SOUTHEAST_HARBOR_POS.lighthouseZ);
  if (lhDist <= SOUTHEAST_HARBOR_POS.lighthouseRadius + 0.45) {
    // Hatch opening wraps the vertical ladder at z=199.1 (z in 198.55..199.52) so stepping off onto standZ=199.65 lands on the solid 25.5m upper deck
    const inLhHatch =
      Math.abs(x - SOUTHEAST_HARBOR_POS.lighthouseLadderX) <= 0.65 &&
      z >= SOUTHEAST_HARBOR_POS.lighthouseLadderZ - 0.55 &&
      z <= SOUTHEAST_HARBOR_POS.lighthouseLadderZ + 0.42;
    if (!inLhHatch && currentY !== undefined && currentY >= SOUTHEAST_HARBOR_POS.lighthouseTopDeckY - 2.5) {
      return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.lighthouseTopDeckY, 'tower');
    }
    if (lhDist <= SOUTHEAST_HARBOR_POS.lighthouseRadius) {
      return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.lighthouseBaseY + 0.15, 'tower');
    }
  }

  if (
    x >= 268.2 &&
    x <= 276.2 &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.pierZ) <= 1.62 &&
    (currentY === undefined || currentY >= SOUTHEAST_HARBOR_POS.pierY - 0.65)
  ) {
    const tGang = Math.max(0, Math.min(1, (x - 268.2) / 8.0));
    return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.pierY + tGang * (SOUTHEAST_HARBOR_POS.shipDeckY - SOUTHEAST_HARBOR_POS.pierY), 'pier');
  }

  if (
    x >= SOUTHEAST_HARBOR_POS.pierStartX - 0.5 &&
    x <= SOUTHEAST_HARBOR_POS.pierEndX &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.pierZ) <= SOUTHEAST_HARBOR_POS.pierHalfW &&
    (currentY === undefined || currentY >= SOUTHEAST_HARBOR_POS.pierY - 0.85)
  ) {
    return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.pierY, 'pier');
  }

  if (
    Math.abs(x - SOUTHEAST_HARBOR_POS.shipX) <= SOUTHEAST_HARBOR_POS.shipHalfW &&
    Math.abs(z - SOUTHEAST_HARBOR_POS.shipZ) <= SOUTHEAST_HARBOR_POS.shipHalfL &&
    (currentY === undefined || currentY >= SOUTHEAST_HARBOR_POS.shipDeckY - 0.65)
  ) {
    const absShipDx = Math.abs(x - SOUTHEAST_HARBOR_POS.shipX);
    if (
      absShipDx >= 3.32 &&
      absShipDx <= 5.85 &&
      z >= 254.4 &&
      z <= SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ + 0.15
    ) {
      const tStair = Math.max(
        0,
        Math.min(1, (z - 254.5) / (SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ - 254.5))
      );
      const stairY =
        SOUTHEAST_HARBOR_POS.shipDeckY +
        tStair * (SOUTHEAST_HARBOR_POS.shipQuarterdeckY - SOUTHEAST_HARBOR_POS.shipDeckY);
      if (currentY === undefined || (currentY >= stairY - 0.65 && currentY <= stairY + 1.8)) {
        return writeWalkableSample(out, stairY, 'pier');
      }
    }
    if (z >= SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ) {
      if (currentY !== undefined && currentY >= 5.2) {
        return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.shipQuarterdeckY, 'pier');
      }
      return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.shipDeckY, 'cabin');
    }
    return writeWalkableSample(out, SOUTHEAST_HARBOR_POS.shipDeckY, 'pier');
  }

  // Sailable Royal Explorer Caravel deck & Harbor North Boarding Jetty
  const sailableDeckY = sailableShipDeckHeightAt(x, z, currentY);
  if (sailableDeckY !== null) {
    return writeWalkableSample(out, sailableDeckY, 'pier');
  }

  // Ruined Atlantis Central Boss Arena Sanctuary, Western Ship Dock, Radial Causeways & Outer Ring Colonnade
  const atDxWalk = x - RUINED_ATLANTIS_POS.x;
  const atDzWalk = z - RUINED_ATLANTIS_POS.z;
  const atDistWalk = Math.hypot(atDxWalk, atDzWalk);
  const onAtlantisDock =
    x >= RUINED_ATLANTIS_POS.dockX - 1.5 &&
    x <= RUINED_ATLANTIS_POS.x - 30.0 &&
    Math.abs(atDzWalk) <= 4.8;
  const onAtlantisRadialCauseway =
    atDistWalk <= RUINED_ATLANTIS_POS.outerRingRadius + 4.0 &&
    (Math.abs(atDxWalk) <= 3.6 || Math.abs(atDzWalk) <= 3.6);
  if (atDistWalk <= RUINED_ATLANTIS_POS.innerArenaRadius + 0.8 || onAtlantisDock || onAtlantisRadialCauseway) {
    return writeWalkableSample(out, RUINED_ATLANTIS_POS.arenaFloorY, 'bridge');
  }
  if (
    atDistWalk >= RUINED_ATLANTIS_POS.outerRingRadius - 5.2 &&
    atDistWalk <= RUINED_ATLANTIS_POS.outerRingRadius + 5.2
  ) {
    return writeWalkableSample(out, RUINED_ATLANTIS_POS.outerRingY, 'bridge');
  }

  // Ancient Pharaoh Stepped Sun Pyramid & Walkable Eastern Ceremonial Ramp (-475, 295)
  const pyramidY = desertPyramidHeightAt(x, z, currentY);
  if (pyramidY !== null) {
    return writeWalkableSample(out, pyramidY, 'bridge');
  }

  // Mid-Ocean Corsair Smuggler Cove Western Timber Docking Pier & Beacon Watchtower (540, 185)
  if (
    x >= SMUGGLER_ISLAND_POS.dockMinX &&
    x <= SMUGGLER_ISLAND_POS.dockMaxX &&
    Math.abs(z - SMUGGLER_ISLAND_POS.dockZ) <= SMUGGLER_ISLAND_POS.dockHalfWidthZ
  ) {
    return writeWalkableSample(out, SMUGGLER_ISLAND_POS.deckY, 'pier');
  }
  if (
    Math.hypot(x - SMUGGLER_ISLAND_POS.towerX, z - SMUGGLER_ISLAND_POS.towerZ) <= 4.6 &&
    currentY !== undefined &&
    currentY >= SMUGGLER_ISLAND_POS.towerTopY - 2.4
  ) {
    return writeWalkableSample(out, SMUGGLER_ISLAND_POS.towerTopY, 'tower');
  }

  const obsDist = Math.hypot(x - SOUTHWEST_OASIS_POS.observatoryX, z - SOUTHWEST_OASIS_POS.observatoryZ);
  if (obsDist <= SOUTHWEST_OASIS_POS.observatoryRadius + 0.45) {
    const inObsHatch =
      Math.abs(x - SOUTHWEST_OASIS_POS.observatoryLadderX) <= 0.85 &&
      Math.abs(z - SOUTHWEST_OASIS_POS.observatoryLadderZ) <= 0.85;
    if (!inObsHatch && currentY !== undefined && currentY >= SOUTHWEST_OASIS_POS.observatoryTopDeckY - 2.5) {
      return writeWalkableSample(out, SOUTHWEST_OASIS_POS.observatoryTopDeckY, 'tower');
    }
    if (obsDist <= SOUTHWEST_OASIS_POS.observatoryRadius) {
      return writeWalkableSample(out, SOUTHWEST_OASIS_POS.observatoryBaseY + 0.15, 'tower');
    }
  }

  if (
    Math.abs(x - SOUTHWEST_OASIS_POS.pavilionX) <= SOUTHWEST_OASIS_POS.pavilionHalfW + 0.8 &&
    Math.abs(z - SOUTHWEST_OASIS_POS.pavilionZ) <= SOUTHWEST_OASIS_POS.pavilionHalfD
  ) {
    return writeWalkableSample(out, SOUTHWEST_OASIS_POS.pavilionFloorY, 'cabin');
  }

  // Southwest Oasis Shoreline Wooden Fishing Piers (South-East Pier at gazeboX/Z & East Pier at eastPierX/Z)
  const onSouthEastOasisPier =
    x >= SOUTHWEST_OASIS_POS.gazeboX - 3.8 &&
    x <= SOUTHWEST_OASIS_POS.gazeboX + 4.8 &&
    Math.abs(z - SOUTHWEST_OASIS_POS.gazeboZ) <= 1.75;
  const onEastOasisPier =
    x >= SOUTHWEST_OASIS_POS.eastPierX - 3.6 &&
    x <= SOUTHWEST_OASIS_POS.eastPierX + 4.2 &&
    Math.abs(z - SOUTHWEST_OASIS_POS.eastPierZ) <= 1.65;
  if (
    (onSouthEastOasisPier || onEastOasisPier) &&
    (currentY === undefined || currentY >= SOUTHWEST_OASIS_POS.gazeboDeckY - 0.85)
  ) {
    return writeWalkableSample(out, SOUTHWEST_OASIS_POS.gazeboDeckY, 'pier');
  }

  for (let i = 0; i < DWARVEN_STONE_HOUSES.length; i++) {
    const dh = DWARVEN_STONE_HOUSES[i];
    if (
      Math.abs(x - dh.x) <= dh.halfW + 0.65 &&
      Math.abs(z - dh.z) <= dh.halfD + 0.35
    ) {
      return writeWalkableSample(out, dh.floorY, 'cabin');
    }
  }

  return writeWalkableSample(out, groundH, 'ground');
}

/**
 * Summary: Calculates analytical surface normal unit vector via central finite differences.
 * Note: [HOT-PATH EXCEPTION] Sampled in real-time for player alignment and slopes.
 * Relaxed Rule: Rule 1 (fast analytical finite difference evaluation).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.01ms per query.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns Unit surface normal (nx, ny, nz).
 */
export function getSurfaceNormalAt(
  x: number,
  z: number,
  out?: { nx: number; ny: number; nz: number }
): { nx: number; ny: number; nz: number } {
  const eps = 0.4;
  const hL = groundHeightAt(x - eps, z);
  const hR = groundHeightAt(x + eps, z);
  const hD = groundHeightAt(x, z - eps);
  const hU = groundHeightAt(x, z + eps);

  const dx = (hR - hL) / (2 * eps);
  const dz = (hU - hD) / (2 * eps);
  const len = Math.hypot(dx, 1.0, dz);
  const normal = out ?? { nx: 0, ny: 0, nz: 0 };
  normal.nx = -dx / len;
  normal.ny = 1.0 / len;
  normal.nz = -dz / len;
  return normal;
}

/**
 * Summary: Computes Euler ('YXZ') pitch and roll angles that align an entity's local +Y up axis
 *          with the terrain surface normal (nx, ny, nz) for a given heading yaw.
 * Design: Pure mathematical projection onto heading-local +Z and +X axes, clamped for stability.
 * @param nx Surface normal X component.
 * @param ny Surface normal Y component.
 * @param nz Surface normal Z component.
 * @param yaw Entity Y-axis rotation in radians.
 * @param maxTilt Maximum allowed pitch/roll tilt in radians (default 0.52).
 * @returns Pitch (rotation.x) and roll (rotation.z) in radians for rotation.order = 'YXZ'.
 */
export function computeSlopePitchAndRoll(
  nx: number,
  ny: number,
  nz: number,
  yaw: number,
  maxTilt = 0.52
): { pitch: number; roll: number } {
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  const nLocalZ = nx * sinY + nz * cosY;
  const nLocalX = nx * cosY - nz * sinY;
  const safeNy = Math.max(0.25, ny);
  const rawPitch = Math.atan2(nLocalZ, safeNy);
  const rawRoll = -Math.atan2(nLocalX, Math.hypot(safeNy, nLocalZ));
  return {
    pitch: Math.max(-maxTilt, Math.min(maxTilt, rawPitch)),
    roll: Math.max(-maxTilt * 0.85, Math.min(maxTilt * 0.85, rawRoll)),
  };
}

// #endregion

// ======================== SURFACE BIOME CLASSIFICATION ======================== \\
// #region Surface Biome Classification
/**
 * Summary: Classifies the dominant surface biome type at given spatial coordinates.
 * Note: [HOT-PATH EXCEPTION] Queried continuously for footsteps, shaders, and audio cues.
 * Relaxed Rule: Rule 1 (fast analytical classification).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.01ms per query.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @param currentY Height of the asker, to choose between stacked floors (optional).
 * @returns The surface biome at that point.
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
  if (murkySwampBiomeFactorAt(x, z) > 0.35) return 'swamp';

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
 * Summary: Returns the localized display label for a world biome.
 * @param biome Surface biome.
 * @returns Localized biome name.
 */
export function getBiomeLabel(biome: BiomeType): string {
  return t(`biomes.${biome}`);
}

/**
 * Summary: Samples RGB color representation of terrain and structures for the explorer minimap.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns RGB color (0-255 each) for the minimap pixel.
 */
export function sampleMinimapColorAt(x: number, z: number): [number, number, number] {
  for (let i = 0; i < BEAR_MOUNTAIN_CAVES.length; i++) {
    const cave = BEAR_MOUNTAIN_CAVES[i];
    if (Math.hypot(x - cave.x, z - cave.z) <= cave.radius) {
      return [94, 88, 78];
    }
  }
  const volcanoDist = Math.hypot(x - VOLCANO_SANCTUM_POS.x, z - VOLCANO_SANCTUM_POS.z);
  if (volcanoDist <= VOLCANO_SANCTUM_POS.outerRadius) {
    if (volcanoDist <= 28.0 || Math.abs(volcanoDist - 34.0) <= 3.4) {
      return [246, 92, 28];
    }
    const vNorm = getSurfaceNormalAt(x, z);
    const vShade = Math.max(0.72, Math.min(1.22, 0.92 + (-0.58 * vNorm.nx + 0.58 * vNorm.ny - 0.52 * vNorm.nz) * 0.35));
    return [
      Math.round(52 * vShade),
      Math.round(44 * vShade),
      Math.round(42 * vShade),
    ];
  }

  for (let i = 0; i < FLOATING_BLOOMING_ISLANDS.length; i++) {
    const isl = FLOATING_BLOOMING_ISLANDS[i];
    const dIsl = Math.hypot(x - isl.x, z - isl.z);
    if (dIsl <= isl.radius) {
      return dIsl > isl.radius - 3.2 ? [236, 134, 174] : [106, 188, 118];
    }
  }

  // Ancient Dragon Citadel Ruins at SOUTHERN_DRAGON_RUINS_POS (-540, 540)
  const drDx = Math.abs(x - SOUTHERN_DRAGON_RUINS_POS.x);
  const drDz = Math.abs(z - SOUTHERN_DRAGON_RUINS_POS.z);
  if (drDx <= 39.5 && drDz <= 39.5) {
    if (
      (Math.abs(drDx - 37.0) <= 2.2 && drDz <= 37.5) ||
      (Math.abs(drDz - 37.0) <= 2.2 && drDx <= 37.5)
    ) {
      return [148, 138, 122];
    }
    if (drDx <= 4.5 && Math.abs(z - (SOUTHERN_DRAGON_RUINS_POS.z + 20.0)) <= 3.5) {
      return [214, 92, 56];
    }
  }

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
  // Surface Map shows only the Dwarven Mine Entrance Portal forecourt (not the underground tunnels!)
  if (
    Math.abs(x - SOUTHERN_MINE_POS.x) <= 5.2 &&
    z >= SOUTHERN_MINE_POS.entranceZ - 3.5 &&
    z <= SOUTHERN_MINE_POS.entranceZ + 4.0
  ) {
    return [132, 112, 92];
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
  // Live Sailable Ship on the Minimap / World Map
  const activeShip = getActiveSailableShip();
  const sDx = x - activeShip.x;
  const sDz = z - activeShip.z;
  if (sDx * sDx + sDz * sDz <= 115.0) {
    const cosS = Math.cos(activeShip.yaw);
    const sinS = Math.sin(activeShip.yaw);
    const slx = sDx * cosS - sDz * sinS;
    const slz = sDx * sinS + sDz * cosS;
    if (Math.abs(slx) <= activeShip.halfW && Math.abs(slz) <= activeShip.halfL) {
      return Math.abs(slz) <= 2.2 && Math.abs(slx) <= 2.8 ? [246, 238, 214] : [188, 122, 58];
    }
  }
  // Ruined Atlantis Concentric Rings, Lagoon & Western Ship Dock in the Deep Eastern Ocean (980, 420)
  const atMapDx = x - RUINED_ATLANTIS_POS.x;
  const atMapDz = z - RUINED_ATLANTIS_POS.z;
  const atMapDist = Math.hypot(atMapDx, atMapDz);
  if (
    atMapDist <= RUINED_ATLANTIS_POS.outerRingRadius + 16.0 ||
    (x >= RUINED_ATLANTIS_POS.dockX - 2.0 && x <= RUINED_ATLANTIS_POS.x && Math.abs(atMapDz) <= 5.8)
  ) {
    if (atMapDist <= 7.5) {
      return [38, 224, 238]; // Glowing Cyan Boss Seal Core & Poseidon Statue
    }
    if (Math.abs(atMapDist - 19.5) <= 2.0 || Math.abs(atMapDist - 31.0) <= 2.2) {
      return [224, 182, 74]; // Concentric Orichalcum Gold Rings
    }
    if (atMapDist <= RUINED_ATLANTIS_POS.innerArenaRadius) {
      return [212, 228, 234]; // Central Boss Arena Marble Sanctuary
    }
    if (
      (x >= RUINED_ATLANTIS_POS.dockX - 1.5 && x <= RUINED_ATLANTIS_POS.x - 30.0 && Math.abs(atMapDz) <= 5.0) ||
      (atMapDist <= RUINED_ATLANTIS_POS.outerRingRadius + 3.0 &&
        (Math.abs(atMapDx) <= 4.0 || Math.abs(atMapDz) <= 4.0))
    ) {
      return [198, 216, 224]; // Western Ship Dock & Radial Marble Causeways
    }
    if (
      atMapDist >= RUINED_ATLANTIS_POS.outerRingRadius - 5.0 &&
      atMapDist <= RUINED_ATLANTIS_POS.outerRingRadius + 5.0
    ) {
      return [176, 204, 214]; // Above-water Outer Ring Colonnade & Aqueduct Ruins
    }
    return [44, 194, 208]; // Luminous Bioluminescent Turquoise Atlantis Lagoon
  }

  // Nordic Frost Giant Shrine & Geothermal Hot Springs at (-320, -290)
  const nfMapDist = Math.hypot(x - NORDIC_FROST_SHRINE_POS.x, z - NORDIC_FROST_SHRINE_POS.z);
  if (nfMapDist <= 24.0) {
    if (nfMapDist <= NORDIC_FROST_SHRINE_POS.poolRadius) {
      return [42, 214, 222]; // Steaming Turquoise Geothermal Pool
    }
    if (Math.abs(nfMapDist - 15.0) <= 1.8) {
      return [112, 224, 248]; // Glowing Cyan-Ice Runestone Ring
    }
    return [192, 204, 214]; // Carved Nordic Stone Sanctuary Plaza
  }

  // Ancient Pharaoh Stepped Sun Pyramid, Twin Obelisks & Sphinx at (-475, 295)
  const pyMapDx = x - DESERT_PYRAMID_SANCTUARY_POS.x;
  const pyMapDz = z - DESERT_PYRAMID_SANCTUARY_POS.z;
  const pyMaxC = Math.max(Math.abs(pyMapDx), Math.abs(pyMapDz));
  if (pyMaxC <= DESERT_PYRAMID_SANCTUARY_POS.halfBase) {
    if (pyMaxC <= DESERT_PYRAMID_SANCTUARY_POS.topHalf) {
      return [252, 216, 62]; // Golden Sun-Disc Summit Altar
    }
    const tierStripe = Math.floor(((DESERT_PYRAMID_SANCTUARY_POS.halfBase - pyMaxC) / 16.5) * 5) % 2;
    return tierStripe === 0 ? [232, 184, 78] : [208, 158, 62];
  }
  if (
    pyMapDx >= DESERT_PYRAMID_SANCTUARY_POS.topHalf &&
    pyMapDx <= DESERT_PYRAMID_SANCTUARY_POS.rampMaxX - DESERT_PYRAMID_SANCTUARY_POS.x &&
    Math.abs(pyMapDz) <= DESERT_PYRAMID_SANCTUARY_POS.rampHalfWidthZ
  ) {
    return [218, 174, 92]; // Eastern Ceremonial Stair Ramp
  }

  // Mid-Ocean Corsair Smuggler Cove & Beacon Watchtower at (540, 185)
  const smMapDist = Math.hypot(x - SMUGGLER_ISLAND_POS.x, z - SMUGGLER_ISLAND_POS.z);
  if (Math.hypot(x - SMUGGLER_ISLAND_POS.towerX, z - SMUGGLER_ISLAND_POS.towerZ) <= 5.0) {
    return [228, 78, 52]; // Corsair Beacon Watchtower
  }
  if (
    x >= SMUGGLER_ISLAND_POS.dockMinX &&
    x <= SMUGGLER_ISLAND_POS.dockMaxX &&
    Math.abs(z - SMUGGLER_ISLAND_POS.dockZ) <= SMUGGLER_ISLAND_POS.dockHalfWidthZ
  ) {
    return [184, 128, 68]; // Smuggler Timber Docking Pier
  }
  if (smMapDist <= SMUGGLER_ISLAND_POS.radius - 4.0) {
    return [102, 146, 82]; // Smuggler Cove Island interior
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
    return [226, 202, 152];
  }

  const surfaceGroundH = groundHeightAt(x, z);
  const walk = walkableHeightAt(x, z, surfaceGroundH);
  if (walk.surface === 'pier' || walk.surface === 'cabin') {
    return [192, 138, 82];
  }
  if (walk.surface === 'bridge' || walk.surface === 'tower') {
    return [214, 202, 182];
  }

  const h = walk.height;

  // Murky Swamp & Hippo Marshland Biome (-175, 435) minimap tinting
  const swampMapF = murkySwampBiomeFactorAt(x, z);
  if (swampMapF > 0.18) {
    if (h < WATER_LEVEL + 0.04) {
      // Murky olive-teal swamp water channels & wallow pools
      return [38, 96, 74];
    }
    if (h < WATER_LEVEL + 0.24) {
      // Wet peat mudflats & sedge banks
      return [76, 70, 48];
    }
    // Mossy swamp hummock islands
    return [58, 102, 52];
  }

  // Multi-stop water depth gradient: Turquoise Shoal -> Vibrant Azure Sea -> Deep Navy Ocean
  if (h < WATER_LEVEL) {
    const depth = WATER_LEVEL - h;
    if (depth < 1.25) {
      const t = depth / 1.25;
      return [
        Math.round(64 * (1 - t) + 38 * t),
        Math.round(176 * (1 - t) + 138 * t),
        Math.round(188 * (1 - t) + 174 * t),
      ];
    }
    const deepT = Math.min(1.0, (depth - 1.25) / 6.8);
    return [
      Math.round(38 * (1 - deepT) + 18 * deepT),
      Math.round(138 * (1 - deepT) + 82 * deepT),
      Math.round(174 * (1 - deepT) + 134 * deepT),
    ];
  }

  // Golden sandy beaches along the Eastern Coastline & lake/river shores
  const coastX = easternCoastlineXAt(z);
  const isCoastalBeach = x >= coastX - 16.0 && h < WATER_LEVEL + 1.15;
  if (h < WATER_LEVEL + 0.45 || isCoastalBeach) {
    return [218, 196, 142];
  }

  // Analytical hill-shading & subtle contour lines for illustrated fantasy map relief
  const normal = getSurfaceNormalAt(x, z);
  const sunDot = -0.56 * normal.nx + 0.64 * normal.ny - 0.52 * normal.nz;
  const hillShade = Math.max(0.74, Math.min(1.16, 0.62 + sunDot * 0.62));
  const contourFrac = Math.abs(((h % 6) + 6) % 6 - 3.0);
  const isContour = contourFrac < 0.14 && h > 3.0;
  const shade = hillShade * (isContour ? 0.90 : 1.0);

  // High Alpine Snow Peaks (strictly on northern mountain peaks & high alpine ridges, z < -40)
  const snowF = northernSnowZoneFactorAt(x, z);
  if (snowF > 0.35) {
    return [
      Math.min(255, Math.round((152 * (1 - snowF) + 238 * snowF) * shade)),
      Math.min(255, Math.round((156 * (1 - snowF) + 244 * snowF) * shade)),
      Math.min(255, Math.round((154 * (1 - snowF) + 252 * snowF) * shade)),
    ];
  }

  // Steep Mountain Ridges, Northern Frost Tundra Plateau & Desert Sandstone Crags
  const swBiome = southwestOasisBiomeFactorAt(x, z);
  if (h > 12.5 || normal.ny < 0.76) {
    if (swBiome > 0.35) {
      // Warm sandstone-terracotta mountains in the Southwest Desert & Dragon Ruins barrier
      return [
        Math.min(255, Math.round(168 * shade)),
        Math.min(255, Math.round(124 * shade)),
        Math.min(255, Math.round(88 * shade)),
      ];
    }
    if (z < -65.0 && normal.ny >= 0.78) {
      // Northern Highland Tundra & Sub-Alpine Steppe between the snow-capped peaks (matching the reference map's warm pale tundra)
      const frostMix = smoothstep(-75.0, -240.0, z);
      const rTundra = 148 * (1 - frostMix) + 194 * frostMix;
      const gTundra = 152 * (1 - frostMix) + 188 * frostMix;
      const bTundra = 116 * (1 - frostMix) + 168 * frostMix;
      return [
        Math.min(255, Math.round(rTundra * shade)),
        Math.min(255, Math.round(gTundra * shade)),
        Math.min(255, Math.round(bTundra * shade)),
      ];
    }
    return [
      Math.min(255, Math.round(134 * shade)),
      Math.min(255, Math.round(128 * shade)),
      Math.min(255, Math.round(118 * shade)),
    ];
  }

  // Interconnected Dirt & Stone Trail Network
  const tf = trailFactorAt(x, z);
  if (tf > 0.34) {
    return [
      Math.min(255, Math.round(176 * shade)),
      Math.min(255, Math.round(144 * shade)),
      Math.min(255, Math.round(102 * shade)),
    ];
  }

  // Gradual Western Volcanic Badlands & Basalt Foothills Ecotone
  const volBadlands = volcanicBadlandsFactorAt(x, z);
  if (volBadlands > 0.06) {
    const vAng = Math.atan2(z - VOLCANO_SANCTUM_POS.z, x - VOLCANO_SANCTUM_POS.x);
    const radialWarp = fbm2D(x * 0.024 + 3.1, z * 0.024 - 2.4, 2) * 1.35;
    const lavaCrack = Math.abs(Math.sin(vAng * 7.0 + radialWarp));
    if (lavaCrack < 0.085 && volcanoDist < 195.0) {
      return [234, 86, 28];
    }
    // Multi-stop blend: Meadow (88,138,68) -> Warm Basalt Foothills (112,92,68) -> Scorched Ashlands (58,49,46)
    const foothillT = smoothstep(0.06, 0.48, volBadlands);
    const ashT = smoothstep(0.42, 0.92, volBadlands);
    const rMid = 88 * (1 - foothillT) + 114 * foothillT;
    const gMid = 138 * (1 - foothillT) + 94 * foothillT;
    const bMid = 68 * (1 - foothillT) + 68 * foothillT;
    const rFinal = rMid * (1 - ashT) + 58 * ashT;
    const gFinal = gMid * (1 - ashT) + 49 * ashT;
    const bFinal = bMid * (1 - ashT) + 46 * ashT;
    return [
      Math.min(255, Math.round(rFinal * shade)),
      Math.min(255, Math.round(gFinal * shade)),
      Math.min(255, Math.round(bFinal * shade)),
    ];
  }

  // Gradual Southwest Savanna -> Terracotta Steppe -> Deep Golden Desert Ecotone
  if (swBiome > 0.05) {
    // 0.05..0.42: Meadow (88,138,68) -> Golden Savanna (166,154,82)
    // 0.42..0.76: Golden Savanna (166,154,82) -> Terracotta Steppe (198,156,96)
    // 0.76..1.00: Terracotta Steppe (198,156,96) -> Golden Desert Sand (224,186,118)
    let rD: number;
    let gD: number;
    let bD: number;
    if (swBiome < 0.42) {
      const t = (swBiome - 0.05) / 0.37;
      rD = 88 + t * (166 - 88);
      gD = 138 + t * (154 - 138);
      bD = 68 + t * (82 - 68);
    } else if (swBiome < 0.76) {
      const t = (swBiome - 0.42) / 0.34;
      rD = 166 + t * (198 - 166);
      gD = 154 + t * (156 - 154);
      bD = 82 + t * (96 - 82);
    } else {
      const t = (swBiome - 0.76) / 0.24;
      rD = 198 + t * (224 - 198);
      gD = 156 + t * (186 - 156);
      bD = 96 + t * (118 - 96);
    }
    return [
      Math.min(255, Math.round(rD * shade)),
      Math.min(255, Math.round(gD * shade)),
      Math.min(255, Math.round(bD * shade)),
    ];
  }

  // Gradual Northern Taiga & Frost Tundra Ecotone
  const tundraF = northernTundraFactorAt(x, z);
  if (tundraF > 0.08) {
    const rT = 84 * (1 - tundraF) + 146 * tundraF;
    const gT = 128 * (1 - tundraF) + 152 * tundraF;
    const bT = 68 * (1 - tundraF) + 138 * tundraF;
    return [
      Math.min(255, Math.round(rT * shade)),
      Math.min(255, Math.round(gT * shade)),
      Math.min(255, Math.round(bT * shade)),
    ];
  }

  if (birchGroveFactorAt(x, z) > 0.35) {
    return [
      Math.min(255, Math.round(168 * shade)),
      Math.min(255, Math.round(132 * shade)),
      Math.min(255, Math.round(58 * shade)),
    ];
  }

  if (h > 7.5) {
    return [
      Math.min(255, Math.round(104 * shade)),
      Math.min(255, Math.round(124 * shade)),
      Math.min(255, Math.round(82 * shade)),
    ];
  }

  const forestF = regionalForestDensityAt(x, z);
  if (forestF > 0.36) {
    const fMix = smoothstep(0.36, 0.78, forestF);
    return [
      Math.min(255, Math.round((84 * (1 - fMix) + 46 * fMix) * shade)),
      Math.min(255, Math.round((134 * (1 - fMix) + 92 * fMix) * shade)),
      Math.min(255, Math.round((66 * (1 - fMix) + 44 * fMix) * shade)),
    ];
  }

  return [
    Math.min(255, Math.round(86 * shade)),
    Math.min(255, Math.round(136 * shade)),
    Math.min(255, Math.round(68 * shade)),
  ];
}

/**
 * Summary: Returns true when the player is underground inside the Dwarven Mine complex.
 */
export function isPlayerInsideUndergroundMine(x: number, y: number, z: number): boolean {
  return y < -1.4 && isInsideSouthernMine(x, z, y);
}

/**
 * Summary: Dedicated architectural floorplan sampler for the Underground Dwarven Mine (Moria) Map Layer.
 */
export function sampleUndergroundMineMapColorAt(x: number, z: number): [number, number, number] {
  const lx = x - SOUTHERN_MINE_POS.x;
  const lz = z - SOUTHERN_MINE_POS.entranceZ;

  // Entrance approach steps just outside the portal
  if (Math.abs(lx) <= 6.2 && lz >= -5.5 && lz <= 1.0) {
    return [142, 124, 102];
  }

  if (!isInsideSouthernMine(x, z)) {
    // Subterranean bedrock wall rim & dark slate background
    if (
      isInsideSouthernMine(x - 1.8, z) ||
      isInsideSouthernMine(x + 1.8, z) ||
      isInsideSouthernMine(x, z - 1.8) ||
      isInsideSouthernMine(x, z + 1.8)
    ) {
      return [62, 54, 48];
    }
    return [18, 16, 20];
  }

  // 1) Rideable Minecart Rail Lines (Golden-Iron Tracks)
  for (let l = 0; l < DWARVEN_RIDEABLE_MINECART_LINES.length; l++) {
    const wps = DWARVEN_RIDEABLE_MINECART_LINES[l].localWaypoints;
    for (let i = 0; i < wps.length - 1; i++) {
      const d = distToSegment(lx, lz, wps[i][0], wps[i][2], wps[i + 1][0], wps[i + 1][2]);
      if (d <= 0.95) {
        return [238, 186, 74];
      }
    }
  }
  for (let r = 0; r < DWARVEN_MINECART_ROUTES.length; r++) {
    const rt = DWARVEN_MINECART_ROUTES[r];
    const d = distToSegment(
      lx,
      lz,
      rt.startLocalX,
      rt.startLocalZ,
      rt.endLocalX,
      rt.endLocalZ
    );
    if (d <= 0.85) {
      return [182, 148, 92];
    }
  }

  // 2) Bridges & Jetties (Lagoon Bridge, South Jetty, Khazad-dûm Central & West Bridges)
  if (
    (lx >= -135.0 && lx <= -101.0 && lz >= 70.5 && lz <= 75.5) ||
    (lx >= -130.0 && lx <= -106.0 && lz >= 91.5 && lz <= 100.0) ||
    (lx >= -15.0 && lx <= -8.0 && lz >= 178.0 && lz <= 218.0)
  ) {
    return [188, 134, 76];
  }
  if (lx >= -3.5 && lx <= 3.5 && lz >= 178.0 && lz <= 218.0) {
    return [222, 192, 126];
  }

  // 3) Chamber 2 Turquoise Waterfall Lagoon
  if (isInsideSouthernMineLagoonBasin(lx, lz)) {
    if (Math.hypot(lx - -118.0, lz - 102.0) <= 5.2) {
      return [168, 244, 252];
    }
    return [38, 204, 220];
  }

  // 4) Chamber 4 Bottomless Abyss of Khazad-dûm
  if (lz > 180.0 && lz < 216.0 && Math.abs(lx) <= 64.0) {
    if (Math.abs(lz - 198.0) <= 2.4) {
      return [118, 36, 22];
    }
    return [28, 16, 22];
  }

  // 5) Chamber 4 Colossal Pillars & Royal Sanctuary Dais
  if (lz >= 158.0 && lz <= 248.0 && Math.abs(lx) <= 64.0) {
    for (const px of [-48, -32, -16, 16, 32, 48]) {
      for (const pz of [170, 192, 214, 236]) {
        if (Math.abs(lx - px) <= 2.4 && Math.abs(lz - pz) <= 2.4) {
          return [218, 174, 84];
        }
      }
    }
    if (Math.abs(lx) <= 12.0 && lz >= 230.0 && lz <= 246.0) {
      return [198, 164, 96];
    }
  }

  // 6) Chamber 3 Smelting Foundry Blast Furnaces
  if (
    lx >= 114.5 &&
    lx <= 123.5 &&
    (Math.abs(lz - 64.0) <= 3.8 || Math.abs(lz - 82.0) <= 3.8)
  ) {
    return [244, 108, 36];
  }

  // 7) Room 1 Mess Hall Banquet Tables
  if (
    lx >= -27.5 &&
    lx <= -14.5 &&
    (Math.abs(lz - 38.0) <= 1.3 || Math.abs(lz - 43.0) <= 1.3)
  ) {
    return [172, 118, 66];
  }

  // 8) Carved Subterranean Stone Floor
  if (Math.abs(lx) <= 38.0 && lz >= 28.0 && lz <= 68.0) {
    return [122, 106, 92];
  }
  return [106, 92, 80];
}

// #endregion

// ======================== WORLD OBSTACLE GENERATOR ======================== \\
// #region World Obstacle Generator
/**
 * Summary: Generates procedural static collision cylinders for trees, boulders, and flora.
 * @returns Collision cylinders for trees, rocks and props.
 */
export function generateWorldObstacles(): IObstacleCylinder[] {
  const obstacles: IObstacleCylinder[] = [];

  const isInsideBearCaveExclusion = (x: number, z: number): boolean => {
    if (isInsideBearCave(x, z) !== null) return true;
    for (let i = 0; i < BEAR_MOUNTAIN_CAVES.length; i++) {
      const cave = BEAR_MOUNTAIN_CAVES[i];
      const sinY = Math.sin(cave.facingYaw);
      const cosY = Math.cos(cave.facingYaw);
      const dx = x - cave.x;
      const dz = z - cave.z;
      const lx = dx * cosY - dz * sinY;
      const lz = dx * sinY + dz * cosY;
      if (lz >= -28.0 && lz <= 15.0 && Math.abs(lx) <= 16.0) {
        return true;
      }
      if (
        Math.hypot(x - cave.x, z - cave.z) < cave.radius + 11.5 ||
        Math.hypot(x - cave.entranceX, z - cave.entranceZ) < 12.5
      ) {
        return true;
      }
    }
    return false;
  };

  const towerCorners = [
    [-2.5, -2.5],
    [2.5, -2.5],
    [-2.5, 2.5],
    [2.5, 2.5],
  ];
  for (const [ox, oz] of towerCorners) {
    obstacles.push({
      x: 30.0 + ox,
      z: -26.0 + oz,
      radius: 0.25,
      kind: 'pillar',
      scale: 1.2,
      seed: 0.5,
    });
  }

  const pylonGroundY = groundHeightAt(ROPE_BRIDGE_DEF.mx, ROPE_BRIDGE_DEF.mz);
  const pylonScale = Math.max(1.2, (ROPE_BRIDGE_DEF.my - pylonGroundY + 4.0) / 3.5);
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
      scale: pylonScale,
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
  const OAK_VARIANTS = [
    'oakgreen',
    'animtree',
    'animtree_wide',
    'animtree_compact',
  ] as const;
  const getOakTrunkRadiusFactor = (
    variant: (typeof OAK_VARIANTS)[number]
  ): number => {
    switch (variant) {
      case 'oakgreen':
        return 0.68;
      case 'animtree':
        return 0.26;
      case 'animtree_wide':
        return 0.41;
      case 'animtree_compact':
        return 0.28;
    }
  };

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
      const oakVariant = OAK_VARIANTS[obstacles.length % OAK_VARIANTS.length];
      obstacles.push({
        x: tx,
        z: tz,
        radius: (isOak ? getOakTrunkRadiusFactor(oakVariant) : 0.43) * scale,
        kind: isOak ? 'oak' : 'pine',
        scale,
        seed: ((i * 13 + rIdx * 29) % 100) / 100,
        treeVariant: isOak ? oakVariant : 'pinetree',
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
      if (inBirchClearZone || isInsideBearCaveExclusion(x, z)) continue;
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
          treeVariant: 'oakyellow',
        });
      }
    }
  }

  const step = 7.4;
  for (let gx = -580; gx <= 580; gx += step) {
    for (let gz = -580; gz <= 580; gz += step) {
      const distGrid = Math.hypot(gx, gz);
      if (distGrid > 650) continue;

      const ix = Math.round(gx * 10);
      const iz = Math.round(gz * 10);
      const r1 = hash2D(ix, iz);
      if (distGrid > 380 && r1 < 0.42) continue;

      const r2 = hash2D(ix + 17, iz - 31);
      const r3 = hash2D(ix - 53, iz + 89);

      const x = gx + (r1 - 0.5) * 5.2;
      const z = gz + (r2 - 0.5) * 5.2;

      if (birchGroveFactorAt(x, z) > 0.35) continue;
      if (Math.hypot(x - SAKURA_SANCTUARY_POS.x, z - SAKURA_SANCTUARY_POS.z) < 34) continue;
      if (isInsideBearCaveExclusion(x, z)) continue;

      let inClearZone = false;
      for (let c = 0; c < CLEAR_ZONES.length; c++) {
        const cz = CLEAR_ZONES[c];
        if (Math.hypot(x - cz.x, z - cz.z) < cz.r) {
          inClearZone = true;
          break;
        }
      }
      if (inClearZone) continue;
      // Never spawn trees or boulders on the Southern Cliffside Mountain Pass corridor
      if (x >= 88.0 && x <= 116.0 && z >= 504.0 && z <= 692.0) continue;
      if (x >= 195 && z >= 85 && z <= 325) continue;
      if (x >= 245 && z > 325) continue;

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
          const isSlopeBoulder = h > 21.0 || normal.ny < 0.7;
          const slopeScale = 0.85 + r2 * 0.6;
          obstacles.push({
            x,
            z,
            radius: isSlopeBoulder ? 0.9 + r1 * 0.65 : 0.43 * slopeScale,
            kind: isSlopeBoulder ? 'boulder' : 'pine',
            scale: slopeScale,
            seed: r3,
            treeVariant: isSlopeBoulder ? undefined : 'pinetree',
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

      const spawnChance = regDensity * 0.84;
      if (r3 < spawnChance) {
        const scale = 0.95 + r1 * 0.48;
        const isOak = (x < -10 && r2 > 0.35 && h < 8.5) || (z > 135 && r2 > 0.38) || (r2 > 0.72 && h < 7.0);
        const oakVariant = OAK_VARIANTS[obstacles.length % OAK_VARIANTS.length];
        obstacles.push({
          x,
          z,
          radius: (isOak ? getOakTrunkRadiusFactor(oakVariant) : 0.43) * scale,
          kind: isOak ? 'oak' : 'pine',
          scale,
          seed: r3,
          treeVariant: isOak ? oakVariant : 'pinetree',
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

  cachedWorldObstacles = obstacles;
  buildWorldObstacleGrid(obstacles);
  return obstacles;
}

const OBSTACLE_GRID_CELL_SIZE = 24.0;
const EMPTY_OBSTACLE_CELL: readonly IObstacleCylinder[] = [];
const _nearbyObstaclesScratch: IObstacleCylinder[] = [];
let cachedWorldObstacles: IObstacleCylinder[] | null = null;
let cachedWorldObstacleGrid: Map<number, IObstacleCylinder[]> | null = null;

function encodeObstacleCellKey(cx: number, cz: number): number {
  return ((cx + 512) << 10) | ((cz + 512) & 1023);
}

function buildWorldObstacleGrid(obstacles: readonly IObstacleCylinder[]): Map<number, IObstacleCylinder[]> {
  const grid = new Map<number, IObstacleCylinder[]>();
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const cx = Math.floor(obs.x / OBSTACLE_GRID_CELL_SIZE);
    const cz = Math.floor(obs.z / OBSTACLE_GRID_CELL_SIZE);
    const key = encodeObstacleCellKey(cx, cz);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(obs);
  }
  cachedWorldObstacleGrid = grid;
  return grid;
}

/**
 * Summary: Returns cached world obstacle cylinders (trees, boulders, stones) for fast wildlife collision queries.
 */
export function getWorldObstacles(): readonly IObstacleCylinder[] {
  if (!cachedWorldObstacles) {
    cachedWorldObstacles = generateWorldObstacles();
  }
  return cachedWorldObstacles;
}

/**
 * Summary: Returns only the world obstacles in the 24m spatial grid cells overlapping (x, z) +/- searchRadius.
 * Design: Zero-allocation spatial hash lookup (~600x faster than scanning all 6,000 world obstacles).
 */
export function getNearbyWorldObstacles(
  x: number,
  z: number,
  searchRadius = 4.0
): readonly IObstacleCylinder[] {
  if (!cachedWorldObstacleGrid) {
    getWorldObstacles();
  }
  const grid = cachedWorldObstacleGrid!;
  const reach = searchRadius + 1.8;
  const minCx = Math.floor((x - reach) / OBSTACLE_GRID_CELL_SIZE);
  const maxCx = Math.floor((x + reach) / OBSTACLE_GRID_CELL_SIZE);
  const minCz = Math.floor((z - reach) / OBSTACLE_GRID_CELL_SIZE);
  const maxCz = Math.floor((z + reach) / OBSTACLE_GRID_CELL_SIZE);

  if (minCx === maxCx && minCz === maxCz) {
    return grid.get(encodeObstacleCellKey(minCx, minCz)) ?? EMPTY_OBSTACLE_CELL;
  }

  _nearbyObstaclesScratch.length = 0;
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const bucket = grid.get(encodeObstacleCellKey(cx, cz));
      if (bucket) {
        for (let i = 0; i < bucket.length; i++) {
          _nearbyObstaclesScratch.push(bucket[i]);
        }
      }
    }
  }
  return _nearbyObstaclesScratch;
}

const FLOWER_WATER_COMPASS_DIRS: ReadonlyArray< readonly [number, number] > = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7071, 0.7071],
  [-0.7071, 0.7071],
  [0.7071, -0.7071],
  [-0.7071, -0.7071],
];

/**
 * Summary: Evaluates whether (x, z) is on dry land immediately bordering a freshwater lake,
 *          waterfall pool, river bank, or oasis lagoon where waterside flowers (Cornflowers) grow.
 */
export function isNearWaterForFlowers(x: number, z: number): boolean {
  if (getWaterSurfaceHeightAt(x, z) !== null) return false;
  if (trailFactorAt(x, z) > 0.22) return false;
  if (isInsideBearCave(x, z) !== null) return false;
  if (
    Math.abs(x - SOUTHERN_MINE_POS.x) < 12.0 &&
    z > SOUTHERN_MINE_POS.entranceZ - 10.0 &&
    z < SOUTHERN_MINE_POS.entranceZ + 22.0
  ) {
    return false;
  }

  // 1) Southwest Oasis Lagoon lush perimeter bank (1.03 <= lagNorm <= 1.48)
  const lagNorm = Math.hypot(
    (x - SOUTHWEST_OASIS_POS.lagoonX) / SOUTHWEST_OASIS_POS.lagoonRadiusX,
    (z - SOUTHWEST_OASIS_POS.lagoonZ) / SOUTHWEST_OASIS_POS.lagoonRadiusZ
  );
  if (lagNorm >= 1.03 && lagNorm <= 1.48) {
    const oH = groundHeightAt(x, z);
    return oH >= SOUTHWEST_OASIS_POS.lagoonWaterY + 0.04 && oH <= SOUTHWEST_OASIS_POS.terraceY + 0.85;
  }

  // Exclude arid southwest desert outside the oasis lagoon perimeter
  if (x < -38 && z > 38) return false;

  // Exclude salty eastern ocean beaches
  const coastX = easternCoastlineXAt(z);
  if (x >= coastX - 10.0) return false;

  const gy = groundHeightAt(x, z);
  if (gy < WATER_LEVEL + 0.06 || gy > WATER_LEVEL + 1.45) {
    return false;
  }

  // Must be within 1.8m..6.5m of actual water surface
  for (let d = 0; d < FLOWER_WATER_COMPASS_DIRS.length; d++) {
    const [dx, dz] = FLOWER_WATER_COMPASS_DIRS[d];
    const nx1 = x + dx * 2.6;
    const nz1 = z + dz * 2.6;
    if (getWaterSurfaceHeightAt(nx1, nz1) !== null || groundHeightAt(nx1, nz1) <= WATER_LEVEL + 0.1) {
      return true;
    }
    const nx2 = x + dx * 5.8;
    const nz2 = z + dz * 5.8;
    if (getWaterSurfaceHeightAt(nx2, nz2) !== null || groundHeightAt(nx2, nz2) <= WATER_LEVEL + 0.1) {
      return true;
    }
  }

  return false;
}

export interface IWatersideFlowerPlacement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly scale: number;
}

/**
 * Summary: Generates deterministic waterside Cornflower placements exclusively along lakeshores,
 *          waterfall pools, riverbanks, and the oasis lagoon edge.
 */
export function generateWatersideCornflowerPositions(
  targetCount = 260
): IWatersideFlowerPlacement[] {
  const placements: IWatersideFlowerPlacement[] = [];

  const tryAddCandidate = (cx: number, cz: number, seedA: number, seedB: number): void => {
    if (placements.length >= targetCount) return;
    if (!isNearWaterForFlowers(cx, cz)) return;
    const cy = groundHeightAt(cx, cz);
    placements.push({
      x: cx,
      y: cy - 0.02,
      z: cz,
      yaw: seedA * Math.PI * 2,
      scale: 0.78 + seedB * 0.48,
    });
  };

  // 1) Central Lake & Waterfall Pool shoreline rings
  for (let i = 0; i < 420 && placements.length < targetCount; i++) {
    const r1 = hash2D(i * 31 + 17, i * 67 + 13);
    const r2 = hash2D(i * 83 + 29, i * 43 + 19);
    const ang = r1 * Math.PI * 2;
    const radius = 9.0 + r2 * 76.0;
    const cx = WATERFALL_POOL_POS.x * 0.35 + Math.cos(ang) * radius;
    const cz = WATERFALL_POOL_POS.z * 0.35 + Math.sin(ang) * radius;
    tryAddCandidate(cx, cz, r1, r2);
  }

  // 2) Southern River, Crocodile River Bend, and Swamp Fork Branch banks
  const allRiverBranchLists = [SOUTHERN_RIVER_WAYPOINTS, SOUTHERN_RIVER_SWAMP_BRANCH_WAYPOINTS];
  for (let bIdx = 0; bIdx < allRiverBranchLists.length; bIdx++) {
    const branch = allRiverBranchLists[bIdx];
    for (let w = 0; w < branch.length - 1 && placements.length < targetCount; w++) {
      const p0 = branch[w];
      const p1 = branch[w + 1];
      const segSamples = 28;
      for (let s = 0; s < segSamples && placements.length < targetCount; s++) {
        const idx = bIdx * 1000 + w * 100 + s;
        const r1 = hash2D(idx * 19 + 5, idx * 47 + 11);
        const r2 = hash2D(idx * 73 + 23, idx * 37 + 7);
        const t = (s + r1 * 0.8) / segSamples;
        const rx = p0.x + (p1.x - p0.x) * t;
        const rz = p0.z + (p1.z - p0.z) * t;
        const side = s % 2 === 0 ? 1 : -1;
        const bankOffset = 10.5 + r2 * 4.6;
        const segDx = p1.x - p0.x;
        const segDz = p1.z - p0.z;
        const segLen = Math.max(0.001, Math.hypot(segDx, segDz));
        const perpX = -segDz / segLen;
        const perpZ = segDx / segLen;
        const cx = rx + perpX * side * bankOffset;
        const cz = rz + perpZ * side * bankOffset;
        tryAddCandidate(cx, cz, r1, r2);
      }
    }
  }

  // 3) Southwest Oasis Lagoon shore ring
  for (let i = 0; i < 90 && placements.length < targetCount; i++) {
    const r1 = hash2D(i * 59 + 3, i * 29 + 41);
    const r2 = hash2D(i * 97 + 19, i * 61 + 7);
    const ang = (i / 90) * Math.PI * 2 + (r1 - 0.5) * 0.12;
    const normR = 1.06 + r2 * 0.34;
    const cx = SOUTHWEST_OASIS_POS.lagoonX + Math.cos(ang) * SOUTHWEST_OASIS_POS.lagoonRadiusX * normR;
    const cz = SOUTHWEST_OASIS_POS.lagoonZ + Math.sin(ang) * SOUTHWEST_OASIS_POS.lagoonRadiusZ * normR;
    tryAddCandidate(cx, cz, r1, r2);
  }

  // 4) Additional valley lakeside/stream shoreline samples if needed
  for (let i = 0; i < 600 && placements.length < targetCount; i++) {
    const r1 = hash2D(i * 41 + 101, i * 89 + 53);
    const r2 = hash2D(i * 67 + 211, i * 23 + 79);
    const ang = r1 * Math.PI * 2;
    const dist = 8.0 + Math.sqrt(r2) * 185.0;
    const cx = Math.cos(ang) * dist;
    const cz = Math.sin(ang) * dist;
    tryAddCandidate(cx, cz, r1, r2);
  }

  return placements;
}

// #endregion

