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
import type { DwarfWarriorState } from '../../models/Characters/DwarfWarrior_Complete';
import { createStaticStatue, type IStatuePose } from '../../models/statues/staticStatue';
import { perturbGeometryVertices } from '../shaderAndMaterialBuilders';
import type { ISetPieceContext, ISetPieceUpdate } from './upperLevelSetPieces';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
type IHeroStatue = (typeof HERO_STATUES)[number];
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
  buildGreatHallCircularStaircaseChamber(ctx, links);
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
  const pierBottom = ABYSS;
  for (const id of ['descent-flight-b', 'descent-landing-2', 'descent-flight-c']) {
    const s = MINE_SURFACES.find((x) => x.id === id);
    if (s === undefined || s.footprint.kind !== 'rect') continue;
    const f = s.footprint;
    const width = f.maxLx - f.minLx - 0.16;
    for (let z0 = f.minLz; z0 < f.maxLz; z0 += PIER_SLICE) {
      const z1 = Math.min(f.maxLz, z0 + PIER_SLICE);
      const top = (sampleAncientMineFloor((f.minLx + f.maxLx) / 2, z1 - 0.01)?.height ?? pierBottom) - DECK_THICKNESS;
      addBox(ctx, width, top - pierBottom, z1 - z0 - 0.08, m.darkStone, (f.minLx + f.maxLx) / 2, pierBottom, (z0 + z1) / 2);
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
  const spandrelDepth = width - 0.24;
  // Pillars stand on rock spires (their visible foundations) and taper up to the deck.
  for (const lz of BRIDGE.pillarLz) {
    addSpire(ctx, 0, lz, 7.5, -104.5);
    const pillarTopY = DECK_UNDERSIDE - 0.08;
    const pillarHeight = pillarTopY - -104;
    const geo = ctx.own(new THREE.CylinderGeometry(3.35, 5.2, pillarHeight, 4));
    geo.rotateY(Math.PI / 4);
    geo.scale(1.22, 1, 0.9);
    const pillar = new THREE.Mesh(geo, m.stone);
    pillar.position.set(0, -104 + pillarHeight / 2, lz);
    ctx.group.add(pillar);
    for (const y of [-60, -80]) addBox(ctx, 9.5, 0.8, 7, m.darkStone, 0, y, lz);
  }
  // Arched spandrels between abutments and pillars (inset slightly in X and Y to avoid z-fighting with deck lips).
  const stations = [BRIDGE.minLz, ...BRIDGE.pillarLz, BRIDGE.maxLz];
  for (let i = 1; i < stations.length; i++) {
    const z0 = stations[i - 1] + (i === 1 ? 0.15 : 2.5);
    const z1 = stations[i] - (i === stations.length - 1 ? 0.15 : 2.5);
    const span = z1 - z0;
    const rise = span / 2 + 1.5;
    const shape = new THREE.Shape();
    shape.moveTo(-span / 2, 0);
    shape.lineTo(-span / 2, -rise);
    shape.absarc(0, -rise, span / 2, Math.PI, 0, true);
    shape.lineTo(span / 2, 0);
    shape.lineTo(-span / 2, 0);
    const geo = ctx.own(new THREE.ExtrudeGeometry(shape, { depth: spandrelDepth, bevelEnabled: false }));
    geo.translate(0, 0, -spandrelDepth / 2);
    geo.rotateY(Math.PI / 2);
    const arch = new THREE.Mesh(geo, m.stone);
    arch.position.set(0, DECK_UNDERSIDE - 0.04, (z0 + z1) / 2);
    ctx.group.add(arch);
  }
  // Abutments: massive masonry where the bridge meets each cliff, extending all the way down to the abyss floor on the south landing.
  addBox(ctx, width + 4, DECK_UNDERSIDE - ABYSS, 6, m.darkStone, 0, ABYSS, BRIDGE.minLz + 3.1);
  addBox(ctx, 20.0, LEDGE - ABYSS - 0.04, 7.0, m.darkStone, 0, ABYSS, 296.5);
  // Decorated deck edges: a gold relief band and carved cornice on both outer faces (offset outside x = ±5).
  for (const x of [-BRIDGE.halfWidth - 0.18, BRIDGE.halfWidth + 0.18]) {
    addBox(ctx, 0.28, 0.58, BRIDGE.maxLz - BRIDGE.minLz - 0.2, m.darkStone, x, LEDGE - 0.62, (BRIDGE.minLz + BRIDGE.maxLz) / 2);
    addBox(ctx, 0.30, 0.18, BRIDGE.maxLz - BRIDGE.minLz - 0.2, m.gold, x, LEDGE - 1.6, (BRIDGE.minLz + BRIDGE.maxLz) / 2);
  }
  // Parapet posts every 4 m with chains swinging between them on the outside.
  for (const x of [-BRIDGE.halfWidth, BRIDGE.halfWidth]) {
    let previous: THREE.Vector3 | null = null;
    for (let lz = BRIDGE.minLz + 1; lz <= BRIDGE.maxLz - 1; lz += 4) {
      addBox(ctx, 0.7, 1.8, 0.7, m.stone, x, LEDGE + 0.02, lz);
      addBox(ctx, 0.85, 0.25, 0.85, m.darkStone, x, LEDGE + 1.82, lz);
      const hook = new THREE.Vector3(x + Math.sign(x) * 0.45, LEDGE + 1.2, lz);
      if (previous !== null) queueChain(links, previous, hook, 0.6);
      previous = hook;
    }
  }
}
// #endregion

// #region Statues
/**
 * Summary: Hero statues built from the articulated DwarfWarrior model on stepped plinths rising from the abyss,
 *          and the golden First King statue above the golem gate.
 * Design:
 * - Side chasm statues stand further back at lx = ±48 behind the multi-tiered lower chasm walkways.
 *   Their plinth layers are strictly non-overlapping in Y (abyss shaft -> gold collar -> dark-stone base ->
 *   gold top slab) so there is zero z-fighting / flickering.
 * - Eyes use pure molten lava spheres nestled directly inside the DwarfWarrior's orbital eye sockets
 *   (x = ±0.036, y = 0.041, z = 0.138 on headBone) with no X/plus planes.
 */
function buildStatues(ctx: ISetPieceContext): void {
  const m = ctx.materials;
  const obsidianStatueMat = new THREE.MeshStandardMaterial({
    color: 0x161820,
    roughness: 0.42,
    metalness: 0.58,
    emissive: 0x240b03,
    emissiveIntensity: 0.22,
  });
  const goldenKingMat = new THREE.MeshStandardMaterial({
    color: 0xffcf40,
    roughness: 0.18,
    metalness: 0.92,
    emissive: 0x7a4a00,
    emissiveIntensity: 0.42,
  });
  const eyeSocketMat = new THREE.MeshBasicMaterial({ color: 0xff2600, fog: false });
  const eyeMoltenMat = new THREE.MeshBasicMaterial({ color: 0xff8c00, fog: false });
  const eyeCoreMat = new THREE.MeshBasicMaterial({ color: 0xffea70, fog: false });
  const lanternCoreMat = new THREE.MeshBasicMaterial({ color: 0xff7a22, fog: false });
  ctx.ownMaterial(
    obsidianStatueMat,
    goldenKingMat,
    eyeSocketMat,
    eyeMoltenMat,
    eyeCoreMat,
    lanternCoreMat
  );

  const eyeSocketGeo = ctx.own(new THREE.SphereGeometry(1, 12, 10));
  const lanternCoreGeo = ctx.own(new THREE.OctahedronGeometry(1, 1));
  const crownRingGeo = ctx.own(new THREE.CylinderGeometry(0.115, 0.105, 0.048, 12));
  const crownSpikeGeo = ctx.own(new THREE.ConeGeometry(0.024, 0.082, 5));

  for (const statue of HERO_STATUES) {
    const isKing = statue.pose === 'firstKing';
    const plinthH = isKing ? 1.6 : 4.2;
    const capH = isKing ? 0.36 : 0.52;
    const baseBodyH = plinthH - capH;
    const effectiveHeight = isKing ? 19.5 : statue.height;
    const dwarfScale = (effectiveHeight - plinthH) / 1.45;
    const yaw = statue.facing === 'east' ? Math.PI / 2 : statue.facing === 'west' ? -Math.PI / 2 : Math.PI;
    // Keep the Golden King back at lz = 303.6 with a compact plinth so the king-balcony passage (lz = 293..302.3) is wide open.
    const statueZ = isKing ? 303.6 : statue.lz;

    const statueRoot = new THREE.Group();
    statueRoot.name = `ancient-mine-statue-${statue.id}`;
    statueRoot.position.set(statue.lx, statue.baseY, statueZ);
    statueRoot.rotation.y = yaw;
    ctx.group.add(statueRoot);

    // Non-overlapping stepped pedestal directly under the dwarf's boots (zero coplanar surfaces).
    const plinthMat = isKing ? goldenKingMat : m.darkStone;
    const plinthW = isKing ? 4.8 : 11.4;
    const plinthD = isKing ? 2.6 : 10.4;
    const plinthBase = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(plinthW, baseBodyH, plinthD)), plinthMat);
    plinthBase.position.set(0, baseBodyH / 2 + 0.02, 0);
    statueRoot.add(plinthBase);

    const trimCap = new THREE.Mesh(
      ctx.own(new THREE.BoxGeometry(plinthW + 0.5, capH, plinthD + 0.5)),
      isKing ? goldenKingMat : m.gold
    );
    trimCap.position.set(0, baseBodyH + capH / 2 + 0.02, 0);
    statueRoot.add(trimCap);

    // Instantiate our articulated DwarfWarrior model for the statue.
    const dwarf = createStaticStatue({
      kind: 'dwarf-warrior',
      castShadow: false,
      receiveShadow: true,
      pose: statuePoseFor(statue),
    });
    dwarf.group.position.set(0, plinthH + 0.03, 0);
    dwarf.group.scale.setScalar(dwarfScale);

    // Apply dark charred obsidian to the 6 chasm guardians, and gleaming gold to the First King.
    const targetMat = isKing ? goldenKingMat : obsidianStatueMat;
    dwarf.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = targetMat;
        child.frustumCulled = false;
      }
    });
    statueRoot.add(dwarf.group);

    // Attach pure molten lava eyes directly into the orbital eye sockets on the head bone (bones[4]).
    // Exact socket surface on DwarfWarrior headBone: x = ±0.036, y = 0.041, z = 0.138.
    const headBone = dwarf.skinnedMesh.skeleton.bones[4];
    if (headBone !== undefined) {
      for (const side of [-1, 1] as const) {
        const eyeGroup = new THREE.Group();
        eyeGroup.position.set(side * 0.036, 0.041, 0.138);
        headBone.add(eyeGroup);

        const outerLava = new THREE.Mesh(eyeSocketGeo, eyeSocketMat);
        outerLava.scale.set(0.016, 0.010, 0.011);
        eyeGroup.add(outerLava);

        const innerLava = new THREE.Mesh(eyeSocketGeo, eyeMoltenMat);
        innerLava.scale.set(0.012, 0.0075, 0.009);
        innerLava.position.set(0, 0, 0.003);
        eyeGroup.add(innerLava);

        const coreLava = new THREE.Mesh(eyeSocketGeo, eyeCoreMat);
        coreLava.scale.set(0.0075, 0.0048, 0.006);
        coreLava.position.set(0, 0, 0.0055);
        eyeGroup.add(coreLava);
      }

      // Royal golden crown on the First King's head.
      if (isKing) {
        const crown = new THREE.Group();
        crown.position.set(0, 0.155, 0.02);
        headBone.add(crown);
        const band = new THREE.Mesh(crownRingGeo, goldenKingMat);
        crown.add(band);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const spike = new THREE.Mesh(crownSpikeGeo, goldenKingMat);
          spike.position.set(Math.cos(a) * 0.106, 0.056, Math.sin(a) * 0.106);
          crown.add(spike);
        }
      }
    }

    if (!isKing) {
      // Deep abyss pillar rising from the chasm floor up to statue.baseY, with non-overlapping gold collar.
      const collarH = 0.85;
      const shaftH = statue.baseY - collarH - ABYSS;
      addBox(ctx, 13.0, shaftH, 12.0, m.darkStone, statue.lx, ABYSS, statue.lz);
      addBox(ctx, 13.6, collarH, 12.6, m.gold, statue.lx, statue.baseY - collarH, statue.lz);

      // Pair of corner pedestal soul-lanterns flanking the dwarf's boots (never blocking the torso).
      const pedLanternY = plinthH + 0.7;
      const pedLanternZ = plinthD * 0.44;
      for (const cornerX of [-plinthW * 0.38, plinthW * 0.38]) {
        const pedCage = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(0.85, 1.3, 0.85)), m.iron);
        pedCage.position.set(cornerX, pedLanternY, pedLanternZ);
        statueRoot.add(pedCage);

        const pedCore = new THREE.Mesh(lanternCoreGeo, lanternCoreMat);
        pedCore.scale.setScalar(0.32);
        pedCore.position.set(cornerX, pedLanternY + 0.1, pedLanternZ + 0.16);
        statueRoot.add(pedCore);
      }

      // Upward-grazing lantern light in front of the statue's chest & face.
      const inwardX = statue.facing === 'east' ? 1 : -1;
      ctx.addLight(statue.lx + inwardX * 6.5, statue.baseY + plinthH + 14.0, statue.lz, 0xff681c, 4.5);
    } else {
      // Warm golden royal aura lights illuminating the Golden King statue from the front.
      ctx.addLight(statue.lx, statue.baseY + 12.0, statueZ - 5.0, 0xffd258, 9.5);
      ctx.addLight(statue.lx, statue.baseY + 4.5, statueZ - 3.8, 0xffb830, 6.5);
    }
  }
}

