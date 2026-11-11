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

// ======================== FLOOR TORCH STANDS AND LAGOON COLUMN ======================== \\
// #region Floor Torch Stands
/**
 * Summary: Floor-standing torch posts (2.75 m) that a player can walk into, and the rock column in the west lagoon.
 * Design: lx/lz are local to the mine group (x from SOUTHERN_MINE_POS.x, z from SOUTHERN_MINE_POS.entranceZ).
 *         baseY is the world y of the lowest vertex, measured with the collider audit (window.auditColliders).
 *         NOTE: the model still places these from its own call sites; these numbers are not yet read by the model.
 */
export const MINE_FLOOR_TORCH_STANDS: ReadonlyArray<{ readonly lx: number; readonly lz: number; readonly baseY: number }> = [
  { lx: -128.0, lz: 92.2, baseY: -15.27 },
  { lx: -8.5, lz: 239.0, baseY: -17.55 },
  { lx: 8.5, lz: 239.0, baseY: -17.55 },
  { lx: -25.0, lz: 50.0, baseY: -9.35 },
  { lx: -35.0, lz: 61.5, baseY: -9.35 },
  { lx: 35.0, lz: 61.5, baseY: -9.35 },
  { lx: 4.0, lz: 48.0, baseY: -9.35 },
  { lx: 22.0, lz: 68.0, baseY: -9.35 },
  { lx: -9.5, lz: 85.0, baseY: -9.35 },
  { lx: -3.5, lz: 177.5, baseY: -18.35 },
  { lx: 3.5, lz: 218.5, baseY: -18.35 },
];

/** Summary: Rock column standing on the west lagoon floor (footprint 5.16 x 2.06, height 11.4). */
export const MINE_LAGOON_COLUMN = {
  lx: -118.0,
  lz: 54.87,
  halfW: 2.58,
  halfD: 1.03,
  baseY: -15.85,
  height: 11.4,
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
