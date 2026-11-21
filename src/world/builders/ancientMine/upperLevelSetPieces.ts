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
  EAST_FORK_SWITCH_LEVER_LOCAL,
  evaluateRideableMinecartPose,
  getActivePlayerRiddenMinecartLineId,
  getEastForkSwitchBranch,
  getRideableMinecartVisualProgress,
  isRailTurnoutJunctionVertex,
  subdivideRailPolyline3D,
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
  buildStartingHallChandeliersAndMarketStalls(kit, ctx);
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
    const hoistWave = 0.5 + 0.5 * Math.sin(t * 0.35);
    const minBucketY = MINE_LEVEL_Y.galleryPit + 0.22;
    const maxBucketY = U + 1.35;
    const bucketBottomY = minBucketY + (maxBucketY - minBucketY) * hoistWave;
    gallery.bucket.position.y = bucketBottomY;
    const bailTopY = bucketBottomY + 1.45;
    gallery.hoistChain.scale.y = Math.max(0.5, gallery.pulleyY - bailTopY);
    gallery.pulleyWheel.rotation.x = Math.cos(t * 0.35) * 1.6;
    const targetLeverRot = getEastForkSwitchBranch() === 'left' ? -0.46 : 0.46;
    gallery.switchLeverArm.rotation.z += (targetLeverRot - gallery.switchLeverArm.rotation.z) * 0.18;
    gallery.switchIndicatorMat.color.setHex(
      getEastForkSwitchBranch() === 'left' ? 0x38bdf8 : 0xfbbf24
    );
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
    // Stepped dark-stone plinth & golden base collar (strictly disjoint Y ranges)
    kit.box(f.halfX * 2 + 0.72, 0.54, f.halfZ * 2 + 0.72, m.darkStone, f.lx, E + 0.01, f.lz);
    kit.box(f.halfX * 2 + 0.52, 0.18, f.halfZ * 2 + 0.52, m.gold, f.lx, E + 0.55, f.lz);
    // Main carved stone pillar shaft (y = 3.38 .. 6.18, strictly under capital & frieze)
    kit.box(f.halfX * 2, 2.8, f.halfZ * 2, m.stone, f.lx, E + 0.73, f.lz);
    // Corner golden chamfers along the pillar shaft
    for (const cx of [-f.halfX + 0.06, f.halfX - 0.06]) {
      for (const cz of [-f.halfZ + 0.06, f.halfZ - 0.06]) {
        kit.box(0.18, 2.6, 0.18, m.gold, f.lx + cx, E + 0.83, f.lz + cz);
      }
    }
    // Stepped capital collar & abacus strictly below y = 7.0 (y = 6.18 .. 6.98)
    kit.box(f.halfX * 2 + 0.48, 0.18, f.halfZ * 2 + 0.48, m.gold, f.lx, 6.18, f.lz);
    kit.box(f.halfX * 2 + 0.72, 0.62, f.halfZ * 2 + 0.72, m.darkStone, f.lx, 6.36, f.lz);
    // Vertical rune channels & central shield boss on the north pillar face (strictly proud of z = -2.4)
    for (const dx of [-0.85, 0, 0.85]) {
      kit.box(0.16, 2.35, 0.07, m.gold, f.lx + dx, E + 0.95, f.lz - f.halfZ - 0.04);
    }
    kit.box(0.95, 0.95, 0.09, m.darkStone, f.lx, E + 1.65, f.lz - f.halfZ - 0.06);
    kit.box(0.62, 0.62, 0.11, m.gold, f.lx, E + 1.81, f.lz - f.halfZ - 0.09);
    ctx.addTorch(f.lx, E + 2.85, f.lz - f.halfZ - 0.55);
  }

  // Lower portal architrave soffit between the pillars (strictly below CEILING_Y.entrance = 7.0 so it never Z-fights!)
  kit.box(13.48, 0.18, 2.34, m.gold, 0, 6.37, -1.2);
  kit.box(13.36, 0.41, 2.22, m.darkStone, 0, 6.55, -1.2);

  // Monumental stone frieze above the gate mouth (`y = 7.04 .. 11.6`, strictly above CEILING_Y.entrance = 7.0)
  const headerBottom = 7.04;
  const headerTop = 11.6;
  kit.box(21.2, headerTop - headerBottom, 2.4, m.stone, 0, headerBottom, -1.2);
  // Stepped overhanging crown cornice above the frieze
  kit.box(22.0, 0.52, 2.76, m.darkStone, 0, headerTop, -1.28);
  kit.box(22.4, 0.22, 2.92, m.gold, 0, headerTop + 0.52, -1.32);

  // Horizontal golden frieze moldings at z = -2.44 (non-overlapping with vertical triglyphs)
  for (const y of [headerBottom + 0.36, headerTop - 0.56]) {
    kit.box(20.4, 0.2, 0.08, m.gold, 0, y, -2.44);
  }
  // Vertical golden rune triglyphs strictly between the horizontal bands (skipping i = 4 at x = 0 for the Royal Crest)
  for (let i = 0; i < 9; i++) {
    if (i === 4) continue;
    kit.box(0.48, 1.35, 0.09, m.gold, -8 + i * 2, headerBottom + 1.55, -2.46);
    kit.box(0.26, 0.95, 0.11, m.darkStone, -8 + i * 2, headerBottom + 1.75, -2.51);
  }

  // Central Royal Dwarven Crest plaque & Octahedron jewel over the entrance
  kit.box(2.7, 2.4, 0.12, m.darkStone, 0, headerBottom + 1.05, -2.46);
  kit.box(2.9, 0.16, 0.15, m.gold, 0, headerBottom + 0.89, -2.48);
  kit.box(2.9, 0.16, 0.15, m.gold, 0, headerBottom + 3.45, -2.48);
  const crest = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(1.12, 0)), m.gold);
  crest.scale.set(1.32, 1.12, 0.36);
  crest.position.set(0, headerBottom + 2.25, -2.62);
  ctx.group.add(crest);

  // Inner portal arch header at lz = 6.0:
  // - Upper stone closure starts at y = 7.04 (strictly above CEILING_Y.entrance = 7.0)
  // - Lower carved arch soffit & gold molding sit at y = 6.20..6.96 (strictly below CEILING_Y.entrance = 7.0)
  //   eliminating the coplanar Z-fighting gold strip on the entrance ceiling!
  kit.box(16.6, 4.46, 1.4, m.darkStone, 0, 7.04, 6.0);
  kit.box(11.88, 0.54, 1.36, m.darkStone, 0, 6.42, 6.0);
  kit.box(11.94, 0.22, 1.48, m.gold, 0, 6.2, 6.0);
  kit.box(0.92, 0.68, 1.58, m.gold, 0, 6.1, 6.0);
  for (const sideX of [-5.68, 5.68]) {
    kit.box(0.56, 6.78, 1.24, m.darkStone, sideX, -0.58, 6.0);
    kit.box(0.64, 0.2, 1.34, m.gold, sideX, 4.2, 6.0);
  }

  // Additional vaulted stone-and-gold ceiling ribs along the entrance descent (lz = 12.5, 19.0)
  for (const ribZ of [12.5, 19.0]) {
    kit.box(11.88, 0.48, 1.1, m.darkStone, 0, 6.48, ribZ);
    kit.box(11.94, 0.18, 1.22, m.gold, 0, 6.3, ribZ);
  }

  // Gate leaves: heavy iron doors with vertical bars and gold bosses, opened flat against the face.
  for (const id of ['gate-leaf-west', 'gate-leaf-east']) {
    const f = fixture(id);
    kit.box(f.halfX * 2, f.height, f.halfZ * 2, m.iron, f.lx, E + 0.01, f.lz);
    for (let i = 0; i < 6; i++) {
      kit.box(0.12, f.height - 0.3, 0.08, m.darkStone, f.lx - f.halfX + 0.6 + i * 1.2, E + 0.16, f.lz - 0.24);
    }
    for (const y of [1.2, 3.1, 5.0]) {
      kit.box(f.halfX * 2, 0.25, 0.09, m.gold, f.lx, E + y, f.lz - 0.29);
    }
  }
  // Torches just inside the mouth light the steps down.
  ctx.addTorch(-6.6, MINE_LEVEL_Y.overlook + 3, 10);
  ctx.addTorch(6.6, MINE_LEVEL_Y.overlook + 3, 10);
}
// #endregion

// #region Starting Hall Grand Overhead Chandeliers & Dwarven Market Stalls
/**
 * Summary: Builds 6 colossal multi-tiered Dwarven iron-and-gold overhead chandeliers
 *          suspended from the domed ceiling of the starting hall (`upper-central-hub`) for bright warm
 *          illumination, plus 3 detailed Dwarven Market Stalls along the West Entry Promenade (`lx = -11.5`):
 *          1. Weapons & Armor Stall (`lz = 49.0`): hammers, battle axes, shields, and horned helmets.
 *          2. Precious Materials Stall (`lz = 56.5`): gold ingots, glowing diamonds, gold ore, sapphires, and amethysts.
 *          3. Mining & Engineering Tools Stall (`lz = 64.0`): dwarven/mithril pickaxes, chisels, rotary core drills, and lanterns.
 */
