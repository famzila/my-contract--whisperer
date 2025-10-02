import { Injectable } from '@angular/core';
import type {
  Translator,
  TranslatorCreateOptions,
  AICapabilities,
} from '../../models/ai.types';

/**
 * Service for Chrome Built-in Translator API
 * Handles multi-language translation for contracts
 */
@Injectable({
  providedIn: 'root',
})
export class TranslatorService {
  private translators = new Map<string, Translator>();

  /**
   * Check if Translation API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!window.translation;
  }

  /**
   * Check if translation between two languages is available
   */
  async canTranslate(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<AICapabilities> {
    if (!window.translation) {
      return { available: 'no' };
    }

    return await window.translation.canTranslate(sourceLanguage, targetLanguage);
  }

  /**
   * Create a translator for a language pair
   */
  async createTranslator(
    options: TranslatorCreateOptions
  ): Promise<Translator> {
    if (!window.translation) {
      throw new Error('Translation API not available');
    }

    const key = `${options.sourceLanguage}-${options.targetLanguage}`;
    
    // Check if translator already exists
    if (this.translators.has(key)) {
      return this.translators.get(key)!;
    }

    // Check if translation is possible
    const capabilities = await this.canTranslate(
      options.sourceLanguage,
      options.targetLanguage
    );

    if (capabilities.available === 'no') {
      throw new Error(
        `Translation from ${options.sourceLanguage} to ${options.targetLanguage} is not available`
      );
    }

    // Create and cache translator
    const translator = await window.translation.createTranslator(options);
    this.translators.set(key, translator);
    return translator;
  }

  /**
   * Translate text
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    const translator = await this.createTranslator({
      sourceLanguage,
      targetLanguage,
    });

    return await translator.translate(text);
  }

  /**
   * Translate to English
   */
  async translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
    return await this.translate(text, sourceLanguage, 'en');
  }

  /**
   * Translate from English
   */
  async translateFromEnglish(text: string, targetLanguage: string): Promise<string> {
    return await this.translate(text, 'en', targetLanguage);
  }

  /**
   * Translate contract summary to multiple languages
   */
  async translateSummary(
    summary: string,
    sourceLanguage: string,
    targetLanguages: string[]
  ): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};

    for (const targetLang of targetLanguages) {
      try {
        translations[targetLang] = await this.translate(
          summary,
          sourceLanguage,
          targetLang
        );
      } catch (error) {
        console.error(`Failed to translate to ${targetLang}:`, error);
        translations[targetLang] = summary; // Fallback to original
      }
    }

    return translations;
  }

  /**
   * Detect language (basic implementation)
   */
  detectLanguage(text: string): string {
    // Simple heuristic: check for Arabic, French, or default to English
    const arabicPattern = /[\u0600-\u06FF]/;
    const frenchPattern = /[àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/;

    if (arabicPattern.test(text)) {
      return 'ar';
    } else if (frenchPattern.test(text)) {
      return 'fr';
    }

    return 'en';
  }

  /**
   * Destroy all translators
   */
  destroyAll(): void {
    for (const translator of this.translators.values()) {
      translator.destroy();
    }
    this.translators.clear();
  }

  /**
   * Destroy a specific translator
   */
  destroy(sourceLanguage: string, targetLanguage: string): void {
    const key = `${sourceLanguage}-${targetLanguage}`;
    const translator = this.translators.get(key);
    
    if (translator) {
      translator.destroy();
      this.translators.delete(key);
    }
  }
}



