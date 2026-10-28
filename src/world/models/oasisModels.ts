// ============================================================================
// MODULE: World / Models / Oasis Models
// DESIGN: Grand southwest terraced desert oasis, observatory, and lagoon (SRP)
// SUMMARY: Constructs the southwest oasis courtyard, rotating celestial astrolabe,
//          alchemist pavilion, swimmable turquoise lagoon, and desert date palms.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  SOUTHWEST_OASIS_POS,
  groundHeightAt,
} from '../terrainMath';
import { attachWindSwayShader } from '../builders/shaderAndMaterialBuilders';
import { attachAnimatedWaterWaveShader } from './terrainAndWaterModel';
import { createArchitecturalSharedAssets } from './architecturalHelpers';
import type { WorldModelBuildContext } from './types';
// #endregion

// ======================== OASIS MODEL INTERFACE ======================== \\
// #region Oasis Model Interface
export interface OasisModelHandles {
  readonly oasisGroup: THREE.Group;
  readonly updateOasis: (elapsedTime: number) => void;
}
// #endregion

// ======================== BUILD OASIS MODELS ======================== \\
// #region Build Oasis Models
/**
 * Constructs the grand southwest desert oasis complex, celestial observatory, and palm grove.
 */
export function buildOasisModels(ctx: WorldModelBuildContext): OasisModelHandles {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    swayMaterials,
    distanceCulledObjects,
  } = ctx;

  const archAssets = createArchitecturalSharedAssets(ctx);
  const {
    imperialGoldMat,
    imperialCrimsonMat,
    mineGoldOreMat,
    createInteractiveDoubleDoor,
    createRedChineseLantern,
  } = archAssets;

  const swOasisGroup = new THREE.Group();
  const swCx = SOUTHWEST_OASIS_POS.x;
  const swCz = SOUTHWEST_OASIS_POS.z;
  const swY = SOUTHWEST_OASIS_POS.terraceY;

  const oasisSandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xe6ccb2,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.06,
    roughness: 0.74,
  });
  const oasisLapisMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.28,
    metalness: 0.35,
  });
  const oasisTurquoiseWaterMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.28,
    roughness: 0.06,
    metalness: 0.14,
    clearcoat: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: 0.86,
  });
  attachAnimatedWaterWaveShader(oasisTurquoiseWaterMat, 0.042, 0.085, ctx.animatedWaterMaterials);

  const palmFrondMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  attachWindSwayShader(palmFrondMat, 0.14, 1.8, swayMaterials);

  const furnitureWoodMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    roughness: 0.72,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.05,
    roughness: 0.76,
  });
  const imperialWoodFloorMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    roughness: 0.68,
  });
  const mineSapphireCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.12,
    metalness: 0.1,
  });
  const mineEmeraldCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.75,
    roughness: 0.15,
  });
  const mineAmethystCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.75,
    roughness: 0.15,
  });
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.barkAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.07,
    roughness: 0.88,
  });

  disposableMaterials.push(
    oasisSandstoneMat,
    oasisLapisMat,
    oasisTurquoiseWaterMat,
    palmFrondMat,
    furnitureWoodMat,
    timberMat,
    imperialWoodFloorMat,
    mineSapphireCrystalMat,
    mineEmeraldCrystalMat,
    mineAmethystCrystalMat,
    barkMat
  );

  // 1) Oasis Courtyard Sandstone & Lapis-Lazuli Plaza Floor & Central Star Fountain
  const oasisPlazaDiscGeo = new THREE.CylinderGeometry(34.0, 36.0, 0.34, 32);
  const oasisInnerMosaicGeo = new THREE.CylinderGeometry(14.5, 14.5, 0.38, 16);
  const starFntWallSegGeo = new THREE.BoxGeometry(1.65, 0.96, 0.44);
  const starFntWaterGeo = new THREE.CylinderGeometry(3.15, 3.15, 0.12, 16);
  const obeliskShaftGeo = new THREE.CylinderGeometry(0.45, 0.88, 9.6, 4);
  obeliskShaftGeo.translate(0, 4.8, 0);
  const obeliskTipGeo = new THREE.ConeGeometry(0.64, 1.6, 4);
  obeliskTipGeo.translate(0, 10.4, 0);

  const fountainPillarGeo = new THREE.CylinderGeometry(0.45, 0.65, 1.8, 8);
  const fountainUpperBowlGeo = new THREE.CylinderGeometry(1.6, 1.0, 0.45, 12);
  const mineCrystalClusterGeo = new THREE.OctahedronGeometry(0.46, 0);

  disposableGeometries.push(
    oasisPlazaDiscGeo,
    oasisInnerMosaicGeo,
    starFntWallSegGeo,
    starFntWaterGeo,
    obeliskShaftGeo,
    obeliskTipGeo,
    fountainPillarGeo,
    fountainUpperBowlGeo,
    mineCrystalClusterGeo
  );

  const oasisPlazaMesh = new THREE.Mesh(oasisPlazaDiscGeo, oasisSandstoneMat);
  oasisPlazaMesh.position.set(swCx, swY - 0.15, swCz - 15.0);
  const oasisMosaicMesh = new THREE.Mesh(oasisInnerMosaicGeo, oasisLapisMat);
  oasisMosaicMesh.position.set(swCx, swY - 0.14, swCz);
  swOasisGroup.add(oasisPlazaMesh, oasisMosaicMesh);

  const swFntGroup = new THREE.Group();
  swFntGroup.position.set(SOUTHWEST_OASIS_POS.fountainX, swY, SOUTHWEST_OASIS_POS.fountainZ);
  for (let w = 0; w < 12; w++) {
    const ang = (w / 12) * Math.PI * 2;
    const seg = new THREE.Mesh(starFntWallSegGeo, oasisSandstoneMat);
    seg.position.set(Math.sin(ang) * 3.35, 0.48, Math.cos(ang) * 3.35);
    seg.rotation.y = ang;
    swFntGroup.add(seg);
  }
  const swFntWater = new THREE.Mesh(starFntWaterGeo, oasisTurquoiseWaterMat);
  swFntWater.position.y = 0.68;
  const swFntPillar = new THREE.Mesh(fountainPillarGeo, oasisLapisMat);
  swFntPillar.position.y = 1.25;
  const swFntBowl = new THREE.Mesh(fountainUpperBowlGeo, imperialGoldMat);
  swFntBowl.position.y = 2.15;
  const swFntSunOrb = new THREE.Mesh(mineCrystalClusterGeo, mineGoldOreMat);
  swFntSunOrb.scale.setScalar(1.45);
  swFntSunOrb.position.y = 3.15;
  swFntGroup.add(swFntWater, swFntPillar, swFntBowl, swFntSunOrb);
  swOasisGroup.add(swFntGroup);

  // 2) CLIMBABLE 24m ANCIENT CELESTIAL OBSERVATORY & GOLDEN ASTROLABE TOWER
  const obsX = SOUTHWEST_OASIS_POS.observatoryX;
  const obsZ = SOUTHWEST_OASIS_POS.observatoryZ;
  const obsBaseY = SOUTHWEST_OASIS_POS.observatoryBaseY;
  const obsTopY = SOUTHWEST_OASIS_POS.observatoryTopDeckY;
  const obsH = obsTopY - obsBaseY;
  const obsTowerGroup = new THREE.Group();
  obsTowerGroup.position.set(obsX, obsBaseY, obsZ);

  const obsWallNGeo = new THREE.BoxGeometry(9.6, obsH, 0.58);
  const obsWallSideGeo = new THREE.BoxGeometry(0.58, obsH, 9.6);
  const obsWallDoorFlankGeo = new THREE.BoxGeometry(3.55, obsH, 0.58);
  const obsWallDoorLintelGeo = new THREE.BoxGeometry(2.5, obsH - 3.2, 0.58);
  const obsOuterTrimZGeo = new THREE.BoxGeometry(10.1, 0.85, 0.16);
  const obsOuterTrimXGeo = new THREE.BoxGeometry(0.16, 0.85, 10.1);
  const obsDeckSouthGeo = new THREE.BoxGeometry(10.4, 0.34, 7.2);
  const obsDeckNorthSideGeo = new THREE.BoxGeometry(4.2, 0.34, 3.2);
  const astrolabeRing1Geo = new THREE.TorusGeometry(2.85, 0.14, 10, 28);
  const astrolabeRing2Geo = new THREE.TorusGeometry(2.25, 0.12, 10, 24);
  const astrolabeRing3Geo = new THREE.TorusGeometry(1.65, 0.10, 8, 20);
  const telescopeTubeGeo = new THREE.CylinderGeometry(0.18, 0.28, 3.2, 10);
  telescopeTubeGeo.rotateX(Math.PI * 0.32);

  const tableTopGeo = new THREE.BoxGeometry(2.1, 0.1, 1.25);
  const whRackShelfGeo = new THREE.BoxGeometry(2.4, 3.2, 0.65);
  const lhLadderRailGeo = new THREE.BoxGeometry(0.1, obsH, 0.1);
  const hwLadderRungGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.62, 6);
  hwLadderRungGeo.rotateZ(Math.PI / 2);
  const lhTopRailZGeo = new THREE.BoxGeometry(9.0, 0.96, 0.24);
  const lhTopRailXGeo = new THREE.BoxGeometry(0.24, 0.96, 9.0);
  const binnacleStandGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.95, 8);

  disposableGeometries.push(
    obsWallNGeo,
    obsWallSideGeo,
    obsWallDoorFlankGeo,
    obsWallDoorLintelGeo,
    obsOuterTrimZGeo,
    obsOuterTrimXGeo,
    obsDeckSouthGeo,
    obsDeckNorthSideGeo,
    astrolabeRing1Geo,
    astrolabeRing2Geo,
    astrolabeRing3Geo,
    telescopeTubeGeo,
    tableTopGeo,
    whRackShelfGeo,
    lhLadderRailGeo,
    hwLadderRungGeo,
    lhTopRailZGeo,
    lhTopRailXGeo,
    binnacleStandGeo
  );

  const obsWallN = new THREE.Mesh(obsWallNGeo, oasisSandstoneMat);
  obsWallN.position.set(0, obsH * 0.5, -4.85);
  const obsWallW = new THREE.Mesh(obsWallSideGeo, oasisSandstoneMat);
  obsWallW.position.set(-4.85, obsH * 0.5, 0);
  const obsWallE = new THREE.Mesh(obsWallSideGeo, oasisSandstoneMat);
  obsWallE.position.set(4.85, obsH * 0.5, 0);
  const obsFlankL = new THREE.Mesh(obsWallDoorFlankGeo, oasisSandstoneMat);
  obsFlankL.position.set(-3.02, obsH * 0.5, 4.85);
  const obsFlankR = new THREE.Mesh(obsWallDoorFlankGeo, oasisSandstoneMat);
  obsFlankR.position.set(3.02, obsH * 0.5, 4.85);
  const obsLintel = new THREE.Mesh(obsWallDoorLintelGeo, oasisLapisMat);
  obsLintel.position.set(0, (3.2 + obsH) * 0.5, 4.85);

  for (const [sy, bandMat] of [
    [5.0, oasisLapisMat],
    [10.2, imperialGoldMat],
    [15.2, oasisLapisMat],
  ] as const) {
    for (const sz of [-5.18, 5.18]) {
      const bz = new THREE.Mesh(obsOuterTrimZGeo, bandMat);
      bz.position.set(0, sy, sz);
      obsTowerGroup.add(bz);
    }
    for (const sx of [-5.18, 5.18]) {
      const bx = new THREE.Mesh(obsOuterTrimXGeo, bandMat);
      bx.position.set(sx, sy, 0);
      obsTowerGroup.add(bx);
    }
  }

  const obsDeckS = new THREE.Mesh(obsDeckSouthGeo, oasisSandstoneMat);
  obsDeckS.position.set(0, obsH - 0.17, 1.6);
  const obsDeckNW = new THREE.Mesh(obsDeckNorthSideGeo, oasisSandstoneMat);
  obsDeckNW.position.set(-3.1, obsH - 0.17, -3.6);
  const obsDeckNE = new THREE.Mesh(obsDeckNorthSideGeo, oasisSandstoneMat);
  obsDeckNE.position.set(3.1, obsH - 0.17, -3.6);

  obsTowerGroup.add(
    obsWallN,
    obsWallW,
    obsWallE,
    obsFlankL,
    obsFlankR,
    obsLintel,
    obsDeckS,
    obsDeckNW,
    obsDeckNE,
    createInteractiveDoubleDoor(SOUTHWEST_OASIS_POS.observatoryDoorId, 0, 0.08, 4.85, 2.4, 3.2)
  );

  const astroTable = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
  astroTable.scale.set(1.3, 1.0, 1.3);
  astroTable.position.set(0, 0.78, 0.4);
  const starGlobe = new THREE.Mesh(mineCrystalClusterGeo, mineSapphireCrystalMat);
  starGlobe.scale.setScalar(1.15);
  starGlobe.position.set(0, 1.35, 0.4);
  const scrollShelfW = new THREE.Mesh(whRackShelfGeo, furnitureWoodMat);
  scrollShelfW.rotation.y = Math.PI / 2;
  scrollShelfW.position.set(-3.8, 1.8, 0);
  const scrollShelfE = new THREE.Mesh(whRackShelfGeo, furnitureWoodMat);
  scrollShelfE.rotation.y = Math.PI / 2;
  scrollShelfE.position.set(3.8, 1.8, 0);
  obsTowerGroup.add(
    astroTable,
    starGlobe,
    scrollShelfW,
    scrollShelfE,
    createRedChineseLantern(-2.8, 3.8, 1.5),
    createRedChineseLantern(2.8, 3.8, 1.5)
  );

  const obsLadderGroup = new THREE.Group();
  obsLadderGroup.position.set(0, obsH * 0.5, -3.7);
  const obsRailL = new THREE.Mesh(lhLadderRailGeo, oasisLapisMat);
  obsRailL.position.x = -0.35;
  const obsRailR = new THREE.Mesh(lhLadderRailGeo, oasisLapisMat);
  obsRailR.position.x = 0.35;
  obsLadderGroup.add(obsRailL, obsRailR);
  for (let r = 0; r <= 38; r++) {
    const rung = new THREE.Mesh(hwLadderRungGeo, imperialGoldMat);
    rung.position.y = -obsH * 0.5 + 0.35 + (r / 38) * (obsH - 0.4);
    obsLadderGroup.add(rung);
  }
  obsTowerGroup.add(obsLadderGroup);

  for (const sz of [-5.0, 5.0]) {
    const rZ = new THREE.Mesh(lhTopRailZGeo, imperialGoldMat);
    rZ.scale.x = 1.12;
    rZ.position.set(0, obsH + 0.48, sz);
    obsTowerGroup.add(rZ);
  }
  for (const sx of [-5.0, 5.0]) {
    const rX = new THREE.Mesh(lhTopRailXGeo, imperialGoldMat);
    rX.scale.z = 1.12;
    rX.position.set(sx, obsH + 0.48, 0);
    obsTowerGroup.add(rX);
  }

  const telescopeMount = new THREE.Mesh(binnacleStandGeo, furnitureWoodMat);
  telescopeMount.position.set(3.2, obsH + 0.52, 3.2);
  const telescopeTube = new THREE.Mesh(telescopeTubeGeo, imperialGoldMat);
  telescopeTube.position.set(3.2, obsH + 1.45, 3.4);
  obsTowerGroup.add(telescopeMount, telescopeTube);

  const swAstrolabeGroup = new THREE.Group();
  swAstrolabeGroup.position.set(0, obsH + 3.6, 0.8);
  const astroOuterRing = new THREE.Mesh(astrolabeRing1Geo, imperialGoldMat);
  const astroMidRing = new THREE.Mesh(astrolabeRing2Geo, oasisLapisMat);
  astroMidRing.rotation.x = Math.PI / 3;
  const astroInnerRing = new THREE.Mesh(astrolabeRing3Geo, imperialGoldMat);
  astroInnerRing.rotation.y = Math.PI / 4;
  const astroCoreSun = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 14), mineGoldOreMat);
  swAstrolabeGroup.add(astroOuterRing, astroMidRing, astroInnerRing, astroCoreSun);
  obsTowerGroup.add(swAstrolabeGroup);
  swOasisGroup.add(obsTowerGroup);

  // 3) ENTERABLE OASIS ALCHEMIST & SILK WEAVER'S PAVILION
  const pavGroup = new THREE.Group();
  pavGroup.position.set(
    SOUTHWEST_OASIS_POS.pavilionX,
    SOUTHWEST_OASIS_POS.pavilionFloorY,
    SOUTHWEST_OASIS_POS.pavilionZ
  );
  const pavFloorGeo = new THREE.BoxGeometry(10.8, 0.32, 13.2);
  const pavWestWallGeo = new THREE.BoxGeometry(0.45, 5.2, 12.8);
  const pavSideWallGeo = new THREE.BoxGeometry(10.4, 5.2, 0.45);
  const pavEastFlankGeo = new THREE.BoxGeometry(0.45, 5.2, 5.15);
  const pavEastLintelGeo = new THREE.BoxGeometry(0.48, 2.0, 2.5);
  const pavDomeGeo = new THREE.SphereGeometry(4.6, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  disposableGeometries.push(
    pavFloorGeo,
    pavWestWallGeo,
    pavSideWallGeo,
    pavEastFlankGeo,
    pavEastLintelGeo,
    pavDomeGeo
  );

  const pavFloor = new THREE.Mesh(pavFloorGeo, oasisSandstoneMat);
  pavFloor.position.y = -0.16;
  const pavWestW = new THREE.Mesh(pavWestWallGeo, oasisSandstoneMat);
  pavWestW.position.set(-5.2, 2.6, 0);
  const pavNorthW = new THREE.Mesh(pavSideWallGeo, oasisSandstoneMat);
  pavNorthW.position.set(0, 2.6, -6.4);
  const pavSouthW = new THREE.Mesh(pavSideWallGeo, oasisSandstoneMat);
  pavSouthW.position.set(0, 2.6, 6.4);
  const pavEastN = new THREE.Mesh(pavEastFlankGeo, oasisSandstoneMat);
  pavEastN.position.set(5.2, 2.6, -3.82);
  const pavEastS = new THREE.Mesh(pavEastFlankGeo, oasisSandstoneMat);
  pavEastS.position.set(5.2, 2.6, 3.82);
  const pavLintel = new THREE.Mesh(pavEastLintelGeo, oasisLapisMat);
  pavLintel.position.set(5.2, 4.2, 0);
  const pavRoofSlab = new THREE.Mesh(pavFloorGeo, oasisLapisMat);
  pavRoofSlab.position.y = 5.3;
  const pavGoldenDome = new THREE.Mesh(pavDomeGeo, imperialGoldMat);
  pavGoldenDome.position.y = 5.2;

  const alchDoor = createInteractiveDoubleDoor(
    SOUTHWEST_OASIS_POS.pavilionDoorId,
    0,
    0,
    0,
    2.4,
    3.2
  );
  alchDoor.position.set(5.2, 0, 0);
  alchDoor.rotation.y = Math.PI / 2;
  for (const ch of alchDoor.children) {
    ch.position.z = 0;
  }

  const alchTable = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
  alchTable.scale.set(1.1, 1.0, 1.8);
  alchTable.position.set(-2.2, 0.78, 0);
  const potion1 = new THREE.Mesh(mineCrystalClusterGeo, mineEmeraldCrystalMat);
  potion1.scale.setScalar(0.65);
  potion1.position.set(-2.2, 1.15, -1.1);
  const potion2 = new THREE.Mesh(mineCrystalClusterGeo, mineAmethystCrystalMat);
  potion2.scale.setScalar(0.72);
  potion2.position.set(-2.2, 1.18, 0);
  const potion3 = new THREE.Mesh(mineCrystalClusterGeo, mineSapphireCrystalMat);
  potion3.scale.setScalar(0.65);
  potion3.position.set(-2.2, 1.15, 1.1);
  const silkRug = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.04, 7.8), imperialCrimsonMat);
  silkRug.position.set(0.4, 0.03, 0);

  pavGroup.add(
    pavFloor,
    pavWestW,
    pavNorthW,
    pavSouthW,
    pavEastN,
    pavEastS,
    pavLintel,
    pavRoofSlab,
    pavGoldenDome,
    alchDoor,
    alchTable,
    potion1,
    potion2,
    potion3,
    silkRug,
    createRedChineseLantern(0, 4.2, -2.8),
    createRedChineseLantern(0, 4.2, 2.8)
  );
  swOasisGroup.add(pavGroup);

  // 4) SWIMMABLE TURQUOISE OASIS LAGOON, WALKABLE ARCHED CEDAR BRIDGE & OVER-WATER LOTUS GAZEBO
  const oasisLagoonGeo = new THREE.PlaneGeometry(2.0, 2.0, 28, 28);
  oasisLagoonGeo.rotateX(-Math.PI / 2);
  const lagPosAttr = oasisLagoonGeo.attributes.position;
  for (let i = 0; i < lagPosAttr.count; i++) {
    const u = lagPosAttr.getX(i);
    const v = lagPosAttr.getZ(i);
    const ex = u * Math.sqrt(Math.max(0, 1.0 - (v * v) * 0.5)) * SOUTHWEST_OASIS_POS.lagoonRadiusX;
    const ez = v * Math.sqrt(Math.max(0, 1.0 - (u * u) * 0.5)) * SOUTHWEST_OASIS_POS.lagoonRadiusZ;
    lagPosAttr.setXYZ(i, ex, 0, ez);
  }
  oasisLagoonGeo.computeVertexNormals();
  const oasisBridgeDeckGeo = new THREE.BoxGeometry(4.4, 0.28, 27.0);
  const oasisGazeboFloorGeo = new THREE.BoxGeometry(8.8, 0.32, 8.8);
  const oasisGazeboDomeGeo = new THREE.ConeGeometry(6.4, 3.6, 8);
  const amphColGeo = new THREE.CylinderGeometry(0.36, 0.42, 5.6, 12);
  amphColGeo.translate(0, 2.8, 0);
  const amphArchBeamGeo = new THREE.BoxGeometry(0.48, 0.45, 5.8);

  disposableGeometries.push(
    oasisLagoonGeo,
    oasisBridgeDeckGeo,
    oasisGazeboFloorGeo,
    oasisGazeboDomeGeo,
    amphColGeo,
    amphArchBeamGeo
  );

  const oasisLagoonWater = new THREE.Mesh(oasisLagoonGeo, oasisTurquoiseWaterMat);
  oasisLagoonWater.position.set(
    SOUTHWEST_OASIS_POS.lagoonX,
    SOUTHWEST_OASIS_POS.lagoonWaterY,
    SOUTHWEST_OASIS_POS.lagoonZ
  );
  const oasisBridgeDeck = new THREE.Mesh(oasisBridgeDeckGeo, timberMat);
  oasisBridgeDeck.position.set(
    SOUTHWEST_OASIS_POS.gazeboX,
    SOUTHWEST_OASIS_POS.gazeboDeckY - 0.14,
    SOUTHWEST_OASIS_POS.lagoonZ
  );
  const oasisGazeboFloor = new THREE.Mesh(oasisGazeboFloorGeo, imperialWoodFloorMat);
  oasisGazeboFloor.position.set(
    SOUTHWEST_OASIS_POS.gazeboX,
    SOUTHWEST_OASIS_POS.gazeboDeckY - 0.12,
    SOUTHWEST_OASIS_POS.gazeboZ
  );
  const oasisGazeboRoof = new THREE.Mesh(oasisGazeboDomeGeo, imperialGoldMat);
  oasisGazeboRoof.position.set(
    SOUTHWEST_OASIS_POS.gazeboX,
    SOUTHWEST_OASIS_POS.gazeboDeckY + 4.8,
    SOUTHWEST_OASIS_POS.gazeboZ
  );
  swOasisGroup.add(oasisLagoonWater, oasisBridgeDeck, oasisGazeboFloor, oasisGazeboRoof);

  for (const gxOff of [-3.8, 3.8]) {
    for (const gzOff of [-3.8, 3.8]) {
      const gCol = new THREE.Mesh(amphColGeo, oasisSandstoneMat);
      gCol.scale.set(0.85, 0.62, 0.85);
      gCol.position.set(
        SOUTHWEST_OASIS_POS.gazeboX + gxOff,
        SOUTHWEST_OASIS_POS.gazeboDeckY,
        SOUTHWEST_OASIS_POS.gazeboZ + gzOff
      );
      swOasisGroup.add(gCol);
    }
  }

  // 5) ANCIENT SUNKEN MARBLE COLONNADE & TWIN GOLDEN SUN-OBELISKS
  for (let c = 0; c < 6; c++) {
    const cz = SOUTHWEST_OASIS_POS.z - 14.0 + c * 5.6;
    const col = new THREE.Mesh(amphColGeo, oasisSandstoneMat);
    col.position.set(SOUTHWEST_OASIS_POS.colonnadeX, swY, cz);
    swOasisGroup.add(col);
    if (c < 5) {
      const lintel = new THREE.Mesh(amphArchBeamGeo, oasisSandstoneMat);
      lintel.rotation.y = Math.PI / 2;
      lintel.position.set(SOUTHWEST_OASIS_POS.colonnadeX, swY + 5.6, cz + 2.8);
      swOasisGroup.add(lintel);
    }
  }
  for (const oz of [SOUTHWEST_OASIS_POS.gateZ - 5.5, SOUTHWEST_OASIS_POS.gateZ + 5.5]) {
    const obShaft = new THREE.Mesh(obeliskShaftGeo, oasisSandstoneMat);
    obShaft.position.set(SOUTHWEST_OASIS_POS.gateX, swY, oz);
    const obTip = new THREE.Mesh(obeliskTipGeo, mineGoldOreMat);
    obTip.position.set(SOUTHWEST_OASIS_POS.gateX, swY, oz);
    swOasisGroup.add(obShaft, obTip);
  }

  // 6) 14 LUSH OASIS DATE-PALM TREES
  const palmTrunkGeo = new THREE.CylinderGeometry(0.24, 0.42, 8.8, 8);
  palmTrunkGeo.translate(0, 4.4, 0);
  const palmFrondGeo = new THREE.BoxGeometry(0.65, 0.08, 3.6);
  palmFrondGeo.translate(0, 0, 1.8);
  disposableGeometries.push(palmTrunkGeo, palmFrondGeo);

  const palmOffsets: Array<[number, number, number]> = [
    [-20, 20, 1.05],
    [-18, 30, 0.95],
    [-10, 37, 1.12],
    [10, 37, 1.08],
    [18, 30, 0.98],
    [20, 20, 1.10],
    [-16, -16, 1.04],
    [16, -16, 1.02],
    [-34, 12, 0.96],
    [-34, -12, 1.06],
    [30, 12, 1.0],
    [30, -16, 0.95],
  ];
  for (let p = 0; p < palmOffsets.length; p++) {
    const [dx, dz, pScale] = palmOffsets[p];
    const px = swCx + dx;
    const pz = swCz + dz;
    const pGroup = new THREE.Group();
    pGroup.position.set(px, groundHeightAt(px, pz), pz);
    pGroup.scale.setScalar(pScale);
    const trunk = new THREE.Mesh(palmTrunkGeo, barkMat);
    trunk.rotation.z = Math.sin(p * 1.7) * 0.08;
    pGroup.add(trunk);
    for (let f = 0; f < 7; f++) {
      const fAng = (f / 7) * Math.PI * 2 + p * 0.4;
      const frond = new THREE.Mesh(palmFrondGeo, palmFrondMat);
      frond.position.set(0, 8.6, 0);
      frond.rotation.y = fAng;
      frond.rotation.x = 0.38;
      pGroup.add(frond);
    }
    swOasisGroup.add(pGroup);
  }

  scene.add(swOasisGroup);
  distanceCulledObjects.push({
    obj: swOasisGroup,
    cx: swCx,
    cz: swCz,
    radius: 115,
  });

  const updateOasis = (elapsedTime: number) => {
    if (swOasisGroup.visible) {
      swAstrolabeGroup.rotation.y = elapsedTime * 0.55;
      astroMidRing.rotation.z = elapsedTime * 0.8;
      astroInnerRing.rotation.x = elapsedTime * 1.15;
    }
  };

  return { oasisGroup: swOasisGroup, updateOasis };
}
// #endregion
