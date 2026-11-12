import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ISolidBuildingBox } from './worldTypes';
import { findWallDetourWaypoint, findWallPath } from './wallNavigation';

const box = (id: string, minX: number, maxX: number, minZ: number, maxZ: number): ISolidBuildingBox => ({
  id,
  minX,
  maxX,
  minZ,
  maxZ,
  minY: 0,
  maxY: 3,
});

// A thin wall along z at x = 0, with a 2 m gap centred on z = 0.
const wallWithGap = [box('north', -0.5, 0.5, -12, -1), box('south', -0.5, 0.5, 1, 12)];
// A wall that closes the whole searched area.
const closedWall = [box('closed', -0.5, 0.5, -40, 40)];

describe('wallNavigation - findWallPath', () => {
  it('should route through the gap when the direct line is blocked', () => {
    const path = findWallPath(-5, 0, 5, 0, 1, wallWithGap);
    assert.ok(path, 'expected a path through the gap');
    // The path crosses the wall line x = 0 only inside the gap.
    const crossing = path.find((p, i) => i > 0 && path[i - 1].x < 0 && p.x >= 0);
    assert.ok(crossing, 'expected the path to cross x = 0');
    assert.ok(Math.abs(crossing.z) <= 1.5, `expected the crossing inside the gap, got z = ${crossing.z}`);
  });

  it('should return no path when the wall closes the area', () => {
    assert.equal(findWallPath(-5, 0, 5, 0, 1, closedWall), null);
  });

  it('should ignore boxes that are below the creature', () => {
    // Same wall, but its height range ends below the creature's body (y = 5 > maxY 3).
    const lowWall = [{ ...closedWall[0], maxY: 3 }];
    const path = findWallPath(-5, 0, 5, 0, 5, lowWall);
    assert.ok(path, 'expected a direct path when the box is below the creature');
  });
});

describe('wallNavigation - findWallDetourWaypoint', () => {
  it('should return a point on the near side of the wall, a few metres ahead', () => {
    const wp = findWallDetourWaypoint(-5, 0, 5, 0, 1, 3, wallWithGap);
    assert.ok(wp);
    assert.ok(wp.x < 0, 'the waypoint is still on the creature side of the wall');
    assert.ok(wp.x > -5 - 0.01, 'the waypoint lies ahead of the creature');
  });

  it('should return null when no detour exists', () => {
    assert.equal(findWallDetourWaypoint(-5, 0, 5, 0, 1, 3, closedWall), null);
  });
});
