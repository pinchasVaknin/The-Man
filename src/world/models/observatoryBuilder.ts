// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Observatory
// DESIGN: Placed from the Observatory domain data; the tower wall, railings and chamber walls
//         are drawn from their solid boxes. Matches the reference artwork:
//         1) Monumental Golden Mechanical Armillary Sphere with interlocking clockwork gears,
//            outer filigree meridian arc, dark starry celestial globe at the core, and 3
//            rotating puzzle rings with lit/dim gems controlled by the 3 levers.
//         2) Grand Domed Astral Library & Observatory Tower with arched windows, illuminated
//            interior bookshelves, ribbed gold-trimmed dome, and radiant diamond crystal spire.
//         3) Brass Refractor Telescope on an articulated tripod/gear mount with a crescent-helmed
//            golden Astral Watcher statue, carved access stairs, and astral marble-and-gold pathways.
// SUMMARY: Builds and animates the Sky Observatory.
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
  OBSERVATORY_TELESCOPE_PLATFORM,
  OBSERVATORY_TELESCOPE_STAIR,
  OBSERVATORY_SOLID_BOXES,
  OBSERVATORY_RING_STEPS,
  OBSERVATORY_RING_SOLUTION,
  SKY_TELESCOPES,
  aimedTelescopeLookPoint,
  getTelescopeRuntimeAim,
  telescopeViewFor,
  getSkyPuzzleState,
  isSkyPuzzleSolved,
} from '../domain/landmarksRegistry';
import {
  boxMesh,
  buildInstancedSkyTrees,
  buildRailInstances,
  createMaterials,
  deckSlab,
  rampSlab,
  type IHarborMaterials,
} from './skyHarborShared';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Observatory builder hands back to the frame loop. */
export interface IObservatoryBuildResult {
  readonly group: THREE.Group;
  /** Animates the dial rings, clockwork gears, lit gems, the sliding gate and the dome crystal. */
  readonly update: (elapsedSec: number) => void;
}

interface IDialRingVisual {
  readonly pivot: THREE.Group;
  readonly sphereRing: THREE.Group;
  readonly gems: THREE.Mesh[];
}
// #endregion