function statuePoseFor(statue: IHeroStatue): IStatuePose<DwarfWarriorState> {
  if (statue.pose === 'firstKing') return { clip: 'attack2', atSeconds: 0.18 };
  if (statue.pose === 'hammerKing' || statue.pose === 'axeWarrior') return { clip: 'attack1', atSeconds: 0.32 };
  if (statue.pose === 'shieldGuardian') return { clip: 'attack3', atSeconds: 0.45 };
  return { clip: 'idle', atSeconds: 0.25 };
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
    addBox(ctx, 1.0, -22 - floor, 1.0, m.stone, -98.2, floor + 0.02, lz);
    addBox(ctx, 1.3, 0.5, 1.3, m.gold, -98.2, floor + 2.8, lz);
  }
  addBox(ctx, 1.6, 1.2, 92, m.darkStone, -98.2, -22, 253);
  // Back wall: torches and carved gold relief panels between the banners.
  for (const lz of [214, 234, 260, 287]) {
    const floor = sampleAncientMineFloor(-104, lz, -20)?.height ?? LEDGE;
    ctx.addTorch(-105.5, floor + 2.6, lz, 0xffb050, 6);
    addBox(ctx, 0.15, 2.4, 3.2, m.gold, -105.85, floor + 3.5, lz + 6);
  }
  // Side aqueducts behind the statues: stone troughs with water on top.
  for (const x of [-96.5, 96.5]) {
    addBox(ctx, 2.6, 1.2, 104, m.darkStone, x, SIDE_AQUEDUCT_Y - 1.2, 247);
    addBox(ctx, 1.8, 0.1, 104, m.water, x, SIDE_AQUEDUCT_Y + 0.02, 247);
  }
  // North aqueduct: carried across the chasm's north wall on corbels, arching over the descent.
  addBox(ctx, 196, 1.4, 2.4, m.darkStone, -1, NORTH_AQUEDUCT_Y - 1.4, 188.6);
  addBox(ctx, 196, 0.1, 1.6, m.water, -1, NORTH_AQUEDUCT_Y + 0.02, 188.6);
  for (let lx = -94; lx <= 92; lx += 12) addBox(ctx, 1.2, 3.0, 1.6, m.stone, lx, NORTH_AQUEDUCT_Y - 4.4, 189.4);
  // Spout where the lagoon water enters the chasm.
  addBox(ctx, 3.2, 3.2, 1.2, m.stone, -80, NORTH_AQUEDUCT_Y - 0.6, 189.6);
  addBox(ctx, 1.6, 1.6, 1.25, m.void, -80, NORTH_AQUEDUCT_Y + 0.2, 189.6);
  // East chasm aqueduct spout for chasm-north-fall (lx = 84, lz = 204.65, strictly north of the waterfall plane)
  addBox(ctx, 5.2, 1.2, 0.5, m.darkStone, 84, -15.2, 204.28);
  addBox(ctx, 5.5, 0.22, 0.56, m.gold, 84, -14.0, 204.28);
}
// #endregion

