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
    gallery.bucket.position.y = Math.sin(t * 0.25) * 3.6 - 2.4;
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

// #region Starting Hall Grand Overhead Chandeliers & Dwarven Market Stalls
/**
 * Summary: Builds 6 colossal multi-tiered Dwarven iron-and-gold overhead chandeliers (`נברשות ענק`)
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
    ctx.addTorch(cx, wheelY + 0.35, cz, 0xffcc66, 8.5);
  }

  // 2) 3 DWARVEN MARKET STALLS ALONG THE WEST ENTRY PROMENADE (lx = -11.5, lz = 49.0 / 56.5 / 64.0)
  const buildStallFrame = (sz: number, awningAccentMat: THREE.Material): THREE.Group => {
    const sx = -11.5;
    const stall = new THREE.Group();
    stall.position.set(sx, U, sz);
    kit.add(stall);

    // Stone base plinth & carved wooden counter (2.0m deep along X, 4.2m wide along Z, facing East +X)
    kit.box(2.0, 0.22, 4.2, m.darkStone, 0, 0, 0, stall);
    kit.box(1.75, 0.84, 3.95, m.wood, 0.05, 0.22, 0, stall);
    // Decorative iron vertical straps & gold trim on the front (+X) face of the counter
    for (const dz of [-1.8, -0.6, 0.6, 1.8]) {
      kit.box(0.08, 0.84, 0.14, m.iron, 0.94, 0.22, dz, stall);
    }
    kit.box(0.08, 0.12, 4.0, m.gold, 0.95, 0.92, 0, stall);
    // Countertop slab (y = 1.06 .. 1.16)
    kit.box(1.98, 0.1, 4.24, m.stone, 0.05, 1.06, 0, stall);
    kit.box(2.04, 0.05, 4.3, m.gold, 0.05, 1.11, 0, stall);

    // Back display shelf rack behind the merchant (`lx = -13.9` -> local `x = -2.4`)
    kit.box(0.65, 2.35, 3.8, m.darkStone, -2.35, 0, 0, stall);
    kit.box(0.72, 0.12, 3.9, m.gold, -2.35, 2.35, 0, stall);
    kit.box(0.68, 0.08, 3.6, m.wood, -2.32, 1.15, 0, stall);
    kit.box(0.68, 0.08, 3.6, m.wood, -2.32, 1.75, 0, stall);

    // 4 Corner Canopy Posts & Sloped Dwarven Awning Roof
    for (const px of [-0.82, 0.88]) {
      for (const pz of [-1.95, 1.95]) {
        kit.box(0.18, 2.65, 0.18, m.wood, px, 0.22, pz, stall);
        kit.box(0.22, 0.14, 0.22, m.gold, px, 2.45, pz, stall);
      }
    }
    // Overhead sign board on the East (+X) front lintel
    kit.box(0.14, 0.42, 3.6, m.wood, 0.92, 2.42, 0, stall);
    kit.box(0.18, 0.06, 3.7, m.gold, 0.92, 2.4, 0, stall);
    kit.box(0.18, 0.06, 3.7, m.gold, 0.92, 2.82, 0, stall);

    // Sloped canopy roof with alternating wood & accent ribs
    const roof = new THREE.Group();
    roof.position.set(0.05, 2.92, 0);
    roof.rotation.z = -0.14;
    stall.add(roof);
    kit.box(2.35, 0.12, 4.45, m.wood, 0, 0, 0, roof);
    for (const rz of [-1.8, -0.9, 0, 0.9, 1.8]) {
      kit.box(2.42, 0.08, 0.28, awningAccentMat, 0, 0.08, rz, roof);
    }
    kit.box(0.12, 0.16, 4.5, m.gold, 1.18, -0.02, 0, roof);

    ctx.addTorch(sx + 1.05, U + 2.55, sz - 1.95, 0xffc85a, 7.5);
    ctx.addTorch(sx + 1.05, U + 2.55, sz + 1.95, 0xffc85a, 7.5);
    return stall;
  };

  // --- STALL 1 (lz = 49.0): DWARVEN WEAPONS & ARMOR STALL (Warhammer, Battle Axe, Shield, Horned Helmet) ---
  {
    const stall1 = buildStallFrame(49.0, m.gold);
    const cy = 1.16;

    // 1a. Dwarven Warhammer (`פטיש קרב גמדים`) on the south end of the counter
    const hammer = new THREE.Group();
    hammer.position.set(0.18, cy + 0.08, -1.25);
    hammer.rotation.y = 0.35;
    stall1.add(hammer);
    kit.box(0.08, 0.08, 0.95, m.wood, 0, 0, 0, hammer);
    kit.box(0.44, 0.24, 0.26, m.iron, 0, 0.04, -0.38, hammer);
    kit.box(0.48, 0.08, 0.28, m.gold, 0, 0.12, -0.38, hammer);

    // 1b. Double-Bit Dwarven Battle Axe (`גרזן קרב דו-להבי`) in the center-south of the counter
    const axe = new THREE.Group();
    axe.position.set(0.22, cy + 0.06, -0.35);
    axe.rotation.y = -0.25;
    stall1.add(axe);
    kit.box(0.07, 0.07, 1.02, m.wood, 0, 0, 0, axe);
    kit.box(0.68, 0.06, 0.38, m.iron, 0, 0.02, -0.36, axe);
    kit.box(0.72, 0.04, 0.12, m.gold, 0, 0.03, -0.36, axe);

    // 1c. Round Iron & Gold Dwarven Shield (`מגן גמדים`) propped on an angled display stand
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

    // 1d. Horned Dwarven Helmet (`קסדת גמדים`) on an armor stand bust on the north end of the counter
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
    const cy = 1.16;

    // 2a. Stacked Pyramid of Gleaming Gold Ingots (`מטילי זהב`) on the south side of the counter
    for (let row = 0; row < 3; row++) {
      const count = 3 - row;
      for (let k = 0; k < count; k++) {
        kit.box(
          0.34,
          0.11,
          0.16,
          m.gold,
          0.18,
          cy + row * 0.11,
          -1.45 + k * 0.2 + row * 0.1,
          stall2
        );
      }
    }

    // 2b. Velvet Display Cushion with Brilliantly Glowing Faceted Diamonds (`יהלומים זוהרים`)
    kit.box(0.55, 0.06, 0.85, m.darkStone, 0.22, cy, -0.35, stall2);
    kit.box(0.58, 0.03, 0.88, m.gold, 0.22, cy, -0.35, stall2);
    const diaGeo = ctx.own(new THREE.OctahedronGeometry(0.16, 0));
    for (const [dx, dz, sc] of [
      [0.22, -0.55, 1.15],
      [0.26, -0.32, 1.35],
      [0.18, -0.12, 1.05],
      [0.08, -0.42, 0.85],
    ] as const) {
      const dia = new THREE.Mesh(diaGeo, diamondMat);
      dia.scale.set(sc, sc * 1.35, sc);
      dia.position.set(dx, cy + 0.18 * sc, dz);
      dia.rotation.y = dz * 2.1;
      stall2.add(dia);
    }

    // 2c. Brass Jeweler's Balance Scale (`מאזני שקילה לזהב ויהלומים`) in the center-north
    const scaleGrp = new THREE.Group();
    scaleGrp.position.set(0.2, cy, 0.55);
    stall2.add(scaleGrp);
    kit.cyl(0.14, 0.18, 0.06, m.gold, 0, 0.03, 0, 10, scaleGrp);
    kit.cyl(0.03, 0.03, 0.48, m.gold, 0, 0.26, 0, 8, scaleGrp);
    kit.box(0.06, 0.05, 0.56, m.gold, 0, 0.48, 0, scaleGrp);
    for (const side of [-1, 1] as const) {
      kit.cyl(0.12, 0.09, 0.04, m.gold, 0, 0.24, side * 0.25, 10, scaleGrp);
    }

    // 2d. Glowing Sapphires, Amethysts & Raw Gold Ore Nuggets on the north tray
    kit.box(0.52, 0.06, 0.85, m.darkStone, 0.22, cy, 1.35, stall2);
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
      shelfGem.position.set(-2.12, 1.42, sz);
      stall2.add(shelfGem);
    }
    ctx.addLight(-11.2, U + 1.65, 56.5, 0x7dd3fc, 7.5);
  }

  // --- STALL 3 (lz = 64.0): PICKAXES & ENGINEERING WORK TOOLS STALL (Pickaxes, Chisels, Core Drill, Lanterns) ---
  {
    const stall3 = buildStallFrame(64.0, m.iron);
    const cy = 1.16;

    // 3a. Heavy Dwarven Pickaxe & Glowing Mithril Pickaxe (`מקוש גמדים ומקוש מית'ריל`) on display stands
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

    // 3b. Dwarven Stone-Carving Chisel Set & Mallet (`ערכת אזמלים ופטישי סיתות`)
    for (let c = 0; c < 4; c++) {
      kit.box(0.38, 0.04, 0.05, c % 2 === 0 ? m.iron : m.gold, 0.22, cy + 0.02, -0.15 + c * 0.11, stall3);
    }

    // 3c. Mechanical Rotary Crystal-Core Drill (`מקדח גבישים מכני`) in the center-north
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

    // 3d. Brass Prospector's Rune Lantern (`עששית כורים`) on the north corner of the counter
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
 * Summary: Checks whether a vertex `(x, z)` is one of the two railway turnout junctions (`[-18, 75]` or `[56, 78]`).
 */
