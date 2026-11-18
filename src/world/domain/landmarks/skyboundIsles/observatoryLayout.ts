// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Pure data plus one surface visitor. The tower is a ring of rotated wall boxes with
//         a south doorway and a north opening into the hidden chamber; that opening is a
//         "sky gate" (blocks only until the ring puzzle is solved), not a static box, because
//         static boxes live in a spatial hash that cannot change at runtime.
// SUMMARY: Sky Observatory: tower walls and doorways, exterior ramp and tower balcony ring,
//          the hidden chamber, the armillary dial and its three levers, the giant telescope
//          base, and the chamber gate. No rendering, no runtime state.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { getSkyIsland } from './skyboundLayout';
import type { ISkyDeckRect, ISkyRamp, ISkySolidBox } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Frame
const ISLAND = getSkyIsland('sky-observatory')!;
const DECK_Y = ISLAND.deckY;
const RAIL_HEIGHT_M = 1.1;
const RAIL_THICKNESS_M = 0.3;
// #endregion

// #region Tower
/** Summary: The observatory tower: a round wall with a south doorway and a north opening. */
export const OBSERVATORY_TOWER = {
  x: ISLAND.x - 4.0,
  z: ISLAND.z - 6.0,
  innerR: 7.4,
  wallThickness: 0.6,
  wallTopY: DECK_Y + 12.0,
  /** Doorway half-angles (radians) around south (+z) and north (-z). */
  doorHalfAngle: 0.23,
  chamberOpeningHalfAngle: 0.2,
} as const;

/** Summary: Hidden chamber behind the tower's north opening; floor is the island deck. */
export const OBSERVATORY_CHAMBER = {
  minX: OBSERVATORY_TOWER.x - 2.5,
  maxX: OBSERVATORY_TOWER.x + 2.5,
  minZ: OBSERVATORY_TOWER.z - OBSERVATORY_TOWER.innerR - 5.6,
  maxZ: OBSERVATORY_TOWER.z - OBSERVATORY_TOWER.innerR - 0.3,
  ceilingY: DECK_Y + 4.0,
} as const;

/** Summary: Where the Observatory chest stands, at the back of the hidden chamber. */
export const OBSERVATORY_CHEST_SPOT = { x: OBSERVATORY_TOWER.x, y: DECK_Y, z: OBSERVATORY_CHAMBER.minZ + 1.4 } as const;

/** Summary: Gate closing the chamber opening until the ring puzzle is solved. */
export const OBSERVATORY_CHAMBER_GATE: ISkySolidBox = {
  id: 'observatory-chamber-gate',
  minX: OBSERVATORY_TOWER.x - 2.2,
  maxX: OBSERVATORY_TOWER.x + 2.2,
  minZ: OBSERVATORY_TOWER.z - OBSERVATORY_TOWER.innerR - 0.7,
  maxZ: OBSERVATORY_TOWER.z - OBSERVATORY_TOWER.innerR + 0.1,
  minY: DECK_Y,
  maxY: DECK_Y + 3.6,
};

/** Summary: Star map mural inside the tower (east inner wall) that shows the ring solution. */
export const OBSERVATORY_STAR_MAP = { x: OBSERVATORY_TOWER.x + OBSERVATORY_TOWER.innerR - 0.05, y: DECK_Y + 2.6, z: OBSERVATORY_TOWER.z } as const;
// #endregion

// #region Tower Balcony
/** Summary: Balcony ring around the outside of the tower. */
export const OBSERVATORY_BALCONY = {
  x: OBSERVATORY_TOWER.x,
  z: OBSERVATORY_TOWER.z,
  innerR: OBSERVATORY_TOWER.innerR + OBSERVATORY_TOWER.wallThickness,
  outerR: 10.8,
  y: DECK_Y + 6.0,
} as const;

const BALCONY_ARRIVAL_ANGLE = Math.PI;

/**
 * Summary: Exterior ramp from the deck up to the west side of the tower balcony.
 * Design: It runs straight toward the tower and ends just inside the balcony's outer edge,
 *         so no part of it passes under the balcony (that would turn the balcony into a wall).
 */
export const OBSERVATORY_BALCONY_RAMP: ISkyRamp = {
  id: 'observatory-balcony-ramp',
  ax: OBSERVATORY_TOWER.x - 21.0,
  ay: DECK_Y,
  az: OBSERVATORY_TOWER.z,
  bx: OBSERVATORY_TOWER.x + Math.cos(BALCONY_ARRIVAL_ANGLE) * (OBSERVATORY_BALCONY.outerR - 0.2),
  by: OBSERVATORY_BALCONY.y,
  bz: OBSERVATORY_TOWER.z + Math.sin(BALCONY_ARRIVAL_ANGLE) * (OBSERVATORY_BALCONY.outerR - 0.2),
  halfWidth: 1.2,
};
// #endregion

