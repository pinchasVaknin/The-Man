// ============================================================================
// MODULE: World / Systems / Footprint Trail System Tests
// DESIGN: Unit test suite for decal buffer management and lifespan fading (AAA)
// SUMMARY: Verifies footprint lifecycle, buffer boundary clamping, and imprintable surface detection.
// ============================================================================

// ======================== IMPORTS AND TEST DEPENDENCIES ======================== \\
// #region Imports and Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFootprintTrailTracker,
  isImprintableBiomeSurface,
  stepFootprintTrailSystem,
  MAX_FOOTPRINT_DECALS,
} from './footprintTrailSystem';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('createFootprintTrailTracker_WhenInitialized_ShouldContainPreallocatedInactiveBuffer', () => {
  // Arrange
  const factory = createFootprintTrailTracker;
  // Act
  const tracker = factory();

  // Assert
  assert.equal(tracker.decals.length, MAX_FOOTPRINT_DECALS);
  assert.ok(tracker.decals.every((d) => d.active === false), 'All decals must be initially inactive');
});

test('isImprintableBiomeSurface_WhenTestedOnSandSnowAndDirt_ShouldReturnTrue', () => {
  // Arrange
  const desertBiome = 'desert';
  const meadowBiome = 'meadow';
  // Act
  const isDesertImprintable = isImprintableBiomeSurface(desertBiome, false);
  const isMeadowImprintable = isImprintableBiomeSurface(meadowBiome, false);

  // Assert
  assert.equal(isDesertImprintable, true, 'Desert sand must support footprint impressions');
  assert.equal(isMeadowImprintable, true, 'Meadow soil must support footprint impressions');
});
// #endregion

// ======================== GUARD CLAUSE AND VALIDATION TESTS ======================== \\
// #region Guard Clause and Validation Tests
test('isImprintableBiomeSurface_WhenTestedOnWaterOrPier_ShouldReturnFalse', () => {
  // Arrange
  const waterBiome = 'water';
  const pierBiome = 'pier';
  // Act
  const isWaterImprintable = isImprintableBiomeSurface(waterBiome, false);
  const isPierImprintable = isImprintableBiomeSurface(pierBiome, false);

  // Assert
  assert.equal(isWaterImprintable, false, 'Water surface cannot hold footprints');
  assert.equal(isPierImprintable, false, 'Hard wooden pier surface cannot hold footprints');
});
// #endregion

// ======================== EDGE CASES AND INFRASTRUCTURE FAILURES ======================== \\
// #region Edge Cases and Infrastructure Failures
test('stepFootprintTrailSystem_WhenAgingExceedsMaxLifetime_ShouldEvictExpiredDecals', () => {
  // Arrange
  const tracker = createFootprintTrailTracker();
  // Mark one decal active
  tracker.decals[0].active = true;
  tracker.decals[0].age = 25.0; // Exceeds default 20s maxAge

  // Act
  const result = stepFootprintTrailSystem(
    tracker,
    10, 1, 10, 0,
    false, false, false, false,
    1.0
  );

  // Assert
  assert.equal(tracker.decals[0].active, false, 'Expired decal should be deactivated');
  assert.ok(result.activeCount >= 0);
});
// #endregion
