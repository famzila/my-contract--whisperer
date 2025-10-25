/**
 * Language Names Utility
 * Maps language codes to user-friendly display names
 */

export interface LanguageName {
  code: string;
  name: string;
  nativeName: string;
}

/**
 * Language name mapping for all supported languages
 */
export const LANGUAGE_NAMES: Record<string, LanguageName> = {
  'en': { code: 'en', name: 'English', nativeName: 'English' },
  'ar': { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  'fr': { code: 'fr', name: 'French', nativeName: 'Français' },
  'es': { code: 'es', name: 'Spanish', nativeName: 'Español' },
  'de': { code: 'de', name: 'German', nativeName: 'Deutsch' },
  'ja': { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  'zh': { code: 'zh', name: 'Chinese', nativeName: '中文' },
  'ko': { code: 'ko', name: 'Korean', nativeName: '한국어' },
};

/**
 * Get user-friendly language name from language code
 * @param languageCode - The language code (e.g., 'en', 'ar', 'fr')
 * @returns The friendly language name or the code if not found
 */
export function getLanguageName(languageCode: string): string {
  const language = LANGUAGE_NAMES[languageCode];
  return language ? language.name : languageCode;
}

/**
 * Get native language name from language code
 * @param languageCode - The language code (e.g., 'en', 'ar', 'fr')
 * @returns The native language name or the code if not found
 */
export function getNativeLanguageName(languageCode: string): string {
  const language = LANGUAGE_NAMES[languageCode];
  return language ? language.nativeName : languageCode;
}

/**
 * Get language info object from language code
 * @param languageCode - The language code (e.g., 'en', 'ar', 'fr')
 * @returns The language info object or null if not found
 */
export function getLanguageInfo(languageCode: string): LanguageName | null {
  return LANGUAGE_NAMES[languageCode] || null;
}
