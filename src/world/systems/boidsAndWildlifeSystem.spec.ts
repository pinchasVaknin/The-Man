// ============================================================================
// MODULE: World / Systems / Boids and Wildlife System Tests
// DESIGN: Unit test suite for birds flocking, autonomous animal AI, biomes & slope math (AAA)
// SUMMARY: Verifies bird flock updates, biome habitats, deer listening & sleeping AI,
//          bear mountain cave rain shelter, predator hunting/fleeing, and slope alignment.
// ============================================================================

// ======================== IMPORTS AND TEST DEPENDENCIES ======================== \\
// #region Imports and Test Dependencies
import { before, test } from 'node:test';
import { preloadAnimalModelsForTests } from '../../testSupport/animalModelsForTests';
import assert from 'node:assert/strict';
import {
  createInitialBoidBirds,
  createInitialSmallAnimals,
  stepBoidsAndWildlife,
  stepSmallAnimals,
  BIRD_FLOCK_CONFIGS,
  getAnimalLootDrops,
  getAnimalSensoryProfile,
  getAnimalMaxHp,
  BASE_ARROW_HIT_DAMAGE,
  damageGroundAnimal,
  killGroundAnimal,
  isSafeAnimalSpawnPosition,
  ensureSafeOffscreenAnimalSpawns,
  getPredatorMeleeStandoffDist,
  getPredatorAttackTriggerDist,
  getAnimalWaterSubmergenceDepth,
  getAnimalWaterSpeedMultiplier,
  evaluateSouthernDragonTarget,
  findNearestDeadLootableAnimal,
  type ISmallAnimalState,
} from './boidsAndWildlifeSystem';
import { createReadyWolf, WOLF_STATES } from '../models/Wolf';
import { createReadyRhino, RHINO_STATES } from '../models/Rhino';
import { createReadyBear } from '../models/Bear';
import { createReadyCrocodile } from '../models/Crocodile';
import { createReadyCatLion, CAT_LION_STATES } from '../models/CatLion';
import { createReadyStag, STAG_STATES } from '../models/Stag';
import { createReadyForestDragon, FOREST_DRAGON_STATES } from '../models/ForestDragon';
import { createReadyDemonDragon, DEMON_DRAGON_STATES } from '../models/DemonDragon';
import {
  BEAR_MOUNTAIN_CAVES,
  CROCODILE_RIVER_BEND_POS,
  FLOATING_BLOOMING_ISLANDS,
  FLOATING_ISLAND_STAIR_POS,
  FLOATING_WATERFALL_STEP_ISLANDS,
  SKY_WIND_GEYSERS,
  SOLID_BUILDING_BOXES,
  SOUTHERN_DRAGON_RUINS_POS,
  VOLCANO_SANCTUM_POS,
  WATER_LEVEL,
  WORLD_BEDS,
  WORLD_SPAWN,
  findNearestBed,
  floatingBloomingIslandHeightAt,
} from '../domain/landmarksRegistry';
import {
  createInitialPlayerState,
  createInitialRideableHorses,
  stepPlayerPhysics,
} from './playerPhysicsSystem';
import {
  computeSlopePitchAndRoll,
  getRoofHeightAt,
  groundHeightAt,
  isInsideBearCave,
  isInsideVolcanoSanctum,
  regionalForestDensityAt,
  southernCliffsidePassTrailHeightAt,
  volcanicBadlandsFactorAt,
  walkableHeightAt,
} from './terrainAndBiomeSystem';
import {
  lootDeadAnimal,
  isVolcanoBossArenaLocked,
} from './boidsAndWildlifeSystem';
import {
  spawnArrowProjectile,
  stepArrowsPhysics,
  recoverArrowsFromAnimal,
} from './combatAndInventorySystem';
// #endregion

before(async () => {
  await preloadAnimalModelsForTests();
});

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
import { INVENTORY_ITEM_MAP } from '../domain/worldTypes';

test('getAnimalLootDrops_WhenSheepJaguarOrWolfHunted_ShouldYieldSpeciesSpecificHidesWithDistinctGoldValues', () => {
  const sheepDrops = getAnimalLootDrops('sheep');
  assert.deepEqual(sheepDrops.itemIds, ['raw_game_meat', 'sheep_hide', 'animal_bone']);
  assert.deepEqual(sheepDrops.itemLabels, ['Game Meat ×2', 'Wool', 'Animal Bone ×2']);
  assert.ok(sheepDrops.notification.includes('Sheep'));

  const deerDrops = getAnimalLootDrops('deer');
  assert.deepEqual(deerDrops.itemIds, ['deer_meat', 'deer_hide', 'deer_antlers', 'animal_bone']);

  const jaguarDrops = getAnimalLootDrops('jaguar');
  assert.deepEqual(jaguarDrops.itemIds, ['raw_game_meat', 'jaguar_hide', 'wolf_fang', 'animal_bone']);
  assert.ok(jaguarDrops.notification.includes('Jaguar'));

  const wolfDrops = getAnimalLootDrops('wolf');
  assert.deepEqual(wolfDrops.itemIds, ['raw_game_meat', 'wolf_hide', 'wolf_fang', 'animal_bone']);
  assert.ok(wolfDrops.notification.includes('Wolf'));

  const crocDrops = getAnimalLootDrops('crocodile');
  assert.deepEqual(crocDrops.itemIds, ['raw_game_meat', 'crocodile_hide', 'crocodile_teeth', 'animal_bone']);
  assert.ok(crocDrops.notification.includes('Crocodile'));

  const bearDrops = getAnimalLootDrops('bear');
  assert.deepEqual(bearDrops.itemIds, ['bear_meat', 'bear_hide', 'bear_claws', 'animal_fat', 'animal_bone']);
  assert.ok(bearDrops.notification.includes('Bear'));

  const rhinoDrops = getAnimalLootDrops('rhino');
  assert.deepEqual(rhinoDrops.itemIds, ['raw_game_meat', 'rhino_hide', 'rhino_horn', 'animal_fat', 'animal_bone']);
  assert.ok(rhinoDrops.notification.includes('Rhino'));

  // Verify each species hide has a distinct market value in gold
  const deerHideGold = INVENTORY_ITEM_MAP.get('deer_hide')?.valueGold ?? 0;
  const wolfHideGold = INVENTORY_ITEM_MAP.get('wolf_hide')?.valueGold ?? 0;
  const jaguarHideGold = INVENTORY_ITEM_MAP.get('jaguar_hide')?.valueGold ?? 0;
  const crocHideGold = INVENTORY_ITEM_MAP.get('crocodile_hide')?.valueGold ?? 0;
  const bearHideGold = INVENTORY_ITEM_MAP.get('bear_hide')?.valueGold ?? 0;
  const rhinoHideGold = INVENTORY_ITEM_MAP.get('rhino_hide')?.valueGold ?? 0;
  assert.ok(
    deerHideGold < wolfHideGold &&
      wolfHideGold < jaguarHideGold &&
      jaguarHideGold < crocHideGold &&
      crocHideGold < bearHideGold &&
      bearHideGold < rhinoHideGold,
    'Each species hide must have a distinct escalating gold value'
  );
});

test('getAnimalLootDrops_WhenDragonHunted_ShouldYieldDragonCatalogItems', () => {
  // Arrange
  const expectedDragonLoot = ['dragon_meat', 'dragon_scales', 'dragon_horn', 'dragon_claws', 'dragon_bone'];

  // Act
  const dragonLoot = getAnimalLootDrops('dragon');

  // Assert
  assert.deepEqual(dragonLoot.itemIds, expectedDragonLoot);
});

test('getAnimalLootDrops_WhenAnySpeciesHunted_ShouldOnlyYieldItemsThatExistInCatalog', () => {
  // Arrange
  const allSpecies = ['rabbit', 'squirrel', 'deer', 'sheep', 'bear', 'crocodile', 'jaguar', 'wolf', 'rhino', 'lion', 'stag', 'dragon'] as const;

  // Act
  const lootIds = allSpecies.flatMap((species) => getAnimalLootDrops(species).itemIds);

  // Assert
  assert.deepEqual(lootIds.filter((itemId) => !INVENTORY_ITEM_MAP.has(itemId)), []);
});

test('getAnimalLootDrops_WhenSmallGameHunted_ShouldNotYieldAnimalBone', () => {
  // Arrange
  const smallGameSpecies = ['rabbit', 'squirrel'] as const;

  // Act
  const lootBySpecies = smallGameSpecies.map((species) => getAnimalLootDrops(species));

  // Assert
  assert.deepEqual(
    lootBySpecies.map((loot) => loot.itemIds),
    [
      ['raw_game_meat', 'small_hide'],
      ['raw_game_meat', 'small_hide'],
    ]
  );
});

test('damageGroundAnimal_WhenStruckWithArrows_ShouldRequireMultipleHitsForBearJaguarWolfDeerAndOneForRabbit', () => {
  const animals = createInitialSmallAnimals();
  const bear = animals.find((a) => a.species === 'bear')!;
  const jaguar = animals.find((a) => a.species === 'jaguar')!;
  const deer = animals.find((a) => a.species === 'deer')!;
  const wolf = animals.find((a) => a.species === 'wolf')!;
  const rabbit = animals.find((a) => a.species === 'rabbit')!;

  assert.equal(BASE_ARROW_HIT_DAMAGE, 30);
  // Base HP per species (level 1); live animals scale with their level, so the hit counts below are read from each animal.
  assert.equal(getAnimalMaxHp('bear'), 240);
  assert.equal(getAnimalMaxHp('crocodile'), 180);
  assert.equal(getAnimalMaxHp('jaguar'), 120);
  assert.equal(getAnimalMaxHp('wolf'), 90);
  assert.equal(getAnimalMaxHp('deer'), 90);
  assert.equal(getAnimalMaxHp('sheep'), 60);
  assert.equal(getAnimalMaxHp('rabbit'), 30);

  // Rabbit dies in 1 arrow hit (30 damage)
  const rabRes = damageGroundAnimal(rabbit, BASE_ARROW_HIT_DAMAGE, 0, 0);
  assert.equal(rabRes.killed, true);
  assert.equal(rabbit.isDead, true);

  const hitsToKill = (animal: ISmallAnimalState): number => {
    let hits = 0;
    while (!animal.isDead && hits < 200) {
      damageGroundAnimal(animal, BASE_ARROW_HIT_DAMAGE, 0, 0);
      hits++;
    }
    return hits;
  };

  // First wound: the animal survives, its HP drops, and deer flee.
  const deerHit1 = damageGroundAnimal(deer, BASE_ARROW_HIT_DAMAGE, 0, 0);
  assert.equal(deerHit1.killed, false);
  assert.ok(deerHit1.remainingHp < (deer.maxHp ?? 0), 'A deer hit must reduce its HP');
  assert.equal(deer.aiBehavior, 'fleeing');
  assert.ok(hitsToKill(deer) >= 2, 'Deer needs more than one arrow');

  const jagHit1 = damageGroundAnimal(jaguar, BASE_ARROW_HIT_DAMAGE, 0, 0);
  assert.equal(jagHit1.killed, false);
  assert.equal(jaguar.aiBehavior, 'charging');
  assert.ok(hitsToKill(jaguar) >= 2, 'Jaguar needs more than one arrow');

  assert.ok(hitsToKill(wolf) >= 2, 'Wolf needs more than one arrow');

  // Bears have the largest pool of the ground hunters, so they take the most arrows.
  const bearHits = hitsToKill(bear);
  assert.ok(bearHits >= 8, `Bear should take at least 8 arrows (took ${bearHits})`);
  assert.equal(bear.isDead, true);
});

test('killGroundAnimal_WhenDeerOrSheepKilled_ShouldAnchorYToGroundHeightAndStopMovement', () => {
  const animals = createInitialSmallAnimals();
  const deer = animals.find((a) => a.species === 'deer');
  const sheep = animals.find((a) => a.species === 'sheep');
  assert.ok(deer, 'Expected deer in initial animals');
  assert.ok(sheep, 'Expected sheep in initial animals');

  deer.vx = 4.2;
  deer.vz = -3.1;
  killGroundAnimal(deer);
  assert.equal(deer.isDead, true);
  assert.equal(deer.isLooted, false);
  assert.equal(deer.vx, 0);
  assert.equal(deer.vz, 0);
  assert.equal(deer.aiBehavior, 'dead');
  assert.ok(Number.isFinite(deer.y));

  killGroundAnimal(sheep);
  assert.equal(sheep.isDead, true);
  assert.equal(sheep.vx, 0);
  assert.equal(sheep.vz, 0);
  assert.ok(Number.isFinite(sheep.y));
});

test('createInitialBoidBirds_WhenInitialized_ShouldCreateConfiguredFlocksWithPositions', () => {
  const birds = createInitialBoidBirds();
  assert.ok(Array.isArray(birds));
  assert.ok(birds.length > 0, 'Expected populated boid bird array');
  assert.ok(birds.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.z)));
});

