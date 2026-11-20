// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Harbor
// DESIGN: Shared by the Sky Harbor builders so every part uses the same handful of
//         materials (registered once for disposal), real 3D botanical tree models,
//         and smooth continuous pathway helpers.
// SUMMARY: Sky Harbor material palette, real 3D tree loader, and mesh helpers.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import type { ISkyDeckRect, ISkySolidBox } from '../../domain/landmarksRegistry';
import {
  buildInstancedFloraTreeBatch,
  type IInstancedFloraTreePlacement,
  type TreeFloraKey,
} from './vegetationModels';
import type { IWorldModelBuildContext } from '../types';
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
/** Summary: Creates the palette with rich carved stone/marble textures and registers every material for disposal. */
export function createMaterials(ctx: IWorldModelBuildContext): IHarborMaterials {
  const std = (params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial(params);
    ctx.disposableMaterials.push(m);
    return m;
  };

  // Use the procedural rockAlbedo, rockBump, timberAlbedo, and barkBump textures so pillars, gates, and walls have crisp architectural grain.
  const marbleMap = ctx.textures.rockAlbedo;
  const stoneMap = ctx.textures.rockAlbedo;
  const pillarBump = ctx.textures.rockBump;
  const timberMap = ctx.textures.timberAlbedo;
  const barkBump = ctx.textures.barkBump;

  const rope = new THREE.LineBasicMaterial({ color: 0x5b4a36 });
  ctx.disposableMaterials.push(rope);
  return {
    marble: std({ color: 0xf4f1ea, map: marbleMap, roughness: 0.48, bumpMap: pillarBump, bumpScale: 0.065 }),
    stone: std({ color: 0xd8d2c4, map: stoneMap, roughness: 0.76, bumpMap: pillarBump, bumpScale: 0.085 }),
    darkStone: std({ color: 0x8a8476, map: stoneMap, roughness: 0.84, bumpMap: pillarBump, bumpScale: 0.11 }),
    gold: std({ color: 0xd4a73a, roughness: 0.3, metalness: 0.82, bumpMap: pillarBump, bumpScale: 0.02 }),
    runeDim: std({ color: 0x6fa8c8, emissive: 0x1d6f9a, emissiveIntensity: 0.35, roughness: 0.4 }),
    crystal: std({ color: 0x7dd3fc, emissive: 0x0ea5e9, emissiveIntensity: 1.8, roughness: 0.12, transparent: true, opacity: 0.92 }),
    wood: std({ color: 0xa4784c, map: timberMap, roughness: 0.78, bumpMap: barkBump, bumpScale: 0.045 }),
    darkWood: std({ color: 0x6e4c2e, map: timberMap, roughness: 0.84, bumpMap: barkBump, bumpScale: 0.065 }),
    grass: std({ color: 0x6fa54a, map: ctx.textures.terrainAlbedo, bumpMap: ctx.textures.terrainBump, bumpScale: 0.04, roughness: 0.95 }),
    leaves: std({ color: 0x4e9a46, emissive: 0x14532d, emissiveIntensity: 0.12, bumpMap: ctx.textures.foliageBump, bumpScale: 0.05, roughness: 0.9 }),
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

/** Summary: Slab whose top is exactly at the deck's `y`, with a bevelled underside moulding. */
export function deckSlab(box: THREE.BoxGeometry, mat: THREE.Material, d: ISkyDeckRect, thickness: number): THREE.Group {
  const g = new THREE.Group();
  const cx = (d.minX + d.maxX) / 2;
  const cz = (d.minZ + d.maxZ) / 2;
  const sx = d.maxX - d.minX;
  const sz = d.maxZ - d.minZ;
  g.add(boxMesh(box, mat, cx, d.y - thickness * 0.35, cz, sx, thickness * 0.7, sz));
  g.add(boxMesh(box, mat, cx, d.y - thickness * 0.82, cz, Math.max(0.4, sx - 0.5), thickness * 0.36, Math.max(0.4, sz - 0.5)));
  return g;
}

/**
 * Summary: Draws every railing box (id starting with `rail-`) as an open architectural balustrade
 *          (bottom plinth, top handrail, and spaced vertical balusters + end posts) instead of a solid wall.
 */
export function buildRailInstances(
  ctx: IWorldModelBuildContext,
  box: THREE.BoxGeometry,
  mat: THREE.Material,
  boxes: readonly ISkySolidBox[]
): THREE.Group {
  const rails = boxes.filter((b) => b.id.startsWith('rail-'));
  const group = new THREE.Group();
  if (rails.length === 0) return group;

  const transforms: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  for (const r of rails) {
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    const sx = r.maxX - r.minX;
    const sz = r.maxZ - r.minZ;
    const sy = Math.max(0.4, r.maxY - r.minY);
    const yaw = r.yaw ?? 0;
    q.setFromAxisAngle(up, yaw);

    // Top handrail bar
    m.compose(new THREE.Vector3(cx, r.maxY - 0.08, cz), q, new THREE.Vector3(sx, 0.14, sz));
    transforms.push(m.clone());

    // Bottom plinth kerb bar
    m.compose(new THREE.Vector3(cx, r.minY + 0.09, cz), q, new THREE.Vector3(sx, 0.18, sz));
    transforms.push(m.clone());

    // Spaced vertical balusters along the longer horizontal axis of the railing box
    const alongX = sx >= sz;
    const span = alongX ? sx : sz;
    const thick = Math.min(0.24, alongX ? sz : sx);
    const postCount = Math.max(2, Math.min(10, Math.floor(span / 0.85) + 1));
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const midY = (r.minY + r.maxY) / 2;
    const postH = Math.max(0.2, sy - 0.24);

    for (let i = 0; i < postCount; i++) {
      const u = postCount === 1 ? 0 : i / (postCount - 1) - 0.5;
      const offset = u * Math.max(0, span - thick);
      const lx = alongX ? offset : 0;
      const lz = alongX ? 0 : offset;
      const wx = cx + lx * cosY + lz * sinY;
      const wz = cz - lx * sinY + lz * cosY;
      const isEnd = i === 0 || i === postCount - 1;
      const wPost = isEnd ? thick * 1.15 : thick * 0.72;
      m.compose(new THREE.Vector3(wx, midY, wz), q, new THREE.Vector3(wPost, postH, wPost));
      transforms.push(m.clone());
    }
  }

  const inst = new THREE.InstancedMesh(box, mat, transforms.length);
  transforms.forEach((mat4, idx) => inst.setMatrixAt(idx, mat4));
  inst.instanceMatrix.needsUpdate = true;
  inst.computeBoundingSphere();
  inst.castShadow = !ctx.isSoftwareGl;
  group.add(inst);
  return group;
}

/**
 * Summary: Builds a carved 3D staircase / stepped ramp along `r`, with individual horizontal stair
 *          treads, sloped side stringers, and under-carriage support so its top follows the walkable surface.
 */
export function rampSlab(
  box: THREE.BoxGeometry,
  mat: THREE.Material,
  r: { ax: number; ay: number; az: number; bx: number; by: number; bz: number; halfWidth: number },
  thickness: number
): THREE.Group {
  const dx = r.bx - r.ax;
  const dy = r.by - r.ay;
  const dz = r.bz - r.az;
  const horiz = Math.hypot(dx, dz) || 0.001;
  const length = Math.hypot(horiz, dy);
  const yaw = Math.atan2(-dz, dx);
  const pitch = Math.atan2(dy, horiz);

  const group = new THREE.Group();

  // Sloped under-carriage spine and side stringer kerbs (smooth underside, raised side stringers)
  const spineGroup = new THREE.Group();
  spineGroup.position.set((r.ax + r.bx) / 2, (r.ay + r.by) / 2, (r.az + r.bz) / 2);
  spineGroup.rotation.order = 'YZX';
  spineGroup.rotation.y = yaw;
  spineGroup.rotation.z = pitch;

  const carriage = new THREE.Mesh(box, mat);
  carriage.scale.set(length, thickness * 0.92, Math.max(0.3, r.halfWidth * 1.88));
  carriage.position.y = -thickness * 0.52;
  spineGroup.add(carriage);

  for (const side of [-1, 1]) {
    const stringer = new THREE.Mesh(box, mat);
    stringer.scale.set(length + 0.12, thickness * 0.96, 0.24);
    stringer.position.set(0, -thickness * 0.34, side * (r.halfWidth - 0.1));
    spineGroup.add(stringer);
  }
  group.add(spineGroup);

  // Horizontal carved stair treads along the top of the ramp (tucked inside the carriage depth so no corners poke out below)
  const stepCount = Math.max(8, Math.min(40, Math.floor(horiz / 0.52)));
  const stepRun = horiz / stepCount;
  const stepRise = Math.abs(dy) / stepCount;
  const treadHeight = Math.min(thickness * 0.48, Math.max(0.1, stepRise * 0.82));
  const treadDepth = stepRun * 1.05;
  const treadWidth = Math.max(0.4, r.halfWidth * 1.82);

  for (let i = 0; i < stepCount; i++) {
    const u = (i + 0.5) / stepCount;
    const sx = r.ax + dx * u;
    const sy = r.ay + dy * u;
    const sz = r.az + dz * u;
    const tread = boxMesh(box, mat, sx, sy - treadHeight * 0.45, sz, treadDepth, treadHeight, treadWidth, yaw);
    group.add(tread);
  }

  return group;
}

/** Options for building a Skybound tree. */
export interface IDetailedSkyTreeOptions {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale: number;
  readonly style: 'pine' | 'broadleaf' | 'blossom' | 'ancient';
  readonly leafMat?: THREE.Material;
  readonly accentLeafMat?: THREE.Material;
  readonly glowMat?: THREE.Material;
}

function resolveFloraKeyForSkyTree(opts: IDetailedSkyTreeOptions, idx: number): TreeFloraKey {
  const seed = Math.abs(Math.round(opts.x * 13 + opts.z * 7)) + idx;
  if (opts.style === 'pine') return 'pinetree';
  if (opts.style === 'ancient') return seed % 2 === 0 ? 'animtree_wide' : 'oakyellow';
  const variants: readonly TreeFloraKey[] = ['oakgreen', 'animtree', 'animtree_wide', 'animtree_compact'];
  return variants[seed % variants.length];
}

/**
 * Summary: Batch-builds Skybound Isles trees as memory-optimized `THREE.InstancedMesh` instances
 *          sharing the exact same unpacked `masterFloraDrivers` geometries and `gpuInstancedMaterials`
 *          as the rest of the world!
 */
export function buildInstancedSkyTrees(
  ctx: IWorldModelBuildContext,
  parent: THREE.Object3D,
  trees: readonly IDetailedSkyTreeOptions[]
): void {
  const placements: IInstancedFloraTreePlacement[] = trees.map((t, idx) => ({
    x: t.x,
    y: t.y,
    z: t.z,
    scale: t.scale,
    floraKey: resolveFloraKeyForSkyTree(t, idx),
  }));
  buildInstancedFloraTreeBatch(ctx, parent, placements);
}

/**
 * Summary: Backwards-compatible wrapper that builds a single-tree `InstancedMesh` using the shared world flora driver.
 *          Prefer `buildInstancedSkyTrees` to batch all trees on an island into one `InstancedMesh` per submesh.
 */
export function buildDetailedSkyTree(
  ctx: IWorldModelBuildContext,
  _mats: IHarborMaterials,
  opts: IDetailedSkyTreeOptions
): THREE.Group {
  const group = new THREE.Group();
  buildInstancedSkyTrees(ctx, group, [opts]);
  return group;
}

/**
 * Summary: Builds a clean, continuous paved stone roadway with subtle side kerbs through `points` at deck height `y`
 *          (replacing scattered stepping blocks).
 */
export function buildSteppedPathway(
  box: THREE.BoxGeometry,
  stoneMat: THREE.Material,
  trimMat: THREE.Material,
  points: ReadonlyArray<readonly [number, number]>,
  width: number,
  y: number
): THREE.Group {
  const group = new THREE.Group();
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) continue;
    const yaw = Math.atan2(-dz, dx);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const ux = dx / dist;
    const uz = dz / dist;
    const nx = -uz;
    const nz = ux;

    // Continuous smooth marble/stone roadbed
    group.add(boxMesh(box, stoneMat, mx, y + 0.02, mz, dist + 0.25, 0.04, width, yaw));

    // Clean narrow golden/stone side kerbs framing the road
    const kerbOffset = width * 0.5 - 0.08;
    for (const side of [-1, 1]) {
      group.add(
        boxMesh(
          box,
          trimMat,
          mx + nx * kerbOffset * side,
          y + 0.028,
          mz + nz * kerbOffset * side,
          dist + 0.25,
          0.048,
          0.14,
          yaw
        )
      );
    }
  }
  return group;
}

