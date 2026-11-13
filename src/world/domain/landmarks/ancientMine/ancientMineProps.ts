// ============================================================================
// MODULE: World / Domain / Landmarks / Ancient Mine
// DESIGN: One placement table per level. Each prop kind has a footprint; solid kinds become
//         colliders and the builder instances one mesh per kind, so looks and collision agree.
// SUMMARY: Furniture, tools, storage, carts and torches of the Ancient Dwarven Mine, placed in
//          its local frame. Base heights come from the floor under each prop at build time.
//          Holds no geometry.
// ============================================================================

// ======================== CONSTANTS & TYPES ======================== \\
// #region Prop Kinds
export type IMinePropKind =
  | 'crate'
  | 'crateStack'
  | 'barrel'
  | 'oreBin'
  | 'orePile'
  | 'toolRack'
  | 'workbench'
  | 'anvil'
  | 'longTable'
  | 'bench'
  | 'fireplace'
  | 'weaponRack'
  | 'oreCart'
  | 'controlBooth'
  | 'lever'
  | 'torchStand'
  | 'stonePillar'
  | 'timberPost'
  | 'castingMold'
  | 'bellows'
  | 'crystalCluster'
  | 'mineralVein'
  | 'brazier'
  | 'banner'
  | 'stoneBlock';

/**
 * Summary: Footprint (half extents before yaw), height and whether the player collides with it.
 * Design: Non-solid kinds are small or wall-mounted decoration the player may brush through.
 */
export interface IMinePropKindSpec {
  readonly halfX: number;
  readonly halfZ: number;
  readonly height: number;
  readonly isSolid: boolean;
}

export const MINE_PROP_KINDS: Record<IMinePropKind, IMinePropKindSpec> = {
  crate: { halfX: 0.55, halfZ: 0.55, height: 1.1, isSolid: true },
  crateStack: { halfX: 1.1, halfZ: 0.6, height: 2.2, isSolid: true },
  barrel: { halfX: 0.45, halfZ: 0.45, height: 1.2, isSolid: true },
  oreBin: { halfX: 1.0, halfZ: 0.8, height: 1.0, isSolid: true },
  orePile: { halfX: 1.3, halfZ: 1.3, height: 0.9, isSolid: false },
  toolRack: { halfX: 1.0, halfZ: 0.25, height: 2.0, isSolid: true },
  workbench: { halfX: 1.4, halfZ: 0.6, height: 1.0, isSolid: true },
  anvil: { halfX: 0.6, halfZ: 0.35, height: 0.9, isSolid: true },
  longTable: { halfX: 3.0, halfZ: 0.75, height: 0.95, isSolid: true },
  bench: { halfX: 3.0, halfZ: 0.25, height: 0.5, isSolid: true },
  fireplace: { halfX: 2.0, halfZ: 1.0, height: 3.2, isSolid: true },
  weaponRack: { halfX: 1.2, halfZ: 0.3, height: 2.0, isSolid: true },
  oreCart: { halfX: 0.75, halfZ: 1.1, height: 1.3, isSolid: true },
  controlBooth: { halfX: 1.6, halfZ: 1.6, height: 3.4, isSolid: true },
  lever: { halfX: 0.25, halfZ: 0.25, height: 1.3, isSolid: false },
  torchStand: { halfX: 0.25, halfZ: 0.25, height: 2.2, isSolid: true },
  stonePillar: { halfX: 2.2, halfZ: 2.2, height: 30.0, isSolid: true },
  timberPost: { halfX: 0.3, halfZ: 0.3, height: 6.0, isSolid: true },
  castingMold: { halfX: 1.0, halfZ: 0.6, height: 0.45, isSolid: true },
  bellows: { halfX: 0.8, halfZ: 0.6, height: 1.0, isSolid: true },
  crystalCluster: { halfX: 0.8, halfZ: 0.8, height: 1.6, isSolid: false },
  mineralVein: { halfX: 1.5, halfZ: 0.3, height: 2.5, isSolid: false },
  brazier: { halfX: 0.55, halfZ: 0.55, height: 1.6, isSolid: true },
  banner: { halfX: 1.0, halfZ: 0.1, height: 4.0, isSolid: false },
  stoneBlock: { halfX: 1.2, halfZ: 0.9, height: 1.4, isSolid: true },
};
// #endregion

// #region Placement Type
/**
 * Summary: One placed prop in the local frame. `yaw` turns it about Y (radians); `tint` picks a
 *          variant colour for kinds that have them (ore type, crystal colour).
 */
