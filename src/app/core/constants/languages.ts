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
