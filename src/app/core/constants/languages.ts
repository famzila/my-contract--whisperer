/**
 * Language Constants
 * Centralized language codes and configuration to replace magic strings
 */

export const LANGUAGES = {
  ENGLISH: 'en',
  FRENCH: 'fr',
  ARABIC: 'ar',
  SPANISH: 'es',
  GERMAN: 'de',
  JAPANESE: 'ja',
  CHINESE: 'zh',
  KOREAN: 'ko',
} as const;

export type LanguageCode = typeof LANGUAGES[keyof typeof LANGUAGES];

/**
 * RTL (Right-to-Left) language codes
 */
export const RTL_LANGUAGES = [
  LANGUAGES.ARABIC,
] as const;

export type RTLanguageCode = typeof RTL_LANGUAGES[number];

/**
 * Check if a language code is RTL
 */
export function isRTL(languageCode: string): boolean {
  return (RTL_LANGUAGES as readonly string[]).includes(languageCode);
}

/**
 * Default language fallback
 */
export const DEFAULT_LANGUAGE = LANGUAGES.ENGLISH;

/**
 * Languages that Gemini Nano can analyze directly (official support)
 * Other languages require pre-translation to English
 */
export const GEMINI_NANO_SUPPORTED_LANGUAGES = [
  LANGUAGES.ENGLISH,
  LANGUAGES.SPANISH,
  LANGUAGES.JAPANESE,
] as const;

/**
 * Check if language is supported by Gemini Nano for direct analysis
 */
export function isGeminiNanoSupported(langCode: string): boolean {
  return (GEMINI_NANO_SUPPORTED_LANGUAGES as readonly string[]).includes(langCode);
}

/**
 * Languages supported for APP UI (i18n translations available)
 */
export const SUPPORTED_APP_LANGUAGES = [
  LANGUAGES.ENGLISH,
  LANGUAGES.FRENCH,
  LANGUAGES.ARABIC,
  LANGUAGES.SPANISH,
  LANGUAGES.GERMAN,
  LANGUAGES.JAPANESE,
  LANGUAGES.CHINESE,
] as const;

/**
 * Check if language is supported for app UI
 */
export function isAppLanguageSupported(langCode: string): boolean {
  return (SUPPORTED_APP_LANGUAGES as readonly string[]).includes(langCode);
}

/**
 * Language code to translation key mapping
 */
export const LANGUAGE_TRANSLATION_KEYS: Record<string, string> = {
  'en': 'languages.english',
  'fr': 'languages.french',
  'ar': 'languages.arabic',
  'es': 'languages.spanish',
  'de': 'languages.german',
  'ja': 'languages.japanese',
  'zh': 'languages.chinese',
  'ko': 'languages.korean',
} as const;

/**
 * Get translation key for a language code
 */
export function getLanguageTranslationKey(languageCode: string): string {
  return LANGUAGE_TRANSLATION_KEYS[languageCode] || languageCode.toUpperCase();
}
