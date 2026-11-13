// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: One function per set piece, all sized from the layout data (fixtures, POIs, rail
//         lines) so the custom-drawn models sit exactly on their colliders. Moving parts are
//         returned as handles and animated by one update function.
// SUMMARY: Builds the unique machinery and architecture of the upper level: the portal and
//          gates, the railway hub and tracks, the crane, the waterworks (channel, bridge, wheel,
//          stamp mill), the gallery crusher, ore lift and tunnel mouths, and the foundry
//          furnaces, molten channels and gantry. Does not place props or build rock.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { LAGOON_CHANNEL, MINE_LEVEL_Y, MINE_POI, MINE_SOLID_FIXTURES } from '../../domain/landmarks/ancientMine/ancientMineLayout';
import { UPPER_RAIL_LINES } from '../../domain/landmarks/ancientMine/ancientMineProps';
import { sampleAncientMineFloor } from '../../domain/landmarks/ancientMine/ancientMineFloor';
import { ANCIENT_MINE_ORIGIN } from '../../domain/landmarks/ancientMine/ancientMineLayout';
import {
  DWARVEN_RIDEABLE_MINECART_LINES,
  evaluateRideableMinecartPose,
  getRideableMinecartVisualProgress,
} from '../../systems/dwarvenMineAndCaravanSystem';
import { MINE_PALETTE, buildPropGeometry } from './propGeometries';
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
  const turntable = buildRailHub(kit);
  const updateCarts = buildRideableCarts(kit, ctx);
  const crane = buildCrane(kit);
  const water = buildWaterworks(kit, ctx);
  const gallery = buildGalleries(kit, ctx);
  const foundry = buildFoundry(kit, ctx);

  return (t: number): void => {
    updateCarts(t);
    turntable.rotation.y = Math.sin(t * 0.15) * 0.6;
    crane.cagePivot.rotation.z = Math.sin(t * 0.9) * 0.05;
    crane.cagePivot.rotation.x = Math.sin(t * 0.6 + 1) * 0.04;
    water.wheel.rotation.x = -t * 0.9;
    water.gear.rotation.x = t * 1.8;
    water.stamps.forEach((stamp, i) => {
      const phase = (t * 1.8 + i * 2.1) % (Math.PI * 2);
      stamp.position.y = phase < Math.PI ? Math.sin(phase) * 0.9 : 0;
    });
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
/** Summary: Carved pillars, rune lintel, kingdom crest, and the two gate leaves folded open. */
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
  // Header over the gate mouth, from the rock ceiling up to the pillar capitals.
  const headerBottom = 7.0;
  const headerTop = E + fixture('portal-pillar-west').height + 0.6;
  kit.box(20.6, headerTop - headerBottom, 2.2, m.stone, 0, headerBottom, -1.2);
  for (const y of [headerBottom + 0.5, headerTop - 0.6]) kit.box(19.8, 0.16, 0.08, m.gold, 0, y, -2.33);
  for (let i = 0; i < 9; i++) kit.box(0.5, 0.9, 0.08, m.gold, -8 + i * 2, headerBottom + 1.2, -2.33);
  const crest = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(1.1, 0)), m.gold);
  crest.scale.set(1.3, 1.1, 0.35);
  crest.position.set(0, headerBottom + 2.0, -2.45);
  ctx.group.add(crest);

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

// #region Rail Hub
/** Summary: Turntable with its own track, plus flush tracks along every rail line. */
function buildRailHub(kit: Kit): THREE.Group {
  const { m } = kit;
  const { lx, lz } = MINE_POI.turntable;
  kit.cyl(6.6, 6.8, 0.2, m.darkStone, lx, U + 0.1, lz, 32);
  const turntable = new THREE.Group();
  turntable.position.set(lx, U + 0.2, lz);
  kit.cyl(5.6, 5.6, 0.18, m.iron, 0, 0.09, 0, 32, turntable);
  for (const x of [-RAIL_GAUGE_HALF, RAIL_GAUGE_HALF]) kit.box(0.12, 0.12, 11, m.iron, x, 0.18, 0, turntable);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    kit.cyl(0.18, 0.18, 0.08, m.gold, Math.cos(a) * 4.9, 0.22, Math.sin(a) * 4.9, 8, turntable);
  }
  kit.cyl(0.6, 0.8, 0.5, m.gold, 0, 0.3, 0, 12, turntable);
  turntable.name = 'ancient-mine-turntable';
  kit.add(turntable);

  for (const line of UPPER_RAIL_LINES) {
    for (let i = 1; i < line.length; i++) buildTrackSegment(kit, line[i - 1], line[i]);
  }
  return turntable;
}

