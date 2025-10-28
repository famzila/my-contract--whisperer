/**
 * ========================================
 * APPLICATION CONFIGURATION
 * ========================================
 * Centralized configuration for the Contract Whisperer application.
 * All settings, constants, and defaults are defined here.
 */

/**
 * Language Configuration
 */
export const LANGUAGE_CONFIG = {
  // Language codes
  LANGUAGES: {
    ENGLISH: 'en',
    FRENCH: 'fr',
    ARABIC: 'ar',
    SPANISH: 'es',
    GERMAN: 'de',
    JAPANESE: 'ja',
    CHINESE: 'zh',
    KOREAN: 'ko',
  } as const,

  // Default language fallback
  DEFAULT: 'en',

  // RTL (Right-to-Left) language codes
  RTL_LANGUAGES: ['ar'] as const,

  // Languages that Gemini Nano can analyze directly (official support)
  GEMINI_NANO_SUPPORTED: ['en', 'es', 'ja'] as const,

  // Languages supported for APP UI (i18n translations available)
  SUPPORTED_APP_LANGUAGES: ['en', 'fr', 'ar', 'es', 'de', 'ja', 'zh'] as const,

  // Language code to translation key mapping
  TRANSLATION_KEYS: {
    'en': 'languages.english',
    'fr': 'languages.french',
    'ar': 'languages.arabic',
    'es': 'languages.spanish',
    'de': 'languages.german',
    'ja': 'languages.japanese',
    'zh': 'languages.chinese',
    'ko': 'languages.korean',
  } as const,

  // Complete language information for UI components
  LANGUAGE_INFO: {
    'en': { name: 'English', nativeName: 'English', flag: '🇬🇧' },
    'es': { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    'fr': { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    'ar': { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
    'de': { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    'zh': { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    'ja': { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    'ko': { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  } as const,
} as const;

/**
 * AI Analysis Configuration
 */
export const AI_CONFIG = {
  /**
   * Enable mock AI responses for faster development
   * 
   * When true:
   * - Uses pre-defined mock contract analysis data
   * - No need for Chrome Canary or Built-in AI flags
   * - Instant results with realistic delay (1.5s)
   * - Perfect for UI development and testing
   * 
   * When false:
   * - Uses real Chrome Built-in AI (Gemini Nano)
   * - Requires Chrome Canary with flags enabled:
   *   - chrome://flags/#prompt-api-for-gemini-nano
   *   - chrome://flags/#summarization-api-for-gemini-nano
   *   - chrome://flags/#writer-api-for-gemini-nano
   *   - chrome://flags/#rewriter-api-for-gemini-nano
   * - Real AI analysis with actual contract text
   * 
   * 💡 Tip: Set to true for development, false for production/demo
   */
  USE_MOCK_AI: false, // Toggle this to switch between mock and real AI

  // defaultTemperature: 1,
  //     maxTemperature: 2,
  //     defaultTopK: 3,
  //     maxTopK: 128,
  LANGUAGE_MODEL_PARAMS: {
    DEFAULT_TEMPERATURE: 1,
    MAX_TEMPERATURE: 2,
    DEFAULT_TOP_K: 3,
    MAX_TOP_K: 128,
  },
  WRITER_DEFAULT_PARAMS: {
    DEFAULT_TONE: 'formal',
    DEFAULT_LENGTH: 'medium',
    DEFAULT_OUTPUT_LANGUAGE: 'en',
  },
  REWRITER_DEFAULT_PARAMS: {
    DEFAULT_TONE: 'as-is',
    DEFAULT_LENGTH: 'as-is',
    DEFAULT_OUTPUT_LANGUAGE: 'en',
  },
  /**
   * Retry configuration for section extraction
   */
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
  },

  /**
   * Analysis Strategy: RxJS Streaming (Default & Only Approach)
   * 
   * ✅ Features:
   * - Schema-based extraction with responseConstraint (100% reliable JSON parsing)
   * - RxJS streaming analysis for optimal UX:
   *   • Metadata priority (must complete first) - Dashboard shows immediately
   *   • Independent section streaming - Summary, Risks, Obligations, Omissions stream as they complete
   *   • No waiting for grouped tiers - each section displays as soon as it's ready
   * - Lucide icons for better visual representation
   * - Per-section skeleton loaders and error handling
   * - Perceived performance: ~1s (instead of 10s wait)
   * - Graceful error handling with user-friendly messages
   * 
   * 🎯 This is now the default and only implementation.
   * Legacy approaches have been removed for code simplicity and maintainability.
   */
  STRATEGY: {
    DESCRIPTION: 'Schema-based extraction with responseConstraint (100% reliable JSON parsing)',
    FEATURES: [
      'Metadata priority (must complete first) - Dashboard shows immediately',
      'Independent section streaming - Summary, Risks, Obligations, Omissions stream as they complete',
      'No waiting for grouped tiers - each section displays as soon as it\'s ready',
      'Lucide icons for better visual representation',
      'Per-section skeleton loaders and error handling',
      'Perceived performance: ~1s (instead of 10s wait)',
      'Graceful error handling with user-friendly messages',
    ],
  },
} as const;

/**
 * Storage Configuration
 */
export const STORAGE_CONFIG = {
  CONTRACT_CACHE: {
    CACHE_KEY: 'contract_analysis_cache'
  },
  // Translation cache settings
  TRANSLATION_CACHE: {
    MAX_CONTRACTS: 5, // Keep last 5 contracts
    MAX_AGE_DAYS: 7, // Cache for 7 days
  },
  
  // Offline storage settings
  OFFLINE_STORAGE: {
    DB_NAME: 'ContractWhispererOffline',
    DB_VERSION: 1,
    STORE_NAME: 'contracts',
    MAX_CONTRACTS: 10, // FIFO eviction limit
  },
} as const;

/**
 * Analysis Context Configuration
 */
export const ANALYSIS_CONTEXT_CONFIG = {
  // User roles for perspective-aware analysis
  USER_ROLES: [
    'employer',
    'employee', 
    'client',
    'contractor',
    'landlord',
    'tenant',
    'partner',
    'both_views',
  ] as const,

  // Default analysis context (employee perspective, English)
  DEFAULT: {
    contractLanguage: 'en',
    userPreferredLanguage: 'en',
    analyzedInLanguage: 'en',  // Default: no translation
    userRole: 'employee' as const,
  },
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  DEFAULT_THEME: 'dark',
  DEFAULT_THEME_STORAGE_KEY: 'contract-whisperer-theme',
} as const;

/**
 * Main Application Configuration
 */
export const APPLICATION_CONFIG = {
  LANGUAGE: LANGUAGE_CONFIG,
  AI: AI_CONFIG,
  ANALYSIS_CONTEXT: ANALYSIS_CONTEXT_CONFIG,
  STORAGE: STORAGE_CONFIG,
  UI: UI_CONFIG,
} as const;

// Export individual configs for backward compatibility
export const DEFAULT_LANGUAGE = LANGUAGE_CONFIG.DEFAULT;
export const LANGUAGES = LANGUAGE_CONFIG.LANGUAGES;
export const RTL_LANGUAGES = LANGUAGE_CONFIG.RTL_LANGUAGES;
export const GEMINI_NANO_SUPPORTED_LANGUAGES = LANGUAGE_CONFIG.GEMINI_NANO_SUPPORTED;
export const SUPPORTED_APP_LANGUAGES = LANGUAGE_CONFIG.SUPPORTED_APP_LANGUAGES;
export const LANGUAGE_TRANSLATION_KEYS = LANGUAGE_CONFIG.TRANSLATION_KEYS;
export const LANGUAGE_INFO = LANGUAGE_CONFIG.LANGUAGE_INFO;
export const DEFAULT_ANALYSIS_CONTEXT = ANALYSIS_CONTEXT_CONFIG.DEFAULT;

/**
 * Get supported languages as Language objects for UI components
 * This replaces the duplicated SUPPORTED_LANGUAGES arrays in other files
 */
export function getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string; flag: string }> {
  return Object.entries(LANGUAGE_INFO).map(([code, info]) => ({
    code,
    name: info.name,
    nativeName: info.nativeName,
    flag: info.flag,
  }));
}

/**
 * Get language name from code (for display purposes)
 * This replaces the duplicated languageNames objects in other files
 */
export function getLanguageName(languageCode: string): string {
  return LANGUAGE_INFO[languageCode as keyof typeof LANGUAGE_INFO]?.name || languageCode.toUpperCase();
}

// Legacy exports for backward compatibility
export const AppConfig = APPLICATION_CONFIG;
export const useMockAI = AI_CONFIG.USE_MOCK_AI;

// Type exports
export type LanguageCode = typeof LANGUAGES[keyof typeof LANGUAGES];
export type RTLanguageCode = typeof RTL_LANGUAGES[number];

