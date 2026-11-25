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
  readonly graphicsQuality: string;
  readonly godMode?: boolean;
}

/** Summary: One lab entity's pose overrides as written to src/config/savedLabOverrides.ts. */
export type PersistedLabPose = Readonly<Record<string, string | number | Readonly<Record<string, number>>>>;

export interface IPersistedBoxHitbox {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly minY?: number;
  readonly maxY?: number;
  readonly yaw?: number;
}

export interface IPersistedObstacleHitbox {
  readonly radiusScale: number;
  readonly heightScale: number;
}

export interface IPersistedEntityHitbox {
  readonly radius: number;
  readonly height: number;
  readonly bodyRadius?: number;
}

export interface IPersistedHitboxOverrides {
  readonly boxes?: Readonly<Record<string, IPersistedBoxHitbox>>;
  readonly obstacles?: Readonly<Record<string, IPersistedObstacleHitbox>>;
  readonly entities?: Readonly<Record<string, IPersistedEntityHitbox>>;
}
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
/** Mirrors GRAPHICS_QUALITIES in src/world/domain/graphicsQuality.ts. */
const GRAPHICS_QUALITIES: readonly string[] = ['low', 'medium', 'high'];
/** Inclusive ranges, matching the sliders in the settings modal. */
const MOUSE_SENSITIVITY_RANGE = [0.4, 2.5] as const;
const WALK_SPEED_RANGE = [0.6, 1.8] as const;
const JUMP_FORCE_RANGE = [0.7, 1.6] as const;

const ENTITY_ID_PATTERN = /^[a-z0-9_]{1,64}$/;
const HITBOX_ID_PATTERN = /^[A-Za-z0-9_-]{1,96}$/;
/** Hard cap on persisted lab entries; the catalog has far fewer entities. */
const MAX_LAB_ENTITIES = 100;
const MAX_HITBOX_BOXES = 800;
const MAX_HITBOX_OBSTACLES = 40;
const MAX_HITBOX_ENTITIES = 64;
const HITBOX_COORD_RANGE = [-4096, 4096] as const;
const HITBOX_Y_RANGE = [-512, 1024] as const;
const HITBOX_YAW_RANGE = [-Math.PI * 2, Math.PI * 2] as const;
const HITBOX_SCALE_RANGE = [0.1, 5.0] as const;
const HITBOX_ENTITY_RADIUS_RANGE = [0.1, 20.0] as const;
const HITBOX_ENTITY_HEIGHT_RANGE = [0.1, 30.0] as const;

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
  if (!isOneOf(value.graphicsQuality, GRAPHICS_QUALITIES)) return REJECTED;
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
      graphicsQuality: value.graphicsQuality,
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

/**
 * Summary: Validates a global hitbox overrides payload (boxes, obstacles, entities).
 * @param value Parsed JSON request body.
 * @returns The cleaned overrides, or a rejection.
 */
