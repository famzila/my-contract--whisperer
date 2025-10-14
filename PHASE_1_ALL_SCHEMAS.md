# 📦 PHASE 1: Complete JSON Schema Implementation (Days 1-4)

**Goal**: Implement ALL schemas at once for consistency
**Why All At Once**: Avoid mixing old/new approaches, ensure reliability across all analysis types
**Time**: 4 days

---

## Day 1: Create ALL Schemas

**File**: `src/app/core/schemas/analysis-schemas.ts` (NEW)

Create complete schemas file with all 5 schemas + types:

```typescript
/**
 * JSON Schemas for Chrome Prompt API Structured Output
 * All schemas use Lucide icon names (not emojis) and lowercase enums
 * Following: https://developer.chrome.com/docs/ai/structured-output-for-prompt-api
 */

// ============================================================================
// 1. CONTRACT METADATA SCHEMA
// ============================================================================
export const METADATA_SCHEMA = {
  type: "object",
  description: "Extract basic contract metadata",
  properties: {
    contractType: {
      type: "string",
      description: "Type of contract (e.g., Employment Agreement, NDA, Lease Agreement)"
    },
    effectiveDate: {
      type: ["string", "null"],
      description: "Contract start date in ISO format or null if not specified"
    },
    endDate: {
      type: ["string", "null"],
      description: "Contract end date in ISO format or null if not specified"
    },
    duration: {
      type: ["string", "null"],
      description: "Contract duration (e.g., '12 months', '2 years')"
    },
    autoRenew: {
      type: ["boolean", "null"],
      description: "Whether contract auto-renews"
    },
    jurisdiction: {
      type: ["string", "null"],
      description: "Governing jurisdiction (e.g., 'California, USA')"
    },
    parties: {
      type: "object",
      description: "Contract parties",
      properties: {
        party1: {
          type: "object",
          properties: {
            name: { type: "string" },
            location: { type: ["string", "null"] },
            role: { type: "string", description: "e.g., Employer, Landlord, Client" }
          },
          required: ["name", "role"]
        },
        party2: {
          type: "object",
          properties: {
            name: { type: "string" },
            location: { type: ["string", "null"] },
            role: { type: "string", description: "e.g., Employee, Tenant, Contractor" }
          },
          required: ["name", "role"]
        }
      },
      required: ["party1", "party2"]
    },
    detectedLanguage: {
      type: "string",
      description: "Detected contract language code (e.g., 'en', 'es', 'ja')"
    },
    analyzedForRole: {
      type: "string",
      description: "User role analysis is tailored for (e.g., 'employee', 'employer')"
    }
  },
  required: ["contractType", "parties", "detectedLanguage", "analyzedForRole"],
  additionalProperties: false
} as const;

// ============================================================================
// 2. RISKS SCHEMA
// ============================================================================
export const RISKS_SCHEMA = {
  type: "object",
  description: "Extract and analyze contract risks",
  properties: {
    risks: {
      type: "array",
      description: "List of identified risks in the contract, prioritized by severity",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short risk title (e.g., 'At-Will Employment', 'Late Payment Penalty')"
          },
          severity: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Risk severity level"
          },
          icon: {
            type: "string",
            enum: ["alert-triangle", "alert-circle", "info"],
            description: "Lucide icon name: alert-triangle (high), alert-circle (medium), info (low)"
          },
          description: {
            type: "string",
            description: "Clear explanation of the risk in plain language"
          },
          impact: {
            type: "string",
            description: "Concrete impact this risk could have on the user"
          },
          impactOn: {
            type: ["string", "null"],
            enum: ["employer", "employee", "both", null],
            description: "Who this risk primarily affects (for perspective-aware analysis)"
          }
        },
        required: ["title", "severity", "icon", "description", "impact"]
      },
      minItems: 1
    }
  },
  required: ["risks"],
  additionalProperties: false
} as const;

// ============================================================================
// 3. OBLIGATIONS SCHEMA
// ============================================================================
export const OBLIGATIONS_SCHEMA = {
  type: "object",
  description: "Extract obligations for each party",
  properties: {
    obligations: {
      type: "object",
      properties: {
        employer: {
          type: "array",
          description: "Obligations of the employer (or equivalent first party)",
          items: {
            type: "object",
            properties: {
              duty: { type: "string", description: "What must be done" },
              amount: { type: ["number", "null"], description: "Monetary amount if applicable" },
              frequency: { type: ["string", "null"], description: "How often (e.g., 'monthly', 'bi-weekly')" },
              startDate: { type: ["string", "null"], description: "When obligation starts" },
              duration: { type: ["string", "null"], description: "How long obligation lasts" },
              scope: { type: ["string", "null"], description: "Additional details or conditions" }
            },
            required: ["duty"]
          }
        },
        employee: {
          type: "array",
          description: "Obligations of the employee (or equivalent second party)",
          items: {
            type: "object",
            properties: {
              duty: { type: "string", description: "What must be done" },
              scope: { type: ["string", "null"], description: "Additional details (e.g., 'Full-time', '40 hours/week')" },
              frequency: { type: ["string", "null"], description: "How often if recurring" }
            },
            required: ["duty"]
          }
        }
      },
      required: ["employer", "employee"]
    }
  },
  required: ["obligations"],
  additionalProperties: false
} as const;

// ============================================================================
// 4. OMISSIONS & QUESTIONS SCHEMA
// ============================================================================
export const OMISSIONS_QUESTIONS_SCHEMA = {
  type: "object",
  description: "Identify missing clauses and generate questions",
  properties: {
    omissions: {
      type: "array",
      description: "Important clauses or details missing from the contract",
      items: {
        type: "object",
        properties: {
          item: { type: "string", description: "What is missing" },
          impact: { type: "string", description: "Why this absence could be problematic" },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Importance of this omission"
          }
        },
        required: ["item", "impact", "priority"]
      }
    },
    questions: {
      type: "array",
      description: "Key questions the user should ask the other party before signing",
      items: { type: "string" },
      minItems: 3,
      maxItems: 10
    }
  },
  required: ["omissions", "questions"],
  additionalProperties: false
} as const;

// ============================================================================
// 5. SUMMARY SCHEMA
// ============================================================================
export const SUMMARY_SCHEMA = {
  type: "object",
  description: "Generate a comprehensive contract summary",
  properties: {
    summary: {
      type: "object",
      properties: {
        parties: {
          type: "string",
          description: "Brief description of contract parties and their roles"
        },
        role: {
          type: "string",
          description: "Nature of relationship (e.g., 'Full-time employment', 'Independent contractor')"
        },
        responsibilities: {
          type: "array",
          items: { type: "string" },
          description: "Key responsibilities of the signing party",
          minItems: 1
        },
        compensation: {
          type: "object",
          properties: {
            baseSalary: { type: ["number", "null"] },
            bonus: { type: ["string", "null"] },
            equity: { type: ["string", "null"] },
            other: { type: ["string", "null"] }
          }
        },
        benefits: {
          type: "array",
          items: { type: "string" },
          description: "Benefits provided (e.g., 'Health insurance', '401k')"
        },
        termination: {
          type: "object",
          properties: {
            atWill: { type: ["string", "null"] },
            forCause: { type: ["string", "null"] },
            severance: { type: ["string", "null"] }
          }
        },
        restrictions: {
          type: "object",
          properties: {
            confidentiality: { type: ["string", "null"] },
            nonCompete: { type: ["string", "null"] },
            nonSolicitation: { type: ["string", "null"] },
            other: { type: ["string", "null"] }
          }
        }
      },
      required: ["parties", "role", "responsibilities", "benefits"]
    },
    disclaimer: {
      type: "string",
      description: "Standard legal disclaimer"
    }
  },
  required: ["summary", "disclaimer"],
  additionalProperties: false
} as const;

// ============================================================================
// TYPESCRIPT TYPES (Generated from schemas)
// ============================================================================

export type ContractMetadata = {
  contractType: string;
  effectiveDate: string | null;
  endDate: string | null;
  duration: string | null;
  autoRenew: boolean | null;
  jurisdiction: string | null;
  parties: {
    party1: { name: string; location: string | null; role: string };
    party2: { name: string; location: string | null; role: string };
  };
  detectedLanguage: string;
  analyzedForRole: string;
};

export type RisksAnalysis = {
  risks: Array<{
    title: string;
    severity: 'high' | 'medium' | 'low';
    icon: 'alert-triangle' | 'alert-circle' | 'info';
    description: string;
    impact: string;
    impactOn?: 'employer' | 'employee' | 'both' | null;
  }>;
};

export type ObligationsAnalysis = {
  obligations: {
    employer: Array<{
      duty: string;
      amount?: number | null;
      frequency?: string | null;
      startDate?: string | null;
      duration?: string | null;
      scope?: string | null;
    }>;
    employee: Array<{
      duty: string;
      scope?: string | null;
      frequency?: string | null;
    }>;
  };
};

export type OmissionsAndQuestions = {
  omissions: Array<{
    item: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  questions: string[];
};

export type ContractSummary = {
  summary: {
    parties: string;
    role: string;
    responsibilities: string[];
    compensation: {
      baseSalary?: number | null;
      bonus?: string | null;
      equity?: string | null;
      other?: string | null;
    };
    benefits: string[];
    termination: {
      atWill?: string | null;
      forCause?: string | null;
      severance?: string | null;
    };
    restrictions: {
      confidentiality?: string | null;
      nonCompete?: string | null;
      nonSolicitation?: string | null;
      other?: string | null;
    };
  };
  disclaimer: string;
};

// ============================================================================
// COMPLETE ANALYSIS TYPE (All parts combined)
// ============================================================================

export type CompleteAnalysis = {
  metadata: ContractMetadata;
  risks: RisksAnalysis;
  obligations: ObligationsAnalysis;
  omissionsAndQuestions: OmissionsAndQuestions;
  summary: ContractSummary;
};
```

