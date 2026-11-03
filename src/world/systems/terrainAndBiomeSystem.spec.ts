// ============================================================================
// MODULE: World / Systems / Terrain and Biome System Tests
// DESIGN: Unit test suite for elevation math, biome detection, and obstacles (AAA)
// SUMMARY: Verifies ground heights, walkable heights, roof collisions, and obstacle generation.
// ============================================================================

// ======================== IMPORTS AND TEST DEPENDENCIES ======================== \\
// #region Imports and Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groundHeightAt,
  walkableHeightAt,
  isPositionUnderRoof,
  getSurfaceBiomeAt,
  getBiomeLabel,
  generateWorldObstacles,
  easternCoastlineXAt,
  northernTundraFactorAt,
  southwestOasisBiomeFactorAt,
  volcanicBadlandsFactorAt,
  trailFactorAt,
  isNavigableOceanForShip,
} from './terrainAndBiomeSystem';
import {
  WORLD_SPAWN,
  WATER_LEVEL,
  SOUTHERN_DRAGON_RUINS_POS,
  DESERT_DRAGON_PASS_POS,
  RUINED_ATLANTIS_POS,
  SAILABLE_SHIP_INITIAL_POS,
} from '../domain/landmarksRegistry';
import {
  getActiveSailableShip,
  resetSailableShipState,
  sailableShipDeckHeightAt,
  stepSailableShipPhysics,
  findSailableShipDisembarkPoint,
  isEntityOnSailableShipDeck,
  stationMountInSailableShipStall,
  type IShipPassengerEntity,
} from './sailableShipSystem';
import type { IRideableHorseState } from '../domain/worldTypes';
import { createInitialPlayerState } from './playerPhysicsSystem';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('groundHeightAt_WhenEvaluatedAtWorldSpawn_ShouldReturnSafeDryElevation', () => {
  // Arrange
  const spawnX = WORLD_SPAWN.x;
  const spawnZ = WORLD_SPAWN.z;

  // Act
  const elevation = groundHeightAt(spawnX, spawnZ);

  // Assert
  assert.ok(typeof elevation === 'number' && Number.isFinite(elevation));
  assert.ok(elevation > 0, 'Spawn point should sit safely above water baseline');
});

test('getSurfaceBiomeAt_WhenSampledAtNorthernHighAltitude_ShouldDetectHighlandOrRock', () => {
  // Arrange
  const northX = -65;
  const northZ = -172;

  // Act
  const biome = getSurfaceBiomeAt(northX, northZ);

  // Assert
  assert.ok(biome === 'rock' || biome === 'highland', `Expected rock/highland, got ${biome}`);
});

test('generateWorldObstacles_WhenInvoked_ShouldGenerateTreesBouldersAndFences', () => {
  // Arrange
  const generator = generateWorldObstacles;
  // Act
  const obstacles = generator();

  // Assert
  assert.ok(Array.isArray(obstacles));
  assert.ok(obstacles.length > 50, 'Expected extensive obstacle collection across world');
  const hasTrees = obstacles.some((o) => o.kind === 'pine' || o.kind === 'oak' || o.kind === 'birch');
  assert.equal(hasTrees, true, 'World obstacles must include forest trees');
});
// #endregion

// ======================== GUARD CLAUSE AND VALIDATION TESTS ======================== \\
// #region Guard Clause and Validation Tests
test('getBiomeLabel_WhenGivenValidBiomeKind_ShouldReturnLocalizedTranslationKey', () => {
  // Arrange
  const meadowBiome = 'meadow';
  const desertBiome = 'desert';

  // Act
  const meadowLabel = getBiomeLabel(meadowBiome);
  const desertLabel = getBiomeLabel(desertBiome);

  // Assert
  assert.ok(typeof meadowLabel === 'string' && meadowLabel.length > 0);
  assert.ok(typeof desertLabel === 'string' && desertLabel.length > 0);
});

test('isPositionUnderRoof_WhenEvaluatedFarInOpenField_ShouldReturnFalse', () => {
  // Arrange
  const fieldX = 150;
  const fieldY = 5;
  const fieldZ = 150;

  // Act
  const underRoof = isPositionUnderRoof(fieldX, fieldY, fieldZ);

  // Assert
  assert.equal(underRoof, false, 'Open field coordinate must not be classified under roof');
});
// #endregion

