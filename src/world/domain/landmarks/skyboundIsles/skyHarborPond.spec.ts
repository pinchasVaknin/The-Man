// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles / Sky Harbor Pond Tests
// DESIGN: AAA tests for the sunken pond: its bed, its water, and how the surface and water queries use it
// SUMMARY: The pond is ankle deep at the rim and deep enough to swim in the middle, the island deck has a
//          hole there (the walkable surface is the bed), and the world water query reports its surface.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKY_HARBOR_POND, skyHarborPondBedY, skyHarborPondColumnAt, skyHarborPondWaterSurfaceAt } from './skyHarborPond';
import { skyboundSurfaceAt } from './skyboundSurface';
import { getWaterSurfaceHeightAt } from '../../../systems/terrainAndBiomeSystem';

const POND = SKY_HARBOR_POND;
const RIM_EDGE_DISTANCE = POND.radius - 0.05;

test('skyHarborPondBedY_WhenSampledFromRimToCenter_ShouldDeepenFromAnkleDepthToSwimmingDepth', () => {
  const rimDepth = POND.surfaceY - (skyHarborPondBedY(POND.x + RIM_EDGE_DISTANCE, POND.z) as number);
  const midDepth = POND.surfaceY - (skyHarborPondBedY(POND.x + POND.radius / 2, POND.z) as number);
  const centerDepth = POND.surfaceY - (skyHarborPondBedY(POND.x, POND.z) as number);

  assert.ok(rimDepth > 0 && rimDepth < 0.3, `rim should be ankle deep, got ${rimDepth.toFixed(2)} m`);
  assert.ok(midDepth > rimDepth, 'water gets deeper toward the middle');
  assert.ok(centerDepth >= 1.8, `the middle should be deep enough to swim, got ${centerDepth.toFixed(2)} m`);
});

test('skyHarborPondBedY_WhenOutsideThePond_ShouldBeNull', () => {
  assert.equal(skyHarborPondBedY(POND.x + POND.radius + 0.5, POND.z), null);
  assert.equal(skyHarborPondColumnAt(POND.x, POND.z + POND.radius + 0.5), null);
});

test('skyHarborPondBedY_WhenSteppingInFromTheRim_ShouldNeverDropMoreThanAStep', () => {
  let previous = skyHarborPondBedY(POND.x + RIM_EDGE_DISTANCE, POND.z) as number;
  for (let d = RIM_EDGE_DISTANCE; d >= 0; d -= 0.1) {
    const bed = skyHarborPondBedY(POND.x + d, POND.z) as number;
    assert.ok(previous - bed < 0.3, `bed falls ${(previous - bed).toFixed(2)} m in a 0.1 m stride at distance ${d.toFixed(1)}`);
    previous = bed;
  }
});

test('skyboundSurfaceAt_WhenOverThePond_ShouldReturnThePondBedInsteadOfTheDeck', () => {
  const overPond = skyboundSurfaceAt(POND.x, POND.z, POND.deckY);
  const besidePond = skyboundSurfaceAt(POND.x + POND.radius + 1.5, POND.z, POND.deckY);

  assert.equal(overPond?.id, 'sky-harbor-pond');
  assert.ok(overPond !== null && overPond.y < POND.surfaceY, 'the surface under the pond center is below the water');
  assert.equal(besidePond?.y, POND.deckY, 'next to the pond the deck is intact');
});

test('getWaterSurfaceHeightAt_WhenInThePondAtDeckLevel_ShouldReportTheSurfaceAndNothingFarAbove', () => {
  assert.equal(getWaterSurfaceHeightAt(POND.x, POND.z, POND.deckY), POND.surfaceY);
  assert.equal(skyHarborPondWaterSurfaceAt(POND.x, POND.z, POND.deckY + 60), null, 'a player far above is not in the pond');
  assert.notEqual(getWaterSurfaceHeightAt(POND.x + POND.radius + 2, POND.z, POND.deckY), POND.surfaceY, 'the pond water ends at its rim');
});
