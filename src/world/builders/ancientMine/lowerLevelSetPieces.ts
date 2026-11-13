// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: Each landmark is sized from the layout (surfaces, rails, statues, falls) so the
//         architecture always sits on the walkable data. Chain links of every hanging chain
//         are collected and drawn as one instanced mesh.
// SUMMARY: Builds the lower level: the Grand Descent's pier and pillars, the Great Bridge
//          (pillars on rock foundations, arches, abutments, parapet posts, chains, reliefs),
//          the hero statues and the first king with the kingdom emblem, the cliff path arcade
//          and aqueducts, and the distant depths of the chasm.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { sampleAncientMineFloor } from '../../domain/landmarks/ancientMine/ancientMineFloor';
import { HERO_STATUES, MINE_LEVEL_Y, MINE_SOLID_FIXTURES, MINE_SURFACES } from '../../domain/landmarks/ancientMine/ancientMineLayout';
import { perturbGeometryVertices } from '../shaderAndMaterialBuilders';
import { STATUE_UNIT_HEIGHT, buildDwarfStatueGeometry, type IStatuePose } from './dwarfStatueGeometry';
import type { ISetPieceContext, ISetPieceUpdate } from './upperLevelSetPieces';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
const LEDGE = MINE_LEVEL_Y.chasmLedge;
const ABYSS = MINE_LEVEL_Y.abyssBottom;
const DECK_THICKNESS = 3.0;
const DECK_UNDERSIDE = LEDGE - DECK_THICKNESS;
/** Summary: Length of one slice of the descent pier, meters. */
const PIER_SLICE = 2;

/** Summary: Great Bridge span: from the ledge (north) to the south landing, and the pillar stations between. */
const BRIDGE = { minLz: 207, maxLz: 293, halfWidth: 5, pillarLz: [224, 241, 258, 275] } as const;

/** Summary: Height of the aqueduct channels along the chasm walls. */
const NORTH_AQUEDUCT_Y = -14;
const SIDE_AQUEDUCT_Y = -24;

/** Summary: Rock spires rising from the depths: foundations of the bridge and distant scenery. */
const DEPTH_SPIRES: ReadonlyArray<{ lx: number; lz: number; r: number; topY: number }> = [
  { lx: -58, lz: 232, r: 6, topY: -78 },
  { lx: 56, lz: 226, r: 5, topY: -86 },
  { lx: -44, lz: 276, r: 5.5, topY: -92 },
  { lx: 66, lz: 264, r: 7, topY: -74 },
  { lx: -26, lz: 214, r: 3.5, topY: -98 },
  { lx: 32, lz: 286, r: 4, topY: -95 },
];
// #endregion

// ======================== PUBLIC BUILD ======================== \\
// #region Build Lower Level
/**
 * Summary: Builds every lower-level set piece into the mine group.
 * @param ctx Group, shared materials, geometry ownership and torch helper.
 * @returns The animation update (flickering distant lights).
 */
export function buildLowerLevelSetPieces(ctx: ISetPieceContext): ISetPieceUpdate {
  const links: THREE.Matrix4[] = [];
  buildDescent(ctx, links);
  buildBridge(ctx, links);
  buildStatues(ctx);
  buildHeroesPathAndAqueducts(ctx);
  buildKingNiche(ctx);
  const distantLights = buildDepths(ctx);
  addChainLinks(ctx, links);
  return (t: number): void => {
    distantLights.forEach((m, i) => {
      m.scale.setScalar(0.8 + Math.sin(t * 1.3 + i * 1.7) * 0.2);
    });
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Mesh Helpers
function addBox(ctx: ISetPieceContext, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(w, h, d)), m);
  mesh.position.set(x, y + h / 2, z);
  ctx.group.add(mesh);
  return mesh;
}

/** Summary: Rough rock column from the abyss floor up to `topY`. */
function addSpire(ctx: ISetPieceContext, lx: number, lz: number, r: number, topY: number): void {
  const height = topY - ABYSS;
  const geo = ctx.own(new THREE.CylinderGeometry(r * 0.75, r * 1.3, height, 9, 6));
  perturbGeometryVertices(geo, 0.12, 0.25);
  const mesh = new THREE.Mesh(geo, ctx.materials.darkStone);
  mesh.position.set(lx, ABYSS + height / 2, lz);
  ctx.group.add(mesh);
}

