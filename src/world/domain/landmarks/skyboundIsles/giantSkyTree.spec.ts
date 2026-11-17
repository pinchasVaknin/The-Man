// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles — Giant Sky Tree, part 1 (tests)
// DESIGN: Walks the spiral with the real surface query, a small step at a time and each step's
//         height passed as the feet height, the way the physics step does. A walk that loses the
//         surface anywhere, or that stops short of the top, fails.
// SUMMARY: The spiral can be walked from the islet to the top platform without a gap, the top is
//          reachable, and the trunk is solid.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SKY_TREE, SKY_TREE_GROTTO, SKY_TREE_GROTTO_MUSHROOM, SKY_TREE_GROTTO_WALLS, SKY_TREE_SPIRAL_RADIUS_M, SKY_TREE_TRUNK_BOX, SKY_TREE_TURNS } from './skyTreeLayout';
import { SKYBOUND_BOUNCE_PADS, SKYBOUND_SOLID_BOXES, skyBouncePadAt, skyboundSurfaceAt } from './skyboundSurface';
import { findNearestWorldChest } from '../interactionLandmarks';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const STEP_RAD = 0.02;
const TOTAL_ANGLE = 2 * Math.PI * SKY_TREE_TURNS;

/** The point on the spiral's centre line at angle theta. */
function spiralPoint(theta: number): { x: number; y: number; z: number } {
  const y = SKY_TREE.baseY + ((SKY_TREE.topY - SKY_TREE.baseY) * theta) / TOTAL_ANGLE;
  return {
    x: SKY_TREE.x + Math.cos(theta) * SKY_TREE_SPIRAL_RADIUS_M,
    y,
    z: SKY_TREE.z + Math.sin(theta) * SKY_TREE_SPIRAL_RADIUS_M,
  };
}
// #endregion

// ======================== TESTS ======================== \\
// #region Climb
describe('giant sky tree spiral', () => {
  it('spiral_WhenWalkedFromTheIsletInSmallSteps_ShouldNeverLoseTheSurface', () => {
    // Arrange
    let feetY = SKY_TREE.baseY;
    const gaps: string[] = [];
    // Act: follow the centre line, each step taking the height the player arrived at.
    for (let theta = 0; theta <= TOTAL_ANGLE; theta += STEP_RAD) {
      const p = spiralPoint(theta);
      const hit = skyboundSurfaceAt(p.x, p.z, feetY + 0.2);
      if (hit === null || Math.abs(hit.y - p.y) > 0.05) {
        gaps.push(`theta ${theta.toFixed(2)}: expected ${p.y.toFixed(2)}, got ${hit?.y.toFixed(2) ?? 'none'}`);
        break;
      }
      feetY = hit.y;
    }
    // Assert
    assert.deepEqual(gaps, []);
  });

  it('spiral_WhenWalkedToTheEnd_ShouldArriveAtTheTopPlatform', () => {
    // Arrange: walk the whole way, then stand at the trunk top.
    let feetY = SKY_TREE.baseY;
    for (let theta = 0; theta <= TOTAL_ANGLE; theta += STEP_RAD) {
      const p = spiralPoint(theta);
      feetY = skyboundSurfaceAt(p.x, p.z, feetY + 0.2)?.y ?? feetY;
    }
    // Act
    const top = skyboundSurfaceAt(SKY_TREE.x, SKY_TREE.z, feetY + 0.2);
    // Assert
    assert.ok(Math.abs(feetY - SKY_TREE.topY) < 0.2, `top reached at ${feetY.toFixed(2)}`);
    assert.equal(top?.y, SKY_TREE.topY);
  });

  it('spiral_WhenStartedOnTheIslet_ShouldBeWalkableFromTheIsletDeck', () => {
    // Arrange: the spiral's first point is at the islet deck, a little out from the trunk.
    const p = spiralPoint(0);
    // Act
    const hit = skyboundSurfaceAt(p.x, p.z, SKY_TREE.baseY + 0.2);
    // Assert
    assert.equal(hit?.y, SKY_TREE.baseY);
  });
});
// #endregion

// #region Trunk
describe('giant sky tree trunk', () => {
  it('trunk_WhenListedAsASolidBox_ShouldBlockTheCentreColumn', () => {
    // Arrange / Act
    const solid = SKYBOUND_SOLID_BOXES.find((b) => b.id === SKY_TREE_TRUNK_BOX.id);
    // Assert
    assert.ok(solid, 'the trunk must be a solid box');
    assert.ok(SKY_TREE.x >= solid.minX && SKY_TREE.x <= solid.maxX && SKY_TREE.z >= solid.minZ && SKY_TREE.z <= solid.maxZ);
  });
});
// #endregion

// #region Grotto
describe('giant sky tree mushroom grotto', () => {
  it('grottoWalls_WhenListedAsSolid_ShouldEncloseThreeSides', () => {
    // Arrange / Act
    const solid = SKY_TREE_GROTTO_WALLS.map((w) => SKYBOUND_SOLID_BOXES.some((b) => b.id === w.id));
    // Assert
    assert.deepEqual(solid, [true, true, true]);
  });

  it('grottoOpening_WhenStoodOnFromTheTrunkSide_ShouldBeWalkable', () => {
    // Arrange: just inside the open side, between the walls.
    const x = SKY_TREE_GROTTO.x;
    const z = -35.5;
    // Act
    const hit = skyboundSurfaceAt(x, z, SKY_TREE.baseY + 0.2);
    // Assert
    assert.equal(hit?.y, SKY_TREE.baseY);
  });

  it('grottoMushroom_WhenStoodOn_ShouldBeAVerticalBouncePad', () => {
    // Arrange
    const m = SKY_TREE_GROTTO_MUSHROOM;
    // Act
    const pad = skyBouncePadAt(m.x, m.topY, m.z);
    // Assert
    assert.equal(pad?.id, m.id);
    assert.ok(SKYBOUND_BOUNCE_PADS.some((p) => p.id === m.id));
    assert.ok(pad !== null && pad.bounceVy > 0);
    // The launch apex (v^2 / 2g, g = 14.8 m/s^2) must stay below the spiral's first turn 4 m above the grotto.
    assert.ok((m.bounceVy * m.bounceVy) / (2 * 14.8) < 3.0, 'the grotto bounce must not reach the spiral');
  });

  it('grottoChest_WhenStoodInside_ShouldBeOpenable', () => {
    // Arrange
    const x = 902.0;
    const z = -32.6;
    // Act
    const found = findNearestWorldChest(x, SKY_TREE.baseY, z);
    // Assert
    assert.equal(found?.id, 'chest-sky-tree-grotto');
  });
});
// #endregion
