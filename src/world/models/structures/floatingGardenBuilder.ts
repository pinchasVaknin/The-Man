// ============================================================================
// MODULE: World / Models / Skybound Isles / Floating Garden (World Tree Island)
// DESIGN: Every mesh is placed from the Floating Garden domain data (foreground lake with
//         rock-spring waterfall, stream & arched bridge, cliff waterfall & cave, colossal
//         ultra-wide hollow World Tree at the back of the island, interior mushroom parkour
//         to the crystal & chest, exterior branch climb around the trunk), and railings/walls
//         are drawn from the solid boxes so what you see matches collision.
// SUMMARY: Builds and animates the World Tree Island: open front entry deck with foreground
//          lake and waterfalls, ultra-wide hollow World Tree at the rear wrapping the island,
//          interior mushroom parkour & exterior branch climb, and real 3D forest trees.
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
  SKY_TREE_HOLLOW_PADS,
  SKY_TREE_HOLLOW_CHEST_SPOT,
  SKY_TREE_ROOT_LANDING,
  GARDEN_BOUNCE_PADS,
  SKY_TREE_BRANCH_LOW,
  SKY_TREE_BRANCH_HIGH,
  SKY_TREE_CROWN,
  SKY_TREE_BRANCHES,
  GARDEN_ROOT_RAMP,
  GARDEN_ROOT_NOOK,
  GARDEN_SOLID_BOXES,
  type IGardenPlatform,
} from '../../domain/landmarksRegistry';
import {
  SKY_TREE_HOLLOW_ENTRANCE,
  SKY_TREE_ROOT_CLIMB_START,
  GARDEN_FOOTBRIDGE,
} from '../../domain/landmarks/skyboundIsles/floatingGardenLayout';
import {
  boxMesh,
  buildInstancedSkyTrees,
  buildRailInstances,
  createMaterials,
  deckSlab,
  rampSlab,
  type IHarborMaterials,
} from './skyHarborShared';
import type { IWorldModelBuildContext } from '../types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Floating Garden builder hands back to the frame loop. */
export interface IFloatingGardenBuildResult {
  readonly group: THREE.Group;
  /** Animates the waterfalls, their mist, and the World Tree's glowing runes. */
  readonly update: (elapsedSec: number) => void;
}
// #endregion

