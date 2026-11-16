// ============================================================================
// MODULE: World / Domain / Landmarks / Core
// DESIGN: Fundamental coordinate boundaries, spatial scales, and natural landmarks (SRP)
// SUMMARY: Exposes global world constants (water level, playable radius, view distance, spawn)
//          and natural landmark positions (waterfall, birch grove, mountain peaks).
// ============================================================================

// ======================== GLOBAL SPATIAL CONSTANTS ======================== \\
// #region Global Spatial Constants
/** Summary: Global sea-level altitude in world units. */
export const WATER_LEVEL = 0.0;

/** Summary: Camera eye offset above ground for first-person player perspective. */
export const PLAYER_EYE_HEIGHT = 1.72;

/** Summary: Playable terrain boundary radius from world origin. */
export const PLAYABLE_RADIUS = 1260;

/** Summary: Maximum visible distance for terrain chunk culling and entity activation. */
export const VIEW_DISTANCE = 225;

/** Summary: Threshold altitude above which snow accumulates on terrain. */
export const SNOW_LINE_ALTITUDE = 16.5;

/** Summary: Initial player character spawn position and camera orientation. */
export const WORLD_SPAWN = {
  x: 0,
  z: 32,
  yaw: 0.04,
  pitch: -0.04,
} as const;
// #endregion

// ======================== NATURAL GEOGRAPHY LANDMARKS ======================== \\
// #region Natural Geography Landmarks
/** Summary: Grand waterfall cliff top origin coordinates. */
export const WATERFALL_CLIFF_POS = { x: -52, z: -42 } as const;

/** Summary: Plunge pool center coordinates at the base of the waterfall. */
export const WATERFALL_POOL_POS = { x: -42, z: -30 } as const;

/** Summary: Ancient orange birch grove forest boundary and center coordinates. */
export const BIRCH_GROVE_CENTER = { x: 158, z: 118, radius: 108 } as const;

/** Summary: Magic stone circle hill summit and approach trail coordinates. */
export const MAGIC_STONE_CIRCLE_POS = {
  x: -58.0,
  z: 128.0,
  height: 14.5,
  hillRadius: 38.0,
  topFlatRadius: 10.5,
  entryStartX: -16.0,
  entryStartZ: 112.0,
} as const;

/** Summary: Significant mountain summits with radial influence and elevation targets. */
export const WALKABLE_MOUNTAINS = [
  { id: 'nw-waterfall-peak', x: -60, z: -52, radius: 46, height: 24.0 },
  { id: 'north-foothill-west', x: -85, z: -105, radius: 68, height: 18.5 },
  { id: 'north-foothill-center', x: 68, z: -102, radius: 54, height: 14.5 },
  { id: 'north-snow-alpine-center', x: -65, z: -172, radius: 72, height: 29.0 },
  { id: 'north-snow-alpine-west', x: -165, z: -335, radius: 92, height: 36.0 },
  { id: 'north-snow-alpine-east', x: 160, z: -335, radius: 90, height: 33.0 },
  { id: 'ne-summit', x: 212, z: -148, radius: 92, height: 34.0 },
  { id: 'west-ridge', x: -245, z: -45, radius: 92, height: 33.0 },
  { id: 'south-distant-peak', x: 38, z: 328, radius: 78, height: 29.0 },
  { id: 'south-gorge-west-peak', x: 54, z: 600, radius: 54, height: 31.5 },
  { id: 'south-gorge-east-peak', x: 182, z: 600, radius: 54, height: 30.5 },
] as const;

/** Summary: Subtle rolling hill mounds dotting the central spawn meadow. */
export const SMALL_MEADOW_HILLS = [
  { x: 38, z: 72, r: 22, h: 3.6 },
  { x: -28, z: 96, r: 25, h: 4.1 },
  { x: 75, z: 125, r: 28, h: 4.8 },
  { x: 148, z: 95, r: 24, h: 3.9 },
  { x: -155, z: 115, r: 26, h: 4.2 },
  { x: 162, z: -18, r: 22, h: 3.5 },
] as const;

/** Summary: Mountain forest caves carved directly into remote unpopulated hills with ground-level entrances. */
export const BEAR_MOUNTAIN_CAVES = [
  {
    id: 'cave-nw-forest',
    x: -85,
    z: -76,
    entranceX: -85,
    entranceZ: -64,
    floorY: 2.2,
    radius: 11.5,
    roofHeight: 6.4,
    facingYaw: 0,
  },
  {
    id: 'cave-west-ridge',
    x: -186,
    z: -45,
    entranceX: -174,
    entranceZ: -45,
    floorY: 2.25,
    radius: 11.5,
    roofHeight: 6.4,
    facingYaw: Math.PI / 2,
  },
  {
    id: 'cave-south-forest',
    x: 38,
    z: 294,
    entranceX: 38,
    entranceZ: 282,
    floorY: 2.25,
    radius: 11.5,
    roofHeight: 6.4,
    facingYaw: Math.PI,
  },
] as const;

/** Summary: Centerline waypoints for the Southern River flowing from the Sea south-southwest, through the Mountain Gorge Pass, and back to the Sea. */
export const SOUTHERN_RIVER_WAYPOINTS = [
  { x: 256.0, z: 330.0 },
  { x: 178.0, z: 352.0 },
  { x: 178.0, z: 404.0 },
  { x: 132.0, z: 475.0 },
  { x: 118.0, z: 545.0 },
  { x: 118.0, z: 655.0 },
  { x: 168.0, z: 735.0 },
  { x: 258.0, z: 785.0 },
] as const;

/**
 * Summary: Centerline waypoints for the western/central river branch splitting off the Southern River
 *          after passing the Mountain Gorge Ridge and flowing south of the extended mountain ridge
 *          into the vast Murky Swamp & Hippo Marshland at (-95, 785).
 */
export const SOUTHERN_RIVER_SWAMP_BRANCH_WAYPOINTS = [
  { x: 132.0, z: 678.0 },
  { x: 122.0, z: 748.0 },
  { x: 58.0, z: 772.0 },
  { x: -18.0, z: 784.0 },
  { x: -95.0, z: 790.0 },
] as const;

/** Summary: Secluded valley glade & traveler camp south of the Mountain Gorge Pass. */
export const SOUTHERN_PASS_VALLEY_POS = {
  x: 105.0,
  z: 715.0,
  height: 2.15,
  floorY: 2.15,
  radius: 22.0,
} as const;

/**
 * Summary: Ancient Dragon Citadel Ruins at the far end of the Southwest Desert,
 *          shielded by a towering desert mountain barrier with a narrow canyon pass.
 */
export const SOUTHERN_DRAGON_RUINS_POS = {
  x: -540.0,
  z: 540.0,
  height: 2.15,
  radius: 58.0,
} as const;

/**
 * Summary: Narrow desert-mountain canyon pass leading through the high mountain barrier
 *          into the Dragon Ruins basin at the far end of the Southwest Desert.
 */
export const DESERT_DRAGON_PASS_POS = {
  entryX: -405.0,
  entryZ: 405.0,
  gorgeX: -455.0,
  gorgeZ: 455.0,
  exitX: -498.0,
  exitZ: 492.0,
  halfWidth: 7.2,
  barrierRadius: 112.0,
} as const;

