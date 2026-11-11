import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SOLID_BUILDING_BOXES } from './collisionAndTerraces';
import { SOUTHERN_MINE_POS } from './dwarvenLandmarks';
import { MINE_FLOOR_TORCH_STANDS, mineFloorY } from './dwarvenMineLayout';

describe('dwarvenMineLayout - floor torch stand colliders', () => {
  it('should give every floor torch stand a collider centred on its layout position, from its floor to its top', () => {
    const torches = SOLID_BUILDING_BOXES.filter((b) => b.id.startsWith('southern-mine-floor-torch-'));
    assert.equal(torches.length, MINE_FLOOR_TORCH_STANDS.length);

    for (const t of MINE_FLOOR_TORCH_STANDS) {
      const cx = SOUTHERN_MINE_POS.x + t.lx;
      const cz = SOUTHERN_MINE_POS.entranceZ + t.lz;
      const baseY = mineFloorY(t.floor) + t.lift;
      const match = torches.find(
        (b) => Math.abs((b.minX + b.maxX) / 2 - cx) < 1e-9 && Math.abs((b.minZ + b.maxZ) / 2 - cz) < 1e-9
      );
      assert.ok(match, `No torch stand collider centred at (${cx}, ${cz})`);
      assert.equal(match.minY, baseY);
      assert.equal(match.maxY, baseY + 2.75);
    }
  });

  it('should not give the lagoon waterfall sheet a collider', () => {
    const waterfall = SOLID_BUILDING_BOXES.filter((b) => b.id.includes('waterfall') && b.id.includes('column'));
    assert.equal(waterfall.length, 0);
  });
});
