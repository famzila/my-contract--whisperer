import { Injectable, inject } from '@angular/core';
import { Observable, of, merge, concat, defer, from, EMPTY, map, tap, catchError, switchMap, shareReplay, takeUntil } from 'rxjs';
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
      switchMap(() => this.promptService.extractSummary$(parsedContract.text, outputLanguage)),
      map(summary => ({
        section: 'summary' as const,
        data: summary,
        progress: 40
      })),
      tap(result => console.log('✅ Summary complete', result)),
      catchError(error => {
        console.error('❌ Summary extraction failed:', error);
        // Return null data - UI will show error message
        return of({ section: 'summary' as const, data: null, progress: 40 });
      })
    );

    const risks$ = session$.pipe(
      switchMap(() => this.promptService.extractRisks$(parsedContract.text, outputLanguage)),
      map(risks => ({
        section: 'risks' as const,
        data: risks,
        progress: 60
      })),
      tap(result => console.log('✅ Risks complete', result)),
      catchError(error => {
        console.error('❌ Risks extraction failed:', error);
        // Return null data - UI will show error message
        return of({ section: 'risks' as const, data: null, progress: 60 });
      })
    );

    const obligations$ = session$.pipe(
      switchMap(() => this.promptService.extractObligations$(parsedContract.text, outputLanguage)),
      map(obligations => ({
        section: 'obligations' as const,
        data: obligations,
        progress: 80
      })),
      tap(result => console.log('✅ Obligations complete', result)),
      catchError(error => {
        console.error('❌ Obligations extraction failed:', error);
        // Return null data - UI will show error message
        return of({ section: 'obligations' as const, data: null, progress: 80 });
      })
    );

    const omissionsAndQuestions$ = session$.pipe(
      switchMap(() => this.promptService.extractOmissionsAndQuestions$(parsedContract.text, outputLanguage)),
      map(omissionsAndQuestions => ({
        section: 'omissionsAndQuestions' as const,
        data: omissionsAndQuestions,
        progress: 90
      })),
      tap(result => console.log('✅ Omissions/Questions complete', result)),
      catchError(error => {
        console.error('❌ Omissions/Questions extraction failed:', error);
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

    // Step 3: Extract all sections in English (we'll translate results later if needed)
    const metadata$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.promptService.extractMetadata$(
          translatedText,
          analysisContext.userRole || undefined,
          LANGUAGES.ENGLISH  // Get results in English
        ))
      )),
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
        switchMap(() => this.promptService.extractSummary$(translatedText, LANGUAGES.ENGLISH))
      )),
      map(summary => ({
        section: 'summary' as const,
        data: summary,
        progress: 40
      })),
      tap(result => console.log('✅ Summary complete (pre-translated)', result)),
      catchError(error => {
        console.error('❌ Summary extraction failed:', error);
        return of({ section: 'summary' as const, data: null, progress: 40 });
      })
    );

    const risks$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.promptService.extractRisks$(translatedText, LANGUAGES.ENGLISH))
      )),
      map(risks => ({
        section: 'risks' as const,
        data: risks,
        progress: 60
      })),
      tap(result => console.log('✅ Risks complete (pre-translated)', result)),
      catchError(error => {
        console.error('❌ Risks extraction failed:', error);
        return of({ section: 'risks' as const, data: null, progress: 60 });
      })
    );

    const obligations$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.promptService.extractObligations$(translatedText, LANGUAGES.ENGLISH))
      )),
      map(obligations => ({
        section: 'obligations' as const,
        data: obligations,
        progress: 80
      })),
      tap(result => console.log('✅ Obligations complete (pre-translated)', result)),
      catchError(error => {
        console.error('❌ Obligations extraction failed:', error);
        return of({ section: 'obligations' as const, data: null, progress: 80 });
      })
    );

    const omissionsAndQuestions$ = translatedContract$.pipe(
      switchMap(translatedText => session$.pipe(
        switchMap(() => this.promptService.extractOmissionsAndQuestions$(translatedText, LANGUAGES.ENGLISH))
      )),
      map(omissionsAndQuestions => ({
        section: 'omissionsAndQuestions' as const,
        data: omissionsAndQuestions,
        progress: 90
      })),
      tap(result => console.log('✅ Omissions/Questions complete (pre-translated)', result)),
      catchError(error => {
        console.error('❌ Omissions/Questions extraction failed:', error);
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