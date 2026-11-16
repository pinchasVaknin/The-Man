// ============================================================================
// MODULE: World / Domain / Landmarks / Ancient Mine (tests)
// DESIGN: Checks the prop table against the floors and the collider list.
// SUMMARY: Solid props stand on solid floor, do not overlap, and each has a collider box.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_MINE_PROPS, MINE_PROP_KINDS, propHalfExtents } from './ancientMineProps';
import { sampleAncientMineFloor } from './ancientMineFloor';
import { ANCIENT_MINE_COLLIDER_BOXES } from './ancientMineWorld';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const SOLID_PROPS = ALL_MINE_PROPS.map((p, i) => ({ p, i })).filter(({ p }) => MINE_PROP_KINDS[p.kind].isSolid);
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Props
describe('ancientMineProps', () => {
  it('solidProps_WhenPlaced_ShouldStandOnStoneOrWoodFloor', () => {
    // Arrange
    const materials = SOLID_PROPS.map(({ p }) => ({ p, s: sampleAncientMineFloor(p.lx, p.lz) }));

    // Act
    const badlyPlaced = materials
      .filter(({ s }) => s === null || (s.material !== 'stone' && s.material !== 'wood'))
      .map(({ p, s }) => `${p.kind} (${p.lx}, ${p.lz}) on ${s?.material ?? 'rock'}`);

    // Assert
    assert.deepEqual(badlyPlaced, []);
  });

  it('solidProps_WhenComparedPairwise_ShouldNotOverlap', () => {
    // Arrange
    const boxes = SOLID_PROPS.map(({ p }) => ({ p, e: propHalfExtents(p) }));

    // Act
    const overlaps: string[] = [];
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const A = boxes[a];
        const B = boxes[b];
        const isOverlapping =
          Math.abs(A.p.lx - B.p.lx) < A.e.halfX + B.e.halfX && Math.abs(A.p.lz - B.p.lz) < A.e.halfZ + B.e.halfZ;
        if (isOverlapping) overlaps.push(`${A.p.kind}@(${A.p.lx},${A.p.lz}) x ${B.p.kind}@(${B.p.lx},${B.p.lz})`);
      }
    }

    // Assert
    assert.deepEqual(overlaps, []);
  });

  it('solidProps_WhenBuilt_ShouldEachHaveAColliderBox', () => {
    // Arrange
    const expectedIds = SOLID_PROPS.map(({ p, i }) => `ancient-mine-prop-${i}-${p.kind}`);

    // Act
    const missing = expectedIds.filter((id) => !ANCIENT_MINE_COLLIDER_BOXES.some((b) => b.id === id));

    // Assert
    assert.deepEqual(missing, []);
  });

  it('passageBanners_WhenPlacedAlongDragonDescent_ShouldFlankBothWestAndEastWalls', () => {
    // Arrange & Act
    const passageBanners = ALL_MINE_PROPS.filter(
      (p) => p.kind === 'banner' && p.lz >= 358 && p.lz <= 383,
    );
    const westBanners = passageBanners.filter((p) => p.lx < 0);
    const eastBanners = passageBanners.filter((p) => p.lx > 0);

    // Assert
    assert.equal(westBanners.length, 5);
    assert.equal(eastBanners.length, 5);
  });

  it('removedForgeAnvilShrines_WhenQueried_ShouldNotHaveSolidFixtureColliderBoxes', () => {
    // Arrange
    const removedFixtureIds = [
      'ancient-mine-fixture-forge-anvil-shrine-west',
      'ancient-mine-fixture-forge-anvil-shrine-east',
    ];

    // Act
    const present = removedFixtureIds.filter((id) =>
      ANCIENT_MINE_COLLIDER_BOXES.some((b) => b.id === id),
    );

    // Assert
    assert.deepEqual(present, []);
  });

  it('warRoomDescentAndChamberBanners_WhenPlaced_ShouldAdornCorridorStairsAndSanctum', () => {
    // Arrange & Act
    const warRoomBanners = ALL_MINE_PROPS.filter(
      (p) => p.kind === 'banner' && p.lx >= 80 && p.lz >= 194 && p.lz <= 276,
    );

    // Assert
    assert.ok(warRoomBanners.length >= 20);
  });
});
// #endregion

