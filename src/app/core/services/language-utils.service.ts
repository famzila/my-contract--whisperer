/**
 * Language utilities service
 * Handles localStorage operations and language-related utilities
 */
import { Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';
import { DEFAULT_LANGUAGE } from '../constants/languages';
import type { Language } from '../models/language.model';

/**
 * LocalStorage key for language preference
 */
const LANGUAGE_STORAGE_KEY = 'contract-whisperer-language';

@Injectable({
  providedIn: 'root'
})
export class LanguageUtilsService {
  private logger = inject(LoggerService);

  /**
   * Get saved language from localStorage
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
   */
  isLanguageSupported(languageCode: string, supportedLanguages: Language[]): boolean {
    return supportedLanguages.some(lang => lang.code === languageCode);
  }
}
