// ============================================================================
// MODULE: World / Systems / Combat And Inventory
// DESIGN: Player weapon equipping, market trading, sword striking, and arrow physics (SRP)
// SUMMARY: Manages inventory item ownership, market buy/sell transactions, hotbar slots,
//          melee hit detection against targets and solid volumes, and ballistic arrow flight.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { t } from '../../locales';
import { Result } from '../../core/Result';
import {
  INVENTORY_ITEM_MAP,
  DEFAULT_STARTER_OWNED_ITEM_IDS,
  type IPlayerState,
  type ISolidBuildingBox,
  type EquippedToolSlot,
  type ArrowElementKind,
  type InventoryItemId,
  type IInventoryItemDef,
  type IObstacleCylinder,
  type IArcheryTargetDef,
  type IArrowProjectile,
} from '../domain/worldTypes';
import {
  PLAYER_EYE_HEIGHT,
  SOLID_BUILDING_BOXES,
  ARCHERY_TARGETS,
  findNearestMarketStall,
} from '../domain/landmarksRegistry';
import { groundHeightAt, walkableHeightAt } from './terrainAndBiomeSystem';
import { awardSkillXp, getPlayerHeroLevel } from './playerPhysicsSystem';
import {
  SWORD_ACTIVE_STRIKE_WINDOW_START,
  SWORD_ACTIVE_STRIKE_WINDOW_END,
  SWORD_STRIKE_CONTACT_APEX,
} from './swordAttackAnimationSystem';
import {
  BASE_ARROW_HIT_DAMAGE,
  getActiveWorldAnimals,
  damageGroundAnimal,
  type ISmallAnimalState,
} from './boidsAndWildlifeSystem';
// #endregion

// ======================== CONSTANTS & LABELS ======================== \\
// #region Constants & Labels
export { SWORD_ACTIVE_STRIKE_WINDOW_START, SWORD_ACTIVE_STRIKE_WINDOW_END, SWORD_STRIKE_CONTACT_APEX };

export const ARROW_TRAIL_MAX_AGE = 0.85;

/** Summary: Minimum bow draw progress required before releasing fires an arrow. */
export const MIN_BOW_DRAW_TO_SHOOT = 0.22;

/** Summary: Market resell value ratio (70% of buy price, minimum 5 gold). */
const MARKET_SELL_RATIO = 0.7;
const MARKET_MIN_SELL_PRICE = 5;

/** Summary: Stamina costs for sword attacks. */
const STAMINA_COST_LIGHT_SWORD = 5;
const STAMINA_COST_HEAVY_SWORD = 14;

/** Summary: Melee hit reach distances in meters. */
const SWORD_LIGHT_REACH = 2.55;
const SWORD_HEAVY_REACH = 4.25;

/**
 * Summary: Returns the localized display label for an equipped tool slot.
 * @param tool Equipped tool slot.
 * @returns Localized tool name.
 */
export function getEquippedToolLabel(tool: EquippedToolSlot = 'bow'): string {
  return t(`combat.tools.${tool}`);
}


/**
 * Summary: Returns the localized display label for an arrow element type.
 * @param kind The weather or arrow kind.
 * @returns Localized arrow name.
 */
export function getArrowKindLabel(kind: ArrowElementKind = 'normal'): string {
  return t(`combat.arrows.${kind}`);
}


/**
 * Summary: Calculates the gold payout for selling an inventory item at market stalls.
 * @param item Item definition.
 * @returns Gold paid by a merchant for the item.
 */
export function getMarketSellPrice(item: IInventoryItemDef): number {
  return Math.max(MARKET_MIN_SELL_PRICE, Math.round(item.valueGold * MARKET_SELL_RATIO));
}

/**
 * Summary: Tells the UI whether selling this item needs an explicit "are you sure" step.
 * Design: Loot-only items (dragon parts) cannot be bought back from any merchant, so a
 *         mis-click would lose them for good; regular stock can be re-bought.
 * @param itemId Identifier of the item the player is about to sell.
 * @returns true for loot-only catalog items; false for everything else, including unknown ids.
 */
export function requiresSellConfirmation(itemId: InventoryItemId): boolean {
  return INVENTORY_ITEM_MAP.get(itemId)?.lootOnly === true;
}
// #endregion


// ======================== SPATIAL INDEXING BROAD-PHASE ======================== \\
// #region Spatial Indexing Broad-Phase
/**
 * Summary: 2D Spatial Hash Grid partitioning objects on the X/Z horizontal plane.
 * Design: Objects are bucketed per cell; a query returns the objects of the cells it
 *         touches, giving O(1) candidate lookups for the collision broad phase.
 */
export class SpatialHashGrid2D<T> {
  private readonly cellSize: number;
  private readonly cells: Map<string, T[]> = new Map();

  constructor(cellSize = 32) {
    this.cellSize = cellSize;
  }

  private key(cellX: number, cellZ: number): string {
    return `${cellX}_${cellZ}`;
  }

  public insert(item: T, minX: number, maxX: number, minZ: number, maxZ: number): void {
    const minCellX = Math.floor(minX / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const minCellZ = Math.floor(minZ / this.cellSize);
    const maxCellZ = Math.floor(maxZ / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const k = this.key(cx, cz);
        let list = this.cells.get(k);
        if (!list) {
          list = [];
          this.cells.set(k, list);
        }
        list.push(item);
      }
    }
  }

  public query(x: number, z: number): readonly T[] {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return this.cells.get(this.key(cx, cz)) ?? [];
  }
}

/** Precomputed spatial grid for all static solid building collision boxes. */
export const SOLID_BUILDING_SPATIAL_GRID = new SpatialHashGrid2D<ISolidBuildingBox>(32);
for (const box of SOLID_BUILDING_BOXES) {
  SOLID_BUILDING_SPATIAL_GRID.insert(box, box.minX, box.maxX, box.minZ, box.maxZ);
}

/** Precomputed spatial grid for archery targets. */
export const ARCHERY_TARGETS_SPATIAL_GRID = new SpatialHashGrid2D<IArcheryTargetDef>(32);
for (const tgt of ARCHERY_TARGETS) {
  const r = tgt.bullseyeRadius + 1.0;
  ARCHERY_TARGETS_SPATIAL_GRID.insert(tgt, tgt.x - r, tgt.x + r, tgt.z - r, tgt.z + r);
}

/**
 * Summary: Get nearby solid building boxes.
 * Design: Standard function implementing domain specifications and behavioral contracts.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns Building collision boxes close to the point.
 */
export function getNearbySolidBuildingBoxes(x: number, z: number): readonly ISolidBuildingBox[] {
  return SOLID_BUILDING_SPATIAL_GRID.query(x, z);
}

/**
 * Summary: Get nearby archery targets.
 * Design: Standard function implementing domain specifications and behavioral contracts.
 * @param x World X in meters.
 * @param z World Z in meters.
 * @returns Archery targets close to the point.
 */