export interface IMinePropPlacement {
  readonly kind: IMinePropKind;
  readonly lx: number;
  readonly lz: number;
  readonly yaw?: number;
  readonly tint?: 'iron' | 'copper' | 'gold' | 'blue' | 'purple' | 'dark';
  /** Summary: Height above the floor, for wall-mounted kinds such as mineral veins. */
  readonly lift?: number;
}

const QUARTER = Math.PI / 2;
// #endregion

// ======================== PUBLIC PLACEMENTS ======================== \\
// #region Upper Level
/**
 * Summary: Props of the open upper cavern, grouped by zone.
 * Design: Every zone keeps clear lanes along the routes in ancientMineWalkthrough.spec.ts; the
 *         walkthrough test fails if a prop blocks one.
 */
export const UPPER_LEVEL_PROPS: readonly IMinePropPlacement[] = [
  // Hall pillars holding up the dome (positioned clear of the 2nd-floor scaffolding stairs).
  { kind: 'stonePillar', lx: -11, lz: 42 },
  { kind: 'stonePillar', lx: 24, lz: 32 },
  { kind: 'stonePillar', lx: -24, lz: 88 },
  { kind: 'stonePillar', lx: 30, lz: 98 },

  // 2nd-floor Central Hub Scaffolding Mezzanine (lx: -38..-16, lz: 26..38, y = -4.85):
  // Tool racks, weapon racks, workbenches, and anvils where AI dwarves climb up to swap/sharpen tools.
  { kind: 'toolRack', lx: -34.5, lz: 27.2 },
  { kind: 'toolRack', lx: -29.0, lz: 27.2 },
  { kind: 'weaponRack', lx: -23.0, lz: 27.2 },
  { kind: 'workbench', lx: -33.5, lz: 32.0, yaw: QUARTER },
  { kind: 'anvil', lx: -28.0, lz: 31.5 },
  { kind: 'workbench', lx: -21.0, lz: 30.5 },
  { kind: 'crate', lx: -36.0, lz: 35.8 },
  { kind: 'barrel', lx: -34.6, lz: 36.2 },

  // Central Hub Gold Collection Hopper station (lx = 18, lz = 62): gold ore bins & piles.
  { kind: 'oreBin', lx: 18, lz: 57.5, tint: 'gold' },
  { kind: 'orePile', lx: 22.2, lz: 62.0, tint: 'gold' },
  { kind: 'orePile', lx: 14.2, lz: 62.0, tint: 'gold' },

  // Central Hub West & North Mineral Veins worked by the Central Hub miners:
  { kind: 'mineralVein', lx: -45.5, lz: 60.0, yaw: QUARTER, tint: 'gold', lift: 1.2 },
  { kind: 'orePile', lx: -43.8, lz: 60.0, tint: 'gold' },
  { kind: 'mineralVein', lx: -45.5, lz: 72.0, yaw: QUARTER, tint: 'gold', lift: 1.4 },
  { kind: 'crystalCluster', lx: -44.2, lz: 74.0, tint: 'blue' },
  { kind: 'mineralVein', lx: 18.0, lz: 21.2, tint: 'gold', lift: 1.2 },
  { kind: 'orePile', lx: 18.0, lz: 22.8, tint: 'gold' },

  // Railway hub: control booth, switch levers, carts on the three lines.
  { kind: 'controlBooth', lx: 12, lz: 92 },
  { kind: 'lever', lx: 9, lz: 89 },
  { kind: 'lever', lx: 15, lz: 89 },

  // Storage on the west side of the hall.
  { kind: 'crateStack', lx: -40, lz: 44 },
  { kind: 'crate', lx: -37, lz: 47 },
  { kind: 'crate', lx: -42, lz: 49, yaw: 0.4 },
  { kind: 'barrel', lx: -38, lz: 52 },
  { kind: 'barrel', lx: -39.2, lz: 53 },
  { kind: 'oreBin', lx: -44, lz: 56, yaw: QUARTER },

  // Work zone on the north-east side of the hall.
  { kind: 'workbench', lx: 32, lz: 27 },
  { kind: 'toolRack', lx: 38, lz: 25.5 },
  { kind: 'anvil', lx: 44, lz: 29 },
  { kind: 'barrel', lx: 28, lz: 26 },

  // Rest area in the south-west corner of the hall.
  { kind: 'longTable', lx: -34, lz: 108 },
  { kind: 'bench', lx: -34, lz: 106.6 },
  { kind: 'bench', lx: -34, lz: 109.4 },
  { kind: 'longTable', lx: -34, lz: 115 },
  { kind: 'bench', lx: -34, lz: 113.6 },
  { kind: 'bench', lx: -34, lz: 116.4 },
  { kind: 'fireplace', lx: -44, lz: 122 },
  { kind: 'weaponRack', lx: -24, lz: 121 },
  { kind: 'barrel', lx: -27, lz: 119 },
  { kind: 'barrel', lx: -26, lz: 120.2 },

  // Floor torches marking the hall, lagoon, galleries and foundry.
  { kind: 'torchStand', lx: -9, lz: 47 },
  { kind: 'torchStand', lx: 9, lz: 47 },
  { kind: 'torchStand', lx: -40, lz: 80 },
  { kind: 'torchStand', lx: 40, lz: 80 },
  { kind: 'torchStand', lx: -50, lz: 94 },
  { kind: 'torchStand', lx: -58, lz: 60 },
  { kind: 'torchStand', lx: -58, lz: 86 },
  { kind: 'torchStand', lx: 60, lz: 42 },
  { kind: 'torchStand', lx: 64, lz: 120 },
  { kind: 'torchStand', lx: 116, lz: 120 },
  { kind: 'torchStand', lx: -9, lz: 119 },
  { kind: 'torchStand', lx: 9, lz: 119 },

  // Lagoon crystals & mineral veins along the shore (including where the lagoon engineer mines).
  { kind: 'crystalCluster', lx: -96, lz: 52, tint: 'blue' },
  { kind: 'crystalCluster', lx: -99, lz: 88, tint: 'blue' },
  { kind: 'crystalCluster', lx: -64, lz: 50, tint: 'blue' },
  { kind: 'crystalCluster', lx: -62.2, lz: 56, tint: 'blue' },
  { kind: 'crystalCluster', lx: -60.2, lz: 96, tint: 'purple' },
  { kind: 'mineralVein', lx: -61.5, lz: 96, yaw: QUARTER, tint: 'purple', lift: 1.0 },
  { kind: 'crystalCluster', lx: -100, lz: 100, tint: 'purple' },

  // Galleries: veins in the walls, ore piles, carts, bins, scaffold posts under the platform.
  { kind: 'mineralVein', lx: 119.5, lz: 60, yaw: QUARTER, tint: 'iron', lift: 1.5 },
  { kind: 'mineralVein', lx: 120.5, lz: 72, yaw: QUARTER, tint: 'copper', lift: 2.5 },
  { kind: 'mineralVein', lx: 119.5, lz: 86, yaw: QUARTER, tint: 'gold', lift: 1.2 },
  { kind: 'mineralVein', lx: 75, lz: 23.2, tint: 'blue', lift: 2.0 },
  { kind: 'mineralVein', lx: 92, lz: 26.2, tint: 'purple', lift: 3.0 },
  { kind: 'mineralVein', lx: 58.2, lz: 60, yaw: QUARTER, tint: 'dark', lift: 0.8 },
  { kind: 'mineralVein', lx: 58.3, lz: 54, yaw: QUARTER, tint: 'copper', lift: 1.0 },
  { kind: 'mineralVein', lx: 75.0, lz: 50.3, tint: 'gold', lift: 1.0 },
  { kind: 'mineralVein', lx: 81.8, lz: 64, yaw: QUARTER, tint: 'gold', lift: 1.0 },
  { kind: 'crystalCluster', lx: 80.6, lz: 62.5, tint: 'gold' },
  { kind: 'orePile', lx: 76, lz: 66, tint: 'iron' },
  // Faces the miners work: ore heaps against the gallery walls.
  { kind: 'orePile', lx: 118.4, lz: 60, tint: 'iron' },
  { kind: 'orePile', lx: 118.4, lz: 78, tint: 'gold' },
  { kind: 'orePile', lx: 118.2, lz: 86, tint: 'gold' },
  { kind: 'orePile', lx: 92, lz: 27.6, tint: 'purple' },
  { kind: 'orePile', lx: 80, lz: 25.4, tint: 'copper' },
  // Loot crates and coffers (WORLD_CHESTS) sit on these.
  { kind: 'crate', lx: -60.5, lz: 51 },
  { kind: 'crate', lx: -114, lz: 70 },
  { kind: 'orePile', lx: 61, lz: 66, tint: 'copper' },
  { kind: 'oreBin', lx: 97, lz: 88 },
  { kind: 'oreCart', lx: 86, lz: 74, yaw: 0.3 },
  { kind: 'crate', lx: 112, lz: 62 },
  { kind: 'crate', lx: 113, lz: 64.5, yaw: 0.3 },
  { kind: 'timberPost', lx: 92, lz: 38 },
  { kind: 'timberPost', lx: 108, lz: 38 },
  { kind: 'timberPost', lx: 92, lz: 52 },
  { kind: 'timberPost', lx: 108, lz: 52 },

  // Foundry: molds, anvils, bellows and ore bins in front of the furnaces.
  { kind: 'castingMold', lx: 72, lz: 125 },
  { kind: 'castingMold', lx: 90, lz: 125 },
  { kind: 'castingMold', lx: 108, lz: 125 },
  { kind: 'anvil', lx: 80, lz: 115 },
  { kind: 'anvil', lx: 100, lz: 116 },
  { kind: 'bellows', lx: 77, lz: 137 },
  { kind: 'bellows', lx: 95, lz: 137 },
  { kind: 'bellows', lx: 101, lz: 137 },
  { kind: 'oreBin', lx: 66, lz: 110 },
  { kind: 'oreBin', lx: 114, lz: 108 },
  { kind: 'toolRack', lx: 118, lz: 116, yaw: QUARTER },
];
// #endregion

