// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Harbor
// DESIGN: Placed from the Sky Harbor domain data:
//         - Textured stone/marble pillars with carved plinths, fluted corner pilasters,
//           belt courses, and Gothic lantern spires on the Arrival Gate & Plaza Colonnade.
//         - A clean circular ring road encircling the central Windspire tower with
//           straight radial avenues extending from the ring to every Harbor landmark.
//         - Real 3D botanical broadleaf trees alongside custom lavender/pink blossom trees.
// SUMMARY: Builds and animates Sky Harbor.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  SKY_HARBOR,
  ARRIVAL_PLAZA,
  ARRIVAL_GATE,
  PLAZA_PILLARS,
  PLAZA_BENCHES,
  PLAZA_LANTERNS,
  SKY_BALCONIES,
  SKY_GARDEN_AREA,
  GARDEN_CANOPY_PERCH,
  SKY_BOUNCE_PADS,
  GARDEN_TREES,
  GARDEN_PONDS,
  SKY_HARBOR_SOLID_BOXES,
  SKY_WIND_FLOWERS,
  SKY_TELESCOPES,
  aimedTelescopeLookPoint,
  getTelescopeRuntimeAim,
  telescopeViewFor,
  getWindFlowerOpenness,
  type ISkyTelescope,
} from '../../domain/landmarksRegistry';
import type { IWorldModelBuildContext } from '../types';
import {
  boxMesh,
  buildCircularRingPathway,
  buildInstancedSkyTrees,
  buildRailInstances,
  buildSteppedPathway,
  createMaterials,
  deckSlab,
  type IHarborMaterials,
} from './skyHarborShared';
import { buildSkyDock } from './skyHarborDockBuilder';
import { buildWindspire } from './skyHarborWindspireBuilder';
import { SKY_HARBOR_POND, skyHarborPondBedY } from '../../domain/landmarks/skyboundIsles/skyHarborPond';
import { createPondCutoutMaterial } from './pondCutoutMaterial';
import { getActiveSkyHoverbike } from '../../systems/skyHoverbikeSystem';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Sky Harbor builder hands back to the frame loop. */
export interface ISkyHarborBuildResult {
  readonly group: THREE.Group;
  /** Animates the Windspire, wind flowers, Koi fish, hoverbikes, airship and balloons; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
  /** Updates the world-space rideable hoverbike anywhere in the world. */
  readonly updateHoverbike: (elapsedSec: number) => void;
}

interface IWindFlowerVisual {
  readonly id: string;
  readonly petals: THREE.Mesh[];
  readonly glow: THREE.Mesh;
}

interface IHarborTelescopeVisual {
  readonly scope: ISkyTelescope;
  readonly stand: THREE.Group;
  readonly head: THREE.Group;
}
// #endregion

