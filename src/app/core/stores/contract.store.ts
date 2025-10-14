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
import { LanguageStore } from './language.store';
import { OnboardingStore } from './onboarding.store';

/**
 * Section loading state for progressive analysis with proper typing
 */
interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
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
  
  // RxJS streaming cleanup
  destroySubject: Subject<void> | null;
}

/**
 * Initial state
 */
const initialState: ContractState = {
  contract: null,
  isUploading: false,
  isAnalyzing: false,
  uploadError: null,
  analysisError: null,
  analysisProgress: 0,
  sectionsMetadata: null,
  sectionsSummary: null,
  sectionsRisks: null,
  sectionsObligations: null,
  sectionsOmissionsQuestions: null,
  destroySubject: null,
};

/**
 * Contract Store
 */
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
    sectionsOmissionsQuestions,
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
            uploadError: 'Not a valid contract document',
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
        const errorMessage = error instanceof Error ? error.message : 'File parsing failed';
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
            uploadError: 'Not a valid contract document',
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
        const errorMessage = error instanceof Error ? error.message : 'Text parsing failed';
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
            console.log(`📦 [Stream] ${result.section} completed:`, result);
            
            // Update specific section as it completes
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
                  sectionsSummary: { data: result.data, loading: false, error: null },
                  analysisProgress: result.progress,
                });
                break;
              
              case 'risks':
                patchState(store, {
                  sectionsRisks: { data: result.data, loading: false, error: null },
                  analysisProgress: result.progress,
                });
                break;
              
              case 'obligations':
                patchState(store, {
                  sectionsObligations: { data: result.data, loading: false, error: null },
                  analysisProgress: result.progress,
                });
                break;
              
              case 'omissionsAndQuestions':
                patchState(store, {
                  sectionsOmissionsQuestions: { data: result.data, loading: false, error: null },
                  analysisProgress: result.progress,
                });
                break;
            }
          },
          error: (error) => {
            console.error('❌ RxJS streaming analysis failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
            patchState(store, { 
              analysisError: errorMessage,
              isUploading: false,
              isAnalyzing: false,
              analysisProgress: 0,
            });
            // Don't throw - let the UI handle the error gracefully
          },
          complete: () => {
            console.log('✅ RxJS streaming analysis completed');
            // Clean up destroy subject
            destroySubject.next();
            destroySubject.complete();
            patchState(store, { destroySubject: null });
          }
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
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
     * Reset store to initial state
     */
    reset: () => {
      patchState(store, initialState);
    },
  }))
);