/** Summary: Two rails and evenly spaced sleepers between two local points, flush on the floor. */
function buildTrackSegment(kit: Kit, a: readonly [number, number], b: readonly [number, number]): void {
  const { m } = kit;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  // The track lies on the floor at both ends, so it slopes down the cart ramp into the pit.
  const ya = trackFloorY(a[0], a[1]);
  const yb = trackFloorY(b[0], b[1]);
  const flat = Math.hypot(dx, dz);
  const length = Math.hypot(flat, yb - ya);
  const yaw = Math.atan2(dx, dz);
  const seg = new THREE.Group();
  seg.position.set((a[0] + b[0]) / 2, (ya + yb) / 2 + 0.02, (a[1] + b[1]) / 2);
  seg.rotation.order = 'YXZ';
  seg.rotation.y = yaw;
  seg.rotation.x = -Math.atan2(yb - ya, flat);
  for (const x of [-RAIL_GAUGE_HALF, RAIL_GAUGE_HALF]) kit.box(0.1, 0.12, length, m.iron, x, 0.08, 0, seg);
  const count = Math.floor(length / SLEEPER_SPACING);
  for (let i = 0; i < count; i++) kit.box(2.0, 0.08, 0.24, m.wood, 0, 0, -length / 2 + (i + 0.5) * SLEEPER_SPACING, seg);
  kit.add(seg);
}
// #endregion

// #region Track Floor And Rideable Carts
/** Summary: Floor under a track point; on the stepped ramp, the nose line of the steps. */
function trackFloorY(lx: number, lz: number): number {
  return sampleAncientMineFloor(lx, lz)?.height ?? U;
}

/**
 * Summary: One passenger cart per rideable line, moved every frame to the line's live position.
 * @returns The per-frame update that follows the ride physics' visual progress.
 */
function buildRideableCarts(kit: Kit, ctx: ISetPieceContext): (t: number) => void {
  const geometry = ctx.own(buildPropGeometry('oreCart', MINE_PALETTE.gold));
  const rigs = DWARVEN_RIDEABLE_MINECART_LINES.map((line) => {
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
      // pose.pitch is -atan2(dy, run); with YXZ order a positive X tilt lowers the cart's front.
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
  // Jib out toward the turntable, short counter-jib with a stone counterweight.
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

// #region Waterworks
/** Summary: Channel curbs, stone bridge, outlet conduit, the water wheel, gearbox and stamp mill. */
function buildWaterworks(kit: Kit, ctx: ISetPieceContext): { wheel: THREE.Group; gear: THREE.Mesh; stamps: THREE.Group[] } {
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

  // Outlet conduit where the channel leaves through the south wall toward the chasm.
  const mouthX = (ch.minLx + ch.maxLx) / 2;
  kit.box(6.4, 3.6, 0.9, m.darkStone, mouthX, U - 0.5, ch.maxLz - 0.2);
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
  return { wheel, gear, stamps };
}
// #endregion

// #region Galleries
/** Summary: Stone crusher with pistons and gear, ore lift over the pit, tunnel mouths, wall scaffolds. */
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

  // Ore lift: beam between the two posts, a jib out over the pit, pulley and a moving bucket.
  const pw = fixture('ore-lift-post-west');
  const pe = fixture('ore-lift-post-east');
  kit.box(pw.halfX * 2, pw.height, pw.halfZ * 2, m.wood, pw.lx, U, pw.lz);
  kit.box(pe.halfX * 2, pe.height, pe.halfZ * 2, m.wood, pe.lx, U, pe.lz);
  kit.box(pe.lx - pw.lx + 0.8, 0.5, 0.5, m.wood, (pw.lx + pe.lx) / 2, U + pw.height - 0.5, pw.lz);
  const liftX = 72;
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

  // Mining tunnel mouths, framed in timber, leading deeper into the mountain.
  for (const [x, z, yaw] of [[121.3, 72, -Math.PI / 2], [86, 25.3, 0]] as const) {
    const mouth = new THREE.Group();
    mouth.position.set(x, U, z);
    mouth.rotation.y = yaw;
    kit.add(mouth);
    kit.box(3.2, 3.6, 0.2, m.void, 0, 0, 0, mouth);
    kit.box(0.4, 3.8, 0.4, m.wood, -1.8, 0, 0.1, mouth);
    kit.box(0.4, 3.8, 0.4, m.wood, 1.8, 0, 0.1, mouth);
    kit.box(4.2, 0.45, 0.45, m.wood, 0, 3.8, 0.1, mouth);
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
