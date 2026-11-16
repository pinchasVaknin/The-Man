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
  | 'stoneBlock'
  | 'beerMug';

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
  beerMug: { halfX: 0.15, halfZ: 0.15, height: 0.32, isSolid: false },
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

  // Central Hub West, North-West & North Gold/Silver Mineral Veins embedded directly into the rock cavern walls:
  { kind: 'mineralVein', lx: -46.0, lz: 21.8, tint: 'gold', lift: 1.2 },
  { kind: 'orePile', lx: -46.0, lz: 23.2, tint: 'gold' },
  { kind: 'mineralVein', lx: -56.0, lz: 22.8, tint: 'iron', lift: 1.3 },
  { kind: 'mineralVein', lx: -64.0, lz: 24.0, tint: 'gold', lift: 1.4 },
  { kind: 'crystalCluster', lx: -64.0, lz: 25.8, tint: 'blue' },
  { kind: 'mineralVein', lx: 18.0, lz: 20.2, tint: 'gold', lift: 1.2 },
  { kind: 'orePile', lx: 18.0, lz: 22.8, tint: 'gold' },

  // Storage on the west side of the hall (positioned east of the West Gold/Silver rail line).
  { kind: 'crateStack', lx: -34, lz: 44 },
  { kind: 'crate', lx: -31, lz: 46.5 },
  { kind: 'crate', lx: -35, lz: 48.5, yaw: 0.4 },
  { kind: 'barrel', lx: -32, lz: 51 },
  { kind: 'barrel', lx: -33.2, lz: 52.2 },
  { kind: 'oreBin', lx: -35, lz: 55, yaw: QUARTER },

  // Work zone on the north-east side of the hall (clear of the North-East Gold/Silver rail line).
  { kind: 'workbench', lx: 32, lz: 27 },
  { kind: 'toolRack', lx: 38, lz: 25.5 },
  { kind: 'anvil', lx: 44, lz: 27 },
  { kind: 'barrel', lx: 28, lz: 26 },

  // Grand Dwarven Tavern / Pub ("The Molten Tankard") in the south-west hall (lx: -50..-22, lz: 98..122).
  { kind: 'longTable', lx: -41, lz: 104 },
  { kind: 'bench', lx: -41, lz: 102.6 },
  { kind: 'bench', lx: -41, lz: 105.4 },
  { kind: 'longTable', lx: -28, lz: 104 },
  { kind: 'bench', lx: -28, lz: 102.6 },
  { kind: 'bench', lx: -28, lz: 105.4 },
  { kind: 'longTable', lx: -41, lz: 112 },
  { kind: 'bench', lx: -41, lz: 110.6 },
  { kind: 'bench', lx: -41, lz: 113.4 },
  { kind: 'longTable', lx: -28, lz: 112 },
  { kind: 'bench', lx: -28, lz: 110.6 },
  { kind: 'bench', lx: -28, lz: 113.4 },
  { kind: 'fireplace', lx: -49.5, lz: 126.2, yaw: Math.PI },
  { kind: 'fireplace', lx: -59.0, lz: 156.2, yaw: Math.PI },
  { kind: 'weaponRack', lx: -22, lz: 120 },
  { kind: 'barrel', lx: -49, lz: 117.5 },
  { kind: 'barrel', lx: -49, lz: 119.0 },

  // Floor torches marking the hall, lagoon, galleries and foundry (positioned clear of all railway tracks).
  { kind: 'torchStand', lx: -9, lz: 47 },
  { kind: 'torchStand', lx: 7.5, lz: 47 },
  { kind: 'torchStand', lx: -42, lz: 88 },
  { kind: 'torchStand', lx: 40, lz: 84 },
  { kind: 'torchStand', lx: -54, lz: 95 },
  { kind: 'torchStand', lx: -56, lz: 60 },
  { kind: 'torchStand', lx: -58, lz: 88 },
  { kind: 'torchStand', lx: 60, lz: 42 },
  { kind: 'torchStand', lx: 64, lz: 120 },
  { kind: 'torchStand', lx: 116, lz: 120 },
  { kind: 'torchStand', lx: -9, lz: 119 },
  { kind: 'torchStand', lx: 9, lz: 119 },

  // Lagoon shore & wall-mounted mineral veins (kept outside the expanded organic lagoon water polygon).
  { kind: 'crystalCluster', lx: -96, lz: 46, tint: 'blue' },
  { kind: 'crystalCluster', lx: -102, lz: 88, tint: 'blue' },
  { kind: 'crystalCluster', lx: -61, lz: 50, tint: 'blue' },
  { kind: 'crystalCluster', lx: -59.5, lz: 56, tint: 'blue' },
  { kind: 'crystalCluster', lx: -60.2, lz: 96, tint: 'purple' },
  { kind: 'mineralVein', lx: -109.0, lz: 62, yaw: QUARTER, tint: 'purple', lift: 1.2 },
  { kind: 'mineralVein', lx: -108.5, lz: 84, yaw: QUARTER, tint: 'blue', lift: 1.3 },
  { kind: 'crystalCluster', lx: -100, lz: 100, tint: 'purple' },

  // Galleries: gold, silver & copper veins embedded in the rock walls, ore piles, bins, scaffold posts.
  { kind: 'mineralVein', lx: 120.0, lz: 60, yaw: QUARTER, tint: 'iron', lift: 1.4 },
  { kind: 'mineralVein', lx: 121.2, lz: 80, yaw: QUARTER, tint: 'gold', lift: 1.6 },
  { kind: 'mineralVein', lx: 119.8, lz: 90, yaw: QUARTER, tint: 'gold', lift: 1.2 },
  { kind: 'mineralVein', lx: 75, lz: 23.0, tint: 'gold', lift: 1.5 },
  { kind: 'mineralVein', lx: 82, lz: 24.5, tint: 'iron', lift: 1.4 },
  { kind: 'mineralVein', lx: 94, lz: 26.8, tint: 'gold', lift: 1.6 },
  { kind: 'mineralVein', lx: 58.1, lz: 62, yaw: QUARTER, tint: 'dark', lift: 0.9 },
  { kind: 'mineralVein', lx: 58.1, lz: 55, yaw: QUARTER, tint: 'copper', lift: 1.0 },
  { kind: 'mineralVein', lx: 75.0, lz: 50.1, tint: 'gold', lift: 1.0 },
  { kind: 'mineralVein', lx: 81.9, lz: 64, yaw: QUARTER, tint: 'gold', lift: 1.0 },
  { kind: 'mineralVein', lx: 58.0, lz: 136.8, tint: 'copper', lift: 1.3 },
  { kind: 'crystalCluster', lx: 80.6, lz: 62.5, tint: 'gold' },
  { kind: 'orePile', lx: 76, lz: 66, tint: 'iron' },
  // Faces the miners work: ore heaps against the gallery walls (clear of track spurs).
  { kind: 'orePile', lx: 118.4, lz: 60, tint: 'iron' },
  { kind: 'orePile', lx: 118.4, lz: 80, tint: 'gold' },
  { kind: 'orePile', lx: 118.2, lz: 90, tint: 'gold' },
  { kind: 'orePile', lx: 94, lz: 28.4, tint: 'gold' },
  { kind: 'orePile', lx: 75, lz: 25.0, tint: 'gold' },
  // Loot crates and coffers (WORLD_CHESTS) sit on these.
  { kind: 'crate', lx: -60.5, lz: 51 },
  { kind: 'crate', lx: -114, lz: 70 },
  { kind: 'orePile', lx: 61, lz: 66, tint: 'copper' },
  { kind: 'oreBin', lx: 97, lz: 88 },
  { kind: 'crate', lx: 112, lz: 62 },
  { kind: 'crate', lx: 113, lz: 64.5, yaw: 0.3 },
  { kind: 'timberPost', lx: 92, lz: 38 },
  { kind: 'timberPost', lx: 108, lz: 38 },
  { kind: 'timberPost', lx: 92, lz: 52 },
  { kind: 'timberPost', lx: 108, lz: 52 },

  // Foundry: molds, anvils, bellows and ore bins in front of the furnaces (clear of the Foundry rail line).
  { kind: 'castingMold', lx: 72, lz: 125 },
  { kind: 'castingMold', lx: 90, lz: 125 },
  { kind: 'castingMold', lx: 108, lz: 125 },
  { kind: 'anvil', lx: 80, lz: 115 },
  { kind: 'anvil', lx: 100, lz: 116 },
  { kind: 'bellows', lx: 77, lz: 137 },
  { kind: 'bellows', lx: 95, lz: 137 },
  { kind: 'bellows', lx: 101, lz: 137 },
  { kind: 'oreBin', lx: 64, lz: 103 },
  { kind: 'oreBin', lx: 114, lz: 108 },
  { kind: 'toolRack', lx: 118, lz: 116, yaw: QUARTER },

  // Room 1 (Left Branch of East Fork, lx: 146..200, lz: -66..-24, y = -27.35): Deep Glowing Diamond Mine Cavern.
  { kind: 'mineralVein', lx: 199.4, lz: -54, yaw: QUARTER, tint: 'blue', lift: 1.5 },
  { kind: 'mineralVein', lx: 199.4, lz: -42, yaw: QUARTER, tint: 'blue', lift: 1.6 },
  { kind: 'mineralVein', lx: 199.4, lz: -32, yaw: QUARTER, tint: 'gold', lift: 1.4 },
  { kind: 'mineralVein', lx: 162, lz: -65.4, tint: 'blue', lift: 1.5 },
  { kind: 'mineralVein', lx: 184, lz: -65.4, tint: 'purple', lift: 1.5 },
  { kind: 'crystalCluster', lx: 196.0, lz: -56, tint: 'blue' },
  { kind: 'crystalCluster', lx: 196.0, lz: -40, tint: 'blue' },
  { kind: 'crystalCluster', lx: 194.0, lz: -30, tint: 'purple' },
  { kind: 'crystalCluster', lx: 150.0, lz: -58, tint: 'blue' },
  { kind: 'orePile', lx: 193.0, lz: -50, tint: 'iron' },
  { kind: 'orePile', lx: 193.0, lz: -44, tint: 'gold' },
  { kind: 'oreBin', lx: 152, lz: -48, yaw: QUARTER },
  { kind: 'workbench', lx: 152, lz: -40, yaw: QUARTER },
  { kind: 'anvil', lx: 153, lz: -35 },
  { kind: 'toolRack', lx: 149, lz: -30, yaw: QUARTER },
  { kind: 'torchStand', lx: 154, lz: 64 },
  { kind: 'torchStand', lx: 154, lz: 80 },
  { kind: 'torchStand', lx: 160, lz: -56 },
  { kind: 'torchStand', lx: 186, lz: -56 },

  // Room 2 (Right Branch of East Fork, lx: 148..192, lz: 96..130, y = -17.35): Grand Dwarven Storage Warehouse.
  { kind: 'brazier', lx: 160, lz: 102 },
  { kind: 'brazier', lx: 184, lz: 102 },
  { kind: 'brazier', lx: 160, lz: 124 },
  { kind: 'brazier', lx: 184, lz: 124 },
  { kind: 'crateStack', lx: 151, lz: 100 },
  { kind: 'crateStack', lx: 151, lz: 126 },
  { kind: 'crateStack', lx: 189, lz: 100 },
  { kind: 'crateStack', lx: 189, lz: 126 },
  { kind: 'barrel', lx: 155, lz: 127 },
  { kind: 'barrel', lx: 185, lz: 127 },
];
// #endregion