test('createInitialSmallAnimals_WhenInitialized_ShouldCreateAnimalsInMatchingBiomesOffScreenFromSpawn', () => {
  const animals = createInitialSmallAnimals();
  assert.ok(Array.isArray(animals));
  assert.ok(animals.length >= 10, 'Expected populated ground animal roster');
  assert.ok(
    animals.every(
      (a) =>
        a.species === 'rabbit' ||
        a.species === 'squirrel' ||
        a.species === 'deer' ||
        a.species === 'sheep' ||
        a.species === 'bear' ||
        a.species === 'crocodile' ||
        a.species === 'jaguar' ||
        a.species === 'wolf' ||
        a.species === 'rhino' ||
        a.species === 'lion' ||
        a.species === 'stag' ||
        a.species === 'dragon' ||
        a.species === 'hippo' ||
        a.species === 'koifish' ||
        a.species === 'dolphin'
    )
  );
  // Every animal must spawn outside the player's safe radius and outside the initial view cone!
  for (const a of animals) {
    assert.equal(
      isSafeAnimalSpawnPosition(a.x, a.z, WORLD_SPAWN.x, WORLD_SPAWN.z, WORLD_SPAWN.yaw),
      true,
      `Animal ${a.species} at (${a.x}, ${a.z}) must not spawn within safe radius or initial view cone`
    );
  }

  const bears = animals.filter((a) => a.species === 'bear');
  const jaguars = animals.filter((a) => a.species === 'jaguar');
  const crocodiles = animals.filter((a) => a.species === 'crocodile');
  const wolves = animals.filter((a) => a.species === 'wolf');
  const rhinos = animals.filter((a) => a.species === 'rhino');
  const lions = animals.filter((a) => a.species === 'lion');
  const stags = animals.filter((a) => a.species === 'stag');
  const hippos = animals.filter((a) => a.species === 'hippo');
  const koifish = animals.filter((a) => a.species === 'koifish');
  const dolphins = animals.filter((a) => a.species === 'dolphin');
  assert.equal(bears.length, 7, 'Expected 7 forest/mountain cavern bears (including multiple bears inside the caves)');
  assert.equal(jaguars.length, 5, 'Expected 5 jaguars in Southwest Desert & Southern Forest');
  assert.equal(crocodiles.length, 5, 'Expected 5 crocodiles at the remote Southern River Bend');
  assert.equal(wolves.length, 6, 'Expected 6 timber wolves in the Western, Northern and far-west pine woods');
  assert.equal(rhinos.length, 4, 'Expected 4 savanna/oasis rhinos');
  assert.equal(lions.length, 7, 'Expected 7 Volcanic Badlands CatLions (1 Boss + 6 roaming)');
  assert.equal(stags.length, 4, 'Expected 4 royal woodland stags');
  assert.equal(hippos.length, 12, 'Expected 12 hippos in Southwest Oasis and Southern River Wetland');
  assert.equal(koifish.length, 15, 'Expected 15 ornamental koi fish in Lakeside Tea Pavilion and Oasis pools');
  assert.equal(dolphins.length, 6, 'Expected 6 bottlenose dolphins in Southeast Harbor Bay and Southern Sea');

  // Verify Jaguars are in Southwest Desert (x < -200, z > 200) or Southern Forest (z > 200)
  for (const jag of jaguars) {
    assert.ok(jag.z > 200 && jag.x < -70, `Jaguar at (${jag.x}, ${jag.z}) must be in SW Desert or Southern Forest`);
  }

  // Verify Crocodiles are exclusively at the remote Southern River Bend Lagoon
  for (const croc of crocodiles) {
    const distToLagoon = Math.hypot(
      croc.x - CROCODILE_RIVER_BEND_POS.x,
      croc.z - CROCODILE_RIVER_BEND_POS.z
    );
    assert.ok(distToLagoon < 25, `Crocodile at (${croc.x}, ${croc.z}) must be at Southern River Bend`);
  }

  // Verify Bear Mountain Caves have a real mountain rising over them, an entrance tunnel, and a spacious inner cavern
  let bearsInsideCaverns = 0;
  for (const bear of bears) {
    assert.ok(
      bear.caveIndex !== undefined && BEAR_MOUNTAIN_CAVES[bear.caveIndex] !== undefined,
      'Each bear should be linked to a mountain cave'
    );
    const cave = BEAR_MOUNTAIN_CAVES[bear.caveIndex!];
    assert.ok(
      getRoofHeightAt(cave.x, cave.z) !== null,
      'Bear mountain cave must provide overhead roof shelter'
    );
    // Mountain peak above the cave chamber must rise at least 18m above cave.floorY!
    const mountainPeakY = groundHeightAt(cave.x, cave.z);
    assert.ok(
      mountainPeakY > cave.floorY + 18.0,
      `Bear cave at (${cave.x}, ${cave.z}) must be embedded inside a tall mountain peak (got ${mountainPeakY} vs floor ${cave.floorY})`
    );
    if (isInsideBearCave(bear.x, bear.z, bear.y) !== null) {
      bearsInsideCaverns++;
      assert.ok(
        Math.abs(walkableHeightAt(bear.x, bear.z).height - cave.floorY) < 0.05,
        'Bears inside the cavern alcoves must walk on the flat cavern floorY'
      );
    }
  }
  assert.ok(bearsInsideCaverns >= 4, 'Expected at least 4 bears spawned inside the mountain cavern side alcoves');

  // Verify Southern Forest density is high while Rural Farm Valley is open
  assert.ok(regionalForestDensityAt(-112, 218) > 0.75, 'Expected dense southern forest');
  assert.ok(regionalForestDensityAt(82, 208) > 0.75, 'Expected dense southeast forest');
  assert.ok(regionalForestDensityAt(-8, 152) < 0.15, 'Expected open pastoral rural farm valley');
});

test('getAnimalSensoryProfile_WhenSleeping_ShouldHaveZeroVisionAndReducedHearing', () => {
  const awakeDeer = getAnimalSensoryProfile('deer', false);
  const sleepingDeer = getAnimalSensoryProfile('deer', true);

  assert.equal(sleepingDeer.visionRange, 0, 'Sleeping deer has eyes closed (vision = 0)');
  assert.ok(awakeDeer.visionRange > 15, 'Awake deer has positive vision range');
  assert.ok(
    sleepingDeer.hearingRadius < awakeDeer.hearingRadius,
    'Sleeping deer hearing radius must be smaller than awake hearing radius'
  );
});

test('stepSmallAnimals_WhenDeerSleepingAtNight_ShouldAccumulateWakeMeterAndWakeOnLoudNoise', () => {
  const animals = createInitialSmallAnimals();
  const deer = animals.find((a) => a.species === 'deer')!;
  const singleDeer = [deer];

  // Quiet or far away at night -> sleeps with vision = 0
  stepSmallAnimals(singleDeer, 0.1, 10, deer.x + 16, deer.z, [], 0.1, undefined, 2.0, false, false, 0);
  assert.equal(deer.isResting, true);
  assert.equal(deer.aiBehavior, 'sleeping');
  assert.equal(deer.wakeMeter, 0);

  // Sprinting close within sleeping hearing radius (11.5m) -> fills wakeMeter and wakes up to flee!
  for (let step = 0; step < 15; step++) {
    stepSmallAnimals(singleDeer, 0.1, 10 + step * 0.1, deer.x + 4.0, deer.z, [], 0.1, undefined, 7.5, false, false, 0);
  }
  assert.equal(deer.isResting, false);
  assert.equal(deer.aiBehavior, 'fleeing');
  assert.equal(deer.alertLevel, 'fleeing');
});

test('stepSmallAnimals_WhenDeerDetectsMediumStimulus_ShouldStandAndListenThenReturnToGrazingOrFlee', () => {
  const animals = createInitialSmallAnimals();
  const deer = animals.find((a) => a.species === 'deer')!;
  const singleDeer = [deer];

  // 1. Player walks at medium distance (14m) -> Deer enters 'listening' state
  stepSmallAnimals(singleDeer, 0.05, 20, deer.x + 14.0, deer.z, [], 1.0, undefined, 1.5, false, false, 0);
  assert.equal(deer.aiBehavior, 'listening');
  assert.equal(deer.alertLevel, 'curious');
  assert.ok((deer.listenTimer ?? 0) > 0);

  // 2. Player stops moving and stays quiet while deer listens -> Deer finishes listening and returns to grazing
  for (let s = 0; s < 40; s++) {
    stepSmallAnimals(singleDeer, 0.05, 20.1 + s * 0.05, deer.x + 14.0, deer.z, [], 1.0, undefined, 0, false, false, 0);
  }
  assert.equal(deer.alertLevel, 'grazing');
  assert.ok((deer.aiBehavior as string) === 'grazing' || (deer.aiBehavior as string) === 'wandering');

  // 3. Now trigger listening again, and while listening, player sprints loudly -> Deer flees!
  deer.listenCooldown = 0;
  stepSmallAnimals(singleDeer, 0.05, 25, deer.x + 13.5, deer.z, [], 1.0, undefined, 1.5, false, false, 0);
  assert.equal(deer.aiBehavior, 'listening');
  stepSmallAnimals(singleDeer, 0.05, 25.1, deer.x + 12.0, deer.z, [], 1.0, undefined, 6.5, false, false, 0);
  assert.equal(deer.aiBehavior, 'fleeing');
  assert.equal(deer.alertLevel, 'fleeing');
});

test('stepSmallAnimals_WhenRaining_BearShouldReturnToMountainCaveAndSleepInside', () => {
  const animals = createInitialSmallAnimals();
  const bear = animals.find((a) => a.species === 'bear')!;
  const cave = BEAR_MOUNTAIN_CAVES[bear.caveIndex!];
  const singleBear = [bear];

  // Place bear 10m outside its cave entrance and start rain (rainIntensity = 0.8)
  bear.x = cave.entranceX;
  bear.z = cave.entranceZ + 8.0;
  stepSmallAnimals(singleBear, 0.05, 30, 500, 500, [], 1.0, undefined, 0, false, false, 0.8);
  assert.equal(bear.isSeekingShelter, true);
  assert.equal(bear.aiBehavior, 'seeking_shelter');

  // Place bear deep inside its cavern chamber during rain -> rests/sleeps inside
  const cosY = Math.cos(cave.facingYaw);
  const sinY = Math.sin(cave.facingYaw);
  bear.x = cave.x + 0 * cosY + -15.0 * sinY;
  bear.z = cave.z - 0 * sinY + -15.0 * cosY;
  stepSmallAnimals(singleBear, 0.05, 31, 500, 500, [], 1.0, undefined, 0, false, false, 0.8);
  assert.equal(bear.isResting, true);
  assert.equal(bear.aiBehavior, 'sleeping');
});

test('stepSmallAnimals_WhenBearApproachedByPlayer_ShouldProgressFromHindLegRoarToFourLegStompBeforeChargingAndAttacking', () => {
  const animals = createInitialSmallAnimals();
  const bear = animals.find((a) => a.species === 'bear')!;
  const singleBear = [bear];
  bear.x = 60;
  bear.z = 25;

  // Stage 1: Player at 17m (distant detection 13.5..22m) -> Bear stands on 2 hind legs and roars ('roaring')
  stepSmallAnimals(singleBear, 0.05, 50, bear.x + 17.0, bear.z, [], 1.0, undefined, 1.5, false, false, 0);
  assert.equal(bear.aiBehavior, 'roaring', 'Bear at 17m should stand on hind legs and roar');
  assert.equal(bear.stompWarningDone, false);

  // Full animation commitment: while actionTimer > 0 during 'roaring', moving player to 10.5m does NOT interrupt 'roaring' mid-animation!
  stepSmallAnimals(singleBear, 0.05, 50.05, bear.x + 10.5, bear.z, [], 1.0, undefined, 1.5, false, false, 0);
  assert.equal(bear.aiBehavior, 'roaring', 'Bear must complete its roaring animation before switching state');
  assert.equal(bear.vx, 0, 'Bear must not move while roaring');

  // Advance until the 1.15s roar animation completes -> Bear transitions to 'stomping' at 10.5m
  for (let s = 0; s < 25; s++) {
    stepSmallAnimals(singleBear, 0.05, 50.1 + s * 0.05, bear.x + 10.5, bear.z, [], 1.0, undefined, 1.5, false, false, 0);
  }
  assert.equal(bear.aiBehavior, 'stomping', 'Bear at 10.5m should stomp on 4 legs to intimidate after finishing roar');
  assert.equal(bear.stompWarningDone, true);

  // Stage 3: Player steps inside 6.0m after stomp warning animation completes -> Bear charges ('charging')
  for (let s = 0; s < 22; s++) {
    stepSmallAnimals(singleBear, 0.05, 52 + s * 0.05, bear.x + 6.0, bear.z, [], 1.0, undefined, 1.5, false, false, 0);
  }
  assert.equal(bear.aiBehavior, 'charging', 'Bear inside 7.5m after stomp warning should charge');
});

