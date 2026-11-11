// ============================================================================
// MODULE: World / Domain / Landmarks / Dwarven Mine Layout
// DESIGN: Single source of numbers shared by the mine model and its colliders (SRP)
// SUMMARY: Structures that both the model builder and the collision table must agree on.
//          Offsets are relative to SOUTHERN_MINE_POS (x, entranceZ), in metres.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { SOUTHERN_MINE_POS } from './dwarvenLandmarks';
// #endregion

// ======================== FLOOR LEVELS ======================== \\
// #region Floor Levels
/** Summary: Named floor levels of the mine; a torch stands on one of them plus a small lift. */
export type MineFloorLevel = 'cavern' | 'moria' | 'lagoon';

/** Summary: World y of a named mine floor, from SOUTHERN_MINE_POS. */
export function mineFloorY(level: MineFloorLevel): number {
  switch (level) {
    case 'cavern':
      return SOUTHERN_MINE_POS.cavernFloorY;
    case 'moria':
      return SOUTHERN_MINE_POS.moriaHallFloorY;
    case 'lagoon':
      return SOUTHERN_MINE_POS.westLagoonFloorY;
  }
}
// #endregion

// ======================== FLOOR TORCH STANDS ======================== \\
// #region Floor Torch Stands
/** Summary: One floor-standing lantern post: a 2.75 m post with a 0.52 m plinth a player can walk into. */
export interface IMineFloorTorch {
  /** Local x from SOUTHERN_MINE_POS.x. */
  readonly lx: number;
  /** Local z from SOUTHERN_MINE_POS.entranceZ. */
  readonly lz: number;
  readonly floor: MineFloorLevel;
  /** Height above the floor, for stands on a raised step. */
  readonly lift: number;
  readonly yaw: number;
  readonly light: boolean;
}

/** Summary: Torch stands on the dock of the west lagoon. */
export const MINE_LAGOON_DOCK_TORCH: IMineFloorTorch = {
  lx: -128.0, lz: 92.2, floor: 'lagoon', lift: 0.28, yaw: Math.PI, light: true,
};

/** Summary: Two torch stands beside the Moria sanctuary dais (the east one has no light). */
export const MINE_MORIA_SANCTUARY_TORCHES: readonly IMineFloorTorch[] = [
  { lx: -8.5, lz: 239.0, floor: 'moria', lift: 0.8, yaw: Math.PI, light: true },
  { lx: 8.5, lz: 239.0, floor: 'moria', lift: 0.8, yaw: Math.PI, light: false },
];

/** Summary: Torch stands placed in a loop across Room 1, the Moria gallery and the tunnels. */
export const MINE_GROUND_TORCHES: readonly IMineFloorTorch[] = [
  { lx: -25.0, lz: 50.0, floor: 'cavern', lift: 0, yaw: 0, light: true },
  { lx: -35.0, lz: 61.5, floor: 'cavern', lift: 0, yaw: Math.PI / 2, light: true },
  { lx: 35.0, lz: 61.5, floor: 'cavern', lift: 0, yaw: -Math.PI / 2, light: true },
  { lx: 4.0, lz: 48.0, floor: 'cavern', lift: 0, yaw: 0, light: true },
  { lx: 22.0, lz: 68.0, floor: 'cavern', lift: 0, yaw: -Math.PI / 2, light: true },
  { lx: -9.5, lz: 85.0, floor: 'cavern', lift: 0, yaw: 0, light: true },
  { lx: -3.5, lz: 177.5, floor: 'moria', lift: 0, yaw: 0, light: true },
  { lx: 3.5, lz: 218.5, floor: 'moria', lift: 0, yaw: Math.PI, light: true },
];

/** Summary: Every floor torch stand in the mine, in one list for the model and the collider table. */
export const MINE_FLOOR_TORCH_STANDS: readonly IMineFloorTorch[] = [
  MINE_LAGOON_DOCK_TORCH,
  ...MINE_MORIA_SANCTUARY_TORCHES,
  ...MINE_GROUND_TORCHES,
];
// #endregion

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
