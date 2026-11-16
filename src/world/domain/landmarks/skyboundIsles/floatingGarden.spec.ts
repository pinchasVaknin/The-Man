// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (tests)
// DESIGN: Walks the Floating Garden with the simulated player (same gravity, jump, air
//         control, wind, bounce pads and solid boxes as the game), so every secret and
//         climb is proven reachable on the data.
// SUMMARY: Waterfall cave, mushroom climb to the Sky Tree, branches to the crown, the
//          garden wind flower, the root path, and the cave ledge railing.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSkyIsland } from './skyboundLayout';
import { resetSkyClouds } from './skyCloudSystem';
import { resetSkyWindFlowers } from './skyWindSystem';
import { skyboundSurfaceAt } from './skyboundSurface';
import {
  GARDEN_BOUNCE_PADS,
  GARDEN_CAVE_CHEST_SPOT,
  GARDEN_CAVE_FLOOR,
  GARDEN_CAVE_LEDGE,
  GARDEN_CAVE_RAMP,
  GARDEN_ROOT_NOOK,
  GARDEN_ROOT_RAMP,
  GARDEN_WIND_FLOWER_SPOT,
  SKY_TREE_BRANCH_HIGH,
  SKY_TREE_BRANCH_LOW,
  SKY_TREE_BRANCHES,
  SKY_TREE_CROWN,
} from './floatingGardenLayout';
import { simulateSkyPlayer, SIM_PLAYER, type ISimBody, type SimPilot } from './skyboundTestSim';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Pilots
const GARDEN = getSkyIsland('floating-garden')!;

/** Walks through waypoints in order; a waypoint can ask for a jump or wait for a height first. */
function followWaypoints(points: ReadonlyArray<{ x: number; z: number; jump?: boolean; afterY?: number }>): SimPilot {
  let index = 0;
  return (b) => {
    while (index < points.length && Math.hypot(points[index].x - b.x, points[index].z - b.z) < 0.5) index++;
    if (index >= points.length) return null;
    const p = points[index];
    if (p.afterY !== undefined && b.y < p.afterY) return null;
    return { towardX: p.x, towardZ: p.z, jump: p.jump };
  };
}

function describeEnd(b: ISimBody): string {
  return `ended at (${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.z.toFixed(1)}) on ${b.surface?.id ?? 'nothing'}`;
}
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyWindFlowers();
});

// #region Waterfall Cave
describe('floating garden waterfall cave', () => {
  it('waterfallCave_WhenPlayerWalksDownTheCliffRampAndAlongTheLedge_ShouldReachTheChest', () => {
    // Arrange
    const route = [
      { x: GARDEN_CAVE_RAMP.ax, z: GARDEN_CAVE_RAMP.az },
      { x: GARDEN_CAVE_RAMP.bx, z: GARDEN_CAVE_RAMP.bz },
      { x: GARDEN_CAVE_CHEST_SPOT.x, z: (GARDEN_CAVE_LEDGE.minZ + GARDEN_CAVE_LEDGE.maxZ) / 2 },
      { x: GARDEN_CAVE_CHEST_SPOT.x, z: GARDEN_CAVE_CHEST_SPOT.z + 1.5 },
    ];
    // Act
    const end = simulateSkyPlayer({ x: GARDEN_CAVE_RAMP.ax - 2, y: GARDEN.deckY, z: GARDEN_CAVE_RAMP.az - 3 }, followWaypoints(route), 40);
    // Assert
    assert.equal(end.surface?.id, GARDEN_CAVE_FLOOR.id, describeEnd(end));
  });

  it('caveLedge_WhenPlayerWalksTowardTheWaterfall_ShouldBeStoppedByTheRailing', () => {
    // Arrange
    const x = (GARDEN_CAVE_LEDGE.minX + GARDEN_CAVE_LEDGE.maxX) / 2;
    const start = { x, y: GARDEN_CAVE_LEDGE.y, z: (GARDEN_CAVE_LEDGE.minZ + GARDEN_CAVE_LEDGE.maxZ) / 2 };
    const pilot: SimPilot = (_b, t) => (t < 3 ? { towardX: x, towardZ: start.z + 20 } : null);
    // Act
    const end = simulateSkyPlayer(start, pilot, 5);
    // Assert
    assert.equal(end.surface?.id, GARDEN_CAVE_LEDGE.id, describeEnd(end));
  });

  it('caveChestSpot_WhenQueried_ShouldStandOnTheCaveFloorUnderTheLip', () => {
    // Arrange
    const spot = GARDEN_CAVE_CHEST_SPOT;
    // Act
    const hit = skyboundSurfaceAt(spot.x, spot.z, spot.y);
    // Assert
    assert.deepEqual(hit, { y: GARDEN_CAVE_FLOOR.y, kind: 'deck', id: GARDEN_CAVE_FLOOR.id });
  });
});
// #endregion