// #region Tuning
const DECK_Y = SKY_HARBOR.deckY;
const DECAL_LIFT_M = 0.03;
const GARDEN_FLOWER_COUNT = 90;
const FLOWER_COLORS = [0xf0abfc, 0x93c5fd, 0xfde68a, 0x99f6e4, 0xfda4af] as const;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds every Sky Harbor addition and returns its frame update.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildSkyHarbor(ctx: IWorldModelBuildContext): ISkyHarborBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-harbor';
  const mats = createMaterials(ctx);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  ctx.disposableGeometries.push(unitBox);

  buildArrivalPlaza(ctx, mats, unitBox, group);
  buildHarborPathways(ctx, mats, unitBox, group);
  buildBalconies(mats, unitBox, group);
  const telescopes = buildTelescopes(ctx, mats, unitBox, group);
  const windspire = buildWindspire(ctx, mats, unitBox, group);
  const { flowers } = buildSkyGarden(ctx, mats, unitBox, group);
  const dock = buildSkyDock(ctx, mats, unitBox, group);
  buildRailings(ctx, mats, unitBox, group);

  let prevElapsedSec = 0;

  const updateHoverbike = (elapsedSec: number): void => {
    const liveBike = getActiveSkyHoverbike();
    dock.spawnedHoverbike.visible = liveBike.spawned;
    if (liveBike.spawned) {
      const idleBob = Math.abs(liveBike.speed) < 0.5 && !liveBike.isAirborne ? Math.sin(elapsedSec * 2.8) * 0.05 : 0;
      dock.spawnedHoverbike.position.set(liveBike.x, liveBike.y + idleBob, liveBike.z);
      dock.spawnedHoverbike.rotation.set(-liveBike.pitch, liveBike.yaw, liveBike.roll);
    }
  };

  return {
    group,
    updateHoverbike,
    update: (elapsedSec: number) => {
      const dt = Math.min(0.1, Math.max(0.004, elapsedSec - prevElapsedSec));
      prevElapsedSec = elapsedSec;

      windspire.update(elapsedSec);
      for (const flower of flowers) {
        const open = getWindFlowerOpenness(flower.id);
        flower.petals.forEach((petal) => {
          petal.rotation.x = -0.25 - open * 1.05;
        });
        flower.glow.scale.setScalar(0.4 + open * 0.8);
      }
      // Rotate Windspire Summit telescopes with live player aim & clear stand/barrel while looking through
      const aim = getTelescopeRuntimeAim();
      for (const tele of telescopes) {
        const isLooking = aim.id === tele.scope.id;
        tele.stand.visible = !isLooking;
        if (isLooking) {
          const view = telescopeViewFor(tele.scope);
          const aimed = aimedTelescopeLookPoint(view, aim.yaw, aim.pitch);
          tele.head.lookAt(aimed.lookX, aimed.lookY, aimed.lookZ);
        }
      }
      dock.airship.position.y = Math.sin(elapsedSec * 0.8) * 0.06;
      dock.propellers.forEach((p, i) => {
        p.rotation.x = elapsedSec * (i % 2 === 0 ? 2.2 : -2.2);
      });
      dock.balloons.forEach((b, i) => {
        b.position.y = b.userData.baseY + Math.sin(elapsedSec * 0.7 + i) * 0.35;
      });
      dock.hoverbikes.forEach((bike, i) => {
        bike.position.y = bike.userData.baseY + Math.sin(elapsedSec * 2.4 + i * 1.6) * 0.09;
        bike.rotation.z = Math.sin(elapsedSec * 1.7 + i) * 0.03;
      });
      dock.merchantNpc.position.y = 0.16 + Math.sin(elapsedSec * 2.0) * 0.015;
      dock.merchantNpc.rotation.y = Math.sin(elapsedSec * 0.9) * 0.18;
      updateHoverbike(elapsedSec);
    },
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Arrival Plaza, Textured Gate Pillars & Circular Ring Pathways
function buildArrivalPlaza(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  const p = ARRIVAL_PLAZA;
  const plazaCx = (p.minX + p.maxX) / 2;
  const plazaCz = (p.minZ + p.maxZ) / 2;

  const slateSpireMat = new THREE.MeshStandardMaterial({
    color: 0x27303f,
    roughness: 0.55,
    metalness: 0.35,
    bumpMap: ctx.textures.rockBump,
    bumpScale: 0.05,
  });
  const silverBlueMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    map: ctx.textures.rockAlbedo,
    roughness: 0.65,
    metalness: 0.2,
    bumpMap: ctx.textures.rockBump,
    bumpScale: 0.05,
  });
  ctx.disposableMaterials.push(slateSpireMat, silverBlueMat);

  // Sculpted rounded-octagonal Marble & Carved-Stone Arrival Rotunda (replacing the abrupt square floor slab)
  // that flows seamlessly into the Grand Processional Avenue toward the central Windspire Plaza.
  const arrivalDiscGeo = new THREE.CylinderGeometry(12.2, 12.6, 0.1, 32);
  const arrivalStoneBorderGeo = new THREE.RingGeometry(11.6, 12.65, 32);
  arrivalStoneBorderGeo.rotateX(-Math.PI / 2);
  const inlayGeo = new THREE.RingGeometry(4.2, 4.9, 48);
  inlayGeo.rotateX(-Math.PI / 2);
  const outerRingGeo = new THREE.RingGeometry(7.2, 8.1, 48);
  outerRingGeo.rotateX(-Math.PI / 2);
  const spireRoofGeo = new THREE.ConeGeometry(1.15, 3.8, 8);
  const lanternCageGeo = new THREE.CylinderGeometry(0.68, 0.62, 1.35, 8);
  ctx.disposableGeometries.push(arrivalDiscGeo, arrivalStoneBorderGeo, inlayGeo, outerRingGeo, spireRoofGeo, lanternCageGeo);

  const arrivalDisc = new THREE.Mesh(arrivalDiscGeo, mats.marble);
  arrivalDisc.scale.set(1.12, 1, 1.05);
  arrivalDisc.position.set(plazaCx + 1.5, DECK_Y + DECAL_LIFT_M - 0.03, plazaCz);
  arrivalDisc.receiveShadow = !ctx.isSoftwareGl;
  const arrivalBorder = new THREE.Mesh(arrivalStoneBorderGeo, silverBlueMat);
  arrivalBorder.scale.set(1.12, 1.05, 1);
  arrivalBorder.position.set(plazaCx + 1.5, DECK_Y + DECAL_LIFT_M * 1.6, plazaCz);
  const inlay = new THREE.Mesh(inlayGeo, mats.gold);
  inlay.position.set(plazaCx + 1.5, DECK_Y + DECAL_LIFT_M * 2, plazaCz);
  const outerRing = new THREE.Mesh(outerRingGeo, silverBlueMat);
  outerRing.position.set(plazaCx + 1.5, DECK_Y + DECAL_LIFT_M * 2, plazaCz);
  group.add(arrivalDisc, arrivalBorder, inlay, outerRing);

  // Monumental Arrival Gate: richly textured stone/marble pillars with carved base plinths,
  // corner stone pilasters, horizontal relief bands, corbel capitals, lantern chambers, and spire roofs.
  const g = ARRIVAL_GATE;
  const w = g.pillarHalf * 2;
  for (const pz of g.pillarZ) {
    // Stepped stone plinth base
    group.add(boxMesh(box, mats.darkStone, g.x, DECK_Y + 0.35, pz, w + 0.55, 0.7, w + 0.55));
    group.add(boxMesh(box, mats.stone, g.x, DECK_Y + 0.95, pz, w + 0.3, 0.55, w + 0.3));
    group.add(boxMesh(box, mats.gold, g.x, DECK_Y + 1.28, pz, w + 0.36, 0.12, w + 0.36));

    // Textured marble main shaft
    group.add(boxMesh(box, mats.marble, g.x, DECK_Y + g.height / 2, pz, w, g.height, w));

    // 4 Corner stone pilasters + recessed vertical fluting ribs for deep 3D architectural relief
    const cornerOff = g.pillarHalf - 0.12;
    for (const [cx, cz] of [
      [-cornerOff, -cornerOff],
      [cornerOff, -cornerOff],
      [-cornerOff, cornerOff],
      [cornerOff, cornerOff],
    ] as const) {
      group.add(boxMesh(box, mats.stone, g.x + cx, DECK_Y + g.height / 2, pz + cz, 0.38, g.height - 0.6, 0.38));
    }
    for (const [fx, fz, sx, sz] of [
      [-g.pillarHalf - 0.04, 0, 0.14, 0.55],
      [g.pillarHalf + 0.04, 0, 0.14, 0.55],
      [0, -g.pillarHalf - 0.04, 0.55, 0.14],
      [0, g.pillarHalf + 0.04, 0.55, 0.14],
    ] as const) {
      group.add(boxMesh(box, mats.darkStone, g.x + fx, DECK_Y + g.height / 2, pz + fz, sx, g.height - 1.8, sz));
    }

    // Carved horizontal stone & gold belt courses along the pillar shaft
    for (const bandY of [4.2, 7.8, 11.2]) {
      group.add(boxMesh(box, mats.stone, g.x, DECK_Y + bandY, pz, w + 0.28, 0.34, w + 0.28));
      group.add(boxMesh(box, mats.gold, g.x, DECK_Y + bandY + 0.2, pz, w + 0.32, 0.09, w + 0.32));
    }

    // Capital, lantern chamber, and pointed spire roof
    group.add(boxMesh(box, mats.stone, g.x, DECK_Y + g.height - 0.65, pz, w + 0.35, 0.45, w + 0.35));
    group.add(boxMesh(box, mats.gold, g.x, DECK_Y + g.height - 0.25, pz, w + 0.52, 0.38, w + 0.52));
    const lantern = new THREE.Mesh(lanternCageGeo, mats.lanternGlow);
    lantern.position.set(g.x, DECK_Y + g.height + 0.65, pz);
    const spire = new THREE.Mesh(spireRoofGeo, slateSpireMat);
    spire.position.set(g.x, DECK_Y + g.height + 3.1, pz);
    group.add(lantern, spire);
  }
  const span = Math.abs(g.pillarZ[1] - g.pillarZ[0]) + g.pillarHalf * 4;
  const midGateZ = (g.pillarZ[0] + g.pillarZ[1]) / 2;
  group.add(boxMesh(box, mats.stone, g.x, DECK_Y + g.height + 0.45, midGateZ, g.pillarHalf * 1.75, 0.65, span));
  group.add(boxMesh(box, slateSpireMat, g.x, DECK_Y + g.height + 1.05, midGateZ, g.pillarHalf * 1.5, 0.75, span));
  group.add(boxMesh(box, mats.gold, g.x - g.pillarHalf * 0.92, DECK_Y + g.height + 0.8, midGateZ, 0.14, 0.48, span * 0.88));
  group.add(boxMesh(box, mats.gold, g.x + g.pillarHalf * 0.92, DECK_Y + g.height + 0.8, midGateZ, 0.14, 0.48, span * 0.88));

  const gateCrystalGeo = new THREE.OctahedronGeometry(1.25, 0);
  gateCrystalGeo.scale(1, 1.75, 1);
  ctx.disposableGeometries.push(gateCrystalGeo);
  const gateCrystal = new THREE.Mesh(gateCrystalGeo, mats.crystal);
  gateCrystal.position.set(g.x, DECK_Y + g.height - 2.4, midGateZ);
  group.add(gateCrystal);

  // Colonnade Gothic Spire Lantern Pillars with carved stone bases, textured shafts, middle collar bands, and capitals.
  const columnGeo = new THREE.CylinderGeometry(0.54, 0.66, 6.0, 16);
  const collarRingGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.32, 16);
  ctx.disposableGeometries.push(columnGeo, collarRingGeo);
  const columns = new THREE.InstancedMesh(columnGeo, mats.marble, PLAZA_PILLARS.length);
  const m = new THREE.Matrix4();
  PLAZA_PILLARS.forEach((pl, i) => {
    columns.setMatrixAt(i, m.makeTranslation(pl.x, DECK_Y + 3.3, pl.z));
    // Carved base plinth
    group.add(boxMesh(box, mats.darkStone, pl.x, DECK_Y + 0.22, pl.z, 1.55, 0.44, 1.55));
    group.add(boxMesh(box, mats.stone, pl.x, DECK_Y + 0.55, pl.z, 1.32, 0.26, 1.32));
    // Mid-shaft stone collar ring
    const midCollar = new THREE.Mesh(collarRingGeo, mats.stone);
    midCollar.position.set(pl.x, DECK_Y + 3.4, pl.z);
    // Stepped capital, lantern cage, and pointed spire roof
    group.add(midCollar, boxMesh(box, mats.stone, pl.x, DECK_Y + 6.45, pl.z, 1.48, 0.36, 1.48));
    group.add(boxMesh(box, mats.gold, pl.x, DECK_Y + 6.72, pl.z, 1.58, 0.16, 1.58));
    const cage = new THREE.Mesh(lanternCageGeo, mats.lanternGlow);
    cage.position.set(pl.x, DECK_Y + 7.45, pl.z);
    const roof = new THREE.Mesh(spireRoofGeo, slateSpireMat);
    roof.position.set(pl.x, DECK_Y + 9.85, pl.z);
    group.add(cage, roof);
  });
  columns.instanceMatrix.needsUpdate = true;
  columns.computeBoundingSphere();
  group.add(columns);

  for (const b of PLAZA_BENCHES) {
    group.add(boxMesh(box, mats.marble, b.x, DECK_Y + 0.42, b.z, 2.2, 0.16, 0.7));
    group.add(boxMesh(box, mats.darkStone, b.x - 0.8, DECK_Y + 0.17, b.z, 0.25, 0.34, 0.6));
    group.add(boxMesh(box, mats.darkStone, b.x + 0.8, DECK_Y + 0.17, b.z, 0.25, 0.34, 0.6));
  }
  const glowGeo = new THREE.SphereGeometry(0.35, 10, 8);
  const miniSpireGeo = new THREE.ConeGeometry(0.48, 1.1, 8);
  ctx.disposableGeometries.push(glowGeo, miniSpireGeo);
  for (const l of PLAZA_LANTERNS) {
    group.add(boxMesh(box, mats.darkStone, l.x, DECK_Y + 0.2, l.z, 0.56, 0.4, 0.56));
    group.add(boxMesh(box, mats.stone, l.x, DECK_Y + 1.5, l.z, 0.36, 3.0, 0.36));
    const glow = new THREE.Mesh(glowGeo, mats.lanternGlow);
    glow.position.set(l.x, DECK_Y + 3.25, l.z);
    const cap = new THREE.Mesh(miniSpireGeo, slateSpireMat);
    cap.position.set(l.x, DECK_Y + 4.0, l.z);
    group.add(glow, cap);
  }
}