// #region Tuning
const GARDEN = getSkyIsland('floating-garden')!;
const DECK_Y = GARDEN.deckY;
const DECAL_LIFT_M = 0.03;
const FOAM_STREAKS = 16;
const MIST_PUFFS = 8;
const GARDEN_FLOWER_COUNT = 120;
const HANGING_ROOTS = 24;
const FLOWER_COLORS = [0xf0abfc, 0x93c5fd, 0xfde68a, 0x99f6e4, 0xfda4af, 0xc4b5fd] as const;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the World Tree Island (Floating Garden) and returns its frame update.
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
  const treeAnim = buildColossalWorldTree(ctx, mats, box, group);
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
      waterfall.caveGlow.emissiveIntensity = 1.25 + Math.sin(elapsedSec * 1.7) * 0.35;
      treeAnim.runeMat.emissiveIntensity = 1.6 + Math.sin(elapsedSec * 2.1) * 0.45;
    },
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Lake And Stream
function buildLakeAndStream(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const discGeo = new THREE.CylinderGeometry(1, 1, 0.08, 40);
  const padGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.04, 12, 1, false, 0.4, Math.PI * 1.8);
  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  const springFallGeo = new THREE.CylinderGeometry(0.65, 1.35, 5.8, 12, 1, true);
  const mistPuffGeo = new THREE.IcosahedronGeometry(1, 1);
  ctx.disposableGeometries.push(discGeo, padGeo, rockGeo, springFallGeo, mistPuffGeo);

  // Foreground Lake at the front-west of the island (`GARDEN_LAKE`).
  const lake = new THREE.Mesh(discGeo, mats.water);
  lake.scale.set(GARDEN_LAKE.rx, 1, GARDEN_LAKE.rz);
  lake.position.set(GARDEN_LAKE.x, DECK_Y + DECAL_LIFT_M * 2, GARDEN_LAKE.z);
  const shore = new THREE.Mesh(discGeo, mats.stone);
  shore.scale.set(GARDEN_LAKE.rx + 1.4, 1, GARDEN_LAKE.rz + 1.4);
  shore.position.set(GARDEN_LAKE.x, DECK_Y + DECAL_LIFT_M, GARDEN_LAKE.z);
  const goldRim = new THREE.Mesh(discGeo, mats.gold);
  goldRim.scale.set(GARDEN_LAKE.rx + 1.7, 0.65, GARDEN_LAKE.rz + 1.7);
  goldRim.position.set(GARDEN_LAKE.x, DECK_Y + DECAL_LIFT_M * 0.5, GARDEN_LAKE.z);
  group.add(goldRim, shore, lake);

  // Scenic rock-spring waterfall cascading directly into the foreground lake on its NW edge so the player
  // sees a picturesque lake with dual waterfalls right at the front of the island!
  const springMat = new THREE.MeshStandardMaterial({
    color: 0xbfe8ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.42,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const springMistMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  ctx.disposableMaterials.push(springMat, springMistMat);

  const springX = GARDEN_LAKE.x - GARDEN_LAKE.rx * 0.78;
  const springZ = GARDEN_LAKE.z - GARDEN_LAKE.rz * 0.55;
  for (const [ox, oy, oz, sx, sy, sz] of [
    [0, 2.2, 0, 3.2, 2.8, 2.8],
    [-1.8, 3.6, -1.2, 2.6, 3.8, 2.4],
    [1.6, 1.8, -1.6, 2.4, 2.2, 2.2],
    [-0.6, 5.0, -0.8, 2.1, 2.4, 2.0],
  ] as const) {
    const boulder = new THREE.Mesh(rockGeo, mats.darkStone);
    boulder.scale.set(sx, sy, sz);
    boulder.position.set(springX + ox, DECK_Y + oy, springZ + oz);
    group.add(boulder);
  }
  for (const [fx, fy, fz, sc] of [
    [0.6, 2.9, 0.6, 1.0],
    [1.8, 1.9, -0.4, 0.78],
  ] as const) {
    const fall = new THREE.Mesh(springFallGeo, springMat);
    fall.scale.set(sc, sc, sc);
    fall.position.set(springX + fx, DECK_Y + fy, springZ + fz);
    fall.rotation.set(0.18, 0.5, -0.22);
    group.add(fall);
    const splash = new THREE.Mesh(mistPuffGeo, springMistMat);
    splash.scale.set(1.5 * sc, 0.55, 1.5 * sc);
    splash.position.set(springX + fx + 0.7, DECK_Y + 0.25, springZ + fz + 0.5);
    group.add(splash);
  }

  for (let k = 0; k < 8; k++) {
    const ang = k * 2.1;
    const pad = new THREE.Mesh(padGeo, mats.leaves);
    pad.position.set(
      GARDEN_LAKE.x + Math.cos(ang) * GARDEN_LAKE.rx * 0.55,
      DECK_Y + DECAL_LIFT_M * 4,
      GARDEN_LAKE.z + Math.sin(ang) * GARDEN_LAKE.rz * 0.55
    );
    pad.rotation.y = ang;
    group.add(pad);
  }

  const s = GARDEN_STREAM;
  const length = s.toZ - s.fromZ;
  group.add(boxMesh(box, mats.stone, s.x, DECK_Y + DECAL_LIFT_M, (s.fromZ + s.toZ) / 2, s.halfWidth * 2 + 1.1, 0.08, length));
  group.add(boxMesh(box, mats.water, s.x, DECK_Y + DECAL_LIFT_M * 3, (s.fromZ + s.toZ) / 2, s.halfWidth * 2, 0.08, length));

  // Flat marble footbridge over the stream, connecting the central plaza to the west side. The walkway is level
  // with the deck; the two side railings are real collision rails (see GARDEN_FOOTBRIDGE) and are drawn here
  // as posts with lanterns and a handrail.
  const bridge = GARDEN_FOOTBRIDGE;
  const deckLength = bridge.halfLength * 2;
  group.add(boxMesh(box, mats.marble, bridge.x, DECK_Y + 0.05, bridge.z, deckLength, 0.1, bridge.halfWidth * 2 + 0.3));
  group.add(boxMesh(box, mats.gold, bridge.x, DECK_Y + 0.11, bridge.z, deckLength - 0.4, 0.03, 0.9));
  for (const side of [-1, 1]) {
    const railZ = bridge.z + side * (bridge.halfWidth + 0.15);
    group.add(boxMesh(box, mats.gold, bridge.x, DECK_Y + 1.02, railZ, deckLength, 0.08, 0.14));
    for (const dx of [-bridge.halfLength + 0.15, -bridge.halfLength / 2, 0, bridge.halfLength / 2, bridge.halfLength - 0.15]) {
      group.add(boxMesh(box, mats.marble, bridge.x + dx, DECK_Y + 0.55, railZ, 0.22, 1.1, 0.22));
    }
    for (const dx of [-bridge.halfLength + 0.15, bridge.halfLength - 0.15]) {
      group.add(boxMesh(box, mats.lanternGlow, bridge.x + dx, DECK_Y + 1.28, railZ, 0.2, 0.2, 0.2));
    }
  }
}
// #endregion

// #region Waterfall And Cave
function buildWaterfallAndCave(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): { foam: THREE.Mesh[]; mist: THREE.Mesh[]; caveGlow: THREE.MeshStandardMaterial } {
  group.add(deckSlab(box, mats.stone, GARDEN_WATERFALL_LIP, 0.6));
  group.add(deckSlab(box, mats.darkStone, GARDEN_CAVE_FLOOR, 0.8));
  group.add(deckSlab(box, mats.darkStone, GARDEN_CAVE_LEDGE, 0.8));
  group.add(rampSlab(box, mats.stone, GARDEN_CAVE_RAMP, 0.6));

  // Stone arch portal at the top of the Waterfall Cave staircase (`GARDEN_CAVE_RAMP.ax, az`).
  const cavePortalGeo = new THREE.TorusGeometry(1.65, 0.24, 8, 18, Math.PI);
  ctx.disposableGeometries.push(cavePortalGeo);
  const cavePortal = new THREE.Mesh(cavePortalGeo, mats.stone);
  cavePortal.position.set(GARDEN_CAVE_RAMP.ax, DECK_Y + 1.8, GARDEN_CAVE_RAMP.az);
  cavePortal.rotation.y = Math.PI / 2;
  group.add(cavePortal);

  for (const wall of GARDEN_SOLID_BOXES.filter((b) => b.id.startsWith('garden-cave-wall'))) {
    group.add(
      boxMesh(
        box,
        mats.darkStone,
        (wall.minX + wall.maxX) / 2,
        (wall.minY + wall.maxY) / 2,
        (wall.minZ + wall.maxZ) / 2,
        wall.maxX - wall.minX + 0.6,
        wall.maxY - wall.minY,
        wall.maxZ - wall.minZ + 0.6
      )
    );
  }

  const rockGeo = new THREE.ConeGeometry(1, 1, 7);
  rockGeo.rotateX(Math.PI);
  ctx.disposableGeometries.push(rockGeo);
  const underCave = new THREE.Mesh(rockGeo, mats.darkStone);
  underCave.scale.set(6.5, 9.0, 5.0);
  underCave.position.set(
    (GARDEN_CAVE_FLOOR.minX + GARDEN_CAVE_FLOOR.maxX) / 2,
    GARDEN_CAVE_FLOOR.y - 5.3,
    (GARDEN_CAVE_FLOOR.minZ + GARDEN_CAVE_LEDGE.maxZ) / 2
  );
  group.add(underCave);

  const caveGlow = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 1.35, roughness: 0.2 });
  ctx.disposableMaterials.push(caveGlow);
  const shardGeo = new THREE.OctahedronGeometry(0.45, 0);
  shardGeo.scale(1, 2.2, 1);
  ctx.disposableGeometries.push(shardGeo);
  for (const [ox, oz, tilt] of [
    [0.6, 0.4, 0.3],
    [7.2, 0.5, -0.4],
    [0.5, 4.5, 0.5],
    [7.4, 4.0, -0.2],
    [3.8, 0.3, 0.1],
  ] as const) {
    const shard = new THREE.Mesh(shardGeo, caveGlow);
    shard.position.set(GARDEN_CAVE_FLOOR.minX + ox, GARDEN_CAVE_FLOOR.y + 0.8, GARDEN_CAVE_FLOOR.minZ + oz);
    shard.rotation.z = tilt;
    group.add(shard);
  }

  const w = GARDEN_WATERFALL;
  const height = w.topY - w.bottomY;
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xbfe8ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false });
  const mistMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.48, depthWrite: false });
  const curtainGeo = new THREE.PlaneGeometry(w.halfWidth * 2, height);
  const sideFallGeo = new THREE.CylinderGeometry(0.85, 1.6, 26, 10, 1, true);
  const puffGeo = new THREE.IcosahedronGeometry(1, 1);
  ctx.disposableMaterials.push(curtainMat, foamMat, mistMat);
  ctx.disposableGeometries.push(curtainGeo, sideFallGeo, puffGeo);

  const curtain = new THREE.Mesh(curtainGeo, curtainMat);
  curtain.position.set(w.x, w.topY - height / 2, w.z);
  group.add(curtain);

  // Additional scenic cliff waterfalls cascading off the front-west and east island edges.
  for (const [lx, lz, rotY] of [
    [-26.5, -24.0, 0.5],
    [-33.5, -6.0, 0.35],
    [32.5, 8.0, -0.45],
  ] as const) {
    const cascade = new THREE.Mesh(sideFallGeo, curtainMat);
    cascade.position.set(GARDEN.x + lx, DECK_Y - 12.5, GARDEN.z + lz);
    cascade.rotation.y = rotY;
    group.add(cascade);
    const topPool = new THREE.Mesh(puffGeo, mistMat);
    topPool.scale.set(1.8, 0.6, 1.8);
    topPool.position.set(GARDEN.x + lx, DECK_Y - 0.1, GARDEN.z + lz);
    group.add(topPool);
  }

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
    const baseScale = 2.4 + (i % 3) * 0.9;
    puff.userData.baseScale = baseScale;
    puff.position.set(w.x + (i - MIST_PUFFS / 2) * 1.4, w.bottomY + (i % 2) * 1.2, w.z + ((i * 0.37) % 1) * 2 - 1);
    group.add(puff);
    mist.push(puff);
  }
  return { foam, mist, caveGlow };
}
// #endregion

