// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (tests)
// DESIGN: Walks the Sky Observatory with the simulated player (gravity, jump, solid boxes and
//         puzzle gates) and drives the ring puzzle through its public activation API.
// SUMMARY: Tower doorway, the closed then opened hidden chamber, the ring puzzle rules, save
//          round trip, the balcony ramp and railing, and the levers as interactions.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSkyIsland } from './skyboundLayout';
import { resetSkyClouds } from './skyCloudSystem';
import { resetSkyWindFlowers } from './skyWindSystem';
import {
  OBSERVATORY_BALCONY,
  OBSERVATORY_BALCONY_RAMP,
  OBSERVATORY_CHAMBER,
  OBSERVATORY_CHEST_SPOT,
  OBSERVATORY_LEVERS,
  OBSERVATORY_TELESCOPE_PLATFORM,
  OBSERVATORY_TELESCOPE_STAIR,
  OBSERVATORY_TOWER,
} from './observatoryLayout';
import {
  activateSkyMechanism,
  exportSkyPuzzleState,
  importSkyPuzzleState,
  isSkyPuzzleSolved,
  OBSERVATORY_RING_SOLUTION,
  resetSkyPuzzles,
} from './skyPuzzles';
import { resolveBestLookedAtInteraction } from '../interactionLandmarks';
import { simulateSkyPlayer, type ISimBody, type SimPilot } from './skyboundTestSim';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const ISLAND = getSkyIsland('sky-observatory')!;

function followWaypoints(points: ReadonlyArray<{ x: number; z: number }>): SimPilot {
  let index = 0;
  return (b) => {
    while (index < points.length && Math.hypot(points[index].x - b.x, points[index].z - b.z) < 0.5) index++;
    if (index >= points.length) return null;
    return { towardX: points[index].x, towardZ: points[index].z };
  };
}

function describeEnd(b: ISimBody): string {
  return `ended at (${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.z.toFixed(1)}) on ${b.surface?.id ?? 'nothing'}`;
}

/** Presses each lever as many times as the solution asks. */
function solveRings(): void {
  OBSERVATORY_LEVERS.forEach((lever) => {
    for (let k = 0; k < OBSERVATORY_RING_SOLUTION[lever.ringIndex]; k++) activateSkyMechanism(lever.id);
  });
}

/** From outside the south doorway, through the tower, to the chest spot in the chamber. */
const INTO_THE_CHAMBER = [
  { x: OBSERVATORY_TOWER.x, z: OBSERVATORY_TOWER.z + OBSERVATORY_TOWER.innerR + 3 },
  { x: OBSERVATORY_TOWER.x, z: OBSERVATORY_TOWER.z },
  { x: OBSERVATORY_CHEST_SPOT.x, z: OBSERVATORY_CHEST_SPOT.z + 0.8 },
];
const SOUTH_OF_TOWER = { x: OBSERVATORY_TOWER.x, y: ISLAND.deckY, z: OBSERVATORY_TOWER.z + OBSERVATORY_TOWER.innerR + 4 };
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyWindFlowers();
  resetSkyPuzzles();
});

// #region Tower And Chamber
describe('sky observatory tower and chamber', () => {
  it('towerDoorway_WhenPlayerWalksInFromTheSouth_ShouldReachTheTowerCentre', () => {
    // Arrange
    const route = INTO_THE_CHAMBER.slice(0, 2);
    // Act
    const end = simulateSkyPlayer(SOUTH_OF_TOWER, followWaypoints(route), 20);
    // Assert
    assert.ok(Math.hypot(end.x - OBSERVATORY_TOWER.x, end.z - OBSERVATORY_TOWER.z) < 1.0, describeEnd(end));
  });

  it('hiddenChamber_WhenTheRingPuzzleIsUnsolved_ShouldStayClosed', () => {
    // Arrange
    const route = INTO_THE_CHAMBER;
    // Act
    const end = simulateSkyPlayer(SOUTH_OF_TOWER, followWaypoints(route), 20);
    // Assert
    assert.ok(end.z > OBSERVATORY_CHAMBER.maxZ, describeEnd(end));
  });

  it('hiddenChamber_WhenTheRingPuzzleIsSolved_ShouldLetThePlayerReachTheChest', () => {
    // Arrange
    solveRings();
    // Act
    const end = simulateSkyPlayer(SOUTH_OF_TOWER, followWaypoints(INTO_THE_CHAMBER), 25);
    // Assert
    assert.ok(end.z < OBSERVATORY_CHAMBER.maxZ - 2 && end.z > OBSERVATORY_CHAMBER.minZ, describeEnd(end));
  });
});
// #endregion

