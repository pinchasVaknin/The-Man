// ============================================================================
// MODULE: World / Domain / Landmarks / Core
// DESIGN: Fundamental coordinate boundaries, spatial scales, and natural landmarks (SRP)
// SUMMARY: Exposes global world constants (water level, playable radius, view distance, spawn)
//          and natural landmark positions (waterfall, birch grove, mountain peaks).
// ============================================================================

// ======================== GLOBAL SPATIAL CONSTANTS ======================== \\
// #region Global Spatial Constants
/** Summary: Global sea-level altitude in world units. */
export const WATER_LEVEL = 0.0;

/** Summary: Camera eye offset above ground for first-person player perspective. */
export const PLAYER_EYE_HEIGHT = 1.72;

/** Summary: Playable terrain boundary radius from world origin. */
export const PLAYABLE_RADIUS = 960;

/** Summary: Maximum visible distance for terrain chunk culling and entity activation. */
export const VIEW_DISTANCE = 225;

/** Summary: Threshold altitude above which snow accumulates on terrain. */
export const SNOW_LINE_ALTITUDE = 16.5;

/** Summary: Initial player character spawn position and camera orientation. */
export const WORLD_SPAWN = {
  x: 0,
  z: 32,
  yaw: 0.04,
  pitch: -0.04,
} as const;
// #endregion

// ======================== NATURAL GEOGRAPHY LANDMARKS ======================== \\
// #region Natural Geography Landmarks
/** Summary: Grand waterfall cliff top origin coordinates. */
export const WATERFALL_CLIFF_POS = { x: -52, z: -42 } as const;

/** Summary: Plunge pool center coordinates at the base of the waterfall. */
export const WATERFALL_POOL_POS = { x: -42, z: -30 } as const;

/** Summary: Ancient orange birch grove forest boundary and center coordinates. */
export const BIRCH_GROVE_CENTER = { x: 158, z: 118, radius: 108 } as const;

/** Summary: Magic stone circle hill summit and approach trail coordinates. */
export const MAGIC_STONE_CIRCLE_POS = {
  x: -58.0,
  z: 128.0,
  height: 14.5,
  hillRadius: 38.0,
  topFlatRadius: 10.5,
  entryStartX: -16.0,
  entryStartZ: 112.0,
} as const;

/** Summary: Significant mountain summits with radial influence and elevation targets. */
export const WALKABLE_MOUNTAINS = [
  { id: 'nw-waterfall-peak', x: -60, z: -52, radius: 46, height: 24.0 },
  { id: 'north-foothill-west', x: -85, z: -105, radius: 68, height: 18.5 },
  { id: 'north-foothill-center', x: 68, z: -102, radius: 54, height: 14.5 },
  { id: 'north-snow-alpine-center', x: -65, z: -172, radius: 72, height: 29.0 },
  { id: 'north-snow-alpine-west', x: -165, z: -335, radius: 92, height: 36.0 },
  { id: 'north-snow-alpine-east', x: 160, z: -335, radius: 90, height: 33.0 },
  { id: 'ne-summit', x: 212, z: -148, radius: 92, height: 34.0 },
  { id: 'west-ridge', x: -245, z: -45, radius: 92, height: 33.0 },
  { id: 'south-distant-peak', x: 38, z: 328, radius: 78, height: 29.0 },
  { id: 'south-gorge-west-peak', x: 54, z: 600, radius: 54, height: 31.5 },
  { id: 'south-gorge-east-peak', x: 182, z: 600, radius: 54, height: 30.5 },
] as const;

/** Summary: Subtle rolling hill mounds dotting the central spawn meadow. */
export const SMALL_MEADOW_HILLS = [
  { x: 38, z: 72, r: 22, h: 3.6 },
  { x: -28, z: 96, r: 25, h: 4.1 },
  { x: 75, z: 125, r: 28, h: 4.8 },
  { x: 148, z: 95, r: 24, h: 3.9 },
  { x: -155, z: 115, r: 26, h: 4.2 },
  { x: 162, z: -18, r: 22, h: 3.5 },
] as const;

/** Summary: Mountain forest caves carved directly into remote unpopulated hills with ground-level entrances. */
export const BEAR_MOUNTAIN_CAVES = [
  {
    id: 'cave-nw-forest',
    x: -85,
    z: -76,
    entranceX: -85,
    entranceZ: -64,
    floorY: 2.2,
    radius: 11.5,
    roofHeight: 6.4,
    facingYaw: 0,
  },
  {
    id: 'cave-west-ridge',
    x: -186,
    z: -45,
    entranceX: -174,
    entranceZ: -45,
    floorY: 2.25,
    radius: 11.5,
    roofHeight: 6.4,
    facingYaw: Math.PI / 2,
  },
  {
    id: 'cave-south-forest',
    x: 38,
    z: 294,
    entranceX: 38,
    entranceZ: 282,
    floorY: 2.25,
    radius: 11.5,
    roofHeight: 6.4,
    facingYaw: Math.PI,
  },
] as const;

