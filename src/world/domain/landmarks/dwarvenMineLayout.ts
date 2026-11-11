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
export type MineFloorLevel = 'cavern' | 'moria' | 'lagoon' | 'foundry';

/** Summary: World y of a named mine floor, from SOUTHERN_MINE_POS. */
export function mineFloorY(level: MineFloorLevel): number {
  switch (level) {
    case 'cavern':
      return SOUTHERN_MINE_POS.cavernFloorY;
    case 'moria':
      return SOUTHERN_MINE_POS.moriaHallFloorY;
    case 'lagoon':
      return SOUTHERN_MINE_POS.westLagoonFloorY;
    case 'foundry':
      return SOUTHERN_MINE_POS.eastFoundryFloorY;
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

// ======================== CAVERN WALLS AND SHAFT ======================== \\
// #region Cavern Walls and Shaft
/**
 * Summary: Room 1 perimeter walls, split to leave the tunnel openings and the Moria opening, plus the sloped shaft walls.
 * Design: The drawn walls are `thick` thick and span cavern floor -0.7 m to cavern ceiling +0.7 m (the model's
 *         geometry is cavernHeight + 1.4 tall, centred half a height up). Local lx/lz as elsewhere in this module.
 */
export const MINE_CAVERN_WALLS = {
  thick: 3.2,
  /** Side walls on x = +-sideWallX, one north and one south of the east-west tunnel opening. */
  sideWallX: 49.0,
  sideWallNorthLz: 45.8,
  sideWallNorthLength: 26.0,
  sideWallSouthLz: 83.25,
  sideWallSouthLength: 28.5,
  /** North flank walls on z = northFlankLz, either side of the shaft at lx = +-northFlankX. */
  northFlankLz: 34.0,
  northFlankX: 26.4,
  northFlankLength: 46.5,
  /** South flank walls on z = southFlankLz, either side of the Moria opening at lx = +-southFlankX. */
  southFlankLz: 96.0,
  southFlankX: 33.2,
  southFlankLength: 35.0,
} as const;

/**
 * Summary: The sloped shaft walls. Each wall (x = +-3.85, 1.6 thick, 10.5 tall) follows the shaft floor.
 * Design: Split into `segments` boxes along z, each positioned on the slope at its own centre. This matches the
 *         drawn tilt to within a few centimetres, which a single axis-aligned box cannot do.
 */
export const MINE_SHAFT_WALLS = {
  xCentre: 3.85,
  thick: 1.6,
  height: 10.5,
  midLz: (3.5 + 34.0) * 0.5,
  /** Span of the drawn wall along the slope, projected onto z: (slope length + 3.2) * cos(angle). */
  segments: 6,
} as const;

/** Summary: Tilt of the shaft floor (rise over run). */
export function mineShaftTan(): number {
  const shaftLen = SOUTHERN_MINE_POS.shaftEndZ - SOUTHERN_MINE_POS.shaftStartZ;
  const shaftDrop = SOUTHERN_MINE_POS.entranceY - SOUTHERN_MINE_POS.cavernFloorY;
  return shaftDrop / shaftLen;
}

/** Summary: Local z span of the drawn shaft walls, from the slope length and angle. */
export function mineShaftSpan(): { readonly lzMin: number; readonly lzMax: number } {
  const shaftLen = SOUTHERN_MINE_POS.shaftEndZ - SOUTHERN_MINE_POS.shaftStartZ;
  const shaftDrop = SOUTHERN_MINE_POS.entranceY - SOUTHERN_MINE_POS.cavernFloorY;
  const slopeLen = Math.hypot(shaftLen, shaftDrop);
  const angle = Math.atan2(shaftDrop, shaftLen);
  const half = ((slopeLen + 3.2) * Math.cos(angle)) / 2;
  return { lzMin: MINE_SHAFT_WALLS.midLz - half, lzMax: MINE_SHAFT_WALLS.midLz + half };
}
// #endregion

// ======================== SOUTH GALLERY AND MORIA WALLS ======================== \\
// #region South Gallery and Moria Walls
/**
 * Summary: Walls of the south Moria descent gallery (sloped) and of the Great Hall of Khazad-dûm (straight).
 * Design: Heights are world y relative to the Moria floor (moriaHallFloorY) unless noted. The gallery walls are
 *         split into segments along z so each follows the slope; the Moria walls are single boxes.
 */
export const MINE_SOUTH_GALLERY = {
  wallX: 16.6,
  thick: 2.2,
  height: 16.0,
  lzMin: 95.0,
  lzMax: 145.0,
  centreLz: 120.0,
  /** Wall centre height above the cavern/Moria mid-level (matches the model). */
  centreDy: 3.6,
  segments: 6,
} as const;

export const MINE_MORIA_WALLS = {
  thick: 3.2,
  sideWallX: 64.5,
  sideWallLz: 200.0,
  sideWallLength: 114.0,
  sideWallHeight: 48.0,
  backWallLz: 255.5,
  backWallHalfX: 66.0,
  backWallHeight: 48.0,
  /** Y centre of the side and back walls, relative to the Moria floor. */
  wallCentreDy: -5.0,
  northFlankX: 40.5,
  northFlankLz: 145.0,
  northFlankLength: 50.5,
  northFlankHeight: 22.0,
  northFlankCentreDy: 8.0,
} as const;
// #endregion

// ======================== CHAMBER AND TUNNEL WALLS ======================== \
// #region Chamber and Tunnel Walls
/**
 * Summary: Walls of the lagoon chamber (chamber 2), the foundry chamber (chamber 3) and the two sloped rail tunnels.
 * Design: Chamber walls are straight boxes over a floor (heights relative to that floor). The tunnel walls follow the
 *         tunnel floor, so they are split into segments along x. Local lx/lz as elsewhere in this module.
 */
export const MINE_LAGOON_WALLS = {
  northSouthLx: -118.0,
  northSouthLength: 64.0,
  northLz: 38.0,
  southLz: 112.0,
  westLx: -148.5,
  westLz: 75.0,
  westLength: 78.0,
  eastNorthFlank: { lx: -88.0, lz: 47.8, length: 22.5 },
  eastSouthFlank: { lx: -88.0, lz: 91.2, length: 44.5 },
  thick: 3.2,
  height: 15.0,
  centreDy: 6.25,
} as const;

export const MINE_FOUNDRY_WALLS = {
  northSouthLx: 116.0,
  northSouthLength: 60.0,
  northLz: 40.0,
  southLz: 108.0,
  eastLx: 144.5,
  eastLength: 72.0,
  eastLz: 74.0,
  westNorthFlank: { lx: 88.0, lz: 48.8, length: 21.0 },
  westSouthFlank: { lx: 88.0, lz: 89.2, length: 41.0 },
  thick: 3.2,
  height: 14.0,
  centreDy: 6.0,
} as const;

export const MINE_TUNNEL_WALLS = {
  thick: 1.4,
  height: 12.0,
  centreDy: 2.8,
  wallLzs: [58.3, 69.7],
  /** Tunnel wall segments along x. */
  segments: 6,
  westX: -68.0,
  eastX: 68.0,
} as const;
// #endregion

// ======================== MORIA PILLARS, ROYAL CHEST, CRANE MAST, FURNACES ======================== \\
// #region Single Objects
/** Summary: The sixteen colossal pillars of the Great Hall. Radius is the mid-shaft radius (1.85..2.15 m). */
export const MINE_MORIA_PILLARS = {
  xs: [-38.0, -20.0, 20.0, 38.0],
  zs: [154.0, 170.0, 224.0, 238.0],
  radius: 2.0,
  height: 16.0,
} as const;

/** Summary: The royal treasury chest on the south dais. Footprint and height from the model's chest geometry. */
export const MINE_ROYAL_CHEST = {
  lx: 0.0,
  lz: 242.5,
  halfX: 0.825,
  halfZ: 0.525,
  baseDy: 0.8,
  height: 0.95,
} as const;

/** Summary: The hoist crane mast on the cavern floor. */
export const MINE_CRANE_MAST = {
  lx: 16.0,
  lz: 76.0,
  half: 0.19,
  height: 9.6,
} as const;

/** Summary: Two blast furnaces in chamber 3 (foundry). Cylinder bottom radius 3.1, height 7.8. */
export const MINE_BLAST_FURNACES = {
  lx: 132.0,
  lzs: [56.0, 82.0],
  radius: 3.1,
  height: 7.8,
} as const;
// #endregion

// ======================== MORIA TRESTLE RAILS ======================== \\
// #region Trestle Rails
/**
 * Summary: The rails along both edges of the west Moria trestle bridge. Local lx/lz as elsewhere in this module.
 * Design: The deck is deckHalfWidth from its centre line. Each rail is a rail line (railThick wide, railHeight tall),
 *         set just inside the deck edge, and is drawn as a top bar with posts every postSpacing metres.
 */
export const MINE_TRESTLE = {
  deckLx: -11.5,
  deckLz: 198.0,
  deckHalfWidth: 3.4,
  deckLength: 40.5,
  railThick: 0.2,
  railInset: 0.1,
  railHeight: 1.1,
  barHeight: 0.12,
  postSpacing: 5.0,
} as const;
// #endregion

// ======================== LAGOON, CRATES AND AMETHYST ======================== \\
// #region Lagoon Objects
/** Summary: The two rope rails of the lagoon plank bridge (local lx/lz; heights relative to the lagoon floor). */
export const MINE_LAGOON_BRIDGE = {
  lx: -118.0,
  lzs: [70.65, 75.35],
  deckDy: 0.32,
  ropeDy: 1.05,
  ropeRadius: 0.045,
  ropeLength: 33.4,
} as const;

/** Summary: The waterfall cliff north of the lagoon. Its core box is the collider; the group sits at (lx, lz). */
export const MINE_WATERFALL_CLIFF = {
  lx: -118.0,
  lz: 50.8,
  coreLx: 0.0,
  coreLz: -1.2,
  coreY: 6.1,
  coreW: 9.6,
  coreH: 12.6,
  coreD: 6.2,
} as const;

/** Summary: A lootable supply crate (1.35 m square, 1.05 m tall). Centre and floor are per crate. */
export const MINE_LOOT_CRATE = { half: 0.675, height: 1.05 } as const;
export const MINE_DOCK_CRATE = { lx: -112.0, lz: 95.5, floor: 'lagoon', lift: 0.28 } as const;
export const MINE_VAULT_CRATE = { lx: 122.0, lz: 66.0, floor: 'foundry', lift: 0.0 } as const;

/** Summary: The amethyst cluster: nine crystal spires around a central one, drawn from the same numbers. */
export const MINE_AMETHYST = { lx: -141.0, lz: 73.0, spireCount: 9, baseRadius: 0.56, spireHeight: 2.8 } as const;

/** Summary: Spire placement and scale, shared by the model and the collider envelope. */
export function mineAmethystSpires(): ReadonlyArray<{ readonly x: number; readonly y: number; readonly z: number; readonly sx: number; readonly sy: number; readonly sz: number }> {
  return Array.from({ length: MINE_AMETHYST.spireCount }, (_, s) => {
    const ang = (s / MINE_AMETHYST.spireCount) * Math.PI * 2;
    const rad = s === 0 ? 0 : 0.85 + (s % 2) * 0.45;
    const sc = s === 0 ? 2.1 : 1.15 + (s % 3) * 0.25;
    return { x: Math.cos(ang) * rad, y: 0.35, z: Math.sin(ang) * rad, sx: sc * 0.85, sy: sc * 1.35, sz: sc * 0.85 };
  });
}

/** Summary: Footprint radius and top height of the amethyst cluster, from its spires. */
export function mineAmethystEnvelope(): { readonly radius: number; readonly top: number } {
  let radius = 0;
  let top = 0;
  for (const sp of mineAmethystSpires()) {
    radius = Math.max(radius, Math.hypot(sp.x, sp.z) + MINE_AMETHYST.baseRadius * sp.sx);
    top = Math.max(top, sp.y + MINE_AMETHYST.spireHeight * sp.sy);
  }
  return { radius, top };
}
// #endregion

// ======================== ORE ROCKS ======================== \\
// #region Ore Rocks
/**
 * Summary: The eight miner-station ore rocks in Room 1. Position is local (lx, lz). These are the same sites as
 *          DWARVEN_MINER_STATIONS in the caravan system, which reads them from here.
 * Design: Each rock is a dodecahedron (radius 1.15) scaled 1.12 wide, with a smaller rock stacked on top (radius
 *         1.15 * 0.88, reaching 2.05 + 1.15 * 1.05 above the floor). The collider is the lower rock's footprint and
 *         the full stack height.
 */
export const MINE_ORE_ROCK_SITES: ReadonlyArray<{ readonly lx: number; readonly lz: number }> = [
  { lx: -28.0, lz: 42.8 },
  { lx: 24.2, lz: 78.5 },
  { lx: -43.2, lz: 49.5 },
  { lx: -43.2, lz: 78.5 },
  { lx: 27.5, lz: 44.8 },
  { lx: 35.8, lz: 76.0 },
  { lx: -28.5, lz: 89.2 },
  { lx: 43.2, lz: 50.5 },
];
export const MINE_ORE_ROCK = {
  radius: 1.15 * 1.12,
  top: 2.05 + 1.15 * 1.05,
} as const;
// #endregion

// ======================== MINECART ROUTES ======================== \\
// #region Minecart Routes
export interface IMinecartRouteConfig {
  readonly id: string;
  readonly startLocalX: number;
  readonly startLocalZ: number;
  readonly endLocalX: number;
  readonly endLocalZ: number;
  readonly baseYOffset?: number;
  readonly yaw: number;
  readonly cycleDuration: number;
  readonly phaseOffset: number;
  readonly oreKind: 'gold' | 'silver' | 'emerald' | 'sapphire' | 'amethyst';
}

/**
 * Summary: Stationary Gold & Silver Ore Carts parked on sidings across Room 1, Chamber 3 (Foundry), and Chamber 4 (Moria).
 * Design: Ore carts never move automatically by themselves; only player-operated rideable minecarts move on the main tracks.
 */
export const DWARVEN_MINECART_ROUTES: readonly IMinecartRouteConfig[] = [
  // Cart 0: Stationary Gold Ore Cart on Room 1 Central North Siding
  {
    id: 'minecart-staging-gold-1',
    startLocalX: 5.5,
    startLocalZ: 50.0,
    endLocalX: 5.5,
    endLocalZ: 50.0,
    yaw: 0,
    cycleDuration: 22.0,
    phaseOffset: 0.0,
    oreKind: 'gold',
  },
  // Cart 1: Stationary Silver Ore Cart on Room 1 Central South Siding
  {
    id: 'minecart-staging-silver-1',
    startLocalX: 5.5,
    startLocalZ: 74.0,
    endLocalX: 5.5,
    endLocalZ: 74.0,
    yaw: 0,
    cycleDuration: 24.0,
    phaseOffset: 0.35,
    oreKind: 'silver',
  },
  // Cart 2: Stationary Gold Ore Cart near Room 1 Hoist Crane Spur
  {
    id: 'minecart-crane-gold-2',
    startLocalX: 16.5,
    startLocalZ: 56.0,
    endLocalX: 16.5,
    endLocalZ: 56.0,
    yaw: 0,
    cycleDuration: 25.0,
    phaseOffset: 0.65,
    oreKind: 'gold',
  },
  // Cart 3: Stationary Silver Ore Cart on Room 1 East Siding
  {
    id: 'minecart-east-siding-silver-2',
    startLocalX: 26.5,
    startLocalZ: 56.0,
    endLocalX: 26.5,
    endLocalZ: 56.0,
    yaw: Math.PI / 2,
    cycleDuration: 21.0,
    phaseOffset: 0.18,
    oreKind: 'silver',
  },
  // Cart 4: Stationary Gold Ore Cart in Chamber 3 (East Smelting Foundry)
  {
    id: 'minecart-foundry-gold',
    startLocalX: 114.0,
    startLocalZ: 56.0,
    endLocalX: 114.0,
    endLocalZ: 56.0,
    baseYOffset: SOUTHERN_MINE_POS.eastFoundryFloorY - SOUTHERN_MINE_POS.cavernFloorY,
    yaw: Math.PI / 2,
    cycleDuration: 23.0,
    phaseOffset: 0.52,
    oreKind: 'gold',
  },
  // Cart 5: Stationary Silver Ore Cart in Chamber 3 (East Smelting Foundry)
  {
    id: 'minecart-foundry-silver',
    startLocalX: 114.0,
    startLocalZ: 76.0,
    endLocalX: 114.0,
    endLocalZ: 76.0,
    baseYOffset: SOUTHERN_MINE_POS.eastFoundryFloorY - SOUTHERN_MINE_POS.cavernFloorY,
    yaw: Math.PI / 2,
    cycleDuration: 20.0,
    phaseOffset: 0.82,
    oreKind: 'silver',
  },
];

/** Summary: Half extents of a stationary ore cart body (1.42 x 2.05 m) and its top; the cart sits on its route floor. */
export const MINE_CART_BODY = { halfX: 0.71, halfZ: 1.025, bottomDy: 0.2, topDy: 1.08 } as const;
// #endregion

// ======================== ENTRANCE PORTAL ======================== \
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
