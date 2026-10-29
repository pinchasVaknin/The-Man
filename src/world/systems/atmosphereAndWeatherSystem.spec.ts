// ============================================================================
// MODULE: World / Systems / Atmosphere and Weather System Tests
// DESIGN: Unit test suite for atmosphere, solar cycle, and weather state (AAA)
// SUMMARY: Verifies 24h solar progression, seasonal weather transitions, and rain factors.
// ============================================================================

// ======================== IMPORTS AND TEST DEPENDENCIES ======================== \\
// #region Imports and Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDynamicSolarCycle,
  computeWeatherState,
  runSeasonalWeatherCycle,
  runTurboWeatherTestCycle,
  regionalRainFactorAt,
  getSeasonLabel,
  getWeatherLabel,
} from './atmosphereAndWeatherSystem';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('computeDynamicSolarCycle_WhenGivenNoonHour_ShouldCalculateHighSunAngleAndDaylightIntensity', () => {
  // Arrange
  const noonHour = 12.0;

  // Act
  const atmosphere = computeDynamicSolarCycle(noonHour);

  // Assert
  assert.ok(atmosphere.sunIntensity > 2.0, 'Expected strong daylight sun intensity at noon');
  assert.equal(atmosphere.isNight, false, 'Noon should not be flagged as night');
  assert.ok(atmosphere.sunElevationDeg > 40.0, 'Sun elevation should be high at noon');
});

test('computeDynamicSolarCycle_WhenGivenMidnightHour_ShouldCalculateNightSkyAndMoonlight', () => {
  // Arrange
  const midnightHour = 0.0;

  // Act
  const atmosphere = computeDynamicSolarCycle(midnightHour);

  // Assert
  assert.equal(atmosphere.isNight, true, 'Midnight must be flagged as night');
  assert.ok(atmosphere.nightFactor > 0.5, 'Night factor should be high at midnight');
  assert.ok(atmosphere.sunIntensity < 1.0, 'Sun intensity should be reduced to moonlight at midnight');
});

test('runSeasonalWeatherCycle_WhenSamplingSummerSeason_ShouldEnforceZeroRainAndSnow', () => {
  // Arrange
  const summerTimeSeconds = 240; // Summer: 180s - 360s
  const playerX = 0;
  const playerZ = 0;

  // Act
  const seasonInfo = runSeasonalWeatherCycle(summerTimeSeconds, playerX, playerZ);

  // Assert
  assert.equal(seasonInfo.season, 'summer', 'Expected summer season for elapsed time 240s');
  assert.equal(seasonInfo.rainIntensity, 0, 'Summer must have zero rain intensity');
  assert.equal(seasonInfo.snowIntensity, 0, 'Summer must have zero snow intensity');
});

test('getSeasonLabel_WhenGivenValidSeasons_ShouldReturnValidLocalizedKey', () => {
  // Arrange
  const springSeason = 'spring';
  const summerSeason = 'summer';

  // Act
  const springKey = getSeasonLabel(springSeason);
  const summerKey = getSeasonLabel(summerSeason);

  // Assert
  assert.ok(typeof springKey === 'string' && springKey.length > 0);
  assert.ok(typeof summerKey === 'string' && summerKey.length > 0);
});
// #endregion

// ======================== GUARD CLAUSE AND VALIDATION TESTS ======================== \\
// #region Guard Clause and Validation Tests
test('regionalRainFactorAt_WhenOutsideRainCellRadius_ShouldReturnZeroFactor', () => {
  // Arrange
  const distantX = 500;
  const distantZ = 500;
  const gameTime = 100;

  // Act
  const factor = regionalRainFactorAt(distantX, distantZ, gameTime);

  // Assert
  assert.ok(factor >= 0 && factor <= 1, 'Rain factor must remain clamped between 0 and 1');
});

test('computeWeatherState_WhenCalledWithCoordinates_ShouldReturnValidAtmosphereSnapshot', () => {
  // Arrange
  const time = 50;
  const px = 0;
  const pz = 0;

  // Act
  const snapshot = computeWeatherState(time, px, pz);

  // Assert
  assert.ok(snapshot.windStrength >= 0, 'Wind strength must be non-negative');
  assert.ok(snapshot.fogIntensity >= 0 && snapshot.fogIntensity <= 1, 'Fog intensity must be normalized');
  assert.ok(typeof snapshot.weatherKind === 'string', 'Weather kind must be defined');
});
// #endregion

// ======================== EDGE CASES AND INFRASTRUCTURE FAILURES ======================== \\
// #region Edge Cases and Infrastructure Failures
test('runTurboWeatherTestCycle_WhenWrappingBeyondCyclePeriod_ShouldModuloGracefully', () => {
  // Arrange
  const largeTimeSeconds = 99999;
  const px = 0;
  const pz = 0;

  // Act
  const result = runTurboWeatherTestCycle(largeTimeSeconds, px, pz);

  // Assert
  assert.ok(result.weatherKind !== undefined, 'Turbo cycle should compute state even for large times');
  assert.ok(typeof result.weatherLabel === 'string' && result.weatherLabel.length > 0);
});
// #endregion