/** Summary: Centerline waypoints for the Southern River flowing from the Sea south-southwest, through the Mountain Gorge Pass, and back to the Sea. */
export const SOUTHERN_RIVER_WAYPOINTS = [
  { x: 256.0, z: 330.0 },
  { x: 178.0, z: 352.0 },
  { x: 178.0, z: 404.0 },
  { x: 132.0, z: 475.0 },
  { x: 118.0, z: 545.0 },
  { x: 118.0, z: 655.0 },
  { x: 168.0, z: 735.0 },
  { x: 258.0, z: 785.0 },
] as const;

/** Summary: Secluded valley glade & traveler camp south of the Mountain Gorge Pass. */
export const SOUTHERN_PASS_VALLEY_POS = {
  x: 105.0,
  z: 715.0,
  height: 2.15,
  floorY: 2.15,
  radius: 36.0,
} as const;

/** Summary: Ancient Mossy Temple Ruins south of the river in the Southern Valley, home to the Forest Dragon. */
export const SOUTHERN_DRAGON_RUINS_POS = {
  x: 56.0,
  z: 716.0,
  height: 2.15,
  radius: 58.0,
} as const;

/** Summary: Grand 3-Arch Stone & Timber Bridge spanning East-West across the Southern River. */
export const SOUTHERN_RIVER_BRIDGE_POS = {
  x: 178.0,
  z: 378.0,
  minX: 154.0,
  maxX: 202.0,
  halfSpanX: 24.0,
  halfWidthZ: 3.1,
  baseY: 1.85,
  crownLift: 2.95,
} as const;

/** Summary: Remote southern river bend & basking lagoon where crocodiles live away from settlements. */
export const CROCODILE_RIVER_BEND_POS = {
  x: 132.0,
  z: 475.0,
  radius: 28.0,
} as const;

/**
 * Summary: Volcanic Mountain & Enterable Mystical CatLion Sanctum in the Western Badlands.
 * Design: Features an east-facing carved obsidian entrance tunnel (`x: -248..-228, z: 115 ± 4.8`)
 *         leading into a vaulted subterranean magma chamber (`center: -265, 115`, `radius: 18.5m`)
 *         where the mystical CatLion sits on an ancient volcanic throne dais.
 */
export const VOLCANO_SANCTUM_POS = {
  x: -265.0,
  z: 115.0,
  floorY: 3.2,
  daisY: 3.65,
  craterRimY: 36.2,
  outerRadius: 52.0,
  chamberRadius: 18.5,
  facingYaw: Math.PI / 2, // +X entrance facing East toward the central valley
  entranceX: -230.0,
  entranceZ: 115.0,
} as const;

/**
 * Summary: Cluster of 3 Large Floating Blooming Sky Islands in the Eastern Sky Meadow,
 *          dedicated habitat of the Royal Stag (`stag`) herd.
 */
export const FLOATING_BLOOMING_ISLANDS = [
  {
    id: 'floating-bloom-island-main',
    x: 205.0,
    z: -35.0,
    deckY: 26.0,
    radius: 28.0,
  },
  {
    id: 'floating-bloom-island-north',
    x: 205.0,
    z: -85.0,
    deckY: 28.0,
    radius: 18.0,
  },
  {
    id: 'floating-bloom-island-east',
    x: 252.0,
    z: -18.0,
    deckY: 27.5,
    radius: 18.0,
  },
] as const;

/**
 * Summary: Ascending stone-and-blossom sky stairway connecting the eastern valley floor
 *          at (152, -35) up to the western rim of the Main Floating Blooming Island at (178, -35, y=26.0).
 */
export const FLOATING_ISLAND_STAIR_POS = {
  footX: 152.0,
  topX: 178.0,
  z: -35.0,
  halfWidthZ: 3.2,
  footY: 3.4,
  topY: 26.0,
} as const;

/**
 * Summary: Computes the walkable deck/bridge/stair height on the Floating Blooming Sky Islands,
 *          or returns null if (x, z, currentY) is not on a floating island surface.
 */
