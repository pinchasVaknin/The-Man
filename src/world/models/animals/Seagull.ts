// ============================================================================
// MODULE: World / Models / Animals / Seagull
// DESIGN: Procedural low-poly seagull with two articulated wings, driven by the boid-bird wildlife system
//         (flocking, startle, hits, loot). It is a creature model, so it may only be created by the system
//         that owns its behavior (see creatureBoundary.spec.ts).
// SUMMARY: createReadySeagull() returns a rig with the same state vocabulary as the dove
//          ('fly' | 'flee' | 'walk' | 'eat' | 'death'). Geometries and materials are shared by all gulls and
//          listed once in SEAGULL_SHARED_RESOURCES so the world can dispose them.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
export type SeagullState = 'fly' | 'flee' | 'walk' | 'eat' | 'death';

/** Summary: Animated seagull rig. `update(dt)` advances the current state's animation. */
export interface SeagullController {
  readonly object: THREE.Group;
  setState(state: SeagullState): void;
  update(dt: number): void;
}
// #endregion

// ======================== SHARED RESOURCES ======================== \\
// #region Shared Resources
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
const mantleMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.55 });
const tipMaterial = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });

const torsoGeometry = new THREE.ConeGeometry(0.14, 0.66, 6).rotateX(Math.PI / 2);
const breastGeometry = new THREE.SphereGeometry(0.13, 6, 5).scale(0.95, 0.85, 1.35).translate(0, -0.02, 0.12);
const headGeometry = new THREE.SphereGeometry(0.095, 6, 5).translate(0, 0.05, 0.35);
const beakGeometry = new THREE.ConeGeometry(0.032, 0.16, 5).rotateX(Math.PI / 2).translate(0, 0.04, 0.47);
const tailGeometry = new THREE.ConeGeometry(0.15, 0.3, 5).rotateX(-Math.PI / 2).scale(1.2, 0.22, 1.0).translate(0, 0.01, -0.4);
const wingInnerGeometry = new THREE.BoxGeometry(0.48, 0.032, 0.22);
const wingOuterGeometry = new THREE.BoxGeometry(0.44, 0.024, 0.16);

/** Everything the gulls share; the world disposes these once. */
export const SEAGULL_SHARED_RESOURCES = {
  geometries: [torsoGeometry, breastGeometry, headGeometry, beakGeometry, tailGeometry, wingInnerGeometry, wingOuterGeometry],
  materials: [bodyMaterial, mantleMaterial, tipMaterial, beakMaterial],
} as const;
// #endregion

// ======================== MODEL BUILDER ======================== \\
// #region Model Builder
function buildWing(side: -1 | 1): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(0.09 * side, 0.02, 0.04);
  const inner = new THREE.Mesh(wingInnerGeometry, mantleMaterial);
  inner.position.set(0.22 * side, 0, 0);
  const outer = new THREE.Mesh(wingOuterGeometry, tipMaterial);
  outer.position.set(0.62 * side, 0.01, -0.03);
  outer.rotation.y = 0.14 * -side;
  outer.rotation.z = 0.08 * -side;
  pivot.add(inner, outer);
  return pivot;
}

/**
 * Summary: Creates one seagull rig. Wings flap while flying, fold while walking or eating, and spread flat when dead.
 * @param phaseOffset Shifts the flap so a flock does not beat in unison.
 */
export function createReadySeagull(phaseOffset = 0): SeagullController {
  const object = new THREE.Group(); // the world positions this wrapper; the pose lives on the inner body
  const body = new THREE.Group();
  object.add(body);
  body.add(
    new THREE.Mesh(torsoGeometry, bodyMaterial),
    new THREE.Mesh(breastGeometry, bodyMaterial),
    new THREE.Mesh(headGeometry, bodyMaterial),
    new THREE.Mesh(beakGeometry, beakMaterial),
    new THREE.Mesh(tailGeometry, bodyMaterial)
  );
  const leftWing = buildWing(-1);
  const rightWing = buildWing(1);
  body.add(leftWing, rightWing);

  let state: SeagullState = 'fly';
  let clock = phaseOffset;

  const poseWings = (left: number, right: number): void => {
    leftWing.rotation.z = left;
    rightWing.rotation.z = right;
  };

  return {
    object,
    setState(next: SeagullState): void {
      state = next;
    },
    update(dt: number): void {
      clock += dt;
      switch (state) {
        case 'fly':
        case 'flee': {
          const rate = state === 'flee' ? 11.0 : 6.0;
          const flap = Math.sin(clock * rate) * (state === 'flee' ? 0.62 : 0.42);
          poseWings(0.08 + flap, -0.08 - flap);
          body.rotation.set(0, 0, 0);
          break;
        }
        case 'walk':
          poseWings(1.3, -1.3);
          body.rotation.set(Math.sin(clock * 7.0) * 0.05, 0, 0);
          break;
        case 'eat':
          poseWings(1.3, -1.3);
          body.rotation.set(0.35 + Math.sin(clock * 9.0) * 0.12, 0, 0);
          break;
        case 'death':
          poseWings(0.15, -0.15);
          body.rotation.set(0, 0, Math.PI / 2);
          break;
      }
    },
  };
}
// #endregion
