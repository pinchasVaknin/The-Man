// ============================================================================
// MODULE: Lab / Catalog & State Unit Tests
// DESIGN: Pure unit tests using node:test and node:assert/strict
// SUMMARY: Verifies that all world characters, humans, animals, and creatures
//          are cataloged with static 'none' default animations and valid skins.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { before, describe, it } from 'node:test';
import { preloadAnimalModelsForTests } from '../testSupport/animalModelsForTests';
import assert from 'node:assert/strict';
import {
  DEFAULT_LAB_POSE_OVERRIDES,
  LAB_ENTITIES,
  LAB_CATEGORIES,
  countActivePoseOverrides,
  createInitialLabSessionState,
  selectLabCategory,
  selectLabEntity,
  filterLabEntities,
  getEntityEditorLabels,
  getEffectiveLabAnimationSpeed,
  getLabEntityById,
  getLabAnimationForEntity,
  getLabSkinForEntity,
  computeLabAnimationCycleProgress,
} from './labCatalog';

// #endregion

// ======================== HAPPY PATH TESTS ======================== \\
// #region Happy Path Tests
describe('Character & Animation Lab Catalog', () => {
  before(async () => {
    await preloadAnimalModelsForTests();
  });

  it('organizes all world entities into 2 distinct categories: characters and animals', () => {
    assert.equal(LAB_CATEGORIES.length, 2);
    assert.deepEqual(
      LAB_CATEGORIES.map((c) => c.id),
      ['characters', 'animals']
    );

    const characters = LAB_ENTITIES.filter((e) => e.category === 'characters');
    const animals = LAB_ENTITIES.filter((e) => e.category === 'animals');

    assert.equal(characters.length, 8, 'Should include all 8 characters');
    assert.equal(animals.length, 22, 'Should include all 22 animals (including forest_bear, river_crocodile, jungle_jaguar, forest_wolf, savanna_rhino, savanna_lion, royal_stag, forest_dragon, demon_dragon, oasis_hippo, koi_fish, and ocean_dolphin)');

    // Verify Koi Fish, Meadow Butterfly, Seagull, Bear, Crocodile, Jaguar, Wolf, Rhino, Lion, Stag, Dragons, Hippo, and Dolphin are standalone entries
    assert.ok(animals.some((a) => a.id === 'koi_fish'), 'Koi fish must be its own standalone animal entry');
    assert.ok(animals.some((a) => a.id === 'meadow_butterfly'), 'Meadow butterfly must be its own standalone animal entry');
    assert.ok(animals.some((a) => a.id === 'harbor_seagull'), 'Harbor seagull must be its own standalone animal entry');
    assert.ok(animals.some((a) => a.id === 'forest_bear'), 'Forest bear must be included in animals');
    assert.ok(animals.some((a) => a.id === 'river_crocodile'), 'River crocodile must be included in animals');
    assert.ok(animals.some((a) => a.id === 'jungle_jaguar'), 'Jungle jaguar must be included in animals');
    assert.ok(animals.some((a) => a.id === 'forest_wolf'), 'Forest wolf must be included in animals');
    assert.ok(animals.some((a) => a.id === 'savanna_rhino'), 'Savanna rhino must be included in animals');
    assert.ok(animals.some((a) => a.id === 'savanna_lion'), 'Savanna lion must be included in animals');
    assert.ok(animals.some((a) => a.id === 'royal_stag'), 'Royal stag must be included in animals');
    assert.ok(animals.some((a) => a.id === 'forest_dragon'), 'Forest dragon must be included in animals');
    assert.ok(animals.some((a) => a.id === 'demon_dragon'), 'Demon dragon must be included in animals');
    assert.ok(animals.some((a) => a.id === 'oasis_hippo'), 'Oasis hippo must be included in animals');
    assert.ok(animals.some((a) => a.id === 'ocean_dolphin'), 'Ocean dolphin must be included in animals');
    assert.ok(!LAB_ENTITIES.some((e) => e.id === 'koi_and_butterfly'), 'Combined koi_and_butterfly entry must not exist');
  });

  it('ensures every entity starts with a static "none" animation and has multiple animations and skins', () => {
    for (const entity of LAB_ENTITIES) {
      assert.ok(entity.animations.length >= 3, `${entity.id} should have at least 3 animation states`);
      assert.equal(
        entity.animations[0].id,
        'none',
        `${entity.id} first animation must be 'none' (no animation / static pose)`
      );
      assert.equal(entity.animations[0].isStaticDefault, true);
      assert.ok(entity.skins.length >= 3, `${entity.id} should have at least 3 skin variants`);
      assert.ok(entity.sourceFile.startsWith('src/world/'), `${entity.id} must reference its world source file`);
    }
  });

  it('initializes session state with "none" animation and switches cleanly between characters and animals', () => {
    const initial = createInitialLabSessionState();
    assert.equal(initial.selectedAnimationId, 'none');
    assert.equal(initial.categoryFilter, 'characters');
    assert.equal(initial.activeRightTab, 'animations');

    const switchedToAnimals = selectLabCategory(initial, 'animals');
    assert.equal(switchedToAnimals.categoryFilter, 'animals');
    assert.equal(switchedToAnimals.selectedEntityId, 'rideable_horse');
    assert.equal(switchedToAnimals.selectedAnimationId, 'none');

    const switchedEntity = selectLabEntity(switchedToAnimals, 'koi_fish');
    assert.equal(switchedEntity.selectedEntityId, 'koi_fish');
    assert.equal(switchedEntity.selectedAnimationId, 'none', 'Switching entity must start with no animation');
    assert.equal(switchedEntity.selectedSkinId, 'koi_imperial_gold');
  });

  it('filters entities accurately by category and search query', () => {
    const onlyCharacters = filterLabEntities(LAB_ENTITIES, 'characters', '');
    assert.equal(onlyCharacters.length, 8);
    assert.ok(onlyCharacters.every((e) => e.category === 'characters'));

    const onlyAnimals = filterLabEntities(LAB_ENTITIES, 'animals', '');
    assert.equal(onlyAnimals.length, 22);
    assert.ok(onlyAnimals.every((e) => e.category === 'animals'));

    const allCombined = filterLabEntities(LAB_ENTITIES, 'all', '');
    assert.equal(allCombined.length, 30, 'Dropdown "all" option must return all 30 entities');

    const koiSearch = filterLabEntities(LAB_ENTITIES, 'animals', 'koi');
    assert.equal(koiSearch.length, 1);
    assert.equal(koiSearch[0].id, 'koi_fish');

    const wolfSearch = filterLabEntities(LAB_ENTITIES, 'animals', 'wolf');
    assert.equal(wolfSearch.length, 1);
    assert.equal(wolfSearch[0].id, 'forest_wolf');

    const rhinoSearch = filterLabEntities(LAB_ENTITIES, 'animals', 'rhino');
    assert.equal(rhinoSearch.length, 1);
    assert.equal(rhinoSearch[0].id, 'savanna_rhino');

    const dragonSearch = filterLabEntities(LAB_ENTITIES, 'animals', 'dragon');
    assert.equal(dragonSearch.length, 3);
  });

  it('computes animation cycle progress as 0 for "none" and wraps [0, 1) for active animations', () => {
    const ranger = getLabEntityById('ranger_third_person');
    const noneAnim = getLabAnimationForEntity(ranger, 'none');
    const walkAnim = getLabAnimationForEntity(ranger, 'walk');
    const skin = getLabSkinForEntity(ranger, 'ranger_imperial_guard');

    assert.equal(skin.id, 'ranger_imperial_guard');
    assert.equal(computeLabAnimationCycleProgress(noneAnim, 12.5, 1.0, false, 0.5), 0);

    const activeProgress = computeLabAnimationCycleProgress(walkAnim, walkAnim.loopDurationSec * 0.5, 1.0, false, 0);
    assert.ok(Math.abs(activeProgress - 0.5) < 1e-6);

    const pausedProgress = computeLabAnimationCycleProgress(walkAnim, 99.0, 2.0, true, 0.72);
    assert.ok(Math.abs(pausedProgress - 0.72) < 1e-6);
  });

  it('tracks independent right-hand and left-hand weapon overrides and entity-specific labels', () => {
    assert.equal(countActivePoseOverrides(DEFAULT_LAB_POSE_OVERRIDES), 0);

    const tweakedRightOnly = {
      ...DEFAULT_LAB_POSE_OVERRIDES,
      weaponRotXDeg: 45,
      weaponRotYDeg: 90,
      amplitudeMultiplier: 1.25,
    };
    assert.equal(countActivePoseOverrides(tweakedRightOnly), 3);

    const tweakedLeftAndVis = {
      ...DEFAULT_LAB_POSE_OVERRIDES,
      leftWeaponRotZDeg: -45,
      leftWeaponScale: 1.2,
      equipmentVisibilityMode: 'right_only' as const,
    };
    assert.equal(countActivePoseOverrides(tweakedLeftAndVis), 3);

    const rangerLabels = getEntityEditorLabels('ranger_third_person');
    assert.ok(rangerLabels.weaponGroupTitle.toLowerCase().includes('sword'), 'Right hand label should mention sword');
    assert.ok(rangerLabels.leftWeaponGroupTitle.toLowerCase().includes('bow'), 'Left hand label should mention bow');

    const eagleLabels = getEntityEditorLabels('mountain_eagle');
    assert.ok(eagleLabels.rightLimbTitle.toLowerCase().includes('wing'));
  });

  it('wires Deer_Complete.ts with all procedural IK animations into forest_deer and createReadyDeer', async () => {
    const { DEER_STATES, createReadyDeer } = await import('../world/models/Deer');
    const { buildLabEntityRig } = await import('./labModelFactory');

    const deerEntity = getLabEntityById('forest_deer');
    const animIds = deerEntity.animations.map((a) => a.id);
    assert.deepEqual(animIds, ['none', ...DEER_STATES]);

    const deer = createReadyDeer();
    assert.equal(deer.rig.skeleton.bones.length, 31, 'DeerRig must have 31 bones');
    assert.ok(deer.mesh.geometry.getAttribute('skinIndex'), 'Geometry must be skinned');

    for (const state of DEER_STATES) {
      deer.setState(state);
      deer.update(0.15);
      assert.equal(deer.state, state);
    }

    // Verify calling setState('death') repeatedly every frame does NOT freeze or reset stateTime!
    deer.animator.restartState('death');
    for (let frame = 0; frame < 30; frame++) {
      deer.setState('death');
      deer.update(0.05);
    }
    assert.ok(
      Math.abs(deer.rig.root.rotation.z) > 0.5,
      'Deer root bone must rotate onto its side during death animation instead of freezing at 0'
    );

    const labRig = buildLabEntityRig('forest_deer', deerEntity.skins[0]);
    assert.ok(labRig.stats.triangleCount > 15000, 'Deer_Complete should have full ~16k triangle mesh');
    let t = 0;
    for (const animId of animIds) {
      t += 0.1;
      labRig.applyAnimation(animId, t, 0.25);
    }
    labRig.dispose();
    deer.dispose();
  });

  it('wires Bear_Complete.ts (including stomp), Crocodile_Complete.ts, Jaguar_Complete.ts, and Wolf_Complete.ts', async () => {
    const { BEAR_STATES, createReadyBear } = await import('../world/models/Bear');
    const { CROCODILE_STATES, createReadyCrocodile } = await import('../world/models/Crocodile');
    const { JAGUAR_STATES, createReadyJaguar } = await import('../world/models/Jaguar');
    const { WOLF_STATES, createReadyWolf } = await import('../world/models/Wolf');
    const { RHINO_STATES, createReadyRhino } = await import('../world/models/Rhino');
    const { buildLabEntityRig } = await import('./labModelFactory');

    const bearEntity = getLabEntityById('forest_bear');
    assert.deepEqual(
      bearEntity.animations.map((a) => a.id),
      ['none', ...BEAR_STATES]
    );
    const bear = createReadyBear();
    assert.equal(bear.rig.bones.length, 37, 'BearRig must have 37 bones');
    for (const st of BEAR_STATES) {
      bear.setState(st);
      bear.update(0.1);
      assert.equal(bear.state, st);
    }
    const bearLabRig = buildLabEntityRig('forest_bear', bearEntity.skins[0]);
    assert.ok(bearLabRig.stats.triangleCount > 7000, 'Bear mesh should have >7k triangles');
    bearLabRig.applyAnimation('roar', 0.2, 0.1);
    bearLabRig.applyAnimation('stomp', 0.35, 0.2);
    bearLabRig.applyAnimation('death', 0.5, 0.2);
    bearLabRig.dispose();
    bear.dispose();

    const crocEntity = getLabEntityById('river_crocodile');
    assert.deepEqual(
      crocEntity.animations.map((a) => a.id),
      ['none', ...CROCODILE_STATES]
    );
    const croc = createReadyCrocodile();
    assert.equal(croc.rig.bones.length, 49, 'CrocodileRig must have 49 bones');
    for (const st of CROCODILE_STATES) {
      croc.setState(st);
      croc.update(0.1);
      assert.equal(croc.state, st);
    }
    const crocLabRig = buildLabEntityRig('river_crocodile', crocEntity.skins[0]);
    assert.ok(crocLabRig.stats.triangleCount > 20000, 'Crocodile mesh should have ~21k triangles');
    crocLabRig.applyAnimation('attack', 0.3, 0.15);
    crocLabRig.applyAnimation('death', 0.6, 0.25);
    crocLabRig.dispose();
    croc.dispose();

    // Verify Jaguar_Complete.ts: 'sit' is upright seated observation (stationary), 'stalk' is stealth prowl,
    // and calling setState('attack') or setState('death') every frame advances animation time without freezing!
    const jaguar = createReadyJaguar();
    assert.equal(jaguar.rig.bones.length, 42, 'JaguarRig must have 42 bones');
    jaguar.restartState('sit');
    jaguar.update(0.1);
    const sitHeadWorldPos = jaguar.rig.bones[10].getWorldPosition(jaguar.rig.bones[0].position.clone());
    const sitHeadY = sitHeadWorldPos.y;
    assert.equal(jaguar.moveSpeed, 0.0, 'Jaguar sit state must be stationary');

    jaguar.restartState('stalk');
    jaguar.update(0.1);
    const stalkHeadWorldPos = jaguar.rig.bones[10].getWorldPosition(jaguar.rig.bones[0].position.clone());
    const stalkHeadY = stalkHeadWorldPos.y;
    assert.ok(jaguar.moveSpeed > 0.5, 'Jaguar stalk state must advance stealthily');
    assert.ok(
      sitHeadY > stalkHeadY + 0.05,
      `Jaguar upright sit head elevation (${sitHeadY.toFixed(2)}) must be higher than low stealth stalk (${stalkHeadY.toFixed(2)})`
    );

    jaguar.animator.restartState('attack');
    const startAttackZ = jaguar.rig.bones[2].position.z;
    for (let f = 0; f < 10; f++) {
      jaguar.setState('attack');
      jaguar.update(0.05);
    }
    assert.ok(
      jaguar.rig.bones[2].position.z > startAttackZ + 0.05,
      'Jaguar attack must advance time and lunge forward when setState("attack") is called every frame'
    );

    jaguar.animator.restartState('death');
    for (let f = 0; f < 35; f++) {
      jaguar.setState('death');
      jaguar.update(0.05);
    }
    assert.ok(
      jaguar.rig.bones[2].position.y < 0.35,
      'Jaguar death must advance time and collapse to the ground when setState("death") is called every frame'
    );
    for (const st of JAGUAR_STATES) {
      jaguar.setState(st);
      jaguar.update(0.05);
    }
    jaguar.dispose();

    // Verify Wolf_Complete.ts (59-joint GLB) and forest_wolf Lab rig
    const wolfEntity = getLabEntityById('forest_wolf');
    const wolf = createReadyWolf();
    assert.equal(wolf.rig.bones.length, 59, 'WolfRig must have 59 bones');
    for (const st of WOLF_STATES) {
      wolf.setState(st);
      wolf.update(0.1);
      assert.equal(wolf.state, st);
    }
    wolf.animator.restartState('idle');
    const idleWolfHeadY = wolf.rig.bones[9].getWorldPosition(wolf.rig.bones[0].position.clone()).y;
    wolf.animator.restartState('death');
    for (let f = 0; f < 25; f++) {
      wolf.setState('death');
      wolf.update(0.05);
    }
    const deathWolfHeadY = wolf.rig.bones[9].getWorldPosition(wolf.rig.bones[0].position.clone()).y;
    assert.ok(
      wolf.animator.time > 1.0 && deathWolfHeadY < idleWolfHeadY,
      `Wolf death animation must advance time and collapse to the ground (headY ${deathWolfHeadY.toFixed(3)} < ${idleWolfHeadY.toFixed(3)})`
    );
    const wolfLabRig = buildLabEntityRig('forest_wolf', wolfEntity.skins[0]);
    assert.ok(wolfLabRig.stats.triangleCount > 5000, 'Wolf GLB mesh should have >5k triangles');
    wolfLabRig.applyAnimation('howl', 0.2, 0.2);
    wolfLabRig.applyAnimation('attack', 0.4, 0.4);
    wolfLabRig.applyAnimation('death', 0.6, 0.5);
    wolfLabRig.dispose();
    wolf.dispose();

    // Verify Rhino_Complete.ts (43-joint GLB) and savanna_rhino Lab rig
    const rhinoEntity = getLabEntityById('savanna_rhino');
    const rhino = createReadyRhino();
    assert.equal(rhino.rig.bones.length, 43, 'RhinoRig must have 43 bones');
    for (const st of RHINO_STATES) {
      rhino.setState(st);
      rhino.update(0.1);
      assert.equal(rhino.state, st);
    }
    rhino.restartState('idle');
    const idleRhinoQuats = rhino.rig.bones.map((b) => b.quaternion.clone());
    const idleRhinoRootPos = rhino.rig.bones[4].position.clone();
    rhino.animator.restartState('death');
    for (let f = 0; f < 25; f++) {
      rhino.setState('death');
      rhino.update(0.05);
    }
    const maxQuatDelta = rhino.rig.bones.reduce(
      (max, b, idx) => Math.max(max, 1 - Math.abs(b.quaternion.dot(idleRhinoQuats[idx]))),
      0
    );
    const rootPosDelta = rhino.rig.bones[4].position.distanceTo(idleRhinoRootPos);
    assert.ok(
      rhino.animator.time > 1.0 && (maxQuatDelta > 0.0005 || rootPosDelta > 0.001),
      'Rhino death animation must advance time and collapse onto its side'
    );
    const rhinoLabRig = buildLabEntityRig('savanna_rhino', rhinoEntity.skins[0]);
    assert.ok(rhinoLabRig.stats.triangleCount > 4500, 'Rhino GLB mesh should have >4.5k triangles');
    rhinoLabRig.applyAnimation('roar', 0.2, 0.2);
    rhinoLabRig.applyAnimation('attack', 0.4, 0.4);
    rhinoLabRig.applyAnimation('death', 0.6, 0.5);
    rhinoLabRig.dispose();
    rhino.dispose();

    // Verify CatLion, Stag, ForestDragon, DemonDragon, Horse, Dove, Hippo, KoiFish, and Dolphin Lab rigs
    for (const entityId of [
      'savanna_lion',
      'royal_stag',
      'forest_dragon',
      'demon_dragon',
      'rideable_horse',
      'flock_bird',
      'oasis_hippo',
      'koi_fish',
      'ocean_dolphin',
    ]) {
      const entity = getLabEntityById(entityId);
      const rig = buildLabEntityRig(entityId, entity.skins[0]);
      assert.ok(rig.stats.triangleCount > 350, `${entityId} should have a valid 3D mesh`);
      rig.applyAnimation('walk', 0.2, 0.2);
      rig.applyAnimation('death', 0.5, 0.5);
      rig.dispose();
    }

    // Verify updated Saddle_Complete.ts and WesternSaddle_Complete.ts models
    const { createReadySaddle } = await import('../world/models/equipment/Saddle_Complete');
    const { createReadyWesternSaddle } = await import('../world/models/equipment/WesternSaddle_Complete');
    const saddle = createReadySaddle({ scale: 1.0 });
    const westernSaddle = createReadyWesternSaddle({ scale: 1.0 });
    assert.ok(saddle.mesh.geometry.attributes.position.count > 100, 'English Saddle mesh must have vertices');
    assert.ok(westernSaddle.mesh.geometry.attributes.position.count > 100, 'Western Saddle mesh must have vertices');
    saddle.dispose();
    westernSaddle.dispose();

    // Verify persistent per-animation and entity-wide speed resolution
    const customSpeedOverrides = {
      ...DEFAULT_LAB_POSE_OVERRIDES,
      animationSpeedMultiplier: 1.5,
      perAnimationSpeeds: { walk: 0.75, death: 1.25 },
    };
    assert.equal(getEffectiveLabAnimationSpeed(customSpeedOverrides, 'walk', 1.0), 0.75);
    assert.equal(getEffectiveLabAnimationSpeed(customSpeedOverrides, 'death', 1.25), 1.25);
    assert.equal(getEffectiveLabAnimationSpeed(customSpeedOverrides, 'run', 1.0), 1.5);
    assert.ok(countActivePoseOverrides(customSpeedOverrides) >= 3);
  });

  it('wires WarriorMonk_Complete (with death), DwarfWarrior_Complete (with mine1/mine2 & attack1..3), and Hippo sleep tail-loop', async () => {
    const { createReadyWarriorMonk, MONK_CLIP_NAMES } = await import(
      '../world/models/Characters/WarriorMonk_Complete'
    );
    const { createReadyDwarfWarrior, DWARF_CLIP_NAMES } = await import(
      '../world/models/Characters/DwarfWarrior_Complete'
    );
    const { createReadyHippo } = await import('../world/models/Hippo');
    const { buildLabEntityRig } = await import('./labModelFactory');

    // 1. WarriorMonk_Complete: all 11 built-in clips including 'death'
    const monk = createReadyWarriorMonk({ driveRootMotion: false });
    assert.equal(monk.bones.length, 26, 'WarriorMonk must have 26 joints');
    for (const clip of MONK_CLIP_NAMES) {
      monk.setState(clip, 0);
      monk.update(0.1);
      assert.equal(monk.state, clip);
    }
    const monkEntity = getLabEntityById('shaolin_monk');
    const monkLabRig = buildLabEntityRig('shaolin_monk', monkEntity.skins[0]);
    assert.ok(monkLabRig.stats.triangleCount > 25000, 'WarriorMonk mesh should have >25k triangles');
    monkLabRig.applyAnimation('staff_spin', 0.2, 0.35);
    monkLabRig.applyAnimation('death', 0.5, 0.75);
    monkLabRig.dispose();

    // 2. DwarfWarrior_Complete: all 11 built-in clips including 'mine1', 'mine2', 'attack1..3', 'death'
    const dwarf = createReadyDwarfWarrior({ driveRootMotion: false });
    assert.equal(dwarf.bones.length, 22, 'DwarfWarrior must have 22 joints');
    for (const clip of DWARF_CLIP_NAMES) {
      dwarf.setState(clip, 0);
      dwarf.update(0.1);
      assert.equal(dwarf.state, clip);
    }
    const dwarfEntity = getLabEntityById('dwarven_miner');
    const dwarfLabRig = buildLabEntityRig('dwarven_miner', dwarfEntity.skins[0]);
    assert.ok(dwarfLabRig.stats.triangleCount > 10000, 'DwarfWarrior mesh should have >10k triangles');
    dwarfLabRig.applyAnimation('mine1', 0.2, 0.4);
    dwarfLabRig.applyAnimation('mine2', 0.4, 0.6);
    dwarfLabRig.applyAnimation('attack1', 0.6, 0.5);
    dwarfLabRig.applyAnimation('death', 0.8, 0.8);
    dwarfLabRig.dispose();

    // 3. Hippo_Complete 'lie' (sleep) animation: first cycle transitions standing -> lying down,
    //    and repeat cycles stay near the lying-down end of the clip without standing back up at frame 0!
    const hippo = createReadyHippo();
    hippo.restartState('idle');
    hippo.update(0.05);
    const standingQuats = hippo.rig.bones.map((b) => b.quaternion.clone());

    hippo.restartState('lie');
    // Advance to the end of the first 'lie' cycle (duration = 1.8s)
    for (let i = 0; i < 18; i++) {
      hippo.setState('lie');
      hippo.update(0.1);
    }
    const lyingEndQuats = hippo.rig.bones.map((b) => b.quaternion.clone());

    // Advance into the repeat cycle (t = 1.95s, which previously wrapped to t = 0.15s standing!)
    hippo.setState('lie');
    hippo.update(0.15);
    const repeatCycleQuats = hippo.rig.bones.map((b) => b.quaternion.clone());

    const quatDist = (a: typeof standingQuats, b: typeof standingQuats) =>
      a.reduce((sum, q, idx) => sum + (1 - Math.abs(q.dot(b[idx]))), 0);

    const distStandingToLying = quatDist(standingQuats, lyingEndQuats);
    const distRepeatToLying = quatDist(repeatCycleQuats, lyingEndQuats);

    assert.ok(
      distStandingToLying > 0.05 && distRepeatToLying < distStandingToLying * 0.25,
      `Hippo sleep ('lie') repeat cycle must stay near lying pose (distRepeatToLying=${distRepeatToLying.toFixed(4)} vs distStandingToLying=${distStandingToLying.toFixed(4)})`
    );
    hippo.dispose();
  });
});
// #endregion
