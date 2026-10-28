// ============================================================================
// MODULE: World / Models / Harbor Models
// DESIGN: Far south-east coastal harbor town, galleon ship, and lighthouse (SRP)
// SUMMARY: Constructs walled harbor quay, bazaar market, cargo warehouses,
//          amphitheater, 42m 3-masted galleon, 26m lighthouse, and soaring seagulls.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  SOUTHEAST_HARBOR_POS,
  isWithinViewDistance,
} from '../terrainMath';
import { createArchitecturalSharedAssets } from './architecturalHelpers';
import type { WorldModelBuildContext } from './types';
// #endregion

// ======================== HARBOR MODEL INTERFACES ======================== \\
// #region Harbor Model Interfaces
export interface HarborModelHandles {
  readonly harborGroup: THREE.Group;
  readonly lighthouseBeaconGroup: THREE.Group;
  readonly harborSeagullsGroup: THREE.Group;
  readonly updateHarbor: (elapsedTime: number, playerX: number, playerZ: number) => void;
}
// #endregion

// ======================== BUILD HARBOR MODELS ======================== \\
// #region Build Harbor Models
/**
 * Constructs the grand walled coastal harbor town, galleon ship, and imperial lighthouse.
 */
export function buildHarborModels(ctx: WorldModelBuildContext): HarborModelHandles {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
  } = ctx;

  const archAssets = createArchitecturalSharedAssets(ctx);
  const {
    imperialGoldMat,
    imperialCrimsonMat,
    imperialDoorWoodMat,
    pagodaTileMat,
    warmLanternMat,
    mineGoldOreMat,
    createInteractiveDoubleDoor,
    createRedChineseLantern,
    createRedImperialFlag,
  } = archAssets;

  const harborGroup = new THREE.Group();
  const hPlazaY = SOUTHEAST_HARBOR_POS.plazaY;
  const hWaterY = SOUTHEAST_HARBOR_POS.waterY;

  // Materials
  const fortressStoneMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.08,
    roughness: 0.78,
  });
  const carvedMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.45,
    metalness: 0.05,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.42,
    metalness: 0.85,
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
  const furnitureWoodMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    roughness: 0.72,
  });
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.barkAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.07,
    roughness: 0.88,
  });
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1b566b,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.86,
  });
  const foamRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const waterfallMat = new THREE.MeshBasicMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.65,
  });
  const roastDuckMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.38 });
  const mineMoltenCoalMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.65,
  });
  const sailClothMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const lhBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const seagullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

  const sleepingBagColors = [
    new THREE.MeshStandardMaterial({ color: 0x992b24, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x1e4d3b, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x243b6b, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xb87324, roughness: 0.85 }),
  ];

  disposableMaterials.push(
    fortressStoneMat,
    carvedMarbleMat,
    darkIronMat,
    timberMat,
    imperialWoodFloorMat,
    furnitureWoodMat,
    barkMat,
    waterMat,
    foamRingMat,
    waterfallMat,
    roastDuckMat,
    mineMoltenCoalMat,
    sailClothMat,
    lhBeamMat,
    seagullMat,
    ...sleepingBagColors
  );

  // 1) Paved Stone Harbor Quay Plaza, Sea-Wall & Open Eastern Ocean
  const harborQuayGeo = new THREE.BoxGeometry(55.5, 0.36, 98.0);
  const harborSeaWallGeo = new THREE.BoxGeometry(1.6, 5.2, 100.0);
  const harborParapetBlockGeo = new THREE.BoxGeometry(1.1, 0.78, 2.6);
  const oceanWaterGeo = new THREE.PlaneGeometry(680.0, 680.0, isSoftwareGl ? 32 : 56, isSoftwareGl ? 32 : 56);
  oceanWaterGeo.rotateX(-Math.PI / 2);
  const cannonCarriageGeo = new THREE.BoxGeometry(1.35, 0.52, 0.72);
  const cannonBarrelGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.85, 10);
  cannonBarrelGeo.rotateZ(Math.PI / 2);
  const cannonBallGeo = new THREE.SphereGeometry(0.18, 8, 8);
  disposableGeometries.push(
    harborQuayGeo,
    harborSeaWallGeo,
    harborParapetBlockGeo,
    oceanWaterGeo,
    cannonCarriageGeo,
    cannonBarrelGeo,
    cannonBallGeo
  );

  const quayMesh = new THREE.Mesh(harborQuayGeo, carvedMarbleMat);
  quayMesh.position.set(227.75, hPlazaY - 0.16, 263.0);
  quayMesh.receiveShadow = !isSoftwareGl;
  const seaWallMesh = new THREE.Mesh(harborSeaWallGeo, fortressStoneMat);
  seaWallMesh.position.set(255.2, hPlazaY - 2.3, 263.0);
  const openOceanMesh = new THREE.Mesh(oceanWaterGeo, waterMat);
  openOceanMesh.position.set(594.5, hWaterY, 420.0);
  harborGroup.add(quayMesh, seaWallMesh, openOceanMesh);

  // Distant Rocky Sea-Stack Islands & Foam Rings
  const seaStackRockGeo = new THREE.DodecahedronGeometry(6.5, 1);
  const seaStackFoamGeo = new THREE.RingGeometry(6.2, 11.5, 24);
  seaStackFoamGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(seaStackRockGeo, seaStackFoamGeo);
  for (const [isx, isz, isScale, isH] of [
    [358.0, 224.0, 1.35, 14.5],
    [392.0, 286.0, 1.65, 18.0],
    [342.0, 328.0, 1.15, 11.5],
  ]) {
    const stackGroup = new THREE.Group();
    stackGroup.position.set(isx, hWaterY, isz);
    const mainSpire = new THREE.Mesh(seaStackRockGeo, fortressStoneMat);
    mainSpire.scale.set(isScale, isH / 6.5, isScale * 0.9);
    mainSpire.position.y = isH * 0.32;
    const subSpire = new THREE.Mesh(seaStackRockGeo, fortressStoneMat);
    subSpire.scale.set(isScale * 0.75, (isH * 0.55) / 6.5, isScale * 0.7);
    subSpire.position.set(-4.5 * isScale, isH * 0.18, 3.8 * isScale);
    const sFoam = new THREE.Mesh(seaStackFoamGeo, foamRingMat);
    sFoam.scale.setScalar(isScale * 1.15);
    sFoam.position.y = 0.08;
    stackGroup.add(mainSpire, subSpire, sFoam);
    harborGroup.add(stackGroup);
  }

  // Sea-wall crenellations & Harbor Cannons
  for (let bz = 218; bz <= 308; bz += 6.0) {
    if (Math.abs(bz - SOUTHEAST_HARBOR_POS.pierZ) < 4.8) continue;
    const merlon = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
    merlon.position.set(255.1, hPlazaY + 0.39, bz);
    harborGroup.add(merlon);
  }
  for (const cz of [224.0, 238.0, 264.0, 278.0, 294.0]) {
    const cGroup = new THREE.Group();
    cGroup.position.set(253.8, hPlazaY, cz);
    const carriage = new THREE.Mesh(cannonCarriageGeo, timberMat);
    carriage.position.y = 0.26;
    const barrel = new THREE.Mesh(cannonBarrelGeo, darkIronMat);
    barrel.position.set(0.45, 0.62, 0);
    cGroup.add(carriage, barrel);
    for (let b = 0; b < 4; b++) {
      const ball = new THREE.Mesh(cannonBallGeo, darkIronMat);
      ball.position.set(-0.35 + (b % 2) * 0.36, 0.18 + Math.floor(b / 2) * 0.28, 0.72);
      cGroup.add(ball);
    }
    harborGroup.add(cGroup);
  }

  // 2) FORTIFIED HARBOR PERIMETER STONE WALL, CORNER BASTIONS & GATEHOUSE
  const gateTowerGeo = new THREE.BoxGeometry(5.0, 11.2, 5.0);
  gateTowerGeo.translate(0, 5.6, 0);
  const gateTowerRoofGeo = new THREE.ConeGeometry(4.0, 3.4, 4);
  gateTowerRoofGeo.rotateY(Math.PI / 4);
  const gateArchBridgeGeo = new THREE.BoxGeometry(4.6, 2.8, 8.6);
  const wallWestNorthGeo = new THREE.BoxGeometry(1.8, 6.2, 22.0);
  const wallWestSouthGeo = new THREE.BoxGeometry(1.8, 6.2, 60.0);
  const wallNorthWestGeo = new THREE.BoxGeometry(34.2, 6.2, 1.8);
  const wallNorthEastGeo = new THREE.BoxGeometry(13.6, 6.2, 1.8);
  const wallNorthArchGeo = new THREE.BoxGeometry(8.4, 1.8, 2.1);
  const wallSouthGeo = new THREE.BoxGeometry(55.4, 6.2, 1.8);
  const cornerBastionGeo = new THREE.CylinderGeometry(2.8, 3.2, 8.2, 8);
  cornerBastionGeo.translate(0, 4.1, 0);
  const cornerBastionCapGeo = new THREE.ConeGeometry(3.4, 2.6, 8);
  disposableGeometries.push(
    gateTowerGeo,
    gateTowerRoofGeo,
    gateArchBridgeGeo,
    wallWestNorthGeo,
    wallWestSouthGeo,
    wallNorthWestGeo,
    wallNorthEastGeo,
    wallNorthArchGeo,
    wallSouthGeo,
    cornerBastionGeo,
    cornerBastionCapGeo
  );

  for (const gz of [238.0, 250.0]) {
    const gTower = new THREE.Mesh(gateTowerGeo, fortressStoneMat);
    gTower.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY, gz);
    const gRoof = new THREE.Mesh(gateTowerRoofGeo, pagodaTileMat);
    gRoof.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 12.9, gz);
    harborGroup.add(
      gTower,
      gRoof,
      createRedImperialFlag(SOUTHEAST_HARBOR_POS.gateX - 2.3, hPlazaY + 9.2, gz)
    );
  }
  const gateBridge = new THREE.Mesh(gateArchBridgeGeo, carvedMarbleMat);
  gateBridge.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 8.2, SOUTHEAST_HARBOR_POS.gateZ);
  harborGroup.add(
    gateBridge,
    createRedChineseLantern(SOUTHEAST_HARBOR_POS.gateX - 2.1, hPlazaY + 6.4, SOUTHEAST_HARBOR_POS.gateZ - 2.4),
    createRedChineseLantern(SOUTHEAST_HARBOR_POS.gateX - 2.1, hPlazaY + 6.4, SOUTHEAST_HARBOR_POS.gateZ + 2.4)
  );

  const wWestN = new THREE.Mesh(wallWestNorthGeo, fortressStoneMat);
  wWestN.position.set(200.0, hPlazaY + 3.1, 225.0);
  const wWestS = new THREE.Mesh(wallWestSouthGeo, fortressStoneMat);
  wWestS.position.set(200.0, hPlazaY + 3.1, 282.0);
  const wNorthW = new THREE.Mesh(wallNorthWestGeo, fortressStoneMat);
  wNorthW.position.set(217.1, hPlazaY + 3.1, 214.0);
  const wNorthE = new THREE.Mesh(wallNorthEastGeo, fortressStoneMat);
  wNorthE.position.set(248.6, hPlazaY + 3.1, 214.0);
  const wNorthArch = new THREE.Mesh(wallNorthArchGeo, imperialCrimsonMat);
  wNorthArch.position.set(238.0, hPlazaY + 5.6, 214.0);
  const wSouth = new THREE.Mesh(wallSouthGeo, fortressStoneMat);
  wSouth.position.set(227.7, hPlazaY + 3.1, 312.0);
  harborGroup.add(wWestN, wWestS, wNorthW, wNorthE, wNorthArch, wSouth);

  for (let wz = 218.0; wz <= 308.0; wz += 4.5) {
    if (wz >= 234.5 && wz <= 253.5) continue;
    const mW = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
    mW.position.set(200.0, hPlazaY + 6.55, wz);
    harborGroup.add(mW);
  }
  for (let wx = 204.5; wx <= 251.5; wx += 4.5) {
    const mS = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
    mS.rotation.y = Math.PI / 2;
    mS.position.set(wx, hPlazaY + 6.55, 312.0);
    harborGroup.add(mS);
    if (wx < 233.5 || wx > 242.5) {
      const mN = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
      mN.rotation.y = Math.PI / 2;
      mN.position.set(wx, hPlazaY + 6.55, 214.0);
      harborGroup.add(mN);
    }
  }

  for (const [bx, bz] of [
    [200.0, 214.0],
    [200.0, 312.0],
    [255.2, 214.0],
    [255.2, 312.0],
  ]) {
    const bastion = new THREE.Mesh(cornerBastionGeo, fortressStoneMat);
    bastion.position.set(bx, hPlazaY, bz);
    const bCap = new THREE.Mesh(cornerBastionCapGeo, pagodaTileMat);
    bCap.position.set(bx, hPlazaY + 9.5, bz);
    harborGroup.add(bastion, bCap, createRedImperialFlag(bx, hPlazaY + 8.2, bz));
  }

  // 3) THE MARINER'S HARBOR TAVERN & INN
  const tavX = SOUTHEAST_HARBOR_POS.tavernX;
  const tavZ = SOUTHEAST_HARBOR_POS.tavernZ;
  const tavY = SOUTHEAST_HARBOR_POS.tavernFloorY;
  const tavernGroup = new THREE.Group();
  tavernGroup.position.set(tavX, tavY, tavZ);

  const tavFloorGeo = new THREE.BoxGeometry(16.2, 0.3, 14.8);
  const tavBackWallGeo = new THREE.BoxGeometry(16.0, 5.2, 0.45);
  const tavSideWallGeo = new THREE.BoxGeometry(0.45, 5.2, 12.0);
  const tavFrontFlankGeo = new THREE.BoxGeometry(6.7, 5.2, 0.45);
  const tavFrontLintelGeo = new THREE.BoxGeometry(2.6, 1.8, 0.48);
  const tavRoofGeo = new THREE.ConeGeometry(12.2, 4.2, 4);
  tavRoofGeo.rotateY(Math.PI / 4);
  tavRoofGeo.scale(1.05, 1.0, 0.88);
  const tavBarCounterGeo = new THREE.BoxGeometry(9.6, 1.12, 1.1);
  const aleBarrelGeo = new THREE.CylinderGeometry(0.42, 0.48, 1.05, 10);
  aleBarrelGeo.rotateZ(Math.PI / 2);
  const tavHearthGeo = new THREE.BoxGeometry(2.8, 4.8, 1.2);
  const forgeCoalMoundGeo = new THREE.SphereGeometry(0.38, 8, 6);
  const tableTopGeo = new THREE.BoxGeometry(2.1, 0.1, 1.25);
  const feastPlatterGeo = new THREE.CylinderGeometry(0.52, 0.45, 0.06, 12);
  const roastDuckGeo = new THREE.SphereGeometry(0.24, 8, 8);

  disposableGeometries.push(
    tavFloorGeo,
    tavBackWallGeo,
    tavSideWallGeo,
    tavFrontFlankGeo,
    tavFrontLintelGeo,
    tavRoofGeo,
    tavBarCounterGeo,
    aleBarrelGeo,
    tavHearthGeo,
    forgeCoalMoundGeo,
    tableTopGeo,
    feastPlatterGeo,
    roastDuckGeo
  );

  const tavFloor = new THREE.Mesh(tavFloorGeo, imperialWoodFloorMat);
  tavFloor.position.set(0, -0.15, 1.2);
  const tavBackW = new THREE.Mesh(tavBackWallGeo, timberMat);
  tavBackW.position.set(0, 2.6, -6.0);
  const tavWestW = new THREE.Mesh(tavSideWallGeo, timberMat);
  tavWestW.position.set(-8.0, 2.6, 0);
  const tavEastW = new THREE.Mesh(tavSideWallGeo, timberMat);
  tavEastW.position.set(8.0, 2.6, 0);
  const tavFrontL = new THREE.Mesh(tavFrontFlankGeo, timberMat);
  tavFrontL.position.set(-4.65, 2.6, 6.0);
  const tavFrontR = new THREE.Mesh(tavFrontFlankGeo, timberMat);
  tavFrontR.position.set(4.65, 2.6, 6.0);
  const tavLintel = new THREE.Mesh(tavFrontLintelGeo, imperialCrimsonMat);
  tavLintel.position.set(0, 4.3, 6.0);
  const tavRoof = new THREE.Mesh(tavRoofGeo, barkMat);
  tavRoof.position.set(0, 7.1, 0.5);
  tavernGroup.add(
    tavFloor,
    tavBackW,
    tavWestW,
    tavEastW,
    tavFrontL,
    tavFrontR,
    tavLintel,
    tavRoof,
    createInteractiveDoubleDoor('harbor-tavern-door', 0, 0, 6.0, 2.6, 3.4)
  );

  const barCounter = new THREE.Mesh(tavBarCounterGeo, furnitureWoodMat);
  barCounter.position.set(-2.5, 0.56, -3.2);
  tavernGroup.add(barCounter);
  for (let b = 0; b < 8; b++) {
    const barrel = new THREE.Mesh(aleBarrelGeo, barkMat);
    barrel.position.set(-6.2 + (b % 4) * 1.85, 0.52 + Math.floor(b / 4) * 0.92, -5.1);
    tavernGroup.add(barrel);
  }
  const hearthMesh = new THREE.Mesh(tavHearthGeo, fortressStoneMat);
  hearthMesh.position.set(4.8, 2.4, -5.2);
  const hearthFire = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
  hearthFire.position.set(4.8, 0.35, -4.6);
  tavernGroup.add(
    hearthMesh,
    hearthFire,
    createRedChineseLantern(-3.2, 4.2, 0),
    createRedChineseLantern(3.2, 4.2, 0)
  );
  for (const [tx, tz] of [
    [-4.5, 1.2],
    [-4.5, 3.8],
    [4.2, 1.2],
    [4.2, 3.8],
  ]) {
    const tTop = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
    tTop.position.set(tx, 0.78, tz);
    const platter = new THREE.Mesh(feastPlatterGeo, imperialGoldMat);
    platter.position.set(tx, 0.86, tz);
    const roast = new THREE.Mesh(roastDuckGeo, roastDuckMat);
    roast.position.set(tx, 1.0, tz);
    tavernGroup.add(tTop, platter, roast);
  }
  harborGroup.add(tavernGroup);

  // 4) TWO-TIER MARBLE FOUNTAIN & HARBOR BAZAAR STALLS
  const fountainBaseSlabGeo = new THREE.CylinderGeometry(4.45, 4.65, 0.24, 16);
  const fountainWallSegGeo = new THREE.BoxGeometry(1.78, 1.06, 0.52);
  const fountainCopingSegGeo = new THREE.BoxGeometry(1.88, 0.14, 0.66);
  const fountainWaterGeo = new THREE.CylinderGeometry(3.88, 3.88, 0.12, 24);
  const fountainPillarGeo = new THREE.CylinderGeometry(0.62, 0.88, 2.4, 12);
  const fountainUpperBowlGeo = new THREE.CylinderGeometry(1.85, 0.72, 0.48, 16);
  const fountainUpperWaterGeo = new THREE.CylinderGeometry(1.62, 1.62, 0.08, 16);
  const fountainJetStreamGeo = new THREE.CylinderGeometry(0.06, 0.14, 1.38, 8);
  const anchorShankGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8);
  const anchorFlukeGeo = new THREE.TorusGeometry(0.95, 0.16, 8, 16, Math.PI);
  const stallCanopyGeo = new THREE.BoxGeometry(4.4, 0.18, 3.4);
  const stallCounterGeo = new THREE.BoxGeometry(3.8, 0.88, 1.2);
  const spiceBasketGeo = new THREE.CylinderGeometry(0.38, 0.3, 0.45, 8);
  const balustradePostGeo = new THREE.BoxGeometry(0.18, 1.0, 0.18);
  const weaponRackBarGeo = new THREE.BoxGeometry(1.8, 0.14, 0.42);
  const chestBodyGeo = new THREE.BoxGeometry(1.2, 0.72, 0.8);
  const supplyCrateGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);

  disposableGeometries.push(
    fountainBaseSlabGeo,
    fountainWallSegGeo,
    fountainCopingSegGeo,
    fountainWaterGeo,
    fountainPillarGeo,
    fountainUpperBowlGeo,
    fountainUpperWaterGeo,
    fountainJetStreamGeo,
    anchorShankGeo,
    anchorFlukeGeo,
    stallCanopyGeo,
    stallCounterGeo,
    spiceBasketGeo,
    balustradePostGeo,
    weaponRackBarGeo,
    chestBodyGeo,
    supplyCrateGeo
  );

  const fntGroup = new THREE.Group();
  fntGroup.position.set(SOUTHEAST_HARBOR_POS.fountainX, hPlazaY, SOUTHEAST_HARBOR_POS.fountainZ);
  const fBaseSlab = new THREE.Mesh(fountainBaseSlabGeo, fortressStoneMat);
  fBaseSlab.position.y = 0.12;
  fntGroup.add(fBaseSlab);

  for (let w = 0; w < 16; w++) {
    const ang = (w / 16) * Math.PI * 2;
    const wx = Math.sin(ang) * 4.12;
    const wz = Math.cos(ang) * 4.12;
    const wallSeg = new THREE.Mesh(fountainWallSegGeo, carvedMarbleMat);
    wallSeg.position.set(wx, 0.53, wz);
    wallSeg.rotation.y = ang;
    const copingSeg = new THREE.Mesh(fountainCopingSegGeo, imperialCrimsonMat);
    copingSeg.position.set(wx, 1.08, wz);
    copingSeg.rotation.y = ang;
    fntGroup.add(wallSeg, copingSeg);
  }

  const fWat = new THREE.Mesh(fountainWaterGeo, waterMat);
  fWat.position.y = 0.74;
  const fCol = new THREE.Mesh(fountainPillarGeo, carvedMarbleMat);
  fCol.position.y = 1.35;
  const fUpperBowl = new THREE.Mesh(fountainUpperBowlGeo, carvedMarbleMat);
  fUpperBowl.position.y = 2.15;
  const fUpperWat = new THREE.Mesh(fountainUpperWaterGeo, waterMat);
  fUpperWat.position.y = 2.38;
  for (let j = 0; j < 4; j++) {
    const jAng = (j / 4) * Math.PI * 2 + Math.PI / 4;
    const jet = new THREE.Mesh(fountainJetStreamGeo, waterfallMat);
    jet.position.set(Math.cos(jAng) * 1.45, 1.48, Math.sin(jAng) * 1.45);
    jet.rotation.z = -Math.cos(jAng) * 0.22;
    jet.rotation.x = Math.sin(jAng) * 0.22;
    fntGroup.add(jet);
  }
  const aShank = new THREE.Mesh(anchorShankGeo, imperialGoldMat);
  aShank.position.y = 3.55;
  const aFluke = new THREE.Mesh(anchorFlukeGeo, imperialGoldMat);
  aFluke.position.y = 3.05;
  aFluke.rotation.z = Math.PI;
  fntGroup.add(fWat, fCol, fUpperBowl, fUpperWat, aShank, aFluke);
  harborGroup.add(fntGroup);

  const stallPlacements: Array<[number, number, number, THREE.Material]> = [
    [212.0, 254.0, 0, imperialCrimsonMat],
    [212.0, 263.0, 0, sleepingBagColors[2]],
    [224.0, 263.0, 0, sleepingBagColors[1]],
    [240.0, 263.0, 0, sleepingBagColors[3]],
    [246.0, 238.0, -Math.PI / 2, imperialCrimsonMat],
    [246.0, 246.0, -Math.PI / 2, sleepingBagColors[0]],
  ];
  for (let s = 0; s < stallPlacements.length; s++) {
    const [sx, sz, syaw, canopyMat] = stallPlacements[s];
    const stGroup = new THREE.Group();
    stGroup.position.set(sx, hPlazaY, sz);
    stGroup.rotation.y = syaw;
    const counter = new THREE.Mesh(stallCounterGeo, furnitureWoodMat);
    counter.position.set(0, 0.44, 0);
    const canopy = new THREE.Mesh(stallCanopyGeo, canopyMat);
    canopy.position.set(0, 2.75, 0);
    canopy.rotation.x = 0.12;
    stGroup.add(counter, canopy);
    for (const px of [-1.9, 1.9]) {
      for (const pz of [-1.4, 1.4]) {
        const post = new THREE.Mesh(balustradePostGeo, barkMat);
        post.scale.set(0.55, 2.0, 0.55);
        post.position.set(px, 0, pz);
        stGroup.add(post);
      }
    }

    if (s === 0 || s === 1 || s === 4) {
      const displayRack = new THREE.Mesh(weaponRackBarGeo, imperialGoldMat);
      displayRack.scale.set(0.85, 1, 1);
      displayRack.position.set(-0.65, 1.18, -0.10);
      const goldChest = new THREE.Mesh(chestBodyGeo, imperialGoldMat);
      goldChest.scale.setScalar(0.55);
      goldChest.position.set(0.95, 1.04, 0.05);
      stGroup.add(displayRack, goldChest);
    } else {
      for (let b = 0; b < 3; b++) {
        const basket = new THREE.Mesh(
          spiceBasketGeo,
          sleepingBagColors[(s + b) % sleepingBagColors.length]
        );
        basket.position.set(-1.15 + b * 0.85, 1.05, 0);
        stGroup.add(basket);
      }
      const goldChest = new THREE.Mesh(chestBodyGeo, imperialGoldMat);
      goldChest.scale.setScalar(0.52);
      goldChest.position.set(1.15, 1.04, 0);
      stGroup.add(goldChest);
    }

    const crate = new THREE.Mesh(supplyCrateGeo, imperialWoodFloorMat);
    crate.position.set(2.4, 0.58, -0.6);
    stGroup.add(crate);
    harborGroup.add(stGroup);
  }

  // 5) HARBOR CUSTOMS & CARGO WAREHOUSE DISTRICT
  const whX = SOUTHEAST_HARBOR_POS.warehouseX;
  const whZ = SOUTHEAST_HARBOR_POS.warehouseZ;
  const whY = SOUTHEAST_HARBOR_POS.warehouseFloorY;
  const warehouseGroup = new THREE.Group();
  warehouseGroup.position.set(whX, whY, whZ);

  const whFloorGeo = new THREE.BoxGeometry(17.4, 0.3, 12.2);
  const whSouthWallGeo = new THREE.BoxGeometry(17.0, 5.6, 0.48);
  const whSideWallGeo = new THREE.BoxGeometry(0.48, 5.6, 11.0);
  const whNorthFlankGeo = new THREE.BoxGeometry(7.1, 5.6, 0.48);
  const whNorthLintelGeo = new THREE.BoxGeometry(2.8, 2.2, 0.5);
  const whRoofGeo = new THREE.ConeGeometry(12.6, 4.4, 4);
  whRoofGeo.rotateY(Math.PI / 4);
  whRoofGeo.scale(1.08, 1.0, 0.78);
  const whHoistBeamGeo = new THREE.BoxGeometry(0.32, 0.32, 3.2);
  const whRackShelfGeo = new THREE.BoxGeometry(4.8, 0.16, 1.4);
  const grainSackGeo = new THREE.SphereGeometry(0.36, 8, 8);

  disposableGeometries.push(
    whFloorGeo,
    whSouthWallGeo,
    whSideWallGeo,
    whNorthFlankGeo,
    whNorthLintelGeo,
    whRoofGeo,
    whHoistBeamGeo,
    whRackShelfGeo,
    grainSackGeo
  );

  const whFloor = new THREE.Mesh(whFloorGeo, imperialWoodFloorMat);
  whFloor.position.set(0, -0.15, -0.3);
  const whSouthW = new THREE.Mesh(whSouthWallGeo, fortressStoneMat);
  whSouthW.position.set(0, 2.8, 5.5);
  const whWestW = new THREE.Mesh(whSideWallGeo, fortressStoneMat);
  whWestW.position.set(-8.5, 2.8, 0);
  const whEastW = new THREE.Mesh(whSideWallGeo, fortressStoneMat);
  whEastW.position.set(8.5, 2.8, 0);
  const whNorthL = new THREE.Mesh(whNorthFlankGeo, timberMat);
  whNorthL.position.set(-4.95, 2.8, -5.5);
  const whNorthR = new THREE.Mesh(whNorthFlankGeo, timberMat);
  whNorthR.position.set(4.95, 2.8, -5.5);
  const whLintel = new THREE.Mesh(whNorthLintelGeo, imperialCrimsonMat);
  whLintel.position.set(0, 4.5, -5.5);
  const whRoof = new THREE.Mesh(whRoofGeo, pagodaTileMat);
  whRoof.position.set(0, 7.6, 0);
  const whHoistBeam = new THREE.Mesh(whHoistBeamGeo, barkMat);
  whHoistBeam.position.set(0, 5.8, -6.4);
  const whHangingCrate = new THREE.Mesh(supplyCrateGeo, furnitureWoodMat);
  whHangingCrate.position.set(0, 4.4, -7.4);

  const whDoorGroup = createInteractiveDoubleDoor(
    SOUTHEAST_HARBOR_POS.warehouseDoorId,
    0,
    0,
    -5.5,
    2.8,
    3.4
  );
  whDoorGroup.position.set(0, 0, -5.5);
  whDoorGroup.rotation.y = Math.PI;
  for (const child of whDoorGroup.children) {
    child.position.z = 0;
  }

  warehouseGroup.add(
    whFloor,
    whSouthW,
    whWestW,
    whEastW,
    whNorthL,
    whNorthR,
    whLintel,
    whRoof,
    whHoistBeam,
    whHangingCrate,
    whDoorGroup,
    createRedChineseLantern(-2.4, 3.8, -5.9),
    createRedChineseLantern(2.4, 3.8, -5.9)
  );

  for (const side of [-1, 1]) {
    for (const sy of [1.4, 2.8]) {
      const shelf = new THREE.Mesh(whRackShelfGeo, barkMat);
      shelf.position.set(side * 5.4, sy, 2.2);
      warehouseGroup.add(shelf);
    }
    for (let c = 0; c < 6; c++) {
      const crate = new THREE.Mesh(supplyCrateGeo, c % 2 === 0 ? furnitureWoodMat : imperialWoodFloorMat);
      crate.position.set(
        side * (4.2 + (c % 2) * 1.4),
        0.58 + Math.floor(c / 2) * 1.15,
        -2.2 + (c % 3) * 1.6
      );
      warehouseGroup.add(crate);
    }
  }
  for (let b = 0; b < 10; b++) {
    const barrel = new THREE.Mesh(aleBarrelGeo, barkMat);
    barrel.position.set(-4.5 + (b % 5) * 2.2, 0.52 + Math.floor(b / 5) * 0.92, 4.3);
    warehouseGroup.add(barrel);
  }
  for (let g = 0; g < 8; g++) {
    const sack = new THREE.Mesh(grainSackGeo, sleepingBagColors[1]);
    sack.position.set(-2.4 + (g % 4) * 1.1, 0.32 + Math.floor(g / 4) * 0.52, 1.8);
    warehouseGroup.add(sack);
  }
  const qmDesk = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
  qmDesk.position.set(0, 0.78, -1.2);
  warehouseGroup.add(
    qmDesk,
    createRedChineseLantern(-3.8, 4.4, 0),
    createRedChineseLantern(3.8, 4.4, 0)
  );
  harborGroup.add(warehouseGroup);

  // Dockside Storage Shed
  const shedGroup = new THREE.Group();
  shedGroup.position.set(SOUTHEAST_HARBOR_POS.cargoShedX, hPlazaY, SOUTHEAST_HARBOR_POS.cargoShedZ);
  const shedDeckGeo = new THREE.BoxGeometry(12.0, 0.24, 9.0);
  const shedRoofGeo = new THREE.BoxGeometry(12.6, 0.36, 9.6);
  const scaffoldLegGeo = new THREE.CylinderGeometry(0.14, 0.16, 4.6, 6);
  const craneArmGeo = new THREE.BoxGeometry(4.2, 0.28, 0.28);
  disposableGeometries.push(shedDeckGeo, shedRoofGeo, scaffoldLegGeo, craneArmGeo);

  const shedDeck = new THREE.Mesh(shedDeckGeo, timberMat);
  shedDeck.position.y = 0.12;
  const shedRoof = new THREE.Mesh(shedRoofGeo, barkMat);
  shedRoof.position.y = 4.2;
  shedRoof.rotation.x = 0.08;
  shedGroup.add(shedDeck, shedRoof);
  for (const sx of [-5.4, 0, 5.4]) {
    for (const sz of [-3.9, 3.9]) {
      const post = new THREE.Mesh(scaffoldLegGeo, barkMat);
      post.position.set(sx, 0, sz);
      shedGroup.add(post);
    }
  }
  for (let c = 0; c < 6; c++) {
    const cx = -3.6 + (c % 3) * 3.6;
    const cz = -1.6 + Math.floor(c / 3) * 2.8;
    const cr = new THREE.Mesh(supplyCrateGeo, c % 2 === 0 ? imperialWoodFloorMat : furnitureWoodMat);
    cr.position.set(cx, 0.7, cz);
    shedGroup.add(cr);
    if (c < 3) {
      const topCr = new THREE.Mesh(supplyCrateGeo, c % 2 === 1 ? imperialWoodFloorMat : furnitureWoodMat);
      topCr.position.set(cx, 1.82, cz);
      shedGroup.add(topCr);
    }
  }
  const craneMast = new THREE.Mesh(scaffoldLegGeo, barkMat);
  craneMast.scale.set(1.4, 1.6, 1.4);
  craneMast.position.set(7.8, 0, -2.5);
  const craneJib = new THREE.Mesh(craneArmGeo, timberMat);
  craneJib.position.set(9.4, 6.2, -2.5);
  craneJib.rotation.z = 0.28;
  shedGroup.add(craneMast, craneJib);
  harborGroup.add(shedGroup);

  // 6) MARBLE AMPHITHEATER & COLONNADE
  const amphGroup = new THREE.Group();
  amphGroup.position.set(SOUTHEAST_HARBOR_POS.amphitheaterX, hPlazaY, SOUTHEAST_HARBOR_POS.amphitheaterZ);
  const amphStageGeo = new THREE.CylinderGeometry(6.4, 6.8, 0.36, 24);
  const amphBenchSegGeo = new THREE.BoxGeometry(2.6, 1.0, 1.65);
  const amphColGeo = new THREE.CylinderGeometry(0.36, 0.42, 5.6, 12);
  amphColGeo.translate(0, 2.8, 0);
  const amphArchBeamGeo = new THREE.BoxGeometry(5.2, 0.48, 0.65);
  disposableGeometries.push(amphStageGeo, amphBenchSegGeo, amphColGeo, amphArchBeamGeo);

  const stageMesh = new THREE.Mesh(amphStageGeo, carvedMarbleMat);
  stageMesh.position.y = 0.18;
  amphGroup.add(stageMesh);

  for (let tier = 0; tier < 5; tier++) {
    const rad = 7.8 + tier * 1.65;
    const tierH = 0.55 + tier * 0.56;
    const numSegs = 12 + tier * 2;
    for (let s = 0; s < numSegs; s++) {
      const ang = -Math.PI * 0.44 + (s / (numSegs - 1)) * (Math.PI * 0.88);
      const bx = Math.sin(ang) * rad;
      const bz = Math.cos(ang) * rad;
      const bench = new THREE.Mesh(amphBenchSegGeo, tier % 2 === 0 ? carvedMarbleMat : fortressStoneMat);
      bench.scale.set(1.0 + tier * 0.1, tierH, 1.0);
      bench.position.set(bx, tierH * 0.5, bz);
      bench.rotation.y = ang;
      amphGroup.add(bench);
    }
  }
  for (let c = 0; c < 6; c++) {
    const ang = -Math.PI * 0.4 + (c / 5) * (Math.PI * 0.8);
    const cx = Math.sin(ang) * 15.6;
    const cz = Math.cos(ang) * 15.6;
    const col = new THREE.Mesh(amphColGeo, carvedMarbleMat);
    col.position.set(cx, 2.8, cz);
    amphGroup.add(col, createRedChineseLantern(cx, 8.2, cz));
    if (c < 5) {
      const nextAng = -Math.PI * 0.4 + ((c + 1) / 5) * (Math.PI * 0.8);
      const nx = Math.sin(nextAng) * 15.6;
      const nz = Math.cos(nextAng) * 15.6;
      const beam = new THREE.Mesh(amphArchBeamGeo, imperialCrimsonMat);
      beam.position.set((cx + nx) * 0.5, 8.4, (cz + nz) * 0.5);
      beam.rotation.y = (ang + nextAng) * 0.5;
      amphGroup.add(beam);
    }
  }
  harborGroup.add(amphGroup);

  // 7) WOODEN HARBOR PIER & 42m 3-MASTED GALLEON SHIP
  const pierLen = SOUTHEAST_HARBOR_POS.pierEndX - SOUTHEAST_HARBOR_POS.pierStartX;
  const hPierDeckGeo = new THREE.BoxGeometry(pierLen, 0.28, SOUTHEAST_HARBOR_POS.pierHalfW * 2);
  const gangplankGeo = new THREE.BoxGeometry(5.4, 0.2, 3.8);
  const pilingGeo = new THREE.CylinderGeometry(0.24, 0.28, 2.6, 8);
  disposableGeometries.push(hPierDeckGeo, gangplankGeo, pilingGeo);

  const hPierDeck = new THREE.Mesh(hPierDeckGeo, timberMat);
  hPierDeck.position.set(
    (SOUTHEAST_HARBOR_POS.pierStartX + SOUTHEAST_HARBOR_POS.pierEndX) * 0.5,
    SOUTHEAST_HARBOR_POS.pierY - 0.14,
    SOUTHEAST_HARBOR_POS.pierZ
  );
  harborGroup.add(hPierDeck);

  for (let px = 256.0; px <= 271.0; px += 3.5) {
    for (const pz of [249.4, 254.6]) {
      const piling = new THREE.Mesh(pilingGeo, barkMat);
      piling.scale.y = 3.2;
      piling.position.set(px, 0.9, pz);
      harborGroup.add(piling);
    }
  }
  const gangplank = new THREE.Mesh(gangplankGeo, imperialWoodFloorMat);
  gangplank.position.set(273.5, 3.45, SOUTHEAST_HARBOR_POS.pierZ);
  gangplank.rotation.z = Math.atan2(
    SOUTHEAST_HARBOR_POS.shipDeckY - SOUTHEAST_HARBOR_POS.pierY,
    5.0
  );
  harborGroup.add(gangplank);

  const shipGroup = new THREE.Group();
  shipGroup.position.set(
    SOUTHEAST_HARBOR_POS.shipX,
    SOUTHEAST_HARBOR_POS.shipDeckY,
    SOUTHEAST_HARBOR_POS.shipZ
  );

  const hullMainGeo = new THREE.BoxGeometry(12.8, 4.2, 37.0);
  const hullBowConeGeo = new THREE.ConeGeometry(6.4, 9.5, 4);
  hullBowConeGeo.rotateX(-Math.PI / 2);
  hullBowConeGeo.rotateZ(Math.PI / 4);
  const bowspritSparGeo = new THREE.CylinderGeometry(0.14, 0.28, 11.5, 8);
  bowspritSparGeo.rotateX(Math.PI * 0.36);
  const shipMainDeckGeo = new THREE.BoxGeometry(12.6, 0.26, 41.6);
  const shipQuarterdeckSlabGeo = new THREE.BoxGeometry(12.6, 0.28, 13.4);
  const cabinSideWallGeo = new THREE.BoxGeometry(0.38, 3.0, 13.3);
  const cabinSternWallGeo = new THREE.BoxGeometry(12.6, 3.0, 0.42);
  const cabinFrontFlankGeo = new THREE.BoxGeometry(2.2, 3.0, 0.42);
  const cabinFrontLintelGeo = new THREE.BoxGeometry(2.6, 0.65, 0.44);
  const sternWindowPaneGeo = new THREE.BoxGeometry(2.2, 1.35, 0.52);
  const shipBulwarkSideGeo = new THREE.BoxGeometry(0.34, 1.1, 17.6);
  const shipBulwarkEndGeo = new THREE.BoxGeometry(12.6, 1.15, 0.38);
  const shipMastGeo = new THREE.CylinderGeometry(0.24, 0.4, 23.5, 10);
  shipMastGeo.translate(0, 11.75, 0);
  const shipYardarmGeo = new THREE.CylinderGeometry(0.11, 0.14, 10.6, 8);
  shipYardarmGeo.rotateZ(Math.PI / 2);
  const shipSailGeo = new THREE.PlaneGeometry(9.8, 5.4, 8, 4);
  const sailPos = shipSailGeo.attributes.position;
  for (let i = 0; i < sailPos.count; i++) {
    const sx = sailPos.getX(i);
    const sy = sailPos.getY(i);
    const billow = Math.cos((sx / 9.8) * Math.PI) * Math.cos((sy / 5.4) * Math.PI) * 1.25;
    sailPos.setZ(i, -billow);
  }
  shipSailGeo.computeVertexNormals();
  const shipWheelRimGeo = new THREE.TorusGeometry(0.78, 0.075, 8, 20);
  const shipWheelSpokeGeo = new THREE.CylinderGeometry(0.032, 0.032, 1.88, 6);
  const shipHelmStandGeo = new THREE.BoxGeometry(0.46, 1.32, 0.38);
  const binnacleStandGeo = new THREE.CylinderGeometry(0.22, 0.28, 1.05, 10);
  const treasureChestGeo = new THREE.BoxGeometry(1.5, 0.95, 1.05);
  const captainBedGeo = new THREE.BoxGeometry(2.6, 0.68, 3.4);
  const captainPillowGeo = new THREE.BoxGeometry(2.2, 0.24, 0.65);
  const shipStepGeo = new THREE.BoxGeometry(2.4, 0.22, 0.52);
  const qDeckFrontRailGeo = new THREE.BoxGeometry(6.6, 0.95, 0.28);

  disposableGeometries.push(
    hullMainGeo,
    hullBowConeGeo,
    bowspritSparGeo,
    shipMainDeckGeo,
    shipQuarterdeckSlabGeo,
    cabinSideWallGeo,
    cabinSternWallGeo,
    cabinFrontFlankGeo,
    cabinFrontLintelGeo,
    sternWindowPaneGeo,
    shipBulwarkSideGeo,
    shipBulwarkEndGeo,
    shipMastGeo,
    shipYardarmGeo,
    shipSailGeo,
    shipWheelRimGeo,
    shipWheelSpokeGeo,
    shipHelmStandGeo,
    binnacleStandGeo,
    treasureChestGeo,
    captainBedGeo,
    captainPillowGeo,
    shipStepGeo,
    qDeckFrontRailGeo
  );

  const hullMesh = new THREE.Mesh(hullMainGeo, barkMat);
  hullMesh.position.set(0, -1.95, 0);
  const bowCone = new THREE.Mesh(hullBowConeGeo, barkMat);
  bowCone.position.set(0, -1.25, -21.5);
  const bowsprit = new THREE.Mesh(bowspritSparGeo, timberMat);
  bowsprit.position.set(0, 1.45, -23.5);
  const mainDeckMesh = new THREE.Mesh(shipMainDeckGeo, imperialWoodFloorMat);
  mainDeckMesh.position.set(0, -0.12, 0);
  const qDeckSlab = new THREE.Mesh(shipQuarterdeckSlabGeo, imperialWoodFloorMat);
  qDeckSlab.position.set(0, 3.0 - 0.14, 14.15);
  shipGroup.add(hullMesh, bowCone, bowsprit, mainDeckMesh, qDeckSlab);

  const cabWallPort = new THREE.Mesh(cabinSideWallGeo, timberMat);
  cabWallPort.position.set(-6.1, 1.5, 14.15);
  const cabWallStbd = new THREE.Mesh(cabinSideWallGeo, timberMat);
  cabWallStbd.position.set(6.1, 1.5, 14.15);
  const cabWallStern = new THREE.Mesh(cabinSternWallGeo, timberMat);
  cabWallStern.position.set(0, 1.5, 20.65);
  const cabFrontL = new THREE.Mesh(cabinFrontFlankGeo, timberMat);
  cabFrontL.position.set(-2.3, 1.5, 7.5);
  const cabFrontR = new THREE.Mesh(cabinFrontFlankGeo, timberMat);
  cabFrontR.position.set(2.3, 1.5, 7.5);
  const cabFrontLintel = new THREE.Mesh(cabinFrontLintelGeo, imperialCrimsonMat);
  cabFrontLintel.position.set(0, 2.68, 7.5);
  const captainDoor = createInteractiveDoubleDoor(
    SOUTHEAST_HARBOR_POS.shipCaptainDoorId,
    0,
    0,
    7.5,
    2.4,
    2.35
  );
  shipGroup.add(cabWallPort, cabWallStbd, cabWallStern, cabFrontL, cabFrontR, cabFrontLintel, captainDoor);

  for (const wx of [-3.6, 0, 3.6]) {
    const winMesh = new THREE.Mesh(sternWindowPaneGeo, warmLanternMat);
    winMesh.position.set(wx, 1.75, 20.68);
    const winFrame = new THREE.Mesh(sternWindowPaneGeo, imperialGoldMat);
    winFrame.scale.set(1.12, 1.15, 0.85);
    winFrame.position.set(wx, 1.75, 20.68);
    shipGroup.add(winFrame, winMesh);
  }

  const cBedMattress = new THREE.Mesh(captainBedGeo, imperialCrimsonMat);
  cBedMattress.position.set(3.8, 0.42, 16.8);
  const cBedPillow = new THREE.Mesh(captainPillowGeo, imperialGoldMat);
  cBedPillow.position.set(3.8, 0.86, 18.0);
  shipGroup.add(cBedMattress, cBedPillow);
  for (const [bpx, bpz] of [
    [2.6, 15.2],
    [5.0, 15.2],
    [2.6, 18.4],
    [5.0, 18.4],
  ]) {
    const bPost = new THREE.Mesh(balustradePostGeo, furnitureWoodMat);
    bPost.scale.set(0.65, 2.1, 0.65);
    bPost.position.set(bpx, 0, bpz);
    shipGroup.add(bPost);
  }
  const navTable = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
  navTable.scale.set(1.3, 1.0, 1.4);
  navTable.position.set(-0.6, 0.78, 13.8);
  const seaChart = new THREE.Mesh(feastPlatterGeo, carvedMarbleMat);
  seaChart.scale.set(1.8, 0.3, 1.4);
  seaChart.position.set(-0.6, 0.86, 13.8);
  const capChest1 = new THREE.Mesh(treasureChestGeo, barkMat);
  capChest1.position.set(-4.2, 0.48, 16.5);
  const capGold1 = new THREE.Mesh(forgeCoalMoundGeo, mineGoldOreMat);
  capGold1.position.set(-4.2, 0.96, 16.5);
  const capChest2 = new THREE.Mesh(treasureChestGeo, imperialCrimsonMat);
  capChest2.position.set(-4.2, 0.48, 11.8);
  shipGroup.add(
    navTable,
    seaChart,
    capChest1,
    capGold1,
    capChest2,
    createRedChineseLantern(-2.2, 2.35, 11.5),
    createRedChineseLantern(2.2, 2.35, 16.5)
  );

  for (const stairSide of [-1, 1]) {
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const step = new THREE.Mesh(shipStepGeo, imperialWoodFloorMat);
      step.position.set(stairSide * 4.55, t * 3.0 - 0.08, 2.5 + t * 5.0);
      shipGroup.add(step);
    }
  }

  const portBowRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  portBowRail.position.set(-6.15, 0.55, -11.4);
  const portSternRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  portSternRail.position.set(-6.15, 3.55, 14.1);
  const stbdBowRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  stbdBowRail.position.set(6.15, 0.55, -11.4);
  const stbdMidRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  stbdMidRail.scale.z = 0.65;
  stbdMidRail.position.set(6.15, 0.55, 1.5);
  const stbdSternRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  stbdSternRail.position.set(6.15, 3.55, 14.1);
  const bowRail = new THREE.Mesh(shipBulwarkEndGeo, imperialCrimsonMat);
  bowRail.position.set(0, 0.55, -20.6);
  const sternRail = new THREE.Mesh(shipBulwarkEndGeo, imperialCrimsonMat);
  sternRail.position.set(0, 3.55, 20.6);
  const qDeckFrontRail = new THREE.Mesh(qDeckFrontRailGeo, imperialCrimsonMat);
  qDeckFrontRail.position.set(0, 3.48, 7.55);
  shipGroup.add(
    portBowRail,
    portSternRail,
    stbdBowRail,
    stbdMidRail,
    stbdSternRail,
    bowRail,
    sternRail,
    qDeckFrontRail
  );

  for (const cz of [-13.5, -7.5, 4.5]) {
    for (const side of [-1, 1]) {
      if (side === -1 && Math.abs(cz) < 3.5) continue;
      const scGroup = new THREE.Group();
      scGroup.position.set(side * 5.2, 0, cz);
      if (side === -1) scGroup.rotation.y = Math.PI;
      const scCarriage = new THREE.Mesh(cannonCarriageGeo, timberMat);
      scCarriage.position.y = 0.26;
      const scBarrel = new THREE.Mesh(cannonBarrelGeo, darkIronMat);
      scBarrel.position.set(0.45, 0.62, 0);
      scGroup.add(scCarriage, scBarrel);
      shipGroup.add(scGroup);
    }
  }

  for (const [mz, mScale] of [
    [-16.2, 0.92],
    [-8.2, 1.08],
    [-0.6, 0.90],
  ]) {
    const mast = new THREE.Mesh(shipMastGeo, barkMat);
    mast.position.set(0, 0, mz);
    mast.scale.y = mScale;
    shipGroup.add(mast);
    for (const sy of [8.2 * mScale, 15.0 * mScale]) {
      const yard = new THREE.Mesh(shipYardarmGeo, timberMat);
      yard.position.set(0, sy + 2.5, mz);
      const sail = new THREE.Mesh(shipSailGeo, sailClothMat);
      sail.position.set(0, sy, mz - 0.28);
      shipGroup.add(yard, sail);
    }
    shipGroup.add(createRedImperialFlag(0, 22.8 * mScale, mz));
  }

  const binnacleStand = new THREE.Mesh(binnacleStandGeo, furnitureWoodMat);
  binnacleStand.position.set(0, 3.52, 8.45);
  const binnacleCompass = new THREE.Mesh(cannonBallGeo, imperialGoldMat);
  binnacleCompass.scale.setScalar(1.35);
  binnacleCompass.position.set(0, 4.12, 8.45);
  const helmStand = new THREE.Mesh(shipHelmStandGeo, furnitureWoodMat);
  helmStand.position.set(0, 3.66, 9.2);
  const wheelAssembly = new THREE.Group();
  wheelAssembly.position.set(0, 4.18, 9.48);
  const wheelRim = new THREE.Mesh(shipWheelRimGeo, furnitureWoodMat);
  const wheelHub = new THREE.Mesh(cannonBallGeo, imperialGoldMat);
  wheelHub.scale.set(0.9, 0.9, 1.4);
  wheelAssembly.add(wheelRim, wheelHub);
  for (let sp = 0; sp < 4; sp++) {
    const spoke = new THREE.Mesh(shipWheelSpokeGeo, imperialGoldMat);
    spoke.rotation.z = (sp / 4) * Math.PI;
    wheelAssembly.add(spoke);
  }

  const sternChest = new THREE.Mesh(treasureChestGeo, barkMat);
  sternChest.position.set(3.8, 3.48, 17.5);
  const sternGold = new THREE.Mesh(forgeCoalMoundGeo, mineGoldOreMat);
  sternGold.position.set(3.8, 3.98, 17.5);
  shipGroup.add(
    binnacleStand,
    binnacleCompass,
    helmStand,
    wheelAssembly,
    sternChest,
    sternGold,
    createRedChineseLantern(-5.2, 5.2, 20.2),
    createRedChineseLantern(5.2, 5.2, 20.2),
    createRedImperialFlag(0, 5.5, 20.5)
  );
  harborGroup.add(shipGroup);

  // 8) CLIMBABLE 26m IMPERIAL LIGHTHOUSE
  const lhX = SOUTHEAST_HARBOR_POS.lighthouseX;
  const lhZ = SOUTHEAST_HARBOR_POS.lighthouseZ;
  const lhBaseY = SOUTHEAST_HARBOR_POS.lighthouseBaseY;
  const lhTopY = SOUTHEAST_HARBOR_POS.lighthouseTopDeckY;
  const lhH = lhTopY - lhBaseY;
  const lighthouseGroup = new THREE.Group();
  lighthouseGroup.position.set(lhX, lhBaseY, lhZ);

  const lhPlinthGeo = new THREE.BoxGeometry(9.2, 1.2, 9.2);
  const lhWallNGeo = new THREE.BoxGeometry(8.0, lhH, 0.55);
  const lhWallSideGeo = new THREE.BoxGeometry(0.55, lhH, 8.0);
  const lhWallDoorFlankGeo = new THREE.BoxGeometry(2.8, lhH, 0.55);
  const lhWallDoorLintelGeo = new THREE.BoxGeometry(2.4, lhH - 3.2, 0.55);
  const lhStripeOuterZGeo = new THREE.BoxGeometry(8.48, 1.25, 0.16);
  const lhStripeOuterXGeo = new THREE.BoxGeometry(0.16, 1.25, 8.48);
  const lhDeckSouthGeo = new THREE.BoxGeometry(9.2, 0.32, 6.2);
  const lhDeckNorthSideGeo = new THREE.BoxGeometry(3.6, 0.32, 3.0);
  const lhLanternGlassGeo = new THREE.CylinderGeometry(2.2, 2.2, 3.6, 12);
  const lhDomeRoofGeo = new THREE.ConeGeometry(3.2, 2.8, 12);
  const lhSearchBeamGeo = new THREE.ConeGeometry(3.8, 28.0, 12, 1, true);
  lhSearchBeamGeo.translate(0, -14.0, 0);
  lhSearchBeamGeo.rotateX(Math.PI / 2);
  const lhLadderRailGeo = new THREE.BoxGeometry(0.11, lhH + 1.0, 0.11);
  const hwLadderRungGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.62, 6);
  hwLadderRungGeo.rotateZ(Math.PI / 2);
  const lhTopRailZGeo = new THREE.BoxGeometry(9.0, 0.96, 0.24);
  const lhTopRailXGeo = new THREE.BoxGeometry(0.24, 0.96, 9.0);

  disposableGeometries.push(
    lhPlinthGeo,
    lhWallNGeo,
    lhWallSideGeo,
    lhWallDoorFlankGeo,
    lhWallDoorLintelGeo,
    lhStripeOuterZGeo,
    lhStripeOuterXGeo,
    lhDeckSouthGeo,
    lhDeckNorthSideGeo,
    lhLanternGlassGeo,
    lhDomeRoofGeo,
    lhSearchBeamGeo,
    lhLadderRailGeo,
    hwLadderRungGeo,
    lhTopRailZGeo,
    lhTopRailXGeo
  );

  const lhPlinth = new THREE.Mesh(lhPlinthGeo, carvedMarbleMat);
  lhPlinth.position.set(0, -0.45, 0);
  const lhWallN = new THREE.Mesh(lhWallNGeo, carvedMarbleMat);
  lhWallN.position.set(0, lhH * 0.5, -3.85);
  const lhWallW = new THREE.Mesh(lhWallSideGeo, carvedMarbleMat);
  lhWallW.position.set(-3.85, lhH * 0.5, 0);
  const lhWallE = new THREE.Mesh(lhWallSideGeo, carvedMarbleMat);
  lhWallE.position.set(3.85, lhH * 0.5, 0);
  const lhFlankL = new THREE.Mesh(lhWallDoorFlankGeo, carvedMarbleMat);
  lhFlankL.position.set(-2.6, lhH * 0.5, 3.85);
  const lhFlankR = new THREE.Mesh(lhWallDoorFlankGeo, carvedMarbleMat);
  lhFlankR.position.set(2.6, lhH * 0.5, 3.85);
  const lhLintel = new THREE.Mesh(lhWallDoorLintelGeo, carvedMarbleMat);
  lhLintel.position.set(0, (3.2 + lhH) * 0.5, 3.85);

  for (const sy of [5.2, 10.4, 15.2]) {
    for (const sz of [-4.16, 4.16]) {
      const stripZ = new THREE.Mesh(lhStripeOuterZGeo, imperialCrimsonMat);
      stripZ.position.set(0, sy, sz);
      lighthouseGroup.add(stripZ);
    }
    for (const sx of [-4.16, 4.16]) {
      const stripX = new THREE.Mesh(lhStripeOuterXGeo, imperialCrimsonMat);
      stripX.position.set(sx, sy, 0);
      lighthouseGroup.add(stripX);
    }
  }

  const lhDeckS = new THREE.Mesh(lhDeckSouthGeo, carvedMarbleMat);
  lhDeckS.position.set(0, lhH - 0.16, 1.5);
  const lhDeckNW = new THREE.Mesh(lhDeckNorthSideGeo, carvedMarbleMat);
  lhDeckNW.position.set(-2.8, lhH - 0.16, -3.1);
  const lhDeckNE = new THREE.Mesh(lhDeckNorthSideGeo, carvedMarbleMat);
  lhDeckNE.position.set(2.8, lhH - 0.16, -3.1);

  lighthouseGroup.add(
    lhPlinth,
    lhWallN,
    lhWallW,
    lhWallE,
    lhFlankL,
    lhFlankR,
    lhLintel,
    lhDeckS,
    lhDeckNW,
    lhDeckNE,
    createInteractiveDoubleDoor(SOUTHEAST_HARBOR_POS.lighthouseDoorId, 0, 0.08, 3.85, 2.2, 3.2)
  );

  const lhLadderGroup = new THREE.Group();
  lhLadderGroup.position.set(0, lhH * 0.5, -2.9);
  const lhRailL = new THREE.Mesh(lhLadderRailGeo, imperialCrimsonMat);
  lhRailL.position.x = -0.35;
  const lhRailR = new THREE.Mesh(lhLadderRailGeo, imperialCrimsonMat);
  lhRailR.position.x = 0.35;
  lhLadderGroup.add(lhRailL, lhRailR);
  for (let r = 0; r <= 38; r++) {
    const rung = new THREE.Mesh(hwLadderRungGeo, imperialGoldMat);
    rung.position.y = -lhH * 0.5 + 0.35 + (r / 38) * (lhH - 0.4);
    lhLadderGroup.add(rung);
  }
  lighthouseGroup.add(lhLadderGroup);

  for (const sz of [-4.4, 4.4]) {
    const rZ = new THREE.Mesh(lhTopRailZGeo, imperialCrimsonMat);
    rZ.position.set(0, lhH + 0.48, sz);
    lighthouseGroup.add(rZ);
  }
  for (const sx of [-4.4, 4.4]) {
    const rX = new THREE.Mesh(lhTopRailXGeo, imperialCrimsonMat);
    rX.position.set(sx, lhH + 0.48, 0);
    lighthouseGroup.add(rX);
  }

  const lhBeaconCore = new THREE.Mesh(lhLanternGlassGeo, warmLanternMat);
  lhBeaconCore.position.set(0, lhH + 2.4, 0);
  const lhDomeRoof = new THREE.Mesh(lhDomeRoofGeo, imperialGoldMat);
  lhDomeRoof.position.set(0, lhH + 5.4, 0);
  const lighthouseBeaconGroup = new THREE.Group();
  lighthouseBeaconGroup.position.set(0, lhH + 2.6, 0);
  const beam1 = new THREE.Mesh(lhSearchBeamGeo, lhBeamMat);
  const beam2 = new THREE.Mesh(lhSearchBeamGeo, lhBeamMat);
  beam2.rotation.y = Math.PI;
  lighthouseBeaconGroup.add(beam1, beam2);
  lighthouseGroup.add(lhBeaconCore, lhDomeRoof, lighthouseBeaconGroup);
  harborGroup.add(lighthouseGroup);

  scene.add(harborGroup);
  distanceCulledObjects.push({
    obj: harborGroup,
    cx: 255.0,
    cz: 255.0,
    radius: 145,
  });

  // 9) SOARING WHITE COASTAL SEAGULLS ABOVE THE HARBOR
  const harborSeagullsGroup = new THREE.Group();
  const seagullWingGeo = new THREE.BoxGeometry(0.85, 0.04, 0.24);
  disposableGeometries.push(seagullWingGeo);
  for (let g = 0; g < 10; g++) {
    const gull = new THREE.Group();
    const lw = new THREE.Mesh(seagullWingGeo, seagullMat);
    lw.position.x = -0.38;
    const rw = new THREE.Mesh(seagullWingGeo, seagullMat);
    rw.position.x = 0.38;
    gull.add(lw, rw);
    gull.userData = {
      orbitRadius: 18 + (g % 4) * 9,
      orbitSpeed: 0.22 + (g % 3) * 0.05,
      phase: (g / 10) * Math.PI * 2,
      altitude: 19 + (g % 4) * 3.5,
    };
    harborSeagullsGroup.add(gull);
  }
  scene.add(harborSeagullsGroup);

  const updateHarbor = (elapsedTime: number, playerX: number, playerZ: number) => {
    if (harborGroup.visible) {
      lighthouseBeaconGroup.rotation.y = elapsedTime * 0.65;
    }
    const nearHarborGulls = isWithinViewDistance(272, 252, playerX, playerZ, 65, 180);
    harborSeagullsGroup.visible = nearHarborGulls;
    if (nearHarborGulls) {
      const gulls = harborSeagullsGroup.children;
      for (let g = 0; g < gulls.length; g++) {
        const gull = gulls[g];
        const ud = gull.userData;
        const ang = elapsedTime * ud.orbitSpeed + ud.phase;
        const gx = 272 + Math.cos(ang) * ud.orbitRadius;
        const gz = 252 + Math.sin(ang) * ud.orbitRadius;
        gull.position.set(gx, ud.altitude + Math.sin(elapsedTime * 1.2 + ud.phase) * 1.4, gz);
        gull.rotation.y = -ang;
        const flap = Math.sin(elapsedTime * 6.0 + ud.phase * 2) * 0.26;
        (gull.children[0] as THREE.Mesh).rotation.z = 0.12 + flap;
        (gull.children[1] as THREE.Mesh).rotation.z = -0.12 - flap;
      }
    }
  };

  return {
    harborGroup,
    lighthouseBeaconGroup,
    harborSeagullsGroup,
    updateHarbor,
  };
}
// #endregion
