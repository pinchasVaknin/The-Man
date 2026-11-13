// ============================================================================
// MODULE: World / Domain / Landmarks / Ancient Mine
// DESIGN: Pure data. Every walkable surface is a footprint plus a height profile, grouped in
//         layers so stacked floors (a balcony above a bridge) resolve by the asker's height.
// SUMMARY: Single source of truth for the Ancient Dwarven Mine layout: areas, floor surfaces,
//          stairs, the abyss, lava stepping stones, statues, water and guard rails.
//          Holds no geometry, physics or rendering; ancientMineFloor.ts answers queries on it.
// ============================================================================

// ======================== CONSTANTS & TYPES ======================== \\
// #region Coordinate Frame
/**
 * Summary: Local frame origin in world space. lx = worldX - ORIGIN_X, lz = worldZ - ORIGIN_Z.
 * Design: Same origin as the previous mine so the mountain portal and the road keep their place.
 *         +lz runs south, deeper into the mountain; +lx runs east.
 */
export const ANCIENT_MINE_ORIGIN = { x: -58.0, z: 420.0 } as const;

/** Summary: World Y of every named floor level, in meters. */
export const MINE_LEVEL_Y = {
  entrance: 2.65,
  overlook: 1.45,
  upperCavern: -9.35,
  galleryPlatform: -5.55,
  galleryPit: -13.35,
  waterChannelBed: -9.85,
  lagoonBed: -12.35,
  lagoonWater: -9.95,
  channelWater: -9.45,
  descentLanding1: -19.35,
  descentLanding2: -29.35,
  chasmLedge: -39.35,
  heroesMidLanding: -34.35,
  kingBalcony: -29.35,
  forgeFloor: -51.35,
  lavaSurface: -52.6,
  lavaBed: -53.6,
  treasureIsland: -49.95,
  abyssBottom: -130.0,
} as const;
// #endregion

// #region Surface Types
export type IMineAreaId =
  | 'entrance'
  | 'upperCavern'
  | 'lagoon'
  | 'galleries'
  | 'foundry'
  | 'descent'
  | 'chasm'
  | 'heroesPath'
  | 'bridge'
  | 'kingBalcony'
  | 'golemChamber'
  | 'ancientPassage'
  | 'dragonForge';

/** Summary: What the player stands in. Abyss and lava are hazards; water is swimmable. */
export type IMineMaterial = 'stone' | 'wood' | 'water' | 'lava' | 'abyss';

export type IMineFootprint =
  | { readonly kind: 'rect'; readonly minLx: number; readonly maxLx: number; readonly minLz: number; readonly maxLz: number }
  | { readonly kind: 'circle'; readonly lx: number; readonly lz: number; readonly r: number }
  | { readonly kind: 'ellipse'; readonly lx: number; readonly lz: number; readonly rx: number; readonly rz: number }
  | { readonly kind: 'polygon'; readonly points: readonly (readonly [number, number])[] };

/**
 * Summary: Height of a surface across its footprint.
 * Design: Stairs are quantized into equal steps between `from` and `to` along one axis, so a test
 *         can check every rise against the player's step-up limit.
 */
export type IMineHeightProfile =
  | { readonly kind: 'flat'; readonly y: number }
  | {
      readonly kind: 'stairs';
      readonly axis: 'lx' | 'lz';
      readonly from: number;
      readonly to: number;
      readonly yFrom: number;
      readonly yTo: number;
      readonly stepCount: number;
    };

/** Summary: A raised ceiling region, centred on a local point. */
export interface IMineCeilingDome {
  readonly lx: number;
  readonly lz: number;
  readonly radius: number;
  readonly peakY: number;
}

/** Summary: Height step of dome ceilings, in meters. */
export const CEILING_TERRACE_STEP = 0.5;

/**
 * Summary: One walkable (or hazardous) surface of the mine.
 * Design: Within a layer the LAST covering surface in MINE_SURFACES wins, so carve-outs (lagoon
 *         basin, abyss, bridge over abyss) are listed after the floor they cut. Different layers
 *         are stacked floors; the query picks the one under the asker's feet.
 */
export interface IMineSurface {
  readonly id: string;
  readonly area: IMineAreaId;
  readonly layer: 0 | 1;
  readonly footprint: IMineFootprint;
  readonly height: IMineHeightProfile;
  readonly material: IMineMaterial;
  /** Summary: World Y of the rock ceiling above this surface, in meters (at the dome edge, if any). */
  readonly ceilingY: number;
  /**
   * Summary: Optional dome that raises the ceiling toward a peak, following the mountain above.
   * Design: ceiling = ceilingY + (peakY - ceilingY) * max(0, 1 - (d / radius)^2), quantized to
   *         CEILING_TERRACE_STEP so the greybox merges it into terraces.
   */
  readonly ceilingDome?: IMineCeilingDome;
  /** Summary: World Y of the water surface, only for material 'water'. */
  readonly waterSurfaceY?: number;
}
// #endregion

// ======================== PUBLIC LAYOUT DATA ======================== \\
// #region Upper Cavern Outline
/**
 * Summary: Irregular outline of the single open upper cavern (hall, lagoon, galleries, foundry).
 * Design: One polygon on purpose: the zones blend into each other without walls (user request).
 *         The gap at lx -8..8 on the south edge is the mouth of the Grand Descent.
 */
