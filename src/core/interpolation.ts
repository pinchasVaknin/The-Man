// ============================================================================
// MODULE: Core / Interpolation
// DESIGN: Pure numeric helpers (no state)
// SUMMARY: Linear interpolation for scalars and for angles in radians (shortest way round),
//          used to render between two fixed simulation steps.
// ============================================================================

// ======================== INTERPOLATION ======================== \\
// #region Interpolation
/** Summary: Linear interpolation from `from` (t = 0) to `to` (t = 1). */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Summary: Interpolates an angle in radians along the shorter arc.
 * Design: The result is not wrapped, so it stays continuous with `from`.
 */
export function lerpAngle(from: number, to: number, t: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}
// #endregion
