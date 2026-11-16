// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Routes are authored as a few anchor nodes (an island rim point, a stone rest
//         platform, a wind column). The clouds between two anchors are generated with even
//         gaps, so a route stays jumpable when an island moves. The Cloud Maze is a hand-made
//         grid instead, because its branching is the point.
// SUMMARY: Every walkable cloud and every stone rest platform of the archipelago, plus the
//          ordered hop list of each route (used by the reachability tests). Pure data.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { getSkyIsland, type ISkyIsland } from './skyboundLayout';
import type { ISkyCloudDef, SkyCloudKind } from './skyCloudSystem';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: A small solid stone disc between cloud sections, where the player can rest. */
export interface ISkyRestPlatform {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
}

/** Summary: One solid thing on a route, in walking order (rim point, platform or cloud). */
export interface IRouteHop {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** 0 for an island rim point (the rim itself is the edge). */
  readonly radius: number;
  readonly kind: SkyCloudKind | 'rim' | 'platform' | 'wind';
  readonly bounceVy?: number;
  /** True when the player gets here by a wind current, not by jumping from the previous hop. */
  readonly reachedByWind?: boolean;
}

/** Summary: Ordered hops of one route, from start island to end island. */
export interface ISkyRoute {
  readonly id: string;
  readonly hops: readonly IRouteHop[];
}

interface IAnchor {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly kind: 'rim' | 'platform' | 'wind';
}

interface ISegmentSpec {
  /** Cloud kinds cycled along the segment; empty = crossed by wind, no clouds. */
  readonly kinds: readonly SkyCloudKind[];
  readonly cloudRadius: number;
  readonly bounceVy?: number;
  /** When set, every cloud sits this far above the start anchor instead of on the slope. */
  readonly riseFromStart?: number;
  /** Lower bound on the number of clouds (more, smaller hops on steep descents). */
  readonly minCount?: number;
}
// #endregion

// #region Tuning
/** Largest edge-to-edge gap (m) between two hops; a 5 m/s walking jump covers ~3.4 m. */
const MAX_HOP_GAP_M = 2.2;
/** Smallest gap (m), so every hop is a real jump; clouds shrink to keep it. */
const MIN_HOP_GAP_M = 0.8;
const SOFT_RADIUS_M = 3.2;
const CHARGED_RADIUS_M = 3.6;
const STORM_RADIUS_M = 3.4;
const DESCENT_RADIUS_M = 2.8;
const PLATFORM_RADIUS_M = 3.4;
// #endregion

// #region Rest Platforms
/** Summary: Rest platform halfway along the Cloud Run, where the route turns. */
export const CLOUD_RUN_REST: ISkyRestPlatform = { id: 'rest-cloud-run', x: 770.0, y: 69.5, z: 30.0, radius: PLATFORM_RADIUS_M };
/** Summary: Platform at the foot of the Ruins updraft. */
export const RUINS_UPDRAFT_BASE: ISkyRestPlatform = { id: 'rest-ruins-updraft-base', x: 752.0, y: 84.5, z: -120.0, radius: 3.5 };
/** Summary: Platform at the top of the Ruins updraft, one bounce below the Observatory. */
export const RUINS_UPDRAFT_TOP: ISkyRestPlatform = { id: 'rest-ruins-updraft-top', x: 762.0, y: 92.0, z: -121.0, radius: 3.5 };
/** Summary: Column of the vortex that lifts the player up onto Storm Island. */
export const STORM_VORTEX_ANCHOR = { x: 858.0, y: 99.0, z: -112.0, radius: 4.0 } as const;
// #endregion

// ======================== ROUTE DEFINITIONS ======================== \\
// #region Route Builders
const generatedClouds: ISkyCloudDef[] = [];
const generatedRoutes: ISkyRoute[] = [];

/** Rim point of an island facing (towardX, towardZ), at deck height. */
function rimToward(islandId: string, towardX: number, towardZ: number): IAnchor {
  const isl = requireIsland(islandId);
  const dx = towardX - isl.x;
  const dz = towardZ - isl.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: isl.x + (dx / len) * isl.radius, y: isl.deckY, z: isl.z + (dz / len) * isl.radius, radius: 0, kind: 'rim' };
}

function requireIsland(id: string): ISkyIsland {
  const isl = getSkyIsland(id);
  if (!isl) throw new Error(`SKY_ROUTE_UNKNOWN_ISLAND: ${id}`);
  return isl;
}