// ======================== EDGE CASES AND INFRASTRUCTURE FAILURES ======================== \\
// #region Edge Cases and Infrastructure Failures
test('walkableHeightAt_WhenQueriedAtExtremeBoundaryCoordinates_ShouldReturnFiniteNumber', () => {
  // Arrange
  const extremeX = 650;
  const extremeZ = -650;

  // Act
  const surfaceInfo = walkableHeightAt(extremeX, extremeZ);

  // Assert
  assert.ok(Number.isFinite(surfaceInfo.height), 'Extreme map coordinates must evaluate to finite walkable height');
  assert.ok(typeof surfaceInfo.surface === 'string');
});

test('southernRiverAndCarvedBearCaves_WhenEvaluated_ShouldProvideWalkableBridgeLagoonWaterAndCarvedCaveChamber', () => {
  // 1. Grand Southern River Bridge at (178, 378)
  const bridgeMid = walkableHeightAt(178, 378);
  assert.equal(bridgeMid.surface, 'bridge');
  assert.ok(bridgeMid.height > 4.5, `Expected arched bridge crown > 4.5m, got ${bridgeMid.height}`);

  // 2. Riverbed beneath the bridge is submerged below WATER_LEVEL (0)
  const riverUnderBridge = groundHeightAt(178, 378);
  assert.ok(riverUnderBridge < -1.0, `Expected carved river channel under bridge, got ${riverUnderBridge}`);

  // 3. Extended Southern River flows south through the Mountain Gorge Pass (118, 600) and out to the Sea (258, 785)
  const gorgeRiverChannel = groundHeightAt(118, 600);
  assert.ok(gorgeRiverChannel < -1.0, `Expected deep river channel in Mountain Gorge Pass, got ${gorgeRiverChannel}`);
  const gorgeFootpath = walkableHeightAt(99.5, 600);
  assert.ok(
    gorgeFootpath.height > 1.0 && gorgeFootpath.height < 14.0,
    `Expected accessible cliffside riverside pass at (99.5, 600), got ${gorgeFootpath.height}`
  );
  const valleyBeyondMountains = walkableHeightAt(105, 715);
  assert.ok(
    Math.abs(valleyBeyondMountains.height - 2.15) < 0.35,
    `Expected post-mountain valley glade at (105, 715) ~2.15m, got ${valleyBeyondMountains.height}`
  );

  // 4. Ground-level Mountain Bear Cave at (-85, -66 entrance / -85, -76 chamber) has ground-level walkable floor (2.2m) and overhead mountain roof
  const caveEntranceFloor = groundHeightAt(-85, -66);
  assert.ok(Math.abs(caveEntranceFloor - 2.2) < 0.35, `Expected ground-level cave entrance floor ~2.2m, got ${caveEntranceFloor}`);
  const caveChamberWalkable = walkableHeightAt(-85, -76);
  assert.ok(Math.abs(caveChamberWalkable.height - 2.2) < 0.1, `Expected flat cave chamber floor 2.2m, got ${caveChamberWalkable.height}`);
  assert.equal(isPositionUnderRoof(-85, 2.2, -76), true, 'Inside carved mountain cave must be under roof');
});

test('easternCoastlineAndSea_WhenEvaluatedNorthToSouth_ShouldProvideContinuousOceanAndOrganicShoreline', () => {
  for (const sampleZ of [-650, -320, -40, 120, 282, 520, 780]) {
    const coastX = easternCoastlineXAt(sampleZ);
    assert.ok(coastX >= 220 && coastX <= 315, `Expected natural eastern coastline X in 220..315 at z=${sampleZ}, got ${coastX}`);
    const deepSeaH = groundHeightAt(coastX + 85, sampleZ);
    assert.ok(
      deepSeaH < WATER_LEVEL - 4.0,
      `Expected continuous deep Eastern Sea at (${coastX + 85}, ${sampleZ}), got ${deepSeaH}`
    );
  }
});

