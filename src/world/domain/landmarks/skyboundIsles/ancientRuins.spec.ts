// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (tests)
// DESIGN: Walks the Ancient Ruins with the simulated player (gravity, jump, bounce clouds,
//         solid boxes and puzzle gates) and drives the rune puzzle through its public API, so
//         every rune is proven reachable and the temple opens only when all four are awake.
// SUMMARY: Temple door, rune rules and saving, the broken stair and bounce cloud to the lone
//          column, the sealed room's crack, the broken bridge, and open arrival spots.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSkyIsland } from './skyboundLayout';
import { resetSkyClouds } from './skyCloudSystem';
import { SKY_CLOUDS } from './skyCloudRoutes';
import { resetSkyWindFlowers } from './skyWindSystem';
import {
  RUINS_BROKEN_BRIDGE,
  RUINS_BROKEN_STAIR,
  RUINS_CHEST_SPOT,
  RUINS_COLUMN_TOP,
  RUINS_RUNES,
  RUINS_SEALED_CRACK,
  RUINS_SEALED_ROOM,
  RUINS_STAIR_LANDING,
  RUINS_TEMPLE,
} from './ancientRuinsLayout';
import { activateSkyMechanism, exportSkyPuzzleState, importSkyPuzzleState, isSkyPuzzleSolved, resetSkyPuzzles } from './skyPuzzles';
import { resolveBestLookedAtInteraction } from '../interactionLandmarks';
import { blockingSkyHarborBox, simulateSkyPlayer, SIM_PLAYER, type ISimBody, type SimPilot } from './skyboundTestSim';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const ISLAND = getSkyIsland('ancient-sky-ruins')!;

function followWaypoints(points: ReadonlyArray<{ x: number; z: number }>): SimPilot {
  let index = 0;
  return (b) => {
    while (index < points.length && Math.hypot(points[index].x - b.x, points[index].z - b.z) < 0.5) index++;
    if (index >= points.length) return null;
    return { towardX: points[index].x, towardZ: points[index].z };
  };
}

function describeEnd(b: ISimBody): string {
  return `ended at (${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.z.toFixed(1)}) on ${b.surface?.id ?? 'nothing'}`;
}

function awakenAll(): void {
  RUINS_RUNES.forEach((r) => activateSkyMechanism(r.id));
}

/** From in front of the temple, through the door, to the chest at the back. */
const INTO_THE_TEMPLE = [
  { x: RUINS_CHEST_SPOT.x, z: RUINS_TEMPLE.maxZ + 3 },
  { x: RUINS_CHEST_SPOT.x, z: RUINS_CHEST_SPOT.z + 1.2 },
];
const BEFORE_THE_TEMPLE = { x: RUINS_CHEST_SPOT.x, y: ISLAND.deckY, z: RUINS_TEMPLE.maxZ + 7 };
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyWindFlowers();
  resetSkyPuzzles();
});

// #region Temple And Runes
describe('ancient ruins temple and runes', () => {
  it('templeDoor_WhenThreeRunesAreAwake_ShouldStayShut', () => {
    // Arrange
    RUINS_RUNES.slice(0, 3).forEach((r) => activateSkyMechanism(r.id));
    // Act
    const end = simulateSkyPlayer(BEFORE_THE_TEMPLE, followWaypoints(INTO_THE_TEMPLE), 20);
    // Assert
    assert.ok(end.z > RUINS_TEMPLE.maxZ, describeEnd(end));
  });

  it('templeDoor_WhenAllFourRunesAreAwake_ShouldLetThePlayerReachTheChest', () => {
    // Arrange
    awakenAll();
    // Act
    const end = simulateSkyPlayer(BEFORE_THE_TEMPLE, followWaypoints(INTO_THE_TEMPLE), 20);
    // Assert
    assert.ok(end.z < RUINS_TEMPLE.maxZ - 6, describeEnd(end));
  });

  it('runes_WhenAwakenedInReverseOrder_ShouldStillOpenTheTemple', () => {
    // Arrange
    const reversed = [...RUINS_RUNES].reverse();
    // Act
    reversed.forEach((r) => activateSkyMechanism(r.id));
    // Assert
    assert.equal(isSkyPuzzleSolved('ruins-temple'), true);
  });

  it('rune_WhenAwakenedTwice_ShouldCountOnce', () => {
    // Arrange
    activateSkyMechanism(RUINS_RUNES[0].id);
    // Act
    const again = activateSkyMechanism(RUINS_RUNES[0].id);
    // Assert
    assert.deepEqual(again, { changed: false, solvedPuzzle: null, sequenceReset: false, runesLit: 1 });
  });

  it('runes_WhenSavedAndRestored_ShouldStayAwake', () => {
    // Arrange
    RUINS_RUNES.slice(0, 2).forEach((r) => activateSkyMechanism(r.id));
    const saved = exportSkyPuzzleState();
    resetSkyPuzzles();
    // Act
    importSkyPuzzleState(saved);
    // Assert
    assert.deepEqual(exportSkyPuzzleState().ruinsRunesLit, [RUINS_RUNES[0].id, RUINS_RUNES[1].id]);
  });

  for (const rune of RUINS_RUNES) {
    it(`${rune.id}_WhenPlayerStandsBesideItLookingAtIt_ShouldBeOfferedAsTheInteraction`, () => {
      // Arrange: 1.2 m east of the rune, facing west (yaw pi/2 faces -x).
      const px = rune.x + 1.2;
      // Act
      const result = resolveBestLookedAtInteraction(px, rune.y, rune.z, Math.PI / 2, -0.3);
      // Assert
      assert.equal(result.mechanism?.id, rune.id);
    });
  }
});
// #endregion

