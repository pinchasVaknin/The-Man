// ============================================================================
// MODULE: World / Domain / Landmarks / Ancient Mine (tests)
// DESIGN: Walks the layout on a 0.5 m grid with the player's real step and jump limits,
//         so "connected" and "reachable" are proven on the data, not by eye.
// SUMMARY: Checks floor queries, stacked floors, full-route reachability, guarded edges,
//          climbable stairs and fair lava jumps of the Ancient Dwarven Mine layout.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LAVA_POOL,
  LAVA_STEPPING_STONES,
  MINE_LEVEL_Y,
  MINE_POI,
  MINE_SURFACES,
  TREASURE_ISLAND,
} from './ancientMineLayout';
import { isGuardRailBetween, sampleAncientMineFloor } from './ancientMineFloor';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Player Limits
/**
 * Summary: Player movement numbers copied from playerPhysicsSystem.ts (unmounted, on foot).
 * Design: Copied rather than imported because they are private constants of the physics hot path.
 */
const PLAYER = {
  maxStepUp: 0.56,
  maxSwimStepUp: 1.15,
  jumpVy: 6.25,
  gravity: 14.8,
  walkSpeed: 5.0,
} as const;

/** Summary: Fraction of the theoretical jump reach a "fair" jump may use. */
const FAIR_JUMP_FRACTION = 0.75;

/** Summary: Largest rise a single stair step may have, in meters. */
const MAX_STAIR_RISE = 0.35;

const GRID = 0.5;
const GRID_BOUNDS = { minLx: -120, maxLx: 126, minLz: -4, maxLz: 514 } as const;

/** Summary: Surfaces nobody should reach on foot from the gate: hazards and the jump-only route. */
const NOT_WALKABLE_SURFACE_IDS = new Set<string>([
  ...MINE_SURFACES.filter((s) => s.material === 'abyss' || s.material === 'lava').map((s) => s.id),
  'treasure-island',
  ...LAVA_STEPPING_STONES.map((_, i) => `lava-stone-${i + 1}`),
]);
// #endregion

// #region Walk Flood
interface IWalkResult {
  readonly reachedSurfaceIds: ReadonlySet<string>;
  readonly unguardedDrops: readonly string[];
}

/**
 * Summary: Floods the layout from the gate on foot, never falling, and records every edge where
 *          a fall bigger than a step would be possible without a guard rail.
 */
