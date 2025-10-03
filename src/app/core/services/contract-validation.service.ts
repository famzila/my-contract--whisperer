/**
 * Contract Validation Service
 * Uses AI to validate if uploaded document is a contract
 */
import { Injectable, inject } from '@angular/core';
import { PromptService } from './ai/prompt.service';

/**
 * Validation result
 */
export interface ContractValidationResult {
  isContract: boolean;
  confidence: number;          // 0-100
  documentType: string;        // "employment_contract", "essay", "email", etc.
  reason?: string;             // Why it's not a contract (if applicable)
}

@Injectable({
  providedIn: 'root',
})
export class ContractValidationService {
  private promptService = inject(PromptService);

  /**
   * Validate if document is a contract
   */
  async validateContract(text: string): Promise<ContractValidationResult> {
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
        documentType: 'contract',
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
      documentType: 'unknown',
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
        console.warn('⚠️ AI not available, using heuristic validation');
        return this.quickHeuristicCheck(text);
      }

      // Create analysis session with initial system prompt
      const session = await this.promptService.createSession({
        initialPrompts: [
          {
            role: 'system',
            content: `You are a legal document classifier. Analyze documents and determine if they are contracts.
        
Respond ONLY with a JSON object (no markdown, no explanation):
{
  "isContract": true/false,
  "confidence": 0-100,
  "documentType": "employment_contract" | "rental_agreement" | "nda" | "service_agreement" | "essay" | "email" | "article" | "recipe" | "other",
  "reason": "brief explanation if not a contract"
}

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
- Academic papers`,
          },
        ],
      });

      // Analyze document (limit to first 2000 characters for speed)
      const sampleText = text.substring(0, 2000);
      const prompt = `Classify this document:\n\n${sampleText}`;
      
      const response = await session.prompt(prompt);
      
      // Parse JSON response
      const cleaned = this.cleanJsonResponse(response);
      const result = JSON.parse(cleaned);
      
      // Cleanup session
      session.destroy();
      
      return {
        isContract: result.isContract,
        confidence: result.confidence,
        documentType: result.documentType,
        reason: result.reason,
      };
    } catch (error) {
      console.error('❌ AI validation failed:', error);
      
      // Fallback to heuristic
      return this.quickHeuristicCheck(text);
    }
  }

  /**
   * Clean JSON response (remove markdown code blocks if present)
   */
  private cleanJsonResponse(response: string): string {
    let cleaned = response.trim();
    
    // Remove markdown code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return cleaned.trim();
  }

  /**
   * Guess document type from patterns
   */
  private guessDocumentType(lowerText: string): string {
    if (lowerText.includes('dear') && lowerText.includes('sincerely')) {
      return 'email_or_letter';
    }
    if (lowerText.includes('abstract') || lowerText.includes('introduction')) {
      return 'academic_paper';
    }
    if (lowerText.includes('chapter') || lowerText.includes('once upon a time')) {
      return 'story_or_book';
    }
    if (lowerText.includes('recipe') || lowerText.includes('ingredients')) {
      return 'recipe';
    }
    if (lowerText.includes('step 1') || lowerText.includes('step 2')) {
      return 'instructions_or_tutorial';
    }
    
    return 'other';
  }
}

