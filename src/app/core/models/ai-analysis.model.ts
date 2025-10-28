/**
 * Analysis Context Interface
 * Contextual information passed to AI for perspective-aware analysis
 */

// Import types from ai.types.ts
import type {
  AIAvailabilityStatus,
  AISummarizerType,
  AISummarizerFormat,
  AISummarizerLength,
  AIWriterTone,
  AIWriterLength,
  AIRewriterTone,
  AIRewriterLength,
  RiskSeverity,
  UserRole
} from './ai.types';

// Import types from analysis-schemas.ts for use in this file
import type {
  ContractMetadata,
  ContractSummary,
  RisksAnalysis,
  ObligationsAnalysis,
  OmissionsAndQuestions,
  ContractValidationResult
} from '../schemas/analysis-schemas';

// Re-export types from analysis-schemas.ts to maintain backward compatibility
export type {
  ContractMetadata,
  ContractSummary,
  RisksAnalysis,
  ObligationsAnalysis,
  OmissionsAndQuestions,
  ContractValidationResult
} from '../schemas/analysis-schemas';

// Re-export UserRole for backward compatibility
export type { UserRole };

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
 * Analysis section types for streaming
 */
export type AnalysisSection = 'metadata' | 'summary' | 'risks' | 'obligations' | 'omissionsAndQuestions' | 'complete';

/**
 * Analysis result data types
 */
export type AnalysisData = 
  | ContractMetadata
  | ContractSummary
  | RiskFlag[]
  | Obligations
  | Omission[]
  | Record<string, unknown>  // For merged objects and flexible data
  | string  // For quickTake and other string results
  | null;

/**
 * Analysis streaming result interface
 */
export interface AnalysisStreamingResult {
  section: AnalysisSection;
  data: AnalysisData;
  progress: number;
  retryCount?: number;
  isRetrying?: boolean;
}

/**
 * Party information detected from contract (alias for backward compatibility)
 */
export type DetectedParty = Party;

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

// ============================================================================
// Chrome Built-in AI API Interfaces
// ============================================================================


/**
 * Base AI Capabilities
 */
export interface AICapabilities {
  available: 'readily' | 'after-download' | 'no' | 'downloadable' | 'downloading';
}

/**
 * Common Create Options
 */
export interface BaseCreateOptions {
  signal?: AbortSignal;
  monitor?: (monitor: AICreateMonitor) => void;
}

/**
 * AI Create Monitor for download progress
 */
export interface AICreateMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void;
  removeEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void;
}

/**
 * Download Progress Event
 */
export interface DownloadProgressEvent {
  loaded: number;
  total: number;
}

// ============================================================================
// Prompt / Language Model API
// ============================================================================

/**
 * Language Model Capabilities
 */
