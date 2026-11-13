// ============================================================================
// MODULE: World / Domain / Landmarks / Ancient Mine (tests)
// DESIGN: Checks the per-area atmosphere through its public query.
// SUMMARY: Each area gets its own preset; the open upper cavern blends its zones smoothly.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MINE_LEVEL_Y, MINE_POI } from './ancientMineLayout';
import { MINE_ATMOSPHERE_PRESETS, mineAtmosphereAt } from './ancientMineAtmosphere';
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Presets
describe('ancientMineAtmosphere', () => {
  it('mineAtmosphereAt_WhenAtTheDragonForge_ShouldUseTheForgePreset', () => {
    // Arrange
    const { lx, lz } = MINE_POI.forgeEntrance;

    // Act
    const atmo = mineAtmosphereAt(lx, lz, MINE_LEVEL_Y.forgeFloor);

    // Assert
    assert.deepEqual(atmo, MINE_ATMOSPHERE_PRESETS.dragonForge);
  });

  it('mineAtmosphereAt_WhenOnTheGreatBridge_ShouldUseTheBridgePreset', () => {
    // Arrange
    const { lx, lz } = MINE_POI.bridgeMid;

    // Act
    const atmo = mineAtmosphereAt(lx, lz, MINE_LEVEL_Y.chasmLedge);

    // Assert
    assert.deepEqual(atmo, MINE_ATMOSPHERE_PRESETS.bridge);
  });

  it('mineAtmosphereAt_WhenInTheLagoonHeart_ShouldBeFullyLagoon', () => {
    // Arrange
    const { lx, lz } = MINE_POI.lagoonShore;

    // Act
    const atmo = mineAtmosphereAt(lx - 20, lz, MINE_LEVEL_Y.upperCavern);

    // Assert
    assert.deepEqual(atmo, MINE_ATMOSPHERE_PRESETS.lagoon);
  });

  it('mineAtmosphereAt_WhenAtTheTurntable_ShouldBeTheHallPreset', () => {
    // Arrange
    const { lx, lz } = MINE_POI.turntable;

    // Act
    const atmo = mineAtmosphereAt(lx, lz, MINE_LEVEL_Y.upperCavern);

    // Assert
    assert.deepEqual(atmo, MINE_ATMOSPHERE_PRESETS.upperCavern);
  });

  it('mineAtmosphereAt_WhenBetweenHallAndLagoon_ShouldBlendBetweenThem', () => {
    // Arrange
    const hall = MINE_ATMOSPHERE_PRESETS.upperCavern;
    const lagoon = MINE_ATMOSPHERE_PRESETS.lagoon;

    // Act
    const atmo = mineAtmosphereAt(-45, 72, MINE_LEVEL_Y.upperCavern);

    // Assert
    const between = (v: number, a: number, b: number): boolean => v > Math.min(a, b) && v < Math.max(a, b);
    assert.equal(between(atmo.fogDensity, hall.fogDensity, lagoon.fogDensity) || between(atmo.ambientIntensity, hall.ambientIntensity, lagoon.ambientIntensity), true);
  });
});
// #endregion
