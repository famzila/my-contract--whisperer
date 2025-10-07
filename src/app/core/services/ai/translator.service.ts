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
   * Per official docs: https://developer.chrome.com/docs/ai/translator-api
   */
  async isAvailable(): Promise<boolean> {
    return 'Translator' in window;
  }

  /**
   * Check if translation between two languages is available
   * Uses Translator.availability() per official docs
   */
  async canTranslate(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<AICapabilities> {
    if (!window.Translator) {
      return { available: 'no' };
    }

    return await window.Translator.availability({
      sourceLanguage,
      targetLanguage,
    });
  }

  /**
   * Create a translator for a language pair
   * Uses Translator.create() per official docs
   */
  async createTranslator(
    options: TranslatorCreateOptions
  ): Promise<Translator> {
    if (!window.Translator) {
      throw new Error('Translator API not available');
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

    // Log download status
    if (capabilities.available === 'downloadable') {
      console.log(`📥 [Translator] Language pack ${options.sourceLanguage}→${options.targetLanguage} needs download...`);
    }

    // Create translator with monitor for download progress
    const createOptions: TranslatorCreateOptions = {
      ...options,
      monitor: (m) => {
        m.addEventListener('downloadprogress', (e) => {
          const percent = (e.loaded * 100).toFixed(1);
          // Only log significant progress milestones
          if (e.loaded === 0 || e.loaded === 1 || e.loaded % 0.25 === 0) {
            console.log(`📥 [Translator] Loading ${options.sourceLanguage}→${options.targetLanguage}: ${percent}%`);
          }
        });
      },
    };

    // Create and cache translator
    const translator = await window.Translator.create(createOptions);
    this.translators.set(key, translator);
    console.log(`✅ [Translator] Created ${options.sourceLanguage}→${options.targetLanguage}`);
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

    const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
    console.log(`  🔄 [Translator] Translating: "${preview}" (${sourceLanguage} → ${targetLanguage})`);
    
    const result = await translator.translate(text);
    
    const resultPreview = result.length > 100 ? result.substring(0, 100) + '...' : result;
    console.log(`  ✅ [Translator] Result: "${resultPreview}"`);
    
    return result;
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



