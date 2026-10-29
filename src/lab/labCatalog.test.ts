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
    assert.equal(animals.length, 11, 'Should include all 11 animals (with Koi Fish, Butterfly, and Seagull separated)');

    // Verify Koi Fish and Meadow Butterfly are strictly separated
    assert.ok(animals.some((a) => a.id === 'koi_fish'), 'Koi fish must be its own standalone animal entry');
    assert.ok(animals.some((a) => a.id === 'meadow_butterfly'), 'Meadow butterfly must be its own standalone animal entry');
    assert.ok(animals.some((a) => a.id === 'harbor_seagull'), 'Harbor seagull must be its own standalone animal entry');
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
    assert.equal(onlyAnimals.length, 11);
    assert.ok(onlyAnimals.every((e) => e.category === 'animals'));

    const allCombined = filterLabEntities(LAB_ENTITIES, 'all', '');
    assert.equal(allCombined.length, 19, 'Dropdown "all" option must return all 19 entities');

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
});

