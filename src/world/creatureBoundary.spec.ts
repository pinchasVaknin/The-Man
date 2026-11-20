// ============================================================================
// MODULE: World / Creature Boundary Test
// DESIGN: Architecture test over the source files. Animated model factories (createReady<Animal>,
//         createReadyDwarfWarrior, createReadyWarriorMonk) may only be called by the systems that own a
//         creature's behavior. Everything else that needs the look of a creature without its life goes
//         through createStaticStatue / createStaticDragonPose (world/models/statues).
// SUMMARY: Fails when an unlisted file creates an animated creature, so a decoration can no longer turn
//          into a swimming or walking model with no AI, hit volume, loot or save state. Known offenders
//          are listed below with the reason; the test also fails when a listed file stops offending,
//          so the list shrinks as they are fixed.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// #endregion

// ======================== RULES ======================== \\
// #region Rules
const SOURCE_ROOT = fileURLToPath(new URL('../', import.meta.url));

const CREATURE_FACTORY = /\bcreateReady(Bear|Crocodile|Jaguar|Wolf|Rhino|CatLion|Stag|Deer|Hippo|KoiFish|Dolphin|Dove|Horse|DemonDragon|ForestDragon|DwarfWarrior|WarriorMonk)\b/;

/** Files that define the models: the animal and character modules and their one-line facades. */
function definesCreatureModel(file: string): boolean {
  return (
    /^world\/models\/[A-Z][A-Za-z]*\.ts$/.test(file) ||
    file.startsWith('world/models/animals/') ||
    file.startsWith('world/models/Characters/') ||
    file.startsWith('world/models/statues/') ||
    file === 'world/models/deerGlbLoader.ts' ||
    file.startsWith('testSupport/')
  );
}

/** Files that own a creature's behavior and may therefore create it, with the system that owns it. */
const SPAWN_AUTHORITIES: Readonly<Record<string, string>> = {
  'world/builders/wildlifeAndFootprintsBuilder.ts': 'wildlife system (species profiles, AI, hits, traps, loot)',
  'world/models/structures/settlementModels.ts': 'rideable horses (mount system)',
  'world/models/structures/sanctuaryAndDragonModels.ts': 'living sanctuary dragons (dragon fire system)',
  'world/models/structures/environmentAtmosphereModels.ts': 'bird flocks',
  'world/builders/dwarvenKingdomBuilder.ts': 'live dwarf miners (dwarf AI, loot)',
  'world/builders/ancientMine/mineDwarvesAi.ts': 'mine dwarves AI',
  'world/systems/monkTempleSystem.ts': 'temple monks AI',
  'lab/labModelFactory.ts': 'animation lab (developer tool)',
};

/** Files that still break the rule. Remove an entry when its file is fixed; the test enforces that. */
const KNOWN_VIOLATIONS: Readonly<Record<string, string>> = {
  'world/models/structures/skyHarborBuilder.ts': 'sky harbor koi swim on a loop with no behavior (central island phase)',
};
// #endregion

// ======================== FILE SCAN ======================== \\
// #region File Scan
function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.(spec|test)\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function creatureFactoryFiles(): string[] {
  return listSourceFiles(SOURCE_ROOT)
    .map((full) => path.relative(SOURCE_ROOT, full).split(path.sep).join('/'))
    .filter((file) => CREATURE_FACTORY.test(readFileSync(path.join(SOURCE_ROOT, file), 'utf8')));
}
// #endregion

// ======================== TESTS ======================== \\
// #region Boundary
test('creatureFactories_WhenFilesOutsideTheOwningSystemsCreateCreatures_ShouldNotExist', () => {
  const offenders = creatureFactoryFiles().filter(
    (file) => !definesCreatureModel(file) && !(file in SPAWN_AUTHORITIES) && !(file in KNOWN_VIOLATIONS)
  );

  assert.deepEqual(
    offenders,
    [],
    'These files create an animated creature without owning its behavior. Use createStaticStatue / createStaticDragonPose for a lifeless look, or spawn through the wildlife system:'
  );
});

test('creatureFactories_WhenAKnownViolationIsFixed_ShouldBeRemovedFromTheList', () => {
  const using = new Set(creatureFactoryFiles());

  const fixed = Object.keys(KNOWN_VIOLATIONS).filter((file) => !using.has(file));

  assert.deepEqual(fixed, [], 'Remove these files from KNOWN_VIOLATIONS: they no longer create creatures.');
});

test('creatureFactories_WhenASpawnAuthorityStopsCreatingCreatures_ShouldBeRemovedFromTheList', () => {
  const using = new Set(creatureFactoryFiles());

  const stale = Object.keys(SPAWN_AUTHORITIES).filter((file) => !using.has(file));

  assert.deepEqual(stale, [], 'Remove these files from SPAWN_AUTHORITIES: they no longer create creatures.');
});
// #endregion
