/**
 * Contract Store - NgRx SignalStore
 * Manages contract data, analysis results, and loading states
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { computed } from '@angular/core';
import { patchState } from '@ngrx/signals';
import type { Contract, ContractAnalysis, ContractClause, RiskLevel } from '../models/contract.model';

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
  withComputed(({ contract, analysis }) => ({
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
    isLoading: computed(({ isUploading, isAnalyzing }) => 
      isUploading() || isAnalyzing()
    ),
    
    // Check if there are errors
    hasError: computed(({ uploadError, analysisError }) => 
      uploadError() !== null || analysisError() !== null
    ),
  })),
  
  // Methods to update state
  withMethods((store) => ({
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
     * Reset store to initial state
     */
    reset: () => {
      patchState(store, initialState);
    },
  }))
);

