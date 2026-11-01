// ============================================================================
// MODULE: Config / Key Binding Match Tests
// DESIGN: AAA unit tests for matching pressed KeyboardEvent.code values to bindings
// SUMMARY: Verifies exact matches and the left/right modifier equivalence.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBindingHeld, matchesKeyBinding } from './keyBindingMatch';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('matchesKeyBinding_WhenCodesAreEqual_ShouldMatch', () => {
  // Act
  const result = matchesKeyBinding('KeyP', 'KeyP');

  // Assert
  assert.equal(result, true);
});

test('matchesKeyBinding_WhenOtherSideOfBoundModifierIsPressed_ShouldMatch', () => {
  // Arrange
  const pairs = [
    ['ShiftRight', 'ShiftLeft'],
    ['ControlRight', 'ControlLeft'],
    ['AltLeft', 'AltRight'],
  ] as const;

  // Act
  const results = pairs.map(([pressed, bound]) => matchesKeyBinding(pressed, bound));

  // Assert
  assert.deepEqual(results, [true, true, true]);
});

test('isBindingHeld_WhenAnyMatchingKeyIsInThePressedSet_ShouldReturnTrue', () => {
  // Arrange
  const pressed = new Set(['KeyW', 'ShiftRight']);

  // Act
  const held = isBindingHeld(pressed, 'ShiftLeft');

  // Assert
  assert.equal(held, true);
});
// #endregion

// ======================== GUARD CLAUSE & VALIDATION TESTS ======================== \\
// #region Guard Clause & Validation Tests
test('matchesKeyBinding_WhenKeysDiffer_ShouldNotMatch', () => {
  // Arrange
  const pairs = [
    ['KeyO', 'KeyP'],
    ['ShiftLeft', 'ControlLeft'],
    ['KeyP', ''],
  ] as const;

  // Act
  const results = pairs.map(([pressed, bound]) => matchesKeyBinding(pressed, bound));

  // Assert
  assert.deepEqual(results, [false, false, false]);
});

test('isBindingHeld_WhenOnlyUnrelatedKeysArePressed_ShouldReturnFalse', () => {
  // Arrange
  const pressed = new Set(['KeyW', 'KeyA']);

  // Act
  const held = isBindingHeld(pressed, 'KeyR');

  // Assert
  assert.equal(held, false);
});
// #endregion
