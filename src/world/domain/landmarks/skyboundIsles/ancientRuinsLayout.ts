// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Pure data plus one surface visitor, authored in the island's local frame (x east,
//         z south). The temple door is a puzzle gate: four runes must be awakened, each placed
//         so it takes a different skill to reach - a broken stair and a bounce cloud to the top
//         of a lone column, a hidden crack into a sealed room, the tip of a broken bridge, and a
//         statue court.
// SUMMARY: Ancient Sky Ruins: temple walls and door, portico and broken columns, the broken
//          stair, landing and column top, the sealed room, the broken bridge, statues and the
//          four runes. No rendering, no runtime state.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { getSkyIsland } from './skyboundLayout';
import type { ISkyRamp, ISkySolidBox } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Frame
const ISLAND = getSkyIsland('ancient-sky-ruins')!;
const DECK_Y = ISLAND.deckY;
const RAIL_HEIGHT_M = 1.1;
const RAIL_THICKNESS_M = 0.3;
const WALL_THICKNESS_M = 0.8;

function wx(localX: number): number {
  return ISLAND.x + localX;
}

function wz(localZ: number): number {
  return ISLAND.z + localZ;
}
// #endregion

// #region Types
/** Summary: A flat round platform (stair landing, column top). */
export interface IRuinsPlatform {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly y: number;
  readonly radius: number;
}
// #endregion

// ======================== TEMPLE ======================== \\
// #region Temple
/** Summary: The temple's inner floor area (deck height) and wall height. */
export const RUINS_TEMPLE = { minX: wx(-10), maxX: wx(10), minZ: wz(-24), maxZ: wz(-8), wallTopY: DECK_Y + 9.0 } as const;

/** Summary: Half width of the temple doorway in the south wall. */
const DOOR_HALF_WIDTH = 2.2;

/** Summary: The great temple door; a gate that opens when all four runes are awake. */
export const RUINS_TEMPLE_DOOR: ISkySolidBox = {
  id: 'ruins-temple-door',
  minX: wx(-DOOR_HALF_WIDTH),
  maxX: wx(DOOR_HALF_WIDTH),
  minZ: RUINS_TEMPLE.maxZ - WALL_THICKNESS_M / 2,
  maxZ: RUINS_TEMPLE.maxZ + WALL_THICKNESS_M / 2,
  minY: DECK_Y,
  maxY: DECK_Y + 6.0,
};

/** Summary: Where the Ruins chest stands, at the back of the temple. */
export const RUINS_CHEST_SPOT = { x: wx(0), y: DECK_Y, z: wz(-20) } as const;

/** Summary: Portico columns in front of the temple; broken ones are shorter. */
export const RUINS_PORTICO_COLUMNS = [
  { x: wx(-8), z: wz(-5), height: 8.0 },
  { x: wx(-5), z: wz(-5), height: 3.2 },
  { x: wx(5), z: wz(-5), height: 8.0 },
  { x: wx(8), z: wz(-5), height: 5.0 },
] as const;

/** Summary: Carved clue wall beside the door: four rune symbols with pictograms of where they are. */
export const RUINS_CLUE_WALL = { x: wx(-6.5), z: RUINS_TEMPLE.maxZ + WALL_THICKNESS_M / 2 + 0.05, y: DECK_Y + 2.4 } as const;
// #endregion

// ======================== LONE COLUMN ======================== \\
// #region Broken Stair And Lone Column
/** Summary: Landing at the top of the broken stair (it ends in mid-air). */
export const RUINS_STAIR_LANDING: IRuinsPlatform = { id: 'ruins-stair-landing', x: wx(13), z: wz(22), y: DECK_Y + 5.0, radius: 2.0 };

/** Summary: Broken stair from the deck up to the landing. */
export const RUINS_BROKEN_STAIR: ISkyRamp = {
  id: 'ruins-broken-stair',
  ax: wx(3),
  ay: DECK_Y,
  az: wz(22),
  bx: RUINS_STAIR_LANDING.x - RUINS_STAIR_LANDING.radius + 0.2,
  by: RUINS_STAIR_LANDING.y,
  bz: wz(22),
  halfWidth: 1.3,
};

