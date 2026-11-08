import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAP_RECIPES,
  DEFAULT_TRAP_WORKBENCH_STASH,
  TRAP_SCENT_NOTICE_DELAY_SEC,
  canCraftTrap,
  craftTrapAtWorkbench,
  computeTrapPlacementPreview,
  placeTrapOnGround,
  pickupArmedTrap,
  collectSprungTrapLoot,
  tickPlacedAnimalTraps,
  type IPlacedTrap,
} from './animalTrapsSystem';
import {
  createInitialSmallAnimals,
  damageGroundAnimal,
  findTargetedLiveAnimal,
  stepSmallAnimals,
  type ISmallAnimalState,
} from './boidsAndWildlifeSystem';
import { HUNTER_LODGE_POS } from '../domain/landmarksRegistry';
import {
  findNearestTrapWorkbench,
  resolveBestLookedAtInteraction,
} from '../domain/landmarks/interactionLandmarks';

test('animalTrapsSystem - recipes are well-defined and contain all 5 trap types including fish trap', () => {
  assert.equal(TRAP_RECIPES.length, 5);
  const cage = TRAP_RECIPES.find((r) => r.kind === 'trap_cage_small');
  assert.ok(cage);
  assert.equal(cage.itemId, 'trap_cage_small');
  assert.ok(cage.targetSpecies.includes('squirrel'));
  assert.ok(cage.targetSpecies.includes('rabbit'));

  const fishTrap = TRAP_RECIPES.find((r) => r.kind === 'trap_fish');
  assert.ok(fishTrap);
  assert.equal(fishTrap.itemId, 'trap_fish');
  assert.ok(fishTrap.targetSpecies.includes('fish'));
});

test('animalTrapsSystem - can craft trap using workbench stash and player inventory', () => {
  const cageRecipe = TRAP_RECIPES.find((r) => r.kind === 'trap_cage_small')!;
  const stash = { ...DEFAULT_TRAP_WORKBENCH_STASH };
  const playerItems = ['sword' as const];

  assert.equal(canCraftTrap(cageRecipe, playerItems, stash), true);

  const craftResult = craftTrapAtWorkbench('trap_cage_small', playerItems, stash);
  assert.equal(craftResult.success, true);
  assert.ok(craftResult.updatedPlayerItems.includes('trap_cage_small'));
  // Timber was 10, cage costs 2 -> stash timber becomes 8
  assert.equal(craftResult.updatedWorkbenchStash.oak_timber, 8);
});

test('animalTrapsSystem - computeTrapPlacementPreview validates green/red placement rules', () => {
  // Valid outdoor land placement -> green (valid: true)
  const validPreview = computeTrapPlacementPreview(
    [],
    'trap_cage_small',
    10,
    2,
    20,
    0,
    () => 2.5,
    0.3,
    -0.25
  );
  assert.ok(validPreview);
  assert.equal(validPreview.valid, true);
  assert.equal(validPreview.kind, 'trap_cage_small');

  // Invalid inside cabin -> red (valid: false)
  const indoorPreview = computeTrapPlacementPreview(
    [],
    'trap_cage_small',
    HUNTER_LODGE_POS.x,
    HUNTER_LODGE_POS.height,
    HUNTER_LODGE_POS.z,
    0,
    () => HUNTER_LODGE_POS.height,
    0.3,
    -0.2
  );
  assert.ok(indoorPreview);
  assert.equal(indoorPreview.valid, false);

  // Invalid too close to existing trap -> red (valid: false)
  const existingTrap: IPlacedTrap = {
    id: 'existing-1',
    kind: 'trap_snare',
    x: validPreview.x,
    y: validPreview.y,
    z: validPreview.z,
    yaw: 0,
    status: 'armed',
    armedDuration: 0,
  };
  const overlapPreview = computeTrapPlacementPreview(
    [existingTrap],
    'trap_cage_small',
    10,
    2,
    20,
    0,
    () => 2.5,
    0.3,
    -0.25
  );
  assert.ok(overlapPreview);
  assert.equal(overlapPreview.valid, false);
});

