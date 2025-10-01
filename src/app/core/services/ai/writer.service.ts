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
 * Handles clause rewriting and text generation
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
    if (!window.ai?.writer) {
      return false;
    }

    try {
      const capabilities = await this.getWriterCapabilities();
      return capabilities.available !== 'no';
    } catch {
      return false;
    }
  }

  /**
   * Check if Rewriter API is available
   */
  async isRewriterAvailable(): Promise<boolean> {
    if (!window.ai?.rewriter) {
      return false;
    }

    try {
      const capabilities = await this.getRewriterCapabilities();
      return capabilities.available !== 'no';
    } catch {
      return false;
    }
  }

  /**
   * Get Writer API capabilities
   */
  async getWriterCapabilities(): Promise<AIWriterCapabilities> {
    if (!window.ai?.writer) {
      throw new Error('Writer API not available');
    }

    return await window.ai.writer.capabilities();
  }

  /**
   * Get Rewriter API capabilities
   */
  async getRewriterCapabilities(): Promise<AIWriterCapabilities> {
    if (!window.ai?.rewriter) {
      throw new Error('Rewriter API not available');
    }

    return await window.ai.rewriter.capabilities();
  }

  /**
   * Create a new Writer instance
   */
  async createWriter(options?: AIWriterCreateOptions): Promise<AIWriter> {
    if (!window.ai?.writer) {
      throw new Error('Writer API not available');
    }

    const capabilities = await this.getWriterCapabilities();
    if (capabilities.available === 'no') {
      throw new Error('Writer API not available on this device');
    }

    this.writer = await window.ai.writer.create(options);
    return this.writer;
  }

  /**
   * Create a new Rewriter instance
   */
  async createRewriter(options?: AIRewriterCreateOptions): Promise<AIRewriter> {
    if (!window.ai?.rewriter) {
      throw new Error('Rewriter API not available');
    }

    const capabilities = await this.getRewriterCapabilities();
    if (capabilities.available === 'no') {
      throw new Error('Rewriter API not available on this device');
    }

    this.rewriter = await window.ai.rewriter.create(options);
    return this.rewriter;
  }

  /**
   * Write text
   */
  async write(input: string, options?: AIWriterOptions): Promise<string> {
    if (!this.writer) {
      await this.createWriter();
    }

    if (!this.writer) {
      throw new Error('Failed to create Writer');
    }

    return await this.writer.write(input, options);
  }

  /**
   * Rewrite text
   */
  async rewrite(input: string, options?: AIRewriterOptions): Promise<string> {
    if (!this.rewriter) {
      await this.createRewriter();
    }

    if (!this.rewriter) {
      throw new Error('Failed to create Rewriter');
    }

    return await this.rewriter.rewrite(input, options);
  }

  /**
   * Rewrite clause more clearly
   */
  async rewriteClearly(clauseText: string): Promise<string> {
    return await this.rewrite(clauseText, {
      tone: 'neutral',
      length: 'medium',
    });
  }

  /**
   * Suggest fairer terms for a clause
   */
  async suggestFairerTerms(clauseText: string): Promise<string> {
    return await this.write(
      `Suggest fairer, more balanced terms for this contract clause: ${clauseText}`,
      {
        tone: 'formal',
        length: 'medium',
      }
    );
  }

  /**
   * Make clause more specific
   */
  async makeMoreSpecific(clauseText: string): Promise<string> {
    return await this.rewrite(clauseText, {
      tone: 'formal',
      length: 'long',
    });
  }

  /**
   * Simplify clause language
   */
  async simplifyLanguage(clauseText: string): Promise<string> {
    return await this.rewrite(clauseText, {
      tone: 'casual',
      length: 'short',
    });
  }

  /**
   * Generate alternative clause
   */
  async generateAlternative(
    clauseText: string,
    context: string
  ): Promise<string> {
    return await this.write(
      `Given this context: ${context}\n\nRewrite this clause with better terms: ${clauseText}`,
      {
        sharedContext: context,
        tone: 'formal',
        length: 'medium',
      }
    );
  }

  /**
   * Destroy Writer
   */
  destroyWriter(): void {
    if (this.writer) {
      this.writer.destroy();
      this.writer = null;
    }
  }

  /**
   * Destroy Rewriter
   */
  destroyRewriter(): void {
    if (this.rewriter) {
      this.rewriter.destroy();
      this.rewriter = null;
    }
  }

  /**
   * Destroy all instances
   */
  destroyAll(): void {
    this.destroyWriter();
    this.destroyRewriter();
  }
}

