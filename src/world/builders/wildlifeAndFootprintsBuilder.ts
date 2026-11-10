// ============================================================================
// MODULE: World / Builders / Wildlife & Footprints Builder
// DESIGN: 3D mesh layer for Reynolds bird boids, reactive critters/deer/sheep, and footprints
// SUMMARY: Builds and animates 3D bird flocks, meadow rabbits, birch-grove squirrels,
//          forest deer (with antlers), valley sheep, and fading footprint decals.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import * as THREE from 'three';
import {
  createInitialWildlifeState,
  stepBoidsAndWildlife,
  type IBoidBirdState,
  type ISmallAnimalState,
} from '../systems/boidsAndWildlifeSystem';
import {
  createFootprintTrailTracker,
  stepFootprintTrailSystem,
  MAX_FOOTPRINT_DECALS,
} from '../systems/footprintTrailSystem';
import type { IPlayerState, IRideableHorseState } from '../domain/worldTypes';
import { attachDeerGlbModel } from '../models/deerGlbLoader';
import { DeferredAnimalModel } from '../models/deferredAnimalModel';
import { createReadyBear, type Bear, type BearState } from '../models/Bear';
import { createReadyCrocodile, type Crocodile, type CrocodileState } from '../models/Crocodile';
import { createReadyJaguar, type Jaguar, type JaguarState } from '../models/Jaguar';
import { createReadyWolf, type Wolf, type WolfState } from '../models/Wolf';
import { createReadyRhino, type Rhino, type RhinoState } from '../models/Rhino';
import { createReadyCatLion, type CatLion, type CatLionState } from '../models/CatLion';
import { createReadyStag, type Stag, type StagState } from '../models/Stag';
import { createReadyHippo, type Hippo, type HippoState } from '../models/Hippo';
import { createReadyKoiFish, type KoiFish, type KoiFishState } from '../models/KoiFish';
import { createReadyDolphin, type Dolphin, type DolphinState } from '../models/Dolphin';
import { createReadyDove, type DoveController } from '../models/Dove';
import { buildBearPawClampedTrapMesh } from '../models/placedTrapModels';
import {
  getSurfaceNormalAt,
  computeSlopePitchAndRoll,
  walkableHeightAt,
  groundHeightAt,
} from '../systems/terrainAndBiomeSystem';
import { WATER_LEVEL } from '../domain/landmarksRegistry';
import { SAVED_LAB_OVERRIDES } from '../../config/savedLabOverrides';
import { LAB_POSE_OVERRIDES_STORAGE_KEY, mergeStoredLabOverrides } from '../../lab/labOverridesStorage';
import type { ILogger } from '../../core/ILogger';
import {
  getEffectiveLabAnimationSpeed,
  type ILabPoseOverrides,
} from '../../lab/labCatalog';

export interface IWildlifeSoundCallbacks {
  onBirdFlockStartled?: (distance: number, count: number) => void;
  onCritterScampered?: (distance: number, species: 'rabbit' | 'squirrel') => void;
  onAmbientWildlifeProximity?: (nearestBirdDist: number, nearestCritterDist: number) => void;
}

export interface IWildlifeAndFootprintsHandles {
  readonly birds: IBoidBirdState[];
  readonly animals: ISmallAnimalState[];
  /** Advances birds, animals and footprints by one simulation step and fires wildlife sound cues. */
  readonly simulate: (
    dt: number,
    elapsedTime: number,
    playerState: IPlayerState,
    horses: readonly IRideableHorseState[],
    daylightFactor: number,
    soundCallbacks?: IWildlifeSoundCallbacks,
    rainIntensity?: number
  ) => void;
  /** Copies the simulated state onto meshes and advances model animations by the frame delta. */
  readonly syncMeshes: (dt: number, elapsedTime: number, renderPlayer?: IPlayerState) => void;
  /** Removes the window listeners this layer registered; call when the world is torn down. */
  readonly dispose: () => void;
}
// #endregion

