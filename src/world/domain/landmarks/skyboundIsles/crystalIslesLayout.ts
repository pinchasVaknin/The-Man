// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Pure data plus one surface visitor. Three islets ring the main Crystal Isle and are
//         reached over floating stepping rocks, generated with even gaps like the cloud routes.
//         The hidden passage is a ramp down the east cliff to a grotto, walled in by crystal
//         and closed by a crystal gate until the resonance puzzle is solved.
// SUMMARY: Crystal Isles: islets, stepping rocks, the giant crystal, the passage, gate and
//          grotto, the three resonance crystals, the clue pillar and the mining deposits.
//          No rendering, no runtime state.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { getSkyIsland } from './skyboundLayout';
import type { ISkyDeckRect, ISkyRamp, ISkySolidBox } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Frame
const MAIN = getSkyIsland('crystal-isles')!;
const DECK_Y = MAIN.deckY;
const RAIL_HEIGHT_M = 1.1;
const RAIL_THICKNESS_M = 0.3;
/** Largest and smallest edge gap (m) between two stepping rocks. */
const ROCK_MAX_GAP_M = 2.0;
const ROCK_MIN_GAP_M = 0.8;
// #endregion

// #region Types
/** Summary: A small round walkable disc (islet deck or stepping rock). */
export interface ICrystalDisc {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly y: number;
  readonly radius: number;
}

/** Summary: A crystal deposit the player can mine with a pickaxe. */
export interface ICrystalDepositDef {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  /** Gems given each time the deposit is mined out. */
  readonly yield: readonly string[];
}
// #endregion

// ======================== ISLETS AND STEPPING ROCKS ======================== \\
// #region Islets
/** Summary: The three islets around the main isle (north, north-east, south-east). */
export const CRYSTAL_ISLETS: readonly ICrystalDisc[] = [
  { id: 'crystal-islet-north', x: 866.0, z: -48.0, y: DECK_Y + 3.0, radius: 6.0 },
  { id: 'crystal-islet-north-east', x: 902.0, z: -38.0, y: DECK_Y + 2.0, radius: 7.0 },
  { id: 'crystal-islet-south-east', x: 903.0, z: 10.0, y: DECK_Y - 2.0, radius: 6.0 },
];

/** Rocks between the main isle's rim and an islet's rim, evenly spaced and evenly rising. */
function steppingRocks(islet: ICrystalDisc, wantedRadius: number): ICrystalDisc[] {
  const dx = islet.x - MAIN.x;
  const dz = islet.z - MAIN.z;
  const dist = Math.hypot(dx, dz);
  const ux = dx / dist;
  const uz = dz / dist;
  const span = dist - MAIN.radius - islet.radius;
  const count = Math.max(1, Math.ceil((span - ROCK_MAX_GAP_M) / (wantedRadius * 2 + ROCK_MAX_GAP_M)));
  const radius = Math.min(wantedRadius, (span - (count + 1) * ROCK_MIN_GAP_M) / (2 * count));
  const gap = (span - count * radius * 2) / (count + 1);
  return Array.from({ length: count }, (_, i) => {
    const along = MAIN.radius + gap * (i + 1) + radius * (2 * i + 1);
    return {
      id: `${islet.id}-rock-${i}`,
      x: MAIN.x + ux * along,
      z: MAIN.z + uz * along,
      y: DECK_Y + ((islet.y - DECK_Y) * (i + 1)) / (count + 1),
      radius,
    };
  });
}

/**
 * Summary: Floating stepping rocks from the main isle to each islet, in walking order per islet.
 * Design: Rocks on a path that goes down are larger: a walking jump down carries further, so a
 *         small rock would be easy to overshoot.
 */
export const CRYSTAL_STEPPING_ROCKS: ReadonlyArray<{ readonly isletId: string; readonly rocks: readonly ICrystalDisc[] }> = CRYSTAL_ISLETS.map((islet) => ({
  isletId: islet.id,
  rocks: steppingRocks(islet, islet.y < DECK_Y ? 2.0 : 1.5),
}));
// #endregion

// ======================== GIANT CRYSTAL, PASSAGE AND GROTTO ======================== \\
// #region Giant Crystal
/** Summary: The giant central crystal (embedded in the deck). */
export const GIANT_CRYSTAL = { x: MAIN.x + 4.0, z: MAIN.z + 4.0, radius: 2.4, height: 14.0 } as const;

/** Summary: Pillar near the giant crystal whose three gems show the resonance order (top first). */
export const RESONANCE_CLUE_PILLAR = { x: MAIN.x - 2.0, z: MAIN.z + 9.0 } as const;
// #endregion

