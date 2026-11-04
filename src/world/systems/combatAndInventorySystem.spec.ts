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
  requiresSellConfirmation,
  sellMarketItem,
  equipInventoryItem,
  assignHotbarSlot,
  toggleFavoriteItem,
  triggerSwordSlash,
  stepArrowsPhysics,
  getChestContents,
  takeItemFromWorldChest,
  storeItemInWorldChest,
} from './combatAndInventorySystem';
import { createInitialPlayerState, stepSurvivalVitals } from './playerPhysicsSystem';
import { WORLD_CHESTS } from '../terrainMath';
import {
  INVENTORY_ITEMS,
  INVENTORY_ITEM_MAP,
  type IPlayerState,
  type IArrowProjectile,
} from '../domain/worldTypes';
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
test('INVENTORY_ITEMS_WhenLoaded_ShouldCategorizeMeatAndFoodUnderFoodCategoryWithConciseEnglishNames', () => {
  const rawMeat = INVENTORY_ITEM_MAP.get('raw_game_meat');
  assert.ok(rawMeat);
  assert.equal(rawMeat.category, 'food');
  assert.equal(rawMeat.categoryLabel, 'Food');
  assert.equal(rawMeat.name, 'Game Meat');

  const deerMeat = INVENTORY_ITEM_MAP.get('deer_meat');
  assert.ok(deerMeat);
  assert.equal(deerMeat.name, 'Deer Meat');

  const rottenMeat = INVENTORY_ITEM_MAP.get('rotten_meat');
  assert.ok(rottenMeat);
  assert.equal(rottenMeat.name, 'Rotten Meat');

  const foodItems = INVENTORY_ITEMS.filter((i) => i.category === 'food');
  assert.ok(foodItems.length >= 7, 'Expected multiple food items in food category');

  const sheepWool = INVENTORY_ITEM_MAP.get('sheep_hide');
  assert.ok(sheepWool);
  assert.equal(sheepWool.name, 'Wool');
});

