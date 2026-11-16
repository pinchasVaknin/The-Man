// ============================================================================
// MODULE: World / Models / Skybound Isles / Floating Garden
// DESIGN: Every mesh is placed from the Floating Garden domain data (lake, stream, waterfall
//         lip, cave, ramps, Sky Tree platforms and branches, root path), and railings are drawn
//         straight from the solid boxes, so what you see is what collides. Repeated details
//         (flowers, hanging roots, foam streaks) are instanced or share geometry.
// SUMMARY: Builds and animates the Floating Garden: lake and stream, the waterfall pouring
//          off the stone lip with the cave behind it, the Sky Tree with its mushrooms,
//          branches and crown, hanging roots with the hidden nook, trees, ruins and flowers.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  getSkyIsland,
  GARDEN_LAKE,
  GARDEN_STREAM,
  GARDEN_WATERFALL_LIP,
  GARDEN_WATERFALL,
  GARDEN_CAVE_FLOOR,
  GARDEN_CAVE_LEDGE,
  GARDEN_CAVE_RAMP,
  SKY_TREE,
  GARDEN_BOUNCE_PADS,
  SKY_TREE_BRANCH_LOW,
  SKY_TREE_BRANCH_HIGH,
  SKY_TREE_CROWN,
  SKY_TREE_BRANCHES,
  GARDEN_ROOT_RAMP,
  GARDEN_ROOT_NOOK,
  GARDEN_SOLID_BOXES,
  type IGardenPlatform,
} from '../domain/landmarksRegistry';
import { boxMesh, buildRailInstances, createMaterials, deckSlab, rampSlab, type IHarborMaterials } from './skyHarborShared';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Floating Garden builder hands back to the frame loop. */
export interface IFloatingGardenBuildResult {
  readonly group: THREE.Group;
  /** Animates the waterfall, its mist and the glowing cave crystals; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
}
// #endregion

// #region Tuning
const GARDEN = getSkyIsland('floating-garden')!;
const DECK_Y = GARDEN.deckY;
/** Thin lift (m) for flat decals laid on the deck, so they never z-fight with it. */
const DECAL_LIFT_M = 0.03;
const FOAM_STREAKS = 14;
const MIST_PUFFS = 7;
const GARDEN_FLOWER_COUNT = 140;
const HANGING_ROOTS = 18;
const FLOWER_COLORS = [0xf0abfc, 0x93c5fd, 0xfde68a, 0x99f6e4, 0xfda4af, 0xc4b5fd] as const;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the Floating Garden and returns its frame update.
 * @param ctx Shared build context (disposal lists, software-GL flag, textures).
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildFloatingGarden(ctx: IWorldModelBuildContext): IFloatingGardenBuildResult {
  const group = new THREE.Group();
  group.name = 'floating-garden';
  const mats = createMaterials(ctx);
  const box = new THREE.BoxGeometry(1, 1, 1);
  ctx.disposableGeometries.push(box);

  buildLakeAndStream(ctx, mats, box, group);
  const waterfall = buildWaterfallAndCave(ctx, mats, box, group);
  buildSkyTree(ctx, mats, box, group);
  buildRootPath(ctx, mats, box, group);
  buildGardenDressing(ctx, mats, box, group);
  group.add(buildRailInstances(ctx, box, mats.darkWood, GARDEN_SOLID_BOXES));

  return {
    group,
    update: (elapsedSec: number) => {
      waterfall.foam.forEach((streak, i) => {
        const cycle = (elapsedSec * 0.55 + i / waterfall.foam.length) % 1;
        streak.position.y = GARDEN_WATERFALL.topY - cycle * (GARDEN_WATERFALL.topY - GARDEN_WATERFALL.bottomY);
        streak.scale.y = 1.2 + cycle * 2.5;
      });
      waterfall.mist.forEach((puff, i) => {
        const pulse = 1 + Math.sin(elapsedSec * 0.8 + i * 1.3) * 0.18;
        puff.scale.setScalar(puff.userData.baseScale * pulse);
      });
      waterfall.caveGlow.emissiveIntensity = 1.2 + Math.sin(elapsedSec * 1.7) * 0.35;
    },
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Lake And Stream
function buildLakeAndStream(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const discGeo = new THREE.CylinderGeometry(1, 1, 0.08, 40);
  const padGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.04, 12, 1, false, 0.4, Math.PI * 1.8);
  ctx.disposableGeometries.push(discGeo, padGeo);
  const lake = new THREE.Mesh(discGeo, mats.water);
  lake.scale.set(GARDEN_LAKE.rx, 1, GARDEN_LAKE.rz);
  lake.position.set(GARDEN_LAKE.x, DECK_Y + DECAL_LIFT_M * 2, GARDEN_LAKE.z);
  const shore = new THREE.Mesh(discGeo, mats.stone);
  shore.scale.set(GARDEN_LAKE.rx + 1.2, 1, GARDEN_LAKE.rz + 1.2);
  shore.position.set(GARDEN_LAKE.x, DECK_Y + DECAL_LIFT_M, GARDEN_LAKE.z);
  group.add(shore, lake);
  for (let k = 0; k < 7; k++) {
    const ang = k * 2.1;
    const pad = new THREE.Mesh(padGeo, mats.leaves);
    pad.position.set(GARDEN_LAKE.x + Math.cos(ang) * GARDEN_LAKE.rx * 0.55, DECK_Y + DECAL_LIFT_M * 4, GARDEN_LAKE.z + Math.sin(ang) * GARDEN_LAKE.rz * 0.55);
    pad.rotation.y = ang;
    group.add(pad);
  }
  const s = GARDEN_STREAM;
  const length = s.toZ - s.fromZ;
  group.add(boxMesh(box, mats.stone, s.x, DECK_Y + DECAL_LIFT_M, (s.fromZ + s.toZ) / 2, s.halfWidth * 2 + 0.8, 0.06, length));
  group.add(boxMesh(box, mats.water, s.x, DECK_Y + DECAL_LIFT_M * 3, (s.fromZ + s.toZ) / 2, s.halfWidth * 2, 0.06, length));
  // Decorative stone footbridge over the stream.
  const archGeo = new THREE.TorusGeometry(1.9, 0.25, 6, 18, Math.PI);
  ctx.disposableGeometries.push(archGeo);
  const arch = new THREE.Mesh(archGeo, mats.stone);
  arch.position.set(s.x, DECK_Y, s.fromZ + length * 0.35);
  arch.rotation.y = Math.PI / 2;
  group.add(arch);
}
// #endregion

// #region Waterfall And Cave
function buildWaterfallAndCave(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): { foam: THREE.Mesh[]; mist: THREE.Mesh[]; caveGlow: THREE.MeshStandardMaterial } {
  // Stone lip (the stream bed past the rim) and the cave room under it.
  group.add(deckSlab(box, mats.stone, GARDEN_WATERFALL_LIP, 0.6));
  group.add(deckSlab(box, mats.darkStone, GARDEN_CAVE_FLOOR, 0.8));
  group.add(deckSlab(box, mats.darkStone, GARDEN_CAVE_LEDGE, 0.8));
  group.add(rampSlab(box, mats.darkStone, GARDEN_CAVE_RAMP, 0.6));
  for (const wall of GARDEN_SOLID_BOXES.filter((b) => b.id.startsWith('garden-cave-wall'))) {
    group.add(boxMesh(box, mats.darkStone, (wall.minX + wall.maxX) / 2, (wall.minY + wall.maxY) / 2, (wall.minZ + wall.maxZ) / 2, wall.maxX - wall.minX + 0.6, wall.maxY - wall.minY, wall.maxZ - wall.minZ + 0.6));
  }
  // Rock mass hanging under the cave, so it reads as part of the cliff.
  const rockGeo = new THREE.ConeGeometry(1, 1, 7);
  rockGeo.rotateX(Math.PI);
  ctx.disposableGeometries.push(rockGeo);
  const underCave = new THREE.Mesh(rockGeo, mats.darkStone);
  underCave.scale.set(6.5, 9.0, 5.0);
  underCave.position.set((GARDEN_CAVE_FLOOR.minX + GARDEN_CAVE_FLOOR.maxX) / 2, GARDEN_CAVE_FLOOR.y - 5.3, (GARDEN_CAVE_FLOOR.minZ + GARDEN_CAVE_LEDGE.maxZ) / 2);
  group.add(underCave);

  // Glowing crystals and mushrooms inside the cave.
  const caveGlow = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 1.3, roughness: 0.2 });
  ctx.disposableMaterials.push(caveGlow);
  const shardGeo = new THREE.OctahedronGeometry(0.45, 0);
  shardGeo.scale(1, 2.2, 1);
  ctx.disposableGeometries.push(shardGeo);
  for (const [ox, oz, tilt] of [[0.6, 0.4, 0.3], [7.2, 0.5, -0.4], [0.5, 4.5, 0.5], [7.4, 4.0, -0.2], [3.8, 0.3, 0.1]] as const) {
    const shard = new THREE.Mesh(shardGeo, caveGlow);
    shard.position.set(GARDEN_CAVE_FLOOR.minX + ox, GARDEN_CAVE_FLOOR.y + 0.8, GARDEN_CAVE_FLOOR.minZ + oz);
    shard.rotation.z = tilt;
    group.add(shard);
  }

