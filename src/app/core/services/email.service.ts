/**
 * Email Service
 * Handles email drafting, rewriting, and language correction logic
 * Separates business logic from state management
 */
import { Injectable, inject } from '@angular/core';
import { WriterService } from './ai/writer.service';
import { LanguageDetectorService } from './ai/language-detector.service';
import { TranslatorService } from './ai/translator.service';
import { LoggerService } from './logger.service';
import { generateMockEmail, mapToneToRewriterAPI, mapLengthToRewriterAPI } from '../utils/email.util';
import { getLanguageName } from '../utils/language.util';
import { AppConfig } from '../config/application.config';
import type { ContractMetadata } from '../schemas/analysis-schemas';
import { EmailContext, EmailResult, RewriteOptions } from '../models/email.model';

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private writerService = inject(WriterService);
  private languageDetectorService = inject(LanguageDetectorService);
  private translatorService = inject(TranslatorService);
  private logger = inject(LoggerService);

  /**
   * Draft a professional email with smart context detection
   * Automatically determines sender/recipient from contract metadata
   */
  async draftProfessionalEmailWithContext(
    questions: string[],
    metadata: ContractMetadata,
    selectedRole: string | null
  ): Promise<EmailResult> {
    if (questions.length === 0) {
      this.logger.warn('No questions to draft email');
      return { content: '', language: 'en', error: 'No questions provided' };
    }
    
    if (!metadata) {
      this.logger.error('No contract metadata available for email drafting');
      return { content: '', language: 'en', error: 'No contract metadata available' };
    }
    
    // Determine sender/recipient logic
    const context = this.determineEmailContext(metadata, selectedRole);
    const contractLanguage = metadata.detectedLanguage || 'en';
    
    this.logger.info(`✉️ [Email] Drafting in ${contractLanguage} from ${context.senderName} (${context.senderRole}) TO ${context.recipientName} (${context.recipientRole})`);
    
    return this.draftEmail({
      questions,
      recipientName: context.recipientName,
      senderName: context.senderName,
      senderRole: context.senderRole,
      recipientRole: context.recipientRole,
      contractLanguage,
    });
  }

  /**
   * Draft a professional email using Writer API
   */
  async draftEmail(context: EmailContext): Promise<EmailResult> {
    if (context.questions.length === 0) {
      this.logger.warn('No questions to draft email');
      return { content: '', language: context.contractLanguage, error: 'No questions provided' };
    }
    
    try {
      // Check if Writer API is available
      const isAvailable = await this.writerService.isWriterAvailable();
      
      if (!isAvailable || AppConfig.AI.USE_MOCK_AI) {
        // Use mock email if Writer API not available or in mock mode
        this.logger.info('📧 Using mock email template (Writer API not available or mock mode enabled)');
        const mockEmail = generateMockEmail(
          context.recipientName,
          context.senderName,
          context.senderRole,
          context.recipientRole,
          context.questions,
          context.contractLanguage
        );
        
        // Simulate delay for realistic UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          content: mockEmail,
          language: context.contractLanguage,
        };
      }
      
      // Use Writer API to generate professional email with streaming
      this.logger.info(`✍️ Drafting email in ${context.contractLanguage} with Writer API (streaming)...`);
      
      const prompt = this.buildEmailPrompt(context);
      const stream = await this.writerService.writeStreaming(prompt, {
        tone: 'formal',
        length: 'medium',
        sharedContext: `This is a professional email in ${getLanguageName(context.contractLanguage)} from ${context.senderName} to ${context.recipientName} regarding a contract agreement.`,
      });
      
      // Process the stream
      let emailText = '';
      for await (const chunk of stream) {
        emailText += chunk;
      }
      
      this.logger.info('✅ Email drafted successfully');
      return {
        content: emailText,
        language: context.contractLanguage,
      };
    } catch (error) {
      this.logger.error('❌ Error drafting email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to draft email';
      
      // Fallback to mock email on error
      const mockEmail = generateMockEmail(
        context.recipientName,
        context.senderName,
        context.senderRole,
        context.recipientRole,
        context.questions,
        context.contractLanguage
      );
      
      return {
        content: mockEmail,
        language: context.contractLanguage,
        error: errorMessage,
      };
    }
  }
  
  /**
   * Rewrite email with new tone/length using Rewriter API with streaming
   */
  async rewriteEmail(
    currentEmail: string,
    emailLanguage: string,
    options: RewriteOptions
  ): Promise<EmailResult> {
    if (!currentEmail) {
      this.logger.warn('No email to rewrite');
      return { content: '', language: emailLanguage, error: 'No email to rewrite' };
    }
    
    if (!emailLanguage) {
      this.logger.warn('No email language found, defaulting to English');
      emailLanguage = 'en';
    }
    
    const languageName = getLanguageName(emailLanguage);
    
    try {
      // Check if Rewriter API is available
      const isAvailable = await this.writerService.isRewriterAvailable();
      
      if (!isAvailable || AppConfig.AI.USE_MOCK_AI) {
        // Fallback to Writer API in mock mode
        this.logger.info(`🔄 Using Writer API for rewriting in ${languageName} (mock mode or Rewriter unavailable)`);
        
        const prompt = `Rewrite this professional email IN ${languageName.toUpperCase()} with a ${options.tone} tone and make it ${options.length} length:

        ${currentEmail}

        IMPORTANT: Maintain the SAME LANGUAGE (${languageName}). Keep all key information and questions.`;
        
        const rewritten = await this.writerService.write(prompt, {
          tone: options.tone,
          length: options.length,
          sharedContext: `Rewriting email in ${languageName} language`,
        });
        
        return {
          content: rewritten,
          language: emailLanguage,
        };
      }
      
      // Use Rewriter API with language-specific context in prompt
      this.logger.info(`🔄 Rewriting email in ${languageName} with Rewriter API (streaming)...`);
      
      // Create a language-aware rewrite prompt
      const languageContext = `LANGUAGE CONTEXT: This email is in ${languageName}. Maintain this language throughout the rewrite.`;
      const enhancedEmail = `${languageContext}\n\n${currentEmail}`;
      
      // Map user-friendly options to Rewriter API values
      const rewriterTone = mapToneToRewriterAPI(options.tone);
      const rewriterLength = mapLengthToRewriterAPI(options.length);
      
      const stream = await this.writerService.rewriteStreaming(enhancedEmail, {
        tone: rewriterTone,
        length: rewriterLength,
      });
      
      // Process the stream
      let rewrittenText = '';
      for await (const chunk of stream) {
        rewrittenText += chunk;
      }
      
      // Check if language changed and translate if needed
      const finalEmail = await this.ensureCorrectLanguage(rewrittenText, emailLanguage, languageName);
      
      this.logger.info('✅ Email rewritten successfully');
      return {
        content: finalEmail,
        language: emailLanguage,
      };
    } catch (error) {
      this.logger.error('❌ Error rewriting email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to rewrite email';
      
      return {
        content: currentEmail, // Keep original email on error
        language: emailLanguage,
        error: errorMessage,
      };
    }
  }
  
  /**
   * Copy email to clipboard
   */
  async copyEmailToClipboard(email: string): Promise<boolean> {
    if (!email) return false;
    
    try {
      await navigator.clipboard.writeText(email);
      this.logger.info('✅ Email copied to clipboard');
      return true;
    } catch (err) {
      this.logger.error('❌ Failed to copy email:', err);
      return false;
    }
  }
  
  /**
   * Determine email context from contract metadata and selected role
   */
  private determineEmailContext(metadata: ContractMetadata, selectedRole: string | null): Omit<EmailContext, 'questions' | 'contractLanguage'> {
    let senderName = 'you';
    let recipientName = 'the other party';
    let senderRole = '';
    let recipientRole = '';
    
    if (metadata.parties?.party1 && metadata.parties?.party2) {
      if (metadata.parties.party1.role?.toLowerCase() === selectedRole?.toLowerCase()) {
        // Viewing as party1 - you ARE party1, email TO party2
        senderName = metadata.parties.party1.name;
        recipientName = metadata.parties.party2.name;
        senderRole = metadata.parties.party1.role || '';
        recipientRole = metadata.parties.party2.role || '';
      } else if (metadata.parties.party2.role?.toLowerCase() === selectedRole?.toLowerCase()) {
        // Viewing as party2 - you ARE party2, email TO party1
        senderName = metadata.parties.party2.name;
        recipientName = metadata.parties.party1.name;
        senderRole = metadata.parties.party2.role || '';
        recipientRole = metadata.parties.party1.role || '';
      }
    }
    
    return {
      recipientName,
      senderName,
      senderRole,
      recipientRole,
    };
  }
  
  /**
   * Build email prompt using PromptBuilderService
   */
  private buildEmailPrompt(context: EmailContext): string {
    const questionsList = context.questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
    const languageName = getLanguageName(context.contractLanguage);
    
    // Context-aware greeting based on roles
    const contextIntro = this.getContextualIntro(context.senderRole, context.recipientRole);
    
    return `Write a professional, polite email IN ${languageName.toUpperCase()} from ${context.senderName} (${context.senderRole}) to ${context.recipientName} (${context.recipientRole}) asking for clarification on the following points from a contract agreement:

        ${questionsList}

        IMPORTANT: The email MUST be written in ${languageName} because that is the language of the contract being discussed.

        The email should:
        - Start with "Subject: Clarification on Contract Agreement Terms" (translated to ${languageName} if not English)
        - Address the recipient as "Dear ${context.recipientName},"
        ${contextIntro}
        - List the questions in a numbered format
        - Mention that clarity will help ensure alignment and a successful relationship
        - End with "Best regards," followed by ${context.senderName}
        - Be professional, courteous, concise but complete
        - Use proper ${languageName} grammar, vocabulary, and business email conventions

        Format the email with proper structure including Subject, Greeting, Body, and Closing.`;
  }
  
  /**
   * Get context-aware introduction based on sender/recipient roles
   */
  private getContextualIntro(senderRole: string, recipientRole: string): string {
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
   * Ensure the rewritten email is in the correct language
   * Uses translation as fallback if Rewriter API changed the language
   */
  private async ensureCorrectLanguage(
    rewrittenEmail: string, 
    targetLanguage: string, 
    languageName: string
  ): Promise<string> {
    try {
      // Skip language check for English (most common case)
      if (targetLanguage === 'en') {
        this.logger.info(`🔍 [Language Check] Skipping check for English`);
        return rewrittenEmail;
      }
      
      // Detect the language of the rewritten email
      const detectedLanguage = await this.languageDetectorService.detect(rewrittenEmail);
      
      if (!detectedLanguage) {
        this.logger.warn('⚠️ [Language Check] Could not detect language, keeping original');
        return rewrittenEmail;
      }
      
      // If language matches target, we're good
      if (detectedLanguage === targetLanguage) {
        this.logger.info(`✅ [Language Check] Email is correctly in ${languageName} (${targetLanguage})`);
        return rewrittenEmail;
      }
      
      // Language changed! Translate back to target language
      this.logger.info(`🔄 [Language Check] Language changed from ${targetLanguage} to ${detectedLanguage}, translating back...`);
      
      const translatedEmail = await this.translatorService.translate(
        rewrittenEmail,
        detectedLanguage,
        targetLanguage
      );
      
      this.logger.info(`✅ [Language Check] Successfully translated back to ${languageName}`);
      return translatedEmail;
      
    } catch (error) {
      this.logger.error('❌ [Language Check] Error in language correction:', error);
      // Return original rewritten email if translation fails
      return rewrittenEmail;
    }
  }
}
