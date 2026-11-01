// ============================================================================
// MODULE: World / Systems / World Clock System Tests
// DESIGN: AAA unit tests for the world clock helpers
// SUMMARY: Verifies wrap-around, morning detection for early and evening sleepers,
//          and the sleep-allowed window.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceSleepClock,
  advanceWorldClock,
  isSleepingAllowedAt,
  PLAY_CLOCK_HOURS_PER_SECOND,
  WAKE_UP_HOUR,
} from './worldClockSystem';
// #endregion

// ======================== CLOCK TESTS ======================== \\
// #region Clock Tests
test('advanceWorldClock_WhenPassingMidnight_ShouldWrapToNextDay', () => {
  // Arrange & Act
  const hours = advanceWorldClock(23.99, 1, PLAY_CLOCK_HOURS_PER_SECOND);

  // Assert
  assert.ok(Math.abs(hours - 0.018) < 1e-9);
});

test('advanceSleepClock_WhenSleeperBeforeDawnCrossesWakeHour_ShouldWakeAtWakeHour', () => {
  // Arrange & Act
  const result = advanceSleepClock(6.4, 0.1);

  // Assert
  assert.deepEqual(result, { hours: WAKE_UP_HOUR, hasReachedMorning: true });
});

test('advanceSleepClock_WhenEveningSleeperPassesMidnight_ShouldKeepSleeping', () => {
  // Arrange & Act
  const result = advanceSleepClock(23.5, 0.2);

  // Assert
  assert.equal(result.hasReachedMorning, false);
  assert.ok(Math.abs(result.hours - 1.0) < 1e-9);
});

test('advanceSleepClock_WhenEveningSleeperStepsPastNextMorning_ShouldWake', () => {
  // Arrange & Act
  const result = advanceSleepClock(20, 1.5);

  // Assert
  assert.deepEqual(result, { hours: WAKE_UP_HOUR, hasReachedMorning: true });
});
// #endregion

// ======================== SLEEP WINDOW TESTS ======================== \\
// #region Sleep Window Tests
test('isSleepingAllowedAt_WhenCheckedAroundWindowEdges_ShouldMatchNightWindow', () => {
  // Arrange
  const hours = [18.49, 18.5, 23, 0, 5.79, 5.8, 12];

  // Act
  const allowed = hours.map(isSleepingAllowedAt);

  // Assert
  assert.deepEqual(allowed, [false, true, true, true, true, false, false]);
});
// #endregion
