// ============================================================================
// MODULE: World / Domain / Landmarks / Dwarven Mine Layout
// DESIGN: Single Source of Truth for the Southern Dwarven Mine geometry,
//         colliders, walkable floors, stairs, bridges, torches, and chambers.
// SUMMARY: Defines local coordinates (origin = (SOUTHERN_MINE_POS.x, 0, SOUTHERN_MINE_POS.entranceZ))
//          for the Entrance Shaft, Room 1 (Mess Hall), Chamber 2 (Lagoon), Chamber 3 (Foundry),
//          the deepened South Grand Descent with Middle Staircase, Chamber 4 (Great Hall of Khazad-dûm
//          with 40m Abyss, 24m Pillars, and enlarged 72m Bridge + Side Minecart Track),
//          Exit 1 (West Split Y-Tunnel -> Hall of the Mountain Kings & Crystal Sanctum),
//          and Exit 2 (East Tunnel -> Dragon-Forge & Titan Anvil Vault).
// ============================================================================

import { SOUTHERN_MINE_POS } from './dwarvenLandmarks';

// ======================== FLOOR HEIGHT LOOKUP ======================== \\
// #region Floor Height Lookup
export type IMineFloorName = 'cavern' | 'lagoon' | 'foundry' | 'moria';

export function mineFloorY(floor: IMineFloorName): number {
  switch (floor) {
    case 'cavern':
      return SOUTHERN_MINE_POS.cavernFloorY;
    case 'lagoon':
      return SOUTHERN_MINE_POS.westLagoonFloorY;
    case 'foundry':
      return SOUTHERN_MINE_POS.eastFoundryFloorY;
    case 'moria':
      return SOUTHERN_MINE_POS.moriaHallFloorY;
  }
}
// #endregion

// ======================== CHAMBER BOUNDS ======================== \\
// #region Chamber Bounds
export const MINE_CHAMBER_BOUNDS = {
  shaft: { halfW: 3.8, lzMin: -1.0, lzMax: 34.0 },
  room1: { halfW: 48.0, lzMin: 34.0, lzMax: 95.5 },
  westTunnel: { lxMin: -88.0, lxMax: -48.0, lzMin: 58.5, lzMax: 69.5 },
  lagoonChamber: { lxMin: -148.0, lxMax: -88.0, lzMin: 38.0, lzMax: 112.0 },
  eastTunnel: { lxMin: 48.0, lxMax: 88.0, lzMin: 58.5, lzMax: 69.5 },
  foundryChamber: { lxMin: 88.0, lxMax: 144.0, lzMin: 40.0, lzMax: 108.0 },
  southGallery: { halfW: 16.0, lzMin: 95.0, lzMax: 165.0 },
  moriaHall: { halfW: 65.0, lzMin: 165.0, lzMax: 310.0 },
  westSplitStem: { lxMin: -102.0, lxMax: -65.0, lzMin: 176.0, lzMax: 190.0 },
  westSplitHub: { lxMin: -130.0, lxMax: -102.0, lzMin: 168.0, lzMax: 198.0 },
  westNorthBranch: { lxMin: -128.0, lxMax: -114.0, lzMin: 146.0, lzMax: 168.0 },
  hallOfKings: { lxMin: -152.0, lxMax: -106.0, lzMin: 104.0, lzMax: 146.0 },
  westSouthBranch: { lxMin: -128.0, lxMax: -114.0, lzMin: 198.0, lzMax: 220.0 },
  crystalSanctum: { lxMin: -152.0, lxMax: -106.0, lzMin: 220.0, lzMax: 264.0 },
  moriaEastTunnel: { lxMin: 65.0, lxMax: 102.0, lzMin: 176.0, lzMax: 190.0 },
  dragonForgeChamber: { lxMin: 102.0, lxMax: 150.0, lzMin: 154.0, lzMax: 212.0 },
} as const;
// #endregion

// ======================== ENTRANCE PORTAL & SHAFT ======================== \\
// #region Entrance Portal & Shaft
export const MINE_PORTAL = {
  pillarX: 3.1,
  pillarZs: [-0.35, 3.65] as const,
  pillarHalf: 0.34,
  pillarHeight: 4.5,
  lintelHalfW: 3.7,
  lintelHalfH: 0.31,
  lintelHalfD: 0.38,
  lintelCentreY: 4.65,
} as const;

/**
 * Summary: Sloped entrance shaft walls (lz: 3.5..34.0).
 *          Clamped to height = 4.8m and centreDy = 1.6m so neither the 3D shaft wall mesh
 *          nor any `southern-mine-shaft-*` collider box ever protrudes above the mountain slope!
 */
export const MINE_SHAFT_WALLS = {
  xCentre: 3.85,
  thick: 1.6,
  height: 4.8,
  centreDy: 1.6,
  midLz: (3.5 + 34.0) * 0.5,
  segments: 6,
  segmentCount: 6,
} as const;

export function mineShaftSpan(): { lzMin: number; lzMax: number } {
  const shaftLen = SOUTHERN_MINE_POS.shaftEndZ - SOUTHERN_MINE_POS.shaftStartZ;
  const shaftDrop = SOUTHERN_MINE_POS.entranceY - SOUTHERN_MINE_POS.cavernFloorY;
  const slopeLen = Math.hypot(shaftLen, shaftDrop) + 3.2;
  const ang = Math.atan2(shaftDrop, shaftLen);
  const halfZ = (slopeLen * Math.cos(ang)) / 2;
  return {
    lzMin: MINE_SHAFT_WALLS.midLz - halfZ,
    lzMax: MINE_SHAFT_WALLS.midLz + halfZ,
  };
}

