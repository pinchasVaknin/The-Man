// ============================================================================
// MODULE: World / Builders / Wildlife & Footprints Builder
// DESIGN: Instanced boid bird flocks, critters, eagle & footprint decals (SRP)
// SUMMARY: Constructs procedural wildlife visual layers, fireflies, soaring mountain
//          eagle, footprint decals, and runtime proximity/sound synchronization.
// ============================================================================

// ======================== IMPORTS & CONTRACTS ======================== \\
// #region Imports & Contracts
import * as THREE from 'three';
import type { IPlayerState, IRideableHorseState } from '../domain/worldTypes';
import { isWithinViewDistance } from '../domain/landmarksRegistry';
import { groundHeightAt as heightAt } from '../systems/terrainAndBiomeSystem';
import {
  createInitialBoidBirds,
  createInitialSmallAnimals,
  stepBoidsAndWildlife,
  type IBoidBirdState,
  type ISmallAnimalState,
} from '../systems/boidsAndWildlifeSystem';
import {
  createFootprintTrailTracker,
  stepFootprintTrailSystem,
  MAX_FOOTPRINT_DECALS,
  type IFootprintTrailTracker,
} from '../systems/footprintTrailSystem';

/**
 * Summary: Runtime controller handle for bird flocks, small animals, and footprint trails.
 * Design: Exposes update callback to advance wildlife simulation and footprint decals per frame.
 */
export interface IWildlifeAndFootprintsController {
  group: THREE.Group;
  birds: IBoidBirdState[];
  animals: ISmallAnimalState[];
  footprintTracker: IFootprintTrailTracker;
  update: (
    dt: number,
    elapsed: number,
    playerState: IPlayerState,
    horses: readonly IRideableHorseState[],
    daylightFactor: number,
    callbacks?: {
      onBirdFlockStartled?: (distance: number, count: number) => void;
      onCritterScampered?: (distance: number, species: 'rabbit' | 'squirrel') => void;
      onAmbientWildlifeProximity?: (nearestBirdDist: number, nearestCritterDist: number) => void;
    }
  ) => void;
}
export type WildlifeAndFootprintsController = IWildlifeAndFootprintsController;
// #endregion

// ======================== BUILD WILDLIFE & FOOTPRINTS ======================== \\
// #region Build Wildlife & Footprints
/**
 * Summary: Build wildlife and footprints layer.
 * Design: Standard function implementing domain specifications and behavioral contracts.
 * @param scene Input parameter for buildWildlifeAndFootprintsLayer.
 * @param disposableGeometries Input parameter for buildWildlifeAndFootprintsLayer.
 * @param disposableMaterials Input parameter for buildWildlifeAndFootprintsLayer.
 * @returns Computed result for buildWildlifeAndFootprintsLayer.
 */
