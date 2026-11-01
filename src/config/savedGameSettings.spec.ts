// ============================================================================
// MODULE: Config / Saved Game Settings Tests
// DESIGN: AAA unit tests with a stubbed window.localStorage boundary
// SUMMARY: Verifies that settings read back from localStorage are validated before use.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadActiveGameSettings, SAVED_GAME_SETTINGS } from './savedGameSettings';
import { NullLogger } from '../core/ILogger';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Test Fixtures & Factories
const globalWithWindow = globalThis as { window?: unknown };

function stubStoredSettings(raw: string | null): void {
  globalWithWindow.window = { localStorage: { getItem: () => raw } };
}

afterEach(() => {
  delete globalWithWindow.window;
  mock.restoreAll();
});
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('loadActiveGameSettings_WhenStoredSettingsAreValid_ShouldApplyThem', () => {
  // Arrange
  stubStoredSettings(JSON.stringify({ mouseSensitivity: 1.5 }));

  // Act
  const settings = loadActiveGameSettings(NullLogger.instance);

  // Assert
  assert.equal(settings.mouseSensitivity, 1.5);
});
// #endregion

// ======================== GUARD CLAUSE & VALIDATION TESTS ======================== \\
// #region Guard Clause & Validation Tests
test('loadActiveGameSettings_WhenStoredSettingsAreInvalid_ShouldReturnSavedDefaults', () => {
  // Arrange
  stubStoredSettings(JSON.stringify({ mouseSensitivity: 'fast', keybindings: { jump: 42 } }));

  // Act
  const settings = loadActiveGameSettings(NullLogger.instance);

  // Assert
  assert.deepEqual(settings, SAVED_GAME_SETTINGS);
});

test('loadActiveGameSettings_WhenStoredSettingsAreNotJson_ShouldReturnSavedDefaults', () => {
  // Arrange
  stubStoredSettings('{not json');

  // Act
  const settings = loadActiveGameSettings(NullLogger.instance);

  // Assert
  assert.deepEqual(settings, SAVED_GAME_SETTINGS);
});
// #endregion