export function floatingBloomingIslandHeightAt(
  x: number,
  z: number,
  currentY?: number
): number | null {
  // 1. Check the 3 Large Floating Blooming Island circular decks
  for (let i = 0; i < FLOATING_BLOOMING_ISLANDS.length; i++) {
    const isl = FLOATING_BLOOMING_ISLANDS[i];
    const d = Math.hypot(x - isl.x, z - isl.z);
    if (d <= isl.radius) {
      const centerCrown = d < isl.radius * 0.65 ? (1.0 - d / (isl.radius * 0.65)) * 0.35 : 0.0;
      const targetY = isl.deckY + centerCrown;
      if (currentY === undefined || currentY >= isl.deckY - 8.5) {
        return targetY;
      }
    }
  }

  // 2. North Floral Sky-Bridge connecting Main Island (205, -62, y=26.0) to North Island (205, -68, y=28.0)
  if (Math.abs(x - 205.0) <= 3.1 && z >= -68.5 && z <= -61.5) {
    const t = Math.max(0, Math.min(1, (-61.5 - z) / 7.0));
    const archLift = Math.sin(t * Math.PI) * 0.55;
    const bridgeY = 26.0 + t * (28.0 - 26.0) + archLift;
    if (currentY === undefined || currentY >= bridgeY - 6.0) {
      return bridgeY;
    }
  }

  // 3. East Floral Sky-Bridge connecting Main Island rim (230, -26, y=26.0) to East Island rim (236.5, -23.6, y=27.5)
  const bx0 = 230.0;
  const bz0 = -26.0;
  const bx1 = 236.5;
  const bz1 = -23.6;
  const bdx = bx1 - bx0;
  const bdz = bz1 - bz0;
  const bLenSq = bdx * bdx + bdz * bdz;
  const bt = Math.max(0, Math.min(1, ((x - bx0) * bdx + (z - bz0) * bdz) / bLenSq));
  const projX = bx0 + bt * bdx;
  const projZ = bz0 + bt * bdz;
  if (Math.hypot(x - projX, z - projZ) <= 3.1) {
    const archLift = Math.sin(bt * Math.PI) * 0.45;
    const bridgeY = 26.0 + bt * (27.5 - 26.0) + archLift;
    if (currentY === undefined || currentY >= bridgeY - 6.0) {
      return bridgeY;
    }
  }

  // 4. Ascending Floral Sky-Stairway from valley floor (x=152) up to Main Island western rim (x=178)
  if (
    x >= FLOATING_ISLAND_STAIR_POS.footX &&
    x <= FLOATING_ISLAND_STAIR_POS.topX &&
    Math.abs(z - FLOATING_ISLAND_STAIR_POS.z) <= FLOATING_ISLAND_STAIR_POS.halfWidthZ
  ) {
    const tStair = Math.max(
      0,
      Math.min(
        1,
        (x - FLOATING_ISLAND_STAIR_POS.footX) /
          (FLOATING_ISLAND_STAIR_POS.topX - FLOATING_ISLAND_STAIR_POS.footX)
      )
    );
    const stairY =
      FLOATING_ISLAND_STAIR_POS.footY +
      tStair * (FLOATING_ISLAND_STAIR_POS.topY - FLOATING_ISLAND_STAIR_POS.footY);
    if (currentY === undefined || (currentY >= stairY - 2.2 && currentY <= stairY + 4.5)) {
      return stairY;
    }
  }

  return null;
}

/**
 * Summary: Computes the walkable arched deck elevation along the Grand Southern River Bridge.
 */
export function southernRiverBridgeHeightAt(x: number): number {
  const normX = Math.max(
    -1,
    Math.min(1, (x - SOUTHERN_RIVER_BRIDGE_POS.x) / SOUTHERN_RIVER_BRIDGE_POS.halfSpanX)
  );
  return (
    SOUTHERN_RIVER_BRIDGE_POS.baseY +
    (1.0 - normX * normX) * SOUTHERN_RIVER_BRIDGE_POS.crownLift
  );
}
// #endregion

// ======================== SPATIAL UTILITIES ======================== \\
// #region Spatial Utilities
/**
 * Summary: Tests whether a 2D coordinate is within a given horizontal viewing radius.
 * Design: Compares squared 2D Euclidean distance to avoid Math.sqrt computation.
 * @param objX Object X coordinate.
 * @param objZ Object Z coordinate.
 * @param playerX Observer X coordinate.
 * @param playerZ Observer Z coordinate.
 * @param margin Buffer distance added to maximum view threshold (default 0).
 * @param maxDist Base view distance cap (default VIEW_DISTANCE).
 * @returns True when object lies within the view radius.
 */
export function isWithinViewDistance(
  objX: number,
  objZ: number,
  playerX: number,
  playerZ: number,
  margin = 0,
  maxDist = VIEW_DISTANCE
): boolean {
  const dx = objX - playerX;
  const dz = objZ - playerZ;
  const limit = maxDist + margin;
  return dx * dx + dz * dz <= limit * limit;
}
// #endregion
