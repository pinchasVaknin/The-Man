// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles — Pickups and Cloud Maze chests (tests)
// DESIGN: Pickup placement is checked against the real walkable surfaces, and collection is
//         driven through the real `stepPlayerPhysics`, so the loot is proven to reach the
//         inventory the way the player gets it.
// SUMMARY: Pickups float above a walkable surface, are taken once by touch, survive a save
//          round trip, and the Cloud Maze chests stand on the maze's end platforms.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SKY_PICKUPS,
  SKY_PICKUP_HOVER_M,
  collectSkyPickupsAt,
  exportSkyPickupState,
  importSkyPickupState,
  isSkyPickupCollected,
  resetSkyPickups,
} from './skyPickups';
import { skyboundSurfaceAt } from './skyboundSurface';
import { SKY_CLOUDS, SKY_REST_PLATFORMS } from './skyCloudRoutes';
import { resetSkyClouds } from './skyCloudSystem';
import { resetSkyPuzzles } from './skyPuzzles';
import { WORLD_CHESTS } from '../interactionLandmarks';
import { createInitialPlayerState, stepPlayerPhysics } from '../../../systems/playerPhysicsSystem';
import type { IPlayerInput } from '../../worldTypes';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const FRAME_SEC = 1 / 60;
const NO_KEYS: IPlayerInput = {
  forward: 0,
  right: 0,
  sprint: false,
  relaxed: false,
  jumpPressed: false,
  jumpHeld: false,
  lookYawDelta: 0,
  lookPitchDelta: 0,
};
const MAZE_CHEST_IDS = ['chest-sky-maze-west', 'chest-sky-maze-east'];

/** Height of the cloud or platform directly under a pickup (clouds and platforms only). */
function markedSurfaceY(x: number, z: number): number | null {
  const cloud = SKY_CLOUDS.find((c) => Math.hypot(x - c.x, z - c.z) < 0.01);
  if (cloud) return cloud.y;
  const platform = SKY_REST_PLATFORMS.find((p) => Math.hypot(x - p.x, z - p.z) < 0.01);
  return platform ? platform.y : null;
}
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyPickups();
  resetSkyClouds();
  resetSkyPuzzles();
});

// #region Placement
describe('sky pickup placement', () => {
  it('skyPickups_WhenPlacedAlongTheCloudRun_ShouldFloatAboveACloudOrRestPlatform', () => {
    // Arrange
    const misplaced: string[] = [];
    // Act
    for (const p of SKY_PICKUPS) {
      const surfaceY = markedSurfaceY(p.x, p.z);
      if (surfaceY === null || Math.abs(p.y - SKY_PICKUP_HOVER_M - surfaceY) > 0.01) misplaced.push(p.id);
    }
    // Assert
    assert.equal(SKY_PICKUPS.length, 4);
    assert.deepEqual(misplaced, []);
  });

  it('cloudMazeChests_WhenPlaced_ShouldStandOnTheMazeEndPlatforms', () => {
    // Arrange
    const chests = WORLD_CHESTS.filter((c) => MAZE_CHEST_IDS.includes(c.id));
    // Act
    const surfaces = chests.map((c) => skyboundSurfaceAt(c.x, c.z, c.y + 0.5));
    // Assert
    assert.equal(chests.length, 2);
    assert.deepEqual(
      surfaces.map((s) => ({ kind: s?.kind, y: s?.y })),
      chests.map((c) => ({ kind: 'platform', y: c.y }))
    );
  });
});
// #endregion

// #region Collecting
describe('sky pickup collection', () => {
  it('player_WhenStandingUnderEveryCloudRunPickup_ShouldGetAllTheLootOnce', () => {
    // Arrange
    const player = createInitialPlayerState();
    player.ownedItemIds = [];
    player.goldCoins = 0;
    // Act: stand on each marked surface for a moment, then come back to the first one.
    for (const p of [...SKY_PICKUPS, SKY_PICKUPS[0]]) {
      player.x = p.x;
      player.z = p.z;
      player.y = p.y - SKY_PICKUP_HOVER_M;
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      player.onGround = true;
      for (let f = 0; f < 3; f++) stepPlayerPhysics(player, NO_KEYS, [], FRAME_SEC);
    }
    // Assert
    const expectedItems = SKY_PICKUPS.flatMap((p) => (p.itemId ? [p.itemId] : []));
    const expectedGold = SKY_PICKUPS.reduce((sum, p) => sum + (p.gold ?? 0), 0);
    assert.deepEqual({ items: [...player.ownedItemIds].sort(), gold: player.goldCoins }, { items: [...expectedItems].sort(), gold: expectedGold });
    assert.ok(SKY_PICKUPS.every((p) => isSkyPickupCollected(p.id)));
  });

  it('collectSkyPickupsAt_WhenThePlayerIsFarBelow_ShouldTakeNothing', () => {
    // Arrange
    const p = SKY_PICKUPS[0];
    // Act
    const taken = collectSkyPickupsAt(p.x, p.y - 6, p.z);
    // Assert
    assert.deepEqual(taken, []);
  });
});
// #endregion

// #region Save
describe('sky pickup save state', () => {
  it('skyPickupState_WhenExportedAndImported_ShouldKeepOnlyKnownCollectedIds', () => {
    // Arrange
    const first = SKY_PICKUPS[0];
    collectSkyPickupsAt(first.x, first.y - SKY_PICKUP_HOVER_M, first.z);
    const saved = [...exportSkyPickupState(), 'pickup-that-no-longer-exists'];
    resetSkyPickups();
    // Act
    importSkyPickupState(saved);
    // Assert
    assert.deepEqual(exportSkyPickupState(), [first.id]);
  });

  it('importSkyPickupState_WhenTheSaveIsOlderThanPickups_ShouldStartWithNothingTaken', () => {
    // Arrange
    collectSkyPickupsAt(SKY_PICKUPS[0].x, SKY_PICKUPS[0].y - SKY_PICKUP_HOVER_M, SKY_PICKUPS[0].z);
    // Act
    importSkyPickupState(undefined);
    // Assert
    assert.deepEqual(exportSkyPickupState(), []);
  });
});
// #endregion
