// ============================================================================
// MODULE: World / Systems / Storm Fruit (tests)
// DESIGN: Picking, throwing and calming run through the real functions the game calls: the
//         physics step for picking, `throwStormFruit` for the throw, and `stepSmallAnimals` for the
//         stag's calm, so each rule is checked in the live path.
// SUMMARY: Bushes pick one fruit and regrow; a thrown fruit calms a stag it reaches, a missed one is
//          lost; the calm holds while the player is near; bush state survives a save round trip.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORM_FRUIT_BUSHES,
  STORM_FRUIT_REGROW_SEC,
  exportStormFruitState,
  getStormFruitRegrowSec,
  importStormFruitState,
  isStormFruitReady,
  pickStormFruitAt,
  resetStormFruit,
  stepStormFruitRegrowth,
} from '../domain/landmarksRegistry';
import { STORM_ISLAND } from '../domain/landmarks/skyboundIsles/skyboundLayout';
import { createInitialPlayerState } from './playerPhysicsSystem';
import { resetStormFruitThrows, stepStormFruitThrows, throwStormFruit, getStormFruitThrows } from './stormFruitSystem';
import { createInitialSmallAnimals, stepSmallAnimals, STAG_CALM_RELEASE_M } from './boidsAndWildlifeSystem';
import type { ISmallAnimalState } from './boidsAndWildlifeSystem';
import type { IPlayerState } from '../domain/worldTypes';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const FRAME_SEC = 1 / 60;
const BUSH = STORM_FRUIT_BUSHES[0];

/** A royal stag standing on Storm Island at (x, z). */
function stagAt(x: number, z: number): ISmallAnimalState {
  const stag = createInitialSmallAnimals().find((a) => a.species === 'stag');
  assert.ok(stag, 'Storm Island must have a stag');
  stag.x = x;
  stag.z = z;
  stag.y = STORM_ISLAND.deckY;
  stag.homeX = x;
  stag.homeZ = z;
  stag.vx = 0;
  stag.vz = 0;
  return stag;
}

/** A player `dist` metres in front of a stag (facing it, due north), with a fruit in hand. */
function playerFacing(stag: ISmallAnimalState, dist: number, pitch = 0): IPlayerState {
  const player = createInitialPlayerState();
  player.x = stag.x;
  player.y = STORM_ISLAND.deckY;
  player.z = stag.z + dist;
  player.yaw = 0;
  player.pitch = pitch;
  player.ownedItemIds = ['storm_fruit'];
  return player;
}
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetStormFruit();
  resetStormFruitThrows();
});

// #region Picking
describe('storm fruit bushes', () => {
  it('stormFruitBush_WhenTouchedWhileReady_ShouldGiveOneFruitAndGoBare', () => {
    // Arrange / Act
    const picked = pickStormFruitAt(BUSH.x, BUSH.y, BUSH.z);
    // Assert
    assert.equal(picked, 1);
    assert.equal(isStormFruitReady(BUSH.id), false);
  });

  it('stormFruitBush_WhenTouchedWhileBare_ShouldGiveNothing', () => {
    // Arrange
    pickStormFruitAt(BUSH.x, BUSH.y, BUSH.z);
    // Act
    const picked = pickStormFruitAt(BUSH.x, BUSH.y, BUSH.z);
    // Assert
    assert.equal(picked, 0);
  });

  it('stormFruitBush_WhenItHasRegrown_ShouldBeReadyAgain', () => {
    // Arrange
    pickStormFruitAt(BUSH.x, BUSH.y, BUSH.z);
    // Act
    stepStormFruitRegrowth(STORM_FRUIT_REGROW_SEC + 0.1);
    // Assert
    assert.equal(getStormFruitRegrowSec(BUSH.id), 0);
    assert.equal(pickStormFruitAt(BUSH.x, BUSH.y, BUSH.z), 1);
  });

  it('stormFruitBushes_WhenSavedAndLoaded_ShouldKeepTheRegrowTimeAndDropUnknownBushes', () => {
    // Arrange
    pickStormFruitAt(BUSH.x, BUSH.y, BUSH.z);
    stepStormFruitRegrowth(30);
    const saved = [...exportStormFruitState(), { id: 'bush-that-no-longer-exists', regrowSec: 50 }];
    resetStormFruit();
    // Act
    importStormFruitState(saved);
    // Assert
    assert.deepEqual(exportStormFruitState(), [{ id: BUSH.id, regrowSec: STORM_FRUIT_REGROW_SEC - 30 }]);
  });
});
// #endregion

