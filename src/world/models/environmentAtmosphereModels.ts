// ============================================================================
// MODULE: World / Models / Environment Atmosphere Models
// DESIGN: Volumetric mist, celestial starfield, dynamic cloud layers, and ambient fauna (SRP)
// SUMMARY: Constructs mist banks, stars dome, cloud clusters, drifting pollen,
//          deer herds, canopy squirrels, and meadow butterflies with frame updates.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import type { IWeatherStateSnapshot } from '../domain/worldTypes';
import {
  WATER_LEVEL,
  HUNTER_LODGE_POS,
  groundHeightAt,
  getRoofHeightAt,
  isWithinViewDistance,
  fbm2D,
  hash2D,
} from '../terrainMath';
import type { IWorldModelBuildContext } from './types';
import { attachDeerGlbModel } from './deerGlbLoader';
// #endregion

// ======================== TYPES & INTERFACES ======================== \\
// #region Types & Interfaces
/**
 * Summary: Handle to instantiated celestial sky dome, sun mesh, and clouds.
 * Design: Exposes update callback synchronizing sky rotation and cloud drift per frame.
 */
export interface IEnvironmentAtmosphereHandle {
  readonly pollenPoints: THREE.Points;
  readonly starsMaterial: THREE.PointsMaterial;
  readonly cloudMesh: THREE.Mesh;
  readonly mistMaterials: THREE.MeshBasicMaterial[];
  readonly birdsGroup: THREE.Group;
  updateEnvironment: (
    elapsedTime: number,
    playerX: number,
    playerZ: number,
    morningMistOpacity: number,
    nightFactor?: number,
    weather?: IWeatherStateSnapshot,
    playerY?: number
  ) => void;
}
export type EnvironmentAtmosphereHandle = IEnvironmentAtmosphereHandle;

type SquirrelActionState =
  | 'perched'
  | 'canopy_jump'
  | 'climb_down'
  | 'ground_wander'
  | 'climb_up'
  | 'climb_to_sleep'
  | 'sleeping_in_crown';

interface IForestSquirrel {
  root: THREE.Group;
  tailMesh: THREE.Mesh;
  currentTreeIdx: number;
  targetTreeIdx: number;
  state: SquirrelActionState;
  stateStartTime: number;
  stateDuration: number;
  wanderStartX: number;
  wanderStartZ: number;
  wanderTargetX: number;
  wanderTargetZ: number;
  wanderLegsRemaining: number;
  decisionCounter: number;
}

interface IAnimatedDeer {
  root: THREE.Group;
  posePivot: THREE.Group;
  bodyMesh: THREE.Mesh;
  neckPivot: THREE.Group;
  legs: [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh];
  deerGlbCtrl: ReturnType<typeof attachDeerGlbModel>;
  homeX: number;
  homeZ: number;
  orbitRadius: number;
  speed: number;
  phase: number;
  walkAngle: number;
}
// #endregion

// ======================== MODEL BUILDER ======================== \\
// #region Model Builder
/**
 * Summary: Constructs environmental atmosphere layers, celestial bodies, and ambient wildlife.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param ctx Input parameter ctx.
 * @returns Computed result for buildEnvironmentAtmosphereModels.
 */
