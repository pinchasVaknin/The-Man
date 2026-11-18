// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Pure data plus one surface visitor, following the approved hub sketch: arrival plaza
//         in the west (where the waterfall climb lands), Windspire in the centre with an outer
//         spiral stair, Sky Garden in the north, Sky Dock in the south-east and three
//         observation balconies. Railings and solid props are rotated boxes, so curved
//         railings (stair, tower balcony) follow their curve.
// SUMMARY: Everything walkable or solid that Sky Harbor adds on top of its flat deck:
//          balconies, pier, airship deck, gangplank, Windspire stair and balcony ring,
//          canopy perch, bounce mushrooms and the collision boxes of every hub prop.
//          Does not render anything and holds no runtime state.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { SKY_HARBOR, WINDSPIRE } from './skyboundLayout';
import { SKY_HOVERBIKE_SHOP_POS } from '../../../systems/skyHoverbikeSystem';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Axis-aligned walkable rectangle at height `y`. */
export interface ISkyDeckRect {
  readonly id: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly y: number;
}

/** Summary: Straight walkable ramp from A to B (same shape as an archipelago bridge). */
export interface ISkyRamp {
  readonly id: string;
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  readonly bx: number;
  readonly by: number;
  readonly bz: number;
  readonly halfWidth: number;
}

/** Summary: Solid box, optionally rotated by `yaw` around its centre (Three.js Y rotation). */
export interface ISkySolidBox {
  readonly id: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly minY: number;
  readonly maxY: number;
  readonly yaw?: number;
}

/** Summary: Mushroom cap that launches whoever stands on it. */
export interface ISkyBouncePad {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly topY: number;
  readonly radius: number;
  readonly bounceVy: number;
}

/** Summary: A balcony rectangle and which of its sides face the void (get a railing). */
interface IBalconySpec {
  readonly deck: ISkyDeckRect;
  /** Side facing the hub deck; it stays open. */
  readonly openSide: 'minX' | 'maxX' | 'minZ' | 'maxZ';
}
// #endregion

// #region Tuning
const DECK_Y = SKY_HARBOR.deckY;
const RAIL_HEIGHT_M = 1.1;
const RAIL_THICKNESS_M = 0.3;
/** Feet may be at most this far (m) below a hub surface and still land on it. */
const LANDING_TOLERANCE_M = 1.5;
// #endregion

// ======================== ARRIVAL PLAZA ======================== \\
// #region Arrival Plaza
/** Summary: Paved plaza where the waterfall climb arrives (visual area; the deck is flat). */
export const ARRIVAL_PLAZA = { minX: 735.0, maxX: 762.0, minZ: -50.0, maxZ: -20.0 } as const;

/** Summary: The two pillars of the monumental arrival gate, framing the climb's 8 m wide ledge. */
export const ARRIVAL_GATE = { x: 738.5, pillarZ: [-42.0, -28.0], pillarHalf: 1.2, height: 14.0 } as const;

const PLAZA_PILLAR_XS = [746.0, 753.0, 760.0] as const;
const PLAZA_PILLAR_ZS = [-50.0, -20.0] as const;
/** Summary: Plaza colonnade pillar positions (half size 0.6 m, 7 m tall). */
export const PLAZA_PILLARS = PLAZA_PILLAR_ZS.flatMap((z) => PLAZA_PILLAR_XS.map((x) => ({ x, z })));

/** Summary: Benches (standable, 0.5 m high) facing the plaza centre. */
export const PLAZA_BENCHES = [
  { x: 749.0, z: -45.5 },
  { x: 756.0, z: -45.5 },
  { x: 749.0, z: -24.5 },
  { x: 756.0, z: -24.5 },
] as const;

/** Summary: Lantern posts at the plaza corners. */
export const PLAZA_LANTERNS = [
  { x: 742.0, z: -47.5 },
  { x: 742.0, z: -22.5 },
  { x: 762.0, z: -47.5 },
  { x: 762.0, z: -22.5 },
] as const;
// #endregion

