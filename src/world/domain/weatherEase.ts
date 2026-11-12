// ============================================================================
// MODULE: World / Domain / Weather Ease
// DESIGN: Eases the continuous weather values toward their target at a limited rate, so weather never switches in one
//         frame (WX1). Discrete values (kind, labels, lightning, thunder onset) pass straight through.
// SUMMARY: The target weather is computed each step. The value the world uses moves toward it, by at most a set rate
//          per second, so rain, fog and wetness fade in and out over a few seconds.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IWeatherStateSnapshot } from './worldTypes';
// #endregion

// ======================== CONSTANTS ======================== \\
// #region Constants
/** Largest change per second of a continuous weather value (0..1 scale). Full rain fades in over about four seconds. */
const WEATHER_EASE_PER_SECOND = 0.25;
/** Ground wetness changes more slowly, so puddles dry and form over a longer time. */
const WETNESS_EASE_PER_SECOND = 0.1;
// #endregion

/** Summary: The continuous weather fields and the rate each one eases at. */
const CONTINUOUS_FIELDS: ReadonlyArray<readonly [keyof IWeatherStateSnapshot, number]> = [
  ['cloudCoverage', WEATHER_EASE_PER_SECOND],
  ['cloudDarkness', WEATHER_EASE_PER_SECOND],
  ['rainIntensity', WEATHER_EASE_PER_SECOND],
  ['snowIntensity', WEATHER_EASE_PER_SECOND],
  ['fogIntensity', WEATHER_EASE_PER_SECOND],
  ['wetness', WETNESS_EASE_PER_SECOND],
  ['windStrength', WEATHER_EASE_PER_SECOND],
  ['sandWindIntensity', WEATHER_EASE_PER_SECOND],
];

/**
 * Summary: Moves `current` one step toward `target`, by at most `maxRate * dt`.
 */
export function easeToward(current: number, target: number, maxRate: number, dt: number): number {
  const maxStep = maxRate * Math.max(0, dt);
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

/**
 * Summary: The weather the world uses this step: continuous values eased toward `target`, everything else from `target`.
 * @param current The weather used last step, or null on the first step (then the target is used at once).
 */
export function easeWeatherSnapshot(
  current: IWeatherStateSnapshot | null,
  target: IWeatherStateSnapshot,
  dt: number
): IWeatherStateSnapshot {
  if (!current) return target;
  const next: Record<string, unknown> = { ...target };
  for (const [field, rate] of CONTINUOUS_FIELDS) {
    const from = current[field] as number;
    const to = target[field] as number;
    next[field] = easeToward(from, to, rate, dt);
  }
  return next as unknown as IWeatherStateSnapshot;
}
