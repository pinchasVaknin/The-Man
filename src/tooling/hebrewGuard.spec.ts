// ============================================================================
// MODULE: Tooling / Hebrew Guard Tests
// DESIGN: AAA tests for the detector, plus the real check over every tracked file of the repository
// SUMMARY: Fails with the file and line of any Hebrew letter in tracked code, comments, strings or docs.
//          Test inputs are built from character codes, so this file contains no Hebrew itself.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containsHebrew, findHebrew, listFilesToCheck } from './hebrewGuard';

const HEBREW_WORD = String.fromCharCode(0x05e9, 0x05dc, 0x05d5, 0x05dd);
const PRESENTATION_FORM = String.fromCharCode(0xfb2a);

test('containsHebrew_WhenTextHasAHebrewLetter_ShouldBeTrue', () => {
  assert.equal(containsHebrew(`// a comment ${HEBREW_WORD}`), true);
  assert.equal(containsHebrew(`label: '${PRESENTATION_FORM}'`), true);
});

test('containsHebrew_WhenTextIsEnglishOrOtherScripts_ShouldBeFalse', () => {
  assert.equal(containsHebrew('// Dwarven Warhammer on the south end of the counter'), false);
  assert.equal(containsHebrew('const ok = "café 中文 да";'), false);
});

test('repository_WhenAllTrackedTextFilesAreScanned_ShouldContainNoHebrewAtAll', () => {
  const hits = findHebrew(listFilesToCheck(false));

  assert.deepEqual(
    hits.map((hit) => `${hit.file}:${hit.line}: ${hit.text}`),
    [],
    'Hebrew is not allowed anywhere in the code, comments, strings or docs. Translate it to English (UI text goes in src/locales/en.ts):'
  );
});