test('stepSmallAnimals_WhenPredatorAttacksRetreatingPlayer_ShouldNotCancelAttackAndShouldContinueAdvancing', () => {
  const animals = createInitialSmallAnimals();
  const jaguar = animals.find((a) => a.species === 'jaguar')!;
  const singleJag = [jaguar];
  jaguar.x = 60;
  jaguar.z = 25;

  // 1. Jaguar is at 3.2m (outside attackTriggerDist = 2.45m -> keeps charging toward the player)
  jaguar.aiBehavior = 'charging';
  stepSmallAnimals(singleJag, 0.05, 60, jaguar.x + 3.2, jaguar.z, [], 1.0, undefined, 1.0, false, false, 0);
  assert.equal(jaguar.aiBehavior, 'charging', 'Predator at 3.2m must keep charging closer until reaching attackTriggerDist');

  // 2. Jaguar closes in to 1.85m -> enters committed 'attacking' state with actionTimer (0.68s)
  const startJagX = jaguar.x;
  stepSmallAnimals(singleJag, 0.05, 60.05, jaguar.x + 1.85, jaguar.z, [], 1.0, undefined, 1.0, false, false, 0);
  assert.equal(jaguar.aiBehavior, 'attacking', 'Predator at 1.85m must enter attacking state');
  assert.ok((jaguar.actionTimer ?? 0) > 0.55, 'Attacking predator must lock commitment timer');

  // 3. Player walks backward to 3.4m away while jaguar is mid-attack -> jaguar MUST NOT cancel 'attacking' and MUST leap forward!
  stepSmallAnimals(singleJag, 0.05, 60.1, startJagX + 3.4, jaguar.z, [], 1.0, undefined, 2.5, false, false, 0);
  assert.equal(jaguar.aiBehavior, 'attacking', 'Predator must NOT cancel attack when player retreats to 3.4m');
  assert.ok(jaguar.x > startJagX, 'Predator must leap forward during pounce');

  // 4. Deer must NEVER attack the player (always flees when approached closely)
  const deer = animals.find((a) => a.species === 'deer')!;
  deer.x = 60;
  deer.z = 25;
  stepSmallAnimals([deer], 0.05, 60.2, deer.x + 1.2, deer.z, [], 1.0, undefined, 3.0, false, false, 0);
  assert.equal(deer.aiBehavior, 'fleeing', 'Deer must flee and never attack the player');
});

test('stepSmallAnimals_WhenPredatorAttacksStationaryOrStrafingPlayer_ShouldMaintainMeleeStandoffAndNeverOvershootOrSpin', () => {
  const animals = createInitialSmallAnimals();
  const jaguar = animals.find((a) => a.species === 'jaguar')!;
  const singleJag = [jaguar];
  const standoff = getPredatorMeleeStandoffDist('jaguar');
  assert.ok(standoff >= 1.65 && standoff <= 2.0, 'Jaguar melee standoff should be ~1.8m');
  assert.ok(getPredatorAttackTriggerDist('jaguar') > standoff);

  // Place player at (100, 100) and Jaguar 5m away at (95, 100) charging the player
  const playerX = 100;
  const playerZ = 100;
  jaguar.x = 95;
  jaguar.z = 100;
  jaguar.yaw = Math.PI / 2; // facing +X toward player
  jaguar.aiBehavior = 'charging';
  jaguar.actionTimer = 0;

  // Step 40 frames (2.0s) while player stands still at (100, 100):
  // Jaguar must close in, cycle cleanly between 'attacking' (0.68s) and 'charging' without freezing, stop at ~standoffDist (~1.8m), NEVER cross x=100, and NEVER flip yaw!
  let sawAttacking = false;
  for (let f = 0; f < 40; f++) {
    const prevYaw = jaguar.yaw;
    stepSmallAnimals(singleJag, 0.05, 80 + f * 0.05, playerX, playerZ, [], 1.0, undefined, 0, false, false, 0);
    if ((jaguar.aiBehavior as string) === 'attacking') sawAttacking = true;
    const dist = Math.hypot(playerX - jaguar.x, playerZ - jaguar.z);
    assert.ok(
      jaguar.x < playerX - 1.2,
      `Jaguar must never overshoot or walk onto player center (got jaguar.x=${jaguar.x.toFixed(2)} vs playerX=${playerX}, dist=${dist.toFixed(2)})`
    );
    const yawDelta = Math.abs(Math.atan2(Math.sin(jaguar.yaw - prevYaw), Math.cos(jaguar.yaw - prevYaw)));
    assert.ok(
      yawDelta <= 0.35,
      `Jaguar yaw must never spin erratically in a single frame (got delta=${yawDelta.toFixed(3)} rad)`
    );
  }
  const finalStationaryDist = Math.hypot(playerX - jaguar.x, playerZ - jaguar.z);
  assert.equal(sawAttacking, true, 'Jaguar must trigger attacking within melee range');
  assert.ok(
    (jaguar.aiBehavior as string) === 'attacking' || (jaguar.aiBehavior as string) === 'charging',
    `Expected attacking or charging, got ${jaguar.aiBehavior}`
  );
  assert.ok(
    finalStationaryDist >= standoff - 0.32 && finalStationaryDist <= standoff + 0.15,
    `Jaguar should hold melee standoff distance (~${standoff}m), got ${finalStationaryDist.toFixed(2)}m`
  );

  // Now player strafes slightly left & right around (100, 100.6) -> Jaguar should track smoothly without spinning
  for (let f = 0; f < 15; f++) {
    const prevYaw = jaguar.yaw;
    const strafeZ = playerZ + Math.sin(f * 0.4) * 0.65;
    stepSmallAnimals(singleJag, 0.05, 82 + f * 0.05, playerX, strafeZ, [], 1.0, undefined, 1.5, false, false, 0);
    const yawDelta = Math.abs(Math.atan2(Math.sin(jaguar.yaw - prevYaw), Math.cos(jaguar.yaw - prevYaw)));
    assert.ok(
      yawDelta <= 0.25,
      `Jaguar yaw must track strafing player smoothly without spinning (got delta=${yawDelta.toFixed(3)} rad)`
    );
  }
});

test('createReadyWolfAndRhinoAndScaledBearCrocodile_WhenConstructed_ShouldUseNewGlbBundlesLargerScalesAndSmoothPoseCrossfades', () => {
  const wolf = createReadyWolf();
  assert.equal(wolf.rig.bones.length, 59, 'New GLB Wolf rig must have 59 joints');
  const wolfPosAttr = wolf.mesh.geometry.getAttribute('position');
  assert.equal(wolfPosAttr.count, 9563, 'New GLB Wolf mesh must have 9,563 vertices');
  for (const state of WOLF_STATES) {
    wolf.setState(state);
    wolf.update(0.05);
    assert.equal(wolf.state, state);
  }

  // Verify live pose-snapshot crossfade: switching from 'sit' to 'run' on a tiny dt (0.01s) must blend gradually!
  wolf.setState('sit');
  for (let i = 0; i < 20; i++) wolf.update(0.05);
  const sitQuat0 = wolf.rig.bones[2].quaternion.clone();
  wolf.setState('run');
  wolf.update(0.01);
  const immediateRunQuat = wolf.rig.bones[2].quaternion.clone();
  const angleAfter10ms = 2 * Math.acos(Math.min(1, Math.abs(sitQuat0.dot(immediateRunQuat))));
  assert.ok(
    angleAfter10ms < 0.08,
    `Transition from sit to run must blend smoothly without a 1-frame snap (angle after 10ms = ${angleAfter10ms.toFixed(4)} rad)`
  );
  wolf.dispose();

  const rhino = createReadyRhino();
  assert.equal(rhino.rig.bones.length, 43, 'New GLB Rhino rig must have 43 joints');
  const rhinoPosAttr = rhino.mesh.geometry.getAttribute('position');
  assert.equal(rhinoPosAttr.count, 3032, 'New GLB Rhino mesh must have 3,032 vertices');
  assert.ok(rhino.object.scale.x >= 0.055, `Rhino scale (${rhino.object.scale.x}) must be enlarged (>= 0.055)`);
  for (const state of RHINO_STATES) {
    rhino.setState(state);
    rhino.update(0.05);
    assert.equal(rhino.state, state);
  }
  rhino.dispose();

  const lion = createReadyCatLion();
  assert.equal(lion.rig.bones.length, 42, 'CatLion rig must have 42 joints');
  for (const state of CAT_LION_STATES) {
    lion.setState(state);
    lion.update(0.05);
    assert.equal(lion.state, state);
  }
  lion.dispose();

  const stag = createReadyStag();
  assert.equal(stag.rig.bones.length, 47, 'Stag rig must have 47 joints');
  for (const state of STAG_STATES) {
    stag.setState(state);
    stag.update(0.05);
    assert.equal(stag.state, state);
  }
  stag.dispose();

  const demonDragon = createReadyDemonDragon();
  assert.equal(demonDragon.rig.bones.length, 120, 'DemonDragon rig must have 120 joints');
  for (const state of DEMON_DRAGON_STATES) {
    demonDragon.setState(state);
    demonDragon.update(0.05);
    assert.equal(demonDragon.state, state);
  }
  demonDragon.dispose();

  const bear = createReadyBear();
  assert.ok(bear.object.scale.x >= 1.55, `Bear scale (${bear.object.scale.x}) must be enlarged (>= 1.55)`);
  bear.dispose();

  const croc = createReadyCrocodile();
  assert.ok(croc.object.scale.x >= 0.75, `Crocodile scale (${croc.object.scale.x}) must be enlarged (>= 0.75)`);
  croc.dispose();
});

test('stepSmallAnimals_WhenBearOrCrocodileAttacksOrStomps_ShouldStandInPlaceWithZeroSlidingAndWolfJaguarShouldPounce', () => {
  const animals = createInitialSmallAnimals();
  const bear = animals.find((a) => a.species === 'bear')!;
  const singleBear = [bear];
  bear.x = 60;
  bear.z = 25;

  // 1. Bear roaring & stomping must have strictly zero horizontal sliding velocity (vx = 0, vz = 0)
  stepSmallAnimals(singleBear, 0.05, 50, bear.x + 16.0, bear.z, [], 1.0, undefined, 1.5, false, false, 0);
  assert.equal(bear.aiBehavior, 'roaring');
  assert.equal(bear.vx, 0, 'Bear must not slide on ground while roaring');
  assert.equal(bear.vz, 0, 'Bear must not slide on ground while roaring');

  bear.actionTimer = 0;
  stepSmallAnimals(singleBear, 0.05, 50.1, bear.x + 10.0, bear.z, [], 1.0, undefined, 1.5, false, false, 0);
  assert.equal(bear.aiBehavior, 'stomping');
  assert.equal(bear.vx, 0, 'Bear must not slide on ground while stomping');
  assert.equal(bear.vz, 0, 'Bear must not slide on ground while stomping');

  // 2. Bear in melee range ('attacking') must stand firmly in place (vx = 0, vz = 0) even if player backs up!
  bear.actionTimer = 0;
  bear.stompWarningDone = true;
  bear.aiBehavior = 'charging';
  stepSmallAnimals(singleBear, 0.05, 50.2, bear.x + 2.6, bear.z, [], 1.0, undefined, 1.5, false, false, 0);
  assert.equal(bear.aiBehavior, 'attacking', 'Bear within attackTriggerDist must enter attacking state');
  assert.equal(bear.vx, 0, 'Bear must stand in place (vx=0) during attack animation');
  assert.equal(bear.vz, 0, 'Bear must stand in place (vz=0) during attack animation');

  // Player backs up to 4.2m while Bear is mid-attack -> Bear finishes stationary swing in place without sliding!
  const bearAttackX = bear.x;
  stepSmallAnimals(singleBear, 0.05, 50.25, bear.x + 4.2, bear.z, [], 1.0, undefined, 3.0, false, false, 0);
  assert.equal(bear.aiBehavior, 'attacking');
  assert.equal(bear.vx, 0, 'Bear must not slide forward when player backs up during Bear attack');
  assert.equal(bear.x, bearAttackX, 'Bear X position must remain stationary during attack animation');

  // 3. Wolf & Jaguar pounce forward through the air (pounceHeight > 0) and miss cleanly if player dodges/retreats
  const wolf = animals.find((a) => a.species === 'wolf')!;
  const singleWolf = [wolf];
  wolf.x = 80;
  wolf.z = 25;
  wolf.aiBehavior = 'charging';
  stepSmallAnimals(singleWolf, 0.05, 60, wolf.x + 2.1, wolf.z, [], 1.0, undefined, 1.0, false, false, 0);
  assert.equal(wolf.aiBehavior, 'attacking');
  stepSmallAnimals(singleWolf, 0.05, 60.05, wolf.x + 3.5, wolf.z, [], 1.0, undefined, 3.0, false, false, 0);
  assert.ok((wolf.pounceHeight ?? 0) > 0.05, `Wolf pounce must leap into the air (pounceHeight=${wolf.pounceHeight})`);
});

