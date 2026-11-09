// ============================================================================
// MODULE: World / Systems / Behavior Characterization Tests
// DESIGN: Golden-master tests that pin the current simulation output before refactoring
// SUMMARY: Records per-species rules, a scripted wildlife run, a scripted player run,
//          the weather and solar cycles, arrow flight and a sword swing as JSON snapshots.
//          These tests describe what the code does today, not what it should do.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import { assertMatchesGolden } from '../../testSupport/goldenMaster';
import {
  createInitialWildlifeState,
  damageGroundAnimal,
  getAnimalLootDrops,
  getAnimalMaxHp,
  getAnimalSensoryProfile,
  getAnimalSizeRank,
  getAnimalSpeciesName,
  getPredatorAttackTriggerDist,
  getPredatorMeleeStandoffDist,
  isPredatorSpecies,
  stepBoidsAndWildlife,
  type GroundAnimalSpecies,
} from './boidsAndWildlifeSystem';
import { createInitialPlayerState, createInitialRideableHorses, stepPlayerPhysics } from './playerPhysicsSystem';
import { computeDynamicSolarCycle, computeWeatherState } from './atmosphereAndWeatherSystem';
import { spawnArrowProjectile, stepArrowsPhysics, stepSwordSwingCombat, triggerSwordSlash } from './combatAndInventorySystem';
import { getWorldObstacles } from './terrainAndBiomeSystem';
import type { IArrowProjectile, IPlayerInput } from '../domain/worldTypes';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
const ALL_SPECIES: readonly GroundAnimalSpecies[] = [
  'rabbit', 'squirrel', 'deer', 'sheep', 'bear', 'crocodile', 'jaguar', 'wolf', 'rhino', 'lion', 'stag', 'dragon', 'hippo', 'koifish', 'dolphin',
];
const FRAME_DT = 1 / 60;

function golden(name: string): URL {
  return new URL(`./__golden__/${name}.json`, import.meta.url);
}

function idleInput(overrides: Partial<IPlayerInput> = {}): IPlayerInput {
  return {
    forward: 0, right: 0, sprint: false, relaxed: false, jumpPressed: false, jumpHeld: false,
    lookYawDelta: 0, lookPitchDelta: 0, ...overrides,
  };
}
// #endregion

// ======================== SPECIES RULES ======================== \\
// #region Species Rules
test('speciesRules_WhenEvaluatedForEverySpecies_ShouldMatchGolden', () => {
  // Arrange & Act
  const table = ALL_SPECIES.map((species) => ({
    species,
    awake: getAnimalSensoryProfile(species, false),
    asleep: getAnimalSensoryProfile(species, true),
    sizeRank: getAnimalSizeRank(species),
    isPredator: isPredatorSpecies(species),
    standoff: getPredatorMeleeStandoffDist(species),
    attackTrigger: getPredatorAttackTriggerDist(species),
    maxHp: getAnimalMaxHp(species),
    name: getAnimalSpeciesName(species),
    loot: getAnimalLootDrops(species),
  }));

  // Assert
  assertMatchesGolden(golden('species-rules'), table);
});
// #endregion

// ======================== WILDLIFE SIMULATION ======================== \\
// #region Wildlife Simulation
function runWildlifeScenario(daylight: number, rain: number): unknown[] {
  const { birds, animals } = createInitialWildlifeState();
  const horses = createInitialRideableHorses();
  const player = createInitialPlayerState();
  const waypoints = [animals[0], animals[Math.floor(animals.length / 2)], animals[animals.length - 1]];
  const frames: unknown[] = [];
  for (let frame = 0; frame < 900; frame++) {
    const target = waypoints[Math.floor(frame / 300)];
    player.x += (target.homeX - player.x) * 0.02;
    player.z += (target.homeZ - player.z) * 0.02;
    player.vx = 4;
    player.vz = 0;
    const result = stepBoidsAndWildlife(FRAME_DT, 10 + frame * FRAME_DT, birds, animals, player, horses, daylight, rain);
    if (frame % 150 === 149) {
      frames.push({
        frame,
        result,
        animals: animals.map((a) => ({
          id: a.id, species: a.species, x: a.x, y: a.y, z: a.z, yaw: a.yaw, vx: a.vx, vz: a.vz,
          aiBehavior: a.aiBehavior, alertLevel: a.alertLevel, wakeMeter: a.wakeMeter, isDead: a.isDead,
        })),
        birds: birds.map((b) => ({ x: b.x, y: b.y, z: b.z })),
      });
    }
  }
  return frames;
}

test('wildlifeSimulation_WhenPlayerWalksThroughHabitatsByDay_ShouldMatchGolden', () => {
  // Arrange & Act
  const frames = runWildlifeScenario(1.0, 0);

  // Assert
  assertMatchesGolden(golden('wildlife-day'), frames);
});

test('wildlifeSimulation_WhenPlayerWalksThroughHabitatsAtRainyNight_ShouldMatchGolden', () => {
  // Arrange & Act
  const frames = runWildlifeScenario(0.2, 0.7);

  // Assert
  assertMatchesGolden(golden('wildlife-rainy-night'), frames);
});

