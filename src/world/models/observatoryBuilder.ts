// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Observatory
// DESIGN: Placed from the Observatory domain data; the tower wall, railings and chamber walls
//         are drawn from their solid boxes. The puzzle clue is counting, not angles: each dial
//         ring carries six gems and every turn lights one more, and the star map inside the
//         tower shows how many gems each ring needs, so it reads the same from any side.
// SUMMARY: Builds and animates the Sky Observatory: tower with dome and doorways, star map
//          mural, hidden chamber with its sliding stone gate, tower balcony and ramp, the
//          armillary dial with levers, and the giant telescope.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  getSkyIsland,
  OBSERVATORY_TOWER,
  OBSERVATORY_CHAMBER,
  OBSERVATORY_CHAMBER_GATE,
  OBSERVATORY_STAR_MAP,
  OBSERVATORY_BALCONY,
  OBSERVATORY_BALCONY_RAMP,
  OBSERVATORY_DIAL,
  OBSERVATORY_LEVERS,
  OBSERVATORY_GIANT_TELESCOPE,
  OBSERVATORY_SOLID_BOXES,
  OBSERVATORY_RING_STEPS,
  OBSERVATORY_RING_SOLUTION,
  getSkyPuzzleState,
  isSkyPuzzleSolved,
} from '../domain/landmarksRegistry';
import { boxMesh, buildRailInstances, createMaterials, rampSlab, type IHarborMaterials } from './skyHarborShared';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Observatory builder hands back to the frame loop. */
export interface IObservatoryBuildResult {
  readonly group: THREE.Group;
  /** Animates the dial rings, lit gems, the sliding gate and the dome crystal. */
  readonly update: (elapsedSec: number) => void;
}

interface IDialRingVisual {
  readonly pivot: THREE.Group;
  readonly gems: THREE.Mesh[];
}
// #endregion

