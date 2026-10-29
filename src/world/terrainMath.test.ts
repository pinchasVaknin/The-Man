// ============================================================================
// MODULE: World / Terrain Math Test Suite
// DESIGN: Regression oracle verifying 25 world landmarks and mechanics (SRP)
// SUMMARY: End-to-end integration and unit tests for terrain, water basins, fortress,
//          rope bridge, weather, horses, inventory, combat, and wildlife systems.
// ============================================================================

// ======================== IMPORTS AND TEST DEPENDENCIES ======================== \\
// #region Imports and Test Dependencies
import test from 'node:test';
import assert from 'node:assert/strict';
import type { IPlayerState } from './domain/worldTypes';
import {
  WATER_LEVEL,
  PLAYABLE_RADIUS,
  VIEW_DISTANCE,
  WORLD_SPAWN,
  HUNTER_LODGE_POS,
  WATERFALL_POOL_POS,
  BIRCH_GROVE_CENTER,
  RIVERSIDE_WINDMILLS,
  WALKABLE_MOUNTAINS,
  FORTRESS_Z_OFFSET,
  FORTRESS_Y_OFFSET,
  SAKURA_SANCTUARY_POS,
  SAKURA_SANCTUARY_YAW,
  LAKESIDE_TEA_PAVILION_POS,
  VALLEY_FARMS,
  HILL_WATCHTOWERS,
  ROPE_BRIDGE_DEF,
  ropeBridgePointInfoAt,
  SOUTHERN_MINE_POS,
  SOUTHEAST_HARBOR_POS,
  MAGIC_STONE_CIRCLE_POS,
  CHINESE_FORTRESS_POS,
  CORNER_WATCHTOWERS,
  FORTRESS_DOORS,
  SNOW_LINE_ALTITUDE,
  DEFAULT_WEATHER_CYCLE_MODE,
  groundHeightAt,
  walkableHeightAt,
  getRoofHeightAt,
  isPositionUnderRoof,
  trailFactorAt,
  birchGroveFactorAt,
  northernSnowZoneFactorAt,
  isChineseFortressWalkableZone,
  chineseFortressStairHeightAt,
  findNearestFortressDoor,
  findLookedAtWatchtowerLadder,
  isOnWatchtowerLadder,
  regionalForestDensityAt,
  isWithinViewDistance,
  sampleMinimapColorAt,
  generateWorldObstacles,
  createInitialPlayerState,
  stepPlayerPhysics,
  computeDynamicSolarCycle,
  runTurboWeatherTestCycle,
  runSeasonalWeatherCycle,
  computeWeatherState,
} from './terrainMath';
// #endregion

// ======================== TEST FIXTURES AND FACTORIES ======================== \\
// #region Test Fixtures and Factories
/**
 * Summary: Creates a mock player state fixture initialized to world defaults.
 * Design: Provides isolated test setup for integration testing without shared mutation.
 * @returns Fresh default IPlayerState instance.
 */
function createPlayerStateFixture(): IPlayerState {
  return createInitialPlayerState();
}
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('terrainAndWaterBasins_WhenEvaluatedAtSpawnAndWaterfall_ShouldMaintainCoherentElevations', () => {
  // Arrange
  // Act
  const centralLake = groundHeightAt(-2, 1.5);
  // Assert
  assert.ok(centralLake < WATER_LEVEL - 2.0, `Expected central lake bottom < -2.0m, got ${centralLake}`);

  const westernLagoon = groundHeightAt(-138, 42);
  assert.ok(westernLagoon < WATER_LEVEL - 2.0, `Expected western lagoon bottom < -2.0m, got ${westernLagoon}`);

  const plungePool = groundHeightAt(WATERFALL_POOL_POS.x, WATERFALL_POOL_POS.z);
  assert.ok(plungePool < WATER_LEVEL - 1.2, `Expected waterfall plunge pool < -1.2m, got ${plungePool}`);

  const spawnGround = groundHeightAt(0, 32);
  assert.ok(spawnGround > WATER_LEVEL + 1.0, `Expected dry spawn vista > 1.0m, got ${spawnGround}`);
});

test('worldBuildingsAndSanctuary_WhenPlacedOnTerrain_ShouldSitOnFlatLeveledGround', () => {
  // Arrange
  // Hunter's Lodge, Water Trough & Stable terrace
  const hCenter = groundHeightAt(HUNTER_LODGE_POS.x, HUNTER_LODGE_POS.z);
  // Act
  const hTrough = groundHeightAt(HUNTER_LODGE_POS.x + 8, HUNTER_LODGE_POS.z + 4);
  const hStable = groundHeightAt(HUNTER_LODGE_POS.x + 11, HUNTER_LODGE_POS.z - 5);
  // Assert
  assert.ok(Math.abs(hCenter - hTrough) < 1e-4, 'Expected flat ground between Hunter Lodge and Water Trough');
  assert.ok(Math.abs(hCenter - hStable) < 1e-4, 'Expected flat ground between Hunter Lodge and Stable');

  // Mystic Sakura Hot-Spring & Giant Golden Buddha Sanctuary sits on a leveled 11.5m terrace and aligns with trail
  const sCenter = groundHeightAt(SAKURA_SANCTUARY_POS.x, SAKURA_SANCTUARY_POS.z);
  const sGateX = SAKURA_SANCTUARY_POS.x + 22.5 * Math.sin(SAKURA_SANCTUARY_YAW);
  const sGateZ = SAKURA_SANCTUARY_POS.z + 22.5 * Math.cos(SAKURA_SANCTUARY_YAW);
  const sGateGround = groundHeightAt(sGateX, sGateZ);
  assert.ok(Math.abs(sCenter - SAKURA_SANCTUARY_POS.height) < 1e-3, `Expected Sakura Sanctuary at ${SAKURA_SANCTUARY_POS.height}m, got ${sCenter}`);
  assert.ok(Math.abs(sCenter - sGateGround) < 1e-3, 'Expected flat leveled terrace all the way to the aligned Sakura Paifang Gate');
  assert.ok(trailFactorAt(sGateX, sGateZ) > 0.75, 'Expected trail to lead directly through the aligned Sakura Paifang Gate');

  // Riverside Windmills sit on flat riverbank terraces right beside the river
  for (const wm of RIVERSIDE_WINDMILLS) {
    const h0 = groundHeightAt(wm.x, wm.z);
    const h1 = groundHeightAt(wm.x + 4, wm.z - 3);
    assert.ok(Math.abs(h0 - h1) < 1e-4, `Expected flat ground under ${wm.id}`);
  }
});

