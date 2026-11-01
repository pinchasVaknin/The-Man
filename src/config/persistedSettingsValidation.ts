// ============================================================================
// MODULE: Config / Persisted Settings Validation
// DESIGN: Allowlist validators returning Result (expected failures never throw)
// SUMMARY: Validates game settings and lab pose overrides that arrive from outside
//          the trust boundary (dev-server request bodies and localStorage) and maps
//          only the known fields into typed values. Does not read or write storage.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { Result } from '../core/Result';
import type { ILabPoseOverrides, LabEquipmentVisibilityMode } from '../lab/labCatalog';
import type { FirefliesMode, IGameKeybindings, IGameSettingsConfig } from './savedGameSettings';
import type { CameraPerspectiveMode } from '../world/domain/worldTypes';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
export type GameSettingsValidationError = 'INVALID_GAME_SETTINGS';
export type LabOverridesValidationError = 'INVALID_LAB_OVERRIDES';

const KEYBINDING_NAMES: readonly (keyof IGameKeybindings)[] = [
  'moveForward', 'moveBackward', 'moveLeft', 'moveRight', 'sprint', 'relaxedWalk', 'jump',
  'interactDoor', 'mountHorse', 'drawOrSlash', 'dash', 'cycleArrowElement', 'cameraPerspective',
  'inventoryModal', 'favoritesModal', 'marketModal', 'hotbarSlot1', 'hotbarSlot2', 'hotbarSlot3',
  'hotbarSlot4', 'cycleWeather', 'toggleMute', 'pauseGame', 'toggleFavorite',
];
/** KeyboardEvent.code values are short alphanumeric identifiers such as "KeyW" or "ShiftLeft". */
const KEY_CODE_PATTERN = /^[A-Za-z0-9]{1,32}$/;
const CAMERA_PERSPECTIVES: readonly CameraPerspectiveMode[] = ['third_person', 'first_person'];
const FIREFLIES_MODES: readonly FirefliesMode[] = ['sanctuary_only', 'off'];
/** Inclusive ranges, matching the sliders in the settings modal. */
const MOUSE_SENSITIVITY_RANGE = [0.4, 2.5] as const;
const WALK_SPEED_RANGE = [0.6, 1.8] as const;
const JUMP_FORCE_RANGE = [0.7, 1.6] as const;

const ENTITY_ID_PATTERN = /^[a-z0-9_]{1,64}$/;
/** Hard cap on persisted lab entries; the catalog has far fewer entities. */
const MAX_LAB_ENTITIES = 100;
const VISIBILITY_MODES: readonly LabEquipmentVisibilityMode[] = ['auto', 'both', 'right_only', 'left_only', 'none'];
/** Rotation buttons can stack past the +-180 deg sliders, so allow two full turns. */
const ROTATION_DEG_LIMIT = 720;
const LAB_NUMBER_RANGES: Readonly<Record<string, readonly [number, number]>> = {
  amplitudeMultiplier: [0, 5],
  weaponScale: [0.05, 5],
  leftWeaponScale: [0.05, 5],
  bodyOffsetY: [-5, 5],
};
const LAB_ROTATION_FIELDS: readonly (keyof ILabPoseOverrides)[] = [
  'weaponRotXDeg', 'weaponRotYDeg', 'weaponRotZDeg', 'leftWeaponRotXDeg', 'leftWeaponRotYDeg',
  'leftWeaponRotZDeg', 'rightLimbRotXDeg', 'rightLimbRotYDeg', 'rightLimbRotZDeg', 'leftLimbRotXDeg',
  'leftLimbRotYDeg', 'leftLimbRotZDeg', 'headRotXDeg', 'headRotYDeg', 'headRotZDeg', 'bodyRotXDeg',
  'bodyRotYDeg', 'bodyRotZDeg',
];
const ANIMATION_SPEED_RANGE = [0.05, 10] as const;
// #endregion

// ======================== PUBLIC VALIDATORS ======================== \\
// #region Validate Game Settings
/**
 * Summary: Validates an untrusted game settings value and returns only the known fields.
 * Design: Allowlist mapping: every field is type- and range-checked; unknown fields are dropped.
 * @param value Parsed JSON from a request body or localStorage.
 * @returns Result.ok with a clean IGameSettingsConfig, or Result.fail('INVALID_GAME_SETTINGS').
 */