/**
 * Summary: Builds a grand circular Windspire Central Court (`r = 9.0..14.8m`) connected seamlessly
 *          to the Western Arrival Rotunda via a wide processional avenue, plus clean avenues to
 *          the Northern Sky Garden and the Eastern Stone Viaduct Bridge.
 */
function buildHarborPathways(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): void {
  const cx = SKY_HARBOR.x;
  const cz = SKY_HARBOR.z;
  const ringInnerR = 8.8;
  const ringOuterR = 14.8;

  // 1. Grand Circular Windspire Central Court with textured stone & marble concentric paving
  const courtFillGeo = new THREE.CylinderGeometry(ringInnerR + 0.2, ringInnerR + 0.2, 0.07, 32);
  ctx.disposableGeometries.push(courtFillGeo);
  const courtFill = new THREE.Mesh(courtFillGeo, mats.stone);
  courtFill.position.set(cx, DECK_Y + 0.02, cz);
  group.add(courtFill);
  group.add(buildCircularRingPathway(ctx, mats.marble, mats.gold, cx, cz, ringInnerR, ringOuterR, DECK_Y));

  const spokeFromRing = (tx: number, tz: number): readonly [readonly [number, number], readonly [number, number]] => {
    const dx = tx - cx;
    const dz = tz - cz;
    const len = Math.hypot(dx, dz) || 1;
    const rStart = ringOuterR - 0.3;
    return [
      [cx + (dx / len) * rStart, cz + (dz / len) * rStart],
      [tx, tz],
    ];
  };

  // 2. Clean avenues to actual destinations (removed the diagonal SE dock spoke so it never overlaps the dock apron)
  const radialAvenues: ReadonlyArray<{
    readonly points: ReadonlyArray<readonly [number, number]>;
    readonly width: number;
  }> = [
    // Grand West Processional Avenue: connects the Arrival Rotunda seamlessly into the Windspire Central Ring
    {
      points: [
        [751.0, -35.0],
        [cx - ringOuterR + 0.4, -35.0],
      ],
      width: 6.4,
    },
    // North Garden Promenade: Central Ring -> Northern Crescent Sky Garden & Koi Pond
    { points: spokeFromRing(778.0, -64.0), width: 3.2 },
    // East Viaduct Avenue: Central Ring -> Stone Viaduct Bridge to Crystal Isles
    { points: spokeFromRing(821.0, -25.0), width: 3.2 },
  ];

  for (const ave of radialAvenues) {
    group.add(buildSteppedPathway(box, mats.marble, mats.gold, ave.points, ave.width, DECK_Y));
  }
}
// #endregion