// ======================== OBSERVATION BALCONIES ======================== \\
// #region Balconies
const BALCONIES: readonly IBalconySpec[] = [];

/** Summary: Observation balconies on the outer rim (removed per design; telescopes stand on the Windspire Balcony). */
export const SKY_BALCONIES: readonly ISkyDeckRect[] = [];
// #endregion

// ======================== WINDSPIRE ======================== \\
// #region Windspire
/**
 * Summary: Outer spiral stair of the Windspire, from the deck to the tower balcony.
 * Design: 1.25 turns over 12 m (about a 20 % grade). Angles use atan2(z - cz, x - cx) and
 *         grow counter-clockwise; it starts on the west side, facing the arrival plaza.
 */
export const WINDSPIRE_STAIR = {
  cx: SKY_HARBOR.x,
  cz: SKY_HARBOR.z,
  innerR: 6.4,
  outerR: 9.4,
  baseY: DECK_Y,
  topY: DECK_Y + 12.0,
  startAngle: Math.PI,
  turns: 1.25,
} as const;

/** Summary: Tower balcony ring around the Windspire, just outside the stair, at the stair's top height. */
export const WINDSPIRE_BALCONY = {
  cx: SKY_HARBOR.x,
  cz: SKY_HARBOR.z,
  innerR: WINDSPIRE_STAIR.outerR,
  outerR: 12.0,
  y: WINDSPIRE_STAIR.topY,
} as const;

/**
 * Summary: Landing at the top of the stair, continuing the stair's footprint for a short arc
 *          at balcony height, so walking on past the last step never drops you onto the lower pass.
 */
export const WINDSPIRE_TOP_LANDING = {
  fromAngle: WINDSPIRE_STAIR.startAngle + WINDSPIRE_STAIR.turns * Math.PI * 2,
  arc: 0.6,
  y: WINDSPIRE_STAIR.topY,
} as const;

/**
 * Summary: Summit platform on top of the Windspire, below the floating crystal.
 * Design: Reached only by the summit updraft (four Wind Cores); its railing leaves a gap on
 *         the east side, where the updraft arrives.
 */
export const WINDSPIRE_SUMMIT = { cx: SKY_HARBOR.x, cz: SKY_HARBOR.z, radius: 7.0, y: DECK_Y + WINDSPIRE.height + 2.0, arrivalAngle: 0 } as const;

/** Summary: The four empty Wind Core sockets on the deck around the tower (diagonals, radius 14 m). */
export const WIND_CORE_SOCKETS = [1, 3, 5, 7].map((k) => {
  const ang = (k * Math.PI) / 4;
  return { id: `wind-core-socket-${(k + 1) / 2}`, x: SKY_HARBOR.x + Math.cos(ang) * 14.0, z: SKY_HARBOR.z + Math.sin(ang) * 14.0 };
});

/** Summary: The two telescopes mounted on top of the Windspire Summit (`WINDSPIRE_SUMMIT`), flanking the summit treasure chest on either side. */
export const BALCONY_TELESCOPE_SPOTS = [
  {
    balconyId: 'windspire-north-west',
    x: 774.2,
    y: WINDSPIRE_SUMMIT.y,
    z: -39.2,
    targetIslandId: 'ancient-sky-ruins',
  },
  {
    balconyId: 'windspire-south-east',
    x: 774.2,
    y: WINDSPIRE_SUMMIT.y,
    z: -30.8,
    targetIslandId: 'crystal-isles',
  },
] as const;
// #endregion

// ======================== SKY GARDEN ======================== \\
// #region Sky Garden
/** Summary: The garden area north of the tower (visual ellipse). */
export const SKY_GARDEN_AREA = { cx: 777.0, cz: -64.5, rx: 21.5, rz: 13.0 } as const;

