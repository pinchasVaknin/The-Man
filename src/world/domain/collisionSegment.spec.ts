import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ISolidBuildingBox } from './worldTypes';
import { isSegmentBlockedBySolidBox } from './collisionWorld';

const wall: ISolidBuildingBox = {
  id: 'test-wall',
  minX: -1,
  maxX: 1,
  minZ: -1,
  maxZ: 1,
  minY: 0,
  maxY: 3,
};

describe('collisionWorld - isSegmentBlockedBySolidBox', () => {
  it('should block a segment that crosses a box at a height inside the box', () => {
    assert.equal(isSegmentBlockedBySolidBox(-5, 0, 5, 0, 1, [wall]), true);
  });

  it('should not block a segment that passes above the box', () => {
    assert.equal(isSegmentBlockedBySolidBox(-5, 0, 5, 0, 5, [wall]), false);
  });

  it('should not block a segment that passes beside the box', () => {
    assert.equal(isSegmentBlockedBySolidBox(-5, 3, 5, 3, 1, [wall]), false);
  });

  it('should not block when the endpoints touch the box but the path stays outside it', () => {
    // Both endpoints lie on the far side of the box, so no sample falls inside it.
    assert.equal(isSegmentBlockedBySolidBox(2, 0, 6, 0, 1, [wall]), false);
  });

  it('should return false when there are no boxes', () => {
    assert.equal(isSegmentBlockedBySolidBox(-5, 0, 5, 0, 1, []), false);
  });
});
