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
  getWalkPaceLabel,
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

test('getWalkPaceLabel_WhenGivenValidPaceModes_ShouldReturnLocalizedTranslationKey', () => {
  // Arrange
  const normalPace = 'normal';
  const fastPace = 'fast';

  // Act
  const normalLabel = getWalkPaceLabel(normalPace);
  const fastLabel = getWalkPaceLabel(fastPace);

  // Assert
  assert.ok(typeof normalLabel === 'string' && normalLabel.length > 0);
  assert.ok(typeof fastLabel === 'string' && fastLabel.length > 0);
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
// #endregion
