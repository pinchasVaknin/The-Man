// ============================================================================
// MODULE: World / Systems / Ancient Mine Walkthrough (tests)
// DESIGN: Integration test: the real stepPlayerPhysics, real colliders and real floors. A bot
//         steers with ordinary forward/jump input toward waypoints, as a player would.
// SUMMARY: Proves the whole spec route is playable on foot: gate, upper cavern zones, descent,
//          heroes' cliff path and king balcony, bridge, golem chamber, passage, forge, and the
//          lava jumps to the treasure island.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { IPlayerState } from '../domain/worldTypes';
import {
  ANCIENT_MINE_ORIGIN,
  LAVA_POOL,
  LAVA_STEPPING_STONES,
  MINE_LEVEL_Y,
  TREASURE_ISLAND,
} from '../domain/landmarks/ancientMine/ancientMineLayout';
import { createInitialPlayerState, stepPlayerPhysics } from './playerPhysicsSystem';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Bot
const DT = 1 / 60;
const ARRIVE_RADIUS = 0.7;
/** Summary: Seconds a leg may take before the bot reports it as blocked. */
const LEG_TIMEOUT_S = 60;

type Waypoint = readonly [lx: number, lz: number];

interface IBotInput {
  forward: number;
  right: number;
  sprint: boolean;
  relaxed: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  lookYawDelta: number;
  lookPitchDelta: number;
}

function idleInput(): IBotInput {
  return { forward: 0, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false, lookYawDelta: 0, lookPitchDelta: 0 };
}

/** Summary: A fresh player standing at a local mine point on the given floor height. */
function spawnAt(lx: number, lz: number, y: number): IPlayerState {
  const state = createInitialPlayerState();
  state.x = ANCIENT_MINE_ORIGIN.x + lx;
  state.z = ANCIENT_MINE_ORIGIN.z + lz;
  state.y = y;
  state.vx = 0;
  state.vy = 0;
  state.vz = 0;
  state.onGround = true;
  return state;
}

function localOf(state: IPlayerState): { lx: number; lz: number } {
  return { lx: state.x - ANCIENT_MINE_ORIGIN.x, lz: state.z - ANCIENT_MINE_ORIGIN.z };
}

/** Summary: Points the player at a local target; forward is (-sin yaw, -cos yaw) in world space. */
function faceToward(state: IPlayerState, lx: number, lz: number): number {
  const { lx: px, lz: pz } = localOf(state);
  state.yaw = Math.atan2(-(lx - px), -(lz - pz));
  return Math.hypot(lx - px, lz - pz);
}

/**
 * Summary: Walks waypoint to waypoint with forward input only.
 * @returns null when every waypoint was reached, or a description of where the bot got stuck.
 */
function walkRoute(state: IPlayerState, route: readonly Waypoint[], log: string[]): string | null {
  for (const [lx, lz] of route) {
    let elapsed = 0;
    while (faceToward(state, lx, lz) > ARRIVE_RADIUS) {
      const input = idleInput();
      input.forward = 1;
      stepPlayerPhysics(state, input, [], DT);
      elapsed += DT;
      if (elapsed > LEG_TIMEOUT_S) {
        const p = localOf(state);
        return `stuck going to (${lx}, ${lz}) at (${p.lx.toFixed(1)}, ${p.lz.toFixed(1)}, y ${state.y.toFixed(2)})`;
      }
    }
    log.push(`(${lx}, ${lz}) y ${state.y.toFixed(2)}`);
  }
  return null;
}

/**
 * Summary: Crosses the lava pool platform by platform with walking jumps.
 * Design: Walk from the current platform's centre toward the next one and jump once the feet
 *         are JUMP_EDGE_MARGIN from the edge; a landing below the lava surface fails the run.
 * @returns null on reaching the island, or what went wrong.
 */
function jumpAcrossLava(state: IPlayerState): string | null {
  const JUMP_EDGE_MARGIN = 0.35;
  const platforms = [...LAVA_STEPPING_STONES, TREASURE_ISLAND];
  let from = { lx: localOf(state).lx, lz: LAVA_POOL.minLz - 1, r: 1 };
  for (const target of platforms) {
    let hasJumped = false;
    let elapsed = 0;
    while (true) {
      const distance = faceToward(state, target.lx, target.lz);
      const p = localOf(state);
      const fromCentreDistance = Math.hypot(p.lx - from.lx, p.lz - from.lz);
      const input = idleInput();
      input.forward = 1;
      const isAtEdge = from.r === 1 ? p.lz >= LAVA_POOL.minLz - JUMP_EDGE_MARGIN : fromCentreDistance >= from.r - JUMP_EDGE_MARGIN;
      if (!hasJumped && isAtEdge && state.onGround) {
        input.jumpPressed = true;
        hasJumped = true;
      }
      input.jumpHeld = hasJumped && !state.onGround;
      stepPlayerPhysics(state, input, [], DT);
      elapsed += DT;
      if (state.y < MINE_LEVEL_Y.lavaSurface) {
        return `fell into lava going to (${target.lx}, ${target.lz}) at (${p.lx.toFixed(1)}, ${p.lz.toFixed(1)})`;
      }
      if (hasJumped && state.onGround && distance < target.r - 0.3) break;
      if (elapsed > LEG_TIMEOUT_S) return `stuck going to (${target.lx}, ${target.lz})`;
    }
    from = { lx: target.lx, lz: target.lz, r: target.r };
  }
  return null;
}
// #endregion

// #region Routes
/** Summary: Gate -> upper cavern -> lagoon and its channel bridge -> back to the hall. */
const ROUTE_UPPER_WEST: readonly Waypoint[] = [
  [0, 1], [0, 12], [0, 18], [0, 46], [0, 70], [-30, 72], [-55, 72], [-62, 100], [-72, 108], [-88, 108], [-72, 108], [-30, 100],
];

