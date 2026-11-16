// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (tests)
// DESIGN: Checks the telescope contract end to end on the pure parts: placement, the view
//         direction, when a view ends, that the shared interaction resolver offers it, and
//         that the camera rig really looks through it with a narrow field of view.
// SUMMARY: Sky Harbor balcony telescopes: data, view math, exit rules, interaction and camera.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSkyIsland } from './skyboundLayout';
import { SKY_BALCONIES } from './skyHarborLayout';
import { SKY_TELESCOPES, shouldExitTelescopeView, telescopeViewFor } from './skyTelescopes';
import { resolveBestLookedAtInteraction } from '../interactionLandmarks';
import { computeTargetFov, createCameraPose, createCameraRigState, stepCameraRig } from '../../../systems/cameraRigSystem';
import { createInitialPlayerState } from '../../../systems/playerPhysicsSystem';
// #endregion

// ======================== TESTS ======================== \\
// #region Placement
describe('sky telescopes placement', () => {
  it('skyTelescopes_WhenCounted_ShouldStandOneOnEveryBalcony', () => {
    // Arrange
    const balconyIds = SKY_BALCONIES.map((b) => b.id).sort();
    // Act
    const telescopeBalconies = SKY_TELESCOPES.map((t) => t.balconyId).sort();
    // Assert
    assert.deepEqual(telescopeBalconies, balconyIds);
  });

  for (const scope of SKY_TELESCOPES) {
    it(`${scope.id}_WhenItsTargetIsLookedUp_ShouldBeARealIsland`, () => {
      // Arrange
      const targetId = scope.targetIslandId;
      // Act
      const island = getSkyIsland(targetId);
      // Assert
      assert.equal(island?.id, targetId);
    });
  }
});
// #endregion

// #region View Math
describe('sky telescopes view', () => {
  for (const scope of SKY_TELESCOPES) {
    it(`${scope.id}_WhenLookedThrough_ShouldFaceItsTargetIsland`, () => {
      // Arrange
      const island = getSkyIsland(scope.targetIslandId)!;
      const toTarget = { x: island.x - scope.x, z: island.z - scope.z };
      const len = Math.hypot(toTarget.x, toTarget.z);
      // Act
      const view = telescopeViewFor(scope);
      // Assert: the game's forward vector for a yaw is (-sin yaw, -cos yaw).
      const dot = (-Math.sin(view.yaw) * toTarget.x - Math.cos(view.yaw) * toTarget.z) / len;
      assert.ok(dot > 0.999, `facing dot ${dot.toFixed(4)}`);
      assert.ok(Math.abs(view.lookY - (island.deckY + 4)) < 1e-9);
    });

    it(`${scope.id}_WhenLookedThrough_ShouldSeeItsTargetFromAboveOrLevel`, () => {
      // Arrange: a target far above the eye shows only the rock under its deck.
      const island = getSkyIsland(scope.targetIslandId)!;
      // Act
      const view = telescopeViewFor(scope);
      // Assert
      assert.ok(island.deckY <= view.eyeY + 15, `deck ${island.deckY} m vs eye ${view.eyeY} m`);
    });

    it(`${scope.id}_WhenLookedThrough_ShouldZoomInComparedToTheNormalView`, () => {
      // Arrange
      const normalFovDeg = 68;
      // Act
      const view = telescopeViewFor(scope);
      // Assert
      assert.ok(view.fovDeg >= 12 && view.fovDeg <= normalFovDeg / 2, `fov ${view.fovDeg.toFixed(1)} deg`);
    });
  }
});
// #endregion

// #region Exit Rules
describe('sky telescopes exit rules', () => {
  const scope = SKY_TELESCOPES[0];

  it('shouldExitTelescopeView_WhenPlayerStandsStillAtTheTelescope_ShouldStayInTheView', () => {
    // Arrange
    const player = { x: scope.x, z: scope.z, telescopeViewId: scope.id };
    // Act
    const exit = shouldExitTelescopeView(player, 0, 0);
    // Assert
    assert.equal(exit, false);
  });

  it('shouldExitTelescopeView_WhenPlayerPressesAMovementKey_ShouldLeaveTheView', () => {
    // Arrange
    const player = { x: scope.x, z: scope.z, telescopeViewId: scope.id };
    // Act
    const exit = shouldExitTelescopeView(player, 1, 0);
    // Assert
    assert.equal(exit, true);
  });

  it('shouldExitTelescopeView_WhenPlayerIsFarFromTheTelescope_ShouldLeaveTheView', () => {
    // Arrange
    const player = { x: scope.x + 10, z: scope.z, telescopeViewId: scope.id };
    // Act
    const exit = shouldExitTelescopeView(player, 0, 0);
    // Assert
    assert.equal(exit, true);
  });
});
// #endregion

// #region Interaction And Camera
describe('sky telescopes in the game systems', () => {
  for (const scope of SKY_TELESCOPES) {
    it(`${scope.id}_WhenPlayerStandsBesideItLookingAtIt_ShouldBeOfferedAsTheInteraction`, () => {
      // Arrange: stand 1.2 m on the hub side of the telescope, facing it.
      const island = getSkyIsland(scope.targetIslandId)!;
      const len = Math.hypot(island.x - scope.x, island.z - scope.z);
      const px = scope.x - ((island.x - scope.x) / len) * 1.2;
      const pz = scope.z - ((island.z - scope.z) / len) * 1.2;
      const yaw = Math.atan2(-(scope.x - px), -(scope.z - pz));
      // Act
      const result = resolveBestLookedAtInteraction(px, scope.y, pz, yaw, -0.2);
      // Assert
      assert.equal(result.kind, 'telescope');
      assert.equal(result.telescope?.id, scope.id);
    });
  }

  it('cameraRig_WhenPlayerLooksThroughATelescope_ShouldAimAtTheIslandWithANarrowFieldOfView', () => {
    // Arrange
    const scope = SKY_TELESCOPES[0];
    const player = createInitialPlayerState();
    player.x = scope.x;
    player.y = scope.y;
    player.z = scope.z;
    player.telescopeViewId = scope.id;
    const rig = createCameraRigState();
    const pose = createCameraPose();
    const view = telescopeViewFor(scope);
    // Act
    stepCameraRig(rig, { player, dt: 1 / 60, elapsedSeconds: 0, landingDip: 0, isSleepingInBed: false }, pose);
    // Assert
    assert.deepEqual(
      { mode: pose.mode, lookX: pose.lookX, lookY: pose.lookY, lookZ: pose.lookZ, fov: computeTargetFov(rig, player) },
      { mode: 'lookAt', lookX: view.lookX, lookY: view.lookY, lookZ: view.lookZ, fov: view.fovDeg }
    );
  });
});
// #endregion
