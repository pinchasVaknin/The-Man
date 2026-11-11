import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SOLID_BUILDING_BOXES } from './collisionAndTerraces';
import { SOUTHERN_MINE_POS } from './dwarvenLandmarks';
import { MINE_FLOOR_TORCH_STANDS, MINE_LAGOON_COLUMN } from './dwarvenMineLayout';

describe('dwarvenMineLayout - floor torch stands and lagoon column colliders', () => {
  it('should give every floor torch stand a collider centred on its layout position, from its base to its top', () => {
    const torches = SOLID_BUILDING_BOXES.filter((b) => b.id.startsWith('southern-mine-floor-torch-'));
    assert.equal(torches.length, MINE_FLOOR_TORCH_STANDS.length);

    for (const t of MINE_FLOOR_TORCH_STANDS) {
      const cx = SOUTHERN_MINE_POS.x + t.lx;
      const cz = SOUTHERN_MINE_POS.entranceZ + t.lz;
      const match = torches.find(
        (b) => Math.abs((b.minX + b.maxX) / 2 - cx) < 1e-9 && Math.abs((b.minZ + b.maxZ) / 2 - cz) < 1e-9
      );
      assert.ok(match, `No torch stand collider centred at (${cx}, ${cz})`);
      assert.equal(match.minY, t.baseY);
      assert.equal(match.maxY, t.baseY + 2.75);
    }
  });

  it('should give the lagoon column a collider from its base to its top', () => {
    const column = SOLID_BUILDING_BOXES.find((b) => b.id === 'southern-mine-lagoon-column');
    assert.ok(column, 'Expected the lagoon column collider');
    assert.equal(column.minY, MINE_LAGOON_COLUMN.baseY);
    assert.equal(column.maxY, MINE_LAGOON_COLUMN.baseY + MINE_LAGOON_COLUMN.height);
    assert.ok(Math.abs(column.maxX - column.minX - 2 * MINE_LAGOON_COLUMN.halfW) < 1e-9);
  });
});
