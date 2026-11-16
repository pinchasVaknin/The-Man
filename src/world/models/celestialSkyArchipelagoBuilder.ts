// ============================================================================
// MODULE: World / Models / Celestial Sky Archipelago & Astral Cloud-Climb Builder
// DESIGN: Completely rebuilt, non-circular multi-realm Sky Archipelago:
//         - Ground Base: Lapis-Obsidian & Brushed-Gold Astral Stargate Dock
//         - Ascent: 65m Golden-Cyan Aether-Vortex Beam & Helical Cloud-Crystal Steps
//         - Realm 1 (Main): Star-Octagonal Celestial Metropolis, 26m Spire Cathedral,
//           Sun-Willow Crystal Trees, Airship-Silk Bazaar & Meteorite Star-Forge
//         - Under-Island (y=54m): Suspended Aether-Reactor Vault on Golden Chains
//         - Realm 2 (North): Hexagonal Sapphire-Silver Starlight Bastion & Moon-Trees
//         - Realm 3 (East): 12-Toothed Clockwork Sun-Disc & Chrono-Observatory
//         - Realm 4 (SE): Timber & Brass Sky-Harbor Drydock & 29m Royal Sky-Galleon
//         - Realm 5 (NE): Fractured Obsidian Storm Crater & 16m Winged Thunder-Titan
//         - Realm 6 (SW): Multi-Peak Crimson-Gold Phoenix Spire & Cascading Sky-Falls
//         - Realm 7 (Zenith): 8-Pointed Pure Gold Star-Crown & 16m Planetary Orrery
//         - 40 Walkable & Sinking Sky Clouds + 12 Golden Cloud-Runner Rings
// ============================================================================

import * as THREE from 'three';
import {
  FLOATING_BLOOMING_ISLANDS,
  UNDER_ISLAND_CRYSTAL_HOLLOW_POS,
  SKY_GALLEON_SHIP_POS,
  SKY_WALKABLE_CLOUDS,
  SKY_RUNNER_RINGS,
  getSkyWalkableCloudStates,
  FLOATING_ISLAND_STAIR_POS,
  FLOATING_WATERFALL_STEP_ISLANDS,
  SKY_WIND_GEYSERS,
  isWithinViewDistance,
  VIEW_DISTANCE,
} from '../terrainMath';
import { attachWindSwayShader, perturbGeometryVertices } from '../builders/shaderAndMaterialBuilders';
import type { IWorldModelBuildContext } from './types';

export interface ICelestialSkyArchipelagoBuildResult {
  readonly floatingIslandsGroup: THREE.Group;
  readonly updateCelestialSkyArchipelago: (
    elapsedTime: number,
    playerX: number,
    playerZ: number
  ) => void;
}