export function mineShaftTan(): number {
  const shaftLen = SOUTHERN_MINE_POS.shaftEndZ - SOUTHERN_MINE_POS.shaftStartZ;
  const shaftDrop = SOUTHERN_MINE_POS.entranceY - SOUTHERN_MINE_POS.cavernFloorY;
  return shaftDrop / shaftLen;
}
// #endregion

// ======================== ROOM 1: CENTRAL STAGING & MESS HALL ======================== \\
// #region Room 1 — Central Staging & Mess Hall
export const MINE_CAVERN_WALLS = {
  thick: 3.0,
  sideWallX: 49.0,
  sideWallNorthLz: 46.25,
  sideWallNorthLength: 24.5,
  sideWallSouthLz: 82.75,
  sideWallSouthLength: 26.5,
  northFlankX: 27.0,
  northFlankLz: 34.0,
  northFlankLength: 46.0,
  southFlankX: 33.0,
  southFlankLz: 96.0,
  southFlankLength: 34.0,
  width: 98.0,
  length: 62.0,
} as const;

export const MINE_TIMBER_ARCH = {
  postOffset: 2.85,
  postHalf: 0.52,
  postTop: 5.9,
} as const;

export const MINE_ROOM1_ARCHES = [
  { lx: 0.0, lz: 35.2, yaw: 0.0 },
  { lx: -46.8, lz: 64.0, yaw: Math.PI / 2 },
  { lx: 46.8, lz: 64.0, yaw: -Math.PI / 2 },
] as const;

export const MINE_MESS_HALL = {
  lx: -22.0,
  tableZs: [48.5, 75.5] as const,
  tableHalfLen: 4.6,
  tableHalfDepth: 1.75,
  tableHeight: 1.15,
  cauldron: {
    lz: 62.0,
    halfSize: 1.45,
    height: 1.85,
  },
} as const;

export const MINE_SUPPLY_CRATES = {
  lx: -22.0,
  halfX: 0.72,
  height: 1.45,
  provisions: { lz: 55.2, halfZ: 0.72 },
  quartermaster: { lz: 68.8, halfZ: 0.72 },
} as const;

export const MINE_SCAFFOLD_LEGS = {
  radius: 0.24,
  height: 3.8,
  positions: [
    [9.0, 38.5],
    [16.0, 38.5],
    [23.0, 38.5],
    [9.0, 48.0],
    [16.0, 48.0],
    [23.0, 48.0],
    [-21.5, 38.5],
    [-14.5, 38.5],
    [-21.5, 42.5],
    [-14.5, 42.5],
  ] as const,
} as const;

export const MINE_HOIST_CRANE = {
  offsetX: 16.0,
  offsetZ: 43.0,
  postSpan: 2.2,
  postHalfSize: 0.19,
  towerHeight: 9.6,
} as const;

export const MINE_CRANE_MAST = {
  lx: 16.0,
  lz: 76.0,
  half: 0.19,
  height: 9.6,
} as const;

export const MINE_NW_GALLERY = {
  lx: -18.0,
  lz: 40.5,
  width: 9.0,
  depth: 5.0,
  topY: SOUTHERN_MINE_POS.catwalkY,
  stepCount: 16,
  stepRun: 0.55,
  stepWidth: 4.2,
} as const;

export function mineNwGalleryStepRise(): number {
  return (MINE_NW_GALLERY.topY - SOUTHERN_MINE_POS.cavernFloorY) / MINE_NW_GALLERY.stepCount;
}

export function mineNwGalleryStepX(k: number): number {
  const nwWestEdge = MINE_NW_GALLERY.lx - MINE_NW_GALLERY.width / 2;
  const nwStairStart = nwWestEdge - MINE_NW_GALLERY.stepCount * MINE_NW_GALLERY.stepRun;
  return nwStairStart + (k - 0.5) * MINE_NW_GALLERY.stepRun;
}
// #endregion

// ======================== CHAMBERS 2 & 3 AND SIDE TUNNELS ======================== \\
// #region Chambers 2 & 3 and Side Tunnels
export const MINE_TUNNEL_WALLS = {
  westX: -68.0,
  eastX: 68.0,
  wallLzs: [57.2, 70.8] as const,
  thick: 1.8,
  height: 7.4,
  centreDy: 2.6,
  segments: 5,
} as const;

export function mineTunnelArchSites(): {
  side: 'west' | 'east';
  f: number;
  lx: number;
  ly: number;
  lz: number;
  yaw: number;
}[] {
  const cavernFloorY = SOUTHERN_MINE_POS.cavernFloorY;
  const ch2FloorY = SOUTHERN_MINE_POS.westLagoonFloorY;
  const ch3FloorY = SOUTHERN_MINE_POS.eastFoundryFloorY;
  const westDrop = cavernFloorY - ch2FloorY;
  const eastDrop = cavernFloorY - ch3FloorY;
  const out: {
    side: 'west' | 'east';
    f: number;
    lx: number;
    ly: number;
    lz: number;
    yaw: number;
  }[] = [];
  for (let f = 1; f <= 4; f++) {
    const t = f / 5;
    out.push({
      side: 'west',
      f,
      lx: -48.0 - t * 40.0,
      ly: cavernFloorY - t * westDrop,
      lz: 64.0,
      yaw: Math.PI / 2,
    });
    out.push({
      side: 'east',
      f,
      lx: 48.0 + t * 40.0,
      ly: cavernFloorY - t * eastDrop,
      lz: 64.0,
      yaw: -Math.PI / 2,
    });
  }
  return out;
}