// #region King Niche
/**
 * Summary: Recessed royal niche and kingdom emblem behind the Golden King on the king balcony.
 * Design: Does NOT place any wall across lx = 14..20 (where king-loop-stairs descends into the
 *         Golem Chamber), keeping the side passage from heroes-path into the Golem area 100% open.
 */
function buildKingNiche(ctx: ISetPieceContext): void {
  const m = ctx.materials;
  const base = MINE_LEVEL_Y.kingBalcony;
  // Recessed niche arch centered at lx = 0, inset slightly in front of the greybox wall at lz = 305
  // so it never z-fights with the rock wall and stays strictly within lx = -6..6 (away from king-loop-stairs at lx = 14..20).
  addBox(ctx, 11.2, 22.5, 0.35, m.void, 0, base + 1.2, 304.78);
  addBox(ctx, 12.4, 1.1, 0.85, m.gold, 0, base + 23.7, 304.55);
  for (const sideX of [-5.8, 5.8]) {
    addBox(ctx, 0.85, 22.5, 0.75, m.gold, sideX, base + 1.2, 304.58);
  }
  const emblem = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(2.8, 0)), m.gold);
  emblem.scale.set(1.2, 1.0, 0.2);
  emblem.position.set(0, base + 21.0, 304.45);
  ctx.group.add(emblem);
  const ring = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(4.1, 0.32, 6, 32)), m.gold);
  ring.position.set(0, base + 21.0, 304.4);
  ctx.group.add(ring);
  ctx.addLight(-6.5, base + 4, 300.5, 0xffc860, 8);
  ctx.addLight(6.5, base + 4, 300.5, 0xffc860, 8);
}
// #endregion

// #region Depths
/**
 * Summary: Multi-tiered underground chasm passages, colonnaded galleries, stair flights, transverse
 *          bridges and ancient watchtowers built IN FRONT OF the side dwarf statues (lx = ±16..±38)
 *          descending across 4 levels (y = -50, -68, -88, -106) into the abyss.
 * @returns The tiny ember light meshes, pulsed by the update.
 */
function buildDepths(ctx: ISetPieceContext): THREE.Mesh[] {
  const m = ctx.materials;
  const lights: THREE.Mesh[] = [];
  const lightGeo = ctx.own(new THREE.SphereGeometry(0.38, 6, 5));

  const addBeacon = (x: number, y: number, z: number): void => {
    addBox(ctx, 0.55, 1.25, 0.55, m.darkStone, x, y, z);
    const light = new THREE.Mesh(lightGeo, m.ember);
    light.userData.isAnimated = true;
    light.position.set(x, y + 1.45, z);
    ctx.group.add(light);
    lights.push(light);
  };

  // Rock spires rising from the abyss floor.
  for (const s of DEPTH_SPIRES) addSpire(ctx, s.lx, s.lz, s.r, s.topY);

  // TIER 1 (y = -50) & TIER 2 (y = -68): Longitudinal chasm galleries running IN FRONT of the side statues (lx = ±33 and lx = ±21).
  const tier1Y = -50;
  const tier2Y = -68;
  const tier3Y = -88;
  const tier4Y = -106;

  for (const side of [-1, 1] as const) {
    const t1X = side * 33; // Directly in front of the statues at lx = ±48
    const t2X = side * 21; // Second lower gallery closer to the chasm center
    const t4X = side * 13; // Deepest sunken viaduct near the abyss floor

    // Tier 1 main walkway deck (lz = 208..288, y = -50) in front of the 3 side dwarf statues.
    addBox(ctx, 5.2, 1.4, 80, m.stone, t1X, tier1Y - 1.4, 248);
    // Inner and outer low stone parapets along Tier 1 walkway.
    addBox(ctx, 0.45, 0.95, 80, m.darkStone, t1X - side * 2.35, tier1Y + 0.02, 248);
    addBox(ctx, 0.45, 0.95, 80, m.darkStone, t1X + side * 2.35, tier1Y + 0.02, 248);
    addBox(ctx, 0.5, 0.18, 80, m.gold, t1X - side * 2.35, tier1Y - 0.6, 248);

    // Support columns and carved arches under Tier 1 walkway, plus side bridges toward each statue pedestal.
    for (const lz of [212, 226, 240, 253, 266, 280]) {
      addBox(ctx, 2.2, tier1Y - 1.4 - ABYSS, 2.2, m.darkStone, t1X, ABYSS, lz);
      addBeacon(t1X - side * 2.0, tier1Y + 0.97, lz);
    }
    for (const statueLz of [226, 253, 280]) {
      // Branch walkway connecting Tier 1 gallery back to the statue's abyss pillar (lx = ±35.6..±41.5).
      addBox(ctx, 6.2, 1.2, 4.4, m.stone, side * 38.6, tier1Y - 1.2, statueLz);
      addBox(ctx, 6.2, 0.85, 0.4, m.darkStone, side * 38.6, tier1Y + 0.02, statueLz - 2.0);
      addBox(ctx, 6.2, 0.85, 0.4, m.darkStone, side * 38.6, tier1Y + 0.02, statueLz + 2.0);
    }

    // Tier 2 lower gallery deck (lz = 210..286, y = -68) further forward in the chasm.
    addBox(ctx, 4.6, 1.3, 76, m.stone, t2X, tier2Y - 1.3, 248);
    addBox(ctx, 0.4, 0.9, 76, m.darkStone, t2X - side * 2.05, tier2Y + 0.02, 248);
    addBox(ctx, 0.4, 0.9, 76, m.darkStone, t2X + side * 2.05, tier2Y + 0.02, 248);
    for (const lz of [216, 234, 252, 270, 284]) {
      addBox(ctx, 1.9, tier2Y - 1.3 - ABYSS, 1.9, m.darkStone, t2X, ABYSS, lz);
      addBeacon(t2X - side * 1.75, tier2Y + 0.92, lz);
    }

    // Stepped stone stair bridges descending from Tier 1 (lx = ±33, y = -50) to Tier 2 (lx = ±21, y = -68).
    for (const stairLz of [218, 253, 278]) {
      const steps = 10;
      for (let s = 0; s < steps; s++) {
        const u = (s + 0.5) / steps;
        const sx = t1X + (t2X - t1X) * u;
        const sy = tier1Y + (tier2Y - tier1Y) * u;
        addBox(ctx, 1.35, 1.2, 3.2, m.stone, sx, sy - 1.2, stairLz);
      }
      // Diagonal stair stringer beam underneath.
      const stringer = addBox(ctx, 12.5, 0.9, 2.8, m.darkStone, (t1X + t2X) / 2, (tier1Y + tier2Y) / 2 - 1.6, stairLz);
      stringer.rotation.z = side * Math.atan2(tier1Y - tier2Y, Math.abs(t1X - t2X));
    }

    // Tier 4 deepest sunken viaduct (lz = 214..282, y = -106) near the bottom of the abyss.
    addBox(ctx, 3.8, 1.2, 68, m.darkStone, t4X, tier4Y - 1.2, 248);
    addBox(ctx, 0.35, 0.75, 68, m.stone, t4X - side * 1.65, tier4Y + 0.02, 248);
    for (const lz of [220, 248, 276]) {
      addBox(ctx, 1.8, tier4Y - 1.2 - ABYSS, 1.8, m.darkStone, t4X, ABYSS, lz);
      addBeacon(t4X - side * 1.4, tier4Y + 0.77, lz);
    }
  }

  // TIER 3 (y = -88): 3 Transverse stone bridges spanning across the deep chasm (lx = -21..21) between the Great Bridge piers.
  for (const crossLz of [216, 249.5, 282]) {
    addBox(ctx, 42, 1.3, 4.2, m.stone, 0, tier3Y - 1.3, crossLz);
    addBox(ctx, 42, 0.85, 0.4, m.darkStone, 0, tier3Y + 0.02, crossLz - 1.85);
    addBox(ctx, 42, 0.85, 0.4, m.darkStone, 0, tier3Y + 0.02, crossLz + 1.85);
    addBox(ctx, 42, 0.18, 0.44, m.gold, 0, tier3Y - 0.55, crossLz - 1.85);
    addBox(ctx, 42, 0.18, 0.44, m.gold, 0, tier3Y - 0.55, crossLz + 1.85);
    for (const px of [-12, 12]) {
      addBox(ctx, 2.2, tier3Y - 1.3 - ABYSS, 2.4, m.darkStone, px, ABYSS, crossLz);
      addBeacon(px, tier3Y + 0.87, crossLz - 1.6);
    }
  }

  // Ruined watchtower on the tallest eastern spire.
  const tower = DEPTH_SPIRES[3];
  addBox(ctx, 6, 9, 6, m.stone, tower.lx, tower.topY, tower.lz);
  addBox(ctx, 1.2, 1.6, 0.2, m.ember, tower.lx, tower.topY + 5, tower.lz - 3.05);
  addBox(ctx, 2.5, 3, 2.5, m.darkStone, tower.lx + 1.5, tower.topY + 9, tower.lz + 1.5);
  return lights;
}
// #endregion

