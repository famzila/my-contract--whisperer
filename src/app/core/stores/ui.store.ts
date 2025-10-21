/**
 * UI Store - NgRx SignalStore
 * Manages global UI state (modals, toasts, theme)
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods, withHooks } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { ModalConfig, ModalService } from '../services/modal.service';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

/**
 * Modal state
 */
export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * UI store state shape
 */
interface UiState {
  // Theme
  theme: 'light' | 'dark' | 'auto';
  
  // Modals
  helpModal: ModalState;
  settingsModal: ModalState;
  
  // Toasts
  toasts: Toast[];
  
  // Sidebar
  isSidebarOpen: boolean;
  
  // AI Services Status
  aiServicesChecked: boolean;
}

/**
 * Initial state
 */
const initialState: UiState = {
  theme: 'dark',
  helpModal: { isOpen: false },
  settingsModal: { isOpen: false },
  toasts: [],
  isSidebarOpen: true,
  aiServicesChecked: false,
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
    },
    
    /**
     * Toggle theme
     */
    toggleTheme: () => {
      const currentTheme = store.theme();
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      patchState(store, { theme: newTheme });
      
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    
    /**
     * Open help modal
     */
    openHelpModal: (title?: string, content?: string) => {
      patchState(store, {
        helpModal: { isOpen: true, title, content, size: 'lg' },
      });
    },
    
    /**
     * Close help modal
     */
    closeHelpModal: () => {
      patchState(store, {
        helpModal: { isOpen: false },
      });
    },
    
    /**
     * Open settings modal
     */
    openSettingsModal: () => {
      patchState(store, {
        settingsModal: { isOpen: true, title: 'Settings', size: 'md' },
      });
    },
    
    /**
     * Close settings modal
     */
    closeSettingsModal: () => {
      patchState(store, {
        settingsModal: { isOpen: false },
      });
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
     * Toggle sidebar
     */
    toggleSidebar: () => {
      patchState(store, { isSidebarOpen: !store.isSidebarOpen() });
    },
    
    /**
     * Set AI services checked
     */
    setAiServicesChecked: (checked: boolean) => {
      patchState(store, { aiServicesChecked: checked });
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
    openEmailDraft: (emailData: any, config?: ModalConfig) => {
      return modalService.openEmailDraft(emailData, config);
    },

    /**
     * Open Language Mismatch Modal
     */
    openLanguageMismatch: (languageData: any, config?: ModalConfig) => {
      return modalService.openLanguageMismatch(languageData, config);
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
    onInit({ theme }) {
      // Apply the initial theme to the document
      if (theme() === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  })
);

