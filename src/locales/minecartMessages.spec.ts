// ============================================================================
// MODULE: Locales / Minecart Messages Tests
// DESIGN: The rail messages live in the locale (no inline text) and are English
// SUMMARY: Every minecart key resolves to text, and none of it contains Hebrew letters.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t } from './index';

const KEYS = ['switch_left', 'switch_right', 'turn_left', 'turn_right', 'fork_ahead'] as const;

for (const key of KEYS) {
  test(`t_WhenMinecart${key}IsRequested_ShouldReturnEnglishTextNotTheKey`, () => {
    const text = t(`minecart.${key}`);

    assert.notEqual(text, `minecart.${key}`, 'the key must exist in the dictionary');
    assert.ok(!/[֐-׿]/.test(text), `"${text}" must be English`);
    assert.ok(/\[[AD]\]/.test(text), `"${text}" must name the A or D key`);
  });
}
