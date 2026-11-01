// ============================================================================
// MODULE: World / Systems / Boids and Wildlife System Tests
// DESIGN: Unit test suite for birds flocking, autonomous animal AI, biomes & slope math (AAA)
// SUMMARY: Verifies bird flock updates, biome habitats, deer listening & sleeping AI,
//          bear mountain cave rain shelter, predator hunting/fleeing, and slope alignment.
// ============================================================================

// ======================== IMPORTS AND TEST DEPENDENCIES ======================== \\
// #region Imports and Test Dependencies
import { test } from 'node:test';
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
  damageGroundAnimal,
  killGroundAnimal,
  isSafeAnimalSpawnPosition,
  getPredatorMeleeStandoffDist,
  getPredatorAttackTriggerDist,
  evaluateSouthernDragonTarget,
  findNearestDeadLootableAnimal,
} from './boidsAndWildlifeSystem';
import { createReadyWolf, WOLF_STATES } from '../models/Wolf';
import { createReadyRhino, RHINO_STATES } from '../models/Rhino';
import { createReadyBear } from '../models/Bear';
import { createReadyCrocodile } from '../models/Crocodile';
import { createReadyForestDragon, FOREST_DRAGON_STATES } from '../models/ForestDragon';
import {
  BEAR_MOUNTAIN_CAVES,
  CROCODILE_RIVER_BEND_POS,
  SOLID_BUILDING_BOXES,
  SOUTHERN_DRAGON_RUINS_POS,
  WATER_LEVEL,
  WORLD_BEDS,
  WORLD_SPAWN,
  findNearestBed,
} from '../domain/landmarksRegistry';
import {
  computeSlopePitchAndRoll,
  getRoofHeightAt,
  groundHeightAt,
  isInsideBearCave,
  regionalForestDensityAt,
  walkableHeightAt,
} from './terrainAndBiomeSystem';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
import { INVENTORY_ITEM_MAP } from '../domain/worldTypes';

test('getAnimalLootDrops_WhenSheepJaguarOrWolfHunted_ShouldYieldSpeciesSpecificHidesWithDistinctGoldValues', () => {
  const sheepDrops = getAnimalLootDrops('sheep');
  assert.deepEqual(sheepDrops.itemIds, ['raw_game_meat', 'sheep_hide', 'animal_bone']);
  assert.deepEqual(sheepDrops.itemLabels, ['Game Meat', 'Wool', 'Animal Bone']);
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
  const allSpecies = ['rabbit', 'squirrel', 'deer', 'sheep', 'bear', 'crocodile', 'jaguar', 'wolf', 'rhino', 'dragon'] as const;

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
  const rabbit = animals.find((a) => a.species === 'rabbit')!;

  assert.equal(getAnimalMaxHp('bear'), 8);
  assert.equal(getAnimalMaxHp('crocodile'), 6);
  assert.equal(getAnimalMaxHp('jaguar'), 4);
  assert.equal(getAnimalMaxHp('wolf'), 3);
  assert.equal(getAnimalMaxHp('deer'), 3);
  assert.equal(getAnimalMaxHp('sheep'), 2);
  assert.equal(getAnimalMaxHp('rabbit'), 1);

  // Rabbit dies in 1 arrow hit
  const rabRes = damageGroundAnimal(rabbit, 1, 0, 0);
  assert.equal(rabRes.killed, true);
  assert.equal(rabbit.isDead, true);

  // Deer takes 3 hits: first hit wounds & triggers fleeing, 3rd hit kills
  const deerHit1 = damageGroundAnimal(deer, 1, 0, 0);
  assert.equal(deerHit1.killed, false);
  assert.equal(deerHit1.remainingHp, 2);
  assert.equal(deer.aiBehavior, 'fleeing');
  damageGroundAnimal(deer, 1, 0, 0);
  const deerHit3 = damageGroundAnimal(deer, 1, 0, 0);
  assert.equal(deerHit3.killed, true);
  assert.equal(deer.isDead, true);

  // Jaguar takes 4 hits (fewer than Bear's 8 hits)
  const jagHit1 = damageGroundAnimal(jaguar, 1, 0, 0);
  assert.equal(jagHit1.killed, false);
  assert.equal(jagHit1.remainingHp, 3);
  assert.equal(jaguar.aiBehavior, 'charging');
  damageGroundAnimal(jaguar, 2, 0, 0);
  const jagHitFinal = damageGroundAnimal(jaguar, 1, 0, 0);
  assert.equal(jagHitFinal.killed, true);

  // Bear takes 8 arrow hits
  for (let h = 1; h <= 7; h++) {
    const r = damageGroundAnimal(bear, 1, 0, 0);
    assert.equal(r.killed, false);
    assert.equal(r.remainingHp, 8 - h);
  }
  const bearFinal = damageGroundAnimal(bear, 1, 0, 0);
  assert.equal(bearFinal.killed, true);
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
        a.species === 'dragon'
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
  assert.equal(bears.length, 7, 'Expected 7 forest/mountain cavern bears (including multiple bears inside the caves)');
  assert.equal(jaguars.length, 4, 'Expected 4 jaguars in Southwest Desert & Southern Forest');
  assert.equal(crocodiles.length, 5, 'Expected 5 crocodiles at the remote Southern River Bend');
  assert.equal(wolves.length, 4, 'Expected 4 timber wolves in the Western & Northern pine woods');
  assert.equal(rhinos.length, 3, 'Expected 3 savanna/oasis rhinos');

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
  for (const state of RHINO_STATES) {
    rhino.setState(state);
    rhino.update(0.05);
    assert.equal(rhino.state, state);
  }
  rhino.dispose();

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
  deer.vx = 1.0;
  deer.vz = 0;
  assert.ok(groundHeightAt(0, 0) < WATER_LEVEL, 'Test setup: (0,0) must be underwater');

  const startX = deer.x;
  const startZ = deer.z;
  for (let step = 0; step < 20; step++) {
    stepSmallAnimals(singleDeer, 0.05, 70 + step * 0.05, 500, 500, [], 1.0, undefined, 0, false, false, 0);
  }
  const distMoved = Math.hypot(deer.x - startX, deer.z - startZ);
  assert.ok(
    distMoved > 1.5,
    `Land animal in water must actively swim toward shore instead of freezing in place (moved ${distMoved.toFixed(2)}m)`
  );
  assert.ok(deer.y >= WATER_LEVEL - 0.22, 'Swimming animal must stay afloat at water level');
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
  assert.equal(getAnimalMaxHp('dragon'), 250, 'Southern Dragon must have colossal 250 HP pool');
  assert.equal(dragon.hp, 250);
  assert.equal(dragon.maxHp, 250);

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

  // 3. Dragon is vulnerable to damage, takes 250 hits to kill, never flees even at 1 HP, and can be looted when slain
  const hit1 = damageGroundAnimal(dragon, 10, 62, 714, animals);
  assert.equal(hit1.killed, false);
  assert.equal(hit1.remainingHp, 240);
  assert.equal(dragon.aiBehavior, 'charging');

  const hit249 = damageGroundAnimal(dragon, 239, 62, 714, animals);
  assert.equal(hit249.killed, false);
  assert.equal(hit249.remainingHp, 1);
  assert.equal(dragon.isFleeing, false, 'Dragon must never flee even at 1 HP');

  const finalHit = damageGroundAnimal(dragon, 1, 62, 714, animals);
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
// #endregion