test('animalTrapsSystem - placing trap creates armed trap on terrain in front of player and validates water for fish trap', () => {
  const placed: IPlacedTrap[] = [];
  const res = placeTrapOnGround(
    placed,
    'trap_cage_small',
    10,
    2,
    20,
    0, // facing north (-z)
    () => 2.5
  );

  assert.equal(res.success, true);
  assert.equal(res.updatedTraps.length, 1);
  const trap = res.placedTrap!;
  assert.equal(trap.status, 'armed');
  assert.equal(trap.kind, 'trap_cage_small');
  assert.ok(trap.z < 20, 'Expected placed trap to be in front of player facing north');
  assert.equal(trap.y, 2.55);

  // Fish trap rejected on high dry land
  const dryFishRes = placeTrapOnGround([], 'trap_fish', 0, 8, 0, 0, () => 8.0, 0.3);
  assert.equal(dryFishRes.success, false);

  // Fish trap accepted in water and catches fish after baseCatchTimeSec
  const wetFishRes = placeTrapOnGround([], 'trap_fish', 0, 0.4, 0, 0, () => 0.1, 0.3);
  assert.equal(wetFishRes.success, true);
  const fishTraps = [wetFishRes.placedTrap!];
  const tickFish = tickPlacedAnimalTraps(fishTraps, [], 15.0, 20.0);
  assert.equal(tickFish.newlySprungTraps.length, 1);
  assert.equal(fishTraps[0].status, 'sprung');
  assert.equal(fishTraps[0].caughtSpecies, 'fish');
});

test('animalTrapsSystem - picking up empty armed trap removes trap and returns item', () => {
  const trap: IPlacedTrap = {
    id: 'test-trap-1',
    kind: 'trap_snare',
    x: 5,
    y: 1,
    z: 5,
    yaw: 0,
    status: 'armed',
    armedDuration: 2,
  };

  const res = pickupArmedTrap([trap], 'test-trap-1');
  assert.equal(res.success, true);
  assert.equal(res.updatedTraps.length, 0);
  assert.equal(res.returnedItemId, 'trap_snare');
});