// #region Armillary Puzzle
/** Summary: The armillary dial east of the tower: three nested rings on a low dais. */
export const OBSERVATORY_DIAL = { x: ISLAND.x + 13.0, z: ISLAND.z - 9.0, daisTopY: DECK_Y + 0.9, ringRadii: [3.6, 2.7, 1.8] as const } as const;

/** Summary: The three levers in front of the dial (outer, middle, inner ring). */
export const OBSERVATORY_LEVERS = [
  { id: 'observatory-lever-outer', ringIndex: 0, x: OBSERVATORY_DIAL.x - 3.5, z: OBSERVATORY_DIAL.z + 6.0 },
  { id: 'observatory-lever-middle', ringIndex: 1, x: OBSERVATORY_DIAL.x, z: OBSERVATORY_DIAL.z + 6.6 },
  { id: 'observatory-lever-inner', ringIndex: 2, x: OBSERVATORY_DIAL.x + 3.5, z: OBSERVATORY_DIAL.z + 6.0 },
] as const;

/** Summary: Giant telescope on the south-west of the island (base position). */
export const OBSERVATORY_GIANT_TELESCOPE = { x: ISLAND.x - 15.0, z: ISLAND.z + 10.0 } as const;

/** Summary: Walkable elevated platform where the Giant Brass Telescope stands. */
export const OBSERVATORY_TELESCOPE_PLATFORM: ISkyDeckRect = {
  id: 'observatory-telescope-platform',
  minX: OBSERVATORY_GIANT_TELESCOPE.x - 2.4,
  maxX: OBSERVATORY_GIANT_TELESCOPE.x + 2.4,
  minZ: OBSERVATORY_GIANT_TELESCOPE.z - 2.4,
  maxZ: OBSERVATORY_GIANT_TELESCOPE.z + 2.4,
  y: DECK_Y + 2.4,
};

/** Summary: Walkable staircase rising from the north deck up onto the Giant Telescope platform. */
export const OBSERVATORY_TELESCOPE_STAIR: ISkyRamp = {
  id: 'observatory-telescope-stair',
  ax: OBSERVATORY_GIANT_TELESCOPE.x,
  ay: DECK_Y,
  az: OBSERVATORY_GIANT_TELESCOPE.z - 6.4,
  bx: OBSERVATORY_GIANT_TELESCOPE.x,
  by: OBSERVATORY_TELESCOPE_PLATFORM.y,
  bz: OBSERVATORY_TELESCOPE_PLATFORM.minZ + 0.2,
  halfWidth: 1.25,
};
// #endregion

// ======================== SOLID BOXES ======================== \\
// #region Solid Boxes
const boxes: ISkySolidBox[] = [];

function addBox(id: string, cx: number, cz: number, halfX: number, halfZ: number, minY: number, maxY: number, yaw?: number): void {
  boxes.push({ id, minX: cx - halfX, maxX: cx + halfX, minZ: cz - halfZ, maxZ: cz + halfZ, minY, maxY, yaw });
}

/** Tangential boxes around a circle, skipping the given angular gaps. */
function addRing(
  idPrefix: string,
  cx: number,
  cz: number,
  radius: number,
  segments: number,
  thickness: number,
  minY: number,
  maxY: number,
  gaps: ReadonlyArray<{ angle: number; half: number }>
): void {
  const chord = (2 * Math.PI * radius) / segments;
  for (let i = 0; i < segments; i++) {
    const ang = ((i + 0.5) / segments) * Math.PI * 2;
    const inGap = gaps.some((g) => Math.abs(Math.atan2(Math.sin(ang - g.angle), Math.cos(ang - g.angle))) < g.half + Math.PI / segments);
    if (inGap) continue;
    addBox(`${idPrefix}-${i}`, cx + Math.cos(ang) * radius, cz + Math.sin(ang) * radius, chord * 0.56, thickness / 2, minY, maxY, Math.atan2(-Math.cos(ang), -Math.sin(ang)));
  }
}

const T = OBSERVATORY_TOWER;
const wallMidR = T.innerR + T.wallThickness / 2;
addRing('observatory-tower-wall', T.x, T.z, wallMidR, 40, T.wallThickness, DECK_Y, T.wallTopY, [
  { angle: Math.PI / 2, half: T.doorHalfAngle },
  { angle: -Math.PI / 2, half: T.chamberOpeningHalfAngle },
]);

// Hidden chamber walls (the opening side is the tower wall's north gap).
const C = OBSERVATORY_CHAMBER;
addBox('observatory-chamber-wall-west', C.minX - 0.25, (C.minZ + C.maxZ) / 2, 0.25, (C.maxZ - C.minZ) / 2 + 0.25, DECK_Y, C.ceilingY);
addBox('observatory-chamber-wall-east', C.maxX + 0.25, (C.minZ + C.maxZ) / 2, 0.25, (C.maxZ - C.minZ) / 2 + 0.25, DECK_Y, C.ceilingY);
addBox('observatory-chamber-wall-north', (C.minX + C.maxX) / 2, C.minZ - 0.25, (C.maxX - C.minX) / 2 + 0.5, 0.25, DECK_Y, C.ceilingY);

