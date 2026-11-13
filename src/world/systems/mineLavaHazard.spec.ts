// ============================================================================
// MODULE: World / Systems / Mine Lava Hazard (tests)
// DESIGN: Drives the hazard through its public function with a plain player state.
// SUMMARY: Falling into the Dragon Forge lava hurts and returns the player to the forge
//          entrance; standing on the stones or the forge floor does nothing.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ANCIENT_MINE_ORIGIN, LAVA_POOL, LAVA_STEPPING_STONES, MINE_LEVEL_Y } from '../domain/landmarks/ancientMine/ancientMineLayout';
import { ANCIENT_MINE_LAVA_RESPAWN } from '../domain/landmarks/ancientMine/ancientMineWorld';
import { createInitialPlayerState } from './playerPhysicsSystem';
import { LAVA_DAMAGE_FRACTION, applyMineLavaHazard } from './mineLavaHazard';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
/** Summary: A player standing at a local mine point at height y, at full health. */
function playerAt(lx: number, lz: number, y: number): ReturnType<typeof createInitialPlayerState> {
  const state = createInitialPlayerState();
  state.x = ANCIENT_MINE_ORIGIN.x + lx;
  state.z = ANCIENT_MINE_ORIGIN.z + lz;
  state.y = y;
  state.hp = 100;
  state.maxHp = 100;
  state.vy = -4;
  return state;
}

const POOL_SPOT = { lx: LAVA_POOL.minLx + 4, lz: (LAVA_POOL.minLz + LAVA_POOL.maxLz) / 2 };
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Lava Contact
describe('mineLavaHazard', () => {
  it('applyMineLavaHazard_WhenPlayerSinksIntoLava_ShouldReturnPlayerToForgeEntrance', () => {
    // Arrange
    const state = playerAt(POOL_SPOT.lx, POOL_SPOT.lz, MINE_LEVEL_Y.lavaBed);

    // Act
    applyMineLavaHazard(state, false);

    // Assert
    assert.deepEqual(
      { x: state.x, y: state.y, z: state.z, vy: state.vy },
      { x: ANCIENT_MINE_LAVA_RESPAWN.x, y: ANCIENT_MINE_LAVA_RESPAWN.y, z: ANCIENT_MINE_LAVA_RESPAWN.z, vy: 0 }
    );
  });

  it('applyMineLavaHazard_WhenPlayerSinksIntoLava_ShouldTakeAQuarterOfMaxHealth', () => {
    // Arrange
    const state = playerAt(POOL_SPOT.lx, POOL_SPOT.lz, MINE_LEVEL_Y.lavaBed);

    // Act
    applyMineLavaHazard(state, false);

    // Assert
    assert.equal(state.hp, 100 - 100 * LAVA_DAMAGE_FRACTION);
  });

  it('applyMineLavaHazard_WhenGodModeIsOn_ShouldReturnPlayerWithoutDamage', () => {
    // Arrange
    const state = playerAt(POOL_SPOT.lx, POOL_SPOT.lz, MINE_LEVEL_Y.lavaBed);

    // Act
    const touched = applyMineLavaHazard(state, true);

    // Assert
    assert.deepEqual({ touched, hp: state.hp, z: state.z }, { touched: true, hp: 100, z: ANCIENT_MINE_LAVA_RESPAWN.z });
  });
});
// #endregion

// ======================== EDGE CASES & INFRASTRUCTURE FAILURES ======================== \\
// #region No Contact
describe('mineLavaHazard - no contact', () => {
  it('applyMineLavaHazard_WhenStandingOnAStone_ShouldDoNothing', () => {
    // Arrange
    const stone = LAVA_STEPPING_STONES[2];
    const state = playerAt(stone.lx, stone.lz, stone.topY);

    // Act
    const touched = applyMineLavaHazard(state, false);

    // Assert
    assert.deepEqual({ touched, hp: state.hp }, { touched: false, hp: 100 });
  });

  it('applyMineLavaHazard_WhenJumpingHighAboveThePool_ShouldDoNothing', () => {
    // Arrange
    const state = playerAt(POOL_SPOT.lx, POOL_SPOT.lz, MINE_LEVEL_Y.forgeFloor + 0.4);

    // Act
    const touched = applyMineLavaHazard(state, false);

    // Assert
    assert.equal(touched, false);
  });

  it('applyMineLavaHazard_WhenFarFromTheMine_ShouldDoNothing', () => {
    // Arrange
    const state = createInitialPlayerState();

    // Act
    const touched = applyMineLavaHazard(state, false);

    // Assert
    assert.equal(touched, false);
  });
});
// #endregion