// #region Hidden Passage
const PASSAGE_Z = MAIN.z;
const PASSAGE_HALF_WIDTH = 1.3;
/** The passage runs along the isle's centre line, so it leaves the deck exactly at the east rim. */
const EAST_RIM_X = MAIN.x + MAIN.radius;

/**
 * Summary: Ramp from the east rim down the cliff to the crystal grotto.
 * Design: It starts exactly at the rim at deck height, so the deck above never hides it and
 *         walking off the deck onto it is level.
 */
export const CRYSTAL_PASSAGE_RAMP: ISkyRamp = {
  id: 'crystal-passage-ramp',
  ax: EAST_RIM_X,
  ay: DECK_Y,
  az: PASSAGE_Z,
  bx: EAST_RIM_X + 7.5,
  by: DECK_Y - 5.0,
  bz: PASSAGE_Z,
  halfWidth: PASSAGE_HALF_WIDTH,
};

/** Summary: The grotto hanging off the east cliff, at the bottom of the passage. */
export const CRYSTAL_GROTTO: ISkyDeckRect = { id: 'crystal-grotto', minX: EAST_RIM_X + 7.0, maxX: EAST_RIM_X + 13.5, minZ: PASSAGE_Z - 4.0, maxZ: PASSAGE_Z + 4.0, y: DECK_Y - 5.0 };

/** Summary: Crystal wall closing the passage until the resonance puzzle is solved. */
export const CRYSTAL_PASSAGE_GATE: ISkySolidBox = {
  id: 'crystal-passage-gate',
  minX: MAIN.x + 16.6,
  maxX: MAIN.x + 17.4,
  minZ: PASSAGE_Z - PASSAGE_HALF_WIDTH - 0.4,
  maxZ: PASSAGE_Z + PASSAGE_HALF_WIDTH + 0.4,
  minY: DECK_Y,
  maxY: DECK_Y + 4.0,
};
// #endregion

// ======================== RESONANCE PUZZLE AND MINING ======================== \\
// #region Resonance Crystals
/** Summary: The three resonance crystals and their colours (blue, violet, cyan). */
export const RESONANCE_CRYSTALS = [
  { id: 'resonance-crystal-blue', color: 'blue', x: MAIN.x - 12.0, z: MAIN.z + 10.0, y: DECK_Y },
  { id: 'resonance-crystal-violet', color: 'violet', x: MAIN.x + 10.0, z: MAIN.z - 14.0, y: DECK_Y },
  { id: 'resonance-crystal-cyan', color: 'cyan', x: CRYSTAL_ISLETS[1].x + 1.5, z: CRYSTAL_ISLETS[1].z - 1.5, y: CRYSTAL_ISLETS[1].y },
] as const;

/** Summary: Order the crystals must be touched in, as the clue pillar shows (top to bottom). */
export const RESONANCE_ORDER: readonly string[] = ['resonance-crystal-violet', 'resonance-crystal-cyan', 'resonance-crystal-blue'];
// #endregion

// #region Deposits
/** Summary: Mineable crystal deposits on the isle, the islets and in the grotto. */
export const CRYSTAL_DEPOSITS: readonly ICrystalDepositDef[] = [
  { id: 'deposit-main-west', x: MAIN.x - 15.0, y: DECK_Y, z: MAIN.z - 6.0, radius: 0.9, yield: ['crystal_gem', 'crystal_gem'] },
  { id: 'deposit-main-south', x: MAIN.x - 6.0, y: DECK_Y, z: MAIN.z + 17.0, radius: 0.9, yield: ['crystal_gem', 'amethyst_gem'] },
  { id: 'deposit-main-east', x: MAIN.x + 8.0, y: DECK_Y, z: MAIN.z + 16.0, radius: 0.9, yield: ['crystal_gem', 'sapphire_gem'] },
  { id: 'deposit-islet-north', x: CRYSTAL_ISLETS[0].x - 2.0, y: CRYSTAL_ISLETS[0].y, z: CRYSTAL_ISLETS[0].z - 2.0, radius: 0.9, yield: ['amethyst_gem', 'amethyst_gem'] },
  { id: 'deposit-islet-south-east', x: CRYSTAL_ISLETS[2].x + 2.0, y: CRYSTAL_ISLETS[2].y, z: CRYSTAL_ISLETS[2].z + 2.0, radius: 0.9, yield: ['sapphire_gem', 'crystal_gem'] },
  { id: 'deposit-grotto-heart', x: CRYSTAL_GROTTO.maxX - 1.6, y: CRYSTAL_GROTTO.y, z: PASSAGE_Z, radius: 1.0, yield: ['sapphire_gem', 'sapphire_gem', 'amethyst_gem', 'crystal_gem'] },
];
// #endregion

// ======================== CRYSTAL CLUSTERS ======================== \\
// #region Crystal Clusters
/** Summary: A decorative crystal grown out of the rock; solid, so the player walks around it. */
export interface ICrystalCluster {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale: number;
  readonly violet: boolean;
}