/** Summary: Canopy perch on the giant garden tree, reached by the big mushroom or a wind flower. */
export const GARDEN_CANOPY_PERCH = { id: 'garden-canopy-perch', x: 770.0, z: -76.0, y: DECK_Y + 8.0, radius: 2.5 } as const;

/** Summary: Bounce mushrooms: small (walk on), medium, and big (launches to the canopy perch). */
export const SKY_BOUNCE_PADS: readonly ISkyBouncePad[] = [
  { id: 'mushroom-small', x: 762.0, z: -60.0, topY: DECK_Y + 0.5, radius: 1.4, bounceVy: 11.0 },
  { id: 'mushroom-medium', x: 767.0, z: -66.5, topY: DECK_Y + 1.0, radius: 1.8, bounceVy: 14.0 },
  { id: 'mushroom-big', x: 776.0, z: -68.0, topY: DECK_Y + 1.2, radius: 2.4, bounceVy: 17.5 },
];

/** Summary: Decorative garden trees (trunk positions); the perch tree stands under the perch. */
export const GARDEN_TREES = [
  { x: 758.0, z: -54.0, scale: 1.0 },
  { x: 795.0, z: -56.0, scale: 1.1 },
  { x: 791.0, z: -74.0, scale: 0.9 },
  { x: 757.0, z: -72.0, scale: 0.85 },
  { x: 783.0, z: -77.5, scale: 0.8 },
] as const;

/** Summary: Deep decorative Koi pond in the northern Sky Garden (visual only; the deck stays walkable). */
export const GARDEN_PONDS = [
  { x: 784.0, z: -61.5, radius: 4.6 },
] as const;
// #endregion

// ======================== SKY DOCK ======================== \\
// #region Sky Dock
/** Summary: Wooden pier reaching east past the rim, alongside the moored airship. */
export const SKY_DOCK_PIER: ISkyDeckRect = { id: 'dock-pier', minX: 812.0, maxX: 836.0, minZ: -11.0, maxZ: -5.0, y: DECK_Y };

/** Summary: Walkable main deck of the moored airship. */
export const MOORED_AIRSHIP_DECK: ISkyDeckRect = { id: 'airship-deck', minX: 815.0, maxX: 837.0, minZ: 0.5, maxZ: 7.5, y: DECK_Y + 1.5 };

/** Summary: Gangplank from the pier up to the airship deck. */
export const AIRSHIP_GANGPLANK: ISkyRamp = {
  id: 'airship-gangplank',
  ax: 826.0,
  ay: DECK_Y,
  az: SKY_DOCK_PIER.maxZ,
  bx: 826.0,
  by: MOORED_AIRSHIP_DECK.y,
  bz: MOORED_AIRSHIP_DECK.minZ,
  halfWidth: 1.2,
};

/** Summary: Cargo crates on the dock (1.1 m high, so a jump gets you on top); one is stacked. */
export const DOCK_CRATES = [
  { x: 799.0, z: -10.0, top: DECK_Y + 1.1 },
  { x: 800.4, z: -10.0, top: DECK_Y + 1.1 },
  { x: 799.7, z: -8.6, top: DECK_Y + 1.1 },
  { x: 803.0, z: -14.5, top: DECK_Y + 1.1 },
  { x: 803.0, z: -14.5 + 1.4, top: DECK_Y + 2.2 },
] as const;

/** Summary: Dock crane base position. */
export const DOCK_CRANE = { x: 807.0, z: -17.0, height: 9.0 } as const;
// #endregion

// ======================== SOLID BOXES ======================== \\
// #region Solid Boxes
const boxes: ISkySolidBox[] = [];

function addBox(id: string, cx: number, cz: number, halfX: number, halfZ: number, minY: number, maxY: number, yaw?: number): void {
  boxes.push({ id, minX: cx - halfX, maxX: cx + halfX, minZ: cz - halfZ, maxZ: cz + halfZ, minY, maxY, yaw });
}

