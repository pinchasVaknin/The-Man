// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Pure data plus one surface visitor. Positions are authored in the island's local
//         frame (x east, z south) and converted once, so the layout moves with the island.
//         The scenic Lake and Waterfalls sit at the front/west of the island facing the
//         player's arrival, while the colossal, ultra-wide hollow World Tree sits at the
//         back (south-east) of the island wrapping its canopy around the island.
// SUMMARY: Everything walkable, bouncy or solid that the Floating Garden adds on top of its
//          flat deck. Does not render anything and holds no runtime state.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { getSkyIsland } from './skyboundLayout';
import type { ISkyBouncePad, ISkyDeckRect, ISkyRamp, ISkySolidBox } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Frame
const GARDEN = getSkyIsland('floating-garden')!;
const DECK_Y = GARDEN.deckY;
const RAIL_HEIGHT_M = 1.1;
const RAIL_THICKNESS_M = 0.3;

/** Local (east, south) offset from the garden centre to world X. */
function wx(localX: number): number {
  return GARDEN.x + localX;
}

/** Local (east, south) offset from the garden centre to world Z. */
function wz(localZ: number): number {
  return GARDEN.z + localZ;
}
// #endregion

// #region Types
/** Summary: Flat round platform (branch platform, root nook). */
export interface IGardenPlatform {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly y: number;
  readonly radius: number;
}
// #endregion

// ======================== LAKE, STREAM, WATERFALL AND CAVE ======================== \\
// #region Lake And Waterfall
/** Summary: The foreground lake at the front-west of the island (shallow, walkable). */
export const GARDEN_LAKE = { x: wx(-8), z: wz(-11), rx: 11.0, rz: 7.2 } as const;

/** Summary: Stream channel from the foreground lake south to the waterfall lip (visual). */
export const GARDEN_STREAM = { x: wx(-10), fromZ: wz(-4), toZ: wz(41.0), halfWidth: 1.6 } as const;

/** Summary: The flat footbridge over the stream: it crosses along x, with a railing on each side. */
export const GARDEN_FOOTBRIDGE = { x: wx(-10), z: wz(2.0), halfLength: 2.9, halfWidth: 1.25 } as const;

/**
 * Summary: Stone lip the stream pours off. It reaches past the rim and is the roof of the
 *          waterfall cave below; it is walkable at deck height.
 */
export const GARDEN_WATERFALL_LIP: ISkyDeckRect = { id: 'garden-waterfall-lip', minX: wx(-15), maxX: wx(-5), minZ: wz(32), maxZ: wz(41), y: DECK_Y };

/** Summary: Where the water falls: a curtain just past the lip's south edge. */
export const GARDEN_WATERFALL = { x: wx(-10), z: wz(41.3), topY: DECK_Y, bottomY: DECK_Y - 32.0, halfWidth: 3.2 } as const;

/** Summary: Floor of the cave behind the waterfall (under the lip). */
export const GARDEN_CAVE_FLOOR: ISkyDeckRect = { id: 'garden-cave', minX: wx(-14), maxX: wx(-6), minZ: wz(33), maxZ: wz(39), y: DECK_Y - 5.0 };

/** Summary: Ledge in front of the cave mouth, between the cave and the falling water. */
export const GARDEN_CAVE_LEDGE: ISkyDeckRect = { id: 'garden-cave-ledge', minX: wx(-21.0), maxX: wx(-6), minZ: wz(38.8), maxZ: wz(40.6), y: DECK_Y - 5.0 };

/** Summary: Ramp down the cliff from the deck to the cave ledge (the hidden way in). */
export const GARDEN_CAVE_RAMP: ISkyRamp = {
  id: 'garden-cave-ramp',
  ax: wx(-20.5),
  ay: DECK_Y,
  az: wz(26.0),
  bx: wx(-19.0),
  by: DECK_Y - 5.0,
  bz: wz(39.6),
  halfWidth: 1.2,
};

/** Summary: Where the Garden's treasure chest stands, at the back of the cave. */
export const GARDEN_CAVE_CHEST_SPOT = { x: wx(-10), y: DECK_Y - 5.0, z: wz(34.5) } as const;
// #endregion

// ======================== SKY TREE ======================== \\
// #region Sky Tree
/**
 * Summary: The colossal, ultra-wide World Tree sitting at the back (south-east) of the Floating Garden island.
 * Design: Extra-wide hollow interior (`hollowInnerR = 5.8 m`, `hollowOuterR = 7.4 m`) entered through a grand
 *         north-facing archway facing the center of the island and the foreground lake, with a vertical mushroom
 *         parkour course inside the hollow shaft rising to the Wind Core crystal and sanctum chest, plus an
 *         exterior branch climb winding around the outside of the massive trunk.
 */
