// ============================================================================
// MODULE: Components / ErrorBoundary Tests
// DESIGN: Unit test suite for ErrorBoundary component resilience and logging (AAA)
// SUMMARY: Verifies ErrorBoundary catches errors, generates valid correlation IDs, and logs to ILogger.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorBoundary } from './ErrorBoundary';
import type { ILogger } from '../core/ILogger';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Test Fixtures & Factories
class MockErrorLogger implements ILogger {
  public readonly errors: { message: string; context?: Record<string, unknown> }[] = [];

  public debug(_message: string, _context?: Record<string, unknown>): void {}
  public info(_message: string, _context?: Record<string, unknown>): void {}
  public warn(_message: string, _context?: Record<string, unknown>): void {}
  public error(message: string, context?: Record<string, unknown>): void {
    this.errors.push({ message, context });
  }
}
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('getDerivedStateFromError_WhenErrorOccurs_ShouldReturnErrorStateWithCorrelationId', () => {
  // Arrange
  const testError = new Error('WebGL context destroyed');

  // Act
  const state = ErrorBoundary.getDerivedStateFromError(testError);

  // Assert
  assert.equal(state.hasError, true);
  assert.ok(typeof state.correlationId === 'string' && state.correlationId.startsWith('err_'));
  assert.ok(typeof state.userMessage === 'string' && state.userMessage.length > 0);
});

test('componentDidCatch_WhenInvoked_ShouldLogStructuredErrorWithInjectedLogger', () => {
  // Arrange
  const logger = new MockErrorLogger();
  const sut = new ErrorBoundary({ children: null, logger });
  const correlationId = 'err_test_uuid_1234';
  sut.state = {
    hasError: true,
    correlationId,
    userMessage: 'Test error message',
  };
  const testError = new Error('Canvas render loop crashed');
  const errorInfo = { componentStack: '\n    in WorldCanvas\n    in App' };

  // Act
  sut.componentDidCatch(testError, errorInfo);

  // Assert
  assert.equal(logger.errors.length, 1);
  assert.equal(logger.errors[0].message, 'Uncaught UI rendering exception');
  assert.equal(logger.errors[0].context?.correlationId, correlationId);
  assert.equal(logger.errors[0].context?.name, 'Error');
  assert.equal(logger.errors[0].context?.message, 'Canvas render loop crashed');
  assert.equal(logger.errors[0].context?.componentStack, errorInfo.componentStack);
});
// #endregion

// ======================== GUARD CLAUSE & VALIDATION TESTS ======================== \\
// #region Guard Clause & Validation Tests
test('componentDidCatch_WhenLoggerNotProvided_ShouldFallbackToConsoleLoggerSafely', () => {
  // Arrange
  const sut = new ErrorBoundary({ children: null });
  sut.state = {
    hasError: true,
    correlationId: 'err_fallback_test',
    userMessage: 'Test',
  };
  const testError = new Error('Silent test error');
  const errorInfo = { componentStack: 'in TestComponent' };

  // Act
  const act = () => sut.componentDidCatch(testError, errorInfo);
  // Assert
  assert.doesNotThrow(act);
  // already asserted
    
});
// #endregion
