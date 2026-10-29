// ============================================================================
// MODULE: Test / Window Debug Controller Specification
// DESIGN: Unit verification for deterministic window inspection bridge & input validation (AAA)
// SUMMARY: Validates teleportation bounds, NaN rejection, weather controls, and cleanup.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  registerWindowDebugBridge,
  type IWindowDebugBridgeDeps,
} from './windowDebugController';
import { createInitialPlayerState } from '../systems/playerPhysicsSystem';
import { NatureSoundEngine } from '../soundEngine';
import { PLAYABLE_RADIUS } from '../../core/config';
import { computeDynamicSolarCycle, computeWeatherState } from '../systems/atmosphereAndWeatherSystem';
import type { WeatherToggleOption, WeatherCycleMode } from '../domain/worldTypes';

// ======================== TEST SETUP FIXTURES ======================== \\
// #region Test Setup Fixtures
function createTestBridgeDeps(): {
  deps: IWindowDebugBridgeDeps;
  state: ReturnType<typeof createInitialPlayerState>;
  weatherToggle: { current: WeatherToggleOption };
  appliedHours: { value: number };
  mockWindow: Record<string, any>;
} {
  const state = createInitialPlayerState();
  const weatherToggle = { current: 'auto' as WeatherToggleOption };
  const appliedHours = { value: 12.0 };
  const mockWindow: Record<string, any> = {};

  const deps: IWindowDebugBridgeDeps = {
    targetWindow: mockWindow,
    playerState: state,
    obstacles: [],
    rideableHorses: [],
    activeArrows: [],
    openDoorIds: new Set<string>(),
    camera: new THREE.PerspectiveCamera(),
    soundEngine: new NatureSoundEngine(),
    gameStateRef: { current: 'playing' },
    weatherToggleRef: weatherToggle,
    setActiveWeatherMode: (_mode: WeatherCycleMode) => {},
    setSmoothAimZoom: (_val: number) => {},
    setSmoothRightClickZoom: (_val: number) => {},
    fireArrowNow: (_power: number) => null,
    executeSwordSlash: (_isHeavy?: boolean) => null,
    getWorldHours: () => appliedHours.value,
    setWorldHoursAndApply: (hours: number) => {
      appliedHours.value = hours;
      return hours;
    },
    getCurrentAtmo: () => computeDynamicSolarCycle(appliedHours.value),
    getCurrentWeather: () => computeWeatherState(0, state.x, state.z),
  };

  return { deps, state, weatherToggle, appliedHours, mockWindow };
}
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
test('teleportPlayer_WhenValidCoordinatesProvided_ShouldUpdatePlayerPositionAndResetVelocities', () => {
  // Arrange
  const { deps, state, mockWindow } = createTestBridgeDeps();
  const cleanup = registerWindowDebugBridge(deps);

  try {
    // Act
    const res = mockWindow.teleportPlayer(150, -220, 1.57);

    // Assert
    assert.equal(res, true);
    assert.equal(state.x, 150);
    assert.equal(state.z, -220);
    assert.equal(state.yaw, 1.57);
    assert.equal(state.vx, 0);
    assert.equal(state.vy, 0);
    assert.equal(state.vz, 0);
  } finally {
    cleanup();
  }
});

test('setWorldHours_WhenValidHourInRange_ShouldUpdateHours', () => {
  // Arrange
  const { deps, appliedHours, mockWindow } = createTestBridgeDeps();
  const cleanup = registerWindowDebugBridge(deps);

  try {
    // Act
    const res = mockWindow.setWorldHours(18.5);

    // Assert
    assert.equal(res, 18.5);
    assert.equal(appliedHours.value, 18.5);
  } finally {
    cleanup();
  }
});

