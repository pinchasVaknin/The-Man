// ============================================================================
// MODULE: World / Models / Vegetation Models
// DESIGN: Spatially sectorized instanced flora, trees, boulders, and meadow grass (SRP)
// SUMMARY: Generates frustum-culled spatial sector InstancedMeshes for forest pines,
//          mature oaks, silver birches, desert palms, savanna acacias, mossy boulders,
//          waterside reeds, and grasses so off-screen sectors are never rendered.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  WATER_LEVEL,
  SOUTHERN_MINE_POS,
  groundHeightAt,
  isInsideBearCave,
  trailFactorAt,
  hash2D,
} from '../terrainMath';
import {
  attachWindSwayShader,
  createBirchBarkTexture,
  perturbGeometryVertices,
} from '../builders/shaderAndMaterialBuilders';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== BUILD VEGETATION MODELS ======================== \\
// #region Build Vegetation Models
const VEG_SECTOR_SIZE = 220;
const VEG_SECTOR_RADIUS = 165;

/**
 * Summary: Constructs spatially sectorized, frustum-culled instanced forest trees, boulders,
 *          palms, acacias, and swaying ground grass.
 * @param ctx Shared build context (scene, textures, disposal lists).
 */
export function buildVegetationModels(ctx: IWorldModelBuildContext): void {
  const {
    scene,
    textures,
    obstacles,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    swayMaterials,
    distanceCulledObjects,
  } = ctx;

  // Spatial sector registry so each 220m x 220m cell is distance-culled & frustum-culled
  const sectorGroups = new Map<string, THREE.Group>();
  const getSectorGroup = (x: number, z: number): THREE.Group => {
    const gx = Math.round(x / VEG_SECTOR_SIZE);
    const gz = Math.round(z / VEG_SECTOR_SIZE);
    const key = `${gx},${gz}`;
    let grp = sectorGroups.get(key);
    if (!grp) {
      grp = new THREE.Group();
      scene.add(grp);
      sectorGroups.set(key, grp);
      distanceCulledObjects.push({
        obj: grp,
        cx: gx * VEG_SECTOR_SIZE,
        cz: gz * VEG_SECTOR_SIZE,
        radius: VEG_SECTOR_RADIUS,
      });
    }
    return grp;
  };

  const groupBySector = <T extends { x: number; z: number }>(items: readonly T[]): Map<THREE.Group, T[]> => {
    const map = new Map<THREE.Group, T[]>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const grp = getSectorGroup(item.x, item.z);
      let list = map.get(grp);
      if (!list) {
        list = [];
        map.set(grp, list);
      }
      list.push(item);
    }
    return map;
  };

  const finalizeInstancedMesh = (
    im: THREE.InstancedMesh,
    count: number,
    castShadow: boolean,
    receiveShadow: boolean,
    parent: THREE.Object3D
  ): void => {
    im.count = count;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    im.frustumCulled = true;
    im.castShadow = castShadow && !isSoftwareGl;
    im.receiveShadow = receiveShadow && !isSoftwareGl;
    parent.add(im);
  };

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

  const cullDummy = new THREE.Object3D();
  const cullTint = new THREE.Color();

  // Populate pine instances per spatial sector
  for (const [sectorGrp, sectorPines] of groupBySector(pines)) {
    const n = sectorPines.length;
    const mRoot = new THREE.InstancedMesh(pineRootGeo, barkMat, n);
    const mTrunk = new THREE.InstancedMesh(pineTrunkGeo, barkMat, n);
    const mTier1 = new THREE.InstancedMesh(pineTier1Geo, pineNeedleMat1, n);
    const mTier2 = new THREE.InstancedMesh(pineTier2Geo, pineNeedleMat2, n);
    const mTier3 = new THREE.InstancedMesh(pineTier3Geo, pineNeedleMat1, n);
    const mCrown = new THREE.InstancedMesh(pineCrownGeo, pineNeedleMat2, n);
    const mShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);

    for (let i = 0; i < n; i++) {
      const p = sectorPines[i];
      const gy = groundHeightAt(p.x, p.z);
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

    finalizeInstancedMesh(mRoot, n, false, true, sectorGrp);
    finalizeInstancedMesh(mTrunk, n, true, true, sectorGrp);
    finalizeInstancedMesh(mTier1, n, true, true, sectorGrp);
    finalizeInstancedMesh(mTier2, n, true, true, sectorGrp);
    finalizeInstancedMesh(mTier3, n, false, true, sectorGrp);
    finalizeInstancedMesh(mCrown, n, false, true, sectorGrp);
    finalizeInstancedMesh(mShadow, n, false, false, sectorGrp);
  }

  // Populate oak instances per spatial sector
  for (const [sectorGrp, sectorOaks] of groupBySector(oaks)) {
    const n = sectorOaks.length;
    const oBase = new THREE.InstancedMesh(oakBaseGeo, barkMat, n);
    const oTrunk = new THREE.InstancedMesh(oakTrunkGeo, barkMat, n);
    const oLobe1 = new THREE.InstancedMesh(oakLobe1Geo, oakLeafMat1, n);
    const oLobe2 = new THREE.InstancedMesh(oakLobe2Geo, oakLeafMat2, n);
    const oCrown = new THREE.InstancedMesh(oakCrownGeo, oakLeafMat2, n);
    const oShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);

    for (let i = 0; i < n; i++) {
      const o = sectorOaks[i];
      const gy = groundHeightAt(o.x, o.z);
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

    finalizeInstancedMesh(oBase, n, false, true, sectorGrp);
    finalizeInstancedMesh(oTrunk, n, true, true, sectorGrp);
    finalizeInstancedMesh(oLobe1, n, false, true, sectorGrp);
    finalizeInstancedMesh(oLobe2, n, false, true, sectorGrp);
    finalizeInstancedMesh(oCrown, n, true, true, sectorGrp);
    finalizeInstancedMesh(oShadow, n, false, false, sectorGrp);
  }

  // Populate birch instances per spatial sector
  for (const [sectorGrp, sectorBirches] of groupBySector(birches)) {
    const n = sectorBirches.length;
    const brBase = new THREE.InstancedMesh(birchBaseGeo, birchBarkMat, n);
    const brTrunk = new THREE.InstancedMesh(birchTrunkGeo, birchBarkMat, n);
    const brBranch = new THREE.InstancedMesh(birchBranchGeo, birchBarkMat, n);
    const brCanopy1 = new THREE.InstancedMesh(birchCanopy1Geo, birchLeafMat1, n);
    const brCanopy2 = new THREE.InstancedMesh(birchCanopy2Geo, birchLeafMat2, n);
    const brShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);

    for (let i = 0; i < n; i++) {
      const br = sectorBirches[i];
      const gy = groundHeightAt(br.x, br.z);
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

    finalizeInstancedMesh(brBase, n, false, true, sectorGrp);
    finalizeInstancedMesh(brTrunk, n, true, true, sectorGrp);
    finalizeInstancedMesh(brBranch, n, false, true, sectorGrp);
    finalizeInstancedMesh(brCanopy1, n, true, true, sectorGrp);
    finalizeInstancedMesh(brCanopy2, n, true, true, sectorGrp);
    finalizeInstancedMesh(brShadow, n, false, false, sectorGrp);
  }

  // Populate boulder instances per spatial sector
  for (const [sectorGrp, sectorBoulders] of groupBySector(boulders)) {
    const n = sectorBoulders.length;
    const bMain = new THREE.InstancedMesh(boulderMainGeo, rockMat, n);
    const bSide = new THREE.InstancedMesh(boulderSideGeo, rockMat, n);
    const bMoss = new THREE.InstancedMesh(boulderMossGeo, mossCapMat, n);
    const bShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);

    for (let i = 0; i < n; i++) {
      const b = sectorBoulders[i];
      const gy = groundHeightAt(b.x, b.z);
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

    finalizeInstancedMesh(bMain, n, true, true, sectorGrp);
    finalizeInstancedMesh(bSide, n, false, true, sectorGrp);
    finalizeInstancedMesh(bMoss, n, false, true, sectorGrp);
    finalizeInstancedMesh(bShadow, n, false, false, sectorGrp);
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

  for (const [sectorGrp, sectorPalms] of groupBySector(palms)) {
    const n = sectorPalms.length;
    const pTrunkIM = new THREE.InstancedMesh(instPalmTrunkGeo, barkMat, n);
    const pCrown1IM = new THREE.InstancedMesh(instPalmCrownGeo, palmCrownMat, n);
    const pCrown2IM = new THREE.InstancedMesh(instPalmLowerCrownGeo, palmCrownMat, n);
    const pShadowIM = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);
    for (let i = 0; i < n; i++) {
      const p = sectorPalms[i];
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
    finalizeInstancedMesh(pTrunkIM, n, true, true, sectorGrp);
    finalizeInstancedMesh(pCrown1IM, n, true, true, sectorGrp);
    finalizeInstancedMesh(pCrown2IM, n, false, true, sectorGrp);
    finalizeInstancedMesh(pShadowIM, n, false, false, sectorGrp);
  }

  for (const [sectorGrp, sectorAcacias] of groupBySector(acacias)) {
    const n = sectorAcacias.length;
    const acTrunkIM = new THREE.InstancedMesh(instAcaciaTrunkGeo, barkMat, n);
    const acBrLIM = new THREE.InstancedMesh(instAcaciaBranchLGeo, barkMat, n);
    const acBrRIM = new THREE.InstancedMesh(instAcaciaBranchRGeo, barkMat, n);
    const acTier1IM = new THREE.InstancedMesh(instAcaciaTier1Geo, acaciaCanopyMat, n);
    const acTier2IM = new THREE.InstancedMesh(instAcaciaTier2Geo, acaciaCanopyMat, n);
    const acShadowIM = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, n);
    for (let i = 0; i < n; i++) {
      const ac = sectorAcacias[i];
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
    finalizeInstancedMesh(acTrunkIM, n, true, true, sectorGrp);
    finalizeInstancedMesh(acBrLIM, n, false, true, sectorGrp);
    finalizeInstancedMesh(acBrRIM, n, false, true, sectorGrp);
    finalizeInstancedMesh(acTier1IM, n, true, true, sectorGrp);
    finalizeInstancedMesh(acTier2IM, n, true, true, sectorGrp);
    finalizeInstancedMesh(acShadowIM, n, false, false, sectorGrp);
  }

  // --- F. SWAYING MEADOW GRASS TUFTS & WATERSIDE REEDS (Sectorized) ---
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

  interface IGrassSample {
    x: number;
    z: number;
    matrix: THREE.Matrix4;
    color: THREE.Color;
  }
  const grassSamples: IGrassSample[] = [];
  const gDummy = new THREE.Object3D();
  const gColor = new THREE.Color();

  for (let i = 0; i < grassCount * 2 && grassSamples.length < grassCount; i++) {
    const r1 = hash2D(i * 13, i * 29);
    const r2 = hash2D(i * 47 + 9, i * 71 - 3);
    const angle = r1 * Math.PI * 2;
    const dist = 6.0 + Math.sqrt(r2) * 220.0;
    const gx = Math.cos(angle) * dist;
    const gz = Math.sin(angle) * dist;

    const gy = groundHeightAt(gx, gz);
    if (gy < WATER_LEVEL + 0.12 || gy > 13.0) continue;
    if (trailFactorAt(gx, gz) > 0.28) continue;
    if (isInsideBearCave(gx, gz) !== null) continue;
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
    grassSamples.push({
      x: gx,
      z: gz,
      matrix: gDummy.matrix.clone(),
      color: gColor.clone(),
    });
  }

  for (const [sectorGrp, sectorGrass] of groupBySector(grassSamples)) {
    const n = sectorGrass.length;
    const grassIM = new THREE.InstancedMesh(grassBladeGeo, grassMat, n);
    for (let i = 0; i < n; i++) {
      grassIM.setMatrixAt(i, sectorGrass[i].matrix);
      grassIM.setColorAt(i, sectorGrass[i].color);
    }
    finalizeInstancedMesh(grassIM, n, false, false, sectorGrp);
  }
}
// #endregion
