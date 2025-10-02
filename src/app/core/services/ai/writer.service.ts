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
 * Note: These APIs are not yet available in the new Chrome API shape (Chrome Canary 131+)
 * This service returns stubs until the APIs are implemented
 */
@Injectable({
  providedIn: 'root',
})
export class WriterService {
  private writer: AIWriter | null = null;
  private rewriter: AIRewriter | null = null;

  /**
   * Check if Writer API is available
   * Note: Writer API is not yet available in Chrome Canary's new API shape
   */
  async isWriterAvailable(): Promise<boolean> {
    console.warn('⚠️ Writer API not yet available in new Chrome API shape');
    return false;
  }

  /**
   * Check if Rewriter API is available
   * Note: Rewriter API is not yet available in Chrome Canary's new API shape
   */
  async isRewriterAvailable(): Promise<boolean> {
    console.warn('⚠️ Rewriter API not yet available in new Chrome API shape');
    return false;
  }

  /**
   * Write text
   * Note: Not yet available
   */
  async write(input: string, options?: AIWriterOptions): Promise<string> {
    throw new Error('Writer API not yet available in Chrome Canary new API shape');
  }

  /**
   * Rewrite text
   * Note: Not yet available
   */
  async rewrite(input: string, options?: AIRewriterOptions): Promise<string> {
    throw new Error('Rewriter API not yet available in Chrome Canary new API shape');
  }

  /**
   * Rewrite clause more clearly
   */
  async rewriteClearly(clauseText: string): Promise<string> {
    throw new Error('Rewriter API not yet available');
  }

  /**
   * Suggest fairer terms for a clause
   */
  async suggestFairerTerms(clauseText: string): Promise<string> {
    throw new Error('Writer API not yet available');
  }

  /**
   * Make clause more specific
   */
  async makeMoreSpecific(clauseText: string): Promise<string> {
    throw new Error('Rewriter API not yet available');
  }

  /**
   * Simplify language
   */
  async simplifyLanguage(clauseText: string): Promise<string> {
    throw new Error('Rewriter API not yet available');
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
