import { t } from '../../../locales';
// ============================================================================
// MODULE: World / Domain / Landmarks / Oasis & Harbor
// DESIGN: Southwest oasis lagoon and Southeast walled coastal harbor town (SRP)
// SUMMARY: Exposes locations, dimensions, and shop queries for the southwest oasis,
//          walled port city, market stalls, tall ship galleon, and lighthouse.
// ============================================================================

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
/** Summary: Merchant shop locations in the harbor town marketplace. */
export const MARKET_STALL_LOCATIONS = [
  { id: 'market-harbor-1', name: t('landmarks.market_harbor_swords'), x: 212.0, z: 254.0, radius: 4.5 },
  { id: 'market-harbor-2', name: t('landmarks.market_harbor_bows'), x: 212.0, z: 263.0, radius: 4.5 },
  { id: 'market-harbor-3', name: t('landmarks.market_harbor_timber'), x: 224.0, z: 263.0, radius: 4.5 },
  { id: 'market-harbor-4', name: t('landmarks.market_harbor_stone'), x: 240.0, z: 263.0, radius: 4.5 },
  { id: 'market-harbor-5', name: t('landmarks.market_harbor_smithy'), x: 246.0, z: 238.0, radius: 4.5 },
  { id: 'market-harbor-6', name: t('landmarks.market_harbor_minerals'), x: 246.0, z: 246.0, radius: 4.5 },
] as const;

/**
 * Summary: Finds the nearest harbor market stall interactable at a world position.
 * Design: Linear scan with distance threshold matching the stall's interaction radius.
 * @param px Observer X coordinate.
 * @param pz Observer Z coordinate.
 * @returns Nearest market stall record within interaction range, or null.
 */
export function findNearestMarketStall(px: number, pz: number): (typeof MARKET_STALL_LOCATIONS)[number] | null {
  let best: (typeof MARKET_STALL_LOCATIONS)[number] | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < MARKET_STALL_LOCATIONS.length; i++) {
    const st = MARKET_STALL_LOCATIONS[i];
    const d = Math.hypot(px - st.x, pz - st.z);
    if (d <= st.radius && d < bestDist) {
      bestDist = d;
      best = st;
    }
  }
  return best;
}
// #endregion
