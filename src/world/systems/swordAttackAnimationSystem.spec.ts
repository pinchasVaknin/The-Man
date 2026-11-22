// ============================================================================
// MODULE: World / Systems / Sword Attack Animation System Tests
// DESIGN: Unit test suite for forward-cut first-person sword kinematics (AAA)
// SUMMARY: Verifies phase classification, -Z forward translation, crosshair impact,
//          fast ease-in curve, quaternion rotation bounds, and 0.05s impact hold.
// ============================================================================

// ======================== IMPORTS AND TEST DEPENDENCIES ======================== \\
// #region Imports and Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  classifySwordAttackPhase,
  computeFirstPersonSwordAttackPose,
  SWORD_ACTIVE_STRIKE_WINDOW_START,
  SWORD_ACTIVE_STRIKE_WINDOW_END,
  SWORD_PHASE_WINDUP_END,
  SWORD_PHASE_STRIKE_END,
  SWORD_SWING_KEYFRAMES,
} from './swordAttackAnimationSystem';
import { createInitialPlayerState } from './playerPhysicsSystem';
import { stepSwordSwingCombat, triggerSwordSlash } from './combatAndInventorySystem';
// #endregion

function samplePose(swingProgress: number, comboIndex = 0, isHeavy = false) {
  return computeFirstPersonSwordAttackPose({
    swingProgress,
    comboIndex,
    isHeavy,
    chargeProgress: 0,
    blockProgress: 0,
    swayX: 0,
    swayY: 0,
    breathY: 0,
    sprintCarry: 0,
  });
}

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('classifySwordAttackPhase_WhenProgressIncreases_ShouldSequentiallyTransitionPhases', () => {
  // Arrange
  const pReady = 0;
  const pWindup = 0.12;
  const pStrike = 0.35;
  const pFollow = 0.65;
  const pRecover = 0.85;
  // Act
  const readyPhase = classifySwordAttackPhase(pReady).phase;
  const windupPhase = classifySwordAttackPhase(pWindup).phase;
  const strikePhase = classifySwordAttackPhase(pStrike).phase;
  const followThroughPhase = classifySwordAttackPhase(pFollow).phase;
  const recoveryPhase = classifySwordAttackPhase(pRecover).phase;

  // Assert
  assert.equal(readyPhase, 'ready');
  assert.equal(windupPhase, 'windup');
  assert.equal(strikePhase, 'strike');
  assert.equal(followThroughPhase, 'follow_through');
  assert.equal(recoveryPhase, 'recovery');
});

test('computeFirstPersonSwordAttackPose_WhenAttacking_ShouldCalculateTransformsAndRibbonPose', () => {
  // Arrange
  const swingProgress = 0.35; // Inside active strike window

  // Act
  const poseResult = samplePose(swingProgress, 1, false);

  // Assert
  assert.equal(poseResult.phase, 'strike');
  assert.equal(poseResult.isInActiveStrikeWindow, true, 'Strike apex should activate strike window');
  assert.ok(Number.isFinite(poseResult.rightArm.wristX), 'Arm position should reflect forward strike kinematics');
  assert.ok(Number.isFinite(poseResult.swordGrip.posY), 'Sword position should follow grip');
});

