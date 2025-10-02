import { Injectable, inject } from '@angular/core';
import { PromptService } from './prompt.service';
import { SummarizerService } from './summarizer.service';
import { TranslatorService } from './translator.service';
import { WriterService } from './writer.service';

/**
 * AI Service availability status
 */
export interface AIServicesStatus {
  prompt: boolean;
  summarizer: boolean;
  translator: boolean;
  writer: boolean;
  rewriter: boolean;
  allAvailable: boolean;
}

/**
 * Orchestrator service that coordinates all Chrome Built-in AI APIs
 * Provides a unified interface for AI operations and handles fallbacks
 */
@Injectable({
  providedIn: 'root',
})
export class AiOrchestratorService {
  private promptService = inject(PromptService);
  private summarizerService = inject(SummarizerService);
  private translatorService = inject(TranslatorService);
  private writerService = inject(WriterService);

  private servicesStatus: AIServicesStatus | null = null;

  /**
   * Check availability of all AI services
   */
  async checkAvailability(): Promise<AIServicesStatus> {
    const [prompt, summarizer, translator, writer, rewriter] = await Promise.all([
      this.promptService.isAvailable(),
      this.summarizerService.isAvailable(),
      this.translatorService.isAvailable(),
      this.writerService.isWriterAvailable(),
      this.writerService.isRewriterAvailable(),
    ]);

    this.servicesStatus = {
      prompt,
      summarizer,
      translator,
      writer,
      rewriter,
      allAvailable: prompt && summarizer && translator && writer && rewriter,
    };

    return this.servicesStatus;
  }

  /**
   * Get cached services status (call checkAvailability() first)
   */
  getServicesStatus(): AIServicesStatus | null {
    return this.servicesStatus;
  }

  /**
   * Analyze a complete contract
   */
  async analyzeContract(contractText: string): Promise<ContractAnalysisResult> {
    const status = await this.checkAvailability();

    // We only need Prompt and Summarizer APIs for basic contract analysis
    if (!status.prompt || !status.summarizer) {
      throw new Error(
        `Required AI services not available. Prompt: ${status.prompt}, Summarizer: ${status.summarizer}`
      );
    }

    console.log('✅ Both Prompt and Summarizer APIs available. Starting analysis...');

    // Run analysis in parallel
    const [summary, clauses] = await Promise.all([
      this.summarizerService.generateExecutiveSummary(contractText),
      this.promptService.extractClauses(contractText),
    ]);

    return {
      summary,
      clauses,
      contractText,
      analyzedAt: new Date(),
    };
  }

  /**
   * Get detailed analysis with multiple summary types
   */
  async getDetailedAnalysis(contractText: string): Promise<DetailedAnalysisResult> {
    const status = await this.checkAvailability();

    if (!status.prompt || !status.summarizer) {
      throw new Error('Required AI services (Prompt & Summarizer) are not available');
    }

    const [executiveSummary, detailedSummary, eli5Summary, clauses] = await Promise.all([
      this.summarizerService.generateExecutiveSummary(contractText),
      this.summarizerService.generateDetailedSummary(contractText),
      this.summarizerService.generateELI5Summary(contractText),
      this.promptService.extractClauses(contractText),
    ]);

    return {
      summary: executiveSummary, // Use executive summary as main summary
      executiveSummary,
      detailedSummary,
      eli5Summary,
      clauses,
      contractText,
      analyzedAt: new Date(),
    };
  }

  /**
   * Ask a question about the contract
   */
  async askQuestion(contractText: string, question: string): Promise<string> {
    const status = this.servicesStatus || await this.checkAvailability();

    if (!status.prompt) {
      throw new Error('Prompt API is not available');
    }

    return await this.promptService.askQuestion(contractText, question);
  }

  /**
   * Translate summary to multiple languages
   */
  async translateSummary(
    summary: string,
    targetLanguages: string[]
  ): Promise<Record<string, string>> {
    const status = this.servicesStatus || await this.checkAvailability();

    if (!status.translator) {
      throw new Error('Translator API is not available');
    }

    const sourceLanguage = this.translatorService.detectLanguage(summary);
    return await this.translatorService.translateSummary(
      summary,
      sourceLanguage,
      targetLanguages
    );
  }

  /**
   * Rewrite a clause with improvements
   */
  async improveClause(clauseText: string, improvementType: ClauseImprovementType): Promise<string> {
    const status = this.servicesStatus || await this.checkAvailability();

    if (!status.writer && !status.rewriter) {
      throw new Error('Writer/Rewriter APIs are not available');
    }

    switch (improvementType) {
      case 'clarity':
        return await this.writerService.rewriteClearly(clauseText);
      case 'fairness':
        return await this.writerService.suggestFairerTerms(clauseText);
      case 'specificity':
        return await this.writerService.makeMoreSpecific(clauseText);
      case 'simplicity':
        return await this.writerService.simplifyLanguage(clauseText);
      default:
        return await this.writerService.rewriteClearly(clauseText);
    }
  }

  /**
   * Cleanup all AI service resources
   */
  cleanup(): void {
    this.promptService.destroy();
    this.summarizerService.destroy();
    this.translatorService.destroyAll();
    this.writerService.destroyAll();
    this.servicesStatus = null;
  }
}

/**
 * Contract analysis result
 */
export interface ContractAnalysisResult {
  summary: string;
  clauses: string;
  contractText: string;
  analyzedAt: Date;
}

/**
 * Detailed analysis result
 */
export interface DetailedAnalysisResult extends ContractAnalysisResult {
  executiveSummary: string;
  detailedSummary: string;
  eli5Summary: string;
}

/**
 * Clause improvement types
 */
export type ClauseImprovementType = 'clarity' | 'fairness' | 'specificity' | 'simplicity';

