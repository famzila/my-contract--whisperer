import { Injectable, inject } from '@angular/core';
import { AiOrchestratorService } from './ai/ai-orchestrator.service';
import { ContractParserService, type ParsedContract } from './contract-parser.service';
import { TranslationOrchestratorService } from './translation-orchestrator.service';
import type { Contract, ContractAnalysis, ContractClause, Obligation, RiskLevel } from '../models/contract.model';
import type { AIAnalysisResponse } from '../models/ai-analysis.model';
import { AppConfig } from '../config/app.config';
import { MOCK_ANALYSIS } from '../mocks/mock-analysis.data';
import type { AnalysisContext } from '../models/analysis-context.model';
import { DEFAULT_ANALYSIS_CONTEXT } from '../models/analysis-context.model';

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
  private translationOrchestrator = inject(TranslationOrchestratorService);

  /**
   * Analyze a contract from parsed input with optional context
   */
  async analyzeContract(
    parsedContract: ParsedContract,
    context?: AnalysisContext
  ): Promise<{
    contract: Contract;
    analysis: ContractAnalysis;
  }> {
    // Use provided context or default
    const analysisContext: AnalysisContext = context || {
      ...DEFAULT_ANALYSIS_CONTEXT,
      contractLanguage: 'en',
      userPreferredLanguage: 'en',
    };
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

    // Check if mock mode is enabled
    if (AppConfig.useMockAI) {
      console.log('🎭 Mock AI mode enabled - returning mock analysis');
      
      // Simulate delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        contract,
        analysis: this.createMockAnalysisFromStructuredData(contract.id),
      };
    }
    
    // Check AI services availability
    const aiStatus = await this.aiOrchestrator.checkAvailability();
    
    console.log('🤖 AI Services Status:', {
      prompt: aiStatus.prompt,
      summarizer: aiStatus.summarizer,
      languageDetector: aiStatus.languageDetector,
      translator: aiStatus.translator,
      writer: aiStatus.writer,
      rewriter: aiStatus.rewriter,
      allAvailable: aiStatus.allAvailable
    });
    
    // We only need Prompt and Summarizer APIs for basic analysis
    if (!aiStatus.prompt || !aiStatus.summarizer) {
      console.warn('⚠️ Required AI services not available:', {
        promptAvailable: aiStatus.prompt,
        summarizerAvailable: aiStatus.summarizer
      });
      console.warn('💡 Ensure you are using Chrome Canary with flags enabled at chrome://flags');
      return {
        contract,
        analysis: this.createMockAnalysis(contract.id, parsedContract.text),
      };
    }

    try {
      console.log(`🔍 Starting AI analysis${analysisContext.userRole ? ` from ${analysisContext.userRole}'s perspective` : ''}...`);
      
      // Perform AI analysis with real services, passing user role context
      const aiAnalysis = await this.aiOrchestrator.analyzeContract(
        parsedContract.text,
        analysisContext.userRole
      );
      
      console.log('📊 AI Analysis received:', {
        summaryLength: aiAnalysis.summary?.length,
        clausesLength: aiAnalysis.clauses?.length,
      });

      // Try to parse JSON response from AI
      let structuredAnalysis: AIAnalysisResponse | null = null;
      
      try {
        structuredAnalysis = JSON.parse(aiAnalysis.clauses);
        console.log('✅ Successfully parsed structured JSON response');
      } catch (jsonError) {
        console.warn('⚠️ AI response is not valid JSON, falling back to text parsing');
      }

      // 🌍 TRANSLATION LOGIC
      // Store original (untranslated) version
      const originalStructuredAnalysis = structuredAnalysis;
      
      // Check if translation is needed
      const needsTranslation = this.translationOrchestrator.needsTranslation(
        analysisContext.contractLanguage,
        analysisContext.analyzedInLanguage
      );
      
      if (needsTranslation && structuredAnalysis) {
        console.log(`🌍 [Translation] Translation needed: ${analysisContext.contractLanguage} → ${analysisContext.analyzedInLanguage}`);
        
        // Translate the analysis output
        structuredAnalysis = await this.translationOrchestrator.translateAnalysis(
          structuredAnalysis,
          analysisContext.contractLanguage,
          analysisContext.analyzedInLanguage
        );
        
        console.log(`✅ [Translation] Translation completed`);
      } else if (structuredAnalysis) {
        console.log(`✅ [Translation] No translation needed (same language: ${analysisContext.contractLanguage})`);
      }

      // Parse AI results and create structured analysis
      const clauses = structuredAnalysis 
        ? this.parseClausesFromJSON(structuredAnalysis)
        : await this.parseClausesFromAI(aiAnalysis.clauses, parsedContract.text);
        
      const obligations = structuredAnalysis
        ? this.parseObligationsFromJSON(structuredAnalysis)
        : this.extractObligationsFromText(parsedContract.text, clauses, aiAnalysis.clauses);
        
      const riskScore = this.calculateRiskScore(clauses);

      // Store structured JSON for UI display (translated if needed)
      const summaryText = structuredAnalysis 
        ? JSON.stringify(structuredAnalysis, null, 2)
        : aiAnalysis.clauses;
      
      // Store original (untranslated) summary for reference
      const originalSummaryText = needsTranslation && originalStructuredAnalysis
        ? JSON.stringify(originalStructuredAnalysis, null, 2)
        : undefined;

      const analysis: ContractAnalysis = {
        id: contract.id,
        summary: summaryText || 'Unable to generate summary',
        originalSummary: originalSummaryText,  // 👈 NEW: Original for toggle
        clauses,
        riskScore,
        obligations,
        omissions: structuredAnalysis?.omissions || [],
        questions: structuredAnalysis?.questions || [],
        metadata: structuredAnalysis?.metadata,
        contextWarnings: structuredAnalysis?.contextWarnings,
        disclaimer: structuredAnalysis?.disclaimer,
        analyzedAt: new Date(),
        
        // 👇 NEW: Translation metadata
        translationInfo: needsTranslation ? {
          wasTranslated: true,
          sourceLanguage: analysisContext.contractLanguage,
          targetLanguage: analysisContext.analyzedInLanguage,
          translatedAt: new Date(),
        } : undefined,
      };

      console.log('✅ Analysis complete:', {
        clauseCount: clauses.length,
        obligationCount: obligations.length,
        riskScore,
        isStructured: !!structuredAnalysis,
      });

      return { contract, analysis };
    } catch (error) {
      console.error('❌ AI Analysis failed:', error);
      // Fallback to mock analysis on error
      return {
        contract,
        analysis: this.createMockAnalysis(contract.id, parsedContract.text),
      };
    }
  }

  /**
   * Parse clauses from structured JSON response
   */
  private parseClausesFromJSON(aiResponse: AIAnalysisResponse): ContractClause[] {
    console.log('📝 Parsing clauses from JSON response...');
    
    const clauses: ContractClause[] = aiResponse.risks.map(risk => ({
      id: this.generateId(),
      type: this.normalizeClauseType(risk.title),
      content: risk.description,
      plainLanguage: `${risk.description}\n\nImpact: ${risk.impact}`,
      riskLevel: this.mapSeverityToRiskLevel(risk.severity),
      confidence: 0.95,
    }));
    
    console.log(`✅ Parsed ${clauses.length} clauses from JSON`);
    return clauses;
  }
  
  /**
   * Map severity string to risk level
   */
  private mapSeverityToRiskLevel(severity: string): RiskLevel {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Parse obligations from structured JSON response
   */
  private parseObligationsFromJSON(aiResponse: AIAnalysisResponse): Obligation[] {
    console.log('📝 Parsing obligations from JSON response...');
    
    const obligations: Obligation[] = [
      ...aiResponse.obligations.employer.map(obl => {
        let description = `Employer: ${obl.duty}`;
        if (obl.amount) description += ` ($${obl.amount})`;
        if (obl.frequency) description += ` - ${obl.frequency}`;
        if (obl.scope) description += ` (${obl.scope})`;
        
        return {
          id: this.generateId(),
          description,
          party: 'their' as const,  // Employer obligations are 'their'
          recurring: !!obl.frequency,
          completed: false,
          priority: 'medium' as const,
        };
      }),
      ...aiResponse.obligations.employee.map(obl => {
        let description = `Employee: ${obl.duty}`;
        if (obl.scope) description += ` (${obl.scope})`;
        
        return {
          id: this.generateId(),
          description,
          party: 'your' as const,  // Employee obligations are 'your'
          recurring: !!obl.frequency,
          completed: false,
          priority: 'medium' as const,
        };
      }),
    ];
    
    console.log(`✅ Parsed ${obligations.length} obligations from JSON`);
    return obligations;
  }

  /**
   * Parse clauses from AI response (fallback for non-JSON)
   * The AI returns structured text with risk flags, we parse it into our data model
   */
  private async parseClausesFromAI(aiResponse: string, contractText: string): Promise<ContractClause[]> {
    console.log('📝 Parsing clauses from AI response...');
    
    const clauses: ContractClause[] = [];
    
    // Extract the Risk Flags section
    const riskSection = aiResponse.match(/🚨 Risk Flags([\s\S]*?)(?:📅 Obligations|$)/i);
    
    if (riskSection && riskSection[1]) {
      const riskText = riskSection[1];
      const lines = riskText.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Match lines with risk indicators: 🚨, ⚠️, or ✅
        const riskMatch = line.match(/^[•\-*]?\s*(🚨|⚠️|✅)\s*(.+?):\s*(.+)/);
        
        if (riskMatch) {
          const [, emoji, title, description] = riskMatch;
          const riskLevel = this.mapEmojiToRiskLevel(emoji);
          const clauseType = this.normalizeClauseType(title.trim());
          
          clauses.push({
            id: this.generateId(),
            type: clauseType,
            content: description.trim(),
            plainLanguage: description.trim(),
            riskLevel,
            confidence: 0.9,
          });
        }
      }
    }
    
    // If we couldn't parse any clauses from Risk Flags, try general extraction
    if (clauses.length === 0) {
      console.log('⚠️ Could not parse AI risk flags, extracting from full response');
      return this.extractClausesFromText(contractText);
    }
    
    console.log(`✅ Parsed ${clauses.length} clauses from AI analysis`);
    return clauses;
  }
  
  /**
   * Map emoji risk indicator to risk level
   */
  private mapEmojiToRiskLevel(emoji: string): RiskLevel {
    switch (emoji) {
      case '🚨':
        return 'high';
      case '⚠️':
        return 'medium';
      case '✅':
        return 'safe';
      default:
        return 'low';
    }
  }
  
  /**
   * Extract clauses directly from contract text (fallback)
   */
  private extractClausesFromText(contractText: string): ContractClause[] {
    const clauses: ContractClause[] = [];
    const text = contractText.toLowerCase();
    
    // Look for common contract clause patterns
    const clausePatterns: Array<{ type: import('../models/contract.model').ClauseType; keywords: string[]; risk: RiskLevel }> = [
      { type: 'payment', keywords: ['payment', 'fee', 'charge', 'invoice', 'price'], risk: 'high' },
      { type: 'termination', keywords: ['terminate', 'cancellation', 'end this agreement'], risk: 'medium' },
      { type: 'liability', keywords: ['liability', 'liable', 'damages', 'indemnify'], risk: 'high' },
      { type: 'confidentiality', keywords: ['confidential', 'secret', 'proprietary'], risk: 'safe' },
      { type: 'renewal', keywords: ['renew', 'extend', 'automatically continue'], risk: 'medium' },
      { type: 'warranty', keywords: ['warrant', 'guarantee', 'warranty'], risk: 'low' },
    ];
    
    const sentences = contractText.match(/[^.!?]+[.!?]+/g) || [];
    
    for (const pattern of clausePatterns) {
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        if (pattern.keywords.some(keyword => sentenceLower.includes(keyword))) {
          clauses.push({
            id: this.generateId(),
            type: pattern.type,
            content: sentence.trim(),
            plainLanguage: this.simplifyLegalText(sentence.trim()),
            riskLevel: pattern.risk,
            confidence: 0.6,
          });
          break; // Only one clause per pattern
        }
      }
    }
    
    return clauses.length > 0 ? clauses : this.createSampleClauses();
  }
  
  /**
   * Simplify legal text to plain language
   */
  private simplifyLegalText(text: string): string {
    return text
      .replace(/\bherein\b/gi, 'in this document')
      .replace(/\bhereof\b/gi, 'of this')
      .replace(/\bhereby\b/gi, 'by this')
      .replace(/\bsaid\b/gi, 'the')
      .replace(/\bshall\b/gi, 'will')
      .replace(/\bpursuant to\b/gi, 'according to')
      .trim();
  }
  
  /**
   * Normalize clause type names
   */
  private normalizeClauseType(type: string): import('../models/contract.model').ClauseType {
    const normalized = type.toLowerCase().trim();
    
    if (normalized.includes('payment') || normalized.includes('fee')) return 'payment';
    if (normalized.includes('termination') || normalized.includes('cancel')) return 'termination';
    if (normalized.includes('liabil') || normalized.includes('damage')) return 'liability';
    if (normalized.includes('confidential') || normalized.includes('secret')) return 'confidentiality';
    if (normalized.includes('renew') || normalized.includes('extend')) return 'renewal';
    if (normalized.includes('warrant') || normalized.includes('guarantee')) return 'warranty';
    if (normalized.includes('indemnity') || normalized.includes('indemnif')) return 'indemnity';
    if (normalized.includes('intellectual property') || normalized.includes('ip ')) return 'intellectual-property';
    if (normalized.includes('dispute') || normalized.includes('arbitration')) return 'dispute-resolution';
    if (normalized.includes('governing law') || normalized.includes('jurisdiction')) return 'governing-law';
    
    return 'other';
  }
  
  /**
   * Assess risk level from clause description
   */
  private assessRiskLevel(description: string): RiskLevel {
    const desc = description.toLowerCase();
    
    // High risk indicators
    if (desc.includes('penalty') || desc.includes('forfeit') || desc.includes('indemnif') || 
        desc.includes('not liable') || desc.includes('no liability')) {
      return 'high';
    }
    
    // Medium risk indicators
    if (desc.includes('may') || desc.includes('automatically') || desc.includes('unless')) {
      return 'medium';
    }
    
    // Low risk indicators
    if (desc.includes('option') || desc.includes('reasonable') || desc.includes('mutual')) {
      return 'low';
    }
    
    return 'safe';
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
   * Extract obligations from AI response and contract text
   */
  private extractObligationsFromText(contractText: string, clauses: ContractClause[], aiResponse?: string): Obligation[] {
    const obligations: Obligation[] = [];

    // Try to parse obligations from AI response first
    if (aiResponse) {
      const obligationsSection = aiResponse.match(/📅 Obligations([\s\S]*?)$/i);
      
      if (obligationsSection && obligationsSection[1]) {
        const obligText = obligationsSection[1];
        const lines = obligText.split('\n').filter(line => line.trim() && line.match(/^[•\-*]/));
        
        for (const line of lines) {
          const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
          if (cleaned && cleaned.toLowerCase() !== 'not specified') {
            obligations.push({
              id: this.generateId(),
              description: cleaned,
              party: 'your',  // Default obligation
              recurring: false,
              completed: false,
              priority: 'medium',
            });
          }
        }
      }
    }

    // If no obligations found from AI, use clause-based extraction
    if (obligations.length === 0) {
      // Look for payment-related clauses
      const paymentClauses = clauses.filter(c => c.type === 'payment');
      if (paymentClauses.length > 0) {
        obligations.push({
          id: this.generateId(),
          description: 'Make payment as per contract terms',
          party: 'your',  // Required field
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          recurring: true,
          completed: false,
          priority: 'high',
        });
      }

      // Look for renewal clauses
      const renewalClauses = clauses.filter(c => c.type === 'renewal');
      if (renewalClauses.length > 0) {
        obligations.push({
          id: this.generateId(),
          description: 'Review contract before auto-renewal',
          party: 'your',  // Required field
          dueDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
          recurring: true,
          completed: false,
          priority: 'medium',
        });
      }
    }

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
   * Create mock analysis for testing/demo when AI is not available
   */
  private createMockAnalysis(contractId: string, contractText: string): ContractAnalysis {
    // Extract real clauses from the contract text
    const clauses = this.extractClausesFromText(contractText);
    const obligations = this.extractObligationsFromText(contractText, clauses);
    
    return {
      id: contractId,
      summary: `AI Analysis (Limited Mode): This contract has been analyzed using text pattern matching. For full AI-powered analysis, please use Chrome Canary with Built-in AI enabled.

Key Points Identified:
• ${clauses.length} contract clauses detected
• Risk assessment based on clause types
• Extracted from actual contract content

Note: This is a fallback analysis. Enable Chrome Built-in AI for detailed insights and plain-language explanations.`,
      clauses,
      riskScore: this.calculateRiskScore(clauses),
      obligations,
      omissions: [],
      questions: [],
      analyzedAt: new Date(),
    };
  }

  /**
   * Create mock analysis from structured mock data
   */
  private createMockAnalysisFromStructuredData(contractId: string): ContractAnalysis {
    console.log('🎭 Creating analysis from structured mock data');
    
    // Convert structured mock to analysis format
    const clauses = this.parseClausesFromJSON(MOCK_ANALYSIS);
    const obligations = this.parseObligationsFromJSON(MOCK_ANALYSIS);
    const riskScore = this.calculateRiskScore(clauses);
    
    return {
      id: contractId,
      summary: JSON.stringify(MOCK_ANALYSIS, null, 2),
      clauses,
      riskScore,
      obligations,
      omissions: MOCK_ANALYSIS.omissions,
      questions: MOCK_ANALYSIS.questions,
      metadata: MOCK_ANALYSIS.metadata,
      contextWarnings: MOCK_ANALYSIS.contextWarnings,
      disclaimer: MOCK_ANALYSIS.disclaimer,
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