// #region Lower Level
/**
 * Summary: Props of the descent, chasm ledge, Great Bridge, heroes' cliff path, king balcony, and Circular Staircase Chamber.
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
  // Flanking braziers at the Left-Wall Doorway to the Circular Staircase Chamber (lx = 70, lz = 194..202).
  { kind: 'brazier', lx: 68.5, lz: 192.8 },
  { kind: 'brazier', lx: 68.5, lz: 203.2 },
  // War Room Entry Corridor & Spiral Staircase Descent Banners along the outer walls (lx: 70..136, lz: 194..244).
  ...[81, 89, 97].flatMap((lx) => [
    { kind: 'banner' as const, lx, lz: 194.15, yaw: 0, lift: 2.4 },
    { kind: 'banner' as const, lx, lz: 201.85, yaw: Math.PI, lift: 2.4 },
  ]),
  { kind: 'banner', lx: 111, lz: 194.15, yaw: 0, lift: 2.2 },
  { kind: 'banner', lx: 121, lz: 194.15, yaw: 0, lift: 2.2 },
  { kind: 'banner', lx: 131, lz: 194.15, yaw: 0, lift: 2.2 },
  ...[199, 208, 216, 224].map((lz) => ({
    kind: 'banner' as const,
    lx: 135.85,
    lz,
    yaw: -QUARTER,
    lift: 2.2,
  })),
  { kind: 'banner', lx: 128, lz: 227.85, yaw: Math.PI, lift: 2.2 },
  { kind: 'banner', lx: 118, lz: 227.85, yaw: Math.PI, lift: 2.2 },
  ...[224, 232, 239].map((lz) => ({
    kind: 'banner' as const,
    lx: 102.15,
    lz,
    yaw: QUARTER,
    lift: 2.2,
  })),
  { kind: 'banner', lx: 109.85, lz: 232, yaw: -QUARTER, lift: 2.2 },
  { kind: 'banner', lx: 109.85, lz: 239, yaw: -QUARTER, lift: 2.2 },
  // Deep Moria War Room at the bottom of the Circular Staircase (lx: 102..138, lz: 244..276, y = -63.35).
  { kind: 'brazier', lx: 112, lz: 250 },
  { kind: 'brazier', lx: 128, lz: 250 },
  { kind: 'brazier', lx: 112, lz: 268 },
  { kind: 'brazier', lx: 128, lz: 268 },
  { kind: 'weaponRack', lx: 104, lz: 258, yaw: QUARTER },
  { kind: 'crystalCluster', lx: 135, lz: 254, tint: 'blue' },
  { kind: 'crystalCluster', lx: 135, lz: 266, tint: 'gold' },
  ...[248, 255, 261, 270].flatMap((lz) => [
    { kind: 'banner' as const, lx: 102.15, lz, yaw: QUARTER, lift: 3.2 },
    { kind: 'banner' as const, lx: 137.85, lz, yaw: -QUARTER, lift: 3.2 },
  ]),
  { kind: 'banner', lx: 108.5, lz: 275.85, yaw: Math.PI, lift: 3.4 },
  { kind: 'banner', lx: 131.5, lz: 275.85, yaw: Math.PI, lift: 3.4 },

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
  { kind: 'mineralVein', lx: -105.9, lz: 294, yaw: QUARTER, tint: 'gold', lift: 1.1 },
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
  { kind: 'mineralVein', lx: -29.9, lz: 326, yaw: QUARTER, tint: 'blue', lift: 1.2 },
  { kind: 'crystalCluster', lx: -28.5, lz: 328, tint: 'blue' },
  { kind: 'mineralVein', lx: 29.9, lz: 336, yaw: QUARTER, tint: 'gold', lift: 1.2 },
  { kind: 'crystalCluster', lx: 28.5, lz: 338, tint: 'purple' },
  { kind: 'stoneBlock', lx: -8, lz: 324, yaw: 0.5 },
  { kind: 'stoneBlock', lx: 7.5, lz: 350, yaw: -0.3 },
  { kind: 'stoneBlock', lx: -20, lz: 334.5, yaw: 1.1 },

  // Ancient passage descending into the Dragon Forge: Dwarven banners on both walls replacing the old stone panels.
  ...[360, 366, 372, 378, 382.2].flatMap((lz) => [
    { kind: 'banner' as const, lx: -4.85, lz, yaw: QUARTER, lift: 1.5 },
    { kind: 'banner' as const, lx: 4.85, lz, yaw: -QUARTER, lift: 1.5 },
  ]),

  // Dragon forge: braziers at the passage foot, royal banners on the north wall, and crates along the north landing.
  { kind: 'brazier', lx: -7, lz: 386.5 },
  { kind: 'brazier', lx: 7, lz: 386.5 },
  { kind: 'banner', lx: -10.5, lz: 384.2, yaw: 0, lift: 3.2 },
  { kind: 'banner', lx: 10.5, lz: 384.2, yaw: 0, lift: 3.2 },
  { kind: 'stoneBlock', lx: -22, lz: 388, yaw: 0.7 },
  { kind: 'stoneBlock', lx: 24, lz: 388, yaw: -0.4 },
  { kind: 'crate', lx: 18, lz: 390 },
];

/** Summary: Every prop of the mine, upper level first (collider ids are indexed in this order). */
export const ALL_MINE_PROPS: readonly IMinePropPlacement[] = [...UPPER_LEVEL_PROPS, ...LOWER_LEVEL_PROPS, ...DEEP_LEVEL_PROPS];
// #endregion

