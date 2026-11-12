// ============================================================================
// MODULE: World / Domain / Water Proximity
// DESIGN: Finds the distance from a point to the nearest open water, from injected terrain queries (SRP)
// SUMMARY: Water is where a water surface exists above the ground. The search looks in rings around the point, so it
//          finds lakes, the sea, rivers and waterfalls alike, without a list of fixed spots.
// ============================================================================

/** Summary: The queries the search needs, injected so the search is pure and testable. */
export interface IWaterQueries {
  /** Water surface height at the point, or null where there is no water. */
  readonly waterSurfaceAt: (x: number, z: number) => number | null;
  /** Ground height at the point. */
  readonly groundAt: (x: number, z: number) => number;
}

/** Ring radii searched around the point, in metres. */
const RING_RADII = [0, 3, 6, 10, 15, 22, 30, 40];
/** Directions sampled on each ring. */
const DIRECTIONS = 12;

/**
 * Summary: Distance (metres) to the nearest point where water covers the ground, or `maxRange` when none is found.
 * Design: Water counts only where the surface is above the ground by a clear margin (0.2 m).
 */
export function nearestWaterDistance(
  queries: IWaterQueries,
  x: number,
  z: number,
  maxRange = 40
): number {
  for (let r = 0; r < RING_RADII.length; r++) {
    const radius = RING_RADII[r];
    if (radius > maxRange) break;
    if (radius === 0) {
      if (isWaterAt(queries, x, z)) return 0;
      continue;
    }
    for (let d = 0; d < DIRECTIONS; d++) {
      const angle = (d / DIRECTIONS) * Math.PI * 2;
      if (isWaterAt(queries, x + Math.cos(angle) * radius, z + Math.sin(angle) * radius)) return radius;
    }
  }
  return maxRange;
}

function isWaterAt(queries: IWaterQueries, x: number, z: number): boolean {
  const surface = queries.waterSurfaceAt(x, z);
  return surface !== null && surface > queries.groundAt(x, z) + 0.2;
}
