// ============================================================================
// MODULE: World / Controllers / Movement Intent Tests
// DESIGN: AAA unit tests for keyboard and joystick movement axes
// SUMMARY: Verifies bound keys, the arrow-key fallback, joystick blending and the
//          modal lock.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMovementAxes, type IMovementAxes } from './movementIntent';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
const BINDINGS = { moveForward: 'KeyI', moveBackward: 'KeyK', moveLeft: 'KeyJ', moveRight: 'KeyL' };
const NO_JOYSTICK: IMovementAxes = { forward: 0, right: 0 };
// #endregion

// ======================== TESTS ======================== \\
// #region Tests
test('readMovementAxes_WhenReboundKeysHeld_ShouldUseBindings', () => {
  // Arrange
  const out = { forward: 0, right: 0 };

  // Act
  readMovementAxes(new Set(['KeyI', 'KeyL']), BINDINGS, NO_JOYSTICK, false, out);

  // Assert
  assert.deepEqual(out, { forward: 1, right: 1 });
});

test('readMovementAxes_WhenArrowKeysHeld_ShouldStillMove', () => {
  // Arrange
  const out = { forward: 0, right: 0 };

  // Act
  readMovementAxes(new Set(['ArrowDown', 'ArrowLeft']), BINDINGS, NO_JOYSTICK, false, out);

  // Assert
  assert.deepEqual(out, { forward: -1, right: -1 });
});

test('readMovementAxes_WhenModalOpen_ShouldKeepOnlyJoystick', () => {
  // Arrange
  const out = { forward: 0, right: 0 };

  // Act
  readMovementAxes(new Set(['KeyI']), BINDINGS, { forward: 0.5, right: -0.25 }, true, out);

  // Assert
  assert.deepEqual(out, { forward: 0.5, right: -0.25 });
});

test('readMovementAxes_WhenJoystickAndKeyCombine_ShouldAdd', () => {
  // Arrange
  const out = { forward: 0, right: 0 };

  // Act
  readMovementAxes(new Set(['KeyI']), BINDINGS, { forward: 0.5, right: 0 }, false, out);

  // Assert
  assert.deepEqual(out, { forward: 1.5, right: 0 });
});
// #endregion
