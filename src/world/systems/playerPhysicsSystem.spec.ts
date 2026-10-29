// ============================================================================
// MODULE: World / Systems / PlayerPhysicsSystem Tests
// DESIGN: Unit test suite for player movement physics, swimming, and locomotion (AAA)
// SUMMARY: Verifies player kinematics, jumping impulse, swimming buoyancy, and flight mode.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialPlayerState,
  stepPlayerPhysics,
} from './playerPhysicsSystem';
import type { IPlayerInput, IRideableHorseState } from '../domain/worldTypes';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Test Fixtures & Factories
function createDefaultPlayerInput(overrides: Partial<IPlayerInput> = {}): IPlayerInput {
  return {
    forward: 0,
    right: 0,
    sprint: false,
    relaxed: false,
    jumpPressed: false,
    jumpHeld: false,
    lookYawDelta: 0,
    lookPitchDelta: 0,
    ...overrides,
  };
}
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('stepPlayerPhysics_WhenWalkingForward_ShouldAdvanceDistanceAndPosition', () => {
  // Arrange
  const state = createInitialPlayerState();
  const input = createDefaultPlayerInput({ forward: 1, sprint: true });
  const initialDistance = state.distanceWalked;

  // Act
  stepPlayerPhysics(state, input, [], 0.05);

  // Assert
  assert.ok(state.distanceWalked > initialDistance);
});

test('stepPlayerPhysics_WhenJumpingFromGround_ShouldApplyUpwardVelocity', () => {
  // Arrange
  const state = createInitialPlayerState();
  state.onGround = true;
  state.coyoteTimer = 0.1;
  state.vy = 0;
  const input = createDefaultPlayerInput({ jumpPressed: true, jumpHeld: true });

  // Act
  stepPlayerPhysics(state, input, [], 0.016);

  // Assert
  assert.ok(state.vy > 3.0, `Expected vertical velocity to be positive upon jump, got ${state.vy}`);
  assert.equal(state.onGround, false);
});

test('stepPlayerPhysics_WhenInDeepWater_ShouldEngageSwimmingAndBuoyancy', () => {
  // Arrange: Central lake deep basin coordinates
  const state = createInitialPlayerState();
  state.x = -2.0;
  state.z = 1.5;
  state.y = -1.2;
  const input = createDefaultPlayerInput({ forward: 1 });

  // Act
  stepPlayerPhysics(state, input, [], 0.05);

  // Assert
  assert.equal(state.isSwimming, true);
  assert.equal(state.inWater, true);
  assert.ok(state.vy > -1.0, 'Hydrodynamic buoyancy should counteract freefall gravity');
});

test('stepPlayerPhysics_WhenFlightToggled_ShouldActivateFlyingAndDisableGravity', () => {
  // Arrange
  const state = createInitialPlayerState();
  state.isFlying = false;
  const input = createDefaultPlayerInput({ toggleFlyRequested: true });

  // Act
  stepPlayerPhysics(state, input, [], 0.016);

  // Assert
  assert.equal(state.isFlying, true);
  assert.ok(state.vy > 0, 'Flying activation applies upward lift impulse');
});

test('stepPlayerPhysics_WhenNearHorseAndMountRequested_ShouldMountHorse', () => {
  // Arrange
  const state = createInitialPlayerState();
  const horses: IRideableHorseState[] = [
    {
      id: 'horse_1',
      name: 'סוס',
      x: state.x + 0.5,
      y: state.y,
      z: state.z + 0.5,
      yaw: 0,
      speed: 0,
      gaitPhase: 0,
    },
  ];
  const input = createDefaultPlayerInput({ toggleMountHorseRequested: true });

  // Act
  stepPlayerPhysics(state, input, [], 0.016, undefined, horses);

  // Assert
  assert.equal(state.mountedHorseId, 'horse_1');
  assert.equal(state.vx, 0);
  assert.equal(state.vz, 0);
});

test('stepPlayerPhysics_WhenDoubleSpaceTogglesFlightDuringWalkOrHorseJump_ShouldCancelWalkAnimationsAndDropHorseToGround', () => {
  // Arrange: Player is mounted on a horse in mid-air with active walk bobPhase/bobAmount
  const state = createInitialPlayerState();
  state.x = 12.0;
  state.z = 22.0;
  state.y = 8.5; // High in the air after jumping on horse
  state.vy = 2.0;
  state.bobPhase = 4.2;
  state.bobAmount = 0.95;
  state.mountedHorseId = 'horse_1';

  const horses: IRideableHorseState[] = [
    {
      id: 'horse_1',
      name: 'סוס',
      x: 12.0,
      y: 8.5,
      z: 22.0,
      yaw: 0,
      speed: 7.5,
      gaitPhase: 4.2,
    },
  ];

  // Act 1: Trigger double-space (toggleFlyRequested)
  stepPlayerPhysics(
    state,
    createDefaultPlayerInput({ toggleFlyRequested: true, forward: 1 }),
    [],
    0.05,
    undefined,
    horses
  );

  // Assert 1: Player enters flight with all walking animations cancelled, and dismounts horse
  assert.equal(state.isFlying, true);
  assert.equal(state.mountedHorseId, null);
  assert.equal(state.bobAmount, 0);
  assert.equal(state.bobPhase, 0);

  // Act 2: Step several frames while player is flying so the dismounted horse falls back to ground
  for (let i = 0; i < 40; i++) {
    stepPlayerPhysics(
      state,
      createDefaultPlayerInput({ forward: 1 }),
      [],
      0.05,
      undefined,
      horses
    );
  }

  // Assert 2: While flying, walking bob remains 0 and the unmounted horse has fallen back to ground level (< 3.0m)
  assert.equal(state.bobAmount, 0);
  assert.equal(state.bobPhase, 0);
  assert.ok(
    horses[0].y < 3.0,
    `Expected unmounted horse to fall back to ground from 8.5m, got y=${horses[0].y}`
  );
  assert.equal(horses[0].vy, 0);
});
// #endregion
