// Types
import type { CompleteAnalysis } from '../schemas/analysis-schemas';

export interface TranslationCache {
  [contractId: string]: {
    // All languages in translations array
    translations: {
      [language: string]: CachedAnalysis;
    };
  };
}

// CachedAnalysis now extends the canonical CompleteAnalysis shape and adds metadata
export interface CachedAnalysis extends CompleteAnalysis {
  translatedAt?: string;
}

