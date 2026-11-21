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

/** Words that name a creature. A procedural group whose name holds one of them (as a whole camelCase word) is a creature. */
const CREATURE_WORDS = new Set([
  'bear', 'crocodile', 'jaguar', 'wolf', 'rhino', 'lion', 'stag', 'deer', 'hippo', 'fish', 'koi', 'dolphin', 'dove', 'bird', 'gull', 'gulls', 'seagulls',
  'seagull', 'horse', 'dragon', 'dwarf', 'monk', 'butterfly', 'butterflies', 'squirrel', 'rabbit', 'fox', 'boar', 'npc', 'merchant', 'villager',
]);

/** Procedural creature groups that are allowed, keyed file#identifier, with the reason. */
const PROCEDURAL_ALLOWED: Readonly<Record<string, string>> = {
  'world/models/structures/harborModels.ts#npcGroup': 'harbor merchant, bound to a market stall (trade interaction)',
  'world/models/structures/harborModels.ts#swNpcGroup': 'south-west harbor merchant, bound to a market stall (trade interaction)',
  'world/models/structures/skyHarborDockBuilder.ts#merchantNpc': 'sky harbor merchant, bound to the market-sky-hoverbike stall',
  'world/models/structures/placedTrapModels.ts#doveGroup': 'caught critter shown inside a trap (the trap system owns its state and loot)',
  'world/models/structures/placedTrapModels.ts#fish': 'caught fish shown inside a trap (the trap system owns its state and loot)',
};

/** Procedural creature groups that still break the rule, keyed file#identifier. Remove an entry when it is fixed. */
const PROCEDURAL_KNOWN_VIOLATIONS: Readonly<Record<string, string>> = {};

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
  'world/builders/dwarvenKingdomBuilder.ts': 'live dwarf miners (dwarf AI, loot)',
  'world/builders/ancientMine/mineDwarvesAi.ts': 'mine dwarves AI',
  'world/systems/monkTempleSystem.ts': 'temple monks AI',
  'lab/labModelFactory.ts': 'animation lab (developer tool)',
};

/** Files that still break the rule. Remove an entry when its file is fixed; the test enforces that. */
const KNOWN_VIOLATIONS: Readonly<Record<string, string>> = {
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

function relativeSourceFiles(): string[] {
  return listSourceFiles(SOURCE_ROOT).map((full) => path.relative(SOURCE_ROOT, full).split(path.sep).join('/'));
}

function read(file: string): string {
  return readFileSync(path.join(SOURCE_ROOT, file), 'utf8');
}

/** Every createReady<Name> exported anywhere, so a new creature model is covered the moment it exists. */
function creatureFactoryPattern(): RegExp {
  const names = new Set<string>();
  for (const file of relativeSourceFiles()) {
    for (const match of read(file).matchAll(/export (?:async )?function (createReady\w+)/g)) names.add(match[1]);
  }
  return new RegExp(String.raw`\b(` + [...names].join('|') + String.raw`)\b`);
}

function creatureFactoryFiles(): string[] {
  const factory = creatureFactoryPattern();
  return relativeSourceFiles().filter((file) => factory.test(read(file)));
}

function splitCamelCase(name: string): string[] {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
}

/** Procedural creatures: a THREE.Group (or Object3D) variable whose name is a creature word, outside the model definitions. */
function proceduralCreatureGroups(): string[] {
  const found: string[] = [];
  for (const file of relativeSourceFiles()) {
    if (definesCreatureModel(file) || file in SPAWN_AUTHORITIES) continue;
    for (const match of read(file).matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*new THREE\.(?:Group|Object3D)\(/g)) {
      if (splitCamelCase(match[1]).some((word) => CREATURE_WORDS.has(word))) found.push(`${file}#${match[1]}`);
    }
  }
  return found;
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
test('proceduralCreatures_WhenAGroupNamedAfterACreatureIsBuiltOutsideTheOwningSystems_ShouldNotExist', () => {
  const offenders = proceduralCreatureGroups().filter((key) => !(key in PROCEDURAL_ALLOWED) && !(key in PROCEDURAL_KNOWN_VIOLATIONS));

  assert.deepEqual(
    offenders,
    [],
    'These groups look like creatures but have no behavior system. Make them real wildlife, make them a createStaticStatue, or list them in PROCEDURAL_ALLOWED with a reason:'
  );
});

test('proceduralCreatures_WhenAListedGroupDisappears_ShouldBeRemovedFromTheLists', () => {
  const present = new Set(proceduralCreatureGroups());

  const stale = [...Object.keys(PROCEDURAL_ALLOWED), ...Object.keys(PROCEDURAL_KNOWN_VIOLATIONS)].filter((key) => !present.has(key));

  assert.deepEqual(stale, [], 'Remove these entries: the group no longer exists.');
});
// #endregion
