// ============================================================================
// MODULE: World / Domain / Loading Stages
// DESIGN: Pure mapping from the world builder's stage names to ordered loading steps and a progress fraction.
// SUMMARY: The builder reports stage names as it works. This module turns them into a step number,
//          a total and a 0..1 fraction for the loading screen. Unknown names keep the last known progress.
// ============================================================================

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** Loading steps in the order they happen. "renderer" is shown before the builder reports anything. */
export const LOADING_STEP_IDS = [
  'renderer',
  'terrain',
  'vegetation',
  'settlements',
  'sky',
  'player',
  'wildlife',
  'colliders',
] as const;

export type LoadingStepId = (typeof LOADING_STEP_IDS)[number];

/** Maps each builder stage name (as reported by proceduralModels) to its loading step. */
const STAGE_NAME_TO_STEP: Readonly<Record<string, LoadingStepId>> = {
  'terrain and water': 'terrain',
  vegetation: 'vegetation',
  settlements: 'settlements',
  'sky and weather': 'sky',
  'player and combat': 'player',
  wildlife: 'wildlife',
  'collider debug': 'colliders',
};

export interface ILoadingProgress {
  readonly stepId: LoadingStepId;
  /** 1-based index of the current step. */
  readonly stepNumber: number;
  readonly totalSteps: number;
  /** Progress through the loading steps, 0 to 1. */
  readonly fraction: number;
}
// #endregion

// ======================== PUBLIC FUNCTIONS ======================== \\
// #region Describe Progress
/**
 * Summary: Describes the loading progress for a builder stage name.
 * Design: An unknown name keeps the renderer step, so the bar never jumps backwards.
 * @param stageName The name the world builder reported, or null before it reports anything.
 */
export function describeLoadingStage(stageName: string | null): ILoadingProgress {
  const mapped =
    stageName !== null && Object.prototype.hasOwnProperty.call(STAGE_NAME_TO_STEP, stageName)
      ? STAGE_NAME_TO_STEP[stageName]
      : undefined;
  const stepId: LoadingStepId = mapped ?? LOADING_STEP_IDS[0];
  const index = LOADING_STEP_IDS.indexOf(stepId);
  const totalSteps = LOADING_STEP_IDS.length;
  return {
    stepId,
    stepNumber: index + 1,
    totalSteps,
    fraction: index / totalSteps,
  };
}
// #endregion
