import { Injectable, inject, DestroyRef } from '@angular/core';
import { Observable, from, defer, finalize } from 'rxjs';
import { map, catchError, takeUntil } from 'rxjs/operators';
import type {
  AILanguageModel,
  AILanguageModelCreateOptions,
  AIPromptOptions,
  UserRole,
} from '../../models/ai-analysis.model';
import * as Schemas from '../../schemas/analysis-schemas';
import { LoggerService } from '../logger.service';
import { PromptBuilderService } from './prompt-builder.service';
import { Subject } from 'rxjs';
import { APPLICATION_CONFIG } from '../../config/application.config';

/**
 * Service for Chrome Built-in Prompt API (Gemini Nano)
 * Handles Q&A, clause extraction, and general language model interactions
 * 
 * Reference: https://developer.chrome.com/docs/ai/prompt-api
 */
@Injectable({
  providedIn: 'root',
})
export class PromptService {
  private session: AILanguageModel | null = null;
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private promptBuilder = inject(PromptBuilderService);
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
   * Check if Prompt API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!window.LanguageModel) {
        this.logger.warn('Chrome Built-in AI not available. Please enable Chrome AI features.');
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to check Prompt API availability', error);
      return false;
    }
  }

  /**
   * Get Prompt API parameters
   */
  async getParams(): Promise<{
    defaultTemperature: number;
    maxTemperature: number;
    defaultTopK: number;
    maxTopK: number;
  }> {
    if ('LanguageModel' in window && window.LanguageModel) {
      return await window.LanguageModel.params();
    }

    // Fallback defaults if API not available
    return {
      defaultTemperature: APPLICATION_CONFIG.AI.LANGUAGE_MODEL_PARAMS.DEFAULT_TEMPERATURE,
        maxTemperature: APPLICATION_CONFIG.AI.LANGUAGE_MODEL_PARAMS.MAX_TEMPERATURE,
        defaultTopK: APPLICATION_CONFIG.AI.LANGUAGE_MODEL_PARAMS.DEFAULT_TOP_K,
        maxTopK: APPLICATION_CONFIG.AI.LANGUAGE_MODEL_PARAMS.MAX_TOP_K,
    };
  }

  /**
   * Create a new Prompt API session with optional perspective and language settings
   * This will trigger model download if needed (requires user interaction)
   */
  async createSession(
    options?: AILanguageModelCreateOptions & { 
      userRole?: UserRole;
      contractLanguage?: string;
      outputLanguage?: string;
    }
  ): Promise<AILanguageModel> {
    if (!window.LanguageModel) {
      throw new Error('LanguageModel API not available');
    }

    // Get perspective-aware prompt if userRole is provided
    const perspectivePrompt = options?.userRole ? this.promptBuilder.buildPerspectivePrompt(options.userRole) : '';

    // Build expectedInputs and expectedOutputs arrays for official API
    // Language handling is done via expectedInputs/expectedOutputs (official Chrome AI API)
    const inputLanguages: string[] = ['en']; // System prompt is always in English
    if (options?.contractLanguage && options.contractLanguage !== 'en') {
      inputLanguages.push(options.contractLanguage); // Add contract language for user prompts
    }

    const outputLanguages: string[] = [options?.outputLanguage || options?.contractLanguage || 'en'];

    // Prepare options with system prompt and monitor for download progress
    const createOptions: AILanguageModelCreateOptions = {
      ...options,
      // Official Chrome AI API language specification
      expectedInputs: [
        {
          type: 'text',
          languages: inputLanguages
        }
      ],
      expectedOutputs: [
        {
          type: 'text',
          languages: outputLanguages
        }
      ],
      initialPrompts: options?.initialPrompts || [
        {
          role: 'system',
          content: this.promptBuilder.buildBaseSystemPrompt(perspectivePrompt),
        },
      ],
      monitor: (m) => {
        // Track download progress only on first download (not on cached loads)
        m.addEventListener('downloadprogress', (e) => {
          const percent = (e.loaded * 100).toFixed(1);
          // Only log significant progress milestones to avoid log spam
          if (e.loaded === 0 || e.loaded === 1 || e.loaded % 0.25 === 0) {
            this.logger.info(`📥 [AI Model] Loading: ${percent}%`);
          }
        });
      },
    };

    const langInfo = outputLanguages[0] !== 'en' ? ` (input: [${inputLanguages.join(', ')}], output: [${outputLanguages.join(', ')}])` : '';
    this.logger.info(`Creating session${options?.userRole ? ` for ${options.userRole} perspective` : ''}${langInfo}...`);
    this.session = await window.LanguageModel.create(createOptions);
    this.logger.info('Session ready');
    
    return this.session;
  }

  /**
   * Send a prompt and get response
   */
  async prompt(input: string, options?: AIPromptOptions): Promise<string> {
    // Input validation
    if (!input || input.trim().length === 0) {
      throw new Error('Prompt input cannot be empty');
    }
    
    if (input.length > 10000) {
      this.logger.warn(`Prompt length (${input.length}) exceeds recommended limit of 10000 characters`);
    }

    if (!this.session) {
      await this.createSession();
    }

    if (!this.session) {
      throw new Error('Failed to create session');
    }

    return await this.session.prompt(input, options);
  }


  /**
   * Ask a question about the contract
   */
  async askQuestion(contractText: string, question: string): Promise<string> {
    const prompt = this.promptBuilder.buildQuestionPrompt(contractText, question);
    return await this.prompt(prompt);
  }

  // ============================================================================
  // NEW: Schema-based extraction methods
  // ============================================================================

  /**
   * Generic method to prompt with schema constraint
   * Uses responseConstraint for structured output
   */
  private async promptWithSchema<T>(
    prompt: string,
    schema: object
  ): Promise<T> {
    if (!this.session) {
      throw new Error('Session not initialized. Call createSession() first.');
    }

    const resultString = await this.session.prompt(prompt, {
      responseConstraint: schema,
    });

    const parsed = JSON.parse(resultString);
    return parsed as T;
  }

  /**
   * 1. Extract metadata with schema
   */
  async extractMetadata(
    contractText: string,
    userRole?: string,
    outputLanguage?: string
  ): Promise<Schemas.ContractMetadata> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'metadata', userRole, outputLanguage);

    return this.promptWithSchema<Schemas.ContractMetadata>(
      prompt,
      Schemas.METADATA_SCHEMA
    );
  }

  /**
   * 2. Extract risks with schema
   */
  async extractRisks(
    contractText: string,
    outputLanguage?: string
  ): Promise<Schemas.RisksAnalysis> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'risks', undefined, outputLanguage);

    return this.promptWithSchema<Schemas.RisksAnalysis>(
      prompt,
      Schemas.RISKS_SCHEMA
    );
  }

  /**
   * 3. Extract obligations with schema
   */
  async extractObligations(
    contractText: string,
    outputLanguage?: string
  ): Promise<Schemas.ObligationsAnalysis> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'obligations', undefined, outputLanguage);

    return this.promptWithSchema<Schemas.ObligationsAnalysis>(
      prompt,
      Schemas.OBLIGATIONS_SCHEMA
    );
  }

  /**
   * 4. Extract omissions and questions with schema
   */
  async extractOmissionsAndQuestions(
    contractText: string,
    outputLanguage?: string
  ): Promise<Schemas.OmissionsAndQuestions> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'omissions', undefined, outputLanguage);

    return this.promptWithSchema<Schemas.OmissionsAndQuestions>(
      prompt,
      Schemas.OMISSIONS_QUESTIONS_SCHEMA
    );
  }

  /**
   * 5. Extract summary with schema
   */
  async extractSummary(
    contractText: string,
    outputLanguage?: string
  ): Promise<Schemas.ContractSummary> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'summary', undefined, outputLanguage);

    return this.promptWithSchema<Schemas.ContractSummary>(
      prompt,
      Schemas.SUMMARY_SCHEMA
    );
  }

  /**
   * ========================================
   * RxJS Observable versions for streaming
   * ========================================
   */

  /**
   * Extract metadata as Observable
   */
  extractMetadata$(
    contractText: string, 
    userRole?: string, 
    outputLanguage?: string
  ): Observable<Schemas.ContractMetadata> {
    return defer(() => from(this.extractMetadata(contractText, userRole, outputLanguage)));
  }

  /**
   * Extract risks as Observable
   */
  extractRisks$(
    contractText: string, 
    outputLanguage?: string
  ): Observable<Schemas.RisksAnalysis> {
    return defer(() => from(this.extractRisks(contractText, outputLanguage)));
  }

  /**
   * Extract obligations as Observable
   */
  extractObligations$(
    contractText: string, 
    outputLanguage?: string
  ): Observable<Schemas.ObligationsAnalysis> {
    return defer(() => from(this.extractObligations(contractText, outputLanguage)));
  }

  /**
   * Extract omissions and questions as Observable
   */
  extractOmissionsAndQuestions$(
    contractText: string, 
    outputLanguage?: string
  ): Observable<Schemas.OmissionsAndQuestions> {
    return defer(() => from(this.extractOmissionsAndQuestions(contractText, outputLanguage)));
  }

  /**
   * Extract summary as Observable
   */
  extractSummary$(
    contractText: string, 
    outputLanguage?: string
  ): Observable<Schemas.ContractSummary> {
    return defer(() => from(this.extractSummary(contractText, outputLanguage)));
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}
