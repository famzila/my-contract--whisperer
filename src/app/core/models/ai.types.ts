/**
 * TypeScript types for Chrome Built-in AI APIs
 * Reference: https://developer.chrome.com/docs/ai/built-in-apis
 * 
 * This file contains only types (not interfaces).
 * All interfaces are defined in ai-analysis.model.ts
 */

// ============================================================================
// Additional Types (not interfaces)
// ============================================================================

/**
 * AI Availability Status
 */
export type AIAvailabilityStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable';

/**
 * Summarizer Type
 */
export type AISummarizerType = 'tldr' | 'key-points' | 'teaser' | 'headline';

/**
 * Summarizer Format
 */
export type AISummarizerFormat = 'plain-text' | 'markdown';

/**
 * Summarizer Length
 */
export type AISummarizerLength = 'short' | 'medium' | 'long';

/**
 * Writer Tone
 */
export type AIWriterTone = 'formal' | 'neutral' | 'casual';

/**
 * Writer Length
 */
export type AIWriterLength = 'short' | 'medium' | 'long';

/**
 * Rewriter Tone
 */
export type AIRewriterTone = 'as-is' | 'more-formal' | 'more-casual';

/**
 * Rewriter Length
 */
export type AIRewriterLength = 'as-is' | 'shorter' | 'longer';