/** Summary: Grand 3-Arch Stone & Timber Bridge spanning East-West across the Southern River. */
export const SOUTHERN_RIVER_BRIDGE_POS = {
  x: 178.0,
  z: 378.0,
  minX: 154.0,
  maxX: 202.0,
  halfSpanX: 24.0,
  halfWidthZ: 3.1,
  baseY: 1.85,
  crownLift: 2.95,
} as const;

/** Summary: Remote southern river bend & basking lagoon where crocodiles live away from settlements. */
export const CROCODILE_RIVER_BEND_POS = {
  x: 132.0,
  z: 475.0,
  radius: 28.0,
} as const;

/**
 * Summary: Vast Murky Swamp & Hippo Marshland Biome south of the extended Mountain Ridge,
 *          fed by the Southern River fork branch and featuring 10 expansive hippo wallow lagoons,
 *          interwoven water channels, mossy peat hummocks, gnarled swamp cypress groves, fallen logs, and reed beds.
 */
export const MURKY_SWAMP_BIOME_POS = {
  x: -95.0,
  z: 790.0,
  innerRadius: 175.0,
  outerRadius: 235.0,
  waterY: 0.0,
} as const;

/**
 * Summary: Colossal Volcanic Mountain & Enterable Mystical CatLion Sanctum in the Western Badlands.
 * Design: Features 3 cardinal baffled obsidian entrance corridors (East +X, North -Z, South +Z)
 *         with chicane baffle walls blocking exterior line-of-sight, leading into a colossal vaulted
 *         subterranean magma boss chamber (`center: -620, 115`, `radius: 30.0m`, `diameter: 60.0m`)
 *         where the King CatLion sits on an ancient volcanic throne dais.
 */
export const VOLCANO_SANCTUM_POS = {
  x: -620.0,
  z: 115.0,
  floorY: 3.2,
  daisY: 3.65,
  craterRimY: 74.0,
  outerRadius: 105.0,
  chamberRadius: 30.0,
  facingYaw: Math.PI / 2, // Primary +X entrance facing East toward the central valley
  entranceX: -525.0,
  entranceZ: 115.0,
} as const;

/**
 * Summary: Monumental Ruined Atlantis Sunken Ring & Central Boss Arena Sanctuary in the Deep Eastern Ocean.
 * Design: Located ~715m East-Southeast of the Harbor Pier at (980, 420) beyond coastal visibility so the player
 *         must sail across the open sea following the Atlantean Wayfinder Compass to discover it.
 */
export const RUINED_ATLANTIS_POS = {
  x: 980.0,
  z: 420.0,
  outerRadius: 96.0,
  outerRingRadius: 68.0,
  lagoonRadius: 50.0,
  innerArenaRadius: 34.0,
  arenaFloorY: 2.15,
  outerRingY: 1.85,
  dockX: 886.0,
  dockZ: 420.0,
  dockY: 2.15,
} as const;

/**
 * Summary: Sailable 3-Masted Royal Explorer Flagship moored beside the Harbor Pier,
 *          equipped with a midships Animal & Mount Deck Stall and Atlantean Wayfinder Compass.
 */
export const SAILABLE_SHIP_INITIAL_POS = {
  id: 'sailable-ship',
  name: 'Royal Explorer Flagship',
  homeX: 278.0,
  homeZ: 282.0,
  homeYaw: -Math.PI / 2, // Facing East (+X) toward Ruined Atlantis
  deckY: 2.85,
  halfW: 4.5,
  halfL: 11.4,
} as const;

/**
 * Summary: Nordic Frost Giant Shrine & Geothermal Hot Springs Sanctuary in the North-West Snow Alpine region.
 * Design: Steaming turquoise geothermal spring pool surrounded by 8 glowing cyan-ice Nordic runestones,
 *         braziers, and a raised northern rune-altar dais that restores stamina to travelers.
 */
export const NORDIC_FROST_SHRINE_POS = {
  x: -320.0,
  z: -290.0,
  floorY: 18.5,
  poolWaterY: 18.25,
  poolFloorY: 17.65,
  altarDaisY: 19.45,
  poolRadius: 11.0,
  outerRadius: 34.0,
} as const;

/**
 * Summary: Ancient Pharaoh Stepped Sun Pyramid, Twin Obelisks & Sphinx Sanctuary in the Western Desert expanse.
 * Design: Monumental 5-tier stepped golden sandstone pyramid with a walkable eastern ceremonial ramp leading up
 *         to a golden Sun-Disc summit altar, flanked by twin hieroglyphic obelisks and a guardian sphinx.
 */
export const DESERT_PYRAMID_SANCTUARY_POS = {
  x: -475.0,
  z: 295.0,
  baseY: 2.35,
  topY: 16.35,
  halfBase: 22.0,
  topHalf: 5.5,
  rampMaxX: -449.0,
  rampHalfWidthZ: 3.6,
  sphinxX: -436.0,
  sphinxZ: 295.0,
} as const;

/**
 * Summary: Mid-Ocean Corsair Smuggler Cove & Sea Watchtower Island along the shipping lane between Harbor and Atlantis.
 * Design: Features a western timber docking jetty for the Royal Explorer Flagship, a stone-and-timber sea beacon
 *         watchtower, and smuggler supply caches.
 */
export const SMUGGLER_ISLAND_POS = {
  x: 540.0,
  z: 185.0,
  deckY: 2.25,
  radius: 32.0,
  dockX: 506.0,
  dockZ: 185.0,
  dockMinX: 498.0,
  dockMaxX: 516.0,
  dockHalfWidthZ: 3.4,
  towerX: 546.0,
  towerZ: 185.0,
  towerTopY: 12.65,
} as const;


/**
 * Summary: Cluster of 3 High-Altitude Large Floating Blooming Sky Islands in the Far Eastern Sky,
 *          dedicated habitat of the Royal Stag (`stag`) herd.
 */
export const FLOATING_BLOOMING_ISLANDS = [
  {
    id: 'floating-bloom-island-main',
    x: 760.0,
    z: -35.0,
    deckY: 68.0,
    radius: 28.0,
  },
  {
    id: 'floating-bloom-island-north',
    x: 760.0,
    z: -85.0,
    deckY: 71.0,
    radius: 18.0,
  },
  {
    id: 'floating-bloom-island-east',
    x: 807.0,
    z: -18.0,
    deckY: 70.0,
    radius: 18.0,
  },
  {
    id: 'floating-sky-galleon-dock',
    x: 802.0,
    z: 36.0,
    deckY: 72.0,
    radius: 18.5,
  },
  {
    id: 'floating-storm-citadel-island',
    x: 828.0,
    z: -88.0,
    deckY: 88.0,
    radius: 22.0,
  },
  {
    id: 'floating-phoenix-aerie-island',
    x: 734.0,
    z: 32.0,
    deckY: 76.0,
    radius: 19.5,
  },
  {
    id: 'floating-crown-zenith-island',
    x: 856.0,
    z: -52.0,
    deckY: 104.0,
    radius: 17.5,
  },
] as const;

