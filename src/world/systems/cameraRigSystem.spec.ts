// ============================================================================
// MODULE: World / Systems / Camera Rig System Tests
// DESIGN: AAA unit tests plus a golden trace of the camera rig across view modes
// SUMMARY: Pins first-person, third-person, mounted, swimming, crouching, aiming,
//          sword-swing and bed poses and the FOV easing; checks the ground clamp and
//          the FOV dead zone.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertMatchesGolden } from '../../testSupport/goldenMaster';
import {
  computeTargetFov,
  createCameraPose,
  createCameraRigState,
  easeFovToward,
  stepCameraRig,
  writeTitleOrbitPose,
} from './cameraRigSystem';
import { createInitialPlayerState } from './playerPhysicsSystem';
import { walkableHeightAt } from './terrainAndBiomeSystem';
import type { IPlayerState } from '../domain/worldTypes';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
const VIEW_VARIANTS: ReadonlyArray<Partial<IPlayerState>> = [
  {},
  { cameraPerspective: 'third_person' },
  { cameraPerspective: 'third_person', mountedHorseId: 'horse-1', vx: 12 },
  { isSwimming: true },
  { isCrouching: true, bowDrawn: true },
  { bowZoomHeld: true, equippedTool: 'bow', cameraPerspective: 'third_person' },
  { swordSwingProgress: 0.4, swordComboIndex: 1, equippedTool: 'sword' },
  { dashTimer: 0.2, walkPace: 'fast', vx: 6 },
  { isFlying: true },
  { walkPace: 'relaxed', vx: 1, swordBlockProgress: 0.6 },
];
// #endregion

// ======================== GOLDEN TRACE ======================== \\
// #region Golden Trace
test('stepCameraRig_WhenRunAcrossViewModes_ShouldMatchGolden', () => {
  // Arrange
  const rig = createCameraRigState();
  const pose = createCameraPose();
  const base = createInitialPlayerState();
  const trace: unknown[] = [];
  let fov = 68;

  // Act
  for (const isSleepingInBed of [false, true]) {
    for (const [variantIndex, variant] of VIEW_VARIANTS.entries()) {
      for (let frame = 0; frame < 40; frame++) {
        const player: IPlayerState = {
          ...base, ...variant, bobPhase: frame * 0.3, bobAmount: 0.7, pitch: 0.2 + frame * 0.01, yaw: frame * 0.05, x: 3 + frame * 0.1,
        };
        const dt = 1 / 60 + (frame % 3) * 0.004;
        stepCameraRig(rig, { player, dt, elapsedSeconds: frame * 0.1, landingDip: (frame % 5) * 0.02, isSleepingInBed }, pose);
        const eased = easeFovToward(fov, computeTargetFov(rig, player), dt);
        if (eased !== null) fov = eased;
        if (frame % 8 === 7) trace.push({ isSleepingInBed, variantIndex, frame, pose: { ...pose }, rig: { ...rig }, fov });
      }
    }
  }
  writeTitleOrbitPose(12.3, pose);
  trace.push({ titleOrbit: { ...pose } });

  // Assert
  assertMatchesGolden(new URL('./__golden__/camera-rig.json', import.meta.url), trace);
});
// #endregion

// ======================== BEHAVIOR TESTS ======================== \\
// #region Behavior Tests
test('stepCameraRig_WhenThirdPersonLooksSteeplyUp_ShouldStayAboveGround', () => {
  // Arrange
  const rig = createCameraRigState();
  const pose = createCameraPose();
  const player: IPlayerState = { ...createInitialPlayerState(), cameraPerspective: 'third_person', pitch: 1.4 };

  // Act
  stepCameraRig(rig, { player, dt: 1 / 60, elapsedSeconds: 0, landingDip: 0, isSleepingInBed: false }, pose);

  // Assert
  assert.equal(pose.mode, 'lookAt');
  assert.ok(pose.y >= walkableHeightAt(pose.x, pose.z, player.y).height + 0.45 - 1e-9);
});

test('easeFovToward_WhenWithinDeadZone_ShouldReturnNull', () => {
  // Arrange & Act
  const result = easeFovToward(68, 68.04, 1 / 60);

  // Assert
  assert.equal(result, null);
});

test('computeTargetFov_WhenDashingWhileDrawingBow_ShouldCombineBoostAndZoom', () => {
  // Arrange
  const rig = { smoothAimZoom: 1, smoothRightClickZoom: 0, smoothCrouchOffset: 0, wallScale: 1 };
  const player: IPlayerState = { ...createInitialPlayerState(), dashTimer: 0.1, vx: 0, vz: 0 };

  // Act
  const fov = computeTargetFov(rig, player);

  // Assert
  assert.equal(fov, 68 + 6.5 - 6.5);
});
// #endregion
