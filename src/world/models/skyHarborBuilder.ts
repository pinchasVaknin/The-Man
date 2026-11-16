// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Harbor
// DESIGN: Every mesh is placed from the Sky Harbor domain data (plaza, balconies, Windspire
//         stair and balcony, garden pads and flowers, dock and airship), and railings are drawn
//         straight from the solid boxes, so what you see is what collides. Repeated pieces
//         (stair steps, railings, flowers, plaza pillars) are instanced.
// SUMMARY: Builds and animates the hub of the Skybound Isles: arrival plaza and gate,
//          Windspire (tower, runes, rings, spiral stair, landing, balcony ring, Wind Core
//          sockets), Sky Garden (trees, ponds, mushrooms, wind flowers, perch), Sky Dock
//          (pier, crates, crane, balloons, moored airship) and the observation balconies with
//          their telescopes.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  SKY_HARBOR,
  WINDSPIRE,
  ARRIVAL_PLAZA,
  ARRIVAL_GATE,
  PLAZA_PILLARS,
  PLAZA_BENCHES,
  PLAZA_LANTERNS,
  SKY_BALCONIES,
  WINDSPIRE_STAIR,
  WINDSPIRE_BALCONY,
  WINDSPIRE_TOP_LANDING,
  WIND_CORE_SOCKETS,
  SKY_GARDEN_AREA,
  GARDEN_CANOPY_PERCH,
  SKY_BOUNCE_PADS,
  GARDEN_TREES,
  GARDEN_PONDS,
  SKY_HARBOR_SOLID_BOXES,
  SKY_WIND_FLOWERS,
  SKY_TELESCOPES,
  telescopeViewFor,
  getWindFlowerOpenness,
} from '../domain/landmarksRegistry';
import type { IWorldModelBuildContext } from './types';
import { boxMesh, createMaterials, deckSlab, type IHarborMaterials } from './skyHarborShared';
import { buildSkyDock } from './skyHarborDockBuilder';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Sky Harbor builder hands back to the frame loop. */
export interface ISkyHarborBuildResult {
  readonly group: THREE.Group;
  /** Animates the Windspire, wind flowers, airship and balloons; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
}


interface IWindFlowerVisual {
  readonly id: string;
  readonly petals: THREE.Mesh[];
  readonly glow: THREE.Mesh;
}
// #endregion

// #region Tuning
const DECK_Y = SKY_HARBOR.deckY;
/** Thin lift (m) for flat decals laid on the deck, so they never z-fight with it. */
const DECAL_LIFT_M = 0.03;
const STAIR_STEP_COUNT = 64;
const GARDEN_FLOWER_COUNT = 90;
const FLOWER_COLORS = [0xf0abfc, 0x93c5fd, 0xfde68a, 0x99f6e4, 0xfda4af] as const;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds every Sky Harbor addition and returns its frame update.
 * @param ctx Shared build context (disposal lists, obstacles, software-GL flag, textures).
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildSkyHarbor(ctx: IWorldModelBuildContext): ISkyHarborBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-harbor';
  const mats = createMaterials(ctx);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  ctx.disposableGeometries.push(unitBox);

  buildArrivalPlaza(ctx, mats, unitBox, group);
  buildBalconies(mats, unitBox, group);
  buildTelescopes(ctx, mats, unitBox, group);
  const windspire = buildWindspire(ctx, mats, unitBox, group);
  const flowers = buildSkyGarden(ctx, mats, unitBox, group);
  const dock = buildSkyDock(ctx, mats, unitBox, group);
  buildRailings(ctx, mats, unitBox, group);

