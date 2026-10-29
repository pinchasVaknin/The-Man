// ============================================================================
// MODULE: Core / Logger Tests
// DESIGN: Unit test suite for ILogger implementations (AAA)
// SUMMARY: Verifies ConsoleLogger and NullLogger implementations execute safely without mutation or uncaught errors.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConsoleLogger, NullLogger } from './ILogger';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('ConsoleLogger_WhenLogMethodsCalled_ShouldExecuteWithoutThrowing', () => {
  // Arrange
  const sut = new ConsoleLogger();
  const context = { entityId: 'player_1', score: 120 };

  // Act & Assert
  assert.doesNotThrow(() => {
    sut.debug('Diagnostic trace', context);
    sut.info('Player spawned', context);
    sut.warn('Stamina depleted', context);
    sut.error('Render pipeline glitch', context);
  });
});

test('NullLogger_WhenLogMethodsCalled_ShouldExecuteSafelyAndSilently', () => {
  // Arrange
  const sut = new NullLogger();

  // Act & Assert
  assert.doesNotThrow(() => {
    sut.debug('Test message');
    sut.info('Test message');
    sut.warn('Test message');
    sut.error('Test message');
  });
});
// #endregion
