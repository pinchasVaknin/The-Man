// ============================================================================
// MODULE: World / Models / Structures / Slab With Hole
// DESIGN: A flat slab (circle or ellipse outline) with an optional round hole, built as an extruded shape in
//         world units, so a deck or a lawn can be cut open where a pond is sunk into it.
// SUMMARY: Creates the geometry only; the caller positions it and gives it a material.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: A round hole in a slab, in the slab's local x/z frame (meters). */
export interface ISlabHole {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}
// #endregion

// ======================== PUBLIC GEOMETRY ======================== \\
// #region Create Slab With Hole
const CURVE_SEGMENTS = 48;

/**
 * Summary: Builds a vertical slab whose outline is an ellipse, with an optional round hole through it.
 * Design: The outline is extruded along the vertical axis, so the slab spans y = 0 .. thickness around the
 *         local origin; the caller moves it into place.
 * @param radiusX Outline half-width along x (m).
 * @param radiusZ Outline half-width along z (m).
 * @param thickness Slab height (m).
 * @param hole Optional round hole, in the same local x/z frame.
 */
export function createSlabWithHole(radiusX: number, radiusZ: number, thickness: number, hole?: ISlabHole): THREE.BufferGeometry {
  // Shape y becomes world -z after the rotation below, so z is negated when describing shapes.
  const outline = new THREE.Shape();
  outline.absellipse(0, 0, radiusX, radiusZ, 0, Math.PI * 2, false, 0);
  if (hole) {
    const opening = new THREE.Path();
    opening.absarc(hole.x, -hole.z, hole.radius, 0, Math.PI * 2, true);
    outline.holes.push(opening);
  }
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false, curveSegments: CURVE_SEGMENTS });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
// #endregion
