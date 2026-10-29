// ============================================================================
// MODULE: Test / Core Config Specification
// DESIGN: Unit verification for configuration constants and URL overrides parsing (AAA)
// SUMMARY: Validates bounds clamping, coordinate validation, hour clamping, and URL parameters.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYABLE_RADIUS,
  MIN_WORLD_HOUR,
  MAX_WORLD_HOUR,
  clamp,
  validateCoordinate,
  validateWorldHour,
  parseAndValidateUrlOverrides,
} from './config';

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('clamp_WhenValueWithinRange_ShouldReturnSameValue', () => {
  // Arrange
  const input = 5;
  // Act
  const result = clamp(input, 0, 10);
  const res = clamp(15, 0, 100);

  // Assert
  assert.equal(res, 15);
});

test('validateCoordinate_WhenWithinPlayableRadius_ShouldPreserveCoordinate', () => {
  // Arrange
  const coord = 200;
  // Act
  const result = validateCoordinate(coord);
  const res = validateCoordinate(350);

  // Assert
  assert.equal(res, 350);
});

test('validateWorldHour_WhenValidHourInRange_ShouldPreserveHour', () => {
  // Arrange
  const hour = 14.5;
  // Act
  const result = validateWorldHour(hour);
  const res = validateWorldHour(14.5);

  // Assert
  assert.equal(res, 14.5);
});

test('parseAndValidateUrlOverrides_WhenValidQueryParametersProvided_ShouldParseAllFields', () => {
  // Arrange
  const search = '?pos=120,-85,1.57,22.5,-0.12&perspective=third_person&weather=rain&season=autumn&weatherMode=seasonal&hour=16.5';

  // Act
  const result = parseAndValidateUrlOverrides(search);

  // Assert
  assert.ok(result.position);
  assert.equal(result.position?.x, 120);
  assert.equal(result.position?.z, -85);
  assert.equal(result.position?.yaw, 1.57);
  assert.equal(result.position?.y, 22.5);
  assert.equal(result.position?.pitch, -0.12);
  assert.equal(result.cameraPerspective, 'third_person');
  assert.equal(result.forcedWeatherKind, 'regional_rain');
  assert.equal(result.seasonTimeOffset, 360 + 20);
  assert.equal(result.weatherMode, 'seasonal');
  assert.equal(result.worldHour, 16.5);
});
// #endregion

// ======================== GUARD CLAUSE & CLAMP TESTS ======================== \\
// #region Guard Clause & Clamp Tests
test('clamp_WhenValueExceedsBounds_ShouldClampToMinMax', () => {
  // Arrange
  const belowMin = -10;
  const aboveMax = 20;
  // Act
  const clampedBelow = clamp(belowMin, 0, 10);
  const clampedAbove = clamp(aboveMax, 0, 10);
  // Assert
  assert.equal(clampedBelow, 0);
  assert.equal(clampedAbove, 10);
  assert.equal(clamp(-50, 0, 100), 0);
  assert.equal(clamp(150, 0, 100), 100);
  assert.equal(clamp(NaN, 0, 100), 0);
  assert.equal(clamp(Infinity, 0, 100), 0);
});

test('validateCoordinate_WhenExceedsRadius_ShouldClampToPlayableRadius', () => {
  // Arrange
  const farEast = 9999;
  const farWest = -9999;
  // Act
  const clampedEast = validateCoordinate(farEast);
  const clampedWest = validateCoordinate(farWest);
  // Assert
  assert.equal(clampedEast, PLAYABLE_RADIUS);
  assert.equal(clampedWest, -PLAYABLE_RADIUS);
  assert.equal(validateCoordinate(2000), PLAYABLE_RADIUS);
  assert.equal(validateCoordinate(-2000), -PLAYABLE_RADIUS);
  assert.equal(validateCoordinate(NaN), 0);
});

test('validateWorldHour_WhenExceedsRangeOrNan_ShouldClampOrFallback', () => {
  // Arrange
  const hourOver = 30;
  const hourUnder = -5;
  const hourNan = NaN;
  // Act
  const clampedOver = validateWorldHour(hourOver);
  const clampedUnder = validateWorldHour(hourUnder);
  const clampedNan = validateWorldHour(hourNan);
  // Assert
  assert.equal(clampedOver, MAX_WORLD_HOUR);
  assert.equal(clampedUnder, MIN_WORLD_HOUR);
  assert.equal(clampedNan, 12);
  assert.equal(validateWorldHour(35), 24.0);
  assert.equal(validateWorldHour(-5), 0.0);
  assert.equal(validateWorldHour(NaN), 12.0);
});

test('parseAndValidateUrlOverrides_WhenUnknownWeatherOrPerspective_ShouldIgnoreInvalidValues', () => {
  // Arrange
  const search = '?weather=apocalypse&perspective=drone_view&hour=99';

  // Act
  const result = parseAndValidateUrlOverrides(search);

  // Assert
  assert.equal(result.forcedWeatherKind, undefined);
  assert.equal(result.cameraPerspective, undefined);
  assert.equal(result.worldHour, 24.0);
});

test('parseAndValidateUrlOverrides_WhenEmptyQuery_ShouldReturnEmptyOverrides', () => {
  // Arrange
  const emptyQuery = '';
  // Act
  const result = parseAndValidateUrlOverrides(emptyQuery);
  

  // Assert
  assert.deepEqual(result, {});
});
// #endregion