function platformAnchor(p: ISkyRestPlatform): IAnchor {
  return { x: p.x, y: p.y, z: p.z, radius: p.radius, kind: 'platform' };
}

/**
 * Builds one route: anchors in walking order and one segment spec between each pair.
 * Clouds are spaced so every edge gap is equal and at most `MAX_HOP_GAP_M`.
 */
function addRoute(id: string, anchors: readonly IAnchor[], segments: readonly ISegmentSpec[]): void {
  const hops: IRouteHop[] = [toHop(anchors[0])];
  for (let s = 0; s < segments.length; s++) {
    const a = anchors[s];
    const b = anchors[s + 1];
    const seg = segments[s];
    if (seg.kinds.length > 0) {
      for (const cloud of fillSegment(id, s, a, b, seg)) {
        generatedClouds.push(cloud);
        hops.push({ x: cloud.x, y: cloud.y, z: cloud.z, radius: cloud.radius, kind: cloud.kind, bounceVy: cloud.bounceVy });
      }
    }
    hops.push({ ...toHop(b), reachedByWind: seg.kinds.length === 0 || b.kind === 'wind' });
  }
  generatedRoutes.push({ id, hops });
}

function fillSegment(routeId: string, segIndex: number, a: IAnchor, b: IAnchor, seg: ISegmentSpec): ISkyCloudDef[] {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const centreDist = Math.hypot(dx, dz);
  const ux = dx / centreDist;
  const uz = dz / centreDist;
  const span = centreDist - a.radius - b.radius;
  const step = seg.cloudRadius * 2 + MAX_HOP_GAP_M;
  const count = Math.max(1, seg.minCount ?? 1, Math.ceil((span - MAX_HOP_GAP_M) / step));
  // Shrink the clouds when the requested size would leave less than the minimum gap.
  const radius = Math.min(seg.cloudRadius, (span - (count + 1) * MIN_HOP_GAP_M) / (2 * count));
  const gap = (span - count * radius * 2) / (count + 1);
  const clouds: ISkyCloudDef[] = [];
  for (let i = 0; i < count; i++) {
    const along = a.radius + gap * (i + 1) + radius * (2 * i + 1);
    const t = (i + 1) / (count + 1);
    const kind = seg.kinds[i % seg.kinds.length];
    clouds.push({
      id: `${routeId}-${segIndex}-${i}`,
      routeId,
      kind,
      x: a.x + ux * along,
      y: seg.riseFromStart !== undefined ? a.y + seg.riseFromStart : a.y + (b.y - a.y) * t,
      z: a.z + uz * along,
      radius,
      phase: (segIndex * 7 + i) * 1.37,
      bounceVy: kind === 'bounce' ? seg.bounceVy : undefined,
      gustDirX: kind === 'storm' ? -uz : undefined,
      gustDirZ: kind === 'storm' ? ux : undefined,
    });
  }
  return clouds;
}

function toHop(a: IAnchor): IRouteHop {
  return { x: a.x, y: a.y, z: a.z, radius: a.radius, kind: a.kind };
}
// #endregion

// #region Authored Routes
// Cloud Run (introductory): Sky Harbor south -> rest platform (turn) -> Floating Garden. Soft clouds only.
addRoute(
  'cloud-run',
  [rimToward('sky-harbor', CLOUD_RUN_REST.x, CLOUD_RUN_REST.z), platformAnchor(CLOUD_RUN_REST), rimToward('floating-garden', CLOUD_RUN_REST.x, CLOUD_RUN_REST.z)],
  [
    { kinds: ['soft'], cloudRadius: SOFT_RADIUS_M },
    { kinds: ['soft'], cloudRadius: SOFT_RADIUS_M },
  ]
);

// Vertical Cloud Path: Ancient Ruins -> charged clouds -> updraft -> bounce cloud -> Observatory.
addRoute(
  'ruins-ascent',
  [
    rimToward('ancient-sky-ruins', RUINS_UPDRAFT_BASE.x, RUINS_UPDRAFT_BASE.z),
    platformAnchor(RUINS_UPDRAFT_BASE),
    platformAnchor(RUINS_UPDRAFT_TOP),
    rimToward('sky-observatory', RUINS_UPDRAFT_TOP.x, RUINS_UPDRAFT_TOP.z),
  ],
  [
    { kinds: ['charged'], cloudRadius: CHARGED_RADIUS_M },
    { kinds: [], cloudRadius: 0 },
    { kinds: ['bounce'], cloudRadius: SOFT_RADIUS_M, bounceVy: 15.0, riseFromStart: 0.3 },
  ]
);

