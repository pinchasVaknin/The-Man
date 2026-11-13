import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateWorldObstacles } from './terrainAndBiomeSystem';
import { createInitialPlayerState, stepPlayerPhysics } from './playerPhysicsSystem';
import { SOUTHERN_MINE_POS, SOLID_BUILDING_BOXES } from '../domain/landmarksRegistry';

/** Summary: Input with only the jump and forward keys set, as a player pressing jump while walking forward. */
function input(forward: number, jumpPressed: boolean, jumpHeld: boolean) {
  return {
    forward,
    right: 0,
    sprint: false,
    relaxed: false,
    jumpPressed,
    jumpHeld,
    toggleFlyRequested: false,
    toggleMountHorseRequested: false,
    lookYawDelta: 0,
    lookPitchDelta: 0,
  };
}

describe('playerBoxFloor - standing on solid boxes', () => {
  it('should land on top of the ore cart instead of being thrown off it', () => {
    const obstacles = generateWorldObstacles();
    // The Ancient Mine's stationary ore cart in the gallery loading bay.
    const cart = SOLID_BUILDING_BOXES.find((b) => b.id.startsWith('ancient-mine-prop-') && b.id.endsWith('-oreCart'));
    assert.ok(cart && cart.maxY !== undefined, 'Expected the ore cart collider with a top');

    // Start 4 m south of the cart centre (lower z) and walk north (+z, yaw PI) into it.
    const cartX = (cart.minX + cart.maxX) / 2;
    const cartZ = (cart.minZ + cart.maxZ) / 2;
    const state = createInitialPlayerState();
    state.x = cartX;
    state.z = cartZ - 4;
    state.y = SOUTHERN_MINE_POS.cavernFloorY;
    state.yaw = Math.PI;

    let jumped = false;
    let jumpStep = 0;
    let largestGroundedDrop = 0;
    for (let step = 0; step < 4 * 60; step++) {
      const distance = Math.hypot(cartX - state.x, cartZ - state.z);
      const jumpNow = !jumped && distance <= 2.4;
      if (jumpNow) jumped = true;
      const prevY = state.y;
      const wasGrounded = state.onGround;
      // Hold jump for the first 40 frames, as a player does, so the jump keeps its full height.
      const holding = jumped && step < jumpStep + 40;
      if (jumpNow) jumpStep = step;
      stepPlayerPhysics(state, input(distance < 0.5 ? 0 : 1, jumpNow, holding), obstacles, 1 / 60);
      if (wasGrounded && state.onGround) largestGroundedDrop = Math.max(largestGroundedDrop, Math.abs(state.y - prevY));
    }

    assert.ok(Math.abs(state.y - cart.maxY) < 0.05, `Player should stand on the cart top ${cart.maxY}, got y ${state.y.toFixed(2)}`);
    assert.ok(largestGroundedDrop < 0.6, `Grounded height must not jump by ${largestGroundedDrop.toFixed(2)} m in one step`);
  });
});