test('multiStageBiomeEcotones_WhenSampledAcrossTransitionBelts_ShouldRampGraduallyWithoutZeroToHundredJump', () => {
  // 1. Southwest Savanna -> Terracotta -> Desert transition
  const savannaEdge = southwestOasisBiomeFactorAt(-168, 198);
  const deepDesert = southwestOasisBiomeFactorAt(-310, 300);
  assert.ok(savannaEdge > 0.04 && savannaEdge < 0.75, `Expected gradual Savanna/Terracotta ecotone in 0.04..0.75, got ${savannaEdge}`);
  assert.ok(deepDesert > 0.95, `Expected deep desert at Oasis (-310, 300), got ${deepDesert}`);

  // 2. Western Basalt Foothills -> Volcanic Ashlands transition
  const basaltFoothills = volcanicBadlandsFactorAt(-360, 115);
  const innerAshlands = volcanicBadlandsFactorAt(-495, 115);
  assert.ok(basaltFoothills > 0.05 && basaltFoothills < 0.55, `Expected Basalt Foothills ecotone in 0.05..0.55, got ${basaltFoothills}`);
  assert.ok(innerAshlands > 0.75, `Expected inner Scorched Ashlands > 0.75, got ${innerAshlands}`);

  // 3. Northern Taiga -> Frost Tundra ecotone
  const midTundra = northernTundraFactorAt(-35, -105);
  assert.ok(midTundra > 0.1 && midTundra < 0.95, `Expected gradual Northern Tundra ecotone in 0.1..0.95, got ${midTundra}`);
});

test('desertEndDragonRuinsAndNarrowMountainPass_WhenEvaluated_ShouldHaveHighMountainBarrierAndWalkableGorgePass', () => {
  // 1. Dragon Ruins relocated to far Southwest Desert (-540, 540) on flat 2.15m terrace
  assert.equal(SOUTHERN_DRAGON_RUINS_POS.x, -540.0);
  assert.equal(SOUTHERN_DRAGON_RUINS_POS.z, 540.0);
  const ruinsFloor = walkableHeightAt(SOUTHERN_DRAGON_RUINS_POS.x, SOUTHERN_DRAGON_RUINS_POS.z);
  assert.ok(
    Math.abs(ruinsFloor.height - 2.15) < 0.15,
    `Expected leveled Dragon Ruins courtyard at 2.15m, got ${ruinsFloor.height}`
  );

  // 2. Narrow Canyon Pass at (-455, 455) is flat & walkable with a connected trail
  const passFloor = walkableHeightAt(DESERT_DRAGON_PASS_POS.gorgeX, DESERT_DRAGON_PASS_POS.gorgeZ);
  assert.ok(
    passFloor.height >= 1.9 && passFloor.height <= 2.8,
    `Expected walkable narrow mountain pass floor at (-455, 455), got ${passFloor.height}`
  );
  const passTrail = trailFactorAt(DESERT_DRAGON_PASS_POS.gorgeX, DESERT_DRAGON_PASS_POS.gorgeZ);
  assert.ok(passTrail > 0.85, `Expected trail through narrow desert mountain pass, got ${passTrail}`);

  // 3. High mountain barrier flanks both sides of the narrow pass before the Dragon Ruins
  const northWestFlankPeak = groundHeightAt(-490, 425);
  const southEastFlankPeak = groundHeightAt(-425, 490);
  assert.ok(
    northWestFlankPeak > 36.0,
    `Expected towering mountain barrier (>36m) NW of narrow pass, got ${northWestFlankPeak}`
  );
  assert.ok(
    southEastFlankPeak > 36.0,
    `Expected towering mountain barrier (>36m) SE of narrow pass, got ${southEastFlankPeak}`
  );
});

