// ============================================================================
// MODULE: World / Builders / Dwarven Kingdom Builder
// DESIGN: Builder for dwarven entrance arch, guardian statues, houses & miners (SRP)
// SUMMARY: Constructs the colossal twin king statues, 4 enterable stone houses,
//          8 animated dwarven miners, and caravan schedule animation updates.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import * as THREE from 'three';
import {
  DWARVEN_GUARDIAN_STATUES,
  DWARVEN_STONE_HOUSES,
  SOUTHERN_MINE_POS,
  VIEW_DISTANCE,
  isWithinViewDistance,
} from '../domain/landmarksRegistry';
import {
  DWARVEN_MINERS_COUNT,
  computeDwarvenMinerCaravanState,
} from '../systems/dwarvenMineAndCaravanSystem';

export interface DwarvenMinerRig {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torsoPivot: THREE.Group;
  lanternGlow: THREE.Mesh;
}

export interface DwarvenKingdomBuilderContext {
  scene: THREE.Scene;
  mineGroup: THREE.Group;
  mineX: number;
  mineEntY: number;
  mineEntZ: number;
  cavernBackZ: number;
  stonePatternTex: THREE.Texture;
  mineGoldOreMat: THREE.Material;
  mineMoltenCoalMat: THREE.Material;
  barkMat: THREE.Material;
  timberMat: THREE.Material;
  darkIronMat: THREE.Material;
  forgeBrazierBaseGeo: THREE.BufferGeometry;
  forgeCoalMoundGeo: THREE.BufferGeometry;
  createLanternAssembly: (x: number, y: number, z: number, addLight?: boolean) => THREE.Group;
  disposableGeometries: THREE.BufferGeometry[];
  disposableMaterials: THREE.Material[];
  distanceCulledObjects: { obj: THREE.Object3D; cx: number; cz: number; radius: number }[];
  doorPivotHandles: {
    id: string;
    leftPivot: THREE.Group;
    rightPivot: THREE.Group;
    currentAngle: number;
  }[];
}

export interface DwarvenKingdomHandle {
  dwarvenMiners: DwarvenMinerRig[];
  updateDwarvenMiners: (
    worldHours: number,
    elapsedTime: number,
    playerX: number,
    playerZ: number
  ) => void;
}
// #endregion

// ======================== BUILD DWARVEN KINGDOM ======================== \\
// #region Build Dwarven Kingdom

/**
 * Builder Pattern for the Southern Dwarven Kingdom:
 * - Monumental Carved Dwarven Stone Portal Arch framing the Mine Entrance
 * - Twin Colossal LOTR-Style Dwarven King Guardian Statues (`DWARVEN_GUARDIAN_STATUES`)
 * - 4 Enterable Hollow Dwarven Stone Houses (`DWARVEN_STONE_HOUSES`) with interactive [E] doors
 * - 8 Animated LOTR-Style Dwarven Miners (`dwarvenMiners`) & per-frame Caravan/Mining animator
 */