/** Summary: Top of the lone column; reached only by a bounce cloud from the landing. */
export const RUINS_COLUMN_TOP: IRuinsPlatform = { id: 'ruins-column-top', x: wx(20), z: wz(12), y: DECK_Y + 12.0, radius: 2.0 };
// #endregion

// ======================== SEALED ROOM ======================== \\
// #region Sealed Room
/** Summary: Sealed room on the west side; its only way in is a crack in the west wall. */
export const RUINS_SEALED_ROOM = { minX: wx(-24), maxX: wx(-16), minZ: wz(2), maxZ: wz(10), wallTopY: DECK_Y + 4.5 } as const;

/** Summary: The crack in the sealed room's west wall (z range). */
export const RUINS_SEALED_CRACK = { minZ: wz(5), maxZ: wz(7) } as const;
// #endregion

// ======================== BROKEN BRIDGE ======================== \\
// #region Broken Bridge
/** Summary: Flat stone bridge reaching north-west past the rim and ending broken in the air. */
export const RUINS_BROKEN_BRIDGE: ISkyRamp = {
  id: 'ruins-broken-bridge',
  ax: wx(-14),
  ay: DECK_Y,
  az: wz(-20),
  bx: wx(-28),
  by: DECK_Y,
  bz: wz(-31),
  halfWidth: 1.4,
};
// #endregion

// ======================== STATUES AND RUNES ======================== \\
// #region Statues And Runes
/** Summary: The statue court east of the temple: two great statues. */
export const RUINS_STATUES = [
  { x: wx(16), z: wz(-14), height: 7.0 },
  { x: wx(22), z: wz(-6), height: 5.5 },
] as const;

/** Summary: The four temple runes, each in a different kind of place. */
export const RUINS_RUNES = [
  { id: 'ruins-rune-column', x: RUINS_COLUMN_TOP.x, z: RUINS_COLUMN_TOP.z, y: RUINS_COLUMN_TOP.y },
  { id: 'ruins-rune-sealed-room', x: (RUINS_SEALED_ROOM.minX + RUINS_SEALED_ROOM.maxX) / 2 + 1.5, z: (RUINS_SEALED_ROOM.minZ + RUINS_SEALED_ROOM.maxZ) / 2, y: DECK_Y },
  { id: 'ruins-rune-bridge', x: wx(-25.5), z: wz(-29), y: DECK_Y },
  { id: 'ruins-rune-statue', x: wx(16), z: wz(-10.5), y: DECK_Y },
] as const;
// #endregion

// ======================== SOLID BOXES ======================== \\
// #region Solid Boxes
const boxes: ISkySolidBox[] = [];

function addBox(id: string, cx: number, cz: number, halfX: number, halfZ: number, minY: number, maxY: number, yaw?: number): void {
  boxes.push({ id, minX: cx - halfX, maxX: cx + halfX, minZ: cz - halfZ, maxZ: cz + halfZ, minY, maxY, yaw });
}

/** An axis-aligned wall from (x0, z0) to (x1, z1); one of the two spans is zero. */
function addWall(id: string, x0: number, z0: number, x1: number, z1: number, topY: number): void {
  const half = WALL_THICKNESS_M / 2;
  addBox(id, (x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) / 2 + half, Math.abs(z1 - z0) / 2 + half, DECK_Y, topY);
}

// Temple: west, east and north walls, and the south wall on both sides of the door.
const T = RUINS_TEMPLE;
addWall('ruins-temple-wall-west', T.minX, T.minZ, T.minX, T.maxZ, T.wallTopY);
addWall('ruins-temple-wall-east', T.maxX, T.minZ, T.maxX, T.maxZ, T.wallTopY);
addWall('ruins-temple-wall-north', T.minX, T.minZ, T.maxX, T.minZ, T.wallTopY);
addWall('ruins-temple-wall-south-w', T.minX, T.maxZ, wx(-DOOR_HALF_WIDTH) - WALL_THICKNESS_M / 2, T.maxZ, T.wallTopY);
addWall('ruins-temple-wall-south-e', wx(DOOR_HALF_WIDTH) + WALL_THICKNESS_M / 2, T.maxZ, T.maxX, T.maxZ, T.wallTopY);
RUINS_PORTICO_COLUMNS.forEach((c, i) => addBox(`ruins-portico-column-${i}`, c.x, c.z, 0.7, 0.7, DECK_Y, DECK_Y + c.height));

