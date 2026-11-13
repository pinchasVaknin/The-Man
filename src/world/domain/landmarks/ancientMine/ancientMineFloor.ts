// ============================================================================
// MODULE: World / Domain / Landmarks / Ancient Mine
// DESIGN: Stateless queries over MINE_SURFACES. Per layer the last covering surface wins
//         (carve-outs); across layers the floor under the asker's feet wins (stacked floors).
// SUMMARY: Answers "what floor is here" and "is a guard rail in the way" in the mine's local
//          frame. Does not convert world coordinates, apply physics or build colliders.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import {
  CEILING_TERRACE_STEP,
  MINE_GUARD_RAILS,
  MINE_LEVEL_Y,
  MINE_OPEN_EDGES,
  MINE_SURFACES,
  type IMineAreaId,
  type IMineFootprint,
  type IMineHeightProfile,
  type IMineMaterial,
  type IMineSurface,
} from './ancientMineLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: The floor found at one point of the mine. */
export interface IMineFloorSample {
  readonly surfaceId: string;
  readonly area: IMineAreaId;
  readonly material: IMineMaterial;
  /** Summary: World Y of the solid floor (lagoon bed, lava bed or abyss bottom included). */
  readonly height: number;
  readonly ceilingY: number;
  /** Summary: World Y of the water surface, or null when the floor is not under water. */
  readonly waterSurfaceY: number | null;
}

/** Summary: How far above the feet a floor may be and still count as "the floor I'm on", meters. */
const STANDING_TOLERANCE = 0.6;

/** Summary: How far below its floor a rail still blocks feet (a falling player is not caught). */
const RAIL_FEET_TOLERANCE = 0.6;

const LAYER_COUNT = 2;

/**
 * Summary: Axis-aligned bounds of each surface footprint, in MINE_SURFACES order.
 * Design: A cheap reject before the exact footprint test; most points lie outside most surfaces.
 *         Measured: grid sampling of the whole mine dropped from ~330 ms (see Part 7 report).
 */
const SURFACE_BOUNDS: ReadonlyArray<{ minLx: number; maxLx: number; minLz: number; maxLz: number }> = MINE_SURFACES.map((s) => {
  const f = s.footprint;
  switch (f.kind) {
    case 'rect':
      return f;
    case 'circle':
      return { minLx: f.lx - f.r, maxLx: f.lx + f.r, minLz: f.lz - f.r, maxLz: f.lz + f.r };
    case 'ellipse':
      return { minLx: f.lx - f.rx, maxLx: f.lx + f.rx, minLz: f.lz - f.rz, maxLz: f.lz + f.rz };
    case 'polygon': {
      const xs = f.points.map((p) => p[0]);
      const zs = f.points.map((p) => p[1]);
      return { minLx: Math.min(...xs), maxLx: Math.max(...xs), minLz: Math.min(...zs), maxLz: Math.max(...zs) };
    }
  }
});

/** Summary: Bounds reject plus exact footprint test for the surface at `index`. */
function isInsideSurface(index: number, lx: number, lz: number): boolean {
  const b = SURFACE_BOUNDS[index];
  if (lx < b.minLx || lx > b.maxLx || lz < b.minLz || lz > b.maxLz) return false;
  return isInsideFootprint(MINE_SURFACES[index].footprint, lx, lz);
}
// #endregion

// ======================== PUBLIC FLOOR QUERIES ======================== \\
// #region Sample Floor
/**
 * Summary: Returns the mine floor at a local point, or null when the point is solid rock.
 * Design: Each layer resolves to its last covering surface. With `currentY`, the highest layer
 *         floor not more than STANDING_TOLERANCE above the feet is chosen; when every floor is
 *         above the feet, the lowest one is. Without `currentY`, the highest floor is chosen.
 * @param lx Local X (east), meters.
 * @param lz Local Z (south, into the mountain), meters.
 * @param currentY World Y of the asker's feet, used to pick between stacked floors.
 * @returns The floor sample, or null outside every surface.
 */
export function sampleAncientMineFloor(lx: number, lz: number, currentY?: number): IMineFloorSample | null {
  const perLayer: Array<IMineSurface | null> = new Array(LAYER_COUNT).fill(null);
  for (let i = 0; i < MINE_SURFACES.length; i++) {
    if (isInsideSurface(i, lx, lz)) perLayer[MINE_SURFACES[i].layer] = MINE_SURFACES[i];
  }

  let chosen: IMineSurface | null = null;
  let chosenHeight = 0;
  for (const surface of perLayer) {
    if (surface === null) continue;
    const height = heightOfProfile(surface.height, lx, lz);
    if (chosen === null || isBetterFloor(height, chosenHeight, currentY)) {
      chosen = surface;
      chosenHeight = height;
    }
  }
  if (chosen === null) return null;

  return {
    surfaceId: chosen.id,
    area: chosen.area,
    material: chosen.material,
    height: chosenHeight,
    ceilingY: ceilingOf(chosen, lx, lz),
    waterSurfaceY: chosen.waterSurfaceY ?? null,
  };
}
// #endregion