/** Summary: Queues chain links hanging in a sagging curve from a to b. */
function queueChain(links: THREE.Matrix4[], a: THREE.Vector3, b: THREE.Vector3, sag: number): void {
  const count = Math.max(2, Math.round(a.distanceTo(b) / 0.3));
  const q = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    q.setFromEuler(new THREE.Euler(0, Math.atan2(b.x - a.x, b.z - a.z) + (i % 2 ? Math.PI / 2 : 0), 0));
    links.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
  }
}

function addChainLinks(ctx: ISetPieceContext, links: readonly THREE.Matrix4[]): void {
  const geo = ctx.own(new THREE.TorusGeometry(0.12, 0.035, 4, 8));
  const mesh = new THREE.InstancedMesh(geo, ctx.materials.iron, Math.max(1, links.length));
  links.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.count = links.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = 'ancient-mine-chains';
  ctx.group.add(mesh);
}

function fixture(id: string): (typeof MINE_SOLID_FIXTURES)[number] {
  const f = MINE_SOLID_FIXTURES.find((x) => x.id === id);
  if (f === undefined) throw new Error(`MINE_FIXTURE_MISSING: ${id}`);
  return f;
}
// #endregion

// #region Grand Descent
/** Summary: Masonry pier under the open flights, carved landing pillars with chains, rune bands. */
function buildDescent(ctx: ISetPieceContext, links: THREE.Matrix4[]): void {
  const m = ctx.materials;
  // Pier: the open flights stand on a solid stone viaduct rising from the depths. It is cut in
  // slices that follow the stairs, so the treads never float above it.
  const pierBottom = ABYSS + 30;
  for (const id of ['descent-flight-b', 'descent-landing-2', 'descent-flight-c']) {
    const s = MINE_SURFACES.find((x) => x.id === id);
    if (s === undefined || s.footprint.kind !== 'rect') continue;
    const f = s.footprint;
    const width = f.maxLx - f.minLx;
    for (let z0 = f.minLz; z0 < f.maxLz; z0 += PIER_SLICE) {
      const z1 = Math.min(f.maxLz, z0 + PIER_SLICE);
      const top = (sampleAncientMineFloor((f.minLx + f.maxLx) / 2, z1 - 0.01)?.height ?? pierBottom) - DECK_THICKNESS;
      addBox(ctx, width, top - pierBottom, z1 - z0, m.darkStone, (f.minLx + f.maxLx) / 2, pierBottom, (z0 + z1) / 2);
    }
  }
  for (const lz of [152, 160, 177, 185]) {
    for (const lx of [-8.6, 8.6]) addBox(ctx, 1.2, 18, 1.2, m.stone, lx, LEDGE - 22, lz);
  }
  // Carved pillars with gold bands; chains hang between each pair across the stairs' head.
  for (const level of [1, 2]) {
    const w = fixture(`descent-pillar-${level}-west`);
    const e = fixture(`descent-pillar-${level}-east`);
    for (const p of [w, e]) {
      addBox(ctx, 2.0, 1.0, 2.0, m.darkStone, p.lx, p.baseY, p.lz);
      addBox(ctx, 1.6, p.height - 2, 1.6, m.stone, p.lx, p.baseY + 1, p.lz);
      for (let y = 3; y < p.height - 2; y += 4) addBox(ctx, 1.7, 0.25, 1.7, m.gold, p.lx, p.baseY + y, p.lz);
      addBox(ctx, 2.2, 1.0, 2.2, m.darkStone, p.lx, p.baseY + p.height - 1, p.lz);
      ctx.addTorch(p.lx + (p.lx < 0 ? 0.9 : -0.9), p.baseY + 3.2, p.lz - 0.9);
    }
    queueChain(links, new THREE.Vector3(w.lx, w.baseY + 9, w.lz), new THREE.Vector3(e.lx, e.baseY + 9, e.lz), 3.5);
  }
  // Rune band along both walls of the enclosed first flight.
  for (const lx of [-7.9, 7.9]) addBox(ctx, 0.08, 0.3, 14, m.gold, lx, MINE_LEVEL_Y.descentLanding1 + 6, 129.5);
}
// #endregion

