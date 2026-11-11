// ============================================================================
// MODULE: World / Builders / Collider Coverage Audit
// DESIGN: Pure report over a scene and the collider list; no rendering needed (SRP)
// SUMMARY: Finds colliders that no visible mesh backs ("hitbox without object")
//          and meshes that are tall enough to block the player but have no collider
//          ("object without hitbox"). Exposed to the browser as window.auditColliders().
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import type { ISolidBuildingBox } from '../domain/worldTypes';
import { getSolidBuildingWorldAABB } from '../domain/collisionWorld';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Result of one coverage audit. */
export interface IColliderAuditReport {
  /** Collider ids with no visible mesh covering at least `minCoverage` of their footprint. */
  readonly unmatchedBoxes: readonly string[];
  /** Tall meshes with no collider overlapping their footprint. */
  readonly unmatchedMeshes: readonly {
    readonly name: string;
    readonly x: number;
    readonly z: number;
    readonly height: number;
    /** Footprint size along x and z, so a reader can tell a post from a wall without the scene. */
    readonly width: number;
    readonly depth: number;
    /** Three.js geometry class, e.g. BoxGeometry or CylinderGeometry. */
    readonly geometry: string;
  }[];
  /** Number of meshes that were considered (after size filters). */
  readonly checkedMeshes: number;
}

interface IFootprint {
  readonly name: string;
  readonly geometry: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly minY: number;
  readonly maxY: number;
}
// #endregion

// ======================== HELPERS ======================== \\
// #region Helpers
/** Summary: Largest footprint side (m) still treated as an object; bigger meshes are terrain or sky. */
const MAX_AUDITED_FOOTPRINT_M = 150;

/** Summary: Name of a mesh, or of its nearest named ancestor (generated meshes are usually unnamed). */
function nearestNamedName(obj: THREE.Object3D): string {
  for (let cur: THREE.Object3D | null = obj; cur; cur = cur.parent) {
    if (cur.name) return cur.name;
  }
  return obj.type;
}

function overlapArea(
  aMinX: number, aMaxX: number, aMinZ: number, aMaxZ: number,
  bMinX: number, bMaxX: number, bMinZ: number, bMaxZ: number
): number {
  const w = Math.min(aMaxX, bMaxX) - Math.max(aMinX, bMinX);
  const d = Math.min(aMaxZ, bMaxZ) - Math.max(aMinZ, bMinZ);
  return w > 0 && d > 0 ? w * d : 0;
}
// #endregion

// ======================== PUBLIC AUDIT ======================== \\
// #region Public Audit
/**
 * Summary: Audits how well the collider list matches the visible scene.
 * Design: Meshes spanning more than 150 m (terrain, sky) and sub-0.5 m meshes (decals, flowers) are ignored,
 *         so long walls such as the 78 m mine chamber walls are still audited (they were hidden by a 60 m cutoff),
 *         so the report lists only objects a player could plausibly walk into.
 * @param scene Scene (or group) whose meshes are compared against the colliders.
 * @param boxes Solid building colliders (`SOLID_BUILDING_BOXES`).
 * @param minCoverage Fraction of a collider's footprint a single mesh must cover to count as its object.
 */
export function auditColliderCoverage(
  scene: THREE.Object3D,
  boxes: readonly ISolidBuildingBox[],
  minCoverage = 0.3
): IColliderAuditReport {
  scene.updateMatrixWorld(true);
  const footprints: IFootprint[] = [];
  const bounds = new THREE.Box3();
  const size = new THREE.Vector3();

  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    bounds.setFromObject(mesh);
    if (bounds.isEmpty()) return;
    bounds.getSize(size);
    if (size.x > MAX_AUDITED_FOOTPRINT_M || size.z > MAX_AUDITED_FOOTPRINT_M || size.y < 0.5) return;
    footprints.push({
      name: nearestNamedName(mesh),
      geometry: mesh.geometry.type,
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minZ: bounds.min.z,
      maxZ: bounds.max.z,
      minY: bounds.min.y,
      maxY: bounds.max.y,
    });
  });

  const unmatchedBoxes: string[] = [];
  for (const box of boxes) {
    const aabb = getSolidBuildingWorldAABB(box);
    const area = (aabb.maxX - aabb.minX) * (aabb.maxZ - aabb.minZ);
    if (area <= 0) continue;
    let best = 0;
    for (const f of footprints) {
      const covered = overlapArea(aabb.minX, aabb.maxX, aabb.minZ, aabb.maxZ, f.minX, f.maxX, f.minZ, f.maxZ);
      best = Math.max(best, covered / area);
    }
    if (best < minCoverage) unmatchedBoxes.push(box.id);
  }

  const unmatchedMeshes: IColliderAuditReport['unmatchedMeshes'][number][] = [];
  for (const f of footprints) {
    const height = f.maxY - f.minY;
    if (height < 0.5) continue;
    const hasCollider = boxes.some((box) => {
      const aabb = getSolidBuildingWorldAABB(box);
      return overlapArea(aabb.minX - 0.5, aabb.maxX + 0.5, aabb.minZ - 0.5, aabb.maxZ + 0.5, f.minX, f.maxX, f.minZ, f.maxZ) > 0;
    });
    if (!hasCollider) {
      unmatchedMeshes.push({
        name: f.name,
        x: (f.minX + f.maxX) / 2,
        z: (f.minZ + f.maxZ) / 2,
        height,
        width: f.maxX - f.minX,
        depth: f.maxZ - f.minZ,
        geometry: f.geometry,
      });
    }
  }

  return { unmatchedBoxes, unmatchedMeshes, checkedMeshes: footprints.length };
}
// #endregion
