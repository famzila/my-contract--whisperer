import { Injectable, inject, DestroyRef } from '@angular/core';
import type {
  AISummarizer,
  AISummarizerCreateOptions,
  AISummarizerOptions,
} from '../../models/ai-analysis.model';
import { LoggerService } from '../logger.service';
import { getAiOutputLanguage } from '../../utils/language.util';
import { Subject } from 'rxjs';

/**
 * Service for Chrome Built-in Summarizer API
 * Handles text summarization with different types and formats
 * 
 * Reference: https://developer.chrome.com/docs/ai/summarizer-api
 */
@Injectable({
  providedIn: 'root',
})
export class SummarizerService {
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private summarizer: AISummarizer | null = null;
  private currentOutputLanguage: string | null = null;
  private readonly destroy$ = new Subject<void>();
  
  constructor() {
    // Register cleanup callback
    this.destroyRef.onDestroy(() => {
      this.destroy$.next();
      this.destroy$.complete();
      this.destroy();
    });
  }

  /**
   * Check if Summarizer API is available
   * Note: This method only checks if the API exists, it doesn't create any sessions
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple check - just verify the API exists
      if (!window.Summarizer) {
        return false;
      }
      
      // Don't call availability() as it might trigger internal API usage
      // Just return true if the API exists
      return true;
    } catch (error) {
      this.logger.error('Failed to check Summarizer API availability', error);
      return false;
    }
  }

  /**
   * Create a new Summarizer instance (private - only used internally)
   * This will trigger model download if needed (requires user interaction)
   */
  private async createSummarizer(
    options?: AISummarizerCreateOptions
  ): Promise<AISummarizer> {
    if (!window.Summarizer) {
      throw new Error('Summarizer API not available');
    }

    // Prepare options with monitor for download progress
    const createOptions: AISummarizerCreateOptions = {
      outputLanguage: options?.outputLanguage || 'en', // Explicit default to avoid warnings
      ...options,
      monitor: (m) => {
        // Track download progress only on first download (not on cached loads)
        m.addEventListener('downloadprogress', (e) => {
          const percent = (e.loaded * 100).toFixed(1);
          // Only log significant progress milestones to avoid log spam
          if (e.loaded === 0 || e.loaded === 1 || e.loaded % 0.25 === 0) {
            this.logger.info(`📥 [AI Model] Summarizer loading: ${percent}%`);
          }
        });
      },
    };

    this.logger.info(`🔍 [Summarizer] createSummarizer called with options:`, createOptions);

    this.logger.info('Creating Summarizer session...');
    this.summarizer = await window.Summarizer.create(createOptions);
    this.logger.info('Summarizer session created successfully');
    
    return this.summarizer;
  }

  /**
   * Summarize text (private - only used internally)
   * Assumes summarizer is already created with correct language
   */
  private async summarize(
    text: string,
    options?: AISummarizerOptions
  ): Promise<string> {
    if (!this.summarizer) {
      throw new Error('Summarizer not initialized. This should never happen.');
    }

    return await this.summarizer.summarize(text, options);
  }

  /**
   * Generate executive summary (short TL;DR format)
   * 
   * This method generates a concise summary using the Summarizer API with tldr type.
   * The output language is automatically determined:
   * - If outputLanguage is supported by Gemini Nano (en, es, ja), uses it directly
   * - Otherwise, falls back to English
   * 
   * The method maintains a summarizer instance per language to avoid unnecessary recreation.
   * 
   * @param text - The text to summarize (contract content)
   * @param outputLanguage - Desired output language (optional, will use getAiOutputLanguage fallback)
   * @returns Promise<string> - Summary in plain text format (1 sentence for short length)
   */
  async generateExecutiveSummary(text: string, outputLanguage?: string): Promise<string> {
    const language = getAiOutputLanguage(outputLanguage);
    
    this.logger.info(`🔍 [Summarizer] generateExecutiveSummary called with outputLanguage: ${outputLanguage}, resolved to: ${language}`);
    
    // Always create a fresh summarizer with the correct output language
    // This ensures the output language is properly set for each request
    if (!this.summarizer || this.currentOutputLanguage !== language) {
      this.logger.info(`🔍 [Summarizer] Creating new summarizer with outputLanguage: ${language}`);
      await this.createSummarizer({ outputLanguage: language });
      this.currentOutputLanguage = language;
    } else {
      this.logger.info(`🔍 [Summarizer] Reusing existing summarizer with language: ${this.currentOutputLanguage}`);
    }
    
    return await this.summarize(text, {
      type: 'tldr',
      length: 'short',
      format: 'plain-text',
      outputLanguage: this.currentOutputLanguage || language,
    });
  }

  /**
   * Clean up resources and destroy the summarizer instance
   */
  destroy(): void {
    if (this.summarizer) {
      this.summarizer.destroy();
      this.summarizer = null;
      this.currentOutputLanguage = null;
    }
  }
}
