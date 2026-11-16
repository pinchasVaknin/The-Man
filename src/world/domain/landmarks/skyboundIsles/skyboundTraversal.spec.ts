// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (tests)
// DESIGN: Proves traversal on the data with the player's real numbers: every route hop is
//         checked against the walking-jump arc, and every wind current is ridden by a small
//         simulated player (same gravity, jump, air control and `applySkyWind` as the game)
//         until it lands somewhere.
// SUMMARY: Route reachability, wind journeys end to end, the surface query's no-snap-up
//          rule, the bridge, the Cloud Maze graph and fall recovery.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SKY_BRIDGES, SKY_HARBOR } from './skyboundLayout';
import { SKY_CLOUDS, SKY_CLOUD_MAZE, SKY_REST_PLATFORMS, SKY_ROUTES, type IRouteHop } from './skyCloudRoutes';
import { resetSkyClouds } from './skyCloudSystem';
import { resetSkyWindFlowers, sampleSkyWindAt, setActivatedWindCoreCount } from './skyWindSystem';
import { createSkyFallTracker, skyboundSurfaceAt, updateSkyFallRecovery } from './skyboundSurface';
import { STAND_STILL, simulateSkyPlayer, type SimPilot } from './skyboundTestSim';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Player Limits
/**
 * Summary: Player movement numbers copied from playerPhysicsSystem.ts (unmounted, on foot).
 * Design: Copied rather than imported because they are private constants of the physics hot path.
 */
const PLAYER = {
  jumpVy: 6.25,
  gravity: 14.8,
  walkSpeed: 5.0,
  groundAccel: 15.0,
  airAccel: 5.5,
  fallDamageFromMps: 12.0,
} as const;

/** Summary: Fraction of the theoretical jump reach a "fair" route jump may use. */
const FAIR_JUMP_FRACTION = 0.85;
// #endregion

// #region Jump Arc
/** Horizontal reach (m) of a walking jump that lands `dy` metres higher, or 0 when out of reach. */
function walkingJumpReach(dy: number, launchVy: number): { reach: number; landingVy: number } {
  const disc = launchVy * launchVy - 2 * PLAYER.gravity * dy;
  if (disc < 0) return { reach: 0, landingVy: 0 };
  const airSec = (launchVy + Math.sqrt(disc)) / PLAYER.gravity;
  return { reach: PLAYER.walkSpeed * airSec, landingVy: launchVy - PLAYER.gravity * airSec };
}

function launchVyFrom(hop: IRouteHop): number {
  return hop.kind === 'bounce' ? hop.bounceVy ?? PLAYER.jumpVy : PLAYER.jumpVy;
}

function edgeGap(a: { x: number; z: number; radius: number }, b: { x: number; z: number; radius: number }): number {
  return Math.hypot(b.x - a.x, b.z - a.z) - a.radius - b.radius;
}
// #endregion

// #region Simulated Player
const simulate = simulateSkyPlayer;
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyWindFlowers();
  setActivatedWindCoreCount(0);
});

// #region Route Reachability
describe('sky cloud routes', () => {
  for (const route of SKY_ROUTES) {
    for (let i = 1; i < route.hops.length; i++) {
      const from = route.hops[i - 1];
      const to = route.hops[i];
      if (to.reachedByWind) continue;
      it(`${route.id}_Hop${i}_WhenJumpedAtWalkingSpeed_ShouldLandSafely`, () => {
        // Arrange
        const gap = edgeGap(from, to);
        // Act
        const arc = walkingJumpReach(to.y - from.y, launchVyFrom(from));
        // Assert
        assert.ok(gap <= arc.reach * FAIR_JUMP_FRACTION, `gap ${gap.toFixed(2)} m, reach ${arc.reach.toFixed(2)} m, dy ${(to.y - from.y).toFixed(2)} m`);
        assert.ok(-arc.landingVy < PLAYER.fallDamageFromMps, `lands at ${(-arc.landingVy).toFixed(1)} m/s`);
      });
    }
  }

  it('skyClouds_WhenComparedPairwise_ShouldNeverOverlap', () => {
    // Arrange
    const solids = [...SKY_CLOUDS, ...SKY_REST_PLATFORMS];
    // Act
    const overlaps = solids.flatMap((a, i) =>
      solids.slice(i + 1).filter((b) => Math.abs(a.y - b.y) < 3 && edgeGap(a, b) < 0.5).map((b) => `${a.id}/${b.id}`)
    );
    // Assert
    assert.deepEqual(overlaps, []);
  });
});
// #endregion

