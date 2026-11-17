// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: One Wind Core per main island, each placed where that island's challenge leads:
//         the Sky Tree crown, the Observatory's star chamber, the crystal grotto and the
//         Ruins temple. Core i always feeds Windspire socket i, so the hub shows exactly
//         which islands are done. Pure data.
// SUMMARY: Wind Core positions, which socket each feeds, their cradles, and how many cores
//          each Windspire unlock needs.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { SKY_TREE, SKY_TREE_CROWN } from './floatingGardenLayout';
import { OBSERVATORY_CHAMBER } from './observatoryLayout';
import { CRYSTAL_GROTTO } from './crystalIslesLayout';
import { RUINS_TEMPLE } from './ancientRuinsLayout';
import { getSkyIsland } from './skyboundLayout';
import type { ISkySolidBox } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: One Wind Core: where it floats and which Windspire socket it lights. */
export interface IWindCoreDef {
  readonly id: string;
  readonly islandId: string;
  readonly x: number;
  /** Floor height under the core's cradle. */
  readonly y: number;
  readonly z: number;
  /** Index into `WIND_CORE_SOCKETS` (0..3). */
  readonly socketIndex: number;
}
// #endregion

// #region Cores
const OBSERVATORY_DECK_Y = getSkyIsland('sky-observatory')!.deckY;
const RUINS_DECK_Y = getSkyIsland('ancient-sky-ruins')!.deckY;

/** Summary: The four Wind Cores, one per main island, in socket order. */
export const WIND_CORES: readonly IWindCoreDef[] = [
  { id: 'wind-core-garden', islandId: 'floating-garden', x: SKY_TREE.x + 4.6, y: SKY_TREE_CROWN.y, z: SKY_TREE.z, socketIndex: 0 },
  { id: 'wind-core-observatory', islandId: 'sky-observatory', x: OBSERVATORY_CHAMBER.minX + 0.9, y: OBSERVATORY_DECK_Y, z: OBSERVATORY_CHAMBER.minZ + 3.2, socketIndex: 1 },
  { id: 'wind-core-crystal', islandId: 'crystal-isles', x: CRYSTAL_GROTTO.minX + 2.0, y: CRYSTAL_GROTTO.y, z: CRYSTAL_GROTTO.minZ + 1.5, socketIndex: 2 },
  { id: 'wind-core-ruins', islandId: 'ancient-sky-ruins', x: RUINS_TEMPLE.minX + 3.5, y: RUINS_DECK_Y, z: RUINS_TEMPLE.minZ + 2.5, socketIndex: 3 },
];

/** Summary: Cores needed for each Windspire unlock. */
export const WIND_CORE_UNLOCKS = {
  /** The wind current from Sky Harbor up to the Observatory. */
  observatoryShortcut: 2,
  /** The updraft from the tower balcony to the Windspire summit. */
  summit: 4,
} as const;
// #endregion

// #region Solid Boxes
/** Summary: The stone cradle under each core (the core floats above it). */
export const WIND_CORE_SOLID_BOXES: readonly ISkySolidBox[] = WIND_CORES.map((c) => ({
  id: c.id,
  minX: c.x - 0.35,
  maxX: c.x + 0.35,
  minZ: c.z - 0.35,
  maxZ: c.z + 0.35,
  minY: c.y,
  maxY: c.y + 0.9,
}));
// #endregion
