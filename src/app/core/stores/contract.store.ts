/**
 * Contract Store - NgRx SignalStore
 * Manages contract data, analysis results, and loading states
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import type { Contract, ContractAnalysis, ContractClause, RiskLevel } from '../models/contract.model';
import { ContractAnalysisService } from '../services/contract-analysis.service';
import { ContractParserService, type ParsedContract } from '../services/contract-parser.service';
import { ContractValidationService } from '../services/contract-validation.service';
import { PartyExtractionService } from '../services/party-extraction.service';
import { LanguageStore } from './language.store';
import { OnboardingStore } from './onboarding.store';

/**
 * Contract store state shape
 */
interface ContractState {
  // Current contract
  contract: Contract | null;
  
  // Analysis results
  analysis: ContractAnalysis | null;
  
  // Loading states
  isUploading: boolean;
  isAnalyzing: boolean;
  
  // Error handling
  uploadError: string | null;
  analysisError: string | null;
  
  // UI state
  selectedClauseId: string | null;
}

/**
 * Initial state
 */
const initialState: ContractState = {
  contract: null,
  analysis: null,
  isUploading: false,
  isAnalyzing: false,
  uploadError: null,
  analysisError: null,
  selectedClauseId: null,
};

/**
 * Contract Store
 */
export const ContractStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  // Computed values derived from state
  withComputed(({ contract, analysis, isUploading, isAnalyzing, uploadError, analysisError }) => ({
    // Check if contract is loaded
    hasContract: computed(() => contract() !== null),
    
    // Check if analysis is available
    hasAnalysis: computed(() => analysis() !== null),
    
    // Get risk score
    riskScore: computed(() => analysis()?.riskScore ?? 0),
    
    // Check if contract has high risk clauses
    hasHighRiskClauses: computed(() => {
      const score = analysis()?.riskScore ?? 0;
      return score > 70;
    }),
    
    // Get high risk clauses
    highRiskClauses: computed(() => {
      const clauses = analysis()?.clauses ?? [];
      return clauses.filter(clause => clause.riskLevel === 'high');
    }),
    
    // Get medium risk clauses
    mediumRiskClauses: computed(() => {
      const clauses = analysis()?.clauses ?? [];
      return clauses.filter(clause => clause.riskLevel === 'medium');
    }),
    
    // Get low risk clauses
    lowRiskClauses: computed(() => {
      const clauses = analysis()?.clauses ?? [];
      return clauses.filter(clause => clause.riskLevel === 'low');
    }),
    
    // Count clauses by risk level
    riskCounts: computed(() => {
      const clauses = analysis()?.clauses ?? [];
      return {
        high: clauses.filter(c => c.riskLevel === 'high').length,
        medium: clauses.filter(c => c.riskLevel === 'medium').length,
        low: clauses.filter(c => c.riskLevel === 'low').length,
        safe: clauses.filter(c => c.riskLevel === 'safe').length,
      };
    }),
    
    // Get pending obligations
    pendingObligations: computed(() => {
      const obligations = analysis()?.obligations ?? [];
      return obligations.filter(o => !o.completed);
    }),
    
    // Get completed obligations
    completedObligations: computed(() => {
      const obligations = analysis()?.obligations ?? [];
      return obligations.filter(o => o.completed);
    }),
    
    // Check if loading
    isLoading: computed(() => 
      isUploading() || isAnalyzing()
    ),
    
    // Check if there are errors
    hasError: computed(() => 
      uploadError() !== null || analysisError() !== null
    ),
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
    partyExtractionService = inject(PartyExtractionService)
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
     * Set analysis results
     */
    setAnalysis: (analysis: ContractAnalysis) => {
      patchState(store, { 
        analysis, 
        isAnalyzing: false, 
        analysisError: null 
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
     * Select a clause
     */
    selectClause: (clauseId: string) => {
      patchState(store, { selectedClauseId: clauseId });
    },
    
    /**
     * Clear selected clause
     */
    clearSelectedClause: () => {
      patchState(store, { selectedClauseId: null });
    },
    
    /**
     * Toggle obligation completion
     */
    toggleObligation: (obligationId: string) => {
      const analysis = store.analysis();
      if (!analysis) return;
      
      const updatedObligations = analysis.obligations.map(o => 
        o.id === obligationId ? { ...o, completed: !o.completed } : o
      );
      
      patchState(store, {
        analysis: {
          ...analysis,
          obligations: updatedObligations,
        },
      });
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
        console.log('📄 Parsing file...');
        const parsedContract = await parserService.parseFile(file);
        
        // Step 2: Validate contract
        console.log('✅ Validating contract...');
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
          throw new Error('Not a contract: ' + validationResult.reason);
        }
        
        // Valid contract!
        onboardingStore.setValidationResult(true, validationResult.documentType || 'Contract');
        
        // Step 3: Detect contract language
        console.log('🌍 Detecting contract language...');
        const detectedLang = languageStore.detectContractLanguage(parsedContract.text);
        onboardingStore.setDetectedLanguage(detectedLang);
        
        // Step 4: Extract parties
        console.log('👥 Extracting parties...');
        const partyResult = await partyExtractionService.extractParties(parsedContract.text);
        onboardingStore.setDetectedParties(partyResult);
        onboardingStore.setProcessing(false);
        
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
        console.log('📄 Parsing text...');
        const parsedContract = parserService.parseText(text, source);
        
        // Step 2: Validate contract
        console.log('✅ Validating contract...');
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
          throw new Error('Not a contract: ' + validationResult.reason);
        }
        
        // Valid contract!
        onboardingStore.setValidationResult(true, validationResult.documentType || 'Contract');
        
        // Step 3: Detect contract language
        console.log('🌍 Detecting contract language...');
        const detectedLang = languageStore.detectContractLanguage(parsedContract.text);
        onboardingStore.setDetectedLanguage(detectedLang);
        
        // Step 4: Extract parties
        console.log('👥 Extracting parties...');
        const partyResult = await partyExtractionService.extractParties(parsedContract.text);
        onboardingStore.setDetectedParties(partyResult);
        onboardingStore.setProcessing(false);
        
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
     * Analyze a contract (main orchestration method)
     */
    async analyzeContract(parsedContract: ParsedContract): Promise<void> {
      patchState(store, { isUploading: true, uploadError: null });

      try {
        patchState(store, { isAnalyzing: true, analysisError: null });
        
        // Step 1: Detect contract language (triggers language banner if needed)
        console.log('🌍 Detecting contract language...');
        languageStore.detectContractLanguage(parsedContract.text);
        
        // Step 2: Build analysis context from onboarding and language stores
        const detectedParties = onboardingStore.detectedParties();
        const analysisContext = {
          contractLanguage: languageStore.detectedContractLanguage() || 'en',
          userPreferredLanguage: languageStore.preferredLanguage(),
          userRole: onboardingStore.selectedRole(),
          detectedParties: detectedParties?.parties && detectedParties.parties.party1 && detectedParties.parties.party2
            ? { 
                party1: detectedParties.parties.party1,
                party2: detectedParties.parties.party2
              }
            : undefined,
        };
        
        console.log('📊 Analysis Context:', analysisContext);
        
        // Step 3: Call the analysis service with context
        const { contract, analysis } = await analysisService.analyzeContract(
          parsedContract,
          analysisContext
        );
        
        // Update store with results
        patchState(store, { 
          contract, 
          analysis,
          isUploading: false,
          isAnalyzing: false,
          uploadError: null,
          analysisError: null,
        });
        
        console.log('✅ Contract analysis completed with language detection');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
        patchState(store, { 
          analysisError: errorMessage,
          isUploading: false,
          isAnalyzing: false,
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

