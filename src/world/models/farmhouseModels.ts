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
  isInsideSouthernMine,
  hash2D,
} from '../terrainMath';
import {
  attachWindSwayShader,
  perturbGeometryVertices,
} from '../builders/shaderAndMaterialBuilders';
import { attachAnimatedWaterWaveShader } from './terrainAndWaterModel';
import { buildDwarvenKingdomAndMiners } from '../builders/dwarvenKingdomBuilder';
import { buildAncientMine } from '../builders/ancientMine/ancientMineBuilder';
import { createReadyDwarfWarrior } from './Characters/DwarfWarrior_Complete';
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
    color: 0x8a8279,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.12,
    roughness: 0.88,
  });
  const mineDeepSlateMat = new THREE.MeshStandardMaterial({
    color: 0x6e6862,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.14,
    roughness: 0.92,
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

  function createLanternAssembly(
    x: number,
    y: number,
    z: number,
    addLight = false,
    forceUnderground = false
  ): THREE.Group {
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
      const isUnderground = forceUnderground || y < -1.0;
      const baseIntensity = isUnderground ? 6.2 : 3.2;
      const pl = new THREE.PointLight(0xffaa38, baseIntensity, isUnderground ? 46 : 18, 1.12);
      pl.visible = false;
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

  function createStandingTableLantern(x: number, y: number, z: number): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const baseGeo = new THREE.CylinderGeometry(0.14, 0.17, 0.06, 8);
    baseGeo.translate(0, 0.03, 0);
    const cageGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.26, 6);
    cageGeo.translate(0, 0.19, 0);
    const capGeo = new THREE.ConeGeometry(0.16, 0.11, 6);
    capGeo.translate(0, 0.37, 0);
    disposableGeometries.push(baseGeo, cageGeo, capGeo);
    g.add(
      new THREE.Mesh(baseGeo, darkIronMat),
      new THREE.Mesh(cageGeo, warmLanternMat),
      new THREE.Mesh(capGeo, darkIronMat)
    );
    return g;
  }

  function createStandingLanternPost(
    x: number,
    floorY: number,
    z: number,
    addLight = false,
    yaw = 0
  ): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, floorY, z);
    g.rotation.y = yaw;
    const plinthGeo = new THREE.BoxGeometry(0.52, 0.34, 0.52);
    plinthGeo.translate(0, 0.17, 0);
    const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 2.75, 8);
    postGeo.translate(0, 1.38, 0);
    const armGeo = new THREE.BoxGeometry(0.09, 0.09, 0.68);
    armGeo.translate(0, 2.68, 0.26);
    const braceGeo = new THREE.BoxGeometry(0.06, 0.46, 0.06);
    disposableGeometries.push(plinthGeo, postGeo, armGeo, braceGeo);
    const brace = new THREE.Mesh(braceGeo, darkIronMat);
    brace.position.set(0, 2.48, 0.18);
    brace.rotation.x = -0.65;
    g.add(
      new THREE.Mesh(plinthGeo, mineDarkRockMat),
      new THREE.Mesh(postGeo, barkMat),
      new THREE.Mesh(armGeo, darkIronMat),
      brace,
      createLanternAssembly(0, 2.64, 0.52, addLight, floorY < -1.0)
    );
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
  distanceCulledObjects.push({
    obj: wheatInstanced,
    cx: -45,
    cz: 165,
    radius: 95,
  });

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

  // --- 4) THE ANCIENT DWARVEN MINE (layout: domain/landmarks/ancientMine, meshes: builders/ancientMine) ---
  const { group: mineGroup, update: updateAncientMine } = buildAncientMine({
    disposableGeometries,
    disposableMaterials,
    disposableTextures: ctx.disposableTextures,
    lanternLights,
    rockTexture: textures.rockAlbedo,
    timberTexture: textures.timberAlbedo,
  });
  const mineX = SOUTHERN_MINE_POS.x;
  const mineEntY = SOUTHERN_MINE_POS.entranceY;
  const mineEntZ = SOUTHERN_MINE_POS.entranceZ;
  const cavernBackZ = SOUTHERN_MINE_POS.cavernBackZ;
  // Brazier pieces shared with the dwarven kingdom builder (surface forges outside the mine).
  const forgeBrazierBaseGeo = new THREE.CylinderGeometry(1.35, 1.55, 0.95, 10);
  forgeBrazierBaseGeo.translate(0, 0.475, 0);
  const forgeCoalMoundGeo = new THREE.SphereGeometry(1.12, 10, 8);
  forgeCoalMoundGeo.scale(1.0, 0.45, 1.0);
  disposableGeometries.push(forgeBrazierBaseGeo, forgeCoalMoundGeo);

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

  const SHEEP_UPDATE_RADIUS = 240;
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
      // Far sheep are not drawn (distance culling), and their pose depends only on time, so skip them until they are near.
      if (Math.hypot(sx - playerX, sz - playerZ) > SHEEP_UPDATE_RADIUS) continue;
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

    if (isInsideSouthernMine(playerX, playerZ)) {
      mineGroup.visible = true;
    }
    if (mineGroup.visible) {
      updateAncientMine(elapsedTime);
    }
    if (updateDwarvenMiners) {
      updateDwarvenMiners(worldHours ?? 12, elapsedTime, playerX, playerZ);
    }
  };

  return { mineGroup, updateFarmhousesAndMine };
}
// #endregion
