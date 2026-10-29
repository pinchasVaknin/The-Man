// ============================================================================
// MODULE: World / Systems / Combat And Inventory
// DESIGN: Player weapon equipping, market trading, sword striking, and arrow physics (SRP)
// SUMMARY: Manages inventory item ownership, market buy/sell transactions, hotbar slots,
//          melee hit detection against targets and solid volumes, and ballistic arrow flight.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { Result } from '../../core/Result';
import {
  INVENTORY_ITEMS,
  type PlayerState,
  type EquippedToolSlot,
  type ArrowElementKind,
  type InventoryItemId,
  type InventoryItemDef,
  type ObstacleCylinder,
  type ArcheryTargetDef,
  type ArrowProjectile,
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

let _nextArrowId = 1;

/**
 * Summary: Returns the localized Hebrew display label for an equipped tool slot.
 */
export function getEquippedToolLabelHe(tool: EquippedToolSlot = 'bow'): string {
  switch (tool) {
    case 'bow':
      return 'קשת ציידים';
    case 'sword':
      return 'חרב סיירים';
    case 'torch':
      return 'לפיד אש בוער';
    case 'unarmed':
      return 'ידיים חופשיות';
  }
}

/**
 * Summary: Returns the localized Hebrew display label for an arrow element type.
 */
export function getArrowKindLabelHe(kind: ArrowElementKind = 'normal'): string {
  switch (kind) {
    case 'normal':
      return 'חץ פלדה';
    case 'fire':
      return 'חץ אש בוער';
    case 'wind':
      return 'חץ סערה מהיר';
  }
}

/**
 * Summary: Calculates the gold payout for selling an inventory item at market stalls.
 */
export function getMarketSellPrice(item: InventoryItemDef): number {
  return Math.max(MARKET_MIN_SELL_PRICE, Math.round(item.valueGold * MARKET_SELL_RATIO));
}
// #endregion

// ======================== INVENTORY & MARKET OPERATIONS ======================== \\
// #region Inventory & Market Operations
/**
 * Summary: Checks whether the player owns a specified inventory item.
 */
export function isInventoryItemOwned(state: PlayerState, itemId: InventoryItemId): boolean {
  if (!state.ownedItemIds) {
    const def = INVENTORY_ITEMS.find((i) => i.id === itemId);
    return Boolean(def?.starterOwned);
  }
  return state.ownedItemIds.includes(itemId);
}

/**
 * Summary: Checks whether the player currently has an inventory item actively equipped.
 */
export function isInventoryItemEquipped(state: PlayerState, itemId: InventoryItemId): boolean {
  const tool = state.equippedTool ?? 'bow';
  const activeWep = state.activeWeaponId ?? tool;
  const arrow = state.arrowKind ?? 'normal';
  const def = INVENTORY_ITEMS.find((i) => i.id === itemId);

  if (def?.weaponRole === 'bow') {
    return tool === 'bow' && activeWep === itemId;
  }
  if (def?.weaponRole === 'sword') {
    return tool === 'sword' && activeWep === itemId;
  }
  if (itemId === 'torch' || itemId === 'unarmed') {
    return tool === itemId;
  }
  if (itemId === 'arrow_normal') return arrow === 'normal';
  if (itemId === 'arrow_fire') return arrow === 'fire';
  if (itemId === 'arrow_wind') return arrow === 'wind';
  return false;
}

/**
 * Summary: Equips an inventory item to the appropriate active weapon or arrow slot.
 */
export function equipInventoryItem(state: PlayerState, itemId: InventoryItemId): void {
  const def = INVENTORY_ITEMS.find((i) => i.id === itemId);
  if (def?.weaponRole === 'bow') {
    state.equippedTool = 'bow';
    state.activeWeaponId = itemId;
    return;
  }
  if (def?.weaponRole === 'sword') {
    state.equippedTool = 'sword';
    state.activeWeaponId = itemId;
    state.bowDrawn = false;
    state.bowDrawProgress = 0;
    return;
  }
  if (itemId === 'torch' || itemId === 'unarmed') {
    state.equippedTool = itemId;
    state.activeWeaponId = itemId;
    state.bowDrawn = false;
    state.bowDrawProgress = 0;
    return;
  }
  if (itemId === 'arrow_normal') {
    state.arrowKind = 'normal';
    state.equippedTool = 'bow';
  } else if (itemId === 'arrow_fire') {
    state.arrowKind = 'fire';
    state.equippedTool = 'bow';
  } else if (itemId === 'arrow_wind') {
    state.arrowKind = 'wind';
    state.equippedTool = 'bow';
  } else if (itemId === 'ancient_dwarven_horn') {
    state.stamina = state.maxStamina ?? 100;
    awardSkillXp(state, 'exploration', 12);
  } else if (
    itemId === 'dwarven_gold_ore' ||
    itemId === 'crystal_gem' ||
    itemId === 'oak_timber' ||
    itemId === 'cut_granite_blocks' ||
    itemId === 'iron_ingots' ||
    itemId === 'imperial_clay_tiles' ||
    itemId === 'marble_pillar_stone'
  ) {
    awardSkillXp(state, 'exploration', 10);
  } else if (itemId === 'elven_cloak') {
    awardSkillXp(state, 'athletics', 10);
  }
}

export type MarketTransactionErrorCode =
  | 'not_in_market'
  | 'already_owned'
  | 'level_too_low'
  | 'not_enough_gold'
  | 'not_found'
  | 'not_owned'
  | 'cannot_sell';

export interface IBuyMarketItemPayload {
  readonly goldCoins: number;
  readonly requiredLevel: number;
  readonly playerLevel: number;
}

export interface ISellMarketItemPayload {
  readonly goldCoins: number;
  readonly soldForGold: number;
}

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
  state: PlayerState,
  itemId: InventoryItemId
): MarketTransactionResult<IBuyMarketItemPayload, MarketTransactionErrorCode> {
  const nearMarket = findNearestMarketStall(state.x, state.z);
  if (!nearMarket) {
    return MarketTransactionResult.failure('not_in_market', { goldCoins: state.goldCoins ?? 0 });
  }
  const def = INVENTORY_ITEMS.find((i) => i.id === itemId);
  if (!def) {
    return MarketTransactionResult.failure('not_found', { goldCoins: state.goldCoins ?? 0 });
  }
  if (!state.ownedItemIds) {
    state.ownedItemIds = INVENTORY_ITEMS.filter((i) => i.starterOwned).map((i) => i.id);
  }
  if (state.ownedItemIds.includes(itemId)) {
    return MarketTransactionResult.failure('already_owned', { goldCoins: state.goldCoins ?? 0 });
  }
  const playerLevel = getPlayerHeroLevel(state);
  if (playerLevel < def.requiredLevel) {
    return MarketTransactionResult.failure('level_too_low', {
      goldCoins: state.goldCoins ?? 0,
      requiredLevel: def.requiredLevel,
      playerLevel,
    });
  }
  const currentGold = state.goldCoins ?? 0;
  if (currentGold < def.valueGold) {
    return MarketTransactionResult.failure('not_enough_gold', { goldCoins: currentGold });
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
  state: PlayerState,
  itemId: InventoryItemId
): MarketTransactionResult<ISellMarketItemPayload, MarketTransactionErrorCode> {
  const nearMarket = findNearestMarketStall(state.x, state.z);
  if (!nearMarket) {
    return MarketTransactionResult.failure('not_in_market', {
      goldCoins: state.goldCoins ?? 0,
      soldForGold: 0,
    });
  }
  if (itemId === 'unarmed') {
    return MarketTransactionResult.failure('cannot_sell', {
      goldCoins: state.goldCoins ?? 0,
      soldForGold: 0,
    });
  }
  const def = INVENTORY_ITEMS.find((i) => i.id === itemId);
  if (!def) {
    return MarketTransactionResult.failure('not_owned', {
      goldCoins: state.goldCoins ?? 0,
      soldForGold: 0,
    });
  }
  if (!state.ownedItemIds) {
    state.ownedItemIds = INVENTORY_ITEMS.filter((i) => i.starterOwned).map((i) => i.id);
  }
  const idx = state.ownedItemIds.indexOf(itemId);
  if (idx === -1) {
    return MarketTransactionResult.failure('not_owned', {
      goldCoins: state.goldCoins ?? 0,
      soldForGold: 0,
    });
  }
  const sellPrice = getMarketSellPrice(def);
  state.ownedItemIds.splice(idx, 1);
  state.goldCoins = (state.goldCoins ?? 0) + sellPrice;

  if (state.activeWeaponId === itemId || state.equippedTool === itemId) {
    const fallbackWeapon = state.ownedItemIds.find((id: InventoryItemId) => {
      const d = INVENTORY_ITEMS.find((x) => x.id === id);
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
 */
export function assignHotbarSlot(
  state: PlayerState,
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
 */
export function toggleFavoriteItem(state: PlayerState, itemId: InventoryItemId): boolean {
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
export interface ISwordSlashHitResult {
  readonly comboIndex: number;
  readonly isHeavy: boolean;
  readonly hitKind: 'none' | 'target' | 'obstacle' | 'wall';
  readonly hitTarget: ArcheryTargetDef | null;
  readonly hitAnySurface: boolean;
}
export type SwordSlashHitResult = ISwordSlashHitResult;

/**
 * Summary: Evaluates melee hit detection during the Phase C Active Strike Window.
 * Note: [HOT-PATH EXCEPTION] Ray-marches and mutates combat state directly.
 */
export function evaluateSwordStrikeWindowHit(
  state: PlayerState,
  obstacles: readonly ObstacleCylinder[] = []
): SwordSlashHitResult {
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

  const maxReach = isHeavy ? SWORD_HEAVY_REACH : SWORD_LIGHT_REACH;
  for (let d = 0.75; d <= maxReach; d += 0.25) {
    const sx = state.x + dirX * d;
    const sy = eyeY + dirY * d;
    const sz = state.z + dirZ * d;

    for (let t = 0; t < ARCHERY_TARGETS.length; t++) {
      const tgt = ARCHERY_TARGETS[t];
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

    for (let o = 0; o < obstacles.length; o++) {
      const obs = obstacles[o];
      if (Math.abs(sx - obs.x) > 1.8 || Math.abs(sz - obs.z) > 1.8) continue;
      const obsGroundY = groundHeightAt(obs.x, obs.z);
      const obsMaxH = obs.kind === 'boulder' ? obsGroundY + obs.scale * 1.6 : obsGroundY + obs.scale * 7.5;
      if (sy >= obsGroundY && sy <= obsMaxH && Math.hypot(sx - obs.x, sz - obs.z) <= obs.radius + 0.28) {
        state.lastSwordHitPoint = { x: sx, y: sy, z: sz, age: 0, kind: 'obstacle' };
        state.swordHitStopTimer = 0.048;
        return { comboIndex, isHeavy, hitKind: 'obstacle', hitTarget: null, hitAnySurface: true };
      }
    }

    for (let b = 0; b < SOLID_BUILDING_BOXES.length; b++) {
      const box = SOLID_BUILDING_BOXES[b];
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
 */
export function triggerSwordSlash(
  state: PlayerState,
  obstacles: readonly ObstacleCylinder[] = [],
  isHeavy = false,
  deferHitToStrikeWindow = false
): SwordSlashHitResult {
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
 */
export function stepSwordSwingCombat(
  state: PlayerState,
  obstacles: readonly ObstacleCylinder[],
  dt: number
): SwordSlashHitResult | null {
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

  let strikeResult: SwordSlashHitResult | null = null;
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
 */
export function spawnArrowProjectile(
  state: PlayerState,
  drawPower = 1.0
): ArrowProjectile {
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
    id: _nextArrowId++,
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
 */
export function stepArrowsPhysics(
  arrows: ArrowProjectile[],
  obstacles: readonly ObstacleCylinder[],
  rawDt: number
): { hitTarget: ArcheryTargetDef | null; hitAnySurface: boolean } {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
  let hitTarget: ArcheryTargetDef | null = null;
  let hitAnySurface = false;

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
      for (let t = 0; t < ARCHERY_TARGETS.length; t++) {
        const tgt = ARCHERY_TARGETS[t];
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

      for (let o = 0; o < obstacles.length; o++) {
        const obs = obstacles[o];
        if (Math.abs(arr.x - obs.x) > 1.8 || Math.abs(arr.z - obs.z) > 1.8) continue;
        const obsGroundY = groundHeightAt(obs.x, obs.z);
        const obsMaxH = obs.kind === 'boulder' ? obsGroundY + obs.scale * 1.6 : obsGroundY + obs.scale * 7.5;
        if (arr.y >= obsGroundY && arr.y <= obsMaxH) {
          const d2 = Math.hypot(arr.x - obs.x, arr.z - obs.z);
          if (d2 <= obs.radius + 0.12) {
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

      for (let b = 0; b < SOLID_BUILDING_BOXES.length; b++) {
        const box = SOLID_BUILDING_BOXES[b];
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

      const floorH = walkableHeightAt(arr.x, arr.z, arr.y).height;
      if (arr.y <= floorH + 0.05) {
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

  return { hitTarget, hitAnySurface };
}
// #endregion
