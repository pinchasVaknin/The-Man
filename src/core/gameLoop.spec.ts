// ============================================================================
// MODULE: Core / Game Loop Tests
// DESIGN: AAA unit tests for the frame loop, driven by a fake scheduler and clock
// SUMMARY: Verifies frame delta clamping, scheduling, error throttling, halting after
//          repeated failures and that stop() prevents further frames.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameLoop, type IFrameScheduler } from './gameLoop';
import type { ILogger } from './ILogger';
// #endregion

// ======================== FAKES ======================== \\
// #region Fakes
class FakeScheduler implements IFrameScheduler {
  public pending: (() => void) | null = null;
  public cancelCount = 0;
  public request(callback: () => void): void {
    this.pending = callback;
  }
  public cancel(): void {
    this.cancelCount++;
    this.pending = null;
  }
  public runNext(): void {
    const callback = this.pending;
    this.pending = null;
    callback?.();
  }
}

class RecordingLogger implements ILogger {
  public readonly errors: string[] = [];
  public debug(): void {}
  public info(): void {}
  public warn(): void {}
  public error(message: string): void {
    this.errors.push(message);
  }
}

function createHarness(onFrame: (dt: number, nowMs: number) => void, maxFailures = 3) {
  const scheduler = new FakeScheduler();
  const logger = new RecordingLogger();
  const clock = { nowMs: 1000 };
  const fatalErrors: Error[] = [];
  const loop = new GameLoop({
    scheduler,
    now: () => clock.nowMs,
    logger,
    maxConsecutiveFailures: maxFailures,
    maxFrameSeconds: 0.35,
    errorLogIntervalMs: 2000,
    onFrame,
    onFatalError: (error) => fatalErrors.push(error),
  });
  return { loop, scheduler, logger, clock, fatalErrors };
}
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('runFrame_WhenTimeAdvances_ShouldPassElapsedSecondsAndScheduleNext', () => {
  // Arrange
  const deltas: number[] = [];
  const { loop, scheduler, clock } = createHarness((dt) => deltas.push(dt));
  loop.start();

  // Act
  clock.nowMs += 16;
  scheduler.runNext();

  // Assert
  assert.equal(deltas.length, 1);
  assert.ok(Math.abs(deltas[0] - 0.016) < 1e-9);
  assert.notEqual(scheduler.pending, null);
});

test('runFrame_WhenFrameGapIsLong_ShouldClampDeltaToMaxFrameSeconds', () => {
  // Arrange
  const deltas: number[] = [];
  const { loop, scheduler, clock } = createHarness((dt) => deltas.push(dt));
  loop.start();

  // Act
  clock.nowMs += 5000;
  scheduler.runNext();

  // Assert
  assert.deepEqual(deltas, [0.35]);
});
// #endregion

// ======================== ERROR HANDLING TESTS ======================== \\
// #region Error Handling Tests
test('runFrame_WhenFramesKeepThrowing_ShouldThrottleLogsAndHaltAtLimit', () => {
  // Arrange
  const { loop, scheduler, logger, clock, fatalErrors } = createHarness(() => {
    throw new Error('boom');
  });
  loop.start();

  // Act
  for (let i = 0; i < 3; i++) {
    clock.nowMs += 16;
    scheduler.runNext();
  }

  // Assert
  assert.equal(logger.errors.length, 1);
  assert.equal(fatalErrors.length, 1);
  assert.equal(fatalErrors[0].message, 'boom');
  assert.equal(scheduler.pending, null);
});

test('runFrame_WhenFailureIsIsolated_ShouldKeepRunning', () => {
  // Arrange
  let shouldThrow = true;
  const { loop, scheduler, clock, fatalErrors } = createHarness(() => {
    if (shouldThrow) {
      shouldThrow = false;
      throw new Error('once');
    }
  }, 1 + 1);
  loop.start();

  // Act
  for (let i = 0; i < 4; i++) {
    clock.nowMs += 16;
    scheduler.runNext();
  }

  // Assert
  assert.equal(fatalErrors.length, 0);
  assert.notEqual(scheduler.pending, null);
});

test('runFrame_WhenNonErrorIsThrown_ShouldWrapItInError', () => {
  // Arrange
  const { loop, scheduler, clock, fatalErrors } = createHarness(() => {
    throw 'text failure';
  }, 1);
  loop.start();

  // Act
  clock.nowMs += 16;
  scheduler.runNext();

  // Assert
  assert.ok(fatalErrors[0] instanceof Error);
  assert.equal(fatalErrors[0].message, 'text failure');
});
// #endregion

// ======================== LIFECYCLE TESTS ======================== \\
// #region Lifecycle Tests
test('stop_WhenCalledBeforePendingFrame_ShouldCancelAndNeverRunAgain', () => {
  // Arrange
  let frames = 0;
  const { loop, scheduler } = createHarness(() => frames++);
  loop.start();
  const pending = scheduler.pending;

  // Act
  loop.stop();
  pending?.();

  // Assert
  assert.equal(frames, 0);
  assert.equal(scheduler.cancelCount, 1);
  assert.equal(scheduler.pending, null);
});
// #endregion

// ======================== FIXED TIMESTEP TESTS ======================== \\
// #region Fixed Timestep Tests
function createFixedHarness(maxFixedStepsPerFrame = 15) {
  const scheduler = new FakeScheduler();
  const clock = { nowMs: 1000 };
  const steps: number[] = [];
  const frames: Array<{ dt: number; alpha: number }> = [];
  const loop = new GameLoop({
    scheduler,
    now: () => clock.nowMs,
    logger: new RecordingLogger(),
    maxConsecutiveFailures: 3,
    maxFrameSeconds: 0.25,
    errorLogIntervalMs: 2000,
    fixedStep: { stepSeconds: 0.01, maxStepsPerFrame: maxFixedStepsPerFrame, onStep: (dt) => steps.push(dt) },
    onFrame: (dt, _nowMs, alpha) => frames.push({ dt, alpha }),
    onFatalError: () => {},
  });
  loop.start();
  return { scheduler, clock, steps, frames };
}

test('runFrame_WhenFixedStepConfigured_ShouldRunWholeStepsAndCarryRemainder', () => {
  // Arrange
  const { scheduler, clock, steps, frames } = createFixedHarness();

  // Act
  clock.nowMs += 25;
  scheduler.runNext();
  clock.nowMs += 6;
  scheduler.runNext();

  // Assert
  assert.deepEqual(steps, [0.01, 0.01, 0.01]);
  assert.ok(Math.abs(frames[0].alpha - 0.5) < 1e-9);
  assert.ok(Math.abs(frames[1].alpha - 0.1) < 1e-9);
});

test('runFrame_WhenFrameIsShorterThanStep_ShouldRenderWithoutStepping', () => {
  // Arrange
  const { scheduler, clock, steps, frames } = createFixedHarness();

  // Act
  clock.nowMs += 4;
  scheduler.runNext();

  // Assert
  assert.equal(steps.length, 0);
  assert.equal(frames.length, 1);
});

test('runFrame_WhenStepBudgetIsExceeded_ShouldDropBacklogInsteadOfSpiraling', () => {
  // Arrange
  const { scheduler, clock, steps, frames } = createFixedHarness(4);

  // Act
  clock.nowMs += 200;
  scheduler.runNext();

  // Assert
  assert.equal(steps.length, 4);
  assert.ok(frames[0].alpha >= 0 && frames[0].alpha < 1);
});
// #endregion
