// ============================================================================
// MODULE: World / Domain / Landmarks / Sacred Cloud Mountain Unit Tests
// DESIGN: Pure node:test checks validating unified stepped sand mountain heightfield at (104, -760),
//         spiral bench flatness, spacious flat post-gate arrival shelf, synced Foot & Summit Paifang gates,
//         zero summit rim fence, round lotus pond, East stepping stones, bright snow-colored approach trail,
//         periodic Sky Dragon summit landing/takeoff patrol, relocated Yin-Yang Bagua platform, and zero snow.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SACRED_CLOUD_MOUNTAIN_POS,
  CHINESE_BAGUA_PLATFORM_POS,
  SACRED_MOUNTAIN_APPROACH_WAYPOINTS,
  SACRED_MOUNTAIN_CAIRN_MARKERS,
  SACRED_MOUNTAIN_SPIRAL_SEGMENTS,
  SACRED_LOTUS_STEPPING_STONES,
  SACRED_CLOUD_MOUNTAIN_SOLID_BOXES,
  sacredMountainHullRadiusAtY,
  isInsideSacredCloudMountainNoSnowZone,
  sampleSacredSpiralAtS,
  teardropPoolSignedDist,
  sacredCloudMountainWalkableHeightAt,
  sacredCloudMountainWaterSurfaceAt,
  evaluateSkyDragonPatrol,
} from './sacredCloudMountainLandmarks';
import {
  CHINESE_FORTRESS_POS,
  validateWorldEntityColliders,
} from '../landmarksRegistry';
import {
  groundHeightAt,
  northernSnowZoneFactorAt,
  sampleMinimapColorAt,
  trailFactorAt,
  walkableHeightAt,
  getWaterSurfaceHeightAt,
} from '../../systems/terrainAndBiomeSystem';

test('Sacred Cloud Mountain sits further north at (104, -760) with natural ground & zero snow on mountain', () => {
  assert.equal(SACRED_CLOUD_MOUNTAIN_POS.x, 104);
  assert.equal(SACRED_CLOUD_MOUNTAIN_POS.z, -760);
  assert.ok(SACRED_CLOUD_MOUNTAIN_POS.z < CHINESE_FORTRESS_POS.plazaMinZ - 340);
  assert.ok(SACRED_CLOUD_MOUNTAIN_POS.summitY > SACRED_CLOUD_MOUNTAIN_POS.cloudTopY + 12);

  // Base starts at natural highland height (~30.8m), never carved down into an artificial pit
  const footGround = groundHeightAt(
    SACRED_CLOUD_MOUNTAIN_POS.footGatewayX,
    SACRED_CLOUD_MOUNTAIN_POS.footGatewayZ
  );
  assert.ok(
    Math.abs(footGround - SACRED_CLOUD_MOUNTAIN_POS.footY) < 0.15,
    `Expected natural mountain foot height near ${SACRED_CLOUD_MOUNTAIN_POS.footY}, got ${footGround}`
  );

  // Sample across foot, spiral turns, and summit plateau — zero snow everywhere on the mountain
  const sampleCoords: Array<[number, number]> = [
    [104, -760],
    [104, -688],
    [SACRED_CLOUD_MOUNTAIN_POS.summitTreeX, SACRED_CLOUD_MOUNTAIN_POS.summitTreeZ],
    [SACRED_CLOUD_MOUNTAIN_POS.poolCx, SACRED_CLOUD_MOUNTAIN_POS.poolCz],
  ];
  for (let i = 0; i < 16; i++) {
    const p = sampleSacredSpiralAtS(i / 15);
    sampleCoords.push([p.x, p.z]);
  }
  for (const [x, z] of sampleCoords) {
    assert.equal(isInsideSacredCloudMountainNoSnowZone(x, z), true, `Expected (${x}, ${z}) in no-snow zone`);
    assert.equal(northernSnowZoneFactorAt(x, z), 0, `Expected ZERO snow at (${x}, ${z})`);
  }

  // Existing fortress ground height at stair foot must remain intact
  const fortFootH = groundHeightAt(0, CHINESE_FORTRESS_POS.stairFootZ);
  assert.ok(
    Math.abs(fortFootH - CHINESE_FORTRESS_POS.stairBaseHeight) < 0.35,
    `Fortress stair foot height changed unexpectedly: ${fortFootH}`
  );
});

