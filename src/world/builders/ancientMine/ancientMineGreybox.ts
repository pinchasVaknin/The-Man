// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: Grid sampling of the layout plus greedy rectangle merging. Floors, rock walls and
//         ceilings come from the same data the physics uses, so what you see is what you walk.
// SUMMARY: Produces vertex buffers (position, normal, colour) for the greybox of the Ancient
//          Dwarven Mine in its local frame. Pure: no THREE objects, no scene access.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { sampleAncientMineLayer, type IMineFloorSample } from '../../domain/landmarks/ancientMine/ancientMineFloor';
import {
  MINE_LEVEL_Y,
  MINE_OPEN_EDGES,
  type IMineAreaId,
  type IMineMaterial,
} from '../../domain/landmarks/ancientMine/ancientMineLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Flat vertex arrays for one non-indexed triangle mesh. */
export interface IGreyboxBuffers {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly colors: Float32Array;
  /** Summary: World-scaled texture coordinates (meters / UV_METERS_PER_TILE). */
  readonly uvs: Float32Array;
}

/**
 * Summary: Foot of one merged rock wall run, for dressing (boulders): from (x0, z0) to (x1, z1)
 *          at floor height y, facing the open side along (nx, nz).
 */
export interface IWallFoot {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  readonly y: number;
  readonly nx: number;
  readonly nz: number;
  readonly height: number;
}

/** Summary: Greybox meshes of the mine: walkable floors, and rock (walls, ceilings, ledge lips). */
export interface IAncientMineGreybox {
  readonly floors: IGreyboxBuffers;
  readonly rock: IGreyboxBuffers;
  readonly wallFeet: readonly IWallFoot[];
}

/** Summary: Meters covered by one texture tile on floors, walls and ceilings. */
const UV_METERS_PER_TILE = 4;

type Rgb = readonly [number, number, number];
// #endregion

// #region Constants
/** Summary: Local-frame extent sampled for the greybox, meters. Covers every surface with margin. */
const GRID_BOUNDS = { minLx: -112, maxLx: 126, minLz: -4, maxLz: 458 } as const;

/** Summary: Visible thickness of a ledge, bridge deck or path edge over the abyss, meters. */
const ABYSS_LIP_DEPTH = 3.0;

const ROCK_COLOR: Rgb = [0.25, 0.23, 0.22];

/** Summary: Floor tint per area, so each zone reads apart in the greybox. */
const AREA_FLOOR_COLORS: Record<IMineAreaId, Rgb> = {
  entrance: [0.55, 0.5, 0.44],
  upperCavern: [0.46, 0.42, 0.38],
  lagoon: [0.4, 0.46, 0.48],
  galleries: [0.45, 0.38, 0.3],
  foundry: [0.4, 0.3, 0.26],
  descent: [0.5, 0.47, 0.43],
  chasm: [0.38, 0.4, 0.44],
  heroesPath: [0.56, 0.5, 0.38],
  bridge: [0.6, 0.57, 0.52],
  kingBalcony: [0.62, 0.55, 0.38],
  golemChamber: [0.36, 0.41, 0.48],
  ancientPassage: [0.42, 0.4, 0.38],
  dragonForge: [0.3, 0.22, 0.2],
};

/** Summary: Floor tint per material, overriding the area tint where it matters. */
const MATERIAL_FLOOR_COLORS: Partial<Record<IMineMaterial, Rgb>> = {
  wood: [0.48, 0.34, 0.2],
  water: [0.16, 0.24, 0.27],
  abyss: [0.03, 0.03, 0.04],
};
// #endregion

// ======================== PUBLIC GREYBOX ======================== \\
// #region Build Greybox
/**
 * Summary: Samples layer 0 of the layout on a grid and emits merged floor, wall and ceiling quads.
 * Design: Floors and ceilings are greedy-merged rectangles of equal height; walls and steps are
 *         runs of equal faces along each grid line. Layer 1 (king balcony) is drawn by the builder.
 *         Lava cells get no floor: the builder draws the lava plane.
 * @param cellSize Grid resolution in meters; 0.5 matches the stair treads.
 * @returns The floor and rock buffers in the mine's local frame.
 */