// #region Tuning
const ISLAND = getSkyIsland('sky-observatory')!;
const DECK_Y = ISLAND.deckY;
const STEP_ANGLE = (Math.PI * 2) / OBSERVATORY_RING_STEPS;
/** How far (m) the chamber gate sinks into the floor once open. */
const GATE_SINK_M = 3.8;
const STARFIELD_STAR_COUNT = 150;
const STAR_PALETTE = [0xfef08a, 0x7dd3fc, 0xffffff, 0xe9d5ff, 0xfde68a] as const;
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

  const gemLit = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xf59e0b, emissiveIntensity: 2.4, roughness: 0.18 });
  const gemDim = new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0x0f172a, emissiveIntensity: 0.25, roughness: 0.45 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0x78350f, emissiveIntensity: 0.22, roughness: 0.25, metalness: 0.85 });
  const darkBrassMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.38, metalness: 0.8 });
  const celestialGlobeMat = new THREE.MeshStandardMaterial({ color: 0x090f24, emissive: 0x070b19, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.4 });
  const domeSlateMat = new THREE.MeshStandardMaterial({ color: 0x263248, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide });
  const diamondCrystalMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x7dd3fc, emissiveIntensity: 2.2, roughness: 0.1, metalness: 0.15 });
  ctx.disposableMaterials.push(gemLit, gemDim, brassMat, darkBrassMat, celestialGlobeMat, domeSlateMat, diamondCrystalMat);

  buildStarryObservatoryGround(ctx, mats, brassMat, diamondCrystalMat, box, group);
  const domeCrystal = buildTower(ctx, mats, brassMat, domeSlateMat, diamondCrystalMat, box, group);
  buildStarMap(ctx, mats, brassMat, gemLit, gemDim, group);
  const gate = buildChamber(mats, box, group);
  buildBalcony(ctx, mats, brassMat, box, group);
  const armillary = buildDial(ctx, mats, brassMat, darkBrassMat, celestialGlobeMat, box, gemDim, group);
  const giantTelescopeMount = buildGiantTelescope(ctx, mats, brassMat, darkBrassMat, box, group);
  group.add(buildRailInstances(ctx, box, brassMat, OBSERVATORY_SOLID_BOXES));

  const giantScope = SKY_TELESCOPES.find((sc) => sc.id === 'telescope-observatory-giant');

  return {
    group,
    update: (elapsedSec: number) => {
      const state = getSkyPuzzleState();
      const solved = isSkyPuzzleSolved('observatory-rings');
      armillary.rings.forEach((ring, i) => {
        const target = state.observatoryRings[i] * STEP_ANGLE;
        ring.pivot.rotation.y += (target - ring.pivot.rotation.y) * 0.12;
        ring.sphereRing.rotation.y = ring.pivot.rotation.y + elapsedSec * (0.08 * (i % 2 === 0 ? 1 : -1));
        ring.gems.forEach((gem, g) => {
          gem.material = g < state.observatoryRings[i] ? gemLit : gemDim;
        });
      });
      armillary.gears.forEach((gear, idx) => {
        gear.rotation.z = elapsedSec * (idx % 2 === 0 ? 0.45 : -0.6);
      });
      armillary.globe.rotation.y = elapsedSec * 0.25;
      gemLit.emissiveIntensity = solved ? 3.2 + Math.sin(elapsedSec * 3) * 0.6 : 2.4;
      const gateTargetY = solved ? -GATE_SINK_M : 0;
      gate.position.y += (gateTargetY - gate.position.y) * 0.05;
      domeCrystal.rotation.y = elapsedSec * 0.65;
      domeCrystal.position.y = domeCrystal.userData.baseY + Math.sin(elapsedSec * 1.9) * 0.2;

      if (giantScope) {
        const aim = getTelescopeRuntimeAim();
        const isLooking = aim.id === giantScope.id;
        giantTelescopeMount.visible = !isLooking;
        if (isLooking) {
          const view = telescopeViewFor(giantScope);
          const aimed = aimedTelescopeLookPoint(view, aim.yaw, aim.pitch);
          giantTelescopeMount.lookAt(aimed.lookX, aimed.lookY, aimed.lookZ);
        }
      }
    },
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Cosmic Starfield Ground Mosaic & Starlight Trees
function buildStarryObservatoryGround(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  brassMat: THREE.MeshStandardMaterial,
  diamondCrystalMat: THREE.MeshStandardMaterial,
  box: THREE.BoxGeometry,
  group: THREE.Group
): void {
  const cx = ISLAND.x;
  const cz = ISLAND.z;
  const maxR = ISLAND.radius - 0.8;

  const cosmosFloorGeo = new THREE.CylinderGeometry(maxR, maxR + 0.3, 0.05, 64);
  const nebulaDiscGeo = new THREE.CylinderGeometry(1, 1, 0.04, 32);
  const astrolabeRingGeo = new THREE.RingGeometry(0.97, 1.0, 64);
  astrolabeRingGeo.rotateX(-Math.PI / 2);
  const starPrismGeo = new THREE.OctahedronGeometry(0.22, 0);
  starPrismGeo.scale(1.15, 0.35, 1.15);
  ctx.disposableGeometries.push(cosmosFloorGeo, nebulaDiscGeo, astrolabeRingGeo, starPrismGeo);

  const cosmosFloorMat = new THREE.MeshStandardMaterial({
    color: 0x090f26,
    emissive: 0x0c1938,
    emissiveIntensity: 0.65,
    roughness: 0.32,
    metalness: 0.25,
    bumpMap: ctx.textures.rockBump,
    bumpScale: 0.025,
  });
  const nebulaVioletMat = new THREE.MeshStandardMaterial({
    color: 0x2e1065,
    emissive: 0x581c87,
    emissiveIntensity: 0.75,
    roughness: 0.4,
  });
  const nebulaCyanMat = new THREE.MeshStandardMaterial({
    color: 0x082f49,
    emissive: 0x0369a1,
    emissiveIntensity: 0.75,
    roughness: 0.4,
  });
  const starMeshMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });
  ctx.disposableMaterials.push(cosmosFloorMat, nebulaVioletMat, nebulaCyanMat, starMeshMat);

  // 1. Deep midnight-indigo cosmic starfield floor covering the island deck (no walkways)
  const cosmosFloor = new THREE.Mesh(cosmosFloorGeo, cosmosFloorMat);
  cosmosFloor.position.set(cx, DECK_Y + 0.015, cz);
  cosmosFloor.receiveShadow = !ctx.isSoftwareGl;
  group.add(cosmosFloor);

  // 2. Soft luminous Nebula & Milky-Way clouds inlaid across the starry ground
  const nebulaPatches: ReadonlyArray<readonly [number, number, number, number, number, boolean]> = [
    [cx + 6.5, cz + 4.5, 9.5, 5.2, 0.45, true],
    [cx - 8.0, cz + 6.0, 8.2, 4.8, -0.35, false],
    [cx + 9.0, cz - 11.0, 7.8, 4.5, 0.8, false],
    [cx - 12.0, cz - 8.5, 7.5, 4.2, -0.6, true],
    [cx + 1.0, cz + 14.5, 9.0, 4.0, 0.12, true],
  ];
  for (const [nx, nz, rx, rz, rotY, isViolet] of nebulaPatches) {
    const patch = new THREE.Mesh(nebulaDiscGeo, isViolet ? nebulaVioletMat : nebulaCyanMat);
    patch.scale.set(rx, 1, rz);
    patch.position.set(nx, DECK_Y + 0.026, nz);
    patch.rotation.y = rotY;
    group.add(patch);
  }

  // 3. Concentric golden celestial astrolabe rings & 12 zodiac meridian rays etched into the starry floor
  for (const r of [7.5, 14.2, 20.8, maxR]) {
    const ring = new THREE.Mesh(astrolabeRingGeo, brassMat);
    ring.scale.setScalar(r);
    ring.position.set(cx, DECK_Y + 0.042, cz);
    group.add(ring);
  }
  for (let m = 0; m < 12; m++) {
    const ang = (m / 12) * Math.PI * 2;
    const innerR = 7.5;
    const outerR = maxR - 0.3;
    const midR = (innerR + outerR) / 2;
    const rayLen = outerR - innerR;
    group.add(
      boxMesh(
        box,
        brassMat,
        cx + Math.cos(ang) * midR,
        DECK_Y + 0.036,
        cz + Math.sin(ang) * midR,
        rayLen,
        0.02,
        0.09,
        -ang
      )
    );
  }

  // 4. Engraved Constellation Lines & Bright Anchor Stars across the island floor
  const constellations: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    // Southern Crown & Archer Arc
    [
      [cx - 4.0, cz + 9.0],
      [cx + 1.5, cz + 7.5],
      [cx + 6.5, cz + 10.5],
      [cx + 11.0, cz + 8.0],
      [cx + 14.5, cz + 12.0],
    ],
    // Eastern Lyra & Cygnus Cross
    [
      [cx + 8.0, cz - 1.5],
      [cx + 13.5, cz + 2.0],
      [cx + 19.0, cz - 1.0],
      [cx + 15.0, cz - 6.5],
      [cx + 8.0, cz - 1.5],
    ],
    // North-East Cassiopeia W
    [
      [cx + 4.5, cz - 16.0],
      [cx + 8.5, cz - 19.5],
      [cx + 12.0, cz - 16.5],
      [cx + 16.5, cz - 19.0],
      [cx + 19.5, cz - 15.0],
    ],
    // South-West Celestial Dipper
    [
      [cx - 21.0, cz + 4.0],
      [cx - 17.5, cz + 2.0],
      [cx - 13.0, cz + 3.5],
      [cx - 9.0, cz + 6.0],
      [cx - 5.5, cz + 12.5],
      [cx - 10.5, cz + 15.5],
      [cx - 13.0, cz + 3.5],
    ],
  ];

  for (const poly of constellations) {
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i];
      const majorStar = new THREE.Mesh(starPrismGeo, diamondCrystalMat);
      majorStar.scale.set(1.8, 0.65, 1.8);
      majorStar.position.set(ax, DECK_Y + 0.055, az);
      majorStar.rotation.y = i * 0.7;
      group.add(majorStar);

      if (i + 1 < poly.length) {
        const [bx, bz] = poly[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const len = Math.hypot(dx, dz);
        const yaw = Math.atan2(-dz, dx);
        group.add(boxMesh(box, brassMat, (ax + bx) / 2, DECK_Y + 0.044, (az + bz) / 2, len, 0.025, 0.07, yaw));
      }
    }
  }

  // 5. 150 Instanced Glowing Starfield Stars scattered across the cosmic floor
  const stars = new THREE.InstancedMesh(starPrismGeo, starMeshMat, STARFIELD_STAR_COUNT);
  const mat4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();
  for (let i = 0; i < STARFIELD_STAR_COUNT; i++) {
    const r = Math.sqrt((i + 0.5) / STARFIELD_STAR_COUNT) * (maxR - 1.2);
    const ang = i * 2.3999632;
    const sx = cx + Math.cos(ang) * r;
    const sz = cz + Math.sin(ang) * r;
    const starScale = 0.55 + ((i * 7) % 5) * 0.26;
    pos.set(sx, DECK_Y + 0.048, sz);
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i * 0.785) % (Math.PI * 2));
    scl.set(starScale, starScale * 0.45, starScale);
    mat4.compose(pos, quat, scl);
    stars.setMatrixAt(i, mat4);
    stars.setColorAt(i, col.setHex(STAR_PALETTE[i % STAR_PALETTE.length]));
  }
  stars.instanceMatrix.needsUpdate = true;
  if (stars.instanceColor) stars.instanceColor.needsUpdate = true;
  stars.computeBoundingSphere();
  group.add(stars);

  // Memory-optimized instanced world trees on the outer NW and SE cliff rims (outside all puzzle sightlines).
  buildInstancedSkyTrees(ctx, group, [
    { x: ISLAND.x - 16.5, y: DECK_Y, z: ISLAND.z - 10.5, scale: 0.88, style: 'pine' },
    { x: ISLAND.x + 16.5, y: DECK_Y, z: ISLAND.z + 10.5, scale: 0.85, style: 'pine' },
  ]);
}
// #endregion

