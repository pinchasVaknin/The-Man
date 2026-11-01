// ============================================================================
// MODULE: World / Systems / Weapon Feel System Tests
// DESIGN: AAA unit tests plus a golden trace for weapon presentation easing
// SUMMARY: Verifies bow tension timing, effect expiry and the sway clamp, and pins a
//          scripted draw/swing/look sequence.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertMatchesGolden } from '../../testSupport/goldenMaster';
import { stepBowFeel, stepMeleeFeelAndSway } from './weaponFeelSystem';
import { createInitialPlayerState } from './playerPhysicsSystem';
// #endregion

// ======================== BEHAVIOR TESTS ======================== \\
// #region Behavior Tests
test('stepBowFeel_WhenDrawHeldForFullDrawTime_ShouldReachFullTension', () => {
  // Arrange
  const player = createInitialPlayerState();
  player.bowDrawn = true;
  player.bowDrawProgress = 0;

  // Act
  for (let i = 0; i < 32; i++) stepBowFeel(player, 1 / 60, true);

  // Assert
  assert.equal(player.bowDrawProgress, 1);
});

test('stepBowFeel_WhenDrawnButNotHeld_ShouldHoldTension', () => {
  // Arrange
  const player = createInitialPlayerState();
  player.bowDrawn = true;
  player.bowDrawProgress = 0.4;

  // Act
  stepBowFeel(player, 1 / 60, false);

  // Assert
  assert.equal(player.bowDrawProgress, 0.4);
});

test('stepMeleeFeelAndSway_WhenSparkOutlivesLifetime_ShouldClearIt', () => {
  // Arrange
  const player = createInitialPlayerState();
  player.lastSwordHitPoint = { x: 0, y: 0, z: 0, kind: 'wall', age: 0.44 };

  // Act
  stepMeleeFeelAndSway(player, { dt: 0.02, lookYawDelta: 0, lookPitchDelta: 0, landingDip: 0 });

  // Assert
  assert.equal(player.lastSwordHitPoint, null);
});

test('stepMeleeFeelAndSway_WhenLookFlickIsHuge_ShouldClampSwayTarget', () => {
  // Arrange
  const player = createInitialPlayerState();
  player.weaponSwayX = 0;

  // Act
  stepMeleeFeelAndSway(player, { dt: 1 / 60, lookYawDelta: -10, lookPitchDelta: 0, landingDip: 0 });

  // Assert
  assert.ok((player.weaponSwayX ?? 0) <= 0.045);
  assert.ok((player.weaponSwayX ?? 0) > 0);
});
// #endregion

// ======================== GOLDEN TRACE ======================== \\
// #region Golden Trace
test('weaponFeel_WhenScriptedDrawBlockAndLookRun_ShouldMatchGolden', () => {
  // Arrange
  const player = createInitialPlayerState();
  const trace: unknown[] = [];

  // Act
  for (let frame = 0; frame < 120; frame++) {
    player.bowDrawn = frame < 50;
    player.bowReleaseKick = frame === 50 ? 1 : player.bowReleaseKick;
    player.equippedTool = frame < 60 ? 'bow' : 'sword';
    player.swordBlocking = frame >= 70 && frame < 100;
    player.vy = frame % 40 < 10 ? 5 : -2;
    stepBowFeel(player, 1 / 60, frame % 3 !== 0);
    stepMeleeFeelAndSway(player, {
      dt: 1 / 60, lookYawDelta: Math.sin(frame * 0.2) * 0.03, lookPitchDelta: Math.cos(frame * 0.3) * 0.02, landingDip: frame % 25 === 0 ? 0.1 : 0,
    });
    if (frame % 10 === 9) {
      trace.push({
        frame,
        draw: player.bowDrawProgress, kick: player.bowReleaseKick, block: player.swordBlockProgress,
        swayX: player.weaponSwayX, swayY: player.weaponSwayY,
      });
    }
  }

  // Assert
  assertMatchesGolden(new URL('./__golden__/weapon-feel.json', import.meta.url), trace);
});
// #endregion