export const UPPER_CAVERN_OUTLINE: readonly (readonly [number, number])[] = [
  [-20, 20], [20, 20], [45, 24], [70, 22], [100, 28], [118, 45], [122, 75], [118, 100],
  [122, 125], [108, 142], [80, 144], [55, 136], [35, 125], [8, 122], [-8, 122], [-30, 125],
  [-55, 129], [-78, 125], [-98, 112], [-108, 90], [-110, 60], [-102, 38], [-80, 26], [-50, 22],
];
// #endregion

// #region Points Of Interest
/** Summary: Named spots used by builders, spawns and the walkability tests. Local (lx, lz). */
export const MINE_POI = {
  gate: { lx: 0, lz: 2 },
  overlookBalcony: { lx: 0, lz: 17 },
  turntable: { lx: 0, lz: 80 },
  restArea: { lx: -35, lz: 102 },
  crane: { lx: 26, lz: 58 },
  lagoonCentre: { lx: -80, lz: 72 },
  lagoonShore: { lx: -55, lz: 72 },
  waterfallFoot: { lx: -104, lz: 70 },
  waterWheel: { lx: -80, lz: 116 },
  waterfallAlcove: { lx: -113, lz: 70 },
  channelBridge: { lx: -80, lz: 108 },
  galleryPlatform: { lx: 102, lz: 42 },
  galleryPit: { lx: 70, lz: 60 },
  stoneCrusher: { lx: 92, lz: 82 },
  foundry: { lx: 88, lz: 122 },
  descentLanding1: { lx: 0, lz: 142 },
  descentLanding2: { lx: 0, lz: 168 },
  chasmLedge: { lx: 0, lz: 198 },
  bridgeMid: { lx: 0, lz: 253 },
  heroesPathLower: { lx: -102, lz: 215 },
  heroesPathMid: { lx: -102, lz: 252 },
  kingBalcony: { lx: 0, lz: 298 },
  golemChamber: { lx: -14, lz: 334 },
  golem: { lx: 0, lz: 340 },
  passageTop: { lx: 0, lz: 356 },
  forgeEntrance: { lx: 0, lz: 390 },
  treasureChest: { lx: 0, lz: 432 },
  dragonMouth: { lx: 0, lz: 452 },
} as const;
// #endregion

// #region Lava Stepping Stones
/**
 * Summary: Stone platforms across the forge lava pool, north shore to the treasure island.
 * Design: Edge gaps of about 1.8 m and rises of at most 0.4 m keep every jump inside a walking
 *         jump (about 3.8 m reach at +0.5 m); the spec test checks this against the physics numbers.
 */
export const LAVA_STEPPING_STONES: readonly { readonly lx: number; readonly lz: number; readonly r: number; readonly topY: number }[] = [
  { lx: -1.5, lz: 399.4, r: 1.7, topY: -51.15 },
  { lx: 1.5, lz: 403.6, r: 1.7, topY: -50.95 },
  { lx: -1.5, lz: 407.8, r: 1.7, topY: -50.75 },
  { lx: 1.5, lz: 412.0, r: 1.7, topY: -50.55 },
  { lx: -1.5, lz: 416.2, r: 1.7, topY: -50.35 },
  { lx: 1.5, lz: 420.4, r: 1.7, topY: -50.35 },
  { lx: -1.5, lz: 424.6, r: 1.7, topY: -50.35 },
];

/** Summary: Raised island holding the treasure chest, at the far end of the stepping stones. */
export const TREASURE_ISLAND = { lx: 0, lz: 432.0, r: 4.5, topY: MINE_LEVEL_Y.treasureIsland } as const;

/** Summary: The lava pool in front of the dragon head. Falling in sends the player to MINE_POI.forgeEntrance. */
export const LAVA_POOL = { minLx: -30, maxLx: 30, minLz: 396, maxLz: 446 } as const;
// #endregion

// #region Open Edges
/**
 * Summary: Floor edges that open to the outside world, where no rock wall may be drawn.
 * Design: Same line convention as the guard rails: the line `axis = at`, spanning from..to.
 */
export const MINE_OPEN_EDGES: readonly { readonly id: string; readonly axis: 'lx' | 'lz'; readonly at: number; readonly from: number; readonly to: number }[] = [
  { id: 'gate-mouth', axis: 'lz', at: -2, from: -7, to: 7 },
];
// #endregion

// #region Solid Fixtures
/**
 * Summary: Large standing objects the player must walk around, as axis-aligned boxes.
 * Design: One table feeds both the placeholder meshes and the colliders, so they cannot drift.
 */
