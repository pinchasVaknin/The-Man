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
  CHINESE_FORTRESS_POS,
  FORTRESS_Z_OFFSET,
  ATLANTIS_DEAD_KING_STATUE_POS,
  RUINED_ATLANTIS_POS,
  SAILABLE_SHIP_INITIAL_POS,
  NORDIC_FROST_SHRINE_POS,
  DESERT_PYRAMID_SANCTUARY_POS,
  SMUGGLER_ISLAND_POS,
  VIEW_DISTANCE,
  isWithinViewDistance,
  groundHeightAt,
} from '../../terrainMath';
import {
  HOT_SPRING_ARCHERY_TARGETS,
  ARCHERY_TARGET_DIMENSIONS,
} from '../../domain/landmarksRegistry';
import {
  getAllSailableShips,
  getInterpolatedSailableShipPose,
  SHIP_CATALOG,
  type ISailableShipState,
} from '../../systems/sailableShipSystem';
import {
  createArcheryTargetModelInstance,
  getLoadedArcheryTargetModel,
  isArcheryTargetModelLoaded,
  loadArcheryTargetModel,
  type IArcheryTargetModelAsset,
} from '../equipment/archeryTargetAssets';
import { registerWoodenDummy, spawnTempleMonk } from '../../systems/monkTempleSystem';
import { createStatueModelInstance, loadStatueModel } from '../statues/statueAssets';
import { createShipModelInstance, loadShipModel } from '../vehicles/shipAssets';
import type { IWorldModelBuildContext } from '../types';

export interface IAtlantisAndShipHandles {
  atlantisGroup: THREE.Group;
  sailableShipGroup: THREE.Group;
  updateAtlantisAndShip: (elapsedTime: number, playerX: number, playerZ: number, alpha?: number) => void;
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
  const atlantisShoreFoamMat = new THREE.MeshBasicMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
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
    wakeFoamMat,
    atlantisShoreFoamMat
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

  const arenaWaterFoamGeo = new THREE.RingGeometry(34.6, 36.8, 48);
  arenaWaterFoamGeo.rotateX(-Math.PI / 2);
  const dockSideFoamGeo = new THREE.PlaneGeometry(60.0, 1.35);
  dockSideFoamGeo.rotateX(-Math.PI / 2);
  const outerPlinthFoamGeo = new THREE.RingGeometry(5.9, 7.2, 20);
  outerPlinthFoamGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(arenaWaterFoamGeo, dockSideFoamGeo, outerPlinthFoamGeo);

  const arenaWaterFoam = new THREE.Mesh(arenaWaterFoamGeo, atlantisShoreFoamMat);
  arenaWaterFoam.position.y = 0.06;

  atlantisGroup.add(
    arenaSlab,
    arenaWaterFoam,
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

  // 2B-2) Monumental Dead King Skeleton Statue on an Atlantean Stepped Pedestal (ded_king_skelton.glb)
  const deadKingMonumentGroup = new THREE.Group();
  deadKingMonumentGroup.name = 'atlantis-dead-king-monument';
  deadKingMonumentGroup.position.set(
    ATLANTIS_DEAD_KING_STATUE_POS.localX,
    arenaY,
    ATLANTIS_DEAD_KING_STATUE_POS.localZ
  );

  const dkBasePlinthGeo = new THREE.CylinderGeometry(3.8, 4.15, 0.48, 8);
  const dkMidTierGeo = new THREE.CylinderGeometry(3.45, 3.7, 0.72, 8);
  const dkGoldBandGeo = new THREE.CylinderGeometry(3.52, 3.52, 0.14, 8);
  const dkTopCapGeo = new THREE.CylinderGeometry(3.38, 3.48, 0.24, 8);
  const dkCornerPillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 6);
  disposableGeometries.push(
    dkBasePlinthGeo,
    dkMidTierGeo,
    dkGoldBandGeo,
    dkTopCapGeo,
    dkCornerPillarGeo
  );

  const dkBasePlinth = new THREE.Mesh(dkBasePlinthGeo, atlanteanTealStoneMat);
  dkBasePlinth.position.y = 0.24;
  dkBasePlinth.receiveShadow = !isSoftwareGl;
  const dkMidTier = new THREE.Mesh(dkMidTierGeo, atlanteanMarbleMat);
  dkMidTier.position.y = 0.48 + 0.36;
  dkMidTier.castShadow = !isSoftwareGl;
  dkMidTier.receiveShadow = !isSoftwareGl;
  const dkGoldBand = new THREE.Mesh(dkGoldBandGeo, orichalcumGoldMat);
  dkGoldBand.position.y = 1.15;
  const dkTopCap = new THREE.Mesh(dkTopCapGeo, atlanteanTealStoneMat);
  dkTopCap.position.y = ATLANTIS_DEAD_KING_STATUE_POS.pedestalHeight - 0.12;
  dkTopCap.receiveShadow = !isSoftwareGl;
  deadKingMonumentGroup.add(dkBasePlinth, dkMidTier, dkGoldBand, dkTopCap);

  for (let c = 0; c < 4; c++) {
    const cAng = (c / 4) * Math.PI * 2 + Math.PI / 4;
    const cx = Math.cos(cAng) * 3.72;
    const cz = Math.sin(cAng) * 3.72;
    const pillar = new THREE.Mesh(dkCornerPillarGeo, atlanteanTealStoneMat);
    pillar.position.set(cx, 0.6, cz);
    const gem = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
    gem.scale.setScalar(0.18);
    gem.position.set(cx, 1.38, cz);
    deadKingMonumentGroup.add(pillar, gem);
  }

  const deadKingMountGroup = new THREE.Group();
  deadKingMountGroup.name = 'atlantis-dead-king-statue-mount';
  deadKingMountGroup.position.y = ATLANTIS_DEAD_KING_STATUE_POS.pedestalHeight;
  deadKingMountGroup.rotation.y = ATLANTIS_DEAD_KING_STATUE_POS.facingYaw;
  deadKingMonumentGroup.add(deadKingMountGroup);
  atlantisGroup.add(deadKingMonumentGroup);

  loadStatueModel('ded_king_skelton')
    .then((asset) => {
      if (!atlantisGroup.parent) return;
      const statueInstance = createStatueModelInstance(asset, {
        scale: ATLANTIS_DEAD_KING_STATUE_POS.statueScale,
        castShadow: !isSoftwareGl,
        receiveShadow: !isSoftwareGl,
      });
      deadKingMountGroup.add(statueInstance);
    })
    .catch((err: unknown) => {
      ctx.logger.warn('Atlantis Dead King statue model could not be loaded', {
        statueId: 'ded_king_skelton',
        error: String(err),
      });
    });

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

