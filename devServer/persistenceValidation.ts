// ============================================================================
// MODULE: Dev Server / Persistence Validation
// DESIGN: Self-contained allowlist validators with no imports (dev server stays isolated)
// SUMMARY: Checks the JSON bodies of the dev-only "Save to file" endpoints before they are
//          written into src/config. Deliberately duplicates the rules of the game's
//          src/config/persistedSettingsValidation.ts so the Vite config never loads game
//          code; persistenceValidationParity.spec.ts keeps the two copies in agreement.
// ============================================================================

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Outcome of validating an untrusted payload: the cleaned value, or a rejection. */
export type PayloadCheck<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

/** Summary: Game settings as written to src/config/savedGameSettings.ts. */
export interface IPersistedGameSettings {
  readonly keybindings: Readonly<Record<string, string>>;
  readonly defaultCameraPerspective: string;
  readonly mouseSensitivity: number;
  readonly walkSpeedMultiplier: number;
  readonly jumpForceMultiplier: number;
  readonly firefliesMode: string;
  readonly defaultMuted: boolean;
  readonly godMode?: boolean;
}

/** Summary: One lab entity's pose overrides as written to src/config/savedLabOverrides.ts. */
export type PersistedLabPose = Readonly<Record<string, string | number | Readonly<Record<string, number>>>>;
// #endregion

// ======================== RULES ======================== \\
// #region Rules
const KEYBINDING_NAMES: readonly string[] = [
  'moveForward', 'moveBackward', 'moveLeft', 'moveRight', 'sprint', 'relaxedWalk', 'jump',
  'interactDoor', 'mountHorse', 'drawOrSlash', 'dash', 'cycleArrowElement', 'cameraPerspective',
  'inventoryModal', 'favoritesModal', 'marketModal', 'hotbarSlot1', 'hotbarSlot2', 'hotbarSlot3',
  'hotbarSlot4', 'cycleWeather', 'toggleMute', 'pauseGame', 'toggleFavorite',
];
/** KeyboardEvent.code values are short alphanumeric identifiers such as "KeyW" or "ShiftLeft". */
const KEY_CODE_PATTERN = /^[A-Za-z0-9]{1,32}$/;
const CAMERA_PERSPECTIVES: readonly string[] = ['third_person', 'first_person'];
const FIREFLIES_MODES: readonly string[] = ['sanctuary_only', 'off'];
/** Inclusive ranges, matching the sliders in the settings modal. */
const MOUSE_SENSITIVITY_RANGE = [0.4, 2.5] as const;
const WALK_SPEED_RANGE = [0.6, 1.8] as const;
const JUMP_FORCE_RANGE = [0.7, 1.6] as const;

const ENTITY_ID_PATTERN = /^[a-z0-9_]{1,64}$/;
/** Hard cap on persisted lab entries; the catalog has far fewer entities. */
const MAX_LAB_ENTITIES = 100;
const VISIBILITY_MODES: readonly string[] = ['auto', 'both', 'right_only', 'left_only', 'none'];
/** Rotation buttons can stack past the +-180 deg sliders, so allow two full turns. */
const ROTATION_DEG_LIMIT = 720;
const LAB_NUMBER_RANGES: Readonly<Record<string, readonly [number, number]>> = {
  amplitudeMultiplier: [0, 5],
  weaponScale: [0.05, 5],
  leftWeaponScale: [0.05, 5],
  bodyOffsetY: [-5, 5],
};
const LAB_ROTATION_FIELDS: readonly string[] = [
  'weaponRotXDeg', 'weaponRotYDeg', 'weaponRotZDeg', 'leftWeaponRotXDeg', 'leftWeaponRotYDeg',
  'leftWeaponRotZDeg', 'rightLimbRotXDeg', 'rightLimbRotYDeg', 'rightLimbRotZDeg', 'leftLimbRotXDeg',
  'leftLimbRotYDeg', 'leftLimbRotZDeg', 'headRotXDeg', 'headRotYDeg', 'headRotZDeg', 'bodyRotXDeg',
  'bodyRotYDeg', 'bodyRotZDeg',
];
const ANIMATION_SPEED_RANGE = [0.05, 10] as const;
const REJECTED: PayloadCheck<never> = { ok: false };
// #endregion

// ======================== VALIDATORS ======================== \\
// #region Validators
/**
 * Summary: Validates a game settings payload and returns only the known fields.
 * Design: Allowlist mapping; every field is type- and range-checked, unknown fields dropped.
 * @param value Parsed JSON request body.
 * @returns The cleaned settings, or a rejection.
 */
