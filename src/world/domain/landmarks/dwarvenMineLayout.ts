// ============================================================================
// MODULE: World / Domain / Landmarks / Dwarven Mine Layout
// DESIGN: Single source of numbers shared by the mine model and its colliders (SRP)
// SUMMARY: Structures that both the model builder and the collision table must agree on.
//          Offsets are relative to SOUTHERN_MINE_POS (x, entranceZ), in metres.
// ============================================================================

// ======================== HOIST CRANE ======================== \\
// #region Hoist Crane
/**
 * Summary: Open lattice crane tower on the north-east scaffold, used by the model and its colliders.
 * Design: The four corner posts are at (+-postSpan, +-postSpan) from the tower centre.
 *         postHalfSize is the collider half-width of one post; towerHeight is the post top above catwalkY.
 */
export const MINE_HOIST_CRANE = {
  offsetX: 21.5,
  offsetZ: 44.0,
  postSpan: 2.4,
  postHalfSize: 0.25,
  towerHeight: 9.4,
} as const;
// #endregion
