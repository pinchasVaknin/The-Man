// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: One function per set piece, all sized from the layout data (fixtures, POIs, rail
//         lines) so the custom-drawn models sit exactly on their colliders. Moving parts are
//         returned as handles and animated by one update function.
// SUMMARY: Builds the unique machinery and architecture of the upper level: the portal and
//          gates, the Central Gold Funnel Pit and smoothly curved/switched railway network,
//          interactive minecart terminal kiosks, the crane, the 2nd-floor toolsmith mezzanine,
//          the Grand Dwarven Tavern/Pub, the underground sleeping quarters, the lagoon
//          underwater ecosystem (fish & minerals), the waterworks, galleries, and foundry.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  ANCIENT_MINE_ORIGIN,
  LAGOON_CHANNEL,
  MINE_LEVEL_Y,
  MINE_POI,
  MINE_SOLID_FIXTURES,
} from '../../domain/landmarks/ancientMine/ancientMineLayout';
import { UPPER_RAIL_LINES } from '../../domain/landmarks/ancientMine/ancientMineProps';
import { sampleAncientMineFloor } from '../../domain/landmarks/ancientMine/ancientMineFloor';
import {
  ALL_RIDEABLE_MINECART_LINES,
  evaluateRideableMinecartPose,
  getRideableMinecartVisualProgress,
} from '../../systems/dwarvenMineAndCaravanSystem';
import { MINE_PALETTE, buildPropGeometry } from './propGeometries';
import { createReadyKoiFish, type KoiFish } from '../../models/KoiFish';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Shared materials the set pieces are made of. */
export interface ISetPieceMaterials {
  readonly stone: THREE.Material;
  readonly darkStone: THREE.Material;
  readonly iron: THREE.Material;
  readonly wood: THREE.Material;
  readonly gold: THREE.Material;
  readonly ember: THREE.Material;
  readonly molten: THREE.Material;
  readonly void: THREE.Material;
  readonly water: THREE.Material;
  /** Summary: Vertex-coloured stone for merged statue geometry. */
  readonly statue: THREE.Material;
}

/** Summary: What the set pieces need from the mine builder. */
export interface ISetPieceContext {
  readonly group: THREE.Group;
  readonly materials: ISetPieceMaterials;
  readonly own: <T extends THREE.BufferGeometry>(g: T) => T;
  /** Summary: Registers materials a set piece creates itself, for disposal with the world. */
  readonly ownMaterial: (...materials: THREE.Material[]) => void;
  /** Summary: Adds a torch flame with a hidden candidate light for the mine light pool. */
  readonly addTorch: (x: number, y: number, z: number, color?: number, intensity?: number) => void;
  /** Summary: Adds only a hidden candidate light (for glows that have their own mesh). */
  readonly addLight: (x: number, y: number, z: number, color: number, intensity: number) => void;
}

/** Summary: Per-frame animation of the upper level machinery. */
export type ISetPieceUpdate = (elapsedTime: number) => void;
// #endregion

// #region Constants
const U = MINE_LEVEL_Y.upperCavern;
const E = MINE_LEVEL_Y.entrance;
const RAIL_GAUGE_HALF = 0.75;
const SLEEPER_SPACING = 0.8;

function fixture(id: string): (typeof MINE_SOLID_FIXTURES)[number] {
  const f = MINE_SOLID_FIXTURES.find((x) => x.id === id);
  if (f === undefined) throw new Error(`MINE_FIXTURE_MISSING: ${id}`);
  return f;
}
// #endregion

// ======================== PUBLIC BUILD ======================== \\
// #region Build Upper Level
/**
 * Summary: Builds every upper-level set piece into the mine group.
 * @param ctx Group, shared materials, geometry ownership and torch helper.
 * @returns The animation update for the moving parts.
 */
export function buildUpperLevelSetPieces(ctx: ISetPieceContext): ISetPieceUpdate {
  const kit = new Kit(ctx);
  buildPortal(kit, ctx);
  const centralFunnel = buildRailHub(kit, ctx);
  const updateCarts = buildRideableCarts(kit, ctx);
  const crane = buildCrane(kit);
  buildCentralHubScaffoldingAndGoldChute(kit, ctx);
  buildDwarvenTavernPub(kit, ctx);
  buildUndergroundDwarvenQuarters(kit, ctx);
  const water = buildWaterworks(kit, ctx);
  const gallery = buildGalleries(kit, ctx);
  const foundry = buildFoundry(kit, ctx);

  return (t: number): void => {
    updateCarts(t);
    centralFunnel.distributor.rotation.y = t * 0.45;
    centralFunnel.goldCascade.position.y = U + 0.38 + Math.sin(t * 2.2) * 0.06;
    crane.cagePivot.rotation.z = Math.sin(t * 0.9) * 0.05;
    crane.cagePivot.rotation.x = Math.sin(t * 0.6 + 1) * 0.04;
    water.wheel.rotation.x = -t * 0.9;
    water.gear.rotation.x = t * 1.8;
    water.stamps.forEach((stamp, i) => {
      const phase = (t * 1.8 + i * 2.1) % (Math.PI * 2);
      stamp.position.y = phase < Math.PI ? Math.sin(phase) * 0.9 : 0;
    });
    water.updateLagoonLife(t);
    gallery.crusherGear.rotation.x = t * 1.4;
    gallery.pistons.forEach((p, i) => {
      p.position.y = Math.abs(Math.sin(t * 2.4 + i * 1.1)) * 0.8;
    });
    gallery.bucket.position.y = Math.sin(t * 0.25) * 3.6 - 2.4;
    foundry.ladlePivot.position.x = Math.sin(t * 0.2) * 18;
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Kit
/** Summary: Small mesh helpers bound to the mine group. */
class Kit {
  constructor(private readonly _ctx: ISetPieceContext) {}

  /** Summary: Axis-aligned box whose bottom sits at `y`; returns the mesh (already added). */
  box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D): THREE.Mesh {
    const mesh = new THREE.Mesh(this._ctx.own(new THREE.BoxGeometry(w, h, d)), m);
    mesh.position.set(x, y + h / 2, z);
    (parent ?? this._ctx.group).add(mesh);
    return mesh;
  }

  /** Summary: Cylinder centred at (x, y, z), upright unless rotated by the caller. */
  cyl(rTop: number, rBottom: number, h: number, m: THREE.Material, x: number, y: number, z: number, segments = 12, parent?: THREE.Object3D): THREE.Mesh {
    const mesh = new THREE.Mesh(this._ctx.own(new THREE.CylinderGeometry(rTop, rBottom, h, segments)), m);
    mesh.position.set(x, y, z);
    (parent ?? this._ctx.group).add(mesh);
    return mesh;
  }

  /** Summary: Thin beam between two points in the mine's local frame. */
  beam(a: THREE.Vector3, b: THREE.Vector3, thickness: number, m: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(this._ctx.own(new THREE.BoxGeometry(thickness, thickness, a.distanceTo(b))), m);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    // lookAt works in world space; the group only translates, so offset the target by its position.
    mesh.lookAt(b.clone().add(this._ctx.group.position));
    this._ctx.group.add(mesh);
    return mesh;
  }

  /** Summary: Adds an object (a moving sub-assembly) to the mine group. */
  add(obj: THREE.Object3D): void {
    this._ctx.group.add(obj);
  }

  /** Summary: Hanging chain as stacked links between two heights at (x, z). */
  chain(x: number, z: number, topY: number, bottomY: number, parent?: THREE.Object3D): void {
    const count = Math.max(1, Math.round((topY - bottomY) / 0.32));
    const step = (topY - bottomY) / count;
    for (let i = 0; i < count; i++) {
      const link = new THREE.Mesh(this._ctx.own(new THREE.TorusGeometry(0.12, 0.035, 4, 8)), this._ctx.materials.iron);
      link.position.set(x, topY - (i + 0.5) * step, z);
      link.rotation.y = i % 2 ? Math.PI / 2 : 0;
      (parent ?? this._ctx.group).add(link);
    }
  }

  get m(): ISetPieceMaterials {
    return this._ctx.materials;
  }
}
// #endregion

// #region Portal
/** Summary: Carved pillars, rune lintel reaching the ceiling, kingdom crest, and the two gate leaves folded open. */
function buildPortal(kit: Kit, ctx: ISetPieceContext): void {
  const { m } = kit;
  for (const id of ['portal-pillar-west', 'portal-pillar-east']) {
    const f = fixture(id);
    kit.box(f.halfX * 2 + 0.6, 0.7, f.halfZ * 2 + 0.6, m.darkStone, f.lx, E, f.lz);
    kit.box(f.halfX * 2, f.height - 1.5, f.halfZ * 2, m.stone, f.lx, E + 0.7, f.lz);
    kit.box(f.halfX * 2 + 0.6, 0.8, f.halfZ * 2 + 0.6, m.darkStone, f.lx, E + f.height - 0.8, f.lz);
    // Vertical rune channels on the pillar faces.
    for (const dx of [-0.8, 0, 0.8]) kit.box(0.14, f.height - 3, 0.06, m.gold, f.lx + dx, E + 1.5, f.lz - f.halfZ - 0.03);
    ctx.addTorch(f.lx, E + 4.2, f.lz - f.halfZ - 0.5);
  }
  // Header over the gate mouth, reaching all the way up to the rock ceiling (`y = 11.5`).
  const headerBottom = 7.0;
  const headerTop = 11.6;
  kit.box(20.8, headerTop - headerBottom, 2.4, m.stone, 0, headerBottom, -1.2);
  for (const y of [headerBottom + 0.5, headerTop - 0.6]) kit.box(19.8, 0.16, 0.08, m.gold, 0, y, -2.42);
  for (let i = 0; i < 9; i++) kit.box(0.5, 0.9, 0.08, m.gold, -8 + i * 2, headerBottom + 1.2, -2.42);
  const crest = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(1.1, 0)), m.gold);
  crest.scale.set(1.3, 1.1, 0.35);
  crest.position.set(0, headerBottom + 2.0, -2.52);
  ctx.group.add(crest);

  // Inner portal arch header at lz = 6.0 reaching ceilingY = 11.5 so there is no gap above the entrance passage.
  kit.box(16.6, 4.5, 1.4, m.darkStone, 0, 7.1, 6.0);
  kit.box(16.8, 0.24, 1.5, m.gold, 0, 7.0, 6.0);

  // Gate leaves: heavy iron doors with vertical bars and gold bosses, opened flat against the face.
  for (const id of ['gate-leaf-west', 'gate-leaf-east']) {
    const f = fixture(id);
    kit.box(f.halfX * 2, f.height, f.halfZ * 2, m.iron, f.lx, E, f.lz);
    for (let i = 0; i < 6; i++) kit.box(0.12, f.height - 0.3, 0.12, m.darkStone, f.lx - f.halfX + 0.6 + i * 1.2, E + 0.15, f.lz - 0.25);
    for (const y of [1.2, 3.1, 5.0]) kit.box(f.halfX * 2, 0.25, 0.1, m.gold, f.lx, E + y, f.lz - 0.26);
  }
  // Torches just inside the mouth light the steps down.
  ctx.addTorch(-6.6, MINE_LEVEL_Y.overlook + 3, 10);
  ctx.addTorch(6.6, MINE_LEVEL_Y.overlook + 3, 10);
}
// #endregion

