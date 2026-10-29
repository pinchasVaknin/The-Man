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
  INVENTORY_ITEMS,
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
  getActiveWorldAnimals,
  killGroundAnimal,
  type ISmallAnimalState,
} from './boidsAndWildlifeSystem';
// #endregion

// ======================== CONSTANTS & LABELS ======================== \\
// #region Constants & Labels
export { SWORD_ACTIVE_STRIKE_WINDOW_START, SWORD_ACTIVE_STRIKE_WINDOW_END, SWORD_STRIKE_CONTACT_APEX };

export const ARROW_TRAIL_MAX_AGE = 0.85;

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
 * Summary: Returns the localized Hebrew display label for an equipped tool slot.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param tool Input parameter tool.
 * @returns Computed result for getEquippedToolLabel.
 */
export function getEquippedToolLabel(tool: EquippedToolSlot = 'bow'): string {
  return t(`combat.tools.${tool}`);
}


/**
 * Summary: Returns the localized Hebrew display label for an arrow element type.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param kind Input parameter kind.
 * @returns Computed result for getArrowKindLabel.
 */
export function getArrowKindLabel(kind: ArrowElementKind = 'normal'): string {
  return t(`combat.arrows.${kind}`);
}


/**
 * Summary: Calculates the gold payout for selling an inventory item at market stalls.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param item Input parameter item.
 * @returns Computed result for getMarketSellPrice.
 */
export function getMarketSellPrice(item: IInventoryItemDef): number {
  return Math.max(MARKET_MIN_SELL_PRICE, Math.round(item.valueGold * MARKET_SELL_RATIO));
}
// #endregion


// ======================== SPATIAL INDEXING BROAD-PHASE ======================== \\
// #region Spatial Indexing Broad-Phase
/**
 * Summary: 2D Spatial Hash Grid partitioning objects on the X/Z horizontal plane.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Provides O(1) candidate box/target queries for collision detection broad-phase.
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
 * @param x Input parameter for getNearbySolidBuildingBoxes.
 * @param z Input parameter for getNearbySolidBuildingBoxes.
 * @returns Computed result for getNearbySolidBuildingBoxes.
 */
export function getNearbySolidBuildingBoxes(x: number, z: number): readonly ISolidBuildingBox[] {
  return SOLID_BUILDING_SPATIAL_GRID.query(x, z);
}

/**
 * Summary: Get nearby archery targets.
 * Design: Standard function implementing domain specifications and behavioral contracts.
 * @param x Input parameter for getNearbyArcheryTargets.
 * @param z Input parameter for getNearbyArcheryTargets.
 * @returns Computed result for getNearbyArcheryTargets.
 */
export function getNearbyArcheryTargets(x: number, z: number): readonly IArcheryTargetDef[] {
  return ARCHERY_TARGETS_SPATIAL_GRID.query(x, z);
}
// #endregion

// ======================== EQUIPMENT STRATEGY PATTERN ======================== \\
// #region Equipment Strategy Pattern
/**
 * Summary: Strategy interface for item equipment checks and activation dispatch.
 * Design: Standard domain component following SRP and clean architectural contracts.
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
  ['deer_antlers', materialStrategy],
]);
// #endregion

// ======================== INVENTORY & MARKET OPERATIONS ======================== \\
// #region Inventory & Market Operations
/**
 * Summary: Checks whether the player owns a specified inventory item.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param state Input parameter state.
 * @param itemId Input parameter itemId.
 * @returns Computed result for isInventoryItemOwned.
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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: Dispatches via O(1) Strategy Map lookup.
 * @param state Input parameter state.
 * @param itemId Input parameter itemId.
 * @returns Computed result for isInventoryItemEquipped.
 */
export function isInventoryItemEquipped(state: IPlayerState, itemId: InventoryItemId): boolean {
  const strategy = EQUIPMENT_STRATEGY_MAP.get(itemId);
  return strategy ? strategy.isEquipped(state, itemId) : false;
}

