import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getHillWatchtowerLocalWalls } from './collisionAndTerraces';

const tower = { doorSideLocalZ: 1 as const, bridgeSideLocalZ: 1 as const, baseY: 20, deckY: 30 };

describe('hillWatchtowerWalls - shared wall list', () => {
  it('should list six lower-deck walls while the door is closed and five once it is open', () => {
    assert.equal(getHillWatchtowerLocalWalls(tower, false, false).length, 6);
    assert.equal(getHillWatchtowerLocalWalls(tower, false, true).length, 5);
  });

  it('should list the upper-deck parapet walls with tops at deck height plus the parapet', () => {
    const upper = getHillWatchtowerLocalWalls(tower, true, false);
    assert.equal(upper.length, 5);
    for (const wall of upper) assert.equal(wall.maxY, 30 + 0.96);
  });
});