export function buildAncientMineGreybox(cellSize = 0.5): IAncientMineGreybox {
  const grid = sampleGrid(cellSize);
  const floors = new QuadSink();
  const rock = new QuadSink();
  const wallFeet: IWallFoot[] = [];
  emitFloors(grid, floors);
  emitCeilings(grid, rock);
  emitVerticalFaces(grid, floors, rock, wallFeet);
  return { floors: floors.toBuffers(), rock: rock.toBuffers(), wallFeet };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Grid Sampling
interface IGrid {
  readonly nx: number;
  readonly nz: number;
  readonly cell: number;
  readonly samples: ReadonlyArray<IMineFloorSample | null>;
}

/** Summary: Samples layer 0 at every cell centre. */
function sampleGrid(cell: number): IGrid {
  const nx = Math.round((GRID_BOUNDS.maxLx - GRID_BOUNDS.minLx) / cell);
  const nz = Math.round((GRID_BOUNDS.maxLz - GRID_BOUNDS.minLz) / cell);
  const samples: Array<IMineFloorSample | null> = new Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    const lz = GRID_BOUNDS.minLz + (j + 0.5) * cell;
    for (let i = 0; i < nx; i++) {
      samples[j * nx + i] = sampleAncientMineLayer(GRID_BOUNDS.minLx + (i + 0.5) * cell, lz, 0);
    }
  }
  return { nx, nz, cell, samples };
}

function at(grid: IGrid, i: number, j: number): IMineFloorSample | null {
  if (i < 0 || j < 0 || i >= grid.nx || j >= grid.nz) return null;
  return grid.samples[j * grid.nx + i];
}

function cellLx(grid: IGrid, i: number): number {
  return GRID_BOUNDS.minLx + i * grid.cell;
}

function cellLz(grid: IGrid, j: number): number {
  return GRID_BOUNDS.minLz + j * grid.cell;
}
// #endregion

// #region Floors And Ceilings
/** Summary: Greedy-merges cells with an equal key into rectangles and hands each to `emit`. */
function greedyRectangles(
  grid: IGrid,
  keyOf: (s: IMineFloorSample) => number | null,
  emit: (i0: number, j0: number, w: number, h: number, sample: IMineFloorSample) => void
): void {
  const used = new Uint8Array(grid.nx * grid.nz);
  for (let j = 0; j < grid.nz; j++) {
    for (let i = 0; i < grid.nx; i++) {
      const s = at(grid, i, j);
      if (s === null || used[j * grid.nx + i]) continue;
      const key = keyOf(s);
      if (key === null) continue;
      const matches = (ii: number, jj: number): boolean => {
        const o = at(grid, ii, jj);
        return o !== null && !used[jj * grid.nx + ii] && keyOf(o) === key;
      };
      let w = 1;
      while (matches(i + w, j)) w++;
      let h = 1;
      while (j + h < grid.nz && rowMatches(i, j + h, w, matches)) h++;
      for (let dj = 0; dj < h; dj++) used.fill(1, (j + dj) * grid.nx + i, (j + dj) * grid.nx + i + w);
      emit(i, j, w, h, s);
    }
  }
}

function rowMatches(i: number, j: number, w: number, matches: (i: number, j: number) => boolean): boolean {
  for (let k = 0; k < w; k++) if (!matches(i + k, j)) return false;
  return true;
}

/** Summary: Key combining surface identity and height, in centimetres, so stairs split per tread. */
function floorKey(s: IMineFloorSample): number | null {
  if (s.material === 'lava') return null;
  return hashId(s.surfaceId) * 1_000_000 + Math.round((s.height + 500) * 100);
}

function emitFloors(grid: IGrid, sink: QuadSink): void {
  greedyRectangles(grid, floorKey, (i0, j0, w, h, s) => {
    const x0 = cellLx(grid, i0);
    const z0 = cellLz(grid, j0);
    const x1 = x0 + w * grid.cell;
    const z1 = z0 + h * grid.cell;
    sink.add([x0, s.height, z0], [x0, s.height, z1], [x1, s.height, z1], [x1, s.height, z0], [0, 1, 0], floorColor(s));
  });
}

function emitCeilings(grid: IGrid, sink: QuadSink): void {
  greedyRectangles(grid, (s) => Math.round((s.ceilingY + 500) * 100), (i0, j0, w, h, s) => {
    const x0 = cellLx(grid, i0);
    const z0 = cellLz(grid, j0);
    const x1 = x0 + w * grid.cell;
    const z1 = z0 + h * grid.cell;
    const y = s.ceilingY;
    sink.add([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, -1, 0], ROCK_COLOR);
  });
}
// #endregion

