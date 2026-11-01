// ============================================================================
// MODULE: Core / Game Loop
// DESIGN: Game Loop pattern with an injected frame scheduler, clock and logger (DIP)
// SUMMARY: Drives one callback per frame with a clamped variable delta time. A thrown
//          frame is logged (throttled) and counted by the tick error guard; a run of
//          failures halts the loop and reports a fatal error to the owner.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ILogger } from './ILogger';
import { createTickErrorGuard, type ITickErrorGuard } from './tickErrorGuard';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/**
 * Summary: Schedules the next frame callback.
 * Design: Abstracts requestAnimationFrame and GPU-fence pacing so the loop is testable.
 */
export interface IFrameScheduler {
  /** Queues `callback` to run on the next frame. Only one request is pending at a time. */
  request(callback: () => void): void;
  /** Drops the pending request, if any. */
  cancel(): void;
}

/** Summary: Construction options for {@link GameLoop}. */
export interface IGameLoopOptions {
  readonly scheduler: IFrameScheduler;
  /** Monotonic clock in milliseconds (performance.now in the browser). */
  readonly now: () => number;
  readonly logger: ILogger;
  /** Failed frames in a row that halt the loop. */
  readonly maxConsecutiveFailures: number;
  /** Upper bound for one frame's delta, so a stalled tab does not explode the simulation. */
  readonly maxFrameSeconds: number;
  /** Minimum gap between two logged frame errors. */
  readonly errorLogIntervalMs: number;
  /** Runs one frame of simulation and rendering. */
  readonly onFrame: (deltaSeconds: number, nowMs: number) => void;
  /** Receives the error that halted the loop. */
  readonly onFatalError: (error: Error) => void;
}
// #endregion

// ======================== GAME LOOP ======================== \\
// #region Game Loop
/**
 * Summary: Runs frames until stopped or halted by repeated failures.
 * Design: Owns timing and fault tolerance only; what a frame does is the caller's onFrame.
 */
export class GameLoop {
  private readonly errorGuard: ITickErrorGuard;
  private lastFrameMs = 0;
  private lastErrorLogMs = -Infinity;
  private isRunning = false;
  private isHalted = false;

  public constructor(private readonly options: IGameLoopOptions) {
    this.errorGuard = createTickErrorGuard(options.maxConsecutiveFailures);
  }

  /** Starts the loop; the first frame runs on the scheduler's next callback. */
  public start(): void {
    this.isRunning = true;
    this.lastFrameMs = this.options.now();
    this.options.scheduler.request(this.runFrame);
  }

  /** Stops the loop and cancels the pending frame. */
  public stop(): void {
    this.isRunning = false;
    this.options.scheduler.cancel();
  }

  private readonly runFrame = (): void => {
    if (!this.isRunning) return;
    try {
      const nowMs = this.options.now();
      const deltaSeconds = Math.min((nowMs - this.lastFrameMs) / 1000, this.options.maxFrameSeconds);
      this.lastFrameMs = nowMs;
      this.options.onFrame(deltaSeconds, nowMs);
      this.errorGuard.recordSuccess();
    } catch (err: unknown) {
      this.handleFrameError(err);
    } finally {
      if (this.isRunning && !this.isHalted) {
        this.options.scheduler.request(this.runFrame);
      }
    }
  };

  private handleFrameError(err: unknown): void {
    const nowMs = this.options.now();
    if (nowMs - this.lastErrorLogMs > this.options.errorLogIntervalMs) {
      this.lastErrorLogMs = nowMs;
      this.options.logger.error('Game loop frame failed', {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    if (this.errorGuard.recordFailure() === 'halt') {
      // A frame that keeps failing means corrupted state: stop and surface it.
      this.isHalted = true;
      this.options.onFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
// #endregion
