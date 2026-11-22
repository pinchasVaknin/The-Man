// ============================================================================
// MODULE: World / Models / Skybound Isles / Crystal Isles
// DESIGN: Placed from the Crystal Isles domain data with a clean, spacious, uncluttered
//         deck: central cathedral crystal spire, serene bioluminescent pool, resonance
//         crystals, clue pillar, grotto staircase & gate, and floating stepping rocks.
// SUMMARY: Builds and animates the Crystal Isles.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  getSkyIsland,
  CRYSTAL_ISLETS,
  CRYSTAL_STEPPING_ROCKS,
  GIANT_CRYSTAL,
  RESONANCE_CLUE_PILLAR,
  CRYSTAL_PASSAGE_RAMP,
  CRYSTAL_GROTTO,
  CRYSTAL_PASSAGE_GATE,
  RESONANCE_CRYSTALS,
  RESONANCE_ORDER,
  CRYSTAL_SOLID_BOXES,
  CRYSTAL_CLUSTERS,
  CRYSTAL_REGROW_SEC,
  CRYSTAL_CHIPS_TO_MINE,
  getCrystalDeposits,
  getSkyPuzzleState,
  isSkyPuzzleSolved,
  type ICrystalDisc,
} from '../../domain/landmarksRegistry';
import {
  boxMesh,
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
/** Summary: What the Crystal Isles builder hands back to the frame loop. */
export interface ICrystalIslesBuildResult {
  readonly group: THREE.Group;
  /** Animates resonance glow, the passage gate, deposit regrowth and the floating rocks. */
  readonly update: (elapsedSec: number) => void;
}

interface IResonanceVisual {
  readonly id: string;
  readonly material: THREE.MeshStandardMaterial;
}
// #endregion

// #region Tuning
const MAIN = getSkyIsland('crystal-isles')!;
const DECK_Y = MAIN.deckY;
const RESONANCE_COLORS: Record<string, number> = { blue: 0x3b82f6, violet: 0xa855f7, cyan: 0x22d3ee };
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the Crystal Isles and returns its frame update.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildCrystalIsles(ctx: IWorldModelBuildContext): ICrystalIslesBuildResult {
  const group = new THREE.Group();
  group.name = 'crystal-isles';
  const mats = createMaterials(ctx);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const shardGeo = new THREE.OctahedronGeometry(1, 0);
  shardGeo.scale(0.45, 1.65, 0.45);
  ctx.disposableGeometries.push(box, shardGeo);

  const blueCrystal = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0284c7, emissiveIntensity: 1.15, roughness: 0.12, transparent: true, opacity: 0.92 });
  const violetCrystal = new THREE.MeshStandardMaterial({ color: 0xe879f9, emissive: 0x9333ea, emissiveIntensity: 1.25, roughness: 0.12, transparent: true, opacity: 0.92 });
  const riverGlowMat = new THREE.MeshStandardMaterial({ color: 0xa5f3fc, emissive: 0x38bdf8, emissiveIntensity: 1.35, roughness: 0.18 });
  ctx.disposableMaterials.push(blueCrystal, violetCrystal, riverGlowMat);

  const rocks = buildIsletsAndRocks(ctx, violetCrystal, riverGlowMat, group);
  buildCentralCrystalAndPool(ctx, mats, box, shardGeo, blueCrystal, violetCrystal, riverGlowMat, group);
  const resonance = buildResonanceCrystals(ctx, mats, box, shardGeo, group);
  const gate = buildPassageAndGrotto(ctx, mats, box, shardGeo, violetCrystal, group);
  const deposits = buildDeposits(shardGeo, blueCrystal, violetCrystal, group);
  group.add(buildRailInstances(ctx, box, mats.darkStone, CRYSTAL_SOLID_BOXES));

  return {
    group,
    update: (elapsedSec: number) => {
      const progress = getSkyPuzzleState().crystalResonanceProgress;
      const solved = isSkyPuzzleSolved('crystal-resonance');
      for (const r of resonance) {
        const lit = solved || RESONANCE_ORDER.indexOf(r.id) < progress;
        r.material.emissiveIntensity = lit ? 2.5 + Math.sin(elapsedSec * 4) * 0.5 : 0.55;
      }
      const gateScale = solved ? Math.max(0.001, gate.scale.y - 0.02) : 1;
      gate.scale.set(1, gateScale, 1);
      gate.visible = gateScale > 0.01;
      const runtimes = getCrystalDeposits();
      deposits.forEach((d, i) => {
        const rt = runtimes[i];
        const grown = rt.regrowSec > 0 ? 1 - rt.regrowSec / CRYSTAL_REGROW_SEC : 1;
        const chipped = 1 - (rt.chips / CRYSTAL_CHIPS_TO_MINE) * 0.35;
        d.scale.setScalar(Math.max(0.12, grown * chipped));
      });
      rocks.forEach((rock, i) => {
        rock.position.y = rock.userData.baseY + Math.sin(elapsedSec * 0.9 + i) * 0.04;
      });
      blueCrystal.emissiveIntensity = 1.05 + Math.sin(elapsedSec * 1.3) * 0.25;
      violetCrystal.emissiveIntensity = 1.15 + Math.cos(elapsedSec * 1.1) * 0.25;
      riverGlowMat.emissiveIntensity = 1.3 + Math.sin(elapsedSec * 2.0) * 0.25;
    },
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Islets & Stepping Rocks
function buildIsletsAndRocks(
  ctx: IWorldModelBuildContext,
  violetCrystal: THREE.Material,
  riverGlowMat: THREE.Material,
  group: THREE.Group
): THREE.Group[] {
  const topGeo = new THREE.CylinderGeometry(1, 1.04, 1, 18);
  const rimGeo = new THREE.TorusGeometry(1, 0.05, 8, 24);
  rimGeo.rotateX(Math.PI / 2);
  const underGeo = new THREE.ConeGeometry(1, 1, 9);
  underGeo.rotateX(Math.PI);
  ctx.disposableGeometries.push(topGeo, rimGeo, underGeo);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x583c87, roughness: 0.85 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a1f4a, roughness: 0.92, bumpMap: ctx.textures.rockBump, bumpScale: 0.1 });
  ctx.disposableMaterials.push(deckMat, rockMat);

  const disc = (d: ICrystalDisc, thickness: number, depth: number, isViolet: boolean): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(d.x, d.y, d.z);
    g.userData.baseY = d.y;
    const top = new THREE.Mesh(topGeo, deckMat);
    top.scale.set(d.radius, thickness, d.radius);
    top.position.y = -thickness / 2;
    const rim = new THREE.Mesh(rimGeo, isViolet ? violetCrystal : riverGlowMat);
    rim.scale.set(d.radius - 0.06, 1, d.radius - 0.06);
    rim.position.y = 0.02;
    const under = new THREE.Mesh(underGeo, rockMat);
    under.scale.set(d.radius * 0.95, depth, d.radius * 0.95);
    under.position.y = -thickness - depth / 2;
    g.add(top, rim, under);
    return g;
  };

  for (let i = 0; i < CRYSTAL_ISLETS.length; i++) {
    const islet = CRYSTAL_ISLETS[i];
    group.add(disc(islet, 1.6, islet.radius * 1.45, i % 2 === 0));
  }

  const rocks: THREE.Group[] = [];
  for (const path of CRYSTAL_STEPPING_ROCKS) {
    for (let rIdx = 0; rIdx < path.rocks.length; rIdx++) {
      const rock = path.rocks[rIdx];
      const g = disc(rock, 0.68, rock.radius * 1.65, rIdx % 2 === 1);
      group.add(g);
      rocks.push(g);
    }
  }
  return rocks;
}
// #endregion

