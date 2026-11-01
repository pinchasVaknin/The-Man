// ============================================================================
// MODULE: Core / Tick Error Guard Tests
// DESIGN: AAA unit tests for the consecutive-failure guard used by frame loops
// SUMMARY: Verifies that isolated frame failures are tolerated and that a run of
//          consecutive failures halts the loop.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTickErrorGuard } from './tickErrorGuard';
import { InfrastructureCorruptedException } from './AppException';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('recordFailure_WhenFailuresStayBelowLimit_ShouldContinue', () => {
  // Arrange
  const sut = createTickErrorGuard(3);
  sut.recordFailure();

  // Act
  const decision = sut.recordFailure();

  // Assert
  assert.equal(decision, 'continue');
});

test('recordFailure_WhenConsecutiveFailuresReachLimit_ShouldHalt', () => {
  // Arrange
  const sut = createTickErrorGuard(3);
  sut.recordFailure();
  sut.recordFailure();

  // Act
  const decision = sut.recordFailure();

  // Assert
  assert.equal(decision, 'halt');
});

test('recordSuccess_WhenCalledBetweenFailures_ShouldResetTheRun', () => {
  // Arrange
  const sut = createTickErrorGuard(3);
  sut.recordFailure();
  sut.recordFailure();
  sut.recordSuccess();
  sut.recordFailure();

  // Act
  const decision = sut.recordFailure();

  // Assert
  assert.equal(decision, 'continue');
});
// #endregion

// ======================== GUARD CLAUSE & VALIDATION TESTS ======================== \\
// #region Guard Clause & Validation Tests
test('createTickErrorGuard_WhenLimitIsBelowOne_ShouldThrowInfrastructureCorrupted', () => {
  // Act & Assert
  assert.throws(() => createTickErrorGuard(0), InfrastructureCorruptedException);
});
// #endregion