export const SKY_TREE = {
  x: wx(6),
  z: wz(12),
  baseRadius: 11.8,
  topRadius: 8.6,
  height: 62.0,
  hollowInnerR: 5.8,
  hollowOuterR: 7.4,
  canopyRadius: 48.0,
  entranceAngle: -Math.PI / 2,
} as const;

/** Summary: Entrance threshold into the hollow interior of the World Tree at deck level (facing north toward the island center). */
export const SKY_TREE_HOLLOW_ENTRANCE = {
  x: SKY_TREE.x + Math.cos(SKY_TREE.entranceAngle) * 6.6,
  y: DECK_Y,
  z: SKY_TREE.z + Math.sin(SKY_TREE.entranceAngle) * 6.6,
} as const;

/** Summary: Bioluminescent bounce mushrooms inside the hollow World Tree trunk (vertical parkour to the crown). */
export const SKY_TREE_HOLLOW_PADS: readonly ISkyBouncePad[] = [
  { id: 'hollow-mushroom-1', x: wx(4.6), z: wz(9.8), topY: DECK_Y + 0.55, radius: 1.25, bounceVy: 11.2 },
  { id: 'hollow-mushroom-2', x: wx(7.6), z: wz(11.6), topY: DECK_Y + 3.6, radius: 1.25, bounceVy: 12.2 },
  { id: 'hollow-mushroom-3', x: wx(5.4), z: wz(13.8), topY: DECK_Y + 7.4, radius: 1.3, bounceVy: 13.8 },
];

/** Summary: Bounce mushrooms (first two are exterior garden mushrooms; next three form the hollow trunk parkour). */
export const GARDEN_BOUNCE_PADS: readonly ISkyBouncePad[] = [
  { id: 'garden-mushroom-low', x: wx(21.5), z: wz(-5.5), topY: DECK_Y + 0.5, radius: 1.6, bounceVy: 11.0 },
  { id: 'garden-mushroom-tall', x: wx(17.5), z: wz(-2.0), topY: DECK_Y + 2.6, radius: 2.0, bounceVy: 14.0 },
  ...SKY_TREE_HOLLOW_PADS,
];

/** Summary: Mid-climb landing platform on the exterior climb around the east flank of the World Tree. */
export const SKY_TREE_ROOT_LANDING: IGardenPlatform = { id: 'sky-tree-root-landing', x: wx(19.0), z: wz(12.0), y: DECK_Y + 3.2, radius: 2.6 };

/** Summary: Branch platform reached from the tall mushroom or the exterior climb. */
export const SKY_TREE_BRANCH_LOW: IGardenPlatform = { id: 'sky-tree-branch-low', x: wx(14.5), z: wz(1.5), y: DECK_Y + 6.5, radius: 3.3 };

/** Summary: Higher branch platform, reached along a branch or by the wind flower. */
export const SKY_TREE_BRANCH_HIGH: IGardenPlatform = { id: 'sky-tree-branch-high', x: wx(-8.5), z: wz(1.5), y: DECK_Y + 10.0, radius: 2.8 };

/** Summary: Wide observation & sanctum ring around the upper hollow shaft of the World Tree. */
export const SKY_TREE_CROWN = { id: 'sky-tree-crown', x: SKY_TREE.x, z: SKY_TREE.z, innerR: 3.2, outerR: 9.2, y: DECK_Y + 13.5 } as const;

/** Summary: Where the World Tree sanctum treasure chest stands on the crown ring. */
export const SKY_TREE_HOLLOW_CHEST_SPOT = { x: wx(6), y: SKY_TREE_CROWN.y, z: wz(17.8) } as const;

/** Point on the rim of a round platform, facing (towardX, towardZ), at the platform's height. */
function rimPoint(p: { x: number; z: number; y: number; radius: number }, towardX: number, towardZ: number, inset = 0.25): { x: number; y: number; z: number } {
  const dx = towardX - p.x;
  const dz = towardZ - p.z;
  const len = Math.hypot(dx, dz) || 1;
  const r = p.radius - inset;
  return { x: p.x + (dx / len) * r, y: p.y, z: p.z + (dz / len) * r };
}

/** Builds a branch ramp between two points, so platforms keep their flat tops. */
function branch(id: string, a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, halfWidth = 1.3): ISkyRamp {
  return { id, ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, halfWidth };
}

/** Point on the crown ring where the upper branch arrives (radially aligned with SKY_TREE_BRANCH_HIGH, r = 8.95m). */
const CROWN_ARRIVAL = { x: wx(-1.25), y: SKY_TREE_CROWN.y, z: wz(6.75) } as const;