function buildStartingHallChandeliersAndMarketStalls(kit: Kit, ctx: ISetPieceContext): void {
  const { m } = kit;

  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.35,
    roughness: 0.1,
    metalness: 0.25,
  });
  const sapphireMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.3,
  });
  const amethystMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.3,
  });
  const mithrilMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.85,
  });
  ctx.ownMaterial(diamondMat, sapphireMat, amethystMat, mithrilMat);

  // 1) 6 COLOSSAL MULTI-TIERED DWARVEN OVERHEAD CHANDELIERS IN THE STARTING HALL
  const chandelierSpots: readonly [number, number][] = [
    [-18.0, 46.0],
    [18.0, 46.0],
    [-22.0, 68.0],
    [22.0, 68.0],
    [-18.0, 98.0],
    [18.0, 98.0],
  ];
  const outerRingGeo = ctx.own(new THREE.TorusGeometry(2.8, 0.16, 8, 24));
  const innerRingGeo = ctx.own(new THREE.TorusGeometry(1.55, 0.12, 8, 20));
  const flameConeGeo = ctx.own(new THREE.ConeGeometry(0.14, 0.38, 6));

  for (const [cx, cz] of chandelierSpots) {
    const ceilY = sampleAncientMineFloor(cx, cz)?.ceilingY ?? 7.5;
    const wheelY = U + 6.8;
    const upperWheelY = U + 7.85;
    // Heavy forged ceiling anchor & suspension chain from the domed rock ceiling
    kit.cyl(0.65, 0.85, 0.4, m.darkStone, cx, ceilY - 0.2, cz, 10);
    kit.chain(cx, cz, ceilY - 0.35, wheelY);

    const chand = new THREE.Group();
    chand.position.set(cx, wheelY, cz);
    kit.add(chand);

    // Central gilded hub & pendant finial
    kit.cyl(0.42, 0.32, 2.2, m.gold, 0, 0.4, 0, 10, chand);
    const finial = new THREE.Mesh(ctx.own(new THREE.OctahedronGeometry(0.38, 0)), m.gold);
    finial.position.set(0, -0.85, 0);
    chand.add(finial);

    // Lower main iron & gold ring (r = 2.8m)
    const outerRing = new THREE.Mesh(outerRingGeo, m.iron);
    outerRing.rotation.x = Math.PI / 2;
    chand.add(outerRing);
    const outerGoldTrim = new THREE.Mesh(outerRingGeo, m.gold);
    outerGoldTrim.rotation.x = Math.PI / 2;
    outerGoldTrim.scale.set(1.03, 1.03, 0.55);
    outerGoldTrim.position.y = 0.08;
    chand.add(outerGoldTrim);

    // Upper inner tier ring (r = 1.55m)
    const innerRing = new THREE.Mesh(innerRingGeo, m.gold);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = upperWheelY - wheelY;
    chand.add(innerRing);

    // 8 radial iron spokes + diagonal suspension chains + 8 large glowing brazier cups on the outer ring
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const spoke = kit.box(0.12, 0.12, 2.75, m.iron, cos * 1.38, -0.06, sin * 1.38, chand);
      spoke.rotation.y = Math.atan2(cos, sin);

      const cupX = cos * 2.8;
      const cupZ = sin * 2.8;
      kit.cyl(0.26, 0.16, 0.28, m.gold, cupX, 0.2, cupZ, 8, chand);
      kit.cyl(0.11, 0.11, 0.34, m.stone, cupX, 0.46, cupZ, 8, chand);
      const flame = new THREE.Mesh(flameConeGeo, m.ember);
      flame.position.set(cupX, 0.78, cupZ);
      chand.add(flame);

      if (i % 2 === 0) {
        const icX = cos * 1.55;
        const icZ = sin * 1.55;
        const iy = upperWheelY - wheelY;
        kit.cyl(0.22, 0.14, 0.24, m.gold, icX, iy + 0.18, icZ, 8, chand);
        const iflame = new THREE.Mesh(flameConeGeo, m.ember);
        iflame.position.set(icX, iy + 0.52, icZ);
        chand.add(iflame);
      }
    }

    // Bright overhead warm golden lights from each chandelier illuminating the starting cavern
    ctx.addLight(cx, wheelY - 0.5, cz, 0xffd27a, 9.5);
    ctx.addLight(cx, wheelY + 0.35, cz, 0xffcc66, 8.5);
  }

  // 2) 3 DWARVEN MARKET STALLS ALONG THE WEST ENTRY PROMENADE (lx = -11.5, lz = 49.0 / 56.5 / 64.0)
  //    All vertical and horizontal slabs use strictly disjoint bounds so golden tabletops never Z-fight.
  const buildStallFrame = (sz: number, awningAccentMat: THREE.Material): THREE.Group => {
    const sx = -11.5;
    const stall = new THREE.Group();
    stall.position.set(sx, U, sz);
    kit.add(stall);

    // Stone base plinth (y: 0.01 .. 0.22) & carved wooden counter (y: 0.22 .. 1.04)
    kit.box(2.0, 0.21, 4.2, m.darkStone, 0, 0.01, 0, stall);
    kit.box(1.75, 0.82, 3.95, m.wood, 0.05, 0.22, 0, stall);
    // Decorative iron vertical straps (y: 0.22 .. 0.90) & gold trim (y: 0.90 .. 1.02) on the front (+X) face
    for (const dz of [-1.8, -0.6, 0.6, 1.8]) {
      kit.box(0.08, 0.68, 0.14, m.iron, 0.968, 0.22, dz, stall);
    }
    kit.box(0.08, 0.12, 4.0, m.gold, 0.968, 0.9, 0, stall);
    // Stone sub-counter slab (y: 1.04 .. 1.11) and gleaming golden tabletop (y: 1.11 .. 1.17) — strictly disjoint!
    kit.box(1.96, 0.07, 4.22, m.stone, 0.05, 1.04, 0, stall);
    kit.box(2.04, 0.06, 4.3, m.gold, 0.05, 1.11, 0, stall);

    // Back display shelf wall behind the merchant (`lx = -13.85` -> local `x = -2.35`, matching `market-backwall-*` collider)
    kit.box(0.65, 2.34, 3.8, m.darkStone, -2.35, 0.01, 0, stall);
    kit.box(0.72, 0.12, 3.9, m.gold, -2.35, 2.35, 0, stall);
    // Shelves protrude cleanly on the +X face (`x = -1.94, w = 0.16`) without overlapping the stone backwall
    kit.box(0.16, 0.08, 3.6, m.wood, -1.94, 1.15, 0, stall);
    kit.box(0.16, 0.08, 3.6, m.wood, -1.94, 1.75, 0, stall);

    // 4 Corner Canopy Posts starting strictly above the golden tabletop (`y = 1.17 .. 2.92`)
    for (const px of [-0.82, 0.88]) {
      for (const pz of [-1.95, 1.95]) {
        kit.box(0.18, 1.25, 0.18, m.wood, px, 1.17, pz, stall);
        kit.box(0.22, 0.14, 0.22, m.gold, px, 2.42, pz, stall);
        kit.box(0.18, 0.36, 0.18, m.wood, px, 2.56, pz, stall);
      }
    }
    // Overhead sign board on the East (+X) front lintel (disjoint Y: bottom gold 2.40..2.46, wood 2.46..2.82, top gold 2.82..2.88)
    kit.box(0.18, 0.06, 3.7, m.gold, 0.92, 2.4, 0, stall);
    kit.box(0.14, 0.36, 3.6, m.wood, 0.92, 2.46, 0, stall);
    kit.box(0.18, 0.06, 3.7, m.gold, 0.92, 2.82, 0, stall);

    // Sloped canopy roof with alternating wood & accent ribs (ribs sit strictly above roof at y = 0.102)
    const roof = new THREE.Group();
    roof.position.set(0.05, 2.92, 0);
    roof.rotation.z = -0.14;
    stall.add(roof);
    kit.box(2.35, 0.1, 4.45, m.wood, 0, 0, 0, roof);
    for (const rz of [-1.8, -0.9, 0, 0.9, 1.8]) {
      kit.box(2.42, 0.06, 0.28, awningAccentMat, 0, 0.102, rz, roof);
    }
    kit.box(0.1, 0.16, 4.5, m.gold, 1.23, -0.02, 0, roof);

    ctx.addTorch(sx + 1.05, U + 2.55, sz - 1.95, 0xffc85a, 7.5);
    ctx.addTorch(sx + 1.05, U + 2.55, sz + 1.95, 0xffc85a, 7.5);
    return stall;
  };

  // --- STALL 1 (lz = 49.0): DWARVEN WEAPONS & ARMOR STALL (Warhammer, Battle Axe, Shield, Horned Helmet) ---
  {
    const stall1 = buildStallFrame(49.0, m.gold);
    const cy = 1.174;

    // 1a. Dwarven Warhammer on the south end of the counter
    const hammer = new THREE.Group();
    hammer.position.set(0.18, cy + 0.08, -1.25);
    hammer.rotation.y = 0.35;
    stall1.add(hammer);
    kit.box(0.08, 0.08, 0.95, m.wood, 0, 0, 0, hammer);
    kit.box(0.44, 0.24, 0.26, m.iron, 0, 0.04, -0.38, hammer);
    kit.box(0.48, 0.08, 0.28, m.gold, 0, 0.12, -0.38, hammer);

    // 1b. Double-Bit Dwarven Battle Axe in the center-south of the counter
    const axe = new THREE.Group();
    axe.position.set(0.22, cy + 0.06, -0.35);
    axe.rotation.y = -0.25;
    stall1.add(axe);
    kit.box(0.07, 0.07, 1.02, m.wood, 0, 0, 0, axe);
    kit.box(0.68, 0.06, 0.38, m.iron, 0, 0.02, -0.36, axe);
    kit.box(0.72, 0.04, 0.12, m.gold, 0, 0.03, -0.36, axe);

    // 1c. Round Iron & Gold Dwarven Shield propped on an angled display stand
    const shield = new THREE.Group();
    shield.position.set(0.15, cy + 0.38, 0.55);
    shield.rotation.z = -0.45;
    shield.rotation.y = 0.2;
    stall1.add(shield);
    const shieldDisc = kit.cyl(0.46, 0.46, 0.06, m.iron, 0, 0, 0, 16, shield);
    shieldDisc.rotation.z = Math.PI / 2;
    const shieldRim = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(0.45, 0.045, 8, 18)), m.gold);
    shieldRim.rotation.y = Math.PI / 2;
    shield.add(shieldRim);
    const shieldBoss = new THREE.Mesh(ctx.own(new THREE.SphereGeometry(0.14, 10, 8)), m.gold);
    shieldBoss.position.set(0.04, 0, 0);
    shield.add(shieldBoss);

    // 1d. Horned Dwarven Helmet on an armor stand bust on the north end of the counter
    const helm = new THREE.Group();
    helm.position.set(0.18, cy, 1.38);
    stall1.add(helm);
    kit.cyl(0.12, 0.16, 0.22, m.wood, 0, 0.11, 0, 10, helm);
    const dome = new THREE.Mesh(ctx.own(new THREE.SphereGeometry(0.24, 12, 10)), m.iron);
    dome.position.set(0, 0.32, 0);
    helm.add(dome);
    kit.box(0.26, 0.07, 0.26, m.gold, 0, 0.24, 0, helm);
    kit.box(0.06, 0.18, 0.05, m.gold, 0.22, 0.16, 0, helm); // Nasal guard facing East (+X)
    const hornGeo = ctx.own(new THREE.ConeGeometry(0.06, 0.32, 8));
    for (const side of [-1, 1] as const) {
      const horn = new THREE.Mesh(hornGeo, m.gold);
      horn.position.set(0.04, 0.44, side * 0.24);
      horn.rotation.x = side * 0.65;
      helm.add(horn);
    }

    // Extra shields & axes on the rear display shelves (`x = -2.15`)
    for (const sz of [-1.1, 0, 1.1]) {
      const rShield = kit.cyl(0.38, 0.38, 0.06, sz === 0 ? m.gold : m.iron, -2.12, 1.55, sz, 14, stall1);
      rShield.rotation.z = Math.PI / 2;
    }
  }

  // --- STALL 2 (lz = 56.5): PRECIOUS MATERIALS, GOLD & DIAMONDS STALL (Gold Ingots, Diamonds, Gems) ---
  {
    const stall2 = buildStallFrame(56.5, diamondMat);
    const cy = 1.174;

    // 2a. Stacked Pyramid of Gleaming Gold Ingots on the south side of the counter
    for (let row = 0; row < 3; row++) {
      const count = 3 - row;
      for (let k = 0; k < count; k++) {
        kit.box(
          0.34,
          0.1,
          0.16,
          m.gold,
          0.18,
          cy + row * 0.105,
          -1.45 + k * 0.2 + row * 0.1,
          stall2
        );
      }
    }

    // 2b. Velvet Display Cushion with Brilliantly Glowing Faceted Diamonds — stacked without overlap
    kit.box(0.58, 0.028, 0.88, m.gold, 0.22, cy, -0.35, stall2);
    kit.box(0.52, 0.042, 0.82, m.darkStone, 0.22, cy + 0.028, -0.35, stall2);
    const diaGeo = ctx.own(new THREE.OctahedronGeometry(0.16, 0));
    for (const [dx, dz, sc] of [
      [0.22, -0.55, 1.15],
      [0.26, -0.32, 1.35],
      [0.18, -0.12, 1.05],
      [0.08, -0.42, 0.85],
    ] as const) {
      const dia = new THREE.Mesh(diaGeo, diamondMat);
      dia.scale.set(sc, sc * 1.35, sc);
      dia.position.set(dx, cy + 0.07 + 0.18 * sc, dz);
      dia.rotation.y = dz * 2.1;
      stall2.add(dia);
    }

    // 2c. Brass Jeweler's Balance Scale in the center-north
    const scaleGrp = new THREE.Group();
    scaleGrp.position.set(0.2, cy, 0.55);
    stall2.add(scaleGrp);
    kit.cyl(0.14, 0.18, 0.06, m.gold, 0, 0.03, 0, 10, scaleGrp);
    kit.cyl(0.03, 0.03, 0.42, m.gold, 0, 0.27, 0, 8, scaleGrp);
    kit.box(0.06, 0.05, 0.56, m.gold, 0, 0.48, 0, scaleGrp);
    for (const side of [-1, 1] as const) {
      kit.cyl(0.12, 0.09, 0.04, m.gold, 0, 0.24, side * 0.25, 10, scaleGrp);
    }

    // 2d. Glowing Sapphires, Amethysts & Raw Gold Ore Nuggets on the north tray
    kit.box(0.52, 0.055, 0.85, m.darkStone, 0.22, cy, 1.35, stall2);
    for (const [dz, mat] of [
      [1.08, sapphireMat],
      [1.35, amethystMat],
      [1.62, m.gold],
    ] as const) {
      const gem = new THREE.Mesh(diaGeo, mat);
      gem.scale.set(1.0, 1.25, 1.0);
      gem.position.set(0.24, cy + 0.18, dz);
      stall2.add(gem);
    }

    // Rear shelf gleaming gold bars & glowing diamond clusters
    for (const sz of [-1.2, 0, 1.2]) {
      const shelfGem = new THREE.Mesh(diaGeo, sz === 0 ? diamondMat : sz < 0 ? sapphireMat : amethystMat);
      shelfGem.scale.setScalar(1.45);
      shelfGem.position.set(-1.92, 1.45, sz);
      stall2.add(shelfGem);
    }
    ctx.addLight(-11.2, U + 1.65, 56.5, 0x7dd3fc, 7.5);
  }

  // --- STALL 3 (lz = 64.0): PICKAXES & ENGINEERING WORK TOOLS STALL (Pickaxes, Chisels, Core Drill, Lanterns) ---
  {
    const stall3 = buildStallFrame(64.0, m.iron);
    const cy = 1.174;

    // 3a. Heavy Dwarven Pickaxe & Glowing Mithril Pickaxe on display stands
    for (const [pz, headMat] of [
      [-1.35, m.iron],
      [-0.75, mithrilMat],
    ] as const) {
      const pick = new THREE.Group();
      pick.position.set(0.2, cy + 0.08, pz);
      pick.rotation.y = 0.25;
      stall3.add(pick);
      kit.box(0.07, 0.07, 0.95, m.wood, 0, 0, 0, pick);
      kit.box(0.62, 0.08, 0.1, headMat, 0, 0.03, -0.36, pick);
      kit.box(0.14, 0.11, 0.14, m.gold, 0, 0.02, -0.36, pick);
    }

    // 3b. Dwarven Stone-Carving Chisel Set & Mallet
    for (let c = 0; c < 4; c++) {
      kit.box(0.38, 0.04, 0.05, c % 2 === 0 ? m.iron : m.gold, 0.22, cy + 0.02, -0.15 + c * 0.11, stall3);
    }

    // 3c. Mechanical Rotary Crystal-Core Drill in the center-north
    const drill = new THREE.Group();
    drill.position.set(0.22, cy + 0.18, 0.68);
    stall3.add(drill);
    kit.box(0.36, 0.22, 0.32, m.iron, -0.08, -0.18, 0, drill);
    const gearWheel = kit.cyl(0.18, 0.18, 0.06, m.gold, -0.05, 0.04, 0.19, 12, drill);
    gearWheel.rotation.x = Math.PI / 2;
    const drillBit = new THREE.Mesh(ctx.own(new THREE.ConeGeometry(0.12, 0.52, 8)), mithrilMat);
    drillBit.rotation.z = -Math.PI / 2;
    drillBit.position.set(0.32, 0.0, 0);
    drill.add(drillBit);

    // 3d. Brass Prospector's Rune Lantern on the north corner of the counter
    const lantern = new THREE.Group();
    lantern.position.set(0.24, cy, 1.45);
    stall3.add(lantern);
    kit.cyl(0.15, 0.18, 0.08, m.gold, 0, 0.04, 0, 10, lantern);
    kit.cyl(0.12, 0.12, 0.28, m.ember, 0, 0.22, 0, 8, lantern);
    kit.cyl(0.17, 0.14, 0.08, m.gold, 0, 0.4, 0, 10, lantern);
  }
}
// #endregion

