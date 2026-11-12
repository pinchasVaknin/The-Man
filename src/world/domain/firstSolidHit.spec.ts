import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ISolidBuildingBox } from './worldTypes';
import { firstSolidHitFraction } from './collisionWorld';

const wall: ISolidBuildingBox = { id: 'sweep-wall', minX: -1, maxX: 1, minZ: -1, maxZ: 1, minY: 0, maxY: 3 };

describe('collisionWorld - firstSolidHitFraction', () => {
  it('should return the fraction where a sweep first enters a box', () => {
    // Sweep from x = -5 to x = 5; the box starts at x = -1, which is 4 of 10 metres along.
    const f = firstSolidHitFraction(-5, 0, 5, 0, 1, [wall]);
    assert.ok(f !== null);
    assert.ok(Math.abs(f - 0.4) < 0.03, `expected about 0.4, got ${f}`);
  });

  it('should return null when the sweep stays clear of the box', () => {
    assert.equal(firstSolidHitFraction(-5, 3, 5, 3, 1, [wall]), null);
  });

  it('should ignore a box that is above the sweep height', () => {
    assert.equal(firstSolidHitFraction(-5, 0, 5, 0, 5, [wall]), null);
  });

  it('should not count a box the sweep starts inside', () => {
    // Starts inside the box; the first sample (one step in) is still inside, so the hit is at the first step.
    const f = firstSolidHitFraction(0, 0, 5, 0, 1, [wall]);
    assert.ok(f !== null && f <= 0.05);
  });

  it('should return null for an empty sweep', () => {
    assert.equal(firstSolidHitFraction(2, 2, 2, 2, 1, [wall]), null);
  });
});
