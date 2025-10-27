import { Injectable, inject } from '@angular/core';
import type {
  AIWriter,
  AIRewriter,
  AIWriterCreateOptions,
  AIRewriterCreateOptions,
  AIWriterOptions,
  AIRewriterOptions,
  AICreateMonitor,
  DownloadProgressEvent,
} from '../../models/ai-analysis.model';
import { LoggerService } from '../logger.service';

/**
 * Service for Chrome Built-in Writer and Rewriter APIs
 * https://developer.chrome.com/docs/ai/writer-api
 */
@Injectable({
  providedIn: 'root',
})
export class WriterService {
  private writer: AIWriter | null = null;
  private rewriter: AIRewriter | null = null;
  private logger = inject(LoggerService);


  /**
   * Check if Writer API is available (legacy method for backward compatibility)
   */
  async isWriterAvailable(): Promise<boolean> {
    if (!('Writer' in window)) {
      this.logger.warn('Chrome Built-in Writer API not available. Please enable Chrome AI features.');
      return false;
    }
    return true;
  }

  /**
   * Check if Rewriter API is available
   */
  async isRewriterAvailable(): Promise<boolean> {
    if (!('Rewriter' in window)) {
      this.logger.warn('Chrome Built-in Rewriter API not available. Please enable Chrome AI features.');
      return false;
    }
    return true;
  }

  /**
   * Write text using Writer API
   */
  async write(prompt: string, options?: AIWriterOptions): Promise<string> {
    this.logger.info('Writing with Writer API...');

    if (!(await this.isWriterAvailable())) {
      throw new Error('Writer API not available');
    }

    const availability = await window.Writer!.availability();

    // Create writer with options
    const createOptions: AIWriterCreateOptions = {
      tone: options?.tone || 'formal',
      length: options?.length || 'medium',
      outputLanguage: options?.outputLanguage || 'en', // Default to English
    };

    // Add monitor for download progress if needed
    if (availability === 'downloadable' || availability === 'downloading') {
      createOptions.monitor = (m: AICreateMonitor) => {
        m.addEventListener('downloadprogress', (e: DownloadProgressEvent) => {
          const percent = (e.loaded * 100).toFixed(1);
          this.logger.info(`📥 Downloading Writer model: ${percent}%`);
        });
      };
    }

    this.logger.info(`Creating Writer session with options:`, createOptions);
    const writer = await window.Writer!.create(createOptions);
    this.writer = writer;

    // Generate the content
    this.logger.info('Sending prompt to Writer API...');
    const result = await writer.write(prompt, { 
      signal: options?.signal,
      outputLanguage: options?.outputLanguage || 'en'
    });

    this.logger.info('Writer API response received');
    return result;
  }

  /**
   * Write text with streaming output
   */
  async writeStreaming(prompt: string, options?: AIWriterOptions): Promise<ReadableStream> {
    this.logger.info('Writing with Writer API (streaming)...');

    if (!(await this.isWriterAvailable())) {
      throw new Error('Writer API not available');
    }

    const availability = await window.Writer!.availability();


    // Create writer with options
    const createOptions: AIWriterCreateOptions = {
      tone: options?.tone || 'formal',
      length: options?.length || 'medium',
      outputLanguage: options?.outputLanguage || 'en', // Default to English
    };

    // Add monitor for download progress if needed
    if (availability === 'downloadable' || availability === 'downloading') {
      createOptions.monitor = (m: AICreateMonitor) => {
        m.addEventListener('downloadprogress', (e: DownloadProgressEvent) => {
          const percent = (e.loaded * 100).toFixed(1);
          this.logger.info(`📥 Downloading Writer model: ${percent}%`);
        });
      };
    }

    const writer = await window.Writer!.create(createOptions);
    this.writer = writer;

    // Generate the content with streaming
    const stream = writer.writeStreaming(prompt, { 
      signal: options?.signal,
      outputLanguage: options?.outputLanguage || 'en'
    });
    return stream;
  }

  /**
   * Rewrite text using Rewriter API
   */
  async rewrite(input: string, options?: AIRewriterOptions): Promise<string> {
    this.logger.info('Rewriting with Rewriter API...');

    if (!(await this.isRewriterAvailable())) {
      throw new Error('Rewriter API not available');
    }

    const availability = await window.Rewriter!.availability();

    // Create rewriter with options
    const createOptions: AIRewriterCreateOptions = {
      tone: options?.tone || 'as-is',
      length: options?.length || 'as-is',
    };

    // Add monitor for download progress if needed
    if (availability === 'downloadable' || availability === 'downloading') {
      createOptions.monitor = (m: AICreateMonitor) => {
        m.addEventListener('downloadprogress', (e: DownloadProgressEvent) => {
          const percent = (e.loaded * 100).toFixed(1);
          this.logger.info(`📥 Downloading Rewriter model: ${percent}%`);
        });
      };
    }

    const rewriter = await window.Rewriter!.create(createOptions);
    this.rewriter = rewriter;

    // Rewrite the content
    const result = await rewriter.rewrite(input, { 
      signal: options?.signal,
      outputLanguage: options?.outputLanguage || 'en'
    });
    return result;
  }

  /**
   * Rewrite clause more clearly
   */
  async rewriteClearly(clauseText: string): Promise<string> {
    return await this.rewrite(clauseText, { tone: 'as-is' });
  }

  /**
   * Suggest fairer terms for a clause
   */
  async suggestFairerTerms(clauseText: string): Promise<string> {
    const prompt = `Rewrite this clause to be more fair and balanced for both parties: ${clauseText}`;
    return await this.write(prompt, { tone: 'formal', length: 'medium' });
  }

  /**
   * Make clause more specific
   */
  async makeMoreSpecific(clauseText: string): Promise<string> {
    const prompt = `Rewrite this clause to be more specific and detailed: ${clauseText}`;
    return await this.write(prompt, { tone: 'formal', length: 'medium' });
  }

  /**
   * Simplify language
   */
  async simplifyLanguage(clauseText: string): Promise<string> {
    return await this.rewrite(clauseText, { tone: 'more-casual', length: 'shorter' });
  }
  
  /**
   * Rewrite with streaming output
   */
  async rewriteStreaming(input: string, options?: AIRewriterOptions): Promise<ReadableStream> {
    this.logger.info('Rewriting with Rewriter API (streaming)...');

    if (!(await this.isRewriterAvailable())) {
      throw new Error('Rewriter API not available');
    }

    const availability = await window.Rewriter!.availability();

    // Create rewriter with options
    const createOptions: AIRewriterCreateOptions = {
      tone: options?.tone || 'as-is',
      length: options?.length || 'as-is',
    };

    // Add monitor for download progress if needed
    if (availability === 'downloadable' || availability === 'downloading') {
      createOptions.monitor = (m: AICreateMonitor) => {
        m.addEventListener('downloadprogress', (e: DownloadProgressEvent) => {
          const percent = (e.loaded * 100).toFixed(1);
          this.logger.info(`📥 Downloading Rewriter model: ${percent}%`);
        });
      };
    }

    const rewriter = await window.Rewriter!.create(createOptions);
    this.rewriter = rewriter;

    // Rewrite the content with streaming
    const stream = rewriter.rewriteStreaming(input, { 
      signal: options?.signal,
      outputLanguage: options?.outputLanguage || 'en'
    });
    return stream;
  }

  /**
   * Clean up resources
   */
  destroyAll(): void {
    if (this.writer) {
      this.writer.destroy();
      this.writer = null;
    }
    if (this.rewriter) {
      this.rewriter.destroy();
      this.rewriter = null;
    }
  }
}
