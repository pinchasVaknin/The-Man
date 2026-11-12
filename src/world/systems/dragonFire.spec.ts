import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSmallAnimals, DRAGON_MAX_HP, getAnimalMaxHp, type ISmallAnimalState } from './boidsAndWildlifeSystem';
import { createInitialPlayerState, stepSurvivalVitals } from './playerPhysicsSystem';

const DT = 0.1;

/** A dragon record inside the live animal registry, breathing fire from (0, 0) toward +Z. */
function setupDragon(): ISmallAnimalState {
  const animals = createInitialSmallAnimals();
  const dragon = animals[0] as ISmallAnimalState;
  dragon.species = 'dragon';
  dragon.isDead = false;
  dragon.x = 0;
  dragon.z = 0;
  dragon.y = 0;
  dragon.fireBreath = { x: 0, z: 0, dirX: 0, dirZ: 1, range: 13, halfAngle: 0.5 };
  return dragon;
}

function playerAt(x: number, z: number, y = 0) {
  const p = createInitialPlayerState();
  p.maxHp = 100;
  p.hp = 100;
  p.hunger = 100;
  p.x = x;
  p.z = z;
  p.y = y;
  return p;
}

describe('dragon fire breath (DR1)', () => {
  it('should burn a player inside the cone within reach', () => {
    setupDragon();
    const p = playerAt(0, 6);
    stepSurvivalVitals(p, DT, false, false);
    assert.ok((p.hp ?? 100) < 100, 'expected fire damage in the cone');
  });

  it('should not burn a player behind the dragon', () => {
    setupDragon();
    const p = playerAt(0, -6);
    stepSurvivalVitals(p, DT, false, false);
    assert.equal(p.hp, 100);
  });

  it('should not burn a player beyond the breath range', () => {
    setupDragon();
    const p = playerAt(0, 20);
    stepSurvivalVitals(p, DT, false, false);
    assert.equal(p.hp, 100);
  });

  it('should not burn a player in god mode', () => {
    setupDragon();
    const p = playerAt(0, 6);
    stepSurvivalVitals(p, DT, false, true);
    assert.equal(p.hp, 100);
  });

  it('should not burn when the dragon is not breathing', () => {
    const dragon = setupDragon();
    dragon.fireBreath = undefined;
    const p = playerAt(0, 6);
    stepSurvivalVitals(p, DT, false, false);
    assert.equal(p.hp, 100);
  });
});

describe('dragon HP (DR2)', () => {
  it('should use the fixed dragon pool at every level', () => {
    assert.equal(getAnimalMaxHp('dragon', 1), DRAGON_MAX_HP);
    assert.equal(getAnimalMaxHp('dragon', 18), DRAGON_MAX_HP);
    assert.equal(DRAGON_MAX_HP, 30000);
  });
});