// #region Tower (Domed Astral Library & Observatory)
function buildTower(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  brassMat: THREE.MeshStandardMaterial,
  domeSlateMat: THREE.MeshStandardMaterial,
  diamondCrystalMat: THREE.MeshStandardMaterial,
  box: THREE.BoxGeometry,
  group: THREE.Group
): THREE.Mesh {
  const T = OBSERVATORY_TOWER;
  const wallHeight = T.wallTopY - DECK_Y;
  const outerR = T.innerR + T.wallThickness;

  const archGeo = new THREE.TorusGeometry(1.45, 0.22, 8, 18, Math.PI);
  const pilasterGeo = new THREE.CylinderGeometry(0.38, 0.45, wallHeight + 0.3, 10);
  const domeGeo = new THREE.SphereGeometry(outerR + 0.25, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  const ribGeo = new THREE.TorusGeometry(outerR + 0.32, 0.16, 8, 28, Math.PI / 2);
  const corniceGeo = new THREE.CylinderGeometry(outerR + 0.65, outerR + 0.55, 0.65, 40);
  const floorGeo = new THREE.CylinderGeometry(T.innerR, T.innerR, 0.08, 40);
  const floorInlayGeo = new THREE.RingGeometry(T.innerR * 0.45, T.innerR * 0.52, 36);
  floorInlayGeo.rotateX(-Math.PI / 2);
  const crystalGeo = new THREE.OctahedronGeometry(1.45, 0);
  crystalGeo.scale(1, 2.35, 1);
  const haloGeo = new THREE.TorusGeometry(2.1, 0.09, 8, 36);
  haloGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(archGeo, pilasterGeo, domeGeo, ribGeo, corniceGeo, floorGeo, floorInlayGeo, crystalGeo, haloGeo);

  const windowGlowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x0f172a, emissiveIntensity: 0.45, roughness: 0.35 });
  const bookSpineMat = new THREE.MeshStandardMaterial({ color: 0xb45309, emissive: 0xd97706, emissiveIntensity: 0.65, roughness: 0.55 });
  const crystalCoreMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 2.6, roughness: 0.1 });
  ctx.disposableMaterials.push(windowGlowMat, bookSpineMat, crystalCoreMat);

  const wallBoxes = OBSERVATORY_SOLID_BOXES.filter((b) => b.id.startsWith('observatory-tower-wall'));
  for (let i = 0; i < wallBoxes.length; i++) {
    const wall = wallBoxes[i];
    const cx = (wall.minX + wall.maxX) / 2;
    const cy = (wall.minY + wall.maxY) / 2;
    const cz = (wall.minZ + wall.maxZ) / 2;
    const sx = wall.maxX - wall.minX;
    const sy = wall.maxY - wall.minY;
    const sz = wall.maxZ - wall.minZ;
    const yaw = wall.yaw ?? 0;

    group.add(boxMesh(box, mats.stone, cx, cy, cz, sx, sy, sz, yaw));

    const ang = Math.atan2(cz - T.z, cx - T.x);
    const pilaster = new THREE.Mesh(pilasterGeo, mats.marble);
    pilaster.position.set(T.x + Math.cos(ang) * (outerR + 0.14), DECK_Y + wallHeight / 2, T.z + Math.sin(ang) * (outerR + 0.14));
    group.add(pilaster);

    const winArch = new THREE.Mesh(archGeo, brassMat);
    winArch.position.set(T.x + Math.cos(ang) * (outerR + 0.12), DECK_Y + wallHeight * 0.68, T.z + Math.sin(ang) * (outerR + 0.12));
    winArch.rotation.y = -ang + Math.PI / 2;
    group.add(winArch);

    const extBack = boxMesh(
      box,
      windowGlowMat,
      T.x + Math.cos(ang) * (outerR + 0.04),
      DECK_Y + wallHeight * 0.45,
      T.z + Math.sin(ang) * (outerR + 0.04),
      sx * 0.76,
      wallHeight * 0.68,
      0.08,
      yaw
    );
    group.add(extBack);

    if (Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))) > 0.55) {
      for (let shelf = 0; shelf < 4; shelf++) {
        const syShelf = DECK_Y + 1.15 + shelf * 1.15;
        const intShelf = boxMesh(
          box,
          bookSpineMat,
          T.x + Math.cos(ang) * (T.innerR - 0.16),
          syShelf,
          T.z + Math.sin(ang) * (T.innerR - 0.16),
          sx * 0.72,
          0.72,
          0.24,
          yaw
        );
        const extShelf = boxMesh(
          box,
          bookSpineMat,
          T.x + Math.cos(ang) * (outerR + 0.09),
          syShelf,
          T.z + Math.sin(ang) * (outerR + 0.09),
          sx * 0.68,
          0.68,
          0.14,
          yaw
        );
        group.add(intShelf, extShelf);
      }
    }
  }

  for (const sign of [1, -1]) {
    const lintelBottom = DECK_Y + 4.2;
    group.add(boxMesh(box, mats.stone, T.x, (lintelBottom + T.wallTopY) / 2, T.z + sign * (T.innerR + T.wallThickness / 2), 4.8, T.wallTopY - lintelBottom, T.wallThickness));
    const entryArch = new THREE.Mesh(archGeo, brassMat);
    entryArch.scale.set(1.35, 1.1, 1.2);
    entryArch.position.set(T.x, lintelBottom, T.z + sign * (outerR + 0.1));
    entryArch.rotation.y = sign > 0 ? 0 : Math.PI;
    group.add(entryArch);
  }

  const dome = new THREE.Mesh(domeGeo, domeSlateMat);
  dome.position.set(T.x, T.wallTopY, T.z);
  const cornice = new THREE.Mesh(corniceGeo, brassMat);
  cornice.position.set(T.x, T.wallTopY, T.z);
  group.add(dome, cornice);

  const ribCount = 12;
  for (let r = 0; r < ribCount; r++) {
    const rib = new THREE.Mesh(ribGeo, brassMat);
    rib.position.set(T.x, T.wallTopY, T.z);
    rib.rotation.y = (r / ribCount) * Math.PI * 2;
    group.add(rib);
  }

  const floor = new THREE.Mesh(floorGeo, mats.marble);
  floor.position.set(T.x, DECK_Y + 0.04, T.z);
  const inlay = new THREE.Mesh(floorInlayGeo, brassMat);
  inlay.position.set(T.x, DECK_Y + 0.09, T.z);
  group.add(floor, inlay);

  const crystalBaseY = T.wallTopY + outerR + 2.8;
  const crystal = new THREE.Mesh(crystalGeo, crystalCoreMat);
  crystal.position.set(T.x, crystalBaseY, T.z);
  crystal.userData.baseY = crystalBaseY;
  const innerDiamond = new THREE.Mesh(crystalGeo, diamondCrystalMat);
  innerDiamond.scale.setScalar(0.65);
  crystal.add(innerDiamond);
  const halo = new THREE.Mesh(haloGeo, brassMat);
  halo.position.set(T.x, crystalBaseY - 1.2, T.z);
  group.add(crystal, halo);

  return crystal;
}

