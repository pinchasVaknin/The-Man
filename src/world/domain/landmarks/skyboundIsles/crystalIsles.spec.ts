// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (tests)
// DESIGN: Proves the Crystal Isles on the data: stepping-rock hops against the walking-jump
//         arc, walks with the simulated player (solid boxes and puzzle gates included), the
//         resonance sequence through its public API, and mining through the real combat strike.
// SUMMARY: Islet reachability, the closed then open passage to the grotto, resonance rules,
//          and pickaxe mining (chips, yield, regrowth, hint without a pickaxe).
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSkyIsland } from './skyboundLayout';
import { resetSkyClouds } from './skyCloudSystem';
import { resetSkyWindFlowers } from './skyWindSystem';
import {
  CRYSTAL_DEPOSITS,
  CRYSTAL_GROTTO,
  CRYSTAL_ISLETS,
  CRYSTAL_PASSAGE_GATE,
  CRYSTAL_PASSAGE_RAMP,
  CRYSTAL_STEPPING_ROCKS,
  RESONANCE_ORDER,
} from './crystalIslesLayout';
import { activateSkyMechanism, isSkyPuzzleSolved, resetSkyPuzzles } from './skyPuzzles';
import {
  CRYSTAL_CHIPS_TO_MINE,
  CRYSTAL_REGROW_SEC,
  getCrystalDeposits,
  resetCrystalDeposits,
  stepCrystalDeposits,
  strikeCrystalDeposit,
} from './skyCrystalMining';
import { blockingSkyHarborBox, simulateSkyPlayer, SIM_PLAYER, type ISimBody, type SimPilot } from './skyboundTestSim';
import { createInitialPlayerState } from '../../../systems/playerPhysicsSystem';
import { evaluateSwordStrikeWindowHit } from '../../../systems/combatAndInventorySystem';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const MAIN = getSkyIsland('crystal-isles')!;

function walkingJumpReach(dy: number): number {
  const disc = SIM_PLAYER.jumpVy * SIM_PLAYER.jumpVy - 2 * SIM_PLAYER.gravity * dy;
  if (disc < 0) return 0;
  return SIM_PLAYER.walkSpeed * ((SIM_PLAYER.jumpVy + Math.sqrt(disc)) / SIM_PLAYER.gravity);
}

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

/** From the deck west of the gate, east through the passage and down to the grotto. */
const THROUGH_THE_PASSAGE = [
  { x: CRYSTAL_PASSAGE_GATE.minX - 2, z: CRYSTAL_PASSAGE_RAMP.az },
  { x: CRYSTAL_PASSAGE_RAMP.bx, z: CRYSTAL_PASSAGE_RAMP.bz },
  { x: CRYSTAL_GROTTO.minX + 2.5, z: (CRYSTAL_GROTTO.minZ + CRYSTAL_GROTTO.maxZ) / 2 },
];
const WEST_OF_GATE = { x: CRYSTAL_PASSAGE_GATE.minX - 6, y: MAIN.deckY, z: CRYSTAL_PASSAGE_RAMP.az };

function touchInOrder(ids: readonly string[]): void {
  ids.forEach((id) => activateSkyMechanism(id));
}
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyWindFlowers();
  resetSkyPuzzles();
  resetCrystalDeposits();
});

// #region Islets
describe('crystal isles stepping rocks', () => {
  for (const path of CRYSTAL_STEPPING_ROCKS) {
    const islet = CRYSTAL_ISLETS.find((i) => i.id === path.isletId)!;
    const hops = [{ x: MAIN.x, z: MAIN.z, y: MAIN.deckY, radius: MAIN.radius }, ...path.rocks, islet];
    for (let i = 1; i < hops.length; i++) {
      it(`${path.isletId}_Hop${i}_WhenJumpedAtWalkingSpeed_ShouldBeAFairJump`, () => {
        // Arrange
        const a = hops[i - 1];
        const b = hops[i];
        const gap = Math.hypot(b.x - a.x, b.z - a.z) - a.radius - b.radius;
        // Act
        const reach = walkingJumpReach(b.y - a.y);
        // Assert
        assert.ok(gap >= 0.5 && gap <= reach * 0.85, `gap ${gap.toFixed(2)} m, reach ${reach.toFixed(2)} m, dy ${(b.y - a.y).toFixed(2)} m`);
      });
    }
  }
});
// #endregion

