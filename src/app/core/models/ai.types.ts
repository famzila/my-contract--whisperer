/**
 * TypeScript interfaces for Chrome Built-in AI APIs
 * Reference: https://developer.chrome.com/docs/ai/built-in-apis
 */

// AI Capabilities
export interface AICapabilities {
  available: 'readily' | 'after-download' | 'no' | 'downloadable' | 'downloading';
}

// Prompt API
export interface AILanguageModelCapabilities extends AICapabilities {
  defaultTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

export interface AILanguageModel {
  prompt(input: string, options?: AIPromptOptions): Promise<string>;
  promptStreaming(input: string, options?: AIPromptOptions): ReadableStream;
  destroy(): void;
}

export interface AIPromptOptions {
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  responseConstraint?: object; // JSON Schema for structured output
}

export interface AILanguageModelCreateOptions {
  initialPrompts?: AIPrompt[];
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  monitor?: (monitor: AICreateMonitor) => void;
  expectedInputs?: AIExpectedInput[];
  expectedOutputs?: AIExpectedOutput[];
}

export interface AIExpectedInput {
  type: 'text';
  languages: string[]; // BCP 47 language codes (e.g., ['en', 'ja'])
}

export interface AIExpectedOutput {
  type: 'text';
  languages: string[]; // BCP 47 language codes (e.g., ['ja'])
}

export interface AIPrompt {
  role: 'system' | 'user';
  content: string;
}

export interface AICreateMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void;
  removeEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void;
}

export interface DownloadProgressEvent {
  loaded: number;
  total: number;
}

// Summarizer API
export interface AISummarizerCapabilities extends AICapabilities {
  supportsType?: (type: AISummarizerType) => boolean;
  supportsFormat?: (format: AISummarizerFormat) => boolean;
  supportsLength?: (length: AISummarizerLength) => boolean;
}

export interface AISummarizer {
  summarize(text: string, options?: AISummarizerOptions): Promise<string>;
  summarizeStreaming(text: string, options?: AISummarizerOptions): ReadableStream;
  destroy(): void;
}

export interface AISummarizerOptions {
  type?: AISummarizerType;
  format?: AISummarizerFormat;
  length?: AISummarizerLength;
  signal?: AbortSignal;
  outputLanguage?: string; // e.g., 'en', 'es', 'ja'
}

export type AISummarizerType = 'tldr' | 'key-points' | 'teaser' | 'headline';
export type AISummarizerFormat = 'plain-text' | 'markdown';
export type AISummarizerLength = 'short' | 'medium' | 'long';

// Writer/Rewriter API
export interface AIWriterCapabilities extends AICapabilities {
  supportsSharedContext?: boolean;
}

export interface AIWriter {
  write(input: string, options?: AIWriterOptions): Promise<string>;
  writeStreaming(input: string, options?: AIWriterOptions): ReadableStream;
  destroy(): void;
}

export interface AIRewriter {
  rewrite(input: string, options?: AIRewriterOptions): Promise<string>;
  rewriteStreaming(input: string, options?: AIRewriterOptions): ReadableStream;
  destroy(): void;
}

export interface AIWriterOptions {
  sharedContext?: string;
  tone?: AIWriterTone;
  length?: AIWriterLength;
  signal?: AbortSignal;
}

export interface AIRewriterOptions {
  tone?: AIRewriterTone;
  length?: AIRewriterLength;
  signal?: AbortSignal;
}

export type AIWriterTone = 'formal' | 'neutral' | 'casual';
export type AIWriterLength = 'short' | 'medium' | 'long';

// Rewriter API has different tone and length values
export type AIRewriterTone = 'as-is' | 'more-formal' | 'more-casual';
export type AIRewriterLength = 'as-is' | 'shorter' | 'longer';

// Translator API
export interface TranslationCapabilities {
  canTranslate(sourceLanguage: string, targetLanguage: string): Promise<AICapabilities>;
}

export interface Translator {
  translate(text: string): Promise<string>;
  destroy(): void;
}



export interface AISummarizerCreateOptions {
  type?: AISummarizerType;
  format?: AISummarizerFormat;
  length?: AISummarizerLength;
  sharedContext?: string;
  monitor?: (monitor: AICreateMonitor) => void;
  outputLanguage?: string; // e.g., 'en', 'es', 'ja'
}

export interface AIWriterCreateOptions {
  sharedContext?: string;
  tone?: AIWriterTone;
  length?: AIWriterLength;
}

export interface AIRewriterCreateOptions {
  sharedContext?: string;
  tone?: AIWriterTone;
  length?: AIWriterLength;
}

export interface TranslatorCreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
  monitor?: (m: AICreateMonitor) => void;
}

// Language Detector API
export interface LanguageDetector {
  detect(text: string): Promise<LanguageDetectionResult[]>;
  destroy(): void;
}

export interface LanguageDetectionResult {
  detectedLanguage: string;  // BCP 47 language code (e.g., 'en', 'fr', 'ar')
  confidence: number;        // 0.0 to 1.0
}

export interface LanguageDetectorCreateOptions {
  monitor?: (m: AICreateMonitor) => void;
}

// Extend Window interface for Chrome Built-in AI APIs
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
      availability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
      create(options?: AISummarizerCreateOptions): Promise<AISummarizer>;
    };
    
    // Translator API (new format)
    Translator?: {
      availability(options: TranslatorCreateOptions): Promise<AICapabilities>;
      create(options: TranslatorCreateOptions): Promise<Translator>;
    };
    
    // Language Detector API
    LanguageDetector?: {
      availability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
      create(options?: LanguageDetectorCreateOptions): Promise<LanguageDetector>;
    };
  }
}