// #region Ring Puzzle
describe('sky observatory ring puzzle', () => {
  it('ringPuzzle_WhenEachLeverIsPressedTheShownNumberOfTimes_ShouldBeSolved', () => {
    // Arrange
    const presses = OBSERVATORY_RING_SOLUTION;
    // Act
    solveRings();
    // Assert
    assert.ok(presses.length === 3 && isSkyPuzzleSolved('observatory-rings'));
  });

  it('ringPuzzle_WhenOneRingIsOneStepOff_ShouldStayUnsolved', () => {
    // Arrange: the outer ring goes one step too far first, so the rings never pass through the solution.
    OBSERVATORY_LEVERS.forEach((lever) => {
      const presses = OBSERVATORY_RING_SOLUTION[lever.ringIndex] + (lever.ringIndex === 0 ? 1 : 0);
      for (let k = 0; k < presses; k++) activateSkyMechanism(lever.id);
    });
    // Act
    const solved = isSkyPuzzleSolved('observatory-rings');
    // Assert
    assert.equal(solved, false);
  });

  it('ringPuzzle_WhenALeverGoesRoundAFullTurn_ShouldWrapBackToTheStart', () => {
    // Arrange
    const lever = OBSERVATORY_LEVERS[0];
    for (let k = 0; k < 6; k++) activateSkyMechanism(lever.id);
    // Act
    const saved = exportSkyPuzzleState();
    // Assert
    assert.deepEqual(saved.observatoryRings, [0, 0, 0]);
  });

  it('ringPuzzle_WhenSolved_ShouldLockItsLevers', () => {
    // Arrange
    solveRings();
    // Act
    const result = activateSkyMechanism(OBSERVATORY_LEVERS[0].id);
    // Assert
    assert.deepEqual(result, { changed: false, solvedPuzzle: null, sequenceReset: false, runesLit: 0, coresActive: 0 });
  });

  it('skyPuzzleState_WhenSavedAndRestored_ShouldKeepTheSolvedChamberOpen', () => {
    // Arrange
    solveRings();
    const saved = exportSkyPuzzleState();
    resetSkyPuzzles();
    // Act
    importSkyPuzzleState(saved);
    // Assert
    assert.equal(isSkyPuzzleSolved('observatory-rings'), true);
  });

  it('skyPuzzleState_WhenRestoredFromAnOldSaveWithoutPuzzles_ShouldStartUnsolved', () => {
    // Arrange
    solveRings();
    // Act
    importSkyPuzzleState(undefined);
    // Assert
    assert.deepEqual(exportSkyPuzzleState(), { observatoryRings: [0, 0, 0], crystalResonanceProgress: 0, ruinsRunesLit: [], windCoresActive: [], solved: [] });
  });

  for (const lever of OBSERVATORY_LEVERS) {
    it(`${lever.id}_WhenPlayerStandsInFrontLookingAtIt_ShouldBeOfferedAsTheInteraction`, () => {
      // Arrange: stand 1.3 m south of the lever, facing north (yaw 0 faces -z).
      const px = lever.x;
      const pz = lever.z + 1.3;
      // Act
      const result = resolveBestLookedAtInteraction(px, ISLAND.deckY, pz, 0, -0.3);
      // Assert
      assert.equal(result.kind, 'sky_mechanism');
      assert.equal(result.mechanism?.id, lever.id);
    });
  }
});
// #endregion

// #region Balcony
describe('sky observatory balcony', () => {
  it('balconyRamp_WhenWalkedFromTheDeck_ShouldReachTheTowerBalcony', () => {
    // Arrange
    const r = OBSERVATORY_BALCONY_RAMP;
    const route = [
      { x: r.ax, z: r.az },
      { x: r.bx + 0.6, z: r.bz },
    ];
    // Act
    const end = simulateSkyPlayer({ x: r.ax - 3, y: ISLAND.deckY, z: r.az }, followWaypoints(route), 20);
    // Assert
    assert.equal(end.surface?.id, 'observatory-balcony', describeEnd(end));
  });

  it('towerBalcony_WhenPlayerWalksOffTheEastSide_ShouldBeStoppedByTheRailing', () => {
    // Arrange
    const start = { x: OBSERVATORY_BALCONY.x + 9.4, y: OBSERVATORY_BALCONY.y, z: OBSERVATORY_BALCONY.z };
    const pilot: SimPilot = (_b, t) => (t < 3 ? { towardX: start.x + 20, towardZ: start.z } : null);
    // Act
    const end = simulateSkyPlayer(start, pilot, 5);
    // Assert
    assert.equal(end.surface?.id, 'observatory-balcony', describeEnd(end));
  });

  it('giantTelescopeStair_WhenWalkedFromTheDeck_ShouldReachTheTelescopePlatform', () => {
    // Arrange
    const s = OBSERVATORY_TELESCOPE_STAIR;
    const p = OBSERVATORY_TELESCOPE_PLATFORM;
    const route = [
      { x: s.ax, z: s.az },
      { x: (p.minX + p.maxX) / 2, z: (p.minZ + p.maxZ) / 2 - 0.6 },
    ];
    // Act
    const end = simulateSkyPlayer({ x: s.ax, y: ISLAND.deckY, z: s.az - 1.5 }, followWaypoints(route), 15);
    // Assert
    assert.equal(end.surface?.id, OBSERVATORY_TELESCOPE_PLATFORM.id, describeEnd(end));
    assert.equal(end.y, OBSERVATORY_TELESCOPE_PLATFORM.y);
  });
});
// #endregion
