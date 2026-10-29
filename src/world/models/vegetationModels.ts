// ============================================================================
// MODULE: World / Models / Vegetation Models
// DESIGN: Procedural instanced flora, trees, boulders, and wind-swayed meadow grass (SRP)
// SUMMARY: Generates instanced geometry for forest pines, mature oaks, silver birches,
//          desert palms, savanna acacias, mossy boulders, waterside reeds, and grasses.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  WATER_LEVEL,
  SOUTHERN_MINE_POS,
  groundHeightAt,
  trailFactorAt,
  hash2D,
} from '../terrainMath';
import {
  attachWindSwayShader,
  createBirchBarkTexture,
  perturbGeometryVertices,
} from '../builders/shaderAndMaterialBuilders';
import type { WorldModelBuildContext } from './types';
// #endregion

// ======================== BUILD VEGETATION MODELS ======================== \\
// #region Build Vegetation Models
/**
 * Constructs instanced forest trees, boulders, palms, acacias, and swaying ground grass.
 */
export function buildVegetationModels(ctx: WorldModelBuildContext): void {
  const {
    scene,
    textures,
    obstacles,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    swayMaterials,
  } = ctx;

  const pines = obstacles.filter((o) => o.kind === 'pine');
  const oaks = obstacles.filter((o) => o.kind === 'oak');
  const birches = obstacles.filter((o) => o.kind === 'birch');
  const palms = obstacles.filter((o) => o.kind === 'palm');
  const acacias = obstacles.filter((o) => o.kind === 'acacia');
  const boulders = obstacles.filter((o) => o.kind === 'boulder');

  const birchBarkTex = ctx.birchBarkTexture ?? createBirchBarkTexture();

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.barkAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.07,
    roughness: 0.88,
    metalness: 0.03,
  });
  const birchBarkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: birchBarkTex,
    bumpMap: textures.barkBump,
    bumpScale: 0.04,
    roughness: 0.78,
    metalness: 0.02,
  });
  const pineNeedleMat1 = new THREE.MeshStandardMaterial({
    color: 0x295423,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.58,
    metalness: 0.02,
  });
  const pineNeedleMat2 = new THREE.MeshStandardMaterial({
    color: 0x33662b,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.48,
    metalness: 0.02,
  });
  const oakLeafMat1 = new THREE.MeshStandardMaterial({
    color: 0x3d6b28,
    bumpMap: textures.foliageBump,
    bumpScale: 0.06,
    roughness: 0.62,
    metalness: 0.02,
  });
  const oakLeafMat2 = new THREE.MeshStandardMaterial({
    color: 0x4f7f33,
    bumpMap: textures.foliageBump,
    bumpScale: 0.06,
    roughness: 0.46,
    metalness: 0.02,
  });
  const birchLeafMat1 = new THREE.MeshStandardMaterial({
    color: 0xd98a2b,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.54,
    metalness: 0.02,
  });
  const birchLeafMat2 = new THREE.MeshStandardMaterial({
    color: 0xe8a838,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.48,
    metalness: 0.02,
  });

  attachWindSwayShader(pineNeedleMat1, 0.011, 1.35, swayMaterials);
  attachWindSwayShader(pineNeedleMat2, 0.014, 1.45, swayMaterials);
  attachWindSwayShader(oakLeafMat1, 0.012, 1.2, swayMaterials);
  attachWindSwayShader(oakLeafMat2, 0.015, 1.3, swayMaterials);
  attachWindSwayShader(birchLeafMat1, 0.014, 1.4, swayMaterials);
  attachWindSwayShader(birchLeafMat2, 0.017, 1.5, swayMaterials);

  disposableMaterials.push(
    barkMat,
    birchBarkMat,
    pineNeedleMat1,
    pineNeedleMat2,
    oakLeafMat1,
    oakLeafMat2,
    birchLeafMat1,
    birchLeafMat2
  );

  // Broad canopy shade disc on the forest floor beneath every tall tree
  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  disposableMaterials.push(contactShadowMat);

  const shadowDiscGeo = new THREE.PlaneGeometry(5.8, 5.8);
  shadowDiscGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(shadowDiscGeo);

  // --- A. TALL FOREST PINE GEOMETRIES ---
  const pineRootGeo = new THREE.CylinderGeometry(0.32, 0.54, 1.4, 8);
  pineRootGeo.translate(0, 0.7, 0);
  const pineTrunkGeo = new THREE.CylinderGeometry(0.12, 0.34, 11.6, 9);
  pineTrunkGeo.translate(0, 6.8, 0);
  const pineTier1Geo = new THREE.ConeGeometry(2.85, 3.2, 9);
  perturbGeometryVertices(pineTier1Geo, 0.14, 1.5);
  pineTier1Geo.translate(0, 7.6, 0);
  const pineTier2Geo = new THREE.ConeGeometry(2.35, 3.0, 9);
  perturbGeometryVertices(pineTier2Geo, 0.14, 1.8);
  pineTier2Geo.translate(0, 9.7, 0);
  const pineTier3Geo = new THREE.ConeGeometry(1.75, 2.7, 8);
  perturbGeometryVertices(pineTier3Geo, 0.12, 2.1);
  pineTier3Geo.translate(0, 11.7, 0);
  const pineCrownGeo = new THREE.ConeGeometry(1.15, 2.4, 8);
  perturbGeometryVertices(pineCrownGeo, 0.1, 2.4);
  pineCrownGeo.translate(0, 13.6, 0);

  disposableGeometries.push(
    pineRootGeo,
    pineTrunkGeo,
    pineTier1Geo,
    pineTier2Geo,
    pineTier3Geo,
    pineCrownGeo
  );

  const maxPineInstances = Math.max(1, pines.length);
  const mRoot = new THREE.InstancedMesh(pineRootGeo, barkMat, maxPineInstances);
  const mTrunk = new THREE.InstancedMesh(pineTrunkGeo, barkMat, maxPineInstances);
  const mTier1 = new THREE.InstancedMesh(pineTier1Geo, pineNeedleMat1, maxPineInstances);
  const mTier2 = new THREE.InstancedMesh(pineTier2Geo, pineNeedleMat2, maxPineInstances);
  const mTier3 = new THREE.InstancedMesh(pineTier3Geo, pineNeedleMat1, maxPineInstances);
  const mCrown = new THREE.InstancedMesh(pineCrownGeo, pineNeedleMat2, maxPineInstances);
  const mShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxPineInstances);

  for (const im of [mRoot, mTrunk, mTier1, mTier2, mTier3, mCrown, mShadow]) {
    im.frustumCulled = false;
    if (im !== mShadow) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  // --- B. TALL MATURE OAK GEOMETRIES ---
  const oakBaseGeo = new THREE.CylinderGeometry(0.38, 0.66, 1.6, 8);
  oakBaseGeo.translate(0, 0.8, 0);
  const oakTrunkGeo = new THREE.CylinderGeometry(0.26, 0.42, 6.2, 8);
  oakTrunkGeo.translate(0, 4.4, 0);
  const oakLobe1Geo = new THREE.IcosahedronGeometry(2.45, 2);
  perturbGeometryVertices(oakLobe1Geo, 0.18, 1.2);
  oakLobe1Geo.scale(1.2, 0.78, 1.15);
  oakLobe1Geo.translate(-1.1, 7.8, 0.5);
  const oakLobe2Geo = new THREE.IcosahedronGeometry(2.35, 2);
  perturbGeometryVertices(oakLobe2Geo, 0.18, 1.4);
  oakLobe2Geo.scale(1.15, 0.82, 1.2);
  oakLobe2Geo.translate(1.15, 8.1, -0.55);
  const oakCrownGeo = new THREE.IcosahedronGeometry(2.75, 2);
  perturbGeometryVertices(oakCrownGeo, 0.16, 1.1);
  oakCrownGeo.scale(1.25, 0.88, 1.25);
  oakCrownGeo.translate(0, 9.6, 0);

  disposableGeometries.push(oakBaseGeo, oakTrunkGeo, oakLobe1Geo, oakLobe2Geo, oakCrownGeo);

  const maxOakInstances = Math.max(1, oaks.length);
  const oBase = new THREE.InstancedMesh(oakBaseGeo, barkMat, maxOakInstances);
  const oTrunk = new THREE.InstancedMesh(oakTrunkGeo, barkMat, maxOakInstances);
  const oLobe1 = new THREE.InstancedMesh(oakLobe1Geo, oakLeafMat1, maxOakInstances);
  const oLobe2 = new THREE.InstancedMesh(oakLobe2Geo, oakLeafMat2, maxOakInstances);
  const oCrown = new THREE.InstancedMesh(oakCrownGeo, oakLeafMat2, maxOakInstances);
  const oShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxOakInstances);

  for (const im of [oBase, oTrunk, oLobe1, oLobe2, oCrown, oShadow]) {
    im.frustumCulled = false;
    if (im !== oShadow) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  // --- C. SILVER BIRCH GROVE TREES ---
  const birchBaseGeo = new THREE.CylinderGeometry(0.24, 0.42, 1.4, 8);
  birchBaseGeo.translate(0, 0.7, 0);
  const birchTrunkGeo = new THREE.CylinderGeometry(0.14, 0.26, 8.4, 8);
  birchTrunkGeo.translate(0, 5.2, 0);
  const birchBranchGeo = new THREE.CylinderGeometry(0.06, 0.12, 3.4, 6);
  birchBranchGeo.rotateZ(0.48);
  birchBranchGeo.translate(-0.75, 6.8, 0);
  const birchCanopy1Geo = new THREE.IcosahedronGeometry(2.1, 2);
  perturbGeometryVertices(birchCanopy1Geo, 0.16, 1.3);
  birchCanopy1Geo.scale(1.15, 0.85, 1.15);
  birchCanopy1Geo.translate(-0.85, 8.6, 0.35);
  const birchCanopy2Geo = new THREE.IcosahedronGeometry(2.35, 2);
  perturbGeometryVertices(birchCanopy2Geo, 0.15, 1.2);
  birchCanopy2Geo.scale(1.2, 0.92, 1.2);
  birchCanopy2Geo.translate(0.55, 10.2, -0.25);

  disposableGeometries.push(
    birchBaseGeo,
    birchTrunkGeo,
    birchBranchGeo,
    birchCanopy1Geo,
    birchCanopy2Geo
  );

  const maxBirchInstances = Math.max(1, birches.length);
  const brBase = new THREE.InstancedMesh(birchBaseGeo, birchBarkMat, maxBirchInstances);
  const brTrunk = new THREE.InstancedMesh(birchTrunkGeo, birchBarkMat, maxBirchInstances);
  const brBranch = new THREE.InstancedMesh(birchBranchGeo, birchBarkMat, maxBirchInstances);
  const brCanopy1 = new THREE.InstancedMesh(birchCanopy1Geo, birchLeafMat1, maxBirchInstances);
  const brCanopy2 = new THREE.InstancedMesh(birchCanopy2Geo, birchLeafMat2, maxBirchInstances);
  const brShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxBirchInstances);

  for (const im of [brBase, brTrunk, brBranch, brCanopy1, brCanopy2, brShadow]) {
    im.frustumCulled = false;
    if (im !== brShadow) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  // --- D. BOULDER 3-PART GEOMETRIES ---
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.09,
    roughness: 0.65,
    metalness: 0.06,
  });
  const mossCapMat = new THREE.MeshStandardMaterial({
    color: 0x4a7531,
    bumpMap: textures.terrainBump,
    bumpScale: 0.07,
    roughness: 0.92,
    metalness: 0.01,
  });
  disposableMaterials.push(rockMat, mossCapMat);

  const boulderMainGeo = new THREE.DodecahedronGeometry(0.95, 1);
  perturbGeometryVertices(boulderMainGeo, 0.22, 1.6);
  boulderMainGeo.scale(1.15, 0.78, 1.05);
  boulderMainGeo.translate(0, 0.45, 0);

  const boulderSideGeo = new THREE.DodecahedronGeometry(0.62, 1);
  perturbGeometryVertices(boulderSideGeo, 0.2, 2.0);
  boulderSideGeo.scale(1.1, 0.7, 0.95);
  boulderSideGeo.translate(0.55, 0.28, 0.25);

  const boulderMossGeo = new THREE.SphereGeometry(0.76, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
  perturbGeometryVertices(boulderMossGeo, 0.12, 2.5);
  boulderMossGeo.scale(1.12, 0.65, 1.0);
  boulderMossGeo.translate(0, 0.52, 0);

  disposableGeometries.push(boulderMainGeo, boulderSideGeo, boulderMossGeo);

  const maxBoulderInstances = Math.max(1, boulders.length);
  const bMain = new THREE.InstancedMesh(boulderMainGeo, rockMat, maxBoulderInstances);
  const bSide = new THREE.InstancedMesh(boulderSideGeo, rockMat, maxBoulderInstances);
  const bMoss = new THREE.InstancedMesh(boulderMossGeo, mossCapMat, maxBoulderInstances);
  const bShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxBoulderInstances);

  for (const im of [bMain, bSide, bMoss, bShadow]) {
    im.frustumCulled = false;
    if (im !== bShadow) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  const pineHeights = pines.map((p) => groundHeightAt(p.x, p.z));
  const oakHeights = oaks.map((o) => groundHeightAt(o.x, o.z));
  const birchHeights = birches.map((b) => groundHeightAt(b.x, b.z));
  const boulderHeights = boulders.map((b) => groundHeightAt(b.x, b.z));

  const cullDummy = new THREE.Object3D();
  const cullTint = new THREE.Color();

  // Populate pine instances
  for (let i = 0; i < pines.length; i++) {
    const p = pines[i];
    const gy = pineHeights[i];
    cullDummy.position.set(p.x, gy - 0.1, p.z);
    cullDummy.rotation.set((p.seed - 0.5) * 0.05, p.seed * Math.PI * 2, (p.seed - 0.5) * 0.05);
    cullDummy.scale.setScalar(p.scale);
    cullDummy.updateMatrix();

    mRoot.setMatrixAt(i, cullDummy.matrix);
    mTrunk.setMatrixAt(i, cullDummy.matrix);
    mTier1.setMatrixAt(i, cullDummy.matrix);
    mTier2.setMatrixAt(i, cullDummy.matrix);
    mTier3.setMatrixAt(i, cullDummy.matrix);
    mCrown.setMatrixAt(i, cullDummy.matrix);

    cullTint.setHSL(
      0.28 + (p.seed - 0.5) * 0.05,
      0.44 + (p.seed - 0.5) * 0.1,
      0.42 + (p.seed - 0.5) * 0.1
    );
    mTier1.setColorAt(i, cullTint);
    mTier2.setColorAt(i, cullTint);
    mTier3.setColorAt(i, cullTint);
    mCrown.setColorAt(i, cullTint);

    cullDummy.position.set(p.x, gy + 0.03, p.z);
    cullDummy.rotation.set(0, 0, 0);
    cullDummy.scale.setScalar(p.scale * 1.35);
    cullDummy.updateMatrix();
    mShadow.setMatrixAt(i, cullDummy.matrix);
  }
  for (const im of [mRoot, mTrunk, mTier1, mTier2, mTier3, mCrown, mShadow]) {
    im.count = pines.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
  }

  // Populate oak instances
  for (let i = 0; i < oaks.length; i++) {
    const o = oaks[i];
    const gy = oakHeights[i];
    cullDummy.position.set(o.x, gy - 0.1, o.z);
    cullDummy.rotation.set(0, o.seed * Math.PI * 2, 0);
    cullDummy.scale.setScalar(o.scale);
    cullDummy.updateMatrix();

    oBase.setMatrixAt(i, cullDummy.matrix);
    oTrunk.setMatrixAt(i, cullDummy.matrix);
    oLobe1.setMatrixAt(i, cullDummy.matrix);
    oLobe2.setMatrixAt(i, cullDummy.matrix);
    oCrown.setMatrixAt(i, cullDummy.matrix);

    cullTint.setHSL(0.24 + (o.seed - 0.5) * 0.08, 0.48, 0.44 + (o.seed - 0.5) * 0.12);
    oLobe1.setColorAt(i, cullTint);
    oLobe2.setColorAt(i, cullTint);
    oCrown.setColorAt(i, cullTint);

    cullDummy.position.set(o.x, gy + 0.03, o.z);
    cullDummy.rotation.set(0, 0, 0);
    cullDummy.scale.setScalar(o.scale * 1.55);
    cullDummy.updateMatrix();
    oShadow.setMatrixAt(i, cullDummy.matrix);
  }
  for (const im of [oBase, oTrunk, oLobe1, oLobe2, oCrown, oShadow]) {
    im.count = oaks.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
  }

  // Populate birch instances
  for (let i = 0; i < birches.length; i++) {
    const br = birches[i];
    const gy = birchHeights[i];
    cullDummy.position.set(br.x, gy - 0.1, br.z);
    cullDummy.rotation.set(0, br.seed * Math.PI * 2, 0);
    cullDummy.scale.setScalar(br.scale);
    cullDummy.updateMatrix();

    brBase.setMatrixAt(i, cullDummy.matrix);
    brTrunk.setMatrixAt(i, cullDummy.matrix);
    brBranch.setMatrixAt(i, cullDummy.matrix);
    brCanopy1.setMatrixAt(i, cullDummy.matrix);
    brCanopy2.setMatrixAt(i, cullDummy.matrix);

    cullTint.setHSL(0.08 + br.seed * 0.11, 0.72, 0.48 + (br.seed - 0.5) * 0.1);
    brCanopy1.setColorAt(i, cullTint);
    brCanopy2.setColorAt(i, cullTint);

    cullDummy.position.set(br.x, gy + 0.03, br.z);
    cullDummy.rotation.set(0, 0, 0);
    cullDummy.scale.setScalar(br.scale * 1.35);
    cullDummy.updateMatrix();
    brShadow.setMatrixAt(i, cullDummy.matrix);
  }
  for (const im of [brBase, brTrunk, brBranch, brCanopy1, brCanopy2, brShadow]) {
    im.count = birches.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
  }

  // Populate boulder instances
  for (let i = 0; i < boulders.length; i++) {
    const b = boulders[i];
    const gy = boulderHeights[i];
    cullDummy.position.set(b.x, gy - 0.08, b.z);
    cullDummy.rotation.set(0, b.seed * Math.PI * 2, 0);
    cullDummy.scale.setScalar(b.scale);
    cullDummy.updateMatrix();

    bMain.setMatrixAt(i, cullDummy.matrix);
    bSide.setMatrixAt(i, cullDummy.matrix);
    bMoss.setMatrixAt(i, cullDummy.matrix);

    cullDummy.position.set(b.x, gy + 0.025, b.z);
    cullDummy.rotation.set(0, 0, 0);
    cullDummy.scale.setScalar(b.scale * 0.55);
    cullDummy.updateMatrix();
    bShadow.setMatrixAt(i, cullDummy.matrix);
  }
  for (const im of [bMain, bSide, bMoss, bShadow]) {
    im.count = boulders.length;
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
  }

  // --- E. SOUTH-WEST DESERT DATE PALMS & SAVANNA UMBRELLA ACACIAS ---
  const palmCrownMat = new THREE.MeshStandardMaterial({
    color: 0x2e6f40,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.56,
  });
  const acaciaCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x6b7f32,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.62,
  });
  attachWindSwayShader(palmCrownMat, 0.022, 1.55, swayMaterials);
  attachWindSwayShader(acaciaCanopyMat, 0.015, 1.35, swayMaterials);
  disposableMaterials.push(palmCrownMat, acaciaCanopyMat);

  const instPalmTrunkGeo = new THREE.CylinderGeometry(0.18, 0.36, 9.2, 8);
  instPalmTrunkGeo.translate(0, 4.6, 0);
  const instPalmCrownGeo = new THREE.ConeGeometry(3.4, 2.2, 7);
  perturbGeometryVertices(instPalmCrownGeo, 0.22, 1.8);
  instPalmCrownGeo.scale(1.25, 0.55, 1.25);
  instPalmCrownGeo.translate(0, 9.1, 0);
  const instPalmLowerCrownGeo = new THREE.ConeGeometry(3.8, 1.8, 7);
  perturbGeometryVertices(instPalmLowerCrownGeo, 0.22, 2.1);
  instPalmLowerCrownGeo.scale(1.3, 0.45, 1.3);
  instPalmLowerCrownGeo.rotateY(0.45);
  instPalmLowerCrownGeo.translate(0, 8.4, 0);

  const instAcaciaTrunkGeo = new THREE.CylinderGeometry(0.22, 0.44, 6.4, 8);
  instAcaciaTrunkGeo.translate(0, 3.2, 0);
  const instAcaciaBranchLGeo = new THREE.CylinderGeometry(0.10, 0.18, 3.6, 6);
  instAcaciaBranchLGeo.rotateZ(0.62);
  instAcaciaBranchLGeo.translate(-1.1, 5.8, 0);
  const instAcaciaBranchRGeo = new THREE.CylinderGeometry(0.10, 0.18, 3.6, 6);
  instAcaciaBranchRGeo.rotateZ(-0.58);
  instAcaciaBranchRGeo.translate(1.1, 6.0, 0);
  const instAcaciaTier1Geo = new THREE.CylinderGeometry(4.2, 3.2, 1.1, 9);
  perturbGeometryVertices(instAcaciaTier1Geo, 0.16, 1.4);
  instAcaciaTier1Geo.translate(-0.8, 7.1, 0.2);
  const instAcaciaTier2Geo = new THREE.CylinderGeometry(4.6, 3.5, 1.15, 9);
  perturbGeometryVertices(instAcaciaTier2Geo, 0.16, 1.6);
  instAcaciaTier2Geo.translate(0.6, 7.8, -0.2);

  disposableGeometries.push(
    instPalmTrunkGeo,
    instPalmCrownGeo,
    instPalmLowerCrownGeo,
    instAcaciaTrunkGeo,
    instAcaciaBranchLGeo,
    instAcaciaBranchRGeo,
    instAcaciaTier1Geo,
    instAcaciaTier2Geo
  );

  const maxPalmInst = Math.max(1, palms.length);
  const pTrunkIM = new THREE.InstancedMesh(instPalmTrunkGeo, barkMat, maxPalmInst);
  const pCrown1IM = new THREE.InstancedMesh(instPalmCrownGeo, palmCrownMat, maxPalmInst);
  const pCrown2IM = new THREE.InstancedMesh(instPalmLowerCrownGeo, palmCrownMat, maxPalmInst);
  const pShadowIM = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxPalmInst);
  for (let i = 0; i < palms.length; i++) {
    const p = palms[i];
    const gy = groundHeightAt(p.x, p.z);
    cullDummy.position.set(p.x, gy - 0.1, p.z);
    cullDummy.rotation.set((p.seed - 0.5) * 0.12, p.seed * Math.PI * 2, (p.seed - 0.5) * 0.12);
    cullDummy.scale.setScalar(p.scale);
    cullDummy.updateMatrix();
    pTrunkIM.setMatrixAt(i, cullDummy.matrix);
    pCrown1IM.setMatrixAt(i, cullDummy.matrix);
    pCrown2IM.setMatrixAt(i, cullDummy.matrix);

    cullDummy.position.set(p.x, gy + 0.03, p.z);
    cullDummy.rotation.set(0, 0, 0);
    cullDummy.scale.setScalar(p.scale * 1.25);
    cullDummy.updateMatrix();
    pShadowIM.setMatrixAt(i, cullDummy.matrix);
  }
  for (const im of [pTrunkIM, pCrown1IM, pCrown2IM, pShadowIM]) {
    im.count = palms.length;
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    if (im !== pShadowIM) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  const maxAcaciaInst = Math.max(1, acacias.length);
  const acTrunkIM = new THREE.InstancedMesh(instAcaciaTrunkGeo, barkMat, maxAcaciaInst);
  const acBrLIM = new THREE.InstancedMesh(instAcaciaBranchLGeo, barkMat, maxAcaciaInst);
  const acBrRIM = new THREE.InstancedMesh(instAcaciaBranchRGeo, barkMat, maxAcaciaInst);
  const acTier1IM = new THREE.InstancedMesh(instAcaciaTier1Geo, acaciaCanopyMat, maxAcaciaInst);
  const acTier2IM = new THREE.InstancedMesh(instAcaciaTier2Geo, acaciaCanopyMat, maxAcaciaInst);
  const acShadowIM = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxAcaciaInst);
  for (let i = 0; i < acacias.length; i++) {
    const ac = acacias[i];
    const gy = groundHeightAt(ac.x, ac.z);
    cullDummy.position.set(ac.x, gy - 0.1, ac.z);
    cullDummy.rotation.set(0, ac.seed * Math.PI * 2, 0);
    cullDummy.scale.setScalar(ac.scale);
    cullDummy.updateMatrix();
    acTrunkIM.setMatrixAt(i, cullDummy.matrix);
    acBrLIM.setMatrixAt(i, cullDummy.matrix);
    acBrRIM.setMatrixAt(i, cullDummy.matrix);
    acTier1IM.setMatrixAt(i, cullDummy.matrix);
    acTier2IM.setMatrixAt(i, cullDummy.matrix);

    cullDummy.position.set(ac.x, gy + 0.03, ac.z);
    cullDummy.rotation.set(0, 0, 0);
    cullDummy.scale.setScalar(ac.scale * 1.55);
    cullDummy.updateMatrix();
    acShadowIM.setMatrixAt(i, cullDummy.matrix);
  }
  for (const im of [acTrunkIM, acBrLIM, acBrRIM, acTier1IM, acTier2IM, acShadowIM]) {
    im.count = acacias.length;
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    if (im !== acShadowIM) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  // --- F. SWAYING MEADOW GRASS TUFTS & WATERSIDE REEDS ---
  const grassCount = isSoftwareGl ? 900 : 2200;
  const grassBladeGeo = new THREE.ConeGeometry(0.055, 0.26, 4);
  grassBladeGeo.translate(0, 0.13, 0);
  disposableGeometries.push(grassBladeGeo);

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4b7d31,
    roughness: 0.75,
    metalness: 0.02,
  });
  attachWindSwayShader(grassMat, 0.05, 2.4, swayMaterials);
  disposableMaterials.push(grassMat);

  const grassInstanced = new THREE.InstancedMesh(grassBladeGeo, grassMat, grassCount);
  const gDummy = new THREE.Object3D();
  const gColor = new THREE.Color();
  let gIdx = 0;

  for (let i = 0; i < grassCount * 2 && gIdx < grassCount; i++) {
    const r1 = hash2D(i * 13, i * 29);
    const r2 = hash2D(i * 47 + 9, i * 71 - 3);
    const angle = r1 * Math.PI * 2;
    const dist = 6.0 + Math.sqrt(r2) * 220.0;
    const gx = Math.cos(angle) * dist;
    const gz = Math.sin(angle) * dist;

    const gy = groundHeightAt(gx, gz);
    if (gy < WATER_LEVEL + 0.12 || gy > 13.0) continue;
    if (trailFactorAt(gx, gz) > 0.28) continue;
    if (
      Math.abs(gx - SOUTHERN_MINE_POS.x) < 10.5 &&
      gz > SOUTHERN_MINE_POS.entranceZ - 8.0 &&
      gz < SOUTHERN_MINE_POS.entranceZ + 20.0
    ) {
      continue;
    }

    const isShoreReed = gy < WATER_LEVEL + 0.42;
    gDummy.position.set(gx, gy - 0.02, gz);
    gDummy.rotation.set(0, r1 * Math.PI * 2, 0);
    if (isShoreReed) {
      gDummy.scale.set(0.75, 1.35 + r2 * 0.45, 0.75);
      gColor.setHex(0x5c7536);
    } else {
      gDummy.scale.set(0.85 + r1 * 0.45, 0.7 + r2 * 0.65, 0.85 + r1 * 0.45);
      gColor.setHSL(0.26 + (r1 - 0.5) * 0.06, 0.48, 0.38 + (r2 - 0.5) * 0.1);
    }
    gDummy.updateMatrix();
    grassInstanced.setMatrixAt(gIdx, gDummy.matrix);
    grassInstanced.setColorAt(gIdx, gColor);
    gIdx++;
  }
  grassInstanced.count = gIdx;
  grassInstanced.instanceMatrix.needsUpdate = true;
  if (grassInstanced.instanceColor) grassInstanced.instanceColor.needsUpdate = true;
  grassInstanced.computeBoundingSphere();
  scene.add(grassInstanced);
}
// #endregion