// #region Colossal World Tree (Rebuilt From Scratch — Ultra-Wide Rear Sanctum, No Cylinder Root Logs)
function buildColossalWorldTree(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): { runeMat: THREE.MeshStandardMaterial } {
  const t = SKY_TREE;

  // Deeply grooved procedural bark textures so the colossal World Tree looks organic and ancient.
  const barkColorTex = ctx.textures.barkAlbedo;
  const barkBumpTex = ctx.textures.barkBump;

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x6e4a30,
    map: barkColorTex,
    bumpMap: barkBumpTex,
    bumpScale: 0.18,
    roughness: 0.9,
    metalness: 0.04,
  });
  const innerBarkMat = new THREE.MeshStandardMaterial({
    color: 0x4a301e,
    map: barkColorTex,
    bumpMap: barkBumpTex,
    bumpScale: 0.12,
    roughness: 0.94,
    side: THREE.DoubleSide,
  });
  const runeMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 1.7, roughness: 0.25 });
  const goldLeafMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xf59e0b, emissiveIntensity: 0.75, roughness: 0.55 });
  const emeraldLeafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x0d9488, emissiveIntensity: 0.45, roughness: 0.65 });
  const cyanLeafMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 0.9, roughness: 0.4 });
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0xa5f3fc, emissive: 0x22d3ee, emissiveIntensity: 1.8, roughness: 0.15, metalness: 0.2 });
  const magentaMushroomMat = new THREE.MeshStandardMaterial({ color: 0xe879f9, emissive: 0xc026d3, emissiveIntensity: 1.15, roughness: 0.35 });
  ctx.disposableMaterials.push(barkMat, innerBarkMat, runeMat, goldLeafMat, emeraldLeafMat, cyanLeafMat, crystalMat, magentaMushroomMat);

  const ribGeo = new THREE.CylinderGeometry(0.95, 1.75, 1, 12);
  const boughGeo = new THREE.CylinderGeometry(0.55, 1.85, 1, 10);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const platformGeo = new THREE.CylinderGeometry(1, 0.84, 0.52, 24);
  const platformRimGeo = new THREE.TorusGeometry(1, 0.08, 8, 28);
  platformRimGeo.rotateX(Math.PI / 2);
  const crystalGeo = new THREE.OctahedronGeometry(1, 0);
  const crownCollarGeo = new THREE.TorusGeometry(SKY_TREE_CROWN.outerR - 0.15, 0.95, 12, 48);
  crownCollarGeo.rotateX(Math.PI / 2);

  // Sculpted flared trunk base skirt (open at the North entrance: theta = Math.PI in CylinderGeometry, theta = Math.PI/2 in RingGeometry)
  const cylArcStart = Math.PI + 0.64;
  const cylArcLength = Math.PI * 2 - 1.28;
  const ringArcStart = Math.PI / 2 + 0.64;
  const ringArcLength = Math.PI * 2 - 1.28;
  const baseFlareGeo = new THREE.CylinderGeometry(t.hollowOuterR + 0.1, t.baseRadius, 3.1, 36, 1, true, cylArcStart, cylArcLength);
  const innerShellGeo = new THREE.CylinderGeometry(t.hollowInnerR + 0.12, t.hollowInnerR + 0.22, SKY_TREE_CROWN.y - DECK_Y, 32, 1, true, cylArcStart, cylArcLength);
  const groundSkirtGeo = new THREE.RingGeometry(t.hollowInnerR - 0.2, t.baseRadius + 0.6, 44, 1, ringArcStart, ringArcLength);
  groundSkirtGeo.rotateX(-Math.PI / 2);
  ctx.disposableGeometries.push(
    ribGeo,
    boughGeo,
    canopyGeo,
    platformGeo,
    platformRimGeo,
    crystalGeo,
    crownCollarGeo,
    baseFlareGeo,
    innerShellGeo,
    groundSkirtGeo
  );

  // 1. Ultra-wide hollow lower & mid trunk: continuous inner bark shell + sculpted outer bark buttresses + flared base collar.
  const trunkHeight = SKY_TREE_CROWN.y - DECK_Y;
  const innerShell = new THREE.Mesh(innerShellGeo, innerBarkMat);
  innerShell.position.set(t.x, DECK_Y + trunkHeight / 2, t.z);
  group.add(innerShell);

  const baseFlare = new THREE.Mesh(baseFlareGeo, barkMat);
  baseFlare.position.set(t.x, DECK_Y + 1.55, t.z);
  group.add(baseFlare);

  const groundSkirt = new THREE.Mesh(groundSkirtGeo, barkMat);
  groundSkirt.position.set(t.x, DECK_Y + DECAL_LIFT_M, t.z);
  group.add(groundSkirt);

  const wallBoxes = GARDEN_SOLID_BOXES.filter((b) => b.id.startsWith('sky-tree-hollow-wall-'));
  for (let i = 0; i < wallBoxes.length; i++) {
    const w = wallBoxes[i];
    const cx = (w.minX + w.maxX) / 2;
    const cz = (w.minZ + w.maxZ) / 2;
    const rib = new THREE.Mesh(ribGeo, barkMat);
    rib.scale.set(1.48, trunkHeight, 1.48);
    rib.position.set(cx, DECK_Y + trunkHeight / 2, cz);
    rib.castShadow = !ctx.isSoftwareGl;
    group.add(rib);

    // Glowing cyan rune veins embedded into the exterior bark buttresses and flush ground rune lines.
    if (i % 2 === 0) {
      const ang = Math.atan2(cz - t.z, cx - t.x);
      const runeStrip = boxMesh(
        box,
        runeMat,
        t.x + Math.cos(ang) * (t.hollowOuterR + 0.55),
        DECK_Y + trunkHeight * 0.52,
        t.z + Math.sin(ang) * (t.hollowOuterR + 0.55),
        0.26,
        trunkHeight * 0.8,
        0.26
      );
      runeStrip.rotation.z = (i % 4 === 0 ? 1 : -1) * 0.1;
      group.add(runeStrip);

      // Flush glowing rune vein in the ground collar (0.04m high so it never sticks up like a log).
      const groundVeinLen = 4.2;
      const veinMidR = t.hollowOuterR + groundVeinLen * 0.5;
      const groundVein = boxMesh(
        box,
        runeMat,
        t.x + Math.cos(ang) * veinMidR,
        DECK_Y + DECAL_LIFT_M * 2,
        t.z + Math.sin(ang) * veinMidR,
        groundVeinLen,
        0.05,
        0.28
      );
      groundVein.rotation.y = -ang;
      group.add(groundVein);
    }
  }

  // Organic gnarled bark collar wrapping the underside of the Crown Sanctum (`SKY_TREE_CROWN`).
  const crownCollar = new THREE.Mesh(crownCollarGeo, barkMat);
  crownCollar.position.set(SKY_TREE_CROWN.x, SKY_TREE_CROWN.y - 0.38, SKY_TREE_CROWN.z);
  group.add(crownCollar);

  // 2. Grand North-facing Hollow Entrance Archway (`SKY_TREE_HOLLOW_ENTRANCE`) facing the center of the island!
  const doorX = SKY_TREE_HOLLOW_ENTRANCE.x;
  const doorZ = SKY_TREE_HOLLOW_ENTRANCE.z;
  const doorArchGeo = new THREE.TorusGeometry(3.3, 0.55, 10, 28, Math.PI);
  const runeRingGeo = new THREE.RingGeometry(2.4, 5.2, 40);
  runeRingGeo.rotateX(-Math.PI / 2);
  ctx.disposableGeometries.push(doorArchGeo, runeRingGeo);

  const doorArch = new THREE.Mesh(doorArchGeo, barkMat);
  doorArch.position.set(doorX, DECK_Y + 3.2, doorZ);
  doorArch.rotation.y = -t.entranceAngle + Math.PI / 2;
  group.add(doorArch);

  const doorRuneArch = new THREE.Mesh(doorArchGeo, runeMat);
  doorRuneArch.scale.set(1.03, 1.03, 0.52);
  doorRuneArch.position.set(doorX, DECK_Y + 3.25, doorZ);
  doorRuneArch.rotation.y = -t.entranceAngle + Math.PI / 2;
  group.add(doorRuneArch);

  // Twin living-wood portal pillars with floating cyan crystals flanking the North hollow entrance.
  for (const side of [-1, 1]) {
    const px = doorX + side * 3.35;
    const pz = doorZ - 0.35;
    group.add(boxMesh(box, barkMat, px, DECK_Y + 1.8, pz, 0.72, 3.6, 0.72));
    group.add(boxMesh(box, mats.gold, px, DECK_Y + 3.65, pz, 0.86, 0.22, 0.86));
    const portalGem = new THREE.Mesh(crystalGeo, crystalMat);
    portalGem.scale.set(0.38, 0.88, 0.38);
    portalGem.position.set(px, DECK_Y + 4.35, pz);
    group.add(portalGem);
  }

  // Exterior Branch Staircase Threshold Arch at `SKY_TREE_ROOT_CLIMB_START` on the east flank of the World Tree.
  const climbStart = SKY_TREE_ROOT_CLIMB_START;
  const climbArch = new THREE.Mesh(doorArchGeo, barkMat);
  climbArch.scale.set(0.65, 0.72, 0.65);
  climbArch.position.set(climbStart.x, DECK_Y + 2.2, climbStart.z);
  climbArch.rotation.y = 0.22;
  const climbRuneArch = new THREE.Mesh(doorArchGeo, runeMat);
  climbRuneArch.scale.set(0.67, 0.74, 0.36);
  climbRuneArch.position.set(climbStart.x, DECK_Y + 2.25, climbStart.z);
  climbRuneArch.rotation.y = 0.22;
  group.add(climbArch, climbRuneArch);
  for (const dx of [-1.95, 1.95]) {
    group.add(boxMesh(box, barkMat, climbStart.x + dx, DECK_Y + 1.15, climbStart.z, 0.48, 2.3, 0.48));
    const lantern = new THREE.Mesh(crystalGeo, crystalMat);
    lantern.scale.set(0.28, 0.65, 0.28);
    lantern.position.set(climbStart.x + dx, DECK_Y + 2.65, climbStart.z);
    group.add(lantern);
  }

  // Glowing floor sanctum decal inside the wide hollow trunk (`r = 5.2m`).
  const hollowFloorRing = new THREE.Mesh(runeRingGeo, runeMat);
  hollowFloorRing.position.set(t.x, DECK_Y + DECAL_LIFT_M * 2, t.z);
  group.add(hollowFloorRing);

  // Interior glowing crystals lining the hollow bark walls to illuminate the vertical mushroom parkour.
  for (let k = 0; k < 14; k++) {
    const ang = t.entranceAngle + 0.72 + (k / 14) * (Math.PI * 2 - 1.44);
    const cy = DECK_Y + 1.4 + (k % 6) * 1.65;
    const shard = new THREE.Mesh(crystalGeo, k % 2 === 0 ? crystalMat : runeMat);
    shard.scale.set(0.34, 0.9, 0.34);
    shard.position.set(t.x + Math.cos(ang) * (t.hollowInnerR - 0.22), cy, t.z + Math.sin(ang) * (t.hollowInnerR - 0.22));
    shard.rotation.set(Math.sin(ang) * 0.4, ang, -Math.cos(ang) * 0.4);
    group.add(shard);
  }

  // 3. Upper colossal trunk boughs rising from the outer rim of SKY_TREE_CROWN up into the overarching island canopy.
  const upperStartY = SKY_TREE_CROWN.y + 5.0;
  const upperHeight = DECK_Y + t.height - upperStartY;
  const boughCount = 14;
  for (let i = 0; i < boughCount; i++) {
    const a = (i / boughCount) * Math.PI * 2;
    const bough = new THREE.Mesh(ribGeo, barkMat);
    bough.scale.set(1.85, upperHeight, 1.85);
    bough.position.set(t.x + Math.cos(a) * 8.0, upperStartY + upperHeight / 2, t.z + Math.sin(a) * 8.0);
    bough.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1);
    bough.castShadow = !ctx.isSoftwareGl;
    group.add(bough);

    // Bark support columns around the outer perimeter of the Crown Sanctum (`r = outerR - 0.35`) leaving the NW branch arrival clear.
    if (i % 2 === 0 && Math.abs(Math.sin(a + Math.PI * 0.65)) > 0.42) {
      const pillarH = 6.2;
      const archPillar = new THREE.Mesh(ribGeo, barkMat);
      archPillar.scale.set(0.95, pillarH, 0.95);
      archPillar.position.set(
        t.x + Math.cos(a) * (SKY_TREE_CROWN.outerR - 0.35),
        SKY_TREE_CROWN.y + pillarH / 2 - 0.4,
        t.z + Math.sin(a) * (SKY_TREE_CROWN.outerR - 0.35)
      );
      group.add(archPillar);

      const upperRune = boxMesh(
        box,
        runeMat,
        t.x + Math.cos(a) * 9.1,
        upperStartY + upperHeight * 0.45,
        t.z + Math.sin(a) * 9.1,
        0.32,
        upperHeight * 0.75,
        0.32
      );
      group.add(upperRune);
    }
  }

  // Wooden canopy (awning) around the base of the upper trunk (`y = upperStartY + 1.4`), replacing the ring of
  // leaf blobs: a shallow plank roof sloping outward from the boughs, a heavy rim beam with a gold trim, and
  // radial rafters underneath. It is a roof only; the crown ring below stays open and walkable.
  {
    const roofY = upperStartY + 1.4;
    const innerR = 6.9;
    const outerR = 11.2;
    const rise = 2.1;
    const roofGeo = new THREE.CylinderGeometry(innerR, outerR, rise, 56, 1, true);
    const rimGeo = new THREE.TorusGeometry(outerR, 0.26, 8, 56);
    rimGeo.rotateX(Math.PI / 2);
    const trimGeo = new THREE.TorusGeometry(outerR + 0.1, 0.07, 6, 56);
    trimGeo.rotateX(Math.PI / 2);
    ctx.disposableGeometries.push(roofGeo, rimGeo, trimGeo);
    const roofMat = mats.wood.clone();
    roofMat.side = THREE.DoubleSide;
    ctx.disposableMaterials.push(roofMat);

    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(t.x, roofY, t.z);
    roof.castShadow = !ctx.isSoftwareGl;
    const rim = new THREE.Mesh(rimGeo, mats.darkWood);
    rim.position.set(t.x, roofY - rise / 2, t.z);
    const trim = new THREE.Mesh(trimGeo, mats.gold);
    trim.position.set(t.x, roofY - rise / 2 - 0.02, t.z);
    group.add(roof, rim, trim);

    // Radial rafters: boxes laid along the slope from the inner edge down to the rim.
    const rafterCount = 16;
    const slope = Math.atan2(rise, outerR - innerR);
    const rafterLength = Math.hypot(outerR - innerR, rise);
    for (let i = 0; i < rafterCount; i++) {
      const a = (i / rafterCount) * Math.PI * 2;
      const midR = (innerR + outerR) / 2;
      const rafter = boxMesh(box, mats.darkWood, 0, 0, 0, rafterLength, 0.22, 0.3);
      rafter.position.set(t.x + Math.cos(a) * midR, roofY - 0.18, t.z + Math.sin(a) * midR);
      rafter.rotation.set(0, -a, -slope, 'YZX');
      group.add(rafter);
    }
  }

  // 4. Fourteen monumental primary canopy branches fanning out to `r = 48m` wrapping around the island!
  const canopyBaseY = DECK_Y + t.height * 0.6;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.12;
    const branchLen = 28.0 + (i % 3) * 6.0;
    const elevate = 0.34 + (i % 2) * 0.12;
    const bigBranch = new THREE.Mesh(boughGeo, barkMat);
    bigBranch.scale.set(1.75, branchLen, 1.75);
    const midDist = 7.5 + Math.cos(elevate) * (branchLen * 0.45);
    const midY = canopyBaseY + (i % 3) * 3.5 + Math.sin(elevate) * (branchLen * 0.45);
    bigBranch.position.set(t.x + Math.cos(a) * midDist, midY, t.z + Math.sin(a) * midDist);
    bigBranch.rotation.set(0, -a, -(Math.PI / 2 - elevate));
    bigBranch.castShadow = !ctx.isSoftwareGl;
    group.add(bigBranch);

    for (const frac of [0.48, 0.76, 1.04]) {
      const fx = t.x + Math.cos(a) * (7.0 + Math.cos(elevate) * branchLen * frac);
      const fy = canopyBaseY + (i % 3) * 3.5 + Math.sin(elevate) * branchLen * frac + 2.4;
      const fz = t.z + Math.sin(a) * (7.0 + Math.cos(elevate) * branchLen * frac);
      const leafMatChoice = frac > 0.9 ? goldLeafMat : i % 3 === 0 ? cyanLeafMat : emeraldLeafMat;
      const cluster = new THREE.Mesh(canopyGeo, leafMatChoice);
      const rad = (frac > 0.9 ? 8.6 : 7.0) + (i % 3) * 1.5;
      cluster.scale.set(rad * 1.3, rad * 0.74, rad * 1.3);
      cluster.position.set(fx, fy, fz);
      cluster.castShadow = !ctx.isSoftwareGl;
      group.add(cluster);

      const tendril = boxMesh(
        box,
        i % 2 === 0 ? runeMat : goldLeafMat,
        fx,
        fy - rad * 0.65 - 3.4,
        fz,
        0.14,
        5.8 + (i % 3) * 2.2,
        0.14
      );
      group.add(tendril);
    }
  }

  // Central crown dome high atop the World Tree.
  const apexDome = new THREE.Mesh(canopyGeo, goldLeafMat);
  apexDome.scale.set(22.0, 10.5, 22.0);
  apexDome.position.set(t.x, DECK_Y + t.height + 3.2, t.z);
  group.add(apexDome);

  // 5. Crown Sanctum Ring Floor (`SKY_TREE_CROWN`), Heart Crystal Cluster, and Sanctum Treasure Chest.
  const ringGeo = new THREE.RingGeometry(SKY_TREE_CROWN.innerR, SKY_TREE_CROWN.outerR, 48);
  ringGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(ringGeo);
  const woodTwoSided = mats.wood.clone();
  woodTwoSided.side = THREE.DoubleSide;
  ctx.disposableMaterials.push(woodTwoSided);
  const ring = new THREE.Mesh(ringGeo, woodTwoSided);
  ring.position.set(SKY_TREE_CROWN.x, SKY_TREE_CROWN.y, SKY_TREE_CROWN.z);
  group.add(ring);

  const innerRimGeo = new THREE.TorusGeometry(SKY_TREE_CROWN.innerR + 0.1, 0.14, 8, 36);
  innerRimGeo.rotateX(Math.PI / 2);
  const outerRimGeo = new THREE.TorusGeometry(SKY_TREE_CROWN.outerR - 0.12, 0.16, 8, 48);
  outerRimGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(innerRimGeo, outerRimGeo);
  const innerRim = new THREE.Mesh(innerRimGeo, runeMat);
  innerRim.position.set(SKY_TREE_CROWN.x, SKY_TREE_CROWN.y + 0.08, SKY_TREE_CROWN.z);
  const outerRim = new THREE.Mesh(outerRimGeo, mats.gold);
  outerRim.position.set(SKY_TREE_CROWN.x, SKY_TREE_CROWN.y + 0.08, SKY_TREE_CROWN.z);
  group.add(innerRim, outerRim);

  // Ornate Treasure Chest on the South rim of the Crown Sanctum (`SKY_TREE_HOLLOW_CHEST_SPOT`).
  const cs = SKY_TREE_HOLLOW_CHEST_SPOT;
  group.add(boxMesh(box, mats.stone, cs.x, cs.y + 0.12, cs.z, 1.5, 0.24, 1.1));
  group.add(boxMesh(box, mats.darkWood, cs.x, cs.y + 0.48, cs.z, 1.1, 0.52, 0.74));
  group.add(boxMesh(box, mats.gold, cs.x, cs.y + 0.78, cs.z, 1.14, 0.22, 0.78));
  group.add(boxMesh(box, runeMat, cs.x, cs.y + 0.58, cs.z - 0.38, 0.22, 0.22, 0.08));

  // 6. Walkable exterior platforms (`SKY_TREE_ROOT_LANDING`, `SKY_TREE_BRANCH_LOW`, `SKY_TREE_BRANCH_HIGH`) supported by organic tree boughs + carved staircase ramps.
  for (const p of [SKY_TREE_ROOT_LANDING, SKY_TREE_BRANCH_LOW, SKY_TREE_BRANCH_HIGH]) {
    group.add(...platformMeshes(mats, barkMat, runeMat, box, platformGeo, platformRimGeo, boughGeo, crystalGeo, p));
  }
  for (const b of SKY_TREE_BRANCHES) {
    group.add(rampSlab(box, mats.darkWood, b, 0.55));
  }
  buildMushrooms(ctx, mats, magentaMushroomMat, runeMat, group);

  // Vines hanging from the branch platforms.
  const vineGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 4);
  ctx.disposableGeometries.push(vineGeo);
  for (const p of [SKY_TREE_ROOT_LANDING, SKY_TREE_BRANCH_LOW, SKY_TREE_BRANCH_HIGH]) {
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3;
      const len = 1.5 + (k % 3) * 1.2;
      const vine = new THREE.Mesh(vineGeo, mats.leaves);
      vine.scale.y = len;
      vine.position.set(p.x + Math.cos(a) * p.radius * 0.9, p.y - 0.4 - len / 2, p.z + Math.sin(a) * p.radius * 0.9);
      group.add(vine);
    }
  }

  return { runeMat };
}

