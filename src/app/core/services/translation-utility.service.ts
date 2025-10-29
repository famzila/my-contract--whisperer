import { Injectable, inject } from '@angular/core';
import { TranslatorService } from './ai/translator.service';
import { LoggerService } from './logger.service';
import * as Schemas from '../schemas/analysis-schemas';

/**
 * Translation Utility Service
 * Extracts common translation patterns from contract analysis service
 * Provides reusable methods for translating analysis results
 */
@Injectable({
  providedIn: 'root',
})
export class TranslationUtilityService {
  private translator = inject(TranslatorService);
  private logger = inject(LoggerService);

  /**
   * Translate a single string field, handling null/undefined values
   * Uses general translate method (not translateFromEnglish) since AI output might not be in English
   */
  private async translateField(
    value: string | null | undefined,
    targetLanguage: string,
    sourceLanguage: string = 'en'
  ): Promise<string | null> {
    if (!value) return null;
    return await this.translator.translate(value, sourceLanguage, targetLanguage);
  }

  /**
   * Translate an array of strings
   */
  private async translateStringArray(
    values: string[],
    targetLanguage: string
  ): Promise<string[]> {
    return Promise.all(
      values.map(value => this.translator.translateFromEnglish(value, targetLanguage))
    );
  }

  /**
   * Translate contract metadata
   */
  async translateMetadata(
    metadata: Schemas.ContractMetadata,
    targetLanguage: string,
    sourceLanguage: string = 'en'
  ): Promise<Schemas.ContractMetadata> {
    this.logger.info(`🌍 [Translation] Translating metadata from ${sourceLanguage} to ${targetLanguage}...`);
    this.logger.debug(`📄 [Translation] Original duration: "${metadata.duration}"`);
    
    const translatedDuration = await this.translateField(metadata.duration, targetLanguage, sourceLanguage);
    this.logger.debug(`📄 [Translation] Translated duration: "${translatedDuration}"`);
    
    return {
      ...metadata,
      contractType: await this.translator.translate(metadata.contractType, sourceLanguage, targetLanguage),
      jurisdiction: await this.translateField(metadata.jurisdiction, targetLanguage, sourceLanguage),
      duration: translatedDuration,
      parties: {
        party1: {
          ...metadata.parties.party1,
          role: await this.translator.translate(metadata.parties.party1.role, sourceLanguage, targetLanguage),
        },
        party2: {
          ...metadata.parties.party2,
          role: await this.translator.translate(metadata.parties.party2.role, sourceLanguage, targetLanguage),
        },
      },
    };
  }

  /**
   * Translate contract summary
   */
  async translateSummary(
    summary: Schemas.ContractSummary,
    targetLanguage: string
  ): Promise<Schemas.ContractSummary> {
    this.logger.info(`🌍 [Translation] Translating summary to ${targetLanguage}...`);
    
    const quickTake = await this.translateField(summary.summary?.quickTake, targetLanguage);
    
    return {
      summary: {
        quickTake: quickTake || undefined,
        keyResponsibilities: await this.translateStringArray(
          summary.summary.keyResponsibilities,
          targetLanguage
        ),
        compensation: {
          baseSalary: summary.summary.compensation.baseSalary,
          bonus: await this.translateField(summary.summary.compensation.bonus, targetLanguage),
          equity: await this.translateField(summary.summary.compensation.equity, targetLanguage),
          other: await this.translateField(summary.summary.compensation.other, targetLanguage),
        },
        benefits: await this.translateStringArray(
          summary.summary.benefits,
          targetLanguage
        ),
        termination: {
          atWill: await this.translateField(summary.summary.termination.atWill, targetLanguage),
          forCause: await this.translateField(summary.summary.termination.forCause, targetLanguage),
          severance: await this.translateField(summary.summary.termination.severance, targetLanguage),
          noticeRequired: await this.translateField(summary.summary.termination.noticeRequired, targetLanguage),
        },
        restrictions: {
          confidentiality: await this.translateField(summary.summary.restrictions.confidentiality, targetLanguage),
          nonCompete: await this.translateField(summary.summary.restrictions.nonCompete, targetLanguage),
          nonSolicitation: await this.translateField(summary.summary.restrictions.nonSolicitation, targetLanguage),
          intellectualProperty: await this.translateField(summary.summary.restrictions.intellectualProperty, targetLanguage),
          other: await this.translateField(summary.summary.restrictions.other, targetLanguage),
        },
      },
    };
  }

  /**
   * Translate risks analysis
   */
  async translateRisks(
    risks: Schemas.RisksAnalysis,
    targetLanguage: string
  ): Promise<Schemas.RisksAnalysis> {
    this.logger.info(`🌍 [Translation] Translating risks to ${targetLanguage}...`);
    
    return {
      risks: await Promise.all(
        risks.risks.map(async (risk) => ({
          ...risk,
          title: await this.translator.translateFromEnglish(risk.title, targetLanguage),
          description: await this.translator.translateFromEnglish(risk.description, targetLanguage),
          impact: await this.translator.translateFromEnglish(risk.impact, targetLanguage),
        }))
      ),
    };
  }

  /**
   * Translate obligations analysis
   */
  async translateObligations(
    obligations: Schemas.ObligationsAnalysis,
    targetLanguage: string
  ): Promise<Schemas.ObligationsAnalysis> {
    this.logger.info(`🌍 [Translation] Translating obligations to ${targetLanguage}...`);
    
    return {
      obligations: {
        party1: await Promise.all(
          obligations.obligations.party1.map(async (obligation) => ({
            ...obligation,
            duty: await this.translator.translateFromEnglish(obligation.duty, targetLanguage),
            frequency: await this.translateField(obligation.frequency, targetLanguage),
            scope: await this.translateField(obligation.scope, targetLanguage),
          }))
        ),
        party2: await Promise.all(
          obligations.obligations.party2.map(async (obligation) => ({
            ...obligation,
            duty: await this.translator.translateFromEnglish(obligation.duty, targetLanguage),
            frequency: await this.translateField(obligation.frequency, targetLanguage),
            scope: await this.translateField(obligation.scope, targetLanguage),
          }))
        ),
      },
    };
  }

  /**
   * Translate omissions and questions
   */
  async translateOmissionsAndQuestions(
    omissionsAndQuestions: Schemas.OmissionsAndQuestions,
    targetLanguage: string
  ): Promise<Schemas.OmissionsAndQuestions> {
    this.logger.info(`🌍 [Translation] Translating omissions and questions to ${targetLanguage}...`);
    
    return {
      omissions: await Promise.all(
        omissionsAndQuestions.omissions.map(async (omission) => ({
          ...omission,
          item: await this.translator.translateFromEnglish(omission.item, targetLanguage),
          impact: await this.translator.translateFromEnglish(omission.impact, targetLanguage),
        }))
      ),
      questions: await this.translateStringArray(
        omissionsAndQuestions.questions,
        targetLanguage
      ),
    };
  }
}
