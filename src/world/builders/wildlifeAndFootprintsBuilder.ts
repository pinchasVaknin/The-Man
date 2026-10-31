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
import { createReadyBear, type BearState } from '../models/Bear';
import { createReadyCrocodile, type CrocodileState } from '../models/Crocodile';
import { createReadyJaguar, type JaguarState } from '../models/Jaguar';
import { createReadyWolf, type WolfState } from '../models/Wolf';
import { createReadyRhino, type RhinoState } from '../models/Rhino';
import {
  getSurfaceNormalAt,
  computeSlopePitchAndRoll,
} from '../systems/terrainAndBiomeSystem';
import { SAVED_LAB_OVERRIDES } from '../../config/savedLabOverrides';
import {
  getEffectiveLabAnimationSpeed,
  type ILabPoseOverrides,
} from '../../lab/labCatalog';

export interface IWildlifeSoundCallbacks {
  onBirdFlockStartled?: (distance: number, count: number) => void;
  onCritterScampered?: (distance: number, species: 'rabbit' | 'squirrel') => void;
  onAmbientWildlifeProximity?: (nearestBirdDist: number, nearestCritterDist: number) => void;
}
export type WildlifeSoundCallbacks = IWildlifeSoundCallbacks;

export interface IWildlifeAndFootprintsHandles {
  readonly birds: IBoidBirdState[];
  readonly animals: ISmallAnimalState[];
  readonly update: (
    dt: number,
    elapsedTime: number,
    playerState: IPlayerState,
    horses: readonly IRideableHorseState[],
    daylightFactor: number,
    soundCallbacks?: IWildlifeSoundCallbacks,
    rainIntensity?: number
  ) => void;
}
export type WildlifeAndFootprintsHandles = IWildlifeAndFootprintsHandles;
// #endregion

