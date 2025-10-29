import { Injectable, inject } from '@angular/core';
import { CachedAnalysis, TranslationCache } from '../models/translation-cache.model';
import type { CompleteAnalysis } from '../schemas/analysis-schemas';
import { LoggerService } from './logger.service';

/**
 * Translation Cache Service
 * 
 * Manages localStorage-based caching of contract analysis results.
 * Uses unified structure: all languages (including original) stored in translations array.
 * 
 * Features:
 * - Persists across page refreshes
 * - Automatic cleanup of old contracts (max 5)
 * - Expiration handling (7 days)
 * - Quota management (handles localStorage limits)
 * - Type-safe caching with proper error handling
 * - Backward compatibility with old cache format
 */
import { STORAGE_CONFIG } from '../config/application.config';

@Injectable({ providedIn: 'root' })
export class TranslationCacheService {
  private logger = inject(LoggerService);
  private readonly CACHE_KEY = STORAGE_CONFIG.CONTRACT_CACHE.CACHE_KEY;
  private readonly MAX_CONTRACTS = STORAGE_CONFIG.TRANSLATION_CACHE.MAX_CONTRACTS;
  private readonly MAX_AGE_DAYS = STORAGE_CONFIG.TRANSLATION_CACHE.MAX_AGE_DAYS;

  /**
   * Get cached analysis for a contract in specific language
   * Supports both new unified format and legacy format for backward compatibility
   */
  getAnalysis(contractId: string, languageCode: string): CachedAnalysis | null {
    const cache = this.getCache();
    const contractCache = cache[contractId];
    
    if (!contractCache) {
      this.logger.info(`No cache found for contract ${contractId}`);
      return null;
    }
    
    // Check translations array
    if (contractCache.translations?.[languageCode]) {
      const analysis = contractCache.translations[languageCode];
      
      if (!this.isExpired(analysis.translatedAt)) {
        this.logger.info(`Found ${languageCode} analysis for contract ${contractId}`);
        return analysis;
      } else {
        this.logger.info(`${languageCode} analysis expired for contract ${contractId}`);
        // Remove expired analysis
        delete contractCache.translations[languageCode];
        this.saveCache(cache);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Store analysis results for a specific language
   * Unified method translated results
   * 
   * @param languageCode - The language of the analysis results (en, es, ja, ar, fr, etc.)
   */
  storeAnalysis(contractId: string, languageCode: string, analysis: Partial<CompleteAnalysis>): void {
    const cache = this.getCache();
    
    if (!cache[contractId]) {
      cache[contractId] = { translations: {} };
    }
    
    // Ensure translations object exists 
    if (!cache[contractId].translations) {
      cache[contractId].translations = {};
    }
    
    const existing = cache[contractId].translations[languageCode] || {};
    cache[contractId].translations[languageCode] = {
      ...(existing as CachedAnalysis),
      ...(analysis as CompleteAnalysis),
      translatedAt: new Date().toISOString(),
    } as CachedAnalysis;
    
    this.saveCache(cache);
    this.logger.info(`Stored ${languageCode} analysis for contract ${contractId}`);
  }

  /**
   * Get available languages for a contract
   * Returns all languages that have cached analysis
   */
  getAvailableLanguages(contractId: string): string[] {
    const cache = this.getCache();
    const contractCache = cache[contractId];
    
    if (!contractCache) return [];
    
    const languages: string[] = [];
    
    // Check translations array
    if (contractCache.translations) {
      Object.keys(contractCache.translations).forEach(lang => {
        const analysis = contractCache.translations[lang];
        if (analysis && !this.isExpired(analysis.translatedAt)) {
          languages.push(lang);
        }
      });
    }
    
    return languages;
  }

  /**
   * Clear cache for a specific contract
   */
  clearContract(contractId: string): void {
    const cache = this.getCache();
    delete cache[contractId];
    this.saveCache(cache);
    this.logger.info(`Cleared cache for contract ${contractId}`);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    localStorage.removeItem(this.CACHE_KEY);
    this.logger.info(`Cleared all translation cache`);
  }


  // Private helpers
  private getCache(): TranslationCache {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      this.logger.error('Failed to parse cache:', error);
      return {};
    }
  }

  private saveCache(cache: TranslationCache): void {
    try {
      // Cleanup old contracts (keep only last N)
      const contractIds = Object.keys(cache);
      if (contractIds.length > this.MAX_CONTRACTS) {
        const sorted = contractIds.sort((a, b) => {
          const aTime = cache[a].translations?.[Object.keys(cache[a].translations)[0]]?.translatedAt || '';
          const bTime = cache[b].translations?.[Object.keys(cache[b].translations)[0]]?.translatedAt || '';
          return (bTime as string).localeCompare(aTime as string); // Newest first
        });
        
        // Remove oldest contracts
        sorted.slice(this.MAX_CONTRACTS).forEach(id => {
          delete cache[id];
          console.log(`🗑️ [Cache] Removed old contract ${id}`);
        });
      }
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('❌ [Cache] Failed to save cache:', error);
      
      // If quota exceeded, clear old data and retry
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('⚠️ [Cache] Quota exceeded, clearing oldest contract');
        const contractIds = Object.keys(cache);
        if (contractIds.length > 0) {
          const oldest = contractIds.sort((a, b) => {
            const aTime = cache[a].translations?.[Object.keys(cache[a].translations)[0]]?.translatedAt || '';
            const bTime = cache[b].translations?.[Object.keys(cache[b].translations)[0]]?.translatedAt || '';
            return (aTime as string).localeCompare(bTime as string); // Oldest first
          })[0];
          delete cache[oldest];
          this.saveCache(cache); // Retry
        }
      }
    }
  }

  private isExpired(timestamp: string | undefined): boolean {
    if (!timestamp) return true;
    const cached = new Date(timestamp);
    const now = new Date();
    const diffDays = (now.getTime() - cached.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > this.MAX_AGE_DAYS;
  }
}

