// ============================================================================
// MODULE: World / Models / Skybound Isles / Giant Sky Tree foliage
// DESIGN: Decoration only: a canopy above the observation platform, vines hanging from the spiral's
//         outer edge, exposed roots at the base, and glowing growth. Everything sits outside the walkable
//         band of the spiral, so nothing here changes what the player can stand on. Each kind of piece is
//         one instanced mesh, so the tree costs a handful of draw calls however many pieces it has.
// SUMMARY: Builds the Giant Sky Tree's canopy, hanging vines, roots and glowing growth.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  SKY_TREE,
  SKY_TREE_BRANCH_HALF_WIDTH_M,
  SKY_TREE_GROTTO_MUSHROOM,
  SKY_TREE_GROTTO_WALLS,
  SKY_TREE_SPIRAL_RADIUS_M,
  SKY_TREE_TURNS,
} from '../domain/landmarks/skyboundIsles/skyTreeLayout';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the foliage builder hands back to the scene. */
export interface ISkyTreeFoliageBuildResult {
  readonly group: THREE.Group;
  /** Sways the canopy and vines; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
}
// #endregion

// #region Tuning
const CANOPY_BLOB_COUNT = 14;
const VINE_COUNT = 14;
const ROOT_COUNT = 6;
const GLOW_COUNT = 10;
/** Vines hang from just outside the walkable band, so they never intersect the path. */
const VINE_RADIUS_M = SKY_TREE_SPIRAL_RADIUS_M + SKY_TREE_BRANCH_HALF_WIDTH_M + 0.5;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the canopy, vines, roots and glowing growth of the Giant Sky Tree.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildSkyTreeFoliage(ctx: IWorldModelBuildContext): ISkyTreeFoliageBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-tree-foliage';
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8f6b, emissive: 0x0f766e, emissiveIntensity: 0.6, roughness: 0.7 });
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f6e3a, roughness: 0.9 });
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.95 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x22d3ee, emissiveIntensity: 1.4, roughness: 0.4 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b6358, roughness: 0.95 });
  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const vineGeo = new THREE.CylinderGeometry(0.07, 0.05, 1, 5);
  const rootGeo = new THREE.CylinderGeometry(0.2, 0.45, 1, 6);
  const glowGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const capGeo = new THREE.SphereGeometry(SKY_TREE_GROTTO_MUSHROOM.radius, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  ctx.disposableGeometries.push(blobGeo, vineGeo, rootGeo, glowGeo, boxGeo, capGeo);
  ctx.disposableMaterials.push(leafMat, vineMat, rootMat, glowMat, stoneMat);

  const dummy = new THREE.Object3D();
  const topY = SKY_TREE.topY;
  const totalAngle = 2 * Math.PI * SKY_TREE_TURNS;
  const rise = topY - SKY_TREE.baseY;

  // Canopy: leafy blobs ringed around the top of the trunk, above the observation platform.
  const blobRest: THREE.Vector3[] = [];
  const blobScale: THREE.Vector3[] = [];
  for (let i = 0; i < CANOPY_BLOB_COUNT; i++) {
    const a = (i / CANOPY_BLOB_COUNT) * Math.PI * 2;
    const r = 2.5 + (i % 3) * 1.2;
    const s = 1.6 + (i % 4) * 0.35;
    blobRest.push(new THREE.Vector3(SKY_TREE.x + Math.cos(a) * r, topY + 1.5 + (i % 2) * 0.8, SKY_TREE.z + Math.sin(a) * r));
    blobScale.push(new THREE.Vector3(s, s * 0.7, s));
  }
  const blobs = new THREE.InstancedMesh(blobGeo, leafMat, CANOPY_BLOB_COUNT);
  group.add(blobs);

  // Vines: hang from the spiral's outer edge, several metres long, with a glowing tip.
  const vineRest: { pos: THREE.Vector3; length: number }[] = [];
  for (let i = 0; i < VINE_COUNT; i++) {
    const theta = ((i + 0.5) / VINE_COUNT) * totalAngle;
    const branchY = SKY_TREE.baseY + (rise * theta) / totalAngle;
    const length = 3.5 + (i % 3) * 1.2;
    const cx = SKY_TREE.x + Math.cos(theta) * VINE_RADIUS_M;
    const cz = SKY_TREE.z + Math.sin(theta) * VINE_RADIUS_M;
    vineRest.push({ pos: new THREE.Vector3(cx, branchY - length / 2, cz), length });
  }
  const vines = new THREE.InstancedMesh(vineGeo, vineMat, VINE_COUNT);
  group.add(vines);

  // Glowing growth: vine tips, then small luminous flowers in the roots' hollows.
  const glowPositions: THREE.Vector3[] = [];
  for (let i = 0; i < VINE_COUNT; i += 2) {
    const v = vineRest[i];
    glowPositions.push(new THREE.Vector3(v.pos.x, v.pos.y - v.length / 2, v.pos.z));
  }
  for (let i = 0; i < GLOW_COUNT; i++) {
    const a = (i / GLOW_COUNT) * Math.PI * 2 + 0.6;
    const r = 2.2 + (i % 3) * 0.5;
    glowPositions.push(new THREE.Vector3(SKY_TREE.x + Math.cos(a) * r, SKY_TREE.baseY + 0.25, SKY_TREE.z + Math.sin(a) * r));
  }
  const glows = new THREE.InstancedMesh(glowGeo, glowMat, glowPositions.length);
  glowPositions.forEach((p, i) => {
    dummy.position.copy(p);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    glows.setMatrixAt(i, dummy.matrix);
  });
  glows.instanceMatrix.needsUpdate = true;
  group.add(glows);

  // Exposed roots: tapered, half-buried, radiating from the trunk base across the islet deck.
  const roots = new THREE.InstancedMesh(rootGeo, rootMat, ROOT_COUNT);
  for (let i = 0; i < ROOT_COUNT; i++) {
    const a = (i / ROOT_COUNT) * Math.PI * 2 + 0.3;
    const length = 2.6 + (i % 2) * 0.6;
    dummy.position.set(SKY_TREE.x + Math.cos(a) * (1.6 + length / 2), SKY_TREE.baseY + 0.12, SKY_TREE.z + Math.sin(a) * (1.6 + length / 2));
    dummy.rotation.set(0, -a, Math.PI / 2);
    dummy.scale.set(1, length, 1);
    dummy.updateMatrix();
    roots.setMatrixAt(i, dummy.matrix);
  }
  roots.instanceMatrix.needsUpdate = true;
  group.add(roots);

  // Mushroom grotto: stone walls matching the solid boxes, and the bounce mushroom's glowing cap.
  const walls = new THREE.InstancedMesh(boxGeo, stoneMat, SKY_TREE_GROTTO_WALLS.length);
  SKY_TREE_GROTTO_WALLS.forEach((w, i) => {
    dummy.position.set((w.minX + w.maxX) / 2, (w.minY + w.maxY) / 2, (w.minZ + w.maxZ) / 2);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(w.maxX - w.minX, w.maxY - w.minY, w.maxZ - w.minZ);
    dummy.updateMatrix();
    walls.setMatrixAt(i, dummy.matrix);
  });
  walls.instanceMatrix.needsUpdate = true;
  group.add(walls);

  const cap = new THREE.Mesh(capGeo, glowMat);
  cap.position.set(SKY_TREE_GROTTO_MUSHROOM.x, SKY_TREE_GROTTO_MUSHROOM.topY, SKY_TREE_GROTTO_MUSHROOM.z);
  group.add(cap);

  // Idle motion: the canopy breathes and the vines sway in the air, so the tree never looks frozen.
  const update = (elapsedSec: number) => {
    for (let i = 0; i < CANOPY_BLOB_COUNT; i++) {
      const p = blobRest[i];
      dummy.position.set(p.x, p.y + Math.sin(elapsedSec * 0.9 + i * 0.7) * 0.25, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.copy(blobScale[i]);
      dummy.updateMatrix();
      blobs.setMatrixAt(i, dummy.matrix);
    }
    blobs.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < VINE_COUNT; i++) {
      const v = vineRest[i];
      dummy.position.copy(v.pos);
      dummy.rotation.set(0, 0, Math.sin(elapsedSec * 1.3 + i * 1.1) * 0.06);
      dummy.scale.set(1, v.length, 1);
      dummy.updateMatrix();
      vines.setMatrixAt(i, dummy.matrix);
    }
    vines.instanceMatrix.needsUpdate = true;
  };
  // Fill the matrices once so each instanced mesh gets a correct bounding sphere for culling; the
  // margin covers the sway, so a piece is never culled while it can still be seen.
  update(0);
  for (const m of [blobs, vines, glows, roots, walls]) {
    m.computeBoundingSphere();
    if (m.boundingSphere) m.boundingSphere.radius += 2.0;
  }

  return { group, update };
}
// #endregion
