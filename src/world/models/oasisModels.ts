// ============================================================================
// MODULE: World / Models / Southwest Desert Oasis Village & Lagoon
// DESIGN: Authentic Sandstone/Adobe Oasis Village & Turquoise Lagoon (SRP)
// SUMMARY: Constructs the Southwest Desert Oasis at (-310, 300) matching the
//          4-panel desert oasis reference village:
//          - Natural central swimmable turquoise lagoon with sandy shoals,
//            shoreline sandstone boulders, and lush waterside reed clumps
//          - Two timber fishing piers/docks jutting out into the lagoon on pilings
//          - Northeast Grand Adobe Citadel & Domed Bell-Watchtower compound
//            with arched ground portico, rooftop vigas, enterable hall & ladder
//          - West Enterable Adobe Merchant House with terracotta fabric canopy,
//            low dry-stone sandstone courtyard walls, barrels, crates & amphorae
//          - Crescent of 7 flat-roofed sandstone/mudbrick village houses (1 & 2 story)
//            with parapet roofs, protruding timber beams, shutters, and awnings
//          - 24 tall curved multi-segment Date Palms with rich feather-frond crowns
// ============================================================================

import * as THREE from 'three';
import {
  SOUTHWEST_OASIS_POS,
  SOUTHWEST_OASIS_VILLAGE_HOUSES,
  SOUTHWEST_OASIS_STONE_WALLS,
  SOUTHWEST_OASIS_PALMS,
  type OasisVillageHouseSpec,
} from '../domain/landmarks/oasisAndHarborLandmarks';
import { MURKY_SWAMP_BIOME_POS } from '../domain/landmarks/coreLandmarks';
import { groundHeightAt, WATER_LEVEL } from '../terrainMath';
import { attachWindSwayShader } from '../builders/shaderAndMaterialBuilders';
import type { IWorldModelBuildContext } from './types';

export interface IOasisModelsResult {
  updateOasis: (elapsedTime: number) => void;
}

