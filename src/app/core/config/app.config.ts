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
   * Analysis Strategy: Progressive Schema-Based (Default & Only Approach)
   * 
   * ✅ Features:
   * - Schema-based extraction with responseConstraint (100% reliable JSON parsing)
   * - Three-tier progressive loading for optimal UX:
   *   • Tier 1: Metadata (~1s) - Dashboard shows immediately
   *   • Tier 2: Summary + Risks (parallel ~2-3s) - High priority content
   *   • Tier 3: Obligations + Omissions + Questions (parallel ~2-3s) - Supporting details
   * - Lucide icons for better visual representation
   * - Per-section skeleton loaders and error handling
   * - Perceived performance: ~1s (instead of 10s wait)
   * 
   * 🎯 This is now the default and only implementation.
   * Legacy approaches have been removed for code simplicity and maintainability.
   */
};