    const plinthFoam = new THREE.Mesh(outerPlinthFoamGeo, atlantisShoreFoamMat);
    plinthFoam.position.set(sx, 0.06, sz);
    atlantisGroup.add(plinthFoam);

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
  for (const foamSideZ of [-5.25, 5.25]) {
    const dockFoamStrip = new THREE.Mesh(dockSideFoamGeo, atlantisShoreFoamMat);
    dockFoamStrip.position.set((dockStartLocalX + dockEndLocalX) * 0.5 - 1.0, 0.06, foamSideZ);
    atlantisGroup.add(dockFoamStrip);
  }

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
  // 3A) Wooden Royal Ship Pier connecting Harbor Plaza (254.5, 282.0) to Sailable Ship port gangway (277.0, 288.2)
  const harborJettyGroup = new THREE.Group();
  const jettyDeckGeo = new THREE.BoxGeometry(21.2, 0.28, 5.8);
  const jettyApronGeo = new THREE.BoxGeometry(4.4, 0.22, 2.2);
  const jettyPilingGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.4, 8);
  disposableGeometries.push(jettyDeckGeo, jettyApronGeo, jettyPilingGeo);

  const jettyDeck = new THREE.Mesh(jettyDeckGeo, shipDeckPlankMat);
  jettyDeck.position.set(264.8, 3.02, SAILABLE_SHIP_INITIAL_POS.jettyZ);
  jettyDeck.rotation.z = -0.018;
  const jettyApron = new THREE.Mesh(jettyApronGeo, shipDeckPlankMat);
  jettyApron.position.set(273.8, 2.83, SAILABLE_SHIP_INITIAL_POS.jettyZ + 3.25);
  harborJettyGroup.add(jettyDeck, jettyApron);
  for (const jx of [256.5, 261.5, 266.5, 272.0]) {
    for (const jz of [SAILABLE_SHIP_INITIAL_POS.jettyZ - 2.4, SAILABLE_SHIP_INITIAL_POS.jettyZ + 2.4]) {
      const piling = new THREE.Mesh(jettyPilingGeo, shipHullWoodMat);
      piling.position.set(jx, 1.4, jz);
      harborJettyGroup.add(piling);
    }
  }
  scene.add(harborJettyGroup);
  distanceCulledObjects.push({
    obj: harborJettyGroup,
    cx: 266.0,
    cz: SAILABLE_SHIP_INITIAL_POS.jettyZ,
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
  const shipFallbackGroups: THREE.Group[] = [];

  for (let sIdx = 0; sIdx < allShips.length; sIdx++) {
    const sState = allShips[sIdx];
    const def = SHIP_CATALOG.find((d) => d.tierId === sState.tierId) ?? SHIP_CATALOG[3];
    const tierRoot = new THREE.Group();
    tierRoot.position.set(sState.x, sState.deckY, sState.z);
    tierRoot.rotation.order = 'YXZ';
    tierRoot.rotation.y = sState.yaw;
    tierRoot.scale.set(def.scale, 1.0, def.scale);
    tierRoot.visible = sState.spawned;

    // Fallback procedural hull/rigging visible immediately until async ship.glb resolves
    const fallbackHullGroup = new THREE.Group();
    fallbackHullGroup.name = `ship-fallback-${sState.tierId}`;

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

    fallbackHullGroup.add(
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
      fallbackHullGroup.add(figNeck, figHead);
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
    fallbackHullGroup.add(animalStallGroup);

    // Broadside Cannons on Caravel, Galleon, and Flagship
    if (def.tierId !== 'sloop') {
      const cannonZs = def.tierId === 'caravel' ? [-4.2, -1.2] : [-6.4, -2.8, 0.8];
      for (const cz of cannonZs) {
        for (const side of [-1, 1]) {
          const carriage = new THREE.Mesh(cannonCarriageGeo, imperialDoorWoodMat);
          carriage.position.set(side * 3.7, 0.21, cz);
          const barrel = new THREE.Mesh(cannonBarrelGeo, bronzeCannonMat);
          barrel.position.set(side * 4.05, 0.52, cz);
          fallbackHullGroup.add(carriage, barrel);
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
      fallbackHullGroup.add(mast);

      if (hasCrowsNest) {
        const nest = new THREE.Mesh(crowsNestGeo, imperialDoorWoodMat);
        nest.position.set(0, 13.8 * mScale, mz);
        fallbackHullGroup.add(nest);
      }

      const pennant = new THREE.Mesh(royalPennantGeo, imperialCrimsonMat);
      pennant.position.set(0, 17.2 * mScale, mz + 1.4);
      fallbackHullGroup.add(pennant);

      // Sails elevated to 8.4m and 13.2m so the lower 6.2m above the deck is completely clear!
      for (const sy of [8.4 * mScale, 13.2 * mScale]) {
        const yard = new THREE.Mesh(flagshipYardGeo, imperialDoorWoodMat);
        yard.position.set(0, sy + 1.9, mz);
        yard.scale.x = mScale;
        const sail = new THREE.Mesh(flagshipSailGeo, sailCanvasMat);
        sail.position.set(0, sy, mz - 0.26);
        sail.scale.x = mScale;
        fallbackHullGroup.add(yard, sail);
      }
    }

    tierRoot.add(fallbackHullGroup);
    shipFallbackGroups.push(fallbackHullGroup);

    // Interactive Ship's Wheel & Lanterns: keep shipWheelPivot directly on tierRoot at the 2F helm pedestal
    // so it stays visible and turns smoothly when ship.glb loads!
    const helmStand = new THREE.Mesh(helmStandGeo, imperialDoorWoodMat);
    helmStand.position.set(0, 2.26, 8.24);
    const shipWheelPivot = new THREE.Group();
    shipWheelPivot.name = 'sailable-ship-active-wheel';
    shipWheelPivot.position.set(0, 2.72, 8.58);
    shipWheelPivot.scale.setScalar(0.86);
    const wRim = new THREE.Mesh(wheelRimGeo, imperialGoldMat);
    shipWheelPivot.add(wRim);
    for (let sp = 0; sp < 4; sp++) {
      const spoke = new THREE.Mesh(wheelSpokeGeo, orichalcumGoldMat);
      spoke.rotation.z = (sp / 4) * Math.PI;
      shipWheelPivot.add(spoke);
    }

    for (const [lx, ly, lz] of [
      [-3.8, 1.55, 10.4],
      [3.8, 1.55, 10.4],
      [-4.1, 1.35, 3.8],
      [4.1, 1.35, 3.8],
    ] as const) {
      const lamp = new THREE.Mesh(sternLampSphereGeo, warmLanternMat);
      lamp.position.set(lx, ly, lz);
      fallbackHullGroup.add(lamp);
    }
    fallbackHullGroup.add(helmStand);
    tierRoot.add(shipWheelPivot);

    // Compact glowing Wayfinder Compass Binnacle mounted on top of the 2F helm pedestal
    const wayfinderBinnacleGroup = new THREE.Group();
    wayfinderBinnacleGroup.position.set(0, 3.12, 8.12);
    const binnaclePedestal = new THREE.Mesh(helmStandGeo, imperialDoorWoodMat);
    binnaclePedestal.scale.set(0.45, 0.16, 0.45);
    binnaclePedestal.position.set(0, -0.09, 0);
    const helmCompassCrystal = new THREE.Mesh(crystalObeliskGeo, biolumCyanMat);
    helmCompassCrystal.scale.setScalar(0.11);
    const wayfinderNeedleGroup = new THREE.Group();
    const wayfinderSpear = new THREE.Mesh(wayfinderSpearGeo, biolumCyanMat);
    wayfinderSpear.scale.setScalar(0.55);
    wayfinderSpear.position.set(0, 0.14, -0.22);
    const wayfinderTail = new THREE.Mesh(wayfinderTailGeo, orichalcumGoldMat);
    wayfinderTail.position.set(0, 0.14, 0.12);
    wayfinderNeedleGroup.add(wayfinderSpear, wayfinderTail);
    wayfinderBinnacleGroup.add(binnaclePedestal, helmCompassCrystal, wayfinderNeedleGroup);

    tierRoot.add(wayfinderBinnacleGroup);

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

  // Swap procedural fallback fleet hulls to the detailed ship.glb model once loaded
  void loadShipModel()
    .then((shipAsset) => {
      for (let i = 0; i < shipVisualHandles.length; i++) {
        const handle = shipVisualHandles[i];
        const fallback = shipFallbackGroups[i];
        if (fallback) {
          fallback.visible = false;
        }
        const shipMesh = createShipModelInstance(shipAsset, {
          scale: 25.5,
          castShadow: !isSoftwareGl,
          receiveShadow: !isSoftwareGl,
        });
        handle.root.add(shipMesh);
      }
    })
    .catch(() => {
      // Procedural fallback fleet hull stays active cleanly if GLB fails in restricted environments
    });

  // ============================================================================
  // 4. ELEVATED NORTHERN GEOTHERMAL HOT SPRING & MARTIAL SANCTUARY COMPOUND (-310, -290, 34.0m)
  //    - Raised stone citadel plateau cleanly above the surrounding ridge (zero pit)
  //    - Open-air (roofless) multi-depth geothermal pool + Frost Crystal Altar
  //    - Covered West Onsen Tea & Dining Pavilion overlooking the pool
  //    - Covered North Bathhouse Cloister Gallery connecting West & East wings
  //    - Covered East Martial Dojo Veranda & Armory beside the Bagua Sparring Stage
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
  const wetRiverStoneMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    map: textures.rockAlbedo,
    roughness: 0.35,
    metalness: 0.1,
  });
  const geothermalWaterMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 0.42,
    roughness: 0.12,
    metalness: 0.16,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const goldenSandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xd9a05b,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.04,
    roughness: 0.68,
    metalness: 0.06,
  });
  const onsenTimberMat = new THREE.MeshStandardMaterial({
    color: 0x7c4a26,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.03,
    roughness: 0.65,
    metalness: 0.05,
  });
  const compoundPlasterMat = new THREE.MeshStandardMaterial({
    color: 0xe7dfd3,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.02,
    roughness: 0.82,
    metalness: 0.03,
  });
  const slateRoofMat = new THREE.MeshStandardMaterial({
    color: 0x293241,
    map: textures.rockAlbedo,
    roughness: 0.62,
    metalness: 0.16,
  });
  const ceramicCupMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.25,
    metalness: 0.08,
  });
  const foldedTowelMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.85,
  });
  const steamWispMat = new THREE.MeshBasicMaterial({
    color: 0xecfeff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  disposableMaterials.push(
    nordicGraniteMat,
    wetRiverStoneMat,
    geothermalWaterMat,
    goldenSandstoneMat,
    onsenTimberMat,
    compoundPlasterMat,
    slateRoofMat,
    ceramicCupMat,
    foldedTowelMat,
    steamWispMat
  );

  // Granite Citadel Retaining Plinth & Courtyard Deck Slabs (leaving open circular cutout for the geothermal basin!)
  const addGraniteDeckSlab = (minX: number, maxX: number, minZ: number, maxZ: number, topY: number, height: number) => {
    const geo = new THREE.BoxGeometry(maxX - minX, height, maxZ - minZ);
    disposableGeometries.push(geo);
    const mesh = new THREE.Mesh(geo, nordicGraniteMat);
    mesh.position.set((minX + maxX) * 0.5, topY - height * 0.5, (minZ + maxZ) * 0.5);
    mesh.receiveShadow = !isSoftwareGl;
    mesh.castShadow = !isSoftwareGl;
    nordicShrineGroup.add(mesh);
  };
  const cMinX = NORDIC_FROST_SHRINE_POS.compoundMinX; // -344
  const cMaxX = NORDIC_FROST_SHRINE_POS.compoundMaxX; // -274
  const cMinZ = NORDIC_FROST_SHRINE_POS.compoundMinZ; // -317
  const cMaxZ = NORDIC_FROST_SHRINE_POS.compoundMaxZ; // -267
  const collarHalf = 16.0;
  const poolCutMinX = nfX - collarHalf; // -336
  const poolCutMaxX = nfX + collarHalf; // -304
  const poolCutMinZ = nfZ - collarHalf; // -306
  const poolCutMaxZ = nfZ + collarHalf; // -274
  const plinthH = 7.5;
  addGraniteDeckSlab(cMinX, poolCutMinX, cMinZ, cMaxZ, nfFloorY, plinthH);
  addGraniteDeckSlab(poolCutMaxX, cMaxX, cMinZ, cMaxZ, nfFloorY, plinthH);
  addGraniteDeckSlab(poolCutMinX, poolCutMaxX, cMinZ, poolCutMinZ, nfFloorY, plinthH);
  addGraniteDeckSlab(poolCutMinX, poolCutMaxX, poolCutMaxZ, cMaxZ, nfFloorY, plinthH);

  // Seamless circular stone collar filling [-16..+16]^2 around the circular pool (zero corner gaps!)
  const poolCollarShape = new THREE.Shape();
  const cExt = collarHalf + 0.02;
  poolCollarShape.moveTo(-cExt, -cExt);
  poolCollarShape.lineTo(cExt, -cExt);
  poolCollarShape.lineTo(cExt, cExt);
  poolCollarShape.lineTo(-cExt, cExt);
  poolCollarShape.closePath();
  const poolCollarHole = new THREE.Path();
  poolCollarHole.absarc(0, 0, NORDIC_FROST_SHRINE_POS.poolRadius - 0.08, 0, Math.PI * 2, true);
  poolCollarShape.holes.push(poolCollarHole);
  const poolCollarGeo = new THREE.ExtrudeGeometry(poolCollarShape, {
    depth: plinthH,
    bevelEnabled: false,
    curveSegments: 48,
  });
  poolCollarGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(poolCollarGeo);
  const poolCollarMesh = new THREE.Mesh(poolCollarGeo, nordicGraniteMat);
  poolCollarMesh.position.set(nfX, nfFloorY, nfZ);
  poolCollarMesh.receiveShadow = !isSoftwareGl;
  poolCollarMesh.castShadow = !isSoftwareGl;
  nordicShrineGroup.add(poolCollarMesh);

  // Monumental South Entrance Granite Staircase climbing from approach trail (31.2m) to Gate (34.0m)
  // Non-overlapping step depths tucked cleanly inside balustrades so zero coplanar faces flicker.
  const gateCx = NORDIC_FROST_SHRINE_POS.gateCenterX;
  const gateHalfW = NORDIC_FROST_SHRINE_POS.gateHalfWidth;
  const gateZ = NORDIC_FROST_SHRINE_POS.gateZ;
  const stairBotZ = NORDIC_FROST_SHRINE_POS.stairBottomZ;
  const stairBotY = NORDIC_FROST_SHRINE_POS.stairBottomY;
  const gateStepCount = 12;
  const stepRun = (stairBotZ - gateZ) / gateStepCount;
  const stepRise = (nfFloorY - stairBotY) / gateStepCount;
  const gateStepGeo = new THREE.BoxGeometry((gateHalfW - 0.56) * 2, 1.8, stepRun - 0.02);
  const gateBalustradeGeo = new THREE.BoxGeometry(0.54, 1.45, stairBotZ - gateZ + 0.5);
  disposableGeometries.push(gateStepGeo, gateBalustradeGeo);
  for (let s = 0; s < gateStepCount; s++) {
    const stepZ = stairBotZ - (s + 0.5) * stepRun;
    const stepTopY = stairBotY + (s + 1) * stepRise;
    const stepMesh = new THREE.Mesh(gateStepGeo, wetRiverStoneMat);
    stepMesh.position.set(gateCx, stepTopY - 0.9, stepZ);
    stepMesh.receiveShadow = !isSoftwareGl;
    nordicShrineGroup.add(stepMesh);
  }
  for (const sideSign of [-1, 1]) {
    const bx = gateCx + sideSign * (gateHalfW - 0.27);
    const bal = new THREE.Mesh(gateBalustradeGeo, nordicGraniteMat);
    bal.position.set(bx, (stairBotY + nfFloorY) * 0.5 + 0.32, (gateZ + stairBotZ) * 0.5);
    bal.rotation.x = Math.atan2(nfFloorY - stairBotY, stairBotZ - gateZ);
    nordicShrineGroup.add(bal);
  }

  // Compound Outer Temple Walls (with wide open South Imperial Paifang Gatehouse separated cleanly from pillars & stairs)
  const compoundWallHeight = 4.2;
  const addCompoundWallSegment = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const baseGeo = new THREE.BoxGeometry(w + 0.18, 0.9, d + 0.18);
    const bodyGeo = new THREE.BoxGeometry(w, compoundWallHeight - 0.9, d);
    const capGeo = new THREE.BoxGeometry(w + 0.36, 0.32, d + 0.36);
    disposableGeometries.push(baseGeo, bodyGeo, capGeo);

    const baseM = new THREE.Mesh(baseGeo, nordicGraniteMat);
    baseM.position.set((minX + maxX) * 0.5, nfFloorY + 0.45, (minZ + maxZ) * 0.5);
    const bodyM = new THREE.Mesh(bodyGeo, compoundPlasterMat);
    bodyM.position.set((minX + maxX) * 0.5, nfFloorY + 0.9 + (compoundWallHeight - 0.9) * 0.5, (minZ + maxZ) * 0.5);
    bodyM.castShadow = !isSoftwareGl;
    bodyM.receiveShadow = !isSoftwareGl;
    const capM = new THREE.Mesh(capGeo, slateRoofMat);
    capM.position.set((minX + maxX) * 0.5, nfFloorY + compoundWallHeight + 0.12, (minZ + maxZ) * 0.5);
    nordicShrineGroup.add(baseM, bodyM, capM);
  };
  addCompoundWallSegment(cMinX, cMaxX, cMinZ - 0.4, cMinZ + 0.55); // North wall
  addCompoundWallSegment(cMinX - 0.4, cMinX + 0.55, cMinZ, cMaxZ); // West wall
  addCompoundWallSegment(cMaxX - 0.55, cMaxX + 0.4, cMinZ, cMaxZ); // East wall
  addCompoundWallSegment(cMinX, gateCx - gateHalfW - 0.95, cMaxZ - 0.55, cMaxZ + 0.4); // South-West wall
  addCompoundWallSegment(gateCx + gateHalfW + 0.95, cMaxX, cMaxZ - 0.55, cMaxZ + 0.4); // South-East wall

  // Grand South Paifang Gatehouse Archway at (-310, -267) with freestanding crimson pillars & granite plinths
  const gatePlinthGeo = new THREE.BoxGeometry(0.9, 0.42, 0.9);
  const gatePillarGeo = new THREE.CylinderGeometry(0.38, 0.42, 5.8, 12);
  const gateBeamGeo = new THREE.BoxGeometry(gateHalfW * 2 + 2.8, 0.55, 0.85);
  const gateRoofLowerGeo = new THREE.ConeGeometry(gateHalfW + 3.0, 2.2, 4);
  gateRoofLowerGeo.rotateY(Math.PI / 4);
  gateRoofLowerGeo.scale(1.45, 1.0, 0.55);
  disposableGeometries.push(gatePlinthGeo, gatePillarGeo, gateBeamGeo, gateRoofLowerGeo);
  for (const sideSign of [-1, 1]) {
    const px = gateCx + sideSign * (gateHalfW + 0.40);
    const plinth = new THREE.Mesh(gatePlinthGeo, nordicGraniteMat);
    plinth.position.set(px, nfFloorY + 0.21, gateZ);
    const pillar = new THREE.Mesh(gatePillarGeo, imperialCrimsonMat);
    pillar.position.set(px, nfFloorY + 0.42 + 2.9, gateZ);
    pillar.castShadow = !isSoftwareGl;
    const gateLamp = new THREE.Mesh(sternLampSphereGeo, warmLanternMat);
    gateLamp.scale.setScalar(1.35);
    gateLamp.position.set(px, nfFloorY + 3.85, gateZ + 0.72);
    nordicShrineGroup.add(plinth, pillar, gateLamp);
  }
  const gateBeam = new THREE.Mesh(gateBeamGeo, imperialCrimsonMat);
  gateBeam.position.set(gateCx, nfFloorY + 5.75, gateZ);
  const gatePlaqueGeo = new THREE.BoxGeometry(3.8, 0.85, 0.96);
  disposableGeometries.push(gatePlaqueGeo);
  const gatePlaque = new THREE.Mesh(gatePlaqueGeo, imperialGoldMat);
  gatePlaque.position.set(gateCx, nfFloorY + 5.75, gateZ);
  const gateRoof = new THREE.Mesh(gateRoofLowerGeo, slateRoofMat);
  gateRoof.position.set(gateCx, nfFloorY + 7.05, gateZ);
  nordicShrineGroup.add(gateBeam, gatePlaque, gateRoof);

  // Covered Pavilion Helper (builds raised timber beams, crimson columns, and pitched curved slate roofs — NEVER covers the Hot Spring!)
  const buildCoveredWingRoof = (minX: number, maxX: number, minZ: number, maxZ: number, eavesY: number, ridgeHeight: number, openSide: 'east' | 'south' | 'west') => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;

    const colGeo = new THREE.CylinderGeometry(0.24, 0.28, eavesY - nfFloorY, 10);
    const fasciaGeo = new THREE.BoxGeometry(w + 1.4, 0.38, d + 1.4);
    const roofTier1Geo = new THREE.BoxGeometry(w + 2.2, 0.35, d + 2.2);
    const roofTier2Geo = new THREE.BoxGeometry(w * 0.72, ridgeHeight, d * 0.72);
    const ridgeBeamGeo = new THREE.BoxGeometry(w > d ? w * 0.74 : 0.42, 0.42, d >= w ? d * 0.74 : 0.42);
    disposableGeometries.push(colGeo, fasciaGeo, roofTier1Geo, roofTier2Geo, ridgeBeamGeo);

    const fascia = new THREE.Mesh(fasciaGeo, imperialCrimsonMat);
    fascia.position.set(cx, eavesY, cz);
    const roof1 = new THREE.Mesh(roofTier1Geo, slateRoofMat);
    roof1.position.set(cx, eavesY + 0.34, cz);
    roof1.castShadow = !isSoftwareGl;
    const roof2 = new THREE.Mesh(roofTier2Geo, slateRoofMat);
    roof2.position.set(cx, eavesY + 0.5 + ridgeHeight * 0.5, cz);
    const ridge = new THREE.Mesh(ridgeBeamGeo, imperialGoldMat);
    ridge.position.set(cx, eavesY + 0.55 + ridgeHeight, cz);
    nordicShrineGroup.add(fascia, roof1, roof2, ridge);

    // Corner & span timber columns positioned along the wing perimeter
    const xs = w > 18 ? [minX + 0.6, minX + w * 0.28, minX + w * 0.5, minX + w * 0.72, maxX - 0.6] : [minX + 0.5, maxX - 0.5];
    const zs = d > 18 ? [minZ + 0.6, minZ + d * 0.33, minZ + d * 0.67, maxZ - 0.6] : [minZ + 0.5, maxZ - 0.5];
    for (const px of xs) {
      for (const pz of zs) {
        const isInteriorCol = px > minX + 1.0 && px < maxX - 1.0 && pz > minZ + 1.0 && pz < maxZ - 1.0;
        if (isInteriorCol) continue;
        // Keep open courtyard edge airy with slightly inset structural posts
        if (openSide === 'east' && Math.abs(px - maxX) < 1.0 && Math.abs(pz - cz) < 3.0) continue;
        if (openSide === 'west' && Math.abs(px - minX) < 1.0 && Math.abs(pz - cz) < 3.0) continue;
        const col = new THREE.Mesh(colGeo, imperialCrimsonMat);
        col.position.set(px, (nfFloorY + eavesY) * 0.5, pz);
        col.castShadow = !isSoftwareGl;
        nordicShrineGroup.add(col);
      }
    }
  };

  // Covered West Onsen Tea & Dining Pavilion (x: -343..-333, z: -302..-278)
  buildCoveredWingRoof(-343.0, -333.2, -302.0, -278.0, nfFloorY + 4.4, 1.55, 'east');
  // Covered North Bathhouse Cloister Gallery connecting West & East wings behind the Frost Altar (x: -343..-275, z: -316.5..-310.8)
  buildCoveredWingRoof(-343.0, -275.0, -316.5, -310.8, nfFloorY + 4.6, 1.45, 'south');
  // Covered East Martial Dojo Wing & Armory (x: -284.5..-275.0, z: -306.0..-274.0)
  buildCoveredWingRoof(-284.5, -275.0, -306.0, -274.0, nfFloorY + 4.5, 1.65, 'west');

  // Open curved granite rim around the roofless pool with a wide South stairwell opening
  const rimStartAng = Math.PI * 0.5 + 0.24;
  const rimArcLen = Math.PI * 2.0 - 0.48;
  const springRimGeo = new THREE.TorusGeometry(
    NORDIC_FROST_SHRINE_POS.poolRadius + 0.55,
    0.62,
    8,
    28,
    rimArcLen
  );
  springRimGeo.rotateX(Math.PI / 2);
  const shallowShelfGeo = new THREE.RingGeometry(7.6, NORDIC_FROST_SHRINE_POS.poolRadius + 0.15, 28);
  shallowShelfGeo.rotateX(-Math.PI / 2);
  const midShelfGeo = new THREE.RingGeometry(4.3, 7.6, 28);
  midShelfGeo.rotateX(-Math.PI / 2);
  const deepBasinGeo = new THREE.CircleGeometry(4.3, 24);
  deepBasinGeo.rotateX(-Math.PI / 2);
  const springWaterDiscGeo = new THREE.CircleGeometry(NORDIC_FROST_SHRINE_POS.poolRadius + 0.2, 32);
  springWaterDiscGeo.rotateX(-Math.PI / 2);
  const springStairStepGeo = new THREE.BoxGeometry(4.4, 0.26, 1.48);
  const steamPuffGeo = new THREE.IcosahedronGeometry(0.95, 1);

  const onsenTableTopGeo = new THREE.BoxGeometry(1.38, 0.11, 2.86);
  const onsenTableLegGeo = new THREE.BoxGeometry(0.14, 0.74, 0.14);
  const onsenBenchGeo = new THREE.BoxGeometry(0.56, 0.1, 2.45);
  const onsenBenchLegGeo = new THREE.BoxGeometry(0.12, 0.38, 0.12);
  const onsenTeapotGeo = new THREE.SphereGeometry(0.16, 10, 8);
  const onsenBowlGeo = new THREE.CylinderGeometry(0.13, 0.08, 0.1, 10);
  const onsenCupGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.09, 8);
  const onsenTowelBenchGeo = new THREE.BoxGeometry(1.42, 0.12, 0.68);
  const onsenTowelStackGeo = new THREE.BoxGeometry(0.46, 0.16, 0.38);
  const onsenBucketGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.24, 10);
  const onsenPostGeo = new THREE.BoxGeometry(0.18, 2.35, 0.18);
  const onsenArmGeo = new THREE.BoxGeometry(0.55, 0.12, 0.12);

  disposableGeometries.push(
    springRimGeo,
    shallowShelfGeo,
    midShelfGeo,
    deepBasinGeo,
    springWaterDiscGeo,
    springStairStepGeo,
    steamPuffGeo,
    onsenTableTopGeo,
    onsenTableLegGeo,
    onsenBenchGeo,
    onsenBenchLegGeo,
    onsenTeapotGeo,
    onsenBowlGeo,
    onsenCupGeo,
    onsenTowelBenchGeo,
    onsenTowelStackGeo,
    onsenBucketGeo,
    onsenPostGeo,
    onsenArmGeo
  );

  const springRimMesh = new THREE.Mesh(springRimGeo, nordicGraniteMat);
  springRimMesh.position.set(nfX, nfFloorY + 0.05, nfZ);
  springRimMesh.rotation.y = -rimStartAng;
  const shallowShelfMesh = new THREE.Mesh(shallowShelfGeo, wetRiverStoneMat);
  shallowShelfMesh.position.set(nfX, NORDIC_FROST_SHRINE_POS.shallowShelfY, nfZ);
  const midShelfMesh = new THREE.Mesh(midShelfGeo, wetRiverStoneMat);
  midShelfMesh.position.set(nfX, NORDIC_FROST_SHRINE_POS.midShelfY, nfZ);
  const deepBasinMesh = new THREE.Mesh(deepBasinGeo, wetRiverStoneMat);
  deepBasinMesh.position.set(nfX, NORDIC_FROST_SHRINE_POS.poolFloorY + 0.03, nfZ);
  const springWaterMesh = new THREE.Mesh(springWaterDiscGeo, geothermalWaterMat);
  springWaterMesh.position.set(nfX, NORDIC_FROST_SHRINE_POS.poolWaterY, nfZ);
  nordicShrineGroup.add(springRimMesh, shallowShelfMesh, midShelfMesh, deepBasinMesh, springWaterMesh);

  // Submerged & entry granite stone stairs on the South side descending cleanly from courtyard into water
  for (let s = 0; s < 5; s++) {
    const t = s / 4;
    const stepZ = nfZ + 11.1 - t * 5.6;
    const stepY = nfFloorY - t * (nfFloorY - NORDIC_FROST_SHRINE_POS.midShelfY);
    const stMesh = new THREE.Mesh(springStairStepGeo, wetRiverStoneMat);
    stMesh.position.set(nfX, stepY - 0.12, stepZ);
    nordicShrineGroup.add(stMesh);
  }

  // Rising Geothermal Steam Wisps hovering and drifting above the open-air hot spring water
  const steamWisps: Array<{
    mesh: THREE.Mesh;
    baseX: number;
    baseZ: number;
    phase: number;
    speed: number;
    baseScale: number;
  }> = [];
  for (let w = 0; w < 22; w++) {
    const ang = w * 2.39996;
    const rad = 1.4 + Math.sqrt((w + 0.5) / 22) * 7.8;
    const sx = nfX + Math.cos(ang) * rad;
    const sz = nfZ + Math.sin(ang) * rad;
    const wMesh = new THREE.Mesh(steamPuffGeo, steamWispMat);
    const bScale = 0.65 + (w % 4) * 0.24;
    wMesh.scale.set(bScale * 1.4, bScale * 0.62, bScale * 1.4);
    wMesh.position.set(sx, NORDIC_FROST_SHRINE_POS.poolWaterY + 0.25, sz);
    nordicShrineGroup.add(wMesh);
    steamWisps.push({
      mesh: wMesh,
      baseX: sx,
      baseZ: sz,
      phase: w * 0.43,
      speed: 0.42 + (w % 5) * 0.08,
      baseScale: bScale,
    });
  }

  // Onsen Wooden Dining Table, Benches, Tea Set & Bowls inside Covered West Dining Pavilion (-336.5, -290.0)
  const tblX = nfX - 16.5;
  const tblZ = nfZ;
  const tableTop = new THREE.Mesh(onsenTableTopGeo, onsenTimberMat);
  tableTop.position.set(tblX, nfFloorY + 0.78, tblZ);
  tableTop.castShadow = !isSoftwareGl;
  tableTop.receiveShadow = !isSoftwareGl;
  nordicShrineGroup.add(tableTop);
  for (const lx of [-0.52, 0.52]) {
    for (const lz of [-1.18, 1.18]) {
      const leg = new THREE.Mesh(onsenTableLegGeo, onsenTimberMat);
      leg.position.set(tblX + lx, nfFloorY + 0.37, tblZ + lz);
      nordicShrineGroup.add(leg);
    }
  }
  for (const bSide of [-1.42, 1.42]) {
    const bx = tblX + bSide;
    const bench = new THREE.Mesh(onsenBenchGeo, onsenTimberMat);
    bench.position.set(bx, nfFloorY + 0.42, tblZ);
    bench.castShadow = !isSoftwareGl;
    nordicShrineGroup.add(bench);
    for (const lz of [-0.95, 0.95]) {
      const bLeg = new THREE.Mesh(onsenBenchLegGeo, onsenTimberMat);
      bLeg.position.set(bx, nfFloorY + 0.19, tblZ + lz);
      nordicShrineGroup.add(bLeg);
    }
  }
  const teapot = new THREE.Mesh(onsenTeapotGeo, onsenTimberMat);
  teapot.position.set(tblX, nfFloorY + 0.96, tblZ);
  nordicShrineGroup.add(teapot);
  for (const bz of [-0.82, 0.82]) {
    for (const bxOff of [-0.34, 0.34]) {
      const bowl = new THREE.Mesh(onsenBowlGeo, ceramicCupMat);
      bowl.position.set(tblX + bxOff, nfFloorY + 0.88, tblZ + bz);
      const cup = new THREE.Mesh(onsenCupGeo, ceramicCupMat);
      cup.position.set(tblX + bxOff * 0.6, nfFloorY + 0.88, tblZ + bz * 0.45);
      nordicShrineGroup.add(bowl, cup);
    }
  }

  // Bathside Folded Towel Bench, Cedar Wash Buckets & Warm Lantern Posts
  const towelX = nfX - 12.45;
  const towelZ = nfZ + 7.5;
  const towelBench = new THREE.Mesh(onsenTowelBenchGeo, onsenTimberMat);
  towelBench.position.set(towelX, nfFloorY + 0.44, towelZ);
  nordicShrineGroup.add(towelBench);
  for (const lx of [-0.52, 0.52]) {
    for (const lz of [-0.22, 0.22]) {
      const bLeg = new THREE.Mesh(onsenBenchLegGeo, onsenTimberMat);
      bLeg.position.set(towelX + lx, nfFloorY + 0.19, towelZ + lz);
      nordicShrineGroup.add(bLeg);
    }
  }
  const towelStack = new THREE.Mesh(onsenTowelStackGeo, foldedTowelMat);
  towelStack.position.set(towelX - 0.3, nfFloorY + 0.58, towelZ);
  const bucket = new THREE.Mesh(onsenBucketGeo, onsenTimberMat);
  bucket.position.set(towelX + 0.35, nfFloorY + 0.62, towelZ);
  nordicShrineGroup.add(towelStack, bucket);

  for (const [lx, lz, armSign] of [
    [tblX, tblZ - 2.25, 1],
    [tblX, tblZ + 2.25, 1],
    [nfX - 3.0, nfZ + 11.4, 1],
    [nfX + 3.0, nfZ + 11.4, -1],
    [-285.5, -298.0, -1],
    [-285.5, -282.0, -1],
  ] as const) {
    const post = new THREE.Mesh(onsenPostGeo, onsenTimberMat);
    post.position.set(lx, nfFloorY + 1.175, lz);
    const arm = new THREE.Mesh(onsenArmGeo, onsenTimberMat);
    arm.position.set(lx + armSign * 0.22, nfFloorY + 2.25, lz);
    const lantern = new THREE.Mesh(sternLampSphereGeo, warmLanternMat);
    lantern.scale.setScalar(1.25);
    lantern.position.set(lx + armSign * 0.42, nfFloorY + 2.02, lz);
    nordicShrineGroup.add(post, arm, lantern);
  }

  // East Martial Training Wing: 2 Bamboo Staff Weapon Racks + 2 Interactive Wooden Training Dummies + Trainer Monks
  const rackPostGeo = new THREE.BoxGeometry(0.14, 1.9, 0.14);
  const rackRailGeo = new THREE.BoxGeometry(0.1, 0.1, 2.8);
  const rackStaffGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.05, 6);
  const dummyBaseGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.16, 10);
  const dummyTrunkGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.68, 10);
  const dummyArmGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.62, 6);
  disposableGeometries.push(rackPostGeo, rackRailGeo, rackStaffGeo, dummyBaseGeo, dummyTrunkGeo, dummyArmGeo);

  for (const rz of [-298.0, -282.0]) {
    for (const zOff of [-1.25, 1.25]) {
      const rp = new THREE.Mesh(rackPostGeo, onsenTimberMat);
      rp.position.set(-276.5, nfFloorY + 0.95, rz + zOff);
      nordicShrineGroup.add(rp);
    }
    for (const ry of [0.55, 1.45]) {
      const rr = new THREE.Mesh(rackRailGeo, onsenTimberMat);
      rr.position.set(-276.5, nfFloorY + ry, rz);
      nordicShrineGroup.add(rr);
    }
    for (const sOff of [-0.9, -0.3, 0.3, 0.9]) {
      const st = new THREE.Mesh(rackStaffGeo, imperialGoldMat);
      st.position.set(-276.62, nfFloorY + 1.04, rz + sOff);
      st.rotation.z = 0.08;
      nordicShrineGroup.add(st);
    }
  }

  const compoundDummyIndices: number[] = [];
  for (const dz of [-295.0, -285.0]) {
    const dx = -280.5;
    const dGroup = new THREE.Group();
    dGroup.position.set(dx, nfFloorY, dz);
    const dBase = new THREE.Mesh(dummyBaseGeo, onsenTimberMat);
    dBase.position.y = 0.08;
    const dTrunk = new THREE.Mesh(dummyTrunkGeo, onsenTimberMat);
    dTrunk.position.y = 0.92;
    dTrunk.castShadow = !isSoftwareGl;
    dGroup.add(dBase, dTrunk);
    for (const armY of [1.28, 1.05]) {
      const arm = new THREE.Mesh(dummyArmGeo, imperialDoorWoodMat);
      arm.position.set(-0.28, armY, (armY > 1.15 ? 0.14 : -0.14));
      arm.rotation.z = Math.PI / 2;
      dGroup.add(arm);
    }
    nordicShrineGroup.add(dGroup);
    compoundDummyIndices.push(
      registerWoodenDummy({
        group: dGroup,
        x: dx,
        y: nfFloorY,
        z: dz,
        baseYaw: -Math.PI / 2,
        hitImpulse: 0,
        hitPhase: 0,
      })
    );
  }

  const FZ = FORTRESS_Z_OFFSET;
  const fortSummitY = CHINESE_FORTRESS_POS.summitHeight;
  const pavFloor1Y = CHINESE_FORTRESS_POS.pavilionFloor1Y;
  const pavFloor2Y = CHINESE_FORTRESS_POS.pavilionFloor2Y;
  const compoundTrainerBedY = pavFloor2Y + 0.38;
  spawnTempleMonk({
    id: 'hotspring_trainer_0',
    role: 'dummy_trainer',
    parent: scene,
    homeX: -282.1,
    homeY: nfFloorY,
    homeZ: -295.0,
    baseYaw: Math.PI / 2,
    phaseOffset: 0.7,
    dummyIndex: compoundDummyIndices[0],
    staysAwakeAtNight: true,
    weaponVisible: true,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
  });
  spawnTempleMonk({
    id: 'hotspring_trainer_1',
    role: 'dummy_trainer',
    parent: scene,
    homeX: -282.1,
    homeY: nfFloorY,
    homeZ: -285.0,
    baseYaw: Math.PI / 2,
    phaseOffset: 2.3,
    dummyIndex: compoundDummyIndices[1],
    bedX: 22.38,
    bedY: compoundTrainerBedY,
    bedZ: -160.75 + FZ,
    bedYaw: Math.PI / 2,
    sleepRoute: [
      [-282.1, nfFloorY, -285.0],
      [gateCx, nfFloorY, gateZ - 2.0],
      [gateCx, stairBotY, stairBotZ],
      [-285.0, groundHeightAt(-285.0, -255.0), -255.0],
      [-240.0, groundHeightAt(-240.0, -225.0), -225.0],
      [-195.0, groundHeightAt(-195.0, -195.0), -195.0],
      [-135.0, groundHeightAt(-135.0, -205.0), -205.0],
      [-80.0, groundHeightAt(-80.0, -220.0), -220.0],
      [-35.0, groundHeightAt(-35.0, -235.0), -235.0],
      [0.0, CHINESE_FORTRESS_POS.stairBaseHeight, CHINESE_FORTRESS_POS.stairFootZ + 2.0],
      [0.0, CHINESE_FORTRESS_POS.midLandingHeight, CHINESE_FORTRESS_POS.stairMidZ - 1.2],
      [0.0, fortSummitY, -135.0 + FZ],
      [30.0, fortSummitY, -153.5 + FZ],
      [30.0, pavFloor1Y, -158.0 + FZ],
      [36.9, pavFloor1Y, -159.0 + FZ],
      [36.9, pavFloor2Y, -168.4 + FZ],
      [34.2, pavFloor2Y, -168.4 + FZ],
      [24.5, pavFloor2Y, -167.8 + FZ],
      [24.5, pavFloor2Y, -160.75 + FZ],
      [22.38, compoundTrainerBedY, -160.75 + FZ],
    ],
    weaponVisible: true,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
  });

  // Rich East-Asian Onsen Courtyard Furnishings, North Waterfall Cliff, Poolside Stone-Lantern Fence, Targets & Banners:
  const jadeBambooMat = new THREE.MeshStandardMaterial({
    color: 0x3b8c47,
    roughness: 0.56,
    metalness: 0.05,
  });
  const warmEmberMat = new THREE.MeshStandardMaterial({
    color: 0xff7b24,
    emissive: 0xff5500,
    emissiveIntensity: 1.45,
    roughness: 0.4,
  });
  const targetFaceMat = new THREE.MeshStandardMaterial({
    color: 0xf5ebd6,
    roughness: 0.72,
  });
  const targetNavyMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    roughness: 0.58,
  });
  const waterfallFoamMat = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    emissive: 0x67e8f9,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    transparent: true,
    opacity: 0.82,
  });
  disposableMaterials.push(jadeBambooMat, warmEmberMat, targetFaceMat, targetNavyMat, waterfallFoamMat);

  // A) North Onsen Tea Veranda (-305.5, -307.6) tucked gracefully under North Cloister Gallery east of Waterfall Cliff
  const northTblX = nfX + 14.5;
  const northTblZ = nfZ - 17.6;
  const northTableTopGeo = new THREE.BoxGeometry(2.6, 0.11, 1.18);
  const northBenchGeo = new THREE.BoxGeometry(2.3, 0.1, 0.52);
  const sakeFlaskGeo = new THREE.CylinderGeometry(0.055, 0.09, 0.24, 10);
  disposableGeometries.push(northTableTopGeo, northBenchGeo, sakeFlaskGeo);

  const northTableTop = new THREE.Mesh(northTableTopGeo, onsenTimberMat);
  northTableTop.position.set(northTblX, nfFloorY + 0.66, northTblZ);
  northTableTop.castShadow = !isSoftwareGl;
  northTableTop.receiveShadow = !isSoftwareGl;
  nordicShrineGroup.add(northTableTop);
  for (const lx of [-1.05, 1.05]) {
    for (const lz of [-0.44, 0.44]) {
      const leg = new THREE.Mesh(onsenTableLegGeo, onsenTimberMat);
      leg.scale.y = 0.85;
      leg.position.set(northTblX + lx, nfFloorY + 0.31, northTblZ + lz);
      nordicShrineGroup.add(leg);
    }
  }
  for (const bOffZ of [-1.15, 1.15]) {
    const nBench = new THREE.Mesh(northBenchGeo, onsenTimberMat);
    nBench.position.set(northTblX, nfFloorY + 0.41, northTblZ + bOffZ);
    nBench.castShadow = !isSoftwareGl;
    nordicShrineGroup.add(nBench);
    for (const lx of [-0.88, 0.88]) {
      const bLeg = new THREE.Mesh(onsenBenchLegGeo, onsenTimberMat);
      bLeg.position.set(northTblX + lx, nfFloorY + 0.19, northTblZ + bOffZ);
      nordicShrineGroup.add(bLeg);
    }
  }
  const nTeapot = new THREE.Mesh(onsenTeapotGeo, onsenTimberMat);
  nTeapot.position.set(northTblX - 0.15, nfFloorY + 0.84, northTblZ);
  const nFlask1 = new THREE.Mesh(sakeFlaskGeo, ceramicCupMat);
  nFlask1.position.set(northTblX + 0.52, nfFloorY + 0.82, northTblZ + 0.18);
  const nFlask2 = new THREE.Mesh(sakeFlaskGeo, ceramicCupMat);
  nFlask2.position.set(northTblX - 0.62, nfFloorY + 0.82, northTblZ - 0.15);
  nordicShrineGroup.add(nTeapot, nFlask1, nFlask2);
  for (const cxOff of [-0.42, 0.28]) {
    for (const czOff of [-0.28, 0.28]) {
      const cup = new THREE.Mesh(onsenCupGeo, ceramicCupMat);
      cup.position.set(northTblX + cxOff, nfFloorY + 0.76, northTblZ + czOff);
      nordicShrineGroup.add(cup);
    }
  }

  // B) North Basalt Cliffside Rockery & Twin Cascading Geothermal Waterfalls feeding the Hot Spring Pool
  const waterfallCliffMat = new THREE.MeshStandardMaterial({
    color: 0x566170,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.08,
    roughness: 0.92,
    metalness: 0.04,
    flatShading: true,
  });
  disposableMaterials.push(waterfallCliffMat);
  const cliffBoulderGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const cliffLedgeGeo = new THREE.BoxGeometry(5.2, 1.0, 2.2);
  const waterfallStreamGeo = new THREE.BoxGeometry(1.38, 1.0, 0.24);
  const waterfallPoolSplashGeo = new THREE.TorusGeometry(0.95, 0.22, 7, 16);
  waterfallPoolSplashGeo.rotateX(Math.PI / 2);
  const spoutBambooGeo = new THREE.CylinderGeometry(0.09, 0.1, 1.55, 8);
  disposableGeometries.push(
    cliffBoulderGeo,
    cliffLedgeGeo,
    waterfallStreamGeo,
    waterfallPoolSplashGeo,
    spoutBambooGeo
  );

  // Rugged stepped dark-stone cliff tiers rising cleanly along the North pool mouth (x: -325..-315, z: -306.5..-301.8)
  for (const [bx, byOff, bz, sx, sy, sz, ry] of [
    [nfX, 3.1, nfZ - 14.8, 3.6, 3.5, 2.2, 0.2],
    [nfX - 2.9, 2.2, nfZ - 14.3, 2.4, 2.5, 2.0, -0.4],
    [nfX + 2.9, 2.3, nfZ - 14.2, 2.4, 2.6, 2.0, 0.5],
    [nfX - 4.3, 1.05, nfZ - 12.8, 1.65, 1.35, 1.5, 0.8],
    [nfX + 4.3, 1.05, nfZ - 12.8, 1.65, 1.35, 1.5, -0.6],
    [nfX - 1.9, 1.45, nfZ - 12.7, 1.35, 1.55, 1.35, 0.3],
    [nfX + 1.9, 1.45, nfZ - 12.7, 1.35, 1.55, 1.35, -0.3],
    [nfX, 1.5, nfZ - 13.2, 1.25, 1.6, 1.25, 0.1],
  ] as const) {
    const crag = new THREE.Mesh(cliffBoulderGeo, waterfallCliffMat);
    crag.scale.set(sx, sy, sz);
    crag.rotation.y = ry;
    crag.position.set(bx, nfFloorY + byOff, bz);
    crag.castShadow = !isSoftwareGl;
    crag.receiveShadow = !isSoftwareGl;
    nordicShrineGroup.add(crag);
  }
  const upperWaterfallBasin = new THREE.Mesh(cliffLedgeGeo, waterfallCliffMat);
  upperWaterfallBasin.position.set(nfX, nfFloorY + 3.4, nfZ - 13.7);
  nordicShrineGroup.add(upperWaterfallBasin);

  // Shishi-Odoshi Bamboo Fountain integrated neatly into the center cascade ledge
  const spoutPipe = new THREE.Mesh(spoutBambooGeo, jadeBambooMat);
  spoutPipe.position.set(nfX, nfFloorY + 1.45, nfZ - 12.05);
  spoutPipe.rotation.x = Math.PI * 0.42;
  nordicShrineGroup.add(spoutPipe);

  const waterfallRibbons: THREE.Mesh[] = [];
  for (const wfXOff of [-1.25, 1.25]) {
    const upperFall = new THREE.Mesh(waterfallStreamGeo, geothermalWaterMat);
    upperFall.scale.set(0.95, 2.25, 1.0);
    upperFall.position.set(nfX + wfXOff, nfFloorY + 4.2, nfZ - 12.6);
    upperFall.rotation.x = 0.24;

    const lowerFall = new THREE.Mesh(waterfallStreamGeo, geothermalWaterMat);
    lowerFall.scale.set(1.12, 3.65, 1.1);
    lowerFall.position.set(nfX + wfXOff, nfFloorY + 1.55, nfZ - 11.4);
    lowerFall.rotation.x = 0.22;

    const splashFoam = new THREE.Mesh(waterfallPoolSplashGeo, waterfallFoamMat);
    splashFoam.position.set(nfX + wfXOff, NORDIC_FROST_SHRINE_POS.poolWaterY + 0.08, nfZ - 10.65);
    nordicShrineGroup.add(upperFall, lowerFall, splashFoam);
    waterfallRibbons.push(upperFall, lowerFall, splashFoam);
  }

  // C) Curved Poolside Timber Fence & 12 Carved Granite Lantern Pillars framing the Pool Perimeter (South stairs left open)
  const pedBaseGeo = new THREE.BoxGeometry(0.62, 0.28, 0.62);
  const pedShaftGeo = new THREE.BoxGeometry(0.42, 0.82, 0.42);
  const pedLanternGeo = new THREE.BoxGeometry(0.38, 0.36, 0.38);
  const pedCapGeo = new THREE.ConeGeometry(0.46, 0.3, 4);
  pedCapGeo.rotateY(Math.PI / 4);
  const fenceRailUnitGeo = new THREE.BoxGeometry(0.1, 0.09, 1.0);
  const fencePicketGeo = new THREE.BoxGeometry(0.08, 0.78, 0.08);
  disposableGeometries.push(
    pedBaseGeo,
    pedShaftGeo,
    pedLanternGeo,
    pedCapGeo,
    fenceRailUnitGeo,
    fencePicketGeo
  );

  const addStoneLanternPedestal = (lx: number, lz: number, yaw = 0) => {
    const pGrp = new THREE.Group();
    pGrp.position.set(lx, nfFloorY, lz);
    pGrp.rotation.y = yaw;
    const base = new THREE.Mesh(pedBaseGeo, nordicGraniteMat);
    base.position.y = 0.14;
    const shaft = new THREE.Mesh(pedShaftGeo, nordicGraniteMat);
    shaft.position.y = 0.69;
    const glow = new THREE.Mesh(pedLanternGeo, warmLanternMat);
    glow.position.y = 1.28;
    const cap = new THREE.Mesh(pedCapGeo, slateRoofMat);
    cap.position.y = 1.61;
    pGrp.add(base, shaft, glow, cap);
    nordicShrineGroup.add(pGrp);
  };

  const addFenceSpan = (ax: number, az: number, bx: number, bz: number) => {
    const spanLen = Math.hypot(bx - ax, bz - az);
    const yaw = Math.atan2(bx - ax, bz - az);
    const midX = (ax + bx) * 0.5;
    const midZ = (az + bz) * 0.5;
    for (const railY of [0.46, 0.86]) {
      const rail = new THREE.Mesh(fenceRailUnitGeo, onsenTimberMat);
      rail.scale.z = spanLen;
      rail.position.set(midX, nfFloorY + railY, midZ);
      rail.rotation.y = yaw;
      rail.castShadow = !isSoftwareGl;
      nordicShrineGroup.add(rail);
    }
    for (const frac of [0.33, 0.67]) {
      const pk = new THREE.Mesh(fencePicketGeo, onsenTimberMat);
      pk.position.set(ax + (bx - ax) * frac, nfFloorY + 0.48, az + (bz - az) * frac);
      pk.rotation.y = yaw;
      nordicShrineGroup.add(pk);
    }
  };

  const fenceR = NORDIC_FROST_SHRINE_POS.poolRadius + 0.72; // 12.12m cleanly around circular rim
  const addFenceArc = (angStart: number, angEnd: number, segs: number) => {
    const pts: Array<{ x: number; z: number; yaw: number }> = [];
    for (let i = 0; i <= segs; i++) {
      const ang = angStart + (i / segs) * (angEnd - angStart);
      pts.push({
        x: nfX + Math.cos(ang) * fenceR,
        z: nfZ + Math.sin(ang) * fenceR,
        yaw: -ang,
      });
    }
    for (let i = 0; i < pts.length; i++) {
      addStoneLanternPedestal(pts[i].x, pts[i].z, pts[i].yaw);
      if (i + 1 < pts.length) {
        addFenceSpan(pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
      }
    }
  };
  // West perimeter arc (South-West of stair entry up to West side of North Waterfall)
  addFenceArc(Math.PI * 0.5 + 0.42, Math.PI * 1.5 - 0.36, 4);
  // East perimeter arc (East side of North Waterfall around East rim to South-East of stair entry)
  addFenceArc(Math.PI * 1.5 + 0.36, Math.PI * 2.5 - 0.42, 4);

  // South Courtyard Approach Lantern Pillars flanking the Gatehouse Stair Entrance
  addStoneLanternPedestal(gateCx - gateHalfW - 0.8, gateZ - 0.2, 0);
  addStoneLanternPedestal(gateCx + gateHalfW + 0.8, gateZ - 0.2, 0);

  // D) East Martial Wing 3D Archery Targets (Archery target.glb), Supply Crates/Barrels & Crimson Gold-Emblem Colonnade Banners
  const hsCrateGeo = new THREE.BoxGeometry(0.95, 0.88, 0.95);
  const hsBarrelGeo = new THREE.CylinderGeometry(0.36, 0.34, 0.94, 12);
  const hsBannerClothGeo = new THREE.BoxGeometry(0.64, 2.25, 0.07);
  const hsBannerEmblemGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.09, 14);
  hsBannerEmblemGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(
    hsCrateGeo,
    hsBarrelGeo,
    hsBannerClothGeo,
    hsBannerEmblemGeo
  );

  const hsArcheryTargetMounts: THREE.Group[] = [];
  for (const tgt of HOT_SPRING_ARCHERY_TARGETS) {
    const mountGroup = new THREE.Group();
    mountGroup.name = tgt.id;
    mountGroup.position.set(tgt.x, nfFloorY, tgt.z);
    mountGroup.rotation.y = tgt.yaw;
    nordicShrineGroup.add(mountGroup);
    hsArcheryTargetMounts.push(mountGroup);
  }

  const populateHotSpringArcheryTargets = (asset: IArcheryTargetModelAsset) => {
    for (const mount of hsArcheryTargetMounts) {
      if (mount.children.length > 0) continue;
      mount.add(
        createArcheryTargetModelInstance(asset, {
          scale: ARCHERY_TARGET_DIMENSIONS.scale,
          castShadow: !isSoftwareGl,
          receiveShadow: !isSoftwareGl,
        })
      );
    }
  };

  if (isArcheryTargetModelLoaded()) {
    populateHotSpringArcheryTargets(getLoadedArcheryTargetModel());
  } else {
    void loadArcheryTargetModel()
      .then((asset) => {
        if (!nordicShrineGroup.parent) return;
        populateHotSpringArcheryTargets(asset);
      })
      .catch(() => {
        // Optional model fallback handled gracefully if unavailable
      });
  }

  // East Wing Armory Supply Crates & Barrels tucked along East wall
  for (const [cx, cz] of [
    [-276.8, -305.0],
    [-276.8, -275.0],
  ] as const) {
    const cr = new THREE.Mesh(hsCrateGeo, onsenTimberMat);
    cr.position.set(cx, nfFloorY + 0.44, cz);
    const br = new THREE.Mesh(hsBarrelGeo, onsenTimberMat);
    br.position.set(cx - 0.95, nfFloorY + 0.47, cz + (cz < -290 ? 0.2 : -0.2));
    nordicShrineGroup.add(cr, br);
  }

  // Crimson & Gold-Medallion Colonnade Banners hanging under West, North & East Pavilions
  for (const [bx, bz, yaw] of [
    [-333.5, -296.0, Math.PI / 2],
    [-333.5, -284.0, Math.PI / 2],
    [-331.0, -311.0, 0],
    [-310.0, -311.0, 0],
    [-296.0, -311.0, 0],
    [-282.0, -311.0, 0],
    [-284.2, -300.0, Math.PI / 2],
    [-284.2, -288.0, Math.PI / 2],
    [-284.2, -278.0, Math.PI / 2],
  ] as const) {
    const bMesh = new THREE.Mesh(hsBannerClothGeo, imperialCrimsonMat);
    bMesh.position.set(bx, nfFloorY + 3.05, bz);
    bMesh.rotation.y = yaw;
    const bSeal = new THREE.Mesh(hsBannerEmblemGeo, imperialGoldMat);
    bSeal.position.set(bx, nfFloorY + 3.25, bz);
    bSeal.rotation.y = yaw;
    nordicShrineGroup.add(bMesh, bSeal);
  }

  // E) Twin Guardian Stone Braziers with Warm Embers & Crimson Gatehouse Banners inside South Entrance
  const brazierBaseGeo = new THREE.CylinderGeometry(0.55, 0.72, 1.05, 8);
  const brazierBowlGeo = new THREE.CylinderGeometry(0.75, 0.45, 0.42, 8);
  const brazierEmberGeo = new THREE.IcosahedronGeometry(0.46, 1);
  const bannerClothGeo = new THREE.BoxGeometry(0.62, 2.35, 0.08);
  disposableGeometries.push(brazierBaseGeo, brazierBowlGeo, brazierEmberGeo, bannerClothGeo);
  for (const sideSign of [-1, 1]) {
    const brX = gateCx + sideSign * 5.4;
    const brZ = gateZ - 3.0;
    const brBase = new THREE.Mesh(brazierBaseGeo, nordicGraniteMat);
    brBase.position.set(brX, nfFloorY + 0.525, brZ);
    const brBowl = new THREE.Mesh(brazierBowlGeo, wetRiverStoneMat);
    brBowl.position.set(brX, nfFloorY + 1.24, brZ);
    const brEmber = new THREE.Mesh(brazierEmberGeo, warmEmberMat);
    brEmber.scale.set(1.0, 0.65, 1.0);
    brEmber.position.set(brX, nfFloorY + 1.44, brZ);
    const banner = new THREE.Mesh(bannerClothGeo, imperialCrimsonMat);
    banner.position.set(gateCx + sideSign * (gateHalfW + 0.40), nfFloorY + 3.4, gateZ - 0.55);
    nordicShrineGroup.add(brBase, brBowl, brEmber, banner);
  }

  // F) East Martial Dojo Ceremonial Crimson Gong Stand, Bagua Spectator Benches & SE Poolside Footbath Bench
  const gongPostGeo = new THREE.BoxGeometry(0.18, 2.55, 0.18);
  const gongBarGeo = new THREE.BoxGeometry(0.24, 0.22, 2.25);
  const gongDiscGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.12, 24);
  gongDiscGeo.rotateZ(Math.PI / 2);
  disposableGeometries.push(gongPostGeo, gongBarGeo, gongDiscGeo);
  const gongX = -285.2;
  const gongZ = -302.8;
  for (const zOff of [-0.92, 0.92]) {
    const gPost = new THREE.Mesh(gongPostGeo, imperialCrimsonMat);
    gPost.position.set(gongX, nfFloorY + 1.275, gongZ + zOff);
    nordicShrineGroup.add(gPost);
  }
  const gTop = new THREE.Mesh(gongBarGeo, imperialCrimsonMat);
  gTop.position.set(gongX, nfFloorY + 2.48, gongZ);
  const gDisc = new THREE.Mesh(gongDiscGeo, imperialGoldMat);
  gDisc.position.set(gongX, nfFloorY + 1.48, gongZ);
  nordicShrineGroup.add(gTop, gDisc);

  // Two Bagua Arena Spectator Benches & SE Towel/Footbath Bench
  for (const [sbx, sbz, sbyaw] of [
    [-302.6, -282.5, Math.PI * 0.28],
    [-287.2, -279.6, -Math.PI * 0.25],
    [-314.8, -277.6, Math.PI * 0.5],
  ] as const) {
    const bGrp = new THREE.Group();
    bGrp.position.set(sbx, nfFloorY, sbz);
    bGrp.rotation.y = sbyaw;
    const seat = new THREE.Mesh(onsenTowelBenchGeo, onsenTimberMat);
    seat.position.y = 0.42;
    bGrp.add(seat);
    for (const lx of [-0.52, 0.52]) {
      for (const lz of [-0.22, 0.22]) {
        const leg = new THREE.Mesh(onsenBenchLegGeo, onsenTimberMat);
        leg.position.set(lx, 0.19, lz);
        bGrp.add(leg);
      }
    }
    if (sbx < -310) {
      const sTowel = new THREE.Mesh(onsenTowelStackGeo, foldedTowelMat);
      sTowel.position.set(-0.28, 0.56, 0);
      const sBucket = new THREE.Mesh(onsenBucketGeo, onsenTimberMat);
      sBucket.position.set(0.32, 0.58, 0);
      bGrp.add(sTowel, sBucket);
    }
    nordicShrineGroup.add(bGrp);
  }

  // G) Hanging Eave Lanterns along West Pavilion, North Cloister, and East Dojo Veranda
  for (const [hx, hy, hz] of [
    [-333.8, nfFloorY + 3.65, -298.0],
    [-333.8, nfFloorY + 3.65, -290.0],
    [-333.8, nfFloorY + 3.65, -282.0],
    [-330.0, nfFloorY + 3.8, -311.2],
    [-320.0, nfFloorY + 3.8, -311.2],
    [-310.0, nfFloorY + 3.8, -311.2],
    [-292.0, nfFloorY + 3.8, -311.2],
    [-284.0, nfFloorY + 3.7, -301.0],
    [-284.0, nfFloorY + 3.7, -290.0],
    [-284.0, nfFloorY + 3.7, -279.0],
  ] as const) {
    const hLamp = new THREE.Mesh(sternLampSphereGeo, warmLanternMat);
    hLamp.scale.set(1.15, 1.45, 1.15);
    hLamp.position.set(hx, hy, hz);
    nordicShrineGroup.add(hLamp);
  }

  scene.add(nordicShrineGroup);
  distanceCulledObjects.push({
    obj: nordicShrineGroup,
    cx: -310.0,
    cz: nfZ,
    radius: 56.0,
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
  const updateAtlantisAndShip = (
    elapsedTime: number,
    playerX: number,
    playerZ: number,
    alpha = 1
  ) => {
    // 1) Sync all 4 Sailable Ship 3D groups with live sailableShipSystem states (alpha-interpolated for zero frame stutter)
    const idleWaveBob = Math.sin(elapsedTime * 1.85) * 0.07;
    const idleWaveRoll = Math.cos(elapsedTime * 1.45) * 0.015;
    for (let i = 0; i < shipVisualHandles.length; i++) {
      const h = shipVisualHandles[i];
      const liveShip = h.state;
      if (!liveShip.spawned) {
        h.root.visible = false;
        continue;
      }
      const pose = getInterpolatedSailableShipPose(liveShip, alpha);
      h.root.position.set(pose.x, pose.deckY + idleWaveBob, pose.z);
      h.root.rotation.set(pose.pitchAngle, pose.yaw, pose.rollAngle + idleWaveRoll);
      h.root.visible = isWithinViewDistance(
        pose.x,
        pose.z,
        playerX,
        playerZ,
        28.0,
        VIEW_DISTANCE
      );
      if (h.root.visible) {
        h.wheelPivot.rotation.z = pose.wheelAngle;
        h.compassCrystal.rotation.y = elapsedTime * 1.8;
        const worldAngleToAtlantis = Math.atan2(
          -(RUINED_ATLANTIS_POS.x - pose.x),
          -(RUINED_ATLANTIS_POS.z - pose.z)
        );
        h.wayfinderNeedleGroup.rotation.y = worldAngleToAtlantis - pose.yaw;

        const spdRatio = Math.min(1.0, Math.abs(liveShip.speed) / 14.0);
        h.bowWakeGroup.visible = spdRatio > 0.04;
        if (h.bowWakeGroup.visible) {
          h.bowWakeGroup.scale.set(0.65 + spdRatio * 0.75, 1.0, 0.55 + spdRatio * 0.85);
          wakeFoamMat.opacity = 0.24 + spdRatio * 0.5;
        }
      }
    }

    // 2) Animate Ruined Atlantis Boss Seal Astrolabe Rings, Waterline Foam & Crystal Core when visible
    if (atlantisGroup.visible) {
      atlantisShoreFoamMat.opacity = 0.34 + 0.14 * (0.5 + 0.5 * Math.sin(elapsedTime * 1.9));
      const foamPulse = 1.0 + Math.sin(elapsedTime * 1.6) * 0.012;
      arenaWaterFoam.scale.set(foamPulse, 1.0, foamPulse);
      bossSealAstrolabeGroup.position.y =
        arenaY + 13.8 + Math.sin(elapsedTime * 1.5) * 0.48;
      sealCrystal.rotation.y = elapsedTime * 0.95;
      astroRing1.rotation.y = elapsedTime * 0.65;
      astroRing1.rotation.x = Math.sin(elapsedTime * 0.5) * 0.45;
      astroRing2.rotation.z = -elapsedTime * 0.85;
      astroRing2.rotation.y = Math.cos(elapsedTime * 0.6) * 0.52;
    }

    // 3) Animate Nordic Hot Spring Rising Geothermal Steam & Desert Sun Pyramid Disc when visible
    if (nordicShrineGroup.visible) {
      for (let w = 0; w < steamWisps.length; w++) {
        const sw = steamWisps[w];
        const cycle = (elapsedTime * sw.speed + sw.phase) % 1.0;
        const arc = Math.sin(cycle * Math.PI);
        sw.mesh.position.set(
          sw.baseX + Math.sin(elapsedTime * 0.7 + sw.phase * 4.0) * 0.65,
          NORDIC_FROST_SHRINE_POS.poolWaterY + 0.15 + cycle * 3.1,
          sw.baseZ + Math.cos(elapsedTime * 0.6 + sw.phase * 3.0) * 0.65
        );
        const sFactor = sw.baseScale * (0.7 + cycle * 0.9);
        sw.mesh.scale.set(sFactor * 1.45, sFactor * (0.55 + arc * 0.35), sFactor * 1.45);
      }
      for (let f = 0; f < waterfallRibbons.length; f++) {
        const mesh = waterfallRibbons[f];
        if (f % 3 === 2) {
          const pulse = 0.92 + Math.sin(elapsedTime * 4.8 + f) * 0.12;
          mesh.scale.set(pulse, 1.0, pulse);
        }
      }
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