test('ruinedAtlantisAndSailableShip_WhenEvaluatedAndSailed_ShouldProvideFlatBossArenaWalkableShipDeckAndCarryAnimalsAboard', () => {
  resetSailableShipState();

  // 1. Ruined Atlantis is located far out in the Deep Eastern Ocean at (980, 420) (>700m from Harbor Pier)
  const distFromHarbor = Math.hypot(
    RUINED_ATLANTIS_POS.x - SAILABLE_SHIP_INITIAL_POS.homeX,
    RUINED_ATLANTIS_POS.z - SAILABLE_SHIP_INITIAL_POS.homeZ
  );
  assert.ok(distFromHarbor > 700, `Expected Ruined Atlantis >700m out at sea, got ${distFromHarbor}`);
  const arenaWalkable = walkableHeightAt(RUINED_ATLANTIS_POS.x, RUINED_ATLANTIS_POS.z);
  assert.equal(arenaWalkable.surface, 'bridge');
  assert.equal(arenaWalkable.height, RUINED_ATLANTIS_POS.arenaFloorY);

  // 2. Ruined Atlantis Western Ship Mooring Dock at (dockX + 6, dockZ) is walkable at y = 2.15m
  const dockWalkable = walkableHeightAt(RUINED_ATLANTIS_POS.dockX + 6.0, RUINED_ATLANTIS_POS.dockZ);
  assert.equal(dockWalkable.surface, 'bridge');
  assert.equal(dockWalkable.height, RUINED_ATLANTIS_POS.arenaFloorY);

  // 3. Sailable Ship deck at its initial harbor mooring (278, 282) is walkable at y = 2.85m
  const shipDeckH = sailableShipDeckHeightAt(
    SAILABLE_SHIP_INITIAL_POS.homeX,
    SAILABLE_SHIP_INITIAL_POS.homeZ
  );
  assert.equal(shipDeckH, SAILABLE_SHIP_INITIAL_POS.deckY);
  const shipWalkable = walkableHeightAt(
    SAILABLE_SHIP_INITIAL_POS.homeX,
    SAILABLE_SHIP_INITIAL_POS.homeZ
  );
  assert.equal(shipWalkable.surface, 'pier');
  assert.equal(shipWalkable.height, SAILABLE_SHIP_INITIAL_POS.deckY);

  // 4. Stationing a horse and a tamed animal on the ship deck and sailing carries both passengers along with the ship
  const player = createInitialPlayerState();
  player.mountedHorseId = SAILABLE_SHIP_INITIAL_POS.id;
  const ship = getActiveSailableShip();
  const startX = ship.x;
  const startYaw = ship.yaw;

  const onboardHorse: IRideableHorseState = {
    id: 'horse-harbor-test',
    name: 'Test Warhorse',
    x: ship.x,
    y: ship.deckY,
    z: ship.z,
    yaw: ship.yaw,
    speed: 0,
    gaitPhase: 0,
  };
  stationMountInSailableShipStall(onboardHorse, 0, ship);

  const onboardAnimal: IShipPassengerEntity = {
    x: ship.x,
    y: ship.deckY,
    z: ship.z,
    yaw: ship.yaw,
    vx: 0,
    vz: 0,
    homeX: ship.x,
    homeZ: ship.z,
    inWater: false,
    isMountedByPlayer: false,
  };
  stationMountInSailableShipStall(onboardAnimal, 1, ship);

  assert.equal(isEntityOnSailableShipDeck(onboardHorse.x, onboardHorse.z, onboardHorse.y, ship), true);
  assert.equal(isEntityOnSailableShipDeck(onboardAnimal.x, onboardAnimal.z, onboardAnimal.y, ship), true);

  for (let i = 0; i < 35; i++) {
    stepSailableShipPhysics(
      player,
      {
        forward: 1,
        right: 0.25,
        sprint: true,
        jump: false,
        attack: false,
        interact: false,
        mountHorse: false,
        crouch: false,
        relaxedWalk: false,
        whistle: false,
        eatQuickHeal: false,
        deltaYaw: 0,
        deltaPitch: 0,
        cameraDistanceDelta: 0,
      },
      0.05,
      isNavigableOceanForShip,
      ship,
      [onboardHorse],
      [onboardAnimal]
    );
  }

  assert.ok(ship.x > startX + 10.0, `Expected ship to sail eastward into ocean, x=${ship.x}`);
  assert.ok(ship.yaw !== startYaw, 'Expected rudder input to turn ship yaw');
  assert.equal(
    isEntityOnSailableShipDeck(onboardHorse.x, onboardHorse.z, onboardHorse.y, ship),
    true,
    'Onboard horse must travel with the ship and stay on the ship deck'
  );
  assert.equal(
    isEntityOnSailableShipDeck(onboardAnimal.x, onboardAnimal.z, onboardAnimal.y, ship),
    true,
    'Onboard animal must travel with the ship and stay on the ship deck'
  );
  assert.ok(
    onboardHorse.x > startX + 8.0 && onboardAnimal.x > startX + 8.0,
    'Both onboard horse and onboard animal must move across the ocean with the ship'
  );

  // 5. Docking near Ruined Atlantis Western Dock disembarks onto the Atlantis stone dock
  ship.x = RUINED_ATLANTIS_POS.dockX - 6.0;
  ship.z = RUINED_ATLANTIS_POS.dockZ;
  const disembark = findSailableShipDisembarkPoint(ship);
  assert.equal(disembark.x, RUINED_ATLANTIS_POS.dockX + 3.0);
  assert.equal(disembark.z, RUINED_ATLANTIS_POS.dockZ);
  assert.equal(disembark.y, RUINED_ATLANTIS_POS.arenaFloorY);

  resetSailableShipState();
});
// #endregion