// #region Rail Lines
/**
 * Summary: Railway network of the Central Hub (`upperCavern`) radiating from the Central Gold Funnel
 *          (`lx = 0, lz = 80`) across the Gold/Silver walls, Gallery Pit, East Crusher, North Tunnel,
 *          Smelting Foundry, and descending through the opened East Doorway (`lx = 121.3, lz = 72`)
 *          to the Underground Forking Switch (`lx = 156, lz = 72`) leading to the Mithril Cavern (Left)
 *          and Hall of Mazarbul (Right).
 * Design:
 * - Every line is kept 100% clear of props, pillars, stairs, and structures.
 * - Branch lines share a tangent initial segment with their parent line so turnouts merge smoothly
 *   via curved frog switches rather than colliding at right angles.
 */
export const UPPER_RAIL_LINES: readonly (readonly (readonly [number, number])[])[] = [
  // 1. East Main Line into the Gallery Pit loading bay (diverges cleanly North-East at [56, 78] into the pit ramp at [70, 72]).
  [[6, 80], [32, 80], [56, 78], [67, 74.2], [70, 72], [70, 60], [70, 54]],
  // 2. East Gallery & Descending Fork Line — Left Branch through 1st Small Tunnel, across the Abyss Chasm Rail Bridge, through 2nd Descending Tunnel, into the Deep Glowing Diamond Mine.
  [[56, 78], [74, 78.5], [96, 72], [118, 72], [124, 72], [152, 72], [156, 72], [165, 67], [173, 60], [173, 48], [173, 8], [173, -24], [173, -46]],
  // 3. North-East Gold & Silver Tunnel Line (runs from the Central Gold Funnel along the open north gallery corridor to the North Gold/Silver wall at (86, 29)).
  [[4, 74], [16, 56], [34, 40], [54, 31], [75, 31], [86, 29]],
  // 4. South-East Smelting Foundry Line extending past all three Blast Furnaces.
  [[4, 85], [20, 100], [40, 108], [56, 108], [68, 114], [84, 120], [98, 120], [112, 116]],
  // 5. West Gold & Silver Wall Line (runs west of the 2nd-floor scaffolding directly to the North-West Gold & Silver veins at (-46, 21.8) and (-64, 24.0)).
  [[-6, 80], [-18, 75], [-32, 66], [-44, 54], [-46, 38], [-46, 26], [-56, 26]],
  // 6. West Cavern Spur (branches tangentially from [-18, 75] with the exact incoming trunk tangent [-6, 80] -> [-18, 75]).
  [[-18, 75], [-34, 79], [-48, 84], [-56, 84]],
  // 7. East Descending Fork — Right Branch splitting tangentially from [156, 72] into the Grand Dwarven Storage Warehouse.
  [[156, 72], [165, 77], [172, 86], [172, 96], [174, 116]],
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
