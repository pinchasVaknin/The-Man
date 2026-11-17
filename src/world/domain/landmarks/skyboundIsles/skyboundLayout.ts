// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Pure data. Every island is a flat disc deck (the Phase 1 blockout); bridges are
//         straight ramps between two rim points. Positions follow the approved archipelago
//         sketch: Sky Harbor is the hub at the top of the existing waterfall climb, the
//         other islands sit around it on three height layers.
// SUMMARY: Where the islands, bridges and fall-recovery checkpoints of the sky archipelago
//          are. Holds no THREE objects and no runtime state; clouds and wind live in their
//          own modules.
// ============================================================================

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Height band an island belongs to, used for art direction and difficulty. */
export type SkyLayer = 'upper' | 'central' | 'lower';

/** Summary: One floating island deck: a flat walkable disc at `deckY`. */
export interface ISkyIsland {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly deckY: number;
  readonly radius: number;
  readonly layer: SkyLayer;
  /** Optional islands are side content and never block the main loop. */
  readonly optional: boolean;
  /** Where a player who fell after last standing here is put back, on the deck. */
  readonly checkpoint: { readonly x: number; readonly z: number };
}

/** Summary: A straight walkable ramp from rim point A to rim point B. */
export interface ISkyBridge {
  readonly id: string;
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  readonly bx: number;
  readonly by: number;
  readonly bz: number;
  readonly halfWidth: number;
}
// #endregion

// #region Islands
/** Summary: Sky Harbor, the hub. Its west rim (x = 733) meets the top of the waterfall climb. */
export const SKY_HARBOR: ISkyIsland = {
  id: 'sky-harbor',
  x: 778.0,
  z: -35.0,
  deckY: 68.0,
  radius: 45.0,
  layer: 'central',
  optional: false,
  checkpoint: { x: 741.0, z: -35.0 },
};

/** Summary: Storm Island, the optional upper island and home of the Royal Stag herd. */
export const STORM_ISLAND: ISkyIsland = {
  id: 'storm-island',
  x: 885.0,
  z: -112.0,
  deckY: 115.0,
  radius: 20.0,
  layer: 'upper',
  optional: true,
  checkpoint: { x: 870.0, z: -111.0 },
};

/**
 * Summary: All island decks of the archipelago, hub first.
 * Design: Gaps between rims are 20–60 m on purpose: every crossing is a cloud route, a
 *         wind current or a bridge, never a plain jump.
 */
export const SKYBOUND_ISLANDS: readonly ISkyIsland[] = [
  SKY_HARBOR,
  {
    id: 'floating-garden',
    x: 730.0,
    z: 52.0,
    deckY: 71.0,
    radius: 34.0,
    layer: 'central',
    optional: false,
    checkpoint: { x: 738.0, z: 32.0 },
  },
  {
    id: 'ancient-sky-ruins',
    x: 705.0,
    z: -118.0,
    deckY: 82.0,
    radius: 30.0,
    layer: 'central',
    optional: false,
    checkpoint: { x: 712.0, z: -104.0 },
  },
  {
    id: 'sky-observatory',
    x: 800.0,
    z: -122.0,
    deckY: 98.0,
    radius: 28.0,
    layer: 'upper',
    optional: false,
    checkpoint: { x: 784.0, z: -120.0 },
  },
  {
    id: 'crystal-isles',
    x: 875.0,
    z: -12.0,
    deckY: 62.0,
    radius: 24.0,
    layer: 'central',
    optional: false,
    checkpoint: { x: 858.0, z: -16.0 },
  },
  STORM_ISLAND,
  {
    id: 'forgotten-airship',
    x: 842.0,
    z: 66.0,
    deckY: 45.0,
    radius: 14.0,
    layer: 'lower',
    optional: true,
    checkpoint: { x: 836.0, z: 62.0 },
  },
  {
    id: 'hidden-isle',
    x: 795.0,
    z: 58.0,
    deckY: 30.0,
    radius: 10.0,
    layer: 'lower',
    optional: true,
    checkpoint: { x: 797.0, z: 56.0 },
  },
];
// #endregion

// #region Windspire
/** Summary: Size of the Windspire, the central tower standing on the centre of Sky Harbor. */
export const WINDSPIRE = { radius: 6.0, height: 40.0 } as const;

// #endregion

// #region Bridges
/** Summary: Stone bridge from the Crystal Isles back up to Sky Harbor (closes the main loop). */
export const SKY_BRIDGES: readonly ISkyBridge[] = [
  {
    id: 'bridge-crystal-to-harbor',
    ax: 851.6,
    ay: 62.0,
    az: -17.6,
    bx: 821.8,
    by: 68.0,
    bz: -24.8,
    halfWidth: 2.6,
  },
];
// #endregion

// #region Region Bounds
/** Summary: Horizontal box around the whole archipelago, used to gate per-frame sky logic. */
export const SKYBOUND_REGION = {
  minX: 670.0,
  maxX: 930.0,
  minZ: -160.0,
  maxZ: 100.0,
  /** Below this height a player who last stood on the archipelago is put back on it. */
  fallRecoveryY: 22.0,
} as const;
// #endregion

// ======================== PUBLIC QUERIES ======================== \\
// #region Island Lookup
/**
 * Summary: Finds an island by id.
 * @param id The island id from `SKYBOUND_ISLANDS`.
 * @returns The island, or `undefined` for an unknown id.
 */
export function getSkyIsland(id: string): ISkyIsland | undefined {
  return SKYBOUND_ISLANDS.find((isl) => isl.id === id);
}

/**
 * Summary: True when (x, z) is inside the archipelago's horizontal bounds.
 * @param x World X in metres.
 * @param z World Z in metres.
 */
export function isInsideSkyboundRegion(x: number, z: number): boolean {
  return (
    x >= SKYBOUND_REGION.minX &&
    x <= SKYBOUND_REGION.maxX &&
    z >= SKYBOUND_REGION.minZ &&
    z <= SKYBOUND_REGION.maxZ
  );
}
// #endregion
