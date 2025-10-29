/**
 * UI Store - NgRx SignalStore
 * Manages global UI state (modals, toasts, theme)
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods, withHooks } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { ModalConfig, ModalService } from '../services/modal.service';
import { APPLICATION_CONFIG } from '../config/application.config';
import type { ContractMetadata } from '../schemas/analysis-schemas';

/**
 * Email draft data for modal
 */
interface EmailDraftData {
  emailContent: string | null;
  isRewriting: boolean;
  showRewriteOptions: boolean;
  rewriteOptions: {
    tone: 'formal' | 'neutral' | 'casual';
    length: 'short' | 'medium' | 'long';
  };
}

/**
 * Language mismatch data for modal
 */
interface LanguageMismatchData {
  detectedLanguage: string | null;
  preferredLanguage: string;
  isContractLanguageSupported: boolean;
  isContractLanguageAvailableInUI: boolean;
  canAnalyzeDirectly: boolean;
  needsPreTranslation: boolean;
  onSelectUserLanguage: () => void;
  getLanguageName: (code: string) => string;
  getLanguageFlag: (code: string) => string;
}

/**
 * Toast notification
 */
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}


/**
 * UI store state shape
 */
interface UiState {
  // Theme
  theme: 'light' | 'dark' | 'auto';
  
  // Toasts
  toasts: Toast[];
}

/**
 * Initial state
 */
const initialState: UiState = {
  theme: APPLICATION_CONFIG.UI.DEFAULT_THEME,
  toasts: [],
};

/**
 * UI Store
 */
export const UiStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  // Computed values
  withComputed(({ theme, toasts }) => ({
    isDarkMode: computed(() => theme() === 'dark'),
    hasToasts: computed(() => toasts().length > 0),
  })),
  
  // Methods
  withMethods((store, modalService = inject(ModalService)) => ({
    /**
     * Set theme
     */
    setTheme: (theme: 'light' | 'dark' | 'auto') => {
      patchState(store, { theme });
      
      // Apply theme to document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Save to localStorage immediately
      localStorage.setItem(APPLICATION_CONFIG.UI.DEFAULT_THEME_STORAGE_KEY, theme);
    },
    
    /**
     * Toggle theme
     */
    toggleTheme: () => {
      const currentTheme = store.theme();
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      patchState(store, { theme: newTheme });
      
      // Apply theme to document
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Save to localStorage immediately
      localStorage.setItem(APPLICATION_CONFIG.UI.DEFAULT_THEME_STORAGE_KEY, newTheme);
    },
    
    
    /**
     * Show toast notification
     */
    showToast: (message: string, type: Toast['type'] = 'info', duration = 3000) => {
      const toast: Toast = {
        id: Date.now().toString(),
        message,
        type,
        duration,
      };
      
      const currentToasts = store.toasts();
      patchState(store, { toasts: [...currentToasts, toast] });
      
      // Auto-dismiss after duration
      if (duration > 0) {
        setTimeout(() => {
          const updatedToasts = store.toasts().filter(t => t.id !== toast.id);
          patchState(store, { toasts: updatedToasts });
        }, duration);
      }
    },
    
    /**
     * Dismiss toast
     */
    dismissToast: (toastId: string) => {
      const updatedToasts = store.toasts().filter(t => t.id !== toastId);
      patchState(store, { toasts: updatedToasts });
    },
    
    /**
     * Clear all toasts
     */
    clearToasts: () => {
      patchState(store, { toasts: [] });
    },
    
    /**
     * Reset UI state
     */
    reset: () => {
      patchState(store, initialState);
    },

    // ===== MODAL MANAGEMENT =====
    
    /**
     * Open Sample Contract Modal
     */
    openSampleContract: (config?: ModalConfig) => {
      return modalService.openSampleContract(config);
    },

    /**
     * Open How It Works Modal
     */
    openHowItWorks: (config?: ModalConfig) => {
      return modalService.openHowItWorks(config);
    },

    /**
     * Open Privacy Policy Modal
     */
    openPrivacyPolicy: (config?: ModalConfig) => {
      return modalService.openPrivacyPolicy(config);
    },

    /**
     * Open Terms of Service Modal
     */
    openTermsOfService: (config?: ModalConfig) => {
      return modalService.openTermsOfService(config);
    },

    /**
     * Open Party Selector Modal
     */
    openPartySelector: (config?: ModalConfig) => {
      return modalService.openPartySelector(config);
    },

    /**
     * Open Email Draft Modal
     */
    openEmailDraft: (emailData: EmailDraftData, config?: ModalConfig) => {
      return modalService.openEmailDraft(emailData, config);
    },

    /**
     * Open Language Mismatch Modal
     */
    openLanguageMismatch: (languageData: LanguageMismatchData, config?: ModalConfig) => {
      return modalService.openLanguageMismatch(languageData, config);
    },

    /**
     * Open FAQ Modal
     */
    openFaq: (config?: ModalConfig) => {
      return modalService.openFaq(config);
    },

    /**
     * Close all modals
     */
    closeAllModals: () => {
      modalService.closeAll();
    },

  })),
  
  // Lifecycle hooks
  withHooks({
    onInit(store) {
      // Load saved theme from localStorage
      const savedTheme = (localStorage.getItem(APPLICATION_CONFIG.UI.DEFAULT_THEME_STORAGE_KEY) || APPLICATION_CONFIG.UI.DEFAULT_THEME) as 'light' | 'dark' | 'auto';
      patchState(store, { theme: savedTheme });
      
      // Apply theme to document immediately
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    
    onDestroy(store) {
      // Close all modals on destroy if they are open
      store.closeAllModals();
      
    }
  })
);