// #region Balconies & Telescopes
function buildBalconies(mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  for (const b of SKY_BALCONIES) group.add(deckSlab(box, mats.marble, b, 0.65));
}

function buildTelescopes(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): IHarborTelescopeVisual[] {
  const tubeGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.8, 12);
  tubeGeo.rotateX(Math.PI / 2);
  const lensGeo = new THREE.CircleGeometry(0.24, 16);
  ctx.disposableGeometries.push(tubeGeo, lensGeo);
  const visuals: IHarborTelescopeVisual[] = [];
  for (const scope of SKY_TELESCOPES) {
    // Only render the telescopes belonging to Sky Harbor's Windspire Summit here;
    // the Giant Observatory Telescope has its own monumental brass model on Sky Observatory.
    if (!scope.balconyId.startsWith('windspire-')) continue;
    const view = telescopeViewFor(scope);
    const stand = new THREE.Group();
    stand.add(
      boxMesh(box, mats.darkStone, scope.x, scope.y + 0.08, scope.z, 0.72, 0.16, 0.72),
      boxMesh(box, mats.gold, scope.x, scope.y + 0.72, scope.z, 0.2, 1.35, 0.2)
    );
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const leg = boxMesh(box, mats.darkWood, scope.x + Math.cos(a) * 0.34, scope.y + 0.42, scope.z + Math.sin(a) * 0.34, 0.09, 0.85, 0.09);
      leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      stand.add(leg);
    }
    const head = new THREE.Group();
    head.position.set(scope.x, scope.y + 1.55, scope.z);
    head.lookAt(view.lookX, view.lookY, view.lookZ);
    const tube = new THREE.Mesh(tubeGeo, mats.gold);
    tube.position.z = 0.35;
    const lens = new THREE.Mesh(lensGeo, mats.crystal);
    lens.position.z = 1.26;
    head.add(tube, lens);
    stand.add(head);
    group.add(stand);
    visuals.push({ scope, stand, head });
  }
  return visuals;
}

