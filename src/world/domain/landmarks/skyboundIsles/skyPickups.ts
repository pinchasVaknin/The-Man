// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: Floating pickups are placed from the route data (one above each Cloud Run cloud and
//         one above its rest platform), so they move with the route. The player collects one
//         by passing through it; collected ids are kept here and saved with the world, so a
//         pickup is taken once per world. The caller (the physics step) puts the loot into
//         the inventory, so this module never touches the player.
// SUMMARY: Pickup definitions, the collect-on-touch rule, and save/restore of what was taken.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import type { InventoryItemId } from '../../worldTypes';
import { CLOUD_RUN_REST, SKY_CLOUDS } from './skyCloudRoutes';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: One floating pickup: either an inventory item or a handful of gold. */
export interface ISkyPickupDef {
  readonly id: string;
  readonly x: number;
  /** Centre of the pickup (it floats above the surface it marks). */
  readonly y: number;
  readonly z: number;
  readonly itemId?: InventoryItemId;
  readonly gold?: number;
}
// #endregion

// #region Tuning
/** Height (m) of a pickup's centre above the cloud or platform top. */
export const SKY_PICKUP_HOVER_M = 1.2;
/** Horizontal reach (m) from the player's axis to the pickup centre. */
const COLLECT_RADIUS_M = 1.4;
/** Vertical reach (m) from the player's chest (feet + 0.9 m) to the pickup centre. */
const COLLECT_HEIGHT_M = 1.6;
const CHEST_HEIGHT_M = 0.9;
const CLOUD_RUN_GOLD = 15;
/** Loot along the Cloud Run, in walking order (each cloud, then the rest platform). */
const CLOUD_RUN_LOOT: ReadonlyArray<Pick<ISkyPickupDef, 'itemId' | 'gold'>> = [
  { gold: CLOUD_RUN_GOLD },
  { itemId: 'amethyst_gem' },
  { gold: CLOUD_RUN_GOLD },
  { itemId: 'sapphire_gem' },
];
// #endregion

// #region Definitions
function buildCloudRunPickups(): ISkyPickupDef[] {
  const clouds = SKY_CLOUDS.filter((c) => c.routeId === 'cloud-run');
  const spots = [...clouds.slice(0, 2), CLOUD_RUN_REST, ...clouds.slice(2)];
  return spots.map((s, i) => ({
    id: `pickup-cloud-run-${i}`,
    x: s.x,
    y: s.y + SKY_PICKUP_HOVER_M,
    z: s.z,
    ...CLOUD_RUN_LOOT[i % CLOUD_RUN_LOOT.length],
  }));
}

/** Summary: Every floating pickup of the archipelago. */
export const SKY_PICKUPS: readonly ISkyPickupDef[] = buildCloudRunPickups();
// #endregion

// ======================== MODULE STATE ======================== \\
// #region State
let collected = new Set<string>();
// #endregion

// ======================== PUBLIC API ======================== \\
// #region State Access
/** Summary: Whether a pickup has already been taken in this world. */
export function isSkyPickupCollected(id: string): boolean {
  return collected.has(id);
}

/** Summary: Puts every pickup back (new world, tests). */
export function resetSkyPickups(): void {
  collected = new Set();
}

/** Summary: Ids of the collected pickups, for the save file. */
export function exportSkyPickupState(): string[] {
  return SKY_PICKUPS.filter((p) => collected.has(p.id)).map((p) => p.id);
}

/**
 * Summary: Restores the collected pickups from a save file; unknown ids are dropped.
 * @param saved Saved ids, or undefined for an older save without pickups.
 */
export function importSkyPickupState(saved: readonly string[] | undefined): void {
  const known = new Set(SKY_PICKUPS.map((p) => p.id));
  collected = new Set(Array.isArray(saved) ? saved.filter((id) => known.has(id)) : []);
}
// #endregion

// #region Collecting
/**
 * Summary: Takes every pickup the player is touching.
 * @param x Player feet X.
 * @param feetY Player feet Y.
 * @param z Player feet Z.
 * @returns The pickups taken this call (empty when none was in reach).
 */
export function collectSkyPickupsAt(x: number, feetY: number, z: number): ISkyPickupDef[] {
  const taken: ISkyPickupDef[] = [];
  const chestY = feetY + CHEST_HEIGHT_M;
  for (const p of SKY_PICKUPS) {
    if (collected.has(p.id)) continue;
    if (Math.abs(chestY - p.y) > COLLECT_HEIGHT_M) continue;
    if (Math.hypot(x - p.x, z - p.z) > COLLECT_RADIUS_M) continue;
    collected.add(p.id);
    taken.push(p);
  }
  return taken;
}
// #endregion