// #region Paths Stay Open
describe('crystal isles crystals keep paths open', () => {
  const spots: ReadonlyArray<[string, number, number, number]> = [
    ['observatory stream landing', 866.0, MAIN.deckY, -22.0],
    ['hub bridge end', 851.6, MAIN.deckY, -17.6],
    ['cloud maze entry rim', MAIN.x + 1.2, MAIN.deckY, MAIN.z + MAIN.radius - 0.5],
    ['passage approach', CRYSTAL_PASSAGE_GATE.minX - 2, MAIN.deckY, CRYSTAL_PASSAGE_RAMP.az],
    ...CRYSTAL_ISLETS.map((i): [string, number, number, number] => [`${i.id} centre`, i.x, i.y, i.z]),
  ];
  for (const [name, x, y, z] of spots) {
    it(`${name}_WhenStoodOn_ShouldNotBeBlockedByAnyCrystal`, () => {
      // Arrange
      const at = { x, y, z };
      // Act
      const blocker = blockingSkyHarborBox(at.x, at.y, at.z);
      // Assert
      assert.equal(blocker, null);
    });
  }

  for (const path of CRYSTAL_STEPPING_ROCKS) {
    it(`${path.isletId}_WhenWalkedAndJumpedFromTheMainIsle_ShouldReachTheIslet`, () => {
      // Arrange: like a player, aim at the centre of the next rock (which also brakes in the air)
      // and jump within 0.5 m of the edge of the one you stand on.
      const islet = CRYSTAL_ISLETS.find((i) => i.id === path.isletId)!;
      const discs = [{ id: MAIN.id, x: MAIN.x, z: MAIN.z, radius: MAIN.radius }, ...path.rocks, islet];
      const start = { x: MAIN.x + (islet.x - MAIN.x) * 0.45, y: MAIN.deckY, z: MAIN.z + (islet.z - MAIN.z) * 0.45 };
      let current = 0;
      const pilot: SimPilot = (b) => {
        const standing = discs.findIndex((d) => d.id === b.surface?.id);
        if (standing >= 0) current = standing;
        if (current === discs.length - 1) return null;
        const here = discs[current];
        const next = discs[current + 1];
        const nearEdge = standing >= 0 && here.radius - Math.hypot(b.x - here.x, b.z - here.z) < 0.5;
        return { towardX: next.x, towardZ: next.z, jump: nearEdge };
      };
      // Act
      const end = simulateSkyPlayer(start, pilot, 20);
      // Assert
      assert.equal(end.surface?.id, islet.id, describeEnd(end));
    });
  }
});
// #endregion

// #region Passage And Grotto
describe('crystal isles hidden passage', () => {
  it('crystalPassage_WhenTheResonanceIsUnsolved_ShouldStayClosed', () => {
    // Arrange
    const route = THROUGH_THE_PASSAGE;
    // Act
    const end = simulateSkyPlayer(WEST_OF_GATE, followWaypoints(route), 20);
    // Assert
    assert.ok(end.x < CRYSTAL_PASSAGE_GATE.minX, describeEnd(end));
  });

  it('crystalPassage_WhenTheResonanceIsSolved_ShouldLeadDownToTheGrotto', () => {
    // Arrange
    touchInOrder(RESONANCE_ORDER);
    // Act
    const end = simulateSkyPlayer(WEST_OF_GATE, followWaypoints(THROUGH_THE_PASSAGE), 25);
    // Assert
    assert.equal(end.surface?.id, CRYSTAL_GROTTO.id, describeEnd(end));
    assert.ok(end.hardestLandingMps < SIM_PLAYER.fallDamageFromMps, `landed at ${end.hardestLandingMps.toFixed(1)} m/s`);
  });
});
// #endregion

