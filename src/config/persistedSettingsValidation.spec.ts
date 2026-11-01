// ============================================================================
// MODULE: Config / Persisted Settings Validation Tests
// DESIGN: AAA unit tests for the allowlist validators guarding persisted settings
// SUMMARY: Verifies that game settings and lab pose overrides coming from the dev
//          server body or localStorage are accepted only when every field is valid.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGameSettings, validateLabOverrides } from './persistedSettingsValidation';
import { SAVED_GAME_SETTINGS } from './savedGameSettings';
import { DEFAULT_LAB_POSE_OVERRIDES } from '../lab/labCatalog';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('validateGameSettings_WhenPayloadIsValid_ShouldReturnOkWithSameValues', () => {
  // Arrange
  const payload = JSON.parse(JSON.stringify(SAVED_GAME_SETTINGS));

  // Act
  const result = validateGameSettings(payload);

  // Assert
  assert.deepEqual(result.value, SAVED_GAME_SETTINGS);
});

test('validateGameSettings_WhenPayloadHasUnknownFields_ShouldDropThem', () => {
  // Arrange
  const payload = { ...JSON.parse(JSON.stringify(SAVED_GAME_SETTINGS)), isAdmin: true };

  // Act
  const result = validateGameSettings(payload);

  // Assert
  assert.equal(Object.hasOwn(result.value, 'isAdmin'), false);
});

test('validateLabOverrides_WhenPayloadIsValid_ShouldReturnOkWithSameValues', () => {
  // Arrange
  const payload = { ranger_third_person: { ...DEFAULT_LAB_POSE_OVERRIDES, weaponRotYDeg: 45 } };

  // Act
  const result = validateLabOverrides(payload);

  // Assert
  assert.deepEqual(result.value, payload);
});
// #endregion

// ======================== GUARD CLAUSE & VALIDATION TESTS ======================== \\
// #region Guard Clause & Validation Tests
test('validateGameSettings_WhenSensitivityIsOutOfRange_ShouldFailWithInvalidGameSettings', () => {
  // Arrange
  const payload = { ...JSON.parse(JSON.stringify(SAVED_GAME_SETTINGS)), mouseSensitivity: 99 };

  // Act
  const result = validateGameSettings(payload);

  // Assert
  assert.equal(result.error, 'INVALID_GAME_SETTINGS');
});

test('validateGameSettings_WhenKeybindingIsNotAKeyCode_ShouldFailWithInvalidGameSettings', () => {
  // Arrange
  const base = JSON.parse(JSON.stringify(SAVED_GAME_SETTINGS));
  const payload = { ...base, keybindings: { ...base.keybindings, jump: '<script>' } };

  // Act
  const result = validateGameSettings(payload);

  // Assert
  assert.equal(result.error, 'INVALID_GAME_SETTINGS');
});

test('validateGameSettings_WhenPayloadIsNotAnObject_ShouldFailWithInvalidGameSettings', () => {
  // Act
  const result = validateGameSettings('settings');

  // Assert
  assert.equal(result.error, 'INVALID_GAME_SETTINGS');
});

test('validateLabOverrides_WhenAngleIsNotANumber_ShouldFailWithInvalidLabOverrides', () => {
  // Arrange
  const payload = { ranger_third_person: { ...DEFAULT_LAB_POSE_OVERRIDES, headRotXDeg: '10' } };

  // Act
  const result = validateLabOverrides(payload);

  // Assert
  assert.equal(result.error, 'INVALID_LAB_OVERRIDES');
});

test('validateLabOverrides_WhenEntityIdIsMalformed_ShouldFailWithInvalidLabOverrides', () => {
  // Arrange
  const payload = { '../../etc': { ...DEFAULT_LAB_POSE_OVERRIDES } };

  // Act
  const result = validateLabOverrides(payload);

  // Assert
  assert.equal(result.error, 'INVALID_LAB_OVERRIDES');
});

test('validateLabOverrides_WhenAnimationSpeedIsNegative_ShouldFailWithInvalidLabOverrides', () => {
  // Arrange
  const payload = { forest_wolf: { ...DEFAULT_LAB_POSE_OVERRIDES, perAnimationSpeeds: { walk: -1 } } };

  // Act
  const result = validateLabOverrides(payload);

  // Assert
  assert.equal(result.error, 'INVALID_LAB_OVERRIDES');
});
// #endregion
