// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Harbor
// DESIGN: The Windspire is drawn from the Sky Harbor domain data (stair, balcony, landing,
//         summit, sockets) and reacts to the Wind Core count every frame: one more ring turns
//         per core, the energy channels light at three, the crystal burns brighter with each
//         core, and each socket lights when its own core is active.
// SUMMARY: Builds and animates the Windspire: tower, runes, channels, crystal and rings,
//          the ornate helical staircase with golden nosings & entry portal, balcony ring,
//          Wind Core sockets and summit platform.
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
} from '../../domain/landmarksRegistry';
import { boxMesh, type IHarborMaterials } from './skyHarborShared';
import type { IWorldModelBuildContext } from '../types';
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
const STAIR_STEP_COUNT = 72;
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

  // Sculpted octagonal belt cornices & gold relief rings hugging the exact taper of the 8-sided Windspire tower.
  for (const bandY of [7, 15, 23, 31]) {
    const t = bandY / WINDSPIRE.height;
    const rAtY = WINDSPIRE.radius * (1 - t * 0.28);
    const beltGeo = new THREE.CylinderGeometry(rAtY + 0.36, rAtY + 0.44, 0.72, 8);
    const goldBeltGeo = new THREE.CylinderGeometry(rAtY + 0.48, rAtY + 0.48, 0.18, 8);
    ctx.disposableGeometries.push(beltGeo, goldBeltGeo);
    const belt = new THREE.Mesh(beltGeo, mats.marble);
    belt.position.set(cx, DECK_Y + bandY, cz);
    const goldBelt = new THREE.Mesh(goldBeltGeo, mats.gold);
    goldBelt.position.set(cx, DECK_Y + bandY + 0.28, cz);
    group.add(belt, goldBelt);
  }

  // 8 Sculpted marble & gold corner buttress pilasters tilted along the exact slope of the Windspire tower.
  const slopeAngle = Math.atan2(WINDSPIRE.radius * 0.28, WINDSPIRE.height);
  const ribHeight = WINDSPIRE.height * 0.88;
  const ribMidY = WINDSPIRE.height * 0.46;
  const ribMidR = WINDSPIRE.radius * (1 - (ribMidY / WINDSPIRE.height) * 0.28) + 0.08;
  const lancetArchGeo = new THREE.TorusGeometry(0.48, 0.11, 6, 14, Math.PI);
  const brazierBowlGeo = new THREE.CylinderGeometry(0.45, 0.24, 0.36, 8);
  const brazierFlameGeo = new THREE.OctahedronGeometry(0.32, 0);
  brazierFlameGeo.scale(1, 1.65, 1);
  ctx.disposableGeometries.push(lancetArchGeo, brazierBowlGeo, brazierFlameGeo);

  const warmEmberOffMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    emissive: 0x451a03,
    emissiveIntensity: 0.35,
    roughness: 0.45,
  });
  const warmSunLitMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.4,
    roughness: 0.2,
  });
  const crystalMat = mats.crystal.clone();
  ctx.disposableMaterials.push(warmEmberOffMat, warmSunLitMat, crystalMat);

  const towerLights: THREE.Mesh[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const ribGroup = new THREE.Group();
    ribGroup.position.set(cx + Math.cos(a) * ribMidR, DECK_Y + ribMidY, cz + Math.sin(a) * ribMidR);
    ribGroup.rotation.y = -a;
    ribGroup.rotation.z = slopeAngle;
    ribGroup.add(
      boxMesh(box, mats.marble, 0, 0, 0, 0.42, ribHeight, 0.48),
      boxMesh(box, mats.gold, 0.16, 0, 0, 0.14, ribHeight * 0.96, 0.22)
    );
    group.add(ribGroup);

    // Stepped stone buttress Spur at the base of each corner rib
    const baseR = WINDSPIRE.radius + 0.35;
    group.add(
      boxMesh(box, mats.darkStone, cx + Math.cos(a) * baseR, DECK_Y + 1.8, cz + Math.sin(a) * baseR, 0.95, 3.6, 0.72, -a),
      boxMesh(box, mats.gold, cx + Math.cos(a) * baseR, DECK_Y + 3.68, cz + Math.sin(a) * baseR, 1.02, 0.18, 0.78, -a)
    );

    // Arched gothic lancet windows on the 8 faces at two upper tiers (`y = 19m` and `y = 27m`)
    const faceA = a + Math.PI / 8;
    for (const winY of [19, 27]) {
      const rFace = WINDSPIRE.radius * (1 - (winY / WINDSPIRE.height) * 0.28) * Math.cos(Math.PI / 8) + 0.04;
      const wx = cx + Math.cos(faceA) * rFace;
      const wz = cz + Math.sin(faceA) * rFace;
      const pane = boxMesh(box, warmEmberOffMat, wx, DECK_Y + winY, wz, 0.12, 2.4, 0.88, -faceA);
      const frameL = boxMesh(box, mats.gold, wx + Math.sin(faceA) * 0.48, DECK_Y + winY, wz - Math.cos(faceA) * 0.48, 0.18, 2.5, 0.14, -faceA);
      const frameR = boxMesh(box, mats.gold, wx - Math.sin(faceA) * 0.48, DECK_Y + winY, wz + Math.cos(faceA) * 0.48, 0.18, 2.5, 0.14, -faceA);
      const sill = boxMesh(box, mats.marble, wx, DECK_Y + winY - 1.28, wz, 0.28, 0.22, 1.18, -faceA);
      const arch = new THREE.Mesh(lancetArchGeo, mats.gold);
      arch.position.set(wx, DECK_Y + winY + 1.2, wz);
      arch.rotation.y = -faceA + Math.PI / 2;
      group.add(pane, frameL, frameR, sill, arch);
      towerLights.push(pane);
    }
  }

  // 8 Golden Balcony Braziers around the Windspire Balcony railing (`WINDSPIRE_BALCONY`)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const brR = WINDSPIRE_BALCONY.outerR - 0.35;
    const bx = cx + Math.cos(a) * brR;
    const bz = cz + Math.sin(a) * brR;
    group.add(boxMesh(box, mats.marble, bx, WINDSPIRE_BALCONY.y + 0.55, bz, 0.52, 1.1, 0.52));
    const bowl = new THREE.Mesh(brazierBowlGeo, mats.gold);
    bowl.position.set(bx, WINDSPIRE_BALCONY.y + 1.22, bz);
    const flame = new THREE.Mesh(brazierFlameGeo, warmSunLitMat);
    flame.position.set(bx, WINDSPIRE_BALCONY.y + 1.65, bz);
    group.add(bowl, flame);
    towerLights.push(flame);
  }

  // The crystal floats high enough to leave head room over the summit platform.
  const crystalBaseY = DECK_Y + WINDSPIRE.height + 10.0;
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.position.set(cx, crystalBaseY, cz);
  group.add(crystal);
  const rings: THREE.Mesh[] = [];
  for (let r = 0; r < 3; r++) {
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
    const stone = boxMesh(box, warmEmberOffMat, s.x, DECK_Y + 1.15, s.z, 0.7, 0.12, 0.7, Math.PI / 4);
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
      const cores = getActiveWindCoreCount();
      crystal.rotation.y = elapsedSec * (0.3 + cores * 0.25);
      crystal.position.y = crystalBaseY + Math.sin(elapsedSec * 0.9) * 0.4;
      crystalMat.emissiveIntensity = 0.8 + cores * 0.6 + (cores >= 4 ? Math.sin(elapsedSec * 2.5) * 0.5 : 0);
      rings.forEach((ring, r) => {
        if (cores > r) ring.rotation.z = elapsedSec * (r % 2 === 0 ? 0.35 : -0.5) * (cores >= 4 ? 2 : 1);
      });
      for (const pane of towerLights) pane.material = cores >= 1 ? warmSunLitMat : warmEmberOffMat;
      for (const core of WIND_CORES) {
        socketStones[core.socketIndex].material = isWindCoreActive(core.id) ? warmSunLitMat : warmEmberOffMat;
      }
    },
  };
}