/**
 * Summary: Builds a continuous circular paved ring road with inner and outer kerbs at deck height `y`.
 */
export function buildCircularRingPathway(
  ctx: IWorldModelBuildContext,
  stoneMat: THREE.Material,
  trimMat: THREE.Material,
  cx: number,
  cz: number,
  innerR: number,
  outerR: number,
  y: number
): THREE.Group {
  const group = new THREE.Group();
  const roadGeo = new THREE.RingGeometry(innerR, outerR, 64);
  roadGeo.rotateX(-Math.PI / 2);
  const innerKerbGeo = new THREE.RingGeometry(innerR - 0.16, innerR + 0.08, 64);
  innerKerbGeo.rotateX(-Math.PI / 2);
  const outerKerbGeo = new THREE.RingGeometry(outerR - 0.08, outerR + 0.16, 64);
  outerKerbGeo.rotateX(-Math.PI / 2);
  ctx.disposableGeometries.push(roadGeo, innerKerbGeo, outerKerbGeo);

  const road = new THREE.Mesh(roadGeo, stoneMat);
  road.position.set(cx, y + 0.022, cz);
  road.receiveShadow = !ctx.isSoftwareGl;

  const innerKerb = new THREE.Mesh(innerKerbGeo, trimMat);
  innerKerb.position.set(cx, y + 0.03, cz);

  const outerKerb = new THREE.Mesh(outerKerbGeo, trimMat);
  outerKerb.position.set(cx, y + 0.03, cz);

  group.add(road, innerKerb, outerKerb);
  return group;
}
// #endregion
