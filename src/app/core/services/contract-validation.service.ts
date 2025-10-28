/**
 * Contract Validation Service
 * Uses AI to validate if uploaded document is a contract
 */
import { Injectable, inject } from '@angular/core';
import { PromptService } from './ai/prompt.service';
import { LoggerService } from './logger.service';
import { ContractValidationResult } from '../models/contract.model';
import { CONTRACT_VALIDATION_SCHEMA } from '../schemas/analysis-schemas';

@Injectable({
  providedIn: 'root',
})
export class ContractValidationService {
  private promptService = inject(PromptService);
  private logger = inject(LoggerService);

  /**
   * Validate if document is a contract
   */
  async validateContract(text: string): Promise<ContractValidationResult> {
    // Input validation
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
    if (text.length < 50) {
      this.logger.warn(`Text length (${text.length}) is very short for contract validation`);
    }
    if (text.length > 100000) {
      this.logger.warn(`Text length (${text.length}) exceeds recommended limit of 100000 characters`);
    }
    
    // Quick heuristic check first (fast)
    const quickCheck = this.quickHeuristicCheck(text);
    
    if (quickCheck.confidence > 80) {
      return quickCheck;
    }
    
    // Use AI for uncertain cases (slower but accurate)
    return await this.aiValidation(text);
  }

  /**
   * Quick heuristic validation (pattern matching)
   */
  private quickHeuristicCheck(text: string): ContractValidationResult {
    const lowerText = text.toLowerCase();
    
    // Contract indicators (strong signals)
    const contractIndicators = [
      'agreement',
      'contract',
      'party',
      'parties',
      'whereas',
      'terms and conditions',
      'obligations',
      'consideration',
      'effective date',
      'termination',
      'governing law',
      'jurisdiction',
      'hereinafter',
      'this agreement',
      'the parties agree',
      'subject to',
    ];
    
    // Non-contract indicators
    const nonContractIndicators = [
      'once upon a time',
      'chapter',
      'abstract',
      'introduction',
      'dear',
      'sincerely',
      'recipe',
      'ingredients',
      'instructions',
      'step 1',
      'step 2',
      'how to',
      'tutorial',
    ];
    
    // Count indicators
    const contractScore = contractIndicators.filter(indicator => 
      lowerText.includes(indicator)
    ).length;
    
    const nonContractScore = nonContractIndicators.filter(indicator => 
      lowerText.includes(indicator)
    ).length;
    
    // Strong contract indicators
    if (contractScore >= 5 && nonContractScore === 0) {
      return {
        isContract: true,
        confidence: Math.min(95, 70 + contractScore * 5),
        documentType: 'service_agreement', // Generic contract type
      };
    }
    
    // Strong non-contract indicators
    if (nonContractScore >= 2 && contractScore < 2) {
      return {
        isContract: false,
        confidence: 90,
        documentType: this.guessDocumentType(lowerText),
        reason: 'Document contains non-legal language patterns',
      };
    }
    
    // Uncertain - need AI
    return {
      isContract: false,
      confidence: 50,
      documentType: 'other',
      reason: 'Uncertain - needs AI validation',
    };
  }

  /**
   * AI-powered validation (more accurate)
   */
  private async aiValidation(text: string): Promise<ContractValidationResult> {
    try {
      const isAvailable = await this.promptService.isAvailable();
      
      if (!isAvailable) {
        // Fallback to heuristic if AI not available
        this.logger.warn('AI not available, using heuristic validation');
        return this.quickHeuristicCheck(text);
      }

      // Create analysis session with structured output using schema
      const session = await this.promptService.createSession({
        initialPrompts: [
          {
            role: 'system',
            content: `You are a legal document classifier. Analyze documents and determine if they are contracts.

A contract has:
- Two or more parties identified
- Legal terminology (agreement, obligations, terms, termination)
- Exchange of value or commitments
- Formal structure
- Signatures or execution dates

Not a contract:
- Essays, articles, blog posts
- Emails, letters
- Recipes, instructions
- Stories, fiction
- Academic papers

Classify the document and provide your analysis.`,
          },
        ],
      });

      // Analyze document (limit to first 2000 characters for speed)
      const sampleText = text.substring(0, 2000);
      const prompt = `Classify this document:\n\n${sampleText}`;
      
      // Use structured output with schema
      const response = await session.prompt(prompt, {
        responseConstraint: CONTRACT_VALIDATION_SCHEMA
      });
      
      // Parse structured response (should be valid JSON due to schema)
      const result = JSON.parse(response);
      
      // Cleanup session
      session.destroy();
      
      return {
        isContract: result.isContract,
        confidence: result.confidence,
        documentType: result.documentType,
        reason: result.reason,
      };
    } catch (error) {
      this.logger.error('AI validation failed:', error);
      
      // Fallback to heuristic
      return this.quickHeuristicCheck(text);
    }
  }


  /**
   * Guess document type from patterns
   */
  private guessDocumentType(lowerText: string): 'employment_contract' | 'rental_agreement' | 'nda' | 'service_agreement' | 'purchase_agreement' | 'lease_agreement' | 'partnership_agreement' | 'essay' | 'email' | 'article' | 'recipe' | 'story' | 'academic_paper' | 'other' {
    if (lowerText.includes('dear') && lowerText.includes('sincerely')) {
      return 'email';
    }
    if (lowerText.includes('abstract') || lowerText.includes('introduction')) {
      return 'academic_paper';
    }
    if (lowerText.includes('chapter') || lowerText.includes('once upon a time')) {
      return 'story';
    }
    if (lowerText.includes('recipe') || lowerText.includes('ingredients')) {
      return 'recipe';
    }
    if (lowerText.includes('step 1') || lowerText.includes('step 2')) {
      return 'article';
    }
    
    return 'other';
  }
}

