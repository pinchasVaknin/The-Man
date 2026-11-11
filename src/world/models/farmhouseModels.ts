// ============================================================================
// MODULE: World / Models / Farmhouse Models
// DESIGN: Valley farmhouses, wheat fields, magic stone circle, and southern mine (SRP)
// SUMMARY: Constructs 3 enterable farmhouses with workshops, swaying golden wheat,
//          woodland stone circle, grazing sheep, deep crystal mine, and dwarven kingdom.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  VALLEY_FARMS,
  MAGIC_STONE_CIRCLE_POS,
  SOUTHERN_MINE_POS,
  groundHeightAt,
  hash2D,
} from '../terrainMath';
import {
  attachWindSwayShader,
  perturbGeometryVertices,
} from '../builders/shaderAndMaterialBuilders';
import { attachAnimatedWaterWaveShader } from './terrainAndWaterModel';
import { buildDwarvenKingdomAndMiners } from '../builders/dwarvenKingdomBuilder';
import {
  DWARVEN_MINER_STATIONS,
  DWARVEN_MINECART_ROUTES,
  DWARVEN_RIDEABLE_MINECART_LINES,
  evaluateMinecartTrackState,
  evaluateRideableMinecartPose,
  getRideableMinecartVisualProgress,
} from '../systems/dwarvenMineAndCaravanSystem';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== FARMHOUSE MODEL INTERFACES ======================== \\
// #region Farmhouse Model Interfaces
/**
 * Summary: Collection of interactive door handles and windmill rotor pivots in valley farms.
 * Design: Provides pivot references to rotate doors and spin windmill blades per frame.
 */
export interface IFarmhouseModelHandles {
  readonly mineGroup: THREE.Group;
  readonly updateFarmhousesAndMine: (
    elapsedTime: number,
    worldHours?: number,
    playerX?: number,
    playerZ?: number
  ) => void;
}
// #endregion

// ======================== BUILD FARMHOUSE MODELS ======================== \\
// #region Build Farmhouse Models
/**
 * Summary: Constructs the valley farmhouses, wheat fields, magic circle, sheep flock, and southern mountain mine.
 * @param ctx Shared build context (scene, textures, disposal lists).
 * @returns Handles for animating the farmhouse area each frame.
 */