// #region Rail Hub — Grand Central Gold Funnel Pit, Curved Tracks, Switch Frogs & Station Kiosks
/**
 * Summary: Subdivides a 2D track polyline into a smooth C1-continuous path using the shared
 *          `subdivideRailPolyline3D` curve generator so visual rails, AI cooperative minecarts,
 *          and player-rideable minecarts share the exact same centerline.
 */
function subdividePolylineWithCurves(
  line: readonly (readonly [number, number])[],
  initialTangent?: readonly [number, number],
  cornerRadius = 3.6,
  arcSteps = 8
): [number, number][] {
  const line3d = line.map(([x, z]) => [x, trackFloorY(x, z), z] as const);
  return subdivideRailPolyline3D(line3d, initialTangent, cornerRadius, arcSteps).map(([x, , z]) => [
    x,
    z,
  ]);
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
  ctx.addLight(lx, floorY + 2.05, lz, 0xffc44d, 4.5);
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
  kit.box(1.75, 0.36, 0.34, m.iron, 0, 0.02, 0, stop);
  kit.box(1.82, 0.14, 0.4, m.gold, 0, 0.38, 0, stop);
  for (const dx of [-RAIL_GAUGE_HALF, RAIL_GAUGE_HALF]) {
    kit.box(0.22, 0.46, 0.55, m.iron, dx, 0.02, -0.15, stop);
  }
}

/**
 * Summary: Finds the closest point on a 2D polyline to `(px, pz)`, returning its coordinates,
 *          segment tangent yaw, and horizontal distance.
 */
function closestPointOnPolyline2D(
  px: number,
  pz: number,
  line: readonly (readonly [number, number])[]
): { x: number; z: number; yaw: number; dist: number } {
  let bestDistSq = Infinity;
  let bestX = px;
  let bestZ = pz;
  let bestYaw = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const ax = line[i][0];
    const az = line[i][1];
    const bx = line[i + 1][0];
    const bz = line[i + 1][1];
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
    const qx = ax + dx * t;
    const qz = az + dz * t;
    const dSq = (px - qx) * (px - qx) + (pz - qz) * (pz - qz);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestX = qx;
      bestZ = qz;
      bestYaw = Math.atan2(dx, dz);
    }
  }
  return { x: bestX, z: bestZ, yaw: bestYaw, dist: Math.sqrt(bestDistSq) };
}

/**
 * Summary: Builds a complete railway network with continuous arc-length sleeper spacing (so sleepers
 *          never bunch up on curves) and unified single-piece switch ties across diverging tracks
 *          at every turnout junction (so sleepers never overlap or crisscross).
 */
function buildUnifiedRailwayNetwork(
  kit: Kit,
  allSmoothLines: readonly (readonly (readonly [number, number])[])[],
  initialTangents: readonly (readonly [number, number] | undefined)[]
): void {
  const { m } = kit;
  const TURNOUT_PAIRS = [
    { mainIdx: 0, branchIdx: 1, jx: 56.0, jz: 78.0, standSide: 1 },
    { mainIdx: 4, branchIdx: 5, jx: -18.0, jz: 75.0, standSide: 1 },
    { mainIdx: 1, branchIdx: 6, jx: 156.0, jz: 72.0, standSide: -1 },
  ] as const;

  for (let lineIdx = 0; lineIdx < allSmoothLines.length; lineIdx++) {
    const smoothLine = allSmoothLines[lineIdx];
    const initialTangent = initialTangents[lineIdx];
    const n = smoothLine.length;
    if (n < 2) continue;
    const isBranchTrack = initialTangent !== undefined;

    // 1) Compute smooth vertex normals for the left and right steel rails
    const normals: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      let tx = 0;
      let tz = 1;
      if (i === 0 && initialTangent !== undefined) {
        tx = initialTangent[0];
        tz = initialTangent[1];
      } else if (i === 0) {
        const dx = smoothLine[1][0] - smoothLine[0][0];
        const dz = smoothLine[1][1] - smoothLine[0][1];
        const len = Math.hypot(dx, dz) || 1;
        tx = dx / len;
        tz = dz / len;
      } else if (i === n - 1) {
        const dx = smoothLine[n - 1][0] - smoothLine[n - 2][0];
        const dz = smoothLine[n - 1][1] - smoothLine[n - 2][1];
        const len = Math.hypot(dx, dz) || 1;
        tx = dx / len;
        tz = dz / len;
      } else {
        const dx0 = smoothLine[i][0] - smoothLine[i - 1][0];
        const dz0 = smoothLine[i][1] - smoothLine[i - 1][1];
        const len0 = Math.hypot(dx0, dz0) || 1;
        const dx1 = smoothLine[i + 1][0] - smoothLine[i][0];
        const dz1 = smoothLine[i + 1][1] - smoothLine[i][1];
        const len1 = Math.hypot(dx1, dz1) || 1;
        const sumX = dx0 / len0 + dx1 / len1;
        const sumZ = dz0 / len0 + dz1 / len1;
        const sumLen = Math.hypot(sumX, sumZ) || 1;
        tx = sumX / sumLen;
        tz = sumZ / sumLen;
      }
      normals.push([tz, -tx]);
    }

    // 2) Draw continuous left & right steel rails
    for (let i = 0; i < n - 1; i++) {
      const a = smoothLine[i];
      const b = smoothLine[i + 1];
      const na = normals[i];
      const nb = normals[i + 1];
      const ya = trackFloorY(a[0], a[1]);
      const yb = trackFloorY(b[0], b[1]);

      for (const side of [-1, 1] as const) {
        const ax = a[0] + na[0] * side * RAIL_GAUGE_HALF;
        const az = a[1] + na[1] * side * RAIL_GAUGE_HALF;
        const bx = b[0] + nb[0] * side * RAIL_GAUGE_HALF;
        const bz = b[1] + nb[1] * side * RAIL_GAUGE_HALF;
        const dx = bx - ax;
        const dy = yb - ya;
        const dz = bz - az;
        const flat = Math.hypot(dx, dz);
        const len = Math.hypot(flat, dy);
        if (len < 0.02) continue;
        // Branch rails sit 1.5mm lower near the junction so top faces never Z-fight at the switch point or frog crossing
        const yLift = isBranchTrack && i < 12 ? 0.1585 : 0.16;
        const mesh = new THREE.Mesh(
          kit['_ctx'].own(new THREE.BoxGeometry(0.11, 0.12, len + 0.025)),
          m.iron
        );
        mesh.position.set((ax + bx) * 0.5, (ya + yb) * 0.5 + yLift, (az + bz) * 0.5);
        mesh.rotation.order = 'YXZ';
        mesh.rotation.y = Math.atan2(dx, dz);
        mesh.rotation.x = -Math.atan2(dy, flat || 1);
        kit.add(mesh);
      }
    }

    // 3) Place timber sleepers at uniform cumulative arc-length spacing (`0.92m`) along the entire track
    const tieSpacing = 0.92;
    let nextTieDist = 0.46;
    let accDist = 0;

    for (let i = 0; i < n - 1; i++) {
      const a = smoothLine[i];
      const b = smoothLine[i + 1];
      const ya = trackFloorY(a[0], a[1]);
      const yb = trackFloorY(b[0], b[1]);
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const flat = Math.hypot(dx, dz);
      const segLen = Math.hypot(flat, yb - ya);
      if (segLen < 0.02) continue;
      const yaw = Math.atan2(dx, dz);
      const pitch = -Math.atan2(yb - ya, flat || 1);

      while (nextTieDist <= accDist + segLen) {
        const frac = (nextTieDist - accDist) / segLen;
        const sx = a[0] + dx * frac;
        const sz = a[1] + dz * frac;
        const sy = ya + (yb - ya) * frac;
        nextTieDist += tieSpacing;

        // If this is a branch track inside its parent turnout merge zone (separation < 2.30m),
        // skip individual branch sleepers because the main track lays a single unified switch tie across both tracks!
        let skipBranchTie = false;
        for (const tp of TURNOUT_PAIRS) {
          if (tp.branchIdx === lineIdx && Math.hypot(sx - tp.jx, sz - tp.jz) < 16.0) {
            const onMain = closestPointOnPolyline2D(sx, sz, allSmoothLines[tp.mainIdx]);
            if (onMain.dist < 2.3) {
              skipBranchTie = true;
              break;
            }
          }
        }
        if (skipBranchTie) continue;

        // If this is a main track passing through a turnout divergence zone, widen the sleeper to span cleanly under BOTH tracks!
        let tieCenterX = sx;
        let tieCenterZ = sz;
        let tieYaw = yaw;
        let tieWidth = 2.0;
        let isUnifiedSwitchTie = false;

        for (const tp of TURNOUT_PAIRS) {
          if (tp.mainIdx === lineIdx && Math.hypot(sx - tp.jx, sz - tp.jz) < 16.0) {
            const onBranch = closestPointOnPolyline2D(sx, sz, allSmoothLines[tp.branchIdx]);
            if (onBranch.dist < 2.25 && Math.hypot(onBranch.x - tp.jx, onBranch.z - tp.jz) > 0.08) {
              tieCenterX = (sx + onBranch.x) * 0.5;
              tieCenterZ = (sz + onBranch.z) * 0.5;
              const diffYaw = Math.atan2(Math.sin(onBranch.yaw - yaw), Math.cos(onBranch.yaw - yaw));
              tieYaw = yaw + diffYaw * 0.5;
              tieWidth = 2.05 + onBranch.dist;
              isUnifiedSwitchTie = true;
              break;
            }
          }
        }

        const tie = kit.box(tieWidth, 0.08, 0.24, m.wood, tieCenterX, sy + 0.02, tieCenterZ);
        tie.rotation.order = 'YXZ';
        tie.rotation.y = tieYaw;
        tie.rotation.x = pitch;

        // On unified switch ties, add a forged iron tie-plate strap on top of the timber sleeper (strictly below rail base)
        if (isUnifiedSwitchTie) {
          const plate = kit.box(tieWidth - 0.26, 0.016, 0.14, m.iron, tieCenterX, sy + 0.102, tieCenterZ);
          plate.rotation.order = 'YXZ';
          plate.rotation.y = tieYaw;
          plate.rotation.x = pitch;
        }
      }
      accDist += segLen;
    }
  }

  // 4) Compact forged-iron switch throw bar & weighted switch stand at the 2 Upper Cavern turnouts
  //    (the 3rd turnout at [156, 72] has its own interactive mechanical switch lever stand)
  for (const tp of TURNOUT_PAIRS) {
    if (tp.jx > 140) continue;
    const y = trackFloorY(tp.jx, tp.jz);
    const onMain = closestPointOnPolyline2D(tp.jx, tp.jz, allSmoothLines[tp.mainIdx]);
    const swGroup = new THREE.Group();
    swGroup.position.set(tp.jx, y + 0.02, tp.jz);
    swGroup.rotation.y = onMain.yaw;
    kit.add(swGroup);

    const standX = tp.standSide * (RAIL_GAUGE_HALF + 0.72);
    kit.box(1.42, 0.032, 0.08, m.iron, 0, 0.082, 0.42, swGroup);
    kit.box(Math.abs(standX), 0.03, 0.05, m.iron, standX * 0.5, 0.082, 0.42, swGroup);
    kit.box(0.4, 0.12, 0.4, m.darkStone, standX, 0, 0.42, swGroup);
    kit.box(0.28, 0.16, 0.22, m.iron, standX, 0.12, 0.42, swGroup);
    const lever = kit.cyl(0.028, 0.028, 0.72, m.iron, standX, 0.45, 0.42, 6, swGroup);
    lever.rotation.z = -tp.standSide * 0.28;
    kit.cyl(0.095, 0.095, 0.08, m.gold, standX + tp.standSide * 0.1, 0.78, 0.42, 8, swGroup);
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

  // 2) SMOOTHLY CURVED RAIL TRACKS WITH UNIFIED SWITCH TIES & NON-BUNCHING SLEEPERS
  const eastBranchTangent: readonly [number, number] = [24 / Math.hypot(24, -2), -2 / Math.hypot(24, -2)];
  const westBranchTangent: readonly [number, number] = [-12 / Math.hypot(-12, -5), -5 / Math.hypot(-12, -5)];
  const eastForkBranchTangent: readonly [number, number] = [1, 0];

  const initialTangents: (readonly [number, number] | undefined)[] = [];
  const allSmoothLines: [number, number][][] = [];
  for (let lineIdx = 0; lineIdx < UPPER_RAIL_LINES.length; lineIdx++) {
    const rawLine = UPPER_RAIL_LINES[lineIdx];
    const initialTangent =
      lineIdx === 1
        ? eastBranchTangent
        : lineIdx === 5
          ? westBranchTangent
          : lineIdx === 6
            ? eastForkBranchTangent
            : undefined;
    initialTangents.push(initialTangent);
    allSmoothLines.push(subdividePolylineWithCurves(rawLine, initialTangent, 3.6, 8));
  }
  buildUnifiedRailwayNetwork(kit, allSmoothLines, initialTangents);

  // 3) INTERACTIVE MINECART TERMINAL / DISPENSER KIOSKS AT EVERY LINE START & END
  const stationKiosks: readonly [number, number, number][] = [
    [-6.5, 82.1, 0], // Central Funnel West Rim
    [-56.0, 28.1, Math.PI], // North-West Gold & Silver Wall
    [6.1, 73.2, -Math.PI / 4], // Central Funnel North-East Rim
    [86.0, 31.1, Math.PI], // North-East Gold & Silver Wall
    [6.5, 77.9, 0], // Central Funnel East Rim
    [72.2, 54.0, -Math.PI / 2], // Gallery Pit Bottom Station
    [117.5, 74.1, Math.PI], // East Gallery Wall Doorway Station
    [155.5, 74.2, 0], // East Fork Switch Junction Station
    [175.2, 28.0, -Math.PI / 2], // Left Branch Mid-Way — Abyss Chasm Rail Bridge Overlook Station
    [175.2, -46.0, -Math.PI / 2], // Left Branch Terminus — Deep Glowing Diamond Mine Station
    [173.5, 117.8, 0], // Right Branch — Grand Dwarven Storage Warehouse Station
    [111.5, 113.9, 0], // Smelting Foundry Station
    [-55.5, 86.1, Math.PI], // West Cavern Sapphire & Tavern Station
  ];
  for (const [kx, kz, kyaw] of stationKiosks) {
    buildMinecartStationKiosk(kit, ctx, kx, kz, kyaw);
  }

  return { distributor, goldCascade };
}
// #endregion