**Test Day 1**:
- Create the file
- Verify TypeScript compilation
- No runtime testing yet

**Deliverable Day 1**: All 5 schemas + types created

---

## Day 2: Update Prompt Service with ALL Schema Methods

**File**: `src/app/core/services/ai/prompt.service.ts`

Add schema-based methods for ALL analysis types:

```typescript
import * as Schemas from '../../schemas/analysis-schemas';

@Injectable({
  providedIn: 'root',
})
export class PromptService {
  private session: AILanguageModel | null = null;

  /**
   * Generic method to prompt with schema constraint
   */
  private async promptWithSchema<T>(
    prompt: string,
    schema: object
  ): Promise<T> {
    if (!this.session) {
      throw new Error('Session not initialized. Call createSession() first.');
    }

    console.log(`📤 [AI] Sending prompt with schema constraint...`);

    const resultString = await this.session.prompt(prompt, {
      responseConstraint: schema,
    });

    console.log(`📥 [AI] Received structured response (${resultString.length} chars)`);

    const parsed = JSON.parse(resultString);
    return parsed as T;
  }

  /**
   * 1. Extract metadata
   */
  async extractMetadata(
    contractText: string
  ): Promise<Schemas.ContractMetadata> {
    const prompt = `Extract metadata from this contract:

${contractText}

Identify contract type, dates, parties, and jurisdiction.`;

    return this.promptWithSchema<Schemas.ContractMetadata>(
      prompt,
      Schemas.METADATA_SCHEMA
    );
  }

  /**
   * 2. Extract risks
   */
  async extractRisks(
    contractText: string
  ): Promise<Schemas.RisksAnalysis> {
    const prompt = `Analyze risks in this contract:

${contractText}

Identify all potential risks, prioritize by severity (high, medium, low), and explain their impact.`;

    return this.promptWithSchema<Schemas.RisksAnalysis>(
      prompt,
      Schemas.RISKS_SCHEMA
    );
  }

  /**
   * 3. Extract obligations
   */
  async extractObligations(
    contractText: string
  ): Promise<Schemas.ObligationsAnalysis> {
    const prompt = `Extract obligations from this contract:

${contractText}

List all obligations for each party, including amounts, frequencies, and scope.`;

    return this.promptWithSchema<Schemas.ObligationsAnalysis>(
      prompt,
      Schemas.OBLIGATIONS_SCHEMA
    );
  }

  /**
   * 4. Extract omissions and questions
   */
  async extractOmissionsAndQuestions(
    contractText: string
  ): Promise<Schemas.OmissionsAndQuestions> {
    const prompt = `Analyze this contract for missing clauses and generate questions:

${contractText}

Identify important omissions and suggest 5-8 key questions to ask before signing.`;

    return this.promptWithSchema<Schemas.OmissionsAndQuestions>(
      prompt,
      Schemas.OMISSIONS_QUESTIONS_SCHEMA
    );
  }

  /**
   * 5. Extract summary
   */
  async extractSummary(
    contractText: string
  ): Promise<Schemas.ContractSummary> {
    const prompt = `Generate a comprehensive summary of this contract:

${contractText}

Include parties, responsibilities, compensation, benefits, termination terms, and restrictions.`;

    return this.promptWithSchema<Schemas.ContractSummary>(
      prompt,
      Schemas.SUMMARY_SCHEMA
    );
  }

  // Keep existing createSession, destroy, etc.
}
```

**Test Day 2**:
- Compile successfully
- Create test: call each method with sample contract
- Verify JSON responses are valid

**Deliverable Day 2**: All 5 extraction methods working

---

## Day 3-4: Update Contract Analysis Service

**File**: `src/app/core/services/contract-analysis.service.ts`

Replace ALL old parsing logic with schema-based extraction:

