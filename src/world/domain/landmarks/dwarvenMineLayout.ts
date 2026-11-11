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

// ======================== MESS HALL ======================== \\
// #region Mess Hall
/**
 * Summary: Room 1 mess hall: two long dining tables (with benches) and the stew cauldron on its brazier.
 * Design: lx/lz are local to the mine group. Table collider and model share lx, tableZs and tableHalfDepth.
 */
export const MINE_MESS_HALL = {
  lx: -14.0,
  tableZs: [56.0, 68.0],
  tableHalfLen: 4.6,
  tableHalfDepth: 1.8,
  tableHeight: 1.05,
  cauldron: { lz: 62.0, halfSize: 1.1, height: 1.65 },
} as const;
// #endregion

// ======================== ENTRANCE PORTAL ======================== \\
// #region Entrance Portal
/**
 * Summary: Timber portal at the mine entrance: four pillars in two rows, each row capped by a lintel.
 * Design: lx is local to the mine group (x from SOUTHERN_MINE_POS.x); z values are local to entranceZ; heights are
 *         above SOUTHERN_MINE_POS.entranceY. The lintel bottom is 4.04 m above the entrance, so a walker passes under it.
 */
export const MINE_PORTAL = {
  pillarX: 3.15,
  pillarZs: [0.2, 2.0],
  pillarHalf: 0.29,
  pillarHeight: 4.5,
  lintelHalfW: 3.7,
  lintelHalfD: 0.36,
  lintelHalfH: 0.31,
  lintelCentreY: 4.35,
} as const;
// #endregion

// ======================== MESS HALL SUPPLY CRATES ======================== \\
// #region Mess Hall Supply Crates
/**
 * Summary: The provisions and quartermaster supply crates beside the mess hall tables.
 * Design: Centres and footprints follow the model's loot crate (1.35 m square, 1.05 m tall, from lootCrateGeo).
 */
export const MINE_SUPPLY_CRATES = {
  lx: -22.5,
  halfX: 0.675,
  height: 1.05,
  provisions: { lz: 56.0, halfZ: 0.675 },
  quartermaster: { lz: 68.0, halfZ: 0.675 },
} as const;
// #endregion

// ======================== CHAMBER BOUNDS ======================== \\
// #region Chamber Bounds
/**
 * Summary: Footprint of each mine chamber, in local mine coordinates (lx from SOUTHERN_MINE_POS.x, lz from entranceZ).
 * Design: One table for both the "is the player inside the mine" test and the walkable-height function.
 *         These are the walkable-height numbers, which match where players actually stand. Before this table the
 *         two functions disagreed by 0.5–1.0 m at chamber edges.
 */
export const MINE_CHAMBER_BOUNDS = {
  /** Main entrance shaft: |lx| <= halfW, lzMin <= lz < lzMax. */
  shaft: { halfW: 4.5, lzMin: -1.2, lzMax: 34.0 },
  /** Room 1 (entry staging and mess hall). */
  room1: { halfW: 48.0, lzMin: 34.0, lzMax: 95.5 },
  /** West rail tunnel to the lagoon chamber. */
  westTunnel: { lxMin: -88.0, lxMax: -48.0, lzMin: 58.0, lzMax: 70.0 },
  /** Chamber 2: the lagoon cavern. */
  lagoonChamber: { lxMin: -148.5, lxMax: -88.0, lzMin: 38.0, lzMax: 112.0 },
  /** East rail tunnel to the foundry. */
  eastTunnel: { lxMin: 48.0, lxMax: 88.0, lzMin: 58.0, lzMax: 70.0 },
  /** Chamber 3: the foundry and treasury. */
  foundryChamber: { lxMin: 88.0, lxMax: 144.5, lzMin: 40.0, lzMax: 108.0 },
  /** South Grand Moria descent gallery: |lx| <= halfW. */
  southGallery: { halfW: 16.5, lzMin: 95.0, lzMax: 145.0 },
  /** Chamber 4: the Great Hall of Khazad-dûm and its abyss: |lx| <= halfW. */
  moriaHall: { halfW: 64.5, lzMin: 145.0, lzMax: 255.5 },
} as const;
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

// ======================== NORTH-WEST GALLERY ACCESS ======================== \\
// #region North-West Gallery
/**
 * Summary: North-west catwalk gallery and the stairs that reach it from the cavern floor.
 * Design: The physics has no climbing, so the access is a walkable run of steps (a ladder would be drawn
 *         but not usable). Each step is a solid box that rises by `rise`, so the top step meets the gallery.
 *         Positions are local to the mine group (x from SOUTHERN_MINE_POS.x, z from SOUTHERN_MINE_POS.entranceZ).
 */
export const MINE_NW_GALLERY = {
  lx: -13.5,
  lz: 38.5,
  width: 9.0,
  depth: 5.0,
  topY: SOUTHERN_MINE_POS.catwalkY,
  /**
   * Steps drawn from the cavern floor to the gallery top. The walkable surface is a sloped ramp over the same
   * run (southernMineWalkableHeightAt), since a box above the feet blocks the player.
   */
  stepCount: 14,
  stepRun: 0.4,
  stepWidth: 4.0,
} as const;

/** Summary: Rise of one step (metres), from the cavern floor to the gallery top. */
export function mineNwGalleryStepRise(): number {
  return (MINE_NW_GALLERY.topY - SOUTHERN_MINE_POS.cavernFloorY) / MINE_NW_GALLERY.stepCount;
}

/** Summary: Local x of step k (1-based, k = 1 is the lowest, furthest west step). */
export function mineNwGalleryStepX(k: number): number {
  const westEdge = MINE_NW_GALLERY.lx - MINE_NW_GALLERY.width / 2;
  return westEdge - MINE_NW_GALLERY.stepCount * MINE_NW_GALLERY.stepRun + (k - 0.5) * MINE_NW_GALLERY.stepRun;
}
// #endregion

// ======================== KHAZAD BRIDGE RAILS ======================== \\
// #region Khazad Bridge Rails
/**
 * Summary: The arched Bridge of Khazad-dûm across the Moria abyss, and its side rails.
 * Design: The deck is split into `segments` pieces along z. Each piece sits on an arch whose height is
 *         `archHeight` at mid-span; the rails sit on both edges of the deck, `railX` from the centre line.
 */
export const MINE_KHAZAD_BRIDGE = {
  z0: 178.0,
  length: 40.0,
  segments: 10,
  archHeight: 1.15,
  deckHalfWidth: 3.4,
  railX: 3.3,
  railHalfThickness: 0.1,
  railHeight: 1.0,
} as const;

/** Summary: Mid-z and deck y of bridge segment s (0-based), from the arch profile. */
export function khazadBridgeSegment(s: number): { readonly bz: number; readonly um: number; readonly deckY: number } {
  const u0 = s / MINE_KHAZAD_BRIDGE.segments;
  const u1 = (s + 1) / MINE_KHAZAD_BRIDGE.segments;
  const um = (u0 + u1) * 0.5;
  return {
    bz: MINE_KHAZAD_BRIDGE.z0 + um * MINE_KHAZAD_BRIDGE.length,
    um,
    deckY: mineFloorY('moria') + Math.sin(um * Math.PI) * MINE_KHAZAD_BRIDGE.archHeight,
  };
}
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