export function checkHitboxOverridesPayload(value: unknown): PayloadCheck<IPersistedHitboxOverrides> {
  if (!isPlainObject(value)) return REJECTED;
  const clean: {
    boxes?: Record<string, IPersistedBoxHitbox>;
    obstacles?: Record<string, IPersistedObstacleHitbox>;
    entities?: Record<string, IPersistedEntityHitbox>;
  } = {};

  if (value.boxes !== undefined) {
    if (!isPlainObject(value.boxes)) return REJECTED;
    const entries = Object.entries(value.boxes);
    if (entries.length > MAX_HITBOX_BOXES) return REJECTED;
    const cleanBoxes: Record<string, IPersistedBoxHitbox> = {};
    for (const [boxId, rawBox] of entries) {
      if (!HITBOX_ID_PATTERN.test(boxId)) return REJECTED;
      const box = toBoxHitbox(rawBox);
      if (!box) return REJECTED;
      cleanBoxes[boxId] = box;
    }
    if (entries.length > 0) clean.boxes = cleanBoxes;
  }

  if (value.obstacles !== undefined) {
    if (!isPlainObject(value.obstacles)) return REJECTED;
    const entries = Object.entries(value.obstacles);
    if (entries.length > MAX_HITBOX_OBSTACLES) return REJECTED;
    const cleanObs: Record<string, IPersistedObstacleHitbox> = {};
    for (const [obsKey, rawObs] of entries) {
      if (!ENTITY_ID_PATTERN.test(obsKey)) return REJECTED;
      const obs = toObstacleHitbox(rawObs);
      if (!obs) return REJECTED;
      cleanObs[obsKey] = obs;
    }
    if (entries.length > 0) clean.obstacles = cleanObs;
  }

  if (value.entities !== undefined) {
    if (!isPlainObject(value.entities)) return REJECTED;
    const entries = Object.entries(value.entities);
    if (entries.length > MAX_HITBOX_ENTITIES) return REJECTED;
    const cleanEnt: Record<string, IPersistedEntityHitbox> = {};
    for (const [entId, rawEnt] of entries) {
      if (!ENTITY_ID_PATTERN.test(entId)) return REJECTED;
      const ent = toEntityHitbox(rawEnt);
      if (!ent) return REJECTED;
      cleanEnt[entId] = ent;
    }
    if (entries.length > 0) clean.entities = cleanEnt;
  }

  return { ok: true, value: clean };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Private Helpers
function toBoxHitbox(raw: unknown): IPersistedBoxHitbox | null {
  if (!isPlainObject(raw)) return null;
  if (
    !isNumberInRange(raw.minX, HITBOX_COORD_RANGE) ||
    !isNumberInRange(raw.maxX, HITBOX_COORD_RANGE) ||
    !isNumberInRange(raw.minZ, HITBOX_COORD_RANGE) ||
    !isNumberInRange(raw.maxZ, HITBOX_COORD_RANGE)
  ) {
    return null;
  }
  if (raw.minX >= raw.maxX || raw.minZ >= raw.maxZ) return null;
  if (raw.minY !== undefined && !isNumberInRange(raw.minY, HITBOX_Y_RANGE)) return null;
  if (raw.maxY !== undefined && !isNumberInRange(raw.maxY, HITBOX_Y_RANGE)) return null;
  if (raw.minY !== undefined && raw.maxY !== undefined && raw.minY >= raw.maxY) return null;
  if (raw.yaw !== undefined && !isNumberInRange(raw.yaw, HITBOX_YAW_RANGE)) return null;
  return {
    minX: raw.minX,
    maxX: raw.maxX,
    minZ: raw.minZ,
    maxZ: raw.maxZ,
    ...(raw.minY !== undefined ? { minY: raw.minY } : {}),
    ...(raw.maxY !== undefined ? { maxY: raw.maxY } : {}),
    ...(raw.yaw !== undefined ? { yaw: raw.yaw } : {}),
  };
}

function toObstacleHitbox(raw: unknown): IPersistedObstacleHitbox | null {
  if (!isPlainObject(raw)) return null;
  if (
    !isNumberInRange(raw.radiusScale, HITBOX_SCALE_RANGE) ||
    !isNumberInRange(raw.heightScale, HITBOX_SCALE_RANGE)
  ) {
    return null;
  }
  return { radiusScale: raw.radiusScale, heightScale: raw.heightScale };
}

function toEntityHitbox(raw: unknown): IPersistedEntityHitbox | null {
  if (!isPlainObject(raw)) return null;
  if (
    !isNumberInRange(raw.radius, HITBOX_ENTITY_RADIUS_RANGE) ||
    !isNumberInRange(raw.height, HITBOX_ENTITY_HEIGHT_RANGE)
  ) {
    return null;
  }
  if (raw.bodyRadius !== undefined && !isNumberInRange(raw.bodyRadius, HITBOX_ENTITY_RADIUS_RANGE)) {
    return null;
  }
  return {
    radius: raw.radius,
    height: raw.height,
    ...(raw.bodyRadius !== undefined ? { bodyRadius: raw.bodyRadius } : {}),
  };
}

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

/**
 * Summary: True when a request's Origin header is the dev server itself. Both http:// and https:// count, because
 *          hosted previews (Google AI Studio) serve the page through an https proxy that forwards the same Host.
 * @param origin The Origin header, or undefined when the browser sent none (same-origin GET/non-CORS).
 * @param host The Host header of the request.
 */
export function isSameOriginRequest(origin: string | undefined, host: string | undefined): boolean {
  if (origin === undefined) return true;
  if (host === undefined || host === '') return false;
  return origin === `http://${host}` || origin === `https://${host}`;
}
