// ============================================================================
// MODULE: World / Systems / Camera Wall Tests
// DESIGN: Checks that the third-person camera never ends up behind a solid wall (C1)
// SUMMARY: Uses the hunter lodge's west wall. The player stands on the east side, so a camera
//          placed behind the player (to the west) would cross the wall without the fix.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCameraPose, createCameraRigState, stepCameraRig } from './cameraRigSystem';
import { createInitialPlayerState } from './playerPhysicsSystem';
import { walkableHeightAt } from './terrainAndBiomeSystem';
import { SOLID_BUILDING_BOXES } from '../domain/landmarks/collisionAndTerraces';
import { getSolidBuildingWorldAABB } from '../domain/collisionWorld';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
const DT = 1 / 60;
/** The lodge's west wall: the face the camera must not pass (metres). */
const WALL_MAX_X = -96.4;
/** Yaw that faces the player east (+X), so the camera's back position is to the west (-X). */
const FACING_EAST = -Math.PI / 2;
/** Yaw that faces the player west, so the camera's back position is to the east (away from the wall). */
const FACING_WEST = Math.PI / 2;

function thirdPersonPlayer(x: number, z: number, yaw: number) {
  const player = createInitialPlayerState();
  player.x = x;
  player.z = z;
  player.y = walkableHeightAt(x, z).height;
  player.yaw = yaw;
  player.pitch = 0;
  player.cameraPerspective = 'third_person';
  return player;
}
// #endregion

// ======================== TESTS ======================== \\
// #region Tests
describe('camera wall collision (C1)', () => {
  it('should keep the camera on the player side of a wall between the camera and the player', () => {
    const wall = SOLID_BUILDING_BOXES.find((b) => b.id === 'hunter-lodge-west-wall');
    assert.ok(wall, 'expected the hunter lodge west wall in the world data');
    const aabb = getSolidBuildingWorldAABB(wall);
    const z = (aabb.minZ + aabb.maxZ) / 2;

    const rig = createCameraRigState();
    const pose = createCameraPose();
    stepCameraRig(rig, { player: thirdPersonPlayer(WALL_MAX_X + 2.8, z, FACING_EAST), dt: DT, elapsedSeconds: 1, landingDip: 0, isSleepingInBed: false }, pose);

    assert.ok(pose.x > WALL_MAX_X, `camera x ${pose.x.toFixed(2)} must stay east of the wall face ${WALL_MAX_X}`);
    assert.ok(rig.wallScale < 1, 'the camera should be pulled in while the wall is in the way');
  });

  it('should use the full third-person distance when nothing is in the way', () => {
    const rig = createCameraRigState();
    const pose = createCameraPose();
    const player = thirdPersonPlayer(WALL_MAX_X + 2.8, 73, FACING_WEST);
    stepCameraRig(rig, { player, dt: DT, elapsedSeconds: 1, landingDip: 0, isSleepingInBed: false }, pose);

    assert.equal(rig.wallScale, 1);
    // Walking camera is 2.95 m behind the pivot; the shoulder offset is small, so the camera is roughly that far east.
    const behind = pose.x - player.x;
    assert.ok(behind > 2.0 && behind < 3.5, `expected the camera about 2.95 m behind, got ${behind.toFixed(2)}`);
  });

  it('should ease the camera back out after the wall is no longer in the way', () => {
    const rig = createCameraRigState();
    const pose = createCameraPose();
    const z = 73;
    stepCameraRig(rig, { player: thirdPersonPlayer(WALL_MAX_X + 2.8, z, FACING_EAST), dt: DT, elapsedSeconds: 1, landingDip: 0, isSleepingInBed: false }, pose);
    const pulled = rig.wallScale;
    assert.ok(pulled < 0.9);

    const clear = thirdPersonPlayer(WALL_MAX_X + 2.8, z, FACING_WEST);
    stepCameraRig(rig, { player: clear, dt: DT, elapsedSeconds: 1.02, landingDip: 0, isSleepingInBed: false }, pose);
    assert.ok(rig.wallScale > pulled, 'the camera starts to ease back out');
    assert.ok(rig.wallScale < 1, 'the camera does not jump straight back out');

    for (let i = 0; i < 120; i++) {
      stepCameraRig(rig, { player: clear, dt: DT, elapsedSeconds: 1.04 + i * DT, landingDip: 0, isSleepingInBed: false }, pose);
    }
    assert.equal(rig.wallScale, 1, 'after about two seconds the camera is back at full distance');
  });
});
// #endregion