// #region Cloud Maze
describe('sky cloud maze', () => {
  const cells = SKY_CLOUD_MAZE.rows.flatMap((row, r) =>
    [...row].map((letter, c) => ({ letter, r, c })).filter((cell) => cell.letter !== '.')
  );

  it('cloudMaze_WhenExploredFromTheCrystalRim_ShouldReachEveryCell', () => {
    // Arrange: neighbours are orthogonal cells; the entry is the cell nearest the Crystal Isles.
    const key = (r: number, c: number): string => `${r},${c}`;
    const present = new Set(cells.map((cell) => key(cell.r, cell.c)));
    const entry = cells.reduce((best, cell) => (cell.r < best.r ? cell : best));
    const seen = new Set([key(entry.r, entry.c)]);
    const queue = [entry];
    // Act
    while (queue.length > 0) {
      const cell = queue.shift()!;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = key(cell.r + dr, cell.c + dc);
        if (present.has(k) && !seen.has(k)) {
          seen.add(k);
          queue.push({ letter: '', r: cell.r + dr, c: cell.c + dc });
        }
      }
    }
    // Assert
    assert.equal(seen.size, cells.length);
  });

  it('cloudMaze_WhenJumpingBetweenDiagonalCells_ShouldBeOutOfReach', () => {
    // Arrange
    const radius = SKY_CLOUDS.find((c) => c.routeId === 'cloud-maze')!.radius;
    const diagonalGap = Math.SQRT2 * SKY_CLOUD_MAZE.cellM - radius * 2;
    // Act
    const arc = walkingJumpReach(0, PLAYER.jumpVy);
    // Assert
    assert.ok(diagonalGap > arc.reach, `diagonal gap ${diagonalGap.toFixed(2)} m, reach ${arc.reach.toFixed(2)} m`);
  });

  it('cloudMaze_WhenEnteredFromTheCrystalRim_ShouldStartWithAFairJump', () => {
    // Arrange
    const entry = SKY_CLOUDS.filter((c) => c.routeId === 'cloud-maze').reduce((a, b) => (a.z < b.z ? a : b));
    const crystalRimGap = Math.hypot(entry.x - 875, entry.z + 12) - 24 - entry.radius;
    // Act
    const arc = walkingJumpReach(entry.y - 62, PLAYER.jumpVy);
    // Assert
    assert.ok(crystalRimGap <= arc.reach * FAIR_JUMP_FRACTION, `gap ${crystalRimGap.toFixed(2)} m`);
  });
});
// #endregion

// #region Wind Journeys
describe('sky wind journeys', () => {
  it('gardenToRuinsStream_WhenPlayerStandsInIt_ShouldLandOnTheRuins', () => {
    // Arrange
    const start = { x: 713.0, y: 71.0, z: 35.0 };
    // Act
    const end = simulate(start, STAND_STILL, 60);
    // Assert
    assert.equal(end.surface?.id, 'ancient-sky-ruins', `ended at (${end.x.toFixed(1)}, ${end.y.toFixed(1)}, ${end.z.toFixed(1)})`);
  });

  it('ruinsUpdraft_WhenPlayerRidesItAndWalksToTheExit_ShouldLandOnTheTopPlatform', () => {
    // Arrange: wait in the column, then walk toward the upper platform near the top.
    const start = { x: 752.0, y: 84.5, z: -120.0 };
    const pilot: SimPilot = (b) => (b.y > 91.0 ? { towardX: 762.0, towardZ: -121.0 } : null);
    // Act
    const end = simulate(start, pilot, 30);
    // Assert
    assert.equal(end.surface?.id, 'rest-ruins-updraft-top', `ended at (${end.x.toFixed(1)}, ${end.y.toFixed(1)}, ${end.z.toFixed(1)})`);
  });

  it('observatoryToCrystalStream_WhenPlayerStandsInIt_ShouldLandOnTheCrystalIsles', () => {
    // Arrange
    const start = { x: 813.0, y: 98.0, z: -105.0 };
    // Act
    const end = simulate(start, STAND_STILL, 60);
    // Assert
    assert.equal(end.surface?.id, 'crystal-isles', `ended at (${end.x.toFixed(1)}, ${end.y.toFixed(1)}, ${end.z.toFixed(1)})`);
  });

  it('stormVortex_WhenPlayerJumpsInFromTheLastStormCloud_ShouldLandOnStormIsland', () => {
    // Arrange
    const lastStorm = SKY_CLOUDS.filter((c) => c.routeId === 'storm-climb').reduce((a, b) => (a.x > b.x ? a : b));
    const start = { x: lastStorm.x, y: lastStorm.y, z: lastStorm.z };
    const pilot: SimPilot = (b) => {
      if (b.y > 113.0) return { towardX: 885.0, towardZ: -112.0 };
      if (b.x < 856.0) return { towardX: 858.0, towardZ: -112.0, jump: true };
      return null;
    };
    // Act
    const end = simulate(start, pilot, 40);
    // Assert
    assert.equal(end.surface?.id, 'storm-island', `ended at (${end.x.toFixed(1)}, ${end.y.toFixed(1)}, ${end.z.toFixed(1)})`);
  });

  it('observatoryDowndraft_WhenPlayerWalksOffTheSouthRim_ShouldGlideDownToSkyHarbor', () => {
    // Arrange
    const start = { x: 800.0, y: 98.0, z: -101.0 };
    const pilot: SimPilot = (b) => (b.grounded && b.y > 90 ? { towardX: 800.0, towardZ: -80.0 } : null);
    // Act
    const end = simulate(start, pilot, 60);
    // Assert
    assert.equal(end.surface?.id, SKY_HARBOR.id, `ended at (${end.x.toFixed(1)}, ${end.y.toFixed(1)}, ${end.z.toFixed(1)})`);
  });

  it('hiddenReturnStream_WhenPlayerStandsInIt_ShouldCarryThemBackToSkyHarbor', () => {
    // Arrange
    const start = { x: 796.0, y: 30.0, z: 53.0 };
    // Act
    const end = simulate(start, STAND_STILL, 60);
    // Assert
    assert.equal(end.surface?.id, SKY_HARBOR.id, `ended at (${end.x.toFixed(1)}, ${end.y.toFixed(1)}, ${end.z.toFixed(1)})`);
  });

  it('windspireShortcut_WhenNoWindCoresAreActive_ShouldNotLiftThePlayer', () => {
    // Arrange
    const start = { x: 782.0, y: 68.0, z: -58.0 };
    // Act
    const sample = sampleSkyWindAt(start.x, start.y, start.z, 0);
    // Assert
    assert.equal(sample, null);
  });

  it('windspireShortcut_WhenFourWindCoresAreActive_ShouldCarryThePlayerToTheObservatory', () => {
    // Arrange
    setActivatedWindCoreCount(4);
    const start = { x: 782.0, y: 68.0, z: -58.0 };
    // Act
    const end = simulate(start, STAND_STILL, 60);
    // Assert
    assert.equal(end.surface?.id, 'sky-observatory', `ended at (${end.x.toFixed(1)}, ${end.y.toFixed(1)}, ${end.z.toFixed(1)})`);
  });
});
// #endregion

