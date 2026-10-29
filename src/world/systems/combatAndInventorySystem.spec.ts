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
} from './combatAndInventorySystem';
import { createInitialPlayerState } from './playerPhysicsSystem';
import type { IPlayerState } from '../domain/worldTypes';
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