export function getNearbyArcheryTargets(x: number, z: number): readonly IArcheryTargetDef[] {
  return ARCHERY_TARGETS_SPATIAL_GRID.query(x, z);
}
// #endregion

// ======================== EQUIPMENT STRATEGY PATTERN ======================== \\
// #region Equipment Strategy Pattern
/**
 * Summary: Strategy interface for item equipment checks and activation dispatch.
 * Design: One strategy per slot kind, looked up in EQUIPMENT_STRATEGY_MAP by item id,
 *         instead of a switch over item kinds.
 */
export interface IEquipmentSlotStrategy {
  isEquipped(state: IPlayerState, itemId: InventoryItemId): boolean;
  equip(state: IPlayerState, itemId: InventoryItemId): void;
}

class BowEquipmentStrategy implements IEquipmentSlotStrategy {
  isEquipped(state: IPlayerState, itemId: InventoryItemId): boolean {
    const tool = state.equippedTool ?? 'bow';
    const activeWep = state.activeWeaponId ?? tool;
    return tool === 'bow' && activeWep === itemId;
  }

  equip(state: IPlayerState, itemId: InventoryItemId): void {
    state.equippedTool = 'bow';
    state.activeWeaponId = itemId;
  }
}

class SwordEquipmentStrategy implements IEquipmentSlotStrategy {
  isEquipped(state: IPlayerState, itemId: InventoryItemId): boolean {
    const tool = state.equippedTool ?? 'bow';
    const activeWep = state.activeWeaponId ?? tool;
    return tool === 'sword' && activeWep === itemId;
  }

  equip(state: IPlayerState, itemId: InventoryItemId): void {
    state.equippedTool = 'sword';
    state.activeWeaponId = itemId;
    state.bowDrawn = false;
    state.bowDrawProgress = 0;
  }
}

class ToolEquipmentStrategy implements IEquipmentSlotStrategy {
  constructor(private readonly toolSlot: EquippedToolSlot) {}

  isEquipped(state: IPlayerState): boolean {
    return (state.equippedTool ?? 'bow') === this.toolSlot;
  }

  equip(state: IPlayerState, itemId: InventoryItemId): void {
    state.equippedTool = this.toolSlot;
    state.activeWeaponId = itemId;
    state.bowDrawn = false;
    state.bowDrawProgress = 0;
  }
}

class ArrowEquipmentStrategy implements IEquipmentSlotStrategy {
  constructor(private readonly arrowKind: ArrowElementKind) {}

  isEquipped(state: IPlayerState): boolean {
    return (state.arrowKind ?? 'normal') === this.arrowKind;
  }

  equip(state: IPlayerState): void {
    state.arrowKind = this.arrowKind;
    state.equippedTool = 'bow';
  }
}

class UsableGearStrategy implements IEquipmentSlotStrategy {
  constructor(
    private readonly skillName: 'exploration' | 'athletics',
    private readonly xp: number,
    private readonly restoresStamina: boolean = false
  ) {}

  isEquipped(): boolean {
    return false;
  }

  equip(state: IPlayerState): void {
    if (this.restoresStamina) {
      state.stamina = state.maxStamina ?? 100;
    }
    awardSkillXp(state, this.skillName, this.xp);
  }
}

const bowStrategy = new BowEquipmentStrategy();
const swordStrategy = new SwordEquipmentStrategy();
const torchStrategy = new ToolEquipmentStrategy('torch');
const unarmedStrategy = new ToolEquipmentStrategy('unarmed');
const arrowNormalStrategy = new ArrowEquipmentStrategy('normal');
const arrowFireStrategy = new ArrowEquipmentStrategy('fire');
const arrowWindStrategy = new ArrowEquipmentStrategy('wind');
const hornStrategy = new UsableGearStrategy('exploration', 12, true);
const meatStrategy = new UsableGearStrategy('athletics', 14, true);
const materialStrategy = new UsableGearStrategy('exploration', 10);
const cloakStrategy = new UsableGearStrategy('athletics', 10);

export const EQUIPMENT_STRATEGY_MAP: ReadonlyMap<InventoryItemId, IEquipmentSlotStrategy> = new Map<
  InventoryItemId,
  IEquipmentSlotStrategy
>([
  ['bow', bowStrategy],
  ['elven_longbow', bowStrategy],
  ['dragonbone_bow', bowStrategy],

  ['sword', swordStrategy],
  ['katana_imperial', swordStrategy],
  ['dwarven_warhammer', swordStrategy],
  ['celestial_jin_sword', swordStrategy],

  ['torch', torchStrategy],
  ['unarmed', unarmedStrategy],

  ['arrow_normal', arrowNormalStrategy],
  ['arrow_fire', arrowFireStrategy],
  ['arrow_wind', arrowWindStrategy],

  ['ancient_dwarven_horn', hornStrategy],
  ['elven_cloak', cloakStrategy],
  ['raw_game_meat', meatStrategy],
  ['deer_meat', meatStrategy],
  ['bear_meat', meatStrategy],
  ['rotten_meat', meatStrategy],
  ['roasted_meat', meatStrategy],
  ['fresh_bread_loaf', meatStrategy],
  ['harbor_cheese_wheel', meatStrategy],
  ['red_orchard_apples', meatStrategy],

  ['oak_timber', materialStrategy],
  ['cut_granite_blocks', materialStrategy],
  ['iron_ingots', materialStrategy],
  ['imperial_clay_tiles', materialStrategy],
  ['marble_pillar_stone', materialStrategy],
  ['dwarven_gold_ore', materialStrategy],
  ['crystal_gem', materialStrategy],
  ['small_hide', materialStrategy],
  ['deer_hide', materialStrategy],
  ['sheep_hide', materialStrategy],
  ['wolf_hide', materialStrategy],
  ['jaguar_hide', materialStrategy],
  ['crocodile_hide', materialStrategy],
  ['bear_hide', materialStrategy],
  ['rhino_hide', materialStrategy],
  ['deer_antlers', materialStrategy],
  ['animal_bone', materialStrategy],
  ['animal_fat', materialStrategy],
  ['bear_claws', materialStrategy],
  ['wolf_fang', materialStrategy],
  ['crocodile_teeth', materialStrategy],
  ['rhino_horn', materialStrategy],
  ['dragon_meat', meatStrategy],
  ['dragon_scales', materialStrategy],
  ['dragon_horn', materialStrategy],
  ['dragon_claws', materialStrategy],
  ['dragon_bone', materialStrategy],
]);
// #endregion

// ======================== INVENTORY & MARKET OPERATIONS ======================== \\
// #region Inventory & Market Operations
/**
 * Summary: Checks whether the player owns a specified inventory item.
 * @param state Player state (read only).
 * @param itemId Inventory item id.
 * @returns True when the item is in the player's inventory.
 */