/** Builds each exterior tree climb platform supported by an organic tree bough growing out of the World Tree trunk, plus a golden rim & guiding lantern. */
function platformMeshes(
  mats: IHarborMaterials,
  barkMat: THREE.Material,
  runeMat: THREE.Material,
  box: THREE.BoxGeometry,
  geo: THREE.CylinderGeometry,
  rimGeo: THREE.TorusGeometry,
  boughGeo: THREE.CylinderGeometry,
  crystalGeo: THREE.OctahedronGeometry,
  p: IGardenPlatform
): THREE.Object3D[] {
  const deck = new THREE.Mesh(geo, mats.wood);
  deck.scale.set(p.radius, 1, p.radius);
  deck.position.set(p.x, p.y - 0.24, p.z);

  const rim = new THREE.Mesh(rimGeo, mats.gold);
  rim.scale.set(p.radius - 0.08, p.radius - 0.08, 1);
  rim.position.set(p.x, p.y + 0.02, p.z);

  // Angled organic support bough growing out of the main World Tree trunk to the underside of the platform.
  const ang = Math.atan2(p.z - SKY_TREE.z, p.x - SKY_TREE.x);
  const startX = SKY_TREE.x + Math.cos(ang) * (SKY_TREE.hollowOuterR * 0.92);
  const startZ = SKY_TREE.z + Math.sin(ang) * (SKY_TREE.hollowOuterR * 0.92);
  const startY = Math.max(DECK_Y + 1.2, p.y - 3.6);
  const endY = p.y - 0.45;
  const dx = p.x - startX;
  const dy = endY - startY;
  const dz = p.z - startZ;
  const len = Math.hypot(dx, dy, dz);
  const bough = new THREE.Mesh(boughGeo, barkMat);
  bough.scale.set(0.85, len, 0.85);
  bough.position.set((startX + p.x) / 2, (startY + endY) / 2, (startZ + p.z) / 2);
  bough.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));

  // Guiding lantern post on the outer rim of the platform (outside walkable center).
  const lx = p.x + Math.cos(ang) * (p.radius + 0.12);
  const lz = p.z + Math.sin(ang) * (p.radius + 0.12);
  const lanternPost = boxMesh(box, barkMat, lx, p.y + 0.55, lz, 0.22, 1.1, 0.22);
  const lanternGem = new THREE.Mesh(crystalGeo, runeMat);
  lanternGem.scale.set(0.24, 0.52, 0.24);
  lanternGem.position.set(lx, p.y + 1.32, lz);

  return [deck, rim, bough, lanternPost, lanternGem];
}