// #region Central Crystal Monolith, Serene Pool & Clean Clusters
function buildCentralCrystalAndPool(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  shardGeo: THREE.BufferGeometry,
  blue: THREE.Material,
  violet: THREE.Material,
  riverGlowMat: THREE.Material,
  group: THREE.Group
): void {
  const giantGeo = new THREE.OctahedronGeometry(1, 0);
  giantGeo.scale(GIANT_CRYSTAL.radius * 1.15, GIANT_CRYSTAL.height * 0.68, GIANT_CRYSTAL.radius * 1.15);
  const poolGeo = new THREE.CylinderGeometry(1, 1, 0.06, 32);
  ctx.disposableGeometries.push(giantGeo, poolGeo);

  // 1. Central cathedral crystal monolith (`GIANT_CRYSTAL`) with two clean flanking companion spires.
  const giant = new THREE.Mesh(giantGeo, violet);
  giant.position.set(GIANT_CRYSTAL.x, DECK_Y + GIANT_CRYSTAL.height * 0.34, GIANT_CRYSTAL.z);
  group.add(giant);

  for (const [ox, oz, hScale, wScale, tiltZ, isViolet] of [
    [-1.4, -0.6, 0.72, 0.68, 0.07, false],
    [1.3, 0.5, 0.66, 0.62, -0.08, true],
  ] as const) {
    const twin = new THREE.Mesh(giantGeo, isViolet ? violet : blue);
    twin.scale.set(wScale, hScale, wScale);
    twin.position.set(GIANT_CRYSTAL.x + ox, DECK_Y + GIANT_CRYSTAL.height * 0.3 * hScale, GIANT_CRYSTAL.z + oz);
    twin.rotation.z = tiltZ;
    group.add(twin);
  }

  // 2. Clean bioluminescent pool in front of the central crystal (flush with deck, zero clutter).
  const mainPool = new THREE.Mesh(poolGeo, riverGlowMat);
  mainPool.scale.set(5.6, 1, 4.2);
  mainPool.position.set(MAIN.x - 1.5, DECK_Y + 0.03, MAIN.z + 8.5);
  const poolRim = new THREE.Mesh(poolGeo, mats.darkStone);
  poolRim.scale.set(6.2, 0.65, 4.8);
  poolRim.position.set(MAIN.x - 1.5, DECK_Y + 0.015, MAIN.z + 8.5);
  group.add(poolRim, mainPool);

  // 3. Layout crystal clusters (matching collision boxes cleanly, without extra bush clutter).
  for (const violetOnes of [true, false]) {
    const list = CRYSTAL_CLUSTERS.filter((c) => c.violet === violetOnes);
    const mesh = new THREE.InstancedMesh(shardGeo, violetOnes ? violet : blue, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    list.forEach((c, i) => {
      q.setFromEuler(new THREE.Euler(((i % 5) - 2) * 0.1, i * 1.3, ((i % 3) - 1) * 0.12));
      m.compose(new THREE.Vector3(c.x, c.y + 0.45 * c.scale, c.z), q, new THREE.Vector3(c.scale * 0.95, c.scale * 1.15, c.scale * 0.95));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  // 4. Clue pillar: three gems stacked top to bottom in the resonance order.
  const p = RESONANCE_CLUE_PILLAR;
  group.add(boxMesh(box, mats.darkStone, p.x, DECK_Y + 1.6, p.z, 0.9, 3.2, 0.9));
  const gemGeo = new THREE.SphereGeometry(0.22, 12, 8);
  ctx.disposableGeometries.push(gemGeo);
  RESONANCE_ORDER.forEach((id, i) => {
    const crystal = RESONANCE_CRYSTALS.find((c) => c.id === id)!;
    const gemMat = new THREE.MeshStandardMaterial({ color: RESONANCE_COLORS[crystal.color], emissive: RESONANCE_COLORS[crystal.color], emissiveIntensity: 1.6 });
    ctx.disposableMaterials.push(gemMat);
    for (const [ox, oz] of [[0.47, 0], [-0.47, 0], [0, 0.47], [0, -0.47]] as const) {
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(p.x + ox, DECK_Y + 2.8 - i * 0.8, p.z + oz);
      group.add(gem);
    }
  });
}
// #endregion

// #region Resonance Crystals
function buildResonanceCrystals(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  shardGeo: THREE.BufferGeometry,
  group: THREE.Group
): IResonanceVisual[] {
  return RESONANCE_CRYSTALS.map((c) => {
    const material = new THREE.MeshStandardMaterial({ color: RESONANCE_COLORS[c.color], emissive: RESONANCE_COLORS[c.color], emissiveIntensity: 0.55, roughness: 0.1, transparent: true, opacity: 0.92 });
    ctx.disposableMaterials.push(material);
    group.add(boxMesh(box, mats.darkStone, c.x, c.y + 0.3, c.z, 1.4, 0.6, 1.4, 0.4));
    const shard = new THREE.Mesh(shardGeo, material);
    shard.scale.set(1.4, 1.45, 1.4);
    shard.position.set(c.x, c.y + 2.0, c.z);
    group.add(shard);
    return { id: c.id, material };
  });
}
// #endregion

// #region Passage And Grotto
function buildPassageAndGrotto(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  shardGeo: THREE.BufferGeometry,
  violet: THREE.Material,
  group: THREE.Group
): THREE.Group {
  for (const wall of CRYSTAL_SOLID_BOXES.filter((b) => b.id.startsWith('crystal-passage-wall') || b.id.startsWith('crystal-grotto-wall'))) {
    const isCrystal = wall.id.startsWith('crystal-passage-wall');
    group.add(boxMesh(box, isCrystal ? violet : mats.darkStone, (wall.minX + wall.maxX) / 2, (wall.minY + wall.maxY) / 2, (wall.minZ + wall.maxZ) / 2, wall.maxX - wall.minX, wall.maxY - wall.minY, wall.maxZ - wall.minZ));
  }
  group.add(rampSlab(box, mats.darkStone, CRYSTAL_PASSAGE_RAMP, 0.6));
  const G = CRYSTAL_GROTTO;
  group.add(deckSlab(box, mats.darkStone, G, 0.8));
  group.add(boxMesh(box, mats.darkStone, (G.minX + G.maxX) / 2, G.y + 4.7, (G.minZ + G.maxZ) / 2, G.maxX - G.minX + 1.0, 0.6, G.maxZ - G.minZ + 1.0));
  const coneGeo = new THREE.ConeGeometry(1, 1, 7);
  coneGeo.rotateX(Math.PI);
  ctx.disposableGeometries.push(coneGeo);
  const under = new THREE.Mesh(coneGeo, mats.darkStone);
  under.scale.set(5.0, 8.0, 5.5);
  under.position.set((G.minX + G.maxX) / 2, G.y - 4.8, (G.minZ + G.maxZ) / 2);
  group.add(under);

  const g = CRYSTAL_PASSAGE_GATE;
  const gate = new THREE.Group();
  gate.position.set((g.minX + g.maxX) / 2, g.minY, (g.minZ + g.maxZ) / 2);
  for (let k = 0; k < 4; k++) {
    const shard = new THREE.Mesh(shardGeo, violet);
    shard.scale.set(0.9, 1.3, 0.9);
    shard.position.set(0, 1.9, -1.2 + k * 0.8);
    gate.add(shard);
  }
  group.add(gate);
  return gate;
}
// #endregion

// #region Deposits
function buildDeposits(shardGeo: THREE.BufferGeometry, blue: THREE.Material, violet: THREE.Material, group: THREE.Group): THREE.Group[] {
  return getCrystalDeposits().map((rt, i) => {
    const d = rt.def;
    const cluster = new THREE.Group();
    cluster.position.set(d.x, d.y, d.z);
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + i;
      const shard = new THREE.Mesh(shardGeo, (i + k) % 2 === 0 ? blue : violet);
      shard.scale.setScalar(0.55 + (k % 2) * 0.25);
      shard.position.set(Math.cos(a) * d.radius * 0.45, 0.45, Math.sin(a) * d.radius * 0.45);
      shard.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5);
      cluster.add(shard);
    }
    group.add(cluster);
    return cluster;
  });
}
// #endregion