export function isInventoryItemOwned(state: IPlayerState, itemId: InventoryItemId): boolean {
  if (!state.ownedItemIds) {
    const def = INVENTORY_ITEM_MAP.get(itemId);
    return Boolean(def?.starterOwned);
  }
  return state.ownedItemIds.includes(itemId);
}

/**
 * Summary: Checks whether the player currently has an inventory item actively equipped.
 * Note: Dispatches via O(1) Strategy Map lookup.
 * @param state Player state (read only).
 * @param itemId Inventory item id.
 * @returns True when the item is the active weapon or arrow.
 */
export function isInventoryItemEquipped(state: IPlayerState, itemId: InventoryItemId): boolean {
  const strategy = EQUIPMENT_STRATEGY_MAP.get(itemId);
  return strategy ? strategy.isEquipped(state, itemId) : false;
}

/**
 * Summary: Equips an inventory item to the appropriate active weapon or arrow slot.
 * Note: Dispatches via O(1) Strategy Map lookup.
 * @param state Player state; updated in place.
 * @param itemId Inventory item id.
 */
export function equipInventoryItem(state: IPlayerState, itemId: InventoryItemId): void {
  const strategy = EQUIPMENT_STRATEGY_MAP.get(itemId);
  if (strategy) {
    strategy.equip(state, itemId);
  }
}

import type {
  MarketTransactionErrorCode,
  IBuyMarketItemPayload,
  ISellMarketItemPayload,
} from '../domain/worldTypes';
export type {
  MarketTransactionErrorCode,
  IBuyMarketItemPayload,
  ISellMarketItemPayload,
};

/**
 * Summary: Extended Result container for market transactions supporting legacy and typed accessors.
 * Design: Extends core Result to satisfy errors-logging while maintaining zero-breakage backwards compatibility.
 */
export class MarketTransactionResult<T, E = string> extends Result<T, E> {
  public readonly goldCoins: number;
  public readonly requiredLevel?: number;
  public readonly playerLevel?: number;
  public readonly soldForGold?: number;

  public constructor(
    isSuccess: boolean,
    value: T | undefined,
    error: E | undefined,
    details: { goldCoins: number; requiredLevel?: number; playerLevel?: number; soldForGold?: number }
  ) {
    super(isSuccess, value, error);
    this.goldCoins = details.goldCoins;
    this.requiredLevel = details.requiredLevel;
    this.playerLevel = details.playerLevel;
    this.soldForGold = details.soldForGold;
    Object.freeze(this);
  }

  public static success<T>(
    value: T,
    details: { goldCoins: number; requiredLevel?: number; playerLevel?: number; soldForGold?: number }
  ): MarketTransactionResult<T, never> {
    return new MarketTransactionResult<T, never>(true, value, undefined as never, details);
  }

  public static failure<E = string>(
    error: E,
    details: { goldCoins: number; requiredLevel?: number; playerLevel?: number; soldForGold?: number }
  ): MarketTransactionResult<never, E> {
    return new MarketTransactionResult<never, E>(false, undefined as never, error, details);
  }
}

/**
 * Summary: Purchases an item from a market stall if within range, level-eligible, and affordable.
 * Design: Guard clauses validate proximity, item presence, prior ownership, level gating, and currency.
 * @param state Player runtime state container.
 * @param itemId Item to purchase.
 * @returns Result.ok with payload on success, or Result.fail with error code.
 */
export function buyMarketItem(
  state: IPlayerState,
  itemId: InventoryItemId
): MarketTransactionResult<IBuyMarketItemPayload, MarketTransactionErrorCode> {
  const nearMarket = findNearestMarketStall(state.x, state.z);
  if (!nearMarket) {
    return MarketTransactionResult.failure('NOT_IN_MARKET', { goldCoins: state.goldCoins ?? 0 });
  }
  const def = INVENTORY_ITEM_MAP.get(itemId);
  if (!def) {
    return MarketTransactionResult.failure('ITEM_NOT_FOUND', { goldCoins: state.goldCoins ?? 0 });
  }
  if (def.lootOnly) {
    return MarketTransactionResult.failure('NOT_SOLD_BY_MERCHANTS', { goldCoins: state.goldCoins ?? 0 });
  }
  if (!state.ownedItemIds) {
    state.ownedItemIds = [...DEFAULT_STARTER_OWNED_ITEM_IDS];
  }
  if (state.ownedItemIds.includes(itemId)) {
    return MarketTransactionResult.failure('ALREADY_OWNED', { goldCoins: state.goldCoins ?? 0 });
  }
  const playerLevel = getPlayerHeroLevel(state);
  if (playerLevel < def.requiredLevel) {
    return MarketTransactionResult.failure('LEVEL_TOO_LOW', {
      goldCoins: state.goldCoins ?? 0,
      requiredLevel: def.requiredLevel,
      playerLevel,
    });
  }
  const currentGold = state.goldCoins ?? 0;
  if (currentGold < def.valueGold) {
    return MarketTransactionResult.failure('INSUFFICIENT_GOLD', { goldCoins: currentGold });
  }
  state.goldCoins = currentGold - def.valueGold;
  state.ownedItemIds.push(itemId);
  if (def.weaponRole) {
    equipInventoryItem(state, itemId);
  }
  return MarketTransactionResult.success(
    { goldCoins: state.goldCoins, requiredLevel: def.requiredLevel, playerLevel },
    { goldCoins: state.goldCoins, requiredLevel: def.requiredLevel, playerLevel }
  );
}

/**
 * Summary: Sells an owned inventory item to a nearby market stall.
 * Design: Validates market stall proximity and inventory possession before awarding currency.
 * @param state Player runtime state container.
 * @param itemId Item to sell.
 * @returns Result.ok with payload on success, or Result.fail with error code.
 */