function buildRailings(ctx: IWorldModelBuildContext, mats: IHarborMaterials, box: THREE.BoxGeometry, group: THREE.Group): void {
  group.add(buildRailInstances(ctx, box, mats.marble, SKY_HARBOR_SOLID_BOXES));
}
// #endregion

// #region Sky Garden, Deep Koi Pond, Belvedere Tower & Trees
function buildSkyGarden(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): { flowers: IWindFlowerVisual[] } {
  const a = SKY_GARDEN_AREA;
  const discGeo = new THREE.CylinderGeometry(1, 1, 0.08, 32);
  ctx.disposableGeometries.push(discGeo);

  // Sculpted multi-lobed crescent garden along the northern rim, bordered by carved stone garden curbing.
  const gardenLobes: ReadonlyArray<{ x: number; z: number; rx: number; rz: number; rotY: number; lift: number }> = [
    { x: a.cx - 8.5, z: a.cz - 3.5, rx: 11.5, rz: 7.2, rotY: -0.28, lift: 0.04 },
    { x: a.cx + 7.5, z: a.cz - 3.0, rx: 12.0, rz: 7.5, rotY: 0.25, lift: 0.045 },
    { x: a.cx - 1.0, z: a.cz - 6.8, rx: 14.5, rz: 6.5, rotY: 0.05, lift: 0.05 },
    { x: a.cx + 12.5, z: a.cz + 1.5, rx: 7.8, rz: 5.8, rotY: 0.42, lift: 0.035 },
    { x: a.cx - 13.0, z: a.cz + 1.0, rx: 7.5, rz: 5.5, rotY: -0.38, lift: 0.035 },
  ];
  // The lawn lobes and their curbs are cut open where the pond is sunk into the deck.
  const lobeCurbMat = createPondCutoutMaterial(mats.stone as THREE.MeshStandardMaterial, SKY_HARBOR_POND.x, SKY_HARBOR_POND.z, SKY_HARBOR_POND.radius);
  const lobeLawnMat = createPondCutoutMaterial(mats.grass as THREE.MeshStandardMaterial, SKY_HARBOR_POND.x, SKY_HARBOR_POND.z, SKY_HARBOR_POND.radius);
  ctx.disposableMaterials.push(lobeCurbMat, lobeLawnMat);
  for (const lobe of gardenLobes) {
    const curb = new THREE.Mesh(discGeo, lobeCurbMat);
    curb.scale.set(lobe.rx + 0.55, 0.85, lobe.rz + 0.55);
    curb.position.set(lobe.x, DECK_Y + lobe.lift * 0.6, lobe.z);
    curb.rotation.y = lobe.rotY;

    const lawn = new THREE.Mesh(discGeo, lobeLawnMat);
    lawn.scale.set(lobe.rx, 1.1, lobe.rz);
    lawn.position.set(lobe.x, DECK_Y + lobe.lift, lobe.z);
    lawn.rotation.y = lobe.rotY;
    lawn.receiveShadow = !ctx.isSoftwareGl;
    group.add(curb, lawn);
  }

  buildSunkenPond(ctx, mats, discGeo, group);
  buildGardenTrees(ctx, group);
  buildGardenFlowers(ctx, mats, group);
  buildMushrooms(ctx, mats, group);
  buildPavilionAndCliffBlossoms(ctx, mats, box, group);

  return { flowers: buildWindFlowers(ctx, mats, group) };
}