test('mountainFortress_WhenTraversedByPlayer_ShouldProvideContinuousRampartsAndElevatedFoundations', () => {
  // Arrange
  // Act
  const FZ = FORTRESS_Z_OFFSET;
  const FY = FORTRESS_Y_OFFSET;
  // Assert
  assert.equal(FZ, -170, 'Expected Fortress Z offset of -170m deep into the North');
  assert.equal(FY, 16.0, 'Expected Fortress Y offset of +16.0m so it sits atop a tall mountain');

  // Staircase foot (-248) is flush with the northern mountain ground at ~25.0m (no sunken hole in the ground!)
  const groundAtStairFoot = groundHeightAt(0, CHINESE_FORTRESS_POS.stairFootZ);
  const groundJustSouthOfFoot = groundHeightAt(0, CHINESE_FORTRESS_POS.stairFootZ + 4.0);
  assert.ok(
    Math.abs(groundAtStairFoot - CHINESE_FORTRESS_POS.stairBaseHeight) < 0.35,
    `Expected ground at stair foot (${groundAtStairFoot}) to match stairBaseHeight (${CHINESE_FORTRESS_POS.stairBaseHeight}) with zero sunken hole`
  );
  assert.ok(
    Math.abs(groundJustSouthOfFoot - groundAtStairFoot) < 1.2,
    `Expected smooth terrain transition south of stair foot without a cliff drop or hole, got ${groundJustSouthOfFoot} vs ${groundAtStairFoot}`
  );

  const stairLower = chineseFortressStairHeightAt(-91 + FZ);
  assert.ok(stairLower > 14.0 + FY && stairLower < 17.0 + FY, `Expected lower stair height ~${15.5 + FY}m, got ${stairLower}`);

  const midLanding = walkableHeightAt(0, -109 + FZ);
  assert.ok(Math.abs(midLanding.height - (22.0 + FY)) < 0.05, `Expected intermediate landing at ${22.0 + FY}m, got ${midLanding.height}`);
  assert.equal(isChineseFortressWalkableZone(-10, -109 + FZ), true, 'Fenced intermediate landing should be walkable');

  // Expanded 104m x 98m Summit Courtyard is flat at summitHeight (42.0m)
  const summitPlazaA = groundHeightAt(CHINESE_FORTRESS_POS.x, -135 + FZ);
  const summitPlazaB = groundHeightAt(CHINESE_FORTRESS_POS.x + 38, -180 + FZ);
  assert.ok(Math.abs(summitPlazaA - CHINESE_FORTRESS_POS.summitHeight) < 0.05);
  assert.ok(Math.abs(summitPlazaA - summitPlazaB) < 0.05);

  // Side Pavilion 2nd Floor has a solid walkable Top-of-Stairs Landing at z = -169.5 + FZ (no cut-off hole!)
  const westPavTopLanding = walkableHeightAt(-36.9, -169.5 + FZ, CHINESE_FORTRESS_POS.pavilionFloor2Y);
  assert.ok(
    Math.abs(westPavTopLanding.height - CHINESE_FORTRESS_POS.pavilionFloor2Y) < 0.05,
    `Expected West Pavilion top-of-stairs landing at ${CHINESE_FORTRESS_POS.pavilionFloor2Y}m, got ${westPavTopLanding.height}`
  );

  // Thick Rampart Wall Staircase (x=-46.1, z=-142+FZ..-152+FZ) climbs from 42.0m to 47.2m,
  // and leads onto the Fenced Standing Platform (z=-152.0+FZ..-156.6+FZ) at 47.2m!
  const stairTopPlatform = walkableHeightAt(-46.1, -154.5 + FZ, 31.2 + FY);
  assert.ok(Math.abs(stairTopPlatform.height - (31.2 + FY)) < 0.05, `Expected fenced standing platform at ${31.2 + FY}m, got ${stairTopPlatform.height}`);

  // Gaze-only Door Detection: looking toward Main Hall door (yaw=0) detects it; looking away (yaw=PI) returns null!
  const lookAtMainDoor = findNearestFortressDoor(0, 26.35 + FY, -188.0 + FZ, 0, 0);
  assert.ok(lookAtMainDoor && lookAtMainDoor.id === 'main-hall-door', 'Expected to detect main-hall-door when looking toward it');
  const lookAwayFromMainDoor = findNearestFortressDoor(0, 26.35 + FY, -188.0 + FZ, Math.PI, 0);
  assert.equal(lookAwayFromMainDoor, null, 'Expected null when standing near door but looking in the opposite direction');

  const obstacles = generateWorldObstacles();
  // Running straight up the West Rampart Staircase onto the top standing platform is safely stopped by the North Fence at z = -156.6 + FZ
  const stairRunState = createInitialPlayerState();
  stairRunState.x = -46.1;
  stairRunState.z = -153.0 + FZ;
  stairRunState.y = 31.2 + FY;
  stairRunState.yaw = 0; // running North (-Z)
  for (let i = 0; i < 25; i++) {
    stepPlayerPhysics(
      stairRunState,
      {
        forward: 1,
        right: 0,
        sprint: true,
        relaxed: false,
        jumpPressed: false,
        jumpHeld: false,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      obstacles,
      0.05,
      new Set()
    );
  }
  assert.ok(stairRunState.z > -156.5 + FZ, `Expected top stair platform North fence to prevent falling off at z=-156.6+FZ, got z=${stairRunState.z}`);
  assert.ok(Math.abs(stairRunState.y - (31.2 + FY)) < 0.1, `Expected player to remain safely at ${31.2 + FY}m on the fenced platform, got y=${stairRunState.y}`);

  // Direct Open Passage from SW Watchtower Floor 2 (47.2m) onto the West Rampart Wall (x = -49.5, z = -134.0+FZ -> -137.0+FZ)
  const rampartPassState = createInitialPlayerState();
  rampartPassState.x = -49.5;
  rampartPassState.z = -132.0 + FZ;
  rampartPassState.y = 31.2 + FY;
  rampartPassState.yaw = 0; // walking North (-Z) from SW Watchtower Floor 2 directly onto West Rampart Wall
  for (let i = 0; i < 20; i++) {
    stepPlayerPhysics(
      rampartPassState,
      {
        forward: 1,
        right: 0,
        sprint: false,
        relaxed: false,
        jumpPressed: false,
        jumpHeld: false,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      obstacles,
      0.05,
      new Set()
    );
  }
  assert.ok(
    rampartPassState.z < -135.0 + FZ,
    `Expected open passage from Watchtower Floor 2 onto West Rampart Wall (z < ${-135.0 + FZ}), got z=${rampartPassState.z}`
  );

  // New Ladder Mechanics: Space (jumpPressed) mounts/dismounts the ladder; once mounted, W (forward > 0) climbs UP, S (forward < 0) climbs DOWN, and looking away + pressing W dismounts!
  const swTower = CORNER_WATCHTOWERS[0];
  const ladderState = createInitialPlayerState();
  ladderState.x = swTower.ladderX - 0.35;
  ladderState.z = swTower.ladderZ + 0.35;
  ladderState.y = CHINESE_FORTRESS_POS.watchtowerFloor1Y;
  ladderState.yaw = -Math.PI * 0.25; // facing the NE corner ladder

  // 1) Press Space once to mount the ladder
  stepPlayerPhysics(
    ladderState,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: true,
      jumpHeld: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    obstacles,
    0.05,
    new Set()
  );
  assert.equal(ladderState.climbingLadderId, swTower.id, 'Expected pressing Space near ladder to mount the ladder');

  // 2) Climb UP by holding W (forward = 1) WITHOUT holding Space
  for (let i = 0; i < 20; i++) {
    stepPlayerPhysics(
      ladderState,
      {
        forward: 1,
        right: 0,
        sprint: false,
        relaxed: false,
        jumpPressed: false,
        jumpHeld: false,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      obstacles,
      0.05,
      new Set()
    );
  }
  assert.ok(
    ladderState.y > CHINESE_FORTRESS_POS.watchtowerFloor1Y + 3.5,
    `Expected holding W (forward) while mounted on ladder to climb up (> ${CHINESE_FORTRESS_POS.watchtowerFloor1Y + 3.5}m), got y=${ladderState.y}`
  );

  // 3) Climb DOWN by holding S (forward = -1)
  const highY = ladderState.y;
  for (let i = 0; i < 12; i++) {
    stepPlayerPhysics(
      ladderState,
      {
        forward: -1,
        right: 0,
        sprint: false,
        relaxed: false,
        jumpPressed: false,
        jumpHeld: false,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      obstacles,
      0.05,
      new Set()
    );
  }
  assert.ok(
    ladderState.y < highY - 1.5,
    `Expected holding S (backward) on ladder to climb down (< ${highY - 1.5}m), got y=${ladderState.y}`
  );

  // 4) Looking away from the ladder and pressing W (forward = 1) automatically dismounts the ladder!
  ladderState.yaw = Math.PI * 0.75; // facing away from the ladder
  stepPlayerPhysics(
    ladderState,
    {
      forward: 1,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    obstacles,
    0.05,
    new Set()
  );
  assert.equal(
    ladderState.climbingLadderId,
    null,
    'Expected looking away from the ladder and pressing W to dismount the ladder'
  );
});

test('regionalForestBiomes_WhenSamplingTerrainPositions_ShouldTransitionFromWoodlandToOrangeBirchGrove', () => {
  // Arrange
  // Act
  const denseWest = regionalForestDensityAt(-65, -15);
  const openSouthValley = regionalForestDensityAt(20, 85);
  // Assert
  assert.ok(denseWest > 0.8, `Expected dense west forest > 0.8, got ${denseWest}`);
  assert.ok(openSouthValley < 0.08, `Expected open treeless valley < 0.08, got ${openSouthValley}`);

  // Orange Birch Grove is large (radius >= 100m) and far from spawn (> 170m)
  const distFromSpawn = Math.hypot(
    BIRCH_GROVE_CENTER.x - WORLD_SPAWN.x,
    BIRCH_GROVE_CENTER.z - WORLD_SPAWN.z
  );
  assert.ok(distFromSpawn > 170, `Expected Orange Forest to be > 170m from spawn, got ${distFromSpawn}`);
  assert.ok(BIRCH_GROVE_CENTER.radius >= 100, `Expected Orange Forest radius >= 100m, got ${BIRCH_GROVE_CENTER.radius}`);

  const birchCenter = birchGroveFactorAt(BIRCH_GROVE_CENTER.x, BIRCH_GROVE_CENTER.z);
  assert.ok(birchCenter > 0.95, `Expected birch grove factor > 0.95 at center, got ${birchCenter}`);

  const obstacles = generateWorldObstacles();
  const birches = obstacles.filter((o) => o.kind === 'birch');
  assert.ok(birches.length >= 80, `Expected >= 80 birch trees in expanded Orange Forest, got ${birches.length}`);
});

test('playerLocomotion_WhenFlightAndModifiersEngaged_ShouldScaleMovementSpeedsAccurately', () => {
  // Arrange
  const obstacles = generateWorldObstacles();
  const flyState = createInitialPlayerState();
  const startY = flyState.y;

  stepPlayerPhysics(
    flyState,
    {
      forward: 1,
      right: 0,
      sprint: true,
      relaxed: false,
      jumpPressed: true,
      jumpHeld: true,
      toggleFlyRequested: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    obstacles,
  // Act
    0.05
  );
  // Assert
  assert.equal(flyState.isFlying, true, 'Expected isFlying to be true after toggleFlyRequested');

  for (let i = 0; i < 30; i++) {
    stepPlayerPhysics(
      flyState,
      {
        forward: 1,
        right: 0,
        sprint: true,
        relaxed: false,
        jumpPressed: false,
        jumpHeld: true,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      obstacles,
      0.05
    );
  }
  assert.ok(flyState.y > startY + 8.0, `Expected flying player to ascend >8m above startY, got ${flyState.y}`);
});

test('seasonalWeatherCycle_WhenDefaultModeActive_ShouldEnforceSeasonalSkyWindAndPrecipitationRules', () => {
  // Arrange
  // Act
  // Assert
  assert.equal(DEFAULT_WEATHER_CYCLE_MODE, 'seasonal', 'Default weather cycle mode must be seasonal');

  // Summer (180s..360s): pure sunshine, zero rain/snow
  const summerState = runSeasonalWeatherCycle(250, 0, 32);
  assert.equal(summerState.season, 'summer');
  assert.equal(summerState.rainIntensity, 0);
  assert.equal(summerState.snowIntensity, 0);

  // Autumn (360s..540s): primarily strong wind, with occasional rain
  const autumnWind = runSeasonalWeatherCycle(420, 0, 32);
  assert.equal(autumnWind.season, 'autumn');
  assert.ok(autumnWind.windStrength >= 0.65, `Expected strong autumn wind >= 0.65, got ${autumnWind.windStrength}`);

  // Winter (540s..720s): snow ONLY above SNOW_LINE_ALTITUDE; purely rain at low altitudes!
  const winterHighMountain = runSeasonalWeatherCycle(600, -65, -172);
  assert.equal(winterHighMountain.season, 'winter');
  assert.equal(winterHighMountain.weatherKind, 'mountain_snow');
  assert.ok(winterHighMountain.snowIntensity > 0.7);
  assert.equal(winterHighMountain.rainIntensity, 0);

  const winterLowValley = runSeasonalWeatherCycle(600, 0, 32);
  assert.equal(winterLowValley.season, 'winter');
  assert.equal(winterLowValley.snowIntensity, 0, 'Winter in low valley must not snow');
  assert.ok(winterLowValley.rainIntensity > 0.45, 'Winter in low valley must fall purely as rain');

  // Turbo test function remains preserved for instant testing when needed
  const turboRain = runTurboWeatherTestCycle(3.5, 0, 32);
  assert.equal(turboRain.weatherKind, 'regional_rain');

  // Unified entry point defaults to seasonal mode
  const unifiedDefault = computeWeatherState(250, 0, 32);
  assert.equal(unifiedDefault.mode, 'seasonal');
  assert.equal(unifiedDefault.season, 'summer');
});

test('worldDayNightCycle_WhenSimulatingTwentyFourHours_ShouldProduceAtmosphericKeyframesAccurately', () => {
  // Arrange
  const morning = computeDynamicSolarCycle(6.75);
  const midday = computeDynamicSolarCycle(12.5);
  // Act
  const night = computeDynamicSolarCycle(23.5);

  // Assert
  assert.ok(morning.morningMistOpacity > 0.85);
  assert.equal(morning.isNight, false);

  assert.equal(midday.morningMistOpacity, 0);
  assert.ok(midday.sunElevationDeg > 55);
  assert.equal(midday.isNight, false);

  assert.equal(night.isNight, true);
  assert.equal(night.nightFactor, 1.0);
  assert.ok(night.sunIntensity < 1.0, 'Expected soft moonlight intensity at night');
});

test('valleyFarmhouses_WhenPlacedInWorld_ShouldMaintainSpacedLayoutFencedBoundariesAndEnterableDoors', () => {
  // Arrange
  // Act
  const obstacles = generateWorldObstacles();
  // Assert
  assert.equal(VALLEY_FARMS.length, 3);

  // Verify farms are far from each other (> 140m) and far from spawn (> 110m)
  for (let i = 0; i < VALLEY_FARMS.length; i++) {
    const fA = VALLEY_FARMS[i];
    const distSpawn = Math.hypot(fA.x - WORLD_SPAWN.x, fA.z - WORLD_SPAWN.z);
    assert.ok(distSpawn > 110, `Expected ${fA.id} to be > 110m from spawn, got ${distSpawn}`);
    for (let j = i + 1; j < VALLEY_FARMS.length; j++) {
      const fB = VALLEY_FARMS[j];
      const distFarms = Math.hypot(fA.x - fB.x, fA.z - fB.z);
      assert.ok(distFarms > 140, `Expected ${fA.id} and ${fB.id} to be > 140m apart, got ${distFarms}`);
    }
  }

  for (const farm of VALLEY_FARMS) {
    // 1. Leveled flat terrace across the entire 44m x 23m fenced farm compound
    const centerGround = groundHeightAt(farm.x, farm.z);
    const fenceCornerGround = groundHeightAt(farm.x + 20, farm.z + 10);
    assert.ok(Math.abs(centerGround - farm.height) < 0.05, `Expected flat terrace at ${farm.id}`);
    assert.ok(Math.abs(centerGround - fenceCornerGround) < 0.05, `Expected flat terrace across fenced compound of ${farm.id}`);

    // 2. Zero trees inside the farm's cleared area
    const treesInFarm = obstacles.filter(
      (o) =>
        (o.kind === 'pine' || o.kind === 'oak' || o.kind === 'birch') &&
        Math.hypot(o.x - farm.x, o.z - farm.z) < farm.clearRadius - 1.0
    );
    assert.equal(treesInFarm.length, 0, `Expected 0 trees inside ${farm.id} clearRadius`);

    // 3. Roof blocks rain inside farmhouse but not outside in the wheat fields
    assert.ok(getRoofHeightAt(farm.x, farm.z) !== null);
    assert.equal(isPositionUnderRoof(farm.x, farm.height + 0.18, farm.z), true);
    assert.equal(isPositionUnderRoof(farm.x + 12, farm.height, farm.z), false);

    // 4. Perimeter Fence blocks walking through the side wing, while the central 6.4m Front Gateway (at z = farm.z + farm.dirZ * 11.5) is wide open!
    const frontGateZ = farm.z + farm.dirZ * 11.5;
    const backFenceZ = farm.z - farm.dirZ * 11.5;
    assert.ok(
      trailFactorAt(farm.x, frontGateZ) > 0.65,
      `Expected walking trail to arrive directly at the front gate of ${farm.id}`
    );
    assert.equal(
      trailFactorAt(farm.x, backFenceZ - farm.dirZ * 1.5),
      0,
      `Expected zero trail cutting through the back of ${farm.id}`
    );
    assert.equal(
      trailFactorAt(farm.x + 12.0, farm.z),
      0,
      `Expected zero trail cutting through the wheat fields inside ${farm.id}`
    );

    const gateWalkState = createInitialPlayerState();
    gateWalkState.x = farm.x;
    gateWalkState.z = farm.z + farm.dirZ * 13.5;
    gateWalkState.y = farm.height;
    gateWalkState.yaw = farm.dirZ === 1 ? 0 : Math.PI;
    for (let i = 0; i < 15; i++) {
      stepPlayerPhysics(
        gateWalkState,
        { forward: 1, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
        [],
        0.05,
        new Set()
      );
    }
    const distIntoFarm = (farm.z + farm.dirZ * 11.5 - gateWalkState.z) * farm.dirZ;
    assert.ok(distIntoFarm > 1.2, `Expected front perimeter gate of ${farm.id} to be open for walking through`);

    // 5. Door blocks entry when closed, allows entry when opened with [E]
    const state = createInitialPlayerState();
    state.x = farm.x;
    state.z = farm.z + farm.dirZ * 3.2;
    state.y = walkableHeightAt(state.x, state.z).height;
    state.yaw = farm.dirZ === 1 ? 0 : Math.PI;

    const lookedDoor = findNearestFortressDoor(state.x, state.y, state.z, state.yaw, 0);
    assert.equal(lookedDoor?.id, farm.doorId);

    for (let i = 0; i < 20; i++) {
      stepPlayerPhysics(
        state,
        { forward: 1, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
        [],
        0.05,
        new Set()
      );
    }
    assert.ok(
      (state.z - farm.z) * farm.dirZ >= 2.4,
      `Closed door should block entry into ${farm.id}`
    );

    const openSet = new Set([farm.doorId]);
    for (let i = 0; i < 25; i++) {
      stepPlayerPhysics(
        state,
        { forward: 1, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
        [],
        0.05,
        openSet
      );
    }
    assert.ok(
      (state.z - farm.z) * farm.dirZ < 1.0,
      `Open door should allow walking inside ${farm.id}`
    );
  }
});

test('worldLandmarks_WhenEvaluatingOutpostsAndSuspensionBridge_ShouldVerifyHeightsPassagesAndOrientations', () => {
  // Arrange
  const obstacles = generateWorldObstacles();
  // Act

  // 1) Hunter's Lodge is moved off the trail crossroads to (-92, 72) and rotated so its entrance faces North toward the trail!
  // Assert
  assert.equal(HUNTER_LODGE_POS.z, 72.0);
  assert.equal(HUNTER_LODGE_POS.dirZ, -1);
  const lodgeDoorCheck = findNearestFortressDoor(
    HUNTER_LODGE_POS.x,
    HUNTER_LODGE_POS.height,
    HUNTER_LODGE_POS.z - 3.2,
    Math.PI, // looking South (+Z) from the trail toward the North-facing lodge door
    0
  );
  assert.equal(lodgeDoorCheck?.id, 'hunter-lodge-door');

  // 2) 3 Hill Watchtowers: taller (9.0m deckH), enclosed 1st floor with interactive doors, sitting on true hill summit (no crater!), and lag-free high-altitude ladder climbing!
  assert.equal(HILL_WATCHTOWERS.length, 3);
  for (const hw of HILL_WATCHTOWERS) {
    assert.equal(hw.deckY - hw.baseY, 9.0, `Expected ${hw.id} to have a tall 9.0m upper deck`);
    assert.ok(Math.abs(groundHeightAt(hw.x, hw.z) - hw.baseY) < 0.08, `Expected flat summit base at ${hw.id}`);
    // Verify zero crater: surrounding terrain 12m out should be LOWER than or equal to hw.baseY, never towering above it!
    for (const [ox, oz] of [[12, 0], [-12, 0], [0, 12], [0, -12]]) {
      const neighborH = groundHeightAt(hw.x + ox, hw.z + oz);
      assert.ok(
        neighborH <= hw.baseY + 0.05,
        `Expected ${hw.id} to sit on the true hill summit without a crater, but neighbor (${ox},${oz}) has height ${neighborH} > baseY ${hw.baseY}`
      );
    }
    assert.ok(getRoofHeightAt(hw.x, hw.z) !== null, `Expected roof protection at ${hw.id}`);
    assert.equal(isOnWatchtowerLadder(hw.ladderX, hw.ladderZ), true, `Expected climbable ladder at ${hw.id}`);
    const upperWalk = walkableHeightAt(hw.x, hw.z, hw.deckY);
    assert.equal(upperWalk.surface, 'tower');
    assert.ok(Math.abs(upperWalk.height - hw.deckY) < 0.05);

    // Verify climbing a high-altitude Hill Watchtower ladder (baseY = 53.5..66.5m) climbs smoothly all the way to deckY!
    const hwLadderState = createInitialPlayerState();
    hwLadderState.x = hw.ladderX;
    hwLadderState.z = hw.ladderZ;
    hwLadderState.y = hw.baseY;
    hwLadderState.yaw = Math.atan2(-(hw.ladderX - hw.x), -(hw.ladderZ - hw.z));
    stepPlayerPhysics(
      hwLadderState,
      { forward: 0, right: 0, sprint: false, relaxed: false, jumpPressed: true, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      obstacles,
      0.05,
      new Set([hw.doorId])
    );
    assert.equal(hwLadderState.climbingLadderId, hw.id, `Expected Space to mount ladder on ${hw.id}`);
    for (let s = 0; s < 35; s++) {
      stepPlayerPhysics(
        hwLadderState,
        { forward: 1, right: 0, sprint: true, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
        obstacles,
        0.05,
        new Set([hw.doorId])
      );
    }
    assert.ok(
      Math.abs(hwLadderState.y - hw.deckY) < 0.15,
      `Expected climbing ${hw.id} ladder to reach deckY=${hw.deckY}, got y=${hwLadderState.y}`
    );

    // Verify Hill Watchtower door is on the inner/Fortress-facing side, detected by findNearestFortressDoor, and opens with [E]!
    const outDx = hw.doorX - hw.x;
    const outDz = hw.doorZ - hw.z;
    const outLen = Math.hypot(outDx, outDz);
    // Vector from watchtower to Fortress (0, -335)
    const toFortX = 0 - hw.x;
    const toFortZ = -335 - hw.z;
    const dotTowardInner = outDx * toFortX + outDz * toFortZ;
    assert.ok(
      dotTowardInner > 0,
      `Expected ${hw.id} door to face the inner/Fortress side, got dot=${dotTowardInner}`
    );

    const doorTestState = createInitialPlayerState();
    doorTestState.x = hw.doorX + (outDx / outLen) * 1.4;
    doorTestState.z = hw.doorZ + (outDz / outLen) * 1.4;
    doorTestState.y = hw.baseY;
    doorTestState.yaw = Math.atan2(outDx, outDz); // looking inward from outside door toward watchtower center
    const detectedHwDoor = findNearestFortressDoor(
      doorTestState.x,
      doorTestState.y,
      doorTestState.z,
      doorTestState.yaw,
      0
    );
    assert.equal(detectedHwDoor?.id, hw.doorId, `Expected findNearestFortressDoor to detect ${hw.doorId}`);

    // Walk inside when door is opened
    for (let s = 0; s < 20; s++) {
      stepPlayerPhysics(
        doorTestState,
        { forward: 1, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
        obstacles,
        0.05,
        new Set([hw.doorId])
      );
    }
    const distInsideTower = Math.hypot(doorTestState.x - hw.x, doorTestState.z - hw.z);
    assert.ok(
      distInsideTower < 2.2,
      `Expected player to walk inside ${hw.id} when ${hw.doorId} is open, got dist=${distInsideTower.toFixed(2)}`
    );
  }

  // 3) Ascending Rope Suspension Bridge (62.5m -> 69.5m -> 75.5m) & Unobstructed Walkthrough across Watchtower Gateway and Middle Support Tower!
  assert.ok(
    ROPE_BRIDGE_DEF.ay < ROPE_BRIDGE_DEF.my && ROPE_BRIDGE_DEF.my < ROPE_BRIDGE_DEF.by,
    'Expected Rope Suspension Bridge to ascend smoothly from SW Watchtower -> Middle Support -> West Watchtower'
  );
  const midBridge = ropeBridgePointInfoAt(ROPE_BRIDGE_DEF.mx, ROPE_BRIDGE_DEF.mz);
  assert.ok(midBridge !== null, 'Expected rope bridge to pass through central support pillar');
  assert.ok(Math.abs(midBridge.height - ROPE_BRIDGE_DEF.my) < 0.05);
  // Ensure bridge stays high above ground terrain along its entire span (never cutting through the mountain!)
  for (let s = 1; s < 20; s++) {
    const t = s / 20;
    const bx = ROPE_BRIDGE_DEF.ax + t * (ROPE_BRIDGE_DEF.bx - ROPE_BRIDGE_DEF.ax);
    const bz = ROPE_BRIDGE_DEF.az + t * (ROPE_BRIDGE_DEF.bz - ROPE_BRIDGE_DEF.az);
    const bInfo = ropeBridgePointInfoAt(bx, bz);
    const gH = groundHeightAt(bx, bz);
    assert.ok(
      bInfo && bInfo.height > gH + 4.5,
      `Expected rope bridge at t=${t.toFixed(2)} (y=${bInfo?.height.toFixed(2)}) to stay >4.5m above mountain ground (${gH.toFixed(2)})`
    );
  }

  // Walk straight from SW Watchtower deck onto the Rope Bridge and across the Middle Support Tower: zero blocking pieces!
  const bridgeWalkState = createInitialPlayerState();
  bridgeWalkState.x = HILL_WATCHTOWERS[0].x;
  bridgeWalkState.z = HILL_WATCHTOWERS[0].z;
  bridgeWalkState.y = HILL_WATCHTOWERS[0].deckY;
  const bridgeYaw = Math.atan2(
     -(ROPE_BRIDGE_DEF.bx - ROPE_BRIDGE_DEF.ax),
     -(ROPE_BRIDGE_DEF.bz - ROPE_BRIDGE_DEF.az)
  );
  bridgeWalkState.yaw = bridgeYaw;
  for (let step = 0; step < 30; step++) {
    stepPlayerPhysics(
      bridgeWalkState,
      { forward: 1, right: 0, sprint: true, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      obstacles,
      0.05,
      new Set()
    );
  }
  const distWalkedOntoBridge = Math.hypot(
    bridgeWalkState.x - HILL_WATCHTOWERS[0].x,
    bridgeWalkState.z - HILL_WATCHTOWERS[0].z
  );
  assert.ok(
    distWalkedOntoBridge > 6.5,
    `Expected unobstructed transition from SW Watchtower deck onto Rope Bridge (>6.5m), got ${distWalkedOntoBridge.toFixed(2)}m`
  );

  // 4) Upgraded Far-South Dwarven Mountain Mine: steep mountain above, sloping shaft descending 12m underground, and Colossal Subterranean Crystal Cavern at y = -9.35m!
  const mountainPeakAboveMine = groundHeightAt(SOUTHERN_MINE_POS.x, SOUTHERN_MINE_POS.entranceZ + 36.0);
  assert.ok(
    mountainPeakAboveMine > 31.0,
    `Expected a real tall mountain (>31m) above the Southern Mine, got ${mountainPeakAboveMine.toFixed(2)}m`
  );
  const shaftMidWalk = walkableHeightAt(SOUTHERN_MINE_POS.x, SOUTHERN_MINE_POS.entranceZ + 18.75, -3.0);
  assert.equal(shaftMidWalk.surface, 'bridge');
  assert.ok(
    shaftMidWalk.height < 0 && shaftMidWalk.height > SOUTHERN_MINE_POS.cavernFloorY,
    `Expected sloping underground mine shaft at z=${SOUTHERN_MINE_POS.entranceZ + 18.75} to be below ground (y=${shaftMidWalk.height.toFixed(2)})`
  );
  const cavernWalk = walkableHeightAt(SOUTHERN_MINE_POS.x - 10.0, SOUTHERN_MINE_POS.entranceZ + 50.0, SOUTHERN_MINE_POS.cavernFloorY);
  assert.equal(cavernWalk.surface, 'bridge');
  assert.ok(
    Math.abs(cavernWalk.height - SOUTHERN_MINE_POS.cavernFloorY) < 0.05,
    `Expected deep subterranean cavern floor at y=${SOUTHERN_MINE_POS.cavernFloorY}, got ${cavernWalk.height}`
  );
  assert.equal(
    isPositionUnderRoof(SOUTHERN_MINE_POS.x, SOUTHERN_MINE_POS.cavernFloorY + 1.0, SOUTHERN_MINE_POS.entranceZ + 50.0),
    true
  );

  // 5) Wooded Hill Stone Circle
  assert.ok(Math.abs(groundHeightAt(MAGIC_STONE_CIRCLE_POS.x, MAGIC_STONE_CIRCLE_POS.z) - MAGIC_STONE_CIRCLE_POS.height) < 0.08);
  const pathMidX = (MAGIC_STONE_CIRCLE_POS.entryStartX + MAGIC_STONE_CIRCLE_POS.x) * 0.5;
  const pathMidZ = (MAGIC_STONE_CIRCLE_POS.entryStartZ + MAGIC_STONE_CIRCLE_POS.z) * 0.5;
  assert.ok(trailFactorAt(pathMidX, pathMidZ) > 0.7, 'Expected single ordered path ascending the Stone Circle hill');
  const hillSlopeTrees = obstacles.filter(
    (o) =>
      (o.kind === 'pine' || o.kind === 'oak') &&
      Math.hypot(o.x - MAGIC_STONE_CIRCLE_POS.x, o.z - MAGIC_STONE_CIRCLE_POS.z) >= 12.0 &&
      Math.hypot(o.x - MAGIC_STONE_CIRCLE_POS.x, o.z - MAGIC_STONE_CIRCLE_POS.z) <= 34.0
  );
  assert.ok(hillSlopeTrees.length >= 40, `Expected dense trees surrounding Stone Circle hill, got ${hillSlopeTrees.length}`);
});

test('coastalHarborAndOcean_WhenEvaluatingNavalAssetsAndLighthouse_ShouldEnforceDimensionsAndSeaLevelFoundations', () => {
  // Arrange
  const obstacles = generateWorldObstacles();
  const hx = SOUTHEAST_HARBOR_POS.x;
  const hz = SOUTHEAST_HARBOR_POS.z;
  // Act

  // 1) Harbor Quay is leveled at plazaY (3.2m) while the Vast Open Eastern Sea is carved deep below WATER_LEVEL all the way out to the horizon!
  // Assert
  assert.ok(
    Math.abs(groundHeightAt(hx, hz) - SOUTHEAST_HARBOR_POS.plazaY) < 0.08,
    `Expected flat Harbor Quay at (${hx}, ${hz})`
  );
  for (const seaX of [265.0, 340.0, 480.0]) {
    const seaGround = groundHeightAt(seaX, hz + 30.0);
    assert.ok(
      seaGround < WATER_LEVEL - 4.0,
      `Expected Vast Open Eastern Sea at (${seaX}, ${hz + 30}) to be deep below WATER_LEVEL, got ${seaGround.toFixed(2)}`
    );
  }

  // 2) Mariner's Tavern & Imperial Cargo Warehouse Doors open with [E] and roofs protect against rain
  const tavernDoor = findNearestFortressDoor(
    SOUTHEAST_HARBOR_POS.tavernX,
    SOUTHEAST_HARBOR_POS.plazaY,
    SOUTHEAST_HARBOR_POS.tavernZ + 5.2 + 1.5,
    0, // Looking North (-Z) into the South-facing Tavern door
    0
  );
  assert.equal(tavernDoor?.id, 'harbor-tavern-door');
  assert.equal(
    isPositionUnderRoof(SOUTHEAST_HARBOR_POS.tavernX, SOUTHEAST_HARBOR_POS.plazaY + 0.5, SOUTHEAST_HARBOR_POS.tavernZ),
    true
  );

  const warehouseDoor = findNearestFortressDoor(
    SOUTHEAST_HARBOR_POS.warehouseX,
    SOUTHEAST_HARBOR_POS.plazaY,
    SOUTHEAST_HARBOR_POS.warehouseDoorZ - 1.5,
    Math.PI, // Looking South (+Z) into the North-facing Warehouse door
    0
  );
  assert.equal(warehouseDoor?.id, 'harbor-warehouse-door');
  assert.equal(
    isPositionUnderRoof(SOUTHEAST_HARBOR_POS.warehouseX, SOUTHEAST_HARBOR_POS.warehouseFloorY + 0.5, SOUTHEAST_HARBOR_POS.warehouseZ),
    true
  );

  // 3) Enlarged 42m 3-Masted Treasure Galleon Ship has Main Deck (3.65m), Enterable Captain's Cabin Below (3.65m), and Raised Helm Quarterdeck Above (6.65m)
  const mainDeckWalk = walkableHeightAt(SOUTHEAST_HARBOR_POS.shipX, SOUTHEAST_HARBOR_POS.shipZ, 4.0);
  assert.equal(mainDeckWalk.surface, 'pier');
  assert.ok(Math.abs(mainDeckWalk.height - SOUTHEAST_HARBOR_POS.shipDeckY) < 0.05);

  const captainDoor = findNearestFortressDoor(
    SOUTHEAST_HARBOR_POS.shipX,
    SOUTHEAST_HARBOR_POS.shipDeckY,
    SOUTHEAST_HARBOR_POS.shipQuarterdeckStartZ - 1.4,
    Math.PI, // Looking South (+Z) into the Captain's Cabin door under the Quarterdeck
    0
  );
  assert.equal(captainDoor?.id, 'galleon-captain-door');

  // Walking at lower elevation (currentY = 3.65m) inside z = 264 walks inside the Captain's Sleeping Cabin (y = 3.65m)
  const captainCabinWalk = walkableHeightAt(SOUTHEAST_HARBOR_POS.shipX, SOUTHEAST_HARBOR_POS.shipZ + 12.0, 3.65);
  assert.equal(captainCabinWalk.surface, 'cabin');
  assert.ok(Math.abs(captainCabinWalk.height - SOUTHEAST_HARBOR_POS.shipDeckY) < 0.05);
  assert.equal(
    isPositionUnderRoof(SOUTHEAST_HARBOR_POS.shipX, SOUTHEAST_HARBOR_POS.shipDeckY + 0.5, SOUTHEAST_HARBOR_POS.shipZ + 12.0),
    true
  );

  // Walking at upper elevation (currentY = 6.65m) at z = 264 walks on the Raised Stern Helm Quarterdeck (y = 6.65m)
  const quarterDeckWalk = walkableHeightAt(SOUTHEAST_HARBOR_POS.shipX, SOUTHEAST_HARBOR_POS.shipZ + 12.0, 6.65);
  assert.equal(quarterDeckWalk.surface, 'pier');
  assert.ok(Math.abs(quarterDeckWalk.height - SOUTHEAST_HARBOR_POS.shipQuarterdeckY) < 0.05);

  // 4) Climbable 26m Imperial Lighthouse door opens and internal ladder climbs to the 25.5m observation gallery!
  const lhDoor = findNearestFortressDoor(
    SOUTHEAST_HARBOR_POS.lighthouseX,
    SOUTHEAST_HARBOR_POS.lighthouseBaseY,
    SOUTHEAST_HARBOR_POS.lighthouseZ + 3.8 + 1.4,
    0, // Looking North (-Z) into the South-facing Lighthouse door
    0
  );
  assert.equal(lhDoor?.id, 'harbor-lighthouse-door');

  const lhClimbState = createInitialPlayerState();
  lhClimbState.x = SOUTHEAST_HARBOR_POS.lighthouseLadderX;
  lhClimbState.z = SOUTHEAST_HARBOR_POS.lighthouseLadderZ;
  lhClimbState.y = SOUTHEAST_HARBOR_POS.lighthouseBaseY + 0.15;
  lhClimbState.yaw = 0; // Looking North (-Z) toward the North-wall ladder
  stepPlayerPhysics(
    lhClimbState,
    { forward: 0, right: 0, sprint: false, relaxed: false, jumpPressed: true, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
    obstacles,
    0.05,
    new Set(['harbor-lighthouse-door'])
  );
  assert.equal(lhClimbState.climbingLadderId, 'harbor-lighthouse-ladder');
  for (let s = 0; s < 75; s++) {
    stepPlayerPhysics(
      lhClimbState,
      { forward: 1, right: 0, sprint: true, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      obstacles,
      0.05,
      new Set(['harbor-lighthouse-door'])
    );
  }
  assert.ok(
    Math.abs(lhClimbState.y - SOUTHEAST_HARBOR_POS.lighthouseTopDeckY) < 0.15,
    `Expected climbing Lighthouse ladder to reach gallery at y=${SOUTHEAST_HARBOR_POS.lighthouseTopDeckY}, got ${lhClimbState.y}`
  );
});

test('dynamicWeatherToggle_WhenWeatherConditionsChange_ShouldUpdateShaderUniformsAndRainEffects', () => {
  // Arrange
  // Act
  const rainState = computeWeatherState(10.0, 0, 32, 'seasonal', 'regional_rain');
  // Assert
  assert.equal(rainState.weatherKind, 'regional_rain');
  assert.ok(rainState.rainIntensity >= 0.85, 'Expected high rain intensity when regional_rain is forced');
  assert.ok(rainState.wetness >= 0.9, 'Expected wet terrain & puddles (wetness >= 0.9) during regional_rain');

  const fogState = computeWeatherState(10.0, 0, 32, 'seasonal', 'dense_fog');
  assert.equal(fogState.weatherKind, 'dense_fog');
  assert.ok(fogState.fogIntensity >= 0.85, 'Expected high fogIntensity during dense_fog');
  assert.equal(fogState.rainIntensity, 0, 'Expected zero rain drops during dense_fog');

  const stormState = computeWeatherState(2.66, 0, 32, 'seasonal', 'lightning_storm');
  assert.equal(stormState.weatherKind, 'lightning_storm');
  assert.ok(stormState.rainIntensity >= 0.95);
  assert.equal(stormState.wetness, 1.0, 'Expected maximum terrain wetness (1.0) during lightning_storm');
  assert.ok(stormState.lightningFlash > 0.5, 'Expected periodic lightning flashes during forced lightning_storm');

  const clearState = computeWeatherState(10.0, 0, 32, 'seasonal', 'clear_clouds');
  assert.equal(clearState.weatherKind, 'clear_clouds');
  assert.equal(clearState.rainIntensity, 0);
  assert.equal(clearState.wetness, 0);
});

test('horseMounting_WhenInteractingWithMountableHorse_ShouldAllowMountingGallopingAndDismounting', async () => {
  // Arrange
  // Act
  const { RIDEABLE_HORSES, createInitialRideableHorses, findNearestRideableHorse } = await import('./terrainMath');
  // Assert
  assert.equal(RIDEABLE_HORSES.length, 5);
  const horses = createInitialRideableHorses();
  const spawnHorse = horses[0];

  const player = createInitialPlayerState();
  player.x = spawnHorse.x - 1.2;
  player.z = spawnHorse.z;
  player.y = walkableHeightAt(player.x, player.z).height;

  const detected = findNearestRideableHorse(player.x, player.y, player.z, horses);
  assert.equal(detected?.id, spawnHorse.id, 'Expected to detect nearby saddled horse');

  // Press [F] (toggleMountHorseRequested) to mount the horse
  stepPlayerPhysics(
    player,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      toggleMountHorseRequested: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.05,
    new Set(),
    horses
  );
  assert.equal(player.mountedHorseId, spawnHorse.id, 'Expected player to mount the horse');

  // Gallop North (sprint = true) for 1 second (20 steps of 0.05s) and verify fast horseback speed (> 11m covered)
  const startZ = player.z;
  player.yaw = 0;
  for (let i = 0; i < 20; i++) {
    stepPlayerPhysics(
      player,
      {
        forward: 1,
        right: 0,
        sprint: true,
        relaxed: false,
        jumpPressed: false,
        jumpHeld: false,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      [],
      0.05,
      new Set(),
      horses
    );
  }
  const distGalloped = startZ - player.z;
  assert.ok(distGalloped > 10.5, `Expected galloping horse to cover > 10.5m in 1s, got ${distGalloped.toFixed(2)}m`);
  assert.equal(spawnHorse.x, player.x, 'Expected mounted horse position to stay synced with rider');
  assert.equal(spawnHorse.z, player.z, 'Expected mounted horse position to stay synced with rider');

  // Press [F] again to dismount
  stepPlayerPhysics(
    player,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      toggleMountHorseRequested: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.05,
    new Set(),
    horses
  );
  assert.equal(player.mountedHorseId, null, 'Expected pressing [F] again to dismount the horse');
});

test('undergroundMineAndOasis_WhenSamplingLocations_ShouldVerifyMineChambersAndDesertBiomeLayout', async () => {
  // Arrange
  const {
    SOUTHWEST_OASIS_POS,
    southwestOasisBiomeFactorAt,
  } = await import('./terrainMath');
  const obstacles = generateWorldObstacles();
  // Act

  // 1) Multi-Room & 5-Corridor Underground Southern Mine relocated far South (entranceZ = 420.0, cavernHalfW = 52.0, cavernEndZ = 530.0)
  // Assert
  assert.equal(SOUTHERN_MINE_POS.entranceZ, 420.0);
  assert.equal(SOUTHERN_MINE_POS.cavernHalfW, 52.0);
  assert.equal(SOUTHERN_MINE_POS.cavernEndZ, 530.0);

  // Room 1 (Central Junction: -58, 468), Corridor 1 (-78, 469), Room 2 East bank (-86, 483),
  // Corridor 2 (-38, 469), Room 3 East Smelting Foundry (-20, 483), Corridor 3 (-58, 491), and Room 4 Deep South Vault (-58, 518) are all walkable!
  for (const [mx, mz] of [
    [-58.0, 468.0], // Room 1: Central Junction Hall (lz = 48)
    [-78.0, 469.0], // Corridor 1: West Shored Tunnel (lz = 49)
    [-86.0, 483.0], // Room 2: West Crystal Lake Chamber (East dry bank, lz = 63)
    [-38.0, 469.0], // Corridor 2: East Masonry Tunnel (lz = 49)
    [-20.0, 483.0], // Room 3: East Smelting Foundry Hall (lz = 63)
    [-58.0, 491.0], // Corridor 3: South Pillared Corridor (lz = 71)
    [-58.0, 518.0], // Room 4: Deep South Treasure Vault (lz = 98)
    [-79.0, 509.0], // Corridor 4: SW Loop Passage (lz = 89)
    [-37.0, 509.0], // Corridor 5: SE Loop Passage (lz = 89)
  ]) {
    const walk = walkableHeightAt(mx, mz, SOUTHERN_MINE_POS.cavernFloorY);
    assert.equal(walk.surface, 'bridge', `Expected underground mine floor at (${mx}, ${mz})`);
    assert.ok(
      Math.abs(walk.height - SOUTHERN_MINE_POS.cavernFloorY) < 0.05,
      `Expected cavernFloorY (${SOUTHERN_MINE_POS.cavernFloorY}) at (${mx}, ${mz}), got ${walk.height}`
    );
  }

  // Verify solid rock partition wall between Room 1 and Room 2 blocks walking through at lz = 40 (z = 272),
  // whereas walking West through Corridor 1 at lz = 49 (z = 281) passes freely from Room 1 into Room 2!
  const blockedWallState = createInitialPlayerState();
  blockedWallState.x = SOUTHERN_MINE_POS.x - 13.0; // lx = -13 (inside Room 1 near West wall)
  blockedWallState.z = SOUTHERN_MINE_POS.entranceZ + 40.0; // lz = 40 (solid rock partition wall!)
  blockedWallState.y = SOUTHERN_MINE_POS.cavernFloorY;
  blockedWallState.yaw = Math.PI / 2; // Facing West (-X)
  for (let s = 0; s < 20; s++) {
    stepPlayerPhysics(
      blockedWallState,
      { forward: 1, right: 0, sprint: true, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.05,
      new Set()
    );
  }
  assert.ok(
    blockedWallState.x > SOUTHERN_MINE_POS.x - 14.5,
    `Expected solid rock partition wall between Room 1 and Room 2 at lz=40 to block player, got x=${blockedWallState.x}`
  );

  const corridorPassState = createInitialPlayerState();
  corridorPassState.x = SOUTHERN_MINE_POS.x - 12.0; // lx = -12 (inside Room 1 aligned with Corridor 1)
  corridorPassState.z = SOUTHERN_MINE_POS.entranceZ + 49.0; // lz = 49 (center of Corridor 1)
  corridorPassState.y = SOUTHERN_MINE_POS.cavernFloorY;
  corridorPassState.yaw = Math.PI / 2; // Facing West (-X) through Corridor 1 into Room 2
  for (let s = 0; s < 35; s++) {
    stepPlayerPhysics(
      corridorPassState,
      { forward: 1, right: 0, sprint: true, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.05,
      new Set()
    );
  }
  assert.ok(
    corridorPassState.x < SOUTHERN_MINE_POS.x - 26.5,
    `Expected player to walk freely through Corridor 1 from Room 1 into Room 2 (< ${SOUTHERN_MINE_POS.x - 26.5}), got x=${corridorPassState.x}`
  );

  // 2) Relocated Far South-West Terraced Oasis at (-310, 300) & Vast Regional Desert/Savanna Biome
  assert.equal(SOUTHWEST_OASIS_POS.x, -310.0, 'Expected SW Oasis relocated far West to x = -310');
  assert.equal(SOUTHWEST_OASIS_POS.z, 300.0, 'Expected SW Oasis relocated far South to z = 300');

  // Verify the Desert/Savanna biome spans a wide multi-hundred-meter region (not just a single circle!)
  const biomeAtTransition = southwestOasisBiomeFactorAt(-195.0, 215.0);
  const biomeMidway = southwestOasisBiomeFactorAt(-245.0, 255.0);
  const biomeAtOasis = southwestOasisBiomeFactorAt(-310.0, 300.0);
  assert.ok(biomeAtTransition > 0.35, `Expected SW savanna/dirt transition to start far before the oasis at (-195, 215), got ${biomeAtTransition}`);
  assert.ok(biomeMidway > 0.75, `Expected strong desert/savanna biome factor at (-245, 255), got ${biomeMidway}`);
  assert.ok(biomeAtOasis > 0.98, `Expected 1.0 desert oasis biome factor at (-310, 300), got ${biomeAtOasis}`);

  // Verify diverse desert trees ('palm' and 'acacia') are populated across the wide South-West region
  const palms = obstacles.filter((o) => o.kind === 'palm');
  const acacias = obstacles.filter((o) => o.kind === 'acacia');
  assert.ok(palms.length >= 25, `Expected >= 25 date palm trees across the SW Oasis & Desert biome, got ${palms.length}`);
  assert.ok(acacias.length >= 25, `Expected >= 25 umbrella acacia savanna trees across the SW biome, got ${acacias.length}`);

  const oasisGround = groundHeightAt(SOUTHWEST_OASIS_POS.x, SOUTHWEST_OASIS_POS.z);
  assert.ok(
    Math.abs(oasisGround - SOUTHWEST_OASIS_POS.terraceY) < 0.05,
    `Expected flat Oasis terrace at ${SOUTHWEST_OASIS_POS.terraceY}m, got ${oasisGround}`
  );
  assert.ok(
    trailFactorAt(SOUTHWEST_OASIS_POS.gateX, SOUTHWEST_OASIS_POS.gateZ) > 0.7,
    'Expected scenic trail to arrive at the relocated South-West Oasis Gate'
  );

  // 3) Enterable Alchemist & Silk Weaver's Pavilion door ('sw-alchemist-door') & roof protection
  const alchDoor = findNearestFortressDoor(
    SOUTHWEST_OASIS_POS.pavilionDoorX + 1.5,
    SOUTHWEST_OASIS_POS.pavilionFloorY,
    SOUTHWEST_OASIS_POS.pavilionZ,
    Math.PI / 2,
    0
  );
  assert.equal(alchDoor?.id, 'sw-alchemist-door');
  assert.equal(
    isPositionUnderRoof(
      SOUTHWEST_OASIS_POS.pavilionX,
      SOUTHWEST_OASIS_POS.pavilionFloorY + 0.5,
      SOUTHWEST_OASIS_POS.pavilionZ
    ),
    true
  );

  // 4) Walkable Over-Water Lotus Gazebo & Bridge across the Turquoise Oasis Lagoon (-310, 326)
  const gazeboWalk = walkableHeightAt(SOUTHWEST_OASIS_POS.gazeboX, SOUTHWEST_OASIS_POS.gazeboZ);
  assert.equal(gazeboWalk.surface, 'pier');
  assert.ok(Math.abs(gazeboWalk.height - SOUTHWEST_OASIS_POS.gazeboDeckY) < 0.05);

  // 5) Climbable 24m Celestial Observatory Tower door ('sw-observatory-door') and internal ladder ('sw-observatory-ladder')
  const obsDoor = findNearestFortressDoor(
    SOUTHWEST_OASIS_POS.observatoryX,
    SOUTHWEST_OASIS_POS.observatoryBaseY,
    SOUTHWEST_OASIS_POS.observatoryDoorZ + 1.5,
    0,
    0
  );
  assert.equal(obsDoor?.id, 'sw-observatory-door');
});

test('rangerArchery_WhenDrawingBowAndShootingArrows_ShouldSimulateBallisticTrajectoriesAndBullseyeCollisions', async () => {
  // Arrange
  const {
    ARCHERY_TARGETS,
    spawnArrowProjectile,
    stepArrowsPhysics,
  } = await import('./terrainMath');
  // Act

  const player = createInitialPlayerState();
  // Assert
  assert.equal(player.cameraPerspective, 'third_person', 'Expected default camera perspective to be third_person');
  assert.equal(player.bowDrawn, false);
  assert.equal(player.bowDrawProgress, 0);

  // Aim from the Chinese Fortress Archery Range directly at the imperial Archery Bullseye Target
  const target = ARCHERY_TARGETS[0];
  const targetBaseY = walkableHeightAt(target.x, target.z).height;
  player.x = target.x;
  player.z = target.z + 13.5;
  player.y = targetBaseY;
  const targetCenterY = targetBaseY + 1.35;
  const shoulderY = player.y + 1.44;

  const dx = target.x - player.x;
  const dz = target.z - player.z;
  const horizDist = Math.hypot(dx, dz);
  player.yaw = Math.atan2(-dx, -dz);
  // Slight upward aim compensation for gravity over ~13.7m distance at 58 m/s
  player.pitch = Math.atan2(targetCenterY - shoulderY + 0.12, horizDist) - 0.035;
  player.bowDrawn = true;
  player.bowDrawProgress = 1.0;

  const arrow = spawnArrowProjectile(player, 1.0);
  const arrows = [arrow];

  let hitDetected = false;
  for (let step = 0; step < 30; step++) {
    const res = stepArrowsPhysics(arrows, [], 0.02);
    if (res.hitTarget) {
      hitDetected = true;
      assert.equal(res.hitTarget.id, target.id, 'Expected arrow to hit the aimed Archery Bullseye Target');
      break;
    }
  }
  assert.equal(hitDetected, true, 'Expected fired arrow to strike the Archery Bullseye Target');
  assert.equal(arrow.stuck, true, 'Expected arrow to stick into the target upon impact');
  assert.equal(arrow.hitKind, 'target');
  assert.equal(arrow.hitTargetId, target.id);
});

test('dwarvenKingdom_WhenEvaluatingSettlementAndCaravanSchedule_ShouldVerifyStructuresAndTemporalSchedule', async () => {
  // Arrange
  const {
    DWARVEN_GUARDIAN_STATUES,
    DWARVEN_STONE_HOUSES,
    DWARVEN_MINERS_COUNT,
    computeDwarvenMinerCaravanState,
  } = await import('./terrainMath');
  // Act

  // 1) Mine is relocated far South (entranceZ = 420.0) and flanked by Twin Colossal LOTR Dwarven Guardian Statues
  // Assert
  assert.equal(SOUTHERN_MINE_POS.entranceZ, 420.0);
  assert.equal(DWARVEN_GUARDIAN_STATUES.length, 2);
  assert.ok(DWARVEN_GUARDIAN_STATUES[0].x < SOUTHERN_MINE_POS.x && DWARVEN_GUARDIAN_STATUES[1].x > SOUTHERN_MINE_POS.x);
  assert.ok(Math.abs(DWARVEN_GUARDIAN_STATUES[0].z - 415.8) < 0.1);

  // 2) 4 Dwarven Stone Houses along the Dwarven King's Road (z = 368..392) have flat terraces, walkable cabin floors, rain-blocking stone roofs, and interactive [E] doors
  assert.equal(DWARVEN_STONE_HOUSES.length, 4);
  for (const dh of DWARVEN_STONE_HOUSES) {
    const gH = groundHeightAt(dh.x, dh.z);
    assert.ok(Math.abs(gH - dh.terraceY) < 0.08, `Expected flat leveled terrace at ${dh.id}, got ${gH}`);
    const walkH = walkableHeightAt(dh.x, dh.z, dh.floorY);
    assert.equal(walkH.surface, 'cabin', `Expected walkable cabin floor inside ${dh.id}`);
    assert.ok(Math.abs(walkH.height - dh.floorY) < 0.05);
    assert.equal(isPositionUnderRoof(dh.x, dh.floorY + 0.5, dh.z), true, `Expected stone slab roof over ${dh.id}`);

    const lookYaw = dh.dirX === 1 ? Math.PI / 2 : -Math.PI / 2; // Looking from road into house door
    const detectedDoor = findNearestFortressDoor(
      dh.doorX + dh.dirX * 1.4,
      dh.floorY,
      dh.doorZ,
      lookYaw,
      0
    );
    assert.equal(detectedDoor?.id, dh.doorId, `Expected findNearestFortressDoor to detect ${dh.doorId}`);
  }

  // 3) 8 LOTR Dwarven Miners follow the Sunrise Caravan -> Daytime Underground Mining -> Sunset Caravan -> Night Home Rest schedule!
  assert.equal(DWARVEN_MINERS_COUNT, 8);
  for (let i = 0; i < DWARVEN_MINERS_COUNT; i++) {
    const sunriseState = computeDwarvenMinerCaravanState(6.6, i, 10.0);
    assert.equal(sunriseState.activity, 'caravan_to_mine', `Expected Dwarf ${i} at 06:36 to march in the Sunrise Caravan toward the mine`);
    assert.equal(sunriseState.lanternLit, true);

    const dayWorkState = computeDwarvenMinerCaravanState(12.0, i, 25.0);
    assert.equal(dayWorkState.activity, 'mining_work', `Expected Dwarf ${i} at 12:00 Noon to be working underground in the mine`);
    assert.equal(dayWorkState.lanternLit, true);
    assert.ok(
      Math.abs(dayWorkState.y - SOUTHERN_MINE_POS.cavernFloorY) < 0.1,
      `Expected Dwarf ${i} to stand on the subterranean cavern floor (${SOUTHERN_MINE_POS.cavernFloorY}), got ${dayWorkState.y}`
    );
    assert.ok(dayWorkState.z > SOUTHERN_MINE_POS.entranceZ + 38.0, `Expected Dwarf ${i} to work deep inside the mine chambers`);

    const sunsetState = computeDwarvenMinerCaravanState(18.5, i, 40.0);
    assert.equal(sunsetState.activity, 'caravan_to_home', `Expected Dwarf ${i} at 18:30 Sunset to march in the Caravan back to the stone houses`);
    assert.equal(sunsetState.lanternLit, true);

    const nightState = computeDwarvenMinerCaravanState(23.0, i, 50.0);
    assert.equal(nightState.activity, 'resting_home', `Expected Dwarf ${i} at 23:00 Night to rest inside their Dwarven Stone House`);
    assert.equal(nightState.lanternLit, false);
  }
});

test('horsePhysicsSystem_WhenAcceleratingAndSteering_ShouldApplyDynamicTurningResistanceAndGaitAnimation', async () => {
  // Arrange
  const {
    createInitialRideableHorses,
    computeHorseTurnResistance,
    computeHorseBiomechanicalPose,
    MARKET_STALL_LOCATIONS,
    findNearestMarketStall,
  } = await import('./terrainMath');

  // Act
  // 1) Verify closer Harbor Market merchant proximity (4.5m radius)
  for (const st of MARKET_STALL_LOCATIONS) {
  // Assert
    assert.equal(st.radius, 4.5, `Expected Harbor Market stall ${st.id} radius to be 4.5m`);
  }
  assert.equal(
    findNearestMarketStall(212 + 8.0, 254),
    null,
    'Expected standing 8m away from merchant counter to be outside 4.5m trade range'
  );
  assert.equal(
    findNearestMarketStall(212 + 2.8, 254)?.id,
    'market-harbor-1',
    'Expected standing 2.8m from merchant counter to trigger Harbor Market trade'
  );

  // 2) Verify speed-dependent turning resistance increases as horse runs faster
  const slowTurn = computeHorseTurnResistance(1.5);
  const mediumTurn = computeHorseTurnResistance(6.0);
  const fastGallopTurn = computeHorseTurnResistance(13.5);
  assert.ok(
    fastGallopTurn.effectiveTurnRate < mediumTurn.effectiveTurnRate &&
      mediumTurn.effectiveTurnRate < slowTurn.effectiveTurnRate,
    'Expected effectiveTurnRate to decrease at higher speeds due to turning resistance'
  );
  assert.ok(
    fastGallopTurn.turningRadiusMeters > mediumTurn.turningRadiusMeters &&
      mediumTurn.turningRadiusMeters > slowTurn.turningRadiusMeters,
    `Expected turning radius to be wider at gallop (${fastGallopTurn.turningRadiusMeters.toFixed(2)}m) than walk (${slowTurn.turningRadiusMeters.toFixed(2)}m)`
  );

  // 3) Verify turning the horse left/right rotates the rider's yaw along with the horse
  const horses = createInitialRideableHorses();
  const horse = horses[0];
  horse.yaw = 0;

  const player = createInitialPlayerState();
  player.x = horse.x;
  player.z = horse.z;
  player.y = horse.y;
  player.mountedHorseId = horse.id;
  player.mountedHorseYaw = 0;
  player.yaw = 0.4; // Rider looking 0.4 rad to the side

  stepPlayerPhysics(
    player,
    {
      forward: 1,
      right: 1, // Steer horse right
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.05,
    new Set(),
    horses
  );
  assert.ok(horse.yaw < -0.05, `Expected horse.yaw to rotate right (< -0.05), got ${horse.yaw}`);
  assert.ok(
    Math.abs(player.yaw - (0.4 + horse.yaw)) < 0.001,
    `Expected rider yaw (${player.yaw}) to rotate together with horse turn (${horse.yaw})`
  );

  // 4) Verify rational biomechanical gait poses across idle, walk, trot, and gallop
  const idlePose = computeHorseBiomechanicalPose(0, 0, 1.0, 0);
  const walkPose = computeHorseBiomechanicalPose(2.2, 1.2, 1.0, 0);
  const gallopPose = computeHorseBiomechanicalPose(12.5, 2.1, 1.0, 0);
  assert.equal(idlePose.gaitKind, 'idle');
  assert.equal(walkPose.gaitKind, 'walk');
  assert.equal(gallopPose.gaitKind, 'gallop');
  assert.ok(gallopPose.frontLeft.lowerPitch >= 0, 'Expected forelimb knee flexion to be positive (backward bend)');
});

test('wildlifeAndBoids_WhenPlayerApproachesFauna_ShouldSimulateFlockingSteeringAndProximityFleeing', async () => {
  // Arrange
  const {
    createInitialBoidBirds,
    createInitialSmallAnimals,
    stepBoidsAndWildlife,
  } = await import('./terrainMath');

  // Act
  const birds = createInitialBoidBirds();
  const animals = createInitialSmallAnimals();
  // Assert
  assert.equal(birds.length, 36);
  assert.equal(animals.length, 18);

  // Place player right beneath bird flock 0 and next to critter 0
  const targetBird = birds[0];
  const res1 = stepBoidsAndWildlife(
    birds,
    animals,
    targetBird.x,
    targetBird.y - 6.0,
    targetBird.z,
    6.0,
    0.05
  );
  assert.ok(res1.startledFlockCount > 0, 'Expected approaching bird flock to startle Boids birds');
  assert.ok(targetBird.fleeTimer > 0, 'Expected startled Boid bird to enter flee ascent state');
  assert.ok(targetBird.vy > 0, 'Expected startled Boid bird to climb upward away from player');

  const targetAnimal = animals[0];
  const res2 = stepBoidsAndWildlife(
    birds,
    animals,
    targetAnimal.x + 2.0,
    targetAnimal.y,
    targetAnimal.z + 2.0,
    4.0,
    0.05
  );
  assert.ok(res2.scamperedCritterCount > 0, 'Expected approaching forest animal within flee radius to trigger scamper');
  assert.equal(targetAnimal.alertLevel, 'fleeing');
  assert.ok(Math.hypot(targetAnimal.vx, targetAnimal.vz) > 4.0, 'Expected fleeing forest animal to hop away rapidly');
});
// #endregion

// ======================== GUARD CLAUSE AND VALIDATION TESTS ======================== \\
// #region Guard Clause and Validation Tests
test('farNorthernSnowLine_WhenEvaluatingElevation_ShouldAccumulateSnowExclusivelyAboveSnowLineAltitude', () => {
  // Arrange
  const hValley = groundHeightAt(-18, -25);
  const hFoothill = groundHeightAt(35, -75);
  // Act
  const hNorthSnowPeak = groundHeightAt(-65, -172);

  // Assert
  assert.ok(hFoothill > hValley + 3.5, `Expected northern foothill (${hFoothill}) > valley (${hValley}) + 3.5m`);
  assert.ok(hFoothill < SNOW_LINE_ALTITUDE, `Expected lower foothill (${hFoothill}) < SNOW_LINE_ALTITUDE (${SNOW_LINE_ALTITUDE})`);
  assert.equal(northernSnowZoneFactorAt(35, -75), 0, 'Expected zero snow accumulation at lower mountain foothills below SNOW_LINE_ALTITUDE');

  assert.ok(hNorthSnowPeak > SNOW_LINE_ALTITUDE + 12.0, `Expected northern snow peak (${hNorthSnowPeak}) well above SNOW_LINE_ALTITUDE`);
  const snowFactorNorth = northernSnowZoneFactorAt(-65, -172);
  const snowFactorSouth = northernSnowZoneFactorAt(0, 32);
  assert.ok(snowFactorNorth > 0.9, `Expected high northern snow zone factor > 0.9, got ${snowFactorNorth}`);
  assert.equal(snowFactorSouth, 0, 'Expected zero snow factor at southern spawn vista');

  assert.ok(PLAYABLE_RADIUS >= 650);
  for (const m of WALKABLE_MOUNTAINS) {
    const peakH = groundHeightAt(m.x, m.z);
    assert.ok(peakH > 13.0, `Expected mountain ${m.id} peak > 13m, got ${peakH}`);
  }

  const lodgePorch = walkableHeightAt(HUNTER_LODGE_POS.x, HUNTER_LODGE_POS.z);
  assert.equal(lodgePorch.surface, 'cabin');

  // New Lakeside Over-Water Chinese Tea Pavilion at (-126, 48) is walkable above the water and shelters from rain
  const teaPavWalk = walkableHeightAt(LAKESIDE_TEA_PAVILION_POS.x, LAKESIDE_TEA_PAVILION_POS.z);
  assert.equal(teaPavWalk.surface, 'pier');
  assert.ok(Math.abs(teaPavWalk.height - LAKESIDE_TEA_PAVILION_POS.deckHeight) < 0.05);
  assert.equal(isPositionUnderRoof(LAKESIDE_TEA_PAVILION_POS.x, LAKESIDE_TEA_PAVILION_POS.deckHeight, LAKESIDE_TEA_PAVILION_POS.z), true);

  assert.equal(isWithinViewDistance(10, 20, 0, 0, 0, VIEW_DISTANCE), true);
  assert.equal(isWithinViewDistance(400, 400, 0, 0, 0, VIEW_DISTANCE), false);
  const waterRgb = sampleMinimapColorAt(-2, 1.5);
  assert.ok(waterRgb[2] > waterRgb[0]);
  assert.ok(trailFactorAt(0, 28.5) > 0.7);
});

test('firstPersonAndInventory_WhenSwimmingOrEquippingElementalArrows_ShouldAutoStowAndManageHotkeys', async () => {
  // Arrange
  const {
    spawnArrowProjectile,
    stepArrowsPhysics,
    equipInventoryItem,
    assignHotbarSlot,
    toggleFavoriteItem,
    isInventoryItemEquipped,
  } = await import('./terrainMath');

  // 1) Entering water while drawing the bow automatically stows the bow on the back
  const swimmer = createInitialPlayerState();
  swimmer.x = 0;
  swimmer.z = -2.0; // Deep central lake
  swimmer.y = -1.2;
  swimmer.bowDrawn = true;
  swimmer.bowDrawProgress = 1.0;

  stepPlayerPhysics(
    swimmer,
    { forward: 1, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
    [],
  // Act
    0.05
  );
  // Assert
  assert.equal(swimmer.isSwimming, true, 'Expected player in deep lake to enter swimming state');
  assert.equal(swimmer.bowDrawn, false, 'Expected bowDrawn to automatically cancel when swimming');
  assert.equal(swimmer.bowDrawProgress, 0, 'Expected bowDrawProgress to reset to 0 when swimming');

  // 2) Elemental Wind Arrow flies faster than Normal Arrow AND records a fading gray flight trail
  const archer = createInitialPlayerState();
  archer.arrowKind = 'normal';
  const normalArrow = spawnArrowProjectile(archer, 1.0);
  const normalSpd = Math.hypot(normalArrow.vx, normalArrow.vy, normalArrow.vz);

  archer.arrowKind = 'wind';
  const windArrow = spawnArrowProjectile(archer, 1.0);
  const windSpd = Math.hypot(windArrow.vx, windArrow.vy, windArrow.vz);
  assert.ok(windSpd > normalSpd * 1.35, `Expected wind arrow speed (${windSpd}) > 1.35x normal speed (${normalSpd})`);

  stepArrowsPhysics([normalArrow], [], 0.08);
  assert.ok(normalArrow.trail.length >= 2, 'Expected flying arrow to record gray trail points along its path');
  assert.ok(normalArrow.trail[0].age > 0, 'Expected trail points to age over time so they fade out');

  // 3) Skyrim Inventory equip, Hotbar [1-4] assignment, and Favorites [Q] toggle
  equipInventoryItem(archer, 'sword');
  assert.equal(archer.equippedTool, 'sword');
  assert.equal(isInventoryItemEquipped(archer, 'sword'), true);

  equipInventoryItem(archer, 'arrow_fire');
  assert.equal(archer.arrowKind, 'fire');
  assert.equal(archer.equippedTool, 'bow');

  assignHotbarSlot(archer, 0, 'sword');
  assignHotbarSlot(archer, 1, 'arrow_fire');
  assert.equal(archer.hotbarSlots?.[0], 'sword');
  assert.equal(archer.hotbarSlots?.[1], 'arrow_fire');

  const favRemoved = toggleFavoriteItem(archer, 'torch');
  assert.equal(favRemoved, false);
  const favAdded = toggleFavoriteItem(archer, 'torch');
  assert.equal(favAdded, true);

  // 4) Skyrim Sword 3-Hit Combo Cycling & Melee Target Hit Detection (`triggerSwordSlash`)
  const { triggerSwordSlash, ARCHERY_TARGETS } = await import('./terrainMath');
  const swordsman = createInitialPlayerState();
  swordsman.equippedTool = 'sword';
  const tgt = ARCHERY_TARGETS[0];
  // Stand 1.6m south of the target facing North (yaw = 0)
  swordsman.x = tgt.x;
  swordsman.z = tgt.z + 1.6;
  swordsman.y = groundHeightAt(swordsman.x, swordsman.z);
  swordsman.yaw = 0;
  swordsman.pitch = 0;

  const hit1 = triggerSwordSlash(swordsman, []);
  assert.equal(hit1.comboIndex, 0, 'First slash should use combo index 0 (Diagonal Cleave)');
  assert.equal(hit1.hitKind, 'target', 'Expected melee slash within 1.6m of archery target to hit target');
  assert.equal(hit1.hitTarget?.id, tgt.id);
  assert.ok(swordsman.lastSwordHitPoint !== null, 'Expected lastSwordHitPoint to be populated on melee impact');

  const hit2 = triggerSwordSlash(swordsman, []);
  assert.equal(hit2.comboIndex, 1, 'Second slash should cycle to combo index 1 (Reverse Backhand)');

  const hit3 = triggerSwordSlash(swordsman, []);
  assert.equal(hit3.comboIndex, 2, 'Third slash should cycle to combo index 2 (Forward Lunge Thrust)');

  const hit4 = triggerSwordSlash(swordsman, []);
  assert.equal(hit4.comboIndex, 0, 'Fourth slash should wrap around to combo index 0');
  assert.equal(hit4.isHeavy, false, 'Quick slash should have isHeavy = false');

  // 5) Heavy Forward Air-Cleaving Sword Power Attack (Long-Press Left-Click)
  swordsman.z = tgt.z + 3.6; // 3.6m away (beyond normal 2.85m slash reach, within 4.25m heavy air-cleave reach!)
  const heavyHit = triggerSwordSlash(swordsman, [], true);
  assert.equal(heavyHit.isHeavy, true, 'Heavy slash should report isHeavy = true');
  assert.equal(swordsman.swordHeavyAttack, true, 'Player state should record swordHeavyAttack = true');
  assert.ok(swordsman.lastSwordAirWave !== null, 'Heavy slash should spawn a forward-flying air-cleave wave');
  assert.equal(heavyHit.hitKind, 'target', 'Heavy forward air-cleave should strike target at 3.6m reach');
  assert.equal(heavyHit.hitTarget?.id, tgt.id);
});

test('mountedCamera_WhenFreeLookingWhileMounted_ShouldAllowIndependentYawWithinAngularBounds', async () => {
  // Arrange
  const { createInitialRideableHorses } = await import('./terrainMath');
  const horses = createInitialRideableHorses();
  const horse = horses[0];
  horse.yaw = 0;

  const player = createInitialPlayerState();
  player.x = horse.x;
  player.z = horse.z;
  player.y = horse.y;
  player.mountedHorseId = horse.id;
  player.mountedHorseYaw = 0;
  player.yaw = 0;

  // Look 90 degrees (1.57 rad) to the right while galloping forward: horse.yaw must remain 0!
  stepPlayerPhysics(
    player,
    {
      forward: 1,
      right: 0,
      sprint: true,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      lookYawDelta: 1.57,
      lookPitchDelta: 0,
    },
    [],
    0.05,
    new Set(),
  // Act
    horses
  );
  // Assert
  assert.equal(horse.yaw, 0, 'Expected horse body yaw to remain 0 when looking sideways with mouse');
  assert.ok(Math.abs(player.yaw - 1.57) < 0.01, 'Expected rider look yaw to rotate freely to 90 degrees');

  // Attempting to look 160 degrees (2.79 rad) clamps rider look yaw at ±115 degrees (~2.007 rad)
  stepPlayerPhysics(
    player,
    {
      forward: 1,
      right: 0,
      sprint: true,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      lookYawDelta: 1.5,
      lookPitchDelta: 0,
    },
    [],
    0.05,
    new Set(),
    horses
  );
  const maxRad = (115 * Math.PI) / 180;
  assert.ok(
    Math.abs(player.yaw - maxRad) < 0.01,
    `Expected rider look yaw to be clamped at 115 deg (${maxRad.toFixed(3)} rad), got ${player.yaw.toFixed(3)}`
  );
  assert.equal(horse.yaw, 0, 'Expected horse body yaw to still remain 0');
});

test('swordKinematics_WhenAttackingThroughFivePhases_ShouldSynchronizeStrikeWindowAndDamageCalculations', async () => {
  // Arrange
  const {
    classifySwordAttackPhase,
    computeFirstPersonSwordAttackPose,
    triggerSwordSlash,
    stepSwordSwingCombat,
    ARCHERY_TARGETS,
  } = await import('./terrainMath');
  // Act

  // 1) Verify all 5 distinct phases across normalized swingProgress [0, 1]
  // Assert
  assert.equal(classifySwordAttackPhase(0).phase, 'ready');
  assert.equal(classifySwordAttackPhase(0.12).phase, 'windup');
  assert.equal(classifySwordAttackPhase(0.36).phase, 'strike');
  assert.equal(classifySwordAttackPhase(0.60).phase, 'follow_through');
  assert.equal(classifySwordAttackPhase(0.86).phase, 'recovery');

  // 2) Verify anatomical forearm-to-wrist length stability (0.34m), FOV visibility, and C0 continuity across all 3 attack types
  for (const [comboIndex, isHeavy] of [
    [0, false],
    [1, false],
    [2, true],
  ] as const) {
    const readyPose = computeFirstPersonSwordAttackPose({
      swingProgress: 0,
      comboIndex,
      isHeavy,
      chargeProgress: 0,
      blockProgress: 0,
      swayX: 0,
      swayY: 0,
      breathY: 0,
      sprintCarry: 0,
    });
    const endRecoveryPose = computeFirstPersonSwordAttackPose({
      swingProgress: 1.0,
      comboIndex,
      isHeavy,
      chargeProgress: 0,
      blockProgress: 0,
      swayX: 0,
      swayY: 0,
      breathY: 0,
      sprintCarry: 0,
    });

    // End of Phase E (Recovery, p=1.0) must match Phase A (Ready Stance, p=0.0) without snapping
    assert.ok(
      Math.hypot(
        readyPose.rightArm.wristX - endRecoveryPose.rightArm.wristX,
        readyPose.rightArm.wristY - endRecoveryPose.rightArm.wristY,
        readyPose.rightArm.wristZ - endRecoveryPose.rightArm.wristZ
      ) < 1e-4,
      `Expected Recovery end (p=1) to blend seamlessly back into Ready Stance (p=0) for combo ${comboIndex}`
    );

    let prevPose = readyPose;
    for (let step = 1; step <= 100; step++) {
      const p = step / 100;
      const pose = computeFirstPersonSwordAttackPose({
        swingProgress: p,
        comboIndex,
        isHeavy,
        chargeProgress: 0,
        blockProgress: 0,
        swayX: 0,
        swayY: 0,
        breathY: 0,
        sprintCarry: 0,
      });

      // Forearm length must stay locked at 0.34m (zero forearm stretching or detachment)
      const rForearmLen = Math.hypot(
        pose.rightArm.wristX - pose.rightArm.elbowX,
        pose.rightArm.wristY - pose.rightArm.elbowY,
        pose.rightArm.wristZ - pose.rightArm.elbowZ
      );
      assert.ok(
        Math.abs(rForearmLen - 0.34) < 1e-3,
        `Expected right forearm length to remain 0.34m at p=${p}, got ${rForearmLen}`
      );

      // Continuity check: no sudden position teleport between 1% steps
      const wristStepDist = Math.hypot(
        pose.rightArm.wristX - prevPose.rightArm.wristX,
        pose.rightArm.wristY - prevPose.rightArm.wristY,
        pose.rightArm.wristZ - prevPose.rightArm.wristZ
      );
      assert.ok(
        wristStepDist < 0.045,
        `Expected continuous wrist trajectory without snapping at p=${p} (combo ${comboIndex}), step=${wristStepDist}`
      );

      // First-Person FOV check: sword crossguard and tip must remain in front of camera (z < -0.30) and within visible frustum
      assert.ok(
        pose.swordCrossguardCamera.z < -0.32 && pose.swordTipCamera.z < -0.60,
        `Expected sword blade to stay in front of camera at p=${p}`
      );
      prevPose = pose;
    }
  }

  // 3) Synchronized Combat Hit Window: deferred strike does NOT hit during Phase B (Wind-Up),
  // hits strictly ONCE during Phase C (Active Strike Window), and prevents duplicate hits during Follow-Through/Recovery
  const player = createInitialPlayerState();
  const target = ARCHERY_TARGETS[0];
  player.x = target.x;
  player.z = target.z + 1.65;
  player.y = groundHeightAt(player.x, player.z);
  player.yaw = 0;
  player.pitch = 0;

  const startRes = triggerSwordSlash(player, [], false, true);
  assert.equal(startRes.hitKind, 'none', 'Expected no immediate hit during Phase B Wind-Up initiation');
  assert.equal(player.swordStrikePending, true, 'Expected swordStrikePending = true during Wind-Up');
  assert.equal(player.lastSwordHitPoint, null, 'Expected no clash sparks during Wind-Up');

  // Step 0.10s -> still in Phase B Wind-Up (p ≈ 0.195 < 0.30): no hit yet!
  const windupStep = stepSwordSwingCombat(player, [], 0.10);
  assert.equal(windupStep, null, 'Expected no hit detection while still in Phase B Wind-Up');
  assert.equal(player.swordStrikePending, true);

  // Step another 0.10s -> enters Phase C Active Strike Window (p ≈ 0.38 >= 0.34): hit triggers NOW!
  const strikeStep = stepSwordSwingCombat(player, [], 0.10);
  assert.ok(strikeStep !== null, 'Expected hit detection to fire when blade enters Phase C Active Strike Window');
  assert.equal(strikeStep?.hitKind, 'target');
  assert.equal(strikeStep?.hitTarget?.id, target.id);
  assert.equal(player.swordStrikePending, false, 'Expected swordStrikePending to clear after single strike evaluation');
  assert.ok(player.lastSwordHitPoint !== null, 'Expected clash sparks to spawn at Phase C impact moment');

  // Step through the rest of Phase C, Phase D (Follow-Through), and Phase E (Recovery): zero duplicate hits!
  let duplicateHits = 0;
  for (let i = 0; i < 15; i++) {
    const followStep = stepSwordSwingCombat(player, [], 0.04);
    if (followStep !== null) duplicateHits++;
  }
  assert.equal(duplicateHits, 0, 'Expected zero duplicate hits during Follow-Through and Recovery');
  assert.equal(player.swordSwingProgress, 0, 'Expected swordSwingProgress to reset cleanly to 0 after Recovery completes');
});
// #endregion

// ======================== SECURITY TESTS ======================== \\
// #region Security Tests
test('fortressEconomyAndProgression_WhenTradingAtMarketStall_ShouldEnforceLevelGatesAndArcheryTargets', async () => {
  // Arrange
  const {
    ARCHERY_TARGETS,
    getPlayerHeroLevel,
    awardSkillXp,
    buyMarketItem,
    sellMarketItem,
    isInventoryItemOwned,
    findNearestMarketStall,
  } = await import('./terrainMath');
  // Act

  // 1) Strictly the 4 original Archery Targets next to the Grand Hall in the Chinese Fortress exist
  // Assert
  assert.equal(ARCHERY_TARGETS.length, 4, 'Expected strictly 4 archery targets next to the Grand Hall');
  for (const tgt of ARCHERY_TARGETS) {
    assert.equal(tgt.z, -352.0, `Expected Grand Hall target ${tgt.id} at z=-352.0`);
  }

  // 2) Player starts at Level 1 with slower XP progression (xpNext = 240) and 280 gold coins
  const player = createInitialPlayerState();
  assert.equal(getPlayerHeroLevel(player), 1, 'Expected player to start at Hero Level 1');
  assert.equal(player.goldCoins, 280, 'Expected starter gold purse of 280 gold coins');
  assert.equal(player.skills?.archeryXpNext, 240, 'Expected slower initial xpNext of 240');

  // Awarding 100 XP should NOT level up immediately (since xpNext is 240)
  const noLevelUp = awardSkillXp(player, 'archery', 100);
  assert.equal(noLevelUp, null, 'Expected 100 XP not to level up when xpNext is 240');
  assert.equal(player.skills?.archeryLevel, 1);

  // 3) Market Shop: Buying/selling outside the Harbor Market is blocked ('not_in_market')
  player.goldCoins = 1000;
  assert.equal(findNearestMarketStall(10.5, 24.5), null, 'Expected Crossroads Stall to be removed so trading happens only at the Harbor Market');
  const outsideMarketBuy = buyMarketItem(player, 'katana_imperial');
  assert.equal(outsideMarketBuy.ok, false);
  assert.equal(outsideMarketBuy.reason, 'NOT_IN_MARKET');

  // Move player to the Harbor Market Stalls (212.0, 254.0)
  player.x = 212.0;
  player.z = 254.0;
  const nearHarborStall = findNearestMarketStall(player.x, player.z);
  assert.ok(nearHarborStall !== null, 'Expected market stall detection at Harbor Market Stall (212, 254)');

  // Level-gated weapons above player's level (e.g. elven_longbow requires Level 2) are locked at Level 1!
  const lockedBuy = buyMarketItem(player, 'elven_longbow');
  assert.equal(lockedBuy.ok, false, 'Expected Level 2 weapon purchase to be blocked at Hero Level 1');
  assert.equal(lockedBuy.reason, 'LEVEL_TOO_LOW');
  assert.equal(isInventoryItemOwned(player, 'elven_longbow'), false);

  // Buying a Level 1 Market weapon ('katana_imperial', 220 gold) at the Harbor Market succeeds and equips it!
  const validBuy = buyMarketItem(player, 'katana_imperial');
  assert.equal(validBuy.ok, true, 'Expected Level 1 weapon purchase at Harbor Market to succeed');
  assert.equal(isInventoryItemOwned(player, 'katana_imperial'), true);
  assert.equal(player.goldCoins, 780);
  assert.equal(player.equippedTool, 'sword');
  assert.equal(player.activeWeaponId, 'katana_imperial');

  // Selling an owned material ('dwarven_gold_ore') at the Harbor Market adds gold and removes it from ownedItemIds
  const sellRes = sellMarketItem(player, 'dwarven_gold_ore');
  assert.equal(sellRes.ok, true, 'Expected selling dwarven_gold_ore at Harbor Market to succeed');
  assert.equal(isInventoryItemOwned(player, 'dwarven_gold_ore'), false);
  assert.ok((player.goldCoins ?? 0) > 780, 'Expected goldCoins to increase after selling item');
});
// #endregion

// ======================== EDGE CASES AND INFRASTRUCTURE FAILURES ======================== \\
// #region Edge Cases and Infrastructure Failures
test('playerJumping_WhenApproachingLowObstaclesAndParapets_ShouldPermitTraversingWithoutBlocking', () => {
  // Arrange
  const state = createInitialPlayerState();
  // Place player on the West Walkable Great-Wall Rampart top (x = -49.5, z = -170 + FORTRESS_Z_OFFSET, y = rampartHeight)
  state.x = -49.5;
  state.z = -170 + FORTRESS_Z_OFFSET;
  state.y = CHINESE_FORTRESS_POS.rampartHeight;
  state.onGround = true;
  state.yaw = Math.PI / 2; // Facing West (-X) toward the outer rampart parapet at x = -51.4..-52.8

  // Jump while running West over the outer parapet
  for (let i = 0; i < 35; i++) {
    stepPlayerPhysics(
      state,
      {
        forward: 1,
        right: 0,
        sprint: true,
        relaxed: false,
        jumpPressed: i === 0,
        jumpHeld: i < 12,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      [],
      0.04
  // Act
    );
  }
  // Assert
  assert.ok(state.x < -53.0, `Expected player to jump cleanly over the outer rampart parapet, got x=${state.x}`);
});

test('swimmingPhysics_WhenEnteringWaterBasins_ShouldApplyBuoyancyAndWaterMovementConstraints', async () => {
  // Arrange
  const {
    SOUTHWEST_OASIS_POS,
    getWaterSurfaceHeightAt,
  } = await import('./terrainMath');

  // Act
  // 1) Central Lake water surface at 0.0m and deep basin floor < -2.0m
  const centralWaterY = getWaterSurfaceHeightAt(-2.0, 1.5);
  // Assert
  assert.equal(centralWaterY, WATER_LEVEL);

  const swimmerCentral = createInitialPlayerState();
  swimmerCentral.x = -2.0;
  swimmerCentral.z = 1.5;
  swimmerCentral.y = WATER_LEVEL - 1.2;
  for (let i = 0; i < 15; i++) {
    stepPlayerPhysics(
      swimmerCentral,
      { forward: 1, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.05
    );
  }
  assert.equal(swimmerCentral.isSwimming, true, 'Expected player in Central Lake deep water to enter swimming state');
  assert.equal(swimmerCentral.inWater, true);
  assert.ok(
    swimmerCentral.y > WATER_LEVEL - 1.45 && swimmerCentral.y < WATER_LEVEL - 0.35,
    `Expected buoyancy to keep swimmer near surface in Central Lake, got y=${swimmerCentral.y}`
  );

  // 2) South-West Oasis Lagoon (away from the central gazebo bridge, e.g. x = -318, z = 326) is carved deep for swimming!
  const lagoonX = SOUTHWEST_OASIS_POS.lagoonX - 8.5;
  const lagoonZ = SOUTHWEST_OASIS_POS.lagoonZ;
  const lagoonWaterY = getWaterSurfaceHeightAt(lagoonX, lagoonZ);
  assert.equal(lagoonWaterY, SOUTHWEST_OASIS_POS.lagoonWaterY);
  const lagoonFloor = groundHeightAt(lagoonX, lagoonZ);
  assert.ok(
    lagoonFloor < SOUTHWEST_OASIS_POS.lagoonWaterY - 1.5,
    `Expected SW Oasis Lagoon basin floor (${lagoonFloor}) to be carved >1.5m below lagoonWaterY (${SOUTHWEST_OASIS_POS.lagoonWaterY})`
  );

  const swimmerOasis = createInitialPlayerState();
  swimmerOasis.x = lagoonX;
  swimmerOasis.z = lagoonZ;
  swimmerOasis.y = SOUTHWEST_OASIS_POS.lagoonWaterY - 1.1;
  for (let i = 0; i < 12; i++) {
    stepPlayerPhysics(
      swimmerOasis,
      { forward: 1, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.05
    );
  }
  assert.equal(swimmerOasis.isSwimming, true, 'Expected player in SW Oasis Lagoon to swim');

  // 3) Underground Mine Room 2 Bioluminescent Crystal Lake (lx = -41.5 -> x = -99.5, lz = 63 -> z = 295) is swimmable!
  const mineLakeX = SOUTHERN_MINE_POS.x - 41.5;
  const mineLakeZ = SOUTHERN_MINE_POS.entranceZ + 63.0;
  const mineWaterY = getWaterSurfaceHeightAt(mineLakeX, mineLakeZ, -10.2);
  assert.equal(mineWaterY, -9.3);
  const mineLakeWalk = walkableHeightAt(mineLakeX, mineLakeZ, -10.2);
  assert.ok(
    mineLakeWalk.height < -10.5,
    `Expected Underground Mine Crystal Lake basin floor (${mineLakeWalk.height}) to be carved deep below -9.3m water level`
  );

  const swimmerMine = createInitialPlayerState();
  swimmerMine.x = mineLakeX;
  swimmerMine.z = mineLakeZ;
  swimmerMine.y = -10.35;
  for (let i = 0; i < 12; i++) {
    stepPlayerPhysics(
      swimmerMine,
      { forward: 1, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.05
    );
  }
  assert.equal(swimmerMine.isSwimming, true, 'Expected player in Underground Mine Crystal Lake to swim');
});

test('footprintTrailSystem_WhenEntitiesTraverseTerrain_ShouldSpawnFadingFootprintsWithBoundedBuffer', async () => {
  // Arrange
  const {
    createFootprintTrailTracker,
    stepFootprintTrailSystem,
  } = await import('./terrainMath');

  const tracker = createFootprintTrailTracker(0, 68);
  // Walk 1.5m forward on foot along the dirt trail
  const step1 = stepFootprintTrailSystem(
    tracker,
    0,
    walkableHeightAt(0, 66.5).height,
    66.5,
    0,
    true,
    false,
    false,
    false,
  // Act
    0.1
  );
  // Assert
  assert.equal(step1.spawnedCount, 1, 'Expected walking 1.5m on foot to spawn a boot footprint decal');
  assert.equal(tracker.decals[0].kind, 'boot');
  const initialOpacity = tracker.decals[0].opacity;
  assert.ok(initialOpacity > 0.4);

  // Walk another 1.5m while mounted on a horse
  const step2 = stepFootprintTrailSystem(
    tracker,
    0,
    walkableHeightAt(0, 65.0).height,
    65.0,
    0,
    true,
    false,
    false,
    true,
    0.1
  );
  assert.equal(step2.spawnedCount, 1, 'Expected riding 1.5m on horseback to spawn a horse hoofprint decal');
  assert.equal(tracker.decals[1].kind, 'hoof');

  // Advance time by 8 seconds (100 steps of 0.08s) and verify footprints fade smoothly, then expire after 16s
  for (let i = 0; i < 100; i++) {
    stepFootprintTrailSystem(tracker, 0, walkableHeightAt(0, 65.0).height, 65.0, 0, true, false, false, true, 0.08);
  }
  assert.ok(
    tracker.decals[0].opacity < initialOpacity && tracker.decals[0].opacity > 0,
    'Expected footprint opacity to fade smoothly over time'
  );
  for (let i = 0; i < 110; i++) {
    stepFootprintTrailSystem(tracker, 0, walkableHeightAt(0, 65.0).height, 65.0, 0, true, false, false, true, 0.08);
  }
  assert.equal(tracker.decals[0].active, false, 'Expected footprint decal to expire after 16 seconds');
});

test('riverBridgesAndUnderwaterDiving_WhenTraversingOrSwimming_ShouldSpanBankToBankPassUnderAndDiveDeep', () => {
  // 1) Central Arched Stone Bridge at (18, 2) reaches dry land on both banks and allows walking on top OR swimming underneath
  const centralNorthBank = groundHeightAt(18.0, 2.0 - 11.0);
  const centralSouthBank = groundHeightAt(18.0, 2.0 + 11.0);
  assert.ok(centralNorthBank > WATER_LEVEL, `Expected Central Bridge north end to rest on dry bank, got ${centralNorthBank}`);
  assert.ok(centralSouthBank > WATER_LEVEL, `Expected Central Bridge south end to rest on dry bank, got ${centralSouthBank}`);

  const topCentralBridge = walkableHeightAt(18.0, 2.0);
  assert.equal(topCentralBridge.surface, 'bridge', 'Expected walking on top of Central Bridge to return bridge surface');
  assert.ok(topCentralBridge.height > WATER_LEVEL + 1.2, `Expected Central Bridge deck > 1.2m, got ${topCentralBridge.height}`);

  const underCentralBridge = walkableHeightAt(18.0, 2.0, WATER_LEVEL - 0.95);
  assert.equal(underCentralBridge.surface, 'ground', 'Expected swimmer under Central Bridge to stay in water and not snap to bridge deck');
  assert.ok(underCentralBridge.height < WATER_LEVEL - 0.8, `Expected river floor under Central Bridge < -0.8m, got ${underCentralBridge.height}`);

  // 2) Northeastern River Timber Bridge at (78, -35) reaches dry land on both banks and allows swimming underneath
  const rbAngle = 0.54;
  const neBridgeSouthBank = groundHeightAt(78.0 + 11.2 * Math.sin(rbAngle), -35.0 + 11.2 * Math.cos(rbAngle));
  const neBridgeNorthBank = groundHeightAt(78.0 - 11.2 * Math.sin(rbAngle), -35.0 - 11.2 * Math.cos(rbAngle));
  assert.ok(neBridgeSouthBank > WATER_LEVEL, `Expected NE River Bridge SE end to rest on dry bank, got ${neBridgeSouthBank}`);
  assert.ok(neBridgeNorthBank > WATER_LEVEL, `Expected NE River Bridge NW end to rest on dry bank, got ${neBridgeNorthBank}`);

  const topNeBridge = walkableHeightAt(78.0, -35.0);
  assert.equal(topNeBridge.surface, 'pier', 'Expected walking on top of NE River Timber Bridge to return wooden pier surface');
  const underNeBridge = walkableHeightAt(78.0, -35.0, WATER_LEVEL - 0.95);
  assert.equal(underNeBridge.surface, 'ground', 'Expected swimmer under NE River Bridge to stay in water and not snap to bridge deck');

  // Verify a swimming player passing directly under the Central Bridge at (18, 2) stays in the water
  const bridgeSwimmer = createInitialPlayerState();
  bridgeSwimmer.x = 16.0;
  bridgeSwimmer.z = 2.0;
  bridgeSwimmer.y = WATER_LEVEL - 0.95;
  bridgeSwimmer.yaw = -Math.PI / 2; // swimming East (+X) under the bridge at x = 18
  for (let i = 0; i < 20; i++) {
    stepPlayerPhysics(
      bridgeSwimmer,
      { forward: 1, right: 0, sprint: true, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.05
    );
  }
  assert.ok(bridgeSwimmer.x > 19.0, `Expected swimmer to pass under the bridge from x=16 to x>19, got x=${bridgeSwimmer.x}`);
  assert.equal(bridgeSwimmer.isSwimming, true, 'Expected swimmer passing under bridge to remain swimming');
  assert.ok(bridgeSwimmer.y < WATER_LEVEL, `Expected swimmer passing under bridge not to pop onto bridge deck, got y=${bridgeSwimmer.y}`);

  // 3) 3D Underwater Diving: holding Ctrl/C (relaxed=true) or pitching down while swimming dives deep below the surface
  const diver = createInitialPlayerState();
  diver.x = -2.0;
  diver.z = 1.5;
  diver.y = WATER_LEVEL - 0.95;
  for (let i = 0; i < 25; i++) {
    stepPlayerPhysics(
      diver,
      { forward: 1, right: 0, sprint: false, relaxed: true, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.05
    );
  }
  assert.equal(diver.isSwimming, true);
  assert.ok(diver.y < WATER_LEVEL - 2.0, `Expected diving player holding Ctrl/C to dive deep (< -2.0m), got y=${diver.y}`);

  // Neutral depth hold while submerged
  const submergedY = diver.y;
  for (let i = 0; i < 10; i++) {
    stepPlayerPhysics(
      diver,
      { forward: 1, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.05
    );
  }
  assert.ok(Math.abs(diver.y - submergedY) < 0.25, `Expected submerged diver to hold depth when neutral, got ${diver.y} vs ${submergedY}`);

  // Ascending back to surface with Space (jumpHeld=true)
  for (let i = 0; i < 30; i++) {
    stepPlayerPhysics(
      diver,
      { forward: 0, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: true, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.05
    );
  }
  assert.ok(diver.y > WATER_LEVEL - 1.15, `Expected holding Space underwater to ascend back to surface, got y=${diver.y}`);
});
// #endregion