export const MINE_SOLID_FIXTURES: readonly {
  readonly id: string;
  readonly lx: number;
  readonly lz: number;
  readonly halfX: number;
  readonly halfZ: number;
  readonly baseY: number;
  readonly height: number;
  /** Summary: Placeholder look, or 'custom' when a set-piece builder draws this fixture itself. */
  readonly look: 'stone' | 'darkStone' | 'iron' | 'wood' | 'gold' | 'custom';
}[] = [
  { id: 'golem-body', lx: MINE_POI.golem.lx, lz: MINE_POI.golem.lz, halfX: 4.4, halfZ: 2.4, baseY: MINE_LEVEL_Y.chasmLedge, height: 10.5, look: 'custom' },
  { id: 'crane-mast', lx: MINE_POI.crane.lx, lz: MINE_POI.crane.lz, halfX: 0.6, halfZ: 0.6, baseY: MINE_LEVEL_Y.upperCavern, height: 14.0, look: 'custom' },
  { id: 'stone-crusher', lx: MINE_POI.stoneCrusher.lx, lz: MINE_POI.stoneCrusher.lz, halfX: 2.5, halfZ: 2.0, baseY: MINE_LEVEL_Y.upperCavern, height: 4.0, look: 'custom' },
  { id: 'furnace-west', lx: 72, lz: 138, halfX: 3.0, halfZ: 2.5, baseY: MINE_LEVEL_Y.upperCavern, height: 7.0, look: 'custom' },
  { id: 'furnace-middle', lx: 90, lz: 138, halfX: 3.0, halfZ: 2.5, baseY: MINE_LEVEL_Y.upperCavern, height: 7.0, look: 'custom' },
  { id: 'furnace-east', lx: 108, lz: 138, halfX: 3.0, halfZ: 2.5, baseY: MINE_LEVEL_Y.upperCavern, height: 7.0, look: 'custom' },
  // Portal: two carved pillars beside the gate mouth and the two gate leaves folded open against the face.
  { id: 'portal-pillar-west', lx: -8.6, lz: -1.2, halfX: 1.6, halfZ: 1.0, baseY: MINE_LEVEL_Y.entrance, height: 9.5, look: 'custom' },
  { id: 'portal-pillar-east', lx: 8.6, lz: -1.2, halfX: 1.6, halfZ: 1.0, baseY: MINE_LEVEL_Y.entrance, height: 9.5, look: 'custom' },
  { id: 'gate-leaf-west', lx: -13.8, lz: -2.5, halfX: 3.6, halfZ: 0.2, baseY: MINE_LEVEL_Y.entrance, height: 6.2, look: 'custom' },
  { id: 'gate-leaf-east', lx: 13.8, lz: -2.5, halfX: 3.6, halfZ: 0.2, baseY: MINE_LEVEL_Y.entrance, height: 6.2, look: 'custom' },
  // Waterworks: wheel turning in the channel, its gearbox and the stamp mill it drives.
  { id: 'water-wheel', lx: MINE_POI.waterWheel.lx, lz: MINE_POI.waterWheel.lz, halfX: 2.9, halfZ: 3.4, baseY: MINE_LEVEL_Y.waterChannelBed, height: 7.0, look: 'custom' },
  { id: 'wheel-gearbox', lx: -75.2, lz: 116, halfX: 1.0, halfZ: 1.0, baseY: MINE_LEVEL_Y.upperCavern, height: 3.2, look: 'custom' },
  { id: 'stamp-mill', lx: -70.5, lz: 116, halfX: 2.0, halfZ: 1.6, baseY: MINE_LEVEL_Y.upperCavern, height: 5.0, look: 'custom' },
  // Galleries: posts of the ore lift above the pit.
  { id: 'ore-lift-post-west', lx: 60, lz: 47, halfX: 0.35, halfZ: 0.35, baseY: MINE_LEVEL_Y.upperCavern, height: 8.0, look: 'wood' },
  { id: 'ore-lift-post-east', lx: 78, lz: 47, halfX: 0.35, halfZ: 0.35, baseY: MINE_LEVEL_Y.upperCavern, height: 8.0, look: 'wood' },
  // Foundry: gantry crane posts.
  { id: 'gantry-post-west', lx: 64, lz: 131, halfX: 0.4, halfZ: 0.4, baseY: MINE_LEVEL_Y.upperCavern, height: 7.0, look: 'iron' },
  { id: 'gantry-post-east', lx: 115, lz: 131, halfX: 0.4, halfZ: 0.4, baseY: MINE_LEVEL_Y.upperCavern, height: 7.0, look: 'iron' },
  // Grand Descent: carved pillars at the outer corners of both landings, rising to the cavern roof.
  { id: 'descent-pillar-1-west', lx: -15.2, lz: 145.6, halfX: 0.8, halfZ: 0.8, baseY: MINE_LEVEL_Y.descentLanding1, height: 15.0, look: 'custom' },
  { id: 'descent-pillar-1-east', lx: 15.2, lz: 145.6, halfX: 0.8, halfZ: 0.8, baseY: MINE_LEVEL_Y.descentLanding1, height: 15.0, look: 'custom' },
  { id: 'descent-pillar-2-west', lx: -15.2, lz: 171.2, halfX: 0.8, halfZ: 0.8, baseY: MINE_LEVEL_Y.descentLanding2, height: 25.0, look: 'custom' },
  { id: 'descent-pillar-2-east', lx: 15.2, lz: 171.2, halfX: 0.8, halfZ: 0.8, baseY: MINE_LEVEL_Y.descentLanding2, height: 25.0, look: 'custom' },
  { id: 'treasure-chest', lx: MINE_POI.treasureChest.lx, lz: MINE_POI.treasureChest.lz, halfX: 1.1, halfZ: 0.7, baseY: MINE_LEVEL_Y.treasureIsland, height: 1.3, look: 'custom' },
];
// #endregion

// #region Hero Statues
/**
 * Summary: Legendary dwarves carved into the abyss walls, rising from the depths.
 * Design: Plinths start below the fog line so the statues read as growing out of the abyss.
 *         Water pours between them from the aqueducts behind (see MINE_WATERFALLS).
 */