  return {
    group,
    update: (elapsedSec: number) => {
      windspire.crystal.rotation.y = elapsedSec * 0.6;
      windspire.crystal.position.y = windspire.crystalBaseY + Math.sin(elapsedSec * 0.9) * 0.4;
      windspire.rings.forEach((ring, r) => {
        ring.rotation.z = elapsedSec * (r % 2 === 0 ? 0.35 : -0.5);
      });
      for (const flower of flowers) {
        const open = getWindFlowerOpenness(flower.id);
        flower.petals.forEach((petal) => {
          petal.rotation.x = -0.25 - open * 1.05;
        });
        flower.glow.scale.setScalar(0.4 + open * 0.8);
      }
      dock.airship.position.y = Math.sin(elapsedSec * 0.8) * 0.06;
      dock.propellers.forEach((p, i) => {
        p.rotation.x = elapsedSec * (i % 2 === 0 ? 2.2 : -2.2);
      });
      dock.balloons.forEach((b, i) => {
        b.position.y = b.userData.baseY + Math.sin(elapsedSec * 0.7 + i) * 0.35;
      });
    },
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Arrival Plaza
function buildArrivalPlaza(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const p = ARRIVAL_PLAZA;
  const paving = boxMesh(box, mats.marble, (p.minX + p.maxX) / 2, DECK_Y + DECAL_LIFT_M - 0.05, (p.minZ + p.maxZ) / 2, p.maxX - p.minX, 0.1, p.maxZ - p.minZ);
  paving.receiveShadow = !ctx.isSoftwareGl;
  group.add(paving);

  const inlayGeo = new THREE.RingGeometry(4.2, 4.8, 48);
  inlayGeo.rotateX(-Math.PI / 2);
  const runeRingGeo = new THREE.RingGeometry(2.0, 2.3, 8);
  runeRingGeo.rotateX(-Math.PI / 2);
  ctx.disposableGeometries.push(inlayGeo, runeRingGeo);
  const inlay = new THREE.Mesh(inlayGeo, mats.gold);
  inlay.position.set(752.0, DECK_Y + DECAL_LIFT_M * 2, -35.0);
  const runeRing = new THREE.Mesh(runeRingGeo, mats.runeDim);
  runeRing.position.set(752.0, DECK_Y + DECAL_LIFT_M * 2, -35.0);
  group.add(inlay, runeRing);

  // Monumental gate: two tall pillars, a lintel and a hanging wind crystal.
  const g = ARRIVAL_GATE;
  for (const pz of g.pillarZ) {
    group.add(boxMesh(box, mats.stone, g.x, DECK_Y + g.height / 2, pz, g.pillarHalf * 2, g.height, g.pillarHalf * 2));
    group.add(boxMesh(box, mats.gold, g.x, DECK_Y + g.height - 0.4, pz, g.pillarHalf * 2.3, 0.5, g.pillarHalf * 2.3));
  }
  const span = Math.abs(g.pillarZ[1] - g.pillarZ[0]) + g.pillarHalf * 4;
  group.add(boxMesh(box, mats.stone, g.x, DECK_Y + g.height + 1.0, (g.pillarZ[0] + g.pillarZ[1]) / 2, g.pillarHalf * 2.6, 2.0, span));
  group.add(boxMesh(box, mats.runeDim, g.x - g.pillarHalf * 1.32, DECK_Y + g.height + 1.0, (g.pillarZ[0] + g.pillarZ[1]) / 2, 0.06, 0.5, span * 0.8));
  const gateCrystalGeo = new THREE.OctahedronGeometry(1.2, 0);
  gateCrystalGeo.scale(1, 1.7, 1);
  ctx.disposableGeometries.push(gateCrystalGeo);
  const gateCrystal = new THREE.Mesh(gateCrystalGeo, mats.crystal);
  gateCrystal.position.set(g.x, DECK_Y + g.height - 2.5, (g.pillarZ[0] + g.pillarZ[1]) / 2);
  group.add(gateCrystal);

  // Colonnade pillars (instanced fluted columns with capitals).
  const columnGeo = new THREE.CylinderGeometry(0.5, 0.6, 7.0, 10);
  ctx.disposableGeometries.push(columnGeo);
  const columns = new THREE.InstancedMesh(columnGeo, mats.stone, PLAZA_PILLARS.length);
  const m = new THREE.Matrix4();
  PLAZA_PILLARS.forEach((pl, i) => {
    columns.setMatrixAt(i, m.makeTranslation(pl.x, DECK_Y + 3.5, pl.z));
    group.add(boxMesh(box, mats.gold, pl.x, DECK_Y + 7.1, pl.z, 1.5, 0.3, 1.5));
  });
  columns.instanceMatrix.needsUpdate = true;
  group.add(columns);

  for (const b of PLAZA_BENCHES) {
    group.add(boxMesh(box, mats.marble, b.x, DECK_Y + 0.42, b.z, 2.2, 0.16, 0.7));
    group.add(boxMesh(box, mats.darkStone, b.x - 0.8, DECK_Y + 0.17, b.z, 0.25, 0.34, 0.6));
    group.add(boxMesh(box, mats.darkStone, b.x + 0.8, DECK_Y + 0.17, b.z, 0.25, 0.34, 0.6));
  }
  const glowGeo = new THREE.SphereGeometry(0.32, 10, 8);
  ctx.disposableGeometries.push(glowGeo);
  for (const l of PLAZA_LANTERNS) {
    group.add(boxMesh(box, mats.darkWood, l.x, DECK_Y + 1.5, l.z, 0.3, 3.0, 0.3));
    const glow = new THREE.Mesh(glowGeo, mats.lanternGlow);
    glow.position.set(l.x, DECK_Y + 3.2, l.z);
    group.add(glow);
  }
}
// #endregion

// #region Balconies
function buildBalconies(mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  for (const b of SKY_BALCONIES) group.add(deckSlab(box, mats.stone, b, 0.6));
}


/** Brass telescopes on wooden stands, each tube aimed at the island it watches. */
function buildTelescopes(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const tubeGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.8, 12);
  tubeGeo.rotateX(Math.PI / 2);
  const lensGeo = new THREE.CircleGeometry(0.24, 16);
  ctx.disposableGeometries.push(tubeGeo, lensGeo);
  for (const scope of SKY_TELESCOPES) {
    const view = telescopeViewFor(scope);
    group.add(boxMesh(box, mats.darkWood, scope.x, scope.y + 0.65, scope.z, 0.18, 1.3, 0.18));
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const leg = boxMesh(box, mats.darkWood, scope.x + Math.cos(a) * 0.32, scope.y + 0.35, scope.z + Math.sin(a) * 0.32, 0.08, 0.75, 0.08);
      leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      group.add(leg);
    }
    const head = new THREE.Group();
    head.position.set(scope.x, scope.y + 1.42, scope.z);
    head.lookAt(view.lookX, view.lookY, view.lookZ);
    const tube = new THREE.Mesh(tubeGeo, mats.gold);
    tube.position.z = 0.35;
    const lens = new THREE.Mesh(lensGeo, mats.crystal);
    lens.position.z = 1.26;
    head.add(tube, lens);
    group.add(head);
  }
}