// #region Tuning
const ISLAND = getSkyIsland('sky-observatory')!;
const DECK_Y = ISLAND.deckY;
const STEP_ANGLE = (Math.PI * 2) / OBSERVATORY_RING_STEPS;
/** How far (m) the chamber gate sinks into the floor once open. */
const GATE_SINK_M = 3.8;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the Sky Observatory and returns its frame update.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildObservatory(ctx: IWorldModelBuildContext): IObservatoryBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-observatory';
  const mats = createMaterials(ctx);
  const box = new THREE.BoxGeometry(1, 1, 1);
  ctx.disposableGeometries.push(box);
  const gemLit = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xf59e0b, emissiveIntensity: 2.2, roughness: 0.2 });
  const gemDim = new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0x0f172a, emissiveIntensity: 0.2, roughness: 0.5 });
  ctx.disposableMaterials.push(gemLit, gemDim);

  const domeCrystal = buildTower(ctx, mats, box, group);
  buildStarMap(ctx, mats, gemLit, gemDim, group);
  const gate = buildChamber(mats, box, group);
  buildBalcony(ctx, mats, box, group);
  const rings = buildDial(ctx, mats, box, gemDim, group);
  buildGiantTelescope(ctx, mats, box, group);
  group.add(buildRailInstances(ctx, box, mats.marble, OBSERVATORY_SOLID_BOXES));

  return {
    group,
    update: (elapsedSec: number) => {
      const state = getSkyPuzzleState();
      const solved = isSkyPuzzleSolved('observatory-rings');
      rings.forEach((ring, i) => {
        const target = state.observatoryRings[i] * STEP_ANGLE;
        ring.pivot.rotation.y += (target - ring.pivot.rotation.y) * 0.12;
        ring.gems.forEach((gem, g) => {
          gem.material = g < state.observatoryRings[i] ? gemLit : gemDim;
        });
      });
      gemLit.emissiveIntensity = solved ? 3.0 + Math.sin(elapsedSec * 3) * 0.6 : 2.2;
      const gateTargetY = solved ? -GATE_SINK_M : 0;
      gate.position.y += (gateTargetY - gate.position.y) * 0.05;
      domeCrystal.rotation.y = elapsedSec * 0.5;
    },
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Tower
function buildTower(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): THREE.Mesh {
  const T = OBSERVATORY_TOWER;
  for (const wall of OBSERVATORY_SOLID_BOXES.filter((b) => b.id.startsWith('observatory-tower-wall'))) {
    group.add(boxMesh(box, mats.stone, (wall.minX + wall.maxX) / 2, (wall.minY + wall.maxY) / 2, (wall.minZ + wall.maxZ) / 2, wall.maxX - wall.minX, wall.maxY - wall.minY, wall.maxZ - wall.minZ, wall.yaw ?? 0));
  }
  const outerR = T.innerR + T.wallThickness;
  // Lintels over the doorway and the chamber opening, so the wall reads as one ring.
  for (const sign of [1, -1]) {
    const lintelBottom = DECK_Y + 4.2;
    group.add(boxMesh(box, mats.stone, T.x, (lintelBottom + T.wallTopY) / 2, T.z + sign * (T.innerR + T.wallThickness / 2), 4.8, T.wallTopY - lintelBottom, T.wallThickness));
  }
  const domeGeo = new THREE.SphereGeometry(outerR + 0.2, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const corniceGeo = new THREE.CylinderGeometry(outerR + 0.5, outerR + 0.5, 0.6, 40);
  const floorGeo = new THREE.CylinderGeometry(T.innerR, T.innerR, 0.08, 40);
  const crystalGeo = new THREE.OctahedronGeometry(1.1, 0);
  crystalGeo.scale(1, 2, 1);
  ctx.disposableGeometries.push(domeGeo, corniceGeo, floorGeo, crystalGeo);
  const domeMat = mats.marble.clone();
  domeMat.color.setHex(0x9fb3cf);
  domeMat.side = THREE.DoubleSide;
  ctx.disposableMaterials.push(domeMat);
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.set(T.x, T.wallTopY, T.z);
  const cornice = new THREE.Mesh(corniceGeo, mats.gold);
  cornice.position.set(T.x, T.wallTopY, T.z);
  const floor = new THREE.Mesh(floorGeo, mats.marble);
  floor.position.set(T.x, DECK_Y + 0.04, T.z);
  const crystal = new THREE.Mesh(crystalGeo, mats.crystal);
  crystal.position.set(T.x, T.wallTopY + outerR + 2.4, T.z);
  group.add(dome, cornice, floor, crystal);
  return crystal;
}

/** Star map on the tower's east inner wall: three rings of six gems, lit as the solution needs. */
function buildStarMap(ctx: IWorldModelBuildContext, mats: IHarborMaterials, gemLit: THREE.Material, gemDim: THREE.Material, group: THREE.Group): void {
  const m = OBSERVATORY_STAR_MAP;
  const panelGeo = new THREE.PlaneGeometry(4.6, 4.6);
  const ringGeo = new THREE.TorusGeometry(1, 0.04, 6, 40);
  const gemGeo = new THREE.SphereGeometry(0.13, 10, 8);
  ctx.disposableGeometries.push(panelGeo, ringGeo, gemGeo);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x172554, emissive: 0x0b1437, emissiveIntensity: 0.4, roughness: 0.8 });
  ctx.disposableMaterials.push(panelMat);
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(m.x, m.y, m.z);
  panel.rotation.y = -Math.PI / 2;
  group.add(panel);
  OBSERVATORY_DIAL.ringRadii.forEach((r, i) => {
    const scale = r * 0.55;
    const ring = new THREE.Mesh(ringGeo, mats.gold);
    ring.scale.setScalar(scale);
    ring.position.set(m.x - 0.03, m.y, m.z);
    ring.rotation.y = -Math.PI / 2;
    group.add(ring);
    for (let g = 0; g < OBSERVATORY_RING_STEPS; g++) {
      const a = g * STEP_ANGLE + Math.PI / 2;
      const gem = new THREE.Mesh(gemGeo, g < OBSERVATORY_RING_SOLUTION[i] ? gemLit : gemDim);
      gem.position.set(m.x - 0.06, m.y + Math.sin(a) * scale, m.z + Math.cos(a) * scale);
      group.add(gem);
    }
  });
}
// #endregion

// #region Chamber
function buildChamber(mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): THREE.Group {
  const C = OBSERVATORY_CHAMBER;
  for (const wall of OBSERVATORY_SOLID_BOXES.filter((b) => b.id.startsWith('observatory-chamber-wall'))) {
    group.add(boxMesh(box, mats.stone, (wall.minX + wall.maxX) / 2, (wall.minY + wall.maxY) / 2, (wall.minZ + wall.maxZ) / 2, wall.maxX - wall.minX, wall.maxY - wall.minY, wall.maxZ - wall.minZ));
  }
  group.add(boxMesh(box, mats.stone, (C.minX + C.maxX) / 2, C.ceilingY + 0.3, (C.minZ + C.maxZ) / 2, C.maxX - C.minX + 1.0, 0.6, C.maxZ - C.minZ + 0.6));
  group.add(boxMesh(box, mats.runeDim, (C.minX + C.maxX) / 2, DECK_Y + 0.05, (C.minZ + C.maxZ) / 2, 2.4, 0.06, 2.4));
  // The sliding gate: a carved slab that sinks into the floor when the rings align.
  const g = OBSERVATORY_CHAMBER_GATE;
  const gate = new THREE.Group();
  gate.add(boxMesh(box, mats.darkStone, (g.minX + g.maxX) / 2, (g.minY + g.maxY) / 2, (g.minZ + g.maxZ) / 2, g.maxX - g.minX, g.maxY - g.minY, g.maxZ - g.minZ));
  gate.add(boxMesh(box, mats.runeDim, (g.minX + g.maxX) / 2, (g.minY + g.maxY) / 2, g.maxZ + 0.02, 1.4, 1.4, 0.04));
  group.add(gate);
  return gate;
}
// #endregion