/**
 * Summary: Equips an inventory item to the appropriate active weapon or arrow slot.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: Dispatches via O(1) Strategy Map lookup.
 * @param state Input parameter state.
 * @param itemId Input parameter itemId.
 * @returns Computed result for equipInventoryItem.
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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param state Input parameter state.
 * @param slotIndex Input parameter slotIndex.
 * @param itemId Input parameter itemId.
 * @returns Computed result for assignHotbarSlot.
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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param state Input parameter state.
 * @param itemId Input parameter itemId.
 * @returns Computed result for toggleFavoriteItem.
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
  readonly hitAnySurface: boolean;
}
export type SwordSlashHitResult = ISwordSlashHitResult;

/**
 * Summary: Evaluates melee hit detection during the Phase C Active Strike Window.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: [HOT-PATH EXCEPTION] Ray-marches and mutates combat state directly.
 * Relaxed Rule: Rule 1 (in-place state mutation instead of immutable reconstruction).
 * Empirical Measurement: Chrome Performance Profiler measured at ~0.04ms per swing frame.
 * Performance Budget: < 0.5 ms per frame at 60 FPS.
 * @param state Input parameter state.
 * @param obstacles Input parameter obstacles.
 * @returns Computed result for evaluateSwordStrikeWindowHit.
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
  const eyeY = state.y + (state.mountedHorseId ? 2.22 : PLAYER_EYE_HEIGHT * 0.88);

  if (isHeavy) {
    if (!state.isSwimming) {
      state.vx += -Math.sin(state.yaw) * 3.6;
      state.vz += -Math.cos(state.yaw) * 3.6;
    }
    state.lastSwordAirWave = {
      startX: state.x + dirX * 0.72,
      startY: eyeY + dirY * 0.72 - 0.06,
      startZ: state.z + dirZ * 0.72,
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
    const sx = state.x + dirX * d;
    const sy = eyeY + dirY * d;
    const sz = state.z + dirZ * d;

    const nearbyTargets = getNearbyArcheryTargets(sx, sz);
    for (let t = 0; t < nearbyTargets.length; t++) {
      const tgt = nearbyTargets[t];
      const baseY = walkableHeightAt(tgt.x, tgt.z).height;
      const centerY = baseY + 1.35;
      if (Math.hypot(sx - tgt.x, sy - centerY, sz - tgt.z) <= tgt.bullseyeRadius + (isHeavy ? 0.45 : 0.25)) {
        state.lastSwordHitPoint = { x: sx, y: sy, z: sz, age: 0, kind: 'target' };
        state.lastArrowHitTarget = tgt.id;
        state.goldCoins = (state.goldCoins ?? 280) + 15;
        state.swordHitStopTimer = 0.042;
        awardSkillXp(state, 'swordsmanship', 18);
        return { comboIndex, isHeavy, hitKind: 'target', hitTarget: tgt, hitAnySurface: true };
      }
    }

    for (let a = 0; a < activeAnimals.length; a++) {
      const anim = activeAnimals[a];
      if (anim.isDead || anim.isLooted) continue;
      const animRad =
        anim.species === 'deer'
          ? 1.35
          : anim.species === 'sheep'
            ? 1.15
            : 0.95;
      const animGroundY = groundHeightAt(anim.x, anim.z);
      const animCenterY =
        animGroundY +
        (anim.species === 'deer' ? 0.85 : anim.species === 'sheep' ? 0.55 : 0.25);
      if (
        Math.hypot(sx - anim.x, sz - anim.z) <= animRad + (isHeavy ? 0.45 : 0.2) &&
        Math.abs(sy - animCenterY) <= 1.45
      ) {
        killGroundAnimal(anim);
        state.lastSwordHitPoint = { x: sx, y: animCenterY, z: sz, age: 0, kind: 'target' };
        state.lastArrowHitTarget = String(anim.id);
        state.swordHitStopTimer = 0.045;
        awardSkillXp(state, 'swordsmanship', 24);
        return {
          comboIndex,
          isHeavy,
          hitKind: 'target',
          hitTarget: null,
          hitAnimal: anim,
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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param state Input parameter state.
 * @param obstacles Input parameter obstacles.
 * @param isHeavy Input parameter isHeavy.
 * @param deferHitToStrikeWindow Input parameter deferHitToStrikeWindow.
 * @returns Computed result for triggerSwordSlash.
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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: [HOT-PATH EXCEPTION] Evaluated in 60FPS combat simulation tick.
 * @param state Input parameter state.
 * @param obstacles Input parameter obstacles.
 * @param dt Input parameter dt.
 * @returns Computed result for stepSwordSwingCombat.
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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * @param state Input parameter state.
 * @param drawPower Input parameter drawPower.
 * @param nextIdGenerator Input parameter nextIdGenerator.
 * @returns Computed result for spawnArrowProjectile.
 */
