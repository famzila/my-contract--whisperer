import { Injectable, inject } from '@angular/core';
import { Observable, of, merge, concat, defer, from, EMPTY, map, tap, catchError, switchMap, shareReplay, takeUntil, retry, timer, Subject, combineLatest } from 'rxjs';
import { ContractParserService, ParsedContract } from './contract-parser.service';
import { AiOrchestratorService } from './ai/ai-orchestrator.service';
import { PromptService } from './ai/prompt.service';
import { SummarizerService } from './ai/summarizer.service';
import { TranslationOrchestratorService } from './translation-orchestrator.service';
import { TranslatorService } from './ai/translator.service';
import { TranslationCacheService } from './translation-cache.service';
import { OfflineStorageService } from './storage/offline-storage.service';
import { LoggerService } from './logger.service';
import { AppConfig } from '../config/app.config';
import { Contract, ContractAnalysis } from '../models/contract.model';
import { AnalysisContext, DEFAULT_ANALYSIS_CONTEXT } from '../models/analysis-context.model';
import * as Schemas from '../schemas/analysis-schemas';
import { isGeminiNanoSupported, LANGUAGES } from '../constants/languages';

/**
 * Contract Analysis Service
 * Orchestrates the full contract analysis flow using RxJS streaming approach
 * 
 * Features:
 * - RxJS streaming analysis with independent section loading
 * - Metadata priority (must complete first)
 * - Progressive loading with skeleton loaders
 * - Error handling with user-friendly messages
 * - Mock analysis for development/testing
 */
@Injectable({
  providedIn: 'root',
})
export class ContractAnalysisService {
  private aiOrchestrator = inject(AiOrchestratorService);
  private promptService = inject(PromptService);
  private summarizerService = inject(SummarizerService);
  private parser = inject(ContractParserService);
  private translationOrchestrator = inject(TranslationOrchestratorService);
  private translator = inject(TranslatorService);
  private translationCache = inject(TranslationCacheService);
  private logger = inject(LoggerService);
  private offlineStorage = inject(OfflineStorageService);

