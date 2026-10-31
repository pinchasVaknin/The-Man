// ============================================================================
// MODULE: World / Domain / Landmarks / Registry Facade
// DESIGN: Facade pattern aggregating domain landmark and spatial coordinate submodules (SRP, DIP)
// SUMMARY: Exposes all world landmarks, interactive doors, climbable ladders,
//          solid collision boxes, and leveled terraces from focused submodules.
// ============================================================================

// ======================== CORE & NATURAL LANDMARKS ======================== \\
// #region Core & Natural Landmarks
export {
  WATER_LEVEL,
  PLAYER_EYE_HEIGHT,
  PLAYABLE_RADIUS,
  VIEW_DISTANCE,
  SNOW_LINE_ALTITUDE,
  WORLD_SPAWN,
  WATERFALL_CLIFF_POS,
  WATERFALL_POOL_POS,
  BIRCH_GROVE_CENTER,
  MAGIC_STONE_CIRCLE_POS,
  WALKABLE_MOUNTAINS,
  SMALL_MEADOW_HILLS,
  BEAR_MOUNTAIN_CAVES,
  SOUTHERN_RIVER_WAYPOINTS,
  SOUTHERN_RIVER_BRIDGE_POS,
  CROCODILE_RIVER_BEND_POS,
  southernRiverBridgeHeightAt,
  isWithinViewDistance,
} from './landmarks/coreLandmarks';
// #endregion

// ======================== SETTLEMENTS & FARMS ======================== \\
// #region Settlements & Farms
export {
  HUNTER_LODGE_POS,
  RIVERSIDE_WINDMILLS,
  SAKURA_SANCTUARY_POS,
  SAKURA_SANCTUARY_YAW,
  LAKESIDE_TEA_PAVILION_POS,
  VALLEY_FARMS,
  RIDEABLE_HORSES,
} from './landmarks/settlementLandmarks';
// #endregion

// ======================== HIGHLAND BRIDGE & WATCHTOWERS ======================== \\
// #region Highland Bridge & Watchtowers
export {
  HILL_BRIDGE_YAW,
  HILL_BRIDGE_COS,
  HILL_BRIDGE_SIN,
  HILL_WATCHTOWERS,
  ROPE_BRIDGE_DEF,
  ropeBridgePointInfoAt,
} from './landmarks/highlandBridgeLandmarks';
// #endregion

// ======================== DWARVEN KINGDOM ======================== \\
// #region Dwarven Kingdom
export {
  SOUTHERN_MINE_POS,
  DWARVEN_GUARDIAN_STATUES,
  DWARVEN_STONE_HOUSES,
} from './landmarks/dwarvenLandmarks';
// #endregion

// ======================== OASIS & HARBOR ======================== \\
// #region Oasis & Harbor
export {
  SOUTHWEST_OASIS_POS,
  SOUTHEAST_HARBOR_POS,
  MARKET_STALL_LOCATIONS,
  findNearestMarketStall,
} from './landmarks/oasisAndHarborLandmarks';
// #endregion

// ======================== CHINESE FORTRESS ======================== \\
// #region Chinese Fortress
export {
  FORTRESS_Z_OFFSET,
  FORTRESS_Y_OFFSET,
  CHINESE_FORTRESS_POS,
  CORNER_WATCHTOWERS,
  ARCHERY_TARGETS,
  isChineseFortressWalkableZone,
  chineseFortressStairHeightAt,
} from './landmarks/fortressLandmarks';
// #endregion

// ======================== INTERACTIONS LADDERS AND DOORS ======================== \\
// #region Interactions
export {
  getLadderById,
  findWatchtowerLadderAt,
  isOnWatchtowerLadder,
  findLookedAtWatchtowerLadder,
  FORTRESS_DOORS,
  findNearestFortressDoor,
} from './landmarks/interactionLandmarks';
// #endregion

// ======================== COLLISION & TERRACES ======================== \\
// #region Collision & Terraces
export {
  SOLID_BUILDING_BOXES,
  FLAT_BUILDING_TERRACES,
  CLEAR_ZONES,
} from './landmarks/collisionAndTerraces';
// #endregion