export const MINE_RAIL_TURNTABLE = {
  lx: 0.0,
  lz: 64.0,
  radius: 4.6,
  outerRadius: 4.6,
  innerRadius: 3.8,
  controlBooth: {
    lx: 8.4,
    lz: 51.5,
    halfX: 1.4,
    halfZ: 1.2,
    height: 2.8,
  },
} as const;

export const MINE_LAGOON_WALLS = {
  thick: 3.0,
  height: 14.0,
  centreDy: 6.2,
  northSouthLx: -118.0,
  northSouthLength: 64.0,
  northLz: 37.0,
  /** North wall flanks leaving an 8m secret doorway behind the waterfall at lx in [-122.0, -114.0] */
  northWestFlankLx: -136.0,
  northWestFlankLength: 28.0,
  northEastFlankLx: -100.0,
  northEastFlankLength: 28.0,
  northWestFlank: { lx: -136.0, length: 28.0 },
  northEastFlank: { lx: -100.0, length: 28.0 },
  southLz: 113.0,
  westLx: -149.0,
  westLz: 75.0,
  westLength: 78.0,
  eastNorthFlank: { lx: -88.0, lz: 47.25, length: 22.5 },
  eastSouthFlank: { lx: -88.0, lz: 91.25, length: 43.5 },
} as const;

/**
 * Summary: Waterfall cliff flanks leaving a 5.2m-wide walkable secret tunnel (lx: -120.6..-115.4) directly behind the waterfall sheet.
 */
export const MINE_WATERFALL_CLIFF = {
  lx: -118.0,
  lz: 49.8,
  coreLx: 0.0,
  coreY: 5.8,
  coreLz: -0.6,
  coreW: 9.6,
  coreH: 12.4,
  coreD: 4.8,
  flankOffsetLx: 4.8,
  flankW: 4.4,
} as const;

/**
 * Summary: Secret passage and hidden chamber behind the Chamber 2 waterfall (Reference Image 8).
 *          Features an ancient circular stone rune doorway on the north wall and a secret treasure chest.
 */
export const MINE_WATERFALL_SECRET_CHAMBER = {
  minLx: -126.0,
  maxLx: -110.0,
  lxCentre: -118.0,
  width: 16.0,
  minLz: 22.0,
  maxLz: 38.0,
  lzCentre: 30.0,
  length: 16.0,
  passageMinLx: -121.5,
  passageMaxLx: -114.5,
  passageMaxLz: 54.5,
  floorY: -15.25,
  height: 10.5,
  thick: 2.4,
  wallThick: 2.4,
  chestLx: -118.0,
  chestLz: 26.5,
  chestHalfX: 0.85,
  chestHalfZ: 0.55,
  chestHeight: 0.95,
} as const;

/**
 * Summary: Mechanical Dwarven Water Wheel & Aqueduct system in Chamber 2 connecting continuously to the Lower Chasm Waterfall in Chamber 4.
 */
export const MINE_WATERWORKS = {
  wheelLx: -99.5,
  wheelLz: 84.0,
  wheelRadius: 4.6,
  wheelWidth: 1.8,
  supportHalfX: 1.6,
  supportHalfZ: 5.2,
  supportHeight: 6.8,
  aqueductLx: -99.5,
  aqueductMinLz: 76.0,
  aqueductMaxLz: 112.0,
  chasmWaterfallLx: -58.0,
  chasmWaterfallLz: 212.0,
  lowerChasmWaterfallLx: -58.0,
  lowerChasmWaterfallLz: 212.0,
} as const;

export const MINE_LAGOON_BRIDGE = {
  lx: -118.0,
  lzs: [70.85, 75.15] as const,
  deckDy: 0.32,
  ropeDy: 1.18,
  ropeRadius: 0.045,
  ropeLength: 32.8,
} as const;

export const MINE_AMETHYST = {
  lx: -141.0,
  lz: 73.0,
} as const;

export function mineAmethystSpires(): {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}[] {
  const out = [];
  for (let s = 0; s < 9; s++) {
    const ang = (s / 9) * Math.PI * 2;
    const rad = s === 0 ? 0 : 1.3 + (s % 2) * 0.85;
    const sc = s === 0 ? 2.15 : 1.1 + (s % 3) * 0.35;
    out.push({
      x: Math.cos(ang) * rad,
      y: 0,
      z: Math.sin(ang) * rad,
      sx: sc,
      sy: sc * 1.45,
      sz: sc,
    });
  }
  return out;
}

export function mineAmethystEnvelope(): { radius: number; top: number } {
  return { radius: 2.9, top: 8.8 };
}

export const MINE_FOUNDRY_WALLS = {
  thick: 3.0,
  height: 13.5,
  centreDy: 6.0,
  northSouthLx: 116.0,
  northSouthLength: 60.0,
  northLz: 39.0,
  southLz: 109.0,
  eastLx: 145.0,
  eastLz: 74.0,
  eastLength: 72.0,
  westNorthFlank: { lx: 88.0, lz: 48.25, length: 20.5 },
  westSouthFlank: { lx: 88.0, lz: 89.25, length: 39.5 },
} as const;

/**
 * Summary: Multi-elevation Mining Gallery terrace & walkable ramp in the anterior half of Chamber 3 (Area 4),
 *          plus the mechanical Stone-Crusher and 3 integrated Smelting Foundry blast furnaces (Area 5).
 */