// #region Sample Layer
/**
 * Summary: Returns the surface of one layer at a local point, ignoring the other layer.
 * Design: Used by mesh generation, which draws each layer on its own (the king balcony above
 *         the bridge landing), unlike physics, which picks the floor under the feet.
 * @param lx Local X, meters.
 * @param lz Local Z, meters.
 * @param layer The layer to read.
 * @returns The floor sample of that layer, or null when the layer has no surface there.
 */
export function sampleAncientMineLayer(lx: number, lz: number, layer: 0 | 1): IMineFloorSample | null {
  let found: IMineSurface | null = null;
  for (let i = 0; i < MINE_SURFACES.length; i++) {
    if (MINE_SURFACES[i].layer === layer && isInsideSurface(i, lx, lz)) found = MINE_SURFACES[i];
  }
  if (found === null) return null;
  return {
    surfaceId: found.id,
    area: found.area,
    material: found.material,
    height: heightOfProfile(found.height, lx, lz),
    ceilingY: ceilingOf(found, lx, lz),
    waterSurfaceY: found.waterSurfaceY ?? null,
  };
}
// #endregion

// #region Guard Rails
/**
 * Summary: True when a guard rail blocks a straight move between two local points.
 * Design: A rail blocks when the move crosses its line strictly, the crossing point lies within
 *         its span, and the feet are inside its vertical band. Rails sit on footprint boundaries.
 * @param aLx Start local X.
 * @param aLz Start local Z.
 * @param bLx End local X.
 * @param bLz End local Z.
 * @param feetY World Y of the mover's feet.
 * @returns Whether any rail is in the way.
 */
export function isGuardRailBetween(aLx: number, aLz: number, bLx: number, bLz: number, feetY: number): boolean {
  for (const rail of MINE_GUARD_RAILS) {
    if (feetY < rail.minY - RAIL_FEET_TOLERANCE || feetY > rail.maxY) continue;
    const aAcross = rail.axis === 'lx' ? aLx : aLz;
    const bAcross = rail.axis === 'lx' ? bLx : bLz;
    if ((aAcross - rail.at) * (bAcross - rail.at) >= 0) continue;
    const t = (rail.at - aAcross) / (bAcross - aAcross);
    const along = rail.axis === 'lx' ? aLz + t * (bLz - aLz) : aLx + t * (bLx - aLx);
    if (along >= rail.from && along <= rail.to) return true;
  }
  return false;
}
// #endregion

// #region Wall Runs
/** Summary: Foot of one merged rock wall run in local mine coordinates, facing the open room along (nx, nz). */
export interface IMineWallFoot {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  readonly y: number;
  readonly nx: number;
  readonly nz: number;
  readonly height: number;
}

const WALL_GRID_BOUNDS = { minLx: -120, maxLx: 126, minLz: -4, maxLz: 514 } as const;

/**
 * Summary: Computes merged axis-aligned rock wall runs across layers 0 and 1 of the mine.
 * Design: Used by ancientMineWorld.ts to build solid rock wall hitboxes so neither the player
 *         nor the camera can clip or see through mine walls.
 */