export function buildWildlifeAndFootprintsLayer(
  scene: THREE.Scene,
  disposableGeometries?: THREE.BufferGeometry[],
  disposableMaterials?: THREE.Material[]
): IWildlifeAndFootprintsController {
  const group = new THREE.Group();
  group.name = 'wildlife-boids-footprints-layer';
  scene.add(group);

  // ---------------------------------------------------------------------------
  // 1. REYNOLDS BOIDS BIRD FLOCKS (36 Birds across 4 Flocks)
  // ---------------------------------------------------------------------------
  const birds = createInitialBoidBirds();
  const birdHandles: Array<{
    root: THREE.Group;
    leftWing: THREE.Group;
    rightWing: THREE.Group;
    tailFan: THREE.Mesh;
  }> = [];

  const birdBodyMat = new THREE.MeshStandardMaterial({
    color: 0x2c353d,
    roughness: 0.65,
  });
  const birdBreastMat = new THREE.MeshStandardMaterial({
    color: 0xd8cfc2,
    roughness: 0.75,
  });
  const birdWingMat = new THREE.MeshStandardMaterial({
    color: 0x3b4752,
    roughness: 0.68,
    side: THREE.DoubleSide,
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: 0xdba032,
    roughness: 0.5,
  });

  const bodyGeo = new THREE.ConeGeometry(0.14, 0.52, 6);
  bodyGeo.rotateX(Math.PI / 2);
  const breastGeo = new THREE.SphereGeometry(0.12, 6, 6);
  breastGeo.scale(0.95, 0.78, 1.35);
  const wingInnerGeo = new THREE.BoxGeometry(0.46, 0.025, 0.22);
  const wingTipGeo = new THREE.BoxGeometry(0.38, 0.02, 0.16);
  const tailGeo = new THREE.ConeGeometry(0.16, 0.26, 4);
  tailGeo.rotateX(-Math.PI / 2);
  tailGeo.scale(1.2, 0.25, 1.0);
  const beakGeo = new THREE.ConeGeometry(0.035, 0.12, 4);
  beakGeo.rotateX(Math.PI / 2);

  disposableGeometries?.push(bodyGeo, breastGeo, wingInnerGeo, wingTipGeo, tailGeo, beakGeo);
  disposableMaterials?.push(birdBodyMat, birdBreastMat, birdWingMat, beakMat);

  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const root = new THREE.Group();
    root.position.set(b.x, b.y, b.z);
    root.scale.setScalar(b.scale);

    const body = new THREE.Mesh(bodyGeo, birdBodyMat);
    root.add(body);

    const breast = new THREE.Mesh(breastGeo, birdBreastMat);
    breast.position.set(0, -0.04, 0.06);
    root.add(breast);

    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 0.02, 0.3);
    root.add(beak);

    const tailFan = new THREE.Mesh(tailGeo, birdWingMat);
    tailFan.position.set(0, 0.01, -0.28);
    root.add(tailFan);

    const leftWing = new THREE.Group();
    leftWing.position.set(-0.08, 0.03, 0.04);
    const lInner = new THREE.Mesh(wingInnerGeo, birdWingMat);
    lInner.position.set(-0.22, 0, 0);
    const lTip = new THREE.Mesh(wingTipGeo, birdWingMat);
    lTip.position.set(-0.56, 0.02, -0.03);
    lTip.rotation.y = 0.18;
    leftWing.add(lInner, lTip);

    const rightWing = new THREE.Group();
    rightWing.position.set(0.08, 0.03, 0.04);
    const rInner = new THREE.Mesh(wingInnerGeo, birdWingMat);
    rInner.position.set(0.22, 0, 0);
    const rTip = new THREE.Mesh(wingTipGeo, birdWingMat);
    rTip.position.set(0.56, 0.02, -0.03);
    rTip.rotation.y = -0.18;
    rightWing.add(rInner, rTip);

    root.add(leftWing, rightWing);
    group.add(root);
    birdHandles.push({ root, leftWing, rightWing, tailFan });
  }

  // ---------------------------------------------------------------------------
  // 2. PROXIMITY-REACTIVE SMALL FOREST ANIMALS (Rabbits & Squirrels)
  // ---------------------------------------------------------------------------
  const animals = createInitialSmallAnimals();
  const animalHandles: Array<{
    root: THREE.Group;
    headGroup: THREE.Group;
    leftEar: THREE.Mesh;
    rightEar: THREE.Mesh;
    tail: THREE.Mesh;
  }> = [];

  const rabbitFurMat = new THREE.MeshStandardMaterial({
    color: 0x9b8672,
    roughness: 0.82,
  });
  const rabbitTailMat = new THREE.MeshStandardMaterial({
    color: 0xf4efe8,
    roughness: 0.88,
  });
  const squirrelFurMat = new THREE.MeshStandardMaterial({
    color: 0xb85228,
    roughness: 0.78,
  });
  const critterEyeMat = new THREE.MeshStandardMaterial({
    color: 0x161210,
    roughness: 0.25,
  });

  // Pre-allocated static geometries for rabbits and squirrels (eliminates loop allocations)
  const rabbitTorsoGeo = new THREE.SphereGeometry(0.22, 10, 8);
  rabbitTorsoGeo.scale(0.88, 0.82, 1.38);
  const sqTorsoGeo = new THREE.SphereGeometry(0.16, 10, 8);
  sqTorsoGeo.scale(0.88, 0.82, 1.38);

  const rabbitHaunchGeo = new THREE.SphereGeometry(0.15, 8, 8);
  rabbitHaunchGeo.scale(0.65, 0.9, 1.1);
  const sqHaunchGeo = new THREE.SphereGeometry(0.11, 8, 8);
  sqHaunchGeo.scale(0.65, 0.9, 1.1);

  const rabbitHeadGeo = new THREE.SphereGeometry(0.14, 10, 8);
  rabbitHeadGeo.scale(0.88, 0.88, 1.18);
  const sqHeadGeo = new THREE.SphereGeometry(0.11, 10, 8);
  sqHeadGeo.scale(0.88, 0.88, 1.18);

  const critterEyeGeo = new THREE.SphereGeometry(0.024, 6, 6);
  const rabbitEarGeo = new THREE.CapsuleGeometry(0.032, 0.22, 4, 8);
  const sqEarGeo = new THREE.CapsuleGeometry(0.024, 0.06, 4, 8);

  const rabbitTailGeo = new THREE.SphereGeometry(0.085, 8, 8);
  const sqTailGeo = new THREE.CapsuleGeometry(0.085, 0.26, 5, 8);

  disposableGeometries?.push(
    rabbitTorsoGeo,
    sqTorsoGeo,
    rabbitHaunchGeo,
    sqHaunchGeo,
    rabbitHeadGeo,
    sqHeadGeo,
    critterEyeGeo,
    rabbitEarGeo,
    sqEarGeo,
    rabbitTailGeo,
    sqTailGeo
  );
  disposableMaterials?.push(rabbitFurMat, rabbitTailMat, squirrelFurMat, critterEyeMat);

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const isRabbit = a.species === 'rabbit';
    const furMat = isRabbit ? rabbitFurMat : squirrelFurMat;

    const root = new THREE.Group();
    root.position.set(a.x, a.y, a.z);
    root.rotation.y = a.yaw;

    // Sculpted plump body
    const torso = new THREE.Mesh(isRabbit ? rabbitTorsoGeo : sqTorsoGeo, furMat);
    torso.position.set(0, isRabbit ? 0.21 : 0.16, 0);
    torso.castShadow = true;
    root.add(torso);

    // Muscular haunches
    const haunchGeo = isRabbit ? rabbitHaunchGeo : sqHaunchGeo;
    for (const side of [-1, 1]) {
      const haunch = new THREE.Mesh(haunchGeo, furMat);
      haunch.position.set(side * (isRabbit ? 0.14 : 0.1), isRabbit ? 0.16 : 0.12, -0.09);
      root.add(haunch);
    }

    // Head + Perking Ears
    const headGroup = new THREE.Group();
    headGroup.position.set(0, isRabbit ? 0.34 : 0.26, isRabbit ? 0.24 : 0.18);
    const headMesh = new THREE.Mesh(isRabbit ? rabbitHeadGeo : sqHeadGeo, furMat);
    headGroup.add(headMesh);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(critterEyeGeo, critterEyeMat);
      eye.position.set(side * 0.08, 0.03, 0.08);
      headGroup.add(eye);
    }

    const earGeo = isRabbit ? rabbitEarGeo : sqEarGeo;
    const leftEar = new THREE.Mesh(earGeo, furMat);
    leftEar.position.set(-0.055, isRabbit ? 0.18 : 0.1, -0.02);
    const rightEar = new THREE.Mesh(earGeo, furMat);
    rightEar.position.set(0.055, isRabbit ? 0.18 : 0.1, -0.02);
    headGroup.add(leftEar, rightEar);
    root.add(headGroup);

    // Tail (fluffy white cotton tail for rabbit, big curved bushy tail for squirrel)
    let tail: THREE.Mesh;
    if (isRabbit) {
      tail = new THREE.Mesh(rabbitTailGeo, rabbitTailMat);
      tail.position.set(0, 0.22, -0.28);
    } else {
      tail = new THREE.Mesh(sqTailGeo, squirrelFurMat);
      tail.position.set(0, 0.32, -0.22);
      tail.rotation.x = 0.52;
    }
    root.add(tail);

    group.add(root);
    animalHandles.push({ root, headGroup, leftEar, rightEar, tail });
  }

  // ---------------------------------------------------------------------------
  // 3. TEMPORARY FADING FOOTPRINTS & HORSE HOOFPRINTS TRAIL SYSTEM
  // ---------------------------------------------------------------------------
  const footprintTracker = createFootprintTrailTracker();
  const decalHandles: Array<{
    root: THREE.Group;
    bootMesh: THREE.Mesh;
    hoofMesh: THREE.Mesh;
    mat: THREE.MeshStandardMaterial;
  }> = [];

  // Boot footprint geometry (sole + heel indentation)
  const bootPrintGeo = new THREE.PlaneGeometry(0.18, 0.36);
  bootPrintGeo.rotateX(-Math.PI / 2);

  // U-shaped horse hoofprint geometry (open torus ring lying flat on terrain)
  const hoofPrintGeo = new THREE.RingGeometry(0.09, 0.17, 12, 1, 0.25, Math.PI * 1.5);
  hoofPrintGeo.rotateX(-Math.PI / 2);

  disposableGeometries?.push(bootPrintGeo, hoofPrintGeo);

  for (let i = 0; i < MAX_FOOTPRINT_DECALS; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a1f16,
      roughness: 0.96,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    disposableMaterials?.push(mat);

    const root = new THREE.Group();
    root.visible = false;

    const bootMesh = new THREE.Mesh(bootPrintGeo, mat);
    const hoofMesh = new THREE.Mesh(hoofPrintGeo, mat);
    root.add(bootMesh, hoofMesh);

    group.add(root);
    decalHandles.push({ root, bootMesh, hoofMesh, mat });
  }

  // ---------------------------------------------------------------------------
  // 4. MAJOR UPGRADE: INTERACTIVE FIREFLIES / FOREST POLLEN & MOUNTAIN EAGLE
  // ---------------------------------------------------------------------------
  const fireflyCount = 42;
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflyOffsets: Array<{ dx: number; dy: number; dz: number; phase: number }> = [];
  for (let i = 0; i < fireflyCount; i++) {
    const angle = (i / fireflyCount) * Math.PI * 2;
    const rad = 3.5 + (i % 7) * 2.8;
    const dx = Math.cos(angle) * rad;
    const dz = Math.sin(angle) * rad;
    const dy = 0.8 + (i % 5) * 0.65;
    fireflyOffsets.push({ dx, dy, dz, phase: i * 0.73 });
    fireflyPositions[i * 3] = dx;
    fireflyPositions[i * 3 + 1] = dy;
    fireflyPositions[i * 3 + 2] = dz;
  }
  const fireflyGeo = new THREE.BufferGeometry();
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
  const fireflyMat = new THREE.PointsMaterial({
    color: 0xc8ff64,
    size: 0.22,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposableGeometries?.push(fireflyGeo);
  disposableMaterials?.push(fireflyMat);
  const fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
  group.add(fireflyPoints);

  // Majestic Golden Mountain Eagle soaring above the Northern Cliffs & Waterfall
  const eagleGroup = new THREE.Group();
  const eagleBodyMat = new THREE.MeshStandardMaterial({ color: 0x3b2616, roughness: 0.6 });
  const eagleGoldMat = new THREE.MeshStandardMaterial({ color: 0xc8963e, roughness: 0.55 });
  const eagleBeakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.38 });
  disposableMaterials?.push(eagleBodyMat, eagleGoldMat, eagleBeakMat);
  const eagleBody = new THREE.Mesh(bodyGeo, eagleBodyMat);
  eagleBody.scale.set(2.2, 2.0, 2.4);
  const eagleHead = new THREE.Mesh(breastGeo, eagleGoldMat);
  eagleHead.position.set(0, 0.08, 0.55);
  eagleHead.scale.setScalar(1.5);
  const eagleBeak = new THREE.Mesh(bodyGeo, eagleBeakMat);
  eagleBeak.scale.set(0.65, 0.65, 0.9);
  eagleBeak.position.set(0, 0.06, 0.82);
  const eagleTail = new THREE.Mesh(tailGeo, eagleBodyMat);
  eagleTail.scale.set(2.4, 1.5, 2.2);
  eagleTail.position.set(0, 0.02, -0.78);

  const eagleLeftWingPivot = new THREE.Group();
  eagleLeftWingPivot.position.set(-0.18, 0.06, 0.05);
  const eagleLeftWing = new THREE.Mesh(wingInnerGeo, eagleBodyMat);
  eagleLeftWing.scale.set(3.4, 1.4, 2.2);
  eagleLeftWing.position.set(-0.68, 0, 0);
  eagleLeftWingPivot.add(eagleLeftWing);

  const eagleRightWingPivot = new THREE.Group();
  eagleRightWingPivot.position.set(0.18, 0.06, 0.05);
  const eagleRightWing = new THREE.Mesh(wingInnerGeo, eagleBodyMat);
  eagleRightWing.scale.set(3.4, 1.4, 2.2);
  eagleRightWing.position.set(0.68, 0, 0);
  eagleRightWingPivot.add(eagleRightWing);

  eagleGroup.add(eagleBody, eagleHead, eagleBeak, eagleTail, eagleLeftWingPivot, eagleRightWingPivot);
  group.add(eagleGroup);

  let soundStartleCooldown = 0;
  let soundScamperCooldown = 0;

  return {
    group,
    birds,
    animals,
    footprintTracker,
    update(dt, elapsed, playerState, horses, daylightFactor, callbacks) {
      soundStartleCooldown = Math.max(0, soundStartleCooldown - dt);
      soundScamperCooldown = Math.max(0, soundScamperCooldown - dt);

      const playerSpeed = Math.hypot(playerState.vx, playerState.vz);
      const wildlifeResult = stepBoidsAndWildlife(
        birds,
        animals,
        playerState.x,
        playerState.y,
        playerState.z,
        playerSpeed,
        dt
      );

      if (
        wildlifeResult.startledFlockCount > 0 &&
        soundStartleCooldown <= 0 &&
        callbacks?.onBirdFlockStartled
      ) {
        soundStartleCooldown = 2.6;
        callbacks.onBirdFlockStartled(
          wildlifeResult.nearestBirdDist,
          wildlifeResult.startledFlockCount
        );
      }

      if (
        wildlifeResult.scamperedCritterCount > 0 &&
        soundScamperCooldown <= 0 &&
        callbacks?.onCritterScampered
      ) {
        soundScamperCooldown = 1.8;
        callbacks.onCritterScampered(wildlifeResult.nearestCritterDist, 'rabbit');
      }

      if (callbacks?.onAmbientWildlifeProximity) {
        callbacks.onAmbientWildlifeProximity(
          wildlifeResult.nearestBirdDist,
          wildlifeResult.nearestCritterDist
        );
      }

      // Sync Boids Bird Meshes
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i];
        const h = birdHandles[i];
        const inView = isWithinViewDistance(b.x, b.z, playerState.x, playerState.z, 35);
        h.root.visible = inView;
        if (!inView) continue;

        h.root.position.set(b.x, b.y, b.z);
        h.root.rotation.order = 'YXZ';
        h.root.rotation.y = b.yaw;
        h.root.rotation.x = b.pitch;
        h.root.rotation.z = b.bankRoll;

        const wingFlap = Math.sin(b.wingPhase) * (b.fleeTimer > 0 ? 0.78 : 0.56);
        h.leftWing.rotation.z = wingFlap;
        h.rightWing.rotation.z = -wingFlap;
        h.tailFan.scale.x = b.fleeTimer > 0 ? 1.45 : 1.1;
      }

      // Sync Small Forest Animal Meshes
      for (let i = 0; i < animals.length; i++) {
        const a = animals[i];
        const h = animalHandles[i];
        const inView = isWithinViewDistance(a.x, a.z, playerState.x, playerState.z, 25);
        h.root.visible = inView;
        if (!inView) continue;

        h.root.position.set(a.x, a.y, a.z);
        h.root.rotation.y = a.yaw;

        const isMoving = Math.hypot(a.vx, a.vz) > 0.12;
        h.root.rotation.x = isMoving ? -Math.sin(a.hopPhase) * 0.24 : 0;
        h.headGroup.rotation.x =
          a.alertLevel === 'alert'
            ? -0.28
            : Math.sin(elapsed * 3.2 + i) * 0.08;

        const earPitch = -0.55 + a.earPerk * 0.62;
        h.leftEar.rotation.x = earPitch;
        h.rightEar.rotation.x = earPitch;
        h.leftEar.rotation.z = 0.18;
        h.rightEar.rotation.z = -0.18;

        if (a.species === 'squirrel') {
          h.tail.rotation.x = 0.45 + Math.sin(elapsed * 7.5 + i) * 0.18;
        }
      }

      // Step & Sync Temporary Fading Footprints / Horse Hoofprints
      const isMounted = Boolean(playerState.mountedHorseId);
      const activeHorse = isMounted
        ? horses.find((h) => h.id === playerState.mountedHorseId) ?? null
        : null;
      const headingYaw = activeHorse ? activeHorse.yaw : playerState.yaw;

      stepFootprintTrailSystem(
        footprintTracker,
        playerState.x,
        playerState.y,
        playerState.z,
        headingYaw,
        playerState.onGround,
        playerState.isFlying,
        playerState.inWater,
        isMounted,
        dt
      );

      for (let i = 0; i < footprintTracker.decals.length; i++) {
        const d = footprintTracker.decals[i];
        const h = decalHandles[i];
        if (!d.active || d.opacity <= 0.01) {
          h.root.visible = false;
          continue;
        }
        h.root.visible = true;
        h.root.position.set(d.x, d.y, d.z);
        h.root.rotation.y = d.yaw;
        h.bootMesh.visible = d.kind === 'boot';
        h.hoofMesh.visible = d.kind === 'hoof';

        if (d.surfaceTint === 'snow') {
          h.mat.color.setHex(0x8fa6b8);
        } else if (d.surfaceTint === 'sand') {
          h.mat.color.setHex(0x8c6e46);
        } else {
          h.mat.color.setHex(0x281d14);
        }
        h.mat.opacity = d.opacity;
      }

      // Update Interactive Fireflies (Dusk/Night) & Sunlit Forest Pollen Motes (Day)
      const isNightOrDusk = daylightFactor < 0.55;
      fireflyMat.color.setHex(isNightOrDusk ? 0xb8ff58 : 0xffe494);
      fireflyMat.size = isNightOrDusk ? 0.25 : 0.15;
      fireflyMat.opacity = isNightOrDusk
        ? 0.65 + 0.25 * Math.sin(elapsed * 3.0)
        : 0.38;

      const posAttr = fireflyGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < fireflyCount; i++) {
        const off = fireflyOffsets[i];
        const swirl = elapsed * (isNightOrDusk ? 0.85 : 0.45) + off.phase;
        const fx = playerState.x + off.dx + Math.cos(swirl) * 1.4;
        const fz = playerState.z + off.dz + Math.sin(swirl * 0.9) * 1.4;
        const fy =
          playerState.y +
          off.dy +
          Math.sin(elapsed * 2.1 + off.phase) * 0.45;
        posAttr.setXYZ(i, fx, fy, fz);
      }
      posAttr.needsUpdate = true;

      // Update Soaring Mountain Golden Eagle above Northern Cliffs
      const eagleAngle = elapsed * 0.18;
      const eagleX = -15.0 + Math.cos(eagleAngle) * 55.0;
      const eagleZ = -85.0 + Math.sin(eagleAngle) * 42.0;
      const cliffY = heightAt(eagleX, eagleZ);
      eagleGroup.position.set(
        eagleX,
        Math.max(46.0, cliffY + 24.0) + Math.sin(elapsed * 0.9) * 2.5,
        eagleZ
      );
      const eagleVx = -Math.sin(eagleAngle) * 55.0;
      const eagleVz = Math.cos(eagleAngle) * 42.0;
      eagleGroup.rotation.order = 'YXZ';
      eagleGroup.rotation.y = Math.atan2(eagleVx, eagleVz);
      eagleGroup.rotation.z = -0.24;
      const slowFlap = Math.sin(elapsed * 3.2) * 0.24;
      eagleLeftWingPivot.rotation.z = 0.08 + slowFlap;
      eagleRightWingPivot.rotation.z = -0.08 - slowFlap;
    },
  };
}
// #endregion