function isTurnoutJunctionVertex(x: number, z: number): boolean {
  return (
    Math.hypot(x - -18.0, z - 75.0) < 0.15 ||
    Math.hypot(x - 56.0, z - 78.0) < 0.15 ||
    Math.hypot(x - 156.0, z - 72.0) < 0.15
  );
}

/**
 * Summary: Subdivides a multi-segment track polyline into a smooth C1-continuous path.
 * Design:
 * - At pinned turnout junctions (`[-18, 75]` and `[56, 78]`), the curve passes directly THROUGH the
 *   junction point with the exact incoming trunk tangent `T` (using a cubic Bezier transition onto the
 *   outgoing segment), so the parent track and the branch track share the exact same position and
 *   tangent at the switch toe with zero protruding or stepped rails.
 * - At ordinary interior corners, uses an 8-step quadratic Bezier fillet.
 */
function subdividePolylineWithCurves(
  line: readonly (readonly [number, number])[],
  initialTangent?: readonly [number, number],
  cornerRadius = 3.6,
  arcSteps = 8
): [number, number][] {
  if (line.length < 2) return line.map(([x, z]) => [x, z]);
  const out: [number, number][] = [];

  // Handle start of line: if this is a branch line with an explicit incoming trunk tangent at line[0],
  // transition smoothly from (line[0], initialTangent) onto segment line[0] -> line[1] via cubic Bezier.
  if (initialTangent !== undefined) {
    const p0 = line[0];
    const p1 = line[1];
    const dx = p1[0] - p0[0];
    const dz = p1[1] - p0[1];
    const segLen = Math.hypot(dx, dz) || 1;
    const ux = dx / segLen;
    const uz = dz / segLen;
    const d = Math.min(5.2, segLen * 0.45);
    const c0x = p0[0];
    const c0z = p0[1];
    const c1x = p0[0] + initialTangent[0] * (d * 0.45);
    const c1z = p0[1] + initialTangent[1] * (d * 0.45);
    const c2x = p0[0] + ux * (d * 0.55);
    const c2z = p0[1] + uz * (d * 0.55);
    const c3x = p0[0] + ux * d;
    const c3z = p0[1] + uz * d;
    for (let s = 0; s <= arcSteps; s++) {
      const t = s / arcSteps;
      const omt = 1 - t;
      const bx =
        omt * omt * omt * c0x +
        3 * omt * omt * t * c1x +
        3 * omt * t * t * c2x +
        t * t * t * c3x;
      const bz =
        omt * omt * omt * c0z +
        3 * omt * omt * t * c1z +
        3 * omt * t * t * c2z +
        t * t * t * c3z;
      out.push([bx, bz]);
    }
  } else {
    out.push([line[0][0], line[0][1]]);
  }

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

    const vInX = curr[0] - prev[0];
    const vInZ = curr[1] - prev[1];
    const len1 = Math.hypot(vInX, vInZ);
    const vOutX = next[0] - curr[0];
    const vOutZ = next[1] - curr[1];
    const len2 = Math.hypot(vOutX, vOutZ);
    if (len1 < 0.5 || len2 < 0.5) {
      out.push([curr[0], curr[1]]);
      continue;
    }

    // At a pinned turnout junction vertex, pass straight through `curr` with incoming tangent `vIn / len1`
    // and curve smoothly onto `curr -> next` via cubic Bezier so the switch toe is never cut short!
    if (isTurnoutJunctionVertex(curr[0], curr[1])) {
      const tx = vInX / len1;
      const tz = vInZ / len1;
      const ux = vOutX / len2;
      const uz = vOutZ / len2;
      const d = Math.min(5.2, len2 * 0.45);
      const c0x = curr[0];
      const c0z = curr[1];
      const c1x = curr[0] + tx * (d * 0.45);
      const c1z = curr[1] + tz * (d * 0.45);
      const c2x = curr[0] + ux * (d * 0.55);
      const c2z = curr[1] + uz * (d * 0.55);
      const c3x = curr[0] + ux * d;
      const c3z = curr[1] + uz * d;
      for (let s = 0; s <= arcSteps; s++) {
        const t = s / arcSteps;
        const omt = 1 - t;
        const bx =
          omt * omt * omt * c0x +
          3 * omt * omt * t * c1x +
          3 * omt * t * t * c2x +
          t * t * t * c3x;
        const bz =
          omt * omt * omt * c0z +
          3 * omt * omt * t * c1z +
          3 * omt * t * t * c2z +
          t * t * t * c3z;
        out.push([bx, bz]);
      }
      continue;
    }

    const trim = Math.min(cornerRadius, len1 * 0.42, len2 * 0.42);
    const pStart: [number, number] = [curr[0] - (vInX / len1) * trim, curr[1] - (vInZ / len1) * trim];
    const pEnd: [number, number] = [curr[0] + (vOutX / len2) * trim, curr[1] + (vOutZ / len2) * trim];
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
 * Summary: Builds a railway switch turnout assembly (unified graduated switch ties spanning under both
 *          diverging tracks, frog baseplate, and a weighted throw switch stand outside the gauge) at a
 *          junction where a branch track splits off tangentially from a main line.
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

  const dxIn = jx - parentBefore[0];
  const dzIn = jz - parentBefore[1];
  const inYaw = Math.atan2(dxIn, dzIn);

  const dxMain = mainAfter[0] - jx;
  const dzMain = mainAfter[1] - jz;
  const mainYaw = Math.atan2(dxMain, dzMain);

  const dxBranch = branchAfter[0] - jx;
  const dzBranch = branchAfter[1] - jz;
  const branchYaw = Math.atan2(dxBranch, dzBranch);

  const diffMain = Math.atan2(Math.sin(mainYaw - inYaw), Math.cos(mainYaw - inYaw));
  const diffBranch = Math.atan2(Math.sin(branchYaw - inYaw), Math.cos(branchYaw - inYaw));
  const midDiff = (diffMain + diffBranch) * 0.5;
  const spreadAngle = Math.abs(diffBranch - diffMain);
  const branchSide = diffBranch >= diffMain ? 1 : -1;

  const turnoutGroup = new THREE.Group();
  turnoutGroup.position.set(jx, y + 0.02, jz);
  turnoutGroup.rotation.y = inYaw + midDiff * 0.45;
  kit.add(turnoutGroup);

  // 1) Unified graduated timber switch ties spanning cleanly under BOTH diverging tracks
  //    (individual short sleepers are suppressed inside this zone so ties never cross or overlap!)
  for (let i = -1; i <= 7; i++) {
    const zLocal = i * 0.76;
    const progress = Math.max(0, zLocal / 5.4);
    const extraSpan = Math.sin(spreadAngle) * Math.max(0, zLocal) * 0.95;
    const tieWidth = 2.05 + extraSpan;
    const xShift = branchSide * progress * 0.36;
    kit.box(tieWidth, 0.082, 0.25, m.wood, xShift, 0, zLocal, turnoutGroup);
    // Low iron tie-plates flush on top of the timber switch tie (strictly below the rail top!)
    kit.box(tieWidth - 0.28, 0.016, 0.16, m.iron, xShift, 0.082, zLocal, turnoutGroup);
  }

  // 2) Switch throw tie-bar under the rails at the toe of the switch (y = 0.05, below rail top)
  kit.box(1.38, 0.04, 0.09, m.gold, 0, 0.05, 0.38, turnoutGroup);

  // 3) Classic Dwarven weighted throw switch stand beside the turnout (outside the track gauge)
  const standX = -branchSide * (RAIL_GAUGE_HALF + 0.82);
  const standZ = 0.38;
  kit.box(0.44, 0.12, 0.44, m.darkStone, standX, 0, standZ, turnoutGroup);
  kit.box(0.32, 0.18, 0.24, m.iron, standX, 0.12, standZ, turnoutGroup);
  kit.box(Math.abs(standX), 0.035, 0.05, m.iron, standX * 0.5, 0.055, standZ, turnoutGroup);
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
 * Summary: Checks whether a sleeper at `(sx, sz)` lies inside one of the two switch turnout tie zones
 *          (`[-18, 75]` or `[56, 78]`), where `buildRailTurnoutFrog` lays unified long switch ties.
 */
function isInsideTurnoutSleeperZone(sx: number, sz: number): boolean {
  // West turnout at [-18, 75], incoming tangent unit([-12, -5]) = (-0.9231, -0.3846)
  const wx = sx - -18.0;
  const wz = sz - 75.0;
  const wAlong = wx * -0.9231 + wz * -0.3846;
  const wPerp = Math.abs(wx * -0.3846 - wz * -0.9231);
  if (wAlong >= -0.95 && wAlong <= 5.65 && wPerp <= 2.35) return true;

  // East turnout at [56, 78], incoming tangent unit([24, -2]) = (0.9965, -0.0830)
  const ex = sx - 56.0;
  const ez = sz - 78.0;
  const eAlong = ex * 0.9965 + ez * -0.0830;
  const ePerp = Math.abs(ex * -0.0830 - ez * 0.9965);
  if (eAlong >= -0.95 && eAlong <= 5.65 && ePerp <= 2.35) return true;

  // East Fork turnout at [156, 72], incoming tangent (1, 0)
  const fx = sx - 156.0;
  const fz = sz - 72.0;
  if (fx >= -0.95 && fx <= 5.65 && Math.abs(fz) <= 2.35) return true;

  return false;
}

/**
 * Summary: Builds a complete railway track polyline with shared vertex normals so the left and right
 *          steel rails meet at identical 3D points at every curve joint and switch turnout without
 *          any lateral steps, gaps, or protruding ends.
 */
function buildContinuousTrackPolyline(
  kit: Kit,
  smoothLine: readonly (readonly [number, number])[],
  initialTangent?: readonly [number, number]
): void {
  const { m } = kit;
  const n = smoothLine.length;
  if (n < 2) return;

  // Compute unit horizontal normal (nx, nz) at every vertex of smoothLine
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
    } else if (isTurnoutJunctionVertex(smoothLine[i][0], smoothLine[i][1])) {
      // At a pinned turnout junction vertex, lock the normal to the exact incoming trunk tangent
      // so the main track and branch track have identical rail positions at the junction!
      const dx = smoothLine[i][0] - smoothLine[i - 1][0];
      const dz = smoothLine[i][1] - smoothLine[i - 1][1];
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
    // For forward tangent (tx, tz), local +X across the track gauge is (tz, -tx)
    normals.push([tz, -tx]);
  }

  // Helper to place a continuous steel rail bar between two exact 3D endpoints (a -> b)
  const addRailBarBetween = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number
  ): void => {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const flat = Math.hypot(dx, dz);
    const len = Math.hypot(flat, dy);
    if (len < 0.02) return;
    // Small 0.04m overlap seals the outer edge of mitered joints without sticking out
    const mesh = new THREE.Mesh(
      kit['_ctx'].own(new THREE.BoxGeometry(0.11, 0.12, len + 0.04)),
      m.iron
    );
    mesh.position.set((ax + bx) * 0.5, (ay + by) * 0.5 + 0.16, (az + bz) * 0.5);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.rotation.x = -Math.atan2(dy, flat || 1);
    kit.add(mesh);
  };

  for (let i = 0; i < n - 1; i++) {
    const a = smoothLine[i];
    const b = smoothLine[i + 1];
    const na = normals[i];
    const nb = normals[i + 1];
    const ya = trackFloorY(a[0], a[1]);
    const yb = trackFloorY(b[0], b[1]);

    // Left rail (-RAIL_GAUGE_HALF) and Right rail (+RAIL_GAUGE_HALF) share exact vertex coordinates
    for (const side of [-1, 1] as const) {
      const ax = a[0] + na[0] * side * RAIL_GAUGE_HALF;
      const az = a[1] + na[1] * side * RAIL_GAUGE_HALF;
      const bx = b[0] + nb[0] * side * RAIL_GAUGE_HALF;
      const bz = b[1] + nb[1] * side * RAIL_GAUGE_HALF;
      addRailBarBetween(ax, ya, az, bx, yb, bz);
    }

    // Timber sleepers along the segment centerline (suppressed inside the turnout switch-tie zones)
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const flat = Math.hypot(dx, dz);
    if (flat < 0.05) continue;
    const length = Math.hypot(flat, yb - ya);
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(yb - ya, flat);
    const count = Math.max(1, Math.floor(length / SLEEPER_SPACING));
    const step = length / count;
    for (let s = 0; s < count; s++) {
      const frac = (s + 0.5) / count;
      const sx = a[0] + dx * frac;
      const sz = a[1] + dz * frac;
      if (isInsideTurnoutSleeperZone(sx, sz)) continue;
      const sy = ya + (yb - ya) * frac;
      const tie = kit.box(2.0, 0.08, 0.24, m.wood, sx, sy + 0.02, sz);
      tie.rotation.order = 'YXZ';
      tie.rotation.y = yaw;
      tie.rotation.x = pitch;
    }
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

  // 2) SMOOTHLY CURVED RAIL TRACKS WITH SHARED VERTEX NORMALS & SWITCH TURNOUTS
  // Incoming unit tangents at the branch turnouts ([56, 78] from [32, 80], [-18, 75] from [-6, 80], and [156, 72] from [152, 72])
  const eastBranchTangent: readonly [number, number] = [24 / Math.hypot(24, -2), -2 / Math.hypot(24, -2)];
  const westBranchTangent: readonly [number, number] = [-12 / Math.hypot(-12, -5), -5 / Math.hypot(-12, -5)];
  const eastForkBranchTangent: readonly [number, number] = [1, 0];

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
    const smoothLine = subdividePolylineWithCurves(rawLine, initialTangent, 3.6, 8);
    buildContinuousTrackPolyline(kit, smoothLine, initialTangent);
  }

  // Turnout switch ties & throw stands at the branch junctions
  buildRailTurnoutFrog(kit, [-18, 75], [-6, 80], [-32, 66], [-34, 79]);
  buildRailTurnoutFrog(kit, [56, 78], [32, 80], [66, 77], [74, 75]);
  buildRailTurnoutFrog(kit, [156, 72], [152, 72], [165, 67], [165, 77]);

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
function buildGalleries(
  kit: Kit,
  ctx: ISetPieceContext
): {
  crusherGear: THREE.Mesh;
  pistons: THREE.Group[];
  bucket: THREE.Group;
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
    for (const nx of [169.4, 176.6]) {
      kit.box(0.45, 5.6, 0.45, m.wood, nx, FJ, nz);
    }
    kit.box(7.8, 0.45, 0.45, m.wood, 173.0, FJ + 5.4, nz);
  }
  // Portal lintel at lz = 48 where the 1st small tunnel opens into the Vast Abyss Chasm Cavern
  kit.box(8.8, 0.45, 1.2, m.gold, 173.0, FJ + 5.6, 48.0);
  ctx.addTorch(169.8, FJ + 3.0, 49.0, 0xffb844, 7.0);
  ctx.addTorch(176.2, FJ + 3.0, 49.0, 0xffb844, 7.0);

  // 2) VAST ABYSS CHASM CAVERN & RAIL BRIDGE (`diamond-chasm-bridge`, lx: 169..177, lz: 8..48, y = -17.35)
  // Colossal stone & gold bridge piers rising from the deep abyss (-130m) up to the bridge deck (-17.35m)
  const pierHeight = FJ - ABYSS_Y;
  for (const pz of [16.0, 28.0, 40.0]) {
    kit.box(6.4, pierHeight, 3.6, m.darkStone, 173.0, ABYSS_Y, pz);
    kit.box(7.0, 0.6, 4.2, m.gold, 173.0, FJ - 2.2, pz);
    kit.box(7.0, 0.5, 4.2, m.gold, 173.0, FJ - 14.0, pz);
    // Low stone & gold bridge parapets and glowing braziers along both edges of the chasm bridge (`lx = 169.35, 176.65`)
    for (const sideX of [169.35, 176.65]) {
      kit.box(0.75, 1.35, 0.75, m.darkStone, sideX, FJ, pz);
      kit.box(0.85, 0.2, 0.85, m.gold, sideX, FJ + 1.35, pz);
      const flame = new THREE.Mesh(ctx.own(new THREE.SphereGeometry(0.28, 8, 6)), m.ember);
      flame.position.set(sideX, FJ + 1.72, pz);
      kit.add(flame);
    }
  }
  // Continuous carved bridge curb & guard-rail parapet walls along `lx = 169.25` and `lx = 176.75` (`lz = 8..48`)
  for (const sideX of [169.25, 176.75]) {
    kit.box(0.42, 0.95, 40.0, m.darkStone, sideX, FJ, 28.0);
    kit.box(0.48, 0.16, 40.0, m.gold, sideX, FJ + 0.95, 28.0);
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
  // Portal lintel at lz = 8.0 where the chasm bridge re-enters the narrow descending rock tunnel
  kit.box(8.8, 0.45, 1.2, m.gold, 173.0, FJ + 5.6, 8.0);
  for (const tz of [4.0, -4.0, -12.0, -20.0]) {
    const ty = trackFloorY(173.0, tz);
    for (const tx of [169.4, 176.6]) {
      kit.box(0.45, 5.4, 0.45, m.wood, tx, ty, tz);
    }
    kit.box(7.8, 0.45, 0.45, m.wood, 173.0, ty + 5.2, tz);
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
  kit.box(16.0, 1.1, 5.2, m.darkStone, 173.0, DM, -61.5);
  kit.box(16.4, 0.26, 5.5, m.gold, 173.0, DM + 1.1, -61.5);
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
  // ROOM 2 (RIGHT BRANCH): GRAND DWARVEN STORAGE WAREHOUSE WITH MANY CABINETS (`מחסן עם המון ארונות`)
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

  // Helper to build a tall Dwarven Oak, Iron & Gold Storage Cabinet (`ארון אחסון גמדים גבוה`)
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
  return { crusherGear, pistons, bucket, switchLeverArm, switchIndicatorMat };
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