test('animalTrapsSystem - live squirrel/rabbit waits for scent notice delay then springs trap when entering trigger radius', () => {
  const trap: IPlacedTrap = {
    id: 'test-trap-2',
    kind: 'trap_snare',
    x: 10,
    y: 1,
    z: 10,
    yaw: 0,
    status: 'armed',
    armedDuration: 1,
  };

  // Ticking for 60s with NO animals must NEVER trigger a fake empty catch
  const emptyTick = tickPlacedAnimalTraps([trap], [], 60.0, 60.0);
  assert.equal(emptyTick.newlySprungTraps.length, 0);
  assert.equal(trap.status, 'armed');

  // Reset armedDuration to 1s to verify scent notice delay
  trap.armedDuration = 1.0;

  const animals: ISmallAnimalState[] = [
    {
      id: 99,
      species: 'squirrel',
      x: 18.0,
      y: 1,
      z: 10.0,
      vx: 0,
      vz: 0,
      yaw: 0,
      hopPhase: 0,
      homeX: 18,
      homeZ: 10,
      alertLevel: 'grazing',
      fleeCooldown: 0,
      isResting: false,
      wakeMeter: 0,
      wokenUpTimer: 0,
      hp: 15,
      level: 2,
      isDead: false,
      isLooted: false,
    },
  ];

  // Before TRAP_SCENT_NOTICE_DELAY_SEC (10s), animals 8m away do not notice or move toward the trap bait
  const earlyTick = tickPlacedAnimalTraps([trap], animals, 0.5, 5);
  assert.equal(earlyTick.newlySprungTraps.length, 0);
  assert.equal(trap.status, 'armed');
  animals[0].treeState = 'ground_forage';
  stepSmallAnimals(animals, 0.2, 0.2, 999, 999, []);

  // Once TRAP_SCENT_NOTICE_DELAY_SEC has elapsed, the squirrel notices the bait and approaches the trap
  trap.armedDuration = TRAP_SCENT_NOTICE_DELAY_SEC + 0.5;
  tickPlacedAnimalTraps([trap], animals, 0.1, 15);
  const prevDist = Math.hypot(animals[0].x - trap.x, animals[0].z - trap.z);
  stepSmallAnimals(animals, 0.2, 0.1, 999, 999, []);
  const newDist = Math.hypot(animals[0].x - trap.x, animals[0].z - trap.z);
  assert.ok(newDist < prevDist, 'Expected squirrel to cautiously approach trap after scent notice delay');

  animals[0].x = 10.5;
  animals[0].z = 10.3;
  const tickResult = tickPlacedAnimalTraps([trap], animals, 0.1, 16);
  assert.equal(tickResult.newlySprungTraps.length, 1);
  assert.equal(trap.status, 'sprung');
  assert.equal(trap.sprung, true);
  assert.equal(trap.caughtSpecies, 'squirrel');
  assert.equal(trap.caughtAnimalLevel, 2);
  assert.ok(trap.loot && trap.loot.length > 0);
  assert.equal(animals[0].isDead, true);

  // Collect loot from sprung trap
  const harvest = collectSprungTrapLoot([trap], trap.id);
  assert.equal(harvest.success, true);
  assert.equal(harvest.updatedTraps.length, 0);
  assert.ok(harvest.loot.length > 0);
  assert.ok(harvest.xp > 0);
  assert.equal(harvest.returnedItemId, 'trap_snare');
});

test('animalTrapsSystem - Bear Trap clamps onto bear paw, deals 45 damage, stops bear to roar on all fours, removes ground trap, and applies 7s 10% speed slow', () => {
  const bearTrap: IPlacedTrap = {
    id: 'test-bear-trap',
    kind: 'trap_bear_jaw',
    x: 20,
    y: 1,
    z: 20,
    yaw: 0,
    status: 'armed',
    armedDuration: 1,
  };
  const trapsList = [bearTrap];

  const bear: ISmallAnimalState = {
    id: 77,
    species: 'bear',
    x: 20.4,
    y: 1,
    z: 20.2,
    vx: 4,
    vz: 4,
    yaw: 0,
    hopPhase: 0,
    homeX: 20,
    homeZ: 20,
    alertLevel: 'grazing',
    fleeCooldown: 0,
    isResting: false,
    wakeMeter: 0,
    wokenUpTimer: 0,
    hp: 160,
    maxHp: 160,
    level: 7,
    isDead: false,
    isLooted: false,
  };

  const res = tickPlacedAnimalTraps(trapsList, [bear], 0.1, 10);
  assert.equal(bear.isDead, false, 'Bear must NOT disappear or die instantly inside the bear trap');
  assert.equal(bear.hp, 115, 'Bear should take 45 damage from the steel jaws');
  assert.equal(bear.aiBehavior, 'roaring', 'Bear should stop and play its 4-legged roar animation');
  assert.equal(bear.vx, 0);
  assert.equal(bear.vz, 0);
  assert.equal(bear.trappedByBearJawTimer, 2.4);
  assert.equal(bear.bearTrapSlowTimer, 9.4, '2.4s roar + 7.0s of 10% speed reduction');
  assert.equal(trapsList.length, 0, 'Ground trap is consumed as it attaches to the bear paw');
  assert.equal(res.consumedBearTrapIds.length, 1);
  assert.equal(res.bearTrapNotifications.length, 1);
});