// #region Great Hall Left-Wall Doorway & Circular Staircase Chamber
/**
 * Summary: Builds the monumental Dwarven doorway in the Left (East) wall of the Great Hall with Statues
 *          (`lx = 70, lz = 194..202, y = -39.35`), the entry corridor (`lx = 70..98`), the 360-degree
 *          Circular / Spiral Staircase Rotunda (`cx = 119, cz = 211, y = -39.35 -> -63.35`), and the
 *          Deep Moria Sanctum & Runic Well at the bottom (`lx = 102..138, lz = 244..276, y = -63.35`).
 */
function buildGreatHallCircularStaircaseChamber(
  ctx: ISetPieceContext,
  links: THREE.Matrix4[]
): void {
  const m = ctx.materials;
  const SANCTUM_Y = MINE_LEVEL_Y.spiralSanctum; // -63.35

  // 1) MONUMENTAL OPEN DOORWAY IN THE LEFT (EAST) WALL OF THE GREAT HALL WITH STATUES (lx = 70, lz = 198, y = -39.35)
  const doorX = 69.8;
  const doorZ = 198.0;
  for (const sideZ of [193.3, 202.7]) {
    addBox(ctx, 1.8, 10.6, 1.5, m.darkStone, doorX, LEDGE, sideZ);
    addBox(ctx, 2.0, 0.38, 1.7, m.gold, doorX, LEDGE + 5.8, sideZ);
    addBox(ctx, 2.0, 0.38, 1.7, m.gold, doorX, LEDGE + 2.8, sideZ);
  }
  // Carved over-door lintel & Moria royal arch crest above the 8m-wide doorway (y = LEDGE + 6.0 .. LEDGE + 10.6)
  addBox(ctx, 1.9, 4.6, 10.8, m.darkStone, doorX, LEDGE + 6.0, doorZ);
  addBox(ctx, 2.1, 0.32, 11.0, m.gold, doorX, LEDGE + 5.9, doorZ);
  addBox(ctx, 2.1, 0.28, 11.0, m.gold, doorX, LEDGE + 9.8, doorZ);
  // Raised open iron portcullis gate teeth under the lintel
  addBox(ctx, 0.24, 0.22, 7.6, m.iron, doorX - 0.35, LEDGE + 5.55, doorZ);
  for (let bz = -3.2; bz <= 3.2; bz += 0.8) {
    addBox(ctx, 0.14, 0.72, 0.14, m.iron, doorX - 0.35, LEDGE + 5.2, doorZ + bz);
  }
  // Golden diamond emblem above the doorway facing the Great Hall
  const crest = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(1.35, 0)), m.gold);
  crest.scale.set(0.32, 1.15, 1.35);
  crest.position.set(doorX - 1.02, LEDGE + 7.8, doorZ);
  ctx.group.add(crest);
  ctx.addTorch(doorX - 1.1, LEDGE + 3.4, 193.3, 0xffb844, 8.0);
  ctx.addTorch(doorX - 1.1, LEDGE + 3.4, 202.7, 0xffb844, 8.0);

  // 2) ENTRY CORRIDOR WALL PILASTERS, SIDE-MOUNTED TORCHES & SIDE CHAINS (lx = 70..106, lz = 194..202, y = -39.35)
  const corridorPilasterXs = [76.0, 85.0, 93.0, 101.0] as const;
  for (let i = 0; i < corridorPilasterXs.length; i++) {
    const cx = corridorPilasterXs[i];
    for (const cz of [194.3, 201.7] as const) {
      const inwardSign = cz < 198 ? 1 : -1;
      addBox(ctx, 0.9, 8.8, 0.55, m.darkStone, cx, LEDGE, cz);
      addBox(ctx, 1.0, 0.24, 0.65, m.gold, cx, LEDGE + 4.8, cz);
      addBox(ctx, 1.0, 0.24, 0.65, m.gold, cx, LEDGE + 2.2, cz);
      ctx.addTorch(cx, LEDGE + 3.1, cz + inwardSign * 0.42, 0xffa838, 6.5);
    }
    if (i > 0) {
      const prevX = corridorPilasterXs[i - 1];
      // Side chains hung neatly along the North and South corridor walls (completely out of the middle passage!)
      queueChain(
        links,
        new THREE.Vector3(prevX, LEDGE + 5.2, 194.62),
        new THREE.Vector3(cx, LEDGE + 5.2, 194.62),
        0.55
      );
      queueChain(
        links,
        new THREE.Vector3(prevX, LEDGE + 5.2, 201.38),
        new THREE.Vector3(cx, LEDGE + 5.2, 201.38),
        0.55
      );
    }
  }

  // 3) CIRCULAR / SPIRAL STAIRCASE ROTUNDA AROUND (cx = 118.0, cz = 212.0, y = -63.35 .. -24.0)
  //    Centered strictly inside the 16x16m inner core (lx = 110..126, lz = 204..220) so stairs are 100% clear.
  const rotundaCx = 118.0;
  const rotundaCz = 212.0;
  const coreBottomY = SANCTUM_Y - 1.0;
  const coreTopY = LEDGE + 15.0; // -24.35
  const coreHeight = coreTopY - coreBottomY;

  // Colossal Cylindrical Central Rotunda Column around which the staircase winds 360 degrees
  const centralCoreGeo = ctx.own(new THREE.CylinderGeometry(6.6, 7.0, coreHeight, 24));
  const centralCoreMesh = new THREE.Mesh(centralCoreGeo, m.darkStone);
  centralCoreMesh.position.set(rotundaCx, coreBottomY + coreHeight * 0.5, rotundaCz);
  ctx.group.add(centralCoreMesh);

  // Carved horizontal golden rings & vertical fluted ribs on the central rotunda cylinder
  const coreRingGeo = ctx.own(new THREE.TorusGeometry(6.88, 0.24, 8, 28));
  for (const ry of [-60.0, -54.0, -48.0, -42.0, -36.0, -30.0]) {
    const ring = new THREE.Mesh(coreRingGeo, m.gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(rotundaCx, ry, rotundaCz);
    ctx.group.add(ring);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(0.5, coreHeight - 2, 0.5)), m.stone);
    rib.position.set(
      rotundaCx + Math.cos(a) * 6.75,
      coreBottomY + coreHeight * 0.5,
      rotundaCz + Math.sin(a) * 6.75
    );
    rib.rotation.y = -a;
    ctx.group.add(rib);
  }

  // Outer-wall pilasters, wall-mounted torches & side-wall chains following all 4 descending flights
  // (Placed strictly along the outer perimeter walls so the middle of the staircase is 100% unobstructed!)
  const addWallStationRun = (
    stations: ReadonlyArray<readonly [number, number, number, number, number]>
  ): void => {
    for (let i = 0; i < stations.length; i++) {
      const [wx, wy, wz, nx, nz] = stations[i];
      const colH = Math.max(8.5, -24.05 - wy);
      addBox(ctx, 0.72, colH, 0.72, m.darkStone, wx, wy, wz);
      addBox(ctx, 0.84, 0.24, 0.84, m.gold, wx, wy + 2.2, wz);
      addBox(ctx, 0.84, 0.24, 0.84, m.gold, wx, wy + 4.8, wz);
      ctx.addTorch(wx + nx * 0.48, wy + 3.1, wz + nz * 0.48, 0xffaa38, 6.8);
      if (i > 0) {
        const [px, py, pz, pnx, pnz] = stations[i - 1];
        queueChain(
          links,
          new THREE.Vector3(px + pnx * 0.42, py + 4.9, pz + pnz * 0.42),
          new THREE.Vector3(wx + nx * 0.42, wy + 4.9, wz + nz * 0.42),
          0.65
        );
      }
    }
  };

  // North Wall Run (Top Landing -> Flight 1 -> Landing 1 along lz = 194.35, facing South nz = +1)
  addWallStationRun([
    [107.5, -39.35, 194.35, 0, 1],
    [116.0, -39.35, 194.35, 0, 1],
    [125.5, -45.35, 194.35, 0, 1],
    [134.5, -45.35, 194.35, 0, 1],
  ]);

  // East Wall Run (Landing 1 -> Flight 2 -> Landing 2 along lx = 135.65, facing West nx = -1)
  addWallStationRun([
    [135.65, -45.35, 196.0, -1, 0],
    [135.65, -45.35, 204.0, -1, 0],
    [135.65, -48.35, 212.0, -1, 0],
    [135.65, -51.35, 220.0, -1, 0],
    [135.65, -51.35, 226.5, -1, 0],
  ]);

  // South Wall Run (Landing 2 -> Flight 3 -> Landing 3 along lz = 227.65, facing North nz = -1)
  addWallStationRun([
    [133.0, -51.35, 227.65, 0, -1],
    [124.0, -52.1, 227.65, 0, -1],
    [114.0, -55.85, 227.65, 0, -1],
  ]);

  // West Wall Run of Flight 4 (Landing 3 -> Flight 4 -> War Room Portal along lx = 102.35, facing East nx = +1)
  addWallStationRun([
    [102.35, -57.35, 221.5, 1, 0],
    [102.35, -57.35, 228.0, 1, 0],
    [102.35, -60.35, 236.0, 1, 0],
    [102.35, -63.35, 243.2, 1, 0],
  ]);

  // East Wall Run of Flight 4 (along lx = 109.65, facing West nx = -1)
  addWallStationRun([
    [109.65, -57.35, 228.5, -1, 0],
    [109.65, -60.35, 236.0, -1, 0],
    [109.65, -63.35, 243.2, -1, 0],
  ]);

  // 4) DWARVEN WAR ROOM (חדר מלחמה) AT THE BOTTOM OF THE SPIRAL STAIRS (lx = 102..138, lz = 244..276, y = -63.35)
  const sanctumColH = 21.35; // Reaches ceilingY = -42.0
  const crimsonMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.72,
    metalness: 0.08,
  });
  const mapParchmentMat = new THREE.MeshStandardMaterial({
    color: 0xd6c49e,
    roughness: 0.65,
    metalness: 0.05,
  });
  const mapTerrainMat = new THREE.MeshStandardMaterial({
    color: 0x57534e,
    roughness: 0.78,
    metalness: 0.15,
  });
  const mapRiverMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.3,
  });
  ctx.ownMaterial(crimsonMat, mapParchmentMat, mapTerrainMat, mapRiverMat);

  // 4a) GRAND WAR ROOM ENTRY ARCHWAY AT THE FOOT OF FLIGHT 4 (lx = 102..110, lz = 244.4)
  for (const px of [102.7, 109.3] as const) {
    addBox(ctx, 1.25, 0.58, 1.25, m.darkStone, px, SANCTUM_Y + 0.02, 244.4);
    addBox(ctx, 1.32, 0.22, 1.32, m.gold, px, SANCTUM_Y + 0.6, 244.4);
    addBox(ctx, 1.12, 7.6, 1.12, m.darkStone, px, SANCTUM_Y + 0.82, 244.4);
    addBox(ctx, 1.28, 0.32, 1.28, m.gold, px, SANCTUM_Y + 4.6, 244.4);
  }
  addBox(ctx, 7.8, 0.36, 1.4, m.gold, 106.0, SANCTUM_Y + 8.42, 244.4);
  addBox(ctx, 7.6, 2.4, 1.25, m.darkStone, 106.0, SANCTUM_Y + 8.78, 244.4);
  addBox(ctx, 7.8, 0.28, 1.4, m.gold, 106.0, SANCTUM_Y + 11.18, 244.4);
  const warPortalCrest = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(0.85, 0)), m.gold);
  warPortalCrest.scale.set(1.2, 1.05, 0.32);
  warPortalCrest.position.set(106.0, SANCTUM_Y + 9.95, 245.15);
  ctx.group.add(warPortalCrest);
  ctx.addTorch(103.5, SANCTUM_Y + 3.4, 245.1, 0xffb844, 7.0);
  ctx.addTorch(108.5, SANCTUM_Y + 3.4, 245.1, 0xffb844, 7.0);

  // 4b) ROYAL CRIMSON & GOLD WAR ROOM CARPET RUNNER (strictly disjoint Y layers above SANCTUM_Y = -63.35)
  // Entry runner from the foot of the stairs (lx = 106.0, lz = 244.6..259.8)
  addBox(ctx, 4.2, 0.022, 15.2, m.gold, 106.0, SANCTUM_Y + 0.018, 252.2);
  addBox(ctx, 3.5, 0.024, 14.6, crimsonMat, 106.0, SANCTUM_Y + 0.042, 252.2);
  // Connecting runner from lx = 108.1 to the War Table west side (lx = 115.8, lz = 258.0)
  addBox(ctx, 7.7, 0.022, 4.2, m.gold, 111.95, SANCTUM_Y + 0.018, 258.0);
  addBox(ctx, 7.9, 0.024, 3.5, crimsonMat, 111.85, SANCTUM_Y + 0.043, 258.0);
  // Central Grand Axis Carpet Runner from North War Drums (lz = 247.5) through the War Table to the Commander's Dais (lz = 270.35)
  addBox(ctx, 5.6, 0.022, 22.8, m.gold, 120.0, SANCTUM_Y + 0.018, 258.9);
  addBox(ctx, 4.8, 0.024, 22.2, crimsonMat, 120.0, SANCTUM_Y + 0.042, 258.9);

  // 4c) VAULTED CEILING ARCH RIBS & PERIMETER GOLD CORNICE (ceilingY = -42.0)
  const warCeilY = -42.0;
  for (const ribZ of [250.0, 258.0, 268.0] as const) {
    addBox(ctx, 35.4, 1.1, 1.4, m.darkStone, 120.0, warCeilY - 1.15, ribZ);
    addBox(ctx, 35.4, 0.24, 1.6, m.gold, 120.0, warCeilY - 1.4, ribZ);
  }
  for (const ribX of [108.0, 132.0] as const) {
    addBox(ctx, 1.4, 0.9, 31.4, m.darkStone, ribX, warCeilY - 0.95, 260.0);
    addBox(ctx, 1.6, 0.22, 31.4, m.gold, ribX, warCeilY - 1.18, ribX === 108.0 ? 260.0 : 260.0);
  }

  // Corner War Pillars with Crimson & Gold Khazad War Banners
  for (const cx of [108.0, 132.0]) {
    for (const cz of [250.0, 268.0]) {
      addBox(ctx, 2.2, 0.85, 2.2, m.darkStone, cx, SANCTUM_Y, cz);
      addBox(ctx, 1.75, sanctumColH - 2.3, 1.75, m.stone, cx, SANCTUM_Y + 0.85, cz);
      for (const by of [3.4, 7.6, 11.8, 16.0]) {
        addBox(ctx, 1.92, 0.28, 1.92, m.gold, cx, SANCTUM_Y + by, cz);
      }
      addBox(ctx, 2.4, 0.85, 2.4, m.darkStone, cx, SANCTUM_Y + sanctumColH - 1.45, cz);

      // Hanging Crimson & Gold War Banner on inner face of each column
      const inwardSign = cx < 120 ? 1 : -1;
      const bx = cx + inwardSign * 1.02;
      addBox(ctx, 0.12, 0.14, 1.65, m.gold, bx, SANCTUM_Y + 7.1, cz);
      addBox(ctx, 0.08, 4.2, 1.42, crimsonMat, bx, SANCTUM_Y + 2.9, cz);
      addBox(ctx, 0.1, 4.2, 0.14, m.gold, bx, SANCTUM_Y + 2.9, cz - 0.65);
      addBox(ctx, 0.1, 4.2, 0.14, m.gold, bx, SANCTUM_Y + 2.9, cz + 0.65);
      // Golden diamond shield boss on banner
      const bannerEmblem = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(0.42, 0)), m.gold);
      bannerEmblem.scale.set(0.25, 1.1, 1.0);
      bannerEmblem.position.set(bx + inwardSign * 0.06, SANCTUM_Y + 5.1, cz);
      ctx.group.add(bannerEmblem);

      ctx.addTorch(cx + inwardSign * 1.25, SANCTUM_Y + 3.2, cz, 0xffb844, 7.5);
    }
  }

  // 4d) TWIN CEREMONIAL DWARVEN WAR DRUMS ("תופי מלחמה גמדיים") AT THE NORTH FLANK (lx = 114.5 & 125.5, lz = 247.2)
  const drumHeadMat = new THREE.MeshStandardMaterial({ color: 0xe7d8b9, roughness: 0.75 });
  ctx.ownMaterial(drumHeadMat);
  for (const drumX of [114.5, 125.5] as const) {
    const drumZ = 247.2;
    addBox(ctx, 2.1, 0.28, 2.1, m.darkStone, drumX, SANCTUM_Y, drumZ);
    addBox(ctx, 2.2, 0.1, 2.2, m.gold, drumX, SANCTUM_Y + 0.28, drumZ);
    const drumBody = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.82, 0.72, 1.05, 14)), m.wood);
    drumBody.position.set(drumX, SANCTUM_Y + 0.38 + 0.525, drumZ);
    ctx.group.add(drumBody);
    for (const ringY of [0.52, 0.9, 1.28]) {
      const hoop = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.84, 0.84, 0.08, 14)), m.gold);
      hoop.position.set(drumX, SANCTUM_Y + ringY, drumZ);
      ctx.group.add(hoop);
    }
    const skin = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.79, 0.79, 0.04, 14)), drumHeadMat);
    skin.position.set(drumX, SANCTUM_Y + 1.43, drumZ);
    ctx.group.add(skin);
    // Pair of golden war mallets resting on top of the drumhead
    for (const side of [-1, 1] as const) {
      const mallet = new THREE.Group();
      mallet.position.set(drumX + side * 0.22, SANCTUM_Y + 1.48, drumZ);
      mallet.rotation.y = side * 0.45;
      ctx.group.add(mallet);
      const handle = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(0.06, 0.06, 0.68)), m.wood);
      mallet.add(handle);
      const head = new THREE.Mesh(ctx.own(new THREE.SphereGeometry(0.11, 8, 8)), m.gold);
      head.position.set(0, 0.02, 0.32);
      mallet.add(head);
    }
  }

  // Grand Overhead War Room Chandelier above the Tactical Map Table
  const chandY = SANCTUM_Y + 9.2;
  addBox(ctx, 0.28, warCeilY - chandY, 0.28, m.iron, 120.0, chandY, 258.0);
  const warRing = new THREE.Mesh(
    ctx.own(new THREE.TorusGeometry(3.8, 0.24, 10, 28)),
    m.gold
  );
  warRing.rotation.x = Math.PI / 2;
  warRing.position.set(120.0, chandY, 258.0);
  ctx.group.add(warRing);
  const innerWarRing = new THREE.Mesh(
    ctx.own(new THREE.TorusGeometry(2.1, 0.16, 8, 24)),
    m.iron
  );
  innerWarRing.rotation.x = Math.PI / 2;
  innerWarRing.position.set(120.0, chandY + 0.9, 258.0);
  ctx.group.add(innerWarRing);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rx = 120.0 + Math.cos(a) * 3.8;
    const rz = 258.0 + Math.sin(a) * 3.8;
    addBox(ctx, 0.48, 0.36, 0.48, m.iron, rx, chandY + 0.12, rz);
    addBox(ctx, 0.34, 0.3, 0.34, m.ember, rx, chandY + 0.44, rz);
  }
  ctx.addLight(120.0, SANCTUM_Y + 6.5, 258.0, 0xffe099, 14.0);

  // GRAND TACTICAL WAR TABLE WITH 3D RELIEF MAP OF THE MOUNTAIN & MINE (centered at lx = 120, lz = 258)
  const wtX = 120.0;
  const wtZ = 258.0;
  // Stepped stone pedestal & heavy carved oak/stone table frame (8.0m x 4.6m)
  addBox(ctx, 8.2, 0.22, 4.8, m.darkStone, wtX, SANCTUM_Y + 0.045, wtZ);
  for (const lxOff of [-3.3, 0, 3.3]) {
    for (const lzOff of [-1.75, 1.75]) {
      addBox(ctx, 0.68, 0.86, 0.68, m.darkStone, wtX + lxOff, SANCTUM_Y + 0.265, wtZ + lzOff);
      addBox(ctx, 0.76, 0.16, 0.76, m.gold, wtX + lxOff, SANCTUM_Y + 0.58, wtZ + lzOff);
    }
  }
  // Tabletop slab & golden border rims
  addBox(ctx, 8.0, 0.24, 4.6, m.darkStone, wtX, SANCTUM_Y + 1.125, wtZ);
  addBox(ctx, 8.12, 0.12, 0.2, m.gold, wtX, SANCTUM_Y + 1.325, wtZ - 2.25);
  addBox(ctx, 8.12, 0.12, 0.2, m.gold, wtX, SANCTUM_Y + 1.325, wtZ + 2.25);
  addBox(ctx, 0.2, 0.12, 4.6, m.gold, wtX - 3.96, SANCTUM_Y + 1.325, wtZ);
  addBox(ctx, 0.2, 0.12, 4.6, m.gold, wtX + 3.96, SANCTUM_Y + 1.325, wtZ);

  // Large Unrolled Parchment & 3D Relief Map on the War Table (y = SANCTUM_Y + 1.365)
  const mapTopY = SANCTUM_Y + 1.365;
  addBox(ctx, 7.2, 0.05, 3.9, mapParchmentMat, wtX, mapTopY, wtZ);
  // 3D Relief Mountain Peaks on the Map (Khazad-dûm peaks with glowing golden watch-beacons)
  const peaks: Array<[number, number, number, number]> = [
    [-2.2, -0.8, 0.85, 0.72],
    [-1.4, -1.1, 1.15, 0.98],
    [-0.4, -0.9, 0.95, 0.82],
    [1.6, 0.7, 1.05, 0.88],
    [2.4, 0.4, 0.78, 0.64],
  ];
  for (const [px, pz, r, h] of peaks) {
    const peakMesh = new THREE.Mesh(
      ctx.own(new THREE.ConeGeometry(r, h, 6)),
      mapTerrainMat
    );
    peakMesh.position.set(wtX + px, mapTopY + 0.05 + h * 0.5, wtZ + pz);
    ctx.group.add(peakMesh);
  }
  // Glowing blue subterranean river & Miniature Golden Fortress Gatehouse of Khazad-dûm (no intersecting cross lines!)
  addBox(ctx, 6.4, 0.04, 0.28, mapRiverMat, wtX, mapTopY + 0.05, wtZ + 0.25);
  // Miniature Bridge of Khazad-dûm spanning the river
  addBox(ctx, 0.85, 0.18, 0.56, m.stone, wtX - 0.5, mapTopY + 0.06, wtZ + 0.25);
  addBox(ctx, 0.9, 0.05, 0.6, m.gold, wtX - 0.5, mapTopY + 0.24, wtZ + 0.25);
  // Miniature Golden Citadel Tower on the War Map
  addBox(ctx, 0.75, 0.52, 0.75, m.darkStone, wtX - 0.5, mapTopY + 0.05, wtZ - 1.1);
  addBox(ctx, 0.82, 0.12, 0.82, m.gold, wtX - 0.5, mapTopY + 0.57, wtZ - 1.1);

  // Strategic Miniature Troop Tokens & Rolled Battle Scrolls on the Map
  const goldTokens: Array<[number, number]> = [
    [-2.5, 0.6],
    [-1.8, 0.4],
    [-0.9, -0.2],
    [0.2, -0.4],
    [1.1, -0.3],
  ];
  for (const [tx, tz] of goldTokens) {
    addBox(ctx, 0.22, 0.08, 0.22, m.gold, wtX + tx, mapTopY + 0.05, wtZ + tz);
    addBox(ctx, 0.12, 0.28, 0.12, m.gold, wtX + tx, mapTopY + 0.13, wtZ + tz);
  }
  const enemyTokens: Array<[number, number]> = [
    [1.8, -0.6],
    [2.3, -0.2],
    [2.7, 0.9],
    [0.9, 1.1],
  ];
  for (const [tx, tz] of enemyTokens) {
    addBox(ctx, 0.22, 0.08, 0.22, m.iron, wtX + tx, mapTopY + 0.05, wtZ + tz);
    addBox(ctx, 0.14, 0.26, 0.14, crimsonMat, wtX + tx, mapTopY + 0.13, wtZ + tz);
  }
  // Rolled Parchment Battle Scrolls with golden seal rings at the corners of the table
  for (const [sxOff, szOff] of [[-3.1, -1.45], [3.1, -1.45], [-3.1, 1.45]] as const) {
    const scroll = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.09, 0.09, 0.65, 10)), mapParchmentMat);
    scroll.rotation.z = Math.PI / 2;
    scroll.position.set(wtX + sxOff, mapTopY + 0.12, wtZ + szOff);
    ctx.group.add(scroll);
    const seal = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.105, 0.105, 0.08, 10)), m.gold);
    seal.rotation.z = Math.PI / 2;
    seal.position.set(wtX + sxOff, mapTopY + 0.12, wtZ + szOff);
    ctx.group.add(seal);
  }

  // 8 High-Backed Dwarven War Council Chairs surrounding the War Table
  for (const cxOff of [-2.4, 0.0, 2.4]) {
    // North side chairs (facing South +Z)
    addBox(ctx, 0.85, 0.52, 0.85, m.darkStone, wtX + cxOff, SANCTUM_Y + 0.045, wtZ - 3.35);
    addBox(ctx, 0.85, 0.95, 0.18, m.darkStone, wtX + cxOff, SANCTUM_Y + 0.565, wtZ - 3.68);
    addBox(ctx, 0.89, 0.14, 0.22, m.gold, wtX + cxOff, SANCTUM_Y + 1.515, wtZ - 3.68);
    // South side chairs (facing North -Z)
    addBox(ctx, 0.85, 0.52, 0.85, m.darkStone, wtX + cxOff, SANCTUM_Y + 0.045, wtZ + 3.35);
    addBox(ctx, 0.85, 0.95, 0.18, m.darkStone, wtX + cxOff, SANCTUM_Y + 0.565, wtZ + 3.68);
    addBox(ctx, 0.89, 0.14, 0.22, m.gold, wtX + cxOff, SANCTUM_Y + 1.515, wtZ + 3.68);
  }

  // HEAVY DWARVEN WEAPON RACKS ALONG WEST & EAST WALLS (lx = 104.2 and lx = 135.8)
  for (const side of [-1, 1] as const) {
    const rackX = 120.0 + side * 15.6;
    for (const rz of [251.5, 258.0, 264.5]) {
      // Heavy timber & iron weapon rack frame
      addBox(ctx, 1.1, 0.22, 4.2, m.darkStone, rackX, SANCTUM_Y, rz);
      addBox(ctx, 0.24, 2.5, 0.24, m.wood, rackX, SANCTUM_Y + 0.22, rz - 1.85);
      addBox(ctx, 0.24, 2.5, 0.24, m.wood, rackX, SANCTUM_Y + 0.22, rz + 1.85);
      addBox(ctx, 0.28, 0.16, 4.1, m.wood, rackX, SANCTUM_Y + 1.15, rz);
      addBox(ctx, 0.28, 0.16, 4.1, m.wood, rackX, SANCTUM_Y + 2.25, rz);
      addBox(ctx, 0.32, 0.12, 4.2, m.gold, rackX, SANCTUM_Y + 2.65, rz);

      // 5 upright Dwarven Halberds, Warhammers & Battle Axes per rack
      for (const wzOff of [-1.4, -0.7, 0.0, 0.7, 1.4]) {
        const wz = rz + wzOff;
        addBox(ctx, 0.09, 2.15, 0.09, m.wood, rackX - side * 0.18, SANCTUM_Y + 0.24, wz);
        if (Math.abs(wzOff) > 1.0) {
          // Warhammer head
          addBox(ctx, 0.42, 0.24, 0.26, m.iron, rackX - side * 0.18, SANCTUM_Y + 2.25, wz);
          addBox(ctx, 0.46, 0.1, 0.28, m.gold, rackX - side * 0.18, SANCTUM_Y + 2.38, wz);
        } else {
          // Double-bitted Battle Axe blade
          addBox(ctx, 0.12, 0.44, 0.56, m.iron, rackX - side * 0.18, SANCTUM_Y + 2.18, wz);
          addBox(ctx, 0.14, 0.48, 0.14, m.gold, rackX - side * 0.18, SANCTUM_Y + 2.16, wz);
        }
      }
      // Round Dwarven Shields mounted along the lower rack bar
      for (const szOff of [-1.1, 0.0, 1.1]) {
        const shield = new THREE.Mesh(
          ctx.own(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 14)),
          m.iron
        );
        shield.rotation.z = Math.PI / 2;
        shield.position.set(rackX - side * 0.36, SANCTUM_Y + 0.85, rz + szOff);
        ctx.group.add(shield);
        addBox(ctx, 0.14, 0.22, 0.22, m.gold, rackX - side * 0.42, SANCTUM_Y + 0.85, rz + szOff);
      }
    }
  }

  // 4e) ROYAL COMMANDER'S DAIS, ARMOR STANDS & MONUMENTAL ROYAL WAR SHIELD + TWIN BATTLE AXES TROPHY WALL (lx = 120.0, lz = 272.5)
  addBox(ctx, 11.4, 0.45, 4.2, m.darkStone, 120.0, SANCTUM_Y, 272.5);
  addBox(ctx, 11.6, 0.14, 4.4, m.gold, 120.0, SANCTUM_Y + 0.45, 272.5);
  // Commander's Stone Desk & Throne on the Dais
  addBox(ctx, 4.6, 1.15, 1.6, m.stone, 120.0, SANCTUM_Y + 0.59, 271.8);
  addBox(ctx, 4.8, 0.18, 1.8, m.gold, 120.0, SANCTUM_Y + 1.74, 271.8);
  // Carved Commander's High-Backed Throne behind the desk (lx = 120.0, lz = 273.55)
  addBox(ctx, 1.45, 0.65, 1.2, m.darkStone, 120.0, SANCTUM_Y + 0.59, 273.55);
  addBox(ctx, 1.45, 2.2, 0.28, m.darkStone, 120.0, SANCTUM_Y + 1.24, 274.0);
  addBox(ctx, 1.55, 0.22, 0.34, m.gold, 120.0, SANCTUM_Y + 3.44, 274.0);

  // Monumental Carved Stone & Gold Backdrop Frame on the South Wall (lz = 275.2, replacing the old cross-like sword/board!)
  addBox(ctx, 9.6, 5.4, 0.36, m.darkStone, 120.0, SANCTUM_Y + 2.4, 275.22);
  addBox(ctx, 9.9, 0.26, 0.44, m.gold, 120.0, SANCTUM_Y + 2.4, 275.2);
  addBox(ctx, 9.9, 0.28, 0.44, m.gold, 120.0, SANCTUM_Y + 7.54, 275.2);
  for (const sideX of [115.35, 124.65] as const) {
    addBox(ctx, 0.42, 5.14, 0.42, m.gold, sideX, SANCTUM_Y + 2.66, 275.2);
  }

  // Twin Angled Double-Bitted Golden Dwarven Battle Axes mounted behind the Royal War Shield (lz = 274.92)
  const axeCenterY = SANCTUM_Y + 5.1;
  for (const side of [-1, 1] as const) {
    const axeGroup = new THREE.Group();
    axeGroup.position.set(120.0 + side * 1.35, axeCenterY, 274.92);
    axeGroup.rotation.z = side * 0.62;
    ctx.group.add(axeGroup);

    // Heavy iron-and-gold war axe haft
    const haft = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.09, 0.11, 4.6, 8)), m.wood);
    axeGroup.add(haft);
    const pommel = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 8)), m.gold);
    pommel.position.set(0, -2.25, 0);
    axeGroup.add(pommel);

    // Double-bitted crescent/trapezoid Dwarven Battle Axe head at the top of the haft (y = +1.75)
    const collar = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(0.32, 0.48, 0.22)), m.gold);
    collar.position.set(0, 1.72, 0);
    axeGroup.add(collar);
    for (const bitSide of [-1, 1] as const) {
      const bladeInner = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(0.58, 0.56, 0.12)), m.iron);
      bladeInner.position.set(bitSide * 0.42, 1.72, 0);
      axeGroup.add(bladeInner);
      const bladeEdge = new THREE.Mesh(ctx.own(new THREE.BoxGeometry(0.28, 0.92, 0.14)), m.gold);
      bladeEdge.position.set(bitSide * 0.78, 1.72, 0);
      axeGroup.add(bladeEdge);
    }
    const axeSpike = new THREE.Mesh(ctx.own(new THREE.ConeGeometry(0.14, 0.52, 6)), m.gold);
    axeSpike.position.set(0, 2.22, 0);
    axeGroup.add(axeSpike);
  }

  // Colossal Round Obsidian & Gold Dwarven Royal War Shield in the center (lz = 274.74)
  const shieldCenterY = SANCTUM_Y + 5.05;
  const shieldDisc = new THREE.Mesh(ctx.own(new THREE.CylinderGeometry(1.75, 1.75, 0.18, 24)), m.darkStone);
  shieldDisc.rotation.x = Math.PI / 2;
  shieldDisc.position.set(120.0, shieldCenterY, 274.78);
  ctx.group.add(shieldDisc);

  const shieldOuterRim = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(1.75, 0.16, 8, 28)), m.gold);
  shieldOuterRim.position.set(120.0, shieldCenterY, 274.72);
  ctx.group.add(shieldOuterRim);

  const shieldInnerRim = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(1.05, 0.11, 8, 24)), m.gold);
  shieldInnerRim.position.set(120.0, shieldCenterY, 274.68);
  ctx.group.add(shieldInnerRim);

  // 8 Golden Rim Bosses around the War Shield + Central Faceted Crown Jewel Boss
  const bossGeo = ctx.own(new THREE.OctahedronGeometry(0.22, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const boss = new THREE.Mesh(bossGeo, m.gold);
    boss.scale.set(1.0, 1.0, 0.55);
    boss.position.set(120.0 + Math.cos(a) * 1.4, shieldCenterY + Math.sin(a) * 1.4, 274.66);
    ctx.group.add(boss);
  }
  const centerJewel = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(0.68, 0)), m.gold);
  centerJewel.scale.set(1.15, 1.15, 0.45);
  centerJewel.position.set(120.0, shieldCenterY, 274.62);
  ctx.group.add(centerJewel);

  // Flanking Crimson & Gold Royal Tapestry Panels inside the backdrop frame (lx = 116.65 and 123.35)
  for (const tapX of [116.65, 123.35] as const) {
    addBox(ctx, 1.45, 3.8, 0.08, crimsonMat, tapX, SANCTUM_Y + 3.1, 274.98);
    addBox(ctx, 1.55, 0.14, 0.12, m.gold, tapX, SANCTUM_Y + 6.9, 274.96);
    addBox(ctx, 1.55, 0.14, 0.12, m.gold, tapX, SANCTUM_Y + 3.1, 274.96);
    const tapGem = new THREE.Mesh(bossGeo, m.gold);
    tapGem.scale.set(1.2, 1.5, 0.4);
    tapGem.position.set(tapX, SANCTUM_Y + 5.05, 274.92);
    ctx.group.add(tapGem);
  }

  // 4 Royal Dwarven Armor Stands flanking the Commander's Dais
  for (const ax of [112.5, 115.8, 124.2, 127.5]) {
    addBox(ctx, 1.1, 0.35, 1.1, m.darkStone, ax, SANCTUM_Y + 0.59, 272.6);
    addBox(ctx, 0.22, 1.95, 0.22, m.wood, ax, SANCTUM_Y + 0.94, 272.6);
    // Dwarven Plate Cuirass & Pauldrons
    addBox(ctx, 0.88, 0.95, 0.52, m.iron, ax, SANCTUM_Y + 1.55, 272.6);
    addBox(ctx, 1.18, 0.28, 0.58, m.gold, ax, SANCTUM_Y + 2.28, 272.6);
    // Horned Dwarven War Helmet
    addBox(ctx, 0.48, 0.46, 0.48, m.iron, ax, SANCTUM_Y + 2.62, 272.6);
    addBox(ctx, 0.52, 0.12, 0.52, m.gold, ax, SANCTUM_Y + 2.82, 272.6);
    addBox(ctx, 0.86, 0.14, 0.14, m.gold, ax, SANCTUM_Y + 2.95, 272.6);
  }
  ctx.addLight(120.0, SANCTUM_Y + 4.8, 271.5, 0xffc84a, 10.5);
}
// #endregion