// Lone column (its top is a walkable disc) and the landing's support pier.
addBox('ruins-lone-column', RUINS_COLUMN_TOP.x, RUINS_COLUMN_TOP.z, 1.4, 1.4, DECK_Y, RUINS_COLUMN_TOP.y - 0.05);
addBox('ruins-stair-landing-pier', RUINS_STAIR_LANDING.x + 0.6, RUINS_STAIR_LANDING.z, 0.8, 0.8, DECK_Y, RUINS_STAIR_LANDING.y - 0.4);

// Sealed room: four walls, the west one split around the crack.
const R = RUINS_SEALED_ROOM;
addWall('ruins-sealed-wall-north', R.minX, R.minZ, R.maxX, R.minZ, R.wallTopY);
addWall('ruins-sealed-wall-south', R.minX, R.maxZ, R.maxX, R.maxZ, R.wallTopY);
addWall('ruins-sealed-wall-east', R.maxX, R.minZ, R.maxX, R.maxZ, R.wallTopY);
addWall('ruins-sealed-wall-west-n', R.minX, R.minZ, R.minX, RUINS_SEALED_CRACK.minZ - WALL_THICKNESS_M / 2, R.wallTopY);
addWall('ruins-sealed-wall-west-s', R.minX, RUINS_SEALED_CRACK.maxZ + WALL_THICKNESS_M / 2, R.minX, R.maxZ, R.wallTopY);

// Broken bridge railings, from the rim to just short of the broken tip (the tip itself is open).
{
  const b = RUINS_BROKEN_BRIDGE;
  const dx = b.bx - b.ax;
  const dz = b.bz - b.az;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  const yaw = Math.atan2(-uz, ux);
  const fromU = 0.35;
  const toU = 0.8;
  for (const side of [-1, 1]) {
    const um = (fromU + toU) / 2;
    const off = (b.halfWidth + RAIL_THICKNESS_M / 2) * side;
    addBox(`rail-ruins-bridge-${side > 0 ? 'r' : 'l'}`, b.ax + dx * um - uz * off, b.az + dz * um + ux * off, (len * (toU - fromU)) / 2, RAIL_THICKNESS_M / 2, DECK_Y, DECK_Y + RAIL_HEIGHT_M, yaw);
  }
}

// Statues and rune pedestals.
RUINS_STATUES.forEach((s, i) => addBox(`ruins-statue-${i}`, s.x, s.z, 1.2, 1.2, DECK_Y, DECK_Y + s.height));
RUINS_RUNES.forEach((r) => addBox(r.id, r.x, r.z, 0.35, 0.35, r.y, r.y + 1.0));

/** Summary: Every static solid box of the Ancient Ruins (the temple door is a gate). */
export const RUINS_SOLID_BOXES: readonly ISkySolidBox[] = boxes;
// #endregion

// ======================== PUBLIC QUERIES ======================== \\
// #region Surface Visitor
/**
 * Summary: Calls `visit` for every Ruins addition walkable at (x, z): the broken stair, its
 *          landing, the column top and the broken bridge (rooms are on the island deck).
 * @param x World X.
 * @param z World Z.
 * @param visit Receives the surface height, a kind tag and an id.
 */
export function visitAncientRuinsSurfaces(x: number, z: number, visit: (y: number, kind: 'deck' | 'ramp', id: string) => void): void {
  if (Math.abs(x - ISLAND.x) > 50 || Math.abs(z - ISLAND.z) > 50) return;
  for (const p of [RUINS_STAIR_LANDING, RUINS_COLUMN_TOP]) {
    if (Math.hypot(x - p.x, z - p.z) <= p.radius) visit(p.y, 'deck', p.id);
  }
  for (const r of [RUINS_BROKEN_STAIR, RUINS_BROKEN_BRIDGE]) {
    const sx = r.bx - r.ax;
    const sz = r.bz - r.az;
    const u = ((x - r.ax) * sx + (z - r.az) * sz) / (sx * sx + sz * sz);
    if (u >= 0 && u <= 1 && Math.hypot(x - (r.ax + sx * u), z - (r.az + sz * u)) <= r.halfWidth) visit(r.ay + (r.by - r.ay) * u, 'ramp', r.id);
  }
}
// #endregion