test('wildlifeSimulation_WhenPlayerConfrontsEachSpecies_ShouldMatchGolden', () => {
  // Arrange
  const trace: unknown[] = [];

  // Act
  for (const species of ALL_SPECIES) {
    for (const isShot of [false, true]) {
      const { birds, animals } = createInitialWildlifeState();
      const horses = createInitialRideableHorses();
      const target = animals.find((animal) => animal.species === species);
      if (!target) continue;
      const player = createInitialPlayerState();
      player.x = target.x + 9;
      player.z = target.z;
      if (isShot) damageGroundAnimal(target, 1, player.x, player.z, animals);
      for (let frame = 0; frame < 360; frame++) {
        player.x += (target.x + 1.5 - player.x) * 0.004;
        player.vx = -1.2;
        player.vz = 0;
        stepBoidsAndWildlife(FRAME_DT, 20 + frame * FRAME_DT, birds, animals, player, horses, 1.0, 0);
        if (frame % 60 === 59) {
          trace.push({
            species, isShot, frame,
            target: {
              x: target.x, z: target.z, yaw: target.yaw, vx: target.vx, vz: target.vz, hp: target.hp,
              aiBehavior: target.aiBehavior, alertLevel: target.alertLevel, pounceHeight: target.pounceHeight,
              rhinoPhase: target.rhinoPhase, wokenUpTimer: target.wokenUpTimer,
            },
            player: { x: player.x, z: player.z, vx: player.vx, vz: player.vz, stamina: player.stamina },
          });
        }
      }
    }
  }

  // Assert
  assertMatchesGolden(golden('wildlife-confrontations'), trace);
});
// #endregion

// ======================== PLAYER SIMULATION ======================== \\
// #region Player Simulation
test('playerPhysics_WhenScriptedWalkSprintJumpRun_ShouldMatchGolden', () => {
  // Arrange
  const player = createInitialPlayerState();
  const horses = createInitialRideableHorses();
  const obstacles = [...getWorldObstacles()];
  const script: ReadonlyArray<{ frames: number; input: IPlayerInput }> = [
    { frames: 90, input: idleInput({ forward: 1 }) },
    { frames: 90, input: idleInput({ forward: 1, sprint: true, lookYawDelta: 0.01 }) },
    { frames: 1, input: idleInput({ forward: 1, jumpPressed: true, jumpHeld: true }) },
    { frames: 60, input: idleInput({ forward: 1, jumpHeld: true }) },
    { frames: 90, input: idleInput({ right: 1, relaxed: true, lookPitchDelta: -0.002 }) },
    { frames: 60, input: idleInput() },
  ];
  const trace: unknown[] = [];
  let frame = 0;

  // Act
  for (const step of script) {
    for (let i = 0; i < step.frames; i++, frame++) {
      const result = stepPlayerPhysics(player, step.input, obstacles, FRAME_DT, new Set(), horses);
      if (frame % 30 === 0) trace.push({ frame, result, player: { ...player } });
    }
  }

  // Assert
  assertMatchesGolden(golden('player-physics'), trace);
});
// #endregion

// ======================== ATMOSPHERE ======================== \\
// #region Atmosphere
test('weatherAndSolarCycle_WhenSampledAcrossTime_ShouldMatchGolden', () => {
  // Arrange & Act
  const solar = Array.from({ length: 49 }, (_, i) => computeDynamicSolarCycle(i * 0.5));
  const weather = Array.from({ length: 40 }, (_, i) => computeWeatherState(i * 97.5, (i % 7) * 40 - 120, (i % 5) * 55 - 110));

  // Assert
  assertMatchesGolden(golden('atmosphere'), { solar, weather });
});
// #endregion

// ======================== COMBAT ======================== \\
// #region Combat
test('arrowFlight_WhenFullyDrawnArrowFlies_ShouldMatchGolden', () => {
  // Arrange
  const player = createInitialPlayerState();
  const obstacles = getWorldObstacles();
  const arrows: IArrowProjectile[] = [spawnArrowProjectile(player, 1.0, () => 1)];
  const trace: unknown[] = [];

  // Act
  for (let frame = 0; frame < 180; frame++) {
    const result = stepArrowsPhysics(arrows, obstacles, FRAME_DT);
    if (frame % 15 === 0) trace.push({ frame, result: { ...result, hitAnimal: result.hitAnimal?.id ?? null }, arrows });
  }

  // Assert
  assertMatchesGolden(golden('arrow-flight'), trace);
});

test('swordSwing_WhenLightAndHeavySlashesPlay_ShouldMatchGolden', () => {
  // Arrange
  const player = createInitialPlayerState();
  player.equippedTool = 'sword';
  const obstacles = getWorldObstacles();
  const trace: unknown[] = [];

  // Act
  for (const isHeavy of [false, true]) {
    triggerSwordSlash(player, obstacles, isHeavy);
    for (let frame = 0; frame < 60; frame++) {
      const hit = stepSwordSwingCombat(player, obstacles, FRAME_DT);
      if (frame % 6 === 0) {
        trace.push({
          isHeavy, frame, hit,
          progress: player.swordSwingProgress, combo: player.swordComboIndex, stamina: player.stamina,
        });
      }
    }
  }

  // Assert
  assertMatchesGolden(golden('sword-swing'), trace);
});
// #endregion
