import { Injectable } from '@angular/core';
import { Observable, from, defer } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import type {
  AILanguageModel,
  AILanguageModelCreateOptions,
  AIPromptOptions,
} from '../../models/ai.types';
import * as Schemas from '../../schemas/analysis-schemas';

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

**CRITICAL INSTRUCTIONS:**
1. You must respond ONLY with valid JSON
2. NO markdown code blocks (no \`\`\`json)
3. NO extra text or explanations
4. Use null for missing values (not "null" or "or null")
5. Use actual boolean values: true or false (not "true or false")
6. Just raw, parseable JSON

Analyze contracts and respond with this EXACT JSON structure:

{
  "metadata": {
    "contractType": "Employment Agreement",
    "effectiveDate": "October 1, 2025",
    "endDate": "September 30, 2026",
    "duration": "12 months",
    "autoRenew": true,
    "jurisdiction": "California, USA",
    "parties": {
      "party1": { 
        "name": "Acme Corporation", 
        "location": "San Francisco, CA",
        "role": "Employer"
      },
      "party2": { 
        "name": "John Smith", 
        "location": "San Francisco, CA",
        "role": "Employee",
        "position": "Senior Software Engineer"
      }
    },
    "detectedLanguage": "en",
    "analyzedForRole": "${options?.userRole || 'employee'}",
    "analyzedInLanguage": "en"
  },
  "summary": {
    "parties": "Acme Corporation (employer) and John Smith (employee)",
    "role": "Full-time employment",
    "responsibilities": ["Develop software", "Code reviews", "Team collaboration"],
    "compensation": {
      "baseSalary": 150000,
      "bonus": "Annual performance bonus up to 20%",
      "equity": "100,000 stock options vesting over 4 years",
      "other": null
    },
    "benefits": ["Health insurance", "401k matching", "Unlimited PTO"],
    "termination": {
      "atWill": "Either party may terminate with 2 weeks notice",
      "forCause": "Immediate termination for material breach or misconduct",
      "severance": "4 weeks base salary"
    },
    "restrictions": {
      "confidentiality": "Must protect company confidential information indefinitely",
      "nonCompete": "12 months within 50-mile radius",
      "nonSolicitation": "Cannot solicit employees or clients for 18 months",
      "other": "All work product belongs to company"
    }
  },
  "risks": [
    {
      "title": "At-Will Employment",
      "severity": "Medium",
      "emoji": "⚠️",
      "description": "Company can terminate employment at any time for any reason",
      "impact": "No job security, could lose income suddenly"
    }
  ],
  "obligations": {
    "employer": [
      {
        "duty": "Pay Salary",
        "amount": 150000,
        "frequency": "bi-weekly",
        "startDate": "October 1, 2025",
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
        // Track download progress only on first download (not on cached loads)
        m.addEventListener('downloadprogress', (e) => {
          const percent = (e.loaded * 100).toFixed(1);
          // Only log significant progress milestones to avoid log spam
          if (e.loaded === 0 || e.loaded === 1 || e.loaded % 0.25 === 0) {
            console.log(`📥 [AI Model] Loading: ${percent}%`);
          }
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

  // ============================================================================
  // NEW: Schema-based extraction methods
  // ============================================================================

  /**
   * Generic method to prompt with schema constraint
   * Uses responseConstraint for structured output
   */
  private async promptWithSchema<T>(
    prompt: string,
    schema: object
  ): Promise<T> {
    if (!this.session) {
      throw new Error('Session not initialized. Call createSession() first.');
    }

    const resultString = await this.session.prompt(prompt, {
      responseConstraint: schema,
    });

    const parsed = JSON.parse(resultString);
    return parsed as T;
  }

  /**
   * 1. Extract metadata with schema
   */
  async extractMetadata(
    contractText: string,
    userRole?: string
  ): Promise<Schemas.ContractMetadata> {
    const roleContext = userRole ? `\n\nAnalyze this contract from the perspective of: ${userRole}` : '';
    
    const prompt = `Extract basic metadata from this contract.

Contract:
${contractText}${roleContext}

Instructions:
- Identify the contract type (e.g., "Employment Agreement", "NDA", "Lease Agreement")
- Extract effective date and end date in ISO format (YYYY-MM-DD) or null if not specified
- Calculate duration if dates are provided
- Identify if the contract auto-renews (true/false/null)
- Extract governing jurisdiction
- Identify both parties with their names, locations, and roles
- Detect the contract language (e.g., "en", "es", "fr", "ja")
- Set analyzedForRole to the user's role: ${userRole || 'employee'}

Return the metadata in the exact JSON structure specified in the schema.`;

    return this.promptWithSchema<Schemas.ContractMetadata>(
      prompt,
      Schemas.METADATA_SCHEMA
    );
  }

  /**
   * 2. Extract risks with schema
   */
  async extractRisks(
    contractText: string
  ): Promise<Schemas.RisksAnalysis> {
    const prompt = `Analyze all potential risks in this contract.

Contract:
${contractText}

Instructions:
- Identify ALL risks that could negatively impact the signing party
- Prioritize by severity: "high" (could cause significant harm), "medium" (moderate concern), "low" (minor issue)
- For each risk, provide a clear title, description, and concrete impact
- Use appropriate icon: "alert-triangle" for high, "alert-circle" for medium, "info" for low
- Focus on practical, real-world consequences
- Order risks from highest to lowest severity

Return the risks in the exact JSON structure specified in the schema.`;

    return this.promptWithSchema<Schemas.RisksAnalysis>(
      prompt,
      Schemas.RISKS_SCHEMA
    );
  }

  /**
   * 3. Extract obligations with schema
   */
  async extractObligations(
    contractText: string
  ): Promise<Schemas.ObligationsAnalysis> {
    const prompt = `Extract all obligations from this contract and structure them by party.

Contract:
${contractText}

Instructions:
- Identify ALL obligations for each party (employer/company and employee/contractor)
- For monetary obligations, include the amount as a number
- Include frequency (e.g., "monthly", "bi-weekly", "annually") when applicable
- Include start dates and duration when specified
- Use the "scope" field for additional context or conditions
- If a field is not applicable, use null
- Keep descriptions clear and concise

Return the obligations in the exact JSON structure specified in the schema.`;

    return this.promptWithSchema<Schemas.ObligationsAnalysis>(
      prompt,
      Schemas.OBLIGATIONS_SCHEMA
    );
  }

  /**
   * 4. Extract omissions and questions with schema
   */
  async extractOmissionsAndQuestions(
    contractText: string
  ): Promise<Schemas.OmissionsAndQuestions> {
    const prompt = `Analyze this contract for missing clauses and generate clarifying questions.

Contract:
${contractText}

Instructions:
- Identify important clauses or details that are missing from the contract
- For each omission, explain why its absence could be problematic
- Prioritize omissions: "high" (critical missing clause), "medium" (important but not critical), "low" (nice to have)
- Generate 5-8 specific, actionable questions the signing party should ask
- Questions should seek clarification on ambiguous terms, missing details, or potential risks
- Make questions practical and easy to ask

Return the omissions and questions in the exact JSON structure specified in the schema.`;

    return this.promptWithSchema<Schemas.OmissionsAndQuestions>(
      prompt,
      Schemas.OMISSIONS_QUESTIONS_SCHEMA
    );
  }

  /**
   * 5. Extract summary with schema
   */
  async extractSummary(
    contractText: string
  ): Promise<Schemas.ContractSummary> {
    const prompt = `Generate a comprehensive, easy-to-understand summary of this contract.

Contract:
${contractText}

Instructions:
- Describe the parties and their relationship
- List key responsibilities of the signing party
- Detail all compensation (salary, bonuses, equity, other benefits)
- Explain termination conditions (at-will, for-cause, severance)
- Identify any restrictions (confidentiality, non-compete, non-solicitation, IP assignment)
- Use clear, plain language - avoid legal jargon
- For monetary amounts, use numbers (e.g., 150000, not "150k" or "$150,000")
- Use null for fields that don't apply or aren't specified in the contract

Return the summary in the exact JSON structure specified in the schema.`;

    return this.promptWithSchema<Schemas.ContractSummary>(
      prompt,
      Schemas.SUMMARY_SCHEMA
    );
  }

  /**
   * ========================================
   * RxJS Observable versions for streaming
   * ========================================
   */

  /**
   * Extract metadata as Observable
   */
  extractMetadata$(contractText: string, userRole?: string): Observable<Schemas.ContractMetadata> {
    return defer(() => from(this.extractMetadata(contractText, userRole)));
  }

  /**
   * Extract risks as Observable
   */
  extractRisks$(contractText: string): Observable<Schemas.RisksAnalysis> {
    return defer(() => from(this.extractRisks(contractText)));
  }

  /**
   * Extract obligations as Observable
   */
  extractObligations$(contractText: string): Observable<Schemas.ObligationsAnalysis> {
    return defer(() => from(this.extractObligations(contractText)));
  }

  /**
   * Extract omissions and questions as Observable
   */
  extractOmissionsAndQuestions$(contractText: string): Observable<Schemas.OmissionsAndQuestions> {
    return defer(() => from(this.extractOmissionsAndQuestions(contractText)));
  }

  /**
   * Extract summary as Observable
   */
  extractSummary$(contractText: string): Observable<Schemas.ContractSummary> {
    return defer(() => from(this.extractSummary(contractText)));
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
