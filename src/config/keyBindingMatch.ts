// ============================================================================
// MODULE: Config / Key Binding Match
// DESIGN: Pure helpers; modifier keys match on either side of the keyboard
// SUMMARY: Decides whether a pressed KeyboardEvent.code satisfies a configured key
//          binding. Does not read settings or listen to events itself.
// ============================================================================

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** Modifier families whose Left/Right variants count as the same key for a binding. */
const MODIFIER_FAMILIES: readonly string[] = ['Shift', 'Control', 'Alt', 'Meta'];
// #endregion

// ======================== PUBLIC MATCHERS ======================== \\
// #region Match Key Binding
/**
 * Summary: True when the pressed key code satisfies the bound key code.
 * Design: Exact match, except that ShiftLeft/ShiftRight (and Control, Alt, Meta) are treated
 *         as one key, so a player binding "Shift" can use either side.
 * @param pressedCode KeyboardEvent.code of the key the player pressed.
 * @param boundCode KeyboardEvent.code stored in the key binding.
 * @returns Whether the press triggers the binding.
 */
export function matchesKeyBinding(pressedCode: string, boundCode: string): boolean {
  if (!boundCode) return false;
  if (pressedCode === boundCode) return true;
  const family = MODIFIER_FAMILIES.find((name) => boundCode.startsWith(name));
  return family !== undefined && pressedCode.startsWith(family) && pressedCode.length > family.length;
}

/**
 * Summary: True when any currently pressed key satisfies the bound key code.
 * @param pressedCodes Codes of the keys held down right now.
 * @param boundCode KeyboardEvent.code stored in the key binding.
 * @returns Whether the binding is held.
 */
export function isBindingHeld(pressedCodes: ReadonlySet<string>, boundCode: string): boolean {
  if (pressedCodes.has(boundCode)) return true;
  for (const code of pressedCodes) {
    if (matchesKeyBinding(code, boundCode)) return true;
  }
  return false;
}
// #endregion
