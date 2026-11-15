// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: Everything repeated is instanced: one InstancedMesh per prop kind and tint, one for
//         all wall boulders, one for all stalactites. Placement is deterministic (seeded), so
//         the mine looks the same on every load.
// SUMMARY: Places the props table, half-buried boulders along every rock wall, and
//          stalactites under the ceilings. Does not build floors, walls or set pieces.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { sampleAncientMineLayer } from '../../domain/landmarks/ancientMine/ancientMineFloor';
import { MINE_PROP_KINDS, type IMinePropPlacement } from '../../domain/landmarks/ancientMine/ancientMineProps';
import { perturbGeometryVertices } from '../shaderAndMaterialBuilders';
import type { IWallFoot } from './ancientMineGreybox';
import { MINERAL_TINTS, buildPropGeometry } from './propGeometries';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
/** Summary: Mean spacing of boulders along a wall foot, meters. */
const BOULDER_SPACING = 3.2;
/** Summary: Walls lower than this get no boulders (they are steps, not cave walls). */
const MIN_WALL_HEIGHT_FOR_BOULDERS = 2.5;
/** Summary: Grid step used to look for stalactite spots, meters. */
const STALACTITE_GRID = 6;
/** Summary: Stalactites hang only where the ceiling is at least this far above the floor. */
const STALACTITE_MIN_CLEARANCE = 7;
const STALACTITE_BOUNDS = { minLx: -110, maxLx: 124, minLz: 0, maxLz: 506 } as const;

/** Summary: Flame colour and strength of floor torch stands. */
const TORCH_LIGHT = { color: 0xff9a30, intensity: 5.5 } as const;
// #endregion

// #region Types
type Own = <T extends THREE.BufferGeometry>(g: T) => T;

/** Summary: What dressing needs from the mine builder. */
export interface IDressingContext {
  readonly group: THREE.Group;
  readonly own: Own;
  readonly ownMaterial?: <T extends THREE.Material>(m: T) => T;
  readonly propMaterial: THREE.Material;
  readonly glowPropMaterial: THREE.Material;
  readonly rockMaterial: THREE.Material;
  readonly addTorch: (x: number, y: number, z: number, color?: number, intensity?: number) => void;
  readonly addLight?: (x: number, y: number, z: number, color: number, intensity: number) => void;
}
// #endregion

// ======================== PUBLIC DRESSING ======================== \\
// #region Props
/**
 * Summary: Snaps a wall-mounted prop (`mineralVein`) onto the closest cave wall segment so it
 *          never floats in open air and always sits flush against the rock face.
 */
function snapToNearestWall(
  lx: number,
  lz: number,
  fallbackYaw: number,
  wallFeet: readonly IWallFoot[]
): { x: number; z: number; yaw: number; floorY: number | null } {
  let bestDistSq = Infinity;
  let bestX = lx;
  let bestZ = lz;
  let bestYaw = fallbackYaw;
  let bestY: number | null = null;

  for (const foot of wallFeet) {
    if (foot.height < 2.2) continue;
    const dx = foot.x1 - foot.x0;
    const dz = foot.z1 - foot.z0;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 1e-4) continue;
    const t = Math.max(0.15, Math.min(0.85, ((lx - foot.x0) * dx + (lz - foot.z0) * dz) / lenSq));
    const px = foot.x0 + dx * t;
    const pz = foot.z0 + dz * t;
    const distSq = (lx - px) * (lx - px) + (lz - pz) * (lz - pz);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      // Push 0.04m into the rock wall along the inward normal so the seam is embedded flush
      bestX = px - foot.nx * 0.04;
      bestZ = pz - foot.nz * 0.04;
      bestYaw = Math.atan2(foot.nx, foot.nz);
      bestY = foot.y;
    }
  }
  return { x: bestX, z: bestZ, yaw: bestYaw, floorY: bestY };
}

/**
 * Summary: Instances every placement, standing on the floor below it (plus its lift).
 * Design: Crystals and veins use a tint-matched emissive material so they keep their rich mineral
 *         colour instead of washing out to white; mineral veins snap directly onto cave walls.
 * @param ctx Group, geometry ownership, materials and torch helper.
 * @param placements The props table to place.
 * @param wallFeet Optional wall foot segments used to snap wall-mounted mineral veins flush to rock.
 */