// #region Walls And Steps
interface IFace {
  readonly y0: number;
  readonly y1: number;
  /** Summary: +1 when the face looks toward +axis, -1 toward -axis. */
  readonly facing: 1 | -1;
  readonly color: Rgb;
  readonly isRock: boolean;
  /** Summary: A full rock wall standing on a walkable floor (not a step or a ceiling step). */
  readonly isWall: boolean;
}

/**
 * Summary: Emits every vertical face on the grid lines: rock walls, floor steps and ceiling steps.
 * Design: Each grid line is walked once; consecutive equal faces merge into one quad.
 */
function emitVerticalFaces(grid: IGrid, floors: QuadSink, rock: QuadSink, wallFeet: IWallFoot[]): void {
  // Lines between columns i-1 and i run along z; lines between rows j-1 and j run along x.
  for (let i = 0; i <= grid.nx; i++) {
    const x = cellLx(grid, i);
    walkLine(grid.nz, (j) => {
      const along = cellLz(grid, j) + grid.cell / 2;
      return withoutOpenRock('lx', x, along, facesBetween(at(grid, i - 1, j), at(grid, i, j), () => upperFloorAt(x, along)));
    }, (k0, k1, f) => {
      const z0 = cellLz(grid, k0);
      const z1 = cellLz(grid, k1);
      (f.isRock ? rock : floors).add([x, f.y0, z0], [x, f.y0, z1], [x, f.y1, z1], [x, f.y1, z0], [f.facing, 0, 0], f.color);
      if (f.isWall) wallFeet.push({ x0: x, z0, x1: x, z1, y: f.y0, nx: f.facing, nz: 0, height: f.y1 - f.y0 });
    });
  }
  for (let j = 0; j <= grid.nz; j++) {
    const z = cellLz(grid, j);
    walkLine(grid.nx, (i) => {
      const along = cellLx(grid, i) + grid.cell / 2;
      return withoutOpenRock('lz', z, along, facesBetween(at(grid, i, j - 1), at(grid, i, j), () => upperFloorAt(along, z)));
    }, (k0, k1, f) => {
      const x0 = cellLx(grid, k0);
      const x1 = cellLx(grid, k1);
      (f.isRock ? rock : floors).add([x0, f.y0, z], [x1, f.y0, z], [x1, f.y1, z], [x0, f.y1, z], [0, 0, f.facing], f.color);
      if (f.isWall) wallFeet.push({ x0, z0: z, x1, z1: z, y: f.y0, nx: 0, nz: f.facing, height: f.y1 - f.y0 });
    });
  }
}

/** Summary: Floor height of layer 1 (balconies) at a local point, or null where there is none. */
function upperFloorAt(lx: number, lz: number): number | null {
  const upper = sampleAncientMineLayer(lx, lz, 1);
  return upper === null ? null : upper.height;
}

/** Summary: Drops rock walls that lie on an open edge (the gate mouth); steps are kept. */
function withoutOpenRock(axis: 'lx' | 'lz', lineAt: number, along: number, faces: readonly IFace[]): readonly IFace[] {
  const isOpen = MINE_OPEN_EDGES.some((e) => e.axis === axis && e.at === lineAt && along >= e.from && along <= e.to);
  return isOpen ? faces.filter((f) => !f.isRock) : faces;
}

/** Summary: Walks one grid line, merging runs of equal faces per slot, and emits each run. */
function walkLine(
  length: number,
  facesAt: (k: number) => readonly IFace[],
  emit: (k0: number, k1: number, face: IFace) => void
): void {
  let open: Array<{ face: IFace; start: number }> = [];
  for (let k = 0; k <= length; k++) {
    const faces = k < length ? facesAt(k) : [];
    const next: Array<{ face: IFace; start: number }> = [];
    for (const face of faces) {
      const idx = open.findIndex((o) => isSameFace(o.face, face));
      if (idx >= 0) {
        next.push(open[idx]);
        open.splice(idx, 1);
      } else {
        next.push({ face, start: k });
      }
    }
    for (const closed of open) emit(closed.start, k, closed.face);
    open = next;
  }
}

function isSameFace(a: IFace, b: IFace): boolean {
  return (
    a.y0 === b.y0 && a.y1 === b.y1 && a.facing === b.facing && a.color === b.color && a.isRock === b.isRock && a.isWall === b.isWall
  );
}