// #region Rail Hub — Grand Central Gold Funnel Pit, Curved Tracks, Switch Frogs & Station Kiosks
/**
 * Summary: Subdivides a multi-segment track polyline with smooth quadratic Bezier corner fillets
 *          so rails curve seamlessly through turns without gaps between straight segments.
 */
function subdividePolylineWithCurves(
  line: readonly (readonly [number, number])[],
  cornerRadius = 3.2,
  arcSteps = 5
): [number, number][] {
  if (line.length <= 2) return line.map(([x, z]) => [x, z]);
  const out: [number, number][] = [[line[0][0], line[0][1]]];
  for (let i = 1; i < line.length - 1; i++) {
    const prev = line[i - 1];
    const curr = line[i];
    const next = line[i + 1];
    const yPrev = trackFloorY(prev[0], prev[1]);
    const yCurr = trackFloorY(curr[0], curr[1]);
    const yNext = trackFloorY(next[0], next[1]);
    // Keep grade transitions crisp where the cart ramp starts/ends.
    if (Math.abs(yPrev - yCurr) > 0.05 || Math.abs(yNext - yCurr) > 0.05) {
      out.push([curr[0], curr[1]]);
      continue;
    }
    const v1x = prev[0] - curr[0];
    const v1z = prev[1] - curr[1];
    const len1 = Math.hypot(v1x, v1z);
    const v2x = next[0] - curr[0];
    const v2z = next[1] - curr[1];
    const len2 = Math.hypot(v2x, v2z);
    if (len1 < 0.5 || len2 < 0.5) {
      out.push([curr[0], curr[1]]);
      continue;
    }
    const trim = Math.min(cornerRadius, len1 * 0.42, len2 * 0.42);
    const pStart: [number, number] = [curr[0] + (v1x / len1) * trim, curr[1] + (v1z / len1) * trim];
    const pEnd: [number, number] = [curr[0] + (v2x / len2) * trim, curr[1] + (v2z / len2) * trim];
    for (let s = 0; s <= arcSteps; s++) {
      const t = s / arcSteps;
      const omt = 1 - t;
      const bx = omt * omt * pStart[0] + 2 * omt * t * curr[0] + t * t * pEnd[0];
      const bz = omt * omt * pStart[1] + 2 * omt * t * curr[1] + t * t * pEnd[1];
      out.push([bx, bz]);
    }
  }
  const last = line[line.length - 1];
  out.push([last[0], last[1]]);
  return out;
}

/**
 * Summary: Builds a railway switch turnout assembly (tapered switch point blades, V-frog casting,
 *          guard check-rails, unified graduated switch ties, and a weighted throw stand beside the track)
 *          where a branch line splits off from a parent track without overlapping sleepers or extra rails.
 */
function buildRailTurnoutFrog(
  kit: Kit,
  junction: readonly [number, number],
  parentBefore: readonly [number, number],
  mainAfter: readonly [number, number],
  branchAfter: readonly [number, number]
): void {
  const { m } = kit;
  const [jx, jz] = junction;
  const y = trackFloorY(jx, jz);

  const dxMain = mainAfter[0] - parentBefore[0];
  const dzMain = mainAfter[1] - parentBefore[1];
  const mainYaw = Math.atan2(dxMain, dzMain);

  const dxBranch = branchAfter[0] - jx;
  const dzBranch = branchAfter[1] - jz;
  const branchYaw = Math.atan2(dxBranch, dzBranch);
  const angleDiff = Math.atan2(Math.sin(branchYaw - mainYaw), Math.cos(branchYaw - mainYaw));
  const branchSide = angleDiff >= 0 ? 1 : -1;
  const midYaw = mainYaw + angleDiff * 0.45;

  const turnoutGroup = new THREE.Group();
  turnoutGroup.position.set(jx, y + 0.02, jz);
  turnoutGroup.rotation.y = midYaw;
  kit.add(turnoutGroup);

  // 1) Unified graduated long timber switch ties spanning cleanly under both diverging tracks
  //    (regular short sleepers are suppressed inside the 3.4m turnout radius so ties never overlap!)
  for (let i = -4; i <= 4; i++) {
    const zLocal = i * 0.72;
    const progress = Math.max(0, (i + 3) / 7);
    const tieWidth = 2.05 + progress * 1.45;
    const xShift = branchSide * progress * 0.52;
    kit.box(tieWidth, 0.082, 0.25, m.wood, xShift, 0, zLocal, turnoutGroup);
    // Iron slide plates under the stock & switch rails
    kit.box(tieWidth - 0.32, 0.016, 0.16, m.iron, xShift, 0.082, zLocal, turnoutGroup);
  }

  // 2) Tapered steel switch point blades (inside the gauge from the toe of the switch to the frog)
  for (const side of [-1, 1] as const) {
    const blade = kit.box(0.075, 0.115, 2.55, m.iron, side * (RAIL_GAUGE_HALF - 0.14), 0.08, -1.05, turnoutGroup);
    blade.rotation.y = branchSide * 0.065 + (side === branchSide ? 0.025 : -0.02);
  }
  // Switch throw tie-bars linking the two movable point blades
  kit.box(1.25, 0.05, 0.09, m.gold, 0, 0.06, -1.95, turnoutGroup);
  kit.box(1.28, 0.05, 0.09, m.iron, 0, 0.06, -1.15, turnoutGroup);

  // 3) Crisp V-shaped steel frog casting & wing rails at the inner rail intersection (never blocking the gauge!)
  const frogX = branchSide * 0.24;
  const frogZ = 0.85;
  kit.box(0.46, 0.04, 1.35, m.darkStone, frogX, 0.06, frogZ, turnoutGroup);
  const frogPointA = kit.box(0.09, 0.125, 1.15, m.iron, frogX - 0.08, 0.08, frogZ + 0.15, turnoutGroup);
  frogPointA.rotation.y = 0.16;
  const frogPointB = kit.box(0.09, 0.125, 1.15, m.iron, frogX + 0.08, 0.08, frogZ + 0.15, turnoutGroup);
  frogPointB.rotation.y = -0.16;
  // Wing rails flaring gently beside the frog throat
  const wingL = kit.box(0.07, 0.12, 0.95, m.gold, frogX - 0.22, 0.08, frogZ - 0.2, turnoutGroup);
  wingL.rotation.y = -0.14;
  const wingR = kit.box(0.07, 0.12, 0.95, m.gold, frogX + 0.22, 0.08, frogZ - 0.2, turnoutGroup);
  wingR.rotation.y = 0.14;

  // 4) Guard / check rails inside the outer stock rails opposite the frog
  kit.box(0.065, 0.12, 1.45, m.gold, -branchSide * (RAIL_GAUGE_HALF - 0.16), 0.08, frogZ, turnoutGroup);
  kit.box(0.065, 0.12, 1.45, m.gold, branchSide * (RAIL_GAUGE_HALF + 0.42), 0.08, frogZ + 0.25, turnoutGroup);

  // 5) Classic Dwarven weighted throw switch stand beside the turnout (outside the track gauge)
  const standX = -branchSide * (RAIL_GAUGE_HALF + 0.78);
  const standZ = -1.85;
  kit.box(0.44, 0.12, 0.44, m.darkStone, standX, 0, standZ, turnoutGroup);
  kit.box(0.32, 0.18, 0.24, m.iron, standX, 0.12, standZ, turnoutGroup);
  // Connecting throw rod from switch stand to the switch blades
  kit.box(Math.abs(standX), 0.04, 0.05, m.iron, standX * 0.5, 0.065, standZ, turnoutGroup);
  const throwLever = kit.cyl(0.03, 0.03, 0.78, m.iron, standX, 0.48, standZ, 6, turnoutGroup);
  throwLever.rotation.z = branchSide * 0.32;
  kit.cyl(0.11, 0.11, 0.09, m.gold, standX - branchSide * 0.12, 0.82, standZ, 8, turnoutGroup);
}

/**
 * Summary: Builds a compact interactive Dwarven Minecart Terminal / Dispenser Kiosk beside a track station
 *          so the player clearly sees where to press [E] to summon/board a minecart.
 */
