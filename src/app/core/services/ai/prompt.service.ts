import { Injectable } from '@angular/core';
import type {
  AILanguageModel,
  AILanguageModelCapabilities,
  AILanguageModelCreateOptions,
  AIPromptOptions,
} from '../../models/ai.types';

/**
 * Service for Chrome Built-in Prompt API (Gemini Nano)
 * Handles Q&A, clause extraction, and general language model interactions
 */
@Injectable({
  providedIn: 'root',
})
export class PromptService {
  private session: AILanguageModel | null = null;

  /**
   * Check if Prompt API is available
   */
  async isAvailable(): Promise<boolean> {
    if (!window.ai?.languageModel) {
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
   * Get Prompt API capabilities
   */
  async getCapabilities(): Promise<AILanguageModelCapabilities> {
    if (!window.ai?.languageModel) {
      throw new Error('Prompt API not available');
    }

    return await window.ai.languageModel.capabilities();
  }

  /**
   * Create a new Prompt API session
   */
  async createSession(
    options?: AILanguageModelCreateOptions
  ): Promise<AILanguageModel> {
    if (!window.ai?.languageModel) {
      throw new Error('Prompt API not available');
    }

    const capabilities = await this.getCapabilities();
    if (capabilities.available === 'no') {
      throw new Error('Prompt API not available on this device');
    }

    this.session = await window.ai.languageModel.create(options);
    return this.session;
  }

  /**
   * Send a prompt and get response
   */
  async prompt(input: string, options?: AIPromptOptions): Promise<string> {
    if (!this.session) {
      await this.createSession();
    }

    if (!this.session) {
      throw new Error('Failed to create Prompt API session');
    }

    return await this.session.prompt(input, options);
  }

  /**
   * Send a prompt and get streaming response
   */
  promptStreaming(input: string, options?: AIPromptOptions): ReadableStream {
    if (!this.session) {
      throw new Error('Session not initialized. Call createSession() first.');
    }

    return this.session.promptStreaming(input, options);
  }

  /**
   * Extract clauses from contract text
   */
  async extractClauses(contractText: string): Promise<string> {
    const prompt = `Analyze the following contract and extract key clauses. Identify:
1. Termination clauses
2. Payment obligations
3. Renewal/expiry dates
4. Liability and indemnity
5. Governing law
6. Confidentiality agreements

Format the response as JSON with clause type, content, and risk level (high/medium/low).

Contract:
${contractText}`;

    return await this.prompt(prompt);
  }

  /**
   * Answer questions about a contract
   */
  async askQuestion(
    contractText: string,
    question: string
  ): Promise<string> {
    const prompt = `Given the following contract, answer this question: "${question}"

Provide a clear, concise answer with references to specific clauses if applicable.

Contract:
${contractText}`;

    return await this.prompt(prompt);
  }

  /**
   * Destroy the current session
   */
  destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}

