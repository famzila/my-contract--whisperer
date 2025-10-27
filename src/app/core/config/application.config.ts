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

  /**
   * Retry configuration for section extraction
   */
  RETRY: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
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
 * Main Application Configuration
 */
export const APPLICATION_CONFIG = {
  LANGUAGE: LANGUAGE_CONFIG,
  AI: AI_CONFIG,
  ANALYSIS_CONTEXT: ANALYSIS_CONTEXT_CONFIG,
} as const;

// Export individual configs for backward compatibility
export const DEFAULT_LANGUAGE = LANGUAGE_CONFIG.DEFAULT;
export const LANGUAGES = LANGUAGE_CONFIG.LANGUAGES;
export const RTL_LANGUAGES = LANGUAGE_CONFIG.RTL_LANGUAGES;
export const GEMINI_NANO_SUPPORTED_LANGUAGES = LANGUAGE_CONFIG.GEMINI_NANO_SUPPORTED;
export const SUPPORTED_APP_LANGUAGES = LANGUAGE_CONFIG.SUPPORTED_APP_LANGUAGES;
export const LANGUAGE_TRANSLATION_KEYS = LANGUAGE_CONFIG.TRANSLATION_KEYS;
export const DEFAULT_ANALYSIS_CONTEXT = ANALYSIS_CONTEXT_CONFIG.DEFAULT;

// Legacy exports for backward compatibility
export const AppConfig = APPLICATION_CONFIG;
export const useMockAI = AI_CONFIG.USE_MOCK_AI;

// Type exports
export type LanguageCode = typeof LANGUAGES[keyof typeof LANGUAGES];
export type RTLanguageCode = typeof RTL_LANGUAGES[number];