test('Unified terrain heightfield cuts flat benches, widens summit post-gate arrival area, and levels gates', () => {
  assert.ok(SACRED_CLOUD_MOUNTAIN_POS.footHullRadius >= 70.0);
  assert.equal(SACRED_CLOUD_MOUNTAIN_POS.summitRadius, 20.5);

  for (let i = 0; i <= 40; i++) {
    const p = sampleSacredSpiralAtS(i / 40);
    const hullR = sacredMountainHullRadiusAtY(p.y);
    assert.ok(
      Math.abs(p.r - hullR) < 0.01,
      `Spiral radius (${p.r.toFixed(2)}) drifted from hullR (${hullR.toFixed(2)}) at s=${p.s.toFixed(2)}`
    );

    for (const rOff of [-2.0, 0.0, 2.0]) {
      const tx = SACRED_CLOUD_MOUNTAIN_POS.x + Math.cos(p.theta) * (p.r + rOff);
      const tz = SACRED_CLOUD_MOUNTAIN_POS.z + Math.sin(p.theta) * (p.r + rOff);
      const th = groundHeightAt(tx, tz);
      assert.ok(
        Math.abs(th - p.y) < 0.14,
        `Mountain terrain climbed/dipped at s=${p.s.toFixed(2)} rOff=${rOff}: terrain=${th.toFixed(2)}, bench=${p.y.toFixed(2)}`
      );
    }
  }

  // Spacious flattened post-gate arrival shelf (continues comfortably past the Paifang gate)
  for (const [theta, rad] of [
    [1.65, 22.0],
    [1.50, 23.0],
    [1.25, 22.8],
    [1.05, 22.0],
  ] as const) {
    const px = SACRED_CLOUD_MOUNTAIN_POS.x + Math.cos(theta) * rad;
    const pz = SACRED_CLOUD_MOUNTAIN_POS.z + Math.sin(theta) * rad;
    const gh = groundHeightAt(px, pz);
    assert.ok(
      Math.abs(gh - SACRED_CLOUD_MOUNTAIN_POS.summitY) < 0.15,
      `Post-gate arrival shelf not flat at theta=${theta}, r=${rad}: got ${gh.toFixed(2)}`
    );
    const wk = sacredCloudMountainWalkableHeightAt(px, pz, SACRED_CLOUD_MOUNTAIN_POS.summitY);
    assert.ok(
      wk !== null && Math.abs(wk.height - SACRED_CLOUD_MOUNTAIN_POS.summitY) < 0.05,
      `Expected walkable post-gate shelf at theta=${theta}, r=${rad}`
    );
  }

  // Foot Gateway pillars sit level on 30.8m threshold
  const footSample = sampleSacredSpiralAtS(0);
  assert.ok(
    Math.hypot(
      footSample.x - SACRED_CLOUD_MOUNTAIN_POS.footGatewayX,
      footSample.z - SACRED_CLOUD_MOUNTAIN_POS.footGatewayZ
    ) < 0.05
  );
  for (const side of [-2.7, 2.7]) {
    const px = footSample.x + Math.cos(footSample.tangentYaw) * side;
    const pz = footSample.z - Math.sin(footSample.tangentYaw) * side;
    const ph = groundHeightAt(px, pz);
    assert.ok(
      Math.abs(ph - SACRED_CLOUD_MOUNTAIN_POS.footY) < 0.15,
      `Foot gate pillar side=${side} not level: got ${ph.toFixed(2)}`
    );
  }

  // Summit Paifang Gate pillars at s = 0.985 sit level on 104.0m landing
  const sumSample = sampleSacredSpiralAtS(0.985);
  for (const side of [-2.55, 2.55]) {
    const px = sumSample.x + Math.cos(sumSample.tangentYaw) * side;
    const pz = sumSample.z - Math.sin(sumSample.tangentYaw) * side;
    const ph = groundHeightAt(px, pz);
    assert.ok(
      Math.abs(ph - SACRED_CLOUD_MOUNTAIN_POS.summitY) < 0.15,
      `Summit Paifang pillar side=${side} not level: got ${ph.toFixed(2)}`
    );
  }
});

