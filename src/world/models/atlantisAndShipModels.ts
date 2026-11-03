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
  isWithinViewDistance,
} from '../terrainMath';
import { getActiveSailableShip } from '../systems/sailableShipSystem';
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
    radius: 280.0,
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
    radius: 130.0,
  });

  // 3B) Sailable 3-Masted Royal Explorer Flagship (Dynamic ocean-going flagship with Animal Stall)
  const sailableShipGroup = new THREE.Group();
  const shipState = getActiveSailableShip();
  sailableShipGroup.position.set(shipState.x, shipState.deckY, shipState.z);
  sailableShipGroup.rotation.order = 'YXZ';
  sailableShipGroup.rotation.y = shipState.yaw;

  const flagshipHullGeo = new THREE.BoxGeometry(8.6, 3.0, 20.4);
  const flagshipBowGeo = new THREE.ConeGeometry(4.3, 6.6, 4);
  flagshipBowGeo.rotateX(-Math.PI / 2);
  flagshipBowGeo.rotateZ(Math.PI / 4);
  const flagshipBowspritGeo = new THREE.CylinderGeometry(0.12, 0.24, 7.8, 8);
  flagshipBowspritGeo.rotateX(Math.PI * 0.36);
  const flagshipMainDeckGeo = new THREE.BoxGeometry(8.8, 0.24, 22.4);
  const flagshipQuarterdeckGeo = new THREE.BoxGeometry(8.8, 0.68, 7.8);
  const captainsCabinGeo = new THREE.BoxGeometry(7.2, 1.85, 5.2);
  const cabinWindowGeo = new THREE.PlaneGeometry(0.85, 0.72);
  const flagshipRailSideGeo = new THREE.BoxGeometry(0.28, 0.92, 21.4);
  const flagshipRailSternGeo = new THREE.BoxGeometry(8.8, 1.08, 0.32);
  const figureheadNeckGeo = new THREE.CylinderGeometry(0.28, 0.48, 2.2, 8);
  figureheadNeckGeo.rotateX(Math.PI * 0.28);
  const figureheadHeadGeo = new THREE.ConeGeometry(0.52, 1.35, 6);
  figureheadHeadGeo.rotateX(-Math.PI * 0.42);

  // Midships Animal & Mount Cargo Stall Geometries (z = -5.2..-0.8)
  const stallPostGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.25, 8);
  const stallRailLongGeo = new THREE.BoxGeometry(0.1, 0.12, 4.2);
  const stallRailCrossGeo = new THREE.BoxGeometry(5.4, 0.12, 0.1);
  const hayBaleGeo = new THREE.BoxGeometry(0.95, 0.52, 0.68);
  const waterTroughGeo = new THREE.BoxGeometry(0.68, 0.46, 1.45);

  // 6 Broadside Bronze Cannons
  const cannonCarriageGeo = new THREE.BoxGeometry(0.62, 0.42, 0.95);
  const cannonBarrelGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.45, 10);
  cannonBarrelGeo.rotateZ(Math.PI / 2);

  // 3 Masts, Sails, Crow's Nest & Royal Pennants
  const flagshipMastGeo = new THREE.CylinderGeometry(0.2, 0.32, 17.2, 10);
  flagshipMastGeo.translate(0, 8.6, 0);
  const crowsNestGeo = new THREE.CylinderGeometry(0.95, 0.72, 0.85, 10);
  const flagshipYardGeo = new THREE.CylinderGeometry(0.1, 0.12, 8.6, 8);
  flagshipYardGeo.rotateZ(Math.PI / 2);
  const flagshipSailGeo = new THREE.PlaneGeometry(8.2, 4.6, 8, 4);
  const fSailPos = flagshipSailGeo.attributes.position;
  for (let i = 0; i < fSailPos.count; i++) {
    const sx = fSailPos.getX(i);
    const sy = fSailPos.getY(i);
    const billow = Math.cos((sx / 8.2) * Math.PI) * Math.cos((sy / 4.6) * Math.PI) * 1.08;
    fSailPos.setZ(i, -billow);
  }
  flagshipSailGeo.computeVertexNormals();
  const royalPennantGeo = new THREE.ConeGeometry(0.38, 2.8, 4);
  royalPennantGeo.rotateX(Math.PI / 2);

  // Helm, Ship's Wheel & Live Atlantean Wayfinder Compass Spear
  const helmStandGeo = new THREE.BoxGeometry(0.42, 1.24, 0.38);
  const wheelRimGeo = new THREE.TorusGeometry(0.66, 0.065, 8, 18);
  const wheelSpokeGeo = new THREE.CylinderGeometry(0.028, 0.028, 1.56, 6);
  const wayfinderSpearGeo = new THREE.ConeGeometry(0.16, 0.95, 6);
  wayfinderSpearGeo.rotateX(-Math.PI / 2); // Points along local -Z when rotation.y = 0
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
    sternLampSphereGeo,
    wakeWingGeo
  );

  const cHull = new THREE.Mesh(flagshipHullGeo, shipHullWoodMat);
  cHull.position.set(0, -1.45, 0.4);
  const cBow = new THREE.Mesh(flagshipBowGeo, shipHullWoodMat);
  cBow.position.set(0, -1.0, -12.2);
  const cBowsprit = new THREE.Mesh(flagshipBowspritGeo, imperialDoorWoodMat);
  cBowsprit.position.set(0, 0.95, -13.8);

  // Carved Golden Sea-Dragon Figurehead at the Prow
  const figNeck = new THREE.Mesh(figureheadNeckGeo, orichalcumGoldMat);
  figNeck.position.set(0, 0.25, -12.6);
  const figHead = new THREE.Mesh(figureheadHeadGeo, orichalcumGoldMat);
  figHead.position.set(0, 1.15, -13.4);

  const cMainDeck = new THREE.Mesh(flagshipMainDeckGeo, shipDeckPlankMat);
  cMainDeck.position.set(0, -0.1, 0);
  const cQuarterdeck = new THREE.Mesh(flagshipQuarterdeckGeo, shipDeckPlankMat);
  cQuarterdeck.position.set(0, 0.32, 6.8);
  const captainsCabin = new THREE.Mesh(captainsCabinGeo, imperialDoorWoodMat);
  captainsCabin.position.set(0, 0.85, 7.6);

  // Warm Glowing Stern Cabin Windows
  for (const wx of [-1.8, 0, 1.8]) {
    const win = new THREE.Mesh(cabinWindowGeo, warmLanternMat);
    win.position.set(wx, 1.05, 10.22);
    sailableShipGroup.add(win);
  }

  const cRailPort = new THREE.Mesh(flagshipRailSideGeo, imperialCrimsonMat);
  cRailPort.position.set(-4.25, 0.46, 0.4);
  const cRailStbd = new THREE.Mesh(flagshipRailSideGeo, imperialCrimsonMat);
  cRailStbd.position.set(4.25, 0.46, 0.4);
  const cRailStern = new THREE.Mesh(flagshipRailSternGeo, imperialGoldMat);
  cRailStern.position.set(0, 1.25, 10.8);

  sailableShipGroup.add(
    cHull,
    cBow,
    cBowsprit,
    figNeck,
    figHead,
    cMainDeck,
    cQuarterdeck,
    captainsCabin,
    cRailPort,
    cRailStbd,
    cRailStern
  );

  // Midships Animal & Mount Deck Stall (z = -5.0..-0.8, x = -2.7..+2.7)
  const animalStallGroup = new THREE.Group();
  for (const sx of [-2.7, 2.7]) {
    for (const sz of [-5.0, -2.9, -0.8]) {
      const post = new THREE.Mesh(stallPostGeo, imperialDoorWoodMat);
      post.position.set(sx, 0.62, sz);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.03, 6, 12),
        orichalcumGoldMat
      );
      ring.position.set(sx, 1.15, sz);
      animalStallGroup.add(post, ring);
    }
    for (const ry of [0.48, 0.92]) {
      const sideRail = new THREE.Mesh(stallRailLongGeo, shipDeckPlankMat);
      sideRail.position.set(sx, ry, -2.9);
      animalStallGroup.add(sideRail);
    }
  }
  const frontCrossRail = new THREE.Mesh(stallRailCrossGeo, shipDeckPlankMat);
  frontCrossRail.position.set(0, 0.88, -5.0);
  const trough = new THREE.Mesh(waterTroughGeo, imperialDoorWoodMat);
  trough.position.set(-2.15, 0.23, -3.1);
  const hay1 = new THREE.Mesh(hayBaleGeo, hayStrawMat);
  hay1.position.set(2.05, 0.26, -3.8);
  hay1.rotation.y = 0.18;
  const hay2 = new THREE.Mesh(hayBaleGeo, hayStrawMat);
  hay2.position.set(2.1, 0.26, -2.9);
  hay2.rotation.y = -0.12;
  const hay3 = new THREE.Mesh(hayBaleGeo, hayStrawMat);
  hay3.position.set(2.08, 0.76, -3.35);
  animalStallGroup.add(frontCrossRail, trough, hay1, hay2, hay3);
  sailableShipGroup.add(animalStallGroup);

  // 6 Bronze Broadside Cannons (3 Port, 3 Starboard)
  for (const cz of [-6.4, -2.8, 0.8]) {
    for (const side of [-1, 1]) {
      const carriage = new THREE.Mesh(cannonCarriageGeo, imperialDoorWoodMat);
      carriage.position.set(side * 3.7, 0.21, cz);
      const barrel = new THREE.Mesh(cannonBarrelGeo, bronzeCannonMat);
      barrel.position.set(side * 4.05, 0.52, cz);
      sailableShipGroup.add(carriage, barrel);
    }
  }

  // 3 Towering Masts (Foremast z = -7.0, Mainmast z = -0.6, Mizzenmast z = +5.4)
  for (const [mz, mScale, hasCrowsNest] of [
    [-7.0, 0.88, false],
    [-0.6, 1.08, true],
    [5.4, 0.82, false],
  ] as const) {
    const mast = new THREE.Mesh(flagshipMastGeo, shipHullWoodMat);
    mast.position.set(0, 0, mz);
    mast.scale.y = mScale;
    sailableShipGroup.add(mast);

    if (hasCrowsNest) {
      const nest = new THREE.Mesh(crowsNestGeo, imperialDoorWoodMat);
      nest.position.set(0, 13.2 * mScale, mz);
      sailableShipGroup.add(nest);
    }

    const pennant = new THREE.Mesh(royalPennantGeo, imperialCrimsonMat);
    pennant.position.set(0, 17.2 * mScale, mz + 1.4);
    sailableShipGroup.add(pennant);

    for (const sy of [6.8 * mScale, 12.0 * mScale]) {
      const yard = new THREE.Mesh(flagshipYardGeo, imperialDoorWoodMat);
      yard.position.set(0, sy + 2.0, mz);
      yard.scale.x = mScale;
      const sail = new THREE.Mesh(flagshipSailGeo, sailCanvasMat);
      sail.position.set(0, sy, mz - 0.26);
      sail.scale.x = mScale;
      sailableShipGroup.add(yard, sail);
    }
  }

  // Interactive Helm Stand, Ship's Wheel & Live Atlantean Wayfinder Compass at Quarterdeck (z = 3.25)
  const helmStand = new THREE.Mesh(helmStandGeo, imperialDoorWoodMat);
  helmStand.position.set(0, 1.18, 3.25);
  const shipWheelPivot = new THREE.Group();
  shipWheelPivot.position.set(0, 1.68, 3.46);
  const wRim = new THREE.Mesh(wheelRimGeo, imperialGoldMat);
  shipWheelPivot.add(wRim);
  for (let sp = 0; sp < 4; sp++) {
    const spoke = new THREE.Mesh(wheelSpokeGeo, orichalcumGoldMat);
    spoke.rotation.z = (sp / 4) * Math.PI;
    shipWheelPivot.add(spoke);
  }

  // Live Rotating Atlantean Wayfinder Compass Spear on the Helm Binnacle pointing toward Ruined Atlantis (980, 420)
  const wayfinderBinnacleGroup = new THREE.Group();
  wayfinderBinnacleGroup.position.set(0, 1.82, 3.12);
  const helmCompassCrystal = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
  helmCompassCrystal.scale.setScalar(0.11);
  const wayfinderNeedleGroup = new THREE.Group();
  const wayfinderSpear = new THREE.Mesh(wayfinderSpearGeo, biolumCyanMat);
  wayfinderSpear.scale.setScalar(0.55);
  wayfinderSpear.position.set(0, 0.14, -0.22);
  const wayfinderTail = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    orichalcumGoldMat
  );
  wayfinderTail.position.set(0, 0.14, 0.12);
  wayfinderNeedleGroup.add(wayfinderSpear, wayfinderTail);
  wayfinderBinnacleGroup.add(helmCompassCrystal, wayfinderNeedleGroup);

  // 4 Warm Stern & Quarterdeck Lanterns
  for (const [lx, ly, lz] of [
    [-3.8, 1.95, 10.6],
    [3.8, 1.95, 10.6],
    [-4.1, 1.55, 3.2],
    [4.1, 1.55, 3.2],
  ] as const) {
    const lamp = new THREE.Mesh(sternLampSphereGeo, warmLanternMat);
    lamp.position.set(lx, ly, lz);
    sailableShipGroup.add(lamp);
  }

  sailableShipGroup.add(helmStand, shipWheelPivot, wayfinderBinnacleGroup);

  // V-Shaped Animated Bow Wake Foam Group (at water level y = -1.6)
  const bowWakeGroup = new THREE.Group();
  bowWakeGroup.position.set(0, -1.52, -12.6);
  const wakeLeft = new THREE.Mesh(wakeWingGeo, wakeFoamMat);
  wakeLeft.position.set(-3.1, 0, 7.2);
  wakeLeft.rotation.y = 0.32;
  const wakeRight = new THREE.Mesh(wakeWingGeo, wakeFoamMat);
  wakeRight.position.set(3.1, 0, 7.2);
  wakeRight.rotation.y = -0.32;
  bowWakeGroup.add(wakeLeft, wakeRight);
  sailableShipGroup.add(bowWakeGroup);

  scene.add(sailableShipGroup);

  // ============================================================================
  // 4. PER-FRAME ANIMATION & LIVE SHIP TRANSFORM SYNC
  // ============================================================================
  const updateAtlantisAndShip = (elapsedTime: number, playerX: number, playerZ: number) => {
    // 1) Sync Sailable Ship 3D group with live sailableShipSystem state
    const liveShip = getActiveSailableShip();
    const idleWaveBob = Math.sin(elapsedTime * 1.85) * 0.07;
    const idleWaveRoll = Math.cos(elapsedTime * 1.45) * 0.015;
    sailableShipGroup.position.set(
      liveShip.x,
      liveShip.deckY + idleWaveBob,
      liveShip.z
    );
    sailableShipGroup.rotation.set(
      liveShip.pitchAngle,
      liveShip.yaw,
      liveShip.rollAngle + idleWaveRoll
    );
    sailableShipGroup.visible = isWithinViewDistance(
      liveShip.x,
      liveShip.z,
      playerX,
      playerZ,
      115.0,
      320.0
    );
    shipWheelPivot.rotation.z = liveShip.wheelAngle;
    helmCompassCrystal.rotation.y = elapsedTime * 1.8;

    // Point the glowing cyan Wayfinder Spear directly toward Ruined Atlantis (980, 420)
    const worldAngleToAtlantis = Math.atan2(
      -(RUINED_ATLANTIS_POS.x - liveShip.x),
      -(RUINED_ATLANTIS_POS.z - liveShip.z)
    );
    wayfinderNeedleGroup.rotation.y = worldAngleToAtlantis - liveShip.yaw;

    const spdRatio = Math.min(1.0, Math.abs(liveShip.speed) / 14.0);
    bowWakeGroup.visible = spdRatio > 0.04;
    if (bowWakeGroup.visible) {
      bowWakeGroup.scale.set(0.65 + spdRatio * 0.75, 1.0, 0.55 + spdRatio * 0.85);
      wakeFoamMat.opacity = 0.24 + spdRatio * 0.5;
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
  };

  return {
    atlantisGroup,
    sailableShipGroup,
    updateAtlantisAndShip,
  };
}
