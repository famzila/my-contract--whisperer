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
      return true;
    }
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
   * Create a new Prompt API session with optional perspective
   * This will trigger model download if needed (requires user interaction)
   */
  async createSession(
    options?: AILanguageModelCreateOptions & { 
      userRole?: 'employer' | 'employee' | 'client' | 'contractor' | 'landlord' | 'tenant' | 'partner' | 'both_views' | null 
    }
  ): Promise<AILanguageModel> {
    if (!window.LanguageModel) {
      throw new Error('LanguageModel API not available');
    }

    // Get perspective-aware prompt if userRole is provided
    const perspectivePrompt = options?.userRole ? this.buildPerspectivePrompt(options.userRole) : '';

    // Prepare options with system prompt and monitor for download progress
    const createOptions: AILanguageModelCreateOptions = {
      ...options,
      initialPrompts: options?.initialPrompts || [
        {
          role: 'system',
          content: `You are an AI legal explainer that helps non-lawyers understand contracts clearly.

${perspectivePrompt}

**CRITICAL: You must respond ONLY with valid JSON. No markdown, no code blocks, no extra text. Just raw JSON.**

Analyze contracts and respond with this exact JSON schema:

{
  "metadata": {
    "contractType": "Employment Agreement | Service Agreement | Lease Agreement | etc.",
    "effectiveDate": "October 1, 2025 or null",
    "endDate": "September 30, 2026 or null",
    "duration": "12 months or null",
    "autoRenew": true or false or null,
    "jurisdiction": "California, USA or null",
    "parties": {
      "party1": { 
        "name": "First Party Name (e.g., Company, Landlord, Client)", 
        "location": "City, State or null",
        "role": "Employer | Landlord | Client | Partner"
      },
      "party2": { 
        "name": "Second Party Name (e.g., Employee, Tenant, Contractor)", 
        "location": "City, State or null",
        "role": "Employee | Tenant | Contractor | Partner",
        "position": "Job Title or null"
      }
    },
    "detectedLanguage": "en",
    "analyzedForRole": "${options?.userRole || 'employee'}",
    "analyzedInLanguage": "en"
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

    console.log(`\n🤖 [AI] Creating session${options?.userRole ? ` for ${options.userRole} perspective` : ''}...`);
    this.session = await window.LanguageModel.create(createOptions);
    console.log('✅ [AI] Session ready\n');
    
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

    console.log(`📤 [AI] Sending analysis request (${contractText.length} chars)...`);
    const result = await this.prompt(prompt);
    
    console.log(`📥 [AI] Received response (${result.length} chars)`);
    
    // Clean up response in case AI adds markdown code blocks
    let cleanedResult = result.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResult.startsWith('```json')) {
      cleanedResult = cleanedResult.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/```\n?/g, '');
    }
    
    cleanedResult = cleanedResult.trim();
    
    // Only log if JSON parsing fails (for debugging)
    try {
      JSON.parse(cleanedResult);
      console.log('✅ [AI] Valid JSON response received');
    } catch (e) {
      console.error('❌ [AI] Invalid JSON response:');
      console.error(cleanedResult.substring(0, 500) + '...');
    }
    
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

  /**
   * Build perspective-aware system prompt based on user role
   */
  buildPerspectivePrompt(userRole: 'employer' | 'employee' | 'client' | 'contractor' | 'landlord' | 'tenant' | 'partner' | 'both_views' | null): string {
    const basePerspectives = {
      employer: `You are analyzing this contract from the EMPLOYER'S perspective.

Focus on:
- 💼 Employer's obligations, costs, and financial commitments
- 📋 Employee's performance commitments and deliverables
- ⚖️ Termination rights and conditions for employer
- 🔒 IP ownership, confidentiality, and company protections
- 🚨 Risks: Employee underperformance, IP theft, litigation costs

Tailor risks and obligations to help the employer understand what they must provide and how to protect their interests.`,

      employee: `You are analyzing this contract from the EMPLOYEE'S perspective.

Focus on:
- 💰 Compensation fairness and total package value
- 🛡️ Job security (at-will vs. for-cause termination)
- 🚫 Career restrictions (non-compete, non-solicitation, IP assignment)
- ⚖️ Work-life balance (hours, vacation, remote work)
- 🚨 Risks: Underpayment, sudden termination, limited job mobility

Tailor risks and obligations to help the employee understand what they're giving up and how to protect their career.`,

      client: `You are analyzing this contract from the CLIENT'S perspective.

Focus on:
- 📦 Deliverables, scope, and what you're paying for
- 💵 Payment terms, milestones, and total cost
- ⏱️ Timeline, deadlines, and delivery guarantees
- 🔒 Confidentiality and IP ownership rights
- 🚨 Risks: Missed deadlines, poor quality, scope creep

Tailor analysis to help the client understand what they'll receive, payment obligations, and how to enforce quality.`,

      contractor: `You are analyzing this contract from the CONTRACTOR'S/FREELANCER'S perspective.

Focus on:
- 💰 Payment terms, rates, and when you get paid
- 📋 Scope of work and what's expected
- 🔒 IP rights (do you retain any work product?)
- ⚖️ Liability limitations and indemnification
- 🚨 Risks: Non-payment, scope creep, unfair IP assignment

Tailor analysis to help the contractor understand fair compensation, payment timing, and liability exposure.`,

      landlord: `You are analyzing this contract from the LANDLORD'S perspective.

Focus on:
- 💵 Rent payment terms, security deposit, and late fees
- 🔒 Property damage protections and maintenance obligations
- ⚖️ Eviction rights and termination conditions
- 📋 Tenant responsibilities and restrictions
- 🚨 Risks: Non-payment, property damage, difficult eviction

Tailor analysis to help the landlord ensure timely rent payment and property protection.`,

      tenant: `You are analyzing this contract from the TENANT'S perspective.

Focus on:
- 💰 Rent amount, increases, and additional fees
- 🏠 Security deposit return conditions
- 🔧 Maintenance responsibilities (yours vs. landlord's)
- ⚖️ Termination rights and penalties for early exit
- 🚨 Risks: Unfair eviction, withheld deposit, surprise costs

Tailor analysis to help the tenant understand total housing cost and how to get security deposit back.`,

      partner: `You are analyzing this contract from a PARTNER'S perspective.

Focus on:
- 🤝 Equity split and ownership structure
- 💼 Roles, responsibilities, and decision-making authority
- 💰 Profit distribution and capital contributions
- ⚖️ Exit strategy and buyout terms
- 🚨 Risks: Unequal workload, decision deadlocks, unfair exits

Tailor analysis to help the partner understand fairness of equity split and exit options.`,

      both_views: `You are analyzing this contract from BOTH PARTIES' perspectives.

For each major risk and obligation, show how BOTH parties are affected.

In the "impactOn" field for risks, specify "employer" | "employee" | "both".
In obligations, clearly separate into "employer" and "employee" arrays.

Provide balanced analysis showing:
- How each party benefits
- How each party is at risk
- Whether clauses are fair or one-sided`,
    };

    return basePerspectives[userRole || 'employee'];
  }
}