/**
 * Summary: Under-Island Crystal Hollow carved inside the craggy underside of the Main Floating Sky Island (760, -35),
 *          with a cliffside descending stairway from the southern rim (y=68.0) down to the crystal cavern floor (y=54.0)
 *          and two suspended sky-lookout balconies.
 */
export const UNDER_ISLAND_CRYSTAL_HOLLOW_POS = {
  x: 760.0,
  z: -35.0,
  floorY: 54.0,
  ceilingY: 64.5,
  radius: 18.5,
  // Flight A: outside the south-west rim from (741.0, -14.5, y=68.0) down to mid-landing (751.0, -5.5, y=61.0)
  stairTopX: 741.0,
  stairTopZ: -14.5,
  stairMidX: 751.0,
  stairMidZ: -5.5,
  stairMidY: 61.0,
  // Flight B: from mid-landing (751.0, -5.5, y=61.0) north into the hollow portal (758.0, -17.5, y=54.0)
  stairBottomX: 758.0,
  stairBottomZ: -17.5,
  corridorHalfWidth: 2.8,
  // Two suspended sky-lookout balconies jutting out from the Crystal Hollow at y=54.0
  northBalconyMinZ: -60.0,
  northBalconyMaxZ: -52.0,
  northBalconyHalfW: 4.2,
  eastBalconyMinX: 777.0,
  eastBalconyMaxX: 785.0,
  eastBalconyHalfW: 4.2,
} as const;

/**
 * Summary: The Royal Sky Galleon ("ספינת האוויר המלכותית") moored off the eastern pier of the Sky Galleon Dock Island (802, 36, y=72.0).
 */
export const SKY_GALLEON_SHIP_POS = {
  x: 828.0,
  z: 36.0,
  mainDeckY: 72.6,
  quarterDeckY: 74.6,
  halfWidthX: 4.8,
  halfLengthZ: 14.5,
  quarterDeckMaxZ: 28.5,
  quarterStairMaxZ: 31.5,
  gangplankMinX: 818.0,
  gangplankMaxX: 823.6,
  gangplankHalfWidthZ: 2.2,
} as const;

export type SkyCloudKind = 'sinking' | 'golden' | 'bouncy' | 'storm' | 'drifting';

export interface ISkyWalkableCloud {
  readonly id: string;
  readonly kind: SkyCloudKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radiusX: number;
  readonly radiusZ: number;
  readonly driftToX?: number;
  readonly driftToZ?: number;
  readonly driftPeriod?: number;
  readonly bounceVy?: number;
}

export interface ISkyWalkableCloudRuntimeState {
  readonly id: string;
  readonly kind: SkyCloudKind;
  currentX: number;
  currentY: number;
  currentZ: number;
  vx: number;
  vz: number;
  sinkOffset: number;
  standingStillTime: number;
  dissolved: boolean;
  dissolvedTimer: number;
  stormWarning: boolean;
  stormStrike: boolean;
  playerOnCloud: boolean;
}

/**
 * Summary: 27 Walkable & Sinking Sky Clouds forming 4 aerial parkour trails out from the Main, North, and East Sky Islands
 *          to the Sky Galleon Dock, Phoenix Aerie, Storm Citadel, and Crown Zenith Island, plus 5 Safety-Net Rescue Clouds below.
 */
export const SKY_WALKABLE_CLOUDS: readonly ISkyWalkableCloud[] = [
  // Trail 1: Main Island SE (775, -13, y=68) -> Sky Galleon Dock Island (802, 36, y=72)
  { id: 'cloud-se-1', kind: 'sinking', x: 778.0, y: 68.6, z: -6.0, radiusX: 3.7, radiusZ: 3.7 },
  { id: 'cloud-se-2', kind: 'sinking', x: 781.5, y: 69.3, z: 1.0, radiusX: 3.7, radiusZ: 3.7 },
  { id: 'cloud-se-3', kind: 'golden', x: 785.0, y: 70.0, z: 8.0, radiusX: 4.1, radiusZ: 4.1 },
  { id: 'cloud-se-4', kind: 'sinking', x: 788.5, y: 70.8, z: 15.0, radiusX: 3.7, radiusZ: 3.7 },
  { id: 'cloud-se-5', kind: 'bouncy', x: 792.0, y: 71.4, z: 21.5, radiusX: 3.9, radiusZ: 3.9, bounceVy: 13.5 },

  // Trail 2: Main Island SW (748, -9, y=68) -> Celestial Phoenix Aerie Island (734, 32, y=76)
  { id: 'cloud-sw-1', kind: 'sinking', x: 745.5, y: 69.2, z: -2.5, radiusX: 3.7, radiusZ: 3.7 },
  {
    id: 'cloud-sw-2',
    kind: 'drifting',
    x: 742.5,
    y: 70.6,
    z: 4.5,
    radiusX: 3.9,
    radiusZ: 3.9,
    driftToX: 740.5,
    driftToZ: 6.5,
    driftPeriod: 7.0,
  },
  { id: 'cloud-sw-3', kind: 'golden', x: 739.5, y: 72.2, z: 11.5, radiusX: 4.1, radiusZ: 4.1 },
  { id: 'cloud-sw-4', kind: 'bouncy', x: 736.5, y: 73.8, z: 17.5, radiusX: 3.9, radiusZ: 3.9, bounceVy: 14.5 },

  // Trail 3A: North Island East (777, -85, y=71) -> Storm Citadel Island (828, -88, y=88)
  { id: 'cloud-ne-1', kind: 'sinking', x: 782.0, y: 72.8, z: -86.0, radiusX: 3.7, radiusZ: 3.7 },
  { id: 'cloud-ne-2', kind: 'storm', x: 788.5, y: 75.2, z: -87.0, radiusX: 3.8, radiusZ: 3.8 },
  { id: 'cloud-ne-3', kind: 'golden', x: 795.0, y: 78.0, z: -88.0, radiusX: 4.1, radiusZ: 4.1 },
  { id: 'cloud-ne-4', kind: 'sinking', x: 801.0, y: 81.5, z: -88.0, radiusX: 3.7, radiusZ: 3.7 },
  { id: 'cloud-ne-5', kind: 'bouncy', x: 806.5, y: 84.5, z: -88.0, radiusX: 3.9, radiusZ: 3.9, bounceVy: 16.5 },

  // Trail 3B: East Observatory Island North (809, -35, y=70) -> Storm Citadel Island South (824, -67, y=88)
  { id: 'cloud-e2n-1', kind: 'sinking', x: 812.0, y: 72.5, z: -41.5, radiusX: 3.7, radiusZ: 3.7 },
  { id: 'cloud-e2n-2', kind: 'bouncy', x: 815.5, y: 75.5, z: -48.5, radiusX: 3.9, radiusZ: 3.9, bounceVy: 16.0 },
  { id: 'cloud-e2n-3', kind: 'golden', x: 819.0, y: 80.5, z: -55.5, radiusX: 4.1, radiusZ: 4.1 },
  { id: 'cloud-e2n-4', kind: 'storm', x: 822.5, y: 84.5, z: -62.5, radiusX: 3.8, radiusZ: 3.8 },

  // Trail 4: Storm Citadel SE (844, -74, y=88) -> Crown Zenith Island (856, -52, y=104)
  { id: 'cloud-cz-1', kind: 'sinking', x: 846.0, y: 90.8, z: -72.0, radiusX: 3.7, radiusZ: 3.7 },
  { id: 'cloud-cz-2', kind: 'storm', x: 851.0, y: 94.0, z: -67.0, radiusX: 3.8, radiusZ: 3.8 },
  { id: 'cloud-cz-3', kind: 'golden', x: 855.0, y: 97.5, z: -61.5, radiusX: 4.1, radiusZ: 4.1 },
  { id: 'cloud-cz-4', kind: 'bouncy', x: 856.0, y: 100.8, z: -55.5, radiusX: 3.9, radiusZ: 3.9, bounceVy: 15.5 },

  // Trail 5: Western & North-Western Cloud-Sea Ring around the Sky-Metropolis & Astral Ascent (68.0m -> 71.0m)
  { id: 'cloud-ring-1', kind: 'sinking', x: 729.0, y: 68.4, z: -48.0, radiusX: 3.9, radiusZ: 3.9 },
  { id: 'cloud-ring-2', kind: 'golden', x: 724.0, y: 69.0, z: -57.0, radiusX: 4.3, radiusZ: 4.3 },
  {
    id: 'cloud-ring-3',
    kind: 'drifting',
    x: 729.0,
    y: 69.6,
    z: -66.0,
    radiusX: 4.0,
    radiusZ: 4.0,
    driftToX: 732.0,
    driftToZ: -68.5,
    driftPeriod: 6.5,
  },
  { id: 'cloud-ring-4', kind: 'sinking', x: 737.0, y: 70.3, z: -75.0, radiusX: 3.9, radiusZ: 3.9 },
  { id: 'cloud-ring-5', kind: 'bouncy', x: 744.0, y: 70.8, z: -82.0, radiusX: 4.1, radiusZ: 4.1, bounceVy: 14.5 },
  { id: 'cloud-ring-6', kind: 'sinking', x: 728.0, y: 68.4, z: -22.0, radiusX: 3.9, radiusZ: 3.9 },
  { id: 'cloud-ring-7', kind: 'golden', x: 725.0, y: 69.0, z: -12.0, radiusX: 4.3, radiusZ: 4.3 },
  { id: 'cloud-ring-8', kind: 'bouncy', x: 734.0, y: 69.6, z: -4.0, radiusX: 4.1, radiusZ: 4.1, bounceVy: 14.5 },

  // Safety-Net Rescue Clouds below the trails (catch falling players and launch them back up to the islands!)
  { id: 'cloud-rescue-se', kind: 'bouncy', x: 785.0, y: 56.0, z: 8.0, radiusX: 6.8, radiusZ: 6.8, bounceVy: 24.5 },
  { id: 'cloud-rescue-sw', kind: 'bouncy', x: 741.0, y: 56.0, z: 7.0, radiusX: 6.8, radiusZ: 6.8, bounceVy: 25.0 },
  { id: 'cloud-rescue-ne', kind: 'bouncy', x: 794.0, y: 60.0, z: -87.5, radiusX: 6.8, radiusZ: 6.8, bounceVy: 26.5 },
  { id: 'cloud-rescue-e2n', kind: 'bouncy', x: 817.0, y: 60.0, z: -52.0, radiusX: 6.8, radiusZ: 6.8, bounceVy: 26.5 },
  { id: 'cloud-rescue-cz', kind: 'bouncy', x: 851.0, y: 76.0, z: -66.0, radiusX: 6.8, radiusZ: 6.8, bounceVy: 27.5 },
] as const;