export const MINE_GALLERY_TERRACE = {
  minLx: 92.0,
  maxLx: 112.0,
  minLz: 42.0,
  maxLz: 52.0,
  deckY: -11.15, // +3.2m above eastFoundryFloorY (-14.35)
  topY: -11.15,
  rampMinLx: 92.0,
  rampMaxLx: 96.5,
  rampMinLz: 52.0,
  rampMaxLz: 60.0,
} as const;

export const MINE_STONE_CRUSHER = {
  lx: 104.0,
  lz: 90.0,
  halfX: 3.2,
  halfZ: 2.4,
  height: 6.4,
} as const;

export const MINE_BLAST_FURNACES = {
  lx: 132.0,
  lzs: [50.0, 69.0, 88.0] as const,
  radius: 3.1,
  height: 7.8,
} as const;

export const MINE_LOOT_CRATE = {
  half: 0.72,
  height: 1.45,
} as const;

export const MINE_DOCK_CRATE = {
  lx: -112.0,
  lz: 95.5,
  floor: 'lagoon' as IMineFloorName,
  lift: 0.28,
} as const;

export const MINE_VAULT_CRATE = {
  lx: 122.0,
  lz: 66.0,
  floor: 'foundry' as IMineFloorName,
  lift: 0.0,
} as const;
// #endregion

// ======================== CHAMBER 4: GREAT HALL OF KHAZAD-DÛM & DEEP DESCENT ======================== \\
// #region Chamber 4 — Great Hall of Khazad-dûm, Middle Staircase Descent, Enlarged Bridge & 2 Exits
/**
 * Summary: Enlarged & deepened South Moria Descent Gallery (lz: 95..165, 70m long),
 *          descending 19.0m from Room 1 (y = -9.35) down to the Great Hall of Khazad-dûm (y = -28.35).
 *          Features a monumental carved stone staircase with a flat vaulted landing in the middle (lz: 116..144)
 *          on the pedestrian side (lx in [-7.5, +15.0]), while the West lane (lx in [-15.0, -7.5]) carries the minecart track!
 */
export const MINE_SOUTH_GALLERY = {
  lzMin: 95.0,
  lzMax: 165.0,
  centreLz: 130.0,
  length: 70.0,
  yStart: -9.35,
  yEnd: -28.35,
  wallX: 16.0,
  thick: 2.5,
  height: 9.0,
  centreDy: 3.4,
  segments: 7,
  /** Middle staircase & vaulted landing coordinates along lz */
  stairStartLz: 116.0,
  upperStairEndLz: 126.0,
  landingEndLz: 134.0,
  lowerStairEndLz: 144.0,
  upperRampEndY: -15.05,
  landingY: -18.85,
  lowerStairEndY: -22.65,
  stepCountPerFlight: 12,
  stepCount: 24,
  /** West lane (lx < -7.5) is a continuous ramp for the Moria minecart; East/Centre (lx >= -7.5) has the middle stairs & landing. */
  stairMinLx: -7.5,
  stairMaxLx: 14.5,
} as const;

/**
 * Summary: Computes the walkable floor/stair/landing height inside the South Moria Descent Gallery (lz in 95..165).
 */
export function southGalleryWalkableHeightAt(lx: number, lz: number): number {
  const G = MINE_SOUTH_GALLERY;
  const clampedLz = Math.max(G.lzMin, Math.min(G.lzMax, lz));
  // West rail ramp lane (lx < G.stairMinLx) slopes linearly for smooth minecart travel
  if (lx < G.stairMinLx) {
    const t = (clampedLz - G.lzMin) / (G.lzMax - G.lzMin);
    return G.yStart + t * (G.yEnd - G.yStart);
  }
  // Pedestrian corridor & Middle Staircase with Flat Central Landing:
  if (clampedLz <= G.stairStartLz) {
    const t = (clampedLz - G.lzMin) / (G.stairStartLz - G.lzMin);
    return G.yStart + t * (G.upperRampEndY - G.yStart);
  }
  if (clampedLz <= G.upperStairEndLz) {
    const t = (clampedLz - G.stairStartLz) / (G.upperStairEndLz - G.stairStartLz);
    return G.upperRampEndY + t * (G.landingY - G.upperRampEndY);
  }
  if (clampedLz <= G.landingEndLz) {
    return G.landingY;
  }
  if (clampedLz <= G.lowerStairEndLz) {
    const t = (clampedLz - G.landingEndLz) / (G.lowerStairEndLz - G.landingEndLz);
    return G.landingY + t * (G.lowerStairEndY - G.landingY);
  }
  const t = (clampedLz - G.lowerStairEndLz) / (G.lzMax - G.lowerStairEndLz);
  return G.lowerStairEndY + t * (G.yEnd - G.lowerStairEndY);
}

/**
 * Summary: Enlarged Great Hall of Khazad-dûm (lz: 165..310, lx: -65..+65, floor y = -28.35, ceiling height = 24.0m).
 *          Side walls at lx = ±65.0 split around lz in [176.0, 190.0] to create TWO GRAND EXITS in opposite directions,
 *          and the South Back Wall at lz = 310.0 splits around lx in [-7.0, +7.0] behind the Colossal Golem Guardian
 *          to open the Ancient Stone Passage leading into the southern Dragon Forge & Treasure Chamber!
 */