// #region Track Floor And Rideable Carts
/** Summary: Floor under a track point; on the stepped ramp, the nose line of the steps. */
function trackFloorY(lx: number, lz: number): number {
  return sampleAncientMineFloor(lx, lz)?.height ?? U;
}

/**
 * Summary: Ephemeral player-rideable minecarts: hidden when not in use so no unused carts sit on
 *          the tracks blocking the AI dwarves' cooperative ore carts, and spawned immediately at
 *          the station when the player presses [E] to ride (disappearing again upon exit).
 */
function buildRideableCarts(kit: Kit, ctx: ISetPieceContext): (t: number) => void {
  const geometry = ctx.own(buildPropGeometry('oreCart', MINE_PALETTE.gold));
  const rigs = ALL_RIDEABLE_MINECART_LINES.map((line) => {
    const mesh = new THREE.Mesh(geometry, ctx.materials.statue);
    mesh.name = `ancient-mine-ride-${line.id}`;
    mesh.rotation.order = 'YXZ';
    mesh.userData.isAnimated = true;
    mesh.visible = false;
    kit.add(mesh);
    return { line, mesh };
  });
  return (): void => {
    const activeLineId = getActivePlayerRiddenMinecartLineId();
    for (const { line, mesh } of rigs) {
      const isRidden = activeLineId === line.id;
      mesh.visible = isRidden;
      if (isRidden) {
        const pose = evaluateRideableMinecartPose(line.id, getRideableMinecartVisualProgress(line.id).u);
        mesh.position.set(pose.x - ANCIENT_MINE_ORIGIN.x, pose.y, pose.z - ANCIENT_MINE_ORIGIN.z);
        mesh.rotation.y = pose.yaw;
        mesh.rotation.x = pose.pitch;
      }
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

  // Support posts under the upper half of the scaffolding stairs (lx: -22..-16, lz: 38..50), kept strictly below the stair treads
  for (const sx of [-21.2, -16.8]) {
    kit.box(0.34, h * 0.42, 0.34, m.wood, sx, U, 41.5);
  }
  ctx.addTorch(-22.6, U + 2.4, 49.5, 0xffa840, 6.0);
  ctx.addTorch(-15.4, U + 2.4, 49.5, 0xffa840, 6.0);
  ctx.addTorch(-27.0, S + 2.8, 26.8, 0xffb448, 6.5);

  // Master Blacksmith Stage & Runic Anvil Platform for Fili Anvilwright at (-28.0, 31.5, y = S)
  buildBlacksmithAnvilStage(kit, ctx, -28.0, S, 31.5);
}

/**
 * Summary: Builds the ornate octagonal stone-and-gold smithing stage (dais), glowing molten rune
 *          circle, corner anvil-guard posts, and molten quenching basin under a Blacksmith Dwarf's anvil.
 */
function buildBlacksmithAnvilStage(
  kit: Kit,
  ctx: ISetPieceContext,
  ax: number,
  ay: number,
  az: number
): void {
  const { m } = kit;
  const stage = new THREE.Group();
  stage.position.set(ax, ay, az);
  kit.add(stage);

  // Low-profile stepped octagonal obsidian & gold smithing stage (non-overlapping Y tiers)
  kit.cyl(1.65, 1.78, 0.06, m.darkStone, 0, 0.03, 0, 8, stage);
  kit.cyl(1.52, 1.56, 0.03, m.gold, 0, 0.075, 0, 8, stage);
  kit.cyl(1.36, 1.42, 0.05, m.stone, 0, 0.115, 0, 8, stage);

  // Glowing molten rune ring inlaid on top of the smithing stage around the anvil
  const runeRing = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(1.12, 0.04, 6, 24)), m.molten);
  runeRing.rotation.x = -Math.PI / 2;
  runeRing.position.set(0, 0.145, 0);
  stage.add(runeRing);

  // Octagonal molten quenching basin on the side flank of the anvil stage (clear of the smith's North/South standing spots)
  kit.cyl(0.42, 0.48, 0.48, m.darkStone, -1.05, 0.28, 0, 8, stage);
  kit.cyl(0.45, 0.45, 0.06, m.gold, -1.05, 0.52, 0, 8, stage);
  kit.cyl(0.36, 0.36, 0.05, m.molten, -1.05, 0.53, 0, 10, stage);

  // Pair of ornate golden anvil-guard posts on the East & West flanks of the stage
  for (const sideX of [-1.38, 1.38]) {
    kit.box(0.28, 0.78, 0.28, m.darkStone, sideX, 0.06, -0.45, stage);
    kit.box(0.34, 0.1, 0.34, m.gold, sideX, 0.84, -0.45, stage);
    kit.box(0.18, 0.16, 0.18, m.molten, sideX, 0.94, -0.45, stage);
  }
  ctx.addLight(ax, ay + 1.8, az, 0xff8c24, 6.5);
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

  // Warm tavern lighting mounted on the timber pavilion columns
  ctx.addTorch(-48.5, U + 3.2, 99.6, 0xffaa38, 7.5);
  ctx.addTorch(-36.0, U + 3.4, 99.6, 0xffb844, 8.0);
  ctx.addTorch(-23.5, U + 3.2, 99.6, 0xffaa38, 7.5);
  ctx.addTorch(-48.5, U + 3.2, 120.9, 0xffb844, 8.5);
  ctx.addTorch(-23.5, U + 3.2, 120.9, 0xff9e32, 7.5);
}
// #endregion

// #region Underground Dwarven Quarters (Full-Height Doorways, Hearth & 4 Z-Fighting-Free Sleeping Rooms)
/**
 * Summary: Builds the carved wall archway, central dormitory hearth chimney & runner carpet, and 4
 *          Underground Dwarven Stone Sleeping Rooms inside `dwarven-quarters-hall` (lx: -76..-42,
 *          lz: 131..158, y = U, ceilingY = -3.5) and `dwarven-quarters-entry` (lx: -63..-55, lz: 124..131).
 *          Every bed, wall, lintel, rug, and nightstand uses strictly disjoint bounds so there is zero Z-fighting.
 */