/** Star map on the tower's east inner wall: three rings of six gems, lit as the solution needs. */
function buildStarMap(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  brassMat: THREE.MeshStandardMaterial,
  gemLit: THREE.Material,
  gemDim: THREE.Material,
  group: THREE.Group
): void {
  const m = OBSERVATORY_STAR_MAP;
  const panelGeo = new THREE.PlaneGeometry(4.8, 4.8);
  const ringGeo = new THREE.TorusGeometry(1, 0.045, 8, 40);
  const gemGeo = new THREE.SphereGeometry(0.14, 10, 8);
  ctx.disposableGeometries.push(panelGeo, ringGeo, gemGeo);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x090d1f, emissiveIntensity: 0.5, roughness: 0.7 });
  ctx.disposableMaterials.push(panelMat);
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(m.x, m.y, m.z);
  panel.rotation.y = -Math.PI / 2;
  group.add(panel);
  OBSERVATORY_DIAL.ringRadii.forEach((r, i) => {
    const scale = r * 0.55;
    const ring = new THREE.Mesh(ringGeo, brassMat);
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

  const g = OBSERVATORY_CHAMBER_GATE;
  const gate = new THREE.Group();
  gate.add(boxMesh(box, mats.darkStone, (g.minX + g.maxX) / 2, (g.minY + g.maxY) / 2, (g.minZ + g.maxZ) / 2, g.maxX - g.minX, g.maxY - g.minY, g.maxZ - g.minZ));
  gate.add(boxMesh(box, mats.runeDim, (g.minX + g.maxX) / 2, (g.minY + g.maxY) / 2, g.maxZ + 0.02, 1.4, 1.4, 0.04));
  group.add(gate);
  return gate;
}
// #endregion

// #region Balcony
function buildBalcony(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  brassMat: THREE.MeshStandardMaterial,
  box: THREE.BoxGeometry,
  group: THREE.Group
): void {
  const B = OBSERVATORY_BALCONY;
  const floorGeo = new THREE.RingGeometry(B.innerR, B.outerR, 48);
  floorGeo.rotateX(Math.PI / 2);
  const edgeGeo = new THREE.CylinderGeometry(B.outerR, B.outerR - 0.5, 0.65, 48, 1, true);
  ctx.disposableGeometries.push(floorGeo, edgeGeo);
  const twoSided = mats.stone.clone();
  twoSided.side = THREE.DoubleSide;
  ctx.disposableMaterials.push(twoSided);
  const floor = new THREE.Mesh(floorGeo, twoSided);
  floor.position.set(B.x, B.y, B.z);
  const edge = new THREE.Mesh(edgeGeo, brassMat);
  edge.position.set(B.x, B.y - 0.3, B.z);
  group.add(floor, edge);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    group.add(boxMesh(box, mats.darkStone, B.x + Math.cos(a) * (B.outerR - 0.8), (DECK_Y + B.y) / 2, B.z + Math.sin(a) * (B.outerR - 0.8), 0.5, B.y - DECK_Y, 0.5));
  }
  group.add(rampSlab(box, mats.stone, OBSERVATORY_BALCONY_RAMP, 0.55));
}
// #endregion