function floodWalkFromGate(): IWalkResult {
  const reachedSurfaceIds = new Set<string>();
  const unguardedDrops: string[] = [];
  const seen = new Set<string>();
  const start = sampleAncientMineFloor(MINE_POI.gate.lx, MINE_POI.gate.lz, MINE_LEVEL_Y.entrance);
  if (start === null) return { reachedSurfaceIds, unguardedDrops: ['gate has no floor'] };

  const queue: Array<{ lx: number; lz: number; y: number; isSwimming: boolean }> = [
    { lx: snap(MINE_POI.gate.lx), lz: snap(MINE_POI.gate.lz), y: start.height, isSwimming: false },
  ];
  const steps: ReadonlyArray<readonly [number, number]> = [[GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID]];

  while (queue.length > 0) {
    const cur = queue.pop()!;
    for (const [dx, dz] of steps) {
      const nx = cur.lx + dx;
      const nz = cur.lz + dz;
      if (nx < GRID_BOUNDS.minLx || nx > GRID_BOUNDS.maxLx || nz < GRID_BOUNDS.minLz || nz > GRID_BOUNDS.maxLz) continue;
      const next = sampleAncientMineFloor(nx, nz, cur.y);
      if (next === null) continue;
      const isWater = next.material === 'water';
      const nextY = isWater && next.waterSurfaceY !== null ? next.waterSurfaceY : next.height;
      const isRailed = isGuardRailBetween(cur.lx, cur.lz, nx, nz, cur.y);
      const drop = cur.y - nextY;
      const isHazard = next.material === 'lava';
      if (drop > PLAYER.maxStepUp && !isWater && !isHazard && !isRailed) {
        unguardedDrops.push(`${next.surfaceId} at (${nx}, ${nz}) drop ${drop.toFixed(2)}`);
      }
      const rise = nextY - cur.y;
      const riseLimit = cur.isSwimming ? PLAYER.maxSwimStepUp : PLAYER.maxStepUp;
      const canEnter =
        !isRailed && !isHazard && next.material !== 'abyss' && rise <= riseLimit && (drop <= PLAYER.maxStepUp || isWater);
      if (!canEnter) continue;
      const key = `${nx},${nz},${Math.round(nextY * 10)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      reachedSurfaceIds.add(next.surfaceId);
      queue.push({ lx: nx, lz: nz, y: nextY, isSwimming: isWater });
    }
  }
  return { reachedSurfaceIds, unguardedDrops };
}

/** Summary: Snaps a coordinate to a grid cell centre (centres sit at k*GRID + GRID/2). */
function snap(v: number): number {
  return Math.floor(v / GRID) * GRID + GRID / 2;
}

/** Summary: Horizontal distance a walking jump covers when it lands dh meters higher. */
function walkingJumpReach(dh: number): number {
  const v = PLAYER.jumpVy;
  const airTime = (v + Math.sqrt(v * v - 2 * PLAYER.gravity * dh)) / PLAYER.gravity;
  return PLAYER.walkSpeed * airTime;
}

/** Summary: Every jump of the treasure route as (edge gap, rise), shore to island. */
function treasureRouteJumps(): Array<{ name: string; gap: number; rise: number }> {
  const jumps: Array<{ name: string; gap: number; rise: number }> = [];
  const first = LAVA_STEPPING_STONES[0];
  jumps.push({
    name: 'shore -> stone 1',
    gap: first.lz - first.r - LAVA_POOL.minLz,
    rise: first.topY - MINE_LEVEL_Y.forgeFloor,
  });
  const platforms = [...LAVA_STEPPING_STONES, TREASURE_ISLAND];
  for (let i = 1; i < platforms.length; i++) {
    const a = platforms[i - 1];
    const b = platforms[i];
    jumps.push({
      name: `platform ${i} -> ${i + 1}`,
      gap: Math.hypot(b.lx - a.lx, b.lz - a.lz) - a.r - b.r,
      rise: b.topY - a.topY,
    });
  }
  return jumps;
}
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Floor Queries
describe('ancientMineFloor - floor queries', () => {
  it('sampleAncientMineFloor_WhenOnBridgeMiddle_ShouldReturnStoneAtLedgeHeight', () => {
    // Arrange
    const { lx, lz } = MINE_POI.bridgeMid;

    // Act
    const sample = sampleAncientMineFloor(lx, lz, MINE_LEVEL_Y.chasmLedge);

    // Assert
    assert.deepEqual(
      sample && { id: sample.surfaceId, height: sample.height, material: sample.material },
      { id: 'great-bridge', height: MINE_LEVEL_Y.chasmLedge, material: 'stone' }
    );
  });

  it('sampleAncientMineFloor_WhenBesideBridgeOverAbyss_ShouldReturnAbyss', () => {
    // Arrange
    const lx = MINE_POI.bridgeMid.lx + 12;

    // Act
    const sample = sampleAncientMineFloor(lx, MINE_POI.bridgeMid.lz, MINE_LEVEL_Y.chasmLedge);

    // Assert
    assert.equal(sample?.material, 'abyss');
  });

  it('sampleAncientMineFloor_WhenAskedFromBridgeUnderKingBalcony_ShouldReturnBridgeLanding', () => {
    // Arrange
    const { lx, lz } = MINE_POI.kingBalcony;

    // Act
    const sample = sampleAncientMineFloor(lx, lz, MINE_LEVEL_Y.chasmLedge + 0.1);

    // Assert
    assert.equal(sample?.surfaceId, 'bridge-south-landing');
  });

  it('sampleAncientMineFloor_WhenAskedFromKingBalconyHeight_ShouldReturnKingBalcony', () => {
    // Arrange
    const { lx, lz } = MINE_POI.kingBalcony;

    // Act
    const sample = sampleAncientMineFloor(lx, lz, MINE_LEVEL_Y.kingBalcony + 0.1);

    // Assert
    assert.equal(sample?.surfaceId, 'king-balcony');
  });

  it('sampleAncientMineFloor_WhenInLavaPoolOffTheStones_ShouldReturnLava', () => {
    // Arrange
    const lx = LAVA_POOL.minLx + 4;

    // Act
    const sample = sampleAncientMineFloor(lx, MINE_POI.treasureChest.lz, MINE_LEVEL_Y.forgeFloor);

    // Assert
    assert.equal(sample?.material, 'lava');
  });

  it('sampleAncientMineFloor_WhenInLagoon_ShouldReportWaterSurface', () => {
    // Arrange
    const { lx, lz } = MINE_POI.lagoonCentre;

    // Act
    const sample = sampleAncientMineFloor(lx, lz, MINE_LEVEL_Y.upperCavern);

    // Assert
    assert.deepEqual(
      sample && { material: sample.material, water: sample.waterSurfaceY },
      { material: 'water', water: MINE_LEVEL_Y.lagoonWater }
    );
  });
});
// #endregion

// #region Route Reachability
describe('ancientMineFloor - walking the whole mine from the gate', () => {
  const walk = floodWalkFromGate();

  it('floodWalk_WhenStartingAtGate_ShouldReachEveryWalkableSurface', () => {
    // Arrange
    const expected = MINE_SURFACES.map((s) => s.id).filter((id) => !NOT_WALKABLE_SURFACE_IDS.has(id));

    // Act
    const missing = expected.filter((id) => !walk.reachedSurfaceIds.has(id));

    // Assert
    assert.deepEqual(missing, []);
  });

  it('floodWalk_WhenStartingAtGate_ShouldNeverFindAnUnguardedDrop', () => {
    // Arrange
    const sampleOfDrops = walk.unguardedDrops.slice(0, 10);

    // Act
    const count = walk.unguardedDrops.length;

    // Assert
    assert.equal(count, 0, sampleOfDrops.join('\n'));
  });

  it('floodWalk_WhenStartingAtGate_ShouldNotReachTreasureIslandWithoutJumping', () => {
    // Arrange
    const islandId = 'treasure-island';

    // Act
    const isReached = walk.reachedSurfaceIds.has(islandId);

    // Assert
    assert.equal(isReached, false);
  });
});
// #endregion

// #region Stairs And Jumps
describe('ancientMineFloor - stairs and lava jumps', () => {
  it('stairs_WhenMeasuredPerStep_ShouldRiseNoMoreThanAComfortableStep', () => {
    // Arrange
    const stairs = MINE_SURFACES.flatMap((s) => (s.height.kind === 'stairs' ? [{ id: s.id, h: s.height }] : []));

    // Act
    const tooSteep = stairs
      .filter(({ h }) => Math.abs(h.yTo - h.yFrom) / h.stepCount > MAX_STAIR_RISE)
      .map(({ id }) => id);

    // Assert
    assert.deepEqual(tooSteep, []);
  });

  it('treasureRoute_WhenEachJumpIsChecked_ShouldStayWithinAFairWalkingJump', () => {
    // Arrange
    const jumps = treasureRouteJumps();

    // Act
    const unfair = jumps
      .filter((j) => j.gap > FAIR_JUMP_FRACTION * walkingJumpReach(j.rise) || j.gap <= 0)
      .map((j) => `${j.name}: gap ${j.gap.toFixed(2)} rise ${j.rise.toFixed(2)}`);

    // Assert
    assert.deepEqual(unfair, []);
  });
});
// #endregion

// ======================== EDGE CASES & INFRASTRUCTURE FAILURES ======================== \\
// #region Outside The Mine
describe('ancientMineFloor - outside the mine', () => {
  it('sampleAncientMineFloor_WhenInSolidRockBetweenAreas_ShouldReturnNull', () => {
    // Arrange
    const lx = 40;
    const lz = 300;

    // Act
    const sample = sampleAncientMineFloor(lx, lz, MINE_LEVEL_Y.chasmLedge);

    // Assert
    assert.equal(sample, null);
  });

  it('isGuardRailBetween_WhenCrossingBridgeEdgeAtDeckHeight_ShouldBeTrue', () => {
    // Arrange
    const lz = MINE_POI.bridgeMid.lz;

    // Act
    const isRailed = isGuardRailBetween(4.75, lz, 5.25, lz, MINE_LEVEL_Y.chasmLedge);

    // Assert
    assert.equal(isRailed, true);
  });

  it('isGuardRailBetween_WhenWalkingUnderKingBalconyRail_ShouldBeFalse', () => {
    // Arrange
    const lx = 0;

    // Act
    const isRailed = isGuardRailBetween(lx, 292.75, lx, 293.25, MINE_LEVEL_Y.chasmLedge);

    // Assert
    assert.equal(isRailed, false);
  });
});
// #endregion