/**
 * Summary: Builds the Sky Garden pond as a real sunken pool: a bowl that slopes from ankle depth at the rim to
 *          about two meters in the middle, a translucent water surface just under deck level, a marble
 *          coping, shoreline boulders, lily pads and lotus blossoms. The deck and the lawns are cut open
 *          around it (see skyboundIslesBuilder and the lawn cutout). The fish are real koi of the
 *          wildlife system (koiPonds.ts), not decoration.
 */
function buildSunkenPond(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  discGeo: THREE.CylinderGeometry,
  group: THREE.Group
): void {
  const pond = SKY_HARBOR_POND;
  const r = pond.radius;

  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.82, side: THREE.DoubleSide });
  const clearSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.28,
    roughness: 0.08,
    metalness: 0.22,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const lilyPadMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
  ctx.disposableMaterials.push(bowlMat, clearSurfaceMat, lilyPadMat);

  // 1. The bowl: a surface of revolution following the same bed curve the player walks on, sandy in the
  //    shallows and dark teal in the deep.
  const RING_STEPS = 24;
  const profile: THREE.Vector2[] = [];
  for (let step = 0; step <= RING_STEPS; step++) {
    const distance = (step / RING_STEPS) * r;
    profile.push(new THREE.Vector2(distance, (skyHarborPondBedY(pond.x + distance, pond.z) ?? pond.rimBedY) - pond.deckY));
  }
  const bowlGeo = new THREE.LatheGeometry(profile, 40);
  const bowlPosition = bowlGeo.getAttribute('position');
  const bowlColors = new Float32Array(bowlPosition.count * 3);
  const sand = new THREE.Color(0xc9b98a);
  const deep = new THREE.Color(0x0a3550);
  const tint = new THREE.Color();
  for (let i = 0; i < bowlPosition.count; i++) {
    const depthFraction = (bowlPosition.getY(i) - (pond.centerBedY - pond.deckY)) / (pond.rimBedY - pond.centerBedY);
    tint.copy(deep).lerp(sand, Math.min(1, Math.max(0, depthFraction)));
    bowlColors[i * 3] = tint.r;
    bowlColors[i * 3 + 1] = tint.g;
    bowlColors[i * 3 + 2] = tint.b;
  }
  bowlGeo.setAttribute('color', new THREE.BufferAttribute(bowlColors, 3));
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.set(pond.x, pond.deckY, pond.z);
  bowl.receiveShadow = !ctx.isSoftwareGl;

  const waterSurface = new THREE.Mesh(discGeo, clearSurfaceMat);
  waterSurface.scale.set(r * 0.995, 0.2, r * 0.995);
  waterSurface.position.set(pond.x, pond.surfaceY, pond.z);

  const copingRingGeo = new THREE.RingGeometry(r - 0.02, r + 0.5, 40);
  copingRingGeo.rotateX(-Math.PI / 2);
  const boulderGeo = new THREE.IcosahedronGeometry(0.55, 1);
  const lilyPadGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.025, 14, 1, false, 0, Math.PI * 1.82);
  ctx.disposableGeometries.push(bowlGeo, copingRingGeo, boulderGeo, lilyPadGeo);

  const coping = new THREE.Mesh(copingRingGeo, mats.marble);
  coping.position.set(pond.x, pond.deckY + 0.1, pond.z);
  group.add(bowl, waterSurface, coping);

  // 2. Sculpted shoreline boulders around the rim, leaving the +x side open as the wading entrance
  for (let b = 0; b < 12; b++) {
    const ang = (b / 12) * Math.PI * 2 + 0.18;
    if (Math.cos(ang) > 0.55) continue;
    const br = r + 0.62 + (b % 3) * 0.14;
    const rock = new THREE.Mesh(boulderGeo, b % 2 === 0 ? mats.darkStone : mats.stone);
    const s = 0.65 + (b % 3) * 0.28;
    rock.scale.set(s * 1.2, s * 0.72, s);
    rock.position.set(pond.x + Math.cos(ang) * br, pond.deckY + 0.25 * s, pond.z + Math.sin(ang) * br);
    rock.rotation.y = ang * 1.7;
    group.add(rock);
  }

  // 3. Floating green lily pads and pink lotus blossoms on the water surface
  const lilySpots: ReadonlyArray<readonly [number, number, number, boolean]> = [
    [-2.4, -1.8, 0.4, true],
    [-1.6, -2.5, 1.9, false],
    [2.5, -1.6, 2.8, true],
    [2.9, -0.7, 0.9, false],
    [-2.2, 2.1, 4.1, true],
    [1.8, 2.4, 5.2, true],
    [0.8, 2.9, 3.4, false],
  ];
  for (const [lx, lz, rot, hasLotus] of lilySpots) {
    const pad = new THREE.Mesh(lilyPadGeo, lilyPadMat);
    pad.position.set(pond.x + lx, pond.surfaceY + 0.025, pond.z + lz);
    pad.rotation.y = rot;
    group.add(pad);
    if (hasLotus) {
      const lotus = new THREE.Mesh(boulderGeo, mats.petal);
      lotus.scale.set(0.28, 0.18, 0.28);
      lotus.position.set(pond.x + lx, pond.surfaceY + 0.07, pond.z + lz);
      group.add(lotus);
    }
  }
}

