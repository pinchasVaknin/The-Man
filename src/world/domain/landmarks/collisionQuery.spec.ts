import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOLID_BUILDING_BOXES,
  getNearbySolidBuildingBoxes,
  getSolidBuildingWorldAABB,
} from './collisionAndTerraces';

/** Brute-force reference: every box whose footprint overlaps the query square, in array order. */
function bruteForceNearby(x: number, z: number, radius: number) {
  return SOLID_BUILDING_BOXES.filter((box) => {
    const aabb = getSolidBuildingWorldAABB(box);
    return aabb.maxX >= x - radius && aabb.minX <= x + radius && aabb.maxZ >= z - radius && aabb.minZ <= z + radius;
  });
}

describe('collisionQuery - getNearbySolidBuildingBoxes', () => {
  it('should return every overlapping box in SOLID_BUILDING_BOXES order, matching a full scan', () => {
    // Deterministic pseudo-random sample points spread over the world, including large query radii
    // that span several grid cells (the case that used to return boxes in cell-scan order).
    let seed = 12345;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 300; i++) {
      const x = (next() - 0.5) * 900;
      const z = (next() - 0.5) * 900;
      const radius = 1 + next() * 60;

      // The grid returns candidates from the cells the query touches, so it may include extra boxes.
      // It must include every real overlap, and keep SOLID_BUILDING_BOXES order.
      const fromGrid = getNearbySolidBuildingBoxes(x, z, radius);
      const expected = bruteForceNearby(x, z, radius);
      const indices = fromGrid.map((box) => SOLID_BUILDING_BOXES.indexOf(box));
      const where = `(${x.toFixed(1)}, ${z.toFixed(1)}) r=${radius.toFixed(1)}`;

      for (const box of expected) {
        assert.ok(fromGrid.includes(box), `Query at ${where} is missing overlapping box ${box.id}`);
      }
      assert.ok(
        indices.every((v, i) => i === 0 || indices[i - 1] < v),
        `Query at ${where} must keep array order`
      );
    }
  });
});
