// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (tests)
// DESIGN: Drives the Wind Cores through the public activation API and checks what the
//         Windspire unlocks at each count, walking the summit updraft with the simulated
//         player.
// SUMMARY: Core activation and saving, the Observatory shortcut at two cores, the summit
//          updraft at four, the summit railing, and each core standing in a reachable place.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resetSkyClouds } from './skyCloudSystem';
import { resetSkyWindFlowers, sampleSkyWindAt, SKY_WIND_CURRENTS } from './skyWindSystem';
import { WIND_CORES, WIND_CORE_UNLOCKS } from './windCoresLayout';
import { WINDSPIRE_BALCONY, WINDSPIRE_SUMMIT } from './skyHarborLayout';
import { activateSkyMechanism, exportSkyPuzzleState, getActiveWindCoreCount, importSkyPuzzleState, resetSkyPuzzles } from './skyPuzzles';
import { skyboundSurfaceAt, SKYBOUND_SOLID_BOXES } from './skyboundSurface';
import { resolveBestLookedAtInteraction } from '../interactionLandmarks';
import { simulateSkyPlayer, type ISimBody, type SimPilot } from './skyboundTestSim';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
function activateCores(count: number): void {
  WIND_CORES.slice(0, count).forEach((c) => activateSkyMechanism(c.id));
}

function describeEnd(b: ISimBody): string {
  return `ended at (${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.z.toFixed(1)}) on ${b.surface?.id ?? 'nothing'}`;
}

const shortcut = SKY_WIND_CURRENTS.find((c) => c.id === 'wind-windspire-shortcut')!;
const summitDraft = SKY_WIND_CURRENTS.find((c) => c.id === 'wind-windspire-summit')!;
const SUMMIT_DRAFT_BASE = { x: summitDraft.path[0].x, y: WINDSPIRE_BALCONY.y, z: summitDraft.path[0].z };
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyWindFlowers();
  resetSkyPuzzles();
});

// #region Activation
describe('wind cores activation', () => {
  it('windCore_WhenActivated_ShouldCountTowardTheWindspire', () => {
    // Arrange
    const core = WIND_CORES[2];
    // Act
    const result = activateSkyMechanism(core.id);
    // Assert
    assert.deepEqual({ changed: result.changed, coresActive: result.coresActive, count: getActiveWindCoreCount() }, { changed: true, coresActive: 1, count: 1 });
  });

  it('windCore_WhenActivatedTwice_ShouldCountOnce', () => {
    // Arrange
    activateSkyMechanism(WIND_CORES[0].id);
    // Act
    const again = activateSkyMechanism(WIND_CORES[0].id);
    // Assert
    assert.deepEqual(again, { changed: false, solvedPuzzle: null, sequenceReset: false, runesLit: 0, coresActive: 1 });
  });

  it('windCores_WhenSavedAndRestored_ShouldStayActive', () => {
    // Arrange
    activateCores(3);
    const saved = exportSkyPuzzleState();
    resetSkyPuzzles();
    // Act
    importSkyPuzzleState(saved);
    // Assert
    assert.equal(getActiveWindCoreCount(), 3);
  });

  for (const core of WIND_CORES) {
    it(`${core.id}_WhenQueried_ShouldFloatOverAWalkableFloorClearOfOtherProps`, () => {
      // Arrange: stand 1.2 m east of the core (the core's own pedestal is ignored).
      const standX = core.x + 1.2;
      // Act
      const floor = skyboundSurfaceAt(standX, core.z, core.y);
      const blockers = SKYBOUND_SOLID_BOXES.filter(
        (b) => b.id !== core.id && core.y + 1.55 >= b.minY && core.y < b.maxY - 0.28 && standX + 0.44 > b.minX && standX - 0.44 < b.maxX && core.z + 0.44 > b.minZ && core.z - 0.44 < b.maxZ
      );
      // Assert
      assert.equal(floor?.y, core.y, `floor at ${floor?.y}`);
      assert.deepEqual(blockers.map((b) => b.id), []);
    });

    it(`${core.id}_WhenPlayerStandsBesideItLookingAtIt_ShouldBeOfferedAsTheInteraction`, () => {
      // Arrange: 1.2 m east of the core, facing west (yaw pi/2 faces -x).
      const px = core.x + 1.2;
      // Act
      const result = resolveBestLookedAtInteraction(px, core.y, core.z, Math.PI / 2, -0.3);
      // Assert
      assert.equal(result.mechanism?.id, core.id);
    });
  }
});
// #endregion

// #region Unlocks
describe('wind cores unlocks', () => {
  it('observatoryShortcut_WhenOneCoreIsActive_ShouldStayClosed', () => {
    // Arrange
    activateCores(WIND_CORE_UNLOCKS.observatoryShortcut - 1);
    // Act
    const sample = sampleSkyWindAt(shortcut.path[0].x, shortcut.path[0].y - 1.5, shortcut.path[0].z, 0);
    // Assert
    assert.equal(sample, null);
  });

  it('observatoryShortcut_WhenTwoCoresAreActive_ShouldCarryThePlayerToTheObservatory', () => {
    // Arrange
    activateCores(WIND_CORE_UNLOCKS.observatoryShortcut);
    // Act
    const end = simulateSkyPlayer({ x: shortcut.path[0].x, y: 68.0, z: shortcut.path[0].z }, () => null, 60);
    // Assert
    assert.equal(end.surface?.id, 'sky-observatory', describeEnd(end));
  });

  it('summitUpdraft_WhenThreeCoresAreActive_ShouldStayClosed', () => {
    // Arrange
    activateCores(WIND_CORE_UNLOCKS.summit - 1);
    // Act
    const sample = sampleSkyWindAt(SUMMIT_DRAFT_BASE.x, SUMMIT_DRAFT_BASE.y, SUMMIT_DRAFT_BASE.z, 0);
    // Assert
    assert.equal(sample, null);
  });

  it('summitUpdraft_WhenAllFourCoresAreActive_ShouldLiftThePlayerOntoTheSummit', () => {
    // Arrange: ride the column, then walk toward the summit centre near the top.
    activateCores(WIND_CORE_UNLOCKS.summit);
    const pilot: SimPilot = (b) => (b.y > WINDSPIRE_SUMMIT.y - 0.5 ? { towardX: WINDSPIRE_SUMMIT.cx, towardZ: WINDSPIRE_SUMMIT.cz } : null);
    // Act
    const end = simulateSkyPlayer(SUMMIT_DRAFT_BASE, pilot, 30);
    // Assert
    assert.equal(end.surface?.id, 'windspire-summit', describeEnd(end));
  });

  it('summit_WhenPlayerWalksOffTheWestSide_ShouldBeStoppedByTheRailing', () => {
    // Arrange
    const start = { x: WINDSPIRE_SUMMIT.cx - 3, y: WINDSPIRE_SUMMIT.y, z: WINDSPIRE_SUMMIT.cz };
    const pilot: SimPilot = (_b, t) => (t < 3 ? { towardX: start.x - 20, towardZ: start.z } : null);
    // Act
    const end = simulateSkyPlayer(start, pilot, 5);
    // Assert
    assert.equal(end.surface?.id, 'windspire-summit', describeEnd(end));
  });
});
// #endregion