/**
 * Summary: Builds the renovated Celestial Garden Belvedere Tower (`GARDEN_CANOPY_PERCH`) with
 *          sculpted stone buttresses, a corbeled gallery crown, marble balustrade, 6 classical
 *          columns, full circular entablature ring, and ribbed dome + cliff blossoms.
 */
function buildPavilionAndCliffBlossoms(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): void {
  const perch = GARDEN_CANOPY_PERCH;
  const towerH = perch.y - DECK_Y;
  const perchGeo = new THREE.CylinderGeometry(perch.radius + 0.08, perch.radius * 0.92, 0.52, 32);
  const corbelFlareGeo = new THREE.CylinderGeometry(perch.radius * 0.92, 1.05, 1.45, 24);
  const centralPillarGeo = new THREE.CylinderGeometry(0.95, 1.18, towerH - 1.2, 20);
  const baseOctagonGeo = new THREE.CylinderGeometry(1.75, 2.15, 1.1, 8);
  const rimTorusGeo = new THREE.TorusGeometry(perch.radius + 0.06, 0.08, 8, 32);
  rimTorusGeo.rotateX(Math.PI / 2);
  const pavColGeo = new THREE.CylinderGeometry(0.2, 0.24, 4.1, 14);
  const entablatureGeo = new THREE.CylinderGeometry(perch.radius + 0.26, perch.radius + 0.2, 0.42, 32);
  const domeGeo = new THREE.SphereGeometry(perch.radius + 0.24, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.48);
  const domeRibGeo = new THREE.TorusGeometry(perch.radius + 0.26, 0.06, 8, 20, Math.PI * 0.48);
  const finialGeo = new THREE.ConeGeometry(0.38, 1.9, 8);
  const blossomPetalGeo = new THREE.ConeGeometry(0.85, 2.2, 5);
  ctx.disposableGeometries.push(
    perchGeo,
    corbelFlareGeo,
    centralPillarGeo,
    baseOctagonGeo,
    rimTorusGeo,
    pavColGeo,
    entablatureGeo,
    domeGeo,
    domeRibGeo,
    finialGeo,
    blossomPetalGeo
  );

  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: ctx.textures.rockAlbedo,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.15,
    roughness: 0.45,
    bumpMap: ctx.textures.rockBump,
    bumpScale: 0.04,
  });
  const whiteBlossomMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xe2e8f0, emissiveIntensity: 0.3, roughness: 0.5 });
  ctx.disposableMaterials.push(domeMat, whiteBlossomMat);

  // 1. Stepped Octagonal Foundation, Buttressed Tower Shaft & Corbeled Capital under the Perch
  const baseOctagon = new THREE.Mesh(baseOctagonGeo, mats.darkStone);
  baseOctagon.position.set(perch.x, DECK_Y + 0.55, perch.z);
  const centralCol = new THREE.Mesh(centralPillarGeo, mats.marble);
  centralCol.position.set(perch.x, DECK_Y + (towerH - 1.2) / 2 + 0.4, perch.z);
  const corbelFlare = new THREE.Mesh(corbelFlareGeo, mats.stone);
  corbelFlare.position.set(perch.x, perch.y - 0.95, perch.z);
  const perchDeck = new THREE.Mesh(perchGeo, mats.marble);
  perchDeck.position.set(perch.x, perch.y - 0.24, perch.z);
  const deckGoldRim = new THREE.Mesh(rimTorusGeo, mats.gold);
  deckGoldRim.position.set(perch.x, perch.y - 0.04, perch.z);

  group.add(
    baseOctagon,
    centralCol,
    corbelFlare,
    perchDeck,
    deckGoldRim,
    boxMesh(box, mats.gold, perch.x, DECK_Y + 1.12, perch.z, 2.5, 0.14, 2.5),
    boxMesh(box, mats.gold, perch.x, DECK_Y + towerH * 0.5, perch.z, 2.1, 0.18, 2.1)
  );

  // 4 Sculpted flying buttress ribs flanking the tower shaft
  for (let b = 0; b < 4; b++) {
    const ba = (b / 4) * Math.PI * 2 + Math.PI / 4;
    const bx = perch.x + Math.cos(ba) * 1.25;
    const bz = perch.z + Math.sin(ba) * 1.25;
    group.add(
      boxMesh(box, mats.stone, bx, DECK_Y + towerH * 0.45, bz, 0.42, towerH * 0.78, 0.72, -ba),
      boxMesh(box, mats.gold, bx, perch.y - 0.9, bz, 0.48, 0.35, 0.88, -ba)
    );
  }

  // 2. Low Marble-and-Gold Balustrade around the northern (outer cliff) arc of the Perch
  for (let r = 0; r < 7; r++) {
    const ang = -Math.PI * 0.88 + (r / 6) * Math.PI * 0.76;
    const rx = perch.x + Math.cos(ang) * (perch.radius - 0.16);
    const rz = perch.z + Math.sin(ang) * (perch.radius - 0.16);
    const tangentYaw = Math.atan2(-Math.cos(ang), -Math.sin(ang));
    group.add(
      boxMesh(box, mats.stone, rx, perch.y + 0.38, rz, 0.62, 0.72, 0.18, tangentYaw),
      boxMesh(box, mats.gold, rx, perch.y + 0.78, rz, 0.66, 0.1, 0.22, tangentYaw)
    );
  }

  // 3. Six Classical Columns, Full Circular Entablature Ring & Ribbed Celestial Dome
  const roofY = perch.y + 4.15;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const cx = perch.x + Math.cos(a) * (perch.radius - 0.24);
    const cz = perch.z + Math.sin(a) * (perch.radius - 0.24);
    const col = new THREE.Mesh(pavColGeo, mats.marble);
    col.position.set(cx, perch.y + 2.05, cz);
    group.add(
      col,
      boxMesh(box, mats.stone, cx, perch.y + 0.14, cz, 0.54, 0.28, 0.54),
      boxMesh(box, mats.gold, cx, perch.y + 0.3, cz, 0.48, 0.08, 0.48),
      boxMesh(box, mats.gold, cx, roofY - 0.14, cz, 0.56, 0.24, 0.56)
    );
  }

  const entablature = new THREE.Mesh(entablatureGeo, mats.stone);
  entablature.position.set(perch.x, roofY + 0.15, perch.z);
  const roofGoldRim = new THREE.Mesh(rimTorusGeo, mats.gold);
  roofGoldRim.scale.setScalar(1.08);
  roofGoldRim.position.set(perch.x, roofY + 0.36, perch.z);
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.set(perch.x, roofY + 0.32, perch.z);
  group.add(entablature, roofGoldRim, dome);

  // 6 Golden meridian ribs curving up the Belvedere dome
  for (let k = 0; k < 6; k++) {
    const rib = new THREE.Mesh(domeRibGeo, mats.gold);
    rib.position.set(perch.x, roofY + 0.32, perch.z);
    rib.rotation.z = Math.PI / 2;
    rib.rotation.y = (k / 6) * Math.PI * 2 + Math.PI / 6;
    group.add(rib);
  }

  const finial = new THREE.Mesh(finialGeo, mats.gold);
  finial.position.set(perch.x, roofY + perch.radius + 1.25, perch.z);
  const finialOrb = boxMesh(box, mats.crystal, perch.x, roofY + perch.radius + 2.25, perch.z, 0.38, 0.55, 0.38);
  group.add(finial, finialOrb);

  // Giant white cliff-edge magnolia/lotus blossoms adorning the rocky flanks of Sky Harbor.
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + 0.2;
    const r = SKY_HARBOR.radius * 0.96;
    const bx = SKY_HARBOR.x + Math.cos(ang) * r;
    const bz = SKY_HARBOR.z + Math.sin(ang) * r;
    const by = DECK_Y - 2.2 - (i % 3) * 1.8;
    const flowerCluster = new THREE.Group();
    flowerCluster.position.set(bx, by, bz);
    flowerCluster.rotation.y = -ang;
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(blossomPetalGeo, whiteBlossomMat);
      petal.position.set(0.3, Math.sin(pa) * 0.5, Math.cos(pa) * 0.5);
      petal.rotation.set(pa * 0.3, 0, -Math.PI / 3);
      flowerCluster.add(petal);
    }
    group.add(flowerCluster);
  }
}

