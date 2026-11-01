// ============================================================================
// MODULE: Core / Interpolation Tests
// DESIGN: AAA unit tests for scalar and angle interpolation
// SUMMARY: Verifies endpoints, midpoints and the shortest-arc rule across ±PI.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerp, lerpAngle } from './interpolation';
// #endregion

// ======================== TESTS ======================== \\
// #region Tests
test('lerp_WhenAtEndpointsAndMiddle_ShouldBlendLinearly', () => {
  // Arrange, Act & Assert
  assert.deepEqual([lerp(2, 6, 0), lerp(2, 6, 0.5), lerp(2, 6, 1)], [2, 4, 6]);
});

test('lerpAngle_WhenCrossingPi_ShouldTakeShorterArc', () => {
  // Arrange
  const from = Math.PI - 0.1;
  const to = -Math.PI + 0.1;

  // Act
  const middle = lerpAngle(from, to, 0.5);

  // Assert
  assert.ok(Math.abs(middle - Math.PI) < 1e-9);
});

test('lerpAngle_WhenAnglesAccumulatePastTwoPi_ShouldStayContinuous', () => {
  // Arrange & Act
  const result = lerpAngle(7.0, 7.2, 0.5);

  // Assert
  assert.ok(Math.abs(result - 7.1) < 1e-9);
});
// #endregion
