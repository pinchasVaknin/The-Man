// ============================================================================
// MODULE: World / Systems / Wildlife — Storm Island stag aggro (tests)
// DESIGN: Drives the real `stepSmallAnimals` with the Storm Island herd and a moving player, so
//         the 3 m proximity rule is proven in the live wildlife step, not just in the flag.
// SUMMARY: Stags stay neutral from afar, turn hostile inside 3 m, and calm again only past 4.5 m.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAG_AGGRO_RADIUS_M,
  STAG_AGGRO_RELEASE_M,
  createInitialSmallAnimals,
  stepSmallAnimals,
} from './boidsAndWildlifeSystem';
import type { ISmallAnimalState } from './boidsAndWildlifeSystem';
import { STORM_ISLAND } from '../domain/landmarks/skyboundIsles/skyboundLayout';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const FRAME_SEC = 1 / 60;

/** A stag on Storm Island, placed on its deck and kept there. */
function stormStag(): ISmallAnimalState {
  const stag = createInitialSmallAnimals().find((a) => a.species === 'stag');
  assert.ok(stag, 'Storm Island must have a stag');
  stag.x = STORM_ISLAND.x;
  stag.z = STORM_ISLAND.z;
  stag.y = STORM_ISLAND.deckY;
  stag.homeX = stag.x;
  stag.homeZ = stag.z;
  stag.vx = 0;
  stag.vz = 0;
  return stag;
}

/** Steps the wildlife with the player held `dist` metres east of the stag, for `seconds`. */
function stepWithPlayerAt(stag: ISmallAnimalState, dist: number, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME_SEC) {
    stepSmallAnimals([stag], FRAME_SEC, t, stag.x + dist, stag.z);
  }
}
// #endregion

// ======================== TESTS ======================== \\
// #region Proximity Aggro
describe('storm stag proximity aggro', () => {
  it('stormStag_WhenThePlayerStaysBeyondTheAggroRadius_ShouldStayNeutral', () => {
    // Arrange
    const stag = stormStag();
    // Act
    stepWithPlayerAt(stag, STAG_AGGRO_RADIUS_M + 2.0, 2.0);
    // Assert
    assert.equal(stag.isStagAggro ?? false, false);
    assert.notEqual(stag.aiBehavior, 'charging');
    assert.notEqual(stag.aiBehavior, 'attacking');
  });

  it('stormStag_WhenThePlayerComesInsideTheAggroRadius_ShouldTurnHostile', () => {
    // Arrange
    const stag = stormStag();
    // Act
    stepWithPlayerAt(stag, STAG_AGGRO_RADIUS_M - 0.5, 0.2);
    // Assert
    assert.equal(stag.isStagAggro, true);
    assert.ok(stag.aiBehavior === 'charging' || stag.aiBehavior === 'attacking', `behaviour ${stag.aiBehavior}`);
  });

  it('stormStag_WhenThePlayerBacksOffBetweenTheRadii_ShouldStayHostile', () => {
    // Arrange: aggro on, then the player steps back into the band between 3 and 4.5 m.
    const stag = stormStag();
    stepWithPlayerAt(stag, STAG_AGGRO_RADIUS_M - 0.5, 0.2);
    // Act
    stepWithPlayerAt(stag, (STAG_AGGRO_RADIUS_M + STAG_AGGRO_RELEASE_M) / 2, 0.2);
    // Assert
    assert.equal(stag.isStagAggro, true);
  });

  it('stormStag_WhenThePlayerLeavesPastTheReleaseDistance_ShouldCalmDown', () => {
    // Arrange
    const stag = stormStag();
    stepWithPlayerAt(stag, STAG_AGGRO_RADIUS_M - 0.5, 0.2);
    // Act
    stepWithPlayerAt(stag, STAG_AGGRO_RELEASE_M + 1.0, 0.2);
    // Assert
    assert.equal(stag.isStagAggro, false);
  });
});
// #endregion