// #region Balcony
function buildBalcony(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const B = OBSERVATORY_BALCONY;
  const floorGeo = new THREE.RingGeometry(B.innerR, B.outerR, 48);
  floorGeo.rotateX(Math.PI / 2);
  const edgeGeo = new THREE.CylinderGeometry(B.outerR, B.outerR - 0.5, 0.6, 48, 1, true);
  ctx.disposableGeometries.push(floorGeo, edgeGeo);
  const twoSided = mats.stone.clone();
  twoSided.side = THREE.DoubleSide;
  ctx.disposableMaterials.push(twoSided);
  const floor = new THREE.Mesh(floorGeo, twoSided);
  floor.position.set(B.x, B.y, B.z);
  const edge = new THREE.Mesh(edgeGeo, twoSided);
  edge.position.set(B.x, B.y - 0.3, B.z);
  group.add(floor, edge);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    group.add(boxMesh(box, mats.darkStone, B.x + Math.cos(a) * (B.outerR - 0.8), (DECK_Y + B.y) / 2, B.z + Math.sin(a) * (B.outerR - 0.8), 0.5, B.y - DECK_Y, 0.5));
  }
  group.add(rampSlab(box, mats.stone, OBSERVATORY_BALCONY_RAMP, 0.5));
}
// #endregion

// #region Armillary Dial
function buildDial(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  gemDim: THREE.Material,
  group: THREE.Group
): IDialRingVisual[] {
  const D = OBSERVATORY_DIAL;
  const daisGeo = new THREE.CylinderGeometry(4.2, 4.4, D.daisTopY - DECK_Y, 8);
  const ringGeo = new THREE.TorusGeometry(1, 0.09, 8, 48);
  ringGeo.rotateX(Math.PI / 2);
  const gemGeo = new THREE.SphereGeometry(0.2, 10, 8);
  ctx.disposableGeometries.push(daisGeo, ringGeo, gemGeo);
  const dais = new THREE.Mesh(daisGeo, mats.marble);
  dais.position.set(D.x, (DECK_Y + D.daisTopY) / 2, D.z);
  group.add(dais);
  const rings = D.ringRadii.map((r, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(D.x, D.daisTopY + 0.2 + i * 0.25, D.z);
    const ring = new THREE.Mesh(ringGeo, mats.gold);
    ring.scale.set(r, 1, r);
    pivot.add(ring);
    const gems: THREE.Mesh[] = [];
    for (let g = 0; g < OBSERVATORY_RING_STEPS; g++) {
      const a = g * STEP_ANGLE;
      const gem = new THREE.Mesh(gemGeo, gemDim);
      gem.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r);
      pivot.add(gem);
      gems.push(gem);
    }
    group.add(pivot);
    return { pivot, gems };
  });
  for (const lever of OBSERVATORY_LEVERS) {
    group.add(boxMesh(box, mats.darkStone, lever.x, DECK_Y + 0.6, lever.z, 0.5, 1.2, 0.5));
    group.add(boxMesh(box, mats.gold, lever.x, DECK_Y + 1.35, lever.z, 0.18, 0.5, 0.18, 0.3));
    group.add(boxMesh(box, mats.gold, lever.x, DECK_Y + 1.25, lever.z, 0.6, 0.12, 0.6));
    for (let g = 0; g <= lever.ringIndex; g++) {
      group.add(boxMesh(box, mats.runeDim, lever.x - 0.15 + g * 0.15, DECK_Y + 0.8, lever.z + 0.26, 0.08, 0.3, 0.02));
    }
  }
  return rings;
}
// #endregion

// #region Giant Telescope
function buildGiantTelescope(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const t = OBSERVATORY_GIANT_TELESCOPE;
  group.add(boxMesh(box, mats.darkStone, t.x, DECK_Y + 1.5, t.z, 3.2, 3.0, 3.2));
  const tubeGeo = new THREE.CylinderGeometry(0.9, 1.3, 14, 20);
  const bandGeo = new THREE.TorusGeometry(1.25, 0.12, 8, 24);
  ctx.disposableGeometries.push(tubeGeo, bandGeo);
  const mount = new THREE.Group();
  mount.position.set(t.x, DECK_Y + 3.6, t.z);
  mount.rotation.set(0.75, -0.8, 0);
  const tube = new THREE.Mesh(tubeGeo, mats.gold);
  tube.position.y = 4.0;
  mount.add(tube);
  for (const y of [0.0, 4.0, 8.5]) {
    const band = new THREE.Mesh(bandGeo, mats.darkStone);
    band.position.y = y;
    band.rotation.x = Math.PI / 2;
    mount.add(band);
  }
  group.add(mount);
}
// #endregion
