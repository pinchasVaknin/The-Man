// ============================================================================
// MODULE: App / Composition Root Tests
// DESIGN: AAA unit tests for the production service wiring
// SUMMARY: Verifies the logger choice and that each world mount gets its own sound engine.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServices } from './compositionRoot';
import { ConsoleLogger } from '../core/ILogger';
// #endregion

// ======================== TESTS ======================== \\
// #region Tests
test('createAppServices_WhenCalled_ShouldUseConsoleLogger', () => {
  // Arrange & Act
  const services = createAppServices();

  // Assert
  assert.equal(services.logger, ConsoleLogger.instance);
});

test('createSoundEngine_WhenCalledTwice_ShouldReturnSeparateEngines', () => {
  // Arrange
  const services = createAppServices();

  // Act
  const first = services.createSoundEngine();
  const second = services.createSoundEngine();

  // Assert
  assert.notEqual(first, second);
});
// #endregion
