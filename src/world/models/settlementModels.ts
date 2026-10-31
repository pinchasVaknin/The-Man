// ============================================================================
// MODULE: World / Models / Settlement Models
// DESIGN: Rural valley settlement structures, bridges, hunter lodge, mills, waterfall (SRP)
// SUMMARY: Constructs the lakeside pier, moored rowboat, stone footbridge, watchtower,
//          hunter's lodge, stable, riverside windmills, and grand mountain waterfall.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  WATER_LEVEL,
  HUNTER_LODGE_POS,
  WATERFALL_CLIFF_POS,
  WATERFALL_POOL_POS,
  RIVERSIDE_WINDMILLS,
  LAKESIDE_TEA_PAVILION_POS,
  RIDEABLE_HORSES,
  BEAR_MOUNTAIN_CAVES,
  SOUTHERN_RIVER_BRIDGE_POS,
  CROCODILE_RIVER_BEND_POS,
  southernRiverBridgeHeightAt,
  groundHeightAt,
  walkableHeightAt,
  getSurfaceNormalAt,
  computeSlopePitchAndRoll,
  isWithinViewDistance,
  computeHorseBiomechanicalPose,
  type IRideableHorseState,
} from '../terrainMath';
import { createBirchBarkTexture } from '../builders/shaderAndMaterialBuilders';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== SETTLEMENT MODEL INTERFACE ======================== \\
// #region Settlement Model Interface
/**
 * Summary: Interactive door handles and ladder climb triggers across village settlements.
 * Design: Exposes hunter lodge doors and hill watchtower ladder entry bounds.
 */
export interface ISettlementModelHandles {
  readonly rowboatGroup: THREE.Group;
  readonly updateSettlement: (
    elapsedTime: number,
    rideableHorses?: readonly IRideableHorseState[],
    mountedHorseId?: string | null,
    playerX?: number,
    playerZ?: number
  ) => void;
}
export type SettlementModelHandles = ISettlementModelHandles;
// #endregion

// ======================== BUILD SETTLEMENT MODELS ======================== \\
// #region Build Settlement Models
/**
 * Summary: Build settlement models.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Constructs the rural settlement landmarks, hunter's compound, windmills, and waterfall.
 * @param ctx Input parameter ctx.
 * @returns Computed result for buildSettlementModels.
 */
