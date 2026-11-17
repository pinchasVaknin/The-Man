// ============================================================================
// MODULE: World / Models / Skybound Isles / Giant Sky Tree foliage
// DESIGN: Decoration only: a canopy above the observation platform, vines hanging from the spiral's
//         outer edge, exposed roots at the base, and glowing growth. Everything sits outside the walkable
//         band of the spiral, so nothing here changes what the player can stand on.
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
 * @returns The root group (not yet added to the scene).
 */
export function buildSkyTreeFoliage(ctx: IWorldModelBuildContext): ISkyTreeFoliageBuildResult {
  const group = new THREE.Group();
  group.name = 'sky-tree-foliage';
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8f6b, emissive: 0x0f766e, emissiveIntensity: 0.6, roughness: 0.7 });
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f6e3a, roughness: 0.9 });
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.95 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x22d3ee, emissiveIntensity: 1.4, roughness: 0.4 });
  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const vineGeo = new THREE.CylinderGeometry(0.07, 0.05, 1, 5);
  const rootGeo = new THREE.CylinderGeometry(0.2, 0.45, 1, 6);
  const glowGeo = new THREE.SphereGeometry(0.16, 8, 6);
  ctx.disposableGeometries.push(blobGeo, vineGeo, rootGeo, glowGeo);
  ctx.disposableMaterials.push(leafMat, vineMat, rootMat, glowMat);

  const topY = SKY_TREE.topY;
  // Canopy: leafy blobs ringed around the top of the trunk, above the observation platform.
  for (let i = 0; i < CANOPY_BLOB_COUNT; i++) {
    const a = (i / CANOPY_BLOB_COUNT) * Math.PI * 2;
    const r = 2.5 + (i % 3) * 1.2;
    const blob = new THREE.Mesh(blobGeo, leafMat);
    const s = 1.6 + (i % 4) * 0.35;
    blob.scale.set(s, s * 0.7, s);
    blob.position.set(SKY_TREE.x + Math.cos(a) * r, topY + 1.5 + (i % 2) * 0.8, SKY_TREE.z + Math.sin(a) * r);
    group.add(blob);
  }

  // Vines: hang from the spiral's outer edge, several metres long, with a glowing tip.
  const totalAngle = 2 * Math.PI * SKY_TREE_TURNS;
  const rise = topY - SKY_TREE.baseY;
  for (let i = 0; i < VINE_COUNT; i++) {
    const theta = ((i + 0.5) / VINE_COUNT) * totalAngle;
    const branchY = SKY_TREE.baseY + (rise * theta) / totalAngle;
    const length = 3.5 + (i % 3) * 1.2;
    const cx = SKY_TREE.x + Math.cos(theta) * VINE_RADIUS_M;
    const cz = SKY_TREE.z + Math.sin(theta) * VINE_RADIUS_M;
    const vine = new THREE.Mesh(vineGeo, vineMat);
    vine.scale.set(1, length, 1);
    vine.position.set(cx, branchY - length / 2, cz);
    group.add(vine);
    if (i % 2 === 0) {
      const tip = new THREE.Mesh(glowGeo, glowMat);
      tip.position.set(cx, branchY - length, cz);
      group.add(tip);
    }
  }

  // Exposed roots: tapered, half-buried, radiating from the trunk base across the islet deck.
  for (let i = 0; i < ROOT_COUNT; i++) {
    const a = (i / ROOT_COUNT) * Math.PI * 2 + 0.3;
    const length = 2.6 + (i % 2) * 0.6;
    const root = new THREE.Mesh(rootGeo, rootMat);
    root.rotation.set(0, 0, Math.PI / 2);
    root.rotation.y = -a;
    root.scale.set(1, length, 1);
    root.position.set(SKY_TREE.x + Math.cos(a) * (1.6 + length / 2), SKY_TREE.baseY + 0.12, SKY_TREE.z + Math.sin(a) * (1.6 + length / 2));
    group.add(root);
  }

  // Glowing growth: small luminous flowers in the roots' hollows.
  for (let i = 0; i < GLOW_COUNT; i++) {
    const a = (i / GLOW_COUNT) * Math.PI * 2 + 0.6;
    const r = 2.2 + (i % 3) * 0.5;
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(SKY_TREE.x + Math.cos(a) * r, SKY_TREE.baseY + 0.25, SKY_TREE.z + Math.sin(a) * r);
    group.add(glow);
  }

  // Mushroom grotto: stone walls matching the solid boxes, and the bounce mushroom's glowing cap.
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b6358, roughness: 0.95 });
  ctx.disposableMaterials.push(stoneMat);
  for (const w of SKY_TREE_GROTTO_WALLS) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w.maxX - w.minX, w.maxY - w.minY, w.maxZ - w.minZ), stoneMat);
    wall.position.set((w.minX + w.maxX) / 2, (w.minY + w.maxY) / 2, (w.minZ + w.maxZ) / 2);
    group.add(wall);
  }
  const capGeo = new THREE.SphereGeometry(SKY_TREE_GROTTO_MUSHROOM.radius, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, glowMat);
  cap.position.set(SKY_TREE_GROTTO_MUSHROOM.x, SKY_TREE_GROTTO_MUSHROOM.topY, SKY_TREE_GROTTO_MUSHROOM.z);
  group.add(cap);
  ctx.disposableGeometries.push(capGeo);

  return { group };
}
// #endregion
