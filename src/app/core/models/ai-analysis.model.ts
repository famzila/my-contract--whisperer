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
  disclaimer: string;
}

export interface ContractMetadata {
  contractType: string;
  effectiveDate: string | null;
  jurisdiction: string | null;
  parties: {
    employer: Party;
    employee: Party;
  };
}

export interface Party {
  name: string;
  location: string | null;
  position?: string | null;
}

export interface ContractSummary {
  parties: string;
  role: string;
  responsibilities: string[];
  compensation: Compensation;
  benefits: string[];
  termination: Termination;
  restrictions: Restrictions;
}

export interface Compensation {
  baseSalary: number | null;
  bonus: string | null;
  equity: string | null;
  other: string | null;
}

export interface Termination {
  atWill: string | null;
  forCause: string | null;
  severance: string | null;
}

export interface Restrictions {
  confidentiality: string | null;
  nonCompete: string | null;
  nonSolicitation: string | null;
  other: string | null;
}

export type RiskSeverity = 'High' | 'Medium' | 'Low';
export type RiskEmoji = '🚨' | '⚠️' | 'ℹ️';

export interface RiskFlag {
  title: string;
  severity: RiskSeverity;
  emoji: RiskEmoji;
  description: string;
  impact: string; // Explain the potential impact
}

export interface Obligations {
  employer: StructuredObligation[];
  employee: StructuredObligation[];
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