function buildUndergroundDwarvenQuarters(kit: Kit, ctx: ISetPieceContext): void {
  const { m } = kit;
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 });
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.88 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.82 });
  const rugCrimsonMat = new THREE.MeshStandardMaterial({ color: 0x6b1d1d, roughness: 0.92 });
  const rugBorderMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.86 });
  ctx.ownMaterial(blanketMat, mattressMat, pillowMat, rugCrimsonMat, rugBorderMat);

  // 1) OUTER ARCHWAY PORTAL FLUSH WITH THE SOUTH-WEST CAVERN WALL (lx = -59, lz = 128.0)
  //    The cavern wall runs along lz = 128.0 from lx = -65 to -53, with the 8m entry opening at lx = -63..-55.
  for (const dx of [-4.55, 4.55]) {
    const px = -59 + dx;
    // Stepped base plinth & golden collar
    kit.box(1.56, 0.64, 1.76, m.darkStone, px, U + 0.01, 128.0);
    kit.box(1.48, 0.16, 1.68, m.gold, px, U + 0.65, 128.0);
    // Main fluted stone jamb shaft
    kit.box(1.36, 3.64, 1.52, m.stone, px, U + 0.81, 128.0);
    kit.box(0.22, 3.2, 0.08, m.gold, px, U + 1.02, 127.19);
    // Capital collar & upper pillar shaft rising to the upper cavern ceiling
    kit.box(1.52, 0.2, 1.7, m.gold, px, U + 4.45, 128.0);
    kit.box(1.36, 6.5, 1.52, m.darkStone, px, U + 4.65, 128.0);
  }
  // Wing buttresses tying the portal jambs into the adjacent cavern rock wall (lx = -65..-63.5 and -54.5..-53)
  for (const wx of [-64.55, -53.45]) {
    kit.box(1.5, 11.14, 1.15, m.darkStone, wx, U + 0.01, 127.85);
    kit.box(1.58, 0.22, 1.24, m.gold, wx, U + 4.45, 127.85);
  }
  // Full-height stone & gold over-door lintel at lz = 128.0 reaching the cavern ceiling (`y = U + 4.45 .. U + 11.15`)
  kit.box(11.2, 0.24, 1.78, m.gold, -59, U + 4.45, 128.0);
  kit.box(10.9, 6.46, 1.62, m.darkStone, -59, U + 4.69, 128.0);
  kit.box(11.3, 0.22, 1.82, m.gold, -59, U + 6.35, 128.0);
  // Carved Royal Dwarven Quarters crest & shield plaque on the north facade of the portal lintel
  kit.box(2.8, 1.25, 0.1, m.stone, -59, U + 4.88, 127.14);
  kit.box(3.0, 0.14, 0.14, m.gold, -59, U + 4.74, 127.12);
  kit.box(3.0, 0.14, 0.14, m.gold, -59, U + 6.13, 127.12);
  kit.box(0.85, 0.85, 0.14, m.gold, -59, U + 5.08, 127.08);

  // Inner archway collar at lz = 130.8 entering the sleeping hall (`ceilingY = -3.5 -> U + 5.85`)
  for (const dx of [-4.5, 4.5]) {
    kit.box(1.1, 4.52, 1.1, m.darkStone, -59 + dx, U + 0.01, 130.8);
    kit.box(1.1, 1.08, 1.1, m.darkStone, -59 + dx, U + 4.73, 130.8);
  }
  kit.box(10.4, 0.2, 1.28, m.gold, -59, U + 4.53, 130.8);
  kit.box(10.2, 1.08, 1.18, m.darkStone, -59, U + 4.73, 130.8);
  ctx.addTorch(-63.4, U + 3.0, 126.9, 0xffa840, 6.5);
  ctx.addTorch(-54.6, U + 3.0, 126.9, 0xffa840, 6.5);

  // 2) CENTRAL DORMITORY CORRIDOR RUNNER CARPET, VAULTED CEILING RIBS, CHANDELIERS & GRAND HEARTH AT (-59.0, 156.2)
  //    Extended north to lz = 127.2 so the runner welcomes players right through the outer portal threshold!
  kit.box(3.5, 0.016, 26.8, rugBorderMat, -59.0, U + 0.012, 140.6);
  kit.box(2.96, 0.018, 26.2, rugCrimsonMat, -59.0, U + 0.028, 140.6);

  // Vaulted stone & gold ceiling ribs across the central corridor (strictly below ceilingY = U + 5.85)
  for (const ribZ of [134.2, 141.0, 147.8, 153.8]) {
    kit.box(7.8, 0.42, 0.68, m.darkStone, -59.0, U + 5.39, ribZ);
    kit.box(7.86, 0.16, 0.78, m.gold, -59.0, U + 5.23, ribZ);
  }

  // Helper for warm Dwarven ceiling lantern chandeliers (strictly below U + 5.81)
  const addQuartersChandelier = (cx: number, cz: number, ringR: number): void => {
    const ch = new THREE.Group();
    ch.position.set(cx, U, cz);
    kit.add(ch);
    kit.cyl(0.06, 0.06, 0.95, m.iron, 0, 5.28, 0, 8, ch);
    kit.cyl(ringR, ringR, 0.12, m.gold, 0, 4.76, 0, 12, ch);
    kit.cyl(ringR * 0.86, ringR * 0.86, 0.14, m.darkStone, 0, 4.76, 0, 12, ch);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const lx = Math.cos(a) * (ringR - 0.08);
      const lz = Math.sin(a) * (ringR - 0.08);
      kit.cyl(0.09, 0.09, 0.22, m.ember, lx, 4.93, lz, 8, ch);
    }
  };
  addQuartersChandelier(-59.0, 137.5, 0.95);
  addQuartersChandelier(-59.0, 149.5, 0.95);

  // Royal Dwarven wall banners & pilasters along the central corridor
  for (const bz of [133.2, 144.25, 154.8]) {
    for (const side of [-1, 1] as const) {
      const wallX = side === -1 ? -62.66 : -55.34;
      kit.box(0.14, 5.4, 0.52, m.darkStone, wallX, U + 0.01, bz);
      kit.box(0.18, 0.16, 0.6, m.gold, wallX, U + 3.85, bz);
      kit.box(0.06, 2.1, 0.44, rugCrimsonMat, wallX - side * 0.09, U + 1.65, bz);
      kit.box(0.07, 0.12, 0.48, m.gold, wallX - side * 0.09, U + 1.53, bz);
    }
  }

  // Chimney flue & brass crest above the dormitory fireplace (`y = U + 3.21 .. U + 5.83`)
  kit.box(3.6, 2.62, 1.75, m.darkStone, -59.0, U + 3.21, 156.25);
  kit.box(3.8, 0.18, 1.88, m.gold, -59.0, U + 3.21, 156.25);
  kit.box(3.8, 0.18, 1.88, m.gold, -59.0, U + 5.65, 156.25);
  kit.box(1.4, 1.1, 0.08, m.gold, -59.0, U + 3.95, 155.32);
  // Stacked firewood log rack beside the dormitory hearth (`lx = -61.8, lz = 156.0`)
  kit.box(1.1, 0.12, 0.75, m.iron, -61.8, U + 0.01, 156.0);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3 - (row % 2); col++) {
      const log = kit.cyl(0.11, 0.11, 0.68, m.wood, -62.05 + col * 0.24 + (row % 2) * 0.12, U + 0.24 + row * 0.2, 156.0, 8);
      log.rotation.x = Math.PI / 2;
    }
  }
  ctx.addTorch(-62.2, U + 3.1, 154.6, 0xff9a30, 6.5);
  ctx.addTorch(-55.8, U + 3.1, 154.6, 0xff9a30, 6.5);

  // 3) Z-FIGHTING-FREE DWARVEN BED BUILDER + BEDSIDE NIGHTSTAND + FOOTLOCKER
  const addDwarvenBed = (bx: number, bz: number, yaw: number): void => {
    const bed = new THREE.Group();
    bed.position.set(bx, U, bz);
    bed.rotation.y = yaw;
    kit.add(bed);

    // 4 sturdy corner posts (y: 0.01 .. 0.68) with gold caps (y: 0.68 .. 0.74), outside the frame (z = +/-1.04)
    for (const px of [-0.7, 0.7]) {
      for (const pz of [-1.04, 1.04]) {
        kit.box(0.16, 0.67, 0.16, m.wood, px, 0.01, pz, bed);
        kit.box(0.19, 0.06, 0.19, m.gold, px, 0.68, pz, bed);
      }
    }
    // Wooden bed frame strictly between the front & back posts (z: -0.95 .. +0.95, y: 0.12 .. 0.36)
    kit.box(1.48, 0.24, 1.9, m.wood, 0, 0.12, 0, bed);
    // Carved headboard at +Z strictly above the frame (y: 0.36 .. 0.82) with gold crest bar (y: 0.82 .. 0.88)
    kit.box(1.24, 0.46, 0.12, m.wood, 0, 0.36, 1.04, bed);
    kit.box(1.3, 0.06, 0.15, m.gold, 0, 0.82, 1.04, bed);
    // Mattress strictly above the wooden frame (y: 0.362 .. 0.522)
    kit.box(1.36, 0.16, 1.88, mattressMat, 0, 0.362, -0.02, bed);
    // Warm crimson blanket strictly above the mattress on the south two-thirds (z: -0.95 .. +0.29, y: 0.524 .. 0.574)
    kit.box(1.38, 0.05, 1.24, blanketMat, 0, 0.524, -0.33, bed);
    // Pillow strictly above the mattress on the north head end (z: +0.46 .. +0.86, y: 0.524 .. 0.624 — disjoint in Z from blanket!)
    kit.box(0.92, 0.1, 0.4, pillowMat, 0, 0.524, 0.66, bed);
  };

  const addBedsideNightstand = (nx: number, nz: number): void => {
    const stand = new THREE.Group();
    stand.position.set(nx, U, nz);
    kit.add(stand);
    kit.box(0.56, 0.58, 0.56, m.wood, 0, 0.01, 0, stand);
    kit.box(0.62, 0.05, 0.62, m.gold, 0, 0.59, 0, stand);
    kit.cyl(0.09, 0.11, 0.05, m.iron, 0, 0.665, 0, 8, stand);
    kit.cyl(0.07, 0.07, 0.16, m.ember, 0, 0.77, 0, 8, stand);
    kit.cyl(0.1, 0.08, 0.05, m.gold, 0, 0.875, 0, 8, stand);
  };

  const addDwarvenFootlocker = (fx: number, fz: number): void => {
    const chest = new THREE.Group();
    chest.position.set(fx, U, fz);
    kit.add(chest);
    kit.box(0.52, 0.38, 0.88, m.wood, 0, 0.01, 0, chest);
    kit.box(0.55, 0.05, 0.92, m.gold, 0, 0.39, 0, chest);
    kit.box(0.56, 0.12, 0.14, m.gold, 0, 0.28, 0, chest);
  };

  // 4) 4 UNDERGROUND DWARVEN STONE SLEEPING ROOMS (lz = 131..158, ceilingY = -3.5 -> U + 5.85)
  const roomH = 5.82; // Top at U + 5.83, strictly below ceilingY = U + 5.85 so walls never Z-fight with the ceiling!
  const rooms = [
    { cx: -69.2, cz: 137.5, side: -1, beds: [[-73.5, 134.5], [-73.5, 140.5], [-66.0, 134.5], [-66.0, 140.5]] as const },
    { cx: -48.8, cz: 137.5, side: 1, beds: [[-52.0, 134.5], [-52.0, 140.5], [-44.5, 134.5], [-44.5, 140.5]] as const },
    { cx: -69.2, cz: 151.0, side: -1, beds: [[-73.5, 148.0], [-73.5, 154.0], [-66.0, 148.0]] as const },
    { cx: -48.8, cz: 151.0, side: 1, beds: [[-52.0, 148.0], [-52.0, 154.0], [-44.5, 148.0]] as const },
  ] as const;

  // Single partition wall between North and South rooms on the West (`cx = -69.5`) and East (`cx = -48.5`) sides
  // (`w = 12.2` leaves a 0.12m gap from the corridor walls at `-63.0` / `-55.0` so corner faces never overlap!)
  kit.box(12.2, roomH, 0.56, m.darkStone, -69.5, U + 0.01, 144.25);
  kit.box(12.2, roomH, 0.56, m.darkStone, -48.5, U + 0.01, 144.25);

  for (const r of rooms) {
    const doorwayX = r.side === -1 ? -63.0 : -55.0;
    // Front wall jambs flanking the 3.6m doorway (`r.cz - 1.8 .. r.cz + 1.8`), matching `quarters-wall-*` colliders
    kit.box(0.55, roomH, 4.6, m.stone, doorwayX, U + 0.01, r.cz - 4.2);
    kit.box(0.55, roomH, 4.6, m.stone, doorwayX, U + 0.01, r.cz + 4.2);
    // Carved doorway jamb trim & capital collars
    for (const dz of [-1.85, 1.85]) {
      kit.box(0.66, 3.44, 0.18, m.darkStone, doorwayX, U + 0.01, r.cz + dz);
      kit.box(0.7, 0.14, 0.24, m.gold, doorwayX, U + 1.75, r.cz + dz);
    }
    // Over-door lintel strictly spanning the 3.6m gap between the jambs (`z: r.cz - 1.89 .. r.cz + 1.89`)
    kit.box(0.68, 0.22, 3.78, m.gold, doorwayX, U + 3.45, r.cz);
    kit.box(0.62, roomH - 3.66, 3.78, m.darkStone, doorwayX, U + 3.67, r.cz);
    kit.box(0.7, 0.16, 3.84, m.gold, doorwayX, U + 4.85, r.cz);
    // Golden clan shield boss above the bedroom doorway
    kit.box(0.12, 0.58, 0.58, m.gold, doorwayX - r.side * 0.34, U + 4.02, r.cz);

    // Outer bedroom wall golden wainscoting rail (strictly inside lx = -76..-42)
    const outerWallX = r.side === -1 ? -75.78 : -42.22;
    kit.box(0.14, 0.18, 12.2, m.gold, outerWallX, U + 1.35, r.cz);

    // Woven bedroom rug under the central table (`y = U + 0.012 .. U + 0.044`)
    kit.box(4.1, 0.016, 3.7, rugBorderMat, r.cx, U + 0.012, r.cz);
    kit.box(3.55, 0.016, 3.15, rugCrimsonMat, r.cx, U + 0.028, r.cz);

    // Warm dwarven table & benches in the middle of each room (starting at U + 0.045 above the rug)
    kit.box(2.0, 0.74, 0.95, m.wood, r.cx, U + 0.045, r.cz);
    kit.box(2.08, 0.05, 1.02, m.gold, r.cx, U + 0.785, r.cz);
    kit.box(1.8, 0.42, 0.38, m.wood, r.cx, U + 0.045, r.cz - 0.82);
    kit.box(1.8, 0.42, 0.38, m.wood, r.cx, U + 0.045, r.cz + 0.82);
    // Golden goblets & center platter on the bedroom table (`y = U + 0.835..0.98`)
    kit.cyl(0.24, 0.18, 0.04, m.gold, r.cx, U + 0.855, r.cz, 10);
    kit.cyl(0.07, 0.06, 0.14, m.gold, r.cx - 0.55, U + 0.905, r.cz - 0.2, 8);
    kit.cyl(0.07, 0.06, 0.14, m.gold, r.cx + 0.55, U + 0.905, r.cz + 0.2, 8);

    // Warm golden ceiling chandelier over each bedroom table
    addQuartersChandelier(r.cx, r.cz, 0.72);
    ctx.addTorch(doorwayX - r.side * 0.6, U + 2.8, r.cz - 2.2, 0xff9d3a, 5.5);

    for (const [bx, bz] of r.beds) {
      addDwarvenBed(bx, bz, 0);
    }
    // Bedside nightstand with lantern + brass-bound footlocker against the outer bedroom wall
    addBedsideNightstand(r.side === -1 ? -74.6 : -43.4, r.cz);
    addDwarvenFootlocker(r.side === -1 ? -74.6 : -43.4, r.cz - 1.35);
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
  const curbNorthStartZ = 97.6; // Starts cleanly south of the lagoon mouth so no curb blocks the water channel entry
  // Low curbs along the channel banks, open where the bridge crosses (disjoint from bridge parapets).
  for (const x of [ch.minLx - 0.28, ch.maxLx + 0.28]) {
    for (const [z0, z1] of [[curbNorthStartZ, bridge.minLz - 0.05], [bridge.maxLz + 0.05, ch.maxLz]] as const) {
      kit.box(0.5, 0.35, z1 - z0, m.darkStone, x, U + 0.01, (z0 + z1) / 2);
    }
  }
  // Arched stone & timber bridge across the water channel (`lz = 106..110`), offset from `y = U` so it never Z-fights with the greybox floor!
  const bridgeCx = (ch.minLx + ch.maxLx) / 2;
  // Sub-deck stone arch support strictly below y = U - 0.04
  kit.box(8.0, 0.36, 3.92, m.stone, bridgeCx, U - 0.4, 108);
  // Raised stone bridge deck crown (`y = U + 0.012 .. U + 0.068`) & transverse oak deck planks (`y = U + 0.07 .. U + 0.098`)
  kit.box(8.0, 0.056, 3.96, m.darkStone, bridgeCx, U + 0.012, 108);
  for (let px = -3.5; px <= 3.5; px += 0.7) {
    kit.box(0.54, 0.028, 3.24, m.wood, bridgeCx + px, U + 0.07, 108);
  }
  // Parapets with gold cap rails along north & south bridge edges (`y = U + 0.07 .. U + 0.72`)
  for (const z of [bridge.minLz + 0.2, bridge.maxLz - 0.2]) {
    kit.box(8.0, 0.56, 0.35, m.stone, bridgeCx, U + 0.07, z);
    kit.box(8.12, 0.08, 0.42, m.gold, bridgeCx, U + 0.63, z);
  }
  const arch = kit.cyl(2.0, 2.0, 3.6, m.stone, bridgeCx, U - 0.9, 108, 16);
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

  // The lagoon's koi are real wildlife (see koiPonds.ts: MINE_LAGOON_POND); only the sparkles are animated here.

  const updateLagoonLife = (t: number): void => {
    for (let i = 0; i < sparkles.length; i++) {
      const s = sparkles[i];
      const pulse = 0.65 + 0.45 * Math.sin(t * 3.2 + s.phase);
      s.mesh.position.y = s.baseY + Math.sin(t * 1.8 + s.phase) * 0.14;
      s.mesh.rotation.y = t * 1.5 + s.phase;
      s.mesh.scale.setScalar(pulse);
    }
  };

  return { wheel, gear, stamps, updateLagoonLife };
}
// #endregion

