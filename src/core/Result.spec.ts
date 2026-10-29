// ============================================================================
// MODULE: Core / Result Tests
// DESIGN: Unit test suite for Result expected-failure container (AAA)
// SUMMARY: Verifies Result.ok and Result.fail constructors, immutability, and accessor guards.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Result } from './Result';
import { InvalidResultAccessException } from './AppException';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('Result_WhenCreatedWithOk_ShouldContainValueAndBeSuccessful', () => {
  // Arrange
  const payload = { id: 'item_101', quantity: 2 };

  // Act
  const sut = Result.ok(payload);

  // Assert
  assert.equal(sut.isSuccess, true);
  assert.equal(sut.isFailure, false);
  assert.deepEqual(sut.value, payload);
});

test('Result_WhenCreatedWithFail_ShouldContainErrorAndBeFailure', () => {
  // Arrange
  const errorCode = 'NOT_ENOUGH_GOLD';

  // Act
  const sut = Result.fail(errorCode);

  // Assert
  assert.equal(sut.isSuccess, false);
  assert.equal(sut.isFailure, true);
  assert.equal(sut.error, errorCode);
});
// #endregion

// ======================== GUARD CLAUSE & VALIDATION TESTS ======================== \\
// #region Guard Clause & Validation Tests
test('value_WhenResultIsFailure_ShouldThrowInvalidResultAccessException', () => {
  // Arrange
  const sut = Result.fail('LEVEL_TOO_LOW');

  // Act & Assert
  assert.throws(
    () => sut.value,
    (err: unknown) => err instanceof InvalidResultAccessException
  );
});

test('error_WhenResultIsSuccess_ShouldThrowInvalidResultAccessException', () => {
  // Arrange
  const sut = Result.ok(42);

  // Act & Assert
  assert.throws(
    () => sut.error,
    (err: unknown) => err instanceof InvalidResultAccessException
  );
});
// #endregion

// ======================== EDGE CASES & INFRASTRUCTURE FAILURES ======================== \\
// #region Edge Cases & Infrastructure Failures
test('Result_WhenInstantiated_ShouldBeFrozenAndImmutable', () => {
  // Arrange
  const sut = Result.ok('immutable_data');

  // Act
  const isFrozen = Object.isFrozen(sut);

  // Assert
  assert.equal(isFrozen, true);
});
// #endregion
