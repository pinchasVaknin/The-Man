// ============================================================================
// MODULE: Lab / Overrides Storage
// DESIGN: Pure parse-merge-validate step for persisted lab pose overrides (Result, no I/O)
// SUMMARY: Turns the raw localStorage string into validated per-entity overrides merged
//          over the code-saved values. Does not read or write storage itself; callers do.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { Result } from '../core/Result';
import { validateLabOverrides } from '../config/persistedSettingsValidation';
import { DEFAULT_LAB_POSE_OVERRIDES, type ILabPoseOverrides } from './labCatalog';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** localStorage key shared by the lab (writer) and the world wildlife layer (reader). */
export const LAB_POSE_OVERRIDES_STORAGE_KEY = 'lab_pose_overrides_v1';

export type StoredLabOverridesError = 'MALFORMED_JSON' | 'INVALID_LAB_OVERRIDES';
// #endregion

// ======================== PUBLIC FUNCTIONS ======================== \\
// #region Merge Stored Lab Overrides
/**
 * Summary: Parses stored overrides, merges each entry over defaults and code overrides,
 *          and validates the result.
 * Design: Stored entries may be partial (older versions saved fewer fields), so every entry
 *         is completed from DEFAULT_LAB_POSE_OVERRIDES and the code-saved entry before the
 *         allowlist validator runs.
 * @param raw The raw localStorage value, or null when nothing is stored.
 * @param codeOverrides Overrides saved in the codebase (SAVED_LAB_OVERRIDES).
 * @returns Result.ok with the merged map, or Result.fail('MALFORMED_JSON' | 'INVALID_LAB_OVERRIDES').
 */
export function mergeStoredLabOverrides(
  raw: string | null,
  codeOverrides: Readonly<Record<string, ILabPoseOverrides>>
): Result<Record<string, ILabPoseOverrides>, StoredLabOverridesError> {
  if (!raw) {
    return Result.ok({ ...codeOverrides });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Result.fail('MALFORMED_JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return Result.fail('INVALID_LAB_OVERRIDES');
  }

  const merged: Record<string, unknown> = { ...codeOverrides };
  for (const [entityId, storedEntry] of Object.entries(parsed as Record<string, unknown>)) {
    const codeEntry = codeOverrides[entityId];
    const storedObject = typeof storedEntry === 'object' && storedEntry !== null ? storedEntry : {};
    const storedSpeeds = (storedObject as { perAnimationSpeeds?: unknown }).perAnimationSpeeds;
    merged[entityId] = {
      ...DEFAULT_LAB_POSE_OVERRIDES,
      ...(codeEntry ?? {}),
      ...storedObject,
      perAnimationSpeeds: {
        ...(codeEntry?.perAnimationSpeeds ?? {}),
        ...(typeof storedSpeeds === 'object' && storedSpeeds !== null ? storedSpeeds : {}),
      },
    };
  }
  const validated = validateLabOverrides(merged);
  return validated.isSuccess ? Result.ok(validated.value) : Result.fail('INVALID_LAB_OVERRIDES');
}
// #endregion