// #region Galleries
/** Summary: Stone crusher with pistons and gear, ore lift over the pit, tunnel mouths with full-height headers, wall scaffolds. */
function buildGalleries(
  kit: Kit,
  ctx: ISetPieceContext
): {
  crusherGear: THREE.Mesh;
  pistons: THREE.Group[];
  bucket: THREE.Group;
  hoistChain: THREE.Group;
  pulleyWheel: THREE.Mesh;
  pulleyY: number;
  switchLeverArm: THREE.Group;
  switchIndicatorMat: THREE.MeshBasicMaterial;
} {
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

  // Ore lift: timber frame between the two posts, braced jib out over the pit (lx = 74.5, lz = 57),
  // overhead pulley & winch drum, dynamic scaling hoist chain anchored to the pulley, and pit floor landing cradle!
  const pw = fixture('ore-lift-post-west');
  const pe = fixture('ore-lift-post-east');
  kit.box(pw.halfX * 2, pw.height, pw.halfZ * 2, m.wood, pw.lx, U, pw.lz);
  kit.box(pe.halfX * 2, pe.height, pw.halfZ * 2, m.wood, pe.lx, U, pe.lz);
  kit.box(pe.lx - pw.lx + 0.8, 0.5, 0.5, m.wood, (pw.lx + pe.lx) / 2, U + pw.height - 0.5, pw.lz);
  const liftX = 74.5;
  const liftZ = 57;
  const jibY = U + pw.height - 0.25;
  kit.beam(new THREE.Vector3(liftX, jibY, pw.lz), new THREE.Vector3(liftX, jibY, liftZ + 0.6), 0.42, m.wood);
  // Diagonal timber & iron knee-braces supporting the cantilevered jib over the pit
  kit.beam(new THREE.Vector3(pe.lx, U + pw.height - 2.6, pe.lz), new THREE.Vector3(liftX, jibY - 0.1, liftZ - 2.2), 0.26, m.wood);
  kit.beam(new THREE.Vector3(liftX, U + pw.height - 0.1, pw.lz), new THREE.Vector3(liftX, jibY + 0.15, liftZ), 0.14, m.iron);
  // Winch drum & gear at the base of the east post + vertical hoist chain up to the jib
  const winchDrum = kit.cyl(0.42, 0.42, 0.9, m.iron, liftX, U + 1.35, pw.lz + 0.55, 12);
  winchDrum.rotation.z = Math.PI / 2;
  const winchGear = kit.cyl(0.62, 0.62, 0.16, m.gold, liftX + 0.52, U + 1.35, pw.lz + 0.55, 14);
  winchGear.rotation.z = Math.PI / 2;
  kit.chain(liftX, pw.lz + 0.55, jibY - 0.2, U + 1.5);

  // Overhead pulley hanger bracket & rotating pulley wheel at (liftX, pulleyY, liftZ)
  const pulleyY = U + pw.height - 0.75;
  kit.box(0.52, 0.55, 0.52, m.iron, liftX, jibY - 0.68, liftZ);
  kit.box(0.58, 0.12, 0.58, m.gold, liftX, jibY - 0.2, liftZ);
  const pulleyWheel = kit.cyl(0.52, 0.52, 0.22, m.gold, liftX, pulleyY, liftZ, 16);
  pulleyWheel.rotation.z = Math.PI / 2;
  pulleyWheel.userData.isAnimated = true;

  // Pit floor timber & iron landing cradle directly under the bucket at (liftX, MINE_LEVEL_Y.galleryPit, liftZ)
  const pitY = MINE_LEVEL_Y.galleryPit;
  kit.box(2.1, 0.16, 2.1, m.darkStone, liftX, pitY + 0.01, liftZ);
  kit.box(1.75, 0.08, 1.75, m.wood, liftX, pitY + 0.17, liftZ);
  for (const side of [-0.72, 0.72] as const) {
    kit.box(1.82, 0.14, 0.16, m.iron, liftX, pitY + 0.18, liftZ + side);
    kit.box(0.16, 0.14, 1.5, m.iron, liftX + side, pitY + 0.18, liftZ);
  }

  // Dynamic hoist chain anchored at (liftX, pulleyY, liftZ) extending downward in -Y (unit length = 1.0m, scaled per frame)
  const hoistChain = new THREE.Group();
  hoistChain.position.set(liftX, pulleyY, liftZ);
  hoistChain.userData.isAnimated = true;
  kit.add(hoistChain);
  kit.cyl(0.058, 0.058, 1.0, m.iron, 0, -0.5, 0, 8, hoistChain);
  for (let i = 0; i < 8; i++) {
    const ring = new THREE.Mesh(ctx.own(new THREE.TorusGeometry(0.105, 0.03, 5, 10)), m.gold);
    ring.position.set(0, -(i + 0.5) / 8, 0);
    ring.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
    hoistChain.add(ring);
  }

  // Ore bucket assembly (origin y = 0 is the bottom of the bucket; top swivel ring is at y = 1.45)
  const bucket = new THREE.Group();
  bucket.position.set(liftX, pitY + 0.22, liftZ);
  bucket.userData.isAnimated = true;
  kit.add(bucket);
  kit.cyl(0.72, 0.56, 1.04, m.iron, 0, 0.52, 0, 12, bucket);
  kit.cyl(0.75, 0.75, 0.1, m.gold, 0, 0.92, 0, 12, bucket);
  kit.cyl(0.61, 0.61, 0.09, m.gold, 0, 0.14, 0, 12, bucket);
  // Gleaming gold/iron ore mound inside the bucket
  kit.cyl(0.62, 0.66, 0.14, m.darkStone, 0, 0.98, 0, 10, bucket);
  const bucketOre = new THREE.Mesh(ctx.own(new THREE.DodecahedronGeometry(0.38, 0)), m.gold);
  bucketOre.scale.set(1.25, 0.65, 1.25);
  bucketOre.position.set(0, 1.08, 0);
  bucket.add(bucketOre);
  // Heavy iron lifting bail & top swivel hook at y = 1.45
  for (const sx of [-0.66, 0.66] as const) {
    kit.box(0.07, 0.44, 0.09, m.iron, sx, 0.96, 0, bucket);
  }
  kit.box(1.4, 0.08, 0.1, m.iron, 0, 1.36, 0, bucket);
  kit.cyl(0.14, 0.14, 0.18, m.gold, 0, 1.45, 0, 10, bucket);

  // North wall mine adit mouth at [86, 25.3, 0].
  {
    const [x, z, yaw] = [86, 25.3, 0] as const;
    const mouth = new THREE.Group();
    mouth.position.set(x, U, z);
    mouth.rotation.y = yaw;
    kit.add(mouth);
    kit.box(3.2, 3.8, 0.2, m.void, 0, 0, 0, mouth);
    kit.box(0.5, 7.4, 0.5, m.wood, -1.85, 0, 0.1, mouth);
    kit.box(0.5, 7.4, 0.5, m.wood, 1.85, 0, 0.1, mouth);
    kit.box(4.3, 0.48, 0.55, m.wood, 0, 3.8, 0.1, mouth);
    kit.box(4.2, 3.2, 0.45, m.darkStone, 0, 4.25, 0.08, mouth);
    kit.box(4.3, 0.18, 0.58, m.gold, 0, 4.22, 0.1, mouth);
    for (const dx of [-0.75, 0.75]) kit.box(0.1, 0.1, 3, m.iron, dx, 0.05, 1.4, mouth);
    ctx.addTorch(x + 2.4, U + 2.6, z + 0.6);
  }

  // OPENED EAST WALL RAIL PORTAL AT [121.3, 72] (leading into the Descending Forking Track & 2 New Rooms!)
  {
    const portalX = 120.2;
    const portalZ = 72.0;
    // Heavy carved stone & gold jambs flanking the 8m wide open tunnel mouth (lz = 68..76)
    for (const sideZ of [67.5, 76.5]) {
      kit.box(1.4, 7.5, 1.2, m.darkStone, portalX, U, sideZ);
      kit.box(1.55, 0.32, 1.35, m.gold, portalX, U + 4.3, sideZ);
    }
    // Overhead carved lintel & raised open iron portcullis gate (visibly lifted above the track at y = U + 4.2..5.4!)
    kit.box(1.5, 3.1, 10.2, m.darkStone, portalX, U + 4.45, portalZ);
    kit.box(1.65, 0.24, 10.4, m.gold, portalX, U + 4.35, portalZ);
    // Raised iron portcullis teeth & horizontal bars hanging at the top of the open doorway
    kit.box(0.22, 0.18, 7.6, m.iron, portalX - 0.3, U + 3.95, portalZ);
    kit.box(0.22, 0.18, 7.6, m.iron, portalX - 0.3, U + 4.3, portalZ);
    for (let bz = -3.2; bz <= 3.2; bz += 0.8) {
      kit.box(0.14, 0.65, 0.12, m.iron, portalX - 0.3, U + 3.75, portalZ + bz);
    }
    ctx.addTorch(portalX - 0.85, U + 3.2, 67.6, 0xffb844, 7.5);
    ctx.addTorch(portalX - 0.85, U + 3.2, 76.4, 0xffb844, 7.5);
  }

  // DESCENDING TUNNEL TIMBER SHORING ARCHES (lx = 126..150, lz = 68..76, descending from U = -9.35 to FJ = -17.35)
  const FJ = MINE_LEVEL_Y.forkJunction; // -17.35
  for (const archX of [127, 134, 141, 148]) {
    const fY = trackFloorY(archX, 72);
    for (const sideZ of [68.35, 75.65]) {
      kit.box(0.45, 5.2, 0.45, m.wood, archX, fY, sideZ);
      kit.box(0.52, 0.2, 0.52, m.iron, archX, fY, sideZ);
    }
    kit.box(0.48, 0.45, 7.8, m.wood, archX, fY + 5.1, 72.0);
    if (archX === 134 || archX === 148) {
      ctx.addTorch(archX, fY + 3.2, 68.75, 0xffa838, 6.5);
      ctx.addTorch(archX, fY + 3.2, 75.25, 0xffa838, 6.5);
    }
  }

  // INTERACTIVE PHYSICAL TRACK-SWITCH LEVER STAND AT THE FORK JUNCTION (lx = 153.8, y = -17.35, lz = 68.8)
  const leverStand = new THREE.Group();
  leverStand.position.set(
    EAST_FORK_SWITCH_LEVER_LOCAL.lx,
    EAST_FORK_SWITCH_LEVER_LOCAL.y,
    EAST_FORK_SWITCH_LEVER_LOCAL.lz
  );
  kit.add(leverStand);
  kit.box(1.15, 0.28, 1.15, m.darkStone, 0, 0, 0, leverStand);
  kit.box(0.96, 0.1, 0.96, m.gold, 0, 0.28, 0, leverStand);
  // Twin iron quadrant plates
  kit.box(0.82, 0.52, 0.1, m.iron, 0, 0.38, -0.18, leverStand);
  kit.box(0.82, 0.52, 0.1, m.iron, 0, 0.38, 0.18, leverStand);
  kit.box(0.88, 0.08, 0.46, m.gold, 0, 0.84, 0, leverStand);
  // Tie-rod connecting the switch lever stand to the track turnout points at (156, 72)
  kit.box(0.14, 0.06, 3.1, m.iron, 0.4, 0.06, 1.6, leverStand);

  const switchLeverArm = new THREE.Group();
  switchLeverArm.position.set(0, 0.55, 0);
  switchLeverArm.rotation.z = -0.46;
  switchLeverArm.userData.isAnimated = true;
  leverStand.add(switchLeverArm);
  kit.cyl(0.055, 0.065, 1.35, m.iron, 0, 0.65, 0, 8, switchLeverArm);
  kit.cyl(0.14, 0.14, 0.22, m.gold, 0, 1.35, 0, 10, switchLeverArm);

  const switchIndicatorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  ctx.ownMaterial(switchIndicatorMat);
  const indicatorOrb = new THREE.Mesh(
    ctx.own(new THREE.OctahedronGeometry(0.22, 0)),
    switchIndicatorMat
  );
  indicatorOrb.position.set(0, 1.65, 0);
  switchLeverArm.add(indicatorOrb);
  ctx.addTorch(EAST_FORK_SWITCH_LEVER_LOCAL.lx, FJ + 2.4, EAST_FORK_SWITCH_LEVER_LOCAL.lz - 0.6, 0xffc84a, 7.5);

  // Directional carved signboards at the Fork Junction showing Left (Mithril Cavern) vs Right (Hall of Mazarbul)
  const signPost = new THREE.Group();
  signPost.position.set(161.5, FJ, 72.0);
  kit.add(signPost);
  kit.box(0.75, 0.35, 0.75, m.darkStone, 0, 0, 0, signPost);
  kit.box(0.32, 3.8, 0.32, m.wood, 0, 0.35, 0, signPost);
  kit.box(0.42, 0.22, 0.42, m.gold, 0, 4.05, 0, signPost);
  // Left arrow board (pointing North to Mithril Cavern) & Right arrow board (pointing South to Hall of Mazarbul)
  kit.box(0.18, 0.48, 2.2, m.wood, -0.2, 3.25, -1.0, signPost);
  kit.box(0.22, 0.12, 2.25, m.gold, -0.2, 3.68, -1.0, signPost);
  kit.box(0.18, 0.48, 2.2, m.wood, -0.2, 2.55, 1.0, signPost);
  kit.box(0.22, 0.12, 2.25, m.gold, -0.2, 2.98, 1.0, signPost);
  ctx.addTorch(160.8, FJ + 3.4, 72.0, 0xffb844, 7.5);

  // ===========================================================================
  // LEFT BRANCH: 1ST SMALL TUNNEL -> ABYSS CHASM RAIL BRIDGE -> 2ND SMALL TUNNEL -> GLOWING DIAMOND MINE
  // ===========================================================================
  const DM = MINE_LEVEL_Y.diamondMine; // -27.35
  const ABYSS_Y = MINE_LEVEL_Y.abyssBottom; // -130.0
  const diamondGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf0f9ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.65,
    roughness: 0.08,
    metalness: 0.25,
  });
  const pureWhiteDiamondMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xbae6fd,
    emissiveIntensity: 1.85,
    roughness: 0.05,
    metalness: 0.2,
  });
  ctx.ownMaterial(diamondGlowMat, pureWhiteDiamondMat);

  // 1) 1ST SMALL TUNNEL (`mithril-cavern-neck`, lx: 169..177, lz: 48..62, y = -17.35, ceilingY = -11.5)
  for (const nz of [50, 55, 60]) {
    for (const nx of [169.45, 176.55]) {
      kit.box(0.42, 5.28, 0.42, m.wood, nx, FJ + 0.015, nz);
    }
    kit.box(7.55, 0.44, 0.48, m.wood, 173.0, FJ + 5.298, nz);
  }
  // Portal lintel at lz = 48.2 where the 1st small tunnel opens into the Vast Abyss Chasm Cavern (strictly inside 8m width)
  kit.box(7.85, 0.45, 0.9, m.gold, 173.0, FJ + 5.3, 48.2);
  ctx.addTorch(169.8, FJ + 3.0, 49.2, 0xffb844, 7.0);
  ctx.addTorch(176.2, FJ + 3.0, 49.2, 0xffb844, 7.0);

  // 2) VAST ABYSS CHASM CAVERN & RAIL BRIDGE (`diamond-chasm-bridge`, lx: 169..177, lz: 8..48, y = -17.35)
  // Colossal stone & gold bridge piers rising from the deep abyss (-130m) up to 0.14m below the bridge deck (-17.35m) so pier tops never Z-fight with the bridge floor!
  const pierHeight = FJ - ABYSS_Y - 0.14;
  for (const pz of [16.0, 28.0, 40.0]) {
    kit.box(6.4, pierHeight, 3.6, m.darkStone, 173.0, ABYSS_Y, pz);
    kit.box(7.0, 0.6, 4.2, m.gold, 173.0, FJ - 2.2, pz);
    kit.box(7.0, 0.5, 4.2, m.gold, 173.0, FJ - 14.0, pz);
    // Ornate golden braziers mounted cleanly on top of the bridge guard rails (`lx = 169.0, 177.0`, `y = FJ + 1.25`)
    for (const sideX of [169.0, 177.0]) {
      kit.box(0.62, 0.36, 0.62, m.darkStone, sideX, FJ + 1.245, pz);
      kit.box(0.7, 0.14, 0.7, m.gold, sideX, FJ + 1.608, pz);
      const flame = new THREE.Mesh(ctx.own(new THREE.SphereGeometry(0.25, 8, 6)), m.ember);
      flame.position.set(sideX, FJ + 1.92, pz);
      kit.add(flame);
    }
  }
  // Golden cap rails sitting cleanly on top of the greybox bridge guard-rails (`lx = 169.0` and `lx = 177.0`, `y = FJ + 1.102`, `lz = 8.4..47.6`)
  for (const sideX of [169.0, 177.0]) {
    kit.box(0.46, 0.14, 39.2, m.gold, sideX, FJ + 1.102, 28.0);
  }
  // Dramatic glowing diamond/crystal formations clinging to the West (`lx = 147`) and East (`lx = 199`) chasm cliff walls
  const chasmCrystalGeo = ctx.own(new THREE.ConeGeometry(0.9, 4.2, 6));
  for (const cz of [16.0, 28.0, 40.0]) {
    for (const [wx, rotZ] of [
      [147.2, -0.55],
      [198.8, 0.55],
    ] as const) {
      const cliffCluster = new THREE.Mesh(chasmCrystalGeo, diamondGlowMat);
      cliffCluster.position.set(wx, FJ - 4.0, cz);
      cliffCluster.rotation.z = rotZ;
      kit.add(cliffCluster);
    }
  }
  ctx.addLight(173.0, FJ + 3.5, 28.0, 0xffc864, 8.5);
  ctx.addLight(155.0, FJ - 6.0, 28.0, 0x38bdf8, 7.5);
  ctx.addLight(191.0, FJ - 6.0, 28.0, 0x38bdf8, 7.5);

  // 3) 2ND SMALL DESCENDING TUNNEL (`diamond-mine-tunnel`, lx: 169..177, lz: -24..8, y: -17.35 -> -27.35)
  // Portal lintel at lz = 7.8 where the chasm bridge re-enters the narrow descending rock tunnel
  kit.box(7.85, 0.45, 0.9, m.gold, 173.0, FJ + 5.3, 7.8);
  for (const tz of [4.0, -4.0, -12.0, -20.0]) {
    const ty = trackFloorY(173.0, tz);
    for (const tx of [169.45, 176.55]) {
      kit.box(0.42, 5.1, 0.42, m.wood, tx, ty + 0.015, tz);
    }
    kit.box(7.55, 0.44, 0.48, m.wood, 173.0, ty + 5.118, tz);
    if (tz === 4.0 || tz === -12.0) {
      ctx.addTorch(169.85, ty + 3.0, tz, 0xffa838, 6.5);
      ctx.addTorch(176.15, ty + 3.0, tz, 0xffa838, 6.5);
    }
  }

  // 4) DEEP GLOWING DIAMOND MINE CAVERN (`diamond-mine-hall`, lx: 146..200, lz: -66..-24, y = -27.35, ceilingY = -12.0)
  const diamondOctGeo = ctx.own(new THREE.OctahedronGeometry(1.15, 0));
  const diamondSpireGeo = ctx.own(new THREE.ConeGeometry(0.85, 3.8, 6));

  // Helper to embed a radiant multi-crystal glowing diamond cluster into a rock wall
  const buildGlowingWallDiamondCluster = (
    wx: number,
    wy: number,
    wz: number,
    nx: number,
    nz: number,
    scale = 1.0
  ): void => {
    const cluster = new THREE.Group();
    cluster.position.set(wx, wy, wz);
    cluster.rotation.y = Math.atan2(nx, nz);
    kit.add(cluster);

    // Dark mineral seam bed on the rock wall
    kit.box(2.6 * scale, 2.2 * scale, 0.45, m.darkStone, 0, -1.1 * scale, 0, cluster);
    // Main faceted diamond octahedrons & radiant crystal prisms jutting out of the rock wall
    for (const [ox, oy, oz, rx, ry, sc, useWhite] of [
      [0, 0, 0.35, 0.35, 0.4, 1.25 * scale, true],
      [-0.75 * scale, 0.35 * scale, 0.28, 0.5, -0.3, 0.9 * scale, false],
      [0.78 * scale, -0.25 * scale, 0.28, -0.4, 0.5, 0.95 * scale, false],
      [-0.4 * scale, -0.55 * scale, 0.25, 0.25, 0.8, 0.75 * scale, true],
      [0.45 * scale, 0.58 * scale, 0.25, -0.35, -0.6, 0.8 * scale, true],
    ] as const) {
      const gem = new THREE.Mesh(diamondOctGeo, useWhite ? pureWhiteDiamondMat : diamondGlowMat);
      gem.scale.set(sc * 0.85, sc * 1.35, sc * 0.85);
      gem.position.set(ox, oy, oz);
      gem.rotation.set(rx, ry, 0.2);
      cluster.add(gem);
    }
    const prism = new THREE.Mesh(diamondSpireGeo, pureWhiteDiamondMat);
    prism.scale.setScalar(0.85 * scale);
    prism.position.set(0, 0.15 * scale, 0.85 * scale);
    prism.rotation.x = Math.PI * 0.38;
    cluster.add(prism);
  };

  // Embed glowing diamond formations across ALL walls of the Deep Diamond Mine:
  // West Wall (`lx = 146.4`, facing East `nx = 1, nz = 0`)
  for (const [wz, wy, sc] of [
    [-30.0, DM + 3.2, 1.15],
    [-38.0, DM + 5.8, 1.35],
    [-46.0, DM + 3.5, 1.25],
    [-54.0, DM + 6.2, 1.4],
    [-61.0, DM + 3.8, 1.2],
  ] as const) {
    buildGlowingWallDiamondCluster(146.4, wy, wz, 1, 0, sc);
  }
  // East Wall (`lx = 199.6`, facing West `nx = -1, nz = 0`)
  for (const [wz, wy, sc] of [
    [-30.0, DM + 3.6, 1.2],
    [-38.0, DM + 6.0, 1.4],
    [-46.0, DM + 3.4, 1.3],
    [-54.0, DM + 5.8, 1.35],
    [-61.0, DM + 3.8, 1.25],
  ] as const) {
    buildGlowingWallDiamondCluster(199.6, wy, wz, -1, 0, sc);
  }
  // North Wall (`lz = -65.6`, facing South `nx = 0, nz = 1`)
  for (const [wx, wy, sc] of [
    [153.0, DM + 4.0, 1.3],
    [162.0, DM + 6.4, 1.45],
    [173.0, DM + 5.2, 1.75], // Center Motherlode Diamond Crown
    [184.0, DM + 6.4, 1.45],
    [193.0, DM + 4.0, 1.3],
  ] as const) {
    buildGlowingWallDiamondCluster(wx, wy, -65.6, 0, 1, sc);
  }
  // South Wall flanks (`lz = -24.4`, facing North `nx = 0, nz = -1`, clear of tunnel mouth `lx = 169..177`)
  buildGlowingWallDiamondCluster(156.0, DM + 4.2, -24.4, 0, -1, 1.25);
  buildGlowingWallDiamondCluster(190.0, DM + 4.2, -24.4, 0, -1, 1.25);

  // Colossal Motherlode Diamond Altar & Giant Crystal Spires at the North face (`lx = 173.0, lz = -61.5`)
  kit.box(16.0, 1.1, 5.2, m.darkStone, 173.0, DM + 0.015, -61.5);
  kit.box(16.4, 0.26, 5.5, m.gold, 173.0, DM + 1.118, -61.5);
  for (let i = -4; i <= 4; i++) {
    const spire = new THREE.Mesh(
      diamondSpireGeo,
      i % 2 === 0 ? pureWhiteDiamondMat : diamondGlowMat
    );
    const sc = 1.65 - Math.abs(i) * 0.14;
    spire.scale.setScalar(sc);
    spire.position.set(173.0 + i * 1.55, DM + 1.1 + 1.8 * sc, -61.5 + (i % 2) * 0.45);
    spire.rotation.z = -i * 0.1;
    spire.rotation.x = 0.12;
    kit.add(spire);
  }

  // Intense diamond-white & cyan-blue illumination filling the entire Deep Diamond Mine Cavern!
  ctx.addLight(173.0, DM + 5.5, -58.0, 0xe0f2fe, 11.0);
  ctx.addLight(152.0, DM + 4.8, -36.0, 0x7dd3fc, 9.5);
  ctx.addLight(152.0, DM + 4.8, -54.0, 0xe0f2fe, 9.5);
  ctx.addLight(194.0, DM + 4.8, -36.0, 0xe0f2fe, 9.5);
  ctx.addLight(194.0, DM + 4.8, -54.0, 0x7dd3fc, 9.5);
  ctx.addLight(173.0, DM + 6.5, -42.0, 0xbae6fd, 10.0);

  // ===========================================================================
  // ROOM 2 (RIGHT BRANCH): GRAND DWARVEN STORAGE WAREHOUSE WITH MANY CABINETS
  // (`mazarbul-tomb-hall`, lx: 148..192, lz: 96..130, y = -17.35)
  // ===========================================================================
  // 6 Colossal Moria Carved Stone & Gold Columns inside the Warehouse (`ceilingY = -5.5`, height = 11.85m)
  const warehouseColH = 11.85;
  for (const cx of [156.0, 184.0]) {
    for (const cz of [102.0, 113.0, 124.0]) {
      kit.box(2.2, 0.8, 2.2, m.darkStone, cx, FJ, cz);
      kit.box(1.75, warehouseColH - 1.6, 1.75, m.stone, cx, FJ + 0.8, cz);
      for (const bandY of [2.8, 5.6, 8.4]) {
        kit.box(1.9, 0.24, 1.9, m.gold, cx, FJ + bandY, cz);
      }
      kit.box(2.35, 0.8, 2.35, m.darkStone, cx, FJ + warehouseColH - 0.8, cz);
      ctx.addTorch(cx + (cx < 170 ? 1.15 : -1.15), FJ + 3.2, cz, 0xffaa38, 7.0);
    }
  }

  // Helper to build a tall Dwarven Oak, Iron & Gold Storage Cabinet
  // Width along local Z = 3.6m, Depth along local X = 1.35m, Height = 4.2m, rotated by `yaw`
  const buildDwarvenStorageCabinet = (
    cx: number,
    cz: number,
    yaw: number,
    style: 'armoire' | 'shelves'
  ): void => {
    const cab = new THREE.Group();
    cab.position.set(cx, FJ, cz);
    cab.rotation.y = yaw;
    kit.add(cab);

    // Heavy stone base & carved wooden cabinet body (1.35m deep along X, 4.1m tall, 3.6m wide along Z)
    kit.box(1.42, 0.24, 3.72, m.darkStone, 0, 0, 0, cab);
    kit.box(1.28, 3.76, 3.55, m.wood, 0, 0.24, 0, cab);
    // Crown cornice with gold trim
    kit.box(1.48, 0.22, 3.8, m.darkStone, 0, 4.0, 0, cab);
    kit.box(1.52, 0.08, 3.84, m.gold, 0, 3.96, 0, cab);

    // Vertical iron frame pilasters along the front (+X) face
    for (const dz of [-1.68, 0, 1.68]) {
      kit.box(0.1, 3.76, 0.16, m.iron, 0.62, 0.24, dz, cab);
    }

    if (style === 'armoire') {
      // 4 Tall Iron-Bound Double Cabinet Doors with golden handles & hinges
      for (const doorZ of [-1.25, -0.42, 0.42, 1.25]) {
        kit.box(0.08, 3.4, 0.74, m.wood, 0.65, 0.42, doorZ, cab);
        kit.box(0.1, 0.1, 0.76, m.iron, 0.66, 0.65, doorZ, cab);
        kit.box(0.1, 0.1, 0.76, m.iron, 0.66, 3.45, doorZ, cab);
        // Golden ring handle
        kit.box(0.12, 0.24, 0.06, m.gold, 0.69, 2.0, doorZ + (doorZ < 0 ? 0.24 : -0.24), cab);
      }
    } else {
      // Open Multi-Shelf Supply Cupboard stocked with gold bars, iron ingots, barrels & crates
      for (const sy of [1.1, 2.0, 2.9]) {
        kit.box(1.24, 0.1, 3.45, m.wood, 0.04, sy, 0, cab);
        kit.box(0.08, 0.06, 3.48, m.gold, 0.64, sy + 0.02, 0, cab);
      }
      // Stocked items on the 3 shelves
      for (const sz of [-1.15, -0.38, 0.38, 1.15]) {
        kit.box(0.48, 0.45, 0.55, m.wood, 0.18, 0.3, sz, cab); // Lower shelf supply boxes
        kit.box(0.42, 0.22, 0.5, m.gold, 0.2, 1.2, sz, cab); // Middle shelf gold bullion stacks
        kit.box(0.44, 0.26, 0.52, m.iron, 0.2, 2.1, sz, cab); // Upper shelf iron ingot bundles
        kit.cyl(0.22, 0.22, 0.48, m.wood, 0.2, 3.24, sz, 8, cab); // Top shelf small casks
      }
    }
  };

  // Row 1: 6 Tall Cabinets lining the West Wall (`lx = 149.2, lz = 99..124`, facing East `yaw = 0`)
  for (let i = 0; i < 6; i++) {
    buildDwarvenStorageCabinet(149.2, 99.0 + i * 5.0, 0, i % 2 === 0 ? 'armoire' : 'shelves');
  }
  // Row 2: 6 Tall Cabinets lining the East Wall (`lx = 190.8, lz = 99..124`, facing West `yaw = Math.PI`)
  for (let i = 0; i < 6; i++) {
    buildDwarvenStorageCabinet(190.8, 99.0 + i * 5.0, Math.PI, i % 2 === 1 ? 'armoire' : 'shelves');
  }
  // Row 3: 6 Tall Cabinets lining the South Wall (`lz = 128.8, lx = 154..186`, facing North `yaw = Math.PI / 2`)
  for (let i = 0; i < 6; i++) {
    buildDwarvenStorageCabinet(
      154.0 + i * 6.4,
      128.8,
      Math.PI / 2,
      i % 2 === 0 ? 'shelves' : 'armoire'
    );
  }
  // Row 4 & 5: Back-to-back Warehouse Cabinet Aisles on the West side (`lx = 161.5`) and East side (`lx = 180.5`),
  // keeping the central railway track (`lx = 168..176, lz = 96..118`) 100% clear!
  for (const az of [105.0, 111.5, 118.0]) {
    buildDwarvenStorageCabinet(160.8, az, -Math.PI, 'shelves');
    buildDwarvenStorageCabinet(162.2, az, 0, 'armoire');
    buildDwarvenStorageCabinet(179.8, az, -Math.PI, 'armoire');
    buildDwarvenStorageCabinet(181.2, az, 0, 'shelves');
  }
  ctx.addLight(170.0, FJ + 4.5, 113.0, 0xffd27a, 9.0);

  // Scaffolding against the east gallery wall: posts, planks and a ladder.
  for (const z of [48, 58, 68]) {
    for (const x of [114.5, 116.5]) kit.box(0.25, 7, 0.25, m.wood, x, U, z);
  }
  for (const y of [3, 6]) kit.box(2.4, 0.12, 20.5, m.wood, 115.5, U + y, 58);
  for (let i = 0; i < 12; i++) kit.box(0.9, 0.08, 0.08, m.wood, 113.9, U + 0.5 + i * 0.5, 63);
  for (const z of [62.6, 63.4]) kit.box(0.08, 6.2, 0.08, m.wood, 113.9, U, z);
  return {
    crusherGear,
    pistons,
    bucket,
    hoistChain,
    pulleyWheel,
    pulleyY,
    switchLeverArm,
    switchIndicatorMat,
  };
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
    ctx.addLight(f.lx, U + 2.2, front - 1.5, 0xff6a1a, 7);
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

  // Master Blacksmith Stages & Runic Anvil Platforms for Kili Forgehammer at (80, 115, U) and (100, 116, U)
  buildBlacksmithAnvilStage(kit, ctx, 80.0, U, 115.0);
  buildBlacksmithAnvilStage(kit, ctx, 100.0, U, 116.0);

  return { ladlePivot };
}
// #endregion
