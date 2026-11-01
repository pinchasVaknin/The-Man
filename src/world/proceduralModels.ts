// ============================================================================
// MODULE: World / Procedural Models Facade
// DESIGN: Modular 3D scene assembly orchestrator and animation tick facade (SRP)
// SUMMARY: Centralizes world generation by coordinating sub-builders for terrain,
//          vegetation, settlements, farmlands, fortress, oasis, harbor, and wildlife.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import type { IWorldTextureSet } from './proceduralTextures';
import type {
  IArrowProjectile,
  IObstacleCylinder,
  IPlayerState,
  IRideableHorseState,
  IWeatherStateSnapshot,
} from './domain/worldTypes';
import { isWithinViewDistance, VIEW_DISTANCE } from './terrainMath';
import { buildPlayerAndCombatSystems } from './builders/playerAndCombatBuilder';
import {
  buildWildlifeAndFootprintsLayer,
  type IWildlifeSoundCallbacks,
} from './builders/wildlifeAndFootprintsBuilder';
import type { ILogger } from '../core/ILogger';
import {
  buildColliderDebugWireframes,
  type IColliderDebugHandles,
} from './builders/colliderDebugBuilder';
import { buildTerrainAndWaterModel } from './models/terrainAndWaterModel';
import { buildVegetationModels } from './models/vegetationModels';
import { buildSettlementModels } from './models/settlementModels';
import { buildFarmhouseModels } from './models/farmhouseModels';
import { buildFortressModels } from './models/fortressModels';
import { buildSanctuaryAndDragonModels } from './models/sanctuaryAndDragonModels';
import { buildHarborModels } from './models/harborModels';
import { buildOasisModels } from './models/oasisModels';
import { buildEnvironmentAtmosphereModels } from './models/environmentAtmosphereModels';
import { createArchitecturalSharedAssets } from './models/architecturalHelpers';
import { createBirchBarkTexture } from './builders/shaderAndMaterialBuilders';
import type {
  IDistanceCulledObject,
  IDoorPivotHandle,
  IWorldModelBuildContext,
} from './models/types';
// #endregion

// ======================== INTERFACES & CONTRACTS ======================== \\
// #region Interfaces & Contracts
/**
 * Summary: Unified registry of animated handles across all world regions and landmarks.
 * Design: Combines doors, wind rotor pivots, beacon lights, and particle systems.
 */
export interface IAnimatedWorldHandles {
  waterMaterial: THREE.MeshPhysicalMaterial;
  terrainMaterial: THREE.MeshStandardMaterial;
  swayMaterials: THREE.MeshStandardMaterial[];
  rowboatGroup: THREE.Group;
  birdsGroup: THREE.Group;
  pollenPoints: THREE.Points;
  starsMaterial: THREE.PointsMaterial;
  lanternLights: THREE.PointLight[];
  cloudMesh: THREE.Mesh;
  mistMaterials: THREE.MeshBasicMaterial[];
  playerCharacterGroup: THREE.Group;
  colliderDebugHandles: IColliderDebugHandles;
  update: (
    elapsedTime: number,
    playerX: number,
    playerZ: number,
    morningMistOpacity: number,
    nightFactor?: number,
    weather?: IWeatherStateSnapshot,
    openDoorIds?: ReadonlySet<string>,
    rideableHorses?: readonly IRideableHorseState[],
    mountedHorseId?: string | null,
    playerState?: IPlayerState,
    activeArrows?: readonly IArrowProjectile[],
    worldHours?: number
  ) => void;
  /**
   * Advances wildlife (birds, animals, footprints) by one simulation step.
   * Design: Separate from update() so the simulation can run on a fixed timestep while
   *         update() animates meshes once per rendered frame.
   */
  simulateWildlife: (
    dt: number,
    elapsedTime: number,
    playerState: IPlayerState,
    rideableHorses: readonly IRideableHorseState[],
    nightFactor: number,
    weather: IWeatherStateSnapshot,
    soundCallbacks?: IWildlifeSoundCallbacks
  ) => void;
  dispose: () => void;
}
// #endregion

