import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SOLID_BUILDING_BOXES } from './collisionAndTerraces';
import { SOUTHERN_MINE_POS } from './dwarvenLandmarks';
import { MINE_SCAFFOLD_LEGS } from './dwarvenMineLayout';

describe('dwarvenMineLayout - scaffold leg colliders', () => {
  it('should give every model leg a collider centred on its layout position, standing on the cavern floor', () => {
    const legs = SOLID_BUILDING_BOXES.filter((b) => b.id.startsWith('southern-mine-scaffold-leg-'));
    assert.equal(legs.length, MINE_SCAFFOLD_LEGS.positions.length);

    for (const [lx, lz] of MINE_SCAFFOLD_LEGS.positions) {
      const cx = SOUTHERN_MINE_POS.x + lx;
      const cz = SOUTHERN_MINE_POS.entranceZ + lz;
      const match = legs.find(
        (b) => Math.abs((b.minX + b.maxX) / 2 - cx) < 1e-9 && Math.abs((b.minZ + b.maxZ) / 2 - cz) < 1e-9
      );
      assert.ok(match, `No scaffold leg collider centred at (${cx}, ${cz})`);
      assert.equal(match.minY, SOUTHERN_MINE_POS.cavernFloorY);
      assert.equal(match.maxY, SOUTHERN_MINE_POS.cavernFloorY + MINE_SCAFFOLD_LEGS.height);
    }
  });
});
