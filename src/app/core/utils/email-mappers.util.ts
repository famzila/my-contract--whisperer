/**
 * Email Mappers Utilities
 * Map user-friendly options to API parameters
 */

/**
 * Map user-friendly tone to Rewriter API tone
 */
export function mapToneToRewriterAPI(tone: 'formal' | 'neutral' | 'casual'): 'more-formal' | 'as-is' | 'more-casual' {
  switch (tone) {
    case 'formal':
      return 'more-formal';
    case 'neutral':
      return 'as-is';
    case 'casual':
      return 'more-casual';
  }
}

/**
 * Map user-friendly length to Rewriter API length
 */
export function mapLengthToRewriterAPI(length: 'short' | 'medium' | 'long'): 'shorter' | 'as-is' | 'longer' {
  switch (length) {
    case 'short':
      return 'shorter';
    case 'medium':
      return 'as-is';
    case 'long':
      return 'longer';
  }
}
