import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialPlayerState, stepSurvivalVitals } from './playerPhysicsSystem';

function playerWithLanding(speed: number) {
  const state = createInitialPlayerState();
  state.maxHp = 100;
  state.hp = 100;
  state.hunger = 100;
  state.lastLandingSpeed = speed;
  return state;
}

describe('fall damage (PL2)', () => {
  it('should do no damage for a landing below the threshold', () => {
    const state = playerWithLanding(10);
    stepSurvivalVitals(state, 0, false, false);
    assert.equal(state.hp, 100);
  });

  it('should do about half of max HP for a landing halfway between threshold and lethal speed', () => {
    // 18 m/s is halfway between 12 and 24 m/s.
    const state = playerWithLanding(18);
    stepSurvivalVitals(state, 0, false, false);
    assert.ok(Math.abs((state.hp ?? -1) - 50) < 0.01, `expected about 50 HP, got ${state.hp}`);
  });

  it('should be lethal at or above the lethal landing speed', () => {
    const state = playerWithLanding(30);
    stepSurvivalVitals(state, 0, false, false);
    assert.equal(state.hp ?? -1, 0);
    assert.equal(state.deathRespawnPhase?.stage, 'dying');
  });

  it('should clear the landing speed after applying it', () => {
    const state = playerWithLanding(18);
    stepSurvivalVitals(state, 0, false, false);
    assert.equal(state.lastLandingSpeed, 0);
  });

  it('should not hurt the player in god mode', () => {
    const state = playerWithLanding(30);
    stepSurvivalVitals(state, 0, false, true);
    assert.equal(state.hp, 100);
  });
});
