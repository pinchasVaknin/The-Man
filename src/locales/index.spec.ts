// ============================================================================
// MODULE: Locales / Index Unit Tests
// DESIGN: AAA pattern unit tests for the localization translation engine
// SUMMARY: Verifies t() string resolution, nested keys, parameter interpolation, and fallbacks.
// ============================================================================

// ======================== IMPORTS & TEST SUITE ======================== \\
// #region Imports & Test Suite
import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocaleDictionary, getLocaleDictionary, he } from './index';

test('t_WhenValidDirectKeyProvided_ShouldReturnTranslatedString', () => {
  // Arrange
  const key = 'weather.clear_clouds';

  // Act
  const result = t(key);

  // Assert
  assert.equal(result, 'שמיים בהירים ועננים קלים');
});

test('t_WhenNestedItemKeyProvided_ShouldReturnCorrectItemProperty', () => {
  // Arrange
  const key = 'items.bow.name';

  // Act
  const result = t(key);

  // Assert
  assert.equal(result, 'קשת ציידים מורכבת');
});

test('t_WhenInterpolationParamsProvided_ShouldReplaceVariablesProperly', () => {
  // Arrange
  const key = 'ui.items_count';
  const params = { count: 8 };

  // Act
  const result = t(key, params);

  // Assert
  assert.equal(result, '8 פריטים');
});

test('t_WhenNonExistentKeyRequested_ShouldFallbackToKeyString', () => {
  // Arrange
  const nonExistentKey = 'non.existent.path.key';

  // Act
  const result = t(nonExistentKey);

  // Assert
  assert.equal(result, nonExistentKey);
});

test('setLocaleDictionary_WhenCalledWithNewDictionary_ShouldUpdateActiveLookup', () => {
  // Arrange
  const original = getLocaleDictionary();
  const mockDict = {
    greeting: 'Hello {name}',
  };

  try {
    // Act
    setLocaleDictionary(mockDict);
    const result = t('greeting', { name: 'Ranger' });

    // Assert
    assert.equal(result, 'Hello Ranger');
  } finally {
    // Teardown
    setLocaleDictionary(original);
  }
});
// #endregion