// #region Lower Level
/**
 * Summary: Props of the descent, chasm ledge, Great Bridge, heroes' cliff path and king balcony.
 * Design: Braziers light the crossing (warm fire against the cold chasm); banners and old gear
 *         tell of the halls' history. Lanes stay clear of the walkthrough routes.
 */
export const LOWER_LEVEL_PROPS: readonly IMinePropPlacement[] = [
  // Descent landings: braziers at the balcony corners.
  { kind: 'brazier', lx: -14, lz: 139 },
  { kind: 'brazier', lx: 14, lz: 139 },
  { kind: 'brazier', lx: -14, lz: 166 },
  { kind: 'brazier', lx: 14, lz: 166 },

  // Chasm ledge: braziers at the foot of the stairs, abandoned cart, crates and rubble.
  { kind: 'brazier', lx: -12, lz: 192 },
  { kind: 'brazier', lx: 12, lz: 192 },
  { kind: 'oreCart', lx: -45, lz: 192.5, yaw: QUARTER, tint: 'dark' },
  { kind: 'crate', lx: -62, lz: 191 },
  { kind: 'crate', lx: -63.5, lz: 192.4, yaw: 0.5 },
  { kind: 'barrel', lx: -66, lz: 191.5 },
  { kind: 'orePile', lx: 40, lz: 200, tint: 'dark' },
  { kind: 'orePile', lx: 56, lz: 197, tint: 'dark' },

  // Great Bridge: braziers along both parapets.
  ...[216, 233, 250, 267, 284].flatMap((lz) => [
    { kind: 'brazier' as const, lx: -4.2, lz },
    { kind: 'brazier' as const, lx: 4.2, lz },
  ]),
  { kind: 'brazier', lx: -8.6, lz: 296.5 },
  { kind: 'brazier', lx: 8.6, lz: 296.5 },

  // Heroes' cliff path: banners on the back wall between the statues + glowing mineral veins.
  { kind: 'banner', lx: -105.8, lz: 221, yaw: QUARTER, lift: 2.4 },
  { kind: 'banner', lx: -105.8, lz: 247, yaw: QUARTER, lift: 2.4 },
  { kind: 'banner', lx: -105.8, lz: 273, yaw: QUARTER, lift: 2.4 },
  { kind: 'mineralVein', lx: -105.5, lz: 294, yaw: QUARTER, tint: 'gold', lift: 1.1 },
  { kind: 'crystalCluster', lx: -104.8, lz: 295.5, tint: 'gold' },

  // King balcony: braziers and banners flanking the first king (kept clear of the side passage to king-loop-stairs).
  { kind: 'brazier', lx: -6.5, lz: 303.5 },
  { kind: 'brazier', lx: 6.5, lz: 303.5 },
  { kind: 'banner', lx: -10.5, lz: 304.8, yaw: Math.PI, lift: 3.0 },
  { kind: 'crate', lx: 2, lz: 303.6 },
  { kind: 'crate', lx: -105, lz: 290 },
  { kind: 'banner', lx: 10.5, lz: 304.8, yaw: Math.PI, lift: 3.0 },
];