/** Deck entry point of the exterior branch climb on the east side of the colossal World Tree. */
export const SKY_TREE_ROOT_CLIMB_START = { x: wx(21.5), y: DECK_Y, z: wz(2.0) } as const;

/**
 * Summary: Walkable exterior branch ramps from the island deck up onto `SKY_TREE_BRANCH_LOW`.
 */
export const SKY_TREE_ROOT_CLIMB_RAMPS: readonly ISkyRamp[] = [
  branch(
    'sky-tree-climb-root-a',
    SKY_TREE_ROOT_CLIMB_START,
    rimPoint(SKY_TREE_ROOT_LANDING, SKY_TREE_ROOT_CLIMB_START.x, SKY_TREE_ROOT_CLIMB_START.z),
    1.45
  ),
  branch(
    'sky-tree-climb-root-b',
    rimPoint(SKY_TREE_ROOT_LANDING, SKY_TREE_BRANCH_LOW.x, SKY_TREE_BRANCH_LOW.z),
    rimPoint(SKY_TREE_BRANCH_LOW, SKY_TREE_ROOT_LANDING.x, SKY_TREE_ROOT_LANDING.z),
    1.45
  ),
];

/**
 * Summary: Walkable branches: low platform -> high platform -> crown ring (plus exterior climb).
 * Design: Each branch runs rim to rim, so a platform's flat top is never overridden by a
 *         branch climbing across it, and the step onto a platform is level.
 */
export const SKY_TREE_BRANCHES: readonly ISkyRamp[] = [
  branch(
    'sky-tree-branch-a',
    rimPoint(SKY_TREE_BRANCH_LOW, SKY_TREE_BRANCH_HIGH.x, SKY_TREE_BRANCH_HIGH.z),
    rimPoint(SKY_TREE_BRANCH_HIGH, SKY_TREE_BRANCH_LOW.x, SKY_TREE_BRANCH_LOW.z),
    1.3
  ),
  branch('sky-tree-branch-b', rimPoint(SKY_TREE_BRANCH_HIGH, CROWN_ARRIVAL.x, CROWN_ARRIVAL.z), CROWN_ARRIVAL, 1.3),
  ...SKY_TREE_ROOT_CLIMB_RAMPS,
];

/** Summary: The Garden's wind flower: a second way up, to the high branch platform. */
export const GARDEN_WIND_FLOWER_SPOT = { x: wx(-8.5), z: wz(-2.8), topY: DECK_Y + 12.0 } as const;
// #endregion

// ======================== ROOT PATH ======================== \\
// #region Root Path
/** Summary: Root ramp down the north cliff. */
export const GARDEN_ROOT_RAMP: ISkyRamp = {
  id: 'garden-root-ramp',
  ax: wx(-6),
  ay: DECK_Y,
  az: wz(-31.5),
  bx: wx(-9),
  by: DECK_Y - 6.5,
  bz: wz(-41.0),
  halfWidth: 1.1,
};

/** Summary: Hidden nook in the hanging roots at the bottom of the root ramp. */
export const GARDEN_ROOT_NOOK: IGardenPlatform = { id: 'garden-root-nook', x: wx(-9.5), z: wz(-43), y: DECK_Y - 6.5, radius: 2.4 };
// #endregion

// ======================== SOLID BOXES ======================== \\
// #region Solid Boxes
const boxes: ISkySolidBox[] = [];

function addBox(id: string, cx: number, cz: number, halfX: number, halfZ: number, minY: number, maxY: number, yaw?: number): void {
  boxes.push({ id, minX: cx - halfX, maxX: cx + halfX, minZ: cz - halfZ, maxZ: cz + halfZ, minY, maxY, yaw });
}

/** Rails on both sides of a ramp between `fromU` and `toU` along it, as rotated boxes. */
function addRampRails(ramp: ISkyRamp, fromU: number, toU: number): void {
  const dx = ramp.bx - ramp.ax;
  const dz = ramp.bz - ramp.az;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  const yaw = Math.atan2(-uz, ux);
  const segments = 4;
  for (const side of [-1, 1]) {
    for (let i = 0; i < segments; i++) {
      const u0 = fromU + ((toU - fromU) * i) / segments;
      const u1 = fromU + ((toU - fromU) * (i + 1)) / segments;
      const um = (u0 + u1) / 2;
      const off = (ramp.halfWidth + RAIL_THICKNESS_M / 2) * side;
      const cx = ramp.ax + dx * um - uz * off;
      const cz = ramp.az + dz * um + ux * off;
      const floor = ramp.ay + (ramp.by - ramp.ay) * Math.min(u0, u1);
      const half = (len * (u1 - u0)) / 2 + 0.05;
      addBox(`rail-${ramp.id}-${side > 0 ? 'r' : 'l'}-${i}`, cx, cz, half, RAIL_THICKNESS_M / 2, Math.min(floor, ramp.ay + (ramp.by - ramp.ay) * u1), Math.max(floor, ramp.ay + (ramp.by - ramp.ay) * u1) + RAIL_HEIGHT_M, yaw);
    }
  }
}

