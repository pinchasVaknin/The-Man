import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSmallAnimals, stepSmallAnimals } from './boidsAndWildlifeSystem';
import { SPECIES_PROFILES } from './wildlifeSpeciesProfiles';

const DT = 1 / 60;
const PLAYER_RADIUS = 0.45;

describe('animal body against the player (G6)', () => {
  it('should keep a rhino standing on the player out of the player\'s body', () => {
    const animals = createInitialSmallAnimals();
    const rhino = animals.find((a) => a.species === 'rhino')!;
    const player = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, mountedHorseId: null, hp: 100, maxHp: 100 };
    rhino.x = 0.2;
    rhino.z = 0;
    rhino.y = 0;
    rhino.vx = -4;
    rhino.vz = 0;
    for (let s = 0; s < 60; s++) {
      stepSmallAnimals([rhino], DT, s * DT, player.x, player.z, [], 1.0, undefined, 0, false, false, 0, player as never);
    }
    const minDist = SPECIES_PROFILES.rhino.preyBodyRadius + PLAYER_RADIUS;
    const dist = Math.hypot(rhino.x - player.x, rhino.z - player.z);
    assert.ok(dist >= minDist - 0.02, `rhino ${dist.toFixed(2)} m from the player, expected at least ${minDist.toFixed(2)} m`);
  });

  it('should not touch an animal standing well away from the player', () => {
    const animals = createInitialSmallAnimals();
    const wolf = animals.find((a) => a.species === 'wolf')!;
    const player = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, mountedHorseId: null, hp: 100, maxHp: 100 };
    wolf.x = 30;
    wolf.z = 0;
    wolf.y = 0;
    wolf.vx = 0;
    wolf.vz = 0;
    const before = [wolf.x, wolf.z];
    stepSmallAnimals([wolf], DT, 0, player.x, player.z, [], 1.0, undefined, 0, false, false, 0, player as never);
    assert.ok(Math.hypot(wolf.x - before[0], wolf.z - before[1]) < 1.0, 'a distant wolf is not pushed');
    assert.ok(Math.hypot(wolf.x - player.x, wolf.z - player.z) > 20);
  });
});
