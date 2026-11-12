import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSmallAnimals } from './boidsAndWildlifeSystem';
import { createInitialPlayerState, stepSurvivalVitals } from './playerPhysicsSystem';

describe('attack cooldown (G11)', () => {
  it('should count an animal\'s attack cooldown down once per step, not twice', () => {
    const animals = createInitialSmallAnimals();
    const wolf = animals.find((a) => a.species === 'wolf')!;
    wolf.attackHitCooldownTimer = 1.0;
    const state = createInitialPlayerState();
    state.maxHp = 100;
    state.hp = 100;
    state.hunger = 100;
    // Survival vitals must not touch the cooldown; the animal's own step owns it.
    stepSurvivalVitals(state, 0.5, false, false);
    assert.equal(wolf.attackHitCooldownTimer, 1.0);
  });
});