test('stepSmallAnimals_WhenRhinoChargesVsStands_ShouldKeepRunningWhenChargingAndAttackStationaryWhenNotRunning', () => {
  const animals = createInitialSmallAnimals();
  const rhino = animals.find((a) => a.species === 'rhino')!;
  const singleRhino = [rhino];
  rhino.x = 100;
  rhino.z = 100;
  rhino.yaw = Math.PI / 2; // facing +X
  rhino.rhinoPhase = 'charging';
  rhino.rhinoChargeSpeed = 3.5;

  // 1. Rhino charges toward player at (114, 100), building up high momentum speed
  for (let i = 0; i < 12; i++) {
    stepSmallAnimals(singleRhino, 0.05, 90 + i * 0.05, 114, 100, [], 1.0, undefined, 0, false, false, 0);
  }
  assert.equal(rhino.aiBehavior, 'charging');
  assert.ok((rhino.rhinoChargeSpeed ?? 0) > 6.5, `Rhino should accelerate to high speed (got ${rhino.rhinoChargeSpeed})`);

  // 2. When Rhino is already running (rhinoChargeSpeed > 3.2) and closes within range of player,
  //    it keeps running ('charging') right toward the player and that running impact deals damage!
  rhino.x = 110.2;
  rhino.z = 100;
  stepSmallAnimals(singleRhino, 0.05, 91, 114, 100, [], 1.0, undefined, 0, false, false, 0);
  assert.equal(rhino.aiBehavior, 'charging', 'Running Rhino in range must keep running toward player');
  const runImpactSpd = Math.hypot(rhino.vx, rhino.vz);
  assert.ok(runImpactSpd > 6.0, `Running Rhino must maintain high speed (speed=${runImpactSpd.toFixed(2)} m/s)`);

  // 3. Player dodges sharply sideways to (110.5, 106) -> Rhino cannot make the sharp turn at high speed and enters 'overshoot_braking'!
  stepSmallAnimals(singleRhino, 0.05, 91.1, 110.5, 106, [], 1.0, undefined, 5.0, false, false, 0);
  assert.equal(rhino.rhinoPhase, 'overshoot_braking', 'Rhino must enter overshoot_braking when player dodges sideways');

  // 4. Rhino decelerates/brakes, transitions to 'realigning', turns toward the player, and resumes 'charging'!
  let sawRealigning = false;
  for (let i = 0; i < 35; i++) {
    stepSmallAnimals(singleRhino, 0.05, 91.2 + i * 0.05, 110.5, 106, [], 1.0, undefined, 0, false, false, 0);
    if (rhino.rhinoPhase === 'realigning') sawRealigning = true;
  }
  assert.equal(sawRealigning, true, 'Rhino must transition through realigning phase after braking');
  assert.equal(rhino.rhinoPhase, 'charging', 'Rhino must resume charging once realigned with target');

  // 5. When Rhino is NOT running (stationary / low speed) and player is within attack range,
  //    it performs its 'attacking' animation completely stationary in place (vx = 0, vz = 0)!
  rhino.rhinoChargeSpeed = 0;
  rhino.vx = 0;
  rhino.vz = 0;
  rhino.x = 108.0;
  rhino.z = 106.0;
  rhino.actionTimer = 0;
  stepSmallAnimals(singleRhino, 0.05, 95.0, 110.5, 106.0, [], 1.0, undefined, 0, false, false, 0);
  assert.equal(rhino.aiBehavior, 'attacking', 'Stationary Rhino in range must perform stationary attack');
  assert.equal(rhino.vx, 0, 'Stationary Rhino attack must have vx = 0');
  assert.equal(rhino.vz, 0, 'Stationary Rhino attack must have vz = 0');
});

test('stepSmallAnimals_WhenLandAnimalEntersWater_ShouldNeverFreezeAndShouldSwimTowardDryShore', () => {
  const animals = createInitialSmallAnimals();
  const deer = animals.find((a) => a.species === 'deer')!;
  const singleDeer = [deer];

  // Place deer inside the central lake (x = 0, z = 0 is underwater: groundHeightAt(0,0) < WATER_LEVEL)
  deer.x = 0;
  deer.z = 0;
  deer.vx = 8.0; // enters water at high running speed
  deer.vz = 0;
  assert.ok(groundHeightAt(0, 0) < WATER_LEVEL - 1.2, 'Test setup: (0,0) must be deep underwater');

  const startX = deer.x;
  const startZ = deer.z;
  for (let step = 0; step < 20; step++) {
    stepSmallAnimals(singleDeer, 0.05, 70 + step * 0.05, 500, 500, [], 1.0, undefined, 0, false, false, 0);
  }
  const distMoved = Math.hypot(deer.x - startX, deer.z - startZ);
  const swimSpd = Math.hypot(deer.vx, deer.vz);
  assert.ok(
    distMoved > 1.5,
    `Land animal in water must actively swim toward shore instead of freezing in place (moved ${distMoved.toFixed(2)}m)`
  );
  assert.ok(
    swimSpd < 2.2,
    `Non-aquatic land animal must slow down significantly when swimming in water (got ${swimSpd.toFixed(2)} m/s)`
  );
  assert.equal(deer.inWater, true, 'Deer in deep lake must be marked inWater = true');
  assert.ok(
    deer.y <= WATER_LEVEL - getAnimalWaterSubmergenceDepth('deer') + 0.05,
    `Swimming land animal must sink up to its neck/back in water (deer.y=${deer.y.toFixed(2)} vs WATER_LEVEL=${WATER_LEVEL})`
  );

  // Conversely, a semi-aquatic crocodile in water maintains or increases its speed!
  assert.ok(
    getAnimalWaterSpeedMultiplier('crocodile') > 1.2 &&
      getAnimalWaterSpeedMultiplier('deer') < 0.5,
    'Crocodile water speed multiplier must be > 1.2 while non-aquatic land animals must be < 0.5'
  );
  const croc = animals.find((a) => a.species === 'crocodile')!;
  croc.x = 0;
  croc.z = 0;
  croc.aiBehavior = 'charging';
  stepSmallAnimals([croc], 0.05, 72.0, 10.0, 0, [], 1.0, undefined, 0, false, false, 0);
  assert.equal(croc.inWater, true);
  assert.ok(
    croc.x > 0.35,
    `Crocodile swimming in water must move faster with aquatic speed boost (moved ${croc.x.toFixed(2)}m in 0.05s)`
  );
});

test('stepSmallAnimals_WhenPredatorDetectsPreyOrLargerThreat_ShouldHuntPreyAndFleeLargerThreat', () => {
  const animals = createInitialSmallAnimals();
  const jaguar = animals.find((a) => a.species === 'jaguar')!;
  const rabbit = animals.find((a) => a.species === 'rabbit')!;
  const bear = animals.find((a) => a.species === 'bear')!;

  // 1. Place rabbit 15m from jaguar -> jaguar stalks prey
  rabbit.x = jaguar.x + 15.0;
  rabbit.z = jaguar.z;
  stepSmallAnimals([jaguar, rabbit], 0.05, 40, 500, 500, [], 1.0, undefined, 0, false, false, 0);
  assert.equal(jaguar.aiBehavior, 'stalking');

  // 2. Place rabbit 7m from jaguar -> jaguar roars then charges!
  rabbit.x = jaguar.x + 7.0;
  rabbit.z = jaguar.z;
  stepSmallAnimals([jaguar, rabbit], 0.05, 41, 500, 500, [], 1.0, undefined, 0, false, false, 0);
  assert.ok((jaguar.aiBehavior as string) === 'roaring' || (jaguar.aiBehavior as string) === 'charging');
  for (let s = 0; s < 15; s++) {
    stepSmallAnimals([jaguar, rabbit], 0.05, 41.1 + s * 0.05, 500, 500, [], 1.0, undefined, 0, false, false, 0);
  }
  assert.ok((jaguar.aiBehavior as string) === 'charging' || (jaguar.aiBehavior as string) === 'attacking');

  // 3. Place larger Bear 8m from Jaguar -> Jaguar feels threatened by larger predator and flees!
  bear.x = jaguar.x - 8.0;
  bear.z = jaguar.z;
  stepSmallAnimals([jaguar, bear], 0.05, 45, 500, 500, [], 1.0, undefined, 0, false, false, 0);
  assert.equal(jaguar.aiBehavior, 'fleeing');
  assert.equal(jaguar.alertLevel, 'fleeing');
});

test('computeSlopePitchAndRoll_WhenOnFlatOrSlopedGround_ShouldAlignEntityToSlope', () => {
  const flat = computeSlopePitchAndRoll(0, 1, 0, 0);
  assert.ok(Math.abs(flat.pitch) < 1e-6);
  assert.ok(Math.abs(flat.roll) < 1e-6);

  // Facing +Z (yaw = 0) on a slope tilting toward +Z (nz > 0) -> positive pitch
  const slopedZ = computeSlopePitchAndRoll(0, 0.8944, 0.4472, 0);
  assert.ok(slopedZ.pitch > 0.35 && slopedZ.pitch <= 0.52);
  assert.ok(Math.abs(slopedZ.roll) < 1e-6);
});

test('stepBoidsAndWildlife_WhenSteppedWithPlayerProximity_ShouldUpdateCreaturesAndTriggerFleeing', () => {
  const birds = createInitialBoidBirds();
  const animals = createInitialSmallAnimals();
  const playerX = animals[0].x + 1;
  const playerY = animals[0].y;
  const playerZ = animals[0].z + 1;
  const playerSpeed = 8.0;
  const dt = 0.05;

  const result = stepBoidsAndWildlife(birds, animals, playerX, playerY, playerZ, playerSpeed, dt);

  assert.ok(result.scamperedCritterCount >= 0);
  assert.ok(Number.isFinite(result.nearestCritterDist));
  assert.ok(birds.every((b) => Number.isFinite(b.x) && Number.isFinite(b.z)));
});
// #endregion

// ======================== GUARD CLAUSE AND VALIDATION TESTS ======================== \\
// #region Guard Clause and Validation Tests
test('BIRD_FLOCK_CONFIGS_WhenLoaded_ShouldContainFlockCentersAndSpecies', () => {
  const expectedMinCount = 3;
  const configs = BIRD_FLOCK_CONFIGS;

  assert.ok(configs.length >= expectedMinCount, 'Expected at least 3 bird flock nodes');
  for (const cfg of configs) {
    assert.ok(cfg.patrolRadius > 0, 'Flock patrol radius must be positive');
    assert.ok(cfg.cruiseAltitudeAboveGround > 0, 'Cruising altitude must be positive');
  }
});
// #endregion

// ======================== EDGE CASES AND INFRASTRUCTURE FAILURES ======================== \\
// #region Edge Cases and Infrastructure Failures
test('ensureSafeOffscreenAnimalSpawns_WhenPlayerStartsAmongAnimals_ShouldMoveEveryAnimalOutOfSight', () => {
  // Arrange
  const playerSpawns = [
    { x: 68, z: 26, yaw: 0 },
    { x: 148, z: 112, yaw: 1.2 },
    { x: -64, z: -24, yaw: 3 },
  ] as const;

  // Act
  const unsafeSpeciesPerSpawn = playerSpawns.map((spawn) => {
    const animals = createInitialSmallAnimals();
    ensureSafeOffscreenAnimalSpawns(animals, spawn.x, spawn.z, spawn.yaw);
    return animals
      .filter((animal) => !isSafeAnimalSpawnPosition(animal.x, animal.z, spawn.x, spawn.z, spawn.yaw))
      .map((animal) => animal.species);
  });

  // Assert
  assert.deepEqual(unsafeSpeciesPerSpawn, [[], [], []]);
});

test('stepBoidsAndWildlife_WhenZeroDtProvided_ShouldNotProduceNanPositions', () => {
  const birds = createInitialBoidBirds();
  const animals = createInitialSmallAnimals();

  const result = stepBoidsAndWildlife(birds, animals, 0, 0, 0, 0, 0);

  assert.ok(Number.isFinite(result.nearestBirdDist));
  assert.ok(birds.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y)));
  assert.ok(animals.every((a) => Number.isFinite(a.x) && Number.isFinite(a.z)));
});