/** Summary: Hall -> gallery platform -> gallery pit -> foundry -> back to the descent mouth. */
const ROUTE_UPPER_EAST: readonly Waypoint[] = [
  [0, 70], [40, 50], [58, 34], [75, 34], [75, 43], [100, 44], [75, 43], [66, 34], [66, 60], [66, 34], [55, 34], [50, 90], [88, 120], [40, 112], [0, 118],
];

/** Summary: Descent -> chasm ledge -> heroes' cliff path -> king balcony -> loop stairs into the golem chamber. */
const ROUTE_HEROES_LOOP: readonly Waypoint[] = [
  [0, 118], [0, 140], [0, 166], [0, 192], [-60, 198], [-102, 200], [-102, 250], [-102, 302], [-60, 302], [-12, 302],
  [0, 298], [17, 300], [17, 338], [17, 346],
];

/** Summary: Chasm ledge -> great bridge -> golem gate -> chamber -> ancient passage -> forge shore. */
const ROUTE_MAIN_SOUTH: readonly Waypoint[] = [
  [0, 192], [0, 250], [0, 296], [0, 312], [-14, 330], [-14, 350], [0, 353], [0, 370], [0, 388], [-1.5, 395],
];
// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Walkthrough
describe('ancient mine walkthrough with the real player physics', () => {
  it('walk_WhenGoingFromGateThroughLagoonAndChannelBridge_ShouldReachEveryWaypoint', () => {
    // Arrange
    const state = spawnAt(0, 1, MINE_LEVEL_Y.entrance);
    const log: string[] = [];

    // Act
    const failure = walkRoute(state, ROUTE_UPPER_WEST, log);

    // Assert
    assert.equal(failure, null, log.join('\n'));
  });

  it('walk_WhenVisitingGalleriesPitAndFoundry_ShouldReachEveryWaypoint', () => {
    // Arrange
    const state = spawnAt(0, 70, MINE_LEVEL_Y.upperCavern);
    const log: string[] = [];

    // Act
    const failure = walkRoute(state, ROUTE_UPPER_EAST, log);

    // Assert
    assert.equal(failure, null, log.join('\n'));
  });

  it('walk_WhenTakingTheHeroesCliffPathToTheKing_ShouldReachTheGolemChamber', () => {
    // Arrange
    const state = spawnAt(0, 118, MINE_LEVEL_Y.upperCavern);
    const log: string[] = [];

    // Act
    const failure = walkRoute(state, ROUTE_HEROES_LOOP, log);

    // Assert
    assert.equal(failure, null, log.join('\n'));
  });

  it('walk_WhenCrossingTheBridgeToTheForge_ShouldReachTheLavaShore', () => {
    // Arrange
    const state = spawnAt(0, 192, MINE_LEVEL_Y.chasmLedge);
    const log: string[] = [];

    // Act
    const failure = walkRoute(state, ROUTE_MAIN_SOUTH, log);

    // Assert
    assert.equal(failure, null, log.join('\n'));
  });

  it('jump_WhenCrossingTheLavaStones_ShouldLandOnTheTreasureIsland', () => {
    // Arrange
    const state = spawnAt(-1.5, 394, MINE_LEVEL_Y.forgeFloor);

    // Act
    const failure = jumpAcrossLava(state);

    // Assert
    const p = localOf(state);
    assert.deepEqual(
      { failure, onIsland: Math.hypot(p.lx - TREASURE_ISLAND.lx, p.lz - TREASURE_ISLAND.lz) < TREASURE_ISLAND.r, y: state.y },
      { failure: null, onIsland: true, y: TREASURE_ISLAND.topY }
    );
  });

  it('fly_WhenInGodModeInsideAncientMine_ShouldStayBelowCeilingAndInsideWallsWithoutTeleportingToSurface', () => {
    // Arrange: inside the Golem Chamber (lz = 334, floor = -39.35, ceiling = -22.0, west wall at lx = -30)
    const state = spawnAt(-10, 334, MINE_LEVEL_Y.chasmLedge + 2.0);
    state.isFlying = true;
    state.onGround = false;

    // Act: fly straight up (jumpHeld) and toward the west rock wall (lx = -30) for 3 seconds
    faceToward(state, -50, 334);
    for (let i = 0; i < 180; i++) {
      const input = idleInput();
      input.forward = 1;
      input.jumpHeld = true;
      stepPlayerPhysics(state, input, [], DT);
    }

    // Assert: player must remain inside the chamber (below ceiling -22 - 1.75 = -23.75, never ejected to mountain surface ~90m)
    const p = localOf(state);
    assert.equal(state.isFlying, true);
    assert.ok(state.y <= -23.7 && state.y > MINE_LEVEL_Y.chasmLedge, `expected y inside chamber, got ${state.y}`);
    assert.ok(p.lx > -29.6, `expected west wall to block flying at lx > -29.6, got ${p.lx}`);
  });

  it('walk_WhenPressingAgainstMineWall_ShouldBeStoppedWithClearanceMargin', () => {
    // Arrange: spawn near the entrance corridor's east wall (lx = 7.0)
    const state = spawnAt(5.5, 6.0, MINE_LEVEL_Y.entrance);
    faceToward(state, 12.0, 6.0);

    // Act: walk directly into the east wall for 2 seconds
    for (let i = 0; i < 120; i++) {
      const input = idleInput();
      input.forward = 1;
      stepPlayerPhysics(state, input, [], DT);
    }

    // Assert: wall collider stops the player's center well before lx = 7.0 so camera cannot clip through the wall
    const p = localOf(state);
    assert.ok(p.lx < 6.45, `expected player center to be stopped before 6.45, got ${p.lx}`);
  });
});
// #endregion