export function validateGameSettings(
  value: unknown
): Result<IGameSettingsConfig, GameSettingsValidationError> {
  const fail = Result.fail<IGameSettingsConfig, GameSettingsValidationError>('INVALID_GAME_SETTINGS');
  if (!isPlainObject(value) || !isPlainObject(value.keybindings)) return fail;

  const keybindings = {} as Record<keyof IGameKeybindings, string>;
  for (const name of KEYBINDING_NAMES) {
    const code = value.keybindings[name];
    if (typeof code !== 'string' || !KEY_CODE_PATTERN.test(code)) return fail;
    keybindings[name] = code;
  }
  const perspective = value.defaultCameraPerspective;
  const fireflies = value.firefliesMode;
  if (!isOneOf(perspective, CAMERA_PERSPECTIVES) || !isOneOf(fireflies, FIREFLIES_MODES)) return fail;
  if (typeof value.defaultMuted !== 'boolean') return fail;
  if (
    !isNumberInRange(value.mouseSensitivity, MOUSE_SENSITIVITY_RANGE) ||
    !isNumberInRange(value.walkSpeedMultiplier, WALK_SPEED_RANGE) ||
    !isNumberInRange(value.jumpForceMultiplier, JUMP_FORCE_RANGE)
  ) {
    return fail;
  }

  return Result.ok({
    keybindings,
    defaultCameraPerspective: perspective,
    mouseSensitivity: value.mouseSensitivity,
    walkSpeedMultiplier: value.walkSpeedMultiplier,
    jumpForceMultiplier: value.jumpForceMultiplier,
    firefliesMode: fireflies,
    defaultMuted: value.defaultMuted,
  });
}
// #endregion

// #region Validate Lab Overrides
/**
 * Summary: Validates an untrusted map of lab pose overrides keyed by entity id.
 * Design: Allowlist mapping with numeric ranges per field; unknown fields are dropped and
 *         entity ids must be plain snake_case identifiers.
 * @param value Parsed JSON from a request body or localStorage.
 * @returns Result.ok with the clean map, or Result.fail('INVALID_LAB_OVERRIDES').
 */
export function validateLabOverrides(
  value: unknown
): Result<Record<string, ILabPoseOverrides>, LabOverridesValidationError> {
  const fail = Result.fail<Record<string, ILabPoseOverrides>, LabOverridesValidationError>('INVALID_LAB_OVERRIDES');
  if (!isPlainObject(value)) return fail;
  const entries = Object.entries(value);
  if (entries.length > MAX_LAB_ENTITIES) return fail;

  const clean: Record<string, ILabPoseOverrides> = {};
  for (const [entityId, rawOverrides] of entries) {
    if (!ENTITY_ID_PATTERN.test(entityId)) return fail;
    const overrides = toLabPoseOverrides(rawOverrides);
    if (!overrides) return fail;
    clean[entityId] = overrides;
  }
  return Result.ok(clean);
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Private Helpers
/** Summary: Maps one entity's raw overrides to a typed value, or null when any field is invalid. */
function toLabPoseOverrides(raw: unknown): ILabPoseOverrides | null {
  if (!isPlainObject(raw) || !isOneOf(raw.equipmentVisibilityMode, VISIBILITY_MODES)) return null;
  const numbers: Record<string, number> = {};
  for (const field of LAB_ROTATION_FIELDS) {
    if (!isNumberInRange(raw[field], [-ROTATION_DEG_LIMIT, ROTATION_DEG_LIMIT])) return null;
    numbers[field] = raw[field];
  }
  for (const [field, range] of Object.entries(LAB_NUMBER_RANGES)) {
    if (!isNumberInRange(raw[field], range)) return null;
    numbers[field] = raw[field];
  }
  const speed = raw.animationSpeedMultiplier;
  if (speed !== undefined && !isNumberInRange(speed, ANIMATION_SPEED_RANGE)) return null;
  const perAnimationSpeeds = toAnimationSpeeds(raw.perAnimationSpeeds);
  if (perAnimationSpeeds === null) return null;

  return {
    equipmentVisibilityMode: raw.equipmentVisibilityMode,
    ...(numbers as Omit<ILabPoseOverrides, 'equipmentVisibilityMode' | 'animationSpeedMultiplier' | 'perAnimationSpeeds'>),
    ...(speed !== undefined ? { animationSpeedMultiplier: speed } : {}),
    ...(perAnimationSpeeds !== undefined ? { perAnimationSpeeds } : {}),
  };
}

/** Summary: Validates the optional per-animation speed map; undefined stays undefined, invalid gives null. */
function toAnimationSpeeds(raw: unknown): Readonly<Record<string, number>> | undefined | null {
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) return null;
  const speeds: Record<string, number> = {};
  for (const [animationId, speed] of Object.entries(raw)) {
    if (!ENTITY_ID_PATTERN.test(animationId) || !isNumberInRange(speed, ANIMATION_SPEED_RANGE)) return null;
    speeds[animationId] = speed;
  }
  return speeds;
}

/** Summary: True for a non-null, non-array object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Summary: True when the value is one of the allowed literals. */
function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Summary: True for a finite number inside the inclusive [min, max] range. */
function isNumberInRange(value: unknown, range: readonly [number, number]): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= range[0] && value <= range[1];
}
// #endregion