export function buildSettlementModels(ctx: IWorldModelBuildContext): ISettlementModelHandles {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
    doorPivotHandles,
  } = ctx;

  const birchBarkTex = ctx.birchBarkTexture ?? createBirchBarkTexture();

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
  const birchBarkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: birchBarkTex,
    bumpMap: textures.barkBump,
    bumpScale: 0.04,
    roughness: 0.78,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.09,
    roughness: 0.65,
    metalness: 0.06,
  });
  const furnitureWoodMat = new THREE.MeshStandardMaterial({
    color: 0x8a562d,
    map: textures.timberAlbedo,
    roughness: 0.68,
    metalness: 0.05,
  });
  const furRugMat = new THREE.MeshStandardMaterial({
    color: 0x452715,
    roughness: 0.94,
  });
  const sailClothMat = new THREE.MeshStandardMaterial({
    color: 0xf4ead5,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const waterfallMat = new THREE.MeshBasicMaterial({
    color: 0xe0f7ff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  waterfallMat.userData.uTime = { value: 0 };
  waterfallMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterfallMat.userData.uTime;
    shader.vertexShader =
      `uniform float uTime;\nvarying vec2 vWfUv;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vWfUv = uv;
        float crest = smoothstep(0.75, 1.0, uv.y) * 0.22;
        transformed.z += crest + sin(uv.y * 22.0 + uTime * 12.0 + uv.x * 8.0) * 0.16;
        `
      );
    shader.fragmentShader =
      `uniform float uTime;\nvarying vec2 vWfUv;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        float streakA = sin(vWfUv.x * 28.0) * 0.5 + 0.5;
        float streakB = cos(vWfUv.x * 54.0 + 1.2) * 0.5 + 0.5;
        float flow1 = sin(vWfUv.y * 30.0 + uTime * 14.0 + streakA * 3.5) * 0.5 + 0.5;
        float flow2 = sin(vWfUv.y * 58.0 + uTime * 22.0 - streakB * 4.2) * 0.5 + 0.5;
        float splashEnds = smoothstep(0.22, 0.0, vWfUv.y) * 0.65 + smoothstep(0.82, 1.0, vWfUv.y) * 0.55;
        float edgeSoft = smoothstep(0.0, 0.12, vWfUv.x) * smoothstep(1.0, 0.88, vWfUv.x);
        float foamFactor = clamp(flow1 * 0.52 + flow2 * 0.38 + splashEnds, 0.0, 1.0);
        vec3 deepAqua = vec3(0.28, 0.68, 0.88);
        vec3 brightFoam = vec3(0.96, 0.99, 1.0);
        diffuseColor.rgb = mix(deepAqua, brightFoam, foamFactor);
        diffuseColor.a *= (0.72 + foamFactor * 0.28) * (0.55 + 0.45 * edgeSoft);
        `
      );
  };
  const foamRingMat = new THREE.MeshBasicMaterial({
    color: 0xf0f9ff,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const caveDarkMat = new THREE.MeshBasicMaterial({ color: 0x05070a });

  disposableMaterials.push(
    timberMat,
    darkIronMat,
    warmLanternMat,
    hayMat,
    barkMat,
    birchBarkMat,
    rockMat,
    furnitureWoodMat,
    furRugMat,
    sailClothMat,
    waterfallMat,
    foamRingMat,
    caveDarkMat
  );

  function createLanternAssembly(x: number, y: number, z: number, _addLight: boolean): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.45, 8);
    postGeo.translate(0, 0.72, 0);
    const armGeo = new THREE.BoxGeometry(0.38, 0.06, 0.06);
    armGeo.translate(0.14, 1.42, 0);
    const cageGeo = new THREE.CylinderGeometry(0.13, 0.1, 0.28, 6);
    cageGeo.translate(0.28, 1.24, 0);
    const capGeo = new THREE.ConeGeometry(0.17, 0.12, 6);
    capGeo.translate(0.28, 1.41, 0);
    disposableGeometries.push(postGeo, armGeo, cageGeo, capGeo);

    g.add(new THREE.Mesh(postGeo, timberMat));
    g.add(new THREE.Mesh(armGeo, darkIronMat));
    g.add(new THREE.Mesh(cageGeo, warmLanternMat));
    g.add(new THREE.Mesh(capGeo, darkIronMat));
    return g;
  }

  // --- A. CENTRAL LAKESIDE TIMBER PIER & MOORED WOODEN ROWBOAT ---
  const pierGroup = new THREE.Group();
  pierGroup.position.set(-11.5, 0, 15.5);
  pierGroup.rotation.y = Math.atan2(-8.0, 6.0);

  const plankGeo = new THREE.BoxGeometry(0.36, 0.09, 2.5);
  const beamGeo = new THREE.BoxGeometry(17.2, 0.14, 0.16);
  const pilingGeo = new THREE.CylinderGeometry(0.13, 0.15, 2.8, 8);
  disposableGeometries.push(plankGeo, beamGeo, pilingGeo);

  for (let p = -8.0; p <= 8.8; p += 0.42) {
    const plank = new THREE.Mesh(plankGeo, timberMat);
    plank.position.set(p, 0.51, 0);
    plank.castShadow = !isSoftwareGl;
    plank.receiveShadow = !isSoftwareGl;
    pierGroup.add(plank);
  }
  for (const zSide of [-1.05, 1.05]) {
    const beam = new THREE.Mesh(beamGeo, timberMat);
    beam.position.set(0.4, 0.42, zSide);
    pierGroup.add(beam);
  }
  for (let px = -7.8; px <= 8.4; px += 2.7) {
    for (const pz of [-1.05, 1.05]) {
      const piling = new THREE.Mesh(pilingGeo, barkMat);
      piling.position.set(px, -0.35, pz);
      piling.castShadow = !isSoftwareGl;
      pierGroup.add(piling);
    }
  }
  pierGroup.add(createLanternAssembly(-7.6, 0.55, 1.05, true));
  pierGroup.add(createLanternAssembly(8.2, 0.55, -1.05, false));
  scene.add(pierGroup);
  distanceCulledObjects.push({ obj: pierGroup, cx: -11.5, cz: 15.5, radius: 18 });

  const rowboatGroup = new THREE.Group();
  rowboatGroup.position.set(-6.5, WATER_LEVEL + 0.05, 10.2);
  rowboatGroup.rotation.y = 0.65;

  const hullBottomGeo = new THREE.BoxGeometry(2.7, 0.14, 1.05);
  const hullSideGeo = new THREE.BoxGeometry(2.85, 0.36, 0.08);
  const benchGeo = new THREE.BoxGeometry(0.32, 0.06, 0.98);
  const oarGeo = new THREE.CylinderGeometry(0.025, 0.035, 2.1, 6);
  oarGeo.rotateZ(Math.PI / 2);
  disposableGeometries.push(hullBottomGeo, hullSideGeo, benchGeo, oarGeo);

  rowboatGroup.add(new THREE.Mesh(hullBottomGeo, timberMat));
  const sideL = new THREE.Mesh(hullSideGeo, timberMat);
  sideL.position.set(0, 0.18, 0.52);
  sideL.rotation.x = -0.15;
  const sideR = new THREE.Mesh(hullSideGeo, timberMat);
  sideR.position.set(0, 0.18, -0.52);
  sideR.rotation.x = 0.15;
  rowboatGroup.add(sideL, sideR);

  for (const bx of [-0.65, 0.0, 0.65]) {
    const bench = new THREE.Mesh(benchGeo, timberMat);
    bench.position.set(bx, 0.22, 0);
    rowboatGroup.add(bench);
  }
  const oar1 = new THREE.Mesh(oarGeo, timberMat);
  oar1.position.set(-0.1, 0.32, 0.65);
  oar1.rotation.y = 0.35;
  oar1.rotation.z = 0.15;
  const oar2 = new THREE.Mesh(oarGeo, timberMat);
  oar2.position.set(-0.1, 0.32, -0.65);
  oar2.rotation.y = -0.35;
  oar2.rotation.z = 0.15;
  rowboatGroup.add(oar1, oar2);
  scene.add(rowboatGroup);
  distanceCulledObjects.push({ obj: rowboatGroup, cx: -6.5, cz: 10.2, radius: 10 });

  // Western Lagoon Wooden Pier at (-120.0, 48.0) + Lakeside Chinese Tea Pavilion & Koi Fish
  const westPierGroup = new THREE.Group();
  westPierGroup.position.set(-120.0, 0, 48.0);
  const westBeamGeo = new THREE.BoxGeometry(21.2, 0.14, 0.16);
  disposableGeometries.push(westBeamGeo);
  for (let p = -6.0; p <= 14.85; p += 0.45) {
    const plank = new THREE.Mesh(plankGeo, timberMat);
    plank.position.set(p, 0.51, 0);
    westPierGroup.add(plank);
  }
  for (const zSide of [-1.05, 1.05]) {
    const beam = new THREE.Mesh(westBeamGeo, timberMat);
    beam.position.set(4.4, 0.42, zSide);
    westPierGroup.add(beam);
  }
  for (let px = -5.5; px <= 14.5; px += 2.85) {
    for (const pz of [-1.05, 1.05]) {
      const piling = new THREE.Mesh(pilingGeo, barkMat);
      piling.position.set(px, -0.35, pz);
      westPierGroup.add(piling);
    }
  }
  westPierGroup.add(createLanternAssembly(14.2, 0.55, 1.05, false));

  const teaDeckGeo = new THREE.BoxGeometry(7.6, 0.18, 7.6);
  const teaPillarGeo = new THREE.CylinderGeometry(0.18, 0.2, 3.6, 8);
  teaPillarGeo.translate(0, 1.8, 0);
  const teaRailLongGeo = new THREE.BoxGeometry(0.14, 0.78, 7.4);
  const teaRailFrontGeo = new THREE.BoxGeometry(7.4, 0.78, 0.14);
  const teaRoofConeGeo = new THREE.ConeGeometry(6.2, 2.35, 8);
  teaRoofConeGeo.rotateY(Math.PI / 8);
  const teaRoofRimGeo = new THREE.CylinderGeometry(5.6, 6.4, 0.32, 8);
  teaRoofRimGeo.rotateY(Math.PI / 8);
  const teaTableLowGeo = new THREE.CylinderGeometry(1.15, 1.05, 0.48, 12);
  teaTableLowGeo.translate(0, 0.24, 0);
  const teaCushionGeo = new THREE.CylinderGeometry(0.42, 0.45, 0.14, 10);
  teaCushionGeo.translate(0, 0.07, 0);
  const teapotGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const teacupGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.09, 8);
  const lotusLanternBaseGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.08, 8);
  const lotusLanternCoreGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const koiBodyGeo = new THREE.ConeGeometry(0.14, 0.62, 7);
  koiBodyGeo.rotateX(Math.PI / 2);
  const koiTailGeo = new THREE.ConeGeometry(0.16, 0.26, 4);
  koiTailGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(
    teaDeckGeo,
    teaPillarGeo,
    teaRailLongGeo,
    teaRailFrontGeo,
    teaRoofConeGeo,
    teaRoofRimGeo,
    teaTableLowGeo,
    teaCushionGeo,
    teapotGeo,
    teacupGeo,
    lotusLanternBaseGeo,
    lotusLanternCoreGeo,
    koiBodyGeo,
    koiTailGeo
  );

  const teaCrimsonMat = new THREE.MeshStandardMaterial({ color: 0x9e241b, roughness: 0.48 });
  const teaGoldMat = new THREE.MeshStandardMaterial({ color: 0xd9a838, roughness: 0.35, metalness: 0.65 });
  const teaRoofMat = new THREE.MeshStandardMaterial({ color: 0x1f6b5c, roughness: 0.52, metalness: 0.15 });
  const koiGoldMat = new THREE.MeshStandardMaterial({
    color: 0xff6b1a,
    emissive: 0x9a3412,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });
  const koiWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xfff7ed,
    emissive: 0xea580c,
    emissiveIntensity: 0.25,
    roughness: 0.25,
  });
  const blanketClothMat = new THREE.MeshStandardMaterial({ color: 0x992b24, roughness: 0.85 });
  const pillowClothMat = new THREE.MeshStandardMaterial({ color: 0xf3ede0, roughness: 0.82 });
  disposableMaterials.push(
    teaCrimsonMat,
    teaGoldMat,
    teaRoofMat,
    koiGoldMat,
    koiWhiteMat,
    blanketClothMat,
    pillowClothMat
  );

  const teaPavGroup = new THREE.Group();
  teaPavGroup.position.set(LAKESIDE_TEA_PAVILION_POS.x - -120.0, 0, LAKESIDE_TEA_PAVILION_POS.z - 48.0);
  const teaDeck = new THREE.Mesh(teaDeckGeo, timberMat);
  teaDeck.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight - 0.08, 0);
  teaPavGroup.add(teaDeck);

  for (const px of [-3.3, 0, 3.3]) {
    for (const pz of [-3.3, 3.3]) {
      const tpiling = new THREE.Mesh(pilingGeo, barkMat);
      tpiling.position.set(px, -0.68, pz);
      teaPavGroup.add(tpiling);
    }
  }
  for (const px of [-3.4, 3.4]) {
    for (const pz of [-3.4, 3.4]) {
      const col = new THREE.Mesh(teaPillarGeo, teaCrimsonMat);
      col.position.set(px, LAKESIDE_TEA_PAVILION_POS.deckHeight, pz);
      teaPavGroup.add(col);
    }
  }
  const westTeaRail = new THREE.Mesh(teaRailLongGeo, teaCrimsonMat);
  westTeaRail.position.set(-3.5, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.39, 0);
  const northTeaRail = new THREE.Mesh(teaRailFrontGeo, teaCrimsonMat);
  northTeaRail.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.39, -3.5);
  const southTeaRail = new THREE.Mesh(teaRailFrontGeo, teaCrimsonMat);
  southTeaRail.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.39, 3.5);
  teaPavGroup.add(westTeaRail, northTeaRail, southTeaRail);

  const teaRoofRim = new THREE.Mesh(teaRoofRimGeo, teaGoldMat);
  teaRoofRim.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 3.65, 0);
  const teaRoofCone = new THREE.Mesh(teaRoofConeGeo, teaRoofMat);
  teaRoofCone.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 4.85, 0);
  teaPavGroup.add(teaRoofRim, teaRoofCone);

  const lowTeaTable = new THREE.Mesh(teaTableLowGeo, furnitureWoodMat);
  lowTeaTable.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight, 0);
  const teapotMesh = new THREE.Mesh(teapotGeo, teaGoldMat);
  teapotMesh.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.6, 0);
  teaPavGroup.add(lowTeaTable, teapotMesh);
  for (let c = 0; c < 4; c++) {
    const cAng = (c * Math.PI) / 2 + Math.PI / 4;
    const cushion = new THREE.Mesh(teaCushionGeo, blanketClothMat);
    cushion.position.set(Math.cos(cAng) * 1.65, LAKESIDE_TEA_PAVILION_POS.deckHeight, Math.sin(cAng) * 1.65);
    const cup = new THREE.Mesh(teacupGeo, pillowClothMat);
    cup.position.set(Math.cos(cAng) * 0.65, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.52, Math.sin(cAng) * 0.65);
    teaPavGroup.add(cushion, cup);
  }
  westPierGroup.add(teaPavGroup);

  for (let l = 0; l < 14; l++) {
    const lang = (l / 14) * Math.PI * 2;
    const lrad = 5.6 + (l % 3) * 2.4;
    const lx = -6.0 + Math.cos(lang) * lrad;
    const lz = Math.sin(lang) * lrad;
    const lPad = new THREE.Mesh(lotusLanternBaseGeo, teaRoofMat);
    lPad.position.set(lx, WATER_LEVEL + 0.03, lz);
    const lGlow = new THREE.Mesh(lotusLanternCoreGeo, warmLanternMat);
    lGlow.position.set(lx, WATER_LEVEL + 0.16, lz);
    westPierGroup.add(lPad, lGlow);
  }

  interface ISwimmingKoi {
    mesh: THREE.Group;
    orbitCenterX: number;
    orbitCenterZ: number;
    orbitRadius: number;
    speed: number;
    phase: number;
  }
  const swimmingKoiList: ISwimmingKoi[] = [];
  for (let k = 0; k < 12; k++) {
    const koiGroup = new THREE.Group();
    const kMat = k % 2 === 0 ? koiGoldMat : koiWhiteMat;
    const kBody = new THREE.Mesh(koiBodyGeo, kMat);
    const kTail = new THREE.Mesh(koiTailGeo, teaCrimsonMat);
    kTail.position.set(0, 0, -0.36);
    koiGroup.add(kBody, kTail);
    westPierGroup.add(koiGroup);
    swimmingKoiList.push({
      mesh: koiGroup,
      orbitCenterX: -6.0 + ((k % 3) - 1) * 3.2,
      orbitCenterZ: ((k % 4) - 1.5) * 2.8,
      orbitRadius: 4.8 + (k % 4) * 1.4,
      speed: 0.42 + (k % 3) * 0.14,
      phase: k * 0.95,
    });
  }

  scene.add(westPierGroup);
  distanceCulledObjects.push({ obj: westPierGroup, cx: -123.0, cz: 48.0, radius: 28 });

  // --- B. CENTRAL ARCHED STONE FOOTBRIDGE at (18.0, 2.0) ---
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(18.0, 0, 2.0);

  const segGeo = new THREE.BoxGeometry(3.2, 0.28, 1.08);
  const postStoneGeo = new THREE.BoxGeometry(0.32, 0.85, 0.32);
  const railStoneGeo = new THREE.BoxGeometry(0.22, 0.18, 1.15);
  const bridgeAbutmentGeo = new THREE.BoxGeometry(3.5, 1.4, 1.6);
  const bridgeSupportPierGeo = new THREE.CylinderGeometry(0.38, 0.48, 3.2, 8);
  disposableGeometries.push(
    segGeo,
    postStoneGeo,
    railStoneGeo,
    bridgeAbutmentGeo,
    bridgeSupportPierGeo
  );

  for (let i = -11; i <= 11; i++) {
    const zLocal = i * 0.98;
    const normZ = zLocal / 11.2;
    const archY = 0.52 + (1.0 - normZ * normZ) * 1.58;
    const slopeAngle = Math.atan((2 * normZ * 1.58) / 11.2);

    const deckSeg = new THREE.Mesh(segGeo, rockMat);
    deckSeg.position.set(0, archY, zLocal);
    deckSeg.rotation.x = slopeAngle;
    deckSeg.castShadow = !isSoftwareGl;
    deckSeg.receiveShadow = !isSoftwareGl;
    bridgeGroup.add(deckSeg);

    if (i % 2 === 0) {
      for (const xSide of [-1.42, 1.42]) {
        const post = new THREE.Mesh(postStoneGeo, rockMat);
        post.position.set(xSide, archY + 0.45, zLocal);
        post.castShadow = !isSoftwareGl;
        bridgeGroup.add(post);
      }
    }
    for (const xSide of [-1.42, 1.42]) {
      const rail = new THREE.Mesh(railStoneGeo, rockMat);
      rail.position.set(xSide, archY + 0.82, zLocal);
      rail.rotation.x = slopeAngle;
      bridgeGroup.add(rail);
    }
  }
  for (const endZ of [-11.1, 11.1]) {
    const abutment = new THREE.Mesh(bridgeAbutmentGeo, rockMat);
    abutment.position.set(0, 0.05, endZ);
    bridgeGroup.add(abutment);
  }
  for (const pierZ of [-5.8, 5.8]) {
    for (const xSide of [-1.25, 1.25]) {
      const pierCol = new THREE.Mesh(bridgeSupportPierGeo, rockMat);
      pierCol.position.set(xSide, 0.1, pierZ);
      bridgeGroup.add(pierCol);
    }
  }
  bridgeGroup.add(createLanternAssembly(1.42, 2.12, 0, true));
  scene.add(bridgeGroup);
  distanceCulledObjects.push({ obj: bridgeGroup, cx: 18.0, cz: 2.0, radius: 22 });

  // --- C. NORTHERN TIMBER & STONE WATCHTOWER PAVILION at (30.0, -26.0) ---
  const towerGroup = new THREE.Group();
  const towerBaseY = groundHeightAt(30.0, -26.0);
  towerGroup.position.set(30.0, towerBaseY, -26.0);

  const plinthGeo = new THREE.CylinderGeometry(3.8, 4.3, 0.7, 8);
  plinthGeo.translate(0, 0.25, 0);
  const deckPlatformGeo = new THREE.BoxGeometry(5.8, 0.18, 5.8);
  deckPlatformGeo.translate(0, 0.52, 0);
  const postTimberGeo = new THREE.CylinderGeometry(0.18, 0.22, 3.6, 8);
  postTimberGeo.translate(0, 2.35, 0);
  const roofConeGeo = new THREE.ConeGeometry(4.6, 2.2, 8);
  roofConeGeo.translate(0, 5.15, 0);
  const finialGeo = new THREE.CylinderGeometry(0.05, 0.12, 0.8, 6);
  finialGeo.translate(0, 6.45, 0);
  disposableGeometries.push(plinthGeo, deckPlatformGeo, postTimberGeo, roofConeGeo, finialGeo);

  towerGroup.add(new THREE.Mesh(plinthGeo, rockMat));
  towerGroup.add(new THREE.Mesh(deckPlatformGeo, timberMat));
  const roofMesh = new THREE.Mesh(roofConeGeo, barkMat);
  roofMesh.castShadow = !isSoftwareGl;
  towerGroup.add(roofMesh);
  towerGroup.add(new THREE.Mesh(finialGeo, darkIronMat));

  const cornerCoords = [
    [-2.5, -2.5],
    [2.5, -2.5],
    [-2.5, 2.5],
    [2.5, 2.5],
  ];
  for (const [cx, cz] of cornerCoords) {
    const post = new THREE.Mesh(postTimberGeo, barkMat);
    post.position.set(cx, 0, cz);
    post.castShadow = !isSoftwareGl;
    towerGroup.add(post);
  }
  towerGroup.add(createLanternAssembly(2.2, 0.55, 2.2, true));
  scene.add(towerGroup);
  distanceCulledObjects.push({ obj: towerGroup, cx: 30.0, cz: -26.0, radius: 16 });

  // --- D. ANCIENT OAK SANCTUARY CAIRN & BENCH at (-34.0, -16.0) ---
  const sanctuaryGroup = new THREE.Group();
  const sancY = groundHeightAt(-34.0, -16.0);
  sanctuaryGroup.position.set(-34.0, sancY, -16.0);

  for (let s = 0; s < 5; s++) {
    const r = 1.05 - s * 0.17;
    const h = 0.34 - s * 0.03;
    const cairnStoneGeo = new THREE.DodecahedronGeometry(r, 1);
    cairnStoneGeo.scale(1.1, h / r, 1.0);
    disposableGeometries.push(cairnStoneGeo);
    const m = new THREE.Mesh(cairnStoneGeo, rockMat);
    m.position.set(0, 0.2 + s * 0.34, 0);
    m.rotation.y = s * 1.1;
    m.castShadow = !isSoftwareGl;
    sanctuaryGroup.add(m);
  }
  const benchSeatGeo = new THREE.BoxGeometry(2.4, 0.12, 0.55);
  disposableGeometries.push(benchSeatGeo);
  const benchSeat = new THREE.Mesh(benchSeatGeo, timberMat);
  benchSeat.position.set(0, 0.48, 3.2);
  sanctuaryGroup.add(benchSeat);
  scene.add(sanctuaryGroup);
  distanceCulledObjects.push({ obj: sanctuaryGroup, cx: -34.0, cz: -16.0, radius: 14 });

  // --- E. NORTHEASTERN RIVER TIMBER BRIDGE at (78.0, -35.0) ---
  const riverBridgeGroup = new THREE.Group();
  riverBridgeGroup.position.set(78.0, 0, -35.0);
  riverBridgeGroup.rotation.y = 0.54;

  for (let i = -12; i <= 12; i++) {
    const zLocal = i * 0.96;
    const norm = zLocal / 11.6;
    const deckY = 0.72 + (1.0 - norm * norm) * 1.18;
    const slopeAngle = Math.atan((2 * norm * 1.18) / 11.6);

    const seg = new THREE.Mesh(segGeo, timberMat);
    seg.position.set(0, deckY, zLocal);
    seg.rotation.x = slopeAngle;
    seg.castShadow = !isSoftwareGl;
    seg.receiveShadow = !isSoftwareGl;
    riverBridgeGroup.add(seg);

    if (i % 2 === 0) {
      for (const xSide of [-1.45, 1.45]) {
        const post = new THREE.Mesh(postStoneGeo, barkMat);
        post.position.set(xSide, deckY + 0.45, zLocal);
        riverBridgeGroup.add(post);
      }
    }
    for (const xSide of [-1.45, 1.45]) {
      const rail = new THREE.Mesh(railStoneGeo, timberMat);
      rail.position.set(xSide, deckY + 0.82, zLocal);
      rail.rotation.x = slopeAngle;
      riverBridgeGroup.add(rail);
    }
    if (i === -8 || i === -4 || i === 4 || i === 8) {
      for (const xSide of [-1.3, 1.3]) {
        const piling = new THREE.Mesh(bridgeSupportPierGeo, barkMat);
        piling.scale.set(0.65, 1.0, 0.65);
        piling.position.set(xSide, deckY - 1.5, zLocal);
        riverBridgeGroup.add(piling);
      }
    }
  }
  for (const endZ of [-11.6, 11.6]) {
    const abutment = new THREE.Mesh(bridgeAbutmentGeo, rockMat);
    abutment.position.set(0, 0.2, endZ);
    riverBridgeGroup.add(abutment);
  }
  riverBridgeGroup.add(createLanternAssembly(1.45, 1.92, 0, true));
  scene.add(riverBridgeGroup);
  distanceCulledObjects.push({ obj: riverBridgeGroup, cx: 78.0, cz: -35.0, radius: 24 });

  // --- F. HUNTER'S LODGE & HORSE STABLE COMPOUND at (-92, 72) ---
  const lodgeBaseY = HUNTER_LODGE_POS.height;
  const hunterCompound = new THREE.Group();
  hunterCompound.position.set(HUNTER_LODGE_POS.x, lodgeBaseY - 0.28, HUNTER_LODGE_POS.z);
  hunterCompound.rotation.y = Math.PI;

  const lodgePlinthGeo = new THREE.BoxGeometry(11.4, 0.48, 9.2);
  lodgePlinthGeo.translate(0, 0.24, 0);
  const porchStepsGeo = new THREE.BoxGeometry(3.2, 0.24, 1.1);
  porchStepsGeo.translate(0, 0.12, 4.95);
  const lodgeFloorGeo = new THREE.BoxGeometry(11.0, 0.12, 8.8);
  lodgeFloorGeo.translate(0, 0.48, 0);
  disposableGeometries.push(lodgePlinthGeo, porchStepsGeo, lodgeFloorGeo);

  hunterCompound.add(
    new THREE.Mesh(lodgePlinthGeo, rockMat),
    new THREE.Mesh(porchStepsGeo, rockMat),
    new THREE.Mesh(lodgeFloorGeo, timberMat)
  );

  const horizLogBackGeo = new THREE.CylinderGeometry(0.19, 0.19, 9.8, 8);
  horizLogBackGeo.rotateZ(Math.PI / 2);
  const horizLogFrontFlankGeo = new THREE.CylinderGeometry(0.19, 0.19, 3.8, 8);
  horizLogFrontFlankGeo.rotateZ(Math.PI / 2);
  const horizLogSideGeo = new THREE.CylinderGeometry(0.19, 0.19, 6.2, 8);
  horizLogSideGeo.rotateX(Math.PI / 2);
  const windowPaneGeo = new THREE.BoxGeometry(1.45, 1.05, 0.42);
  disposableGeometries.push(horizLogBackGeo, horizLogFrontFlankGeo, horizLogSideGeo, windowPaneGeo);

  for (let row = 0; row < 10; row++) {
    const ly = 0.65 + row * 0.34;
    const backLog = new THREE.Mesh(horizLogBackGeo, barkMat);
    backLog.position.set(0, ly, -3.8);
    backLog.castShadow = !isSoftwareGl;
    hunterCompound.add(backLog);

    if (row >= 7) {
      const topFrontLog = new THREE.Mesh(horizLogBackGeo, barkMat);
      topFrontLog.position.set(0, ly, 1.8);
      hunterCompound.add(topFrontLog);
    } else {
      for (const fx of [-2.9, 2.9]) {
        const flankLog = new THREE.Mesh(horizLogFrontFlankGeo, barkMat);
        flankLog.position.set(fx, ly, 1.8);
        hunterCompound.add(flankLog);
      }
    }

    for (const sx of [-4.6, 4.6]) {
      const sideLog = new THREE.Mesh(horizLogSideGeo, barkMat);
      sideLog.position.set(sx, ly, -1.0);
      sideLog.castShadow = !isSoftwareGl;
      hunterCompound.add(sideLog);
    }
  }

  const lodgeDoorGroup = new THREE.Group();
  lodgeDoorGroup.position.set(0, 0.48, 1.8);
  const lodgeLeafGeo = new THREE.BoxGeometry(0.92, 2.35, 0.12);
  lodgeLeafGeo.translate(0.46, 1.175, 0);
  disposableGeometries.push(lodgeLeafGeo);
  const lodgeLeftPivot = new THREE.Group();
  lodgeLeftPivot.position.set(-0.95, 0, 0);
  lodgeLeftPivot.add(new THREE.Mesh(lodgeLeafGeo, timberMat));
  const lodgeRightPivot = new THREE.Group();
  lodgeRightPivot.position.set(0.95, 0, 0);
  const lodgeRightLeaf = new THREE.Mesh(lodgeLeafGeo, timberMat);
  lodgeRightLeaf.scale.x = -1;
  lodgeRightPivot.add(lodgeRightLeaf);
  lodgeDoorGroup.add(lodgeLeftPivot, lodgeRightPivot);
  hunterCompound.add(lodgeDoorGroup);
  doorPivotHandles.push({
    id: 'hunter-lodge-door',
    leftPivot: lodgeLeftPivot,
    rightPivot: lodgeRightPivot,
    currentAngle: 0,
  });

  for (const wx of [-2.85, 2.85]) {
    const win = new THREE.Mesh(windowPaneGeo, warmLanternMat);
    win.position.set(wx, 2.25, 1.82);
    hunterCompound.add(win);
  }

  const roofSlopeGeo = new THREE.BoxGeometry(11.8, 0.24, 6.2);
  const verandaColGeo = new THREE.CylinderGeometry(0.16, 0.19, 3.3, 8);
  verandaColGeo.translate(0, 2.1, 0);
  const porchRailGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6);
  porchRailGeo.rotateZ(Math.PI / 2);
  disposableGeometries.push(roofSlopeGeo, verandaColGeo, porchRailGeo);

  const roofFront = new THREE.Mesh(roofSlopeGeo, barkMat);
  roofFront.position.set(0, 4.85, 1.55);
  roofFront.rotation.x = 0.52;
  roofFront.castShadow = !isSoftwareGl;
  const roofBack = new THREE.Mesh(roofSlopeGeo, barkMat);
  roofBack.position.set(0, 4.85, -3.15);
  roofBack.rotation.x = -0.52;
  roofBack.castShadow = !isSoftwareGl;
  hunterCompound.add(roofFront, roofBack);

  for (const vx of [-4.8, -1.8, 1.8, 4.8]) {
    const col = new THREE.Mesh(verandaColGeo, barkMat);
    col.position.set(vx, 0, 4.1);
    col.castShadow = !isSoftwareGl;
    hunterCompound.add(col);
  }
  for (const rx of [-3.3, 3.3]) {
    const rail = new THREE.Mesh(porchRailGeo, timberMat);
    rail.position.set(rx, 1.25, 4.1);
    hunterCompound.add(rail);
  }

  const lodgeChimneyGeo = new THREE.BoxGeometry(1.5, 6.8, 1.6);
  lodgeChimneyGeo.translate(5.1, 3.4, -1.2);
  const plaqueGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 8);
  plaqueGeo.rotateX(Math.PI / 2);
  const trophyHornGeo = new THREE.CylinderGeometry(0.03, 0.06, 1.15, 6);
  disposableGeometries.push(lodgeChimneyGeo, plaqueGeo, trophyHornGeo);

  const chimneyMesh = new THREE.Mesh(lodgeChimneyGeo, rockMat);
  chimneyMesh.castShadow = !isSoftwareGl;
  hunterCompound.add(chimneyMesh);

  const trophyGroup = new THREE.Group();
  trophyGroup.position.set(0, 3.65, 2.05);
  trophyGroup.add(new THREE.Mesh(plaqueGeo, timberMat));
  const hornL = new THREE.Mesh(trophyHornGeo, birchBarkMat);
  hornL.position.set(-0.42, 0.35, 0.1);
  hornL.rotation.z = 0.68;
  const hornR = new THREE.Mesh(trophyHornGeo, birchBarkMat);
  hornR.position.set(0.42, 0.35, 0.1);
  hornR.rotation.z = -0.68;
  trophyGroup.add(hornL, hornR);
  hunterCompound.add(trophyGroup);

  hunterCompound.add(createLanternAssembly(-2.1, 0.48, 4.2, true));

  // Water Trough
  const troughGroup = new THREE.Group();
  troughGroup.position.set(9.5, 0.28, 3.5);

  const troughBaseGeo = new THREE.BoxGeometry(0.45, 0.45, 0.95);
  troughBaseGeo.translate(0, 0.22, 0);
  const troughSideLGeo = new THREE.BoxGeometry(2.8, 0.52, 0.12);
  const troughEndGeo = new THREE.BoxGeometry(0.12, 0.52, 0.88);
  const troughWaterGeo = new THREE.PlaneGeometry(2.56, 0.68);
  troughWaterGeo.rotateX(-Math.PI / 2);
  const pumpPostGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.55, 8);
  pumpPostGeo.translate(-1.55, 0.77, 0);
  const spoutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6);
  spoutGeo.rotateZ(Math.PI / 2);
  spoutGeo.translate(-1.3, 1.18, 0);
  disposableGeometries.push(
    troughBaseGeo,
    troughSideLGeo,
    troughEndGeo,
    troughWaterGeo,
    pumpPostGeo,
    spoutGeo
  );

  for (const tx of [-1.0, 1.0]) {
    const sup = new THREE.Mesh(troughBaseGeo, rockMat);
    sup.position.x = tx;
    troughGroup.add(sup);
  }
  for (const tz of [-0.38, 0.38]) {
    const side = new THREE.Mesh(troughSideLGeo, timberMat);
    side.position.set(0, 0.62, tz);
    troughGroup.add(side);
  }
  for (const tx of [-1.34, 1.34]) {
    const end = new THREE.Mesh(troughEndGeo, timberMat);
    end.position.set(tx, 0.62, 0);
    troughGroup.add(end);
  }
  const troughWater = new THREE.Mesh(troughWaterGeo, waterfallMat);
  troughWater.position.set(0, 0.78, 0);
  troughGroup.add(troughWater);
  troughGroup.add(new THREE.Mesh(pumpPostGeo, barkMat));
  troughGroup.add(new THREE.Mesh(spoutGeo, darkIronMat));
  hunterCompound.add(troughGroup);

  // Stable & Corral
  const stableGroup = new THREE.Group();
  stableGroup.position.set(12.5, 0.28, -3.5);

  const stableFloorGeo = new THREE.BoxGeometry(7.8, 0.18, 5.4);
  stableFloorGeo.translate(0, 0.09, 0);
  const stableBackWallGeo = new THREE.BoxGeometry(7.6, 3.1, 0.25);
  stableBackWallGeo.translate(0, 1.65, -2.5);
  const stableDividerGeo = new THREE.BoxGeometry(0.18, 1.8, 4.6);
  stableDividerGeo.translate(0, 1.0, -0.2);
  const stableRoofGeo = new THREE.BoxGeometry(8.4, 0.22, 6.4);
  const hayBaleGeo = new THREE.BoxGeometry(0.95, 0.58, 0.65);
  hayBaleGeo.translate(0, 0.29, 0);
  disposableGeometries.push(
    stableFloorGeo,
    stableBackWallGeo,
    stableDividerGeo,
    stableRoofGeo,
    hayBaleGeo
  );

  stableGroup.add(new THREE.Mesh(stableFloorGeo, rockMat));
  stableGroup.add(new THREE.Mesh(stableBackWallGeo, timberMat));

  for (const sx of [-3.6, -1.2, 1.2, 3.6]) {
    const postF = new THREE.Mesh(verandaColGeo, barkMat);
    postF.position.set(sx, 0, 2.3);
    const postB = new THREE.Mesh(verandaColGeo, barkMat);
    postB.position.set(sx, 0, -2.5);
    stableGroup.add(postF, postB);

    const div = new THREE.Mesh(stableDividerGeo, timberMat);
    div.position.x = sx;
    stableGroup.add(div);
  }

  const stableRoof = new THREE.Mesh(stableRoofGeo, barkMat);
  stableRoof.position.set(0, 3.55, 0);
  stableRoof.rotation.x = 0.16;
  stableRoof.castShadow = !isSoftwareGl;
  stableGroup.add(stableRoof);

  for (const [hx, hy, hz, rot] of [
    [-2.4, 0.18, -1.6, 0.1],
    [-2.4, 0.76, -1.7, -0.2],
    [0.0, 0.18, -1.6, 0.05],
    [2.4, 0.18, -1.6, -0.15],
  ]) {
    const bale = new THREE.Mesh(hayBaleGeo, hayMat);
    bale.position.set(hx, hy, hz);
    bale.rotation.y = rot;
    stableGroup.add(bale);
  }

  for (const fx of [-3.6, 0, 3.6]) {
    const fPost = new THREE.Mesh(postStoneGeo, barkMat);
    fPost.position.set(fx, 0.55, 5.6);
    stableGroup.add(fPost);
  }
  for (const rx of [-1.8, 1.8]) {
    const fRail = new THREE.Mesh(porchRailGeo, timberMat);
    fRail.position.set(rx, 0.85, 5.6);
    stableGroup.add(fRail);
  }

  hunterCompound.add(stableGroup);
  scene.add(hunterCompound);
  distanceCulledObjects.push({
    obj: hunterCompound,
    cx: HUNTER_LODGE_POS.x,
    cz: HUNTER_LODGE_POS.z,
    radius: 30,
  });

  // --- G. RIVERSIDE WINDMILLS & GRAND WATERFALL ---
  const millBaseGeo = new THREE.CylinderGeometry(2.3, 2.9, 4.2, 8);
  millBaseGeo.translate(0, 2.1, 0);
  const millUpperGeo = new THREE.CylinderGeometry(1.75, 2.25, 4.6, 8);
  millUpperGeo.translate(0, 6.4, 0);
  const millCapGeo = new THREE.ConeGeometry(2.2, 2.1, 8);
  millCapGeo.translate(0, 9.65, 0);
  const hubGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.8, 8);
  hubGeo.rotateX(Math.PI / 2);
  const sparGeo = new THREE.BoxGeometry(0.14, 11.2, 0.14);
  const sailPanelGeo = new THREE.PlaneGeometry(1.15, 4.2);
  disposableGeometries.push(
    millBaseGeo,
    millUpperGeo,
    millCapGeo,
    hubGeo,
    sparGeo,
    sailPanelGeo
  );

  const windmillRotors: THREE.Group[] = [];

  for (const wm of RIVERSIDE_WINDMILLS) {
    const millGroup = new THREE.Group();
    millGroup.position.set(wm.x, wm.height, wm.z);
    millGroup.rotation.y = wm.rotY;

    millGroup.add(
      new THREE.Mesh(millBaseGeo, rockMat),
      new THREE.Mesh(millUpperGeo, timberMat),
      new THREE.Mesh(millCapGeo, barkMat)
    );

    const rotor = new THREE.Group();
    rotor.position.set(0, 7.6, 2.05);
    rotor.add(new THREE.Mesh(hubGeo, darkIronMat));
    for (let s = 0; s < 2; s++) {
      const spar = new THREE.Mesh(sparGeo, timberMat);
      spar.rotation.z = (s * Math.PI) / 2;
      rotor.add(spar);
    }
    for (let b = 0; b < 4; b++) {
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.z = (b * Math.PI) / 2;
      const sail = new THREE.Mesh(sailPanelGeo, sailClothMat);
      sail.position.set(0.62, 3.2, 0.04);
      sail.rotation.y = 0.18;
      bladeHolder.add(sail);
      rotor.add(bladeHolder);
    }
    millGroup.add(rotor);
    windmillRotors.push(rotor);
    scene.add(millGroup);
    distanceCulledObjects.push({ obj: millGroup, cx: wm.x, cz: wm.z, radius: 22 });
  }

  // Grand Multi-Tiered Mountain Waterfall (Cliff at local -Z pouring DOWN into Plunge Pool at local 0)
  const waterfallGroup = new THREE.Group();
  waterfallGroup.position.set(WATERFALL_POOL_POS.x, 0, WATERFALL_POOL_POS.z);
  waterfallGroup.rotation.y = Math.atan2(
    WATERFALL_POOL_POS.x - WATERFALL_CLIFF_POS.x,
    WATERFALL_POOL_POS.z - WATERFALL_CLIFF_POS.z
  );

  const cascadeSheetGeo = new THREE.PlaneGeometry(5.6, 16.4, 16, 32);
  const sideCascadeGeo = new THREE.PlaneGeometry(2.1, 15.2, 8, 24);
  const caveWaterTongueGeo = new THREE.PlaneGeometry(5.2, 5.2, 10, 10);
  caveWaterTongueGeo.rotateX(-Math.PI / 2);
  const foamRingGeo = new THREE.RingGeometry(1.4, 4.4, 28);
  foamRingGeo.rotateX(-Math.PI / 2);
  const outerRippleGeo = new THREE.RingGeometry(4.2, 6.8, 28);
  outerRippleGeo.rotateX(-Math.PI / 2);
  const caveInteriorGeo = new THREE.BoxGeometry(6.8, 5.4, 5.8);
  const cliffBoulderGeo = new THREE.DodecahedronGeometry(2.3, 1);
  const mistCloudGeo = new THREE.SphereGeometry(2.2, 12, 10);
  const mistCloudMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  disposableMaterials.push(mistCloudMat);
  disposableGeometries.push(
    cascadeSheetGeo,
    sideCascadeGeo,
    caveWaterTongueGeo,
    foamRingGeo,
    outerRippleGeo,
    caveInteriorGeo,
    cliffBoulderGeo,
    mistCloudGeo
  );

  const caveChamberMesh = new THREE.Mesh(caveInteriorGeo, caveDarkMat);
  caveChamberMesh.position.set(0, 14.2, -12.8);
  waterfallGroup.add(caveChamberMesh);

  // Sculpted Craggy Cliff Framing Boulders (Top Crest Only)
  const cliffRockPlacements: ReadonlyArray<
    [number, number, number, number, number, number]
  > = [
    // Upper cave arch & spillway lip boulders at the top of the waterfall
    [-3.9, 13.8, -10.8, 1.35, 1.65, 1.25],
    [3.9, 13.8, -10.8, 1.35, 1.65, 1.25],
    [0.0, 16.9, -11.4, 2.1, 0.85, 1.2],
    [-2.4, 16.4, -11.2, 1.3, 0.9, 1.1],
    [2.4, 16.4, -11.2, 1.3, 0.9, 1.1],
  ];
  for (let i = 0; i < cliffRockPlacements.length; i++) {
    const [rx, ry, rz, sx, sy, sz] = cliffRockPlacements[i];
    const rock = new THREE.Mesh(cliffBoulderGeo, rockMat);
    rock.position.set(rx, ry, rz);
    rock.scale.set(sx, sy, sz);
    rock.rotation.set(i * 0.4, i * 0.9, i * 0.3);
    rock.castShadow = !isSoftwareGl;
    rock.receiveShadow = !isSoftwareGl;
    waterfallGroup.add(rock);
  }

  // Upper cave stream tongue sloping DOWNWARD (+0.18 around X tilts +Z downward!) into the lip
  const caveWaterTongue = new THREE.Mesh(caveWaterTongueGeo, waterfallMat);
  caveWaterTongue.position.set(0, 14.35, -10.8);
  caveWaterTongue.rotation.x = 0.18;
  waterfallGroup.add(caveWaterTongue);

  // Main Cascade Sheet: NEGATIVE rotation.x (-0.44) so TOP (+Y) starts at cliff lip (z=-8.8, y=14.4)
  // and BOTTOM (-Y) plunges forward into the pool (z=-1.6, y=0.1)!
  const waterfallMesh = new THREE.Mesh(cascadeSheetGeo, waterfallMat);
  waterfallMesh.position.set(0, 7.1, -5.2);
  waterfallMesh.rotation.x = -0.44;
  waterfallGroup.add(waterfallMesh);

  // Secondary Left & Right Side Cascade Ribbons for Volumetric Depth
  for (const side of [-1, 1] as const) {
    const sideCascade = new THREE.Mesh(sideCascadeGeo, waterfallMat);
    sideCascade.position.set(side * 2.35, 6.8, -4.95);
    sideCascade.rotation.set(-0.46, side * 0.16, side * -0.04);
    waterfallGroup.add(sideCascade);
  }

  // Plunge Pool Mist Spray Billboards
  const waterfallMistMeshes: THREE.Mesh[] = [];
  for (let m = 0; m < 3; m++) {
    const mist = new THREE.Mesh(mistCloudGeo, mistCloudMat);
    mist.position.set((m - 1) * 1.9, 1.25 + (m % 2) * 0.45, -1.6 + (m % 2) * 0.5);
    mist.scale.set(1.35, 0.78, 1.15);
    waterfallGroup.add(mist);
    waterfallMistMeshes.push(mist);
  }

  const poolFoam = new THREE.Mesh(foamRingGeo, foamRingMat);
  poolFoam.position.set(0, WATER_LEVEL + 0.06, -1.2);
  waterfallGroup.add(poolFoam);

  const poolFoamOuter = new THREE.Mesh(outerRippleGeo, foamRingMat);
  poolFoamOuter.position.set(0, WATER_LEVEL + 0.04, -1.0);
  waterfallGroup.add(poolFoamOuter);

  scene.add(waterfallGroup);
  distanceCulledObjects.push({
    obj: waterfallGroup,
    cx: WATERFALL_POOL_POS.x,
    cz: WATERFALL_POOL_POS.z,
    radius: 42,
  });

  // ============================================================================
  // MOUNTAIN FOREST BEAR CAVES (Continuous Sculpted Cliff Portal, Ribbed Tunnel & Vaulted Cavern)
  // ============================================================================
  const rockNoise3D = (x: number, y: number, z: number): number => {
    const n1 = Math.sin(x * 0.37 + y * 0.53) * Math.cos(z * 0.41 - y * 0.29);
    const n2 = Math.sin(x * 0.83 - z * 0.71 + y * 0.61) * 0.5;
    const n3 = Math.cos(x * 1.65 + z * 1.43 - y * 1.19) * 0.25;
    // Stratified horizontal rock bedding planes
    const strata = Math.sin(y * 2.35 + Math.sin(x * 0.45 + z * 0.45) * 0.8) * 0.22;
    return n1 + n2 + n3 + strata;
  };

  // 1) Continuous Ribbed Subterranean Rock Tunnel Shell (lz: -6.4 .. +6.4, clear width ~9.0m, arch height ~5.5m)
  const buildSculptedTunnelShellGeo = (wallThicknessOffset: number, inwardNormals: boolean): THREE.BufferGeometry => {
    const uSegs = 40; // Around arch from left floor (0) -> crown (PI/2) -> right floor (PI)
    const vSegs = 28; // Along tunnel length lz from -6.4 to +6.4
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iv = 0; iv <= vSegs; iv++) {
      const v = iv / vSegs;
      const lz = -6.4 + v * 12.8;
      // Flare outward slightly at the portal mouth (lz > 3.2) and cavern throat (lz < -3.5)
      const mouthFlare = lz > 3.0 ? Math.pow((lz - 3.0) / 3.4, 1.5) * 1.35 : 0;
      const throatFlare = lz < -3.2 ? Math.pow((-3.2 - lz) / 3.2, 1.4) * 1.65 : 0;

      for (let iu = 0; iu <= uSegs; iu++) {
        const u = iu / uSegs;
        const theta = u * Math.PI; // 0 (right) to PI (left)
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // Natural horseshoe / gothic cavern arch profile
        const baseRx = 4.65 + mouthFlare + throatFlare + wallThicknessOffset;
        const baseRy = 5.45 + mouthFlare * 0.45 + throatFlare * 0.55 + wallThicknessOffset * 0.85;
        const archShape = Math.pow(sinT, 0.86);

        let x = -cosT * baseRx;
        let y = -0.35 + archShape * baseRy;
        let z = lz;

        // Keep floor anchoring clean near u=0 and u=1 while displacing rock walls & ceiling
        const pinFloor = Math.sin(theta);
        const crag = rockNoise3D(x * 0.9, y * 0.9, z * 0.9);
        const ribWave = Math.sin(z * 1.35 + Math.cos(theta * 3.0) * 0.6) * 0.28;
        const radialDisp = (crag * 0.46 + ribWave) * (0.25 + 0.75 * pinFloor);

        x += -cosT * radialDisp;
        y += sinT * radialDisp * 0.75;
        z += Math.sin(theta * 2.0 + lz * 0.5) * 0.18 * pinFloor;

        positions.push(x, y, z);
        uvs.push(u * 4.0, v * 4.0);
      }
    }

    const row = uSegs + 1;
    for (let iv = 0; iv < vSegs; iv++) {
      for (let iu = 0; iu < uSegs; iu++) {
        const a = iv * row + iu;
        const b = a + 1;
        const c = (iv + 1) * row + iu;
        const d = c + 1;
        if (inwardNormals) {
          indices.push(a, b, d, a, d, c);
        } else {
          indices.push(a, d, b, a, c, d);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  // 2) Continuous Vaulted Subterranean Cavern Dome (centered at lz = -15.0, rx = 11.8m, rz = 10.4m, height = 8.9m)
  //    Leaves an open arched throat on the +Z side (lz > -6.1, |x| < 4.8) where the tunnel connects seamlessly
  const buildSculptedCavernDomeGeo = (): THREE.BufferGeometry => {
    const azSegs = 56;
    const elSegs = 24;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const cavCenterZ = -15.0;
    const rx = 11.8;
    const rz = 10.4;
    const ry = 8.9;

    for (let ie = 0; ie <= elSegs; ie++) {
      const v = ie / elSegs;
      const phi = v * (Math.PI * 0.5); // 0 at floor perimeter -> PI/2 at dome apex
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      for (let ia = 0; ia <= azSegs; ia++) {
        const u = ia / azSegs;
        const ang = u * Math.PI * 2; // 0 is +Z (toward tunnel throat)
        const sinA = Math.sin(ang);
        const cosA = Math.cos(ang);

        // 3-lobed organic chamber contour (wider at side alcoves and rear den)
        const alcoveBulge = 1.0 + 0.12 * Math.cos(ang * 3.0 - Math.PI) * cosP;
        let x = sinA * rx * cosP * alcoveBulge;
        let y = -0.35 + Math.pow(sinP, 0.82) * ry;
        let z = cavCenterZ + cosA * rz * cosP * alcoveBulge;

        const crag = rockNoise3D(x * 0.72, y * 0.78, z * 0.72);
        const disp = crag * 0.68 * (0.2 + 0.8 * Math.sin(phi * 1.4));
        x += sinA * disp;
        y += sinP * disp * 0.65;
        z += cosA * disp;

        positions.push(x, y, z);
        uvs.push(u * 6.0, v * 3.0);
      }
    }

    const row = azSegs + 1;
    for (let ie = 0; ie < elSegs; ie++) {
      for (let ia = 0; ia < azSegs; ia++) {
        const a = ie * row + ia;
        const b = a + 1;
        const c = (ie + 1) * row + ia;
        const d = c + 1;

        // Check if triangle center lies inside the tunnel throat opening (+Z side, z > -6.3, |x| < 4.5, y < 5.3)
        const ax = positions[a * 3];
        const ay = positions[a * 3 + 1];
        const az = positions[a * 3 + 2];
        const dx = positions[d * 3];
        const dy = positions[d * 3 + 1];
        const dz = positions[d * 3 + 2];
        const mx = (ax + dx) * 0.5;
        const my = (ay + dy) * 0.5;
        const mz = (az + dz) * 0.5;

        if (mz > -6.8 && Math.abs(mx) < 4.55 && my < 5.35) {
          continue;
        }
        indices.push(a, b, d, a, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  // 3) Sculpted Craggy Rock Boulder & Cliff Buttress Geometry (high-detail displaced icosahedron)
  const buildCraggyRockGeo = (): THREE.BufferGeometry => {
    const geo = new THREE.IcosahedronGeometry(1.0, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const n =
        Math.sin(vx * 3.1 + vy * 2.7) * Math.cos(vz * 2.9 - vy * 1.8) * 0.16 +
        Math.cos(vx * 5.7 - vz * 4.9) * 0.07;
      // Slightly flatten bottom & step horizontal rock strata
      const strata = Math.sin(vy * 4.2) * 0.05;
      const scale = 1.0 + n + strata;
      pos.setXYZ(i, vx * scale, vy * (vy < 0 ? scale * 0.88 : scale), vz * scale);
    }
    geo.computeVertexNormals();
    return geo;
  };

  const caveTunnelInnerGeo = buildSculptedTunnelShellGeo(0.0, true);
  const caveTunnelOuterGeo = buildSculptedTunnelShellGeo(1.15, false);
  const caveCavernDomeGeo = buildSculptedCavernDomeGeo();
  const caveBoulderGeo = buildCraggyRockGeo();
  const caveTunnelFloorGeo = new THREE.BoxGeometry(11.6, 0.8, 14.2);
  const caveCavernFloorGeo = new THREE.CylinderGeometry(12.2, 12.6, 0.8, 28);
  const caveStalactiteGeo = new THREE.ConeGeometry(1.0, 1.0, 9);
  caveStalactiteGeo.rotateX(Math.PI);
  const caveStalagmiteGeo = new THREE.ConeGeometry(1.0, 1.0, 9);
  const caveNestGeo = new THREE.CylinderGeometry(2.7, 3.2, 0.24, 16);
  const caveLedgeGeo = new THREE.CylinderGeometry(3.4, 4.1, 0.55, 12);
  const caveBoneGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.82, 6);
  const caveCrystalGeo = new THREE.OctahedronGeometry(0.45, 0);

  const caveOuterRockMat = new THREE.MeshStandardMaterial({
    color: 0x5c564e,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.16,
    roughness: 0.93,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const caveInnerWallMat = new THREE.MeshStandardMaterial({
    color: 0x38322c,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.18,
    roughness: 0.95,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const caveDeepVaultMat = new THREE.MeshStandardMaterial({
    color: 0x2b2621,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.20,
    roughness: 0.96,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const caveFloorMat = new THREE.MeshStandardMaterial({
    color: 0x2a241e,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.10,
    roughness: 0.96,
  });
  const caveMossMat = new THREE.MeshStandardMaterial({
    color: 0x365327,
    roughness: 0.92,
  });
  const caveNestMat = new THREE.MeshStandardMaterial({
    color: 0x4f3d25,
    roughness: 0.95,
  });
  const caveBoneMat = new THREE.MeshStandardMaterial({
    color: 0xdcd3c0,
    roughness: 0.72,
  });
  const caveCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x67b7dc,
    emissive: 0x266485,
    emissiveIntensity: 0.85,
    roughness: 0.3,
  });

  disposableGeometries.push(
    caveTunnelInnerGeo,
    caveTunnelOuterGeo,
    caveCavernDomeGeo,
    caveBoulderGeo,
    caveTunnelFloorGeo,
    caveCavernFloorGeo,
    caveStalactiteGeo,
    caveStalagmiteGeo,
    caveNestGeo,
    caveLedgeGeo,
    caveBoneGeo,
    caveCrystalGeo
  );
  disposableMaterials.push(
    caveOuterRockMat,
    caveInnerWallMat,
    caveDeepVaultMat,
    caveFloorMat,
    caveMossMat,
    caveNestMat,
    caveBoneMat,
    caveCrystalMat
  );

  for (let cIdx = 0; cIdx < BEAR_MOUNTAIN_CAVES.length; cIdx++) {
    const cave = BEAR_MOUNTAIN_CAVES[cIdx];
    const caveGroup = new THREE.Group();
    caveGroup.position.set(cave.x, cave.floorY, cave.z);
    caveGroup.rotation.y = cave.facingYaw;

    // 1. Subterranean Rock Floor spanning the 12.8m entrance tunnel (lz: -6.4..+6.4)
    //    and the spacious 23m-wide interior cavern (lz: -25.4..-4.8)
    const tunnelFloor = new THREE.Mesh(caveTunnelFloorGeo, caveFloorMat);
    tunnelFloor.position.set(0, -0.36, 0.2);
    tunnelFloor.receiveShadow = !isSoftwareGl;
    caveGroup.add(tunnelFloor);

    const cavernFloor = new THREE.Mesh(caveCavernFloorGeo, caveFloorMat);
    cavernFloor.scale.set(1.02, 1.0, 0.96);
    cavernFloor.position.set(0, -0.38, -15.0);
    cavernFloor.receiveShadow = !isSoftwareGl;
    caveGroup.add(cavernFloor);

    // 2. Continuous Sculpted Subterranean Rock Tunnel (inner & outer rock shells)
    const tunnelInnerMesh = new THREE.Mesh(caveTunnelInnerGeo, caveInnerWallMat);
    tunnelInnerMesh.castShadow = !isSoftwareGl;
    tunnelInnerMesh.receiveShadow = !isSoftwareGl;
    caveGroup.add(tunnelInnerMesh);

    const tunnelOuterMesh = new THREE.Mesh(caveTunnelOuterGeo, caveOuterRockMat);
    tunnelOuterMesh.castShadow = !isSoftwareGl;
    tunnelOuterMesh.receiveShadow = !isSoftwareGl;
    caveGroup.add(tunnelOuterMesh);

    // 3. Continuous Vaulted Subterranean Cavern Dome
    const cavernDomeMesh = new THREE.Mesh(caveCavernDomeGeo, caveDeepVaultMat);
    cavernDomeMesh.castShadow = !isSoftwareGl;
    cavernDomeMesh.receiveShadow = !isSoftwareGl;
    caveGroup.add(cavernDomeMesh);

    // 4. Dramatic Craggy Mountain Cliff Facade & Overhanging Portal Hood (lz: +2.8 .. +7.4)
    //    Seamlessly embeds the tunnel mouth into the mountain cliff face with layered rock strata
    const cliffButtresses: ReadonlyArray<[number, number, number, number, number, number]> = [
      // Massive flanking cliff face slabs blending into the mountain slope
      [-7.4, 2.8, 5.2, 3.8, 3.8, 3.4],
      [-9.8, 4.2, 3.6, 4.6, 5.4, 4.2],
      [-6.2, 5.6, 4.4, 3.4, 3.2, 3.2],
      [7.4, 2.8, 5.2, 3.8, 3.8, 3.4],
      [9.8, 4.2, 3.6, 4.6, 5.4, 4.2],
      [6.2, 5.6, 4.4, 3.4, 3.2, 3.2],
      // Overhanging craggy rock brow & lintel ledges above the portal mouth (leaves y < 5.3m clear)
      [-3.8, 6.7, 5.4, 3.4, 1.85, 3.1],
      [0.0, 7.1, 5.6, 4.2, 1.95, 3.3],
      [3.8, 6.7, 5.4, 3.4, 1.85, 3.1],
      [-2.4, 9.2, 3.2, 5.2, 3.0, 4.2],
      [2.4, 9.2, 3.2, 5.2, 3.0, 4.2],
      [0.0, 11.4, 1.2, 6.8, 3.4, 4.8],
      // Natural talus / scree boulders flanking the forest approach apron
      [-6.6, 0.85, 7.8, 2.4, 1.35, 2.2],
      [6.8, 0.90, 7.6, 2.5, 1.40, 2.3],
      [-8.8, 1.35, 7.2, 2.9, 1.95, 2.6],
      [8.9, 1.40, 7.0, 3.0, 2.05, 2.6],
    ];
    for (let i = 0; i < cliffButtresses.length; i++) {
      const [bx, by, bz, sx, sy, sz] = cliffButtresses[i];
      const rock = new THREE.Mesh(caveBoulderGeo, caveOuterRockMat);
      rock.position.set(bx, by, bz);
      rock.scale.set(sx, sy, sz);
      rock.rotation.set(
        Math.sin(cIdx + i * 1.7) * 0.22,
        Math.cos(cIdx + i * 2.3) * 0.35,
        Math.sin(cIdx + i * 0.9) * 0.18
      );
      rock.castShadow = !isSoftwareGl;
      rock.receiveShadow = !isSoftwareGl;
      caveGroup.add(rock);
    }

    // Lush forest moss shelves on the outer portal talus & brow
    const mossPlacements: ReadonlyArray<[number, number, number, number, number, number]> = [
      [-6.4, 1.55, 7.5, 2.2, 0.36, 1.8],
      [6.6, 1.62, 7.3, 2.3, 0.36, 1.9],
      [-3.5, 7.75, 5.2, 2.6, 0.42, 2.0],
      [3.5, 7.75, 5.2, 2.6, 0.42, 2.0],
      [0.0, 8.25, 5.3, 3.1, 0.45, 2.1],
    ];
    for (let m = 0; m < mossPlacements.length; m++) {
      const [mx, my, mz, sx, sy, sz] = mossPlacements[m];
      const moss = new THREE.Mesh(caveBoulderGeo, caveMossMat);
      moss.position.set(mx, my, mz);
      moss.scale.set(sx, sy, sz);
      caveGroup.add(moss);
    }

    // 5. Interior Structural Rock Ribs & Throat Columns (framing transition from tunnel into grand cavern)
    for (const side of [-1, 1] as const) {
      const throatPillar = new THREE.Mesh(caveBoulderGeo, caveInnerWallMat);
      throatPillar.position.set(side * 5.3, 2.8, -5.8);
      throatPillar.scale.set(1.55, 3.8, 1.85);
      throatPillar.rotation.y = side * 0.35;
      throatPillar.castShadow = !isSoftwareGl;
      throatPillar.receiveShadow = !isSoftwareGl;
      caveGroup.add(throatPillar);
    }

    // 6. Hanging Stalactites & Rising Stalagmites inside the tunnel and cavern
    const stalactites: ReadonlyArray<[number, number, number, number, number]> = [
      [-2.1, 5.2, 2.4, 0.28, 1.25],
      [2.3, 5.1, 0.2, 0.32, 1.35],
      [-2.4, 5.2, -2.8, 0.30, 1.40],
      [-5.6, 7.6, -10.5, 0.48, 2.35],
      [5.8, 7.5, -11.2, 0.46, 2.15],
      [-3.0, 8.4, -14.4, 0.56, 2.75],
      [3.4, 8.4, -15.6, 0.58, 2.85],
      [0.2, 8.6, -17.8, 0.50, 2.50],
      [-6.2, 7.4, -18.4, 0.44, 2.10],
      [6.0, 7.4, -18.8, 0.46, 2.25],
      [-1.8, 7.9, -21.2, 0.42, 1.95],
      [2.1, 7.8, -21.5, 0.44, 2.05],
    ];
    for (let i = 0; i < stalactites.length; i++) {
      const [sx, sy, sz, sr, sh] = stalactites[i];
      const st = new THREE.Mesh(caveStalactiteGeo, caveInnerWallMat);
      st.position.set(sx, sy - sh * 0.5, sz);
      st.scale.set(sr, sh, sr);
      caveGroup.add(st);
    }

    const stalagmites: ReadonlyArray<[number, number, number, number]> = [
      [-8.8, -9.2, 0.55, 1.85],
      [8.8, -9.5, 0.60, 2.15],
      [-9.2, -18.8, 0.65, 2.35],
      [9.1, -19.0, 0.58, 1.95],
      [-4.2, -22.6, 0.52, 1.75],
      [4.4, -22.4, 0.56, 1.90],
    ];
    for (let i = 0; i < stalagmites.length; i++) {
      const [gx, gz, gr, gh] = stalagmites[i];
      const sg = new THREE.Mesh(caveStalagmiteGeo, caveInnerWallMat);
      sg.position.set(gx, gh * 0.5, gz);
      sg.scale.set(gr, gh, gr);
      sg.castShadow = !isSoftwareGl;
      sg.receiveShadow = !isSoftwareGl;
      caveGroup.add(sg);
    }

    // 7. Glowing Mineral Crystal Veins & Subtle Cavern Illumination
    for (const [cx, cy, cz, ry] of [
      [-8.2, 3.2, -11.5, 0.4],
      [8.2, 3.4, -12.4, -0.5],
      [-7.4, 3.6, -19.2, 0.8],
      [7.4, 3.5, -19.6, -0.7],
      [0.0, 4.2, -22.8, 0.0],
    ] as const) {
      for (let k = -1; k <= 1; k++) {
        const crystal = new THREE.Mesh(caveCrystalGeo, caveCrystalMat);
        crystal.scale.set(0.55 + Math.abs(k) * 0.15, 1.45 + (1 - Math.abs(k)) * 0.45, 0.55);
        crystal.position.set(cx + k * 0.38, cy + (1 - Math.abs(k)) * 0.22, cz + k * 0.25);
        crystal.rotation.set(k * 0.28, ry + k * 0.4, k * 0.22);
        caveGroup.add(crystal);
      }
    }

    if (!isSoftwareGl) {
      const cavernGlowLight = new THREE.PointLight(0x5fa8d3, 1.35, 26.0, 1.6);
      cavernGlowLight.position.set(0, 5.2, -15.0);
      caveGroup.add(cavernGlowLight);
    }

    // 8. Three Natural Bear Den Alcoves inside the Cavern (West Alcove, East Alcove, Rear Alpha Den)
    const alcoves: ReadonlyArray<[number, number]> = [
      [-6.2, -14.2], // West side alcove
      [6.2, -15.0],  // East side alcove
      [0.0, -19.5],  // Deep rear den
    ];
    for (let a = 0; a < alcoves.length; a++) {
      const [ax, az] = alcoves[a];
      const rockShelf = new THREE.Mesh(caveLedgeGeo, caveInnerWallMat);
      rockShelf.scale.set(1.15, 0.45, 0.92);
      rockShelf.position.set(ax, -0.12, az);
      rockShelf.receiveShadow = !isSoftwareGl;
      caveGroup.add(rockShelf);

      const nest = new THREE.Mesh(caveNestGeo, caveNestMat);
      nest.scale.set(1.12, 1.0, 0.88);
      nest.position.set(ax, 0.08, az);
      nest.receiveShadow = !isSoftwareGl;
      caveGroup.add(nest);

      for (let b = 0; b < 3; b++) {
        const ang = (b / 3) * Math.PI * 2 + a;
        const bone = new THREE.Mesh(caveBoneGeo, caveBoneMat);
        bone.position.set(ax + Math.cos(ang) * 2.1, 0.12, az + Math.sin(ang) * 1.9);
        bone.rotation.set(Math.PI * 0.47, ang * 1.3, 0.2);
        caveGroup.add(bone);
      }
    }

    scene.add(caveGroup);
    distanceCulledObjects.push({
      obj: caveGroup,
      cx: cave.x,
      cz: cave.z,
      radius: 54,
    });
  }

  // ============================================================================
  // GRAND SOUTHERN RIVER 3-ARCH STONE & TIMBER BRIDGE (גשר הקשתות הדרומי)
  // Spans East-West across the Southern River at (178, 378), x: 154..202
  // ============================================================================
  const grandBridgeGroup = new THREE.Group();
  const gbX = SOUTHERN_RIVER_BRIDGE_POS.x;
  const gbZ = SOUTHERN_RIVER_BRIDGE_POS.z;
  const gbSpan = SOUTHERN_RIVER_BRIDGE_POS.halfSpanX * 2; // 48m
  const gbWidth = SOUTHERN_RIVER_BRIDGE_POS.halfWidthZ * 2; // 6.2m

  const bridgeGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x8d887f,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.08,
    roughness: 0.78,
    metalness: 0.05,
  });
  const bridgeTrimStoneMat = new THREE.MeshStandardMaterial({
    color: 0xa8a196,
    map: textures.rockAlbedo,
    roughness: 0.7,
    metalness: 0.06,
  });
  disposableMaterials.push(bridgeGraniteMat, bridgeTrimStoneMat);

  // 1. Segmented Arched Stone Roadway Deck & Timber Runner Planks following southernRiverBridgeHeightAt(x)
  const deckSegments = 24;
  const segLen = gbSpan / deckSegments;
  const segDeckGeo = new THREE.BoxGeometry(segLen + 0.14, 0.48, gbWidth);
  const segPlankGeo = new THREE.BoxGeometry(segLen * 0.88, 0.09, gbWidth - 1.3);
  const parapetWallSegGeo = new THREE.BoxGeometry(segLen + 0.12, 0.92, 0.46);
  const parapetCapSegGeo = new THREE.BoxGeometry(segLen + 0.16, 0.18, 0.58);
  disposableGeometries.push(segDeckGeo, segPlankGeo, parapetWallSegGeo, parapetCapSegGeo);

  for (let i = 0; i < deckSegments; i++) {
    const x0 = SOUTHERN_RIVER_BRIDGE_POS.minX + i * segLen;
    const x1 = x0 + segLen;
    const xm = (x0 + x1) * 0.5;
    const y0 = southernRiverBridgeHeightAt(x0);
    const y1 = southernRiverBridgeHeightAt(x1);
    const ym = southernRiverBridgeHeightAt(xm);
    const slopeAngle = Math.atan2(y1 - y0, segLen);

    const deckSeg = new THREE.Mesh(segDeckGeo, bridgeGraniteMat);
    deckSeg.position.set(xm, ym - 0.24, gbZ);
    deckSeg.rotation.z = slopeAngle;
    deckSeg.castShadow = !isSoftwareGl;
    deckSeg.receiveShadow = !isSoftwareGl;
    grandBridgeGroup.add(deckSeg);

    const plankSeg = new THREE.Mesh(segPlankGeo, timberMat);
    plankSeg.position.set(xm, ym + 0.02, gbZ);
    plankSeg.rotation.z = slopeAngle;
    plankSeg.receiveShadow = !isSoftwareGl;
    grandBridgeGroup.add(plankSeg);

    // North & South Stone Parapet Guardrails (matching SOLID_BUILDING_BOXES at z = gbZ ± 2.95)
    for (const side of [-1, 1] as const) {
      const railZ = gbZ + side * 2.95;
      const wallSeg = new THREE.Mesh(parapetWallSegGeo, bridgeGraniteMat);
      wallSeg.position.set(xm, ym + 0.44, railZ);
      wallSeg.rotation.z = slopeAngle;
      wallSeg.castShadow = !isSoftwareGl;
      wallSeg.receiveShadow = !isSoftwareGl;
      grandBridgeGroup.add(wallSeg);

      const capSeg = new THREE.Mesh(parapetCapSegGeo, bridgeTrimStoneMat);
      capSeg.position.set(xm, ym + 0.95, railZ);
      capSeg.rotation.z = slopeAngle;
      capSeg.castShadow = !isSoftwareGl;
      grandBridgeGroup.add(capSeg);
    }
  }

  // 2. Four Massive Cut-Stone River Piers with Cutwater Prows & 3 Vaulted Stone Under-Arches
  const pierPositionsX = [160.0, 172.0, 184.0, 196.0];
  const pierBodyGeo = new THREE.BoxGeometry(2.8, 7.2, gbWidth + 1.2);
  const pierCutwaterGeo = new THREE.CylinderGeometry(1.35, 1.65, 6.8, 6);
  const archRibGeo = new THREE.TorusGeometry(5.2, 0.55, 8, 20, Math.PI);
  const lanternPostGeo = new THREE.CylinderGeometry(0.11, 0.14, 2.35, 8);
  const lanternHousingGeo = new THREE.BoxGeometry(0.42, 0.52, 0.42);
  const gatePillarGeo = new THREE.BoxGeometry(1.35, 3.4, 1.35);
  const gatePillarCapGeo = new THREE.ConeGeometry(1.05, 0.85, 4);
  gatePillarCapGeo.rotateY(Math.PI / 4);
  disposableGeometries.push(
    pierBodyGeo,
    pierCutwaterGeo,
    archRibGeo,
    lanternPostGeo,
    lanternHousingGeo,
    gatePillarGeo,
    gatePillarCapGeo
  );

  for (let p = 0; p < pierPositionsX.length; p++) {
    const px = pierPositionsX[p];
    const pyTop = southernRiverBridgeHeightAt(px);
    const pierMesh = new THREE.Mesh(pierBodyGeo, bridgeGraniteMat);
    pierMesh.position.set(px, pyTop - 3.7, gbZ);
    pierMesh.castShadow = !isSoftwareGl;
    pierMesh.receiveShadow = !isSoftwareGl;
    grandBridgeGroup.add(pierMesh);

    for (const side of [-1, 1] as const) {
      const cutwater = new THREE.Mesh(pierCutwaterGeo, bridgeTrimStoneMat);
      cutwater.position.set(px, pyTop - 3.8, gbZ + side * (gbWidth * 0.5 + 0.55));
      grandBridgeGroup.add(cutwater);

      // Ornate iron & warm amber lanterns atop each pier bastion
      const lPost = new THREE.Mesh(lanternPostGeo, darkIronMat);
      lPost.position.set(px, pyTop + 2.1, gbZ + side * 2.95);
      grandBridgeGroup.add(lPost);

      const lGlow = new THREE.Mesh(lanternHousingGeo, warmLanternMat);
      lGlow.position.set(px, pyTop + 3.35, gbZ + side * 2.95);
      grandBridgeGroup.add(lGlow);
    }
  }

  // Three vaulted stone arches spanning between the piers
  const archCentersX = [166.0, 178.0, 190.0];
  for (let a = 0; a < archCentersX.length; a++) {
    const ax = archCentersX[a];
    const ayTop = southernRiverBridgeHeightAt(ax);
    for (const side of [-1, 1] as const) {
      const archRib = new THREE.Mesh(archRibGeo, bridgeTrimStoneMat);
      archRib.position.set(ax, ayTop - 4.7, gbZ + side * (gbWidth * 0.5 - 0.35));
      archRib.scale.set(1.08, 0.78, 1.0);
      grandBridgeGroup.add(archRib);
    }
  }

  // Twin Stone Entrance Gate Pillars at the West (x=154.5) and East (x=201.5) bridgeheads
  for (const endX of [SOUTHERN_RIVER_BRIDGE_POS.minX + 0.5, SOUTHERN_RIVER_BRIDGE_POS.maxX - 0.5]) {
    const endY = southernRiverBridgeHeightAt(endX);
    for (const side of [-1, 1] as const) {
      const pillar = new THREE.Mesh(gatePillarGeo, bridgeTrimStoneMat);
      pillar.position.set(endX, endY + 1.5, gbZ + side * 3.05);
      pillar.castShadow = !isSoftwareGl;
      grandBridgeGroup.add(pillar);

      const cap = new THREE.Mesh(gatePillarCapGeo, rockMat);
      cap.position.set(endX, endY + 3.55, gbZ + side * 3.05);
      grandBridgeGroup.add(cap);
    }
  }

  scene.add(grandBridgeGroup);
  distanceCulledObjects.push({
    obj: grandBridgeGroup,
    cx: gbX,
    cz: gbZ,
    radius: 56,
  });

  // ============================================================================
  // CROCODILE RIVER BEND SCENERY (Basking Driftwood Logs & Riverbank Reeds at (132, 475))
  // ============================================================================
  const crocBendGroup = new THREE.Group();
  const driftLogGeo = new THREE.CylinderGeometry(0.32, 0.42, 6.2, 9);
  driftLogGeo.rotateZ(Math.PI / 2);
  disposableGeometries.push(driftLogGeo);

  const crocBaskingLogs: ReadonlyArray<[number, number, number]> = [
    [120.5, 465.2, 0.42],
    [143.2, 482.5, -0.58],
    [126.0, 487.5, 1.15],
  ];
  for (let l = 0; l < crocBaskingLogs.length; l++) {
    const [lx, lz, lyaw] = crocBaskingLogs[l];
    const ly = groundHeightAt(lx, lz);
    const logMesh = new THREE.Mesh(driftLogGeo, barkMat);
    logMesh.position.set(lx, ly + 0.22, lz);
    logMesh.rotation.set(0.06, lyaw, -0.04);
    logMesh.castShadow = !isSoftwareGl;
    logMesh.receiveShadow = !isSoftwareGl;
    crocBendGroup.add(logMesh);
  }
  scene.add(crocBendGroup);
  distanceCulledObjects.push({
    obj: crocBendGroup,
    cx: CROCODILE_RIVER_BEND_POS.x,
    cz: CROCODILE_RIVER_BEND_POS.z,
    radius: 44,
  });

  // ============================================================================
  // 5 ARTICULATED RIDEABLE HORSES (RIDEABLE_HORSES across Stables & Landmarks)
  // ============================================================================
  interface IEquineLimbRig {
    readonly upper: THREE.Group;
    readonly lower: THREE.Group;
    readonly hoof: THREE.Group;
  }
  interface IHorseMeshRig {
    readonly id: string;
    readonly root: THREE.Group;
    readonly bodyPivot: THREE.Group;
    readonly neckPivot: THREE.Group;
    readonly headPivot: THREE.Group;
    readonly tailPivot: THREE.Group;
    readonly fl: IEquineLimbRig;
    readonly fr: IEquineLimbRig;
    readonly bl: IEquineLimbRig;
    readonly br: IEquineLimbRig;
  }

  const horseTorsoGeo = new THREE.CylinderGeometry(0.36, 0.38, 1.32, 14);
  horseTorsoGeo.rotateX(Math.PI / 2);
  const horseChestGeo = new THREE.SphereGeometry(0.38, 14, 12);
  const horseRumpGeo = new THREE.SphereGeometry(0.37, 14, 12);
  const horseSaddleGeo = new THREE.BoxGeometry(0.82, 0.28, 0.68);
  const horsePommelGeo = new THREE.BoxGeometry(0.32, 0.16, 0.14);
  const horseCantleGeo = new THREE.BoxGeometry(0.36, 0.14, 0.16);
  const horseStirrupStrapGeo = new THREE.BoxGeometry(0.03, 0.44, 0.05);
  const horseStirrupIronGeo = new THREE.TorusGeometry(0.06, 0.014, 6, 12);
  const horseNeckGeo = new THREE.CylinderGeometry(0.18, 0.28, 0.78, 12);
  const horseManeGeo = new THREE.BoxGeometry(0.08, 0.72, 0.18);
  const horseSkullGeo = new THREE.BoxGeometry(0.26, 0.26, 0.38);
  const horseMuzzleGeo = new THREE.BoxGeometry(0.19, 0.18, 0.36);
  const horseBridleGeo = new THREE.BoxGeometry(0.21, 0.20, 0.06);
  const horseReinGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.74, 6);
  horseReinGeo.rotateX(Math.PI / 2);
  const horseEyeGeo = new THREE.SphereGeometry(0.026, 8, 8);
  const horseEarGeo = new THREE.ConeGeometry(0.048, 0.16, 6);
  const horseTailGeo = new THREE.ConeGeometry(0.12, 0.78, 8);
  const horseULimbGeo = new THREE.CylinderGeometry(0.105, 0.078, 0.56, 10);
  horseULimbGeo.translate(0, -0.28, 0);
  const horseLLimbGeo = new THREE.CylinderGeometry(0.072, 0.056, 0.48, 10);
  horseLLimbGeo.translate(0, -0.24, 0);
  const horseHoofGeo = new THREE.CylinderGeometry(0.068, 0.082, 0.14, 10);
  horseHoofGeo.translate(0, -0.07, 0.01);

  const horseHoofMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.45 });
  const horseGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.85,
  });
  const horseEyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  disposableGeometries.push(
    horseTorsoGeo,
    horseChestGeo,
    horseRumpGeo,
    horseSaddleGeo,
    horsePommelGeo,
    horseCantleGeo,
    horseStirrupStrapGeo,
    horseStirrupIronGeo,
    horseNeckGeo,
    horseManeGeo,
    horseSkullGeo,
    horseMuzzleGeo,
    horseBridleGeo,
    horseReinGeo,
    horseEyeGeo,
    horseEarGeo,
    horseTailGeo,
    horseULimbGeo,
    horseLLimbGeo,
    horseHoofGeo
  );
  disposableMaterials.push(horseHoofMat, horseGoldMat, horseEyeMat);

  const horseRigs: IHorseMeshRig[] = [];

  for (let i = 0; i < RIDEABLE_HORSES.length; i++) {
    const def = RIDEABLE_HORSES[i];
    const coatMat = new THREE.MeshStandardMaterial({ color: def.coatColorHex, roughness: 0.62 });
    const maneMat = new THREE.MeshStandardMaterial({ color: def.maneColorHex, roughness: 0.78 });
    const saddleMat = new THREE.MeshStandardMaterial({ color: def.saddleColorHex, roughness: 0.5 });
    disposableMaterials.push(coatMat, maneMat, saddleMat);

    const root = new THREE.Group();
    root.rotation.order = 'YXZ';
    const initY = walkableHeightAt(def.homeX, def.homeZ).height;
    root.position.set(def.homeX, initY, def.homeZ);
    root.rotation.y = def.homeYaw;

    // Facing pivot rotates +Z local horse model to face -Z (matching horseFwdX = -sin(yaw), horseFwdZ = -cos(yaw))
    const facingPivot = new THREE.Group();
    facingPivot.rotation.y = Math.PI;
    root.add(facingPivot);

    const bodyPivot = new THREE.Group();
    bodyPivot.position.set(0, 1.18, 0);
    facingPivot.add(bodyPivot);

    const torso = new THREE.Mesh(horseTorsoGeo, coatMat);
    const chestSphere = new THREE.Mesh(horseChestGeo, coatMat);
    chestSphere.position.set(0, 0.02, 0.56);
    const rumpSphere = new THREE.Mesh(horseRumpGeo, coatMat);
    rumpSphere.position.set(0, 0.04, -0.56);

    const saddleBlanket = new THREE.Mesh(horseSaddleGeo, saddleMat);
    saddleBlanket.position.set(0, 0.28, 0.05);
    const pommel = new THREE.Mesh(horsePommelGeo, horseGoldMat);
    pommel.position.set(0, 0.44, 0.3);
    const cantle = new THREE.Mesh(horseCantleGeo, saddleMat);
    cantle.position.set(0, 0.43, -0.2);

    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(horseStirrupStrapGeo, saddleMat);
      strap.position.set(side * 0.39, -0.02, 0.06);
      const iron = new THREE.Mesh(horseStirrupIronGeo, horseGoldMat);
      iron.position.set(side * 0.4, -0.25, 0.06);
      iron.rotation.y = Math.PI / 2;
      bodyPivot.add(strap, iron);
    }

    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.24, 0.68);
    neckPivot.rotation.x = 0.32;
    const neckMesh = new THREE.Mesh(horseNeckGeo, coatMat);
    neckMesh.position.set(0, 0.32, 0.12);
    const maneMesh = new THREE.Mesh(horseManeGeo, maneMat);
    maneMesh.position.set(0, 0.34, 0.0);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.68, 0.22);
    headPivot.rotation.x = -0.16;
    const skull = new THREE.Mesh(horseSkullGeo, coatMat);
    const muzzle = new THREE.Mesh(horseMuzzleGeo, coatMat);
    muzzle.position.set(0, -0.05, 0.28);
    const bridle = new THREE.Mesh(horseBridleGeo, horseGoldMat);
    bridle.position.set(0, -0.04, 0.22);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(horseEyeGeo, horseEyeMat);
      eye.position.set(side * 0.13, 0.05, 0.08);
      const ear = new THREE.Mesh(horseEarGeo, coatMat);
      ear.position.set(side * 0.09, 0.18, -0.04);
      const rein = new THREE.Mesh(horseReinGeo, saddleMat);
      rein.position.set(side * 0.11, -0.14, -0.18);
      rein.rotation.x = 0.36;
      headPivot.add(eye, ear, rein);
    }

    headPivot.add(skull, muzzle, bridle);
    neckPivot.add(neckMesh, maneMesh, headPivot);

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.14, -0.84);
    const tailMesh = new THREE.Mesh(horseTailGeo, maneMat);
    tailMesh.rotation.x = Math.PI - 0.25;
    tailMesh.position.set(0, -0.34, -0.1);
    tailPivot.add(tailMesh);

    const buildEquineLeg = (lx: number, lz: number): IEquineLimbRig => {
      const upper = new THREE.Group();
      upper.position.set(lx, -0.08, lz);
      upper.add(new THREE.Mesh(horseULimbGeo, coatMat));
      const lower = new THREE.Group();
      lower.position.set(0, -0.54, 0);
      lower.add(new THREE.Mesh(horseLLimbGeo, coatMat));
      const hoof = new THREE.Group();
      hoof.position.set(0, -0.46, 0);
      hoof.add(new THREE.Mesh(horseHoofGeo, horseHoofMat));
      lower.add(hoof);
      upper.add(lower);
      bodyPivot.add(upper);
      return { upper, lower, hoof };
    };

    const fl = buildEquineLeg(-0.22, 0.54);
    const fr = buildEquineLeg(0.22, 0.54);
    const bl = buildEquineLeg(-0.22, -0.54);
    const br = buildEquineLeg(0.22, -0.54);

    bodyPivot.add(
      torso,
      chestSphere,
      rumpSphere,
      saddleBlanket,
      pommel,
      cantle,
      neckPivot,
      tailPivot
    );

    if (!isSoftwareGl) {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
    }

    scene.add(root);
    horseRigs.push({
      id: def.id,
      root,
      bodyPivot,
      neckPivot,
      headPivot,
      tailPivot,
      fl,
      fr,
      bl,
      br,
    });
  }

  const updateSettlement = (
    elapsedTime: number,
    rideableHorses?: readonly IRideableHorseState[],
    mountedHorseId?: string | null,
    playerX = 0,
    playerZ = 0
  ) => {
    rowboatGroup.position.y = WATER_LEVEL + 0.05 + Math.sin(elapsedTime * 1.8) * 0.04;
    rowboatGroup.rotation.z = Math.sin(elapsedTime * 1.4) * 0.03;
    for (let r = 0; r < windmillRotors.length; r++) {
      windmillRotors[r].rotation.z = elapsedTime * 0.75;
    }
    waterfallMat.userData.uTime.value = elapsedTime;
    const foamPulse = 1.0 + Math.sin(elapsedTime * 3.4) * 0.08;
    poolFoam.scale.set(foamPulse, foamPulse, 1.0);
    poolFoam.rotation.z = elapsedTime * 0.25;
    const outerPulse = 1.0 + Math.cos(elapsedTime * 2.6) * 0.1;
    poolFoamOuter.scale.set(outerPulse, outerPulse, 1.0);
    poolFoamOuter.rotation.z = -elapsedTime * 0.18;
    for (let m = 0; m < waterfallMistMeshes.length; m++) {
      const mist = waterfallMistMeshes[m];
      const bob = Math.sin(elapsedTime * 2.2 + m * 1.3);
      mist.position.y = 1.2 + bob * 0.24;
      mist.scale.set(1.35 + bob * 0.12, 0.78 + Math.abs(bob) * 0.1, 1.15 + bob * 0.12);
    }

    if (westPierGroup.visible) {
      for (let k = 0; k < swimmingKoiList.length; k++) {
        const koi = swimmingKoiList[k];
        const ang = elapsedTime * koi.speed + koi.phase;
        const kx = koi.orbitCenterX + Math.cos(ang) * koi.orbitRadius;
        const kz = koi.orbitCenterZ + Math.sin(ang) * koi.orbitRadius;
        koi.mesh.position.set(kx, WATER_LEVEL - 0.22 + Math.sin(elapsedTime * 2.2 + koi.phase) * 0.04, kz);
        koi.mesh.rotation.y = -ang + Math.PI / 2;
        (koi.mesh.children[1] as THREE.Mesh).rotation.y = Math.sin(elapsedTime * 6.5 + koi.phase) * 0.35;
      }
    }

    // Update 5 Rideable Horses (Position, Yaw, Terrain Slope Alignment, and Biomechanical Gait Pose)
    for (let i = 0; i < horseRigs.length; i++) {
      const rig = horseRigs[i];
      const state = rideableHorses && rideableHorses[i] ? rideableHorses[i] : null;
      const hx = state ? state.x : RIDEABLE_HORSES[i].homeX;
      const hz = state ? state.z : RIDEABLE_HORSES[i].homeZ;
      const walkSurf = walkableHeightAt(hx, hz);
      const hy = state ? state.y : walkSurf.height;
      const hyaw = state ? state.yaw : RIDEABLE_HORSES[i].homeYaw;
      const hspeed = state ? state.speed : 0;
      const hgait = state ? state.gaitPhase : 0;

      const isMounted = mountedHorseId === rig.id;
      const inView = isMounted || isWithinViewDistance(hx, hz, playerX, playerZ, 24);
      rig.root.visible = inView;
      if (!inView) continue;

      rig.root.position.set(hx, hy, hz);
      rig.root.rotation.y = hyaw;

      // Align horse pitch & roll to mountain/hill slope when on ground
      const onGround = !state || !state.isJumping;
      if (onGround && walkSurf.surface === 'ground') {
        const n = getSurfaceNormalAt(hx, hz);
        const slope = computeSlopePitchAndRoll(n.nx, n.ny, n.nz, hyaw, 0.45);
        rig.root.rotation.x += (slope.pitch - rig.root.rotation.x) * 0.25;
        rig.root.rotation.z += (slope.roll - rig.root.rotation.z) * 0.25;
      } else {
        rig.root.rotation.x *= 0.8;
        rig.root.rotation.z *= 0.8;
      }

      const pose = computeHorseBiomechanicalPose(hspeed, hgait, elapsedTime, i);
      rig.bodyPivot.position.y = 1.18 + pose.bodyLiftY;
      rig.bodyPivot.rotation.x = pose.bodyPitch;
      rig.neckPivot.rotation.x = pose.neckPitch;
      rig.headPivot.rotation.x = pose.headPitch;
      rig.tailPivot.rotation.x = pose.tailPitch;
      rig.tailPivot.rotation.y = pose.tailSwayY;

      rig.fl.upper.rotation.x = pose.frontLeft.upperPitch;
      rig.fl.lower.rotation.x = pose.frontLeft.lowerPitch;
      rig.fl.hoof.rotation.x = pose.frontLeft.hoofPitch;

      rig.fr.upper.rotation.x = pose.frontRight.upperPitch;
      rig.fr.lower.rotation.x = pose.frontRight.lowerPitch;
      rig.fr.hoof.rotation.x = pose.frontRight.hoofPitch;

      rig.bl.upper.rotation.x = pose.backLeft.upperPitch;
      rig.bl.lower.rotation.x = pose.backLeft.lowerPitch;
      rig.bl.hoof.rotation.x = pose.backLeft.hoofPitch;

      rig.br.upper.rotation.x = pose.backRight.upperPitch;
      rig.br.lower.rotation.x = pose.backRight.lowerPitch;
      rig.br.hoof.rotation.x = pose.backRight.hoofPitch;
    }
  };

  return { rowboatGroup, updateSettlement };
}
// #endregion
