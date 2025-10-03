/**
 * Contract data model
 */
export interface Contract {
  id: string;
  text: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
  wordCount: number;
  estimatedReadingTime: number;
}

/**
 * Contract analysis result
 * Now includes structured data from AI analysis
 */
export interface ContractAnalysis {
  id: string;  // Changed from contractId to match usage
  summary: string | any;  // Can be string OR AIAnalysisResponse object
  clauses: ContractClause[];
  riskScore: number;
  obligations: Obligation[];
  omissions?: Array<{ item: string; impact: string; priority: 'High' | 'Medium' | 'Low'; }>;  // NEW: What's missing (matches Omission interface)
  questions?: string[];  // NEW: Questions to ask
  analyzedAt: Date;
  
  // NEW: Structured metadata from AI
  metadata?: any;  // ContractMetadata from AIAnalysisResponse
  contextWarnings?: Array<{ type: string; severity: string; message: string; }>;  // NEW: Context warnings
  disclaimer?: string;  // NEW: Legal disclaimer
}

/**
 * Contract clause
 */
export interface ContractClause {
  id: string;
  type: ClauseType;
  content: string;
  plainLanguage: string;
  riskLevel: RiskLevel;
  confidence: number;
  startPosition?: number;
  endPosition?: number;
}

/**
 * Clause types
 */
export type ClauseType =
  | 'termination'
  | 'payment'
  | 'renewal'
  | 'liability'
  | 'governing-law'
  | 'confidentiality'
  | 'indemnity'
  | 'warranty'
  | 'dispute-resolution'
  | 'intellectual-property'
  | 'other';

/**
 * Risk levels
 */
export type RiskLevel = 'high' | 'medium' | 'low' | 'safe';

/**
 * User obligation extracted from contract
 */
export interface Obligation {
  id: string;
  description: string;
  party: 'your' | 'their';  // Whose obligation is it?
  dueDate?: Date;
  recurring?: boolean;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Contract comparison result
 */
export interface ContractComparison {
  contract1Id: string;
  contract2Id: string;
  differences: ContractDifference[];
  comparedAt: Date;
}

/**
 * Contract difference
 */
export interface ContractDifference {
  id: string;
  category: string;
  contract1Text: string;
  contract2Text: string;
  severity: 'major' | 'minor';
  description: string;
}