// Storm climb (expert, optional): Observatory -> storm clouds -> vortex column -> Storm Island.
addRoute(
  'storm-climb',
  [
    rimToward('sky-observatory', STORM_VORTEX_ANCHOR.x, STORM_VORTEX_ANCHOR.z),
    { ...STORM_VORTEX_ANCHOR, kind: 'wind' },
  ],
  [{ kinds: ['storm'], cloudRadius: STORM_RADIUS_M }]
);

// Endless Descent: Sky Harbor dock -> Forgotten Airship -> Hidden Isle.
addRoute(
  'endless-descent',
  [rimToward('sky-harbor', 842.0, 66.0), rimToward('forgotten-airship', 778.0, -35.0)],
  [{ kinds: ['soft', 'charged'], cloudRadius: SOFT_RADIUS_M }]
);
addRoute(
  'hidden-descent',
  [rimToward('forgotten-airship', 795.0, 58.0), rimToward('hidden-isle', 842.0, 66.0)],
  [{ kinds: ['charged'], cloudRadius: DESCENT_RADIUS_M, minCount: 4 }]
);
// #endregion

// #region Cloud Maze
/**
 * Summary: Branching grid south of the Crystal Isles. `S` soft, `C` charged, `T` storm,
 *          `P` phantom, `R` stone rest platform (future treasure spots), `.` empty.
 * Design: Cells are 8.2 m apart with 3.1 m clouds, so every orthogonal neighbour is a 2 m
 *         jump and diagonals are out of reach: the grid's letters are its walls.
 */
const MAZE_ROWS = [
  '.S...',
  'TSSC.',
  'S..P.',
  'C.TSS',
  'R...R',
] as const;
const MAZE_ORIGIN = { x: 867.8, z: 17.0, y: 61.4 } as const;
const MAZE_CELL_M = 8.2;
const MAZE_CLOUD_RADIUS_M = 3.1;

const mazePlatforms: ISkyRestPlatform[] = [];
const mazeKindByLetter: Record<string, SkyCloudKind> = { S: 'soft', C: 'charged', T: 'storm', P: 'phantom' };
for (let row = 0; row < MAZE_ROWS.length; row++) {
  for (let col = 0; col < MAZE_ROWS[row].length; col++) {
    const letter = MAZE_ROWS[row][col];
    if (letter === '.') continue;
    const x = MAZE_ORIGIN.x + col * MAZE_CELL_M;
    const z = MAZE_ORIGIN.z + row * MAZE_CELL_M;
    const y = MAZE_ORIGIN.y - row * 0.25;
    if (letter === 'R') {
      mazePlatforms.push({ id: `rest-maze-${row}-${col}`, x, y, z, radius: MAZE_CLOUD_RADIUS_M });
      continue;
    }
    const kind = mazeKindByLetter[letter];
    generatedClouds.push({
      id: `cloud-maze-${row}-${col}`,
      routeId: 'cloud-maze',
      kind,
      x,
      y,
      z,
      radius: MAZE_CLOUD_RADIUS_M,
      phase: (row * 5 + col) * 0.91,
      gustDirX: kind === 'storm' ? 1 : undefined,
      gustDirZ: kind === 'storm' ? 0 : undefined,
    });
  }
}
// #endregion

// ======================== EXPORTS ======================== \\
// #region Exports
/** Summary: Every walkable cloud of the archipelago. */
export const SKY_CLOUDS: readonly ISkyCloudDef[] = generatedClouds;

/** Summary: Ordered hops of each linear route (the maze is not linear and is not listed). */
export const SKY_ROUTES: readonly ISkyRoute[] = generatedRoutes;

/** Summary: Every stone rest platform (route platforms and maze end platforms). */
export const SKY_REST_PLATFORMS: readonly ISkyRestPlatform[] = [
  CLOUD_RUN_REST,
  RUINS_UPDRAFT_BASE,
  RUINS_UPDRAFT_TOP,
  ...mazePlatforms,
];

/** Summary: Grid spacing and origin of the Cloud Maze, for tests and the renderer. */
export const SKY_CLOUD_MAZE = { origin: MAZE_ORIGIN, cellM: MAZE_CELL_M, rows: MAZE_ROWS } as const;
// #endregion
