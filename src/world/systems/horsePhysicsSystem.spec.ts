// ============================================================================
// MODULE: World / Systems / HorsePhysicsSystem Tests
// DESIGN: Unit test suite for horse steering physics and biomechanical gait kinematics (AAA)
// SUMMARY: Verifies turn resistance, turning radius, rider synchronization, and pose calculations.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHorseTurnResistance,
  stepMountedHorseSteering,
  computeHorseBiomechanicalPose,
} from './horsePhysicsSystem';
import type { IRideableHorseState } from '../domain/worldTypes';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Test Fixtures & Factories
function createFixtureHorse(initialYaw = 0): IRideableHorseState {
  return {
    id: 'test_horse_1',
    name: 'סוס מבחן',
    x: 0,
    y: 0,
    z: 0,
    yaw: initialYaw,
    speed: 0,
    gaitPhase: 0,
  };
}
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('computeHorseTurnResistance_WhenHorseIsStationary_ShouldReturnFullTurnRateAndZeroTurningRadius', () => {
  // Arrange
  const stationarySpeed = 0;

  // Act
  const sut = computeHorseTurnResistance(stationarySpeed);

  // Assert
  assert.equal(sut.resistanceFactor, 1.0);
  assert.ok(sut.effectiveTurnRate > 2.0);
  assert.equal(sut.turningRadiusMeters, 0);
});

test('computeHorseTurnResistance_WhenHorseAtGallopSpeed_ShouldIncreaseResistanceAndExpandTurningRadius', () => {
  // Arrange
  const gallopSpeed = 12.0;

  // Act
  const sut = computeHorseTurnResistance(gallopSpeed);

  // Assert
  assert.ok(sut.resistanceFactor < 0.5, 'Expected high resistance factor under 0.5 at gallop');
  assert.ok(sut.turningRadiusMeters > 5.0, 'Expected turning radius to expand at high speed');
});

test('stepMountedHorseSteering_WhenSteeringRight_ShouldRotateHorseAndRiderTogether', () => {
  // Arrange
  const horse = createFixtureHorse(0);
  const initialRiderYaw = 0;
  const forwardInput = 1.0;
  const steerRightInput = 1.0;
  const speed = 4.0;
  const dt = 0.1;

  // Act
  const result = stepMountedHorseSteering(horse, initialRiderYaw, forwardInput, steerRightInput, speed, dt);

  // Assert
  assert.ok(result.deltaHorseYaw < 0, 'Steering right should produce negative yaw delta');
  assert.equal(result.newHorseYaw, horse.yaw);
  assert.equal(result.newRiderYaw, result.newHorseYaw);
});

test('computeHorseBiomechanicalPose_WhenIdle_ShouldReturnIdleGaitPose', () => {
  // Arrange
  const speed = 0.05;
  const gaitPhase = 0;
  const elapsedTime = 1.0;

  // Act
  const pose = computeHorseBiomechanicalPose(speed, gaitPhase, elapsedTime);

  // Assert
  assert.equal(pose.gaitKind, 'idle');
  assert.ok(Math.abs(pose.bodyPitch) < 0.05);
});

test('computeHorseBiomechanicalPose_WhenGalloping_ShouldReturnGallopGaitPose', () => {
  // Arrange
  const speed = 10.5;
  const gaitPhase = 1.5;
  const elapsedTime = 2.0;

  // Act
  const pose = computeHorseBiomechanicalPose(speed, gaitPhase, elapsedTime);

  // Assert
  assert.equal(pose.gaitKind, 'gallop');
  assert.ok(pose.frontLeft !== undefined);
  assert.ok(pose.backRight !== undefined);
});
// #endregion

// ======================== GUARD CLAUSE & VALIDATION TESTS ======================== \\
// #region Guard Clause & Validation Tests
test('stepMountedHorseSteering_WhenRiderLooksBeyondLimit_ShouldClampRiderYawToMaxAngle', () => {
  // Arrange
  const horse = createFixtureHorse(0);
  const initialRiderYaw = Math.PI; // 180 degrees relative look
  const forwardInput = 1.0;
  const steerRightInput = 0; // No steering
  const speed = 5.0;
  const dt = 0.016;

  // Act
  const result = stepMountedHorseSteering(horse, initialRiderYaw, forwardInput, steerRightInput, speed, dt);

  // Assert
  const maxAllowedAngle = (115 * Math.PI) / 180;
  assert.ok(Math.abs(result.newRiderYaw - horse.yaw) <= maxAllowedAngle + 0.001);
});
// #endregion