function buildGardenTrees(ctx: IWorldModelBuildContext, group: THREE.Group): void {
  buildInstancedSkyTrees(
    ctx,
    group,
    GARDEN_TREES.map((t) => ({
      x: t.x,
      y: DECK_Y,
      z: t.z,
      scale: t.scale,
      style: 'broadleaf' as const,
    }))
  );
}

function buildGardenFlowers(ctx: IWorldModelBuildContext, mats: IHarborMaterials, group: THREE.Group): void {
  const flowerGeo = new THREE.CylinderGeometry(0.18, 0.06, 0.06, 6);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
  ctx.disposableGeometries.push(flowerGeo);
  ctx.disposableMaterials.push(flowerMat);
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, GARDEN_FLOWER_COUNT);
  const a = SKY_GARDEN_AREA;
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  for (let i = 0; i < GARDEN_FLOWER_COUNT; i++) {
    const r = Math.sqrt((i + 0.5) / GARDEN_FLOWER_COUNT) * 0.92;
    const ang = i * 2.39996;
    m.makeTranslation(a.cx + Math.cos(ang) * r * a.rx, DECK_Y + 0.05, a.cz + Math.sin(ang) * r * a.rz);
    flowers.setMatrixAt(i, m);
    flowers.setColorAt(i, color.setHex(FLOWER_COLORS[i % FLOWER_COLORS.length]));
  }
  flowers.instanceMatrix.needsUpdate = true;
  flowers.computeBoundingSphere();
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
