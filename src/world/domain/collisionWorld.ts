// ============================================================================
// MODULE: World / Domain / Collision Queries
// DESIGN: Pure geometry and spatial queries over SOLID_BUILDING_BOXES (SRP)
// SUMMARY: Axis-aligned envelopes, point and circle overlap, box push-out, and the
//          spatial hash used to find nearby boxes. The box data lives in landmarks/collisionAndTerraces.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \
// #region Imports & Dependencies
import type { ISolidBuildingBox } from './worldTypes';
import { SOLID_BUILDING_BOXES } from './landmarks/collisionAndTerraces';
// #endregion

// ======================== BOX GEOMETRY ======================== \
// #region Box Geometry
/**
 * Summary: Computes the world-space axis-aligned bounding envelope enclosing an AABB or rotated OBB (`ISolidBuildingBox`).
 * Design: Used for spatial hash grid insertion so rotated OBBs are indexed across all grid cells they touch.
 */
export function getSolidBuildingWorldAABB(box: ISolidBuildingBox): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  if (!box.yaw) {
    return { minX: box.minX, maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ };
  }
  const cx = (box.minX + box.maxX) * 0.5;
  const cz = (box.minZ + box.maxZ) * 0.5;
  const halfW = (box.maxX - box.minX) * 0.5;
  const halfD = (box.maxZ - box.minZ) * 0.5;
  const c = Math.abs(Math.cos(box.yaw));
  const s = Math.abs(Math.sin(box.yaw));
  const extX = halfW * c + halfD * s;
  const extZ = halfW * s + halfD * c;
  return {
    minX: cx - extX,
    maxX: cx + extX,
    minZ: cz - extZ,
    maxZ: cz + extZ,
  };
}

/**
 * Summary: Evaluates whether a horizontal circle at `(px, pz)` with `radius` overlaps an AABB or rotated OBB (`ISolidBuildingBox`).
 * Design: Transforms `(px, pz)` into the box's local coordinate frame when `box.yaw` is defined.
 */
export function pointInsideSolidBuildingBox(
  px: number,
  pz: number,
  radius: number,
  box: ISolidBuildingBox
): boolean {
  if (!box.yaw) {
    return (
      px + radius > box.minX &&
      px - radius < box.maxX &&
      pz + radius > box.minZ &&
      pz - radius < box.maxZ
    );
  }
  const cx = (box.minX + box.maxX) * 0.5;
  const cz = (box.minZ + box.maxZ) * 0.5;
  const halfW = (box.maxX - box.minX) * 0.5;
  const halfD = (box.maxZ - box.minZ) * 0.5;
  const dx = px - cx;
  const dz = pz - cz;
  const cosY = Math.cos(box.yaw);
  const sinY = Math.sin(box.yaw);
  // Inverse Three.js Y-rotation: world -> local
  const lx = dx * cosY - dz * sinY;
  const lz = dx * sinY + dz * cosY;
  return Math.abs(lx) < halfW + radius && Math.abs(lz) < halfD + radius;
}

/**
 * Summary: Resolves horizontal collision between a cylinder of `radius` at `(px, pz)` and an AABB or rotated OBB (`ISolidBuildingBox`).
 * Design: Pushes the point out along the minimum penetration axis in the box's local frame (supporting arbitrary `yaw` rotation)
 *         and transforms the resolved coordinates back to world space.
 */
export function resolveHorizontalBoxCollision(
  px: number,
  pz: number,
  radius: number,
  box: ISolidBuildingBox
): { x: number; z: number; collided: boolean } {
  if (!box.yaw) {
    if (
      px + radius > box.minX &&
      px - radius < box.maxX &&
      pz + radius > box.minZ &&
      pz - radius < box.maxZ
    ) {
      const overlapLeft = px + radius - box.minX;
      const overlapRight = box.maxX - (px - radius);
      const overlapNorth = pz + radius - box.minZ;
      const overlapSouth = box.maxZ - (pz - radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapNorth, overlapSouth);
      if (minOverlap === overlapLeft) return { x: box.minX - radius, z: pz, collided: true };
      if (minOverlap === overlapRight) return { x: box.maxX + radius, z: pz, collided: true };
      if (minOverlap === overlapNorth) return { x: px, z: box.minZ - radius, collided: true };
      return { x: px, z: box.maxZ + radius, collided: true };
    }
    return { x: px, z: pz, collided: false };
  }

  const cx = (box.minX + box.maxX) * 0.5;
  const cz = (box.minZ + box.maxZ) * 0.5;
  const halfW = (box.maxX - box.minX) * 0.5;
  const halfD = (box.maxZ - box.minZ) * 0.5;
  const dx = px - cx;
  const dz = pz - cz;
  const cosY = Math.cos(box.yaw);
  const sinY = Math.sin(box.yaw);
  // Inverse Three.js Y-rotation: world -> local
  let lx = dx * cosY - dz * sinY;
  let lz = dx * sinY + dz * cosY;

  const limitX = halfW + radius;
  const limitZ = halfD + radius;
  if (Math.abs(lx) < limitX && Math.abs(lz) < limitZ) {
    const overlapLeft = lx + limitX;
    const overlapRight = limitX - lx;
    const overlapNorth = lz + limitZ;
    const overlapSouth = limitZ - lz;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapNorth, overlapSouth);
    if (minOverlap === overlapLeft) lx = -limitX;
    else if (minOverlap === overlapRight) lx = limitX;
    else if (minOverlap === overlapNorth) lz = -limitZ;
    else lz = limitZ;

    // Forward Three.js Y-rotation: local -> world
    return {
      x: cx + lx * cosY + lz * sinY,
      z: cz - lx * sinY + lz * cosY,
      collided: true,
    };
  }
  return { x: px, z: pz, collided: false };
}
// #endregion

