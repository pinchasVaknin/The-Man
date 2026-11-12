import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDwarvenMinerCaravanState } from './dwarvenMineAndCaravanSystem';
import { walkableHeightValueAt } from './terrainAndBiomeSystem';

describe('dwarf route stands on the floor (DW1)', () => {
  it('should keep a dwarf on the floor under it along its sunrise route when a floor query is given', () => {
    let worst = 0;
    for (let dwarf = 0; dwarf < 8; dwarf++) {
      for (let h = 6.0; h <= 7.6; h += 0.05) {
        const st = computeDwarvenMinerCaravanState(h, dwarf, 0, (x, z, hintY) => walkableHeightValueAt(x, z, hintY));
        const floor = walkableHeightValueAt(st.x, st.z, st.y);
        worst = Math.max(worst, Math.abs(st.y - floor));
      }
    }
    assert.ok(worst < 0.3, `expected the dwarf on the floor (worst gap ${worst.toFixed(2)} m)`);
  });

  it('should keep the route height unchanged when no floor query is given', () => {
    const a = computeDwarvenMinerCaravanState(6.6, 0, 0);
    const b = computeDwarvenMinerCaravanState(6.6, 0, 0, (_x, _z, hintY) => hintY);
    assert.equal(a.y, b.y);
  });
});
