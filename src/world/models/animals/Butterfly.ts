// ============================================================================
// MODULE: World / Models / Animals / Butterfly
// DESIGN: Procedural butterfly with two flapping wings, driven by the butterfly wildlife system
//         (flutter routine, night rest, hits). It is a creature model, so only that system may create it
//         (see creatureBoundary.spec.ts).
// SUMMARY: createReadyButterfly(colorIndex) returns a rig; geometry and the three wing materials are shared
//          and listed once in BUTTERFLY_SHARED_RESOURCES for disposal.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \
// #region Imports & Dependencies
import * as THREE from 'three';
// #endregion

// ======================== CONTRACTS ======================== \
// #region Contracts
/** Summary: Animated butterfly rig. `flap(time, phase)` poses the wings for the given clock. */
export interface ButterflyController {
  readonly object: THREE.Group;
  flap(time: number, phase: number): void;
  /** Spreads the wings flat (a dead butterfly is hidden, so this is only used for the brief hit frame). */
  spread(): void;
}
// #endregion

// ======================== SHARED RESOURCES ======================== \
// #region Shared Resources
const WING_COLORS = [0x67e8f9, 0xfbbf24, 0xf472b6] as const;
const wingMaterials = WING_COLORS.map((color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
const wingGeometry = new THREE.PlaneGeometry(0.13, 0.095);

/** Everything the butterflies share; the world disposes these once. */
export const BUTTERFLY_SHARED_RESOURCES = {
  geometries: [wingGeometry],
  materials: wingMaterials,
} as const;
// #endregion

// ======================== MODEL BUILDER ======================== \
// #region Model Builder
function buildWing(material: THREE.Material, side: -1 | 1): THREE.Group {
  const pivot = new THREE.Group();
  const wing = new THREE.Mesh(wingGeometry, material);
  wing.position.set(0.065 * side, 0, 0);
  pivot.add(wing);
  return pivot;
}

/** Summary: Creates one butterfly rig with the wing colour picked by `colorIndex`. */
export function createReadyButterfly(colorIndex: number): ButterflyController {
  const material = wingMaterials[colorIndex % wingMaterials.length];
  const object = new THREE.Group();
  const left = buildWing(material, -1);
  const right = buildWing(material, 1);
  object.add(left, right);
  return {
    object,
    flap(time: number, phase: number): void {
      const angle = Math.sin(time * 19.0 + phase) * 0.68;
      left.rotation.z = angle;
      right.rotation.z = -angle;
    },
    spread(): void {
      left.rotation.z = 0;
      right.rotation.z = 0;
    },
  };
}
// #endregion
