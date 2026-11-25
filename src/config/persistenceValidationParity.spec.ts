// ============================================================================
// MODULE: Config / Persistence Validation Parity Tests
// DESIGN: Contract test between two intentionally separate copies of the same rules
// SUMMARY: The game validates persisted settings with persistedSettingsValidation.ts; the
//          isolated dev server validates the same payloads with
//          devServer/persistenceValidation.ts. Both must accept, reject and clean every
//          fixture identically, so the duplicated rules cannot drift apart unnoticed.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGameSettings, validateHitboxOverrides, validateLabOverrides } from './persistedSettingsValidation';
import {
  checkGameSettingsPayload,
  checkHitboxOverridesPayload,
  checkLabOverridesPayload,
  isSameOriginRequest,
} from '../../devServer/persistenceValidation.ts';
import { SAVED_GAME_SETTINGS } from './savedGameSettings';
import { SAVED_HITBOX_OVERRIDES } from './savedHitboxOverrides';
import { SAVED_LAB_OVERRIDES } from './savedLabOverrides';
import { DEFAULT_LAB_POSE_OVERRIDES } from '../lab/labCatalog';
// #endregion

// ======================== FIXTURES ======================== \\
// #region Fixtures
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withSettings(change: (settings: Record<string, unknown>) => void): unknown {
  const settings = clone(SAVED_GAME_SETTINGS) as unknown as Record<string, unknown>;
  change(settings);
  return settings;
}

/** A complete pose; the saved overrides file may be empty. */
const SAMPLE_POSE = DEFAULT_LAB_POSE_OVERRIDES;

function withPose(change: (pose: Record<string, unknown>) => void): unknown {
  const pose = clone(SAMPLE_POSE) as unknown as Record<string, unknown>;
  change(pose);
  return { ranger_third_person: pose };
}

const GAME_SETTINGS_CASES: ReadonlyArray<[string, unknown]> = [
  ['saved defaults', SAVED_GAME_SETTINGS],
  ['unknown field is dropped', withSettings((s) => (s.isAdmin = true))],
  ['key code with a space', withSettings((s) => ((s.keybindings as Record<string, string>).jump = 'Key W'))],
  ['missing binding', withSettings((s) => delete (s.keybindings as Record<string, string>).pauseGame)],
  ['graphics quality unknown', withSettings((s) => (s.graphicsQuality = 'ultra'))],
  ['graphics quality missing', withSettings((s) => delete s.graphicsQuality)],
  ['sensitivity above range', withSettings((s) => (s.mouseSensitivity = 2.6))],
  ['sensitivity at range edge', withSettings((s) => (s.mouseSensitivity = 2.5))],
  ['walk speed below range', withSettings((s) => (s.walkSpeedMultiplier = 0.5))],
  ['unknown perspective', withSettings((s) => (s.defaultCameraPerspective = 'top_down'))],
  ['muted as string', withSettings((s) => (s.defaultMuted = 'yes'))],
  ['not an object', [1, 2, 3]],
  ['null', null],
];

const LAB_CASES: ReadonlyArray<[string, unknown]> = [
  ['saved overrides', SAVED_LAB_OVERRIDES],
  ['default pose', { ranger_third_person: DEFAULT_LAB_POSE_OVERRIDES }],
  ['empty map', {}],
  ['unknown field is dropped', withPose((p) => (p.script = 'alert(1)'))],
  ['rotation at limit', withPose((p) => (p.headRotYDeg = 720))],
  ['rotation past limit', withPose((p) => (p.headRotYDeg = 721))],
  ['bad visibility mode', withPose((p) => (p.equipmentVisibilityMode = 'sometimes'))],
  ['speed multiplier present', withPose((p) => (p.animationSpeedMultiplier = 1.5))],
  ['per-animation speeds valid', withPose((p) => (p.perAnimationSpeeds = { walk: 1.2 }))],
  ['per-animation speed out of range', withPose((p) => (p.perAnimationSpeeds = { walk: 11 }))],
  ['per-animation bad id', withPose((p) => (p.perAnimationSpeeds = { 'Walk!': 1 }))],
  ['bad entity id', { '../etc': SAMPLE_POSE }],
  ['too many entities', Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`entity_${i}`, SAMPLE_POSE]))],
];