// #region Resonance Puzzle
describe('crystal isles resonance puzzle', () => {
  it('resonance_WhenTouchedInTheClueOrder_ShouldBeSolved', () => {
    // Arrange
    const order = RESONANCE_ORDER;
    // Act
    touchInOrder(order);
    // Assert
    assert.equal(isSkyPuzzleSolved('crystal-resonance'), true);
  });

  it('resonance_WhenTheLastTwoAreSwapped_ShouldStayUnsolved', () => {
    // Arrange
    const swapped = [RESONANCE_ORDER[0], RESONANCE_ORDER[2], RESONANCE_ORDER[1]];
    // Act
    touchInOrder(swapped);
    // Assert
    assert.equal(isSkyPuzzleSolved('crystal-resonance'), false);
  });

  it('resonance_WhenAWrongCrystalIsTouched_ShouldReportAReset', () => {
    // Arrange
    activateSkyMechanism(RESONANCE_ORDER[0]);
    // Act
    const result = activateSkyMechanism(RESONANCE_ORDER[2]);
    // Assert
    assert.deepEqual(result, { changed: true, solvedPuzzle: null, sequenceReset: true });
  });

  it('resonance_WhenAMistakeIsFollowedByTheFullOrder_ShouldStillBeSolvable', () => {
    // Arrange
    activateSkyMechanism(RESONANCE_ORDER[1]);
    // Act
    touchInOrder(RESONANCE_ORDER);
    // Assert
    assert.equal(isSkyPuzzleSolved('crystal-resonance'), true);
  });
});
// #endregion

// #region Mining
describe('crystal isles mining', () => {
  const deposit = CRYSTAL_DEPOSITS[0];
  /** Stand 1.6 m east of the deposit, facing west (yaw pi/2 faces -x). */
  const strike = (weapon: string | undefined) => strikeCrystalDeposit(deposit.x + 1.6, deposit.y, deposit.z, Math.PI / 2, weapon, false);

  it('pickaxe_WhenStrikingADepositThreeTimes_ShouldMineItsGemsOnTheLastStrike', () => {
    // Arrange
    for (let k = 1; k < CRYSTAL_CHIPS_TO_MINE; k++) strike('dwarven_pickaxe');
    // Act
    const result = strike('dwarven_pickaxe');
    // Assert
    assert.deepEqual({ mined: result.mined, gems: result.gems }, { mined: true, gems: deposit.yield });
  });

  it('pickaxe_WhenTheDepositIsMinedOut_ShouldNotBeStruckAgainUntilItRegrows', () => {
    // Arrange
    for (let k = 0; k < CRYSTAL_CHIPS_TO_MINE; k++) strike('dwarven_pickaxe');
    // Act
    const result = strike('dwarven_pickaxe');
    // Assert
    assert.equal(result.hit, false);
  });

  it('deposit_WhenItsRegrowTimeHasPassed_ShouldBeMineableAgain', () => {
    // Arrange
    for (let k = 0; k < CRYSTAL_CHIPS_TO_MINE; k++) strike('dwarven_pickaxe');
    // Act
    stepCrystalDeposits(CRYSTAL_REGROW_SEC + 1);
    // Assert
    assert.equal(getCrystalDeposits()[0].regrowSec, 0);
    assert.equal(strike('dwarven_pickaxe').hit, true);
  });

  it('sword_WhenStrikingADeposit_ShouldOnlyHintThatAPickaxeIsNeeded', () => {
    // Arrange
    const weapon = 'iron_sword';
    // Act
    const result = strike(weapon);
    // Assert
    assert.deepEqual({ hit: result.hit, needsPickaxe: result.needsPickaxe, gems: result.gems }, { hit: true, needsPickaxe: true, gems: [] });
  });

  it('pickaxe_WhenSwungFacingAwayFromTheDeposit_ShouldMissIt', () => {
    // Arrange: yaw -pi/2 faces +x, away from the deposit.
    const x = deposit.x + 2.5;
    // Act
    const result = strikeCrystalDeposit(x, deposit.y, deposit.z, -Math.PI / 2, 'dwarven_pickaxe', false);
    // Assert
    assert.equal(result.hit, false);
  });

  it('realSwordStrike_WhenThePlayerSwingsAPickaxeAtADeposit_ShouldPutTheGemsInTheInventory', () => {
    // Arrange
    const player = createInitialPlayerState();
    player.x = deposit.x + 1.6;
    player.y = deposit.y;
    player.z = deposit.z;
    player.yaw = Math.PI / 2;
    player.pitch = -0.2;
    player.activeWeaponId = 'dwarven_pickaxe';
    player.ownedItemIds = [];
    for (let k = 1; k < CRYSTAL_CHIPS_TO_MINE; k++) evaluateSwordStrikeWindowHit(player, []);
    // Act
    evaluateSwordStrikeWindowHit(player, []);
    // Assert
    assert.deepEqual(player.ownedItemIds, [...deposit.yield]);
  });
});
// #endregion