/** Railings along every void-facing side of a rectangle deck, leaving `gaps` (x or z ranges) open. */
function addRectRails(
  deck: ISkyDeckRect,
  open: ReadonlyArray<'minX' | 'maxX' | 'minZ' | 'maxZ'>,
  gaps: ReadonlyArray<{ side: 'minX' | 'maxX' | 'minZ' | 'maxZ'; from: number; to: number }> = []
): void {
  const t = RAIL_THICKNESS_M / 2;
  const top = deck.y + RAIL_HEIGHT_M;
  const sides = [
    { side: 'minZ' as const, fixed: deck.minZ, from: deck.minX, to: deck.maxX, alongX: true },
    { side: 'maxZ' as const, fixed: deck.maxZ, from: deck.minX, to: deck.maxX, alongX: true },
    { side: 'minX' as const, fixed: deck.minX, from: deck.minZ, to: deck.maxZ, alongX: false },
    { side: 'maxX' as const, fixed: deck.maxX, from: deck.minZ, to: deck.maxZ, alongX: false },
  ];
  for (const s of sides) {
    if (open.includes(s.side)) continue;
    const cuts = gaps.filter((g) => g.side === s.side).sort((a, b) => a.from - b.from);
    let cursor = s.from;
    const pieces: Array<[number, number]> = [];
    for (const c of cuts) {
      if (c.from > cursor) pieces.push([cursor, c.from]);
      cursor = Math.max(cursor, c.to);
    }
    if (cursor < s.to) pieces.push([cursor, s.to]);
    pieces.forEach(([a, b], i) => {
      const mid = (a + b) / 2;
      const half = (b - a) / 2;
      const id = `rail-${deck.id}-${s.side}-${i}`;
      if (s.alongX) addBox(id, mid, s.fixed, half, t, deck.y, top);
      else addBox(id, s.fixed, mid, t, half, deck.y, top);
    });
  }
}

/** Tangential rail segments around a circle (or along a rising helix) at `radius`. */
function addCurvedRail(
  idPrefix: string,
  cx: number,
  cz: number,
  radius: number,
  startAngle: number,
  sweep: number,
  segments: number,
  yAt: (u: number) => number,
  maxTopY = Infinity
): void {
  const chord = (2 * Math.PI * radius * (Math.abs(sweep) / (2 * Math.PI))) / segments;
  for (let i = 0; i < segments; i++) {
    const u = (i + 0.5) / segments;
    const ang = startAngle + sweep * u;
    const px = cx + Math.cos(ang) * radius;
    const pz = cz + Math.sin(ang) * radius;
    // Tangent of a counter-clockwise circle in (x, z) is (-sin, cos); yaw = atan2(-tz, tx).
    const yaw = Math.atan2(-Math.cos(ang), -Math.sin(ang));
    const floor = yAt(u);
    addBox(`${idPrefix}-${i}`, px, pz, chord * 0.55, RAIL_THICKNESS_M / 2, floor, Math.min(floor + RAIL_HEIGHT_M, maxTopY), yaw);
  }
}

// Arrival gate and colonnade.
for (const pz of ARRIVAL_GATE.pillarZ) {
  addBox(`gate-pillar-${pz}`, ARRIVAL_GATE.x, pz, ARRIVAL_GATE.pillarHalf, ARRIVAL_GATE.pillarHalf, DECK_Y, DECK_Y + ARRIVAL_GATE.height);
}
PLAZA_PILLARS.forEach((p, i) => addBox(`plaza-pillar-${i}`, p.x, p.z, 0.6, 0.6, DECK_Y, DECK_Y + 7.0));
PLAZA_BENCHES.forEach((b, i) => addBox(`plaza-bench-${i}`, b.x, b.z, 1.1, 0.35, DECK_Y, DECK_Y + 0.5));
PLAZA_LANTERNS.forEach((l, i) => addBox(`plaza-lantern-${i}`, l.x, l.z, 0.2, 0.2, DECK_Y, DECK_Y + 3.2));

