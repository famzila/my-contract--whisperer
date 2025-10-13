/**
 * Onboarding Store - NgRx SignalStore
 * Manages the smart onboarding flow for contract analysis
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { TranslatorService } from '../services/ai/translator.service';
import { TranslateService } from '@ngx-translate/core';

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
  detectedLanguage: string | null;              // Contract's detected language (e.g., "en", "fr")
  selectedOutputLanguage: string | null;        // User's choice for analysis OUTPUT language
  userPreferredLanguage: string;                // User's UI language preference (default 'en')
  
  // Party detection
  detectedParties: PartyDetectionResult | null;
  selectedRole: UserRole;
  
  // Temporarily store parsed contract during onboarding
  pendingContractText: string | null;
  
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
  selectedOutputLanguage: null,
  userPreferredLanguage: 'en',  // Default to English
  detectedParties: null,
  selectedRole: null,
  pendingContractText: null,
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
  withComputed(({ currentStep, isValidContract, detectedLanguage, selectedOutputLanguage, userPreferredLanguage, selectedRole, detectedParties }) => ({
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
     * Show modal ONLY if there's an actual language mismatch
     */
    needsLanguageSelection: computed(() => {
      const detected = detectedLanguage();
      const selected = selectedOutputLanguage();
      const preferred = userPreferredLanguage();
      
      // If no language detected yet, don't show modal
      if (!detected) return false;
      
      // If user already selected a language, don't show modal
      if (selected) return false;
      
      // CRITICAL: Only show modal if detected language is DIFFERENT from user's preferred language
      if (detected === preferred) {
        console.log(`✅ Language match: detected "${detected}" === preferred "${preferred}" - No modal needed`);
        return false;
      }
      
      console.log(`🌍 Language mismatch: detected "${detected}" !== preferred "${preferred}" - Show modal`);
      return true;
    }),
    
    /**
     * Check if party selection is needed
     * Only show party modal when:
     * 1. Contract is valid
     * 2. Language has been selected (no language modal showing)
     * 3. Party extraction is complete (detectedParties is not null)
     * 4. User hasn't selected a role yet
     */
    needsPartySelection: computed(() => {
      const valid = isValidContract() === true;
      const languageSelected = selectedOutputLanguage() !== null;
      const partiesDetected = detectedParties() !== null;
      const noRoleSelected = !selectedRole();
      
      return valid && languageSelected && partiesDetected && noRoleSelected;
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
          label: 'Compare Both Perspectives', // Will be translated in the component
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
        selectedOutputLanguage() !== null &&
        selectedRole() !== null
      );
    }),
  })),
  
  // Methods
  withMethods((store, translatorService = inject(TranslatorService), translate = inject(TranslateService)) => ({
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
     * Set user's preferred app language
     */
    setUserPreferredLanguage: (language: string) => {
      patchState(store, { userPreferredLanguage: language });
    },
    
    /**
     * Set detected language
     */
    setDetectedLanguage: (language: string) => {
      patchState(store, { detectedLanguage: language });
    },
    
    /**
     * Set selected language and pre-create translator (requires user gesture)
     */
    setSelectedLanguage: async (language: string) => {
      console.log(`\n🌍 [Onboarding] User selected output language: "${language}"`);
      console.log(`📋 [Onboarding] Context:`, {
        detectedContractLanguage: store.detectedLanguage(),
        userPreferredLanguage: store.userPreferredLanguage(),
        selectedOutputLanguage: language,
      });
      
      // 🔑 KEY FIX: Pre-create translator during user gesture to download language pack
      const contractLang = store.detectedLanguage();
      if (contractLang && contractLang !== language) {
        console.log(`📥 [Onboarding] Pre-creating translator: ${contractLang} → ${language}`);
        try {
          await translatorService.createTranslator({
            sourceLanguage: contractLang,
            targetLanguage: language,
          });
          console.log(`✅ [Onboarding] Translator pre-created successfully`);
        } catch (error) {
          console.error(`❌ [Onboarding] Failed to pre-create translator:`, error);
        }
      }
      
      patchState(store, { 
        selectedOutputLanguage: language,
        currentStep: 'partySelect',
      });
      
      console.log(`✅ [Onboarding] Language selection saved, moving to party selection\n`);
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
     * Store pending contract text during onboarding
     */
    setPendingContract: (text: string) => {
      patchState(store, { pendingContractText: text });
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