test('drawBow_WhenProgressProvided_ShouldClampToZeroOneRange', () => {
  // Arrange
  const { deps, state, mockWindow } = createTestBridgeDeps();
  const cleanup = registerWindowDebugBridge(deps);

  try {
    // Act
    const res = mockWindow.drawBow(0.75);

    // Assert
    assert.equal(res, 0.75);
    assert.equal(state.bowDrawn, true);
    assert.equal(state.bowDrawProgress, 0.75);
    assert.equal(state.equippedTool, 'bow');
  } finally {
    cleanup();
  }
});
// #endregion

// ======================== INPUT VALIDATION & GUARD CLAUSE TESTS ======================== \\
// #region Input Validation & Guard Clause Tests
test('teleportPlayer_WhenNanOrInfinityProvided_ShouldRejectWithoutModifyingPosition', () => {
  // Arrange
  const { deps, state, mockWindow } = createTestBridgeDeps();
  state.x = 42;
  state.z = 84;
  const cleanup = registerWindowDebugBridge(deps);

  try {
    // Act
    const resNan = mockWindow.teleportPlayer(NaN, 100);
    const resInf = mockWindow.teleportPlayer(100, Infinity);

    // Assert
    assert.equal(resNan, false);
    assert.equal(resInf, false);
    assert.equal(state.x, 42);
    assert.equal(state.z, 84);
  } finally {
    cleanup();
  }
});

test('teleportPlayer_WhenCoordinatesExceedPlayableRadius_ShouldClampToRadius', () => {
  // Arrange
  const { deps, state, mockWindow } = createTestBridgeDeps();
  const cleanup = registerWindowDebugBridge(deps);

  try {
    // Act
    const res = mockWindow.teleportPlayer(2500, -3000);

    // Assert
    assert.equal(res, true);
    assert.equal(state.x, PLAYABLE_RADIUS);
    assert.equal(state.z, -PLAYABLE_RADIUS);
  } finally {
    cleanup();
  }
});

test('setWorldHours_WhenOutOfRangeOrNan_ShouldClampOrFallbackSafely', () => {
  // Arrange
  const { deps, appliedHours, mockWindow } = createTestBridgeDeps();
  const cleanup = registerWindowDebugBridge(deps);

  try {
    // Act
    const high = mockWindow.setWorldHours(48);
    const low = mockWindow.setWorldHours(-10);
    appliedHours.value = 14;
    const nanRes = mockWindow.setWorldHours(NaN);

    // Assert
    assert.equal(high, 24);
    assert.equal(appliedHours.value, 14);
    assert.equal(low, 0);
    assert.equal(nanRes, 14);
  } finally {
    cleanup();
  }
});

test('setWeatherOverride_WhenInvalidOptionProvided_ShouldRejectWithoutMutatingState', () => {
  // Arrange
  const { deps, weatherToggle, mockWindow } = createTestBridgeDeps();
  weatherToggle.current = 'auto';
  const cleanup = registerWindowDebugBridge(deps);

  try {
    // Act
    const invalidRes = mockWindow.setWeatherOverride('apocalypse_tornado');

    // Assert
    assert.equal(invalidRes, false);
    assert.equal(weatherToggle.current, 'auto');

    // Act 2: Valid option succeeds
    const validRes = mockWindow.setWeatherOverride('dense_fog');
    assert.equal(validRes, true);
    assert.equal(weatherToggle.current, 'dense_fog');
  } finally {
    cleanup();
  }
});

test('cleanup_WhenInvoked_ShouldUnbindAllRegisteredBridgeMethods', () => {
  // Arrange
  const { deps, mockWindow } = createTestBridgeDeps();
  const cleanup = registerWindowDebugBridge(deps);
  assert.ok(typeof mockWindow.teleportPlayer === 'function');
  assert.ok(typeof mockWindow.setWorldHours === 'function');

  // Act
  cleanup();

  // Assert
  assert.equal(mockWindow.teleportPlayer, undefined);
  assert.equal(mockWindow.setWorldHours, undefined);
});
// #endregion
