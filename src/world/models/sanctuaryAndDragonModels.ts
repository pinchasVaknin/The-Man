// ============================================================================
// MODULE: World / Models / Sanctuary & Dragon Models
// DESIGN: Flying Imperial Sky Dragon & Mystic Sakura Hot-Spring Sanctuary (SRP)
// SUMMARY: Constructs the 22-segment articulated flying sky dragon, onsen pool,
//          colossal Golden Buddha statue, blooming sakura trees, and Tai-Chi monks.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  FORTRESS_Y_OFFSET,
  SAKURA_SANCTUARY_POS,
  SAKURA_SANCTUARY_YAW,
} from '../domain/landmarksRegistry';
import { hash2D } from '../domain/noiseAndMath';
import { isWithinViewDistance, VIEW_DISTANCE } from '../terrainMath';
import { createArchitecturalSharedAssets } from './architecturalHelpers';
import type { WorldModelBuildContext } from './types';
// #endregion

// ======================== INTERFACES & TYPES ======================== \\
// #region Interfaces & Types
interface TaiChiMonk {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  homeX: number;
  homeY: number;
  homeZ: number;
  baseYaw: number;
  phase: number;
}

export interface SanctuaryAndDragonResult {
  skyDragonGroup: THREE.Group;
  sakuraSanctuaryGroup: THREE.Group;
  updateSanctuaryAndDragon: (elapsedTime: number, playerX: number, playerZ: number) => void;
}
// #endregion

// ======================== FACTORY FUNCTION ======================== \\
// #region Factory Function
/**
 * Constructs the articulated flying sky dragon, the oriental Sakura Hot-Spring
 * Sanctuary, colossal seated Golden Buddha, and Tai-Chi monks.
 */