export const MINE_MORIA_WALLS = {
  thick: 3.2,
  sideWallX: 65.0,
  sideWallLz: 237.5,
  sideWallLength: 145.0,
  sideWallHeight: 24.5,
  wallCentreDy: 11.5,
  /** North & South flanks of the West/East side walls leaving a 14m doorway at lz in [176.0, 190.0] */
  sideNorthFlankLz: 170.5,
  sideNorthFlankLength: 11.0,
  sideSouthFlankLz: 250.0,
  sideSouthFlankLength: 120.0,
  westNorthSegLz: 170.5,
  westNorthSegLength: 11.0,
  westSouthSegLz: 250.0,
  westSouthSegLength: 120.0,
  eastNorthSegLz: 170.5,
  eastNorthSegLength: 11.0,
  eastSouthSegLz: 250.0,
  eastSouthSegLength: 120.0,
  exitDoorMinLz: 176.0,
  exitDoorMaxLz: 190.0,
  backWallLz: 310.0,
  backWallHalfX: 66.0,
  backWallHeight: 24.5,
  /** South back wall flanks around the 14m Ancient Stone Doorway (lx in [-7.0, +7.0]) */
  southGateHalfW: 7.0,
  southFlankX: 36.5,
  southFlankLength: 59.0,
  backWallWestFlank: { lx: -36.5, length: 59.0 },
  backWallEastFlank: { lx: 36.5, length: 59.0 },
  northFlankX: 40.5,
  northFlankLz: 165.0,
  northFlankLength: 49.0,
  northFlankHeight: 24.5,
  northFlankCentreDy: 11.5,
  chasmMinLz: 198.0,
  chasmMaxLz: 266.0,
} as const;

/**
 * Summary: 16 Colossal 24m-tall Pillars on the North & South Terraces + 4 Titanic 64m-tall Abyssal Piers rising from the chasm floor!
 */
export const MINE_MORIA_PILLARS = {
  xs: [-44.0, -20.0, 20.0, 44.0] as const,
  zs: [172.0, 192.0, 274.0, 294.0] as const,
  colX: [-44.0, -20.0, 20.0, 44.0] as const,
  rowZ: [172.0, 192.0, 274.0, 294.0] as const,
  abyssXs: [-20.0, 20.0] as const,
  abyssZs: [216.0, 248.0] as const,
  radius: 2.15,
  height: 24.0,
  abyssHeight: 64.0,
} as const;

/**
 * Summary: Enlarged 72m-long, 13.6m-wide Grand Bridge of Khazad-dûm spanning the 68m Abyss (lz: 196..268).
 *          The East/Central lane (lx: -2.0..+6.6) is the arched stone walkway;
 *          the West lane of the Bridge (lx: -6.6..-2.0, track at lx = -4.4) carries the Moria Minecart Track right across the side of the bridge!
 */
export const MINE_KHAZAD_BRIDGE = {
  lzStart: 196.0,
  lzEnd: 268.0,
  length: 72.0,
  width: 13.6,
  halfW: 6.8,
  segments: 18,
  segLen: 4.0,
  archHeight: 1.45,
  railX: 6.6,
  railHeight: 0.42,
  railHalfThickness: 0.12,
  trackLx: -4.4,
} as const;

export function khazadBridgeSegment(s: number): { bz: number; deckY: number } {
  const B = MINE_KHAZAD_BRIDGE;
  const bz = B.lzStart + (s + 0.5) * B.segLen;
  const uMid = (s + 0.5) / B.segments;
  const archOffset = Math.sin(uMid * Math.PI) * B.archHeight;
  return {
    bz,
    deckY: SOUTHERN_MINE_POS.moriaHallFloorY + archOffset,
  };
}

/**
 * Summary: Minecart Side-Deck Trestle integrated along the West side of the enlarged Bridge of Khazad-dûm (lx = -4.4, lz: 196..268).
 */
export const MINE_TRESTLE = {
  deckLx: -4.4,
  deckLz: 232.0,
  deckLength: 72.0,
  length: 72.0,
  deckHalfWidth: 2.2,
  railInset: 0.15,
  railThick: 0.22,
  railHeight: 0.38,
  barHeight: 0.18,
  postSpacing: 6.0,
  pierCount: 6,
} as const;

export const MINE_ROYAL_CHEST = {
  lx: 0.0,
  lz: 296.5,
  baseDy: 0.8,
  halfX: 0.85,
  halfZ: 0.55,
  height: 0.95,
} as const;

/**
 * Summary: Area 10 — Golem Guardian Chamber at the southern end of the Great Bridge (lz: 270..310).
 *          The Colossal Ancient Stone Golem Guardian stands astride the Ancient Stone Doorway (lz = 304.5),
 *          with massive stone legs/feet at lx = ±4.6 leaving a 6.4m walkable central passage (lx: -3.2..+3.2) into the Ancient Stone Passage.
 */
export const MINE_GOLEM_CHAMBER = {
  guardianLx: 0.0,
  guardianLz: 304.5,
  golemLx: 0.0,
  golemLz: 304.5,
  footOffsetLx: 4.6,
  footHalfX: 1.4,
  footHalfZ: 1.6,
  footHeight: 5.5,
  guardianHeight: 11.8,
  golemHeight: 11.8,
  chainPillarLx: 13.5,
  chainPillarLz: 288.0,
  chainPillarRadius: 1.4,
  chainPillarHeight: 18.0,
} as const;

/**
 * Summary: Area 10/11 — Ancient Stone Passage (lz: 310..346, lx: -7.0..+7.0) descending 6.0m from the Golem Guardian Chamber
 *          (y = -28.35) down into the southern Dragon Forge & Treasure Chamber (y = -34.35).
 */
export const MINE_ANCIENT_PASSAGE = {
  minLx: -7.0,
  maxLx: 7.0,
  halfW: 7.0,
  halfWidth: 7.0,
  width: 14.0,
  minLz: 310.0,
  maxLz: 346.0,
  centreLz: 328.0,
  length: 36.0,
  yStart: -28.35,
  yEnd: -34.35,
  startFloorY: -28.35,
  endFloorY: -34.35,
  height: 12.0,
  thick: 2.6,
  wallThick: 2.6,
  stepCount: 24,
} as const;

