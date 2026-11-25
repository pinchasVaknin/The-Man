// ============================================================================
// MODULE: World / Domain / Global Hitbox Overrides Tests
// DESIGN: Pure Unit Tests for Live Hitbox Overrides, Global Consumers & Resets
// SUMMARY: Verifies that Lab hitbox edits propagate immediately to solid world
//          boxes, sailable ship boxes, terrain obstacle metrics, and wildlife/
//          entity hitboxes, while preserving object identity on unmodified boxes
//          and restoring immutable defaults via part, object, or global resets.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVED_HITBOX_OVERRIDES } from '../../config/savedHitboxOverrides';
import {
  DEFAULT_ENTITY_HITBOXES,
  DEFAULT_OBSTACLE_DIMENSIONS,
  applyBoxHitboxOverride,
  getActiveHitboxOverrides,
  getEffectiveEntityHitbox,
  resetAllHitboxOverrides,
  setActiveHitboxOverrides,
  subscribeHitboxOverridesChanged,
} from './hitboxOverrides';
import { SOLID_BUILDING_BOXES, getObstacleColliderMetrics } from './landmarks/collisionAndTerraces';
import { getNearbySolidBuildingBoxes } from './collisionWorld';
import {
  DEFAULT_SAILABLE_SHIP_LOCAL_BOXES,
  getActiveSailableShip,
  getSailableShipLocalCollisionBoxes,
  resetSailableShipState,
} from '../systems/sailableShipSystem';
import {
  LAB_HITBOX_TARGETS,
  countActiveHitboxOverrides,
  getDefaultBoxesForTarget,
  getEffectiveBoxesForTarget,
  getEffectiveEntityForTarget,
  getEffectiveObstacleForTarget,
  isHitboxTargetCustomized,
  resetPartOverrideInPayload,
  resetTargetOverridesInPayload,
  updateBoxOverrideInPayload,
  updateEntityOverrideInPayload,
  updateObstacleOverrideInPayload,
} from '../../lab/labHitboxCatalog';

test('savedHitboxOverrides_ByDefault_ShouldBeCleanEmptyObject', () => {
  assert.deepEqual(SAVED_HITBOX_OVERRIDES, {});
});

test('hitboxOverrides_WhenAppliedAndReset_ShouldPropagateGloballyAndPreserveUnmodifiedIdentity', () => {
  resetAllHitboxOverrides(false);

  // 1) Baseline ship & world box references preserve identity when unmodified
  const sampleWorldBox = SOLID_BUILDING_BOXES.find((b) => b.id === 'hunter-lodge-back-wall');
  assert.ok(sampleWorldBox, 'Expected hunter-lodge-back-wall in SOLID_BUILDING_BOXES');
  assert.equal(applyBoxHitboxOverride(sampleWorldBox), sampleWorldBox);

  const nearbyDefault = getNearbySolidBuildingBoxes(
    (sampleWorldBox.minX + sampleWorldBox.maxX) * 0.5,
    (sampleWorldBox.minZ + sampleWorldBox.maxZ) * 0.5,
    6.0
  );
  const matchingDefault = nearbyDefault.find((b) => b.id === 'hunter-lodge-back-wall');
  assert.equal(matchingDefault, sampleWorldBox, 'Unmodified world box must preserve exact reference');

  // 2) Apply box, ship-box, obstacle, and entity overrides globally
  let listenerFired = 0;
  const unsubscribe = subscribeHitboxOverridesChanged(() => {
    listenerFired++;
  });

  const payloadWithOverrides = setActiveHitboxOverrides(
    {
      boxes: {
        'hunter-lodge-back-wall': {
          minX: sampleWorldBox.minX - 0.5,
          maxX: sampleWorldBox.maxX + 0.5,
          minZ: sampleWorldBox.minZ,
          maxZ: sampleWorldBox.maxZ,
          minY: sampleWorldBox.minY,
          maxY: (sampleWorldBox.maxY ?? 5.0) + 1.0,
        },
        'ship-rail-stbd-aft': {
          minX: 2.75,
          maxX: 3.75,
          minZ: 3.4,
          maxZ: 6.2,
          minY: -0.2,
          maxY: 2.5,
        },
      },
      obstacles: {
        pinetree: { radiusScale: 1.5, heightScale: 0.8 },
      },
      entities: {
        forest_wolf: { radius: 2.1, height: 2.3, bodyRadius: 1.15 },
      },
    },
    false
  );

  assert.equal(listenerFired, 1);
  assert.equal(countActiveHitboxOverrides(payloadWithOverrides), 4);

  // World collision query reflects the overridden hunter cabin box while siblings keep original bounds
  const nearbyOverridden = getNearbySolidBuildingBoxes(
    (sampleWorldBox.minX + sampleWorldBox.maxX) * 0.5,
    (sampleWorldBox.minZ + sampleWorldBox.maxZ) * 0.5,
    6.0
  );
  const modifiedWorldBox = nearbyOverridden.find((b) => b.id === 'hunter-lodge-back-wall');
  assert.ok(modifiedWorldBox);
  assert.notEqual(modifiedWorldBox, sampleWorldBox);
  assert.equal(modifiedWorldBox.minX, sampleWorldBox.minX - 0.5);
  assert.equal(modifiedWorldBox.maxX, sampleWorldBox.maxX + 0.5);

  // Sailable ship collision boxes apply override before scaling
  resetSailableShipState();
  const ship = getActiveSailableShip();
  const shipBoxes = getSailableShipLocalCollisionBoxes(ship);
  const stbdAft = shipBoxes.find((b) => b.id === 'ship-rail-stbd-aft');
  assert.ok(stbdAft);
  assert.ok(Math.abs(stbdAft.minX - 2.75 * ship.scale) < 1e-6);
  assert.ok(Math.abs(stbdAft.maxY - (ship.deckY + 2.5)) < 1e-6);

  // Obstacle metrics scale cleanly by override multipliers
  const pineMetrics = getObstacleColliderMetrics({
    x: 0,
    z: 0,
    radius: DEFAULT_OBSTACLE_DIMENSIONS.pinetree.radius * 2.0,
    kind: 'pine',
    treeVariant: 'pinetree',
    scale: 2.0,
    seed: 0,
  });
  assert.ok(Math.abs(pineMetrics.radius - DEFAULT_OBSTACLE_DIMENSIONS.pinetree.radius * 2.0 * 1.5) < 1e-6);
  assert.ok(Math.abs(pineMetrics.height - DEFAULT_OBSTACLE_DIMENSIONS.pinetree.height * 2.0 * 0.8) < 1e-6);

  // Entity hitbox resolves by wildlife species alias or canonical entity ID
  const wolfBySpecies = getEffectiveEntityHitbox('wolf');
  assert.equal(wolfBySpecies.radius, 2.1);
  assert.equal(wolfBySpecies.height, 2.3);
  assert.equal(wolfBySpecies.bodyRadius, 1.15);

  // 3) Global reset restores every single default
  resetAllHitboxOverrides(false);
  unsubscribe();
  assert.deepEqual(getActiveHitboxOverrides(), {});
  assert.equal(applyBoxHitboxOverride(sampleWorldBox), sampleWorldBox);
  const wolfDefault = getEffectiveEntityHitbox('wolf');
  assert.deepEqual(wolfDefault, DEFAULT_ENTITY_HITBOXES.forest_wolf);

  const shipDefaultBoxes = getSailableShipLocalCollisionBoxes(ship);
  const shipDefaultStbdAft = shipDefaultBoxes.find((b) => b.id === 'ship-rail-stbd-aft');
  const rawDefaultStbdAft = DEFAULT_SAILABLE_SHIP_LOCAL_BOXES.find((b) => b.id === 'ship-rail-stbd-aft');
  assert.ok(shipDefaultStbdAft && rawDefaultStbdAft);
  assert.ok(Math.abs(shipDefaultStbdAft.minX - rawDefaultStbdAft.minX * ship.scale) < 1e-6);
  resetSailableShipState();
});

