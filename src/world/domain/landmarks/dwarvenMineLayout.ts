// ============================================================================
// MODULE: World / Domain / Landmarks / Dwarven Mine Layout
// DESIGN: Single source of numbers shared by the mine model and its colliders (SRP)
// SUMMARY: Structures that both the model builder and the collision table must agree on.
//          Offsets are relative to SOUTHERN_MINE_POS (x, entranceZ), in metres.
// ============================================================================

// ======================== SCAFFOLD LEGS ======================== \\
// #region Scaffold Legs
/**
 * Summary: Ground legs of the north-east and north-west catwalk scaffold.
 * Design: Each leg stands on the cavern floor and reaches the catwalk. Positions are local to the mine
 *         group (x from SOUTHERN_MINE_POS.x, z from SOUTHERN_MINE_POS.entranceZ); radius is the base radius.
 */
export const MINE_SCAFFOLD_LEGS = {
  radius: 0.24,
  height: 3.8,
  positions: [
    [8.5, 38.2],
    [15.5, 38.2],
    [23.5, 38.2],
    [8.5, 48.5],
    [15.5, 48.5],
    [23.5, 48.5],
    [-17.5, 36.5],
    [-9.5, 36.5],
    [-17.5, 40.5],
    [-9.5, 40.5],
  ] as const,
} as const;
// #endregion

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
