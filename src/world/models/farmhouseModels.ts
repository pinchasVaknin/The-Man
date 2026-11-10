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
  evaluateMinecartTrackState,
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

  function createLanternAssembly(x: number, y: number, z: number, _addLight = false): THREE.Group {
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

  // --- 4) UPGRADED SOUTHERN MOUNTAIN MINE & CRYSTAL CAVERN ---
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

  const portalVestibuleFloorGeo = new THREE.BoxGeometry(6.8, 0.4, 5.8);
  const portalSideWallGeo = new THREE.BoxGeometry(0.45, 4.5, 4.6);
  const portalHeadwallRockGeo = new THREE.BoxGeometry(6.8, 0.45, 4.8);
  const portalTimberPillarGeo = new THREE.BoxGeometry(0.58, 4.5, 0.58);
  portalTimberPillarGeo.translate(0, 2.25, 0);
  const portalTimberLintelGeo = new THREE.BoxGeometry(7.2, 0.62, 0.72);
  const portalSignBoardGeo = new THREE.BoxGeometry(3.6, 0.72, 0.18);

  const shaftSlopeFloorGeo = new THREE.BoxGeometry(6.8, 0.45, shaftSlopeLen + 1.2);
  const shaftSlopeCeilingGeo = new THREE.BoxGeometry(8.6, 1.8, shaftSlopeLen + 2.4);
  const shaftSlopeWallGeo = new THREE.BoxGeometry(1.4, 6.2, shaftSlopeLen + 1.8);
  const shaftStepPlankGeo = new THREE.BoxGeometry(2.6, 0.22, 0.68);
  const shaftSlopeRailGeo = new THREE.BoxGeometry(0.11, 0.12, shaftSlopeLen + 3.2);
  const mineSleeperGeo = new THREE.BoxGeometry(1.85, 0.09, 0.26);
  const mineTimberPostGeo = new THREE.BoxGeometry(0.42, 4.65, 0.42);
  mineTimberPostGeo.translate(0, 2.325, 0);
  const mineTimberBeamGeo = new THREE.BoxGeometry(6.7, 0.46, 0.46);

  const cavernHeight = SOUTHERN_MINE_POS.cavernHeight;
  const cavernNorthUpperWallGeo = new THREE.BoxGeometry(7.2, 5.6, 2.4);
  const cavernStonePillarGeo = new THREE.CylinderGeometry(1.15, 1.45, cavernHeight, 8);
  cavernStonePillarGeo.translate(0, cavernHeight * 0.5, 0);
  const cavernPillarCapGeo = new THREE.BoxGeometry(3.1, 0.68, 3.1);
  const cavernRoofArchBeamGeo = new THREE.BoxGeometry(28.5, 0.58, 0.68);
  const cavernStalactiteGeo = new THREE.ConeGeometry(0.82, 3.1, 6);
  cavernStalactiteGeo.rotateX(Math.PI);
  const cavernRailStraightGeo = new THREE.BoxGeometry(0.11, 0.11, 66.0);
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
  const scaffoldDeckGeo = new THREE.BoxGeometry(4.5, 0.24, 18.0);
  const crossBridgeDeckGeo = new THREE.BoxGeometry(27.0, 0.24, 4.5);
  const scaffoldLegGeo = new THREE.CylinderGeometry(0.18, 0.22, 4.2, 8);
  scaffoldLegGeo.translate(0, 2.1, 0);
  const goldIngotGeo = new THREE.BoxGeometry(0.46, 0.18, 0.24);
  const blastFurnaceBodyGeo = new THREE.CylinderGeometry(2.2, 2.8, 8.6, 10);
  blastFurnaceBodyGeo.translate(0, 4.3, 0);
  const moltenCrucibleGeo = new THREE.CylinderGeometry(1.6, 1.2, 1.4, 12);
  moltenCrucibleGeo.translate(0, 0.7, 0);
  const subWaterfallGeo = new THREE.PlaneGeometry(3.6, 9.2);
  const oreWheelRimGeo = new THREE.TorusGeometry(2.6, 0.22, 8, 20);

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
    cavernNorthUpperWallGeo,
    cavernStonePillarGeo,
    cavernPillarCapGeo,
    cavernRoofArchBeamGeo,
    cavernStalactiteGeo,
    cavernRailStraightGeo,
    mineCartBodyGeo,
    mineCartWheelGeo,
    crystalSpireGeo,
    mineCrystalClusterGeo,
    mineGoldOreGeo,
    forgeBrazierBaseGeo,
    forgeCoalMoundGeo,
    scaffoldDeckGeo,
    crossBridgeDeckGeo,
    scaffoldLegGeo,
    goldIngotGeo,
    blastFurnaceBodyGeo,
    moltenCrucibleGeo,
    subWaterfallGeo,
    oreWheelRimGeo
  );

  const vestibuleFloor = new THREE.Mesh(portalVestibuleFloorGeo, mineDarkRockMat);
  vestibuleFloor.position.set(0, mineEntY - 0.2, 1.8);
  const portalWestWall = new THREE.Mesh(portalSideWallGeo, mineDarkRockMat);
  portalWestWall.position.set(-3.22, mineEntY + 2.15, 2.3);
  const portalEastWall = new THREE.Mesh(portalSideWallGeo, mineDarkRockMat);
  portalEastWall.position.set(3.22, mineEntY + 2.15, 2.3);
  const portalHeadwall = new THREE.Mesh(portalHeadwallRockGeo, mineDarkRockMat);
  portalHeadwall.position.set(0, mineEntY + 4.38, 2.4);
  mineGroup.add(vestibuleFloor, portalWestWall, portalEastWall, portalHeadwall);

  for (const pz of [0.2, 2.0]) {
    for (const px of [-3.05, 3.05]) {
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
    createLanternAssembly(-2.55, mineEntY + 3.1, 0.0, true),
    createLanternAssembly(2.55, mineEntY + 3.1, 0.0, false)
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
  shaftWestWallMesh.position.set(-3.65, shaftMidY + 2.35, shaftMidLocalZ);
  shaftWestWallMesh.rotation.x = shaftAngle;

  const shaftEastWallMesh = new THREE.Mesh(shaftSlopeWallGeo, mineDarkRockMat);
  shaftEastWallMesh.position.set(3.65, shaftMidY + 2.35, shaftMidLocalZ);
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
      for (const sideX of [-1.85, 1.85]) {
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
    postL.position.set(-2.9, fy, fz);
    const postR = new THREE.Mesh(mineTimberPostGeo, barkMat);
    postR.position.set(2.9, fy, fz);
    const beamTop = new THREE.Mesh(mineTimberBeamGeo, timberMat);
    beamTop.position.set(0, fy + 4.55, fz);
    mineGroup.add(postL, postR, beamTop);

    if (f % 2 === 0) {
      mineGroup.add(
        createLanternAssembly(f % 4 === 0 ? -2.35 : 2.35, fy + 3.25, fz, f === 4)
      );
    }
  }

  const cavernStartLocalZ = 34.0;
  const cavernEndLocalZ = 110.0;
  const cavernMidLocalZ = (cavernStartLocalZ + cavernEndLocalZ) * 0.5;

  const mainEastFloorGeo = new THREE.BoxGeometry(79.0, 0.8, 78.0);
  const westRoomSouthFloorGeo = new THREE.BoxGeometry(28.0, 0.8, 13.0);
  const westRoomNorthFloorGeo = new THREE.BoxGeometry(28.0, 0.8, 6.0);
  const westRoomEastWalkwayGeo = new THREE.BoxGeometry(7.5, 0.8, 44.0);
  const westLakeBasinFloorGeo = new THREE.BoxGeometry(20.0, 0.8, 46.0);
  const cCeilingGeo = new THREE.BoxGeometry(104.0, 1.2, 79.0);
  const cSideWallGeo = new THREE.BoxGeometry(2.4, cavernHeight + 0.2, 64.0);
  const rRoomWallGeo = new THREE.BoxGeometry(28.0, cavernHeight + 0.2, 2.2);
  const cBackWallGeo = new THREE.BoxGeometry(36.0, cavernHeight + 0.2, 2.6);
  const cNorthFlankWallGeo = new THREE.BoxGeometry(11.6, cavernHeight + 0.2, 2.4);

  disposableGeometries.push(
    mainEastFloorGeo,
    westRoomSouthFloorGeo,
    westRoomNorthFloorGeo,
    westRoomEastWalkwayGeo,
    westLakeBasinFloorGeo,
    cCeilingGeo,
    cSideWallGeo,
    rRoomWallGeo,
    cBackWallGeo,
    cNorthFlankWallGeo
  );

  const mainEastFloorMesh = new THREE.Mesh(mainEastFloorGeo, mineDeepSlateMat);
  mainEastFloorMesh.position.set(13.5, cavernFloorY - 0.4, 72.0);
  const westRoomSouthFloorMesh = new THREE.Mesh(westRoomSouthFloorGeo, mineDeepSlateMat);
  westRoomSouthFloorMesh.position.set(-39.0, cavernFloorY - 0.4, 90.5);
  const westRoomNorthFloorMesh = new THREE.Mesh(westRoomNorthFloorGeo, mineDeepSlateMat);
  westRoomNorthFloorMesh.position.set(-39.0, cavernFloorY - 0.4, 38.0);
  const westRoomEastWalkwayMesh = new THREE.Mesh(westRoomEastWalkwayGeo, mineDeepSlateMat);
  westRoomEastWalkwayMesh.position.set(-29.5, cavernFloorY - 0.4, 62.5);
  const westLakeBasinFloorMesh = new THREE.Mesh(westLakeBasinFloorGeo, mineDeepSlateMat);
  westLakeBasinFloorMesh.position.set(-42.0, cavernFloorY - 2.25, 62.5);

  const cCeiling = new THREE.Mesh(cCeilingGeo, mineDeepSlateMat);
  cCeiling.position.set(1.0, cavernFloorY + cavernHeight - 0.25, cavernMidLocalZ);

  const cWestWall = new THREE.Mesh(cSideWallGeo, mineDeepSlateMat);
  cWestWall.position.set(-51.5, cavernFloorY + cavernHeight * 0.5 - 0.5, 66.0);
  const cEastWall = new THREE.Mesh(cSideWallGeo, mineDeepSlateMat);
  cEastWall.position.set(52.5, cavernFloorY + cavernHeight * 0.5 - 0.5, 66.0);
  const r2NorthWall = new THREE.Mesh(rRoomWallGeo, mineDeepSlateMat);
  r2NorthWall.position.set(-38.0, cavernFloorY + cavernHeight * 0.5 - 0.5, 35.0);
  const r2SouthWall = new THREE.Mesh(rRoomWallGeo, mineDeepSlateMat);
  r2SouthWall.position.set(-38.0, cavernFloorY + cavernHeight * 0.5 - 0.5, 97.0);
  const r3NorthWall = new THREE.Mesh(rRoomWallGeo, mineDeepSlateMat);
  r3NorthWall.position.set(39.0, cavernFloorY + cavernHeight * 0.5 - 0.5, 35.0);
  const r3SouthWall = new THREE.Mesh(rRoomWallGeo, mineDeepSlateMat);
  r3SouthWall.position.set(39.0, cavernFloorY + cavernHeight * 0.5 - 0.5, 97.0);
  const cBackWall = new THREE.Mesh(cBackWallGeo, mineDeepSlateMat);
  cBackWall.position.set(0, cavernFloorY + cavernHeight * 0.5 - 0.5, cavernEndLocalZ + 1.0);
  const cNorthWestWall = new THREE.Mesh(cNorthFlankWallGeo, mineDeepSlateMat);
  cNorthWestWall.position.set(-9.0, cavernFloorY + cavernHeight * 0.5 - 0.5, cavernStartLocalZ);
  const cNorthEastWall = new THREE.Mesh(cNorthFlankWallGeo, mineDeepSlateMat);
  cNorthEastWall.position.set(9.0, cavernFloorY + cavernHeight * 0.5 - 0.5, cavernStartLocalZ);
  const cNorthUpperWall = new THREE.Mesh(cavernNorthUpperWallGeo, mineDeepSlateMat);
  cNorthUpperWall.position.set(0, cavernFloorY + cavernHeight - 2.4, cavernStartLocalZ);

  mineGroup.add(
    mainEastFloorMesh,
    westRoomSouthFloorMesh,
    westRoomNorthFloorMesh,
    westRoomEastWalkwayMesh,
    westLakeBasinFloorMesh,
    cCeiling,
    cWestWall,
    cEastWall,
    r2NorthWall,
    r2SouthWall,
    r3NorthWall,
    r3SouthWall,
    cBackWall,
    cNorthWestWall,
    cNorthEastWall,
    cNorthUpperWall
  );

  const partitionBlocks: Array<[number, number, number, number]> = [
    [-20.0, 39.5, 12.0, 11.0],
    [-20.0, 69.0, 12.0, 32.0],
    [-21.0, 101.8, 10.0, 17.5],
    [20.0, 39.5, 12.0, 11.0],
    [20.0, 69.0, 12.0, 32.0],
    [21.0, 101.8, 10.0, 17.5],
    [-10.25, 71.0, 11.5, 14.0],
    [10.25, 71.0, 11.5, 14.0],
  ];
  for (const [px, pz, pw, pd] of partitionBlocks) {
    const pGeo = new THREE.BoxGeometry(pw, cavernHeight + 0.6, pd);
    disposableGeometries.push(pGeo);
    const pMesh = new THREE.Mesh(pGeo, mineDarkRockMat);
    pMesh.position.set(px, cavernFloorY + cavernHeight * 0.5, pz);
    mineGroup.add(pMesh);
  }

  const corrHeaderH = cavernHeight - SOUTHERN_MINE_POS.corridorHeight;
  const corridorHeaders: Array<[number, number, number, number]> = [
    [-20.0, 49.0, 12.4, 8.2],
    [20.0, 49.0, 12.4, 8.2],
    [0.0, 71.0, 9.2, 14.4],
    [-21.0, 89.0, 10.4, 8.2],
    [21.0, 89.0, 10.4, 8.2],
  ];
  for (const [cx, cz, cw, cd] of corridorHeaders) {
    const hGeo = new THREE.BoxGeometry(cw, corrHeaderH, cd);
    disposableGeometries.push(hGeo);
    const hMesh = new THREE.Mesh(hGeo, mineDeepSlateMat);
    hMesh.position.set(cx, cavernFloorY + SOUTHERN_MINE_POS.corridorHeight + corrHeaderH * 0.5, cz);
    mineGroup.add(hMesh);
  }

  const corrPostGeo = new THREE.BoxGeometry(0.55, 5.4, 0.55);
  corrPostGeo.translate(0, 2.7, 0);
  const corrBeamEWGeo = new THREE.BoxGeometry(0.58, 0.58, 8.0);
  const corrBeamNSGeo = new THREE.BoxGeometry(9.0, 0.58, 0.58);
  disposableGeometries.push(corrPostGeo, corrBeamEWGeo, corrBeamNSGeo);

  for (const [cz, xList] of [
    [49.0, [-25.2, -20.0, -14.8, 14.8, 20.0, 25.2]],
    [89.0, [-25.2, -21.0, -16.8, 16.8, 21.0, 25.2]],
  ] as const) {
    for (const fx of xList) {
      const pN = new THREE.Mesh(corrPostGeo, barkMat);
      pN.position.set(fx, cavernFloorY, cz - 3.7);
      const pS = new THREE.Mesh(corrPostGeo, barkMat);
      pS.position.set(fx, cavernFloorY, cz + 3.7);
      const bTop = new THREE.Mesh(corrBeamEWGeo, timberMat);
      bTop.position.set(fx, cavernFloorY + 5.2, cz);
      mineGroup.add(
        pN,
        pS,
        bTop,
        createLanternAssembly(fx, cavernFloorY + 3.8, cz - 3.2, Math.abs(fx) === 20.0)
      );
    }
  }

  for (const fz of [64.6, 68.8, 73.2, 77.4]) {
    const pW = new THREE.Mesh(corrPostGeo, barkMat);
    pW.position.set(-4.15, cavernFloorY, fz);
    const pE = new THREE.Mesh(corrPostGeo, barkMat);
    pE.position.set(4.15, cavernFloorY, fz);
    const bTop = new THREE.Mesh(corrBeamNSGeo, timberMat);
    bTop.position.set(0, cavernFloorY + 5.2, fz);
    mineGroup.add(
      pW,
      pE,
      bTop,
      createLanternAssembly(fz % 2 > 1 ? -3.6 : 3.6, cavernFloorY + 3.8, fz, fz === 68.8)
    );
  }

  for (const pzLocal of [39.0, 58.0, 84.0, 98.0]) {
    const archBeam = new THREE.Mesh(cavernRoofArchBeamGeo, timberMat);
    archBeam.position.set(0, cavernFloorY + cavernHeight - 0.35, pzLocal);
    mineGroup.add(archBeam);
    for (const px of [-12.6, 12.6]) {
      const pillar = new THREE.Mesh(cavernStonePillarGeo, mineDarkRockMat);
      pillar.position.set(px, cavernFloorY, pzLocal);
      const baseCap = new THREE.Mesh(cavernPillarCapGeo, timberMat);
      baseCap.position.set(px, cavernFloorY + 0.34, pzLocal);
      const topCap = new THREE.Mesh(cavernPillarCapGeo, timberMat);
      topCap.position.set(px, cavernFloorY + cavernHeight - 0.35, pzLocal);
      mineGroup.add(
        pillar,
        baseCap,
        topCap,
        createLanternAssembly(px + (px < 0 ? 1.35 : -1.35), cavernFloorY + 3.4, pzLocal, false)
      );
    }
  }

  for (let st = 0; st < 42; st++) {
    const stX = ((st * 19) % 94) - 47.0;
    const stZ = cavernStartLocalZ + 4.0 + ((st * 17) % 70);
    if (Math.abs(stX) < 5.0 && stZ < cavernStartLocalZ + 9.0) continue;
    if (Math.abs(stX) >= 13.0 && Math.abs(stX) <= 27.0) continue;
    const isCrystalStal = st % 4 === 0;
    const stalactite = new THREE.Mesh(
      cavernStalactiteGeo,
      isCrystalStal
        ? st % 8 === 0
          ? mineSapphireCrystalMat
          : mineAmethystCrystalMat
        : mineDarkRockMat
    );
    const sc = 0.85 + (st % 4) * 0.35;
    stalactite.position.set(stX, cavernFloorY + cavernHeight - 0.95 * sc, stZ);
    stalactite.scale.set(sc, sc * 1.2, sc);
    mineGroup.add(stalactite);
  }

  // Room 2 Subterranean Lake
  const subLakeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
    roughness: 0.06,
    metalness: 0.15,
    clearcoat: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: 0.86,
  });
  attachAnimatedWaterWaveShader(subLakeMat, 0.042, 0.085, ctx.animatedWaterMaterials);
  const subWaterfallMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    transparent: true,
    opacity: 0.84,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(subLakeMat, subWaterfallMat);

  const subLakeAnimGeo = new THREE.PlaneGeometry(18.5, 44.0, 24, 36);
  subLakeAnimGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(subLakeAnimGeo);
  const subLakeMesh = new THREE.Mesh(subLakeAnimGeo, subLakeMat);
  subLakeMesh.position.set(-41.5, cavernFloorY + 0.05, 62.5);
  mineGroup.add(subLakeMesh);

  for (let r = 0; r < 26; r++) {
    const ang = (r / 26) * Math.PI * 2;
    const rx = -41.5 + Math.cos(ang) * 8.6;
    const rz = 62.5 + Math.sin(ang) * 21.8;
    const rimRock = new THREE.Mesh(mineGoldOreGeo, mineDarkRockMat);
    rimRock.scale.set(3.2, 1.2, 3.2);
    rimRock.position.set(rx, cavernFloorY + 0.15, rz);
    mineGroup.add(rimRock);
  }

  const subWaterfallMesh = new THREE.Mesh(subWaterfallGeo, subWaterfallMat);
  subWaterfallMesh.position.set(-51.2, cavernFloorY + 4.6, 62.5);
  subWaterfallMesh.rotation.y = Math.PI / 2;
  subWaterfallMesh.rotation.z = -0.12;
  const subPlungeFoam = new THREE.Mesh(forgeCoalMoundGeo, subWaterfallMat);
  subPlungeFoam.scale.set(2.4, 0.35, 3.2);
  subPlungeFoam.position.set(-49.6, cavernFloorY + 0.14, 62.5);
  const subLakeLight = new THREE.PointLight(0x38bdf8, 3.2, 38, 1.35);
  subLakeLight.position.set(-40.5, cavernFloorY + 4.2, 62.5);
  lanternLights.push(subLakeLight);
  mineGroup.add(subWaterfallMesh, subPlungeFoam, subLakeLight);

  const subPierDeckGeo = new THREE.BoxGeometry(6.8, 0.22, 3.6);
  const wheelAxleGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.8, 10);
  const paddleGeo = new THREE.BoxGeometry(0.32, 0.85, 1.1);
  const fBand1Geo = new THREE.CylinderGeometry(2.65, 2.7, 0.45, 10);
  const fBand2Geo = new THREE.CylinderGeometry(2.4, 2.45, 0.45, 10);
  const moltenGoldPoolGeo = new THREE.CylinderGeometry(1.38, 1.38, 0.25, 12);
  const moltenStreamGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.8, 8);
  const chestGeo = new THREE.BoxGeometry(1.6, 1.05, 1.1);

  disposableGeometries.push(
    subPierDeckGeo,
    wheelAxleGeo,
    paddleGeo,
    fBand1Geo,
    fBand2Geo,
    moltenGoldPoolGeo,
    moltenStreamGeo,
    chestGeo
  );

  const subPierDeck = new THREE.Mesh(subPierDeckGeo, timberMat);
  subPierDeck.position.set(-32.2, cavernFloorY + 0.32, 49.0);
  mineGroup.add(
    subPierDeck,
    createLanternAssembly(-35.0, cavernFloorY + 1.6, 47.4, false),
    createLanternAssembly(-35.0, cavernFloorY + 1.6, 50.6, false)
  );

  const catwalkLocalY = 4.2;
  for (let s = 0; s <= 18; s++) {
    const t = s / 18;
    const stepMesh = new THREE.Mesh(shaftStepPlankGeo, timberMat);
    stepMesh.scale.x = 1.22;
    stepMesh.position.set(-10.9, cavernFloorY + t * catwalkLocalY - 0.08, 35.5 + t * 9.0);
    mineGroup.add(stepMesh);
  }
  const westCatwalkDeck = new THREE.Mesh(scaffoldDeckGeo, timberMat);
  westCatwalkDeck.position.set(-11.25, cavernFloorY + catwalkLocalY - 0.12, 53.5);
  const eastCatwalkDeck = new THREE.Mesh(scaffoldDeckGeo, timberMat);
  eastCatwalkDeck.position.set(11.25, cavernFloorY + catwalkLocalY - 0.12, 53.5);
  const southCrossBridge = new THREE.Mesh(crossBridgeDeckGeo, timberMat);
  southCrossBridge.position.set(0, cavernFloorY + catwalkLocalY - 0.12, 60.5);
  mineGroup.add(westCatwalkDeck, eastCatwalkDeck, southCrossBridge);

  const catwalkRailLongGeo = new THREE.BoxGeometry(0.14, 0.95, 18.0);
  const catwalkRailCrossGeo = new THREE.BoxGeometry(22.0, 0.95, 0.14);
  disposableGeometries.push(catwalkRailLongGeo, catwalkRailCrossGeo);
  for (const side of [-1, 1]) {
    const outerRail = new THREE.Mesh(catwalkRailLongGeo, barkMat);
    outerRail.position.set(side * 13.35, cavernFloorY + catwalkLocalY + 0.45, 53.5);
    mineGroup.add(outerRail);
    for (const lz of [45.5, 53.5, 61.5]) {
      for (const lxOff of [-1.8, 1.8]) {
        const leg = new THREE.Mesh(scaffoldLegGeo, barkMat);
        leg.position.set(side * 11.25 + lxOff, cavernFloorY, lz);
        mineGroup.add(leg);
      }
      if (lz === 53.5) {
        mineGroup.add(createLanternAssembly(side * 9.3, cavernFloorY + catwalkLocalY + 1.2, lz, false));
      }
    }
  }
  const bridgeNorthRail = new THREE.Mesh(catwalkRailCrossGeo, barkMat);
  bridgeNorthRail.position.set(0, cavernFloorY + catwalkLocalY + 0.45, 58.35);
  const bridgeSouthRail = new THREE.Mesh(catwalkRailCrossGeo, barkMat);
  bridgeSouthRail.position.set(0, cavernFloorY + catwalkLocalY + 0.45, 62.65);
  mineGroup.add(bridgeNorthRail, bridgeSouthRail);

  const waterwheelStandGroup = new THREE.Group();
  waterwheelStandGroup.position.set(-48.2, cavernFloorY, 62.5);
  for (const sideX of [-0.75, 0.75]) {
    const standPost = new THREE.Mesh(scaffoldLegGeo, barkMat);
    standPost.position.set(sideX, -1.2, 0);
    waterwheelStandGroup.add(standPost);
  }
  const wheelAxleMesh = new THREE.Mesh(wheelAxleGeo, darkIronMat);
  wheelAxleMesh.rotation.z = Math.PI / 2;
  wheelAxleMesh.position.set(0, 3.0, 0);
  waterwheelStandGroup.add(wheelAxleMesh);
  mineGroup.add(waterwheelStandGroup);

  const mineOreWheelGroup = new THREE.Group();
  mineOreWheelGroup.position.set(-48.2, cavernFloorY + 3.0, 62.5);
  mineOreWheelGroup.rotation.y = Math.PI / 2;
  const wheelRim1 = new THREE.Mesh(oreWheelRimGeo, barkMat);
  wheelRim1.position.z = -0.45;
  const wheelRim2 = new THREE.Mesh(oreWheelRimGeo, barkMat);
  wheelRim2.position.z = 0.45;
  mineOreWheelGroup.add(wheelRim1, wheelRim2);
  for (let sp = 0; sp < 8; sp++) {
    const ang = (sp / 8) * Math.PI * 2;
    const paddle = new THREE.Mesh(paddleGeo, timberMat);
    paddle.position.set(Math.cos(ang) * 2.6, Math.sin(ang) * 2.6, 0);
    paddle.rotation.z = ang;
    mineOreWheelGroup.add(paddle);
  }
  mineGroup.add(mineOreWheelGroup);

  for (const fz of [52.0, 78.0]) {
    const furnaceGroup = new THREE.Group();
    furnaceGroup.position.set(44.5, cavernFloorY, fz);
    const fBody = new THREE.Mesh(blastFurnaceBodyGeo, mineDarkRockMat);
    const fBand1 = new THREE.Mesh(fBand1Geo, darkIronMat);
    fBand1.position.y = 2.4;
    const fBand2 = new THREE.Mesh(fBand2Geo, darkIronMat);
    fBand2.position.y = 5.8;
    const fCoreGlow = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
    fCoreGlow.scale.set(1.5, 1.2, 1.5);
    fCoreGlow.position.set(-1.6, 1.1, 0);
    const crucible = new THREE.Mesh(moltenCrucibleGeo, darkIronMat);
    crucible.position.set(-3.8, 0, 0);
    const moltenGoldPool = new THREE.Mesh(moltenGoldPoolGeo, mineGoldOreMat);
    moltenGoldPool.position.set(-3.8, 1.32, 0);
    const moltenStream = new THREE.Mesh(moltenStreamGeo, mineMoltenCoalMat);
    moltenStream.position.set(-2.9, 1.45, 0);
    moltenStream.rotation.z = 0.65;
    furnaceGroup.add(fBody, fBand1, fBand2, fCoreGlow, crucible, moltenGoldPool, moltenStream);

    for (let g = 0; g < 18; g++) {
      const ingot = new THREE.Mesh(goldIngotGeo, mineGoldOreMat);
      ingot.position.set(
        -4.2 + (g % 3) * 0.55,
        0.09 + Math.floor(g / 6) * 0.19,
        2.6 + (Math.floor(g / 3) % 2) * 0.36
      );
      furnaceGroup.add(ingot);
    }
    mineGroup.add(furnaceGroup);
  }
  const foundryLight = new THREE.PointLight(0xff7b00, 3.6, 42, 1.35);
  foundryLight.position.set(36.0, cavernFloorY + 4.5, 65.0);
  lanternLights.push(foundryLight);
  mineGroup.add(foundryLight);

  // Twin Room 1 Forge Braziers flanking the Central N-S Rail Track at (-5.2, 50.0) & (+5.2, 50.0) so the rail track at x=0 is 100% clear!
  for (const fx of [-5.2, 5.2]) {
    const forgeGroup = new THREE.Group();
    forgeGroup.position.set(fx, cavernFloorY, 50.0);
    const brazierBase = new THREE.Mesh(forgeBrazierBaseGeo, darkIronMat);
    const coalMound = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
    coalMound.position.y = 0.92;
    forgeGroup.add(brazierBase, coalMound);
    for (let g = 0; g < 6; g++) {
      const ingot = new THREE.Mesh(goldIngotGeo, mineGoldOreMat);
      ingot.position.set(-0.8 + (g % 3) * 0.52, 0.09 + Math.floor(g / 3) * 0.18, -0.85);
      forgeGroup.add(ingot);
    }
    if (fx < 0) {
      const cavernPointLight = new THREE.PointLight(0xff9933, 3.4, 42, 1.35);
      cavernPointLight.position.set(5.2, 4.2, 0);
      forgeGroup.add(cavernPointLight);
      lanternLights.push(cavernPointLight);
    }
    mineGroup.add(forgeGroup);
  }

  const vaultLight = new THREE.PointLight(0xfbbf24, 3.4, 38, 1.35);
  vaultLight.position.set(0, cavernFloorY + 4.8, 98.0);
  lanternLights.push(vaultLight);
  mineGroup.add(vaultLight);
  for (const vx of [-10.5, -5.5, 5.5, 10.5]) {
    const chest = new THREE.Mesh(chestGeo, barkMat);
    chest.position.set(vx, cavernFloorY + 0.52, 103.5);
    const chestGold = new THREE.Mesh(forgeCoalMoundGeo, mineGoldOreMat);
    chestGold.position.set(vx, cavernFloorY + 1.05, 103.5);
    mineGroup.add(chest, chestGold);
  }

  // 1) Central North-South Iron Rail Track (x = 0, z = 34.5 .. 100.5)
  for (const rx of [-0.55, 0.55]) {
    const cRail = new THREE.Mesh(cavernRailStraightGeo, darkIronMat);
    cRail.position.set(rx, cavernFloorY + 0.06, 67.0);
    mineGroup.add(cRail);
  }
  for (let sz = 34.5; sz <= 99.5; sz += 1.3) {
    const sleeper = new THREE.Mesh(mineSleeperGeo, barkMat);
    sleeper.position.set(0, cavernFloorY + 0.03, sz);
    mineGroup.add(sleeper);
  }

  // 2) Cross-Cavern East-West Iron Rail Track (z = 49.0, x = -29.5 .. +31.5)
  const ewTrackGeo = new THREE.BoxGeometry(62.0, 0.11, 0.11);
  disposableGeometries.push(ewTrackGeo);
  for (const rz of [48.45, 49.55]) {
    const ewRail = new THREE.Mesh(ewTrackGeo, darkIronMat);
    ewRail.position.set(1.0, cavernFloorY + 0.06, rz);
    mineGroup.add(ewRail);
  }
  for (let sx = -29.0; sx <= 30.5; sx += 1.4) {
    if (Math.abs(sx) < 1.1) continue;
    const ewSleeper = new THREE.Mesh(mineSleeperGeo, barkMat);
    ewSleeper.rotation.y = Math.PI / 2;
    ewSleeper.position.set(sx, cavernFloorY + 0.03, 49.0);
    mineGroup.add(ewSleeper);
  }

  // 3) Room 3 Foundry North-South Iron Rail Track (x = 32.5, z = 41.5 .. 86.5)
  const foundryRailGeo = new THREE.BoxGeometry(0.11, 0.11, 46.0);
  disposableGeometries.push(foundryRailGeo);
  for (const rx of [32.5 - 0.55, 32.5 + 0.55]) {
    const fRail = new THREE.Mesh(foundryRailGeo, darkIronMat);
    fRail.position.set(rx, cavernFloorY + 0.06, 64.0);
    mineGroup.add(fRail);
  }
  for (let sz = 41.8; sz <= 86.2; sz += 1.35) {
    const fSleeper = new THREE.Mesh(mineSleeperGeo, barkMat);
    fSleeper.position.set(32.5, cavernFloorY + 0.03, sz);
    mineGroup.add(fSleeper);
  }

  const oreKindToMat = (kind: 'gold' | 'emerald' | 'sapphire' | 'amethyst'): THREE.Material => {
    switch (kind) {
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

  // 4) 8 Sculptural Dwarven Mining Rock & Glowing Crystal/Gold Wall Veins directly in front of each Dwarf's pickaxe!
  const rockBoulderGeo = new THREE.DodecahedronGeometry(1.15, 1);
  perturbGeometryVertices(rockBoulderGeo, 0.18, 1.4);
  const sparkChunkGeo = new THREE.OctahedronGeometry(0.085, 0);
  disposableGeometries.push(rockBoulderGeo, sparkChunkGeo);

  const stationSparkClusters: THREE.Group[] = [];
  for (let stIdx = 0; stIdx < DWARVEN_MINER_STATIONS.length; stIdx++) {
    const stCfg = DWARVEN_MINER_STATIONS[stIdx];
    const oreMat = oreKindToMat(stCfg.oreKind);
    const veinGroup = new THREE.Group();
    veinGroup.position.set(stCfg.rockLocalX, cavernFloorY, stCfg.rockLocalZ);

    // Rugged multi-tiered dark-slate rock mass anchored against the cavern wall
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

    // Rich glowing gold & crystal seams embedded across the rock face where the pickaxe strikes
    for (let v = 0; v < 7; v++) {
      const ang = (v / 7) * Math.PI * 2 + stIdx * 0.5;
      const seamMesh = new THREE.Mesh(
        v % 2 === 0 ? mineGoldOreGeo : crystalSpireGeo,
        v % 3 === 0 ? mineGoldOreMat : oreMat
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

    // Scattered freshly hewn ore chunks at the base of the rock face
    for (let c = 0; c < 5; c++) {
      const chipAng = (c / 5) * Math.PI * 2 + 0.3;
      const chip = new THREE.Mesh(
        c % 2 === 0 ? mineGoldOreGeo : mineCrystalClusterGeo,
        c % 2 === 0 ? mineGoldOreMat : oreMat
      );
      chip.position.set(Math.cos(chipAng) * 1.02, 0.14, Math.sin(chipAng) * 1.02);
      chip.scale.setScalar(0.68);
      veinGroup.add(chip);
    }

    // Animated pickaxe-impact spark burst right at the Dwarf's strike contact point
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
      const spMesh = new THREE.Mesh(sparkChunkGeo, sp % 2 === 0 ? mineGoldOreMat : oreMat);
      const spAng = (sp / 5) * Math.PI * 2;
      spMesh.position.set(Math.cos(spAng) * 0.18, (sp % 2) * 0.12, Math.sin(spAng) * 0.18);
      sparkGroup.add(spMesh);
    }
    veinGroup.add(sparkGroup);
    stationSparkClusters.push(sparkGroup);

    mineGroup.add(veinGroup);
  }

  // 5) 6 Animated Moving Minecarts rolling along the 3 rail lines + pausing for Dwarf loading
  interface IAnimatedMinecartRig {
    readonly group: THREE.Group;
    readonly wheels: THREE.Mesh[];
    readonly oreGroup: THREE.Group;
  }
  const animatedMinecarts: IAnimatedMinecartRig[] = [];

  for (let c = 0; c < DWARVEN_MINECART_ROUTES.length; c++) {
    const route = DWARVEN_MINECART_ROUTES[c];
    const oreMat = oreKindToMat(route.oreKind);
    const cartGroup = new THREE.Group();
    cartGroup.position.set(route.startLocalX, cavernFloorY, route.startLocalZ);
    cartGroup.rotation.y = route.yaw;

    const body = new THREE.Mesh(mineCartBodyGeo, darkIronMat);
    body.position.set(0, 0.64, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    cartGroup.add(body);

    const wheels: THREE.Mesh[] = [];
    for (const wx of [-0.7, 0.7]) {
      for (const wz of [-0.65, 0.65]) {
        const wheel = new THREE.Mesh(mineCartWheelGeo, darkIronMat);
        wheel.position.set(wx, 0.25, wz);
        cartGroup.add(wheel);
        wheels.push(wheel);
      }
    }

    const oreGroup = new THREE.Group();
    oreGroup.position.set(0, 0.95, 0);
    for (let o = 0; o < 8; o++) {
      const ore = new THREE.Mesh(
        o % 2 === 0 ? mineGoldOreGeo : mineCrystalClusterGeo,
        o % 3 === 0 ? mineGoldOreMat : oreMat
      );
      ore.position.set(
        ((o % 3) - 1) * 0.36,
        0.16 + (o % 2) * 0.14,
        (Math.floor(o / 3) - 0.8) * 0.56
      );
      ore.scale.setScalar(0.84);
      oreGroup.add(ore);
    }
    cartGroup.add(oreGroup);
    mineGroup.add(cartGroup);
    animatedMinecarts.push({ group: cartGroup, wheels, oreGroup });
  }

  const crystalMats = [
    mineEmeraldCrystalMat,
    mineAmethystCrystalMat,
    mineSapphireCrystalMat,
    mineGoldOreMat,
  ];
  const crystalSpots: Array<[number, number, number]> = [
    [-49.5, 39.0, 1.85],
    [-49.5, 52.0, 2.05],
    [-49.5, 76.0, 2.15],
    [-49.5, 92.0, 1.95],
    [-28.5, 39.0, 1.65],
    [-28.5, 93.0, 1.75],
    [49.5, 39.0, 1.75],
    [49.5, 65.0, 1.95],
    [49.5, 92.0, 1.85],
    [-12.5, 82.0, 1.95],
    [12.5, 82.0, 1.95],
    [-13.5, 106.5, 2.25],
    [-7.0, 107.6, 2.55],
    [0.0, 107.8, 3.10],
    [7.0, 107.6, 2.55],
    [13.5, 106.5, 2.25],
  ];
  for (let i = 0; i < crystalSpots.length; i++) {
    const [cx, cz, scaleBase] = crystalSpots[i];
    const cMat = crystalMats[i % crystalMats.length];
    const cluster = new THREE.Group();
    cluster.position.set(cx, cavernFloorY, cz);
    for (let s = 0; s < 5; s++) {
      const spire = new THREE.Mesh(crystalSpireGeo, s === 4 ? mineGoldOreMat : cMat);
      const ang = (s / 5) * Math.PI * 2 + i * 0.7;
      const tilt = s === 0 ? 0.06 : 0.28 + (s % 2) * 0.14;
      spire.position.set(Math.cos(ang) * 0.55, 0, Math.sin(ang) * 0.55);
      spire.rotation.set(Math.sin(ang) * tilt, ang, Math.cos(ang) * tilt);
      const hScale = scaleBase * (s === 0 ? 1.38 : 0.78 + (s % 3) * 0.18);
      spire.scale.set(scaleBase * 0.75, hScale, scaleBase * 0.75);
      cluster.add(spire);
    }
    mineGroup.add(cluster);
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
      mineOreWheelGroup.rotation.z = elapsedTime * 0.85;

      // Animate the 6 Moving Minecarts along the iron rails & dynamic ore pile loading!
      for (let c = 0; c < animatedMinecarts.length; c++) {
        const cartRig = animatedMinecarts[c];
        const st = evaluateMinecartTrackState(c, elapsedTime);
        cartRig.group.position.set(st.localX, cavernFloorY, st.localZ);
        cartRig.group.rotation.y = st.yaw;
        cartRig.oreGroup.scale.set(1.0, st.oreFillScale, 1.0);
        for (let w = 0; w < cartRig.wheels.length; w++) {
          cartRig.wheels[w].rotation.x = st.wheelAngle;
        }
      }

      // Pulse pickaxe-strike ore sparks at each of the 8 mining rock veins during daytime mining hours
      const hNorm = ((worldHours % 24) + 24) % 24;
      const isMiningHours = hNorm > 7.6 && hNorm < 17.8;
      for (let stIdx = 0; stIdx < stationSparkClusters.length; stIdx++) {
        const sparkGrp = stationSparkClusters[stIdx];
        const stCfg = DWARVEN_MINER_STATIONS[stIdx];
        const isCartLoadingNow =
          stCfg.pairedCartIdx !== undefined &&
          evaluateMinecartTrackState(stCfg.pairedCartIdx, elapsedTime).isLoadingAtStart;
        if (isMiningHours && !isCartLoadingNow) {
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