// ======================== BUILDER IMPLEMENTATION ======================== \\
// #region Builder Implementation
export function buildWildlifeAndFootprintsLayer(
  scene: THREE.Scene,
  disposableGeometries: THREE.BufferGeometry[],
  disposableMaterials: THREE.Material[],
  logger: ILogger
): IWildlifeAndFootprintsHandles {
  const { birds, animals } = createInitialWildlifeState();
  const footprintState = createFootprintTrailTracker();

  const layerGroup = new THREE.Group();
  layerGroup.name = 'WildlifeAndFootprintsLayer';
  scene.add(layerGroup);

  // --- 1. FLOCKING BOID BIRDS / DOVES (Rigged 75-joint Dove_Complete.ts) ---
  const birdMeshes: Array<{
    root: THREE.Group;
    doveCtrl: DoveController;
  }> = [];

  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const root = new THREE.Group();
    root.position.set(b.x, b.y, b.z);

    const doveCtrl = createReadyDove({
      scale: 0.42,
      castShadow: false,
      receiveShadow: false,
    });
    doveCtrl.setState('fly');
    doveCtrl.animator.time = (i * 0.19) % 0.77;

    const doveMat = doveCtrl.mesh.material;
    if (Array.isArray(doveMat)) {
      for (const m of doveMat) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(doveMat);
    }
    disposableGeometries.push(doveCtrl.mesh.geometry);

    root.add(doveCtrl.object);
    layerGroup.add(root);
    birdMeshes.push({ root, doveCtrl });
  }

  // --- 2. GROUND ANIMALS (Rabbits, Squirrels, Forest Deer & Grazing Sheep) ---
  const rabbitFurMat = new THREE.MeshStandardMaterial({
    color: 0xa89f91,
    roughness: 0.9,
  });
  const squirrelFurMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.85,
  });
  const sheepWoolMat = new THREE.MeshStandardMaterial({
    color: 0xf3f4f6,
    roughness: 0.95,
  });
  const sheepDarkMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.9,
  });
  disposableMaterials.push(
    rabbitFurMat,
    squirrelFurMat,
    sheepWoolMat,
    sheepDarkMat
  );

  const critterBodyGeo = new THREE.SphereGeometry(0.18, 8, 6);
  critterBodyGeo.scale(0.85, 0.78, 1.35);
  const critterHeadGeo = new THREE.SphereGeometry(0.11, 7, 6);
  const rabbitEarGeo = new THREE.BoxGeometry(0.035, 0.16, 0.045);
  const squirrelTailGeo = new THREE.SphereGeometry(0.12, 6, 6);
  squirrelTailGeo.scale(0.65, 1.45, 0.9);

  // Sheep geometries
  const sheepBodyGeo = new THREE.SphereGeometry(0.42, 8, 8);
  sheepBodyGeo.scale(0.95, 0.85, 1.35);
  const sheepHeadGeo = new THREE.BoxGeometry(0.22, 0.22, 0.34);
  sheepHeadGeo.translate(0, 0.08, 0.14);
  const sheepLegGeo = new THREE.CylinderGeometry(0.045, 0.038, 0.42, 6);
  sheepLegGeo.translate(0, -0.21, 0);

  disposableGeometries.push(
    critterBodyGeo,
    critterHeadGeo,
    rabbitEarGeo,
    squirrelTailGeo,
    sheepBodyGeo,
    sheepHeadGeo,
    sheepLegGeo
  );

  let liveLabOverrides: Record<string, ILabPoseOverrides> = {
    ...SAVED_LAB_OVERRIDES,
  };
  if (typeof window !== 'undefined') {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LAB_POSE_OVERRIDES_STORAGE_KEY);
    } catch (err: unknown) {
      logger.warn('Lab overrides could not be read from localStorage', { error: String(err) });
    }
    const merged = mergeStoredLabOverrides(stored, SAVED_LAB_OVERRIDES);
    if (merged.isSuccess) {
      liveLabOverrides = merged.value;
    } else {
      logger.warn('Stored lab overrides are invalid; using code-saved values', {
        errorCode: merged.error,
      });
    }
  }
  const onLabOverridesSaved = (ev: Event): void => {
    const customEv = ev as CustomEvent<Record<string, ILabPoseOverrides>>;
    if (customEv.detail) {
      liveLabOverrides = { ...SAVED_LAB_OVERRIDES, ...customEv.detail };
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('lab-overrides-saved', onLabOverridesSaved);
  }

  interface IAnimalMeshRig {
    root: THREE.Group;
    posePivot: THREE.Group;
    headPivot?: THREE.Group;
    legs?: THREE.Mesh[];
    deerGlbCtrl?: ReturnType<typeof attachDeerGlbModel>;
    bearCtrl?: DeferredAnimalModel<BearState, Bear>;
    crocodileCtrl?: DeferredAnimalModel<CrocodileState, Crocodile>;
    jaguarCtrl?: DeferredAnimalModel<JaguarState, Jaguar>;
    wolfCtrl?: DeferredAnimalModel<WolfState, Wolf>;
    rhinoCtrl?: DeferredAnimalModel<RhinoState, Rhino>;
    lionCtrl?: CatLion;
    stagCtrl?: Stag;
    hippoCtrl?: Hippo;
    koifishCtrl?: KoiFish;
    dolphinCtrl?: Dolphin;
    smoothHeadDip: number;
    smoothLegAmp: number;
    smoothPitch?: number;
    smoothRoll?: number;
    smoothSpeed?: number;
    smoothTurn?: number;
    prevYaw?: number;
    lastAnimState?: string;
    stateHoldTimer?: number;
    pawBearTrapGroup?: THREE.Group;
    tailMesh?: THREE.Mesh;
  }
  const animalMeshes: IAnimalMeshRig[] = [];
  const tmpPawWorldPos = new THREE.Vector3();

  const isStationaryActionClip = (st: string): boolean =>
    st === 'attack' || st === 'roar' || st === 'stomp' || st === 'howl';
  const isLocomotionClip = (st: string): boolean =>
    st === 'walk' || st === 'trot' || st === 'run' || st === 'flee' || st === 'stalk' || st === 'skip';

  const locomotionRank = (st: string): number => {
    if (st === 'flee') return 4;
    if (st === 'run' || st === 'skip') return 3;
    if (st === 'trot' || st === 'stalk') return 2;
    if (st === 'walk') return 1;
    return 0;
  };

  const selectStabilizedState = <T extends string>(
    rig: IAnimalMeshRig,
    desiredState: T,
    dt: number,
    isUrgent: boolean
  ): T => {
    rig.stateHoldTimer = Math.max(0, (rig.stateHoldTimer ?? 0) - dt);
    if (!rig.lastAnimState) {
      rig.lastAnimState = desiredState;
      rig.stateHoldTimer = 0.25;
      return desiredState;
    }
    if (desiredState === rig.lastAnimState) {
      return desiredState;
    }
    const prevWasStationaryAction = isStationaryActionClip(rig.lastAnimState);
    // Transition immediately when entering or leaving a committed combat action clip,
    // when starting/stopping locomotion, or when accelerating to a faster gait!
    const urgentTransition =
      isUrgent ||
      prevWasStationaryAction ||
      isStationaryActionClip(desiredState) ||
      isLocomotionClip(desiredState) !== isLocomotionClip(rig.lastAnimState) ||
      locomotionRank(desiredState) > locomotionRank(rig.lastAnimState);
    if (urgentTransition || (rig.stateHoldTimer ?? 0) <= 0) {
      rig.lastAnimState = desiredState;
      rig.stateHoldTimer = prevWasStationaryAction ? 0.05 : urgentTransition ? 0.18 : 0.45;
      return desiredState;
    }
    return rig.lastAnimState as T;
  };

  /** Registers a model's material(s) and geometry for disposal once it has attached. */
  const registerModelDisposables = (model: {
    readonly mesh: THREE.SkinnedMesh;
    readonly saddleMesh?: THREE.SkinnedMesh;
  }): void => {
    const material = model.mesh.material;
    if (Array.isArray(material)) {
      for (const m of material) disposableMaterials.push(m);
    } else {
      disposableMaterials.push(material);
    }
    disposableGeometries.push(model.mesh.geometry);

    if (model.saddleMesh) {
      const saddleMaterial = model.saddleMesh.material;
      if (Array.isArray(saddleMaterial)) {
        for (const m of saddleMaterial) disposableMaterials.push(m);
      } else {
        disposableMaterials.push(saddleMaterial);
      }
      disposableGeometries.push(model.saddleMesh.geometry);
    }
  };

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const root = new THREE.Group();
    root.rotation.order = 'YXZ';
    const posePivot = new THREE.Group();
    root.add(posePivot);

    if (a.species === 'deer') {
      const deerGlbCtrl = attachDeerGlbModel(posePivot, {
        disposableMaterials,
        logger,
      });

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        deerGlbCtrl,
        smoothHeadDip: 0.85,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'bear') {
      const bearCtrl = new DeferredAnimalModel<BearState, Bear>(
        'bear',
        () =>
          createReadyBear({
            castShadow: true,
            receiveShadow: true,
          }),
        logger,
        registerModelDisposables
      );
      posePivot.add(bearCtrl.object);
      const pawBearTrapGroup = buildBearPawClampedTrapMesh();
      root.add(pawBearTrapGroup);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        bearCtrl,
        pawBearTrapGroup,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'crocodile') {
      const crocodileCtrl = new DeferredAnimalModel<CrocodileState, Crocodile>(
        'crocodile',
        () =>
          createReadyCrocodile({
            castShadow: true,
            receiveShadow: true,
          }),
        logger,
        registerModelDisposables
      );
      posePivot.add(crocodileCtrl.object);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        crocodileCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'jaguar') {
      const jaguarCtrl = new DeferredAnimalModel<JaguarState, Jaguar>(
        'jaguar',
        () =>
          createReadyJaguar({
            castShadow: true,
            receiveShadow: true,
          }),
        logger,
        registerModelDisposables
      );
      posePivot.add(jaguarCtrl.object);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        jaguarCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'wolf') {
      const wolfCtrl = new DeferredAnimalModel<WolfState, Wolf>(
        'wolf',
        () =>
          createReadyWolf({
            castShadow: true,
            receiveShadow: true,
          }),
        logger,
        registerModelDisposables
      );
      posePivot.add(wolfCtrl.object);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        wolfCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'rhino') {
      const rhinoCtrl = new DeferredAnimalModel<RhinoState, Rhino>(
        'rhino',
        () =>
          createReadyRhino({
            castShadow: true,
            receiveShadow: true,
          }),
        logger,
        registerModelDisposables
      );
      posePivot.add(rhinoCtrl.object);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        rhinoCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'lion') {
      const lionScale = a.isBoss ? 2.25 : 1.05;
      const lionCtrl = createReadyCatLion({
        scale: lionScale,
        castShadow: true,
        receiveShadow: true,
      });
      // Offset the CatLion mesh slightly forward so local (0, y, +0.28) places the rider higher and slightly further back on its spine
      lionCtrl.object.position.set(0, 0, a.isBoss ? 0.46 : 0.10);
      registerModelDisposables(lionCtrl);
      posePivot.add(lionCtrl.object);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        lionCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'stag') {
      const stagScale = 1.75;
      const stagCtrl = createReadyStag({
        scale: stagScale,
        castShadow: true,
        receiveShadow: true,
      });
      // In Stag_Complete, bone[6] (neck base) is at z=0 and bone[5] (saddle spine) is at z=-0.20*scale.
      // Shifting stagCtrl.object by +0.35m along +Z places the Stag's back saddle directly at (0, y, 0)!
      stagCtrl.object.position.set(0, 0, 0.35);
      registerModelDisposables(stagCtrl);
      posePivot.add(stagCtrl.object);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        stagCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'hippo') {
      const hippoCtrl = createReadyHippo({
        scale: 1.55,
        castShadow: true,
        receiveShadow: true,
      });
      registerModelDisposables(hippoCtrl);
      posePivot.add(hippoCtrl.object);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        hippoCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'koifish') {
      const koifishCtrl = createReadyKoiFish({
        scale: 0.62,
        tintHex: i % 3 === 1 ? 0xffedd5 : i % 3 === 2 ? 0x93c5fd : undefined,
        castShadow: false,
        receiveShadow: false,
      });
      registerModelDisposables(koifishCtrl);
      posePivot.add(koifishCtrl.object);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        koifishCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'dolphin') {
      const dolphinCtrl = createReadyDolphin({
        scale: 1.45,
        castShadow: true,
        receiveShadow: true,
      });
      registerModelDisposables(dolphinCtrl);
      posePivot.add(dolphinCtrl.object);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        dolphinCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'sheep') {
      const body = new THREE.Mesh(sheepBodyGeo, sheepWoolMat);
      body.position.y = 0.58;
      posePivot.add(body);

      const headPivot = new THREE.Group();
      headPivot.position.set(0, 0.68, 0.48);
      const head = new THREE.Mesh(sheepHeadGeo, sheepDarkMat);
      headPivot.add(head);
      posePivot.add(headPivot);

      const sfl = new THREE.Mesh(sheepLegGeo, sheepDarkMat);
      sfl.position.set(-0.15, 0.42, 0.28);
      const sfr = new THREE.Mesh(sheepLegGeo, sheepDarkMat);
      sfr.position.set(0.15, 0.42, 0.28);
      const sbl = new THREE.Mesh(sheepLegGeo, sheepDarkMat);
      sbl.position.set(-0.15, 0.42, -0.28);
      const sbr = new THREE.Mesh(sheepLegGeo, sheepDarkMat);
      sbr.position.set(0.15, 0.42, -0.28);
      posePivot.add(sfl, sfr, sbl, sbr);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        headPivot,
        legs: [sfl, sfr, sbl, sbr],
        smoothHeadDip: 0.5,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'dragon') {
      // Southern Dragon 3D model is built and animated in sanctuaryAndDragonModels.ts
      animalMeshes.push({
        root,
        posePivot,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else {
      const mat = a.species === 'rabbit' ? rabbitFurMat : squirrelFurMat;
      const body = new THREE.Mesh(critterBodyGeo, mat);
      body.position.set(0, 0.15, 0);
      const head = new THREE.Mesh(critterHeadGeo, mat);
      head.position.set(0, 0.24, 0.18);
      posePivot.add(body, head);

      let tailMesh: THREE.Mesh | undefined;
      if (a.species === 'rabbit') {
        const earL = new THREE.Mesh(rabbitEarGeo, mat);
        earL.position.set(-0.045, 0.36, 0.16);
        earL.rotation.x = -0.15;
        const earR = new THREE.Mesh(rabbitEarGeo, mat);
        earR.position.set(0.045, 0.36, 0.16);
        earR.rotation.x = -0.15;
        posePivot.add(earL, earR);
      } else {
        const sqEarGeo = new THREE.ConeGeometry(0.032, 0.075, 5);
        const sqPawGeo = new THREE.CapsuleGeometry(0.024, 0.075, 4, 6);
        disposableGeometries.push(sqEarGeo, sqPawGeo);
        for (const side of [-1, 1]) {
          const ear = new THREE.Mesh(sqEarGeo, mat);
          ear.position.set(side * 0.052, 0.33, 0.18);
          posePivot.add(ear);
          const frontPaw = new THREE.Mesh(sqPawGeo, mat);
          frontPaw.position.set(side * 0.08, 0.06, 0.12);
          frontPaw.rotation.x = 0.35;
          const backPaw = new THREE.Mesh(sqPawGeo, mat);
          backPaw.position.set(side * 0.09, 0.06, -0.11);
          backPaw.rotation.x = -0.25;
          posePivot.add(frontPaw, backPaw);
        }
        const tail = new THREE.Mesh(squirrelTailGeo, mat);
        tail.position.set(0, 0.26, -0.22);
        tail.rotation.x = 0.45;
        posePivot.add(tail);
        tailMesh = tail;
      }

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({ root, posePivot, smoothHeadDip: 0, smoothLegAmp: 0, tailMesh });
    }
  }

  // --- 3. FOOTPRINT TRAIL RING-BUFFER DECALS ---
  const footprintGeo = new THREE.PlaneGeometry(0.24, 0.42);
  footprintGeo.rotateX(-Math.PI * 0.5);
  disposableGeometries.push(footprintGeo);

  const footprintPool: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
  }> = [];

  for (let i = 0; i < MAX_FOOTPRINT_DECALS; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    disposableMaterials.push(mat);
    const mesh = new THREE.Mesh(footprintGeo, mat);
    mesh.visible = false;
    layerGroup.add(mesh);
    footprintPool.push({ mesh, mat });
  }

  let soundCheckAccumulator = 0;

  return {
    birds,
    animals,
    dispose: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('lab-overrides-saved', onLabOverridesSaved);
      }
    },
    simulate: (
      dt: number,
      elapsedTime: number,
      playerState: IPlayerState,
      horses: readonly IRideableHorseState[],
      daylightFactor: number,
      soundCallbacks?: IWildlifeSoundCallbacks,
      rainIntensity = 0
    ) => {
      // Track pre-step alert states so we can fire one-shot audio cues on transitions
      let prevStartledBirds = 0;
      for (let i = 0; i < birds.length; i++) {
        if (birds[i].startleTimer > 3.85) prevStartledBirds++;
      }
      const prevFleeingIds = new Set<number>();
      for (let i = 0; i < animals.length; i++) {
        if (animals[i].alertLevel === 'fleeing') {
          prevFleeingIds.add(animals[i].id);
        }
      }

      stepBoidsAndWildlife(
        dt,
        elapsedTime,
        birds,
        animals,
        playerState,
        horses,
        daylightFactor,
        rainIntensity
      );
      stepFootprintTrailSystem(
        footprintState,
        playerState.x,
        playerState.y,
        playerState.z,
        playerState.yaw,
        playerState.onGround,
        playerState.isFlying,
        playerState.inWater,
        Boolean(playerState.mountedHorseId),
        dt
      );

      // Check for newly startled bird flock or scampering critter to trigger spatial sound
      if (soundCallbacks) {
        let newlyStartledCount = 0;
        let minStartledBirdDist = Infinity;
        let nearestBirdDist = Infinity;
        for (let i = 0; i < birds.length; i++) {
          const b = birds[i];
          const d = Math.hypot(b.x - playerState.x, b.z - playerState.z);
          if (!b.roosting && d < nearestBirdDist) nearestBirdDist = d;
          if (b.startleTimer > 3.85) {
            newlyStartledCount++;
            if (d < minStartledBirdDist) minStartledBirdDist = d;
          }
        }
        if (
          newlyStartledCount > prevStartledBirds &&
          minStartledBirdDist < 28 &&
          soundCallbacks.onBirdFlockStartled
        ) {
          soundCallbacks.onBirdFlockStartled(minStartledBirdDist, newlyStartledCount);
        }

        let nearestCritterDist = Infinity;
        for (let i = 0; i < animals.length; i++) {
          const a = animals[i];
          if (a.isDead) continue;
          const d = Math.hypot(a.x - playerState.x, a.z - playerState.z);
          if (!a.isResting && d < nearestCritterDist) nearestCritterDist = d;
          if (
            a.alertLevel === 'fleeing' &&
            !prevFleeingIds.has(a.id) &&
            d < 22 &&
            soundCallbacks.onCritterScampered
          ) {
            soundCallbacks.onCritterScampered(
              d,
              a.species === 'squirrel' ? 'squirrel' : 'rabbit'
            );
          }
        }

        soundCheckAccumulator += dt;
        if (soundCheckAccumulator >= 0.25) {
          soundCheckAccumulator = 0;
          soundCallbacks.onAmbientWildlifeProximity?.(nearestBirdDist, nearestCritterDist);
        }
      }
    },
    syncMeshes: (dt: number, elapsedTime: number, renderPlayer?: IPlayerState) => {
      // Sync bird meshes (with distance + camera frustum culling, ground walking/eating, and death state)
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i];
        const m = birdMeshes[i];
        if (b.roosting || b.isLooted) {
          m.root.visible = false;
          continue;
        }

        if (renderPlayer) {
          const dxCam = b.x - renderPlayer.x;
          const dzCam = b.z - renderPlayer.z;
          const distSq = dxCam * dxCam + dzCam * dzCam;
          if (distSq > 170 * 170) {
            m.root.visible = false;
            continue;
          }
          if (distSq > 28 * 28 && !b.isDead && b.groundState === 'flying') {
            const camFwdX = -Math.sin(renderPlayer.yaw);
            const camFwdZ = -Math.cos(renderPlayer.yaw);
            const invDist = 1 / Math.sqrt(distSq);
            const dot = (dxCam * camFwdX + dzCam * camFwdZ) * invDist;
            if (dot < -0.25) {
              m.root.visible = false;
              continue;
            }
          }
        }

        m.root.visible = true;
        m.root.position.set(b.x, b.y, b.z);

        if (b.isDead) {
          m.root.rotation.set(0, b.yaw ?? 0, 0, 'YXZ');
          m.doveCtrl.setState('death');
          if (dt > 0) {
            m.doveCtrl.update(dt);
            m.doveCtrl.object.position.set(0, 0, 0);
            m.doveCtrl.object.rotation.set(0, 0, 0);
          }
          continue;
        }

        if (b.groundState === 'walking_to_bait') {
          const walkYaw = b.yaw ?? Math.atan2(b.vx, b.vz);
          m.root.rotation.set(0, walkYaw, 0, 'YXZ');
          m.doveCtrl.setState('walk');
          if (dt > 0) {
            m.doveCtrl.update(dt * 1.18);
            m.doveCtrl.object.position.set(0, 0, 0);
            m.doveCtrl.object.rotation.set(0, 0, 0);
          }
          continue;
        }

        if (b.groundState === 'eating_bait') {
          m.root.rotation.set(0, b.yaw ?? 0, 0, 'YXZ');
          m.doveCtrl.setState('eat');
          if (dt > 0) {
            m.doveCtrl.update(dt * 1.05);
            m.doveCtrl.object.position.set(0, 0, 0);
            m.doveCtrl.object.rotation.set(0, 0, 0);
          }
          continue;
        }

        const yaw = b.yaw ?? Math.atan2(b.vx, b.vz);
        const horizSpd = Math.hypot(b.vx, b.vz) || 1;
        const pitch = -Math.atan2(b.vy, horizSpd) * 0.5;
        m.root.rotation.set(pitch, yaw, 0, 'YXZ');

        m.doveCtrl.setState(b.startleTimer > 0 ? 'flee' : 'fly');
        if (dt > 0) {
          m.doveCtrl.update(dt * (b.startleTimer > 0 ? 1.35 : 1.0));
          m.doveCtrl.object.position.set(0, 0, 0);
          m.doveCtrl.object.rotation.set(0, 0, 0);
        }
      }

      // Sync ground animal meshes (Rabbits, Squirrels, Deer, Sheep, Bears, Crocodiles, Jaguars, Wolves, Stags, CatLions)
      for (let i = 0; i < animals.length; i++) {
        const a = animals[i];
        const rig = animalMeshes[i];
        if (a.species === 'dragon') continue;

        if (a.isLooted) {
          rig.root.visible = false;
          continue;
        }

        // Distance + directional camera frustum culling so off-screen animals never waste CPU/GPU
        let distSqToPlayer = 0;
        if (!a.isMountedByPlayer && renderPlayer) {
          const dxCam = a.x - renderPlayer.x;
          const dzCam = a.z - renderPlayer.z;
          distSqToPlayer = dxCam * dxCam + dzCam * dzCam;
          if (distSqToPlayer > 165 * 165) {
            rig.root.visible = false;
            continue;
          }
          if (distSqToPlayer > 22 * 22) {
            const camFwdX = -Math.sin(renderPlayer.yaw);
            const camFwdZ = -Math.cos(renderPlayer.yaw);
            const forwardDot = dxCam * camFwdX + dzCam * camFwdZ;
            if (forwardDot < -Math.sqrt(distSqToPlayer) * 0.38) {
              rig.root.visible = false;
              continue;
            }
          }
        }
        rig.root.visible = true;

        // When mounted by the player, lock the animal's render coordinates and yaw directly to the interpolated renderPlayer
        // so there is zero frame-interpolation lag or side-offset between the rider and mount!
        const renderX = a.isMountedByPlayer && renderPlayer ? renderPlayer.x : a.x;
        const renderY = a.isMountedByPlayer && renderPlayer ? renderPlayer.y : a.y;
        const renderZ = a.isMountedByPlayer && renderPlayer ? renderPlayer.z : a.z;
        const renderYaw =
          a.isMountedByPlayer && renderPlayer
            ? Math.atan2(
                Math.sin((renderPlayer.mountedHorseYaw ?? renderPlayer.yaw) + Math.PI),
                Math.cos((renderPlayer.mountedHorseYaw ?? renderPlayer.yaw) + Math.PI)
              )
            : a.yaw;

        // Compute terrain slope alignment (pitch & roll) ONLY when close enough (< 55m) and standing on natural ground
        const onNaturalGround =
          !a.isMountedByPlayer &&
          distSqToPlayer < 55 * 55 &&
          walkableHeightAt(renderX, renderZ, renderY).surface === 'ground';
        const rawSlope = onNaturalGround
          ? (() => {
              const n = getSurfaceNormalAt(renderX, renderZ);
              return computeSlopePitchAndRoll(n.nx, n.ny, n.nz, renderYaw, 0.48);
            })()
          : { pitch: 0, roll: 0 };
        const slopeBlend = Math.min(1, Math.max(0.05, dt * 8.5));
        rig.smoothPitch =
          rig.smoothPitch === undefined
            ? rawSlope.pitch
            : rig.smoothPitch + (rawSlope.pitch - rig.smoothPitch) * slopeBlend;
        rig.smoothRoll =
          rig.smoothRoll === undefined
            ? rawSlope.roll
            : rig.smoothRoll + (rawSlope.roll - rig.smoothRoll) * slopeBlend;
        const slope = { pitch: rig.smoothPitch, roll: rig.smoothRoll };

        const yawDelta =
          rig.prevYaw === undefined
            ? 0
            : Math.atan2(Math.sin(renderYaw - rig.prevYaw), Math.cos(renderYaw - rig.prevYaw));
        rig.prevYaw = renderYaw;
        const rawTurn = Math.max(-1, Math.min(1, (yawDelta / Math.max(dt, 0.016)) * 0.22));
        rig.smoothTurn =
          rig.smoothTurn === undefined
            ? rawTurn
            : rig.smoothTurn + (rawTurn - rig.smoothTurn) * Math.min(1, Math.max(0.12, dt * 7.5));
        const turnAmount = rig.smoothTurn;

        if (a.isDead) {
          // Hunted animal: collapses and lies motionless on top of the ground until looted with [E]
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch, a.yaw, slope.roll, 'YXZ');
          if (a.species === 'deer' && rig.deerGlbCtrl?.isLoaded()) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['forest_deer'],
              'death',
              1.0
            );
            rig.deerGlbCtrl.setState('death');
            rig.deerGlbCtrl.update(dt * spd, 0);
            continue;
          }
          if (a.species === 'bear' && rig.bearCtrl) {
            if (rig.pawBearTrapGroup) rig.pawBearTrapGroup.visible = false;
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['forest_bear'],
              'death',
              1.0
            );
            rig.bearCtrl.setState('death');
            rig.bearCtrl.update(dt * spd);
            continue;
          }
          if (a.species === 'crocodile' && rig.crocodileCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['river_crocodile'],
              'death',
              1.0
            );
            rig.crocodileCtrl.setState('death');
            rig.crocodileCtrl.update(dt * spd);
            continue;
          }
          if (a.species === 'jaguar' && rig.jaguarCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['jungle_jaguar'],
              'death',
              1.0
            );
            rig.jaguarCtrl.setState('death');
            rig.jaguarCtrl.update(dt * spd);
            continue;
          }
          if (a.species === 'wolf' && rig.wolfCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['forest_wolf'],
              'death',
              1.0
            );
            rig.wolfCtrl.setState('death');
            rig.wolfCtrl.update(dt * spd);
            continue;
          }
          if (a.species === 'rhino' && rig.rhinoCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['savanna_rhino'],
              'death',
              1.0
            );
            rig.rhinoCtrl.moveSpeed = 0;
            rig.rhinoCtrl.setState('death');
            rig.rhinoCtrl.update(dt * spd);
            continue;
          }
          if (a.species === 'lion' && rig.lionCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['savanna_lion'],
              'death',
              1.0
            );
            rig.lionCtrl.setState('death');
            rig.lionCtrl.update(dt * spd);
            continue;
          }
          if (a.species === 'stag' && rig.stagCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['royal_stag'],
              'death',
              1.0
            );
            rig.stagCtrl.setState('death');
            rig.stagCtrl.update(dt * spd);
            continue;
          }
          if (a.species === 'hippo' && rig.hippoCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['oasis_hippo'],
              'death',
              1.0
            );
            rig.hippoCtrl.setState('death');
            rig.hippoCtrl.update(dt * spd);
            continue;
          }
          if (a.species === 'koifish' && rig.koifishCtrl) {
            const lakeBedY = Math.max(groundHeightAt(a.x, a.z) + 0.14, WATER_LEVEL - 1.15);
            const sunkY = Math.min(a.y, WATER_LEVEL - 0.55);
            rig.root.position.set(a.x, Math.max(lakeBedY, sunkY), a.z);
            rig.posePivot.position.set(0, -0.08, 0);
            rig.posePivot.rotation.set(0, 0, Math.PI * 0.5);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['koi_fish'],
              'death',
              1.0
            );
            rig.koifishCtrl.setState('death');
            rig.koifishCtrl.update(dt * spd);
            continue;
          }
          if (a.species === 'dolphin' && rig.dolphinCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['ocean_dolphin'],
              'death',
              1.0
            );
            rig.dolphinCtrl.setState('death');
            rig.dolphinCtrl.update(dt * spd);
            continue;
          }
          // Fallback procedural corpse pose
          if (a.species === 'deer') {
            rig.posePivot.position.set(1.05, 0.32, 0);
          } else if (a.species === 'sheep') {
            rig.posePivot.position.set(0.56, 0.38, 0);
          } else {
            rig.posePivot.position.set(0.15, 0.14, 0);
          }
          rig.posePivot.rotation.set(0, 0, Math.PI * 0.5);
          if (rig.legs) {
            for (let l = 0; l < rig.legs.length; l++) {
              rig.legs[l].rotation.x = 0;
            }
          }
          continue;
        }

        const rawMoveSpd = Math.hypot(a.vx, a.vz);
        rig.smoothSpeed =
          rig.smoothSpeed === undefined || rawMoveSpd >= rig.smoothSpeed
            ? rawMoveSpd
            : rig.smoothSpeed + (rawMoveSpd - rig.smoothSpeed) * Math.min(1, Math.max(0.22, dt * 12.0));
        const moveSpd = rig.smoothSpeed;
        const ai = a.aiBehavior;

        if (a.isResting || ai === 'sleeping') {
          // Sleeping at night or resting inside cave / under tree canopy during rain
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch, a.yaw, slope.roll, 'YXZ');
          if (a.species === 'deer' && rig.deerGlbCtrl?.isLoaded()) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['forest_deer'],
              'lie',
              1.0
            );
            rig.deerGlbCtrl.setState('lie');
            rig.deerGlbCtrl.update(dt * spd, 0);
          } else if (a.species === 'bear' && rig.bearCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['forest_bear'],
              'lie',
              1.0
            );
            rig.bearCtrl.setState('lie');
            rig.bearCtrl.update(dt * spd, 0);
          } else if (a.species === 'crocodile' && rig.crocodileCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['river_crocodile'],
              'lie',
              1.0
            );
            rig.crocodileCtrl.setState('lie');
            rig.crocodileCtrl.update(dt * spd, 0);
          } else if (a.species === 'jaguar' && rig.jaguarCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['jungle_jaguar'],
              'lie',
              1.0
            );
            rig.jaguarCtrl.setState('lie');
            rig.jaguarCtrl.update(dt * spd, 0);
          } else if (a.species === 'wolf' && rig.wolfCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['forest_wolf'],
              'lie',
              1.0
            );
            rig.wolfCtrl.setState('lie');
            rig.wolfCtrl.update(dt * spd, 0);
          } else if (a.species === 'rhino' && rig.rhinoCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['savanna_rhino'],
              'lie',
              1.0
            );
            rig.rhinoCtrl.moveSpeed = 0;
            rig.rhinoCtrl.setState('lie');
            rig.rhinoCtrl.update(dt * spd, 0);
          } else if (a.species === 'lion' && rig.lionCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['savanna_lion'],
              'lie',
              1.0
            );
            rig.lionCtrl.setState('lie');
            rig.lionCtrl.update(dt * spd, 0);
          } else if (a.species === 'stag' && rig.stagCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['royal_stag'],
              'lie',
              1.0
            );
            rig.stagCtrl.setState('lie');
            rig.stagCtrl.update(dt * spd, 0);
          } else if (a.species === 'hippo' && rig.hippoCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['oasis_hippo'],
              'lie',
              1.0
            );
            rig.hippoCtrl.setState('lie');
            rig.hippoCtrl.update(dt * spd, 0);
          } else if (a.species === 'koifish' && rig.koifishCtrl) {
            const sleepUnderwaterY = Math.min(a.y, WATER_LEVEL - 0.62);
            rig.root.position.set(a.x, sleepUnderwaterY, a.z);
            rig.root.rotation.set(0, a.yaw, 0, 'YXZ');
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            rig.koifishCtrl.setState('idle');
            rig.koifishCtrl.update(dt * 0.22, 0);
          } else {
            const sleepDrop = a.species === 'deer' ? -0.46 : a.species === 'sheep' ? -0.22 : -0.05;
            rig.posePivot.position.set(0, sleepDrop, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            if (rig.headPivot) {
              rig.headPivot.rotation.x = 0.42 + Math.sin(elapsedTime * 1.4 + i) * 0.04;
            }
            if (rig.legs) {
              for (let l = 0; l < rig.legs.length; l++) {
                rig.legs[l].rotation.x = l < 2 ? 1.15 : -1.15;
              }
            }
          }
        } else if (a.species === 'bear' && rig.bearCtrl) {
          const swimPitch = a.inWater ? -0.10 : 0;
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch + swimPitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.05 + i * 1.41) % 1;
          const desiredBearState: BearState =
            ai === 'attacking'
              ? 'attack'
              : ai === 'roaring'
                ? 'roar'
                : ai === 'stomping'
                  ? 'stomp'
                  : a.inWater && moveSpd > 0.08
                    ? 'walk'
                    : (ai === 'fleeing' || a.alertLevel === 'fleeing') && moveSpd > 0.14
                      ? 'flee'
                      : ai === 'charging' || moveSpd > 3.2
                        ? 'run'
                        : ai === 'stalking' || moveSpd > 2.0
                          ? 'trot'
                          : moveSpd > 0.12
                            ? 'walk'
                            : ai === 'sitting'
                              ? 'sit'
                              : ai === 'grazing' && cycleSlot < 0.72
                                ? 'eat'
                                : 'idle';
          const isUrgent =
            a.inWater ||
            desiredBearState === 'attack' ||
            desiredBearState === 'roar' ||
            desiredBearState === 'stomp' ||
            desiredBearState === 'flee' ||
            desiredBearState === 'run';
          const bearState = selectStabilizedState(rig, desiredBearState, dt, isUrgent);
          const spd =
            getEffectiveLabAnimationSpeed(liveLabOverrides['forest_bear'], bearState, 1.0) *
            (a.inWater ? 0.78 : 1.0);
          rig.bearCtrl.setState(bearState);
          rig.bearCtrl.update(dt * spd, turnAmount);

          // Sync Heavy Steel Bear Trap clamped onto Bear's front paw during the 4-legged roar animation!
          if (rig.pawBearTrapGroup) {
            const isPawTrapped = (a.trappedByBearJawTimer ?? 0) > 0 && !a.isDead;
            rig.pawBearTrapGroup.visible = isPawTrapped;
            if (isPawTrapped) {
              const pawBone =
                rig.bearCtrl.rig?.bones[17] ??
                rig.bearCtrl.rig?.bones[16] ??
                rig.bearCtrl.rig?.bones[15];
              if (pawBone) {
                pawBone.updateWorldMatrix(true, false);
                pawBone.getWorldPosition(tmpPawWorldPos);
                rig.root.updateWorldMatrix(true, false);
                rig.root.worldToLocal(tmpPawWorldPos);
                rig.pawBearTrapGroup.position.set(
                  tmpPawWorldPos.x,
                  Math.max(0.04, tmpPawWorldPos.y),
                  tmpPawWorldPos.z
                );
              } else {
                rig.pawBearTrapGroup.position.set(
                  0.26,
                  0.14 + Math.abs(Math.sin(elapsedTime * 7.5)) * 0.08,
                  0.65
                );
              }
              rig.pawBearTrapGroup.rotation.set(
                Math.sin(elapsedTime * 9.0) * 0.16,
                0.22,
                Math.cos(elapsedTime * 7.0) * 0.14
              );
            }
          }
        } else if (a.species === 'crocodile' && rig.crocodileCtrl) {
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.05 + i * 1.91) % 1;
          const desiredCrocState: CrocodileState =
            ai === 'attacking'
              ? 'attack'
              : ai === 'roaring'
                ? 'roar'
                : (ai === 'fleeing' || a.alertLevel === 'fleeing') && moveSpd > 0.14
                  ? 'flee'
                  : moveSpd > 2.8
                    ? 'run'
                    : moveSpd > 1.5
                      ? 'trot'
                      : moveSpd > 0.14
                        ? 'walk'
                        : ai === 'sitting'
                          ? 'sit'
                          : ai === 'grazing' && cycleSlot < 0.65
                            ? 'eat'
                            : 'idle';
          const isUrgent =
            desiredCrocState === 'attack' ||
            desiredCrocState === 'roar' ||
            desiredCrocState === 'flee' ||
            desiredCrocState === 'run';
          const crocState = selectStabilizedState(rig, desiredCrocState, dt, isUrgent);
          const spd =
            getEffectiveLabAnimationSpeed(liveLabOverrides['river_crocodile'], crocState, 1.0) *
            (a.inWater && moveSpd > 0.14 ? 1.28 : 1.0);
          rig.crocodileCtrl.setState(crocState);
          rig.crocodileCtrl.update(dt * spd, turnAmount);
        } else if (a.species === 'jaguar' && rig.jaguarCtrl) {
          const pounceY = a.inWater ? 0 : (a.pounceHeight ?? 0);
          const pouncePitch = a.inWater ? -0.10 : pounceY > 0.02 ? -0.18 * (pounceY / 0.56) : 0;
          rig.root.position.set(a.x, a.y + pounceY, a.z);
          rig.root.rotation.set(slope.pitch + pouncePitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.05 + i * 1.57) % 1;
          const desiredJaguarState: JaguarState =
            ai === 'attacking'
              ? 'attack'
              : ai === 'roaring'
                ? 'roar'
                : a.inWater && moveSpd > 0.08
                  ? 'walk'
                  : (ai === 'fleeing' || a.alertLevel === 'fleeing') && moveSpd > 0.14
                    ? 'flee'
                    : moveSpd > 3.8
                      ? 'run'
                      : ai === 'stalking' && moveSpd > 0.14
                        ? 'stalk'
                        : moveSpd > 2.2
                          ? 'trot'
                          : moveSpd > 0.14
                            ? 'walk'
                            : ai === 'sitting'
                              ? 'sit'
                              : ai === 'grazing' && cycleSlot < 0.68
                                ? 'eat'
                                : 'idle';
          const isUrgent =
            a.inWater ||
            desiredJaguarState === 'attack' ||
            desiredJaguarState === 'roar' ||
            desiredJaguarState === 'flee' ||
            desiredJaguarState === 'run';
          const jaguarState = selectStabilizedState(rig, desiredJaguarState, dt, isUrgent);
          const spd =
            getEffectiveLabAnimationSpeed(liveLabOverrides['jungle_jaguar'], jaguarState, 1.0) *
            (a.inWater ? 0.72 : 1.0);
          rig.jaguarCtrl.setState(jaguarState);
          rig.jaguarCtrl.update(dt * spd, turnAmount);
        } else if (a.species === 'wolf' && rig.wolfCtrl) {
          const pounceY = a.inWater ? 0 : (a.pounceHeight ?? 0);
          const pouncePitch = a.inWater ? -0.10 : pounceY > 0.02 ? -0.18 * (pounceY / 0.56) : 0;
          rig.root.position.set(a.x, a.y + pounceY, a.z);
          rig.root.rotation.set(slope.pitch + pouncePitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.05 + i * 1.49) % 1;
          const desiredWolfState: WolfState =
            ai === 'attacking'
              ? 'attack'
              : ai === 'roaring'
                ? i % 2 === 0
                  ? 'howl'
                  : 'roar'
                : a.inWater && moveSpd > 0.08
                  ? 'walk'
                  : (ai === 'fleeing' || a.alertLevel === 'fleeing') && moveSpd > 0.14
                    ? 'flee'
                    : moveSpd > 3.6
                      ? 'run'
                      : ai === 'stalking' && moveSpd > 0.14
                        ? 'stalk'
                        : moveSpd > 2.0
                          ? 'trot'
                          : moveSpd > 0.14
                            ? 'walk'
                            : ai === 'sitting'
                              ? 'sit'
                              : ai === 'grazing' && cycleSlot < 0.65
                                ? 'eat'
                                : 'idle';
          const isUrgent =
            a.inWater ||
            desiredWolfState === 'attack' ||
            desiredWolfState === 'roar' ||
            desiredWolfState === 'howl' ||
            desiredWolfState === 'flee' ||
            desiredWolfState === 'run';
          const wolfState = selectStabilizedState(rig, desiredWolfState, dt, isUrgent);
          const spd =
            getEffectiveLabAnimationSpeed(liveLabOverrides['forest_wolf'], wolfState, 1.0) *
            (a.inWater ? 0.72 : 1.0);
          rig.wolfCtrl.setState(wolfState);
          rig.wolfCtrl.update(dt * spd, turnAmount);
        } else if (a.species === 'rhino' && rig.rhinoCtrl) {
          const swimPitch = a.inWater ? -0.10 : 0;
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch + swimPitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.05 + i * 1.63) % 1;
          const desiredRhinoState: RhinoState =
            ai === 'attacking'
              ? 'attack'
              : ai === 'roaring'
                ? 'roar'
                : a.inWater && moveSpd > 0.08
                  ? 'walk'
                  : (ai === 'fleeing' || a.alertLevel === 'fleeing') && moveSpd > 0.14
                    ? 'flee'
                    : moveSpd > 3.2
                      ? 'run'
                      : moveSpd > 1.8
                        ? 'trot'
                        : moveSpd > 0.14
                          ? 'walk'
                          : ai === 'sitting'
                            ? 'sit'
                            : ai === 'grazing' && cycleSlot < 0.68
                              ? 'eat'
                              : 'idle';
          const isUrgent =
            a.inWater ||
            desiredRhinoState === 'attack' ||
            desiredRhinoState === 'roar' ||
            desiredRhinoState === 'flee' ||
            desiredRhinoState === 'run';
          const rhinoState = selectStabilizedState(rig, desiredRhinoState, dt, isUrgent);
          const spd =
            getEffectiveLabAnimationSpeed(liveLabOverrides['savanna_rhino'], rhinoState, 1.0) *
            (a.inWater ? 0.72 : 1.0);
          rig.rhinoCtrl.moveSpeed = moveSpd;
          rig.rhinoCtrl.setState(rhinoState);
          rig.rhinoCtrl.update(dt * spd, turnAmount);
        } else if (a.species === 'lion' && rig.lionCtrl) {
          const pounceY = a.inWater ? 0 : (a.pounceHeight ?? 0);
          const pouncePitch = a.inWater ? -0.10 : pounceY > 0.02 ? -0.18 * (pounceY / 0.56) : 0;
          rig.root.position.set(renderX, renderY + pounceY, renderZ);
          rig.root.rotation.set(slope.pitch + pouncePitch, renderYaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.05 + i * 1.53) % 1;
          const desiredLionState: CatLionState = a.isMountedByPlayer
            ? ai === 'attacking' && (a.actionTimer ?? 0) > 0
              ? 'attack'
              : moveSpd > 5.4
                ? 'run'
                : moveSpd > 1.8
                  ? 'trot'
                  : moveSpd > 0.15
                    ? 'walk'
                    : 'idle'
            : a.isSubdued
              ? 'sit'
              : ai === 'attacking'
                ? 'attack'
                : ai === 'roaring'
                  ? 'roar'
                  : a.inWater && moveSpd > 0.08
                    ? 'walk'
                    : (ai === 'fleeing' || a.alertLevel === 'fleeing') && moveSpd > 0.14
                      ? 'flee'
                      : moveSpd > 3.8
                        ? 'run'
                        : ai === 'stalking' && moveSpd > 0.14
                          ? 'stalk'
                          : moveSpd > 2.1
                            ? 'trot'
                            : moveSpd > 0.14
                              ? 'walk'
                              : ai === 'sitting'
                                ? 'sit'
                                : ai === 'grazing' && cycleSlot < 0.68
                                  ? 'eat'
                                  : 'idle';
          const isUrgent =
            Boolean(a.isMountedByPlayer) ||
            Boolean(a.isSubdued) ||
            a.inWater ||
            desiredLionState === 'attack' ||
            desiredLionState === 'roar' ||
            desiredLionState === 'flee' ||
            desiredLionState === 'run';
          const lionState = selectStabilizedState(rig, desiredLionState, dt, isUrgent);
          const spd =
            getEffectiveLabAnimationSpeed(liveLabOverrides['savanna_lion'], lionState, 1.0) *
            (a.inWater ? 0.72 : 1.0);
          rig.lionCtrl.setState(lionState);
          rig.lionCtrl.update(dt * spd, turnAmount);
        } else if (a.species === 'stag' && rig.stagCtrl) {
          const swimPitch = a.inWater ? -0.10 : 0;
          rig.root.position.set(renderX, renderY, renderZ);
          rig.root.rotation.set(slope.pitch + swimPitch, renderYaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.20 + i * 1.67) % 1;
          const isMountedStagAirborne =
            Boolean(a.isMountedByPlayer) &&
            Boolean(renderPlayer && !renderPlayer.onGround && Math.abs(renderPlayer.vy) > 0.5);
          const desiredStagState: StagState = a.isMountedByPlayer
            ? isMountedStagAirborne
              ? 'skip'
              : moveSpd > 8.6
                ? 'run'
                : moveSpd > 4.5
                  ? 'trot'
                  : moveSpd > 0.15
                    ? 'walk'
                    : 'idle'
            : a.inWater
              ? 'walk'
              : ai === 'attacking'
                ? 'attack'
                : ai === 'roaring'
                  ? 'roar'
                  : ai === 'charging'
                    ? 'run'
                    : ai === 'fleeing' || a.alertLevel === 'fleeing'
                      ? 'flee'
                      : ai === 'listening' || a.alertLevel === 'curious'
                        ? cycleSlot > 0.76
                          ? 'call'
                          : 'idle'
                        : moveSpd > 3.2
                          ? 'run'
                          : moveSpd > 2.1
                            ? 'trot'
                            : moveSpd > 0.16
                              ? 'walk'
                              : cycleSlot < 0.68
                                ? 'eat'
                                : cycleSlot < 0.90
                                  ? 'idle'
                                  : 'call';
          const isUrgentStag =
            Boolean(a.isMountedByPlayer) ||
            a.inWater ||
            desiredStagState === 'skip' ||
            desiredStagState === 'attack' ||
            desiredStagState === 'roar' ||
            desiredStagState === 'flee' ||
            desiredStagState === 'run';
          const stagState = selectStabilizedState(rig, desiredStagState, dt, isUrgentStag);
          const spd =
            getEffectiveLabAnimationSpeed(liveLabOverrides['royal_stag'], stagState, 1.0) *
            (a.inWater ? 0.72 : 1.0);
          rig.stagCtrl.setState(stagState);
          rig.stagCtrl.update(dt * spd, turnAmount);
        } else if (a.species === 'hippo' && rig.hippoCtrl) {
          const swimPitch = a.inWater && moveSpd > 0.15 ? -0.06 : 0;
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch + swimPitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.08 + i * 1.51) % 1;
          const desiredHippoState: HippoState =
            ai === 'attacking'
              ? 'attack'
              : ai === 'roaring'
                ? 'roar'
                : (ai === 'fleeing' || a.alertLevel === 'fleeing') && moveSpd > 0.14
                  ? 'flee'
                  : ai === 'charging' || moveSpd > 3.2
                    ? 'run'
                    : moveSpd > 1.8
                      ? 'trot'
                      : moveSpd > 0.12
                        ? 'walk'
                        : ai === 'sitting'
                          ? (i % 2 === 0 ? 'lie' : 'sit')
                          : ai === 'grazing' && cycleSlot < 0.68
                            ? 'eat'
                            : cycleSlot > 0.9
                              ? 'call'
                              : 'idle';
          const isUrgentHippo =
            desiredHippoState === 'attack' ||
            desiredHippoState === 'roar' ||
            desiredHippoState === 'flee' ||
            desiredHippoState === 'run';
          const hippoState = selectStabilizedState(rig, desiredHippoState, dt, isUrgentHippo);
          const spd =
            getEffectiveLabAnimationSpeed(liveLabOverrides['oasis_hippo'], hippoState, 1.0) *
            (a.inWater && moveSpd > 0.12 ? 0.92 : 1.0);
          rig.hippoCtrl.moveSpeed = moveSpd;
          rig.hippoCtrl.setState(hippoState);
          rig.hippoCtrl.update(dt * spd, turnAmount);
        } else if (a.species === 'koifish' && rig.koifishCtrl) {
          const breachY = a.pounceHeight ?? 0;
          const swimPitch =
            breachY > 0.04
              ? -0.22 * (breachY / 0.34)
              : ai === 'grazing'
                ? -0.06
                : 0;
          const clampedBankRoll = Math.max(-0.1, Math.min(0.1, turnAmount * -0.07));
          rig.root.position.set(a.x, a.y + breachY, a.z);
          rig.root.rotation.set(swimPitch, a.yaw, clampedBankRoll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const desiredKoiState: KoiFishState =
            breachY > 0.08
              ? 'skip'
              : ai === 'fleeing' || a.alertLevel === 'fleeing'
                ? 'flee'
                : moveSpd > 2.2
                  ? 'run'
                  : moveSpd > 1.52
                    ? 'trot'
                    : ai === 'grazing'
                      ? 'eat'
                      : 'walk';
          const isUrgentKoi = desiredKoiState === 'skip' || desiredKoiState === 'flee';
          const koiState = selectStabilizedState(rig, desiredKoiState, dt, isUrgentKoi);
          const spd = getEffectiveLabAnimationSpeed(liveLabOverrides['koi_fish'], koiState, 1.0);
          rig.koifishCtrl.setState(koiState);
          rig.koifishCtrl.update(dt * spd, turnAmount);
        } else if (a.species === 'dolphin' && rig.dolphinCtrl) {
          const leapY = a.pounceHeight ?? 0;
          const leapCycle = (elapsedTime + a.id * 3.17) % 9.5;
          const leapPitch =
            leapY > 0.05 && leapCycle < 1.15
              ? Math.cos((leapCycle / 1.15) * Math.PI) * -0.58
              : Math.sin(elapsedTime * 2.1 + a.id) * -0.06;
          rig.root.position.set(a.x, a.y + leapY, a.z);
          rig.root.rotation.set(leapPitch, a.yaw, turnAmount * -0.25, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const desiredDolphinState: DolphinState =
            leapY > 0.08
              ? 'fly'
              : moveSpd > 5.0
                ? 'run'
                : moveSpd > 3.2
                  ? 'trot'
                  : 'walk';
          const isUrgentDolphin = desiredDolphinState === 'fly' || desiredDolphinState === 'run';
          const dolphinState = selectStabilizedState(
            rig,
            desiredDolphinState,
            dt,
            isUrgentDolphin
          );
          const spd = getEffectiveLabAnimationSpeed(
            liveLabOverrides['ocean_dolphin'],
            dolphinState,
            1.0
          );
          rig.dolphinCtrl.setState(dolphinState);
          rig.dolphinCtrl.update(dt * spd, turnAmount);
        } else if (a.species === 'deer' || a.species === 'sheep') {
          const swimPitch = a.inWater ? -0.10 : 0;
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch + swimPitch, a.yaw, slope.roll, 'YXZ');

          if (a.species === 'deer' && rig.deerGlbCtrl?.isLoaded()) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const cycleSlot = (elapsedTime * 0.22 + i * 1.73) % 1;
            const desiredDeerState = a.inWater
              ? 'walk'
              : ai === 'fleeing' || a.alertLevel === 'fleeing'
                ? i % 3 === 0 && moveSpd > 3.8
                  ? 'skip'
                  : 'flee'
                : ai === 'listening' || a.alertLevel === 'curious'
                  ? cycleSlot > 0.76
                    ? 'call'
                    : 'idle'
                  : moveSpd > 3.2
                    ? 'run'
                    : moveSpd > 2.1
                      ? 'trot'
                      : moveSpd > 0.16
                        ? 'walk'
                        : cycleSlot < 0.68
                          ? 'eat'
                          : cycleSlot < 0.90
                            ? 'idle'
                            : 'call';
            const isUrgentDeer =
              a.inWater ||
              desiredDeerState === 'flee' ||
              desiredDeerState === 'skip' ||
              desiredDeerState === 'run';
            const deerState = selectStabilizedState(rig, desiredDeerState, dt, isUrgentDeer);
            const turnHint =
              ai === 'listening' || a.alertLevel === 'curious'
                ? Math.sin(elapsedTime * 2.2 + i) * 0.42
                : moveSpd > 0.2
                  ? turnAmount || Math.sin(elapsedTime * 1.1 + i * 2.1) * 0.22
                  : 0;
            const spd =
              getEffectiveLabAnimationSpeed(liveLabOverrides['forest_deer'], deerState, 1.0) *
              (a.inWater ? 0.72 : 1.0);
            rig.deerGlbCtrl.setState(deerState);
            rig.deerGlbCtrl.update(dt * spd, turnHint);
          } else {
            const targetStrideAmp = a.inWater
              ? 0.32
              : moveSpd > 0.14
                ? Math.min(0.62, 0.24 + moveSpd * 0.065)
                : 0;
            const legBlend = Math.min(1, dt * 10.0);
            rig.smoothLegAmp += (targetStrideAmp - rig.smoothLegAmp) * legBlend;

            const stride = Math.sin(a.hopPhase) * rig.smoothLegAmp;
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            if (rig.legs && rig.legs.length === 4) {
              rig.legs[0].rotation.x = stride;
              rig.legs[1].rotation.x = -stride;
              rig.legs[2].rotation.x = -stride;
              rig.legs[3].rotation.x = stride;
            }

            const targetHeadDip = a.inWater
              ? -0.22
              : a.alertLevel === 'fleeing'
                ? -0.18
                : a.alertLevel === 'curious' || ai === 'listening'
                  ? -0.12
                  : moveSpd < 0.16
                    ? 0.94
                    : 0.06 + Math.sin(a.hopPhase * 2.0) * 0.04;
            const dipBlend = Math.min(1, dt * 5.2);
            rig.smoothHeadDip += (targetHeadDip - rig.smoothHeadDip) * dipBlend;

            if (rig.headPivot) {
              rig.headPivot.rotation.x = rig.smoothHeadDip * 0.75;
            }
          }
        } else {
          const climbPitch = a.species === 'squirrel' ? (a.treeClimbPitch ?? 0) : 0;
          const isClimbingTree = Math.abs(climbPitch) > 0.05;
          const hopHeight =
            !isClimbingTree && !a.inWater && moveSpd > 0.35
              ? Math.max(0, Math.sin(a.hopPhase)) * 0.22
              : 0;
          const swimPitch = a.inWater ? -0.10 : 0;
          rig.root.position.set(a.x, a.y + hopHeight, a.z);
          if (isClimbingTree) {
            const rollOsc =
              a.treeState === 'climb_up' || a.treeState === 'climb_down'
                ? Math.sin(elapsedTime * 5.5 + i) * 0.04
                : 0;
            rig.root.rotation.set(
              climbPitch,
              a.yaw,
              rollOsc,
              'YXZ'
            );
          } else {
            rig.root.rotation.set(
              slope.pitch + swimPitch + (hopHeight > 0.02 ? -0.18 : 0),
              a.yaw,
              slope.roll,
              'YXZ'
            );
          }
          if (rig.tailMesh) {
            rig.tailMesh.rotation.x =
              0.42 +
              Math.sin(elapsedTime * (isClimbingTree ? 11.5 : 8.5) + i) *
                (isClimbingTree ? 0.24 : 0.16);
          }
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
        }
      }

      // Sync active footprints
      const activePrints = footprintState.decals;
      for (let i = 0; i < MAX_FOOTPRINT_DECALS; i++) {
        const slot = footprintPool[i];
        const fp = activePrints[i];
        if (fp && fp.active) {
          slot.mesh.visible = true;
          slot.mesh.position.set(fp.x, fp.y, fp.z);
          slot.mesh.rotation.y = fp.yaw;
          const scale = fp.kind === 'hoof' ? 1.45 : 1.0;
          slot.mesh.scale.set(scale, 1, scale);
          slot.mat.opacity = fp.opacity;
          slot.mat.color.setHex(fp.surfaceTint === 'snow' ? 0x64748b : 0x292524);
        } else {
          slot.mesh.visible = false;
        }
      }
    },
  };
}
// #endregion
