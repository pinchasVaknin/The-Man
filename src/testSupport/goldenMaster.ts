// ============================================================================
// MODULE: Test Support / Golden Master
// DESIGN: Characterization-test helper that compares a value against a stored JSON snapshot
// SUMMARY: Normalizes numbers and collections into stable JSON and asserts deep equality
//          with a committed golden file. Set UPDATE_GOLDEN=1 to (re)record a snapshot on purpose.
// ============================================================================

// ======================== IMPORTS ======================== \\
// #region Imports
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// #endregion

// ======================== CONSTANTS ======================== \\
// #region Constants
/** Decimal places kept for numbers, so platform-level float noise never flips a snapshot. */
const DEFAULT_GOLDEN_PRECISION = 6;
// #endregion

// ======================== NORMALIZATION ======================== \\
// #region Normalization
/**
 * Summary: Converts a value into plain JSON with rounded numbers.
 * Design: Sets become sorted arrays, Maps become objects, non-finite numbers become strings,
 *         functions and undefined fields are dropped, and object keys are sorted for stable diffs.
 */
export function normalizeForGolden(value: unknown, precision = DEFAULT_GOLDEN_PRECISION): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    const rounded = Number(value.toFixed(precision));
    return Object.is(rounded, -0) ? 0 : rounded;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => normalizeForGolden(item, precision));
  if (value instanceof Set) {
    return [...value].map((item) => normalizeForGolden(item, precision)).sort();
  }
  if (value instanceof Map) {
    return normalizeForGolden(Object.fromEntries(value), precision);
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      const field = (value as Record<string, unknown>)[key];
      if (field === undefined || typeof field === 'function') continue;
      result[key] = normalizeForGolden(field, precision);
    }
    return result;
  }
  return undefined;
}
// #endregion

// ======================== ASSERTION ======================== \\
// #region Assertion
/**
 * Summary: Asserts that `actual` matches the golden JSON stored at `goldenFileUrl`.
 * Design: A missing snapshot fails loudly instead of being recorded silently, so a snapshot
 *         only changes when someone runs the suite with UPDATE_GOLDEN=1 on purpose.
 */
export function assertMatchesGolden(goldenFileUrl: URL, actual: unknown): void {
  const normalized = normalizeForGolden(actual);
  const goldenPath = fileURLToPath(goldenFileUrl);
  if (process.env.UPDATE_GOLDEN === '1') {
    mkdirSync(dirname(goldenPath), { recursive: true });
    writeFileSync(goldenPath, `${JSON.stringify(normalized, null, 1)}\n`);
    return;
  }
  if (!existsSync(goldenPath)) {
    assert.fail(`Golden snapshot missing: ${goldenPath}. Record it with UPDATE_GOLDEN=1.`);
  }
  const expected: unknown = JSON.parse(readFileSync(goldenPath, 'utf8'));
  assert.deepStrictEqual(normalized, expected);
}
// #endregion