function buildMinecartStationKiosk(
  kit: Kit,
  ctx: ISetPieceContext,
  lx: number,
  lz: number,
  yaw: number
): void {
  const { m } = kit;
  const floorY = trackFloorY(lx, lz);
  const kiosk = new THREE.Group();
  kiosk.position.set(lx, floorY, lz);
  kiosk.rotation.y = yaw;
  kit.add(kiosk);

  // Compact stone & brass plinth + iron dispenser post + gear wheel + control lever + warm lantern
  kit.box(0.95, 0.24, 0.95, m.darkStone, 0, 0, 0, kiosk);
  kit.box(0.82, 0.08, 0.82, m.gold, 0, 0.24, 0, kiosk);
  kit.box(0.28, 1.65, 0.28, m.iron, 0, 0.32, 0, kiosk);
  kit.box(0.65, 0.42, 0.14, m.wood, 0, 1.42, 0.16, kiosk);
  kit.box(0.58, 0.34, 0.04, m.gold, 0, 1.46, 0.23, kiosk);
  const handWheel = kit.cyl(0.32, 0.32, 0.08, m.gold, 0.22, 1.05, 0, 10, kiosk);
  handWheel.rotation.z = Math.PI / 2;
  const lever = kit.cyl(0.035, 0.035, 0.55, m.iron, -0.24, 0.65, 0.12, 6, kiosk);
  lever.rotation.x = 0.38;
  kit.cyl(0.08, 0.08, 0.1, m.gold, -0.24, 0.9, 0.3, 8, kiosk);
  ctx.addTorch(lx, floorY + 2.05, lz, 0xffc44d, 4.5);
}

/**
 * Summary: Builds an iron tipper bumper stop at the Central Gold Funnel rim where minecarts tilt and dump gold.
 */
function buildTipperBumperStop(kit: Kit, lx: number, lz: number, yawToCenter: number): void {
  const { m } = kit;
  const stop = new THREE.Group();
  stop.position.set(lx, U, lz);
  stop.rotation.y = yawToCenter;
  kit.add(stop);
  kit.box(1.75, 0.38, 0.34, m.iron, 0, 0.02, 0, stop);
  kit.box(1.82, 0.14, 0.4, m.gold, 0, 0.38, 0, stop);
  for (const dx of [-RAIL_GAUGE_HALF, RAIL_GAUGE_HALF]) {
    kit.box(0.22, 0.46, 0.55, m.iron, dx, 0.02, -0.15, stop);
  }
}

/**
 * Summary: Builds the Grand Central Gold Hopper / Funnel Pit at (0, 80) replacing the old turntable,
 *          along with all smoothly curved tracks, switch turnout frogs, and interactive minecart terminal kiosks.
 */
function buildRailHub(
  kit: Kit,
  ctx: ISetPieceContext
): { distributor: THREE.Group; goldCascade: THREE.Group } {
  const { m } = kit;
  const { lx, lz } = MINE_POI.turntable; // (0, 80)

  // 1) GRAND CENTRAL GOLD HOPPER / FUNNEL PIT AT (0, 80)
  // Outer carved stone-and-gold collar ring where all tracks terminate (r = 5.0..6.5)
  const collarRing = new THREE.Mesh(
    ctx.own(new THREE.CylinderGeometry(6.5, 6.7, 0.36, 24, 1, false)),
    m.darkStone
  );
  collarRing.position.set(lx, U + 0.18, lz);
  ctx.group.add(collarRing);

  const goldRimTorus = new THREE.Mesh(
    ctx.own(new THREE.TorusGeometry(5.35, 0.32, 10, 24)),
    m.gold
  );
  goldRimTorus.rotation.x = Math.PI / 2;
  goldRimTorus.position.set(lx, U + 0.38, lz);
  ctx.group.add(goldRimTorus);

  // Deep dark throat and sloping iron-and-gold funnel walls descending into the Royal Vault chute below
  kit.cyl(5.15, 2.2, 0.42, m.void, lx, U + 0.16, lz, 16);
  const ironFunnel = kit.cyl(5.1, 1.85, 1.65, m.iron, lx, U - 0.35, lz, 12);
  ironFunnel.rotation.y = Math.PI / 12;

  // 8 heavy stone & gold radial ribs inside the funnel mouth
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rib = new THREE.Group();
    rib.position.set(lx, U + 0.35, lz);
    rib.rotation.y = a;
    kit.add(rib);
    kit.box(0.36, 0.45, 1.5, m.darkStone, 0, -0.1, 5.65, rib);
    kit.box(0.28, 0.16, 1.55, m.gold, 0, 0.32, 5.65, rib);
    kit.beam(new THREE.Vector3(lx + Math.cos(a) * 5.1, U + 0.32, lz + Math.sin(a) * 5.1), new THREE.Vector3(lx + Math.cos(a) * 1.9, U - 0.6, lz + Math.sin(a) * 1.9), 0.22, m.gold);
  }

  // Gleaming mound & cascade of mined gold bullion/ore pouring into the Central Gold Funnel
  const goldCascade = new THREE.Group();
  goldCascade.position.set(lx, U + 0.38, lz);
  kit.add(goldCascade);
  const centralMound = new THREE.Mesh(ctx.own(new THREE.ConeGeometry(3.2, 1.55, 14)), m.gold);
  centralMound.position.set(0, 0.15, 0);
  goldCascade.add(centralMound);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = 1.6 + (i % 3) * 0.65;
    const nugget = new THREE.Mesh(ctx.own(new THREE.DodecahedronGeometry(0.42 + (i % 2) * 0.16, 0)), m.gold);
    nugget.position.set(Math.cos(a) * r, 0.12 + (i % 2) * 0.18, Math.sin(a) * r);
    nugget.rotation.set(i * 0.7, i * 1.1, i * 0.4);
    goldCascade.add(nugget);
  }

  // Rotating golden distributor wheel & overhead gantry above the Central Gold Funnel
  const distributor = new THREE.Group();
  distributor.position.set(lx, U + 1.25, lz);
  kit.add(distributor);
  kit.cyl(1.15, 0.85, 0.75, m.gold, 0, 0, 0, 8, distributor);
  for (let i = 0; i < 4; i++) {
    const blade = kit.box(3.4, 0.22, 0.22, m.iron, 0, 0, 0, distributor);
    blade.rotation.y = (i * Math.PI) / 4;
  }

  // Overhead gold-trimmed iron frame spanning the funnel (`lx = -5.4, +5.4, lz = 80`)
  for (const dx of [-5.4, 5.4]) {
    kit.box(0.55, 5.2, 0.55, m.iron, lx + dx, U + 0.3, lz - 2.2);
    kit.box(0.65, 0.28, 0.65, m.gold, lx + dx, U + 2.8, lz - 2.2);
  }
  kit.box(11.4, 0.48, 0.58, m.iron, lx, U + 5.3, lz - 2.2);
  kit.box(11.6, 0.18, 0.64, m.gold, lx, U + 5.78, lz - 2.2);
  // Hanging upper gold chute suspended over the center of the funnel
  kit.chain(lx, lz, U + 5.3, U + 2.6);
  kit.cyl(1.45, 0.75, 1.1, m.gold, lx, U + 2.2, lz, 8);
  ctx.addLight(lx, U + 1.6, lz, 0xffcc48, 8.5);
  ctx.addTorch(lx - 5.4, U + 3.4, lz - 1.6, 0xffc84a, 6.5);
  ctx.addTorch(lx + 5.4, U + 3.4, lz - 1.6, 0xffc84a, 6.5);

  // Tipper bumper stops at each of the 4 track mouths around the Central Gold Funnel rim
  buildTipperBumperStop(kit, -6.0, 80.0, Math.atan2(6.0, 0.0));
  buildTipperBumperStop(kit, 4.0, 74.0, Math.atan2(-4.0, 6.0));
  buildTipperBumperStop(kit, 6.0, 80.0, Math.atan2(-6.0, 0.0));
  buildTipperBumperStop(kit, 4.0, 85.0, Math.atan2(-4.0, -5.0));

  // 2) SMOOTHLY CURVED RAIL TRACKS & SWITCH TURNOUT FROGS
  for (const rawLine of UPPER_RAIL_LINES) {
    const smoothLine = subdividePolylineWithCurves(rawLine, 3.2, 5);
    for (let i = 1; i < smoothLine.length; i++) {
      buildTrackSegment(kit, smoothLine[i - 1], smoothLine[i]);
    }
  }

  // Turnout frogs at the two branch junctions so side tracks visibly merge with main lines
  buildRailTurnoutFrog(kit, [-18, 75], [-6, 80], [-32, 66], [-36, 78]);
  buildRailTurnoutFrog(kit, [70, 76], [56, 78], [70, 72], [84, 74]);

  // 3) INTERACTIVE MINECART TERMINAL / DISPENSER KIOSKS AT EVERY LINE START & END
  const stationKiosks: readonly [number, number, number][] = [
    [-6.5, 82.1, 0], // Central Funnel West Rim
    [-56.0, 28.1, Math.PI], // North-West Gold & Silver Wall
    [6.1, 73.2, -Math.PI / 4], // Central Funnel North-East Rim
    [86.0, 31.1, Math.PI], // North-East Gold & Silver Wall
    [6.5, 77.9, 0], // Central Funnel East Rim
    [72.2, 54.0, -Math.PI / 2], // Gallery Pit Bottom Station
    [117.5, 74.1, Math.PI], // East Gallery Wall Station
    [111.5, 113.9, 0], // Smelting Foundry Station
    [-55.5, 86.1, Math.PI], // West Cavern Sapphire & Tavern Station
  ];
  for (const [kx, kz, kyaw] of stationKiosks) {
    buildMinecartStationKiosk(kit, ctx, kx, kz, kyaw);
  }

  return { distributor, goldCascade };
}