export function computeAncientMineWallFeet(cell = 1.0): readonly IMineWallFoot[] {
  const nx = Math.round((WALL_GRID_BOUNDS.maxLx - WALL_GRID_BOUNDS.minLx) / cell);
  const nz = Math.round((WALL_GRID_BOUNDS.maxLz - WALL_GRID_BOUNDS.minLz) / cell);
  const g0: Array<IMineFloorSample | null> = new Array(nx * nz);
  const g1: Array<IMineFloorSample | null> = new Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    const lz = WALL_GRID_BOUNDS.minLz + (j + 0.5) * cell;
    for (let i = 0; i < nx; i++) {
      const lx = WALL_GRID_BOUNDS.minLx + (i + 0.5) * cell;
      g0[j * nx + i] = sampleAncientMineLayer(lx, lz, 0);
      g1[j * nx + i] = sampleAncientMineLayer(lx, lz, 1);
    }
  }
  const at0 = (i: number, j: number): IMineFloorSample | null => (i < 0 || j < 0 || i >= nx || j >= nz ? null : g0[j * nx + i]);
  const at1 = (i: number, j: number): IMineFloorSample | null => (i < 0 || j < 0 || i >= nx || j >= nz ? null : g1[j * nx + i]);

  const wallFeet: IMineWallFoot[] = [];
  const wallIntervalsBetween = (
    a0: IMineFloorSample | null,
    b0: IMineFloorSample | null,
    a1: IMineFloorSample | null,
    b1: IMineFloorSample | null
  ): Array<{ y0: number; y1: number; facing: 1 | -1 }> => {
    if (a0 === null && b0 === null && a1 === null && b1 === null) return [];
    const airOf = (s0: IMineFloorSample | null, s1: IMineFloorSample | null): Array<[number, number]> => {
      const r: Array<[number, number]> = [];
      if (s0 !== null) {
        const y0 = s0.material === 'abyss' ? MINE_LEVEL_Y.abyssBottom : s0.height;
        if (s0.ceilingY > y0 + 0.05) r.push([y0, s0.ceilingY]);
      }
      if (s1 !== null && s1.ceilingY > s1.height + 0.05) r.push([s1.height, s1.ceilingY]);
      return r;
    };
    const sub = (y0: number, y1: number, cuts: ReadonlyArray<readonly [number, number]>): Array<[number, number]> => {
      let segs: Array<[number, number]> = y1 - y0 > 0.05 ? [[y0, y1]] : [];
      for (const [c0, c1] of cuts) {
        const next: Array<[number, number]> = [];
        for (const [s0, s1] of segs) {
          if (c1 <= s0 + 0.05 || c0 >= s1 - 0.05) next.push([s0, s1]);
          else {
            if (c0 - s0 > 0.05) next.push([s0, c0]);
            if (s1 - c1 > 0.05) next.push([c1, s1]);
          }
        }
        segs = next;
      }
      return segs;
    };
    const airA = airOf(a0, a1);
    const airB = airOf(b0, b1);
    const out: Array<{ y0: number; y1: number; facing: 1 | -1 }> = [];
    if (a0 !== null && a0.material !== 'abyss') {
      const startY = b0 !== null ? Math.max(a0.height, b0.material === 'abyss' ? MINE_LEVEL_Y.abyssBottom : b0.height) : a0.height;
      for (const [y0, y1] of sub(startY, a0.ceilingY, airB)) {
        if (Math.abs(y0 - a0.height) < 0.1 && y1 - y0 >= 1.5) out.push({ y0, y1, facing: -1 });
      }
    }
    if (a1 !== null) {
      for (const [y0, y1] of sub(a1.height, a1.ceilingY, airB)) {
        if (Math.abs(y0 - a1.height) < 0.1 && y1 - y0 >= 1.5) out.push({ y0, y1, facing: -1 });
      }
    }
    if (b0 !== null && b0.material !== 'abyss') {
      const startY = a0 !== null ? Math.max(b0.height, a0.material === 'abyss' ? MINE_LEVEL_Y.abyssBottom : a0.height) : b0.height;
      for (const [y0, y1] of sub(startY, b0.ceilingY, airA)) {
        if (Math.abs(y0 - b0.height) < 0.1 && y1 - y0 >= 1.5) out.push({ y0, y1, facing: 1 });
      }
    }
    if (b1 !== null) {
      for (const [y0, y1] of sub(b1.height, b1.ceilingY, airA)) {
        if (Math.abs(y0 - b1.height) < 0.1 && y1 - y0 >= 1.5) out.push({ y0, y1, facing: 1 });
      }
    }
    return out;
  };

  for (let i = 0; i <= nx; i++) {
    const x = WALL_GRID_BOUNDS.minLx + i * cell;
    let open: Array<{ y0: number; y1: number; facing: 1 | -1; start: number }> = [];
    for (let j = 0; j <= nz; j++) {
      const along = WALL_GRID_BOUNDS.minLz + (j + 0.5) * cell;
      const isOpenEdge = MINE_OPEN_EDGES.some((e) => e.axis === 'lx' && e.at === x && along >= e.from && along <= e.to);
      const faces = j < nz && !isOpenEdge ? wallIntervalsBetween(at0(i - 1, j), at0(i, j), at1(i - 1, j), at1(i, j)) : [];
      const next: typeof open = [];
      for (const f of faces) {
        const idx = open.findIndex((o) => Math.abs(o.y0 - f.y0) < 0.05 && Math.abs(o.y1 - f.y1) < 0.05 && o.facing === f.facing);
        if (idx >= 0) {
          next.push(open[idx]);
          open.splice(idx, 1);
        } else {
          next.push({ ...f, start: j });
        }
      }
      for (const closed of open) {
        const z0 = WALL_GRID_BOUNDS.minLz + closed.start * cell;
        const z1 = WALL_GRID_BOUNDS.minLz + j * cell;
        wallFeet.push({ x0: x, z0, x1: x, z1, y: closed.y0, nx: closed.facing, nz: 0, height: closed.y1 - closed.y0 });
      }
      open = next;
    }
  }

  for (let j = 0; j <= nz; j++) {
    const z = WALL_GRID_BOUNDS.minLz + j * cell;
    let open: Array<{ y0: number; y1: number; facing: 1 | -1; start: number }> = [];
    for (let i = 0; i <= nx; i++) {
      const along = WALL_GRID_BOUNDS.minLx + (i + 0.5) * cell;
      const isOpenEdge = MINE_OPEN_EDGES.some((e) => e.axis === 'lz' && e.at === z && along >= e.from && along <= e.to);
      const faces = i < nx && !isOpenEdge ? wallIntervalsBetween(at0(i, j - 1), at0(i, j), at1(i, j - 1), at1(i, j)) : [];
      const next: typeof open = [];
      for (const f of faces) {
        const idx = open.findIndex((o) => Math.abs(o.y0 - f.y0) < 0.05 && Math.abs(o.y1 - f.y1) < 0.05 && o.facing === f.facing);
        if (idx >= 0) {
          next.push(open[idx]);
          open.splice(idx, 1);
        } else {
          next.push({ ...f, start: i });
        }
      }
      for (const closed of open) {
        const x0 = WALL_GRID_BOUNDS.minLx + closed.start * cell;
        const x1 = WALL_GRID_BOUNDS.minLx + i * cell;
        wallFeet.push({ x0, z0: z, x1, z1: z, y: closed.y0, nx: 0, nz: closed.facing, height: closed.y1 - closed.y0 });
      }
      open = next;
    }
  }

  return wallFeet;
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Geometry
/** Summary: Whether `candidate` is a better floor than `current` for feet at `currentY`. */
function isBetterFloor(candidate: number, current: number, currentY: number | undefined): boolean {
  if (currentY === undefined) return candidate > current;
  const reach = currentY + STANDING_TOLERANCE;
  const isCandidateUnder = candidate <= reach;
  const isCurrentUnder = current <= reach;
  if (isCandidateUnder !== isCurrentUnder) return isCandidateUnder;
  return isCandidateUnder ? candidate > current : candidate < current;
}