/** Every railing collision box drawn as a stone rail; one instanced mesh for all of them. */
function buildRailings(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const rails = SKY_HARBOR_SOLID_BOXES.filter((b) => b.id.startsWith('rail-'));
  const mesh = new THREE.InstancedMesh(box, mats.marble, rails.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  rails.forEach((r, i) => {
    q.setFromAxisAngle(up, r.yaw ?? 0);
    m.compose(
      new THREE.Vector3((r.minX + r.maxX) / 2, (r.minY + r.maxY) / 2, (r.minZ + r.maxZ) / 2),
      q,
      new THREE.Vector3(r.maxX - r.minX, r.maxY - r.minY, r.maxZ - r.minZ)
    );
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = !ctx.isSoftwareGl;
  group.add(mesh);
}
// #endregion

// #region Windspire
function buildWindspire(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): { crystal: THREE.Mesh; crystalBaseY: number; rings: THREE.Mesh[] } {
  const cx = SKY_HARBOR.x;
  const cz = SKY_HARBOR.z;
  const towerGeo = new THREE.CylinderGeometry(WINDSPIRE.radius * 0.72, WINDSPIRE.radius, WINDSPIRE.height, 8);
  const plinthGeo = new THREE.CylinderGeometry(WINDSPIRE.radius + 0.4, WINDSPIRE.radius + 0.9, 1.0, 8);
  const crownGeo = new THREE.CylinderGeometry(WINDSPIRE.radius * 0.95, WINDSPIRE.radius * 0.72, 3.0, 8);
  const crystalGeo = new THREE.OctahedronGeometry(3.2, 0);
  crystalGeo.scale(1, 1.8, 1);
  const ringGeo = new THREE.TorusGeometry(1, 0.08, 8, 48);
  ctx.disposableGeometries.push(towerGeo, plinthGeo, crownGeo, crystalGeo, ringGeo);

  const tower = new THREE.Mesh(towerGeo, mats.stone);
  tower.position.set(cx, DECK_Y + WINDSPIRE.height / 2, cz);
  tower.castShadow = !ctx.isSoftwareGl;
  const plinth = new THREE.Mesh(plinthGeo, mats.darkStone);
  plinth.position.set(cx, DECK_Y + 0.5, cz);
  const crown = new THREE.Mesh(crownGeo, mats.gold);
  crown.position.set(cx, DECK_Y + WINDSPIRE.height + 1.5, cz);
  group.add(tower, plinth, crown);

  // Carved rune bands and four dim energy channels running up the tower (they will light up with Wind Cores).
  for (const bandY of [6, 16, 26, 34]) {
    const r = WINDSPIRE.radius - (bandY / WINDSPIRE.height) * WINDSPIRE.radius * 0.28 + 0.05;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      group.add(boxMesh(box, mats.runeDim, cx + Math.cos(a) * r, DECK_Y + bandY, cz + Math.sin(a) * r, 0.1, 0.6, 2.2, -a));
    }
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const r = WINDSPIRE.radius * 0.86 + 0.05;
    group.add(boxMesh(box, mats.runeDim, cx + Math.cos(a) * r, DECK_Y + WINDSPIRE.height * 0.55, cz + Math.sin(a) * r, 0.12, WINDSPIRE.height * 0.8, 0.35, -a));
  }

  const crystalBaseY = DECK_Y + WINDSPIRE.height + 7.0;
  const crystal = new THREE.Mesh(crystalGeo, mats.crystal);
  crystal.position.set(cx, crystalBaseY, cz);
  group.add(crystal);
  const rings: THREE.Mesh[] = [];
  for (let r = 0; r < 3; r++) {
    const ring = new THREE.Mesh(ringGeo, mats.gold);
    ring.scale.setScalar(5.5 + r * 1.7);
    ring.position.set(cx, crystalBaseY, cz);
    ring.rotation.set(Math.PI / 2 + (r - 1) * 0.35, r * 0.7, 0);
    group.add(ring);
    rings.push(ring);
  }

  buildWindspireStair(ctx, mats, box, group);

  // Balcony ring at the top of the stair, and the top landing sector.
  const ringFloorGeo = new THREE.RingGeometry(WINDSPIRE_BALCONY.innerR, WINDSPIRE_BALCONY.outerR, 64);
  ringFloorGeo.rotateX(Math.PI / 2);
  const landingGeo = new THREE.RingGeometry(WINDSPIRE_STAIR.innerR, WINDSPIRE_STAIR.outerR, 12, 1, WINDSPIRE_TOP_LANDING.fromAngle, WINDSPIRE_TOP_LANDING.arc);
  landingGeo.rotateX(Math.PI / 2);
  const ringEdgeGeo = new THREE.CylinderGeometry(WINDSPIRE_BALCONY.outerR, WINDSPIRE_BALCONY.outerR - 0.6, 0.7, 64, 1, true);
  ctx.disposableGeometries.push(ringFloorGeo, landingGeo, ringEdgeGeo);
  const stoneTwoSided = mats.stone.clone();
  stoneTwoSided.side = THREE.DoubleSide;
  ctx.disposableMaterials.push(stoneTwoSided);
  const ringFloor = new THREE.Mesh(ringFloorGeo, stoneTwoSided);
  ringFloor.position.set(cx, WINDSPIRE_BALCONY.y, cz);
  const landing = new THREE.Mesh(landingGeo, stoneTwoSided);
  landing.position.set(cx, WINDSPIRE_TOP_LANDING.y, cz);
  const ringEdge = new THREE.Mesh(ringEdgeGeo, stoneTwoSided);
  ringEdge.position.set(cx, WINDSPIRE_BALCONY.y - 0.35, cz);
  group.add(ringFloor, landing, ringEdge);

  // Empty Wind Core sockets: pedestal, gold rim and an unlit socket stone.
  const socketRimGeo = new THREE.TorusGeometry(0.55, 0.1, 6, 20);
  socketRimGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(socketRimGeo);
  for (const s of WIND_CORE_SOCKETS) {
    group.add(boxMesh(box, mats.darkStone, s.x, DECK_Y + 0.6, s.z, 1.6, 1.2, 1.6, Math.PI / 4));
    const rim = new THREE.Mesh(socketRimGeo, mats.gold);
    rim.position.set(s.x, DECK_Y + 1.22, s.z);
    group.add(rim, boxMesh(box, mats.runeDim, s.x, DECK_Y + 1.15, s.z, 0.7, 0.12, 0.7, Math.PI / 4));
  }
  return { crystal, crystalBaseY, rings };
}

/** Instanced stair treads along the helix, each sitting just under the walkable surface. */
function buildWindspireStair(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const s = WINDSPIRE_STAIR;
  const sweep = s.turns * Math.PI * 2;
  const width = s.outerR - s.innerR;
  const midR = (s.innerR + s.outerR) / 2;
  const tread = (midR * sweep) / STAIR_STEP_COUNT;
  const steps = new THREE.InstancedMesh(box, mats.stone, STAIR_STEP_COUNT);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < STAIR_STEP_COUNT; i++) {
    const u = (i + 0.5) / STAIR_STEP_COUNT;
    const a = s.startAngle + sweep * u;
    const topY = s.baseY + (s.topY - s.baseY) * u;
    const thickness = 0.5;
    q.setFromAxisAngle(up, Math.atan2(-Math.cos(a), -Math.sin(a)));
    m.compose(
      new THREE.Vector3(s.cx + Math.cos(a) * midR, topY - thickness / 2, s.cz + Math.sin(a) * midR),
      q,
      new THREE.Vector3(tread * 1.08, thickness, width)
    );
    steps.setMatrixAt(i, m);
  }
  steps.instanceMatrix.needsUpdate = true;
  steps.castShadow = !ctx.isSoftwareGl;
  steps.receiveShadow = !ctx.isSoftwareGl;
  group.add(steps);
}
// #endregion

// #region Sky Garden
function buildSkyGarden(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): IWindFlowerVisual[] {
  const a = SKY_GARDEN_AREA;
  const discGeo = new THREE.CylinderGeometry(1, 1, 0.08, 40);
  ctx.disposableGeometries.push(discGeo);
  const lawn = new THREE.Mesh(discGeo, mats.grass);
  lawn.scale.set(a.rx, 1, a.rz);
  lawn.position.set(a.cx, DECK_Y + DECAL_LIFT_M, a.cz);
  lawn.receiveShadow = !ctx.isSoftwareGl;
  group.add(lawn);

  for (const p of GARDEN_PONDS) {
    const pond = new THREE.Mesh(discGeo, mats.water);
    pond.scale.set(p.radius, 1, p.radius);
    pond.position.set(p.x, DECK_Y + DECAL_LIFT_M * 3, p.z);
    group.add(pond);
  }
  // Water channel from the big pond toward the tower, with a small arched bridge over it.
  const pond = GARDEN_PONDS[0];
  group.add(boxMesh(box, mats.water, pond.x - 1.0, DECK_Y + DECAL_LIFT_M * 3, pond.z + 6.5, 0.9, 0.06, 9.0));
  const archGeo = new THREE.TorusGeometry(1.4, 0.18, 6, 16, Math.PI);
  ctx.disposableGeometries.push(archGeo);
  const arch = new THREE.Mesh(archGeo, mats.wood);
  arch.position.set(pond.x - 1.0, DECK_Y, pond.z + 7.5);
  arch.rotation.y = Math.PI / 2;
  group.add(arch);

  buildGardenTrees(ctx, mats, group);
  buildGardenFlowers(ctx, mats, group);
  buildMushrooms(ctx, mats, group);

  // Canopy perch: wooden platform in the giant tree's crown.
  const perch = GARDEN_CANOPY_PERCH;
  const perchGeo = new THREE.CylinderGeometry(perch.radius, perch.radius * 0.8, 0.4, 16);
  ctx.disposableGeometries.push(perchGeo);
  const perchDeck = new THREE.Mesh(perchGeo, mats.wood);
  perchDeck.position.set(perch.x, perch.y - 0.2, perch.z);
  group.add(perchDeck, boxMesh(box, mats.darkWood, perch.x, (DECK_Y + perch.y) / 2, perch.z, 1.4, perch.y - DECK_Y, 1.4));
  const crownGeo = new THREE.IcosahedronGeometry(1, 1);
  ctx.disposableGeometries.push(crownGeo);
  for (const [ox, oy, oz, sc] of [[2.6, 1.8, 1.2, 2.4], [-2.4, 2.2, -1.0, 2.2], [0.4, 3.2, -2.4, 2.0]] as const) {
    const leaves = new THREE.Mesh(crownGeo, mats.leaves);
    leaves.scale.setScalar(sc);
    leaves.position.set(perch.x + ox, perch.y + oy, perch.z + oz);
    group.add(leaves);
  }

  return buildWindFlowers(ctx, mats, group);
}

function buildGardenTrees(ctx: IWorldModelBuildContext, mats: IHarborMaterials, group: THREE.Group): void {
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 6.0, 8);
  const canopyGeo = new THREE.IcosahedronGeometry(2.6, 1);
  ctx.disposableGeometries.push(trunkGeo, canopyGeo);
  for (const t of GARDEN_TREES) {
    const trunk = new THREE.Mesh(trunkGeo, mats.darkWood);
    trunk.scale.setScalar(t.scale);
    trunk.position.set(t.x, DECK_Y + 3.0 * t.scale, t.z);
    const canopy = new THREE.Mesh(canopyGeo, mats.leaves);
    canopy.scale.setScalar(t.scale);
    canopy.position.set(t.x, DECK_Y + 6.6 * t.scale, t.z);
    canopy.castShadow = !ctx.isSoftwareGl;
    group.add(trunk, canopy);
  }
}