const HITBOX_CASES: ReadonlyArray<[string, unknown]> = [
  ['saved hitbox overrides', SAVED_HITBOX_OVERRIDES],
  ['empty payload', {}],
  [
    'valid full payload with unknown field dropped',
    {
      boxes: { 'ship-hull-lower': { minX: -3, maxX: 3, minZ: -6, maxZ: 11, minY: -3.9, maxY: 0, extra: 9 } },
      obstacles: { pinetree: { radiusScale: 1.2, heightScale: 0.9 } },
      entities: { forest_wolf: { radius: 1.5, height: 1.8, bodyRadius: 0.85 } },
    },
  ],
  ['inverted minX/maxX box', { boxes: { 'bad-box': { minX: 2, maxX: 1, minZ: -1, maxZ: 1 } } }],
  ['bad box id', { boxes: { '../bad': { minX: -1, maxX: 1, minZ: -1, maxZ: 1 } } }],
  ['obstacle scale out of range', { obstacles: { pinetree: { radiusScale: 9.0, heightScale: 1.0 } } }],
  ['entity radius negative', { entities: { forest_wolf: { radius: -1, height: 1.8 } } }],
  ['not an object', 'bad'],
];
// #endregion

// ======================== PARITY TESTS ======================== \\
// #region Parity Tests
test('gameSettingsValidators_WhenGivenSameFixtures_ShouldAgree', () => {
  for (const [name, payload] of GAME_SETTINGS_CASES) {
    // Arrange & Act
    const game = validateGameSettings(payload);
    const server = checkGameSettingsPayload(payload);

    // Assert
    assert.equal(server.ok, game.isSuccess, `accept/reject differs for: ${name}`);
    if (server.ok && game.isSuccess) {
      assert.deepEqual(clone(server.value), clone(game.value), `cleaned value differs for: ${name}`);
    }
  }
});

test('labOverrideValidators_WhenGivenSameFixtures_ShouldAgree', () => {
  for (const [name, payload] of LAB_CASES) {
    // Arrange & Act
    const game = validateLabOverrides(payload);
    const server = checkLabOverridesPayload(payload);

    // Assert
    assert.equal(server.ok, game.isSuccess, `accept/reject differs for: ${name}`);
    if (server.ok && game.isSuccess) {
      assert.deepEqual(clone(server.value), clone(game.value), `cleaned value differs for: ${name}`);
    }
  }
});

test('hitboxOverrideValidators_WhenGivenSameFixtures_ShouldAgree', () => {
  for (const [name, payload] of HITBOX_CASES) {
    // Arrange & Act
    const game = validateHitboxOverrides(payload);
    const server = checkHitboxOverridesPayload(payload);

    // Assert
    assert.equal(server.ok, game.isSuccess, `accept/reject differs for: ${name}`);
    if (server.ok && game.isSuccess) {
      assert.deepEqual(clone(server.value), clone(game.value), `cleaned value differs for: ${name}`);
    }
  }
});

test('validators_WhenGivenSavedDefaults_ShouldAccept', () => {
  // Arrange, Act & Assert
  assert.equal(checkGameSettingsPayload(SAVED_GAME_SETTINGS).ok, true);
  assert.equal(checkLabOverridesPayload(SAVED_LAB_OVERRIDES).ok, true);
  assert.equal(checkHitboxOverridesPayload(SAVED_HITBOX_OVERRIDES).ok, true);
});
// #endregion

// #region Same-Origin Check
test('isSameOriginRequest_WhenOriginIsHttpOrHttpsOfTheSameHost_ShouldBeTrue', () => {
  // Arrange & Act & Assert
  assert.equal(isSameOriginRequest('http://localhost:3000', 'localhost:3000'), true);
  assert.equal(isSameOriginRequest('https://preview.example.com', 'preview.example.com'), true);
  assert.equal(isSameOriginRequest(undefined, 'localhost:3000'), true);
});

test('isSameOriginRequest_WhenOriginIsAnotherHostOrScheme_ShouldBeFalse', () => {
  // Arrange & Act & Assert
  assert.equal(isSameOriginRequest('https://evil.example.com', 'localhost:3000'), false);
  assert.equal(isSameOriginRequest('http://localhost:3001', 'localhost:3000'), false);
  assert.equal(isSameOriginRequest('ftp://localhost:3000', 'localhost:3000'), false);
  assert.equal(isSameOriginRequest('https://localhost:3000', undefined), false);
});
// #endregion
