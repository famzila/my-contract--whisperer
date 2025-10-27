/**
 * Analysis Context Interface
 * Contextual information passed to AI for perspective-aware analysis
 */
export interface AnalysisContext {
  // Language context
  contractLanguage: string;           // Detected contract language (e.g., "en", "fr")
  userPreferredLanguage: string;      // User's app UI language preference (e.g., "ar", "en")
  analyzedInLanguage: string;         // Language for analysis output - user's choice (e.g., "ar", "en")
  
  // Party context
  userRole: UserRole;                 // Which party the user represents
  detectedParties?: {
    party1?: Party;
    party2?: Party;
  };
  
  // Additional context (for future use)
  userCountry?: string;               // User's jurisdiction
  contractJurisdiction?: string;      // Contract's governing jurisdiction
}

/**
 * User roles for perspective-aware analysis
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
 * Unified party information interface
 * Used for both party detection and contract metadata
 */
export interface Party {
  name: string;
  location?: string | null;          // Optional location (can be null or undefined)
  role?: string;                     // Party's role (Employer, Employee, Landlord, Tenant, etc.)
  position?: string | null;          // Job position or title (for employment contracts)
}

/**
 * Party information detected from contract (alias for backward compatibility)
 */
export type DetectedParty = Party;

/**
 * Party detection result
 */
export interface PartyDetectionResult {
  confidence: 'high' | 'medium' | 'low';
  parties: {
    party1: DetectedParty;
    party2: DetectedParty;
  } | null;
  contractType: 'bilateral' | 'multilateral' | 'unilateral';
}

/**
 * Structured AI analysis response matching the JSON schema
 */
export interface AIAnalysisResponse {
  metadata: ContractMetadata;
  summary: ContractSummary;
  risks: RiskFlag[];
  obligations: Obligations;
  omissions: Omission[];
  questions: string[];
  contextWarnings?: ContextWarning[];  // Jurisdiction/cross-border warnings
  disclaimer: string;
}

/**
 * Context-aware warnings (cross-border, jurisdiction-specific)
 */
export interface ContextWarning {
  type: 'cross-border' | 'jurisdiction' | 'industry' | 'compliance';
  severity: 'High' | 'Medium' | 'Low';
  message: string;
}

export interface ContractMetadata {
  contractType: string;
  effectiveDate: string | null;
  endDate: string | null;           // 👈 Contract expiration/termination date
  duration: string | null;           // 👈 Human-readable duration (e.g., "12 months")
  autoRenew: boolean | null;         // 👈 Does contract auto-renew?
  jurisdiction: string | null;
  parties: {
    party1: Party;
    party2: Party;
    // Legacy support (deprecated)
    employer?: Party;
    employee?: Party;
  };
  
  // Context fields (for perspective-aware analysis)
  detectedLanguage?: string;         // 👈 Contract's original language
  analyzedForRole?: string;          // 👈 Which role analysis is tailored for
  analyzedInLanguage?: string;       // 👈 Language of analysis output
}


export interface ContractSummary {
  // Quick overview from Summarizer API (optional)
  quickTake?: string;
  
  // Structured details from Prompt API (NO duplicates with metadata)
  summary: {
    keyResponsibilities: string[]; // Renamed from 'responsibilities'
    compensation: {
      baseSalary?: number | null;
      bonus?: string | null;
      equity?: string | null;
      other?: string | null;
    };
    benefits: string[];
    termination: {
      atWill?: string | null;
      forCause?: string | null;
      severance?: string | null;
      noticeRequired?: string | null; // Important detail
    };
    restrictions: {
      confidentiality?: string | null;
      nonCompete?: string | null;
      nonSolicitation?: string | null;
      intellectualProperty?: string | null; // IP assignment
      other?: string | null;
    };
  };
  
  // Perspective-aware fields (for UI display)
  fromYourPerspective?: string;  // Summary from selected perspective
  keyBenefits?: string[];        // Key benefits from selected perspective
  keyConcerns?: string[];        // Key concerns from selected perspective
}

export type RiskSeverity = 'High' | 'Medium' | 'Low';

export interface RiskFlag {
  title: string;
  severity: RiskSeverity;
  icon?: string;                     // Lucide icon name (schema-based format)
  description: string;
  impact: string;                    // Explain the potential impact
  impactOn?: string;                 // Who is affected (employer/employee)
  contextWarning?: string | null;    // Jurisdiction-specific warning
}

export interface Obligations {
  party1: StructuredObligation[];  // First party obligations
  party2: StructuredObligation[];  // Second party obligations
  // Future: parties: Record<string, StructuredObligation[]> for multi-party
}

export interface StructuredObligation {
  duty: string;
  amount?: number | null;
  frequency?: string | null;
  startDate?: string | null;
  duration?: string | null;
  scope?: string | null;
}

export interface Omission {
  item: string;
  impact: string;
  priority: 'High' | 'Medium' | 'Low';
}

/**
 * Perspective context for summary display
 */
export interface PerspectiveContext {
  icon: any;
  titleKey: string;
  messageKey: string;
}

