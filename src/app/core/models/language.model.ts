/**
 * Language-related models and interfaces
 */

/**
 * Supported language interface
 */
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Translation cache entry
 */
export interface TranslationCache {
  [key: string]: string; // key: `${text}-${targetLang}`, value: translated text
}

/**
 * Language store state interface
 */
export interface LanguageState {
  // Detected contract language
  detectedContractLanguage: string | null;
  
  // User's preferred language for analysis
  preferredLanguage: string;
  
  // Available languages
  availableLanguages: Language[];
  
  // Translation states
  isTranslating: boolean;
  translationError: string | null;
  
  // Cache for translations (performance optimization)
  translationCache: TranslationCache;
  
  // Show language selector banner
  showLanguageBanner: boolean;
}

/**
 * Translation capabilities response
 */
export interface TranslationCapabilities {
  available: 'available' | 'downloadable' | 'unavailable';
  sourceLanguage: string;
  targetLanguage: string;
}