// #region Monumental Golden Mechanical Armillary Sphere & Dial
function buildDial(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  brassMat: THREE.MeshStandardMaterial,
  darkBrassMat: THREE.MeshStandardMaterial,
  celestialGlobeMat: THREE.MeshStandardMaterial,
  box: THREE.BoxGeometry,
  gemDim: THREE.Material,
  group: THREE.Group
): { rings: IDialRingVisual[]; gears: THREE.Group[]; globe: THREE.Group } {
  const D = OBSERVATORY_DIAL;
  const daisHeight = D.daisTopY - DECK_Y;
  const daisGeo = new THREE.CylinderGeometry(4.1, 4.45, daisHeight, 12);
  const daisStepGeo = new THREE.CylinderGeometry(3.4, 3.85, 0.32, 12);
  const ringGeo = new THREE.TorusGeometry(1, 0.085, 10, 48);
  ringGeo.rotateX(Math.PI / 2);
  const armillaryBandGeo = new THREE.TorusGeometry(1, 0.065, 10, 48);
  const crescentArcGeo = new THREE.TorusGeometry(5.6, 0.32, 10, 48, Math.PI * 1.35);
  const globeGeo = new THREE.SphereGeometry(2.35, 28, 20);
  const gemGeo = new THREE.SphereGeometry(0.22, 12, 10);
  const gearRimGeo = new THREE.TorusGeometry(1, 0.12, 8, 28);
  const gearHubGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12);
  gearHubGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(daisGeo, daisStepGeo, ringGeo, armillaryBandGeo, crescentArcGeo, globeGeo, gemGeo, gearRimGeo, gearHubGeo);

  // Stepped dark-stone & gold-trimmed dais base + front brass staircase steps.
  const dais = new THREE.Mesh(daisGeo, mats.darkStone);
  dais.position.set(D.x, (DECK_Y + D.daisTopY) / 2, D.z);
  const daisStep = new THREE.Mesh(daisStepGeo, brassMat);
  daisStep.position.set(D.x, D.daisTopY + 0.14, D.z);
  group.add(dais, daisStep);

  for (let s = 0; s < 3; s++) {
    group.add(boxMesh(box, brassMat, D.x, DECK_Y + 0.12 + s * 0.16, D.z + 4.55 - s * 0.32, 2.2 - s * 0.2, 0.16, 0.36));
  }

  const sphereCenterY = D.daisTopY + 6.4;

  // Pedestal cradle & clockwork gear train at the base of the Armillary Sphere.
  group.add(boxMesh(box, darkBrassMat, D.x, D.daisTopY + 0.65, D.z, 2.2, 1.1, 2.2));
  const dialFace = new THREE.Mesh(globeGeo, celestialGlobeMat);
  dialFace.scale.set(0.38, 0.38, 0.22);
  dialFace.position.set(D.x, D.daisTopY + 1.1, D.z + 1.05);
  group.add(dialFace);

  const gears: THREE.Group[] = [];
  for (const [gx, gy, gz, gr, teeth] of [
    [-2.3, D.daisTopY + 1.5, 0.4, 1.45, 14],
    [-3.4, D.daisTopY + 2.6, 0.25, 0.95, 10],
    [2.1, D.daisTopY + 1.8, 0.4, 1.1, 12],
    [-4.8, sphereCenterY + 0.6, 0.0, 0.85, 10],
    [0.0, sphereCenterY + 5.7, 0.0, 0.78, 10],
  ] as const) {
    const gear = new THREE.Group();
    gear.position.set(D.x + gx, gy, D.z + gz);
    const rim = new THREE.Mesh(gearRimGeo, brassMat);
    rim.scale.setScalar(gr);
    const hub = new THREE.Mesh(gearHubGeo, darkBrassMat);
    gear.add(rim, hub);
    for (let s = 0; s < 4; s++) {
      const spoke = boxMesh(box, darkBrassMat, 0, 0, 0, gr * 1.9, 0.12, 0.12);
      spoke.rotation.z = (s / 4) * Math.PI;
      gear.add(spoke);
    }
    for (let t = 0; t < teeth; t++) {
      const a = (t / teeth) * Math.PI * 2;
      const tooth = boxMesh(box, brassMat, Math.cos(a) * (gr + 0.14), Math.sin(a) * (gr + 0.14), 0, 0.24, 0.18, 0.18);
      tooth.rotation.z = a;
      gear.add(tooth);
    }
    group.add(gear);
    gears.push(gear);
  }

  // Outer colossal golden meridian crescent arc framing the sphere.
  const outerArc = new THREE.Mesh(crescentArcGeo, brassMat);
  outerArc.position.set(D.x, sphereCenterY, D.z);
  outerArc.rotation.z = Math.PI * 0.32;
  group.add(outerArc);

  // Dark starry Celestial Globe suspended in the center of the Armillary Sphere.
  const globe = new THREE.Group();
  globe.position.set(D.x, sphereCenterY, D.z);
  globe.rotation.z = -0.38;
  const coreSphere = new THREE.Mesh(globeGeo, celestialGlobeMat);
  const eqBand = new THREE.Mesh(armillaryBandGeo, brassMat);
  eqBand.scale.setScalar(2.42);
  eqBand.rotation.x = Math.PI / 2;
  const eclipticBand = new THREE.Mesh(armillaryBandGeo, brassMat);
  eclipticBand.scale.setScalar(2.44);
  eclipticBand.rotation.set(Math.PI / 2 + 0.41, 0, 0);
  globe.add(coreSphere, eqBand, eclipticBand);

  for (let s = 0; s < 22; s++) {
    const phi = Math.acos(1 - (2 * (s + 0.5)) / 22);
    const theta = s * 2.39996;
    const r = 2.37;
    const star = new THREE.Mesh(gemGeo, brassMat);
    star.scale.setScalar(0.32);
    star.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    globe.add(star);
  }
  group.add(globe);

  // Three nested puzzle rings: each has a floor ring on the dais with the 6 countable gems AND a 3D armillary ring around the globe!
  const tilts = [0.28, -0.42, 0.75];
  const rings = D.ringRadii.map((r, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(D.x, D.daisTopY + 0.22 + i * 0.25, D.z);
    const floorRing = new THREE.Mesh(ringGeo, brassMat);
    floorRing.scale.set(r, 1, r);
    pivot.add(floorRing);

    const gems: THREE.Mesh[] = [];
    for (let g = 0; g < OBSERVATORY_RING_STEPS; g++) {
      const a = g * STEP_ANGLE;
      const gem = new THREE.Mesh(gemGeo, gemDim);
      gem.position.set(Math.cos(a) * r, 0.14, Math.sin(a) * r);
      pivot.add(gem);
      gems.push(gem);
    }
    group.add(pivot);

    const sphereRing = new THREE.Group();
    sphereRing.position.set(D.x, sphereCenterY, D.z);
    sphereRing.rotation.x = tilts[i];
    sphereRing.rotation.z = (i - 1) * 0.35;
    const band = new THREE.Mesh(armillaryBandGeo, brassMat);
    band.scale.setScalar(2.85 + i * 0.78);
    band.rotation.x = Math.PI / 2;
    sphereRing.add(band);
    group.add(sphereRing);

    return { pivot, sphereRing, gems };
  });

  // Ornate brass lever pedestals in front of the Armillary Sphere.
  for (const lever of OBSERVATORY_LEVERS) {
    group.add(boxMesh(box, mats.darkStone, lever.x, DECK_Y + 0.6, lever.z, 0.55, 1.2, 0.55));
    group.add(boxMesh(box, brassMat, lever.x, DECK_Y + 1.38, lever.z, 0.18, 0.55, 0.18, 0.3));
    group.add(boxMesh(box, brassMat, lever.x, DECK_Y + 1.25, lever.z, 0.65, 0.14, 0.65));
    for (let g = 0; g <= lever.ringIndex; g++) {
      group.add(boxMesh(box, mats.runeDim, lever.x - 0.15 + g * 0.15, DECK_Y + 0.8, lever.z + 0.28, 0.08, 0.3, 0.02));
    }
  }

  return { rings, gears, globe };
}
// #endregion