export function buildCelestialSkyArchipelagoModels(
  ctx: IWorldModelBuildContext,
  obsidianMat: THREE.MeshStandardMaterial,
  magmaCrystalMat: THREE.MeshStandardMaterial
): ICelestialSkyArchipelagoBuildResult {
  const {
    scene,
    textures,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    swayMaterials,
    distanceCulledObjects,
  } = ctx;

  const floatingIslandsGroup = new THREE.Group();

  // ==========================================================================
  // 1. DISTINCT CELESTIAL, ASTRAL, CLOCKWORK, STORM & PHOENIX PBR MATERIALS
  // ==========================================================================
  const astralLapisMat = new THREE.MeshStandardMaterial({
    color: 0x1e2952,
    bumpMap: textures.rockBump,
    bumpScale: 0.06,
    roughness: 0.34,
    metalness: 0.42,
  });
  const celestialIvoryMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e6,
    roughness: 0.32,
    metalness: 0.12,
  });
  const celestialGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xb45309,
    emissiveIntensity: 0.42,
    roughness: 0.24,
    metalness: 0.82,
  });
  const radiantSunGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.45,
    roughness: 0.18,
    metalness: 0.65,
  });
  const aetherCyanCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.35,
    roughness: 0.14,
    metalness: 0.25,
  });
  const stormVioletCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 2.4,
    roughness: 0.16,
    metalness: 0.3,
  });
  const phoenixAmberCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xfb923c,
    emissive: 0xea580c,
    emissiveIntensity: 2.1,
    roughness: 0.18,
    metalness: 0.28,
  });
  const phoenixCrimsonRockMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.12,
    roughness: 0.68,
    metalness: 0.15,
  });
  const starlightSilverMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.85,
  });
  const sapphireBastionMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.48,
    roughness: 0.28,
    metalness: 0.55,
  });
  const clockworkBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.32,
    metalness: 0.78,
  });
  const airshipTimberMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.58,
    metalness: 0.22,
  });
  const royalSilkBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    emissive: 0x1e40af,
    emissiveIntensity: 0.45,
    roughness: 0.38,
    side: THREE.DoubleSide,
  });
  const crimsonSilkMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.45,
    roughness: 0.38,
    side: THREE.DoubleSide,
  });
  const aetherBeamCoreMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.65,
    roughness: 0.1,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const liquidGoldStreamMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.35,
    roughness: 0.15,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
  });

  attachWindSwayShader(royalSilkBlueMat, 0.02, 1.5, swayMaterials);
  attachWindSwayShader(crimsonSilkMat, 0.02, 1.5, swayMaterials);

  disposableMaterials.push(
    astralLapisMat,
    celestialIvoryMat,
    celestialGoldMat,
    radiantSunGoldMat,
    aetherCyanCrystalMat,
    stormVioletCrystalMat,
    phoenixAmberCrystalMat,
    phoenixCrimsonRockMat,
    starlightSilverMat,
    sapphireBastionMat,
    clockworkBronzeMat,
    airshipTimberMat,
    royalSilkBlueMat,
    crimsonSilkMat,
    aetherBeamCoreMat,
    liquidGoldStreamMat
  );

  // Shared Reusable Faceted Crystal & Architectural Geometries
  const crystalPrismGeo = new THREE.OctahedronGeometry(1.0, 0);
  crystalPrismGeo.scale(0.75, 2.4, 0.75);
  const starSpireGeo = new THREE.ConeGeometry(1.2, 6.5, 8);
  const flutedPillarGeo = new THREE.CylinderGeometry(0.45, 0.56, 6.2, 8);
  const chestBoxGeo = new THREE.BoxGeometry(1.45, 0.85, 0.95);
  const chestLidGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.45, 12, 1, false, 0, Math.PI);
  chestLidGeo.rotateZ(Math.PI / 2);
  const cloudPuffGeo = new THREE.IcosahedronGeometry(1.0, 2);
  cloudPuffGeo.scale(1.0, 0.48, 1.0);

  disposableGeometries.push(
    crystalPrismGeo,
    starSpireGeo,
    flutedPillarGeo,
    chestBoxGeo,
    chestLidGeo,
    cloudPuffGeo
  );

  const floatingCrystals: THREE.Mesh[] = [];

  // ==========================================================================
  // 2. GROUND BASE & ASCENT: ASTRAL STARGATE DOCK & HELICAL CLOUD-CRYSTAL TOWER
  //    (Completely replaces the old green lower island, waterfall & 57 green discs!)
  // ==========================================================================
  const wfX = FLOATING_ISLAND_STAIR_POS.waterfallX;
  const wfZ = FLOATING_ISLAND_STAIR_POS.waterfallZ;
  const wfFootY = FLOATING_ISLAND_STAIR_POS.footY;
  const wfTopY = FLOATING_ISLAND_STAIR_POS.topY;
  const wfHeight = wfTopY - wfFootY;

  // 2A. Octagonal Lapis-Obsidian & Gold Star-Compass Sanctum rising from the sea at (wfX - 5, 3.25, wfZ)
  const dockOctagonOuterGeo = new THREE.CylinderGeometry(23.5, 27.0, 1.4, 8);
  const dockOctagonInnerGeo = new THREE.CylinderGeometry(18.5, 19.5, 0.45, 8);
  const dockStarPointGeo = new THREE.ConeGeometry(5.5, 14.0, 4);
  dockStarPointGeo.rotateX(Math.PI / 2);
  const dockButtressMonolithGeo = new THREE.BoxGeometry(4.2, 11.5, 6.8);
  const stargateRingGeo = new THREE.TorusGeometry(8.6, 0.58, 10, 32);
  const stargateInnerRingGeo = new THREE.TorusGeometry(7.2, 0.26, 8, 28);
  const westStarRampGeo = new THREE.BoxGeometry(18.5, 0.55, 8.6);
  const entryPlazaSlabGeo = new THREE.BoxGeometry(11.0, 0.52, 8.4);

  disposableGeometries.push(
    dockOctagonOuterGeo,
    dockOctagonInnerGeo,
    dockStarPointGeo,
    dockButtressMonolithGeo,
    stargateRingGeo,
    stargateInnerRingGeo,
    westStarRampGeo,
    entryPlazaSlabGeo
  );

  const dockCenterX = wfX - 5.0;
  const dockBaseMesh = new THREE.Mesh(dockOctagonOuterGeo, astralLapisMat);
  dockBaseMesh.position.set(dockCenterX, 3.25 - 0.72, wfZ);
  dockBaseMesh.receiveShadow = !isSoftwareGl;
  floatingIslandsGroup.add(dockBaseMesh);

  const dockInlayMesh = new THREE.Mesh(dockOctagonInnerGeo, celestialIvoryMat);
  dockInlayMesh.position.set(dockCenterX, 3.25 - 0.2, wfZ);
  dockInlayMesh.receiveShadow = !isSoftwareGl;
  floatingIslandsGroup.add(dockInlayMesh);

  // 8 Star-Compass Points & Sea-Wall Obsidian-Gold Buttresses around the Ground Sanctum
  for (let b = 0; b < 8; b++) {
    const bAng = (b / 8) * Math.PI * 2;
    const bx = dockCenterX + Math.cos(bAng) * 24.5;
    const bz = wfZ + Math.sin(bAng) * 24.5;

    const starPt = new THREE.Mesh(dockStarPointGeo, celestialGoldMat);
    starPt.position.set(bx, 2.2, bz);
    starPt.rotation.y = -bAng + Math.PI / 2;
    floatingIslandsGroup.add(starPt);

    const monolith = new THREE.Mesh(dockButtressMonolithGeo, astralLapisMat);
    monolith.position.set(dockCenterX + Math.cos(bAng) * 31.0, -1.2, wfZ + Math.sin(bAng) * 31.0);
    monolith.rotation.y = -bAng;
    floatingIslandsGroup.add(monolith);

    const pylonCrys = new THREE.Mesh(crystalPrismGeo, b % 2 === 0 ? aetherCyanCrystalMat : radiantSunGoldMat);
    pylonCrys.scale.set(1.35, 2.2, 1.35);
    pylonCrys.position.set(dockCenterX + Math.cos(bAng) * 21.8, 5.8, wfZ + Math.sin(bAng) * 21.8);
    floatingIslandsGroup.add(pylonCrys);
    floatingCrystals.push(pylonCrys);
  }

  // Western Shoreline Golden Star-Ramp & Entry Plaza
  const westRampMesh = new THREE.Mesh(westStarRampGeo, celestialGoldMat);
  westRampMesh.position.set(FLOATING_ISLAND_STAIR_POS.entryRampStartX - 8.2, 2.02, wfZ);
  westRampMesh.rotation.z = Math.atan2(3.18 - 1.15, 16.5);
  floatingIslandsGroup.add(westRampMesh);

  const entryPlazaMesh = new THREE.Mesh(entryPlazaSlabGeo, celestialIvoryMat);
  entryPlazaMesh.position.set(FLOATING_ISLAND_STAIR_POS.entryRampStartX + 4.7, 3.12, wfZ);
  entryPlazaMesh.rotation.z = 0.024;
  floatingIslandsGroup.add(entryPlazaMesh);

  // Colossal Vertical Rotating Stargate Portal Ring at the Ground Entrance (entryGateX)
  const entryGateX = FLOATING_ISLAND_STAIR_POS.entryRampStartX + 1.5;
  const groundStargateOuter = new THREE.Mesh(stargateRingGeo, celestialGoldMat);
  groundStargateOuter.rotation.y = Math.PI / 2;
  groundStargateOuter.position.set(entryGateX, 8.8, wfZ);
  const groundStargateInner = new THREE.Mesh(stargateInnerRingGeo, aetherCyanCrystalMat);
  groundStargateInner.rotation.y = Math.PI / 2;
  groundStargateInner.position.set(entryGateX, 8.8, wfZ);
  floatingIslandsGroup.add(groundStargateOuter, groundStargateInner);

  // 2B. Central 65-Meter Spiraling Aether-Vortex Beam & Rotating Golden Starlight Rings at (wfX, wfZ)
  const vortexCoreGeo = new THREE.CylinderGeometry(1.85, 2.65, wfHeight, 16, 1, true);
  const vortexHelixCageGeo = new THREE.CylinderGeometry(3.2, 3.8, wfHeight, 8, 1, true);
  const vortexRingGeo = new THREE.TorusGeometry(3.4, 0.22, 8, 8);
  vortexRingGeo.rotateX(Math.PI / 2);
  const vortexBaseStarGeo = new THREE.CylinderGeometry(7.8, 8.4, 0.42, 8);

  disposableGeometries.push(vortexCoreGeo, vortexHelixCageGeo, vortexRingGeo, vortexBaseStarGeo);

  const vortexCoreMesh = new THREE.Mesh(vortexCoreGeo, aetherBeamCoreMat);
  vortexCoreMesh.position.set(wfX, wfFootY + wfHeight * 0.5, wfZ);
  const vortexGoldRibbonMesh = new THREE.Mesh(vortexHelixCageGeo, liquidGoldStreamMat);
  vortexGoldRibbonMesh.position.set(wfX, wfFootY + wfHeight * 0.5, wfZ);
  const vortexBaseStar = new THREE.Mesh(vortexBaseStarGeo, celestialGoldMat);
  vortexBaseStar.position.set(wfX, wfFootY + 0.08, wfZ);
  floatingIslandsGroup.add(vortexCoreMesh, vortexGoldRibbonMesh, vortexBaseStar);

  // Upper Aether-Bridge Conduit connecting the top of the Vortex (720, -35) to the Metropolis Western Gate (733, -35) at y=68.0
  const upperConduitDeckGeo = new THREE.BoxGeometry(16.0, 0.9, 8.2);
  const upperConduitStreamGeo = new THREE.BoxGeometry(16.2, 0.22, 4.4);
  disposableGeometries.push(upperConduitDeckGeo, upperConduitStreamGeo);

  const upperConduitDeck = new THREE.Mesh(upperConduitDeckGeo, celestialGoldMat);
  upperConduitDeck.position.set((wfX + FLOATING_ISLAND_STAIR_POS.topX) * 0.5 + 0.5, wfTopY - 0.44, wfZ);
  const upperConduitStream = new THREE.Mesh(upperConduitStreamGeo, aetherBeamCoreMat);
  upperConduitStream.position.set((wfX + FLOATING_ISLAND_STAIR_POS.topX) * 0.5 + 0.5, wfTopY + 0.04, wfZ);
  floatingIslandsGroup.add(upperConduitDeck, upperConduitStream);

  const vortexRings: THREE.Mesh[] = [];
  for (let r = 0; r < 22; r++) {
    const t = r / 22;
    const vRing = new THREE.Mesh(
      vortexRingGeo,
      r % 2 === 0 ? radiantSunGoldMat : aetherCyanCrystalMat
    );
    vRing.position.set(wfX, wfFootY + t * wfHeight, wfZ);
    floatingIslandsGroup.add(vRing);
    vortexRings.push(vRing);
  }

  // 2C. 57 Helical Cloud-Cushions, Faceted Star-Crystal Steps & 9 Octagonal Golden Astral Belvederes
  //     (Replacing the old 57 green grass circles!)
  const crystalStepSlabGeo = new THREE.CylinderGeometry(1.55, 0.95, 0.45, 6);
  const crystalStepSpireGeo = new THREE.ConeGeometry(1.15, 2.6, 6);
  crystalStepSpireGeo.rotateX(Math.PI);
  const restOctagonDeckGeo = new THREE.CylinderGeometry(2.05, 1.75, 0.52, 8);
  const restCrescentArchGeo = new THREE.TorusGeometry(1.85, 0.14, 8, 20, Math.PI);
  const stepLinkBridgeGeo = new THREE.BoxGeometry(0.68, 0.16, 1.52);

  const cloudStepMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.48,
    roughness: 0.55,
  });

  disposableGeometries.push(
    crystalStepSlabGeo,
    crystalStepSpireGeo,
    restOctagonDeckGeo,
    restCrescentArchGeo,
    stepLinkBridgeGeo
  );
  disposableMaterials.push(cloudStepMat);

  for (let i = 0; i < FLOATING_WATERFALL_STEP_ISLANDS.length; i++) {
    const stepIsl = FLOATING_WATERFALL_STEP_ISLANDS[i];
    const stepGroup = new THREE.Group();
    stepGroup.position.set(stepIsl.x, stepIsl.y, stepIsl.z);

    const outCos = Math.cos(stepIsl.angle);
    const outSin = Math.sin(stepIsl.angle);
    const isFirstOrLast = i === 0 || i === FLOATING_WATERFALL_STEP_ISLANDS.length - 1;

    if (stepIsl.isRestLanding) {
      // Grand Octagonal Golden & Lapis Astral Belvedere Platform
      const octDeck = new THREE.Mesh(restOctagonDeckGeo, celestialGoldMat);
      octDeck.position.set(0, -0.24, 0);
      const octUnder = new THREE.Mesh(crystalStepSpireGeo, astralLapisMat);
      octUnder.scale.set(1.45, 1.35, 1.45);
      octUnder.position.set(0, -1.65, 0);
      const underCore = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
      underCore.scale.setScalar(0.55);
      underCore.position.set(0, -3.2, 0);
      stepGroup.add(octDeck, octUnder, underCore);
      floatingCrystals.push(underCore);

      if (!isFirstOrLast) {
        const arch = new THREE.Mesh(restCrescentArchGeo, radiantSunGoldMat);
        arch.position.set(outCos * 1.35, 1.65, outSin * 1.35);
        arch.rotation.y = -stepIsl.angle + Math.PI / 2;
        const floatingStar = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
        floatingStar.scale.setScalar(0.45);
        floatingStar.position.set(outCos * 1.35, 2.45, outSin * 1.35);
        stepGroup.add(arch, floatingStar);
        floatingCrystals.push(floatingStar);
      }
    } else if (i % 2 === 0) {
      // Billowing Golden-Rimmed Cumulus Cloud Cushion Step
      for (const [ox, oy, oz, sx, sy] of [
        [0, -0.22, 0, 1.42, 0.65],
        [0.55, -0.28, 0.35, 0.95, 0.55],
        [-0.55, -0.28, -0.35, 0.95, 0.55],
        [0.35, -0.3, -0.55, 0.88, 0.52],
      ] as const) {
        const puff = new THREE.Mesh(cloudPuffGeo, cloudStepMat);
        puff.position.set(ox, oy, oz);
        puff.scale.set(sx, sy, sx);
        stepGroup.add(puff);
      }
      const goldTrim = new THREE.Mesh(crystalStepSlabGeo, celestialGoldMat);
      goldTrim.scale.set(0.95, 0.35, 0.95);
      goldTrim.position.set(0, -0.08, 0);
      stepGroup.add(goldTrim);
    } else {
      // Faceted Hexagonal Star-Crystal & Gold Prism Step
      const hexSlab = new THREE.Mesh(crystalStepSlabGeo, celestialIvoryMat);
      hexSlab.position.set(0, -0.2, 0);
      const hexSpire = new THREE.Mesh(crystalStepSpireGeo, aetherCyanCrystalMat);
      hexSpire.position.set(0, -1.45, 0);
      stepGroup.add(hexSlab, hexSpire);
    }

    floatingIslandsGroup.add(stepGroup);

    // Golden Sun-Ray Stepping Treads across the gap between consecutive steps
    if (i < FLOATING_WATERFALL_STEP_ISLANDS.length - 1) {
      const nextIsl = FLOATING_WATERFALL_STEP_ISLANDS[i + 1];
      const dx = nextIsl.x - stepIsl.x;
      const dz = nextIsl.z - stepIsl.z;
      const dy = nextIsl.y - stepIsl.y;
      const horizLen = Math.hypot(dx, dz) || 1;
      const stepYaw = Math.atan2(-dz, dx);
      const dirX = dx / horizLen;
      const dirZ = dz / horizLen;
      const startRim = stepIsl.radius + 0.12;
      const endRim = nextIsl.radius + 0.12;
      const clearGap = horizLen - startRim - endRim;

      if (clearGap > 0.2) {
        for (const gapFrac of [0.35, 0.65] as const) {
          const distAlong = startRim + clearGap * gapFrac;
          const u = distAlong / horizLen;
          const tread = new THREE.Mesh(stepLinkBridgeGeo, radiantSunGoldMat);
          tread.position.set(
            stepIsl.x + dirX * distAlong,
            stepIsl.y + dy * u - 0.08,
            stepIsl.z + dirZ * distAlong
          );
          tread.rotation.y = stepYaw;
          floatingIslandsGroup.add(tread);
        }
      }
    }
  }

  // ==========================================================================
  // 3. REALM 1 (MAIN HUB, 760, -35, y=68.0m):
  //    THE GRAND STAR-OCTAGONAL CELESTIAL SKY-METROPOLIS & 26M SPIRE CATHEDRAL
  //    (Zero green grass, zero pink sakura trees, zero white dome!)
  // ==========================================================================
  const mainIsl = FLOATING_BLOOMING_ISLANDS[0];
  const mainIslX = mainIsl.x;
  const mainIslZ = mainIsl.z;
  const mainDeckY = mainIsl.deckY;

  const metropolisGroup = new THREE.Group();
  metropolisGroup.position.set(mainIslX, mainDeckY, mainIslZ);

  const metroOctagonDeckGeo = new THREE.CylinderGeometry(mainIsl.radius, mainIsl.radius * 0.92, 1.8, 8);
  const metroStarMosaicGeo = new THREE.CylinderGeometry(mainIsl.radius * 0.78, mainIsl.radius * 0.78, 0.24, 8);
  const metroGoldCompassRingGeo = new THREE.TorusGeometry(mainIsl.radius * 0.94, 0.45, 8, 8);
  metroGoldCompassRingGeo.rotateX(Math.PI / 2);
  const metroButtressFinGeo = new THREE.BoxGeometry(3.4, 13.5, 9.5);
  const metroAetherTurbineRingGeo = new THREE.TorusGeometry(19.5, 0.85, 10, 32);
  metroAetherTurbineRingGeo.rotateX(Math.PI / 2);
  const cathedralButtressLegGeo = new THREE.CylinderGeometry(0.55, 1.15, 16.5, 8);
  const cathedralCentralSpireGeo = new THREE.ConeGeometry(2.6, 18.5, 8);
  const cathedralHaloRingGeo = new THREE.TorusGeometry(5.8, 0.24, 10, 32);
  cathedralHaloRingGeo.rotateX(Math.PI / 2);

  disposableGeometries.push(
    metroOctagonDeckGeo,
    metroStarMosaicGeo,
    metroGoldCompassRingGeo,
    metroButtressFinGeo,
    metroAetherTurbineRingGeo,
    cathedralButtressLegGeo,
    cathedralCentralSpireGeo,
    cathedralHaloRingGeo
  );

  // Star-Octagonal Ivory & Lapis-Lazuli Citadel Deck
  const metroMainSlab = new THREE.Mesh(metroOctagonDeckGeo, celestialIvoryMat);
  metroMainSlab.position.set(0, -0.9, 0);
  metroMainSlab.receiveShadow = !isSoftwareGl;
  const metroLapisInlay = new THREE.Mesh(metroStarMosaicGeo, astralLapisMat);
  metroLapisInlay.position.set(0, -0.1, 0);
  metroLapisInlay.rotation.y = Math.PI / 8;
  const metroOuterGoldRing = new THREE.Mesh(metroGoldCompassRingGeo, celestialGoldMat);
  metroOuterGoldRing.position.set(0, -0.05, 0);
  const metroAetherRing = new THREE.Mesh(metroAetherTurbineRingGeo, aetherCyanCrystalMat);
  metroAetherRing.position.set(0, -7.5, 0);
  metropolisGroup.add(metroMainSlab, metroLapisInlay, metroOuterGoldRing, metroAetherRing);

  // 8 Colossal Buttressed Obsidian-and-Gold Levitation Fins & Perimeter Star-Spire Beacons
  for (let f = 0; f < 8; f++) {
    const fAng = (f / 8) * Math.PI * 2 + Math.PI / 8;
    const cosF = Math.cos(fAng);
    const sinF = Math.sin(fAng);

    const fin = new THREE.Mesh(metroButtressFinGeo, f % 2 === 0 ? astralLapisMat : celestialGoldMat);
    fin.position.set(cosF * 22.5, -6.8, sinF * 22.5);
    fin.rotation.y = -fAng + Math.PI / 2;
    fin.rotation.x = 0.28;
    metropolisGroup.add(fin);

    const underPylonCrys = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
    underPylonCrys.scale.set(1.4, 2.6, 1.4);
    underPylonCrys.position.set(cosF * 24.0, -13.5, sinF * 24.0);
    metropolisGroup.add(underPylonCrys);
    floatingCrystals.push(underPylonCrys);

    // Golden Sun-Willow Crystal Trees on the 6 non-bridge octants
    if (f !== 1 && f !== 5) {
      const treeX = cosF * 20.5;
      const treeZ = sinF * 20.5;
      const willowGroup = new THREE.Group();
      willowGroup.position.set(treeX, 0, treeZ);

      const trunk = new THREE.Mesh(flutedPillarGeo, clockworkBronzeMat);
      trunk.scale.set(0.75, 0.95, 0.75);
      trunk.position.set(0, 2.9, 0);
      willowGroup.add(trunk);

      // Crown of radiant golden & cyan crystal prisms instead of pink foliage spheres!
      for (let c = 0; c < 7; c++) {
        const cAng = (c / 7) * Math.PI * 2;
        const cRad = c === 0 ? 0 : 1.85;
        const shard = new THREE.Mesh(
          crystalPrismGeo,
          c % 2 === 0 ? radiantSunGoldMat : aetherCyanCrystalMat
        );
        shard.scale.set(0.85, 1.35, 0.85);
        shard.position.set(Math.cos(cAng) * cRad, 6.2 + (c === 0 ? 1.2 : 0), Math.sin(cAng) * cRad);
        shard.rotation.set(Math.sin(cAng) * 0.45, cAng, -Math.cos(cAng) * 0.45);
        willowGroup.add(shard);
      }
      metropolisGroup.add(willowGroup);
    }
  }

  // Twin Western Stargate Pylons flanking the Metropolis Entry Bridge (at topX + 4.8, z = -35 ± 6.2)
  const gatePylonLocalX = FLOATING_ISLAND_STAIR_POS.topX + 4.8 - mainIslX;
  for (const side of [-1, 1] as const) {
    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(gatePylonLocalX, 0, side * 6.2);
    const pylonBase = new THREE.Mesh(flutedPillarGeo, astralLapisMat);
    pylonBase.scale.set(1.65, 1.45, 1.65);
    pylonBase.position.set(0, 4.4, 0);
    const pylonSpire = new THREE.Mesh(starSpireGeo, celestialGoldMat);
    pylonSpire.scale.set(1.35, 1.15, 1.35);
    pylonSpire.position.set(0, 11.8, 0);
    const pylonStar = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
    pylonStar.scale.set(1.1, 1.6, 1.1);
    pylonStar.position.set(0, 16.5, 0);
    pylonGroup.add(pylonBase, pylonSpire, pylonStar);
    floatingCrystals.push(pylonStar);
    metropolisGroup.add(pylonGroup);
  }

  // Centerpiece: The 26-Meter Spire Cathedral of the Winds & Starlight Throne Bed (at 760, 68.0, -35)
  for (let b = 0; b < 8; b++) {
    const bAng = (b / 8) * Math.PI * 2 + Math.PI / 8;
    const bx = Math.cos(bAng) * 7.4;
    const bz = Math.sin(bAng) * 7.4;
    const buttressCol = new THREE.Mesh(flutedPillarGeo, celestialGoldMat);
    buttressCol.scale.set(1.05, 1.65, 1.05);
    buttressCol.position.set(bx, 5.1, bz);
    metropolisGroup.add(buttressCol);

    const flyingArch = new THREE.Mesh(cathedralButtressLegGeo, celestialIvoryMat);
    flyingArch.scale.set(0.65, 0.72, 0.65);
    flyingArch.position.set(bx * 0.62, 12.8, bz * 0.62);
    flyingArch.rotation.z = Math.cos(bAng) * 0.48;
    flyingArch.rotation.x = -Math.sin(bAng) * 0.48;
    metropolisGroup.add(flyingArch);
  }

  const cathedralSpire = new THREE.Mesh(cathedralCentralSpireGeo, celestialGoldMat);
  cathedralSpire.position.set(0, 20.5, 0);
  const cathedralApexStar = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
  cathedralApexStar.scale.set(1.6, 2.8, 1.6);
  cathedralApexStar.position.set(0, 31.2, 0);
  floatingCrystals.push(cathedralApexStar);

  const cathedralHalos: THREE.Mesh[] = [];
  for (let h = 0; h < 3; h++) {
    const halo = new THREE.Mesh(
      cathedralHaloRingGeo,
      h % 2 === 0 ? radiantSunGoldMat : aetherCyanCrystalMat
    );
    halo.scale.setScalar(1.15 - h * 0.22);
    halo.position.set(0, 11.5 + h * 4.2, 0);
    metropolisGroup.add(halo);
    cathedralHalos.push(halo);
  }
  metropolisGroup.add(cathedralSpire, cathedralApexStar);

  // Celestial Star-Sanctuary Royal Bed at (760, 68.35, -35) — Sculpted Golden Crescent & Starlight Couch
  const bedDaisGeo = new THREE.CylinderGeometry(3.2, 3.6, 0.36, 8);
  const bedFrameGeo = new THREE.BoxGeometry(2.5, 0.4, 3.2);
  const bedMattressGeo = new THREE.BoxGeometry(2.2, 0.28, 2.9);
  const bedCrescentHeadboardGeo = new THREE.TorusGeometry(1.45, 0.18, 8, 20, Math.PI);
  disposableGeometries.push(bedDaisGeo, bedFrameGeo, bedMattressGeo, bedCrescentHeadboardGeo);

  const bedDais = new THREE.Mesh(bedDaisGeo, astralLapisMat);
  bedDais.position.set(0, 0.18, 0);
  const bedFrame = new THREE.Mesh(bedFrameGeo, celestialGoldMat);
  bedFrame.position.set(0, 0.52, 0);
  const bedMattress = new THREE.Mesh(bedMattressGeo, royalSilkBlueMat);
  bedMattress.position.set(0, 0.78, 0);
  const bedHeadboard = new THREE.Mesh(bedCrescentHeadboardGeo, radiantSunGoldMat);
  bedHeadboard.position.set(0, 1.45, -1.45);
  metropolisGroup.add(bedDais, bedFrame, bedMattress, bedHeadboard);

  // Southern Grand Treasury Vault Pavilion & Chest (`chest-sky-metropolis-sanctum` at 760, 68.0, -15.5 -> localZ = +19.5)
  const vaultAltar = new THREE.Mesh(bedDaisGeo, celestialGoldMat);
  vaultAltar.position.set(0, 0.2, 19.5);
  const metroChestBase = new THREE.Mesh(chestBoxGeo, starlightSilverMat);
  metroChestBase.position.set(0, 0.72, 19.5);
  const metroChestLid = new THREE.Mesh(chestLidGeo, celestialGoldMat);
  metroChestLid.position.set(0, 1.15, 19.5);
  metropolisGroup.add(vaultAltar, metroChestBase, metroChestLid);

  // Airship-Silk Bazaar Pavilions at (746, 68.0, -24 -> local -14, +11) and (774, 68.0, -24 -> local +14, +11)
  const bazaarSailCanopyGeo = new THREE.ConeGeometry(3.8, 2.4, 6);
  const bazaarCounterGeo = new THREE.BoxGeometry(3.4, 0.88, 1.4);
  const skyAnvilBodyGeo = new THREE.BoxGeometry(1.25, 0.72, 0.62);
  disposableGeometries.push(bazaarSailCanopyGeo, bazaarCounterGeo, skyAnvilBodyGeo);

  for (const side of [-1, 1] as const) {
    const bazGroup = new THREE.Group();
    bazGroup.position.set(side * 14.0, 0, 11.0);
    for (const [px, pz] of [
      [-2.2, -1.6],
      [2.2, -1.6],
      [-2.2, 1.6],
      [2.2, 1.6],
    ] as const) {
      const post = new THREE.Mesh(flutedPillarGeo, celestialGoldMat);
      post.scale.set(0.35, 0.56, 0.35);
      post.position.set(px, 1.7, pz);
      bazGroup.add(post);
    }
    const canopy = new THREE.Mesh(
      bazaarSailCanopyGeo,
      side < 0 ? royalSilkBlueMat : crimsonSilkMat
    );
    canopy.position.set(0, 4.2, 0);
    const counter = new THREE.Mesh(bazaarCounterGeo, astralLapisMat);
    counter.position.set(0, 0.44, 0);
    bazGroup.add(canopy, counter);

    for (const gx of [-1.1, 0, 1.1] as const) {
      const relic = new THREE.Mesh(crystalPrismGeo, gx === 0 ? radiantSunGoldMat : aetherCyanCrystalMat);
      relic.scale.setScalar(0.35);
      relic.position.set(gx, 1.25, 0);
      bazGroup.add(relic);
      floatingCrystals.push(relic);
    }
    metropolisGroup.add(bazGroup);
  }

  // Celestial Meteorite Star-Forge on NW Terrace (local -14, -11 -> world 746, 68.0, -46)
  const forgeGroup = new THREE.Group();
  forgeGroup.position.set(-14.0, 0, -11.0);
  const forgeDais = new THREE.Mesh(bedDaisGeo, astralLapisMat);
  forgeDais.scale.set(0.75, 1.0, 0.75);
  forgeDais.position.set(0, 0.18, 0);
  const forgeAnvil = new THREE.Mesh(skyAnvilBodyGeo, celestialGoldMat);
  forgeAnvil.position.set(0, 0.85, 0);
  const forgeFlame = new THREE.Mesh(crystalPrismGeo, phoenixAmberCrystalMat);
  forgeFlame.scale.setScalar(0.72);
  forgeFlame.position.set(-1.6, 1.4, -0.8);
  forgeGroup.add(forgeDais, forgeAnvil, forgeFlame);
  floatingCrystals.push(forgeFlame);
  metropolisGroup.add(forgeGroup);

  floatingIslandsGroup.add(metropolisGroup);

  // ==========================================================================
  // 4. UNDER-ISLAND LEVEL (760, -35, y=54.0m):
  //    SUSPENDED AETHER-REACTOR VAULT, GOLDEN ANCHOR CHAINS & SKYWALK BALCONIES
  // ==========================================================================
  const hPos = UNDER_ISLAND_CRYSTAL_HOLLOW_POS;
  const bridgePlankGeo = new THREE.BoxGeometry(5.6, 0.34, 0.92);
  const bridgeKerbGeo = new THREE.BoxGeometry(0.36, 0.56, 0.96);
  const bridgeRailPostGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.15, 8);
  const hollowOctagonFloorGeo = new THREE.CylinderGeometry(hPos.radius, hPos.radius * 0.9, 1.1, 8);
  const hollowBalconyGeo = new THREE.BoxGeometry(9.6, 0.55, 8.2);
  const hollowChainPylonGeo = new THREE.CylinderGeometry(0.55, 0.75, 13.5, 8);
  const hollowPoolRimGeo = new THREE.TorusGeometry(5.4, 0.42, 8, 24);
  hollowPoolRimGeo.rotateX(Math.PI / 2);
  const hollowPoolWaterGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.2, 24);

  disposableGeometries.push(
    bridgePlankGeo,
    bridgeKerbGeo,
    bridgeRailPostGeo,
    hollowOctagonFloorGeo,
    hollowBalconyGeo,
    hollowChainPylonGeo,
    hollowPoolRimGeo,
    hollowPoolWaterGeo
  );

  // 2-Flight Cantilevered Golden Staircase from SW Rim (741, 68, -14.5) -> Mid-Landing (751, 61, -5.5) -> Reactor Vault (758, 54, -17.5)
  const buildGoldenStairFlight = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    steps: number
  ) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const perpX = -dz / len;
    const perpZ = dx / len;
    const yaw = Math.atan2(dx, dz);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const sx = x0 + t * dx;
      const sy = y0 + t * (y1 - y0);
      const sz = z0 + t * dz;
      const plank = new THREE.Mesh(bridgePlankGeo, astralLapisMat);
      plank.scale.set(0.76, 1.0, 1.05);
      plank.position.set(sx, sy - 0.15, sz);
      plank.rotation.y = yaw;
      floatingIslandsGroup.add(plank);
      for (const side of [-1, 1] as const) {
        const kx = sx + perpX * side * 2.05;
        const kz = sz + perpZ * side * 2.05;
        const kerb = new THREE.Mesh(bridgeKerbGeo, celestialGoldMat);
        kerb.position.set(kx, sy + 0.14, kz);
        kerb.rotation.y = yaw;
        floatingIslandsGroup.add(kerb);
        if (s % 3 === 0) {
          const post = new THREE.Mesh(bridgeRailPostGeo, radiantSunGoldMat);
          post.position.set(kx, sy + 0.65, kz);
          floatingIslandsGroup.add(post);
        }
      }
    }
  };

  buildGoldenStairFlight(hPos.stairTopX, 68.0, hPos.stairTopZ, hPos.stairMidX, hPos.stairMidY, hPos.stairMidZ, 14);
  const midLandingDisc = new THREE.Mesh(bedDaisGeo, celestialGoldMat);
  midLandingDisc.scale.set(1.1, 1.2, 1.1);
  midLandingDisc.position.set(hPos.stairMidX, hPos.stairMidY - 0.2, hPos.stairMidZ);
  floatingIslandsGroup.add(midLandingDisc);
  buildGoldenStairFlight(hPos.stairMidX, hPos.stairMidY, hPos.stairMidZ, hPos.stairBottomX, hPos.floorY, hPos.stairBottomZ, 14);

  const hollowGroup = new THREE.Group();
  hollowGroup.position.set(hPos.x, hPos.floorY, hPos.z);

  const hollowFloor = new THREE.Mesh(hollowOctagonFloorGeo, astralLapisMat);
  hollowFloor.position.set(0, -0.55, 0);
  hollowFloor.receiveShadow = !isSoftwareGl;
  const hollowInlay = new THREE.Mesh(hollowOctagonFloorGeo, celestialGoldMat);
  hollowInlay.scale.set(0.82, 0.25, 0.82);
  hollowInlay.position.set(0, -0.1, 0);
  hollowGroup.add(hollowFloor, hollowInlay);

  // Under-Reactor Inverted Spire Cone (strictly below y=54.0m so the vault is wide open!)
  const reactorUnderConeGeo = new THREE.ConeGeometry(12.5, 16.0, 8);
  reactorUnderConeGeo.rotateX(Math.PI);
  disposableGeometries.push(reactorUnderConeGeo);
  const reactorUnderCone = new THREE.Mesh(reactorUnderConeGeo, astralLapisMat);
  reactorUnderCone.position.set(0, -9.0, 0);
  const reactorApexCrys = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
  reactorApexCrys.scale.set(2.2, 3.2, 2.2);
  reactorApexCrys.position.set(0, -18.5, 0);
  hollowGroup.add(reactorUnderCone, reactorApexCrys);
  floatingCrystals.push(reactorApexCrys);

  // North & East Cantilevered Starlight Balconies at y = 54.0m
  const northBalcony = new THREE.Mesh(hollowBalconyGeo, celestialGoldMat);
  northBalcony.position.set(0, -0.25, -21.0);
  const eastBalcony = new THREE.Mesh(hollowBalconyGeo, celestialGoldMat);
  eastBalcony.rotation.y = Math.PI / 2;
  eastBalcony.position.set(21.0, -0.25, 0);
  hollowGroup.add(northBalcony, eastBalcony);

  // 8 Golden Suspension Anchor Pylons & Angled Energy Beams (leaving South Stair, North Balcony, and East Balcony wide open)
  for (let p = 0; p < 12; p++) {
    const pAng = (p / 12) * Math.PI * 2;
    const px = Math.cos(pAng) * (hPos.radius - 1.2);
    const pz = Math.sin(pAng) * (hPos.radius - 1.2);
    if (
      (pz > 13.0 && Math.abs(px) < 6.5) ||
      (pz < -13.0 && Math.abs(px) < 6.2) ||
      (px > 13.0 && Math.abs(pz) < 6.2)
    ) {
      continue;
    }
    const chainPylon = new THREE.Mesh(hollowChainPylonGeo, celestialGoldMat);
    chainPylon.position.set(px, 6.2, pz);
    const conduitCrys = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
    conduitCrys.scale.set(0.95, 1.65, 0.95);
    conduitCrys.position.set(px * 0.84, 2.4, pz * 0.84);
    conduitCrys.rotation.set(-pz * 0.025, pAng, px * 0.025);
    hollowGroup.add(chainPylon, conduitCrys);
    floatingCrystals.push(conduitCrys);
  }

  // Central Starlight Reactor Pool, Rotating Heart Crystal & `chest-sky-under-hollow`
  const hollowPoolRim = new THREE.Mesh(hollowPoolRimGeo, celestialGoldMat);
  hollowPoolRim.position.set(0, 0.16, 0);
  const hollowPoolWater = new THREE.Mesh(hollowPoolWaterGeo, aetherBeamCoreMat);
  hollowPoolWater.position.set(0, 0.09, 0);
  const hollowHeartCrystal = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
  hollowHeartCrystal.scale.set(2.1, 2.8, 2.1);
  hollowHeartCrystal.position.set(0, 5.4, 0);
  const hollowChestBase = new THREE.Mesh(chestBoxGeo, starlightSilverMat);
  hollowChestBase.position.set(0, 0.52, 0);
  const hollowChestTop = new THREE.Mesh(chestLidGeo, celestialGoldMat);
  hollowChestTop.position.set(0, 0.95, 0);
  hollowGroup.add(hollowPoolRim, hollowPoolWater, hollowHeartCrystal, hollowChestBase, hollowChestTop);

  floatingIslandsGroup.add(hollowGroup);

  // ==========================================================================
  // 5. REALM 2 (NORTH, 760, -85, y=71.0m):
  //    THE HEXAGONAL SAPPHIRE-SILVER STARLIGHT BASTION & MOON-TREE SANCTUARY
  // ==========================================================================
  const northIsl = FLOATING_BLOOMING_ISLANDS[1];
  const northGroup = new THREE.Group();
  northGroup.position.set(northIsl.x, northIsl.deckY, northIsl.z);

  const northHexDeckGeo = new THREE.CylinderGeometry(northIsl.radius, northIsl.radius * 0.88, 1.6, 6);
  const northUnderPrismGeo = new THREE.ConeGeometry(northIsl.radius * 0.82, 16.5, 6);
  northUnderPrismGeo.rotateX(Math.PI);
  const valkyrieSpireGeo = new THREE.ConeGeometry(2.8, 14.5, 6);
  const fountainBasinGeo = new THREE.CylinderGeometry(3.5, 2.9, 0.78, 8);

  disposableGeometries.push(northHexDeckGeo, northUnderPrismGeo, valkyrieSpireGeo, fountainBasinGeo);

  const northDeckMesh = new THREE.Mesh(northHexDeckGeo, sapphireBastionMat);
  northDeckMesh.position.set(0, -0.8, 0);
  northDeckMesh.receiveShadow = !isSoftwareGl;
  const northSilverRim = new THREE.Mesh(northHexDeckGeo, starlightSilverMat);
  northSilverRim.scale.set(1.03, 0.28, 1.03);
  northSilverRim.position.set(0, -0.15, 0);
  const northUnderPrism = new THREE.Mesh(northUnderPrismGeo, sapphireBastionMat);
  northUnderPrism.position.set(0, -9.0, 0);
  northGroup.add(northDeckMesh, northSilverRim, northUnderPrism);

  // 4 Silver-Bark Moon-Trees with Glowing Cyan Crystal Canopies
  for (const [tx, tz] of [
    [-10.5, -4.5],
    [10.5, -4.5],
    [-10.5, 6.5],
    [10.5, 6.5],
  ] as const) {
    const moonTree = new THREE.Group();
    moonTree.position.set(tx, 0, tz);
    const mTrunk = new THREE.Mesh(flutedPillarGeo, starlightSilverMat);
    mTrunk.scale.set(0.65, 0.85, 0.65);
    mTrunk.position.set(0, 2.6, 0);
    const mCrown = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
    mCrown.scale.set(1.85, 1.45, 1.85);
    mCrown.position.set(0, 6.2, 0);
    moonTree.add(mTrunk, mCrown);
    northGroup.add(moonTree);
  }

  // 3-Spire Silver Valkyrie Citadel at (760, 71.0, -93.5 -> localZ = -8.5)
  const valkCenter = new THREE.Mesh(valkyrieSpireGeo, starlightSilverMat);
  valkCenter.position.set(0, 7.2, -8.5);
  for (const side of [-1, 1] as const) {
    const valkWing = new THREE.Mesh(valkyrieSpireGeo, sapphireBastionMat);
    valkWing.scale.set(0.72, 0.78, 0.72);
    valkWing.position.set(side * 4.4, 5.5, -7.8);
    const valkStar = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
    valkStar.scale.setScalar(0.65);
    valkStar.position.set(side * 4.4, 12.2, -7.8);
    northGroup.add(valkWing, valkStar);
    floatingCrystals.push(valkStar);
  }
  const starFountain = new THREE.Mesh(fountainBasinGeo, starlightSilverMat);
  starFountain.position.set(0, 0.39, 0);
  const starFountainJet = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
  starFountainJet.scale.set(0.9, 1.6, 0.9);
  starFountainJet.position.set(0, 2.2, 0);
  northGroup.add(valkCenter, starFountain, starFountainJet);
  floatingCrystals.push(starFountainJet);

  floatingIslandsGroup.add(northGroup);

  // North Suspension Sky-Bridge (z = -61.2 .. -68.2, climbing from 68.0m to 71.0m)
  for (let s = 0; s <= 12; s++) {
    const t = s / 12;
    const bz = -61.2 - t * 7.0;
    const by = 68.0 + t * 3.0;
    const plank = new THREE.Mesh(bridgePlankGeo, starlightSilverMat);
    plank.position.set(mainIslX, by - 0.15, bz);
    floatingIslandsGroup.add(plank);
    for (const side of [-1, 1] as const) {
      const kerb = new THREE.Mesh(bridgeKerbGeo, celestialGoldMat);
      kerb.position.set(mainIslX + side * 2.65, by + 0.16, bz);
      floatingIslandsGroup.add(kerb);
    }
  }

  // ==========================================================================
  // 6. REALM 3 (EAST, 807, -18, y=70.0m):
  //    THE 12-TOOTHED GOLDEN CLOCKWORK SUN-DISC & CHRONO-OBSERVATORY
  // ==========================================================================
  const eastIsl = FLOATING_BLOOMING_ISLANDS[2];
  const eastGroup = new THREE.Group();
  eastGroup.position.set(eastIsl.x, eastIsl.deckY, eastIsl.z);

  const sunDiscDeckGeo = new THREE.CylinderGeometry(eastIsl.radius, eastIsl.radius * 0.94, 1.4, 24);
  const gearToothGeo = new THREE.BoxGeometry(2.6, 1.2, 3.2);
  const sundialObeliskGeo = new THREE.BoxGeometry(0.95, 5.2, 0.95);
  const armillaryRingGeo = new THREE.TorusGeometry(3.4, 0.18, 10, 32);

  disposableGeometries.push(sunDiscDeckGeo, gearToothGeo, sundialObeliskGeo, armillaryRingGeo);

  const eastSunDeck = new THREE.Mesh(sunDiscDeckGeo, clockworkBronzeMat);
  eastSunDeck.position.set(0, -0.7, 0);
  eastSunDeck.receiveShadow = !isSoftwareGl;
  const eastGoldInlay = new THREE.Mesh(sunDiscDeckGeo, celestialGoldMat);
  eastGoldInlay.scale.set(0.84, 0.25, 0.84);
  eastGoldInlay.position.set(0, -0.08, 0);
  eastGroup.add(eastSunDeck, eastGoldInlay);

  // 12 Clockwork Gear Teeth & Zodiac Sundial Monoliths around the Sun-Disc Rim
  for (let z = 0; z < 12; z++) {
    const zAng = (z / 12) * Math.PI * 2;
    const cosZ = Math.cos(zAng);
    const sinZ = Math.sin(zAng);
    const tooth = new THREE.Mesh(gearToothGeo, celestialGoldMat);
    tooth.position.set(cosZ * (eastIsl.radius + 0.8), -0.65, sinZ * (eastIsl.radius + 0.8));
    tooth.rotation.y = -zAng;
    eastGroup.add(tooth);

    if (z % 2 === 0 && Math.cos(zAng) > -0.65) {
      const dial = new THREE.Mesh(sundialObeliskGeo, astralLapisMat);
      dial.position.set(cosZ * (eastIsl.radius - 2.6), 2.6, sinZ * (eastIsl.radius - 2.6));
      dial.rotation.y = -zAng;
      const dialGem = new THREE.Mesh(crystalPrismGeo, radiantSunGoldMat);
      dialGem.scale.setScalar(0.55);
      dialGem.position.set(cosZ * (eastIsl.radius - 2.6), 5.8, sinZ * (eastIsl.radius - 2.6));
      eastGroup.add(dial, dialGem);
      floatingCrystals.push(dialGem);
    }
  }

  // Rotating 3-Axis Golden Armillary Sphere & `chest-sky-chrono-observatory` (at local +5.5, 0, 0)
  const eastArmillaryGroup = new THREE.Group();
  eastArmillaryGroup.position.set(0, 4.2, 0);
  const armRing1 = new THREE.Mesh(armillaryRingGeo, celestialGoldMat);
  const armRing2 = new THREE.Mesh(armillaryRingGeo, starlightSilverMat);
  armRing2.scale.setScalar(0.78);
  armRing2.rotation.x = Math.PI / 3;
  const armCore = new THREE.Mesh(crystalPrismGeo, radiantSunGoldMat);
  armCore.scale.setScalar(0.95);
  eastArmillaryGroup.add(armRing1, armRing2, armCore);
  eastGroup.add(eastArmillaryGroup);

  const eastChestBase = new THREE.Mesh(chestBoxGeo, starlightSilverMat);
  eastChestBase.position.set(5.5, 0.55, 0);
  eastChestBase.rotation.y = -Math.PI / 2;
  const eastChestTop = new THREE.Mesh(chestLidGeo, celestialGoldMat);
  eastChestTop.position.set(5.5, 0.98, 0);
  eastChestTop.rotation.y = -Math.PI / 2;
  eastGroup.add(eastChestBase, eastChestTop);

  floatingIslandsGroup.add(eastGroup);

  // East Sun-Ray Stair-Bridge (from (784.8, -25.63, y=68.0) to (792.0, -22.91, y=70.0))
  const eBx0 = mainIslX + 24.8;
  const eBz0 = -25.63;
  const eBx1 = mainIslX + 32.0;
  const eBz1 = -22.91;
  const eDx = eBx1 - eBx0;
  const eDz = eBz1 - eBz0;
  const eYaw = Math.atan2(eDx, eDz);
  for (let s = 0; s <= 12; s++) {
    const t = s / 12;
    const plank = new THREE.Mesh(bridgePlankGeo, celestialGoldMat);
    plank.position.set(eBx0 + t * eDx, 68.0 + t * 2.0 - 0.15, eBz0 + t * eDz);
    plank.rotation.y = eYaw;
    floatingIslandsGroup.add(plank);
  }

  // ==========================================================================
  // 7. REALM 4 (SE, 802, 36, y=72.0m) & ROYAL SKY-GALLEON (828, 36, y=72.6..74.6m):
  //    TIMBER & BRASS SKY-HARBOR DRYDOCK CITADEL & 29M SOLAR WAR-GALLEON
  // ==========================================================================
  const dockIsl = FLOATING_BLOOMING_ISLANDS[3];
  const sg = SKY_GALLEON_SHIP_POS;
  const skyHarborGroup = new THREE.Group();
  skyHarborGroup.position.set(dockIsl.x, dockIsl.deckY, dockIsl.z);

  const harborOctDeckGeo = new THREE.CylinderGeometry(dockIsl.radius, dockIsl.radius * 0.85, 2.2, 8);
  const harborUnderHullGeo = new THREE.ConeGeometry(dockIsl.radius * 0.82, 14.0, 8);
  harborUnderHullGeo.rotateX(Math.PI);
  const craneTowerGeo = new THREE.BoxGeometry(1.8, 9.5, 1.8);
  const craneBoomGeo = new THREE.BoxGeometry(8.5, 0.65, 0.85);
  const dockPierGeo = new THREE.BoxGeometry(7.2, 0.65, 5.4);
  const gangplankGeo = new THREE.BoxGeometry(5.6, 0.28, 3.8);

  disposableGeometries.push(
    harborOctDeckGeo,
    harborUnderHullGeo,
    craneTowerGeo,
    craneBoomGeo,
    dockPierGeo,
    gangplankGeo
  );

  const harborDeck = new THREE.Mesh(harborOctDeckGeo, airshipTimberMat);
  harborDeck.position.set(0, -1.1, 0);
  harborDeck.receiveShadow = !isSoftwareGl;
  const harborBrassRim = new THREE.Mesh(harborOctDeckGeo, celestialGoldMat);
  harborBrassRim.scale.set(1.03, 0.22, 1.03);
  harborBrassRim.position.set(0, -0.15, 0);
  const harborUnder = new THREE.Mesh(harborUnderHullGeo, clockworkBronzeMat);
  harborUnder.position.set(0, -8.5, 0);
  const dockPier = new THREE.Mesh(dockPierGeo, celestialGoldMat);
  dockPier.position.set(15.0, -0.25, 0);
  skyHarborGroup.add(harborDeck, harborBrassRim, harborUnder, dockPier);

  // Twin Airship Mooring Crane Derricks & Harbor Beacon
  for (const side of [-1, 1] as const) {
    const craneTower = new THREE.Mesh(craneTowerGeo, clockworkBronzeMat);
    craneTower.position.set(11.5, 4.75, side * 5.2);
    const craneBoom = new THREE.Mesh(craneBoomGeo, celestialGoldMat);
    craneBoom.position.set(14.5, 9.2, side * 5.2);
    craneBoom.rotation.z = 0.18;
    skyHarborGroup.add(craneTower, craneBoom);
  }
  floatingIslandsGroup.add(skyHarborGroup);

  const gangplankMesh = new THREE.Mesh(gangplankGeo, airshipTimberMat);
  gangplankMesh.position.set(
    (sg.gangplankMinX + sg.gangplankMaxX) * 0.5,
    (dockIsl.deckY + sg.mainDeckY) * 0.5 - 0.1,
    sg.z
  );
  gangplankMesh.rotation.z = Math.atan2(sg.mainDeckY - dockIsl.deckY, sg.gangplankMaxX - sg.gangplankMinX);
  floatingIslandsGroup.add(gangplankMesh);

  // The 29-Meter Royal Sky-Galleon at (828.0, 72.6, 36.0)
  const shipHullGeo = new THREE.CylinderGeometry(4.8, 3.2, 29.0, 16);
  shipHullGeo.rotateX(Math.PI / 2);
  shipHullGeo.scale(1.0, 0.68, 1.0);
  const shipMainDeckGeo = new THREE.BoxGeometry(9.4, 0.42, 28.6);
  const shipQuarterDeckGeo = new THREE.BoxGeometry(9.0, 2.0, 6.4);
  const shipBulwarkGeo = new THREE.BoxGeometry(0.35, 1.15, 27.6);
  const shipMastGeo = new THREE.CylinderGeometry(0.28, 0.42, 18.5, 10);
  const shipSailGeo = new THREE.BoxGeometry(8.4, 9.2, 0.18);
  const shipWingFinGeo = new THREE.BoxGeometry(7.4, 0.24, 2.8);
  const shipCannonGeo = new THREE.CylinderGeometry(0.24, 0.32, 1.85, 10);
  shipCannonGeo.rotateZ(Math.PI / 2);
  const shipPropellerBladeGeo = new THREE.BoxGeometry(4.2, 0.42, 0.14);

  disposableGeometries.push(
    shipHullGeo,
    shipMainDeckGeo,
    shipQuarterDeckGeo,
    shipBulwarkGeo,
    shipMastGeo,
    shipSailGeo,
    shipWingFinGeo,
    shipCannonGeo,
    shipPropellerBladeGeo
  );

  const skyGalleonGroup = new THREE.Group();
  skyGalleonGroup.position.set(sg.x, sg.mainDeckY, sg.z);

  const hullMesh = new THREE.Mesh(shipHullGeo, airshipTimberMat);
  hullMesh.position.set(0, -1.65, 0);
  const mainDeckMesh = new THREE.Mesh(shipMainDeckGeo, celestialIvoryMat);
  mainDeckMesh.position.set(0, -0.21, 0);
  const quarterDeckMesh = new THREE.Mesh(shipQuarterDeckGeo, airshipTimberMat);
  quarterDeckMesh.position.set(0, 1.0, -11.3);
  const quarterDeckTop = new THREE.Mesh(shipQuarterDeckGeo, celestialGoldMat);
  quarterDeckTop.scale.set(1.02, 0.12, 1.02);
  quarterDeckTop.position.set(0, 1.98, -11.3);
  skyGalleonGroup.add(hullMesh, mainDeckMesh, quarterDeckMesh, quarterDeckTop);

  for (let s = 0; s <= 6; s++) {
    const stT = s / 6;
    const stepMesh = new THREE.Mesh(bridgePlankGeo, celestialGoldMat);
    stepMesh.scale.set(0.68, 0.85, 0.55);
    stepMesh.position.set(0, stT * 2.0, -6.0 - stT * 2.5);
    skyGalleonGroup.add(stepMesh);
  }

  for (const side of [-1, 1] as const) {
    const bulwark = new THREE.Mesh(shipBulwarkGeo, celestialGoldMat);
    bulwark.position.set(side * 4.55, 0.55, 0);
    skyGalleonGroup.add(bulwark);

    for (const wz of [-6.5, 6.5] as const) {
      const wingFin = new THREE.Mesh(shipWingFinGeo, celestialGoldMat);
      wingFin.position.set(side * 8.0, -0.65, wz);
      wingFin.rotation.z = side * 0.14;
      const wingCrys = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
      wingCrys.scale.setScalar(0.85);
      wingCrys.position.set(side * 11.4, -0.45, wz);
      const cannon = new THREE.Mesh(shipCannonGeo, clockworkBronzeMat);
      cannon.position.set(side * 4.6, 0.95, wz * 0.65);
      skyGalleonGroup.add(wingFin, wingCrys, cannon);
      floatingCrystals.push(wingCrys);
    }
  }

  for (const mz of [-3.5, 6.8] as const) {
    const mast = new THREE.Mesh(shipMastGeo, celestialGoldMat);
    mast.position.set(0, 9.25, mz);
    const sailUpper = new THREE.Mesh(shipSailGeo, royalSilkBlueMat);
    sailUpper.position.set(0, 10.6, mz + 0.35);
    const sailTrim = new THREE.Mesh(shipSailGeo, celestialGoldMat);
    sailTrim.scale.set(1.04, 0.14, 0.8);
    sailTrim.position.set(0, 15.2, mz + 0.35);
    const mastBeacon = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
    mastBeacon.scale.setScalar(0.95);
    mastBeacon.position.set(0, 19.2, mz);
    skyGalleonGroup.add(mast, sailUpper, sailTrim, mastBeacon);
    floatingCrystals.push(mastBeacon);
  }

  // Captain's Coffer Chest (`chest-sky-galleon-captain`) & Helm Wheel on Quarterdeck
  const helmWheel = new THREE.Mesh(armillaryRingGeo, celestialGoldMat);
  helmWheel.scale.setScalar(0.38);
  helmWheel.position.set(0, 3.25, -9.8);
  const capChestBase = new THREE.Mesh(chestBoxGeo, starlightSilverMat);
  capChestBase.position.set(0, 2.52, -11.5);
  const capChestTop = new THREE.Mesh(chestLidGeo, celestialGoldMat);
  capChestTop.position.set(0, 2.95, -11.5);
  skyGalleonGroup.add(helmWheel, capChestBase, capChestTop);

  const shipPropellers: THREE.Group[] = [];
  for (const side of [-1, 1] as const) {
    const propGroup = new THREE.Group();
    propGroup.position.set(side * 2.8, 0.25, -14.8);
    const bladeA = new THREE.Mesh(shipPropellerBladeGeo, celestialGoldMat);
    const bladeB = new THREE.Mesh(shipPropellerBladeGeo, celestialGoldMat);
    bladeB.rotation.z = Math.PI / 2;
    const propHub = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
    propHub.scale.setScalar(0.45);
    propGroup.add(bladeA, bladeB, propHub);
    skyGalleonGroup.add(propGroup);
    shipPropellers.push(propGroup);
  }
  floatingIslandsGroup.add(skyGalleonGroup);

  // ==========================================================================
  // 8. REALM 5 (NE, 828, -88, y=88.0m):
  //    FRACTURED OBSIDIAN STORM CITADEL, TESLA COILS & 16M WINGED THUNDER-TITAN
  // ==========================================================================
  const stormIsl = FLOATING_BLOOMING_ISLANDS[4];
  const stormCitadelGroup = new THREE.Group();
  stormCitadelGroup.position.set(stormIsl.x, stormIsl.deckY, stormIsl.z);

  const stormCraterDeckGeo = new THREE.CylinderGeometry(stormIsl.radius, stormIsl.radius * 0.72, 2.4, 7);
  const stormJaggedUnderGeo = new THREE.ConeGeometry(stormIsl.radius * 0.78, 22.0, 7);
  stormJaggedUnderGeo.rotateX(Math.PI);
  perturbGeometryVertices(stormJaggedUnderGeo, 1.4, 0.45);
  const teslaPylonGeo = new THREE.BoxGeometry(1.6, 11.5, 1.6);
  const teslaRingGeo = new THREE.TorusGeometry(1.65, 0.18, 8, 16);
  teslaRingGeo.rotateX(Math.PI / 2);
  const titanTorsoGeo = new THREE.CylinderGeometry(1.75, 1.25, 5.2, 8);
  const titanHeadGeo = new THREE.OctahedronGeometry(1.25, 1);
  const titanWingBladeGeo = new THREE.BoxGeometry(6.4, 1.55, 0.22);

  disposableGeometries.push(
    stormCraterDeckGeo,
    stormJaggedUnderGeo,
    teslaPylonGeo,
    teslaRingGeo,
    titanTorsoGeo,
    titanHeadGeo,
    titanWingBladeGeo
  );

  const stormDeck = new THREE.Mesh(stormCraterDeckGeo, obsidianMat);
  stormDeck.position.set(0, -1.2, 0);
  stormDeck.receiveShadow = !isSoftwareGl;
  const stormPlasmaInlay = new THREE.Mesh(stormCraterDeckGeo, stormVioletCrystalMat);
  stormPlasmaInlay.scale.set(0.76, 0.18, 0.76);
  stormPlasmaInlay.position.set(0, -0.15, 0);
  const stormUnderSpire = new THREE.Mesh(stormJaggedUnderGeo, obsidianMat);
  stormUnderSpire.position.set(0, -12.0, 0);
  stormCitadelGroup.add(stormDeck, stormPlasmaInlay, stormUnderSpire);

  // 8 Towering Obsidian & Violet-Plasma Tesla-Coil Lightning Pylons around the Storm Rim
  for (let o = 0; o < 8; o++) {
    const oAng = (o / 8) * Math.PI * 2 + Math.PI / 8;
    const ox = Math.cos(oAng) * (stormIsl.radius - 2.6);
    const oz = Math.sin(oAng) * (stormIsl.radius - 2.6);
    const obelisk = new THREE.Mesh(teslaPylonGeo, obsidianMat);
    obelisk.position.set(ox, 5.75, oz);
    const coilA = new THREE.Mesh(teslaRingGeo, celestialGoldMat);
    coilA.position.set(ox, 8.5, oz);
    const coilB = new THREE.Mesh(teslaRingGeo, stormVioletCrystalMat);
    coilB.position.set(ox, 10.4, oz);
    const obeliskCrown = new THREE.Mesh(crystalPrismGeo, stormVioletCrystalMat);
    obeliskCrown.scale.set(1.1, 1.75, 1.1);
    obeliskCrown.position.set(ox, 13.2, oz);
    stormCitadelGroup.add(obelisk, coilA, coilB, obeliskCrown);
    floatingCrystals.push(obeliskCrown);
  }

  // Throne of Thunder & `chest-sky-storm-citadel` (at 828, 88.0, -96.5 -> localZ = -8.5)
  const stormAltar = new THREE.Mesh(bedDaisGeo, obsidianMat);
  stormAltar.position.set(0, 0.22, -8.5);
  const stormChestBase = new THREE.Mesh(chestBoxGeo, starlightSilverMat);
  stormChestBase.position.set(0, 0.75, -8.5);
  const stormChestTop = new THREE.Mesh(chestLidGeo, celestialGoldMat);
  stormChestTop.position.set(0, 1.18, -8.5);
  stormCitadelGroup.add(stormAltar, stormChestBase, stormChestTop);

  // Colossal 16-Meter Animated Winged Thunder-Titan at (828, 88.0, -92.5 -> localZ = -4.5)
  const skyTitanGroup = new THREE.Group();
  skyTitanGroup.position.set(0, 0.4, -4.5);
  const titanPedestal = new THREE.Mesh(bedDaisGeo, celestialGoldMat);
  titanPedestal.scale.set(1.4, 2.4, 1.4);
  titanPedestal.position.set(0, 0.4, 0);
  const titanTorso = new THREE.Mesh(titanTorsoGeo, obsidianMat);
  titanTorso.position.set(0, 5.2, 0);
  const titanHead = new THREE.Mesh(titanHeadGeo, celestialGoldMat);
  titanHead.position.set(0, 8.8, 0);
  const titanCrown = new THREE.Mesh(crystalPrismGeo, stormVioletCrystalMat);
  titanCrown.scale.set(1.1, 1.9, 1.1);
  titanCrown.position.set(0, 11.4, 0);
  const titanCore = new THREE.Mesh(crystalPrismGeo, aetherCyanCrystalMat);
  titanCore.scale.setScalar(1.35);
  titanCore.position.set(0, 5.6, 1.45);
  skyTitanGroup.add(titanPedestal, titanTorso, titanHead, titanCrown, titanCore);

  const titanWings: THREE.Group[] = [];
  for (const side of [-1, 1] as const) {
    const wPivot = new THREE.Group();
    wPivot.position.set(side * 1.5, 6.8, -0.4);
    for (let f = 0; f < 3; f++) {
      const feather = new THREE.Mesh(
        titanWingBladeGeo,
        f % 2 === 0 ? celestialGoldMat : stormVioletCrystalMat
      );
      feather.position.set(side * (3.1 + f * 0.9), 0.9 - f * 1.05, f * 0.08);
      feather.rotation.z = side * (0.32 - f * 0.2);
      wPivot.add(feather);
    }
    skyTitanGroup.add(wPivot);
    titanWings.push(wPivot);
  }
  stormCitadelGroup.add(skyTitanGroup);
  floatingIslandsGroup.add(stormCitadelGroup);

  // ==========================================================================
  // 9. REALM 6 (SW, 734, 32, y=76.0m):
  //    CRIMSON-GOLD PHOENIX SPIRE, FLAMING NEST & CASCADING GOLDEN SKY-FALLS
  // ==========================================================================
  const phoenixIsl = FLOATING_BLOOMING_ISLANDS[5];
  const phoenixAerieGroup = new THREE.Group();
  phoenixAerieGroup.position.set(phoenixIsl.x, phoenixIsl.deckY, phoenixIsl.z);

  const phoenixStarDeckGeo = new THREE.CylinderGeometry(phoenixIsl.radius, phoenixIsl.radius * 0.78, 2.0, 9);
  const phoenixSpireUnderGeo = new THREE.ConeGeometry(phoenixIsl.radius * 0.85, 21.0, 9);
  phoenixSpireUnderGeo.rotateX(Math.PI);
  const phoenixNestGeo = new THREE.TorusGeometry(4.4, 0.9, 10, 24);
  phoenixNestGeo.rotateX(Math.PI / 2);
  const phoenixEggGeo = new THREE.SphereGeometry(0.82, 14, 12);
  phoenixEggGeo.scale(1.0, 1.45, 1.0);
  const phoenixBodyGeo = new THREE.ConeGeometry(1.05, 4.2, 12);
  phoenixBodyGeo.rotateX(Math.PI / 2);
  const phoenixWingGeo = new THREE.BoxGeometry(5.4, 0.18, 2.0);
  const aerieWaterfallGeo = new THREE.CylinderGeometry(1.25, 1.85, 24.0, 16, 1, true);

  disposableGeometries.push(
    phoenixStarDeckGeo,
    phoenixSpireUnderGeo,
    phoenixNestGeo,
    phoenixEggGeo,
    phoenixBodyGeo,
    phoenixWingGeo,
    aerieWaterfallGeo
  );

  const phoenixDeck = new THREE.Mesh(phoenixStarDeckGeo, phoenixCrimsonRockMat);
  phoenixDeck.position.set(0, -1.0, 0);
  phoenixDeck.receiveShadow = !isSoftwareGl;
  const phoenixGoldRim = new THREE.Mesh(phoenixStarDeckGeo, celestialGoldMat);
  phoenixGoldRim.scale.set(1.03, 0.24, 1.03);
  phoenixGoldRim.position.set(0, -0.15, 0);
  const phoenixUnder = new THREE.Mesh(phoenixSpireUnderGeo, phoenixCrimsonRockMat);
  phoenixUnder.position.set(0, -11.5, 0);
  phoenixAerieGroup.add(phoenixDeck, phoenixGoldRim, phoenixUnder);

  // 4 Crimson-Amber Flame Crystal Trees on the Phoenix Aerie
  for (const [tx, tz] of [
    [-11.5, -6.5],
    [11.5, -6.5],
    [-11.5, 7.5],
    [11.5, 7.5],
  ] as const) {
    const fTree = new THREE.Group();
    fTree.position.set(tx, 0, tz);
    const fTrunk = new THREE.Mesh(flutedPillarGeo, clockworkBronzeMat);
    fTrunk.scale.set(0.65, 0.9, 0.65);
    fTrunk.position.set(0, 2.8, 0);
    const fCrown = new THREE.Mesh(crystalPrismGeo, phoenixAmberCrystalMat);
    fCrown.scale.set(1.9, 1.6, 1.9);
    fCrown.position.set(0, 6.5, 0);
    fTree.add(fTrunk, fCrown);
    phoenixAerieGroup.add(fTree);
  }

  // Golden Flame Nest, 3 Glowing Phoenix Eggs & `chest-sky-phoenix-aerie` (localZ = 6.5)
  const phoenixNest = new THREE.Mesh(phoenixNestGeo, celestialGoldMat);
  phoenixNest.position.set(0, 0.55, 1.5);
  phoenixAerieGroup.add(phoenixNest);
  for (let e = 0; e < 3; e++) {
    const eAng = (e / 3) * Math.PI * 2;
    const egg = new THREE.Mesh(phoenixEggGeo, e === 0 ? radiantSunGoldMat : phoenixAmberCrystalMat);
    egg.position.set(Math.cos(eAng) * 1.5, 1.18, 1.5 + Math.sin(eAng) * 1.5);
    phoenixAerieGroup.add(egg);
  }

  const phoenixChestBase = new THREE.Mesh(chestBoxGeo, starlightSilverMat);
  phoenixChestBase.position.set(0, 0.52, 6.5);
  const phoenixChestTop = new THREE.Mesh(chestLidGeo, celestialGoldMat);
  phoenixChestTop.position.set(0, 0.95, 6.5);
  phoenixAerieGroup.add(phoenixChestBase, phoenixChestTop);

  // Articulated Animated Celestial Golden Phoenix Hovering Above the Nest
  const celestialPhoenixGroup = new THREE.Group();
  celestialPhoenixGroup.position.set(0, 5.2, 1.5);
  const phBody = new THREE.Mesh(phoenixBodyGeo, radiantSunGoldMat);
  const phCrest = new THREE.Mesh(crystalPrismGeo, phoenixAmberCrystalMat);
  phCrest.scale.set(0.45, 0.95, 0.45);
  phCrest.position.set(0, 1.15, 1.55);
  phCrest.rotation.x = 0.45;
  const phTail = new THREE.Mesh(crystalPrismGeo, radiantSunGoldMat);
  phTail.scale.set(0.65, 1.95, 0.35);
  phTail.position.set(0, 0.2, -2.9);
  phTail.rotation.x = -Math.PI * 0.42;
  celestialPhoenixGroup.add(phBody, phCrest, phTail);

  const phoenixWings: THREE.Group[] = [];
  for (const side of [-1, 1] as const) {
    const wGroup = new THREE.Group();
    wGroup.position.set(side * 0.65, 0.2, 0.2);
    const innerWing = new THREE.Mesh(phoenixWingGeo, radiantSunGoldMat);
    innerWing.position.set(side * 2.6, 0, 0);
    const outerTip = new THREE.Mesh(phoenixWingGeo, phoenixAmberCrystalMat);
    outerTip.scale.set(0.68, 0.9, 0.72);
    outerTip.position.set(side * 4.8, 0.15, -0.35);
    wGroup.add(innerWing, outerTip);
    celestialPhoenixGroup.add(wGroup);
    phoenixWings.push(wGroup);
  }
  phoenixAerieGroup.add(celestialPhoenixGroup);

  // Twin Cascading Golden-Cyan Sky-Waterfalls off the Southern Cliffs
  for (const side of [-1, 1] as const) {
    const aerieWf = new THREE.Mesh(aerieWaterfallGeo, liquidGoldStreamMat);
    aerieWf.position.set(side * 6.5, -12.0, phoenixIsl.radius - 1.2);
    phoenixAerieGroup.add(aerieWf);
  }
  floatingIslandsGroup.add(phoenixAerieGroup);

  // ==========================================================================
  // 10. REALM 7 (ZENITH, 856, -52, y=104.0m):
  //     8-POINTED PURE GOLD STAR-CROWN & 16M ROTATING PLANETARY ORRERY
  // ==========================================================================
  const zenithIsl = FLOATING_BLOOMING_ISLANDS[6];
  const zenithGroup = new THREE.Group();
  zenithGroup.position.set(zenithIsl.x, zenithIsl.deckY, zenithIsl.z);

  const zenithCrownDeckGeo = new THREE.CylinderGeometry(zenithIsl.radius, zenithIsl.radius * 0.86, 1.5, 8);
  const zenithLightPyramidGeo = new THREE.ConeGeometry(zenithIsl.radius * 0.78, 18.0, 8);
  zenithLightPyramidGeo.rotateX(Math.PI);
  const zenithRingOuterGeo = new THREE.TorusGeometry(7.4, 0.32, 12, 42);
  const zenithRingMidGeo = new THREE.TorusGeometry(5.5, 0.26, 12, 36);
  const zenithRingInnerGeo = new THREE.TorusGeometry(3.6, 0.22, 10, 32);
  const zenithSunGeo = new THREE.SphereGeometry(1.55, 18, 16);

  disposableGeometries.push(
    zenithCrownDeckGeo,
    zenithLightPyramidGeo,
    zenithRingOuterGeo,
    zenithRingMidGeo,
    zenithRingInnerGeo,
    zenithSunGeo
  );

  const zenithDeck = new THREE.Mesh(zenithCrownDeckGeo, celestialGoldMat);
  zenithDeck.position.set(0, -0.75, 0);
  zenithDeck.receiveShadow = !isSoftwareGl;
  const zenithIvoryInlay = new THREE.Mesh(zenithCrownDeckGeo, celestialIvoryMat);
  zenithIvoryInlay.scale.set(0.84, 0.25, 0.84);
  zenithIvoryInlay.position.set(0, -0.08, 0);
  const zenithLightUnder = new THREE.Mesh(zenithLightPyramidGeo, radiantSunGoldMat);
  zenithLightUnder.position.set(0, -9.8, 0);
  zenithGroup.add(zenithDeck, zenithIvoryInlay, zenithLightUnder);

  for (let p = 0; p < 8; p++) {
    const pAng = (p / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(pAng) * (zenithIsl.radius - 2.2);
    const pz = Math.sin(pAng) * (zenithIsl.radius - 2.2);
    const col = new THREE.Mesh(flutedPillarGeo, celestialGoldMat);
    col.position.set(px, 3.1, pz);
    const star = new THREE.Mesh(crystalPrismGeo, p % 2 === 0 ? radiantSunGoldMat : aetherCyanCrystalMat);
    star.scale.setScalar(0.85);
    star.position.set(px, 7.2, pz);
    zenithGroup.add(col, star);
    floatingCrystals.push(star);
  }

  const zenithOrreryGroup = new THREE.Group();
  zenithOrreryGroup.position.set(0, 8.2, 0);
  const zRingOuter = new THREE.Mesh(zenithRingOuterGeo, celestialGoldMat);
  const zRingMid = new THREE.Mesh(zenithRingMidGeo, starlightSilverMat);
  const zRingInner = new THREE.Mesh(zenithRingInnerGeo, radiantSunGoldMat);
  const zSunCore = new THREE.Mesh(zenithSunGeo, radiantSunGoldMat);
  zenithOrreryGroup.add(zRingOuter, zRingMid, zRingInner, zSunCore);
  zenithGroup.add(zenithOrreryGroup);

  const zenithAltar = new THREE.Mesh(bedDaisGeo, celestialIvoryMat);
  zenithAltar.position.set(0, 0.22, -6.5);
  const zenithChestBase = new THREE.Mesh(chestBoxGeo, starlightSilverMat);
  zenithChestBase.position.set(0, 0.72, -6.5);
  const zenithChestTop = new THREE.Mesh(chestLidGeo, celestialGoldMat);
  zenithChestTop.position.set(0, 1.15, -6.5);
  zenithGroup.add(zenithAltar, zenithChestBase, zenithChestTop);

  floatingIslandsGroup.add(zenithGroup);

  // ==========================================================================
  // 11. 40 WALKABLE & SINKING SKY CLOUDS + 12 GOLDEN CLOUD-RUNNER RINGS
  // ==========================================================================
  const cloudRimRingGeo = new THREE.TorusGeometry(0.95, 0.055, 8, 24);
  cloudRimRingGeo.rotateX(Math.PI / 2);
  const stormBoltGeo = new THREE.ConeGeometry(0.48, 5.2, 5);
  const runnerRingOuterGeo = new THREE.TorusGeometry(2.2, 0.15, 10, 28);
  const runnerRingInnerGeo = new THREE.OctahedronGeometry(0.45, 0);

  const cloudWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.42,
    roughness: 0.6,
  });
  const cloudGoldenMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.75,
    roughness: 0.35,
    metalness: 0.28,
  });
  const cloudBouncyMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.75,
    roughness: 0.42,
  });
  const cloudStormMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x4c1d95,
    emissiveIntensity: 0.55,
    roughness: 0.68,
  });
  const stormLightningMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
  });

  disposableGeometries.push(
    cloudRimRingGeo,
    stormBoltGeo,
    runnerRingOuterGeo,
    runnerRingInnerGeo
  );
  disposableMaterials.push(
    cloudWhiteMat,
    cloudGoldenMat,
    cloudBouncyMat,
    cloudStormMat,
    stormLightningMat
  );

  interface IAnimatedSkyCloudVisual {
    group: THREE.Group;
    rimMesh: THREE.Mesh;
    boltMesh: THREE.Mesh | null;
  }

  const skyCloudVisuals: IAnimatedSkyCloudVisual[] = [];
  const puffOffsets: ReadonlyArray<readonly [number, number, number, number, number]> = [
    [0.0, -0.18, 0.0, 0.94, 0.98],
    [0.48, -0.25, 0.24, 0.66, 0.85],
    [-0.48, -0.25, -0.24, 0.66, 0.85],
    [0.25, -0.28, -0.46, 0.62, 0.8],
    [-0.25, -0.28, 0.46, 0.62, 0.8],
    [0.0, -0.54, 0.0, 0.74, 0.88],
  ];

  for (let i = 0; i < SKY_WALKABLE_CLOUDS.length; i++) {
    const cDef = SKY_WALKABLE_CLOUDS[i];
    const cGroup = new THREE.Group();
    cGroup.position.set(cDef.x, cDef.y, cDef.z);

    const puffMat =
      cDef.kind === 'golden'
        ? cloudGoldenMat
        : cDef.kind === 'bouncy'
          ? cloudBouncyMat
          : cDef.kind === 'storm'
            ? cloudStormMat
            : cloudWhiteMat;

    for (let p = 0; p < puffOffsets.length; p++) {
      const [ox, oy, oz, rScale, yScale] = puffOffsets[p];
      const puff = new THREE.Mesh(cloudPuffGeo, puffMat);
      puff.position.set(ox * cDef.radiusX, oy, oz * cDef.radiusZ);
      puff.scale.set(cDef.radiusX * rScale, yScale * 1.38, cDef.radiusZ * rScale);
      cGroup.add(puff);
    }

    const rimMat =
      cDef.kind === 'golden'
        ? radiantSunGoldMat
        : cDef.kind === 'storm'
          ? stormVioletCrystalMat
          : aetherCyanCrystalMat;
    const rimMesh = new THREE.Mesh(cloudRimRingGeo, rimMat);
    rimMesh.position.set(0, 0.06, 0);
    rimMesh.scale.set(cDef.radiusX, cDef.radiusZ, 1.0);
    cGroup.add(rimMesh);

    let boltMesh: THREE.Mesh | null = null;
    if (cDef.kind === 'storm') {
      boltMesh = new THREE.Mesh(stormBoltGeo, stormLightningMat);
      boltMesh.position.set(0, 1.9, 0);
      boltMesh.visible = false;
      cGroup.add(boltMesh);
    }

    floatingIslandsGroup.add(cGroup);
    skyCloudVisuals.push({ group: cGroup, rimMesh, boltMesh });
  }

  const runnerRingVisuals: { group: THREE.Group; outer: THREE.Mesh; inner: THREE.Mesh; baseY: number }[] = [];
  for (let r = 0; r < SKY_RUNNER_RINGS.length; r++) {
    const rDef = SKY_RUNNER_RINGS[r];
    const rGroup = new THREE.Group();
    rGroup.position.set(rDef.x, rDef.y, rDef.z);
    rGroup.rotation.y = rDef.yaw;

    const outer = new THREE.Mesh(runnerRingOuterGeo, radiantSunGoldMat);
    const inner = new THREE.Mesh(runnerRingInnerGeo, aetherCyanCrystalMat);
    rGroup.add(outer, inner);
    floatingIslandsGroup.add(rGroup);
    runnerRingVisuals.push({ group: rGroup, outer, inner, baseY: rDef.y });
  }

  // ==========================================================================
  // 12. CELESTIAL WIND-RING & VOLCANO THERMAL SUPER-JUMP LAUNCH PADS
  // ==========================================================================
  const geyserBaseGeo = new THREE.CylinderGeometry(2.35, 2.65, 0.24, 8);
  const geyserRingGeo = new THREE.TorusGeometry(1.85, 0.11, 8, 24);
  geyserRingGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(geyserBaseGeo, geyserRingGeo);

  const animatedGeyserRings: { mesh: THREE.Mesh; baseY: number; ringIndex: number }[] = [];
  for (let g = 0; g < SKY_WIND_GEYSERS.length; g++) {
    const geyser = SKY_WIND_GEYSERS[g];
    const isVolcanoGeyser = geyser.theme === 'volcano';
    const padBase = new THREE.Mesh(geyserBaseGeo, isVolcanoGeyser ? obsidianMat : celestialGoldMat);
    padBase.position.set(geyser.x, geyser.y + 0.08, geyser.z);
    scene.add(padBase);

    for (let r = 0; r < 3; r++) {
      const ringMesh = new THREE.Mesh(
        geyserRingGeo,
        isVolcanoGeyser ? magmaCrystalMat : r % 2 === 0 ? aetherCyanCrystalMat : radiantSunGoldMat
      );
      ringMesh.position.set(geyser.x, geyser.y + 0.45 + r * 0.65, geyser.z);
      ringMesh.scale.setScalar(1.0 - r * 0.16);
      scene.add(ringMesh);
      distanceCulledObjects.push({
        obj: ringMesh,
        cx: geyser.x,
        cz: geyser.z,
        radius: 12,
      });
      animatedGeyserRings.push({ mesh: ringMesh, baseY: geyser.y, ringIndex: r + g * 3 });
    }
  }

  scene.add(floatingIslandsGroup);
  distanceCulledObjects.push({
    obj: floatingIslandsGroup,
    cx: mainIslX + 25.0,
    cz: mainIslZ,
    radius: 155,
  });

  return {
    floatingIslandsGroup,
    updateCelestialSkyArchipelago: (elapsedTime: number, playerX: number, playerZ: number) => {
      if (isWithinViewDistance(mainIslX + 25.0, mainIslZ, playerX, playerZ, 205, VIEW_DISTANCE)) {
        aetherCyanCrystalMat.emissiveIntensity = 2.0 + Math.sin(elapsedTime * 2.5) * 0.45;
        stormVioletCrystalMat.emissiveIntensity = 2.1 + Math.cos(elapsedTime * 3.2) * 0.5;

        // Rotate Ground Stargate Inner Ring & Rising Aether-Vortex Beam Rings
        groundStargateInner.rotation.z = elapsedTime * 0.85;
        vortexGoldRibbonMesh.rotation.y = elapsedTime * 1.25;
        for (let r = 0; r < vortexRings.length; r++) {
          const riseT = (elapsedTime * 0.38 + r / vortexRings.length) % 1.0;
          const vRing = vortexRings[r];
          vRing.position.y = wfFootY + riseT * wfHeight;
          vRing.rotation.y = elapsedTime * (r % 2 === 0 ? 1.5 : -1.5);
          vRing.scale.setScalar(0.85 + Math.sin(riseT * Math.PI) * 0.35);
        }

        // Rotate Metropolis 26m Spire Cathedral Halos & Under-Citadel Aether Turbine horizontally in XZ plane
        metroAetherRing.rotation.y = elapsedTime * 0.45;
        for (let h = 0; h < cathedralHalos.length; h++) {
          cathedralHalos[h].rotation.y = elapsedTime * (h % 2 === 0 ? 0.9 : -1.2);
          cathedralHalos[h].rotation.x = Math.sin(elapsedTime * 0.7 + h) * 0.22;
        }
        hollowHeartCrystal.rotation.y = elapsedTime * 1.1;

        // Animate Eastern Chrono-Observatory Armillary Sphere
        armRing1.rotation.y = elapsedTime * 0.75;
        armRing1.rotation.x = Math.sin(elapsedTime * 0.45) * 0.45;
        armRing2.rotation.z = -elapsedTime * 1.05;
        armCore.rotation.y = elapsedTime * 1.6;

        // Animate Walkable & Sinking Sky Clouds
        const cloudStates = getSkyWalkableCloudStates();
        for (let c = 0; c < skyCloudVisuals.length; c++) {
          const vis = skyCloudVisuals[c];
          const st = cloudStates[c];
          if (!st) continue;
          const bob = Math.sin(elapsedTime * 1.8 + c * 0.7) * 0.08;
          vis.group.position.set(st.currentX, st.currentY + bob, st.currentZ);
          if (st.dissolved) {
            vis.group.scale.set(0.14, 0.06, 0.14);
          } else {
            const sinkRatio = Math.min(1, st.sinkOffset / 2.2);
            const xzStretch = 1.0 + sinkRatio * 0.18;
            const ySquash = Math.max(0.32, 1.0 - sinkRatio * 0.58);
            vis.group.scale.set(xzStretch, ySquash, xzStretch);
          }
          if (vis.boltMesh) {
            vis.boltMesh.visible = st.stormWarning || st.stormStrike;
            if (vis.boltMesh.visible) {
              vis.boltMesh.scale.setScalar(st.stormStrike ? 1.35 : 0.65);
              vis.boltMesh.rotation.y = elapsedTime * 12.0 + c;
            }
          }
        }

        // Animate 12 Golden Cloud-Runner Rings
        for (let r = 0; r < runnerRingVisuals.length; r++) {
          const rv = runnerRingVisuals[r];
          rv.outer.rotation.z = elapsedTime * 1.4 + r * 0.5;
          rv.inner.rotation.y = -elapsedTime * 2.6 + r;
          rv.inner.rotation.x = elapsedTime * 1.8;
          rv.group.position.y = rv.baseY + Math.sin(elapsedTime * 2.2 + r * 0.6) * 0.22;
        }

        // Animate Royal Sky-Galleon bobbing & stern ether-propellers
        skyGalleonGroup.position.y = sg.mainDeckY + Math.sin(elapsedTime * 1.2) * 0.12;
        skyGalleonGroup.rotation.z = Math.sin(elapsedTime * 0.9) * 0.015;
        for (let p = 0; p < shipPropellers.length; p++) {
          shipPropellers[p].rotation.z = elapsedTime * (p === 0 ? 6.5 : -6.5);
        }

        // Animate 16m Storm Citadel Winged Thunder-Titan
        for (let w = 0; w < titanWings.length; w++) {
          const sign = w === 0 ? -1 : 1;
          titanWings[w].rotation.y = sign * (0.25 + Math.sin(elapsedTime * 1.6) * 0.22);
          titanWings[w].rotation.z = sign * Math.sin(elapsedTime * 1.6) * 0.12;
        }

        // Animate Celestial Golden Phoenix soaring & flapping
        celestialPhoenixGroup.position.y = 5.2 + Math.sin(elapsedTime * 2.4) * 0.55;
        celestialPhoenixGroup.rotation.y = Math.sin(elapsedTime * 0.55) * 0.35;
        for (let w = 0; w < phoenixWings.length; w++) {
          const sign = w === 0 ? -1 : 1;
          phoenixWings[w].rotation.z = sign * Math.sin(elapsedTime * 4.8) * 0.48;
        }

        // Animate 16m Crown Zenith Planetary Orrery
        zRingOuter.rotation.y = elapsedTime * 0.55;
        zRingOuter.rotation.x = Math.sin(elapsedTime * 0.35) * 0.45;
        zRingMid.rotation.z = -elapsedTime * 0.85;
        zRingMid.rotation.x = Math.cos(elapsedTime * 0.45) * 0.55;
        zRingInner.rotation.y = -elapsedTime * 1.35;
        zRingInner.rotation.z = elapsedTime * 0.95;

        for (let c = 0; c < floatingCrystals.length; c++) {
          floatingCrystals[c].rotation.y = elapsedTime * 0.85 + c * 0.5;
        }
      }

      // Animate Celestial Wind-Ring & Thermal Launch Pads
      for (let i = 0; i < animatedGeyserRings.length; i++) {
        const item = animatedGeyserRings[i];
        const cycle = (elapsedTime * 0.65 + (item.ringIndex % 3) * 0.33) % 1.0;
        item.mesh.position.y = item.baseY + 0.35 + cycle * 2.2;
        item.mesh.scale.setScalar(1.05 - cycle * 0.45);
        item.mesh.rotation.y = elapsedTime * 1.8 + item.ringIndex;
      }
    },
  };
}
