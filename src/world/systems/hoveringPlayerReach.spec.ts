import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSmallAnimals, stepSmallAnimals } from './boidsAndWildlifeSystem';

const DT = 1 / 60;
/** Where a wolf settles at the test spot (0, 0). */
const GROUND = -0.62;

/** Counts frames in attack state while the player stands `heightAboveGround` metres above the ground. */
function attackFrames(species: string, heightAboveGround: number): number {
  const animals = createInitialSmallAnimals();
  const a = animals.find((x) => x.species === species)!;
  a.x = 0;
  a.z = 0;
  a.y = GROUND;
  a.aiBehavior = 'grazing';
  a.alertLevel = 'grazing';
  a.wokenUpTimer = 30;
  a.attackHitCooldownTimer = 0;
  a.actionTimer = 0;
  const player = { x: 1.5, y: GROUND + heightAboveGround, z: 0, yaw: 0, pitch: 0, mountedHorseId: null, hp: 100, maxHp: 100 };
  let attacking = 0;
  for (let s = 0; s < 240; s++) {
    stepSmallAnimals([a], DT, s * DT, 1.5, 0, [], 1.0, undefined, 0, false, false, 0, player as never);
    if ((a.aiBehavior as string) === 'attacking') attacking++;
  }
  return attacking;
}

describe('predator attacks against a hovering player (G10)', () => {
  for (const species of ['wolf', 'jaguar', 'rhino']) {
    it(`${species} should not attack a player hovering 3 m above the ground`, () => {
      assert.equal(attackFrames(species, 3), 0);
    });

    it(`${species} should attack a player standing on the ground`, () => {
      assert.ok(attackFrames(species, 0) > 0);
    });
  }
});