test('stepSmallAnimals_WhenCrocodileHitOrPlayerLeavesRange_ShouldChaseWithoutOscillationAndReturnWhenOutOfRange', () => {
  const animals = createInitialSmallAnimals();
  const crocs = animals.filter((a) => a.species === 'crocodile');
  assert.ok(crocs.length >= 4, 'Expected multiple crocodiles in lagoon');

  // 1. Hitting one crocodile wakes and aggros ALL crocodiles to charge the player together
  const attackerX = CROCODILE_RIVER_BEND_POS.x - 18.0;
  const attackerZ = CROCODILE_RIVER_BEND_POS.z;
  damageGroundAnimal(crocs[0], 1, attackerX, attackerZ, animals);
  for (const c of crocs) {
    assert.equal(c.aiBehavior, 'charging', 'All crocodiles must enter charging state when one is hit');
    assert.ok((c.wokenUpTimer ?? 0) >= 10.0, 'All crocodiles must have wokenUpTimer set');
    assert.equal(c.stimulusX, attackerX);
    assert.equal(c.stimulusZ, attackerZ);
  }

  // 2. Crocodile within 4.1m of player attempts a forward lunge strike (pushes itself forward!)
  const leadCroc = crocs[0];
  leadCroc.x = 120.0;
  leadCroc.z = 475.0;
  leadCroc.homeX = 120.0;
  leadCroc.homeZ = 475.0;
  leadCroc.actionTimer = 0;
  leadCroc.aiBehavior = 'charging';
  stepSmallAnimals([leadCroc], 0.05, 100.0, leadCroc.x + 3.9, leadCroc.z, [], 1.0, undefined, 0, false, false, 0);
  assert.equal(leadCroc.aiBehavior, 'attacking', 'Crocodile at 3.9m should attempt attack lunge');
  assert.ok(leadCroc.vx > 2.0, `Crocodile must push itself forward during attack lunge (got vx=${leadCroc.vx})`);

  // 3. When player moves away from water (e.g. 22m or 42m away) while provoked, crocodile continues chasing without oscillating back and forth!
  leadCroc.actionTimer = 0;
  leadCroc.wokenUpTimer = 12.0;
  leadCroc.x = leadCroc.homeX - 40.0;
  leadCroc.z = leadCroc.homeZ;
  stepSmallAnimals([leadCroc], 0.05, 101.0, leadCroc.x - 12.0, leadCroc.z, [], 1.0, undefined, 0, false, false, 0);
  assert.equal(leadCroc.aiBehavior, 'charging', 'Provoked crocodile must keep chasing player away from water without turning back');
  assert.ok(leadCroc.vx < -2.0, 'Crocodile must move toward player (-X), not back toward water');

  // 4. Once player leaves the crocodile's range (e.g. > 65m away), crocodile returns smoothly to its water home!
  stepSmallAnimals([leadCroc], 0.05, 102.0, leadCroc.x - 85.0, leadCroc.z, [], 1.0, undefined, 0, false, false, 0);
  assert.equal(leadCroc.aiBehavior, 'wandering', 'Crocodile out of player range must return to water');
  assert.ok(leadCroc.vx > 2.0, 'Crocodile must walk back toward +X (its homeX in the water)');
});

test('stepSmallAnimals_WhenBearInsideCavePursuesPlayerOutside_ShouldExitCaveWithoutBlockingOrFreezingInRoarLoop', () => {
  const animals = createInitialSmallAnimals();
  // Find a bear spawned inside Cave 0 alcove (caveIndex === 0, z < -85)
  const caveBear = animals.find((a) => a.species === 'bear' && a.caveIndex === 0 && a.z < -85)!;
  assert.ok(caveBear, 'Expected a bear spawned inside Cave 0 cavern');

  const singleBear = [caveBear];
  // Player stands outside the cave entrance at (-85, -67) (~23m from alcove, outside tunnel at z = -70)
  const playerX = -85.0;
  const playerZ = -68.5;

  // Step 160 frames (8 seconds): bear roars once (0.75s), stalks through the tunnel, stomps (0.85s), and charges out of the cave mouth past z = -72!
  for (let step = 0; step < 160; step++) {
    stepSmallAnimals(singleBear, 0.05, 200 + step * 0.05, playerX, playerZ, [], 1.0, undefined, 2.0, false, false, 0);
  }

  assert.ok(
    caveBear.z > -73.0,
    `Bear inside cave must exit through the tunnel mouth without being blocked by rocks or stuck in a roar loop (got z=${caveBear.z.toFixed(2)})`
  );
});

test('southernDragonRuinsAndForestDragon_WhenConstructed_ShouldHaveExpandedBrokenWallsAndFlyAnimation', () => {
  // 1. Southern Dragon Ruins radius expanded to 58.0m
  assert.equal(SOUTHERN_DRAGON_RUINS_POS.radius, 58.0);

  // 2. Ruined walls moved outward to +/-37m from (56, 716) with multiple broken segments and walkable breach gaps
  const southRuinsWalls = SOLID_BUILDING_BOXES.filter((b) => b.id.startsWith('south-ruins-wall-'));
  assert.ok(southRuinsWalls.length >= 11, 'Expected shattered wall segments with gaps around the expanded perimeter');
  // Verify the old +/-28m perimeter (e.g. x=28, z=700 or x=40, z=689) is now wide open inside the expanded courtyard
  const oldWallSpotBlocked = southRuinsWalls.some(
    (b) => 28.0 >= b.minX && 28.0 <= b.maxX && 700.0 >= b.minZ && 700.0 <= b.maxZ
  );
  assert.equal(oldWallSpotBlocked, false, 'Old +/-28m wall positions must be inside the expanded open courtyard');

  // Verify walkable breach gaps exist along the moved-out West wall (x=19, z=724) and South wall (x=56, z=753)
  const westBreachBlocked = southRuinsWalls.some(
    (b) => 19.0 >= b.minX && 19.0 <= b.maxX && 724.0 >= b.minZ && 724.0 <= b.maxZ
  );
  const southBreachBlocked = southRuinsWalls.some(
    (b) => 56.0 >= b.minX && 56.0 <= b.maxX && 753.0 >= b.minZ && 753.0 <= b.maxZ
  );
  assert.equal(westBreachBlocked, false, 'West shattered wall must have a walkable collapsed breach gap');
  assert.equal(southBreachBlocked, false, 'South shattered wall must have a walkable collapsed breach gap');

  // 3. ForestDragon supports full flight ('fly') as well as ground animations at scale 7.8
  assert.ok(FOREST_DRAGON_STATES.includes('fly'), 'ForestDragon must expose fly state');
  const dragon = createReadyForestDragon({ scale: 7.8 });
  assert.equal(dragon.object.scale.x, 7.8);
  dragon.setState('fly');
  dragon.update(0.1, 0.2);
  dragon.setState('roar');
  dragon.update(0.1, -0.2);
  dragon.setState('walk');
  dragon.update(0.1, 0);
});

test('southernDragon_WhenEvaluatedAndDamaged_ShouldOnlyFightPreyOrPlayerHaveColossal250HpAndNoNearbyBed', () => {
  const animals = createInitialSmallAnimals();
  const dragon = animals.find((a) => a.species === 'dragon')!;
  assert.ok(dragon, 'Expected Southern Dragon in world animals registry');
  assert.equal(getAnimalMaxHp('dragon'), 7500, 'Southern Dragon must have colossal 7500 HP pool');
  assert.equal(dragon.hp, getAnimalMaxHp('dragon', dragon.level));
  assert.equal(dragon.maxHp, getAnimalMaxHp('dragon', dragon.level));

  // 1. When player is far away (e.g. at spawn 0,0) and deer are outside 34m range, dragon has NO target (peaceful flight/rest, never fights empty air)
  const peacefulCheck = evaluateSouthernDragonTarget(56, 716, 0, 0, animals, 0);
  assert.equal(peacefulCheck.hasTarget, false, 'Dragon must NOT fight when no player or deer is within range');
  assert.equal(peacefulCheck.targetKind, 'none');

  // 2. When a deer wanders within range of the ruins (e.g. at 68, 712 -> 12.6m away), dragon targets the deer!
  const deer = animals.find((a) => a.species === 'deer')!;
  deer.x = 68;
  deer.z = 712;
  const preyCheck = evaluateSouthernDragonTarget(56, 716, 0, 0, animals, 0);
  assert.equal(preyCheck.hasTarget, true, 'Dragon must target a deer that enters the ruins');
  assert.equal(preyCheck.targetKind, 'prey');
  assert.equal(preyCheck.targetPrey, deer);

  // 3. Dragon is vulnerable to damage, takes 7500 HP to kill, never flees even at low HP, and can be looted when slain
  const hit1 = damageGroundAnimal(dragon, 300, 62, 714, animals);
  assert.equal(hit1.killed, false);
  assert.ok(hit1.remainingHp < dragon.maxHp && hit1.remainingHp >= dragon.maxHp - 300, 'Dragon takes arrow damage from its scaled pool');
  assert.equal(dragon.aiBehavior, 'charging');

  // Bring the dragon down to a sliver of HP (its pool is level-scaled), then finish it with arrows.
  let guard = 0;
  while ((dragon.hp ?? 0) > 60 && guard++ < 500) {
    damageGroundAnimal(dragon, Math.max(1, (dragon.hp ?? 0) - 60), 62, 714, animals);
  }
  assert.equal(dragon.isDead, false, 'Dragon must still be alive above the final sliver of HP');
  assert.equal(dragon.isFleeing, false, 'Dragon must never flee even at low HP');

  let finalHit = damageGroundAnimal(dragon, 30, 62, 714, animals);
  while (!finalHit.killed && guard++ < 500) {
    finalHit = damageGroundAnimal(dragon, 30, 62, 714, animals);
  }
  assert.equal(finalHit.killed, true);
  assert.equal(dragon.isDead, true);
  const lootableDragon = findNearestDeadLootableAnimal(dragon.x + 5.0, dragon.z, animals);
  assert.equal(lootableDragon, dragon, 'Slain dragon must be lootable within 6.8m');

  // 4. Bed near the Southern Dragon ('bed-southern-valley-camp') is removed, and Sleeping Bags are registered & sleepable
  assert.equal(
    WORLD_BEDS.some((b) => b.id === 'bed-southern-valley-camp'),
    false,
    'Bed near the Southern Dragon must be removed'
  );
  const sleepingBags = WORLD_BEDS.filter((b) => b.id.startsWith('sleeping-bag-'));
  assert.ok(sleepingBags.length >= 20, 'Expected sleeping bags in Lodge, Watchtowers, and Pagoda Pavilions to be sleepable');
  const nearBag = findNearestBed(sleepingBags[0].x, sleepingBags[0].y, sleepingBags[0].z);
  assert.ok(nearBag && nearBag.id === sleepingBags[0].id, 'Player standing at a sleeping bag must detect it via findNearestBed');
});