/** Summary: Two rails and evenly spaced sleepers between two local points, flush on the floor. */
function buildTrackSegment(kit: Kit, a: readonly [number, number], b: readonly [number, number]): void {
  const { m } = kit;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const ya = trackFloorY(a[0], a[1]);
  const yb = trackFloorY(b[0], b[1]);
  const flat = Math.hypot(dx, dz);
  if (flat < 0.05) return;
  const length = Math.hypot(flat, yb - ya);
  const yaw = Math.atan2(dx, dz);
  const midX = (a[0] + b[0]) / 2;
  const midZ = (a[1] + b[1]) / 2;
  const seg = new THREE.Group();
  seg.position.set(midX, (ya + yb) / 2 + 0.02, midZ);
  seg.rotation.order = 'YXZ';
  seg.rotation.y = yaw;
  seg.rotation.x = -Math.atan2(yb - ya, flat);
  // Overlap rails by 0.14m at segment joints so curved corners form a continuous unbroken steel ribbon
  for (const x of [-RAIL_GAUGE_HALF, RAIL_GAUGE_HALF]) {
    kit.box(0.11, 0.12, length + 0.14, m.iron, x, 0.08, 0, seg);
  }
  const count = Math.max(1, Math.floor(length / SLEEPER_SPACING));
  const step = length / count;
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  for (let i = 0; i < count; i++) {
    const zLocal = -length / 2 + (i + 0.5) * step;
    const sx = midX + sinY * zLocal;
    const sz = midZ + cosY * zLocal;
    // Skip short 2.0m sleepers inside the two switch turnout zones where unified graduated switch ties are laid
    if (Math.hypot(sx - -18.0, sz - 75.0) < 3.15 || Math.hypot(sx - 70.0, sz - 76.0) < 3.15) {
      continue;
    }
    kit.box(2.0, 0.08, 0.24, m.wood, 0, 0, zLocal, seg);
  }
  kit.add(seg);
}
// #endregion

// #region Track Floor And Rideable Carts
/** Summary: Floor under a track point; on the stepped ramp, the nose line of the steps. */
function trackFloorY(lx: number, lz: number): number {
  return sampleAncientMineFloor(lx, lz)?.height ?? U;
}

/**
 * Summary: One passenger cart per rideable line (all 6 Upper Cavern lines), moved every frame to the line's live position.
 * @returns The per-frame update that follows the ride physics' visual progress.
 */
function buildRideableCarts(kit: Kit, ctx: ISetPieceContext): (t: number) => void {
  const geometry = ctx.own(buildPropGeometry('oreCart', MINE_PALETTE.gold));
  const rigs = ALL_RIDEABLE_MINECART_LINES.map((line) => {
    const mesh = new THREE.Mesh(geometry, ctx.materials.statue);
    mesh.name = `ancient-mine-ride-${line.id}`;
    mesh.rotation.order = 'YXZ';
    mesh.userData.isAnimated = true;
    kit.add(mesh);
    return { line, mesh };
  });
  return (): void => {
    for (const { line, mesh } of rigs) {
      const pose = evaluateRideableMinecartPose(line.id, getRideableMinecartVisualProgress(line.id).u);
      mesh.position.set(pose.x - ANCIENT_MINE_ORIGIN.x, pose.y, pose.z - ANCIENT_MINE_ORIGIN.z);
      mesh.rotation.y = pose.yaw;
      mesh.rotation.x = pose.pitch;
    }
  };
}
// #endregion

// #region Crane
/** Summary: Timber crane: braced mast, jib, gears and a chain-hung ore cage that sways. */
function buildCrane(kit: Kit): { cagePivot: THREE.Group } {
  const { m } = kit;
  const f = fixture('crane-mast');
  const top = U + f.height;
  kit.box(3.2, 0.6, 3.2, m.darkStone, f.lx, U, f.lz);
  kit.box(f.halfX * 2, f.height, f.halfZ * 2, m.wood, f.lx, U + 0.6, f.lz);
  for (const [dx, dz] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]] as const) {
    kit.beam(new THREE.Vector3(f.lx + dx, U + 0.6, f.lz + dz), new THREE.Vector3(f.lx, U + 5, f.lz), 0.3, m.wood);
  }
  // Jib out toward the Central Gold Funnel, short counter-jib with a stone counterweight.
  const jibEnd = new THREE.Vector3(f.lx, top - 0.4, f.lz + 13);
  kit.beam(new THREE.Vector3(f.lx, top - 0.4, f.lz - 3), jibEnd, 0.5, m.wood);
  kit.beam(new THREE.Vector3(f.lx, top + 2, f.lz), jibEnd, 0.18, m.iron);
  kit.box(1.6, 1.4, 1.6, m.darkStone, f.lx, top - 1.6, f.lz - 3);
  // Winch gears at the mast foot.
  for (const [r, dz] of [[1.1, 1.0], [0.6, 1.0]] as const) {
    const gear = kit.cyl(r, r, 0.25, m.iron, f.lx + (r > 1 ? 0.9 : -0.9), U + 2.2, f.lz + dz, 16);
    gear.rotation.z = Math.PI / 2;
  }
  kit.chain(f.lx, f.lz + 1.6, top - 0.5, U + 2.2);
  // Ore cage on a chain from the jib end.
  const cagePivot = new THREE.Group();
  cagePivot.position.copy(jibEnd);
  kit.add(cagePivot);
  const drop = jibEnd.y - (U + 5.2);
  kit.chain(0, 0, 0, -drop + 1.6, cagePivot);
  const cage = new THREE.Group();
  cage.position.set(0, -drop, 0);
  cagePivot.add(cage);
  kit.box(2.2, 0.15, 2.2, m.iron, 0, 0, 0, cage);
  kit.box(2.2, 0.15, 2.2, m.iron, 0, 1.6, 0, cage);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) kit.box(0.1, 1.6, 0.1, m.iron, x, 0.1, z, cage);
  kit.box(1.8, 0.7, 1.8, m.darkStone, 0, 0.15, 0, cage);
  return { cagePivot };
}
// #endregion

// #region Central Hub 2nd-Floor Toolsmith Mezzanine (Z-Fighting-Free)
/**
 * Summary: Builds the 2nd-floor timber scaffolding support structure, cross-braces and overhead
 *          toolsmith pergola on the west side of the Central Hub (lx: -38..-16, lz: 26..38, y = -4.85).
 *          All posts, ledger beams, and pergola timbers have strictly non-overlapping Y intervals and
 *          sit 1.0m inset from the stone deck edge & guard rails so there is zero Z-fighting/flickering.
 */
function buildCentralHubScaffoldingAndGoldChute(kit: Kit, ctx: ISetPieceContext): void {
  const { m } = kit;
  const S = MINE_LEVEL_Y.hubScaffolding; // -4.85
  const h = S - U; // 4.5 m

  // Inset post coordinates 1.0m inside the [lx: -38..-16, lz: 26..38] platform perimeter & guard rails
  const postXs = [-37.0, -30.5, -23.5, -17.0] as const;
  const postZs = [27.0, 32.0, 37.0] as const;

  for (const px of postXs) {
    for (const pz of postZs) {
      // Base iron shoe on cavern floor (y: U .. U + 0.24)
      kit.box(0.52, 0.24, 0.52, m.iron, px, U, pz);
      // Lower timber column strictly between iron shoe and lower ledger beams (y: U + 0.24 .. S - 0.52)
      kit.box(0.4, h - 0.76, 0.4, m.wood, px, U + 0.24, pz);
      // Upper pergola timber column strictly above the stone deck top (y: S + 0.04 .. S + 3.16)
      kit.box(0.36, 3.12, 0.36, m.wood, px, S + 0.04, pz);
      // Gold capital collar at top of pergola post (y: S + 2.98 .. S + 3.16)
      kit.box(0.44, 0.16, 0.44, m.gold, px, S + 2.96, pz);
    }
  }

  // Horizontal ledger beams under the 2nd-floor deck:
  // X-beams occupy y = S - 0.52 .. S - 0.20; Z-beams occupy y = S - 0.82 .. S - 0.52 (never overlapping!)
  for (const pz of postZs) {
    kit.box(20.6, 0.32, 0.36, m.wood, -27.0, S - 0.52, pz);
  }
  for (const px of postXs) {
    kit.box(0.36, 0.3, 10.6, m.wood, px, S - 0.82, 32.0);
    // Overhead pergola Z-rafters occupy y = S + 3.16 .. S + 3.44
    kit.box(0.32, 0.28, 10.6, m.wood, px, S + 3.16, 32.0);
  }
  // Overhead pergola X-tie beams occupy y = S + 3.44 .. S + 3.72 (strictly above Z-rafters)
  kit.box(20.6, 0.28, 0.32, m.wood, -27.0, S + 3.44, 27.0);
  kit.box(20.6, 0.28, 0.32, m.wood, -27.0, S + 3.44, 37.0);

  // Diagonal X-braces inset on the front (lz = 36.7) and east (lx = -17.3) bays
  kit.beam(new THREE.Vector3(-36.7, U + 0.4, 36.7), new THREE.Vector3(-30.8, S - 0.55, 36.7), 0.2, m.wood);
  kit.beam(new THREE.Vector3(-30.2, U + 0.4, 36.7), new THREE.Vector3(-23.8, S - 0.55, 36.7), 0.2, m.wood);
  kit.beam(new THREE.Vector3(-17.3, U + 0.4, 27.3), new THREE.Vector3(-17.3, S - 0.55, 31.7), 0.2, m.wood);
  kit.beam(new THREE.Vector3(-17.3, U + 0.4, 32.3), new THREE.Vector3(-17.3, S - 0.55, 36.7), 0.2, m.wood);

  // Support posts and diagonal stringers under the scaffolding stairs (lx: -22..-16, lz: 38..50), inset from guard rails
  for (const sx of [-21.2, -16.8]) {
    kit.box(0.34, h * 0.48, 0.34, m.wood, sx, U, 44.0);
    kit.beam(new THREE.Vector3(sx, U + 0.2, 49.6), new THREE.Vector3(sx, S - 0.35, 38.4), 0.28, m.wood);
  }
  ctx.addTorch(-22.4, U + 2.6, 49.5, 0xffa840, 6.0);
  ctx.addTorch(-15.6, U + 2.6, 49.5, 0xffa840, 6.0);
  ctx.addTorch(-27.0, S + 2.8, 27.4, 0xffb448, 6.5);
}
// #endregion

