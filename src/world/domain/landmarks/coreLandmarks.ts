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

/** Summary: Secluded valley glade & traveler camp south of the Mountain Gorge Pass. */
export const SOUTHERN_PASS_VALLEY_POS = {
  x: 105.0,
  z: 715.0,
  height: 2.15,
  floorY: 2.15,
  radius: 36.0,
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
 * Summary: Murky Swamp & Hippo Marshland Biome in the South-Southwest lowlands,
 *          featuring shallow water channels, wallowing mud pools, mossy peat hummocks,
 *          gnarled swamp cypress trees, cattail reed beds, and a resident hippo pod.
 */
export const MURKY_SWAMP_BIOME_POS = {
  x: -175.0,
  z: 435.0,
  innerRadius: 72.0,
  outerRadius: 105.0,
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
] as const;

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
 * Summary: Computes the walkable deck/bridge/spiral-mini-island height on the Floating Blooming Sky Islands,
 *          or returns null if (x, z, currentY) is not on a floating island surface.
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

  // 3. Check the 3 High-Altitude Large Floating Blooming Island circular decks (y = 68m..71m)
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
