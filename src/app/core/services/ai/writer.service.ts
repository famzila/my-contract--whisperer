import { Injectable } from '@angular/core';
import type {
  AIWriter,
  AIRewriter,
  AIWriterCapabilities,
  AIWriterCreateOptions,
  AIRewriterCreateOptions,
  AIWriterOptions,
  AIRewriterOptions,
} from '../../models/ai.types';

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

  /**
   * Check if Writer API is available
   */
  async isWriterAvailable(): Promise<boolean> {
    if (!('Writer' in window)) {
      console.warn('❌ Writer API not found in window');
      return false;
    }

    try {
      const availability = await (window as any).Writer.availability();
      console.log('📝 Writer API availability:', availability);
      return availability === 'available' || availability === 'downloadable' || availability === 'after-download';
    } catch (error) {
      console.error('❌ Error checking Writer API availability:', error);
      return false;
    }
  }

  /**
   * Check if Rewriter API is available
   */
  async isRewriterAvailable(): Promise<boolean> {
    if (!('Rewriter' in window)) {
      console.warn('❌ Rewriter API not found in window');
      return false;
    }

    try {
      const availability = await (window as any).Rewriter.availability();
      console.log('🔄 Rewriter API availability:', availability);
      return availability === 'available' || availability === 'downloadable' || availability === 'after-download';
    } catch (error) {
      console.error('❌ Error checking Rewriter API availability:', error);
      return false;
    }
  }

  /**
   * Write text using Writer API
   */
  async write(prompt: string, options?: AIWriterOptions): Promise<string> {
    console.log('✍️ Writing with Writer API...');

    const availability = await (window as any).Writer.availability();

    if (availability === 'no') {
      throw new Error('Writer API is not available');
    }

    // Create writer with options
    const createOptions: any = {
      tone: options?.tone || 'formal',
      format: 'plain-text',
      length: options?.length || 'medium',
      sharedContext: options?.sharedContext,
    };

    // Add monitor for download progress if needed
    if (availability === 'downloadable' || availability === 'after-download') {
      createOptions.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          const percent = (e.loaded * 100).toFixed(1);
          console.log(`📥 Downloading Writer model: ${percent}%`);
        });
      };
    }

    console.log('🚀 Creating Writer session with options:', createOptions);
    const writer = await (window as any).Writer.create(createOptions);
    this.writer = writer;

    // Generate the content
    console.log('📤 Sending prompt to Writer API...');
    const result = await writer.write(prompt, { signal: options?.signal });

    console.log('✅ Writer API response received');
    return result;
  }

  /**
   * Write text with streaming output
   */
  async writeStreaming(prompt: string, options?: AIWriterOptions): Promise<ReadableStream> {
    console.log('✍️ Writing with Writer API (streaming)...');

    const availability = await (window as any).Writer.availability();

    if (availability === 'no') {
      throw new Error('Writer API is not available');
    }

    // Create writer with options
    const createOptions: any = {
      tone: options?.tone || 'formal',
      format: 'plain-text',
      length: options?.length || 'medium',
      sharedContext: options?.sharedContext,
    };

    // Add monitor for download progress if needed
    if (availability === 'downloadable' || availability === 'after-download') {
      createOptions.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          const percent = (e.loaded * 100).toFixed(1);
          console.log(`📥 Downloading Writer model: ${percent}%`);
        });
      };
    }

    const writer = await (window as any).Writer.create(createOptions);
    this.writer = writer;

    // Generate the content with streaming
    const stream = writer.writeStreaming(prompt, { signal: options?.signal });
    return stream;
  }

  /**
   * Rewrite text using Rewriter API
   */
  async rewrite(input: string, options?: AIRewriterOptions): Promise<string> {
    console.log('🔄 Rewriting with Rewriter API...');

    const availability = await (window as any).Rewriter.availability();

    if (availability === 'no') {
      throw new Error('Rewriter API is not available');
    }

    // Create rewriter with options
    const createOptions: any = {
      tone: options?.tone || 'formal',
      length: options?.length || 'as-is',
    };

    // Add monitor for download progress if needed
    if (availability === 'downloadable' || availability === 'after-download') {
      createOptions.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          const percent = (e.loaded * 100).toFixed(1);
          console.log(`📥 Downloading Rewriter model: ${percent}%`);
        });
      };
    }

    const rewriter = await (window as any).Rewriter.create(createOptions);
    this.rewriter = rewriter;

    // Rewrite the content
    const result = await rewriter.rewrite(input, { signal: options?.signal });
    return result;
  }

  /**
   * Rewrite clause more clearly
   */
  async rewriteClearly(clauseText: string): Promise<string> {
    return await this.rewrite(clauseText, { tone: 'neutral', length: 'as-is' });
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
    return await this.rewrite(clauseText, { tone: 'casual', length: 'shorter' });
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