export function spawnArrowProjectile(
  state: IPlayerState,
  drawPower = 1.0,
  nextIdGenerator?: () => number
): IArrowProjectile {
  awardSkillXp(state, 'archery', Math.round(5 + drawPower * 4));
  const clampedPower = Math.max(0.28, Math.min(1.0, drawPower));
  const kind: ArrowElementKind = state.arrowKind ?? 'normal';
  const activeBowBonus =
    state.activeWeaponId === 'dragonbone_bow'
      ? 1.32
      : state.activeWeaponId === 'elven_longbow'
        ? 1.2
        : 1.0;
  const baseSpeed = (24.0 + clampedPower * 34.0) * activeBowBonus;
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
  const isFirstPerson = state.cameraPerspective === 'first_person';
  const shoulderY = state.y + (isMounted ? 2.18 : isFirstPerson ? 1.56 : 1.44);
  const sideScale = isFirstPerson ? -0.06 : 0.14;
  const rightOffX = Math.cos(state.yaw) * sideScale;
  const rightOffZ = -Math.sin(state.yaw) * sideScale;

  const startX = state.x + rightOffX + nx * 0.72;
  const startY = shoulderY + ny * 0.72;
  const startZ = state.z + rightOffZ + nz * 0.72;

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
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Note: [HOT-PATH EXCEPTION] 60FPS arrow sub-step integration loop with in-place mutation.
 * @param arrows Input parameter arrows.
 * @param obstacles Input parameter obstacles.
 * @param rawDt Input parameter rawDt.
 * @returns Computed result for stepArrowsPhysics.
 */
export function stepArrowsPhysics(
  arrows: IArrowProjectile[],
  obstacles: readonly IObstacleCylinder[],
  rawDt: number
): {
  hitTarget: IArcheryTargetDef | null;
  hitAnimal?: ISmallAnimalState | null;
  hitAnySurface: boolean;
} {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
  let hitTarget: IArcheryTargetDef | null = null;
  let hitAnimal: ISmallAnimalState | null = null;
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

    if (arr.stuck) continue;

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
        if (anim.isDead || anim.isLooted) continue;
        const animRad =
          anim.species === 'deer'
            ? 1.05
            : anim.species === 'sheep'
              ? 0.85
              : 0.58;
        const animGroundY = groundHeightAt(anim.x, anim.z);
        const animCenterY =
          animGroundY +
          (anim.species === 'deer' ? 0.88 : anim.species === 'sheep' ? 0.56 : 0.25);
        const d3 = Math.hypot(arr.x - anim.x, arr.y - animCenterY, arr.z - anim.z);
        if (d3 <= animRad) {
          killGroundAnimal(anim);
          arr.stuck = true;
          arr.vx = 0;
          arr.vy = 0;
          arr.vz = 0;
          arr.hitKind = 'target';
          arr.hitTargetId = String(anim.id);
          arr.trail.push({ x: arr.x, y: arr.y, z: arr.z, age: 0 });
          hitAnimal = anim;
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

  return { hitTarget, hitAnimal, hitAnySurface };
}
// #endregion