test('computeFirstPersonSwordAttackPose_WhenCombo0Executes_ShouldChamberInVShapeAndUnfoldThroughCrosshair', () => {
  // Arrange
  const pWindup = SWORD_PHASE_WINDUP_END;
  const pImpact =
    SWORD_PHASE_WINDUP_END +
    SWORD_SWING_KEYFRAMES.timing.impactFractionInStrike *
      (SWORD_PHASE_STRIKE_END - SWORD_PHASE_WINDUP_END);
  const pStrikeEnd = SWORD_PHASE_STRIKE_END;

  // Act
  const windup = samplePose(pWindup, 0, false);
  const impact = samplePose(pImpact, 0, false);
  const endStrike = samplePose(pStrikeEnd, 0, false);

  // Assert: Upper arm & forearm fold into a bent V in wind-up (wrist above elbow, bend < 95 deg),
  // lifting the blade tip up and right outside top-right view before unfolding in the cut
  const bendAngle = (arm: typeof windup.rightArm) => {
    const ux = arm.shoulderX - arm.elbowX;
    const uy = arm.shoulderY - arm.elbowY;
    const uz = arm.shoulderZ - arm.elbowZ;
    const fx = arm.wristX - arm.elbowX;
    const fy = arm.wristY - arm.elbowY;
    const fz = arm.wristZ - arm.elbowZ;
    const cos =
      (ux * fx + uy * fy + uz * fz) /
      (Math.hypot(ux, uy, uz) * Math.hypot(fx, fy, fz));
    return THREE.MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, cos))));
  };

  assert.ok(windup.rightArm.wristY > windup.rightArm.elbowY, 'Wind-up forearm should rise into V shape');
  assert.ok(bendAngle(windup.rightArm) < 95, `Expected tight V bend in windup, got ${bendAngle(windup.rightArm).toFixed(1)}`);
  assert.ok(bendAngle(endStrike.rightArm) > 135, `Expected unfolded arm at endStrike, got ${bendAngle(endStrike.rightArm).toFixed(1)}`);
  assert.ok(windup.swordTipCamera.x > 0.55 && windup.swordTipCamera.y > 0.55, 'Tip should pull up-right outside view during V-windup');

  // Assert: Blade tip cuts through crosshair at impact (~58% strike) then slices lower-left
  assert.ok(
    Math.abs(impact.swordTipCamera.x) < 0.025 && Math.abs(impact.swordTipCamera.y) < 0.025,
    `Expected blade tip at crosshair at impact, got (${impact.swordTipCamera.x}, ${impact.swordTipCamera.y})`
  );
  assert.ok(endStrike.swordTipCamera.x < -0.45 && endStrike.swordTipCamera.y < -0.35);

  // Assert: Both upper arm (~0.31m) and forearm (0.34m) stay strictly anatomical
  const upperLen = Math.hypot(
    impact.rightArm.elbowX - impact.rightArm.shoulderX,
    impact.rightArm.elbowY - impact.rightArm.shoulderY,
    impact.rightArm.elbowZ - impact.rightArm.shoulderZ
  );
  const foreLen = Math.hypot(
    impact.rightArm.wristX - impact.rightArm.elbowX,
    impact.rightArm.wristY - impact.rightArm.elbowY,
    impact.rightArm.wristZ - impact.rightArm.elbowZ
  );
  assert.ok(Math.abs(upperLen - 0.31) < 1e-3, `Expected 0.31m upper arm, got ${upperLen}`);
  assert.ok(Math.abs(foreLen - 0.34) < 1e-3, `Expected 0.34m forearm, got ${foreLen}`);
});

test('computeFirstPersonSwordAttackPose_WhenCombo1RightSlashExecutes_ShouldChamberRightAndSweepLeft', () => {
  // Arrange & Act
  const windup = samplePose(SWORD_PHASE_WINDUP_END, 1, false);
  const endStrike = samplePose(SWORD_PHASE_STRIKE_END, 1, false);

  // Assert: Draws sword out to the right, then sweeps across left
  assert.ok(windup.rightArm.wristX > 0.35 && windup.swordTipCamera.x > 0.80);
  assert.ok(endStrike.rightArm.wristX < -0.10 && endStrike.swordTipCamera.x < -0.60);
});

test('computeFirstPersonSwordAttackPose_WhenCombo2ThrustExecutes_ShouldStabStraightForwardThroughCrosshair', () => {
  // Arrange
  const pWindup = SWORD_PHASE_WINDUP_END;
  const pImpact =
    SWORD_PHASE_WINDUP_END +
    SWORD_SWING_KEYFRAMES.timing.impactFractionInStrike *
      (SWORD_PHASE_STRIKE_END - SWORD_PHASE_WINDUP_END);
  const pEnd = SWORD_PHASE_STRIKE_END;

  // Act
  const windup = samplePose(pWindup, 2, false);
  const impact = samplePose(pImpact, 2, false);
  const endStrike = samplePose(pEnd, 2, false);

  // Assert: Blade aims forward and punches straight into center target with minimal rotation
  const deltaZ = endStrike.rightArm.wristZ - windup.rightArm.wristZ;
  assert.ok(deltaZ <= -0.48, `Expected thrust forward -Z travel >= 0.48m, got ${-deltaZ}`);
  assert.ok(Math.abs(impact.swordTipCamera.x) < 0.025 && Math.abs(impact.swordTipCamera.y) < 0.025);
  assert.ok(Math.abs(endStrike.swordTipCamera.x) < 0.04 && Math.abs(endStrike.swordTipCamera.y) < 0.04);

  const qW = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(windup.rightArm.handRx, windup.rightArm.handRy, windup.rightArm.handRz, 'YXZ')
  );
  const qE = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(endStrike.rightArm.handRx, endStrike.rightArm.handRy, endStrike.rightArm.handRz, 'YXZ')
  );
  assert.ok(THREE.MathUtils.radToDeg(qW.angleTo(qE)) < 20, 'Thrust blade should stay straight on target line');
});