// #region Grand Dwarven Tavern / Pub ("The Molten Tankard", lx: -50..-22, lz: 98..122)
/**
 * Summary: Builds the lively Dwarven Bar / Pub in the south-west Upper Cavern (lx: -50..-22, lz: 98..122, y = U),
 *          complete with an L-shaped oak & brass bar counter, giant ale keg racks with brass spigots,
 *          bottle shelves, timber pavilion columns, and frothy golden beer tankards (`beerMug`) on the bar and tables.
 */
function buildDwarvenTavernPub(kit: Kit, ctx: ISetPieceContext): void {
  const { m } = kit;
  const beerMugGeo = ctx.own(buildPropGeometry('beerMug', MINE_PALETTE.gold));

  const placeBeerMug = (x: number, y: number, z: number, yaw: number): void => {
    const mug = new THREE.Mesh(beerMugGeo, m.statue);
    mug.position.set(x, y, z);
    mug.rotation.y = yaw;
    kit.add(mug);
  };

  // 1) TAVERN TIMBER & GOLD PAVILION FRAME (lx: -49..-22, lz: 98..122)
  const colXs = [-48.5, -36.0, -23.5] as const;
  const colZs = [99.0, 121.5] as const;
  for (const cx of colXs) {
    for (const cz of colZs) {
      kit.box(0.58, 0.3, 0.58, m.darkStone, cx, U, cz);
      kit.box(0.44, 4.6, 0.44, m.wood, cx, U + 0.3, cz);
      kit.box(0.52, 0.22, 0.52, m.gold, cx, U + 4.68, cz);
    }
    // Cross-beams spanning north-to-south across the tavern
    kit.box(0.36, 0.34, 23.2, m.wood, cx, U + 4.9, 110.25);
  }
  // Longitudinal beams along the front (lz = 99.0) and back (lz = 121.5) of the tavern
  kit.box(25.8, 0.36, 0.38, m.wood, -36.0, U + 5.24, 99.0);
  kit.box(25.8, 0.36, 0.38, m.wood, -36.0, U + 5.24, 121.5);

  // Carved golden tavern sign board over the north entrance ("THE MOLTEN TANKARD")
  kit.box(6.4, 1.15, 0.24, m.wood, -36.0, U + 3.95, 98.8);
  kit.box(6.6, 0.14, 0.28, m.gold, -36.0, U + 3.9, 98.8);
  kit.box(6.6, 0.14, 0.28, m.gold, -36.0, U + 5.02, 98.8);
  // Carved golden relief plaque in the center of the overhead sign board
  kit.box(1.1, 0.68, 0.08, m.gold, -36.0, U + 4.18, 98.66);

  // 2) L-SHAPED OAK, STONE & BRASS BAR COUNTER (lx: -46.5..-33.5, lz: 118.6)
  // Front bar base & carved oak panels
  kit.box(13.0, 0.22, 1.35, m.darkStone, -40.0, U, 118.6);
  kit.box(12.8, 0.86, 1.18, m.wood, -40.0, U + 0.22, 118.6);
  // Polished golden-oak bar top & brass footrail
  kit.box(13.3, 0.12, 1.48, m.gold, -40.0, U + 1.08, 118.6);
  const footRail = kit.cyl(0.04, 0.04, 12.8, m.gold, -40.0, U + 0.22, 117.82, 8);
  footRail.rotation.z = Math.PI / 2;

  // West side bar return (lx = -46.1, lz = 114.2..118.6)
  kit.box(1.3, 0.22, 4.4, m.darkStone, -46.1, U, 116.4);
  kit.box(1.15, 0.86, 4.2, m.wood, -46.1, U + 0.22, 116.4);
  kit.box(1.42, 0.12, 4.5, m.gold, -46.1, U + 1.08, 116.4);

  // 2b) 6 DWARVEN BAR STOOLS IN FRONT OF THE BAR COUNTER (for dwarves to sit facing the bar)
  const buildBarStool = (sx: number, sz: number, faceYaw: number): void => {
    const stool = new THREE.Group();
    stool.position.set(sx, U, sz);
    stool.rotation.y = faceYaw;
    kit.add(stool);
    // Heavy iron base ring + turned oak pedestal + brass footrest ring + thick oak seat + low curved backrest
    kit.cyl(0.32, 0.36, 0.07, m.iron, 0, 0.035, 0, 12, stool);
    kit.cyl(0.11, 0.14, 0.48, m.wood, 0, 0.31, 0, 10, stool);
    kit.cyl(0.26, 0.26, 0.035, m.gold, 0, 0.24, 0, 12, stool);
    kit.cyl(0.34, 0.32, 0.09, m.wood, 0, 0.58, 0, 14, stool);
    kit.cyl(0.35, 0.35, 0.025, m.gold, 0, 0.56, 0, 14, stool);
    // Low backrest on the side away from the bar counter (`+Z` in local stool frame when facing `-Z`)
    kit.box(0.06, 0.26, 0.06, m.iron, -0.16, 0.62, 0.26, stool);
    kit.box(0.06, 0.26, 0.06, m.iron, 0.16, 0.62, 0.26, stool);
    kit.box(0.46, 0.14, 0.07, m.wood, 0, 0.78, 0.27, stool);
  };
  for (const sx of [-44.2, -42.1, -40.0, -37.9, -35.8]) {
    buildBarStool(sx, 117.05, Math.PI);
  }
  buildBarStool(-44.65, 115.6, Math.PI / 2);

  // 3) GIANT TIERED ALE KEG RACK & BRASS TAPS BEHIND THE BAR (lx: -44.5..-35.0, lz: 121.1)
  kit.box(10.5, 0.45, 1.5, m.darkStone, -39.8, U, 121.1);
  kit.box(10.2, 1.4, 1.2, m.wood, -39.8, U + 0.45, 121.1);
  for (const kx of [-43.6, -41.7, -39.8, -37.9, -36.0]) {
    // Horizontal giant oak keg with iron & gold hoops and a brass tap spigot
    const keg = kit.cyl(0.68, 0.68, 1.38, m.wood, kx, U + 1.32, 121.0, 12);
    keg.rotation.x = Math.PI / 2;
    const hoopFront = kit.cyl(0.7, 0.7, 0.1, m.gold, kx, U + 1.32, 120.45, 12);
    hoopFront.rotation.x = Math.PI / 2;
    const hoopBack = kit.cyl(0.7, 0.7, 0.1, m.iron, kx, U + 1.32, 121.55, 12);
    hoopBack.rotation.x = Math.PI / 2;
    // Brass spigot tap
    const tap = kit.cyl(0.05, 0.05, 0.28, m.gold, kx, U + 1.15, 120.22, 8);
    tap.rotation.x = Math.PI / 2;
    kit.box(0.06, 0.18, 0.06, m.gold, kx, U + 1.15, 120.1);
  }
  // Upper bottle shelf behind the bar
  kit.box(10.4, 0.12, 0.55, m.wood, -39.8, U + 2.45, 121.3);
  for (let i = 0; i < 9; i++) {
    const bx = -43.8 + i * 1.0;
    kit.cyl(0.11, 0.13, 0.38, i % 2 === 0 ? m.gold : m.ember, bx, U + 2.76, 121.3, 8);
  }

  // 4) FROTHY BEER MUGS ON THE BAR COUNTER & ON ALL 4 TAVERN TABLES
  // Mugs sitting flush on the polished bar counter top (`y = U + 1.20`, bar counter is `lz = 118.6`, width `1.48m`)
  for (const [mx, mz, myaw] of [
    [-44.2, 118.12, 0.4],
    [-42.1, 118.15, -0.3],
    [-40.0, 118.1, 1.1],
    [-37.9, 118.14, -0.8],
    [-35.8, 118.12, 0.2],
    [-45.65, 115.6, 1.5],
  ] as const) {
    placeBeerMug(mx, U + 1.2, mz, myaw);
  }

  // Mugs sitting flush on the 4 real `longTable` props in `UPPER_LEVEL_PROPS`
  // (`[-41, 104]`, `[-28, 104]`, `[-41, 112]`, `[-28, 112]`; tabletop surface is at `y = U + 0.96`, clear of food platters)
  const tableCenters: readonly [number, number][] = [
    [-41.0, 104.0],
    [-28.0, 104.0],
    [-41.0, 112.0],
    [-28.0, 112.0],
  ];
  for (const [tx, tz] of tableCenters) {
    placeBeerMug(tx - 1.85, U + 0.96, tz - 0.32, 0.3);
    placeBeerMug(tx + 1.85, U + 0.96, tz + 0.32, -2.4);
    placeBeerMug(tx - 0.95, U + 0.96, tz + 0.34, 1.2);
    placeBeerMug(tx + 0.95, U + 0.96, tz - 0.34, -0.7);
  }

  // Warm tavern lighting
  ctx.addTorch(-48.0, U + 3.2, 99.5, 0xffaa38, 7.5);
  ctx.addTorch(-36.0, U + 3.5, 99.2, 0xffb844, 8.0);
  ctx.addTorch(-24.0, U + 3.2, 99.5, 0xffaa38, 7.5);
  ctx.addTorch(-40.0, U + 3.4, 120.2, 0xffb844, 8.5);
  ctx.addTorch(-24.5, U + 3.2, 118.0, 0xff9e32, 7.5);
}
// #endregion