function buildMushrooms(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  hollowCapMat: THREE.MeshStandardMaterial,
  spotMat: THREE.MeshStandardMaterial,
  group: THREE.Group
): void {
  const capGeo = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const gillGeo = new THREE.CylinderGeometry(0.88, 0.35, 0.18, 18);
  const stemGeo = new THREE.CylinderGeometry(0.38, 0.55, 1, 10);
  const spotGeo = new THREE.SphereGeometry(0.16, 8, 6);
  ctx.disposableGeometries.push(capGeo, gillGeo, stemGeo, spotGeo);

  const hollowIds = new Set(SKY_TREE_HOLLOW_PADS.map((p) => p.id));
  for (const pad of GARDEN_BOUNCE_PADS) {
    const isHollow = hollowIds.has(pad.id);
    const capHeight = 0.52 + pad.radius * 0.16;
    const stemTop = pad.topY - capHeight;
    const stemHeight = Math.max(0.3, stemTop - DECK_Y + 0.2);
    const stem = new THREE.Mesh(stemGeo, mats.mushroomStem);
    stem.scale.set(isHollow ? 0.62 : 1, stemHeight, isHollow ? 0.62 : 1);
    stem.position.set(pad.x, (DECK_Y + stemTop) / 2 + 0.1, pad.z);

    const cap = new THREE.Mesh(capGeo, isHollow ? hollowCapMat : mats.mushroomCap);
    cap.scale.set(pad.radius, capHeight, pad.radius);
    cap.position.set(pad.x, stemTop, pad.z);

    const gills = new THREE.Mesh(gillGeo, mats.mushroomStem);
    gills.scale.set(pad.radius, 1, pad.radius);
    gills.position.set(pad.x, stemTop, pad.z);
    group.add(stem, cap, gills);

    // Glowing bioluminescent spots on top of each mushroom cap.
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2 + 0.4;
      const spot = new THREE.Mesh(spotGeo, spotMat);
      spot.scale.set(1.2, 0.5, 1.2);
      spot.position.set(
        pad.x + Math.cos(a) * pad.radius * 0.52,
        stemTop + capHeight * 0.72,
        pad.z + Math.sin(a) * pad.radius * 0.52
      );
      group.add(spot);
    }
  }
}
// #endregion

