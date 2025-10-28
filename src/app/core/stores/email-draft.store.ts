/**
 * Email Draft Store - NgRx SignalStore
 * Manages email drafting state and UI interactions
 * Business logic is handled by EmailService
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { EmailContext, RewriteOptions } from '../models/email.model';
import { EmailService } from '../services/email.service';
import { LoggerService } from '../services/logger.service';
import { APPLICATION_CONFIG } from '../config/application.config';
import type { ContractMetadata } from '../schemas/analysis-schemas';
import { AIWriterLength, AIWriterTone } from '../models/ai.types';

/**
 * Email draft store state shape
 */
interface EmailDraftState {
  // Email content
  draftedEmail: string | null;
  emailLanguage: string | null;  // Track the email's language (contract language)
  
  // Loading states
  isDrafting: boolean;
  isRewriting: boolean;
  
  // UI state
  showRewriteOptions: boolean;
  
  // Rewrite options
  rewriteTone: AIWriterTone;
  rewriteLength: AIWriterLength;
  
  // Error handling
  draftError: string | null;
  rewriteError: string | null;
}

/**
 * Initial state
 */
const initialState: EmailDraftState = {
  draftedEmail: null,
  emailLanguage: null,
  isDrafting: false,
  isRewriting: false,
  showRewriteOptions: false,
  rewriteTone: APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_TONE,
  rewriteLength: APPLICATION_CONFIG.AI.WRITER_DEFAULT_PARAMS.DEFAULT_LENGTH,
  draftError: null,
  rewriteError: null,
};

/**
 * Email Draft Store
 */
export const EmailDraftStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  // Methods to update state
  withMethods((store, emailService = inject(EmailService), logger = inject(LoggerService)) => ({
    /**
     * Draft a professional email with smart context detection
     * Delegates to EmailService for business logic
     */
    async draftProfessionalEmailWithContext(
      questions: string[],
      metadata: ContractMetadata,
      selectedRole: string | null
    ): Promise<void> {
      patchState(store, { 
        isDrafting: true, 
        draftError: null,
        draftedEmail: null,
      });

      try {
        const result = await emailService.draftProfessionalEmailWithContext(questions, metadata, selectedRole);
        
        patchState(store, { 
          draftedEmail: result.content,
          emailLanguage: result.language,
          isDrafting: false,
          draftError: result.error || null,
        });
      } catch (error) {
        logger.error('❌ Error in email drafting:', error);
        patchState(store, { 
          isDrafting: false,
          draftError: error instanceof Error ? error.message : 'Failed to draft email',
        });
      }
    },

    /**
     * Draft a professional email using EmailService
     */
    async draftEmail(context: EmailContext): Promise<void> {
      patchState(store, { 
        isDrafting: true, 
        draftError: null,
        draftedEmail: null,
      });

      try {
        const result = await emailService.draftEmail(context);
        
        patchState(store, { 
          draftedEmail: result.content,
          emailLanguage: result.language,
          isDrafting: false,
          draftError: result.error || null,
        });
      } catch (error) {
        logger.error('❌ Error in email drafting:', error);
        patchState(store, { 
          isDrafting: false,
          draftError: error instanceof Error ? error.message : 'Failed to draft email',
        });
      }
    },
    
    /**
     * Rewrite email with new tone/length using EmailService
     */
    async rewriteEmail(): Promise<void> {
      const currentEmail = store.draftedEmail();
      const emailLanguage = store.emailLanguage();
      
      if (!currentEmail) {
        logger.warn('No email to rewrite');
        return;
      }
      
      patchState(store, { 
        isRewriting: true, 
        rewriteError: null 
      });
      
      try {
        const options: RewriteOptions = {
          tone: store.rewriteTone(),
          length: store.rewriteLength(),
        };
        
        const result = await emailService.rewriteEmail(currentEmail, emailLanguage || 'en', options);
        
        patchState(store, { 
          draftedEmail: result.content,
          isRewriting: false,
          rewriteError: result.error || null,
        });
      } catch (error) {
        logger.error('❌ Error in email rewriting:', error);
        patchState(store, { 
          isRewriting: false,
          rewriteError: error instanceof Error ? error.message : 'Failed to rewrite email',
        });
      }
    },
    
    /**
     * Copy email to clipboard using EmailService
     */
    async copyEmail(): Promise<boolean> {
      const email = store.draftedEmail();
      if (!email) return false;
      
      try {
        return await emailService.copyEmailToClipboard(email);
      } catch (error) {
        logger.error('❌ Failed to copy email:', error);
        return false;
      }
    },
    
    /**
     * Set rewrite tone
     */
    setRewriteTone: (tone: AIWriterTone) => {
      patchState(store, { rewriteTone: tone });
    },
    
    /**
     * Set rewrite length
     */
    setRewriteLength: (length: AIWriterLength) => {
      patchState(store, { rewriteLength: length });
    },
    
    /**
     * Toggle rewrite options panel
     */
    toggleRewriteOptions: () => {
      patchState(store, { showRewriteOptions: !store.showRewriteOptions() });
    },
    
    /**
     * Clear email and reset state
     */
    clearEmail: () => {
      patchState(store, {
        draftedEmail: null,
        showRewriteOptions: false,
        draftError: null,
        rewriteError: null,
      });
    },
    
    /**
     * Reset store to initial state
     */
    reset: () => {
      patchState(store, initialState);
    },
  })),
);