export interface AILanguageModelCapabilities extends AICapabilities {
  defaultTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

/**
 * Language Model Instance
 */
export interface AILanguageModel {
  prompt(input: string, options?: AIPromptOptions): Promise<string>;
  promptStreaming(input: string, options?: AIPromptOptions): ReadableStream;
  destroy(): void;
}

/**
 * Prompt API Options
 */
export interface AIPromptOptions {
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  responseConstraint?: object; // JSON Schema for structured output
}

/**
 * Language Model Create Options
 */
export interface AILanguageModelCreateOptions extends BaseCreateOptions {
  initialPrompts?: AIPrompt[];
  temperature?: number;
  topK?: number;
  expectedInputs?: AIExpectedInputOutput[];
  expectedOutputs?: AIExpectedInputOutput[];
}

/**
 * Prompt Message
 */
export interface AIPrompt {
  role: 'system' | 'user';
  content: string;
}

/**
 * Expected Input/Output (unified interface)
 */
export interface AIExpectedInputOutput {
  type: 'text';
  languages: string[]; // BCP 47 language codes (e.g., ['en', 'ja'])
}

// Legacy aliases for backward compatibility
export type AIExpectedInput = AIExpectedInputOutput;
export type AIExpectedOutput = AIExpectedInputOutput;


// ============================================================================
// Summarizer API
// ============================================================================

/**
 * Summarizer Capabilities
 */
export interface AISummarizerCapabilities extends AICapabilities {
  supportsType?: (type: AISummarizerType) => boolean;
  supportsFormat?: (format: AISummarizerFormat) => boolean;
  supportsLength?: (length: AISummarizerLength) => boolean;
}

/**
 * Summarizer Instance
 */
export interface AISummarizer {
  summarize(text: string, options?: AISummarizerOptions): Promise<string>;
  summarizeStreaming(text: string, options?: AISummarizerOptions): ReadableStream;
  destroy(): void;
}

/**
 * Summarizer Options
 */
export interface AISummarizerOptions {
  type?: AISummarizerType;
  format?: AISummarizerFormat;
  length?: AISummarizerLength;
  signal?: AbortSignal;
  outputLanguage?: string; // e.g., 'en', 'es', 'ja'
}

/**
 * Summarizer Create Options
 */
export interface AISummarizerCreateOptions extends BaseCreateOptions {
  type?: AISummarizerType;
  format?: AISummarizerFormat;
  length?: AISummarizerLength;
  sharedContext?: string;
  outputLanguage?: string;
}


// ============================================================================
// Writer/Rewriter API
// ============================================================================

/**
 * Writer Capabilities
 */
export interface AIWriterCapabilities extends AICapabilities {
  supportsSharedContext?: boolean;
}

/**
 * Writer Instance
 */
export interface AIWriter {
  write(input: string, options?: AIWriterOptions): Promise<string>;
  writeStreaming(input: string, options?: AIWriterOptions): ReadableStream;
  destroy(): void;
}

/**
 * Rewriter Instance
 */
export interface AIRewriter {
  rewrite(input: string, options?: AIRewriterOptions): Promise<string>;
  rewriteStreaming(input: string, options?: AIRewriterOptions): ReadableStream;
  destroy(): void;
}

/**
 * Writer Options
 */
export interface AIWriterOptions {
  sharedContext?: string;
  tone?: AIWriterTone;
  length?: AIWriterLength;
  signal?: AbortSignal;
  outputLanguage?: string; // e.g., 'en', 'es', 'ja'
}

/**
 * Rewriter Options
 */
export interface AIRewriterOptions {
  tone?: AIRewriterTone;
  length?: AIRewriterLength;
  signal?: AbortSignal;
  outputLanguage?: string; // e.g., 'en', 'es', 'ja'
}

/**
 * Writer/Rewriter Create Options
 */
export interface AIWriterCreateOptions extends BaseCreateOptions {
  sharedContext?: string;
  tone?: AIWriterTone;
  length?: AIWriterLength;
  outputLanguage?: string; // e.g., 'en', 'es', 'ja'
}

export interface AIRewriterCreateOptions extends BaseCreateOptions {
  sharedContext?: string;
  tone?: AIRewriterTone;
  length?: AIRewriterLength;
  outputLanguage?: string; // e.g., 'en', 'es', 'ja'
}


// ============================================================================
// Translator API
// ============================================================================

/**
 * Translation Capabilities
 */
export interface TranslationCapabilities {
  canTranslate(sourceLanguage: string, targetLanguage: string): Promise<AICapabilities>;
}

/**
 * Translator Instance
 */
export interface Translator {
  translate(text: string): Promise<string>;
  destroy(): void;
}

/**
 * Translator Create Options
 */
export interface TranslatorCreateOptions extends BaseCreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

// ============================================================================
// Language Detector API
// ============================================================================

/**
 * Language Detector Instance
 */
export interface LanguageDetector {
  detect(text: string): Promise<LanguageDetectionResult[]>;
  destroy(): void;
}

/**
 * Language Detection Result
 */
export interface LanguageDetectionResult {
  detectedLanguage: string;  // BCP 47 language code (e.g., 'en', 'fr', 'ar')
  confidence: number;        // 0.0 to 1.0
}

/**
 * Language Detector Create Options
 */
export interface LanguageDetectorCreateOptions extends BaseCreateOptions {}

// ============================================================================
// Window Interface Extension
// ============================================================================

declare global {
  interface Window {
    // Chrome Built-in AI APIs (Chrome Canary 131+)
    LanguageModel?: {
      params(): Promise<{
        defaultTemperature: number;
        maxTemperature: number;
        defaultTopK: number;
        maxTopK: number;
      }>;
      create(options?: AILanguageModelCreateOptions): Promise<AILanguageModel>;
    };
    
    Summarizer?: {
      availability(): Promise<AIAvailabilityStatus>;
      create(options?: AISummarizerCreateOptions): Promise<AISummarizer>;
    };
    
    Writer?: {
      availability(): Promise<AIAvailabilityStatus>;
      create(options?: AIWriterCreateOptions): Promise<AIWriter>;
    };
    
    Rewriter?: {
      availability(): Promise<AIAvailabilityStatus>;
      create(options?: AIRewriterCreateOptions): Promise<AIRewriter>;
    };
    
    Translator?: {
      availability(options: TranslatorCreateOptions): Promise<AICapabilities>;
      create(options: TranslatorCreateOptions): Promise<Translator>;
    };
    
    LanguageDetector?: {
      availability(): Promise<AIAvailabilityStatus>;
      create(options?: LanguageDetectorCreateOptions): Promise<LanguageDetector>;
    };
  }
}

