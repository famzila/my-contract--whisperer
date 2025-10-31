import { Injectable, inject, DestroyRef, signal } from '@angular/core';
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
import { APPLICATION_CONFIG, CANONICAL_ANALYSIS_LANGUAGE } from '../../config/application.config';

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
  
  // Download state tracking
  readonly modelDownloadProgress = signal<number | null>(null);
  readonly isDownloadingModel = signal<boolean>(false);
  readonly shouldShowDownloadNotice = signal<boolean>(false);
  
  private downloadStartTime: number | null = null;
  private showNoticeTimeoutId: ReturnType<typeof setTimeout> | null = null;
  
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

    // English-first strategy: always produce English outputs
    const outputLanguages: string[] = [CANONICAL_ANALYSIS_LANGUAGE];

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
        // IMPORTANT: Log when monitor is called to verify it's being invoked
        this.logger.info(`📥 [AI Model] Monitor callback invoked - setting up downloadprogress listener`);
        this.logger.info(`📥 [AI Model] Monitor object received:`, m);
        
        // Track that monitor was called - this means download is happening or about to happen
        const monitorInvokedAt = Date.now();
        
        // Track download progress only on first download (not on cached loads)
        m.addEventListener('downloadprogress', (e) => {
          const percent = Math.round(e.loaded * 100);
          // log the download progress
          this.logger.info(`📥 [AI Model] Download progress event fired: ${percent}% (loaded: ${e.loaded}, total: ${e.total})`);
          this.logger.info(`📥 [AI Model] Event details:`, e);
          
          // Update download state
          if (e.loaded === 0) {
            // Download starting
            this.logger.info(`📥 [AI Model] Download starting - e.loaded === 0`);
            this.isDownloadingModel.set(true);
            this.modelDownloadProgress.set(0);
            this.downloadStartTime = Date.now();
            this.shouldShowDownloadNotice.set(false);
            
            // Clear any existing timeout
            if (this.showNoticeTimeoutId) {
              clearTimeout(this.showNoticeTimeoutId);
              this.showNoticeTimeoutId = null;
            }
            
            // Only show notice if download takes more than 500ms
            // This prevents flickering for cached models that complete instantly
            this.showNoticeTimeoutId = setTimeout(() => {
              // Check if download is still in progress (not complete)
              if (this.isDownloadingModel() && this.modelDownloadProgress() !== null && this.modelDownloadProgress() !== 100) {
                this.logger.info(`📥 [AI Model] Download taking time - showing notice`);
                this.shouldShowDownloadNotice.set(true);
              }
            }, 500);
            
            this.logger.info(`📥 [AI Model] Download started - progress set to 0`);
          } else if (e.loaded === 1) {
            // Download complete
            this.modelDownloadProgress.set(100);
            
            // Clear the timeout if download completed quickly
            if (this.showNoticeTimeoutId) {
              clearTimeout(this.showNoticeTimeoutId);
              this.showNoticeTimeoutId = null;
            }
            
            // Check if download was fast (less than 500ms) - likely cached
            const downloadDuration = this.downloadStartTime ? Date.now() - this.downloadStartTime : 0;
            if (downloadDuration < 500) {
              // Model was cached, completed instantly - don't show notice
              this.shouldShowDownloadNotice.set(false);
              this.isDownloadingModel.set(false);
              this.modelDownloadProgress.set(null);
              this.downloadStartTime = null;
              this.logger.info(`📥 [AI Model] Download complete (cached, ${downloadDuration}ms)`);
            } else {
              // Show completion briefly, then reset
              this.isDownloadingModel.set(false);
              setTimeout(() => {
                this.modelDownloadProgress.set(null);
                this.shouldShowDownloadNotice.set(false);
                this.downloadStartTime = null;
              }, 500);
              this.logger.info(`📥 [AI Model] Download complete (${downloadDuration}ms)`);
            }
          } else {
            // Download in progress - if we've passed the delay threshold, show notice
            this.logger.info(`📥 [AI Model] Setting progress to: ${percent}%`);
            this.modelDownloadProgress.set(percent);
            
            // If download is taking time, ensure notice is shown
            if (this.downloadStartTime && Date.now() - this.downloadStartTime > 500) {
              this.shouldShowDownloadNotice.set(true);

            }
          }
          
          // Only log significant progress milestones to avoid log spam
          // if (e.loaded === 0 || e.loaded === 1 || e.loaded % 0.25 === 0) {
          //   this.logger.info(`📥 [AI Model] Loading: ${percent}%`);
          // }
        });
      },
    };

    const langInfo = ` (input: [${inputLanguages.join(', ')}], output: [${outputLanguages.join(', ')}])`;
    this.logger.info(`Creating session${options?.userRole ? ` for ${options.userRole} perspective` : ''}${langInfo}...`);
    
    // Log initial state before creating
    this.logger.info(`📥 [AI Model] Before create() - progress: ${this.modelDownloadProgress()}, isDownloading: ${this.isDownloadingModel()}`);
    
    // Note: LanguageModel doesn't have availability() method like other APIs
    // The monitor callback will only be invoked if a download is needed
    // If model is cached, monitor might not be called or events won't fire
    
    // Set a flag before create() to track if monitor gets called
    let monitorWasCalled = false;
    const originalMonitor = createOptions.monitor;
    
    // Wrap monitor to track invocation
    createOptions.monitor = (m) => {
      monitorWasCalled = true;
      this.logger.info(`📥 [AI Model] Monitor callback actually invoked!`);
      if (originalMonitor) {
        originalMonitor(m);
      }
    };
    
    this.logger.info(`📥 [AI Model] Calling LanguageModel.create() with monitor configured...`);
    const createStartTime = Date.now();
    
    try {
      this.session = await window.LanguageModel.create(createOptions);
      const createDuration = Date.now() - createStartTime;
      this.logger.info(`Session ready (took ${createDuration}ms)`);
      
      // Check if monitor was invoked (if download was needed) by checking progress state
      const finalProgress = this.modelDownloadProgress();
      const finalIsDownloading = this.isDownloadingModel();
      this.logger.info(`📥 [AI Model] After create() - monitorWasCalled: ${monitorWasCalled}, progress: ${finalProgress}, isDownloading: ${finalIsDownloading}`);
      
      // If monitor was never called, the model was likely already available (instant)
      if (!monitorWasCalled) {
        this.logger.info(`📥 [AI Model] Monitor callback was NOT invoked - model was likely already cached/available`);
        this.logger.info(`📥 [AI Model] This means downloadprogress events won't fire - model is ready immediately`);
      } else if (finalProgress === null && finalIsDownloading === false) {
        this.logger.info(`📥 [AI Model] Monitor was called but no progress events fired - model completed instantly (cached)`);
      }
    } catch (error) {
      this.logger.error(`📥 [AI Model] create() failed:`, error);
      throw error;
    }
    
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
    schema: object,
    options?: AIPromptOptions
  ): Promise<T> {
    if (!this.session) {
      throw new Error('Session not initialized. Call createSession() first.');
    }

    const mergedOptions: AIPromptOptions = {
      ...options,
      responseConstraint: schema,
    };
    const resultString = await this.session.prompt(prompt, mergedOptions);

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
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'metadata', userRole, CANONICAL_ANALYSIS_LANGUAGE);

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
  ): Promise<Schemas.RiskItem[]> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'risks', undefined, CANONICAL_ANALYSIS_LANGUAGE);

    const result = await this.promptWithSchema<Schemas.RisksAnalysis>(
      prompt,
      Schemas.RISKS_SCHEMA
    );
    return result.risks;
  }

  /**
   * 3. Extract obligations with schema
   */
  async extractObligations(
    contractText: string,
    outputLanguage?: string
  ): Promise<Schemas.Obligations> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'obligations', undefined, CANONICAL_ANALYSIS_LANGUAGE);

    const result = await this.promptWithSchema<Schemas.ObligationsAnalysis>(
      prompt,
      Schemas.OBLIGATIONS_SCHEMA
    );
    return result.obligations;
  }

  /**
   * 4. Extract omissions and questions with schema
   */
  async extractOmissionsAndQuestions(
    contractText: string,
    outputLanguage?: string
  ): Promise<{ omissions: Schemas.Omission[]; questions: string[] }> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'omissions', undefined, CANONICAL_ANALYSIS_LANGUAGE);

    const result = await this.promptWithSchema<Schemas.OmissionsAndQuestions>(
      prompt,
      Schemas.OMISSIONS_QUESTIONS_SCHEMA
    );
    return { omissions: result.omissions, questions: result.questions };
  }

  /**
   * 5. Extract summary with schema
   * Note: API returns nested { summary: {...} }, but we flatten it for consistency
   */
  async extractSummary(
    contractText: string,
    outputLanguage?: string
  ): Promise<Schemas.ContractSummary> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(contractText, 'summary', undefined, CANONICAL_ANALYSIS_LANGUAGE);

    // API returns { summary: {...} }, but we want flat structure
    const result = await this.promptWithSchema<{ summary: Omit<Schemas.ContractSummary, 'fromYourPerspective' | 'keyBenefits' | 'keyConcerns'> }>(
      prompt,
      Schemas.SUMMARY_SCHEMA
    );
    
    // Flatten by extracting the nested summary object
    return result.summary;
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
  ): Observable<Schemas.RiskItem[]> {
    return defer(() => from(this.extractRisks(contractText, outputLanguage)));
  }

  /**
   * Extract obligations as Observable
   */
  extractObligations$(
    contractText: string,
    outputLanguage?: string
  ): Observable<Schemas.Obligations> {
    return defer(() => from(this.extractObligations(contractText, outputLanguage)));
  }

  /**
   * Extract omissions and questions as Observable
   */
  extractOmissionsAndQuestions$(
    contractText: string,
    outputLanguage?: string
  ): Observable<{ omissions: Schemas.Omission[]; questions: string[] }> {
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
    // Clear timeout if exists
    if (this.showNoticeTimeoutId) {
      clearTimeout(this.showNoticeTimeoutId);
      this.showNoticeTimeoutId = null;
    }
    // Reset download state
    this.isDownloadingModel.set(false);
    this.modelDownloadProgress.set(null);
    this.shouldShowDownloadNotice.set(false);
    this.downloadStartTime = null;
  }
}
