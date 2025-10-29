/**
 * Contract Store - NgRx SignalStore
 * Manages contract data and progressive analysis loading with RxJS streaming
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods, withHooks } from '@ngrx/signals';
import { computed, inject, NgZone } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { LoggerService } from '../services/logger.service';
import { TranslationUtilityService } from '../services/translation-utility.service';
import { mapPartyRoleToUserRole } from '../utils/role.util';
import type { Contract } from '../models/contract.model';
import type { 
  ContractMetadata, 
  RiskItem,
  Obligations,
  Omission,
  ContractSummary,
  CompleteAnalysis
} from '../schemas/analysis-schemas';
import * as Schemas from '../schemas/analysis-schemas';
import { ContractAnalysisService } from '../services/contract-analysis.service';
import { ContractParserService } from '../services/contract-parser.service';
import { ParsedContract } from '../models/contract.model';
import { ContractValidationService } from '../services/contract-validation.service';
import { PartyExtractionService } from '../services/party-extraction.service';
import { TranslationCacheService } from '../services/translation-cache.service';
import { AiOrchestratorService } from '../services/ai/ai-orchestrator.service';
import { LanguageStore } from './language.store';
import { OnboardingStore } from './onboarding.store';
import { AppConfig } from '../config/application.config';
import { isGeminiNanoSupported } from '../utils/language.util';
import { MOCK_CONTRACT, MOCK_LEASE_DATA } from '../../../../public/mocks/mock-analysis.data';

/**
 * Section loading state for progressive analysis with proper typing
 */
interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retryCount?: number;
  isRetrying?: boolean;
}

/**
 * Contract store state shape
 */
interface ContractState {
  // Current contract
  contract: Contract | null;
  
  // Loading states
  isUploading: boolean;
  isAnalyzing: boolean;
  isDone: boolean;  // True when analysis is complete and cached in localStorage
  
  // Error handling
  uploadError: string | null;
  analysisError: string | null;
  
  // Progressive loading with proper types
  analysisProgress: number; // 0-100%
  sectionsMetadata: SectionState<ContractMetadata> | null;
  sectionsSummary: SectionState<ContractSummary> | null;
  sectionsRisks: SectionState<RiskItem[]> | null;
  sectionsObligations: SectionState<Obligations> | null;
  sectionsOmissions: SectionState<Omission[]> | null;
  sectionsQuestions: SectionState<string[]> | null;
  
  // Translation state
  isTranslating: boolean;
  translatingToLanguage: string | null;
  
  // RxJS streaming cleanup
  destroySubject: Subject<void> | null;
}

/**
 * Initial state - clean production state
 * Mock data is loaded via onInit hook if needed
 */
const initialState: ContractState = {
  contract: null,
  isUploading: false,
  isAnalyzing: false,
  isDone: false,
  uploadError: null,
  analysisError: null,
  analysisProgress: 0,
  sectionsMetadata: null,
  sectionsSummary: null,
  sectionsRisks: null,
  sectionsObligations: null,
  sectionsOmissions: null,
  sectionsQuestions: null,
  isTranslating: false,
  translatingToLanguage: null,
  destroySubject: null,
};

/**
 * Contract Store
 */
/**
 * Select the best source language for translation
 * Prefers direct-from-Gemini languages (en, es, ja) over translated ones
 */
function selectBestSourceLanguage(availableLanguages: string[], targetLanguage: string): string {
  // Prefer English if available (most common direct-from-Gemini language)
  if (availableLanguages.includes('en')) {
    return 'en';
  }
  
  // Prefer other Gemini-supported languages
  const geminiSupported = ['es', 'ja'];
  for (const lang of geminiSupported) {
    if (availableLanguages.includes(lang)) {
      return lang;
    }
  }
  
  // Otherwise use the first available
  return availableLanguages[0];
}