test('Approach trail is bright snow-colored, reaches Mountain Foot at (104, -688), and has gentle grades', () => {
  const first = SACRED_MOUNTAIN_APPROACH_WAYPOINTS[0];
  const last = SACRED_MOUNTAIN_APPROACH_WAYPOINTS[SACRED_MOUNTAIN_APPROACH_WAYPOINTS.length - 1];
  assert.ok(Math.hypot(first.x - 0, first.z - CHINESE_FORTRESS_POS.stairFootZ) <= 18);
  assert.equal(last.x, SACRED_CLOUD_MOUNTAIN_POS.footGatewayX);
  assert.equal(last.z, SACRED_CLOUD_MOUNTAIN_POS.footGatewayZ);

  assert.ok(SACRED_MOUNTAIN_CAIRN_MARKERS.length >= 12, 'Expected >= 12 trailside cairn markers');
  for (const wp of SACRED_MOUNTAIN_APPROACH_WAYPOINTS) {
    assert.ok(trailFactorAt(wp.x, wp.z) > 0.75, `Expected clear trail mark at (${wp.x}, ${wp.z})`);
  }

  // Minimap color along the approach trail must be bright snow-white!
  const midTrailCol = sampleMinimapColorAt(84, -552);
  assert.ok(
    midTrailCol[0] >= 180 && midTrailCol[1] >= 185 && midTrailCol[2] >= 195,
    `Expected bright snow trail color on minimap, got [${midTrailCol.join(', ')}]`
  );

  let prevH = groundHeightAt(first.x, first.z);
  for (let i = 0; i < SACRED_MOUNTAIN_APPROACH_WAYPOINTS.length - 1; i++) {
    const a = SACRED_MOUNTAIN_APPROACH_WAYPOINTS[i];
    const b = SACRED_MOUNTAIN_APPROACH_WAYPOINTS[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(4, Math.ceil(segLen / 3.0));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const wx = a.x + (b.x - a.x) * t;
      const wz = a.z + (b.z - a.z) * t;
      const h = groundHeightAt(wx, wz);
      const stepDist = segLen / steps;
      const grade = Math.abs(h - prevH) / stepDist;
      assert.ok(grade < 0.45, `Approach trail too steep (${grade.toFixed(2)}) near (${wx.toFixed(1)}, ${wz.toFixed(1)})`);
      prevH = h;
    }
  }
});

test('Perimeter spiral ascent climbs continuously onto a level arrival trail at 104m summit', () => {
  assert.equal(SACRED_MOUNTAIN_SPIRAL_SEGMENTS.length, 13);
  for (let i = 0; i < SACRED_MOUNTAIN_SPIRAL_SEGMENTS.length; i++) {
    const seg = SACRED_MOUNTAIN_SPIRAL_SEGMENTS[i];
    const expectedKind = i % 2 === 0 ? 'trail' : 'stair';
    assert.equal(seg.kind, expectedKind, `Segment ${i} must alternate trail <-> stair`);
    if (i > 0) {
      const prev = SACRED_MOUNTAIN_SPIRAL_SEGMENTS[i - 1];
      assert.equal(seg.sStart, prev.sEnd);
      assert.equal(seg.yStart, prev.yEnd);
    }
  }
  const finalSeg = SACRED_MOUNTAIN_SPIRAL_SEGMENTS[SACRED_MOUNTAIN_SPIRAL_SEGMENTS.length - 1];
  assert.equal(finalSeg.kind, 'trail');
  assert.equal(finalSeg.yStart, 104.0);
  assert.equal(finalSeg.yEnd, 104.0);

  let currentY: number = SACRED_CLOUD_MOUNTAIN_POS.footY;
  const totalSamples = 600;
  for (let i = 0; i <= totalSamples; i++) {
    const p = sampleSacredSpiralAtS(i / totalSamples);
    const walk = walkableHeightAt(p.x, p.z, currentY);
    assert.notEqual(walk.surface, 'ground', `Spiral s=${p.s.toFixed(3)} fell through to terrain`);
    assert.ok(
      Math.abs(walk.height - p.y) < 0.25,
      `Height mismatch at s=${p.s.toFixed(3)}: got ${walk.height}, expected ${p.y}`
    );
    assert.ok(
      Math.abs(walk.height - currentY) < 0.52,
      `Step delta too large at s=${p.s.toFixed(3)}: ${currentY.toFixed(2)} -> ${walk.height.toFixed(2)}`
    );
    currentY = walk.height;
  }
  assert.ok(Math.abs(currentY - SACRED_CLOUD_MOUNTAIN_POS.summitY) < 0.1);
});

