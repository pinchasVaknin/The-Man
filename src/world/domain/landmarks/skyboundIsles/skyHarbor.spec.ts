// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles (tests)
// DESIGN: Walks Sky Harbor with the simulated player (gravity, jump, air control, wind,
//         bounce pads and the hub's solid boxes), so "you can climb the Windspire" or "the big
//         mushroom reaches the perch" is proven on the data, not by eye.
// SUMMARY: Windspire stair and balcony, balcony railings, dock and airship boarding, bounce
//          mushrooms, wind flowers, and that no hub prop blocks an archipelago route.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FLOATING_ISLAND_STAIR_POS } from '../coreLandmarks';
import { SKY_BRIDGES, SKY_HARBOR } from './skyboundLayout';
import { SKY_CLOUDS } from './skyCloudRoutes';
import { resetSkyClouds } from './skyCloudSystem';
import {
  AIRSHIP_GANGPLANK,
  GARDEN_CANOPY_PERCH,
  MOORED_AIRSHIP_DECK,
  SKY_BALCONIES,
  SKY_BOUNCE_PADS,
  WINDSPIRE_BALCONY,
  WINDSPIRE_STAIR,
  windspireStairHeightsAt,
} from './skyHarborLayout';
import { SKY_WIND_CURRENTS, SKY_WIND_FLOWERS, isWindCurrentActive, resetSkyWindFlowers, stepSkyWindFlowers } from './skyWindSystem';
import { skyboundSurfaceAt } from './skyboundSurface';
import { blockingSkyHarborBox, simulateSkyPlayer, SIM_PLAYER, type SimPilot } from './skyboundTestSim';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Pilots
/**
 * Walks along the middle of the Windspire stair, aiming a little ahead of the feet; at the
 * top it keeps walking round (onto the landing) and then steps outward onto the balcony ring.
 */
const climbWindspireStair: SimPilot = (b) => {
  const radius = Math.hypot(b.x - WINDSPIRE_STAIR.cx, b.z - WINDSPIRE_STAIR.cz);
  if (radius >= WINDSPIRE_BALCONY.innerR + 0.8) return null;
  const atTop = b.y >= WINDSPIRE_BALCONY.y - 0.05;
  const aim = atTop ? WINDSPIRE_BALCONY.innerR + 1.4 : (WINDSPIRE_STAIR.innerR + WINDSPIRE_STAIR.outerR) / 2;
  const ang = Math.atan2(b.z - WINDSPIRE_STAIR.cz, b.x - WINDSPIRE_STAIR.cx) + (atTop ? 0.05 : 0.35);
  return { towardX: WINDSPIRE_STAIR.cx + Math.cos(ang) * aim, towardZ: WINDSPIRE_STAIR.cz + Math.sin(ang) * aim };
};

/** Walks through a list of waypoints in order, jumping when `jump` is set on a waypoint. */
function followWaypoints(points: ReadonlyArray<{ x: number; z: number; jump?: boolean }>): SimPilot {
  let index = 0;
  return (b) => {
    while (index < points.length && Math.hypot(points[index].x - b.x, points[index].z - b.z) < 0.6) index++;
    if (index >= points.length) return null;
    const p = points[index];
    return { towardX: p.x, towardZ: p.z, jump: p.jump };
  };
}

function describeEnd(b: { x: number; y: number; z: number; surface: { id: string } | null }): string {
  return `ended at (${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.z.toFixed(1)}) on ${b.surface?.id ?? 'nothing'}`;
}
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  resetSkyClouds();
  resetSkyWindFlowers();
});

