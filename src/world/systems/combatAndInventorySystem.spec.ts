// ============================================================================
// MODULE: World / Systems / CombatAndInventorySystem Tests
// DESIGN: Unit test suite for inventory, market economy, and sword combat (AAA)
// SUMMARY: Verifies market trading Result contracts, weapon equipping, hotbar assignments, and melee slashes.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buyMarketItem,
  sellMarketItem,
  equipInventoryItem,
  assignHotbarSlot,
  toggleFavoriteItem,
  triggerSwordSlash,
  stepArrowsPhysics,
} from './combatAndInventorySystem';
import { createInitialPlayerState } from './playerPhysicsSystem';
import { INVENTORY_ITEMS, INVENTORY_ITEM_MAP, type IPlayerState, type IArrowProjectile } from '../domain/worldTypes';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Test Fixtures & Factories
function createMarketEligiblePlayer(): IPlayerState {
  const player = createInitialPlayerState();
  // Move player to Harbor Market Stall coordinates (212.0, 254.0)
  player.x = 212.0;
  player.z = 254.0;
  player.goldCoins = 1000;
  return player;
}
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('INVENTORY_ITEMS_WhenLoaded_ShouldCategorizeMeatAndFoodUnderFoodCategory', () => {
  const rawMeat = INVENTORY_ITEM_MAP.get('raw_game_meat');
  assert.ok(rawMeat);
  assert.equal(rawMeat.category, 'food');
  assert.equal(rawMeat.categoryLabel, 'אוכל');

  const foodItems = INVENTORY_ITEMS.filter((i) => i.category === 'food');
  assert.ok(foodItems.length >= 5, 'Expected multiple food items in food category');

  const sheepWool = INVENTORY_ITEM_MAP.get('sheep_hide');
  assert.ok(sheepWool);
  assert.equal(sheepWool.name, 'צמר כבשים משובח');
});

test('stepArrowsPhysics_WhenArrowFliesUnderBridge_ShouldNotTeleportOntoBridgeTop', () => {
  // Central arched bridge is at x=0, z=0 with archH = 1.65m and water/ground below at ~ -2.8m.
  // An arrow flying at y = 1.05m (underneath the bridge arch, within the -0.85m player step-up zone)
  // must fly cleanly under the bridge without snapping up to y = 1.70m!
  const arrow: IArrowProjectile = {
    id: 1,
    x: 0,
    y: 1.05,
    z: -1.0,
    vx: 0,
    vy: 0,
    vz: 30.0,
    yaw: Math.PI,
    pitch: 0,
    arrowKind: 'wind',
    stuck: false,
    hitKind: 'none',
    hitTargetId: null,
    age: 0,
    trail: [],
  };

  stepArrowsPhysics([arrow], [], 0.03);
  assert.equal(arrow.stuck, false, 'Arrow flying in open space under bridge arch should not get stuck');
  assert.ok(arrow.y < 1.35, `Arrow should remain below bridge deck (1.65m), got y=${arrow.y}`);
});

test('stepArrowsPhysics_WhenArrowShotUnderGalleonShipBowOverhang_ShouldNotHitEmptySpace', () => {
  // Under the bow overhang (z = 231.8, y = 1.2) or below hull (y = -1.2), there is open space/water
  const arrow: IArrowProjectile = {
    id: 2,
    x: 282.0,
    y: 1.2,
    z: 231.5,
    vx: 25.0,
    vy: 0,
    vz: 0,
    yaw: -Math.PI / 2,
    pitch: 0,
    arrowKind: 'wind',
    stuck: false,
    hitKind: 'none',
    hitTargetId: null,
    age: 0,
    trail: [],
  };

  stepArrowsPhysics([arrow], [], 0.02);
  assert.equal(arrow.stuck, false, 'Arrow under ship bow overhang at y=1.2 should not hit invisible box');
});

