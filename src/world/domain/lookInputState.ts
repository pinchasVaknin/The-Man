// ============================================================================
// MODULE: World / Domain / Look Input State
// DESIGN: The mouse and touch state used to turn the view (SRP)
// SUMMARY: Holds the look deltas accumulated between frames, the mouse-drag state (to tell a click from a drag), the
//          last pointer position, and the touch-look finger. Replaces loose variables in the canvas.
// ============================================================================

// #region Contracts
/** Summary: Mutable look-input state of one running world. */
export interface ILookInputState {
  /** Yaw and pitch changes (radians) accumulated since the last simulation step. */
  accumYawDelta: number;
  accumPitchDelta: number;
  /** True while the mouse is dragging to look around. */
  isDraggingLook: boolean;
  /** Where the current mouse press started, to tell a click from a drag. */
  mouseDownStartX: number;
  mouseDownStartY: number;
  /** True when the pointer moved while the button was held. */
  mouseMovedWhileDown: boolean;
  /** Last pointer position seen during a drag. */
  lastPointerX: number;
  lastPointerY: number;
  /** Identifier of the touch that is turning the view, or null. */
  touchLookId: number | null;
  lastTouchX: number;
  lastTouchY: number;
}

/** Summary: A fresh look-input state with nothing turned and no touch active. */
export function createLookInputState(): ILookInputState {
  return {
    accumYawDelta: 0,
    accumPitchDelta: 0,
    isDraggingLook: false,
    mouseDownStartX: 0,
    mouseDownStartY: 0,
    mouseMovedWhileDown: false,
    lastPointerX: 0,
    lastPointerY: 0,
    touchLookId: null,
    lastTouchX: 0,
    lastTouchY: 0,
  };
}
// #endregion
