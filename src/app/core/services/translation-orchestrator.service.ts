import { Injectable, inject } from '@angular/core';
import { TranslatorService } from './ai/translator.service';
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
    console.log(`🌍 [Translation] Starting translation: ${sourceLanguage} → ${targetLanguage}`);
    
    // If same language, return as-is (no translation needed)
    if (sourceLanguage === targetLanguage) {
      console.log('✅ [Translation] Same language - skipping translation');
      return analysis;
    }
    
    try {
      console.log(`\n🌍 [Translation Orchestrator] === STARTING TRANSLATION ===`);
      console.log(`📋 [Translation Orchestrator] Source: ${sourceLanguage} → Target: ${targetLanguage}`);
      console.log(`📊 [Translation Orchestrator] FULL Original Analysis (${sourceLanguage}):`);
      console.log(JSON.stringify(analysis, null, 2));
      
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
      
      console.log('✅ [Translation Orchestrator] All sections translated successfully');
      
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
      
      console.log(`📊 [Translation Orchestrator] FULL Translated Analysis (${targetLanguage}):`);
      console.log(JSON.stringify(result, null, 2));
      console.log(`🌍 [Translation Orchestrator] === TRANSLATION COMPLETE ===\n`);
      return result;
    } catch (error) {
      console.error('❌ [Translation] Translation failed:', error);
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
    console.log(`\n  📋 [Translation] Translating ${risks.length} risks...`);
    console.log(`  📄 [Translation] Original first risk:`, {
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
    
    console.log(`  ✅ [Translation] Translated first risk:`, {
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
    console.log(`  📋 [Translation] Translating obligations...`);
    
    // Translate employer obligations
    const employer = await Promise.all(
      obligations.employer.map(async (obl: StructuredObligation) => ({
        ...obl,
        duty: await this.translator.translate(obl.duty, sourceLanguage, targetLanguage),
        scope: obl.scope
          ? await this.translator.translate(obl.scope, sourceLanguage, targetLanguage)
          : null,
        // Preserve: amount, frequency, startDate, duration (numbers/dates)
      }))
    );
    
    // Translate employee obligations
    const employee = await Promise.all(
      obligations.employee.map(async (obl: StructuredObligation) => ({
        ...obl,
        duty: await this.translator.translate(obl.duty, sourceLanguage, targetLanguage),
        scope: obl.scope
          ? await this.translator.translate(obl.scope, sourceLanguage, targetLanguage)
          : null,
        // Preserve: amount, frequency, startDate, duration (numbers/dates)
      }))
    );
    
    // Handle perspective-aware obligations if present
    let yours: StructuredObligation[] | undefined;
    let theirs: StructuredObligation[] | undefined;
    
    if (obligations.yours) {
      yours = await Promise.all(
        obligations.yours.map(async (obl: StructuredObligation) => ({
          ...obl,
          duty: await this.translator.translate(obl.duty, sourceLanguage, targetLanguage),
          scope: obl.scope
            ? await this.translator.translate(obl.scope, sourceLanguage, targetLanguage)
            : null,
        }))
      );
    }
    
    if (obligations.theirs) {
      theirs = await Promise.all(
        obligations.theirs.map(async (obl: StructuredObligation) => ({
          ...obl,
          duty: await this.translator.translate(obl.duty, sourceLanguage, targetLanguage),
          scope: obl.scope
            ? await this.translator.translate(obl.scope, sourceLanguage, targetLanguage)
            : null,
        }))
      );
    }
    
    return { 
      employer, 
      employee,
      ...(yours && { yours }),
      ...(theirs && { theirs }),
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
    console.log(`  📋 [Translation] Translating ${omissions.length} omissions...`);
    
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
    console.log(`  📋 [Translation] Translating ${questions.length} questions...`);
    
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
    console.log(`\n  📋 [Translation] Translating summary...`);
    console.log(`  📄 [Translation] Original summary.parties:`, summary.parties.substring(0, 100) + '...');
    
    // Translate all text fields in parallel
    const [
      parties,
      role,
      responsibilities,
      benefits,
      fromYourPerspective,
      keyBenefits,
      keyConcerns,
    ] = await Promise.all([
      this.translator.translate(summary.parties, sourceLanguage, targetLanguage),
      this.translator.translate(summary.role, sourceLanguage, targetLanguage),
      Promise.all(summary.responsibilities.map((r: string) => 
        this.translator.translate(r, sourceLanguage, targetLanguage)
      )),
      Promise.all(summary.benefits.map((b: string) => 
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
    
    console.log(`  ✅ [Translation] Translated summary.parties:`, parties.substring(0, 100) + '...');
    
    return {
      ...summary,
      parties,
      role,
      responsibilities,
      benefits,
      ...(fromYourPerspective && { fromYourPerspective }),
      ...(keyBenefits && { keyBenefits }),
      ...(keyConcerns && { keyConcerns }),
      // Preserve: compensation (numbers), termination, restrictions
      // Note: We keep compensation, termination, and restrictions as-is
      // since they contain numbers, legal terms, and dates
    };
  }
  
  /**
   * Check if translation is needed
   */
  needsTranslation(sourceLanguage: string, targetLanguage: string): boolean {
    return sourceLanguage !== targetLanguage;
  }
}