  /**
   * Retry configuration for section extraction
   */
  private readonly RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
  };

  /**
   * ========================================
   * Retry Logic with Exponential Backoff + Event Emission
   * ========================================
   * Wraps an observable with retry logic and emits retry events
   * Returns an observable that emits both retry notifications and final result
   */
  private withRetryAndNotify$<T>(
    sectionName: 'summary' | 'risks' | 'obligations' | 'omissionsAndQuestions',
    source$: Observable<T>,
    progress: number
  ): Observable<{
    section: typeof sectionName;
    data: T | null;
    progress: number;
    retryCount?: number;
    isRetrying?: boolean;
  }> {
    const retrySubject = new Subject<{
      section: typeof sectionName;
      data: null;
      progress: number;
      retryCount: number;
      isRetrying: true;
    }>();

    const result$ = source$.pipe(
      retry({
        count: this.RETRY_CONFIG.maxAttempts,
        delay: (error, retryCount) => {
          const delay = this.RETRY_CONFIG.initialDelayMs * Math.pow(this.RETRY_CONFIG.backoffMultiplier, retryCount - 1);
          console.log(`⚠️ [Retry] ${sectionName} failed, retrying in ${delay}ms (attempt ${retryCount}/${this.RETRY_CONFIG.maxAttempts})`, error);
          
          // Emit retry notification
          retrySubject.next({
            section: sectionName,
            data: null,
            progress,
            retryCount,
            isRetrying: true,
          });
          
          return timer(delay);
        },
      }),
      map(data => ({
        section: sectionName,
        data,
        progress,
        retryCount: 0,
        isRetrying: false,
      })),
      tap(() => retrySubject.complete())
    );

    // Merge retry notifications with final result
    return merge(retrySubject.asObservable(), result$);
  }

  /**
   * ========================================
   * RxJS Streaming Analysis (Current Approach)
   * ========================================
   * Stream-based analysis that emits results as they complete
   * Metadata is priority 1 (must complete first)
   * All other sections stream independently as they finish
   */
  analyzeContractStreaming$(
    parsedContract: ParsedContract,
    analysisContext: AnalysisContext,
    contract: Contract
  ): Observable<{
    section: 'metadata' | 'summary' | 'risks' | 'obligations' | 'omissionsAndQuestions' | 'complete';
    data: any;
    progress: number;
    retryCount?: number;
    isRetrying?: boolean;
  }> {
    // Determine languages
    const outputLanguage = analysisContext.analyzedInLanguage || undefined;
    const contractLanguage = analysisContext.contractLanguage || LANGUAGES.ENGLISH;
    
    // Check if pre-translation is needed
    const needsPreTranslation = !this.canAnalyzeLanguage(contractLanguage);
    
    if (needsPreTranslation) {
      console.log(`⚠️ [Analysis] Contract language "${contractLanguage}" not supported by Gemini Nano`);
      console.log(`🌍 [Analysis] Pre-translating to English for analysis...`);
      
      // Pre-translate contract → Analyze in English → Post-translate results
      return this.analyzeWithPreTranslation$(parsedContract, analysisContext, contract, contractLanguage, outputLanguage);
    }
    
    // Direct analysis (no pre-translation needed)
    return this.analyzeDirectly$(parsedContract, analysisContext, outputLanguage, contractLanguage, contract);
  }

  /**
   * Analyze contract directly (language supported by Gemini Nano)
   */
  private analyzeDirectly$(
    parsedContract: ParsedContract,
    analysisContext: AnalysisContext,
    outputLanguage: string | undefined,
    contractLanguage: string,
    contract: Contract
  ): Observable<{
    section: 'metadata' | 'summary' | 'risks' | 'obligations' | 'omissionsAndQuestions' | 'complete';
    data: any;
    progress: number;
  }> {
    // Check if output language is supported by Gemini Nano
    // If user wants results in unsupported language (e.g., Arabic), we need to:
    // 1. Analyze in English (or contract language if supported)
    // 2. Post-translate results to target language
    const targetLanguage = outputLanguage;
    const isOutputLanguageSupported = !outputLanguage || isGeminiNanoSupported(outputLanguage);
    const geminiOutputLanguage = isOutputLanguageSupported ? outputLanguage : LANGUAGES.ENGLISH;
    const needsPostTranslation = !isOutputLanguageSupported;
    
    console.log(`🚀 [Direct Analysis] Contract: ${contractLanguage}, Target: ${targetLanguage}, Gemini Output: ${geminiOutputLanguage}, Post-translate: ${needsPostTranslation}`);
    
    // Create session once and share it
    const session$ = of(null).pipe(
      tap(() => console.log(`🚀 Starting direct analysis (Gemini output: ${geminiOutputLanguage})...`)),
      switchMap(() => this.promptService.createSession({ 
        userRole: analysisContext.userRole || null,
        contractLanguage: contractLanguage,
        outputLanguage: geminiOutputLanguage  // Only use Gemini-supported languages
      })),
      shareReplay(1)
    );

    // PRIORITY 1: Metadata (must complete first)
    const metadata$ = session$.pipe(
      switchMap(() => this.promptService.extractMetadata$(
        parsedContract.text,
        analysisContext.userRole || undefined,
        geminiOutputLanguage
      )),
      // Post-translate if needed
      switchMap(metadata => needsPostTranslation && outputLanguage
        ? defer(() => from(this.postTranslateMetadata(metadata, outputLanguage)))
        : of(metadata)
      ),
      map(metadata => ({
        section: 'metadata' as const,
        data: metadata,
        progress: 20
      })),
      tap(result => console.log('✅ Metadata complete', result)),
      catchError(error => {
        console.error('❌ Metadata extraction failed:', error);
        throw error; // Metadata is critical, so we throw
      })
    );

    // STREAMING: Summary (HYBRID APPROACH)
    // - Quick Take: Summarizer API (TL;DR format)
    // - Structured Details: Prompt API (compensation, termination, restrictions)
    const quickTake$ = session$.pipe(
      switchMap(() => from(
        this.summarizerService.generateExecutiveSummary(parsedContract.text, geminiOutputLanguage)
      )),
      // 🔑 NEW: Cache English Quick Take BEFORE post-translation
      tap(quickTakeText => {
        if (needsPostTranslation && quickTakeText) {
          this.cacheIntermediateEnglishSection(contract.id, 'quickTake', quickTakeText);
        }
      }),
      switchMap(quickTakeText => needsPostTranslation && quickTakeText && outputLanguage
        ? defer(() => from(this.translator.translateFromEnglish(quickTakeText, outputLanguage)))
        : of(quickTakeText)
      ),
      catchError(error => {
        this.logger.warn('Quick take generation failed:', error);
        return of(null); // Optional - don't fail if Summarizer unavailable
      })
    );

    const structuredSummary$ = session$.pipe(
      switchMap(() => this.withRetryAndNotify$(
        'summary',
        this.promptService.extractSummary$(parsedContract.text, geminiOutputLanguage).pipe(
          switchMap(summary => needsPostTranslation && outputLanguage
            ? defer(() => from(this.postTranslateSummary(summary, outputLanguage)))
            : of(summary)
          )
        ),
        40
      )),
      catchError(error => {
        console.error('❌ Structured summary extraction failed after retries:', error);
        return of({ section: 'summary' as const, data: null, progress: 40 });
      })
    );

    // COMBINE: Merge quick take with structured summary
    const summary$ = combineLatest([quickTake$, structuredSummary$]).pipe(
      map(([quickTake, structuredResult]) => ({
        section: structuredResult.section,
        data: structuredResult.data ? {
          ...structuredResult.data,
          quickTake // Add quick take to result
        } : null,
        progress: structuredResult.progress,
        isRetrying: (structuredResult as any).isRetrying ?? false,
        retryCount: (structuredResult as any).retryCount ?? undefined
      })),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Hybrid summary complete (Quick Take + Structured)', result);
        }
      })
    );

    const risks$ = session$.pipe(
      switchMap(() => this.withRetryAndNotify$(
        'risks',
        this.promptService.extractRisks$(parsedContract.text, geminiOutputLanguage).pipe(
          switchMap(risks => needsPostTranslation && outputLanguage
            ? defer(() => from(this.postTranslateRisks(risks, outputLanguage)))
            : of(risks)
          )
        ),
        60
      )),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Risks complete', result);
        }
      }),
      catchError(error => {
        console.error('❌ Risks extraction failed after retries:', error);
        // Return null data - UI will show error message
        return of({ section: 'risks' as const, data: null, progress: 60 });
      })
    );

    const obligations$ = session$.pipe(
      switchMap(() => this.withRetryAndNotify$(
        'obligations',
        this.promptService.extractObligations$(parsedContract.text, geminiOutputLanguage).pipe(
          switchMap(obligations => needsPostTranslation && outputLanguage
            ? defer(() => from(this.postTranslateObligations(obligations, outputLanguage)))
            : of(obligations)
          )
        ),
        80
      )),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Obligations complete', result);
        }
      }),
      catchError(error => {
        console.error('❌ Obligations extraction failed after retries:', error);
        // Return null data - UI will show error message
        return of({ section: 'obligations' as const, data: null, progress: 80 });
      })
    );

    const omissionsAndQuestions$ = session$.pipe(
      switchMap(() => this.withRetryAndNotify$(
        'omissionsAndQuestions',
        this.promptService.extractOmissionsAndQuestions$(parsedContract.text, geminiOutputLanguage).pipe(
          switchMap(omissionsAndQuestions => needsPostTranslation && outputLanguage
            ? defer(() => from(this.postTranslateOmissionsAndQuestions(omissionsAndQuestions, outputLanguage)))
            : of(omissionsAndQuestions)
          )
        ),
        90
      )),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Omissions/Questions complete', result);
        }
      }),
      catchError(error => {
        console.error('❌ Omissions/Questions extraction failed after retries:', error);
        // Return null data - UI will show error message
        return of({ section: 'omissionsAndQuestions' as const, data: null, progress: 90 });
      })
    );

    // Strategy: 
    // 1. Metadata MUST complete first (use concat)
    // 2. Then stream all others as they complete (use merge)
    return concat(
      metadata$,
      merge(
        summary$,
        risks$,
        obligations$,
        omissionsAndQuestions$
      )
    );
  }

  /**
   * Analyze contract with pre-translation (for unsupported languages)
   * 
   * Flow: Contract (unsupported lang) → English → Analysis (English) → Post-translate to target
   * 
   * Why this approach:
   * - Gemini Nano only supports en, es, ja for both input AND output
   * - For unsupported languages (ar, fr, de, zh, etc.):
   *   1. Pre-translate contract to English
   *   2. Analyze in English (get English results)
   *   3. Post-translate results back to target language using Chrome Translator API
   * 
   * Note: We use Chrome Translator API for post-translation, NOT Gemini Nano's expectedOutputs
   */
  private analyzeWithPreTranslation$(
    parsedContract: ParsedContract,
    analysisContext: AnalysisContext,
    contract: Contract,
    originalLanguage: string,
    targetLanguage: string | undefined
  ): Observable<{
    section: 'metadata' | 'summary' | 'risks' | 'obligations' | 'omissionsAndQuestions' | 'complete';
    data: any;
    progress: number;
  }> {
    const finalTargetLanguage = targetLanguage || originalLanguage;
    
    // Check if target language is supported by Gemini Nano for output
    const isTargetLanguageSupported = isGeminiNanoSupported(finalTargetLanguage);
    const geminiOutputLanguage = isTargetLanguageSupported ? finalTargetLanguage : LANGUAGES.ENGLISH;
    const needsPostTranslation = !isTargetLanguageSupported && finalTargetLanguage !== LANGUAGES.ENGLISH;
    
    console.log(`📋 [Pre-translation Flow] Original: ${originalLanguage}, Target: ${finalTargetLanguage}, Gemini Output: ${geminiOutputLanguage}, Post-translate: ${needsPostTranslation}`);
    
    // Step 1: Pre-translate contract to English
    console.log(`📝 [Pre-translation] Starting translation: ${originalLanguage} → ${LANGUAGES.ENGLISH}`);
    console.log(`📄 [Pre-translation] Original text preview: "${parsedContract.text.substring(0, 200)}..."`);
    
    const translatedContract$ = defer(() => 
      from(this.translator.translate(parsedContract.text, originalLanguage, LANGUAGES.ENGLISH))
    ).pipe(
      tap(translatedText => {
        console.log(`✅ [Pre-translation] Contract translated to English (${translatedText.length} chars)`);
        console.log(`📄 [Pre-translation] Translated text preview: "${translatedText.substring(0, 200)}..."`);
      }),
      catchError(error => {
        console.error('❌ [Pre-translation] Failed:', error);
        throw new Error(`Pre-translation failed: ${error.message}`);
      }),
      shareReplay(1)
    );

    // Step 2: Analyze in English, output in target language (if supported) or English
    const session$ = translatedContract$.pipe(
      switchMap(() => this.promptService.createSession({ 
        userRole: analysisContext.userRole || null,
        contractLanguage: LANGUAGES.ENGLISH,
        outputLanguage: geminiOutputLanguage  // Use target language if supported, otherwise English
      })),
      shareReplay(1)
    );

    // Step 3: Extract all sections in target language (if supported) or English
    const metadata$ = translatedContract$.pipe(
      switchMap(translatedText => {
        console.log(`🎯 [Pre-translation] Sending to Gemini Nano with outputLanguage: ${geminiOutputLanguage}`);
        console.log(`📄 [Pre-translation] Text being analyzed (preview): "${translatedText.substring(0, 200)}..."`);
        return session$.pipe(
          switchMap(() => this.promptService.extractMetadata$(
            translatedText,
            analysisContext.userRole || undefined,
            geminiOutputLanguage  // Get results in target language if supported, otherwise English
          ))
        );
      }),
      // 🔑 NEW: Cache English metadata BEFORE post-translation
      tap(englishMetadata => {
        if (needsPostTranslation) {
          this.cacheIntermediateEnglishSection(contract.id, 'metadata', englishMetadata);
        }
      }),
      // Step 4: Post-translate metadata if target language is not supported by Gemini
      switchMap(metadata => needsPostTranslation
        ? defer(() => from(this.postTranslateMetadata(metadata, finalTargetLanguage)))
        : of(metadata)
      ),
      map(metadata => ({
        section: 'metadata' as const,
        data: metadata,
        progress: 20,
        resultLanguage: needsPostTranslation ? finalTargetLanguage : geminiOutputLanguage  // Track actual language of results
      })),
      tap(result => console.log('✅ Metadata complete (pre-translated)', result)),
      catchError(error => {
        console.error('❌ Metadata extraction failed:', error);
        throw error;
      })
    );

    // HYBRID SUMMARY (Pre-translation path)
    // - Quick Take: Summarizer API (TL;DR format)
    // - Structured Details: Prompt API (compensation, termination, restrictions)
    const quickTakePreTranslate$ = translatedContract$.pipe(
      switchMap(translatedText => from(
        this.summarizerService.generateExecutiveSummary(translatedText, geminiOutputLanguage)
      )),
      // 🔑 NEW: Cache English Quick Take BEFORE post-translation
      tap(quickTakeText => {
        if (needsPostTranslation && quickTakeText) {
          this.cacheIntermediateEnglishSection(contract.id, 'quickTake', quickTakeText);
        }
      }),
      switchMap(quickTakeText => needsPostTranslation && quickTakeText
        ? defer(() => from(this.translator.translateFromEnglish(quickTakeText, finalTargetLanguage)))
        : of(quickTakeText)
      ),
      catchError(error => {
        this.logger.warn('Quick take generation failed:', error);
        return of(null);
      })
    );

    const structuredSummaryPreTranslate$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.withRetryAndNotify$(
          'summary',
          this.promptService.extractSummary$(translatedText, geminiOutputLanguage).pipe(
            // 🔑 NEW: Cache English summary BEFORE post-translation
            tap(englishSummary => {
              if (needsPostTranslation) {
                this.cacheIntermediateEnglishSection(contract.id, 'summary', englishSummary);
              }
            }),
            switchMap(summary => needsPostTranslation
              ? defer(() => from(this.postTranslateSummary(summary, finalTargetLanguage)))
              : of(summary)
            )
          ),
          40
        ))
      )),
      catchError(error => {
        console.error('❌ Structured summary extraction failed after retries:', error);
        return of({ section: 'summary' as const, data: null, progress: 40 });
      })
    );

    // COMBINE: Merge quick take with structured summary
    const summary$ = combineLatest([quickTakePreTranslate$, structuredSummaryPreTranslate$]).pipe(
      map(([quickTake, structuredResult]) => ({
        section: structuredResult.section,
        data: structuredResult.data ? {
          ...structuredResult.data,
          quickTake: quickTake || undefined // Add quick take to result (or undefined if failed)
        } : null,
        progress: structuredResult.progress,
        isRetrying: (structuredResult as any).isRetrying ?? false,
        retryCount: (structuredResult as any).retryCount ?? undefined
      })),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Hybrid summary complete (pre-translated + post-translated)', result);
        }
      })
    );

    const risks$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.withRetryAndNotify$(
          'risks',
          this.promptService.extractRisks$(translatedText, geminiOutputLanguage).pipe(
            // 🔑 NEW: Cache English risks BEFORE post-translation
            tap(englishRisks => {
              if (needsPostTranslation) {
                this.cacheIntermediateEnglishSection(contract.id, 'risks', englishRisks);
              }
            }),
            switchMap(risks => needsPostTranslation
              ? defer(() => from(this.postTranslateRisks(risks, finalTargetLanguage)))
              : of(risks)
            )
          ),
          60
        ))
      )),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Risks complete (pre-translated + post-translated)', result);
        }
      }),
      catchError(error => {
        console.error('❌ Risks extraction failed after retries:', error);
        return of({ section: 'risks' as const, data: null, progress: 60 });
      })
    );

    const obligations$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.withRetryAndNotify$(
          'obligations',
          this.promptService.extractObligations$(translatedText, geminiOutputLanguage).pipe(
            // 🔑 NEW: Cache English obligations BEFORE post-translation
            tap(englishObligations => {
              if (needsPostTranslation) {
                this.cacheIntermediateEnglishSection(contract.id, 'obligations', englishObligations);
              }
            }),
            switchMap(obligations => needsPostTranslation
              ? defer(() => from(this.postTranslateObligations(obligations, finalTargetLanguage)))
              : of(obligations)
            )
          ),
          80
        ))
      )),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Obligations complete (pre-translated + post-translated)', result);
        }
      }),
      catchError(error => {
        console.error('❌ Obligations extraction failed after retries:', error);
        return of({ section: 'obligations' as const, data: null, progress: 80 });
      })
    );

    const omissionsAndQuestions$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.withRetryAndNotify$(
          'omissionsAndQuestions',
          this.promptService.extractOmissionsAndQuestions$(translatedText, geminiOutputLanguage).pipe(
            // 🔑 NEW: Cache English omissions/questions BEFORE post-translation
            tap(englishOmissions => {
              if (needsPostTranslation) {
                this.cacheIntermediateEnglishSection(contract.id, 'omissionsAndQuestions', englishOmissions);
              }
            }),
            switchMap(omissionsAndQuestions => needsPostTranslation
              ? defer(() => from(this.postTranslateOmissionsAndQuestions(omissionsAndQuestions, finalTargetLanguage)))
              : of(omissionsAndQuestions)
            )
          ),
          90
        ))
      )),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Omissions/Questions complete (pre-translated + post-translated)', result);
        }
      }),
      catchError(error => {
        console.error('❌ Omissions/Questions extraction failed after retries:', error);
        return of({ section: 'omissionsAndQuestions' as const, data: null, progress: 90 });
      })
    );

    // Stream results as they complete
    return concat(
      metadata$,
      merge(
        summary$,
        risks$,
        obligations$,
        omissionsAndQuestions$
      )
    );
  }

  /**
   * Check if a language can be analyzed directly by Gemini Nano
   */
  private canAnalyzeLanguage(languageCode: string): boolean {
    return isGeminiNanoSupported(languageCode);
  }

  /**
   * ========================================
   * Post-Translation Helper Methods
   * ========================================
   * Translate English analysis results to target language
   */

  async postTranslateMetadata(
    metadata: Schemas.ContractMetadata,
    targetLanguage: string
  ): Promise<Schemas.ContractMetadata> {
    console.log(`🌍 [Post-translation] Translating metadata to ${targetLanguage}...`);
    
    return {
      ...metadata,
      contractType: await this.translator.translateFromEnglish(metadata.contractType, targetLanguage),
      jurisdiction: metadata.jurisdiction ? await this.translator.translateFromEnglish(metadata.jurisdiction, targetLanguage) : null,
      parties: {
        party1: {
          ...metadata.parties.party1,
          role: await this.translator.translateFromEnglish(metadata.parties.party1.role, targetLanguage),
        },
        party2: {
          ...metadata.parties.party2,
          role: await this.translator.translateFromEnglish(metadata.parties.party2.role, targetLanguage),
        },
      },
    };
  }


  async postTranslateSummary(
    summary: Schemas.ContractSummary,
    targetLanguage: string
  ): Promise<Schemas.ContractSummary> {
    console.log(`🌍 [Post-translation] Translating summary to ${targetLanguage}...`);
    
    // Translate quick take if present
    const quickTake = summary.quickTake 
      ? await this.translator.translateFromEnglish(summary.quickTake, targetLanguage)
      : undefined;
    
    return {
      quickTake,
      summary: {
        keyResponsibilities: await Promise.all(
          summary.summary.keyResponsibilities.map((r: string) => this.translator.translateFromEnglish(r, targetLanguage))
        ),
        compensation: {
          baseSalary: summary.summary.compensation.baseSalary,
          bonus: summary.summary.compensation.bonus ? await this.translator.translateFromEnglish(summary.summary.compensation.bonus, targetLanguage) : null,
          equity: summary.summary.compensation.equity ? await this.translator.translateFromEnglish(summary.summary.compensation.equity, targetLanguage) : null,
          other: summary.summary.compensation.other ? await this.translator.translateFromEnglish(summary.summary.compensation.other, targetLanguage) : null,
        },
        benefits: await Promise.all(
          summary.summary.benefits.map((b: string) => this.translator.translateFromEnglish(b, targetLanguage))
        ),
        termination: {
          atWill: summary.summary.termination.atWill ? await this.translator.translateFromEnglish(summary.summary.termination.atWill, targetLanguage) : null,
          forCause: summary.summary.termination.forCause ? await this.translator.translateFromEnglish(summary.summary.termination.forCause, targetLanguage) : null,
          severance: summary.summary.termination.severance ? await this.translator.translateFromEnglish(summary.summary.termination.severance, targetLanguage) : null,
          noticeRequired: summary.summary.termination.noticeRequired ? await this.translator.translateFromEnglish(summary.summary.termination.noticeRequired, targetLanguage) : null,
        },
        restrictions: {
          confidentiality: summary.summary.restrictions.confidentiality ? await this.translator.translateFromEnglish(summary.summary.restrictions.confidentiality, targetLanguage) : null,
          nonCompete: summary.summary.restrictions.nonCompete ? await this.translator.translateFromEnglish(summary.summary.restrictions.nonCompete, targetLanguage) : null,
          nonSolicitation: summary.summary.restrictions.nonSolicitation ? await this.translator.translateFromEnglish(summary.summary.restrictions.nonSolicitation, targetLanguage) : null,
          intellectualProperty: summary.summary.restrictions.intellectualProperty ? await this.translator.translateFromEnglish(summary.summary.restrictions.intellectualProperty, targetLanguage) : null,
          other: summary.summary.restrictions.other ? await this.translator.translateFromEnglish(summary.summary.restrictions.other, targetLanguage) : null,
        },
      },
    };
  }

  async postTranslateRisks(
    risks: Schemas.RisksAnalysis,
    targetLanguage: string
  ): Promise<Schemas.RisksAnalysis> {
    console.log(`🌍 [Post-translation] Translating risks to ${targetLanguage}...`);
    
    return {
      risks: await Promise.all(
        risks.risks.map(async risk => ({
          ...risk,
          title: await this.translator.translateFromEnglish(risk.title, targetLanguage),
          description: await this.translator.translateFromEnglish(risk.description, targetLanguage),
          impact: await this.translator.translateFromEnglish(risk.impact, targetLanguage),
        }))
      ),
    };
  }

  async postTranslateObligations(
    obligations: Schemas.ObligationsAnalysis,
    targetLanguage: string
  ): Promise<Schemas.ObligationsAnalysis> {
    console.log(`🌍 [Post-translation] Translating obligations to ${targetLanguage}...`);
    
    type EmployerObligation = Schemas.ObligationsAnalysis['obligations']['employer'][0];
    type EmployeeObligation = Schemas.ObligationsAnalysis['obligations']['employee'][0];
    
    return {
      obligations: {
        employer: await Promise.all(
          obligations.obligations.employer.map(async (obl: EmployerObligation) => ({
            ...obl,
            duty: await this.translator.translateFromEnglish(obl.duty, targetLanguage),
            frequency: obl.frequency ? await this.translator.translateFromEnglish(obl.frequency, targetLanguage) : null,
            scope: obl.scope ? await this.translator.translateFromEnglish(obl.scope, targetLanguage) : null,
          }))
        ),
        employee: await Promise.all(
          obligations.obligations.employee.map(async (obl: EmployeeObligation) => ({
            ...obl,
            duty: await this.translator.translateFromEnglish(obl.duty, targetLanguage),
            frequency: obl.frequency ? await this.translator.translateFromEnglish(obl.frequency, targetLanguage) : null,
            scope: obl.scope ? await this.translator.translateFromEnglish(obl.scope, targetLanguage) : null,
          }))
        ),
      },
    };
  }

  async postTranslateOmissionsAndQuestions(
    omissionsAndQuestions: Schemas.OmissionsAndQuestions,
    targetLanguage: string
  ): Promise<Schemas.OmissionsAndQuestions> {
    console.log(`🌍 [Post-translation] Translating omissions/questions to ${targetLanguage}...`);
    
    return {
      omissions: await Promise.all(
        omissionsAndQuestions.omissions.map(async omission => ({
          ...omission,
          item: await this.translator.translateFromEnglish(omission.item, targetLanguage),
          impact: await this.translator.translateFromEnglish(omission.impact, targetLanguage),
        }))
      ),
      questions: await Promise.all(
        omissionsAndQuestions.questions.map(q => this.translator.translateFromEnglish(q, targetLanguage))
      ),
    };
  }

  /**
   * Create mock analysis for testing/demo when AI is not available
   */
  private createMockAnalysis(contractId: string, contractText: string): ContractAnalysis {
    return {
      id: contractId,
      summary: `Mock Analysis: This is a sample analysis for demonstration purposes. 
      
Key Points:
• Contract has been processed using mock data
• Risk assessment based on common contract patterns
• Obligations and omissions identified from sample data

Note: This is mock data. Enable Chrome Built-in AI for real analysis.`,
      clauses: [],
      riskScore: 45,
      obligations: [],
      omissions: [],
      questions: [],
      analyzedAt: new Date(),
    };
  }

  /**
   * Create mock analysis from structured mock data
   */
  private createMockAnalysisFromStructuredData(contractId: string): ContractAnalysis {
    console.log('🎭 Creating analysis from structured mock data');
    
    return {
      id: contractId,
      summary: JSON.stringify({
        metadata: {
          contractType: 'Employment Agreement',
          effectiveDate: '2025-01-01',
          endDate: '2025-12-31',
          jurisdiction: 'California, USA',
          parties: {
            party1: { name: 'Acme Corp', role: 'Employer' },
            party2: { name: 'John Doe', role: 'Employee' }
          },
          analyzedForRole: 'employee'
        },
        summary: {
          parties: 'Acme Corp (Employer) and John Doe (Employee)',
          role: 'Full-time employment relationship',
          responsibilities: ['Software development', 'Code reviews', 'Team collaboration'],
          compensation: { baseSalary: '80000', bonus: 'Performance-based' },
          benefits: ['Health insurance', '401k matching', 'Paid time off'],
          termination: { atWill: 'Either party can terminate with 2 weeks notice' }
        },
        risks: {
          risks: [
            {
              title: 'At-Will Employment',
              description: 'Employment can be terminated at any time without cause',
              severity: 'medium',
              impact: 'Job security may be uncertain',
              icon: 'AlertTriangle'
            }
          ]
        },
        obligations: {
          obligations: {
            employer: [
              { duty: 'Pay salary', amount: 80000, frequency: 'Monthly' }
            ],
            employee: [
              { duty: 'Perform job duties', scope: 'Software development' }
            ]
          }
        },
        omissionsAndQuestions: {
          omissions: [
            { item: 'Remote work policy', impact: 'Important for work-life balance', priority: 'medium' }
          ],
          questions: [
            'What is the remote work policy?',
            'Are there opportunities for professional development?'
          ]
        }
      }, null, 2),
      clauses: [],
      riskScore: 45,
      obligations: [],
      omissions: [],
      questions: [
        'What is the remote work policy?',
        'Are there opportunities for professional development?'
      ],
      metadata: {
        contractType: 'Employment Agreement',
        effectiveDate: '2025-01-01',
        endDate: '2025-12-31',
        jurisdiction: 'California, USA',
        parties: {
          party1: { name: 'Acme Corp', role: 'Employer' },
          party2: { name: 'John Doe', role: 'Employee' }
        },
        analyzedForRole: 'employee'
      },
      disclaimer: 'I am an AI assistant, not a lawyer. This information is for educational purposes only. Consult a qualified attorney for legal advice.',
      analyzedAt: new Date(),
    };
  }

  /**
   * Cache intermediate English section during pre-translation
   * Stores English results BEFORE they're post-translated
   * This enables future language switching without re-analysis
   */
  private cacheIntermediateEnglishSection(
    contractId: string,
    section: 'metadata' | 'summary' | 'risks' | 'obligations' | 'omissionsAndQuestions' | 'quickTake',
    data: any
  ): void {
    try {
      // Get existing English cache or create structure
      const existingCache = this.translationCache.getAnalysis(contractId, 'en') || {
        metadata: null,
        summary: null,
        risks: null,
        obligations: null,
        omissions: null,
        quickTake: null
      };
      
      // Update specific section
      switch (section) {
        case 'metadata':
          existingCache.metadata = data;
          break;
        case 'summary':
          existingCache.summary = data;
          break;
        case 'risks':
          existingCache.risks = data;
          break;
        case 'obligations':
          existingCache.obligations = data;
          break;
        case 'omissionsAndQuestions':
          existingCache.omissions = data;
          break;
        case 'quickTake':
          existingCache.quickTake = data;
          break;
      }
      
      // Store incremental English results
      this.translationCache.storeAnalysis(contractId, 'en', existingCache);
      console.log(`💾 [Pre-translation Cache] Stored English ${section} (before post-translation)`);
    } catch (error) {
      // Don't fail pipeline if caching fails
      console.warn(`⚠️ [Pre-translation Cache] Failed to cache English ${section}:`, error);
    }
  }

  /**
   * ========================================
   * Offline Storage Integration
   * ========================================
   */

  /**
   * Save contract analysis to offline storage
   */
  async saveAnalysisToOfflineStorage(contract: Contract, analysis: ContractAnalysis): Promise<void> {
    try {
      await this.offlineStorage.saveContract(contract, analysis);
      console.log(`💾 [Offline Storage] Saved analysis for contract: ${contract.id}`);
    } catch (error) {
      console.warn(`⚠️ [Offline Storage] Failed to save analysis:`, error);
      // Don't fail the analysis pipeline if offline storage fails
    }
  }

  /**
   * Load cached analysis from offline storage
   */
  async loadCachedAnalysis(contractId: string): Promise<ContractAnalysis | null> {
    try {
      const cachedContract = await this.offlineStorage.getContract(contractId);
      if (cachedContract) {
        console.log(`📱 [Offline Storage] Loaded cached analysis for contract: ${contractId}`);
        return cachedContract.analysis;
      }
      return null;
    } catch (error) {
      console.warn(`⚠️ [Offline Storage] Failed to load cached analysis:`, error);
      return null;
    }
  }

  /**
   * Check if contract analysis is cached
   */
  async isAnalysisCached(contractId: string): Promise<boolean> {
    try {
      const cachedContract = await this.offlineStorage.getContract(contractId);
      return cachedContract !== null;
    } catch (error) {
      console.warn(`⚠️ [Offline Storage] Failed to check cache status:`, error);
      return false;
    }
  }

  /**
   * Get list of cached contracts
   */
  async getCachedContracts(): Promise<Contract[]> {
    try {
      const cachedContracts = await this.offlineStorage.listContracts();
      return cachedContracts.map(cached => cached.contract);
    } catch (error) {
      console.warn(`⚠️ [Offline Storage] Failed to get cached contracts:`, error);
      return [];
    }
  }

}