// #region Root Path
function buildRootPath(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  group.add(rampSlab(box, mats.darkWood, GARDEN_ROOT_RAMP, 0.7));
  const nookGeo = new THREE.CylinderGeometry(GARDEN_ROOT_NOOK.radius, GARDEN_ROOT_NOOK.radius * 0.6, 1.0, 10);
  const rootGeo = new THREE.ConeGeometry(0.65, 1, 7);
  rootGeo.rotateX(Math.PI);
  ctx.disposableGeometries.push(nookGeo, rootGeo);
  const nook = new THREE.Mesh(nookGeo, mats.darkWood);
  nook.position.set(GARDEN_ROOT_NOOK.x, GARDEN_ROOT_NOOK.y - 0.5, GARDEN_ROOT_NOOK.z);
  group.add(nook);

  // Hanging roots beneath the cliff rim of the World Tree Island.
  const roots = new THREE.InstancedMesh(rootGeo, mats.darkWood, HANGING_ROOTS);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < HANGING_ROOTS; i++) {
    const ang = (i / HANGING_ROOTS) * Math.PI * 2;
    const r = GARDEN.radius * (0.78 + (i % 3) * 0.06);
    const len = 8.0 + (i % 5) * 3.2;
    q.setFromEuler(new THREE.Euler((i % 3) * 0.08, 0, ((i % 5) - 2) * 0.05));
    m.compose(
      new THREE.Vector3(GARDEN.x + Math.cos(ang) * r, DECK_Y - 2.5 - len / 2, GARDEN.z + Math.sin(ang) * r),
      q,
      new THREE.Vector3(1.3, len, 1.3)
    );
    roots.setMatrixAt(i, m);
  }
  roots.instanceMatrix.needsUpdate = true;
  roots.computeBoundingSphere();
  group.add(roots);
}
// #endregion