// #region Windspire
describe('windspire', () => {
  it('windspireStair_WhenWalkedFromTheBottom_ShouldReachTheTowerBalcony', () => {
    // Arrange: start on the deck just before the stair's first step.
    const startAng = WINDSPIRE_STAIR.startAngle - 0.25;
    const midR = (WINDSPIRE_STAIR.innerR + WINDSPIRE_STAIR.outerR) / 2;
    const start = { x: WINDSPIRE_STAIR.cx + Math.cos(startAng) * midR, y: WINDSPIRE_STAIR.baseY, z: WINDSPIRE_STAIR.cz + Math.sin(startAng) * midR };
    // Act
    const end = simulateSkyPlayer(start, climbWindspireStair, 60);
    // Assert
    assert.equal(end.surface?.id, 'windspire-balcony', describeEnd(end));
  });

  it('windspireTopLanding_WhenPlayerKeepsWalkingRoundPastTheLastStep_ShouldNotFallOff', () => {
    // Arrange: start on the top landing and keep walking round the tower.
    const a = WINDSPIRE_STAIR.startAngle + WINDSPIRE_STAIR.turns * Math.PI * 2 + 0.1;
    const midR = (WINDSPIRE_STAIR.innerR + WINDSPIRE_STAIR.outerR) / 2;
    const pilot: SimPilot = (b, t) => {
      const ang = Math.atan2(b.z - WINDSPIRE_STAIR.cz, b.x - WINDSPIRE_STAIR.cx) + 0.35;
      return t < 4 ? { towardX: WINDSPIRE_STAIR.cx + Math.cos(ang) * midR, towardZ: WINDSPIRE_STAIR.cz + Math.sin(ang) * midR } : null;
    };
    // Act
    const end = simulateSkyPlayer({ x: WINDSPIRE_STAIR.cx + Math.cos(a) * midR, y: WINDSPIRE_BALCONY.y, z: WINDSPIRE_STAIR.cz + Math.sin(a) * midR }, pilot, 8);
    // Assert
    assert.ok(Math.abs(end.y - WINDSPIRE_BALCONY.y) < 0.05, describeEnd(end));
  });

  it('windspireStairHeights_WhenSampledAroundTheTower_ShouldRiseSmoothlyFromDeckToBalcony', () => {
    // Arrange
    const samples = 400;
    const sweep = WINDSPIRE_STAIR.turns * Math.PI * 2;
    // Act
    const path = Array.from({ length: samples + 1 }, (_, i) => {
      const a = WINDSPIRE_STAIR.startAngle + (sweep * i) / samples;
      return Math.max(...windspireStairHeightsAt(a).filter((h) => h <= WINDSPIRE_STAIR.baseY + ((WINDSPIRE_STAIR.topY - WINDSPIRE_STAIR.baseY) * i) / samples + 1e-6));
    });
    const biggestStep = Math.max(...path.slice(1).map((h, i) => h - path[i]));
    // Assert
    assert.ok(biggestStep < SIM_PLAYER.maxStepUp, `biggest step ${biggestStep.toFixed(3)} m`);
  });

  it('towerBalcony_WhenPlayerWalksTowardTheOuterEdge_ShouldBeStoppedByTheRailing', () => {
    // Arrange: stand on the ring, then walk straight outward (east).
    const start = { x: WINDSPIRE_BALCONY.cx + 10.6, y: WINDSPIRE_BALCONY.y, z: WINDSPIRE_BALCONY.cz };
    const pilot: SimPilot = (_b, t) => (t < 3 ? { towardX: start.x + 20, towardZ: start.z } : null);
    // Act
    const end = simulateSkyPlayer(start, pilot, 6);
    // Assert
    assert.ok(Math.abs(end.y - WINDSPIRE_BALCONY.y) < 0.05, describeEnd(end));
  });
});
// #endregion

// #region Balconies
describe('observation balconies', () => {
  for (const balcony of SKY_BALCONIES) {
    it(`${balcony.id}_WhenPlayerWalksOffTheFarEnd_ShouldBeStoppedByTheRailing`, () => {
      // Arrange: walk from the hub centre side through the balcony and keep going.
      const cx = (balcony.minX + balcony.maxX) / 2;
      const cz = (balcony.minZ + balcony.maxZ) / 2;
      const dx = cx - SKY_HARBOR.x;
      const dz = cz - SKY_HARBOR.z;
      const len = Math.hypot(dx, dz);
      const pilot: SimPilot = (_b, t) => (t < 6 ? { towardX: cx + (dx / len) * 30, towardZ: cz + (dz / len) * 30 } : null);
      // Act
      const end = simulateSkyPlayer({ x: cx, y: SKY_HARBOR.deckY, z: cz }, pilot, 10);
      // Assert
      assert.equal(end.surface?.id, balcony.id, describeEnd(end));
    });
  }
});
// #endregion

// #region Sky Dock
describe('sky dock', () => {
  it('mooredAirship_WhenPlayerWalksTheDockAndGangplank_ShouldStandOnItsDeck', () => {
    // Arrange
    const route = [
      { x: 806.0, z: -8.0 },
      { x: AIRSHIP_GANGPLANK.ax, z: -8.0 },
      { x: AIRSHIP_GANGPLANK.ax, z: AIRSHIP_GANGPLANK.az },
      { x: AIRSHIP_GANGPLANK.bx, z: 3.0 },
    ];
    // Act
    const end = simulateSkyPlayer({ x: 800.0, y: SKY_HARBOR.deckY, z: -6.0 }, followWaypoints(route), 30);
    // Assert
    assert.equal(end.surface?.id, 'airship-deck', describeEnd(end));
    assert.equal(end.y, MOORED_AIRSHIP_DECK.y);
  });
});
// #endregion

