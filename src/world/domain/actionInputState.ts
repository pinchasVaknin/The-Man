// ============================================================================
// MODULE: World / Domain / Action Input State
// DESIGN: The held and pressed state of the player's actions: sword, bow, flight and pointer lock (SRP)
// SUMMARY: Tracks whether the sword or bow is held and for how long, the pending flight toggle and the time of the last
//          Space press (for the double-tap), and when the pointer lock was last lost. Replaces loose variables in the
//          canvas so the action state has one owner and one shape.
// ============================================================================

// #region Contracts
/** Summary: Mutable action-input state of one running world. */
export interface IActionInputState {
  /** A flight toggle requested by the double-tap of Space, not yet applied. */
  pendingFlyToggle: boolean;
  /** Time of the last Space press, in milliseconds (for the double-tap). */
  lastSpaceDownMs: number;
  /** True while the bow is drawn with the mouse. */
  isMouseBowHeld: boolean;
  /** True while the sword attack button is held. */
  isSwordAttackHeld: boolean;
  /** How long the sword attack has been held, in seconds. */
  swordHoldDuration: number;
  /** True once a heavy slash has been triggered during this hold. */
  swordHeavyTriggeredDuringHold: boolean;
  /** Time the pointer lock was last lost, in milliseconds (-Infinity when never). */
  lastPointerLockExitTimeMs: number;
}

/** Summary: A fresh action-input state with nothing held. */
export function createActionInputState(): IActionInputState {
  return {
    pendingFlyToggle: false,
    lastSpaceDownMs: -1000,
    isMouseBowHeld: false,
    isSwordAttackHeld: false,
    swordHoldDuration: 0,
    swordHeavyTriggeredDuringHold: false,
    lastPointerLockExitTimeMs: -Infinity,
  };
}
// #endregion