export const ContractStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  // Computed values derived from state
  withComputed(({ 
    contract, 
    isUploading, 
    isAnalyzing, 
    uploadError, 
    analysisError,
    sectionsMetadata,
    sectionsSummary,
    sectionsRisks,
    sectionsObligations,
      sectionsOmissions,
      sectionsQuestions,
    isTranslating,
    translatingToLanguage,
  }) => ({
    // Check if contract is loaded
    hasContract: computed(() => contract() !== null),
    
    // Check if we have enough data to show the dashboard (metadata is sufficient for progressive loading)
    canShowDashboard: computed(() => contract() !== null && sectionsMetadata()?.data !== null),
    
    // Check if currently loading (upload or initial metadata extraction)
    isLoading: computed(() => isUploading() || isAnalyzing()),
    
    // Check if there are any errors
    hasError: computed(() => uploadError() !== null || analysisError() !== null),
    
    // Check if any section is still loading (for progressive display)
    isAnySectionLoading: computed(() => {
      const meta = sectionsMetadata();
      const summary = sectionsSummary();
      const risks = sectionsRisks();
      const oblig = sectionsObligations();
      const omiss = sectionsOmissions();
      const questions = sectionsQuestions();
      return meta?.loading || summary?.loading || risks?.loading || oblig?.loading || omiss?.loading || questions?.loading || false;
    }),
  })),
  
  // Methods to update state
  // 👇 Inject services within withMethods (proper store pattern)
  withMethods((
    store, 
    analysisService = inject(ContractAnalysisService), 
    parserService = inject(ContractParserService),
    languageStore = inject(LanguageStore),
    onboardingStore = inject(OnboardingStore),
    validationService = inject(ContractValidationService),
    partyExtractionService = inject(PartyExtractionService),
    translationCache = inject(TranslationCacheService),
    translationUtility = inject(TranslationUtilityService),
    aiOrchestrator = inject(AiOrchestratorService),
    translate = inject(TranslateService),
    router = inject(Router),
    ngZone = inject(NgZone),
    logger = inject(LoggerService)
  ) => ({
    /**
     * Check Chrome AI services availability
     */
    async checkAiAvailability() {
      try {
        const status = await aiOrchestrator.checkAvailability();
        return status;
      } catch (error) {
        logger.error('Failed to check AI availability', error);
        throw error;
      }
    },

    /**
     * Set contract
     */
    setContract: (contract: Contract) => {
      patchState(store, { 
        contract, 
        isUploading: false, 
        uploadError: null 
      });
    },
    
    /**
     * Set uploading state
     */
    setUploading: (isUploading: boolean) => {
      patchState(store, { isUploading });
    },
    
    /**
     * Set analyzing state
     */
    setAnalyzing: (isAnalyzing: boolean) => {
      patchState(store, { isAnalyzing });
    },
    
    /**
     * Set upload error
     */
    setUploadError: (uploadError: string) => {
      patchState(store, { uploadError, isUploading: false });
    },
    
    /**
     * Set analysis error
     */
    setAnalysisError: (analysisError: string) => {
      patchState(store, { analysisError, isAnalyzing: false });
    },
    
    /**
     * Clear all errors
     */
    clearErrors: () => {
      patchState(store, { uploadError: null, analysisError: null });
    },
    
    /**
     * Parse and analyze a file with full onboarding flow
     */
    async parseAndAnalyzeFile(file: File): Promise<void> {
      patchState(store, { isUploading: true, uploadError: null });

      try {
                // Step 1: Parse the file
                logger.info('\n📄 [Upload] Parsing file...');
                const parsedContract = await parserService.parseFile(file);
                
                // Step 2: Validate contract
                logger.info('✅ [Validation] Checking if document is a contract...');
                onboardingStore.setProcessing(true);
                const validationResult = await validationService.validateContract(parsedContract.text);
        
        if (!validationResult.isContract) {
          // Not a contract - update onboarding store
          onboardingStore.setValidationResult(
            false,
            validationResult.documentType || 'Unknown Document',
            validationResult.reason
          );
          patchState(store, { 
            uploadError: translate.instant('errors.notAValidContract'),
            isUploading: false,
          });
          throw new Error(translate.instant('errors.notAContract', { reason: validationResult.reason }));
        }
        
        // Valid contract!
        onboardingStore.setValidationResult(true, validationResult.documentType || 'Contract');
        
        // Step 3 & 4: Run language detection and party extraction IN PARALLEL for speed
        logger.info('🚀 [Onboarding] Running language detection and party extraction in parallel...');
        
        // Set user's preferred language in onboarding store BEFORE detecting contract language
        onboardingStore.setUserPreferredLanguage(languageStore.preferredLanguage());
        
        const [detectedLang, partyResult] = await Promise.all([
          languageStore.detectContractLanguage(parsedContract.text),
          partyExtractionService.extractParties(parsedContract.text)
        ]);
        
        logger.info('✅ [Onboarding] Parallel tasks completed:', { detectedLang, partyResult });
        
        // Update stores with results
        onboardingStore.setDetectedLanguage(detectedLang);
        onboardingStore.setDetectedParties(partyResult);
        
        // CRITICAL: Check for multi-party contracts (app limitation)
        if (partyResult.contractType === 'multilateral') {
          logger.warn('⚠️ [Validation] Multi-party contract detected - app limitation');
          onboardingStore.setValidationResult(
            false,
            'Multi-Party Contract',
            translate.instant('errors.multiPartyContract')
          );
          patchState(store, { 
            uploadError: translate.instant('errors.multiPartyContract'),
            isUploading: false,
          });
          throw new Error(translate.instant('errors.multiPartyContract'));
        }
        
        onboardingStore.setProcessing(false);
        
        // CRITICAL: If language matches, auto-select to skip modal
        if (detectedLang === languageStore.preferredLanguage()) {
          logger.info(`✅ [Onboarding] Language auto-match: ${detectedLang} - Auto-selecting`);
          onboardingStore.setSelectedLanguage(detectedLang);
        }
        
        // Step 5: Store parsed contract and wait for user to select language/role
        onboardingStore.setPendingContract(parsedContract.text);
        patchState(store, { isUploading: false });
        logger.info('✅ Contract validated, language detected, and parties extracted.');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : translate.instant('errors.analysisFailed');
        logger.error('File parsing failed:', error); // Log technical details for debugging
        onboardingStore.setProcessing(false);
        patchState(store, { 
          uploadError: errorMessage,
          isUploading: false,
        });
        throw error;
      }
    },
    
    /**
     * Parse and analyze text input with full onboarding flow
     */
    async parseAndAnalyzeText(text: string, source: string = 'manual-input'): Promise<void> {
      patchState(store, { isUploading: true, uploadError: null });

      try {
        // Step 1: Parse the text
        logger.info('\n📄 [Upload] Parsing text...');
        const parsedContract = parserService.parseText(text, source);
        
        // Step 2: Validate contract
        logger.info('✅ [Validation] Checking if document is a contract...');
        onboardingStore.setProcessing(true);
        const validationResult = await validationService.validateContract(parsedContract.text);
        
        if (!validationResult.isContract) {
          // Not a contract - update onboarding store
          onboardingStore.setValidationResult(
            false,
            validationResult.documentType || 'Unknown Document',
            validationResult.reason
          );
          patchState(store, { 
            uploadError: translate.instant('errors.notAValidContract'),
            isUploading: false,
          });
          throw new Error(translate.instant('errors.notAContract', { reason: validationResult.reason }));
        }
        
        // Valid contract!
        onboardingStore.setValidationResult(true, validationResult.documentType || 'Contract');
        
        // Step 3 & 4: Run language detection and party extraction IN PARALLEL for speed
        logger.info('🚀 [Onboarding] Running language detection and party extraction in parallel...');
        
        // Set user's preferred language in onboarding store BEFORE detecting contract language
        onboardingStore.setUserPreferredLanguage(languageStore.preferredLanguage());
        
        const [detectedLang, partyResult] = await Promise.all([
          languageStore.detectContractLanguage(parsedContract.text),
          partyExtractionService.extractParties(parsedContract.text)
        ]);
        
        logger.info('✅ [Onboarding] Parallel tasks completed:', { detectedLang, partyResult });
        
        // Update stores with results
        onboardingStore.setDetectedLanguage(detectedLang);
        onboardingStore.setDetectedParties(partyResult);
        
        // CRITICAL: Check for multi-party contracts (app limitation)
        if (partyResult.contractType === 'multilateral') {
          logger.warn('⚠️ [Validation] Multi-party contract detected - app limitation');
          onboardingStore.setValidationResult(
            false,
            'Multi-Party Contract',
            translate.instant('errors.multiPartyContract')
          );
          patchState(store, { 
            uploadError: translate.instant('errors.multiPartyContract'),
            isUploading: false,
          });
          throw new Error(translate.instant('errors.multiPartyContract'));
        }
        
        onboardingStore.setProcessing(false);
        
        // CRITICAL: If language matches, auto-select to skip modal
        if (detectedLang === languageStore.preferredLanguage()) {
          logger.info(`✅ [Onboarding] Language auto-match: ${detectedLang} - Auto-selecting`);
          onboardingStore.setSelectedLanguage(detectedLang);
        }
        
        // Step 5: Store parsed contract and wait for user to select language/role
        onboardingStore.setPendingContract(parsedContract.text);
        patchState(store, { isUploading: false });
        logger.info('✅ Contract validated, language detected, and parties extracted.');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : translate.instant('errors.analysisFailed');
        logger.error('Text parsing failed:', error); // Log technical details for debugging
        onboardingStore.setProcessing(false);
        patchState(store, { 
          uploadError: errorMessage,
          isUploading: false,
        });
        throw error;
      }
    },
    
    /**
     * Analyze contract with RxJS streaming
     * 
     * Progressive loading flow:
     * 1. Metadata extracted first (priority 1) - triggers navigation to dashboard
     * 2. Summary, Risks, Obligations, Omissions/Questions stream independently
     * 3. Each section displays as soon as it completes (no waiting for all)
     * 
     * The dashboard shows skeleton loaders for pending sections.
     */
    async analyzeContract(parsedContract: ParsedContract): Promise<void> {
      patchState(store, { isUploading: true, uploadError: null });

      try {
        // Clean up any existing stream
        if (store.destroySubject()) {
          store.destroySubject()!.next();
          store.destroySubject()!.complete();
        }

        // Create new destroy subject for this analysis
        const destroySubject = new Subject<void>();
        patchState(store, { destroySubject });

        // Initialize progressive loading state
        patchState(store, { 
          isAnalyzing: true, 
          isDone: false,
          analysisError: null,
          analysisProgress: 0,
          sectionsMetadata: { data: null, loading: true, error: null },
          sectionsSummary: { data: null, loading: true, error: null },
          sectionsRisks: { data: null, loading: true, error: null },
          sectionsObligations: { data: null, loading: true, error: null },
          sectionsOmissions: { data: null, loading: true, error: null },
          sectionsQuestions: { data: null, loading: true, error: null },
        });
        
        // Step 1: Detect contract language
        logger.info('🌍 Detecting contract language...');
        languageStore.detectContractLanguage(parsedContract.text);
        
        // Step 2: Build analysis context
        const detectedParties = onboardingStore.detectedParties();
        const contractLang = languageStore.detectedContractLanguage() || 'en';
        
        logger.info('\n📋 [Analysis Context] Building context...');
        logger.info('  📄 Contract language:', contractLang);
        logger.info('  🎯 User selected output language:', onboardingStore.selectedOutputLanguage());
        
        const analysisContext = {
          contractLanguage: contractLang,
          userPreferredLanguage: languageStore.preferredLanguage(),
          analyzedInLanguage: onboardingStore.selectedOutputLanguage() || languageStore.preferredLanguage(),
          userRole: onboardingStore.selectedRole(),
          detectedParties: detectedParties?.parties && detectedParties.parties.party1 && detectedParties.parties.party2
            ? { 
                party1: detectedParties.parties.party1,
                party2: detectedParties.parties.party2
              }
            : undefined,
        };
        
        // Create contract object
        const contract: Contract = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          text: parsedContract.text,
          fileName: parsedContract.fileName,
          fileSize: parsedContract.fileSize,
          fileType: parsedContract.fileType,
          uploadedAt: parsedContract.parsedAt,
          wordCount: parsedContract.text.split(/\s+/).length,
          estimatedReadingTime: Math.ceil(parsedContract.text.split(/\s+/).length / 200),
        };
        
        // Step 3: Start RxJS streaming analysis
        logger.info('🚀 Starting RxJS streaming analysis...');
        
        analysisService.analyzeContractStreaming$(
          parsedContract,
          analysisContext,
          contract
        ).pipe(
          takeUntil(destroySubject)
        ).subscribe({
          next: (result) => {
            logger.info(`📦 [Stream] ${result.section} ${result.isRetrying ? 'retrying' : 'completed'}:`, result);
            
            // Update specific section as it completes or retries
            switch (result.section) {
              case 'metadata':
                patchState(store, {
                  sectionsMetadata: { data: result.data as ContractMetadata | null, loading: false, error: null },
                  analysisProgress: result.progress,
                  contract, // Store contract immediately with metadata
                  isUploading: false, // Clear upload state - we're navigating away!
                  isAnalyzing: false, // Stop blocking loader - analysis continues via progressive UI!
                });
                
                // 🚀 NAVIGATE TO ANALYSIS PAGE IMMEDIATELY!
                // Dashboard will show metadata + skeleton loaders for other sections
                // Analysis continues in background, shown via skeleton loaders (not blocking overlay)
                
                // Run navigation inside Angular zone to ensure it's detected
                ngZone.run(() => {
                  router.navigate(['/analysis'], { 
                    skipLocationChange: false,
                    replaceUrl: false 
                  });
                });
                break;
              
              case 'summary':
                patchState(store, {
                  sectionsSummary: { 
                    data: result.data as ContractSummary | null, 
                    loading: result.isRetrying || false, 
                    error: null,
                    retryCount: result.retryCount,
                    isRetrying: result.isRetrying
                  },
                  analysisProgress: result.progress,
                });
                break;
              
              case 'risks':
                patchState(store, {
                  sectionsRisks: { 
                    data: result.data as RiskItem[] | null, 
                    loading: result.isRetrying || false, 
                    error: null,
                    retryCount: result.retryCount,
                    isRetrying: result.isRetrying
                  },
                  analysisProgress: result.progress,
                });
                break;
              
              case 'obligations':
                patchState(store, {
                  sectionsObligations: { 
                    data: result.data as Obligations | null, 
                    loading: result.isRetrying || false, 
                    error: null,
                    retryCount: result.retryCount,
                    isRetrying: result.isRetrying
                  },
                  analysisProgress: result.progress,
                });
                break;
              
              case 'omissionsAndQuestions':
                // Split omissions and questions into separate sections
                const omissionsAndQuestions = result.data as { omissions: Omission[]; questions: string[] } | null;
                patchState(store, {
                  sectionsOmissions: {
                    data: omissionsAndQuestions?.omissions ?? null,
                    loading: result.isRetrying || false,
                    error: null,
                    retryCount: result.retryCount,
                    isRetrying: result.isRetrying
                  },
                  sectionsQuestions: {
                    data: omissionsAndQuestions?.questions ?? null,
                    loading: result.isRetrying || false,
                    error: null,
                    retryCount: result.retryCount,
                    isRetrying: result.isRetrying
                  },
                  analysisProgress: result.progress,
                });
                break;
            }
          },
          error: (error) => {
            logger.error('❌ RxJS streaming analysis failed:', error);
            const errorMessage = error instanceof Error ? error.message : translate.instant('errors.analysisFailed');
        patchState(store, { 
              analysisError: errorMessage,
          isUploading: false,
          isAnalyzing: false,
          isDone: false,
              analysisProgress: 0,
            });
            // Don't throw - let the UI handle the error gracefully
          },
          complete: () => {
            logger.info('✅ RxJS streaming analysis completed');
            
            // Store results in cache for future translations
            const contract = store.contract();
            if (contract) {
              const metadata = store.sectionsMetadata()?.data;
              const summary = store.sectionsSummary()?.data;
              const risks = store.sectionsRisks()?.data;
              const obligations = store.sectionsObligations()?.data;
              const omissions = store.sectionsOmissions()?.data;
              const questions = store.sectionsQuestions()?.data;
              
              // Cache even if some sections failed (partial results are better than no cache)
              // At minimum, we need metadata to cache anything useful
              if (metadata) {
                const contractLang = languageStore.detectedContractLanguage() || 'en';
                const outputLang = onboardingStore.selectedOutputLanguage() || languageStore.preferredLanguage();
                const isPreTranslationFlow = !isGeminiNanoSupported(contractLang);
                
                const successfulSections = [
                  metadata ? 'metadata' : null,
                  summary ? 'summary' : null,
                  risks ? 'risks' : null,
                  obligations ? 'obligations' : null,
                  omissions ? 'omissions' : null,
                  questions ? 'questions' : null
                ].filter(Boolean);
                
                logger.info(`💾 [Store] Caching strategy - Contract: ${contractLang}, Output: ${outputLang}, Pre-translation: ${isPreTranslationFlow}`);
                logger.info(`💾 [Store] Caching ${successfulSections.length}/5 sections: ${successfulSections.join(', ')}`);
                
                // Cache strategy:
                // - For direct analysis (e.g., ES contract → ES output): Store as "original" in source language (es, ja, or en)
                // - For pre-translation (e.g., AR contract → AR output): Store as "translation" in target language
                //   (we don't have the English intermediate, so we can't store it as "original")
                
                if (isPreTranslationFlow) {
                  // Pre-translation flow: Store the post-translated results
                  logger.info(`💾 [Store] Pre-translation flow: Storing ${outputLang} results`);
                  translationCache.storeAnalysis(contract.id, outputLang, {
                    metadata,
                    summary: summary || undefined,
                    risks: risks || undefined,
                    obligations: obligations || undefined,
                    omissions: omissions || undefined,
                    questions: questions || undefined,
                  });
                  
                  // 💡 Note: English (intermediate) results already cached incrementally
                  // by analyzeWithPreTranslation$ during analysis pipeline
                  logger.info(`✅ [Store] Both English (intermediate) and ${outputLang} (final) cached for future language switching`);
                } else {
                  // Direct analysis: Store in SOURCE language (could be en, es, ja, etc.)
                  logger.info(`💾 [Store] Direct analysis: Storing ${contractLang} results`);
                  translationCache.storeAnalysis(contract.id, contractLang, {
                    metadata,
                    summary: summary || undefined,
                    risks: risks || undefined,
                    obligations: obligations || undefined,
                    omissions: omissions || undefined,
                    questions: questions || undefined,
                  });
                }
              } else {
                logger.warn('⚠️ [Store] No metadata available - skipping cache');
              }
            }
            
            // Clean up destroy subject
            destroySubject.next();
            destroySubject.complete();
            patchState(store, { 
              destroySubject: null,
              isDone: true  // Analysis is complete and cached in localStorage
            });
          }
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : translate.instant('errors.analysisFailed');
        patchState(store, { 
          analysisError: errorMessage,
          isUploading: false,
          isAnalyzing: false,
          analysisProgress: 0,
        });
        throw error;
      }
    },
    
    
    /**
     * Switch analysis language (re-translate results)
     */
    async switchAnalysisLanguage(targetLanguage: string, previousLanguage?: string): Promise<void> {
      // check if we are in analysis route otherwise we don't have analysis to translate
      if (!router.url.includes('/analysis')) {
        return;
      }
      const contract = store.contract();
      if (!contract) {
        logger.warn('⚠️ [Store] No contract found for language switch');
        return;
      }

      // Use provided previous language or get current language
      const prevLang = previousLanguage || languageStore.preferredLanguage();
      logger.info(`🌍 [Store] Switching analysis language: ${prevLang} → ${targetLanguage}`);
      
      // Set loading state IMMEDIATELY
      patchState(store, {
        isTranslating: true,
        translatingToLanguage: targetLanguage,
        analysisError: null // Clear any previous errors
      });
      
      try {
        // Check cache first
        const cached = translationCache.getAnalysis(contract.id, targetLanguage);
        
        if (cached) {
          logger.info(`⚡ [Store] Using cached ${targetLanguage} translation`);
          
          // Ensure UI has time to show loading state (increased from 300ms)
          await new Promise(resolve => setTimeout(resolve, 600));
          
          patchState(store, {
            sectionsMetadata: { data: cached.metadata, loading: false, error: null },
            sectionsSummary: { data: cached.summary, loading: false, error: null },
            sectionsRisks: { data: cached.risks, loading: false, error: null },
            sectionsObligations: { data: cached.obligations, loading: false, error: null },
            sectionsOmissions: { data: cached.omissions, loading: false, error: null },
            sectionsQuestions: { data: cached.questions, loading: false, error: null },
            isTranslating: false,  // Clear loading state
            translatingToLanguage: null
          });
          return;
        }
        
        // Not cached - need to translate
        logger.info(`🌍 [Store] Translating to ${targetLanguage}...`);
        
        // Find best source language to translate from
        const availableLanguages = translationCache.getAvailableLanguages(contract.id);
        logger.info(`📋 [Store] Available languages: ${availableLanguages.join(', ')}`);
        
        if (availableLanguages.length === 0) {
          // TODO: Auto-start analysis if contract text exists, or redirect to upload page
          throw new Error(translate.instant('errors.analysisFailed'));
        }
        
        // Select best source language (prefer direct-from-Gemini languages)
        const sourceLanguage = selectBestSourceLanguage(availableLanguages, targetLanguage);
        const sourceAnalysis = translationCache.getAnalysis(contract.id, sourceLanguage);
        
        if (!sourceAnalysis) {
          // TODO: Handle missing source language gracefully - possibly reload analysis
          logger.error(`Source analysis not found for language: ${sourceLanguage}`);
          throw new Error(translate.instant('errors.analysisFailed'));
        }
        
        logger.info(`🔄 [Store] Translating from ${sourceLanguage} to ${targetLanguage}...`);
        
        // Translate from source to target (with null checks)
        const [metadata, summary, risks, obligations, omissionsAndQuestions] = await Promise.all([
          sourceAnalysis.metadata ? translationUtility.translateMetadata(sourceAnalysis.metadata, targetLanguage, sourceLanguage) : null,
          sourceAnalysis.summary ? translationUtility.translateSummary(sourceAnalysis.summary, targetLanguage) : null,
          sourceAnalysis.risks ? translationUtility.translateRisks(sourceAnalysis.risks, targetLanguage) : null,
          sourceAnalysis.obligations ? translationUtility.translateObligations(sourceAnalysis.obligations, targetLanguage) : null,
          (sourceAnalysis.omissions || sourceAnalysis.questions) ? translationUtility.translateOmissionsAndQuestions(
            { 
              omissions: sourceAnalysis.omissions || [], 
              questions: sourceAnalysis.questions || [] 
            }, 
            targetLanguage
          ) : null,
        ]);
        
        // Store in cache
        translationCache.storeAnalysis(contract.id, targetLanguage, {
          metadata: metadata || undefined,
          summary: summary || undefined,
          risks: risks || undefined,
          obligations: obligations || undefined,
          omissions: omissionsAndQuestions?.omissions || undefined,
          questions: omissionsAndQuestions?.questions || undefined,
        });
        
        // Update store with translated data
        patchState(store, {
          sectionsMetadata: { data: metadata, loading: false, error: null },
          sectionsSummary: { data: summary, loading: false, error: null },
          sectionsRisks: { data: risks, loading: false, error: null },
          sectionsObligations: { data: obligations, loading: false, error: null },
          sectionsOmissions: { data: omissionsAndQuestions?.omissions ?? null, loading: false, error: null },
          sectionsQuestions: { data: omissionsAndQuestions?.questions ?? null, loading: false, error: null },
          isTranslating: false,  // Clear loading state
          translatingToLanguage: null
        });
        
        logger.info(`✅ [Store] Translated from ${sourceLanguage} and cached ${targetLanguage} results`);
        
      } catch (error) {
        logger.error(`❌ [Store] Translation to ${targetLanguage} failed:`, error);
        
        // CRITICAL: Revert to previous language to keep UI and results consistent
        logger.info(`🔄 [Store] Reverting to previous language: ${prevLang}`);
        languageStore.setPreferredLanguage(prevLang);
        
        // Clear translation state
        patchState(store, {
          isTranslating: false,
          translatingToLanguage: null,
          analysisError: `Failed to translate to ${targetLanguage}. Please try again.`
        });
        
        throw error; // Re-throw for language-selector to handle
      }
    },
    
    /**
     * Handle role selection with consolidated business logic
     * Moves complex role selection logic from components to store
     */
    async selectRoleAndAnalyze(
      role: string | null,
      detectedParties: any,
      pendingText: string
    ): Promise<{ success: boolean; error?: string }> {
      if (!role) {
        return { success: false, error: 'No role selected' };
      }

      if (!pendingText) {
        return { success: false, error: 'No contract text found' };
      }

      try {
        logger.info(`👤 [RoleSelection] Processing role selection: ${role}`);

        // Map party1/party2 to actual roles
        let actualRole: string = role;
        
        if (role === 'party1' && detectedParties?.parties?.party1) {
          // Map party1 to its actual role (e.g., 'landlord', 'employer')
          actualRole = this.mapPartyRoleToUserRole(detectedParties.parties.party1.role);
          logger.info(
            `👤 [RoleSelection] User selected Party 1 (${detectedParties.parties.party1.name}) → Role: ${actualRole}`
          );
        } else if (role === 'party2' && detectedParties?.parties?.party2) {
          // Map party2 to its actual role (e.g., 'tenant', 'employee')
          actualRole = this.mapPartyRoleToUserRole(detectedParties.parties.party2.role);
          logger.info(
            `👤 [RoleSelection] User selected Party 2 (${detectedParties.parties.party2.name}) → Role: ${actualRole}`
          );
        } else {
          logger.info(`👤 [RoleSelection] User selected generic role: ${actualRole}`);
        }

        // Set role in onboarding store
        onboardingStore.setSelectedRole(actualRole as any);

        // Parse contract text
        const parsedContract = parserService.parseText(pendingText, 'pending-analysis');
        
        // Convert ParsedContract to Contract format
        const contract: Contract = {
          id: `contract-${Date.now()}`, // Generate unique ID
          text: parsedContract.text,
          fileName: parsedContract.fileName,
          fileSize: parsedContract.fileSize,
          fileType: parsedContract.fileType,
          uploadedAt: new Date(),
          wordCount: parsedContract.text.split(/\s+/).length,
          estimatedReadingTime: Math.ceil(parsedContract.text.split(/\s+/).length / 200), // ~200 WPM
        };
        
        // Set contract in store
        patchState(store, { contract });

        // Start analysis - navigation happens automatically when metadata is ready!
        // Don't await - let it run in background while we navigate
        this.analyzeContract(parsedContract).catch((error) => {
          logger.error('❌ Analysis error:', error);
          // Don't navigate back to upload - user is already on analysis page
          // Just show toast - they can see what sections loaded successfully
          patchState(store, { 
            analysisError: 'Some sections failed to load. Please try refreshing.' 
          });
        });

        logger.info(`✅ [RoleSelection] Role selection and analysis started successfully`);
        return { success: true };

      } catch (error) {
        logger.error(`❌ [RoleSelection] Role selection failed:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Role selection failed' 
        };
      }
    },

    /**
     * Map detected party role to UserRole enum
     * Party roles from AI: "Landlord", "Tenant", "Employer", "Employee", etc.
     * UserRole: 'landlord', 'tenant', 'employer', 'employee', etc. (lowercase)
     */
    mapPartyRoleToUserRole(partyRole: string): string {
      return mapPartyRoleToUserRole(partyRole);
    },

    /**
     * Reset store to initial state
     */
    reset: () => {
      patchState(store, initialState);
    },
  })),
  
  // Lifecycle hooks
  withHooks({
    onInit(store) {
      const logger = inject(LoggerService);
      logger.info('🚀 [ContractStore] Initializing store...');
      
      // Initialize with mock data if in mock mode
      if (AppConfig.AI.USE_MOCK_AI) {
        logger.info('🎨 [ContractStore] Mock mode enabled - loading mock data');
        
        const mockContract: Contract = MOCK_CONTRACT;
        
        patchState(store, {
          contract: mockContract,
          isUploading: false,
          isAnalyzing: false,
          isDone: true,  // Mock data is always "done"
          uploadError: null,
          analysisError: null,
          analysisProgress: 100, // Complete
          sectionsMetadata: { data: MOCK_LEASE_DATA.metadata, loading: false, error: null },
          sectionsSummary: { 
            data: MOCK_LEASE_DATA.summary?.summary 
              ? { 
                  ...MOCK_LEASE_DATA.summary.summary, 
                  fromYourPerspective: (MOCK_LEASE_DATA.summary as any).fromYourPerspective,
                  keyBenefits: (MOCK_LEASE_DATA.summary as any).keyBenefits,
                  keyConcerns: (MOCK_LEASE_DATA.summary as any).keyConcerns,
                } as Schemas.ContractSummary
              : MOCK_LEASE_DATA.summary as unknown as Schemas.ContractSummary, 
            loading: false, 
            error: null 
          },
          sectionsRisks: { 
            data: (MOCK_LEASE_DATA.risks?.risks || null)?.map(r => ({
              ...r,
              severity: (r.severity?.charAt(0).toUpperCase() + r.severity?.slice(1)) as 'High' | 'Medium' | 'Low'
            })) || null, 
            loading: false, error: null 
          },
          sectionsObligations: { data: MOCK_LEASE_DATA.obligations?.obligations || null, loading: false, error: null },
          sectionsOmissions: { 
            data: (MOCK_LEASE_DATA.omissions?.omissions || null)?.map(o => ({
              ...o,
              priority: (o.priority?.charAt(0).toUpperCase() + o.priority?.slice(1)) as 'High' | 'Medium' | 'Low'
            })) || null, 
            loading: false, error: null 
          },
          sectionsQuestions: { data: MOCK_LEASE_DATA.omissions?.questions || null, loading: false, error: null },
          isTranslating: false,
          translatingToLanguage: null,
          destroySubject: null,
        });
        
        logger.info('✅ [ContractStore] Mock data loaded successfully');
      } else {
        logger.info('🏭 [ContractStore] Production mode - clean state initialized');
      }
    },
    
    onDestroy(store) {
      // Clean up RxJS subscriptions
      if (store.destroySubject()) {
        store.destroySubject()!.next();
        store.destroySubject()!.complete();
      }
      
      // Reset analysis state to prevent disabled language selector on other pages
      // Keep contract data for cache/navigation purposes but reset analysis flags
      patchState(store, { 
        isDone: false,
        isAnalyzing: false,
        isTranslating: false,
        translatingToLanguage: null,
        analysisError: null,
        analysisProgress: 0,
        destroySubject: null 
      });
    }
  })
);