/**
 * Summary: Floating Golden Cloud-Runner Rings positioned above the 4 cloud trails for the Sky Ring-Run Challenge.
 */
export const SKY_RUNNER_RINGS: ReadonlyArray<{
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
}> = [
  { id: 'sky-ring-se-1', x: 779.8, y: 71.2, z: -2.5, yaw: 0.46 },
  { id: 'sky-ring-se-2', x: 785.0, y: 72.2, z: 8.0, yaw: 0.46 },
  { id: 'sky-ring-se-3', x: 790.2, y: 73.4, z: 18.2, yaw: 0.46 },
  { id: 'sky-ring-sw-1', x: 744.0, y: 72.0, z: 1.0, yaw: -0.42 },
  { id: 'sky-ring-sw-2', x: 739.5, y: 74.4, z: 11.5, yaw: -0.42 },
  { id: 'sky-ring-sw-3', x: 735.5, y: 76.8, z: 21.0, yaw: -0.42 },
  { id: 'sky-ring-ne-1', x: 785.2, y: 76.2, z: -86.5, yaw: 1.57 },
  { id: 'sky-ring-ne-2', x: 795.0, y: 80.2, z: -88.0, yaw: 1.57 },
  { id: 'sky-ring-ne-3', x: 804.0, y: 85.2, z: -88.0, yaw: 1.57 },
  { id: 'sky-ring-cz-1', x: 848.5, y: 94.5, z: -69.5, yaw: 0.78 },
  { id: 'sky-ring-cz-2', x: 855.0, y: 99.8, z: -61.5, yaw: 0.35 },
  { id: 'sky-ring-cz-3', x: 856.0, y: 104.5, z: -54.0, yaw: 0.0 },
] as const;

const skyCloudRuntimeStates: ISkyWalkableCloudRuntimeState[] = SKY_WALKABLE_CLOUDS.map((c) => ({
  id: c.id,
  kind: c.kind,
  currentX: c.x,
  currentY: c.y,
  currentZ: c.z,
  vx: 0,
  vz: 0,
  sinkOffset: 0,
  standingStillTime: 0,
  dissolved: false,
  dissolvedTimer: 0,
  stormWarning: false,
  stormStrike: false,
  playerOnCloud: false,
}));

export function getSkyWalkableCloudStates(): ReadonlyArray<ISkyWalkableCloudRuntimeState> {
  return skyCloudRuntimeStates;
}

export function resetSkyWalkableClouds(): void {
  for (let i = 0; i < SKY_WALKABLE_CLOUDS.length; i++) {
    const c = SKY_WALKABLE_CLOUDS[i];
    const st = skyCloudRuntimeStates[i];
    st.currentX = c.x;
    st.currentY = c.y;
    st.currentZ = c.z;
    st.vx = 0;
    st.vz = 0;
    st.sinkOffset = 0;
    st.standingStillTime = 0;
    st.dissolved = false;
    st.dissolvedTimer = 0;
    st.stormWarning = false;
    st.stormStrike = false;
    st.playerOnCloud = false;
  }
}

/**
 * Summary: Advances the sinking, reforming, drifting, and lightning cycle of all Walkable Sky Clouds.
 * Design:
 * - When the player stands on a `'sinking'` (or `'storm'` / `'drifting'`) cloud AND their horizontal speed is `< 1.25 m/s`,
 *   `standingStillTime` accumulates and `sinkOffset` lowers the cloud up to `2.2m`. After `1.25s` of standing still,
 *   the cloud dissolves (`dissolved = true` for `3.0s`), dropping the player through the cloud!
 * - When the player keeps walking/running (`horizSpeed >= 1.25 m/s`), `standingStillTime` decays and the cloud stays buoyant!
 */