export const HERO_STATUES: readonly {
  readonly id: string;
  readonly lx: number;
  readonly lz: number;
  readonly facing: 'east' | 'west' | 'north';
  readonly pose: 'axeWarrior' | 'hammerKing' | 'shieldGuardian' | 'ancientMiner' | 'firstKing';
  readonly baseY: number;
  readonly height: number;
}[] = [
  { id: 'hero-west-1', lx: -88, lz: 228, facing: 'east', pose: 'axeWarrior', baseY: -60, height: 48 },
  { id: 'hero-west-2', lx: -88, lz: 254, facing: 'east', pose: 'shieldGuardian', baseY: -60, height: 48 },
  { id: 'hero-west-3', lx: -88, lz: 280, facing: 'east', pose: 'ancientMiner', baseY: -60, height: 48 },
  { id: 'hero-east-1', lx: 88, lz: 228, facing: 'west', pose: 'hammerKing', baseY: -60, height: 48 },
  { id: 'hero-east-2', lx: 88, lz: 254, facing: 'west', pose: 'axeWarrior', baseY: -60, height: 48 },
  { id: 'hero-east-3', lx: 88, lz: 280, facing: 'west', pose: 'shieldGuardian', baseY: -60, height: 48 },
  { id: 'first-king', lx: 0, lz: 309, facing: 'north', pose: 'firstKing', baseY: MINE_LEVEL_Y.kingBalcony, height: 24 },
];
// #endregion

// #region Water System
/**
 * Summary: Every visible waterfall, in flow order from the source to the abyss.
 * Design: One continuous system: cliff fall -> lagoon -> channel -> wheel -> aqueducts in the
 *         chasm walls -> falls between the hero statues and from the north wall into the abyss.
 */
export const MINE_WATERFALLS: readonly {
  readonly id: string;
  readonly lx: number;
  readonly lz: number;
  readonly topY: number;
  readonly bottomY: number;
  readonly width: number;
}[] = [
  { id: 'lagoon-cliff-fall', lx: -106, lz: 70, topY: -1.5, bottomY: MINE_LEVEL_Y.lagoonWater, width: 7 },
  { id: 'chasm-north-fall', lx: 84, lz: 190, topY: -14, bottomY: MINE_LEVEL_Y.abyssBottom, width: 4 },
  { id: 'heroes-west-fall-0', lx: -95, lz: 215, topY: -24, bottomY: MINE_LEVEL_Y.abyssBottom, width: 3 },
  { id: 'heroes-east-fall-0', lx: 95, lz: 215, topY: -24, bottomY: MINE_LEVEL_Y.abyssBottom, width: 3 },
  { id: 'heroes-west-fall-3', lx: -95, lz: 290, topY: -24, bottomY: MINE_LEVEL_Y.abyssBottom, width: 3 },
  { id: 'heroes-east-fall-3', lx: 95, lz: 290, topY: -24, bottomY: MINE_LEVEL_Y.abyssBottom, width: 3 },
  { id: 'heroes-west-fall-1', lx: -95, lz: 241, topY: -24, bottomY: MINE_LEVEL_Y.abyssBottom, width: 3 },
  { id: 'heroes-west-fall-2', lx: -95, lz: 267, topY: -24, bottomY: MINE_LEVEL_Y.abyssBottom, width: 3 },
  { id: 'heroes-east-fall-1', lx: 95, lz: 241, topY: -24, bottomY: MINE_LEVEL_Y.abyssBottom, width: 3 },
  { id: 'heroes-east-fall-2', lx: 95, lz: 267, topY: -24, bottomY: MINE_LEVEL_Y.abyssBottom, width: 3 },
];

/** Summary: Open water channel from the lagoon to the south wall, past the water wheel. */
export const LAGOON_CHANNEL = { minLx: -82, maxLx: -78, minLz: 97, maxLz: 126 } as const;
// #endregion

// #region Guard Rails
/** Summary: Guard rail height above the floor it protects, in meters. */
export const GUARD_RAIL_HEIGHT = 1.1;

/** Summary: Height of the first king's plinth above the king balcony, in meters. */
export const KING_PLINTH_HEIGHT = 2.0;

/** Summary: How far below the protected low floor a rail collider reaches, in meters. */
const RAIL_SKIRT = 0.5;

export interface IMineGuardRail {
  readonly id: string;
  /** Summary: The rail lies on the line `axis = at`. */
  readonly axis: 'lx' | 'lz';
  readonly at: number;
  /** Summary: Extent along the other axis. */
  readonly from: number;
  readonly to: number;
  /** Summary: Vertical extent of the collider, world meters. */
  readonly minY: number;
  readonly maxY: number;
}

/**
 * Summary: Builds one rail segment that protects the floors between lowY and highY.
 * Design: Hoisted function so the table below reads as one call per run.
 */
function railRun(
  id: string,
  axis: 'lx' | 'lz',
  at: number,
  from: number,
  to: number,
  lowY: number,
  highY: number
): IMineGuardRail {
  return { id, axis, at, from, to, minY: lowY - RAIL_SKIRT, maxY: highY + GUARD_RAIL_HEIGHT };
}

/**
 * Summary: Parapets along every edge that drops into the abyss, a pit, or off a stair side.
 * Design: Each segment lies exactly on a footprint boundary. minY/maxY bound the collider, so the
 *         rail on the king balcony does not block the bridge landing beneath it.
 */
