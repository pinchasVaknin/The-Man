// ============================================================================
// MODULE: Core / Dispose Object Tree
// DESIGN: Releases GPU resources owned by a removed scene subtree (SRP)
// SUMMARY: Disposes geometries and materials of every mesh under an object. Only use this for subtrees whose
//          resources are created for that subtree alone; shared module-level geometries must not be passed here.
// ============================================================================

import type * as THREE from 'three';

/**
 * Summary: Disposes the geometry and material of each mesh under `root` (including `root` itself).
 * Design: Materials may be arrays, so each entry is disposed. Textures on materials are not walked here: the
 *         builders that create textures already track them in their disposable lists.
 */
export function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const withGeometry = obj as THREE.Object3D & { geometry?: THREE.BufferGeometry };
    if (withGeometry.geometry) {
      withGeometry.geometry.dispose();
    }
    const withMaterial = obj as THREE.Object3D & { material?: THREE.Material | THREE.Material[] };
    if (withMaterial.material) {
      const materials = Array.isArray(withMaterial.material) ? withMaterial.material : [withMaterial.material];
      for (const material of materials) {
        material.dispose();
      }
    }
  });
}