export function ancientPassageWalkableHeightAt(lz: number): number {
  const P = MINE_ANCIENT_PASSAGE;
  const t = Math.max(0, Math.min(1, (lz - P.minLz) / (P.maxLz - P.minLz)));
  return P.yStart + t * (P.yEnd - P.yStart);
}

/**
 * Summary: Area 11 — Southern Dragon Forge & Treasure Chamber (lx: -38..+38, lz: 346..414, floor y = -34.35).
 *          Built around a colossal architectural Dragon-Head Furnace carved into the southern rock wall (lz = 406.0)
 *          pouring molten lava into a central lava pool (lz: 360..398). Five solid stone stepping platforms cross the
 *          lava pool to a raised Treasure Island holding the Ancient Dwarven Treasure Chest.
 */
export const MINE_LAVA_STEPPING_STONES = [
  { lx: 0.0, lz: 363.2, radius: 2.45, topY: -34.25 },
  { lx: -2.1, lz: 368.0, radius: 2.45, topY: -34.15 },
  { lx: 0.0, lz: 373.0, radius: 2.55, topY: -34.05 },
  { lx: 2.1, lz: 378.0, radius: 2.45, topY: -33.95 },
  { lx: 0.0, lz: 382.8, radius: 2.45, topY: -33.85 },
] as const;

export const MINE_DRAGON_FORGE_SANCTUM = {
  minLx: -38.0,
  maxLx: 38.0,
  lxCentre: 0.0,
  width: 76.0,
  minLz: 346.0,
  maxLz: 414.0,
  lzCentre: 380.0,
  length: 68.0,
  terraceMaxLz: 360.0,
  floorY: -34.35,
  lavaPoolMinLz: 360.0,
  lavaPoolMaxLz: 398.0,
  lavaSurfaceY: -36.15,
  height: 16.5,
  thick: 2.8,
  wallThick: 2.8,
  northWestWall: { lx: -22.5, length: 31.0 },
  northEastWall: { lx: 22.5, length: 31.0 },
  treasureIsland: {
    minLx: -7.5,
    maxLx: 7.5,
    minLz: 385.5,
    maxLz: 396.5,
    topY: -33.75,
  },
  treasureChest: {
    lx: 0.0,
    lz: 391.0,
    halfX: 0.95,
    halfZ: 0.65,
    height: 1.05,
  },
  dragonFurnace: {
    lx: 0.0,
    lz: 406.0,
    halfX: 9.5,
    halfZ: 6.0,
    height: 15.5,
  },
} as const;

/**
 * Summary: Computes the walkable surface height inside the Southern Dragon Forge & Treasure Chamber (lz: 346..414).
 *          Returns the North Terrace height (-34.35), Stepping Stone top height, Treasure Island top height (-33.75),
 *          side walkways, or the shallow lava basin floor (-36.15) if the player steps off into the lava pool.
 */
export function dragonForgeSanctumWalkableHeightAt(lx: number, lz: number): number {
  const S = MINE_DRAGON_FORGE_SANCTUM;
  // 1) North Entrance Terrace (lz: 346..360.5) or Side Stone Catwalks (|lx| >= 26.0)
  if (lz <= S.terraceMaxLz + 0.5 || Math.abs(lx) >= 26.0 || lz >= S.lavaPoolMaxLz) {
    return S.floorY;
  }
  // 2) Raised Treasure Island (lx: -7.5..+7.5, lz: 385.5..396.5)
  const ti = S.treasureIsland;
  if (lx >= ti.minLx && lx <= ti.maxLx && lz >= ti.minLz && lz <= ti.maxLz) {
    return ti.topY;
  }
  // 3) Sequence of 5 Stone Stepping Platforms across the Lava Pool
  for (let i = 0; i < MINE_LAVA_STEPPING_STONES.length; i++) {
    const st = MINE_LAVA_STEPPING_STONES[i];
    if (Math.hypot(lx - st.lx, lz - st.lz) <= st.radius + 0.25) {
      return st.topY;
    }
  }
  // 4) Molten Lava Basin below the stepping stones
  return S.lavaSurfaceY;
}
// #endregion

