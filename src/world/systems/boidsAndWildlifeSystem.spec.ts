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
} from './boidsAndWildlifeSystem';
import {
  BEAR_MOUNTAIN_CAVES,
  CROCODILE_RIVER_BEND_POS,
  WORLD_SPAWN,
} from '../domain/landmarksRegistry';
import {
  computeSlopePitchAndRoll,
  getRoofHeightAt,
  regionalForestDensityAt,
} from './terrainAndBiomeSystem';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('getAnimalLootDrops_WhenSheepOrJaguarHunted_ShouldYieldExpectedLoot', () => {
  const sheepDrops = getAnimalLootDrops('sheep');
  assert.deepEqual(sheepDrops.itemIds, ['raw_game_meat', 'sheep_hide']);
  assert.deepEqual(sheepDrops.itemLabelsHe, ['בשר', 'צמר']);
  assert.equal(sheepDrops.notificationHe, 'נאסף שלל ציד (כבשה): צמר + בשר');

  const jaguarDrops = getAnimalLootDrops('jaguar');
  assert.deepEqual(jaguarDrops.itemIds, ['raw_game_meat', 'deer_hide']);
  assert.ok(jaguarDrops.notificationHe.includes('יגואר'));
});

test('damageGroundAnimal_WhenStruckWithArrows_ShouldRequireMultipleHitsForBearJaguarDeerAndOneForRabbit', () => {
  const animals = createInitialSmallAnimals();
  const bear = animals.find((a) => a.species === 'bear')!;
  const jaguar = animals.find((a) => a.species === 'jaguar')!;
  const deer = animals.find((a) => a.species === 'deer')!;
  const rabbit = animals.find((a) => a.species === 'rabbit')!;

  assert.equal(getAnimalMaxHp('bear'), 8);
  assert.equal(getAnimalMaxHp('crocodile'), 6);
  assert.equal(getAnimalMaxHp('jaguar'), 4);
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
        a.species === 'jaguar'
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
  assert.equal(bears.length, 3, 'Expected 3 forest/mountain bears');
  assert.equal(jaguars.length, 4, 'Expected 4 jaguars in Southwest Desert & Southern Forest');
  assert.equal(crocodiles.length, 5, 'Expected 5 crocodiles at the remote Southern River Bend');

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
  }

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
  assert.ok(deer.aiBehavior === 'grazing' || deer.aiBehavior === 'wandering');

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

  // Place bear 10m outside its cave and start rain (rainIntensity = 0.8)
  bear.x = cave.x;
  bear.z = cave.z + 10.0;
  stepSmallAnimals(singleBear, 0.05, 30, 500, 500, [], 1.0, undefined, 0, false, false, 0.8);
  assert.equal(bear.isSeekingShelter, true);
  assert.equal(bear.aiBehavior, 'seeking_shelter');
  assert.equal(bear.shelterTargetX, cave.x);
  assert.equal(bear.shelterTargetZ, cave.z);

  // Place bear inside its cave during rain -> rests/sleeps inside
  bear.x = cave.x;
  bear.z = cave.z;
  stepSmallAnimals(singleBear, 0.05, 31, 500, 500, [], 1.0, undefined, 0, false, false, 0.8);
  assert.equal(bear.isResting, true);
  assert.equal(bear.aiBehavior, 'sleeping');
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
  assert.ok(jaguar.aiBehavior === 'roaring' || jaguar.aiBehavior === 'charging');
  for (let s = 0; s < 15; s++) {
    stepSmallAnimals([jaguar, rabbit], 0.05, 41.1 + s * 0.05, 500, 500, [], 1.0, undefined, 0, false, false, 0);
  }
  assert.ok(jaguar.aiBehavior === 'charging' || jaguar.aiBehavior === 'attacking');

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
// #endregion
