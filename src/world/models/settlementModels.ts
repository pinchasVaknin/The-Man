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
  groundHeightAt,
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
  readonly updateSettlement: (elapsedTime: number) => void;
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
    color: 0xdcf4ff,
    transparent: true,
    opacity: 0.86,
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
        transformed.z += sin(uv.y * 18.0 + uTime * 9.0 + uv.x * 6.0) * 0.14;
        `
      );
    shader.fragmentShader =
      `uniform float uTime;\nvarying vec2 vWfUv;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        float streak = sin(vWfUv.x * 24.0) * 0.5 + 0.5;
        float flow = sin(vWfUv.y * 28.0 + uTime * 12.0 + streak * 3.0) * 0.5 + 0.5;
        diffuseColor.rgb = mix(vec3(0.55, 0.84, 0.96), vec3(0.98, 0.99, 1.0), flow * 0.65 + 0.25);
        `
      );
  };
  const foamRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.62,
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
  const beamGeo = new THREE.BoxGeometry(11.0, 0.14, 0.16);
  const pilingGeo = new THREE.CylinderGeometry(0.13, 0.15, 2.6, 8);
  disposableGeometries.push(plankGeo, beamGeo, pilingGeo);

  for (let p = -5.2; p <= 5.2; p += 0.42) {
    const plank = new THREE.Mesh(plankGeo, timberMat);
    plank.position.set(p, 0.51, 0);
    plank.castShadow = !isSoftwareGl;
    plank.receiveShadow = !isSoftwareGl;
    pierGroup.add(plank);
  }
  for (const zSide of [-1.05, 1.05]) {
    const beam = new THREE.Mesh(beamGeo, timberMat);
    beam.position.set(0, 0.42, zSide);
    pierGroup.add(beam);
  }
  for (let px = -5.0; px <= 5.0; px += 2.5) {
    for (const pz of [-1.05, 1.05]) {
      const piling = new THREE.Mesh(pilingGeo, barkMat);
      piling.position.set(px, -0.35, pz);
      piling.castShadow = !isSoftwareGl;
      pierGroup.add(piling);
    }
  }
  pierGroup.add(createLanternAssembly(4.9, 0.55, 1.05, true));
  scene.add(pierGroup);
  distanceCulledObjects.push({ obj: pierGroup, cx: -11.5, cz: 15.5, radius: 15 });

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
  for (let p = -6.0; p <= 6.0; p += 0.45) {
    const plank = new THREE.Mesh(plankGeo, timberMat);
    plank.position.set(p, 0.51, 0);
    westPierGroup.add(plank);
  }
  for (let px = -5.5; px <= 5.5; px += 2.75) {
    for (const pz of [-1.05, 1.05]) {
      const piling = new THREE.Mesh(pilingGeo, barkMat);
      piling.position.set(px, -0.35, pz);
      westPierGroup.add(piling);
    }
  }

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

  const segGeo = new THREE.BoxGeometry(3.2, 0.28, 1.05);
  const postStoneGeo = new THREE.BoxGeometry(0.32, 0.85, 0.32);
  const railStoneGeo = new THREE.BoxGeometry(0.22, 0.18, 1.15);
  disposableGeometries.push(segGeo, postStoneGeo, railStoneGeo);

  for (let i = -7; i <= 7; i++) {
    const zLocal = i * 0.96;
    const normZ = zLocal / 7.2;
    const archY = 0.52 + (1.0 - normZ * normZ) * 1.45;
    const slopeAngle = Math.atan((2 * normZ * 1.45) / 7.2);

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
  bridgeGroup.add(createLanternAssembly(1.42, 2.02, 0, true));
  scene.add(bridgeGroup);
  distanceCulledObjects.push({ obj: bridgeGroup, cx: 18.0, cz: 2.0, radius: 18 });

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

  // --- E. NORTHEASTERN RIVER TIMBER BRIDGE at (78.0, -42.0) ---
  const riverBridgeGroup = new THREE.Group();
  riverBridgeGroup.position.set(78.0, 0, -42.0);
  riverBridgeGroup.rotation.y = -0.52;

  for (let i = -7; i <= 7; i++) {
    const zLocal = i * 1.02;
    const norm = zLocal / 7.5;
    const deckY = 0.85 + (1.0 - norm * norm) * 0.95;
    const slopeAngle = Math.atan((2 * norm * 0.95) / 7.5);

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
  }
  riverBridgeGroup.add(createLanternAssembly(1.45, 1.82, 0, true));
  scene.add(riverBridgeGroup);
  distanceCulledObjects.push({ obj: riverBridgeGroup, cx: 78.0, cz: -42.0, radius: 18 });

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

  // Grand Waterfall
  const waterfallGroup = new THREE.Group();
  waterfallGroup.position.set(WATERFALL_POOL_POS.x, 0, WATERFALL_POOL_POS.z);
  waterfallGroup.rotation.y = Math.atan2(
    WATERFALL_POOL_POS.x - WATERFALL_CLIFF_POS.x,
    WATERFALL_POOL_POS.z - WATERFALL_CLIFF_POS.z
  );

  const cascadeSheetGeo = new THREE.PlaneGeometry(5.2, 16.5, 12, 28);
  const caveWaterTongueGeo = new THREE.PlaneGeometry(4.8, 4.5, 8, 8);
  caveWaterTongueGeo.rotateX(-Math.PI / 2);
  const foamRingGeo = new THREE.RingGeometry(1.5, 4.0, 24);
  foamRingGeo.rotateX(-Math.PI / 2);
  const caveInteriorGeo = new THREE.BoxGeometry(6.4, 5.2, 5.6);
  const caveArchTopGeo = new THREE.DodecahedronGeometry(1.8, 0);
  disposableGeometries.push(
    cascadeSheetGeo,
    caveWaterTongueGeo,
    foamRingGeo,
    caveInteriorGeo,
    caveArchTopGeo
  );

  const caveChamberMesh = new THREE.Mesh(caveInteriorGeo, caveDarkMat);
  caveChamberMesh.position.set(0, 14.4, -13.0);
  waterfallGroup.add(caveChamberMesh);

  const caveWaterTongue = new THREE.Mesh(caveWaterTongueGeo, waterfallMat);
  caveWaterTongue.position.set(0, 14.3, -11.2);
  caveWaterTongue.rotation.x = 0.12;
  waterfallGroup.add(caveWaterTongue);

  const waterfallMesh = new THREE.Mesh(cascadeSheetGeo, waterfallMat);
  waterfallMesh.position.set(0, 6.8, -5.2);
  waterfallMesh.rotation.x = 0.48;
  waterfallGroup.add(waterfallMesh);

  const poolFoam = new THREE.Mesh(foamRingGeo, foamRingMat);
  poolFoam.position.set(0, 0.14, 0);
  waterfallGroup.add(poolFoam);

  scene.add(waterfallGroup);
  distanceCulledObjects.push({
    obj: waterfallGroup,
    cx: WATERFALL_POOL_POS.x,
    cz: WATERFALL_POOL_POS.z,
    radius: 35,
  });

  const updateSettlement = (elapsedTime: number) => {
    rowboatGroup.position.y = WATER_LEVEL + 0.05 + Math.sin(elapsedTime * 1.8) * 0.04;
    rowboatGroup.rotation.z = Math.sin(elapsedTime * 1.4) * 0.03;
    for (let r = 0; r < windmillRotors.length; r++) {
      windmillRotors[r].rotation.z = elapsedTime * 0.75;
    }
    waterfallMat.userData.uTime.value = elapsedTime;

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
  };

  return { rowboatGroup, updateSettlement };
}
// #endregion