// ======================== EXIT 1 (WEST): BIFURCATING TUNNEL & TWIN SANCTUMS ======================== \\
// #region Exit 1 (West from Great Hall) — Bifurcating Y-Tunnel, Hall of the Mountain Kings & Crystal Sanctum
export const MINE_WEST_SPLIT = {
  floorY: -28.35,
  thick: 2.6,
  tunnelHeight: 11.0,
  stem: {
    lxMin: -108.0,
    lxMax: -65.0,
    minLx: -108.0,
    maxLx: -65.0,
    minLz: 176.0,
    maxLz: 190.0,
    lxCentre: -86.5,
    length: 43.0,
    lzCentre: 183.0,
    halfW: 7.0,
    width: 14.0,
    height: 11.0,
  },
  hub: {
    lxMin: -124.0,
    lxMax: -108.0,
    minLx: -124.0,
    maxLx: -108.0,
    lxCentre: -116.0,
    width: 16.0,
    lzMin: 168.0,
    lzMax: 198.0,
    minLz: 168.0,
    maxLz: 198.0,
    lzCentre: 183.0,
    length: 30.0,
    height: 12.5,
    waystoneLx: -116.0,
    waystoneLz: 183.0,
    waystoneHalf: 1.35,
  },
  northBranch: {
    lxCentre: -118.0,
    halfW: 6.0,
    width: 12.0,
    minLx: -124.0,
    maxLx: -112.0,
    lzMin: 146.0,
    lzMax: 168.0,
    minLz: 146.0,
    maxLz: 168.0,
    lzCentre: 157.0,
    length: 22.0,
    height: 11.0,
  },
  southBranch: {
    lxCentre: -118.0,
    halfW: 6.0,
    width: 12.0,
    minLx: -124.0,
    maxLx: -112.0,
    lzMin: 198.0,
    lzMax: 220.0,
    minLz: 198.0,
    maxLz: 220.0,
    lzCentre: 209.0,
    length: 22.0,
    height: 11.0,
  },
  hallOfKings: {
    lxMin: -152.0,
    lxMax: -106.0,
    minLx: -152.0,
    maxLx: -106.0,
    lxCentre: -129.0,
    width: 46.0,
    lzMin: 104.0,
    lzMax: 146.0,
    minLz: 104.0,
    maxLz: 146.0,
    lzCentre: 125.0,
    length: 42.0,
    height: 17.5,
    statues: [
      { lx: -144.0, lz: 116.0, yaw: Math.PI / 2, role: 'warrior_axe' },
      { lx: -144.0, lz: 134.0, yaw: Math.PI / 2, role: 'king_hammer' },
      { lx: -114.0, lz: 116.0, yaw: -Math.PI / 2, role: 'guardian_shield' },
      { lx: -114.0, lz: 134.0, yaw: -Math.PI / 2, role: 'ancient_miner' },
    ] as const,
    statueHalf: 2.1,
    statueHeight: 10.5,
    throneLx: -129.0,
    throneLz: 109.5,
    throneHalfX: 3.2,
    throneHalfZ: 2.4,
    throneHeight: 5.8,
  },
  crystalSanctum: {
    lxMin: -152.0,
    lxMax: -106.0,
    minLx: -152.0,
    maxLx: -106.0,
    lxCentre: -129.0,
    width: 46.0,
    lzMin: 220.0,
    lzMax: 264.0,
    minLz: 220.0,
    maxLz: 264.0,
    lzCentre: 242.0,
    length: 44.0,
    height: 16.5,
    guardianLx: -129.0,
    guardianLz: 252.0,
    guardianHalf: 2.2,
    guardianHeight: 8.5,
  },
} as const;
// #endregion

// ======================== EXIT 2 (EAST): DRAGON-FORGE & TITAN ANVIL VAULT ======================== \\
// #region Exit 2 (East from Great Hall) — East Tunnel & Dragon-Forge Vault
export const MINE_EAST_FORGE = {
  floorY: -28.35,
  thick: 2.6,
  tunnel: {
    lxMin: 65.0,
    lxMax: 102.0,
    minLx: 65.0,
    maxLx: 102.0,
    minLz: 176.0,
    maxLz: 190.0,
    lxCentre: 83.5,
    length: 37.0,
    lzCentre: 183.0,
    halfW: 7.0,
    width: 14.0,
    height: 11.0,
  },
  chamber: {
    lxMin: 102.0,
    lxMax: 150.0,
    minLx: 102.0,
    maxLx: 150.0,
    lxCentre: 126.0,
    width: 48.0,
    lzMin: 154.0,
    lzMax: 212.0,
    minLz: 154.0,
    maxLz: 212.0,
    lzCentre: 183.0,
    length: 58.0,
    height: 18.5,
    anvilLx: 122.0,
    anvilLz: 183.0,
    anvilHalfX: 2.4,
    anvilHalfZ: 1.6,
    anvilHeight: 3.2,
    dragonForgeLx: 138.0,
    dragonForgeLz: 183.0,
    dragonSmelterLx: 138.0,
    dragonSmelterLz: 183.0,
    dragonSmelterHalfX: 4.2,
    dragonSmelterHalfZ: 5.5,
    dragonSmelterHeight: 11.5,
  },
} as const;
// #endregion

// ======================== ORE ROCKS & MINECART ROUTES ======================== \\
// #region Ore Rocks & Stationary Minecart Routes
export const MINE_ORE_ROCK = {
  radius: 1.25,
  top: 2.95,
} as const;

export const MINE_ORE_ROCK_SITES = [
  { lx: -36.0, lz: 41.2 },
  { lx: 25.5, lz: 78.5 },
  { lx: -45.2, lz: 49.5 },
  { lx: -45.2, lz: 78.5 },
  { lx: 27.5, lz: 43.2 },
  { lx: 37.2, lz: 76.0 },
  { lx: -28.5, lz: 91.2 },
  { lx: 45.2, lz: 50.5 },
] as const;

export const MINE_CART_BODY = {
  halfX: 0.72,
  halfZ: 1.05,
  bottomDy: 0.22,
  topDy: 1.06,
} as const;

export interface IMinecartRouteConfig {
  readonly startLocalX: number;
  readonly startLocalZ: number;
  readonly endLocalX: number;
  readonly endLocalZ: number;
  readonly yaw: number;
  readonly cycleSeconds: number;
  readonly phaseOffset: number;
  readonly oreKind: 'gold' | 'silver' | 'emerald' | 'sapphire' | 'amethyst';
  readonly baseYOffset?: number;
}