// #region Dressing And Real 3D Trees
function buildGardenDressing(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  // Memory-optimized instanced world trees (`pine`, `broadleaf`, `ancient`) sharing the main world's InstancedMesh drivers.
  buildInstancedSkyTrees(
    ctx,
    group,
    (
      [
        [-25, -8, 1.05, 'pine'],
        [-28, -16, 0.9, 'pine'],
        [-22, 12, 0.95, 'broadleaf'],
        [-25, 20, 1.1, 'pine'],
        [-16, 26, 0.95, 'broadleaf'],
        [-2, -25, 0.95, 'pine'],
        [-14, -25, 1.05, 'pine'],
        [25, -16, 0.95, 'pine'],
        [29, -6, 1.0, 'broadleaf'],
        [28, 18, 0.95, 'ancient'],
        [-4, 28, 1.0, 'pine'],
      ] as const
    ).map(([lx, lz, scale, style]) => ({
      x: GARDEN.x + lx,
      y: DECK_Y,
      z: GARDEN.z + lz,
      scale,
      style,
    }))
  );

  // Low colorful wildflower blossoms spread lightly over the grass (skipping the lake, stream, and World Tree base).
  const flowerGeo = new THREE.CylinderGeometry(0.18, 0.06, 0.06, 6);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
  ctx.disposableGeometries.push(flowerGeo);
  ctx.disposableMaterials.push(flowerMat);
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, GARDEN_FLOWER_COUNT);
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  let placed = 0;
  for (let i = 0; placed < GARDEN_FLOWER_COUNT && i < GARDEN_FLOWER_COUNT * 3; i++) {
    const r = Math.sqrt((i + 0.5) / (GARDEN_FLOWER_COUNT * 3)) * GARDEN.radius * 0.9;
    const ang = i * 2.39996;
    const x = GARDEN.x + Math.cos(ang) * r;
    const z = GARDEN.z + Math.sin(ang) * r;
    const inLake = ((x - GARDEN_LAKE.x) / (GARDEN_LAKE.rx + 2.0)) ** 2 + ((z - GARDEN_LAKE.z) / (GARDEN_LAKE.rz + 2.0)) ** 2 < 1;
    const inTree = Math.hypot(x - SKY_TREE.x, z - SKY_TREE.z) < SKY_TREE.baseRadius + 1.5;
    if (inLake || inTree || Math.abs(x - GARDEN_STREAM.x) < GARDEN_STREAM.halfWidth + 0.8) continue;
    m.makeTranslation(x, DECK_Y + 0.05, z);
    flowers.setMatrixAt(placed, m);
    flowers.setColorAt(placed, color.setHex(FLOWER_COLORS[placed % FLOWER_COLORS.length]));
    placed++;
  }
  flowers.count = placed;
  flowers.instanceMatrix.needsUpdate = true;
  flowers.computeBoundingSphere();
  group.add(flowers);
}
// #endregion