// Footbridge railing: one rail along each side of the walkway.
for (const side of [-1, 1]) {
  addBox(
    `rail-garden-footbridge-${side > 0 ? 's' : 'n'}`,
    GARDEN_FOOTBRIDGE.x,
    GARDEN_FOOTBRIDGE.z + side * (GARDEN_FOOTBRIDGE.halfWidth + RAIL_THICKNESS_M / 2),
    GARDEN_FOOTBRIDGE.halfLength,
    RAIL_THICKNESS_M / 2,
    DECK_Y,
    DECK_Y + RAIL_HEIGHT_M
  );
}

// Cave: back and side walls, the lip's underside, and the ledge railing toward the water.
const caveY = GARDEN_CAVE_FLOOR.y;
const lipBottomY = DECK_Y - 0.6;
addBox('garden-cave-wall-west', GARDEN_CAVE_FLOOR.minX - 0.2, (GARDEN_CAVE_FLOOR.minZ + 38.6 + GARDEN.z) / 2, 0.2, (38.6 + GARDEN.z - GARDEN_CAVE_FLOOR.minZ) / 2, caveY, lipBottomY);
addBox('garden-cave-wall-east', GARDEN_CAVE_FLOOR.maxX + 0.2, (GARDEN_CAVE_FLOOR.minZ + 38.6 + GARDEN.z) / 2, 0.2, (38.6 + GARDEN.z - GARDEN_CAVE_FLOOR.minZ) / 2, caveY, lipBottomY);
addBox('garden-cave-wall-back', (GARDEN_CAVE_FLOOR.minX + GARDEN_CAVE_FLOOR.maxX) / 2, GARDEN_CAVE_FLOOR.minZ - 0.2, (GARDEN_CAVE_FLOOR.maxX - GARDEN_CAVE_FLOOR.minX) / 2 + 0.4, 0.2, caveY, lipBottomY);
addBox('rail-garden-cave-ledge-south', (GARDEN_CAVE_LEDGE.minX + GARDEN_CAVE_LEDGE.maxX) / 2, GARDEN_CAVE_LEDGE.maxZ + 0.15, (GARDEN_CAVE_LEDGE.maxX - GARDEN_CAVE_LEDGE.minX) / 2, 0.15, caveY, caveY + RAIL_HEIGHT_M);
addBox('rail-garden-cave-ledge-west', GARDEN_CAVE_LEDGE.minX - 0.15, (GARDEN_CAVE_LEDGE.minZ + GARDEN_CAVE_LEDGE.maxZ) / 2, 0.15, (GARDEN_CAVE_LEDGE.maxZ - GARDEN_CAVE_LEDGE.minZ) / 2 + 0.3, caveY, caveY + RAIL_HEIGHT_M);
// The ramp leaves the deck at about 45 % of its length and meets the ledge at about 92 %.
addRampRails(GARDEN_CAVE_RAMP, 0.45, 0.92);

// Hollow World Tree trunk wall ring: 16 bark-wall segments at r = 6.6m with a wide doorway on the north side.
{
  const wallSegments = 16;
  const wallR = (SKY_TREE.hollowInnerR + SKY_TREE.hollowOuterR) / 2;
  const wallThickness = SKY_TREE.hollowOuterR - SKY_TREE.hollowInnerR;
  for (let i = 0; i < wallSegments; i++) {
    const ang = ((i + 0.5) / wallSegments) * Math.PI * 2;
    const doorDiff = Math.abs(Math.atan2(Math.sin(ang - SKY_TREE.entranceAngle), Math.cos(ang - SKY_TREE.entranceAngle)));
    if (doorDiff < 0.52) continue;
    const chord = (2 * Math.PI * wallR) / wallSegments;
    addBox(
      `sky-tree-hollow-wall-${i}`,
      SKY_TREE.x + Math.cos(ang) * wallR,
      SKY_TREE.z + Math.sin(ang) * wallR,
      chord * 0.52,
      wallThickness / 2,
      DECK_Y,
      DECK_Y + 9.2,
      Math.atan2(-Math.cos(ang), -Math.sin(ang))
    );
  }
}