export function addMineProps(
  ctx: IDressingContext,
  placements: readonly IMinePropPlacement[],
  wallFeet: readonly IWallFoot[] = []
): void {
  const buckets = new Map<string, IMinePropPlacement[]>();
  for (const p of placements) {
    const key = `${p.kind}|${p.tint ?? ''}`;
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }
  const dummy = new THREE.Object3D();
  for (const [key, list] of buckets) {
    const first = list[0];
    const tint = first.tint !== undefined ? MINERAL_TINTS[first.tint] : undefined;
    const geometry = ctx.own(buildPropGeometry(first.kind, tint));
    const isGlowing = first.kind === 'crystalCluster' || first.kind === 'mineralVein';
    let matToUse = ctx.propMaterial;
    if (isGlowing) {
      if (ctx.ownMaterial && tint !== undefined) {
        matToUse = ctx.ownMaterial(
          new THREE.MeshStandardMaterial({
            vertexColors: true,
            emissive: new THREE.Color(tint),
            emissiveIntensity: first.kind === 'mineralVein' ? 0.16 : 0.28,
            roughness: 0.45,
            metalness: 0.35,
          })
        );
      } else {
        matToUse = ctx.glowPropMaterial;
      }
    }
    const mesh = new THREE.InstancedMesh(geometry, matToUse, list.length);
    mesh.name = `ancient-mine-props-${key}`;
    list.forEach((p, i) => {
      if (p.kind === 'mineralVein' && wallFeet.length > 0) {
        const snapped = snapToNearestWall(p.lx, p.lz, p.yaw ?? 0, wallFeet);
        const floorY = snapped.floorY ?? floorUnder(snapped.x, snapped.z);
        dummy.position.set(snapped.x, floorY + (p.lift ?? 0), snapped.z);
        dummy.rotation.set(0, snapped.yaw, 0);
      } else {
        const floorY = floorUnder(p.lx, p.lz);
        dummy.position.set(p.lx, floorY + (p.lift ?? 0), p.lz);
        dummy.rotation.set(0, p.yaw ?? 0, 0);
        if (p.kind === 'torchStand' || p.kind === 'brazier') {
          const lightY = floorY + MINE_PROP_KINDS[p.kind].height + 0.45;
          if (ctx.addLight) {
            ctx.addLight(p.lx, lightY, p.lz, TORCH_LIGHT.color, TORCH_LIGHT.intensity);
          } else {
            ctx.addTorch(p.lx, lightY, p.lz, TORCH_LIGHT.color, TORCH_LIGHT.intensity);
          }
        }
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    ctx.group.add(mesh);
  }
}
// #endregion

// #region Rock
/**
 * Summary: Half-buried boulders along every cave wall and stalactites under high ceilings.
 * Design: Boulders sit mostly inside the rock (centre pushed behind the wall line) so they
 *         roughen the silhouette without stealing walkable floor.
 * @param ctx Group, geometry ownership and the rock material.
 * @param wallFeet Wall foot runs from the greybox.
 */
export function addRockDressing(ctx: IDressingContext, wallFeet: readonly IWallFoot[]): void {
  const random = seededRandom(0x5eed);
  const boulders: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const isDressedArchitecturalZone = (x: number, z: number): boolean =>
    // Entrance portal & threshold
    (z <= 9 && Math.abs(x) <= 14) ||
    // Underground Dwarven Quarters portal & hall
    (x >= -77 && x <= -41 && z >= 125 && z <= 159) ||
    // East chasm War Room descent & waterfall spout
    (x >= 69 && z >= 192 && z <= 278) ||
    // King's Balcony & Royal Niche
    (x >= -16 && x <= 22 && z >= 291 && z <= 307) ||
    // Secret Vault Stairs & Royal Treasure Vault
    z >= 385;

  for (const foot of wallFeet) {
    if (foot.height < MIN_WALL_HEIGHT_FOR_BOULDERS) continue;
    const length = Math.hypot(foot.x1 - foot.x0, foot.z1 - foot.z0);
    const count = Math.floor(length / BOULDER_SPACING);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.2 + random() * 0.6) / Math.max(1, count);
      const size = 0.9 + random() * 1.6;
      const x = foot.x0 + (foot.x1 - foot.x0) * t - foot.nx * size * 0.88;
      const z = foot.z0 + (foot.z1 - foot.z0) * t - foot.nz * size * 0.88;
      // Resting on the floor (never floating), mostly sunk into the wall.
      const y = foot.y + size * (0.1 + random() * 0.35);
      e.set(random() * 3, random() * 6, random() * 3);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(size, size * (0.7 + random() * 0.6), size));
      if (isDressedArchitecturalZone(x, z)) continue;
      boulders.push(m.clone());
    }
  }
  const boulderGeo = ctx.own(new THREE.DodecahedronGeometry(1, 1));
  perturbGeometryVertices(boulderGeo, 0.22, 1.3);
  ctx.group.add(instanced(boulderGeo, ctx.rockMaterial, boulders, 'ancient-mine-boulders'));

  const stalactites: THREE.Matrix4[] = [];
  for (let lz = STALACTITE_BOUNDS.minLz; lz <= STALACTITE_BOUNDS.maxLz; lz += STALACTITE_GRID) {
    for (let lx = STALACTITE_BOUNDS.minLx; lx <= STALACTITE_BOUNDS.maxLx; lx += STALACTITE_GRID) {
      const x = lx + (random() - 0.5) * STALACTITE_GRID;
      const z = lz + (random() - 0.5) * STALACTITE_GRID;
      const s = sampleAncientMineLayer(x, z, 0);
      if (s === null || s.ceilingY - s.height < STALACTITE_MIN_CLEARANCE || random() < 0.35) continue;
      const length = 1.2 + random() * 3.2;
      const radius = 0.25 + random() * 0.45;
      if (isDressedArchitecturalZone(x, z)) continue;
      m.compose(new THREE.Vector3(x, s.ceilingY - length / 2 + 0.2, z), q.identity(), new THREE.Vector3(radius, length, radius));
      stalactites.push(m.clone());
    }
  }
  const coneGeo = ctx.own(new THREE.ConeGeometry(1, 1, 6));
  coneGeo.rotateX(Math.PI);
  ctx.group.add(instanced(coneGeo, ctx.rockMaterial, stalactites, 'ancient-mine-stalactites'));
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Helpers
/** Summary: Highest floor at a local point (props stand on top floors), or the upper cavern floor. */
function floorUnder(lx: number, lz: number): number {
  const upper = sampleAncientMineLayer(lx, lz, 1);
  const lower = sampleAncientMineLayer(lx, lz, 0);
  return upper?.height ?? lower?.height ?? 0;
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, matrices: readonly THREE.Matrix4[], name: string): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, matrices.length));
  matrices.forEach((mx, i) => mesh.setMatrixAt(i, mx));
  mesh.count = matrices.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = name;
  return mesh;
}

/** Summary: Small deterministic PRNG (mulberry32), so dressing is identical on every load. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// #endregion
