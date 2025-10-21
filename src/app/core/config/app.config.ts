/**
 * Application configuration
 */
export const AppConfig = {
  /**
   * Enable mock AI responses for faster development
   * 
   * When true:
   * - Uses pre-defined mock contract analysis data
   * - No need for Chrome Canary or Built-in AI flags
   * - Instant results with realistic delay (1.5s)
   * - Perfect for UI development and testing
   * 
   * When false:
   * - Uses real Chrome Built-in AI (Gemini Nano)
   * - Requires Chrome Canary with flags enabled:
   *   - chrome://flags/#prompt-api-for-gemini-nano
   *   - chrome://flags/#summarization-api-for-gemini-nano
   *   - chrome://flags/#writer-api-for-gemini-nano
   *   - chrome://flags/#rewriter-api-for-gemini-nano
   * - Real AI analysis with actual contract text
   * 
   * 💡 Tip: Set to true for development, false for production/demo
   */
  useMockAI: false, // Toggle this to switch between mock and real AI

  /**
   * Analysis Strategy: RxJS Streaming (Default & Only Approach)
   * 
   * ✅ Features:
   * - Schema-based extraction with responseConstraint (100% reliable JSON parsing)
   * - RxJS streaming analysis for optimal UX:
   *   • Metadata priority (must complete first) - Dashboard shows immediately
   *   • Independent section streaming - Summary, Risks, Obligations, Omissions stream as they complete
   *   • No waiting for grouped tiers - each section displays as soon as it's ready
   * - Lucide icons for better visual representation
   * - Per-section skeleton loaders and error handling
   * - Perceived performance: ~1s (instead of 10s wait)
   * - Graceful error handling with user-friendly messages
   * 
   * 🎯 This is now the default and only implementation.
   * Legacy approaches have been removed for code simplicity and maintainability.
   */
};

