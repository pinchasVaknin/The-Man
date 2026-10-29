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
  const deerCoatMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.82,
  });
  const deerBellyMat = new THREE.MeshStandardMaterial({
    color: 0xd6c3a5,
    roughness: 0.88,
  });
  const deerAntlerMat = new THREE.MeshStandardMaterial({
    color: 0xe7d8c1,
    roughness: 0.65,
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
    deerCoatMat,
    deerBellyMat,
    deerAntlerMat,
    sheepWoolMat,
    sheepDarkMat
  );

  const critterBodyGeo = new THREE.SphereGeometry(0.18, 8, 6);
  critterBodyGeo.scale(0.85, 0.78, 1.35);
  const critterHeadGeo = new THREE.SphereGeometry(0.11, 7, 6);
  const rabbitEarGeo = new THREE.BoxGeometry(0.035, 0.16, 0.045);
  const squirrelTailGeo = new THREE.SphereGeometry(0.12, 6, 6);
  squirrelTailGeo.scale(0.65, 1.45, 0.9);

  // Deer geometries
  const deerTorsoGeo = new THREE.CylinderGeometry(0.28, 0.31, 1.15, 8);
  deerTorsoGeo.rotateX(Math.PI / 2);
  const deerNeckGeo = new THREE.CylinderGeometry(0.13, 0.18, 0.56, 7);
  const deerHeadGeo = new THREE.BoxGeometry(0.20, 0.20, 0.36);
  const deerLegGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.76, 6);
  deerLegGeo.translate(0, -0.38, 0);
  const deerAntlerBranchGeo = new THREE.CylinderGeometry(0.018, 0.028, 0.38, 5);
  const deerAntlerTineGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.22, 5);

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
    deerTorsoGeo,
    deerNeckGeo,
    deerHeadGeo,
    deerLegGeo,
    deerAntlerBranchGeo,
    deerAntlerTineGeo,
    sheepBodyGeo,
    sheepHeadGeo,
    sheepLegGeo
  );

  interface IAnimalMeshRig {
    root: THREE.Group;
    posePivot: THREE.Group;
    headPivot?: THREE.Group;
    legs?: THREE.Mesh[];
  }
  const animalMeshes: IAnimalMeshRig[] = [];

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const root = new THREE.Group();
    const posePivot = new THREE.Group();
    root.add(posePivot);

    if (a.species === 'deer') {
      const torso = new THREE.Mesh(deerTorsoGeo, deerCoatMat);
      torso.position.y = 0.86;
      const belly = new THREE.Mesh(deerTorsoGeo, deerBellyMat);
      belly.scale.set(0.92, 0.55, 0.96);
      belly.position.y = 0.78;
      posePivot.add(torso, belly);

      const headPivot = new THREE.Group();
      headPivot.position.set(0, 1.04, 0.48);
      const neck = new THREE.Mesh(deerNeckGeo, deerCoatMat);
      neck.position.set(0, 0.20, 0.08);
      neck.rotation.x = 0.35;
      const head = new THREE.Mesh(deerHeadGeo, deerCoatMat);
      head.position.set(0, 0.44, 0.22);

      // Antlers on every deer so hunting deer visibly rewards antlers!
      for (const side of [-1, 1]) {
        const antlerBeam = new THREE.Mesh(deerAntlerBranchGeo, deerAntlerMat);
        antlerBeam.position.set(side * 0.11, 0.68, 0.14);
        antlerBeam.rotation.set(-0.25, 0, side * -0.42);
        const tine1 = new THREE.Mesh(deerAntlerTineGeo, deerAntlerMat);
        tine1.position.set(side * 0.16, 0.74, 0.22);
        tine1.rotation.set(0.45, 0, side * -0.28);
        const tine2 = new THREE.Mesh(deerAntlerTineGeo, deerAntlerMat);
        tine2.position.set(side * 0.20, 0.82, 0.08);
        tine2.rotation.set(-0.35, 0, side * -0.55);
        headPivot.add(antlerBeam, tine1, tine2);
      }

      headPivot.add(neck, head);
      posePivot.add(headPivot);

      const fl = new THREE.Mesh(deerLegGeo, deerCoatMat);
      fl.position.set(-0.16, 0.76, 0.38);
      const fr = new THREE.Mesh(deerLegGeo, deerCoatMat);
      fr.position.set(0.16, 0.76, 0.38);
      const bl = new THREE.Mesh(deerLegGeo, deerCoatMat);
      bl.position.set(-0.16, 0.76, -0.38);
      const br = new THREE.Mesh(deerLegGeo, deerCoatMat);
      br.position.set(0.16, 0.76, -0.38);
      posePivot.add(fl, fr, bl, br);

      root.position.set(a.x, a.y, a.z);
      root.rotation.y = a.yaw;
      layerGroup.add(root);
      animalMeshes.push({ root, posePivot, headPivot, legs: [fl, fr, bl, br] });
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
      animalMeshes.push({ root, posePivot, headPivot, legs: [sfl, sfr, sbl, sbr] });
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
      animalMeshes.push({ root, posePivot });
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

      // Sync ground animal meshes (Rabbits, Squirrels, Deer, Sheep)
      for (let i = 0; i < animals.length; i++) {
        const a = animals[i];
        const rig = animalMeshes[i];

        if (a.isLooted) {
          rig.root.visible = false;
          continue;
        }
        rig.root.visible = true;

        if (a.isDead) {
          // Hunted animal: lies motionless on its side on top of the ground until looted with [E]
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(0, a.yaw, 0);
          // Rotating posePivot +90 deg around Z maps local +Y (where torso/body sits) onto local -X.
          // Offset posePivot by (+bodyLocalY, +bodyRadius, 0) so the corpse stays centered at (a.x, a.z)
          // and rests cleanly on top of the ground without sinking underground!
          if (a.species === 'deer') {
            rig.posePivot.position.set(0.82, 0.28, 0);
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
        if (a.isResting) {
          // Sleeping at night or huddled under tree canopy during rain
          const sleepDrop = a.species === 'deer' ? -0.38 : a.species === 'sheep' ? -0.22 : -0.05;
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(0, a.yaw, 0);
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
        } else if (a.species === 'deer' || a.species === 'sheep') {
          rig.root.position.set(a.x, a.y, a.z);
          rig.root.rotation.set(0, a.yaw, 0);
          rig.posePivot.position.set(0, 0, 0);
          rig.posePivot.rotation.set(0, 0, 0);
          const strideAmp = moveSpd > 0.2 ? Math.min(0.55, moveSpd * 0.12) : 0;
          const stride = Math.sin(a.hopPhase) * strideAmp;
          if (rig.legs && rig.legs.length === 4) {
            rig.legs[0].rotation.x = stride;
            rig.legs[1].rotation.x = -stride;
            rig.legs[2].rotation.x = -stride;
            rig.legs[3].rotation.x = stride;
          }
          if (rig.headPivot) {
            rig.headPivot.rotation.x =
              a.alertLevel === 'fleeing'
                ? -0.15
                : Math.sin(elapsedTime * 1.2 + i) * 0.14 + 0.12;
          }
        } else {
          const hopHeight =
            moveSpd > 0.35 ? Math.max(0, Math.sin(a.hopPhase)) * 0.22 : 0;
          rig.root.position.set(a.x, a.y + hopHeight, a.z);
          rig.root.rotation.set(
            hopHeight > 0.02 ? -0.18 : 0,
            a.yaw,
            0,
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
