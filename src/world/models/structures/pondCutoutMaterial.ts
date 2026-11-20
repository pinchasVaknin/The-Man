// ============================================================================
// MODULE: World / Models / Structures / Pond Cutout Material
// DESIGN: A copy of a material that discards every fragment inside a circle on the ground plane, so a thin
//         disc (a lawn, a curb) lets the sunken pond underneath show through without reshaping its geometry
// SUMMARY: Clones a standard material and adds a world-space circular cutout to its shader.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \
// #region Imports & Dependencies
import type * as THREE from 'three';
// #endregion

// ======================== PUBLIC MATERIAL ======================== \
// #region Cutout Material
/**
 * Summary: Returns a clone of `base` that is invisible inside the circle (centerX, centerZ, radius).
 * Design: The vertex shader passes the world position; the fragment shader discards inside the circle.
 *         The clone keeps every other property of the base material.
 * @param base The material to copy.
 * @param centerX World X of the circle.
 * @param centerZ World Z of the circle.
 * @param radius Circle radius in meters.
 */
export function createPondCutoutMaterial(base: THREE.MeshStandardMaterial, centerX: number, centerZ: number, radius: number): THREE.MeshStandardMaterial {
  const material = base.clone();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCutoutCircle = { value: [centerX, centerZ, radius] };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCutoutWorldPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCutoutWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCutoutWorldPos;\nuniform vec3 uCutoutCircle;')
      .replace('void main() {', 'void main() {\n  if (distance(vCutoutWorldPos.xz, uCutoutCircle.xy) < uCutoutCircle.z) discard;');
  };
  material.customProgramCacheKey = () => `pond-cutout-${centerX}-${centerZ}-${radius}`;
  return material;
}
// #endregion
