// ============================================================================
// MODULE: World / Domain / Mount Prompt Tests
// DESIGN: AAA tests for the mount-to-locale-key mapping and for the keys existing in the dictionary
// SUMMARY: Every mount the player can ride gets its own dismount and ride prompt, and every key resolves.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMountPromptKey } from './mountPrompt';
import { t } from '../../locales';

const MOUNTS = [
  ['horse-1', 'Horse'],
  ['mount-stag-3', 'Stag'],
  ['mount-lion-0', 'CatLion'],
  ['sky-hoverbike', 'Hoverbike'],
] as const;

for (const [id, name] of MOUNTS) {
  test(`getMountPromptKey_When${name}IsRidden_ShouldNameTheMountInTheDismountPrompt`, () => {
    const text = t(getMountPromptKey(id, null));

    assert.ok(text.startsWith('Dismount'), `got "${text}"`);
    assert.ok(text.includes(name), `"${text}" must name the ${name}`);
  });

  test(`getMountPromptKey_When${name}IsNearby_ShouldNameTheMountInTheRidePrompt`, () => {
    const text = t(getMountPromptKey(null, id));

    assert.ok(text.startsWith('Ride'), `got "${text}"`);
    assert.ok(text.includes(name), `"${text}" must name the ${name}`);
  });
}

test('getMountPromptKey_WhenTheShipIsRiddenOrNearby_ShouldUseTheShipPrompts', () => {
  assert.equal(t(getMountPromptKey('sailable-ship', null)), 'Drop Anchor / Disembark');
  assert.equal(t(getMountPromptKey(null, 'sailable-ship')), 'Sail Ship');
});

test('getMountPromptKey_WhenNothingIsMounted_ShouldFallBackToTheHorsePrompt', () => {
  assert.equal(t(getMountPromptKey(null, null)), 'Ride Horse');
});
