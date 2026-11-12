import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nearestWaterDistance, type IWaterQueries } from './waterProximity';

// A lake: water over the ground for x > 10 (surface 1.0, ground 0).
const lake: IWaterQueries = {
  waterSurfaceAt: (x) => (x > 10 ? 1.0 : null),
  groundAt: () => 0,
};

describe('waterProximity - nearestWaterDistance', () => {
  it('should be zero when standing in water', () => {
    assert.equal(nearestWaterDistance(lake, 12, 0), 0);
  });

  it('should find the water edge a few metres away', () => {
    const d = nearestWaterDistance(lake, 6, 0);
    assert.ok(d >= 3 && d <= 6, `expected 3..6 m to the lake edge, got ${d}`);
  });

  it('should return the search range when no water is near', () => {
    assert.equal(nearestWaterDistance(lake, -50, 0, 40), 40);
  });

  it('should ignore a surface that is not above the ground', () => {
    const dry: IWaterQueries = { waterSurfaceAt: () => 1.0, groundAt: () => 1.1 };
    assert.equal(nearestWaterDistance(dry, 0, 0, 40), 40);
  });
});
