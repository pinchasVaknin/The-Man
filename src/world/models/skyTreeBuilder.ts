// ============================================================================
// MODULE: World / Models / Skybound Isles / Giant Sky Tree
// DESIGN: The trunk is a bark cylinder, the branch path is a ribbon that follows the same spiral the
//         player walks, and the observation platform is a flat disc at the top. The geometry is built
//         from the layout data, so what is drawn is what is walkable.
// SUMMARY: Builds the Giant Sky Tree's trunk, spiral branch and top platform.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  SKY_TREE,
  SKY_TREE_BRANCH_HALF_WIDTH_M,
  SKY_TREE_SPIRAL_RADIUS_M,
  SKY_TREE_TOP_RADIUS_M,
  SKY_TREE_TRUNK_HALF_M,
  SKY_TREE_TURNS,
} from '../domain/landmarks/skyboundIsles/skyTreeLayout';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the tree builder hands back to the scene. */
export interface ISkyTreeBuildResult {
  readonly group: THREE.Group;
}
// #endregion

// #region Tuning
/** Summary: Segments per turn of the branch ribbon; more gives a smoother spiral. */
const SEGMENTS_PER_TURN = 48;
const TOP_DISC_THICKNESS_M = 0.6;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the trunk, the spiral branch and the observation platform.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene).
 */
export function buildSkyTree(ctx: IWorldModelBuildContext): ISkyTreeBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-tree';
  const height = SKY_TREE.topY - SKY_TREE.baseY;
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 });
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 0.9, side: THREE.DoubleSide });
  const topMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85 });

  const trunkGeo = new THREE.CylinderGeometry(SKY_TREE_TRUNK_HALF_M, SKY_TREE_TRUNK_HALF_M * 1.25, height, 12);
  const trunk = new THREE.Mesh(trunkGeo, barkMat);
  trunk.position.set(SKY_TREE.x, SKY_TREE.baseY + height / 2, SKY_TREE.z);
  group.add(trunk);

  // The branch ribbon: a strip along the spiral, as wide as the walkable path.
  const steps = Math.ceil(SEGMENTS_PER_TURN * SKY_TREE_TURNS);
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * 2 * Math.PI * SKY_TREE_TURNS;
    const y = SKY_TREE.baseY + height * t;
    const cx = Math.cos(theta);
    const sz = Math.sin(theta);
    for (const side of [-1, 1]) {
      const r = SKY_TREE_SPIRAL_RADIUS_M + side * SKY_TREE_BRANCH_HALF_WIDTH_M;
      positions.push(SKY_TREE.x + cx * r, y, SKY_TREE.z + sz * r);
    }
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const branchGeo = new THREE.BufferGeometry();
  branchGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  branchGeo.setIndex(indices);
  branchGeo.computeVertexNormals();
  const branch = new THREE.Mesh(branchGeo, branchMat);
  group.add(branch);

  const topGeo = new THREE.CylinderGeometry(SKY_TREE_TOP_RADIUS_M, SKY_TREE_TOP_RADIUS_M, TOP_DISC_THICKNESS_M, 24);
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(SKY_TREE.x, SKY_TREE.topY - TOP_DISC_THICKNESS_M / 2, SKY_TREE.z);
  group.add(top);

  ctx.disposableGeometries.push(trunkGeo, branchGeo, topGeo);
  ctx.disposableMaterials.push(barkMat, branchMat, topMat);
  return { group };
}
// #endregion
