// ============================================================================
// MODULE: Tooling / Check No Hebrew
// DESIGN: Command-line front of the Hebrew guard (src/tooling/hebrewGuard.ts). Exit code 1 when any Hebrew
//         letter is found, so it can run in the pre-commit hook and in CI.
// SUMMARY: Usage: npx tsx scripts/checkNoHebrew.ts           checks every tracked file
//                 npx tsx scripts/checkNoHebrew.ts --staged  checks the files staged for the next commit
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { findHebrew, listFilesToCheck } from '../src/tooling/hebrewGuard';
// #endregion

// ======================== CHECK ======================== \\
// #region Run The Check
const staged = process.argv.includes('--staged');
const hits = findHebrew(listFilesToCheck(staged), staged);

if (hits.length === 0) {
  console.log(`no Hebrew found (${staged ? 'staged files' : 'all tracked files'})`);
} else {
  console.error(`Hebrew is not allowed in this repository (${hits.length} line${hits.length === 1 ? '' : 's'}). Translate it to English; UI text goes in src/locales/en.ts:`);
  for (const hit of hits) console.error(`  ${hit.file}:${hit.line}: ${hit.text}`);
  process.exit(1);
}
// #endregion
