// ============================================================================
// MODULE: Lab / Overrides Storage Tests
// DESIGN: AAA unit tests for parsing, merging and validating stored lab overrides
// SUMMARY: Verifies that stored pose overrides are merged over code defaults and
//          rejected when malformed, so the lab and the world never load bad values.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeStoredLabOverrides } from './labOverridesStorage';
import { DEFAULT_LAB_POSE_OVERRIDES } from './labCatalog';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('mergeStoredLabOverrides_WhenNothingIsStored_ShouldReturnCodeOverrides', () => {
  // Arrange
  const codeOverrides = { forest_wolf: { ...DEFAULT_LAB_POSE_OVERRIDES, headRotYDeg: 10 } };

  // Act
  const result = mergeStoredLabOverrides(null, codeOverrides);

  // Assert
  assert.deepEqual(result.value, codeOverrides);
});

test('mergeStoredLabOverrides_WhenPartialEntryIsStored_ShouldFillMissingFieldsFromDefaults', () => {
  // Arrange
  const stored = JSON.stringify({ forest_wolf: { weaponScale: 1.5 } });

  // Act
  const result = mergeStoredLabOverrides(stored, {});

  // Assert
  assert.deepEqual(result.value, {
    forest_wolf: { ...DEFAULT_LAB_POSE_OVERRIDES, weaponScale: 1.5, perAnimationSpeeds: {} },
  });
});
// #endregion

// ======================== GUARD CLAUSE & VALIDATION TESTS ======================== \\
// #region Guard Clause & Validation Tests
test('mergeStoredLabOverrides_WhenStoredValueIsNotJson_ShouldFailWithMalformedJson', () => {
  // Act
  const result = mergeStoredLabOverrides('{oops', {});

  // Assert
  assert.equal(result.error, 'MALFORMED_JSON');
});

test('mergeStoredLabOverrides_WhenStoredValueIsInvalid_ShouldFailWithInvalidLabOverrides', () => {
  // Arrange
  const stored = JSON.stringify({ forest_wolf: { weaponScale: 'huge' } });

  // Act
  const result = mergeStoredLabOverrides(stored, {});

  // Assert
  assert.equal(result.error, 'INVALID_LAB_OVERRIDES');
});
// #endregion
