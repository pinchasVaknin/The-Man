// ============================================================================
// MODULE: Tooling / Hebrew Guard
// DESIGN: One detector shared by the test, the command-line check and the pre-commit hook. The project's code,
//         comments, strings and docs are English only (profile.md: code-language); any Hebrew letter in a tracked
//         text file is a violation, wherever it appears. This file holds no Hebrew itself: the letter ranges
//         are written as escapes so the guard does not trip on its own source.
// SUMMARY: Lists the tracked (or staged) text files and finds the lines that contain Hebrew letters.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
/** Hebrew block and the Hebrew presentation forms. */
export const HEBREW_PATTERN = new RegExp('[\\u0590-\\u05FF\\uFB1D-\\uFB4F]');

/** Files that are not text; they are never read. */
const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|ico|glb|gltf|bin|woff2?|ttf|otf|mp3|ogg|wav|mp4|webm|pdf|zip)$/i;

/** Summary: One line with Hebrew in it. */
export interface IHebrewHit {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}
// #endregion

// ======================== PUBLIC API ======================== \\
// #region File Listing
/**
 * Summary: The files to check, as repository-relative paths.
 * @param staged When true, only the files staged for the next commit (added, copied or modified).
 */
export function listFilesToCheck(staged: boolean): string[] {
  const args = staged ? ['diff', '--cached', '--name-only', '--diff-filter=ACM'] : ['ls-files'];
  return execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && !BINARY_EXTENSIONS.test(name));
}
// #endregion

// #region Find Hebrew
function readContent(file: string, staged: boolean): string | null {
  try {
    return staged ? execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) : readFileSync(file, 'utf8');
  } catch {
    return null; // deleted or unreadable: nothing to check
  }
}

/**
 * Summary: Finds every line with a Hebrew letter in the given files.
 * @param files Repository-relative paths.
 * @param staged When true, reads the staged version of each file instead of the working copy.
 */
export function findHebrew(files: readonly string[], staged = false): IHebrewHit[] {
  const hits: IHebrewHit[] = [];
  for (const file of files) {
    const content = readContent(file, staged);
    if (content === null) continue;
    content.split('\n').forEach((text, index) => {
      if (HEBREW_PATTERN.test(text)) hits.push({ file, line: index + 1, text: text.trim().slice(0, 140) });
    });
  }
  return hits;
}

/** Summary: True when the text contains a Hebrew letter. */
export function containsHebrew(text: string): boolean {
  return HEBREW_PATTERN.test(text);
}
// #endregion
