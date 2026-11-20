// ============================================================================
// MODULE: World / Systems / Koi Ponds Tests
// DESIGN: Fish of enclosed ponds are ordinary wildlife: the same spawn list, AI, hits and traps as the
//         koi of the terrain lakes, but their water comes from the pond's own water-column query
// SUMMARY: Verifies that pond koi spawn in the pond's water, stay in it, swim nose-first, and ignore a
//          player standing far above or below their level.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSmallAnimals, stepSmallAnimals, type ISmallAnimalState } from './boidsAndWildlifeSystem';
import { ENCLOSED_KOI_PONDS, MINE_LAGOON_POND } from './koiPonds';
import { createInitialPlayerState } from '../terrainMath';
// #endregion

// ======================== FIXTURES ======================== \
// #region Fixtures
function pondKoi(pondId: string): ISmallAnimalState[] {
  return createInitialSmallAnimals().filter((a) => a.species === 'koifish' && a.pondId === pondId);
}

const DT = 0.05;
// #endregion

// ======================== TESTS ======================== \
// #region Pond Koi
test('createInitialSmallAnimals_WhenPondsAreRegistered_ShouldSpawnTheConfiguredFishInsideTheirWater', () => {
  for (const pond of ENCLOSED_KOI_PONDS) {
    const fish = pondKoi(pond.id);

    assert.equal(fish.length, pond.fishCount, `${pond.id}: fish count`);
    for (const a of fish) {
      const column = pond.columnAt(a.x, a.z, a.y);
      assert.ok(column, `${pond.id}: fish at (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) must start in water`);
      assert.ok(a.y < column.surfaceY && a.y > column.bedY, `${pond.id}: fish at y=${a.y.toFixed(2)} must be between bed and surface`);
    }
  }
});

test('stepSmallAnimals_WhenPondKoiSimulateForAMinute_ShouldStayInTheWaterAndSwimNoseFirst', () => {
  for (const pond of ENCLOSED_KOI_PONDS) {
    const fish = pondKoi(pond.id);
    const lowPlayer = createInitialPlayerState();
    lowPlayer.y = pond.surfaceY + 40; // far above the pond level: nothing startles the school

    for (let i = 0; i < 1200; i++) {
      // The player stands above the pond's center (so the fish are inside the simulated range) on another level.
      stepSmallAnimals(fish, DT, i * DT, pond.centerX, pond.centerZ, [], 1.0, undefined, 0, false, false, 0, lowPlayer);
    }

    for (const a of fish) {
      assert.ok(pond.columnAt(a.x, a.z, a.y), `${pond.id}: fish at (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) left the water`);
      assert.ok(Math.hypot(a.x - pond.centerX, a.z - pond.centerZ) <= pond.maxRadius + 3, `${pond.id}: fish strayed from the pond`);
      const speed = Math.hypot(a.vx, a.vz);
      assert.ok(speed > 0.2, `${pond.id}: koi must actively swim`);
      assert.ok((a.vx * Math.sin(a.yaw) + a.vz * Math.cos(a.yaw)) / speed > 0.98, `${pond.id}: koi must swim nose-first, never sideways`);
    }
  }
});

test('stepSmallAnimals_WhenThePlayerWalksFarAboveAPondOnAnotherLevel_ShouldNotStartleItsFish', () => {
  const fish = pondKoi(MINE_LAGOON_POND.id);
  const player = createInitialPlayerState();
  player.y = MINE_LAGOON_POND.surfaceY + 30; // on the ground above the mine

  for (let i = 0; i < 100; i++) {
    stepSmallAnimals(fish, DT, i * DT, MINE_LAGOON_POND.centerX, MINE_LAGOON_POND.centerZ, [], 1.0, undefined, 6, false, false, 0, player);
  }

  assert.ok(fish.every((a) => a.alertLevel !== 'fleeing'), 'fish under the player but on another level must keep grazing');
});

test('stepSmallAnimals_WhenThePlayerWadesAtTheSameLevelAsAPond_ShouldStartleItsFish', () => {
  const fish = pondKoi(MINE_LAGOON_POND.id);
  const player = createInitialPlayerState();
  player.y = MINE_LAGOON_POND.surfaceY;

  for (let i = 0; i < 40; i++) {
    stepSmallAnimals(fish, DT, i * DT, fish[0].x, fish[0].z, [], 1.0, undefined, 6, false, false, 0, player);
  }

  assert.ok(fish.some((a) => a.alertLevel === 'fleeing'), 'a fish next to a running player on its level must dart away');
});
// #endregion
