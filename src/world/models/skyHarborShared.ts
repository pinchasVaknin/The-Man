// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Harbor
// DESIGN: Shared by the Sky Harbor builders so every part uses the same handful of
//         materials (registered once for disposal) and the same box/rope helpers.
// SUMMARY: Sky Harbor material palette and small mesh helpers. Builds nothing on its own.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import type { ISkyDeckRect } from '../domain/landmarksRegistry';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: The Sky Harbor material palette. */
export interface IHarborMaterials {
  readonly marble: THREE.MeshStandardMaterial;
  readonly stone: THREE.MeshStandardMaterial;
  readonly darkStone: THREE.MeshStandardMaterial;
  readonly gold: THREE.MeshStandardMaterial;
  readonly runeDim: THREE.MeshStandardMaterial;
  readonly crystal: THREE.MeshStandardMaterial;
  readonly wood: THREE.MeshStandardMaterial;
  readonly darkWood: THREE.MeshStandardMaterial;
  readonly grass: THREE.MeshStandardMaterial;
  readonly leaves: THREE.MeshStandardMaterial;
  readonly water: THREE.MeshStandardMaterial;
  readonly mushroomCap: THREE.MeshStandardMaterial;
  readonly mushroomStem: THREE.MeshStandardMaterial;
  readonly petal: THREE.MeshStandardMaterial;
  readonly lanternGlow: THREE.MeshStandardMaterial;
  readonly canvas: THREE.MeshStandardMaterial;
  readonly rope: THREE.LineBasicMaterial;
}
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Materials
/** Summary: Creates the palette and registers every material for disposal. */
export function createMaterials(ctx: IWorldModelBuildContext): IHarborMaterials {
  const std = (params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial(params);
    ctx.disposableMaterials.push(m);
    return m;
  };
  const rope = new THREE.LineBasicMaterial({ color: 0x5b4a36 });
  ctx.disposableMaterials.push(rope);
  return {
    marble: std({ color: 0xf1ede4, roughness: 0.45, bumpMap: ctx.textures.rockBump, bumpScale: 0.015 }),
    stone: std({ color: 0xd8d2c4, roughness: 0.78, bumpMap: ctx.textures.rockBump, bumpScale: 0.04 }),
    darkStone: std({ color: 0x8a8476, roughness: 0.85, bumpMap: ctx.textures.rockBump, bumpScale: 0.06 }),
    gold: std({ color: 0xd4a73a, roughness: 0.32, metalness: 0.8 }),
    runeDim: std({ color: 0x6fa8c8, emissive: 0x1d6f9a, emissiveIntensity: 0.35, roughness: 0.4 }),
    crystal: std({ color: 0x7dd3fc, emissive: 0x0ea5e9, emissiveIntensity: 1.8, roughness: 0.12, transparent: true, opacity: 0.92 }),
    wood: std({ color: 0x8a6440, roughness: 0.78 }),
    darkWood: std({ color: 0x5a3e26, roughness: 0.82 }),
    grass: std({ color: 0x6fa54a, roughness: 0.95 }),
    leaves: std({ color: 0x4e9a46, emissive: 0x14532d, emissiveIntensity: 0.12, roughness: 0.9 }),
    water: std({ color: 0x5ec8e5, emissive: 0x0e7490, emissiveIntensity: 0.25, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 }),
    mushroomCap: std({ color: 0xf472b6, emissive: 0xbe185d, emissiveIntensity: 0.35, roughness: 0.6 }),
    mushroomStem: std({ color: 0xfdf2f8, roughness: 0.8 }),
    petal: std({ color: 0xc4b5fd, emissive: 0x8b5cf6, emissiveIntensity: 0.6, roughness: 0.5, side: THREE.DoubleSide }),
    lanternGlow: std({ color: 0xfef3c7, emissive: 0xfbbf24, emissiveIntensity: 1.6 }),
    canvas: std({ color: 0xe9e2cf, roughness: 0.9, side: THREE.DoubleSide }),
    rope,
  };
}

/** Summary: Places a unit box scaled to (sx, sy, sz) with its centre at (x, y, z). */
export function boxMesh(geo: THREE.BoxGeometry, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  return mesh;
}

/** Summary: Adds a straight rope line through `points`. */
export function addRope(group: THREE.Group, mat: THREE.LineBasicMaterial, ctx: IWorldModelBuildContext, points: THREE.Vector3[]): void {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  ctx.disposableGeometries.push(geo);
  group.add(new THREE.Line(geo, mat));
}

/** Summary: Slab whose top is exactly at the deck's `y`. */
export function deckSlab(box: THREE.BoxGeometry, mat: THREE.Material, d: ISkyDeckRect, thickness: number): THREE.Mesh {
  return boxMesh(box, mat, (d.minX + d.maxX) / 2, d.y - thickness / 2, (d.minZ + d.maxZ) / 2, d.maxX - d.minX, thickness, d.maxZ - d.minZ);
}
// #endregion