/** Points that must stay clear of crystals (arrivals, exits, puzzle pieces), with a clear radius. */
function keepClearSpots(): Array<{ x: number; z: number; r: number }> {
  const spots: Array<{ x: number; z: number; r: number }> = [
    { x: 866.0, z: -22.0, r: 5.0 },
    { x: 851.6, z: -17.6, r: 5.0 },
    { x: MAIN.x, z: MAIN.z + MAIN.radius, r: 7.0 },
    { x: GIANT_CRYSTAL.x, z: GIANT_CRYSTAL.z, r: GIANT_CRYSTAL.radius + 3.0 },
    { x: RESONANCE_CLUE_PILLAR.x, z: RESONANCE_CLUE_PILLAR.z, r: 3.0 },
    { x: MAIN.x, z: MAIN.z, r: 3.0 },
  ];
  for (const c of RESONANCE_CRYSTALS) spots.push({ x: c.x, z: c.z, r: 3.2 });
  for (const d of CRYSTAL_DEPOSITS) spots.push({ x: d.x, z: d.z, r: 3.2 });
  for (const path of CRYSTAL_STEPPING_ROCKS) {
    const islet = CRYSTAL_ISLETS.find((i) => i.id === path.isletId)!;
    const dx = islet.x - MAIN.x;
    const dz = islet.z - MAIN.z;
    const len = Math.hypot(dx, dz);
    spots.push({ x: MAIN.x + (dx / len) * MAIN.radius, z: MAIN.z + (dz / len) * MAIN.radius, r: 6.0 });
    spots.push({ x: islet.x - (dx / len) * islet.radius, z: islet.z - (dz / len) * islet.radius, r: 4.0 });
    spots.push({ x: islet.x, z: islet.z, r: 2.5 });
  }
  return spots;
}

function isInPassageCorridor(x: number, z: number): boolean {
  return x > CRYSTAL_PASSAGE_GATE.minX - 4.0 && Math.abs(z - PASSAGE_Z) < PASSAGE_HALF_WIDTH + 3.0;
}

function buildClusters(): ICrystalCluster[] {
  const spots = keepClearSpots();
  const clear = (x: number, z: number): boolean => spots.every((p) => Math.hypot(x - p.x, z - p.z) > p.r) && !isInPassageCorridor(x, z);
  const clusters: ICrystalCluster[] = [];
  const count = 46;
  for (let i = 0; i < count; i++) {
    // Golden-angle spiral over the deck keeps the spread even and repeatable.
    const r = Math.sqrt((i + 0.5) / count) * MAIN.radius * 0.88;
    const a = i * 2.39996;
    const x = MAIN.x + Math.cos(a) * r;
    const z = MAIN.z + Math.sin(a) * r;
    if (clear(x, z)) clusters.push({ x, y: DECK_Y, z, scale: 0.6 + (i % 4) * 0.35, violet: i % 3 !== 0 });
  }
  for (const islet of CRYSTAL_ISLETS) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      const x = islet.x + Math.cos(a) * islet.radius * 0.72;
      const z = islet.z + Math.sin(a) * islet.radius * 0.72;
      if (clear(x, z)) clusters.push({ x, y: islet.y, z, scale: 0.8 + (k % 3) * 0.45, violet: k % 2 === 0 });
    }
  }
  return clusters;
}

/** Summary: Every decorative crystal on the isle and the islets, clear of paths and puzzle pieces. */
export const CRYSTAL_CLUSTERS: readonly ICrystalCluster[] = buildClusters();
// #endregion

// ======================== SOLID BOXES ======================== \\
// #region Solid Boxes
const boxes: ISkySolidBox[] = [];

function addBox(id: string, cx: number, cz: number, halfX: number, halfZ: number, minY: number, maxY: number, yaw?: number): void {
  boxes.push({ id, minX: cx - halfX, maxX: cx + halfX, minZ: cz - halfZ, maxZ: cz + halfZ, minY, maxY, yaw });
}

// Giant crystal (octagon from two square boxes) and the clue pillar.
addBox('giant-crystal-a', GIANT_CRYSTAL.x, GIANT_CRYSTAL.z, GIANT_CRYSTAL.radius * 0.72, GIANT_CRYSTAL.radius * 0.72, DECK_Y, DECK_Y + GIANT_CRYSTAL.height);
addBox('giant-crystal-b', GIANT_CRYSTAL.x, GIANT_CRYSTAL.z, GIANT_CRYSTAL.radius * 0.72, GIANT_CRYSTAL.radius * 0.72, DECK_Y, DECK_Y + GIANT_CRYSTAL.height, Math.PI / 4);
addBox('resonance-clue-pillar', RESONANCE_CLUE_PILLAR.x, RESONANCE_CLUE_PILLAR.z, 0.45, 0.45, DECK_Y, DECK_Y + 3.2);

