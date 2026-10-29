// ============================================================================
// MODULE: Core / AppException Tests
// DESIGN: Unit test suite for typed exception hierarchy (AAA)
// SUMMARY: Verifies exception inheritance, code mapping, prototype restoration, and context preservation.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppException, InfrastructureCorruptedException, InvalidResultAccessException } from './AppException';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('InfrastructureCorruptedException_WhenCreatedWithMessageAndContext_ShouldPreserveProperties', () => {
  // Arrange
  const message = 'WebGL context initialization failed';
  const context = { glVersion: '2.0', hardwareVendor: 'Intel' };

  // Act
  const sut = new InfrastructureCorruptedException(message, context);

  // Assert
  assert.equal(sut.errorCode, 'INFRASTRUCTURE_CORRUPTED');
  assert.equal(sut.message, message);
  assert.deepEqual(sut.context, context);
  assert.equal(sut instanceof AppException, true);
  assert.equal(sut instanceof InfrastructureCorruptedException, true);
});

test('InvalidResultAccessException_WhenCreatedWithMessage_ShouldPreserveProperties', () => {
  // Arrange
  const message = 'Read .value of a failed Result';

  // Act
  const sut = new InvalidResultAccessException(message);

  // Assert
  assert.equal(sut.errorCode, 'INVALID_RESULT_ACCESS');
  assert.equal(sut.message, message);
  assert.equal(sut instanceof AppException, true);
  assert.equal(sut instanceof InvalidResultAccessException, true);
});
// #endregion