export function sellMarketItem(
  state: IPlayerState,
  itemId: InventoryItemId
): MarketTransactionResult<ISellMarketItemPayload, MarketTransactionErrorCode> {
  const nearMarket = findNearestMarketStall(state.x, state.z);
  if (!nearMarket) {
    return MarketTransactionResult.failure('NOT_IN_MARKET', {
      goldCoins: state.goldCoins ?? 0,
      soldForGold: 0,
    });
  }
  if (itemId === 'unarmed') {
    return MarketTransactionResult.failure('CANNOT_SELL', {
      goldCoins: state.goldCoins ?? 0,
      soldForGold: 0,
    });
  }
  const def = INVENTORY_ITEM_MAP.get(itemId);
  if (!def) {
    return MarketTransactionResult.failure('NOT_OWNED', {
      goldCoins: state.goldCoins ?? 0,
      soldForGold: 0,
    });
  }
  if (!state.ownedItemIds) {
    state.ownedItemIds = [...DEFAULT_STARTER_OWNED_ITEM_IDS];
  }
  const idx = state.ownedItemIds.indexOf(itemId);
  if (idx === -1) {
    return MarketTransactionResult.failure('NOT_OWNED', {
      goldCoins: state.goldCoins ?? 0,
      soldForGold: 0,
    });
  }
  const sellPrice = getMarketSellPrice(def);
  state.ownedItemIds.splice(idx, 1);
  state.goldCoins = (state.goldCoins ?? 0) + sellPrice;

  if (state.activeWeaponId === itemId || state.equippedTool === itemId) {
    const fallbackWeapon = state.ownedItemIds.find((id: InventoryItemId) => {
      const d = INVENTORY_ITEM_MAP.get(id);
      return d?.weaponRole === 'bow' || d?.weaponRole === 'sword';
    });
    equipInventoryItem(state, fallbackWeapon ?? 'unarmed');
  }

  return MarketTransactionResult.success(
    { goldCoins: state.goldCoins, soldForGold: sellPrice },
    { goldCoins: state.goldCoins, soldForGold: sellPrice }
  );
}

/**
 * Summary: Assigns an inventory item to one of the 4 hotbar quick slots.
 * @param state Player state; updated in place.
 * @param slotIndex Hotbar slot, 0-3.
 * @param itemId Inventory item id.
 */
export function assignHotbarSlot(
  state: IPlayerState,
  slotIndex: 0 | 1 | 2 | 3,
  itemId: InventoryItemId
): void {
  if (!state.hotbarSlots) {
    state.hotbarSlots = ['bow', 'torch', 'sword', 'unarmed'];
  }
  for (let i = 0; i < 4; i++) {
    if (state.hotbarSlots[i] === itemId && i !== slotIndex) {
      state.hotbarSlots[i] = null;
    }
  }
  state.hotbarSlots[slotIndex] = itemId;
}

/**
 * Summary: Toggles the favorite status of an inventory item for quick-menu filtering.
 * @param state Player state; updated in place.
 * @param itemId Inventory item id.
 * @returns True when the item is a favorite after the toggle.
 */
export function toggleFavoriteItem(state: IPlayerState, itemId: InventoryItemId): boolean {
  if (!state.favoriteIds) {
    state.favoriteIds = ['bow', 'torch', 'sword', 'arrow_normal', 'arrow_fire', 'arrow_wind', 'unarmed'];
  }
  const idx = state.favoriteIds.indexOf(itemId);
  if (idx >= 0) {
    state.favoriteIds.splice(idx, 1);
    return false;
  }
  state.favoriteIds.push(itemId);
  return true;
}
// #endregion

// ======================== SWORD MELEE COMBAT ======================== \\
// #region Sword Melee Combat
/**
 * Summary: I sword slash hit result.
 * Design: Standard interface implementing domain specifications and behavioral contracts.
 */
export interface ISwordSlashHitResult {
  readonly comboIndex: number;
  readonly isHeavy: boolean;
  readonly hitKind: 'none' | 'target' | 'obstacle' | 'wall';
  readonly hitTarget: IArcheryTargetDef | null;
  readonly hitAnimal?: ISmallAnimalState | null;
  readonly killedAnimal?: boolean;
  readonly hitAnySurface: boolean;
}

/**
 * Summary: Evaluates melee hit detection during the Phase C Active Strike Window.
 * Note: [HOT-PATH EXCEPTION] Ray-marches and mutates combat state directly.
 * Relaxed Rule: Rule 1 (in-place state mutation instead of immutable reconstruction).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.04ms per swing frame.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @param state Player state; updated in place.
 * @param obstacles Static collision cylinders.
 * @returns What the strike hit, if anything (target, obstacle, wall or animal).
 */
