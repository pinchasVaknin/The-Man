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
  SOUTHERN_RIVER_SWAMP_BRANCH_WAYPOINTS,
  SOUTHERN_PASS_VALLEY_POS,
  SOUTHERN_DRAGON_RUINS_POS,
  DESERT_DRAGON_PASS_POS,
  SOUTHERN_RIVER_BRIDGE_POS,
  CROCODILE_RIVER_BEND_POS,
  MURKY_SWAMP_BIOME_POS,
  VOLCANO_SANCTUM_POS,
  NORDIC_FROST_SHRINE_POS,
  DESERT_PYRAMID_SANCTUARY_POS,
  SMUGGLER_ISLAND_POS,
  RUINED_ATLANTIS_POS,
  SAILABLE_SHIP_INITIAL_POS,
  FLOATING_ISLAND_STAIR_POS,
  FLOATING_WATERFALL_STEP_ISLANDS,
  SKY_WIND_GEYSERS,
  type IFloatingWaterfallStepIsland,
  type ISkyWindGeyser,
  southernRiverBridgeHeightAt,
  floatingBloomingIslandHeightAt,
  desertPyramidHeightAt,
  isWithinViewDistance,
} from './landmarks/coreLandmarks';
// #endregion

// ======================== SKYBOUND ISLES ARCHIPELAGO ======================== \
// #region Skybound Isles
export {
  SKY_HARBOR,
  STORM_ISLAND,
  SKYBOUND_ISLANDS,
  SKY_BRIDGES,
  SKYBOUND_REGION,
  WINDSPIRE,
  getSkyIsland,
  isInsideSkyboundRegion,
  type ISkyIsland,
  type ISkyBridge,
  type SkyLayer,
} from './landmarks/skyboundIsles/skyboundLayout';
export {
  SKY_CLOUDS,
  SKY_ROUTES,
  SKY_REST_PLATFORMS,
  SKY_CLOUD_MAZE,
  type ISkyRestPlatform,
} from './landmarks/skyboundIsles/skyCloudRoutes';
export {
  SKY_CLOUD_KIND_CONFIG,
  DEFAULT_BOUNCE_VY,
  STORM_GUST_SPEED_MPS,
  getSkyCloudRuntimes,
  resetSkyClouds,
  stepSkyClouds,
  skyCloudSurfaceAt,
  isCloudSolid,
  type SkyCloudKind,
  type SkyCloudState,
  type ISkyCloudDef,
  type ISkyCloudRuntime,
} from './landmarks/skyboundIsles/skyCloudSystem';
export {
  SKY_WIND_CURRENTS,
  sampleSkyWindAt,
  applySkyWind,
  isWindCurrentActive,
  SKY_WIND_FLOWERS,
  stepSkyWindFlowers,
  getWindFlowerOpenness,
  resetSkyWindFlowers,
  type ISkyWindFlower,
  type ISkyWindCurrent,
  type IWindSample,
  type SkyWindMode,
} from './landmarks/skyboundIsles/skyWindSystem';
export {
  ARRIVAL_PLAZA,
  ARRIVAL_GATE,
  PLAZA_PILLARS,
  PLAZA_BENCHES,
  PLAZA_LANTERNS,
  SKY_BALCONIES,
  BALCONY_TELESCOPE_SPOTS,
  WINDSPIRE_STAIR,
  WINDSPIRE_BALCONY,
  WINDSPIRE_TOP_LANDING,
  WINDSPIRE_SUMMIT,
  WIND_CORE_SOCKETS,
  SKY_GARDEN_AREA,
  GARDEN_CANOPY_PERCH,
  SKY_BOUNCE_PADS,
  GARDEN_TREES,
  GARDEN_PONDS,
  SKY_DOCK_PIER,
  MOORED_AIRSHIP_DECK,
  AIRSHIP_GANGPLANK,
  DOCK_CRATES,
  DOCK_CRANE,
  SKY_HARBOR_SOLID_BOXES,
  windspireStairHeightsAt,
  type ISkyDeckRect,
  type ISkySolidBox,
  type ISkyBouncePad,
} from './landmarks/skyboundIsles/skyHarborLayout';
export {
  OBSERVATORY_TOWER,
  OBSERVATORY_CHAMBER,
  OBSERVATORY_CHEST_SPOT,
  OBSERVATORY_CHAMBER_GATE,
  OBSERVATORY_STAR_MAP,
  OBSERVATORY_BALCONY,
  OBSERVATORY_BALCONY_RAMP,
  OBSERVATORY_DIAL,
  OBSERVATORY_LEVERS,
  OBSERVATORY_GIANT_TELESCOPE,
  OBSERVATORY_SOLID_BOXES,
} from './landmarks/skyboundIsles/observatoryLayout';
export {
  CRYSTAL_ISLETS,
  CRYSTAL_STEPPING_ROCKS,
  GIANT_CRYSTAL,
  RESONANCE_CLUE_PILLAR,
  CRYSTAL_PASSAGE_RAMP,
  CRYSTAL_GROTTO,
  CRYSTAL_PASSAGE_GATE,
  RESONANCE_CRYSTALS,
  RESONANCE_ORDER,
  CRYSTAL_DEPOSITS,
  CRYSTAL_CLUSTERS,
  CRYSTAL_SOLID_BOXES,
  type ICrystalDisc,
  type ICrystalCluster,
  type ICrystalDepositDef,
} from './landmarks/skyboundIsles/crystalIslesLayout';
export {
  CRYSTAL_CHIPS_TO_MINE,
  CRYSTAL_REGROW_SEC,
  MINING_TOOL_IDS,
  getCrystalDeposits,
  resetCrystalDeposits,
  stepCrystalDeposits,
  strikeCrystalDeposit,
  type ICrystalDepositRuntime,
  type ICrystalStrikeResult,
} from './landmarks/skyboundIsles/skyCrystalMining';
export {
  STORM_FRUIT_BUSHES,
  STORM_FRUIT_REGROW_SEC,
  exportStormFruitState,
  getStormFruitRegrowSec,
  importStormFruitState,
  isStormFruitReady,
  findHarvestableStormFruitBush,
  harvestStormFruitBush,
  resetStormFruit,
  stepStormFruitRegrowth,
  type IStormFruitBushState,
} from './landmarks/skyboundIsles/skyStormFruit';
export {
  SKY_PICKUPS,
  SKY_PICKUP_HOVER_M,
  collectSkyPickupsAt,
  isSkyPickupCollected,
  resetSkyPickups,
  exportSkyPickupState,
  importSkyPickupState,
  type ISkyPickupDef,
} from './landmarks/skyboundIsles/skyPickups';
export {
  RUINS_TEMPLE,
  RUINS_TEMPLE_DOOR,
  RUINS_CHEST_SPOT,
  RUINS_PORTICO_COLUMNS,
  RUINS_CLUE_WALL,
  RUINS_STAIR_LANDING,
  RUINS_BROKEN_STAIR,
  RUINS_COLUMN_TOP,
  RUINS_SEALED_ROOM,
  RUINS_SEALED_CRACK,
  RUINS_BROKEN_BRIDGE,
  RUINS_STATUES,
  RUINS_RUNES,
  RUINS_SOLID_BOXES,
  type IRuinsPlatform,
} from './landmarks/skyboundIsles/ancientRuinsLayout';
export {
  WIND_CORES,
  WIND_CORE_UNLOCKS,
  WIND_CORE_SOLID_BOXES,
  type IWindCoreDef,
} from './landmarks/skyboundIsles/windCoresLayout';
export {
  SKY_MECHANISMS,
  OBSERVATORY_RING_STEPS,
  OBSERVATORY_RING_SOLUTION,
  RUINS_RUNE_COUNT,
  createSkyPuzzleState,
  getSkyPuzzleState,
  resetSkyPuzzles,
  exportSkyPuzzleState,
  importSkyPuzzleState,
  isSkyPuzzleSolved,
  getActiveWindCoreCount,
  isWindCoreActive,
  findNearestSkyMechanism,
  activateSkyMechanism,
  closedSkyGates,
  skyGatesWithState,
  type SkyPuzzleId,
  type SkyMechanismGroup,
  type ISkyPuzzleState,
  type ISkyMechanism,
  type ISkyActivationResult,
} from './landmarks/skyboundIsles/skyPuzzles';
export {
  SKY_TELESCOPES,
  TELESCOPE_MIN_FOV_DEG,
  TELESCOPE_MAX_FOV_DEG,
  getSkyTelescope,
  findNearestSkyTelescope,
  telescopeViewFor,
  shouldExitTelescopeView,
  type ISkyTelescope,
  type ITelescopeView,
} from './landmarks/skyboundIsles/skyTelescopes';
export {
  GARDEN_LAKE,
  GARDEN_STREAM,
  GARDEN_WATERFALL_LIP,
  GARDEN_WATERFALL,
  GARDEN_CAVE_FLOOR,
  GARDEN_CAVE_LEDGE,
  GARDEN_CAVE_RAMP,
  GARDEN_CAVE_CHEST_SPOT,
  SKY_TREE,
  GARDEN_BOUNCE_PADS,
  SKY_TREE_BRANCH_LOW,
  SKY_TREE_BRANCH_HIGH,
  SKY_TREE_CROWN,
  SKY_TREE_BRANCHES,
  GARDEN_WIND_FLOWER_SPOT,
  GARDEN_ROOT_RAMP,
  GARDEN_ROOT_NOOK,
  GARDEN_SOLID_BOXES,
  type IGardenPlatform,
} from './landmarks/skyboundIsles/floatingGardenLayout';
export {
  SKYBOUND_BOUNCE_PADS,
  SKYBOUND_SOLID_BOXES,
  skyBouncePadAt,
  skyboundSurfaceAt,
  createSkyFallTracker,
  updateSkyFallRecovery,
  type ISkyFallTracker,
  type ISkySurfaceHit,
} from './landmarks/skyboundIsles/skyboundSurface';
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
  getMarketStallCatalogItems,
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
  WORLD_BEDS,
  findNearestBed,
  type IWorldBedDef,
  SURVIVAL_CABIN_SPAWN,
  WORLD_CHESTS,
  findNearestWorldChest,
  computeInteractableGazeScore,
  resolveBestLookedAtInteraction,
  WORLD_TRAP_WORKBENCHES,
  findNearestTrapWorkbench,
  type ITrapWorkbench,
} from './landmarks/interactionLandmarks';
// #endregion

// ======================== COLLISION & TERRACES ======================== \\
// #region Collision & Terraces
export {
  SOLID_BUILDING_BOXES,
  FLAT_BUILDING_TERRACES,
  CLEAR_ZONES,
  COLLIDABLE_WORLD_ENTITY_REGISTRY,
  validateWorldEntityColliders,
  getObstacleColliderMetrics,
  getHillWatchtowerLocalWalls,
} from './landmarks/collisionAndTerraces';
export {
  getSolidBuildingWorldAABB,
  pointInsideSolidBuildingBox,
  resolveHorizontalBoxCollision,
  getNearbySolidBuildingBoxes,
} from './collisionWorld';
// #endregion

