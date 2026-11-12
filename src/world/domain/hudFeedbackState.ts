// ============================================================================
// MODULE: World / Domain / HUD Feedback State
// DESIGN: The short-lived feedback the HUD shows after a hit or a loot pickup (SRP)
// SUMMARY: One named state object for what the last arrow or blow hit, and the last loot notice, with timers that
//          expire them. Replaces loose variables in the canvas so the state has one owner and one shape.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ISmallAnimalState } from '../systems/boidsAndWildlifeSystem';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Feedback shown on the HUD. A timer of zero (or less) means the value is no longer shown. */
export interface IHudFeedbackState {
  /** Name of the target the last arrow hit. */
  arrowHitTargetName: string | null;
  arrowHitTimer: number;
  /** The animal the last blow hit. */
  hitAnimal: ISmallAnimalState | null;
  hitAnimalTimer: number;
  /** Text of the last loot notice. */
  lootNotification: string | null;
  lootNotificationTimer: number;
}
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/** Summary: A fresh feedback state with nothing shown. */
export function createHudFeedbackState(): IHudFeedbackState {
  return {
    arrowHitTargetName: null,
    arrowHitTimer: 0,
    hitAnimal: null,
    hitAnimalTimer: 0,
    lootNotification: null,
    lootNotificationTimer: 0,
  };
}
// #endregion
