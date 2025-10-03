/**
 * Email Draft Store - NgRx SignalStore
 * Manages email drafting, rewriting, and clipboard operations
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { WriterService } from '../services/ai/writer.service';
import { AppConfig } from '../config/app.config';

/**
 * Email draft store state shape
 */
interface EmailDraftState {
  // Email content
  draftedEmail: string | null;
  
  // Loading states
  isDrafting: boolean;
  isRewriting: boolean;
  
  // UI state
  showRewriteOptions: boolean;
  
  // Rewrite options
  rewriteTone: 'formal' | 'neutral' | 'casual';
  rewriteLength: 'short' | 'medium' | 'long';
  
  // Error handling
  draftError: string | null;
  rewriteError: string | null;
}

/**
 * Initial state
 */
const initialState: EmailDraftState = {
  draftedEmail: null,
  isDrafting: false,
  isRewriting: false,
  showRewriteOptions: false,
  rewriteTone: 'formal',
  rewriteLength: 'medium',
  draftError: null,
  rewriteError: null,
};

/**
 * Email Draft Store
 */
export const EmailDraftStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  // Computed values derived from state
  withComputed(({ draftedEmail, isDrafting, isRewriting }) => ({
    // Check if email is drafted
    hasEmail: computed(() => draftedEmail() !== null && draftedEmail() !== ''),
    
    // Check if any operation is in progress
    isLoading: computed(() => isDrafting() || isRewriting()),
  })),
  
  // Methods to update state
  withMethods((store, writerService = inject(WriterService)) => ({
    /**
     * Draft a professional email using Writer API
     */
    async draftEmail(
      questions: string[],
      employerName: string,
      employeeName: string
    ): Promise<void> {
      if (questions.length === 0) {
        console.warn('No questions to draft email');
        return;
      }
      
      patchState(store, { 
        isDrafting: true, 
        draftError: null,
        draftedEmail: null,
      });
      
      try {
        // Check if Writer API is available
        const isAvailable = await writerService.isWriterAvailable();
        
        if (!isAvailable || AppConfig.useMockAI) {
          // Use mock email if Writer API not available or in mock mode
          console.log('📧 Using mock email template (Writer API not available or mock mode enabled)');
          const mockEmail = generateMockEmail(employerName, employeeName, questions);
          
          // Simulate delay for realistic UX
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          patchState(store, { 
            draftedEmail: mockEmail, 
            isDrafting: false 
          });
          return;
        }
        
        // Use Writer API to generate professional email with streaming
        console.log('✍️ Drafting email with Writer API (streaming)...');
        
        const prompt = buildEmailPrompt(employerName, employeeName, questions);
        const stream = await writerService.writeStreaming(prompt, {
          tone: 'formal',
          length: 'medium',
          sharedContext: `This is a professional email from ${employeeName} to ${employerName} regarding an employment agreement.`,
        });
        
        // Process the stream - Writer API returns an async iterable of text chunks
        let emailText = '';
        
        for await (const chunk of stream as any) {
          emailText += chunk;
          
          // Update email in real-time for that "wow effect"
          patchState(store, { draftedEmail: emailText });
        }
        
        console.log('✅ Email drafted successfully');
        patchState(store, { isDrafting: false });
      } catch (error) {
        console.error('❌ Error drafting email:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to draft email';
        
        // Fallback to mock email on error
        const mockEmail = generateMockEmail(employerName, employeeName, questions);
        patchState(store, { 
          draftedEmail: mockEmail,
          draftError: errorMessage,
          isDrafting: false,
        });
      }
    },
    
    /**
     * Rewrite email with new tone/length using Rewriter API with streaming
     */
    async rewriteEmail(): Promise<void> {
      const currentEmail = store.draftedEmail();
      if (!currentEmail) {
        console.warn('No email to rewrite');
        return;
      }
      
      patchState(store, { 
        isRewriting: true, 
        rewriteError: null 
      });
      
      try {
        // Check if Rewriter API is available
        const isAvailable = await writerService.isRewriterAvailable();
        
        if (!isAvailable || AppConfig.useMockAI) {
          // Fallback to Writer API in mock mode
          console.log('🔄 Using Writer API for rewriting (mock mode or Rewriter unavailable)');
          
          const prompt = `Rewrite this email with a ${store.rewriteTone()} tone and make it ${store.rewriteLength()} length:\n\n${currentEmail}`;
          const rewritten = await writerService.write(prompt, {
            tone: store.rewriteTone(),
            length: store.rewriteLength(),
          });
          
          patchState(store, { 
            draftedEmail: rewritten, 
            isRewriting: false 
          });
          return;
        }
        
        // Use Rewriter API with streaming
        console.log('🔄 Rewriting email with Rewriter API (streaming)...');
        
        // Map user-friendly options to Rewriter API values
        const rewriterTone = mapToneToRewriterAPI(store.rewriteTone());
        const rewriterLength = mapLengthToRewriterAPI(store.rewriteLength());
        
        const stream = await writerService.rewriteStreaming(currentEmail, {
          tone: rewriterTone,
          length: rewriterLength,
        });
        
        // Process the stream
        // The Rewriter API returns an async iterable of text chunks
        let rewrittenText = '';
        
        for await (const chunk of stream as any) {
          rewrittenText += chunk;
          
          // Update email in real-time
          patchState(store, { draftedEmail: rewrittenText });
        }
        
        console.log('✅ Email rewritten successfully');
        patchState(store, { isRewriting: false });
      } catch (error) {
        console.error('❌ Error rewriting email:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to rewrite email';
        
        // Keep original email on error
        patchState(store, { 
          rewriteError: errorMessage,
          isRewriting: false,
        });
      }
    },
    
    /**
     * Copy email to clipboard
     */
    async copyEmail(): Promise<boolean> {
      const email = store.draftedEmail();
      if (!email) return false;
      
      try {
        await navigator.clipboard.writeText(email);
        console.log('✅ Email copied to clipboard');
        return true;
      } catch (err) {
        console.error('❌ Failed to copy email:', err);
        return false;
      }
    },
    
    /**
     * Set rewrite tone
     */
    setRewriteTone: (tone: 'formal' | 'neutral' | 'casual') => {
      patchState(store, { rewriteTone: tone });
    },
    
    /**
     * Set rewrite length
     */
    setRewriteLength: (length: 'short' | 'medium' | 'long') => {
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
  }))
);

/**
 * Helper: Build prompt for Writer API
 */
function buildEmailPrompt(employerName: string, employeeName: string, questions: string[]): string {
  const questionsList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
  
  return `Write a professional, polite email from ${employeeName} to the HR team or hiring manager at ${employerName} asking for clarification on the following points from an employment agreement:

${questionsList}

The email should:
- Start with "Subject: Clarification on Employment Agreement Terms"
- Address the recipient as "Dear HR Team" or "Dear Hiring Manager" (be specific to ${employerName})
- Express gratitude for receiving the agreement and excitement about the opportunity
- List the questions in a numbered format
- Mention that clarity will help ensure alignment and contribute to a successful working relationship
- End with "Best regards," followed by ${employeeName}
- Be professional, courteous, concise but complete

Format the email with proper structure including Subject, Greeting, Body, and Closing.`;
}

/**
 * Helper: Generate mock email when Writer API is not available
 */
function generateMockEmail(employerName: string, employeeName: string, questions: string[]): string {
  const questionsList = questions
    .slice(0, 5) // Limit to first 5 questions for readability
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n\n');
  
  return `Subject: Clarification on Employment Agreement Terms

Dear ${employerName} HR Team,

Thank you for sending over the Employment Agreement for the position at ${employerName}. I am excited about the opportunity to join your team.

Before I proceed with signing, I would appreciate clarification on the following points to ensure I fully understand the terms:

${questionsList}

I believe having clarity on these matters will help ensure we are aligned and will contribute to a successful working relationship.

I look forward to your response and appreciate your time in addressing these questions.

Best regards,
${employeeName}`;
}

/**
 * Helper: Map user-friendly tone to Rewriter API tone
 */
function mapToneToRewriterAPI(tone: 'formal' | 'neutral' | 'casual'): 'more-formal' | 'as-is' | 'more-casual' {
  switch (tone) {
    case 'formal':
      return 'more-formal';
    case 'neutral':
      return 'as-is';
    case 'casual':
      return 'more-casual';
  }
}

/**
 * Helper: Map user-friendly length to Rewriter API length
 */
function mapLengthToRewriterAPI(length: 'short' | 'medium' | 'long'): 'shorter' | 'as-is' | 'longer' {
  switch (length) {
    case 'short':
      return 'shorter';
    case 'medium':
      return 'as-is';
    case 'long':
      return 'longer';
  }
}