export function buildSanctuaryAndDragonModels(ctx: WorldModelBuildContext): SanctuaryAndDragonResult {
  const { scene, textures, disposableGeometries, disposableMaterials, distanceCulledObjects } = ctx;
  const archAssets = createArchitecturalSharedAssets(ctx);

  // --- 1) ARTICULATED FLYING IMPERIAL SKY DRAGON ---
  const skyDragonGroup = new THREE.Group();
  const dragonHeadGroup = new THREE.Group();
  const dragonSnoutGeo = new THREE.BoxGeometry(1.35, 0.95, 2.2);
  const dragonJawGeo = new THREE.BoxGeometry(1.15, 0.42, 1.85);
  const dragonHornGeo = new THREE.ConeGeometry(0.18, 1.9, 7);
  dragonHornGeo.rotateX(-Math.PI * 0.32);
  const dragonEyeGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const dragonWhiskerGeo = new THREE.CylinderGeometry(0.04, 0.02, 2.6, 6);
  dragonWhiskerGeo.rotateZ(Math.PI * 0.38);
  const dragonSegGeo = new THREE.SphereGeometry(0.82, 10, 10);
  dragonSegGeo.scale(1.0, 0.88, 1.35);
  const dragonSpineFinGeo = new THREE.ConeGeometry(0.26, 0.95, 5);
  const dragonLegGeo = new THREE.CylinderGeometry(0.18, 0.1, 1.6, 6);

  disposableGeometries.push(
    dragonSnoutGeo,
    dragonJawGeo,
    dragonHornGeo,
    dragonEyeGeo,
    dragonWhiskerGeo,
    dragonSegGeo,
    dragonSpineFinGeo,
    dragonLegGeo
  );

  const dSnout = new THREE.Mesh(dragonSnoutGeo, archAssets.imperialGoldMat);
  dSnout.position.set(0, 0.2, 0.6);
  const dJaw = new THREE.Mesh(dragonJawGeo, archAssets.imperialCrimsonMat);
  dJaw.position.set(0, -0.35, 0.5);
  dragonHeadGroup.add(dSnout, dJaw);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(dragonHornGeo, archAssets.carvedMarbleMat);
    horn.position.set(side * 0.48, 0.95, -0.35);
    horn.rotation.z = side * -0.22;
    const eye = new THREE.Mesh(dragonEyeGeo, archAssets.redLanternMat);
    eye.position.set(side * 0.58, 0.38, 1.15);
    const whisker = new THREE.Mesh(dragonWhiskerGeo, archAssets.imperialGoldMat);
    whisker.position.set(side * 1.35, -0.1, 1.45);
    whisker.rotation.y = side * 0.35;
    dragonHeadGroup.add(horn, eye, whisker);
  }
  skyDragonGroup.add(dragonHeadGroup);

  const dragonSegments: THREE.Group[] = [];
  const numDragonSegments = 22;
  for (let s = 0; s < numDragonSegments; s++) {
    const segGroup = new THREE.Group();
    const taper = Math.max(0.25, 1.0 - (s / numDragonSegments) * 0.72);
    const segBody = new THREE.Mesh(dragonSegGeo, archAssets.imperialGoldMat);
    segBody.scale.setScalar(taper);
    const segFin = new THREE.Mesh(dragonSpineFinGeo, archAssets.imperialCrimsonMat);
    segFin.position.set(0, 0.85 * taper, 0);
    segFin.scale.setScalar(taper);
    segGroup.add(segBody, segFin);

    if (s === 3 || s === 11) {
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(dragonLegGeo, archAssets.imperialGoldMat);
        leg.position.set(side * 0.85 * taper, -0.85 * taper, 0);
        leg.rotation.z = side * 0.35;
        leg.rotation.x = 0.4;
        segGroup.add(leg);
      }
    }
    skyDragonGroup.add(segGroup);
    dragonSegments.push(segGroup);
  }
  scene.add(skyDragonGroup);

  // --- 2) SAKURA HOT-SPRING SANCTUARY & BUDDHA ---
  const sCx = SAKURA_SANCTUARY_POS.x;
  const sCz = SAKURA_SANCTUARY_POS.z;
  const sY = SAKURA_SANCTUARY_POS.height;
  const sakuraSanctuaryGroup = new THREE.Group();
  sakuraSanctuaryGroup.position.set(sCx, sY, sCz);
  sakuraSanctuaryGroup.rotation.y = SAKURA_SANCTUARY_YAW;

  const sakuraBlossomMat = new THREE.MeshStandardMaterial({
    color: 0xffb7d5,
    roughness: 0.55,
    emissive: 0x4a152b,
    emissiveIntensity: 0.22,
  });
  const hotSpringWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x075985,
    emissiveIntensity: 0.42,
    roughness: 0.14,
    metalness: 0.12,
    transparent: true,
    opacity: 0.88,
  });
  const monkRobeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.65,
  });
  const monkSkinMat = new THREE.MeshStandardMaterial({
    color: 0xf1c27d,
    roughness: 0.55,
  });
  const monkPantsMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.78,
  });
  const monkWrapMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    roughness: 0.82,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x2d3748,
    roughness: 0.45,
    metalness: 0.85,
  });
  const sanctuaryStoneMat = new THREE.MeshStandardMaterial({
    color: 0x9c9891,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.08,
    roughness: 0.86,
    metalness: 0.05,
  });

  disposableMaterials.push(
    sakuraBlossomMat,
    hotSpringWaterMat,
    monkRobeMat,
    monkSkinMat,
    monkPantsMat,
    monkWrapMat,
    darkIronMat,
    sanctuaryStoneMat
  );

  const hotSpringPoolGeo = new THREE.CylinderGeometry(13.5, 14.5, 0.22, 28);
  const hotSpringRimRockGeo = new THREE.DodecahedronGeometry(1.65, 1);
  const lotusPadGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.05, 10);
  const lotusFlowerGeo = new THREE.ConeGeometry(0.32, 0.42, 7);
  const steppingSlabGeo = new THREE.CylinderGeometry(1.45, 1.55, 0.14, 8);
  const buddhaLotusTier1Geo = new THREE.CylinderGeometry(5.6, 6.2, 1.3, 16);
  const buddhaLotusTier2Geo = new THREE.CylinderGeometry(4.5, 5.1, 1.1, 16);
  const buddhaLotusTier3Geo = new THREE.CylinderGeometry(3.8, 4.3, 0.9, 16);
  const buddhaLegsGeo = new THREE.CylinderGeometry(2.6, 3.3, 1.8, 14);
  const buddhaTorsoGeo = new THREE.CylinderGeometry(1.75, 2.35, 4.4, 14);
  const buddhaShouldersGeo = new THREE.SphereGeometry(2.25, 14, 12);
  buddhaShouldersGeo.scale(1.25, 0.55, 0.82);
  const buddhaHeadGeo = new THREE.SphereGeometry(1.38, 14, 14);
  const buddhaUshnishaGeo = new THREE.SphereGeometry(0.55, 10, 10);
  const buddhaHaloRingGeo = new THREE.TorusGeometry(3.4, 0.22, 10, 32);
  const buddhaArmGeo = new THREE.CylinderGeometry(0.46, 0.42, 2.8, 10);
  const sakuraTrunkGeo = new THREE.CylinderGeometry(0.28, 0.48, 4.6, 8);
  sakuraTrunkGeo.translate(0, 2.3, 0);
  const sakuraCrownGeo = new THREE.DodecahedronGeometry(2.8, 1);
  sakuraCrownGeo.scale(1.35, 0.72, 1.35);

  disposableGeometries.push(
    hotSpringPoolGeo,
    hotSpringRimRockGeo,
    lotusPadGeo,
    lotusFlowerGeo,
    steppingSlabGeo,
    buddhaLotusTier1Geo,
    buddhaLotusTier2Geo,
    buddhaLotusTier3Geo,
    buddhaLegsGeo,
    buddhaTorsoGeo,
    buddhaShouldersGeo,
    buddhaHeadGeo,
    buddhaUshnishaGeo,
    buddhaHaloRingGeo,
    buddhaArmGeo,
    sakuraTrunkGeo,
    sakuraCrownGeo
  );

  const localPoolZ = 1.5;
  const hotPoolMesh = new THREE.Mesh(hotSpringPoolGeo, hotSpringWaterMat);
  hotPoolMesh.position.set(0, 0.04, localPoolZ);
  sakuraSanctuaryGroup.add(hotPoolMesh);

  for (let r = 0; r < 24; r++) {
    if (r === 4 || r === 5 || r === 6 || r === 7 || r === 8) continue;
    const ang = (r / 24) * Math.PI * 2;
    const rx = Math.cos(ang) * 14.2;
    const rz = localPoolZ + Math.sin(ang) * 14.2;
    const rimRock = new THREE.Mesh(hotSpringRimRockGeo, sanctuaryStoneMat);
    const sc = 0.75 + hash2D(r, 91) * 0.65;
    rimRock.scale.set(sc * 1.2, sc * 0.7, sc);
    rimRock.position.set(rx, 0.25, rz);
    rimRock.rotation.y = ang;
    sakuraSanctuaryGroup.add(rimRock);
  }

  for (let sz = 15.5; sz <= 25.5; sz += 2.0) {
    const stepSlab = new THREE.Mesh(steppingSlabGeo, archAssets.carvedMarbleMat);
    stepSlab.position.set(0, 0.04, sz);
    sakuraSanctuaryGroup.add(stepSlab);
  }

  for (let l = 0; l < 12; l++) {
    const lang = l * 1.9 + 0.4;
    const lrad = 3.2 + (l % 4) * 2.4;
    const lx = Math.cos(lang) * lrad;
    const lz = localPoolZ + Math.sin(lang) * lrad;
    const pad = new THREE.Mesh(lotusPadGeo, archAssets.jadeBeamMat);
    pad.position.set(lx, 0.16, lz);
    const blossom = new THREE.Mesh(lotusFlowerGeo, sakuraBlossomMat);
    blossom.position.set(lx, 0.36, lz);
    sakuraSanctuaryGroup.add(pad, blossom);
  }

  // Golden Buddha Statue
  const buddhaGroup = new THREE.Group();
  buddhaGroup.position.set(0, 0, -14.0);
  const bTier1 = new THREE.Mesh(buddhaLotusTier1Geo, archAssets.carvedMarbleMat);
  bTier1.position.y = 0.65;
  const bTier2 = new THREE.Mesh(buddhaLotusTier2Geo, archAssets.imperialCrimsonMat);
  bTier2.position.y = 1.85;
  const bTier3 = new THREE.Mesh(buddhaLotusTier3Geo, archAssets.carvedMarbleMat);
  bTier3.position.y = 2.85;

  const bLegs = new THREE.Mesh(buddhaLegsGeo, archAssets.imperialGoldMat);
  bLegs.position.y = 4.2;
  const bTorso = new THREE.Mesh(buddhaTorsoGeo, archAssets.imperialGoldMat);
  bTorso.position.y = 6.9;
  const bShoulders = new THREE.Mesh(buddhaShouldersGeo, archAssets.imperialGoldMat);
  bShoulders.position.y = 8.6;
  const bHead = new THREE.Mesh(buddhaHeadGeo, archAssets.imperialGoldMat);
  bHead.position.y = 10.35;
  const bUshnisha = new THREE.Mesh(buddhaUshnishaGeo, archAssets.imperialGoldMat);
  bUshnisha.position.y = 11.75;
  const bHalo = new THREE.Mesh(buddhaHaloRingGeo, archAssets.imperialGoldMat);
  bHalo.position.set(0, 9.6, -1.35);

  for (const side of [-1, 1]) {
    const bArm = new THREE.Mesh(buddhaArmGeo, archAssets.imperialGoldMat);
    bArm.position.set(side * 2.05, 6.7, 0.55);
    bArm.rotation.z = side * 0.42;
    bArm.rotation.x = -0.35;
    buddhaGroup.add(bArm);
  }

  buddhaGroup.add(
    bTier1,
    bTier2,
    bTier3,
    bLegs,
    bTorso,
    bShoulders,
    bHead,
    bUshnisha,
    bHalo,
    archAssets.createRedChineseLantern(-4.8, 3.8, 3.2),
    archAssets.createRedChineseLantern(4.8, 3.8, 3.2)
  );
  sakuraSanctuaryGroup.add(buddhaGroup);

  const sanctuaryGate = archAssets.createOrnatePaifangGate(22.5, 0);
  sakuraSanctuaryGroup.add(sanctuaryGate);

  for (let t = 0; t < 14; t++) {
    const tang = (t / 14) * Math.PI * 2 + 0.22;
    const trad = 21.0 + (t % 2) * 2.8;
    const ltx = Math.cos(tang) * trad;
    const ltz = Math.sin(tang) * trad;
    if (ltz > 10.0 && Math.abs(ltx) < 9.5) continue;

    const sTree = new THREE.Group();
    sTree.position.set(ltx, 0, ltz);
    const trunk = new THREE.Mesh(sakuraTrunkGeo, darkIronMat);
    sTree.add(trunk);

    for (const [cx, cy, cz, sc] of [
      [0, 5.2, 0, 1.15],
      [-1.8, 4.6, 0.9, 0.85],
      [1.8, 4.7, -0.8, 0.88],
      [0.4, 5.8, 1.4, 0.78],
    ]) {
      const crown = new THREE.Mesh(sakuraCrownGeo, sakuraBlossomMat);
      crown.position.set(cx, cy, cz);
      crown.scale.setScalar(sc);
      sTree.add(crown);
    }
    sakuraSanctuaryGroup.add(sTree);
  }

  scene.add(sakuraSanctuaryGroup);
  distanceCulledObjects.push({
    obj: sakuraSanctuaryGroup,
    cx: sCx,
    cz: sCz,
    radius: 54,
  });

  // --- 3) 4 TAI-CHI MONKS AROUND SAKURA SANCTUARY ---
  const monkTorsoGeo = new THREE.CylinderGeometry(0.24, 0.31, 0.82, 8);
  monkTorsoGeo.translate(0, 1.08, 0);
  const monkHeadGeo = new THREE.SphereGeometry(0.2, 10, 10);
  monkHeadGeo.translate(0, 1.68, 0);
  const monkSashGeo = new THREE.BoxGeometry(0.54, 0.14, 0.54);
  const monkArmGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.68, 6);
  monkArmGeo.translate(0, -0.28, 0);
  const monkUpperLegGeo = new THREE.CylinderGeometry(0.105, 0.088, 0.46, 7);
  monkUpperLegGeo.translate(0, -0.22, 0);
  const monkLowerLegGeo = new THREE.CylinderGeometry(0.082, 0.068, 0.38, 7);
  monkLowerLegGeo.translate(0, -0.56, 0);
  const monkShoeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.28);
  monkShoeGeo.translate(0, -0.74, 0.05);

  disposableGeometries.push(
    monkTorsoGeo,
    monkHeadGeo,
    monkSashGeo,
    monkArmGeo,
    monkUpperLegGeo,
    monkLowerLegGeo,
    monkShoeGeo
  );

  const cosSakura = Math.cos(SAKURA_SANCTUARY_YAW);
  const sinSakura = Math.sin(SAKURA_SANCTUARY_YAW);
  const toSakuraWorld = (lx: number, lz: number): [number, number] => [
    sCx + lx * cosSakura + lz * sinSakura,
    sCz - lx * sinSakura + lz * cosSakura,
  ];
  const [m1x, m1z] = toSakuraWorld(-8.5, -6.5);
  const [m2x, m2z] = toSakuraWorld(8.5, -6.5);
  const [m3x, m3z] = toSakuraWorld(-6.5, 16.5);
  const [m4x, m4z] = toSakuraWorld(6.5, 16.5);

  const taiChiMonks: TaiChiMonk[] = [];
  const monkPlacements: Array<[number, number, number, number]> = [
    [m1x, sY, m1z, SAKURA_SANCTUARY_YAW],
    [m2x, sY, m2z, SAKURA_SANCTUARY_YAW],
    [m3x, sY, m3z, SAKURA_SANCTUARY_YAW + Math.PI],
    [m4x, sY, m4z, SAKURA_SANCTUARY_YAW + Math.PI],
  ];

  for (let m = 0; m < monkPlacements.length; m++) {
    const [mx, my, mz, myaw] = monkPlacements[m];
    const mGroup = new THREE.Group();
    mGroup.position.set(mx, my, mz);
    mGroup.rotation.y = myaw;

    const torso = new THREE.Mesh(monkTorsoGeo, monkRobeMat);
    const head = new THREE.Mesh(monkHeadGeo, monkSkinMat);
    const sash = new THREE.Mesh(monkSashGeo, archAssets.imperialCrimsonMat);
    sash.position.y = 0.88;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.32, 1.38, 0);
    leftArm.add(new THREE.Mesh(monkArmGeo, monkRobeMat));

    const rightArm = new THREE.Group();
    rightArm.position.set(0.32, 1.38, 0);
    rightArm.add(new THREE.Mesh(monkArmGeo, monkRobeMat));

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.14, 0.78, 0);
    leftLeg.add(
      new THREE.Mesh(monkUpperLegGeo, monkPantsMat),
      new THREE.Mesh(monkLowerLegGeo, monkWrapMat),
      new THREE.Mesh(monkShoeGeo, monkPantsMat)
    );

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.14, 0.78, 0);
    rightLeg.add(
      new THREE.Mesh(monkUpperLegGeo, monkPantsMat),
      new THREE.Mesh(monkLowerLegGeo, monkWrapMat),
      new THREE.Mesh(monkShoeGeo, monkPantsMat)
    );

    mGroup.add(torso, head, sash, leftArm, rightArm, leftLeg, rightLeg);
    scene.add(mGroup);
    taiChiMonks.push({
      group: mGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      homeX: mx,
      homeY: my,
      homeZ: mz,
      baseYaw: myaw,
      phase: (m + 4) * 0.85,
    });
  }

  return {
    skyDragonGroup,
    sakuraSanctuaryGroup,
    updateSanctuaryAndDragon: (elapsedTime: number, playerX: number, playerZ: number) => {
      // Dragon flight animation
      const dTime = elapsedTime * 0.16;
      const dragonCenterX = Math.sin(dTime) * 78.0 + 22.0;
      const dragonCenterZ = -265.0 + Math.sin(dTime * 2.0) * 58.0;
      const dragonVis = isWithinViewDistance(
        dragonCenterX,
        dragonCenterZ,
        playerX,
        playerZ,
        90,
        VIEW_DISTANCE
      );
      skyDragonGroup.visible = dragonVis;
      if (dragonVis) {
        const dragonBaseY = 72.0 + FORTRESS_Y_OFFSET + Math.cos(dTime * 1.5) * 4.5;
        const dVelX = Math.cos(dTime) * 78.0 * 0.16;
        const dVelZ = Math.cos(dTime * 2.0) * 58.0 * 0.32;
        const dragonYaw = Math.atan2(dVelX, dVelZ);

        skyDragonGroup.position.set(dragonCenterX, dragonBaseY, dragonCenterZ);
        skyDragonGroup.rotation.y = dragonYaw;
        dragonHeadGroup.position.y = Math.sin(elapsedTime * 3.6) * 0.42;
        dragonHeadGroup.rotation.x = Math.cos(elapsedTime * 3.6) * 0.14;

        for (let s = 0; s < dragonSegments.length; s++) {
          const seg = dragonSegments[s];
          const wave = elapsedTime * 4.2 - (s + 1) * 0.42;
          seg.position.set(
            Math.sin(wave * 0.7) * 0.65,
            Math.sin(wave) * 0.78,
            -(s + 1) * 1.08
          );
          seg.rotation.x = Math.cos(wave) * 0.22;
          seg.rotation.y = Math.sin(wave * 0.7) * 0.18;
        }
      }

      // Tai-Chi monks animation
      for (let m = 0; m < taiChiMonks.length; m++) {
        const mk = taiChiMonks[m];
        const vis = isWithinViewDistance(mk.homeX, mk.homeZ, playerX, playerZ, 8, 125);
        mk.group.visible = vis;
        if (!vis) continue;
        const formT = elapsedTime * 1.85 + mk.phase;
        mk.group.position.y = mk.homeY + Math.abs(Math.sin(formT)) * 0.05;
        mk.group.rotation.y = mk.baseYaw + Math.sin(formT * 0.5) * 0.38;
        mk.leftArm.rotation.x = -0.65 + Math.sin(formT) * 0.75;
        mk.leftArm.rotation.z = 0.25 + Math.cos(formT * 0.7) * 0.25;
        mk.rightArm.rotation.x = -0.85 + Math.cos(formT) * 0.85;
        mk.rightArm.rotation.z = -0.25 + Math.sin(formT * 0.7) * 0.32;
        const legStance = Math.sin(formT * 0.5) * 0.26;
        mk.leftLeg.rotation.x = legStance;
        mk.rightLeg.rotation.x = -legStance;
      }
    },
  };
}
// #endregion
