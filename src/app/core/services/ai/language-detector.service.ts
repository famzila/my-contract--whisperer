import { inject, Injectable, DestroyRef } from '@angular/core';
import type {
  LanguageDetector,
  LanguageDetectionResult,
  AICreateMonitor,
} from '../../models/ai-analysis.model';
import { LoggerService } from '../logger.service';
import { Subject } from 'rxjs';

/**
 * Service for Chrome Built-in Language Detector API
 * Detects the language of input text using on-device AI
 * 
 * Reference: https://developer.chrome.com/docs/ai/language-detection
 */
@Injectable({
  providedIn: 'root',
})
export class LanguageDetectorService {
  private detector: LanguageDetector | null = null;
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private readonly destroy$ = new Subject<void>();
  
  constructor() {
    // Register cleanup callback
    this.destroyRef.onDestroy(() => {
      this.destroy$.next();
      this.destroy$.complete();
      this.destroy();
    });
  }

  /**
   * Check if Language Detector API is available
   * Per official docs: https://developer.chrome.com/docs/ai/language-detection
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!window.LanguageDetector) {
        this.logger.warn('⚠️ [LanguageDetector] Chrome Built-in AI not available. Please enable Chrome AI features.');
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to check LanguageDetector availability', error);
      return false;
    }
  }

  /**
   * Check Language Detector API availability status
   */
  async checkAvailability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'> {
    if (!window.LanguageDetector) {
      return 'unavailable';
    }
    
    return await window.LanguageDetector.availability();
  }

  /**
   * Create a language detector instance
   * The model is downloaded on-demand the first time this is called
   */
  async createDetector(): Promise<LanguageDetector> {
    if (!window.LanguageDetector) {
      throw new Error('LanguageDetector API not available');
    }

    // Return existing detector if already created
    if (this.detector) {
      return this.detector;
    }

    // Check availability
    const availability = await this.checkAvailability();
    
    if (availability === 'downloadable') {
      this.logger.info('📥 [LanguageDetector] Model needs download...');
    }

    // Create detector with monitor for download progress
    this.detector = await window.LanguageDetector.create({
      monitor: (m: AICreateMonitor) => {
        m.addEventListener('downloadprogress', (e) => {
          const percent = (e.loaded * 100).toFixed(1);
          // Only log significant progress milestones
          if (e.loaded === 0 || e.loaded === 1 || e.loaded % 0.25 === 0) {
            this.logger.info(`📥 [LanguageDetector] Loading model: ${percent}%`);
          }
        });
      },
    });

    this.logger.info('✅ [LanguageDetector] Detector ready');
    return this.detector;
  }

  /**
   * Detect the language of the given text
   * Returns the most likely language with confidence score
   * 
   * @param text - The text to analyze
   * @returns The detected language code (e.g., 'en', 'fr', 'ar') or null if detection fails
   */
  async detect(text: string): Promise<string | null> {
    try {
      const detector = await this.createDetector();
      const results = await detector.detect(text);
      
      // Get the top result (highest confidence)
      if (results && results.length > 0) {
        const topResult = results[0];
        
        this.logger.info(`🌍 [LanguageDetector] Detected: ${topResult.detectedLanguage} (${(topResult.confidence * 100).toFixed(1)}% confidence)`);
        
        // Log other likely languages for debugging
        if (results.length > 1) {
          this.logger.info('📊 [LanguageDetector] Other possibilities:', 
            results.slice(1, 4).map(r => `${r.detectedLanguage} (${(r.confidence * 100).toFixed(1)}%)`).join(', ')
          );
        }
        
        return topResult.detectedLanguage;
      }
      
      this.logger.warn('⚠️ [LanguageDetector] No results returned');
      return null;
    } catch (error) {
      this.logger.error('❌ [LanguageDetector] Detection failed:', error);
      return null;
    }
  }

  /**
   * Destroy the detector instance
   */
  destroy(): void {
    if (this.detector) {
      this.detector.destroy();
      this.detector = null;
    }
  }
}





