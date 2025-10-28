import { Injectable, inject, DestroyRef } from '@angular/core';
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
import { Subject } from 'rxjs';
import { APPLICATION_CONFIG } from '../../config/application.config';

/**
 * Service for Chrome Built-in Writer and Rewriter APIs
 * https://developer.chrome.com/docs/ai/writer-api
 */
@Injectable({
  providedIn: 'root',
})
export class WriterService {
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private writer: AIWriter | null = null;
  private rewriter: AIRewriter | null = null;
  private readonly destroy$ = new Subject<void>();
  
  constructor() {
    // Register cleanup callback
    this.destroyRef.onDestroy(() => {
      this.destroy$.next();
      this.destroy$.complete();
      this.destroyAll();
    });
  }


  /**
   * Check if Writer API is available (legacy method for backward compatibility)
   */
  async isWriterAvailable(): Promise<boolean> {
    try {
      if (!window.Writer) {
        this.logger.warn('Chrome Built-in Writer API not available. Please enable Chrome AI features.');
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to check Writer API availability', error);
      return false;
    }
  }

  /**
   * Check if Rewriter API is available
   */
  isRewriterAvailable():boolean {
    try {
      if (!window.Rewriter) {
        this.logger.warn('Chrome Built-in Rewriter API not available. Please enable Chrome AI features.');
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to check Rewriter API availability', error);
      return false;
    }
  }

  /**
   * Write text using Writer API
   */
  async write(prompt: string, options?: AIWriterOptions): Promise<string> {
    // Input validation
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }
    
    if (prompt.length > 5000) {
      this.logger.warn(`Prompt length (${prompt.length}) exceeds recommended limit of 5000 characters`);
    }

    this.logger.info('Writing with Writer API...');

    if (!this.isWriterAvailable()) {
      throw new Error('Writer API not available');
    }

    const availability = await window.Writer!.availability();

    // Create writer with options
    const createOptions: AIWriterCreateOptions = {
      tone: options?.tone || APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_TONE,
      length: options?.length || APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_LENGTH,
      outputLanguage: options?.outputLanguage || APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_OUTPUT_LANGUAGE, // Default to English
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
      outputLanguage: options?.outputLanguage || APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_OUTPUT_LANGUAGE
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
      tone: options?.tone || APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_TONE,
      length: options?.length || APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_LENGTH,
      outputLanguage: options?.outputLanguage || APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_OUTPUT_LANGUAGE, // Default to English
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
      outputLanguage: options?.outputLanguage || APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_OUTPUT_LANGUAGE
    });
    return stream;
  }

  /**
   * Rewrite text using Rewriter API
   */
  async rewrite(input: string, options?: AIRewriterOptions): Promise<string> {
    // Input validation
    if (!input || input.trim().length === 0) {
      throw new Error('Input text cannot be empty');
    }
    
    if (input.length > 5000) {
      this.logger.warn(`Input length (${input.length}) exceeds recommended limit of 5000 characters`);
    }

    this.logger.info('Rewriting with Rewriter API...');

    if (!(await this.isRewriterAvailable())) {
      throw new Error('Rewriter API not available');
    }

    const availability = await window.Rewriter!.availability();

    // Create rewriter with options
    const createOptions: AIRewriterCreateOptions = {
      tone: options?.tone || APPLICATION_CONFIG.AI.REWRITER_DEFAULT_PARAMS.DEFAULT_TONE,
      length: options?.length || APPLICATION_CONFIG.AI.REWRITER_DEFAULT_PARAMS.DEFAULT_LENGTH,
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
      outputLanguage: options?.outputLanguage || APPLICATION_CONFIG.AI.REWRITER_DEFAULT_PARAMS.DEFAULT_OUTPUT_LANGUAGE
    });
    return result;
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