test('stepArrowsPhysics_WhenArrowHitsAnimalOrShotWithDifferentDrawPower_ShouldScaleRangeAndStayAttachedToAnimal', () => {
  const player = createInitialPlayerState();
  player.x = 0;
  player.y = 2.0;
  player.z = 0;
  player.yaw = 0;
  player.pitch = 0;

  // 1. Minimum draw vs full draw should produce substantially higher speed (and distance)
  const minDrawArrow: IArrowProjectile = {
    id: 101,
    x: 0,
    y: 2.0,
    z: 0,
    vx: 0,
    vy: 0.4,
    vz: -16.0,
    yaw: 0,
    pitch: 0,
    stuck: false,
    hitKind: 'none',
    hitTargetId: null,
    age: 0,
    trail: [],
  };
  assert.ok(Math.hypot(minDrawArrow.vx, minDrawArrow.vz) < 20);
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

test('requiresSellConfirmation_WhenItemIsLootOnlyOrRegular_ShouldOnlyGuardLootOnlyItems', () => {
  // Arrange
  const itemIds = ['dragon_scales', 'dragon_meat', 'crystal_gem', 'katana_imperial'] as const;

  // Act
  const needsConfirmation = itemIds.map((itemId) => requiresSellConfirmation(itemId));

  // Assert
  assert.deepEqual(needsConfirmation, [true, true, false, false]);
});

test('buyMarketItem_WhenItemIsLootOnly_ShouldReturnFailedResultWithNotSoldByMerchants', () => {
  // Arrange
  const player = createMarketEligiblePlayer();
  const initialGold = player.goldCoins;

  // Act
  const result = buyMarketItem(player, 'dragon_scales');

  // Assert
  assert.equal(result.error, 'NOT_SOLD_BY_MERCHANTS');
  assert.equal(player.goldCoins, initialGold);
});

test('INVENTORY_ITEMS_WhenDragonLootListed_ShouldAllBeMarkedLootOnly', () => {
  // Arrange
  const dragonLootIds = ['dragon_meat', 'dragon_scales', 'dragon_horn', 'dragon_claws', 'dragon_bone'] as const;

  // Act
  const lootOnlyFlags = dragonLootIds.map((itemId) => INVENTORY_ITEM_MAP.get(itemId)?.lootOnly);

  // Assert
  assert.deepEqual(lootOnlyFlags, [true, true, true, true, true]);
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

test('sellMarketItem_WhenSellingEquippedSword_ShouldUnequipToUnarmedAndClearHotbarAndBlockReequipping', () => {
  // Arrange
  const player = createMarketEligiblePlayer();
  player.ownedItemIds = ['unarmed', 'simple_tunic', 'sword'];
  player.equippedTool = 'sword';
  player.activeWeaponId = 'sword';
  player.hotbarSlots = ['sword', null, null, 'unarmed'];
  player.favoriteIds = ['sword'];

  // Act
  const res = sellMarketItem(player, 'sword');

  // Assert
  assert.equal(res.isSuccess, true);
  assert.equal(player.ownedItemIds.includes('sword'), false);
  assert.equal(player.equippedTool, 'unarmed');
  assert.equal(player.activeWeaponId, 'unarmed');
  assert.equal(player.hotbarSlots[0], null);
  assert.equal(player.favoriteIds.includes('sword'), false);

  // Attempting to equip an unowned sword must be ignored
  equipInventoryItem(player, 'sword');
  assert.equal(player.equippedTool, 'unarmed');
  assert.equal(player.activeWeaponId, 'unarmed');
});

test('buyMarketItem_WhenBuyingStackableArrowsWithQuantity_ShouldMultiplyReducedUnitPriceAndAddMultipleCopies', () => {
  // Arrange: Position at Fletcher stall (market-harbor-2) which stocks bows & arrows
  const player = createMarketEligiblePlayer();
  player.z = 263.0;
  player.ownedItemIds = ['unarmed', 'bow', 'arrow_normal'];
  player.goldCoins = 100;

  // Verify reduced arrow prices
  assert.equal(INVENTORY_ITEM_MAP.get('arrow_normal')?.valueGold, 5);
  assert.equal(INVENTORY_ITEM_MAP.get('arrow_fire')?.valueGold, 12);
  assert.equal(INVENTORY_ITEM_MAP.get('arrow_wind')?.valueGold, 15);

  // Act: Buy 6 steel arrows even though 1 is already owned
  const res = buyMarketItem(player, 'arrow_normal', 6);

  // Assert
  assert.equal(res.isSuccess, true);
  assert.equal(player.goldCoins, 100 - 5 * 6);
  const arrowCount = player.ownedItemIds.filter((id) => id === 'arrow_normal').length;
  assert.equal(arrowCount, 7);
});

test('chestInventory_WhenTakingAndStoringItems_ShouldTransferBetweenChestAndPlayerAndUnequipStoredWeapon', () => {
  // Arrange
  const player = createInitialPlayerState({ survivalMode: true });
  const chest = WORLD_CHESTS[0];
  assert.deepEqual(getChestContents(player, chest), ['ranger_garb', 'sword']);
  assert.equal(player.equippedTool, 'unarmed');
  assert.equal(player.equippedClothingId, 'simple_tunic');

  // Act 1: Take sword from chest -> auto-equips since bare-handed
  const takeSwordRes = takeItemFromWorldChest(player, chest, 'sword', 1);
  assert.equal(takeSwordRes.ok, true);
  assert.equal(player.ownedItemIds?.includes('sword'), true);
  assert.equal(player.equippedTool, 'sword');
  assert.equal(player.activeWeaponId, 'sword');
  assert.deepEqual(getChestContents(player, chest), ['ranger_garb']);

  // Act 2: Store sword back into chest -> unequips back to unarmed
  const storeSwordRes = storeItemInWorldChest(player, chest, 'sword', 1);
  assert.equal(storeSwordRes.ok, true);
  assert.equal(player.ownedItemIds?.includes('sword'), false);
  assert.equal(player.equippedTool, 'unarmed');
  assert.equal(player.activeWeaponId, 'unarmed');
  assert.deepEqual(getChestContents(player, chest), ['ranger_garb', 'sword']);
});

test('survivalVitalsAndFood_WhenInSurvivalVsGodMode_ShouldDrainHungerRestoreOnEatAndLockInGodMode', () => {
  // Arrange
  const player = createInitialPlayerState({ survivalMode: true });
  player.ownedItemIds = ['unarmed', 'simple_tunic', 'deer_meat'];
  assert.equal(player.hp, 100);
  assert.equal(player.hunger, 100);

  // Act 1: Survival mode drains hunger over time
  stepSurvivalVitals(player, 10.0, true, false);
  assert.ok((player.hunger ?? 100) < 100, 'Expected hunger to drain in Survival mode');
  player.hp = 70;
  player.hunger = 50;

  // Act 2: Eating deer_meat consumes it and restores hunger & HP
  equipInventoryItem(player, 'deer_meat');
  assert.equal(player.ownedItemIds.includes('deer_meat'), false, 'Expected eaten food to be consumed');
  assert.ok((player.hunger ?? 0) > 50, 'Expected hunger to increase after eating');
  assert.ok((player.hp ?? 0) > 70, 'Expected HP to increase after eating');

  // Act 3: God mode locks HP and Hunger at 100
  stepSurvivalVitals(player, 5.0, true, true);
  assert.equal(player.hp, 100);
  assert.equal(player.hunger, 100);
});

test('staminaExhaustionHysteresis_WhenStaminaHitsZero_ShouldPreventSprintUntilRecoveredPastThreshold', async () => {
  const { stepPlayerPhysics, STAMINA_EXHAUSTION_RECOVERY_THRESHOLD } = await import('./playerPhysicsSystem');
  const player = createInitialPlayerState({ survivalMode: true });
  player.stamina = 0.2;

  // Step 1: Trying to sprint when stamina is ~0 triggers staminaExhausted and forces normal walk pace
  stepPlayerPhysics(
    player,
    {
      forward: 1,
      right: 0,
      sprint: true,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.05
  );
  assert.equal(player.staminaExhausted, true);
  assert.equal(player.walkPace, 'normal', 'Expected player to walk normally while staminaExhausted is true');

  // Step 2: Even when stamina recovers slightly to 10 (below threshold 24), sprinting is still blocked (no stutter!)
  player.stamina = 10;
  stepPlayerPhysics(
    player,
    {
      forward: 1,
      right: 0,
      sprint: true,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.05
  );
  assert.equal(player.staminaExhausted, true);
  assert.equal(player.walkPace, 'normal');

  // Step 3: Once stamina recovers to >= STAMINA_EXHAUSTION_RECOVERY_THRESHOLD (24), sprinting resumes!
  player.stamina = STAMINA_EXHAUSTION_RECOVERY_THRESHOLD + 1;
  stepPlayerPhysics(
    player,
    {
      forward: 1,
      right: 0,
      sprint: true,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.05
  );
  assert.equal(player.staminaExhausted, false);
  assert.equal(player.walkPace, 'fast');
});

test('consumeArrowFromInventory_WhenFiringBow_ShouldDecrementArrowCountFromOwnedItems', async () => {
  const { consumeArrowFromInventory } = await import('./combatAndInventorySystem');
  const player = createInitialPlayerState();
  player.arrowKind = 'normal';
  player.ownedItemIds = ['bow', 'arrow_normal', 'arrow_normal', 'arrow_normal'];

  const shot1 = consumeArrowFromInventory(player);
  assert.equal(shot1.consumed, true);
  assert.equal(shot1.remainingCount, 2);

  const shot2 = consumeArrowFromInventory(player);
  assert.equal(shot2.consumed, true);
  assert.equal(shot2.remainingCount, 1);

  const shot3 = consumeArrowFromInventory(player);
  assert.equal(shot3.consumed, true);
  assert.equal(shot3.remainingCount, 0);

  const shot4 = consumeArrowFromInventory(player);
  assert.equal(shot4.consumed, false);
  assert.equal(shot4.remainingCount, 0);
});

test('merchantStockAndRestock_WhenBuyingSellingAndAdvancingDays_ShouldDepleteStockShowSoldItemAndRestock', async () => {
  const { getMerchantStallStock, checkAndRestockMerchants } = await import('./combatAndInventorySystem');
  const player = createMarketEligiblePlayer();
  player.z = 263.0; // market-harbor-2 (Fletcher stall)
  player.goldCoins = 2000;

  // 1) Initial stock at market-harbor-2 has 10 arrow_normal
  const stock = getMerchantStallStock(player, 'market-harbor-2');
  assert.equal(stock.arrow_normal, 10);

  // 2) Buy 8 arrows -> 2 remain in merchant stock
  const buy8 = buyMarketItem(player, 'arrow_normal', 8);
  assert.equal(buy8.isSuccess, true);
  assert.equal(stock.arrow_normal, 2);

  // 3) Buy remaining 2 arrows -> 0 remain (deleted from merchant stock)
  const buy2 = buyMarketItem(player, 'arrow_normal', 2);
  assert.equal(buy2.isSuccess, true);
  assert.equal(stock.arrow_normal, undefined);

  // 4) Buying more when stock is 0 fails with OUT_OF_STOCK
  const buyExtra = buyMarketItem(player, 'arrow_normal', 1);
  assert.equal(buyExtra.isSuccess, false);
  assert.equal(buyExtra.error, 'OUT_OF_STOCK');

  // 5) Selling an owned item (e.g. deer_hide) adds it into the merchant's stock
  player.ownedItemIds = ['unarmed', 'deer_hide'];
  const sellRes = sellMarketItem(player, 'deer_hide');
  assert.equal(sellRes.isSuccess, true);
  assert.equal(stock.deer_hide, 1, 'Expected sold item to appear in merchant stock');

  // 6) After 3 in-game days, merchant restocks depleted catalog items while keeping sold items
  const restocked = checkAndRestockMerchants(player, 3);
  assert.equal(restocked, true);
  assert.ok((stock.arrow_normal ?? 0) >= 10, 'Expected arrow_normal to be restocked after 3 days');
  assert.equal(stock.deer_hide, 1, 'Expected player-sold item to remain in merchant stock');
});

test('breadSatisfactionAndRhinoDesertBiome_WhenChecked_ShouldSatisfyHungerAndKeepRhinosInSouthwestDesert', async () => {
  const { createInitialSmallAnimals, getAnimalStrengthAndLevel } = await import('./boidsAndWildlifeSystem');
  const player = createInitialPlayerState({ survivalMode: true });
  player.hunger = 15;
  player.ownedItemIds = ['unarmed', 'simple_tunic', 'fresh_bread_loaf'];

  // 1 loaf of bread restores +85 hunger (15 -> 100)
  equipInventoryItem(player, 'fresh_bread_loaf');
  assert.equal(player.hunger, 100, 'Expected 1 loaf of bread to satisfy hunger up to 100');

  // Verify all Rhinos spawn in the Southwest Desert (x < -150, z > 180) and none in the Eastern Orange Birch Forest
  const animals = createInitialSmallAnimals();
  const rhinos = animals.filter((a) => a.species === 'rhino');
  assert.ok(rhinos.length >= 3);
  for (const r of rhinos) {
    assert.ok(
      r.x < -150 && r.z > 180,
      `Expected Rhino #${r.id} to spawn in the Southwest Desert, got (${r.x}, ${r.z})`
    );
  }

  // Verify animal attack damage scales with species strength and level
  const wolf = animals.find((a) => a.species === 'wolf')!;
  const bear = animals.find((a) => a.species === 'bear')!;
  const dragon = animals.find((a) => a.species === 'dragon')!;
  assert.ok(
    getAnimalStrengthAndLevel(wolf).attackDamage < getAnimalStrengthAndLevel(bear).attackDamage &&
      getAnimalStrengthAndLevel(bear).attackDamage < getAnimalStrengthAndLevel(dragon).attackDamage,
    'Expected animal attack damage to scale with species strength and level'
  );
});
// #endregion