// #region Underground Dwarven Quarters (Full-Height Doorways & 4 Sleeping Rooms)
/**
 * Summary: Builds the carved wall archway and 4 Underground Dwarven Stone Houses / Sleeping Rooms
 *          inside `dwarven-quarters-hall` (lx: -76..-42, lz: 131..158, y = U, ceilingY = -3.5) and
 *          `dwarven-quarters-entry` (lx: -63..-55, lz: 124..131, ceilingY = -4.5) where the underground
 *          mine dwarves sleep at night. All door jambs and lintels reach all the way to the ceiling.
 */
function buildUndergroundDwarvenQuarters(kit: Kit, ctx: ISetPieceContext): void {
  const { m } = kit;
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 });
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.88 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.82 });
  ctx.ownMaterial(blanketMat, mattressMat, pillowMat);

  // 1) OUTER ARCHWAY PORTAL AT SOUTH-WEST CENTRAL HUB WALL (lx = -59, lz = 124.2)
  // Entry passage is lx = -63..-55 (width 8m), ceilingY = -4.5 (height 4.85m above U = -9.35).
  // Outer hall ceiling is -1.0 (height 8.35m above U). Build jambs and full-height header up to ceiling!
  for (const dx of [-4.6, 4.6]) {
    kit.box(1.3, 8.4, 1.4, m.darkStone, -59 + dx, U, 124.3);
    kit.box(1.5, 0.35, 1.6, m.gold, -59 + dx, U + 4.5, 124.3);
  }
  // Full-height stone header from top of doorway (`U + 4.65`) all the way up to the cavern ceiling (`U + 8.45`)
  kit.box(10.6, 3.8, 1.6, m.darkStone, -59, U + 4.65, 124.3);
  kit.box(10.8, 0.26, 1.7, m.gold, -59, U + 4.55, 124.3);
  // Inner archway collar at lz = 130.8 entering the sleeping hall (`ceilingY = -3.5`, height = 5.85m above U)
  for (const dx of [-4.5, 4.5]) {
    kit.box(1.1, 5.9, 1.1, m.darkStone, -59 + dx, U, 130.8);
  }
  kit.box(10.2, 1.35, 1.2, m.darkStone, -59, U + 4.6, 130.8);
  kit.box(10.4, 0.22, 1.3, m.gold, -59, U + 4.55, 130.8);
  ctx.addTorch(-63.2, U + 3.0, 123.4, 0xffa840, 6.5);
  ctx.addTorch(-54.8, U + 3.0, 123.4, 0xffa840, 6.5);

  const addDwarvenBed = (bx: number, bz: number, yaw: number): void => {
    const bed = new THREE.Group();
    bed.position.set(bx, U, bz);
    bed.rotation.y = yaw;
    kit.add(bed);
    kit.box(1.5, 0.28, 2.2, m.wood, 0, 0.08, 0, bed);
    kit.box(1.54, 0.78, 0.14, m.wood, 0, 0.22, 1.05, bed);
    kit.box(1.36, 0.18, 2.0, mattressMat, 0, 0.36, -0.02, bed);
    kit.box(1.38, 0.08, 1.32, blanketMat, 0, 0.46, -0.34, bed);
    kit.box(0.92, 0.14, 0.4, pillowMat, 0, 0.48, 0.72, bed);
  };

  // 2) 4 UNDERGROUND DWARVEN STONE ROOMS (lz = 131..158, ceilingY = -3.5 -> height = 5.85m above U)
  // North rooms: lz = 131..144 (cz = 137.5); South rooms: lz = 144..158 (cz = 151.0)
  const roomH = 5.9; // Reaches flush with ceilingY = -3.5
  const rooms = [
    { cx: -69, cz: 137.5, side: -1, beds: [[-73.5, 134.5], [-73.5, 140.5], [-66.0, 134.5], [-66.0, 140.5]] as const },
    { cx: -49, cz: 137.5, side: 1, beds: [[-52.0, 134.5], [-52.0, 140.5], [-44.5, 134.5], [-44.5, 140.5]] as const },
    { cx: -69, cz: 151.0, side: -1, beds: [[-73.5, 148.0], [-73.5, 154.0], [-66.0, 148.0]] as const },
    { cx: -49, cz: 151.0, side: 1, beds: [[-52.0, 148.0], [-52.0, 154.0], [-44.5, 148.0]] as const },
  ] as const;

  for (const r of rooms) {
    const doorwayX = r.side === -1 ? -63.0 : -55.0;
    // Front wall facing the central corridor with a 3.6m doorway in the middle and full-height jambs + lintel reaching ceilingY
    kit.box(0.55, roomH, 4.8, m.stone, doorwayX, U, r.cz - 4.2);
    kit.box(0.55, roomH, 4.8, m.stone, doorwayX, U, r.cz + 4.2);
    // Over-door lintel from y = U + 3.7 all the way up to y = U + roomH (no hole above the door!)
    kit.box(0.65, roomH - 3.7, 3.8, m.darkStone, doorwayX, U + 3.7, r.cz);
    kit.box(0.72, 0.22, 3.9, m.gold, doorwayX, U + 3.65, r.cz);
    // Partition wall between North and South rooms (`lz = 144.0`) reaching full ceiling height
    kit.box(12.8, roomH, 0.6, m.darkStone, r.cx, U, 144.0);
    // Warm dwarven table & benches in the middle of each room
    kit.box(2.0, 0.78, 0.95, m.wood, r.cx, U, r.cz);
    kit.box(1.8, 0.44, 0.38, m.wood, r.cx, U, r.cz - 0.82);
    kit.box(1.8, 0.44, 0.38, m.wood, r.cx, U, r.cz + 0.82);
    ctx.addTorch(doorwayX - r.side * 0.6, U + 2.8, r.cz - 2.2, 0xff9d3a, 5.5);

    for (const [bx, bz] of r.beds) {
      addDwarvenBed(bx, bz, 0);
    }
  }
}
// #endregion

// #region Waterworks & Lagoon Underwater Ecosystem (Minerals, Sparkles & Swimming Fish)
/**
 * Summary: Builds the channel curbs, stone bridge, outlet conduit, water wheel, gearbox, stamp mill,
 *          plus the submerged glowing minerals, shimmering sparkles, and swimming fish inside `lagoon-basin`.
 */