export function buildFarmhouseModels(ctx: IWorldModelBuildContext): IFarmhouseModelHandles {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    swayMaterials,
    lanternLights,
    distanceCulledObjects,
    doorPivotHandles,
  } = ctx;

  // Materials
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.05,
    roughness: 0.76,
    metalness: 0.04,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x26292e,
    roughness: 0.35,
    metalness: 0.82,
  });
  const warmLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfff3cc,
    emissive: new THREE.Color(0xffaa33),
    emissiveIntensity: 2.6,
    roughness: 0.2,
  });
  const hayMat = new THREE.MeshStandardMaterial({
    color: 0xd9b24c,
    roughness: 0.9,
  });
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.barkAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.07,
    roughness: 0.88,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.09,
    roughness: 0.65,
    metalness: 0.06,
  });
  const plowedSoilMat = new THREE.MeshStandardMaterial({
    color: 0x4a3520,
    roughness: 0.95,
  });
  const goldenWheatMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.65,
    metalness: 0.05,
  });
  attachWindSwayShader(goldenWheatMat, 0.045, 2.2, swayMaterials);

  const furnitureWoodMat = new THREE.MeshStandardMaterial({
    color: 0x8a562d,
    map: textures.timberAlbedo,
    roughness: 0.68,
    metalness: 0.05,
  });
  const blanketClothMat = new THREE.MeshStandardMaterial({
    color: 0x992b24,
    roughness: 0.85,
  });
  const pillowClothMat = new THREE.MeshStandardMaterial({
    color: 0xf3ede0,
    roughness: 0.82,
  });
  const burlapSackMat = new THREE.MeshStandardMaterial({
    color: 0xc29e63,
    roughness: 0.92,
  });
  const breadLoafMat = new THREE.MeshStandardMaterial({
    color: 0xd98a2b,
    roughness: 0.72,
  });
  const cheeseWheelMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.58,
  });
  const brickOvenMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.88,
  });
  const furRugMat = new THREE.MeshStandardMaterial({
    color: 0x452715,
    roughness: 0.94,
  });

  const mineDarkRockMat = new THREE.MeshStandardMaterial({
    color: 0x36332f,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.12,
    roughness: 0.9,
  });
  const mineDeepSlateMat = new THREE.MeshStandardMaterial({
    color: 0x262422,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.14,
    roughness: 0.94,
  });
  const mineGoldOreMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.24,
    metalness: 0.88,
  });
  const mineEmeraldCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 1.45,
    roughness: 0.18,
  });
  const mineAmethystCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x7e22ce,
    emissiveIntensity: 1.45,
    roughness: 0.18,
  });
  const mineSapphireCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.45,
    roughness: 0.18,
  });
  const mineMoltenCoalMat = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff3300,
    emissiveIntensity: 2.8,
    roughness: 0.4,
  });

  const magicRuneMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  const hillBushMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a27,
    roughness: 0.88,
  });
  const woolMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.95 });
  const darkWoolMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.9 });

  disposableMaterials.push(
    timberMat,
    darkIronMat,
    warmLanternMat,
    hayMat,
    barkMat,
    rockMat,
    plowedSoilMat,
    goldenWheatMat,
    furnitureWoodMat,
    blanketClothMat,
    pillowClothMat,
    burlapSackMat,
    breadLoafMat,
    cheeseWheelMat,
    brickOvenMat,
    furRugMat,
    mineDarkRockMat,
    mineDeepSlateMat,
    mineGoldOreMat,
    mineEmeraldCrystalMat,
    mineAmethystCrystalMat,
    mineSapphireCrystalMat,
    mineMoltenCoalMat,
    magicRuneMat,
    hillBushMat,
    woolMat,
    darkWoolMat
  );

  function createLanternAssembly(x: number, y: number, z: number, addLight = false): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const chainGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6);
    chainGeo.translate(0, -0.15, 0);
    const capGeo = new THREE.ConeGeometry(0.17, 0.12, 6);
    capGeo.translate(0, -0.32, 0);
    const cageGeo = new THREE.CylinderGeometry(0.13, 0.1, 0.28, 6);
    cageGeo.translate(0, -0.49, 0);
    disposableGeometries.push(chainGeo, capGeo, cageGeo);
    g.add(new THREE.Mesh(chainGeo, darkIronMat));
    g.add(new THREE.Mesh(capGeo, darkIronMat));
    g.add(new THREE.Mesh(cageGeo, warmLanternMat));
    if (addLight) {
      const isUnderground = y < -1.0;
      const baseIntensity = isUnderground ? 4.2 : 3.2;
      const pl = new THREE.PointLight(0xffaa38, baseIntensity, isUnderground ? 28 : 18, 1.35);
      pl.position.set(0, -0.49, 0);
      if (isUnderground) {
        pl.userData.isUndergroundMineLight = true;
        pl.userData.baseIntensity = baseIntensity;
      }
      g.add(pl);
      lanternLights.push(pl);
    }
    return g;
  }

  // --- 1) 3 VALLEY FARMHOUSES & WHEAT FIELDS ---
  const farmWallBackGeo = new THREE.BoxGeometry(10.0, 3.4, 0.42);
  const farmWallSideGeo = new THREE.BoxGeometry(0.42, 3.4, 8.6);
  // Symmetric triangular prism gable wall matching the main house walls (z = -6.18 .. +2.23, peak at z = -1.975, y = 5.56)
  const farmGableShape = new THREE.Shape();
  farmGableShape.moveTo(-6.18, 3.52);
  farmGableShape.lineTo(-1.975, 5.56);
  farmGableShape.lineTo(2.23, 3.52);
  farmGableShape.closePath();
  const farmWallSideGableGeo = new THREE.ExtrudeGeometry(farmGableShape, {
    depth: 0.42,
    bevelEnabled: false,
  });
  farmWallSideGableGeo.rotateY(-Math.PI / 2);
  farmWallSideGableGeo.translate(0.21, 0, 0);

  const farmWallFrontFlankGeo = new THREE.BoxGeometry(4.0, 3.4, 0.42);
  const farmWallFrontHeaderGeo = new THREE.BoxGeometry(2.1, 1.05, 0.42);
  const farmWallFrontTopPlateGeo = new THREE.BoxGeometry(10.3, 0.24, 0.46);
  const farmFloorGeo = new THREE.BoxGeometry(10.4, 0.18, 10.6);
  const farmRoofBackSlopeGeo = new THREE.BoxGeometry(11.2, 0.24, 5.25);
  const farmRoofFrontSlopeGeo = new THREE.BoxGeometry(11.2, 0.24, 5.25);
  const farmPorchRoofSlopeGeo = new THREE.BoxGeometry(10.8, 0.2, 2.38);
  const farmRidgeCapGeo = new THREE.BoxGeometry(11.3, 0.24, 0.36);
  const farmVerandaHeaderGeo = new THREE.BoxGeometry(10.4, 0.22, 0.28);
  const farmPorchTieBeamGeo = new THREE.BoxGeometry(0.24, 0.22, 2.1);
  const plowedSoilFurrowGeo = new THREE.BoxGeometry(11.6, 0.08, 15.6);
  const farmFenceRailGeo = new THREE.BoxGeometry(3.8, 0.1, 0.1);
  const wheatStalkGeo = new THREE.ConeGeometry(0.085, 0.92, 5);
  wheatStalkGeo.translate(0, 0.46, 0);
  const lodgeLeafGeo = new THREE.BoxGeometry(0.92, 2.35, 0.12);
  lodgeLeafGeo.translate(0.46, 1.175, 0);
  const windowPaneGeo = new THREE.BoxGeometry(1.45, 1.05, 0.44);
  const verandaColGeo = new THREE.CylinderGeometry(0.16, 0.19, 3.02, 8);
  verandaColGeo.translate(0, 1.65, 0);
  const hayBaleGeo = new THREE.BoxGeometry(0.95, 0.58, 0.65);
  hayBaleGeo.translate(0, 0.29, 0);

  disposableGeometries.push(
    farmWallBackGeo,
    farmWallSideGeo,
    farmWallSideGableGeo,
    farmWallFrontFlankGeo,
    farmWallFrontHeaderGeo,
    farmWallFrontTopPlateGeo,
    farmFloorGeo,
    farmRoofBackSlopeGeo,
    farmRoofFrontSlopeGeo,
    farmPorchRoofSlopeGeo,
    farmRidgeCapGeo,
    farmVerandaHeaderGeo,
    farmPorchTieBeamGeo,
    plowedSoilFurrowGeo,
    farmFenceRailGeo,
    wheatStalkGeo,
    lodgeLeafGeo,
    windowPaneGeo,
    verandaColGeo,
    hayBaleGeo
  );

  type HouseInteriorKind = 'hunter' | 'farm_bakery' | 'farm_dairy' | 'farm_weaver';

  const tableTopGeo = new THREE.BoxGeometry(2.1, 0.1, 1.25);
  const tableLegGeo = new THREE.BoxGeometry(0.1, 0.74, 0.1);
  const tableStretcherGeo = new THREE.BoxGeometry(1.75, 0.07, 0.08);
  const benchSeatGeo = new THREE.BoxGeometry(1.85, 0.08, 0.36);
  const benchLegGeo = new THREE.BoxGeometry(0.08, 0.42, 0.32);
  const platterGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.04, 12);
  const loafGeo = new THREE.SphereGeometry(0.16, 10, 8);
  loafGeo.scale(1.35, 0.75, 0.9);
  const mugGeo = new THREE.CylinderGeometry(0.06, 0.065, 0.14, 8);

  const wardrobeBodyGeo = new THREE.BoxGeometry(1.55, 2.22, 0.76);
  const wardrobeCorniceGeo = new THREE.BoxGeometry(1.68, 0.12, 0.84);
  const wardrobeDoorPanelGeo = new THREE.BoxGeometry(0.64, 1.82, 0.05);
  const wardrobeHandleGeo = new THREE.BoxGeometry(0.04, 0.18, 0.06);

  const bedFrameGeo = new THREE.BoxGeometry(1.52, 0.28, 2.15);
  const bedPostGeo = new THREE.CylinderGeometry(0.065, 0.07, 1.08, 8);
  const bedHeadboardGeo = new THREE.BoxGeometry(1.52, 0.92, 0.12);
  const bedFootboardGeo = new THREE.BoxGeometry(1.52, 0.56, 0.1);
  const mattressGeo = new THREE.BoxGeometry(1.38, 0.22, 1.98);
  const quiltGeo = new THREE.BoxGeometry(1.42, 0.23, 1.42);
  const pillowGeo = new THREE.BoxGeometry(0.56, 0.13, 0.38);
  const nightstandGeo = new THREE.BoxGeometry(0.64, 0.68, 0.56);

  const chestBodyGeo = new THREE.BoxGeometry(0.68, 0.58, 1.18);
  const chestLidGeo = new THREE.CylinderGeometry(0.34, 0.34, 1.2, 10, 1, false, 0, Math.PI);
  chestLidGeo.rotateX(Math.PI / 2);
  const chestStrapGeo = new THREE.BoxGeometry(0.72, 0.6, 0.08);

  const hearthBaseGeo = new THREE.BoxGeometry(2.2, 0.22, 0.95);
  const hearthPillarGeo = new THREE.BoxGeometry(0.46, 1.65, 0.78);
  const hearthBackGeo = new THREE.BoxGeometry(1.35, 1.65, 0.28);
  const hearthMantelGeo = new THREE.BoxGeometry(2.38, 0.18, 0.92);
  const hearthHoodGeo = new THREE.BoxGeometry(1.65, 1.65, 0.68);
  const hearthLogGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.76, 7);
  hearthLogGeo.rotateZ(Math.PI / 2);
  const hearthEmberGeo = new THREE.SphereGeometry(0.24, 8, 6);
  hearthEmberGeo.scale(1.5, 0.45, 0.9);

  const rugRunnerGeo = new THREE.BoxGeometry(1.85, 0.025, 3.6);
  const rugHearthGeo = new THREE.BoxGeometry(2.4, 0.028, 1.45);
  const pantryShelfGeo = new THREE.BoxGeometry(0.52, 0.06, 1.65);
  const grainSackGeo = new THREE.SphereGeometry(0.32, 8, 8);
  grainSackGeo.scale(1.0, 1.25, 0.85);
  const barrelGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.74, 10);
  const cheeseRoundGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12);

  // Detailed Craft Station Geometries (Bakery Oven, Dairy Churns & Press, Timber Weaving Loom)
  const ovenBaseGeo = new THREE.BoxGeometry(1.25, 0.88, 1.85);
  const ovenDomeGeo = new THREE.CylinderGeometry(0.58, 0.62, 1.72, 10, 1, false, 0, Math.PI);
  ovenDomeGeo.rotateX(Math.PI / 2);
  const ovenFlueGeo = new THREE.BoxGeometry(0.52, 1.45, 0.56);
  const ovenMouthGeo = new THREE.BoxGeometry(0.16, 0.42, 0.62);

  const churnBarrelGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.78, 10);
  const churnHoopGeo = new THREE.CylinderGeometry(0.255, 0.265, 0.05, 10);
  const churnPlungerGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.18, 6);
  const dairyCounterGeo = new THREE.BoxGeometry(0.88, 0.78, 1.65);

  const loomPostGeo = new THREE.BoxGeometry(0.12, 1.75, 0.12);
  const loomBeamGeo = new THREE.BoxGeometry(0.12, 0.12, 1.56);
  const loomSideBarGeo = new THREE.BoxGeometry(0.96, 0.1, 0.1);
  const loomRollerGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.44, 8);
  loomRollerGeo.rotateX(Math.PI / 2);
  const loomTapestryGeo = new THREE.BoxGeometry(0.04, 1.05, 1.28);

  disposableGeometries.push(
    tableTopGeo,
    tableLegGeo,
    tableStretcherGeo,
    benchSeatGeo,
    benchLegGeo,
    platterGeo,
    loafGeo,
    mugGeo,
    wardrobeBodyGeo,
    wardrobeCorniceGeo,
    wardrobeDoorPanelGeo,
    wardrobeHandleGeo,
    bedFrameGeo,
    bedPostGeo,
    bedHeadboardGeo,
    bedFootboardGeo,
    mattressGeo,
    quiltGeo,
    pillowGeo,
    nightstandGeo,
    chestBodyGeo,
    chestLidGeo,
    chestStrapGeo,
    hearthBaseGeo,
    hearthPillarGeo,
    hearthBackGeo,
    hearthMantelGeo,
    hearthHoodGeo,
    hearthLogGeo,
    hearthEmberGeo,
    rugRunnerGeo,
    rugHearthGeo,
    pantryShelfGeo,
    grainSackGeo,
    barrelGeo,
    cheeseRoundGeo,
    ovenBaseGeo,
    ovenDomeGeo,
    ovenFlueGeo,
    ovenMouthGeo,
    churnBarrelGeo,
    churnHoopGeo,
    churnPlungerGeo,
    dairyCounterGeo,
    loomPostGeo,
    loomBeamGeo,
    loomSideBarGeo,
    loomRollerGeo,
    loomTapestryGeo
  );

  function createInteriorFurnitureSet(interiorKind: HouseInteriorKind = 'hunter'): THREE.Group {
    // Note: farmFurniture is mounted at (0, 0.18, -2.0) in farmGroup, so local fz maps to z_farm = fz - 2.0.
    // Back wall inner face is fz = -3.90 (z_farm = -5.90); Front wall inner face is fz = +3.95 (z_farm = +1.95);
    // West wall inner face is x = -4.70; East wall inner face is x = +4.70.
    const fGroup = new THREE.Group();

    // 1. Central Entrance Runner Rug & Hearth Rug (keeping central walkway x = -1.2..+1.2 completely open)
    const runnerRug = new THREE.Mesh(rugRunnerGeo, blanketClothMat);
    runnerRug.position.set(0, 0.015, 1.55);
    const hearthRug = new THREE.Mesh(rugHearthGeo, furRugMat);
    hearthRug.position.set(0, 0.016, -1.55);
    fGroup.add(runnerRug, hearthRug);

    // 2. Back-Center Stone Hearth & Fireplace flush against Back Wall (x = 0, fz = -3.42 -> z_farm = -5.42)
    const hearthGroup = new THREE.Group();
    hearthGroup.position.set(0, 0, -3.42);
    const hBase = new THREE.Mesh(hearthBaseGeo, rockMat);
    hBase.position.y = 0.11;
    const hBack = new THREE.Mesh(hearthBackGeo, rockMat);
    hBack.position.set(0, 0.92, -0.32);
    const hLeft = new THREE.Mesh(hearthPillarGeo, rockMat);
    hLeft.position.set(-0.82, 0.92, -0.05);
    const hRight = new THREE.Mesh(hearthPillarGeo, rockMat);
    hRight.position.set(0.82, 0.92, -0.05);
    const hMantel = new THREE.Mesh(hearthMantelGeo, timberMat);
    hMantel.position.set(0, 1.82, 0.0);
    const hHood = new THREE.Mesh(hearthHoodGeo, rockMat);
    hHood.position.set(0, 2.72, -0.12);
    const hLog1 = new THREE.Mesh(hearthLogGeo, barkMat);
    hLog1.position.set(0, 0.28, -0.04);
    const hLog2 = new THREE.Mesh(hearthLogGeo, barkMat);
    hLog2.position.set(0, 0.34, 0.08);
    hLog2.rotation.y = 0.28;
    const hEmber = new THREE.Mesh(hearthEmberGeo, mineMoltenCoalMat);
    hEmber.position.set(0, 0.24, 0.02);
    hearthGroup.add(hBase, hBack, hLeft, hRight, hMantel, hHood, hLog1, hLog2, hEmber);
    fGroup.add(hearthGroup);

    // 3. Back-East Cozy Sleeping Nook: Country Bed (x = 3.4, fz = -2.85 -> z_farm = -4.85) & Nightstand (x = 2.15, fz = -3.55)
    const bedGroup = new THREE.Group();
    bedGroup.position.set(3.4, 0, -2.85);
    const bFrame = new THREE.Mesh(bedFrameGeo, furnitureWoodMat);
    bFrame.position.y = 0.28;
    const bHead = new THREE.Mesh(bedHeadboardGeo, furnitureWoodMat);
    bHead.position.set(0, 0.62, -1.02);
    const bFoot = new THREE.Mesh(bedFootboardGeo, furnitureWoodMat);
    bFoot.position.set(0, 0.44, 1.03);
    const bMat = new THREE.Mesh(mattressGeo, pillowClothMat);
    bMat.position.set(0, 0.48, 0);
    const bQuilt = new THREE.Mesh(quiltGeo, blanketClothMat);
    bQuilt.position.set(0, 0.5, 0.26);
    const bPilL = new THREE.Mesh(pillowGeo, pillowClothMat);
    bPilL.position.set(-0.34, 0.63, -0.72);
    const bPilR = new THREE.Mesh(pillowGeo, pillowClothMat);
    bPilR.position.set(0.34, 0.63, -0.72);
    bedGroup.add(bFrame, bHead, bFoot, bMat, bQuilt, bPilL, bPilR);
    for (const [px, pz] of [
      [-0.72, -1.02],
      [0.72, -1.02],
      [-0.72, 1.02],
      [0.72, 1.02],
    ]) {
      const post = new THREE.Mesh(bedPostGeo, barkMat);
      post.position.set(px, 0.54, pz);
      bedGroup.add(post);
    }
    const nightstand = new THREE.Mesh(nightstandGeo, furnitureWoodMat);
    nightstand.position.set(2.15, 0.34, -3.55);
    const bedMug = new THREE.Mesh(mugGeo, cheeseWheelMat);
    bedMug.position.set(2.15, 0.75, -3.55);
    fGroup.add(bedGroup, nightstand, bedMug);

    // 4. Iron-Bound Storage Chest flush against East Wall (x = 4.18, fz = -0.2 -> z_farm = -2.2)
    const chestGroup = new THREE.Group();
    chestGroup.position.set(4.18, 0, -0.2);
    const cBody = new THREE.Mesh(chestBodyGeo, furnitureWoodMat);
    cBody.position.y = 0.29;
    const cLid = new THREE.Mesh(chestLidGeo, barkMat);
    cLid.position.y = 0.58;
    chestGroup.add(cBody, cLid);
    for (const sz of [-0.42, 0, 0.42]) {
      const strap = new THREE.Mesh(chestStrapGeo, darkIronMat);
      strap.position.set(0, 0.3, sz);
      chestGroup.add(strap);
    }
    fGroup.add(chestGroup);

    // 5. Front-East Dining Area: Table, Twin Benches & Tableware (x = 2.85, fz = +2.35 -> z_farm = +0.35)
    const diningGroup = new THREE.Group();
    diningGroup.position.set(2.85, 0, 2.35);
    const tTop = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
    tTop.position.y = 0.76;
    const tStretch = new THREE.Mesh(tableStretcherGeo, barkMat);
    tStretch.position.y = 0.22;
    diningGroup.add(tTop, tStretch);
    for (const lx of [-0.88, 0.88]) {
      for (const lz of [-0.48, 0.48]) {
        const leg = new THREE.Mesh(tableLegGeo, barkMat);
        leg.position.set(lx, 0.37, lz);
        diningGroup.add(leg);
      }
    }
    for (const bz of [-0.78, 0.78]) {
      const bSeat = new THREE.Mesh(benchSeatGeo, furnitureWoodMat);
      bSeat.position.set(0, 0.44, bz);
      const bLegL = new THREE.Mesh(benchLegGeo, barkMat);
      bLegL.position.set(-0.72, 0.21, bz);
      const bLegR = new THREE.Mesh(benchLegGeo, barkMat);
      bLegR.position.set(0.72, 0.21, bz);
      diningGroup.add(bSeat, bLegL, bLegR);
    }
    const platter = new THREE.Mesh(platterGeo, barkMat);
    platter.position.set(-0.25, 0.83, 0);
    const loaf = new THREE.Mesh(loafGeo, breadLoafMat);
    loaf.position.set(-0.25, 0.91, 0);
    const cheese = new THREE.Mesh(cheeseRoundGeo, cheeseWheelMat);
    cheese.position.set(0.35, 0.88, -0.12);
    const mugA = new THREE.Mesh(mugGeo, pillowClothMat);
    mugA.position.set(-0.65, 0.88, 0.28);
    const mugB = new THREE.Mesh(mugGeo, pillowClothMat);
    mugB.position.set(0.65, 0.88, -0.28);
    diningGroup.add(platter, loaf, cheese, mugA, mugB);
    fGroup.add(diningGroup);

    // 6. Back-West Panelled Wardrobe (x = -3.65, fz = -3.48 -> z_farm = -5.48) & Pantry Shelves along West Wall
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.position.set(-3.65, 0, -3.48);
    const wBody = new THREE.Mesh(wardrobeBodyGeo, furnitureWoodMat);
    wBody.position.y = 1.11;
    const wCornice = new THREE.Mesh(wardrobeCorniceGeo, barkMat);
    wCornice.position.y = 2.26;
    const wDoorL = new THREE.Mesh(wardrobeDoorPanelGeo, timberMat);
    wDoorL.position.set(-0.36, 1.14, 0.39);
    const wDoorR = new THREE.Mesh(wardrobeDoorPanelGeo, timberMat);
    wDoorR.position.set(0.36, 1.14, 0.39);
    const wHandleL = new THREE.Mesh(wardrobeHandleGeo, darkIronMat);
    wHandleL.position.set(-0.08, 1.14, 0.43);
    const wHandleR = new THREE.Mesh(wardrobeHandleGeo, darkIronMat);
    wHandleR.position.set(0.08, 1.14, 0.43);
    wardrobeGroup.add(wBody, wCornice, wDoorL, wDoorR, wHandleL, wHandleR);
    fGroup.add(wardrobeGroup);

    // West wall pantry shelves & grain sacks (x = -4.38, fz = -1.35 -> z_farm = -3.35)
    for (const sy of [1.15, 1.75]) {
      const shelf = new THREE.Mesh(pantryShelfGeo, timberMat);
      shelf.position.set(-4.38, sy, -1.35);
      fGroup.add(shelf);
    }
    const cWheelPantry = new THREE.Mesh(cheeseRoundGeo, cheeseWheelMat);
    cWheelPantry.position.set(-4.36, 1.25, -1.65);
    const loafPantry = new THREE.Mesh(loafGeo, breadLoafMat);
    loafPantry.position.set(-4.36, 1.26, -1.05);
    const sackA = new THREE.Mesh(grainSackGeo, burlapSackMat);
    sackA.position.set(-4.28, 0.36, -1.72);
    const barrelPantry = new THREE.Mesh(barrelGeo, furnitureWoodMat);
    barrelPantry.position.set(-4.28, 0.37, -0.95);
    fGroup.add(cWheelPantry, loafPantry, sackA, barrelPantry);

    // 7. Front-West Artisan Craft Station flush against West Wall (x = -3.95, fz = +2.0 -> z_farm = 0.0)
    if (interiorKind === 'farm_bakery') {
      const bakeryGroup = new THREE.Group();
      bakeryGroup.position.set(-3.98, 0, 2.0);
      const oBase = new THREE.Mesh(ovenBaseGeo, rockMat);
      oBase.position.y = 0.44;
      const oDome = new THREE.Mesh(ovenDomeGeo, brickOvenMat);
      oDome.position.y = 0.88;
      const oFlue = new THREE.Mesh(ovenFlueGeo, brickOvenMat);
      oFlue.position.set(-0.22, 1.85, 0);
      const oMouth = new THREE.Mesh(ovenMouthGeo, darkIronMat);
      oMouth.position.set(0.58, 1.06, 0);
      const oCoals = new THREE.Mesh(hearthEmberGeo, mineMoltenCoalMat);
      oCoals.position.set(0.45, 0.92, 0);
      const oLoaf1 = new THREE.Mesh(loafGeo, breadLoafMat);
      oLoaf1.position.set(0.42, 0.92, -0.58);
      const oLoaf2 = new THREE.Mesh(loafGeo, breadLoafMat);
      oLoaf2.position.set(0.42, 0.92, 0.58);
      bakeryGroup.add(oBase, oDome, oFlue, oMouth, oCoals, oLoaf1, oLoaf2);
      fGroup.add(bakeryGroup);
    } else if (interiorKind === 'farm_dairy') {
      const dairyGroup = new THREE.Group();
      dairyGroup.position.set(-4.05, 0, 2.0);
      const dCounter = new THREE.Mesh(dairyCounterGeo, furnitureWoodMat);
      dCounter.position.set(-0.12, 0.39, 0);
      const cWheel1 = new THREE.Mesh(cheeseRoundGeo, cheeseWheelMat);
      cWheel1.position.set(-0.1, 0.85, -0.42);
      const cWheel2 = new THREE.Mesh(cheeseRoundGeo, cheeseWheelMat);
      cWheel2.position.set(-0.1, 0.85, 0.12);
      const churn1 = new THREE.Mesh(churnBarrelGeo, timberMat);
      churn1.position.set(0.48, 0.39, -0.45);
      const hoop1 = new THREE.Mesh(churnHoopGeo, darkIronMat);
      hoop1.position.set(0.48, 0.52, -0.45);
      const plunger1 = new THREE.Mesh(churnPlungerGeo, barkMat);
      plunger1.position.set(0.48, 0.68, -0.45);
      const churn2 = new THREE.Mesh(churnBarrelGeo, timberMat);
      churn2.position.set(0.48, 0.39, 0.45);
      const hoop2 = new THREE.Mesh(churnHoopGeo, darkIronMat);
      hoop2.position.set(0.48, 0.52, 0.45);
      const plunger2 = new THREE.Mesh(churnPlungerGeo, barkMat);
      plunger2.position.set(0.48, 0.68, 0.45);
      dairyGroup.add(dCounter, cWheel1, cWheel2, churn1, hoop1, plunger1, churn2, hoop2, plunger2);
      fGroup.add(dairyGroup);
    } else {
      const loomGroup = new THREE.Group();
      loomGroup.position.set(-4.02, 0, 2.0);
      for (const lx of [-0.42, 0.42]) {
        for (const lz of [-0.72, 0.72]) {
          const post = new THREE.Mesh(loomPostGeo, barkMat);
          post.position.set(lx, 0.88, lz);
          loomGroup.add(post);
        }
        const topBeam = new THREE.Mesh(loomBeamGeo, timberMat);
        topBeam.position.set(lx, 1.68, 0);
        loomGroup.add(topBeam);
      }
      for (const lz of [-0.72, 0.72]) {
        const sBarLow = new THREE.Mesh(loomSideBarGeo, timberMat);
        sBarLow.position.set(0, 0.45, lz);
        const sBarHigh = new THREE.Mesh(loomSideBarGeo, timberMat);
        sBarHigh.position.set(0, 1.62, lz);
        loomGroup.add(sBarLow, sBarHigh);
      }
      const rollerTop = new THREE.Mesh(loomRollerGeo, furnitureWoodMat);
      rollerTop.position.set(0, 1.42, 0);
      const rollerBot = new THREE.Mesh(loomRollerGeo, furnitureWoodMat);
      rollerBot.position.set(0, 0.58, 0);
      const tapestry = new THREE.Mesh(loomTapestryGeo, blanketClothMat);
      tapestry.position.set(0, 1.0, 0);
      loomGroup.add(rollerTop, rollerBot, tapestry);
      fGroup.add(loomGroup);
    }
    return fGroup;
  }

  const wheatStalksPerFarm = 720;
  const totalWheatStalks = VALLEY_FARMS.length * wheatStalksPerFarm;
  const wheatInstanced = new THREE.InstancedMesh(wheatStalkGeo, goldenWheatMat, totalWheatStalks);
  const wDummy = new THREE.Object3D();
  const wTint = new THREE.Color();
  let wIdx = 0;

  for (let f = 0; f < VALLEY_FARMS.length; f++) {
    const farm = VALLEY_FARMS[f];
    const farmGroup = new THREE.Group();
    farmGroup.position.set(farm.x, farm.height, farm.z);
    farmGroup.rotation.y = farm.dirZ === 1 ? 0 : Math.PI;

    const floorMesh = new THREE.Mesh(farmFloorGeo, timberMat);
    floorMesh.position.set(0, 0.09, -0.9);
    floorMesh.receiveShadow = !isSoftwareGl;
    farmGroup.add(floorMesh);

    const backWall = new THREE.Mesh(farmWallBackGeo, timberMat);
    backWall.position.set(0, 1.88, -6.15);
    backWall.castShadow = !isSoftwareGl;
    const westWall = new THREE.Mesh(farmWallSideGeo, timberMat);
    westWall.position.set(-4.95, 1.88, -1.95);
    westWall.castShadow = !isSoftwareGl;
    const eastWall = new THREE.Mesh(farmWallSideGeo, timberMat);
    eastWall.position.set(4.95, 1.88, -1.95);
    eastWall.castShadow = !isSoftwareGl;
    const frontLeft = new THREE.Mesh(farmWallFrontFlankGeo, timberMat);
    frontLeft.position.set(-3.0, 1.88, 2.2);
    const frontRight = new THREE.Mesh(farmWallFrontFlankGeo, timberMat);
    frontRight.position.set(3.0, 1.88, 2.2);
    const frontHeader = new THREE.Mesh(farmWallFrontHeaderGeo, timberMat);
    frontHeader.position.set(0, 3.06, 2.2);
    const frontTopPlate = new THREE.Mesh(farmWallFrontTopPlateGeo, timberMat);
    frontTopPlate.position.set(0, 3.52, 2.2);
    const westGable = new THREE.Mesh(farmWallSideGableGeo, timberMat);
    westGable.position.set(-4.95, 0, 0);
    westGable.castShadow = !isSoftwareGl;
    const eastGable = new THREE.Mesh(farmWallSideGableGeo, timberMat);
    eastGable.position.set(4.95, 0, 0);
    eastGable.castShadow = !isSoftwareGl;
    farmGroup.add(backWall, westWall, eastWall, westGable, eastGable, frontLeft, frontRight, frontHeader, frontTopPlate);

    for (const wx of [-3.0, 3.0]) {
      const win = new THREE.Mesh(windowPaneGeo, warmLanternMat);
      win.position.set(wx, 2.0, 2.22);
      farmGroup.add(win);
    }

    const fDoorGroup = new THREE.Group();
    fDoorGroup.position.set(0, 0.18, 2.2);
    const fLeftPivot = new THREE.Group();
    fLeftPivot.position.set(-0.95, 0, 0);
    fLeftPivot.add(new THREE.Mesh(lodgeLeafGeo, timberMat));
    const fRightPivot = new THREE.Group();
    fRightPivot.position.set(0.95, 0, 0);
    const fRightLeaf = new THREE.Mesh(lodgeLeafGeo, timberMat);
    fRightLeaf.scale.x = -1;
    fRightPivot.add(fRightLeaf);
    fDoorGroup.add(fLeftPivot, fRightPivot);
    farmGroup.add(fDoorGroup);
    doorPivotHandles.push({
      id: farm.doorId,
      leftPivot: fLeftPivot,
      rightPivot: fRightPivot,
      currentAngle: 0,
    });

    // Connected Farmhouse Main Gable Roof (centered on house walls z = -6.15 .. +2.20, ridge at z = -1.975, y = 5.58) + Front Veranda Porch Roof
    const fRoofBack = new THREE.Mesh(farmRoofBackSlopeGeo, barkMat);
    fRoofBack.position.set(0, 4.46, -4.31);
    fRoofBack.rotation.x = -0.447;
    fRoofBack.castShadow = !isSoftwareGl;
    const fRoofFront = new THREE.Mesh(farmRoofFrontSlopeGeo, barkMat);
    fRoofFront.position.set(0, 4.46, 0.36);
    fRoofFront.rotation.x = 0.447;
    fRoofFront.castShadow = !isSoftwareGl;
    const fPorchRoof = new THREE.Mesh(farmPorchRoofSlopeGeo, barkMat);
    fPorchRoof.position.set(0, 3.34, 3.3);
    fPorchRoof.rotation.x = 0.155;
    fPorchRoof.castShadow = !isSoftwareGl;
    const fRidgeCap = new THREE.Mesh(farmRidgeCapGeo, barkMat);
    fRidgeCap.position.set(0, 5.64, -1.975);
    const fVerandaHeader = new THREE.Mesh(farmVerandaHeaderGeo, timberMat);
    fVerandaHeader.position.set(0, 3.2, 4.1);
    farmGroup.add(fRoofBack, fRoofFront, fPorchRoof, fRidgeCap, fVerandaHeader);

    for (const sx of [-4.8, 4.8]) {
      const tieBeam = new THREE.Mesh(farmPorchTieBeamGeo, timberMat);
      tieBeam.position.set(sx, 3.2, 3.15);
      farmGroup.add(tieBeam);
    }

    for (const vx of [-4.6, -1.6, 1.6, 4.6]) {
      const col = new THREE.Mesh(verandaColGeo, barkMat);
      col.position.set(vx, 0, 4.1);
      farmGroup.add(col);
    }
    farmGroup.add(createLanternAssembly(-1.35, 3.1, 4.1, false));

    const farmInteriorKinds: HouseInteriorKind[] = ['farm_bakery', 'farm_dairy', 'farm_weaver'];
    const farmFurniture = createInteriorFurnitureSet(farmInteriorKinds[f % farmInteriorKinds.length]);
    farmFurniture.position.set(0, 0.18, -2.0);
    farmGroup.add(farmFurniture);

    for (const fieldSide of [-1, 1]) {
      const fieldCenterX = fieldSide * 12.6;
      const soilPlot = new THREE.Mesh(plowedSoilFurrowGeo, plowedSoilMat);
      soilPlot.position.set(fieldCenterX, 0.04, -0.5);
      soilPlot.receiveShadow = !isSoftwareGl;
      farmGroup.add(soilPlot);

      const fieldFencePostGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.82, 7);
      fieldFencePostGeo.translate(0, 0.41, 0);
      disposableGeometries.push(fieldFencePostGeo);
      for (const fz of [-8.6, 7.6]) {
        for (const fxOff of [-3.6, 0, 3.6]) {
          for (const railY of [0.32, 0.64]) {
            const rail = new THREE.Mesh(farmFenceRailGeo, timberMat);
            rail.position.set(fieldCenterX + fxOff, railY, fz);
            farmGroup.add(rail);
          }
        }
        for (const postOff of [-5.4, -1.8, 1.8, 5.4]) {
          const post = new THREE.Mesh(fieldFencePostGeo, barkMat);
          post.position.set(fieldCenterX + postOff, 0, fz);
          farmGroup.add(post);
        }
      }
      const hayBale = new THREE.Mesh(hayBaleGeo, hayMat);
      hayBale.position.set(fieldSide * 6.4, 0.15, 3.2);
      hayBale.rotation.y = fieldSide * 0.25;
      farmGroup.add(hayBale);

      for (let row = 0; row < 18; row++) {
        for (let col = 0; col < 20; col++) {
          if (wIdx >= totalWheatStalks) break;
          const jitterX = (hash2D(wIdx, 701) - 0.5) * 0.22;
          const jitterZ = (hash2D(wIdx, 709) - 0.5) * 0.22;
          const localWx = fieldCenterX - 5.1 + (col / 19) * 10.2 + jitterX;
          const localWz = -7.6 + (row / 17) * 14.2 + jitterZ;
          const wx = farm.x + localWx * farm.dirZ;
          const wz = farm.z + localWz * farm.dirZ;
          const wy = farm.height + 0.05;

          wDummy.position.set(wx, wy, wz);
          wDummy.rotation.set(
            (hash2D(wIdx, 719) - 0.5) * 0.12,
            hash2D(wIdx, 727) * Math.PI * 2,
            (hash2D(wIdx, 733) - 0.5) * 0.12
          );
          const sc = 0.85 + hash2D(wIdx, 739) * 0.38;
          wDummy.scale.set(sc, sc * (0.95 + hash2D(wIdx, 743) * 0.25), sc);
          wDummy.updateMatrix();
          wheatInstanced.setMatrixAt(wIdx, wDummy.matrix);

          wTint.setHSL(0.11 + (hash2D(wIdx, 751) - 0.5) * 0.03, 0.86, 0.52 + (hash2D(wIdx, 757) - 0.5) * 0.08);
          wheatInstanced.setColorAt(wIdx, wTint);
          wIdx++;
        }
      }
    }

    const fHalfW = farm.fenceHalfW;
    const fHalfD = farm.fenceHalfD;
    const fGateHalfW = farm.gateHalfW;
    const perimPostGeo = new THREE.CylinderGeometry(0.14, 0.17, 1.35, 7);
    perimPostGeo.translate(0, 0.67, 0);
    const perimGatePostGeo = new THREE.CylinderGeometry(0.22, 0.26, 3.6, 8);
    perimGatePostGeo.translate(0, 1.8, 0);
    const perimGateCrossbeamGeo = new THREE.BoxGeometry(fGateHalfW * 2 + 1.4, 0.28, 0.36);
    const perimBackRailGeo = new THREE.BoxGeometry(fHalfW * 2, 0.12, 0.1);
    const perimSideRailGeo = new THREE.BoxGeometry(0.1, 0.12, fHalfD * 2);
    const perimFrontWingLen = fHalfW - fGateHalfW;
    const perimFrontWingRailGeo = new THREE.BoxGeometry(perimFrontWingLen, 0.12, 0.1);
    disposableGeometries.push(
      perimPostGeo,
      perimGatePostGeo,
      perimGateCrossbeamGeo,
      perimBackRailGeo,
      perimSideRailGeo,
      perimFrontWingRailGeo
    );

    for (const railY of [0.48, 0.96]) {
      const backRail = new THREE.Mesh(perimBackRailGeo, timberMat);
      backRail.position.set(0, railY, -fHalfD);
      const westRail = new THREE.Mesh(perimSideRailGeo, timberMat);
      westRail.position.set(-fHalfW, railY, 0);
      const eastRail = new THREE.Mesh(perimSideRailGeo, timberMat);
      eastRail.position.set(fHalfW, railY, 0);
      const frontLeftRail = new THREE.Mesh(perimFrontWingRailGeo, timberMat);
      frontLeftRail.position.set(-(fGateHalfW + perimFrontWingLen * 0.5), railY, fHalfD);
      const frontRightRail = new THREE.Mesh(perimFrontWingRailGeo, timberMat);
      frontRightRail.position.set(fGateHalfW + perimFrontWingLen * 0.5, railY, fHalfD);
      farmGroup.add(backRail, westRail, eastRail, frontLeftRail, frontRightRail);
    }

    for (let px = -fHalfW; px <= fHalfW + 0.01; px += 4.4) {
      const bPost = new THREE.Mesh(perimPostGeo, barkMat);
      bPost.position.set(px, 0, -fHalfD);
      farmGroup.add(bPost);
      if (Math.abs(px) > fGateHalfW + 0.5) {
        const fPost = new THREE.Mesh(perimPostGeo, barkMat);
        fPost.position.set(px, 0, fHalfD);
        farmGroup.add(fPost);
      }
    }
    for (let pz = -fHalfD + 3.8; pz <= fHalfD - 3.0; pz += 3.8) {
      for (const sx of [-fHalfW, fHalfW]) {
        const sPost = new THREE.Mesh(perimPostGeo, barkMat);
        sPost.position.set(sx, 0, pz);
        farmGroup.add(sPost);
      }
    }

    for (const gx of [-fGateHalfW, fGateHalfW]) {
      const gPost = new THREE.Mesh(perimGatePostGeo, barkMat);
      gPost.position.set(gx, 0, fHalfD);
      farmGroup.add(gPost);
    }
    const gBeam = new THREE.Mesh(perimGateCrossbeamGeo, timberMat);
    gBeam.position.set(0, 3.45, fHalfD);
    farmGroup.add(
      gBeam,
      createLanternAssembly(-fGateHalfW + 0.55, 3.32, fHalfD, false),
      createLanternAssembly(fGateHalfW - 0.55, 3.32, fHalfD, false)
    );

    scene.add(farmGroup);
    distanceCulledObjects.push({
      obj: farmGroup,
      cx: farm.x,
      cz: farm.z,
      radius: 44,
    });
  }

  wheatInstanced.count = wIdx;
  wheatInstanced.instanceMatrix.needsUpdate = true;
  if (wheatInstanced.instanceColor) wheatInstanced.instanceColor.needsUpdate = true;
  wheatInstanced.computeBoundingSphere();
  scene.add(wheatInstanced);

  // --- 2) GRAZING SHEEP FLOCK ---
  const sheepBodyGeo = new THREE.SphereGeometry(0.42, 8, 8);
  sheepBodyGeo.scale(0.95, 0.85, 1.35);
  const sheepHeadGeo = new THREE.BoxGeometry(0.22, 0.22, 0.34);
  sheepHeadGeo.translate(0, 0.08, 0.14);
  const sheepLegGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.42, 6);
  sheepLegGeo.translate(0, -0.21, 0);
  disposableGeometries.push(sheepBodyGeo, sheepHeadGeo, sheepLegGeo);

  interface IGrazingSheep {
    root: THREE.Group;
    headPivot: THREE.Group;
    legs: [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh];
    homeX: number;
    homeZ: number;
    orbitRadius: number;
    speed: number;
    phase: number;
  }
  const sheepFlock: IGrazingSheep[] = [];
  const sheepSpots = [
    { x: -112, z: 142, r: 4.5, speed: 0.16 },
    { x: -108, z: 146, r: 5.2, speed: 0.14 },
    { x: -115, z: 148, r: 4.0, speed: 0.18 },
    { x: 24, z: 178, r: 5.0, speed: 0.15 },
    { x: 28, z: 182, r: 4.2, speed: 0.17 },
  ];
  for (let s = 0; s < 0; s++) {
    const sp = sheepSpots[s];
    const sRoot = new THREE.Group();
    sRoot.position.set(sp.x, groundHeightAt(sp.x, sp.z), sp.z);
    const body = new THREE.Mesh(sheepBodyGeo, woolMat);
    body.position.y = 0.58;
    sRoot.add(body);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.68, 0.48);
    const head = new THREE.Mesh(sheepHeadGeo, darkWoolMat);
    headPivot.add(head);
    sRoot.add(headPivot);

    const sfl = new THREE.Mesh(sheepLegGeo, darkWoolMat);
    sfl.position.set(-0.15, 0.42, 0.28);
    const sfr = new THREE.Mesh(sheepLegGeo, darkWoolMat);
    sfr.position.set(0.15, 0.42, 0.28);
    const sbl = new THREE.Mesh(sheepLegGeo, darkWoolMat);
    sbl.position.set(-0.15, 0.42, -0.28);
    const sbr = new THREE.Mesh(sheepLegGeo, darkWoolMat);
    sbr.position.set(0.15, 0.42, -0.28);
    sRoot.add(sfl, sfr, sbl, sbr);
    scene.add(sRoot);
    sheepFlock.push({
      root: sRoot,
      headPivot,
      legs: [sfl, sfr, sbl, sbr],
      homeX: sp.x,
      homeZ: sp.z,
      orbitRadius: sp.r,
      speed: sp.speed,
      phase: s * 1.1,
    });
  }

  // --- 3) MAGIC STONE CIRCLE ---
  const circleY = MAGIC_STONE_CIRCLE_POS.height;
  const stoneCircleGroup = new THREE.Group();
  stoneCircleGroup.position.set(MAGIC_STONE_CIRCLE_POS.x, circleY, MAGIC_STONE_CIRCLE_POS.z);

  const monolithGeo = new THREE.BoxGeometry(1.25, 4.2, 0.78);
  perturbGeometryVertices(monolithGeo, 0.08, 1.5);
  monolithGeo.translate(0, 2.0, 0);
  const lintelGeo = new THREE.BoxGeometry(3.4, 0.75, 0.95);
  perturbGeometryVertices(lintelGeo, 0.06, 1.5);
  const altarGeo = new THREE.CylinderGeometry(1.5, 1.75, 0.72, 8);
  altarGeo.translate(0, 0.36, 0);
  const magicRuneRingGeo = new THREE.RingGeometry(0.85, 1.25, 24);
  magicRuneRingGeo.rotateX(-Math.PI / 2);
  const magicCrystalGeo = new THREE.OctahedronGeometry(0.45, 0);
  const magicRuneStripGeo = new THREE.BoxGeometry(0.18, 2.2, 0.82);

  disposableGeometries.push(monolithGeo, lintelGeo, altarGeo, magicRuneRingGeo, magicCrystalGeo, magicRuneStripGeo);

  stoneCircleGroup.add(new THREE.Mesh(altarGeo, rockMat));
  const runeRingMesh = new THREE.Mesh(magicRuneRingGeo, magicRuneMat);
  runeRingMesh.position.set(0, 0.74, 0);
  const altarCrystalMesh = new THREE.Mesh(magicCrystalGeo, magicRuneMat);
  altarCrystalMesh.position.set(0, 1.35, 0);
  stoneCircleGroup.add(runeRingMesh, altarCrystalMesh);

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const mx = Math.cos(ang) * 6.5;
    const mz = Math.sin(ang) * 6.5;
    const mono = new THREE.Mesh(monolithGeo, rockMat);
    mono.position.set(mx, 0, mz);
    mono.rotation.y = ang + Math.PI / 2;
    stoneCircleGroup.add(mono);
    if (i % 2 === 0) {
      const lintel = new THREE.Mesh(lintelGeo, rockMat);
      lintel.position.set(mx, 4.2, mz);
      lintel.rotation.y = ang;
      stoneCircleGroup.add(lintel);
    }
  }

  const hillBushGeo = new THREE.DodecahedronGeometry(1.05, 1);
  hillBushGeo.scale(1.25, 0.85, 1.25);
  hillBushGeo.translate(0, 0.65, 0);
  disposableGeometries.push(hillBushGeo);

  const maxHillBushes = 150;
  const hillBushInstanced = new THREE.InstancedMesh(hillBushGeo, hillBushMat, maxHillBushes);
  const bDummy = new THREE.Object3D();
  const bTint = new THREE.Color();
  let bIdx = 0;
  const bushRadii = [11.8, 15.2, 18.8, 22.5, 26.5, 30.5, 34.2];
  for (let rIdx = 0; rIdx < bushRadii.length; rIdx++) {
    const rad = bushRadii[rIdx];
    const count = 16 + rIdx * 3;
    for (let i = 0; i < count; i++) {
      if (bIdx >= maxHillBushes) break;
      const ang = (i / count) * Math.PI * 2 + rIdx * 0.51;
      const bx = MAGIC_STONE_CIRCLE_POS.x + Math.cos(ang) * rad;
      const bz = MAGIC_STONE_CIRCLE_POS.z + Math.sin(ang) * rad;
      const abx = MAGIC_STONE_CIRCLE_POS.x - MAGIC_STONE_CIRCLE_POS.entryStartX;
      const abz = MAGIC_STONE_CIRCLE_POS.z - MAGIC_STONE_CIRCLE_POS.entryStartZ;
      const tSeg = Math.max(
        0,
        Math.min(
          1,
          ((bx - MAGIC_STONE_CIRCLE_POS.entryStartX) * abx +
            (bz - MAGIC_STONE_CIRCLE_POS.entryStartZ) * abz) /
            (abx * abx + abz * abz)
        )
      );
      const distToPath = Math.hypot(
        bx - (MAGIC_STONE_CIRCLE_POS.entryStartX + tSeg * abx),
        bz - (MAGIC_STONE_CIRCLE_POS.entryStartZ + tSeg * abz)
      );
      if (distToPath < 3.6) continue;

      const by = groundHeightAt(bx, bz);
      bDummy.position.set(
        bx - MAGIC_STONE_CIRCLE_POS.x,
        by - circleY - 0.1,
        bz - MAGIC_STONE_CIRCLE_POS.z
      );
      bDummy.rotation.set(0, (i * 1.7 + rIdx) % (Math.PI * 2), 0);
      const sc = 0.85 + ((i * 11 + rIdx * 7) % 6) * 0.12;
      bDummy.scale.set(sc, sc * 0.92, sc);
      bDummy.updateMatrix();
      hillBushInstanced.setMatrixAt(bIdx, bDummy.matrix);
      bTint.setHSL(0.3 + ((i % 3) - 1) * 0.02, 0.52, 0.24 + (i % 4) * 0.03);
      hillBushInstanced.setColorAt(bIdx, bTint);
      bIdx++;
    }
  }
  hillBushInstanced.count = bIdx;
  hillBushInstanced.instanceMatrix.needsUpdate = true;
  if (hillBushInstanced.instanceColor) hillBushInstanced.instanceColor.needsUpdate = true;
  hillBushInstanced.computeBoundingSphere();
  stoneCircleGroup.add(hillBushInstanced);

  scene.add(stoneCircleGroup);
  distanceCulledObjects.push({
    obj: stoneCircleGroup,
    cx: MAGIC_STONE_CIRCLE_POS.x,
    cz: MAGIC_STONE_CIRCLE_POS.z,
    radius: 42,
  });

  // --- 4) BRAND-NEW SUBTERRANEAN CAVERN MINE & TURQUOISE WATERFALL LAGOON ---
  const mineGroup = new THREE.Group();
  const mineX = SOUTHERN_MINE_POS.x;
  const mineEntY = SOUTHERN_MINE_POS.entranceY;
  const mineEntZ = SOUTHERN_MINE_POS.entranceZ;
  const shaftStartZ = SOUTHERN_MINE_POS.shaftStartZ;
  const shaftEndZ = SOUTHERN_MINE_POS.shaftEndZ;
  const cavernBackZ = SOUTHERN_MINE_POS.cavernBackZ;
  const cavernFloorY = SOUTHERN_MINE_POS.cavernFloorY;
  const shaftLen = shaftEndZ - shaftStartZ;
  const shaftDrop = mineEntY - cavernFloorY;
  const shaftSlopeLen = Math.hypot(shaftLen, shaftDrop);
  const shaftAngle = Math.atan2(shaftDrop, shaftLen);
  mineGroup.position.set(mineX, 0, mineEntZ);

  const portalVestibuleFloorGeo = new THREE.BoxGeometry(7.2, 0.4, 5.8);
  const portalSideWallGeo = new THREE.BoxGeometry(0.55, 4.6, 4.8);
  const portalHeadwallRockGeo = new THREE.BoxGeometry(7.2, 0.55, 4.8);
  const portalTimberPillarGeo = new THREE.BoxGeometry(0.58, 4.5, 0.58);
  portalTimberPillarGeo.translate(0, 2.25, 0);
  const portalTimberLintelGeo = new THREE.BoxGeometry(7.4, 0.62, 0.72);
  const portalSignBoardGeo = new THREE.BoxGeometry(3.6, 0.72, 0.18);

  const shaftSlopeFloorGeo = new THREE.BoxGeometry(7.6, 0.45, shaftSlopeLen + 2.4);
  const shaftSlopeCeilingGeo = new THREE.BoxGeometry(9.2, 1.8, shaftSlopeLen + 3.2);
  const shaftSlopeWallGeo = new THREE.BoxGeometry(1.6, 10.5, shaftSlopeLen + 3.2);
  const shaftStepPlankGeo = new THREE.BoxGeometry(2.6, 0.22, 0.68);
  const shaftSlopeRailGeo = new THREE.BoxGeometry(0.11, 0.12, shaftSlopeLen + 3.2);
  const mineSleeperGeo = new THREE.BoxGeometry(1.85, 0.09, 0.26);
  const mineTimberPostGeo = new THREE.BoxGeometry(0.46, 4.8, 0.46);
  mineTimberPostGeo.translate(0, 2.4, 0);
  const mineTimberBeamGeo = new THREE.BoxGeometry(7.1, 0.48, 0.48);

  const cavernHeight = SOUTHERN_MINE_POS.cavernHeight;
  const cavernStalactiteGeo = new THREE.ConeGeometry(0.88, 3.2, 6);
  cavernStalactiteGeo.rotateX(Math.PI);
  const mineCartBodyGeo = new THREE.BoxGeometry(1.42, 0.88, 2.05);
  const mineCartWheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 10);
  mineCartWheelGeo.rotateZ(Math.PI / 2);
  const crystalSpireGeo = new THREE.ConeGeometry(0.56, 2.8, 6);
  crystalSpireGeo.translate(0, 1.3, 0);
  const mineCrystalClusterGeo = new THREE.OctahedronGeometry(0.46, 0);
  const mineGoldOreGeo = new THREE.DodecahedronGeometry(0.32, 0);
  const forgeBrazierBaseGeo = new THREE.CylinderGeometry(1.35, 1.55, 0.95, 10);
  forgeBrazierBaseGeo.translate(0, 0.475, 0);
  const forgeCoalMoundGeo = new THREE.SphereGeometry(1.12, 10, 8);
  forgeCoalMoundGeo.scale(1.0, 0.45, 1.0);
  const rockBoulderGeo = new THREE.DodecahedronGeometry(1.15, 1);
  perturbGeometryVertices(rockBoulderGeo, 0.18, 1.4);
  const sparkChunkGeo = new THREE.OctahedronGeometry(0.085, 0);

  disposableGeometries.push(
    portalVestibuleFloorGeo,
    portalSideWallGeo,
    portalHeadwallRockGeo,
    portalTimberPillarGeo,
    portalTimberLintelGeo,
    portalSignBoardGeo,
    shaftSlopeFloorGeo,
    shaftSlopeCeilingGeo,
    shaftSlopeWallGeo,
    shaftStepPlankGeo,
    shaftSlopeRailGeo,
    mineSleeperGeo,
    mineTimberPostGeo,
    mineTimberBeamGeo,
    cavernStalactiteGeo,
    mineCartBodyGeo,
    mineCartWheelGeo,
    crystalSpireGeo,
    mineCrystalClusterGeo,
    mineGoldOreGeo,
    forgeBrazierBaseGeo,
    forgeCoalMoundGeo,
    rockBoulderGeo,
    sparkChunkGeo
  );

  // Subterranean Bedrock Outer Vault Shell (BackSide) around the entire underground mine so external sky/trees can never bleed through any seam
  const bedrockShellMat = new THREE.MeshBasicMaterial({
    color: 0x07090e,
    side: THREE.BackSide,
  });
  const bedrockOuterVaultGeo = new THREE.BoxGeometry(316.0, 48.0, 236.0);
  disposableMaterials.push(bedrockShellMat);
  disposableGeometries.push(bedrockOuterVaultGeo);
  const bedrockOuterVaultMesh = new THREE.Mesh(bedrockOuterVaultGeo, bedrockShellMat);
  bedrockOuterVaultMesh.position.set(-2.0, -25.4, 148.0);
  mineGroup.add(bedrockOuterVaultMesh);

  // 1) Entrance Portal & Sloping Timber-Shored Mine Shaft (lz = 0 .. 34.0)
  const vestibuleFloor = new THREE.Mesh(portalVestibuleFloorGeo, mineDarkRockMat);
  vestibuleFloor.position.set(0, mineEntY - 0.2, 1.8);
  const portalWestWall = new THREE.Mesh(portalSideWallGeo, mineDarkRockMat);
  portalWestWall.position.set(-3.45, mineEntY + 2.15, 2.3);
  const portalEastWall = new THREE.Mesh(portalSideWallGeo, mineDarkRockMat);
  portalEastWall.position.set(3.45, mineEntY + 2.15, 2.3);
  const portalHeadwall = new THREE.Mesh(portalHeadwallRockGeo, mineDarkRockMat);
  portalHeadwall.position.set(0, mineEntY + 4.38, 2.4);
  mineGroup.add(vestibuleFloor, portalWestWall, portalEastWall, portalHeadwall);

  for (const pz of [0.2, 2.0]) {
    for (const px of [-3.15, 3.15]) {
      const pPost = new THREE.Mesh(portalTimberPillarGeo, barkMat);
      pPost.position.set(px, mineEntY, pz);
      mineGroup.add(pPost);
    }
    const pLintel = new THREE.Mesh(portalTimberLintelGeo, timberMat);
    pLintel.position.set(0, mineEntY + 4.35, pz);
    mineGroup.add(pLintel);
  }
  const portalSign = new THREE.Mesh(portalSignBoardGeo, mineGoldOreMat);
  portalSign.position.set(0, mineEntY + 4.38, -0.18);
  mineGroup.add(
    portalSign,
    createLanternAssembly(-2.65, mineEntY + 3.1, 0.0, true),
    createLanternAssembly(2.65, mineEntY + 3.1, 0.0, false)
  );

  const shaftMidLocalZ = (3.5 + 34.0) * 0.5;
  const shaftMidY = (mineEntY + cavernFloorY) * 0.5;

  const shaftFloorMesh = new THREE.Mesh(shaftSlopeFloorGeo, mineDarkRockMat);
  shaftFloorMesh.position.set(0, shaftMidY - 0.24, shaftMidLocalZ);
  shaftFloorMesh.rotation.x = shaftAngle;

  const shaftCeilingMesh = new THREE.Mesh(shaftSlopeCeilingGeo, mineDarkRockMat);
  shaftCeilingMesh.position.set(0, shaftMidY + 5.15, shaftMidLocalZ);
  shaftCeilingMesh.rotation.x = shaftAngle;

  const shaftWestWallMesh = new THREE.Mesh(shaftSlopeWallGeo, mineDarkRockMat);
  shaftWestWallMesh.position.set(-3.85, shaftMidY + 2.35, shaftMidLocalZ);
  shaftWestWallMesh.rotation.x = shaftAngle;

  const shaftEastWallMesh = new THREE.Mesh(shaftSlopeWallGeo, mineDarkRockMat);
  shaftEastWallMesh.position.set(3.85, shaftMidY + 2.35, shaftMidLocalZ);
  shaftEastWallMesh.rotation.x = shaftAngle;

  mineGroup.add(shaftFloorMesh, shaftCeilingMesh, shaftWestWallMesh, shaftEastWallMesh);

  for (const rx of [-0.55, 0.55]) {
    const sRail = new THREE.Mesh(shaftSlopeRailGeo, darkIronMat);
    sRail.position.set(rx, shaftMidY + 0.08, shaftMidLocalZ - 0.4);
    sRail.rotation.x = shaftAngle;
    mineGroup.add(sRail);
  }
  for (let s = 0; s <= 44; s++) {
    const t = s / 44;
    const sz = 3.5 + t * shaftLen;
    const sy = mineEntY - t * shaftDrop;
    const sleeper = new THREE.Mesh(mineSleeperGeo, barkMat);
    sleeper.position.set(0, sy + 0.03, sz);
    sleeper.rotation.x = shaftAngle;
    mineGroup.add(sleeper);

    if (s % 2 === 0) {
      for (const sideX of [-1.95, 1.95]) {
        const stepMesh = new THREE.Mesh(shaftStepPlankGeo, timberMat);
        stepMesh.position.set(sideX, sy - 0.04, sz);
        mineGroup.add(stepMesh);
      }
    }
  }

  for (let f = 0; f < 9; f++) {
    const t = f / 8;
    const fz = 3.8 + t * (shaftLen - 0.8);
    const fy = mineEntY - t * (shaftDrop - 0.3);
    const postL = new THREE.Mesh(mineTimberPostGeo, barkMat);
    postL.position.set(-3.05, fy, fz);
    const postR = new THREE.Mesh(mineTimberPostGeo, barkMat);
    postR.position.set(3.05, fy, fz);
    const beamTop = new THREE.Mesh(mineTimberBeamGeo, timberMat);
    beamTop.position.set(0, fy + 4.65, fz);
    mineGroup.add(postL, postR, beamTop);

    if (f % 2 === 0) {
      mineGroup.add(
        createLanternAssembly(f % 4 === 0 ? -2.45 : 2.45, fy + 3.25, fz, f === 4)
      );
    }
  }

  // ============================================================================
  // 2) ROOM 1 — ORDERLY DWARVEN ENTRY STAGING & MESS HALL (lx in [-48, 48], lz in [34, 95.5], y = -9.35m)
  //    Dry flagstone floor, Mess Hall dining tables & benches, cooking cauldron, lootable supply crates,
  //    NE hoist crane platform, stationary gold/silver ore carts, and 3 tunnel portals (West, East, South).
  // ============================================================================
  const mineSilverOreMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x64748b,
    emissiveIntensity: 0.42,
    roughness: 0.22,
    metalness: 0.92,
  });
  disposableMaterials.push(mineSilverOreMat);

  const room1FloorGeo = new THREE.BoxGeometry(102.0, 0.8, 65.0);
  const room1PavedRunnerGeo = new THREE.BoxGeometry(28.0, 0.12, 56.0);
  const cavernCeilingGeo = new THREE.BoxGeometry(102.0, 1.6, 66.0);
  const cavernSideWallNorthFlankGeo = new THREE.BoxGeometry(3.2, cavernHeight + 1.4, 26.0);
  const cavernSideWallSouthFlankGeo = new THREE.BoxGeometry(3.2, cavernHeight + 1.4, 28.5);
  const cavernSouthFlankGeo = new THREE.BoxGeometry(35.0, cavernHeight + 1.4, 3.2);
  const cavernNorthFlankGeo = new THREE.BoxGeometry(46.5, cavernHeight + 1.4, 3.2);
  const cavernNorthUpperGeo = new THREE.BoxGeometry(9.0, 3.6, 3.2);
  const tunnelPortalHeaderGeo = new THREE.BoxGeometry(3.2, 3.2, 13.0);
  const southPortalHeaderGeo = new THREE.BoxGeometry(34.0, 2.8, 3.2);

  disposableGeometries.push(
    room1FloorGeo,
    room1PavedRunnerGeo,
    cavernCeilingGeo,
    cavernSideWallNorthFlankGeo,
    cavernSideWallSouthFlankGeo,
    cavernSouthFlankGeo,
    cavernNorthFlankGeo,
    cavernNorthUpperGeo,
    tunnelPortalHeaderGeo,
    southPortalHeaderGeo
  );

  // Complete dry floor slab across Room 1 (no water in Room 1!)
  const room1FloorMesh = new THREE.Mesh(room1FloorGeo, mineDeepSlateMat);
  room1FloorMesh.position.set(0, cavernFloorY - 0.4, 65.0);
  room1FloorMesh.receiveShadow = true;
  const room1PavedMesh = new THREE.Mesh(room1PavedRunnerGeo, mineDarkRockMat);
  room1PavedMesh.position.set(-8.0, cavernFloorY - 0.02, 64.0);
  room1PavedMesh.receiveShadow = true;

  const cCeiling = new THREE.Mesh(cavernCeilingGeo, mineDeepSlateMat);
  cCeiling.position.set(0, cavernFloorY + cavernHeight, 65.0);

  // West & East perimeter walls split to leave 11m-wide tunnel openings at lz in [58.5, 69.5] with zero corner gaps
  const cWestWallNorth = new THREE.Mesh(cavernSideWallNorthFlankGeo, mineDeepSlateMat);
  cWestWallNorth.position.set(-49.0, cavernFloorY + cavernHeight * 0.5, 45.8);
  const cWestWallSouth = new THREE.Mesh(cavernSideWallSouthFlankGeo, mineDeepSlateMat);
  cWestWallSouth.position.set(-49.0, cavernFloorY + cavernHeight * 0.5, 83.25);
  const cWestWallHeader = new THREE.Mesh(tunnelPortalHeaderGeo, mineDeepSlateMat);
  cWestWallHeader.position.set(-49.0, cavernFloorY + cavernHeight - 1.0, 64.0);

  const cEastWallNorth = new THREE.Mesh(cavernSideWallNorthFlankGeo, mineDeepSlateMat);
  cEastWallNorth.position.set(49.0, cavernFloorY + cavernHeight * 0.5, 45.8);
  const cEastWallSouth = new THREE.Mesh(cavernSideWallSouthFlankGeo, mineDeepSlateMat);
  cEastWallSouth.position.set(49.0, cavernFloorY + cavernHeight * 0.5, 83.25);
  const cEastWallHeader = new THREE.Mesh(tunnelPortalHeaderGeo, mineDeepSlateMat);
  cEastWallHeader.position.set(49.0, cavernFloorY + cavernHeight - 1.0, 64.0);

  // South perimeter wall split to leave a grand 32m-wide Moria gallery opening at lx in [-16.0, 16.0]
  const cSouthWallWest = new THREE.Mesh(cavernSouthFlankGeo, mineDeepSlateMat);
  cSouthWallWest.position.set(-33.2, cavernFloorY + cavernHeight * 0.5, 96.0);
  const cSouthWallEast = new THREE.Mesh(cavernSouthFlankGeo, mineDeepSlateMat);
  cSouthWallEast.position.set(33.2, cavernFloorY + cavernHeight * 0.5, 96.0);
  const cSouthWallHeader = new THREE.Mesh(southPortalHeaderGeo, mineDeepSlateMat);
  cSouthWallHeader.position.set(0, cavernFloorY + cavernHeight - 0.8, 96.0);

  const cNorthWestWall = new THREE.Mesh(cavernNorthFlankGeo, mineDeepSlateMat);
  cNorthWestWall.position.set(-26.4, cavernFloorY + cavernHeight * 0.5, 34.0);
  const cNorthEastWall = new THREE.Mesh(cavernNorthFlankGeo, mineDeepSlateMat);
  cNorthEastWall.position.set(26.4, cavernFloorY + cavernHeight * 0.5, 34.0);
  const cNorthUpper = new THREE.Mesh(cavernNorthUpperGeo, mineDeepSlateMat);
  cNorthUpper.position.set(0, cavernFloorY + cavernHeight - 1.2, 34.0);

  mineGroup.add(
    room1FloorMesh,
    room1PavedMesh,
    cCeiling,
    cWestWallNorth,
    cWestWallSouth,
    cWestWallHeader,
    cEastWallNorth,
    cEastWallSouth,
    cEastWallHeader,
    cSouthWallWest,
    cSouthWallEast,
    cSouthWallHeader,
    cNorthWestWall,
    cNorthEastWall,
    cNorthUpper
  );

  // Ceiling stalactites in Room 1
  for (let st = 0; st < 28; st++) {
    const stX = ((st * 19) % 84) - 42.0;
    const stZ = 38.0 + ((st * 17) % 52);
    if (Math.abs(stX) < 6.0 && stZ < 44.0) continue;
    const stalactite = new THREE.Mesh(cavernStalactiteGeo, mineDarkRockMat);
    const sc = 0.8 + (st % 3) * 0.28;
    stalactite.position.set(stX, cavernFloorY + cavernHeight - 0.95 * sc, stZ);
    stalactite.scale.set(sc, sc * 1.15, sc);
    mineGroup.add(stalactite);
  }

  // 3) Heavy Timber-Framed Tunnel Portal Arches
  const archPillarGeo = new THREE.BoxGeometry(0.68, 5.4, 0.68);
  archPillarGeo.translate(0, 2.7, 0);
  const archBasePlinthGeo = new THREE.BoxGeometry(1.05, 0.65, 1.05);
  archBasePlinthGeo.translate(0, 0.325, 0);
  const archMainBeamGeo = new THREE.BoxGeometry(6.8, 0.58, 0.72);
  const archKingPostGeo = new THREE.BoxGeometry(0.52, 1.25, 0.52);
  const archRafterGeo = new THREE.BoxGeometry(3.8, 0.42, 0.56);
  const archKneeBraceGeo = new THREE.BoxGeometry(1.65, 0.36, 0.44);
  disposableGeometries.push(
    archPillarGeo,
    archBasePlinthGeo,
    archMainBeamGeo,
    archKingPostGeo,
    archRafterGeo,
    archKneeBraceGeo
  );

  const createTimberTunnelArch = (
    cx: number,
    cy: number,
    cz: number,
    yaw: number,
    addPointLight: boolean
  ): THREE.Group => {
    const archGrp = new THREE.Group();
    archGrp.position.set(cx, cy, cz);
    archGrp.rotation.y = yaw;
    for (const side of [-1, 1]) {
      const plinth = new THREE.Mesh(archBasePlinthGeo, mineDarkRockMat);
      plinth.position.set(side * 2.75, 0, 0);
      const pillar = new THREE.Mesh(archPillarGeo, timberMat);
      pillar.position.set(side * 2.75, 0.5, 0);
      const brace = new THREE.Mesh(archKneeBraceGeo, barkMat);
      brace.position.set(side * 2.05, 4.45, 0);
      brace.rotation.z = side * 0.68;
      const rafter = new THREE.Mesh(archRafterGeo, timberMat);
      rafter.position.set(side * 1.55, 5.65, 0);
      rafter.rotation.z = -side * 0.32;
      archGrp.add(plinth, pillar, brace, rafter);
    }
    const mainBeam = new THREE.Mesh(archMainBeamGeo, timberMat);
    mainBeam.position.set(0, 5.15, 0);
    const kingPost = new THREE.Mesh(archKingPostGeo, barkMat);
    kingPost.position.set(0, 5.75, 0);
    archGrp.add(
      mainBeam,
      kingPost,
      createLanternAssembly(-2.15, 3.85, 0.38, addPointLight),
      createLanternAssembly(2.15, 3.85, -0.38, false)
    );
    return archGrp;
  };

  mineGroup.add(
    createTimberTunnelArch(0, cavernFloorY, 35.0, 0, true),
    createTimberTunnelArch(-47.5, cavernFloorY, 64.0, Math.PI / 2, true),
    createTimberTunnelArch(47.5, cavernFloorY, 64.0, -Math.PI / 2, true)
  );

  // 4) ROOM 1 MESS HALL: Two Long Dwarven Dining Tables, Benches, Tankards, Feast Platters & Cooking Cauldron
  const messTableTopGeo = new THREE.BoxGeometry(9.2, 0.16, 1.8);
  const messTableLegGeo = new THREE.BoxGeometry(0.28, 0.82, 1.45);
  messTableLegGeo.translate(0, 0.41, 0);
  const messBenchGeo = new THREE.BoxGeometry(8.8, 0.46, 0.56);
  messBenchGeo.translate(0, 0.23, 0);
  const messMugGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.24, 8);
  messMugGeo.translate(0, 0.12, 0);
  const messPlatterGeo = new THREE.CylinderGeometry(0.36, 0.3, 0.06, 10);
  messPlatterGeo.translate(0, 0.03, 0);
  const cauldronGeo = new THREE.SphereGeometry(0.85, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.75);
  const lootCrateGeo = new THREE.BoxGeometry(1.35, 1.05, 1.35);
  lootCrateGeo.translate(0, 0.525, 0);
  const lootCrateBandGeo = new THREE.BoxGeometry(1.41, 0.12, 1.41);
  const royalChestBodyGeo = new THREE.BoxGeometry(1.65, 0.95, 1.05);
  royalChestBodyGeo.translate(0, 0.475, 0);

  disposableGeometries.push(
    messTableTopGeo,
    messTableLegGeo,
    messBenchGeo,
    messMugGeo,
    messPlatterGeo,
    cauldronGeo,
    lootCrateGeo,
    lootCrateBandGeo,
    royalChestBodyGeo
  );

  for (const tableZ of [56.0, 68.0]) {
    const tGroup = new THREE.Group();
    tGroup.position.set(-14.0, cavernFloorY, tableZ);
    const topMesh = new THREE.Mesh(messTableTopGeo, timberMat);
    topMesh.position.set(0, 0.86, 0);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    tGroup.add(topMesh);
    for (const lx of [-3.8, 0.0, 3.8]) {
      const leg = new THREE.Mesh(messTableLegGeo, barkMat);
      leg.position.set(lx, 0, 0);
      tGroup.add(leg);
    }
    for (const bz of [-1.45, 1.45]) {
      const bench = new THREE.Mesh(messBenchGeo, timberMat);
      bench.position.set(0, 0, bz);
      bench.castShadow = true;
      bench.receiveShadow = true;
      tGroup.add(bench);
    }
    // Golden tankards & feast platters along the dining table
    for (let m = -3.4; m <= 3.4; m += 1.7) {
      for (const sideZ of [-0.52, 0.52]) {
        const mug = new THREE.Mesh(messMugGeo, mineGoldOreMat);
        mug.position.set(m + (sideZ > 0 ? 0.2 : -0.2), 0.94, sideZ);
        tGroup.add(mug);
      }
      const platter = new THREE.Mesh(messPlatterGeo, darkIronMat);
      platter.position.set(m, 0.94, 0);
      const roast = new THREE.Mesh(forgeCoalMoundGeo, barkMat);
      roast.scale.set(0.22, 0.35, 0.18);
      roast.position.set(m, 1.02, 0);
      tGroup.add(platter, roast);
    }
    mineGroup.add(tGroup);
  }

  // Central Mess Hall Cooking Brazier & Stew Cauldron at (-14.0, 62.0)
  const messHearthBase = new THREE.Mesh(forgeBrazierBaseGeo, darkIronMat);
  messHearthBase.position.set(-14.0, cavernFloorY, 62.0);
  const messEmbers = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
  messEmbers.position.set(-14.0, cavernFloorY + 0.85, 62.0);
  const stewCauldron = new THREE.Mesh(cauldronGeo, darkIronMat);
  stewCauldron.position.set(-14.0, cavernFloorY + 1.45, 62.0);
  stewCauldron.rotation.x = Math.PI;
  const messFireLight = new THREE.PointLight(0xff8c24, 5.2, 42, 1.25);
  messFireLight.position.set(-14.0, cavernFloorY + 2.8, 62.0);
  messFireLight.userData.isUndergroundMineLight = true;
  messFireLight.userData.baseIntensity = 5.2;
  lanternLights.push(messFireLight);
  mineGroup.add(messHearthBase, messEmbers, stewCauldron, messFireLight);

  // Helper to build visual Interactive Lootable Supply Crates & Stacked Background Crates
  const createInteractiveSupplyCrate = (
    lx: number,
    ly: number,
    lz: number,
    addLantern: boolean
  ): THREE.Group => {
    const cGrp = new THREE.Group();
    cGrp.position.set(lx, ly, lz);
    const box = new THREE.Mesh(lootCrateGeo, timberMat);
    box.castShadow = true;
    box.receiveShadow = true;
    const bandBot = new THREE.Mesh(lootCrateBandGeo, darkIronMat);
    bandBot.position.set(0, 0.18, 0);
    const bandTop = new THREE.Mesh(lootCrateBandGeo, mineGoldOreMat);
    bandTop.position.set(0, 0.92, 0);
    cGrp.add(box, bandBot, bandTop);
    if (addLantern) {
      cGrp.add(createLanternAssembly(0, 1.42, 0, false));
    }
    return cGrp;
  };

  // Place the 3 Interactive Lootable Supply Crates in Room 1 (matching WORLD_CHESTS coordinates!)
  mineGroup.add(
    createInteractiveSupplyCrate(-22.5, cavernFloorY, 56.0, true),
    createInteractiveSupplyCrate(-22.5, cavernFloorY, 68.0, true),
    createInteractiveSupplyCrate(11.5, cavernFloorY, 62.0, true)
  );
  // Decorative side crates & barrels around Room 1 staging area
  for (const [cx, cz] of [
    [-22.8, 54.2],
    [-22.8, 70.0],
    [11.8, 60.2],
  ] as const) {
    const sideCrate = new THREE.Mesh(lootCrateGeo, barkMat);
    sideCrate.scale.setScalar(0.78);
    sideCrate.position.set(cx, cavernFloorY, cz);
    mineGroup.add(sideCrate);
  }

  // 5) Cliffside Wooden Scaffolding Platform, Walkable Stairs & Tall Timber Hoist Crane Tower with Hanging Cage!
  const nePlatformGeo = new THREE.BoxGeometry(16.0, 0.28, 11.5);
  const nwGalleryGeo = new THREE.BoxGeometry(9.0, 0.26, 5.0);
  const scaffoldLegGeo = new THREE.CylinderGeometry(0.2, 0.24, 3.8, 8);
  scaffoldLegGeo.translate(0, 1.9, 0);
  const craneTowerPostGeo = new THREE.BoxGeometry(0.38, 9.6, 0.38);
  craneTowerPostGeo.translate(0, 4.8, 0);
  const craneBraceGeo = new THREE.BoxGeometry(5.6, 0.26, 0.26);
  const craneJibBeamGeo = new THREE.BoxGeometry(8.8, 0.42, 0.42);
  const craneChainGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.8, 6);
  const craneCageGeo = new THREE.BoxGeometry(1.45, 1.65, 1.45);
  disposableGeometries.push(
    nePlatformGeo,
    nwGalleryGeo,
    scaffoldLegGeo,
    craneTowerPostGeo,
    craneBraceGeo,
    craneJibBeamGeo,
    craneChainGeo,
    craneCageGeo
  );

  const scaffoldPlatformY = SOUTHERN_MINE_POS.catwalkY; // -5.55m
  const nePlatformMesh = new THREE.Mesh(nePlatformGeo, timberMat);
  nePlatformMesh.position.set(16.0, scaffoldPlatformY - 0.14, 43.25);
  const nwGalleryMesh = new THREE.Mesh(nwGalleryGeo, timberMat);
  nwGalleryMesh.position.set(-13.5, scaffoldPlatformY - 0.13, 38.5);
  mineGroup.add(nePlatformMesh, nwGalleryMesh);

  for (const [lx, lz] of [
    [8.5, 38.2],
    [15.5, 38.2],
    [23.5, 38.2],
    [8.5, 48.5],
    [15.5, 48.5],
    [23.5, 48.5],
    [-17.5, 36.5],
    [-9.5, 36.5],
    [-17.5, 40.5],
    [-9.5, 40.5],
  ] as const) {
    const leg = new THREE.Mesh(scaffoldLegGeo, barkMat);
    leg.position.set(lx, cavernFloorY, lz);
    mineGroup.add(leg);
  }

  for (let s = 0; s <= 16; s++) {
    const t = s / 16;
    const stepMesh = new THREE.Mesh(shaftStepPlankGeo, timberMat);
    stepMesh.scale.x = 1.45;
    stepMesh.position.set(
      10.5,
      cavernFloorY + t * (scaffoldPlatformY - cavernFloorY) - 0.08,
      57.5 - t * 8.5
    );
    mineGroup.add(stepMesh);
  }

  const craneTowerGroup = new THREE.Group();
  craneTowerGroup.position.set(21.5, scaffoldPlatformY, 44.0);
  for (const tx of [-2.4, 2.4]) {
    for (const tz of [-2.4, 2.4]) {
      const tPost = new THREE.Mesh(craneTowerPostGeo, barkMat);
      tPost.position.set(tx, 0, tz);
      craneTowerGroup.add(tPost);
    }
  }
  for (const by of [2.4, 4.8, 7.2, 9.2]) {
    for (const tz of [-2.4, 2.4]) {
      const hBeam = new THREE.Mesh(craneBraceGeo, timberMat);
      hBeam.position.set(0, by, tz);
      craneTowerGroup.add(hBeam);
    }
    const diagBrace = new THREE.Mesh(craneBraceGeo, barkMat);
    diagBrace.position.set(0, by - 1.1, 2.4);
    diagBrace.rotation.z = by % 4.8 === 0 ? 0.42 : -0.42;
    craneTowerGroup.add(diagBrace);
  }
  mineGroup.add(craneTowerGroup);

  const craneMast = new THREE.Mesh(craneTowerPostGeo, barkMat);
  craneMast.position.set(16.0, cavernFloorY, 76.0);
  const craneJib = new THREE.Mesh(craneJibBeamGeo, timberMat);
  craneJib.position.set(12.6, cavernFloorY + 8.6, 76.0);
  mineGroup.add(craneMast, craneJib);

  const hangingOreCageGroup = new THREE.Group();
  hangingOreCageGroup.position.set(9.4, cavernFloorY + 6.7, 76.0);
  const cageChain = new THREE.Mesh(craneChainGeo, darkIronMat);
  const cageBox = new THREE.Mesh(craneCageGeo, barkMat);
  cageBox.position.set(0, -2.2, 0);
  const cageGold = new THREE.Mesh(forgeCoalMoundGeo, mineGoldOreMat);
  cageGold.scale.set(0.55, 0.45, 0.55);
  cageGold.position.set(0, -2.55, 0);
  hangingOreCageGroup.add(cageChain, cageBox, cageGold);
  mineGroup.add(hangingOreCageGroup);

  // ============================================================================
  // 6) WEST RAIL TUNNEL (lx in [-88, -48], lz in [58.5, 69.5]) &
  //    CHAMBER 2 — DEEP SUBTERRANEAN WATERFALL & BIOLUMINESCENT LAGOON CAVERN (lx in [-148, -88], lz in [38, 112], y = -15.55m)
  // ============================================================================
  const ch2FloorY = SOUTHERN_MINE_POS.westLagoonFloorY; // -15.55m
  const westTunnelLen = 40.0;
  const westTunnelDrop = cavernFloorY - ch2FloorY; // 6.2m drop
  const westTunnelHypot = Math.hypot(westTunnelLen, westTunnelDrop);
  const westTunnelPitch = Math.atan2(westTunnelDrop, westTunnelLen);

  const ewTunnelFloorGeo = new THREE.BoxGeometry(westTunnelHypot + 3.0, 0.8, 12.6);
  const ewTunnelWallGeo = new THREE.BoxGeometry(westTunnelHypot + 3.0, 12.0, 1.4);
  disposableGeometries.push(ewTunnelFloorGeo, ewTunnelWallGeo);

  const westTunnelFloor = new THREE.Mesh(ewTunnelFloorGeo, mineDarkRockMat);
  westTunnelFloor.position.set(-68.0, (cavernFloorY + ch2FloorY) * 0.5 - 0.35, 64.0);
  westTunnelFloor.rotation.z = westTunnelPitch;
  const westTunnelCeiling = new THREE.Mesh(ewTunnelFloorGeo, mineDeepSlateMat);
  westTunnelCeiling.position.set(-68.0, (cavernFloorY + ch2FloorY) * 0.5 + 5.6, 64.0);
  westTunnelCeiling.rotation.z = westTunnelPitch;
  const westTunnelWallN = new THREE.Mesh(ewTunnelWallGeo, mineDeepSlateMat);
  westTunnelWallN.position.set(-68.0, (cavernFloorY + ch2FloorY) * 0.5 + 2.8, 58.3);
  westTunnelWallN.rotation.z = westTunnelPitch;
  const westTunnelWallS = new THREE.Mesh(ewTunnelWallGeo, mineDeepSlateMat);
  westTunnelWallS.position.set(-68.0, (cavernFloorY + ch2FloorY) * 0.5 + 2.8, 69.7);
  westTunnelWallS.rotation.z = westTunnelPitch;
  mineGroup.add(westTunnelFloor, westTunnelCeiling, westTunnelWallN, westTunnelWallS);

  for (let f = 1; f <= 4; f++) {
    const u = f / 5;
    const tx = -48.0 - u * 40.0;
    const ty = cavernFloorY - u * westTunnelDrop;
    mineGroup.add(createTimberTunnelArch(tx, ty, 64.0, Math.PI / 2, f === 2));
  }

  // Chamber 2 Floors, Lagoon Basin, Walls, Ceiling, Plunging Turquoise Waterfall, Wooden Plank Bridge & Lakeside Dock
  const ch2SideFloorGeo = new THREE.BoxGeometry(16.0, 0.8, 76.0);
  const ch2NorthSouthFloorGeo = new THREE.BoxGeometry(34.0, 0.8, 18.0);
  const ch2BasinFloorGeo = new THREE.BoxGeometry(36.0, 0.8, 42.0);
  const ch2CeilingGeo = new THREE.BoxGeometry(64.0, 1.6, 78.0);
  const ch2NorthSouthWallGeo = new THREE.BoxGeometry(64.0, 15.0, 3.2);
  const ch2WestWallGeo = new THREE.BoxGeometry(3.2, 15.0, 78.0);
  const ch2EastNorthFlankWallGeo = new THREE.BoxGeometry(3.2, 15.0, 22.5);
  const ch2EastSouthFlankWallGeo = new THREE.BoxGeometry(3.2, 15.0, 44.5);
  const ch2EastTunnelHeaderGeo = new THREE.BoxGeometry(3.2, 8.6, 13.0);
  disposableGeometries.push(
    ch2SideFloorGeo,
    ch2NorthSouthFloorGeo,
    ch2BasinFloorGeo,
    ch2CeilingGeo,
    ch2NorthSouthWallGeo,
    ch2WestWallGeo,
    ch2EastNorthFlankWallGeo,
    ch2EastSouthFlankWallGeo,
    ch2EastTunnelHeaderGeo
  );

  const ch2EastShore = new THREE.Mesh(ch2SideFloorGeo, mineDeepSlateMat);
  ch2EastShore.position.set(-95.0, ch2FloorY - 0.4, 75.0);
  const ch2WestShore = new THREE.Mesh(ch2SideFloorGeo, mineDeepSlateMat);
  ch2WestShore.position.set(-141.0, ch2FloorY - 0.4, 75.0);
  const ch2NorthShore = new THREE.Mesh(ch2NorthSouthFloorGeo, mineDeepSlateMat);
  ch2NorthShore.position.set(-118.0, ch2FloorY - 0.4, 46.0);
  const ch2SouthShore = new THREE.Mesh(ch2NorthSouthFloorGeo, mineDeepSlateMat);
  ch2SouthShore.position.set(-118.0, ch2FloorY - 0.4, 102.0);
  const ch2BasinMesh = new THREE.Mesh(ch2BasinFloorGeo, mineDeepSlateMat);
  ch2BasinMesh.position.set(-118.0, ch2FloorY - 2.3, 73.0);
  const ch2CeilingMesh = new THREE.Mesh(ch2CeilingGeo, mineDeepSlateMat);
  ch2CeilingMesh.position.set(-118.0, ch2FloorY + 12.5, 75.0);
  const ch2NorthWall = new THREE.Mesh(ch2NorthSouthWallGeo, mineDeepSlateMat);
  ch2NorthWall.position.set(-118.0, ch2FloorY + 6.25, 38.0);
  const ch2SouthWall = new THREE.Mesh(ch2NorthSouthWallGeo, mineDeepSlateMat);
  ch2SouthWall.position.set(-118.0, ch2FloorY + 6.25, 112.0);
  const ch2WestWall = new THREE.Mesh(ch2WestWallGeo, mineDeepSlateMat);
  ch2WestWall.position.set(-148.5, ch2FloorY + 6.25, 75.0);
  const ch2EastWallN = new THREE.Mesh(ch2EastNorthFlankWallGeo, mineDeepSlateMat);
  ch2EastWallN.position.set(-88.0, ch2FloorY + 6.25, 47.8);
  const ch2EastWallS = new THREE.Mesh(ch2EastSouthFlankWallGeo, mineDeepSlateMat);
  ch2EastWallS.position.set(-88.0, ch2FloorY + 6.25, 91.2);
  const ch2EastTunnelHeader = new THREE.Mesh(ch2EastTunnelHeaderGeo, mineDeepSlateMat);
  ch2EastTunnelHeader.position.set(-88.0, ch2FloorY + 9.4, 64.0);

  mineGroup.add(
    ch2EastShore,
    ch2WestShore,
    ch2NorthShore,
    ch2SouthShore,
    ch2BasinMesh,
    ch2CeilingMesh,
    ch2NorthWall,
    ch2SouthWall,
    ch2WestWall,
    ch2EastWallN,
    ch2EastWallS,
    ch2EastTunnelHeader
  );

  // Chamber 2 Turquoise Bioluminescent Lagoon & Plunging Waterfall
  const subLakeMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
    roughness: 0.06,
    metalness: 0.14,
    clearcoat: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: 0.84,
  });
  attachAnimatedWaterWaveShader(subLakeMat, 0.042, 0.085, ctx.animatedWaterMaterials);

  const subWaterfallMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.25,
    roughness: 0.18,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(subLakeMat, subWaterfallMat);

  const subLakeAnimGeo = new THREE.PlaneGeometry(32.0, 38.0, 28, 36);
  subLakeAnimGeo.rotateX(-Math.PI / 2);
  const mainWaterfallGeo = new THREE.CylinderGeometry(
    2.6,
    3.3,
    11.5,
    16,
    1,
    true,
    -Math.PI * 0.42,
    Math.PI * 0.84
  );
  const foamRingGeo = new THREE.RingGeometry(1.6, 4.2, 24);
  foamRingGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(subLakeAnimGeo, mainWaterfallGeo, foamRingGeo);

  const subLakeMesh = new THREE.Mesh(subLakeAnimGeo, subLakeMat);
  subLakeMesh.position.set(-118.0, SOUTHERN_MINE_POS.westLagoonWaterY, 73.0);
  const mainWaterfallMesh = new THREE.Mesh(mainWaterfallGeo, subWaterfallMat);
  mainWaterfallMesh.position.set(-118.0, ch2FloorY + 5.6, 51.5);
  const waterfallFoamRing = new THREE.Mesh(foamRingGeo, subWaterfallMat);
  waterfallFoamRing.position.set(-118.0, ch2FloorY + 0.08, 54.5);
  const waterfallLight = new THREE.PointLight(0x38bdf8, 5.4, 56, 1.25);
  waterfallLight.position.set(-118.0, ch2FloorY + 5.0, 62.0);
  waterfallLight.userData.isUndergroundMineLight = true;
  waterfallLight.userData.baseIntensity = 5.4;
  lanternLights.push(waterfallLight);
  mineGroup.add(subLakeMesh, mainWaterfallMesh, waterfallFoamRing, waterfallLight);

  // Chamber 2 Walkable Wooden Plank Bridge across the Lagoon (lx in [-135.0, -101.0], lz in [70.5, 75.5])
  const bridgePlankGeo = new THREE.BoxGeometry(0.85, 0.18, 4.8);
  const bridgeBeamGeo = new THREE.BoxGeometry(34.0, 0.26, 0.32);
  const bridgePostGeo = new THREE.BoxGeometry(0.28, 1.35, 0.28);
  bridgePostGeo.translate(0, 0.675, 0);
  const bridgeRailRopeGeo = new THREE.CylinderGeometry(0.045, 0.045, 33.4, 8);
  bridgeRailRopeGeo.rotateZ(Math.PI / 2);
  const dockDeckGeo = new THREE.BoxGeometry(24.0, 0.24, 8.5);
  disposableGeometries.push(
    bridgePlankGeo,
    bridgeBeamGeo,
    bridgePostGeo,
    bridgeRailRopeGeo,
    dockDeckGeo
  );

  const ch2BridgeDeckY = ch2FloorY + 0.32;
  for (const bz of [70.85, 73.0, 75.15]) {
    const beam = new THREE.Mesh(bridgeBeamGeo, barkMat);
    beam.position.set(-118.0, ch2BridgeDeckY - 0.16, bz);
    mineGroup.add(beam);
  }
  for (let px = -134.5; px <= -101.5; px += 1.0) {
    const plank = new THREE.Mesh(bridgePlankGeo, timberMat);
    plank.position.set(px, ch2BridgeDeckY, 73.0);
    mineGroup.add(plank);
  }
  for (const px of [-134.2, -126.0, -118.0, -110.0, -101.8]) {
    for (const pz of [70.65, 75.35]) {
      const post = new THREE.Mesh(bridgePostGeo, barkMat);
      post.position.set(px, ch2BridgeDeckY, pz);
      mineGroup.add(post);
    }
  }
  for (const pz of [70.65, 75.35]) {
    const topRope = new THREE.Mesh(bridgeRailRopeGeo, timberMat);
    topRope.position.set(-118.0, ch2BridgeDeckY + 1.05, pz);
    mineGroup.add(topRope);
  }

  // Chamber 2 South Lakeside Wooden Dock (lx in [-130.0, -106.0], lz in [91.5, 100.0]) + Lootable Crate at (-112.0, 95.5)
  const ch2DockY = ch2FloorY + 0.28;
  const ch2DockMesh = new THREE.Mesh(dockDeckGeo, timberMat);
  ch2DockMesh.position.set(-118.0, ch2DockY - 0.12, 95.75);
  mineGroup.add(
    ch2DockMesh,
    createInteractiveSupplyCrate(-112.0, ch2DockY, 95.5, true),
    createLanternAssembly(-128.0, ch2DockY + 1.38, 92.2, true)
  );

  // Giant Glowing Amethyst & Sapphire Crystal Clusters in Chamber 2 West Shore (-141.0, 73.0)
  const amethystClusterGroup = new THREE.Group();
  amethystClusterGroup.position.set(-141.0, ch2FloorY, 73.0);
  for (let s = 0; s < 9; s++) {
    const spire = new THREE.Mesh(
      crystalSpireGeo,
      s % 2 === 0 ? mineAmethystCrystalMat : mineSapphireCrystalMat
    );
    const ang = (s / 9) * Math.PI * 2;
    const rad = s === 0 ? 0 : 0.85 + (s % 2) * 0.45;
    spire.position.set(Math.cos(ang) * rad, 0.35, Math.sin(ang) * rad);
    const sc = s === 0 ? 2.1 : 1.15 + (s % 3) * 0.25;
    spire.scale.set(sc * 0.85, sc * 1.35, sc * 0.85);
    amethystClusterGroup.add(spire);
  }
  const amethystLight = new THREE.PointLight(0xa855f7, 4.8, 46, 1.3);
  amethystLight.position.set(-141.0, ch2FloorY + 4.2, 73.0);
  amethystLight.userData.isUndergroundMineLight = true;
  amethystLight.userData.baseIntensity = 4.8;
  lanternLights.push(amethystLight);
  mineGroup.add(amethystClusterGroup, amethystLight);

  // ============================================================================
  // 7) EAST SMELTING RAIL TUNNEL (lx in [48, 88], lz in [58.5, 69.5]) &
  //    CHAMBER 3 — DWARVEN GOLD & SILVER SMELTING FOUNDRY (lx in [88, 144], lz in [40, 108], y = -14.35m)
  // ============================================================================
  const ch3FloorY = SOUTHERN_MINE_POS.eastFoundryFloorY; // -14.35m
  const eastTunnelDrop = cavernFloorY - ch3FloorY; // 5.0m drop
  const eastTunnelPitch = -Math.atan2(eastTunnelDrop, 40.0);

  const eastTunnelFloor = new THREE.Mesh(ewTunnelFloorGeo, mineDarkRockMat);
  eastTunnelFloor.position.set(68.0, (cavernFloorY + ch3FloorY) * 0.5 - 0.35, 64.0);
  eastTunnelFloor.rotation.z = eastTunnelPitch;
  const eastTunnelCeiling = new THREE.Mesh(ewTunnelFloorGeo, mineDeepSlateMat);
  eastTunnelCeiling.position.set(68.0, (cavernFloorY + ch3FloorY) * 0.5 + 5.6, 64.0);
  eastTunnelCeiling.rotation.z = eastTunnelPitch;
  const eastTunnelWallN = new THREE.Mesh(ewTunnelWallGeo, mineDeepSlateMat);
  eastTunnelWallN.position.set(68.0, (cavernFloorY + ch3FloorY) * 0.5 + 2.8, 58.3);
  eastTunnelWallN.rotation.z = eastTunnelPitch;
  const eastTunnelWallS = new THREE.Mesh(ewTunnelWallGeo, mineDeepSlateMat);
  eastTunnelWallS.position.set(68.0, (cavernFloorY + ch3FloorY) * 0.5 + 2.8, 69.7);
  eastTunnelWallS.rotation.z = eastTunnelPitch;
  mineGroup.add(eastTunnelFloor, eastTunnelCeiling, eastTunnelWallN, eastTunnelWallS);

  for (let f = 1; f <= 4; f++) {
    const u = f / 5;
    const tx = 48.0 + u * 40.0;
    const ty = cavernFloorY - u * eastTunnelDrop;
    mineGroup.add(createTimberTunnelArch(tx, ty, 64.0, -Math.PI / 2, f === 2));
  }

  const ch3FloorGeo = new THREE.BoxGeometry(60.0, 0.8, 72.0);
  const ch3CeilingGeo = new THREE.BoxGeometry(60.0, 1.6, 72.0);
  const ch3NorthSouthWallGeo = new THREE.BoxGeometry(60.0, 14.0, 3.2);
  const ch3EastWallGeo = new THREE.BoxGeometry(3.2, 14.0, 72.0);
  const ch3WestNorthFlankGeo = new THREE.BoxGeometry(3.2, 14.0, 21.0);
  const ch3WestSouthFlankGeo = new THREE.BoxGeometry(3.2, 14.0, 41.0);
  const ch3WestTunnelHeaderGeo = new THREE.BoxGeometry(3.2, 8.0, 13.0);
  const furnaceBodyGeo = new THREE.CylinderGeometry(2.4, 3.1, 7.8, 10);
  furnaceBodyGeo.translate(0, 3.9, 0);
  disposableGeometries.push(
    ch3FloorGeo,
    ch3CeilingGeo,
    ch3NorthSouthWallGeo,
    ch3EastWallGeo,
    ch3WestNorthFlankGeo,
    ch3WestSouthFlankGeo,
    ch3WestTunnelHeaderGeo,
    furnaceBodyGeo
  );

  const ch3FloorMesh = new THREE.Mesh(ch3FloorGeo, mineDeepSlateMat);
  ch3FloorMesh.position.set(116.0, ch3FloorY - 0.4, 74.0);
  const ch3CeilingMesh = new THREE.Mesh(ch3CeilingGeo, mineDeepSlateMat);
  ch3CeilingMesh.position.set(116.0, ch3FloorY + 12.0, 74.0);
  const ch3NorthWall = new THREE.Mesh(ch3NorthSouthWallGeo, mineDeepSlateMat);
  ch3NorthWall.position.set(116.0, ch3FloorY + 6.0, 40.0);
  const ch3SouthWall = new THREE.Mesh(ch3NorthSouthWallGeo, mineDeepSlateMat);
  ch3SouthWall.position.set(116.0, ch3FloorY + 6.0, 108.0);
  const ch3EastWall = new THREE.Mesh(ch3EastWallGeo, mineDeepSlateMat);
  ch3EastWall.position.set(144.5, ch3FloorY + 6.0, 74.0);
  const ch3WestWallN = new THREE.Mesh(ch3WestNorthFlankGeo, mineDeepSlateMat);
  ch3WestWallN.position.set(88.0, ch3FloorY + 6.0, 48.8);
  const ch3WestWallS = new THREE.Mesh(ch3WestSouthFlankGeo, mineDeepSlateMat);
  ch3WestWallS.position.set(88.0, ch3FloorY + 6.0, 89.2);
  const ch3WestTunnelHeader = new THREE.Mesh(ch3WestTunnelHeaderGeo, mineDeepSlateMat);
  ch3WestTunnelHeader.position.set(88.0, ch3FloorY + 9.0, 64.0);
  mineGroup.add(
    ch3FloorMesh,
    ch3CeilingMesh,
    ch3NorthWall,
    ch3SouthWall,
    ch3EastWall,
    ch3WestWallN,
    ch3WestWallS,
    ch3WestTunnelHeader
  );

  // Twin Dwarven Smelting Blast Furnaces at (132.0, 56.0) and (132.0, 82.0) + Lootable Foundry Bullion Crate at (122.0, 66.0)
  for (const fz of [56.0, 82.0]) {
    const fBody = new THREE.Mesh(furnaceBodyGeo, mineDarkRockMat);
    fBody.position.set(132.0, ch3FloorY, fz);
    const fCore = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
    fCore.scale.set(2.2, 1.4, 2.2);
    fCore.position.set(129.8, ch3FloorY + 0.9, fz);
    mineGroup.add(fBody, fCore);
  }
  const foundryLight = new THREE.PointLight(0xf97316, 5.6, 54, 1.25);
  foundryLight.position.set(124.0, ch3FloorY + 4.5, 68.0);
  foundryLight.userData.isUndergroundMineLight = true;
  foundryLight.userData.baseIntensity = 5.6;
  lanternLights.push(foundryLight);
  mineGroup.add(
    foundryLight,
    createInteractiveSupplyCrate(122.0, ch3FloorY, 66.0, true)
  );

  // ============================================================================
  // 8) SOUTH GRAND MORIA DESCENT GALLERY (lx in [-16, 16], lz in [95, 145]) &
  //    CHAMBER 4 — THE GREAT HALL OF KHAZAD-DÛM & BRIDGE OVER THE BOTTOMLESS ABYSS
  //    (lx in [-64, 64], lz in [145, 255], y = -18.35m, Abyss plunging to -46.0m!)
  // ============================================================================
  const moriaFloorY = SOUTHERN_MINE_POS.moriaHallFloorY; // -18.35m
  const moriaAbyssY = SOUTHERN_MINE_POS.moriaAbyssBottomY; // -46.0m
  const southGalleryLen = 50.0;
  const southGalleryDrop = cavernFloorY - moriaFloorY; // 9.0m drop
  const southGalleryHypot = Math.hypot(southGalleryLen, southGalleryDrop);
  const southGalleryPitch = Math.atan2(southGalleryDrop, southGalleryLen);

  const southGalleryFloorGeo = new THREE.BoxGeometry(34.5, 0.8, southGalleryHypot + 3.0);
  const southGalleryWallGeo = new THREE.BoxGeometry(2.2, 16.0, southGalleryHypot + 3.0);
  disposableGeometries.push(southGalleryFloorGeo, southGalleryWallGeo);

  const sgFloor = new THREE.Mesh(southGalleryFloorGeo, mineDarkRockMat);
  sgFloor.position.set(0, (cavernFloorY + moriaFloorY) * 0.5 - 0.35, 120.0);
  sgFloor.rotation.x = southGalleryPitch;
  const sgCeiling = new THREE.Mesh(southGalleryFloorGeo, mineDeepSlateMat);
  sgCeiling.position.set(0, (cavernFloorY + moriaFloorY) * 0.5 + 7.2, 120.0);
  sgCeiling.rotation.x = southGalleryPitch;
  const sgWallW = new THREE.Mesh(southGalleryWallGeo, mineDeepSlateMat);
  sgWallW.position.set(-16.6, (cavernFloorY + moriaFloorY) * 0.5 + 3.6, 120.0);
  sgWallW.rotation.x = southGalleryPitch;
  const sgWallE = new THREE.Mesh(southGalleryWallGeo, mineDeepSlateMat);
  sgWallE.position.set(16.6, (cavernFloorY + moriaFloorY) * 0.5 + 3.6, 120.0);
  sgWallE.rotation.x = southGalleryPitch;
  mineGroup.add(sgFloor, sgCeiling, sgWallW, sgWallE);

  // Chamber 4: North Colonnade Hall Floor (lz in [145, 180]), Bottomless Abyss Floor (lz in [180, 216] at y = -46.0m),
  //            and South Royal Sanctuary Floor (lz in [216, 255])
  const moriaHallNorthFloorGeo = new THREE.BoxGeometry(132.0, 1.0, 37.0);
  const moriaHallSouthFloorGeo = new THREE.BoxGeometry(132.0, 1.0, 41.0);
  const moriaAbyssBottomGeo = new THREE.BoxGeometry(132.0, 1.0, 40.0);
  const moriaChasmWallGeo = new THREE.BoxGeometry(132.0, 29.0, 2.2);
  const moriaCeilingGeo = new THREE.BoxGeometry(132.0, 1.8, 114.0);
  const moriaSideWallGeo = new THREE.BoxGeometry(3.2, 48.0, 114.0);
  const moriaBackWallGeo = new THREE.BoxGeometry(132.0, 48.0, 3.2);
  const moriaNorthFlankWallGeo = new THREE.BoxGeometry(50.5, 22.0, 3.2);
  const moriaNorthGalleryHeaderGeo = new THREE.BoxGeometry(35.0, 11.5, 3.2);
  const moriaPillarShaftGeo = new THREE.CylinderGeometry(1.85, 2.15, 16.0, 8);
  moriaPillarShaftGeo.translate(0, 8.0, 0);
  const moriaPillarCapitalGeo = new THREE.BoxGeometry(4.8, 1.2, 4.8);
  const khazadBridgeSegGeo = new THREE.BoxGeometry(6.8, 0.85, 4.4);
  const trestleDeckGeo = new THREE.BoxGeometry(6.8, 0.45, 40.5);
  const trestlePilingGeo = new THREE.BoxGeometry(0.65, 28.0, 0.65);
  const royalDiasGeo = new THREE.BoxGeometry(20.0, 0.8, 12.0);

  disposableGeometries.push(
    moriaHallNorthFloorGeo,
    moriaHallSouthFloorGeo,
    moriaAbyssBottomGeo,
    moriaChasmWallGeo,
    moriaCeilingGeo,
    moriaSideWallGeo,
    moriaBackWallGeo,
    moriaNorthFlankWallGeo,
    moriaNorthGalleryHeaderGeo,
    moriaPillarShaftGeo,
    moriaPillarCapitalGeo,
    khazadBridgeSegGeo,
    trestleDeckGeo,
    trestlePilingGeo,
    royalDiasGeo
  );

  const moriaNorthFloor = new THREE.Mesh(moriaHallNorthFloorGeo, mineDeepSlateMat);
  moriaNorthFloor.position.set(0, moriaFloorY - 0.5, 162.5);
  const moriaSouthFloor = new THREE.Mesh(moriaHallSouthFloorGeo, mineDeepSlateMat);
  moriaSouthFloor.position.set(0, moriaFloorY - 0.5, 235.5);
  const moriaAbyssBottom = new THREE.Mesh(moriaAbyssBottomGeo, mineDarkRockMat);
  moriaAbyssBottom.position.set(0, moriaAbyssY - 0.5, 198.0);

  // Chasm sheer cliff walls dropping 28m down into the abyss
  const chasmNorthCliff = new THREE.Mesh(moriaChasmWallGeo, mineDarkRockMat);
  chasmNorthCliff.position.set(0, moriaFloorY - 14.0, 179.5);
  const chasmSouthCliff = new THREE.Mesh(moriaChasmWallGeo, mineDarkRockMat);
  chasmSouthCliff.position.set(0, moriaFloorY - 14.0, 216.5);

  const moriaCeiling = new THREE.Mesh(moriaCeilingGeo, mineDeepSlateMat);
  moriaCeiling.position.set(0, moriaFloorY + 16.0, 200.0);
  const moriaWestWall = new THREE.Mesh(moriaSideWallGeo, mineDeepSlateMat);
  moriaWestWall.position.set(-64.5, moriaFloorY - 5.0, 200.0);
  const moriaEastWall = new THREE.Mesh(moriaSideWallGeo, mineDeepSlateMat);
  moriaEastWall.position.set(64.5, moriaFloorY - 5.0, 200.0);
  const moriaSouthBackWall = new THREE.Mesh(moriaBackWallGeo, mineDeepSlateMat);
  moriaSouthBackWall.position.set(0, moriaFloorY - 5.0, 255.5);
  const moriaNorthWallWest = new THREE.Mesh(moriaNorthFlankWallGeo, mineDeepSlateMat);
  moriaNorthWallWest.position.set(-40.5, moriaFloorY + 8.0, 145.0);
  const moriaNorthWallEast = new THREE.Mesh(moriaNorthFlankWallGeo, mineDeepSlateMat);
  moriaNorthWallEast.position.set(40.5, moriaFloorY + 8.0, 145.0);
  const moriaNorthGalleryHeader = new THREE.Mesh(moriaNorthGalleryHeaderGeo, mineDeepSlateMat);
  moriaNorthGalleryHeader.position.set(0, moriaFloorY + 12.2, 145.0);

  mineGroup.add(
    moriaNorthFloor,
    moriaSouthFloor,
    moriaAbyssBottom,
    chasmNorthCliff,
    chasmSouthCliff,
    moriaCeiling,
    moriaWestWall,
    moriaEastWall,
    moriaSouthBackWall,
    moriaNorthWallWest,
    moriaNorthWallEast,
    moriaNorthGalleryHeader
  );

  // Glowing deep-earth magma fissures at the bottom of the Moria Abyss (y = -45.8m)
  for (const ax of [-38.0, -18.0, 0.0, 22.0, 42.0]) {
    const abyssGlow = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
    abyssGlow.scale.set(5.5, 0.6, 3.2);
    abyssGlow.position.set(ax, moriaAbyssY + 0.15, 198.0 + (ax % 7));
    mineGroup.add(abyssGlow);
  }
  const abyssDeepLight = new THREE.PointLight(0xea580c, 6.2, 74, 1.2);
  abyssDeepLight.position.set(0, moriaFloorY - 6.0, 198.0);
  abyssDeepLight.userData.isUndergroundMineLight = true;
  abyssDeepLight.userData.baseIntensity = 6.2;
  lanternLights.push(abyssDeepLight);
  mineGroup.add(abyssDeepLight);

  // 16 Colossal Carved Stone Pillars of Khazad-dûm (8 in North Hall, 8 in South Hall)
  for (const pz of [154.0, 170.0, 224.0, 238.0]) {
    for (const px of [-38.0, -20.0, 20.0, 38.0]) {
      const pShaft = new THREE.Mesh(moriaPillarShaftGeo, mineDarkRockMat);
      pShaft.position.set(px, moriaFloorY, pz);
      const pBase = new THREE.Mesh(moriaPillarCapitalGeo, mineDeepSlateMat);
      pBase.position.set(px, moriaFloorY + 0.6, pz);
      const pCap = new THREE.Mesh(moriaPillarCapitalGeo, mineDeepSlateMat);
      pCap.position.set(px, moriaFloorY + 15.2, pz);
      const pGoldRing = new THREE.Mesh(moriaPillarCapitalGeo, mineGoldOreMat);
      pGoldRing.scale.set(0.88, 0.28, 0.88);
      pGoldRing.position.set(px, moriaFloorY + 3.2, pz);
      mineGroup.add(pShaft, pBase, pCap, pGoldRing);
    }
  }

  // A) THE BRIDGE OF KHAZAD-DÛM: Narrow Arched Stone Span over the Bottomless Abyss (lx in [-3.4, 3.4], lz in [178, 218])
  for (let s = 0; s < 10; s++) {
    const u0 = s / 10;
    const u1 = (s + 1) / 10;
    const um = (u0 + u1) * 0.5;
    const bz = 178.0 + um * 40.0;
    const archY = moriaFloorY + Math.sin(um * Math.PI) * 1.15;
    const slopePitch =
      Math.atan2(
        (Math.sin(u1 * Math.PI) - Math.sin(u0 * Math.PI)) * 1.15,
        4.0
      );
    const segMesh = new THREE.Mesh(khazadBridgeSegGeo, mineDarkRockMat);
    segMesh.position.set(0, archY - 0.4, bz);
    segMesh.rotation.x = -slopePitch;
    mineGroup.add(segMesh);
  }

  // B) WEST TIMBER & IRON MINECART TRESTLE BRIDGE OVER THE ABYSS (lx in [-15.0, -8.0], lz in [178, 218])
  const trestleDeck = new THREE.Mesh(trestleDeckGeo, timberMat);
  trestleDeck.position.set(-11.5, moriaFloorY - 0.22, 198.0);
  mineGroup.add(trestleDeck);
  for (const tz of [183.0, 193.0, 203.0, 213.0]) {
    for (const tx of [-14.2, -8.8]) {
      const piling = new THREE.Mesh(trestlePilingGeo, barkMat);
      piling.position.set(tx, moriaFloorY - 14.0, tz);
      mineGroup.add(piling);
    }
  }

  // C) SOUTH ROYAL SANCTUARY OF DURIN (lz in [238, 250]) & ROYAL TREASURY CHEST OF KHAZAD-DÛM at (0, 242.5)
  const royalDiasMesh = new THREE.Mesh(royalDiasGeo, mineDarkRockMat);
  royalDiasMesh.position.set(0, moriaFloorY + 0.4, 244.0);
  const royalChestMesh = new THREE.Mesh(royalChestBodyGeo, mineGoldOreMat);
  royalChestMesh.position.set(0, moriaFloorY + 0.8, 242.5);
  const sanctuaryLight = new THREE.PointLight(0xfbbf24, 5.4, 56, 1.25);
  sanctuaryLight.position.set(0, moriaFloorY + 5.5, 242.5);
  sanctuaryLight.userData.isUndergroundMineLight = true;
  sanctuaryLight.userData.baseIntensity = 5.4;
  lanternLights.push(sanctuaryLight);
  mineGroup.add(
    royalDiasMesh,
    royalChestMesh,
    sanctuaryLight,
    createLanternAssembly(-8.5, moriaFloorY + 2.2, 238.5, false),
    createLanternAssembly(8.5, moriaFloorY + 2.2, 238.5, false)
  );

  // ============================================================================
  // 9) IRON MINECART RAIL NETWORK ACROSS ALL CHAMBERS & TUNNELS
  // ============================================================================
  const railSegGeo = new THREE.BoxGeometry(0.11, 0.11, 1.45);
  disposableGeometries.push(railSegGeo);

  const buildTrackSegment3D = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number
  ) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const horizLen = Math.hypot(dx, dz);
    const steps = Math.max(2, Math.round(horizLen / 1.4));
    const yaw = Math.atan2(dx, dz);
    const nx = Math.cos(yaw) * 0.55;
    const nz = -Math.sin(yaw) * 0.55;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const px = x0 + dx * u;
      const py = y0 + dy * u;
      const pz = z0 + dz * u;
      const sleeper = new THREE.Mesh(mineSleeperGeo, barkMat);
      sleeper.position.set(px, py + 0.03, pz);
      sleeper.rotation.y = yaw;
      mineGroup.add(sleeper);
      if (i < steps) {
        const um = (i + 0.5) / steps;
        const mx = x0 + dx * um;
        const my = y0 + dy * um;
        const mz = z0 + dz * um;
        for (const side of [-1, 1]) {
          const rMesh = new THREE.Mesh(railSegGeo, darkIronMat);
          rMesh.position.set(mx + side * nx, my + 0.08, mz + side * nz);
          rMesh.rotation.y = yaw;
          mineGroup.add(rMesh);
        }
      }
    }
  };

  // Build tracks for all 3 Rideable Passenger Minecart Lines + Stationary Ore Sidings
  for (let l = 0; l < DWARVEN_RIDEABLE_MINECART_LINES.length; l++) {
    const wps = DWARVEN_RIDEABLE_MINECART_LINES[l].localWaypoints;
    for (let i = 0; i < wps.length - 1; i++) {
      const a = wps[i];
      const b = wps[i + 1];
      buildTrackSegment3D(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  }
  // Room 1 & Chamber 3 Stationary Ore Cart Sidings
  buildTrackSegment3D(5.5, cavernFloorY, 44.0, 5.5, cavernFloorY, 82.0);
  buildTrackSegment3D(16.5, cavernFloorY, 50.0, 16.5, cavernFloorY, 64.0);
  buildTrackSegment3D(22.0, cavernFloorY, 56.0, 34.0, cavernFloorY, 56.0);
  buildTrackSegment3D(102.0, ch3FloorY, 56.0, 124.0, ch3FloorY, 56.0);
  buildTrackSegment3D(102.0, ch3FloorY, 76.0, 124.0, ch3FloorY, 76.0);

  const oreKindToMat = (
    kind: 'gold' | 'silver' | 'emerald' | 'sapphire' | 'amethyst'
  ): THREE.Material => {
    switch (kind) {
      case 'silver':
        return mineSilverOreMat;
      case 'emerald':
        return mineEmeraldCrystalMat;
      case 'sapphire':
        return mineSapphireCrystalMat;
      case 'amethyst':
        return mineAmethystCrystalMat;
      default:
        return mineGoldOreMat;
    }
  };

  // ============================================================================
  // 10) 8 SCULPTURAL DWARVEN MINING ROCK & GLOWING CRYSTAL/GOLD/SILVER WALL VEINS
  // ============================================================================
  const stationSparkClusters: THREE.Group[] = [];
  for (let stIdx = 0; stIdx < DWARVEN_MINER_STATIONS.length; stIdx++) {
    const stCfg = DWARVEN_MINER_STATIONS[stIdx];
    const oreMat = oreKindToMat(stCfg.oreKind);
    const veinGroup = new THREE.Group();
    veinGroup.position.set(stCfg.rockLocalX, cavernFloorY, stCfg.rockLocalZ);

    const mainRock = new THREE.Mesh(rockBoulderGeo, mineDarkRockMat);
    mainRock.position.set(0, 0.95, 0);
    mainRock.scale.set(1.12, 1.35, 1.12);
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    veinGroup.add(mainRock);

    const upperRock = new THREE.Mesh(rockBoulderGeo, mineDeepSlateMat);
    upperRock.position.set(0, 2.05, 0);
    upperRock.scale.set(0.88, 1.05, 0.88);
    upperRock.rotation.y = stIdx * 1.1;
    veinGroup.add(upperRock);

    for (let v = 0; v < 7; v++) {
      const ang = (v / 7) * Math.PI * 2 + stIdx * 0.5;
      const seamMesh = new THREE.Mesh(
        v % 2 === 0 ? mineGoldOreGeo : crystalSpireGeo,
        oreMat
      );
      seamMesh.position.set(
        Math.cos(ang) * 0.72,
        0.55 + (v % 3) * 0.48,
        Math.sin(ang) * 0.72
      );
      seamMesh.rotation.set(Math.sin(ang) * 0.45, ang, Math.cos(ang) * 0.45);
      seamMesh.scale.setScalar(v % 2 === 0 ? 1.45 : 1.15);
      veinGroup.add(seamMesh);
    }

    const sparkGroup = new THREE.Group();
    const toDwarfX = stCfg.workLocalX - stCfg.rockLocalX;
    const toDwarfZ = stCfg.workLocalZ - stCfg.rockLocalZ;
    const toDwarfLen = Math.hypot(toDwarfX, toDwarfZ) || 1;
    sparkGroup.position.set(
      (toDwarfX / toDwarfLen) * 0.82,
      1.05,
      (toDwarfZ / toDwarfLen) * 0.82
    );
    for (let sp = 0; sp < 5; sp++) {
      const spMesh = new THREE.Mesh(sparkChunkGeo, oreMat);
      const spAng = (sp / 5) * Math.PI * 2;
      spMesh.position.set(Math.cos(spAng) * 0.18, (sp % 2) * 0.12, Math.sin(spAng) * 0.18);
      sparkGroup.add(spMesh);
    }
    veinGroup.add(sparkGroup);
    stationSparkClusters.push(sparkGroup);
    mineGroup.add(veinGroup);
  }

  // ============================================================================
  // 11) STATIONARY GOLD & SILVER ORE CARTS + 3 INTERACTIVE RIDEABLE PASSENGER MINECARTS
  // ============================================================================
  for (let c = 0; c < DWARVEN_MINECART_ROUTES.length; c++) {
    const route = DWARVEN_MINECART_ROUTES[c];
    const oreMat = oreKindToMat(route.oreKind);
    const cartGroup = new THREE.Group();
    const baseY = cavernFloorY + (route.baseYOffset ?? 0);
    cartGroup.position.set(route.startLocalX, baseY, route.startLocalZ);
    cartGroup.rotation.y = route.yaw;

    const body = new THREE.Mesh(mineCartBodyGeo, darkIronMat);
    body.position.set(0, 0.64, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    cartGroup.add(body);

    for (const wx of [-0.7, 0.7]) {
      for (const wz of [-0.65, 0.65]) {
        const wheel = new THREE.Mesh(mineCartWheelGeo, darkIronMat);
        wheel.position.set(wx, 0.25, wz);
        cartGroup.add(wheel);
      }
    }

    const oreGroup = new THREE.Group();
    oreGroup.position.set(0, 0.95, 0);
    for (let o = 0; o < 8; o++) {
      const ore = new THREE.Mesh(mineGoldOreGeo, oreMat);
      ore.position.set(
        ((o % 3) - 1) * 0.36,
        0.16 + (o % 2) * 0.14,
        (Math.floor(o / 3) - 0.8) * 0.56
      );
      ore.scale.setScalar(0.88);
      oreGroup.add(ore);
    }
    cartGroup.add(oreGroup);
    mineGroup.add(cartGroup);
  }

  // 3 Interactive Rideable Passenger Minecarts (one per tunnel line!)
  interface IRideablePassengerCartRig {
    readonly lineId: string;
    readonly group: THREE.Group;
    readonly wheels: THREE.Mesh[];
  }
  const rideablePassengerCarts: IRideablePassengerCartRig[] = [];
  const passengerSeatGeo = new THREE.BoxGeometry(1.18, 0.18, 0.68);
  const passengerHandleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.24, 8);
  passengerHandleGeo.rotateZ(Math.PI / 2);
  disposableGeometries.push(passengerSeatGeo, passengerHandleGeo);

  for (let l = 0; l < DWARVEN_RIDEABLE_MINECART_LINES.length; l++) {
    const line = DWARVEN_RIDEABLE_MINECART_LINES[l];
    const startWp = line.localWaypoints[0];
    const cartGroup = new THREE.Group();
    cartGroup.position.set(startWp[0], startWp[1], startWp[2]);

    const body = new THREE.Mesh(mineCartBodyGeo, timberMat);
    body.position.set(0, 0.64, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    const seat = new THREE.Mesh(passengerSeatGeo, barkMat);
    seat.position.set(0, 0.58, -0.2);
    const grabBar = new THREE.Mesh(passengerHandleGeo, mineGoldOreMat);
    grabBar.position.set(0, 1.18, 0.85);
    cartGroup.rotation.order = 'YXZ';
    cartGroup.add(body, seat, grabBar, createLanternAssembly(0, 1.15, 1.05, true));

    const wheels: THREE.Mesh[] = [];
    for (const wx of [-0.7, 0.7]) {
      for (const wz of [-0.65, 0.65]) {
        const wheel = new THREE.Mesh(mineCartWheelGeo, darkIronMat);
        wheel.position.set(wx, 0.25, wz);
        cartGroup.add(wheel);
        wheels.push(wheel);
      }
    }
    mineGroup.add(cartGroup);
    rideablePassengerCarts.push({ lineId: line.id, group: cartGroup, wheels });
  }

  // Warm lanterns placed along Room 1, Tunnels, and Chamber 4
  for (const [lx, ly, lz, addPt] of [
    [-25.0, cavernFloorY, 50.0, false],
    [-35.0, cavernFloorY, 61.5, false],
    [35.0, cavernFloorY, 61.5, false],
    [-9.5, cavernFloorY, 85.0, true],
    [-3.5, moriaFloorY, 177.5, true],
    [3.5, moriaFloorY, 218.5, true],
  ] as const) {
    mineGroup.add(createLanternAssembly(lx, ly + 1.35, lz, addPt));
  }

  const { updateDwarvenMiners } = buildDwarvenKingdomAndMiners({
    scene,
    mineGroup,
    mineX,
    mineEntY,
    mineEntZ,
    cavernBackZ,
    stonePatternTex: textures.rockAlbedo,
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
  });

  const updateFarmhousesAndMine = (
    elapsedTime: number,
    worldHours = 8.5,
    playerX = 0,
    playerZ = 0
  ) => {
    for (let s = 0; s < sheepFlock.length; s++) {
      const sh = sheepFlock[s];
      const ang = elapsedTime * sh.speed + sh.phase;
      const sx = sh.homeX + Math.cos(ang) * sh.orbitRadius;
      const sz = sh.homeZ + Math.sin(ang) * sh.orbitRadius;
      const sy = groundHeightAt(sx, sz);
      sh.root.position.set(sx, sy, sz);
      sh.root.rotation.y = -ang + Math.PI / 2;
      const walkCycle = Math.sin(elapsedTime * 3.5 + sh.phase * 3);
      sh.legs[0].rotation.x = walkCycle * 0.22;
      sh.legs[1].rotation.x = -walkCycle * 0.22;
      sh.legs[2].rotation.x = -walkCycle * 0.22;
      sh.legs[3].rotation.x = walkCycle * 0.22;
      sh.headPivot.rotation.x = Math.sin(elapsedTime * 0.8 + sh.phase) * 0.12 + 0.15;
    }

    if (mineGroup.visible) {
      hangingOreCageGroup.rotation.z = Math.sin(elapsedTime * 1.35) * 0.06;
      hangingOreCageGroup.position.y = cavernFloorY + 6.7 + Math.sin(elapsedTime * 0.9) * 0.22;

      // Update the 3 Interactive Rideable Passenger Minecarts (only move when player rides them!)
      for (let i = 0; i < rideablePassengerCarts.length; i++) {
        const rig = rideablePassengerCarts[i];
        const prog = getRideableMinecartVisualProgress(rig.lineId);
        const pose = evaluateRideableMinecartPose(rig.lineId, prog.u);
        rig.group.position.set(
          pose.x - SOUTHERN_MINE_POS.x,
          pose.y,
          pose.z - SOUTHERN_MINE_POS.entranceZ
        );
        rig.group.rotation.y = pose.yaw;
        rig.group.rotation.x = -pose.pitch;
        for (let w = 0; w < rig.wheels.length; w++) {
          rig.wheels[w].rotation.x = prog.wheelAngle;
        }
      }

      // Pulse pickaxe-strike ore sparks at each of the 8 mining rock veins during daytime mining hours
      const hNorm = ((worldHours % 24) + 24) % 24;
      const isMiningHours = hNorm > 7.6 && hNorm < 17.8;
      for (let stIdx = 0; stIdx < stationSparkClusters.length; stIdx++) {
        const sparkGrp = stationSparkClusters[stIdx];
        if (isMiningHours) {
          const strikeWave = Math.max(0, Math.sin(elapsedTime * 5.2 + stIdx * 1.3));
          const burst = Math.pow(strikeWave, 4);
          sparkGrp.visible = burst > 0.08;
          sparkGrp.scale.setScalar(0.35 + burst * 1.45);
          sparkGrp.rotation.y = elapsedTime * 6.0 + stIdx;
        } else {
          sparkGrp.visible = false;
        }
      }
    }
    if (updateDwarvenMiners) {
      updateDwarvenMiners(worldHours ?? 12, elapsedTime, playerX, playerZ);
    }
  };

  return { mineGroup, updateFarmhousesAndMine };
}
// #endregion
