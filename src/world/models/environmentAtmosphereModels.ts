// ============================================================================
// MODULE: World / Models / Environment Atmosphere Models
// DESIGN: Volumetric mist, celestial starfield, dynamic cloud layers, and ambient fauna (SRP)
// SUMMARY: Constructs mist banks, stars dome, cloud clusters, drifting pollen,
//          deer herds, canopy squirrels, and meadow butterflies with frame updates.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import type { WeatherStateSnapshot } from '../domain/worldTypes';
import {
  WATER_LEVEL,
  HUNTER_LODGE_POS,
  groundHeightAt,
  isWithinViewDistance,
  fbm2D,
  hash2D,
} from '../terrainMath';
import type { WorldModelBuildContext } from './types';
// #endregion

// ======================== TYPES & INTERFACES ======================== \\
// #region Types & Interfaces
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
    weather?: WeatherStateSnapshot
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
  bodyMesh: THREE.Mesh;
  neckPivot: THREE.Group;
  legs: [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh];
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
 */
export function buildEnvironmentAtmosphereModels(
  ctx: WorldModelBuildContext
): EnvironmentAtmosphereHandle {
  const { scene, isSoftwareGl, disposableGeometries, disposableMaterials, mistMaterials } = ctx;

  // 1. Squirrel Materials & Geometries
  const squirrelMat = new THREE.MeshStandardMaterial({
    color: 0xb85228,
    roughness: 0.75,
  });
  const squirrelTailMat = new THREE.MeshStandardMaterial({
    color: 0x993d18,
    roughness: 0.85,
  });
  disposableMaterials.push(squirrelMat, squirrelTailMat);

  const sqBodyGeo = new THREE.BoxGeometry(0.18, 0.16, 0.34);
  const sqHeadGeo = new THREE.BoxGeometry(0.14, 0.14, 0.16);
  sqHeadGeo.translate(0, 0.08, 0.2);
  const sqTailGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.38, 6);
  sqTailGeo.rotateX(-0.75);
  sqTailGeo.translate(0, 0.16, -0.24);
  disposableGeometries.push(sqBodyGeo, sqHeadGeo, sqTailGeo);

  const forestSquirrels: IForestSquirrel[] = [];
  const squirrelTrees = [
    { x: -55, z: 12 },
    { x: -48, z: 25 },
    { x: -62, z: 32 },
    { x: -38, z: 18 },
    { x: 38, z: 14 },
    { x: 45, z: 28 },
    { x: 58, z: -15 },
    { x: 68, z: -25 },
  ];

  for (let i = 0; i < squirrelTrees.length; i++) {
    const root = new THREE.Group();
    const body = new THREE.Mesh(sqBodyGeo, squirrelMat);
    const head = new THREE.Mesh(sqHeadGeo, squirrelMat);
    const tail = new THREE.Mesh(sqTailGeo, squirrelTailMat);
    root.add(body, head, tail);
    scene.add(root);

    const t = squirrelTrees[i];
    const treeY = groundHeightAt(t.x, t.z);
    root.position.set(t.x + 0.32, treeY + 5.2, t.z + 0.32);

    forestSquirrels.push({
      root,
      tailMesh: tail,
      currentTreeIdx: i,
      targetTreeIdx: (i + 1) % squirrelTrees.length,
      state: 'perched',
      stateStartTime: 0,
      stateDuration: 3.5 + hash2D(i, 83) * 4.0,
      wanderStartX: t.x,
      wanderStartZ: t.z,
      wanderTargetX: t.x + 3.0,
      wanderTargetZ: t.z + 2.0,
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
  const deerLegGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.78, 6);
  deerLegGeo.translate(0, -0.38, 0);
  const deerAntlerGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.42, 5);
  deerAntlerGeo.translate(0, 0.82, 0.05);
  disposableGeometries.push(deerBodyGeo, deerNeckGeo, deerHeadGeo, deerLegGeo, deerAntlerGeo);

  const deerHerd: IAnimatedDeer[] = [];
  const deerHomeSpots = [
    { x: -22, z: 22, r: 6.5, speed: 0.22 },
    { x: 26, z: 18, r: 7.0, speed: 0.24 },
    { x: -42, z: -10, r: 6.0, speed: 0.20 },
    { x: HUNTER_LODGE_POS.x - 12.5, z: HUNTER_LODGE_POS.z - 1.5, r: 1.8, speed: 0.12 },
    { x: 52, z: -28, r: 7.5, speed: 0.23 },
    { x: 18, z: 78, r: 8.5, speed: 0.22 },
  ];

  for (let i = 0; i < deerHomeSpots.length; i++) {
    const spot = deerHomeSpots[i];
    const root = new THREE.Group();

    const body = new THREE.Mesh(deerBodyGeo, deerCoatMat);
    body.position.set(0, 1.02, 0);
    body.castShadow = !isSoftwareGl;
    root.add(body);

    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 1.12, 0.52);
    const neck = new THREE.Mesh(deerNeckGeo, deerCoatMat);
    const head = new THREE.Mesh(deerHeadGeo, deerCoatMat);
    neckPivot.add(neck, head);

    if (i % 2 === 0) {
      const antlerL = new THREE.Mesh(deerAntlerGeo, antlerMat);
      antlerL.position.set(-0.1, 0, 0);
      antlerL.rotation.z = -0.25;
      const antlerR = new THREE.Mesh(deerAntlerGeo, antlerMat);
      antlerR.position.set(0.1, 0, 0);
      antlerR.rotation.z = 0.25;
      neckPivot.add(antlerL, antlerR);
    }
    root.add(neckPivot);

    const flLeg = new THREE.Mesh(deerLegGeo, deerCoatMat);
    flLeg.position.set(-0.2, 0.82, 0.42);
    const frLeg = new THREE.Mesh(deerLegGeo, deerCoatMat);
    frLeg.position.set(0.2, 0.82, 0.42);
    const blLeg = new THREE.Mesh(deerLegGeo, deerCoatMat);
    blLeg.position.set(-0.2, 0.82, -0.42);
    const brLeg = new THREE.Mesh(deerLegGeo, deerCoatMat);
    brLeg.position.set(0.2, 0.82, -0.42);
    root.add(flLeg, frLeg, blLeg, brLeg);

    scene.add(root);
    deerHerd.push({
      root,
      bodyMesh: body,
      neckPivot,
      legs: [flLeg, frLeg, blLeg, brLeg],
      homeX: spot.x,
      homeZ: spot.z,
      orbitRadius: spot.r,
      speed: spot.speed,
      phase: i * 1.1,
      walkAngle: i * 0.9,
    });
  }

  // 3. Fluttering Meadow Butterflies
  const butterfliesGroup = new THREE.Group();
  const bflyMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(bflyMat);

  const bflyWingGeo = new THREE.PlaneGeometry(0.12, 0.08);
  disposableGeometries.push(bflyWingGeo);

  for (let i = 0; i < 18; i++) {
    const bfly = new THREE.Group();
    const lWing = new THREE.Mesh(bflyWingGeo, bflyMat);
    lWing.position.set(-0.06, 0, 0);
    const rWing = new THREE.Mesh(bflyWingGeo, bflyMat);
    rWing.position.set(0.06, 0, 0);
    bfly.add(lWing, rWing);
    bfly.userData = {
      offsetX: (hash2D(i, 41) - 0.5) * 32,
      offsetZ: (hash2D(i, 47) - 0.5) * 32,
      phase: i * 0.85,
      speed: 0.6 + hash2D(i, 53) * 0.5,
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

  // 6. Soaring Ambient Birds Flock
  const birdsGroup = new THREE.Group();
  const birdMat = new THREE.MeshStandardMaterial({
    color: 0x24211e,
    roughness: 0.6,
  });
  disposableMaterials.push(birdMat);

  const wingGeo = new THREE.BoxGeometry(0.95, 0.04, 0.26);
  disposableGeometries.push(wingGeo);

  for (let b = 0; b < 16; b++) {
    const bird = new THREE.Group();
    const leftWing = new THREE.Mesh(wingGeo, birdMat);
    leftWing.position.set(-0.42, 0, 0);
    leftWing.rotation.z = 0.18;
    const rightWing = new THREE.Mesh(wingGeo, birdMat);
    rightWing.position.set(0.42, 0, 0);
    rightWing.rotation.z = -0.18;
    bird.add(leftWing, rightWing);
    bird.userData = {
      orbitRadius: 28 + (b % 5) * 18,
      orbitSpeed: 0.14 + (b % 3) * 0.03,
      phase: (b / 16) * Math.PI * 2,
      altitude: 26 + (b % 5) * 3.0,
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

  // 8. Pollen Particles
  const pollenCount = 220;
  const pollenGeo = new THREE.BufferGeometry();
  const pollenPos = new Float32Array(pollenCount * 3);
  for (let i = 0; i < pollenCount; i++) {
    pollenPos[i * 3] = (hash2D(i, 1) - 0.5) * 120;
    pollenPos[i * 3 + 1] = 0.8 + hash2D(i, 2) * 7.5;
    pollenPos[i * 3 + 2] = (hash2D(i, 3) - 0.5) * 120;
  }
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
  disposableGeometries.push(pollenGeo);

  const pollenMat = new THREE.PointsMaterial({
    color: 0xfde047,
    size: 0.28,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  disposableMaterials.push(pollenMat);

  const pollenPoints = new THREE.Points(pollenGeo, pollenMat);
  scene.add(pollenPoints);

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
    weather?: WeatherStateSnapshot
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

    // Update Mist Layers
    mistMat1.opacity = morningMistOpacity * 0.45;
    mistMat2.opacity = morningMistOpacity * 0.32;
    mistLayer1.rotation.y = elapsedTime * 0.008;
    mistLayer2.rotation.y = -elapsedTime * 0.006;

    // Update Ambient Birds
    const birdChildren = birdsGroup.children;
    for (let b = 0; b < birdChildren.length; b++) {
      const bird = birdChildren[b];
      const ud = bird.userData;
      const angle = elapsedTime * ud.orbitSpeed + ud.phase;
      bird.position.set(
        Math.cos(angle) * ud.orbitRadius,
        ud.altitude + Math.sin(angle * 2.0) * 1.5,
        Math.sin(angle) * ud.orbitRadius
      );
      bird.rotation.y = -angle - Math.PI / 2;
    }

    // Update Forest Squirrels
    for (let i = 0; i < forestSquirrels.length; i++) {
      const sq = forestSquirrels[i];
      const currTree = squirrelTrees[sq.currentTreeIdx];
      const targTree = squirrelTrees[sq.targetTreeIdx];
      const currTreeY = groundHeightAt(currTree.x, currTree.z);
      const stateElapsed = elapsedTime - sq.stateStartTime;
      const p = Math.max(0, Math.min(1, stateElapsed / sq.stateDuration));

      if (sq.state === 'perched') {
        sq.root.position.set(currTree.x + 0.32, currTreeY + 5.2, currTree.z + 0.32);
        sq.tailMesh.rotation.x = -0.75 + Math.sin(elapsedTime * 8 + i) * 0.15;
        if (p >= 1.0) {
          sq.state = 'climb_down';
          sq.stateStartTime = elapsedTime;
          sq.stateDuration = 1.8;
        }
      } else if (sq.state === 'climb_down') {
        const ang = (1 - p) * Math.PI + i;
        const sx = currTree.x + Math.cos(ang) * 0.34;
        const sz = currTree.z + Math.sin(ang) * 0.34;
        const sy = currTreeY + 5.2 - p * 5.0;
        sq.root.position.set(sx, sy, sz);
        sq.root.rotation.set(0.75, -ang, 0);
        sq.tailMesh.rotation.x = -0.5 + Math.sin(elapsedTime * 14 + i) * 0.25;

        if (p >= 1.0) {
          sq.state = 'ground_wander';
          sq.stateStartTime = elapsedTime;
          sq.stateDuration = 2.4;
          sq.wanderLegsRemaining = 2;
          sq.wanderStartX = currTree.x + 0.4;
          sq.wanderStartZ = currTree.z + 0.4;
          const wAngle = hash2D(sq.decisionCounter, i * 17) * Math.PI * 2;
          const wDist = 2.8 + hash2D(sq.decisionCounter + 3, i * 31) * 3.8;
          sq.wanderTargetX = currTree.x + Math.cos(wAngle) * wDist;
          sq.wanderTargetZ = currTree.z + Math.sin(wAngle) * wDist;
        }
      } else if (sq.state === 'ground_wander') {
        const sx = sq.wanderStartX + (sq.wanderTargetX - sq.wanderStartX) * p;
        const sz = sq.wanderStartZ + (sq.wanderTargetZ - sq.wanderStartZ) * p;
        const hop = Math.abs(Math.sin(p * Math.PI * 5)) * 0.15;
        const sy = groundHeightAt(sx, sz) + 0.12 + hop;
        sq.root.position.set(sx, sy, sz);
        const heading = Math.atan2(sq.wanderTargetX - sq.wanderStartX, sq.wanderTargetZ - sq.wanderStartZ);
        sq.root.rotation.set(0, heading, 0);
        sq.tailMesh.rotation.x = -0.95 + Math.sin(elapsedTime * 18 + i) * 0.2;

        if (p >= 1.0) {
          sq.wanderLegsRemaining -= 1;
          sq.decisionCounter += 1;
          if (sq.wanderLegsRemaining > 0) {
            sq.wanderStartX = sq.wanderTargetX;
            sq.wanderStartZ = sq.wanderTargetZ;
            sq.wanderTargetX = targTree.x;
            sq.wanderTargetZ = targTree.z;
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = 2.3;
          } else {
            sq.currentTreeIdx = sq.targetTreeIdx;
            sq.state = 'climb_up';
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = 1.65;
          }
        }
      } else if (sq.state === 'climb_up') {
        const ang = p * Math.PI + i;
        const sx = currTree.x + Math.cos(ang) * 0.34;
        const sz = currTree.z + Math.sin(ang) * 0.34;
        const sy = currTreeY + 0.22 + p * 5.2;
        sq.root.position.set(sx, sy, sz);
        sq.root.rotation.set(-0.75, -ang, 0);
        sq.tailMesh.rotation.x = -0.5 + Math.sin(elapsedTime * 16 + i) * 0.25;

        if (p >= 1.0) {
          sq.state = 'perched';
          sq.stateStartTime = elapsedTime;
          sq.stateDuration = 3.5 + hash2D(sq.decisionCounter, i + 43) * 4.5;
        }
      }
    }

    // Update Deer Herd
    const animalsSleepingAtNight = nightFactor > 0.65;
    for (let i = 0; i < deerHerd.length; i++) {
      const d = deerHerd[i];
      if (!isWithinViewDistance(d.homeX, d.homeZ, playerX, playerZ, 28, 150)) {
        d.root.visible = false;
        continue;
      }
      const cycle = (elapsedTime * 0.18 + d.phase) % (Math.PI * 2);
      const isGrazing = Math.sin(cycle * 2) > 0.45;
      if (!animalsSleepingAtNight && !isGrazing) {
        d.walkAngle = (d.walkAngle + dt * d.speed) % (Math.PI * 2);
      }

      const dx = d.homeX + Math.cos(d.walkAngle) * d.orbitRadius;
      const dz = d.homeZ + Math.sin(d.walkAngle) * d.orbitRadius;
      d.root.visible = true;

      const dy = groundHeightAt(dx, dz);
      d.root.position.set(dx, dy, dz);
      d.root.rotation.y = Math.atan2(-Math.sin(d.walkAngle), Math.cos(d.walkAngle));

      if (animalsSleepingAtNight) {
        d.bodyMesh.position.y = 0.42;
        d.neckPivot.position.set(0, 0.52, 0.52);
        d.neckPivot.rotation.x = 0.92 + Math.sin(elapsedTime * 0.8 + i) * 0.03;
        for (const leg of d.legs) {
          leg.position.y = 0.25;
          leg.rotation.x = Math.PI / 2;
        }
        continue;
      }

      d.bodyMesh.position.y = 1.02;
      d.neckPivot.position.set(0, 1.12, 0.52);
      for (const leg of d.legs) {
        leg.position.y = 0.82;
      }

      if (isGrazing) {
        d.neckPivot.rotation.x = 0.85 + Math.sin(elapsedTime * 3.2 + i) * 0.08;
        for (const leg of d.legs) leg.rotation.x = 0;
      } else {
        d.neckPivot.rotation.x = 0.1 + Math.sin(elapsedTime * 2.2 + i) * 0.05;
        const swing = Math.sin(elapsedTime * 4.8 + i) * 0.36;
        d.legs[0].rotation.x = swing;
        d.legs[3].rotation.x = swing;
        d.legs[1].rotation.x = -swing;
        d.legs[2].rotation.x = -swing;
      }
    }

    // Update Fluttering Butterflies
    const nearButterflies =
      !animalsSleepingAtNight && isWithinViewDistance(0, 0, playerX, playerZ, 45, 95);
    butterfliesGroup.visible = nearButterflies;
    if (nearButterflies) {
      const bflies = butterfliesGroup.children;
      for (let i = 0; i < bflies.length; i++) {
        const bf = bflies[i];
        const ud = bf.userData;
        const t = elapsedTime * ud.speed + ud.phase;
        const bx = ud.offsetX + Math.sin(t) * 4.5;
        const bz = ud.offsetZ + Math.cos(t * 0.8) * 4.5;
        const by = groundHeightAt(bx, bz) + 1.2 + Math.sin(t * 2.5) * 0.65;
        bf.position.set(bx, by, bz);
        bf.rotation.y = t * 1.5;
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
