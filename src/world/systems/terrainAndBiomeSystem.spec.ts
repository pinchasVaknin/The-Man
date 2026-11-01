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
} from './terrainAndBiomeSystem';
import { WORLD_SPAWN } from '../domain/landmarksRegistry';
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
    gorgeFootpath.height > 1.0 && gorgeFootpath.height < 3.5,
    `Expected accessible narrow riverside pass at (99.5, 600), got ${gorgeFootpath.height}`
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
// #endregion