function buildWaterworks(
  kit: Kit,
  ctx: ISetPieceContext
): {
  wheel: THREE.Group;
  gear: THREE.Mesh;
  stamps: THREE.Group[];
  updateLagoonLife: (t: number) => void;
} {
  const { m } = kit;
  const ch = LAGOON_CHANNEL;
  const bridge = { minLz: 106, maxLz: 110 };
  // Low curbs along the channel, open where the bridge crosses.
  for (const x of [ch.minLx - 0.25, ch.maxLx + 0.25]) {
    for (const [z0, z1] of [[ch.minLz, bridge.minLz], [bridge.maxLz, ch.maxLz]] as const) {
      kit.box(0.5, 0.35, z1 - z0, m.darkStone, x, U, (z0 + z1) / 2);
    }
  }
  // Arched stone bridge with low parapets.
  kit.box(8, 0.4, 4, m.stone, (ch.minLx + ch.maxLx) / 2, U - 0.4, 108);
  for (const z of [bridge.minLz + 0.2, bridge.maxLz - 0.2]) kit.box(8, 0.6, 0.35, m.stone, (ch.minLx + ch.maxLx) / 2, U, z);
  const arch = kit.cyl(2.0, 2.0, 3.6, m.stone, (ch.minLx + ch.maxLx) / 2, U - 0.9, 108, 16);
  arch.rotation.x = Math.PI / 2;
  arch.scale.set(1, 1, 0.35);

  // Outlet conduit where the channel leaves through the south wall toward the chasm (reaching up to ceiling).
  const mouthX = (ch.minLx + ch.maxLx) / 2;
  kit.box(6.4, 8.8, 0.9, m.darkStone, mouthX, U - 0.5, ch.maxLz - 0.2);
  kit.box(4.0, 2.2, 0.95, m.void, mouthX, U - 0.5, ch.maxLz - 0.15);
  for (const dx of [-3.6, 3.6]) {
    const pipe = kit.cyl(0.35, 0.35, 12, m.iron, mouthX + dx, U + 3.2, ch.maxLz - 6, 10);
    pipe.rotation.x = Math.PI / 2;
  }

  // Water wheel turning in the channel.
  const w = fixture('water-wheel');
  const radius = 3.2;
  const wheel = new THREE.Group();
  wheel.position.set(w.lx, MINE_LEVEL_Y.waterChannelBed + radius + 0.3, w.lz);
  kit.add(wheel);
  for (const x of [-0.6, 0.6]) {
    const rim = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(radius, 0.12, 6, 28)), m.wood);
    rim.rotation.y = Math.PI / 2;
    rim.position.x = x;
    wheel.add(rim);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const paddle = kit.box(1.5, 0.9, 0.12, m.wood, 0, -0.45, 0, wheel);
    paddle.position.set(0, Math.cos(a) * (radius - 0.3), Math.sin(a) * (radius - 0.3));
    paddle.rotation.x = -a;
    if (i % 3 === 0) {
      const spoke = kit.box(0.15, radius * 2, 0.15, m.darkStone, 0, -radius, 0, wheel);
      spoke.rotation.x = a;
    }
  }
  const hub = kit.cyl(0.5, 0.5, 1.6, m.iron, 0, 0, 0, 12, wheel);
  hub.rotation.z = Math.PI / 2;
  const axleLength = w.lx + w.halfX + 6 - (w.lx - w.halfX);
  const axle = kit.cyl(0.18, 0.18, axleLength, m.iron, w.lx + 3, wheel.position.y, w.lz, 8);
  axle.rotation.z = Math.PI / 2;
  for (const x of [ch.minLx - 0.6, ch.maxLx + 0.6]) kit.box(0.9, wheel.position.y - U + 0.4, 1.2, m.darkStone, x, U - 0.3, w.lz);

  // Gearbox and the stamp mill it drives.
  const g = fixture('wheel-gearbox');
  kit.box(g.halfX * 2, g.height - 1.2, g.halfZ * 2, m.iron, g.lx, U, g.lz);
  const gear = kit.cyl(1.25, 1.25, 0.3, m.gold, g.lx + 0.6, U + g.height - 0.6, g.lz, 16);
  gear.userData.isAnimated = true;
  gear.rotation.z = Math.PI / 2;
  const mill = fixture('stamp-mill');
  kit.box(mill.halfX * 2, 1.0, mill.halfZ * 2, m.darkStone, mill.lx, U, mill.lz);
  for (const [dx, dz] of [[-1.8, -1.4], [1.8, -1.4], [-1.8, 1.4], [1.8, 1.4]] as const) kit.box(0.3, mill.height, 0.3, m.wood, mill.lx + dx, U, mill.lz + dz);
  kit.box(mill.halfX * 2, 0.35, mill.halfZ * 2, m.wood, mill.lx, U + mill.height - 0.35, mill.lz);
  const cam = kit.cyl(0.15, 0.15, mill.halfX * 2 + 2.5, m.iron, mill.lx - 1, U + 4.2, mill.lz, 8);
  cam.rotation.z = Math.PI / 2;
  const stamps: THREE.Group[] = [];
  for (const dz of [-0.8, 0, 0.8]) {
    const stamp = new THREE.Group();
    stamp.position.set(mill.lx + 0.4, 0, mill.lz + dz);
    kit.add(stamp);
    kit.box(0.14, 3.0, 0.14, m.iron, 0, U + 1.2, 0, stamp);
    kit.box(0.5, 0.6, 0.5, m.iron, 0, U + 1.0, 0, stamp);
    stamps.push(stamp);
  }

  // ---------------------------------------------------------------------------
  // LAGOON UNDERWATER MINERALS, SHIMMERING SPARKLES & SWIMMING CAVERN FISH
  // ---------------------------------------------------------------------------
  const lagoonBedY = MINE_LEVEL_Y.lagoonBed; // -11.55
  const lagoonWaterY = MINE_LEVEL_Y.lagoonWater; // -9.65
  const aquaCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.3,
  });
  const emeraldCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.7,
    roughness: 0.22,
    metalness: 0.3,
  });
  const sparkleGoldMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const sparkleCyanMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
  ctx.ownMaterial(aquaCrystalMat, emeraldCrystalMat, sparkleGoldMat, sparkleCyanMat);

  // 14 Underwater Mineral & Crystal Clusters across the lagoon floor
  const mineralSpots: readonly [number, number, 'aqua' | 'emerald' | 'gold'][] = [
    [-101.0, 68.0, 'gold'],
    [-96.0, 62.0, 'aqua'],
    [-92.0, 75.0, 'emerald'],
    [-86.0, 54.0, 'aqua'],
    [-83.0, 68.0, 'gold'],
    [-88.0, 82.0, 'aqua'],
    [-76.0, 58.0, 'emerald'],
    [-74.0, 74.0, 'gold'],
    [-79.0, 87.0, 'aqua'],
    [-69.0, 64.0, 'emerald'],
    [-68.0, 78.0, 'gold'],
    [-94.0, 51.0, 'gold'],
    [-103.5, 73.0, 'aqua'],
    [-72.0, 49.0, 'aqua'],
  ];
  const spireGeo = ctx.own(new THREE.ConeGeometry(0.32, 1.15, 6));
  const nuggetGeo = ctx.own(new THREE.DodecahedronGeometry(0.38, 0));

  for (let i = 0; i < mineralSpots.length; i++) {
    const [mx, mz, kind] = mineralSpots[i];
    const cluster = new THREE.Group();
    cluster.position.set(mx, lagoonBedY, mz);
    cluster.rotation.y = i * 1.17;
    kit.add(cluster);

    const mat = kind === 'gold' ? m.gold : kind === 'emerald' ? emeraldCrystalMat : aquaCrystalMat;
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI * 2 + 0.3;
      const dist = s === 0 ? 0 : 0.34;
      const mesh = new THREE.Mesh(kind === 'gold' ? nuggetGeo : spireGeo, mat);
      const scale = s === 0 ? 1.15 : 0.72 + (s % 2) * 0.22;
      mesh.scale.setScalar(scale);
      mesh.position.set(Math.cos(a) * dist, kind === 'gold' ? 0.26 * scale : 0.5 * scale, Math.sin(a) * dist);
      if (kind !== 'gold') {
        mesh.rotation.z = (s === 0 ? 0.06 : 0.28) * Math.cos(a);
        mesh.rotation.x = (s === 0 ? -0.05 : 0.28) * Math.sin(a);
      }
      cluster.add(mesh);
    }
  }
  ctx.addLight(-88.0, lagoonWaterY - 0.4, 70.0, 0x38bdf8, 6.5);
  ctx.addLight(-75.0, lagoonWaterY - 0.4, 65.0, 0xfbbf24, 5.5);

  // Shimmering underwater sparkles hovering above the mineral bed
  const sparkleGeo = ctx.own(new THREE.OctahedronGeometry(0.11, 0));
  const sparkles: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const [mx, mz] = mineralSpots[i % mineralSpots.length];
    const ox = Math.cos(i * 2.3) * (0.8 + (i % 3) * 0.7);
    const oz = Math.sin(i * 2.3) * (0.8 + (i % 3) * 0.7);
    const baseY = lagoonBedY + 0.45 + (i % 4) * 0.28;
    const mesh = new THREE.Mesh(sparkleGeo, i % 2 === 0 ? sparkleGoldMat : sparkleCyanMat);
    mesh.position.set(mx + ox, baseY, mz + oz);
    mesh.userData.isAnimated = true;
    kit.add(mesh);
    sparkles.push({ mesh, baseY, phase: i * 0.85 });
  }

  // 10 Animated KoiFish instances (`createReadyKoiFish`) swimming inside the Lagoon Pool
  const fishSchool: {
    root: THREE.Group;
    koi: KoiFish;
    cx: number;
    cz: number;
    rx: number;
    rz: number;
    depthY: number;
    speed: number;
    phase: number;
    lastYaw: number;
  }[] = [];

  const fishOrbits: readonly [number, number, number, number][] = [
    [-92.0, 68.0, 7.5, 9.0],
    [-82.0, 60.0, 8.0, 7.0],
    [-78.0, 74.0, 7.0, 8.5],
    [-86.0, 78.0, 6.5, 7.5],
    [-72.0, 66.0, 5.5, 8.0],
    [-96.0, 72.0, 5.5, 6.0],
    [-84.0, 53.0, 6.0, 4.5],
    [-80.0, 84.0, 5.5, 4.5],
    [-74.0, 56.0, 5.0, 5.0],
    [-90.0, 62.0, 6.5, 6.5],
  ];

  for (let i = 0; i < fishOrbits.length; i++) {
    const [cx, cz, rx, rz] = fishOrbits[i];
    const koi = createReadyKoiFish({
      scale: 0.62 + (i % 3) * 0.09,
      initialState: 'walk',
      tintHex: i % 3 === 1 ? 0xffedd5 : i % 3 === 2 ? 0xfef08a : undefined,
      castShadow: false,
      receiveShadow: false,
    });
    ctx.own(koi.mesh.geometry);
    if (Array.isArray(koi.mesh.material)) {
      ctx.ownMaterial(...koi.mesh.material);
    } else {
      ctx.ownMaterial(koi.mesh.material);
    }
    const root = new THREE.Group();
    root.userData.isAnimated = true;
    root.add(koi.object);
    kit.add(root);

    fishSchool.push({
      root,
      koi,
      cx,
      cz,
      rx,
      rz,
      depthY: lagoonWaterY - 0.52 - (i % 3) * 0.26,
      speed: 0.42 + (i % 4) * 0.07,
      phase: i * 1.35,
      lastYaw: 0,
    });
  }

  let lastLagoonTime: number | null = null;
  const updateLagoonLife = (t: number): void => {
    const rawDt = lastLagoonTime === null ? 1 / 60 : t - lastLagoonTime;
    lastLagoonTime = t;
    const dt = Math.max(0.001, Math.min(0.1, rawDt));

    for (let i = 0; i < sparkles.length; i++) {
      const s = sparkles[i];
      const pulse = 0.65 + 0.45 * Math.sin(t * 3.2 + s.phase);
      s.mesh.position.y = s.baseY + Math.sin(t * 1.8 + s.phase) * 0.14;
      s.mesh.rotation.y = t * 1.5 + s.phase;
      s.mesh.scale.setScalar(pulse);
    }
    for (let i = 0; i < fishSchool.length; i++) {
      const f = fishSchool[i];
      const a = t * f.speed + f.phase;
      const x = f.cx + Math.cos(a) * f.rx;
      const z = f.cz + Math.sin(a) * f.rz + Math.sin(a * 2) * 1.2;
      const vx = -Math.sin(a) * f.rx * f.speed;
      const vz = (Math.cos(a) * f.rz + 2 * Math.cos(a * 2) * 1.2) * f.speed;
      const yaw = Math.atan2(vx, vz);
      const dYaw = Math.atan2(Math.sin(yaw - f.lastYaw), Math.cos(yaw - f.lastYaw));
      f.lastYaw = yaw;
      f.root.position.set(x, f.depthY + Math.sin(t * 2.1 + f.phase) * 0.08, z);
      f.root.rotation.y = yaw;
      f.koi.moveSpeed = Math.hypot(vx, vz);
      f.koi.update(dt, Math.max(-1, Math.min(1, (dYaw / dt) * 0.35)));
    }
  };

  return { wheel, gear, stamps, updateLagoonLife };
}
// #endregion

