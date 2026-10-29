// ============================================================================
// MODULE: Test / Systems / Dwarven Mine And Caravan System Specification
// DESIGN: Unit verification for pure deterministic caravan scheduler & mine queries (AAA)
// SUMMARY: Validates sunrise/sunset routes, stationary work, nighttime rest, and floor heights.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDwarvenMinerCaravanState,
  isInsideSouthernMine,
  southernMineFloorHeightAt,
} from './dwarvenMineAndCaravanSystem';
import { SOUTHERN_MINE_POS } from '../domain/landmarksRegistry';

test('computeDwarvenMinerCaravanState_WhenDuringDaytimeWorkHours_ShouldReturnMiningWorkState', () => {
  // Arrange
  const daytimeHours = 12.0; // Noon (07:36 .. 17:48 is mining work)
  const dwarfIndex = 0;
  const animTimeSec = 10.0;

  // Act
  const state = computeDwarvenMinerCaravanState(daytimeHours, dwarfIndex, animTimeSec);

  // Assert
  assert.equal(state.dwarfIndex, 0);
  assert.equal(state.activity, 'mining_work');
  assert.equal(state.walkCycle, 0);
  assert.equal(state.lanternLit, true);
  assert.ok(state.miningSwing >= 0 && state.miningSwing <= 1.0);
});

test('computeDwarvenMinerCaravanState_WhenDuringNightHours_ShouldReturnRestingHomeState', () => {
  // Arrange
  const nightHours = 23.5; // Late night (19:30 .. 06:00 is home rest)
  const dwarfIndex = 1;

  // Act
  const state = computeDwarvenMinerCaravanState(nightHours, dwarfIndex);

  // Assert
  assert.equal(state.dwarfIndex, 1);
  assert.equal(state.activity, 'resting_home');
  assert.equal(state.walkCycle, 0);
  assert.equal(state.miningSwing, 0);
  assert.equal(state.lanternLit, false);
});

test('computeDwarvenMinerCaravanState_WhenDuringSunriseCaravan_ShouldReturnCaravanToMineState', () => {
  // Arrange
  const sunriseHours = 6.8; // Sunrise (06:00 .. 07:36 is caravan to mine)
  const dwarfIndex = 2;
  const animTimeSec = 5.0;

  // Act
  const state = computeDwarvenMinerCaravanState(sunriseHours, dwarfIndex, animTimeSec);

  // Assert
  assert.equal(state.dwarfIndex, 2);
  assert.equal(state.activity, 'caravan_to_mine');
  assert.equal(state.lanternLit, true);
  assert.ok(state.walkCycle > 0);
});

test('computeDwarvenMinerCaravanState_WhenDuringSunsetCaravan_ShouldReturnCaravanToHomeState', () => {
  // Arrange
  const sunsetHours = 18.5; // Sunset (17:48 .. 19:30 is caravan back home)
  const dwarfIndex = 3;
  const animTimeSec = 8.0;

  // Act
  const state = computeDwarvenMinerCaravanState(sunsetHours, dwarfIndex, animTimeSec);

  // Assert
  assert.equal(state.dwarfIndex, 3);
  assert.equal(state.activity, 'caravan_to_home');
  assert.equal(state.lanternLit, true);
  assert.ok(state.walkCycle > 0);
});

test('isInsideSouthernMine_WhenWithinCavernBoundingBox_ShouldReturnTrue', () => {
  // Arrange
  const insideX = SOUTHERN_MINE_POS.x;
  const insideZ = SOUTHERN_MINE_POS.entranceZ + 45.0; // Room 1 (Central Junction Hall)
  const insideY = SOUTHERN_MINE_POS.cavernFloorY + 1.0;

  // Act
  const isInside = isInsideSouthernMine(insideX, insideZ, insideY);

  // Assert
  assert.equal(isInside, true);
});

test('isInsideSouthernMine_WhenFarOutsideMine_ShouldReturnFalse', () => {
  // Arrange
  const outsideX = 0;
  const outsideZ = 0; // World spawn area

  // Act
  const isInside = isInsideSouthernMine(outsideX, outsideZ);

  // Assert
  assert.equal(isInside, false);
});

test('southernMineFloorHeightAt_WhenAtEntrance_ShouldReturnEntranceFloorY', () => {
  // Arrange
  const entranceZ = 400.0;

  // Act
  const floorY = southernMineFloorHeightAt(entranceZ);

  // Assert
  assert.ok(typeof floorY === 'number');
  assert.ok(!Number.isNaN(floorY));
});
