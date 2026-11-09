import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAP_RECIPES,
  DEFAULT_TRAP_WORKBENCH_STASH,
  canCraftTrap,
  craftTrapAtWorkbench,
  computeTrapPlacementPreview,
  placeTrapOnGround,
  pickupArmedTrap,
  collectSprungTrapLoot,
  tickPlacedAnimalTraps,
  setTrapRandomGenerator,
  setActivePlacedTrapsRef,
  type IPlacedTrap,
} from './animalTrapsSystem';
import {
  createInitialSmallAnimals,
  damageGroundAnimal,
  findTargetedLiveAnimal,
  stepSmallAnimals,
  type ISmallAnimalState,
} from './boidsAndWildlifeSystem';
import { getWorldObstacles } from './terrainAndBiomeSystem';
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

test('animalTrapsSystem - computeTrapPlacementPreview validates green/red placement rules including blocking trees and boulders', () => {
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

  // Invalid on/inside a real world tree trunk -> red (valid: false) and placeTrapOnGround rejects it
  const worldTrees = getWorldObstacles().filter(
    (o) => (o.kind === 'pine' || o.kind === 'oak' || o.kind === 'birch') && (o.radius ?? 0) > 0.3
  );
  assert.ok(worldTrees.length > 0, 'Expected real trees in world obstacles');
  const tree = worldTrees[0];
  // Place player 2.5m south of the tree facing north (yaw = 0) so the placement spot lands right on the tree trunk
  const treePreview = computeTrapPlacementPreview(
    [],
    'trap_cage_small',
    tree.x,
    2,
    tree.z + 2.5,
    0,
    () => 2.5,
    0.3,
    -0.25
  );
  assert.ok(treePreview);
  assert.equal(treePreview.valid, false, 'Must block placing a trap on or inside a tree');
  assert.ok(treePreview.reason.toLowerCase().includes('tree'), `Expected tree rejection reason, got: ${treePreview.reason}`);

  const treePlaceAttempt = placeTrapOnGround(
    [],
    'trap_cage_small',
    tree.x,
    2,
    tree.z + 2.5,
    0,
    () => 2.5,
    0.3,
    -0.25
  );
  assert.equal(treePlaceAttempt.success, false, 'placeTrapOnGround must prevent placing a trap inside a tree');

  // Invalid on/inside a boulder/rock -> red (valid: false)
  const worldBoulders = getWorldObstacles().filter((o) => o.kind === 'boulder' && (o.radius ?? 0) > 0.3);
  if (worldBoulders.length > 0) {
    const boulder = worldBoulders[0];
    const boulderPreview = computeTrapPlacementPreview(
      [],
      'trap_snare',
      boulder.x,
      2,
      boulder.z + 2.5,
      0,
      () => 2.5,
      0.3,
      -0.25
    );
    assert.ok(boulderPreview);
    assert.equal(boulderPreview.valid, false, 'Must block placing a trap on a rock/boulder');
  }

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

test('animalTrapsSystem - range-based random trap choice (approach vs ignore) without timer and player reaction priority', () => {
  const trap: IPlacedTrap = {
    id: 'test-trap-range-random',
    kind: 'trap_snare',
    x: 10,
    y: 1,
    z: 10,
    yaw: 0,
    status: 'armed',
    armedDuration: 0,
  };

  // Ticking for 60s with NO animals must NEVER trigger a fake timer catch
  const emptyTick = tickPlacedAnimalTraps([trap], [], 60.0, 60.0);
  assert.equal(emptyTick.newlySprungTraps.length, 0);
  assert.equal(trap.status, 'armed');

  const rabbit: ISmallAnimalState = {
    id: 99,
    species: 'rabbit',
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
    hp: 30,
    level: 2,
    isDead: false,
    isLooted: false,
  };

  try {
    // 1. Random roll >= 0.62 -> Animal in range chooses 'ignore' and does NOT walk toward the trap
    trap.armedDuration = 0.1; // No 10s timer required!
    setTrapRandomGenerator(() => 0.90);
    tickPlacedAnimalTraps([trap], [rabbit], 0.1, 1.0);
    assert.equal(rabbit.trapDecisionOutcome, 'ignore');
    stepSmallAnimals([rabbit], 0.1, 1.0, 999, 999, []);
    assert.ok(
      rabbit.vx >= -0.2,
      'Rabbit that randomly chose to ignore the trap should not be forced toward trap at x=10'
    );

    // 2. Random roll < 0.62 -> Animal in range immediately chooses 'approach' (even at armedDuration = 0.1s!)
    rabbit.trapDecisionTrapId = undefined;
    rabbit.trapDecisionOutcome = undefined;
    rabbit.trapDecisionTimer = 0;
    trap.animalDecisions = {};
    rabbit.x = 18.0;
    rabbit.z = 10.0;
    setTrapRandomGenerator(() => 0.15);
    tickPlacedAnimalTraps([trap], [rabbit], 0.1, 1.0);
    assert.equal(rabbit.trapDecisionOutcome, 'approach');

    const prevDist = Math.hypot(rabbit.x - trap.x, rabbit.z - trap.z);
    stepSmallAnimals([rabbit], 0.2, 1.0, 999, 999, []);
    const newDist = Math.hypot(rabbit.x - trap.x, rabbit.z - trap.z);
    assert.ok(newDist < prevDist, 'Expected rabbit to approach trap immediately when random choice is approach');

    // 3. Player Priority for Prey: When rabbit sees the player nearby (e.g. 8m away), rabbit FLEES from player instead of approaching trap!
    const distFromPlayerBefore = Math.hypot(rabbit.x - 12.0, rabbit.z - 10.0);
    stepSmallAnimals([rabbit], 0.2, 1.2, 12.0, 10.0, []);
    const distFromPlayerAfter = Math.hypot(rabbit.x - 12.0, rabbit.z - 10.0);
    assert.equal(rabbit.alertLevel, 'fleeing', 'Rabbit must flee when it sees the player near the trap');
    assert.ok(distFromPlayerAfter > distFromPlayerBefore, 'Fleeing rabbit must run away from the player');

    // 4. When rabbit reaches the trap trigger radius, the trap springs and catches it
    rabbit.x = 10.4;
    rabbit.z = 10.2;
    const tickResult = tickPlacedAnimalTraps([trap], [rabbit], 0.1, 2.0);
    assert.equal(tickResult.newlySprungTraps.length, 1);
    assert.equal(trap.status, 'sprung');
    assert.equal(trap.caughtSpecies, 'rabbit');
    assert.equal(rabbit.isDead, true);

    const harvest = collectSprungTrapLoot([trap], trap.id);
    assert.equal(harvest.success, true);
    assert.equal(harvest.updatedTraps.length, 0);
  } finally {
    setTrapRandomGenerator(null);
    setActivePlacedTrapsRef([]);
  }
});

test('animalTrapsSystem - Bear Trap range-based random choice and Bear attacks player when player is visible', () => {
  const bearTrap: IPlacedTrap = {
    id: 'test-bear-trap',
    kind: 'trap_bear_jaw',
    x: 20,
    y: 1,
    z: 20,
    yaw: 0,
    status: 'armed',
    armedDuration: 0.2,
  };
  const trapsList = [bearTrap];

  const bear: ISmallAnimalState = {
    id: 77,
    species: 'bear',
    x: 30.0,
    y: 1,
    z: 20.0,
    vx: 0,
    vz: 0,
    yaw: 0,
    hopPhase: 0,
    homeX: 30,
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

  try {
    // 1. When player is far away (999, 999) and random choice is 'approach', Bear stalks toward the trap
    setTrapRandomGenerator(() => 0.1);
    tickPlacedAnimalTraps(trapsList, [bear], 0.1, 5.0);
    stepSmallAnimals([bear], 0.1, 5.0, 999, 999, []);
    assert.equal(bear.aiBehavior, 'stalking', 'Bear that chooses to approach trap when player is unseen should stalk toward trap');
    assert.ok(bear.vx < 0, 'Bear at x=30 should walk toward trap at x=20');

    // 2. When player is visible to the Bear (e.g. east of Bear, opposite the trap at x=20), Bear targets the PLAYER instead of walking to the trap!
    stepSmallAnimals([bear], 0.1, 5.1, 42.0, 20.0, []);
    assert.equal(bear.stimulusX, 42.0, 'Bear must lock onto the visible player instead of the trap');
    assert.ok(bear.vx > 0, 'Bear must move toward the player at x=42 rather than the trap at x=20');

    stepSmallAnimals([bear], 0.1, 5.2, 39.0, 20.0, []);
    const closeBehavior: string | undefined = bear.aiBehavior;
    assert.ok(
      closeBehavior === 'roaring' || closeBehavior === 'stomping' || closeBehavior === 'charging' || closeBehavior === 'attacking',
      `Bear that sees the player in close range must roar/stomp/charge/attack the player (got ${closeBehavior})`
    );

    // 3. When Bear steps onto the Bear Trap trigger radius, jaws clamp onto paw
    bear.x = 20.4;
    bear.z = 20.2;
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
  } finally {
    setTrapRandomGenerator(null);
    setActivePlacedTrapsRef([]);
  }
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

test('tree-climbing squirrels climb straight up to perch height and NEVER spin in place at max height even while fleeing', () => {
  const animals = createInitialSmallAnimals();
  const squirrels = animals.filter((a: ISmallAnimalState) => a.species === 'squirrel');
  assert.ok(squirrels.length >= 6, 'Expected woodland squirrels in active vulnerable wildlife pool');

  const sq = squirrels[0];
  const initialY = sq.y;
  const treeObstacle = { x: sq.x + 1.5, z: sq.z + 1.0, radius: 0.7 };
  sq.treeState = 'climb_up';
  sq.treeObstacleX = treeObstacle.x;
  sq.treeObstacleZ = treeObstacle.z;
  sq.treeBaseY = initialY;
  sq.treeTrunkRadius = treeObstacle.radius;
  sq.treeTargetHeight = 3.4;
  sq.treeClimbAngle = 0.5;

  // Step squirrel while player stands 5m away (so squirrel is fleeing up the tree!)
  for (let f = 0; f < 40; f++) {
    stepSmallAnimals([sq], 0.05, 1.0 + f * 0.05, treeObstacle.x + 5.0, treeObstacle.z, []);
  }

  // Squirrel must have reached the perch height and entered 'perched' state
  assert.equal(sq.treeState, 'perched', 'Squirrel at max climb height must enter and remain in perched state');
  assert.ok(Math.abs(sq.y - (initialY + 3.4)) < 0.05, 'Squirrel must reach its target perch height');

  // Step 20 more frames while player remains close (fleeing active) and verify ZERO spinning in place!
  const perchedYaw = sq.yaw;
  const perchedAngle = sq.treeClimbAngle;
  for (let f = 0; f < 20; f++) {
    stepSmallAnimals([sq], 0.05, 3.0 + f * 0.05, treeObstacle.x + 5.0, treeObstacle.z, []);
    assert.equal(sq.treeState, 'perched', 'Squirrel must not reset from perched back to climb_up at max height');
    assert.equal(sq.yaw, perchedYaw, 'Perched squirrel yaw must stay completely steady (zero spinning in place)');
    assert.equal(sq.treeClimbAngle, perchedAngle, 'Perched squirrel trunk angle must not spiral');
  }

  // Shoot/damage squirrel while perched on the tree
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