// ======================== FACADE ORCHESTRATOR ======================== \\
// #region Facade Orchestrator
/**
 * Summary: Master orchestrator that constructs the entire procedurally modeled 3D world,
 * delegating discrete landmark generation to isolated sub-modules.
 * @param scene Scene to add the world to.
 * @param textures Shared procedural textures.
 * @param obstacles Static collision cylinders.
 * @param isSoftwareGl True on software WebGL; lowers detail.
 * @returns Handles to update (per frame), simulate wildlife and dispose the world.
 */
export function buildRealisticWorld(
  scene: THREE.Scene,
  textures: IWorldTextureSet,
  obstacles: IObstacleCylinder[],
  isSoftwareGl: boolean,
  logger: ILogger
): IAnimatedWorldHandles {
  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];
  const disposableTextures: THREE.Texture[] = [];
  const swayMaterials: THREE.MeshStandardMaterial[] = [];
  const animatedWaterMaterials: THREE.MeshPhysicalMaterial[] = [];
  const lanternLights: THREE.PointLight[] = [];
  const mistMaterials: THREE.MeshBasicMaterial[] = [];
  const distanceCulledObjects: IDistanceCulledObject[] = [];
  const doorPivotHandles: IDoorPivotHandle[] = [];

  const birchBarkTexture = createBirchBarkTexture();
  disposableTextures.push(birchBarkTexture);

  const ctx: IWorldModelBuildContext = {
    scene,
    textures,
    obstacles,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    disposableTextures,
    swayMaterials,
    animatedWaterMaterials,
    lanternLights,
    mistMaterials,
    distanceCulledObjects,
    doorPivotHandles,
    birchBarkTexture,
  };

  const archAssets = createArchitecturalSharedAssets(ctx);
  ctx.archAssets = archAssets;

  // Modular subsystem builds
  const { waterMaterial, terrainMaterial } = buildTerrainAndWaterModel(ctx);
  buildVegetationModels(ctx);
  const { rowboatGroup, updateSettlement } = buildSettlementModels(ctx);
  const { updateFarmhousesAndMine } = buildFarmhouseModels(ctx);
  const { updateFortress } = buildFortressModels(ctx);
  const { updateSanctuaryAndDragon } = buildSanctuaryAndDragonModels(ctx);
  const { updateHarbor } = buildHarborModels(ctx);
  const { updateOasis } = buildOasisModels(ctx);
  const { birdsGroup, pollenPoints, starsMaterial, cloudMesh, updateEnvironment } =
    buildEnvironmentAtmosphereModels(ctx);

  const furnitureWoodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    map: textures.timberAlbedo,
    roughness: 0.7,
    metalness: 0.05,
  });
  disposableMaterials.push(furnitureWoodMat);

  const { playerCharacterGroup, updatePlayerAndCombat } = buildPlayerAndCombatSystems({
    scene,
    furnitureWoodMat,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
  });

  const wildlifeAndFootprintsLayer = buildWildlifeAndFootprintsLayer(
    scene,
    disposableGeometries,
    disposableMaterials,
    logger
  );

  const colliderDebugHandles = buildColliderDebugWireframes(
    scene,
    obstacles,
    disposableGeometries,
    disposableMaterials
  );

  let lastTime = 0;

  return {
    waterMaterial,
    terrainMaterial,
    swayMaterials,
    rowboatGroup,
    birdsGroup,
    pollenPoints,
    starsMaterial,
    lanternLights,
    cloudMesh,
    mistMaterials,
    playerCharacterGroup,
    colliderDebugHandles,
    update: (
      elapsedTime: number,
      playerX: number,
      playerZ: number,
      morningMistOpacity: number,
      nightFactor = 0,
      weather?: IWeatherStateSnapshot,
      openDoorIds?: ReadonlySet<string>,
      rideableHorses?: readonly IRideableHorseState[],
      _mountedHorseId?: string | null,
      playerState?: IPlayerState,
      activeArrows?: readonly IArrowProjectile[],
      worldHours = 8.5
    ) => {
      // 1. Distance-cull terrain chunks and landmarks
      for (let i = 0; i < distanceCulledObjects.length; i++) {
        const entry = distanceCulledObjects[i];
        entry.obj.visible = isWithinViewDistance(
          entry.cx,
          entry.cz,
          playerX,
          playerZ,
          entry.radius,
          VIEW_DISTANCE
        );
      }

      // 2. Smoothly animate interactive double doors swinging on hinges
      for (let i = 0; i < doorPivotHandles.length; i++) {
        const dh = doorPivotHandles[i];
        const isOpen = openDoorIds ? openDoorIds.has(dh.id) : false;
        const targetAngle = isOpen ? 1.52 : 0.0;
        if (Math.abs(targetAngle - dh.currentAngle) > 0.001) {
          dh.currentAngle += (targetAngle - dh.currentAngle) * 0.55;
          dh.leftPivot.rotation.y = dh.currentAngle;
          dh.rightPivot.rotation.y = -dh.currentAngle;
        }
      }

      // 3. Water surface waves, wind sway & terrain wetness shader time tick
      for (let i = 0; i < animatedWaterMaterials.length; i++) {
        const m = animatedWaterMaterials[i];
        if (m.userData.uTime) {
          m.userData.uTime.value = elapsedTime;
        }
      }
      const windScale = weather ? (weather.windStrength ?? 1.0) : 1.0;
      for (let i = 0; i < swayMaterials.length; i++) {
        const sm = swayMaterials[i];
        if (sm.userData.uTime) {
          sm.userData.uTime.value = elapsedTime;
        }
        if (sm.userData.uWindScale) {
          sm.userData.uWindScale.value = windScale;
        }
      }
      if (terrainMaterial.userData.uTime) {
        terrainMaterial.userData.uTime.value = elapsedTime;
      }
      if (terrainMaterial.userData.uWetness) {
        terrainMaterial.userData.uWetness.value = weather ? (weather.wetness ?? 0.0) : 0.0;
      }

      // 4. Submodule simulation updates
      updateSettlement(elapsedTime, rideableHorses, _mountedHorseId, playerX, playerZ);
      updateFarmhousesAndMine(elapsedTime, worldHours, playerX, playerZ);
      updateFortress(elapsedTime, playerX, playerZ);
      updateSanctuaryAndDragon(elapsedTime, playerX, playerZ);
      updateHarbor(elapsedTime, playerX, playerZ);
      updateOasis(elapsedTime);
      updateEnvironment(
        elapsedTime,
        playerX,
        playerZ,
        morningMistOpacity,
        nightFactor,
        weather,
        playerState?.y ?? 2.15
      );

      // 5. Wildlife, boids and footprint meshes (the simulation runs in simulateWildlife)
      const dt = Math.max(0, Math.min(0.1, elapsedTime - lastTime));
      lastTime = elapsedTime;
      if (playerState) {
        wildlifeAndFootprintsLayer.syncMeshes(dt, elapsedTime);
      }

      // 6. Player viewmodel and combat rigs
      updatePlayerAndCombat(elapsedTime, playerState, activeArrows);
    },
    simulateWildlife: (dt, elapsedTime, playerState, rideableHorses, nightFactor, weather, soundCallbacks) => {
      wildlifeAndFootprintsLayer.simulate(
        dt,
        elapsedTime,
        playerState,
        rideableHorses,
        1.0 - nightFactor,
        soundCallbacks,
        weather.rainIntensity ?? weather.wetness ?? 0
      );
    },
    dispose: () => {
      wildlifeAndFootprintsLayer.dispose();
      for (let i = 0; i < disposableGeometries.length; i++) disposableGeometries[i].dispose();
      for (let i = 0; i < disposableMaterials.length; i++) disposableMaterials[i].dispose();
      for (let i = 0; i < disposableTextures.length; i++) disposableTextures[i].dispose();
    },
  };
}
// #endregion