export function evaluateSwordStrikeWindowHit(
  state: IPlayerState,
  obstacles: readonly IObstacleCylinder[] = []
): ISwordSlashHitResult {
  const isHeavy = Boolean(state.swordHeavyAttack);
  const comboIndex = state.swordComboIndex ?? 0;

  const cosP = Math.cos(state.pitch);
  const sinP = Math.sin(state.pitch);
  const dirX = -Math.sin(state.yaw) * cosP;
  const dirY = sinP;
  const dirZ = -Math.cos(state.yaw) * cosP;
  const isMountedStag = Boolean(state.mountedHorseId?.startsWith('mount-stag-'));
  const isMountedLion = Boolean(state.mountedHorseId?.startsWith('mount-lion-'));
  const eyeY =
    state.y +
    (isMountedLion
      ? 2.98
      : isMountedStag
        ? 2.56
        : state.mountedHorseId
          ? 2.22
          : PLAYER_EYE_HEIGHT * 0.88);
  const horseYaw = state.mountedHorseId ? (state.mountedHorseYaw ?? state.yaw) : state.yaw;
  const mountBackOffset = isMountedLion ? 0.28 : 0;
  const originX = state.x + Math.sin(horseYaw) * mountBackOffset;
  const originZ = state.z + Math.cos(horseYaw) * mountBackOffset;

  if (isHeavy) {
    if (!state.isSwimming) {
      state.vx += -Math.sin(state.yaw) * 3.6;
      state.vz += -Math.cos(state.yaw) * 3.6;
    }
    state.lastSwordAirWave = {
      startX: originX + dirX * 0.72,
      startY: eyeY + dirY * 0.72 - 0.06,
      startZ: originZ + dirZ * 0.72,
      dirX,
      dirY,
      dirZ,
      yaw: state.yaw,
      pitch: state.pitch,
      age: 0,
    };
  }

  const activeAnimals = getActiveWorldAnimals();
  const maxReach = isHeavy ? SWORD_HEAVY_REACH : SWORD_LIGHT_REACH;
  for (let d = 0.75; d <= maxReach; d += 0.25) {
    const sx = originX + dirX * d;
    const sy = eyeY + dirY * d;
    const sz = originZ + dirZ * d;

    const nearbyTargets = getNearbyArcheryTargets(sx, sz);
    for (let t = 0; t < nearbyTargets.length; t++) {
      const tgt = nearbyTargets[t];
      const baseY = walkableHeightAt(tgt.x, tgt.z).height;
      const centerY = baseY + 1.35;
      if (Math.hypot(sx - tgt.x, sy - centerY, sz - tgt.z) <= tgt.bullseyeRadius + (isHeavy ? 0.45 : 0.25)) {
        state.lastSwordHitPoint = { x: sx, y: sy, z: sz, age: 0, kind: 'target' };
        state.lastArrowHitTarget = tgt.id;
        state.swordHitStopTimer = 0.042;
        awardSkillXp(state, 'swordsmanship', 18);
        return { comboIndex, isHeavy, hitKind: 'target', hitTarget: tgt, hitAnySurface: true };
      }
    }

    for (let a = 0; a < activeAnimals.length; a++) {
      const anim = activeAnimals[a];
      if (anim.isDead || anim.isLooted || anim.isTamed || anim.isMountedByPlayer) continue;
      const animRad =
        anim.species === 'dragon'
          ? 5.2
          : anim.species === 'bear'
            ? 2.35
            : anim.species === 'crocodile'
              ? 2.65
              : anim.species === 'rhino'
                ? 2.65
                : anim.species === 'stag'
                  ? 2.15
                  : anim.species === 'deer'
                    ? 1.55
                    : anim.species === 'lion' && anim.isBoss
                      ? 3.15
                      : anim.species === 'jaguar' || anim.species === 'wolf' || anim.species === 'lion'
                        ? 1.48
                        : anim.species === 'sheep'
                          ? 1.15
                          : 0.95;
      // Use anim.y ?? walkableHeightAt(anim.x, anim.z).height so bears inside mountain caves (at cave.floorY) and flying dragons are accurately hit!
      const animGroundY = anim.y ?? walkableHeightAt(anim.x, anim.z).height;
      const animCenterY =
        animGroundY +
        (anim.species === 'dragon'
          ? 2.85
          : anim.species === 'lion' && anim.isBoss
            ? 1.55
            : anim.species === 'bear'
              ? 1.45
              : anim.species === 'rhino'
                ? 1.45
                : anim.species === 'deer' || anim.species === 'stag'
                  ? 1.15
                  : anim.species === 'jaguar' || anim.species === 'wolf' || anim.species === 'lion'
                    ? 0.90
                    : anim.species === 'sheep'
                      ? 0.55
                      : anim.species === 'crocodile'
                        ? 0.65
                        : 0.25);
      const animHalfH =
        anim.species === 'dragon'
          ? 4.2
          : anim.species === 'lion' && anim.isBoss
            ? 2.35
            : anim.species === 'bear' || anim.species === 'rhino'
              ? 2.25
              : anim.species === 'deer' || anim.species === 'stag'
                ? 1.55
                : 1.45;
      if (
        Math.hypot(sx - anim.x, sz - anim.z) <= animRad + (isHeavy ? 0.45 : 0.2) &&
        Math.abs(sy - animCenterY) <= animHalfH
      ) {
        const dmgRes = damageGroundAnimal(
          anim,
          isHeavy ? BASE_ARROW_HIT_DAMAGE * 2 : BASE_ARROW_HIT_DAMAGE,
          state.x,
          state.z
        );
        state.lastSwordHitPoint = { x: sx, y: animCenterY, z: sz, age: 0, kind: 'target' };
        state.lastArrowHitTarget = String(anim.id);
        state.swordHitStopTimer = 0.045;
        awardSkillXp(state, 'swordsmanship', dmgRes.killed ? 28 : 14);
        return {
          comboIndex,
          isHeavy,
          hitKind: 'target',
          hitTarget: null,
          hitAnimal: anim,
          killedAnimal: dmgRes.killed,
          hitAnySurface: true,
        };
      }
    }

    for (let o = 0; o < obstacles.length; o++) {
      const obs = obstacles[o];
      if (Math.abs(sx - obs.x) > 1.8 || Math.abs(sz - obs.z) > 1.8) continue;
      const obsGroundY = groundHeightAt(obs.x, obs.z);
      const obsMaxH =
        obs.kind === 'boulder'
          ? obsGroundY + obs.radius * 0.95
          : obs.kind === 'pillar'
            ? obsGroundY + obs.scale * 3.2
            : obsGroundY + obs.scale * 4.5;
      const hitRad =
        obs.kind === 'boulder'
          ? obs.radius * 0.92
          : obs.kind === 'pillar'
            ? obs.radius
            : obs.radius * 0.52;
      if (sy >= obsGroundY && sy <= obsMaxH && Math.hypot(sx - obs.x, sz - obs.z) <= hitRad + 0.18) {
        state.lastSwordHitPoint = { x: sx, y: sy, z: sz, age: 0, kind: 'obstacle' };
        state.swordHitStopTimer = 0.048;
        return { comboIndex, isHeavy, hitKind: 'obstacle', hitTarget: null, hitAnySurface: true };
      }
    }

    const nearbyBoxes = getNearbySolidBuildingBoxes(sx, sz);
    for (let b = 0; b < nearbyBoxes.length; b++) {
      const box = nearbyBoxes[b];
      if (sx >= box.minX && sx <= box.maxX && sz >= box.minZ && sz <= box.maxZ) {
        if (box.minY !== undefined && sy < box.minY) continue;
        if (box.maxY !== undefined && sy > box.maxY) continue;
        state.lastSwordHitPoint = { x: sx, y: sy, z: sz, age: 0, kind: 'wall' };
        state.swordHitStopTimer = 0.048;
        return { comboIndex, isHeavy, hitKind: 'obstacle', hitTarget: null, hitAnySurface: true };
      }
    }
  }

  return { comboIndex, isHeavy, hitKind: 'none', hitTarget: null, hitAnySurface: false };
}

/**
 * Summary: Initiates a sword attack swing, advances combo chain, and consumes stamina.
 * @param state Player state; updated in place.
 * @param obstacles Static collision cylinders.
 * @param isHeavy True for a heavy (charged) attack.
 * @param deferHitToStrikeWindow True to check hits later, in the strike window, instead of now.
 * @returns Hit result of an immediate strike (empty when the hit is deferred to the strike window).
 */
export function triggerSwordSlash(
  state: IPlayerState,
  obstacles: readonly IObstacleCylinder[] = [],
  isHeavy = false,
  deferHitToStrikeWindow = false
): ISwordSlashHitResult {
  state.equippedTool = 'sword';
  state.bowDrawn = false;
  state.bowDrawProgress = 0;
  state.swordBlocking = false;
  state.swordChargeTime = 0;
  state.swordHeavyAttack = isHeavy;
  const nextCombo = isHeavy ? 2 : ((state.swordComboIndex ?? -1) + 1) % 3;
  state.swordComboIndex = nextCombo;
  state.swordSwingProgress = 0.01;
  state.swordHitStopTimer = 0;

  const stamCost = isHeavy ? STAMINA_COST_HEAVY_SWORD : STAMINA_COST_LIGHT_SWORD;
  state.stamina = Math.max(5, (state.stamina ?? 100) - stamCost);
  awardSkillXp(state, 'swordsmanship', isHeavy ? 12 : 6);

  if (deferHitToStrikeWindow) {
    state.swordStrikePending = true;
    state.lastSwordHitPoint = null;
    state.lastSwordAirWave = null;
    return {
      comboIndex: nextCombo,
      isHeavy,
      hitKind: 'none',
      hitTarget: null,
      hitAnySurface: false,
    };
  }

  state.swordStrikePending = false;
  return evaluateSwordStrikeWindowHit(state, obstacles);
}

