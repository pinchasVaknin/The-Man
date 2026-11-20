// ============================================================================
// MODULE: World / Systems / Koi Ponds
// DESIGN: Registry of enclosed ponds (water that is not part of the terrain heightfield) where koi live
//         inside the wildlife system. Each pond describes itself through a water-column query, so the koi
//         AI treats it exactly like a lake: schooling, startling, sleeping at night, hits and traps.
// SUMMARY: Lists the ponds, how many koi each holds and how to ask each for surface and bed height.
//          Holds no fish behavior; boidsAndWildlifeSystem spawns and steps the fish.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { ANCIENT_MINE_ORIGIN } from '../domain/landmarks/ancientMine/ancientMineLayout';
import { sampleAncientMineFloor } from '../domain/landmarks/ancientMine/ancientMineFloor';
import { SKY_HARBOR_POND, skyHarborPondColumnAt } from '../domain/landmarks/skyboundIsles/skyHarborPond';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Where the water surface and the bed are at one point of a pond. */
export interface IKoiWaterColumn {
  readonly surfaceY: number;
  readonly bedY: number;
}

/** Summary: An enclosed pond that holds koi. All coordinates are world coordinates. */
export interface IKoiPond {
  readonly id: string;
  readonly centerX: number;
  readonly centerZ: number;
  /** Half-extents of the figure-eight school patrol around the center (m). */
  readonly patrolRadiusX: number;
  readonly patrolRadiusZ: number;
  /** Fish are gently pulled back inside this distance from the center (m). */
  readonly maxRadius: number;
  /** Surface height at the center, used for spawning (m). */
  readonly surfaceY: number;
  readonly fishCount: number;
  /** The water column at a point, or null where there is no water. `currentY` picks the layer under a roof. */
  readonly columnAt: (x: number, z: number, currentY: number) => IKoiWaterColumn | null;
}
// #endregion

// ======================== PONDS ======================== \\
// #region Ponds
const MINE_LAGOON_CENTRE_LX = -84;
const MINE_LAGOON_CENTRE_LZ = 72;

/** Summary: The Ancient Mine lagoon: a large cavern basin below the surface. */
export const MINE_LAGOON_POND: IKoiPond = {
  id: 'ancient-mine-lagoon',
  centerX: ANCIENT_MINE_ORIGIN.x + MINE_LAGOON_CENTRE_LX,
  centerZ: ANCIENT_MINE_ORIGIN.z + MINE_LAGOON_CENTRE_LZ,
  patrolRadiusX: 15,
  patrolRadiusZ: 14,
  maxRadius: 21,
  surfaceY: -9.95,
  fishCount: 10,
  columnAt: (x, z, currentY) => {
    const sample = sampleAncientMineFloor(x - ANCIENT_MINE_ORIGIN.x, z - ANCIENT_MINE_ORIGIN.z, currentY);
    if (sample === null || sample.material !== 'water' || sample.waterSurfaceY === null) return null;
    return { surfaceY: sample.waterSurfaceY, bedY: sample.height };
  },
};

/** Summary: The Sky Harbor Sky Garden pond: a sunken pool in the island deck, shallow at the rim and deep in the middle. */
export const SKY_HARBOR_KOI_POND: IKoiPond = {
  id: 'sky-harbor-pond',
  centerX: SKY_HARBOR_POND.x,
  centerZ: SKY_HARBOR_POND.z,
  patrolRadiusX: SKY_HARBOR_POND.radius * 0.5,
  patrolRadiusZ: SKY_HARBOR_POND.radius * 0.5,
  maxRadius: SKY_HARBOR_POND.radius * 0.72,
  surfaceY: SKY_HARBOR_POND.surfaceY,
  fishCount: 7,
  columnAt: (x, z) => skyHarborPondColumnAt(x, z),
};

/** Summary: Every enclosed koi pond. */
export const ENCLOSED_KOI_PONDS: readonly IKoiPond[] = [MINE_LAGOON_POND, SKY_HARBOR_KOI_POND];

/** Summary: Finds a pond by id, or undefined. */
export function findKoiPond(id: string | undefined): IKoiPond | undefined {
  return id === undefined ? undefined : ENCLOSED_KOI_PONDS.find((pond) => pond.id === id);
}
// #endregion