// Exterior mushroom stems (thick) and interior hollow parkour mushroom stems (slender so they don't obstruct jumps).
GARDEN_BOUNCE_PADS.slice(0, 2).forEach((p) => addBox(`${p.id}-stem`, p.x, p.z, 0.5, 0.5, DECK_Y, p.topY - 0.05));
SKY_TREE_HOLLOW_PADS.forEach((p) => addBox(`${p.id}-stem`, p.x, p.z, 0.22, 0.22, DECK_Y, p.topY - 0.1));
for (const p of [SKY_TREE_ROOT_LANDING, SKY_TREE_BRANCH_LOW, SKY_TREE_BRANCH_HIGH]) {
  addBox(`${p.id}-post`, p.x, p.z, 0.45, 0.45, DECK_Y, p.y - 0.4);
}
// Crown railing: full circle around the outer rim except a gap where the upper branch arrives.
{
  const arrive = Math.atan2(SKY_TREE_BRANCHES[1].bz - SKY_TREE_CROWN.z, SKY_TREE_BRANCHES[1].bx - SKY_TREE_CROWN.x);
  const segments = 24;
  const r = SKY_TREE_CROWN.outerR - 0.2;
  for (let i = 0; i < segments; i++) {
    const ang = ((i + 0.5) / segments) * Math.PI * 2;
    const gap = Math.abs(Math.atan2(Math.sin(ang - arrive), Math.cos(ang - arrive)));
    if (gap < 0.38) continue;
    const chord = (2 * Math.PI * r) / segments;
    addBox(
      `rail-sky-tree-crown-${i}`,
      SKY_TREE_CROWN.x + Math.cos(ang) * r,
      SKY_TREE_CROWN.z + Math.sin(ang) * r,
      chord * 0.55,
      RAIL_THICKNESS_M / 2,
      SKY_TREE_CROWN.y,
      SKY_TREE_CROWN.y + RAIL_HEIGHT_M,
      Math.atan2(-Math.cos(ang), -Math.sin(ang))
    );
  }
}

/** Summary: Every solid box of the Floating Garden (cave, rails, hollow World Tree walls, mushroom stems). */
export const GARDEN_SOLID_BOXES: readonly ISkySolidBox[] = boxes;
// #endregion

// ======================== PUBLIC QUERIES ======================== \\
// #region Surface Visitor
/**
 * Summary: Calls `visit` for every Floating Garden addition walkable at (x, z).
 * @param x World X.
 * @param z World Z.
 * @param visit Receives the surface height, a kind tag and an id.
 */
export function visitFloatingGardenSurfaces(
  x: number,
  z: number,
  visit: (y: number, kind: 'deck' | 'ramp' | 'pad', id: string) => void
): void {
  if (Math.abs(x - GARDEN.x) > 60 || Math.abs(z - GARDEN.z) > 60) return;
  for (const d of [GARDEN_WATERFALL_LIP, GARDEN_CAVE_FLOOR, GARDEN_CAVE_LEDGE]) {
    if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) visit(d.y, 'deck', d.id);
  }
  for (const r of [GARDEN_CAVE_RAMP, GARDEN_ROOT_RAMP, ...SKY_TREE_BRANCHES]) {
    const sx = r.bx - r.ax;
    const sz = r.bz - r.az;
    const u = ((x - r.ax) * sx + (z - r.az) * sz) / (sx * sx + sz * sz);
    if (u >= 0 && u <= 1 && Math.hypot(x - (r.ax + sx * u), z - (r.az + sz * u)) <= r.halfWidth) {
      visit(r.ay + (r.by - r.ay) * u, 'ramp', r.id);
    }
  }
  for (const p of [SKY_TREE_ROOT_LANDING, SKY_TREE_BRANCH_LOW, SKY_TREE_BRANCH_HIGH, GARDEN_ROOT_NOOK]) {
    if (Math.hypot(x - p.x, z - p.z) <= p.radius) visit(p.y, 'deck', p.id);
  }
  const crownDist = Math.hypot(x - SKY_TREE_CROWN.x, z - SKY_TREE_CROWN.z);
  if (crownDist >= SKY_TREE_CROWN.innerR && crownDist <= SKY_TREE_CROWN.outerR) visit(SKY_TREE_CROWN.y, 'deck', SKY_TREE_CROWN.id);
  for (const p of GARDEN_BOUNCE_PADS) {
    if (Math.hypot(x - p.x, z - p.z) <= p.radius) visit(p.topY, 'pad', p.id);
  }
}
// #endregion