test('Round pond, East lotus stepping stones, removed summit rim fence, relocated Bagua deck, and colliders are valid', () => {
  assert.ok(teardropPoolSignedDist(SACRED_CLOUD_MOUNTAIN_POS.poolCx, SACRED_CLOUD_MOUNTAIN_POS.poolCz) < -5.0);
  assert.ok(
    Math.abs(
      teardropPoolSignedDist(
        SACRED_CLOUD_MOUNTAIN_POS.poolCx + SACRED_CLOUD_MOUNTAIN_POS.poolRadius,
        SACRED_CLOUD_MOUNTAIN_POS.poolCz
      )
    ) < 1e-6
  );

  const poolCenterGround = groundHeightAt(
    SACRED_CLOUD_MOUNTAIN_POS.poolCx,
    SACRED_CLOUD_MOUNTAIN_POS.poolCz
  );
  assert.ok(
    poolCenterGround < SACRED_CLOUD_MOUNTAIN_POS.poolWaterY - 0.3,
    `Expected submerged pool floor below ${SACRED_CLOUD_MOUNTAIN_POS.poolWaterY}, got ${poolCenterGround}`
  );

  assert.equal(
    getWaterSurfaceHeightAt(
      SACRED_CLOUD_MOUNTAIN_POS.poolCx,
      SACRED_CLOUD_MOUNTAIN_POS.poolCz,
      SACRED_CLOUD_MOUNTAIN_POS.summitY
    ),
    SACRED_CLOUD_MOUNTAIN_POS.poolWaterY
  );
  assert.equal(
    sacredCloudMountainWaterSurfaceAt(
      SACRED_CLOUD_MOUNTAIN_POS.poolCx,
      SACRED_CLOUD_MOUNTAIN_POS.poolCz,
      SACRED_CLOUD_MOUNTAIN_POS.footY
    ),
    null
  );

  // East-aligned lotus stepping stones walk smoothly dry across pool onto central dais
  for (let i = 0; i < SACRED_LOTUS_STEPPING_STONES.length; i++) {
    const st = SACRED_LOTUS_STEPPING_STONES[i];
    const h = sacredCloudMountainWalkableHeightAt(st.x, st.z, SACRED_CLOUD_MOUNTAIN_POS.summitY);
    assert.ok(h !== null && h.height > SACRED_CLOUD_MOUNTAIN_POS.poolWaterY);
    if (i > 0) {
      const prev = SACRED_LOTUS_STEPPING_STONES[i - 1];
      assert.ok(prev.x - st.x <= 2.4 && prev.x - st.x >= 1.4, 'Stepping stone spacing must be walkable');
    }
  }

  // Summit grass/sand ground walks cleanly at summitY
  const meadowH = walkableHeightAt(
    SACRED_CLOUD_MOUNTAIN_POS.x + 8.5,
    SACRED_CLOUD_MOUNTAIN_POS.z - 2.0,
    SACRED_CLOUD_MOUNTAIN_POS.summitY
  );
  assert.equal(meadowH.height, SACRED_CLOUD_MOUNTAIN_POS.summitY);

  // Summit perimeter rim fence MUST be removed (only spiral safety guardrails remain)
  const summitFenceBoxes = SACRED_CLOUD_MOUNTAIN_SOLID_BOXES.filter((b) =>
    b.id.startsWith('sacred-mtn-summit-fence-')
  );
  assert.equal(summitFenceBoxes.length, 0, 'Summit rim fence must be removed');

  // Relocated Octagonal Bagua Yin-Yang platform in Chinese Fortress / Monks area
  const deckH = walkableHeightAt(
    CHINESE_BAGUA_PLATFORM_POS.x + 4.2,
    CHINESE_BAGUA_PLATFORM_POS.z,
    CHINESE_BAGUA_PLATFORM_POS.deckY
  );
  assert.equal(deckH.height, CHINESE_BAGUA_PLATFORM_POS.deckY);

  const yinYangCenterH = walkableHeightAt(
    CHINESE_BAGUA_PLATFORM_POS.x,
    CHINESE_BAGUA_PLATFORM_POS.z,
    CHINESE_BAGUA_PLATFORM_POS.deckY
  );
  assert.ok(yinYangCenterH.height > CHINESE_BAGUA_PLATFORM_POS.deckY);

  assert.ok(SACRED_CLOUD_MOUNTAIN_SOLID_BOXES.length >= 68);
  const contract = validateWorldEntityColliders();
  assert.equal(contract.valid, true, contract.errors.join('; '));
});