export const DWARVEN_MINECART_ROUTES: readonly IMinecartRouteConfig[] = [
  {
    startLocalX: 5.5,
    startLocalZ: 52.0,
    endLocalX: 5.5,
    endLocalZ: 74.0,
    yaw: 0,
    cycleSeconds: 18.0,
    phaseOffset: 0.0,
    oreKind: 'gold',
  },
  {
    startLocalX: 16.5,
    startLocalZ: 56.0,
    endLocalX: 16.5,
    endLocalZ: 62.0,
    yaw: 0,
    cycleSeconds: 16.0,
    phaseOffset: 2.5,
    oreKind: 'silver',
  },
  {
    startLocalX: 28.0,
    startLocalZ: 56.0,
    endLocalX: 32.0,
    endLocalZ: 56.0,
    yaw: Math.PI / 2,
    cycleSeconds: 14.0,
    phaseOffset: 5.0,
    oreKind: 'gold',
  },
  {
    startLocalX: 112.0,
    startLocalZ: 56.0,
    endLocalX: 120.0,
    endLocalZ: 56.0,
    yaw: Math.PI / 2,
    cycleSeconds: 20.0,
    phaseOffset: 1.2,
    oreKind: 'gold',
    baseYOffset: SOUTHERN_MINE_POS.eastFoundryFloorY - SOUTHERN_MINE_POS.cavernFloorY,
  },
  {
    startLocalX: 112.0,
    startLocalZ: 76.0,
    endLocalX: 120.0,
    endLocalZ: 76.0,
    yaw: Math.PI / 2,
    cycleSeconds: 20.0,
    phaseOffset: 4.2,
    oreKind: 'silver',
    baseYOffset: SOUTHERN_MINE_POS.eastFoundryFloorY - SOUTHERN_MINE_POS.cavernFloorY,
  },
];
// #endregion

// ======================== STANDING FLOOR TORCHES ======================== \\
// #region Standing Floor Torches
export interface IMineFloorTorch {
  readonly lx: number;
  readonly lz: number;
  readonly floor: IMineFloorName;
  readonly lift: number;
  readonly light: boolean;
  readonly yaw: number;
}

export const MINE_LAGOON_DOCK_TORCH: IMineFloorTorch = {
  lx: -124.5,
  lz: 95.5,
  floor: 'lagoon',
  lift: 0.28,
  light: true,
  yaw: 0,
};

export const MINE_GROUND_TORCHES: readonly IMineFloorTorch[] = [
  // Room 1 Central Staging & Mess Hall
  { lx: -6.5, lz: 40.0, floor: 'cavern', lift: 0, light: true, yaw: 0 },
  { lx: 6.5, lz: 40.0, floor: 'cavern', lift: 0, light: false, yaw: 0 },
  { lx: -14.0, lz: 52.0, floor: 'cavern', lift: 0, light: false, yaw: Math.PI / 2 },
  { lx: -14.0, lz: 72.0, floor: 'cavern', lift: 0, light: true, yaw: Math.PI / 2 },
  { lx: -14.0, lz: 90.0, floor: 'cavern', lift: 0, light: true, yaw: 0 },
  { lx: 14.0, lz: 90.0, floor: 'cavern', lift: 0, light: false, yaw: 0 },
  // Chamber 2 Lagoon Shores
  { lx: -96.0, lz: 58.0, floor: 'lagoon', lift: 0, light: true, yaw: -Math.PI / 2 },
  { lx: -96.0, lz: 86.0, floor: 'lagoon', lift: 0, light: false, yaw: -Math.PI / 2 },
  // Chamber 3 Smelting Foundry
  { lx: 96.0, lz: 54.0, floor: 'foundry', lift: 0, light: true, yaw: Math.PI / 2 },
  { lx: 96.0, lz: 84.0, floor: 'foundry', lift: 0, light: true, yaw: Math.PI / 2 },
  // Chamber 4 Great Hall of Khazad-dûm Bridgeheads (North & South of the 72m Bridge)
  { lx: -7.5, lz: 194.5, floor: 'moria', lift: 0, light: true, yaw: Math.PI },
  { lx: 7.5, lz: 194.5, floor: 'moria', lift: 0, light: true, yaw: Math.PI },
  { lx: -7.5, lz: 269.5, floor: 'moria', lift: 0, light: true, yaw: 0 },
  { lx: 7.5, lz: 269.5, floor: 'moria', lift: 0, light: false, yaw: 0 },
  // Exit 1 (West Split Hub & Hall of the Mountain Kings)
  { lx: -110.0, lz: 176.0, floor: 'moria', lift: 0, light: true, yaw: Math.PI / 2 },
  { lx: -120.0, lz: 138.0, floor: 'moria', lift: 0, light: true, yaw: 0 },
  { lx: -138.0, lz: 138.0, floor: 'moria', lift: 0, light: false, yaw: 0 },
  // Exit 2 (East Dragon-Forge Vault)
  { lx: 112.0, lz: 175.0, floor: 'moria', lift: 0, light: true, yaw: -Math.PI / 2 },
  { lx: 112.0, lz: 191.0, floor: 'moria', lift: 0, light: false, yaw: -Math.PI / 2 },
];

export const MINE_MORIA_SANCTUARY_TORCHES: readonly IMineFloorTorch[] = [
  { lx: -8.8, lz: 292.0, floor: 'moria', lift: 0.8, light: true, yaw: Math.PI },
  { lx: 8.8, lz: 292.0, floor: 'moria', lift: 0.8, light: false, yaw: Math.PI },
];

export const MINE_FLOOR_TORCH_STANDS: readonly IMineFloorTorch[] = [
  MINE_LAGOON_DOCK_TORCH,
  ...MINE_GROUND_TORCHES,
  ...MINE_MORIA_SANCTUARY_TORCHES,
];
// #endregion
