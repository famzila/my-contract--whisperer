/**
 * Onboarding Store - NgRx SignalStore
 * Manages the smart onboarding flow for contract analysis
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods, withHooks } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { TranslatorService } from '../services/ai/translator.service';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from '../services/logger.service';
import { OfflineDetectionService } from '../services/offline-detection.service';
import { AppConfig } from '../config/application.config';
import { MOCK_ONBOARDING_STATE } from '../../../../public/mocks/mock-analysis.data';
import type { UserRole, PartyDetectionResult } from '../models/ai-analysis.model';

/**
 * Onboarding steps
 */
type OnboardingStep = 
  | 'upload'           // Step 1: Upload contract
  | 'validating'       // Step 2: Validate contract
  | 'languageSelect'   // Step 3: Select language preference
  | 'partySelect'      // Step 4: Select your role/party
  | 'analyzing';       // Step 5: Analyzing contract

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
  isProcessing: boolean;
  error: string | null;
}

/**
 * Initial state - clean production state
 * Mock data is loaded via onInit hook if needed
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
  withComputed((store) => {
    const offlineDetection = inject(OfflineDetectionService);
    const { currentStep, isValidContract, detectedLanguage, selectedOutputLanguage, userPreferredLanguage, selectedRole, detectedParties } = store;
    
    return {
    /**
     * Get progress percentage (0-100)
     */
    progressPercentage: computed(() => {
      const steps: OnboardingStep[] = ['upload', 'validating', 'languageSelect', 'partySelect', 'analyzing'];
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
        return false;
      }
      
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
     * Check if analysis is disabled (offline AND AI unavailable)
     * Components should use this instead of directly injecting OfflineDetectionService
     */
    isAnalysisDisabled: computed(() => {
      return offlineDetection.isFullyOffline();
    }),
   
  };
 }),
  
  // Methods
  withMethods((store, translatorService = inject(TranslatorService), translate = inject(TranslateService), logger = inject(LoggerService)) => ({
    
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
      logger.info(`\n🌍 [Onboarding] User selected output language: "${language}"`);
      logger.info(`📋 [Onboarding] Context:`, {
        detectedContractLanguage: store.detectedLanguage(),
        userPreferredLanguage: store.userPreferredLanguage(),
        selectedOutputLanguage: language,
      });
      
      // 🔑 KEY FIX: Pre-create translator during user gesture to download language pack
      const contractLang = store.detectedLanguage();
      if (contractLang && contractLang !== language) {
        logger.info(`📥 [Onboarding] Pre-creating translator: ${contractLang} → ${language}`);
        try {
          await translatorService.createTranslator({
            sourceLanguage: contractLang,
            targetLanguage: language,
          });
          logger.info(`✅ [Onboarding] Translator pre-created successfully`);
        } catch (error) {
          logger.error(`❌ [Onboarding] Failed to pre-create translator:`, error);
        }
      }
      
      patchState(store, { 
        selectedOutputLanguage: language,
        currentStep: 'partySelect',
      });
      
      logger.info(`✅ [Onboarding] Language selection saved, moving to party selection\n`);
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
     * Reset to initial state
     */
    reset: () => {
      patchState(store, initialState);
    },
  })),
  
  // Lifecycle hooks
  withHooks({
    onInit(store) {
      const logger = inject(LoggerService);
      logger.info('🚀 [OnboardingStore] Initializing store...');
      
      // Initialize with mock data if in mock mode
      if (AppConfig.AI.USE_MOCK_AI) {
        logger.info('🎨 [OnboardingStore] Mock mode enabled - loading mock data');
        
        patchState(store, MOCK_ONBOARDING_STATE as OnboardingState);
        
        logger.info('✅ [OnboardingStore] Mock data loaded successfully');
      } else {
        logger.info('🏭 [OnboardingStore] Production mode - clean state initialized');
      }
    },
    
    onDestroy(store) {
      // Reset onboarding state to prepare for new contract upload
      // Keep userPreferredLanguage for better UX
      const userPrefLang = store.userPreferredLanguage();
      patchState(store, {
        ...initialState,
        userPreferredLanguage: userPrefLang
      });
    }
  })
);