export function stepSkyWalkableClouds(
  dt: number,
  elapsedTime: number,
  playerX: number,
  playerY: number,
  playerZ: number,
  playerVx: number,
  playerVz: number
): void {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const horizSpeed = Math.hypot(playerVx, playerVz);

  for (let i = 0; i < SKY_WALKABLE_CLOUDS.length; i++) {
    const def = SKY_WALKABLE_CLOUDS[i];
    const st = skyCloudRuntimeStates[i];

    // 1. Drifting cloud horizontal oscillation
    if (
      def.kind === 'drifting' &&
      def.driftToX !== undefined &&
      def.driftToZ !== undefined &&
      def.driftPeriod !== undefined &&
      def.driftPeriod > 0.1
    ) {
      const omega = (Math.PI * 2) / def.driftPeriod;
      const blend = 0.5 - 0.5 * Math.cos(elapsedTime * omega);
      const dBlendDt = 0.5 * omega * Math.sin(elapsedTime * omega);
      st.currentX = def.x + (def.driftToX - def.x) * blend;
      st.currentZ = def.z + (def.driftToZ - def.z) * blend;
      st.vx = (def.driftToX - def.x) * dBlendDt;
      st.vz = (def.driftToZ - def.z) * dBlendDt;
    } else {
      st.currentX = def.x;
      st.currentZ = def.z;
      st.vx = 0;
      st.vz = 0;
    }

    // 2. Storm cloud lightning warning & strike cycle
    if (def.kind === 'storm') {
      const cycle = (elapsedTime + i * 1.3) % 4.5;
      st.stormWarning = cycle >= 2.8 && cycle < 3.85;
      st.stormStrike = cycle >= 3.85 && cycle < 4.25;
    } else {
      st.stormWarning = false;
      st.stormStrike = false;
    }

    // 3. Dissolved recovery countdown
    if (st.dissolved) {
      st.playerOnCloud = false;
      st.dissolvedTimer = Math.max(0, st.dissolvedTimer - safeDt);
      if (st.dissolvedTimer <= 0) {
        st.dissolved = false;
        st.sinkOffset = 0;
        st.standingStillTime = 0;
      }
      st.currentY = def.y - st.sinkOffset;
      continue;
    }

    // 4. Check if player is currently standing on this cloud
    const nx = (playerX - st.currentX) / def.radiusX;
    const nz = (playerZ - st.currentZ) / def.radiusZ;
    const inFootprint = nx * nx + nz * nz <= 1.0;
    const surfaceY = def.y - st.sinkOffset;
    const onThisCloud = inFootprint && Math.abs(playerY - surfaceY) <= 1.75;
    st.playerOnCloud = onThisCloud;

    const canSink = def.kind === 'sinking' || def.kind === 'storm' || def.kind === 'drifting';
    const sinkThresholdSec = def.kind === 'sinking' ? 1.25 : 1.65;

    if (onThisCloud && canSink) {
      if (horizSpeed < 1.25) {
        // Standing still (or barely shuffling) -> cloud sinks rapidly and dissolves after sinkThresholdSec!
        st.standingStillTime += safeDt;
        const sinkFrac = Math.min(1, st.standingStillTime / sinkThresholdSec);
        st.sinkOffset = 0.22 + sinkFrac * 1.98;
        if (st.standingStillTime >= sinkThresholdSec) {
          st.dissolved = true;
          st.dissolvedTimer = 3.0;
        }
      } else {
        // Actively walking/running -> cloud stays buoyant with only a soft springy dip!
        st.standingStillTime = Math.max(0, st.standingStillTime - safeDt * 2.2);
        const targetOffset = 0.22 + (st.standingStillTime / sinkThresholdSec) * 0.6;
        st.sinkOffset += (targetOffset - st.sinkOffset) * Math.min(1, safeDt * 8.0);
      }
    } else {
      // Nobody standing on cloud -> smoothly recover back to full height
      st.standingStillTime = Math.max(0, st.standingStillTime - safeDt * 1.8);
      st.sinkOffset = Math.max(0, st.sinkOffset - safeDt * 1.4);
    }

    st.currentY = def.y - st.sinkOffset;
  }
}

/**
 * Summary: Evaluates if (x, z, currentY) rests on an active (non-dissolved) Walkable Sky Cloud.
 */
export function skyWalkableCloudHeightAt(
  x: number,
  z: number,
  currentY?: number
): { y: number; cloud: ISkyWalkableCloud; state: ISkyWalkableCloudRuntimeState } | null {
  for (let i = 0; i < SKY_WALKABLE_CLOUDS.length; i++) {
    const c = SKY_WALKABLE_CLOUDS[i];
    const st = skyCloudRuntimeStates[i];
    if (st.dissolved) continue;
    const nx = (x - st.currentX) / c.radiusX;
    const nz = (z - st.currentZ) / c.radiusZ;
    const distSq = nx * nx + nz * nz;
    if (distSq <= 1.0) {
      const crown = (1.0 - distSq) * 0.18;
      const targetY = st.currentY + crown;
      if (currentY === undefined || (currentY >= targetY - 4.2 && currentY <= targetY + 6.5)) {
        return { y: targetY, cloud: c, state: st };
      }
    }
  }
  return null;
}

/**
 * Summary: Central Sky-Waterfall & Spiraling Mini-Island Staircase ascending from the valley floor
 *          at (707, -35, y=3.4) around the central waterfall column (720, -35) up to the western rim
 *          of the Main Floating Blooming Island at (733, -35, y=68.0).
 */
export const FLOATING_ISLAND_STAIR_POS = {
  entryRampStartX: 697.5,
  footX: 707.0,
  topX: 733.0,
  z: -35.0,
  halfWidthZ: 3.8,
  footY: 3.4,
  topY: 68.0,
  waterfallX: 720.0,
  waterfallZ: -35.0,
  waterfallRadius: 3.4,
  spiralRadius: 13.5,
  turns: 2.5,
} as const;

export interface IFloatingWaterfallStepIsland {
  readonly index: number;
  readonly t: number;
  readonly angle: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly isRestLanding: boolean;
}

/**
 * Summary: 57 Floating Mini-Islands & Grand Rest-Landing Terraces spiraling upward (2.5 full revolutions)
 *          around the central Sky-Waterfall at (720, -35) like a grand helical staircase from y=3.4m to y=68.0m.
 *          Every 7th island (index % 7 === 0) is an extra-wide Rest-Landing Terrace with a Blossom Pergola.
 */
export const FLOATING_WATERFALL_STEP_ISLANDS: readonly IFloatingWaterfallStepIsland[] = Array.from(
  { length: 57 },
  (_, i) => {
    const t = i / 56;
    const angle = Math.PI + t * (FLOATING_ISLAND_STAIR_POS.turns * Math.PI * 2);
    const orbitR = 13.0 + 1.0 * Math.sin(t * Math.PI);
    const isRestLanding = i % 7 === 0;
    return {
      index: i,
      t,
      angle,
      x: FLOATING_ISLAND_STAIR_POS.waterfallX + Math.cos(angle) * orbitR,
      y:
        FLOATING_ISLAND_STAIR_POS.footY +
        t * (FLOATING_ISLAND_STAIR_POS.topY - FLOATING_ISLAND_STAIR_POS.footY),
      z: FLOATING_ISLAND_STAIR_POS.waterfallZ + Math.sin(angle) * orbitR,
      radius: isRestLanding ? 1.85 : 1.48,
      isRestLanding,
    };
  }
);