/** Glowing flowers scattered over the lawn (deterministic positions, instanced, per-instance colour). */
function buildGardenFlowers(ctx: IWorldModelBuildContext, mats: IHarborMaterials, group: THREE.Group): void {
  const flowerGeo = new THREE.ConeGeometry(0.22, 0.5, 6);
  flowerGeo.rotateX(Math.PI);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.6 });
  ctx.disposableGeometries.push(flowerGeo);
  ctx.disposableMaterials.push(flowerMat);
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, GARDEN_FLOWER_COUNT);
  const a = SKY_GARDEN_AREA;
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  for (let i = 0; i < GARDEN_FLOWER_COUNT; i++) {
    // Golden-angle spiral inside the lawn ellipse keeps the spread even and repeatable.
    const r = Math.sqrt((i + 0.5) / GARDEN_FLOWER_COUNT) * 0.92;
    const ang = i * 2.39996;
    m.makeTranslation(a.cx + Math.cos(ang) * r * a.rx, DECK_Y + 0.3, a.cz + Math.sin(ang) * r * a.rz);
    flowers.setMatrixAt(i, m);
    flowers.setColorAt(i, color.setHex(FLOWER_COLORS[i % FLOWER_COLORS.length]));
  }
  flowers.instanceMatrix.needsUpdate = true;
  group.add(flowers);
}