test('computeFirstPersonSwordAttackPose_WhenSwinging_ShouldCounterbalanceWithLeftHand', () => {
  // Arrange & Act
  const windup = samplePose(SWORD_PHASE_WINDUP_END, 0, false);
  const follow = samplePose(SWORD_PHASE_STRIKE_END, 0, false);

  // Assert: Left hand actively balances (forward in windup, pulls back-left during follow-through)
  const leftTravel = Math.hypot(
    follow.leftArm.wristX - windup.leftArm.wristX,
    follow.leftArm.wristY - windup.leftArm.wristY,
    follow.leftArm.wristZ - windup.leftArm.wristZ
  );
  assert.ok(leftTravel > 0.20, `Expected active left-hand counterbalance travel > 0.20m, got ${leftTravel}`);
  assert.ok(windup.leftArm.wristZ < follow.leftArm.wristZ, 'Left hand should brace forward in windup and pull back on strike');
});

test('computeFirstPersonSwordAttackPose_WhenStruckWithFastEaseIn_ShouldPeakVelocityAtImpact', () => {
  // Arrange
  const strikeSpan = SWORD_PHASE_STRIKE_END - SWORD_PHASE_WINDUP_END;
  const p0 = SWORD_PHASE_WINDUP_END;
  const pEarly = SWORD_PHASE_WINDUP_END + 0.18 * strikeSpan;
  const pBeforeImpact = SWORD_PHASE_WINDUP_END + 0.40 * strikeSpan;
  const pImpact = SWORD_PHASE_WINDUP_END + 0.58 * strikeSpan;

  // Act
  const earlyDist = Math.hypot(
    samplePose(pEarly).rightArm.wristX - samplePose(p0).rightArm.wristX,
    samplePose(pEarly).rightArm.wristY - samplePose(p0).rightArm.wristY,
    samplePose(pEarly).rightArm.wristZ - samplePose(p0).rightArm.wristZ
  );
  const impactDist = Math.hypot(
    samplePose(pImpact).rightArm.wristX - samplePose(pBeforeImpact).rightArm.wristX,
    samplePose(pImpact).rightArm.wristY - samplePose(pBeforeImpact).rightArm.wristY,
    samplePose(pImpact).rightArm.wristZ - samplePose(pBeforeImpact).rightArm.wristZ
  );

  // Assert
  assert.ok(
    impactDist > earlyDist * 1.35,
    `Expected fast ease-in peak speed near impact (${impactDist.toFixed(4)} vs early ${earlyDist.toFixed(4)})`
  );
});

test('stepSwordSwingCombat_WhenImpactApexReached_ShouldHoldAtImpactForFiftyMilliseconds', () => {
  // Arrange
  const player = createInitialPlayerState();
  triggerSwordSlash(player, [], false, true);

  // Act: Advance until impact apex triggers hold
  let holdStartedProgress = 0;
  for (let i = 0; i < 30; i++) {
    stepSwordSwingCombat(player, [], 0.01);
    if (!player.swordStrikePending) {
      holdStartedProgress = player.swordSwingProgress ?? 0;
      break;
    }
  }

  // Step 0.04s (< 0.05s hold duration): progress must stay paused at impact
  stepSwordSwingCombat(player, [], 0.04);
  const progressDuringHold = player.swordSwingProgress ?? 0;

  // Step another 0.03s (total 0.07s > 0.05s hold): swing resumes follow-through
  stepSwordSwingCombat(player, [], 0.03);
  const progressAfterHold = player.swordSwingProgress ?? 0;

  // Assert
  assert.ok(holdStartedProgress > 0, 'Expected impact apex to resolve');
  assert.equal(progressDuringHold, holdStartedProgress, 'Expected 0.05s hold at impact point');
  assert.ok(progressAfterHold > holdStartedProgress, 'Expected swing to resume after 0.05s hold');
});
// #endregion

// ======================== GUARD CLAUSE AND VALIDATION TESTS ======================== \\
// #region Guard Clause and Validation Tests
test('classifySwordAttackPhase_WhenProgressOutsideActiveWindow_ShouldDeactivateDamageHit', () => {
  // Arrange
  const windupProgress = SWORD_ACTIVE_STRIKE_WINDOW_START - 0.05;
  const followThroughProgress = SWORD_ACTIVE_STRIKE_WINDOW_END + 0.05;

  // Act
  const windupPose = samplePose(windupProgress, 0, false);
  const followPose = samplePose(followThroughProgress, 0, false);

  // Assert
  assert.equal(windupPose.isInActiveStrikeWindow, false, 'Damage window must be false in windup');
  assert.equal(followPose.isInActiveStrikeWindow, false, 'Damage window must be false after strike window');
});
// #endregion

// ======================== EDGE CASES AND INFRASTRUCTURE FAILURES ======================== \\
// #region Edge Cases and Infrastructure Failures
test('computeFirstPersonSwordAttackPose_WhenProgressZeroOrNegative_ShouldReturnNeutralReadyPose', () => {
  // Arrange
  const neutralPose = samplePose(0, 0, false);

  // Assert
  assert.equal(neutralPose.phase, 'ready');
  assert.equal(neutralPose.isInActiveStrikeWindow, false);
});
// #endregion