// ======================== BUILDER IMPLEMENTATION ======================== \\
// #region Builder Implementation
export function buildWildlifeAndFootprintsLayer(
  scene: THREE.Scene,
  disposableGeometries: THREE.BufferGeometry[],
  disposableMaterials: THREE.Material[]
): IWildlifeAndFootprintsHandles {
  const { birds, animals } = createInitialWildlifeState();
  const footprintState = createFootprintTrailTracker();

  const layerGroup = new THREE.Group();
  layerGroup.name = 'WildlifeAndFootprintsLayer';
  scene.add(layerGroup);

  // --- 1. FLOCKING BOID BIRDS (3D Articulated Wings) ---
  const birdBodyMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.75,
  });
  const birdWingMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(birdBodyMat, birdWingMat);

  const birdBodyGeo = new THREE.ConeGeometry(0.11, 0.44, 5);
  birdBodyGeo.rotateX(Math.PI * 0.5);
  const birdWingGeo = new THREE.BoxGeometry(0.38, 0.02, 0.18);
  disposableGeometries.push(birdBodyGeo, birdWingGeo);

  const birdMeshes: Array<{
    root: THREE.Group;
    leftWing: THREE.Mesh;
    rightWing: THREE.Mesh;
  }> = [];

  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const root = new THREE.Group();
    root.position.set(b.x, b.y, b.z);

    const body = new THREE.Mesh(birdBodyGeo, birdBodyMat);
    const leftWing = new THREE.Mesh(birdWingGeo, birdWingMat);
    leftWing.position.set(-0.18, 0, 0);
    const rightWing = new THREE.Mesh(birdWingGeo, birdWingMat);
    rightWing.position.set(0.18, 0, 0);

    root.add(body, leftWing, rightWing);
    layerGroup.add(root);
    birdMeshes.push({ root, leftWing, rightWing });
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
    try {
      const raw = window.localStorage.getItem('lab_pose_overrides_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ILabPoseOverrides>;
        liveLabOverrides = { ...SAVED_LAB_OVERRIDES, ...parsed };
      }
    } catch {
      // Ignore storage errors
    }
    window.addEventListener('lab-overrides-saved', (ev: Event) => {
      const customEv = ev as CustomEvent<Record<string, ILabPoseOverrides>>;
      if (customEv.detail) {
        liveLabOverrides = { ...SAVED_LAB_OVERRIDES, ...customEv.detail };
      }
    });
  }

  interface IAnimalMeshRig {
    root: THREE.Group;
    posePivot: THREE.Group;
    headPivot?: THREE.Group;
    legs?: THREE.Mesh[];
    deerGlbCtrl?: ReturnType<typeof attachDeerGlbModel>;
    bearCtrl?: ReturnType<typeof createReadyBear>;
    crocodileCtrl?: ReturnType<typeof createReadyCrocodile>;
    jaguarCtrl?: ReturnType<typeof createReadyJaguar>;
    wolfCtrl?: ReturnType<typeof createReadyWolf>;
    rhinoCtrl?: ReturnType<typeof createReadyRhino>;
    smoothHeadDip: number;
    smoothLegAmp: number;
    lastAnimState?: string;
    stateHoldTimer?: number;
  }
  const animalMeshes: IAnimalMeshRig[] = [];

  const selectStabilizedState = <T extends string>(
    rig: IAnimalMeshRig,
    desiredState: T,
    dt: number,
    isUrgent: boolean
  ): T => {
    rig.stateHoldTimer = Math.max(0, (rig.stateHoldTimer ?? 0) - dt);
    if (!rig.lastAnimState) {
      rig.lastAnimState = desiredState;
      rig.stateHoldTimer = 0.36;
      return desiredState;
    }
    if (desiredState === rig.lastAnimState) {
      return desiredState;
    }
    if (isUrgent || (rig.stateHoldTimer ?? 0) <= 0) {
      rig.lastAnimState = desiredState;
      rig.stateHoldTimer = isUrgent ? 0.24 : 0.42;
      return desiredState;
    }
    return rig.lastAnimState as T;
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
      const bearCtrl = createReadyBear({
        castShadow: true,
        receiveShadow: true,
      });
      posePivot.add(bearCtrl.object);
      const bearMat = bearCtrl.mesh.material;
      if (Array.isArray(bearMat)) {
        for (const m of bearMat) disposableMaterials.push(m);
      } else {
        disposableMaterials.push(bearMat);
      }
      disposableGeometries.push(bearCtrl.mesh.geometry);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({
        root,
        posePivot,
        bearCtrl,
        smoothHeadDip: 0,
        smoothLegAmp: 0,
      });
    } else if (a.species === 'crocodile') {
      const crocodileCtrl = createReadyCrocodile({
        castShadow: true,
        receiveShadow: true,
      });
      posePivot.add(crocodileCtrl.object);
      const crocMat = crocodileCtrl.mesh.material;
      if (Array.isArray(crocMat)) {
        for (const m of crocMat) disposableMaterials.push(m);
      } else {
        disposableMaterials.push(crocMat);
      }
      disposableGeometries.push(crocodileCtrl.mesh.geometry);

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
      const jaguarCtrl = createReadyJaguar({
        castShadow: true,
        receiveShadow: true,
      });
      posePivot.add(jaguarCtrl.object);
      const jagMat = jaguarCtrl.mesh.material;
      if (Array.isArray(jagMat)) {
        for (const m of jagMat) disposableMaterials.push(m);
      } else {
        disposableMaterials.push(jagMat);
      }
      disposableGeometries.push(jaguarCtrl.mesh.geometry);

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
      const wolfCtrl = createReadyWolf({
        castShadow: true,
        receiveShadow: true,
      });
      posePivot.add(wolfCtrl.object);
      const wolfMat = wolfCtrl.mesh.material;
      if (Array.isArray(wolfMat)) {
        for (const m of wolfMat) disposableMaterials.push(m);
      } else {
        disposableMaterials.push(wolfMat);
      }
      disposableGeometries.push(wolfCtrl.mesh.geometry);

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
      const rhinoCtrl = createReadyRhino({
        castShadow: true,
        receiveShadow: true,
      });
      posePivot.add(rhinoCtrl.object);
      const rhinoMat = rhinoCtrl.mesh.material;
      if (Array.isArray(rhinoMat)) {
        for (const m of rhinoMat) disposableMaterials.push(m);
      } else {
        disposableMaterials.push(rhinoMat);
      }
      disposableGeometries.push(rhinoCtrl.mesh.geometry);

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
    } else {
      const mat = a.species === 'rabbit' ? rabbitFurMat : squirrelFurMat;
      const body = new THREE.Mesh(critterBodyGeo, mat);
      body.position.set(0, 0.15, 0);
      const head = new THREE.Mesh(critterHeadGeo, mat);
      head.position.set(0, 0.24, 0.18);
      posePivot.add(body, head);

      if (a.species === 'rabbit') {
        const earL = new THREE.Mesh(rabbitEarGeo, mat);
        earL.position.set(-0.045, 0.36, 0.16);
        earL.rotation.x = -0.15;
        const earR = new THREE.Mesh(rabbitEarGeo, mat);
        earR.position.set(0.045, 0.36, 0.16);
        earR.rotation.x = -0.15;
        posePivot.add(earL, earR);
      } else {
        const tail = new THREE.Mesh(squirrelTailGeo, mat);
        tail.position.set(0, 0.26, -0.22);
        tail.rotation.x = 0.45;
        posePivot.add(tail);
      }

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({ root, posePivot, smoothHeadDip: 0, smoothLegAmp: 0 });
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
    update: (
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

      // Sync bird meshes
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i];
        const m = birdMeshes[i];
        m.root.visible = !b.roosting;
        if (b.roosting) continue;

        m.root.position.set(b.x, b.y, b.z);
        const yaw = Math.atan2(b.vx, b.vz);
        const horizSpd = Math.hypot(b.vx, b.vz) || 1;
        const pitch = -Math.atan2(b.vy, horizSpd) * 0.5;
        m.root.rotation.set(pitch, yaw, 0, 'YXZ');

        const flap = Math.sin(b.wingPhase) * 0.65;
        m.leftWing.rotation.z = flap;
        m.rightWing.rotation.z = -flap;
      }

      // Sync ground animal meshes (Rabbits, Squirrels, Deer, Sheep, Bears, Crocodiles, Jaguars, Wolves)
      for (let i = 0; i < animals.length; i++) {
        const a = animals[i];
        const rig = animalMeshes[i];

        if (a.isLooted) {
          rig.root.visible = false;
          continue;
        }
        rig.root.visible = true;

        // Compute terrain slope alignment (pitch & roll) for mountain/hill walking
        const n = getSurfaceNormalAt(a.x, a.z);
        const slope = computeSlopePitchAndRoll(n.nx, n.ny, n.nz, a.yaw, 0.48);

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
            rig.rhinoCtrl.setState('death');
            rig.rhinoCtrl.update(dt * spd);
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

        const moveSpd = Math.hypot(a.vx, a.vz);
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
            rig.bearCtrl.update(dt * spd);
          } else if (a.species === 'crocodile' && rig.crocodileCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['river_crocodile'],
              'lie',
              1.0
            );
            rig.crocodileCtrl.setState('lie');
            rig.crocodileCtrl.update(dt * spd);
          } else if (a.species === 'jaguar' && rig.jaguarCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['jungle_jaguar'],
              'lie',
              1.0
            );
            rig.jaguarCtrl.setState('lie');
            rig.jaguarCtrl.update(dt * spd);
          } else if (a.species === 'wolf' && rig.wolfCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['forest_wolf'],
              'lie',
              1.0
            );
            rig.wolfCtrl.setState('lie');
            rig.wolfCtrl.update(dt * spd);
          } else if (a.species === 'rhino' && rig.rhinoCtrl) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['savanna_rhino'],
              'lie',
              1.0
            );
            rig.rhinoCtrl.setState('lie');
            rig.rhinoCtrl.update(dt * spd);
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
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.14 + i * 1.41) % 1;
          const desiredBearState: BearState =
            ai === 'fleeing' || a.alertLevel === 'fleeing'
              ? 'flee'
              : ai === 'attacking'
                ? 'attack'
                : ai === 'roaring'
                  ? 'roar'
                  : ai === 'stomping'
                    ? 'stomp'
                    : ai === 'charging' || moveSpd > 3.6
                      ? 'run'
                      : a.inWater || ai === 'stalking' || ai === 'seeking_shelter' || moveSpd > 2.0
                        ? 'trot'
                        : moveSpd > 0.16
                          ? 'walk'
                          : ai === 'sitting'
                            ? 'sit'
                            : ai === 'grazing'
                              ? cycleSlot < 0.72
                                ? 'eat'
                                : 'idle'
                              : cycleSlot < 0.55
                                ? 'idle'
                                : 'call';
          const isUrgent =
            desiredBearState === 'attack' ||
            desiredBearState === 'roar' ||
            desiredBearState === 'stomp' ||
            desiredBearState === 'flee' ||
            desiredBearState === 'run';
          const bearState = selectStabilizedState(rig, desiredBearState, dt, isUrgent);
          const spd = getEffectiveLabAnimationSpeed(
            liveLabOverrides['forest_bear'],
            bearState,
            1.0
          );
          rig.bearCtrl.setState(bearState);
          rig.bearCtrl.update(dt * spd);
        } else if (a.species === 'crocodile' && rig.crocodileCtrl) {
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.13 + i * 1.91) % 1;
          const desiredCrocState: CrocodileState =
            ai === 'fleeing' || a.alertLevel === 'fleeing'
              ? 'flee'
              : ai === 'attacking'
                ? 'attack'
                : ai === 'roaring'
                  ? 'roar'
                  : ai === 'charging' || moveSpd > 3.0
                    ? 'run'
                    : ai === 'stalking' || moveSpd > 1.5
                      ? 'trot'
                      : moveSpd > 0.14
                        ? 'walk'
                        : ai === 'sitting'
                          ? 'sit'
                          : ai === 'grazing'
                            ? cycleSlot < 0.65
                              ? 'eat'
                              : 'call'
                            : 'idle';
          const isUrgent =
            desiredCrocState === 'attack' ||
            desiredCrocState === 'roar' ||
            desiredCrocState === 'flee' ||
            desiredCrocState === 'run';
          const crocState = selectStabilizedState(rig, desiredCrocState, dt, isUrgent);
          const spd = getEffectiveLabAnimationSpeed(
            liveLabOverrides['river_crocodile'],
            crocState,
            1.0
          );
          rig.crocodileCtrl.setState(crocState);
          rig.crocodileCtrl.update(dt * spd);
        } else if (a.species === 'jaguar' && rig.jaguarCtrl) {
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.15 + i * 1.57) % 1;
          const desiredJaguarState: JaguarState =
            ai === 'fleeing' || a.alertLevel === 'fleeing'
              ? 'flee'
              : ai === 'attacking'
                ? 'attack'
                : ai === 'roaring'
                  ? 'roar'
                  : ai === 'charging' || moveSpd > 4.2
                    ? 'run'
                    : ai === 'stalking'
                      ? 'stalk'
                      : a.inWater || moveSpd > 2.2
                        ? 'trot'
                        : moveSpd > 0.16
                          ? 'walk'
                          : ai === 'sitting'
                            ? 'sit'
                            : ai === 'grazing'
                              ? cycleSlot < 0.68
                                ? 'eat'
                                : 'idle'
                              : cycleSlot < 0.65
                                ? 'idle'
                                : 'call';
          const isUrgent =
            desiredJaguarState === 'attack' ||
            desiredJaguarState === 'roar' ||
            desiredJaguarState === 'flee' ||
            desiredJaguarState === 'run';
          const jaguarState = selectStabilizedState(rig, desiredJaguarState, dt, isUrgent);
          const spd = getEffectiveLabAnimationSpeed(
            liveLabOverrides['jungle_jaguar'],
            jaguarState,
            1.0
          );
          rig.jaguarCtrl.setState(jaguarState);
          rig.jaguarCtrl.update(dt * spd);
        } else if (a.species === 'wolf' && rig.wolfCtrl) {
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.15 + i * 1.49) % 1;
          const desiredWolfState: WolfState =
            ai === 'fleeing' || a.alertLevel === 'fleeing'
              ? 'flee'
              : ai === 'attacking'
                ? 'attack'
                : ai === 'roaring'
                  ? i % 2 === 0
                    ? 'howl'
                    : 'roar'
                  : ai === 'charging' || moveSpd > 3.8
                    ? 'run'
                    : ai === 'stalking'
                      ? 'stalk'
                      : a.inWater || moveSpd > 2.0
                        ? 'trot'
                        : moveSpd > 0.16
                          ? 'walk'
                          : ai === 'sitting'
                            ? 'sit'
                            : ai === 'grazing'
                              ? cycleSlot < 0.65
                                ? 'eat'
                                : 'idle'
                              : cycleSlot < 0.72
                                ? 'idle'
                                : 'howl';
          const isUrgent =
            desiredWolfState === 'attack' ||
            desiredWolfState === 'roar' ||
            desiredWolfState === 'howl' ||
            desiredWolfState === 'flee' ||
            desiredWolfState === 'run';
          const wolfState = selectStabilizedState(rig, desiredWolfState, dt, isUrgent);
          const spd = getEffectiveLabAnimationSpeed(
            liveLabOverrides['forest_wolf'],
            wolfState,
            1.0
          );
          rig.wolfCtrl.setState(wolfState);
          rig.wolfCtrl.update(dt * spd);
        } else if (a.species === 'rhino' && rig.rhinoCtrl) {
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch, a.yaw, slope.roll, 'YXZ');
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const cycleSlot = (elapsedTime * 0.14 + i * 1.63) % 1;
          const desiredRhinoState: RhinoState =
            ai === 'fleeing' || a.alertLevel === 'fleeing'
              ? 'flee'
              : ai === 'attacking'
                ? 'attack'
                : ai === 'roaring'
                  ? 'roar'
                  : ai === 'charging' || moveSpd > 3.4
                    ? 'run'
                    : a.inWater || ai === 'stalking' || moveSpd > 1.8
                      ? 'trot'
                      : moveSpd > 0.16
                        ? 'walk'
                        : ai === 'sitting'
                          ? 'sit'
                          : ai === 'grazing'
                            ? cycleSlot < 0.68
                              ? 'eat'
                              : 'idle'
                            : cycleSlot < 0.72
                              ? 'idle'
                              : 'call';
          const isUrgent =
            desiredRhinoState === 'attack' ||
            desiredRhinoState === 'roar' ||
            desiredRhinoState === 'flee' ||
            desiredRhinoState === 'run';
          const rhinoState = selectStabilizedState(rig, desiredRhinoState, dt, isUrgent);
          const spd = getEffectiveLabAnimationSpeed(
            liveLabOverrides['savanna_rhino'],
            rhinoState,
            1.0
          );
          rig.rhinoCtrl.setState(rhinoState);
          rig.rhinoCtrl.update(dt * spd);
        } else if (a.species === 'deer' || a.species === 'sheep') {
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(slope.pitch, a.yaw, slope.roll, 'YXZ');

          if (a.species === 'deer' && rig.deerGlbCtrl?.isLoaded()) {
            rig.posePivot.position.set(0, 0, 0);
            rig.posePivot.rotation.set(0, 0, 0);
            const cycleSlot = (elapsedTime * 0.22 + i * 1.73) % 1;
            const deerState =
              ai === 'fleeing' || a.alertLevel === 'fleeing'
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
            const turnHint =
              ai === 'listening' || a.alertLevel === 'curious'
                ? Math.sin(elapsedTime * 2.2 + i) * 0.42
                : moveSpd > 0.2
                  ? Math.sin(elapsedTime * 1.1 + i * 2.1) * 0.22
                  : 0;
            const spd = getEffectiveLabAnimationSpeed(
              liveLabOverrides['forest_deer'],
              deerState,
              1.0
            );
            rig.deerGlbCtrl.setState(deerState);
            rig.deerGlbCtrl.update(dt * spd, turnHint);
          } else {
            const targetStrideAmp =
              moveSpd > 0.14 ? Math.min(0.62, 0.24 + moveSpd * 0.065) : 0;
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

            const targetHeadDip =
              a.alertLevel === 'fleeing'
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
          const hopHeight =
            moveSpd > 0.35 ? Math.max(0, Math.sin(a.hopPhase)) * 0.22 : 0;
          rig.root.position.set(a.x, a.y + hopHeight, a.z);
          rig.root.rotation.set(
            slope.pitch + (hopHeight > 0.02 ? -0.18 : 0),
            a.yaw,
            slope.roll,
            'YXZ'
          );
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