function buildMushrooms(ctx: IWorldModelBuildContext, mats: IHarborMaterials, group: THREE.Group): void {
  const capGeo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.4, 0.5, 1, 10);
  const spotGeo = new THREE.SphereGeometry(0.16, 6, 4);
  ctx.disposableGeometries.push(capGeo, stemGeo, spotGeo);
  for (const pad of SKY_BOUNCE_PADS) {
    const capHeight = 0.45 + pad.radius * 0.12;
    const stem = new THREE.Mesh(stemGeo, mats.mushroomStem);
    stem.scale.set(1, pad.topY - capHeight - DECK_Y + 0.2, 1);
    stem.position.set(pad.x, (DECK_Y + pad.topY - capHeight) / 2 + 0.1, pad.z);
    const cap = new THREE.Mesh(capGeo, mats.mushroomCap);
    cap.scale.set(pad.radius, capHeight, pad.radius);
    cap.position.set(pad.x, pad.topY - capHeight, pad.z);
    group.add(stem, cap);
    for (let k = 0; k < 5; k++) {
      const ang = k * 1.26;
      const spot = new THREE.Mesh(spotGeo, mats.mushroomStem);
      spot.position.set(pad.x + Math.cos(ang) * pad.radius * 0.55, pad.topY - capHeight * 0.18, pad.z + Math.sin(ang) * pad.radius * 0.55);
      group.add(spot);
    }
  }
}

