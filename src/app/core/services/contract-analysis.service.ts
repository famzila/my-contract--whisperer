import { Injectable, inject } from '@angular/core';
import { Observable, of, merge, concat, defer, from, EMPTY, map, tap, catchError, switchMap, shareReplay, takeUntil, retry, timer, Subject } from 'rxjs';
import { ContractParserService, ParsedContract } from './contract-parser.service';
import { AiOrchestratorService } from './ai/ai-orchestrator.service';
import { PromptService } from './ai/prompt.service';
import { TranslationOrchestratorService } from './translation-orchestrator.service';
import { TranslatorService } from './ai/translator.service';
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
  private parser = inject(ContractParserService);
  private translationOrchestrator = inject(TranslationOrchestratorService);
  private translator = inject(TranslatorService);

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
    return this.analyzeDirectly$(parsedContract, analysisContext, outputLanguage, contractLanguage);
  }

  /**
   * Analyze contract directly (language supported by Gemini Nano)
   */
  private analyzeDirectly$(
    parsedContract: ParsedContract,
    analysisContext: AnalysisContext,
    outputLanguage: string | undefined,
    contractLanguage: string
  ): Observable<{
    section: 'metadata' | 'summary' | 'risks' | 'obligations' | 'omissionsAndQuestions' | 'complete';
    data: any;
    progress: number;
  }> {
    // Create session once and share it
    const session$ = of(null).pipe(
      tap(() => console.log(`🚀 Starting direct analysis${outputLanguage ? ` (output: ${outputLanguage})` : ''}...`)),
      switchMap(() => this.promptService.createSession({ 
        userRole: analysisContext.userRole || null,
        contractLanguage: contractLanguage,
        outputLanguage: outputLanguage
      })),
      shareReplay(1)
    );

    // PRIORITY 1: Metadata (must complete first)
    const metadata$ = session$.pipe(
      switchMap(() => this.promptService.extractMetadata$(
        parsedContract.text,
        analysisContext.userRole || undefined,
        outputLanguage
      )),
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

    // STREAMING: Summary, Risks, Obligations, Omissions (all independent)
    const summary$ = session$.pipe(
      switchMap(() => this.withRetryAndNotify$(
        'summary',
        this.promptService.extractSummary$(parsedContract.text, outputLanguage),
        40
      )),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Summary complete', result);
        }
      }),
      catchError(error => {
        console.error('❌ Summary extraction failed after retries:', error);
        // Return null data - UI will show error message
        return of({ section: 'summary' as const, data: null, progress: 40 });
      })
    );

    const risks$ = session$.pipe(
      switchMap(() => this.withRetryAndNotify$(
        'risks',
        this.promptService.extractRisks$(parsedContract.text, outputLanguage),
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
        this.promptService.extractObligations$(parsedContract.text, outputLanguage),
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
        this.promptService.extractOmissionsAndQuestions$(parsedContract.text, outputLanguage),
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
    const needsPostTranslation = finalTargetLanguage !== LANGUAGES.ENGLISH;
    
    console.log(`📋 [Pre-translation Flow] Original: ${originalLanguage}, Target: ${finalTargetLanguage}, Post-translate: ${needsPostTranslation}`);
    
    // Step 1: Pre-translate contract to English
    const translatedContract$ = defer(() => 
      from(this.translator.translate(parsedContract.text, originalLanguage, LANGUAGES.ENGLISH))
    ).pipe(
      tap(translatedText => console.log(`✅ [Pre-translation] Contract translated to English (${translatedText.length} chars)`)),
      catchError(error => {
        console.error('❌ [Pre-translation] Failed:', error);
        throw new Error(`Pre-translation failed: ${error.message}`);
      }),
      shareReplay(1)
    );

    // Step 2: Analyze in English (Gemini Nano only supports en, es, ja output)
    const session$ = translatedContract$.pipe(
      switchMap(() => this.promptService.createSession({ 
        userRole: analysisContext.userRole || null,
        contractLanguage: LANGUAGES.ENGLISH,
        outputLanguage: LANGUAGES.ENGLISH  // Must use English output for pre-translated contracts
      })),
      shareReplay(1)
    );

    // Step 3: Extract all sections in English, then post-translate if needed
    const metadata$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.promptService.extractMetadata$(
          translatedText,
          analysisContext.userRole || undefined,
          LANGUAGES.ENGLISH  // Get results in English
        ))
      )),
      // Step 4: Post-translate metadata if target language is not English
      switchMap(metadata => needsPostTranslation
        ? defer(() => from(this.postTranslateMetadata(metadata, finalTargetLanguage)))
        : of(metadata)
      ),
      map(metadata => ({
        section: 'metadata' as const,
        data: metadata,
        progress: 20
      })),
      tap(result => console.log('✅ Metadata complete (pre-translated)', result)),
      catchError(error => {
        console.error('❌ Metadata extraction failed:', error);
        throw error;
      })
    );

    const summary$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.withRetryAndNotify$(
          'summary',
          this.promptService.extractSummary$(translatedText, LANGUAGES.ENGLISH).pipe(
            switchMap(summary => needsPostTranslation
              ? defer(() => from(this.postTranslateSummary(summary, finalTargetLanguage)))
              : of(summary)
            )
          ),
          40
        ))
      )),
      tap(result => {
        if (!result.isRetrying) {
          console.log('✅ Summary complete (pre-translated + post-translated)', result);
        }
      }),
      catchError(error => {
        console.error('❌ Summary extraction failed after retries:', error);
        return of({ section: 'summary' as const, data: null, progress: 40 });
      })
    );

    const risks$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.withRetryAndNotify$(
          'risks',
          this.promptService.extractRisks$(translatedText, LANGUAGES.ENGLISH).pipe(
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
          this.promptService.extractObligations$(translatedText, LANGUAGES.ENGLISH).pipe(
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
          this.promptService.extractOmissionsAndQuestions$(translatedText, LANGUAGES.ENGLISH).pipe(
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

  private async postTranslateMetadata(
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

  private async postTranslateSummary(
    summary: Schemas.ContractSummary,
    targetLanguage: string
  ): Promise<Schemas.ContractSummary> {
    console.log(`🌍 [Post-translation] Translating summary to ${targetLanguage}...`);
    
    return {
      summary: {
        parties: await this.translator.translateFromEnglish(summary.summary.parties, targetLanguage),
        role: await this.translator.translateFromEnglish(summary.summary.role, targetLanguage),
        responsibilities: await Promise.all(
          summary.summary.responsibilities.map((r: string) => this.translator.translateFromEnglish(r, targetLanguage))
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
        },
        restrictions: {
          confidentiality: summary.summary.restrictions.confidentiality ? await this.translator.translateFromEnglish(summary.summary.restrictions.confidentiality, targetLanguage) : null,
          nonCompete: summary.summary.restrictions.nonCompete ? await this.translator.translateFromEnglish(summary.summary.restrictions.nonCompete, targetLanguage) : null,
          nonSolicitation: summary.summary.restrictions.nonSolicitation ? await this.translator.translateFromEnglish(summary.summary.restrictions.nonSolicitation, targetLanguage) : null,
          other: summary.summary.restrictions.other ? await this.translator.translateFromEnglish(summary.summary.restrictions.other, targetLanguage) : null,
        },
      },
    };
  }

  private async postTranslateRisks(
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

  private async postTranslateObligations(
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

  private async postTranslateOmissionsAndQuestions(
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

}