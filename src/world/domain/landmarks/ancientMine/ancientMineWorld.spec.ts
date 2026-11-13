// ============================================================================
// MODULE: World / Domain / Landmarks / Ancient Mine (tests)
// DESIGN: Checks the world-space adapters the game calls, through their public functions only.
// SUMMARY: Inside/outside decisions, floor and water heights in world space, and the
//          collider boxes generated from the guard rails.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ANCIENT_MINE_ORIGIN, MINE_GUARD_RAILS, MINE_LEVEL_Y, MINE_POI } from './ancientMineLayout';
import {
  ANCIENT_MINE_COLLIDER_BOXES,
  ancientMineWalkableHeightAt,
  ancientMineWaterSurfaceAt,
  isInsideAncientMine,
} from './ancientMineWorld';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
/** Summary: World coordinates of a named local point of interest. */
function worldOf(poi: { lx: number; lz: number }): { x: number; z: number } {
  return { x: ANCIENT_MINE_ORIGIN.x + poi.lx, z: ANCIENT_MINE_ORIGIN.z + poi.lz };
}
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Inside And Heights
describe('ancientMineWorld - world adapters', () => {
  it('isInsideAncientMine_WhenStandingOnBridge_ShouldBeTrue', () => {
    // Arrange
    const { x, z } = worldOf(MINE_POI.bridgeMid);

    // Act
    const isInside = isInsideAncientMine(x, z, MINE_LEVEL_Y.chasmLedge);

    // Assert
    assert.equal(isInside, true);
  });

  it('isInsideAncientMine_WhenWalkingOnGroundAboveChasm_ShouldBeFalse', () => {
    // Arrange
    const { x, z } = worldOf(MINE_POI.bridgeMid);
    const surfaceFeetY = 0.2;

    // Act
    const isInside = isInsideAncientMine(x, z, surfaceFeetY);

    // Assert
    assert.equal(isInside, false);
  });

  it('ancientMineWalkableHeightAt_WhenOnBridge_ShouldReturnDeckHeight', () => {
    // Arrange
    const { x, z } = worldOf(MINE_POI.bridgeMid);

    // Act
    const height = ancientMineWalkableHeightAt(x, z, MINE_LEVEL_Y.chasmLedge);

    // Assert
    assert.equal(height, MINE_LEVEL_Y.chasmLedge);
  });

  it('ancientMineWaterSurfaceAt_WhenSwimmingInLagoon_ShouldReturnLagoonSurface', () => {
    // Arrange
    const { x, z } = worldOf(MINE_POI.lagoonCentre);

    // Act
    const water = ancientMineWaterSurfaceAt(x, z, MINE_LEVEL_Y.lagoonWater - 0.5);

    // Assert
    assert.equal(water, MINE_LEVEL_Y.lagoonWater);
  });

  it('ancientMineWaterSurfaceAt_WhenOnDryHallFloor_ShouldReturnNull', () => {
    // Arrange
    const { x, z } = worldOf(MINE_POI.turntable);

    // Act
    const water = ancientMineWaterSurfaceAt(x, z, MINE_LEVEL_Y.upperCavern);

    // Assert
    assert.equal(water, null);
  });
});
// #endregion

// #region Rock Cover
describe('ancientMineWorld - rock cover', () => {
  it('ceiling_WhenSampledAcrossTheMine_ShouldStayBelowTheGroundSurfaceAbove', async () => {
    // Arrange
    const { groundHeightAt } = await import('../../../systems/terrainAndBiomeSystem');
    const { sampleAncientMineLayer } = await import('./ancientMineFloor');
    const minRoof = 0.5;
    const gateOpenUntilLz = 4;
    const exposed: string[] = [];

    // Act
    for (let lz = gateOpenUntilLz; lz <= 458; lz += 2) {
      for (let lx = -112; lx <= 126; lx += 2) {
        const sample = sampleAncientMineLayer(lx, lz, 0);
        if (sample === null) continue;
        const ground = groundHeightAt(ANCIENT_MINE_ORIGIN.x + lx, ANCIENT_MINE_ORIGIN.z + lz);
        if (sample.ceilingY > ground - minRoof) exposed.push(`(${lx}, ${lz}) ceiling ${sample.ceilingY} ground ${ground.toFixed(1)}`);
      }
    }

    // Assert
    assert.deepEqual(exposed.slice(0, 40), []);
  });
});
// #endregion

// #region Loot In The Mine
describe('ancientMineWorld - loot placement', () => {
  it('mineChests_WhenPlaced_ShouldEachStandOnAMineFloorAtTheirHeight', async () => {
    // Arrange
    const { WORLD_CHESTS } = await import('../interactionLandmarks');
    const mineChests = WORLD_CHESTS.filter((c) => c.id.startsWith('crate-mine-') || c.id.startsWith('chest-mine-') || c.id.startsWith('chest-moria-'));

    // Act
    const misplaced = mineChests
      .filter((c) => !isInsideAncientMine(c.x, c.z, c.y) || Math.abs(ancientMineWalkableHeightAt(c.x, c.z, c.y + 0.5) - c.y) > 0.2)
      .map((c) => `${c.id} at (${c.x.toFixed(1)}, ${c.y.toFixed(2)}, ${c.z.toFixed(1)})`);

    // Assert
    assert.deepEqual({ count: mineChests.length, misplaced }, { count: 10, misplaced: [] });
  });
});
// #endregion

// #region Colliders
describe('ancientMineWorld - guard rail colliders', () => {
  it('colliders_WhenBuilt_ShouldHaveOneBoxPerRailCrossingItsLine', () => {
    // Arrange
    const rail = MINE_GUARD_RAILS.find((r) => r.id === 'bridge-east')!;

    // Act
    const box = ANCIENT_MINE_COLLIDER_BOXES.find((b) => b.id === `ancient-mine-rail-${rail.id}`);

    // Assert
    assert.deepEqual(
      box && {
        crossesLine: box.minX < ANCIENT_MINE_ORIGIN.x + rail.at && box.maxX > ANCIENT_MINE_ORIGIN.x + rail.at,
        minZ: box.minZ,
        maxZ: box.maxZ,
        minY: box.minY,
        maxY: box.maxY,
      },
      {
        crossesLine: true,
        minZ: ANCIENT_MINE_ORIGIN.z + rail.from,
        maxZ: ANCIENT_MINE_ORIGIN.z + rail.to,
        minY: rail.minY,
        maxY: rail.maxY,
      }
    );
  });

  it('colliders_WhenBuilt_ShouldCoverEveryRail', () => {
    // Arrange
    const railIds = MINE_GUARD_RAILS.map((r) => `ancient-mine-rail-${r.id}`);

    // Act
    const missing = railIds.filter((id) => !ANCIENT_MINE_COLLIDER_BOXES.some((b) => b.id === id));

    // Assert
    assert.deepEqual(missing, []);
  });
});
// #endregion
