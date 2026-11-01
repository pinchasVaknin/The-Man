// ============================================================================
// MODULE: App / App Services Context Tests
// DESIGN: AAA tests that render through react-dom/server (no DOM needed)
// SUMMARY: Verifies that services reach components through the provider and that a
//          component outside the provider fails loudly.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppServicesProvider, useAppServices } from './AppServicesContext';
import type { IAppServices } from './compositionRoot';
import { InfrastructureCorruptedException } from '../core/AppException';
import { NullLogger } from '../core/ILogger';
import { NatureSoundEngine } from '../world/soundEngine';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
function LoggerProbe() {
  const { logger } = useAppServices();
  return createElement('span', null, logger === NullLogger.instance ? 'null-logger' : 'other');
}
// #endregion

// ======================== TESTS ======================== \\
// #region Tests
test('useAppServices_WhenInsideProvider_ShouldReturnProvidedServices', () => {
  // Arrange
  const services: IAppServices = { logger: NullLogger.instance, createSoundEngine: () => new NatureSoundEngine() };

  // Act
  const html = renderToStaticMarkup(createElement(AppServicesProvider, { value: services }, createElement(LoggerProbe)));

  // Assert
  assert.equal(html, '<span>null-logger</span>');
});

test('useAppServices_WhenOutsideProvider_ShouldThrowInfrastructureCorrupted', () => {
  // Arrange, Act & Assert
  assert.throws(() => renderToStaticMarkup(createElement(LoggerProbe)), InfrastructureCorruptedException);
});
// #endregion