/**
 * Summary: Steps the 5-phase sword attack progress over time and executes hit checks in the strike window.
 * Note: [HOT-PATH EXCEPTION] Evaluated in 60FPS combat simulation tick.
 * @param state Player state; updated in place.
 * @param obstacles Static collision cylinders.
 * @param dt Step length in seconds.
 * @returns Hit result when the strike window connected this step, otherwise null.
 */
export function stepSwordSwingCombat(
  state: IPlayerState,
  obstacles: readonly IObstacleCylinder[],
  dt: number
): ISwordSlashHitResult | null {
  if (state.swordDebugFreezeProgress !== undefined && state.swordDebugFreezeProgress !== null) {
    state.swordSwingProgress = state.swordDebugFreezeProgress;
    return null;
  }
  const curr = state.swordSwingProgress ?? 0;
  if (curr <= 0) return null;

  let effDt = dt;
  if ((state.swordHitStopTimer ?? 0) > 0) {
    state.swordHitStopTimer = Math.max(0, (state.swordHitStopTimer ?? 0) - dt);
    effDt = dt * 0.42; // Tactile resistance slows the blade briefly at impact contact
  }

  const swingDur = state.swordHeavyAttack ? 0.68 : 0.54;
  const nextProg = curr + effDt / swingDur;

  let strikeResult: ISwordSlashHitResult | null = null;
  if (
    state.swordStrikePending &&
    nextProg >= SWORD_STRIKE_CONTACT_APEX &&
    curr <= SWORD_ACTIVE_STRIKE_WINDOW_END
  ) {
    state.swordStrikePending = false;
    state.swordSwingProgress = Math.min(nextProg, SWORD_ACTIVE_STRIKE_WINDOW_END);
    strikeResult = evaluateSwordStrikeWindowHit(state, obstacles);
  }

  if (nextProg >= 1.0) {
    state.swordSwingProgress = 0;
    state.swordHeavyAttack = false;
    state.swordStrikePending = false;
    state.swordHitStopTimer = 0;
  } else {
    state.swordSwingProgress = nextProg;
  }

  return strikeResult;
}
// #endregion

// ======================== ARROW BALLISTIC PROJECTILES ======================== \\
// #region Arrow Ballistic Projectiles
/**
 * Summary: Instantiates a ballistic arrow projectile based on player aim and bow power.
 * @param state Player state; updated in place.
 * @param drawPower Bow draw, 0-1.
 * @param nextIdGenerator Id source for the arrow (tests pass a fixed one).
 * @returns The new arrow in flight.
 */
export function spawnArrowProjectile(
  state: IPlayerState,
  drawPower = 1.0,
  nextIdGenerator?: () => number
): IArrowProjectile {
  awardSkillXp(state, 'archery', Math.round(5 + drawPower * 4));
  const clampedPower = Math.max(MIN_BOW_DRAW_TO_SHOOT, Math.min(1.0, drawPower));
  const drawNorm = Math.max(0, Math.min(1, (clampedPower - MIN_BOW_DRAW_TO_SHOOT) / (1.0 - MIN_BOW_DRAW_TO_SHOOT)));
  const kind: ArrowElementKind = state.arrowKind ?? 'normal';
  const activeBowBonus =
    state.activeWeaponId === 'dragonbone_bow'
      ? 1.32
      : state.activeWeaponId === 'elven_longbow'
        ? 1.2
        : 1.0;
  // Stronger bow draw flies much further: 16 m/s at minimum draw up to 62 m/s at full draw
  const baseSpeed = (16.0 + Math.pow(drawNorm, 1.12) * 46.0) * activeBowBonus;
  const speed = kind === 'wind' ? baseSpeed * 1.42 : baseSpeed;
  const cosP = Math.cos(state.pitch);
  const sinP = Math.sin(state.pitch);
  const dirX = -Math.sin(state.yaw) * cosP;
  const dirY = sinP + (kind === 'wind' ? 0.012 : 0.032);
  const dirZ = -Math.cos(state.yaw) * cosP;
  const dirLen = Math.hypot(dirX, dirY, dirZ) || 1;
  const nx = dirX / dirLen;
  const ny = dirY / dirLen;
  const nz = dirZ / dirLen;

  const isMounted = Boolean(state.mountedHorseId);
  const isMountedStag = Boolean(state.mountedHorseId?.startsWith('mount-stag-'));
  const isMountedLion = Boolean(state.mountedHorseId?.startsWith('mount-lion-'));
  const isFirstPerson = state.cameraPerspective === 'first_person';
  const shoulderY =
    state.y +
    (isMountedLion ? 2.96 : isMountedStag ? 2.54 : isMounted ? 2.18 : isFirstPerson ? 1.56 : 1.44);
  const horseYaw = isMounted ? (state.mountedHorseYaw ?? state.yaw) : state.yaw;
  const mountBackOffset = isMountedLion ? 0.28 : 0;
  const sideScale = isFirstPerson ? -0.06 : 0.14;
  const rightOffX = Math.cos(state.yaw) * sideScale;
  const rightOffZ = -Math.sin(state.yaw) * sideScale;

  const startX = state.x + Math.sin(horseYaw) * mountBackOffset + rightOffX + nx * 0.72;
  const startY = shoulderY + ny * 0.72;
  const startZ = state.z + Math.cos(horseYaw) * mountBackOffset + rightOffZ + nz * 0.72;

  return {
    id: nextIdGenerator ? nextIdGenerator() : (state.nextArrowId = (state.nextArrowId ?? 1) + 1) - 1,
    x: startX,
    y: startY,
    z: startZ,
    vx: nx * speed,
    vy: ny * speed,
    vz: nz * speed,
    yaw: state.yaw,
    pitch: Math.asin(Math.max(-0.99, Math.min(0.99, ny))),
    arrowKind: kind,
    stuck: false,
    hitKind: 'none',
    hitTargetId: null,
    age: 0,
    trail: [{ x: startX, y: startY, z: startZ, age: 0 }],
  };
}

/**
 * Summary: Steps physics integration, gravity, and collision detection for all flying arrows.
 * Note: [HOT-PATH EXCEPTION] 60FPS arrow sub-step integration loop with in-place mutation.
 * @param arrows Arrows in flight; updated in place.
 * @param obstacles Static collision cylinders.
 * @param rawDt Step length in seconds (clamped inside).
 * @returns What the arrows hit this step (target, animal or any surface).
 */
