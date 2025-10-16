import { Injectable } from '@angular/core';

/**
 * Translation Cache Service
 * 
 * Manages localStorage-based caching of contract analysis translations.
 * Stores original (English) results and all translated versions for instant retrieval.
 * 
 * Features:
 * - Persists across page refreshes
 * - Automatic cleanup of old contracts (max 5)
 * - Expiration handling (7 days)
 * - Quota management (handles localStorage limits)
 * - Type-safe caching with proper error handling
 */
@Injectable({ providedIn: 'root' })
export class TranslationCacheService {
  private readonly CACHE_KEY = 'contract_analysis_cache';
  private readonly MAX_CONTRACTS = 5; // Keep last 5 contracts
  private readonly MAX_AGE_DAYS = 7; // Cache for 7 days

  /**
   * Get cached translation for a contract
   */
  getCachedTranslation(
    contractId: string, 
    targetLanguage: string
  ): CachedAnalysis | null {
    const cache = this.getCache();
    const contractCache = cache[contractId];
    
    if (!contractCache) {
      console.log(`📭 [Cache] No cache found for contract ${contractId}`);
      return null;
    }
    
    const translation = contractCache.translations[targetLanguage];
    
    // Check if translation exists and is not expired
    if (translation && !this.isExpired(translation.translatedAt)) {
      console.log(`✅ [Cache] Found ${targetLanguage} translation for contract ${contractId}`);
      return translation;
    }
    
    if (translation && this.isExpired(translation.translatedAt)) {
      console.log(`⏰ [Cache] ${targetLanguage} translation expired for contract ${contractId}`);
      // Remove expired translation
      delete contractCache.translations[targetLanguage];
      this.saveCache(cache);
    }
    
    return null;
  }

  /**
   * Store original analysis (should be English from Gemini)
   */
  storeOriginal(contractId: string, analysis: AnalysisData, language: string = 'en'): void {
    const cache = this.getCache();
    
    if (!cache[contractId]) {
      cache[contractId] = {
        original: {
          language,
          ...analysis,
          cachedAt: new Date().toISOString()
        },
        translations: {}
      };
    } else {
      cache[contractId].original = {
        language,
        ...analysis,
        cachedAt: new Date().toISOString()
      };
    }
    
    this.saveCache(cache);
    console.log(`💾 [Cache] Stored original analysis (${language}) for contract ${contractId}`);
  }

  /**
   * Store translated analysis
   */
  storeTranslation(
    contractId: string, 
    targetLanguage: string, 
    translatedAnalysis: AnalysisData
  ): void {
    const cache = this.getCache();
    
    if (!cache[contractId]) {
      console.warn(`⚠️ [Cache] No original found for contract ${contractId}`);
      return;
    }
    
    cache[contractId].translations[targetLanguage] = {
      ...translatedAnalysis,
      translatedAt: new Date().toISOString()
    };
    
    this.saveCache(cache);
    console.log(`💾 [Cache] Stored ${targetLanguage} translation for contract ${contractId}`);
  }

  /**
   * Get original (English) analysis
   */
  getOriginal(contractId: string): CachedAnalysis | null {
    const cache = this.getCache();
    const contractCache = cache[contractId];
    
    if (!contractCache?.original) {
      console.log(`📭 [Cache] No original found for contract ${contractId}`);
      return null;
    }
    
    if (this.isExpired(contractCache.original.cachedAt)) {
      console.log(`⏰ [Cache] Original expired for contract ${contractId}`);
      return null;
    }
    
    console.log(`✅ [Cache] Found original analysis for contract ${contractId}`);
    return contractCache.original;
  }

  /**
   * Clear cache for a specific contract
   */
  clearContract(contractId: string): void {
    const cache = this.getCache();
    delete cache[contractId];
    this.saveCache(cache);
    console.log(`🗑️ [Cache] Cleared cache for contract ${contractId}`);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    localStorage.removeItem(this.CACHE_KEY);
    console.log(`🗑️ [Cache] Cleared all translation cache`);
  }