// #region Throwing
describe('storm fruit throws', () => {
  it('stormFruitThrow_WhenItReachesAStag_ShouldCalmIt', () => {
    // Arrange
    const stag = stagAt(STORM_ISLAND.x, STORM_ISLAND.z);
    const player = playerFacing(stag, 6);
    // Act
    assert.equal(throwStormFruit(player), true);
    let calmed = 0;
    for (let t = 0; t < 1.0; t += FRAME_SEC) calmed += stepStormFruitThrows(FRAME_SEC, [stag]).calmed.length;
    // Assert
    assert.equal(calmed, 1);
    assert.equal(stag.isStagCalmed, true);
    assert.equal(getStormFruitThrows().length, 0);
    assert.equal(player.ownedItemIds?.includes('storm_fruit'), false);
  });

  it('stormFruitThrow_WhenItLandsWithoutReachingAStag_ShouldBeLost', () => {
    // Arrange: thrown steeply up, so it comes back down beside the player, away from the stag.
    const stag = stagAt(STORM_ISLAND.x, STORM_ISLAND.z);
    const player = playerFacing(stag, 14, 1.5);
    // Act
    throwStormFruit(player);
    let lost = 0;
    let calmed = 0;
    for (let t = 0; t < 6; t += FRAME_SEC) {
      const r = stepStormFruitThrows(FRAME_SEC, [stag]);
      lost += r.lost;
      calmed += r.calmed.length;
    }
    // Assert
    assert.equal(calmed, 0);
    assert.equal(lost, 1);
    assert.equal(getStormFruitThrows().length, 0);
  });

  it('stormFruitThrow_WhenThePlayerHasNoFruit_ShouldNotThrow', () => {
    // Arrange
    const stag = stagAt(STORM_ISLAND.x, STORM_ISLAND.z);
    const player = playerFacing(stag, 6);
    player.ownedItemIds = [];
    // Act
    const thrown = throwStormFruit(player);
    // Assert
    assert.equal(thrown, false);
    assert.equal(getStormFruitThrows().length, 0);
  });
});
// #endregion

// #region Calm
describe('storm fruit calm', () => {
  it('calmedStag_WhenThePlayerStaysNear_ShouldStayCalmEvenInsideTheAggroRadius', () => {
    // Arrange
    const stag = stagAt(STORM_ISLAND.x, STORM_ISLAND.z);
    const player = playerFacing(stag, 6);
    throwStormFruit(player);
    for (let t = 0; t < 1.0; t += FRAME_SEC) stepStormFruitThrows(FRAME_SEC, [stag]);
    // Act: the player steps in to 2 m and stays there.
    for (let t = 0; t < 2; t += FRAME_SEC) stepSmallAnimals([stag], FRAME_SEC, t, stag.x, stag.z + 2);
    // Assert
    assert.equal(stag.isStagCalmed, true);
    assert.equal(stag.isStagAggro ?? false, false);
  });

  it('calmedStag_WhenTheFruitWasThrownFromSixMetres_ShouldStillBeCalmOnTheNextStep', () => {
    // Arrange: the throw came from 6 m, which is beyond the 3 m aggro radius and the 4.5 m aggro release.
    const stag = stagAt(STORM_ISLAND.x, STORM_ISLAND.z);
    const player = playerFacing(stag, 6);
    throwStormFruit(player);
    for (let t = 0; t < 1.0; t += FRAME_SEC) stepStormFruitThrows(FRAME_SEC, [stag]);
    // Act
    stepSmallAnimals([stag], FRAME_SEC, 0, stag.x, stag.z + 6);
    // Assert
    assert.equal(stag.isStagCalmed, true);
  });

  it('calmedStag_WhenThePlayerLeavesPastTheCalmDistance_ShouldForgetTheCalm', () => {
    // Arrange
    const stag = stagAt(STORM_ISLAND.x, STORM_ISLAND.z);
    const player = playerFacing(stag, 6);
    throwStormFruit(player);
    for (let t = 0; t < 1.0; t += FRAME_SEC) stepStormFruitThrows(FRAME_SEC, [stag]);
    // Act
    stepSmallAnimals([stag], FRAME_SEC, 0, stag.x, stag.z + STAG_CALM_RELEASE_M + 1.0);
    // Assert
    assert.equal(stag.isStagCalmed, false);
  });
});
// #endregion
