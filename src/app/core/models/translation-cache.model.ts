// Types
export interface TranslationCache {
  [contractId: string]: {
    // All languages in translations array
    translations: {
      [language: string]: CachedAnalysis;
    };
  };
}

export interface CachedAnalysis {
  metadata: any;
  summary: any;
  risks: any;
  obligations: any;
  omissions: any;
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
