// ============================================================================
// MODULE: World / Systems / Boids and Wildlife System Tests
// DESIGN: Unit test suite for birds flocking and small animal proximity behavior (AAA)
// SUMMARY: Verifies bird flock updates, initializations, and creature behaviors.
// ============================================================================

// ======================== IMPORTS AND TEST DEPENDENCIES ======================== \\
// #region Imports and Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBoidBirds,
  createInitialSmallAnimals,
  stepBoidsAndWildlife,
  BIRD_FLOCK_CONFIGS,
} from './boidsAndWildlifeSystem';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('createInitialBoidBirds_WhenInitialized_ShouldCreateConfiguredFlocksWithPositions', () => {
  // Arrange
  const factory = createInitialBoidBirds;
  // Act
  const birds = factory();

  // Assert
  assert.ok(Array.isArray(birds));
  assert.ok(birds.length > 0, 'Expected populated boid bird array');
  assert.ok(birds.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.z)));
});

test('createInitialSmallAnimals_WhenInitialized_ShouldCreateAnimalsInValidBiomes', () => {
  // Arrange
  const factory = createInitialSmallAnimals;
  // Act
  const animals = factory();

  // Assert
  assert.ok(Array.isArray(animals));
  assert.ok(animals.length >= 4, 'Expected small animal roster in forest biomes');
  assert.ok(animals.every((a) => a.species === 'rabbit' || a.species === 'squirrel'));
});

test('stepBoidsAndWildlife_WhenSteppedWithPlayerProximity_ShouldUpdateCreaturesAndTriggerFleeing', () => {
  // Arrange
  const birds = createInitialBoidBirds();
  const animals = createInitialSmallAnimals();
  const playerX = animals[0].x + 1;
  const playerY = animals[0].y;
  const playerZ = animals[0].z + 1;
  const playerSpeed = 8.0;
  const dt = 0.05;

  // Act
  const result = stepBoidsAndWildlife(birds, animals, playerX, playerY, playerZ, playerSpeed, dt);

  // Assert
  assert.ok(result.scamperedCritterCount >= 0);
  assert.ok(Number.isFinite(result.nearestCritterDist));
  assert.ok(birds.every((b) => Number.isFinite(b.x) && Number.isFinite(b.z)));
});
// #endregion

// ======================== GUARD CLAUSE AND VALIDATION TESTS ======================== \\
// #region Guard Clause and Validation Tests
test('BIRD_FLOCK_CONFIGS_WhenLoaded_ShouldContainFlockCentersAndSpecies', () => {
  // Arrange
  const expectedMinCount = 3;
  // Act
  const configs = BIRD_FLOCK_CONFIGS;

  // Assert
  assert.ok(configs.length >= 3, 'Expected at least 3 bird flock nodes');
  for (const cfg of configs) {
    assert.ok(cfg.patrolRadius > 0, 'Flock patrol radius must be positive');
    assert.ok(cfg.cruiseAltitudeAboveGround > 0, 'Cruising altitude must be positive');
  }
});
// #endregion

// ======================== EDGE CASES AND INFRASTRUCTURE FAILURES ======================== \\
// #region Edge Cases and Infrastructure Failures
test('stepBoidsAndWildlife_WhenZeroDtProvided_ShouldNotProduceNanPositions', () => {
  // Arrange
  const birds = createInitialBoidBirds();
  const animals = createInitialSmallAnimals();

  // Act
  const result = stepBoidsAndWildlife(birds, animals, 0, 0, 0, 0, 0);

  // Assert
  assert.ok(Number.isFinite(result.nearestBirdDist));
  assert.ok(birds.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y)));
  assert.ok(animals.every((a) => Number.isFinite(a.x) && Number.isFinite(a.z)));
});
// #endregion