test('Trapper Workbench in starting cabin is accessible from cabin interior and resolves looked-at interaction', () => {
  // Standing in front of the cabin table (-92.2, 2.63, 73.2) looking toward +Z (yaw = Math.PI)
  const playerX = HUNTER_LODGE_POS.x - 0.2;
  const playerY = HUNTER_LODGE_POS.height + 0.48;
  const playerZ = HUNTER_LODGE_POS.z + 1.25;
  const wb = findNearestTrapWorkbench(playerX, playerY, playerZ, 3.8, Math.PI, -0.2);
  assert.ok(wb, 'Expected Trapper Workbench to be detected inside Hunter Lodge cabin');
  assert.equal(wb.id, 'trapper-workbench-cabin');

  const resolved = resolveBestLookedAtInteraction(playerX, playerY, playerZ, Math.PI, -0.2);
  assert.equal(resolved.kind, 'trap_workbench');
  assert.ok(resolved.trapWorkbench);
});

test('findTargetedLiveAnimal only reveals creature level/health when very close (<= 5.5m)', () => {
  const deer: ISmallAnimalState = {
    id: 101,
    species: 'deer',
    x: 0,
    y: 2,
    z: 0,
    vx: 0,
    vz: 0,
    yaw: 0,
    hopPhase: 0,
    homeX: 0,
    homeZ: 0,
    alertLevel: 'grazing',
    fleeCooldown: 0,
    isResting: false,
    wakeMeter: 0,
    wokenUpTimer: 0,
    hp: 60,
    maxHp: 60,
    level: 3,
    isDead: false,
    isLooted: false,
  };

  // At 12m away, creature should NOT be targeted
  const farTarget = findTargetedLiveAnimal(0, 2, 12, 0, 0, 5.5, [deer]);
  assert.equal(farTarget, null);

  // At 3.5m away looking at the deer (facing -Z, yaw = 0), creature IS targeted
  const closeTarget = findTargetedLiveAnimal(0, 2, 3.5, 0, 0, 5.5, [deer]);
  assert.ok(closeTarget);
  assert.equal(closeTarget.id, 101);
});

test('tree-climbing squirrels are real vulnerable entities that climb dynamically and drop to ground outside trunk when killed', () => {
  const animals = createInitialSmallAnimals();
  const squirrels = animals.filter((a: ISmallAnimalState) => a.species === 'squirrel');
  assert.ok(squirrels.length >= 6, 'Expected woodland squirrels in active vulnerable wildlife pool');

  const sq = squirrels[0];
  const initialY = sq.y;
  // Place squirrel in climb_up state on a tree trunk
  const treeObstacle = { x: sq.x + 1.5, z: sq.z + 1.0, radius: 0.7 };
  sq.treeState = 'climb_up';
  sq.treeObstacleX = treeObstacle.x;
  sq.treeObstacleZ = treeObstacle.z;
  sq.treeBaseY = initialY;
  sq.treeTrunkRadius = treeObstacle.radius;
  sq.treeTargetHeight = 3.2;
  sq.treeClimbAngle = 0;

  // Step squirrel so it climbs up the tree trunk
  stepSmallAnimals([sq], 0.08, 1.0, 999, 999, []);
  assert.ok(sq.y > initialY + 0.05, 'Expected squirrel to climb vertically up tree trunk');
  assert.ok((sq.treeClimbPitch ?? 0) < -0.5, 'Expected squirrel pitch to tilt upward while climbing trunk');

  // Shoot/damage squirrel while perched/climbing on the tree
  const res = damageGroundAnimal(sq, 999);
  assert.equal(res.killed, true);
  assert.equal(sq.isDead, true);
  assert.equal(sq.treeState, 'ground_forage');
  assert.equal(sq.treeClimbPitch, 0);
  const distFromTrunkCenter = Math.hypot(sq.x - treeObstacle.x, sq.z - treeObstacle.z);
  assert.ok(
    distFromTrunkCenter > treeObstacle.radius,
    'Dead squirrel should drop to ground outside the tree trunk collider so player can loot it'
  );
});