/**
 * Summary: Props of the golem chamber, the ancient passage and the dragon forge.
 * Design: Pillars and fallen masonry frame the guardian without closing the way round it;
 *         braziers stand in the wall alcoves; basalt rubble lines the forge.
 */
export const DEEP_LEVEL_PROPS: readonly IMinePropPlacement[] = [
  // Golem chamber: four great pillars, braziers in the side alcoves, glowing mineral veins and crystal clusters.
  { kind: 'stonePillar', lx: -24, lz: 322 },
  { kind: 'stonePillar', lx: 24, lz: 322 },
  { kind: 'stonePillar', lx: -24, lz: 346 },
  { kind: 'stonePillar', lx: 24, lz: 346 },
  { kind: 'brazier', lx: -28.6, lz: 316.5 },
  { kind: 'brazier', lx: -28.6, lz: 334 },
  { kind: 'brazier', lx: -28.6, lz: 351.5 },
  { kind: 'brazier', lx: 28.6, lz: 351.5 },
  { kind: 'brazier', lx: 26, lz: 316.5 },
  { kind: 'mineralVein', lx: -29.4, lz: 326, yaw: QUARTER, tint: 'blue', lift: 1.2 },
  { kind: 'crystalCluster', lx: -28.5, lz: 328, tint: 'blue' },
  { kind: 'mineralVein', lx: 29.4, lz: 336, yaw: QUARTER, tint: 'gold', lift: 1.2 },
  { kind: 'crystalCluster', lx: 28.5, lz: 338, tint: 'purple' },
  { kind: 'stoneBlock', lx: -8, lz: 324, yaw: 0.5 },
  { kind: 'stoneBlock', lx: 7.5, lz: 350, yaw: -0.3 },
  { kind: 'stoneBlock', lx: -20, lz: 334.5, yaw: 1.1 },
  { kind: 'orePile', lx: -6, lz: 327, tint: 'dark' },
  { kind: 'orePile', lx: 9, lz: 347, tint: 'dark' },
  { kind: 'orePile', lx: 22, lz: 352, tint: 'dark' },

  // Dragon forge: braziers at the passage foot and basalt rubble along the north landing.
  { kind: 'brazier', lx: -7, lz: 386.5 },
  { kind: 'brazier', lx: 7, lz: 386.5 },
  { kind: 'orePile', lx: -28, lz: 392, tint: 'dark' },
  { kind: 'orePile', lx: 28, lz: 392, tint: 'dark' },
  { kind: 'stoneBlock', lx: -22, lz: 388, yaw: 0.7 },
  { kind: 'stoneBlock', lx: 24, lz: 388, yaw: -0.4 },
  { kind: 'crate', lx: 18, lz: 390 },
];

