// ============================================================================
// MODULE: Lab / Catalog & State Unit Tests
// DESIGN: Pure unit tests using node:test and node:assert/strict
// SUMMARY: Verifies that all world characters, humans, animals, and creatures
//          are cataloged with static 'none' default animations and valid skins.
// ============================================================================

import { describe, it } from 'node:test';
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
  getEntityEditorLabelsHe,
  getEffectiveLabAnimationSpeed,
  getLabEntityById,
  getLabAnimationForEntity,
  getLabSkinForEntity,
  computeLabAnimationCycleProgress,
} from './labCatalog';

describe('Character & Animation Lab Catalog (מעבדה)', () => {
  it('organizes all world entities into 2 distinct categories: characters (דמויות) and animals (חיות)', () => {
    assert.equal(LAB_CATEGORIES.length, 2);
    assert.deepEqual(
      LAB_CATEGORIES.map((c) => c.id),
      ['characters', 'animals']
    );

    const characters = LAB_ENTITIES.filter((e) => e.category === 'characters');
    const animals = LAB_ENTITIES.filter((e) => e.category === 'animals');

    assert.equal(characters.length, 8, 'Should include all 8 characters');
    assert.equal(animals.length, 13, 'Should include all 13 animals (including forest_bear and river_crocodile)');

    // Verify Koi Fish, Meadow Butterfly, Seagull, Bear, and Crocodile are standalone entries
    assert.ok(animals.some((a) => a.id === 'koi_fish'), 'Koi fish must be its own standalone animal entry');
    assert.ok(animals.some((a) => a.id === 'meadow_butterfly'), 'Meadow butterfly must be its own standalone animal entry');
    assert.ok(animals.some((a) => a.id === 'harbor_seagull'), 'Harbor seagull must be its own standalone animal entry');
    assert.ok(animals.some((a) => a.id === 'forest_bear'), 'Forest bear must be included in animals');
    assert.ok(animals.some((a) => a.id === 'river_crocodile'), 'River crocodile must be included in animals');
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

  it('filters entities accurately by category and Hebrew search query', () => {
    const onlyCharacters = filterLabEntities(LAB_ENTITIES, 'characters', '');
    assert.equal(onlyCharacters.length, 8);
    assert.ok(onlyCharacters.every((e) => e.category === 'characters'));

    const onlyAnimals = filterLabEntities(LAB_ENTITIES, 'animals', '');
    assert.equal(onlyAnimals.length, 13);
    assert.ok(onlyAnimals.every((e) => e.category === 'animals'));

    const allCombined = filterLabEntities(LAB_ENTITIES, 'all', '');
    assert.equal(allCombined.length, 21, 'Dropdown "all" option must return all 21 entities');

    const koiSearch = filterLabEntities(LAB_ENTITIES, 'animals', 'קוי');
    assert.equal(koiSearch.length, 1);
    assert.equal(koiSearch[0].id, 'koi_fish');

    const butterflySearch = filterLabEntities(LAB_ENTITIES, 'animals', 'פרפר');
    assert.equal(butterflySearch.length, 1);
    assert.equal(butterflySearch[0].id, 'meadow_butterfly');
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

    const rangerLabels = getEntityEditorLabelsHe('ranger_third_person');
    assert.ok(rangerLabels.weaponGroupTitleHe.includes('חרב'), 'Right hand label should mention sword (חרב)');
    assert.ok(rangerLabels.leftWeaponGroupTitleHe.includes('קשת'), 'Left hand label should mention bow (קשת)');

    const eagleLabels = getEntityEditorLabelsHe('mountain_eagle');
    assert.ok(eagleLabels.rightLimbTitleHe.includes('כנף'));
  });

  it('wires Deer_Complete.ts with all 9 procedural IK animations into forest_deer and createReadyDeer', async () => {
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

  it('wires Bear_Complete.ts and Crocodile_Complete.ts with all 13 animations and supports persistent speed overrides', async () => {
    const { BEAR_STATES, createReadyBear } = await import('../world/models/Bear');
    const { CROCODILE_STATES, createReadyCrocodile } = await import('../world/models/Crocodile');
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

    // Verify persistent per-animation and entity-wide speed resolution
    const customSpeedOverrides = {
      ...DEFAULT_LAB_POSE_OVERRIDES,
      animationSpeedMultiplier: 1.5,
      perAnimationSpeeds: { walk: 0.75, death: 1.25 },
    };
    assert.equal(getEffectiveLabAnimationSpeed(customSpeedOverrides, 'walk', 1.0), 0.75);
    assert.equal(getEffectiveLabAnimationSpeed(customSpeedOverrides, 'death', 1.0), 1.25);
    assert.equal(getEffectiveLabAnimationSpeed(customSpeedOverrides, 'run', 1.0), 1.5);
    assert.ok(countActivePoseOverrides(customSpeedOverrides) >= 3);
  });
});