/** Instanced carved marble stair treads with golden nosings, outer helical kerbs, support brackets, and a Western Staircase Portal Arch. */
function buildWindspireStair(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const s = WINDSPIRE_STAIR;
  const sweep = s.turns * Math.PI * 2;
  const width = s.outerR - s.innerR;
  const midR = (s.innerR + s.outerR) / 2;
  const tread = (midR * sweep) / STAIR_STEP_COUNT;
  const steps = new THREE.InstancedMesh(box, mats.marble, STAIR_STEP_COUNT);
  const trims = new THREE.InstancedMesh(box, mats.gold, STAIR_STEP_COUNT);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < STAIR_STEP_COUNT; i++) {
    const u = (i + 0.5) / STAIR_STEP_COUNT;
    const a = s.startAngle + sweep * u;
    const topY = s.baseY + (s.topY - s.baseY) * u;
    const thickness = 0.52;
    const yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
    q.setFromAxisAngle(up, yaw);
    m.compose(
      new THREE.Vector3(s.cx + Math.cos(a) * midR, topY - thickness / 2, s.cz + Math.sin(a) * midR),
      q,
      new THREE.Vector3(tread * 1.12, thickness, width)
    );
    steps.setMatrixAt(i, m);

    // Golden tread nosing & outer rim accent along every step.
    m.compose(
      new THREE.Vector3(s.cx + Math.cos(a) * midR, topY + 0.01, s.cz + Math.sin(a) * midR),
      q,
      new THREE.Vector3(tread * 0.42, 0.04, width * 1.02)
    );
    trims.setMatrixAt(i, m);

    // Architectural stone support brackets connecting every 6th step into the Windspire tower wall.
    if (i % 6 === 0 && i > 2) {
      group.add(
        boxMesh(
          box,
          mats.darkStone,
          s.cx + Math.cos(a) * (s.innerR + 0.45),
          topY - 0.85,
          s.cz + Math.sin(a) * (s.innerR + 0.45),
          0.42,
          1.2,
          1.1,
          yaw
        )
      );
    }
  }
  steps.instanceMatrix.needsUpdate = true;
  trims.instanceMatrix.needsUpdate = true;
  steps.castShadow = !ctx.isSoftwareGl;
  steps.receiveShadow = !ctx.isSoftwareGl;
  group.add(steps, trims);

  // Grand Western Staircase Threshold Portal at `startAngle = Math.PI` (`(s.cx - midR, s.baseY, s.cz)`).
  const entryX = s.cx + Math.cos(s.startAngle) * midR;
  const entryZ = s.cz + Math.sin(s.startAngle) * midR;
  const portalArchGeo = new THREE.TorusGeometry(width * 0.56, 0.22, 8, 20, Math.PI);
  ctx.disposableGeometries.push(portalArchGeo);
  const portalArch = new THREE.Mesh(portalArchGeo, mats.gold);
  portalArch.position.set(entryX, s.baseY + 2.4, entryZ + 0.35);
  group.add(portalArch);
  for (const rx of [s.innerR + 0.15, s.outerR - 0.15]) {
    const px = s.cx - rx;
    group.add(boxMesh(box, mats.marble, px, s.baseY + 1.2, entryZ + 0.35, 0.42, 2.4, 0.42));
    group.add(boxMesh(box, mats.lanternGlow, px, s.baseY + 2.6, entryZ + 0.35, 0.28, 0.28, 0.28));
  }
}
// #endregion
