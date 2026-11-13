// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: Post-build batching: plain static meshes that are direct children of the mine group
//         are baked into one mesh per (material, vertex layout). Animated parts opt out with
//         userData.isAnimated; groups and instanced meshes are left alone.
// SUMMARY: Cuts the mine's draw calls without changing what is drawn. Does not touch lights,
//          instanced meshes, sub-assemblies or anything flagged as animated.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// #endregion

// ======================== PUBLIC MERGE ======================== \\
// #region Merge Static Children
/**
 * Summary: Merges static direct-child meshes of `group` that share a material.
 * Design: Each child's local matrix is baked into a clone of its geometry (geometries can be
 *         shared between meshes); clones are made non-indexed so every batch has one layout.
 *         Batches of one are left as they are.
 * @param group The mine root group.
 * @param own Registers the merged geometries for disposal.
 * @returns How many meshes were removed (draw calls saved).
 */
export function mergeStaticChildren(group: THREE.Group, own: <T extends THREE.BufferGeometry>(g: T) => T): number {
  const batches = new Map<string, THREE.Mesh[]>();
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh) continue;
    if (child.userData.isAnimated === true || child.children.length > 0 || Array.isArray(child.material)) continue;
    const layout = Object.keys(child.geometry.attributes).sort().join(',');
    const key = `${(child.material as THREE.Material).uuid}|${layout}`;
    const list = batches.get(key) ?? [];
    list.push(child);
    batches.set(key, list);
  }

  let removed = 0;
  for (const [key, meshes] of batches) {
    if (meshes.length < 2) continue;
    const baked = meshes.map((mesh) => {
      mesh.updateMatrix();
      const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      source.applyMatrix4(mesh.matrix);
      return source;
    });
    const merged = mergeGeometries(baked, false);
    for (const g of baked) g.dispose();
    if (merged === null) continue;
    merged.computeBoundingSphere();
    const batch = new THREE.Mesh(own(merged), meshes[0].material);
    batch.name = `ancient-mine-batch-${key.slice(0, 8)}`;
    batch.matrixAutoUpdate = false;
    batch.updateMatrix();
    for (const mesh of meshes) group.remove(mesh);
    group.add(batch);
    removed += meshes.length - 1;
  }
  return removed;
}
// #endregion
