import { Injectable, inject } from '@angular/core';
import { TranslatorService } from './ai/translator.service';
import { LoggerService } from './logger.service';
import type { 
  AIAnalysisResponse, 
  RiskFlag, 
  Obligations, 
  StructuredObligation,
  Omission,
  ContractSummary
} from '../models/ai-analysis.model';

/**
 * Translation Orchestrator Service
 * 
 * Intelligently translates AI analysis outputs while preserving:
 * - Legal terminology accuracy
 * - Party names
 * - Dates and numbers
 * - Technical terms
 * 
 * Strategy: Translate OUTPUT, not contract
 * - AI analyzes in original language (preserves legal nuance)
 * - Translation only applied to user-facing text
 * - Original always available for reference
 */
@Injectable({
  providedIn: 'root',
})
export class TranslationOrchestratorService {
  private translator = inject(TranslatorService);
  private logger = inject(LoggerService);
  
  /**
   * Translate entire analysis output
   * 
   * @param analysis - The AI analysis response to translate
   * @param sourceLanguage - Original language (e.g., "en")
   * @param targetLanguage - Target language (e.g., "ar")
   * @returns Translated analysis
   */
  async translateAnalysis(
    analysis: AIAnalysisResponse,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<AIAnalysisResponse> {
    this.logger.info(`🌍 [Translation] Starting translation: ${sourceLanguage} → ${targetLanguage}`);
    
    // If same language, return as-is (no translation needed)
    if (sourceLanguage === targetLanguage) {
      this.logger.info('✅ [Translation] Same language - skipping translation');
      return analysis;
    }
    
    try {
      this.logger.info(`🌍 [Translation Orchestrator] === STARTING TRANSLATION ===`);
      this.logger.info(`📋 [Translation Orchestrator] Source: ${sourceLanguage} → Target: ${targetLanguage}`);
      this.logger.debug(`📊 [Translation Orchestrator] FULL Original Analysis (${sourceLanguage}):`, analysis);
      
      // Translate all sections in parallel for performance
      const [
        translatedRisks,
        translatedObligations,
        translatedOmissions,
        translatedQuestions,
        translatedSummary,
      ] = await Promise.all([
        this.translateRisks(analysis.risks, sourceLanguage, targetLanguage),
        this.translateObligations(analysis.obligations, sourceLanguage, targetLanguage),
        this.translateOmissions(analysis.omissions, sourceLanguage, targetLanguage),
        this.translateQuestions(analysis.questions, sourceLanguage, targetLanguage),
        this.translateSummary(analysis.summary, sourceLanguage, targetLanguage),
      ]);
      
      this.logger.info('✅ [Translation Orchestrator] All sections translated successfully');
      
      // Return translated analysis
      const result = {
        ...analysis,
        risks: translatedRisks,
        obligations: translatedObligations,
        omissions: translatedOmissions,
        questions: translatedQuestions,
        summary: translatedSummary,
        metadata: {
          ...analysis.metadata,
          analyzedInLanguage: targetLanguage,  // Update metadata to reflect translation
        },
      };
      
      this.logger.debug(`📊 [Translation Orchestrator] FULL Translated Analysis (${targetLanguage}):`, result);
      this.logger.info(`🌍 [Translation Orchestrator] === TRANSLATION COMPLETE ===`);
      return result;
    } catch (error) {
      this.logger.error('❌ [Translation] Translation failed:', error);
      // Return original on error
      return analysis;
    }
  }
  
  /**
   * Translate risks array
   * 
   * Translates:
   * - title: Risk name
   * - description: Risk explanation
   * 
   * Preserves:
   * - severity: "High" | "Medium" | "Low"
   * - emoji: 🚨 | ⚠️ | ℹ️
   * - impactOn: "employer" | "employee" | "both"
   */
  private async translateRisks(
    risks: RiskFlag[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<RiskFlag[]> {
    this.logger.info(`📋 [Translation] Translating ${risks.length} risks...`);
    this.logger.debug(`📄 [Translation] Original first risk:`, {
      title: risks[0]?.title,
      description: risks[0]?.description.substring(0, 100) + '...',
      impact: risks[0]?.impact?.substring(0, 100) + '...'
    });
    
    const translated = await Promise.all(
      risks.map(async (risk) => ({
        ...risk,
        title: await this.translator.translate(risk.title, sourceLanguage, targetLanguage),
        description: await this.translator.translate(risk.description, sourceLanguage, targetLanguage),
        impact: await this.translator.translate(risk.impact, sourceLanguage, targetLanguage),  // 👈 FIX: Translate impact too!
        // Preserve: severity, emoji, impactOn, contextWarning (no translation needed)
      }))
    );
    
    this.logger.debug(`✅ [Translation] Translated first risk:`, {
      title: translated[0]?.title,
      description: translated[0]?.description.substring(0, 100) + '...',
      impact: translated[0]?.impact?.substring(0, 100) + '...'
    });
    
    return translated;
  }
  
  /**
   * Translate obligations
   * 
   * Translates:
   * - duty: Obligation description
   * - scope: Obligation scope (if present)
   * 
   * Preserves:
   * - amount: Numbers/currency
   * - frequency: Dates
   * - startDate: Dates
   * - duration: Time periods
   */
  private async translateObligations(
    obligations: Obligations,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Obligations> {
    this.logger.info(`📋 [Translation] Translating obligations...`);
    
    // Translate party1 obligations
    const party1 = await Promise.all(
      obligations.party1.map(async (obl: StructuredObligation) => ({
        ...obl,
        duty: await this.translator.translate(obl.duty, sourceLanguage, targetLanguage),
        frequency: obl.frequency
          ? await this.translator.translate(obl.frequency, sourceLanguage, targetLanguage)
          : null,
        startDate: obl.startDate
          ? await this.translator.translate(obl.startDate, sourceLanguage, targetLanguage)
          : null,
        duration: obl.duration
          ? await this.translator.translate(obl.duration, sourceLanguage, targetLanguage)
          : null,
        scope: obl.scope
          ? await this.translator.translate(obl.scope, sourceLanguage, targetLanguage)
          : null,
        // Preserve: amount (number)
      }))
    );
    
    // Translate party2 obligations
    const party2 = await Promise.all(
      obligations.party2.map(async (obl: StructuredObligation) => ({
        ...obl,
        duty: await this.translator.translate(obl.duty, sourceLanguage, targetLanguage),
        frequency: obl.frequency
          ? await this.translator.translate(obl.frequency, sourceLanguage, targetLanguage)
          : null,
        startDate: obl.startDate
          ? await this.translator.translate(obl.startDate, sourceLanguage, targetLanguage)
          : null,
        duration: obl.duration
          ? await this.translator.translate(obl.duration, sourceLanguage, targetLanguage)
          : null,
        scope: obl.scope
          ? await this.translator.translate(obl.scope, sourceLanguage, targetLanguage)
          : null,
        // Preserve: amount (number)
      }))
    );
    
    return {
      party1,
      party2,
    };
  }
  
  /**
   * Translate omissions
   * 
   * Translates:
   * - item: What's missing
   * - impact: Why it matters
   * 
   * Preserves:
   * - priority: "High" | "Medium" | "Low"
   */
  private async translateOmissions(
    omissions: Omission[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Omission[]> {
    this.logger.info(`📋 [Translation] Translating ${omissions.length} omissions...`);
    
    return Promise.all(
      omissions.map(async (omission) => ({
        ...omission,
        item: await this.translator.translate(omission.item, sourceLanguage, targetLanguage),
        impact: await this.translator.translate(omission.impact, sourceLanguage, targetLanguage),
        // Preserve: priority (no translation needed)
      }))
    );
  }
  
  /**
   * Translate questions array
   * 
   * Translates:
   * - Each question string
   */
  private async translateQuestions(
    questions: string[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string[]> {
    this.logger.info(`📋 [Translation] Translating ${questions.length} questions...`);
    
    return Promise.all(
      questions.map((q) => this.translator.translate(q, sourceLanguage, targetLanguage))
    );
  }
  
  /**
   * Translate summary
   * 
   * Translates:
   * - parties: Party descriptions
   * - role: Relationship type
   * - responsibilities: Duty descriptions
   * - benefits: Benefit descriptions
   * - fromYourPerspective: Perspective summary
   * - keyBenefits: Benefit list
   * - keyConcerns: Concern list
   * 
   * Preserves:
   * - compensation.baseSalary: Numbers
   * - compensation amounts: Numbers
   * - termination: Legal terms (complex, may need refinement)
   * - restrictions: Legal terms (complex, may need refinement)
   */
  private async translateSummary(
    summary: ContractSummary,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<ContractSummary> {
    this.logger.info(`📋 [Translation] Translating summary...`);
    this.logger.debug(`📄 [Translation] Original summary.quickTake:`, summary.quickTake?.substring(0, 100) + '...');
    
    // Translate all text fields in parallel
    const [
      quickTake,
      keyResponsibilities,
      benefits,
      fromYourPerspective,
      keyBenefits,
      keyConcerns,
    ] = await Promise.all([
      summary.quickTake ? this.translator.translate(summary.quickTake, sourceLanguage, targetLanguage) : Promise.resolve(summary.quickTake),
      Promise.all(summary.summary.keyResponsibilities.map((r: string) => 
        this.translator.translate(r, sourceLanguage, targetLanguage)
      )),
      Promise.all(summary.summary.benefits.map((b: string) => 
        this.translator.translate(b, sourceLanguage, targetLanguage)
      )),
      summary.fromYourPerspective
        ? this.translator.translate(summary.fromYourPerspective, sourceLanguage, targetLanguage)
        : Promise.resolve(undefined),
      summary.keyBenefits
        ? Promise.all(summary.keyBenefits.map((k: string) => 
            this.translator.translate(k, sourceLanguage, targetLanguage)
          ))
        : Promise.resolve(undefined),
      summary.keyConcerns
        ? Promise.all(summary.keyConcerns.map((k: string) => 
            this.translator.translate(k, sourceLanguage, targetLanguage)
          ))
        : Promise.resolve(undefined),
    ]);
    
    this.logger.debug(`✅ [Translation] Translated summary.quickTake:`, quickTake?.substring(0, 100) + '...');
    
    return {
      ...summary,
      quickTake,
      summary: {
        ...summary.summary,
        keyResponsibilities,
        benefits,
      },
      ...(fromYourPerspective && { fromYourPerspective }),
      ...(keyBenefits && { keyBenefits }),
      ...(keyConcerns && { keyConcerns }),
    };
  }
  
  /**
   * Check if translation is needed
   */
  needsTranslation(sourceLanguage: string, targetLanguage: string): boolean {
    return sourceLanguage !== targetLanguage;
  }
}