// Balcony railing (gap where the ramp arrives) and ramp railings above the deck.
addRing('rail-observatory-balcony', OBSERVATORY_BALCONY.x, OBSERVATORY_BALCONY.z, OBSERVATORY_BALCONY.outerR - 0.2, 32, RAIL_THICKNESS_M, OBSERVATORY_BALCONY.y, OBSERVATORY_BALCONY.y + RAIL_HEIGHT_M, [
  { angle: BALCONY_ARRIVAL_ANGLE, half: 0.12 },
]);
{
  const r = OBSERVATORY_BALCONY_RAMP;
  const dx = r.bx - r.ax;
  const dz = r.bz - r.az;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  const yaw = Math.atan2(-uz, ux);
  const segments = 4;
  for (const side of [-1, 1]) {
    for (let i = 0; i < segments; i++) {
      const u0 = 0.15 + (0.7 * i) / segments;
      const u1 = 0.15 + (0.7 * (i + 1)) / segments;
      const um = (u0 + u1) / 2;
      const off = (r.halfWidth + RAIL_THICKNESS_M / 2) * side;
      const lowY = r.ay + (r.by - r.ay) * u0;
      const highY = r.ay + (r.by - r.ay) * u1;
      addBox(`rail-observatory-ramp-${side > 0 ? 'r' : 'l'}-${i}`, r.ax + dx * um - uz * off, r.az + dz * um + ux * off, (len * (u1 - u0)) / 2 + 0.05, RAIL_THICKNESS_M / 2, lowY, highY + RAIL_HEIGHT_M, yaw);
    }
  }
}

// Armillary dais (octagon), levers, and the Giant Telescope platform railings & tripod stand.
const D = OBSERVATORY_DIAL;
addBox('observatory-dial-dais-a', D.x, D.z, 3.0, 3.0, DECK_Y, D.daisTopY);
addBox('observatory-dial-dais-b', D.x, D.z, 3.0, 3.0, DECK_Y, D.daisTopY, Math.PI / 4);
OBSERVATORY_LEVERS.forEach((l) => addBox(l.id, l.x, l.z, 0.25, 0.25, DECK_Y, DECK_Y + 1.25));
{
  const p = OBSERVATORY_TELESCOPE_PLATFORM;
  const rt = RAIL_THICKNESS_M / 2;
  const topY = p.y + RAIL_HEIGHT_M;
  addBox('rail-observatory-telescope-west', p.minX, (p.minZ + p.maxZ) / 2, rt, (p.maxZ - p.minZ) / 2, p.y, topY);
  addBox('rail-observatory-telescope-east', p.maxX, (p.minZ + p.maxZ) / 2, rt, (p.maxZ - p.minZ) / 2, p.y, topY);
  addBox('rail-observatory-telescope-south', (p.minX + p.maxX) / 2, p.maxZ, (p.maxX - p.minX) / 2, rt, p.y, topY);
  addBox('observatory-giant-telescope-stand', OBSERVATORY_GIANT_TELESCOPE.x, OBSERVATORY_GIANT_TELESCOPE.z, 0.32, 0.32, p.y, p.y + 1.3);
}

/** Summary: Every static solid box of the Sky Observatory (the chamber gate is separate). */
export const OBSERVATORY_SOLID_BOXES: readonly ISkySolidBox[] = boxes;
// #endregion

// ======================== PUBLIC QUERIES ======================== \\
// #region Surface Visitor
/**
 * Summary: Calls `visit` for every Observatory addition walkable at (x, z): the balcony ring
 *          and its ramp (the tower floor and chamber floor are the island deck).
 * @param x World X.
 * @param z World Z.
 * @param visit Receives the surface height, a kind tag and an id.
 */
export function visitObservatorySurfaces(x: number, z: number, visit: (y: number, kind: 'deck' | 'ramp', id: string) => void): void {
  if (Math.abs(x - ISLAND.x) > 40 || Math.abs(z - ISLAND.z) > 40) return;
  const d = Math.hypot(x - OBSERVATORY_BALCONY.x, z - OBSERVATORY_BALCONY.z);
  if (d >= OBSERVATORY_BALCONY.innerR && d <= OBSERVATORY_BALCONY.outerR) visit(OBSERVATORY_BALCONY.y, 'deck', 'observatory-balcony');
  const p = OBSERVATORY_TELESCOPE_PLATFORM;
  if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) visit(p.y, 'deck', p.id);
  for (const r of [OBSERVATORY_BALCONY_RAMP, OBSERVATORY_TELESCOPE_STAIR]) {
    const sx = r.bx - r.ax;
    const sz = r.bz - r.az;
    const u = ((x - r.ax) * sx + (z - r.az) * sz) / (sx * sx + sz * sz);
    if (u >= 0 && u <= 1 && Math.hypot(x - (r.ax + sx * u), z - (r.az + sz * u)) <= r.halfWidth) visit(r.ay + (r.by - r.ay) * u, 'ramp', r.id);
  }
}
// #endregion