// Balcony railings and Windspire telescope stands.
for (const b of BALCONIES) addRectRails(b.deck, [b.openSide]);
BALCONY_TELESCOPE_SPOTS.forEach((t) => addBox(`telescope-stand-${t.balconyId}`, t.x, t.z, 0.28, 0.28, t.y, t.y + 1.3));

// Windspire: two square boxes (0 and 45 degrees) make an octagon inside the stair's inner edge.
addBox('windspire-core-a', SKY_HARBOR.x, SKY_HARBOR.z, 4.4, 4.4, DECK_Y, DECK_Y + WINDSPIRE.height);
addBox('windspire-core-b', SKY_HARBOR.x, SKY_HARBOR.z, 4.4, 4.4, DECK_Y, DECK_Y + WINDSPIRE.height, Math.PI / 4);
// Stair outer railing follows the helix; balcony ring railing goes all the way round.
const stairSweep = WINDSPIRE_STAIR.turns * Math.PI * 2;
// The stair rail stops 8 % before the top (where the player steps out onto the balcony ring) and
// never rises above the ring floor, so it cannot trip someone walking round the balcony.
addCurvedRail(
  'rail-windspire-stair',
  WINDSPIRE_STAIR.cx,
  WINDSPIRE_STAIR.cz,
  WINDSPIRE_STAIR.outerR + 0.2,
  WINDSPIRE_STAIR.startAngle,
  stairSweep * 0.92,
  30,
  (u) => WINDSPIRE_STAIR.baseY + (WINDSPIRE_STAIR.topY - WINDSPIRE_STAIR.baseY) * u * 0.92,
  WINDSPIRE_BALCONY.y - 0.1
);
// Radial railing closing the far end of the top landing.
{
  const endAng = WINDSPIRE_TOP_LANDING.fromAngle + WINDSPIRE_TOP_LANDING.arc;
  const midR = (WINDSPIRE_STAIR.innerR + WINDSPIRE_STAIR.outerR) / 2;
  const half = (WINDSPIRE_STAIR.outerR - WINDSPIRE_STAIR.innerR) / 2;
  addBox(
    'rail-windspire-landing-end',
    WINDSPIRE_STAIR.cx + Math.cos(endAng) * midR,
    WINDSPIRE_STAIR.cz + Math.sin(endAng) * midR,
    half,
    RAIL_THICKNESS_M / 2,
    WINDSPIRE_TOP_LANDING.y,
    WINDSPIRE_TOP_LANDING.y + RAIL_HEIGHT_M,
    Math.atan2(-Math.sin(endAng), Math.cos(endAng))
  );
}
addCurvedRail('rail-windspire-balcony', WINDSPIRE_BALCONY.cx, WINDSPIRE_BALCONY.cz, WINDSPIRE_BALCONY.outerR - 0.2, 0, Math.PI * 2, 28, () => WINDSPIRE_BALCONY.y);
WIND_CORE_SOCKETS.forEach((s) => addBox(s.id, s.x, s.z, 0.8, 0.8, DECK_Y, DECK_Y + 1.2));
// Summit railing: all the way round except the east gap where the summit updraft arrives.
{
  const r = WINDSPIRE_SUMMIT.radius - 0.2;
  const segments = 24;
  const chord = (2 * Math.PI * r) / segments;
  for (let i = 0; i < segments; i++) {
    const ang = ((i + 0.5) / segments) * Math.PI * 2;
    const gap = Math.abs(Math.atan2(Math.sin(ang - WINDSPIRE_SUMMIT.arrivalAngle), Math.cos(ang - WINDSPIRE_SUMMIT.arrivalAngle)));
    if (gap < 0.45) continue;
    addBox(
      `rail-windspire-summit-${i}`,
      WINDSPIRE_SUMMIT.cx + Math.cos(ang) * r,
      WINDSPIRE_SUMMIT.cz + Math.sin(ang) * r,
      chord * 0.55,
      RAIL_THICKNESS_M / 2,
      WINDSPIRE_SUMMIT.y,
      WINDSPIRE_SUMMIT.y + RAIL_HEIGHT_M,
      Math.atan2(-Math.cos(ang), -Math.sin(ang))
    );
  }
}

