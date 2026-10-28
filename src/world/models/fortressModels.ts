// ============================================================================
// MODULE: World / Models / Fortress Models
// DESIGN: Northern Chinese Mountain Fortress, Hill Watchtowers & Rope Bridge (SRP)
// SUMMARY: Constructs the multi-tiered imperial fortress, grand staircase, courtyards,
//          citadel hall, pavilions, watchtowers, suspension bridge, and Shaolin monks.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  CHINESE_FORTRESS_POS,
  CORNER_WATCHTOWERS,
  FORTRESS_Z_OFFSET,
  HILL_WATCHTOWERS,
  ROPE_BRIDGE_DEF,
  chineseFortressStairHeightAt,
  ropeBridgePointInfoAt,
} from '../domain/landmarksRegistry';
import { groundHeightAt, isWithinViewDistance } from '../terrainMath';
import { createArchitecturalSharedAssets } from './architecturalHelpers';
import type { WorldModelBuildContext } from './types';
// #endregion

// ======================== INTERFACES & TYPES ======================== \\
// #region Interfaces & Types
interface MartialArtsMonk {
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

export interface FortressModelResult {
  fortressGroup: THREE.Group;
  updateFortress: (elapsedTime: number, playerX: number, playerZ: number) => void;
}
// #endregion

// ======================== FACTORY FUNCTION ======================== \\
// #region Factory Function
/**
 * Constructs the Northern Chinese Mountain Fortress, summits, hill watchtowers,
 * walkable rope bridge, and courtyard training monks.
 */
export function buildFortressModels(ctx: WorldModelBuildContext): FortressModelResult {
  const { scene, textures, isSoftwareGl, disposableGeometries, disposableMaterials, distanceCulledObjects } = ctx;
  const archAssets = createArchitecturalSharedAssets(ctx);

  const FZ = FORTRESS_Z_OFFSET;
  const fortressGroup = new THREE.Group();

  // Material setup
  const fortressStoneMat = new THREE.MeshStandardMaterial({
    color: 0x9c9891,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.08,
    roughness: 0.86,
    metalness: 0.05,
  });

  const woodPlankCanvas = document.createElement('canvas');
  woodPlankCanvas.width = 256;
  woodPlankCanvas.height = 256;
  const wpCtx = woodPlankCanvas.getContext('2d')!;
  wpCtx.fillStyle = '#9c6234';
  wpCtx.fillRect(0, 0, 256, 256);
  const plankRows = 8;
  const rowH = 256 / plankRows;
  for (let r = 0; r < plankRows; r++) {
    const shade = 140 + ((r * 19) % 30);
    wpCtx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.63)}, ${Math.floor(shade * 0.34)})`;
    wpCtx.fillRect(0, r * rowH + 2, 256, rowH - 3);
    wpCtx.fillStyle = '#3b210e';
    wpCtx.fillRect(0, r * rowH, 2, rowH);
    const jointX = ((r * 97 + 40) % 220) + 18;
    wpCtx.fillRect(jointX, r * rowH, 2, rowH);
  }
  const woodPlankTex = new THREE.CanvasTexture(woodPlankCanvas);
  const imperialWoodFloorMat = new THREE.MeshStandardMaterial({
    map: woodPlankTex,
    roughness: 0.72,
    metalness: 0.05,
  });

  const furnitureWoodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    map: textures.timberAlbedo,
    roughness: 0.7,
    metalness: 0.05,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x2d3748,
    roughness: 0.45,
    metalness: 0.85,
  });
  const pillowClothMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.9 });
  const blanketClothMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.88 });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    map: textures.timberAlbedo,
    roughness: 0.75,
    metalness: 0.05,
  });
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.06,
    roughness: 0.9,
  });

  const monkPantsMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.78,
  });
  const monkWrapMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    roughness: 0.82,
  });
  const monkRobeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.65,
  });
  const monkSkinMat = new THREE.MeshStandardMaterial({
    color: 0xf1c27d,
    roughness: 0.55,
  });

  disposableMaterials.push(
    fortressStoneMat,
    imperialWoodFloorMat,
    furnitureWoodMat,
    darkIronMat,
    pillowClothMat,
    blanketClothMat,
    timberMat,
    barkMat,
    monkPantsMat,
    monkWrapMat,
    monkRobeMat,
    monkSkinMat
  );

  // --- 1) GRAND STONE STAIRCASE ---
  const lowerStairLen = CHINESE_FORTRESS_POS.stairFootZ - CHINESE_FORTRESS_POS.stairMidZ;
  const lowerStairRise = CHINESE_FORTRESS_POS.midLandingHeight - CHINESE_FORTRESS_POS.stairBaseHeight;
  const lowerStairAngle = Math.atan2(lowerStairRise, lowerStairLen);
  const numLowerSteps = 46;
  const lowerStepDepth = lowerStairLen / numLowerSteps;
  const lowerStepHeight = lowerStairRise / numLowerSteps;

  const stepBlockGeo = new THREE.BoxGeometry(7.2, lowerStepHeight + 0.36, lowerStepDepth + 0.12);
  const balustradePostGeo = new THREE.BoxGeometry(0.4, 1.38, 0.4);
  balustradePostGeo.translate(0, 0.69, 0);
  const balustradeCapGeo = new THREE.SphereGeometry(0.24, 8, 8);
  balustradeCapGeo.translate(0, 1.48, 0);
  const lowerStairSideWallGeo = new THREE.BoxGeometry(0.58, 3.8, lowerStairLen + 0.8);
  disposableGeometries.push(
    stepBlockGeo,
    balustradePostGeo,
    balustradeCapGeo,
    lowerStairSideWallGeo
  );

  for (let s = 0; s <= numLowerSteps; s++) {
    const sz = CHINESE_FORTRESS_POS.stairFootZ - s * lowerStepDepth;
    const sy = chineseFortressStairHeightAt(sz);
    const stepMesh = new THREE.Mesh(stepBlockGeo, fortressStoneMat);
    stepMesh.position.set(0, sy - (lowerStepHeight + 0.36) * 0.5, sz);
    stepMesh.receiveShadow = !isSoftwareGl;
    fortressGroup.add(stepMesh);
  }

  for (const sideX of [-3.85, 3.85]) {
    const sideSlopeWall = new THREE.Mesh(lowerStairSideWallGeo, archAssets.carvedMarbleMat);
    sideSlopeWall.position.set(
      sideX,
      (CHINESE_FORTRESS_POS.stairBaseHeight + CHINESE_FORTRESS_POS.midLandingHeight) * 0.5 - 0.65,
      (CHINESE_FORTRESS_POS.stairFootZ + CHINESE_FORTRESS_POS.stairMidZ) * 0.5
    );
    sideSlopeWall.rotation.x = lowerStairAngle;
    fortressGroup.add(sideSlopeWall);

    for (let p = 0; p <= 7; p++) {
      const pz = CHINESE_FORTRESS_POS.stairFootZ - (p / 7) * lowerStairLen;
      const py = chineseFortressStairHeightAt(pz);
      const post = new THREE.Mesh(balustradePostGeo, archAssets.carvedMarbleMat);
      post.position.set(sideX, py, pz);
      const cap = new THREE.Mesh(balustradeCapGeo, archAssets.carvedMarbleMat);
      cap.position.set(sideX, py, pz);
      fortressGroup.add(post, cap);

      if (p % 2 === 1) {
        fortressGroup.add(archAssets.createRedImperialFlag(sideX + (sideX < 0 ? -0.25 : 0.25), py + 0.85, pz));
      }
    }
  }

  // --- 2) FENCED INTERMEDIATE TERRACE & PAIFANG GATES ---
  const midY = CHINESE_FORTRESS_POS.midLandingHeight;
  const summitY = CHINESE_FORTRESS_POS.summitHeight;
  const midLandingBaseGeo = new THREE.BoxGeometry(27.4, 9.5, 10.4);
  const midLandingPavingGeo = new THREE.BoxGeometry(27.0, 0.36, 10.0);
  const midFenceRailSGeo = new THREE.BoxGeometry(9.2, 1.15, 0.45);
  const midFenceRailWEGeo = new THREE.BoxGeometry(0.45, 1.15, 10.0);
  disposableGeometries.push(
    midLandingBaseGeo,
    midLandingPavingGeo,
    midFenceRailSGeo,
    midFenceRailWEGeo
  );

  const midBaseMesh = new THREE.Mesh(midLandingBaseGeo, fortressStoneMat);
  midBaseMesh.position.set(0, midY - 4.85, -109.0 + FZ);
  fortressGroup.add(midBaseMesh);

  const midPavingMesh = new THREE.Mesh(midLandingPavingGeo, archAssets.carvedMarbleMat);
  midPavingMesh.position.set(0, midY - 0.16, -109.0 + FZ);
  midPavingMesh.receiveShadow = !isSoftwareGl;
  fortressGroup.add(midPavingMesh);

  for (const sx of [-8.8, 8.8]) {
    const sFence = new THREE.Mesh(midFenceRailSGeo, archAssets.carvedMarbleMat);
    sFence.position.set(sx, midY + 0.58, -104.2 + FZ);
    const nFence = new THREE.Mesh(midFenceRailSGeo, archAssets.carvedMarbleMat);
    nFence.position.set(sx, midY + 0.58, -113.8 + FZ);
    fortressGroup.add(sFence, nFence);

    for (const px of [sx - 4.3, sx, sx + 4.3]) {
      for (const pz of [-104.2 + FZ, -113.8 + FZ]) {
        const post = new THREE.Mesh(balustradePostGeo, archAssets.carvedMarbleMat);
        post.position.set(px, midY, pz);
        const cap = new THREE.Mesh(balustradeCapGeo, archAssets.carvedMarbleMat);
        cap.position.set(px, midY, pz);
        fortressGroup.add(post, cap);
      }
    }
  }
  for (const wx of [-13.3, 13.3]) {
    const weFence = new THREE.Mesh(midFenceRailWEGeo, archAssets.carvedMarbleMat);
    weFence.position.set(wx, midY + 0.58, -109.0 + FZ);
    fortressGroup.add(weFence);
    for (const pz of [-106.5 + FZ, -109.0 + FZ, -111.5 + FZ]) {
      const post = new THREE.Mesh(balustradePostGeo, archAssets.carvedMarbleMat);
      post.position.set(wx, midY, pz);
      const cap = new THREE.Mesh(balustradeCapGeo, archAssets.carvedMarbleMat);
      cap.position.set(wx, midY, pz);
      fortressGroup.add(post, cap);
    }
    fortressGroup.add(archAssets.createRedImperialFlag(wx, midY + 0.9, -104.2 + FZ));
  }

  fortressGroup.add(archAssets.createOrnatePaifangGate(CHINESE_FORTRESS_POS.lowerGateZ, midY));

  // Upper Stairs
  const upperStairLen = CHINESE_FORTRESS_POS.upperStairFootZ - CHINESE_FORTRESS_POS.upperStairTopZ;
  const upperStairRise = summitY - midY;
  const upperStairAngle = Math.atan2(upperStairRise, upperStairLen);
  const numUpperSteps = 16;
  const upperStepDepth = upperStairLen / numUpperSteps;
  const upperStepHeight = upperStairRise / numUpperSteps;
  const upperStairSideWallGeo = new THREE.BoxGeometry(0.58, 2.8, upperStairLen + 0.6);
  disposableGeometries.push(upperStairSideWallGeo);

  for (let s = 0; s <= numUpperSteps; s++) {
    const sz = CHINESE_FORTRESS_POS.upperStairFootZ - s * upperStepDepth;
    const sy = chineseFortressStairHeightAt(sz);
    const stepMesh = new THREE.Mesh(stepBlockGeo, fortressStoneMat);
    stepMesh.position.set(0, sy - (upperStepHeight + 0.36) * 0.5, sz);
    stepMesh.receiveShadow = !isSoftwareGl;
    fortressGroup.add(stepMesh);
  }

  for (const sideX of [-3.85, 3.85]) {
    const sideSlopeWall = new THREE.Mesh(upperStairSideWallGeo, archAssets.carvedMarbleMat);
    sideSlopeWall.position.set(
      sideX,
      (midY + summitY) * 0.5 - 0.5,
      (CHINESE_FORTRESS_POS.upperStairFootZ + CHINESE_FORTRESS_POS.upperStairTopZ) * 0.5
    );
    sideSlopeWall.rotation.x = upperStairAngle;
    fortressGroup.add(sideSlopeWall);

    for (let p = 0; p <= 3; p++) {
      const pz = CHINESE_FORTRESS_POS.upperStairFootZ - (p / 3) * upperStairLen;
      const py = chineseFortressStairHeightAt(pz);
      const post = new THREE.Mesh(balustradePostGeo, archAssets.carvedMarbleMat);
      post.position.set(sideX, py, pz);
      const cap = new THREE.Mesh(balustradeCapGeo, archAssets.carvedMarbleMat);
      cap.position.set(sideX, py, pz);
      fortressGroup.add(post, cap);
    }
  }

  fortressGroup.add(archAssets.createOrnatePaifangGate(CHINESE_FORTRESS_POS.upperGateZ, summitY));

  // --- 3) GRAND COURTYARD & RAMPARTS ---
  const rampartY = CHINESE_FORTRESS_POS.rampartHeight;
  const rampartH = rampartY - summitY;

  const fortressFoundationGeo = new THREE.BoxGeometry(108.0, 28.0, 100.0);
  const courtyardPavingGeo = new THREE.BoxGeometry(105.6, 0.42, 98.4);
  const imperialSpiritWayGeo = new THREE.BoxGeometry(8.8, 0.12, 65.0);
  const thickWallWEGeo = new THREE.BoxGeometry(4.2, rampartH, 74.0);
  const thickWallNGeo = new THREE.BoxGeometry(80.0, rampartH, 4.2);
  const thickWallSFlankGeo = new THREE.BoxGeometry(35.6, rampartH, 4.2);
  const merlonGeo = new THREE.BoxGeometry(1.2, 0.95, 0.65);
  const rampartStepGeo = new THREE.BoxGeometry(3.4, 0.34, 0.62);
  const rampartLandingDeckGeo = new THREE.BoxGeometry(3.6, rampartH, 4.6);
  const rampartLandingTopPavingGeo = new THREE.BoxGeometry(3.7, 0.24, 4.7);
  const rampartLandingFenceNorthGeo = new THREE.BoxGeometry(3.6, 1.15, 0.38);
  const rampartLandingFenceInnerGeo = new THREE.BoxGeometry(0.38, 1.15, 4.6);
  const rampartStairRailSideGeo = new THREE.BoxGeometry(0.32, 1.05, 10.4);

  disposableGeometries.push(
    fortressFoundationGeo,
    courtyardPavingGeo,
    imperialSpiritWayGeo,
    thickWallWEGeo,
    thickWallNGeo,
    thickWallSFlankGeo,
    merlonGeo,
    rampartStepGeo,
    rampartLandingDeckGeo,
    rampartLandingTopPavingGeo,
    rampartLandingFenceNorthGeo,
    rampartLandingFenceInnerGeo,
    rampartStairRailSideGeo
  );

  const foundationMesh = new THREE.Mesh(fortressFoundationGeo, fortressStoneMat);
  foundationMesh.position.set(0, summitY - 14.1, -171.0 + FZ);
  foundationMesh.receiveShadow = !isSoftwareGl;
  fortressGroup.add(foundationMesh);

  const courtyardMesh = new THREE.Mesh(courtyardPavingGeo, archAssets.carvedMarbleMat);
  courtyardMesh.position.set(0, summitY - 0.19, -171.0 + FZ);
  courtyardMesh.receiveShadow = !isSoftwareGl;
  fortressGroup.add(courtyardMesh);

  const spiritWayMesh = new THREE.Mesh(imperialSpiritWayGeo, archAssets.carvedMarbleMat);
  spiritWayMesh.position.set(0, summitY + 0.03, -156.5 + FZ);
  spiritWayMesh.receiveShadow = !isSoftwareGl;
  fortressGroup.add(spiritWayMesh);

  for (const wx of [-49.9, 49.9]) {
    const isWest = wx < 0;
    const wallWE = new THREE.Mesh(thickWallWEGeo, fortressStoneMat);
    wallWE.position.set(wx, summitY + rampartH * 0.5, -171.0 + FZ);
    wallWE.castShadow = !isSoftwareGl;
    wallWE.receiveShadow = !isSoftwareGl;
    fortressGroup.add(wallWE);

    const outerEdgeX = wx + (isWest ? -1.75 : 1.75);
    for (let mz = -206.0 + FZ; mz <= -136.0 + FZ; mz += 2.8) {
      const merlon = new THREE.Mesh(merlonGeo, fortressStoneMat);
      merlon.position.set(outerEdgeX, rampartY + 0.47, mz);
      merlon.rotation.y = Math.PI / 2;
      fortressGroup.add(merlon);
    }

    const stairCenterX = isWest ? -46.1 : 46.1;
    const wallSteps = 18;
    for (let s = 0; s <= wallSteps; s++) {
      const t = s / wallSteps;
      const sz = -142.0 + FZ - t * 10.0;
      const sy = summitY + t * rampartH;
      const wStep = new THREE.Mesh(rampartStepGeo, fortressStoneMat);
      wStep.position.set(stairCenterX, sy - 0.15, sz);
      wStep.receiveShadow = !isSoftwareGl;
      fortressGroup.add(wStep);
    }

    const innerRailX = isWest ? -44.3 : 44.3;
    const stairRail = new THREE.Mesh(rampartStairRailSideGeo, archAssets.carvedMarbleMat);
    stairRail.position.set(innerRailX, summitY + rampartH * 0.5 + 0.45, -147.0 + FZ);
    stairRail.rotation.x = Math.atan2(rampartH, 10.0);
    fortressGroup.add(stairRail);

    const landingCenterZ = -154.3 + FZ;
    const landingBlock = new THREE.Mesh(rampartLandingDeckGeo, fortressStoneMat);
    landingBlock.position.set(stairCenterX, summitY + rampartH * 0.5, landingCenterZ);
    landingBlock.receiveShadow = !isSoftwareGl;
    const landingPaving = new THREE.Mesh(rampartLandingTopPavingGeo, archAssets.carvedMarbleMat);
    landingPaving.position.set(stairCenterX, rampartY - 0.1, landingCenterZ);
    landingPaving.receiveShadow = !isSoftwareGl;

    const northFence = new THREE.Mesh(rampartLandingFenceNorthGeo, archAssets.carvedMarbleMat);
    northFence.position.set(stairCenterX, rampartY + 0.58, -156.5 + FZ);
    const innerFence = new THREE.Mesh(rampartLandingFenceInnerGeo, archAssets.carvedMarbleMat);
    innerFence.position.set(innerRailX, rampartY + 0.58, landingCenterZ);
    fortressGroup.add(landingBlock, landingPaving, northFence, innerFence);

    for (const [postX, postZ] of [
      [innerRailX, -152.1 + FZ],
      [innerRailX, -154.3 + FZ],
      [innerRailX, -156.5 + FZ],
      [isWest ? -47.7 : 47.7, -156.5 + FZ],
    ]) {
      const post = new THREE.Mesh(balustradePostGeo, archAssets.carvedMarbleMat);
      post.position.set(postX, rampartY, postZ);
      const cap = new THREE.Mesh(balustradeCapGeo, archAssets.carvedMarbleMat);
      cap.position.set(postX, rampartY, postZ);
      fortressGroup.add(post, cap);
    }
  }

  const wallNorth = new THREE.Mesh(thickWallNGeo, fortressStoneMat);
  wallNorth.position.set(0, summitY + rampartH * 0.5, -217.9 + FZ);
  wallNorth.receiveShadow = !isSoftwareGl;
  fortressGroup.add(wallNorth);
  for (let mx = -38.5; mx <= 38.5; mx += 2.8) {
    const merlon = new THREE.Mesh(merlonGeo, fortressStoneMat);
    merlon.position.set(mx, rampartY + 0.47, -219.6 + FZ);
    fortressGroup.add(merlon);
  }

  for (const sx of [-22.2, 22.2]) {
    const wallS = new THREE.Mesh(thickWallSFlankGeo, fortressStoneMat);
    wallS.position.set(sx, summitY + rampartH * 0.5, -124.1 + FZ);
    wallS.castShadow = !isSoftwareGl;
    wallS.receiveShadow = !isSoftwareGl;
    fortressGroup.add(wallS);
    for (let mx = sx - 16.5; mx <= sx + 16.5; mx += 2.8) {
      const merlon = new THREE.Mesh(merlonGeo, fortressStoneMat);
      merlon.position.set(mx, rampartY + 0.47, -122.4 + FZ);
      fortressGroup.add(merlon);
    }
    fortressGroup.add(archAssets.createRedImperialFlag(sx < 0 ? -7.2 : 7.2, rampartY, -122.5 + FZ));
  }

  // Huabiao dragon pillars & burner cauldrons
  const huabiaoBaseGeo = new THREE.CylinderGeometry(0.95, 1.15, 1.2, 8);
  huabiaoBaseGeo.translate(0, 0.6, 0);
  const huabiaoShaftGeo = new THREE.CylinderGeometry(0.42, 0.48, 7.2, 12);
  huabiaoShaftGeo.translate(0, 4.2, 0);
  const huabiaoCloudBarGeo = new THREE.BoxGeometry(2.1, 0.32, 0.42);
  huabiaoCloudBarGeo.translate(0, 7.1, 0);
  const huabiaoCapGeo = new THREE.CylinderGeometry(0.65, 0.52, 0.45, 10);
  huabiaoCapGeo.translate(0, 7.9, 0);
  const burnerCauldronGeo = new THREE.CylinderGeometry(0.95, 0.72, 1.05, 12);
  burnerCauldronGeo.translate(0, 1.05, 0);
  const burnerLegGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.78, 6);
  burnerLegGeo.translate(0, 0.39, 0);
  disposableGeometries.push(
    huabiaoBaseGeo,
    huabiaoShaftGeo,
    huabiaoCloudBarGeo,
    huabiaoCapGeo,
    burnerCauldronGeo,
    burnerLegGeo
  );

  for (const hx of [-9.5, 9.5]) {
    for (const hz of [-138.0 + FZ, -176.0 + FZ]) {
      const hbGroup = new THREE.Group();
      hbGroup.position.set(hx, summitY, hz);
      hbGroup.add(
        new THREE.Mesh(huabiaoBaseGeo, archAssets.carvedMarbleMat),
        new THREE.Mesh(huabiaoShaftGeo, archAssets.carvedMarbleMat),
        new THREE.Mesh(huabiaoCloudBarGeo, archAssets.carvedMarbleMat),
        new THREE.Mesh(huabiaoCapGeo, archAssets.imperialGoldMat),
        archAssets.createRedChineseLantern(0, 6.6, 0)
      );
      fortressGroup.add(hbGroup);
    }

    const bGroup = new THREE.Group();
    bGroup.position.set(hx, summitY, -152.0 + FZ);
    bGroup.add(new THREE.Mesh(burnerCauldronGeo, darkIronMat));
    for (const [lx, lz] of [
      [-0.48, -0.48],
      [0.48, -0.48],
      [-0.48, 0.48],
      [0.48, 0.48],
    ]) {
      const leg = new THREE.Mesh(burnerLegGeo, darkIronMat);
      leg.position.set(lx, 0, lz);
      bGroup.add(leg);
    }
    fortressGroup.add(bGroup);
  }

  // --- 4) MAIN IMPERIAL CITADEL HALL ---
  const hallCenterZ = -202.8 + FZ;
  const hallFrontZ = -189.8 + FZ;
  const hallBackZ = -215.8 + FZ;
  const hallFloor1Y = CHINESE_FORTRESS_POS.mainHallFloor1Y;
  const hallFloor2Y = CHINESE_FORTRESS_POS.mainHallFloor2Y;
  const hallH1 = hallFloor2Y - hallFloor1Y;
  const hallH2 = 5.2;

  const hallPlinthGeo = new THREE.BoxGeometry(44.8, 0.35, 26.4);
  const hallEntryStepsGeo = new THREE.BoxGeometry(8.4, 0.24, 2.0);
  const hallWoodFloor1Geo = new THREE.BoxGeometry(43.4, 0.14, 25.4);
  const hallWoodFloor2MainGeo = new THREE.BoxGeometry(35.2, 0.22, 25.8);
  const hallWoodFloor2RightGeo = new THREE.BoxGeometry(3.2, 0.22, 25.8);
  const hallWoodFloor2FrontPatchGeo = new THREE.BoxGeometry(5.0, 0.22, 4.2);
  const hallWoodFloor2BackPatchGeo = new THREE.BoxGeometry(5.0, 0.22, 9.6);

  const hallWallBackGeo = new THREE.BoxGeometry(44.0, hallH1 + hallH2, 0.6);
  const hallWallSideGeo = new THREE.BoxGeometry(0.6, hallH1 + hallH2, 26.0);
  const hallWallFrontFlankGeo = new THREE.BoxGeometry(20.0, hallH1, 0.6);
  const hallWallFrontUpperFlankGeo = new THREE.BoxGeometry(17.5, hallH2, 0.6);
  const hallWindowSillWallGeo = new THREE.BoxGeometry(9.0, 2.4, 0.6);
  const hallWindowSillCapGeo = new THREE.BoxGeometry(9.2, 0.14, 0.72);
  const hallWindowHeaderGeo = new THREE.BoxGeometry(9.0, 0.85, 0.6);
  const hallPillarGeo = new THREE.CylinderGeometry(0.4, 0.44, hallH1 + hallH2, 12);
  const hallStairStepGeo = new THREE.BoxGeometry(4.8, 0.28, 0.62);
  const hallThroneDaisGeo = new THREE.BoxGeometry(9.6, 0.72, 5.4);
  const hallThroneScreenGeo = new THREE.BoxGeometry(8.2, 4.0, 0.4);

  disposableGeometries.push(
    hallPlinthGeo,
    hallEntryStepsGeo,
    hallWoodFloor1Geo,
    hallWoodFloor2MainGeo,
    hallWoodFloor2RightGeo,
    hallWoodFloor2FrontPatchGeo,
    hallWoodFloor2BackPatchGeo,
    hallWallBackGeo,
    hallWallSideGeo,
    hallWallFrontFlankGeo,
    hallWallFrontUpperFlankGeo,
    hallWindowSillWallGeo,
    hallWindowSillCapGeo,
    hallWindowHeaderGeo,
    hallPillarGeo,
    hallStairStepGeo,
    hallThroneDaisGeo,
    hallThroneScreenGeo
  );

  const hallPlinth = new THREE.Mesh(hallPlinthGeo, archAssets.carvedMarbleMat);
  hallPlinth.position.set(0, summitY + 0.175, hallCenterZ);
  const hallEntrySteps = new THREE.Mesh(hallEntryStepsGeo, archAssets.carvedMarbleMat);
  hallEntrySteps.position.set(0, summitY + 0.12, hallFrontZ + 1.0);
  const hallFloor1 = new THREE.Mesh(hallWoodFloor1Geo, imperialWoodFloorMat);
  hallFloor1.position.set(0, hallFloor1Y - 0.05, hallCenterZ);
  hallFloor1.receiveShadow = !isSoftwareGl;
  fortressGroup.add(hallPlinth, hallEntrySteps, hallFloor1);

  const f2Main = new THREE.Mesh(hallWoodFloor2MainGeo, imperialWoodFloorMat);
  f2Main.position.set(-4.1, hallFloor2Y - 0.11, hallCenterZ);
  const f2Right = new THREE.Mesh(hallWoodFloor2RightGeo, imperialWoodFloorMat);
  f2Right.position.set(20.1, hallFloor2Y - 0.11, hallCenterZ);
  const f2Front = new THREE.Mesh(hallWoodFloor2FrontPatchGeo, imperialWoodFloorMat);
  f2Front.position.set(16.0, hallFloor2Y - 0.11, -191.9 + FZ);
  const f2Back = new THREE.Mesh(hallWoodFloor2BackPatchGeo, imperialWoodFloorMat);
  f2Back.position.set(16.0, hallFloor2Y - 0.11, -210.8 + FZ);
  fortressGroup.add(f2Main, f2Right, f2Front, f2Back);

  const hallBackWall = new THREE.Mesh(hallWallBackGeo, archAssets.imperialCrimsonMat);
  hallBackWall.position.set(0, hallFloor1Y + (hallH1 + hallH2) * 0.5, hallBackZ);
  fortressGroup.add(hallBackWall);

  for (const sx of [-22.0, 22.0]) {
    const sideWall = new THREE.Mesh(hallWallSideGeo, archAssets.imperialCrimsonMat);
    sideWall.position.set(sx, hallFloor1Y + (hallH1 + hallH2) * 0.5, hallCenterZ);
    fortressGroup.add(sideWall);
  }

  for (const fx of [-12.0, 12.0]) {
    const frontFlank = new THREE.Mesh(hallWallFrontFlankGeo, archAssets.imperialCrimsonMat);
    frontFlank.position.set(fx, hallFloor1Y + hallH1 * 0.5, hallFrontZ);
    fortressGroup.add(frontFlank);
  }
  for (const fx of [-13.25, 13.25]) {
    const frontUpperFlank = new THREE.Mesh(hallWallFrontUpperFlankGeo, archAssets.imperialCrimsonMat);
    frontUpperFlank.position.set(fx, hallFloor2Y + hallH2 * 0.5, hallFrontZ);
    fortressGroup.add(frontUpperFlank);
  }

  const hallWinSill = new THREE.Mesh(hallWindowSillWallGeo, archAssets.imperialCrimsonMat);
  hallWinSill.position.set(0, hallFloor2Y - 0.25, hallFrontZ);
  const hallWinCap = new THREE.Mesh(hallWindowSillCapGeo, archAssets.imperialGoldMat);
  hallWinCap.position.set(0, hallFloor2Y + 0.95, hallFrontZ);
  const hallWinHeader = new THREE.Mesh(hallWindowHeaderGeo, archAssets.jadeBeamMat);
  hallWinHeader.position.set(0, hallFloor2Y + hallH2 - 0.42, hallFrontZ);
  fortressGroup.add(hallWinSill, hallWinCap, hallWinHeader);

  fortressGroup.add(archAssets.createInteractiveDoubleDoor('main-hall-door', 0, hallFloor1Y, hallFrontZ, 4.0, 4.4));

  const numHallSteps = 22;
  for (let s = 0; s <= numHallSteps; s++) {
    const t = s / numHallSteps;
    const sz = -194.0 + FZ - t * 12.0;
    const sy = hallFloor1Y + t * hallH1;
    const hStep = new THREE.Mesh(hallStairStepGeo, imperialWoodFloorMat);
    hStep.position.set(16.0, sy - 0.14, sz);
    fortressGroup.add(hStep);
  }

  for (const px of [-14.0, -7.0, 7.0]) {
    for (const pz of [-196.5 + FZ, -209.0 + FZ]) {
      const col = new THREE.Mesh(hallPillarGeo, archAssets.imperialCrimsonMat);
      col.position.set(px, hallFloor1Y + (hallH1 + hallH2) * 0.5, pz);
      fortressGroup.add(col);
    }
  }
  const throneDais = new THREE.Mesh(hallThroneDaisGeo, archAssets.imperialGoldMat);
  throneDais.position.set(0, hallFloor1Y + 0.36, -210.8 + FZ);
  const throneScreen = new THREE.Mesh(hallThroneScreenGeo, archAssets.imperialGoldMat);
  throneScreen.position.set(0, hallFloor1Y + 2.5, -213.2 + FZ);
  fortressGroup.add(throneDais, throneScreen);

  for (let px = -21.0; px <= 21.0; px += 5.25) {
    if (Math.abs(px) < 2.5) continue;
    const extCol = new THREE.Mesh(hallPillarGeo, archAssets.imperialCrimsonMat);
    extCol.position.set(px, hallFloor1Y + (hallH1 + hallH2) * 0.5, hallFrontZ + 0.45);
    fortressGroup.add(extCol);
  }

  const hallLowerSkirtRoof = archAssets.createChinesePerimeterSkirtRoof(44.0, 26.0, 2.5, 1.15);
  hallLowerSkirtRoof.position.set(0, hallFloor2Y + 0.05, hallCenterZ);
  const hallUpperRoof = archAssets.createChinesePagodaRoof(47.8, 29.8, 5.2);
  hallUpperRoof.position.set(0, hallFloor2Y + hallH2 - 0.15, hallCenterZ);
  fortressGroup.add(hallLowerSkirtRoof, hallUpperRoof);

  for (const lx of [-8.0, 8.0]) {
    fortressGroup.add(
      archAssets.createRedChineseLantern(lx, hallFloor1Y + 4.4, hallFrontZ + 0.8),
      archAssets.createRedChineseLantern(lx, hallFloor1Y + 4.8, hallCenterZ),
      archAssets.createRedChineseLantern(lx, hallFloor2Y + 4.0, hallCenterZ)
    );
  }

  // Citadel Interior: Dining banquet, kitchen, and 2F Dojo
  const dojoMatGeo = new THREE.BoxGeometry(9.8, 0.05, 17.6);
  const dojoMatBorderGeo = new THREE.BoxGeometry(10.3, 0.035, 18.1);
  const sandbagBodyGeo = new THREE.CylinderGeometry(0.32, 0.34, 1.65, 12);
  const sandbagChainGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6);
  const weaponRackPostGeo = new THREE.BoxGeometry(0.14, 1.85, 0.45);
  weaponRackPostGeo.translate(0, 0.92, 0);
  const weaponRackBarGeo = new THREE.BoxGeometry(2.6, 0.1, 0.12);
  const weaponStaffGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.35, 7);
  const weaponBladeGeo = new THREE.ConeGeometry(0.12, 0.48, 4);
  const balancePoleGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.75, 10);
  balancePoleGeo.translate(0, 0.375, 0);
  const gongFramePostGeo = new THREE.CylinderGeometry(0.09, 0.1, 2.5, 8);
  gongFramePostGeo.translate(0, 1.25, 0);
  const gongFrameTopGeo = new THREE.BoxGeometry(2.4, 0.16, 0.18);
  const gongDiscGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.08, 20);
  gongDiscGeo.rotateX(Math.PI / 2);

  const banquetTableTopGeo = new THREE.BoxGeometry(13.6, 0.14, 2.35);
  const banquetRunnerGeo = new THREE.BoxGeometry(13.2, 0.02, 0.78);
  const banquetPedestalGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.76, 10);
  banquetPedestalGeo.translate(0, 0.38, 0);
  const bambooSteamerGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12);
  bambooSteamerGeo.translate(0, 0.12, 0);
  const porcelainBowlGeo = new THREE.CylinderGeometry(0.14, 0.09, 0.11, 10);
  porcelainBowlGeo.translate(0, 0.055, 0);
  const feastPlatterGeo = new THREE.CylinderGeometry(0.42, 0.36, 0.06, 12);
  feastPlatterGeo.translate(0, 0.03, 0);
  const roastDuckGeo = new THREE.SphereGeometry(0.22, 8, 8);
  roastDuckGeo.scale(1.35, 0.75, 0.95);
  const wokStoveBrickGeo = new THREE.BoxGeometry(5.6, 0.96, 1.85);
  wokStoveBrickGeo.translate(0, 0.48, 0);
  const wokPanGeo = new THREE.SphereGeometry(0.68, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  const wokFireGlowGeo = new THREE.BoxGeometry(0.65, 0.38, 0.12);
  const kitchenHoodGeo = new THREE.ConeGeometry(2.8, 1.4, 4);
  kitchenHoodGeo.rotateY(Math.PI / 4);
  const kitchenPrepCounterGeo = new THREE.BoxGeometry(1.35, 0.9, 6.4);
  kitchenPrepCounterGeo.translate(0, 0.45, 0);
  const cuttingBoardGeo = new THREE.BoxGeometry(0.55, 0.05, 0.75);
  const cleaverBladeGeo = new THREE.BoxGeometry(0.28, 0.02, 0.14);
  const wineJarGeo = new THREE.SphereGeometry(0.32, 10, 8);
  wineJarGeo.scale(1.0, 1.28, 1.0);
  const wineJarLidGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.12, 8);
  const chairSeatGeo = new THREE.BoxGeometry(0.52, 0.07, 0.52);
  const chairLegGeo = new THREE.BoxGeometry(0.06, 0.45, 0.06);
  const chairBackGeo = new THREE.BoxGeometry(0.52, 0.52, 0.06);
  const teapotGeo = new THREE.SphereGeometry(0.16, 8, 8);

  disposableGeometries.push(
    dojoMatGeo,
    dojoMatBorderGeo,
    sandbagBodyGeo,
    sandbagChainGeo,
    weaponRackPostGeo,
    weaponRackBarGeo,
    weaponStaffGeo,
    weaponBladeGeo,
    balancePoleGeo,
    gongFramePostGeo,
    gongFrameTopGeo,
    gongDiscGeo,
    banquetTableTopGeo,
    banquetRunnerGeo,
    banquetPedestalGeo,
    bambooSteamerGeo,
    porcelainBowlGeo,
    feastPlatterGeo,
    roastDuckGeo,
    wokStoveBrickGeo,
    wokPanGeo,
    wokFireGlowGeo,
    kitchenHoodGeo,
    kitchenPrepCounterGeo,
    cuttingBoardGeo,
    cleaverBladeGeo,
    wineJarGeo,
    wineJarLidGeo,
    chairSeatGeo,
    chairLegGeo,
    chairBackGeo,
    teapotGeo
  );

  const dojoTatamiMat = new THREE.MeshStandardMaterial({ color: 0xc8b273, roughness: 0.86 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd4a857, roughness: 0.75 });
  const roastDuckMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.38 });
  const ceramicJarMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 });
  disposableMaterials.push(dojoTatamiMat, bambooMat, roastDuckMat, ceramicJarMat);

  // Grand Banquet Dining Table
  const banquetCenterZ = hallCenterZ + 1.5;
  const banquetCenterX = 0.5;
  const bTableTop = new THREE.Mesh(banquetTableTopGeo, archAssets.imperialCrimsonMat);
  bTableTop.position.set(banquetCenterX, hallFloor1Y + 0.78, banquetCenterZ);
  const bRunner = new THREE.Mesh(banquetRunnerGeo, archAssets.imperialGoldMat);
  bRunner.position.set(banquetCenterX, hallFloor1Y + 0.855, banquetCenterZ);
  fortressGroup.add(bTableTop, bRunner);

  for (const pedX of [-5.2, -1.8, 1.8, 5.2]) {
    const ped = new THREE.Mesh(banquetPedestalGeo, furnitureWoodMat);
    ped.position.set(banquetCenterX + pedX, hallFloor1Y, banquetCenterZ);
    fortressGroup.add(ped);
  }

  const buildBanquetChair = (cx: number, cz: number, rotY: number) => {
    const ch = new THREE.Group();
    ch.position.set(cx, hallFloor1Y, cz);
    ch.rotation.y = rotY;
    const seat = new THREE.Mesh(chairSeatGeo, archAssets.imperialCrimsonMat);
    seat.position.y = 0.45;
    const back = new THREE.Mesh(chairBackGeo, furnitureWoodMat);
    back.position.set(0, 0.74, -0.22);
    ch.add(seat, back);
    for (const lx of [-0.21, 0.21]) {
      for (const lz of [-0.21, 0.21]) {
        const leg = new THREE.Mesh(chairLegGeo, furnitureWoodMat);
        leg.position.set(lx, 0.225, lz);
        ch.add(leg);
      }
    }
    fortressGroup.add(ch);
  };

  for (let i = 0; i < 8; i++) {
    const seatX = banquetCenterX - 5.6 + i * 1.6;
    buildBanquetChair(seatX, banquetCenterZ - 1.55, 0);
    buildBanquetChair(seatX, banquetCenterZ + 1.55, Math.PI);

    const bowlN = new THREE.Mesh(porcelainBowlGeo, pillowClothMat);
    bowlN.position.set(seatX, hallFloor1Y + 0.85, banquetCenterZ - 0.78);
    const bowlS = new THREE.Mesh(porcelainBowlGeo, pillowClothMat);
    bowlS.position.set(seatX, hallFloor1Y + 0.85, banquetCenterZ + 0.78);
    fortressGroup.add(bowlN, bowlS);
  }
  buildBanquetChair(banquetCenterX - 7.35, banquetCenterZ, Math.PI / 2);
  buildBanquetChair(banquetCenterX + 7.35, banquetCenterZ, -Math.PI / 2);

  for (let s = 0; s < 6; s++) {
    const sx = banquetCenterX - 5.0 + s * 2.0;
    if (s % 2 === 0) {
      const tier1 = new THREE.Mesh(bambooSteamerGeo, bambooMat);
      tier1.position.set(sx, hallFloor1Y + 0.86, banquetCenterZ);
      const tier2 = new THREE.Mesh(bambooSteamerGeo, bambooMat);
      tier2.position.set(sx, hallFloor1Y + 1.1, banquetCenterZ);
      const teapot = new THREE.Mesh(teapotGeo, archAssets.imperialGoldMat);
      teapot.position.set(sx + 0.58, hallFloor1Y + 0.98, banquetCenterZ + 0.18);
      fortressGroup.add(tier1, tier2, teapot);
    } else {
      const platter = new THREE.Mesh(feastPlatterGeo, archAssets.carvedMarbleMat);
      platter.position.set(sx, hallFloor1Y + 0.86, banquetCenterZ);
      const duck = new THREE.Mesh(roastDuckGeo, roastDuckMat);
      duck.position.set(sx, hallFloor1Y + 1.02, banquetCenterZ);
      fortressGroup.add(platter, duck);
    }
  }

  // Kitchen
  const stoveX = -16.6;
  const stoveZ = hallBackZ + 1.25;
  const wokStove = new THREE.Mesh(wokStoveBrickGeo, fortressStoneMat);
  wokStove.position.set(stoveX, hallFloor1Y, stoveZ);
  const exhaustHood = new THREE.Mesh(kitchenHoodGeo, darkIronMat);
  exhaustHood.position.set(stoveX, hallFloor1Y + 3.45, stoveZ);
  fortressGroup.add(wokStove, exhaustHood);

  for (const wxOff of [-1.45, 1.45]) {
    const wokPan = new THREE.Mesh(wokPanGeo, darkIronMat);
    wokPan.position.set(stoveX + wxOff, hallFloor1Y + 1.12, stoveZ);
    const fireGlow = new THREE.Mesh(wokFireGlowGeo, archAssets.warmLanternMat);
    fireGlow.position.set(stoveX + wxOff, hallFloor1Y + 0.34, stoveZ + 0.92);
    fortressGroup.add(wokPan, fireGlow);
  }
  for (let tier = 0; tier < 3; tier++) {
    const kSteamer = new THREE.Mesh(bambooSteamerGeo, bambooMat);
    kSteamer.position.set(stoveX, hallFloor1Y + 0.96 + tier * 0.24, stoveZ);
    fortressGroup.add(kSteamer);
  }

  const prepX = -20.4;
  const prepZ = hallCenterZ - 1.5;
  const prepCounter = new THREE.Mesh(kitchenPrepCounterGeo, furnitureWoodMat);
  prepCounter.position.set(prepX, hallFloor1Y, prepZ);
  fortressGroup.add(prepCounter);
  for (const bzOff of [-1.8, 0, 1.8]) {
    const cBoard = new THREE.Mesh(cuttingBoardGeo, bambooMat);
    cBoard.position.set(prepX + 0.1, hallFloor1Y + 0.93, prepZ + bzOff);
    const cleaver = new THREE.Mesh(cleaverBladeGeo, darkIronMat);
    cleaver.position.set(prepX + 0.18, hallFloor1Y + 0.97, prepZ + bzOff + 0.18);
    cleaver.rotation.y = 0.35;
    fortressGroup.add(cBoard, cleaver);
  }

  for (let j = 0; j < 5; j++) {
    const jx = -20.3 + (j % 2) * 0.78;
    const jz = hallFrontZ + 2.2 + j * 1.1;
    const jar = new THREE.Mesh(wineJarGeo, ceramicJarMat);
    jar.position.set(jx, hallFloor1Y + 0.38, jz);
    const jarLid = new THREE.Mesh(wineJarLidGeo, archAssets.imperialCrimsonMat);
    jarLid.position.set(jx, hallFloor1Y + 0.78, jz);
    fortressGroup.add(jar, jarLid);
  }

  // 2F Dojo
  for (const matX of [-15.5, -5.0, 5.5]) {
    const mBorder = new THREE.Mesh(dojoMatBorderGeo, archAssets.imperialCrimsonMat);
    mBorder.position.set(matX, hallFloor2Y + 0.015, hallCenterZ);
    const mInner = new THREE.Mesh(dojoMatGeo, dojoTatamiMat);
    mInner.position.set(matX, hallFloor2Y + 0.028, hallCenterZ);
    fortressGroup.add(mBorder, mInner);
  }

  const dojoDummyBaseGeo = new THREE.CylinderGeometry(0.52, 0.58, 0.14, 10);
  dojoDummyBaseGeo.translate(0, 0.07, 0);
  const dojoDummyTrunkGeo = new THREE.CylinderGeometry(0.18, 0.2, 1.72, 10);
  dojoDummyTrunkGeo.translate(0, 0.86, 0);
  const dojoDummyArmGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.56, 7);
  dojoDummyArmGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(dojoDummyBaseGeo, dojoDummyTrunkGeo, dojoDummyArmGeo);

  for (const [dx, dz, dyaw] of [
    [-17.8, hallCenterZ - 3.5, Math.PI * 0.5],
    [-17.8, hallCenterZ + 3.5, Math.PI * 0.5],
    [-7.5, hallCenterZ - 3.5, 0],
    [-2.5, hallCenterZ - 3.5, 0],
    [3.2, hallCenterZ - 3.5, 0],
    [8.0, hallCenterZ - 3.5, 0],
  ]) {
    const dGroup = new THREE.Group();
    dGroup.position.set(dx, hallFloor2Y + 0.04, dz);
    dGroup.rotation.y = dyaw;
    dGroup.add(
      new THREE.Mesh(dojoDummyBaseGeo, fortressStoneMat),
      new THREE.Mesh(dojoDummyTrunkGeo, furnitureWoodMat)
    );
    for (const [ax, ay, az, ayaw] of [
      [-0.14, 1.3, 0.25, -0.2],
      [0.14, 1.3, 0.25, 0.2],
      [0, 0.96, 0.28, 0],
    ]) {
      const arm = new THREE.Mesh(dojoDummyArmGeo, archAssets.imperialGoldMat);
      arm.position.set(ax, ay, az);
      arm.rotation.y = ayaw;
      dGroup.add(arm);
    }
    fortressGroup.add(dGroup);
  }

  for (const [sbX, sbZ] of [
    [-13.0, hallCenterZ - 3.2],
    [-13.0, hallCenterZ + 3.2],
    [3.2, hallCenterZ + 3.5],
    [8.0, hallCenterZ + 3.5],
  ]) {
    const bagMesh = new THREE.Mesh(sandbagBodyGeo, blanketClothMat);
    bagMesh.position.set(sbX, hallFloor2Y + 1.85, sbZ);
    const chainMesh = new THREE.Mesh(sandbagChainGeo, darkIronMat);
    chainMesh.position.set(sbX, hallFloor2Y + 3.45, sbZ);
    fortressGroup.add(bagMesh, chainMesh);
  }

  for (let p = 0; p < 9; p++) {
    const px = -7.2 + (p % 3) * 2.2;
    const pz = hallCenterZ + 1.4 + Math.floor(p / 3) * 2.1;
    const pScaleY = 0.75 + ((p * 3) % 4) * 0.25;
    const pole = new THREE.Mesh(balancePoleGeo, furnitureWoodMat);
    pole.position.set(px, hallFloor2Y + 0.04, pz);
    pole.scale.set(1, pScaleY, 1);
    fortressGroup.add(pole);
  }

  for (const wrX of [-16.0, -9.5, 0.5, 7.0]) {
    const wrGroup = new THREE.Group();
    wrGroup.position.set(wrX, hallFloor2Y, hallBackZ + 0.55);
    const postL = new THREE.Mesh(weaponRackPostGeo, furnitureWoodMat);
    postL.position.x = -1.1;
    const postR = new THREE.Mesh(weaponRackPostGeo, furnitureWoodMat);
    postR.position.x = 1.1;
    const barLow = new THREE.Mesh(weaponRackBarGeo, archAssets.imperialCrimsonMat);
    barLow.position.y = 0.55;
    const barHigh = new THREE.Mesh(weaponRackBarGeo, archAssets.imperialCrimsonMat);
    barHigh.position.y = 1.35;
    wrGroup.add(postL, postR, barLow, barHigh);
    for (let w = -2; w <= 2; w++) {
      const staff = new THREE.Mesh(weaponStaffGeo, bambooMat);
      staff.position.set(w * 0.42, 1.22, 0.06);
      const blade = new THREE.Mesh(weaponBladeGeo, archAssets.imperialGoldMat);
      blade.position.set(w * 0.42, 2.52, 0.06);
      wrGroup.add(staff, blade);
    }
    fortressGroup.add(wrGroup);
  }

  const gongGroup = new THREE.Group();
  gongGroup.position.set(-5.0, hallFloor2Y, hallBackZ + 0.85);
  const gPostL = new THREE.Mesh(gongFramePostGeo, archAssets.imperialCrimsonMat);
  gPostL.position.x = -1.0;
  const gPostR = new THREE.Mesh(gongFramePostGeo, archAssets.imperialCrimsonMat);
  gPostR.position.x = 1.0;
  const gTop = new THREE.Mesh(gongFrameTopGeo, archAssets.imperialCrimsonMat);
  gTop.position.y = 2.45;
  const gDisc = new THREE.Mesh(gongDiscGeo, archAssets.imperialGoldMat);
  gDisc.position.y = 1.45;
  gongGroup.add(gPostL, gPostR, gTop, gDisc);
  fortressGroup.add(gongGroup);

  // --- 5) WEST & EAST TWO-STORY PAGODA PAVILIONS ---
  const pavCenterZ = -164.0 + FZ;
  const pavFrontZ = -156.5 + FZ;
  const pavBackZ = -171.5 + FZ;
  const pavFloor1Y = CHINESE_FORTRESS_POS.pavilionFloor1Y;
  const pavFloor2Y = CHINESE_FORTRESS_POS.pavilionFloor2Y;
  const pavH1 = pavFloor2Y - pavFloor1Y;
  const pavH2 = 4.2;

  const pavPlinthGeo = new THREE.BoxGeometry(18.6, 0.3, 15.6);
  const pavFloor1Geo = new THREE.BoxGeometry(17.6, 0.14, 14.6);
  const pavFloor2MainGeo = new THREE.BoxGeometry(13.8, 0.2, 14.6);
  const pavFloor2TopLandingGeo = new THREE.BoxGeometry(3.8, 0.2, 3.8);
  const pavFloor2FrontPatchGeo = new THREE.BoxGeometry(3.8, 0.2, 2.8);
  const pavStairGuardRailGeo = new THREE.BoxGeometry(0.18, 0.95, 8.0);
  const pavWallBackGeo = new THREE.BoxGeometry(18.0, pavH1 + pavH2, 0.5);
  const pavWallSideGeo = new THREE.BoxGeometry(0.5, pavH1 + pavH2, 14.5);
  const pavWallFrontFlankGeo = new THREE.BoxGeometry(7.5, pavH1, 0.5);
  const pavWallFrontUpperGeo = new THREE.BoxGeometry(18.0, pavH2, 0.5);
  const pavStairStepGeo = new THREE.BoxGeometry(3.55, 0.26, 0.54);

  const tableTopGeo = new THREE.BoxGeometry(2.1, 0.1, 1.25);
  const tableLegGeo = new THREE.BoxGeometry(0.1, 0.76, 0.1);
  const wardrobeBodyGeo = new THREE.BoxGeometry(1.45, 2.25, 0.72);
  const wardrobeCrownGeo = new THREE.BoxGeometry(1.56, 0.14, 0.8);
  const wardrobeDoorSeamGeo = new THREE.BoxGeometry(0.04, 2.05, 0.75);
  const wardrobeHandleGeo = new THREE.BoxGeometry(0.05, 0.22, 0.06);
  const fSleepingBagGeo = new THREE.BoxGeometry(1.15, 0.16, 2.05);
  fSleepingBagGeo.translate(0, 0.08, 0);
  const fSleepingPillowGeo = new THREE.BoxGeometry(0.76, 0.14, 0.38);
  fSleepingPillowGeo.translate(0, 0.21, 0);
  const pavCarpetGeo = new THREE.BoxGeometry(9.4, 0.04, 9.6);
  const pavCarpetBorderGeo = new THREE.BoxGeometry(9.9, 0.03, 10.1);

  disposableGeometries.push(
    pavPlinthGeo,
    pavFloor1Geo,
    pavFloor2MainGeo,
    pavFloor2TopLandingGeo,
    pavFloor2FrontPatchGeo,
    pavStairGuardRailGeo,
    pavWallBackGeo,
    pavWallSideGeo,
    pavWallFrontFlankGeo,
    pavWallFrontUpperGeo,
    pavStairStepGeo,
    tableTopGeo,
    tableLegGeo,
    wardrobeBodyGeo,
    wardrobeCrownGeo,
    wardrobeDoorSeamGeo,
    wardrobeHandleGeo,
    fSleepingBagGeo,
    fSleepingPillowGeo,
    pavCarpetGeo,
    pavCarpetBorderGeo
  );

  const sleepingBagColors = [
    new THREE.MeshStandardMaterial({ color: 0x992b24, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x1e4d3b, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x243b6b, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xb87324, roughness: 0.85 }),
  ];
  disposableMaterials.push(...sleepingBagColors);

  const buildPavilionWardrobe = (wx: number, wy: number, wz: number, rotY: number) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, wy, wz);
    wGroup.rotation.y = rotY;
    const body = new THREE.Mesh(wardrobeBodyGeo, furnitureWoodMat);
    body.position.y = 1.125;
    const crown = new THREE.Mesh(wardrobeCrownGeo, archAssets.imperialCrimsonMat);
    crown.position.y = 2.3;
    const seam = new THREE.Mesh(wardrobeDoorSeamGeo, darkIronMat);
    seam.position.set(0, 1.125, 0.02);
    const handleL = new THREE.Mesh(wardrobeHandleGeo, archAssets.imperialGoldMat);
    handleL.position.set(-0.12, 1.15, 0.39);
    const handleR = new THREE.Mesh(wardrobeHandleGeo, archAssets.imperialGoldMat);
    handleR.position.set(0.12, 1.15, 0.39);
    wGroup.add(body, crown, seam, handleL, handleR);
    fortressGroup.add(wGroup);
  };

  const buildWallFlushTableAndChairs = (tx: number, ty: number, tz: number, rotY: number) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, ty, tz);
    tGroup.rotation.y = rotY;
    const top = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
    top.position.y = 0.78;
    tGroup.add(top);
    for (const lx of [-0.95, 0.95]) {
      for (const lz of [-0.45, 0.45]) {
        const leg = new THREE.Mesh(tableLegGeo, furnitureWoodMat);
        leg.position.set(lx, 0.38, lz);
        tGroup.add(leg);
      }
    }
    for (const cx of [-0.58, 0.58]) {
      const ch = new THREE.Group();
      ch.position.set(cx, 0, 0.78);
      ch.rotation.y = Math.PI;
      const seat = new THREE.Mesh(chairSeatGeo, furnitureWoodMat);
      seat.position.y = 0.45;
      const back = new THREE.Mesh(chairBackGeo, furnitureWoodMat);
      back.position.set(0, 0.74, -0.22);
      ch.add(seat, back);
      for (const clx of [-0.21, 0.21]) {
        for (const clz of [-0.21, 0.21]) {
          const cleg = new THREE.Mesh(chairLegGeo, furnitureWoodMat);
          cleg.position.set(clx, 0.225, clz);
          ch.add(cleg);
        }
      }
      tGroup.add(ch);
    }
    fortressGroup.add(tGroup);
  };

  for (const px of [-30.0, 30.0]) {
    const isWest = px < 0;
    const innerDir = isWest ? 1 : -1;
    const doorId = isWest ? 'west-pavilion-door' : 'east-pavilion-door';

    const plinth = new THREE.Mesh(pavPlinthGeo, archAssets.carvedMarbleMat);
    plinth.position.set(px, summitY + 0.15, pavCenterZ);
    const floor1 = new THREE.Mesh(pavFloor1Geo, imperialWoodFloorMat);
    floor1.position.set(px, pavFloor1Y - 0.05, pavCenterZ);
    floor1.receiveShadow = !isSoftwareGl;

    const floor2Main = new THREE.Mesh(pavFloor2MainGeo, imperialWoodFloorMat);
    floor2Main.position.set(px + (isWest ? 1.9 : -1.9), pavFloor2Y - 0.1, pavCenterZ);
    const outerStripX = px + (isWest ? -6.9 : 6.9);
    const floor2TopLanding = new THREE.Mesh(pavFloor2TopLandingGeo, imperialWoodFloorMat);
    floor2TopLanding.position.set(outerStripX, pavFloor2Y - 0.1, -169.4 + FZ);
    const floor2FrontPatch = new THREE.Mesh(pavFloor2FrontPatchGeo, imperialWoodFloorMat);
    floor2FrontPatch.position.set(outerStripX, pavFloor2Y - 0.1, -158.1 + FZ);
    const stairGuardRail = new THREE.Mesh(pavStairGuardRailGeo, archAssets.imperialCrimsonMat);
    stairGuardRail.position.set(px + (isWest ? -4.95 : 4.95), pavFloor2Y + 0.47, -163.5 + FZ);
    fortressGroup.add(plinth, floor1, floor2Main, floor2TopLanding, floor2FrontPatch, stairGuardRail);

    const backW = new THREE.Mesh(pavWallBackGeo, archAssets.imperialCrimsonMat);
    backW.position.set(px, pavFloor1Y + (pavH1 + pavH2) * 0.5, pavBackZ);
    const westW = new THREE.Mesh(pavWallSideGeo, archAssets.imperialCrimsonMat);
    westW.position.set(px - 9.0, pavFloor1Y + (pavH1 + pavH2) * 0.5, pavCenterZ);
    const eastW = new THREE.Mesh(pavWallSideGeo, archAssets.imperialCrimsonMat);
    eastW.position.set(px + 9.0, pavFloor1Y + (pavH1 + pavH2) * 0.5, pavCenterZ);
    fortressGroup.add(backW, westW, eastW);

    for (const fx of [px - 5.25, px + 5.25]) {
      const fFlank = new THREE.Mesh(pavWallFrontFlankGeo, archAssets.imperialCrimsonMat);
      fFlank.position.set(fx, pavFloor1Y + pavH1 * 0.5, pavFrontZ);
      fortressGroup.add(fFlank);
    }
    const fUpper = new THREE.Mesh(pavWallFrontUpperGeo, archAssets.imperialCrimsonMat);
    fUpper.position.set(px, pavFloor2Y + pavH2 * 0.5, pavFrontZ);
    fortressGroup.add(fUpper);

    fortressGroup.add(archAssets.createInteractiveDoubleDoor(doorId, px, pavFloor1Y, pavFrontZ, 3.0, 3.8));

    const pavSteps = 20;
    for (let s = 0; s <= pavSteps; s++) {
      const t = s / pavSteps;
      const sz = -159.5 + FZ - t * 8.0;
      const sy = pavFloor1Y + t * pavH1;
      const pStep = new THREE.Mesh(pavStairStepGeo, imperialWoodFloorMat);
      pStep.position.set(outerStripX, sy - 0.13, sz);
      fortressGroup.add(pStep);
    }

    buildWallFlushTableAndChairs(px + innerDir * 1.2, pavFloor1Y, pavBackZ + 0.85, 0);
    buildWallFlushTableAndChairs(
      px + innerDir * 8.05,
      pavFloor1Y,
      pavCenterZ + 0.8,
      isWest ? -Math.PI / 2 : Math.PI / 2
    );
    buildPavilionWardrobe(px + innerDir * 5.6, pavFloor1Y, pavBackZ + 0.68, 0);
    buildPavilionWardrobe(
      px + innerDir * 8.22,
      pavFloor1Y,
      pavBackZ + 3.8,
      isWest ? -Math.PI / 2 : Math.PI / 2
    );

    const pavCarpetCenterX = px + innerDir * 2.2;
    const pBorder = new THREE.Mesh(pavCarpetBorderGeo, archAssets.imperialGoldMat);
    pBorder.position.set(pavCarpetCenterX, pavFloor2Y + 0.015, pavCenterZ);
    const pInner = new THREE.Mesh(pavCarpetGeo, archAssets.imperialCrimsonMat);
    pInner.position.set(pavCarpetCenterX, pavFloor2Y + 0.025, pavCenterZ);
    fortressGroup.add(pBorder, pInner);

    for (let r = 0; r < 5; r++) {
      const sbX = px + innerDir * (-2.6 + r * 2.1);
      const sbZ = pavBackZ + 1.32;
      const bagMat = sleepingBagColors[(r + (isWest ? 0 : 1)) % sleepingBagColors.length];
      const sbBody = new THREE.Mesh(fSleepingBagGeo, bagMat);
      sbBody.position.set(sbX, pavFloor2Y + 0.03, sbZ);
      const sbPillow = new THREE.Mesh(fSleepingPillowGeo, pillowClothMat);
      sbPillow.position.set(sbX, pavFloor2Y + 0.03, sbZ - 0.65);
      fortressGroup.add(sbBody, sbPillow);
    }

    for (let r = 0; r < 4; r++) {
      const sbX = px + innerDir * 7.62;
      const sbZ = pavCenterZ - 2.6 + r * 1.95;
      const bagMat = sleepingBagColors[(r + (isWest ? 2 : 3)) % sleepingBagColors.length];
      const sbBody = new THREE.Mesh(fSleepingBagGeo, bagMat);
      sbBody.position.set(sbX, pavFloor2Y + 0.03, sbZ);
      sbBody.rotation.y = isWest ? -Math.PI / 2 : Math.PI / 2;
      const sbPillow = new THREE.Mesh(fSleepingPillowGeo, pillowClothMat);
      sbPillow.position.set(sbX + innerDir * 0.65, pavFloor2Y + 0.03, sbZ);
      sbPillow.rotation.y = isWest ? -Math.PI / 2 : Math.PI / 2;
      fortressGroup.add(sbBody, sbPillow);
    }

    for (let w = 0; w < 4; w++) {
      const wx = px + innerDir * (-1.2 + w * 2.6);
      buildPavilionWardrobe(wx, pavFloor2Y, pavFrontZ - 0.72, Math.PI);
    }

    const pavSkirtRoof1 = archAssets.createChinesePerimeterSkirtRoof(18.0, 15.0, 2.0, 1.05);
    pavSkirtRoof1.position.set(px, pavFloor2Y + 0.05, pavCenterZ);
    const pavRoof2 = archAssets.createChinesePagodaRoof(20.4, 17.4, 3.4);
    pavRoof2.position.set(px, pavFloor2Y + pavH2 - 0.15, pavCenterZ);
    fortressGroup.add(
      pavSkirtRoof1,
      pavRoof2,
      archAssets.createRedChineseLantern(px, pavFloor1Y + 4.2, pavCenterZ),
      archAssets.createRedChineseLantern(px, pavFloor2Y + 3.4, pavCenterZ)
    );
  }

  // --- 6) 4 CORNER WATCHTOWERS ---
  const wtFloor1Y = CHINESE_FORTRESS_POS.watchtowerFloor1Y;
  const wtFloor2Y = CHINESE_FORTRESS_POS.watchtowerFloor2Y;
  const wtFloor3Y = CHINESE_FORTRESS_POS.watchtowerFloor3Y;
  const wtH1 = wtFloor2Y - wtFloor1Y;
  const wtH2 = wtFloor3Y - wtFloor2Y;
  const wtH3 = 4.3;

  const wtFloor1Geo = new THREE.BoxGeometry(10.2, 0.25, 10.2);
  const wtUpperDeckMainGeo = new THREE.BoxGeometry(8.2, 0.24, 10.2);
  const wtUpperDeckSideGeo = new THREE.BoxGeometry(2.0, 0.24, 8.2);
  const wtWallSolidZGeo = new THREE.BoxGeometry(11.65, wtH1, 0.65);
  const wtWallSolidXGeo = new THREE.BoxGeometry(0.65, wtH1, 10.35);
  const wtWallDoorFlankGeo = new THREE.BoxGeometry(4.1, wtH1, 0.65);
  const wtCornerPillarGeo = new THREE.CylinderGeometry(0.32, 0.36, wtH2 + wtH3, 10);
  const wtParapetRailZGeo = new THREE.BoxGeometry(9.6, 1.05, 0.36);
  const wtParapetRailXGeo = new THREE.BoxGeometry(0.36, 1.05, 9.6);
  const wtFloor2InnerParapetZGeo = new THREE.BoxGeometry(6.2, 1.05, 0.36);
  const wtFloor2InnerParapetXGeo = new THREE.BoxGeometry(0.36, 1.05, 6.2);
  const supplyCrateGeo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
  const ladderRailGeo = new THREE.CylinderGeometry(0.055, 0.055, wtH1 + wtH2 + 1.1, 8);
  const ladderRungGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.78, 8);
  ladderRungGeo.rotateZ(Math.PI / 2);

  disposableGeometries.push(
    wtFloor1Geo,
    wtUpperDeckMainGeo,
    wtUpperDeckSideGeo,
    wtWallSolidZGeo,
    wtWallSolidXGeo,
    wtWallDoorFlankGeo,
    wtCornerPillarGeo,
    wtParapetRailZGeo,
    wtParapetRailXGeo,
    wtFloor2InnerParapetZGeo,
    wtFloor2InnerParapetXGeo,
    supplyCrateGeo,
    ladderRailGeo,
    ladderRungGeo
  );

  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const tw = CORNER_WATCHTOWERS[i];
    const isWest = tw.cx < 0;
    const isSouth = tw.cz > -170 + FZ;

    const wtFloor1 = new THREE.Mesh(wtFloor1Geo, imperialWoodFloorMat);
    wtFloor1.position.set(tw.cx, wtFloor1Y - 0.12, tw.cz);
    wtFloor1.receiveShadow = !isSoftwareGl;
    fortressGroup.add(wtFloor1);

    const mainDeckOffsetX = isWest ? -1.0 : 1.0;
    const sideDeckOffsetX = isWest ? 4.1 : -4.1;
    const sideDeckOffsetZ = isSouth ? 1.0 : -1.0;

    for (const deckY of [wtFloor2Y, wtFloor3Y]) {
      const mainDeck = new THREE.Mesh(wtUpperDeckMainGeo, imperialWoodFloorMat);
      mainDeck.position.set(tw.cx + mainDeckOffsetX, deckY - 0.12, tw.cz);
      mainDeck.receiveShadow = !isSoftwareGl;

      const sideDeck = new THREE.Mesh(wtUpperDeckSideGeo, imperialWoodFloorMat);
      sideDeck.position.set(tw.cx + sideDeckOffsetX, deckY - 0.12, tw.cz + sideDeckOffsetZ);
      sideDeck.receiveShadow = !isSoftwareGl;
      fortressGroup.add(mainDeck, sideDeck);
    }

    const solidZWallPos = isSouth ? tw.cz + 5.5 : tw.cz - 5.5;
    const solidZWall = new THREE.Mesh(wtWallSolidZGeo, fortressStoneMat);
    solidZWall.position.set(tw.cx, wtFloor1Y + wtH1 * 0.5, solidZWallPos);
    const westWall = new THREE.Mesh(wtWallSolidXGeo, fortressStoneMat);
    westWall.position.set(tw.cx - 5.5, wtFloor1Y + wtH1 * 0.5, tw.cz);
    const eastWall = new THREE.Mesh(wtWallSolidXGeo, fortressStoneMat);
    eastWall.position.set(tw.cx + 5.5, wtFloor1Y + wtH1 * 0.5, tw.cz);
    fortressGroup.add(solidZWall, westWall, eastWall);

    for (const fx of [tw.cx - 3.45, tw.cx + 3.45]) {
      const fFlank = new THREE.Mesh(wtWallDoorFlankGeo, fortressStoneMat);
      fFlank.position.set(fx, wtFloor1Y + wtH1 * 0.5, tw.doorZ);
      fortressGroup.add(fFlank);
    }

    fortressGroup.add(archAssets.createInteractiveDoubleDoor(tw.doorId, tw.cx, wtFloor1Y, tw.doorZ, 2.8, 3.6));

    const ladderGroup = new THREE.Group();
    ladderGroup.position.set(tw.ladderX, wtFloor1Y + (wtH1 + wtH2 + 1.1) * 0.5, tw.ladderZ);
    ladderGroup.rotation.y = (isWest ? -1 : 1) * (isSouth ? 1 : -1) * (Math.PI * 0.25);
    const railL = new THREE.Mesh(ladderRailGeo, archAssets.imperialCrimsonMat);
    railL.position.x = -0.38;
    const railR = new THREE.Mesh(ladderRailGeo, archAssets.imperialCrimsonMat);
    railR.position.x = 0.38;
    ladderGroup.add(railL, railR);

    const numRungs = 28;
    const totalLadderH = wtH1 + wtH2 + 0.8;
    for (let r = 0; r <= numRungs; r++) {
      const rung = new THREE.Mesh(ladderRungGeo, archAssets.imperialGoldMat);
      rung.position.y = -(wtH1 + wtH2 + 1.1) * 0.5 + 0.35 + (r / numRungs) * totalLadderH;
      ladderGroup.add(rung);
    }
    fortressGroup.add(ladderGroup);

    const crateCornerX = tw.cx + (isWest ? -3.4 : 3.4);
    const crateCornerZ = tw.cz + (isSouth ? 3.4 : -3.4);
    for (const [ox, oy, oz] of [
      [0, 0.58, 0],
      [isWest ? 1.25 : -1.25, 0.58, 0.1],
      [isWest ? 0.5 : -0.5, 1.72, 0.05],
    ]) {
      const crate = new THREE.Mesh(supplyCrateGeo, imperialWoodFloorMat);
      crate.position.set(crateCornerX + ox, wtFloor1Y + oy, crateCornerZ + oz);
      fortressGroup.add(crate);
    }

    for (const cx of [tw.cx - 5.15, tw.cx + 5.15]) {
      for (const cz of [tw.cz - 5.15, tw.cz + 5.15]) {
        const col = new THREE.Mesh(wtCornerPillarGeo, archAssets.imperialCrimsonMat);
        col.position.set(cx, wtFloor2Y + (wtH2 + wtH3) * 0.5, cz);
        fortressGroup.add(col);
      }
    }

    const outerZWallFloor2 = new THREE.Mesh(wtParapetRailZGeo, fortressStoneMat);
    outerZWallFloor2.position.set(tw.cx, wtFloor2Y + 0.52, isSouth ? tw.cz + 5.2 : tw.cz - 5.2);
    const outerXWallFloor2 = new THREE.Mesh(wtParapetRailXGeo, fortressStoneMat);
    outerXWallFloor2.position.set(isWest ? tw.cx - 5.2 : tw.cx + 5.2, wtFloor2Y + 0.52, tw.cz);
    fortressGroup.add(outerZWallFloor2, outerXWallFloor2);

    const innerZRail = new THREE.Mesh(wtFloor2InnerParapetZGeo, archAssets.imperialCrimsonMat);
    innerZRail.position.set(
      tw.cx + (isWest ? 1.7 : -1.7),
      wtFloor2Y + 0.52,
      isSouth ? tw.cz - 5.2 : tw.cz + 5.2
    );
    const innerXRail = new THREE.Mesh(wtFloor2InnerParapetXGeo, archAssets.imperialCrimsonMat);
    innerXRail.position.set(
      isWest ? tw.cx + 5.2 : tw.cx - 5.2,
      wtFloor2Y + 0.52,
      tw.cz + (isSouth ? -1.7 : 1.7)
    );
    fortressGroup.add(innerZRail, innerXRail);

    for (const rz of [tw.cz - 5.2, tw.cz + 5.2]) {
      const railZ = new THREE.Mesh(wtParapetRailZGeo, archAssets.imperialCrimsonMat);
      railZ.position.set(tw.cx, wtFloor3Y + 0.52, rz);
      fortressGroup.add(railZ);
    }
    for (const rx of [tw.cx - 5.2, tw.cx + 5.2]) {
      const railX = new THREE.Mesh(wtParapetRailXGeo, archAssets.imperialCrimsonMat);
      railX.position.set(rx, wtFloor3Y + 0.52, tw.cz);
      fortressGroup.add(railX);
    }

    const wtSkirtRoof2 = archAssets.createChinesePerimeterSkirtRoof(10.8, 10.8, 1.75, 1.05);
    wtSkirtRoof2.position.set(tw.cx, wtFloor3Y + 0.05, tw.cz);
    const wtTopRoof = archAssets.createChinesePagodaRoof(13.6, 13.6, 3.5);
    wtTopRoof.position.set(tw.cx, wtFloor3Y + wtH3 - 0.1, tw.cz);

    fortressGroup.add(
      wtSkirtRoof2,
      wtTopRoof,
      archAssets.createRedChineseLantern(tw.cx, wtFloor1Y + 4.1, tw.cz),
      archAssets.createRedChineseLantern(tw.cx, wtFloor2Y + 3.9, tw.cz),
      archAssets.createRedChineseLantern(tw.cx, wtFloor3Y + 3.5, tw.cz),
      archAssets.createAngledWatchtowerFlag(
        tw.cx + (isWest ? -5.15 : 5.15),
        wtFloor3Y + 2.15,
        tw.cz + (isSouth ? 5.15 : -5.15),
        Math.atan2(isSouth ? -1 : 1, isWest ? -1 : 1)
      )
    );
  }

  // --- 7) COURTYARD KUNG-FU TRAINING GROUNDS ---
  const dummyTrunkGeo = new THREE.CylinderGeometry(0.18, 0.2, 1.75, 10);
  dummyTrunkGeo.translate(0, 0.88, 0);
  const dummyBaseGeo = new THREE.CylinderGeometry(0.55, 0.62, 0.14, 10);
  dummyBaseGeo.translate(0, 0.07, 0);
  const dummyArmPegGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.58, 7);
  dummyArmPegGeo.rotateX(Math.PI / 2);
  const archeryStandGeo = new THREE.BoxGeometry(0.12, 1.85, 0.12);
  archeryStandGeo.translate(0, 0.92, 0);
  const archeryDiscOuterGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.12, 16);
  archeryDiscOuterGeo.rotateX(Math.PI / 2);
  const archeryDiscInnerGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 14);
  archeryDiscInnerGeo.rotateX(Math.PI / 2);
  const archeryBullseyeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.16, 12);
  archeryBullseyeGeo.rotateX(Math.PI / 2);

  disposableGeometries.push(
    dummyTrunkGeo,
    dummyBaseGeo,
    dummyArmPegGeo,
    archeryStandGeo,
    archeryDiscOuterGeo,
    archeryDiscInnerGeo,
    archeryBullseyeGeo
  );

  for (const [dx, dz, dyaw] of [
    [-14.5, -143.5 + FZ, Math.PI],
    [14.5, -143.5 + FZ, Math.PI],
    [-14.5, -159.5 + FZ, Math.PI],
    [14.5, -159.5 + FZ, Math.PI],
  ]) {
    const dummyGroup = new THREE.Group();
    dummyGroup.position.set(dx, summitY, dz);
    dummyGroup.rotation.y = dyaw;
    dummyGroup.add(new THREE.Mesh(dummyBaseGeo, fortressStoneMat), new THREE.Mesh(dummyTrunkGeo, furnitureWoodMat));
    for (const [ax, ay, az, ayaw] of [
      [-0.14, 1.32, 0.25, -0.2],
      [0.14, 1.32, 0.25, 0.2],
      [0, 0.98, 0.28, 0],
    ]) {
      const armPeg = new THREE.Mesh(dummyArmPegGeo, archAssets.imperialGoldMat);
      armPeg.position.set(ax, ay, az);
      armPeg.rotation.y = ayaw;
      dummyGroup.add(armPeg);
    }
    fortressGroup.add(dummyGroup);
  }

  for (const [tx, tz] of [
    [-18.0, -182.0 + FZ],
    [-12.5, -182.0 + FZ],
    [12.5, -182.0 + FZ],
    [18.0, -182.0 + FZ],
  ]) {
    const targetGroup = new THREE.Group();
    targetGroup.position.set(tx, summitY, tz);
    const standL = new THREE.Mesh(archeryStandGeo, furnitureWoodMat);
    standL.position.set(-0.42, 0, 0);
    const standR = new THREE.Mesh(archeryStandGeo, furnitureWoodMat);
    standR.position.set(0.42, 0, 0);
    const discOuter = new THREE.Mesh(archeryDiscOuterGeo, archAssets.carvedMarbleMat);
    discOuter.position.set(0, 1.25, 0.06);
    const discInner = new THREE.Mesh(archeryDiscInnerGeo, archAssets.imperialCrimsonMat);
    discInner.position.set(0, 1.25, 0.06);
    const bullseye = new THREE.Mesh(archeryBullseyeGeo, archAssets.imperialGoldMat);
    bullseye.position.set(0, 1.25, 0.06);
    targetGroup.add(standL, standR, discOuter, discInner, bullseye);
    fortressGroup.add(targetGroup);
  }

  // --- 8) 4 SHAOLIN MONKS PRACTICING KUNG-FU IN COURTYARD ---
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
  const monkStaffGeo = new THREE.CylinderGeometry(0.032, 0.032, 2.1, 6);

  disposableGeometries.push(
    monkTorsoGeo,
    monkHeadGeo,
    monkSashGeo,
    monkArmGeo,
    monkUpperLegGeo,
    monkLowerLegGeo,
    monkShoeGeo,
    monkStaffGeo
  );

  const shaolinMonks: MartialArtsMonk[] = [];
  const monkPlacements: Array<[number, number, number, number]> = [
    [-14.5, summitY, -146.0 + FZ, 0],
    [14.5, summitY, -146.0 + FZ, 0],
    [-14.5, summitY, -162.0 + FZ, 0],
    [14.5, summitY, -162.0 + FZ, 0],
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
    const staff = new THREE.Mesh(monkStaffGeo, archAssets.imperialGoldMat);
    staff.position.set(0, -0.52, 0.18);
    staff.rotation.x = Math.PI * 0.35;
    rightArm.add(staff);

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
    fortressGroup.add(mGroup);
    shaolinMonks.push({
      group: mGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      homeX: mx,
      homeY: my,
      homeZ: mz,
      baseYaw: myaw,
      phase: m * 0.85,
    });
  }

  scene.add(fortressGroup);
  distanceCulledObjects.push({
    obj: fortressGroup,
    cx: CHINESE_FORTRESS_POS.x,
    cz: -155 + FZ,
    radius: 125,
  });

  // --- 9) 3 TALL TWO-STORY HILL WATCHTOWERS ---
  const hwBasePlinthGeo = new THREE.BoxGeometry(7.8, 1.4, 7.8);
  const hwGroundFloorWoodGeo = new THREE.BoxGeometry(7.0, 0.22, 7.0);
  const hwFloor1WallH = 9.0;
  const hwWallSolidZGeo = new THREE.BoxGeometry(7.2, hwFloor1WallH, 0.46);
  const hwWallSolidXGeo = new THREE.BoxGeometry(0.46, hwFloor1WallH, 7.2);
  const hwWallDoorFlankGeo = new THREE.BoxGeometry(2.5, hwFloor1WallH, 0.46);
  const hwWallDoorLintelGeo = new THREE.BoxGeometry(2.3, hwFloor1WallH - 3.2, 0.48);
  const hwDeckMainGeo = new THREE.BoxGeometry(7.2, 0.24, 5.2);
  const hwDeckSideStripGeo = new THREE.BoxGeometry(4.9, 0.24, 2.0);
  const hwUpperPillarGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.2, 8);
  hwUpperPillarGeo.translate(0, 2.1, 0);
  const hwRailFullZGeo = new THREE.BoxGeometry(7.2, 0.98, 0.2);
  const hwRailFullXGeo = new THREE.BoxGeometry(0.2, 0.98, 7.2);
  const hwRailBridgeFlankGeo = new THREE.BoxGeometry(1.9, 0.98, 0.2);
  const hwBridgeGatePostGeo = new THREE.BoxGeometry(0.26, 1.28, 0.26);
  const hwLadderRailGeo = new THREE.BoxGeometry(0.11, 9.2, 0.11);
  const hwLadderRungGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.74, 6);
  hwLadderRungGeo.rotateZ(Math.PI / 2);

  disposableGeometries.push(
    hwBasePlinthGeo,
    hwGroundFloorWoodGeo,
    hwWallSolidZGeo,
    hwWallSolidXGeo,
    hwWallDoorFlankGeo,
    hwWallDoorLintelGeo,
    hwDeckMainGeo,
    hwDeckSideStripGeo,
    hwUpperPillarGeo,
    hwRailFullZGeo,
    hwRailFullXGeo,
    hwRailBridgeFlankGeo,
    hwBridgeGatePostGeo,
    hwLadderRailGeo,
    hwLadderRungGeo
  );

  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    const hwGroup = new THREE.Group();
    hwGroup.position.set(hw.x, hw.baseY, hw.z);
    hwGroup.rotation.y = hw.yaw;
    const deckH = hw.deckY - hw.baseY;

    const plinth = new THREE.Mesh(hwBasePlinthGeo, fortressStoneMat);
    plinth.position.set(0, -0.62, 0);
    const groundWoodFloor = new THREE.Mesh(hwGroundFloorWoodGeo, imperialWoodFloorMat);
    groundWoodFloor.position.set(0, 0.04, 0);
    const deckMain = new THREE.Mesh(hwDeckMainGeo, imperialWoodFloorMat);
    deckMain.position.set(0, deckH - 0.12, -1.0);
    const deckStrip = new THREE.Mesh(hwDeckSideStripGeo, imperialWoodFloorMat);
    deckStrip.position.set(-1.15, deckH - 0.12, 2.6);
    hwGroup.add(plinth, groundWoodFloor, deckMain, deckStrip);

    const nonDoorZ = -hw.doorSideLocalZ * 3.45;
    const doorZ = hw.doorSideLocalZ * 3.45;
    const solidZWall = new THREE.Mesh(hwWallSolidZGeo, fortressStoneMat);
    solidZWall.position.set(0, hwFloor1WallH * 0.5, nonDoorZ);
    const westWall1F = new THREE.Mesh(hwWallSolidXGeo, fortressStoneMat);
    westWall1F.position.set(-3.45, hwFloor1WallH * 0.5, 0);
    const eastWall1F = new THREE.Mesh(hwWallSolidXGeo, fortressStoneMat);
    eastWall1F.position.set(3.45, hwFloor1WallH * 0.5, 0);
    hwGroup.add(solidZWall, westWall1F, eastWall1F);

    for (const fx of [-2.35, 2.35]) {
      const flank = new THREE.Mesh(hwWallDoorFlankGeo, fortressStoneMat);
      flank.position.set(fx, hwFloor1WallH * 0.5, doorZ);
      hwGroup.add(flank);
    }
    const doorLintel = new THREE.Mesh(hwWallDoorLintelGeo, archAssets.imperialCrimsonMat);
    doorLintel.position.set(0, (3.2 + hwFloor1WallH) * 0.5, doorZ);
    const hwDoorGroup = archAssets.createInteractiveDoubleDoor(hw.doorId, 0, 0.08, doorZ, 2.2, 3.2);
    if (hw.doorSideLocalZ === -1) {
      hwDoorGroup.rotation.y = Math.PI;
    }
    hwGroup.add(doorLintel, hwDoorGroup);

    const guardTable = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
    guardTable.position.set(-2.45, 0.82, -1.2);
    guardTable.rotation.y = Math.PI / 2;
    const guardCrate = new THREE.Mesh(supplyCrateGeo, imperialWoodFloorMat);
    guardCrate.position.set(-2.45, 0.62, 1.8);
    hwGroup.add(guardTable, guardCrate, archAssets.createRedChineseLantern(0, 4.25, 0));

    const hwSkirtRoof1 = archAssets.createChinesePerimeterSkirtRoof(7.6, 7.6, 1.55, 0.95);
    hwSkirtRoof1.position.set(0, hwFloor1WallH + 0.12, 0);
    hwGroup.add(hwSkirtRoof1);

    for (const px of [-3.25, 3.25]) {
      for (const pz of [-3.25, 3.25]) {
        const col = new THREE.Mesh(hwUpperPillarGeo, archAssets.imperialCrimsonMat);
        col.position.set(px, hwFloor1WallH, pz);
        hwGroup.add(col);
      }
    }

    const lGroup = new THREE.Group();
    lGroup.position.set(hw.localLadderX, deckH * 0.5, hw.localLadderZ);
    const lRail1 = new THREE.Mesh(hwLadderRailGeo, archAssets.imperialCrimsonMat);
    lRail1.position.x = -0.35;
    const lRail2 = new THREE.Mesh(hwLadderRailGeo, archAssets.imperialCrimsonMat);
    lRail2.position.x = 0.35;
    lGroup.add(lRail1, lRail2);
    const numHwRungs = 24;
    for (let r = 0; r <= numHwRungs; r++) {
      const rung = new THREE.Mesh(hwLadderRungGeo, archAssets.imperialGoldMat);
      rung.position.y = -deckH * 0.5 + 0.35 + (r / numHwRungs) * (deckH - 0.5);
      lGroup.add(rung);
    }
    hwGroup.add(lGroup);

    for (const sideZ of [-1, 1] as const) {
      const rz = sideZ * 3.5;
      if (hw.bridgeSideLocalZ === sideZ) {
        for (const sideX of [-1, 1]) {
          const rFlank = new THREE.Mesh(hwRailBridgeFlankGeo, archAssets.imperialCrimsonMat);
          rFlank.position.set(sideX * 2.6, deckH + 0.49, rz);
          const gatePost = new THREE.Mesh(hwBridgeGatePostGeo, archAssets.imperialGoldMat);
          gatePost.position.set(sideX * 1.65, deckH + 0.64, rz);
          hwGroup.add(rFlank, gatePost);
        }
      } else {
        const rFullZ = new THREE.Mesh(hwRailFullZGeo, archAssets.imperialCrimsonMat);
        rFullZ.position.set(0, deckH + 0.49, rz);
        hwGroup.add(rFullZ);
      }
    }

    const rW = new THREE.Mesh(hwRailFullXGeo, archAssets.imperialCrimsonMat);
    rW.position.set(-3.5, deckH + 0.49, 0);
    const rE = new THREE.Mesh(hwRailFullXGeo, archAssets.imperialCrimsonMat);
    rE.position.set(3.5, deckH + 0.49, 0);
    hwGroup.add(rW, rE);

    const hwRoof = archAssets.createChinesePagodaRoof(9.6, 9.6, 3.0);
    hwRoof.position.set(0, deckH + 4.1, 0);
    hwGroup.add(
      hwRoof,
      archAssets.createRedChineseLantern(0, deckH + 3.5, 0),
      archAssets.createAngledWatchtowerFlag(-3.25, deckH + 2.15, -3.25, Math.atan2(1, -1)),
      archAssets.createAngledWatchtowerFlag(3.25, deckH + 2.15, -3.25, Math.atan2(1, 1))
    );
    scene.add(hwGroup);
    distanceCulledObjects.push({
      obj: hwGroup,
      cx: hw.x,
      cz: hw.z,
      radius: 30,
    });
  }

  // --- 10) WALKABLE ASCENDING ROPE SUSPENSION BRIDGE ---
  const ropeBridgeGroup = new THREE.Group();
  const rbBridgeYaw = Math.atan2(
    ROPE_BRIDGE_DEF.bx - ROPE_BRIDGE_DEF.ax,
    ROPE_BRIDGE_DEF.bz - ROPE_BRIDGE_DEF.az
  );

  const midGroundY = groundHeightAt(ROPE_BRIDGE_DEF.mx, ROPE_BRIDGE_DEF.mz);
  const saddleLocalY = ROPE_BRIDGE_DEF.my - midGroundY;
  const pylonHeight = saddleLocalY + 4.0;
  const pylonBaseGeo = new THREE.BoxGeometry(5.6, 2.2, 5.6);
  const pylonLegGeo = new THREE.CylinderGeometry(0.28, 0.38, pylonHeight, 8);
  pylonLegGeo.translate(0, pylonHeight * 0.5, 0);
  const pylonCrossbarGeo = new THREE.BoxGeometry(3.8, 0.32, 3.9);
  const pylonOverheadArchGeo = new THREE.BoxGeometry(4.3, 0.42, 0.48);
  const pylonSaddleDeckGeo = new THREE.BoxGeometry(3.3, 0.3, 4.4);
  const bridgePlankGeo = new THREE.BoxGeometry(2.65, 0.11, 0.42);
  const bridgeVertRopeGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.18, 5);
  bridgeVertRopeGeo.translate(0, 0.59, 0);
  const bridgeRopeMat = new THREE.MeshStandardMaterial({ color: 0xa87c4f, roughness: 0.92 });

  disposableGeometries.push(
    pylonBaseGeo,
    pylonLegGeo,
    pylonCrossbarGeo,
    pylonOverheadArchGeo,
    pylonSaddleDeckGeo,
    bridgePlankGeo,
    bridgeVertRopeGeo
  );
  disposableMaterials.push(bridgeRopeMat);

  const midPylonGroup = new THREE.Group();
  midPylonGroup.position.set(ROPE_BRIDGE_DEF.mx, midGroundY, ROPE_BRIDGE_DEF.mz);
  midPylonGroup.rotation.y = rbBridgeYaw;
  const pylonBase = new THREE.Mesh(pylonBaseGeo, fortressStoneMat);
  pylonBase.position.set(0, 0.6, 0);
  midPylonGroup.add(pylonBase);
  for (const lx of [-1.75, 1.75]) {
    for (const lz of [-1.85, 1.85]) {
      const leg = new THREE.Mesh(pylonLegGeo, barkMat);
      leg.position.set(lx, 0, lz);
      midPylonGroup.add(leg);
    }
  }
  for (let hOff = 6.0; hOff < saddleLocalY - 1.2; hOff += 6.5) {
    const crossbar = new THREE.Mesh(pylonCrossbarGeo, timberMat);
    crossbar.position.set(0, hOff, 0);
    midPylonGroup.add(crossbar);
  }
  for (const lz of [-1.85, 1.85]) {
    const overheadBeam = new THREE.Mesh(pylonOverheadArchGeo, archAssets.imperialCrimsonMat);
    overheadBeam.position.set(0, saddleLocalY + 3.85, lz);
    midPylonGroup.add(overheadBeam);
  }
  const saddleDeck = new THREE.Mesh(pylonSaddleDeckGeo, imperialWoodFloorMat);
  saddleDeck.position.set(0, saddleLocalY - 0.14, 0);
  midPylonGroup.add(
    saddleDeck,
    archAssets.createRedChineseLantern(-1.75, saddleLocalY + 3.15, 0),
    archAssets.createRedChineseLantern(1.75, saddleLocalY + 3.15, 0)
  );
  ropeBridgeGroup.add(midPylonGroup);

  const numBridgePlanks = 116;
  const tStart = ROPE_BRIDGE_DEF.deckEdgeT;
  const tEnd = 1.0 - ROPE_BRIDGE_DEF.deckEdgeT;
  const perpRightX = Math.cos(rbBridgeYaw);
  const perpRightZ = -Math.sin(rbBridgeYaw);
  const leftHandPoints: THREE.Vector3[] = [];
  const rightHandPoints: THREE.Vector3[] = [];
  const leftBottomPoints: THREE.Vector3[] = [];
  const rightBottomPoints: THREE.Vector3[] = [];

  for (let p = 0; p <= numBridgePlanks; p++) {
    const t = tStart + (p / numBridgePlanks) * (tEnd - tStart);
    const bx = ROPE_BRIDGE_DEF.ax + t * (ROPE_BRIDGE_DEF.bx - ROPE_BRIDGE_DEF.ax);
    const bz = ROPE_BRIDGE_DEF.az + t * (ROPE_BRIDGE_DEF.bz - ROPE_BRIDGE_DEF.az);
    const info = ropeBridgePointInfoAt(bx, bz);
    const by = info ? info.height : ROPE_BRIDGE_DEF.my;

    const plank = new THREE.Mesh(bridgePlankGeo, timberMat);
    plank.position.set(bx, by - 0.05, bz);
    plank.rotation.y = rbBridgeYaw;
    ropeBridgeGroup.add(plank);

    const railOffset = 1.24;
    const lx = bx - perpRightX * railOffset;
    const lz = bz - perpRightZ * railOffset;
    const rx = bx + perpRightX * railOffset;
    const rz = bz + perpRightZ * railOffset;

    leftBottomPoints.push(new THREE.Vector3(lx, by - 0.08, lz));
    rightBottomPoints.push(new THREE.Vector3(rx, by - 0.08, rz));
    leftHandPoints.push(new THREE.Vector3(lx, by + 1.12, lz));
    rightHandPoints.push(new THREE.Vector3(rx, by + 1.12, rz));

    if (p % 3 === 0) {
      const vRopeL = new THREE.Mesh(bridgeVertRopeGeo, bridgeRopeMat);
      vRopeL.position.set(lx, by - 0.04, lz);
      const vRopeR = new THREE.Mesh(bridgeVertRopeGeo, bridgeRopeMat);
      vRopeR.position.set(rx, by - 0.04, rz);
      ropeBridgeGroup.add(vRopeL, vRopeR);
    }
  }

  for (const pts of [leftHandPoints, rightHandPoints, leftBottomPoints, rightBottomPoints]) {
    const curve = new THREE.CatmullRomCurve3(pts);
    const ropeGeo = new THREE.TubeGeometry(curve, 64, 0.045, 6, false);
    disposableGeometries.push(ropeGeo);
    ropeBridgeGroup.add(new THREE.Mesh(ropeGeo, bridgeRopeMat));
  }

  scene.add(ropeBridgeGroup);
  distanceCulledObjects.push({
    obj: ropeBridgeGroup,
    cx: ROPE_BRIDGE_DEF.mx,
    cz: ROPE_BRIDGE_DEF.mz,
    radius: 120,
  });

  return {
    fortressGroup,
    updateFortress: (elapsedTime: number, playerX: number, playerZ: number) => {
      for (let m = 0; m < shaolinMonks.length; m++) {
        const mk = shaolinMonks[m];
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