  /**
   * Get available translations for a contract
   */
  getAvailableLanguages(contractId: string): string[] {
    const cache = this.getCache();
    const contractCache = cache[contractId];
    
    if (!contractCache) return [];
    
    const languages = ['en']; // Original is always English
    
    // Add non-expired translations
    Object.keys(contractCache.translations).forEach(lang => {
      const translation = contractCache.translations[lang];
      if (translation && !this.isExpired(translation.translatedAt)) {
        languages.push(lang);
      }
    });
    
    return languages;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const cache = this.getCache();
    const contractIds = Object.keys(cache);
    
    let totalTranslations = 0;
    let expiredTranslations = 0;
    
    contractIds.forEach(id => {
      const contractCache = cache[id];
      
      // Check original
      if (contractCache.original && this.isExpired(contractCache.original.cachedAt)) {
        expiredTranslations++;
      }
      
      // Check translations
      Object.values(contractCache.translations).forEach(translation => {
        totalTranslations++;
        if (this.isExpired(translation.translatedAt)) {
          expiredTranslations++;
        }
      });
    });
    
    return {
      totalContracts: contractIds.length,
      totalTranslations,
      expiredTranslations,
      cacheSize: JSON.stringify(cache).length
    };
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired(): void {
    const cache = this.getCache();
    let cleaned = false;
    
    Object.keys(cache).forEach(contractId => {
      const contractCache = cache[contractId];
      
      // Remove expired original
      if (contractCache.original && this.isExpired(contractCache.original.cachedAt)) {
        delete contractCache.original;
        cleaned = true;
        console.log(`🗑️ [Cache] Removed expired original for contract ${contractId}`);
      }
      
      // Remove expired translations
      Object.keys(contractCache.translations).forEach(lang => {
        const translation = contractCache.translations[lang];
        if (translation && this.isExpired(translation.translatedAt)) {
          delete contractCache.translations[lang];
          cleaned = true;
          console.log(`🗑️ [Cache] Removed expired ${lang} translation for contract ${contractId}`);
        }
      });
      
      // Remove contract if no data left
      if (!contractCache.original && Object.keys(contractCache.translations).length === 0) {
        delete cache[contractId];
        cleaned = true;
        console.log(`🗑️ [Cache] Removed empty contract ${contractId}`);
      }
    });
    
    if (cleaned) {
      this.saveCache(cache);
      console.log(`🧹 [Cache] Cleanup completed`);
    }
  }

  // Private helpers
  private getCache(): TranslationCache {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('❌ [Cache] Failed to parse cache:', error);
      return {};
    }
  }

  private saveCache(cache: TranslationCache): void {
    try {
      // Cleanup old contracts (keep only last N)
      const contractIds = Object.keys(cache);
      if (contractIds.length > this.MAX_CONTRACTS) {
        const sorted = contractIds.sort((a, b) => {
          const aTime = cache[a].original?.cachedAt || '';
          const bTime = cache[b].original?.cachedAt || '';
          return bTime.localeCompare(aTime); // Newest first
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
            const aTime = cache[a].original?.cachedAt || '';
            const bTime = cache[b].original?.cachedAt || '';
            return aTime.localeCompare(bTime); // Oldest first
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

// Types
interface TranslationCache {
  [contractId: string]: {
    original?: CachedAnalysis;
    translations: {
      [language: string]: CachedAnalysis;
    };
  };
}

export interface CachedAnalysis {
  language?: string;
  metadata: any;
  summary: any;
  risks: any;
  obligations: any;
  omissions: any;
  cachedAt?: string;
  translatedAt?: string;
}

export interface AnalysisData {
  metadata: any;
  summary: any;
  risks: any;
  obligations: any;
  omissions: any;
}

export interface CacheStats {
  totalContracts: number;
  totalTranslations: number;
  expiredTranslations: number;
  cacheSize: number; // in bytes
}