// Crystal walls enclosing the passage on the deck (from the gate to the rim), then rails down the cliff.
{
  const r = CRYSTAL_PASSAGE_RAMP;
  const gateX = (CRYSTAL_PASSAGE_GATE.minX + CRYSTAL_PASSAGE_GATE.maxX) / 2;
  const yAt = (x: number): number => r.ay + ((r.by - r.ay) * (x - r.ax)) / (r.bx - r.ax);
  for (const side of [-1, 1]) {
    const tag = side > 0 ? 's' : 'n';
    addBox(`crystal-passage-wall-${tag}`, (gateX + EAST_RIM_X) / 2, PASSAGE_Z + side * (PASSAGE_HALF_WIDTH + 0.5), (EAST_RIM_X - gateX) / 2 + 0.3, 0.5, DECK_Y, DECK_Y + 4.0);
    const railToX = r.bx - 0.4;
    addBox(`rail-crystal-passage-${tag}`, (EAST_RIM_X + railToX) / 2, PASSAGE_Z + side * (PASSAGE_HALF_WIDTH + RAIL_THICKNESS_M / 2), (railToX - EAST_RIM_X) / 2, RAIL_THICKNESS_M / 2, yAt(railToX), yAt(EAST_RIM_X) + RAIL_HEIGHT_M);
  }
}

// Grotto: back wall and side walls under the rim.
const G = CRYSTAL_GROTTO;
addBox('crystal-grotto-wall-east', G.maxX + 0.25, (G.minZ + G.maxZ) / 2, 0.25, (G.maxZ - G.minZ) / 2 + 0.5, G.y, G.y + 4.4);
for (const side of [-1, 1]) {
  addBox(`crystal-grotto-wall-${side > 0 ? 's' : 'n'}`, (G.minX + G.maxX) / 2, (side > 0 ? G.maxZ : G.minZ) + side * 0.25, (G.maxX - G.minX) / 2 + 0.5, 0.25, G.y, G.y + 4.4);
}

// Resonance crystals and deposits are solid, so the player bumps into them and swings at them.
RESONANCE_CRYSTALS.forEach((c) => addBox(c.id, c.x, c.z, 0.55, 0.55, c.y, c.y + 2.6));
CRYSTAL_DEPOSITS.forEach((d) => addBox(d.id, d.x, d.z, d.radius * 0.7, d.radius * 0.7, d.y, d.y + 1.0));
CRYSTAL_CLUSTERS.forEach((c, i) => addBox(`crystal-cluster-${i}`, c.x, c.z, 0.38 * c.scale, 0.38 * c.scale, c.y, c.y + 1.4 * c.scale));

/** Summary: Every static solid box of the Crystal Isles (the passage gate is separate). */
export const CRYSTAL_SOLID_BOXES: readonly ISkySolidBox[] = boxes;
// #endregion

// ======================== PUBLIC QUERIES ======================== \\
// #region Surface Visitor
/**
 * Summary: Calls `visit` for every Crystal Isles addition walkable at (x, z): islets, stepping
 *          rocks, the passage ramp and the grotto floor.
 * @param x World X.
 * @param z World Z.
 * @param visit Receives the surface height, a kind tag and an id.
 */
export function visitCrystalIslesSurfaces(x: number, z: number, visit: (y: number, kind: 'deck' | 'ramp', id: string) => void): void {
  if (Math.abs(x - MAIN.x) > 50 || Math.abs(z - MAIN.z) > 50) return;
  for (const islet of CRYSTAL_ISLETS) {
    if (Math.hypot(x - islet.x, z - islet.z) <= islet.radius) visit(islet.y, 'deck', islet.id);
  }
  for (const path of CRYSTAL_STEPPING_ROCKS) {
    for (const rock of path.rocks) {
      if (Math.hypot(x - rock.x, z - rock.z) <= rock.radius) visit(rock.y, 'deck', rock.id);
    }
  }
  if (x >= G.minX && x <= G.maxX && z >= G.minZ && z <= G.maxZ) visit(G.y, 'deck', G.id);
  const r = CRYSTAL_PASSAGE_RAMP;
  const sx = r.bx - r.ax;
  const sz = r.bz - r.az;
  const u = ((x - r.ax) * sx + (z - r.az) * sz) / (sx * sx + sz * sz);
  if (u >= 0 && u <= 1 && Math.hypot(x - (r.ax + sx * u), z - (r.az + sz * u)) <= r.halfWidth) visit(r.ay + (r.by - r.ay) * u, 'ramp', r.id);
}
// #endregion