// #region Galleries
/** Summary: Stone crusher with pistons and gear, ore lift over the pit, tunnel mouths with full-height headers, wall scaffolds. */
function buildGalleries(kit: Kit, ctx: ISetPieceContext): { crusherGear: THREE.Mesh; pistons: THREE.Group[]; bucket: THREE.Group } {
  const { m } = kit;
  const c = fixture('stone-crusher');
  kit.box(c.halfX * 2, 1.2, c.halfZ * 2, m.darkStone, c.lx, U, c.lz);
  for (const dx of [-c.halfX + 0.25, c.halfX - 0.25]) kit.box(0.5, c.height, c.halfZ * 2, m.iron, c.lx + dx, U, c.lz);
  kit.box(c.halfX * 2, 0.4, c.halfZ * 2, m.iron, c.lx, U + c.height - 0.4, c.lz);
  const hopper = kit.cyl(1.8, 0.6, 1.6, m.iron, c.lx, U + c.height + 0.8, c.lz, 4);
  hopper.rotation.y = Math.PI / 4;
  kit.box(c.halfX * 2 - 1.2, 0.3, c.halfZ * 2 - 0.6, m.gold, c.lx, U + 1.2, c.lz);
  const pistons: THREE.Group[] = [];
  for (const dx of [-1.2, 0, 1.2]) {
    const piston = new THREE.Group();
    piston.position.set(c.lx + dx, 0, c.lz);
    kit.add(piston);
    kit.cyl(0.18, 0.18, 2.0, m.iron, 0, U + 2.8, 0, 8, piston);
    kit.box(0.9, 0.35, 1.6, m.iron, 0, U + 1.55, 0, piston);
    pistons.push(piston);
  }
  const crusherGear = kit.cyl(1.4, 1.4, 0.3, m.gold, c.lx + c.halfX + 0.3, U + 2.4, c.lz, 18);
  crusherGear.userData.isAnimated = true;
  crusherGear.rotation.z = Math.PI / 2;

  // Ore lift: beam between the two posts, a jib out over the pit (shifted to lx = 74.5 clear of the lx = 70 track).
  const pw = fixture('ore-lift-post-west');
  const pe = fixture('ore-lift-post-east');
  kit.box(pw.halfX * 2, pw.height, pw.halfZ * 2, m.wood, pw.lx, U, pw.lz);
  kit.box(pe.halfX * 2, pe.height, pe.halfZ * 2, m.wood, pe.lx, U, pe.lz);
  kit.box(pe.lx - pw.lx + 0.8, 0.5, 0.5, m.wood, (pw.lx + pe.lx) / 2, U + pw.height - 0.5, pw.lz);
  const liftX = 74.5;
  const liftZ = 57;
  kit.beam(new THREE.Vector3(liftX, U + pw.height - 0.25, pw.lz), new THREE.Vector3(liftX, U + pw.height - 0.25, liftZ), 0.4, m.wood);
  const pulley = kit.cyl(0.5, 0.5, 0.2, m.iron, liftX, U + pw.height - 0.8, liftZ, 14);
  pulley.rotation.z = Math.PI / 2;
  const bucket = new THREE.Group();
  bucket.position.set(liftX, 0, liftZ);
  kit.add(bucket);
  const bucketBase = MINE_LEVEL_Y.galleryPit + 4.0;
  kit.chain(0, 0, U + pw.height - 1.2, bucketBase + 1.1, bucket);
  kit.cyl(0.7, 0.55, 1.0, m.iron, 0, bucketBase + 0.5, 0, 10, bucket);
  kit.cyl(0.6, 0.6, 0.2, m.darkStone, 0, bucketBase + 0.95, 0, 10, bucket);

  // Mining tunnel mouths, framed in timber and stone reaching up to the gallery ceiling (`U + 7.4`).
  for (const [x, z, yaw] of [[121.3, 72, -Math.PI / 2], [86, 25.3, 0]] as const) {
    const mouth = new THREE.Group();
    mouth.position.set(x, U, z);
    mouth.rotation.y = yaw;
    kit.add(mouth);
    kit.box(3.2, 3.8, 0.2, m.void, 0, 0, 0, mouth);
    kit.box(0.5, 7.4, 0.5, m.wood, -1.85, 0, 0.1, mouth);
    kit.box(0.5, 7.4, 0.5, m.wood, 1.85, 0, 0.1, mouth);
    kit.box(4.3, 0.48, 0.55, m.wood, 0, 3.8, 0.1, mouth);
    // Stone over-panel above the timber lintel up to the gallery ceiling so there is no gap above the frame
    kit.box(4.2, 3.2, 0.45, m.darkStone, 0, 4.25, 0.08, mouth);
    kit.box(4.3, 0.18, 0.58, m.gold, 0, 4.22, 0.1, mouth);
    for (const dx of [-0.75, 0.75]) kit.box(0.1, 0.1, 3, m.iron, dx, 0.05, 1.4, mouth);
    ctx.addTorch(x + (yaw === 0 ? 2.4 : -0.6), U + 2.6, z + (yaw === 0 ? 0.6 : 2.4));
  }

  // Scaffolding against the east gallery wall: posts, planks and a ladder.
  for (const z of [48, 58, 68]) {
    for (const x of [114.5, 116.5]) kit.box(0.25, 7, 0.25, m.wood, x, U, z);
  }
  for (const y of [3, 6]) kit.box(2.4, 0.12, 20.5, m.wood, 115.5, U + y, 58);
  for (let i = 0; i < 12; i++) kit.box(0.9, 0.08, 0.08, m.wood, 113.9, U + 0.5 + i * 0.5, 63);
  for (const z of [62.6, 63.4]) kit.box(0.08, 6.2, 0.08, m.wood, 113.9, U, z);
  return { crusherGear, pistons, bucket };
}
// #endregion

// #region Foundry
/** Summary: Furnaces with bands, glowing mouths and chimneys; molten channels; gantry and ladle. */
function buildFoundry(kit: Kit, ctx: ISetPieceContext): { ladlePivot: THREE.Group } {
  const { m } = kit;
  const furnaces = ['furnace-west', 'furnace-middle', 'furnace-east'].map(fixture);
  for (const f of furnaces) {
    const front = f.lz - f.halfZ;
    kit.box(f.halfX * 2, f.height, f.halfZ * 2, m.darkStone, f.lx, U, f.lz);
    for (const y of [1.0, 3.6, 6.2]) kit.box(f.halfX * 2 + 0.12, 0.3, f.halfZ * 2 + 0.12, m.iron, f.lx, U + y, f.lz);
    kit.box(3.0, 2.6, 0.3, m.iron, f.lx, U + 0.6, front - 0.1);
    kit.box(2.4, 2.0, 0.32, m.molten, f.lx, U + 0.8, front - 0.12);
    kit.cyl(1.0, 1.3, 4.0, m.darkStone, f.lx, U + f.height + 2.0, f.lz + 0.6, 10);
    kit.cyl(1.15, 1.15, 0.3, m.iron, f.lx, U + f.height + 1.0, f.lz + 0.6, 10);
    // Molten metal channel from the mouth to the casting mold.
    kit.box(0.5, 0.04, front - 125.6, m.molten, f.lx, U + 0.01, (front + 125.6) / 2);
    ctx.addTorch(f.lx, U + 2.2, front - 1.5, 0xff6a1a, 7);
  }
  const pipe = kit.cyl(0.3, 0.3, furnaces[2].lx - furnaces[0].lx + 4, m.iron, (furnaces[0].lx + furnaces[2].lx) / 2, U + 5.5, 135.0, 10);
  pipe.rotation.z = Math.PI / 2;

  // Gantry crane across the furnace row with a travelling ladle.
  const gw = fixture('gantry-post-west');
  const ge = fixture('gantry-post-east');
  for (const g of [gw, ge]) kit.box(g.halfX * 2, g.height, g.halfZ * 2, m.iron, g.lx, U, g.lz);
  kit.box(ge.lx - gw.lx + 1, 0.6, 0.6, m.iron, (gw.lx + ge.lx) / 2, U + gw.height - 0.6, gw.lz);
  const ladlePivot = new THREE.Group();
  const ladleRoot = new THREE.Group();
  ladleRoot.position.set((gw.lx + ge.lx) / 2, 0, gw.lz);
  ladleRoot.add(ladlePivot);
  kit.add(ladleRoot);
  kit.box(1.0, 0.5, 1.0, m.iron, 0, U + gw.height - 1.1, 0, ladlePivot);
  kit.chain(0, 0, U + gw.height - 1.1, U + 4.4, ladlePivot);
  kit.cyl(0.8, 0.55, 1.1, m.iron, 0, U + 3.9, 0, 12, ladlePivot);
  kit.cyl(0.7, 0.7, 0.08, m.molten, 0, U + 4.45, 0, 12, ladlePivot);
  return { ladlePivot };
}
// #endregion