// #region Great Bridge
/** Summary: Pillars on rock spires, arched spandrels, abutments, parapet posts, chains and reliefs. */
function buildBridge(ctx: ISetPieceContext, links: THREE.Matrix4[]): void {
  const m = ctx.materials;
  const width = BRIDGE.halfWidth * 2;
  // Pillars stand on rock spires (their visible foundations) and taper up to the deck.
  for (const lz of BRIDGE.pillarLz) {
    addSpire(ctx, 0, lz, 7.5, -102);
    const pillarHeight = DECK_UNDERSIDE - -104;
    const geo = ctx.own(new THREE.CylinderGeometry(3.4, 5.2, pillarHeight, 4));
    geo.rotateY(Math.PI / 4);
    geo.scale(1.25, 1, 0.9);
    const pillar = new THREE.Mesh(geo, m.stone);
    pillar.position.set(0, -104 + pillarHeight / 2, lz);
    ctx.group.add(pillar);
    for (const y of [-60, -80]) addBox(ctx, 9.5, 0.8, 7, m.darkStone, 0, y, lz);
  }
  // Arched spandrels between abutments and pillars.
  const stations = [BRIDGE.minLz, ...BRIDGE.pillarLz, BRIDGE.maxLz];
  for (let i = 1; i < stations.length; i++) {
    const z0 = stations[i - 1] + (i === 1 ? 0 : 2.5);
    const z1 = stations[i] - (i === stations.length - 1 ? 0 : 2.5);
    const span = z1 - z0;
    const rise = span / 2 + 1.5;
    const shape = new THREE.Shape();
    shape.moveTo(-span / 2, 0);
    shape.lineTo(-span / 2, -rise);
    shape.absarc(0, -rise, span / 2, Math.PI, 0, true);
    shape.lineTo(span / 2, 0);
    shape.lineTo(-span / 2, 0);
    const geo = ctx.own(new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false }));
    geo.translate(0, 0, -width / 2);
    geo.rotateY(Math.PI / 2);
    const arch = new THREE.Mesh(geo, m.stone);
    arch.position.set(0, DECK_UNDERSIDE + 0.01, (z0 + z1) / 2);
    ctx.group.add(arch);
  }
  // Abutments: massive masonry where the bridge meets each cliff.
  addBox(ctx, width + 4, 30, 6, m.darkStone, 0, DECK_UNDERSIDE - 30, BRIDGE.minLz + 2);
  addBox(ctx, width + 4, 30, 6, m.darkStone, 0, DECK_UNDERSIDE - 30, BRIDGE.maxLz - 2);
  // Decorated deck edges: a gold relief band and carved cornice on both outer faces.
  for (const x of [-BRIDGE.halfWidth - 0.15, BRIDGE.halfWidth + 0.15]) {
    addBox(ctx, 0.3, 0.6, BRIDGE.maxLz - BRIDGE.minLz, m.darkStone, x, LEDGE - 0.6, (BRIDGE.minLz + BRIDGE.maxLz) / 2);
    addBox(ctx, 0.32, 0.18, BRIDGE.maxLz - BRIDGE.minLz, m.gold, x, LEDGE - 1.6, (BRIDGE.minLz + BRIDGE.maxLz) / 2);
  }
  // Parapet posts every 4 m with chains swinging between them on the outside.
  for (const x of [-BRIDGE.halfWidth, BRIDGE.halfWidth]) {
    let previous: THREE.Vector3 | null = null;
    for (let lz = BRIDGE.minLz + 1; lz <= BRIDGE.maxLz - 1; lz += 4) {
      addBox(ctx, 0.7, 1.8, 0.7, m.stone, x, LEDGE, lz);
      addBox(ctx, 0.85, 0.25, 0.85, m.darkStone, x, LEDGE + 1.8, lz);
      const hook = new THREE.Vector3(x + Math.sign(x) * 0.45, LEDGE + 1.2, lz);
      if (previous !== null) queueChain(links, previous, hook, 0.6);
      previous = hook;
    }
  }
}
// #endregion