/**
 * Summary: Faces on the boundary between cell `a` (on the - side) and cell `b` (on the + side).
 * Design: Rock walls face the open cell; floor steps face the lower cell; a step down into the
 *         abyss is drawn only ABYSS_LIP_DEPTH deep so the void stays open; a ceiling step under a
 *         layer-1 balcony stops at the balcony floor (`upperFloorYAt`).
 */
function facesBetween(
  a: IMineFloorSample | null,
  b: IMineFloorSample | null,
  upperFloorYAt: () => number | null
): readonly IFace[] {
  if (a === null && b === null) return [];
  if (a === null || b === null) {
    const open = (a ?? b)!;
    const facing: 1 | -1 = a === null ? 1 : -1;
    const isAbyss = open.material === 'abyss';
    const floorY = isAbyss ? MINE_LEVEL_Y.abyssBottom : open.height;
    return [{ y0: floorY, y1: open.ceilingY, facing, color: ROCK_COLOR, isRock: true, isWall: !isAbyss }];
  }
  const faces: IFace[] = [];
  if (a.height !== b.height) {
    const isAHigher = a.height > b.height;
    const high = isAHigher ? a : b;
    const low = isAHigher ? b : a;
    const y0 = low.material === 'abyss' ? high.height - ABYSS_LIP_DEPTH : low.height;
    faces.push({ y0, y1: high.height, facing: isAHigher ? 1 : -1, color: stepColor(high), isRock: false, isWall: false });
  }
  if (a.ceilingY !== b.ceilingY) {
    const isALower = a.ceilingY < b.ceilingY;
    const y0 = Math.min(a.ceilingY, b.ceilingY);
    // A balcony above this edge is open air over its floor: stop the rock at the balcony slab.
    // Only looked up here: most edges have equal ceilings and never need it.
    const upperFloorY = upperFloorYAt();
    const y1 = upperFloorY !== null && upperFloorY >= y0 ? upperFloorY : Math.max(a.ceilingY, b.ceilingY);
    faces.push({
      y0,
      y1,
      facing: isALower ? 1 : -1,
      color: ROCK_COLOR,
      isRock: true,
      isWall: false,
    });
  }
  return faces;
}
// #endregion

// #region Colours And Ids
const colorCache = new Map<string, Rgb>();

function floorColor(s: IMineFloorSample): Rgb {
  return MATERIAL_FLOOR_COLORS[s.material] ?? AREA_FLOOR_COLORS[s.area];
}

/** Summary: Step faces are the floor colour, darkened, and shared per colour so runs merge. */
function stepColor(s: IMineFloorSample): Rgb {
  const base = floorColor(s);
  const key = base.join(',');
  let c = colorCache.get(key);
  if (c === undefined) {
    c = [base[0] * 0.7, base[1] * 0.7, base[2] * 0.7];
    colorCache.set(key, c);
  }
  return c;
}

const idCache = new Map<string, number>();

/** Summary: Small stable integer per surface id, for numeric merge keys. */
function hashId(id: string): number {
  let v = idCache.get(id);
  if (v === undefined) {
    v = idCache.size + 1;
    idCache.set(id, v);
  }
  return v;
}
// #endregion

// #region Quad Sink
/** Summary: Accumulates quads as two triangles each into growable arrays. */
class QuadSink {
  private readonly _positions: number[] = [];
  private readonly _normals: number[] = [];
  private readonly _colors: number[] = [];
  private readonly _uvs: number[] = [];

  add(
    p0: readonly number[],
    p1: readonly number[],
    p2: readonly number[],
    p3: readonly number[],
    normal: readonly number[],
    color: Rgb
  ): void {
    for (const p of [p0, p1, p2, p0, p2, p3]) {
      this._positions.push(p[0], p[1], p[2]);
      this._normals.push(normal[0], normal[1], normal[2]);
      this._colors.push(color[0], color[1], color[2]);
      // Planar mapping by face orientation keeps one texel size everywhere.
      const u = normal[0] !== 0 ? p[2] : p[0];
      const v = normal[1] !== 0 ? p[2] : p[1];
      this._uvs.push(u / UV_METERS_PER_TILE, v / UV_METERS_PER_TILE);
    }
  }

  toBuffers(): IGreyboxBuffers {
    return {
      positions: new Float32Array(this._positions),
      normals: new Float32Array(this._normals),
      colors: new Float32Array(this._colors),
      uvs: new Float32Array(this._uvs),
    };
  }
}
// #endregion