test('labHitboxCatalog_PartObjectAndCategoryHelpers_ShouldSupportEditingAndResettingDefaults', () => {
  const shipTarget = LAB_HITBOX_TARGETS.find((t) => t.id === 'sailable_ship');
  const pineTarget = LAB_HITBOX_TARGETS.find((t) => t.id === 'obstacle_pinetree');
  const wolfTarget = LAB_HITBOX_TARGETS.find((t) => t.id === 'entity_forest_wolf');
  assert.ok(shipTarget && pineTarget && wolfTarget);

  const defaultShipBoxes = getDefaultBoxesForTarget(shipTarget);
  assert.equal(defaultShipBoxes.length, DEFAULT_SAILABLE_SHIP_LOCAL_BOXES.length);

  let payload = updateBoxOverrideInPayload({}, 'ship-rail-port-fwd', {
    minX: -3.9,
    maxX: -2.7,
    minZ: -2.2,
    maxZ: 0.0,
    minY: -0.2,
    maxY: 1.5,
  });
  payload = updateBoxOverrideInPayload(payload, 'ship-rail-stbd-fwd', {
    minX: 2.7,
    maxX: 3.9,
    minZ: -2.2,
    maxZ: 0.0,
    minY: -0.2,
    maxY: 1.5,
  });
  payload = updateObstacleOverrideInPayload(payload, 'pinetree', { radiusScale: 1.25, heightScale: 1.1 });
  payload = updateEntityOverrideInPayload(payload, 'forest_wolf', { radius: 1.65, height: 1.9, bodyRadius: 0.9 });

  assert.equal(isHitboxTargetCustomized(shipTarget, payload), true);
  assert.equal(isHitboxTargetCustomized(pineTarget, payload), true);
  assert.equal(isHitboxTargetCustomized(wolfTarget, payload), true);

  const effBoxes = getEffectiveBoxesForTarget(shipTarget, payload);
  assert.equal(effBoxes.find((b) => b.id === 'ship-rail-port-fwd')?.minX, -3.9);

  const effPine = getEffectiveObstacleForTarget(pineTarget, payload);
  assert.equal(effPine.radiusScale, 1.25);

  const effWolf = getEffectiveEntityForTarget(wolfTarget, payload);
  assert.equal(effWolf.effective.radius, 1.65);

  // Reset single part keeps sibling ship part intact
  payload = resetPartOverrideInPayload(shipTarget, 'ship-rail-port-fwd', payload);
  assert.equal(payload.boxes?.['ship-rail-port-fwd'], undefined);
  assert.ok(payload.boxes?.['ship-rail-stbd-fwd']);
  assert.equal(isHitboxTargetCustomized(shipTarget, payload), true);

  // Reset entire target clears remaining ship overrides without touching obstacle or entity overrides
  payload = resetTargetOverridesInPayload(shipTarget, payload);
  assert.equal(isHitboxTargetCustomized(shipTarget, payload), false);
  assert.equal(isHitboxTargetCustomized(pineTarget, payload), true);
  assert.equal(isHitboxTargetCustomized(wolfTarget, payload), true);

  // Reset remaining targets prunes payload back to clean empty {}
  payload = resetTargetOverridesInPayload(pineTarget, payload);
  payload = resetTargetOverridesInPayload(wolfTarget, payload);
  assert.deepEqual(payload, {});
});
