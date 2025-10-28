import { Injectable } from '@angular/core';
import type { UserRole } from '../../models/ai-analysis.model';

/**
 * Service dedicated to building AI prompts for contract analysis
 * Handles perspective-aware prompt generation and system prompt construction
 */
@Injectable({
  providedIn: 'root',
})
export class PromptBuilderService {

  /**
   * Build perspective-aware system prompt based on user role
   */
  buildPerspectivePrompt(userRole: UserRole): string {
    const basePerspectives = {
      employer: `You are analyzing this contract from the EMPLOYER'S perspective.

Focus on:
- Employer's obligations, costs, and financial commitments
- Employee's performance commitments and deliverables
- Termination rights and conditions for employer
- IP ownership, confidentiality, and company protections
- Risks: Employee underperformance, IP theft, litigation costs

Tailor risks and obligations to help the employer understand what they must provide and how to protect their interests.`,

      employee: `You are analyzing this contract from the EMPLOYEE'S perspective.

Focus on:
- Compensation fairness and total package value
- Job security (at-will vs. for-cause termination)
- Career restrictions (non-compete, non-solicitation, IP assignment)
- Work-life balance (hours, vacation, remote work)
- Risks: Underpayment, sudden termination, limited job mobility

Tailor risks and obligations to help the employee understand what they're giving up and how to protect their career.`,

      client: `You are analyzing this contract from the CLIENT'S perspective.

Focus on:
- Deliverables, scope, and what you're paying for
- Payment terms, milestones, and total cost
- Timeline, deadlines, and delivery guarantees
- Confidentiality and IP ownership rights
- Risks: Missed deadlines, poor quality, scope creep

Tailor analysis to help the client understand what they'll receive, payment obligations, and how to enforce quality.`,

      contractor: `You are analyzing this contract from the CONTRACTOR'S/FREELANCER'S perspective.

Focus on:
- Payment terms, rates, and when you get paid
- Scope of work and what's expected
- IP rights (do you retain any work product?)
- Liability limitations and indemnification
- Risks: Non-payment, scope creep, unfair IP assignment

Tailor analysis to help the contractor understand fair compensation, payment timing, and liability exposure.`,

      landlord: `You are analyzing this contract from the LANDLORD'S perspective.

Focus on:
- Rent payment terms, security deposit, and late fees
- Property damage protections and maintenance obligations
- Eviction rights and termination conditions
- Tenant responsibilities and restrictions
- Risks: Non-payment, property damage, difficult eviction

Tailor analysis to help the landlord ensure timely rent payment and property protection.`,

      tenant: `You are analyzing this contract from the TENANT'S perspective.

Focus on:
- Rent amount, increases, and additional fees
- Security deposit return conditions
- Maintenance responsibilities (yours vs. landlord's)
- Termination rights and penalties for early exit
- Risks: Unfair eviction, withheld deposit, surprise costs

Tailor analysis to help the tenant understand total housing cost and how to get security deposit back.`,

      partner: `You are analyzing this contract from a PARTNER'S perspective.

Focus on:
- Equity split and ownership structure
- Roles, responsibilities, and decision-making authority
- Profit distribution and capital contributions
- Exit strategy and buyout terms
- Risks: Unequal workload, decision deadlocks, unfair exits

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

  /**
   * Build the base system prompt for contract analysis
   */
  buildBaseSystemPrompt(perspectivePrompt?: string): string {
    return `You are an AI legal explainer that helps non-lawyers understand contracts clearly.

${perspectivePrompt || ''}

Guidelines:
- Use plain language, avoid legal jargon
- Be specific with numbers, dates, and amounts
- Focus on practical, real-world implications
- Prioritize protecting the signing party's interests
- Identify risks from highest to lowest severity
- Use null for missing or non-applicable values`;
  }

  /**
   * Build contract analysis prompt with schema constraint
   */
  buildAnalysisPrompt(
    contractText: string,
    analysisType: 'metadata' | 'risks' | 'obligations' | 'omissions' | 'summary',
    userRole?: string,
    outputLanguage?: string
  ): string {
    const roleContext = userRole ? `\n\nAnalyze this contract from the perspective of: ${userRole}` : '';
    
    const basePrompt = `Analyze this contract and respond with ONLY valid JSON following the schema provided in your system prompt.

Contract to analyze:
${contractText}${roleContext}

Remember: Output ONLY the JSON object, no markdown, no code blocks, no additional text.`;

    switch (analysisType) {
      case 'metadata':
        return this.buildMetadataPrompt(contractText, userRole, outputLanguage);
      case 'risks':
        return this.buildRisksPrompt(contractText, outputLanguage);
      case 'obligations':
        return this.buildObligationsPrompt(contractText, outputLanguage);
      case 'omissions':
        return this.buildOmissionsPrompt(contractText, outputLanguage);
      case 'summary':
        return this.buildSummaryPrompt(contractText, outputLanguage);
      default:
        return basePrompt;
    }
  }

  /**
   * Build question-answering prompt
   */
  buildQuestionPrompt(contractText: string, question: string): string {
    return `Based on the following contract, answer this question: ${question}

Contract:
${contractText}`;
  }

  /**
   * Build metadata extraction prompt
   */
  private buildMetadataPrompt(contractText: string, userRole?: string, outputLanguage?: string): string {
    return `Extract basic metadata from this contract.

Contract:
${contractText}${userRole ? `\n\nAnalyze this contract from the perspective of: ${userRole}` : ''}

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
  }

  /**
   * Build risks analysis prompt
   */
  private buildRisksPrompt(contractText: string, outputLanguage?: string): string {
    return `Analyze all potential risks in this contract.

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
  }

  /**
   * Build obligations analysis prompt
   */
  private buildObligationsPrompt(contractText: string, outputLanguage?: string): string {
    return `Extract all obligations from this contract for both parties.

Contract:
${contractText}

Instructions:
- Group obligations into two categories: party1 and party2
- party1 refers to the first party mentioned (employer, landlord, client, service provider, etc.)
- party2 refers to the second party (employee, tenant, contractor, service recipient, etc.)
- For each obligation, extract: duty, amount, frequency, startDate, duration, scope
- Both parties can have ANY of these fields - extract whatever is relevant from the contract
- For monetary amounts: use numbers only (e.g., 50000, not "$50,000" or "50000")
- For dates: use ISO format (YYYY-MM-DD) or descriptive text
- For frequency: use simple terms like "monthly", "bi-weekly", "annually", "one-time"
- Use null for any optional field that doesn't apply
- Ensure all string values are properly escaped (no unescaped quotes or newlines)
- Keep duty descriptions clear and concise (one sentence)`;
  }

  /**
   * Build omissions analysis prompt
   */
  private buildOmissionsPrompt(contractText: string, outputLanguage?: string): string {
    return `Analyze this contract for missing clauses and generate clarifying questions.

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
  }

  /**
   * Build summary analysis prompt
   */
  private buildSummaryPrompt(contractText: string, outputLanguage?: string): string {
    return `Generate a comprehensive, easy-to-understand summary of this contract.

Contract:
${contractText}

Instructions:
- DO NOT include parties or role information (already captured in metadata)
- List 3-5 key responsibilities of the signing party
- Detail all compensation (salary, bonuses, equity, other benefits)
- Explain termination conditions (at-will, for-cause, severance, notice period)
- Identify any restrictions (confidentiality, non-compete, non-solicitation, IP assignment)
- Use clear, plain language - avoid legal jargon
- For base salary, use numbers only (e.g., 150000, not "150k" or "$150,000")
- For other compensation fields, use descriptive text
- Use null for fields that don't apply or aren't specified in the contract

Return the summary in the exact JSON structure specified in the schema.`;
  }
}
