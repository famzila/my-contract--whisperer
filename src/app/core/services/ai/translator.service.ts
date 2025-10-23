import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
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
  private translateService = inject(TranslateService);

  /**
   * Check if Translation API is available
   * Per official docs: https://developer.chrome.com/docs/ai/translator-api
   */
  async isAvailable(): Promise<boolean> {
    return 'Translator' in window;
  }

  /**
   * Check if translation between two languages is available
   * NOTE: This is for UI display only. Do NOT use to block translation attempts.
   * Returns best-effort status; may not be accurate for all language pairs.
   */
  async canTranslate(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<AICapabilities> {
    // This is a best-effort check for UI purposes only
    // Do not rely on this to block translation attempts
    
    if (!window.Translator) {
      return { available: 'no' };
    }
    
    try {
      // Try to check availability if the method exists
      // Note: The availability() method may return inconsistent results
      if (window.Translator.availability && typeof window.Translator.availability === 'function') {
        const capabilities = await window.Translator.availability({
          sourceLanguage,
          targetLanguage,
        });
        return {
          available: capabilities?.available || 'readily'
        };
      }
      
      // Fallback: optimistically assume readily available
      return { available: 'readily' };
    } catch (error) {
      console.warn('canTranslate check failed, assuming readily available:', error);
      // Optimistically return 'readily' to allow translation attempts
      return { available: 'readily' };
    }
  }

  /**
   * Create a translator for a language pair
   * Uses Translator.create() per official docs
   * Handles user gesture requirement for downloading language packs
   */
  async createTranslator(
    options: TranslatorCreateOptions
  ): Promise<Translator> {
    if (!window.Translator) {
      throw new Error(this.translateService.instant('errors.translatorApiUnavailable'));
    }

    const key = `${options.sourceLanguage}-${options.targetLanguage}`;
    
    // Check if translator already exists
    if (this.translators.has(key)) {
      return this.translators.get(key)!;
    }

    try {
      // First attempt with 10-second timeout
      return await this.createTranslatorWithTimeout(options, 10000);
    } catch (firstError) {
      console.warn(`⚠️ [Translator] First attempt failed:`, firstError);
      
      // Check if it's a user gesture error - these often resolve on retry
      if (firstError instanceof Error && firstError.message.includes('user gesture')) {
        console.log(`🔄 [Translator] User gesture error detected, retrying...`);
      }
      
      // Automatic retry once
      try {
        console.log(`🔄 [Translator] Retrying translation creation...`);
        return await this.createTranslatorWithTimeout(options, 10000);
      } catch (retryError) {
        console.error(`❌ [Translator] Retry failed:`, retryError);
        
        // If it's still a user gesture error, check if we have an existing translator
        if (retryError instanceof Error && retryError.message.includes('user gesture')) {
          const key = `${options.sourceLanguage}-${options.targetLanguage}`;
          const existingTranslator = this.translators.get(key);
          if (existingTranslator) {
            console.log(`🔄 [Translator] Using existing translator despite user gesture error`);
            return existingTranslator;
          }
          
          throw new Error(
            `Language pack download requires user interaction. ` +
            `Please try switching languages again to trigger the download.`
          );
        }
        
        throw new Error(
          `Failed to download language pack for ${options.sourceLanguage}→${options.targetLanguage}. ` +
          `Please try switching languages again.`
        );
      }
    }
  }

  /**
   * Create translator with timeout wrapper
   */
  private async createTranslatorWithTimeout(
    options: TranslatorCreateOptions,
    timeoutMs: number = 10000
  ): Promise<Translator> {
    const key = `${options.sourceLanguage}-${options.targetLanguage}`;
    
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

    return Promise.race([
      this.createTranslatorInternal(createOptions),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Language pack download timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Internal method to create translator without timeout
   */
  private async createTranslatorInternal(
    options: TranslatorCreateOptions
  ): Promise<Translator> {
    const key = `${options.sourceLanguage}-${options.targetLanguage}`;
    
    try {
      // Create and cache translator
      const translator = await window.Translator!.create(options);
      this.translators.set(key, translator);
      console.log(`✅ [Translator] Created ${options.sourceLanguage}→${options.targetLanguage}`);
      return translator;
    } catch (error) {
      // Handle user gesture requirement error - this is often a temporary issue
      if (error instanceof Error && error.message.includes('user gesture')) {
        console.warn(`⚠️ [Translator] User gesture error during creation, but translator may still work`);
        // Don't throw immediately - the translator might still be created successfully
        // Let the calling code handle this gracefully
        throw new Error(
          `Language pack download requires user interaction. Please try switching languages again.`
        );
      }
      throw error;
    }
  }


  /**
   * Translate text
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      const translator = await this.createTranslator({
        sourceLanguage,
        targetLanguage,
      });

      const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
      console.log(`  🔄 [Translator] Translating: "${preview}" (${sourceLanguage} → ${targetLanguage})`);
      
      const result = await translator.translate(text);
      
      const resultPreview = result.length > 100 ? result.substring(0, 100) + '...' : result;
      console.log(`  ✅ [Translator] Result: "${resultPreview}"`);
      
      // Validate translation: check if result is actually different from source (basic sanity check)
      if (result === text && sourceLanguage !== targetLanguage) {
        console.warn(`⚠️ [Translator] Translation returned identical text! This might indicate a translation failure.`);
        console.warn(`  Source (${sourceLanguage}): "${preview}"`);
        console.warn(`  Result (${targetLanguage}): "${resultPreview}"`);
      }
      
      return result;
    } catch (error) {
      // If it's a user gesture error, try to use existing translator if available
      if (error instanceof Error && error.message.includes('user gesture')) {
        const key = `${sourceLanguage}-${targetLanguage}`;
        const existingTranslator = this.translators.get(key);
        if (existingTranslator) {
          console.log(`🔄 [Translator] Using existing translator despite user gesture error`);
          const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
          console.log(`  🔄 [Translator] Translating: "${preview}" (${sourceLanguage} → ${targetLanguage})`);
          
          const result = await existingTranslator.translate(text);
          
          const resultPreview = result.length > 100 ? result.substring(0, 100) + '...' : result;
          console.log(`  ✅ [Translator] Result: "${resultPreview}"`);
          
          return result;
        }
      }
      throw error;
    }
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



