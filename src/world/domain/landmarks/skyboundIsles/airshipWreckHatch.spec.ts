// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles — Forgotten Airship wreck, part 2 (tests)
// DESIGN: Uses the real gate list, mechanism activation, chest lookup and surface query, so the
//         crate's blocking, the hidden hatch chest and its reveal are proven through the calls the game makes.
// SUMMARY: The crate blocks until pushed, the hatch chest is hidden until then and stands on the hull,
//          and the push survives a save round trip.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AIRSHIP_CRATE_GATE, AIRSHIP_CRATE_PUSH_POINT, AIRSHIP_HATCH_CHEST } from './airshipWreckLayout';
import { skyboundSurfaceAt } from './skyboundSurface';
import { activateSkyMechanism, closedSkyGates, exportSkyPuzzleState, importSkyPuzzleState, isSkyPuzzleSolved, resetSkyPuzzles } from './skyPuzzles';
import { findNearestWorldChest } from '../interactionLandmarks';
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyPuzzles();
});

// #region Crate
describe('airship crate and hatch', () => {
  it('crateGate_WhenTheHatchIsNotOpened_ShouldBlockThePlayer', () => {
    // Arrange / Act
    const gates = closedSkyGates();
    // Assert
    assert.ok(gates.some((g) => g.id === AIRSHIP_CRATE_GATE.id));
  });

  it('crate_WhenPushed_ShouldOpenItsGateAndSolveTheHatchPuzzle', () => {
    // Arrange / Act
    const result = activateSkyMechanism(AIRSHIP_CRATE_PUSH_POINT.id);
    // Assert
    assert.equal(result.solvedPuzzle, 'airship-hatch');
    assert.equal(isSkyPuzzleSolved('airship-hatch'), true);
    assert.equal(closedSkyGates().some((g) => g.id === AIRSHIP_CRATE_GATE.id), false);
  });

  it('crate_WhenPushedTwice_ShouldChangeNothingTheSecondTime', () => {
    // Arrange
    activateSkyMechanism(AIRSHIP_CRATE_PUSH_POINT.id);
    // Act
    const again = activateSkyMechanism(AIRSHIP_CRATE_PUSH_POINT.id);
    // Assert
    assert.equal(again.changed, false);
  });
});
// #endregion

// #region Hatch Chest
describe('airship hatch chest', () => {
  it('hatchChest_WhenTheCrateIsNotPushed_ShouldNotBeOpenable', () => {
    // Arrange: standing right over the hatch.
    const c = AIRSHIP_HATCH_CHEST;
    // Act
    const found = findNearestWorldChest(c.x, c.y, c.z);
    // Assert
    assert.notEqual(found?.id, AIRSHIP_HATCH_CHEST.id);
  });

  it('hatchChest_WhenTheCrateIsPushed_ShouldBeOpenableFromTheHatch', () => {
    // Arrange
    activateSkyMechanism(AIRSHIP_CRATE_PUSH_POINT.id);
    const c = AIRSHIP_HATCH_CHEST;
    // Act
    const found = findNearestWorldChest(c.x, c.y, c.z);
    // Assert
    assert.equal(found?.id, AIRSHIP_HATCH_CHEST.id);
  });

  it('hatchChest_WhenPlaced_ShouldStandOnTheHull', () => {
    // Arrange
    const c = AIRSHIP_HATCH_CHEST;
    // Act
    const surface = skyboundSurfaceAt(c.x, c.z, c.y + 0.5);
    // Assert
    assert.equal(surface?.y, c.y);
  });

  it('hatchPush_WhenSavedAndLoaded_ShouldStayPushed', () => {
    // Arrange
    activateSkyMechanism(AIRSHIP_CRATE_PUSH_POINT.id);
    const saved = exportSkyPuzzleState();
    resetSkyPuzzles();
    // Act
    importSkyPuzzleState(saved);
    // Assert
    assert.equal(isSkyPuzzleSolved('airship-hatch'), true);
  });
});
// #endregion
