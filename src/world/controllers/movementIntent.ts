// ============================================================================
// MODULE: World / Controllers / Movement Intent
// DESIGN: Pure translation of held keys and touch input into movement axes
// SUMMARY: Combines the virtual joystick with the bound movement keys (and the fixed
//          arrow-key fallback). Keyboard movement is ignored while a modal is open.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IGameKeybindings } from '../../config/savedGameSettings';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Forward/right movement axes before clamping (keys add to the joystick). */
export interface IMovementAxes {
  forward: number;
  right: number;
}
// #endregion

// ======================== MOVEMENT AXES ======================== \\
// #region Movement Axes
/**
 * Summary: Writes this frame's movement axes into `out`.
 * Design: Arrow keys always work as a fallback next to the user's bindings.
 */
export function readMovementAxes(
  pressedCodes: ReadonlySet<string>,
  bindings: Pick<IGameKeybindings, 'moveForward' | 'moveBackward' | 'moveLeft' | 'moveRight'>,
  virtualAxes: Readonly<IMovementAxes>,
  isModalOpen: boolean,
  out: IMovementAxes
): void {
  out.forward = virtualAxes.forward;
  out.right = virtualAxes.right;
  if (isModalOpen) return;
  if (pressedCodes.has(bindings.moveForward) || pressedCodes.has('ArrowUp')) out.forward += 1;
  if (pressedCodes.has(bindings.moveBackward) || pressedCodes.has('ArrowDown')) out.forward -= 1;
  if (pressedCodes.has(bindings.moveRight) || pressedCodes.has('ArrowRight')) out.right += 1;
  if (pressedCodes.has(bindings.moveLeft) || pressedCodes.has('ArrowLeft')) out.right -= 1;
}
// #endregion
