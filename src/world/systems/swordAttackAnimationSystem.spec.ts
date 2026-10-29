// ============================================================================
// MODULE: World / Systems / Sword Attack Animation System Tests
// DESIGN: Unit test suite for 5-phase first-person attack kinematics (AAA)
// SUMMARY: Verifies phase classification, strike window timing, and procedural arm/sword poses.
// ============================================================================

// ======================== IMPORTS AND TEST DEPENDENCIES ======================== \\
// #region Imports and Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySwordAttackPhase,
  computeFirstPersonSwordAttackPose,
  SWORD_ACTIVE_STRIKE_WINDOW_START,
  SWORD_ACTIVE_STRIKE_WINDOW_END,
} from './swordAttackAnimationSystem';
// #endregion

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
  const poseResult = computeFirstPersonSwordAttackPose({
    swingProgress,
    comboIndex: 1,
    isHeavy: false,
    chargeProgress: 0,
    blockProgress: 0,
    swayX: 0,
    swayY: 0,
    breathY: 0,
    sprintCarry: 0,
  });

  // Assert
  assert.equal(poseResult.phase, 'strike');
  assert.equal(poseResult.isInActiveStrikeWindow, true, 'Strike apex should activate strike window');
  assert.ok(Number.isFinite(poseResult.rightArm.wristX), 'Arm position should reflect forward strike kinematics');
  assert.ok(Number.isFinite(poseResult.swordGrip.posY), 'Sword position should follow grip');
});
// #endregion

// ======================== GUARD CLAUSE AND VALIDATION TESTS ======================== \\
// #region Guard Clause and Validation Tests
test('classifySwordAttackPhase_WhenProgressOutsideActiveWindow_ShouldDeactivateDamageHit', () => {
  // Arrange
  const windupProgress = SWORD_ACTIVE_STRIKE_WINDOW_START - 0.05;
  const followThroughProgress = SWORD_ACTIVE_STRIKE_WINDOW_END + 0.05;

  // Act
  const windupPose = computeFirstPersonSwordAttackPose({
    swingProgress: windupProgress,
    comboIndex: 0,
    isHeavy: false,
    chargeProgress: 0,
    blockProgress: 0,
    swayX: 0,
    swayY: 0,
    breathY: 0,
    sprintCarry: 0,
  });

  const followPose = computeFirstPersonSwordAttackPose({
    swingProgress: followThroughProgress,
    comboIndex: 0,
    isHeavy: false,
    chargeProgress: 0,
    blockProgress: 0,
    swayX: 0,
    swayY: 0,
    breathY: 0,
    sprintCarry: 0,
  });

  // Assert
  assert.equal(windupPose.isInActiveStrikeWindow, false, 'Damage window must be false in windup');
  assert.equal(followPose.isInActiveStrikeWindow, false, 'Damage window must be false after strike window');
});
// #endregion

// ======================== EDGE CASES AND INFRASTRUCTURE FAILURES ======================== \\
// #region Edge Cases and Infrastructure Failures
test('computeFirstPersonSwordAttackPose_WhenProgressZeroOrNegative_ShouldReturnNeutralReadyPose', () => {
  // Arrange
  const neutralInput = {
    swingProgress: 0,
    comboIndex: 0,
    isHeavy: false,
    chargeProgress: 0,
    blockProgress: 0,
    swayX: 0,
    swayY: 0,
    breathY: 0,
    sprintCarry: 0,
  };
  // Act
  const neutralPose = computeFirstPersonSwordAttackPose(neutralInput);

  // Assert
  assert.equal(neutralPose.phase, 'ready');
  assert.equal(neutralPose.isInActiveStrikeWindow, false);
});
// #endregion