// #region Statues
/** Summary: Hero statues on plinths rising from the abyss, and the first king above the golem gate. */
function buildStatues(ctx: ISetPieceContext): void {
  const m = ctx.materials;
  const geometries = new Map<IStatuePose, THREE.BufferGeometry>();
  for (const statue of HERO_STATUES) {
    let geo = geometries.get(statue.pose);
    if (geo === undefined) {
      geo = ctx.own(buildDwarfStatueGeometry(statue.pose));
      geometries.set(statue.pose, geo);
    }
    const mesh = new THREE.Mesh(geo, m.statue);
    const scale = statue.height / STATUE_UNIT_HEIGHT;
    mesh.scale.setScalar(scale);
    mesh.position.set(statue.lx, statue.baseY, statue.lz);
    mesh.rotation.y = statue.facing === 'east' ? Math.PI / 2 : statue.facing === 'west' ? -Math.PI / 2 : Math.PI;
    ctx.group.add(mesh);
    if (statue.pose !== 'firstKing') {
      // Plinth from the depths, with a carved gold band under the feet.
      addBox(ctx, 13, statue.baseY - ABYSS, 12, m.darkStone, statue.lx, ABYSS, statue.lz);
      addBox(ctx, 13.4, 0.8, 12.4, m.gold, statue.lx, statue.baseY - 1.6, statue.lz);
    }
  }
}
// #endregion

// #region Cliff Path And Aqueducts
/**
 * Summary: Arcade along the cliff path's open edge, wall torches and reliefs, and the aqueducts:
 *          one across the north wall (fed from the lagoon outlet) and one high on each side wall
 *          behind the statues, from which the falls pour.
 */
function buildHeroesPathAndAqueducts(ctx: ISetPieceContext): void {
  const m = ctx.materials;
  // Arcade columns on the open edge, with a lintel beam; the falls pour just beyond them.
  for (const lz of [210, 223, 236, 249, 262, 275, 288, 298]) {
    const floor = sampleAncientMineFloor(-99, lz, -20)?.height ?? LEDGE;
    addBox(ctx, 1.0, -22 - floor, 1.0, m.stone, -98.2, floor, lz);
    addBox(ctx, 1.3, 0.5, 1.3, m.gold, -98.2, floor + 2.8, lz);
  }
  addBox(ctx, 1.6, 1.2, 92, m.darkStone, -98.2, -22, 253);
  // Back wall: torches and carved gold relief panels between the banners.
  for (const lz of [214, 234, 260, 287]) {
    const floor = sampleAncientMineFloor(-104, lz, -20)?.height ?? LEDGE;
    ctx.addTorch(-105.5, floor + 2.6, lz, 0xffb050, 6);
    addBox(ctx, 0.15, 2.4, 3.2, m.gold, -105.95, floor + 3.5, lz + 6);
  }
  // Side aqueducts behind the statues: stone troughs with water on top.
  for (const x of [-96.5, 96.5]) {
    addBox(ctx, 2.6, 1.2, 104, m.darkStone, x, SIDE_AQUEDUCT_Y - 1.2, 247);
    addBox(ctx, 1.8, 0.1, 104, m.water, x, SIDE_AQUEDUCT_Y - 0.05, 247);
  }
  // North aqueduct: carried across the chasm's north wall on corbels, arching over the descent.
  addBox(ctx, 196, 1.4, 2.4, m.darkStone, -1, NORTH_AQUEDUCT_Y - 1.4, 188.6);
  addBox(ctx, 196, 0.1, 1.6, m.water, -1, NORTH_AQUEDUCT_Y - 0.05, 188.6);
  for (let lx = -94; lx <= 92; lx += 12) addBox(ctx, 1.2, 3.0, 1.6, m.stone, lx, NORTH_AQUEDUCT_Y - 4.4, 189.4);
  // Spout where the lagoon water enters the chasm.
  addBox(ctx, 3.2, 3.2, 1.2, m.stone, -80, NORTH_AQUEDUCT_Y - 0.6, 189.6);
  addBox(ctx, 1.6, 1.6, 1.25, m.void, -80, NORTH_AQUEDUCT_Y + 0.2, 189.6);
}
// #endregion

