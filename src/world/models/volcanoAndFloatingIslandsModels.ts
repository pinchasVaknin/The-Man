// ============================================================================
// MODULE: World / Models / Volcano Sanctum & Floating Blooming Islands (SRP)
// DESIGN: Procedural 3D landmark builders for the Western Volcano Sanctum
//         (lair of the Mystical CatLion) and Eastern Floating Blooming Sky Islands
//         (habitat of the Royal Stag herd).
// ============================================================================

import * as THREE from 'three';
import {
  VOLCANO_SANCTUM_POS,
  FLOATING_BLOOMING_ISLANDS,
  FLOATING_ISLAND_STAIR_POS,
  floatingBloomingIslandHeightAt,
  isWithinViewDistance,
  VIEW_DISTANCE,
} from '../terrainMath';
import { attachWindSwayShader, perturbGeometryVertices } from '../builders/shaderAndMaterialBuilders';
import type { IWorldModelBuildContext } from './types';

export interface IVolcanoAndFloatingIslandsResult {
  readonly volcanoGroup: THREE.Group;
  readonly floatingIslandsGroup: THREE.Group;
  readonly updateVolcanoAndFloatingIslands: (
    elapsedTime: number,
    playerX: number,
    playerZ: number
  ) => void;
}

/**
 * Summary: Constructs the Western Volcano Sanctum (with enterable obsidian tunnel,
 *          subterranean magma chamber, lava moat, and Mystical CatLion throne dais)
 *          and the 3 Large Floating Blooming Sky Islands (with sakura trees, wildflowers,
 *          hanging vines, floral sky-bridges, and ascending sky-stairway).
 */