  // Waterfall curtain, falling foam streaks and mist where it meets the clouds.
  const w = GARDEN_WATERFALL;
  const height = w.topY - w.bottomY;
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x7dd3fc, emissiveIntensity: 0.25, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false });
  const mistMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.45, depthWrite: false });
  const curtainGeo = new THREE.PlaneGeometry(w.halfWidth * 2, height);
  const puffGeo = new THREE.IcosahedronGeometry(1, 1);
  ctx.disposableMaterials.push(curtainMat, foamMat, mistMat);
  ctx.disposableGeometries.push(curtainGeo, puffGeo);
  const curtain = new THREE.Mesh(curtainGeo, curtainMat);
  curtain.position.set(w.x, w.topY - height / 2, w.z);
  group.add(curtain);
  const foam: THREE.Mesh[] = [];
  for (let i = 0; i < FOAM_STREAKS; i++) {
    const streak = new THREE.Mesh(box, foamMat);
    streak.scale.set(0.25, 1.2, 0.08);
    streak.position.set(w.x - w.halfWidth + 0.3 + ((i * 0.618) % 1) * (w.halfWidth * 2 - 0.6), w.topY, w.z + 0.08);
    group.add(streak);
    foam.push(streak);
  }
  const mist: THREE.Mesh[] = [];
  for (let i = 0; i < MIST_PUFFS; i++) {
    const puff = new THREE.Mesh(puffGeo, mistMat);
    const baseScale = 2.2 + (i % 3) * 0.9;
    puff.userData.baseScale = baseScale;
    puff.position.set(w.x + (i - MIST_PUFFS / 2) * 1.4, w.bottomY + (i % 2) * 1.2, w.z + ((i * 0.37) % 1) * 2 - 1);
    group.add(puff);
    mist.push(puff);
  }
  return { foam, mist, caveGlow };
}
// #endregion

