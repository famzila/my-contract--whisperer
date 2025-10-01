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
 */
export interface ContractAnalysis {
  contractId: string;
  summary: string;
  clauses: ContractClause[];
  riskScore: number;
  obligations: Obligation[];
  analyzedAt: Date;
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
  dueDate?: Date;
  recurring: boolean;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
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

