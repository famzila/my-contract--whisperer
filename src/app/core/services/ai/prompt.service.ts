import { Injectable } from '@angular/core';
import type {
  AILanguageModel,
  AILanguageModelCreateOptions,
  AIPromptOptions,
} from '../../models/ai.types';

/**
 * Service for Chrome Built-in Prompt API (Gemini Nano)
 * Handles Q&A, clause extraction, and general language model interactions
 * 
 * Reference: https://developer.chrome.com/docs/ai/prompt-api
 */
@Injectable({
  providedIn: 'root',
})
export class PromptService {
  private session: AILanguageModel | null = null;

  /**
   * Check if Prompt API is available
   */
  async isAvailable(): Promise<boolean> {
    if ('LanguageModel' in window) {
      console.log('✅ LanguageModel API found');
      return true;
    }

    console.warn('❌ Prompt API not found');
    return false;
  }

  /**
   * Get Prompt API parameters
   */
  async getParams(): Promise<{
    defaultTemperature: number;
    maxTemperature: number;
    defaultTopK: number;
    maxTopK: number;
  }> {
    if ('LanguageModel' in window && window.LanguageModel) {
      return await window.LanguageModel.params();
    }

    // Fallback defaults if API not available
    return {
      defaultTemperature: 1,
      maxTemperature: 2,
      defaultTopK: 3,
      maxTopK: 128,
    };
  }

  /**
   * Create a new Prompt API session
   * This will trigger model download if needed (requires user interaction)
   */
  async createSession(
    options?: AILanguageModelCreateOptions
  ): Promise<AILanguageModel> {
    if (!window.LanguageModel) {
      throw new Error('LanguageModel API not available');
    }

    // Prepare options with system prompt and monitor for download progress
    const createOptions: AILanguageModelCreateOptions = {
      ...options,
      initialPrompts: [
        {
          role: 'system',
          content: `You are an AI legal explainer that helps non-lawyers understand contracts clearly.

**CRITICAL: You must respond ONLY with valid JSON. No markdown, no code blocks, no extra text. Just raw JSON.**

Analyze contracts and respond with this exact JSON schema:

{
  "metadata": {
    "contractType": "Employment Agreement | Service Agreement | etc.",
    "effectiveDate": "October 1, 2025 or null",
    "jurisdiction": "California, USA or null",
    "parties": {
      "employer": { 
        "name": "Company Name", 
        "location": "City, State or null"
      },
      "employee": { 
        "name": "Person Name", 
        "location": "City, State or null",
        "position": "Job Title or null"
      }
    }
  },
  "summary": {
    "parties": "string describing both parties and their roles",
    "role": "string describing the relationship type",
    "responsibilities": ["array", "of", "key", "duties"],
    "compensation": {
      "baseSalary": number or null,
      "bonus": "string description or null",
      "equity": "string description or null",
      "other": "string for other compensation or null"
    },
    "benefits": ["array", "of", "benefits"],
    "termination": {
      "atWill": "string describing at-will terms or null",
      "forCause": "string describing cause termination or null",
      "severance": "string describing severance or null"
    },
    "restrictions": {
      "confidentiality": "string or null",
      "nonCompete": "string with duration/scope or null",
      "nonSolicitation": "string or null",
      "other": "string for other restrictions or null"
    }
  },
  "risks": [
    {
      "title": "Risk Name",
      "severity": "High | Medium | Low",
      "emoji": "🚨 | ⚠️ | ℹ️",
      "description": "What this clause says in plain English",
      "impact": "Specific negative consequences for the person signing"
    }
  ],
  "obligations": {
    "employer": [
      {
        "duty": "Short description",
        "amount": number or null,
        "frequency": "bi-weekly | monthly | quarterly | null",
        "startDate": "date or null",
        "duration": "duration or null",
        "scope": "additional details or null"
      }
    ],
    "employee": [
      {
        "duty": "Short description",
        "scope": "Full-time | Part-time | etc or null"
      }
    ]
  },
  "omissions": [
    {
      "item": "What is missing",
      "impact": "Why this absence could be a problem",
      "priority": "High | Medium | Low"
    }
  ],
  "questions": [
    "Question 1 the user should ask?",
    "Question 2 the user should ask?",
    "Question 3 the user should ask?"
  ],
  "disclaimer": "I am an AI assistant, not a lawyer. This information is for educational purposes only. Consult a qualified attorney for legal advice."
}

Rules:
1. Use plain English, no legalese
2. Be specific with numbers, dates, amounts
3. If something isn't in the contract, use null or empty array
4. For risk severity: "High" = 🚨, "Medium" = ⚠️, "Low" = ℹ️
5. Prioritize risks: High risks FIRST (could significantly harm), then Medium, then Low
6. Structure obligations as objects with duty, amount, frequency, scope, etc.
7. Structure omissions as objects with item, impact, and priority
8. Focus on protecting the person signing
9. Output ONLY valid JSON, nothing else`,
        },
      ],
      monitor: (m) => {
        m.addEventListener('downloadprogress', (e) => {
          const percent = (e.loaded * 100).toFixed(1);
          console.log(`📥 Downloading Gemini Nano model: ${percent}%`);
        });
      },
    };

    console.log('🚀 Creating LanguageModel session with system prompt...');
    this.session = await window.LanguageModel.create(createOptions);
    console.log('✅ LanguageModel session created successfully');
    
    return this.session;
  }

  /**
   * Send a prompt and get response
   */
  async prompt(input: string, options?: AIPromptOptions): Promise<string> {
    if (!this.session) {
      await this.createSession();
    }

    if (!this.session) {
      throw new Error('Failed to create session');
    }

    return await this.session.prompt(input, options);
  }

  /**
   * Send a prompt and get streaming response
   */
  promptStreaming(input: string, options?: AIPromptOptions): ReadableStream {
    if (!this.session) {
      throw new Error('Session not initialized. Call createSession() first.');
    }

    return this.session.promptStreaming(input, options);
  }

  /**
   * Extract clauses from contract text with comprehensive analysis
   * Returns JSON string that can be parsed into AIAnalysisResponse
   */
  async extractClauses(contractText: string): Promise<string> {
    const prompt = `Analyze this contract and respond with ONLY valid JSON following the schema provided in your system prompt.

Contract to analyze:
${contractText}

Remember: Output ONLY the JSON object, no markdown, no code blocks, no additional text.`;

    console.log('📤 Sending contract analysis request...');
    const result = await this.prompt(prompt);
    
    console.log('📥 Raw AI Response:');
    console.log('═'.repeat(80));
    console.log(result);
    console.log('═'.repeat(80));
    
    // Clean up response in case AI adds markdown code blocks
    let cleanedResult = result.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResult.startsWith('```json')) {
      cleanedResult = cleanedResult.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/```\n?/g, '');
    }
    
    cleanedResult = cleanedResult.trim();
    
    console.log('🧹 Cleaned JSON:');
    console.log('═'.repeat(80));
    console.log(cleanedResult);
    console.log('═'.repeat(80));
    
    return cleanedResult;
  }

  /**
   * Ask a question about the contract
   */
  async askQuestion(contractText: string, question: string): Promise<string> {
    const prompt = `Based on the following contract, answer this question: ${question}

Contract:
${contractText}`;

    return await this.prompt(prompt);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}