// #region Sky Tree
function buildSkyTree(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const t = SKY_TREE;
  const trunkGeo = new THREE.CylinderGeometry(t.topRadius, t.baseRadius, t.height, 12);
  const flareGeo = new THREE.ConeGeometry(1.4, 3.5, 6);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const platformGeo = new THREE.CylinderGeometry(1, 0.85, 0.45, 18);
  ctx.disposableGeometries.push(trunkGeo, flareGeo, canopyGeo, platformGeo);
  const trunk = new THREE.Mesh(trunkGeo, mats.darkWood);
  trunk.position.set(t.x, DECK_Y + t.height / 2, t.z);
  trunk.castShadow = !ctx.isSoftwareGl;
  group.add(trunk);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const flare = new THREE.Mesh(flareGeo, mats.darkWood);
    flare.position.set(t.x + Math.cos(a) * (t.baseRadius + 0.6), DECK_Y + 1.2, t.z + Math.sin(a) * (t.baseRadius + 0.6));
    flare.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    group.add(flare);
  }
  // Canopy above the crown ring, leaving head room over it.
  for (const [ox, oy, oz, sc] of [[0, 9, 0, 7.5], [5, 6, 3, 5], [-5, 6.5, -2, 5.2], [2, 7, -6, 4.8], [-3, 5.5, 5, 4.5]] as const) {
    const leaves = new THREE.Mesh(canopyGeo, mats.leaves);
    leaves.scale.setScalar(sc);
    leaves.position.set(t.x + ox, SKY_TREE_CROWN.y + oy, t.z + oz);
    leaves.castShadow = !ctx.isSoftwareGl;
    group.add(leaves);
  }
  // Crown ring floor.
  const ringGeo = new THREE.RingGeometry(SKY_TREE_CROWN.innerR, SKY_TREE_CROWN.outerR, 40);
  ringGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(ringGeo);
  const woodTwoSided = mats.wood.clone();
  woodTwoSided.side = THREE.DoubleSide;
  ctx.disposableMaterials.push(woodTwoSided);
  const ring = new THREE.Mesh(ringGeo, woodTwoSided);
  ring.position.set(SKY_TREE_CROWN.x, SKY_TREE_CROWN.y, SKY_TREE_CROWN.z);
  group.add(ring);

  for (const p of [SKY_TREE_BRANCH_LOW, SKY_TREE_BRANCH_HIGH]) group.add(...platformMeshes(mats, box, platformGeo, p));
  for (const b of SKY_TREE_BRANCHES) group.add(rampSlab(box, mats.darkWood, b, 0.5));
  buildMushrooms(ctx, mats, group);

  // Vines hanging from the branch platforms.
  const vineGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 4);
  ctx.disposableGeometries.push(vineGeo);
  for (const p of [SKY_TREE_BRANCH_LOW, SKY_TREE_BRANCH_HIGH]) {
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3;
      const len = 1.5 + (k % 3) * 1.2;
      const vine = new THREE.Mesh(vineGeo, mats.leaves);
      vine.scale.y = len;
      vine.position.set(p.x + Math.cos(a) * p.radius * 0.9, p.y - 0.4 - len / 2, p.z + Math.sin(a) * p.radius * 0.9);
      group.add(vine);
    }
  }
}

