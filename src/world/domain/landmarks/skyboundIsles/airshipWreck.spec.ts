// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles — Forgotten Airship wreck, part 1 (tests)
// DESIGN: Uses the real surface query, mechanism lookup, puzzle activation and wind sampling, so
//         the hull, the lever and the gated downdraft are proven through the same calls the game makes.
// SUMMARY: The hull is walkable and inside the island rim, the lever is reachable, the navigation
//          downdraft is off until the lever is pulled, runs after, and the solve survives a save.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AIRSHIP_NAVIGATION_CURRENT, AIRSHIP_NAVIGATION_LEVER, AIRSHIP_WRECK_HULL } from './airshipWreckLayout';
import { getSkyIsland } from './skyboundLayout';
import { skyboundSurfaceAt } from './skyboundSurface';
import { activateSkyMechanism, exportSkyPuzzleState, findNearestSkyMechanism, importSkyPuzzleState, isSkyPuzzleSolved, resetSkyPuzzles } from './skyPuzzles';
import { isWindCurrentActive, sampleSkyWindAt } from './skyWindSystem';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const AIRSHIP = getSkyIsland('forgotten-airship')!;
/** Midpoint of the navigation downdraft's path, which must be inside the tube once it runs. */
const PATH_MID = (() => {
  const [a, b] = AIRSHIP_NAVIGATION_CURRENT.path;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
})();
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyPuzzles();
});

// #region Hull
describe('airship wreck hull', () => {
  it('airshipHull_WhenStoodOn_ShouldBeWalkableAboveTheIslandDeck', () => {
    // Arrange
    const h = AIRSHIP_WRECK_HULL;
    const x = (h.minX + h.maxX) / 2;
    const z = (h.minZ + h.maxZ) / 2;
    // Act
    const surface = skyboundSurfaceAt(x, z, h.y + 0.2);
    // Assert
    assert.equal(surface?.y, h.y);
    assert.ok(h.y > AIRSHIP.deckY);
  });

  it('airshipHull_WhenItsCornersAreChecked_ShouldStayInsideTheIslandRim', () => {
    // Arrange
    const h = AIRSHIP_WRECK_HULL;
    const corners = [
      [h.minX, h.minZ],
      [h.minX, h.maxZ],
      [h.maxX, h.minZ],
      [h.maxX, h.maxZ],
    ];
    // Act
    const outside = corners.filter(([x, z]) => Math.hypot(x - AIRSHIP.x, z - AIRSHIP.z) > AIRSHIP.radius);
    // Assert
    assert.deepEqual(outside, []);
  });
});
// #endregion

// #region Navigation Lever
describe('airship navigation lever', () => {
  it('navigationLever_WhenStoodNextTo_ShouldBeTheNearestMechanism', () => {
    // Arrange
    const l = AIRSHIP_NAVIGATION_LEVER;
    // Act
    const mechanism = findNearestSkyMechanism(l.x, l.y + 1.0, l.z);
    // Assert
    assert.equal(mechanism?.id, l.id);
  });

  it('navigationLever_WhenPulled_ShouldSolveThePuzzleOnce', () => {
    // Arrange / Act
    const first = activateSkyMechanism(AIRSHIP_NAVIGATION_LEVER.id);
    const second = activateSkyMechanism(AIRSHIP_NAVIGATION_LEVER.id);
    // Assert
    assert.equal(first.solvedPuzzle, 'airship-navigation');
    assert.equal(isSkyPuzzleSolved('airship-navigation'), true);
    assert.equal(second.changed, false);
  });
});
// #endregion

// #region Navigation Downdraft
describe('airship navigation downdraft', () => {
  it('navigationDowndraft_WhenTheLeverIsNotPulled_ShouldNotRun', () => {
    // Arrange / Act
    const active = isWindCurrentActive(AIRSHIP_NAVIGATION_CURRENT);
    const sample = sampleSkyWindAt(PATH_MID.x, PATH_MID.y, PATH_MID.z, 0);
    // Assert
    assert.equal(active, false);
    assert.equal(sample, null);
  });

  it('navigationDowndraft_WhenTheLeverIsPulled_ShouldRunFromTheBowTowardTheHiddenIsle', () => {
    // Arrange
    activateSkyMechanism(AIRSHIP_NAVIGATION_LEVER.id);
    // Act
    const active = isWindCurrentActive(AIRSHIP_NAVIGATION_CURRENT);
    const sample = sampleSkyWindAt(PATH_MID.x, PATH_MID.y, PATH_MID.z, 0);
    // Assert
    assert.equal(active, true);
    assert.ok(sample !== null, 'the downdraft must carry the player at its midpoint');
  });

  it('navigationDowndraft_WhenTheSolveIsSavedAndLoaded_ShouldStillRun', () => {
    // Arrange
    activateSkyMechanism(AIRSHIP_NAVIGATION_LEVER.id);
    const saved = exportSkyPuzzleState();
    resetSkyPuzzles();
    // Act
    importSkyPuzzleState(saved);
    // Assert
    assert.equal(isSkyPuzzleSolved('airship-navigation'), true);
    assert.equal(isWindCurrentActive(AIRSHIP_NAVIGATION_CURRENT), true);
  });
});
// #endregion
