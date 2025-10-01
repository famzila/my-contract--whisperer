/**
 * TypeScript interfaces for Chrome Built-in AI APIs
 * Reference: https://developer.chrome.com/docs/ai/built-in-apis
 */

// AI Capabilities
export interface AICapabilities {
  available: 'readily' | 'after-download' | 'no';
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
}

export type AISummarizerType = 'tl;dr' | 'key-points' | 'teaser' | 'headline';
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
  tone?: AIWriterTone;
  length?: AIWriterLength;
  signal?: AbortSignal;
}

export type AIWriterTone = 'formal' | 'neutral' | 'casual';
export type AIWriterLength = 'short' | 'medium' | 'long';

// Translator API
export interface TranslationCapabilities {
  canTranslate(sourceLanguage: string, targetLanguage: string): Promise<AICapabilities>;
}

export interface Translator {
  translate(text: string): Promise<string>;
  destroy(): void;
}

// Global AI interfaces
export interface AI {
  languageModel: {
    capabilities(): Promise<AILanguageModelCapabilities>;
    create(options?: AILanguageModelCreateOptions): Promise<AILanguageModel>;
  };
  summarizer: {
    capabilities(): Promise<AISummarizerCapabilities>;
    create(options?: AISummarizerCreateOptions): Promise<AISummarizer>;
  };
  writer: {
    capabilities(): Promise<AIWriterCapabilities>;
    create(options?: AIWriterCreateOptions): Promise<AIWriter>;
  };
  rewriter: {
    capabilities(): Promise<AIWriterCapabilities>;
    create(options?: AIRewriterCreateOptions): Promise<AIRewriter>;
  };
}

export interface AILanguageModelCreateOptions {
  temperature?: number;
  topK?: number;
  systemPrompt?: string;
}

export interface AISummarizerCreateOptions {
  type?: AISummarizerType;
  format?: AISummarizerFormat;
  length?: AISummarizerLength;
  sharedContext?: string;
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

export interface Translation {
  canTranslate(sourceLanguage: string, targetLanguage: string): Promise<AICapabilities>;
  createTranslator(options: TranslatorCreateOptions): Promise<Translator>;
}

export interface TranslatorCreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

// Extend Window interface
declare global {
  interface Window {
    ai?: AI;
    translation?: Translation;
  }
}

