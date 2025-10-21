/**
 * Contract Store - NgRx SignalStore
 * Manages contract data and progressive analysis loading with RxJS streaming
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { computed, inject, NgZone } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import type { Contract } from '../models/contract.model';
import type { 
  ContractMetadata, 
  RisksAnalysis, 
  ObligationsAnalysis, 
  OmissionsAndQuestions, 
  ContractSummary 
} from '../schemas/analysis-schemas';
import { ContractAnalysisService } from '../services/contract-analysis.service';
import { ContractParserService, type ParsedContract } from '../services/contract-parser.service';
import { ContractValidationService } from '../services/contract-validation.service';
import { PartyExtractionService } from '../services/party-extraction.service';
import { TranslationCacheService } from '../services/translation-cache.service';
import { LanguageStore } from './language.store';
import { OnboardingStore } from './onboarding.store';
import { isGeminiNanoSupported } from '../constants/languages';
import { AppConfig } from '../config/app.config';
import { MOCK_CONTRACT, MOCK_LEASE_DATA } from '../mocks/mock-analysis.data';

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
  sectionsRisks: SectionState<RisksAnalysis> | null;
  sectionsObligations: SectionState<ObligationsAnalysis> | null;
  sectionsOmissionsQuestions: SectionState<OmissionsAndQuestions> | null;
  
  // Translation state
  isTranslating: boolean;
  translatingToLanguage: string | null;
  
  // RxJS streaming cleanup
  destroySubject: Subject<void> | null;
}

/**
 * Create initial state based on mock mode
 */
