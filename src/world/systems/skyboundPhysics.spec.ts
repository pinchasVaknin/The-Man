// ============================================================================
// MODULE: World / Systems / Player Physics — Skybound Isles (tests)
// DESIGN: Drives the real `stepPlayerPhysics` frame by frame with no keys held, so these
//         catch interactions with the controller's own rules (short-hop cut, fall damage)
//         that the domain-level traversal simulation cannot see.
// SUMMARY: Bounce launches and wind lifts reach full height without holding jump, and
//          neither a bounce mushroom nor an idle ride in a wind flower ends in a damaging fall.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialPlayerState, stepPlayerPhysics } from './playerPhysicsSystem';
import type { IPlayerInput } from '../domain/worldTypes';
import { RUINS_UPDRAFT_BASE } from '../domain/landmarks/skyboundIsles/skyCloudRoutes';
import { SKY_BOUNCE_PADS } from '../domain/landmarks/skyboundIsles/skyHarborLayout';
import { resetSkyClouds } from '../domain/landmarks/skyboundIsles/skyCloudSystem';
import { SKY_WIND_FLOWERS, resetSkyWindFlowers } from '../domain/landmarks/skyboundIsles/skyWindSystem';
import { OBSERVATORY_CHAMBER, OBSERVATORY_TOWER } from '../domain/landmarks/skyboundIsles/observatoryLayout';
import { activateSkyMechanism, OBSERVATORY_RING_SOLUTION, resetSkyPuzzles } from '../domain/landmarks/skyboundIsles/skyPuzzles';
import { OBSERVATORY_LEVERS } from '../domain/landmarks/skyboundIsles/observatoryLayout';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const FRAME_SEC = 1 / 60;
const FALL_DAMAGE_START_MPS = 12;

const NO_KEYS: IPlayerInput = {
  forward: 0,
  right: 0,
  sprint: false,
  relaxed: false,
  jumpPressed: false,
  jumpHeld: false,
  lookYawDelta: 0,
  lookPitchDelta: 0,
};

/** Runs `seconds` of physics with no keys held; returns the highest feet height and hardest landing. */
function runIdle(x: number, y: number, z: number, seconds: number): { peakY: number; hardestLandingMps: number } {
  const player = createInitialPlayerState();
  player.x = x;
  player.y = y;
  player.z = z;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  let peakY = y;
  let hardestLandingMps = 0;
  for (let t = 0; t < seconds; t += FRAME_SEC) {
    player.lastLandingSpeed = 0;
    stepPlayerPhysics(player, NO_KEYS, [], FRAME_SEC);
    peakY = Math.max(peakY, player.y);
    hardestLandingMps = Math.max(hardestLandingMps, player.lastLandingSpeed ?? 0);
  }
  return { peakY, hardestLandingMps };
}
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyWindFlowers();
  resetSkyPuzzles();
});

/** Walks north (yaw 0 faces -z) from the tower centre for `seconds`; returns the final z. */
function walkNorthFromTowerCentre(seconds: number): number {
  const player = createInitialPlayerState();
  player.x = OBSERVATORY_TOWER.x;
  player.y = 98.0;
  player.z = OBSERVATORY_TOWER.z;
  player.yaw = 0;
  for (let t = 0; t < seconds; t += FRAME_SEC) {
    stepPlayerPhysics(player, { ...NO_KEYS, forward: 1 }, [], FRAME_SEC);
  }
  return player.z;
}

// #region Launches And Landings
describe('skybound physics in the real controller', () => {
  it('bigMushroom_WhenPlayerBouncesOnItWithoutHoldingJump_ShouldReachFullHeightAndTakeNoFallDamage', () => {
    // Arrange
    const big = SKY_BOUNCE_PADS.find((p) => p.id === 'mushroom-big')!;
    // Act
    const run = runIdle(big.x, big.topY + 0.1, big.z, 5);
    // Assert
    assert.ok(run.peakY > big.topY + 9.5, `peak ${run.peakY.toFixed(1)} m`);
    assert.ok(run.hardestLandingMps < FALL_DAMAGE_START_MPS, `landed at ${run.hardestLandingMps.toFixed(1)} m/s`);
  });

  for (const flower of SKY_WIND_FLOWERS) {
    it(`${flower.id}_WhenPlayerStandsInItWithoutSteering_ShouldNeverTakeFallDamage`, () => {
      // Arrange
      const start = { x: flower.x, y: flower.deckY, z: flower.z };
      // Act
      const run = runIdle(start.x, start.y, start.z, 12);
      // Assert
      assert.ok(run.peakY > flower.deckY + 8, `peak ${run.peakY.toFixed(1)} m`);
      assert.ok(run.hardestLandingMps < FALL_DAMAGE_START_MPS, `landed at ${run.hardestLandingMps.toFixed(1)} m/s`);
    });
  }

  it('ruinsUpdraft_WhenPlayerStandsInItWithoutHoldingJump_ShouldLiftToTheColumnTop', () => {
    // Arrange
    const base = RUINS_UPDRAFT_BASE;
    // Act
    const run = runIdle(base.x, base.y, base.z, 4);
    // Assert
    assert.ok(run.peakY > 93.0, `peak ${run.peakY.toFixed(1)} m`);
  });
});
// #endregion

// #region Puzzle Gates
describe('skybound puzzle gates in the real controller', () => {
  it('observatoryChamberGate_WhenTheRingPuzzleIsUnsolved_ShouldStopThePlayer', () => {
    // Arrange: nothing solved.
    const gateZ = OBSERVATORY_CHAMBER.maxZ;
    // Act
    const z = walkNorthFromTowerCentre(4);
    // Assert
    assert.ok(z > gateZ, `walked to z=${z.toFixed(2)}`);
  });

  it('observatoryChamberGate_WhenTheRingPuzzleIsSolved_ShouldLetThePlayerThrough', () => {
    // Arrange
    OBSERVATORY_LEVERS.forEach((lever) => {
      for (let k = 0; k < OBSERVATORY_RING_SOLUTION[lever.ringIndex]; k++) activateSkyMechanism(lever.id);
    });
    // Act
    const z = walkNorthFromTowerCentre(4);
    // Assert
    assert.ok(z < OBSERVATORY_CHAMBER.maxZ - 2, `walked to z=${z.toFixed(2)}`);
  });
});
// #endregion
