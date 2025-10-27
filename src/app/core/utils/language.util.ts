/**
 * Language Utility Functions
 * Pure utility functions for language-related operations
 */

import { 
  DEFAULT_LANGUAGE, 
  LANGUAGE_TRANSLATION_KEYS,
  RTL_LANGUAGES,
  GEMINI_NANO_SUPPORTED_LANGUAGES,
  SUPPORTED_APP_LANGUAGES
} from '../config/application.config';
import type { Language } from '../models/language.model';

// ============================================================================
// PURE UTILITY FUNCTIONS (No dependencies - can be used anywhere)
// ============================================================================

/**
 * Check if a language code is RTL (Right-to-Left)
 */
export function isRTL(languageCode: string): boolean {
  return (RTL_LANGUAGES as readonly string[]).includes(languageCode);
}

/**
 * Check if language is supported by Gemini Nano for direct analysis
 */
export function isGeminiNanoSupported(langCode: string): boolean {
  return (GEMINI_NANO_SUPPORTED_LANGUAGES as readonly string[]).includes(langCode);
}

/**
 * Check if language is supported for app UI
 */
export function isAppLanguageSupported(langCode: string): boolean {
  return (SUPPORTED_APP_LANGUAGES as readonly string[]).includes(langCode);
}

/**
 * Get translation key for a language code
 */
export function getLanguageTranslationKey(languageCode: string): string {
  return LANGUAGE_TRANSLATION_KEYS[languageCode as keyof typeof LANGUAGE_TRANSLATION_KEYS] || languageCode.toUpperCase();
}

/**
 * Get the best language for analysis based on Gemini Nano support
 * Returns the target language if supported, otherwise falls back to English
 */
export function getBestAnalysisLanguage(targetLanguage?: string): string {
  if (!targetLanguage) return DEFAULT_LANGUAGE;
  
  // If target language is supported by Gemini Nano, use it
  // Otherwise, fall back to English (which is always supported)
  return isGeminiNanoSupported(targetLanguage) ? targetLanguage : DEFAULT_LANGUAGE;
}

/**
 * Check if a language needs post-translation (not supported by Gemini Nano)
 */
export function needsPostTranslation(targetLanguage?: string): boolean {
  return !isGeminiNanoSupported(targetLanguage || '') && targetLanguage !== DEFAULT_LANGUAGE;
}

/**
 * Get language name from code (for display purposes)
 */
export function getLanguageName(languageCode: string): string {
  const languageNames: Record<string, string> = {
    'en': 'English',
    'fr': 'French',
    'ar': 'Arabic',
    'es': 'Spanish',
    'de': 'German',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ko': 'Korean',
  };
  
  return languageNames[languageCode] || languageCode.toUpperCase();
}

/**
 * Get AI output language (alias for getBestAnalysisLanguage)
 */
export function getAiOutputLanguage(targetLanguage?: string): string {
  return getBestAnalysisLanguage(targetLanguage);
}

// ============================================================================
// INJECTABLE SERVICE: For stateful operations (localStorage, logging)
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { LoggerService } from '../services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class LanguageUtilsService {
  private logger = inject(LoggerService);

  /**
   * Get saved language preference from localStorage
   */
  getSavedLanguagePreference(): string {
    try {
      const saved = localStorage.getItem('preferred-language');
      return saved || DEFAULT_LANGUAGE;
    } catch (error) {
      this.logger.warn('Failed to get saved language preference', error);
      return DEFAULT_LANGUAGE;
    }
  }

  /**
   * Save language preference to localStorage
   */
  saveLanguagePreference(languageCode: string): void {
    try {
      localStorage.setItem('preferred-language', languageCode);
      this.logger.debug('Language preference saved', { languageCode });
    } catch (error) {
      this.logger.warn('Failed to save language preference', error);
    }
  }

  /**
   * Get browser language preference
   */
  getBrowserLanguage(): string {
    try {
      const browserLang = navigator.language.split('-')[0];
      return isAppLanguageSupported(browserLang) ? browserLang : DEFAULT_LANGUAGE;
    } catch (error) {
      this.logger.warn('Failed to get browser language', error);
      return DEFAULT_LANGUAGE;
    }
  }

  /**
   * Get the best language to use (saved preference > browser > default)
   */
  getBestLanguageToUse(): string {
    const saved = this.getSavedLanguagePreference();
    if (saved && isAppLanguageSupported(saved)) {
      return saved;
    }
    
    const browser = this.getBrowserLanguage();
    if (browser && isAppLanguageSupported(browser)) {
      return browser;
    }
    
    return DEFAULT_LANGUAGE;
  }

  /**
   * Save language preference (alias for saveLanguagePreference)
   */
  saveLanguage(languageCode: string): void {
    this.saveLanguagePreference(languageCode);
  }

  /**
   * Get saved language preference (alias for getSavedLanguagePreference)
   */
  getSavedLanguage(): string {
    return this.getSavedLanguagePreference();
  }

  /**
   * Clear saved language preference
   */
  clearLanguage(): void {
    try {
      localStorage.removeItem('preferred-language');
      this.logger.debug('Language preference cleared');
    } catch (error) {
      this.logger.warn('Failed to clear language preference', error);
    }
  }
}