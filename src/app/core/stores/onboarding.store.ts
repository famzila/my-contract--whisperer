/**
 * Onboarding Store - NgRx SignalStore
 * Manages the smart onboarding flow for contract analysis
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { patchState } from '@ngrx/signals';

/**
 * Onboarding steps
 */
export type OnboardingStep = 
  | 'upload'           // Step 1: Upload contract
  | 'validating'       // Step 2: Validate contract
  | 'languageSelect'   // Step 3: Select language preference
  | 'partySelect'      // Step 4: Select your role/party
  | 'analyzing'        // Step 5: Analyzing contract
  | 'complete';        // Step 6: Analysis complete

/**
 * User role in the contract
 */
export type UserRole = 
  | 'employer' 
  | 'employee' 
  | 'client' 
  | 'contractor' 
  | 'landlord' 
  | 'tenant' 
  | 'partner'
  | 'both_views'       // Compare both perspectives
  | null;

/**
 * Party information detected from contract
 */
export interface DetectedParty {
  name: string;
  role: string;        // e.g., "Employer", "Employee"
  location?: string;
}

/**
 * Party detection result
 */
export interface PartyDetectionResult {
  confidence: 'high' | 'medium' | 'low';
  parties: {
    party1: DetectedParty;
    party2: DetectedParty;
  } | null;
  contractType: 'bilateral' | 'multilateral' | 'unilateral';
}

/**
 * Onboarding store state
 */
interface OnboardingState {
  // Current step in the flow
  currentStep: OnboardingStep;
  
  // Contract validation
  isValidContract: boolean | null;
  validationError: string | null;
  documentType: string | null;          // If not a contract, what is it?
  
  // Language detection
  detectedLanguage: string | null;
  selectedLanguage: string | null;
  
  // Party detection
  detectedParties: PartyDetectionResult | null;
  selectedRole: UserRole;
  
  // Progress tracking
  canProceed: boolean;
  isProcessing: boolean;
  error: string | null;
}

/**
 * Initial state
 */
const initialState: OnboardingState = {
  currentStep: 'upload',
  isValidContract: null,
  validationError: null,
  documentType: null,
  detectedLanguage: null,
  selectedLanguage: null,
  detectedParties: null,
  selectedRole: null,
  canProceed: false,
  isProcessing: false,
  error: null,
};

/**
 * Onboarding Store
 * Orchestrates the smart onboarding flow
 */
export const OnboardingStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  // Computed values
  withComputed(({ currentStep, isValidContract, detectedLanguage, selectedLanguage, selectedRole, detectedParties }) => ({
    /**
     * Get progress percentage (0-100)
     */
    progressPercentage: computed(() => {
      const steps: OnboardingStep[] = ['upload', 'validating', 'languageSelect', 'partySelect', 'analyzing', 'complete'];
      const currentIndex = steps.indexOf(currentStep());
      return Math.round((currentIndex / (steps.length - 1)) * 100);
    }),
    
    /**
     * Check if language selection is needed
     */
    needsLanguageSelection: computed(() => {
      const detected = detectedLanguage();
      const selected = selectedLanguage();
      return detected && detected !== selected;
    }),
    
    /**
     * Check if party selection is needed
     */
    needsPartySelection: computed(() => {
      return isValidContract() === true && !selectedRole();
    }),
    
    /**
     * Get party options for selection
     */
    partyOptions: computed(() => {
      const parties = detectedParties();
      if (!parties || !parties.parties) return [];
      
      return [
        {
          value: 'party1',
          label: `${parties.parties.party1.name} (${parties.parties.party1.role})`,
          icon: getIconForRole(parties.parties.party1.role),
        },
        {
          value: 'party2',
          label: `${parties.parties.party2.name} (${parties.parties.party2.role})`,
          icon: getIconForRole(parties.parties.party2.role),
        },
        {
          value: 'both_views',
          label: 'Compare Both Perspectives',
          icon: '👀',
        },
      ];
    }),
    
    /**
     * Check if ready to analyze
     */
    readyToAnalyze: computed(() => {
      return (
        isValidContract() === true &&
        selectedLanguage() !== null &&
        selectedRole() !== null
      );
    }),
  })),
  
  // Methods
  withMethods((store) => ({
    /**
     * Move to next step
     */
    nextStep: () => {
      const current = store.currentStep();
      const steps: OnboardingStep[] = ['upload', 'validating', 'languageSelect', 'partySelect', 'analyzing', 'complete'];
      const currentIndex = steps.indexOf(current);
      
      if (currentIndex < steps.length - 1) {
        patchState(store, { currentStep: steps[currentIndex + 1] });
      }
    },
    
    /**
     * Go back to previous step
     */
    previousStep: () => {
      const current = store.currentStep();
      const steps: OnboardingStep[] = ['upload', 'validating', 'languageSelect', 'partySelect', 'analyzing', 'complete'];
      const currentIndex = steps.indexOf(current);
      
      if (currentIndex > 0) {
        patchState(store, { currentStep: steps[currentIndex - 1] });
      }
    },
    
    /**
     * Set validation result
     */
    setValidationResult: (isValid: boolean, documentType?: string, error?: string) => {
      patchState(store, {
        isValidContract: isValid,
        documentType: documentType || null,
        validationError: error || null,
        currentStep: isValid ? 'languageSelect' : 'upload',
      });
    },
    
    /**
     * Set detected language
     */
    setDetectedLanguage: (language: string) => {
      patchState(store, { detectedLanguage: language });
    },
    
    /**
     * Set selected language
     */
    setSelectedLanguage: (language: string) => {
      patchState(store, { 
        selectedLanguage: language,
        currentStep: 'partySelect',
      });
    },
    
    /**
     * Set detected parties
     */
    setDetectedParties: (parties: PartyDetectionResult) => {
      patchState(store, { detectedParties: parties });
    },
    
    /**
     * Set selected role
     */
    setSelectedRole: (role: UserRole) => {
      patchState(store, { 
        selectedRole: role,
        currentStep: 'analyzing',
      });
    },
    
    /**
     * Set processing state
     */
    setProcessing: (isProcessing: boolean) => {
      patchState(store, { isProcessing });
    },
    
    /**
     * Set error
     */
    setError: (error: string | null) => {
      patchState(store, { error });
    },
    
    /**
     * Complete onboarding
     */
    complete: () => {
      patchState(store, { currentStep: 'complete' });
    },
    
    /**
     * Reset to initial state
     */
    reset: () => {
      patchState(store, initialState);
    },
  }))
);

/**
 * Helper: Get icon for role
 */
function getIconForRole(role: string): string {
  const roleMap: Record<string, string> = {
    'Employer': '🏢',
    'Employee': '🧑‍💻',
    'Client': '💼',
    'Contractor': '🔧',
    'Landlord': '🏠',
    'Tenant': '🔑',
    'Partner': '🤝',
  };
  
  return roleMap[role] || '📄';
}

