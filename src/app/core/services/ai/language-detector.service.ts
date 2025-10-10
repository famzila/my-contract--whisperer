import { Injectable } from '@angular/core';
import type {
  LanguageDetector,
  LanguageDetectionResult,
  AICreateMonitor,
} from '../../models/ai.types';

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

  /**
   * Check if Language Detector API is available
   * Per official docs: https://developer.chrome.com/docs/ai/language-detection
   */
  async isAvailable(): Promise<boolean> {
    return 'LanguageDetector' in window;
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
      console.log('📥 [LanguageDetector] Model needs download...');
    }

    // Create detector with monitor for download progress
    this.detector = await window.LanguageDetector.create({
      monitor: (m: AICreateMonitor) => {
        m.addEventListener('downloadprogress', (e) => {
          const percent = (e.loaded * 100).toFixed(1);
          // Only log significant progress milestones
          if (e.loaded === 0 || e.loaded === 1 || e.loaded % 0.25 === 0) {
            console.log(`📥 [LanguageDetector] Loading model: ${percent}%`);
          }
        });
      },
    });

    console.log('✅ [LanguageDetector] Detector ready');
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
        
        console.log(`🌍 [LanguageDetector] Detected: ${topResult.detectedLanguage} (${(topResult.confidence * 100).toFixed(1)}% confidence)`);
        
        // Log other likely languages for debugging
        if (results.length > 1) {
          console.log('📊 [LanguageDetector] Other possibilities:', 
            results.slice(1, 4).map(r => `${r.detectedLanguage} (${(r.confidence * 100).toFixed(1)}%)`).join(', ')
          );
        }
        
        return topResult.detectedLanguage;
      }
      
      console.warn('⚠️ [LanguageDetector] No results returned');
      return null;
    } catch (error) {
      console.error('❌ [LanguageDetector] Detection failed:', error);
      return null;
    }
  }

  /**
   * Detect the language with full confidence rankings
   * Returns all detected languages ranked by confidence
   * 
   * @param text - The text to analyze
   * @returns Array of language detection results with confidence scores
   */
  async detectWithConfidence(text: string): Promise<LanguageDetectionResult[]> {
    try {
      const detector = await this.createDetector();
      const results = await detector.detect(text);
      
      if (results && results.length > 0) {
        console.log(`🌍 [LanguageDetector] Detected ${results.length} possible languages`);
        return results;
      }
      
      return [];
    } catch (error) {
      console.error('❌ [LanguageDetector] Detection failed:', error);
      return [];
    }
  }

  /**
   * Detect language with threshold filtering
   * Only returns result if confidence is above threshold
   * 
   * @param text - The text to analyze
   * @param minConfidence - Minimum confidence threshold (0.0 to 1.0)
   * @returns The detected language code or null if confidence is too low
   */
  async detectWithThreshold(text: string, minConfidence: number = 0.5): Promise<string | null> {
    try {
      const results = await this.detectWithConfidence(text);
      
      if (results.length > 0 && results[0].confidence >= minConfidence) {
        return results[0].detectedLanguage;
      }
      
      console.warn(`⚠️ [LanguageDetector] Confidence too low (${(results[0]?.confidence * 100).toFixed(1)}% < ${minConfidence * 100}%)`);
      return null;
    } catch (error) {
      console.error('❌ [LanguageDetector] Detection failed:', error);
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
      console.log('🗑️ [LanguageDetector] Detector destroyed');
    }
  }
}



