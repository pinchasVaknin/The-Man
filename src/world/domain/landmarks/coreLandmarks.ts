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
export const PLAYABLE_RADIUS = 760;

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
  { id: 'south-distant-peak', x: -135, z: 245, radius: 88, height: 29.0 },
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

/** Summary: Mountain forest caves carved directly into mountain flanks ("חור בהר") serving as bear dens. */
export const BEAR_MOUNTAIN_CAVES = [
  {
    id: 'cave-nw-forest',
    x: -85,
    z: -76,
    entranceX: -85,
    entranceZ: -64,
    floorY: 4.2,
    radius: 11.5,
    roofHeight: 8.2,
    facingYaw: 0,
  },
  {
    id: 'cave-west-ridge',
    x: -186,
    z: -45,
    entranceX: -174,
    entranceZ: -45,
    floorY: 4.5,
    radius: 11.5,
    roofHeight: 8.2,
    facingYaw: Math.PI / 2,
  },
  {
    id: 'cave-south-forest',
    x: -135,
    z: 196,
    entranceX: -135,
    entranceZ: 184,
    floorY: 4.6,
    radius: 11.5,
    roofHeight: 8.2,
    facingYaw: Math.PI,
  },
] as const;

/** Summary: Centerline waypoints for the Southern River flowing from the Sea south-southwest across the expanded southern wilderness. */
export const SOUTHERN_RIVER_WAYPOINTS = [
  { x: 256.0, z: 330.0 },
  { x: 178.0, z: 352.0 },
  { x: 178.0, z: 404.0 },
  { x: 132.0, z: 475.0 },
  { x: 104.0, z: 548.0 },
] as const;

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
