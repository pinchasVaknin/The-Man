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