// #region Giant Brass Telescope & Crescent-Helmed Astral Watcher Statue
function buildGiantTelescope(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  brassMat: THREE.MeshStandardMaterial,
  darkBrassMat: THREE.MeshStandardMaterial,
  box: THREE.BoxGeometry,
  group: THREE.Group
): THREE.Group {
  const t = OBSERVATORY_GIANT_TELESCOPE;
  const plat = OBSERVATORY_TELESCOPE_PLATFORM;
  const stair = OBSERVATORY_TELESCOPE_STAIR;
  const platH = plat.y - DECK_Y;
  const spanX = plat.maxX - plat.minX;
  const spanZ = plat.maxZ - plat.minZ;

  // Walkable stepped observation platform base (`OBSERVATORY_TELESCOPE_PLATFORM`, `y = DECK_Y + 2.4`)
  // + real walkable carved staircase (`OBSERVATORY_TELESCOPE_STAIR`) with individual stone & brass steps!
  group.add(
    deckSlab(box, mats.marble, plat, 0.45),
    boxMesh(box, mats.darkStone, t.x, DECK_Y + (platH - 0.45) / 2, t.z, spanX - 0.3, platH - 0.45, spanZ - 0.3),
    boxMesh(box, brassMat, t.x, plat.y + 0.02, t.z, spanX + 0.12, 0.08, spanZ + 0.12),
    rampSlab(box, mats.stone, stair, 0.5)
  );

  const stepCount = 10;
  for (let s = 0; s < stepCount; s++) {
    const u = (s + 0.5) / stepCount;
    const sy = stair.ay + (stair.by - stair.ay) * u;
    const sz = stair.az + (stair.bz - stair.az) * u;
    const treadDepth = Math.abs(stair.bz - stair.az) / stepCount;
    group.add(
      boxMesh(box, mats.marble, stair.ax, sy - 0.08, sz, stair.halfWidth * 1.96, 0.18, treadDepth * 0.96),
      boxMesh(box, brassMat, stair.ax, sy + 0.015, sz - treadDepth * 0.35, stair.halfWidth * 1.98, 0.04, treadDepth * 0.28)
    );
  }

  const tubeGeo = new THREE.CylinderGeometry(0.24, 0.42, 4.6, 20);
  tubeGeo.rotateX(Math.PI / 2);
  const bandGeo = new THREE.TorusGeometry(0.36, 0.06, 8, 22);
  const lensGeo = new THREE.CircleGeometry(0.4, 20);
  const legGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.58, 8);
  const torsoGeo = new THREE.CylinderGeometry(0.42, 0.34, 1.35, 10);
  const headGeo = new THREE.SphereGeometry(0.28, 12, 10);
  const crescentGeo = new THREE.TorusGeometry(0.48, 0.09, 8, 20, Math.PI * 1.35);
  const crystalGeo = new THREE.OctahedronGeometry(0.55, 0);
  crystalGeo.scale(1, 2.1, 1);
  ctx.disposableGeometries.push(tubeGeo, bandGeo, lensGeo, legGeo, torsoGeo, headGeo, crescentGeo, crystalGeo);

  const telescopeStandGroup = new THREE.Group();
  group.add(telescopeStandGroup);

  // Articulated brass tripod legs & gear mount centered on the walkable platform at `(t.x, plat.y, t.z)`.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.3;
    const leg = new THREE.Mesh(legGeo, darkBrassMat);
    leg.position.set(t.x + Math.cos(a) * 0.52, plat.y + 0.76, t.z + Math.sin(a) * 0.52);
    leg.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
    telescopeStandGroup.add(leg);
  }

  const mount = new THREE.Group();
  mount.position.set(t.x, plat.y + 1.55, t.z);
  const giantScope = SKY_TELESCOPES.find((sc) => sc.id === 'telescope-observatory-giant');
  if (giantScope) {
    const view = telescopeViewFor(giantScope);
    mount.lookAt(view.lookX, view.lookY, view.lookZ);
  } else {
    mount.rotation.set(-0.22, -0.55, 0);
  }
  const tube = new THREE.Mesh(tubeGeo, brassMat);
  tube.position.z = 0.8;
  const lens = new THREE.Mesh(lensGeo, mats.crystal);
  lens.position.z = 3.12;
  mount.add(tube, lens);
  for (const zOff of [-0.9, 0.8, 2.5]) {
    const band = new THREE.Mesh(bandGeo, darkBrassMat);
    band.position.z = zOff;
    mount.add(band);
  }
  telescopeStandGroup.add(mount);

  // Golden Crescent-Helmed Astral Watcher Statue standing as an honor guard beside the foot of the telescope staircase on the deck.
  const watcher = new THREE.Group();
  watcher.position.set(stair.ax - 2.35, DECK_Y + 0.04, stair.az + 0.8);
  watcher.rotation.y = 0.25;
  const legs = boxMesh(box, darkBrassMat, 0, 0.65, 0, 0.55, 1.3, 0.38);
  const torso = new THREE.Mesh(torsoGeo, brassMat);
  torso.position.y = 1.85;
  const pauldrons = boxMesh(box, brassMat, 0, 2.38, 0, 1.08, 0.28, 0.48);
  const head = new THREE.Mesh(headGeo, brassMat);
  head.position.y = 2.78;
  const crescent = new THREE.Mesh(crescentGeo, brassMat);
  crescent.position.set(0, 3.05, 0);
  crescent.rotation.z = Math.PI * 0.25;
  watcher.add(legs, torso, pauldrons, head, crescent);
  group.add(watcher);

  // Decorative glowing violet/magenta crystals at the base of the telescope platform.
  const violetMat = new THREE.MeshStandardMaterial({ color: 0xd8b4fe, emissive: 0x9333ea, emissiveIntensity: 1.4, roughness: 0.2 });
  ctx.disposableMaterials.push(violetMat);
  for (const [ox, oz, sc, tilt] of [[-2.7, 2.4, 1.1, 0.25], [2.6, -1.8, 0.85, -0.3], [2.7, 2.1, 0.75, 0.2]] as const) {
    const shard = new THREE.Mesh(crystalGeo, violetMat);
    shard.scale.setScalar(sc);
    shard.position.set(t.x + ox, DECK_Y + 0.6 * sc, t.z + oz);
    shard.rotation.z = tilt;
    group.add(shard);
  }
  return telescopeStandGroup;
}
// #endregion
