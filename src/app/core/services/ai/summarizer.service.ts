import { Injectable } from '@angular/core';
import type {
  AISummarizer,
  AISummarizerCapabilities,
  AISummarizerCreateOptions,
  AISummarizerOptions,
} from '../../models/ai.types';

/**
 * Service for Chrome Built-in Summarizer API
 * Handles contract summarization in different formats and lengths
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
    if (!window.ai?.summarizer) {
      return false;
    }

    try {
      const capabilities = await this.getCapabilities();
      return capabilities.available !== 'no';
    } catch {
      return false;
    }
  }

  /**
   * Get Summarizer API capabilities
   */
  async getCapabilities(): Promise<AISummarizerCapabilities> {
    if (!window.ai?.summarizer) {
      throw new Error('Summarizer API not available');
    }

    return await window.ai.summarizer.capabilities();
  }

  /**
   * Create a new Summarizer instance
   */
  async createSummarizer(
    options?: AISummarizerCreateOptions
  ): Promise<AISummarizer> {
    if (!window.ai?.summarizer) {
      throw new Error('Summarizer API not available');
    }

    const capabilities = await this.getCapabilities();
    if (capabilities.available === 'no') {
      throw new Error('Summarizer API not available on this device');
    }

    this.summarizer = await window.ai.summarizer.create(options);
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
   * Summarize text with streaming response
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
  async generateExecutiveSummary(contractText: string): Promise<string> {
    return await this.summarize(contractText, {
      type: 'key-points',
      length: 'short',
      format: 'markdown',
    });
  }

  /**
   * Generate detailed summary
   */
  async generateDetailedSummary(contractText: string): Promise<string> {
    return await this.summarize(contractText, {
      type: 'tl;dr',
      length: 'medium',
      format: 'markdown',
    });
  }

  /**
   * Generate ELI5 (Explain Like I'm 5) summary
   */
  async generateELI5Summary(contractText: string): Promise<string> {
    // Use shorter length for simpler explanation
    return await this.summarize(contractText, {
      type: 'tl;dr',
      length: 'short',
      format: 'plain-text',
    });
  }

  /**
   * Destroy the current summarizer
   */
  destroy(): void {
    if (this.summarizer) {
      this.summarizer.destroy();
      this.summarizer = null;
    }
  }
}

