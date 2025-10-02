import { Injectable } from '@angular/core';
import type {
  AISummarizer,
  AISummarizerCapabilities,
  AISummarizerCreateOptions,
  AISummarizerOptions,
} from '../../models/ai.types';

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
  private summarizer: AISummarizer | null = null;

  /**
   * Check if Summarizer API is available
   */
  async isAvailable(): Promise<boolean> {
    if ('Summarizer' in window && window.Summarizer) {
      try {
        const availability = await window.Summarizer.availability();
        console.log('📝 Summarizer API availability:', availability);
        return availability !== 'unavailable';
      } catch (error) {
        console.error('❌ Error checking Summarizer availability:', error);
        return false;
      }
    }

    console.warn('❌ Summarizer API not found');
    return false;
  }

  /**
   * Create a new Summarizer instance
   * This will trigger model download if needed (requires user interaction)
   */
  async createSummarizer(
    options?: AISummarizerCreateOptions
  ): Promise<AISummarizer> {
    if (!window.Summarizer) {
      throw new Error('Summarizer API not available');
    }

    // Check availability
    const availability = await window.Summarizer.availability();
    
    if (availability === 'unavailable') {
      throw new Error('Summarizer API not available on this device');
    }

    // Prepare options with monitor for download progress
    const createOptions: AISummarizerCreateOptions = {
      outputLanguage: 'en', // Specify English output to avoid warnings
      ...options,
      monitor: (m) => {
        m.addEventListener('downloadprogress', (e) => {
          const percent = (e.loaded * 100).toFixed(1);
          console.log(`📥 Downloading Summarizer model: ${percent}%`);
        });
      },
    };

    // Log download status
    if (availability === 'downloadable') {
      console.log('📥 Summarizer model needs to be downloaded. Starting download...');
      console.log('⏳ This may take a few moments. Download progress will be shown below.');
    }

    console.log('🚀 Creating Summarizer session...');
    this.summarizer = await window.Summarizer.create(createOptions);
    console.log('✅ Summarizer session created successfully');
    
    return this.summarizer;
  }

  /**
   * Summarize text
   */
  async summarize(
    text: string,
    options?: AISummarizerOptions
  ): Promise<string> {
    if (!this.summarizer) {
      await this.createSummarizer();
    }

    if (!this.summarizer) {
      throw new Error('Failed to create Summarizer');
    }

    return await this.summarizer.summarize(text, options);
  }

  /**
   * Summarize text with streaming
   */
  summarizeStreaming(
    text: string,
    options?: AISummarizerOptions
  ): ReadableStream {
    if (!this.summarizer) {
      throw new Error('Summarizer not initialized. Call createSummarizer() first.');
    }

    return this.summarizer.summarizeStreaming(text, options);
  }

  /**
   * Generate executive summary (short, key points)
   */
  async generateExecutiveSummary(text: string): Promise<string> {
    return await this.summarize(text, {
      type: 'key-points',
      length: 'short',
      format: 'markdown',
    });
  }

  /**
   * Generate detailed summary
   */
  async generateDetailedSummary(text: string): Promise<string> {
    return await this.summarize(text, {
      type: 'tl;dr',
      length: 'long',
      format: 'markdown',
    });
  }

  /**
   * Generate ELI5 (Explain Like I'm 5) summary
   */
  async generateELI5Summary(text: string): Promise<string> {
    return await this.summarize(text, {
      type: 'tl;dr',
      length: 'short',
      format: 'plain-text',
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.summarizer) {
      this.summarizer.destroy();
      this.summarizer = null;
    }
  }
}
