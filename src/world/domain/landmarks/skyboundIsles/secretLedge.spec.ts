// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles — Secret ledge (tests)
// DESIGN: The phantom path is checked through the live cloud runtimes and the Wind Core
//         puzzle state, the same calls the physics step makes, so "hidden until three cores"
//         is proven in the real rules rather than in the layout data.
// SUMMARY: The path stays hidden and not solid below three cores, appears at three, starts
//          from an open stretch of the Observatory rim, and its chest stands on the ledge.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SECRET_LEDGE, SECRET_PATH_REQUIRED_CORES, SKY_CLOUDS, SKY_ROUTES } from './skyCloudRoutes';
import { getSkyCloudRuntimes, resetSkyClouds, skyCloudSurfaceAt, stepSkyClouds } from './skyCloudSystem';
import { activateSkyMechanism, resetSkyPuzzles } from './skyPuzzles';
import { WIND_CORES } from './windCoresLayout';
import { skyboundSurfaceAt, SKYBOUND_SOLID_BOXES } from './skyboundSurface';
import { WORLD_CHESTS } from '../interactionLandmarks';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const PATH_CLOUDS = SKY_CLOUDS.filter((c) => c.routeId === 'secret-ledge');
/** A player far from the path, so stepping the clouds never loads them. */
const AWAY = { x: 0, y: 0, z: 0 };

function activateCores(count: number): void {
  WIND_CORES.slice(0, count).forEach((c) => activateSkyMechanism(c.id));
}

/** Steps the clouds to a moment when the given phantom cloud is fully present in its cycle. */
function stepToPresentMoment(phase: number): void {
  stepSkyClouds(1 / 60, 1.0 - phase, AWAY.x, AWAY.y, AWAY.z, 0);
}
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyPuzzles();
});

// #region Wind Core Gate
describe('phantom path to the secret ledge', () => {
  it('secretPath_WhenFewerThanThreeCoresAreActive_ShouldStayHiddenAndNotSolid', () => {
    // Arrange
    activateCores(SECRET_PATH_REQUIRED_CORES - 1);
    // Act
    const seen = PATH_CLOUDS.map((c) => {
      stepToPresentMoment(c.phase);
      const rt = getSkyCloudRuntimes().find((r) => r.def.id === c.id)!;
      return { presence: rt.presence, standable: skyCloudSurfaceAt(c.x, c.z, c.y + 0.2) !== null };
    });
    // Assert
    assert.ok(PATH_CLOUDS.length >= 2, `${PATH_CLOUDS.length} clouds`);
    assert.deepEqual(seen, PATH_CLOUDS.map(() => ({ presence: 0, standable: false })));
  });

  it('secretPath_WhenThreeCoresAreActive_ShouldAppearAndCarryThePlayer', () => {
    // Arrange
    activateCores(SECRET_PATH_REQUIRED_CORES);
    // Act
    const seen = PATH_CLOUDS.map((c) => {
      stepToPresentMoment(c.phase);
      const rt = getSkyCloudRuntimes().find((r) => r.def.id === c.id)!;
      return { presence: rt.presence, standable: skyCloudSurfaceAt(c.x, c.z, c.y + 0.2)?.cloud.def.id === c.id };
    });
    // Assert
    assert.deepEqual(seen, PATH_CLOUDS.map(() => ({ presence: 1, standable: true })));
  });

  it('secretPath_WhenLeavingTheObservatoryRim_ShouldHaveNoWallInTheWay', () => {
    // Arrange: sample the line from just inside the rim to the first cloud, at body height.
    const route = SKY_ROUTES.find((r) => r.id === 'secret-ledge')!;
    const rim = route.hops[0];
    const first = route.hops[1];
    const blocking = new Set<string>();
    // Act
    for (let i = -10; i <= 10; i++) {
      const u = i / 10;
      const x = rim.x + (first.x - rim.x) * u;
      const z = rim.z + (first.z - rim.z) * u;
      for (const b of SKYBOUND_SOLID_BOXES) {
        const inside = x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && rim.y + 1.0 >= b.minY && rim.y + 1.0 <= b.maxY;
        if (inside) blocking.add(b.id);
      }
    }
    // Assert: the rim itself is walkable deck and nothing solid stands on the way out.
    assert.equal(skyboundSurfaceAt(rim.x - (first.x - rim.x) * 0.05, rim.z - (first.z - rim.z) * 0.05, rim.y + 0.2)?.y, rim.y);
    assert.deepEqual([...blocking], []);
  });

  it('secretLedgeChest_WhenPlaced_ShouldStandOnTheLedge', () => {
    // Arrange
    const chest = WORLD_CHESTS.find((c) => c.id === 'chest-sky-secret-ledge')!;
    // Act
    const surface = skyboundSurfaceAt(chest.x, chest.z, chest.y + 0.5);
    // Assert
    assert.deepEqual({ id: surface?.id, y: surface?.y }, { id: SECRET_LEDGE.id, y: SECRET_LEDGE.y });
  });
});
// #endregion
