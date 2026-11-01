// ============================================================================
// MODULE: World / Controllers / HUD Telemetry Builder Tests
// DESIGN: AAA unit tests plus a golden snapshot for the HUD telemetry mapping
// SUMMARY: Pins the snapshot shape at spawn, at the harbor market and beside a dead animal,
//          and checks that live player collections are copied, not shared.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertMatchesGolden } from '../../testSupport/goldenMaster';
import { buildTelemetrySnapshot, type IHudTelemetryInput } from './hudTelemetryBuilder';
import { createInitialPlayerState, createInitialRideableHorses } from '../systems/playerPhysicsSystem';
import { createInitialWildlifeState, killGroundAnimal } from '../systems/boidsAndWildlifeSystem';
import { computeDynamicSolarCycle, computeWeatherState } from '../systems/atmosphereAndWeatherSystem';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
function createInput(overrides: Partial<IHudTelemetryInput> = {}): IHudTelemetryInput {
  const player = createInitialPlayerState();
  return {
    player,
    horses: createInitialRideableHorses(),
    openDoorIds: new Set<string>(),
    atmosphere: computeDynamicSolarCycle(9.5),
    weather: computeWeatherState(120, player.x, player.z),
    colliderDebugVisible: false,
    pointerLocked: true,
    lootNotification: null,
    arrowHitTargetName: null,
    isSleepingInBed: false,
    worldHours: 9.5,
    forcedSeason: 'auto',
    ...overrides,
  };
}
// #endregion

// ======================== SNAPSHOT TESTS ======================== \\
// #region Snapshot Tests
test('buildTelemetrySnapshot_WhenPlayerAtSpawnMarketAndCarcass_ShouldMatchGolden', () => {
  // Arrange
  const atSpawn = createInput();
  const atMarket = createInput({ lootNotification: 'Looted', arrowHitTargetName: 'Target' });
  atMarket.player.x = 212;
  atMarket.player.z = 256;
  const { animals } = createInitialWildlifeState();
  killGroundAnimal(animals[0]);
  const atCarcass = createInput();
  atCarcass.player.x = animals[0].x + 0.5;
  atCarcass.player.z = animals[0].z;

  // Act
  const snapshots = [atSpawn, atMarket, atCarcass].map(buildTelemetrySnapshot);

  // Assert
  assertMatchesGolden(new URL('./__golden__/hud-telemetry.json', import.meta.url), snapshots);
});
// #endregion

// ======================== ISOLATION TESTS ======================== \\
// #region Isolation Tests
test('buildTelemetrySnapshot_WhenPlayerHasCollections_ShouldReturnCopies', () => {
  // Arrange
  const input = createInput();
  const owned: typeof input.player.ownedItemIds = ['bow'];
  input.player.ownedItemIds = owned;

  // Act
  const snapshot = buildTelemetrySnapshot(input);
  owned?.push('sword');

  // Assert
  assert.deepEqual(snapshot.ownedItemIds, ['bow']);
  assert.notEqual(snapshot.skills, input.player.skills);
});
// #endregion