// Garden: mushroom stems (the caps are bounce surfaces) and the perch tree trunk.
SKY_BOUNCE_PADS.forEach((p) => addBox(`${p.id}-stem`, p.x, p.z, 0.45, 0.45, DECK_Y, p.topY - 0.05));
addBox('garden-perch-trunk', GARDEN_CANOPY_PERCH.x, GARDEN_CANOPY_PERCH.z, 0.7, 0.7, DECK_Y, GARDEN_CANOPY_PERCH.y - 0.4);
GARDEN_TREES.forEach((t, i) => addBox(`garden-tree-${i}`, t.x, t.z, 0.5 * t.scale, 0.5 * t.scale, DECK_Y, DECK_Y + 6.0 * t.scale));

// Dock: pier railings (gap for the gangplank), airship railings, mast, cabin, crates, crane, mooring posts.
const gangGap = { from: AIRSHIP_GANGPLANK.ax - AIRSHIP_GANGPLANK.halfWidth - 0.2, to: AIRSHIP_GANGPLANK.ax + AIRSHIP_GANGPLANK.halfWidth + 0.2 };
addRectRails(SKY_DOCK_PIER, ['minX'], [{ side: 'maxZ', ...gangGap }]);
addRectRails(MOORED_AIRSHIP_DECK, [], [{ side: 'minZ', ...gangGap }]);
addBox('airship-mast', 826.0, 4.0, 0.4, 0.4, MOORED_AIRSHIP_DECK.y, MOORED_AIRSHIP_DECK.y + 11.0);
addBox('airship-cabin', 833.5, 4.0, 2.5, 2.4, MOORED_AIRSHIP_DECK.y, MOORED_AIRSHIP_DECK.y + 2.6);
DOCK_CRATES.forEach((c, i) => addBox(`dock-crate-${i}`, c.x, c.z, 0.6, 0.6, c.top - 1.1, c.top));
addBox('dock-crane-base', DOCK_CRANE.x, DOCK_CRANE.z, 1.0, 1.0, DECK_Y, DECK_Y + DOCK_CRANE.height);
addBox('dock-mooring-post-a', 820.0, -5.6, 0.25, 0.25, DECK_Y, DECK_Y + 1.0);
addBox('dock-mooring-post-b', 832.0, -5.6, 0.25, 0.25, DECK_Y, DECK_Y + 1.0);

// Hoverbike shop pavilion: corner pillars, back tool-wall and the front counter (local shop space, rotated by the shop yaw).
function addShopBox(id: string, localX: number, localZ: number, halfX: number, halfZ: number, height: number): void {
  const { x, y, z, yaw } = SKY_HOVERBIKE_SHOP_POS;
  const wx = x + localX * Math.cos(yaw) + localZ * Math.sin(yaw);
  const wz = z - localX * Math.sin(yaw) + localZ * Math.cos(yaw);
  addBox(id, wx, wz, halfX, halfZ, y, y + height, yaw);
}
for (const [i, [px, pz]] of ([[-3.1, -1.8], [3.1, -1.8], [-3.1, 1.8], [3.1, 1.8]] as const).entries()) {
  addShopBox(`hoverbike-shop-pillar-${i}`, px, pz, 0.14, 0.14, 3.5);
}
addShopBox('hoverbike-shop-back-wall', 0, -1.85, 3.1, 0.11, 2.8);
addShopBox('hoverbike-shop-counter', -1.1, 1.25, 1.7, 0.39, 1.2);

/** Summary: Every solid box of the Sky Harbor props, railings and structures. */
export const SKY_HARBOR_SOLID_BOXES: readonly ISkySolidBox[] = boxes;
// #endregion