// #region Surface Query
describe('skybound surface query', () => {
  it('skyboundSurfaceAt_WhenFeetAreAtTheTopOfTheWaterfallClimb_ShouldReturnTheHarborDeck', () => {
    // Arrange
    const climbTop = { x: 733.5, z: -35.0 };
    // Act
    const hit = skyboundSurfaceAt(climbTop.x, climbTop.z, 68.0);
    // Assert
    assert.deepEqual(hit, { y: 68.0, kind: 'island', id: SKY_HARBOR.id });
  });

  it('skyboundSurfaceAt_WhenFeetAreFarBelowAnIsland_ShouldNotSnapUpOntoIt', () => {
    // Arrange
    const underHub = { x: SKY_HARBOR.x, z: SKY_HARBOR.z, y: 50.0 };
    // Act
    const hit = skyboundSurfaceAt(underHub.x, underHub.z, underHub.y);
    // Assert
    assert.equal(hit, null);
  });

  it('skyboundSurfaceAt_WhenOnTheMiddleOfTheCrystalBridge_ShouldReturnAHeightBetweenItsEnds', () => {
    // Arrange
    const br = SKY_BRIDGES[0];
    // Act
    const hit = skyboundSurfaceAt((br.ax + br.bx) / 2, (br.az + br.bz) / 2, 70);
    // Assert
    assert.equal(hit?.id, br.id);
    assert.ok(Math.abs(hit!.y - (br.ay + br.by) / 2) < 1e-6, `bridge height ${hit?.y}`);
  });
});
// #endregion

// #region Fall Recovery
describe('sky fall recovery', () => {
  it('updateSkyFallRecovery_WhenPlayerFallsOffTheCloudRun_ShouldReturnThemToTheNearestIsland', () => {
    // Arrange
    const sut = createSkyFallTracker();
    const lastCloud = SKY_CLOUDS.filter((c) => c.routeId === 'cloud-run').at(-1)!;
    updateSkyFallRecovery(sut, lastCloud.x, lastCloud.y, lastCloud.z, true, true);
    // Act
    const checkpoint = updateSkyFallRecovery(sut, lastCloud.x, 20.0, lastCloud.z, false, false);
    // Assert
    assert.equal(checkpoint?.islandId, 'floating-garden');
  });

  it('updateSkyFallRecovery_WhenPlayerLastStoodOnOrdinaryGround_ShouldNotTeleport', () => {
    // Arrange
    const sut = createSkyFallTracker();
    updateSkyFallRecovery(sut, 733.5, 68.0, -35.0, true, true);
    updateSkyFallRecovery(sut, 707.0, 3.4, -35.0, true, false);
    // Act
    const checkpoint = updateSkyFallRecovery(sut, 707.0, -1.0, -35.0, false, false);
    // Assert
    assert.equal(checkpoint, null);
  });

  it('updateSkyFallRecovery_WhenPlayerIsStillAboveTheRecoveryHeight_ShouldWait', () => {
    // Arrange
    const sut = createSkyFallTracker();
    updateSkyFallRecovery(sut, 760.0, 68.0, -35.0, true, true);
    // Act
    const checkpoint = updateSkyFallRecovery(sut, 760.0, 40.0, -35.0, false, false);
    // Assert
    assert.equal(checkpoint, null);
  });
});
// #endregion
