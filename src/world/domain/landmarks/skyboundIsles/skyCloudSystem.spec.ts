// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (tests)
// DESIGN: Drives one cloud runtime frame by frame at 60 FPS through the public
//         `advanceCloud`, so each test owns its cloud and shares no module state.
// SUMMARY: Checks the cloud state machine: collapse timing per kind, walking across,
//          the no-reset rule, regeneration, bounce clouds and phantom presence.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SKY_CLOUD_KIND_CONFIG,
  advanceCloud,
  createCloudRuntime,
  isCloudSolid,
  type ISkyCloudRuntime,
  type SkyCloudKind,
  type SkyCloudState,
} from './skyCloudSystem';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
const FRAME_SEC = 1 / 60;
const WALK_SPEED_MPS = 5.0;

function makeCloud(kind: SkyCloudKind): ISkyCloudRuntime {
  return createCloudRuntime({ id: `test-${kind}`, routeId: 'test', kind, x: 0, y: 50, z: 0, radius: 3.2, phase: 0 });
}

/** Runs frames until the cloud stops being solid; returns the elapsed seconds (capped). */
function secondsUntilFallThrough(rt: ISkyCloudRuntime, speed: number, capSec = 20): number {
  let t = 0;
  while (isCloudSolid(rt) && t < capSec) {
    advanceCloud(rt, FRAME_SEC, t, true, speed);
    t += FRAME_SEC;
  }
  return t;
}

/** Runs `seconds` of frames and records each distinct state in order. */
function recordStates(rt: ISkyCloudRuntime, seconds: number, occupied: (t: number) => boolean): SkyCloudState[] {
  const seen: SkyCloudState[] = [];
  for (let t = 0; t < seconds; t += FRAME_SEC) {
    advanceCloud(rt, FRAME_SEC, t, occupied(t), 0);
    if (seen[seen.length - 1] !== rt.state) seen.push(rt.state);
  }
  return seen;
}
// #endregion

// ======================== TESTS ======================== \\
// #region Collapse Timing
describe('sky cloud collapse timing', () => {
  it('softCloud_WhenStoodOnStill_ShouldDropThePlayerBetweenTwoAndThreeSeconds', () => {
    // Arrange
    const sut = makeCloud('soft');
    // Act
    const seconds = secondsUntilFallThrough(sut, 0);
    // Assert
    assert.ok(seconds >= 2.5 && seconds <= 3.0, `fell through after ${seconds.toFixed(2)} s`);
  });

  it('chargedCloud_WhenStoodOnStill_ShouldHoldLongerThanSoft', () => {
    // Arrange
    const soft = makeCloud('soft');
    const sut = makeCloud('charged');
    const softSeconds = secondsUntilFallThrough(soft, 0);
    // Act
    const chargedSeconds = secondsUntilFallThrough(sut, 0);
    // Assert
    assert.ok(chargedSeconds > softSeconds + 1, `charged ${chargedSeconds.toFixed(2)} s vs soft ${softSeconds.toFixed(2)} s`);
  });

  it('stormCloud_WhenStoodOnStill_ShouldDropFasterThanSoft', () => {
    // Arrange
    const soft = makeCloud('soft');
    const sut = makeCloud('storm');
    const softSeconds = secondsUntilFallThrough(soft, 0);
    // Act
    const stormSeconds = secondsUntilFallThrough(sut, 0);
    // Assert
    assert.ok(stormSeconds < softSeconds - 0.5, `storm ${stormSeconds.toFixed(2)} s vs soft ${softSeconds.toFixed(2)} s`);
  });

  it('bounceCloud_WhenStoodOnForLong_ShouldNeverCollapse', () => {
    // Arrange
    const sut = makeCloud('bounce');
    // Act
    const seconds = secondsUntilFallThrough(sut, 0, 15);
    // Assert
    assert.ok(seconds >= 15);
  });
});
// #endregion

// #region Crossing And Exploits
describe('sky cloud crossing rules', () => {
  it('softCloud_WhenWalkedAcrossAtNormalSpeed_ShouldStaySolid', () => {
    // Arrange: crossing a 6.4 m cloud at walking speed takes about 1.3 s.
    const sut = makeCloud('soft');
    for (let t = 0; t < 1.3; t += FRAME_SEC) advanceCloud(sut, FRAME_SEC, t, true, WALK_SPEED_MPS);
    // Act
    const solid = isCloudSolid(sut);
    // Assert
    assert.equal(solid, true);
  });

  it('softCloud_WhenPlayerShufflesTinySteps_ShouldStillCollapse', () => {
    // Arrange: alternating still and barely-moving frames must not reset the timer.
    const sut = makeCloud('soft');
    let t = 0;
    while (isCloudSolid(sut) && t < 10) {
      advanceCloud(sut, FRAME_SEC, t, true, Math.floor(t * 10) % 2 === 0 ? 0 : 1.2);
      t += FRAME_SEC;
    }
    // Act
    const solid = isCloudSolid(sut);
    // Assert
    assert.equal(solid, false, `still solid after ${t.toFixed(1)} s of shuffling`);
  });

  it('softCloud_WhenPlayerStepsOffBrieflyAndBack_ShouldKeepMostOfItsLoad', () => {
    // Arrange
    const sut = makeCloud('soft');
    for (let t = 0; t < 1.5; t += FRAME_SEC) advanceCloud(sut, FRAME_SEC, t, true, 0);
    const loadBefore = sut.load;
    // Act
    for (let t = 0; t < 0.3; t += FRAME_SEC) advanceCloud(sut, FRAME_SEC, t, false, 0);
    // Assert
    assert.ok(sut.load > loadBefore - 0.2, `load ${loadBefore.toFixed(2)} -> ${sut.load.toFixed(2)}`);
  });
});
// #endregion

// #region Lifecycle
describe('sky cloud lifecycle', () => {
  it('softCloud_WhenStoodOnUntilCollapse_ShouldPassThroughEveryStateAndRecover', () => {
    // Arrange
    const sut = makeCloud('soft');
    const cfg = SKY_CLOUD_KIND_CONFIG.soft;
    const occupiedUntil = cfg.stabilitySec + 0.1;
    const total = occupiedUntil + cfg.collapseSec + cfg.goneSec + cfg.regenerateSec + 0.5;
    // Act
    const states = recordStates(sut, total, (t) => t < occupiedUntil);
    // Assert
    assert.deepEqual(states, ['occupied', 'compressing', 'sinking', 'collapsing', 'gone', 'regenerating', 'stable']);
  });

  it('softCloud_WhenSinking_ShouldBeLowerAndMoreTransparent', () => {
    // Arrange
    const sut = makeCloud('soft');
    // Act
    for (let t = 0; t < 2.2; t += FRAME_SEC) advanceCloud(sut, FRAME_SEC, t, true, 0);
    // Assert
    assert.ok(sut.sinkOffset > 0.8 && sut.opacity < 0.75, `sink ${sut.sinkOffset.toFixed(2)} m, opacity ${sut.opacity.toFixed(2)}`);
  });

  it('phantomCloud_WhenInItsHiddenPhase_ShouldNotBeSolid', () => {
    // Arrange: phantom cycle is 4 s present, 1 s fade, 2.5 s hidden, 1 s fade.
    const sut = makeCloud('phantom');
    // Act
    advanceCloud(sut, FRAME_SEC, 6.0, false, 0);
    // Assert
    assert.equal(isCloudSolid(sut), false);
  });
});
// #endregion
