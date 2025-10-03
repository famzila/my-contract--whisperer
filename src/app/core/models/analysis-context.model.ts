/**
 * Analysis Context Model
 * Contextual information passed to AI for perspective-aware analysis
 */

export type UserRole = 
  | 'employer' 
  | 'employee' 
  | 'client' 
  | 'contractor' 
  | 'landlord' 
  | 'tenant' 
  | 'partner'
  | 'both_views'
  | null;

/**
 * Complete analysis context
 */
export interface AnalysisContext {
  // Language context
  contractLanguage: string;           // Detected contract language
  userPreferredLanguage: string;      // User's preferred output language
  
  // Party context
  userRole: UserRole;                 // Which party the user represents
  detectedParties?: {
    party1?: { name: string; role: string; location?: string };
    party2?: { name: string; role: string; location?: string };
  };
  
  // Additional context (for future use)
  userCountry?: string;               // User's jurisdiction
  contractJurisdiction?: string;      // Contract's governing jurisdiction
}

/**
 * Default analysis context (employee perspective, English)
 */
export const DEFAULT_ANALYSIS_CONTEXT: AnalysisContext = {
  contractLanguage: 'en',
  userPreferredLanguage: 'en',
  userRole: 'employee',
};

