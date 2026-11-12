// ============================================================================
// MODULE: World / Models / Ruined Atlantis & Sailable Ship Models
// DESIGN: Monumental Atlantean ocean ruins & 3-masted Royal Explorer Flagship (SRP)
// SUMMARY: Constructs the distant Ruined Atlantis Sunken Ring & Poseidonic Boss Sanctuary
//          at (980, 420) and the 3-masted Sailable Royal Explorer Flagship with an
//          onboard Animal/Mount Deck Stall, 6 broadside cannons, golden sea-dragon
//          figurehead, and live Atlantean Wayfinder Compass at the Harbor Pier (278, 282).
// ============================================================================

import * as THREE from 'three';
import {
  RUINED_ATLANTIS_POS,
  SAILABLE_SHIP_INITIAL_POS,
  NORDIC_FROST_SHRINE_POS,
  DESERT_PYRAMID_SANCTUARY_POS,
  SMUGGLER_ISLAND_POS,
  VIEW_DISTANCE,
  isWithinViewDistance,
} from '../terrainMath';
import {
  getAllSailableShips,
  SHIP_CATALOG,
  type ISailableShipState,
} from '../systems/sailableShipSystem';
import type { IWorldModelBuildContext } from './types';

export interface IAtlantisAndShipHandles {
  atlantisGroup: THREE.Group;
  sailableShipGroup: THREE.Group;
  updateAtlantisAndShip: (elapsedTime: number, playerX: number, playerZ: number) => void;
}