export interface ISkyWindGeyser {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly boostVy: number;
  readonly theme: 'sky' | 'volcano';
}

/**
 * Summary: Magical Celestial Wind-Ring & Thermal Updraft Geysers that launch the player high into
 *          the air when jumping on them, allowing aerial leaps across the Floating Sky Islands and Volcano.
 */
export const SKY_WIND_GEYSERS: readonly ISkyWindGeyser[] = [
  {
    id: 'geyser-waterfall-entry-plaza',
    x: 701.5,
    y: 3.3,
    z: -35.0,
    radius: 2.5,
    boostVy: 19.5,
    theme: 'sky',
  },
  {
    id: 'geyser-main-island-west',
    x: 738.0,
    y: 68.0,
    z: -35.0,
    radius: 2.5,
    boostVy: 19.5,
    theme: 'sky',
  },
  {
    id: 'geyser-main-island-north',
    x: 760.0,
    y: 68.0,
    z: -58.5,
    radius: 2.5,
    boostVy: 19.5,
    theme: 'sky',
  },
  {
    id: 'geyser-north-island-star',
    x: 760.0,
    y: 71.0,
    z: -85.0,
    radius: 2.6,
    boostVy: 20.5,
    theme: 'sky',
  },
  {
    id: 'geyser-east-island-sun',
    x: 807.0,
    y: 70.0,
    z: -18.0,
    radius: 2.6,
    boostVy: 20.5,
    theme: 'sky',
  },
  {
    id: 'geyser-under-island-hollow-elevator',
    x: 760.0,
    y: 54.0,
    z: -56.5,
    radius: 2.6,
    boostVy: 22.0,
    theme: 'sky',
  },
  {
    id: 'geyser-sky-galleon-dock',
    x: 802.0,
    y: 72.0,
    z: 36.0,
    radius: 2.6,
    boostVy: 20.5,
    theme: 'sky',
  },
  {
    id: 'geyser-storm-citadel-summit',
    x: 812.0,
    y: 88.0,
    z: -78.0,
    radius: 2.6,
    boostVy: 22.0,
    theme: 'sky',
  },
  {
    id: 'geyser-phoenix-aerie-summit',
    x: 720.0,
    y: 76.0,
    z: 26.0,
    radius: 2.6,
    boostVy: 21.0,
    theme: 'sky',
  },
  {
    id: 'geyser-crown-zenith-summit',
    x: 843.0,
    y: 104.0,
    z: -46.0,
    radius: 2.6,
    boostVy: 22.0,
    theme: 'sky',
  },
  {
    id: 'geyser-volcano-thermal-vent',
    x: -514.0,
    y: 3.25,
    z: 100.0,
    radius: 2.6,
    boostVy: 24.5,
    theme: 'volcano',
  },
] as const;

/**
 * Summary: Computes the walkable deck/bridge/spiral-mini-island/cloud/hollow/airship height on the Floating Blooming Sky Islands,
 *          or returns null if (x, z, currentY) is not on a floating island or cloud surface.
 */
