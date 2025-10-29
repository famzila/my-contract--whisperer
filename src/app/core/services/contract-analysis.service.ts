import { Injectable, inject } from '@angular/core';
import { Observable, of, merge, defer, from, concat, map, tap, catchError, switchMap, shareReplay, retry, timer, Subject, combineLatest } from 'rxjs';
import { ParsedContract } from '../models/contract.model';
import { PromptService } from './ai/prompt.service';
import { SummarizerService } from './ai/summarizer.service';
import { TranslatorService } from './ai/translator.service';
import { TranslationCacheService } from './translation-cache.service';
import { TranslationUtilityService } from './translation-utility.service';
import { OfflineStorageService } from './storage/offline-storage.service';
import { LoggerService } from './logger.service';
import { LANGUAGES, AI_CONFIG } from '../config/application.config';
import { isGeminiNanoSupported } from '../utils/language.util';
import { Contract, ContractAnalysis } from '../models/contract.model';
import { 
  AnalysisContext, 
  AnalysisSection, 
  AnalysisData, 
  AnalysisStreamingResult 
} from '../models/ai-analysis.model';

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
  private promptService = inject(PromptService);
  private summarizerService = inject(SummarizerService);
  private translator = inject(TranslatorService);
  private translationCache = inject(TranslationCacheService);
  private translationUtility = inject(TranslationUtilityService);
  private logger = inject(LoggerService);
  private offlineStorage = inject(OfflineStorageService);

  /**
   * Retry configuration for section extraction
   */
  private readonly RETRY_CONFIG = AI_CONFIG.RETRY;

  /**
   * ========================================
   * Retry Logic with Exponential Backoff + Event Emission
   * ========================================
   * Wraps an observable with retry logic and emits retry events
   * Returns an observable that emits both retry notifications and final result
   */
  private withRetryAndNotify$<T extends AnalysisData>(
    sectionName: AnalysisSection,
    source$: Observable<T>,
    progress: number
  ): Observable<AnalysisStreamingResult> {
    const retrySubject = new Subject<AnalysisStreamingResult>();

    const result$ = source$.pipe(
      retry({
        count: this.RETRY_CONFIG.MAX_ATTEMPTS,
        delay: (error, retryCount) => {
          const delay = this.RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(this.RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount - 1);
          this.logger.warn(`⚠️ [Retry] ${sectionName} failed, retrying in ${delay}ms (attempt ${retryCount}/${this.RETRY_CONFIG.MAX_ATTEMPTS})`, error);
          
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
  ): Observable<AnalysisStreamingResult> {
    // Determine languages
    const outputLanguage = analysisContext.analyzedInLanguage || undefined;
    const contractLanguage = analysisContext.contractLanguage || LANGUAGES.ENGLISH;
    
    // Check if pre-translation is needed
    const needsPreTranslation = !isGeminiNanoSupported(contractLanguage);
    
    if (needsPreTranslation) {
      this.logger.warn(`Contract language "${contractLanguage}" not supported by Gemini Nano`);
      this.logger.info(`Pre-translating to English for analysis...`);
      
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
  ): Observable<AnalysisStreamingResult> {
    // Check if output language is supported by Gemini Nano
    // If user wants results in unsupported language (e.g., Arabic), we need to:
    // 1. Analyze in English (or contract language if supported)
    // 2. Post-translate results to target language
    const targetLanguage = outputLanguage;
    const isOutputLanguageSupported = !outputLanguage || isGeminiNanoSupported(outputLanguage);
    const geminiOutputLanguage = isOutputLanguageSupported ? outputLanguage : LANGUAGES.ENGLISH;
    const needsPostTranslation = !isOutputLanguageSupported;
    
    this.logger.info(`Direct Analysis - Contract: ${contractLanguage}, Target: ${targetLanguage}, Gemini Output: ${geminiOutputLanguage}, Post-translate: ${needsPostTranslation}`);
    
    // Create session once and share it
    const session$ = of(null).pipe(
      tap(() => this.logger.info(`Starting direct analysis (Gemini output: ${geminiOutputLanguage})...`)),
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
        ? defer(() => from(this.translationUtility.translateMetadata(metadata, outputLanguage)))
        : of(metadata)
      ),
      map(metadata => ({
        section: 'metadata' as const,
        data: metadata,
        progress: 20
      })),
      tap(result => this.logger.info('Metadata complete', result)),
      catchError(error => {
        this.logger.error('Metadata extraction failed:', error);
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
      // Cache English Quick Take BEFORE post-translation
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
            ? defer(() => from(this.translationUtility.translateSummary(summary, outputLanguage)))
            : of(summary)
          )
        ),
        40
      )),
      catchError(error => {
        this.logger.error('Structured summary extraction failed after retries:', error);
        return of({ section: 'summary' as const, data: null, progress: 40 });
      })
    );

    // COMBINE: Merge quick take with structured summary
    const summary$ = combineLatest([quickTake$, structuredSummary$]).pipe(
      map(([quickTake, structuredResult]) => ({
        section: structuredResult.section,
        data: structuredResult.data
          ? {
              ...structuredResult.data as any,
              summary: {
                ...(structuredResult.data as any).summary,
                quickTake,
              },
            }
          : null,
        progress: structuredResult.progress,
        isRetrying: (structuredResult as any).isRetrying ?? false,
        retryCount: (structuredResult as any).retryCount ?? undefined
      })),
      tap(result => {
        if (!result.isRetrying) {
          this.logger.info('Hybrid summary complete (Quick Take + Structured)', result);
        }
      })
    );

    const risks$ = session$.pipe(
      switchMap(() => this.withRetryAndNotify$(
        'risks',
        this.promptService.extractRisks$(parsedContract.text, geminiOutputLanguage).pipe(
          switchMap(risks => needsPostTranslation && outputLanguage
            ? defer(() => from(this.translationUtility.translateRisks(risks, outputLanguage)))
            : of(risks)
          )
        ),
        60
      )),
      tap(result => {
        if (!result.isRetrying) {
          this.logger.info('Risks complete', result);
        }
      }),
      catchError(error => {
        this.logger.error('Risks extraction failed after retries:', error);
        // Return null data - UI will show error message
        return of({ section: 'risks' as const, data: null, progress: 60 });
      })
    );

    const obligations$ = session$.pipe(
      switchMap(() => this.withRetryAndNotify$(
        'obligations',
        this.promptService.extractObligations$(parsedContract.text, geminiOutputLanguage).pipe(
          switchMap(obligations => needsPostTranslation && outputLanguage
            ? defer(() => from(this.translationUtility.translateObligations(obligations, outputLanguage)))
            : of(obligations)
          )
        ),
        80
      )),
      tap(result => {
        if (!result.isRetrying) {
          this.logger.info('Obligations complete', result);
        }
      }),
      catchError(error => {
        this.logger.error('Obligations extraction failed after retries:', error);
        // Return null data - UI will show error message
        return of({ section: 'obligations' as const, data: null, progress: 80 });
      })
    );

    const omissionsAndQuestions$ = session$.pipe(
      switchMap(() => this.withRetryAndNotify$(
        'omissionsAndQuestions',
        this.promptService.extractOmissionsAndQuestions$(parsedContract.text, geminiOutputLanguage).pipe(
          switchMap(omissionsAndQuestions => needsPostTranslation && outputLanguage
            ? defer(() => from(this.translationUtility.translateOmissionsAndQuestions(omissionsAndQuestions, outputLanguage)))
            : of(omissionsAndQuestions)
          )
        ),
        90
      )),
      tap(result => {
        if (!result.isRetrying) {
          this.logger.info('Omissions/Questions complete', result);
        }
      }),
      catchError(error => {
        this.logger.error('Omissions/Questions extraction failed after retries:', error);
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
  ): Observable<AnalysisStreamingResult> {
    const finalTargetLanguage = targetLanguage || originalLanguage;
    
    // Check if target language is supported by Gemini Nano for output
    const isTargetLanguageSupported = isGeminiNanoSupported(finalTargetLanguage);
    const geminiOutputLanguage = isTargetLanguageSupported ? finalTargetLanguage : LANGUAGES.ENGLISH;
    const needsPostTranslation = !isTargetLanguageSupported && finalTargetLanguage !== LANGUAGES.ENGLISH;
    
    this.logger.info(`Pre-translation Flow - Original: ${originalLanguage}, Target: ${finalTargetLanguage}, Gemini Output: ${geminiOutputLanguage}, Post-translate: ${needsPostTranslation}`);
    
    // Step 1: Pre-translate contract to English
    this.logger.info(`Starting translation: ${originalLanguage} → ${LANGUAGES.ENGLISH}`);
    this.logger.info(`Original text preview: "${parsedContract.text.substring(0, 200)}..."`);
    
    const translatedContract$ = defer(() => 
      from(this.translator.translate(parsedContract.text, originalLanguage, LANGUAGES.ENGLISH))
    ).pipe(
      tap(translatedText => {
        this.logger.info(`Contract translated to English (${translatedText.length} chars)`);
        this.logger.info(`Translated text preview: "${translatedText.substring(0, 200)}..."`);
      }),
      catchError(error => {
        this.logger.error('Pre-translation failed:', error);
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
        this.logger.info(`Sending to Gemini Nano with outputLanguage: ${geminiOutputLanguage}`);
        this.logger.info(`Text being analyzed (preview): "${translatedText.substring(0, 200)}..."`);
        return session$.pipe(
          switchMap(() => this.promptService.extractMetadata$(
            translatedText,
            analysisContext.userRole || undefined,
            geminiOutputLanguage  // Get results in target language if supported, otherwise English
          ))
        );
      }),
      // Cache English metadata BEFORE post-translation
      tap(englishMetadata => {
        if (needsPostTranslation) {
          this.cacheIntermediateEnglishSection(contract.id, 'metadata', englishMetadata);
        }
      }),
      // Step 4: Post-translate metadata if target language is not supported by Gemini
      switchMap(metadata => needsPostTranslation
        ? defer(() => from(this.translationUtility.translateMetadata(metadata, finalTargetLanguage)))
        : of(metadata)
      ),
      map(metadata => ({
        section: 'metadata' as const,
        data: metadata,
        progress: 20,
        resultLanguage: needsPostTranslation ? finalTargetLanguage : geminiOutputLanguage  // Track actual language of results
      })),
      tap(result => this.logger.info('Metadata complete (pre-translated)', result)),
      catchError(error => {
        this.logger.error('Metadata extraction failed:', error);
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
      // Cache English Quick Take BEFORE post-translation
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
            // Cache English summary BEFORE post-translation
            tap(englishSummary => {
              if (needsPostTranslation) {
                this.cacheIntermediateEnglishSection(contract.id, 'summary', englishSummary);
              }
            }),
            switchMap(summary => needsPostTranslation
              ? defer(() => from(this.translationUtility.translateSummary(summary, finalTargetLanguage)))
              : of(summary)
            )
          ),
          40
        ))
      )),
      catchError(error => {
        this.logger.error('Structured summary extraction failed after retries:', error);
        return of({ section: 'summary' as const, data: null, progress: 40 });
      })
    );

    // COMBINE: Merge quick take with structured summary
    const summary$ = combineLatest([quickTakePreTranslate$, structuredSummaryPreTranslate$]).pipe(
      map(([quickTake, structuredResult]) => ({
        section: structuredResult.section,
        data: structuredResult.data ? {
          ...structuredResult.data as Record<string, unknown>,
          quickTake: quickTake || undefined // Add quick take to result (or undefined if failed)
        } : null,
        progress: structuredResult.progress,
        isRetrying: (structuredResult as any).isRetrying ?? false,
        retryCount: (structuredResult as any).retryCount ?? undefined
      })),
      tap(result => {
        if (!result.isRetrying) {
          this.logger.info('Hybrid summary complete (pre-translated + post-translated)', result);
        }
      })
    );

    const risks$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.withRetryAndNotify$(
          'risks',
          this.promptService.extractRisks$(translatedText, geminiOutputLanguage).pipe(
            // Cache English risks BEFORE post-translation
            tap(englishRisks => {
              if (needsPostTranslation) {
                this.cacheIntermediateEnglishSection(contract.id, 'risks', englishRisks);
              }
            }),
            switchMap(risks => needsPostTranslation
              ? defer(() => from(this.translationUtility.translateRisks(risks, finalTargetLanguage)))
              : of(risks)
            )
          ),
          60
        ))
      )),
      tap(result => {
        if (!result.isRetrying) {
          this.logger.info('Risks complete (pre-translated + post-translated)', result);
        }
      }),
      catchError(error => {
        this.logger.error('Risks extraction failed after retries:', error);
        return of({ section: 'risks' as const, data: null, progress: 60 });
      })
    );

    const obligations$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.withRetryAndNotify$(
          'obligations',
          this.promptService.extractObligations$(translatedText, geminiOutputLanguage).pipe(
            // Cache English obligations BEFORE post-translation
            tap(englishObligations => {
              if (needsPostTranslation) {
                this.cacheIntermediateEnglishSection(contract.id, 'obligations', englishObligations);
              }
            }),
            switchMap(obligations => needsPostTranslation
              ? defer(() => from(this.translationUtility.translateObligations(obligations, finalTargetLanguage)))
              : of(obligations)
            )
          ),
          80
        ))
      )),
      tap(result => {
        if (!result.isRetrying) {
          this.logger.info('Obligations complete (pre-translated + post-translated)', result);
        }
      }),
      catchError(error => {
        this.logger.error('Obligations extraction failed after retries:', error);
        return of({ section: 'obligations' as const, data: null, progress: 80 });
      })
    );

    const omissionsAndQuestions$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.withRetryAndNotify$(
          'omissionsAndQuestions',
          this.promptService.extractOmissionsAndQuestions$(translatedText, geminiOutputLanguage).pipe(
            // Cache English omissions/questions BEFORE post-translation
            tap(englishOmissions => {
              if (needsPostTranslation) {
                this.cacheIntermediateEnglishSection(contract.id, 'omissionsAndQuestions', englishOmissions);
              }
            }),
            switchMap(omissionsAndQuestions => needsPostTranslation
              ? defer(() => from(this.translationUtility.translateOmissionsAndQuestions(omissionsAndQuestions, finalTargetLanguage)))
              : of(omissionsAndQuestions)
            )
          ),
          90
        ))
      )),
      tap(result => {
        if (!result.isRetrying) {
          this.logger.info('✅ Omissions/Questions complete (pre-translated + post-translated)', result);
        }
      }),
      catchError(error => {
        this.logger.error('Omissions/Questions extraction failed after retries:', error);
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
   * ========================================
   * Post-Translation Helper Methods
   * ========================================
   * Translate English analysis results to target language
   */




  /**
   * Cache intermediate English section during pre-translation
   * Stores English results BEFORE they're post-translated
   * This enables future language switching without re-analysis
   */
  private cacheIntermediateEnglishSection(
    contractId: string,
    section: 'metadata' | 'summary' | 'risks' | 'obligations' | 'omissionsAndQuestions' | 'quickTake',
    data: AnalysisData | string
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
          // Store quickTake as part of summary structure for consistency
          if (existingCache.summary && typeof existingCache.summary === 'object') {
            // If summary already exists, add quickTake to the nested summary object
            if (!existingCache.summary.summary) {
              existingCache.summary.summary = {};
            }
            (existingCache.summary.summary as any).quickTake = data;
          } else {
            // If no summary yet, create a partial summary structure with quickTake
            existingCache.summary = {
              summary: {
                quickTake: data,
                keyResponsibilities: [],
                compensation: { baseSalary: null, bonus: null, equity: null, other: null },
                benefits: [],
                termination: { atWill: null, forCause: null, severance: null, noticeRequired: null },
                restrictions: { confidentiality: null, nonCompete: null, nonSolicitation: null, intellectualProperty: null, other: null }
              }
            };
          }
          break;
      }
      
      // Store incremental English results
      this.translationCache.storeAnalysis(contractId, 'en', existingCache);
      this.logger.info(`💾 [Pre-translation Cache] Stored English ${section} (before post-translation)`);
    } catch (error) {
      // Don't fail pipeline if caching fails
      this.logger.warn(`⚠️ [Pre-translation Cache] Failed to cache English ${section}:`, error);
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
      this.logger.info(`💾 [Offline Storage] Saved analysis for contract: ${contract.id}`);
    } catch (error) {
      this.logger.warn(`⚠️ [Offline Storage] Failed to save analysis:`, error);
      // Don't fail the analysis pipeline if offline storage fails
    }
  }



}