// ============================================================================
// MODULE: World / Systems / Flyer Wildlife Tests
// DESIGN: AAA tests for the seagull flock and the meadow butterflies: they are real wildlife (simulated,
//         killable) and indifferent to the player, while doves still scatter from people.
// SUMMARY: Covers FLYER_PROFILES, the harbor flock, butterfly flutter, night rest and hits.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIRD_FLOCK_CONFIGS, createInitialBoidBirds } from './boidsAndWildlifeSystem';
import { FLYER_PROFILES } from './wildlifeSpeciesProfiles';
import { createInitialButterflies, getActiveWorldButterflies, hitButterflyNear, stepButterflies } from './butterflyWildlifeSystem';

test('flyerProfiles_WhenComparingSpecies_ShouldScatterOnlyDoves', () => {
  assert.equal(FLYER_PROFILES.dove.fearsPlayer, true);
  assert.equal(FLYER_PROFILES.seagull.fearsPlayer, false);
  assert.equal(FLYER_PROFILES.butterfly.fearsPlayer, false);
});

test('createInitialBoidBirds_WhenBuilt_ShouldIncludeAHarborSeagullFlock', () => {
  const birds = createInitialBoidBirds();

  const gulls = birds.filter((b) => b.species === 'seagull');

  const gullConfig = BIRD_FLOCK_CONFIGS.find((c) => c.species === 'seagull');
  assert.ok(gullConfig);
  assert.equal(gulls.length, gullConfig.count);
  assert.equal(birds.length - gulls.length, 36);
  assert.ok(gulls.every((g) => g.hp === 25 && !g.isDead));
});

test('stepButterflies_WhenDaylight_ShouldFlutterAroundHome', () => {
  const list = createInitialButterflies();

  stepButterflies(list, 10, 1);

  for (const b of list) {
    assert.equal(b.hidden, false);
    assert.ok(Math.hypot(b.x - b.homeX, b.z - b.homeZ) <= 4.5 * Math.SQRT2 + 0.01);
  }
});

test('stepButterflies_WhenNight_ShouldRestAndWhenMorningComesReviveTheDead', () => {
  const list = createInitialButterflies();
  stepButterflies(list, 5, 1);
  assert.equal(hitButterflyNear(list[0].x, list[0].y, list[0].z, 0.5, 0.5), true);

  stepButterflies(list, 6, 0.1);
  assert.ok(list.every((b) => b.hidden));
  stepButterflies(list, 7, 1);

  assert.ok(list.every((b) => !b.hidden && !b.isDead));
});

test('hitButterflyNear_WhenStrikeIsOutOfReach_ShouldMissAndWhenCloseShouldKillOne', () => {
  const list = createInitialButterflies();
  stepButterflies(list, 5, 1);
  const target = list[3];

  const miss = hitButterflyNear(target.x + 50, target.y, target.z, 0.5, 0.5);
  const hit = hitButterflyNear(target.x, target.y, target.z, 0.5, 0.5);

  assert.equal(miss, false);
  assert.equal(hit, true);
  assert.equal(getActiveWorldButterflies().filter((b) => b.isDead).length >= 1, true);
});