export function floatingBloomingIslandHeightAt(
  x: number,
  z: number,
  currentY?: number
): number | null {
  const distFromWaterfall = Math.hypot(
    x - FLOATING_ISLAND_STAIR_POS.waterfallX,
    z - FLOATING_ISLAND_STAIR_POS.waterfallZ
  );

  // 0A. Under-Island Crystal Hollow (y = 54.0m) & Cliffside Descending Stairway (y = 68.0m -> 54.0m)
  const hPos = UNDER_ISLAND_CRYSTAL_HOLLOW_POS;
  // Flight A: (741.0, -14.5, y=68.0) -> (751.0, -5.5, y=61.0)
  const faDx = hPos.stairMidX - hPos.stairTopX;
  const faDz = hPos.stairMidZ - hPos.stairTopZ;
  const faLenSq = faDx * faDx + faDz * faDz;
  const rawFaT = ((x - hPos.stairTopX) * faDx + (z - hPos.stairTopZ) * faDz) / faLenSq;
  if (rawFaT >= -0.05 && rawFaT <= 1.05) {
    const faT = Math.max(0, Math.min(1, rawFaT));
    const px = hPos.stairTopX + faT * faDx;
    const pz = hPos.stairTopZ + faT * faDz;
    if (Math.hypot(x - px, z - pz) <= hPos.corridorHalfWidth) {
      const stairY = 68.0 + faT * (hPos.stairMidY - 68.0);
      if (currentY !== undefined && Math.abs(currentY - stairY) <= 4.5) {
        return stairY;
      }
      if (currentY === undefined && Math.hypot(x - hPos.x, z - hPos.z) > 28.0) {
        return stairY;
      }
    }
  }

  // Flight B: (751.0, -5.5, y=61.0) -> (758.0, -17.5, y=54.0)
  const fbDx = hPos.stairBottomX - hPos.stairMidX;
  const fbDz = hPos.stairBottomZ - hPos.stairMidZ;
  const fbLenSq = fbDx * fbDx + fbDz * fbDz;
  const rawFbT = ((x - hPos.stairMidX) * fbDx + (z - hPos.stairMidZ) * fbDz) / fbLenSq;
  if (rawFbT >= -0.05 && rawFbT <= 1.05) {
    const fbT = Math.max(0, Math.min(1, rawFbT));
    const px = hPos.stairMidX + fbT * fbDx;
    const pz = hPos.stairMidZ + fbT * fbDz;
    if (Math.hypot(x - px, z - pz) <= hPos.corridorHalfWidth) {
      const stairY = hPos.stairMidY + fbT * (hPos.floorY - hPos.stairMidY);
      if (currentY !== undefined && currentY <= 63.2 && currentY >= stairY - 4.5) {
        return stairY;
      }
      if (currentY === undefined && Math.hypot(x - hPos.x, z - hPos.z) > 28.0) {
        return stairY;
      }
    }
  }

  // Under-Island Crystal Hollow Chamber & 2 Suspended Lookout Balconies at y = 54.0m (active when currentY < 62.5m)
  if (currentY !== undefined && currentY < 62.5 && currentY >= hPos.floorY - 6.0) {
    const distHollow = Math.hypot(x - hPos.x, z - hPos.z);
    const inNorthBalcony =
      Math.abs(x - hPos.x) <= hPos.northBalconyHalfW &&
      z >= hPos.northBalconyMinZ &&
      z <= hPos.northBalconyMaxZ + 2.0;
    const inEastBalcony =
      Math.abs(z - hPos.z) <= hPos.eastBalconyHalfW &&
      x >= hPos.eastBalconyMinX - 2.0 &&
      x <= hPos.eastBalconyMaxX;
    if (distHollow <= hPos.radius || inNorthBalcony || inEastBalcony) {
      return hPos.floorY;
    }
  }

  // 0B. Royal Sky Galleon Moored Airship Deck & Boarding Gangplank at (828, 36, y = 72.6..74.6)
  const sg = SKY_GALLEON_SHIP_POS;
  if (
    x >= sg.gangplankMinX &&
    x <= sg.gangplankMaxX &&
    Math.abs(z - sg.z) <= sg.gangplankHalfWidthZ
  ) {
    const gpT = Math.max(0, Math.min(1, (x - sg.gangplankMinX) / (sg.gangplankMaxX - sg.gangplankMinX)));
    const gpY = 72.0 + gpT * (sg.mainDeckY - 72.0);
    if (currentY === undefined || currentY >= gpY - 6.0) {
      return gpY;
    }
  }
  if (
    Math.abs(x - sg.x) <= sg.halfWidthX &&
    Math.abs(z - sg.z) <= sg.halfLengthZ
  ) {
    let shipY: number = sg.mainDeckY;
    if (z <= sg.quarterDeckMaxZ) {
      shipY = sg.quarterDeckY;
    } else if (z <= sg.quarterStairMaxZ) {
      const stT = (sg.quarterStairMaxZ - z) / (sg.quarterStairMaxZ - sg.quarterDeckMaxZ);
      shipY = sg.mainDeckY + stT * (sg.quarterDeckY - sg.mainDeckY);
    }
    if (currentY === undefined || currentY >= sg.mainDeckY - 6.5) {
      return shipY;
    }
  }

  // 1. North Floral Stair-Bridge connecting Main Island (760, -61.2, y=68.0) to North Island (760, -68.2, y=71.0)
  //    Evaluated BEFORE flat island discs so the staircase rises smoothly from the Main deck to the North deck.
  const mainIslandX = FLOATING_BLOOMING_ISLANDS[0].x;
  if (Math.abs(x - mainIslandX) <= 3.3 && z >= -68.2 && z <= -61.2) {
    const t = Math.max(0, Math.min(1, (-61.2 - z) / 7.0));
    const bridgeY = 68.0 + t * (71.0 - 68.0);
    if (currentY === undefined || currentY >= bridgeY - 6.0) {
      return bridgeY;
    }
  }

  // 2. East Floral Stair-Bridge connecting Main Island rim (mainX+24.8, -25.63, y=68.0) to East Island rim (mainX+32.0, -22.91, y=70.0)
  //    Evaluated BEFORE flat island discs so the staircase rises smoothly from the Main deck to the East deck.
  const bx0 = mainIslandX + 24.8;
  const bz0 = -25.63;
  const bx1 = mainIslandX + 32.0;
  const bz1 = -22.91;
  const bdx = bx1 - bx0;
  const bdz = bz1 - bz0;
  const bLenSq = bdx * bdx + bdz * bdz;
  const rawBt = ((x - bx0) * bdx + (z - bz0) * bdz) / bLenSq;
  if (rawBt >= -0.04 && rawBt <= 1.04) {
    const bt = Math.max(0, Math.min(1, rawBt));
    const projX = bx0 + bt * bdx;
    const projZ = bz0 + bt * bdz;
    if (Math.hypot(x - projX, z - projZ) <= 3.2) {
      const bridgeY = 68.0 + bt * (70.0 - 68.0);
      if (currentY === undefined || currentY >= bridgeY - 6.0) {
        return bridgeY;
      }
    }
  }

  // 3. Check all 7 High-Altitude Large Floating Blooming Island circular decks (y = 68m..104m)
  for (let i = 0; i < FLOATING_BLOOMING_ISLANDS.length; i++) {
    const isl = FLOATING_BLOOMING_ISLANDS[i];
    const d = Math.hypot(x - isl.x, z - isl.z);
    if (d <= isl.radius) {
      // Do not prematurely snap to the Main Island deck (68.0m) while the player is still climbing
      // the upper quarter-turn of the spiral waterfall staircase (distFromWaterfall <= 19.5 && currentY < 67.55m).
      if (
        i === 0 &&
        distFromWaterfall <= 19.5 &&
        currentY !== undefined &&
        currentY < FLOATING_ISLAND_STAIR_POS.topY - 0.45
      ) {
        continue;
      }
      const centerCrown = d < isl.radius * 0.65 ? (1.0 - d / (isl.radius * 0.65)) * 0.35 : 0.0;
      const targetY = isl.deckY + centerCrown;
      if (currentY === undefined || currentY >= isl.deckY - 8.5) {
        return targetY;
      }
    }
  }

  // 3B. Check all Walkable & Sinking Sky Clouds (sinking, golden, bouncy, storm, drifting)
  const cloudHit = skyWalkableCloudHeightAt(x, z, currentY);
  if (cloudHit !== null) {
    return cloudHit.y;
  }

  // 4. Upper Waterfall Aqueduct Ledge connecting the central waterfall top (165, -35) to Main Island rim (178, -35) at y=68.0
  if (
    x >= FLOATING_ISLAND_STAIR_POS.waterfallX - 0.5 &&
    x <= FLOATING_ISLAND_STAIR_POS.topX + 0.8 &&
    Math.abs(z - FLOATING_ISLAND_STAIR_POS.waterfallZ) <= 4.0 &&
    (currentY === undefined ||
      currentY >= FLOATING_ISLAND_STAIR_POS.topY - 0.45 ||
      (distFromWaterfall <= 8.5 && currentY >= FLOATING_ISLAND_STAIR_POS.topY - 5.8))
  ) {
    return FLOATING_ISLAND_STAIR_POS.topY;
  }

  // 5. Spiraling Floating Mini-Islands & Grand Rest-Landing Terraces winding upward around the Central Sky-Waterfall (165, -35)
  //    Evaluates horizontal distance `d` on the active spiral revolution and interpolates along the continuous polar helix
  //    so walking up the spiral staircase never snags on a clamped segment endpoint!
  if (distFromWaterfall <= 19.5) {
    let bestSegIdx = -1;
    let bestHorizDist = Infinity;
    for (let i = 0; i < FLOATING_WATERFALL_STEP_ISLANDS.length - 1; i++) {
      const a = FLOATING_WATERFALL_STEP_ISLANDS[i];
      const b = FLOATING_WATERFALL_STEP_ISLANDS[i + 1];
      const sdx = b.x - a.x;
      const sdz = b.z - a.z;
      const sLenSq = sdx * sdx + sdz * sdz;
      const u = sLenSq > 1e-6 ? Math.max(0, Math.min(1, ((x - a.x) * sdx + (z - a.z) * sdz) / sLenSq)) : 0;
      const px = a.x + u * sdx;
      const pz = a.z + u * sdz;
      const d = Math.hypot(x - px, z - pz);
      const corridorRadius = 4.05;
      if (d <= corridorRadius) {
        const candY = a.y + u * (b.y - a.y);
        // Adjacent revolutions of the 2.5-turn spiral are ~25.84m apart vertically, so a [-6m, +9m] window
        // uniquely isolates the player's current revolution while allowing horizontal distance `d` to pick
        // the exact active segment without sticking to the previous island's clamped endpoint.
        if (currentY === undefined || (currentY >= candY - 6.0 && currentY <= candY + 9.0)) {
          if (d < bestHorizDist) {
            bestHorizDist = d;
            bestSegIdx = i;
          }
        }
      }
    }
    if (bestSegIdx >= 0) {
      const a = FLOATING_WATERFALL_STEP_ISLANDS[bestSegIdx];
      const rawAngle = Math.atan2(
        z - FLOATING_ISLAND_STAIR_POS.waterfallZ,
        x - FLOATING_ISLAND_STAIR_POS.waterfallX
      );
      const deltaAngle = Math.atan2(
        Math.sin(rawAngle - a.angle),
        Math.cos(rawAngle - a.angle)
      );
      const continuousAngle = a.angle + deltaAngle;
      const totalSpanRad = FLOATING_ISLAND_STAIR_POS.turns * Math.PI * 2;
      const continuousT = Math.max(0, Math.min(1, (continuousAngle - Math.PI) / totalSpanRad));
      return (
        FLOATING_ISLAND_STAIR_POS.footY +
        continuousT * (FLOATING_ISLAND_STAIR_POS.topY - FLOATING_ISLAND_STAIR_POS.footY)
      );
    }
  }

  // 6. Ground-Level Marble Entry Plaza & Approach Ramp leading onto Mini-Island #0 at (707, -35, y=3.4)
  if (
    x >= FLOATING_ISLAND_STAIR_POS.entryRampStartX &&
    x <= FLOATING_ISLAND_STAIR_POS.footX + 0.6 &&
    Math.abs(z - FLOATING_ISLAND_STAIR_POS.waterfallZ) <= 4.0 &&
    (currentY === undefined || currentY <= FLOATING_ISLAND_STAIR_POS.footY + 4.5)
  ) {
    const rampT = Math.max(
      0,
      Math.min(
        1,
        (x - FLOATING_ISLAND_STAIR_POS.entryRampStartX) /
          (FLOATING_ISLAND_STAIR_POS.footX - FLOATING_ISLAND_STAIR_POS.entryRampStartX)
      )
    );
    return 3.18 + rampT * (FLOATING_ISLAND_STAIR_POS.footY - 3.18);
  }

  // 7. Gentle Western Shoreline Landing Steps leading from sea level (x = 681.0, y = 1.15) up to the Entry Plaza (x = 697.5, y = 3.18)
  if (
    x >= FLOATING_ISLAND_STAIR_POS.entryRampStartX - 16.5 &&
    x < FLOATING_ISLAND_STAIR_POS.entryRampStartX &&
    Math.abs(z - FLOATING_ISLAND_STAIR_POS.waterfallZ) <= 4.5 &&
    (currentY === undefined || currentY <= FLOATING_ISLAND_STAIR_POS.footY + 4.5)
  ) {
    const shoreT = Math.max(
      0,
      Math.min(1, (x - (FLOATING_ISLAND_STAIR_POS.entryRampStartX - 16.5)) / 16.5)
    );
    return 1.15 + shoreT * (3.18 - 1.15);
  }

  return null;
}