export function buildDwarvenKingdomAndMiners(
  ctx: DwarvenKingdomBuilderContext
): DwarvenKingdomHandle {
  const {
    scene,
    mineGroup,
    mineX,
    mineEntY,
    mineEntZ,
    cavernBackZ,
    stonePatternTex,
    mineGoldOreMat,
    mineMoltenCoalMat,
    barkMat,
    timberMat,
    darkIronMat,
    forgeBrazierBaseGeo,
    forgeCoalMoundGeo,
    createLanternAssembly,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
    doorPivotHandles,
  } = ctx;

  const dwarvenBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xb47b38,
    roughness: 0.34,
    metalness: 0.82,
  });
  const dwarvenGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    map: stonePatternTex,
    bumpMap: stonePatternTex,
    bumpScale: 0.06,
    roughness: 0.78,
    metalness: 0.12,
  });
  const dwarvenScaleArmorMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.32,
    metalness: 0.85,
  });
  disposableMaterials.push(dwarvenBronzeMat, dwarvenGraniteMat, dwarvenScaleArmorMat);

  // Monumental Carved Dwarven Stone Portal Arch framing the Mine Entrance
  const dwarvenPortalArchGroup = new THREE.Group();
  const portalArchPillarGeo = new THREE.BoxGeometry(1.45, 5.4, 1.45);
  portalArchPillarGeo.translate(0, 2.7, 0);
  const portalArchHeaderGeo = new THREE.BoxGeometry(9.6, 1.35, 1.65);
  const portalArchCrestGeo = new THREE.OctahedronGeometry(0.85, 0);
  disposableGeometries.push(portalArchPillarGeo, portalArchHeaderGeo, portalArchCrestGeo);
  for (const side of [-1, 1]) {
    const archPil = new THREE.Mesh(portalArchPillarGeo, dwarvenGraniteMat);
    archPil.position.set(side * 3.85, mineEntY, -0.35);
    const goldBand = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.32, 1.58), mineGoldOreMat);
    goldBand.position.set(side * 3.85, mineEntY + 3.8, -0.35);
    dwarvenPortalArchGroup.add(archPil, goldBand);
  }
  const archHeader = new THREE.Mesh(portalArchHeaderGeo, dwarvenGraniteMat);
  archHeader.position.set(0, mineEntY + 5.2, -0.35);
  const archCrest = new THREE.Mesh(portalArchCrestGeo, mineGoldOreMat);
  archCrest.scale.set(1.2, 1.0, 0.5);
  archCrest.position.set(0, mineEntY + 5.35, -1.2);
  dwarvenPortalArchGroup.add(archHeader, archCrest);
  mineGroup.add(dwarvenPortalArchGroup);

  scene.add(mineGroup);
  distanceCulledObjects.push({
    obj: mineGroup,
    cx: mineX,
    cz: (mineEntZ + cavernBackZ) * 0.5, // 475.0
    radius: 95,
  });

  // 1) TWIN COLOSSAL LOTR-STYLE DWARVEN KING GUARDIAN STATUES FLANKING THE MINE ENTRANCE
  const statuePedestalBaseGeo = new THREE.CylinderGeometry(2.35, 2.65, 2.4, 8);
  statuePedestalBaseGeo.translate(0, 1.2, 0);
  const statuePedestalCapGeo = new THREE.CylinderGeometry(2.55, 2.4, 0.42, 8);
  statuePedestalCapGeo.translate(0, 2.55, 0);
  const statueTorsoGeo = new THREE.CylinderGeometry(1.28, 1.48, 3.2, 8);
  statueTorsoGeo.translate(0, 4.35, 0);
  const statuePauldronGeo = new THREE.BoxGeometry(3.4, 0.95, 1.75);
  statuePauldronGeo.translate(0, 5.55, 0);
  const statueHeadGeo = new THREE.CylinderGeometry(0.76, 0.82, 1.25, 8);
  statueHeadGeo.translate(0, 6.55, 0);
  const statueHelmConeGeo = new THREE.ConeGeometry(0.95, 1.45, 8);
  statueHelmConeGeo.translate(0, 7.65, 0);
  const statueHelmCrestGeo = new THREE.BoxGeometry(0.28, 1.35, 1.65);
  statueHelmCrestGeo.translate(0, 7.85, 0);
  const statueBeardMainGeo = new THREE.ConeGeometry(0.92, 2.85, 6);
  statueBeardMainGeo.rotateX(Math.PI);
  const statueArmGeo = new THREE.CylinderGeometry(0.42, 0.38, 2.35, 8);
  const statueAxeShaftGeo = new THREE.CylinderGeometry(0.12, 0.14, 5.6, 8);
  statueAxeShaftGeo.translate(0, 2.8, 0);
  const statueAxeBladeGeo = new THREE.ConeGeometry(1.15, 1.45, 4);
  statueAxeBladeGeo.scale(0.24, 1.0, 1.15);
  disposableGeometries.push(
    statuePedestalBaseGeo,
    statuePedestalCapGeo,
    statueTorsoGeo,
    statuePauldronGeo,
    statueHeadGeo,
    statueHelmConeGeo,
    statueHelmCrestGeo,
    statueBeardMainGeo,
    statueArmGeo,
    statueAxeShaftGeo,
    statueAxeBladeGeo
  );

  for (let s = 0; s < DWARVEN_GUARDIAN_STATUES.length; s++) {
    const st = DWARVEN_GUARDIAN_STATUES[s];
    const stGroup = new THREE.Group();
    stGroup.position.set(st.x, st.baseY, st.z);
    stGroup.rotation.y = st.yaw;

    const pedBase = new THREE.Mesh(statuePedestalBaseGeo, dwarvenGraniteMat);
    const pedCap = new THREE.Mesh(statuePedestalCapGeo, dwarvenBronzeMat);
    const torso = new THREE.Mesh(statueTorsoGeo, dwarvenGraniteMat);
    const pauldron = new THREE.Mesh(statuePauldronGeo, dwarvenBronzeMat);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.38, 8), mineGoldOreMat);
    belt.position.y = 3.65;
    const head = new THREE.Mesh(statueHeadGeo, dwarvenGraniteMat);
    head.position.z = 0.35;
    const helmCone = new THREE.Mesh(statueHelmConeGeo, dwarvenBronzeMat);
    helmCone.position.z = 0.35;
    const helmCrest = new THREE.Mesh(statueHelmCrestGeo, mineGoldOreMat);
    helmCrest.position.z = 0.35;

    const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.58, 0.25), dwarvenBronzeMat);
    noseGuard.position.set(0, 6.62, 1.15);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.12), mineGoldOreMat);
    eyeL.position.set(-0.32, 6.68, 1.10);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.12), mineGoldOreMat);
    eyeR.position.set(0.32, 6.68, 1.10);

    const beardCenter = new THREE.Mesh(statueBeardMainGeo, dwarvenGraniteMat);
    beardCenter.position.set(0, 4.95, 1.32);
    const beardBraidL = new THREE.Mesh(statueBeardMainGeo, dwarvenGraniteMat);
    beardBraidL.scale.set(0.55, 0.88, 0.55);
    beardBraidL.position.set(-0.55, 5.05, 1.28);
    const beardBraidR = new THREE.Mesh(statueBeardMainGeo, dwarvenGraniteMat);
    beardBraidR.scale.set(0.55, 0.88, 0.55);
    beardBraidR.position.set(0.55, 5.05, 1.28);
    const beardRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.09, 6, 10), mineGoldOreMat);
    beardRing1.rotation.x = Math.PI / 2;
    beardRing1.position.set(0, 4.65, 1.40);
    const beardRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 6, 10), mineGoldOreMat);
    beardRing2.rotation.x = Math.PI / 2;
    beardRing2.position.set(0, 3.92, 1.40);

    for (const sideX of [-1, 1]) {
      const arm = new THREE.Mesh(statueArmGeo, dwarvenGraniteMat);
      arm.position.set(sideX * 1.32, 4.68, 1.05);
      arm.rotation.z = sideX * 0.42;
      arm.rotation.x = -0.58;
      stGroup.add(arm);
    }

    const axeShaft = new THREE.Mesh(statueAxeShaftGeo, dwarvenBronzeMat);
    axeShaft.position.set(0, 2.65, 1.78);
    const axeBladeL = new THREE.Mesh(statueAxeBladeGeo, dwarvenGraniteMat);
    axeBladeL.scale.set(0.30, 1.25, 1.35);
    axeBladeL.position.set(-0.88, 4.65, 1.78);
    axeBladeL.rotation.z = Math.PI / 2;
    const axeBladeR = new THREE.Mesh(statueAxeBladeGeo, dwarvenGraniteMat);
    axeBladeR.scale.set(0.30, 1.25, 1.35);
    axeBladeR.position.set(0.88, 4.65, 1.78);
    axeBladeR.rotation.z = -Math.PI / 2;

    stGroup.add(
      pedBase,
      pedCap,
      torso,
      pauldron,
      belt,
      head,
      helmCone,
      helmCrest,
      noseGuard,
      eyeL,
      eyeR,
      beardCenter,
      beardBraidL,
      beardBraidR,
      beardRing1,
      beardRing2,
      axeShaft,
      axeBladeL,
      axeBladeR,
      createLanternAssembly(0, 3.2, 2.25, s === 0)
    );
    scene.add(stGroup);
    distanceCulledObjects.push({ obj: stGroup, cx: st.x, cz: st.z, radius: 28 });
  }

  // 2) 4 ENTERABLE DWARVEN STONE HOUSES ALONG THE DWARVEN KING'S ROAD (z = 368..392)
  const dhWallFBGeo = new THREE.BoxGeometry(0.55, 4.4, 8.8);
  dhWallFBGeo.translate(0, 2.2, 0);
  const dhWallSideGeo = new THREE.BoxGeometry(10.4, 4.4, 0.55);
  dhWallSideGeo.translate(0, 2.2, 0);
  const dhFrontWingGeo = new THREE.BoxGeometry(0.55, 4.4, 3.25);
  dhFrontWingGeo.translate(0, 2.2, 0);
  const dhDoorHeaderGeo = new THREE.BoxGeometry(0.62, 1.45, 2.4);
  dhDoorHeaderGeo.translate(0, 3.68, 0);
  const dhButtressGeo = new THREE.BoxGeometry(0.95, 4.6, 0.95);
  dhButtressGeo.translate(0, 2.3, 0);
  const dhRoofLowerGeo = new THREE.BoxGeometry(11.6, 0.65, 9.8);
  dhRoofLowerGeo.translate(0, 4.65, 0);
  const dhRoofMidGeo = new THREE.BoxGeometry(9.4, 0.65, 7.8);
  dhRoofMidGeo.translate(0, 5.25, 0);
  const dhRoofTopGeo = new THREE.BoxGeometry(7.0, 0.55, 5.6);
  dhRoofTopGeo.translate(0, 5.8, 0);
  const dhChimneyGeo = new THREE.CylinderGeometry(0.55, 0.72, 2.6, 6);
  dhChimneyGeo.translate(0, 6.4, 0);
  const dhFloorGeo = new THREE.BoxGeometry(10.6, 0.22, 8.8);
  dhFloorGeo.translate(0, 0.09, 0);
  const dhDoorLeafGeo = new THREE.BoxGeometry(0.14, 2.85, 1.12);
  disposableGeometries.push(
    dhWallFBGeo,
    dhWallSideGeo,
    dhFrontWingGeo,
    dhDoorHeaderGeo,
    dhButtressGeo,
    dhRoofLowerGeo,
    dhRoofMidGeo,
    dhRoofTopGeo,
    dhChimneyGeo,
    dhFloorGeo,
    dhDoorLeafGeo
  );

  for (let hIdx = 0; hIdx < DWARVEN_STONE_HOUSES.length; hIdx++) {
    const dh = DWARVEN_STONE_HOUSES[hIdx];
    const dhGroup = new THREE.Group();
    dhGroup.position.set(dh.x, dh.terraceY, dh.z);

    const floorSlab = new THREE.Mesh(dhFloorGeo, dwarvenGraniteMat);
    const stepSlab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 3.2), dwarvenGraniteMat);
    stepSlab.position.set(dh.dirX * (dh.halfW + 0.55), 0.08, 0);
    dhGroup.add(floorSlab, stepSlab);

    const backWall = new THREE.Mesh(dhWallFBGeo, dwarvenGraniteMat);
    backWall.position.set(-dh.dirX * dh.halfW, 0, 0);
    const northWall = new THREE.Mesh(dhWallSideGeo, dwarvenGraniteMat);
    northWall.position.set(0, 0, -dh.halfD);
    const southWall = new THREE.Mesh(dhWallSideGeo, dwarvenGraniteMat);
    southWall.position.set(0, 0, dh.halfD);
    const frontNorthWing = new THREE.Mesh(dhFrontWingGeo, dwarvenGraniteMat);
    frontNorthWing.position.set(dh.dirX * dh.halfW, 0, -2.78);
    const frontSouthWing = new THREE.Mesh(dhFrontWingGeo, dwarvenGraniteMat);
    frontSouthWing.position.set(dh.dirX * dh.halfW, 0, 2.78);
    const doorHeader = new THREE.Mesh(dhDoorHeaderGeo, dwarvenBronzeMat);
    doorHeader.position.set(dh.dirX * dh.halfW, 0, 0);
    dhGroup.add(backWall, northWall, southWall, frontNorthWing, frontSouthWing, doorHeader);

    for (const bx of [-dh.halfW, dh.halfW]) {
      for (const bz of [-dh.halfD, dh.halfD]) {
        const buttress = new THREE.Mesh(dhButtressGeo, dwarvenGraniteMat);
        buttress.position.set(bx, 0, bz);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.28, 1.08), dwarvenBronzeMat);
        cap.position.set(bx, 4.65, bz);
        dhGroup.add(buttress, cap);
      }
    }

    const roof1 = new THREE.Mesh(dhRoofLowerGeo, dwarvenGraniteMat);
    const roof2 = new THREE.Mesh(dhRoofMidGeo, dwarvenGraniteMat);
    const roof3 = new THREE.Mesh(dhRoofTopGeo, dwarvenGraniteMat);
    const ridgeCrest = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.36, 0.36), dwarvenBronzeMat);
    ridgeCrest.position.set(0, 6.2, 0);
    const chimney = new THREE.Mesh(dhChimneyGeo, dwarvenGraniteMat);
    chimney.position.set(-dh.dirX * 2.8, 0, -1.8);
    dhGroup.add(roof1, roof2, roof3, ridgeCrest, chimney);

    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(dh.dirX * dh.halfW, 0.18, -1.12);
    const leftDoorMesh = new THREE.Mesh(dhDoorLeafGeo, barkMat);
    leftDoorMesh.position.set(0, 1.42, 0.56);
    leftDoorPivot.add(leftDoorMesh);

    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(dh.dirX * dh.halfW, 0.18, 1.12);
    const rightDoorMesh = new THREE.Mesh(dhDoorLeafGeo, barkMat);
    rightDoorMesh.position.set(0, 1.42, -0.56);
    rightDoorPivot.add(rightDoorMesh);
    dhGroup.add(leftDoorPivot, rightDoorPivot);

    doorPivotHandles.push({
      id: dh.doorId,
      leftPivot: leftDoorPivot,
      rightPivot: rightDoorPivot,
      currentAngle: 0,
    });

    const hearthRing = new THREE.Mesh(forgeBrazierBaseGeo, dwarvenGraniteMat);
    hearthRing.scale.set(0.85, 0.65, 0.85);
    hearthRing.position.set(-dh.dirX * 2.8, 0.18, -1.8);
    const hearthCoals = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
    hearthCoals.scale.set(0.75, 0.45, 0.75);
    hearthCoals.position.set(-dh.dirX * 2.8, 0.72, -1.8);
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.78, 1.2), timberMat);
    table.position.set(-dh.dirX * 0.8, 0.56, 1.6);
    const outdoorAnvil = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.52), darkIronMat);
    outdoorAnvil.position.set(dh.dirX * (dh.halfW + 1.8), 0.38, 2.8);
    dhGroup.add(
      hearthRing,
      hearthCoals,
      table,
      outdoorAnvil,
      createLanternAssembly(dh.dirX * (dh.halfW + 0.65), 3.1, -1.65, hIdx === 0),
      createLanternAssembly(dh.dirX * (dh.halfW + 0.65), 3.1, 1.65, false)
    );

    scene.add(dhGroup);
    distanceCulledObjects.push({ obj: dhGroup, cx: dh.x, cz: dh.z, radius: 26 });
  }

  // 3) 8 ANIMATED LOTR-STYLE DWARVEN MINERS
  const dwarfSkinMat = new THREE.MeshStandardMaterial({ color: 0xe2b18c, roughness: 0.58 });
  const dwarfBeardMats = [
    new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x3f230f, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 }),
  ];
  const dwarfTunicMats = [
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.68 }),
  ];
  disposableMaterials.push(dwarfSkinMat, ...dwarfBeardMats, ...dwarfTunicMats);

  const dwTorsoGeo = new THREE.CylinderGeometry(0.28, 0.31, 0.58, 9);
  dwTorsoGeo.translate(0, 0.29, 0);
  const dwShoulderGeo = new THREE.BoxGeometry(0.72, 0.18, 0.38);
  dwShoulderGeo.translate(0, 0.52, 0);
  const dwHeadGeo = new THREE.SphereGeometry(0.18, 12, 12);
  dwHeadGeo.translate(0, 0.74, 0);
  const dwHelmGeo = new THREE.ConeGeometry(0.21, 0.30, 8);
  dwHelmGeo.translate(0, 0.90, 0);
  const dwHelmRimGeo = new THREE.CylinderGeometry(0.215, 0.215, 0.06, 8);
  dwHelmRimGeo.translate(0, 0.77, 0);
  const dwBeardMainGeo = new THREE.ConeGeometry(0.19, 0.52, 6);
  dwBeardMainGeo.rotateX(Math.PI);
  const dwBeardBraidGeo = new THREE.CylinderGeometry(0.045, 0.025, 0.44, 6);
  const dwLegGeo = new THREE.CylinderGeometry(0.11, 0.095, 0.42, 8);
  dwLegGeo.translate(0, -0.21, 0);
  const dwBootGeo = new THREE.BoxGeometry(0.16, 0.14, 0.26);
  dwBootGeo.translate(0, -0.40, -0.04);
  const dwArmGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.42, 8);
  dwArmGeo.translate(0, -0.18, 0);
  const dwPickHandleGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.78, 7);
  const dwPickHeadGeo = new THREE.ConeGeometry(0.065, 0.52, 4);
  dwPickHeadGeo.rotateZ(Math.PI / 2);
  const dwLanternBodyGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.16, 6);
  disposableGeometries.push(
    dwTorsoGeo,
    dwShoulderGeo,
    dwHeadGeo,
    dwHelmGeo,
    dwHelmRimGeo,
    dwBeardMainGeo,
    dwBeardBraidGeo,
    dwLegGeo,
    dwBootGeo,
    dwArmGeo,
    dwPickHandleGeo,
    dwPickHeadGeo,
    dwLanternBodyGeo
  );

  const dwarvenMiners: DwarvenMinerRig[] = [];

  for (let d = 0; d < DWARVEN_MINERS_COUNT; d++) {
    const dwRoot = new THREE.Group();
    const torsoPivot = new THREE.Group();
    torsoPivot.position.set(0, 0.44, 0);

    const tunicMat = dwarfTunicMats[d % dwarfTunicMats.length];
    const beardMat = dwarfBeardMats[d % dwarfBeardMats.length];

    const torsoMesh = new THREE.Mesh(dwTorsoGeo, tunicMat);
    const shoulderMesh = new THREE.Mesh(dwShoulderGeo, dwarvenScaleArmorMat);
    const beltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.09, 9), darkIronMat);
    beltMesh.position.y = 0.10;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.05), mineGoldOreMat);
    buckle.position.set(0, 0.10, -0.30);
    const headMesh = new THREE.Mesh(dwHeadGeo, dwarfSkinMat);
    headMesh.position.z = -0.07;
    const helmCone = new THREE.Mesh(dwHelmGeo, dwarvenScaleArmorMat);
    helmCone.position.z = -0.07;
    const helmRim = new THREE.Mesh(dwHelmRimGeo, dwarvenBronzeMat);
    helmRim.position.z = -0.07;

    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), dwarfSkinMat);
    noseMesh.position.set(0, 0.72, -0.25);

    const beardCenter = new THREE.Mesh(dwBeardMainGeo, beardMat);
    beardCenter.position.set(0, 0.44, -0.27);
    const braidL = new THREE.Mesh(dwBeardBraidGeo, beardMat);
    braidL.position.set(-0.11, 0.43, -0.28);
    braidL.rotation.z = -0.16;
    const braidR = new THREE.Mesh(dwBeardBraidGeo, beardMat);
    braidR.position.set(0.11, 0.43, -0.28);
    braidR.rotation.z = 0.16;
    const beardRing = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.016, 6, 10), mineGoldOreMat);
    beardRing.rotation.x = Math.PI / 2;
    beardRing.position.set(0, 0.33, -0.30);

    torsoPivot.add(
      torsoMesh,
      shoulderMesh,
      beltMesh,
      buckle,
      headMesh,
      helmCone,
      helmRim,
      noseMesh,
      beardCenter,
      braidL,
      braidR,
      beardRing
    );

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.34, 0.50, 0);
    const lArmMesh = new THREE.Mesh(dwArmGeo, tunicMat);
    const lanternMesh = new THREE.Mesh(dwLanternBodyGeo, mineGoldOreMat);
    lanternMesh.position.set(0, -0.44, -0.10);
    leftArm.add(lArmMesh, lanternMesh);
    torsoPivot.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.34, 0.50, 0);
    const rArmMesh = new THREE.Mesh(dwArmGeo, tunicMat);
    const pickGroup = new THREE.Group();
    pickGroup.position.set(0, -0.38, -0.06);
    pickGroup.rotation.x = Math.PI / 2;
    const pickShaft = new THREE.Mesh(dwPickHandleGeo, timberMat);
    const pickHead = new THREE.Mesh(dwPickHeadGeo, dwarvenScaleArmorMat);
    pickHead.position.y = 0.34;
    pickGroup.add(pickShaft, pickHead);
    rightArm.add(rArmMesh, pickGroup);
    torsoPivot.add(rightArm);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.14, 0.44, 0);
    leftLeg.add(
      new THREE.Mesh(dwLegGeo, dwarvenScaleArmorMat),
      new THREE.Mesh(dwBootGeo, darkIronMat)
    );
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.14, 0.44, 0);
    rightLeg.add(
      new THREE.Mesh(dwLegGeo, dwarvenScaleArmorMat),
      new THREE.Mesh(dwBootGeo, darkIronMat)
    );

    dwRoot.add(torsoPivot, leftLeg, rightLeg);
    scene.add(dwRoot);
    dwarvenMiners.push({
      root: dwRoot,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      torsoPivot,
      lanternGlow: lanternMesh,
    });
  }

  const updateDwarvenMiners = (
    worldHours: number,
    elapsedTime: number,
    playerX: number,
    playerZ: number
  ) => {
    for (let d = 0; d < dwarvenMiners.length; d++) {
      const dm = dwarvenMiners[d];
      const st = computeDwarvenMinerCaravanState(worldHours, d, elapsedTime);
      const vis = isWithinViewDistance(st.x, st.z, playerX, playerZ, 18, VIEW_DISTANCE);
      dm.root.visible = vis;
      if (!vis) continue;

      dm.root.position.set(st.x, st.y, st.z);
      dm.root.rotation.y = st.yaw;
      dm.lanternGlow.visible = st.lanternLit;

      if (st.activity === 'caravan_to_mine' || st.activity === 'caravan_to_home') {
        const stride = Math.sin(st.walkCycle) * 0.52;
        const bob = Math.abs(Math.cos(st.walkCycle)) * 0.04;
        dm.torsoPivot.position.y = 0.44 + bob;
        dm.torsoPivot.rotation.set(0.08, 0, Math.sin(st.walkCycle) * 0.05);
        dm.leftLeg.rotation.x = stride;
        dm.rightLeg.rotation.x = -stride;
        dm.leftArm.rotation.set(-0.45 + stride * 0.25, 0, 0);
        dm.rightArm.rotation.set(-0.35 - stride * 0.45, 0, 0);
      } else if (st.activity === 'mining_work') {
        const strikeWave = Math.sin(st.miningSwing * Math.PI * 2);
        dm.torsoPivot.position.y = 0.44;
        dm.torsoPivot.rotation.set(Math.max(0, strikeWave) * 0.28, 0, 0);
        dm.leftLeg.rotation.x = -0.15;
        dm.rightLeg.rotation.x = 0.18;
        dm.leftArm.rotation.set(-0.35, 0, 0.12);
        dm.rightArm.rotation.set(-1.15 + strikeWave * 0.95, 0, -0.08);
      } else {
        dm.torsoPivot.position.y = 0.44;
        dm.torsoPivot.rotation.set(0, Math.sin(elapsedTime * 1.2 + d) * 0.12, 0);
        dm.leftLeg.rotation.x = 0;
        dm.rightLeg.rotation.x = 0;
        dm.leftArm.rotation.set(-0.15, 0, 0.08);
        dm.rightArm.rotation.set(-0.20, 0, -0.08);
      }
    }
  };

  return {
    dwarvenMiners,
    updateDwarvenMiners,
  };
}
// #endregion