test('Sky Dragon periodically descends onto Sacred Cloud Mountain summit, perches, and takes off again', () => {
  const soar = evaluateSkyDragonPatrol(5.0);
  assert.equal(soar.phase, 'fortress_soar');
  assert.equal(soar.animState, 'fly');
  assert.ok(soar.z > -350.0);

  const descend = evaluateSkyDragonPatrol(34.0);
  assert.equal(descend.phase, 'circle_descend');
  assert.equal(descend.animState, 'fly');
  assert.ok(descend.y > SACRED_CLOUD_MOUNTAIN_POS.summitY + 2.0);

  const perchedIdle = evaluateSkyDragonPatrol(40.0);
  assert.equal(perchedIdle.phase, 'perched_summit');
  assert.equal(perchedIdle.animState, 'idle');
  assert.equal(perchedIdle.x, SACRED_CLOUD_MOUNTAIN_POS.dragonPerchX);
  assert.equal(perchedIdle.z, SACRED_CLOUD_MOUNTAIN_POS.dragonPerchZ);
  assert.ok(Math.abs(perchedIdle.y - (SACRED_CLOUD_MOUNTAIN_POS.summitY + 0.14)) < 0.05);
  assert.ok(teardropPoolSignedDist(perchedIdle.x, perchedIdle.z) > 6.0, 'Perch must stay clear of pond');
  assert.ok(
    Math.hypot(
      perchedIdle.x - SACRED_CLOUD_MOUNTAIN_POS.summitTreeX,
      perchedIdle.z - SACRED_CLOUD_MOUNTAIN_POS.summitTreeZ
    ) > 14.0,
    'Perch must stay clear of the summit cherry tree'
  );

  const perchedRoar = evaluateSkyDragonPatrol(44.0);
  assert.equal(perchedRoar.animState, 'roar');

  const takeoff = evaluateSkyDragonPatrol(57.0);
  assert.equal(takeoff.phase, 'takeoff_ascend');
  assert.equal(takeoff.animState, 'fly');
  assert.ok(takeoff.y > SACRED_CLOUD_MOUNTAIN_POS.summitY + 12.0);
  assert.ok(
    Math.hypot(
      takeoff.x - SACRED_CLOUD_MOUNTAIN_POS.summitTreeX,
      takeoff.z - SACRED_CLOUD_MOUNTAIN_POS.summitTreeZ
    ) > 18.0,
    'Takeoff flight must clear the summit cherry tree'
  );

  // Continuous loop wrap between t = 71.99 and t = 0.01
  const endWrap = evaluateSkyDragonPatrol(71.99);
  const startWrap = evaluateSkyDragonPatrol(0.01);
  assert.ok(Math.hypot(endWrap.x - startWrap.x, endWrap.z - startWrap.z) < 2.5);
});
