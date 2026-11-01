// ============================================================================
// MODULE: World / Systems / World Clock System
// DESIGN: Pure functions for the 24 h world clock (no side effects)
// SUMMARY: Advances the in-game hour on the title screen, during play and while sleeping
//          in a bed (fast-forward until morning), and decides when sleeping is allowed.
// ============================================================================

// ======================== CONSTANTS ======================== \\
// #region Constants
/** In-game hours per real second behind the title screen. */
export const TITLE_CLOCK_HOURS_PER_SECOND = 0.022;
/** In-game hours per real second during play. */
export const PLAY_CLOCK_HOURS_PER_SECOND = 0.028;
/** In-game hours per real second while sleeping in a bed. */
export const SLEEP_CLOCK_HOURS_PER_SECOND = 7.5;
/** Hour at which a sleeper wakes up. */
export const WAKE_UP_HOUR = 6.5;
/** Sleeping is allowed from this evening hour... */
const SLEEP_ALLOWED_FROM_HOUR = 18.5;
/** ...until this morning hour. */
const SLEEP_ALLOWED_UNTIL_HOUR = 5.8;
/** A sleeper who lay down after this hour wakes the next morning. */
const EVENING_SLEEP_START_HOUR = 18.0;
// #endregion

// ======================== CLOCK ======================== \\
// #region Clock
/**
 * Summary: Advances a 24 h clock by `dt` real seconds at `hoursPerSecond`.
 */
export function advanceWorldClock(hours: number, dt: number, hoursPerSecond: number): number {
  return (hours + dt * hoursPerSecond) % 24;
}

/**
 * Summary: Fast-forwards the clock while sleeping and reports when morning is reached.
 * Design: Morning is reached when the step crosses 06:30, either the same night (before
 *         06:30) or after midnight for a sleeper who lay down in the evening.
 */
export function advanceSleepClock(hours: number, dt: number): { hours: number; hasReachedMorning: boolean } {
  const stepHours = dt * SLEEP_CLOCK_HOURS_PER_SECOND;
  const hasReachedMorning =
    (hours < WAKE_UP_HOUR && hours + stepHours >= WAKE_UP_HOUR) ||
    (hours >= EVENING_SLEEP_START_HOUR && hours + stepHours >= 24 + WAKE_UP_HOUR);
  return hasReachedMorning
    ? { hours: WAKE_UP_HOUR, hasReachedMorning: true }
    : { hours: (hours + stepHours) % 24, hasReachedMorning: false };
}

/**
 * Summary: True when the hour is late enough (or early enough) to go to bed.
 */
export function isSleepingAllowedAt(hours: number): boolean {
  return hours >= SLEEP_ALLOWED_FROM_HOUR || hours < SLEEP_ALLOWED_UNTIL_HOUR;
}
// #endregion