// ======================== PUBLIC QUERIES ======================== \\
// #region Surface Visitor
/**
 * Summary: Calls `visit` for every Sky Harbor addition walkable at (x, z).
 * Design: The caller keeps the "highest surface within a small step" rule, so stacked
 *         surfaces (stair passes, balcony over the deck) resolve the same way as islands.
 * @param x World X.
 * @param z World Z.
 * @param visit Receives the surface height, a kind tag and an id.
 */
export function visitSkyHarborSurfaces(
  x: number,
  z: number,
  visit: (y: number, kind: 'deck' | 'ramp' | 'stair' | 'pad', id: string) => void
): void {
  for (const d of [...SKY_BALCONIES, SKY_DOCK_PIER, MOORED_AIRSHIP_DECK]) {
    if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) visit(d.y, 'deck', d.id);
  }
  const r = AIRSHIP_GANGPLANK;
  const sx = r.bx - r.ax;
  const sz = r.bz - r.az;
  const u = ((x - r.ax) * sx + (z - r.az) * sz) / (sx * sx + sz * sz);
  if (u >= 0 && u <= 1 && Math.hypot(x - (r.ax + sx * u), z - (r.az + sz * u)) <= r.halfWidth) {
    visit(r.ay + (r.by - r.ay) * u, 'ramp', r.id);
  }

  const dx = x - WINDSPIRE_STAIR.cx;
  const dz = z - WINDSPIRE_STAIR.cz;
  const dist = Math.hypot(dx, dz);
  if (dist >= WINDSPIRE_STAIR.innerR && dist <= WINDSPIRE_STAIR.outerR) {
    const angle = Math.atan2(dz, dx);
    for (const y of windspireStairHeightsAt(angle)) visit(y, 'stair', 'windspire-stair');
    const pastEnd = (((angle - WINDSPIRE_TOP_LANDING.fromAngle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (pastEnd <= WINDSPIRE_TOP_LANDING.arc) visit(WINDSPIRE_TOP_LANDING.y, 'deck', 'windspire-top-landing');
  }
  if (dist >= WINDSPIRE_BALCONY.innerR && dist <= WINDSPIRE_BALCONY.outerR) visit(WINDSPIRE_BALCONY.y, 'deck', 'windspire-balcony');

  if (dist <= WINDSPIRE_SUMMIT.radius) visit(WINDSPIRE_SUMMIT.y, 'deck', 'windspire-summit');
  if (Math.hypot(x - GARDEN_CANOPY_PERCH.x, z - GARDEN_CANOPY_PERCH.z) <= GARDEN_CANOPY_PERCH.radius) {
    visit(GARDEN_CANOPY_PERCH.y, 'deck', GARDEN_CANOPY_PERCH.id);
  }
  for (const p of SKY_BOUNCE_PADS) {
    if (Math.hypot(x - p.x, z - p.z) <= p.radius) visit(p.topY, 'pad', p.id);
  }
}

/**
 * Summary: Heights of every pass of the Windspire stair at a polar angle (one or two passes).
 * @param angle atan2(z - cz, x - cx) in radians.
 */
export function windspireStairHeightsAt(angle: number): number[] {
  const sweep = WINDSPIRE_STAIR.turns * Math.PI * 2;
  const rise = WINDSPIRE_STAIR.topY - WINDSPIRE_STAIR.baseY;
  const rel = ((angle - WINDSPIRE_STAIR.startAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const heights: number[] = [];
  for (let wrap = 0; rel + wrap * Math.PI * 2 <= sweep; wrap++) {
    heights.push(WINDSPIRE_STAIR.baseY + (rise * (rel + wrap * Math.PI * 2)) / sweep);
  }
  return heights;
}

/** Summary: Landing tolerance shared with the archipelago surface query (m). */
export const SKY_HARBOR_LANDING_TOLERANCE_M = LANDING_TOLERANCE_M;
// #endregion