/** Summary: Every prop of the mine, upper level first (collider ids are indexed in this order). */
export const ALL_MINE_PROPS: readonly IMinePropPlacement[] = [...UPPER_LEVEL_PROPS, ...LOWER_LEVEL_PROPS, ...DEEP_LEVEL_PROPS];
// #endregion

// #region Rail Lines
/**
 * Summary: Railway lines of the upper cavern as local polylines, starting at the turntable rim.
 * Design: Decorative flush track now; the same lines are where carts stand and ride.
 */
export const UPPER_RAIL_LINES: readonly (readonly (readonly [number, number])[])[] = [
  // East to the gallery loading bay.
  [[6, 80], [30, 80], [56, 78], [70, 76], [70, 72], [70, 60], [70, 54]],
  // Branch to the gallery loading bay.
  [[70, 76], [84, 74], [90, 72]],
  // South-east past the foundry carts.
  [[4, 85], [20, 100], [40, 108], [56, 108], [68, 114]],
  // West to the storage yard.
  [[-6, 80], [-20, 74], [-30, 69], [-40, 64]],
];
// #endregion

// ======================== PUBLIC FOOTPRINT HELPERS ======================== \\
// #region Footprint
/**
 * Summary: Axis-aligned half extents of a placed prop after its yaw.
 * @param p The placement.
 * @returns Half extents along local X and Z, meters.
 */
export function propHalfExtents(p: IMinePropPlacement): { halfX: number; halfZ: number } {
  const spec = MINE_PROP_KINDS[p.kind];
  const c = Math.abs(Math.cos(p.yaw ?? 0));
  const s = Math.abs(Math.sin(p.yaw ?? 0));
  return { halfX: c * spec.halfX + s * spec.halfZ, halfZ: s * spec.halfX + c * spec.halfZ };
}
// #endregion