function platformMeshes(mats: IHarborMaterials, box: THREE.BoxGeometry, geo: THREE.CylinderGeometry, p: IGardenPlatform): THREE.Mesh[] {
  const deck = new THREE.Mesh(geo, mats.wood);
  deck.scale.set(p.radius, 1, p.radius);
  deck.position.set(p.x, p.y - 0.22, p.z);
  const post = boxMesh(box, mats.darkWood, p.x, (DECK_Y + p.y) / 2, p.z, 0.9, p.y - DECK_Y, 0.9);
  return [deck, post];
}

function buildMushrooms(ctx: IWorldModelBuildContext, mats: IHarborMaterials, group: THREE.Group): void {
  const capGeo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.45, 0.6, 1, 10);
  ctx.disposableGeometries.push(capGeo, stemGeo);
  for (const pad of GARDEN_BOUNCE_PADS) {
    const capHeight = 0.5 + pad.radius * 0.15;
    const stemTop = pad.topY - capHeight;
    const stem = new THREE.Mesh(stemGeo, mats.mushroomStem);
    stem.scale.set(1, Math.max(0.3, stemTop - DECK_Y + 0.2), 1);
    stem.position.set(pad.x, (DECK_Y + stemTop) / 2 + 0.1, pad.z);
    const cap = new THREE.Mesh(capGeo, mats.mushroomCap);
    cap.scale.set(pad.radius, capHeight, pad.radius);
    cap.position.set(pad.x, stemTop, pad.z);
    group.add(stem, cap);
  }
}
// #endregion