```typescript
async analyzeContract(
  parsedContract: ParsedContract,
  context?: AnalysisContext
): Promise<{ contract: Contract; analysis: ContractAnalysis }> {
  // ... existing setup ...

  try {
    console.log('🔍 Starting schema-based analysis...');

    // Create session with language config
    await this.promptService.createSession({
      userRole: context?.userRole,
      contractLanguage: context?.contractLanguage || 'en',
      outputLanguage: context?.analyzedInLanguage || 'en',
    });

    // Extract all sections using schemas (parallel for performance)
    const [metadata, risks, obligations, omissionsAndQuestions, summaryStructured] =
      await Promise.all([
        this.promptService.extractMetadata(parsedContract.text),
        this.promptService.extractRisks(parsedContract.text),
        this.promptService.extractObligations(parsedContract.text),
        this.promptService.extractOmissionsAndQuestions(parsedContract.text),
        this.promptService.extractSummary(parsedContract.text),
      ]);

    console.log('✅ All schema-based extractions complete');

    // Also generate executive summary with Summarizer API
    const summaryText = await this.summarizerService.generateExecutiveSummary(
      parsedContract.text
    );

    // Build complete analysis
    const completeAnalysis: Schemas.CompleteAnalysis = {
      metadata,
      risks,
      obligations,
      omissionsAndQuestions,
      summary: summaryStructured,
    };

    // Convert to ContractAnalysis format
    const analysis: ContractAnalysis = {
      id: contract.id,
      summary: JSON.stringify(completeAnalysis, null, 2),
      clauses: this.convertRisksToClauses(risks.risks),
      riskScore: this.calculateRiskScoreFromRisks(risks.risks),
      obligations: this.convertObligationsToModel(obligations.obligations),
      omissions: omissionsAndQuestions.omissions,
      questions: omissionsAndQuestions.questions,
      metadata: metadata,
      disclaimer: summaryStructured.disclaimer,
      analyzedAt: new Date(),
    };

    // Cleanup
    this.promptService.destroy();

    return { contract, analysis };

  } catch (error) {
    console.error('❌ Schema-based analysis failed:', error);
    throw error;
  }
}

/**
 * Convert risks to clauses format (for backward compatibility)
 */
private convertRisksToClauses(risks: Array<any>): ContractClause[] {
  return risks.map(risk => ({
    id: this.generateId(),
    type: this.normalizeClauseType(risk.title),
    content: risk.description,
    plainLanguage: risk.description,
    riskLevel: risk.severity as RiskLevel,
    confidence: 0.95,
  }));
}

/**
 * Calculate risk score from risks
 */
private calculateRiskScoreFromRisks(risks: Array<any>): number {
  const weights = { high: 100, medium: 50, low: 25 };
  const total = risks.reduce((sum, risk) => sum + weights[risk.severity], 0);
  return Math.round(total / risks.length);
}

/**
 * Convert obligations to model format
 */
private convertObligationsToModel(obligations: any): Obligation[] {
  const result: Obligation[] = [];

  // Convert employer obligations
  obligations.employer.forEach((obl: any) => {
    result.push({
      id: this.generateId(),
      description: obl.duty + (obl.amount ? ` ($${obl.amount})` : ''),
      party: 'their' as const,
      recurring: !!obl.frequency,
      completed: false,
      priority: 'medium' as const,
    });
  });

  // Convert employee obligations
  obligations.employee.forEach((obl: any) => {
    result.push({
      id: this.generateId(),
      description: obl.duty,
      party: 'your' as const,
      recurring: !!obl.frequency,
      completed: false,
      priority: 'medium' as const,
    });
  });

  return result;
}
```

**Remove All Old Code**:
- ❌ Delete `parseClausesFromJSON()`
- ❌ Delete `parseClausesFromAI()`
- ❌ Delete `extractClausesFromText()`
- ❌ Delete JSON cleanup code (lines 116-141)
- ❌ Delete `parseObligationsFromJSON()`
- ❌ Delete `extractObligationsFromText()`

**Test Day 3-4**:
- Upload test contract
- Verify all sections populate correctly
- Verify NO JSON parse errors
- Test with different contract types

**Deliverable Day 3-4**: Complete schema-based analysis working

---

## Summary

**Day 1**: Create ALL 5 schemas + types
**Day 2**: Add ALL 5 extraction methods to PromptService
**Day 3-4**: Replace ALL old parsing with schema-based extraction

**Result**:
- ✅ 100% reliable JSON parsing (no errors)
- ✅ Consistent structure across all analysis types
- ✅ Lucide icons (no emojis)
- ✅ Lowercase enums
- ✅ Cleaner codebase (removed 500+ lines of parsing code)

**Ready to implement?** Start with Day 1!