export function buildVolcanoAndFloatingIslandsModels(
  ctx: IWorldModelBuildContext
): IVolcanoAndFloatingIslandsResult {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    swayMaterials,
    distanceCulledObjects,
  } = ctx;

  // ==========================================================================
  // PART 1: WESTERN VOLCANO SANCTUM (MYSTICAL CAT-LION LAIR)
  // ==========================================================================
  const volcanoGroup = new THREE.Group();
  volcanoGroup.position.set(
    VOLCANO_SANCTUM_POS.x,
    VOLCANO_SANCTUM_POS.floorY,
    VOLCANO_SANCTUM_POS.z
  );

  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x26211f,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.16,
    roughness: 0.9,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x181416,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.1,
    roughness: 0.38,
    metalness: 0.32,
    side: THREE.DoubleSide,
  });
  const magmaMat = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff3300,
    emissiveIntensity: 2.2,
    roughness: 0.25,
    metalness: 0.05,
  });
  const magmaCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xffaa22,
    emissive: 0xff4500,
    emissiveIntensity: 2.6,
    roughness: 0.2,
    metalness: 0.15,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.3,
    metalness: 0.82,
  });

  disposableMaterials.push(basaltMat, obsidianMat, magmaMat, magmaCrystalMat, goldTrimMat);

  // 1A. Subterranean Chamber Floor, Lava Moat & Entrance Tunnel Causeway
  const chamberFloorGeo = new THREE.CylinderGeometry(14.0, 14.4, 0.6, 32);
  const lavaMoatGeo = new THREE.RingGeometry(13.6, 18.2, 36);
  lavaMoatGeo.rotateX(-Math.PI / 2);
  const tunnelFloorGeo = new THREE.BoxGeometry(36.0, 0.6, 11.2);
  const daisStep1Geo = new THREE.CylinderGeometry(5.4, 5.8, 0.24, 8);
  const daisStep2Geo = new THREE.CylinderGeometry(4.1, 4.5, 0.26, 8);
  const daisTrimRingGeo = new THREE.TorusGeometry(4.15, 0.12, 8, 24);
  daisTrimRingGeo.rotateX(Math.PI / 2);

  disposableGeometries.push(
    chamberFloorGeo,
    lavaMoatGeo,
    tunnelFloorGeo,
    daisStep1Geo,
    daisStep2Geo,
    daisTrimRingGeo
  );

  const chamberFloor = new THREE.Mesh(chamberFloorGeo, obsidianMat);
  chamberFloor.position.set(0, -0.3, 0);
  chamberFloor.receiveShadow = !isSoftwareGl;
  volcanoGroup.add(chamberFloor);

  const lavaMoatMesh = new THREE.Mesh(lavaMoatGeo, magmaMat);
  lavaMoatMesh.position.set(0, -0.04, 0);
  volcanoGroup.add(lavaMoatMesh);

  const tunnelFloor = new THREE.Mesh(tunnelFloorGeo, obsidianMat);
  tunnelFloor.position.set(27.0, -0.28, 0);
  tunnelFloor.receiveShadow = !isSoftwareGl;
  volcanoGroup.add(tunnelFloor);

  // Mystical CatLion Throne Dais at local (-1.0, 0, 0) -> world (-266, 3.2..3.65, 115)
  const daisStep1 = new THREE.Mesh(daisStep1Geo, obsidianMat);
  daisStep1.position.set(-1.0, 0.12, 0);
  daisStep1.receiveShadow = !isSoftwareGl;
  const daisStep2 = new THREE.Mesh(daisStep2Geo, obsidianMat);
  daisStep2.position.set(-1.0, 0.32, 0);
  daisStep2.receiveShadow = !isSoftwareGl;
  const daisTrim = new THREE.Mesh(daisTrimRingGeo, goldTrimMat);
  daisTrim.position.set(-1.0, 0.45, 0);
  volcanoGroup.add(daisStep1, daisStep2, daisTrim);

  // 1B. Sculpted Vaulted Inner Sanctum Dome (radius 18.6m, height 13.5m) with open eastern tunnel throat
  const buildVolcanoChamberDomeGeo = (): THREE.BufferGeometry => {
    const azSegs = 48;
    const elSegs = 20;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const rx = 18.6;
    const rz = 18.6;
    const ry = 13.6;

    for (let ie = 0; ie <= elSegs; ie++) {
      const v = ie / elSegs;
      const phi = v * (Math.PI * 0.5);
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);
      for (let ia = 0; ia <= azSegs; ia++) {
        const u = ia / azSegs;
        const ang = u * Math.PI * 2;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        const crag = Math.sin(ang * 7.0 + phi * 5.0) * 0.45 * sinP;
        const x = cosA * (rx * cosP + crag);
        const y = -0.3 + Math.pow(sinP, 0.85) * ry;
        const z = sinA * (rz * cosP + crag);
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
        const mx = (positions[a * 3] + positions[d * 3]) * 0.5;
        const my = (positions[a * 3 + 1] + positions[d * 3 + 1]) * 0.5;
        const mz = (positions[a * 3 + 2] + positions[d * 3 + 2]) * 0.5;
        // Leave eastern entrance throat open (+X side: mx > 13.0, |mz| < 5.3, my < 7.9)
        if (mx > 13.0 && Math.abs(mz) < 5.3 && my < 7.9) {
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

  // 1C. Sculpted Obsidian Entrance Tunnel Arch Shell (local x: +14.0 .. +36.0, clear width 10.0m, height 7.8m)
  const buildVolcanoTunnelShellGeo = (): THREE.BufferGeometry => {
    const uSegs = 32;
    const vSegs = 20;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iv = 0; iv <= vSegs; iv++) {
      const v = iv / vSegs;
      const lx = 14.0 + v * 22.0;
      for (let iu = 0; iu <= uSegs; iu++) {
        const u = iu / uSegs;
        const theta = u * Math.PI;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const rz = 5.1 + Math.sin(lx * 0.4) * 0.18;
        const ry = 7.8;
        const z = -cosT * rz;
        const y = -0.25 + Math.pow(sinT, 0.85) * ry;
        positions.push(lx, y, z);
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

  const chamberDomeGeo = buildVolcanoChamberDomeGeo();
  const tunnelShellGeo = buildVolcanoTunnelShellGeo();
  disposableGeometries.push(chamberDomeGeo, tunnelShellGeo);

  const chamberDomeMesh = new THREE.Mesh(chamberDomeGeo, basaltMat);
  const tunnelShellMesh = new THREE.Mesh(tunnelShellGeo, basaltMat);
  volcanoGroup.add(chamberDomeMesh, tunnelShellMesh);

  // 1D. Eastern Obsidian Portal Gate Pillars, Arch Lintel, Obelisks & Magma Crystals
  const portalPillarGeo = new THREE.CylinderGeometry(1.4, 1.85, 11.2, 8);
  const portalLintelGeo = new THREE.BoxGeometry(3.2, 2.2, 13.8);
  const crystalClusterGeo = new THREE.OctahedronGeometry(0.75, 0);
  const calderaPoolGeo = new THREE.CylinderGeometry(16.5, 15.0, 0.5, 28);
  const calderaSpireGeo = new THREE.ConeGeometry(2.4, 7.5, 7);
  disposableGeometries.push(
    portalPillarGeo,
    portalLintelGeo,
    crystalClusterGeo,
    calderaPoolGeo,
    calderaSpireGeo
  );

  for (const side of [-1, 1] as const) {
    // Grand entrance portal pillars at local x = +35.0, z = ±5.8
    const pillar = new THREE.Mesh(portalPillarGeo, obsidianMat);
    pillar.position.set(35.0, 5.4, side * 5.8);
    pillar.castShadow = !isSoftwareGl;
    pillar.receiveShadow = !isSoftwareGl;
    volcanoGroup.add(pillar);

    const topCrystal = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
    topCrystal.scale.set(1.2, 2.2, 1.2);
    topCrystal.position.set(35.0, 11.6, side * 5.8);
    volcanoGroup.add(topCrystal);

    // Approach avenue basalt obelisks & glowing magma braziers (local x = 41, 47)
    for (const ox of [41.5, 48.0]) {
      const obelisk = new THREE.Mesh(portalPillarGeo, basaltMat);
      obelisk.scale.set(0.62, 0.52, 0.62);
      obelisk.position.set(ox, 2.8, side * 6.4);
      volcanoGroup.add(obelisk);

      const brazierCrystal = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
      brazierCrystal.scale.set(0.85, 1.55, 0.85);
      brazierCrystal.position.set(ox, 6.1, side * 6.4);
      volcanoGroup.add(brazierCrystal);
    }
  }

  const portalLintel = new THREE.Mesh(portalLintelGeo, obsidianMat);
  portalLintel.position.set(35.0, 9.4, 0);
  portalLintel.castShadow = !isSoftwareGl;
  volcanoGroup.add(portalLintel);

  // Glowing Magma Crystal Pillars & Throne Accents inside the Sanctum Chamber
  const sanctumCrystals: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.35;
    if (Math.abs(ang) < 0.45 || Math.abs(ang - Math.PI * 2) < 0.45) continue; // Keep eastern entrance clear
    const cx = Math.cos(ang) * 12.2;
    const cz = Math.sin(ang) * 12.2;
    const col = new THREE.Mesh(portalPillarGeo, obsidianMat);
    col.scale.set(0.75, 0.95, 0.75);
    col.position.set(cx, 5.1, cz);
    volcanoGroup.add(col);

    const crys = new THREE.Mesh(crystalClusterGeo, magmaCrystalMat);
    crys.scale.set(1.1, 2.4, 1.1);
    crys.position.set(cx * 0.88, 1.2, cz * 0.88);
    crys.rotation.set(0.2 * Math.sin(i), i, 0.15 * Math.cos(i));
    volcanoGroup.add(crys);
    sanctumCrystals.push(crys);
  }

  // Summit Caldera Molten Lava Pool & Jagged Basalt Crater Rim Spires high above the chamber (y = +28.2m local)
  const calderaPool = new THREE.Mesh(calderaPoolGeo, magmaMat);
  calderaPool.position.set(0, 28.2, 0);
  volcanoGroup.add(calderaPool);

  for (let s = 0; s < 12; s++) {
    const sAng = (s / 12) * Math.PI * 2;
    const sRad = 20.5 + (s % 2) * 1.8;
    const spire = new THREE.Mesh(calderaSpireGeo, basaltMat);
    spire.position.set(Math.cos(sAng) * sRad, 31.8 + (s % 3) * 0.9, Math.sin(sAng) * sRad);
    spire.rotation.z = -Math.cos(sAng) * 0.18;
    spire.rotation.x = Math.sin(sAng) * 0.18;
    volcanoGroup.add(spire);
  }

  let volcanoLight: THREE.PointLight | null = null;
  if (!isSoftwareGl) {
    volcanoLight = new THREE.PointLight(0xff5511, 2.8, 36.0, 1.4);
    volcanoLight.position.set(0, 6.2, 0);
    volcanoGroup.add(volcanoLight);
  }

  scene.add(volcanoGroup);
  distanceCulledObjects.push({
    obj: volcanoGroup,
    cx: VOLCANO_SANCTUM_POS.x,
    cz: VOLCANO_SANCTUM_POS.z,
    radius: 75,
  });

  // ==========================================================================
  // PART 2: EASTERN FLOATING BLOOMING SKY ISLANDS (ROYAL STAG HABITAT)
  // ==========================================================================
  const floatingIslandsGroup = new THREE.Group();

  const islandGrassMat = new THREE.MeshStandardMaterial({
    color: 0x4ea854,
    map: textures.terrainAlbedo,
    bumpMap: textures.terrainBump,
    bumpScale: 0.06,
    roughness: 0.82,
  });
  const islandCliffMat = new THREE.MeshStandardMaterial({
    color: 0x6e6a63,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.12,
    roughness: 0.86,
  });
  const blossomCanopyPinkMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.52,
  });
  const blossomCanopyRoseMat = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.52,
  });
  const blossomCanopyWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xfde2e4,
    bumpMap: textures.foliageBump,
    bumpScale: 0.04,
    roughness: 0.48,
  });
  const vineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x3b8a44,
    roughness: 0.68,
  });
  const skyCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  const marbleArchMat = new THREE.MeshStandardMaterial({
    color: 0xf1ece1,
    roughness: 0.45,
    metalness: 0.08,
  });
  const flowerGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });

  attachWindSwayShader(blossomCanopyPinkMat, 0.016, 1.4, swayMaterials);
  attachWindSwayShader(blossomCanopyRoseMat, 0.018, 1.5, swayMaterials);
  attachWindSwayShader(blossomCanopyWhiteMat, 0.015, 1.35, swayMaterials);
  attachWindSwayShader(vineFoliageMat, 0.02, 1.6, swayMaterials);

  disposableMaterials.push(
    islandGrassMat,
    islandCliffMat,
    blossomCanopyPinkMat,
    blossomCanopyRoseMat,
    blossomCanopyWhiteMat,
    vineFoliageMat,
    skyCrystalMat,
    marbleArchMat,
    flowerGoldMat
  );

  const treeTrunkGeo = new THREE.CylinderGeometry(0.24, 0.46, 5.4, 8);
  treeTrunkGeo.translate(0, 2.7, 0);
  const treeCrownGeo = new THREE.IcosahedronGeometry(2.85, 2);
  perturbGeometryVertices(treeCrownGeo, 0.2, 1.3);
  treeCrownGeo.scale(1.3, 0.78, 1.3);
  const flowerPatchGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.18, 7);
  const hangingVineGeo = new THREE.ConeGeometry(0.32, 4.8, 6);
  hangingVineGeo.rotateX(Math.PI);
  const undersideCrystalGeo = new THREE.OctahedronGeometry(1.15, 0);
  underscoreCrystalScale(undersideCrystalGeo);

  function underscoreCrystalScale(geo: THREE.BufferGeometry): void {
    geo.scale(0.85, 2.35, 0.85);
  }

  disposableGeometries.push(
    treeTrunkGeo,
    treeCrownGeo,
    flowerPatchGeo,
    hangingVineGeo,
    undersideCrystalGeo
  );

  // Build each of the 3 Floating Blooming Sky Islands
  const floatingCrystals: THREE.Mesh[] = [];
  for (let idx = 0; idx < FLOATING_BLOOMING_ISLANDS.length; idx++) {
    const isl = FLOATING_BLOOMING_ISLANDS[idx];
    const islGroup = new THREE.Group();
    islGroup.position.set(isl.x, isl.deckY, isl.z);

    // 1. Lush Top Blooming Turf Deck & Rim
    const topDeckGeo = new THREE.CylinderGeometry(isl.radius, isl.radius * 0.95, 1.4, 36);
    const rimRockGeo = new THREE.CylinderGeometry(isl.radius * 0.96, isl.radius * 0.78, 4.2, 28);
    const underConeGeo = new THREE.ConeGeometry(isl.radius * 0.76, isl.radius * 0.72, 18);
    underConeGeo.rotateX(Math.PI);
    perturbGeometryVertices(underConeGeo, 0.85, 0.35);
    disposableGeometries.push(topDeckGeo, rimRockGeo, underConeGeo);

    const topDeck = new THREE.Mesh(topDeckGeo, islandGrassMat);
    topDeck.position.set(0, -0.68, 0);
    topDeck.receiveShadow = !isSoftwareGl;
    islGroup.add(topDeck);

    const rimRock = new THREE.Mesh(rimRockGeo, islandCliffMat);
    rimRock.position.set(0, -3.2, 0);
    rimRock.castShadow = !isSoftwareGl;
    rimRock.receiveShadow = !isSoftwareGl;
    islGroup.add(rimRock);

    const underCone = new THREE.Mesh(underConeGeo, islandCliffMat);
    underCone.position.set(0, -4.8 - isl.radius * 0.34, 0);
    underCone.castShadow = !isSoftwareGl;
    islGroup.add(underCone);

    // 2. Glowing Sky-Levitation Crystals embedded in the underside & Hanging Blossom Vines around the rim
    const vineCount = Math.round(isl.radius * 0.9);
    for (let v = 0; v < vineCount; v++) {
      const ang = (v / vineCount) * Math.PI * 2;
      const vx = Math.cos(ang) * (isl.radius - 0.35);
      const vz = Math.sin(ang) * (isl.radius - 0.35);
      const vine = new THREE.Mesh(
        hangingVineGeo,
        v % 3 === 0 ? blossomCanopyPinkMat : vineFoliageMat
      );
      vine.position.set(vx, -2.4 - (v % 3) * 0.6, vz);
      vine.scale.set(1.0, 0.85 + (v % 3) * 0.35, 1.0);
      islGroup.add(vine);

      if (v % 3 === 0) {
        const uCrys = new THREE.Mesh(undersideCrystalGeo, skyCrystalMat);
        const crRad = isl.radius * 0.48;
        uCrys.position.set(Math.cos(ang) * crRad, -6.5 - (v % 2) * 2.2, Math.sin(ang) * crRad);
        uCrys.rotation.set(Math.sin(ang) * 0.35, ang, -Math.cos(ang) * 0.35);
        islGroup.add(uCrys);
        floatingCrystals.push(uCrys);
      }
    }

    // 3. Blooming Sakura Trees & Wildflower Meadows on the Island Deck
    const treeRingCount = idx === 0 ? 8 : 5;
    for (let t = 0; t < treeRingCount; t++) {
      const tAng = (t / treeRingCount) * Math.PI * 2 + 0.42;
      // Leave bridge/stair connection bearings clear on Main Island
      if (idx === 0 && (Math.abs(Math.cos(tAng) + 1) < 0.22 || Math.abs(Math.sin(tAng) + 1) < 0.22)) {
        continue;
      }
      const tRad = isl.radius * 0.72;
      const tx = Math.cos(tAng) * tRad;
      const tz = Math.sin(tAng) * tRad;

      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, 0, tz);
      const trunk = new THREE.Mesh(treeTrunkGeo, islandCliffMat);
      trunk.castShadow = !isSoftwareGl;
      treeGroup.add(trunk);

      const canopyMat =
        t % 3 === 0
          ? blossomCanopyPinkMat
          : t % 3 === 1
            ? blossomCanopyRoseMat
            : blossomCanopyWhiteMat;
      const mainCrown = new THREE.Mesh(treeCrownGeo, canopyMat);
      mainCrown.position.set(0, 5.8, 0);
      mainCrown.castShadow = !isSoftwareGl;
      const sideCrown = new THREE.Mesh(treeCrownGeo, canopyMat);
      sideCrown.scale.setScalar(0.75);
      sideCrown.position.set(1.4, 4.9, 0.8);
      treeGroup.add(mainCrown, sideCrown);
      islGroup.add(treeGroup);
    }

    // Carpet of blooming wildflower patches across the deck
    const flowerCount = idx === 0 ? 44 : 24;
    for (let f = 0; f < flowerCount; f++) {
      const fAng = f * 2.39996; // Golden angle spiral distribution
      const fRad = Math.sqrt((f + 0.5) / flowerCount) * (isl.radius - 2.4);
      const fx = Math.cos(fAng) * fRad;
      const fz = Math.sin(fAng) * fRad;
      const fMat =
        f % 4 === 0
          ? blossomCanopyPinkMat
          : f % 4 === 1
            ? blossomCanopyRoseMat
            : f % 4 === 2
              ? flowerGoldMat
              : blossomCanopyWhiteMat;
      const patch = new THREE.Mesh(flowerPatchGeo, fMat);
      patch.position.set(fx, 0.08, fz);
      patch.scale.set(0.85 + (f % 3) * 0.35, 1.0, 0.85 + ((f + 1) % 3) * 0.35);
      islGroup.add(patch);
    }

    floatingIslandsGroup.add(islGroup);
  }

  // 4. Centerpiece Floral Marble Sanctuary Arch on the Main Floating Island (205, 26.35, -35)
  const archColumnGeo = new THREE.CylinderGeometry(0.42, 0.52, 5.6, 12);
  const archTorusGeo = new THREE.TorusGeometry(3.2, 0.42, 10, 24, Math.PI);
  disposableGeometries.push(archColumnGeo, archTorusGeo);

  for (const side of [-1, 1] as const) {
    const col = new THREE.Mesh(archColumnGeo, marbleArchMat);
    col.position.set(205.0 + side * 3.2, 26.3 + 2.8, -35.0);
    col.castShadow = !isSoftwareGl;
    floatingIslandsGroup.add(col);
  }
  const archTop = new THREE.Mesh(archTorusGeo, marbleArchMat);
  archTop.position.set(205.0, 26.3 + 5.6, -35.0);
  floatingIslandsGroup.add(archTop);

  // 5. North & East Arched Floral Sky-Bridges connecting the 3 Floating Islands
  const bridgePlankGeo = new THREE.BoxGeometry(5.6, 0.32, 1.15);
  const bridgeKerbGeo = new THREE.BoxGeometry(0.35, 0.48, 1.18);
  disposableGeometries.push(bridgePlankGeo, bridgeKerbGeo);

  // North Sky-Bridge (x = 205, z = -61.5 .. -68.5)
  for (let s = 0; s <= 7; s++) {
    const t = s / 7;
    const bz = -61.5 - t * 7.0;
    const by = floatingBloomingIslandHeightAt(205.0, bz, 27.0) ?? 27.0;
    const plank = new THREE.Mesh(bridgePlankGeo, marbleArchMat);
    plank.position.set(205.0, by - 0.14, bz);
    floatingIslandsGroup.add(plank);
    for (const side of [-1, 1] as const) {
      const kerb = new THREE.Mesh(bridgeKerbGeo, blossomCanopyPinkMat);
      kerb.position.set(205.0 + side * 2.65, by + 0.18, bz);
      floatingIslandsGroup.add(kerb);
    }
  }

  // East Sky-Bridge (from (230, -26) to (236.5, -23.6))
  const eastBridgeYaw = Math.atan2(236.5 - 230.0, -23.6 - -26.0);
  for (let s = 0; s <= 7; s++) {
    const t = s / 7;
    const bx = 230.0 + t * 6.5;
    const bz = -26.0 + t * 2.4;
    const by = floatingBloomingIslandHeightAt(bx, bz, 27.0) ?? 26.8;
    const plank = new THREE.Mesh(bridgePlankGeo, marbleArchMat);
    plank.position.set(bx, by - 0.14, bz);
    plank.rotation.y = eastBridgeYaw;
    floatingIslandsGroup.add(plank);
  }

  // 6. Ascending Floral Sky-Stairway from (152, 3.4, -35) up to Main Island western rim (178, 26.0, -35)
  const stairStepGeo = new THREE.BoxGeometry(0.95, 0.38, FLOATING_ISLAND_STAIR_POS.halfWidthZ * 2);
  const stairPierGeo = new THREE.CylinderGeometry(0.55, 0.75, 1.0, 10);
  disposableGeometries.push(stairStepGeo, stairPierGeo);

  const stairSteps = 34;
  for (let i = 0; i <= stairSteps; i++) {
    const t = i / stairSteps;
    const sx =
      FLOATING_ISLAND_STAIR_POS.footX +
      t * (FLOATING_ISLAND_STAIR_POS.topX - FLOATING_ISLAND_STAIR_POS.footX);
    const sy =
      FLOATING_ISLAND_STAIR_POS.footY +
      t * (FLOATING_ISLAND_STAIR_POS.topY - FLOATING_ISLAND_STAIR_POS.footY);
    const stepMesh = new THREE.Mesh(stairStepGeo, marbleArchMat);
    stepMesh.position.set(sx, sy - 0.18, FLOATING_ISLAND_STAIR_POS.z);
    stepMesh.castShadow = !isSoftwareGl;
    stepMesh.receiveShadow = !isSoftwareGl;
    floatingIslandsGroup.add(stepMesh);

    if (i % 6 === 0 && i > 0) {
      const pierH = Math.max(2.0, sy - 2.0);
      const pier = new THREE.Mesh(stairPierGeo, islandCliffMat);
      pier.scale.set(1.0, pierH, 1.0);
      pier.position.set(sx, sy - pierH * 0.5, FLOATING_ISLAND_STAIR_POS.z);
      floatingIslandsGroup.add(pier);
    }
  }

  scene.add(floatingIslandsGroup);
  distanceCulledObjects.push({
    obj: floatingIslandsGroup,
    cx: 205.0,
    cz: -35.0,
    radius: 95,
  });

  return {
    volcanoGroup,
    floatingIslandsGroup,
    updateVolcanoAndFloatingIslands: (elapsedTime: number, playerX: number, playerZ: number) => {
      if (isWithinViewDistance(VOLCANO_SANCTUM_POS.x, VOLCANO_SANCTUM_POS.z, playerX, playerZ, 80, VIEW_DISTANCE)) {
        const pulse = 2.0 + Math.sin(elapsedTime * 3.2) * 0.45;
        magmaMat.emissiveIntensity = pulse;
        if (volcanoLight) {
          volcanoLight.intensity = 2.6 + Math.sin(elapsedTime * 4.5) * 0.55;
        }
        for (let i = 0; i < sanctumCrystals.length; i++) {
          sanctumCrystals[i].rotation.y = elapsedTime * 0.6 + i;
        }
      }
      if (isWithinViewDistance(205.0, -35.0, playerX, playerZ, 95, VIEW_DISTANCE)) {
        skyCrystalMat.emissiveIntensity = 1.8 + Math.sin(elapsedTime * 2.4) * 0.4;
      }
    },
  };
}