// #region Root Path
function buildRootPath(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  group.add(rampSlab(box, mats.darkWood, GARDEN_ROOT_RAMP, 0.7));
  const nookGeo = new THREE.CylinderGeometry(GARDEN_ROOT_NOOK.radius, GARDEN_ROOT_NOOK.radius * 0.6, 1.0, 10);
  const rootGeo = new THREE.ConeGeometry(0.5, 1, 6);
  rootGeo.rotateX(Math.PI);
  ctx.disposableGeometries.push(nookGeo, rootGeo);
  const nook = new THREE.Mesh(nookGeo, mats.darkWood);
  nook.position.set(GARDEN_ROOT_NOOK.x, GARDEN_ROOT_NOOK.y - 0.5, GARDEN_ROOT_NOOK.z);
  group.add(nook);

  // Roots hanging under the whole island, densest on the north side around the root path.
  const roots = new THREE.InstancedMesh(rootGeo, mats.darkWood, HANGING_ROOTS);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < HANGING_ROOTS; i++) {
    const ang = -Math.PI / 2 + (i - HANGING_ROOTS / 2) * 0.16 + (i % 2) * 0.05;
    const r = GARDEN.radius * (0.75 + (i % 3) * 0.06);
    const len = 6 + (i % 4) * 2.5;
    q.setFromEuler(new THREE.Euler((i % 3) * 0.08, 0, ((i % 5) - 2) * 0.05));
    m.compose(new THREE.Vector3(GARDEN.x + Math.cos(ang) * r, DECK_Y - 3.0 - len / 2, GARDEN.z + Math.sin(ang) * r), q, new THREE.Vector3(1, len, 1));
    roots.setMatrixAt(i, m);
  }
  roots.instanceMatrix.needsUpdate = true;
  group.add(roots);
}
// #endregion

// #region Dressing
function buildGardenDressing(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  // A few garden trees around the lake and a small ruined arch.
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 5.0, 8);
  const canopyGeo = new THREE.IcosahedronGeometry(2.4, 1);
  ctx.disposableGeometries.push(trunkGeo, canopyGeo);
  for (const [lx, lz, sc] of [[-24, -10, 1.0], [-20, 10, 0.9], [2, 18, 1.1], [-2, -22, 0.95], [24, 14, 0.85], [26, -12, 1.0]] as const) {
    const trunk = new THREE.Mesh(trunkGeo, mats.darkWood);
    trunk.scale.setScalar(sc);
    trunk.position.set(GARDEN.x + lx, DECK_Y + 2.5 * sc, GARDEN.z + lz);
    const canopy = new THREE.Mesh(canopyGeo, mats.leaves);
    canopy.scale.setScalar(sc);
    canopy.position.set(GARDEN.x + lx, DECK_Y + 5.6 * sc, GARDEN.z + lz);
    group.add(trunk, canopy);
  }
  for (const [lx, lz, h] of [[-26, 2, 3.5], [-26, 6, 2.2], [-22, 4, 1.4]] as const) {
    group.add(boxMesh(box, mats.stone, GARDEN.x + lx, DECK_Y + h / 2, GARDEN.z + lz, 1.0, h, 1.0));
  }
  group.add(boxMesh(box, mats.stone, GARDEN.x - 26, DECK_Y + 3.7, GARDEN.z + 4, 1.0, 0.5, 5.0));

  // Glowing flowers spread over the deck (golden-angle spiral, skipping the lake).
  const flowerGeo = new THREE.ConeGeometry(0.22, 0.5, 6);
  flowerGeo.rotateX(Math.PI);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.6 });
  ctx.disposableGeometries.push(flowerGeo);
  ctx.disposableMaterials.push(flowerMat);
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, GARDEN_FLOWER_COUNT);
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  let placed = 0;
  for (let i = 0; placed < GARDEN_FLOWER_COUNT && i < GARDEN_FLOWER_COUNT * 3; i++) {
    const r = Math.sqrt((i + 0.5) / (GARDEN_FLOWER_COUNT * 3)) * GARDEN.radius * 0.92;
    const ang = i * 2.39996;
    const x = GARDEN.x + Math.cos(ang) * r;
    const z = GARDEN.z + Math.sin(ang) * r;
    const inLake = ((x - GARDEN_LAKE.x) / (GARDEN_LAKE.rx + 1.5)) ** 2 + ((z - GARDEN_LAKE.z) / (GARDEN_LAKE.rz + 1.5)) ** 2 < 1;
    if (inLake || Math.abs(x - GARDEN_STREAM.x) < GARDEN_STREAM.halfWidth + 0.5) continue;
    m.makeTranslation(x, DECK_Y + 0.3, z);
    flowers.setMatrixAt(placed, m);
    flowers.setColorAt(placed, color.setHex(FLOWER_COLORS[placed % FLOWER_COLORS.length]));
    placed++;
  }
  flowers.count = placed;
  flowers.instanceMatrix.needsUpdate = true;
  group.add(flowers);
}
// #endregion