function createInitialState(): ContractState {
  if (AppConfig.useMockAI) {
    // Mock contract for development
    const mockContract: Contract = MOCK_CONTRACT;

    return {
      contract: mockContract,
      isUploading: false,
      isAnalyzing: false,
      isDone: true,  // Mock data is always "done"
      uploadError: null,
      analysisError: null,
      analysisProgress: 100, // Complete
      sectionsMetadata: { data: MOCK_LEASE_DATA.metadata, loading: false, error: null },
      sectionsSummary: { data: MOCK_LEASE_DATA.summary, loading: false, error: null },
      sectionsRisks: { data: MOCK_LEASE_DATA.risks, loading: false, error: null },
      sectionsObligations: { data: MOCK_LEASE_DATA.obligations, loading: false, error: null },
      sectionsOmissionsQuestions: { data: MOCK_LEASE_DATA.omissions, loading: false, error: null },
      isTranslating: false,
      translatingToLanguage: null,
      destroySubject: null,
    };
  }

  // Normal initial state for production
  return {
  contract: null,
  isUploading: false,
  isAnalyzing: false,
  isDone: false,  // Analysis not done initially
  uploadError: null,
  analysisError: null,
    analysisProgress: 0,
    sectionsMetadata: null,
    sectionsSummary: null,
    sectionsRisks: null,
    sectionsObligations: null,
    sectionsOmissionsQuestions: null,
    isTranslating: false,
    translatingToLanguage: null,
    destroySubject: null,
  };
}

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
  withState(createInitialState()),
  
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
    sectionsOmissionsQuestions,
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
      const omiss = sectionsOmissionsQuestions();
      return meta?.loading || summary?.loading || risks?.loading || oblig?.loading || omiss?.loading || false;
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
    translate = inject(TranslateService),
    router = inject(Router),
    ngZone = inject(NgZone)
  ) => ({
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
                console.log('\n📄 [Upload] Parsing file...');
                const parsedContract = await parserService.parseFile(file);
                
                // Step 2: Validate contract
                console.log('✅ [Validation] Checking if document is a contract...');
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
        console.log('🚀 [Onboarding] Running language detection and party extraction in parallel...');
        
        // Set user's preferred language in onboarding store BEFORE detecting contract language
        onboardingStore.setUserPreferredLanguage(languageStore.preferredLanguage());
        
        const [detectedLang, partyResult] = await Promise.all([
          languageStore.detectContractLanguage(parsedContract.text),
          partyExtractionService.extractParties(parsedContract.text)
        ]);
        
        console.log('✅ [Onboarding] Parallel tasks completed:', { detectedLang, partyResult });
        
        // Update stores with results
        onboardingStore.setDetectedLanguage(detectedLang);
        onboardingStore.setDetectedParties(partyResult);
        onboardingStore.setProcessing(false);
        
        // CRITICAL: If language matches, auto-select to skip modal
        if (detectedLang === languageStore.preferredLanguage()) {
          console.log(`✅ [Onboarding] Language auto-match: ${detectedLang} - Auto-selecting`);
          onboardingStore.setSelectedLanguage(detectedLang);
        }
        
        // Step 5: Store parsed contract and wait for user to select language/role
        onboardingStore.setPendingContract(parsedContract.text);
        patchState(store, { isUploading: false });
        console.log('✅ Contract validated, language detected, and parties extracted.');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : translate.instant('errors.analysisFailed');
        console.error('File parsing failed:', error); // Log technical details for debugging
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
        console.log('\n📄 [Upload] Parsing text...');
        const parsedContract = parserService.parseText(text, source);
        
        // Step 2: Validate contract
        console.log('✅ [Validation] Checking if document is a contract...');
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
        console.log('🚀 [Onboarding] Running language detection and party extraction in parallel...');
        
        // Set user's preferred language in onboarding store BEFORE detecting contract language
        onboardingStore.setUserPreferredLanguage(languageStore.preferredLanguage());
        
        const [detectedLang, partyResult] = await Promise.all([
          languageStore.detectContractLanguage(parsedContract.text),
          partyExtractionService.extractParties(parsedContract.text)
        ]);
        
        console.log('✅ [Onboarding] Parallel tasks completed:', { detectedLang, partyResult });
        
        // Update stores with results
        onboardingStore.setDetectedLanguage(detectedLang);
        onboardingStore.setDetectedParties(partyResult);
        onboardingStore.setProcessing(false);
        
        // CRITICAL: If language matches, auto-select to skip modal
        if (detectedLang === languageStore.preferredLanguage()) {
          console.log(`✅ [Onboarding] Language auto-match: ${detectedLang} - Auto-selecting`);
          onboardingStore.setSelectedLanguage(detectedLang);
        }
        
        // Step 5: Store parsed contract and wait for user to select language/role
        onboardingStore.setPendingContract(parsedContract.text);
        patchState(store, { isUploading: false });
        console.log('✅ Contract validated, language detected, and parties extracted.');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : translate.instant('errors.analysisFailed');
        console.error('Text parsing failed:', error); // Log technical details for debugging
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
          sectionsOmissionsQuestions: { data: null, loading: true, error: null },
        });
        
        // Step 1: Detect contract language
        console.log('🌍 Detecting contract language...');
        languageStore.detectContractLanguage(parsedContract.text);
        
        // Step 2: Build analysis context
        const detectedParties = onboardingStore.detectedParties();
        const contractLang = languageStore.detectedContractLanguage() || 'en';
        
        console.log('\n📋 [Analysis Context] Building context...');
        console.log('  📄 Contract language:', contractLang);
        console.log('  🎯 User selected output language:', onboardingStore.selectedOutputLanguage());
        
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
        console.log('🚀 Starting RxJS streaming analysis...');
        
        analysisService.analyzeContractStreaming$(
          parsedContract,
          analysisContext,
          contract
        ).pipe(
          takeUntil(destroySubject)
        ).subscribe({
          next: (result) => {
            console.log(`📦 [Stream] ${result.section} ${result.isRetrying ? 'retrying' : 'completed'}:`, result);
            
            // Update specific section as it completes or retries
            switch (result.section) {
              case 'metadata':
                patchState(store, {
                  sectionsMetadata: { data: result.data, loading: false, error: null },
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
                    data: result.data, 
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
                    data: result.data, 
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
                    data: result.data, 
                    loading: result.isRetrying || false, 
                    error: null,
                    retryCount: result.retryCount,
                    isRetrying: result.isRetrying
                  },
                  analysisProgress: result.progress,
                });
                break;
              
              case 'omissionsAndQuestions':
                patchState(store, {
                  sectionsOmissionsQuestions: { 
                    data: result.data, 
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
            console.error('❌ RxJS streaming analysis failed:', error);
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
            console.log('✅ RxJS streaming analysis completed');
            
            // Store results in cache for future translations
            const contract = store.contract();
            if (contract) {
              const metadata = store.sectionsMetadata()?.data;
              const summary = store.sectionsSummary()?.data;
              const risks = store.sectionsRisks()?.data;
              const obligations = store.sectionsObligations()?.data;
              const omissions = store.sectionsOmissionsQuestions()?.data;
              
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
                  omissions ? 'omissions' : null
                ].filter(Boolean);
                
                console.log(`💾 [Store] Caching strategy - Contract: ${contractLang}, Output: ${outputLang}, Pre-translation: ${isPreTranslationFlow}`);
                console.log(`💾 [Store] Caching ${successfulSections.length}/5 sections: ${successfulSections.join(', ')}`);
                
                // Cache strategy:
                // - For direct analysis (e.g., ES contract → ES output): Store as "original" in source language (es, ja, or en)
                // - For pre-translation (e.g., AR contract → AR output): Store as "translation" in target language
                //   (we don't have the English intermediate, so we can't store it as "original")
                
                if (isPreTranslationFlow) {
                  // Pre-translation flow: Store the post-translated results
                  console.log(`💾 [Store] Pre-translation flow: Storing ${outputLang} results`);
                  translationCache.storeAnalysis(contract.id, outputLang, {
                    metadata,
                    summary: summary || null,
                    risks: risks || null,
                    obligations: obligations || null,
                    omissions: omissions || null
                  });
                } else {
                  // Direct analysis: Store in SOURCE language (could be en, es, ja, etc.)
                  console.log(`💾 [Store] Direct analysis: Storing ${contractLang} results`);
                  translationCache.storeAnalysis(contract.id, contractLang, {
                    metadata,
                    summary: summary || null,
                    risks: risks || null,
                    obligations: obligations || null,
                    omissions: omissions || null
                  });
                }
              } else {
                console.warn('⚠️ [Store] No metadata available - skipping cache');
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
    async switchAnalysisLanguage(targetLanguage: string): Promise<void> {
      // check if we are in analysis route otherwise we don't have analysis to translate
      if (!router.url.includes('/analysis')) {
        return;
      }
      const contract = store.contract();
      if (!contract) {
        console.warn('⚠️ [Store] No contract found for language switch');
        return;
      }
      
      console.log(`🌍 [Store] Switching analysis language to ${targetLanguage}`);
      
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
          console.log(`⚡ [Store] Using cached ${targetLanguage} translation`);
          
          // Ensure UI has time to show loading state (increased from 300ms)
          await new Promise(resolve => setTimeout(resolve, 600));
          
          patchState(store, {
            sectionsMetadata: { data: cached.metadata, loading: false, error: null },
            sectionsSummary: { data: cached.summary, loading: false, error: null },
            sectionsRisks: { data: cached.risks, loading: false, error: null },
            sectionsObligations: { data: cached.obligations, loading: false, error: null },
            sectionsOmissionsQuestions: { data: cached.omissions, loading: false, error: null },
            isTranslating: false,  // Clear loading state
            translatingToLanguage: null
          });
          return;
        }
        
        // Not cached - need to translate
        console.log(`🌍 [Store] Translating to ${targetLanguage}...`);
        
        // Find best source language to translate from
        const availableLanguages = translationCache.getAvailableLanguages(contract.id);
        console.log(`📋 [Store] Available languages: ${availableLanguages.join(', ')}`);
        
        if (availableLanguages.length === 0) {
          // TODO: Auto-start analysis if contract text exists, or redirect to upload page
          throw new Error(translate.instant('errors.analysisFailed'));
        }
        
        // Select best source language (prefer direct-from-Gemini languages)
        const sourceLanguage = selectBestSourceLanguage(availableLanguages, targetLanguage);
        const sourceAnalysis = translationCache.getAnalysis(contract.id, sourceLanguage);
        
        if (!sourceAnalysis) {
          // TODO: Handle missing source language gracefully - possibly reload analysis
          console.error(`Source analysis not found for language: ${sourceLanguage}`);
          throw new Error(translate.instant('errors.analysisFailed'));
        }
        
        console.log(`🔄 [Store] Translating from ${sourceLanguage} to ${targetLanguage}...`);
        
        // Translate from source to target
        const [metadata, summary, risks, obligations, omissions] = await Promise.all([
          analysisService.postTranslateMetadata(sourceAnalysis.metadata, targetLanguage),
          analysisService.postTranslateSummary(sourceAnalysis.summary, targetLanguage),
          analysisService.postTranslateRisks(sourceAnalysis.risks, targetLanguage),
          analysisService.postTranslateObligations(sourceAnalysis.obligations, targetLanguage),
          analysisService.postTranslateOmissionsAndQuestions(sourceAnalysis.omissions, targetLanguage),
        ]);
        
        // Store in cache
        translationCache.storeAnalysis(contract.id, targetLanguage, {
          metadata,
          summary,
          risks,
          obligations,
          omissions
        });
        
        // Update store with translated data
        patchState(store, {
          sectionsMetadata: { data: metadata, loading: false, error: null },
          sectionsSummary: { data: summary, loading: false, error: null },
          sectionsRisks: { data: risks, loading: false, error: null },
          sectionsObligations: { data: obligations, loading: false, error: null },
          sectionsOmissionsQuestions: { data: omissions, loading: false, error: null },
          isTranslating: false,  // Clear loading state
          translatingToLanguage: null
        });
        
        console.log(`✅ [Store] Translated from ${sourceLanguage} and cached ${targetLanguage} results`);
        
      } catch (error) {
        console.error(`❌ [Store] Translation to ${targetLanguage} failed:`, error);
        
        // Clear loading state and show user-friendly error
        patchState(store, {
          isTranslating: false,
          translatingToLanguage: null,
          analysisError: translate.instant('errors.translationFailed')
        });
      }
    },
    
    /**
     * Reset store to initial state
     */
    reset: () => {
      patchState(store, createInitialState());
    },
  }))
);

