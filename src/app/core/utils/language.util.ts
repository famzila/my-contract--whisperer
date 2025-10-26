/**
 * Language Utilities
 * Consolidated language-related utilities following Angular best practices
 * 
 * Pure functions: No dependencies, can be used anywhere
 * Injectable service: For stateful operations (localStorage, logging)
 */

import { Injectable, inject } from '@angular/core';
import { LoggerService } from '../services/logger.service';
import { DEFAULT_LANGUAGE, isGeminiNanoSupported, isAppLanguageSupported } from '../constants/languages';
import type { Language } from '../models/language.model';

// ============================================================================
// PURE UTILITY FUNCTIONS (No dependencies - can be used anywhere)
// ============================================================================

/**
 * Language name mapping for all supported languages
 */
export const LANGUAGE_NAMES: Record<string, Language> = {
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
export function getLanguageInfo(languageCode: string): Language | null {
  return LANGUAGE_NAMES[languageCode] || null;
}

/**
 * Check if a language is supported by Gemini Nano for direct analysis
 * @param languageCode - The language code to check
 * @returns True if supported by Gemini Nano
 */
export function canAnalyzeLanguage(languageCode: string): boolean {
  return isGeminiNanoSupported(languageCode);
}

/**
 * Check if a language is supported for app UI (i18n translations available)
 * @param languageCode - The language code to check
 * @returns True if supported for app UI
 */
export function canDisplayLanguage(languageCode: string): boolean {
  return isAppLanguageSupported(languageCode);
}

/**
 * Get the appropriate output language for AI analysis
 * Uses same logic as ContractAnalysisService for consistency
 * @param targetLanguage - The desired output language
 * @returns The language to use for AI output (supported by Gemini Nano or fallback to 'en')
 */
export function getAiOutputLanguage(targetLanguage?: string): string {
  if (!targetLanguage) return DEFAULT_LANGUAGE;
  
  // If target language is supported by Gemini Nano, use it
  // Otherwise fallback to English (same as contract analysis logic)
  return isGeminiNanoSupported(targetLanguage) ? targetLanguage : DEFAULT_LANGUAGE;
}

/**
 * Determine if post-translation is needed for AI results
 * @param targetLanguage - The desired output language
 * @returns True if results need to be post-translated
 */
export function needsPostTranslation(targetLanguage?: string): boolean {
  if (!targetLanguage) return false;
  return !isGeminiNanoSupported(targetLanguage) && targetLanguage !== DEFAULT_LANGUAGE;
}

// ============================================================================
// INJECTABLE SERVICE (For stateful operations)
// ============================================================================

/**
 * LocalStorage key for language preference
 */
const LANGUAGE_STORAGE_KEY = 'contract-whisperer-language';

/**
 * Language utilities service for stateful operations
 * Handles localStorage operations and language-related utilities that require dependency injection
 */
@Injectable({
  providedIn: 'root'
})
export class LanguageUtilsService {
  private logger = inject(LoggerService);

  /**
   * Get saved language from localStorage
   * @returns The saved language code or default language
   */
  getSavedLanguage(): string {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return saved || DEFAULT_LANGUAGE;
    } catch (error) {
      this.logger.warn('Failed to get saved language from localStorage:', error);
      return DEFAULT_LANGUAGE;
    }
  }

  /**
   * Save language to localStorage
   * @param languageCode - The language code to save
   */
  saveLanguage(languageCode: string): void {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
      this.logger.info(`Language preference saved: ${languageCode}`);
    } catch (error) {
      this.logger.warn('Failed to save language preference to localStorage:', error);
    }
  }

  /**
   * Clear language from localStorage
   */
  clearLanguage(): void {
    try {
      localStorage.removeItem(LANGUAGE_STORAGE_KEY);
      this.logger.info('Language preference cleared from localStorage');
    } catch (error) {
      this.logger.warn('Failed to clear language preference from localStorage:', error);
    }
  }

  /**
   * Validate if language code is supported
   * @param languageCode - The language code to validate
   * @param supportedLanguages - Array of supported languages
   * @returns True if the language is supported
   */
  isLanguageSupported(languageCode: string, supportedLanguages: Language[]): boolean {
    return supportedLanguages.some(lang => lang.code === languageCode);
  }

  /**
   * Get language validation info
   * @param languageCode - The language code to validate
   * @returns Object with validation results
   */
  getLanguageValidationInfo(languageCode: string): {
    isValid: boolean;
    canAnalyze: boolean;
    canDisplay: boolean;
    name: string;
    nativeName: string;
  } {
    const languageInfo = getLanguageInfo(languageCode);
    
    return {
      isValid: !!languageInfo,
      canAnalyze: canAnalyzeLanguage(languageCode),
      canDisplay: canDisplayLanguage(languageCode),
      name: getLanguageName(languageCode),
      nativeName: getNativeLanguageName(languageCode),
    };
  }
}
