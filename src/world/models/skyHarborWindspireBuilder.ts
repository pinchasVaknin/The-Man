// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Harbor
// DESIGN: The Windspire is drawn from the Sky Harbor domain data (stair, balcony, landing,
//         summit, sockets) and reacts to the Wind Core count every frame: one more ring turns
//         per core, the energy channels light at three, the crystal burns brighter with each
//         core, and each socket lights when its own core is active.
// SUMMARY: Builds and animates the Windspire: tower, runes, channels, crystal and rings,
//          the spiral stair, top landing, balcony ring, Wind Core sockets and summit platform.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  SKY_HARBOR,
  WINDSPIRE,
  WINDSPIRE_STAIR,
  WINDSPIRE_BALCONY,
  WINDSPIRE_TOP_LANDING,
  WINDSPIRE_SUMMIT,
  WIND_CORE_SOCKETS,
  WIND_CORES,
  getActiveWindCoreCount,
  isWindCoreActive,
} from '../domain/landmarksRegistry';
import { boxMesh, type IHarborMaterials } from './skyHarborShared';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: The Windspire's per-frame update. */
export interface IWindspireVisual {
  readonly update: (elapsedSec: number) => void;
}
// #endregion

// #region Tuning
const DECK_Y = SKY_HARBOR.deckY;
const STAIR_STEP_COUNT = 64;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Windspire
/**
 * Summary: Builds the Windspire into `group`.
 * @param ctx Shared build context.
 * @param mats Sky Harbor palette.
 * @param box Shared unit box geometry.
 * @param group Parent group.
 * @returns The parts the frame update animates, and the update itself.
 */
export function buildWindspire(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): IWindspireVisual {
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
  // The crown sits just under the summit platform (its top tucks into the platform slab).
  crown.position.set(cx, WINDSPIRE_SUMMIT.y - 0.6 - 1.5, cz);
  group.add(tower, plinth, crown);

  // Carved rune bands and four dim energy channels running up the tower (they will light up with Wind Cores).
  for (const bandY of [6, 16, 26, 34]) {
    const r = WINDSPIRE.radius - (bandY / WINDSPIRE.height) * WINDSPIRE.radius * 0.28 + 0.05;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      group.add(boxMesh(box, mats.runeDim, cx + Math.cos(a) * r, DECK_Y + bandY, cz + Math.sin(a) * r, 0.1, 0.6, 2.2, -a));
    }
  }
  const channels: THREE.Mesh[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const r = WINDSPIRE.radius * 0.86 + 0.05;
    const channel = boxMesh(box, mats.runeDim, cx + Math.cos(a) * r, DECK_Y + WINDSPIRE.height * 0.55, cz + Math.sin(a) * r, 0.12, WINDSPIRE.height * 0.8, 0.35, -a);
    group.add(channel);
    channels.push(channel);
  }
  const litMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, emissive: 0x38bdf8, emissiveIntensity: 2.2, roughness: 0.25 });
  const crystalMat = mats.crystal.clone();
  ctx.disposableMaterials.push(litMat, crystalMat);

  // The crystal floats high enough to leave head room over the summit platform.
  const crystalBaseY = DECK_Y + WINDSPIRE.height + 10.0;
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.position.set(cx, crystalBaseY, cz);
  group.add(crystal);
  const rings: THREE.Mesh[] = [];
  for (let r = 0; r < 3; r++) {
    // Each ring gets its own heading (pivot) and a gentle tilt of at most 0.3 rad, so even the
    // widest ring stays above the summit platform's head room while it spins in its own plane.
    const pivot = new THREE.Group();
    pivot.position.set(cx, crystalBaseY, cz);
    pivot.rotation.y = r * 1.1;
    const ring = new THREE.Mesh(ringGeo, mats.gold);
    ring.scale.setScalar(5.5 + r * 1.7);
    ring.rotation.x = Math.PI / 2 + (r - 1) * 0.3;
    pivot.add(ring);
    group.add(pivot);
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

  // Wind Core sockets: pedestal, gold rim and a socket stone that lights when its core is active.
  const socketRimGeo = new THREE.TorusGeometry(0.55, 0.1, 6, 20);
  socketRimGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(socketRimGeo);
  const socketStones: THREE.Mesh[] = [];
  for (const s of WIND_CORE_SOCKETS) {
    group.add(boxMesh(box, mats.darkStone, s.x, DECK_Y + 0.6, s.z, 1.6, 1.2, 1.6, Math.PI / 4));
    const rim = new THREE.Mesh(socketRimGeo, mats.gold);
    rim.position.set(s.x, DECK_Y + 1.22, s.z);
    const stone = boxMesh(box, mats.runeDim, s.x, DECK_Y + 1.15, s.z, 0.7, 0.12, 0.7, Math.PI / 4);
    group.add(rim, stone);
    socketStones.push(stone);
  }

  // Summit platform on top of the tower (reached by the summit updraft at four cores).
  const summitGeo = new THREE.CylinderGeometry(WINDSPIRE_SUMMIT.radius, WINDSPIRE.radius * 0.72, 0.8, 32);
  const summitRimGeo = new THREE.TorusGeometry(WINDSPIRE_SUMMIT.radius, 0.15, 6, 48);
  summitRimGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(summitGeo, summitRimGeo);
  const summit = new THREE.Mesh(summitGeo, mats.marble);
  summit.position.set(cx, WINDSPIRE_SUMMIT.y - 0.4, cz);
  const summitRim = new THREE.Mesh(summitRimGeo, mats.gold);
  summitRim.position.set(cx, WINDSPIRE_SUMMIT.y - 0.05, cz);
  group.add(summit, summitRim);
  return {
    update: (elapsedSec: number) => {
      // The Windspire wakes with the Wind Cores: one more ring turns per core, the energy
      // channels light at three, and the crystal burns brighter with every core.
      const cores = getActiveWindCoreCount();
      crystal.rotation.y = elapsedSec * (0.3 + cores * 0.25);
      crystal.position.y = crystalBaseY + Math.sin(elapsedSec * 0.9) * 0.4;
      crystalMat.emissiveIntensity = 0.8 + cores * 0.6 + (cores >= 4 ? Math.sin(elapsedSec * 2.5) * 0.5 : 0);
      rings.forEach((ring, r) => {
        if (cores > r) ring.rotation.z = elapsedSec * (r % 2 === 0 ? 0.35 : -0.5) * (cores >= 4 ? 2 : 1);
      });
      for (const channel of channels) channel.material = cores >= 3 ? litMat : mats.runeDim;
      for (const core of WIND_CORES) {
        socketStones[core.socketIndex].material = isWindCoreActive(core.id) ? litMat : mats.runeDim;
      }
    },
  };
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
