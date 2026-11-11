import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SOLID_BUILDING_BOXES } from './collisionAndTerraces';
import { SOUTHERN_MINE_POS } from './dwarvenLandmarks';
import { MINE_HOIST_CRANE } from './dwarvenMineLayout';

describe('dwarvenMineLayout - hoist crane colliders', () => {
  it('should place one collider per model post, centred on the layout post position', () => {
    const posts = SOLID_BUILDING_BOXES.filter((b) => b.id.startsWith('southern-mine-hoist-crane-tower-post-'));
    assert.equal(posts.length, 4, 'Expected four corner post colliders');

    const expectedCentres: Array<[number, number]> = [];
    for (const px of [-MINE_HOIST_CRANE.postSpan, MINE_HOIST_CRANE.postSpan]) {
      for (const pz of [-MINE_HOIST_CRANE.postSpan, MINE_HOIST_CRANE.postSpan]) {
        expectedCentres.push([
          SOUTHERN_MINE_POS.x + MINE_HOIST_CRANE.offsetX + px,
          SOUTHERN_MINE_POS.entranceZ + MINE_HOIST_CRANE.offsetZ + pz,
        ]);
      }
    }

    for (const [cx, cz] of expectedCentres) {
      const match = posts.find(
        (b) => Math.abs((b.minX + b.maxX) / 2 - cx) < 1e-9 && Math.abs((b.minZ + b.maxZ) / 2 - cz) < 1e-9
      );
      assert.ok(match, `No post collider centred at (${cx}, ${cz})`);
      assert.ok(Math.abs(match.maxX - match.minX - 2 * MINE_HOIST_CRANE.postHalfSize) < 1e-9);
      assert.equal(match.maxY, SOUTHERN_MINE_POS.catwalkY + MINE_HOIST_CRANE.towerHeight);
    }
  });
});
