// ============================================================================
// MODULE: Locales / Central Translation Engine
// DESIGN: Strongly-typed centralized localization module conforming to profile.md
// SUMMARY: Exposes translation lookup function t(key, params?) with dot-notation
//          navigation, param interpolation, and fallback handling.
// ============================================================================

// ======================== IMPORTS & TYPES ======================== \\
// #region Imports & Types
import { en, type LocaleSchema } from './en';

/**
 * Summary: Type contract representing a complete application localization dictionary.
 * Design: Enforces structural parity with canonical LocaleSchema across all language packs.
 */
export type TranslationDictionary = LocaleSchema;

let currentDictionary: TranslationDictionary = en;
// #endregion

// ======================== TRANSLATION FUNCTIONS ======================== \\
// #region Translation Functions
/**
 * Summary: Replaces the active localization dictionary with a new language pack.
 * Design: Mutates internal dictionary reference to dynamically change languages without page reload.
 * @param dict The new translation dictionary adhering to TranslationDictionary schema.
 * @returns Void.
 */
export function setLocaleDictionary(dict: TranslationDictionary | Record<string, unknown>): void {
  currentDictionary = dict as TranslationDictionary;
}

/**
 * Summary: Retrieves the currently active translation dictionary.
 * Design: Returns read-only reference to active dictionary for testing and inspection.
 * @returns The active TranslationDictionary instance.
 */
export function getLocaleDictionary(): TranslationDictionary {
  return currentDictionary;
}

/**
 * Summary: Looks up a localized string by dot-notated path with optional variable interpolation.
 * Design: Traverses nested dictionary safely with fallback to the key itself on missing paths.
 * @param key Dot-notated translation key path.
 * @param params Optional key-value record for parameter interpolation.
 * @returns Translated string with interpolated values, or key string fallback if missing.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const segments = key.split('.');
  let current: unknown = currentDictionary;

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      current = undefined;
      break;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  if (!params) {
    return current;
  }

  return current.replace(/\{(\w+)\}/g, (match, token) => {
    return params[token] !== undefined ? String(params[token]) : match;
  });
}
// #endregion

export { en };
