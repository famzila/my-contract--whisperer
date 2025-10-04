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
     * @param questions - Array of questions to include in the email
     * @param recipientName - Name of the party receiving the email (e.g., company name, landlord)
     * @param senderName - Name of the party sending the email (e.g., your name, employee)
     * @param senderRole - Role of the sender (e.g., 'Landlord', 'Tenant', 'Employer')
     * @param recipientRole - Role of the recipient (e.g., 'Tenant', 'Landlord', 'Employee')
     */
    async draftEmail(
      questions: string[],
      recipientName: string,
      senderName: string,
      senderRole: string = '',
      recipientRole: string = ''
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
          const mockEmail = generateMockEmail(recipientName, senderName, senderRole, recipientRole, questions);
          
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
        
        const prompt = buildEmailPrompt(recipientName, senderName, senderRole, recipientRole, questions);
        const stream = await writerService.writeStreaming(prompt, {
          tone: 'formal',
          length: 'medium',
          sharedContext: `This is a professional email from ${senderName} to ${recipientName} regarding a contract agreement.`,
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
        const mockEmail = generateMockEmail(recipientName, senderName, senderRole, recipientRole, questions);
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
function buildEmailPrompt(
  recipientName: string, 
  senderName: string, 
  senderRole: string, 
  recipientRole: string, 
  questions: string[]
): string {
  const questionsList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
  
  // Context-aware greeting based on roles
  const contextIntro = getContextualIntro(senderRole, recipientRole);
  
  return `Write a professional, polite email from ${senderName} (${senderRole}) to ${recipientName} (${recipientRole}) asking for clarification on the following points from a contract agreement:

${questionsList}

The email should:
- Start with "Subject: Clarification on Contract Agreement Terms"
- Address the recipient as "Dear ${recipientName},"
${contextIntro}
- List the questions in a numbered format
- Mention that clarity will help ensure alignment and a successful relationship
- End with "Best regards," followed by ${senderName}
- Be professional, courteous, concise but complete

Format the email with proper structure including Subject, Greeting, Body, and Closing.`;
}

/**
 * Get context-aware introduction based on sender/recipient roles
 */
function getContextualIntro(senderRole: string, recipientRole: string): string {
  const rolePair = `${senderRole.toLowerCase()}-${recipientRole.toLowerCase()}`;
  
  const intros: Record<string, string> = {
    'tenant-landlord': '- Express appreciation for the lease opportunity and mention review of the agreement',
    'landlord-tenant': '- Acknowledge the lease application and mention discussion of terms',
    'employee-employer': '- Express excitement about the position and mention review of the employment agreement',
    'employer-employee': '- Acknowledge the candidate and mention clarification on employment terms',
    'contractor-client': '- Express appreciation for the project opportunity and mention review of the service agreement',
    'client-contractor': '- Acknowledge the proposal and mention discussion of project terms',
  };
  
  return intros[rolePair] || '- Express appreciation for the opportunity and mention review of the agreement';
}

/**
 * Helper: Generate mock email when Writer API is not available
 */
function generateMockEmail(
  recipientName: string, 
  senderName: string,
  senderRole: string,
  recipientRole: string,
  questions: string[]
): string {
  const questionsList = questions
    .slice(0, 5) // Limit to first 5 questions for readability
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n\n');
  
  // Context-aware opening based on roles
  const opening = getMockEmailOpening(senderRole, recipientRole, recipientName);
  
  return `Subject: Clarification on Contract Agreement Terms

Dear ${recipientName} Team,

${opening}

Before I proceed with signing, I would appreciate clarification on the following points to ensure I fully understand the terms:

${questionsList}

I believe having clarity on these matters will help ensure we are aligned and will contribute to a successful working relationship.

I look forward to your response and appreciate your time in addressing these questions.

Best regards,
${senderName}`;
}

/**
 * Get context-aware email opening based on roles
 */
function getMockEmailOpening(senderRole: string, recipientRole: string, recipientName: string): string {
  const rolePair = `${senderRole.toLowerCase()}-${recipientRole.toLowerCase()}`;
  
  const openings: Record<string, string> = {
    'tenant-landlord': `Thank you for providing the lease agreement for the property. I have carefully reviewed the terms and am excited about the opportunity to rent from you.`,
    'landlord-tenant': `Thank you for your interest in the property. I have reviewed your application and would like to clarify a few terms in the lease agreement.`,
    'employee-employer': `Thank you for the employment offer at ${recipientName}. I am excited about the opportunity to join your team and have carefully reviewed the employment agreement.`,
    'employer-employee': `We are pleased to offer you a position with our organization. Before finalizing the agreement, I would like to clarify a few terms.`,
    'contractor-client': `Thank you for the opportunity to work on this project. I have reviewed the service agreement and would like to clarify a few points.`,
    'client-contractor': `We appreciate your proposal and are interested in moving forward. Before finalizing the agreement, I have a few questions about the terms.`,
  };
  
  return openings[rolePair] || `Thank you for the contract agreement. I have carefully reviewed the document and would like to clarify a few points.`;
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

