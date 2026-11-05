// ============================================================================
// MODULE: World / Domain / Landmarks / Oasis & Harbor
// DESIGN: Southwest oasis lagoon and Southeast walled coastal harbor town (SRP)
// SUMMARY: Exposes locations, dimensions, and shop queries for the southwest oasis,
//          walled port city, market stalls, tall ship galleon, and lighthouse.
// ============================================================================

import { t } from '../../../locales';

// ======================== SOUTHWEST OASIS ======================== \\
// #region Southwest Oasis
/** Summary: Spatial parameters for the southwest desert oasis, lagoon, and observatory. */
export const SOUTHWEST_OASIS_POS = {
  x: -310.0,
  z: 300.0,
  terraceY: 5.5,
  clearRadius: 56.0,
  observatoryX: -310.0,
  observatoryZ: 280.0,
  observatoryBaseY: 5.5,
  observatoryTopDeckY: 21.5,
  observatoryRadius: 5.0,
  observatoryDoorId: 'sw-observatory-door',
  observatoryDoorZ: 284.85,
  observatoryLadderId: 'sw-observatory-ladder',
  observatoryLadderX: -310.0,
  observatoryLadderZ: 276.3,
  observatoryStandX: -310.0,
  observatoryStandZ: 276.85,
  pavilionX: -336.0,
  pavilionZ: 300.0,
  pavilionFloorY: 5.68,
  pavilionHalfW: 5.2,
  pavilionHalfD: 6.4,
  pavilionDoorId: 'sw-alchemist-door',
  pavilionDoorX: -330.8,
  fountainX: -310.0,
  fountainZ: 300.0,
  lagoonX: -310.0,
  lagoonZ: 324.0,
  lagoonRadiusX: 19.0,
  lagoonRadiusZ: 13.5,
  lagoonWaterY: 5.35,
  gazeboX: -310.0,
  gazeboZ: 324.0,
  gazeboDeckY: 5.85,
  gazeboHalfSize: 4.4,
  bridgeMinZ: 309.5,
  bridgeMaxZ: 338.5,
  bridgeHalfW: 2.2,
  colonnadeX: -286.0,
  colonnadeZ: 300.0,
  gateX: -274.0,
  gateZ: 296.0,
} as const;
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

