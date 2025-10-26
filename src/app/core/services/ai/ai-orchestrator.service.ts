import { Injectable, inject } from '@angular/core';
import { PromptService } from './prompt.service';
import { SummarizerService } from './summarizer.service';
import { TranslatorService } from './translator.service';
import { LanguageDetectorService } from './language-detector.service';
import { WriterService } from './writer.service';
import { LoggerService } from '../logger.service';

/**
 * AI Service availability status
 */
export interface AIServicesStatus {
  prompt: boolean;
  summarizer: boolean;
  translator: boolean;
  languageDetector: boolean;
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
  private languageDetectorService = inject(LanguageDetectorService);
  private writerService = inject(WriterService);
  private logger = inject(LoggerService);

  private servicesStatus: AIServicesStatus | null = null;

  /**
   * Check availability of all AI services
   */
  async checkAvailability(): Promise<AIServicesStatus> {
    const [prompt, summarizer, translator, languageDetector, writer, rewriter] = await Promise.all([
      this.promptService.isAvailable(),
      this.summarizerService.isAvailable(),
      this.translatorService.isAvailable(),
      this.languageDetectorService.isAvailable(),
      this.writerService.isWriterAvailable(),
      this.writerService.isRewriterAvailable(),
    ]);

    this.servicesStatus = {
      prompt,
      summarizer,
      translator,
      languageDetector,
      writer,
      rewriter,
      allAvailable: prompt && summarizer && translator && writer && rewriter,
    };

    this.logger.info('AI services status', this.servicesStatus);
    return this.servicesStatus;
  }

  /**
   * Get cached services status (call checkAvailability() first)
   */
  getServicesStatus(): AIServicesStatus | null {
    return this.servicesStatus;
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