export function buildOasisModels(ctx: IWorldModelBuildContext): IOasisModelsResult {
  const {
    scene,
    textures,
    disposableGeometries,
    disposableMaterials,
    swayMaterials,
    lanternLights,
    distanceCulledObjects,
    doorPivotHandles,
    archAssets,
  } = ctx;

  if (!archAssets) {
    throw new Error('buildOasisModels requires ctx.archAssets to be initialized first');
  }

  const swOasisGroup = new THREE.Group();
  swOasisGroup.position.set(
    SOUTHWEST_OASIS_POS.x,
    SOUTHWEST_OASIS_POS.terraceY,
    SOUTHWEST_OASIS_POS.z
  );

  // ======================== SHARED OASIS MATERIALS ======================== \\
  const adobeWallMat = new THREE.MeshStandardMaterial({
    color: 0xd8b88c,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.04,
    roughness: 0.9,
    metalness: 0.02,
  });
  const adobeWarmMat = new THREE.MeshStandardMaterial({
    color: 0xcfa978,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.04,
    roughness: 0.92,
    metalness: 0.02,
  });
  const sandstoneTrimMat = new THREE.MeshStandardMaterial({
    color: 0xbe9663,
    map: textures.rockAlbedo,
    roughness: 0.86,
    metalness: 0.04,
  });
  const dryStoneWallMat = new THREE.MeshStandardMaterial({
    color: 0xb58e5d,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.06,
    roughness: 0.92,
    metalness: 0.03,
  });
  const domePlasterMat = new THREE.MeshStandardMaterial({
    color: 0xe3c79c,
    roughness: 0.82,
    metalness: 0.03,
  });
  const darkTimberMat = new THREE.MeshStandardMaterial({
    color: 0x5c3e26,
    map: textures.timberAlbedo,
    roughness: 0.88,
    metalness: 0.04,
  });
  const weatheredPierWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6e4e32,
    map: textures.timberAlbedo,
    roughness: 0.86,
    metalness: 0.04,
  });
  const terracottaAwningMat = new THREE.MeshStandardMaterial({
    color: 0xa84832,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const ochreAwningMat = new THREE.MeshStandardMaterial({
    color: 0xd4a454,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const sandAwningMat = new THREE.MeshStandardMaterial({
    color: 0xdcc39a,
    roughness: 0.84,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const crateWoodMat = new THREE.MeshStandardMaterial({
    color: 0x8c6239,
    map: textures.timberAlbedo,
    roughness: 0.85,
    metalness: 0.04,
  });
  const barrelWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6b4728,
    map: textures.timberAlbedo,
    roughness: 0.84,
    metalness: 0.06,
  });
  const clayPotMat = new THREE.MeshStandardMaterial({
    color: 0xb5633c,
    roughness: 0.76,
    metalness: 0.04,
  });
  const desertRockMat = new THREE.MeshStandardMaterial({
    color: 0xa88355,
    map: textures.rockAlbedo,
    roughness: 0.92,
    metalness: 0.03,
  });
  const windowRecessMat = new THREE.MeshStandardMaterial({
    color: 0x2c2016,
    roughness: 0.9,
  });
  const oasisLagoonWaterMat = new THREE.MeshStandardMaterial({
    color: 0x168b96,
    emissive: 0x0a4854,
    emissiveIntensity: 0.25,
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.86,
  });
  const oasisReedMat = new THREE.MeshStandardMaterial({
    color: 0x4f7d3a,
    roughness: 0.8,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  attachWindSwayShader(oasisReedMat, 0.08, 1.5, swayMaterials);

  const palmTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x6e4f35,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.08,
    roughness: 0.92,
  });
  const palmRingMat = new THREE.MeshStandardMaterial({
    color: 0x543a24,
    roughness: 0.95,
  });
  const palmFrondMat = new THREE.MeshStandardMaterial({
    color: 0x437c30,
    roughness: 0.68,
    side: THREE.DoubleSide,
  });
  attachWindSwayShader(palmFrondMat, 0.13, 1.4, swayMaterials);

  disposableMaterials.push(
    adobeWallMat,
    adobeWarmMat,
    sandstoneTrimMat,
    dryStoneWallMat,
    domePlasterMat,
    darkTimberMat,
    weatheredPierWoodMat,
    terracottaAwningMat,
    ochreAwningMat,
    sandAwningMat,
    crateWoodMat,
    barrelWoodMat,
    clayPotMat,
    desertRockMat,
    windowRecessMat,
    oasisLagoonWaterMat,
    oasisReedMat,
    palmTrunkMat,
    palmRingMat,
    palmFrondMat
  );

  // Helper to attach wooden roof vigas (protruding ceiling beams) along flat adobe walls
  const addRoofVigas = (
    parent: THREE.Group,
    w: number,
    d: number,
    yBeam: number
  ): void => {
    const beamCountX = Math.max(2, Math.floor(w / 1.8));
    for (let i = 0; i < beamCountX; i++) {
      const bx = -w * 0.4 + (i / Math.max(1, beamCountX - 1)) * (w * 0.8);
      const vigaGeo = new THREE.BoxGeometry(0.16, 0.16, d + 0.65);
      disposableGeometries.push(vigaGeo);
      const viga = new THREE.Mesh(vigaGeo, darkTimberMat);
      viga.position.set(bx, yBeam, 0);
      viga.castShadow = true;
      parent.add(viga);
    }
    const beamCountZ = Math.max(2, Math.floor(d / 1.9));
    for (let i = 0; i < beamCountZ; i++) {
      const bz = -d * 0.38 + (i / Math.max(1, beamCountZ - 1)) * (d * 0.76);
      const vigaGeo = new THREE.BoxGeometry(w + 0.65, 0.16, 0.16);
      disposableGeometries.push(vigaGeo);
      const viga = new THREE.Mesh(vigaGeo, darkTimberMat);
      viga.position.set(0, yBeam - 0.08, bz);
      viga.castShadow = true;
      parent.add(viga);
    }
  };

  // Helper to add a cloth market/porch awning supported by timber poles + crates/barrels underneath
  const addClothAwning = (
    parent: THREE.Group,
    side: 'north' | 'south' | 'east' | 'west',
    colorType: 'terracotta' | 'ochre' | 'sand',
    houseW: number,
    houseD: number,
    awningW: number,
    awningD: number,
    attachY: number
  ): void => {
    const awningMat =
      colorType === 'terracotta'
        ? terracottaAwningMat
        : colorType === 'ochre'
          ? ochreAwningMat
          : sandAwningMat;
    const awningGroup = new THREE.Group();
    if (side === 'south') {
      awningGroup.rotation.y = 0;
      awningGroup.position.set(0, 0, houseD * 0.5);
    } else if (side === 'north') {
      awningGroup.rotation.y = Math.PI;
      awningGroup.position.set(0, 0, -houseD * 0.5);
    } else if (side === 'east') {
      awningGroup.rotation.y = Math.PI * 0.5;
      awningGroup.position.set(houseW * 0.5, 0, 0);
    } else {
      awningGroup.rotation.y = -Math.PI * 0.5;
      awningGroup.position.set(-houseW * 0.5, 0, 0);
    }

    // Sloped cloth canopy
    const canopyGeo = new THREE.BoxGeometry(awningW, 0.08, awningD);
    disposableGeometries.push(canopyGeo);
    const canopy = new THREE.Mesh(canopyGeo, awningMat);
    canopy.position.set(0, attachY - 0.25, awningD * 0.5);
    canopy.rotation.x = 0.16;
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    awningGroup.add(canopy);

    // Front drape valance
    const valanceGeo = new THREE.BoxGeometry(awningW, 0.28, 0.06);
    disposableGeometries.push(valanceGeo);
    const valance = new THREE.Mesh(valanceGeo, awningMat);
    valance.position.set(0, attachY - 0.52, awningD - 0.04);
    awningGroup.add(valance);

    // Support timber poles at outer corners
    const poleH = attachY - 0.45;
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.09, poleH, 8);
    disposableGeometries.push(poleGeo);
    for (const px of [-awningW * 0.46, awningW * 0.46]) {
      const pole = new THREE.Mesh(poleGeo, darkTimberMat);
      pole.position.set(px, poleH * 0.5, awningD - 0.15);
      pole.castShadow = true;
      awningGroup.add(pole);
    }

    // Props under the shaded awning: wooden barrel, crate, and clay amphora
    const crateGeo = new THREE.BoxGeometry(0.85, 0.75, 0.85);
    const barrelGeo = new THREE.CylinderGeometry(0.36, 0.34, 0.92, 10);
    const potGeo = new THREE.CylinderGeometry(0.18, 0.26, 0.62, 10);
    disposableGeometries.push(crateGeo, barrelGeo, potGeo);

    const crate = new THREE.Mesh(crateGeo, crateWoodMat);
    crate.position.set(-awningW * 0.28, 0.375, 0.85);
    crate.rotation.y = 0.18;
    crate.castShadow = true;
    crate.receiveShadow = true;
    awningGroup.add(crate);

    const barrel = new THREE.Mesh(barrelGeo, barrelWoodMat);
    barrel.position.set(awningW * 0.3, 0.46, 0.9);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    awningGroup.add(barrel);

    const pot = new THREE.Mesh(potGeo, clayPotMat);
    pot.position.set(awningW * 0.12, 0.31, 1.15);
    pot.castShadow = true;
    awningGroup.add(pot);

    parent.add(awningGroup);
  };

  // ======================== 1. CENTRAL TURQUOISE OASIS LAGOON ======================== \\
  const lagLocalX = SOUTHWEST_OASIS_POS.lagoonX - SOUTHWEST_OASIS_POS.x;
  const lagLocalZ = SOUTHWEST_OASIS_POS.lagoonZ - SOUTHWEST_OASIS_POS.z;
  const lagWaterLocalY = SOUTHWEST_OASIS_POS.lagoonWaterY - SOUTHWEST_OASIS_POS.terraceY;

  const lagoonGeo = new THREE.CircleGeometry(1.0, 48);
  disposableGeometries.push(lagoonGeo);
  const lagoonWaterMesh = new THREE.Mesh(lagoonGeo, oasisLagoonWaterMat);
  lagoonWaterMesh.rotation.x = -Math.PI / 2;
  lagoonWaterMesh.scale.set(
    SOUTHWEST_OASIS_POS.lagoonRadiusX,
    SOUTHWEST_OASIS_POS.lagoonRadiusZ,
    1.0
  );
  lagoonWaterMesh.position.set(lagLocalX, lagWaterLocalY, lagLocalZ);
  lagoonWaterMesh.receiveShadow = true;
  swOasisGroup.add(lagoonWaterMesh);

  // Shoreline boulders & natural reed clusters around the lagoon perimeter
  const reedBladeGeo = new THREE.ConeGeometry(0.07, 1.0, 4);
  disposableGeometries.push(reedBladeGeo);

  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2;
    const edgeX = lagLocalX + Math.cos(ang) * (SOUTHWEST_OASIS_POS.lagoonRadiusX - 0.6);
    const edgeZ = lagLocalZ + Math.sin(ang) * (SOUTHWEST_OASIS_POS.lagoonRadiusZ - 0.6);
    const worldEdgeX = SOUTHWEST_OASIS_POS.x + edgeX;
    const worldEdgeZ = SOUTHWEST_OASIS_POS.z + edgeZ;
    if (
      Math.hypot(worldEdgeX - SOUTHWEST_OASIS_POS.gazeboX, worldEdgeZ - SOUTHWEST_OASIS_POS.gazeboZ) < 4.2 ||
      Math.hypot(worldEdgeX - SOUTHWEST_OASIS_POS.eastPierX, worldEdgeZ - SOUTHWEST_OASIS_POS.eastPierZ) < 4.2
    ) {
      continue;
    }

    // Shoreline sandstone rocks every few steps
    if (i % 2 === 0) {
      const rockScale = 0.55 + ((i * 7) % 5) * 0.22;
      const rockGeo = new THREE.DodecahedronGeometry(rockScale, 1);
      disposableGeometries.push(rockGeo);
      const rock = new THREE.Mesh(rockGeo, desertRockMat);
      const rx = lagLocalX + Math.cos(ang) * (SOUTHWEST_OASIS_POS.lagoonRadiusX + 0.5 + (i % 3) * 0.6);
      const rz = lagLocalZ + Math.sin(ang) * (SOUTHWEST_OASIS_POS.lagoonRadiusZ + 0.5 + (i % 3) * 0.6);
      const ry = groundHeightAt(SOUTHWEST_OASIS_POS.x + rx, SOUTHWEST_OASIS_POS.z + rz) - SOUTHWEST_OASIS_POS.terraceY;
      rock.position.set(rx, ry + rockScale * 0.25, rz);
      rock.scale.set(1.3, 0.62, 1.1);
      rock.rotation.y = i * 1.1;
      rock.castShadow = true;
      rock.receiveShadow = true;
      swOasisGroup.add(rock);
    }

    // Lush lakeside reed/water-grass clumps in the shallow water rim
    const reedCluster = new THREE.Group();
    reedCluster.position.set(edgeX, lagWaterLocalY - 0.08, edgeZ);
    const bladeCount = 5 + (i % 4);
    for (let b = 0; b < bladeCount; b++) {
      const bladeH = 0.85 + ((i + b) % 4) * 0.24;
      const blade = new THREE.Mesh(reedBladeGeo, oasisReedMat);
      blade.scale.set(1.0, bladeH, 1.0);
      blade.position.set(
        Math.cos(b * 1.7) * 0.35,
        bladeH * 0.48,
        Math.sin(b * 1.7) * 0.35
      );
      blade.rotation.z = (b % 2 === 0 ? 1 : -1) * 0.14;
      blade.castShadow = true;
      reedCluster.add(blade);
    }
    swOasisGroup.add(reedCluster);
  }

  // ======================== 2. TWO WOODEN FISHING PIERS / JETTIES ======================== \\
  const buildWoodenPier = (
    worldCenterX: number,
    worldCenterZ: number,
    worldDeckY: number,
    lengthX: number,
    widthZ: number
  ): void => {
    const pierGroup = new THREE.Group();
    pierGroup.position.set(
      worldCenterX - SOUTHWEST_OASIS_POS.x,
      worldDeckY - SOUTHWEST_OASIS_POS.terraceY,
      worldCenterZ - SOUTHWEST_OASIS_POS.z
    );

    const beamGeo = new THREE.BoxGeometry(lengthX, 0.16, 0.18);
    const plankGeo = new THREE.BoxGeometry(0.36, 0.08, widthZ);
    const postGeo = new THREE.CylinderGeometry(0.11, 0.12, 2.3, 8);
    disposableGeometries.push(beamGeo, plankGeo, postGeo);

    for (const sz of [-widthZ * 0.38, widthZ * 0.38]) {
      const beam = new THREE.Mesh(beamGeo, darkTimberMat);
      beam.position.set(0, -0.1, sz);
      beam.castShadow = true;
      pierGroup.add(beam);
    }

    const plankCount = Math.floor(lengthX / 0.42);
    for (let p = 0; p < plankCount; p++) {
      const px = -lengthX * 0.5 + 0.22 + p * 0.42;
      const plank = new THREE.Mesh(plankGeo, weatheredPierWoodMat);
      plank.position.set(px, 0, 0);
      plank.castShadow = true;
      plank.receiveShadow = true;
      pierGroup.add(plank);
    }

    const postPositions = [-lengthX * 0.44, -lengthX * 0.15, lengthX * 0.15, lengthX * 0.44];
    for (let idx = 0; idx < postPositions.length; idx++) {
      const px = postPositions[idx];
      for (const pz of [-widthZ * 0.44, widthZ * 0.44]) {
        const post = new THREE.Mesh(postGeo, darkTimberMat);
        post.position.set(px, -0.65, pz);
        post.castShadow = true;
        pierGroup.add(post);
      }
      if (idx < postPositions.length - 1) {
        const nextPx = postPositions[idx + 1];
        const span = nextPx - px;
        const railGeo = new THREE.CylinderGeometry(0.035, 0.035, span, 6);
        disposableGeometries.push(railGeo);
        for (const pz of [-widthZ * 0.44, widthZ * 0.44]) {
          const rail = new THREE.Mesh(railGeo, ochreAwningMat);
          rail.rotation.z = Math.PI * 0.5;
          rail.position.set((px + nextPx) * 0.5, 0.36, pz);
          pierGroup.add(rail);
        }
      }
    }

    swOasisGroup.add(pierGroup);
  };

  buildWoodenPier(
    SOUTHWEST_OASIS_POS.gazeboX,
    SOUTHWEST_OASIS_POS.gazeboZ,
    SOUTHWEST_OASIS_POS.gazeboDeckY,
    8.2,
    2.9
  );
  buildWoodenPier(
    SOUTHWEST_OASIS_POS.eastPierX,
    SOUTHWEST_OASIS_POS.eastPierZ,
    SOUTHWEST_OASIS_POS.eastPierDeckY,
    7.4,
    2.6
  );

  // ======================== 3. NORTHEAST GRAND ADOBE CITADEL & DOMED WATCHTOWER ======================== \\
  const obsGroup = new THREE.Group();
  obsGroup.position.set(
    SOUTHWEST_OASIS_POS.observatoryX - SOUTHWEST_OASIS_POS.x,
    0,
    SOUTHWEST_OASIS_POS.observatoryZ - SOUTHWEST_OASIS_POS.z
  );

  const obsPlinthGeo = new THREE.BoxGeometry(10.6, 0.36, 10.6);
  const lowerH = 8.0;
  const wallThick = 0.65;
  const obsNorthGeo = new THREE.BoxGeometry(9.8, lowerH, wallThick);
  const obsSideGeo = new THREE.BoxGeometry(wallThick, lowerH, 9.8);
  const southFlankGeo = new THREE.BoxGeometry(3.25, lowerH, wallThick);
  const southHeaderGeo = new THREE.BoxGeometry(3.4, lowerH - 3.2, wallThick);
  disposableGeometries.push(obsPlinthGeo, obsNorthGeo, obsSideGeo, southFlankGeo, southHeaderGeo);

  const obsPlinth = new THREE.Mesh(obsPlinthGeo, sandstoneTrimMat);
  obsPlinth.position.set(0, 0.18, 0);
  obsPlinth.receiveShadow = true;
  obsGroup.add(obsPlinth);

  const obsNorthLower = new THREE.Mesh(obsNorthGeo, adobeWallMat);
  obsNorthLower.position.set(0, lowerH * 0.5, -4.65);
  obsNorthLower.castShadow = true;
  obsNorthLower.receiveShadow = true;
  obsGroup.add(obsNorthLower);

  const obsWestLower = new THREE.Mesh(obsSideGeo, adobeWallMat);
  obsWestLower.position.set(-4.65, lowerH * 0.5, 0);
  obsWestLower.castShadow = true;
  obsWestLower.receiveShadow = true;
  obsGroup.add(obsWestLower);

  const obsEastLower = new THREE.Mesh(obsSideGeo, adobeWallMat);
  obsEastLower.position.set(4.65, lowerH * 0.5, 0);
  obsEastLower.castShadow = true;
  obsEastLower.receiveShadow = true;
  obsGroup.add(obsEastLower);

  for (const side of [-1, 1]) {
    const southFlank = new THREE.Mesh(southFlankGeo, adobeWallMat);
    southFlank.position.set(side * 3.15, lowerH * 0.5, 4.65);
    southFlank.castShadow = true;
    southFlank.receiveShadow = true;
    obsGroup.add(southFlank);
  }
  const southHeader = new THREE.Mesh(southHeaderGeo, adobeWallMat);
  southHeader.position.set(0, 3.2 + (lowerH - 3.2) * 0.5, 4.65);
  southHeader.castShadow = true;
  obsGroup.add(southHeader);

  addRoofVigas(obsGroup, 9.8, 9.8, lowerH - 0.35);

  // Upper Square Bell/Watchtower Shaft (y = 8.0..14.0m)
  const upperTowerH = 6.0;
  for (const [tx, tz, tw, td] of [
    [0, -4.45, 9.2, 0.6],
    [0, 4.45, 9.2, 0.6],
    [-4.45, 0, 0.6, 9.2],
    [4.45, 0, 0.6, 9.2],
  ] as const) {
    const shaftGeo = new THREE.BoxGeometry(tw, upperTowerH, td);
    disposableGeometries.push(shaftGeo);
    const shaftWall = new THREE.Mesh(shaftGeo, adobeWarmMat);
    shaftWall.position.set(tx, lowerH + upperTowerH * 0.5, tz);
    shaftWall.castShadow = true;
    shaftWall.receiveShadow = true;
    obsGroup.add(shaftWall);
  }

  // Arched dark window recesses on all 4 faces of the watchtower
  const winArchGeo = new THREE.BoxGeometry(1.35, 2.1, 0.18);
  const sillGeo = new THREE.BoxGeometry(1.65, 0.18, 0.32);
  disposableGeometries.push(winArchGeo, sillGeo);
  for (const wy of [5.4, 11.2]) {
    for (let f = 0; f < 4; f++) {
      const fGroup = new THREE.Group();
      fGroup.rotation.y = (f * Math.PI) / 2;
      const winArch = new THREE.Mesh(winArchGeo, windowRecessMat);
      winArch.position.set(0, wy, 4.72);
      fGroup.add(winArch);

      const sill = new THREE.Mesh(sillGeo, sandstoneTrimMat);
      sill.position.set(0, wy - 1.08, 4.76);
      fGroup.add(sill);
      obsGroup.add(fGroup);
    }
  }

  // Watchtower Observation Deck at y = 14.0m (world Y = 19.5m) with ladder hatch cutout
  const deckY = SOUTHWEST_OASIS_POS.observatoryTopDeckY - SOUTHWEST_OASIS_POS.terraceY;
  const deckFrontGeo = new THREE.BoxGeometry(9.6, 0.35, 6.2);
  const deckSideGeo = new THREE.BoxGeometry(3.4, 0.35, 3.4);
  disposableGeometries.push(deckFrontGeo, deckSideGeo);

  const deckFront = new THREE.Mesh(deckFrontGeo, sandstoneTrimMat);
  deckFront.position.set(0, deckY - 0.15, 1.5);
  deckFront.receiveShadow = true;
  obsGroup.add(deckFront);

  for (const side of [-1, 1]) {
    const deckSide = new THREE.Mesh(deckSideGeo, sandstoneTrimMat);
    deckSide.position.set(side * 3.1, deckY - 0.15, -3.1);
    obsGroup.add(deckSide);
  }

  for (const [px, pz, pw, pd] of [
    [0, -4.85, 9.8, 0.42],
    [0, 4.85, 9.8, 0.42],
    [-4.85, 0, 0.42, 9.8],
    [4.85, 0, 0.42, 9.8],
  ] as const) {
    const paraGeo = new THREE.BoxGeometry(pw, 1.15, pd);
    disposableGeometries.push(paraGeo);
    const para = new THREE.Mesh(paraGeo, sandstoneTrimMat);
    para.position.set(px, deckY + 0.55, pz);
    para.castShadow = true;
    obsGroup.add(para);
  }

  // 4 Corner Belfry Pillars + Rounded Sandstone Dome Crown
  const belfryPillarGeo = new THREE.BoxGeometry(0.85, 3.4, 0.85);
  const domeDrumGeo = new THREE.BoxGeometry(7.8, 0.65, 7.8);
  const sandstoneDomeGeo = new THREE.SphereGeometry(3.55, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const domeFinialGeo = new THREE.CylinderGeometry(0.08, 0.22, 0.95, 8);
  disposableGeometries.push(belfryPillarGeo, domeDrumGeo, sandstoneDomeGeo, domeFinialGeo);

  for (const cx of [-3.4, 3.4]) {
    for (const cz of [-3.4, 3.4]) {
      const belfryPillar = new THREE.Mesh(belfryPillarGeo, adobeWallMat);
      belfryPillar.position.set(cx, deckY + 1.7, cz);
      belfryPillar.castShadow = true;
      obsGroup.add(belfryPillar);
    }
  }
  const domeDrum = new THREE.Mesh(domeDrumGeo, sandstoneTrimMat);
  domeDrum.position.set(0, deckY + 3.65, 0);
  domeDrum.castShadow = true;
  obsGroup.add(domeDrum);

  const sandstoneDome = new THREE.Mesh(sandstoneDomeGeo, domePlasterMat);
  sandstoneDome.position.set(0, deckY + 3.9, 0);
  sandstoneDome.castShadow = true;
  sandstoneDome.receiveShadow = true;
  obsGroup.add(sandstoneDome);

  const domeFinial = new THREE.Mesh(domeFinialGeo, sandstoneTrimMat);
  domeFinial.position.set(0, deckY + 7.65, 0);
  obsGroup.add(domeFinial);

  // Interactive Double Door ('sw-observatory-door')
  const obsDoor = archAssets.createInteractiveDoubleDoor(
    SOUTHWEST_OASIS_POS.observatoryDoorId,
    0,
    0.2,
    4.65,
    2.5,
    3.0
  );
  obsGroup.add(obsDoor);

  // Interior Wooden Ladder ('sw-observatory-ladder') up to the 19.5m lookout deck
  const ladderLocalZ = SOUTHWEST_OASIS_POS.observatoryLadderZ - SOUTHWEST_OASIS_POS.observatoryZ;
  const railGeo = new THREE.CylinderGeometry(0.055, 0.055, deckY + 0.8, 8);
  const rungGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.84, 8);
  disposableGeometries.push(railGeo, rungGeo);

  for (const lx of [-0.42, 0.42]) {
    const rail = new THREE.Mesh(railGeo, darkTimberMat);
    rail.position.set(lx, (deckY + 0.8) * 0.5, ladderLocalZ);
    obsGroup.add(rail);
  }
  for (let ry = 0.6; ry <= deckY + 0.4; ry += 0.52) {
    const rung = new THREE.Mesh(rungGeo, darkTimberMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, ry, ladderLocalZ);
    obsGroup.add(rung);
  }

  // Citadel Southern Waterfront Shade Awning
  addClothAwning(obsGroup, 'south', 'ochre', 9.8, 9.8, 6.2, 3.8, 3.85);

  const citadelLight = new THREE.PointLight(0xffaa44, 1.8, 22);
  citadelLight.position.set(
    SOUTHWEST_OASIS_POS.observatoryX,
    SOUTHWEST_OASIS_POS.terraceY + 4.5,
    SOUTHWEST_OASIS_POS.observatoryZ + 5.2
  );
  scene.add(citadelLight);
  lanternLights.push(citadelLight);

  swOasisGroup.add(obsGroup);

  // ======================== 4. WEST ENTERABLE ADOBE MERCHANT HOUSE & TERRACOTTA CANOPY ======================== \\
  const pavGroup = new THREE.Group();
  pavGroup.position.set(
    SOUTHWEST_OASIS_POS.pavilionX - SOUTHWEST_OASIS_POS.x,
    0,
    SOUTHWEST_OASIS_POS.pavilionZ - SOUTHWEST_OASIS_POS.z
  );

  const pavH = 4.9;
  const pavFloorGeo = new THREE.BoxGeometry(10.8, 0.24, 13.0);
  const pavWestGeo = new THREE.BoxGeometry(0.5, pavH, 12.8);
  const pavNSGeo = new THREE.BoxGeometry(10.6, pavH, 0.5);
  const eastFlankGeo = new THREE.BoxGeometry(0.5, pavH, 4.95);
  const eastHeaderGeo = new THREE.BoxGeometry(0.5, pavH - 2.9, 2.8);
  const pavRoofGeo = new THREE.BoxGeometry(10.8, 0.35, 13.0);
  disposableGeometries.push(pavFloorGeo, pavWestGeo, pavNSGeo, eastFlankGeo, eastHeaderGeo, pavRoofGeo);

  const pavFloor = new THREE.Mesh(pavFloorGeo, sandstoneTrimMat);
  pavFloor.position.set(0, 0.12, 0);
  pavFloor.receiveShadow = true;
  pavGroup.add(pavFloor);

  const pavWestWall = new THREE.Mesh(pavWestGeo, adobeWallMat);
  pavWestWall.position.set(-5.15, pavH * 0.5, 0);
  pavWestWall.castShadow = true;
  pavWestWall.receiveShadow = true;
  pavGroup.add(pavWestWall);

  const pavNorthWall = new THREE.Mesh(pavNSGeo, adobeWallMat);
  pavNorthWall.position.set(0, pavH * 0.5, -6.3);
  pavNorthWall.castShadow = true;
  pavNorthWall.receiveShadow = true;
  pavGroup.add(pavNorthWall);

  const pavSouthWall = new THREE.Mesh(pavNSGeo, adobeWallMat);
  pavSouthWall.position.set(0, pavH * 0.5, 6.3);
  pavSouthWall.castShadow = true;
  pavSouthWall.receiveShadow = true;
  pavGroup.add(pavSouthWall);

  for (const side of [-1, 1]) {
    const eastFlank = new THREE.Mesh(eastFlankGeo, adobeWallMat);
    eastFlank.position.set(5.15, pavH * 0.5, side * 3.85);
    eastFlank.castShadow = true;
    eastFlank.receiveShadow = true;
    pavGroup.add(eastFlank);
  }
  const eastHeader = new THREE.Mesh(eastHeaderGeo, adobeWallMat);
  eastHeader.position.set(5.15, 2.9 + (pavH - 2.9) * 0.5, 0);
  eastHeader.castShadow = true;
  pavGroup.add(eastHeader);

  const pavRoof = new THREE.Mesh(pavRoofGeo, adobeWarmMat);
  pavRoof.position.set(0, pavH + 0.15, 0);
  pavRoof.castShadow = true;
  pavRoof.receiveShadow = true;
  pavGroup.add(pavRoof);

  addRoofVigas(pavGroup, 10.6, 12.8, pavH - 0.38);

  // Interactive Double Door ('sw-alchemist-door') on East wall
  const pavDoor = archAssets.createInteractiveDoubleDoor(
    SOUTHWEST_OASIS_POS.pavilionDoorId,
    0,
    0.2,
    0,
    2.5,
    2.75
  );
  pavDoor.position.set(5.15, 0, 0);
  pavDoor.rotation.y = Math.PI / 2;
  pavGroup.add(pavDoor);
  void doorPivotHandles;

  // Iconic Terracotta-Red Cloth Canopy & Market Crates/Barrels on the East facade
  addClothAwning(pavGroup, 'east', 'terracotta', 10.6, 12.8, 8.6, 3.8, 4.1);

  // Interior merchant worktable, spice jars & woven desert carpet
  const rugGeo = new THREE.BoxGeometry(5.6, 0.04, 7.6);
  const tableGeo = new THREE.BoxGeometry(1.5, 0.92, 4.4);
  const jarGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.48, 10);
  disposableGeometries.push(rugGeo, tableGeo, jarGeo);

  const rugMesh = new THREE.Mesh(rugGeo, terracottaAwningMat);
  rugMesh.position.set(-0.6, 0.25, 0);
  rugMesh.receiveShadow = true;
  pavGroup.add(rugMesh);

  const merchantTable = new THREE.Mesh(tableGeo, darkTimberMat);
  merchantTable.position.set(-3.2, 0.68, 0);
  merchantTable.castShadow = true;
  pavGroup.add(merchantTable);

  for (let j = -1; j <= 1; j++) {
    const jar = new THREE.Mesh(jarGeo, clayPotMat);
    jar.position.set(-3.2, 1.38, j * 1.15);
    pavGroup.add(jar);
  }

  const pavLight = new THREE.PointLight(0xffaa44, 1.5, 18);
  pavLight.position.set(
    SOUTHWEST_OASIS_POS.pavilionX + 3.0,
    SOUTHWEST_OASIS_POS.terraceY + 3.6,
    SOUTHWEST_OASIS_POS.pavilionZ
  );
  scene.add(pavLight);
  lanternLights.push(pavLight);

  swOasisGroup.add(pavGroup);

  // ======================== 5. RING OF 7 SANDSTONE ADOBE VILLAGE HOUSES ======================== \\
  const buildAdobeVillageHouse = (spec: OasisVillageHouseSpec): void => {
    const hGroup = new THREE.Group();
    hGroup.position.set(
      spec.x - SOUTHWEST_OASIS_POS.x,
      0,
      spec.z - SOUTHWEST_OASIS_POS.z
    );

    const bodyGeo = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
    const parapetGeo = new THREE.BoxGeometry(spec.w + 0.18, 0.42, spec.d + 0.18);
    disposableGeometries.push(bodyGeo, parapetGeo);

    const mainBody = new THREE.Mesh(bodyGeo, adobeWallMat);
    mainBody.position.set(0, spec.h * 0.5, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    hGroup.add(mainBody);

    const parapet = new THREE.Mesh(parapetGeo, sandstoneTrimMat);
    parapet.position.set(0, spec.h + 0.15, 0);
    parapet.castShadow = true;
    hGroup.add(parapet);

    addRoofVigas(hGroup, spec.w, spec.d, spec.h - 0.35);

    const doorSide = spec.awningSide ?? 'south';
    const facadeGroup = new THREE.Group();
    if (doorSide === 'north') facadeGroup.rotation.y = Math.PI;
    else if (doorSide === 'east') facadeGroup.rotation.y = Math.PI * 0.5;
    else if (doorSide === 'west') facadeGroup.rotation.y = -Math.PI * 0.5;

    const frontDepth =
      doorSide === 'east' || doorSide === 'west' ? spec.w * 0.5 : spec.d * 0.5;
    const frontSpan =
      doorSide === 'east' || doorSide === 'west' ? spec.d : spec.w;

    const doorGeo = new THREE.BoxGeometry(1.25, 2.25, 0.12);
    const winGeo = new THREE.BoxGeometry(0.95, 1.15, 0.12);
    const winSillGeo = new THREE.BoxGeometry(1.15, 0.14, 0.22);
    disposableGeometries.push(doorGeo, winGeo, winSillGeo);

    const doorMesh = new THREE.Mesh(doorGeo, darkTimberMat);
    doorMesh.position.set(0, 1.12, frontDepth + 0.03);
    facadeGroup.add(doorMesh);

    for (const wx of [-frontSpan * 0.28, frontSpan * 0.28]) {
      const winMesh = new THREE.Mesh(winGeo, darkTimberMat);
      winMesh.position.set(wx, 2.2, frontDepth + 0.03);
      facadeGroup.add(winMesh);

      const sillMesh = new THREE.Mesh(winSillGeo, sandstoneTrimMat);
      sillMesh.position.set(wx, 1.58, frontDepth + 0.06);
      facadeGroup.add(sillMesh);
    }
    hGroup.add(facadeGroup);

    if (spec.secondStory) {
      const s = spec.secondStory;
      const upperGeo = new THREE.BoxGeometry(s.w, s.h, s.d);
      const upperParapetGeo = new THREE.BoxGeometry(s.w + 0.16, 0.36, s.d + 0.16);
      disposableGeometries.push(upperGeo, upperParapetGeo);

      const upperBody = new THREE.Mesh(upperGeo, adobeWarmMat);
      upperBody.position.set(s.offsetX, spec.h + s.h * 0.5, s.offsetZ);
      upperBody.castShadow = true;
      upperBody.receiveShadow = true;
      hGroup.add(upperBody);

      const upperParapet = new THREE.Mesh(upperParapetGeo, sandstoneTrimMat);
      upperParapet.position.set(s.offsetX, spec.h + s.h + 0.14, s.offsetZ);
      upperParapet.castShadow = true;
      hGroup.add(upperParapet);

      const upperVigaGroup = new THREE.Group();
      upperVigaGroup.position.set(s.offsetX, 0, s.offsetZ);
      addRoofVigas(upperVigaGroup, s.w, s.d, spec.h + s.h - 0.32);
      hGroup.add(upperVigaGroup);
    }

    if (spec.awningSide && spec.awningW && spec.awningD) {
      addClothAwning(
        hGroup,
        spec.awningSide,
        spec.awningColor ?? 'ochre',
        spec.w,
        spec.d,
        spec.awningW,
        spec.awningD,
        3.55
      );
    }

    swOasisGroup.add(hGroup);
  };

  for (const houseSpec of SOUTHWEST_OASIS_VILLAGE_HOUSES) {
    buildAdobeVillageHouse(houseSpec);
  }

  // ======================== 6. LOW DRY-STONE SANDSTONE COURTYARD WALLS ======================== \\
  for (const wallSpec of SOUTHWEST_OASIS_STONE_WALLS) {
    const wallGroup = new THREE.Group();
    wallGroup.position.set(
      wallSpec.x - SOUTHWEST_OASIS_POS.x,
      0,
      wallSpec.z - SOUTHWEST_OASIS_POS.z
    );

    const wallBaseGeo = new THREE.BoxGeometry(wallSpec.w, wallSpec.h, wallSpec.d);
    disposableGeometries.push(wallBaseGeo);
    const wallBase = new THREE.Mesh(wallBaseGeo, dryStoneWallMat);
    wallBase.position.set(0, wallSpec.h * 0.5, 0);
    wallBase.castShadow = true;
    wallBase.receiveShadow = true;
    wallGroup.add(wallBase);

    const isAlongZ = wallSpec.d > wallSpec.w;
    const length = isAlongZ ? wallSpec.d : wallSpec.w;
    const blockCount = Math.max(3, Math.floor(length / 1.1));
    const capBlockGeo = new THREE.BoxGeometry(
      isAlongZ ? wallSpec.w * 1.06 : 0.92,
      0.26,
      isAlongZ ? 0.92 : wallSpec.d * 1.06
    );
    disposableGeometries.push(capBlockGeo);

    for (let b = 0; b < blockCount; b++) {
      const offset = -length * 0.45 + (b / Math.max(1, blockCount - 1)) * (length * 0.9);
      const capBlock = new THREE.Mesh(capBlockGeo, sandstoneTrimMat);
      capBlock.position.set(
        isAlongZ ? 0 : offset,
        wallSpec.h + 0.08,
        isAlongZ ? offset : 0
      );
      capBlock.rotation.y = ((b % 3) - 1) * 0.03;
      capBlock.castShadow = true;
      wallGroup.add(capBlock);
    }

    swOasisGroup.add(wallGroup);
  }

  // ======================== 7. LUSH OASIS DATE PALM GROVE (24 CURVED PALMS) ======================== \\
  const crownBulbGeo = new THREE.SphereGeometry(0.42, 8, 6);
  const innerFrondGeo = new THREE.BoxGeometry(0.72, 0.06, 2.2);
  const outerFrondGeo = new THREE.ConeGeometry(0.46, 1.95, 4);
  disposableGeometries.push(crownBulbGeo, innerFrondGeo, outerFrondGeo);

  for (const palm of SOUTHWEST_OASIS_PALMS) {
    const palmGroup = new THREE.Group();
    const groundY =
      groundHeightAt(SOUTHWEST_OASIS_POS.x + palm.dx, SOUTHWEST_OASIS_POS.z + palm.dz) -
      SOUTHWEST_OASIS_POS.terraceY;
    palmGroup.position.set(palm.dx, Math.max(-0.2, groundY), palm.dz);
    palmGroup.scale.setScalar(palm.scale);

    const segCount = 7;
    const segH = 1.08;
    let curX = 0;
    let curY = 0;
    let curZ = 0;
    for (let s = 0; s < segCount; s++) {
      const t = s / segCount;
      const rBot = 0.36 * (1.0 - t * 0.38);
      const rTop = 0.36 * (1.0 - ((s + 1) / segCount) * 0.38);
      const stepX = palm.leanX * (t + 0.15) * 0.55;
      const stepZ = palm.leanZ * (t + 0.15) * 0.55;

      const segGeo = new THREE.CylinderGeometry(rTop, rBot, segH + 0.08, 9);
      disposableGeometries.push(segGeo);
      const segMesh = new THREE.Mesh(
        segGeo,
        s % 2 === 0 ? palmTrunkMat : palmRingMat
      );
      segMesh.position.set(curX + stepX * 0.5, curY + segH * 0.5, curZ + stepZ * 0.5);
      segMesh.rotation.z = -palm.leanX * (0.25 + t * 0.35);
      segMesh.rotation.x = palm.leanZ * (0.25 + t * 0.35);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      palmGroup.add(segMesh);

      curX += stepX;
      curY += segH;
      curZ += stepZ;
    }

    const crownGroup = new THREE.Group();
    crownGroup.position.set(curX, curY, curZ);

    const crownBulb = new THREE.Mesh(crownBulbGeo, palmRingMat);
    crownGroup.add(crownBulb);

    for (let tier = 0; tier < 2; tier++) {
      const frondCount = tier === 0 ? 8 : 6;
      for (let f = 0; f < frondCount; f++) {
        const fAng =
          (f / frondCount) * Math.PI * 2 +
          tier * 0.4 +
          (palm.seed % 7) * 0.2;
        const frondPivot = new THREE.Group();
        frondPivot.rotation.y = fAng;

        const pitch = tier === 0 ? 0.42 : 0.15;
        const innerBlade = new THREE.Mesh(innerFrondGeo, palmFrondMat);
        innerBlade.position.set(0, 0.35, 1.05);
        innerBlade.rotation.x = pitch;
        innerBlade.castShadow = true;
        frondPivot.add(innerBlade);

        const outerTip = new THREE.Mesh(outerFrondGeo, palmFrondMat);
        outerTip.scale.set(1.0, 1.0, 0.22);
        outerTip.position.set(0, 0.08 - tier * 0.12, 2.65);
        outerTip.rotation.x = Math.PI * 0.58 + pitch * 0.5;
        outerTip.castShadow = true;
        frondPivot.add(outerTip);

        crownGroup.add(frondPivot);
      }
    }

    palmGroup.add(crownGroup);
    swOasisGroup.add(palmGroup);
  }

  // ======================== 7. OASIS HIPPO MUD WALLOW, PAPYRUS REEDS & LOTUS PADS ======================== \\
  const hippoMudMat = new THREE.MeshStandardMaterial({
    color: 0x5c432c,
    roughness: 0.94,
    metalness: 0.04,
  });
  const papyrusGreenMat = new THREE.MeshStandardMaterial({
    color: 0x3f6e2a,
    roughness: 0.85,
  });
  const lilyPadMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a36,
    roughness: 0.78,
  });
  const lotusPetalPinkMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.65,
  });
  const lotusCenterGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.55,
  });
  const mudBankGeo = new THREE.CylinderGeometry(2.4, 3.2, 0.28, 12);
  const baskingStoneGeo = new THREE.DodecahedronGeometry(0.95, 1);
  baskingStoneGeo.scale(1.45, 0.52, 1.15);
  const papyrusStemGeo = new THREE.CylinderGeometry(0.035, 0.055, 2.2, 5);
  papyrusStemGeo.translate(0, 1.1, 0);
  const papyrusCrownGeo = new THREE.ConeGeometry(0.32, 0.42, 6);
  papyrusCrownGeo.rotateX(Math.PI);
  papyrusCrownGeo.translate(0, 2.22, 0);
  const lilyPadGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.03, 12);
  const lotusBlossomGeo = new THREE.DodecahedronGeometry(0.18, 0);
  const lotusCoreGeo = new THREE.SphereGeometry(0.08, 6, 6);
  disposableMaterials.push(
    hippoMudMat,
    papyrusGreenMat,
    lilyPadMat,
    lotusPetalPinkMat,
    lotusCenterGoldMat
  );
  disposableGeometries.push(
    mudBankGeo,
    baskingStoneGeo,
    papyrusStemGeo,
    papyrusCrownGeo,
    lilyPadGeo,
    lotusBlossomGeo,
    lotusCoreGeo
  );

  const oasisWaterY = SOUTHWEST_OASIS_POS.lagoonWaterY;
  const mudBankOffsets: ReadonlyArray<readonly [number, number, number]> = [
    [-7.5, -2.5, 1.15],
    [7.2, 3.4, 1.05],
    [-2.8, 7.8, 1.25],
    [4.6, -7.2, 0.95],
  ];
  for (let i = 0; i < mudBankOffsets.length; i++) {
    const [mx, mz, mScale] = mudBankOffsets[i];
    const wy = groundHeightAt(SOUTHWEST_OASIS_POS.x + mx, SOUTHWEST_OASIS_POS.z + mz);
    const mudMesh = new THREE.Mesh(mudBankGeo, hippoMudMat);
    mudMesh.position.set(mx, Math.max(wy - 0.05, oasisWaterY - 0.08), mz);
    mudMesh.scale.set(mScale, 1, mScale * 0.88);
    mudMesh.rotation.y = i * 1.1;
    mudMesh.receiveShadow = true;
    swOasisGroup.add(mudMesh);

    const baskRock = new THREE.Mesh(baskingStoneGeo, dryStoneWallMat);
    baskRock.position.set(mx * 0.88, oasisWaterY + 0.06, mz * 0.88);
    baskRock.rotation.y = i * 1.7;
    baskRock.castShadow = true;
    baskRock.receiveShadow = true;
    swOasisGroup.add(baskRock);
  }

  // Papyrus reed clumps along the oasis lagoon perimeter
  for (let p = 0; p < 14; p++) {
    const ang = (p / 14) * Math.PI * 2 + 0.22;
    const rad = 8.2 + (p % 3) * 1.4;
    const px = Math.cos(ang) * rad;
    const pz = Math.sin(ang) * rad;
    const py = Math.max(
      groundHeightAt(SOUTHWEST_OASIS_POS.x + px, SOUTHWEST_OASIS_POS.z + pz) - 0.1,
      oasisWaterY - 0.18
    );
    for (let s = 0; s < 3; s++) {
      const sx = px + (s - 1) * 0.24;
      const sz = pz + ((s % 2) - 0.5) * 0.24;
      const stem = new THREE.Mesh(papyrusStemGeo, papyrusGreenMat);
      stem.position.set(sx, py, sz);
      stem.rotation.z = (s - 1) * 0.09;
      const crown = new THREE.Mesh(papyrusCrownGeo, palmFrondMat);
      crown.position.set(sx, py, sz);
      crown.rotation.z = (s - 1) * 0.09;
      swOasisGroup.add(stem, crown);
    }
  }

  // Floating Lotus Lily Pads in the Oasis Lagoon (for Oasis Koi Fish & Hippos)
  for (let l = 0; l < 16; l++) {
    const lang = l * 1.37;
    const lrad = 2.4 + (l % 5) * 1.35;
    const lx = Math.cos(lang) * lrad;
    const lz = Math.sin(lang) * lrad;
    const pad = new THREE.Mesh(lilyPadGeo, lilyPadMat);
    pad.position.set(lx, oasisWaterY + 0.025, lz);
    const padScale = 0.75 + (l % 3) * 0.22;
    pad.scale.set(padScale, 1, padScale);
    swOasisGroup.add(pad);
    if (l % 2 === 0) {
      const blossom = new THREE.Mesh(lotusBlossomGeo, lotusPetalPinkMat);
      blossom.position.set(lx, oasisWaterY + 0.11, lz);
      const core = new THREE.Mesh(lotusCoreGeo, lotusCenterGoldMat);
      core.position.set(lx, oasisWaterY + 0.17, lz);
      swOasisGroup.add(blossom, core);
    }
  }

  scene.add(swOasisGroup);
  distanceCulledObjects.push({
    obj: swOasisGroup,
    cx: SOUTHWEST_OASIS_POS.x,
    cz: SOUTHWEST_OASIS_POS.z,
    radius: 75.0,
  });

  // ======================== 8. MURKY SWAMP & HIPPO MARSH BIOME (-175, 435) ======================== \\
  const murkySwampGroup = new THREE.Group();
  murkySwampGroup.position.set(MURKY_SWAMP_BIOME_POS.x, 0, MURKY_SWAMP_BIOME_POS.z);

  const swampCypressBarkMat = new THREE.MeshStandardMaterial({
    color: 0x3b3126,
    roughness: 0.92,
  });
  const swampCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x2e4a21,
    roughness: 0.85,
  });
  const spanishMossMat = new THREE.MeshStandardMaterial({
    color: 0x657d52,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const cattailHeadMat = new THREE.MeshStandardMaterial({
    color: 0x4a2c18,
    roughness: 0.88,
  });
  const swampMossRockMat = new THREE.MeshStandardMaterial({
    color: 0x364231,
    roughness: 0.9,
  });
  attachWindSwayShader(swampCanopyMat, 0.14, 1.3, swayMaterials);
  attachWindSwayShader(spanishMossMat, 0.22, 1.7, swayMaterials);

  const cypressTrunkGeo = new THREE.CylinderGeometry(0.32, 0.72, 6.2, 8);
  cypressTrunkGeo.translate(0, 3.1, 0);
  const cypressRootGeo = new THREE.ConeGeometry(0.45, 1.8, 6);
  cypressRootGeo.translate(0, 0.75, 0);
  const cypressBranchGeo = new THREE.CylinderGeometry(0.12, 0.24, 3.2, 6);
  cypressBranchGeo.translate(0, 1.6, 0);
  const cypressCanopyGeo = new THREE.IcosahedronGeometry(2.35, 1);
  cypressCanopyGeo.scale(1.35, 0.52, 1.35);
  const spanishMossGeo = new THREE.ConeGeometry(0.26, 2.2, 5);
  spanishMossGeo.translate(0, -1.1, 0);
  const cattailSpikeGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.38, 6);
  cattailSpikeGeo.translate(0, 1.55, 0);
  const fallenSwampLogGeo = new THREE.CylinderGeometry(0.32, 0.38, 4.8, 8);
  fallenSwampLogGeo.rotateZ(Math.PI * 0.5);
  const swampBoulderGeo = new THREE.DodecahedronGeometry(1.15, 1);

  disposableGeometries.push(
    cypressTrunkGeo,
    cypressRootGeo,
    cypressBranchGeo,
    cypressCanopyGeo,
    spanishMossGeo,
    cattailSpikeGeo,
    fallenSwampLogGeo,
    swampBoulderGeo
  );
  disposableMaterials.push(
    swampCypressBarkMat,
    swampCanopyMat,
    spanishMossMat,
    cattailHeadMat,
    swampMossRockMat
  );

  // Gnarled Bald-Cypress / Swamp Willow trees with buttress roots & hanging Spanish moss
  const swampTreeOffsets: ReadonlyArray<readonly [number, number, number]> = [
    [-22.0, -18.0, 1.15],
    [-8.0, -28.0, 1.05],
    [16.0, -24.0, 1.22],
    [32.0, -10.0, 1.08],
    [42.0, 8.0, 1.18],
    [18.0, 34.0, 1.12],
    [-12.0, 32.0, 1.25],
    [-34.0, 16.0, 1.04],
    [-46.0, -6.0, 1.16],
    [6.0, -12.0, 0.96],
    [-26.0, 4.0, 1.08],
    [28.0, 26.0, 1.14],
    [-4.0, 48.0, 1.1],
    [-38.0, 38.0, 1.02],
  ];

  for (let t = 0; t < swampTreeOffsets.length; t++) {
    const [lx, lz, tScale] = swampTreeOffsets[t];
    const wx = MURKY_SWAMP_BIOME_POS.x + lx;
    const wz = MURKY_SWAMP_BIOME_POS.z + lz;
    const gy = groundHeightAt(wx, wz);
    const baseY = Math.max(WATER_LEVEL - 0.35, gy - 0.12);

    const treeGroup = new THREE.Group();
    treeGroup.position.set(lx, baseY, lz);
    treeGroup.scale.setScalar(tScale);
    treeGroup.rotation.y = t * 1.17;

    const trunk = new THREE.Mesh(cypressTrunkGeo, swampCypressBarkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    for (let r = 0; r < 5; r++) {
      const ang = (r / 5) * Math.PI * 2 + 0.3;
      const root = new THREE.Mesh(cypressRootGeo, swampCypressBarkMat);
      root.position.set(Math.cos(ang) * 0.55, 0, Math.sin(ang) * 0.55);
      root.rotation.z = -Math.cos(ang) * 0.38;
      root.rotation.x = Math.sin(ang) * 0.38;
      treeGroup.add(root);
    }

    for (let b = 0; b < 4; b++) {
      const bAng = (b / 4) * Math.PI * 2 + (t % 2) * 0.5;
      const branch = new THREE.Mesh(cypressBranchGeo, swampCypressBarkMat);
      branch.position.set(0, 4.4 + (b % 2) * 0.65, 0);
      branch.rotation.y = bAng;
      branch.rotation.z = 0.72;
      treeGroup.add(branch);

      const cx = Math.sin(0.72) * Math.cos(bAng) * 2.55;
      const cz = -Math.sin(0.72) * Math.sin(bAng) * 2.55;
      const cy = 4.4 + (b % 2) * 0.65 + Math.cos(0.72) * 2.55;

      const subCanopy = new THREE.Mesh(cypressCanopyGeo, swampCanopyMat);
      subCanopy.position.set(cx, cy, cz);
      subCanopy.scale.setScalar(0.78);
      subCanopy.castShadow = true;
      treeGroup.add(subCanopy);

      const moss = new THREE.Mesh(spanishMossGeo, spanishMossMat);
      moss.position.set(cx * 0.85, cy - 0.15, cz * 0.85);
      treeGroup.add(moss);
    }

    const topCanopy = new THREE.Mesh(cypressCanopyGeo, swampCanopyMat);
    topCanopy.position.set(0, 6.3, 0);
    topCanopy.castShadow = true;
    treeGroup.add(topCanopy);

    murkySwampGroup.add(treeGroup);
  }

  // Fallen mossy swamp logs & shoreline cattail/reed clusters & floating lilypads
  const swampLogSpots: ReadonlyArray<readonly [number, number, number]> = [
    [-14.0, -6.0, 0.45],
    [12.0, 6.0, -0.62],
    [22.0, 14.0, 1.15],
    [-20.0, 22.0, 0.28],
    [4.0, 28.0, -0.35],
    [-32.0, -14.0, 0.88],
  ];
  for (let l = 0; l < swampLogSpots.length; l++) {
    const [lx, lz, rotY] = swampLogSpots[l];
    const gy = groundHeightAt(MURKY_SWAMP_BIOME_POS.x + lx, MURKY_SWAMP_BIOME_POS.z + lz);
    const logMesh = new THREE.Mesh(fallenSwampLogGeo, swampCypressBarkMat);
    logMesh.position.set(lx, Math.max(WATER_LEVEL - 0.08, gy + 0.16), lz);
    logMesh.rotation.y = rotY;
    logMesh.rotation.z = 0.06;
    logMesh.castShadow = true;
    logMesh.receiveShadow = true;
    murkySwampGroup.add(logMesh);
  }

  // Dense cattails, bulrushes, lilypad rafts & lotus blooms around the swamp lagoons
  const swampFloraRings: ReadonlyArray<readonly [number, number, number]> = [
    [0.0, 0.0, 16.5],
    [27.0, 17.0, 15.0],
    [-18.0, 14.0, 12.0],
    [8.0, -18.0, 13.5],
    [-24.0, -12.0, 12.5],
  ];
  for (let ringIdx = 0; ringIdx < swampFloraRings.length; ringIdx++) {
    const [cx, cz, radius] = swampFloraRings[ringIdx];
    const clusterCount = 12;
    for (let c = 0; c < clusterCount; c++) {
      const ang = (c / clusterCount) * Math.PI * 2 + ringIdx * 0.7;
      const rDist = radius * (0.72 + ((c * 7 + ringIdx * 3) % 5) * 0.11);
      const fx = cx + Math.cos(ang) * rDist;
      const fz = cz + Math.sin(ang) * rDist;
      const gy = groundHeightAt(MURKY_SWAMP_BIOME_POS.x + fx, MURKY_SWAMP_BIOME_POS.z + fz);

      if (gy <= WATER_LEVEL - 0.12) {
        // Floating lilypad & swamp blossom in open water pool
        const pad = new THREE.Mesh(lilyPadGeo, lilyPadMat);
        pad.position.set(fx, WATER_LEVEL + 0.025, fz);
        pad.rotation.y = ang * 1.7;
        pad.scale.setScalar(0.95 + (c % 3) * 0.25);
        murkySwampGroup.add(pad);

        if (c % 3 === 0) {
          const blossom = new THREE.Mesh(lotusBlossomGeo, lotusPetalPinkMat);
          blossom.position.set(fx, WATER_LEVEL + 0.11, fz);
          murkySwampGroup.add(blossom);
        }
      } else if (gy <= WATER_LEVEL + 0.38) {
        // Shoreline cattail & sedge reed clump
        for (let s = 0; s < 3; s++) {
          const sx = fx + Math.cos(ang + s * 2.1) * 0.42;
          const sz = fz + Math.sin(ang + s * 2.1) * 0.42;
          const stem = new THREE.Mesh(papyrusStemGeo, papyrusGreenMat);
          stem.position.set(sx, gy - 0.08, sz);
          murkySwampGroup.add(stem);

          if (s === 0) {
            const spike = new THREE.Mesh(cattailSpikeGeo, cattailHeadMat);
            spike.position.set(sx, gy - 0.08, sz);
            murkySwampGroup.add(spike);
          } else {
            const crown = new THREE.Mesh(papyrusCrownGeo, palmFrondMat);
            crown.position.set(sx, gy - 0.08, sz);
            murkySwampGroup.add(crown);
          }
        }
      } else if (c % 4 === 0) {
        // Mossy hummock boulder
        const boulder = new THREE.Mesh(swampBoulderGeo, swampMossRockMat);
        boulder.position.set(fx, gy + 0.12, fz);
        boulder.scale.set(1.2, 0.68, 1.05);
        boulder.rotation.y = ang;
        murkySwampGroup.add(boulder);
      }
    }
  }

  scene.add(murkySwampGroup);
  distanceCulledObjects.push({
    obj: murkySwampGroup,
    cx: MURKY_SWAMP_BIOME_POS.x,
    cz: MURKY_SWAMP_BIOME_POS.z,
    radius: 110.0,
  });

  // ======================== 9. SOUTHEAST HARBOR BAY & COASTAL DOLPHIN REEF (330, 256) ======================== \\
  const dolphinReefGroup = new THREE.Group();
  dolphinReefGroup.position.set(330, 0, 256);
  const reefRockGeo = new THREE.DodecahedronGeometry(1.6, 1);
  const kelpBladeGeo = new THREE.ConeGeometry(0.22, 2.4, 5);
  kelpBladeGeo.translate(0, 1.2, 0);
  const reefCoralMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.65,
  });
  disposableGeometries.push(reefRockGeo, kelpBladeGeo);
  disposableMaterials.push(reefCoralMat);

  const reefSpots: ReadonlyArray<readonly [number, number, number]> = [
    [-12.0, -14.0, 1.15],
    [8.5, -6.0, 0.95],
    [16.0, 14.0, 1.25],
    [-6.5, 18.0, 1.05],
  ];
  for (let r = 0; r < reefSpots.length; r++) {
    const [rx, rz, rScale] = reefSpots[r];
    const seaStack = new THREE.Mesh(reefRockGeo, dryStoneWallMat);
    seaStack.position.set(rx, WATER_LEVEL - 0.35, rz);
    seaStack.scale.set(rScale * 1.3, rScale * 0.75, rScale * 1.1);
    seaStack.rotation.y = r * 1.2;
    dolphinReefGroup.add(seaStack);

    const coral = new THREE.Mesh(lotusBlossomGeo, reefCoralMat);
    coral.position.set(rx + 0.8, WATER_LEVEL - 0.18, rz - 0.6);
    coral.scale.setScalar(2.1);
    dolphinReefGroup.add(coral);

    for (let k = 0; k < 3; k++) {
      const kelp = new THREE.Mesh(kelpBladeGeo, papyrusGreenMat);
      kelp.position.set(rx + (k - 1) * 0.7, WATER_LEVEL - 1.85, rz + (k % 2) * 0.6);
      kelp.rotation.z = (k - 1) * 0.14;
      dolphinReefGroup.add(kelp);
    }
  }
  scene.add(dolphinReefGroup);
  distanceCulledObjects.push({ obj: dolphinReefGroup, cx: 330, cz: 256, radius: 42 });

  return {
    updateOasis: (elapsedTime: number) => {
      oasisLagoonWaterMat.emissiveIntensity =
        0.22 + Math.sin(elapsedTime * 2.2) * 0.06;
    },
  };
}

