// ============================================================================
// MODULE: World / Systems / Player Physics — Wind Glider (tests)
// DESIGN: Drives the real `stepPlayerPhysics` from a high drop over open sea next to the
//         archipelago, comparing a player with and without the Wind Glider, holding or not
//         holding jump, so the glide is proven in the actual controller.
// SUMMARY: Gliding caps the fall, carries the player forward, prevents fall damage, needs the
//          item, needs jump held, and stops on landing.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialPlayerState, stepPlayerPhysics, WIND_GLIDER_FALL_SPEED_MPS } from './playerPhysicsSystem';
import type { IPlayerInput } from '../domain/worldTypes';
import { resetSkyClouds } from '../domain/landmarks/skyboundIsles/skyCloudSystem';
import { resetSkyPuzzles } from '../domain/landmarks/skyboundIsles/skyPuzzles';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const FRAME_SEC = 1 / 60;
const FALL_DAMAGE_START_MPS = 12;
/** Open sky south-east of the Crystal Isles: nothing to land on for a long way down. */
const DROP_POINT = { x: 940.0, y: 120.0, z: 60.0 };

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

interface IDropResult {
  fastestFallMps: number;
  horizontalMetres: number;
  heightLost: number;
  glidingSeen: boolean;
}

/** Drops a player from the drop point for `seconds`, facing -z (yaw 0). */
function drop(owned: boolean, input: IPlayerInput, seconds: number): IDropResult {
  const player = createInitialPlayerState();
  player.x = DROP_POINT.x;
  player.y = DROP_POINT.y;
  player.z = DROP_POINT.z;
  player.yaw = 0;
  player.onGround = false;
  player.ownedItemIds = owned ? ['wind_glider'] : [];
  let fastestFallMps = 0;
  let glidingSeen = false;
  for (let t = 0; t < seconds; t += FRAME_SEC) {
    stepPlayerPhysics(player, input, [], FRAME_SEC);
    fastestFallMps = Math.max(fastestFallMps, -player.vy);
    glidingSeen = glidingSeen || Boolean(player.isGliding);
  }
  return {
    fastestFallMps,
    horizontalMetres: Math.hypot(player.x - DROP_POINT.x, player.z - DROP_POINT.z),
    heightLost: DROP_POINT.y - player.y,
    glidingSeen,
  };
}
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyPuzzles();
});

// #region Gliding
describe('wind glider in the real controller', () => {
  it('windGlider_WhenJumpIsHeldWhileFalling_ShouldCapTheFallBelowTheDamageSpeed', () => {
    // Arrange
    const input = { ...NO_KEYS, jumpHeld: true };
    // Act
    const run = drop(true, input, 6);
    // Assert
    assert.ok(run.fastestFallMps <= WIND_GLIDER_FALL_SPEED_MPS + 1.5 && run.fastestFallMps < FALL_DAMAGE_START_MPS, `fastest fall ${run.fastestFallMps.toFixed(1)} m/s`);
    assert.equal(run.glidingSeen, true);
  });

  it('windGlider_WhenGlidingWithForwardHeld_ShouldCarryThePlayerFarForward', () => {
    // Arrange
    const input = { ...NO_KEYS, jumpHeld: true, forward: 1 };
    // Act
    const run = drop(true, input, 6);
    // Assert: much more distance than height lost.
    assert.ok(run.horizontalMetres > run.heightLost * 2.5, `forward ${run.horizontalMetres.toFixed(1)} m for ${run.heightLost.toFixed(1)} m lost`);
  });

  it('windGlider_WhenJumpIsNotHeld_ShouldFallNormally', () => {
    // Arrange
    const input = NO_KEYS;
    // Act
    const run = drop(true, input, 3);
    // Assert
    assert.ok(run.fastestFallMps > FALL_DAMAGE_START_MPS, `fastest fall ${run.fastestFallMps.toFixed(1)} m/s`);
    assert.equal(run.glidingSeen, false);
  });

  it('playerWithoutTheGlider_WhenHoldingJumpWhileFalling_ShouldFallNormally', () => {
    // Arrange
    const input = { ...NO_KEYS, jumpHeld: true };
    // Act
    const run = drop(false, input, 3);
    // Assert
    assert.ok(run.fastestFallMps > FALL_DAMAGE_START_MPS, `fastest fall ${run.fastestFallMps.toFixed(1)} m/s`);
    assert.equal(run.glidingSeen, false);
  });

  it('windGlider_WhenThePlayerLands_ShouldFoldAway', () => {
    // Arrange: glide down onto the Sky Harbor deck from 6 m above it.
    const player = createInitialPlayerState();
    player.x = 766.0;
    player.y = 74.0;
    player.z = -30.0;
    player.onGround = false;
    player.ownedItemIds = ['wind_glider'];
    // Act
    for (let t = 0; t < 4; t += FRAME_SEC) stepPlayerPhysics(player, { ...NO_KEYS, jumpHeld: true }, [], FRAME_SEC);
    // Assert
    assert.deepEqual({ onGround: player.onGround, gliding: Boolean(player.isGliding), y: Number(player.y.toFixed(2)) }, { onGround: true, gliding: false, y: 68.0 });
  });
});
// #endregion