/**
 * Summary: Computes the walkable arched deck elevation along the Grand Southern River Bridge.
 */
export function southernRiverBridgeHeightAt(x: number): number {
  const normX = Math.max(
    -1,
    Math.min(1, (x - SOUTHERN_RIVER_BRIDGE_POS.x) / SOUTHERN_RIVER_BRIDGE_POS.halfSpanX)
  );
  return (
    SOUTHERN_RIVER_BRIDGE_POS.baseY +
    (1.0 - normX * normX) * SOUTHERN_RIVER_BRIDGE_POS.crownLift
  );
}

/**
 * Summary: Computes the walkable stepped-tier or eastern ceremonial stair ramp height on the Ancient Desert Sun Pyramid,
 *          or returns null if (x, z) is outside the pyramid & stair footprint.
 */
export function desertPyramidHeightAt(
  x: number,
  z: number,
  currentY?: number
): number | null {
  const px = DESERT_PYRAMID_SANCTUARY_POS.x;
  const pz = DESERT_PYRAMID_SANCTUARY_POS.z;
  const dx = x - px;
  const dz = z - pz;
  const absX = Math.abs(dx);
  const absZ = Math.abs(dz);

  // 1. Eastern Ceremonial Stair Ramp (dx from +5.5 out to +26.0, |dz| <= 3.6) ascending smoothly from baseY (2.35) to topY (16.35)
  const rampStartDx = DESERT_PYRAMID_SANCTUARY_POS.topHalf; // 5.5
  const rampEndDx = DESERT_PYRAMID_SANCTUARY_POS.rampMaxX - px; // 26.0
  if (dx >= rampStartDx && dx <= rampEndDx && absZ <= DESERT_PYRAMID_SANCTUARY_POS.rampHalfWidthZ) {
    const t = Math.max(0, Math.min(1, (rampEndDx - dx) / (rampEndDx - rampStartDx)));
    const rampY =
      DESERT_PYRAMID_SANCTUARY_POS.baseY +
      t * (DESERT_PYRAMID_SANCTUARY_POS.topY - DESERT_PYRAMID_SANCTUARY_POS.baseY);
    if (currentY === undefined || currentY >= rampY - 3.5) {
      return rampY;
    }
  }

  // 2. 5-Tier Stepped Golden Sandstone Pyramid footprint (|dx| <= 22.0, |dz| <= 22.0)
  const maxCoord = Math.max(absX, absZ);
  if (maxCoord <= DESERT_PYRAMID_SANCTUARY_POS.halfBase) {
    if (maxCoord <= DESERT_PYRAMID_SANCTUARY_POS.topHalf) {
      return DESERT_PYRAMID_SANCTUARY_POS.topY;
    }
    // 5 stepped tiers between halfBase (22.0) and topHalf (5.5): each tier is 3.3m wide horizontally and 2.8m tall
    const norm = (DESERT_PYRAMID_SANCTUARY_POS.halfBase - maxCoord) /
      (DESERT_PYRAMID_SANCTUARY_POS.halfBase - DESERT_PYRAMID_SANCTUARY_POS.topHalf);
    const tierIndex = Math.min(4, Math.floor(norm * 5));
    return DESERT_PYRAMID_SANCTUARY_POS.baseY + (tierIndex + 1) * 2.8;
  }

  return null;
}
// #endregion

// ======================== SPATIAL UTILITIES ======================== \\
// #region Spatial Utilities
/**
 * Summary: Tests whether a 2D coordinate is within a given horizontal viewing radius.
 * Design: Compares squared 2D Euclidean distance to avoid Math.sqrt computation.
 * @param objX Object X coordinate.
 * @param objZ Object Z coordinate.
 * @param playerX Observer X coordinate.
 * @param playerZ Observer Z coordinate.
 * @param margin Buffer distance added to maximum view threshold (default 0).
 * @param maxDist Base view distance cap (default VIEW_DISTANCE).
 * @returns True when object lies within the view radius.
 */
export function isWithinViewDistance(
  objX: number,
  objZ: number,
  playerX: number,
  playerZ: number,
  margin = 0,
  maxDist = VIEW_DISTANCE
): boolean {
  const dx = objX - playerX;
  const dz = objZ - playerZ;
  const limit = maxDist + margin;
  return dx * dx + dz * dz <= limit * limit;
}
// #endregion
