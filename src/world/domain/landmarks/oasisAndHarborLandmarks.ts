// ============================================================================
// MODULE: World / Domain / Landmarks / Oasis & Harbor
// DESIGN: Southwest oasis lagoon and Southeast walled coastal harbor town (SRP)
// SUMMARY: Exposes locations, dimensions, and shop queries for the southwest oasis,
//          walled port city, market stalls, tall ship galleon, and lighthouse.
// ============================================================================

import { t } from '../../../locales';

// ======================== SOUTHWEST OASIS ======================== \\
// #region Southwest Oasis
export interface OasisVillageHouseSpec {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  secondStory?: {
    offsetX: number;
    offsetZ: number;
    w: number;
    d: number;
    h: number;
  };
  awningSide?: 'north' | 'south' | 'east' | 'west';
  awningColor?: 'terracotta' | 'ochre' | 'sand';
  awningW?: number;
  awningD?: number;
}

export interface OasisStoneWallSpec {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface OasisPalmSpec {
  id: string;
  dx: number;
  dz: number;
  scale: number;
  leanX: number;
  leanZ: number;
  seed: number;
}

/** Summary: Spatial parameters for the southwest desert oasis lagoon and sandstone adobe village. */
export const SOUTHWEST_OASIS_POS = {
  x: -310.0,
  z: 300.0,
  terraceY: 5.5,
  clearRadius: 64.0,
  // Northeast Grand Adobe Citadel & Domed Bell-Watchtower overlooking the lagoon
  observatoryX: -288.5,
  observatoryZ: 294.0,
  observatoryBaseY: 5.5,
  observatoryTopDeckY: 19.5,
  observatoryRadius: 5.0,
  observatoryDoorId: 'sw-observatory-door',
  observatoryDoorZ: 298.85,
  observatoryLadderId: 'sw-observatory-ladder',
  observatoryLadderX: -288.5,
  observatoryLadderZ: 290.3,
  observatoryStandX: -288.5,
  observatoryStandZ: 290.85,
  // West Enterable Adobe Merchant House & Terracotta Canopy Street
  pavilionX: -339.5,
  pavilionZ: 307.0,
  pavilionFloorY: 5.62,
  pavilionHalfW: 5.2,
  pavilionHalfD: 6.4,
  pavilionDoorId: 'sw-alchemist-door',
  pavilionDoorX: -334.3,
  // Village square center (flat sandy terrace at (-310, 300))
  fountainX: -310.0,
  fountainZ: 294.0,
  // Central Turquoise Oasis Lagoon in the heart of the village crescent
  lagoonX: -310.0,
  lagoonZ: 319.0,
  lagoonRadiusX: 19.5,
  lagoonRadiusZ: 14.5,
  lagoonWaterY: 5.3,
  // South-East Wooden Fishing Pier jutting into the lagoon (mapped to gazeboX/Z)
  gazeboX: -294.5,
  gazeboZ: 325.5,
  gazeboDeckY: 5.72,
  gazeboHalfSize: 3.6,
  // East Shoreline Wooden Fishing Dock jutting into the lagoon
  eastPierX: -292.0,
  eastPierZ: 314.5,
  eastPierDeckY: 5.72,
  bridgeMinZ: 323.5,
  bridgeMaxZ: 327.5,
  bridgeHalfW: 1.8,
  colonnadeX: -280.0,
  colonnadeZ: 298.0,
  gateX: -274.0,
  gateZ: 296.0,
} as const;

export const SOUTHWEST_OASIS_VILLAGE_HOUSES: readonly OasisVillageHouseSpec[] = [
  // 1) North-West Two-Story Adobe Residence overlooking the northern palm grove
  {
    id: 'sw-oasis-house-nw',
    x: -327.5,
    z: 290.0,
    w: 9.2,
    d: 7.4,
    h: 4.7,
    secondStory: { offsetX: -1.4, offsetZ: -0.6, w: 5.6, d: 5.4, h: 3.6 },
    awningSide: 'south',
    awningColor: 'ochre',
    awningW: 5.4,
    awningD: 3.2,
  },
  // 2) North Central Adobe Courtyard House
  {
    id: 'sw-oasis-house-n',
    x: -309.5,
    z: 287.5,
    w: 10.4,
    d: 7.2,
    h: 4.8,
    secondStory: { offsetX: 1.8, offsetZ: -0.5, w: 5.8, d: 5.2, h: 3.5 },
    awningSide: 'south',
    awningColor: 'terracotta',
    awningW: 6.0,
    awningD: 3.0,
  },
  // 3) Citadel Annex Hall (East arched wing of the Domed Watchtower Compound)
  {
    id: 'sw-oasis-citadel-annex',
    x: -278.0,
    z: 297.5,
    w: 8.8,
    d: 9.6,
    h: 5.5,
    awningSide: 'south',
    awningColor: 'ochre',
    awningW: 5.6,
    awningD: 3.4,
  },
  // 4) East Shore Fisherman's Adobe House (right bank of lagoon near the wooden docks)
  {
    id: 'sw-oasis-house-e',
    x: -278.5,
    z: 318.5,
    w: 8.4,
    d: 7.4,
    h: 4.5,
    awningSide: 'west',
    awningColor: 'terracotta',
    awningW: 4.8,
    awningD: 3.0,
  },
  // 5) South-West Stepped Adobe Dwelling along the western sandy lane (with wide sandy shore before the lagoon)
  {
    id: 'sw-oasis-house-sw',
    x: -340.5,
    z: 323.5,
    w: 9.0,
    d: 7.8,
    h: 4.7,
    secondStory: { offsetX: -1.2, offsetZ: 0.8, w: 5.4, d: 5.0, h: 3.4 },
    awningSide: 'east',
    awningColor: 'ochre',
    awningW: 5.2,
    awningD: 3.2,
  },
  // 6) South-Southwest Single-Story Mudbrick House (foreground left in aerial reference view)
  {
    id: 'sw-oasis-house-ssw',
    x: -327.0,
    z: 339.5,
    w: 8.2,
    d: 6.8,
    h: 4.3,
    awningSide: 'north',
    awningColor: 'sand',
    awningW: 4.6,
    awningD: 2.8,
  },
  // 7) South-East Shore Adobe Cottage near the southern wooden pier
  {
    id: 'sw-oasis-house-se',
    x: -291.5,
    z: 341.0,
    w: 7.8,
    d: 6.6,
    h: 4.2,
    awningSide: 'north',
    awningColor: 'terracotta',
    awningW: 4.5,
    awningD: 2.8,
  },
] as const;

export const SOUTHWEST_OASIS_STONE_WALLS: readonly OasisStoneWallSpec[] = [
  // Low sandstone compound walls along the village lanes (matching bottom-left and aerial reference panels)
  { id: 'sw-oasis-wall-west-lane-1', x: -328.5, z: 304.5, w: 1.0, d: 7.5, h: 1.25 },
  { id: 'sw-oasis-wall-west-lane-2', x: -331.5, z: 315.5, w: 1.0, d: 6.5, h: 1.25 },
  { id: 'sw-oasis-wall-north-courtyard', x: -318.5, z: 292.5, w: 5.8, d: 1.0, h: 1.25 },
  { id: 'sw-oasis-wall-citadel-south', x: -298.5, z: 301.0, w: 5.8, d: 1.0, h: 1.3 },
  { id: 'sw-oasis-wall-ssw-yard', x: -334.5, z: 332.0, w: 1.0, d: 6.0, h: 1.25 },
] as const;

export const SOUTHWEST_OASIS_PALMS: readonly OasisPalmSpec[] = [
  // Shoreline & village date palms framing the lagoon and adobe buildings (zero building overlap)
  { id: 'sw-oasis-palm-1', dx: -21.0, dz: 6.5, scale: 1.22, leanX: 0.14, leanZ: 0.08, seed: 11 },
  { id: 'sw-oasis-palm-2', dx: -17.0, dz: 9.0, scale: 1.08, leanX: 0.10, leanZ: 0.12, seed: 12 },
  { id: 'sw-oasis-palm-3', dx: -11.5, dz: 3.5, scale: 1.26, leanX: -0.08, leanZ: 0.14, seed: 13 },
  { id: 'sw-oasis-palm-4', dx: -5.5, dz: 2.5, scale: 1.15, leanX: 0.06, leanZ: 0.12, seed: 14 },
  { id: 'sw-oasis-palm-5', dx: 4.0, dz: 1.5, scale: 1.28, leanX: -0.10, leanZ: 0.10, seed: 15 },
  { id: 'sw-oasis-palm-6', dx: 9.5, dz: -6.0, scale: 1.18, leanX: 0.12, leanZ: 0.06, seed: 16 },
  { id: 'sw-oasis-palm-7', dx: 11.5, dz: 3.5, scale: 1.12, leanX: -0.14, leanZ: 0.08, seed: 17 },
  { id: 'sw-oasis-palm-8', dx: 27.5, dz: -10.5, scale: 1.24, leanX: 0.09, leanZ: -0.11, seed: 18 },
  { id: 'sw-oasis-palm-9', dx: 39.0, dz: -2.0, scale: 1.16, leanX: 0.15, leanZ: 0.05, seed: 19 },
  { id: 'sw-oasis-palm-10', dx: 23.0, dz: 9.5, scale: 1.10, leanX: -0.12, leanZ: 0.09, seed: 20 },
  { id: 'sw-oasis-palm-11', dx: 38.5, dz: 14.5, scale: 1.20, leanX: 0.11, leanZ: -0.08, seed: 21 },
  { id: 'sw-oasis-palm-12', dx: 23.5, dz: 26.5, scale: 1.06, leanX: -0.14, leanZ: -0.07, seed: 22 },
  { id: 'sw-oasis-palm-13', dx: 11.0, dz: 35.5, scale: 1.14, leanX: -0.08, leanZ: -0.14, seed: 23 },
  { id: 'sw-oasis-palm-14', dx: 1.5, dz: 36.5, scale: 1.04, leanX: 0.06, leanZ: -0.16, seed: 24 },
  { id: 'sw-oasis-palm-15', dx: -8.5, dz: 35.5, scale: 1.22, leanX: 0.12, leanZ: -0.11, seed: 25 },
  { id: 'sw-oasis-palm-16', dx: -17.5, dz: 31.5, scale: 1.16, leanX: 0.15, leanZ: -0.09, seed: 26 },
  { id: 'sw-oasis-palm-17', dx: -21.5, dz: 24.5, scale: 1.08, leanX: 0.18, leanZ: -0.04, seed: 27 },
  { id: 'sw-oasis-palm-18', dx: -21.5, dz: 16.0, scale: 1.25, leanX: 0.14, leanZ: 0.05, seed: 28 },
  { id: 'sw-oasis-palm-19', dx: -38.5, dz: 15.0, scale: 1.18, leanX: -0.11, leanZ: 0.09, seed: 29 },
  { id: 'sw-oasis-palm-20', dx: -38.5, dz: -2.0, scale: 1.20, leanX: -0.14, leanZ: -0.08, seed: 30 },
  { id: 'sw-oasis-palm-21', dx: -24.5, dz: -17.5, scale: 1.15, leanX: -0.07, leanZ: -0.12, seed: 31 },
  { id: 'sw-oasis-palm-22', dx: 1.5, dz: -19.0, scale: 1.24, leanX: 0.08, leanZ: -0.14, seed: 32 },
  { id: 'sw-oasis-palm-23', dx: 16.0, dz: -16.5, scale: 1.19, leanX: 0.12, leanZ: -0.10, seed: 33 },
  { id: 'sw-oasis-palm-24', dx: -35.0, dz: 35.0, scale: 1.12, leanX: -0.10, leanZ: 0.12, seed: 34 },
] as const;
// #endregion

// ======================== SOUTHEAST HARBOR ======================== \\
// #region Southeast Harbor
/** Summary: Spatial parameters for the walled coastal port, galleon ship, and lighthouse. */
export const SOUTHEAST_HARBOR_POS = {
  x: 235.0,
  z: 252.0,
  plazaY: 3.2,
  waterY: 1.25,
  gateX: 200.0,
  gateZ: 244.0,
  wallWestX: 200.0,
  wallNorthZ: 214.0,
  wallSouthZ: 312.0,
  tavernX: 224.0,
  tavernZ: 230.0,
  tavernFloorY: 3.35,
  tavernHalfW: 8.0,
  tavernHalfD: 6.0,
  tavernDoorZ: 236.0,
  fountainX: 232.0,
  fountainZ: 252.0,
  warehouseX: 218.0,
  warehouseZ: 277.0,
  warehouseFloorY: 3.35,
  warehouseHalfW: 8.5,
  warehouseHalfD: 5.5,
  warehouseDoorId: 'harbor-warehouse-door',
  warehouseDoorZ: 271.5,
  cargoShedX: 243.0,
  cargoShedZ: 277.0,
  amphitheaterX: 226.0,
  amphitheaterZ: 294.0,
  pierStartX: 254.0,
  pierEndX: 271.5,
  pierZ: 252.0,
  pierHalfW: 2.8,
  pierY: 3.25,
  shipX: 282.0,
  shipZ: 252.0,
  shipDeckY: 3.65,
  shipQuarterdeckY: 6.65,
  shipQuarterdeckStartZ: 259.5,
  shipHalfW: 6.4,
  shipHalfL: 21.0,
  shipCaptainDoorId: 'galleon-captain-door',
  lighthouseX: 252.0,
  lighthouseZ: 202.0,
  lighthouseBaseY: 9.5,
  lighthouseTopDeckY: 25.5,
  lighthouseRadius: 4.2,
  lighthouseDoorId: 'harbor-lighthouse-door',
  lighthouseLadderId: 'harbor-lighthouse-ladder',
  lighthouseLadderX: 252.0,
  lighthouseLadderZ: 199.1,
  lighthouseStandX: 252.0,
  lighthouseStandZ: 199.65,
} as const;
// #endregion

// ======================== HARBOR MARKET STALLS ======================== \\
// #region Harbor Market Stalls
import { INVENTORY_ITEMS, type IInventoryItemDef, type InventoryItemId } from '../worldTypes';

/** Summary: Merchant shop locations in the harbor town marketplace, each specialized by shop type. */
export const MARKET_STALL_LOCATIONS = [
  {
    id: 'market-harbor-1',
    name: t('landmarks.market_harbor_swords'),
    shopType: 'swords' as const,
    x: 212.0,
    z: 254.0,
    radius: 4.5,
    allowedItemIds: [
      'sword',
      'katana_imperial',
      'dwarven_warhammer',
      'celestial_jin_sword',
    ] as readonly InventoryItemId[],
  },
  {
    id: 'market-harbor-2',
    name: t('landmarks.market_harbor_bows'),
    shopType: 'bows' as const,
    x: 212.0,
    z: 263.0,
    radius: 4.5,
    allowedItemIds: [
      'bow',
      'elven_longbow',
      'dragonbone_bow',
      'arrow_normal',
      'arrow_fire',
      'arrow_wind',
    ] as readonly InventoryItemId[],
  },
  {
    id: 'market-harbor-3',
    name: t('landmarks.market_harbor_timber'),
    shopType: 'clothing_and_timber' as const,
    x: 224.0,
    z: 263.0,
    radius: 4.5,
    allowedItemIds: [
      'simple_tunic',
      'ranger_garb',
      'elven_cloak',
      'imperial_armor',
      'oak_timber',
      'woodcutter_axe',
      'torch',
      'ancient_dwarven_horn',
      'small_hide',
      'sheep_hide',
      'deer_hide',
      'wolf_hide',
    ] as readonly InventoryItemId[],
  },
  {
    id: 'market-harbor-4',
    name: t('landmarks.market_harbor_stone'),
    shopType: 'stone' as const,
    x: 240.0,
    z: 263.0,
    radius: 4.5,
    allowedItemIds: [
      'cut_granite_blocks',
      'imperial_clay_tiles',
      'marble_pillar_stone',
      'crystal_gem',
    ] as readonly InventoryItemId[],
  },
  {
    id: 'market-harbor-5',
    name: t('landmarks.market_harbor_smithy'),
    shopType: 'smithy' as const,
    x: 246.0,
    z: 238.0,
    radius: 4.5,
    allowedItemIds: [
      'iron_ingots',
      'dwarven_gold_ore',
      'imperial_armor',
      'dwarven_warhammer',
      'sword',
      'woodcutter_axe',
    ] as readonly InventoryItemId[],
  },
  {
    id: 'market-harbor-6',
    name: t('landmarks.market_harbor_minerals'),
    shopType: 'food' as const,
    x: 246.0,
    z: 246.0,
    radius: 4.5,
    allowedItemIds: [
      'fresh_bread_loaf',
      'harbor_cheese_wheel',
      'red_orchard_apples',
      'raw_game_meat',
      'deer_meat',
      'bear_meat',
      'roasted_meat',
    ] as readonly InventoryItemId[],
  },
  {
    id: 'market-harbor-shipwright',
    name: 'Royal Galleon Shipwright',
    shopType: 'shipwright' as const,
    x: 282.0,
    z: 267.6,
    radius: 4.5,
    allowedItemIds: [] as readonly InventoryItemId[],
  },
] as const;

/**
 * Summary: Returns the merchant catalog items sold by a specific market stall according to its shop type.
 * When stallId matches a specialized stall in MARKET_STALL_LOCATIONS, strictly returns that stall's inventory.
 */
export function getMarketStallCatalogItems(stallId?: string | null): readonly IInventoryItemDef[] {
  const baseCatalog = INVENTORY_ITEMS.filter((item) => item.id !== 'unarmed' && !item.lootOnly);
  if (!stallId) return baseCatalog;
  const stall = MARKET_STALL_LOCATIONS.find((s) => s.id === stallId);
  if (!stall) return baseCatalog;
  const allowedSet = new Set<InventoryItemId>(stall.allowedItemIds);
  return baseCatalog.filter((item) => allowedSet.has(item.id));
}

/**
 * Summary: Finds the nearest harbor market stall interactable at a world position.
 * Design: Linear scan with distance threshold matching the stall's interaction radius and vertical elevation check.
 * @param px Observer X coordinate.
 * @param pz Observer Z coordinate.
 * @param py Optional observer Y coordinate to prevent triggering ground stalls while flying high above.
 * @returns Nearest market stall record within interaction range, or null.
 */
export function findNearestMarketStall(
  px: number,
  pz: number,
  py?: number
): (typeof MARKET_STALL_LOCATIONS)[number] | null {
  let best: (typeof MARKET_STALL_LOCATIONS)[number] | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < MARKET_STALL_LOCATIONS.length; i++) {
    const st = MARKET_STALL_LOCATIONS[i];
    const stallY = st.id === 'market-harbor-shipwright' ? SOUTHEAST_HARBOR_POS.shipDeckY : SOUTHEAST_HARBOR_POS.plazaY;
    if (py !== undefined && Math.abs(py - stallY) > 2.85) continue;
    const d = Math.hypot(px - st.x, pz - st.z);
    if (d <= st.radius && d < bestDist) {
      bestDist = d;
      best = st;
    }
  }
  return best;
}
// #endregion

