// ============================================================================
// MODULE: Core / Tick Error Guard
// DESIGN: Small state container (closure) counting consecutive frame failures
// SUMMARY: Decides whether a real-time loop may keep running after a frame throws.
//          Isolated failures are tolerated; a run of consecutive failures halts the
//          loop so the error can reach the error boundary. Does not log anything.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { InfrastructureCorruptedException } from './AppException';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** What the frame loop should do after a failed frame. */
export type TickErrorDecision = 'continue' | 'halt';

/**
 * Summary: Tracks consecutive failed frames of a real-time loop.
 * Design: Narrow two-method contract so the loop only reports outcomes and reads a decision.
 */
export interface ITickErrorGuard {
  /** Reports a frame that completed without throwing; resets the failure run. */
  recordSuccess(): void;
  /** Reports a frame that threw; returns whether the loop may continue. */
  recordFailure(): TickErrorDecision;
}
// #endregion

// ======================== PUBLIC FACTORY ======================== \\
// #region Create Tick Error Guard
/**
 * Summary: Creates a guard that halts after a run of consecutive frame failures.
 * Design: Mutation is confined to the closure's own counter (a state container),
 *         so callers never share or mutate external state.
 * @param maxConsecutiveFailures Number of failed frames in a row that halts the loop (>= 1).
 * @returns A guard whose recordFailure returns 'halt' once the run reaches the limit.
 * @throws InfrastructureCorruptedException when maxConsecutiveFailures is below 1.
 */
export function createTickErrorGuard(maxConsecutiveFailures: number): ITickErrorGuard {
  if (!Number.isInteger(maxConsecutiveFailures) || maxConsecutiveFailures < 1) {
    throw new InfrastructureCorruptedException('Tick error guard limit must be a positive integer.', {
      maxConsecutiveFailures,
    });
  }

  let consecutiveFailures = 0;
  return {
    recordSuccess(): void {
      consecutiveFailures = 0;
    },
    recordFailure(): TickErrorDecision {
      consecutiveFailures += 1;
      return consecutiveFailures >= maxConsecutiveFailures ? 'halt' : 'continue';
    },
  };
}
// #endregion
