// ============================================================================
// MODULE: World / Models / Celestial Sky Ascent & Skybound Isles
// DESIGN: Two parts. The waterfall climb (ground stargate dock, aether-vortex beam and the
//         57 helical steps) is built here unchanged. The archipelago it leads to, the
//         Skybound Isles, is built by `skyboundIslesBuilder.ts` and only animated from here.
// SUMMARY: Builds the climb, the wind-ring geysers (climb foot and volcano), the
//          Skybound Isles group and the Sky Harbor hub, and returns one per-frame update for all of them.
// ============================================================================

import * as THREE from 'three';
import {
  FLOATING_ISLAND_STAIR_POS,
  FLOATING_WATERFALL_STEP_ISLANDS,
  SKY_WIND_GEYSERS,
  SKY_HARBOR,
  isWithinViewDistance,
  VIEW_DISTANCE,
} from '../terrainMath';
import type { IWorldModelBuildContext } from './types';
import { buildSkyboundIslesBlockout } from './skyboundIslesBuilder';
import { buildSkyHarbor } from './skyHarborBuilder';
import { buildFloatingGarden } from './floatingGardenBuilder';
import { buildObservatory } from './observatoryBuilder';
import { buildCrystalIsles } from './crystalIslesBuilder';
import { buildAncientRuins } from './ancientRuinsBuilder';
import { buildWindCores } from './windCoresBuilder';
import { buildSkyPickups } from './skyPickupsBuilder';
import { buildStormFruit } from './stormFruitBuilder';

export interface ICelestialSkyArchipelagoBuildResult {
  readonly floatingIslandsGroup: THREE.Group;
  readonly updateCelestialSkyArchipelago: (
    elapsedTime: number,
    playerX: number,
    playerZ: number
  ) => void;
}

/** Radius (m) around Sky Harbor inside which the archipelago is animated. */
const ARCHIPELAGO_ANIMATION_RADIUS = 260;
/** Radius (m) of the archipelago group for distance culling. */
const ARCHIPELAGO_CULL_RADIUS = 210;

export function buildCelestialSkyArchipelagoModels(
  ctx: IWorldModelBuildContext,
  obsidianMat: THREE.MeshStandardMaterial,
  magmaCrystalMat: THREE.MeshStandardMaterial
): ICelestialSkyArchipelagoBuildResult {
  const { scene, textures, isSoftwareGl, disposableGeometries, disposableMaterials, distanceCulledObjects } = ctx;

  const floatingIslandsGroup = new THREE.Group();

  // ==========================================================================
  // 1. CLIMB MATERIALS & SHARED GEOMETRY
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

  disposableMaterials.push(
    astralLapisMat,
    celestialIvoryMat,
    celestialGoldMat,
    radiantSunGoldMat,
    aetherCyanCrystalMat,
    aetherBeamCoreMat,
    liquidGoldStreamMat
  );

  const crystalPrismGeo = new THREE.OctahedronGeometry(1.0, 0);
  crystalPrismGeo.scale(0.75, 2.4, 0.75);
  const cloudPuffGeo = new THREE.IcosahedronGeometry(1.0, 2);
  cloudPuffGeo.scale(1.0, 0.48, 1.0);
  disposableGeometries.push(crystalPrismGeo, cloudPuffGeo);

  const floatingCrystals: THREE.Mesh[] = [];

  // ==========================================================================
  // 2. GROUND BASE & ASCENT: ASTRAL STARGATE DOCK & HELICAL CLOUD-CRYSTAL TOWER
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
  // 4. WIND-RING GEYSER AT THE CLIMB FOOT & VOLCANO THERMAL LAUNCH PAD
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

  // ==========================================================================
  // 3. SKYBOUND ISLES ARCHIPELAGO (islands, clouds, wind currents)
  // ==========================================================================
  const skybound = buildSkyboundIslesBlockout(ctx);
  floatingIslandsGroup.add(skybound.group);
  const skyHarbor = buildSkyHarbor(ctx);
  floatingIslandsGroup.add(skyHarbor.group);
  const floatingGarden = buildFloatingGarden(ctx);
  floatingIslandsGroup.add(floatingGarden.group);
  const observatory = buildObservatory(ctx);
  floatingIslandsGroup.add(observatory.group);
  const crystalIsles = buildCrystalIsles(ctx);
  floatingIslandsGroup.add(crystalIsles.group);
  const ancientRuins = buildAncientRuins(ctx);
  floatingIslandsGroup.add(ancientRuins.group);
  const windCores = buildWindCores(ctx);
  floatingIslandsGroup.add(windCores.group);
  const skyPickups = buildSkyPickups(ctx);
  floatingIslandsGroup.add(skyPickups.group);
  const stormFruit = buildStormFruit(ctx);
  floatingIslandsGroup.add(stormFruit.group);

  scene.add(floatingIslandsGroup);
  distanceCulledObjects.push({
    obj: floatingIslandsGroup,
    cx: SKY_HARBOR.x + 20.0,
    cz: SKY_HARBOR.z - 20.0,
    radius: ARCHIPELAGO_CULL_RADIUS,
  });

  return {
    floatingIslandsGroup,
    updateCelestialSkyArchipelago: (elapsedTime: number, playerX: number, playerZ: number) => {
      if (isWithinViewDistance(SKY_HARBOR.x, SKY_HARBOR.z, playerX, playerZ, ARCHIPELAGO_ANIMATION_RADIUS, VIEW_DISTANCE)) {
        aetherCyanCrystalMat.emissiveIntensity = 2.0 + Math.sin(elapsedTime * 2.5) * 0.45;

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

        for (let c = 0; c < floatingCrystals.length; c++) {
          floatingCrystals[c].rotation.y = elapsedTime * 0.85 + c * 0.5;
        }

        skybound.update(elapsedTime);
        skyHarbor.update(elapsedTime);
        floatingGarden.update(elapsedTime);
        observatory.update(elapsedTime);
        crystalIsles.update(elapsedTime);
        ancientRuins.update(elapsedTime);
        windCores.update(elapsedTime);
        skyPickups.update(elapsedTime);
        stormFruit.update(elapsedTime);
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