export function stepArrowsPhysics(
  arrows: IArrowProjectile[],
  obstacles: readonly IObstacleCylinder[],
  rawDt: number
): {
  hitTarget: IArcheryTargetDef | null;
  hitAnimal?: ISmallAnimalState | null;
  killedAnimal?: boolean;
  hitAnySurface: boolean;
} {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
  let hitTarget: IArcheryTargetDef | null = null;
  let hitAnimal: ISmallAnimalState | null = null;
  let killedAnimal = false;
  let hitAnySurface = false;
  const activeAnimals = getActiveWorldAnimals();

  for (let i = 0; i < arrows.length; i++) {
    const arr = arrows[i];
    arr.age += dt;
    if (!arr.trail) arr.trail = [];

    for (let p = arr.trail.length - 1; p >= 0; p--) {
      arr.trail[p].age += dt;
      if (arr.trail[p].age > ARROW_TRAIL_MAX_AGE) {
        arr.trail.splice(p, 1);
      }
    }

    if (arr.stuck) {
      // Keep arrows embedded in animals moving with the animal (whether running or lying dead on the ground!)
      if (arr.hitKind === 'animal' && arr.attachedAnimalId !== undefined) {
        let hostAnim: ISmallAnimalState | undefined;
        for (let a = 0; a < activeAnimals.length; a++) {
          if (activeAnimals[a].id === arr.attachedAnimalId) {
            hostAnim = activeAnimals[a];
            break;
          }
        }
        if (!hostAnim || hostAnim.isLooted || hostAnim.isTamed || hostAnim.isMountedByPlayer) {
          // Animal was looted, tamed, or despawned — remove stuck arrow from world so it never floats in empty air
          arrows.splice(i, 1);
          i--;
          continue;
        }
        const cosY = Math.cos(hostAnim.yaw);
        const sinY = Math.sin(hostAnim.yaw);
        const lox = arr.localOffsetX ?? 0;
        const loz = arr.localOffsetZ ?? 0;
        const loy = arr.localOffsetY ?? 0.65;
        const baseAnimY =
          (hostAnim.y ?? walkableHeightAt(hostAnim.x, hostAnim.z).height) +
          (hostAnim.pounceHeight ?? 0);
        if (hostAnim.isDead) {
          // When the animal falls dead on its side (roll = PI/2), transform local offset so the arrow stays stuck in the fallen body
          arr.x = hostAnim.x + lox * 0.45 * cosY + loz * sinY;
          arr.z = hostAnim.z - lox * 0.45 * sinY + loz * cosY;
          arr.y = baseAnimY + Math.max(0.18, loy * 0.38);
        } else {
          arr.x = hostAnim.x + lox * cosY + loz * sinY;
          arr.z = hostAnim.z - lox * sinY + loz * cosY;
          arr.y = baseAnimY + loy;
        }
        arr.yaw = hostAnim.yaw + (arr.localYawOffset ?? 0);
      }
      continue;
    }

    const grav = arr.arrowKind === 'wind' ? 2.6 : 9.8;
    const subSteps = 4;
    const subDt = dt / subSteps;
    for (let s = 0; s < subSteps; s++) {
      const prevY = arr.y;
      arr.vy -= grav * subDt;
      arr.x += arr.vx * subDt;
      arr.y += arr.vy * subDt;
      arr.z += arr.vz * subDt;

      const lastPt = arr.trail[arr.trail.length - 1];
      if (!lastPt || Math.hypot(arr.x - lastPt.x, arr.y - lastPt.y, arr.z - lastPt.z) >= 0.42) {
        arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
        if (arr.trail.length > 26) {
          arr.trail.shift();
        }
      }

      const spd = Math.hypot(arr.vx, arr.vy, arr.vz);
      if (spd > 0.01) {
        arr.yaw = Math.atan2(-arr.vx, -arr.vz);
        arr.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, arr.vy / spd)));
      }

      let struck = false;
      const nearbyTargets = getNearbyArcheryTargets(arr.x, arr.z);
      for (let t = 0; t < nearbyTargets.length; t++) {
        const tgt = nearbyTargets[t];
        const baseY = walkableHeightAt(tgt.x, tgt.z).height;
        const centerY = baseY + 1.35;
        const d3 = Math.hypot(arr.x - tgt.x, arr.y - centerY, arr.z - tgt.z);
        if (d3 <= tgt.bullseyeRadius) {
          arr.stuck = true;
          arr.vx = 0;
          arr.vy = 0;
          arr.vz = 0;
          arr.hitKind = 'target';
          arr.hitTargetId = tgt.id;
          arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
          hitTarget = tgt;
          hitAnySurface = true;
          struck = true;
          break;
        }
      }
      if (struck) break;

      for (let a = 0; a < activeAnimals.length; a++) {
        const anim = activeAnimals[a];
        if (anim.isDead || anim.isLooted || anim.isTamed || anim.isMountedByPlayer) continue;
        const animRad =
          anim.species === 'dragon'
            ? 5.2
            : anim.species === 'bear'
              ? 2.45
              : anim.species === 'crocodile'
                ? 2.65
                : anim.species === 'rhino'
                  ? 2.65
                  : anim.species === 'stag'
                    ? 2.05
                    : anim.species === 'deer'
                      ? 1.45
                      : anim.species === 'lion' && anim.isBoss
                        ? 3.10
                        : anim.species === 'jaguar' || anim.species === 'wolf' || anim.species === 'lion'
                          ? 1.42
                          : anim.species === 'sheep'
                            ? 0.92
                            : 0.62;
        // Use anim.y ?? walkableHeightAt(anim.x, anim.z).height so bears inside mountain caves (at cave.floorY) and flying dragons are accurately hit!
        const animGroundY =
          (anim.y ?? walkableHeightAt(anim.x, anim.z).height) + (anim.pounceHeight ?? 0);
        const animHeightSpan =
          anim.species === 'dragon'
            ? 6.5
            : anim.species === 'lion' && anim.isBoss
              ? 3.15
              : anim.species === 'bear'
                ? 3.05
                : anim.species === 'rhino'
                  ? 2.65
                  : anim.species === 'deer' || anim.species === 'stag'
                    ? 2.45
                    : anim.species === 'jaguar' || anim.species === 'wolf' || anim.species === 'lion'
                      ? 1.75
                      : anim.species === 'sheep'
                        ? 1.25
                        : anim.species === 'crocodile'
                          ? 1.55
                          : 0.75;
        const animMaxY = animGroundY + animHeightSpan;
        const horizDist = Math.hypot(arr.x - anim.x, arr.z - anim.z);
        if (horizDist <= animRad && arr.y >= animGroundY - 0.2 && arr.y <= animMaxY) {
          const dmgRes = damageGroundAnimal(
            anim,
            BASE_ARROW_HIT_DAMAGE,
            arr.x - arr.vx * 0.25,
            arr.z - arr.vz * 0.25
          );
          arr.stuck = true;
          arr.vx = 0;
          arr.vy = 0;
          arr.vz = 0;
          arr.hitKind = 'animal';
          arr.hitTargetId = String(anim.id);
          arr.attachedAnimalId = anim.id;
          // Embed arrow slightly inside animal body in animal-local coordinates so it moves with running/falling animal
          const cosY = Math.cos(anim.yaw);
          const sinY = Math.sin(anim.yaw);
          const dx = (arr.x - anim.x) * 0.52;
          const dz = (arr.z - anim.z) * 0.52;
          arr.localOffsetX = dx * cosY - dz * sinY;
          arr.localOffsetZ = dx * sinY + dz * cosY;
          arr.localOffsetY = Math.max(
            0.25,
            Math.min(animHeightSpan * 0.78, arr.y - animGroundY)
          );
          arr.localYawOffset = arr.yaw - anim.yaw;
          arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
          hitAnimal = anim;
          killedAnimal = dmgRes.killed;
          hitAnySurface = true;
          struck = true;
          break;
        }
      }
      if (struck) break;

      for (let o = 0; o < obstacles.length; o++) {
        const obs = obstacles[o];
        if (Math.abs(arr.x - obs.x) > 1.8 || Math.abs(arr.z - obs.z) > 1.8) continue;
        const obsGroundY = groundHeightAt(obs.x, obs.z);
        const obsMaxH =
          obs.kind === 'boulder'
            ? obsGroundY + obs.radius * 0.92
            : obs.kind === 'pillar'
              ? obsGroundY + obs.scale * 3.2
              : obsGroundY + obs.scale * 4.2;
        const hitRad =
          obs.kind === 'boulder'
            ? obs.radius * 0.88
            : obs.kind === 'pillar'
              ? obs.radius
              : obs.radius * 0.45;
        if (arr.y >= obsGroundY && arr.y <= obsMaxH) {
          const d2 = Math.hypot(arr.x - obs.x, arr.z - obs.z);
          if (d2 <= hitRad) {
            arr.stuck = true;
            arr.vx = 0;
            arr.vy = 0;
            arr.vz = 0;
            arr.hitKind = 'obstacle';
            arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
            hitAnySurface = true;
            struck = true;
            break;
          }
        }
      }
      if (struck) break;

      const nearbyBoxes = getNearbySolidBuildingBoxes(arr.x, arr.z);
      for (let b = 0; b < nearbyBoxes.length; b++) {
        const box = nearbyBoxes[b];
        if (arr.x >= box.minX && arr.x <= box.maxX && arr.z >= box.minZ && arr.z <= box.maxZ) {
          if (box.minY !== undefined && arr.y < box.minY) continue;
          if (box.maxY !== undefined && arr.y > box.maxY) continue;
          arr.stuck = true;
          arr.vx = 0;
          arr.vy = 0;
          arr.vz = 0;
          arr.hitKind = 'building';
          arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
          hitAnySurface = true;
          struck = true;
          break;
        }
      }
      if (struck) break;

      const rawGroundY = groundHeightAt(arr.x, arr.z);
      const walkSurface = walkableHeightAt(arr.x, arr.z, prevY);
      const floorH = walkSurface.height;
      const isElevatedThinSpan =
        (walkSurface.surface === 'bridge' || walkSurface.surface === 'pier') &&
        floorH > rawGroundY + 0.35;

      if (isElevatedThinSpan) {
        // Elevated bridge/pier decks have a thin slab (~0.28m).
        // Arrows flying in open air beneath the deck must NOT snap/teleport up onto the top of the bridge!
        const deckBottomY = floorH - 0.28;
        if (prevY >= deckBottomY && arr.y <= floorH + 0.05 && arr.y >= deckBottomY - 0.25) {
          arr.y = floorH + 0.05;
          arr.stuck = true;
          arr.vx = 0;
          arr.vy = 0;
          arr.vz = 0;
          arr.hitKind = 'ground';
          arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
          hitAnySurface = true;
          break;
        } else if (prevY < deckBottomY && arr.y >= deckBottomY && arr.y <= floorH + 0.05) {
          arr.y = deckBottomY;
          arr.stuck = true;
          arr.vx = 0;
          arr.vy = 0;
          arr.vz = 0;
          arr.hitKind = 'building';
          arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
          hitAnySurface = true;
          break;
        } else if (arr.y <= rawGroundY + 0.05) {
          arr.y = rawGroundY + 0.05;
          arr.stuck = true;
          arr.vx = 0;
          arr.vy = 0;
          arr.vz = 0;
          arr.hitKind = 'ground';
          arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
          hitAnySurface = true;
          break;
        }
      } else if (arr.y <= floorH + 0.05) {
        arr.y = floorH + 0.05;
        arr.stuck = true;
        arr.vx = 0;
        arr.vy = 0;
        arr.vz = 0;
        arr.hitKind = 'ground';
        arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
        hitAnySurface = true;
        break;
      }
    }
  }

  return { hitTarget, hitAnimal, killedAnimal, hitAnySurface };
}