// #region Reaching The Runes
describe('ancient ruins rune locations', () => {
  it('lonColumn_WhenPlayerClimbsTheBrokenStairAndBouncesOffTheCloud_ShouldLandOnTheColumnTop', () => {
    // Arrange: climb the stair; from the landing, jump onto the bounce cloud, then steer to the column.
    const cloud = SKY_CLOUDS.find((c) => c.routeId === 'ruins-colonnade')!;
    let launched = false;
    const pilot: SimPilot = (b) => {
      if (b.surface?.id === RUINS_COLUMN_TOP.id) return null;
      if (Math.hypot(b.x - cloud.x, b.z - cloud.z) <= cloud.radius && b.vy > 8) launched = true;
      if (launched) return { towardX: RUINS_COLUMN_TOP.x, towardZ: RUINS_COLUMN_TOP.z };
      if (b.surface?.id === RUINS_STAIR_LANDING.id) {
        const nearEdge = RUINS_STAIR_LANDING.radius - Math.hypot(b.x - RUINS_STAIR_LANDING.x, b.z - RUINS_STAIR_LANDING.z) < 0.5;
        return { towardX: cloud.x, towardZ: cloud.z, jump: nearEdge };
      }
      if (b.y > RUINS_STAIR_LANDING.y - 0.2 || b.x > RUINS_STAIR_LANDING.x - 1) return { towardX: cloud.x, towardZ: cloud.z };
      return { towardX: RUINS_STAIR_LANDING.x, towardZ: RUINS_STAIR_LANDING.z };
    };
    // Act
    const end = simulateSkyPlayer({ x: RUINS_BROKEN_STAIR.ax - 2, y: ISLAND.deckY, z: RUINS_BROKEN_STAIR.az }, pilot, 30);
    // Assert
    assert.equal(end.surface?.id, RUINS_COLUMN_TOP.id, describeEnd(end));
    assert.ok(end.hardestLandingMps < SIM_PLAYER.fallDamageFromMps, `landed at ${end.hardestLandingMps.toFixed(1)} m/s`);
  });

  it('sealedRoom_WhenEnteredThroughTheCrackInTheWestWall_ShouldReachTheRune', () => {
    // Arrange: approach from the west, outside the room, then step through the crack.
    const crackZ = (RUINS_SEALED_CRACK.minZ + RUINS_SEALED_CRACK.maxZ) / 2;
    const route = [
      { x: RUINS_SEALED_ROOM.minX - 2.5, z: crackZ },
      { x: RUINS_SEALED_ROOM.minX + 2.5, z: crackZ },
    ];
    // Act
    const end = simulateSkyPlayer({ x: RUINS_SEALED_ROOM.minX - 2.5, y: ISLAND.deckY, z: RUINS_SEALED_ROOM.maxZ + 3 }, followWaypoints(route), 20);
    // Assert
    assert.ok(end.x > RUINS_SEALED_ROOM.minX + 1.5, describeEnd(end));
  });

  it('sealedRoom_WhenApproachedFromTheEast_ShouldBeWalledOff', () => {
    // Arrange
    const roomMidZ = (RUINS_SEALED_ROOM.minZ + RUINS_SEALED_ROOM.maxZ) / 2;
    const route = [{ x: (RUINS_SEALED_ROOM.minX + RUINS_SEALED_ROOM.maxX) / 2, z: roomMidZ }];
    // Act
    const end = simulateSkyPlayer({ x: RUINS_SEALED_ROOM.maxX + 3, y: ISLAND.deckY, z: roomMidZ }, followWaypoints(route), 10);
    // Assert
    assert.ok(end.x > RUINS_SEALED_ROOM.maxX, describeEnd(end));
  });

  it('brokenBridge_WhenWalkedFromTheDeck_ShouldReachTheRuneNearItsTip', () => {
    // Arrange
    const rune = RUINS_RUNES.find((r) => r.id === 'ruins-rune-bridge')!;
    const route = [
      { x: RUINS_BROKEN_BRIDGE.ax, z: RUINS_BROKEN_BRIDGE.az },
      { x: rune.x + 1.4, z: rune.z + 1.1 },
    ];
    // Act
    const end = simulateSkyPlayer({ x: RUINS_BROKEN_BRIDGE.ax + 3, y: ISLAND.deckY, z: RUINS_BROKEN_BRIDGE.az + 3 }, followWaypoints(route), 25);
    // Assert
    assert.equal(end.surface?.id, RUINS_BROKEN_BRIDGE.id, describeEnd(end));
    assert.ok(Math.hypot(end.x - rune.x, end.z - rune.z) < 2.4, describeEnd(end));
  });
});
// #endregion

// #region Arrivals Stay Open
describe('ancient ruins arrivals stay open', () => {
  const spots: ReadonlyArray<[string, number, number]> = [
    ['garden stream landing', 700.0, -104.0],
    ['island checkpoint', ISLAND.checkpoint.x, ISLAND.checkpoint.z],
    ['ruins ascent rim', ISLAND.x + ISLAND.radius - 0.8, ISLAND.z - 0.6],
  ];
  for (const [name, x, z] of spots) {
    it(`${name}_WhenStoodOn_ShouldNotBeBlocked`, () => {
      // Arrange
      const y = ISLAND.deckY;
      // Act
      const blocker = blockingSkyHarborBox(x, y, z);
      // Assert
      assert.equal(blocker, null);
    });
  }
});
// #endregion