// #region Sky Tree
describe('floating garden sky tree', () => {
  it('mushroomClimb_WhenPlayerBouncesLowThenTallMushroom_ShouldLandOnTheLowBranchSafely', () => {
    // Arrange
    const [low, tall] = GARDEN_BOUNCE_PADS;
    // Stage 0: jump onto the low cap; 1: after its launch, steer to the tall cap; 2: after the tall launch, steer to the branch.
    let stage = 0;
    const launchedFrom = (b: ISimBody, pad: { x: number; z: number; radius: number }, minVy: number): boolean =>
      Math.hypot(b.x - pad.x, b.z - pad.z) <= pad.radius + 0.5 && b.vy > minVy;
    const pilot: SimPilot = (b) => {
      if (stage === 0 && launchedFrom(b, low, low.bounceVy - 1)) stage = 1;
      if (stage === 1 && launchedFrom(b, tall, tall.bounceVy - 1)) stage = 2;
      if (stage === 2) return { towardX: SKY_TREE_BRANCH_LOW.x, towardZ: SKY_TREE_BRANCH_LOW.z };
      if (stage === 1) return { towardX: tall.x, towardZ: tall.z };
      return { towardX: low.x, towardZ: low.z, jump: true };
    };
    // Act
    const end = simulateSkyPlayer({ x: low.x + 3, y: GARDEN.deckY, z: low.z }, pilot, 20);
    // Assert
    assert.equal(end.surface?.id, SKY_TREE_BRANCH_LOW.id, describeEnd(end));
    assert.ok(end.hardestLandingMps < SIM_PLAYER.fallDamageFromMps, `landed at ${end.hardestLandingMps.toFixed(1)} m/s`);
  });

  it('skyTreeBranches_WhenWalkedFromTheLowBranch_ShouldReachTheCrown', () => {
    // Arrange
    const top = SKY_TREE_BRANCHES[1];
    const route = [
      { x: SKY_TREE_BRANCH_HIGH.x, z: SKY_TREE_BRANCH_HIGH.z },
      { x: top.bx, z: top.bz },
      { x: top.bx + (SKY_TREE_CROWN.x - top.bx) * 0.15, z: top.bz + (SKY_TREE_CROWN.z - top.bz) * 0.15 },
    ];
    // Act
    const end = simulateSkyPlayer({ x: SKY_TREE_BRANCH_LOW.x, y: SKY_TREE_BRANCH_LOW.y, z: SKY_TREE_BRANCH_LOW.z }, followWaypoints(route), 30);
    // Assert
    assert.equal(end.surface?.id, SKY_TREE_CROWN.id, describeEnd(end));
  });

  it('gardenWindFlower_WhenPlayerRidesItAndSteersToTheHighBranch_ShouldLandThere', () => {
    // Arrange
    const spot = GARDEN_WIND_FLOWER_SPOT;
    const pilot: SimPilot = (b) => (b.y > SKY_TREE_BRANCH_HIGH.y + 0.8 ? { towardX: SKY_TREE_BRANCH_HIGH.x, towardZ: SKY_TREE_BRANCH_HIGH.z } : null);
    // Act
    const end = simulateSkyPlayer({ x: spot.x, y: GARDEN.deckY, z: spot.z }, pilot, 20);
    // Assert
    assert.equal(end.surface?.id, SKY_TREE_BRANCH_HIGH.id, describeEnd(end));
  });
});
// #endregion

// #region Root Path
describe('floating garden root path', () => {
  it('rootPath_WhenPlayerWalksDownTheRootsFromTheNorthRim_ShouldReachTheHiddenNook', () => {
    // Arrange
    const route = [
      { x: GARDEN_ROOT_RAMP.ax, z: GARDEN_ROOT_RAMP.az },
      { x: GARDEN_ROOT_RAMP.bx, z: GARDEN_ROOT_RAMP.bz },
      { x: GARDEN_ROOT_NOOK.x, z: GARDEN_ROOT_NOOK.z },
    ];
    // Act
    const end = simulateSkyPlayer({ x: GARDEN_ROOT_RAMP.ax, y: GARDEN.deckY, z: GARDEN_ROOT_RAMP.az + 3 }, followWaypoints(route), 30);
    // Assert
    assert.equal(end.surface?.id, GARDEN_ROOT_NOOK.id, describeEnd(end));
  });
});
// #endregion