export function buildEnvironmentAtmosphereModels(
  ctx: IWorldModelBuildContext
): IEnvironmentAtmosphereHandle {
  const { scene, isSoftwareGl, disposableGeometries, disposableMaterials, mistMaterials } = ctx;

  // 1. Squirrel Materials, Sculpted 3D Geometries & Real Obstacle Tree Binding
  const squirrelMat = new THREE.MeshStandardMaterial({
    color: 0xb85228,
    roughness: 0.75,
  });
  const squirrelTailMat = new THREE.MeshStandardMaterial({
    color: 0x993d18,
    roughness: 0.85,
  });
  const squirrelDarkMat = new THREE.MeshStandardMaterial({
    color: 0x241811,
    roughness: 0.45,
  });
  disposableMaterials.push(squirrelMat, squirrelTailMat, squirrelDarkMat);

  const sqBodyGeo = new THREE.SphereGeometry(0.13, 10, 8);
  sqBodyGeo.scale(0.82, 0.78, 1.45);
  const sqHeadGeo = new THREE.SphereGeometry(0.09, 10, 8);
  sqHeadGeo.scale(0.88, 0.86, 1.15);
  sqHeadGeo.translate(0, 0.06, 0.19);
  const sqEarGeo = new THREE.ConeGeometry(0.028, 0.065, 5);
  const sqPawGeo = new THREE.CapsuleGeometry(0.022, 0.07, 4, 6);
  const sqTailGeo = new THREE.CapsuleGeometry(0.068, 0.28, 5, 8);
  sqTailGeo.rotateX(-0.72);
  sqTailGeo.translate(0, 0.15, -0.22);
  disposableGeometries.push(sqBodyGeo, sqHeadGeo, sqEarGeo, sqPawGeo, sqTailGeo);

  interface ISquirrelTreeNode {
    x: number;
    z: number;
    baseY: number;
    perchHeight: number;
    baseTrunkRadius: number;
    topTrunkRadius: number;
    neighborIndices: number[];
  }

  // Extract real rendered woodland trees from ctx.obstacles so squirrels NEVER climb invisible trunks!
  const candidateTreeObstacles = ctx.obstacles.filter(
    (o) =>
      (o.kind === 'pine' || o.kind === 'oak' || o.kind === 'birch') &&
      Math.hypot(o.x, o.z) > 16.0 &&
      Math.hypot(o.x, o.z) < 115.0 &&
      groundHeightAt(o.x, o.z) > WATER_LEVEL + 0.45
  );

  const squirrelTrees: ISquirrelTreeNode[] = [];
  if (candidateTreeObstacles.length >= 2) {
    // Find connected pairs/clusters of trees within 3.5m..22.0m of each other
    const nodes: ISquirrelTreeNode[] = candidateTreeObstacles.map((o) => {
      const sc = o.scale ?? 1.0;
      const isOak = o.kind === 'oak';
      const isPine = o.kind === 'pine';
      return {
        x: o.x,
        z: o.z,
        baseY: groundHeightAt(o.x, o.z) - 0.12,
        perchHeight: (isOak ? 3.2 : 4.2) * sc,
        baseTrunkRadius: (isOak ? 0.42 : isPine ? 0.34 : 0.25) * sc + 0.04,
        topTrunkRadius: (isOak ? 0.25 : isPine ? 0.20 : 0.16) * sc + 0.04,
        neighborIndices: [],
      };
    });

    for (let i = 0; i < nodes.length; i++) {
      const dists: { idx: number; d: number }[] = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z);
        if (d >= 3.2 && d <= 24.0) {
          dists.push({ idx: j, d });
        }
      }
      dists.sort((a, b) => a.d - b.d);
      nodes[i].neighborIndices = dists.slice(0, 4).map((item) => item.idx);
    }

    const connectedNodes = nodes.filter((n) => n.neighborIndices.length > 0);
    const chosenPool = connectedNodes.length >= 8 ? connectedNodes : nodes;
    const step = Math.max(1, Math.floor(chosenPool.length / 10));
    for (let k = 0; k < chosenPool.length && squirrelTrees.length < 10; k += step) {
      squirrelTrees.push(chosenPool[k]);
    }
    // Re-index neighborIndices within the selected squirrelTrees list (and add nearest from full list if needed)
    for (let i = 0; i < squirrelTrees.length; i++) {
      const nearInSub: { idx: number; d: number }[] = [];
      for (let j = 0; j < squirrelTrees.length; j++) {
        if (i === j) continue;
        nearInSub.push({
          idx: j,
          d: Math.hypot(
            squirrelTrees[i].x - squirrelTrees[j].x,
            squirrelTrees[i].z - squirrelTrees[j].z
          ),
        });
      }
      nearInSub.sort((a, b) => a.d - b.d);
      squirrelTrees[i].neighborIndices = nearInSub.slice(0, 3).map((item) => item.idx);
    }
  }

  // Fallback only if obstacles list is empty
  if (squirrelTrees.length === 0) {
    const fallbackCoords = [
      { x: -38, z: 18 },
      { x: -45, z: 24 },
      { x: 38, z: 14 },
      { x: 44, z: 22 },
    ];
    for (let i = 0; i < fallbackCoords.length; i++) {
      const fc = fallbackCoords[i];
      squirrelTrees.push({
        x: fc.x,
        z: fc.z,
        baseY: groundHeightAt(fc.x, fc.z) - 0.12,
        perchHeight: 4.0,
        baseTrunkRadius: 0.36,
        topTrunkRadius: 0.22,
        neighborIndices: [(i + 1) % fallbackCoords.length],
      });
    }
  }

  const forestSquirrels: IForestSquirrel[] = [];
  for (let i = 0; i < Math.min(8, squirrelTrees.length); i++) {
    const root = new THREE.Group();
    const body = new THREE.Mesh(sqBodyGeo, squirrelMat);
    const head = new THREE.Mesh(sqHeadGeo, squirrelMat);
    const tail = new THREE.Mesh(sqTailGeo, squirrelTailMat);
    root.add(body, head, tail);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(sqEarGeo, squirrelMat);
      ear.position.set(side * 0.048, 0.14, 0.18);
      root.add(ear);
      const frontPaw = new THREE.Mesh(sqPawGeo, squirrelMat);
      frontPaw.position.set(side * 0.075, -0.05, 0.11);
      frontPaw.rotation.x = 0.35;
      const backPaw = new THREE.Mesh(sqPawGeo, squirrelMat);
      backPaw.position.set(side * 0.085, -0.05, -0.10);
      backPaw.rotation.x = -0.25;
      root.add(frontPaw, backPaw);
    }
    scene.add(root);

    const t = squirrelTrees[i];
    const nextIdx = t.neighborIndices[0] ?? (i + 1) % squirrelTrees.length;
    const perchAng = i * 1.1;
    root.position.set(
      t.x + Math.cos(perchAng) * t.topTrunkRadius,
      t.baseY + t.perchHeight,
      t.z + Math.sin(perchAng) * t.topTrunkRadius
    );

    forestSquirrels.push({
      root,
      tailMesh: tail,
      currentTreeIdx: i,
      targetTreeIdx: nextIdx,
      state: i % 2 === 0 ? 'perched' : 'climb_down',
      stateStartTime: 0,
      stateDuration: 2.2 + hash2D(i, 83) * 2.8,
      wanderStartX: t.x,
      wanderStartZ: t.z,
      wanderTargetX: squirrelTrees[nextIdx].x,
      wanderTargetZ: squirrelTrees[nextIdx].z,
      wanderLegsRemaining: 2,
      decisionCounter: i * 7,
    });
  }

  // 2. Articulated Forest Deer Herd
  const deerCoatMat = new THREE.MeshStandardMaterial({
    color: 0x8c5832,
    roughness: 0.78,
  });
  const antlerMat = new THREE.MeshStandardMaterial({
    color: 0xe6dac3,
    roughness: 0.65,
  });
  disposableMaterials.push(deerCoatMat, antlerMat);

  const deerBodyGeo = new THREE.BoxGeometry(0.52, 0.48, 1.25);
  const deerNeckGeo = new THREE.CylinderGeometry(0.13, 0.18, 0.62, 7);
  deerNeckGeo.translate(0, 0.25, 0);
  const deerHeadGeo = new THREE.BoxGeometry(0.24, 0.24, 0.44);
  deerHeadGeo.translate(0, 0.55, 0.14);
  const deerEarGeo = new THREE.ConeGeometry(0.06, 0.22, 5);
  const deerTailGeo = new THREE.ConeGeometry(0.07, 0.24, 5);
  const deerLegGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.78, 6);
  deerLegGeo.translate(0, -0.38, 0);
  const deerAntlerGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.42, 5);
  deerAntlerGeo.translate(0, 0.82, 0.05);
  disposableGeometries.push(
    deerBodyGeo,
    deerNeckGeo,
    deerHeadGeo,
    deerEarGeo,
    deerTailGeo,
    deerLegGeo,
    deerAntlerGeo
  );

  const deerHerd: IAnimatedDeer[] = [];
  // All world deer are spawned via boidsAndWildlifeSystem.ts so every deer has full AI and is huntable/killable
  const deerHomeSpots: Array<{ x: number; z: number; r: number; speed: number }> = [];

  for (let i = 0; i < deerHomeSpots.length; i++) {
    const spot = deerHomeSpots[i];
    const root = new THREE.Group();
    const posePivot = new THREE.Group();
    root.add(posePivot);

    const body = new THREE.Mesh(deerBodyGeo, deerCoatMat);
    body.position.set(0, 1.02, 0);
    body.castShadow = !isSoftwareGl;
    posePivot.add(body);

    const deerTail = new THREE.Mesh(deerTailGeo, antlerMat);
    deerTail.position.set(0, 1.12, -0.66);
    deerTail.rotation.x = -0.65;
    posePivot.add(deerTail);

    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 1.12, 0.52);
    const neck = new THREE.Mesh(deerNeckGeo, deerCoatMat);
    const head = new THREE.Mesh(deerHeadGeo, deerCoatMat);
    neckPivot.add(neck, head);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(deerEarGeo, deerCoatMat);
      ear.position.set(side * 0.14, 0.66, 0.04);
      ear.rotation.z = -side * 0.55;
      neckPivot.add(ear);
    }

    if (i % 2 === 0) {
      const antlerL = new THREE.Mesh(deerAntlerGeo, antlerMat);
      antlerL.position.set(-0.1, 0, 0);
      antlerL.rotation.z = -0.25;
      const antlerR = new THREE.Mesh(deerAntlerGeo, antlerMat);
      antlerR.position.set(0.1, 0, 0);
      antlerR.rotation.z = 0.25;
      neckPivot.add(antlerL, antlerR);
    }
    posePivot.add(neckPivot);

    const flLeg = new THREE.Mesh(deerLegGeo, deerCoatMat);
    flLeg.position.set(-0.2, 0.82, 0.42);
    const frLeg = new THREE.Mesh(deerLegGeo, deerCoatMat);
    frLeg.position.set(0.2, 0.82, 0.42);
    const blLeg = new THREE.Mesh(deerLegGeo, deerCoatMat);
    blLeg.position.set(-0.2, 0.82, -0.42);
    const brLeg = new THREE.Mesh(deerLegGeo, deerCoatMat);
    brLeg.position.set(0.2, 0.82, -0.42);
    posePivot.add(flLeg, frLeg, blLeg, brLeg);

    const deerGlbCtrl = attachDeerGlbModel(posePivot, {
      castShadow: !isSoftwareGl,
      receiveShadow: !isSoftwareGl,
      disposableMaterials,
    });

    scene.add(root);
    deerHerd.push({
      root,
      posePivot,
      bodyMesh: body,
      neckPivot,
      legs: [flLeg, frLeg, blLeg, brLeg],
      deerGlbCtrl,
      homeX: spot.x,
      homeZ: spot.z,
      orbitRadius: spot.r,
      speed: spot.speed,
      phase: i * 1.1,
      walkAngle: i * 0.9,
    });
  }

  // 3. Fluttering Meadow Butterflies (with articulated flapping wings & varied colors)
  const butterfliesGroup = new THREE.Group();
  const bflyColors = [0x67e8f9, 0xfbbf24, 0xf472b6];
  const bflyMats = bflyColors.map(
    (c) =>
      new THREE.MeshBasicMaterial({
        color: c,
        side: THREE.DoubleSide,
      })
  );
  disposableMaterials.push(...bflyMats);

  const bflyWingGeo = new THREE.PlaneGeometry(0.13, 0.095);
  disposableGeometries.push(bflyWingGeo);

  for (let i = 0; i < 18; i++) {
    const bfly = new THREE.Group();
    const mat = bflyMats[i % bflyMats.length];
    const lWingPivot = new THREE.Group();
    const lWing = new THREE.Mesh(bflyWingGeo, mat);
    lWing.position.set(-0.065, 0, 0);
    lWingPivot.add(lWing);

    const rWingPivot = new THREE.Group();
    const rWing = new THREE.Mesh(bflyWingGeo, mat);
    rWing.position.set(0.065, 0, 0);
    rWingPivot.add(rWing);

    bfly.add(lWingPivot, rWingPivot);
    bfly.userData = {
      offsetX: (hash2D(i, 41) - 0.5) * 36,
      offsetZ: (hash2D(i, 47) - 0.5) * 36 + 18,
      phase: i * 0.85,
      speed: 0.65 + hash2D(i, 53) * 0.5,
      lWingPivot,
      rWingPivot,
    };
    butterfliesGroup.add(bfly);
  }
  scene.add(butterfliesGroup);

  // 4. Real Morning Mist Banks
  const mSize = 256;
  const mCanvas = document.createElement('canvas');
  mCanvas.width = mSize;
  mCanvas.height = mSize;
  const mCtx = mCanvas.getContext('2d')!;
  const mImg = mCtx.createImageData(mSize, mSize);
  for (let y = 0; y < mSize; y++) {
    for (let x = 0; x < mSize; x++) {
      const n = fbm2D(x * 0.03 + 7.1, y * 0.03 - 4.3, 4) * 0.5 + 0.5;
      const distCenter = Math.hypot(x - mSize / 2, y - mSize / 2) / (mSize / 2);
      const radialFade = Math.max(0, 1 - distCenter * distCenter);
      const alpha = Math.max(0, Math.min(1, (n - 0.35) * 1.8)) * radialFade;
      const idx = (y * mSize + x) * 4;
      mImg.data[idx] = 236;
      mImg.data[idx + 1] = 244;
      mImg.data[idx + 2] = 248;
      mImg.data[idx + 3] = Math.floor(alpha * 115);
    }
  }
  mCtx.putImageData(mImg, 0, 0);
  const mistTex = new THREE.CanvasTexture(mCanvas);
  mistTex.colorSpace = THREE.SRGBColorSpace;

  const mistGeo = new THREE.PlaneGeometry(380, 380, 1, 1);
  mistGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(mistGeo);

  const mistMat1 = new THREE.MeshBasicMaterial({
    map: mistTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mistMat2 = new THREE.MeshBasicMaterial({
    map: mistTex,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(mistMat1, mistMat2);
  mistMaterials.push(mistMat1, mistMat2);

  const mistLayer1 = new THREE.Mesh(mistGeo, mistMat1);
  mistLayer1.position.set(0, WATER_LEVEL + 1.15, 0);
  const mistLayer2 = new THREE.Mesh(mistGeo, mistMat2);
  mistLayer2.position.set(0, WATER_LEVEL + 2.35, 0);
  scene.add(mistLayer1, mistLayer2);

  // 5. Night Starfield Dome
  const starCount = 900;
  const starsGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = hash2D(i, 401);
    const v = hash2D(i, 409);
    const theta = u * Math.PI * 2;
    const phi = Math.acos(0.12 + v * 0.88);
    const rad = 215;
    starPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = rad * Math.cos(phi);
    starPositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  disposableGeometries.push(starsGeo);

  const starsMaterial = new THREE.PointsMaterial({
    color: 0xe8f1ff,
    size: 1.25,
    transparent: true,
    opacity: 0.0,
    fog: false,
    depthWrite: false,
  });
  disposableMaterials.push(starsMaterial);

  const starsPoints = new THREE.Points(starsGeo, starsMaterial);
  scene.add(starsPoints);

  // 6. Soaring Ambient Birds Flock (Full Sculpted 3D Anatomy with Articulated Shoulder Wings)
  const birdsGroup = new THREE.Group();
  const birdBodyMat = new THREE.MeshStandardMaterial({
    color: 0x2b2623,
    roughness: 0.62,
  });
  const birdBreastMat = new THREE.MeshStandardMaterial({
    color: 0x4d433c,
    roughness: 0.72,
  });
  const birdBeakMat = new THREE.MeshStandardMaterial({
    color: 0xd99b26,
    roughness: 0.42,
  });
  disposableMaterials.push(birdBodyMat, birdBreastMat, birdBeakMat);

  const birdTorsoGeo = new THREE.ConeGeometry(0.14, 0.68, 6);
  birdTorsoGeo.rotateX(Math.PI / 2);
  const birdBreastGeo = new THREE.SphereGeometry(0.125, 6, 5);
  birdBreastGeo.scale(0.95, 0.85, 1.35);
  birdBreastGeo.translate(0, -0.02, 0.12);
  const birdHeadGeo = new THREE.SphereGeometry(0.095, 6, 5);
  birdHeadGeo.translate(0, 0.05, 0.36);
  const birdBeakGeo = new THREE.ConeGeometry(0.035, 0.16, 5);
  birdBeakGeo.rotateX(Math.PI / 2);
  birdBeakGeo.translate(0, 0.04, 0.48);
  const birdTailGeo = new THREE.ConeGeometry(0.16, 0.34, 5);
  birdTailGeo.rotateX(-Math.PI / 2);
  birdTailGeo.scale(1.25, 0.22, 1.0);
  birdTailGeo.translate(0, 0.01, -0.42);
  const wingInnerGeo = new THREE.BoxGeometry(0.52, 0.032, 0.24);
  const wingOuterGeo = new THREE.BoxGeometry(0.48, 0.024, 0.18);
  disposableGeometries.push(
    birdTorsoGeo,
    birdBreastGeo,
    birdHeadGeo,
    birdBeakGeo,
    birdTailGeo,
    wingInnerGeo,
    wingOuterGeo
  );

  for (let b = 0; b < 16; b++) {
    const bird = new THREE.Group();
    const torso = new THREE.Mesh(birdTorsoGeo, birdBodyMat);
    const breast = new THREE.Mesh(birdBreastGeo, birdBreastMat);
    const head = new THREE.Mesh(birdHeadGeo, birdBodyMat);
    const beak = new THREE.Mesh(birdBeakGeo, birdBeakMat);
    const tail = new THREE.Mesh(birdTailGeo, birdBodyMat);

    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.09, 0.02, 0.04);
    const lwInner = new THREE.Mesh(wingInnerGeo, birdBodyMat);
    lwInner.position.set(-0.24, 0, 0);
    const lwOuter = new THREE.Mesh(wingOuterGeo, birdBreastMat);
    lwOuter.position.set(-0.68, 0.01, -0.03);
    lwOuter.rotation.y = 0.14;
    lwOuter.rotation.z = 0.08;
    leftWingPivot.add(lwInner, lwOuter);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.09, 0.02, 0.04);
    const rwInner = new THREE.Mesh(wingInnerGeo, birdBodyMat);
    rwInner.position.set(0.24, 0, 0);
    const rwOuter = new THREE.Mesh(wingOuterGeo, birdBreastMat);
    rwOuter.position.set(0.68, 0.01, -0.03);
    rwOuter.rotation.y = -0.14;
    rwOuter.rotation.z = -0.08;
    rightWingPivot.add(rwInner, rwOuter);

    bird.add(torso, breast, head, beak, tail, leftWingPivot, rightWingPivot);
    bird.userData = {
      orbitRadius: 28 + (b % 5) * 18,
      orbitSpeed: 0.14 + (b % 3) * 0.03,
      phase: (b / 16) * Math.PI * 2,
      altitude: 26 + (b % 5) * 3.0,
      leftWingPivot,
      rightWingPivot,
    };
    birdsGroup.add(bird);
  }
  scene.add(birdsGroup);

  // 7. Dynamic Clouds & Volumetric Clusters
  const cloudGeo = new THREE.PlaneGeometry(540, 540, 1, 1);
  cloudGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(cloudGeo);

  const cSize = 256;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = cSize;
  cCanvas.height = cSize;
  const cCtx = cCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(cSize, cSize);
  for (let y = 0; y < cSize; y++) {
    for (let x = 0; x < cSize; x++) {
      const n = fbm2D(x * 0.035 + 3.2, y * 0.035 - 1.7, 4) * 0.5 + 0.5;
      const distCenter = Math.hypot(x - cSize / 2, y - cSize / 2) / (cSize / 2);
      const edgeFade = Math.max(0, 1 - distCenter * distCenter);
      const alpha = Math.max(0, Math.min(1, (n - 0.42) * 2.4)) * edgeFade;
      const idx = (y * cSize + x) * 4;
      cImg.data[idx] = 255;
      cImg.data[idx + 1] = 255;
      cImg.data[idx + 2] = 255;
      cImg.data[idx + 3] = Math.floor(alpha * 160);
    }
  }
  cCtx.putImageData(cImg, 0, 0);
  const cloudTex = new THREE.CanvasTexture(cCanvas);
  cloudTex.colorSpace = THREE.SRGBColorSpace;

  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(cloudMat);

  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMesh.position.set(0, 85, 0);
  scene.add(cloudMesh);

  // 8. Sanctuary Blossom Motes (Stationary in the Sakura Sanctuary grove at 165, -155)
  const pollenCount = 120;
  const pollenGeo = new THREE.BufferGeometry();
  const pollenPos = new Float32Array(pollenCount * 3);
  for (let i = 0; i < pollenCount; i++) {
    const px = 165.0 + (hash2D(i, 1) - 0.5) * 42;
    const pz = -155.0 + (hash2D(i, 3) - 0.5) * 42;
    pollenPos[i * 3] = px;
    pollenPos[i * 3 + 1] = Math.max(WATER_LEVEL, groundHeightAt(px, pz)) + 0.9 + hash2D(i, 2) * 5.5;
    pollenPos[i * 3 + 2] = pz;
  }
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
  disposableGeometries.push(pollenGeo);

  const pollenMat = new THREE.PointsMaterial({
    color: 0xfde047,
    size: 0.22,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  disposableMaterials.push(pollenMat);

  const pollenPoints = new THREE.Points(pollenGeo, pollenMat);
  scene.add(pollenPoints);

  // 9. 3D Dynamic Weather Systems (Rain Streaks, Splash Ripples, Snowflakes, Sandstorm & Lightning)
  // 9A. 3D Falling Rain Streaks (LineSegments)
  const rainCount = 1100;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 6);
  const rainPositionAttr = new THREE.BufferAttribute(rainPositions, 3);
  rainPositionAttr.setUsage(THREE.DynamicDrawUsage);
  rainGeo.setAttribute('position', rainPositionAttr);
  disposableGeometries.push(rainGeo);

  const rainSeeds = new Float32Array(rainCount * 4);
  for (let i = 0; i < rainCount; i++) {
    rainSeeds[i * 4] = (hash2D(i, 601) - 0.5) * 74.0;
    rainSeeds[i * 4 + 1] = hash2D(i, 607) * 32.0;
    rainSeeds[i * 4 + 2] = (hash2D(i, 613) - 0.5) * 74.0;
    rainSeeds[i * 4 + 3] = 22.0 + hash2D(i, 619) * 9.0;
  }

  const rainMat = new THREE.LineBasicMaterial({
    color: 0xc8e2ff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  disposableMaterials.push(rainMat);

  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.frustumCulled = false;
  rainLines.visible = false;
  scene.add(rainLines);

  // 9B. 3D Rain Ground & Water Splash Ripples
  const splashCount = 40;
  const splashGeo = new THREE.RingGeometry(0.05, 0.19, 12);
  splashGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(splashGeo);

  const splashMat = new THREE.MeshBasicMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(splashMat);

  const rainSplashesGroup = new THREE.Group();
  rainSplashesGroup.visible = false;
  const splashMeshes: THREE.Mesh[] = [];
  const splashOffsets: { dx: number; dz: number; phase: number; speed: number }[] = [];
  for (let i = 0; i < splashCount; i++) {
    const sm = new THREE.Mesh(splashGeo, splashMat);
    rainSplashesGroup.add(sm);
    splashMeshes.push(sm);
    const angle = hash2D(i, 631) * Math.PI * 2;
    const dist = 1.5 + hash2D(i, 641) * 20.0;
    splashOffsets.push({
      dx: Math.cos(angle) * dist,
      dz: Math.sin(angle) * dist,
      phase: hash2D(i, 647),
      speed: 2.2 + hash2D(i, 653) * 1.4,
    });
  }
  scene.add(rainSplashesGroup);

  // 9C. 3D Drifting Snowflakes
  const snowCount = 700;
  const snowGeo = new THREE.BufferGeometry();
  const snowPositions = new Float32Array(snowCount * 3);
  const snowPositionAttr = new THREE.BufferAttribute(snowPositions, 3);
  snowPositionAttr.setUsage(THREE.DynamicDrawUsage);
  snowGeo.setAttribute('position', snowPositionAttr);
  disposableGeometries.push(snowGeo);

  const snowSeeds = new Float32Array(snowCount * 4);
  for (let i = 0; i < snowCount; i++) {
    snowSeeds[i * 4] = (hash2D(i, 701) - 0.5) * 68.0;
    snowSeeds[i * 4 + 1] = hash2D(i, 709) * 28.0;
    snowSeeds[i * 4 + 2] = (hash2D(i, 719) - 0.5) * 68.0;
    snowSeeds[i * 4 + 3] = 2.6 + hash2D(i, 727) * 1.8;
  }

  const snowMat = new THREE.PointsMaterial({
    color: 0xf8fafc,
    size: 0.24,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  disposableMaterials.push(snowMat);

  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.frustumCulled = false;
  snowPoints.visible = false;
  scene.add(snowPoints);

  // 9D. 3D Swirling Sandstorm Dust
  const sandCount = 600;
  const sandGeo = new THREE.BufferGeometry();
  const sandPositions = new Float32Array(sandCount * 3);
  const sandPositionAttr = new THREE.BufferAttribute(sandPositions, 3);
  sandPositionAttr.setUsage(THREE.DynamicDrawUsage);
  sandGeo.setAttribute('position', sandPositionAttr);
  disposableGeometries.push(sandGeo);

  const sandSeeds = new Float32Array(sandCount * 4);
  for (let i = 0; i < sandCount; i++) {
    sandSeeds[i * 4] = (hash2D(i, 809) - 0.5) * 76.0;
    sandSeeds[i * 4 + 1] = hash2D(i, 811) * 16.0;
    sandSeeds[i * 4 + 2] = (hash2D(i, 821) - 0.5) * 76.0;
    sandSeeds[i * 4 + 3] = 11.0 + hash2D(i, 823) * 7.0;
  }

  const sandMat = new THREE.PointsMaterial({
    color: 0xd9a05b,
    size: 0.32,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  disposableMaterials.push(sandMat);

  const sandPoints = new THREE.Points(sandGeo, sandMat);
  sandPoints.frustumCulled = false;
  sandPoints.visible = false;
  scene.add(sandPoints);

  // 9E. 3D Jagged Sky-to-Ground Lightning Bolt & Dynamic Storm Flash Light
  const boltSegments = 14;
  const boltGeo = new THREE.BufferGeometry();
  const boltPositions = new Float32Array(boltSegments * 6);
  const boltPositionAttr = new THREE.BufferAttribute(boltPositions, 3);
  boltPositionAttr.setUsage(THREE.DynamicDrawUsage);
  boltGeo.setAttribute('position', boltPositionAttr);
  disposableGeometries.push(boltGeo);

  const boltMat = new THREE.LineBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  disposableMaterials.push(boltMat);

  const lightningBoltLine = new THREE.LineSegments(boltGeo, boltMat);
  lightningBoltLine.frustumCulled = false;
  lightningBoltLine.visible = false;
  scene.add(lightningBoltLine);

  const lightningLight = new THREE.PointLight(0xe0f2fe, 0, 260, 1.2);
  lightningLight.visible = false;
  scene.add(lightningLight);

  // Simulation State Variables
  let lastTimeEnv = 0;
  let accumCloudDrift = 0;
  let smoothCloudCov = 0.45;
  let smoothCloudDark = 0.08;

  const updateEnvironment = (
    elapsedTime: number,
    playerX: number,
    playerZ: number,
    morningMistOpacity: number,
    nightFactor = 0.0,
    weather?: IWeatherStateSnapshot,
    playerY = 2.15
  ): void => {
    const dt = lastTimeEnv > 0 ? Math.min(elapsedTime - lastTimeEnv, 0.1) : 0.016;
    lastTimeEnv = elapsedTime;

    const targetCloudCov = weather ? weather.cloudCoverage : 0.35;
    const targetCloudDark = weather ? weather.cloudDarkness : 0.05;
    const blendRate = 1.0 - Math.exp(-0.8 * dt);
    smoothCloudCov += (targetCloudCov - smoothCloudCov) * blendRate;
    smoothCloudDark += (targetCloudDark - smoothCloudDark) * blendRate;

    const windStr = weather ? weather.windStrength : 0.22;
    accumCloudDrift += dt * (0.42 + windStr * 0.28);

    // Update Cloud Layer
    cloudMesh.position.x = playerX;
    cloudMesh.position.z = playerZ;
    cloudMesh.rotation.y = accumCloudDrift * 0.0025;
    cloudMat.opacity = Math.max(0.15, smoothCloudCov * (1.0 - nightFactor * 0.65));

    // Update Starfield
    starsPoints.position.set(playerX, 0, playerZ);
    starsPoints.rotation.y = elapsedTime * 0.0015;
    starsMaterial.opacity = nightFactor * (1.0 - smoothCloudDark * 0.7) * 0.92;
    starsPoints.visible = nightFactor > 0.02;

    // Update Mist & Weather Fog Layers
    const fogBoost = weather ? (weather.fogIntensity ?? 0) * 0.92 : 0;
    const effectiveMist = Math.max(morningMistOpacity, fogBoost);
    mistMat1.opacity = effectiveMist * 0.48;
    mistMat2.opacity = effectiveMist * 0.36;
    mistLayer1.position.x = playerX;
    mistLayer1.position.z = playerZ;
    mistLayer2.position.x = playerX;
    mistLayer2.position.z = playerZ;
    mistLayer1.rotation.y = elapsedTime * 0.008;
    mistLayer2.rotation.y = -elapsedTime * 0.006;

    // Update 3D Weather Systems (Rain, Splashes, Snow, Sandstorm, Lightning Bolt)
    const rainIntensity = weather ? (weather.rainIntensity ?? 0) : 0;
    const snowIntensity = weather ? (weather.snowIntensity ?? 0) : 0;
    const sandIntensity = weather ? (weather.sandWindIntensity ?? 0) : 0;
    const lightningFlash = weather ? (weather.lightningFlash ?? 0) : 0;

    // 9A & 9B: Falling Rain Streaks & Ground/Water Splash Ripples
    if (rainIntensity > 0.01) {
      rainLines.visible = true;
      rainMat.opacity = Math.min(0.82, 0.25 + rainIntensity * 0.58);
      const streakLen = 1.35 + rainIntensity * 0.85;
      const windSlantX = windStr * 0.28;
      const windSlantZ = windStr * 0.14;

      for (let i = 0; i < rainCount; i++) {
        const sIdx = i * 4;
        const seedX = rainSeeds[sIdx];
        const seedY = rainSeeds[sIdx + 1];
        const seedZ = rainSeeds[sIdx + 2];
        const fallSpeed = rainSeeds[sIdx + 3];

        const fallDist = elapsedTime * fallSpeed;
        const localY = 30.0 - ((seedY + fallDist) % 32.0);
        const wx = playerX + seedX + localY * windSlantX;
        const wz = playerZ + seedZ + localY * windSlantZ;
        const wy = playerY + localY;

        const roofY = getRoofHeightAt(wx, wz);
        const pIdx = i * 6;
        if (roofY !== null && wy < roofY) {
          rainPositions[pIdx] = wx;
          rainPositions[pIdx + 1] = -999;
          rainPositions[pIdx + 2] = wz;
          rainPositions[pIdx + 3] = wx;
          rainPositions[pIdx + 4] = -999;
          rainPositions[pIdx + 5] = wz;
        } else {
          rainPositions[pIdx] = wx;
          rainPositions[pIdx + 1] = wy;
          rainPositions[pIdx + 2] = wz;
          rainPositions[pIdx + 3] = wx + windSlantX * streakLen;
          rainPositions[pIdx + 4] = wy + streakLen;
          rainPositions[pIdx + 5] = wz + windSlantZ * streakLen;
        }
      }
      rainPositionAttr.needsUpdate = true;

      if (rainIntensity > 0.05) {
        rainSplashesGroup.visible = true;
        splashMat.opacity = Math.min(0.65, rainIntensity * 0.65);
        for (let i = 0; i < splashCount; i++) {
          const off = splashOffsets[i];
          const sm = splashMeshes[i];
          const sx = playerX + off.dx;
          const sz = playerZ + off.dz;
          const roofY = getRoofHeightAt(sx, sz);
          if (roofY !== null) {
            sm.visible = false;
            continue;
          }
          sm.visible = true;
          const sy = Math.max(WATER_LEVEL, groundHeightAt(sx, sz)) + 0.03;
          const rippleProg = (elapsedTime * off.speed + off.phase) % 1.0;
          sm.position.set(sx, sy, sz);
          sm.scale.setScalar(0.35 + rippleProg * 1.45);
        }
      } else {
        rainSplashesGroup.visible = false;
      }
    } else {
      rainLines.visible = false;
      rainSplashesGroup.visible = false;
    }

    // 9C: Drifting Snowflakes
    if (snowIntensity > 0.01) {
      snowPoints.visible = true;
      snowMat.opacity = Math.min(0.92, 0.3 + snowIntensity * 0.65);
      for (let i = 0; i < snowCount; i++) {
        const sIdx = i * 4;
        const seedX = snowSeeds[sIdx];
        const seedY = snowSeeds[sIdx + 1];
        const seedZ = snowSeeds[sIdx + 2];
        const fallSpeed = snowSeeds[sIdx + 3];

        const localY = 24.0 - ((seedY + elapsedTime * fallSpeed) % 28.0);
        const swirl = elapsedTime * 1.6 + i * 0.37;
        const wx = playerX + seedX + Math.sin(swirl) * (0.9 + windStr * 1.4);
        const wz = playerZ + seedZ + Math.cos(swirl * 0.85) * (0.9 + windStr * 1.4);
        const wy = playerY + localY;

        const roofY = getRoofHeightAt(wx, wz);
        const pIdx = i * 3;
        snowPositions[pIdx] = wx;
        snowPositions[pIdx + 1] = roofY !== null && wy < roofY ? -999 : wy;
        snowPositions[pIdx + 2] = wz;
      }
      snowPositionAttr.needsUpdate = true;
    } else {
      snowPoints.visible = false;
    }

    // 9D: Swirling Sandstorm Dust
    if (sandIntensity > 0.01) {
      sandPoints.visible = true;
      sandMat.opacity = Math.min(0.78, 0.22 + sandIntensity * 0.56);
      for (let i = 0; i < sandCount; i++) {
        const sIdx = i * 4;
        const seedX = sandSeeds[sIdx];
        const seedY = sandSeeds[sIdx + 1];
        const seedZ = sandSeeds[sIdx + 2];
        const gustSpeed = sandSeeds[sIdx + 3];

        const driftX = ((seedX + 38.0 + elapsedTime * gustSpeed) % 76.0) - 38.0;
        const driftZ =
          ((seedZ + 38.0 + Math.sin(elapsedTime * 1.8 + i) * 4.5) % 76.0) - 38.0;
        const wx = playerX + driftX;
        const wz = playerZ + driftZ;
        const baseGround = Math.max(WATER_LEVEL, groundHeightAt(wx, wz));
        const wy = baseGround + 0.25 + ((seedY + Math.sin(elapsedTime * 2.5 + i) * 1.2 + 16.0) % 14.0);

        const pIdx = i * 3;
        sandPositions[pIdx] = wx;
        sandPositions[pIdx + 1] = wy;
        sandPositions[pIdx + 2] = wz;
      }
      sandPositionAttr.needsUpdate = true;
    } else {
      sandPoints.visible = false;
    }

    // 9E: 3D Jagged Sky Lightning Bolt & Dynamic PointLight Flash
    if (weather && lightningFlash > 0.26) {
      lightningBoltLine.visible = true;
      boltMat.opacity = Math.min(1.0, (lightningFlash - 0.24) * 1.35);
      const bx = weather.boltOriginX;
      const bz = weather.boltOriginZ;
      const groundY = Math.max(WATER_LEVEL, groundHeightAt(bx, bz));
      const topY = groundY + 115.0;
      const jitterSeed = Math.floor(elapsedTime * 18.0);

      let prevX = bx;
      let prevY = topY;
      let prevZ = bz;
      for (let s = 0; s < boltSegments; s++) {
        const frac = (s + 1) / boltSegments;
        const nextY = topY - frac * (topY - groundY);
        const spread = s === boltSegments - 1 ? 0 : (1.0 - frac * 0.4) * 5.2;
        const nextX = bx + (hash2D(s * 13 + jitterSeed, 911) - 0.5) * spread * 2.0;
        const nextZ = bz + (hash2D(s * 17 + jitterSeed, 929) - 0.5) * spread * 2.0;

        const bIdx = s * 6;
        boltPositions[bIdx] = prevX;
        boltPositions[bIdx + 1] = prevY;
        boltPositions[bIdx + 2] = prevZ;
        boltPositions[bIdx + 3] = nextX;
        boltPositions[bIdx + 4] = nextY;
        boltPositions[bIdx + 5] = nextZ;

        prevX = nextX;
        prevY = nextY;
        prevZ = nextZ;
      }
      boltPositionAttr.needsUpdate = true;

      lightningLight.visible = true;
      lightningLight.position.set(bx, groundY + 38.0, bz);
      lightningLight.intensity = (lightningFlash - 0.24) * 18.0;
    } else {
      lightningBoltLine.visible = false;
      lightningLight.visible = false;
    }

    // Update Ambient Birds (with 3D Wing Flapping, Banking & Forward Heading)
    const birdChildren = birdsGroup.children;
    for (let b = 0; b < birdChildren.length; b++) {
      const bird = birdChildren[b];
      const ud = bird.userData;
      const angle = elapsedTime * ud.orbitSpeed + ud.phase;
      const flap = Math.sin(elapsedTime * 6.5 + b * 0.9) * 0.48;
      const liftBob = Math.cos(elapsedTime * 6.5 + b * 0.9) * 0.08;
      bird.position.set(
        Math.cos(angle) * ud.orbitRadius,
        ud.altitude + Math.sin(angle * 2.0) * 1.5 + liftBob,
        Math.sin(angle) * ud.orbitRadius
      );
      bird.rotation.order = 'YXZ';
      bird.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle));
      bird.rotation.x = Math.cos(angle * 2.0) * 0.08;
      bird.rotation.z = -0.18;
      if (ud.leftWingPivot && ud.rightWingPivot) {
        ud.leftWingPivot.rotation.z = flap;
        ud.rightWingPivot.rotation.z = -flap;
      }
    }

    // Update Forest Squirrels (hugging real obstacle tree trunks & hopping between neighbor trees)
    for (let i = 0; i < forestSquirrels.length; i++) {
      const sq = forestSquirrels[i];
      const currTree = squirrelTrees[sq.currentTreeIdx];
      const targTree = squirrelTrees[sq.targetTreeIdx];
      const stateElapsed = elapsedTime - sq.stateStartTime;
      const p = Math.max(0, Math.min(1, stateElapsed / Math.max(0.1, sq.stateDuration)));

      if (sq.state === 'perched') {
        const perchAng = i * 1.1 + Math.sin(elapsedTime * 0.8 + i) * 0.18;
        const sx = currTree.x + Math.cos(perchAng) * currTree.topTrunkRadius;
        const sz = currTree.z + Math.sin(perchAng) * currTree.topTrunkRadius;
        sq.root.position.set(sx, currTree.baseY + currTree.perchHeight, sz);
        sq.root.rotation.order = 'YXZ';
        sq.root.rotation.set(0, Math.atan2(Math.cos(perchAng), Math.sin(perchAng)), 0);
        sq.tailMesh.rotation.x = -0.72 + Math.sin(elapsedTime * 9.5 + i) * 0.22;

        if (p >= 1.0) {
          const distToTarg = Math.hypot(targTree.x - currTree.x, targTree.z - currTree.z);
          if (distToTarg <= 7.5 && sq.decisionCounter % 3 === 0) {
            sq.state = 'canopy_jump';
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = 0.78;
          } else {
            sq.state = 'climb_down';
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = 1.65;
          }
        }
      } else if (sq.state === 'canopy_jump') {
        const startY = currTree.baseY + currTree.perchHeight;
        const endY = targTree.baseY + targTree.perchHeight;
        const sx = currTree.x + (targTree.x - currTree.x) * p;
        const sz = currTree.z + (targTree.z - currTree.z) * p;
        const arcLift = Math.sin(p * Math.PI) * 1.45;
        const sy = startY + (endY - startY) * p + arcLift;
        sq.root.position.set(sx, sy, sz);
        const heading = Math.atan2(targTree.x - currTree.x, targTree.z - currTree.z);
        sq.root.rotation.order = 'YXZ';
        sq.root.rotation.set((p - 0.5) * 0.85, heading, 0);
        sq.tailMesh.rotation.x = -1.15 + Math.sin(elapsedTime * 18 + i) * 0.25;

        if (p >= 1.0) {
          sq.currentTreeIdx = sq.targetTreeIdx;
          sq.decisionCounter += 1;
          const neighbors = squirrelTrees[sq.currentTreeIdx].neighborIndices;
          sq.targetTreeIdx =
            neighbors.length > 0
              ? neighbors[sq.decisionCounter % neighbors.length]
              : (sq.currentTreeIdx + 1) % squirrelTrees.length;
          sq.state = 'perched';
          sq.stateStartTime = elapsedTime;
          sq.stateDuration = 2.6 + hash2D(sq.decisionCounter, i + 43) * 3.0;
        }
      } else if (sq.state === 'climb_down') {
        const toTargAng = Math.atan2(targTree.z - currTree.z, targTree.x - currTree.x);
        const spiralAng = toTargAng + (1 - p) * 1.4;
        const trunkRad =
          currTree.topTrunkRadius + p * (currTree.baseTrunkRadius - currTree.topTrunkRadius);
        const sx = currTree.x + Math.cos(spiralAng) * trunkRad;
        const sz = currTree.z + Math.sin(spiralAng) * trunkRad;
        const sy = currTree.baseY + currTree.perchHeight - p * (currTree.perchHeight - 0.25);
        sq.root.position.set(sx, sy, sz);
        // Face downward along the trunk while hugging bark
        const outYaw = Math.atan2(Math.cos(spiralAng), Math.sin(spiralAng));
        sq.root.rotation.order = 'YXZ';
        sq.root.rotation.set(Math.PI * 0.45, outYaw, Math.sin(p * Math.PI * 6) * 0.12);
        sq.tailMesh.rotation.x = -0.5 + Math.sin(elapsedTime * 15 + i) * 0.26;

        if (p >= 1.0) {
          sq.state = 'ground_wander';
          sq.stateStartTime = elapsedTime;
          sq.wanderLegsRemaining = 2;
          sq.wanderStartX = sx;
          sq.wanderStartZ = sz;
          // Midpoint foraging stop between current tree and target neighbor tree
          const midX = (currTree.x + targTree.x) * 0.5;
          const midZ = (currTree.z + targTree.z) * 0.5;
          const sideAngle = hash2D(sq.decisionCounter, i * 17) * Math.PI * 2;
          sq.wanderTargetX = midX + Math.cos(sideAngle) * 1.2;
          sq.wanderTargetZ = midZ + Math.sin(sideAngle) * 1.2;
          const legDist = Math.hypot(
            sq.wanderTargetX - sq.wanderStartX,
            sq.wanderTargetZ - sq.wanderStartZ
          );
          sq.stateDuration = Math.max(1.1, Math.min(2.8, legDist * 0.24));
        }
      } else if (sq.state === 'ground_wander') {
        const sx = sq.wanderStartX + (sq.wanderTargetX - sq.wanderStartX) * p;
        const sz = sq.wanderStartZ + (sq.wanderTargetZ - sq.wanderStartZ) * p;
        const hop = Math.abs(Math.sin(p * Math.PI * 5)) * 0.16;
        const sy = Math.max(WATER_LEVEL + 0.12, groundHeightAt(sx, sz)) + 0.11 + hop;
        sq.root.position.set(sx, sy, sz);
        const heading = Math.atan2(
          sq.wanderTargetX - sq.wanderStartX,
          sq.wanderTargetZ - sq.wanderStartZ
        );
        sq.root.rotation.order = 'YXZ';
        sq.root.rotation.set(-Math.sin(p * Math.PI * 5) * 0.18, heading, 0);
        sq.tailMesh.rotation.x = -0.92 + Math.sin(elapsedTime * 18 + i) * 0.22;

        if (p >= 1.0) {
          sq.wanderLegsRemaining -= 1;
          sq.decisionCounter += 1;
          if (sq.wanderLegsRemaining > 0) {
            sq.wanderStartX = sq.wanderTargetX;
            sq.wanderStartZ = sq.wanderTargetZ;
            const dxT = targTree.x - sq.wanderStartX;
            const dzT = targTree.z - sq.wanderStartZ;
            const dLen = Math.max(0.1, Math.hypot(dxT, dzT));
            // Arrive right at the bark surface of targTree!
            sq.wanderTargetX = targTree.x - (dxT / dLen) * targTree.baseTrunkRadius;
            sq.wanderTargetZ = targTree.z - (dzT / dLen) * targTree.baseTrunkRadius;
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = Math.max(1.1, Math.min(2.8, dLen * 0.24));
          } else {
            // Reached targTree trunk: advance currentTreeIdx and pick a new neighbor targetTreeIdx!
            sq.currentTreeIdx = sq.targetTreeIdx;
            const neighbors = squirrelTrees[sq.currentTreeIdx].neighborIndices;
            sq.targetTreeIdx =
              neighbors.length > 0
                ? neighbors[sq.decisionCounter % neighbors.length]
                : (sq.currentTreeIdx + 1) % squirrelTrees.length;
            sq.state = 'climb_up';
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = 1.55;
          }
        }
      } else if (sq.state === 'climb_up') {
        const startAng = Math.atan2(
          sq.wanderTargetZ - currTree.z,
          sq.wanderTargetX - currTree.x
        );
        const spiralAng = startAng + p * 1.4;
        const trunkRad =
          currTree.baseTrunkRadius + p * (currTree.topTrunkRadius - currTree.baseTrunkRadius);
        const sx = currTree.x + Math.cos(spiralAng) * trunkRad;
        const sz = currTree.z + Math.sin(spiralAng) * trunkRad;
        const sy = currTree.baseY + 0.25 + p * (currTree.perchHeight - 0.25);
        sq.root.position.set(sx, sy, sz);
        // Face upward along the trunk while hugging bark
        const inYaw = Math.atan2(-Math.cos(spiralAng), -Math.sin(spiralAng));
        sq.root.rotation.order = 'YXZ';
        sq.root.rotation.set(-Math.PI * 0.45, inYaw, Math.sin(p * Math.PI * 6) * 0.12);
        sq.tailMesh.rotation.x = -0.45 + Math.sin(elapsedTime * 16 + i) * 0.26;

        if (p >= 1.0) {
          sq.state = 'perched';
          sq.stateStartTime = elapsedTime;
          sq.stateDuration = 2.8 + hash2D(sq.decisionCounter, i + 43) * 3.2;
        }
      }
    }

    // Update Deer Herd (with water avoidance and proximity alertness)
    const animalsSleepingAtNight = nightFactor > 0.65;
    for (let i = 0; i < deerHerd.length; i++) {
      const d = deerHerd[i];
      if (!isWithinViewDistance(d.homeX, d.homeZ, playerX, playerZ, 28, 150)) {
        d.root.visible = false;
        continue;
      }
      const distPlayerToDeerHome = Math.hypot(d.homeX - playerX, d.homeZ - playerZ);
      const isAlertToPlayer = distPlayerToDeerHome < 12.0;
      const cycle = (elapsedTime * 0.18 + d.phase) % (Math.PI * 2);
      const isGrazing = !isAlertToPlayer && Math.sin(cycle * 2) > 0.45;
      if (!animalsSleepingAtNight && !isGrazing) {
        const spdMult = isAlertToPlayer ? 2.1 : 1.0;
        const nextAngle = (d.walkAngle + dt * d.speed * spdMult) % (Math.PI * 2);
        const candX = d.homeX + Math.cos(nextAngle) * d.orbitRadius;
        const candZ = d.homeZ + Math.sin(nextAngle) * d.orbitRadius;
        if (groundHeightAt(candX, candZ) >= WATER_LEVEL + 0.15) {
          d.walkAngle = nextAngle;
        } else {
          d.walkAngle = (d.walkAngle + dt * d.speed * 3.0) % (Math.PI * 2);
        }
      }

      const dx = d.homeX + Math.cos(d.walkAngle) * d.orbitRadius;
      const dz = d.homeZ + Math.sin(d.walkAngle) * d.orbitRadius;
      d.root.visible = true;

      const dy = Math.max(WATER_LEVEL + 0.08, groundHeightAt(dx, dz));
      d.root.position.set(dx, dy, dz);
      d.root.rotation.y = Math.atan2(-Math.sin(d.walkAngle), Math.cos(d.walkAngle));

      if (animalsSleepingAtNight) {
        d.posePivot.position.y = 0;
        d.deerGlbCtrl.setState('lie');
        d.deerGlbCtrl.update(dt);
        continue;
      }

      d.posePivot.position.y = 0;
      if (isGrazing) {
        d.deerGlbCtrl.setState('eat');
        d.deerGlbCtrl.update(dt);
      } else {
        d.deerGlbCtrl.setState(isAlertToPlayer ? 'run' : 'walk');
        d.deerGlbCtrl.update(dt);
      }
    }

    // Update Fluttering Butterflies (with animated wing flapping)
    const nearButterflies =
      !animalsSleepingAtNight && isWithinViewDistance(0, 18, playerX, playerZ, 45, 95);
    butterfliesGroup.visible = nearButterflies;
    if (nearButterflies) {
      const bflies = butterfliesGroup.children;
      for (let i = 0; i < bflies.length; i++) {
        const bf = bflies[i];
        const ud = bf.userData;
        const t = elapsedTime * ud.speed + ud.phase;
        const bx = ud.offsetX + Math.sin(t) * 4.5;
        const bz = ud.offsetZ + Math.cos(t * 0.8) * 4.5;
        const by =
          Math.max(WATER_LEVEL + 0.3, groundHeightAt(bx, bz)) + 1.2 + Math.sin(t * 2.5) * 0.65;
        bf.position.set(bx, by, bz);
        bf.rotation.y = Math.atan2(Math.cos(t), -Math.sin(t * 0.8) * 0.8);
        const wingFlap = Math.sin(elapsedTime * 19.0 + i * 1.4) * 0.68;
        if (ud.lWingPivot && ud.rWingPivot) {
          ud.lWingPivot.rotation.z = wingFlap;
          ud.rWingPivot.rotation.z = -wingFlap;
        }
      }
    }
  };

  return {
    pollenPoints,
    starsMaterial,
    cloudMesh,
    mistMaterials,
    birdsGroup,
    updateEnvironment,
  };
}
// #endregion