// ======================== SPATIAL QUERY ======================== \
// #region Spatial Query
const SOLID_BOX_GRID_CELL_SIZE = 32.0;
const EMPTY_SOLID_BOX_LIST: readonly ISolidBuildingBox[] = [];
const _nearbySolidBoxesScratch: ISolidBuildingBox[] = [];
let cachedSolidBoxGrid: Map<number, ISolidBuildingBox[]> | null = null;
let cachedSolidBoxIndex: Map<ISolidBuildingBox, number> | null = null;

function encodeSolidBoxCellKey(cx: number, cz: number): number {
  return ((cx + 512) << 10) | ((cz + 512) & 1023);
}

/** Position of each box in SOLID_BUILDING_BOXES, so multi-cell queries can return them in the same order as a full scan. */
function getSolidBoxIndex(): Map<ISolidBuildingBox, number> {
  if (cachedSolidBoxIndex) return cachedSolidBoxIndex;
  const index = new Map<ISolidBuildingBox, number>();
  for (let i = 0; i < SOLID_BUILDING_BOXES.length; i++) index.set(SOLID_BUILDING_BOXES[i], i);
  cachedSolidBoxIndex = index;
  return index;
}

function getOrBuildSolidBoxGrid(): Map<number, ISolidBuildingBox[]> {
  if (cachedSolidBoxGrid) return cachedSolidBoxGrid;
  const grid = new Map<number, ISolidBuildingBox[]>();
  for (let i = 0; i < SOLID_BUILDING_BOXES.length; i++) {
    const box = SOLID_BUILDING_BOXES[i];
    const aabb = getSolidBuildingWorldAABB(box);
    const minCx = Math.floor(aabb.minX / SOLID_BOX_GRID_CELL_SIZE);
    const maxCx = Math.floor(aabb.maxX / SOLID_BOX_GRID_CELL_SIZE);
    const minCz = Math.floor(aabb.minZ / SOLID_BOX_GRID_CELL_SIZE);
    const maxCz = Math.floor(aabb.maxZ / SOLID_BOX_GRID_CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = encodeSolidBoxCellKey(cx, cz);
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(box);
      }
    }
  }
  cachedSolidBoxGrid = grid;
  return grid;
}

/**
 * Summary: O(1) spatial hash query returning candidate `SOLID_BUILDING_BOXES` overlapping `(x ± radius, z ± radius)`.
 * Design: Eliminates linear scans over all 400+ world building boxes during per-frame wildlife and player collision checks.
 */
export function getNearbySolidBuildingBoxes(
  x: number,
  z: number,
  radius = 1.5
): readonly ISolidBuildingBox[] {
  const grid = getOrBuildSolidBoxGrid();
  const minCx = Math.floor((x - radius) / SOLID_BOX_GRID_CELL_SIZE);
  const maxCx = Math.floor((x + radius) / SOLID_BOX_GRID_CELL_SIZE);
  const minCz = Math.floor((z - radius) / SOLID_BOX_GRID_CELL_SIZE);
  const maxCz = Math.floor((z + radius) / SOLID_BOX_GRID_CELL_SIZE);

  if (minCx === maxCx && minCz === maxCz) {
    return grid.get(encodeSolidBoxCellKey(minCx, minCz)) ?? EMPTY_SOLID_BOX_LIST;
  }

  _nearbySolidBoxesScratch.length = 0;
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const bucket = grid.get(encodeSolidBoxCellKey(cx, cz));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) {
        const b = bucket[i];
        if (!_nearbySolidBoxesScratch.includes(b)) {
          _nearbySolidBoxesScratch.push(b);
        }
      }
    }
  }
  // Sort by index in SOLID_BUILDING_BOXES so the result is identical to a full scan in array order.
  const index = getSolidBoxIndex();
  _nearbySolidBoxesScratch.sort((a, b) => (index.get(a) ?? 0) - (index.get(b) ?? 0));
  return _nearbySolidBoxesScratch;
}
// #endregion