// #region King Niche
/** Summary: Rock face and niche behind the king balcony, the kingdom emblem and the king's light. */
function buildKingNiche(ctx: ISetPieceContext): void {
  const m = ctx.materials;
  const base = MINE_LEVEL_Y.kingBalcony;
  const top = -4;
  // Rock face above the balcony and its east side (the greybox meshes only the lower layer here).
  addBox(ctx, 34, top - base, 6, m.darkStone, 3, base, 308);
  addBox(ctx, 2, top - base, 12, m.darkStone, 21, base, 299);
  // Niche: recessed arch around the king, plinth, and the kingdom emblem carved behind his head.
  addBox(ctx, 13, 24, 0.6, m.void, 0, base + 1.5, 304.9);
  addBox(ctx, 14.5, 1.2, 1.2, m.gold, 0, base + 25.5, 304.6);
  addBox(ctx, 11, 2.0, 5, m.darkStone, 0, base, 308.5);
  const emblem = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(3.2, 0)), m.gold);
  emblem.scale.set(1.2, 1.0, 0.2);
  emblem.position.set(0, base + 21.5, 305.2);
  ctx.group.add(emblem);
  const ring = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(4.6, 0.35, 6, 32)), m.gold);
  ring.position.set(0, base + 21.5, 305.15);
  ctx.group.add(ring);
  ctx.addLight(-7, base + 3, 303, 0xffc060, 8);
  ctx.addLight(7, base + 3, 303, 0xffc060, 8);
}
// #endregion

// #region Depths
/**
 * Summary: Rock spires, small ancient bridges between them, a ruined tower and tiny lights far
 *          below: the cavern continues beyond reach. None of it is walkable.
 * @returns The tiny light meshes, pulsed by the update.
 */
function buildDepths(ctx: ISetPieceContext): THREE.Mesh[] {
  const m = ctx.materials;
  for (const s of DEPTH_SPIRES) addSpire(ctx, s.lx, s.lz, s.r, s.topY);
  const pairs: ReadonlyArray<readonly [number, number]> = [
    [0, 2],
    [1, 3],
  ];
  const lights: THREE.Mesh[] = [];
  const lightGeo = ctx.own(new THREE.SphereGeometry(0.35, 6, 4));
  for (const [ai, bi] of pairs) {
    const a = DEPTH_SPIRES[ai];
    const b = DEPTH_SPIRES[bi];
    const y = Math.min(a.topY, b.topY) - 4;
    const length = Math.hypot(b.lx - a.lx, b.lz - a.lz);
    const deck = addBox(ctx, 3, 1.0, length, m.stone, (a.lx + b.lx) / 2, y, (a.lz + b.lz) / 2);
    deck.rotation.y = Math.atan2(b.lx - a.lx, b.lz - a.lz);
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const light = new THREE.Mesh(lightGeo, m.ember);
      light.userData.isAnimated = true;
      light.position.set(a.lx + (b.lx - a.lx) * t, y + 1.6, a.lz + (b.lz - a.lz) * t);
      ctx.group.add(light);
      lights.push(light);
    }
  }
  // Ruined watch tower on the tallest spire.
  const tower = DEPTH_SPIRES[3];
  addBox(ctx, 6, 9, 6, m.stone, tower.lx, tower.topY, tower.lz);
  addBox(ctx, 1.2, 1.6, 0.2, m.ember, tower.lx, tower.topY + 5, tower.lz - 3.05);
  addBox(ctx, 2.5, 3, 2.5, m.darkStone, tower.lx + 1.5, tower.topY + 9, tower.lz + 1.5);
  return lights;
}
// #endregion