test('buyMarketItem_WhenAtHarborMarketWithGoldAndEligibleLevel_ShouldSucceedAndEquipWeapon', () => {
  // Arrange
  const player = createMarketEligiblePlayer();
  const initialGold = player.goldCoins ?? 1000;

  // Act
  const result = buyMarketItem(player, 'katana_imperial');

  // Assert
  assert.equal(result.isSuccess, true);
  assert.equal(result.ok, true);
  assert.equal(player.ownedItemIds?.includes('katana_imperial'), true);
  assert.equal(player.activeWeaponId, 'katana_imperial');
  assert.equal(player.equippedTool, 'sword');
  assert.equal(player.goldCoins, initialGold - 220);
});

test('sellMarketItem_WhenSellingOwnedMaterialAtMarket_ShouldIncreaseGoldAndRemoveItem', () => {
  // Arrange
  const player = createMarketEligiblePlayer();
  player.ownedItemIds = ['dwarven_gold_ore'];
  const startGold = player.goldCoins ?? 1000;

  // Act
  const result = sellMarketItem(player, 'dwarven_gold_ore');

  // Assert
  assert.equal(result.isSuccess, true);
  assert.equal(result.ok, true);
  assert.equal(player.ownedItemIds?.includes('dwarven_gold_ore'), false);
  assert.ok((player.goldCoins ?? 0) > startGold);
});

test('triggerSwordSlash_WhenLightAttackTriggered_ShouldConsumeStaminaAndSetSwingProgress', () => {
  // Arrange
  const player = createInitialPlayerState();
  player.stamina = 100;

  // Act
  const result = triggerSwordSlash(player, [], false);

  // Assert
  assert.equal(result.isHeavy, false);
  assert.equal(player.equippedTool, 'sword');
  assert.ok((player.stamina ?? 0) < 100);
  assert.ok((player.swordSwingProgress ?? 0) > 0);
});

test('assignHotbarSlot_WhenAssigned_ShouldPlaceItemInTargetSlotAndClearDuplicates', () => {
  // Arrange
  const player = createInitialPlayerState();
  player.hotbarSlots = ['bow', 'torch', 'sword', 'unarmed'];

  // Act
  assignHotbarSlot(player, 0, 'sword');

  // Assert
  assert.equal(player.hotbarSlots[0], 'sword');
  assert.equal(player.hotbarSlots[2], null);
});

test('toggleFavoriteItem_WhenItemNotFavorite_ShouldAddItToFavorites', () => {
  // Arrange
  const player = createInitialPlayerState();
  player.favoriteIds = ['bow'];

  // Act
  toggleFavoriteItem(player, 'sword');

  // Assert
  assert.deepEqual(player.favoriteIds, ['bow', 'sword']);
});
// #endregion

// ======================== GUARD CLAUSE & VALIDATION TESTS ======================== \\
// #region Guard Clause & Validation Tests
test('buyMarketItem_WhenOutsideMarketStall_ShouldReturnFailedResultWithNotInMarket', () => {
  // Arrange
  const player = createInitialPlayerState();
  player.x = 0;
  player.z = 0; // Far from any market stall

  // Act
  const result = buyMarketItem(player, 'katana_imperial');

  // Assert
  assert.equal(result.isSuccess, false);
  assert.equal(result.isFailure, true);
  assert.equal(result.reason, 'NOT_IN_MARKET');
  assert.equal(result.error, 'NOT_IN_MARKET');
});

test('buyMarketItem_WhenHeroLevelIsTooLow_ShouldReturnFailedResultWithLevelTooLow', () => {
  // Arrange
  const player = createMarketEligiblePlayer(); // Hero Level 1

  // Act: elven_longbow requires Level 2
  const result = buyMarketItem(player, 'elven_longbow');

  // Assert
  assert.equal(result.isSuccess, false);
  assert.equal(result.isFailure, true);
  assert.equal(result.reason, 'LEVEL_TOO_LOW');
  assert.equal(result.error, 'LEVEL_TOO_LOW');
  assert.equal(player.ownedItemIds?.includes('elven_longbow') ?? false, false);
});
// #endregion