// #region Sky Garden
describe('sky garden', () => {
  it('bigMushroom_WhenPlayerJumpsOnItAndSteersToThePerch_ShouldLandOnTheCanopyPerch', () => {
    // Arrange
    const big = SKY_BOUNCE_PADS.find((p) => p.id === 'mushroom-big')!;
    const start = { x: big.x + 3.5, y: SKY_HARBOR.deckY, z: big.z };
    const pilot: SimPilot = (b) =>
      b.y > big.topY + 1.0 ? { towardX: GARDEN_CANOPY_PERCH.x, towardZ: GARDEN_CANOPY_PERCH.z } : { towardX: big.x, towardZ: big.z, jump: true };
    // Act
    const end = simulateSkyPlayer(start, pilot, 20);
    // Assert
    assert.equal(end.surface?.id, GARDEN_CANOPY_PERCH.id, describeEnd(end));
    assert.ok(end.hardestLandingMps < SIM_PLAYER.fallDamageFromMps, `landed at ${end.hardestLandingMps.toFixed(1)} m/s`);
  });

  for (const pad of SKY_BOUNCE_PADS) {
    it(`${pad.id}_WhenStoodOn_ShouldLaunchThePlayerUpward`, () => {
      // Arrange
      let highest = 0;
      const pilot: SimPilot = (b) => {
        highest = Math.max(highest, b.y);
        return b.y < pad.topY - 0.3 ? { towardX: pad.x, towardZ: pad.z, jump: true } : null;
      };
      // Act
      simulateSkyPlayer({ x: pad.x + pad.radius + 1.0, y: SKY_HARBOR.deckY, z: pad.z }, pilot, 6);
      // Assert
      assert.ok(highest > pad.topY + 3.0, `highest point ${highest.toFixed(1)} m`);
    });
  }

  it('windFlower_WhenNobodyIsNear_ShouldStayClosed', () => {
    // Arrange
    const current = SKY_WIND_CURRENTS.find((c) => c.flowerId === 'wind-flower-perch')!;
    // Act
    stepSkyWindFlowers(0.1, SKY_HARBOR.checkpoint.x, SKY_HARBOR.deckY, SKY_HARBOR.checkpoint.z);
    // Assert
    assert.equal(isWindCurrentActive(current), false);
  });

  it('perchWindFlower_WhenPlayerStepsInAndSteersToThePerch_ShouldLandOnTheCanopyPerch', () => {
    // Arrange
    const flower = SKY_WIND_FLOWERS.find((f) => f.id === 'wind-flower-perch')!;
    const pilot: SimPilot = (b) => (b.y > 74 ? { towardX: GARDEN_CANOPY_PERCH.x, towardZ: GARDEN_CANOPY_PERCH.z } : null);
    // Act
    const end = simulateSkyPlayer({ x: flower.x, y: flower.deckY, z: flower.z }, pilot, 20);
    // Assert
    assert.equal(end.surface?.id, GARDEN_CANOPY_PERCH.id, describeEnd(end));
  });

  it('windspireWindFlower_WhenPlayerStepsInAndSteersToTheTower_ShouldLandOnTheTowerBalcony', () => {
    // Arrange
    const flower = SKY_WIND_FLOWERS.find((f) => f.id === 'wind-flower-windspire')!;
    const pilot: SimPilot = (b) => (b.y > 79 ? { towardX: WINDSPIRE_BALCONY.cx + 3, towardZ: WINDSPIRE_BALCONY.cz - 10.5 } : null);
    // Act
    const end = simulateSkyPlayer({ x: flower.x, y: flower.deckY, z: flower.z }, pilot, 20);
    // Assert
    assert.equal(end.surface?.id, 'windspire-balcony', describeEnd(end));
  });
});
// #endregion

// #region Routes Stay Open
describe('sky harbor keeps archipelago routes open', () => {
  const firstCloudOf = (routeId: string) => SKY_CLOUDS.find((c) => c.routeId === routeId)!;
  const spots: ReadonlyArray<[string, number, number]> = [
    ['climb arrival ledge', FLOATING_ISLAND_STAIR_POS.topX + 1.0, FLOATING_ISLAND_STAIR_POS.z],
    ['arrival gate centre', 738.5, -35.0],
    ['plaza centre', 752.0, -35.0],
    ['hub checkpoint', SKY_HARBOR.checkpoint.x, SKY_HARBOR.checkpoint.z],
    ['cloud run start', firstCloudOf('cloud-run').x, firstCloudOf('cloud-run').z - 5.0],
    ['endless descent start', 802.1, 3.0],
    ['crystal bridge end', SKY_BRIDGES[0].bx, SKY_BRIDGES[0].bz],
    ['hidden return landing', 788.0, 4.0],
    ['observatory downdraft landing', 795.0, -66.0],
    ['windspire shortcut entry', 782.0, -58.0],
  ];
  for (const [name, x, z] of spots) {
    it(`${name}_WhenStoodOn_ShouldNotBeBlockedByAnyHubProp`, () => {
      // Arrange
      const y = SKY_HARBOR.deckY;
      // Act
      const blocker = blockingSkyHarborBox(x, y, z);
      // Assert
      assert.equal(blocker, null);
      assert.ok(skyboundSurfaceAt(x, z, y) !== null, `${name} has no floor`);
    });
  }
});
// #endregion