export function checkGameSettingsPayload(value: unknown): PayloadCheck<IPersistedGameSettings> {
  if (!isPlainObject(value) || !isPlainObject(value.keybindings)) return REJECTED;
  const keybindings: Record<string, string> = {};
  for (const name of KEYBINDING_NAMES) {
    const code = value.keybindings[name];
    if (typeof code !== 'string' || !KEY_CODE_PATTERN.test(code)) return REJECTED;
    keybindings[name] = code;
  }
  const perspective = value.defaultCameraPerspective;
  const fireflies = value.firefliesMode;
  if (!isOneOf(perspective, CAMERA_PERSPECTIVES) || !isOneOf(fireflies, FIREFLIES_MODES)) return REJECTED;
  if (typeof value.defaultMuted !== 'boolean') return REJECTED;
  if (value.godMode !== undefined && typeof value.godMode !== 'boolean') return REJECTED;
  if (
    !isNumberInRange(value.mouseSensitivity, MOUSE_SENSITIVITY_RANGE) ||
    !isNumberInRange(value.walkSpeedMultiplier, WALK_SPEED_RANGE) ||
    !isNumberInRange(value.jumpForceMultiplier, JUMP_FORCE_RANGE)
  ) {
    return REJECTED;
  }
  return {
    ok: true,
    value: {
      keybindings,
      defaultCameraPerspective: perspective,
      mouseSensitivity: value.mouseSensitivity,
      walkSpeedMultiplier: value.walkSpeedMultiplier,
      jumpForceMultiplier: value.jumpForceMultiplier,
      firefliesMode: fireflies,
      defaultMuted: value.defaultMuted,
      ...(typeof value.godMode === 'boolean' ? { godMode: value.godMode } : {}),
    },
  };
}

/**
 * Summary: Validates a lab pose overrides payload keyed by entity id.
 * Design: Allowlist mapping with numeric ranges per field; entity ids must be snake_case.
 * @param value Parsed JSON request body.
 * @returns The cleaned map, or a rejection.
 */
export function checkLabOverridesPayload(value: unknown): PayloadCheck<Record<string, PersistedLabPose>> {
  if (!isPlainObject(value)) return REJECTED;
  const entries = Object.entries(value);
  if (entries.length > MAX_LAB_ENTITIES) return REJECTED;
  const clean: Record<string, PersistedLabPose> = {};
  for (const [entityId, rawPose] of entries) {
    if (!ENTITY_ID_PATTERN.test(entityId)) return REJECTED;
    const pose = toLabPose(rawPose);
    if (!pose) return REJECTED;
    clean[entityId] = pose;
  }
  return { ok: true, value: clean };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Private Helpers
/** Summary: Maps one entity's raw pose to a clean object, or null when any field is invalid. */
function toLabPose(raw: unknown): PersistedLabPose | null {
  if (!isPlainObject(raw) || !isOneOf(raw.equipmentVisibilityMode, VISIBILITY_MODES)) return null;
  const pose: Record<string, string | number | Readonly<Record<string, number>>> = {
    equipmentVisibilityMode: raw.equipmentVisibilityMode,
  };
  for (const field of LAB_ROTATION_FIELDS) {
    if (!isNumberInRange(raw[field], [-ROTATION_DEG_LIMIT, ROTATION_DEG_LIMIT])) return null;
    pose[field] = raw[field];
  }
  for (const [field, range] of Object.entries(LAB_NUMBER_RANGES)) {
    if (!isNumberInRange(raw[field], range)) return null;
    pose[field] = raw[field];
  }
  const speed = raw.animationSpeedMultiplier;
  if (speed !== undefined) {
    if (!isNumberInRange(speed, ANIMATION_SPEED_RANGE)) return null;
    pose.animationSpeedMultiplier = speed;
  }
  if (raw.perAnimationSpeeds !== undefined) {
    const speeds = toAnimationSpeeds(raw.perAnimationSpeeds);
    if (!speeds) return null;
    pose.perAnimationSpeeds = speeds;
  }
  return pose;
}

/** Summary: Validates the per-animation speed map, or null when invalid. */
function toAnimationSpeeds(raw: unknown): Readonly<Record<string, number>> | null {
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

/** Summary: True when the value is one of the allowed strings. */
function isOneOf(value: unknown, allowed: readonly string[]): value is string {
  return typeof value === 'string' && allowed.includes(value);
}

/** Summary: True for a finite number inside the inclusive [min, max] range. */
function isNumberInRange(value: unknown, range: readonly [number, number]): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= range[0] && value <= range[1];
}
// #endregion