/** Summary: Ceiling of a surface at a point, raised by its dome where it has one. */
function ceilingOf(surface: IMineSurface, lx: number, lz: number): number {
  const dome = surface.ceilingDome;
  if (dome === undefined) return surface.ceilingY;
  const d = Math.hypot(lx - dome.lx, lz - dome.lz) / dome.radius;
  const raised = surface.ceilingY + (dome.peakY - surface.ceilingY) * Math.max(0, 1 - d * d);
  return Math.round(raised / CEILING_TERRACE_STEP) * CEILING_TERRACE_STEP;
}

/** Summary: Height of a profile at a point; stairs are quantized into equal steps. */
function heightOfProfile(profile: IMineHeightProfile, lx: number, lz: number): number {
  if (profile.kind === 'flat') return profile.y;
  const along = profile.axis === 'lx' ? lx : lz;
  const t = Math.min(1, Math.max(0, (along - profile.from) / (profile.to - profile.from)));
  const step = Math.min(profile.stepCount - 1, Math.floor(t * profile.stepCount));
  const rise = (profile.yTo - profile.yFrom) / profile.stepCount;
  // The first tread already sits one rise below the top landing, the last tread on the bottom floor.
  return profile.yFrom + rise * (step + 1);
}

/** Summary: Point-in-footprint test for every footprint kind. */
function isInsideFootprint(footprint: IMineFootprint, lx: number, lz: number): boolean {
  switch (footprint.kind) {
    case 'rect':
      return lx >= footprint.minLx && lx < footprint.maxLx && lz >= footprint.minLz && lz < footprint.maxLz;
    case 'circle':
      return Math.hypot(lx - footprint.lx, lz - footprint.lz) <= footprint.r;
    case 'ellipse':
      return Math.hypot((lx - footprint.lx) / footprint.rx, (lz - footprint.lz) / footprint.rz) <= 1;
    case 'polygon':
      return isInsidePolygon(footprint.points, lx, lz);
  }
}

/** Summary: Even-odd ray casting point-in-polygon test. */
function isInsidePolygon(points: readonly (readonly [number, number])[], lx: number, lz: number): boolean {
  let isInside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i];
    const [xj, zj] = points[j];
    if (zi > lz !== zj > lz && lx < ((xj - xi) * (lz - zi)) / (zj - zi) + xi) isInside = !isInside;
  }
  return isInside;
}
// #endregion
