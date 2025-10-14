import { Injectable, inject } from '@angular/core';
import { Observable, of, merge, concat, EMPTY } from 'rxjs';
import { map, tap, catchError, switchMap, shareReplay } from 'rxjs/operators';
import { AiOrchestratorService } from './ai/ai-orchestrator.service';
import { PromptService } from './ai/prompt.service';
import { ContractParserService, type ParsedContract } from './contract-parser.service';
import { TranslationOrchestratorService } from './translation-orchestrator.service';
import type { Contract, ContractAnalysis, ContractClause, Obligation, RiskLevel } from '../models/contract.model';
import type { AIAnalysisResponse } from '../models/ai-analysis.model';
import { AppConfig } from '../config/app.config';
import { MOCK_ANALYSIS } from '../mocks/mock-analysis.data';
import type { AnalysisContext } from '../models/analysis-context.model';
import { DEFAULT_ANALYSIS_CONTEXT } from '../models/analysis-context.model';
import * as Schemas from '../schemas/analysis-schemas';

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
  private promptService = inject(PromptService);
  private parser = inject(ContractParserService);
  private translationOrchestrator = inject(TranslationOrchestratorService);

  /**
   * Analyze a contract from parsed input with optional context
   * Uses progressive schema-based analysis with three-tier loading
   * This is a no-op wrapper - actual progressive analysis is called by the store
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
    
    // We only need Prompt API for schema-based analysis
    if (!aiStatus.prompt) {
      console.warn('⚠️ Prompt API not available');
      console.warn('💡 Ensure you are using Chrome Canary with flags enabled at chrome://flags');
      return {
        contract,
        analysis: this.createMockAnalysis(contract.id, parsedContract.text),
      };
    }

    // Progressive analysis is now the default and only approach
    // This method should not be called directly - use store.analyzeContract() instead
    // which calls analyzeContractWithSchemasProgressive with callbacks
    throw new Error(
      'analyzeContract() should not be called directly. Use store.analyzeContract() instead for progressive loading.'
    );
  }

  /**
   * NEW: Progressive schema-based analysis with three-tier loading
   * Tier 1: Metadata (fast, shows dashboard immediately)
   * Tier 2: Summary + Risks (parallel, high priority)
   * Tier 3: Obligations + Omissions + Questions (parallel, medium priority)
   */
  async analyzeContractWithSchemasProgressive(
    parsedContract: ParsedContract,
    analysisContext: AnalysisContext,
    contract: Contract,
    onProgress: (section: string, data: any, progress: number) => void
  ): Promise<{ contract: Contract; analysis: ContractAnalysis }> {
    try {
      console.log('🚀 Starting THREE-TIER progressive analysis...');

      // Create session once
      await this.promptService.createSession({
        userRole: analysisContext.userRole || null,
      });

      // ============================================================
      // TIER 1: Metadata (Critical - ~1s)
      // ============================================================
      const metadata = await this.promptService.extractMetadata(parsedContract.text, analysisContext.userRole || undefined);
      onProgress('metadata', metadata, 20);

      // ============================================================
      // TIER 2: Summary + Risks (High Priority - Parallel ~2-3s)
      // ============================================================
      const tier2Results = await Promise.allSettled([
        this.promptService.extractSummary(parsedContract.text),
        this.promptService.extractRisks(parsedContract.text),
      ]);
      
      // Handle Tier 2 results
      const summaryResult = tier2Results[0];
      const risksResult = tier2Results[1];
      
      if (summaryResult.status === 'fulfilled') {
        onProgress('summary', summaryResult.value, 40);
      } else {
        console.error('❌ Summary extraction failed:', summaryResult.reason);
        onProgress('summary', null, 40); // Report as complete but with null data
      }
      
      if (risksResult.status === 'fulfilled') {
        onProgress('risks', risksResult.value, 60);
      } else {
        console.error('❌ Risks extraction failed:', risksResult.reason);
        onProgress('risks', null, 60);
      }
      
      const summaryStructured = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
      const risks = risksResult.status === 'fulfilled' ? risksResult.value : null;
      

      // ============================================================
      // TIER 3: Obligations + Omissions (Medium Priority - Parallel ~2-3s)
      // ============================================================
      const tier3Results = await Promise.allSettled([
        this.promptService.extractObligations(parsedContract.text),
        this.promptService.extractOmissionsAndQuestions(parsedContract.text),
      ]);
      
      // Handle Tier 3 results
      const obligationsResult = tier3Results[0];
      const omissionsResult = tier3Results[1];
      
      if (obligationsResult.status === 'fulfilled') {
        onProgress('obligations', obligationsResult.value, 80);
      } else {
        console.error('❌ Obligations extraction failed:', obligationsResult.reason);
        console.log('Obligations extraction failed:', JSON.stringify(obligationsResult, null, 2));
        onProgress('obligations', null, 80);
      }
      
      if (omissionsResult.status === 'fulfilled') {
        onProgress('omissionsAndQuestions', omissionsResult.value, 90);
      } else {
        console.error('❌ Omissions and Questions extraction failed:', omissionsResult.reason);
        onProgress('omissionsAndQuestions', null, 90);
      }
      
      const obligations = obligationsResult.status === 'fulfilled' ? obligationsResult.value : null;
      const omissionsAndQuestions = omissionsResult.status === 'fulfilled' ? omissionsResult.value : null;
      

      // ============================================================
      // Build Complete Analysis (with fallbacks for failed sections)
      // ============================================================
      const completeAnalysis: Schemas.CompleteAnalysis = {
        metadata,
        risks: risks || { risks: [] },
        obligations: obligations || { obligations: { employer: [], employee: [] } },
        omissionsAndQuestions: omissionsAndQuestions || { omissions: [], questions: [] },
        summary: summaryStructured || { summary: { parties: '', role: '', responsibilities: [], compensation: {}, benefits: [], termination: {}, restrictions: {} } },
      };

      // Convert schema results to existing model format (with safe fallbacks)
      const clauses = risks ? this.convertRisksToClauses(risks.risks) : [];
      const riskScore = risks ? this.calculateRiskScoreFromRisks(risks.risks) : 0;
      const obligationsModel = obligations ? this.convertObligationsToModel(obligations.obligations) : [];

      // Transform omissions priorities (with safe fallback)
      const omissionsTransformed = omissionsAndQuestions 
        ? omissionsAndQuestions.omissions.map(omission => ({
            ...omission,
            priority: this.capitalizePriority(omission.priority),
          }))
        : [];

      // Add constant disclaimer
      const disclaimer = 'I am an AI assistant, not a lawyer. This information is for educational purposes only. Consult a qualified attorney for legal advice.';

      // Build final analysis
      const analysis: ContractAnalysis = {
        id: contract.id,
        summary: JSON.stringify(completeAnalysis, null, 2),
        clauses,
        riskScore,
        obligations: obligationsModel,
        omissions: omissionsTransformed,
        questions: omissionsAndQuestions ? omissionsAndQuestions.questions : [],
        metadata: metadata,
        disclaimer,
        analyzedAt: new Date(),
      };

      // Cleanup
      this.promptService.destroy();

      onProgress('complete', analysis, 100);

      return { contract, analysis };

    } catch (error) {
      console.error('❌ Progressive schema-based analysis failed:', error);
      this.promptService.destroy();
      throw error;
    }
  }

  /**
   * ========================================
   * NEW: RxJS Streaming Analysis
   * ========================================
   * Stream-based analysis that emits results as they complete
   * Metadata is priority 1 (must complete first)
   * All other sections stream independently as they finish
   */
  analyzeContractStreaming$(
    parsedContract: ParsedContract,
    analysisContext: AnalysisContext,
    contract: Contract
  ): Observable<{
    section: 'metadata' | 'summary' | 'risks' | 'obligations' | 'omissionsAndQuestions' | 'complete';
    data: any;
    progress: number;
  }> {
    // Create session once and share it
    const session$ = of(null).pipe(
      tap(() => console.log('🚀 Starting RxJS streaming analysis...')),
      switchMap(() => this.promptService.createSession({ userRole: analysisContext.userRole || null })),
      shareReplay(1)
    );

    // PRIORITY 1: Metadata (must complete first)
    const metadata$ = session$.pipe(
      switchMap(() => this.promptService.extractMetadata$(parsedContract.text, analysisContext.userRole || undefined)),
      map(metadata => ({
        section: 'metadata' as const,
        data: metadata,
        progress: 20
      })),
      tap(result => console.log('✅ Metadata complete', result)),
      catchError(error => {
        console.error('❌ Metadata extraction failed:', error);
        throw error; // Metadata is critical, so we throw
      })
    );

    // STREAMING: Summary, Risks, Obligations, Omissions (all independent)
    const summary$ = session$.pipe(
      switchMap(() => this.promptService.extractSummary$(parsedContract.text)),
      map(summary => ({
        section: 'summary' as const,
        data: summary,
        progress: 40
      })),
      tap(result => console.log('✅ Summary complete', result)),
      catchError(error => {
        console.error('❌ Summary extraction failed:', error);
        // Return null data - UI will show error message
        return of({ section: 'summary' as const, data: null, progress: 40 });
      })
    );

    const risks$ = session$.pipe(
      switchMap(() => this.promptService.extractRisks$(parsedContract.text)),
      map(risks => ({
        section: 'risks' as const,
        data: risks,
        progress: 60
      })),
      tap(result => console.log('✅ Risks complete', result)),
      catchError(error => {
        console.error('❌ Risks extraction failed:', error);
        // Return null data - UI will show error message
        return of({ section: 'risks' as const, data: null, progress: 60 });
      })
    );

    const obligations$ = session$.pipe(
      switchMap(() => this.promptService.extractObligations$(parsedContract.text)),
      map(obligations => ({
        section: 'obligations' as const,
        data: obligations,
        progress: 80
      })),
      tap(result => console.log('✅ Obligations complete', result)),
      catchError(error => {
        console.error('❌ Obligations extraction failed:', error);
        // Return null data - UI will show error message
        return of({ section: 'obligations' as const, data: null, progress: 80 });
      })
    );

    const omissionsAndQuestions$ = session$.pipe(
      switchMap(() => this.promptService.extractOmissionsAndQuestions$(parsedContract.text)),
      map(omissionsAndQuestions => ({
        section: 'omissionsAndQuestions' as const,
        data: omissionsAndQuestions,
        progress: 90
      })),
      tap(result => console.log('✅ Omissions/Questions complete', result)),
      catchError(error => {
        console.error('❌ Omissions/Questions extraction failed:', error);
        // Return null data - UI will show error message
        return of({ section: 'omissionsAndQuestions' as const, data: null, progress: 90 });
      })
    );

    // Strategy: 
    // 1. Metadata MUST complete first (use concat)
    // 2. Then stream all others as they complete (use merge)
    return concat(
      metadata$,
      merge(
        summary$,
        risks$,
        obligations$,
        omissionsAndQuestions$
      )
    );
  }

  /**
   * Helper: Convert schema risks to ContractClause format
   */
  private convertRisksToClauses(risks: Array<{
    title: string;
    severity: 'high' | 'medium' | 'low';
    icon: string;
    description: string;
    impact: string;
  }>): ContractClause[] {
    return risks.map(risk => ({
      id: this.generateId(),
      type: this.normalizeClauseType(risk.title),
      content: risk.description,
      plainLanguage: `${risk.description}\n\nImpact: ${risk.impact}`,
      riskLevel: risk.severity as RiskLevel,
      confidence: 0.95,
    }));
  }

  /**
   * Helper: Calculate risk score from schema risks
   */
  private calculateRiskScoreFromRisks(risks: Array<{ severity: 'high' | 'medium' | 'low' }>): number {
    if (risks.length === 0) return 0;

    const weights = { high: 100, medium: 50, low: 25 };
    const total = risks.reduce((sum, risk) => sum + weights[risk.severity], 0);
    return Math.round(total / risks.length);
  }

  /**
   * Helper: Convert schema obligations to Obligation model format
   */
  private convertObligationsToModel(obligations: {
    employer: Array<{
      duty: string;
      amount?: number | null;
      frequency?: string | null;
      startDate?: string | null;
      duration?: string | null;
      scope?: string | null;
    }>;
    employee: Array<{
      duty: string;
      scope?: string | null;
      frequency?: string | null;
    }>;
  }): Obligation[] {
    const result: Obligation[] = [];

    // Convert employer obligations
    obligations.employer.forEach((obl) => {
      let description = obl.duty;
      if (obl.amount) description += ` ($${obl.amount})`;
      if (obl.frequency) description += ` - ${obl.frequency}`;
      if (obl.scope) description += ` (${obl.scope})`;

      result.push({
        id: this.generateId(),
        description,
        party: 'their' as const,
        recurring: !!obl.frequency,
        completed: false,
        priority: 'medium' as const,
      });
    });

    // Convert employee obligations
    obligations.employee.forEach((obl) => {
      let description = obl.duty;
      if (obl.scope) description += ` (${obl.scope})`;

      result.push({
        id: this.generateId(),
        description,
        party: 'your' as const,
        recurring: !!obl.frequency,
        completed: false,
        priority: 'medium' as const,
      });
    });

    return result;
  }

  /**
   * Helper: Capitalize priority for model compatibility
   * Schema uses lowercase ("high"), model uses capitalized ("High")
   */
  private capitalizePriority(priority: 'high' | 'medium' | 'low'): 'High' | 'Medium' | 'Low' {
    const map: Record<'high' | 'medium' | 'low', 'High' | 'Medium' | 'Low'> = {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return map[priority];
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
    
    // Check if obligations exist and have the expected structure
    if (!aiResponse.obligations || typeof aiResponse.obligations !== 'object') {
      console.warn('⚠️ No obligations found in AI response');
      return [];
    }
    
    const obligations: Obligation[] = [];
    
    // Parse employer obligations (safe access with optional chaining)
    if (Array.isArray(aiResponse.obligations.employer)) {
      obligations.push(...aiResponse.obligations.employer.map(obl => {
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
      }));
    } else {
      console.warn('⚠️ employer obligations is not an array:', aiResponse.obligations.employer);
    }
    
    // Parse employee obligations (safe access with optional chaining)
    if (Array.isArray(aiResponse.obligations.employee)) {
      obligations.push(...aiResponse.obligations.employee.map(obl => {
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
      }));
    } else {
      console.warn('⚠️ employee obligations is not an array:', aiResponse.obligations.employee);
    }
    
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
    
    if (this.containsHighRiskIndicators(desc)) return 'high';
    if (this.containsMediumRiskIndicators(desc)) return 'medium';
    if (this.containsLowRiskIndicators(desc)) return 'low';
    
    return 'safe';
  }

  private containsHighRiskIndicators(text: string): boolean {
    const highRiskKeywords = ['penalty', 'forfeit', 'indemnif', 'not liable', 'no liability'];
    return highRiskKeywords.some(keyword => text.includes(keyword));
  }

  private containsMediumRiskIndicators(text: string): boolean {
    const mediumRiskKeywords = ['may', 'automatically', 'unless'];
    return mediumRiskKeywords.some(keyword => text.includes(keyword));
  }

  private containsLowRiskIndicators(text: string): boolean {
    const lowRiskKeywords = ['option', 'reasonable', 'mutual'];
    return lowRiskKeywords.some(keyword => text.includes(keyword));
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