export function buildAtlantisAndShipModels(ctx: IWorldModelBuildContext): IAtlantisAndShipHandles {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
    archAssets,
  } = ctx;

  const {
    carvedMarbleMat,
    imperialDoorWoodMat,
    imperialGoldMat,
    imperialCrimsonMat,
    warmLanternMat,
  } = archAssets!;

  // ============================================================================
  // 1. SHARED ATLANTEAN & SHIP MATERIALS (Sea-Veined Marble, Orichalcum Gold & Ship Timber)
  // ============================================================================
  const atlanteanMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.03,
    roughness: 0.4,
    metalness: 0.08,
  });
  const atlanteanTealStoneMat = new THREE.MeshStandardMaterial({
    color: 0x155e75,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.04,
    roughness: 0.5,
    metalness: 0.18,
  });
  const reefShelfMat = new THREE.MeshStandardMaterial({
    color: 0x0f4c5c,
    map: textures.rockAlbedo,
    roughness: 0.78,
    metalness: 0.06,
  });
  const shipHullWoodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.04,
    roughness: 0.66,
    metalness: 0.06,
  });
  const shipDeckPlankMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    map: textures.timberAlbedo,
    roughness: 0.6,
    metalness: 0.05,
  });
  const hayStrawMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.88,
    metalness: 0.02,
  });
  const bronzeCannonMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.32,
    metalness: 0.82,
  });
  const orichalcumGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.88,
    emissive: new THREE.Color(0x78350f),
    emissiveIntensity: 0.38,
  });
  const biolumCyanMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    roughness: 0.16,
    metalness: 0.18,
    emissive: new THREE.Color(0x06b6d4),
    emissiveIntensity: 1.45,
  });
  const sailCanvasMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const wakeFoamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(
    atlanteanMarbleMat,
    atlanteanTealStoneMat,
    reefShelfMat,
    shipHullWoodMat,
    shipDeckPlankMat,
    hayStrawMat,
    bronzeCannonMat,
    orichalcumGoldMat,
    biolumCyanMat,
    sailCanvasMat,
    wakeFoamMat
  );

  // ============================================================================
  // 2. MONUMENTAL RUINED ATLANTIS CITADEL & POSEIDON BOSS SANCTUARY (980, 420)
  // ============================================================================
  const atlantisGroup = new THREE.Group();
  atlantisGroup.position.set(RUINED_ATLANTIS_POS.x, 0, RUINED_ATLANTIS_POS.z);

  const arenaY = RUINED_ATLANTIS_POS.arenaFloorY;

  // 2A) Central Boss Arena Sanctuary Plaza rising directly from the turquoise ocean lagoon (r = 34.0m)
  const arenaSlabGeo = new THREE.CylinderGeometry(34.2, 36.8, 3.6, 40);
  const arenaInnerStepGeo = new THREE.CylinderGeometry(30.4, 30.9, 0.18, 40);
  const orichalcumOuterRingGeo = new THREE.RingGeometry(29.8, 30.6, 48);
  orichalcumOuterRingGeo.rotateX(-Math.PI / 2);
  const cyanMidRingGeo = new THREE.RingGeometry(19.0, 19.8, 40);
  cyanMidRingGeo.rotateX(-Math.PI / 2);
  const cyanInnerRingGeo = new THREE.RingGeometry(7.4, 8.1, 32);
  cyanInnerRingGeo.rotateX(-Math.PI / 2);
  const radialRuneStripGeo = new THREE.BoxGeometry(0.54, 0.06, 22.0);
  const centerSealPlinthGeo = new THREE.CylinderGeometry(4.8, 5.6, 0.45, 24);
  const crystalObeliskGeo = new THREE.OctahedronGeometry(1.4, 0);
  crystalObeliskGeo.scale(0.85, 2.45, 0.85);
  const astrolabeRing1Geo = new THREE.TorusGeometry(4.2, 0.18, 10, 36);
  const astrolabeRing2Geo = new THREE.TorusGeometry(3.0, 0.14, 10, 32);

  disposableGeometries.push(
    arenaSlabGeo,
    arenaInnerStepGeo,
    orichalcumOuterRingGeo,
    cyanMidRingGeo,
    cyanInnerRingGeo,
    radialRuneStripGeo,
    centerSealPlinthGeo,
    crystalObeliskGeo,
    astrolabeRing1Geo,
    astrolabeRing2Geo
  );

  const arenaSlab = new THREE.Mesh(arenaSlabGeo, atlanteanMarbleMat);
  arenaSlab.position.y = arenaY - 1.8;
  arenaSlab.receiveShadow = !isSoftwareGl;
  const arenaInnerStep = new THREE.Mesh(arenaInnerStepGeo, carvedMarbleMat);
  arenaInnerStep.position.y = arenaY - 0.04;
  const orichalcumOuterRing = new THREE.Mesh(orichalcumOuterRingGeo, orichalcumGoldMat);
  orichalcumOuterRing.position.y = arenaY + 0.05;
  const cyanMidRing = new THREE.Mesh(cyanMidRingGeo, biolumCyanMat);
  cyanMidRing.position.y = arenaY + 0.055;
  const cyanInnerRing = new THREE.Mesh(cyanInnerRingGeo, biolumCyanMat);
  cyanInnerRing.position.y = arenaY + 0.06;
  const centerSealPlinth = new THREE.Mesh(centerSealPlinthGeo, atlanteanTealStoneMat);
  centerSealPlinth.position.y = arenaY + 0.22;

  atlantisGroup.add(
    arenaSlab,
    arenaInnerStep,
    orichalcumOuterRing,
    cyanMidRing,
    cyanInnerRing,
    centerSealPlinth
  );

  for (let r = 0; r < 8; r++) {
    const ang = (r / 8) * Math.PI * 2;
    const runeStrip = new THREE.Mesh(
      radialRuneStripGeo,
      r % 2 === 0 ? biolumCyanMat : orichalcumGoldMat
    );
    runeStrip.position.set(Math.sin(ang) * 18.8, arenaY + 0.04, Math.cos(ang) * 18.8);
    runeStrip.rotation.y = ang;
    atlantisGroup.add(runeStrip);
  }

  // 2B) Colossal Central Crowned Poseidon Statue & Golden Trident Monolith
  const poseidonStatueGroup = new THREE.Group();
  poseidonStatueGroup.position.set(0, arenaY + 0.42, 0);
  poseidonStatueGroup.rotation.y = -Math.PI / 2; // Facing West toward incoming ships

  const statuePedestalGeo = new THREE.CylinderGeometry(2.6, 3.2, 1.8, 8);
  const statueRobeGeo = new THREE.CylinderGeometry(1.15, 1.75, 3.2, 10);
  const statueTorsoGeo = new THREE.BoxGeometry(2.3, 2.2, 1.35);
  const statueHeadGeo = new THREE.CylinderGeometry(0.68, 0.62, 1.15, 10);
  const statueCrownGeo = new THREE.CylinderGeometry(0.86, 0.7, 0.55, 8);
  const tridentShaftGeo = new THREE.CylinderGeometry(0.14, 0.16, 8.8, 8);
  const tridentCrossbarGeo = new THREE.BoxGeometry(1.85, 0.22, 0.22);
  const tridentProngGeo = new THREE.ConeGeometry(0.22, 1.45, 6);

  disposableGeometries.push(
    statuePedestalGeo,
    statueRobeGeo,
    statueTorsoGeo,
    statueHeadGeo,
    statueCrownGeo,
    tridentShaftGeo,
    tridentCrossbarGeo,
    tridentProngGeo
  );

  const sPed = new THREE.Mesh(statuePedestalGeo, atlanteanTealStoneMat);
  sPed.position.y = 0.9;
  const sRobe = new THREE.Mesh(statueRobeGeo, atlanteanMarbleMat);
  sRobe.position.y = 3.3;
  const sTorso = new THREE.Mesh(statueTorsoGeo, atlanteanMarbleMat);
  sTorso.position.y = 5.6;
  const sHead = new THREE.Mesh(statueHeadGeo, atlanteanMarbleMat);
  sHead.position.y = 7.25;
  const sCrown = new THREE.Mesh(statueCrownGeo, orichalcumGoldMat);
  sCrown.position.y = 7.95;

  // Giant Golden Trident held on the right side of the Poseidon Statue
  const tridentGroup = new THREE.Group();
  tridentGroup.position.set(1.75, 4.8, 0.35);
  const tShaft = new THREE.Mesh(tridentShaftGeo, orichalcumGoldMat);
  const tCross = new THREE.Mesh(tridentCrossbarGeo, orichalcumGoldMat);
  tCross.position.y = 3.8;
  tridentGroup.add(tShaft, tCross);
  for (const px of [-0.78, 0, 0.78]) {
    const prong = new THREE.Mesh(tridentProngGeo, px === 0 ? biolumCyanMat : orichalcumGoldMat);
    prong.position.set(px, 4.6, 0);
    tridentGroup.add(prong);
  }
  poseidonStatueGroup.scale.setScalar(1.36);
  poseidonStatueGroup.add(sPed, sRobe, sTorso, sHead, sCrown, tridentGroup);
  atlantisGroup.add(poseidonStatueGroup);

  // Central Levitating Boss Seal Astrolabe & Bioluminescent Crystal Core above Poseidon
  const bossSealAstrolabeGroup = new THREE.Group();
  bossSealAstrolabeGroup.position.set(0, arenaY + 13.8, 0);
  const sealCrystal = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
  const astroRing1 = new THREE.Mesh(astrolabeRing1Geo, orichalcumGoldMat);
  const astroRing2 = new THREE.Mesh(astrolabeRing2Geo, orichalcumGoldMat);
  astroRing2.rotation.x = Math.PI / 3;
  bossSealAstrolabeGroup.add(sealCrystal, astroRing1, astroRing2);
  atlantisGroup.add(bossSealAstrolabeGroup);

  // 2C) 16 Fluted Atlantean Perimeter Columns, Shattered Shafts & 4 Cardinal Propylaea Gateways (r = 31.8m)
  const colPlinthGeo = new THREE.BoxGeometry(2.5, 0.95, 2.5);
  const colShaftFullGeo = new THREE.CylinderGeometry(0.82, 0.96, 13.4, 14);
  colShaftFullGeo.translate(0, 6.7, 0);
  const colShaftBrokenGeo = new THREE.CylinderGeometry(0.85, 0.96, 6.6, 14);
  colShaftBrokenGeo.translate(0, 3.3, 0);
  const colCapitalGeo = new THREE.CylinderGeometry(1.24, 0.85, 1.0, 12);
  const architraveBeamGeo = new THREE.BoxGeometry(12.4, 1.25, 1.8);
  const gatewayPedimentGeo = new THREE.ConeGeometry(7.4, 3.8, 4);
  gatewayPedimentGeo.rotateY(Math.PI / 4);
  gatewayPedimentGeo.scale(1.0, 1.0, 0.34);
  const fallenDrumGeo = new THREE.CylinderGeometry(0.85, 0.88, 3.6, 12);
  fallenDrumGeo.rotateZ(Math.PI / 2);

  disposableGeometries.push(
    colPlinthGeo,
    colShaftFullGeo,
    colShaftBrokenGeo,
    colCapitalGeo,
    architraveBeamGeo,
    gatewayPedimentGeo,
    fallenDrumGeo
  );

  const numArenaCols = 16;
  const colRingR = 31.8;
  for (let i = 0; i < numArenaCols; i++) {
    const ang = (i / numArenaCols) * Math.PI * 2;
    const cx = Math.cos(ang) * colRingR;
    const cz = Math.sin(ang) * colRingR;
    const isCardinalNext = i % 4 === 0 || (i + 1) % 4 === 0;
    const isIntact = isCardinalNext || i % 3 === 0;

    const plinth = new THREE.Mesh(colPlinthGeo, atlanteanTealStoneMat);
    plinth.position.set(cx, arenaY + 0.45, cz);
    plinth.rotation.y = -ang;
    atlantisGroup.add(plinth);

    const shaft = new THREE.Mesh(
      isIntact ? colShaftFullGeo : colShaftBrokenGeo,
      atlanteanMarbleMat
    );
    shaft.position.set(cx, arenaY + 0.9, cz);
    if (!isIntact) {
      shaft.scale.y = 0.65 + (i % 3) * 0.28;
    }
    shaft.castShadow = !isSoftwareGl;
    atlantisGroup.add(shaft);

    if (isIntact) {
      const cap = new THREE.Mesh(colCapitalGeo, orichalcumGoldMat);
      cap.position.set(cx, arenaY + 14.6, cz);
      atlantisGroup.add(cap);
    } else {
      const drum = new THREE.Mesh(fallenDrumGeo, atlanteanMarbleMat);
      const outR = colRingR + (i % 2 === 0 ? 5.2 : -3.4);
      drum.position.set(
        Math.cos(ang + 0.08) * outR,
        i % 2 === 0 ? 0.85 : arenaY + 0.68,
        Math.sin(ang + 0.08) * outR
      );
      drum.rotation.y = ang + 0.45;
      drum.rotation.z = 0.14;
      atlantisGroup.add(drum);
    }
  }

  // 4 Cardinal Monumental Poseidon Propylaea Gateways (East, North, West = Dock Entrance, South)
  for (let g = 0; g < 4; g++) {
    const gAng = (g / 4) * Math.PI * 2;
    const gx = Math.cos(gAng) * colRingR;
    const gz = Math.sin(gAng) * colRingR;
    const gateGroup = new THREE.Group();
    gateGroup.position.set(gx, arenaY, gz);
    gateGroup.rotation.y = -gAng + Math.PI / 2;

    for (const sideX of [-4.8, 4.8]) {
      const pBase = new THREE.Mesh(colPlinthGeo, atlanteanTealStoneMat);
      pBase.position.set(sideX, 0.45, 0);
      const pCol = new THREE.Mesh(colShaftFullGeo, atlanteanMarbleMat);
      pCol.position.set(sideX, 0.9, 0);
      const pCap = new THREE.Mesh(colCapitalGeo, orichalcumGoldMat);
      pCap.position.set(sideX, 14.6, 0);
      gateGroup.add(pBase, pCol, pCap);
    }
    const lintel = new THREE.Mesh(architraveBeamGeo, atlanteanTealStoneMat);
    lintel.position.set(0, 15.6, 0);
    const pediment = new THREE.Mesh(gatewayPedimentGeo, atlanteanMarbleMat);
    pediment.position.set(0, 18.0, 0);
    const topCrystal = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
    topCrystal.scale.setScalar(0.82);
    topCrystal.position.set(0, 20.8, 0);
    gateGroup.add(lintel, pediment, topCrystal);
    atlantisGroup.add(gateGroup);
  }

  // 2D) 4 Radial Marble Causeway Bridges connecting Inner Boss Arena (r=34m) to Outer Ring (r=68m)
  const radialCausewayGeo = new THREE.BoxGeometry(34.0, 3.2, 6.8);
  disposableGeometries.push(radialCausewayGeo);
  for (let c = 0; c < 4; c++) {
    // Skip West (c === 2) because the Grand Western Ship Dock Causeway already spans -94..-32m
    if (c === 2) continue;
    const cAng = (c / 4) * Math.PI * 2;
    const bridge = new THREE.Mesh(radialCausewayGeo, atlanteanMarbleMat);
    const midR = 50.5;
    bridge.position.set(Math.cos(cAng) * midR, arenaY - 1.6, Math.sin(cAng) * midR);
    bridge.rotation.y = -cAng;
    atlantisGroup.add(bridge);
  }

  // 2E) Outer Sunken Ring Colonnade, Aqueduct Arches & Tilted Obelisks (r = 68.0m)
  const outerRingPlinthGeo = new THREE.BoxGeometry(11.6, 3.4, 5.2);
  const outerObeliskGeo = new THREE.CylinderGeometry(0.5, 1.35, 17.5, 4);
  outerObeliskGeo.translate(0, 8.75, 0);
  const aqueductLintelGeo = new THREE.BoxGeometry(9.4, 1.3, 2.0);
  disposableGeometries.push(outerRingPlinthGeo, outerObeliskGeo, aqueductLintelGeo);

  const outerSegments = 16;
  const outerR = RUINED_ATLANTIS_POS.outerRingRadius; // 68.0m
  for (let s = 0; s < outerSegments; s++) {
    const sAng = (s / outerSegments) * Math.PI * 2 + 0.19;
    // Leave West Dock approach corridor open
    if (Math.cos(sAng) < -0.92) continue;
    const sx = Math.cos(sAng) * outerR;
    const sz = Math.sin(sAng) * outerR;
    const segGroup = new THREE.Group();
    segGroup.position.set(sx, RUINED_ATLANTIS_POS.outerRingY, sz);
    segGroup.rotation.y = -sAng + Math.PI / 2;

    const segSlab = new THREE.Mesh(outerRingPlinthGeo, atlanteanMarbleMat);
    segSlab.position.y = -1.4;
    segGroup.add(segSlab);

    if (s % 2 === 0) {
      const obelisk = new THREE.Mesh(outerObeliskGeo, atlanteanTealStoneMat);
      obelisk.rotation.z = (s % 4 === 0 ? 1 : -1) * 0.15;
      obelisk.rotation.x = 0.07;
      const tipGem = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
      tipGem.scale.setScalar(0.72);
      tipGem.position.set(0, 17.6, 0);
      obelisk.add(tipGem);
      segGroup.add(obelisk);
    } else {
      for (const ox of [-3.4, 3.4]) {
        const intactAqueduct = s % 3 === 0 || ox < 0;
        const rCol = new THREE.Mesh(
          intactAqueduct ? colShaftFullGeo : colShaftBrokenGeo,
          atlanteanMarbleMat
        );
        rCol.position.set(ox, 0.2, 0);
        segGroup.add(rCol);
      }
      if (s % 3 === 0) {
        const aqBeam = new THREE.Mesh(aqueductLintelGeo, atlanteanTealStoneMat);
        aqBeam.position.set(0, 14.0, 0);
        segGroup.add(aqBeam);
      }
    }
    atlantisGroup.add(segGroup);
  }

  // 2F) Western Ship Mooring Dock, Sea-Serpent Guardians & 18m Beacon Towers (localX = -94..-32)
  const dockStartLocalX = RUINED_ATLANTIS_POS.dockX - RUINED_ATLANTIS_POS.x; // -94.0
  const dockEndLocalX = -32.0;
  const dockLen = dockEndLocalX - dockStartLocalX; // 62.0m
  const dockDeckGeo = new THREE.BoxGeometry(dockLen, 3.4, 9.6);
  const brazierPillarGeo = new THREE.CylinderGeometry(0.48, 0.62, 3.4, 8);
  brazierPillarGeo.translate(0, 1.7, 0);
  const beaconTowerGeo = new THREE.CylinderGeometry(1.25, 1.85, 16.8, 8);
  beaconTowerGeo.translate(0, 8.4, 0);
  const bollardGeo = new THREE.CylinderGeometry(0.34, 0.4, 1.15, 8);
  bollardGeo.translate(0, 0.58, 0);
  const serpentCoilGeo = new THREE.TorusGeometry(1.85, 0.48, 10, 24, Math.PI * 1.65);
  disposableGeometries.push(
    dockDeckGeo,
    brazierPillarGeo,
    beaconTowerGeo,
    bollardGeo,
    serpentCoilGeo
  );

  const dockDeckMesh = new THREE.Mesh(dockDeckGeo, atlanteanMarbleMat);
  dockDeckMesh.position.set((dockStartLocalX + dockEndLocalX) * 0.5, arenaY - 1.7, 0);
  atlantisGroup.add(dockDeckMesh);

  // Twin 18m Atlantean Beacon Lighthouses & Coiled Sea-Serpent Statues at Dock Head (localX = -91.5)
  for (const sideZ of [-4.4, 4.4]) {
    const bTower = new THREE.Mesh(beaconTowerGeo, atlanteanTealStoneMat);
    bTower.position.set(dockStartLocalX + 2.4, arenaY, sideZ);
    const bCap = new THREE.Mesh(colCapitalGeo, orichalcumGoldMat);
    bCap.scale.setScalar(1.45);
    bCap.position.set(dockStartLocalX + 2.4, arenaY + 16.9, sideZ);
    const bCrystal = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
    bCrystal.scale.setScalar(1.15);
    bCrystal.position.set(dockStartLocalX + 2.4, arenaY + 19.4, sideZ);
    atlantisGroup.add(bTower, bCap, bCrystal);

    // Coiled Sea-Serpent Guardian Statue flanking the dock entrance
    const sCoil = new THREE.Mesh(serpentCoilGeo, atlanteanTealStoneMat);
    sCoil.position.set(dockStartLocalX + 7.5, arenaY + 1.8, sideZ * 1.25);
    sCoil.rotation.y = Math.PI / 2;
    const sCrest = new THREE.Mesh(crystalObeliskGeo, orichalcumGoldMat);
    sCrest.scale.set(0.45, 0.65, 0.85);
    sCrest.position.set(dockStartLocalX + 6.8, arenaY + 4.1, sideZ * 1.25);
    atlantisGroup.add(sCoil, sCrest);

    // Golden-bronze ship mooring bollards along the dock head
    const bollard = new THREE.Mesh(bollardGeo, orichalcumGoldMat);
    bollard.position.set(dockStartLocalX + 0.8, arenaY, sideZ * 0.68);
    atlantisGroup.add(bollard);
  }

  // Glowing cyan brazier pillars lining the Western Causeway
  for (let lx = dockStartLocalX + 13.0; lx <= dockEndLocalX - 6.0; lx += 11.5) {
    for (const sz of [-4.2, 4.2]) {
      const bPillar = new THREE.Mesh(brazierPillarGeo, atlanteanMarbleMat);
      bPillar.position.set(lx, arenaY, sz);
      const bGem = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
      bGem.scale.setScalar(0.45);
      bGem.position.set(lx, arenaY + 3.8, sz);
      atlantisGroup.add(bPillar, bGem);
    }
  }

  scene.add(atlantisGroup);
  distanceCulledObjects.push({
    obj: atlantisGroup,
    cx: RUINED_ATLANTIS_POS.x,
    cz: RUINED_ATLANTIS_POS.z,
    radius: 75.0,
  });

  // ============================================================================
  // 3. HARBOR NORTH BOARDING JETTY & SAILABLE 3-MASTED ROYAL EXPLORER FLAGSHIP
  // ============================================================================
  // 3A) Wooden Royal Ship Pier connecting Harbor Plaza (254.5, 282.0) to Sailable Ship berth (278.0, 282.0)
  const harborJettyGroup = new THREE.Group();
  const jettyDeckGeo = new THREE.BoxGeometry(20.0, 0.28, 5.8);
  const jettyPilingGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.4, 8);
  disposableGeometries.push(jettyDeckGeo, jettyPilingGeo);

  const jettyDeck = new THREE.Mesh(jettyDeckGeo, shipDeckPlankMat);
  jettyDeck.position.set(264.2, 3.02, SAILABLE_SHIP_INITIAL_POS.homeZ);
  jettyDeck.rotation.z = -0.018;
  harborJettyGroup.add(jettyDeck);
  for (const jx of [256.5, 261.5, 266.5, 272.0]) {
    for (const jz of [SAILABLE_SHIP_INITIAL_POS.homeZ - 2.4, SAILABLE_SHIP_INITIAL_POS.homeZ + 2.4]) {
      const piling = new THREE.Mesh(jettyPilingGeo, shipHullWoodMat);
      piling.position.set(jx, 1.4, jz);
      harborJettyGroup.add(piling);
    }
  }
  scene.add(harborJettyGroup);
  distanceCulledObjects.push({
    obj: harborJettyGroup,
    cx: 266.0,
    cz: SAILABLE_SHIP_INITIAL_POS.homeZ,
    radius: 28.0,
  });

  // 3B) Sailable Fleet (4 Distinct Ship Tiers: Coastal Sloop, Explorer Caravel, War Galleon, Atlantean Royal Flagship)
  //     Designed with a low-profile aft quarterdeck, no aft view-blocking cabin/mast, and high-clearance sails
  //     so the helmsman enjoys a 100% unobstructed view of the open ocean ahead.
  const sailableShipGroup = new THREE.Group();
  scene.add(sailableShipGroup);

  const flagshipHullGeo = new THREE.BoxGeometry(8.6, 3.0, 20.4);
  const flagshipBowGeo = new THREE.ConeGeometry(4.3, 6.6, 4);
  flagshipBowGeo.rotateX(-Math.PI / 2);
  flagshipBowGeo.rotateZ(Math.PI / 4);
  const flagshipBowspritGeo = new THREE.CylinderGeometry(0.12, 0.24, 7.8, 8);
  flagshipBowspritGeo.rotateX(Math.PI * 0.36);
  const flagshipMainDeckGeo = new THREE.BoxGeometry(8.8, 0.24, 22.4);
  const flagshipQuarterdeckGeo = new THREE.BoxGeometry(8.8, 0.62, 7.8);
  const captainsCabinGeo = new THREE.BoxGeometry(7.2, 0.56, 4.6);
  const cabinWindowGeo = new THREE.PlaneGeometry(0.85, 0.52);
  const flagshipRailSideGeo = new THREE.BoxGeometry(0.28, 0.82, 21.4);
  const flagshipRailSternGeo = new THREE.BoxGeometry(8.8, 0.86, 0.32);
  const figureheadNeckGeo = new THREE.CylinderGeometry(0.28, 0.48, 2.2, 8);
  figureheadNeckGeo.rotateX(Math.PI * 0.28);
  const figureheadHeadGeo = new THREE.ConeGeometry(0.52, 1.35, 6);
  figureheadHeadGeo.rotateX(-Math.PI * 0.42);

  // Midships Animal & Mount Cargo Stall Geometries (z = -5.2..-0.8)
  const stallPostGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.05, 8);
  const stallRailLongGeo = new THREE.BoxGeometry(0.1, 0.12, 4.2);
  const stallRailCrossGeo = new THREE.BoxGeometry(5.4, 0.12, 0.1);
  const hayBaleGeo = new THREE.BoxGeometry(0.95, 0.52, 0.68);
  const waterTroughGeo = new THREE.BoxGeometry(0.68, 0.46, 1.45);
  const stallRingGeo = new THREE.TorusGeometry(0.12, 0.03, 6, 12);

  // Broadside Bronze Cannons
  const cannonCarriageGeo = new THREE.BoxGeometry(0.62, 0.42, 0.95);
  const cannonBarrelGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.45, 10);
  cannonBarrelGeo.rotateZ(Math.PI / 2);

  // Masts, High-Clearance Sails, Crow's Nest & Royal Pennants
  const flagshipMastGeo = new THREE.CylinderGeometry(0.18, 0.28, 17.2, 10);
  flagshipMastGeo.translate(0, 8.6, 0);
  const crowsNestGeo = new THREE.CylinderGeometry(0.95, 0.72, 0.85, 10);
  const flagshipYardGeo = new THREE.CylinderGeometry(0.1, 0.12, 8.6, 8);
  flagshipYardGeo.rotateZ(Math.PI / 2);
  const flagshipSailGeo = new THREE.PlaneGeometry(8.2, 4.2, 8, 4);
  const fSailPos = flagshipSailGeo.attributes.position;
  for (let i = 0; i < fSailPos.count; i++) {
    const sx = fSailPos.getX(i);
    const sy = fSailPos.getY(i);
    const billow = Math.cos((sx / 8.2) * Math.PI) * Math.cos((sy / 4.2) * Math.PI) * 1.02;
    fSailPos.setZ(i, -billow);
  }
  flagshipSailGeo.computeVertexNormals();
  const royalPennantGeo = new THREE.ConeGeometry(0.38, 2.8, 4);
  royalPennantGeo.rotateX(Math.PI / 2);

  // Helm, Ship's Wheel & Live Atlantean Wayfinder Compass Spear
  const helmStandGeo = new THREE.BoxGeometry(0.38, 0.96, 0.34);
  const wheelRimGeo = new THREE.TorusGeometry(0.56, 0.055, 8, 18);
  const wheelSpokeGeo = new THREE.CylinderGeometry(0.026, 0.026, 1.32, 6);
  const wayfinderSpearGeo = new THREE.ConeGeometry(0.16, 0.95, 6);
  wayfinderSpearGeo.rotateX(-Math.PI / 2);
  const wayfinderTailGeo = new THREE.SphereGeometry(0.07, 8, 8);
  const sternLampSphereGeo = new THREE.SphereGeometry(0.26, 8, 8);
  const wakeWingGeo = new THREE.PlaneGeometry(2.8, 17.5);
  wakeWingGeo.rotateX(-Math.PI / 2);

  disposableGeometries.push(
    flagshipHullGeo,
    flagshipBowGeo,
    flagshipBowspritGeo,
    flagshipMainDeckGeo,
    flagshipQuarterdeckGeo,
    captainsCabinGeo,
    cabinWindowGeo,
    flagshipRailSideGeo,
    flagshipRailSternGeo,
    figureheadNeckGeo,
    figureheadHeadGeo,
    stallPostGeo,
    stallRailLongGeo,
    stallRailCrossGeo,
    hayBaleGeo,
    waterTroughGeo,
    stallRingGeo,
    cannonCarriageGeo,
    cannonBarrelGeo,
    flagshipMastGeo,
    crowsNestGeo,
    flagshipYardGeo,
    flagshipSailGeo,
    royalPennantGeo,
    helmStandGeo,
    wheelRimGeo,
    wheelSpokeGeo,
    wayfinderSpearGeo,
    wayfinderTailGeo,
    sternLampSphereGeo,
    wakeWingGeo
  );

  interface IShipTierVisualHandle {
    state: ISailableShipState;
    root: THREE.Group;
    wheelPivot: THREE.Group;
    compassCrystal: THREE.Mesh;
    wayfinderNeedleGroup: THREE.Group;
    bowWakeGroup: THREE.Group;
  }

  const shipVisualHandles: IShipTierVisualHandle[] = [];
  const allShips = getAllSailableShips();

  for (let sIdx = 0; sIdx < allShips.length; sIdx++) {
    const sState = allShips[sIdx];
    const def = SHIP_CATALOG.find((d) => d.tierId === sState.tierId) ?? SHIP_CATALOG[3];
    const tierRoot = new THREE.Group();
    tierRoot.position.set(sState.x, sState.deckY, sState.z);
    tierRoot.rotation.order = 'YXZ';
    tierRoot.rotation.y = sState.yaw;
    tierRoot.scale.set(def.scale, 1.0, def.scale);
    tierRoot.visible = sState.spawned;

    const tierTrimMat =
      def.tierId === 'royal_flagship'
        ? orichalcumGoldMat
        : def.tierId === 'galleon'
          ? imperialCrimsonMat
          : imperialDoorWoodMat;

    const cHull = new THREE.Mesh(flagshipHullGeo, shipHullWoodMat);
    cHull.position.set(0, -1.45, 0.4);
    const cBow = new THREE.Mesh(flagshipBowGeo, shipHullWoodMat);
    cBow.position.set(0, -1.0, -12.2);
    const cBowsprit = new THREE.Mesh(flagshipBowspritGeo, imperialDoorWoodMat);
    cBowsprit.position.set(0, 0.95, -13.8);

    const cMainDeck = new THREE.Mesh(flagshipMainDeckGeo, shipDeckPlankMat);
    cMainDeck.position.set(0, -0.1, 0);
    // Low-profile aft quarterdeck platform so it NEVER blocks forward ocean visibility
    const cQuarterdeck = new THREE.Mesh(flagshipQuarterdeckGeo, shipDeckPlankMat);
    cQuarterdeck.position.set(0, 0.28, 6.6);
    const captainsCabin = new THREE.Mesh(captainsCabinGeo, imperialDoorWoodMat);
    captainsCabin.position.set(0, 0.34, 8.2);

    const cRailPort = new THREE.Mesh(flagshipRailSideGeo, tierTrimMat);
    cRailPort.position.set(-4.25, 0.42, 0.4);
    const cRailStbd = new THREE.Mesh(flagshipRailSideGeo, tierTrimMat);
    cRailStbd.position.set(4.25, 0.42, 0.4);
    const cRailStern = new THREE.Mesh(flagshipRailSternGeo, imperialGoldMat);
    cRailStern.position.set(0, 0.82, 10.8);

    tierRoot.add(
      cHull,
      cBow,
      cBowsprit,
      cMainDeck,
      cQuarterdeck,
      captainsCabin,
      cRailPort,
      cRailStbd,
      cRailStern
    );

    if (def.tierId === 'galleon' || def.tierId === 'royal_flagship') {
      const figNeck = new THREE.Mesh(figureheadNeckGeo, orichalcumGoldMat);
      figNeck.position.set(0, 0.25, -12.6);
      const figHead = new THREE.Mesh(figureheadHeadGeo, orichalcumGoldMat);
      figHead.position.set(0, 1.15, -13.4);
      tierRoot.add(figNeck, figHead);
    }

    // Open-View Side Tie Posts & Hay/Trough for Onboard Animals (no center cross-bar blocking sight)
    const animalStallGroup = new THREE.Group();
    for (const sx of [-3.4, 3.4]) {
      for (const sz of [-5.0, -2.5, 0.0]) {
        const post = new THREE.Mesh(stallPostGeo, imperialDoorWoodMat);
        post.position.set(sx, 0.52, sz);
        const ring = new THREE.Mesh(stallRingGeo, orichalcumGoldMat);
        ring.position.set(sx, 0.96, sz);
        animalStallGroup.add(post, ring);
      }
    }
    const trough = new THREE.Mesh(waterTroughGeo, imperialDoorWoodMat);
    trough.position.set(-3.1, 0.23, -3.1);
    const hay1 = new THREE.Mesh(hayBaleGeo, hayStrawMat);
    hay1.position.set(3.1, 0.26, -3.6);
    animalStallGroup.add(trough, hay1);
    tierRoot.add(animalStallGroup);

    // Broadside Cannons on Caravel, Galleon, and Flagship
    if (def.tierId !== 'sloop') {
      const cannonZs = def.tierId === 'caravel' ? [-4.2, -1.2] : [-6.4, -2.8, 0.8];
      for (const cz of cannonZs) {
        for (const side of [-1, 1]) {
          const carriage = new THREE.Mesh(cannonCarriageGeo, imperialDoorWoodMat);
          carriage.position.set(side * 3.7, 0.21, cz);
          const barrel = new THREE.Mesh(cannonBarrelGeo, bronzeCannonMat);
          barrel.position.set(side * 4.05, 0.52, cz);
          tierRoot.add(carriage, barrel);
        }
      }
    }

    // High-Clearance Masts (no aft mizzenmast behind the helm; sails raised high so forward ocean horizon is 100% open!)
    const mastConfigs: ReadonlyArray<readonly [number, number, boolean]> =
      def.mastCount === 1
        ? [[-3.2, 0.92, false]]
        : [
            [-7.2, 0.90, false],
            [-1.4, 1.06, def.tierId === 'royal_flagship' || def.tierId === 'galleon'],
          ];

    for (const [mz, mScale, hasCrowsNest] of mastConfigs) {
      const mast = new THREE.Mesh(flagshipMastGeo, shipHullWoodMat);
      mast.position.set(0, 0, mz);
      mast.scale.y = mScale;
      tierRoot.add(mast);

      if (hasCrowsNest) {
        const nest = new THREE.Mesh(crowsNestGeo, imperialDoorWoodMat);
        nest.position.set(0, 13.8 * mScale, mz);
        tierRoot.add(nest);
      }

      const pennant = new THREE.Mesh(royalPennantGeo, imperialCrimsonMat);
      pennant.position.set(0, 17.2 * mScale, mz + 1.4);
      tierRoot.add(pennant);

      // Sails elevated to 8.4m and 13.2m so the lower 6.2m above the deck is completely clear!
      for (const sy of [8.4 * mScale, 13.2 * mScale]) {
        const yard = new THREE.Mesh(flagshipYardGeo, imperialDoorWoodMat);
        yard.position.set(0, sy + 1.9, mz);
        yard.scale.x = mScale;
        const sail = new THREE.Mesh(flagshipSailGeo, sailCanvasMat);
        sail.position.set(0, sy, mz - 0.26);
        sail.scale.x = mScale;
        tierRoot.add(yard, sail);
      }
    }

    // Interactive Helm Stand, Ship's Wheel & Wayfinder Compass on the Aft Quarterdeck (z = 3.85)
    const helmStand = new THREE.Mesh(helmStandGeo, imperialDoorWoodMat);
    helmStand.position.set(0, 1.02, 3.85);
    const shipWheelPivot = new THREE.Group();
    shipWheelPivot.position.set(0, 1.42, 4.04);
    const wRim = new THREE.Mesh(wheelRimGeo, imperialGoldMat);
    shipWheelPivot.add(wRim);
    for (let sp = 0; sp < 4; sp++) {
      const spoke = new THREE.Mesh(wheelSpokeGeo, orichalcumGoldMat);
      spoke.rotation.z = (sp / 4) * Math.PI;
      shipWheelPivot.add(spoke);
    }

    const wayfinderBinnacleGroup = new THREE.Group();
    wayfinderBinnacleGroup.position.set(0, 1.54, 3.72);
    const helmCompassCrystal = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
    helmCompassCrystal.scale.setScalar(0.11);
    const wayfinderNeedleGroup = new THREE.Group();
    const wayfinderSpear = new THREE.Mesh(wayfinderSpearGeo, biolumCyanMat);
    wayfinderSpear.scale.setScalar(0.55);
    wayfinderSpear.position.set(0, 0.14, -0.22);
    const wayfinderTail = new THREE.Mesh(wayfinderTailGeo, orichalcumGoldMat);
    wayfinderTail.position.set(0, 0.14, 0.12);
    wayfinderNeedleGroup.add(wayfinderSpear, wayfinderTail);
    wayfinderBinnacleGroup.add(helmCompassCrystal, wayfinderNeedleGroup);

    for (const [lx, ly, lz] of [
      [-3.8, 1.55, 10.4],
      [3.8, 1.55, 10.4],
      [-4.1, 1.35, 3.8],
      [4.1, 1.35, 3.8],
    ] as const) {
      const lamp = new THREE.Mesh(sternLampSphereGeo, warmLanternMat);
      lamp.position.set(lx, ly, lz);
      tierRoot.add(lamp);
    }

    tierRoot.add(helmStand, shipWheelPivot, wayfinderBinnacleGroup);

    const bowWakeGroup = new THREE.Group();
    bowWakeGroup.position.set(0, -1.52, -12.6);
    const wakeLeft = new THREE.Mesh(wakeWingGeo, wakeFoamMat);
    wakeLeft.position.set(-3.1, 0, 7.2);
    wakeLeft.rotation.y = 0.32;
    const wakeRight = new THREE.Mesh(wakeWingGeo, wakeFoamMat);
    wakeRight.position.set(3.1, 0, 7.2);
    wakeRight.rotation.y = -0.32;
    bowWakeGroup.add(wakeLeft, wakeRight);
    tierRoot.add(bowWakeGroup);

    sailableShipGroup.add(tierRoot);
    shipVisualHandles.push({
      state: sState,
      root: tierRoot,
      wheelPivot: shipWheelPivot,
      compassCrystal: helmCompassCrystal,
      wayfinderNeedleGroup,
      bowWakeGroup,
    });
  }

  // ============================================================================
  // 4. NORDIC FROST GIANT SHRINE & GEOTHERMAL HOT SPRINGS (-320, -290)
  // ============================================================================
  const nordicShrineGroup = new THREE.Group();
  const nfX = NORDIC_FROST_SHRINE_POS.x;
  const nfZ = NORDIC_FROST_SHRINE_POS.z;
  const nfFloorY = NORDIC_FROST_SHRINE_POS.floorY;

  const nordicGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.045,
    roughness: 0.72,
    metalness: 0.08,
  });
  const geothermalWaterMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 0.55,
    roughness: 0.14,
    metalness: 0.18,
    transparent: true,
    opacity: 0.86,
  });
  const goldenSandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xd9a05b,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.04,
    roughness: 0.68,
    metalness: 0.06,
  });
  disposableMaterials.push(nordicGraniteMat, geothermalWaterMat, goldenSandstoneMat);

  const springRimGeo = new THREE.TorusGeometry(NORDIC_FROST_SHRINE_POS.poolRadius + 0.6, 0.85, 8, 28);
  springRimGeo.rotateX(Math.PI / 2);
  const springWaterDiscGeo = new THREE.CircleGeometry(NORDIC_FROST_SHRINE_POS.poolRadius + 0.2, 28);
  springWaterDiscGeo.rotateX(-Math.PI / 2);
  const runestoneMonolithGeo = new THREE.BoxGeometry(1.65, 6.2, 0.95);
  const runestoneGlyphStripGeo = new THREE.BoxGeometry(0.32, 4.4, 1.02);
  const altarDaisSlabGeo = new THREE.CylinderGeometry(4.4, 5.2, 1.05, 8);
  disposableGeometries.push(
    springRimGeo,
    springWaterDiscGeo,
    runestoneMonolithGeo,
    runestoneGlyphStripGeo,
    altarDaisSlabGeo
  );

  const springRimMesh = new THREE.Mesh(springRimGeo, nordicGraniteMat);
  springRimMesh.position.set(nfX, nfFloorY + 0.15, nfZ);
  const springWaterMesh = new THREE.Mesh(springWaterDiscGeo, geothermalWaterMat);
  springWaterMesh.position.set(nfX, NORDIC_FROST_SHRINE_POS.poolWaterY, nfZ);
  nordicShrineGroup.add(springRimMesh, springWaterMesh);

  // 8 Ancient Carved Nordic Runestones with Glowing Cyan-Ice Runes encircling the Geothermal Pool
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rx = nfX + Math.cos(ang) * 15.0;
    const rz = nfZ + Math.sin(ang) * 15.0;
    const stoneGroup = new THREE.Group();
    stoneGroup.position.set(rx, nfFloorY, rz);
    stoneGroup.rotation.y = -ang + Math.PI / 2;
    const monolith = new THREE.Mesh(runestoneMonolithGeo, nordicGraniteMat);
    monolith.position.y = 3.1;
    const glyph = new THREE.Mesh(runestoneGlyphStripGeo, biolumCyanMat);
    glyph.position.y = 3.2;
    stoneGroup.add(monolith, glyph);
    nordicShrineGroup.add(stoneGroup);
  }

  // Northern Raised Frost-Rune Altar Dais & Floating Ice Crystal at (x: -320, z: -306.5)
  const altarZ = nfZ - 16.5;
  const altarDais = new THREE.Mesh(altarDaisSlabGeo, nordicGraniteMat);
  altarDais.position.set(nfX, nfFloorY + 0.52, altarZ);
  const nordicFloatingCrystal = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
  nordicFloatingCrystal.scale.setScalar(0.58);
  nordicFloatingCrystal.position.set(nfX, NORDIC_FROST_SHRINE_POS.altarDaisY + 2.4, altarZ);
  nordicShrineGroup.add(altarDais, nordicFloatingCrystal);

  scene.add(nordicShrineGroup);
  distanceCulledObjects.push({
    obj: nordicShrineGroup,
    cx: nfX,
    cz: nfZ,
    radius: 42.0,
  });

  // ============================================================================
  // 5. ANCIENT PHARAOH STEPPED SUN PYRAMID, TWIN OBELISKS & SPHINX (-475, 295)
  // ============================================================================
  const desertPyramidGroup = new THREE.Group();
  const pyX = DESERT_PYRAMID_SANCTUARY_POS.x;
  const pyZ = DESERT_PYRAMID_SANCTUARY_POS.z;
  const pyBaseY = DESERT_PYRAMID_SANCTUARY_POS.baseY;

  // 5 Stepped Sandstone Tiers rising from halfBase = 22.0m to topHalf = 5.5m (each tier 2.8m high)
  for (let tier = 0; tier < 5; tier++) {
    const tierHalf = DESERT_PYRAMID_SANCTUARY_POS.halfBase - tier * 3.3;
    const tierGeo = new THREE.BoxGeometry(tierHalf * 2, 2.8, tierHalf * 2);
    disposableGeometries.push(tierGeo);
    const tierMesh = new THREE.Mesh(
      tierGeo,
      tier === 4 ? orichalcumGoldMat : goldenSandstoneMat
    );
    tierMesh.position.set(pyX, pyBaseY + tier * 2.8 + 1.4, pyZ);
    desertPyramidGroup.add(tierMesh);
  }

  // Walkable Eastern Ceremonial Staircase Ramp (dx: +5.5..+26.0, width 7.2m)
  const rampLen = Math.hypot(20.5, 14.0);
  const rampPitch = Math.atan2(14.0, 20.5);
  const pyramidRampGeo = new THREE.BoxGeometry(rampLen, 0.9, DESERT_PYRAMID_SANCTUARY_POS.rampHalfWidthZ * 2);
  const obeliskShaftGeo = new THREE.CylinderGeometry(0.65, 1.25, 13.5, 4);
  obeliskShaftGeo.rotateY(Math.PI / 4);
  const obeliskCapGeo = new THREE.ConeGeometry(0.92, 1.85, 4);
  obeliskCapGeo.rotateY(Math.PI / 4);
  const sunDiscGeo = new THREE.TorusGeometry(1.85, 0.32, 10, 24);
  const sphinxBodyGeo = new THREE.BoxGeometry(7.6, 3.4, 3.2);
  const sphinxHeadGeo = new THREE.BoxGeometry(2.4, 2.6, 2.6);
  disposableGeometries.push(
    pyramidRampGeo,
    obeliskShaftGeo,
    obeliskCapGeo,
    sunDiscGeo,
    sphinxBodyGeo,
    sphinxHeadGeo
  );

  const pyramidRampMesh = new THREE.Mesh(pyramidRampGeo, goldenSandstoneMat);
  pyramidRampMesh.position.set(pyX + 15.75, pyBaseY + 7.0 - 0.35, pyZ);
  pyramidRampMesh.rotation.z = rampPitch;
  desertPyramidGroup.add(pyramidRampMesh);

  // Summit Golden Sun-Disc Altar at topY (16.35m)
  const pyramidSunDisc = new THREE.Mesh(sunDiscGeo, orichalcumGoldMat);
  pyramidSunDisc.position.set(pyX, DESERT_PYRAMID_SANCTUARY_POS.topY + 2.5, pyZ);
  pyramidSunDisc.rotation.y = Math.PI / 2;
  const sunCoreGem = new THREE.Mesh(sternLampSphereGeo, warmLanternMat);
  sunCoreGem.scale.setScalar(2.4);
  sunCoreGem.position.set(pyX, DESERT_PYRAMID_SANCTUARY_POS.topY + 2.5, pyZ);
  desertPyramidGroup.add(pyramidSunDisc, sunCoreGem);

  // Twin Hieroglyphic Obelisks flanking the Ceremonial Staircase Foot (x = pyX + 28, z = pyZ ± 10.5)
  for (const sideZ of [-10.5, 10.5]) {
    const obShaft = new THREE.Mesh(obeliskShaftGeo, goldenSandstoneMat);
    obShaft.position.set(pyX + 28.0, pyBaseY + 6.75, pyZ + sideZ);
    const obCap = new THREE.Mesh(obeliskCapGeo, orichalcumGoldMat);
    obCap.position.set(pyX + 28.0, pyBaseY + 14.4, pyZ + sideZ);
    desertPyramidGroup.add(obShaft, obCap);
  }

  // Guardian Desert Sphinx Statue at (sphinxX: -436, sphinxZ - 14.0) facing East (+X)
  const spX = DESERT_PYRAMID_SANCTUARY_POS.sphinxX;
  const spZ = DESERT_PYRAMID_SANCTUARY_POS.sphinxZ - 14.0;
  const sphinxBody = new THREE.Mesh(sphinxBodyGeo, goldenSandstoneMat);
  sphinxBody.position.set(spX, pyBaseY + 1.7, spZ);
  const sphinxHead = new THREE.Mesh(sphinxHeadGeo, orichalcumGoldMat);
  sphinxHead.position.set(spX + 2.6, pyBaseY + 4.4, spZ);
  desertPyramidGroup.add(sphinxBody, sphinxHead);

  scene.add(desertPyramidGroup);
  distanceCulledObjects.push({
    obj: desertPyramidGroup,
    cx: pyX,
    cz: pyZ,
    radius: 58.0,
  });

  // ============================================================================
  // 6. MID-OCEAN CORSAIR SMUGGLER COVE & BEACON WATCHTOWER ISLAND (540, 185)
  // ============================================================================
  const smugglerIslandGroup = new THREE.Group();
  const smX = SMUGGLER_ISLAND_POS.x;
  const smZ = SMUGGLER_ISLAND_POS.z;
  const smDeckY = SMUGGLER_ISLAND_POS.deckY;

  const smugglerDockPlankGeo = new THREE.BoxGeometry(
    SMUGGLER_ISLAND_POS.dockMaxX - SMUGGLER_ISLAND_POS.dockMinX,
    0.45,
    SMUGGLER_ISLAND_POS.dockHalfWidthZ * 2
  );
  const smugglerTowerBaseGeo = new THREE.CylinderGeometry(3.8, 4.5, 10.4, 8);
  const smugglerTowerDeckGeo = new THREE.CylinderGeometry(4.8, 4.4, 0.7, 8);
  const smugglerBeaconCageGeo = new THREE.CylinderGeometry(1.1, 0.85, 1.8, 6);
  disposableGeometries.push(
    smugglerDockPlankGeo,
    smugglerTowerBaseGeo,
    smugglerTowerDeckGeo,
    smugglerBeaconCageGeo
  );

  // Western Timber Docking Pier (x: 498..516, z: 185, y: 2.25)
  const smugglerPier = new THREE.Mesh(smugglerDockPlankGeo, shipDeckPlankMat);
  smugglerPier.position.set(
    (SMUGGLER_ISLAND_POS.dockMinX + SMUGGLER_ISLAND_POS.dockMaxX) * 0.5,
    smDeckY - 0.18,
    SMUGGLER_ISLAND_POS.dockZ
  );
  smugglerIslandGroup.add(smugglerPier);
  for (const px of [500.0, 507.0, 514.0]) {
    for (const pz of [smZ - 2.9, smZ + 2.9]) {
      const piling = new THREE.Mesh(stallPostGeo, shipHullWoodMat);
      piling.scale.set(2.2, 4.5, 2.2);
      piling.position.set(px, 0.6, pz);
      smugglerIslandGroup.add(piling);
    }
  }

  // Corsair Sea Beacon Watchtower at (546, 185)
  const twX = SMUGGLER_ISLAND_POS.towerX;
  const twZ = SMUGGLER_ISLAND_POS.towerZ;
  const smTowerBase = new THREE.Mesh(smugglerTowerBaseGeo, nordicGraniteMat);
  smTowerBase.position.set(twX, smDeckY + 5.2, twZ);
  const smTowerDeck = new THREE.Mesh(smugglerTowerDeckGeo, imperialDoorWoodMat);
  smTowerDeck.position.set(twX, SMUGGLER_ISLAND_POS.towerTopY - 0.35, twZ);
  const smBeaconCage = new THREE.Mesh(smugglerBeaconCageGeo, bronzeCannonMat);
  smBeaconCage.position.set(twX, SMUGGLER_ISLAND_POS.towerTopY + 0.9, twZ);
  const smBeaconFlame = new THREE.Mesh(sternLampSphereGeo, warmLanternMat);
  smBeaconFlame.scale.setScalar(2.6);
  smBeaconFlame.position.set(twX, SMUGGLER_ISLAND_POS.towerTopY + 1.35, twZ);
  smugglerIslandGroup.add(smTowerBase, smTowerDeck, smBeaconCage, smBeaconFlame);

  scene.add(smugglerIslandGroup);
  distanceCulledObjects.push({
    obj: smugglerIslandGroup,
    cx: smX,
    cz: smZ,
    radius: 48.0,
  });

  // ============================================================================
  // 7. PER-FRAME ANIMATION & LIVE SHIP TRANSFORM SYNC
  // ============================================================================
  const updateAtlantisAndShip = (elapsedTime: number, playerX: number, playerZ: number) => {
    // 1) Sync all 4 Sailable Ship 3D groups with live sailableShipSystem states
    const idleWaveBob = Math.sin(elapsedTime * 1.85) * 0.07;
    const idleWaveRoll = Math.cos(elapsedTime * 1.45) * 0.015;
    for (let i = 0; i < shipVisualHandles.length; i++) {
      const h = shipVisualHandles[i];
      const liveShip = h.state;
      if (!liveShip.spawned) {
        h.root.visible = false;
        continue;
      }
      h.root.position.set(liveShip.x, liveShip.deckY + idleWaveBob, liveShip.z);
      h.root.rotation.set(liveShip.pitchAngle, liveShip.yaw, liveShip.rollAngle + idleWaveRoll);
      h.root.visible = isWithinViewDistance(
        liveShip.x,
        liveShip.z,
        playerX,
        playerZ,
        28.0,
        VIEW_DISTANCE
      );
      if (h.root.visible) {
        h.wheelPivot.rotation.z = liveShip.wheelAngle;
        h.compassCrystal.rotation.y = elapsedTime * 1.8;
        const worldAngleToAtlantis = Math.atan2(
          -(RUINED_ATLANTIS_POS.x - liveShip.x),
          -(RUINED_ATLANTIS_POS.z - liveShip.z)
        );
        h.wayfinderNeedleGroup.rotation.y = worldAngleToAtlantis - liveShip.yaw;

        const spdRatio = Math.min(1.0, Math.abs(liveShip.speed) / 14.0);
        h.bowWakeGroup.visible = spdRatio > 0.04;
        if (h.bowWakeGroup.visible) {
          h.bowWakeGroup.scale.set(0.65 + spdRatio * 0.75, 1.0, 0.55 + spdRatio * 0.85);
          wakeFoamMat.opacity = 0.24 + spdRatio * 0.5;
        }
      }
    }

    // 2) Animate Ruined Atlantis Boss Seal Astrolabe Rings & Crystal Core when visible
    if (atlantisGroup.visible) {
      bossSealAstrolabeGroup.position.y =
        arenaY + 13.8 + Math.sin(elapsedTime * 1.5) * 0.48;
      sealCrystal.rotation.y = elapsedTime * 0.95;
      astroRing1.rotation.y = elapsedTime * 0.65;
      astroRing1.rotation.x = Math.sin(elapsedTime * 0.5) * 0.45;
      astroRing2.rotation.z = -elapsedTime * 0.85;
      astroRing2.rotation.y = Math.cos(elapsedTime * 0.6) * 0.52;
    }

    // 3) Animate Nordic Frost Shrine Floating Rune Crystal & Desert Sun Pyramid Disc when visible
    if (nordicShrineGroup.visible) {
      nordicFloatingCrystal.position.y =
        NORDIC_FROST_SHRINE_POS.altarDaisY + 2.4 + Math.sin(elapsedTime * 1.8) * 0.28;
      nordicFloatingCrystal.rotation.y = elapsedTime * 0.9;
    }
    if (desertPyramidGroup.visible) {
      pyramidSunDisc.rotation.y = elapsedTime * 0.75;
    }
  };

  return {
    atlantisGroup,
    sailableShipGroup,
    updateAtlantisAndShip,
  };
}