test('volcanoSanctumFloatingIslandsBearCaveEntranceAndWaterEntry_WhenEvaluated_ShouldWorkSmoothly', () => {
  const animals = createInitialSmallAnimals();

  // 1. Volcano Sanctum & Mystical CatLion sitting on throne dais inside the inner chamber
  const lions = animals.filter((a) => a.species === 'lion');
  assert.equal(lions.length, 7);
  const sanctumLion = lions[0];
  assert.ok(
    isInsideVolcanoSanctum(sanctumLion.x, sanctumLion.z, sanctumLion.y),
    'Mystical CatLion must spawn inside the Volcano Sanctum chamber'
  );
  assert.equal(sanctumLion.aiBehavior, 'sitting', 'Mystical CatLion on the throne dais must start in sitting state');
  assert.ok(
    Math.abs(walkableHeightAt(VOLCANO_SANCTUM_POS.x, VOLCANO_SANCTUM_POS.z).height - VOLCANO_SANCTUM_POS.daisY) < 0.05,
    'Volcano Sanctum throne dais must be walkable at daisY (3.65m)'
  );
  assert.ok(
    Math.abs(walkableHeightAt(VOLCANO_SANCTUM_POS.entranceX, VOLCANO_SANCTUM_POS.entranceZ).height - VOLCANO_SANCTUM_POS.floorY) < 0.1,
    'Volcano Sanctum entrance tunnel must be walkable at floorY (3.2m)'
  );
  assert.ok(
    (getRoofHeightAt(VOLCANO_SANCTUM_POS.x, VOLCANO_SANCTUM_POS.z) ?? 0) >= VOLCANO_SANCTUM_POS.floorY + 12.0,
    'Volcano Sanctum inner chamber must have a high ceiling dome'
  );

  // 2. High-Altitude Floating Blooming Sky Islands (y >= 68m) & Spiraling Waterfall Mini-Islands
  const stags = animals.filter((a) => a.species === 'stag');
  assert.equal(stags.length, 4);
  for (const stag of stags) {
    const islandY = floatingBloomingIslandHeightAt(stag.x, stag.z, stag.y);
    assert.ok(
      islandY !== null && islandY >= 68.0,
      `Royal Stag at (${stag.x}, ${stag.z}) must spawn on a High-Altitude Floating Blooming Sky Island (got y=${stag.y}, islandY=${islandY})`
    );
  }

  // Verify the 57 Floating Mini-Islands & Grand Rest-Landing Terraces spiraling upward around the Central Sky-Waterfall (165, -35) from y=3.4m to y=68.0m
  assert.equal(FLOATING_WATERFALL_STEP_ISLANDS.length, 57);
  assert.equal(FLOATING_WATERFALL_STEP_ISLANDS.filter((s) => s.isRestLanding).length, 9);
  assert.ok(
    FLOATING_ISLAND_STAIR_POS.topY >= 68.0,
    `Floating island waterfall topY must be high in the air (>= 68m, got ${FLOATING_ISLAND_STAIR_POS.topY})`
  );
  // Ground-level Marble Entry Plaza Ramp smoothly connects valley floor to Mini-Island #0
  const rampHeight = floatingBloomingIslandHeightAt(
    FLOATING_ISLAND_STAIR_POS.entryRampStartX + 4.5,
    FLOATING_ISLAND_STAIR_POS.z,
    3.3
  );
  assert.ok(rampHeight !== null && rampHeight >= 3.18 && rampHeight <= 3.4);

  for (let i = 0; i < FLOATING_WATERFALL_STEP_ISLANDS.length; i += 4) {
    const stepIsl = FLOATING_WATERFALL_STEP_ISLANDS[i];
    const stepWalk = walkableHeightAt(stepIsl.x, stepIsl.z, stepIsl.y);
    assert.ok(
      Math.abs(stepWalk.height - stepIsl.y) < 0.85,
      `Spiral waterfall mini-island #${i} at (${stepIsl.x.toFixed(1)}, ${stepIsl.z.toFixed(1)}, y=${stepIsl.y.toFixed(1)}) must be walkable (got ${stepWalk.height.toFixed(2)}m)`
    );
  }

  // Verify Special Ideas: Celestial Sanctuary Bed, Sky-Waterfall Hydro-Elevator, and Sky Wind-Geyser Launch Pads
  const skyBed = findNearestBed(FLOATING_BLOOMING_ISLANDS[0].x, 68.35, FLOATING_BLOOMING_ISLANDS[0].z);
  assert.ok(skyBed && skyBed.id === 'bed-floating-sky-sanctuary', 'Main Floating Sky Island must have the Celestial Star-Sanctuary Bed');

  const testPlayer = createInitialPlayerState();
  testPlayer.x = FLOATING_ISLAND_STAIR_POS.waterfallX;
  testPlayer.z = FLOATING_ISLAND_STAIR_POS.waterfallZ;
  testPlayer.y = 10.0;
  stepPlayerPhysics(
    testPlayer,
    {
      forward: 1,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.05
  );
  assert.ok(testPlayer.vy >= 15.0, `Sky-Waterfall Hydro-Elevator must lift player upward (got vy=${testPlayer.vy})`);

  const geyser0 = SKY_WIND_GEYSERS[0];
  testPlayer.x = geyser0.x;
  testPlayer.z = geyser0.z;
  testPlayer.y = geyser0.y;
  testPlayer.onGround = true;
  testPlayer.coyoteTimer = 0.11;
  stepPlayerPhysics(
    testPlayer,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: true,
      jumpHeld: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.016
  );
  assert.ok(testPlayer.vy >= 18.0, `Sky Wind-Geyser pad must launch player with high upward velocity (got vy=${testPlayer.vy})`);

  // Stag fleeing on floating island stays safely clamped within the island rim instead of falling off the cliff
  const mainStag = stags[0];
  mainStag.aiBehavior = 'fleeing';
  mainStag.isFleeing = true;
  mainStag.fleeCooldown = 3.0;
  for (let i = 0; i < 40; i++) {
    stepSmallAnimals([mainStag], 0.05, 300 + i * 0.05, FLOATING_BLOOMING_ISLANDS[0].x, FLOATING_BLOOMING_ISLANDS[0].z, [], 1.0, undefined, 5.0, false, false, 0);
  }
  const stagDistFromMainCenter = Math.hypot(
    mainStag.x - FLOATING_BLOOMING_ISLANDS[0].x,
    mainStag.z - FLOATING_BLOOMING_ISLANDS[0].z
  );
  assert.ok(
    stagDistFromMainCenter <= FLOATING_BLOOMING_ISLANDS[0].radius - 1.5 && mainStag.y >= 67.5,
    `Stag on floating island must stay within the island rim and never fall off (dist=${stagDistFromMainCenter.toFixed(2)}m, y=${mainStag.y.toFixed(2)}m)`
  );

  // 3. Bear Cave Entrance Smoothness: walking along the entire entrance corridor (lz from +11 down to -12) across the full tunnel width (|lx| <= 4.2) has ZERO cliff spikes
  const cave0 = BEAR_MOUNTAIN_CAVES[0];
  const cosY = Math.cos(cave0.facingYaw);
  const sinY = Math.sin(cave0.facingYaw);
  for (let lz = 11.0; lz >= -12.0; lz -= 0.5) {
    for (const lx of [-4.0, -3.5, 0, 3.5, 4.0]) {
      const wx = cave0.x + lx * cosY + lz * sinY;
      const wz = cave0.z - lx * sinY + lz * cosY;
      const wh = walkableHeightAt(wx, wz, cave0.floorY).height;
      assert.ok(
        Math.abs(wh - cave0.floorY) < 0.25,
        `Bear Cave 0 entrance at (lx=${lx}, lz=${lz}) must be flat at floorY=${cave0.floorY}, got ${wh.toFixed(2)}m`
      );
    }
  }

  // 4. Smooth Water Entry: a fleeing deer or charging predator crossing from dry shore into water enters the water smoothly along its trajectory without bouncing 180 degrees back onto land
  const shoreDeer = animals.find((a) => a.species === 'deer')!;
  // Find exact shoreline along +X -> 0 at z = 0 where ground transitions into the central lake
  let shoreX = -15.0;
  for (let x = -40; x <= 0; x += 0.5) {
    if (groundHeightAt(x, 0) <= WATER_LEVEL + 0.15) {
      shoreX = x - 0.8; // just on the dry bank before water
      break;
    }
  }
  shoreDeer.x = shoreX;
  shoreDeer.z = 0;
  shoreDeer.y = walkableHeightAt(shoreX, 0).height;
  shoreDeer.aiBehavior = 'fleeing';
  shoreDeer.isFleeing = true;
  shoreDeer.fleeCooldown = 4.0;
  // Threat is behind the deer on dry land (shoreX - 4.0), pushing the deer into the lake (+X)
  for (let step = 0; step < 25; step++) {
    stepSmallAnimals([shoreDeer], 0.05, 400 + step * 0.05, shoreX - 4.0, 0, [], 1.0, undefined, 6.0, false, false, 0);
  }
  assert.ok(
    shoreDeer.x > shoreX + 1.2 && shoreDeer.inWater === true,
    `Fleeing animal at shoreline must smoothly enter the water (+X) instead of bouncing back at the shore (start=${shoreX.toFixed(2)}, end=${shoreDeer.x.toFixed(2)}, inWater=${shoreDeer.inWater})`
  );
});


/** Keeps arrows hitting a Boss CatLion until it is subdued (its HP scales with level, so a fixed hit may not be enough). */
const hitBossUntilSubdued = (boss: ISmallAnimalState, x: number, z: number): void => {
  for (let i = 0; i < 60 && !boss.isSubdued && !boss.isDead; i++) {
    damageGroundAnimal(boss, 60, x, z);
  }
};

test('spiralWaterfallStaircaseWalkAndStagLionTamingRiding_WhenSimulated_ShouldClimbWithoutJumpingAndRideSmoothly', () => {
  // 1. Verify walking continuously up all 57 spiral waterfall mini-islands from the ground entry plaza (144, -35, y=3.2m)
  //    all the way to the Main Floating Sky Island deck (188, -35, y=68.0m) with ZERO jumps (jumpPressed=false, jumpHeld=false)!
  const climber = createInitialPlayerState();
  climber.x = FLOATING_ISLAND_STAIR_POS.entryRampStartX + 1.5;
  climber.z = FLOATING_ISLAND_STAIR_POS.z;
  climber.y = walkableHeightAt(climber.x, climber.z).height;
  climber.onGround = true;

  let waypointIdx = 0;
  for (let tick = 0; tick < 1800 && waypointIdx < FLOATING_WATERFALL_STEP_ISLANDS.length; tick++) {
    const wp = FLOATING_WATERFALL_STEP_ISLANDS[waypointIdx];
    const dx = wp.x - climber.x;
    const dz = wp.z - climber.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.25) {
      waypointIdx++;
      continue;
    }
    climber.yaw = Math.atan2(-dx, -dz);
    stepPlayerPhysics(
      climber,
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
      0.02
    );
  }

  assert.equal(
    waypointIdx,
    FLOATING_WATERFALL_STEP_ISLANDS.length,
    `Player must walk smoothly through all 57 spiral staircase islands without ever snagging or jumping (reached island #${waypointIdx}, y=${climber.y.toFixed(2)}m)`
  );
  assert.ok(
    climber.y >= 67.6,
    `Player at top of spiral staircase must reach y >= 67.6m without jumping (got y=${climber.y.toFixed(2)}m)`
  );

  // Step onto the Main Floating Sky Island deck at (185, -35) without jumping
  for (let tick = 0; tick < 60; tick++) {
    climber.yaw = -Math.PI / 2; // facing +X onto Main Island
    stepPlayerPhysics(
      climber,
      {
        forward: 1,
        right: 0,
        sprint: false,
        relaxed: false,
        jumpPressed: false,
        jumpHeld: false,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      [],
      0.02
    );
  }
  assert.ok(
    climber.x > FLOATING_ISLAND_STAIR_POS.topX + 3.0 && climber.y >= 68.0,
    `Player must transition seamlessly from top of spiral stairs onto Main Floating Island deck (x=${climber.x.toFixed(1)}, y=${climber.y.toFixed(2)})`
  );

  // 2. Verify Taming & Riding the Royal Celestial Stag ('stag') and Mystical Volcano CatLion ('lion')
  const animals = createInitialSmallAnimals();
  const birds = [] as ReturnType<typeof createInitialSmallAnimals> extends (infer _U)[] ? never[] : never[];
  const horses = createInitialRideableHorses();
  // Register activeWorldAnimalsRegistry via stepSmallAnimals
  stepSmallAnimals(animals, 0.016, 1.0, climber.x, climber.z, horses, 1.0, climber);

  const royalStag = animals.find((a) => a.species === 'stag')!;
  assert.ok(royalStag, 'Expected Royal Stag on Floating Sky Island');
  climber.x = royalStag.x + 1.2;
  climber.z = royalStag.z;
  climber.y = royalStag.y;

  // Press mount key to tame & ride the Royal Stag
  stepPlayerPhysics(
    climber,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      toggleMountHorseRequested: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.02,
    undefined,
    horses
  );
  assert.equal(climber.mountedHorseId, `mount-stag-${royalStag.id}`, 'Player must mount the Royal Stag');
  assert.equal(royalStag.isTamed, true, 'Mounted Royal Stag must become tamed');
  assert.equal(royalStag.isMountedByPlayer, true, 'Royal Stag must be marked as mounted by player');

  // Ride forward and perform a Celestial Sky-Leap on the Stag
  const startStagX = royalStag.x;
  const startStagZ = royalStag.z;
  for (let i = 0; i < 15; i++) {
    stepPlayerPhysics(
      climber,
      {
        forward: 1,
        right: 0,
        sprint: true,
        relaxed: false,
        jumpPressed: i === 5,
        jumpHeld: i >= 5 && i <= 10,
        lookYawDelta: 0,
        lookPitchDelta: 0,
      },
      [],
      0.02,
      undefined,
      horses
    );
  }
  assert.ok(
    Math.hypot(royalStag.x - startStagX, royalStag.z - startStagZ) > 1.5,
    'Riding Royal Stag must move both player and Stag across the island'
  );

  // Dismount Royal Stag
  stepPlayerPhysics(
    climber,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      toggleMountHorseRequested: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.02,
    undefined,
    horses
  );
  assert.equal(climber.mountedHorseId, null, 'Player must dismount Royal Stag cleanly');
  assert.equal(royalStag.isMountedByPlayer, false);
  assert.equal(royalStag.isTamed, true, 'Dismounted Royal Stag must remain tamed');

  // Verify tamed Royal Stag cannot be damaged or killed by player weapons
  const tamedHit = damageGroundAnimal(royalStag, 5, climber.x, climber.z);
  assert.equal(tamedHit.killed, false, 'Tamed Royal Stag must be immune to player damage');
  assert.equal(royalStag.isDead, false);

  // Verify the 2 smaller CatLions cannot be tamed, while the Boss CatLion requires being subdued to low HP and fed meat!
  const smallLion = animals.find((a) => a.species === 'lion' && !a.isBoss)!;
  const bossLion = animals.find((a) => a.species === 'lion' && a.isBoss)!;
  assert.ok(smallLion, 'Expected smaller entrance CatLion');
  assert.ok(bossLion, 'Expected central Boss CatLion');
  assert.equal(smallLion.canBeTamed, false);
  assert.equal(bossLion.canBeTamed, true);

  // Attempting to tame Boss CatLion at full HP should NOT mount it
  climber.x = bossLion.x + 1.2;
  climber.z = bossLion.z;
  climber.y = bossLion.y;
  stepPlayerPhysics(
    climber,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      toggleMountHorseRequested: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.02,
    undefined,
    horses
  );
  assert.equal(climber.mountedHorseId, null, 'Full-HP Boss CatLion cannot be tamed before being subdued');

  // Attack Boss CatLion (360 maxHp) until nearly dead (subdued at <= 90 HP)
  hitBossUntilSubdued(bossLion, climber.x, climber.z);
  assert.equal(bossLion.isDead, false, 'Boss CatLion should clamp at low HP and become subdued');
  assert.equal(bossLion.isSubdued, true, 'Boss CatLion must enter subdued non-fleeing state when nearly dead');

  // Attempting to tame subdued Boss CatLion without meat should fail and notify meat is required
  stepPlayerPhysics(
    climber,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      toggleMountHorseRequested: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.02,
    undefined,
    horses
  );
  assert.equal(climber.mountedHorseId, null, 'Subdued Boss CatLion requires meat in inventory to tame');
  assert.equal(climber.lastTameNotice, 'meat_required_for_lion');

  // Give player meat and tame & mount the subdued Boss CatLion!
  climber.ownedItemIds = [...(climber.ownedItemIds ?? []), 'raw_game_meat'];
  stepPlayerPhysics(
    climber,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: false,
      jumpHeld: false,
      toggleMountHorseRequested: true,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.02,
    undefined,
    horses
  );
  assert.equal(climber.mountedHorseId, `mount-lion-${bossLion.id}`, 'Player with meat must tame and mount the subdued Boss CatLion');
  assert.equal(bossLion.isTamed, true);
  assert.equal(bossLion.isMountedByPlayer, true);
  assert.equal((climber.ownedItemIds ?? []).includes('raw_game_meat'), false, 'Taming Boss CatLion must consume 1 meat item');
  void birds;
});

test('stagAndTimedRespawn_WhenStagApproachedOrShotAndAnimalKilled_ShouldStayNeutralUntilShotAndRespawnRegularAnimalsButNeverKings', () => {
  const birds = createInitialBoidBirds();
  const animals = createInitialSmallAnimals();
  const horses = createInitialRideableHorses();
  const player = createInitialPlayerState();

  const wildStag = animals.find((a) => a.species === 'stag')!;
  assert.equal(wildStag.maxHp, Math.round(270 * (1 + ((wildStag.level ?? 1) - 1) * 0.18)), 'Royal Stag HP scales 270 base by level');

  // Stand right next to the wild Stag without shooting: Stag must remain neutral (never flee or attack unprovoked)
  player.x = wildStag.x + 1.5;
  player.z = wildStag.z;
  player.y = wildStag.y;
  for (let i = 0; i < 20; i++) {
    stepBoidsAndWildlife(0.05, i * 0.05, birds, animals, player, horses, 1.0, 0);
  }
  assert.notEqual(wildStag.aiBehavior, 'fleeing', 'Floating Island Stag must never flee from player');
  assert.notEqual(wildStag.aiBehavior, 'charging', 'Floating Island Stag must not attack unprovoked');

  // Shoot the Stag: it must retaliate with charging/attacking!
  damageGroundAnimal(wildStag, 60, player.x, player.z);
  stepBoidsAndWildlife(0.05, 2.0, birds, animals, player, horses, 1.0, 0);
  assert.ok(
    wildStag.aiBehavior === 'charging' || wildStag.aiBehavior === 'attacking',
    `Provoked Stag must retaliate against player, got ${wildStag.aiBehavior}`
  );

  // Verify Boss CatLion is invulnerable to sniping from outside the Volcano Sanctum,
  // and can be subdued or killed once the player enters the Volcano Sanctum
  const bossLion = animals.find((a) => a.species === 'lion' && a.isBoss)!;
  assert.equal(bossLion.maxHp, getAnimalMaxHp('lion', bossLion.level, true));

  // Shooting Boss CatLion from outside the Volcano (e.g. from x = -500) deals 0 damage
  const outsideShot = damageGroundAnimal(bossLion, 300, -500, VOLCANO_SANCTUM_POS.z);
  assert.equal(outsideShot.killed, false);
  assert.equal(outsideShot.remainingHp, bossLion.maxHp, 'Boss CatLion must be invulnerable to arrows fired from outside the Volcano Sanctum');

  // Move player inside the Volcano Sanctum inner chamber and attack Boss CatLion
  player.x = bossLion.x + 8.0;
  player.z = bossLion.z;
  player.y = VOLCANO_SANCTUM_POS.floorY;
  hitBossUntilSubdued(bossLion, player.x, player.z);
  assert.equal(bossLion.isSubdued, true, 'Boss CatLion enters subdued state at <= 90 HP when attacked from inside');
  assert.equal(bossLion.isDead, false);

  // Player chooses to kill the subdued Boss CatLion instead of taming it
  let bossKillRes = damageGroundAnimal(bossLion, 90, player.x, player.z);
  for (let i = 0; i < 200 && !bossKillRes.killed; i++) {
    bossKillRes = damageGroundAnimal(bossLion, 90, player.x, player.z);
  }
  assert.equal(bossKillRes.killed, true, 'Continuing to attack subdued Boss CatLion must kill it');
  assert.equal(bossLion.isDead, true);
  assert.equal(bossLion.respawnTimer, undefined, 'Slain Boss CatLion must not have a respawn timer');

  // Also kill the Southern Dragon boss
  const dragon = animals.find((a) => a.species === 'dragon')!;
  killGroundAnimal(dragon);
  assert.equal(dragon.isDead, true);

  // Kill a regular smaller CatLion and verify timed respawn ONLY when player is far away (> 95m) AND looking away
  const smallLion = animals.find((a) => a.species === 'lion' && !a.isBoss)!;
  killGroundAnimal(smallLion);
  assert.equal(smallLion.isDead, true);
  assert.ok((smallLion.respawnTimer ?? 0) >= 40, 'Killed regular animal must start a timed respawn countdown');

  // Move player 110m away from smallLion's home BUT looking directly toward smallLion's home -> must NOT respawn while in view!
  player.x = smallLion.homeX + 110.0;
  player.z = smallLion.homeZ;
  player.yaw = Math.PI * 0.5; // forward (-sin(yaw), -cos(yaw)) = (-1, 0), looking straight toward smallLion.homeX
  stepBoidsAndWildlife(46.0, 50.0, birds, animals, player, horses, 1.0, 0);
  assert.equal(smallLion.isDead, true, 'Regular animal must NOT respawn while player is looking toward its spawn point');

  // Now turn player to look away (yaw = -Math.PI * 0.5 -> looking +X away from smallLion) -> respawns immediately on next step!
  player.yaw = -Math.PI * 0.5;
  stepBoidsAndWildlife(1.0, 96.0, birds, animals, player, horses, 1.0, 0);
  assert.equal(smallLion.isDead, false, 'Regular animal must respawn after timer elapses when player is away and looking away');
  assert.equal(smallLion.hp, smallLion.maxHp);
  assert.equal(bossLion.isDead, true, 'Slain King/Boss CatLion must NEVER respawn');
  assert.equal(dragon.isDead, true, 'Slain Southern Dragon boss must NEVER respawn');
});

test('mountPhysicsStaminaSpacebarAttackAndArrowRecovery_WhenEvaluated_ShouldFollowAllRules', () => {
  const animals = createInitialSmallAnimals();
  const horses = createInitialRideableHorses();
  const player = createInitialPlayerState();

  // 1. Verify Far-East Floating Sky Islands (x >= 760) & Far-West Volcano Badlands (x = -620)
  assert.equal(FLOATING_BLOOMING_ISLANDS[0].x, 760);
  assert.equal(FLOATING_BLOOMING_ISLANDS[2].x, 807);
  assert.equal(VOLCANO_SANCTUM_POS.x, -620);
  assert.ok(
    volcanicBadlandsFactorAt(VOLCANO_SANCTUM_POS.x + 80, VOLCANO_SANCTUM_POS.z) > 0.7,
    'Western Volcanic Badlands factor must be active around the relocated Volcano'
  );

  // 2. Verify Mount Speed Hierarchy (Stag > Horse > Boss CatLion > Human)
  //    and Mount Stamina Hierarchy (Boss CatLion drains slowest, Stag medium, Horse fastest)
  const stagAnim = animals.find((a) => a.species === 'stag')!;
  const bossLion = animals.find((a) => a.species === 'lion' && a.isBoss)!;
  horses.push({
    ...horses[0],
    id: `mount-stag-${stagAnim.id}`,
    name: 'Royal Stag',
    x: 0,
    y: walkableHeightAt(0, 32).height,
    z: 32,
    yaw: 0,
    speed: 0,
    gaitPhase: 0,
  });
  horses.push({
    ...horses[0],
    id: `mount-lion-${bossLion.id}`,
    name: 'Boss CatLion',
    x: 0,
    y: walkableHeightAt(0, 32).height,
    z: 32,
    yaw: 0,
    speed: 0,
    gaitPhase: 0,
  });

  const measureMountSprint = (mountId: string) => {
    player.mountedHorseId = mountId;
    player.x = 0;
    player.z = 32;
    player.y = walkableHeightAt(0, 32).height;
    player.vx = 0;
    player.vz = 0;
    player.vy = 0;
    player.onGround = true;
    player.stamina = 100;
    const h = horses.find((item) => item.id === mountId)!;
    h.x = player.x;
    h.y = player.y;
    h.z = player.z;
    h.yaw = 0;
    for (let i = 0; i < 20; i++) {
      stepPlayerPhysics(
        player,
        {
          forward: 1,
          right: 0,
          sprint: true,
          relaxed: false,
          jumpPressed: false,
          jumpHeld: false,
          toggleFlyRequested: false,
          toggleMountHorseRequested: false,
          lookYawDelta: 0,
          lookPitchDelta: 0,
        },
        [],
        0.05,
        new Set(),
        horses
      );
    }
    const mountedHorse = horses.find((item) => item.id === mountId);
    return {
      speed: Math.hypot(player.vx, player.vz),
      staminaRemaining: player.mountStamina ?? mountedHorse?.stamina ?? player.stamina ?? 0,
    };
  };

  const stagMetrics = measureMountSprint(`mount-stag-${stagAnim.id}`);
  // Mount stamina lives on the mount (state.mountStamina / horse.stamina), not on the player.
  const horseMetrics = measureMountSprint(horses[0].id);
  const lionMetrics = measureMountSprint(`mount-lion-${bossLion.id}`);

  assert.ok(
    stagMetrics.speed > horseMetrics.speed && horseMetrics.speed > lionMetrics.speed,
    `Expected Stag (${stagMetrics.speed.toFixed(2)}) > Horse (${horseMetrics.speed.toFixed(2)}) > CatLion (${lionMetrics.speed.toFixed(2)})`
  );
  assert.ok(
    lionMetrics.staminaRemaining > stagMetrics.staminaRemaining &&
      stagMetrics.staminaRemaining > horseMetrics.staminaRemaining,
    `Expected CatLion stamina (${lionMetrics.staminaRemaining.toFixed(1)}) > Stag (${stagMetrics.staminaRemaining.toFixed(1)}) > Horse (${horseMetrics.staminaRemaining.toFixed(1)})`
  );

  // 3. Verify Boss CatLion CANNOT jump on Spacebar and instead performs a stationary attack in place!
  player.mountedHorseId = `mount-lion-${bossLion.id}`;
  player.x = 0;
  player.z = 32;
  player.y = walkableHeightAt(0, 32).height;
  player.vy = 0;
  player.onGround = true;
  const targetWolf = animals.find((a) => a.species === 'wolf')!;
  targetWolf.x = 0;
  targetWolf.z = 29.0; // 3m in front of yaw=0 (-Z direction)
  targetWolf.y = walkableHeightAt(0, 29.0).height;
  const wolfHpBefore = targetWolf.hp ?? 90;

  stepPlayerPhysics(
    player,
    {
      forward: 0,
      right: 0,
      sprint: false,
      relaxed: false,
      jumpPressed: true,
      jumpHeld: true,
      toggleFlyRequested: false,
      toggleMountHorseRequested: false,
      lookYawDelta: 0,
      lookPitchDelta: 0,
    },
    [],
    0.05,
    new Set(),
    horses
  );
  assert.ok(player.vy <= 0.01, `Boss CatLion must NOT jump when Spacebar is pressed (got vy=${player.vy})`);
  assert.equal(bossLion.aiBehavior, 'attacking', 'Pressing Spacebar on Boss CatLion must trigger stationary attack');
  assert.ok((bossLion.actionTimer ?? 0) > 0.5, 'Boss CatLion stationary attack must set actionTimer');
  assert.ok((targetWolf.hp ?? 0) < wolfHpBefore, 'Boss CatLion Spacebar stationary attack must damage animal in front');

  // 4. Verify arrows stuck in an animal are removed from the world and returned to inventory on Loot OR Taming
  const deer = animals.find((a) => a.species === 'deer' && !a.isDead)!;
  player.mountedHorseId = null;
  player.ownedItemIds = ['bow'];
  const activeArrows = [
    {
      ...spawnArrowProjectile(player, 1.0),
      stuck: true,
      hitKind: 'animal' as const,
      hitTargetId: String(deer.id),
      attachedAnimalId: deer.id,
      arrowKind: 'fire' as const,
      x: deer.x,
      y: deer.y + 0.8,
      z: deer.z,
    },
    {
      ...spawnArrowProjectile(player, 1.0),
      stuck: true,
      hitKind: 'animal' as const,
      hitTargetId: String(deer.id),
      attachedAnimalId: deer.id,
      arrowKind: 'normal' as const,
      x: deer.x,
      y: deer.y + 0.9,
      z: deer.z,
    },
  ];
  killGroundAnimal(deer);
  const lootRes = lootDeadAnimal(player, deer, activeArrows);
  assert.equal(lootRes.ok, true);
  assert.equal(lootRes.recoveredArrowCount, 2, 'Looting animal must recover all 2 stuck arrows');
  assert.equal(activeArrows.length, 0, 'Recovered arrows must disappear from activeArrows in the world');
  assert.ok(player.ownedItemIds.includes('arrow_fire'), 'Fire arrow must be returned to player inventory');
  assert.ok(player.ownedItemIds.includes('arrow_normal'), 'Normal arrow must be returned to player inventory');

  // Also test recoverArrowsFromAnimal directly when taming the Boss CatLion
  const lionArrows = [
    {
      ...spawnArrowProjectile(player, 1.0),
      stuck: true,
      hitKind: 'animal' as const,
      hitTargetId: String(bossLion.id),
      attachedAnimalId: bossLion.id,
      arrowKind: 'wind' as const,
      x: bossLion.x,
      y: bossLion.y + 1.2,
      z: bossLion.z,
    },
  ];
  const tameRecover = recoverArrowsFromAnimal(bossLion.id, lionArrows, player, bossLion.x, bossLion.z);
  assert.equal(tameRecover.recoveredCount, 1, 'Taming Boss CatLion must recover stuck arrows');
  assert.equal(lionArrows.length, 0, 'Arrows stuck in tamed Boss CatLion must be removed from world');
  assert.ok(player.ownedItemIds.includes('arrow_wind'), 'Wind arrow must return to player inventory on tame');
});

test('colossalVolcanoBaffledCorridorsBossArenaLockStagJumpMomentumAndSouthernMountainPass_WhenEvaluated_ShouldEnforceAllMechanics', () => {
  const birds = createInitialBoidBirds();
  const animals = createInitialSmallAnimals();
  const horses = createInitialRideableHorses();
  const player = createInitialPlayerState();

  // 1. Colossal Volcano Sanctum dimensions & 3 cardinal baffled corridors (East, North, South)
  assert.equal(VOLCANO_SANCTUM_POS.outerRadius, 105.0);
  assert.equal(VOLCANO_SANCTUM_POS.chamberRadius, 30.0);
  assert.equal(VOLCANO_SANCTUM_POS.craterRimY, 74.0);
  assert.ok(isInsideVolcanoSanctum(VOLCANO_SANCTUM_POS.x + 85, VOLCANO_SANCTUM_POS.z), 'East corridor must be inside Volcano Sanctum');
  assert.ok(isInsideVolcanoSanctum(VOLCANO_SANCTUM_POS.x, VOLCANO_SANCTUM_POS.z - 85), 'North corridor must be inside Volcano Sanctum');
  assert.ok(isInsideVolcanoSanctum(VOLCANO_SANCTUM_POS.x, VOLCANO_SANCTUM_POS.z + 85), 'South corridor must be inside Volcano Sanctum');

  // Verify the 3 Obsidian Chicane Baffle Walls exist in SOLID_BUILDING_BOXES to block straight line-of-sight from outside
  assert.ok(SOLID_BUILDING_BOXES.some((b) => b.id === 'volcano-baffle-east'), 'East chicane baffle wall must exist');
  assert.ok(SOLID_BUILDING_BOXES.some((b) => b.id === 'volcano-baffle-north'), 'North chicane baffle wall must exist');
  assert.ok(SOLID_BUILDING_BOXES.some((b) => b.id === 'volcano-baffle-south'), 'South chicane baffle wall must exist');

  // 2. Volcano Boss Arena Lock: entering the 30m chamber aggros Boss CatLion and locks the 3 Portcullis Gates until subdued/killed
  const bossLion = animals.find((a) => a.species === 'lion' && a.isBoss)!;
  player.x = VOLCANO_SANCTUM_POS.x + 22.0;
  player.z = VOLCANO_SANCTUM_POS.z;
  player.y = VOLCANO_SANCTUM_POS.floorY;
  stepBoidsAndWildlife(0.05, 10.0, birds, animals, player, horses, 1.0, 0);
  assert.equal(bossLion.aiBehavior, 'charging', 'Entering the 30m Boss Chamber must immediately aggro the Boss CatLion');
  assert.equal(isVolcanoBossArenaLocked(player.x, player.z, animals), true, 'Volcano Boss Arena gates must lock while player is fighting Boss inside the chamber');

  // Subduing the Boss unlocks the Portcullis Gates immediately
  hitBossUntilSubdued(bossLion, player.x, player.z);
  stepBoidsAndWildlife(0.05, 10.1, birds, animals, player, horses, 1.0, 0);
  assert.equal(bossLion.isSubdued, true);
  assert.equal(isVolcanoBossArenaLocked(player.x, player.z, animals), false, 'Volcano Boss Arena gates must unlock once the Boss is subdued');

  // 3. Tamed unmounted companion wanders/grazes naturally instead of freezing in sitting state staring at player
  bossLion.isTamed = true;
  bossLion.isSubdued = false;
  bossLion.isMountedByPlayer = false;
  bossLion.aiBehavior = 'wandering';
  stepBoidsAndWildlife(0.05, 11.0, birds, animals, player, horses, 1.0, 0);
  assert.notEqual(bossLion.aiBehavior, 'sitting', 'Tamed unmounted companion must wander/graze naturally instead of sitting motionless');

  // 4. Royal Stag jump momentum carry: jumping while sprinting carries forward speed without the 0.55 airborne speed penalty
  const stagAnim = animals.find((a) => a.species === 'stag')!;
  const stagMountId = `mount-stag-${stagAnim.id}`;
  horses.push({
    ...horses[0],
    id: stagMountId,
    name: 'Royal Stag',
    x: 0,
    y: walkableHeightAt(0, 32).height,
    z: 32,
    yaw: 0,
    speed: 0,
    gaitPhase: 0,
  });
  player.mountedHorseId = stagMountId;
  player.x = 0;
  player.z = 32;
  player.y = walkableHeightAt(0, 32).height;
  player.onGround = true;
  player.stamina = 100;
  // Build up sprint speed on ground
  for (let i = 0; i < 15; i++) {
    stepPlayerPhysics(
      player,
      { forward: 1, right: 0, sprint: true, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.04,
      new Set(),
      horses
    );
  }
  const preJumpSpeed = Math.hypot(player.vx, player.vz);
  // Press jump while sprinting
  stepPlayerPhysics(
    player,
    { forward: 1, right: 0, sprint: true, relaxed: false, jumpPressed: true, jumpHeld: true, lookYawDelta: 0, lookPitchDelta: 0 },
    [],
    0.04,
    new Set(),
    horses
  );
  // Step several airborne frames
  for (let i = 0; i < 6; i++) {
    stepPlayerPhysics(
      player,
      { forward: 1, right: 0, sprint: true, relaxed: false, jumpPressed: false, jumpHeld: true, lookYawDelta: 0, lookPitchDelta: 0 },
      [],
      0.04,
      new Set(),
      horses
    );
  }
  const midJumpSpeed = Math.hypot(player.vx, player.vz);
  assert.ok(
    midJumpSpeed >= preJumpSpeed * 0.95,
    `Royal Stag jump must carry forward sprint momentum through the air (preJump=${preJumpSpeed.toFixed(2)}, midJump=${midJumpSpeed.toFixed(2)})`
  );

  // 5. Southern Cliffside Mountain Pass Trail, Guardrail Fence, Impassable Mountain Ranges & Steep Slope Limit
  const midPassTrailY = southernCliffsidePassTrailHeightAt(596);
  assert.ok(midPassTrailY > 12.5, `Southern Cliffside Pass Trail at z=596 must rise high above the river gorge (got ${midPassTrailY.toFixed(2)}m)`);
  const trailGroundY = groundHeightAt(98.0, 596.0);
  assert.ok(Math.abs(trailGroundY - midPassTrailY) < 0.25, 'Cliffside Pass Trail at x=98, z=596 must match southernCliffsidePassTrailHeightAt');
  assert.ok(SOLID_BUILDING_BOXES.some((b) => b.id === 'southern-cliff-pass-guardrail'), 'Southern Cliffside Pass guardrail collision box must exist');

  // Verify towering Eastern Mountain Range (x=185, z=596) and Western Mountain Range (x=78, z=596)
  assert.ok(groundHeightAt(185, 596) > 35.0, 'Eastern Mountain Range between River Gorge and Sea must be high');
  assert.ok(groundHeightAt(78, 596) > 35.0, 'Western Mountain Range immediately west of the Cliffside Pass Trail must be high');
});

test('stepSmallAnimals_WhenHippoKoiAndDolphinSimulate_ShouldStayInRespectiveAquaticAndSemiAquaticBiomes', () => {
  const animals = createInitialSmallAnimals().filter(
    (a) => a.species === 'hippo' || a.species === 'koifish' || a.species === 'dolphin'
  );
  assert.equal(animals.length, 33, 'Expected 12 hippos + 15 koi fish + 6 dolphins');

  // Step 120 frames during daytime
  for (let i = 0; i < 120; i++) {
    stepSmallAnimals(animals, 0.05, i * 0.05, 0, 0, [], 1.0);
  }

  for (const a of animals) {
    assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z));
    if (a.species === 'koifish') {
      const dPavilion = Math.hypot(a.x - -126, a.z - 48);
      const dPlungePool = Math.hypot(a.x - -40, a.z - -30);
      const dOasis = Math.hypot(a.x - -310, a.z - 319);
      assert.ok(
        dPavilion < 18 || dPlungePool < 18 || dOasis < 26 || Math.hypot(a.x - -138, a.z - 42) < 25,
        `Koi fish at (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) must remain in Lakeside Pavilion pond, Waterfall Plunge Pool, Oasis pool, or the Western Lagoon`
      );
      // Verify Koi fish always swim forward along their body heading (never sideways)
      const spd = Math.hypot(a.vx, a.vz);
      assert.ok(spd > 0.2, 'Koi fish must actively swim');
      const forwardDot = (a.vx * Math.sin(a.yaw) + a.vz * Math.cos(a.yaw)) / spd;
      assert.ok(
        forwardDot > 0.98,
        `Koi fish velocity must be strictly aligned with body yaw (got dot=${forwardDot.toFixed(3)})`
      );
    } else if (a.species === 'dolphin') {
      const dHarborBay = Math.hypot(a.x - 330, a.z - 256);
      const dShippingLane = Math.hypot(a.x - 465, a.z - 237);
      const dAtlantis = Math.hypot(a.x - 862, a.z - 415);
      assert.ok(
        dHarborBay < 55 || dShippingLane < 55 || dAtlantis < 60,
        `Dolphin at (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) must remain in Southeast Harbor Bay, Eastern Shipping Lane, or Atlantis Waters`
      );
    } else if (a.species === 'hippo') {
      const dOasis = Math.hypot(a.x - -310, a.z - 319);
      const dSwamp = Math.hypot(a.x - -175, a.z - 435);
      // The southern Hippo Marshland (centre -95, 790; see terrainAndBiomeSystem) is a valid hippo habitat too.
      const dSouthMarsh = Math.hypot(a.x - -95, a.z - 790);
      assert.ok(
        dOasis < 45 || dSwamp < 48 || dSouthMarsh < 140,
        `Hippo at (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) must remain in Southwest Oasis, Murky Swamp or the Southern Hippo Marshland`
      );
    }
  }
});
// #endregion