/** Wind flowers: a stem, five petals that fold open as the flower opens, and a glowing heart. */
function buildWindFlowers(ctx: IWorldModelBuildContext, mats: IHarborMaterials, group: THREE.Group): IWindFlowerVisual[] {
  const petalGeo = new THREE.PlaneGeometry(0.9, 1.6);
  petalGeo.translate(0, 0.8, 0);
  const heartGeo = new THREE.SphereGeometry(0.45, 12, 8);
  const stemGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6);
  ctx.disposableGeometries.push(petalGeo, heartGeo, stemGeo);
  return SKY_WIND_FLOWERS.map((f) => {
    const root = new THREE.Group();
    root.position.set(f.x, f.deckY, f.z);
    const stem = new THREE.Mesh(stemGeo, mats.leaves);
    stem.position.y = 0.6;
    root.add(stem);
    const petals: THREE.Mesh[] = [];
    for (let k = 0; k < 5; k++) {
      const holder = new THREE.Group();
      holder.position.y = 1.2;
      holder.rotation.y = (k / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, mats.petal);
      petal.rotation.x = -0.25;
      holder.add(petal);
      root.add(holder);
      petals.push(petal);
    }
    const glow = new THREE.Mesh(heartGeo, mats.lanternGlow);
    glow.position.y = 1.3;
    root.add(glow);
    group.add(root);
    return { id: f.id, petals, glow };
  });
}
// #endregion
