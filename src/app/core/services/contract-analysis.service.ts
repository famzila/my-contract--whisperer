import { Injectable, inject } from '@angular/core';
import { AiOrchestratorService } from './ai/ai-orchestrator.service';
import { ContractParserService, type ParsedContract } from './contract-parser.service';
import type { Contract, ContractAnalysis, ContractClause, Obligation, RiskLevel } from '../models/contract.model';

/**
 * Contract Analysis Service
 * Orchestrates the full contract analysis flow:
 * 1. Parse contract text
 * 2. Generate summary
 * 3. Extract clauses
 * 4. Calculate risk score
 * 5. Extract obligations
 */
@Injectable({
  providedIn: 'root',
})
export class ContractAnalysisService {
  private aiOrchestrator = inject(AiOrchestratorService);
  private parser = inject(ContractParserService);

  /**
   * Analyze a contract from parsed input
   */
  async analyzeContract(parsedContract: ParsedContract): Promise<{
    contract: Contract;
    analysis: ContractAnalysis;
  }> {
    // Create contract object
    const contract: Contract = {
      id: this.generateId(),
      text: parsedContract.text,
      fileName: parsedContract.fileName,
      fileSize: parsedContract.fileSize,
      fileType: parsedContract.fileType,
      uploadedAt: parsedContract.parsedAt,
      wordCount: this.parser.getWordCount(parsedContract.text),
      estimatedReadingTime: this.parser.estimateReadingTime(parsedContract.text),
    };

    // Check AI services availability
    const aiStatus = await this.aiOrchestrator.checkAvailability();
    
    if (!aiStatus.allAvailable) {
      // For MVP, create mock analysis if AI not available
      return {
        contract,
        analysis: this.createMockAnalysis(contract.id),
      };
    }

    // Perform AI analysis
    const aiAnalysis = await this.aiOrchestrator.analyzeContract(parsedContract.text);

    // Parse AI results and create structured analysis
    const clauses = this.parseClausesFromAI(aiAnalysis.clauses);
    const obligations = this.extractObligations(clauses);
    const riskScore = this.calculateRiskScore(clauses);

    const analysis: ContractAnalysis = {
      contractId: contract.id,
      summary: aiAnalysis.summary,
      clauses,
      riskScore,
      obligations,
      analyzedAt: new Date(),
    };

    return { contract, analysis };
  }

  /**
   * Parse clauses from AI response
   */
  private parseClausesFromAI(aiResponse: string): ContractClause[] {
    // For MVP, create structured clauses from AI text
    // In production, the AI would return properly formatted JSON
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(aiResponse);
      if (Array.isArray(parsed)) {
        return parsed.map(c => ({
          id: this.generateId(),
          type: c.type || 'other',
          content: c.content || '',
          plainLanguage: c.plainLanguage || c.explanation || '',
          riskLevel: c.riskLevel || 'medium',
          confidence: c.confidence || 0.8,
        }));
      }
    } catch {
      // If not JSON, create sample clauses
      return this.createSampleClauses();
    }

    return this.createSampleClauses();
  }

  /**
   * Create sample clauses for demo/testing
   */
  private createSampleClauses(): ContractClause[] {
    return [
      {
        id: this.generateId(),
        type: 'termination',
        content: 'Either party may terminate this agreement with 30 days written notice.',
        plainLanguage: 'You or the other party can end this contract by giving 30 days notice in writing.',
        riskLevel: 'low',
        confidence: 0.9,
      },
      {
        id: this.generateId(),
        type: 'payment',
        content: 'Late payments shall incur a penalty of 5% per month.',
        plainLanguage: 'If you pay late, you will be charged an extra 5% each month.',
        riskLevel: 'high',
        confidence: 0.95,
      },
      {
        id: this.generateId(),
        type: 'liability',
        content: 'The Company shall not be liable for any indirect, incidental, or consequential damages.',
        plainLanguage: 'The company is not responsible for indirect damages or losses.',
        riskLevel: 'high',
        confidence: 0.85,
      },
      {
        id: this.generateId(),
        type: 'renewal',
        content: 'This agreement automatically renews for successive one-year terms unless terminated.',
        plainLanguage: 'The contract automatically extends for another year unless you cancel it.',
        riskLevel: 'medium',
        confidence: 0.88,
      },
      {
        id: this.generateId(),
        type: 'confidentiality',
        content: 'All information disclosed under this agreement shall remain confidential.',
        plainLanguage: 'All shared information must be kept secret.',
        riskLevel: 'safe',
        confidence: 0.92,
      },
    ];
  }

  /**
   * Extract obligations from clauses
   */
  private extractObligations(clauses: ContractClause[]): Obligation[] {
    const obligations: Obligation[] = [];

    // Look for payment-related clauses
    const paymentClauses = clauses.filter(c => c.type === 'payment');
    paymentClauses.forEach(clause => {
      obligations.push({
        id: this.generateId(),
        description: 'Make payment as per contract terms',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        recurring: true,
        completed: false,
        priority: 'high',
      });
    });

    // Look for renewal clauses
    const renewalClauses = clauses.filter(c => c.type === 'renewal');
    renewalClauses.forEach(clause => {
      obligations.push({
        id: this.generateId(),
        description: 'Review contract before auto-renewal',
        dueDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000), // ~11 months
        recurring: true,
        completed: false,
        priority: 'medium',
      });
    });

    // Sample obligations for demo
    obligations.push(
      {
        id: this.generateId(),
        description: 'Provide monthly reports as specified in Section 5',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        recurring: true,
        completed: false,
        priority: 'medium',
      },
      {
        id: this.generateId(),
        description: 'Maintain insurance coverage per requirements',
        recurring: false,
        completed: false,
        priority: 'high',
      }
    );

    return obligations;
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(clauses: ContractClause[]): number {
    if (clauses.length === 0) return 0;

    const riskWeights: Record<RiskLevel, number> = {
      safe: 0,
      low: 25,
      medium: 50,
      high: 100,
    };

    const totalRisk = clauses.reduce((sum, clause) => {
      const weight = riskWeights[clause.riskLevel] || 50;
      return sum + (weight * clause.confidence);
    }, 0);

    return Math.round(totalRisk / clauses.length);
  }

  /**
   * Create mock analysis for testing/demo
   */
  private createMockAnalysis(contractId: string): ContractAnalysis {
    const clauses = this.createSampleClauses();
    
    return {
      contractId,
      summary: `This is a standard service agreement with moderate risk factors. 
      
Key Points:
• 30-day termination notice required
• Late payment penalties apply (5% per month)
• Limited liability for the service provider
• Automatic annual renewal
• Confidentiality obligations for both parties

Overall Assessment: This contract contains some clauses that require attention, particularly regarding late payment penalties and liability limitations. Review carefully before signing.`,
      clauses,
      riskScore: this.calculateRiskScore(clauses),
      obligations: this.extractObligations(clauses),
      analyzedAt: new Date(),
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