export const MINE_GUARD_RAILS: readonly IMineGuardRail[] = [
  railRun('overlook-south-west', 'lz', 20, -14, -7, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.overlook),
  railRun('overlook-south-east', 'lz', 20, 7, 14, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.overlook),
  railRun('entry-stairs-west', 'lx', -7, 20, 44, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.overlook),
  railRun('entry-stairs-east', 'lx', 7, 20, 44, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.overlook),
  railRun('pit-north-west', 'lz', 50, 58, 62, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('pit-north-east', 'lz', 50, 70, 82, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('pit-west', 'lx', 58, 50, 70, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('pit-east', 'lx', 82, 50, 70, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('pit-south-west', 'lz', 70, 58, 68, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('pit-south-east', 'lz', 70, 72, 82, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('cart-ramp-west', 'lx', 68, 60, 72, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('cart-ramp-east', 'lx', 72, 60, 72, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('pit-stairs-west', 'lx', 62, 38, 50, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('pit-stairs-east', 'lx', 70, 38, 50, MINE_LEVEL_Y.galleryPit, MINE_LEVEL_Y.upperCavern),
  railRun('platform-stairs-north', 'lz', 40, 78, 90, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.galleryPlatform),
  railRun('platform-stairs-south', 'lz', 46, 78, 90, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.galleryPlatform),
  railRun('platform-west-north', 'lx', 90, 36, 40, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.galleryPlatform),
  railRun('platform-west-south', 'lx', 90, 46, 54, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.galleryPlatform),
  railRun('platform-north', 'lz', 36, 90, 110, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.galleryPlatform),
  railRun('platform-south', 'lz', 54, 90, 110, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.galleryPlatform),
  railRun('platform-east', 'lx', 110, 36, 54, MINE_LEVEL_Y.upperCavern, MINE_LEVEL_Y.galleryPlatform),
  railRun('landing-1-south-west', 'lz', 147, -16, -8, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding1),
  railRun('landing-1-south-east', 'lz', 147, 8, 16, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding1),
  railRun('flight-b-west', 'lx', -8, 147, 164, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding1),
  railRun('flight-b-east', 'lx', 8, 147, 164, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding1),
  railRun('landing-2-north-west', 'lz', 164, -16, -8, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding2),
  railRun('landing-2-north-east', 'lz', 164, 8, 16, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding2),
  railRun('landing-2-west', 'lx', -16, 164, 172, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding2),
  railRun('landing-2-east', 'lx', 16, 164, 172, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding2),
  railRun('landing-2-south-west', 'lz', 172, -16, -8, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding2),
  railRun('landing-2-south-east', 'lz', 172, 8, 16, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding2),
  railRun('flight-c-west', 'lx', -8, 172, 189, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding2),
  railRun('flight-c-east', 'lx', 8, 172, 189, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.descentLanding2),
  railRun('ledge-north-west', 'lz', 189, -40, -8, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('ledge-north-east', 'lz', 189, 8, 40, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('ledge-south-west', 'lz', 207, -98, -5, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('ledge-south-east', 'lz', 207, 5, 70, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('ledge-east', 'lx', 70, 189, 207, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('bridge-west', 'lx', -5, 207, 293, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('bridge-east', 'lx', 5, 207, 293, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('bridge-landing-north-west', 'lz', 293, -10, -5, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('bridge-landing-north-east', 'lz', 293, 5, 10, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('bridge-landing-west', 'lx', -10, 293, 299, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.chasmLedge),
  railRun('heroes-path-inner', 'lx', -98, 207, 299, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.kingBalcony),
  railRun('heroes-south-wall-north', 'lz', 299, -98, -14, MINE_LEVEL_Y.abyssBottom, MINE_LEVEL_Y.kingBalcony),
  railRun('king-balcony-north', 'lz', 293, -14, 20, MINE_LEVEL_Y.kingBalcony, MINE_LEVEL_Y.kingBalcony),
  railRun('king-balcony-west', 'lx', -14, 293, 299, MINE_LEVEL_Y.kingBalcony, MINE_LEVEL_Y.kingBalcony),
  // The first king's plinth front: the gate tunnel runs beneath the statue.
  railRun('king-plinth-front', 'lz', 305, -10, 10, MINE_LEVEL_Y.kingBalcony, MINE_LEVEL_Y.kingBalcony + KING_PLINTH_HEIGHT),
  railRun('king-stairs-west', 'lx', 14, 314, 335, MINE_LEVEL_Y.chasmLedge, MINE_LEVEL_Y.kingBalcony),
  railRun('king-stairs-east', 'lx', 20, 314, 335, MINE_LEVEL_Y.chasmLedge, MINE_LEVEL_Y.kingBalcony),
];
// #endregion

// #region Surfaces
/** Summary: Rock ceiling heights per region, in world meters (the ground above is at about y = 0). */
const CEILING_Y = {
  entrance: 7.0,
  upperCavern: -1.0,
  descent: -4.0,
  chasm: -4.0,
  gateTunnel: -30.2,
  golemChamber: -22.0,
  passage: -32.0,
  forge: -22.0,
} as const;

/**
 * Summary: Ceiling of the open upper cavern: low (-1 m) at the edges, where the ground above is
 *          near y = 2, rising to +12 m under the mountain peak above the hall.
 */
const UPPER_CAVERN_CEILING = {
  ceilingY: CEILING_Y.upperCavern,
  ceilingDome: { lx: 0, lz: 70, radius: 75, peakY: 12.0 },
} as const;

/**
 * Summary: Every walkable or hazardous surface, ordered so carve-outs come after what they cut.
 * Design: Layer 1 holds floors that something else passes underneath (the king balcony above the
 *         bridge end). Everything else is layer 0.
 */
export const MINE_SURFACES: readonly IMineSurface[] = [
  // Entrance: gate tunnel, overlook balcony and the grand entry stairs down into the open cavern.
  {
    id: 'entrance-gate', area: 'entrance', layer: 0,
    footprint: { kind: 'rect', minLx: -7, maxLx: 7, minLz: -2, maxLz: 4 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.entrance }, material: 'stone', ceilingY: CEILING_Y.entrance,
  },
  {
    // A few steps right behind the gate drop below the outdoor-culling line, so the mountain
    // stops being drawn as soon as the player is inside.
    id: 'entrance-steps', area: 'entrance', layer: 0,
    footprint: { kind: 'rect', minLx: -7, maxLx: 7, minLz: 4, maxLz: 8 },
    height: { kind: 'stairs', axis: 'lz', from: 4, to: 8, yFrom: MINE_LEVEL_Y.entrance, yTo: MINE_LEVEL_Y.overlook, stepCount: 4 },
    material: 'stone', ceilingY: CEILING_Y.entrance,
  },
  {
    id: 'entrance-tunnel', area: 'entrance', layer: 0,
    footprint: { kind: 'rect', minLx: -7, maxLx: 7, minLz: 8, maxLz: 14 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.overlook }, material: 'stone', ceilingY: CEILING_Y.entrance,
  },
  {
    id: 'overlook-balcony', area: 'entrance', layer: 0,
    footprint: { kind: 'rect', minLx: -14, maxLx: 14, minLz: 14, maxLz: 20 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.overlook }, material: 'stone', ceilingY: CEILING_Y.entrance,
  },

  // Upper cavern: one open floor shared by hall, lagoon, galleries and foundry.
  {
    id: 'upper-cavern-floor', area: 'upperCavern', layer: 0,
    footprint: { kind: 'polygon', points: UPPER_CAVERN_OUTLINE },
    height: { kind: 'flat', y: MINE_LEVEL_Y.upperCavern }, material: 'stone', ...UPPER_CAVERN_CEILING,
  },
  {
    id: 'entry-stairs', area: 'entrance', layer: 0,
    footprint: { kind: 'rect', minLx: -7, maxLx: 7, minLz: 20, maxLz: 44 },
    height: { kind: 'stairs', axis: 'lz', from: 20, to: 44, yFrom: MINE_LEVEL_Y.overlook, yTo: MINE_LEVEL_Y.upperCavern, stepCount: 36 },
    material: 'stone', ...UPPER_CAVERN_CEILING,
  },
  {
    id: 'lagoon-basin', area: 'lagoon', layer: 0,
    footprint: { kind: 'ellipse', lx: MINE_POI.lagoonCentre.lx, lz: MINE_POI.lagoonCentre.lz, rx: 18, rz: 26 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.lagoonBed }, material: 'water', ...UPPER_CAVERN_CEILING,
    waterSurfaceY: MINE_LEVEL_Y.lagoonWater,
  },
  {
    id: 'lagoon-channel', area: 'lagoon', layer: 0,
    footprint: { kind: 'rect', ...LAGOON_CHANNEL },
    height: { kind: 'flat', y: MINE_LEVEL_Y.waterChannelBed }, material: 'water', ...UPPER_CAVERN_CEILING,
    waterSurfaceY: MINE_LEVEL_Y.channelWater,
  },
  {
    id: 'lagoon-channel-bridge', area: 'lagoon', layer: 0,
    footprint: { kind: 'rect', minLx: -84, maxLx: -76, minLz: 106, maxLz: 110 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.upperCavern }, material: 'stone', ...UPPER_CAVERN_CEILING,
  },
  {
    id: 'gallery-pit', area: 'galleries', layer: 0,
    footprint: { kind: 'rect', minLx: 58, maxLx: 82, minLz: 50, maxLz: 70 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.galleryPit }, material: 'stone', ...UPPER_CAVERN_CEILING,
  },
  {
    // Cart ramp: the ore line runs down into the pit; the ramp is stepped so it is walkable too.
    id: 'gallery-cart-ramp', area: 'galleries', layer: 0,
    footprint: { kind: 'rect', minLx: 68, maxLx: 72, minLz: 60, maxLz: 72 },
    height: { kind: 'stairs', axis: 'lz', from: 72, to: 60, yFrom: MINE_LEVEL_Y.upperCavern, yTo: MINE_LEVEL_Y.galleryPit, stepCount: 14 },
    material: 'stone', ...UPPER_CAVERN_CEILING,
  },
  {
    // Hidden alcove behind the lagoon waterfall: reached by walking through the falling water.
    id: 'waterfall-alcove', area: 'lagoon', layer: 0,
    footprint: { kind: 'rect', minLx: -116, maxLx: -108, minLz: 66, maxLz: 74 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.upperCavern }, material: 'stone', ceilingY: -2.0,
  },
  {
    id: 'gallery-pit-stairs', area: 'galleries', layer: 0,
    footprint: { kind: 'rect', minLx: 62, maxLx: 70, minLz: 38, maxLz: 50 },
    height: { kind: 'stairs', axis: 'lz', from: 38, to: 50, yFrom: MINE_LEVEL_Y.upperCavern, yTo: MINE_LEVEL_Y.galleryPit, stepCount: 14 },
    material: 'stone', ...UPPER_CAVERN_CEILING,
  },
  {
    id: 'gallery-platform', area: 'galleries', layer: 0,
    footprint: { kind: 'rect', minLx: 90, maxLx: 110, minLz: 36, maxLz: 54 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.galleryPlatform }, material: 'wood', ...UPPER_CAVERN_CEILING,
  },
  {
    id: 'gallery-platform-stairs', area: 'galleries', layer: 0,
    footprint: { kind: 'rect', minLx: 78, maxLx: 90, minLz: 40, maxLz: 46 },
    height: { kind: 'stairs', axis: 'lx', from: 78, to: 90, yFrom: MINE_LEVEL_Y.upperCavern, yTo: MINE_LEVEL_Y.galleryPlatform, stepCount: 13 },
    material: 'wood', ...UPPER_CAVERN_CEILING,
  },

  // Grand Descent: three flights with two landings, opening into the chasm cavern.
  {
    id: 'descent-flight-a', area: 'descent', layer: 0,
    footprint: { kind: 'rect', minLx: -8, maxLx: 8, minLz: 122, maxLz: 137 },
    height: { kind: 'stairs', axis: 'lz', from: 122, to: 137, yFrom: MINE_LEVEL_Y.upperCavern, yTo: MINE_LEVEL_Y.descentLanding1, stepCount: 30 },
    material: 'stone', ceilingY: CEILING_Y.descent,
  },
  {
    id: 'descent-landing-1', area: 'descent', layer: 0,
    footprint: { kind: 'rect', minLx: -16, maxLx: 16, minLz: 137, maxLz: 147 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.descentLanding1 }, material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    // The chasm cavern reaches up around the two lower flights: they descend in the open.
    id: 'descent-abyss-west', area: 'chasm', layer: 0,
    footprint: { kind: 'rect', minLx: -40, maxLx: -8, minLz: 147, maxLz: 189 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.abyssBottom }, material: 'abyss', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'descent-abyss-east', area: 'chasm', layer: 0,
    footprint: { kind: 'rect', minLx: 8, maxLx: 40, minLz: 147, maxLz: 189 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.abyssBottom }, material: 'abyss', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'descent-flight-b', area: 'descent', layer: 0,
    footprint: { kind: 'rect', minLx: -8, maxLx: 8, minLz: 147, maxLz: 164 },
    height: { kind: 'stairs', axis: 'lz', from: 147, to: 164, yFrom: MINE_LEVEL_Y.descentLanding1, yTo: MINE_LEVEL_Y.descentLanding2, stepCount: 34 },
    material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'descent-landing-2', area: 'descent', layer: 0,
    footprint: { kind: 'rect', minLx: -16, maxLx: 16, minLz: 164, maxLz: 172 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.descentLanding2 }, material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'descent-flight-c', area: 'descent', layer: 0,
    footprint: { kind: 'rect', minLx: -8, maxLx: 8, minLz: 172, maxLz: 189 },
    height: { kind: 'stairs', axis: 'lz', from: 172, to: 189, yFrom: MINE_LEVEL_Y.descentLanding2, yTo: MINE_LEVEL_Y.chasmLedge, stepCount: 34 },
    material: 'stone', ceilingY: CEILING_Y.chasm,
  },

  // Grand Chasm: the north ledge, then the abyss, carved by the bridge and the heroes' cliff path.
  {
    id: 'chasm-ledge', area: 'chasm', layer: 0,
    footprint: { kind: 'rect', minLx: -106, maxLx: 70, minLz: 189, maxLz: 207 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.chasmLedge }, material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'chasm-abyss', area: 'chasm', layer: 0,
    footprint: { kind: 'rect', minLx: -98, maxLx: 98, minLz: 207, maxLz: 293 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.abyssBottom }, material: 'abyss', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'chasm-abyss-north-east', area: 'chasm', layer: 0,
    footprint: { kind: 'rect', minLx: 70, maxLx: 98, minLz: 189, maxLz: 207 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.abyssBottom }, material: 'abyss', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'chasm-abyss-south-west', area: 'chasm', layer: 0,
    footprint: { kind: 'rect', minLx: -98, maxLx: -10, minLz: 293, maxLz: 299 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.abyssBottom }, material: 'abyss', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'great-bridge', area: 'bridge', layer: 0,
    footprint: { kind: 'rect', minLx: -5, maxLx: 5, minLz: 207, maxLz: 293 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.chasmLedge }, material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'bridge-south-landing', area: 'bridge', layer: 0,
    footprint: { kind: 'rect', minLx: -10, maxLx: 10, minLz: 293, maxLz: 300 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.chasmLedge }, material: 'stone', ceilingY: CEILING_Y.gateTunnel,
  },

  // Heroes' cliff path: a carved gallery in the west abyss wall, behind the statues and the falls.
  {
    id: 'heroes-path-lower', area: 'heroesPath', layer: 0,
    footprint: { kind: 'rect', minLx: -106, maxLx: -98, minLz: 207, maxLz: 225 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.chasmLedge }, material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'heroes-path-flight-1', area: 'heroesPath', layer: 0,
    footprint: { kind: 'rect', minLx: -106, maxLx: -98, minLz: 225, maxLz: 242 },
    height: { kind: 'stairs', axis: 'lz', from: 225, to: 242, yFrom: MINE_LEVEL_Y.chasmLedge, yTo: MINE_LEVEL_Y.heroesMidLanding, stepCount: 17 },
    material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'heroes-path-mid', area: 'heroesPath', layer: 0,
    footprint: { kind: 'rect', minLx: -106, maxLx: -98, minLz: 242, maxLz: 262 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.heroesMidLanding }, material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'heroes-path-flight-2', area: 'heroesPath', layer: 0,
    footprint: { kind: 'rect', minLx: -106, maxLx: -98, minLz: 262, maxLz: 279 },
    height: { kind: 'stairs', axis: 'lz', from: 262, to: 279, yFrom: MINE_LEVEL_Y.heroesMidLanding, yTo: MINE_LEVEL_Y.kingBalcony, stepCount: 17 },
    material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'heroes-path-upper', area: 'heroesPath', layer: 0,
    footprint: { kind: 'rect', minLx: -106, maxLx: -98, minLz: 279, maxLz: 305 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.kingBalcony }, material: 'stone', ceilingY: CEILING_Y.chasm,
  },
  {
    id: 'heroes-path-south-wall', area: 'heroesPath', layer: 0,
    footprint: { kind: 'rect', minLx: -106, maxLx: -14, minLz: 299, maxLz: 305 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.kingBalcony }, material: 'stone', ceilingY: CEILING_Y.chasm,
  },

  // King balcony at the feet of the first king, above the golem gate. Its stairs loop down into
  // the golem chamber and are listed after the chamber floor so they win inside it.
  {
    id: 'king-balcony', area: 'kingBalcony', layer: 1,
    footprint: { kind: 'rect', minLx: -14, maxLx: 20, minLz: 293, maxLz: 305 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.kingBalcony }, material: 'stone', ceilingY: CEILING_Y.chasm,
  },

  // Golem gate, chamber, ancient passage.
  {
    id: 'golem-gate-tunnel', area: 'golemChamber', layer: 0,
    footprint: { kind: 'rect', minLx: -6, maxLx: 6, minLz: 300, maxLz: 314 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.chasmLedge }, material: 'stone', ceilingY: CEILING_Y.gateTunnel,
  },
  {
    id: 'golem-chamber', area: 'golemChamber', layer: 0,
    footprint: { kind: 'rect', minLx: -30, maxLx: 30, minLz: 314, maxLz: 354 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.chasmLedge }, material: 'stone', ceilingY: CEILING_Y.golemChamber,
  },
  {
    id: 'king-loop-stairs', area: 'kingBalcony', layer: 0,
    footprint: { kind: 'rect', minLx: 14, maxLx: 20, minLz: 305, maxLz: 335 },
    height: { kind: 'stairs', axis: 'lz', from: 305, to: 335, yFrom: MINE_LEVEL_Y.kingBalcony, yTo: MINE_LEVEL_Y.chasmLedge, stepCount: 32 },
    material: 'stone', ceilingY: CEILING_Y.golemChamber,
  },
  {
    id: 'ancient-passage', area: 'ancientPassage', layer: 0,
    footprint: { kind: 'rect', minLx: -5, maxLx: 5, minLz: 354, maxLz: 384 },
    height: { kind: 'stairs', axis: 'lz', from: 354, to: 384, yFrom: MINE_LEVEL_Y.chasmLedge, yTo: MINE_LEVEL_Y.forgeFloor, stepCount: 40 },
    material: 'stone', ceilingY: CEILING_Y.passage,
  },

  // Dragon Forge: floor ring, lava pool, stepping stones and the treasure island.
  {
    id: 'forge-floor', area: 'dragonForge', layer: 0,
    footprint: { kind: 'rect', minLx: -40, maxLx: 40, minLz: 384, maxLz: 454 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.forgeFloor }, material: 'stone', ceilingY: CEILING_Y.forge,
  },
  {
    id: 'forge-lava-pool', area: 'dragonForge', layer: 0,
    footprint: { kind: 'rect', ...LAVA_POOL },
    height: { kind: 'flat', y: MINE_LEVEL_Y.lavaBed }, material: 'lava', ceilingY: CEILING_Y.forge,
  },
  // Narrow lava channels branching from the pool to the side walls: hazards, but jumpable.
  {
    id: 'forge-lava-channel-west', area: 'dragonForge', layer: 0,
    footprint: { kind: 'rect', minLx: -40, maxLx: -30, minLz: 427, maxLz: 428.4 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.lavaBed }, material: 'lava', ceilingY: CEILING_Y.forge,
  },
  {
    id: 'forge-lava-channel-east', area: 'dragonForge', layer: 0,
    footprint: { kind: 'rect', minLx: 30, maxLx: 40, minLz: 410, maxLz: 411.4 },
    height: { kind: 'flat', y: MINE_LEVEL_Y.lavaBed }, material: 'lava', ceilingY: CEILING_Y.forge,
  },
  ...LAVA_STEPPING_STONES.map(
    (stone, i): IMineSurface => ({
      id: `lava-stone-${i + 1}`, area: 'dragonForge', layer: 0,
      footprint: { kind: 'circle', lx: stone.lx, lz: stone.lz, r: stone.r },
      height: { kind: 'flat', y: stone.topY }, material: 'stone', ceilingY: CEILING_Y.forge,
    })
  ),
  {
    id: 'treasure-island', area: 'dragonForge', layer: 0,
    footprint: { kind: 'circle', lx: TREASURE_ISLAND.lx, lz: TREASURE_ISLAND.lz, r: TREASURE_ISLAND.r },
    height: { kind: 'flat', y: TREASURE_ISLAND.topY }, material: 'stone', ceilingY: CEILING_Y.forge,
  },
];
// #endregion
