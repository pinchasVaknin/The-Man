// ============================================================================
// MODULE: World / Models / Skybound Isles / Giant Sky Tree
// DESIGN: The trunk is a gnarled ancient World-Tree column with glowing rune veins and buttress
//         flares, the branch path is a 3D stepped wooden spiral staircase with carved treads,
//         outer handrail ribbons, underside support boughs, and a welcoming root-arch portal at
//         its base, and the observation platform is a carved sanctum disc at the top.
// SUMMARY: Builds the Giant Sky Tree's trunk, 3D spiral staircase and top sanctum platform.
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
} from '../../domain/landmarks/skyboundIsles/skyTreeLayout';
import type { IWorldModelBuildContext } from '../types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the tree builder hands back to the scene. */
export interface ISkyTreeBuildResult {
  readonly group: THREE.Group;
}
// #endregion

// #region Tuning
const SEGMENTS_PER_TURN = 56;
const STAIR_TREADS_COUNT = 112;
const TOP_DISC_THICKNESS_M = 0.65;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the trunk, the 3D stepped spiral staircase and the top observation sanctum.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene).
 */
export function buildSkyTree(ctx: IWorldModelBuildContext): ISkyTreeBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-tree';
  const height = SKY_TREE.topY - SKY_TREE.baseY;
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x4e3928, roughness: 0.92 });
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 0.85, side: THREE.DoubleSide });
  const treadMat = new THREE.MeshStandardMaterial({ color: 0x9b7952, roughness: 0.78 });
  const topMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.82 });
  const runeMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 1.5, roughness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.75 });

  // Main trunk + gnarled vertical bark ribs + flaring root buttresses + glowing cyan rune strips.
  const trunkGeo = new THREE.CylinderGeometry(SKY_TREE_TRUNK_HALF_M * 1.05, SKY_TREE_TRUNK_HALF_M * 1.48, height, 16);
  const ribGeo = new THREE.CylinderGeometry(0.32, 0.62, height, 8);
  const strutGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 6);
  const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.05, 6);
  const shardGeo = new THREE.OctahedronGeometry(0.85, 0);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const portalArchGeo = new THREE.TorusGeometry(1.45, 0.22, 8, 18, Math.PI);
  const trunk = new THREE.Mesh(trunkGeo, barkMat);
  trunk.position.set(SKY_TREE.x, SKY_TREE.baseY + height / 2, SKY_TREE.z);
  trunk.castShadow = !ctx.isSoftwareGl;
  group.add(trunk);

  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const r = SKY_TREE_TRUNK_HALF_M * 1.12;
    const rib = new THREE.Mesh(ribGeo, barkMat);
    rib.position.set(SKY_TREE.x + Math.cos(a) * r, SKY_TREE.baseY + height / 2, SKY_TREE.z + Math.sin(a) * r);
    group.add(rib);

    if (k % 2 === 0) {
      const rune = new THREE.Mesh(postGeo, runeMat);
      rune.scale.set(0.9, height * 0.85, 0.9);
      rune.position.set(SKY_TREE.x + Math.cos(a + 0.2) * (r + 0.22), SKY_TREE.baseY + height * 0.5, SKY_TREE.z + Math.sin(a + 0.2) * (r + 0.22));
      group.add(rune);
    }
  }

  // 1. Spiral carriage ribbon + continuous outer handrail ribbon along the 2.5 turns.
  const steps = Math.ceil(SEGMENTS_PER_TURN * SKY_TREE_TURNS);
  const positions: number[] = [];
  const indices: number[] = [];
  const railPositions: number[] = [];
  const railIndices: number[] = [];
  const outerRailR = SKY_TREE_SPIRAL_RADIUS_M + SKY_TREE_BRANCH_HALF_WIDTH_M + 0.14;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * 2 * Math.PI * SKY_TREE_TURNS;
    const y = SKY_TREE.baseY + height * t;
    const cx = Math.cos(theta);
    const sz = Math.sin(theta);
    for (const side of [-1, 1]) {
      const r = SKY_TREE_SPIRAL_RADIUS_M + side * SKY_TREE_BRANCH_HALF_WIDTH_M;
      positions.push(SKY_TREE.x + cx * r, y - 0.12, SKY_TREE.z + sz * r);
    }
    railPositions.push(SKY_TREE.x + cx * outerRailR, y + 0.72, SKY_TREE.z + sz * outerRailR);
    railPositions.push(SKY_TREE.x + cx * outerRailR, y + 0.86, SKY_TREE.z + sz * outerRailR);
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      railIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const branchGeo = new THREE.BufferGeometry();
  branchGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  branchGeo.setIndex(indices);
  branchGeo.computeVertexNormals();
  const branch = new THREE.Mesh(branchGeo, branchMat);

  const railGeo = new THREE.BufferGeometry();
  railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
  railGeo.setIndex(railIndices);
  railGeo.computeVertexNormals();
  const railMesh = new THREE.Mesh(railGeo, branchMat);
  group.add(branch, railMesh);

  // 2. Individual 3D horizontal carved wooden stair treads along the spiral (`STAIR_TREADS_COUNT = 112`).
  const treadMeshes = new THREE.InstancedMesh(boxGeo, treadMat, STAIR_TREADS_COUNT);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const sweep = SKY_TREE_TURNS * Math.PI * 2;
  const treadDepth = (SKY_TREE_SPIRAL_RADIUS_M * sweep) / STAIR_TREADS_COUNT;
  const treadWidth = SKY_TREE_BRANCH_HALF_WIDTH_M * 1.96;

  for (let i = 0; i < STAIR_TREADS_COUNT; i++) {
    const u = (i + 0.5) / STAIR_TREADS_COUNT;
    const theta = u * sweep;
    const y = SKY_TREE.baseY + height * u;
    q.setFromAxisAngle(up, Math.atan2(-Math.cos(theta), -Math.sin(theta)));
    m.compose(
      new THREE.Vector3(
        SKY_TREE.x + Math.cos(theta) * SKY_TREE_SPIRAL_RADIUS_M,
        y - 0.08,
        SKY_TREE.z + Math.sin(theta) * SKY_TREE_SPIRAL_RADIUS_M
      ),
      q,
      new THREE.Vector3(treadDepth * 1.05, 0.18, treadWidth)
    );
    treadMeshes.setMatrixAt(i, m);
  }
  treadMeshes.instanceMatrix.needsUpdate = true;
  treadMeshes.computeBoundingSphere();
  group.add(treadMeshes);

  // 3. Welcoming Root-Arch Threshold Portal at the base of the spiral staircase (`theta = 0`).
  const entryX = SKY_TREE.x + SKY_TREE_SPIRAL_RADIUS_M;
  const entryZ = SKY_TREE.z;
  const portalArch = new THREE.Mesh(portalArchGeo, barkMat);
  portalArch.position.set(entryX, SKY_TREE.baseY + 1.85, entryZ);
  const portalRune = new THREE.Mesh(portalArchGeo, runeMat);
  portalRune.scale.set(1.02, 1.02, 0.5);
  portalRune.position.set(entryX, SKY_TREE.baseY + 1.9, entryZ);
  group.add(portalArch, portalRune);

  // 4. Radial bough struts connecting the central trunk to the underside of the spiral path, plus outer balustrade posts.
  const strutCount = 28;
  for (let i = 1; i <= strutCount; i++) {
    const t = i / (strutCount + 1);
    const theta = t * 2 * Math.PI * SKY_TREE_TURNS;
    const y = SKY_TREE.baseY + height * t;
    const cx = Math.cos(theta);
    const sz = Math.sin(theta);

    const strutLen = SKY_TREE_SPIRAL_RADIUS_M - SKY_TREE_TRUNK_HALF_M * 0.8;
    const midR = SKY_TREE_TRUNK_HALF_M * 0.8 + strutLen * 0.5;
    const strut = new THREE.Mesh(strutGeo, barkMat);
    strut.scale.set(1, strutLen, 1);
    strut.position.set(SKY_TREE.x + cx * midR, y - 0.65, SKY_TREE.z + sz * midR);
    strut.rotation.set(0, -theta, Math.PI / 2 - 0.25);
    group.add(strut);

    const post = new THREE.Mesh(postGeo, barkMat);
    post.position.set(SKY_TREE.x + cx * outerRailR, y + 0.42, SKY_TREE.z + sz * outerRailR);
    group.add(post);
  }

  // Top observation platform with golden rune trim and central floating crystal spire.
  const topGeo = new THREE.CylinderGeometry(SKY_TREE_TOP_RADIUS_M, SKY_TREE_TOP_RADIUS_M * 0.9, TOP_DISC_THICKNESS_M, 28);
  const topRingGeo = new THREE.TorusGeometry(SKY_TREE_TOP_RADIUS_M - 0.15, 0.12, 8, 32);
  topRingGeo.rotateX(Math.PI / 2);
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(SKY_TREE.x, SKY_TREE.topY - TOP_DISC_THICKNESS_M / 2, SKY_TREE.z);
  const topRing = new THREE.Mesh(topRingGeo, goldMat);
  topRing.position.set(SKY_TREE.x, SKY_TREE.topY + 0.04, SKY_TREE.z);
  const topCrystal = new THREE.Mesh(shardGeo, runeMat);
  topCrystal.scale.set(0.65, 1.8, 0.65);
  topCrystal.position.set(SKY_TREE.x, SKY_TREE.topY + 3.4, SKY_TREE.z);
  group.add(top, topRing, topCrystal);

  ctx.disposableGeometries.push(trunkGeo, ribGeo, strutGeo, postGeo, shardGeo, boxGeo, portalArchGeo, branchGeo, railGeo, topGeo, topRingGeo);
  ctx.disposableMaterials.push(barkMat, branchMat, treadMat, topMat, runeMat, goldMat);
  return { group };
}
// #endregion
