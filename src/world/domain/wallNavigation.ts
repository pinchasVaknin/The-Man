// ============================================================================
// MODULE: World / Domain / Wall Navigation
// DESIGN: Finds a walkable detour around solid boxes for a creature at a given height (SRP)
// SUMMARY: A coarse grid over the area between a creature and its target. Cells whose centre lies inside a solid box
//          (at the creature's height) are blocked. A* finds the shortest path around them.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ISolidBuildingBox } from './worldTypes';
import { getNearbySolidBuildingBoxes, pointInsideSolidBuildingBox } from './collisionWorld';
// #endregion

// ======================== CONSTANTS ======================== \\
// #region Constants
/** Grid cell size in metres. */
const NAV_CELL_METRES = 1.0;
/** Extra grid margin around the start and goal, so a detour can go wide of a wall's end. */
const NAV_MARGIN_METRES = 6.0;
/** Default body radius used when a cell is tested against the boxes (the caller passes the real one). */
const NAV_BODY_RADIUS_DEFAULT = 0.45;
/** Largest grid searched; beyond this the detour is not worth the cost and the caller falls back. */
const NAV_MAX_CELLS = 2500;
const NAV_NEIGHBOURS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: A point on the ground plane, in world metres. */
export interface INavPoint {
  readonly x: number;
  readonly z: number;
}
// #endregion

// ======================== PATH SEARCH ======================== \\
// #region Path search
/**
 * Summary: Finds the shortest walkable path from (ax, az) to (tx, tz) around solid boxes at height `y`.
 * @returns The path as world points, starting near the creature and ending near the target; null when there is none
 *          inside the searched area.
 */
export function findWallPath(
  ax: number,
  az: number,
  tx: number,
  tz: number,
  y: number,
  boxes?: readonly ISolidBuildingBox[],
  bodyRadius = NAV_BODY_RADIUS_DEFAULT
): INavPoint[] | null {
  const minX = Math.min(ax, tx) - NAV_MARGIN_METRES;
  const maxX = Math.max(ax, tx) + NAV_MARGIN_METRES;
  const minZ = Math.min(az, tz) - NAV_MARGIN_METRES;
  const maxZ = Math.max(az, tz) + NAV_MARGIN_METRES;
  const cols = Math.ceil((maxX - minX) / NAV_CELL_METRES) + 1;
  const rows = Math.ceil((maxZ - minZ) / NAV_CELL_METRES) + 1;
  if (cols * rows > NAV_MAX_CELLS) return null;

  const candidates =
    boxes ??
    getNearbySolidBuildingBoxes(
      (ax + tx) / 2,
      (az + tz) / 2,
      Math.max(maxX - minX, maxZ - minZ) / 2 + NAV_CELL_METRES
    );

  const cellX = (c: number) => minX + c * NAV_CELL_METRES;
  const cellZ = (r: number) => minZ + r * NAV_CELL_METRES;
  const blockedCache = new Uint8Array(cols * rows); // 0 unknown, 1 free, 2 blocked
  const isBlocked = (c: number, r: number): boolean => {
    const k = r * cols + c;
    if (blockedCache[k] === 0) {
      const x = cellX(c);
      const z = cellZ(r);
      let hit = false;
      for (let b = 0; b < candidates.length && !hit; b++) {
        const box = candidates[b];
        if (box.minY !== undefined && y < box.minY) continue;
        if (box.maxY !== undefined && y > box.maxY) continue;
        hit = pointInsideSolidBuildingBox(x, z, bodyRadius, box);
      }
      blockedCache[k] = hit ? 2 : 1;
    }
    return blockedCache[k] === 2;
  };

  const startC = Math.round((ax - minX) / NAV_CELL_METRES);
  const startR = Math.round((az - minZ) / NAV_CELL_METRES);
  const goalC = Math.round((tx - minX) / NAV_CELL_METRES);
  const goalR = Math.round((tz - minZ) / NAV_CELL_METRES);
  const startK = startR * cols + startC;
  const goalK = goalR * cols + goalC;

  // A*: the creature's own cell and the goal cell are always passable.
  const gScore = new Float64Array(cols * rows).fill(Infinity);
  const cameFrom = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const open: number[] = [startK];
  gScore[startK] = 0;
  const heuristic = (k: number) => {
    const c = k % cols;
    const r = Math.floor(k / cols);
    return Math.hypot(c - goalC, r - goalR);
  };

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (gScore[open[i]] + heuristic(open[i]) < gScore[open[best]] + heuristic(open[best])) best = i;
    }
    const k = open[best];
    open[best] = open[open.length - 1];
    open.pop();
    if (k === goalK) {
      const path: INavPoint[] = [];
      for (let cur = goalK; cur !== -1; cur = cameFrom[cur]) {
        const c = cur % cols;
        const r = Math.floor(cur / cols);
        path.push({ x: cellX(c), z: cellZ(r) });
        if (cur === startK) break;
      }
      path.reverse();
      return path;
    }
    if (closed[k]) continue;
    closed[k] = 1;

    const c = k % cols;
    const r = Math.floor(k / cols);
    for (const [dc, dr, cost] of NAV_NEIGHBOURS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const nk = nr * cols + nc;
      if (closed[nk]) continue;
      const isGoal = nk === goalK;
      if (!isGoal && isBlocked(nc, nr)) continue;
      // A diagonal step may not cut the corner of a blocked cell.
      if (dc !== 0 && dr !== 0 && !isGoal) {
        if (isBlocked(c + dc, r) || isBlocked(c, r + dr)) continue;
      }
      const tentative = gScore[k] + cost;
      if (tentative < gScore[nk]) {
        gScore[nk] = tentative;
        cameFrom[nk] = k;
        if (!open.includes(nk)) open.push(nk);
      }
    }
  }
  return null;
}

/**
 * Summary: The point a creature should steer toward to get around the boxes: a few cells along the path.
 * @param lookAheadCells How many cells along the path to aim at (3 cells is about 3 metres).
 * @returns The waypoint, or null when no path exists.
 */
export function findWallDetourWaypoint(
  ax: number,
  az: number,
  tx: number,
  tz: number,
  y: number,
  lookAheadCells = 3,
  boxes?: readonly ISolidBuildingBox[],
  bodyRadius = NAV_BODY_RADIUS_DEFAULT
): INavPoint | null {
  const path = findWallPath(ax, az, tx, tz, y, boxes, bodyRadius);
  if (!path || path.length === 0) return null;
  return path[Math.min(lookAheadCells, path.length - 1)];
}
// #endregion
