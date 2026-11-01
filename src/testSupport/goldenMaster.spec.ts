// ============================================================================
// MODULE: Test Support / Golden Master Tests
// DESIGN: AAA unit tests for the characterization-test snapshot helper
// SUMMARY: Verifies number rounding, collection normalization and snapshot comparison.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertMatchesGolden, normalizeForGolden } from './goldenMaster';
// #endregion

// ======================== NORMALIZATION TESTS ======================== \\
// #region Normalization Tests
test('normalizeForGolden_WhenGivenMixedValue_ShouldRoundSortAndDropNoise', () => {
  // Arrange
  const value = { b: 1.23456789, a: new Set(['y', 'x']), skip: undefined, fn: () => 1, inf: Infinity, neg: -0 };

  // Act
  const result = normalizeForGolden(value, 3);

  // Assert
  assert.deepStrictEqual(result, { a: ['x', 'y'], b: 1.235, inf: 'Infinity', neg: 0 });
  assert.deepStrictEqual(Object.keys(result as object), ['a', 'b', 'inf', 'neg']);
});
// #endregion

// ======================== SNAPSHOT TESTS ======================== \\
// #region Snapshot Tests
test('assertMatchesGolden_WhenValueMatchesSnapshot_ShouldPass', () => {
  // Arrange
  const file = join(mkdtempSync(join(tmpdir(), 'golden-')), 'snap.json');
  writeFileSync(file, JSON.stringify({ x: 1.5 }));

  // Act & Assert
  assert.doesNotThrow(() => assertMatchesGolden(pathToFileURL(file), { x: 1.5000000001 }));
});

test('assertMatchesGolden_WhenValueDiffers_ShouldThrow', () => {
  // Arrange
  const file = join(mkdtempSync(join(tmpdir(), 'golden-')), 'snap.json');
  writeFileSync(file, JSON.stringify({ x: 1.5 }));

  // Act & Assert
  assert.throws(() => assertMatchesGolden(pathToFileURL(file), { x: 1.6 }));
});

test('assertMatchesGolden_WhenSnapshotMissing_ShouldFailInsteadOfRecording', () => {
  // Arrange
  const file = join(mkdtempSync(join(tmpdir(), 'golden-')), 'missing.json');
  const previous = process.env.UPDATE_GOLDEN;
  delete process.env.UPDATE_GOLDEN;

  // Act & Assert
  try {
    assert.throws(() => assertMatchesGolden(pathToFileURL(file), { x: 1 }), /Golden snapshot missing/);
  } finally {
    if (previous !== undefined) process.env.UPDATE_GOLDEN = previous;
  }
});
// #endregion
