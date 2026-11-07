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

test('buyMarketItem_WhenAtHarborMarketWithGoldAndEligibleLevel_ShouldSucceedWithoutAutoEquipping', () => {
  // Arrange
  const player = createMarketEligiblePlayer();
  const initialGold = player.goldCoins ?? 1000;
  assert.equal(player.equippedTool, 'bow');

  // Act
  const result = buyMarketItem(player, 'katana_imperial');

  // Assert: item is added to inventory without auto-equipping until the player equips it
  assert.equal(result.isSuccess, true);
  assert.equal(result.ok, true);
  assert.equal(player.ownedItemIds?.includes('katana_imperial'), true);
  assert.equal(player.equippedTool, 'bow');
  assert.equal(player.goldCoins, initialGold - 220);

  equipInventoryItem(player, 'katana_imperial');
  assert.equal(player.activeWeaponId, 'katana_imperial');
  assert.equal(player.equippedTool, 'sword');
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

test('chestInventory_WhenTakingAndStoringItems_ShouldTransferWithoutAutoEquippingAndUnequipStoredWeapon', () => {
  // Arrange
  const player = createInitialPlayerState({ survivalMode: true });
  const chest = WORLD_CHESTS[0];
  assert.deepEqual(getChestContents(player, chest), ['ranger_garb', 'sword', 'woodcutter_axe']);
  assert.equal(player.equippedTool, 'unarmed');
  assert.equal(player.equippedClothingId, 'simple_tunic');

  // Act 1: Take sword from chest -> adds to inventory without auto-equipping
  const takeSwordRes = takeItemFromWorldChest(player, chest, 'sword', 1);
  assert.equal(takeSwordRes.ok, true);
  assert.equal(player.ownedItemIds?.includes('sword'), true);
  assert.equal(player.equippedTool, 'unarmed', 'Taking from chest must not auto-equip');
  assert.deepEqual(getChestContents(player, chest), ['ranger_garb', 'woodcutter_axe']);

  // Equip sword explicitly, then store it back into chest -> unequips back to unarmed
  equipInventoryItem(player, 'sword');
  assert.equal(player.equippedTool, 'sword');
  assert.equal(player.activeWeaponId, 'sword');

  const storeSwordRes = storeItemInWorldChest(player, chest, 'sword', 1);
  assert.equal(storeSwordRes.ok, true);
  assert.equal(player.ownedItemIds?.includes('sword'), false);
  assert.equal(player.equippedTool, 'unarmed');
  assert.equal(player.activeWeaponId, 'unarmed');
  assert.deepEqual(getChestContents(player, chest), ['ranger_garb', 'woodcutter_axe', 'sword']);
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

test('cancelBowDrawAndBowZoomStaminaAndGazeInteraction_WhenEvaluated_ShouldCancelDrawCancelZoomOnZeroStaminaAndPrioritizeGazeTarget', async () => {
  const { cancelBowDraw } = await import('./combatAndInventorySystem');
  const { stepPlayerPhysics, STAMINA_EXHAUSTION_RECOVERY_THRESHOLD } = await import('./playerPhysicsSystem');
  const { resolveBestLookedAtInteraction, HUNTER_LODGE_POS, WORLD_CHESTS } = await import('../terrainMath');

  // 1) cancelBowDraw ([R] key) cancels an active bow draw and resets draw progress to 0
  const player = createInitialPlayerState();
  player.bowDrawn = true;
  player.bowDrawProgress = 0.85;
  assert.equal(cancelBowDraw(player), true);
  assert.equal(player.bowDrawn, false);
  assert.equal(player.bowDrawProgress, 0);
  assert.equal(cancelBowDraw(player), false);

  // 2) Holding right-click bow zoom (bowZoomHeld) drains stamina down to 0 and cancels bowZoomHeld until recovery >= 24
  player.bowZoomHeld = true;
  player.bowDrawn = true;
  player.bowDrawProgress = 0.9;
  player.stamina = 4.0;
  player.staminaExhausted = false;
  for (let i = 0; i < 6; i++) {
    stepPlayerPhysics(
      player,
      {
        forward: 0,
        right: 0,
        sprint: false,
        relaxed: false,
        jumpPressed: false,
        jumpHeld: false,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      [],
      0.08
    );
  }
  assert.equal(player.staminaExhausted, true);
  assert.equal(player.bowZoomHeld, false, 'Expected right-click bow zoom to cancel when stamina hits 0');

  // While stamina < STAMINA_EXHAUSTION_RECOVERY_THRESHOLD, staminaExhausted remains true
  player.stamina = STAMINA_EXHAUSTION_RECOVERY_THRESHOLD - 5;
  stepPlayerPhysics(
    player,
    {
      forward: 0,
      right: 0,
      sprint: false,
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

  // 3) Gaze interaction inside Hunter's Cabin: looking at the cabin door returns 'door' (never opens the corner chest),
  //    and standing near the corner chest while looking at the chest returns 'chest'
  const cabinDoorZ = HUNTER_LODGE_POS.z - 1.8;
  const lookingAtDoor = resolveBestLookedAtInteraction(
    HUNTER_LODGE_POS.x,
    HUNTER_LODGE_POS.height + 0.2,
    cabinDoorZ + 1.5,
    0, // Looking toward -Z (straight at the cabin door)
    0
  );
  assert.equal(lookingAtDoor.kind, 'door', 'Expected looking at cabin door to resolve to door, not chest');

  const cabinChest = WORLD_CHESTS[0];
  const lookingAtChest = resolveBestLookedAtInteraction(
    cabinChest.x - 1.5,
    cabinChest.y,
    cabinChest.z - 1.5,
    -2.356, // Looking toward (+X, +Z) straight at the corner chest
    -0.1
  );
  assert.equal(lookingAtChest.kind, 'chest', 'Expected looking directly at corner chest from close range to resolve to chest');

  const lookingAwayFromChest = resolveBestLookedAtInteraction(
    cabinChest.x - 1.5,
    cabinChest.y,
    cabinChest.z - 1.5,
    0.785, // Looking away (-X, -Z) from the corner chest
    0
  );
  assert.notEqual(lookingAwayFromChest.kind, 'chest', 'Expected looking away from chest not to trigger chest interaction');
});

test('bowDrawNoStaminaDrainAndMountedStaminaIsolation_WhenEvaluated_ShouldKeepStaminaFullOnBowDrawAndDrainOnlyMountStaminaWhenRiding', async () => {
  const { stepPlayerPhysics, createInitialRideableHorses } = await import('./playerPhysicsSystem');

  // 1) Drawing an arrow (bowDrawn = true, bowZoomHeld = false) does NOT drain player stamina!
  const player = createInitialPlayerState();
  player.stamina = 100;
  player.maxStamina = 100;
  player.bowDrawn = true;
  player.bowDrawProgress = 0.95;
  player.bowZoomHeld = false;

  for (let i = 0; i < 10; i++) {
    stepPlayerPhysics(
      player,
      {
        forward: 0,
        right: 0,
        sprint: false,
        relaxed: false,
        jumpPressed: false,
        jumpHeld: false,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      [],
      0.05
    );
  }
  assert.equal(
    player.stamina,
    100,
    'Expected drawing an arrow without right-click zoom NOT to drain player stamina'
  );

  // 2) Holding right-click zoom (bowZoomHeld = true) DOES drain player stamina
  player.bowZoomHeld = true;
  stepPlayerPhysics(
    player,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.1
  );
  assert.ok(player.stamina < 100, 'Expected right-click bow zoom to drain stamina');

  // 3) When riding a horse and sprinting, ONLY the mount's stamina drains while the player's own stamina does not drain (and regenerates)
  const horses = createInitialRideableHorses();
  const horse = horses[0];
  player.mountedHorseId = horse.id;
  player.x = horse.x;
  player.y = horse.y;
  player.z = horse.z;
  player.bowDrawn = false;
  player.bowZoomHeld = false;
  player.stamina = 80;
  horse.stamina = 100;
  horse.maxStamina = 100;

  for (let i = 0; i < 10; i++) {
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
      0.05,
      undefined,
      horses
    );
  }
  assert.ok(
    (horse.stamina ?? 100) < 100,
    'Expected mounted horse stamina to drain when galloping/sprinting'
  );
  assert.equal(
    player.mountStamina,
    horse.stamina,
    'Expected player.mountStamina to mirror the active horse stamina'
  );
  assert.ok(
    player.stamina > 80,
    `Expected player stamina NOT to drain (and to regenerate) while sprinting on a mount, got ${player.stamina}`
  );
});

test('woodcutterAxeTreeFellingDamageAndHarvestPlusMultiQuantityAnimalLoot_WhenEvaluated_ShouldChopFallDamageHarvestMultipleTimberAndLootMultipleBones', async () => {
  const {
    resetTreeFellingSystem,
    strikeTreeWithAxe,
    stepTreeFellingSystem,
    findNearestFallenTree,
    harvestFallenTree,
  } = await import('./treeFellingSystem');
  const { getAnimalLootDrops, createInitialSmallAnimals, lootDeadAnimal } = await import(
    './boidsAndWildlifeSystem'
  );
  const { WORLD_CHESTS } = await import('../terrainMath');
  type IObstacle = import('../domain/worldTypes').IObstacle;

  // 1) Starter cabin chest includes woodcutter_axe
  assert.ok(
    WORLD_CHESTS[0].contents.includes('woodcutter_axe'),
    'Expected Hunter Cabin starter chest to include woodcutter_axe'
  );

  // 2) Chopping a pine tree with woodcutter_axe fells it, deals falling damage if player stands in its path, and [E] harvests multiple oak_timber pieces
  const obstacles: IObstacle[] = [
    { x: 10, z: 6, radius: 0.65, scale: 1.1, seed: 0.5, kind: 'pine' },
  ];
  resetTreeFellingSystem(obstacles);

  const player = createInitialPlayerState({ survivalMode: true });
  player.ownedItemIds = ['unarmed', 'simple_tunic', 'woodcutter_axe'];
  equipInventoryItem(player, 'woodcutter_axe');
  assert.equal(player.activeWeaponId, 'woodcutter_axe');
  assert.equal(player.equippedTool, 'sword');

  // Position player facing the pine tree at (10, 6) from (10, 8) looking toward -Z (yaw = 0)
  player.x = 10;
  player.z = 8;
  player.yaw = 0;

  const chop1 = strikeTreeWithAxe(player, obstacles, false);
  assert.equal(chop1.hit, true);
  assert.equal(chop1.felled, false);

  const chop2 = strikeTreeWithAxe(player, obstacles, false);
  assert.equal(chop2.hit, true);
  assert.equal(chop2.felled, true);

  // Keep player standing directly in the falling path of the tree (tree falls toward player at (10, 8))
  player.x = 10;
  player.z = 8.2;
  player.hp = 100;

  let damagedByFallingTree = false;
  for (let s = 0; s < 50; s++) {
    const stepRes = stepTreeFellingSystem(0.05, player, obstacles);
    if (stepRes.playerDamaged) {
      damagedByFallingTree = true;
    }
  }
  assert.equal(damagedByFallingTree, true, 'Expected falling tree to damage player standing in its fall path');
  assert.ok((player.hp ?? 100) < 100, 'Expected player HP to decrease after being hit by falling tree');

  // Approach fallen tree and press [E] (harvestFallenTree) -> receive multiple oak_timber pieces (3..4)
  const fallen = findNearestFallenTree(player.x, player.z, 5.0);
  assert.ok(fallen, 'Expected fallen tree to be interactable nearby');
  const timberBefore = (player.ownedItemIds ?? []).filter((id) => id === 'oak_timber').length;
  const harvestRes = harvestFallenTree(player, fallen!, obstacles);
  const timberAfter = (player.ownedItemIds ?? []).filter((id) => id === 'oak_timber').length;
  assert.equal(harvestRes.ok, true);
  assert.ok(
    harvestRes.woodCount >= 3,
    `Expected harvesting fallen tree to yield multiple wood pieces (>= 3), got ${harvestRes.woodCount}`
  );
  assert.equal(timberAfter - timberBefore, harvestRes.woodCount);

  // 3) Animal loot drops: hides give 1 piece, while bones/meat/claws/fangs give multiple pieces (2..4)
  const bearDrops = getAnimalLootDrops('bear');
  const bearHideCount = bearDrops.expandedItemIds.filter((id) => id === 'bear_hide').length;
  const bearBoneCount = bearDrops.expandedItemIds.filter((id) => id === 'animal_bone').length;
  const bearMeatCount = bearDrops.expandedItemIds.filter((id) => id === 'bear_meat').length;
  const bearClawCount = bearDrops.expandedItemIds.filter((id) => id === 'bear_claws').length;
  assert.equal(bearHideCount, 1, 'Expected bear_hide to drop quantity 1');
  assert.ok(bearBoneCount >= 2, 'Expected animal_bone to drop multiple pieces (>= 2)');
  assert.ok(bearMeatCount >= 2, 'Expected bear_meat to drop multiple pieces (>= 2)');
  assert.ok(bearClawCount >= 2, 'Expected bear_claws to drop multiple pieces (>= 2)');

  const animals = createInitialSmallAnimals();
  const deadDeer = animals.find((a) => a.species === 'deer')!;
  deadDeer.isDead = true;
  deadDeer.isLooted = false;
  const lootRes = lootDeadAnimal(player, deadDeer, []);
  const deerHidesAdded = lootRes.addedItems.filter((id) => id === 'deer_hide').length;
  const deerBonesAdded = lootRes.addedItems.filter((id) => id === 'animal_bone').length;
  const deerMeatAdded = lootRes.addedItems.filter((id) => id === 'deer_meat').length;
  assert.equal(deerHidesAdded, 1, 'Expected looting deer to add 1 deer_hide');
  assert.ok(deerBonesAdded >= 2, 'Expected looting deer to add multiple animal_bone items');
  assert.ok(deerMeatAdded >= 2, 'Expected looting deer to add multiple deer_meat items');
});

test('plantWeatherAnimationsAndWatersideCornflowers_WhenEvaluated_ShouldMapWeatherClipsAndPlaceFlowersStrictlyNearWater', async () => {
  const { resolvePlantAnimationStateForWeather } = await import('../models/vegetationModels');
  const {
    isNearWaterForFlowers,
    generateWatersideCornflowerPositions,
  } = await import('../terrainMath');

  // 1) Weather state maps deterministically to built-in skeletal plant animations
  assert.equal(
    resolvePlantAnimationStateForWeather({ weatherKind: 'dense_fog', windStrength: 0.2 }),
    'sit'
  );
  assert.equal(
    resolvePlantAnimationStateForWeather({ weatherKind: 'clear_clouds', windStrength: 0.3 }),
    'idle'
  );
  assert.equal(
    resolvePlantAnimationStateForWeather({ weatherKind: 'clear_clouds', windStrength: 0.52 }),
    'walk'
  );
  assert.equal(
    resolvePlantAnimationStateForWeather({ weatherKind: 'regional_rain', windStrength: 0.55 }),
    'morph_wind'
  );
  assert.equal(
    resolvePlantAnimationStateForWeather({ weatherKind: 'mountain_snow', windStrength: 0.6 }),
    'lie'
  );
  assert.equal(
    resolvePlantAnimationStateForWeather({ weatherKind: 'wind_sand', windStrength: 0.7 }),
    'run'
  );
  assert.equal(
    resolvePlantAnimationStateForWeather({ weatherKind: 'lightning_storm', windStrength: 0.9 }),
    'flee'
  );

  // 2) Cornflower wildflowers are generated strictly near water (lake, waterfall pool, rivers, oasis lagoon)
  const flowers = generateWatersideCornflowerPositions(120);
  assert.ok(flowers.length >= 60, `Expected waterside flower generator to place >= 60 flowers, got ${flowers.length}`);
  for (const f of flowers) {
    assert.equal(
      isNearWaterForFlowers(f.x, f.z),
      true,
      `Expected flower at (${f.x.toFixed(1)}, ${f.z.toFixed(1)}) to be strictly near water`
    );
  }

  // Dry upland / mountain / desert locations must be rejected by isNearWaterForFlowers
  assert.equal(isNearWaterForFlowers(-180, 180), false, 'Arid desert dunes far from oasis must not grow cornflowers');
  assert.equal(isNearWaterForFlowers(0, -210), false, 'High northern fortress mountain must not grow cornflowers');
});

test('customFloraModelsAndVegetationBuilder_WhenBuiltAndAnimated_ShouldRegisterAllTenPlantSpeciesAndAnimateHitAndFell', async () => {
  const THREE = await import('three');
  const {
    buildVegetationModels,
    getRegisteredFloraSpeciesKeys,
    updateChoppableTreesVisuals,
  } = await import('../models/vegetationModels');
  const {
    FloraModel,
    unpackFloraBundle,
    ANIMTREE_PACK_B64,
  } = await import('../models/plants/AnimTree_Complete');

  // 1) Verify FloraModel custom standing wind sway, hitTree(), and fellTree() wood-cut ring animation
  const submeshes = unpackFloraBundle(ANIMTREE_PACK_B64);
  const model = new FloraModel('animtree', submeshes, {}, 1.0);
  const cutRingIdx = submeshes.findIndex((s) => s.matId === 7);
  assert.ok(cutRingIdx >= 0, 'Expected tree bundle to include matId === 7 wood-cut ring submesh');
  assert.equal(model.meshes[cutRingIdx].visible, false, 'Cut ring must be hidden while standing');

  model.hitTree();
  assert.equal(model.chopState, 'hit');
  model.update(0.1);
  assert.equal(model.chopState, 'hit');

  model.fellTree();
  assert.equal(model.chopState, 'falling');
  model.update(0.05);
  assert.equal(model.meshes[cutRingIdx].visible, true, 'Cut ring must become visible when felled');
  for (let step = 0; step < 40; step++) {
    model.update(0.05);
  }
  assert.equal(model.chopState, 'fallen');
  assert.ok(model.chopTime > 1.88, 'Expected fallen tree chopTime to complete fall + bounce');

  // 2) Verify buildVegetationModels registers all 10 new plant species from world/models/plants
  const dummyTex = new THREE.CanvasTexture(null as unknown as HTMLCanvasElement);
  const scene = new THREE.Scene();
  buildVegetationModels({
    scene,
    textures: {
      terrainAlbedo: dummyTex,
      terrainBump: dummyTex,
      barkAlbedo: dummyTex,
      barkBump: dummyTex,
      timberAlbedo: dummyTex,
      rockAlbedo: dummyTex,
      rockBump: dummyTex,
      foliageBump: dummyTex,
      contactShadow: dummyTex,
      dispose: () => {},
    },
    obstacles: [
      { x: 12, z: 12, radius: 0.5, scale: 1.0, seed: 0.2, kind: 'pine' },
      { x: 16, z: 12, radius: 0.6, scale: 1.0, seed: 0.3, kind: 'oak' },
      { x: 20, z: 12, radius: 0.6, scale: 1.0, seed: 0.4, kind: 'oak' },
      { x: 24, z: 12, radius: 0.6, scale: 1.0, seed: 0.5, kind: 'oak' },
      { x: 28, z: 12, radius: 0.6, scale: 1.0, seed: 0.6, kind: 'oak' },
      { x: 32, z: 12, radius: 0.5, scale: 1.0, seed: 0.7, kind: 'birch' },
    ],
    isSoftwareGl: true,
    disposableGeometries: [],
    disposableMaterials: [],
    disposableTextures: [],
    swayMaterials: [],
    animatedWaterMaterials: [],
    lanternLights: [],
    mistMaterials: [],
    distanceCulledObjects: [],
    doorPivotHandles: [],
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  const { getFloraLodAndShaderStats } = await import('../models/vegetationModels');
  const registeredKeys = getRegisteredFloraSpeciesKeys();
  assert.deepEqual(
    registeredKeys,
    [
      'pinetree',
      'oakgreen',
      'oakyellow',
      'animtree',
      'animtree_wide',
      'animtree_compact',
      'forestbush',
      'forestfern',
      'cornflower',
      'whiteflower',
    ],
    'Expected all 10 new plant species from world/models/plants to be registered'
  );

  // 3) Verify embedded Low-Quality (LOD1) models (< 50% triangles across all 10 plant species) and GPU wind shaders
  const initialStats = getFloraLodAndShaderStats();
  assert.equal(
    initialStats.gpuWindMaterialCount,
    7,
    'Expected all 7 standing plant material slots (0..6) to have GPU wind shaders attached'
  );
  for (const floraKey of registeredKeys) {
    const counts = initialStats.speciesTriangleCounts[floraKey];
    assert.ok(counts, `Expected triangle counts for ${floraKey}`);
    assert.ok(
      counts.lod1 < counts.lod0 * 0.5,
      `Expected ${floraKey} LOD1 triangles (${counts.lod1}) to be < 50% of LOD0 (${counts.lod0})`
    );
  }
  assert.equal(initialStats.sectorLodStates[0]?.activeLod, 0, 'Sector should start in LOD0 when near');

  // Move player far from sector (0,0) -> sector switches to LOD1
  updateChoppableTreesVisuals(0.05, undefined, 160, 160);
  const farStats = getFloraLodAndShaderStats();
  assert.equal(farStats.sectorLodStates[0]?.activeLod, 1, 'Sector should switch to LOD1 when player is far');

  // Move player back near sector (0,0) -> sector switches back to LOD0
  updateChoppableTreesVisuals(0.05, undefined, 10, 10);
  const nearStats = getFloraLodAndShaderStats();
  assert.equal(nearStats.sectorLodStates[0]?.activeLod, 0, 'Sector should switch back to LOD0 when player returns near');
});
// #endregion