/**
 * Summary: Recovers all arrows stuck in a specific animal (when looting its corpse or taming it),
 *          removing those arrows from the active world projectiles list so they disappear from the 3D scene
 *          and returning their arrow item IDs to the player's inventory.
 */
export function recoverArrowsFromAnimal(
  animalId: number,
  activeArrows: IArrowProjectile[],
  playerState?: IPlayerState,
  animalX?: number,
  animalZ?: number
): {
  readonly recoveredCount: number;
  readonly recoveredItemIds: InventoryItemId[];
} {
  let recoveredCount = 0;
  const recoveredItemIds: InventoryItemId[] = [];
  for (let i = activeArrows.length - 1; i >= 0; i--) {
    const arr = activeArrows[i];
    const isAttachedToAnimal =
      arr.attachedAnimalId === animalId ||
      (arr.hitKind === 'animal' && arr.hitTargetId === String(animalId));
    const isNearbyStuckGroundArrow =
      arr.stuck &&
      arr.hitKind !== 'target' &&
      arr.attachedAnimalId === undefined &&
      animalX !== undefined &&
      animalZ !== undefined &&
      Math.hypot(arr.x - animalX, arr.z - animalZ) <= 2.8;

    if (isAttachedToAnimal || isNearbyStuckGroundArrow) {
      const arrowItemId: InventoryItemId =
        arr.arrowKind === 'fire'
          ? 'arrow_fire'
          : arr.arrowKind === 'wind'
            ? 'arrow_wind'
            : 'arrow_normal';
      recoveredItemIds.push(arrowItemId);
      recoveredCount++;
      activeArrows.splice(i, 1);
    }
  }

  if (playerState && recoveredItemIds.length > 0) {
    if (!playerState.ownedItemIds) {
      playerState.ownedItemIds = [];
    }
    for (let j = 0; j < recoveredItemIds.length; j++) {
      const itemId = recoveredItemIds[j];
      playerState.ownedItemIds.push(itemId);
    }
  }

  return { recoveredCount, recoveredItemIds };
}
// #endregion

